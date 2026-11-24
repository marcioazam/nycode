// cleanTitle: the model's reply becomes the session name (selector, editor border, terminal title).
import assert from "node:assert/strict";
import { test } from "vitest";
import { cleanTitle, TITLE_MAX_CHARS } from "../../../../src/extensions/session-title/index.ts";

test("keeps a normal title, peeling quotes and trailing punctuation", () => {
	assert.equal(cleanTitle('  "Fix The Parser."  '), "Fix The Parser");
	assert.equal(cleanTitle("Fix   The\tParser"), "Fix The Parser");
});

// Measured 2026-11-24 with a fake provider that ignores maxTokens: the whole markdown reply became the session name and
// filled the editor border. A provider can ignore the cap, so the reply is bounded here: first line, no heading marks.
test("a long markdown reply becomes its first line, without heading marks, capped at a word boundary", () => {
	const reply = `# Resposta de teste\n\nVou explicar em partes. ${"Este texto chega aos poucos. ".repeat(40)}`;
	assert.equal(cleanTitle(reply), "Resposta de teste");
	const one = cleanTitle(`Refatorar ${"modulo ".repeat(40)}final`);
	assert.ok(one.length <= TITLE_MAX_CHARS, `${one.length}`);
	assert.ok(one.endsWith("…") && !one.includes("modul…"), one);
	assert.equal(cleanTitle("#\n\n## \n"), "");
});
