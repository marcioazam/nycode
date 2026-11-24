// Ports the active local extension test folha/sheet (node:test) to vitest.
import assert from "node:assert/strict";
import { visibleWidth } from "@nycode/tui";
import { test } from "vitest";
import type { SheetModel } from "../../../../src/extensions/folha/sheet.ts";
import * as m from "../../../../src/extensions/folha/sheet.ts";

const theme = { fg: (_c: string, s: string) => s, bg: (_c: string, s: string) => `[${s}]`, bold: (s: string) => s };
// o bg falso acrescenta [ ] à linha ativa; o tema real não muda a largura
const cols = (l: string) => visibleWidth(l.replace(/^\[(.*)\]$/, "$1"));
const KEYS = { up: "\x1b[A", down: "\x1b[B", enter: "\r", esc: "\x1b" };

test("rule: sempre width colunas", () => {
	for (const w of [10, 40, 88]) {
		assert.equal(visibleWidth(m.rule(theme, w)), w);
		assert.equal(visibleWidth(m.rule(theme, w, "Título")), w);
		assert.equal(visibleWidth(m.rule(theme, w, "Título", "direita")), w);
	}
	assert.match(m.rule(theme, 30, "Ab", "x"), /^── Ab ─+ x ──$/);
});

test("bar: proporcional e limitado", () => {
	assert.equal(m.bar(theme, 10, 50), "━━━━━─────");
	assert.equal(m.bar(theme, 10, 150), "━".repeat(10));
	assert.equal(m.bar(theme, 10, -5), "─".repeat(10));
});

const model: SheetModel = {
	title: "T",
	footer: "rodapé",
	lines: [
		{ kind: "group", text: "Grupo" },
		{ kind: "row", left: "a", right: "ra", value: "/a" },
		{ kind: "text", text: "solto" },
		{ kind: "row", left: "b", value: "/b" },
	],
};
function make(mdl: any) {
	const r: { done: boolean; value?: string } = { done: false };
	let renders = 0;
	const s = new m.Sheet(
		theme,
		mdl,
		(v?: string) => {
			r.done = true;
			r.value = v;
		},
		() => {
			renders++;
		},
	);
	return { s, r, renders: () => renders };
}

test("Sheet: render, ↑↓ sem dar a volta, Enter, Esc", () => {
	const { s, r, renders } = make(model);
	const out = s.render(30);
	assert.equal(out.length, 1 + 4 + 1 + 1);
	assert.ok(out.every((l: string) => cols(l) === 30));
	assert.match(out[2], /^\[ ❯ a +ra\s*\]$/);
	assert.match(out[4], /^ {3}b/);
	s.handleInput(KEYS.up);
	assert.equal(renders(), 0);
	s.handleInput(KEYS.down);
	assert.match(s.render(30)[4], /^\[ ❯ b/);
	s.handleInput(KEYS.down);
	assert.equal(renders(), 1);
	s.handleInput(KEYS.enter);
	assert.deepEqual(r, { done: true, value: "/b" });
	const e = make(model);
	e.s.handleInput(KEYS.esc);
	assert.deepEqual(e.r, { done: true, value: undefined });
	const c = make(model);
	c.s.handleInput("\x03");
	assert.equal(c.r.done, true);
});

test("Sheet: truncamento com …", () => {
	const { s } = make({
		title: "T",
		footer: "f",
		lines: [{ kind: "row", left: "x".repeat(50), right: "dir", value: "v" }],
	});
	const l = s.render(20)[1];
	assert.equal(cols(l), 20);
	assert.ok(l.includes("…") && l.includes("dir"));
});

test("Sheet: sem seleção rola com mais de 12 linhas; Enter não faz nada", () => {
	const lines = Array.from({ length: 20 }, (_, i) => ({ kind: "text", text: `l${i}` }));
	const { s, r, renders } = make({ title: "T", footer: "f", lines });
	assert.equal(s.render(20).length, 12 + 3);
	assert.match(s.render(20)[1], /l0/);
	s.handleInput(KEYS.down);
	assert.match(s.render(20)[1], /l1/);
	for (let i = 0; i < 20; i++) s.handleInput(KEYS.down);
	assert.match(s.render(20)[12], /l19/);
	s.handleInput(KEYS.enter);
	assert.equal(r.done, false);
	assert.ok(renders() > 0);
});

test("Sheet: Selection Glide 120Hz ilumina ❯ em tema truecolor ao mover seleção", () => {
	const term = process.env.TERM;
	process.env.TERM = "xterm-256color";
	delete (globalThis as Record<symbol, unknown>)[Symbol.for("nycode:movimento")];
	const rgbTheme = {
		fg: (_c: string, s: string) => s,
		bg: (_c: string, s: string) => `[${s}]`,
		bold: (s: string) => s,
		getFgAnsi: (c: string) => (c === "accent" ? "\x1b[38;2;122;162;247m" : ""),
	};
	const s = new m.Sheet(
		rgbTheme,
		model,
		() => {},
		() => {},
	);
	s.handleInput(KEYS.down);
	const activeRow = s.render(30)[4]!;
	assert.match(activeRow, /\x1b\[38;2;\d+;\d+;\d+m❯\x1b\[39m/);
	s.handleInput(KEYS.esc);
	if (term === undefined) delete process.env.TERM;
	else process.env.TERM = term;
});
