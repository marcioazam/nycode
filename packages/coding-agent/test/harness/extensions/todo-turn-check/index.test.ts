// todo.sync end-of-turn check: each trigger, each skip, once per turn, off = nothing.
import { strict as assert } from "node:assert";
import { afterEach, beforeEach, describe, it } from "vitest";
import type { ExtensionAPI } from "../../../../src/core/extensions/types.ts";
import {
	TODO_TURN_STATE_CHANNEL,
	type TodoSyncItem,
	type TodoTurnStateRequest,
} from "../../../../src/extensions/_shared/events/plan-mode-state.ts";
import { decideTurnCheck, registerTurnCheck } from "../../../../src/extensions/todo/turn-check.ts";

type Entry = Record<string, any>;
let n = 0;
const user = (): Entry => ({ type: "message", id: `e${++n}`, message: { role: "user", content: "go" } });
const calls = (...names: Array<[string, Record<string, unknown>?]>): Entry => ({
	type: "message",
	id: `e${++n}`,
	message: {
		role: "assistant",
		content: names.map(([name, args], i) => ({ type: "toolCall", id: `c${n}-${i}`, name, arguments: args ?? {} })),
	},
});
const bash3 = (): Entry => calls(["bash"], ["bash"], ["bash"]);
const snap = (todos: Array<Partial<TodoSyncItem>>): Entry => ({
	type: "custom",
	customType: "nycode:todo",
	data: { todos },
});
const item = (id: number, status: TodoSyncItem["status"], extra: Partial<TodoSyncItem> = {}): TodoSyncItem => ({
	id,
	text: `item ${id}`,
	status,
	...extra,
});

