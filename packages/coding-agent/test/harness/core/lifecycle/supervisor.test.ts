// Native supervisor: headless and TTY rules, the request validation, the relaunch arguments, and an end-to-end run
// against a fake CLI (real child processes, no model, no credential, no terminal).
import { spawn } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { markLifecycleRoot } from "../../../../src/core/lifecycle/launch.ts";
import { type RestartPlan, readRequest, relaunchArgs } from "../../../../src/core/lifecycle/request.ts";
import {
	isHeadless,
	type SupervisorDeps,
	shouldSupervise,
	superviseIfInteractive,
} from "../../../../src/core/lifecycle/supervisor.ts";
import { restartRequest } from "../../../../src/extensions/claude-compat/lifecycle/restart.ts";

const roots: string[] = [];
const tmp = () => {
	const dir = mkdtempSync(join(tmpdir(), "nycode-sup-test-"));
	roots.push(dir);
	return dir;
};
afterAll(() => {
	for (const r of roots) rmSync(r, { recursive: true, force: true });
});

const uid = process.getuid?.();
const perm = { mode: "default" as const, bypass: false, eligible: false, optin: false };

function requestFile(dir: string, text: string, mode = 0o600): string {
	const file = join(dir, "restart.json");
	writeFileSync(file, text, { mode });
	chmodSync(file, mode);
	return file;
}
const body = (over: Record<string, unknown> = {}) =>
	`${JSON.stringify({ v: 2, sessionFile: "/s/a.jsonl", permission: { mode: "default", bypass: 0, eligible: 0, optin: 0 }, argc: 2, flagValues: [], ...over })}\n`;
const launch = { argc: 2, eligible: false, bypass: false };

describe("headless runs are never supervised", () => {
	it.each([
		["-p"],
		["--print"],
		["--mode", "rpc"],
		["--mode=json"],
		["--export", "x"],
		["--export=x"],
		["--list-models"],
		["--list-models=x"],
		["-h"],
		["--help"],
		["-v"],
		["--version"],
	])("%s", (...args) => expect(isHeadless(args)).toBe(true));
	it("an interactive launch and flags after -- are not headless", () => {
		expect(isHeadless([])).toBe(false);
		expect(isHeadless(["--model", "x", "hello"])).toBe(false);
		expect(isHeadless(["--", "-p"])).toBe(false);
	});
});

describe("shouldSupervise", () => {
	const deps = (over: Partial<SupervisorDeps>): SupervisorDeps =>
		({ env: {}, isTty: () => true, ...over }) as SupervisorDeps;
	it("supervises an interactive terminal run only once", () => {
		expect(shouldSupervise([], deps({}))).toBe(true);
		expect(shouldSupervise([], deps({ isTty: () => false }))).toBe(false);
		expect(shouldSupervise(["-p"], deps({}))).toBe(false);
		expect(shouldSupervise([], deps({ env: { NYCODE_RESTART_WRAPPER_PID: "5" } }))).toBe(false);
		expect(shouldSupervise([], deps({ env: { NYCODE_SUBAGENT: "1" } }))).toBe(false);
	});
});

