// Turns chat events into AssistantMessage content blocks and stream events. Ported from pi-devin-plus 0.1.3 (MIT), see ../LICENSE.
import {
	type Api,
	type AssistantMessage,
	type AssistantMessageEventStream,
	calculateCost,
	type Model,
} from "@nycode/ai";
import { packThinkingSignature } from "../context/thinking.ts";
import { type CloudChatEvent, calculateUsageTotal } from "./decode.ts";
import { parsePartialToolArguments } from "./tool-args.ts";

export interface AssistantAssembler {
	/** The message being built; shared with every emitted event as `partial`. */
	output: AssistantMessage;
	/** Applies one decoded event, pushing the matching stream events. */
	apply(event: CloudChatEvent): void;
	/** Closes any open block, picks the usage source and resolves refusals and server-side stop errors. */
	close(): void;
	/** True when the server sent no content and no stop reason, so the stream carried nothing. */
	isEmpty(): boolean;
}

/** Shown when the provider (or the stop reason) says the model refused. */
export const REFUSAL_MESSAGE = "Model refused (content filter)";
/** Shown for stop reason ERROR; worded as a server error so nycode's retry classifier treats it as transient. */
export const SERVER_STOP_ERROR_MESSAGE = "Devin reported a server error while generating the response";

/**
 * Shown when the answer text carries the model's native tool-call markup. Live 2026-11-26: swe-2 emits it as plain
 * text when it wants a tool the request did not declare. Worded as a server error so nycode retries it.
 */
export const NATIVE_TOOL_MARKUP_MESSAGE =
	"Devin server error: the model answered with raw tool-call markup instead of text (no tool was available)";

// Special tokens seen in those leaks (`<|open|>tools<|sep|>…<|close|>…<|end_message|>`); plain text never has them.
const NATIVE_MARKUP = /<\|(?:open|close|sep|end_message)\|>/;

type UsageEvent = Extract<CloudChatEvent, { kind: "usage" }>;

