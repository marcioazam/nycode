// todo statuses (failed/blocked/cancelled + reason), confirm, legacy replay, external items and the pure helpers.
import assert from "node:assert/strict";
import { test } from "vitest";
import {
	readTodoTurnState,
	TODO_EXTERNAL_CHANNEL,
	TODO_TURN_STATE_CHANNEL,
	type TodoSyncItem,
} from "../../../src/extensions/_shared/events/plan-mode-state.ts";
import todoExtension, { normalizeTodo } from "../../../src/extensions/todo/index.ts";
import {
	externalFinishReminder,
	isDeferred,
	isOpen,
	isTerminal,
	listChangedSince,
	modelOwnClosedWithoutStepAdvance,
} from "../../../src/extensions/todo/status.ts";

function boot(entries: any[] = [], settings: object = {}) {
	const bus = new Map<string, Array<(d: any) => void>>();
	const emitted: Array<[string, any]> = [];
	let tool: any;
	const handlers = new Map<string, (...a: any[]) => any>();
	const nycode: any = {
		events: {
			emit: (c: string, d: any) => {
				emitted.push([c, d]);
				for (const h of bus.get(c) ?? []) h(d);
			},
			on: (c: string, h: any) => bus.set(c, [...(bus.get(c) ?? []), h]),
		},
		getSettings: () => settings,
		on: (n: string, h: any) => handlers.set(n, h),
		registerShortcut: () => {},
		registerCommand: () => {},
		registerTool: (t: any) => {
			tool = t;
		},
		appendEntry: () => {},
	};
	todoExtension(nycode);
	const ctx: any = { hasUI: true, cwd: process.cwd(), sessionManager: { getBranch: () => entries } };
	handlers.get("session_start")?.({}, ctx);
	return { nycode, emitted, handlers, run: (p: any) => tool.execute("id", p, undefined, undefined, ctx) };
}

test("status helpers: open, deferred, terminal", () => {
	assert.deepEqual(["pending", "in_progress"].map(isOpen), [true, true]);
	assert.equal(isOpen("blocked"), false);
	assert.equal(isDeferred("blocked"), true);
	assert.deepEqual(["completed", "failed", "cancelled"].map(isTerminal), [true, true, true]);
	assert.equal(isTerminal("blocked"), false);
});

test("fail, block, cancel: status, reason, payload and validation", async () => {
	const b = boot();
	for (const t of ["a", "b", "c", "d"]) await b.run({ action: "add", text: t });
	assert.match((await b.run({ action: "fail", id: 1, reason: "gate red" })).content[0].text, /failed.*gate red/);
	await b.run({ action: "block", id: 2, reason: "waits CI" });
	await b.run({ action: "cancel", id: 3 });
	const list = (await b.run({ action: "list" })).details.todos;
	assert.deepEqual(
		list.map((t: any) => [t.status, t.reason]),
		[
			["failed", "gate red"],
			["blocked", "waits CI"],
			["cancelled", undefined],
			["pending", undefined],
		],
	);
	assert.equal((await b.run({ action: "fail" })).details.error, "id required for fail");
	assert.equal((await b.run({ action: "block", id: 99 })).details.error, "#99 not found");
	assert.match((await b.run({ action: "cancel", id: 1 })).details.error, /already failed/);
	assert.match((await b.run({ action: "block", id: 2 })).details.error, /already blocked/);
	b.handlers.get("tool_execution_end")?.({ toolName: "todo", isError: false });
	const payload = b.emitted.filter(([c]) => c === "nycode:todos").at(-1)![1];
	assert.deepEqual(payload[0], { id: 1, text: "a", status: "failed", reason: "gate red" });
	assert.deepEqual(payload[3], { id: 4, text: "d", status: "pending" });
	// start retries a failed item and clears its reason
	await b.run({ action: "start", id: 1 });
	assert.equal((await b.run({ action: "list" })).details.todos[0].reason, undefined);
});

test("confirm changes nothing and the turn state reads the items", async () => {
	const b = boot();
	await b.run({ action: "add", text: "a" });
	const before = (await b.run({ action: "list" })).details.todos;
	const r = await b.run({ action: "confirm" });
	assert.deepEqual(r.details.todos, before);
	assert.equal(readTodoTurnState(b.nycode.events)?.items.length, 1);
	assert.ok(b.emitted.some(([c]) => c === TODO_TURN_STATE_CHANNEL));
});

test("replay: legacy done, missing reason and unknown status", () => {
	assert.deepEqual(normalizeTodo({ id: 1, text: "a", done: true }), { id: 1, text: "a", status: "completed" });
	assert.equal(normalizeTodo({ id: 1, text: "a", status: "failed", reason: "x" }).reason, "x");
	assert.equal(normalizeTodo({ id: 1, text: "a", status: "weird" }).status, "pending");
	const b = boot([
		{
			type: "custom",
			customType: "nycode:todo",
			data: {
				todos: [
					{ id: 1, text: "a", status: "blocked", reason: "r" },
					{ id: 2, text: "b", done: true },
				],
				nextId: 3,
			},
		},
	]);
	return b.run({ action: "list" }).then((r: any) => {
		assert.deepEqual(
			r.details.todos.map((t: any) => t.status),
			["blocked", "completed"],
		);
	});
});

