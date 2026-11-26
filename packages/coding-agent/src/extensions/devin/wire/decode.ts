// Decodes GetChatMessage response frames into chat events. Ported from an MIT-licensed Devin provider extension, see ../LICENSE.
import { iterFields } from "./proto.ts";

export type CloudChatEvent =
	| { kind: "text"; text: string }
	| { kind: "reasoning"; text: string }
	| { kind: "reasoning_signature"; signature: string; signatureType?: string }
	| { kind: "reasoning_redacted" }
	| { kind: "tool_call_start"; id: string; name: string }
	| { kind: "tool_call_args"; argsDelta: string; id?: string }
	| { kind: "finish"; reason: "stop" | "tool_calls" | "length" | "content_filter" | "error"; raw: number }
	| { kind: "response_model"; model: string; source: "stats" | "actual" }
	/** Gemini's opaque thought signature (response #20), base64, to be replayed on the assistant tool-call message. */
	| { kind: "gemini_signature"; signature: string }
	| {
			kind: "usage";
			/** `stats` = ModelUsageStats (#7, authoritative); `trailer` = the #28 dimension groups (fallback). */
			source: "stats" | "trailer";
			/** The provider flagged the answer as a refusal (ModelUsageStats #12). */
			providerRefusal?: boolean;
			promptTokens?: number;
			completionTokens?: number;
			totalTokens?: number;
			cachedInputTokens?: number;
			cacheCreationInputTokens?: number;
	  };

export interface UsageMetrics {
	promptTokens?: number;
	completionTokens?: number;
	cachedInputTokens?: number;
	cacheCreationInputTokens?: number;
}

/** Complete context token count from Devin's split usage metrics: cache tokens are reported apart but still occupy the context. */
export function calculateUsageTotal(usage: UsageMetrics): number {
	return (
		(usage.promptTokens ?? 0) +
		(usage.completionTokens ?? 0) +
		(usage.cachedInputTokens ?? 0) +
		(usage.cacheCreationInputTokens ?? 0)
	);
}

function isBytes(value: bigint | Buffer): value is Buffer {
	return Buffer.isBuffer(value);
}

// StopReason enum of the Devin proto: 1 INCOMPLETE, 3 MAX_TOKENS, 5 MAX_NEWLINES and 9 PARTIAL are cut-offs,
// 10 FUNCTION_CALL, 11 CONTENT_FILTER, 13 ERROR; the remaining values are a normal stop.
function finishReason(value: number): Extract<CloudChatEvent, { kind: "finish" }>["reason"] {
	if (value === 10) return "tool_calls";
	if (value === 11) return "content_filter";
	if (value === 13) return "error";
	if (value === 1 || value === 3 || value === 5 || value === 9) return "length";
	return "stop";
}

function* decodeToolCall(body: Buffer): Generator<CloudChatEvent> {
	let id: string | undefined;
	let name: string | undefined;
	let argsDelta: string | undefined;
	for (const inner of iterFields(body)) {
		if (inner.wire === 2 && isBytes(inner.value)) {
			const text = inner.value.toString("utf8");
			if (inner.num === 1) id = text;
			else if (inner.num === 2) name = text;
			else if (inner.num === 3) argsDelta = text;
		}
	}
	if (id !== undefined && name !== undefined) yield { kind: "tool_call_start", id, name };
	if (argsDelta !== undefined) yield { kind: "tool_call_args", argsDelta, ...(id ? { id } : {}) };
}

