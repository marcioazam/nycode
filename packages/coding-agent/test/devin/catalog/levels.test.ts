import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getSupportedThinkingLevels, type Model } from "@nycode/ai";
import { describe, expect, it } from "vitest";
import { DEVIN_THINKING_LEVELS } from "../../../src/extensions/devin/catalog/levels.ts";
import { type DevinCatalog, modelsFromCatalog, resolveModelUid } from "../../../src/extensions/devin/catalog/models.ts";

const fixture = join(dirname(fileURLToPath(import.meta.url)), "fixtures/cli-catalog-2026-11-26.json");
const live = JSON.parse(readFileSync(fixture, "utf8")) as DevinCatalog;
const byId = new Map(modelsFromCatalog(live).map((model) => [model.id, model]));

/** The levels the picker offers for a Devin model, through the same function the TUI uses. */
function pickerLevels(id: string): string[] {
	const model = byId.get(id);
	if (!model) throw new Error(`no model ${id}`);
	return getSupportedThinkingLevels({ ...model, provider: "devin", api: "devin" } as unknown as Model<"devin">);
}

describe("hand-mapped Devin thinking levels", () => {
	it("names only uids the live catalog lists, never a fast, priority or 1M variant", () => {
		const uids = new Set(live.families.flatMap((family) => family.variants.map((variant) => variant.model_uid)));
		const slugs = new Set(live.families.map((family) => family.slug));
		for (const [slug, levels] of Object.entries(DEVIN_THINKING_LEVELS)) {
			expect(slugs.has(slug), slug).toBe(true);
			for (const uid of Object.values(levels)) {
				expect(uids.has(uid as string), uid as string).toBe(true);
				expect(uid).not.toMatch(/(^|-)(fast|priority|lightning|1m)(-|$)/);
			}
		}
	});

	it("gives the swe family exactly the levels its variants serve", () => {
		expect(pickerLevels("swe-2")).toEqual(["medium", "high", "max"]);
		expect(pickerLevels("swe-2-flash")).toEqual(["medium", "high", "max"]);
		expect(pickerLevels("swe-2.1")).toEqual(["low", "medium", "high", "xhigh", "max"]);
		expect(pickerLevels("swe-1.7")).toEqual(["medium", "max"]);
		expect(pickerLevels("swe-1-6")).toEqual(["off"]);
	});

	it("sends the variant the label names: SWE-1.7 is Max, SWE-2.1 High is its own variant", () => {
		const uid = (id: string, level: string) => resolveModelUid(id, byId.get(id)?.thinkingLevelMap, level);
		expect(uid("swe-1.7", "max")).toBe("swe-1-7");
		expect(uid("swe-1.7", "medium")).toBe("swe-1-7-medium");
		expect(uid("swe-2.1", "high")).toBe("swe-2-1-high");
		expect(uid("swe-2", "medium")).toBe("swe-2-medium");
		expect(uid("swe-2-flash", "max")).toBe("swe-2-flash-max");
	});

	it("maps the families whose uids carry no effort suffix", () => {
		expect(pickerLevels("claude-opus-4.6")).toEqual(["off", "high"]);
		expect(resolveModelUid("claude-opus-4.6", byId.get("claude-opus-4.6")?.thinkingLevelMap, "off")).toBe(
			"claude-opus-4-6",
		);
		expect(pickerLevels("glm-5.2")).toEqual(["off", "high", "max"]);
		expect(resolveModelUid("glm-5.2", byId.get("glm-5.2")?.thinkingLevelMap, "high")).toBe("glm-5-2");
		expect(pickerLevels("gpt-6-sol")).toEqual(["off", "low", "medium", "high", "xhigh", "max"]);
		expect(pickerLevels("claude-opus-5.5")).toEqual(["low", "medium", "high", "xhigh", "max"]);
	});

	it("drops a mapped level whose variant the catalog no longer lists", () => {
		const swe2 = live.families.find((family) => family.slug === "swe-2");
		if (!swe2) throw new Error("swe-2 missing from the fixture");
		const trimmed = { ...swe2, variants: swe2.variants.filter((variant) => variant.model_uid !== "swe-2-max") };
		const [model] = modelsFromCatalog({ families: [trimmed] });
		expect(model.thinkingLevelMap?.max).toBeNull();
		expect(model.thinkingLevelMap?.high).toBe("swe-2-high");
	});
});
