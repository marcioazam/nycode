import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { OAuthLoginCallbacks } from "@nycode/ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ENV_AGENT_DIR } from "../../src/config.ts";
import { createEventBus } from "../../src/core/event-bus.ts";
import { createExtensionRuntime, loadExtensionFromFactory } from "../../src/core/extensions/loader.ts";
import type { ExtensionCommandContext, ProviderConfig } from "../../src/core/extensions/types.ts";
import { clearClientIdentityCache } from "../../src/extensions/devin/auth/identity.ts";
import { catalogCachePath, readCatalogCache, writeCatalogCache } from "../../src/extensions/devin/catalog/cache.ts";
import { FALLBACK_MODELS } from "../../src/extensions/devin/catalog/models.ts";
import devinExtension from "../../src/extensions/devin/index.ts";
import { builtInExtensions } from "../../src/extensions/index.ts";
import {
	API_KEY,
	CATALOG,
	jwtResponse,
	jwtWithExp,
	rpcCatalogResponse,
	tempDir,
	writeCredentialsFile,
	writeFakeDevin,
} from "./helpers.ts";

let agentDir: string;
let home: string;
let binDir: string;

beforeEach(() => {
	agentDir = tempDir();
	home = tempDir();
	binDir = tempDir();
	vi.stubEnv(ENV_AGENT_DIR, agentDir);
	vi.stubEnv("HOME", home);
	vi.stubEnv("DEVIN_DESKTOP_STATE_DB", join(home, "absent.vscdb"));
	vi.stubEnv("DEVIN_CLI", writeFakeDevin(binDir, { loggedIn: true }));
	const modelsFile = join(binDir, "models.json");
	writeFileSync(modelsFile, JSON.stringify(CATALOG));
	vi.stubEnv("FAKE_DEVIN_MODELS", modelsFile);
	vi.stubEnv("FAKE_DEVIN_KEY", API_KEY);
	vi.stubEnv("NYCODE_OFFLINE", "");
	vi.stubEnv("DEVIN_LLM_API_KEY", "");
	// No test may reach the real Devin API: every call fails at once, so the CLI path runs as the fallback.
	vi.stubGlobal(
		"fetch",
		vi.fn(async () => {
			throw new Error("offline");
		}),
	);
});

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

async function load() {
	const runtime = createExtensionRuntime();
	const extension = await loadExtensionFromFactory(
		devinExtension,
		process.cwd(),
		createEventBus(),
		runtime,
		"builtin:devin",
	);
	return { runtime, extension };
}

function lastConfig(runtime: Awaited<ReturnType<typeof load>>["runtime"]): ProviderConfig {
	const entries = runtime.pendingProviderRegistrations.filter((entry) => entry.name === "devin");
	return entries[entries.length - 1].config;
}

function cliCallbacks(): OAuthLoginCallbacks {
	return { onSelect: async () => "cli" } as unknown as OAuthLoginCallbacks;
}

function notifier(apiKey?: string) {
	const notify = vi.fn();
	const modelRegistry = { getApiKeyForProvider: async () => apiKey };
	return { notify, ctx: { ui: { notify }, modelRegistry } as unknown as ExtensionCommandContext };
}

