// Port of the todo-active patch tests (nycode 1.7.0) to vitest against the embedded source.
import assert from "node:assert/strict";
import { test } from "vitest";
import { activeStep, PlanTimes } from "../../../../src/extensions/plan-mode/table.ts";
import { todosToItems } from "../../../../src/extensions/plan-mode/utils.ts";

const asItems = (todos: Array<{ id: number; status: string }>) =>
	todosToItems(todos.map((t) => ({ ...t, text: `t${t.id}` })));

test("todosToItems mapeia id e in_progress dos todos", () => {
	const [a, b] = asItems([
		{ id: 3, status: "in_progress" },
		{ id: 4, status: "pending" },
	]);
	assert.deepEqual([a.step, a.doing, a.completed], [3, true, false]);
	assert.deepEqual([b.step, b.doing, b.completed], [4, false, false]);
});

test("todosToItems: cancelled vira skipped, failed e blocked ficam, reason vira note; os demais sem status", () => {
	const items = todosToItems(
		(["cancelled", "failed", "blocked", "pending", "completed"] as const).map((status, i) => ({
			id: i + 1,
			text: "x",
			status,
			reason: `why ${status}`,
		})),
	);
	assert.deepEqual(
		items.map((i) => [i.status, i.note]),
		[
			["skipped", "why cancelled"],
			["failed", "why failed"],
			["blocked", "why blocked"],
			[undefined, undefined],
			[undefined, undefined],
		],
	);
	assert.equal(items[4].completed, true);
});

test("(a) activeStep é o todo em andamento, não o primeiro aberto", () => {
	const items = asItems([
		{ id: 3, status: "pending" },
		{ id: 5, status: "in_progress" },
		{ id: 9, status: "pending" },
	]);
	assert.deepEqual(
		items.map((i) => i.step),
		[3, 5, 9],
	);
	assert.equal(activeStep(items), 5);
});

test("(b) nenhum em andamento: activeStep indefinido", () => {
	assert.equal(
		activeStep(
			asItems([
				{ id: 3, status: "pending" },
				{ id: 5, status: "completed" },
			]),
		),
		undefined,
	);
});

test("(c) relógio do todo em andamento começa agora, mesmo após um concluído", () => {
	const t = new PlanTimes();
	t.observe(
		asItems([
			{ id: 2, status: "completed" },
			{ id: 3, status: "pending" },
			{ id: 5, status: "in_progress" },
		]),
		1000,
	);
	assert.equal(t.window(5, 1500)!.from, 1000);
	assert.equal(t.window(3, 1500), undefined);
});

test("(d) volta a pending: relógio descartado", () => {
	const t = new PlanTimes();
	t.observe(asItems([{ id: 5, status: "in_progress" }]), 1000);
	t.observe(asItems([{ id: 5, status: "pending" }]), 2000);
	assert.equal(t.window(5, 3000), undefined);
});

test("(e) modo plano (sem doing) inalterado", () => {
	const items = [
		{ step: 1, text: "a", completed: true },
		{ step: 2, text: "b", completed: false },
		{ step: 3, text: "c", completed: false },
	];
	assert.equal(activeStep(items), 2);
	const t = new PlanTimes();
	t.observe(
		items.map((i) => ({ ...i, completed: false })),
		1000,
	);
	t.observe(items, 2000);
	assert.equal(t.window(2, 2500)!.from, 2000);
	assert.equal(t.window(3, 2500), undefined);
});
