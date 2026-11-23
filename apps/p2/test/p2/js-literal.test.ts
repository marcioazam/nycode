import assert from "node:assert/strict";
import { test } from "node:test";
import { jsLiteral } from "./js-literal.ts";

test("jsLiteral round-trips and escapes script terminators", () => {
	const value = "</script>\u2028\u2029>";
	const literal = jsLiteral(value);
	assert.equal(literal.includes("<"), false);
	assert.equal(literal.includes(">"), false);
	assert.equal(literal.includes("\\u003c"), true);
	assert.equal(Function(`"use strict"; return ${literal};`)(), value);
});
