// Maps a nycode transcript to the Devin chat history, system prompt and tool list. Ported from an MIT-licensed Devin provider extension, see ../LICENSE.
import {
	type AssistantMessage,
	collapseSystemMessages,
	getCurrentSystemPrompt,
	getCurrentTools,
	type ToolResultMessage,
	type TranscriptContext,
	type UserMessage,
	withoutInitialSystemMessage,
} from "@nycode/ai";
import { DEVIN_API_NAME } from "../constants.ts";
import type { ChatHistoryItem, ChatToolCall, ContentPart, ToolDef } from "../wire/request.ts";
import { type ChatThinking, unpackThinkingSignature } from "./thinking.ts";

export interface MappedChat {
	/** Sent in GetChatMessageRequest.prompt, separately from the conversation history. */
	systemPrompt?: string;
	messages: ChatHistoryItem[];
	tools: ToolDef[];
	/** Some message still carries an image after older turns were stripped of theirs. */
	hasImages: boolean;
}

/** Replaces an image from an older turn: Devin rejects them as invalid_argument. */
export const IMAGE_OMITTED_TEXT = "[image omitted from history]";

function userContent(content: UserMessage["content"], keepImages: boolean): string | ContentPart[] {
	if (typeof content === "string") return content;
	return content.map((part): ContentPart => {
		if (part.type === "text") return { type: "text", text: part.text };
		return keepImages
			? { type: "image", mimeType: part.mimeType, base64Data: part.data }
			: { type: "text", text: IMAGE_OMITTED_TEXT };
	});
}

function assistantItem(message: AssistantMessage): ChatHistoryItem {
	const texts: string[] = [];
	const toolCalls: ChatToolCall[] = [];
	let thinking: ChatThinking | undefined;
	let geminiSignature: string | undefined;
	for (const part of message.content) {
		if (part.type === "text") texts.push(part.text);
		if (part.type === "toolCall") {
			toolCalls.push({ id: part.id, name: part.name, arguments: JSON.stringify(part.arguments) });
			// `thoughtSignature` is Google-specific and could come from another provider: only Devin's own are replayed.
			if (message.api === DEVIN_API_NAME) geminiSignature ??= part.thoughtSignature;
		}
		if (part.type === "thinking") {
			const decoded = unpackThinkingSignature(part.thinkingSignature);
			// One thinking slot per message on the wire, and an unsigned trace is not replayable: keep the newest block
			// the server can verify.
			if (part.thinking && decoded.signature) {
				thinking = {
					text: part.thinking,
					signature: decoded.signature,
					signatureType: decoded.signatureType,
					redacted: part.redacted,
				};
			}
		}
	}
	return {
		role: "assistant",
		content: texts.join("\n"),
		tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
		thinking,
		gemini_thought_signature: geminiSignature,
	};
}

function toolResultItem(message: ToolResultMessage): ChatHistoryItem {
	const text = message.content
		.filter((part) => part.type === "text")
		.map((part) => part.text)
		.join("\n");
	return { role: "tool", content: text, tool_call_id: message.toolCallId, is_error: message.isError || undefined };
}

/** Converts a transcript into what the Devin chat endpoint takes: one system prompt, history items and tool definitions. */
export function mapContextToChat(context: TranscriptContext): MappedChat {
	// Fold later system updates into the single prompt sent separately to Devin.
	const transcript = collapseSystemMessages(context);
	const systemPrompt = getCurrentSystemPrompt(transcript.messages);
	const messages: ChatHistoryItem[] = [];
	const history = withoutInitialSystemMessage(transcript.messages);
	const lastUser = history.findLastIndex((message) => message.role === "user");
	for (const [index, message] of history.entries()) {
		if (message.role === "user") {
			messages.push({ role: "user", content: userContent(message.content, index === lastUser) });
		} else if (message.role === "assistant") messages.push(assistantItem(message));
		else if (message.role === "toolResult") messages.push(toolResultItem(message));
	}
	const tools: ToolDef[] = getCurrentTools(transcript.messages).map((tool) => ({
		name: tool.name,
		description: tool.description,
		parameters: tool.parameters,
	}));
	const hasImages = messages.some(
		(message) => typeof message.content !== "string" && message.content.some((part) => part.type === "image"),
	);
	return { systemPrompt: systemPrompt || undefined, messages, tools, hasImages };
}
