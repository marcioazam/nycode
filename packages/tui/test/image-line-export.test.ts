import assert from "node:assert";
import { describe, it } from "node:test";
import { isImageLine } from "../src/index.ts";

describe("isImageLine export (seam K15)", () => {
	it("is exported by the package entry and tells image lines from text", () => {
		assert.strictEqual(isImageLine("\x1b_Ga=T,f=100;AAAA\x1b\\"), true);
		assert.strictEqual(isImageLine("\x1b]1337;File=inline=1:AAAA\x07"), true);
		assert.strictEqual(isImageLine("plain text"), false);
	});
});
