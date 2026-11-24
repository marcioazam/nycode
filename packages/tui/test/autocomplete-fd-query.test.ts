import assert from "node:assert";
import { describe, it } from "node:test";
import { buildFdPathQuery } from "../src/autocomplete.ts";

describe("buildFdPathQuery", () => {
	it("trims leading and trailing separators and joins segments", () => {
		assert.strictEqual(buildFdPathQuery("//src/ui/"), "src[\\\\/]ui[\\\\/]");
		assert.strictEqual(buildFdPathQuery("///"), "///");
		assert.strictEqual(buildFdPathQuery("a.b"), "a\\.b");
	});

	it("stays linear on long runs of separators (CodeQL #247)", () => {
		const query = `a${"/".repeat(100_000)}b`;
		const t0 = performance.now();
		assert.strictEqual(buildFdPathQuery(query), "a[\\\\/]b");
		const ms = performance.now() - t0;
		assert.ok(ms < 1000, `took ${ms} ms`);
	});
});
