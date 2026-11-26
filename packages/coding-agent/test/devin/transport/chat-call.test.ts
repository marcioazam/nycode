// Request parameters, time limits, JWT refresh, errors, images and host, observed on the captured requests.

import { writeFileSync } from "node:fs";
import {
	type Api,
	type AssistantMessage,
	isRetryableAssistantError,
	type Model,
	normalizeContext,
	type SimpleStreamOptions,
} from "@nycode/ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ENV_AGENT_DIR } from "../../../src/config.ts";
import { clearClientIdentityCache } from "../../../src/extensions/devin/auth/identity.ts";
import { clearCachedUserJwt } from "../../../src/extensions/devin/auth/jwt.ts";
import { writeSessionState } from "../../../src/extensions/devin/auth/login/session.ts";
import { FIRST_BYTE_TIMEOUT_MS, streamChatEvents } from "../../../src/extensions/devin/transport/chat-call.ts";
import { iterFields } from "../../../src/extensions/devin/wire/proto.ts";
import { streamDevin } from "../../../src/extensions/devin/wire/stream.ts";
import {
	API_KEY,
	chatRequestFields,
	completionConfig,
	encodeString,
	eosFrame,
	jwtResponse,
	jwtWithExp,
	rawFrame,
	streamResponse,
	stubDevinFetch,
	tempDir,
	writeCredentialsFile,
	writeFakeDevin,
} from "../helpers.ts";

function makeModel(overrides: Record<string, unknown> = {}): Model<Api> {
	return {
		id: "claude-opus-5",
		name: "Opus",
		api: "devin-local",
		provider: "devin",
		baseUrl: "https://server.codeium.com",
		reasoning: false,
		input: ["text"],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 1000,
		maxTokens: 100,
		...overrides,
	} as unknown as Model<Api>;
}

const context = normalizeContext({
	systemPrompt: "sys",
	messages: [{ role: "user", content: "hi", timestamp: 1 }],
	tools: [],
});
const ok = () => streamResponse([rawFrame(0, encodeString(3, "ok")), eosFrame()]);
const run = (options: Partial<SimpleStreamOptions> = {}, model = makeModel()): Promise<AssistantMessage> =>
	streamDevin(model, context, { apiKey: API_KEY, ...options } as SimpleStreamOptions).result();
const unauthorized = () => new Response('{"code":"unauthenticated","message":"jwt expired"}', { status: 401 });

beforeEach(() => {
	vi.stubEnv("DEVIN_CLI", writeFakeDevin(tempDir()));
	vi.stubEnv("HOME", tempDir());
	vi.stubEnv(ENV_AGENT_DIR, tempDir());
	vi.stubEnv("DEVIN_LLM_API_KEY", "");
});

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
	clearCachedUserJwt();
	clearClientIdentityCache();
});

describe("completion parameters from the stream options", () => {
	it("defaults max_tokens to the model's max output and keeps max_newlines fixed", async () => {
		const calls = stubDevinFetch(ok);
		await run();
		const config = completionConfig(calls[1]);
		expect(config.get(2)).toBe(100n);
		expect(config.get(3)).toBe(128_000n);
	});

	it("uses options.maxTokens, clamped to the context window", async () => {
		let calls = stubDevinFetch(ok);
		await run({ maxTokens: 400 });
		expect(completionConfig(calls[1]).get(2)).toBe(400n);
		clearCachedUserJwt();
		calls = stubDevinFetch(ok);
		await run({ maxTokens: 50_000 });
		expect(completionConfig(calls[1]).get(2)).toBe(1000n);
	});

	it("passes temperature (never 0), samplingParams top_p and tool_choice", async () => {
		const calls = stubDevinFetch(ok);
		await run({ temperature: 0, samplingParams: { top_p: 0.4 }, toolChoice: "none" });
		const config = completionConfig(calls[1]);
		expect((config.get(5) as Buffer).readDoubleLE(0)).toBe(0.001);
		expect((config.get(8) as Buffer).readDoubleLE(0)).toBe(0.4);
		const choice = chatRequestFields(calls[1]).find((f) => f.num === 12)?.value as Buffer;
		expect(choice.subarray(2).toString()).toBe("none");
	});

	it("ignores a non-numeric top_p", async () => {
		const calls = stubDevinFetch(ok);
		await run({ samplingParams: { top_p: "high" } });
		expect((completionConfig(calls[1]).get(8) as Buffer).readDoubleLE(0)).toBe(1);
	});
});

