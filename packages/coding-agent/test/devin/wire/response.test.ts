// Response handling through streamDevin with synthetic Connect frames: usage, stop reasons, model, Gemini signature.
import { type Api, type AssistantMessage, isRetryableAssistantError, type Model, normalizeContext } from "@nycode/ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearClientIdentityCache } from "../../../src/extensions/devin/auth/identity.ts";
import { clearCachedUserJwt } from "../../../src/extensions/devin/auth/jwt.ts";
import { NATIVE_TOOL_MARKUP_MESSAGE, REFUSAL_MESSAGE } from "../../../src/extensions/devin/wire/assistant.ts";
import { EMPTY_STREAM_MESSAGE, streamDevin } from "../../../src/extensions/devin/wire/stream.ts";
import {
	API_KEY,
	encodeMessage,
	encodeString,
	encodeVarintField,
	eosFrame,
	rawFrame,
	streamResponse,
	stubDevinFetch,
	tempDir,
	toolCallMessage,
	usageMessage,
	writeFakeDevin,
} from "../helpers.ts";

const model = {
	id: "claude-opus-5",
	name: "Opus",
	api: "devin-local",
	provider: "devin",
	baseUrl: "https://server.codeium.com",
	reasoning: false,
	input: ["text"],
	cost: { input: 10, output: 20, cacheRead: 1, cacheWrite: 2 },
	contextWindow: 1000,
	maxTokens: 100,
} as unknown as Model<Api>;

const context = normalizeContext({
	systemPrompt: "sys",
	messages: [{ role: "user", content: "hi", timestamp: 1 }],
	tools: [],
});

const run = (): Promise<AssistantMessage> => streamDevin(model, context, { apiKey: API_KEY }).result();
const retryable = (message: AssistantMessage) => isRetryableAssistantError(message);

/** ModelUsageStats (#7): input 2, output 3, cache write 4, cache read 5, model uid 9, provider refusal 12. */
function stats(fields: {
	input?: number;
	output?: number;
	cacheWrite?: number;
	cacheRead?: number;
	model?: string;
	refusal?: boolean;
}) {
	return encodeMessage(
		7,
		Buffer.concat([
			...(fields.input !== undefined ? [encodeVarintField(2, fields.input)] : []),
			...(fields.output !== undefined ? [encodeVarintField(3, fields.output)] : []),
			...(fields.cacheWrite !== undefined ? [encodeVarintField(4, fields.cacheWrite)] : []),
			...(fields.cacheRead !== undefined ? [encodeVarintField(5, fields.cacheRead)] : []),
			...(fields.model ? [encodeString(9, fields.model)] : []),
			...(fields.refusal ? [encodeVarintField(12, 1)] : []),
		]),
	);
}

beforeEach(() => {
	vi.stubEnv("DEVIN_CLI", writeFakeDevin(tempDir()));
	vi.stubEnv("HOME", tempDir());
});

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
	clearCachedUserJwt();
	clearClientIdentityCache();
});

describe("usage", () => {
	it("reads ModelUsageStats (#7) as the primary source and does not add cache reads to input", async () => {
		stubDevinFetch(() =>
			streamResponse([
				rawFrame(
					0,
					Buffer.concat([
						encodeString(3, "x"),
						stats({ input: 100, output: 40, cacheWrite: 7, cacheRead: 50 }),
						// the trailer disagrees: it must lose
						encodeMessage(28, usageMessage({ input_tokens: 1, output_tokens: 1, cache_read_tokens: 999 })),
					]),
				),
				eosFrame(),
			]),
		);
		const message = await run();
		expect(message.usage).toMatchObject({ input: 100, output: 40, cacheWrite: 7, cacheRead: 50, totalTokens: 197 });
		expect(message.usage.cost.input).toBeCloseTo(0.001);
		expect(message.usage.cost.cacheRead).toBeCloseTo(0.00005);
	});

	it("falls back to the #28 trailer usage when there are no stats, whatever the frame order", async () => {
		stubDevinFetch(() =>
			streamResponse([
				rawFrame(
					0,
					Buffer.concat([
						encodeString(3, "x"),
						encodeMessage(28, usageMessage({ input_tokens: 11, output_tokens: 5 })),
					]),
				),
				eosFrame(),
			]),
		);
		expect((await run()).usage).toMatchObject({ input: 11, output: 5, totalTokens: 16 });
	});

	it("uses the latest stats when several arrive (replace, not sum)", async () => {
		stubDevinFetch(() =>
			streamResponse([
				rawFrame(0, Buffer.concat([encodeString(3, "x"), stats({ input: 10, output: 1 })])),
				rawFrame(0, stats({ input: 10, output: 9 })),
				eosFrame(),
			]),
		);
		expect((await run()).usage).toMatchObject({ input: 10, output: 9, totalTokens: 19 });
	});

	it("reports the model that answered: #23 actual_model_uid over the stats model uid", async () => {
		stubDevinFetch(() =>
			streamResponse([
				rawFrame(0, Buffer.concat([encodeString(3, "x"), stats({ input: 1, output: 1, model: "from-stats" })])),
				eosFrame(),
			]),
		);
		expect((await run()).responseModel).toBe("from-stats");
		stubDevinFetch(() =>
			streamResponse([
				rawFrame(
					0,
					Buffer.concat([
						encodeString(3, "x"),
						stats({ input: 1, output: 1, model: "from-stats" }),
						encodeString(23, "actual-model"),
					]),
				),
				eosFrame(),
			]),
		);
		expect((await run()).responseModel).toBe("actual-model");
	});
});

