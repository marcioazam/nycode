import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { enrichCatalog } from "../../../src/extensions/devin/catalog/enrich.ts";
import { type DevinCatalog, modelsFromCatalog } from "../../../src/extensions/devin/catalog/models.ts";
import { catalogFromRpc, type RpcModel } from "../../../src/extensions/devin/catalog/rpc.ts";
import { normalizeSlug } from "../../../src/extensions/devin/catalog/slug.ts";

const dir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
// Real outputs of `devin models list --format json` (trimmed) and GetCascadeModelConfigs on 2026-11-26.
const cli = JSON.parse(readFileSync(join(dir, "cli-catalog-2026-11-26.json"), "utf8")) as DevinCatalog;
const rpc = JSON.parse(readFileSync(join(dir, "rpc-models-2026-11-26.json"), "utf8")) as RpcModel[];

describe("normalizeSlug", () => {
	it.each([
		["claude-opus-5-5", "claude-opus-5.5"],
		["gpt-6-2-astra", "gpt-6.2-astra"],
		["kimi-k3-1-pro", "kimi-k3.1-pro"],
		["swe-2-1", "swe-2.1"],
		["deepseek-v4-1-flash-1017", "deepseek-v4.1-flash"],
		["muse-wonder-1-0", "muse-wonder"],
		["claude-5-fable", "claude-fable-5"],
		["swe-2-flash", "swe-2-flash"],
		["gpt-6-astra", "gpt-6-astra"],
		["nemotron-3-ultra", "nemotron-3-ultra"],
		["glm-5-2-1m", "glm-5.2-1m"],
	])("%s -> %s", (uid, slug) => {
		expect(normalizeSlug(uid)).toBe(slug);
	});
});

describe("golden: RPC slugs against the CLI catalog (2026-11-26)", () => {
	const rpcFamilies = catalogFromRpc(rpc).families;
	const cliSlugs = new Set(cli.families.map((family) => family.slug));

	it("every RPC family that the CLI also lists gets exactly the CLI slug, and every other one is a known variant family", () => {
		const extra = rpcFamilies.filter((family) => !cliSlugs.has(family.slug)).map((family) => family.slug);
		expect(extra.sort()).toEqual([
			"claude-opus-4.6-1m",
			"claude-opus-4.6-thinking",
			"claude-opus-4.6-thinking-1m",
			"claude-sonnet-4.6-1m",
			"claude-sonnet-4.6-thinking",
			"claude-sonnet-4.6-thinking-1m",
			"glm-5.2-1m",
		]);
		const shared = rpcFamilies.filter((family) => cliSlugs.has(family.slug));
		expect(shared.length).toBeGreaterThan(40);
	});

	it("matches each CLI family by family uid, and keeps the uid mapping of the requests", () => {
		const bySlug = new Map(cli.families.map((family) => [family.slug, family]));
		for (const family of rpcFamilies.filter((candidate) => bySlug.has(candidate.slug))) {
			const cliUids = new Set(bySlug.get(family.slug)?.variants.map((variant) => variant.model_uid));
			for (const variant of family.variants) expect(cliUids.has(variant.model_uid)).toBe(true);
		}
	});

	it("never offers internal uppercase uids", () => {
		expect(rpcFamilies.some((family) => /[A-Z]/.test(family.family_uid))).toBe(false);
		expect(rpc.some((model) => model.uid === "MODEL_GPT_OSS_120B")).toBe(true);
	});
});

