import { gunzipSync } from "node:zlib";
import { type Api, type AssistantMessage, type Model, normalizeContext, type SimpleStreamOptions } from "@nycode/ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearClientIdentityCache } from "../../../src/extensions/devin/auth/identity.ts";
import { clearCachedUserJwt, getCachedUserJwt, mintUserJwt } from "../../../src/extensions/devin/auth/jwt.ts";
import { DEVIN_API_HOST } from "../../../src/extensions/devin/auth/net.ts";
import { MAX_PAYLOAD_BYTES, streamChatEvents } from "../../../src/extensions/devin/transport/chat-call.ts";
import { MAX_FRAME_BYTES } from "../../../src/extensions/devin/wire/frames.ts";
import { iterFields } from "../../../src/extensions/devin/wire/proto.ts";
import { streamDevin } from "../../../src/extensions/devin/wire/stream.ts";
import {
	API_KEY,
	encodeMessage,
	encodeString,
	encodeVarintField,
	eosFrame,
	gzipFrame,
	jwtResponse,
	jwtWithExp,
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
	reasoning: true,
	thinkingLevelMap: { off: null, low: "claude-opus-5-low", high: "claude-opus-5-high" },
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

async function run(options: Partial<SimpleStreamOptions> = { apiKey: API_KEY }): Promise<AssistantMessage> {
	return streamDevin(model, context, options as SimpleStreamOptions).result();
}

beforeEach(() => {
	vi.stubEnv("DEVIN_CLI", writeFakeDevin(tempDir()));
});

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
	clearCachedUserJwt();
	clearClientIdentityCache();
});

describe("streamDevin", () => {
	it("streams text, reasoning, tool calls and usage into one assistant message", async () => {
		const calls = stubDevinFetch(() =>
			streamResponse([
				gzipFrame(Buffer.concat([encodeString(9, "think "), encodeString(9, "hard")])),
				rawFrame(0, Buffer.concat([encodeString(10, "sig-1"), encodeString(3, "Hello ")])),
				rawFrame(0, encodeString(3, "world")),
				rawFrame(
					0,
					Buffer.concat([
						encodeMessage(6, toolCallMessage("c1", "read", '{"path":"a')),
						encodeMessage(6, Buffer.concat([encodeString(1, "c1"), encodeString(3, '.txt"}')])),
					]),
				),
				rawFrame(
					0,
					Buffer.concat([
						encodeVarintField(5, 10),
						encodeMessage(28, usageMessage({ input_tokens: 100, output_tokens: 50 })),
					]),
				),
				eosFrame(),
			]),
		);
		const message = await run({ apiKey: API_KEY, reasoning: "low", maxTokens: 777 });

		expect(message.stopReason).toBe("toolUse");
		expect(message.content.map((c) => c.type)).toEqual(["thinking", "text", "toolCall"]);
		expect(message.content[0]).toMatchObject({
			type: "thinking",
			thinking: "think hard",
			thinkingSignature: "sig-1",
		});
		expect(message.content[1]).toMatchObject({ text: "Hello world" });
		expect(message.content[2]).toMatchObject({ id: "c1", name: "read", arguments: { path: "a.txt" } });
		expect(message.usage).toMatchObject({ input: 100, output: 50, totalTokens: 150 });
		expect(message.usage.cost.total).toBeCloseTo(0.002);

		expect(calls.map((c) => c.url)).toEqual([
			"https://server.codeium.com/exa.auth_pb.AuthService/GetUserJwt",
			"https://server.codeium.com/exa.api_server_pb.ApiServerService/GetChatMessage",
		]);
		expect(calls[1].init.redirect).toBe("error");
		const fields = [...iterFields(decodeBody(calls[1].init.body as Uint8Array))];
		expect((fields.find((f) => f.num === 21)?.value as Buffer).toString()).toBe("claude-opus-5-low");
	});

	it("ends with a plain stop and reports usage-free responses", async () => {
		stubDevinFetch(() => streamResponse([rawFrame(0, encodeString(3, "x")), eosFrame()]));
		const message = await run();
		expect(message.stopReason).toBe("stop");
		expect(message.usage.totalTokens).toBe(0);
	});

	it("fails without credentials, on HTTP errors, empty bodies, trailer errors and a missing trailer", async () => {
		expect((await run({})).errorMessage).toContain("No Devin credentials");

		stubDevinFetch(() => new Response("nope", { status: 500 }));
		expect((await run()).errorMessage).toMatch(/temporarily unavailable.*nope/);

		stubDevinFetch(() => new Response(null, { status: 200 }));
		expect((await run()).errorMessage).toBe("GetChatMessage returned an empty body");

		stubDevinFetch(() => streamResponse([eosFrame('{"error":{"message":"quota exceeded"}}')]));
		expect((await run()).errorMessage).toContain("Devin quota exceeded: quota exceeded");

		stubDevinFetch(() => streamResponse([eosFrame('{"error":"raw"}')]));
		expect((await run()).errorMessage).toBe("Devin request failed: raw");

		stubDevinFetch(() => streamResponse([eosFrame('not json but has "error"')]));
		expect((await run()).errorMessage).toContain("not json");

		stubDevinFetch(() => streamResponse([rawFrame(0, encodeString(3, "x"))]));
		expect((await run()).errorMessage).toBe("Devin stream ended without an EOS trailer");
	});

	it("marks an aborted request as aborted", async () => {
		const controller = new AbortController();
		stubDevinFetch(() => streamResponse([eosFrame()]));
		controller.abort();
		const message = await run({ apiKey: API_KEY, signal: controller.signal });
		expect(message.stopReason).toBe("aborted");
	});

	it("refuses an oversized frame header and a gzip bomb", async () => {
		const header = Buffer.alloc(5);
		header.writeUInt32BE(MAX_FRAME_BYTES + 1, 1);
		stubDevinFetch(() => streamResponse([header]));
		expect((await run()).errorMessage).toContain("exceeds");

		// MAX_PAYLOAD_BYTES + 1 zeros compress to a few KB.
		stubDevinFetch(() => streamResponse([gzipFrame(Buffer.alloc(MAX_PAYLOAD_BYTES + 1)), eosFrame()]));
		expect((await run()).stopReason).toBe("error");
	});

	it("a stream that goes silent after its first frame rejects with an idle error", async () => {
		stubDevinFetch(
			() =>
				new Response(
					new ReadableStream<Uint8Array>({
						start(controller) {
							controller.enqueue(new Uint8Array(rawFrame(0, encodeString(3, "x"))));
						},
					}),
					{ status: 200 },
				),
		);
		const consume = async () => {
			for await (const _ of streamChatEvents({ apiKey: API_KEY, modelUid: "m", messages: [], idleTimeoutMs: 20 })) {
				// drained
			}
		};
		await expect(consume()).rejects.toThrow("stalled for 0s (timeout)");
	});

	it("surfaces a stream that dies mid-response", async () => {
		stubDevinFetch(
			() =>
				new Response(
					new ReadableStream<Uint8Array>({
						start(controller) {
							controller.error(new Error("socket died"));
						},
					}),
					{ status: 200 },
				),
		);
		expect((await run()).errorMessage).toBe("socket died");
	});
});

