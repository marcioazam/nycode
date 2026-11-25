// Upstream parity (1.8–1.10): Claude Code's background commands on Nycode. bash run_in_background starts a run of
// the shared registry, task_stop stops it, Claude's BASH_*_TIMEOUT_MS env vars move the timeout policy, the guard and
// Bash-matched hooks judge a monitor command as Bash, and the monitor tool shapes stdout lines into rate-limited events.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ExtensionAPI, ExtensionToolContext } from "../../../src/core/extensions/types.ts";
import { createBashToolDefinition } from "../../../src/core/tools/bash.ts";
import { applyBashTimeout, decideTimeout } from "../../../src/core/tools/bash-timeout.ts";
import { backgroundShell } from "../../../src/extensions/_shared/seams/background-shell.ts";
import { claudePreCall } from "../../../src/extensions/hooks/claude-tools.ts";
import { deadlineMs, eventGate, lineBatcher, MAX_DEADLINE_MS } from "../../../src/extensions/monitor/events.ts";
import monitorExtension from "../../../src/extensions/monitor/index.ts";
import { sharedRegistry } from "../../../src/extensions/run/registry.ts";
import { registerTaskSurface } from "../../../src/extensions/run/tool.ts";

const dir = mkdtempSync(join(tmpdir(), "bg-"));
const savedRuns = process.env.NYCODE_RUNS_DIR;
beforeAll(() => {
	process.env.NYCODE_RUNS_DIR = dir;
});
afterAll(() => {
	if (savedRuns === undefined) delete process.env.NYCODE_RUNS_DIR;
	else process.env.NYCODE_RUNS_DIR = savedRuns;
	backgroundShell.set(undefined);
	rmSync(dir, { recursive: true });
});

const textOf = (r: { content: Array<{ type: string; text?: string }> }): string => r.content[0]?.text ?? "";

describe("timeout policy env", () => {
	it("BASH_DEFAULT_TIMEOUT_MS replaces the default and BASH_MAX_TIMEOUT_MS the cap (at least the default)", () => {
		expect(decideTimeout(undefined, { BASH_DEFAULT_TIMEOUT_MS: "120000" })).toBe(120);
		expect(decideTimeout(5000, { BASH_MAX_TIMEOUT_MS: "3600000" })).toBe(3600);
		expect(decideTimeout(5000, { BASH_MAX_TIMEOUT_MS: "60000" })).toBe(600);
		expect(decideTimeout(5000, { BASH_DEFAULT_TIMEOUT_MS: "90000", BASH_MAX_TIMEOUT_MS: "60000" })).toBe(90);
		expect(decideTimeout(undefined, { BASH_DEFAULT_TIMEOUT_MS: "nope" })).toBe(600);
	});

	it("CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1 stops a command at its timeout instead of backgrounding it", () => {
		process.env.CLAUDE_CODE_DISABLE_BACKGROUND_TASKS = "1";
		try {
			expect(applyBashTimeout("make", 5, "id", true).command).toBe("make");
		} finally {
			delete process.env.CLAUDE_CODE_DISABLE_BACKGROUND_TASKS;
		}
	});
});

describe("bash run_in_background", () => {
	const ui = { cwd: dir, hasUI: true } as unknown as ExtensionToolContext;

	it("refuses without the run extension or a UI instead of blocking in the foreground", async () => {
		const bash = createBashToolDefinition(dir);
		backgroundShell.set(undefined);
		await expect(
			bash.execute("t", { command: "true", run_in_background: true }, undefined, undefined, ui),
		).rejects.toThrow(/not available/);
		backgroundShell.set(() => ({ id: "x", logPath: "/l" }));
		const headless = { cwd: dir, hasUI: false } as unknown as ExtensionToolContext;
		await expect(
			bash.execute("t", { command: "true", run_in_background: true }, undefined, undefined, headless),
		).rejects.toThrow(/not available/);
	});

	it("hands the command to the registered starter and returns its id and log", async () => {
		const started: string[] = [];
		backgroundShell.set((command, cwd) => {
			started.push(`${cwd}:${command}`);
			return { id: "r1", logPath: "/tmp/r1.log" };
		});
		const result = await createBashToolDefinition(dir).execute(
			"t",
			{ command: "npm run dev", run_in_background: true },
			undefined,
			undefined,
			ui,
		);
		expect(started).toEqual([`${dir}:npm run dev`]);
		expect(textOf(result)).toContain(
			"Command running in background with ID: r1. Output is being written to: /tmp/r1.log",
		);
	});
});

describe("task_stop", () => {
	it("stops a run by task_id (shell_id accepted) and reports unknown ids", async () => {
		let tool:
			| { execute: (...a: unknown[]) => Promise<{ content: Array<{ type: string; text?: string }> }> }
			| undefined;
		const reg = sharedRegistry();
		registerTaskSurface({ registerTool: (t: typeof tool) => (tool = t) } as unknown as ExtensionAPI, reg);
		const rec = reg.add({ name: "x", command: "x", cwd: dir });
		rec.state = "done";
		expect(textOf(await (tool as NonNullable<typeof tool>).execute("i", { shell_id: rec.id }))).toBe(
			`Background command ${rec.id} is not running.`,
		);
		await expect((tool as NonNullable<typeof tool>).execute("i", { task_id: "nope" })).rejects.toThrow(
			/No background/,
		);
		await expect((tool as NonNullable<typeof tool>).execute("i", {})).rejects.toThrow(/task_id is required/);
	});
});