describe("todo turn check", () => {
	const open = [item(1, "in_progress")];

	it("blocks: 3 calls, list unchanged, one open item", () => {
		const d = decideTurnCheck([user(), bash3()], [], open);
		assert.equal(d?.kind, "list");
		assert.match(d?.message ?? "", /#1 \[in_progress\] item 1/);
		assert.match(d?.message ?? "", /todo confirm/);
	});
	it("skips with 2 calls", () => {
		assert.equal(decideTurnCheck([user(), calls(["bash"], ["bash"])], [], open), undefined);
	});
	it("skips when the list changed this turn", () => {
		assert.equal(decideTurnCheck([user(), bash3(), snap([])], [], open), undefined);
	});
	it("skips with no open item; blocked is deferred, not open", () => {
		assert.equal(decideTurnCheck([user(), bash3()], [], [item(1, "completed")]), undefined);
		assert.equal(decideTurnCheck([user(), bash3()], [], [item(1, "blocked")]), undefined);
	});
	it("skips in plan mode", () => {
		const pm: Entry = { type: "custom", customType: "plan-mode", data: { enabled: true } };
		assert.equal(decideTurnCheck([pm, user(), bash3()], [], open), undefined);
	});
	it("skips after a completion-gate or plan-gate block in this turn (branch or drafts), not in an earlier turn", () => {
		const gate = (t: string): Entry => ({ type: "custom_message", customType: t, content: "x" });
		assert.equal(decideTurnCheck([user(), bash3(), gate("completion-gate")], [], open), undefined);
		assert.equal(decideTurnCheck([user(), bash3()], [gate("plan-gate")], open), undefined);
		assert.equal(decideTurnCheck([user(), gate("completion-gate"), user(), bash3()], [], open)?.kind, "list");
	});
	it("plan-linked open items are not listed (plan-gate covers plan execution)", () => {
		assert.equal(decideTurnCheck([user(), bash3()], [], [item(1, "in_progress", { planStep: 1 })]), undefined);
		const d = decideTurnCheck([user(), bash3()], [], [item(1, "in_progress", { planStep: 1 }), item(2, "pending")]);
		assert.match(d?.message ?? "", /#2 \[pending\]/);
		assert.doesNotMatch(d?.message ?? "", /#1 /);
	});
	it("lists at most 8 open items and counts the rest as '+N more'", () => {
		const many = Array.from({ length: 11 }, (_, i) => item(i + 1, "pending"));
		const d = decideTurnCheck([user(), bash3()], [], many);
		assert.match(d?.message ?? "", /#8 \[pending\]/);
		assert.doesNotMatch(d?.message ?? "", /#9 /);
		assert.match(d?.message ?? "", /\+3 more/);
	});
	it("skips when todo confirm ran this turn", () => {
		const d = decideTurnCheck([user(), bash3(), calls(["todo", { action: "confirm" }])], [], open);
		assert.equal(d, undefined);
	});
	it("A1: own item closed, no plan step advanced -> step nudge, even with few calls", () => {
		const before = snap([
			{ id: 1, status: "in_progress", planStep: 1 },
			{ id: 2, status: "pending" },
		]);
		const after = [item(1, "in_progress", { planStep: 1 }), item(2, "completed")];
		const d = decideTurnCheck([before, user(), calls(["todo"]), snap([])], [], after);
		assert.equal(d?.kind, "step");
		assert.match(d?.message ?? "", /\[DONE:n\]/);
	});
	it("A1: silent when the plan step advanced", () => {
		const before = snap([
			{ id: 1, status: "in_progress", planStep: 1 },
			{ id: 2, status: "pending" },
		]);
		const after = [item(1, "completed", { planStep: 1 }), item(2, "completed")];
		assert.equal(decideTurnCheck([before, user(), calls(["todo"]), snap([])], [], after), undefined);
	});
});

describe("registerTurnCheck", () => {
	const saved = { sync: process.env.NYCODE_TODO_SYNC_V2, sub: process.env.NYCODE_SUBAGENT };
	beforeEach(() => {
		process.env.NYCODE_TODO_SYNC_V2 = "1";
		delete process.env.NYCODE_SUBAGENT;
	});
	afterEach(() => {
		for (const [k, v] of [
			["NYCODE_TODO_SYNC_V2", saved.sync],
			["NYCODE_SUBAGENT", saved.sub],
		] as const) {
			if (v === undefined) delete process.env[k];
			else process.env[k] = v;
		}
	});

	function boot(branch: Entry[], settings: object = {}) {
		let handler: any;
		const bus: Record<string, Array<(d: unknown) => void>> = {};
		const nycode = {
			getSettings: () => settings,
			on: (_e: string, h: unknown) => {
				handler = h;
			},
			events: {
				emit: (c: string, d: unknown) => {
					for (const h of bus[c] ?? []) h(d);
				},
				on: (c: string, h: (d: unknown) => void) => {
					bus[c] = [...(bus[c] ?? []), h];
				},
			},
		};
		nycode.events.on(TODO_TURN_STATE_CHANNEL, (d) =>
			(d as TodoTurnStateRequest).reply({ items: [item(1, "pending")], takeFinished: () => [] }),
		);
		registerTurnCheck(nycode as unknown as ExtensionAPI);
		const ctx = { cwd: process.cwd(), sessionManager: { getBranch: () => branch } };
		return { ctx, settle: (entries: Entry[] = []) => handler?.({ entries }, ctx) };
	}

	it("blocks once: appends mark + message and continues; the marked branch is not blocked again", () => {
		const branch = [user(), bash3()];
		const b = boot(branch);
		const r = b.settle();
		assert.equal(r.continue, true);
		assert.deepEqual(
			r.entries.map((e: Entry) => `${e.type}:${e.customType}`),
			["custom:todo-turn-check", "custom_message:todo-turn-check"],
		);
		branch.push(...r.entries);
		assert.equal(b.settle(), undefined);
	});
	it("yields to a gate block already drafted in the same settle: one block only", () => {
		const draft: Entry = { type: "custom_message", customType: "completion-gate", content: "run the check" };
		const b = boot([user(), bash3()]);
		assert.equal(b.settle([{ type: "custom", customType: "completion-gate", data: {} }, draft]), undefined);
	});
	it("fails open: a throwing session read releases the turn", () => {
		const b = boot([user(), bash3()]);
		b.ctx.sessionManager.getBranch = () => {
			throw new Error("boom");
		};
		assert.equal(b.settle(), undefined);
	});
	it("todo.sync is read from nycode.getSettings: absent = off, true = on", () => {
		delete process.env.NYCODE_TODO_SYNC_V2;
		assert.equal(boot([user(), bash3()]).settle(), undefined);
		assert.equal(boot([user(), bash3()], { todo: { sync: true } }).settle()?.continue, true);
	});
	it("off = no handler effect", () => {
		process.env.NYCODE_TODO_SYNC_V2 = "0";
		assert.equal(boot([user(), bash3()]).settle(), undefined);
	});
	it("subagent registers nothing", () => {
		process.env.NYCODE_SUBAGENT = "1";
		assert.equal(boot([user(), bash3()]).settle(), undefined);
	});
});