describe("CLI catalog enriched by the API", () => {
	const enriched = enrichCatalog(cli, rpc);
	const ids = modelsFromCatalog(enriched).map((model) => model.id);

	it("keeps the CLI ids, including the families only the CLI has", () => {
		for (const id of ["adaptive", "fusion", "swe-2.1", "claude-opus-5.5", "gpt-6.2-astra", "kimi-k3.1-pro"]) {
			expect(ids).toContain(id);
		}
	});

	it("takes images support from the API: swe-2-flash is text-only", () => {
		const model = modelsFromCatalog(enriched).find((candidate) => candidate.id === "swe-2-flash");
		expect(rpc.find((m) => m.uid === "swe-2-flash-high")?.supportsImages).toBe(false);
		expect(model?.input).toEqual(["text"]);
	});

	it("lists no alias entries: one model per family", () => {
		expect(ids).not.toContain("claude-opus-5-5");
		expect(ids).not.toContain("claude-5-fable");
		expect(new Set(ids).size).toBe(ids.length);
		expect(modelsFromCatalog(enriched).some((model) => model.name.includes("alias"))).toBe(false);
	});

	// Golden: prices equal the CLI text in cli-catalog-2026-11-26.json; swe-2 is free.
	it.each([
		["claude-opus-5.5", { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 }],
		["claude-haiku-5.5", { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 }],
		["gpt-6.2-astra", { input: 8, output: 40, cacheRead: 0.4, cacheWrite: 10 }],
		["swe-2", { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }],
	])("prices %s from the CLI cost_summary", (id, cost) => {
		expect(modelsFromCatalog(enriched).find((model) => model.id === id)?.cost).toEqual(cost);
		expect(modelsFromCatalog(cli).find((model) => model.id === id)?.cost).toEqual(cost);
	});

	it("takes the API price only for a variant the CLI lists without one", () => {
		const base: DevinCatalog = {
			families: [
				{
					family_label: "P",
					family_uid: "p",
					slug: "p",
					variants: [
						{ model_uid: "p-low", label: "low" },
						{ model_uid: "p-high", label: "high", cost_summary: "$1 / 1M Input · $5 / 1M Output" },
					],
				},
			],
		};
		const priced = (uid: string) => ({
			uid,
			label: uid,
			disabled: false,
			supportsImages: true,
			inputPrice: 3,
			outputPrice: 9,
		});
		const out = enrichCatalog(base, [priced("p-low"), priced("p-high")]).families[0].variants;
		expect(out[0].cost_summary).toBe("$3 / 1M Input · $9 / 1M Output");
		expect(out[1].cost_summary).toBe("$1 / 1M Input · $5 / 1M Output");
	});

	it("drops disabled variants and empty families, fills missing limits, leaves unknown uids alone", () => {
		const base: DevinCatalog = {
			families: [
				{
					family_label: "A",
					family_uid: "a",
					slug: "a",
					variants: [
						{ model_uid: "a-low", label: "low" },
						{ model_uid: "a-high", label: "high", max_context_tokens: 5 },
					],
				},
				{ family_label: "B", family_uid: "b", slug: "b", variants: [{ model_uid: "b-high", label: "b" }] },
				{ family_label: "C", family_uid: "c", slug: "c", variants: [{ model_uid: "c", label: "c" }] },
			],
		};
		const models: RpcModel[] = [
			{ uid: "a-low", label: "", disabled: false, supportsImages: true, contextWindow: 9, maxOutputTokens: 3 },
			{ uid: "a-high", label: "", disabled: true, supportsImages: true },
			{ uid: "b-high", label: "", disabled: true, supportsImages: true },
		];
		const out = enrichCatalog(base, models);
		expect(out.families.map((family) => family.slug)).toEqual(["a", "c"]);
		expect(out.families[0].variants).toEqual([
			{ model_uid: "a-low", label: "low", supports_images: true, max_context_tokens: 9, max_output_tokens: 3 },
		]);
		expect(out.families[1].variants).toEqual(base.families[2].variants);
	});

	it("drops extra-cost variants (lightning, fast, priority) from CLI families", () => {
		const out = modelsFromCatalog({
			families: [
				{
					family_label: "S",
					family_uid: "s",
					slug: "s",
					variants: [
						{ model_uid: "s-low-lightning", label: "x" },
						{ model_uid: "s-low", label: "low" },
						{ model_uid: "s-high", label: "high" },
					],
				},
			],
		});
		expect(Object.values(out[0].thinkingLevelMap ?? {})).not.toContain("s-low-lightning");
	});
});