describe("request validation", () => {
	it("accepts a v2 request of ours, mode 0600, one line", () => {
		const read = readRequest(requestFile(tmp(), body()), launch, uid);
		expect(read.kind).toBe("plan");
	});
	it("takes the extension's own output", () => {
		const text = restartRequest({ sessionFile: "/s/a.jsonl", permission: perm, argc: 2, flagValues: [1] });
		const read = readRequest(requestFile(tmp(), text), launch, uid);
		expect(read).toMatchObject({ kind: "plan", plan: { sessionFile: "/s/a.jsonl", flagValues: [1] } });
	});
	it("none when the file is absent", () => {
		expect(readRequest(join(tmp(), "restart.json"), launch, uid).kind).toBe("none");
	});
	it.each([
		["mode 0644", () => requestFile(tmp(), body(), 0o644)],
		["two lines", () => requestFile(tmp(), `${body()}${body()}`)],
		["not JSON", () => requestFile(tmp(), "nope\n")],
		["wrong version", () => requestFile(tmp(), body({ v: 1 }))],
		["relative session", () => requestFile(tmp(), body({ sessionFile: "a.jsonl" }))],
		[
			"unknown mode",
			() => requestFile(tmp(), body({ permission: { mode: "plan", bypass: 0, eligible: 0, optin: 0 } })),
		],
		[
			"bypassPermissions without bypass",
			() =>
				requestFile(tmp(), body({ permission: { mode: "bypassPermissions", bypass: 0, eligible: 0, optin: 0 } })),
		],
		["argc differs from the launch", () => requestFile(tmp(), body({ argc: 3 }))],
		["flag value index out of range", () => requestFile(tmp(), body({ flagValues: [2] }))],
		[
			"bypass without eligibility or opt-in",
			() => requestFile(tmp(), body({ permission: { mode: "default", bypass: 1, eligible: 0, optin: 0 } })),
		],
		[
			"symlink",
			() => {
				const dir = tmp();
				const target = requestFile(dir, body());
				const link = join(dir, "link.json");
				symlinkSync(target, link);
				return link;
			},
		],
	])("invalid: %s", (_name, make) => {
		expect(readRequest(make(), launch, uid).kind).toBe("invalid");
	});
	it("a file of another owner is invalid", () => {
		expect(readRequest(requestFile(tmp(), body()), launch, (uid ?? 0) + 1).kind).toBe("invalid");
	});
	it("eligibility never rises above the original launch", () => {
		const text = body({ permission: { mode: "default", bypass: 1, eligible: 1, optin: 1 } });
		const low = readRequest(requestFile(tmp(), text), launch, uid);
		expect(low).toMatchObject({ kind: "plan", plan: { eligible: false }, needsBypassConfirm: true });
		const high = readRequest(requestFile(tmp(), text), { ...launch, eligible: true }, uid);
		expect(high).toMatchObject({ kind: "plan", plan: { eligible: true }, needsBypassConfirm: false });
	});
	it("a launch that already had bypass reopens without asking", () => {
		const text = body({ permission: { mode: "acceptEdits", bypass: 1, eligible: 0, optin: 1 } });
		expect(readRequest(requestFile(tmp(), text), { ...launch, bypass: true }, uid)).toMatchObject({
			kind: "plan",
			plan: { mode: "acceptEdits" },
			needsBypassConfirm: false,
		});
	});
	it("legacy bypassPermissions becomes default plus bypass", () => {
		const text = body({ permission: { mode: "bypassPermissions", bypass: 1, eligible: 1, optin: 0 } });
		expect(readRequest(requestFile(tmp(), text), { ...launch, eligible: true }, uid)).toMatchObject({
			plan: { mode: "default", bypass: true },
		});
	});
});

describe("relaunch arguments", () => {
	const plan = (flagValues: number[] = []): RestartPlan => ({
		sessionFile: "/s/a.jsonl",
		mode: "default",
		bypass: false,
		eligible: false,
		optin: false,
		flagValues,
	});
	it("keeps flags, drops the prompt, @files and session selectors, reopens the same session", () => {
		expect(
			relaunchArgs(
				["--model", "m", "--session", "old", "-c", "--name", "n", "--no-session", "hello", "@f.md", "--yolo"],
				plan(),
			),
		).toEqual(["--session", "/s/a.jsonl", "--model", "m", "--yolo"]);
	});
	it("drops everything after --", () => {
		expect(relaunchArgs(["--thinking", "high", "--", "--model", "m"], plan())).toEqual([
			"--session",
			"/s/a.jsonl",
			"--thinking",
			"high",
		]);
	});
	it("drops attached selectors and keeps attached values", () => {
		expect(relaunchArgs(["--session=x", "--fork=y", "--theme=dark", "--resume", "-r"], plan())).toEqual([
			"--session",
			"/s/a.jsonl",
			"--theme=dark",
		]);
	});
	it("keeps the value of an extension flag the request marked by index", () => {
		expect(relaunchArgs(["--ext-flag", "value", "prompt"], plan([1]))).toEqual([
			"--session",
			"/s/a.jsonl",
			"--ext-flag",
			"value",
		]);
		expect(relaunchArgs(["--ext-flag", "value"], plan())).toEqual(["--session", "/s/a.jsonl", "--ext-flag"]);
	});
});

describe("lifecycle root marker", () => {
	it("only the child of the supervisor becomes the root", () => {
		const own: NodeJS.ProcessEnv = { NYCODE_RESTART_WRAPPER_PID: String(process.ppid) };
		markLifecycleRoot(own);
		expect(own.NYCODE_LIFECYCLE_ROOT_PID).toBe(String(process.pid));
		const other: NodeJS.ProcessEnv = { NYCODE_RESTART_WRAPPER_PID: "1" };
		markLifecycleRoot(other);
		expect(other.NYCODE_LIFECYCLE_ROOT_PID).toBeUndefined();
	});
});