describe("devin extension", () => {
	it("is a built-in registered once", () => {
		const entry = builtInExtensions.filter((e) => typeof e !== "function" && e.name === "devin");
		expect(entry).toHaveLength(1);
		expect(entry[0]).toMatchObject({ builtin: true });
	});

	it("registers the provider with the fallback models and both commands, without running the CLI", async () => {
		// The fake CLI would log if it ran; a missing binary would throw. Neither happens at load.
		vi.stubEnv("DEVIN_CLI", join(binDir, "does-not-exist"));
		const { runtime, extension } = await load();
		const config = lastConfig(runtime);
		expect(config).toMatchObject({ name: "Devin Local", api: "devin-local", baseUrl: "https://server.codeium.com" });
		expect(config.models).toBe(FALLBACK_MODELS);
		expect(typeof config.streamSimple).toBe("function");
		expect(config.oauth?.name).toBe("Devin");
		expect(config.apiKey).toBe("$DEVIN_LLM_API_KEY");
		expect([...extension.commands.keys()].sort()).toEqual(["devin-refresh", "devin-status"]);
	});

	it("registers cached models at startup, and falls back when the cache is corrupt", async () => {
		writeCatalogCache(CATALOG);
		let { runtime } = await load();
		expect(lastConfig(runtime).models?.map((m) => m.id)).toEqual(["claude-opus-5"]);
		writeFileSync(catalogCachePath(), "{not json");
		({ runtime } = await load());
		expect(lastConfig(runtime).models).toBe(FALLBACK_MODELS);
	});

	it("logs in through the CLI, keeps the key in the credential, and refreshes the catalog", async () => {
		writeCredentialsFile(home, API_KEY);
		const { runtime } = await load();
		const oauth = lastConfig(runtime).oauth;
		const credentials = await oauth?.login(cliCallbacks());
		expect(credentials).toMatchObject({ refresh: "", access: API_KEY });
		expect(credentials?.expires).toBeGreaterThan(Date.now());
		expect(oauth?.getApiKey(credentials!)).toBe(API_KEY);
		expect((await oauth?.refreshToken(credentials!, new AbortController().signal))?.access).toBe(API_KEY);
		expect(readCatalogCache()?.catalog).toEqual(CATALOG);
		expect(lastConfig(runtime).models?.map((m) => m.id)).toEqual(["claude-opus-5"]);
		// the CLI's own file was only read
		expect(readFileSync(join(home, ".local/share/devin/credentials.toml"), "utf8")).toContain(API_KEY);
	});

	it("still logs in when the catalog refresh fails", async () => {
		writeCredentialsFile(home, API_KEY);
		vi.stubEnv("FAKE_DEVIN_FAIL", "1");
		const { runtime } = await load();
		const credentials = await lastConfig(runtime).oauth?.login(cliCallbacks());
		expect(credentials?.access).toBe(API_KEY);
		expect(lastConfig(runtime).models).toBe(FALLBACK_MODELS);
	});

	describe("catalog over the API", () => {
		const stubApi = (answer: () => Response) =>
			vi.stubGlobal(
				"fetch",
				vi.fn(async (url: string) =>
					url.endsWith("GetUserJwt") ? jwtResponse(jwtWithExp(Math.floor(Date.now() / 1000) + 3600)) : answer(),
				),
			);

		it("keeps the CLI families and ids, enriched by the API per uid, and records the source", async () => {
			stubApi(() =>
				rpcCatalogResponse([
					{ uid: "claude-opus-5-low", supportsImages: false, contextWindow: 1_000_000 },
					{ uid: "claude-opus-5-high", supportsImages: false, contextWindow: 1_000_000 },
				]),
			);
			const { runtime } = await load();
			await lastConfig(runtime).oauth?.login(cliCallbacks());
			const [model] = lastConfig(runtime).models ?? [];
			expect(model).toMatchObject({ id: "claude-opus-5", input: ["text"], contextWindow: 500000 });
			expect(readCatalogCache()?.source).toBe("cli+rpc");
		});

		it("falls back to the API-derived families, with CLI-style slugs, when the CLI fails", async () => {
			vi.stubEnv("FAKE_DEVIN_FAIL", "1");
			stubApi(() =>
				rpcCatalogResponse([
					{ uid: "rpc-model-4-6-low" },
					{ uid: "rpc-model-4-6-high" },
					{ uid: "gone-high", disabled: true },
				]),
			);
			const { runtime } = await load();
			await lastConfig(runtime).oauth?.login(cliCallbacks());
			expect(lastConfig(runtime).models?.map((m) => m.id)).toContain("rpc-model-4.6");
			expect(readCatalogCache()?.source).toBe("rpc");
		});

		it("falls back to the CLI when the API answers with no models, and says so when both fail", async () => {
			writeCredentialsFile(home, API_KEY);
			stubApi(() => rpcCatalogResponse([]));
			const { extension } = await load();
			const n = notifier(API_KEY);
			await extension.commands.get("devin-refresh")?.handler("", n.ctx);
			expect(readCatalogCache()?.source).toBe("cli");
			vi.stubEnv("FAKE_DEVIN_FAIL", "1");
			await extension.commands.get("devin-refresh")?.handler("", n.ctx);
			expect(n.notify).toHaveBeenLastCalledWith(expect.stringMatching(/Devin API: .*; Devin CLI: /), "error");
		});

		it("refreshes a stale cache in the background on first use, once, over the API only", async () => {
			writeCatalogCache(CATALOG, undefined, 1, "cli");
			stubApi(() => rpcCatalogResponse([{ uid: "claude-opus-5-high", supportsImages: true }]));
			const { runtime } = await load();
			const stream = lastConfig(runtime).streamSimple;
			const model = { ...lastConfig(runtime).models?.[0], api: "devin-local", provider: "devin" } as never;
			const context = { systemPrompt: "", messages: [], tools: [] } as never;
			stream?.(model, context, { apiKey: API_KEY } as never);
			await vi.waitFor(() => expect(readCatalogCache()?.source).toBe("cli+rpc"));
			expect(lastConfig(runtime).models?.map((m) => m.id)).toEqual(["claude-opus-5"]);
			stream?.(model, context, { apiKey: API_KEY } as never);
		});
	});

	it("/devin-refresh during the background refresh waits for it and then runs the full CLI refresh", async () => {
		writeCatalogCache(CATALOG, undefined, 1, "cli");
		let release: () => void = () => {};
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		vi.stubGlobal(
			"fetch",
			vi.fn(async (url: string) => {
				if (url.endsWith("GetUserJwt")) return jwtResponse(jwtWithExp(Math.floor(Date.now() / 1000) + 3600));
				await gate;
				return rpcCatalogResponse([{ uid: "claude-opus-5-high" }]);
			}),
		);
		const { runtime, extension } = await load();
		const model = { ...lastConfig(runtime).models?.[0], api: "devin-local", provider: "devin" } as never;
		lastConfig(runtime).streamSimple?.(
			model,
			{ systemPrompt: "", messages: [], tools: [] } as never,
			{
				apiKey: API_KEY,
			} as never,
		);
		const n = notifier(API_KEY);
		let done = false;
		const refreshing = extension.commands.get("devin-refresh")?.handler("", n.ctx);
		void refreshing?.then(() => {
			done = true;
		});
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(done).toBe(false);
		release();
		await refreshing;
		// the CLI ran (family list from it) and the API enriched it: not the API-only background result
		expect(n.notify).toHaveBeenCalledWith(expect.stringMatching(/Devin CLI \+ API|local CLI/), "info");
		expect(readCatalogCache()?.source).toBe("cli+rpc");
	});

	it("/devin-refresh reports success, CLI failures, unusable catalogs and offline mode", async () => {
		const { extension } = await load();
		const refresh = extension.commands.get("devin-refresh");
		let n = notifier();
		await refresh?.handler("", n.ctx);
		expect(n.notify).toHaveBeenCalledWith(
			"Devin: loaded 1 models from the local CLI. Devin API: no Devin API key",
			"info",
		);
		// concurrent refreshes share one run
		n = notifier();
		await Promise.all([refresh?.handler("", n.ctx), refresh?.handler("", n.ctx)]);
		expect(n.notify).toHaveBeenCalledTimes(2);

		vi.stubEnv("FAKE_DEVIN_FAIL", "1");
		n = notifier();
		await refresh?.handler("", n.ctx);
		expect(n.notify).toHaveBeenCalledWith(expect.stringContaining("Devin refresh failed: boom"), "error");
		vi.stubEnv("FAKE_DEVIN_FAIL", "");

		writeFileSync(join(binDir, "models.json"), JSON.stringify({ families: [] }));
		n = notifier();
		await refresh?.handler("", n.ctx);
		expect(n.notify).toHaveBeenCalledWith(expect.stringContaining("no usable model families"), "error");

		vi.stubEnv("NYCODE_OFFLINE", "1");
		n = notifier();
		await refresh?.handler("", n.ctx);
		expect(n.notify).toHaveBeenCalledWith(expect.stringContaining("NYCODE_OFFLINE"), "error");
	});

	it("/devin-status reports binary, login and catalog state", async () => {
		writeCredentialsFile(home, API_KEY);
		const { extension } = await load();
		const status = extension.commands.get("devin-status");
		let n = notifier();
		await status?.handler("", n.ctx);
		let text = n.notify.mock.calls[0][0] as string;
		expect(text).toContain("CLI version: devin 1.2.3");
		expect(text).toContain("CLI credentials:");
		expect(text).toContain("Catalog: not cached yet");
		expect(text).toContain("Auth: Devin CLI credentials found");
		expect(n.notify.mock.calls[0][1]).toBe("info");

		writeCatalogCache(CATALOG, catalogCachePath(), Date.now() - 7 * 60 * 60 * 1000);
		n = notifier();
		await status?.handler("", n.ctx);
		expect(n.notify.mock.calls[0][0]).toContain("(stale; run /devin-refresh)");
		writeCatalogCache(CATALOG);
		n = notifier();
		await status?.handler("", n.ctx);
		expect(n.notify.mock.calls[0][0]).toMatch(/Catalog: .*cached \d+ min ago$/m);
		writeCatalogCache(CATALOG, catalogCachePath(), Date.now(), "cli", "Devin API: returned no models");
		n = notifier();
		await status?.handler("", n.ctx);
		expect(n.notify.mock.calls[0][0]).toContain("Devin CLI (API unavailable: Devin API: returned no models)");
		writeCatalogCache(CATALOG, catalogCachePath(), Date.now(), "cli+rpc");
		n = notifier();
		await status?.handler("", n.ctx);
		expect(n.notify.mock.calls[0][0]).toContain("Catalog: Devin CLI + API enrichment, cached");
		writeCatalogCache(CATALOG, catalogCachePath(), Date.now(), "rpc");
		n = notifier();
		await status?.handler("", n.ctx);
		expect(n.notify.mock.calls[0][0]).toContain("Catalog: Devin API only (no CLI), cached");
		writeFileSync(catalogCachePath(), "{bad");
		n = notifier();
		await status?.handler("", n.ctx);
		expect(n.notify.mock.calls[0][0]).toContain("cache unreadable");

		vi.stubEnv("DEVIN_CLI", join(binDir, "gone"));
		vi.stubEnv("HOME", tempDir());
		n = notifier();
		await status?.handler("", n.ctx);
		text = n.notify.mock.calls[0][0] as string;
		expect(text).toMatch(/CLI: (not found|\/)/);
		clearClientIdentityCache();
		n = notifier();
		await status?.handler("", n.ctx);
		text = n.notify.mock.calls[0][0] as string;
		if (text.includes("CLI: not found"))
			expect(text).toContain("Identity: windsurf 2.0.0 (fallback: no Devin CLI found)");
	});
});