describe("stop reasons (#5)", () => {
	const finishing = (reason: number, extra: Buffer = Buffer.alloc(0)) =>
		stubDevinFetch(() =>
			streamResponse([
				rawFrame(0, Buffer.concat([encodeString(3, "x"), encodeVarintField(5, reason), extra])),
				eosFrame(),
			]),
		);

	it.each([1, 3, 5, 9])("%i -> length", async (reason) => {
		finishing(reason);
		const message = await run();
		expect(message.stopReason).toBe("length");
		expect(message.rawStopReason).toBe(String(reason));
	});

	it("10 -> toolUse; others -> stop", async () => {
		finishing(10);
		expect((await run()).stopReason).toBe("toolUse");
		for (const reason of [0, 2, 4, 6, 12]) {
			finishing(reason);
			expect((await run()).stopReason).toBe("stop");
		}
	});

	it("11 (content filter) -> an honest, non-retryable error", async () => {
		finishing(11);
		const message = await run();
		expect(message.stopReason).toBe("error");
		expect(message.errorMessage).toBe(REFUSAL_MESSAGE);
		expect(message.content[0]).toMatchObject({ text: "x" });
		expect(retryable(message)).toBe(false);
	});

	it("provider_refusal in the usage stats -> the same error, even when the stop reason says stop", async () => {
		finishing(0, stats({ input: 1, output: 1, refusal: true }));
		const message = await run();
		expect(message.stopReason).toBe("error");
		expect(message.errorMessage).toBe(REFUSAL_MESSAGE);
	});

	it("13 -> an error worded as a server error, so it is retried", async () => {
		finishing(13);
		const message = await run();
		expect(message.stopReason).toBe("error");
		expect(retryable(message)).toBe(true);
	});
});

describe("empty stream", () => {
	it("EOS without text, tool call or stop reason is an error", async () => {
		stubDevinFetch(() => streamResponse([eosFrame()]));
		const message = await run();
		expect(message.stopReason).toBe("error");
		expect(message.errorMessage).toBe(EMPTY_STREAM_MESSAGE);
		expect(message.errorMessage).toBe("Devin stream ended without content");
	});

	it("a bare stop reason, a tool call or usage-only text still count as content", async () => {
		stubDevinFetch(() => streamResponse([rawFrame(0, encodeVarintField(5, 2)), eosFrame()]));
		expect((await run()).stopReason).toBe("stop");
		stubDevinFetch(() =>
			streamResponse([rawFrame(0, encodeMessage(6, toolCallMessage("c", "read", "{}"))), eosFrame()]),
		);
		expect((await run()).content[0]).toMatchObject({ type: "toolCall" });
	});
});

describe("native tool-call markup in the text", () => {
	const textFrame = (text: string) => rawFrame(0, encodeString(3, text));
	const leak = '" 2>&1 | head<|close|>argument<|sep|><|close|>call<|sep|>';

	it("is an error worded as a server error, so it is retried, instead of printed as an answer", async () => {
		stubDevinFetch(() => streamResponse([textFrame(`Red${leak}`), eosFrame()]));
		const message = await run();
		expect(message.stopReason).toBe("error");
		expect(message.errorMessage).toBe(NATIVE_TOOL_MARKUP_MESSAGE);
		expect(retryable(message)).toBe(true);
	});

	it("is found when a marker is split across deltas", async () => {
		stubDevinFetch(() => streamResponse([textFrame("a<|se"), textFrame("p|>b"), eosFrame()]));
		expect((await run()).errorMessage).toBe(NATIVE_TOOL_MARKUP_MESSAGE);
	});

	it("leaves text that only resembles a marker alone", async () => {
		stubDevinFetch(() => streamResponse([textFrame("a <| b |> c"), textFrame("<|other|>"), eosFrame()]));
		const message = await run();
		expect(message.stopReason).toBe("stop");
		expect(message.errorMessage).toBeUndefined();
	});
});

describe("Gemini thought signature (#20)", () => {
	const sig = Buffer.from([9, 8, 7, 200]);

	it("is attached to the tool call, in the same frame or from an earlier one", async () => {
		stubDevinFetch(() =>
			streamResponse([
				rawFrame(0, Buffer.concat([encodeMessage(6, toolCallMessage("c1", "read", "{}")), encodeMessage(20, sig)])),
				eosFrame(),
			]),
		);
		expect(((await run()).content[0] as { thoughtSignature?: string }).thoughtSignature).toBe(sig.toString("base64"));
		stubDevinFetch(() =>
			streamResponse([
				rawFrame(0, encodeMessage(20, sig)),
				rawFrame(0, encodeMessage(6, toolCallMessage("c1", "read", "{}"))),
				eosFrame(),
			]),
		);
		expect(((await run()).content[0] as { thoughtSignature?: string }).thoughtSignature).toBe(sig.toString("base64"));
	});
});