/** A fake CLI: records its arguments and environment, and asks for a restart `times` times. */
function fakeCli(dir: string, opts: { restarts: number; exitCode?: number; sleep?: boolean }): string {
	const script = join(dir, "fake-cli.mjs");
	const log = join(dir, "log.jsonl");
	writeFileSync(
		script,
		`import { appendFileSync, readFileSync, renameSync, writeFileSync } from "node:fs";
const args = process.argv.slice(2);
const env = process.env;
appendFileSync(${JSON.stringify(log)}, JSON.stringify({ args, wrapper: env.NYCODE_RESTART_WRAPPER_PID, ppid: process.ppid, mode: env.NYCODE_PERMISSION_MODE, bypass: env.NYCODE_BYPASS_PERMISSIONS, optin: env.NYCODE_BYPASS_OPTIN }) + "\\n");
${opts.sleep ? "setTimeout(() => {}, 60000);" : ""}
const runs = readFileSync(${JSON.stringify(log)}, "utf8").trim().split("\\n").length;
if (${opts.sleep ? "false" : "true"} && runs <= ${opts.restarts}) {
  const tmp = env.NYCODE_RESTART_REQUEST_FILE + ".tmp";
  writeFileSync(tmp, JSON.stringify({ v: 2, sessionFile: "/s/a.jsonl", permission: { mode: "acceptEdits", bypass: 0, eligible: 0, optin: 0 }, argc: args.length, flagValues: [] }) + "\\n", { mode: 0o600 });
  renameSync(tmp, env.NYCODE_RESTART_REQUEST_FILE);
}
${opts.sleep ? "" : `process.exit(${opts.exitCode ?? 0});`}
`,
	);
	return script;
}

class Exited extends Error {
	code: number;
	constructor(code: number) {
		super(`exit ${code}`);
		this.code = code;
	}
}

function depsFor(script: string, over: Partial<SupervisorDeps> = {}, logs: string[] = []): SupervisorDeps {
	return {
		env: { PATH: process.env.PATH, XDG_RUNTIME_DIR: tmp(), NYCODE_BYPASS_ELIGIBLE: "0" },
		pid: process.pid,
		uid,
		isTty: () => true,
		command: (args) => ({ file: process.execPath, args: [script, ...args] }),
		spawnChild: (file, args, env) => spawn(file, args, { stdio: "ignore", env }),
		confirmBypass: async () => false,
		log: (m) => logs.push(m),
		exit: (code) => {
			throw new Exited(code);
		},
		...over,
	};
}

const run = async (deps: SupervisorDeps, args: string[]): Promise<number> => {
	try {
		await superviseIfInteractive(args, deps);
	} catch (error) {
		if (error instanceof Exited) return error.code;
		throw error;
	}
	return -1;
};
const entries = (dir: string): Array<Record<string, unknown>> =>
	readFileSync(join(dir, "log.jsonl"), "utf8")
		.trim()
		.split("\n")
		.map((l) => JSON.parse(l));

