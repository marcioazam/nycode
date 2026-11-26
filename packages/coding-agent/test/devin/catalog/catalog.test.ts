import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	CATALOG_CACHE_MAX_AGE_MS,
	catalogCachePath,
	isCatalogCacheFresh,
	isUsableCatalog,
	readCatalogCache,
	writeCatalogCache,
} from "../../../src/extensions/devin/catalog/cache.ts";
import { FALLBACK_MODELS, modelsFromCatalog, resolveModelUid } from "../../../src/extensions/devin/catalog/models.ts";
import { CATALOG, tempDir } from "../helpers.ts";

describe("modelsFromCatalog", () => {
	it("builds one model per family, with a thinking map that hides absent levels and skips priority variants", () => {
		const [model] = modelsFromCatalog(CATALOG);
		expect(model).toMatchObject({
			id: "claude-opus-5",
			name: "Claude Opus 5",
			reasoning: true,
			contextWindow: 500000,
			maxTokens: 64000,
		});
		expect(model.thinkingLevelMap).toEqual({
			off: null,
			minimal: null,
			low: "claude-opus-5-low",
			medium: null,
			high: "claude-opus-5-high",
			xhigh: null,
			max: null,
		});
	});

	it("parses costs from the CLI summary and falls back to defaults", () => {
		const catalog = {
			families: [
				{
					family_label: "Solo",
					family_uid: "solo",
					slug: "solo",
					variants: [
						{
							model_uid: "solo",
							label: "Solo",
							cost_summary: "$2 / 1M Input · $10 / 1M Output · $0.1 / 1M Sidekick input · Sidekick: Free",
						},
					],
				},
			],
		};
		const [model] = modelsFromCatalog(catalog);
		expect(model).toMatchObject({ id: "solo", reasoning: false, contextWindow: 256_000, maxTokens: 128_000 });
		expect(model.thinkingLevelMap).toBeUndefined();
		expect(model.cost).toEqual({ input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 });
	});

	it("maps every thinking suffix and ends on the fallback list for empty input", () => {
		const uids = ["m-none", "m-minimal", "m-low", "m-medium", "m-high", "m-xhigh", "m-max"];
		const catalog = {
			families: [
				{
					family_label: "M",
					family_uid: "m",
					slug: "",
					variants: uids.map((model_uid) => ({ model_uid, label: model_uid })),
				},
			],
		};
		const [model] = modelsFromCatalog(catalog);
		expect(model.id).toBe("m");
		expect(Object.values(model.thinkingLevelMap ?? {})).toEqual(uids);
		expect(modelsFromCatalog(null)).toBe(FALLBACK_MODELS);
		expect(modelsFromCatalog({ families: [{ family_label: "E", family_uid: "e", slug: "e", variants: [] }] })).toBe(
			FALLBACK_MODELS,
		);
	});

	it("keeps priority-only families usable", () => {
		const catalog = {
			families: [
				{ family_label: "P", family_uid: "p", slug: "p", variants: [{ model_uid: "p-high-priority", label: "P" }] },
			],
		};
		expect(modelsFromCatalog(catalog)).toHaveLength(1);
	});
});

describe("resolveModelUid", () => {
	const [model] = modelsFromCatalog(CATALOG);
	it("picks the variant of the requested level, else the preferred default, else the model id", () => {
		expect(resolveModelUid(model.id, model.thinkingLevelMap, "low")).toBe("claude-opus-5-low");
		expect(resolveModelUid(model.id, model.thinkingLevelMap, "medium")).toBe("claude-opus-5-high");
		expect(resolveModelUid(model.id, model.thinkingLevelMap)).toBe("claude-opus-5-high");
		expect(resolveModelUid("plain", undefined, "high")).toBe("plain");
		expect(resolveModelUid("plain", { off: null })).toBe("plain");
	});
});

