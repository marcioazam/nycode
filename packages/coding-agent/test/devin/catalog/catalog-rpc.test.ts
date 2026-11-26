import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearClientIdentityCache } from "../../../src/extensions/devin/auth/identity.ts";
import { clearCachedUserJwt } from "../../../src/extensions/devin/auth/jwt.ts";
import { isUsableCatalog } from "../../../src/extensions/devin/catalog/cache.ts";
import { splitEffortSuffix } from "../../../src/extensions/devin/catalog/effort.ts";
import { modelsFromCatalog } from "../../../src/extensions/devin/catalog/models.ts";
import { catalogFromRpc, decodeModelConfigs, fetchRpcCatalog } from "../../../src/extensions/devin/catalog/rpc.ts";
import { normalizeSlug } from "../../../src/extensions/devin/catalog/slug.ts";
import { DevinError } from "../../../src/extensions/devin/errors/failure.ts";
import { iterFields } from "../../../src/extensions/devin/wire/proto.ts";
import {
	API_KEY,
	jwtResponse,
	jwtWithExp,
	type RpcModelInput,
	rpcCatalogResponse,
	rpcModelConfig,
	tempDir,
	writeFakeDevin,
} from "../helpers.ts";

const contract = JSON.parse(
	readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../fixtures/devin-core-contract.json"), "utf8"),
) as {
	free_lanes: string[];
	families: Record<string, string[]>;
	never_route: { suffix: string };
};

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

describe("RPC model decoding", () => {
	it("reads label, uid, disabled, supports_images, model_info limits and prices from the field numbers of the proto", () => {
		const [model] = decodeModelConfigs(
			rpcModelConfig({
				uid: "claude-opus-5-high",
				label: "Claude Opus 5 High",
				supportsImages: true,
				contextWindow: 1_000_000,
				maxOutput: 128_000,
				inputPrice: 5,
				outputPrice: 25,
			}),
		);
		expect(model).toEqual({
			uid: "claude-opus-5-high",
			label: "Claude Opus 5 High",
			disabled: false,
			supportsImages: true,
			contextWindow: 1_000_000,
			maxOutputTokens: 128_000,
			inputPrice: 5,
			outputPrice: 25,
		});
		expect(decodeModelConfigs(rpcModelConfig({ uid: "x", disabled: true }))[0]).toMatchObject({
			disabled: true,
			supportsImages: false,
		});
	});

	it("skips entries without a uid and unrelated fields", () => {
		expect(decodeModelConfigs(Buffer.concat([rpcModelConfig({ uid: "" }), Buffer.from([0x10, 0x01])]))).toEqual([]);
	});

	it("falls back to the top-level max_tokens (#18) when model_info has none", () => {
		expect(decodeModelConfigs(rpcModelConfig({ uid: "m", topLevelMaxTokens: 4242 }))[0].contextWindow).toBe(4242);
		expect(
			decodeModelConfigs(rpcModelConfig({ uid: "m", topLevelMaxTokens: 4242, contextWindow: 9 }))[0].contextWindow,
		).toBe(9);
		expect(decodeModelConfigs(rpcModelConfig({ uid: "m" }))[0].contextWindow).toBeUndefined();
	});
});

describe("catalog from RPC", () => {
	const models = (uids: Array<string | RpcModelInput>): RpcModelInput[] =>
		uids.map((u) => (typeof u === "string" ? { uid: u, supportsImages: true } : u));
	const decoded = (uids: Array<string | RpcModelInput>) =>
		decodeModelConfigs(Buffer.concat(models(uids).map(rpcModelConfig)));

	it("splits effort suffixes, including a trailing speed modifier", () => {
		expect(splitEffortSuffix("claude-opus-5-high")).toEqual({ baseUid: "claude-opus-5", effort: "high" });
		expect(splitEffortSuffix("gpt-5-6-sol-none-priority")).toEqual({
			baseUid: "gpt-5-6-sol-priority",
			effort: "none",
		});
		expect(splitEffortSuffix("glm-5-2")).toEqual({ baseUid: "glm-5-2" });
		expect(splitEffortSuffix("max")).toEqual({ baseUid: "max" });
	});

	it("matches the golden devin-core contract: same families, same uids, free lanes included, never -lightning", () => {
		const uids = [
			...Object.values(contract.families).flat(),
			`swe-2-1${contract.never_route.suffix}`,
			"swe-2-1",
			"swe-2-1-medium-fast",
		];
		const catalog = catalogFromRpc(decoded(uids));
		expect(isUsableCatalog(catalog)).toBe(true);
		const byFamily = Object.fromEntries(catalog.families.map((f) => [f.slug, f.variants.map((v) => v.model_uid)]));
		expect(byFamily).toEqual(
			Object.fromEntries(Object.entries(contract.families).map(([slug, uids]) => [normalizeSlug(slug), uids])),
		);
		const modelIds = modelsFromCatalog(catalog).map((m) => m.id);
		expect(modelIds).toContain("swe-2.1");
		const mapped = modelsFromCatalog(catalog).flatMap((m) =>
			Object.values(m.thinkingLevelMap ?? {}).filter((v): v is string => typeof v === "string"),
		);
		for (const lane of contract.free_lanes) expect(mapped).toContain(lane);
		expect(mapped.some((uid) => uid.endsWith("lightning"))).toBe(false);
	});

	it("filters disabled models and sets input image only when supports_images", () => {
		const catalog = catalogFromRpc(
			decoded([
				{ uid: "vision-high", supportsImages: true },
				{ uid: "textonly-high", supportsImages: false },
				{ uid: "off-high", disabled: true, supportsImages: true },
			]),
		);
		expect(catalog.families.map((f) => f.slug)).toEqual(["vision", "textonly"]);
		const [vision, textonly] = modelsFromCatalog(catalog);
		expect(vision.input).toEqual(["text", "image"]);
		expect(textonly.input).toEqual(["text"]);
	});

	it("drops a bare uid that sits next to effort-suffixed siblings, keeps a lone bare one as high", () => {
		const catalog = catalogFromRpc(decoded(["swe-2-1", "swe-2-1-low", "swe-2-1-high", "glm-5-2"]));
		expect(catalog.families.find((f) => f.slug === "swe-2.1")?.variants.map((v) => v.model_uid)).toEqual([
			"swe-2-1-low",
			"swe-2-1-high",
		]);
		const glm = modelsFromCatalog(catalog).find((m) => m.id === "glm-5-2");
		// glm-5-2 is a bare uid: its slug is glm-5.2
		expect(glm).toMatchObject({ reasoning: false });
	});

	it("keeps context window, output limit and price; strips the effort word from the family label", () => {
		const catalog = catalogFromRpc(
			decoded([
				{
					uid: "m-1-medium",
					label: "Model One (Medium)",
					contextWindow: 200_000,
					maxOutput: 32_000,
					inputPrice: 3,
					outputPrice: 15,
				},
			]),
		);
		expect(catalog.families[0].family_label).toBe("Model One");
		const [model] = modelsFromCatalog(catalog);
		expect(model).toMatchObject({ contextWindow: 200_000, maxTokens: 32_000, cost: { input: 3, output: 15 } });
	});
});

