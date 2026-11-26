// todo.sync call sites of the background subagent: start adds "aguardando" item `subagent:<id>`, finish adds the reminder.
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test, vi } from "vitest";
import type { ExtensionAPI } from "../../../../src/core/extensions/types.ts";
import { runBackgroundMode } from "../../../../src/extensions/subagent/core/modes.ts";
import type { AgentConfig } from "../../../../src/extensions/subagent/registry/agents.ts";
import todoExtension from "../../../../src/extensions/todo/index.ts";
import { fakeCtx, fakeNycode, type Loose } from "../../plan-mode/support.ts";

const captured: { onComplete?: (run: Loose) => void } = {};
vi.mock("../../../../src/extensions/subagent/fleet/background.ts", async (importOriginal) => ({
	...(await importOriginal<typeof import("../../../../src/extensions/subagent/fleet/background.ts")>()),
	startBackgroundRun: (
		_agent: string,
		_task: string,
		_spawn: unknown,
		onComplete: (run: Loose) => void,
		id: string,
	) => {
		captured.onComplete = onComplete;
		return id;
	},
}));

const agent: AgentConfig = {
	name: "worker",
	description: "d",
	systemPrompt: "",
	source: "user",
	filePath: "/x/worker.md",
};
const saved = process.env.NYCODE_TODO_SYNC_V2;
beforeEach(() => {
	process.env.NYCODE_TODO_SYNC_V2 = "1";
});
afterEach(() => {
	if (saved === undefined) delete process.env.NYCODE_TODO_SYNC_V2;
	else process.env.NYCODE_TODO_SYNC_V2 = saved;
});

async function start() {
	const fake = fakeNycode();
	todoExtension(fake.nycode);
	const ctx = fakeCtx({ cwd: process.cwd() });
	for (const h of fake.handlers.session_start) h({ reason: "startup" }, ctx);
	const sent: Loose[] = [];
	const result = await runBackgroundMode(
		{ agent: "worker", task: "do it", cwd: "/tmp" } as Loose,
		{
			agents: [agent],
			defaultCwd: process.cwd(),
			nycode: fake.nycode as ExtensionAPI,
			deliver: (d: Loose) => d({ ...fake.nycode, sendMessage: (m: Loose) => sent.push(m) }, true),
			makeDetails: () => () => ({}) as Loose,
			skillRoots: [],
			availableModels: [],
			projectApproved: false,
		} as Loose,
	);
	const todos = async () =>
		(await fake.tools.todo.execute("t", { action: "list" }, undefined, undefined, ctx)).details.todos as Loose[];
	return { result, sent, todos };
}

describe("runBackgroundMode todo.sync", () => {
	test("start adds an item linked to subagent:<id>; finish appends the reminder to the completion message", async () => {
		const b = await start();
		const todos = await b.todos();
		assert.equal(todos.length, 1);
		assert.match(todos[0].linkId, /^subagent:bg-/);
		assert.match(todos[0].text, /aguardando subagent worker bg-/);
		const id = todos[0].linkId.slice("subagent:".length);
		captured.onComplete?.({ id, agent: "worker", state: "done", turns: 1, output: "ok" });
		assert.equal(b.sent.length, 1);
		assert.match(b.sent[0].content, /todo complete id=1/);
	});
	test("off: no item and the completion message is the plain one", async () => {
		process.env.NYCODE_TODO_SYNC_V2 = "0";
		const b = await start();
		assert.equal((await b.todos()).length, 0);
		captured.onComplete?.({ id: "bg-x", agent: "worker", state: "done", turns: 1, output: "ok" });
		assert.equal(b.sent.length, 1);
		assert.doesNotMatch(b.sent[0].content, /system-reminder/);
	});
});
