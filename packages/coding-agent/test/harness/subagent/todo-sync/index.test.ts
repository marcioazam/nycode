// todo.sync call site of a resumed background subagent (subagent/index.ts): the finish carries the reminder.
import assert from "node:assert/strict";
import { afterEach, beforeEach, test, vi } from "vitest";
import subagentExtension from "../../../../src/extensions/subagent/index.ts";
import todoExtension from "../../../../src/extensions/todo/index.ts";
import { fakeCtx, fakeNycode, type Loose } from "../../plan-mode/support.ts";

vi.mock("../../../../src/extensions/subagent/fleet/background.ts", async (importOriginal) => ({
	...(await importOriginal<typeof import("../../../../src/extensions/subagent/fleet/background.ts")>()),
	resumeBackgroundRun: (id: string, _task: string, onComplete: (run: Loose) => void) => {
		onComplete({ id, agent: "worker", state: "done", turns: 1, output: "ok" });
		return "resumed";
	},
}));

const saved = process.env.NYCODE_TODO_SYNC_V2;
beforeEach(() => {
	process.env.NYCODE_TODO_SYNC_V2 = "1";
});
afterEach(() => {
	if (saved === undefined) delete process.env.NYCODE_TODO_SYNC_V2;
	else process.env.NYCODE_TODO_SYNC_V2 = saved;
});

async function resume() {
	const fake = fakeNycode();
	todoExtension(fake.nycode);
	subagentExtension(fake.nycode);
	const ctx = fakeCtx({ cwd: process.cwd(), hasUI: false });
	for (const h of fake.handlers.session_start) h({ reason: "startup" }, ctx);
	fake.nycode.events.emit("nycode:todo-external", {
		op: "add",
		linkId: "subagent:bg-9",
		text: "subagent worker bg-9",
	});
	await fake.tools.subagent.execute("t", { resume: "bg-9", task: "go" }, undefined, undefined, ctx);
	return fake.sent.filter((m: Loose) => m.customType === "subagent-background");
}

test("a resumed run finishing reminds about its linked todo item", async () => {
	const sent = await resume();
	assert.equal(sent.length, 1);
	assert.match(sent[0].content, /todo complete id=1/);
});

test("off: the completion message has no reminder", async () => {
	process.env.NYCODE_TODO_SYNC_V2 = "0";
	const sent = await resume();
	assert.equal(sent.length, 1);
	assert.doesNotMatch(sent[0].content, /system-reminder/);
});
