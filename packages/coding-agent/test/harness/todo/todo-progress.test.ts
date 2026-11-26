// Bug (2026-11-26): a list whose items all ended, one of them cancelled, read "8/9" everywhere (the /todos list, the
// todo tool card, the TODO widget, which never hid itself, and the plan footer): cancelled work stayed in the total.
// Rule: progress = completed / items still in scope (cancelled leaves the count); failed and blocked stay in it.
import assert from "node:assert/strict";
import { stripVTControlCharacters } from "node:util";
import { test, vi } from "vitest";
import { PlanSection } from "../../../src/extensions/plan-mode/section.ts";
import { todoRowsProgress, todosToItems } from "../../../src/extensions/plan-mode/utils.ts";
import todoExtension from "../../../src/extensions/todo/index.ts";
import { todoProgress } from "../../../src/extensions/todo/status.ts";
import { todoLinha } from "../../../src/extensions/ui-visual/motion/chrome.ts";
import type { Loose } from "../plan-mode/support.ts";

vi.hoisted(() => {
	process.env.NO_COLOR = "1";
});

const theme: Loose = { fg: (_c: string, t: string) => t, bg: (_c: string, t: string) => t, bold: (t: string) => t };
const todos = (...statuses: string[]) => statuses.map((status, i) => ({ id: i + 1, text: `t${i + 1}`, status }));

test("todoProgress: cancelled leaves the count; failed and blocked stay in it", () => {
	assert.deepEqual(todoProgress(todos("completed", "completed", "cancelled")), { done: 2, total: 2 });
	assert.deepEqual(todoProgress(todos("completed", "failed", "blocked", "cancelled")), { done: 1, total: 3 });
	assert.deepEqual(todoProgress(todos("cancelled")), { done: 0, total: 0 });
	assert.deepEqual(todoProgress([]), { done: 0, total: 0 });
	assert.deepEqual(todoRowsProgress(todosToItems(todos("completed", "cancelled", "pending"))), { done: 1, total: 2 });
});

test("/todos: a finished list with a cancelled item reads n/n and names the cancelled one", async () => {
	let tool: Loose;
	let command: Loose;
	const nycode: Loose = {
		events: { emit() {}, on() {} },
		getSettings: () => ({}),
		on() {},
		registerShortcut() {},
		registerCommand: (name: string, c: Loose) => {
			if (name === "todos") command = c;
		},
		registerTool: (t: Loose) => {
			tool = t;
		},
		appendEntry() {},
	};
	todoExtension(nycode);
	const ctx: Loose = { hasUI: true, cwd: process.cwd(), sessionManager: { getBranch: () => [] } };
	for (const p of [
		{ action: "add", text: "a" },
		{ action: "add", text: "b" },
		{ action: "add", text: "c" },
		{ action: "complete", id: 1 },
		{ action: "complete", id: 2 },
		{ action: "cancel", id: 3, reason: "not needed" },
	])
		await tool.execute("id", p, undefined, undefined, ctx);
	let lines: string[] = [];
	const ui = {
		custom: async (make: Loose) => {
			lines = make({}, theme, {}, () => {}).render(100);
		},
	};
	await command.handler("", { ...ctx, mode: "tui", ui });
	assert.match(stripVTControlCharacters(lines.join("\n")), /2\/2 completed · 1 cancelled/);
});

test("todo tool card: the bar counts only items in scope", () => {
	const card = todoLinha({ action: "cancel", id: 3 }, { todos: todos("completed", "completed", "cancelled") }, theme);
	assert.match(stripVTControlCharacters(card.andamento), /2\/2$/);
	const onlyCancelled = todoLinha({ action: "cancel", id: 1 }, { todos: todos("cancelled") }, theme);
	assert.match(stripVTControlCharacters(onlyCancelled.andamento), /0\/0$/);
});

const tui = { requestRender() {}, terminal: { rows: 40 } };
const widgetCtx: Loose = {
	hasUI: true,
	ui: { setWidget: (_k: string, f?: (t: unknown, th: unknown) => unknown) => void f?.(tui, theme) },
};
const head = (s: Loose): string => stripVTControlCharacters(s.render(200).join("\n"));

test("TODO widget: a list whose items all ended hides itself, even with a cancelled item", () => {
	const s = new PlanSection();
	s.update(widgetCtx, todosToItems(todos("completed", "cancelled")), "todo");
	assert.deepEqual(s.render(200), []);
});

test("TODO widget: the title counts only items in scope", () => {
	const s = new PlanSection();
	s.update(widgetCtx, todosToItems(todos("completed", "cancelled", "pending")), "todo");
	assert.match(head(s), /\bTodo 1\/2\b/i);
});
