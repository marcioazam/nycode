// Builds the protobuf requests for GetUserJwt and GetChatMessage. Ported from pi-devin-plus 0.1.3 (MIT), see ../LICENSE.
import type { ChatThinking } from "../context/thinking.ts";
import { encodeFixed64Field, encodeMessage, encodeString, encodeTimestampBody, encodeVarintField } from "./proto.ts";

export interface ContentPart {
	type: "text" | "image";
	text?: string;
	mimeType?: string;
	base64Data?: string;
}

export interface ChatToolCall {
	id: string;
	name: string;
	arguments: string;
}

export interface ChatHistoryItem {
	role: "user" | "assistant" | "tool";
	content: string | ContentPart[];
	tool_call_id?: string;
	tool_calls?: ChatToolCall[];
	/** Prior reasoning, replayed so the server can verify and continue it. */
	thinking?: ChatThinking;
	/** Tool results: the tool failed (prompt #9). */
	is_error?: boolean;
	/** Gemini's thought signature (base64) of an assistant tool-call message, replayed as prompt #17. */
	gemini_thought_signature?: string;
}

export interface ToolDef {
	name: string;
	description: string;
	parameters: unknown;
}

export interface MetadataInput {
	apiKey: string;
	userJwt?: string;
	sessionId: string;
	requestId: bigint;
	triggerId: string;
	ide: string;
	version: string;
}

/** Encodes the request `Metadata` message (client identity, API key, optional JWT). */
export function buildMetadata(input: MetadataInput): Buffer {
	const { ide, version } = input;
	const os = process.platform === "darwin" ? "darwin" : process.platform === "win32" ? "windows" : "linux";
	const parts: Buffer[] = [
		encodeString(1, ide),
		encodeString(2, version),
		encodeString(3, input.apiKey),
		encodeString(4, "en"),
		encodeString(5, os),
		encodeString(7, version),
		encodeVarintField(9, input.requestId),
		encodeString(10, input.sessionId),
		encodeString(12, ide),
		encodeMessage(16, encodeTimestampBody()),
		encodeString(25, input.triggerId),
		encodeString(26, "Unset"),
		encodeString(28, ide),
	];
	if (input.userJwt) parts.push(encodeString(21, input.userJwt));
	return Buffer.concat(parts);
}

const SOURCE_BY_ROLE: Record<ChatHistoryItem["role"], number> = { user: 1, assistant: 2, tool: 4 };

function normalizeContent(content: string | ContentPart[]): ContentPart[] {
	return typeof content === "string" ? [{ type: "text", text: content }] : content;
}

function encodeImageData(img: ContentPart): Buffer {
	return Buffer.concat([encodeString(1, img.base64Data ?? ""), encodeString(2, img.mimeType ?? "image/png")]);
}

function encodeChatToolCall(tc: ChatToolCall): Buffer {
	return Buffer.concat([encodeString(1, tc.id), encodeString(2, tc.name), encodeString(3, tc.arguments)]);
}

function encodeChatMessagePrompt(
	content: ContentPart[],
	source: number,
	opts: {
		toolCallId?: string;
		toolCalls?: ChatToolCall[];
		thinking?: ChatThinking;
		isError?: boolean;
		geminiSignature?: string;
	},
): Buffer {
	const text = content
		.filter((part) => part.type === "text")
		.map((part) => part.text ?? "")
		.join("\n");
	const parts: Buffer[] = [
		encodeVarintField(2, source),
		encodeString(3, text),
		encodeVarintField(4, Math.max(1, Math.floor(text.length / 4))),
		encodeVarintField(5, 1),
	];
	if (opts.toolCallId) parts.push(encodeString(7, opts.toolCallId));
	if (opts.isError) parts.push(encodeVarintField(9, 1));
	for (const tc of opts.toolCalls ?? []) parts.push(encodeMessage(6, encodeChatToolCall(tc)));
	for (const img of content.filter((part) => part.type === "image")) {
		parts.push(encodeMessage(10, encodeImageData(img)));
	}
	// 11 thinking / 12 signature / 13 thinking_redacted / 18 signature_type: the quartet the Devin CLI replays so the
	// model keeps its own reasoning.
	if (opts.thinking) {
		parts.push(encodeString(11, opts.thinking.text));
		parts.push(encodeString(12, opts.thinking.signature));
		if (opts.thinking.redacted) parts.push(encodeVarintField(13, 1));
		if (opts.thinking.signatureType) parts.push(encodeString(18, opts.thinking.signatureType));
	}
	if (opts.geminiSignature) parts.push(encodeMessage(17, Buffer.from(opts.geminiSignature, "base64")));
	return Buffer.concat(parts);
}