describe("images", () => {
	const imageContext = normalizeContext({
		systemPrompt: "s",
		messages: [
			{
				role: "user",
				content: [
					{ type: "text", text: "look" },
					{ type: "image", data: "AAAA", mimeType: "image/png" },
				],
				timestamp: 1,
			},
		],
		tools: [],
	});

	it("rejects locally, without any request, when the model does not support images", async () => {
		const calls = stubDevinFetch(ok);
		const message = await streamDevin(makeModel(), imageContext, { apiKey: API_KEY }).result();
		expect(message.stopReason).toBe("error");
		expect(message.errorMessage).toContain("does not accept images");
		expect(calls).toHaveLength(0);
	});

	it("sends the image when the model supports it", async () => {
		const calls = stubDevinFetch(ok);
		const message = await streamDevin(makeModel({ input: ["text", "image"] }), imageContext, {
			apiKey: API_KEY,
		}).result();
		expect(message.stopReason).toBe("stop");
		expect(calls).toHaveLength(2);
	});

	// Byte level: the image reaches the wire as prompt (#3) > image_data (#10) = base64 (#1) + mime (#2), next to the text.
	it("puts the image bytes in the user prompt's image_data field", async () => {
		const calls = stubDevinFetch(ok);
		await streamDevin(makeModel({ input: ["text", "image"] }), imageContext, { apiKey: API_KEY }).result();
		const prompt = chatRequestFields(calls[1]).find((f) => f.num === 3)?.value as Buffer;
		const fields = [...iterFields(prompt)];
		const image = [...iterFields(fields.find((f) => f.num === 10)?.value as Buffer)];
		expect(image.map((f) => [f.num, (f.value as Buffer).toString()])).toEqual([
			[1, "AAAA"],
			[2, "image/png"],
		]);
		expect((fields.find((f) => f.num === 3)?.value as Buffer).toString()).toBe("look");
	});
});

describe("credentials", () => {
	it("falls back to DEVIN_LLM_API_KEY when the options carry no key", async () => {
		vi.stubEnv("DEVIN_LLM_API_KEY", " devin-session-token$fromenv000000 ");
		const calls = stubDevinFetch(ok);
		const message = await streamDevin(makeModel(), context).result();
		expect(message.stopReason).toBe("stop");
		expect(Buffer.from(calls[0].init.body as Uint8Array).includes("devin-session-token$fromenv000000")).toBe(true);
	});

	it("names both ways to sign in when there is none", async () => {
		vi.stubEnv("DEVIN_LLM_API_KEY", "");
		expect((await streamDevin(makeModel(), context).result()).errorMessage).toBe(
			"No Devin credentials. Run /login devin, or set DEVIN_LLM_API_KEY.",
		);
	});
});

