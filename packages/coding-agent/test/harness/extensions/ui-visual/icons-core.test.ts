// Ports the pre-migration harness: extensions/ui-visual/test/icons.test.ts to vitest. The Nycode env switches for the Nerd Font and the
// ASCII fallback became the terminal.nerdFont / terminal.asciiIcons keys (IconPrefs, resolved from env > settings > default).
import assert from "node:assert/strict";
import { test } from "vitest";
import type { IconName, IconPrefs } from "../../../../src/extensions/ui-visual/icons.ts";
import { icon, nerdFont } from "../../../../src/extensions/ui-visual/icons.ts";

const NAMES: IconName[] = [
	"read",
	"bash",
	"edit",
	"write",
	"grep",
	"find",
	"ls",
	"ok",
	"err",
	"pending",
	"branch",
	"clock",
	"think",
];
const AUTO: IconPrefs = { nerdFont: "auto", asciiIcons: false };
const NERD: IconPrefs = { nerdFont: true, asciiIcons: false };
const OFF: IconPrefs = { nerdFont: false, asciiIcons: false };
const _ASCII: IconPrefs = { nerdFont: "auto", asciiIcons: true };

test("nerdFont: kitty ou nerdFont=true ligam; resto desliga", () => {
	assert.equal(nerdFont({}, AUTO), false);
	assert.equal(nerdFont({ TERM: "xterm-256color" }, AUTO), false);
	assert.equal(nerdFont({ TERM: "xterm-kitty" }, AUTO), true);
	assert.equal(nerdFont({ KITTY_WINDOW_ID: "3" }, AUTO), true);
	assert.equal(nerdFont({}, NERD), true);
	assert.equal(nerdFont({}, OFF), false);
	// paridade com o nycode-harness: o valor explícito "desligado" é ignorado, o kitty mantém a Nerd Font
	assert.equal(nerdFont({ TERM: "xterm-kitty" }, OFF), true);
	assert.equal(nerdFont({ KITTY_WINDOW_ID: "3" }, OFF), true);
});

test("todo IconName existe nos dois conjuntos e o fallback tem largura 1", () => {
	for (const n of NAMES) {
		const nerd = icon(n, {}, NERD);
		const plain = icon(n, {}, AUTO);
		assert.ok(nerd.length > 0, n);
		assert.ok(plain.length > 0, n);
		assert.equal([...plain].length, 1, n);
		assert.notEqual(nerd, plain, n);
	}
});

test("sem argumentos usa process.env e as preferências do processo", () => {
	assert.equal(typeof icon("bash"), "string");
	assert.equal(typeof nerdFont(), "boolean");
});

test("nerdFont: asciiIcons vence o kitty e o nerdFont explícito; NO_COLOR só tira cor", () => {
	const kitty = { TERM: "xterm-kitty" };
	assert.equal(nerdFont(kitty, { nerdFont: "auto", asciiIcons: true }), false);
	assert.equal(nerdFont({}, { nerdFont: true, asciiIcons: true }), false);
	assert.equal(nerdFont({ ...kitty, NO_COLOR: "1" }, { nerdFont: "auto", asciiIcons: false }), true);
});
