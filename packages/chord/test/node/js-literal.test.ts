// Round-trip of `jsLiteral`: the characters that break out of a script element stay data.

import { describe, expect, it } from "vitest";
import { jsLiteral } from "./js-literal.ts";

describe("jsLiteral", () => {
	it("round-trips a script terminator", () => {
		const value = "</script>\u2028\u2029>";
		const literal = jsLiteral(value);
		expect(literal.includes("<")).toBe(false);
		expect(literal.includes("\\u003c")).toBe(true);
		expect(Function(`"use strict"; return ${literal};`)()).toBe(value);
	});
});
