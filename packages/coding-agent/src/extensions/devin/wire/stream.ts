// The provider's `streamSimple`: maps a nycode transcript to a Devin chat call and emits assistant events.
// Ported from pi-devin-plus 0.1.3 (MIT), see ../LICENSE.
import {
	type Api,
	type AssistantMessageEventStream,
	createAssistantMessageEventStream,
	type Model,
	type SimpleStreamOptions,
	type TranscriptContext,
} from "@nycode/ai";
import { resolveModelUid } from "../catalog/models.ts";
import { mapContextToChat } from "../context/context-map.ts";
import { streamChatEvents } from "../transport/chat-call.ts";
import { createAssistantAssembler } from "./assistant.ts";

/** Env variable that supplies a Devin session token without `/login`. */
export const DEVIN_API_KEY_ENV = "DEVIN_LLM_API_KEY";

/** Message for a stream that closed cleanly with nothing in it. */
export const EMPTY_STREAM_MESSAGE = "Devin stream ended without content";

function topPOf(model: Model<Api>, options?: SimpleStreamOptions): number | undefined {
	// samplingParams is free-form per key: the value is only trusted when it is a number.
	const value = { ...model.samplingParams, ...options?.samplingParams }.top_p;
	return typeof value === "number" ? value : undefined;
}

/** The provider's `streamSimple`: maps the transcript, calls Devin and emits nycode assistant events. */
export function streamDevin(
	model: Model<Api>,
	context: TranscriptContext,
	options?: SimpleStreamOptions,
): AssistantMessageEventStream {
	const stream = createAssistantMessageEventStream();

	void (async () => {
		const assembler = createAssistantAssembler(model, stream);
		const { output } = assembler;
		try {
			const apiKey = options?.apiKey ?? process.env[DEVIN_API_KEY_ENV]?.trim();
			if (!apiKey) throw new Error(`No Devin credentials. Run /login devin, or set ${DEVIN_API_KEY_ENV}.`);
			const modelUid = resolveModelUid(model.id, model.thinkingLevelMap, options?.reasoning);
			const mapped = mapContextToChat(context);
			if (mapped.hasImages && !model.input.includes("image")) {
				throw new Error(
					`Devin model ${model.id} does not accept images; pick a model that does or remove the image.`,
				);
			}
			stream.push({ type: "start", partial: output });

			for await (const event of streamChatEvents({
				apiKey,
				modelUid,
				systemPrompt: mapped.systemPrompt,
				messages: mapped.messages,
				tools: mapped.tools.length > 0 ? mapped.tools : undefined,
				// The upstream answers a max_tokens above the context window with an opaque internal error.
				maxTokens: Math.min(options?.maxTokens ?? model.maxTokens, model.contextWindow),
				temperature: options?.temperature,
				topP: topPOf(model, options),
				toolChoice: options?.toolChoice,
				signal: options?.signal,
			})) {
				assembler.apply(event);
			}

			assembler.close();
			if (output.stopReason === "error") throw new Error(output.errorMessage);
			if (assembler.isEmpty()) throw new Error(EMPTY_STREAM_MESSAGE);
			stream.push({ type: "done", reason: output.stopReason as "stop" | "length" | "toolUse", message: output });
			stream.end();
		} catch (error) {
			output.stopReason = options?.signal?.aborted ? "aborted" : "error";
			output.errorMessage = error instanceof Error ? error.message : String(error);
			stream.push({ type: "error", reason: output.stopReason as "aborted" | "error", error: output });
			stream.end();
		}
	})();

	return stream;
}