describe("time limits and cancellation", () => {
	it("the first-byte limit is 60 s, separate from the 120 s idle limit", () => {
		expect(FIRST_BYTE_TIMEOUT_MS).toBe(60_000);
	});

	it("does not send a request that was cancelled before it started", async () => {
		const calls = stubDevinFetch(ok);
		const controller = new AbortController();
		controller.abort();
		const message = await run({ signal: controller.signal });
		expect(message.stopReason).toBe("aborted");
		expect(calls).toHaveLength(0);
	});

	it("gives up when the response headers never arrive within the first-byte limit", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async (url: string, init: RequestInit) => {
				if (url.endsWith("GetUserJwt")) return jwtResponse(jwtWithExp(Math.floor(Date.now() / 1000) + 3600));
				return new Promise<Response>((_resolve, reject) => {
					init.signal?.addEventListener("abort", () => reject(new Error("aborted by signal")));
				});
			}),
		);
		const consume = async () => {
			for await (const _ of streamChatEvents({
				apiKey: API_KEY,
				modelUid: "m",
				messages: [],
				firstByteTimeoutMs: 20,
			})) {
				// drained
			}
		};
		await expect(consume()).rejects.toThrow(/did not answer within 0s \(timeout\)/);
	});

	it("gives up when headers arrive but the body stays silent", async () => {
		stubDevinFetch(() => new Response(new ReadableStream<Uint8Array>({ start() {} }), { status: 200 }));
		const consume = async () => {
			for await (const _ of streamChatEvents({
				apiKey: API_KEY,
				modelUid: "m",
				messages: [],
				firstByteTimeoutMs: 20,
			})) {
				// drained
			}
		};
		await expect(consume()).rejects.toThrow(/sent no response within 0s \(timeout\)/);
	});

	it("a mid-stream stall reaches nycode as a retryable error", async () => {
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
		const error = await consume().then(
			() => new Error("expected a stall"),
			(caught: Error) => caught,
		);
		expect(error.message).toBe("Devin stream stalled for 0s (timeout)");
		expect(isRetryableAssistantError({ stopReason: "error", errorMessage: error.message } as AssistantMessage)).toBe(
			true,
		);
	});

	it("an oversized error body is cut instead of buffered", async () => {
		stubDevinFetch(() => new Response("x".repeat(200_000), { status: 502 }));
		const message = await run();
		expect(message.stopReason).toBe("error");
		expect(message.errorMessage?.length ?? 0).toBeLessThan(2000);
	});

	it("a first-byte timeout reaches nycode as a retryable error", async () => {
		const error = await (async () => {
			stubDevinFetch(() => new Response(new ReadableStream<Uint8Array>({ start() {} }), { status: 200 }));
			try {
				for await (const _ of streamChatEvents({
					apiKey: API_KEY,
					modelUid: "m",
					messages: [],
					firstByteTimeoutMs: 20,
				})) {
					// drained
				}
			} catch (caught) {
				return caught as Error;
			}
			throw new Error("expected a timeout");
		})();
		expect(isRetryableAssistantError({ stopReason: "error", errorMessage: error.message } as AssistantMessage)).toBe(
			true,
		);
	});
});

describe("JWT refresh on 401", () => {
	it("on HTTP 401 clears the cached JWT, mints again and repeats the request once", async () => {
		let chats = 0;
		const calls = stubDevinFetch(() => (chats++ === 0 ? unauthorized() : ok()));
		const message = await run();
		expect(message.stopReason).toBe("stop");
		expect(calls.map((c) => c.url.split("/").pop())).toEqual([
			"GetUserJwt",
			"GetChatMessage",
			"GetUserJwt",
			"GetChatMessage",
		]);
	});

	it("on an unauthenticated trailer before any event does the same", async () => {
		let chats = 0;
		const calls = stubDevinFetch(() =>
			chats++ === 0 ? streamResponse([eosFrame('{"error":{"code":"unauthenticated","message":"expired"}}')]) : ok(),
		);
		expect((await run()).stopReason).toBe("stop");
		expect(calls).toHaveLength(4);
	});

	it("a second 401 is an auth error that says to run /login devin, with no further requests", async () => {
		const calls = stubDevinFetch(unauthorized);
		const message = await run();
		expect(message.stopReason).toBe("error");
		expect(message.errorMessage).toContain("/login devin");
		expect(calls.filter((c) => c.url.endsWith("GetChatMessage"))).toHaveLength(2);
		expect(isRetryableAssistantError(message)).toBe(false);
	});

	it("does not repeat a request that already produced output", async () => {
		const calls = stubDevinFetch(() =>
			streamResponse([
				rawFrame(0, encodeString(3, "partial")),
				eosFrame('{"error":{"code":"unauthenticated","message":"late"}}'),
			]),
		);
		expect((await run()).stopReason).toBe("error");
		expect(calls.filter((c) => c.url.endsWith("GetChatMessage"))).toHaveLength(1);
	});

	it("a bare 403 permission_denied is not treated as a stale token", async () => {
		const calls = stubDevinFetch(
			() => new Response('{"code":"permission_denied","message":"nope"}', { status: 403 }),
		);
		expect((await run()).stopReason).toBe("error");
		expect(calls.filter((c) => c.url.endsWith("GetChatMessage"))).toHaveLength(1);
	});
});