/** Creates the assembler for one response: blocks open and close in the order the server streams them. */
export function createAssistantAssembler(model: Model<Api>, stream: AssistantMessageEventStream): AssistantAssembler {
	const output: AssistantMessage = {
		role: "assistant",
		content: [],
		api: model.api,
		provider: model.provider,
		model: model.id,
		usage: {
			input: 0,
			output: 0,
			cacheRead: 0,
			cacheWrite: 0,
			totalTokens: 0,
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
		},
		stopReason: "stop",
		timestamp: Date.now(),
	};

	let textOpen = false;
	let thinkingOpen = false;
	let toolIndex = -1;
	let thinkingIndex = -1;
	let partialJson = "";
	let toolId = "";
	let toolName = "";
	// Both usage sources are kept and chosen at the end, so arrival order never matters.
	let statsUsage: UsageEvent | undefined;
	let trailerUsage: UsageEvent | undefined;
	let statsModel: string | undefined;
	let actualModel: string | undefined;
	let refused = false;
	let leakedMarkup = false;
	let finished = false;
	let pendingGeminiSignature: string | undefined;

	const closeText = (): void => {
		if (!textOpen) return;
		const idx = output.content.length - 1;
		const block = output.content[idx];
		if (block.type === "text")
			stream.push({ type: "text_end", contentIndex: idx, content: block.text, partial: output });
		textOpen = false;
	};
	const closeThinking = (): void => {
		if (!thinkingOpen) return;
		const idx = output.content.length - 1;
		const block = output.content[idx];
		if (block.type === "thinking") {
			stream.push({ type: "thinking_end", contentIndex: idx, content: block.thinking, partial: output });
		}
		thinkingOpen = false;
	};
	const closeTool = (): void => {
		if (toolIndex < 0) return;
		const block = output.content[toolIndex];
		if (block.type === "toolCall") {
			block.arguments = parsePartialToolArguments(partialJson);
			stream.push({
				type: "toolcall_end",
				contentIndex: toolIndex,
				toolCall: { type: "toolCall", id: toolId, name: toolName, arguments: block.arguments },
				partial: output,
			});
		}
		toolIndex = -1;
	};
	const close = (): void => {
		closeText();
		closeThinking();
		closeTool();
	};

	const onText = (text: string): void => {
		closeThinking();
		if (!textOpen) {
			output.content.push({ type: "text", text: "" });
			stream.push({ type: "text_start", contentIndex: output.content.length - 1, partial: output });
			textOpen = true;
		}
		const idx = output.content.length - 1;
		const block = output.content[idx];
		if (block.type === "text") {
			block.text += text;
			// The tail check covers a marker split across two deltas (the longest marker is 15 characters).
			if (!leakedMarkup) leakedMarkup = NATIVE_MARKUP.test(block.text.slice(-text.length - 14));
			stream.push({ type: "text_delta", contentIndex: idx, delta: text, partial: output });
		}
	};
	const onReasoning = (text: string): void => {
		closeText();
		if (!thinkingOpen) {
			output.content.push({ type: "thinking", thinking: "" });
			thinkingIndex = output.content.length - 1;
			stream.push({ type: "thinking_start", contentIndex: thinkingIndex, partial: output });
			thinkingOpen = true;
		}
		const idx = output.content.length - 1;
		const block = output.content[idx];
		if (block.type === "thinking") {
			block.thinking += text;
			stream.push({ type: "thinking_delta", contentIndex: idx, delta: text, partial: output });
		}
	};
	const onToolStart = (id: string, name: string): void => {
		close();
		toolId = id;
		toolName = name;
		partialJson = "";
		output.content.push({
			type: "toolCall",
			id,
			name,
			arguments: {},
			...(pendingGeminiSignature ? { thoughtSignature: pendingGeminiSignature } : {}),
		});
		pendingGeminiSignature = undefined;
		toolIndex = output.content.length - 1;
		stream.push({ type: "toolcall_start", contentIndex: toolIndex, partial: output });
	};
	const onToolArgs = (argsDelta: string): void => {
		if (toolIndex < 0) return;
		partialJson += argsDelta;
		const block = output.content[toolIndex];
		if (block.type === "toolCall") block.arguments = parsePartialToolArguments(partialJson);
		stream.push({ type: "toolcall_delta", contentIndex: toolIndex, delta: argsDelta, partial: output });
	};
	const onGeminiSignature = (signature: string): void => {
		for (let i = output.content.length - 1; i >= 0; i--) {
			const block = output.content[i];
			if (block.type === "toolCall" && !block.thoughtSignature) {
				block.thoughtSignature = signature;
				return;
			}
		}
		pendingGeminiSignature = signature;
	};
	const applyUsage = (): void => {
		const event = statsUsage ?? trailerUsage;
		if (!event) return;
		// Cache reads and writes are reported apart from fresh input (#2), so nothing is added to `input` twice.
		output.usage.input = event.promptTokens ?? 0;
		output.usage.output = event.completionTokens ?? 0;
		output.usage.cacheRead = event.cachedInputTokens ?? 0;
		output.usage.cacheWrite = event.cacheCreationInputTokens ?? 0;
		output.usage.totalTokens = calculateUsageTotal(event);
		calculateCost(model, output.usage);
	};
	const thinkingBlock = () => {
		const block = thinkingIndex >= 0 ? output.content[thinkingIndex] : undefined;
		return block?.type === "thinking" ? block : undefined;
	};

	const apply = (event: CloudChatEvent): void => {
		switch (event.kind) {
			case "text":
				onText(event.text);
				break;
			case "reasoning":
				onReasoning(event.text);
				break;
			case "reasoning_signature": {
				// The signature trails the thinking text, so it lands on a block that is already closed.
				const block = thinkingBlock();
				if (block) block.thinkingSignature = packThinkingSignature(event.signature, event.signatureType);
				break;
			}
			case "reasoning_redacted": {
				const block = thinkingBlock();
				if (block) block.redacted = true;
				break;
			}
			case "tool_call_start":
				onToolStart(event.id, event.name);
				break;
			case "tool_call_args":
				onToolArgs(event.argsDelta);
				break;
			case "finish":
				close();
				finished = true;
				output.rawStopReason = String(event.raw);
				if (event.reason === "content_filter") refused = true;
				else if (event.reason === "error") {
					output.stopReason = "error";
					output.errorMessage = SERVER_STOP_ERROR_MESSAGE;
				} else {
					output.stopReason =
						event.reason === "tool_calls" ? "toolUse" : event.reason === "length" ? "length" : "stop";
				}
				break;
			case "usage":
				if (event.source === "stats") {
					statsUsage = event;
					if (event.providerRefusal) refused = true;
				} else {
					trailerUsage = event;
				}
				applyUsage();
				break;
			case "response_model":
				// #23 actual_model_uid wins over the model uid of the usage stats; both name the model that answered.
				if (event.source === "actual") actualModel = event.model;
				else statsModel = event.model;
				output.responseModel = actualModel ?? statsModel;
				break;
			case "gemini_signature":
				onGeminiSignature(event.signature);
				break;
		}
	};

	const closeAll = (): void => {
		close();
		applyUsage();
		if (refused) {
			output.stopReason = "error";
			output.errorMessage = REFUSAL_MESSAGE;
		} else if (leakedMarkup && output.stopReason !== "error") {
			output.stopReason = "error";
			output.errorMessage = NATIVE_TOOL_MARKUP_MESSAGE;
		}
	};
	const isEmpty = (): boolean => output.content.length === 0 && !finished;

	return { output, apply, close: closeAll, isEmpty };
}
