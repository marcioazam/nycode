// Upstream parity (1.10.0): `/todos-widget off|compact|full` chooses how the todo list shows; Nycode draws it in the
// Plan section, so the mode applies there to the todo tool's list only (a plan execution is not a todo list).
import assert from "node:assert/strict";
import { afterEach, test, vi } from "vitest";
import { setTodoWidgetMode, todoWidgetMode } from "../../../../src/extensions/_shared/ui/todo-widget.ts";
import { PlanSection } from "../../../../src/extensions/plan-mode/section.ts";
import type { Loose } from "../support.ts";

vi.hoisted(() => {
	process.env.NO_COLOR = "1";
});

const theme = { fg: (_c: string, t: string) => t, bold: (t: string) => t };
const tui = { requestRender() {}, terminal: { rows: 40 } };
const ctx: Loose = {
	hasUI: true,
	ui: { setWidget: (_k: string, f?: (t: unknown, th: unknown) => unknown) => void f?.(tui, theme) },
};
const items = [
	{ step: 1, text: "feito", completed: true },
	{ step: 2, text: "Escrevendo testes", completed: false, doing: true },
	{ step: 3, text: "depois", completed: false },
];
const plain = (lines: string[]): string[] =>
	lines.map((l) => l.replace(/\x1b\[[0-9;]*m/g, "").trimEnd()).filter(Boolean);

afterEach(() => setTodoWidgetMode("full"));

test("full (padrão) mostra a tabela com todas as linhas", () => {
	assert.equal(todoWidgetMode(), "full");
	const s = new PlanSection();
	s.update(ctx, items, "todo");
	assert.ok(plain(s.render(120)).some((l) => l.includes("depois")));
	s.shutdown(ctx);
});

test("compact mostra uma linha com a contagem e a tarefa ativa", () => {
	const s = new PlanSection();
	s.update(ctx, items, "todo");
	setTodoWidgetMode("compact");
	const lines = plain(s.render(120)).filter((l) => !/^[─━-]+$/.test(l));
	assert.equal(lines.length, 1, lines.join("\n"));
	assert.match(lines[0], /1\/3/);
	assert.match(lines[0], /Escrevendo testes/);
	s.shutdown(ctx);
});

test("off esconde a lista de todos; uma execução de plano continua visível", () => {
	const s = new PlanSection();
	setTodoWidgetMode("off");
	s.update(ctx, items, "todo");
	assert.deepEqual(plain(s.render(120)), []);
	s.update(ctx, items, "plan");
	assert.ok(plain(s.render(120)).length > 0);
	s.shutdown(ctx);
});