function decodeBody(body: Uint8Array): Buffer {
	// Request body is one gzip-compressed Connect frame.
	const frame = Buffer.from(body);
	return gunzipSync(frame.subarray(5));
}

describe("user JWT", () => {
	it("mints once for concurrent callers, caches until near expiry and re-mints per key", async () => {
		const fetchMock = vi.fn(async () => jwtResponse(jwtWithExp(Math.floor(Date.now() / 1000) + 3600)));
		vi.stubGlobal("fetch", fetchMock);
		const [a, b] = await Promise.all([
			getCachedUserJwt(API_KEY, DEVIN_API_HOST),
			getCachedUserJwt(API_KEY, DEVIN_API_HOST),
		]);
		expect(a).toBe(b);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		await getCachedUserJwt(API_KEY, DEVIN_API_HOST);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		await getCachedUserJwt("another-key-000000000", DEVIN_API_HOST);
		expect(fetchMock).toHaveBeenCalledTimes(2);

		clearCachedUserJwt();
		fetchMock.mockImplementation(async () => jwtResponse(jwtWithExp(Math.floor(Date.now() / 1000) + 30)));
		await getCachedUserJwt(API_KEY, DEVIN_API_HOST);
		await getCachedUserJwt(API_KEY, DEVIN_API_HOST); // under the 60 s margin: minted again
		expect(fetchMock).toHaveBeenCalledTimes(4);
	});

	it("rejects HTTP errors and responses without a JWT, and tolerates an undecodable JWT", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response("denied", { status: 401 })),
		);
		await expect(mintUserJwt(API_KEY, DEVIN_API_HOST)).rejects.toThrow("Devin authentication failed");
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response(new Uint8Array(encodeString(1, "not-a-jwt")), { status: 200 })),
		);
		await expect(mintUserJwt(API_KEY, DEVIN_API_HOST)).rejects.toThrow("returned no JWT");
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => jwtResponse("eyJ.%%%.sig")),
		);
		const minted = await mintUserJwt(API_KEY, DEVIN_API_HOST, new AbortController().signal);
		expect(minted.expiresAt).toBeGreaterThan(Date.now() / 1000);
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => jwtResponse("eyJhbGciOiJub25lIn0")),
		);
		expect((await mintUserJwt(API_KEY, DEVIN_API_HOST)).jwt).toBe("eyJhbGciOiJub25lIn0");
	});
});
