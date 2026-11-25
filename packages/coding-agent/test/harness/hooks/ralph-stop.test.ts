// The ralph-loop Stop hook is registered only while a /ralph-loop state file exists in the session's directory, and
// the embedded script returns the loop's prompt until the iteration limit.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getBuiltinResourcesRoot } from "../../../src/core/builtin-resources.ts";
import type { ExtensionAPI, ExtensionContext } from "../../../src/core/extensions/types.ts";
import { ralphStopMatchers } from "../../../src/extensions/hooks/bridge/ralph-stop.ts";
import { registerStopEvents } from "../../../src/extensions/hooks/bridge/stop-events.ts";
import type { HookCommand } from "../../../src/extensions/hooks/config.ts";

let work: string;
beforeEach(() => {
	work = mkdtempSync(join(tmpdir(), "ralph-stop-"));
});
afterEach(() => rmSync(work, { recursive: true }));

const stateFile = () => join(work, ".claude", "ralph-loop.local.md");
const writeState = (iteration: number, max = 2) => {
	mkdirSync(join(work, ".claude"), { recursive: true });
	writeFileSync(
		stateFile(),
		`---\nactive: true\niteration: ${iteration}\nsession_id: s1\nmax_iterations: ${max}\ncompletion_promise: null\nstarted_at: "x"\n---\nKeep going\n`,
	);
};

describe("ralphStopMatchers", () => {
	it("is empty without a loop state file", () => {
		expect(ralphStopMatchers(work)).toEqual([]);
	});

	it("is the embedded stop-hook command once a loop has started", () => {
		writeState(1);
		const [group] = ralphStopMatchers(work);
		expect(group?.hooks).toHaveLength(1);
		expect(group?.hooks[0]?.command).toContain("ralph-loop/hooks/stop-hook.sh");
	});
});

describe("Stop bridge", () => {
	/** Runs one agent_end on a bridge with no Stop hooks of its own; returns the commands that ran and the messages sent. */
	async function stopTurn(options: { userHooksAllowed?: boolean } = {}) {
		const handlers = new Map<string, (event: unknown, ctx: ExtensionContext) => Promise<void>>();
		const sent: string[] = [];
		const ran: HookCommand[] = [];
		const api = {
			on: (name: string, fn: (event: unknown, ctx: ExtensionContext) => Promise<void>) => handlers.set(name, fn),
			sendMessage: (message: { content: string }) => sent.push(message.content),
		};
		registerStopEvents(api as unknown as ExtensionAPI, {
			getConfig: () => ({}),
			boundRunner: () => async (command) => {
				ran.push(command);
				return { code: 0, stdout: '{"decision":"block","reason":"Keep going"}', stderr: "", timedOut: false };
			},
			getAgentIdentity: () => undefined,
			inSubagentChild: () => false,
			userHooksAllowed: () => options.userHooksAllowed ?? true,
		});
		const ctx = { cwd: work, ui: { notify: vi.fn() } } as unknown as ExtensionContext;
		await handlers.get("agent_end")?.({ messages: [] }, ctx);
		return { ran, sent };
	}

	it("runs no hook when no loop is active", async () => {
		expect(await stopTurn()).toEqual({ ran: [], sent: [] });
	});

	it("feeds the loop's prompt back while a loop is active", async () => {
		writeState(1);
		const { ran, sent } = await stopTurn();
		expect(ran).toHaveLength(1);
		expect(sent).toEqual(["Keep going"]);
	});

	it("does not register the hook under disableAllHooks or allowManagedHooksOnly", async () => {
		writeState(1);
		expect(await stopTurn({ userHooksAllowed: false })).toEqual({ ran: [], sent: [] });
	});
});

describe("embedded stop-hook script", () => {
	const script = join(getBuiltinResourcesRoot(), "ralph-loop", "hooks", "stop-hook.sh");
	const run = (input: object) =>
		spawnSync("bash", [script], { cwd: work, input: JSON.stringify(input), encoding: "utf8" });

	it("exits 0 and prints nothing without a loop state file", () => {
		const result = run({ session_id: "s1" });
		expect([result.status, result.stdout, result.stderr]).toEqual([0, "", ""]);
	});

	it("returns the prompt as a block decision, and cancels at the iteration limit", () => {
		writeState(1);
		const transcript = join(work, "t.jsonl");
		writeFileSync(
			transcript,
			`${JSON.stringify({ role: "assistant", message: { content: [{ type: "text", text: "x" }] } })}\n`,
		);
		const first = run({ session_id: "s1", transcript_path: transcript });
		expect(first.status).toBe(0);
		expect(JSON.parse(first.stdout)).toMatchObject({ decision: "block", reason: "Keep going" });
		writeState(2);
		const last = run({ session_id: "s1", transcript_path: transcript });
		expect(last.status).toBe(0);
		expect(last.stdout).toContain("Max iterations (2) reached");
		expect(last.stdout).not.toContain("decision");
		expect(existsSync(stateFile())).toBe(false);
	});
});