describe("error messages and the nycode retry classifier", () => {
	const failWith = (response: () => Response) => {
		stubDevinFetch(response);
		return run();
	};
	const trailer = (error: object) => streamResponse([eosFrame(JSON.stringify({ error }))]);

	it("quota is not retried and carries the usage URL, the server text and the trace ID", async () => {
		const message = await failWith(() =>
			trailer({
				code: "failed_precondition",
				message: "Your weekly usage quota has been exhausted. (trace ID: abc123)",
			}),
		);
		expect(message.errorMessage).toContain("quota exceeded");
		expect(message.errorMessage).toContain("https://app.devin.ai/settings/usage");
		expect(message.errorMessage).toContain("weekly usage quota has been exhausted");
		expect(message.errorMessage).toContain("trace ID: abc123");
		expect(isRetryableAssistantError(message)).toBe(false);
	});

	it("'version is out of date' with the CLI identity is a quota hint and is not retried", async () => {
		const message = await failWith(() =>
			trailer({ message: "Your Windsurf version is out of date. Please update to the latest version to continue." }),
		);
		expect(message.errorMessage).toMatch(/quota/);
		expect(message.errorMessage).toContain("https://app.devin.ai/settings/usage");
		expect(isRetryableAssistantError(message)).toBe(false);
	});

	it("'version is out of date' with the Windsurf fallback names the rejected identity and is not retried", async () => {
		vi.stubEnv("DEVIN_CLI", "/nonexistent/devin");
		vi.stubEnv("HOME", tempDir());
		const message = await failWith(() =>
			trailer({ message: "Your Windsurf version is out of date. Please update to the latest version to continue." }),
		);
		expect(message.errorMessage).toContain("fallback client identity");
		expect(message.errorMessage).toContain("Install the Devin CLI");
		expect(isRetryableAssistantError(message)).toBe(false);
	});

	it("transient failures are retried", async () => {
		for (const response of [
			() => trailer({ code: "unavailable", message: "try again" }),
			() => new Response("bad gateway", { status: 502 }),
			() => trailer({ message: "an internal error occurred (trace ID: 12ab)" }),
		]) {
			expect(isRetryableAssistantError(await failWith(response))).toBe(true);
		}
	});

	it("permanent failures are not retried", async () => {
		for (const response of [
			() => trailer({ code: "permission_denied", message: "This model is no longer available for your account" }),
			() => trailer({ code: "permission_denied", message: "an internal error occurred" }),
			() => trailer({ code: "invalid_argument", message: "an internal error occurred" }),
			() => trailer({ code: "permission_denied", message: "blocked by our content policy" }),
			() => new Response('{"code":"unauthenticated","message":"x"}', { status: 401 }),
		]) {
			expect(isRetryableAssistantError(await failWith(response))).toBe(false);
		}
	});
});

describe("host", () => {
	const hostsOf = (calls: Array<{ url: string }>) => [...new Set(calls.map((c) => new URL(c.url).origin))];

	it("uses the default host without a tenant", async () => {
		const calls = stubDevinFetch(ok);
		await run();
		expect(hostsOf(calls)).toEqual(["https://server.codeium.com"]);
	});

	it("uses a valid api_server_url from the Devin CLI credentials for JWT and chat", async () => {
		writeCredentialsFile(process.env.HOME as string, API_KEY);
		const path = `${process.env.HOME}/.local/share/devin/credentials.toml`;
		writeFileSync(path, `windsurf_api_key = "${API_KEY}"\napi_server_url = "https://acme.windsurf.com"\n`);
		const calls = stubDevinFetch(ok);
		await run();
		expect(hostsOf(calls)).toEqual(["https://acme.windsurf.com"]);
	});

	it("ignores a tenant that is not https on a Cognition domain", async () => {
		writeCredentialsFile(process.env.HOME as string, API_KEY);
		const path = `${process.env.HOME}/.local/share/devin/credentials.toml`;
		for (const bad of [
			"http://acme.windsurf.com",
			"https://evil.example",
			"https://codeium.com.evil.example",
			"https://x.windsurf.com:8443",
		]) {
			writeFileSync(path, `windsurf_api_key = "${API_KEY}"\napi_server_url = "${bad}"\n`);
			clearCachedUserJwt();
			const calls = stubDevinFetch(ok);
			await run();
			expect(hostsOf(calls)).toEqual(["https://server.codeium.com"]);
		}
	});

	it("uses the tenant of a PKCE sign-in for every call", async () => {
		writeSessionState({ source: "browser", host: "https://team.devin.ai" });
		const calls = stubDevinFetch(ok);
		await run();
		expect(hostsOf(calls)).toEqual(["https://team.devin.ai"]);
	});
});