describe("end to end against a fake CLI", () => {
	it("relaunches with --session when the child exits 0 leaving a valid request", async () => {
		const dir = tmp();
		const logs: string[] = [];
		const code = await run(depsFor(fakeCli(dir, { restarts: 1 }), {}, logs), ["--model", "m", "hello"]);
		expect(code).toBe(0);
		const [first, second] = entries(dir);
		expect(first?.args).toEqual(["--model", "m", "hello"]);
		expect(second?.args).toEqual(["--session", "/s/a.jsonl", "--model", "m"]);
		expect(second).toMatchObject({
			mode: "acceptEdits",
			bypass: "0",
			optin: "0",
			wrapper: String(process.pid),
			ppid: process.pid,
		});
		expect(entries(dir)).toHaveLength(2);
	});

	it("stops at the restart limit", async () => {
		const dir = tmp();
		const logs: string[] = [];
		const deps = depsFor(fakeCli(dir, { restarts: 99 }), {}, logs);
		deps.env.NYCODE_RESTART_MAX = "2";
		expect(await run(deps, [])).toBe(0);
		expect(entries(dir)).toHaveLength(3);
		expect(logs.join("\n")).toContain("limite de 2 reinícios");
	});

	it("ends with the child's code when it fails, without relaunching", async () => {
		const dir = tmp();
		expect(await run(depsFor(fakeCli(dir, { restarts: 1, exitCode: 3 })), [])).toBe(3);
		expect(entries(dir)).toHaveLength(1);
	});

	it("ends without relaunching when there is no request, and reports an invalid one", async () => {
		const dir = tmp();
		expect(await run(depsFor(fakeCli(dir, { restarts: 0 })), [])).toBe(0);
		expect(entries(dir)).toHaveLength(1);
		const bad = tmp();
		const logs: string[] = [];
		const script = join(bad, "bad.mjs");
		writeFileSync(
			script,
			`import { writeFileSync } from "node:fs"; writeFileSync(process.env.NYCODE_RESTART_REQUEST_FILE, "nope\\n", { mode: 0o600 });`,
		);
		expect(await run(depsFor(script, {}, logs), [])).toBe(0);
		expect(logs.join("\n")).toContain("pedido de reinício inválido");
	});

	it("reopens without bypass when the user does not confirm it on the terminal", async () => {
		const dir = tmp();
		const script = join(dir, "bypass.mjs");
		const log = join(dir, "log.jsonl");
		writeFileSync(
			script,
			`import { appendFileSync, existsSync, renameSync, writeFileSync } from "node:fs";
appendFileSync(${JSON.stringify(log)}, JSON.stringify({ args: process.argv.slice(2), bypass: process.env.NYCODE_BYPASS_PERMISSIONS, optin: process.env.NYCODE_BYPASS_OPTIN }) + "\\n");
if (process.argv.length === 2) {
  const f = process.env.NYCODE_RESTART_REQUEST_FILE;
  writeFileSync(f + ".t", JSON.stringify({ v: 2, sessionFile: "/s/a.jsonl", permission: { mode: "default", bypass: 1, eligible: 0, optin: 1 }, argc: 0, flagValues: [] }) + "\\n", { mode: 0o600 });
  renameSync(f + ".t", f);
}
`,
		);
		const logs: string[] = [];
		expect(await run(depsFor(script, {}, logs), [])).toBe(0);
		expect(entries(dir)[1]).toMatchObject({ bypass: "0", optin: "0" });
		expect(logs.join("\n")).toContain("bypass de permissões não confirmado");
		const confirmed = depsFor(script, { confirmBypass: async () => true });
		expect(await run(confirmed, [])).toBe(0);
		expect(entries(dir).at(-1)).toMatchObject({ bypass: "1", optin: "1" });
	});

	it("forwards SIGTERM to the child and ends with 143", async () => {
		const dir = tmp();
		const pending = run(depsFor(fakeCli(dir, { restarts: 0, sleep: true })), []);
		await new Promise((resolve) => setTimeout(resolve, 600));
		process.emit("SIGTERM");
		expect(await pending).toBe(143);
	});

	it("fixes the bypass eligibility of the original launch for the child", async () => {
		const dir = tmp();
		const script = join(dir, "env.mjs");
		const log = JSON.stringify(join(dir, "log.jsonl"));
		writeFileSync(
			script,
			`import { appendFileSync } from "node:fs"; appendFileSync(${log}, JSON.stringify({ eligible: process.env.NYCODE_BYPASS_ELIGIBLE }) + "\\n");`,
		);
		const open = depsFor(script);
		delete open.env.NYCODE_BYPASS_ELIGIBLE;
		open.env.NYCODE_BYPASS_PERMISSIONS = "1";
		expect(await run(open, [])).toBe(0);
		const closed = depsFor(script);
		delete closed.env.NYCODE_BYPASS_ELIGIBLE;
		expect(await run(closed, [])).toBe(0);
		expect(entries(dir)).toEqual([{ eligible: "1" }, { eligible: "0" }]);
	});

	it("runs in this process when it is not on a terminal", async () => {
		const dir = tmp();
		expect(await run(depsFor(fakeCli(dir, { restarts: 1 }), { isTty: () => false }), [])).toBe(-1);
	});
});

describe("K24 seam", () => {
	it("the CLI entry only hands over to launch, marked K24", () => {
		const entry = readFileSync(join(import.meta.dirname, "../../../../src/cli.ts"), "utf8");
		expect(entry).toContain("launch(process.argv.slice(2)); // nycode: K24");
		expect(entry).not.toContain("main(");
	});
});
