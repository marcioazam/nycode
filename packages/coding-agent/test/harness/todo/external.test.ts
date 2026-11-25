// todo.sync items for background events: one item per linkId, one reminder per finish, off = nothing.
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "vitest";
import runExtension from "../../../src/extensions/run/index.ts";
import { type RunRegistry, sharedRegistry } from "../../../src/extensions/run/registry.ts";
import { announceExternalFinish, announceExternalStart } from "../../../src/extensions/todo/external.ts";
import todoExtension from "../../../src/extensions/todo/index.ts";
import { fakeCtx, fakeNycode, type Loose } from "../plan-mode/support.ts";

const saved = process.env.NYCODE_TODO_SYNC_V2;
beforeEach(() => {
	process.env.NYCODE_TODO_SYNC_V2 = "1";
});
afterEach(() => {
	if (saved === undefined) delete process.env.NYCODE_TODO_SYNC_V2;
	else process.env.NYCODE_TODO_SYNC_V2 = saved;
});

function boot(withRun = false) {
	const fake = fakeNycode();
	todoExtension(fake.nycode);
	if (withRun) runExtension(fake.nycode);
	const ctx = fakeCtx({ cwd: process.cwd() });
	for (const h of fake.handlers.session_start) h({ reason: "startup" }, ctx);
	const list = async () =>
		(await fake.tools.todo.execute("t", { action: "list" }, undefined, undefined, ctx)).details.todos as Loose[];
	return { fake, ctx, list, cwd: process.cwd() };
}

describe("announceExternal*", () => {
	test("start adds one item per linkId; finish ok points at todo complete, once", async () => {
		const b = boot();
		announceExternalStart(b.fake.nycode, "run:a1", "run build");
		announceExternalStart(b.fake.nycode, "run:a1", "run build");
		const todos = await b.list();
		assert.equal(todos.length, 1);
		assert.equal(todos[0].linkId, "run:a1");
		const r = announceExternalFinish(b.fake.nycode, "run:a1", true, "exit 0");
		assert.match(r ?? "", /todo complete id=1/);
		assert.equal(announceExternalFinish(b.fake.nycode, "run:a1", true), undefined);
	});
	test("failed finish suggests todo fail with a reason", async () => {
		const b = boot();
		announceExternalStart(b.fake.nycode, "subagent:bg-1", "subagent worker bg-1");
		const r = announceExternalFinish(b.fake.nycode, "subagent:bg-1", false, "worker, failed");
		assert.match(r ?? "", /todo fail id=1/);
		assert.match(r ?? "", /worker, failed/);
	});
	test("finish without an item says nothing", () => {
		const b = boot();
		assert.equal(announceExternalFinish(b.fake.nycode, "run:none", false), undefined);
	});
	test("off: no item, no reminder, no event", async () => {
		process.env.NYCODE_TODO_SYNC_V2 = "0";
		const b = boot();
		announceExternalStart(b.fake.nycode, "run:a1", "run build");
		assert.equal(announceExternalFinish(b.fake.nycode, "run:a1", false), undefined);
		assert.equal((await b.list()).length, 0);
		assert.equal(b.fake.emitted.filter(([c]) => c === "nycode:todo-external").length, 0);
	});
});

describe("run extension", () => {
	function startRun(
		b: ReturnType<typeof boot>,
		awaited: boolean,
		event: Loose = {},
		finishFirst?: { exitCode?: number },
	) {
		const reg = sharedRegistry() as RunRegistry;
		const rec = reg.add({ name: "build", command: "make", cwd: b.cwd, awaited });
		if (finishFirst) reg.finish(rec, finishFirst);
		const toolResult = b.fake.handlers.tool_result.at(-1);
		toolResult(
			{
				toolName: "run",
				toolCallId: "x",
				input: { action: "start" },
				content: [{ type: "text", text: `iniciado ${rec.id} (pid 1)` }],
				...event,
			},
			b.ctx,
		);
		return { reg, rec };
	}

	test("awaited run: item on start, reminder appended to the finish message", async () => {
		const b = boot(true);
		const { reg, rec } = startRun(b, true);
		assert.equal((await b.list()).filter((t) => t.linkId === `run:${rec.id}`).length, 1);
		reg.finish(rec, { exitCode: 2 });
		assert.equal(b.fake.sent.length, 1);
		assert.match(b.fake.sent[0].content, /Run terminou/);
		assert.match(b.fake.sent[0].content, /todo fail id=/);
	});
	test("unawaited run: a quiet reminder message, no turn", async () => {
		const b = boot(true);
		const { reg, rec } = startRun(b, false);
		reg.finish(rec, { exitCode: 0 });
		assert.equal(b.fake.sent.length, 1);
		assert.match(b.fake.sent[0].content, /todo complete id=/);
	});
	test("off: the finish message is today's, unawaited sends nothing, no item", async () => {
		process.env.NYCODE_TODO_SYNC_V2 = "0";
		const b = boot(true);
		const { reg, rec } = startRun(b, true);
		const { reg: _r, rec: rec2 } = startRun(b, false);
		assert.equal((await b.list()).length, 0);
		reg.finish(rec, { exitCode: 0 });
		reg.finish(rec2, { exitCode: 0 });
		assert.equal(b.fake.sent.length, 1);
		assert.doesNotMatch(b.fake.sent[0].content, /todo|system-reminder/);
	});

	test("a run that already finished at tool_result gets no item (it would wait forever)", async () => {
		const b = boot(true);
		const { rec } = startRun(b, true, {}, { exitCode: 0 });
		assert.equal((await b.list()).filter((t) => t.linkId === `run:${rec.id}`).length, 0);
	});
	test("error result or a non-start action adds no item", async () => {
		const b = boot(true);
		startRun(b, true, { isError: true });
		startRun(b, true, { input: { action: "list" } });
		assert.equal((await b.list()).length, 0);
	});
	test("stopped run: the reminder says cancel, not fail", async () => {
		const b = boot(true);
		const { reg, rec } = startRun(b, false);
		rec.stopRequested = true;
		reg.finish(rec, { exitCode: 143 });
		assert.equal(b.fake.sent.length, 1);
		assert.match(b.fake.sent[0].content, /todo cancel id=/);
		assert.doesNotMatch(b.fake.sent[0].content, /todo fail/);
	});
	test("a waiter reads the result itself: no reminder, and the item stays for the model", async () => {
		const b = boot(true);
		const { reg, rec } = startRun(b, true);
		rec.waiters = 1;
		reg.finish(rec, { exitCode: 0 });
		assert.equal(b.fake.sent.length, 0); // no finish message, no reminder: the waiter delivers the result
	});
	test("a stale session cannot abort finish(): the finish message still goes out", () => {
		const b = boot(true);
		const { reg, rec } = startRun(b, true);
		b.fake.nycode.events.emit = () => {
			throw new Error("stale after session replacement");
		};
		assert.doesNotThrow(() => reg.finish(rec, { exitCode: 0 }));
		assert.equal(b.fake.sent.length, 1);
		assert.match(b.fake.sent[0].content, /Run terminou/);
	});
});
