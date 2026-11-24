import { describe, expect, it } from "vitest";
import { buildFdPathQuery } from "../src/autocomplete.ts";

describe("buildFdPathQuery", () => {
	it("trims leading and trailing separators and joins segments", () => {
		expect(buildFdPathQuery("//src/ui/")).toBe("src[\\\\/]ui[\\\\/]");
		expect(buildFdPathQuery("///")).toBe("///");
		expect(buildFdPathQuery("a.b")).toBe("a\\.b");
	});

	it("stays linear on long runs of separators (CodeQL #247)", () => {
		const query = `a${"/".repeat(100_000)}b`;
		const t0 = performance.now();
		expect(buildFdPathQuery(query)).toBe("a[\\\\/]b");
		expect(performance.now() - t0).toBeLessThan(1000);
	});
});