/** Decodes one GetChatMessageResponse frame. The signature trails the thinking text, so it is yielded last. */
export function* decodeChatFrame(proto: Buffer): Generator<CloudChatEvent> {
	let signature: string | undefined;
	let signatureType: string | undefined;
	for (const field of iterFields(proto)) {
		if (field.wire === 2 && isBytes(field.value)) {
			const text = field.value.toString("utf8");
			if (field.num === 3 && text) yield { kind: "text", text };
			else if (field.num === 9 && text) yield { kind: "reasoning", text };
			else if (field.num === 10 && text) signature = text;
			else if (field.num === 21 && text) signatureType = text;
			else if (field.num === 6) yield* decodeToolCall(field.value);
			else if (field.num === 7) yield* decodeModelUsageStats(field.value);
			else if (field.num === 20 && field.value.length > 0) {
				yield { kind: "gemini_signature", signature: field.value.toString("base64") };
			} else if (field.num === 23 && text) yield { kind: "response_model", model: text, source: "actual" };
			else if (field.num === 28) {
				const usage = decodeUsage(field.value);
				if (usage) yield usage;
			}
		} else if (field.wire === 0) {
			// 11 = GetChatMessageResponse.thinking_redacted, 5 = stop reason.
			if (field.num === 11 && Number(field.value) !== 0) yield { kind: "reasoning_redacted" };
			else if (field.num === 5) {
				const raw = Number(field.value);
				yield { kind: "finish", reason: finishReason(raw), raw };
			}
		}
	}
	if (signature) yield { kind: "reasoning_signature", signature, signatureType };
}

/** ModelUsageStats (#7): input 2, output 3, cache write 4, cache read 5, model uid 9, provider refusal 12. */
function* decodeModelUsageStats(buf: Buffer): Generator<CloudChatEvent> {
	const counts = new Map<number, number>();
	let model: string | undefined;
	let providerRefusal = false;
	for (const field of iterFields(buf)) {
		if (field.wire === 0) {
			if (field.num === 12) providerRefusal = field.value !== 0n;
			else counts.set(field.num, Number(field.value));
		} else if (field.num === 9 && field.wire === 2 && isBytes(field.value)) {
			model = field.value.toString("utf8");
		}
	}
	if (model) yield { kind: "response_model", model, source: "stats" };
	const promptTokens = counts.get(2);
	const completionTokens = counts.get(3);
	const cacheCreationInputTokens = counts.get(4);
	const cachedInputTokens = counts.get(5);
	if (promptTokens === undefined && completionTokens === undefined && !providerRefusal) return;
	yield {
		kind: "usage",
		source: "stats",
		providerRefusal,
		promptTokens,
		completionTokens,
		totalTokens: calculateUsageTotal({ promptTokens, completionTokens, cachedInputTokens, cacheCreationInputTokens }),
		cachedInputTokens,
		cacheCreationInputTokens,
	};
}

function decodeUsage(buf: Buffer): CloudChatEvent | null {
	let promptTokens: number | undefined;
	let completionTokens: number | undefined;
	let cachedInputTokens: number | undefined;
	let cacheCreationInputTokens: number | undefined;
	for (const field of iterFields(buf)) {
		if (field.num !== 2 || field.wire !== 2 || !isBytes(field.value)) continue;
		let metric: string | undefined;
		let value: number | undefined;
		for (const inner of iterFields(field.value)) {
			if (inner.num === 5 && inner.wire === 2 && isBytes(inner.value)) {
				metric = inner.value.toString("utf8");
			} else if (inner.num === 4 && inner.wire === 2 && isBytes(inner.value)) {
				for (const dim of iterFields(inner.value)) {
					if (dim.num === 2 && dim.wire === 5 && isBytes(dim.value)) value = dim.value.readFloatLE(0);
				}
			}
		}
		if (!metric || value === undefined || !Number.isFinite(value)) continue;
		const n = Math.round(value);
		if (metric === "input_tokens") promptTokens = n;
		else if (metric === "output_tokens") completionTokens = n;
		else if (metric.includes("cached") || metric.includes("cache_read")) cachedInputTokens = n;
		else if (metric.includes("cache_creation")) cacheCreationInputTokens = n;
	}
	if (promptTokens === undefined && completionTokens === undefined) return null;
	return {
		kind: "usage",
		source: "trailer",
		promptTokens,
		completionTokens,
		totalTokens: calculateUsageTotal({ promptTokens, completionTokens, cachedInputTokens, cacheCreationInputTokens }),
		cachedInputTokens,
		cacheCreationInputTokens,
	};
}