describe("catalog validation", () => {
	const family = (overrides: Record<string, unknown>) => ({
		families: [{ ...CATALOG.families[0], ...overrides }],
	});

	it("accepts the CLI shape and rejects bad shapes, ids and oversized labels", () => {
		expect(isUsableCatalog(CATALOG)).toBe(true);
		expect(isUsableCatalog(null)).toBe(false);
		expect(isUsableCatalog({ families: [] })).toBe(false);
		expect(isUsableCatalog({ families: [{ ...CATALOG.families[0], variants: [] }] })).toBe(false);
		expect(isUsableCatalog(family({ slug: "has space" }))).toBe(false);
		expect(isUsableCatalog(family({ slug: "../x" }))).toBe(false);
		expect(isUsableCatalog(family({ family_uid: "a".repeat(101) }))).toBe(false);
		expect(isUsableCatalog(family({ family_label: "x".repeat(201) }))).toBe(false);
		expect(isUsableCatalog(family({ variants: [{ model_uid: "bad\nuid", label: "x" }] }))).toBe(false);
		expect(isUsableCatalog(family({ variants: [{ model_uid: "ok", label: 3 }] }))).toBe(false);
	});
});

describe("catalog cache", () => {
	it("lives under the agent dir and round-trips atomically with restrictive modes", () => {
		const dir = tempDir();
		expect(catalogCachePath(dir)).toBe(join(dir, "cache", "devin", "models.json"));
		const path = catalogCachePath(dir);
		expect(readCatalogCache(path)).toBeNull();
		writeCatalogCache(CATALOG, path, 1000);
		expect(readCatalogCache(path)).toEqual({ catalog: CATALOG, fetchedAt: 1000, source: "cli" });
		expect(readdirSync(join(dir, "cache", "devin"))).toEqual(["models.json"]);
		expect(existsSync(path)).toBe(true);
	});

	it("keeps why the API catalog was skipped, bounded to 300 characters", () => {
		const path = catalogCachePath(tempDir());
		writeCatalogCache(CATALOG, path, 1, "cli", "x".repeat(500));
		expect(readCatalogCache(path)?.fallbackReason).toBe("x".repeat(300));
		writeCatalogCache(CATALOG, path, 1, "cli", "Devin API: no models");
		expect(readCatalogCache(path)).toMatchObject({ source: "cli", fallbackReason: "Devin API: no models" });
	});

	it("refuses to cache or read an invalid catalog", () => {
		const dir = tempDir();
		const path = catalogCachePath(dir);
		expect(() => writeCatalogCache({ families: [] }, path)).toThrow("invalid");
		writeCatalogCache(CATALOG, path, 1);
		writeFileSync(path, JSON.stringify({ version: 1, fetchedAt: 1, catalog: { families: [] } }));
		expect(() => readCatalogCache(path)).toThrow("Invalid Devin model catalog cache");
		writeFileSync(path, JSON.stringify({ version: 2, fetchedAt: 1, catalog: CATALOG }));
		expect(() => readCatalogCache(path)).toThrow("Invalid");
	});

	it("tells fresh from stale", () => {
		const cached = { catalog: CATALOG, fetchedAt: 1000, source: "cli" as const };
		expect(isCatalogCacheFresh(cached, 1000 + CATALOG_CACHE_MAX_AGE_MS)).toBe(true);
		expect(isCatalogCacheFresh(cached, 1001 + CATALOG_CACHE_MAX_AGE_MS)).toBe(false);
		expect(isCatalogCacheFresh(cached, 500)).toBe(false);
	});
});

describe("static fallback models", () => {
	// Live 2026-11-26: with no cache, `--model swe-2` used to hit "not found ... custom model id" and clone another model.
	it("include the free swe-2 families with the uids the server serves, and accept images except where it does not", () => {
		const byId = new Map(FALLBACK_MODELS.map((model) => [model.id, model]));
		for (const id of ["swe-2", "swe-2-flash", "swe-2.1"]) expect(byId.has(id)).toBe(true);
		expect(resolveModelUid("swe-2", byId.get("swe-2")?.thinkingLevelMap, "high")).toBe("swe-2-high");
		expect(resolveModelUid("swe-2", byId.get("swe-2")?.thinkingLevelMap)).toBe("swe-2-high");
		expect(resolveModelUid("swe-2.1", byId.get("swe-2.1")?.thinkingLevelMap, "low")).toBe("swe-2-1-low");
		expect(resolveModelUid("swe-2.1", byId.get("swe-2.1")?.thinkingLevelMap)).toBe("swe-2-1");
		expect(byId.get("swe-2")?.thinkingLevelMap?.low).toBeNull();
		expect(byId.get("swe-2")?.input).toContain("image");
		// Live 2026-11-26: with no cache the fallback let an image reach swe-2-flash, which does not take images.
		expect(byId.get("swe-2-flash")?.input).toEqual(["text"]);
	});
});