describe("monitor command under Bash rules", () => {
	it("is judged as a Bash call by the guard and hooks", () => {
		expect(claudePreCall("monitor", { command: "tail -F x", description: "d" }, dir)).toEqual({
			name: "Bash",
			input: { command: "tail -F x" },
		});
	});
});

describe("monitor events", () => {
	it("batches lines within the window, trims blanks and cuts long lines", () => {
		const out: string[] = [];
		let now = 0;
		const b = lineBatcher({ emit: (e) => out.push(e), windowMs: 200, now: () => now });
		b.push("a\n\n  b  \n");
		now = 250;
		b.push(`${"x".repeat(600)}\nrest`);
		expect(out).toEqual(["a\nb"]);
		expect(b.drain()).toBe(`${"x".repeat(500)}...(truncated)\nrest`);
	});

	it("sends a burst, suppresses past it, reports the count, and stops after a long suppression", () => {
		let now = 0;
		const sent: string[] = [];
		const stops: string[] = [];
		const gate = eventGate({
			send: (e) => sent.push(e),
			stop: (n) => stops.push(n),
			capacity: 2,
			refillMs: 1000,
			suppressionLimitMs: 5000,
			now: () => now,
		});
		for (const e of ["1", "2", "3", "4"]) gate.offer(e);
		expect(sent).toEqual(["1", "2"]);
		now = 1000;
		gate.offer("5");
		expect(sent.slice(2)).toEqual([
			"[2 events suppressed: output rate too high. Consider using task_stop to restart this monitor with a more selective filter.]",
			"5",
		]);
		for (let i = 0; i < 12; i++) {
			now += 500;
			gate.offer("flood");
			gate.offer("flood");
			gate.offer("flood");
		}
		expect(stops[0]).toMatch(/^\[Monitor stopped: too much output/);
	});

	it("deadlines default to 5 min, cap at 30 and refuse under a second", () => {
		expect(deadlineMs(undefined)).toBe(300_000);
		expect(deadlineMs(10 * MAX_DEADLINE_MS)).toBe(MAX_DEADLINE_MS);
		expect(() => deadlineMs(10)).toThrow(/at least/);
	});
});

describe("monitor tool", () => {
	it("delivers stdout lines as events and one end notice; refuses without a UI", async () => {
		const handlers = new Map<string, (e: unknown, c: unknown) => void>();
		const messages: string[] = [];
		let tool:
			| { execute: (...a: unknown[]) => Promise<{ content: Array<{ type: string; text?: string }> }> }
			| undefined;
		const api = {
			on: (n: string, h: (e: unknown, c: unknown) => void) => handlers.set(n, h),
			registerTool: (t: typeof tool) => (tool = t),
			getActiveTools: () => ["bash", "monitor"],
			setActiveTools: () => {},
			sendMessage: (m: { content: string }) => messages.push(m.content),
		};
		monitorExtension(api as unknown as ExtensionAPI);
		handlers.get("session_start")?.({}, { sessionManager: { getBranch: () => [] } });
		const run = tool as NonNullable<typeof tool>;
		await expect(
			run.execute("i", { description: "d", command: "echo hi" }, undefined, undefined, { hasUI: false, cwd: dir }),
		).rejects.toThrow(/without a UI/);
		const started = await run.execute(
			"i",
			{ description: "eco", command: "echo one; echo two >&2; echo three" },
			undefined,
			undefined,
			{ hasUI: true, cwd: dir },
		);
		expect(textOf(started)).toMatch(/^Monitor started with ID: \S+\./);
		for (let i = 0; i < 100 && !messages.some((m) => m.includes("ended")); i++)
			await new Promise((r) => setTimeout(r, 20));
		const all = messages.join("\n");
		expect(all).toMatch(/Monitor \S+ \("eco"\) output:\none\nthree/);
		expect(all).not.toContain("two");
		expect(all).toMatch(/ended: the command exited with code 0/);
	});
});

describe("a Bash-matched hook rewriting a monitor or run command", () => {
	it("replaces the command and keeps the tool's own fields", async () => {
		const { runPreToolUse } = await import("../../../src/extensions/hooks/decisions.ts");
		const stdout = JSON.stringify({ hookSpecificOutput: { updatedInput: { command: "safe" } } });
		const config = { PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command" as const, command: "h" }] }] };
		const runner = async () => ({ code: 0, stdout, stderr: "", timedOut: false });
		const monitorInput = { command: "tail -F x", description: "logs", timeout_ms: 2000 };
		await runPreToolUse(config, "monitor", monitorInput, runner);
		expect(monitorInput).toEqual({ command: "safe", description: "logs", timeout_ms: 2000 });
		const runInput = { action: "start", command: "make", name: "build" };
		await runPreToolUse(config, "run", runInput, runner);
		expect(runInput).toEqual({ action: "start", command: "safe", name: "build" });
	});
});