describe("fetchRpcCatalog", () => {
	it("posts GetCascadeModelConfigs with the JWT in the metadata and decodes the answer", async () => {
		const calls: Array<{ url: string; body: Uint8Array }> = [];
		vi.stubGlobal(
			"fetch",
			vi.fn(async (url: string, init: RequestInit) => {
				calls.push({ url, body: init.body as Uint8Array });
				return url.endsWith("GetUserJwt")
					? jwtResponse(jwtWithExp(Math.floor(Date.now() / 1000) + 3600))
					: rpcCatalogResponse([{ uid: "swe-2-medium" }]);
			}),
		);
		const catalog = await fetchRpcCatalog(API_KEY, "https://server.codeium.com");
		expect(catalog.families[0].variants[0].model_uid).toBe("swe-2-medium");
		expect(calls[1].url).toBe("https://server.codeium.com/exa.api_server_pb.ApiServerService/GetCascadeModelConfigs");
		expect(Buffer.from(calls[1].body).includes("eyJ")).toBe(true);
	});

	// Live 2026-11-26: ide devin-cli gets an empty body from this RPC; windsurf 2.0.0 gets the catalog. The identity is
	// fixed, whatever the chat identity is.
	it("always presents the Windsurf identity, even with a Devin CLI installed", async () => {
		const calls: Array<{ url: string; body: Uint8Array }> = [];
		vi.stubGlobal(
			"fetch",
			vi.fn(async (url: string, init: RequestInit) => {
				calls.push({ url, body: init.body as Uint8Array });
				return url.endsWith("GetUserJwt")
					? jwtResponse(jwtWithExp(Math.floor(Date.now() / 1000) + 3600))
					: rpcCatalogResponse([{ uid: "swe-2-medium" }]);
			}),
		);
		await fetchRpcCatalog(API_KEY, "https://server.codeium.com");
		const metadata = [...iterFields(Buffer.from(calls[1].body))].find((f) => f.num === 1)?.value as Buffer;
		const strings = [...iterFields(metadata)].filter((f) => f.wire === 2).map((f) => (f.value as Buffer).toString());
		expect(strings).toEqual(expect.arrayContaining(["windsurf", "2.0.0"]));
		expect(strings).not.toContain("devin-cli");
	});

	it("treats an empty answer as an error naming the identity, so the CLI fallback is explicit", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async (url: string) =>
				url.endsWith("GetUserJwt")
					? jwtResponse(jwtWithExp(Math.floor(Date.now() / 1000) + 3600))
					: new Response(new Uint8Array(0), { status: 200 }),
			),
		);
		await expect(fetchRpcCatalog(API_KEY, "https://server.codeium.com")).rejects.toThrow(
			/returned no models \(0 bytes\) for client identity windsurf 2\.0\.0/,
		);
	});

	it("refreshes the JWT once on 401 and then gives up with an auth error", async () => {
		let catalogCalls = 0;
		vi.stubGlobal(
			"fetch",
			vi.fn(async (url: string) => {
				if (url.endsWith("GetUserJwt")) return jwtResponse(jwtWithExp(Math.floor(Date.now() / 1000) + 3600));
				catalogCalls++;
				return new Response('{"code":"unauthenticated","message":"expired"}', { status: 401 });
			}),
		);
		const error = await fetchRpcCatalog(API_KEY, "https://server.codeium.com").catch((e) => e);
		expect(error).toBeInstanceOf(DevinError);
		expect(error.failure.kind).toBe("auth");
		expect(catalogCalls).toBe(2);
	});
});
