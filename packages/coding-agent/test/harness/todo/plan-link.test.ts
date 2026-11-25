// reconcilePlan: a failed/blocked/cancelled linked item keeps its status; completing a step clears the old reason.
import assert from "node:assert/strict";
import { test } from "vitest";
import type { PlanStepsEvent } from "../../../src/extensions/_shared/events/plan-mode-state.ts";
import { type LinkTodo, reconcilePlan } from "../../../src/extensions/todo/plan-link.ts";

const ev = (...done: boolean[]): PlanStepsEvent => ({
	executing: true,
	steps: done.map((completed, i) => ({ step: i + 1, text: `s${i + 1}`, completed })),
});
const linked = (id: number, step: number, status: LinkTodo["status"], reason?: string): LinkTodo => ({
	id,
	text: `${step}. s${step}`,
	status,
	planStep: step,
	...(reason ? { reason } : {}),
});

test("a failed current step stays failed when a plan event arrives (not restarted as in_progress)", () => {
	const r = reconcilePlan([linked(1, 1, "failed", "gate red"), linked(2, 2, "pending")], 3, ev(false, false));
	assert.deepEqual(
		r.todos.map((t) => t.status),
		["failed", "pending"],
	);
});

test("blocked and cancelled current steps also stay", () => {
	for (const status of ["blocked", "cancelled"] as const) {
		const r = reconcilePlan([linked(1, 1, status), linked(2, 2, "pending")], 3, ev(false, false));
		assert.equal(r.todos[0].status, status);
	}
});

test("completing the step (the plan marks it done, e.g. [DONE:n]) clears the reason of an earlier failure", () => {
	const r = reconcilePlan([linked(1, 1, "failed", "gate red"), linked(2, 2, "pending")], 3, ev(true, false));
	assert.equal(r.todos[0].status, "completed");
	assert.equal(r.todos[0].reason, undefined);
	assert.equal("reason" in r.todos[0], false);
});
