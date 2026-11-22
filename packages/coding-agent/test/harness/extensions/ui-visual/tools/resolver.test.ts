// The tool renderer resolver: built-in tools are wrapped, every other tool with a base gets the icon wrapper.
import assert from "node:assert/strict";
import { test } from "vitest";
import { resolverOf } from "./base.ts";

test("resolver: registra só registerToolRenderer; ferramenta desconhecida com base ganha ícone; sem base fica undefined", () => {
	const NATIVE = { tag: "native" };
	const { calls, resolver } = resolverOf();
	assert.deepEqual(calls, ["registerToolRenderer"]);
	const wrapped = resolver("mcp__x", () => NATIVE);
	assert.equal(wrapped.tag, "native");
	assert.equal(
		typeof wrapped.renderCall,
		"function",
		"since the onda 9 every tool with a base gets the icon renderCall",
	);
	assert.equal(
		resolver("mcp__x", () => undefined),
		undefined,
	);
});