test("external add/finish only act with todo.sync on; add is idempotent per linkId", async () => {
	const off = boot();
	off.nycode.events.emit(TODO_EXTERNAL_CHANNEL, { op: "add", linkId: "run:1", text: "gate" });
	assert.equal((await off.run({ action: "list" })).details.todos.length, 0);

	process.env.NYCODE_TODO_SYNC_V2 = "1";
	try {
		const b = boot();
		const send = (d: object) => b.nycode.events.emit(TODO_EXTERNAL_CHANNEL, d);
		send({ op: "add", linkId: "run:1", text: "gate" });
		send({ op: "add", linkId: "run:1", text: "gate" });
		const todos = (await b.run({ action: "list" })).details.todos;
		assert.equal(todos.length, 1);
		assert.equal(todos[0].text, "aguardando gate");
		assert.equal(todos[0].linkId, "run:1");
		send({ op: "finish", linkId: "run:1", ok: false, detail: "exit 1" });
		send({ op: "finish", linkId: "other", ok: true });
		const state = readTodoTurnState(b.nycode.events)!;
		assert.deepEqual(state.takeFinished(), [{ linkId: "run:1", ok: false, detail: "exit 1", stopped: undefined }]);
		assert.deepEqual(state.takeFinished(), []);
		assert.match(externalFinishReminder(state.items, "run:1", false, "exit 1")!, /todo fail id=1/);
	} finally {
		delete process.env.NYCODE_TODO_SYNC_V2;
	}
});

test("todo.sync comes from nycode.getSettings (the trust-resolved settings), not from files read here", async () => {
	const on = boot([], { todo: { sync: true } });
	on.nycode.events.emit(TODO_EXTERNAL_CHANNEL, { op: "add", linkId: "run:1", text: "gate" });
	assert.equal((await on.run({ action: "list" })).details.todos.length, 1);
	const off = boot([], {});
	off.nycode.events.emit(TODO_EXTERNAL_CHANNEL, { op: "add", linkId: "run:1", text: "gate" });
	assert.equal((await off.run({ action: "list" })).details.todos.length, 0);
});

test("a settings read that throws (stale session) leaves todo.sync off instead of throwing", () => {
	const b = boot();
	b.nycode.getSettings = () => {
		throw new Error("stale after session replacement");
	};
	assert.doesNotThrow(() => b.nycode.events.emit(TODO_EXTERNAL_CHANNEL, { op: "add", linkId: "run:1", text: "x" }));
});

test("stopped finish reminder says cancel, not fail", () => {
	const items = [{ id: 4, text: "aguardando run x", status: "pending", linkId: "run:1" }] as TodoSyncItem[];
	const r = externalFinishReminder(items, "run:1", false, "x, exit ?", true)!;
	assert.match(r, /todo cancel id=4/);
	assert.doesNotMatch(r, /todo fail/);
});

const item = (id: number, status: TodoSyncItem["status"], planStep?: number): TodoSyncItem => ({
	id,
	text: `t${id}`,
	status,
	planStep,
});

test("externalFinishReminder: unknown or closed item gives nothing; success suggests complete", () => {
	const items = [
		{ ...item(1, "pending"), linkId: "a" },
		{ ...item(2, "completed"), linkId: "b" },
	];
	assert.equal(externalFinishReminder(items, "zz", true), undefined);
	assert.equal(externalFinishReminder(items, "b", true), undefined);
	assert.match(externalFinishReminder(items, "a", true)!, /todo complete id=1/);
});

test("modelOwnClosedWithoutStepAdvance", () => {
	const before = [item(1, "pending", 1), item(2, "in_progress")];
	assert.equal(modelOwnClosedWithoutStepAdvance(before, [item(1, "pending", 1), item(2, "completed")]), true);
	assert.equal(modelOwnClosedWithoutStepAdvance(before, [item(1, "completed", 1), item(2, "completed")]), false);
	assert.equal(modelOwnClosedWithoutStepAdvance(before, before), false);
	assert.equal(modelOwnClosedWithoutStepAdvance([item(2, "pending")], [item(2, "completed")]), false); // no plan
});

test("listChangedSince: only a todo snapshot after the turn start counts", () => {
	const snap = { type: "custom", customType: "nycode:todo", data: {} } as any;
	const msg = { type: "message" } as any;
	assert.equal(listChangedSince([snap, msg, msg], 1), false);
	assert.equal(listChangedSince([msg, snap], 1), true);
});
