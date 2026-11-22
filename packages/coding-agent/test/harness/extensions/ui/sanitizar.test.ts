import assert from "node:assert/strict";
import { test } from "vitest";
import { sanitizarExibicao } from "../../../../src/extensions/ui/a11y.ts";

test("tira OSC 52 e C0, e conserva SGR de realce", () => {
	const osc = "nome\u001b]52;c;c2VjcmV0bw==\u0007fim";
	assert.equal(sanitizarExibicao(osc), "nomefim");
	assert.equal(sanitizarExibicao("a\u001b[2Jb"), "ab");
	assert.equal(sanitizarExibicao("\u001b[38;5;81mok\u001b[0m"), "\u001b[38;5;81mok\u001b[0m");
	assert.equal(sanitizarExibicao("x\u0000y\u0007"), "xy");
});

test("sequências sem terminador repetidas não travam e não deixam ESC", () => {
	const ruim = "\u001b]".repeat(20000) + "\u001bP".repeat(20000);
	const t0 = performance.now();
	const out = sanitizarExibicao(ruim);
	assert.ok(performance.now() - t0 < 500);
	assert.ok(!out.includes("\u001b"));
	assert.equal(sanitizarExibicao("a\u001b]0;título\u0007b\u001bPq#0\u001b\\c"), "abc");
});