/** CortexTrajectoryReference: cascade trajectory, user-input step. */
function encodeTrajectoryReference(trajectoryId: string): Buffer {
	return Buffer.concat([encodeString(1, trajectoryId), encodeVarintField(3, 4), encodeVarintField(4, 14)]);
}

/** Upstream answers "an internal error occurred" to a temperature of 0, so sampling never goes below this. */
export const MIN_TEMPERATURE = 0.001;

const DEFAULT_MAX_TOKENS = 64_000;
// #3 is max_newlines, not an output cap: a large fixed value keeps it from ever stopping a reply.
const MAX_NEWLINES = 128_000;

function encodeCompletionConfiguration(args: ChatRequestArgs): Buffer {
	return Buffer.concat([
		encodeVarintField(1, 1),
		encodeVarintField(2, args.maxTokens ?? DEFAULT_MAX_TOKENS),
		encodeVarintField(3, MAX_NEWLINES),
		encodeFixed64Field(5, Math.max(MIN_TEMPERATURE, args.temperature ?? 0.7)),
		encodeFixed64Field(6, 0.95),
		encodeVarintField(7, 50),
		encodeFixed64Field(8, args.topP ?? 1.0),
		encodeFixed64Field(11, 1.0),
	]);
}

function encodeToolDef(tool: ToolDef): Buffer {
	const description = tool.description.length > 6_998 ? `${tool.description.slice(0, 6_995)}...` : tool.description;
	return Buffer.concat([
		encodeString(1, tool.name),
		encodeString(2, description),
		encodeString(3, JSON.stringify(tool.parameters ?? {})),
	]);
}

export interface ChatRequestArgs {
	apiKey: string;
	userJwt: string;
	modelUid: string;
	systemPrompt?: string;
	messages: ChatHistoryItem[];
	tools?: ToolDef[];
	cascadeId: string;
	trajectoryId: string;
	promptId: string;
	sessionId: string;
	requestId: bigint;
	triggerId: string;
	/** CompletionConfiguration #2 max_tokens: the output cap, already clamped to the model's context window. */
	maxTokens?: number;
	/** CompletionConfiguration #5; raised to MIN_TEMPERATURE when lower. */
	temperature?: number;
	/** CompletionConfiguration #8. */
	topP?: number;
	/** ChatToolChoice #12 option name. */
	toolChoice?: "auto" | "none";
	ide: string;
	version: string;
}

/** Encodes a GetChatMessageRequest. */
export function buildGetChatMessageRequest(args: ChatRequestArgs): Buffer {
	const metadata = buildMetadata({
		apiKey: args.apiKey,
		userJwt: args.userJwt,
		sessionId: args.sessionId,
		requestId: args.requestId,
		triggerId: args.triggerId,
		ide: args.ide,
		version: args.version,
	});
	const prompts = args.messages.map((message) =>
		encodeMessage(
			3,
			encodeChatMessagePrompt(normalizeContent(message.content), SOURCE_BY_ROLE[message.role], {
				toolCallId: message.role === "tool" ? message.tool_call_id : undefined,
				toolCalls: message.role === "assistant" ? message.tool_calls : undefined,
				thinking: message.role === "assistant" ? message.thinking : undefined,
				isError: message.role === "tool" ? message.is_error : undefined,
				geminiSignature: message.role === "assistant" ? message.gemini_thought_signature : undefined,
			}),
		),
	);
	return Buffer.concat([
		encodeMessage(1, metadata),
		...(args.systemPrompt ? [encodeString(2, args.systemPrompt)] : []),
		...prompts,
		encodeVarintField(7, 5),
		encodeMessage(8, encodeCompletionConfiguration(args)),
		...(args.tools ?? []).map((tool) => encodeMessage(10, encodeToolDef(tool))),
		...(args.toolChoice ? [encodeMessage(12, encodeString(1, args.toolChoice))] : []),
		encodeMessage(15, encodeTrajectoryReference(args.trajectoryId)),
		encodeVarintField(20, 1),
		encodeString(16, args.cascadeId),
		encodeString(21, args.modelUid),
		encodeString(22, args.promptId),
	]);
}
