import { chmodSync, writeFileSync } from "node:fs";
import { connect } from "node:net";
import { join } from "node:path";
import type { OAuthLoginCallbacks } from "@nycode/ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ENV_AGENT_DIR } from "../../../src/config.ts";
import { resolveApiHost, resolveHostInfo, validateApiHost } from "../../../src/extensions/devin/auth/host.ts";
import { AUTH_API_URL, exchangeCode, TOKEN_PREFIX } from "../../../src/extensions/devin/auth/login/exchange.ts";
import { runLogin } from "../../../src/extensions/devin/auth/login/flow.ts";
import { CALLBACK_PATH, startCallbackServer } from "../../../src/extensions/devin/auth/login/loopback.ts";
import { authorizeUrl, challengeFor, randomToken } from "../../../src/extensions/devin/auth/login/pkce.ts";
import {
	readSessionState,
	sessionStatePath,
	writeSessionState,
} from "../../../src/extensions/devin/auth/login/session.ts";
import { API_KEY, tempDir, writeCredentialsFile, writeFakeDevin } from "../helpers.ts";

const realFetch = globalThis.fetch;

beforeEach(() => {
	vi.stubEnv(ENV_AGENT_DIR, tempDir());
	vi.stubEnv("HOME", tempDir());
	vi.stubEnv("DEVIN_DESKTOP_STATE_DB", join(tempDir(), "absent.vscdb"));
	vi.stubEnv("DEVIN_CLI", join(tempDir(), "no-cli"));
});

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe("PKCE helpers", () => {
	it("derives the S256 challenge of the RFC 7636 example", () => {
		expect(challengeFor("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe(
			"E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
		);
	});

	it("generates distinct 43-character base64url tokens", () => {
		const [a, b] = [randomToken(), randomToken()];
		expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
		expect(a).not.toBe(b);
	});

	it("builds the sign-in URL with S256, with or without a redirect", () => {
		const url = new URL(authorizeUrl({ state: "st", challenge: "ch", redirectUri: "http://127.0.0.1:5/callback" }));
		expect(`${url.origin}${url.pathname}`).toBe("https://app.devin.ai/auth/cli/continue");
		expect(Object.fromEntries(url.searchParams)).toEqual({
			redirect_uri: "http://127.0.0.1:5/callback",
			state: "st",
			prompt: "select_account",
			code_challenge: "ch",
			code_challenge_method: "S256",
		});
		expect(new URL(authorizeUrl({ state: "st", challenge: "ch" })).searchParams.has("redirect_uri")).toBe(false);
	});
});

describe("loopback server", () => {
	it("answers only /callback with the right state and resolves the code", async () => {
		const server = await startCallbackServer("good");
		const base = new URL(server.redirectUri);
		expect(base.hostname).toBe("127.0.0.1");
		expect(base.pathname).toBe(CALLBACK_PATH);
		const hit = (path: string) => realFetch(`${base.origin}${path}`).then((r) => r.status);
		expect(await hit("/other")).toBe(404);
		expect(await hit(`${CALLBACK_PATH}?state=bad&code=x`)).toBe(400);
		expect(await hit(`${CALLBACK_PATH}?state=good`)).toBe(400);
		expect(await hit(`${CALLBACK_PATH}?state=good&code=the-code`)).toBe(200);
		await expect(server.code).resolves.toBe("the-code");
		server.close();
	});

	it("answers 400 to a malformed request target instead of throwing", async () => {
		const server = await startCallbackServer("good");
		const port = Number(new URL(server.redirectUri).port);
		const answer = await new Promise<string>((resolve, reject) => {
			const socket = connect(port, "127.0.0.1", () =>
				socket.write("GET http://[ HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n"),
			);
			let data = "";
			socket.on("data", (chunk) => {
				data += chunk;
			});
			socket.on("end", () => resolve(data));
			socket.on("error", reject);
		});
		expect(answer).toMatch(/^HTTP\/1\.1 400/);
		// still serving
		expect(await realFetch(`${new URL(server.redirectUri).origin}/other`).then((r) => r.status)).toBe(404);
		server.close();
	});

	it("rejects the code on timeout and on close", async () => {
		const timed = await startCallbackServer("s", 20);
		await expect(timed.code).rejects.toThrow("timed out");
		const closed = await startCallbackServer("s");
		closed.close();
		await expect(closed.code).rejects.toThrow("cancelled");
		closed.close(); // idempotent
	});
});

describe("code exchange", () => {
	const stubExchange = (response: Response | Error) => {
		const fetchMock = vi.fn(async () => {
			if (response instanceof Error) throw response;
			return response;
		});
		vi.stubGlobal("fetch", fetchMock);
		return fetchMock;
	};

	it("posts {code, code_verifier} and returns the token in stored form", async () => {
		const fetchMock = stubExchange(new Response(JSON.stringify({ token: "tok123" }), { status: 200 }));
		const result = await exchangeCode("the-code", "the-verifier");
		expect(result).toEqual({ apiKey: `${TOKEN_PREFIX}tok123` });
		const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe(`${AUTH_API_URL}/auth/cli/token`);
		expect(JSON.parse(init.body as string)).toEqual({ code: "the-code", code_verifier: "the-verifier" });
		expect(init.redirect).toBe("error");
	});

	it("keeps a tenant host only when it is valid", async () => {
		stubExchange(
			new Response(JSON.stringify({ token: "t", api_server_url: "https://acme.devin.ai" }), { status: 200 }),
		);
		expect((await exchangeCode("c", "v")).host).toBe("https://acme.devin.ai");
		stubExchange(
			new Response(JSON.stringify({ token: "t", api_server_url: "https://evil.example" }), { status: 200 }),
		);
		expect(await exchangeCode("c", "v")).toEqual({ apiKey: `${TOKEN_PREFIX}t` });
	});

	it("fails without leaking the code, on HTTP errors, missing tokens, bad bodies and network errors", async () => {
		stubExchange(new Response(JSON.stringify({ message: "code expired" }), { status: 400 }));
		await expect(exchangeCode("secret-code", "v")).rejects.toThrow("HTTP 400): code expired");
		stubExchange(new Response("plain failure", { status: 500 }));
		await expect(exchangeCode("secret-code", "v")).rejects.toThrow("plain failure");
		stubExchange(new Response("{}", { status: 200 }));
		await expect(exchangeCode("c", "v")).rejects.toThrow("no token");
		stubExchange(new Response("not json", { status: 200 }));
		await expect(exchangeCode("c", "v")).rejects.toThrow("no token");
		stubExchange(new Response("[1]", { status: 200 }));
		await expect(exchangeCode("c", "v")).rejects.toThrow("no token");
		stubExchange(new Error("socket closed"));
		const error = (await exchangeCode("secret-code", "v").catch((e: Error) => e)) as Error;
		expect(error.message).toContain("socket closed");
		expect(error.message).not.toContain("secret-code");
	});
});

describe("sign-in state and host", () => {
	it("round-trips the session state and ignores damaged files", () => {
		expect(readSessionState()).toBeNull();
		writeSessionState({ source: "browser", host: "https://a.devin.ai" });
		expect(readSessionState()).toEqual({ source: "browser", host: "https://a.devin.ai" });
		writeSessionState({ source: "cli" });
		expect(readSessionState()).toEqual({ source: "cli" });
		for (const bad of ["{nope", "null", '{"source":"other"}', '{"source":3}']) {
			writeFileSync(sessionStatePath(), bad);
			expect(readSessionState()).toBeNull();
		}
	});

	it.each([
		["https://server.codeium.com", "https://server.codeium.com"],
		["https://acme.windsurf.com/some/path?x=1", "https://acme.windsurf.com"],
		["https://team.devin.ai", "https://team.devin.ai"],
		["https://a.b.c.d.codeium.com", "https://a.b.c.d.codeium.com"],
		["https://SERVER.Codeium.com", "https://server.codeium.com"],
	])("accepts %s", (raw, origin) => {
		expect(validateApiHost(raw)).toBe(origin);
	});

	it.each([
		"http://server.codeium.com",
		"https://evil.example",
		"https://codeium.com.evil.example",
		"https://notcodeium.com",
		"https://codeium.com",
		"https://user:pw@server.codeium.com",
		"https://server.codeium.com:8443",
		"https://a.b.c.d.e.codeium.com",
		"https://evil.codeium.com.example",
		"https://under_score.codeium.com",
		"not a url",
		"",
	])("rejects %s", (raw) => {
		expect(validateApiHost(raw)).toBeNull();
	});

	it("resolves: default, CLI credentials, then a PKCE sign-in; reports refused hosts", () => {
		expect(resolveHostInfo()).toEqual({ host: "https://server.codeium.com", source: "default" });
		const path = writeCredentialsFile(process.env.HOME as string, API_KEY);
		writeFileSync(path, `windsurf_api_key = "${API_KEY}"\napi_server_url = "https://acme.windsurf.com"\n`);
		expect(resolveHostInfo()).toEqual({ host: "https://acme.windsurf.com", source: "cli-credentials" });
		writeFileSync(path, `windsurf_api_key = "${API_KEY}"\napi_server_url = "https://evil.example"\n`);
		expect(resolveHostInfo()).toEqual({
			host: "https://server.codeium.com",
			source: "default",
			ignored: "https://evil.example",
		});
		writeSessionState({ source: "browser", host: "https://team.devin.ai" });
		expect(resolveApiHost()).toBe("https://team.devin.ai");
		expect(resolveHostInfo().source).toBe("login");
		writeSessionState({ source: "browser", host: "https://evil.example" });
		expect(resolveHostInfo()).toMatchObject({ host: "https://server.codeium.com", ignored: "https://evil.example" });
	});
});

describe("runLogin", () => {
	function callbacks(choice: string | undefined, extra: Partial<OAuthLoginCallbacks> = {}) {
		const onSelect = vi.fn(async () => choice);
		const onAuth = vi.fn();
		return { onSelect, onAuth, cb: { onSelect, onAuth, ...extra } as unknown as OAuthLoginCallbacks };
	}

	it("offers the CLI option only when the Devin CLI is installed", async () => {
		const without = callbacks("code", { onPrompt: async () => "c" });
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response(JSON.stringify({ token: "t" }), { status: 200 })),
		);
		await runLogin(without.cb);
		const ids = (without.onSelect.mock.calls[0] as unknown as [{ options: Array<{ id: string }> }])[0].options.map(
			(o) => o.id,
		);
		expect(ids).toEqual(["browser", "code"]);

		vi.stubEnv("DEVIN_CLI", writeFakeDevin(tempDir(), { loggedIn: true }));
		const withCli = callbacks("code", { onPrompt: async () => "c" });
		await runLogin(withCli.cb);
		const ids2 = (withCli.onSelect.mock.calls[0] as unknown as [{ options: Array<{ id: string }> }])[0].options.map(
			(o) => o.id,
		);
		expect(ids2).toEqual(["cli", "browser", "code"]);
	});

	it("cancels when the user picks nothing", async () => {
		await expect(runLogin(callbacks(undefined).cb)).rejects.toThrow("cancelled");
	});

	it("paste-code login: shows a link without redirect, exchanges the pasted code with the matching verifier", async () => {
		let body: { code: string; code_verifier: string } | undefined;
		vi.stubGlobal(
			"fetch",
			vi.fn(async (_url: string, init: RequestInit) => {
				body = JSON.parse(init.body as string);
				return new Response(JSON.stringify({ token: "tok" }), { status: 200 });
			}),
		);
		const { cb, onAuth } = callbacks("code", { onPrompt: async () => "  pasted  " });
		const outcome = await runLogin(cb);
		expect(outcome).toEqual({ apiKey: `${TOKEN_PREFIX}tok`, source: "code" });
		const url = new URL((onAuth.mock.calls[0] as unknown as [{ url: string }])[0].url);
		expect(url.searchParams.has("redirect_uri")).toBe(false);
		expect(body?.code).toBe("pasted");
		expect(challengeFor(body?.code_verifier as string)).toBe(url.searchParams.get("code_challenge"));
		await expect(runLogin(callbacks("code", { onPrompt: async () => "   " }).cb)).rejects.toThrow(
			"needs the pasted code",
		);
	});

	it("browser login: loopback redirect with the state, then the exchange", async () => {
		let exchanged: { code: string; code_verifier: string } | undefined;
		vi.stubGlobal(
			"fetch",
			vi.fn(async (url: string, init?: RequestInit) => {
				if (url.startsWith("http://127.0.0.1")) return realFetch(url, init);
				exchanged = JSON.parse(init?.body as string);
				return new Response(JSON.stringify({ token: "tok", api_server_url: "https://team.devin.ai" }), {
					status: 200,
				});
			}),
		);
		const onAuth = vi.fn((info: { url: string }) => {
			const url = new URL(info.url);
			const redirect = new URL(url.searchParams.get("redirect_uri") as string);
			redirect.searchParams.set("state", url.searchParams.get("state") as string);
			redirect.searchParams.set("code", "browser-code");
			void realFetch(redirect);
		});
		const cb = { onSelect: async () => "browser", onAuth } as unknown as OAuthLoginCallbacks;
		expect(await runLogin(cb)).toEqual({
			apiKey: `${TOKEN_PREFIX}tok`,
			source: "browser",
			host: "https://team.devin.ai",
		});
		expect(exchanged?.code).toBe("browser-code");
	});

	it("browser login can be cancelled through the abort signal", async () => {
		const controller = new AbortController();
		const cb = {
			onSelect: async () => "browser",
			onAuth: () => queueMicrotask(() => controller.abort()),
			signal: controller.signal,
		} as unknown as OAuthLoginCallbacks;
		await expect(runLogin(cb)).rejects.toThrow("cancelled");
		const already = new AbortController();
		already.abort();
		await expect(
			runLogin({
				onSelect: async () => "browser",
				onAuth: () => {},
				signal: already.signal,
			} as unknown as OAuthLoginCallbacks),
		).rejects.toThrow("cancelled");
	});

	it("CLI login reuses the CLI sign-in and reports its source", async () => {
		vi.stubEnv("DEVIN_CLI", writeFakeDevin(tempDir(), { loggedIn: true }));
		writeCredentialsFile(process.env.HOME as string, API_KEY);
		const outcome = await runLogin(callbacks("cli").cb);
		expect(outcome).toEqual({ apiKey: API_KEY, source: "cli" });
		chmodSync(process.env.DEVIN_CLI as string, 0o755);
	});
});
