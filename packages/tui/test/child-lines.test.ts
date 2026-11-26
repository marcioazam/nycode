import assert from "node:assert";
import { describe, it } from "node:test";
import { type Component, renderChildLines } from "../src/tui.ts";

/** A child whose next render returns a fresh array with the given lines. */
function child(lines: string[]): Component & { lines: string[] } {
	return {
		lines,
		render() {
			return [...this.lines];
		},
		invalidate() {},
	};
}

describe("renderChildLines", () => {
	it("keeps the previous result while every child renders equal content, even as fresh arrays", () => {
		const kids = [child(["a"]), child(["b", "c"])];
		const first = renderChildLines(kids, 10, undefined);
		assert.deepStrictEqual(first.lines, ["a", "b", "c"]);
		const second = renderChildLines(kids, 10, first);
		assert.strictEqual(second, first);
		assert.strictEqual(renderChildLines(kids, 10, second), first);
	});

	it("rebuilds from the first changed child, sharing the refreshed parts of the unchanged prefix", () => {
		const kids = [child(["a"]), child(["b"]), child(["c"])];
		const first = renderChildLines(kids, 10, undefined);
		kids[1]!.lines = ["B", "B2"];
		const second = renderChildLines(kids, 10, first);
		assert.notStrictEqual(second, first);
		assert.deepStrictEqual(second.lines, ["a", "B", "B2", "c"]);
		// The unchanged first child's newest array is recorded in place, so both results share it.
		assert.strictEqual(second.parts[0], first.parts[0]);
		assert.strictEqual(renderChildLines(kids, 10, second), second);
	});

	it("rebuilds when the width or the children change", () => {
		const a = child(["a"]);
		const b = child(["b"]);
		const first = renderChildLines([a, b], 10, undefined);
		const wider = renderChildLines([a, b], 11, first);
		assert.notStrictEqual(wider, first);
		assert.deepStrictEqual(wider.lines, ["a", "b"]);
		const swapped = renderChildLines([b, a], 11, wider);
		assert.deepStrictEqual(swapped.lines, ["b", "a"]);
		const fewer = renderChildLines([b], 11, swapped);
		assert.deepStrictEqual(fewer.lines, ["b"]);
		assert.deepStrictEqual(renderChildLines([], 11, fewer).lines, []);
	});
});
