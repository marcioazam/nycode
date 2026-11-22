// Native supervisor of the interactive CLI (/restart and /update). The entry process runs the CLI as its child, waits,
// and when the child exits 0 leaving a valid restart request it relaunches the same session. Contract of the former
// wrapper supervisor.sh: headless runs are never supervised, Ctrl+C reaches only the child, a SIGTERM or SIGHUP to the
// supervisor is forwarded and ends it with 143 or 129, and the number of restarts is bounded.
import { type ChildProcess, spawn } from "node:child_process";
import { closeSync, lstatSync, mkdtempSync, openSync, readSync, rmdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type LaunchState, readRequest, relaunchArgs } from "./request.ts";

const HEADLESS_FLAGS = new Set([
	"-p",
	"--print",
	"--mode",
	"--export",
	"--list-models",
	"-h",
	"--help",
	"-v",
	"--version",
]);
const HEADLESS_PREFIXES = ["--mode=", "--export=", "--list-models="];
const TRUE_VALUES = new Set(["1", "true", "on", "yes"]);
const DEFAULT_MAX_RESTARTS = 10;
const CONFIRM_TIMEOUT_MS = 30_000;

/** Everything the supervisor touches outside itself, injectable so the tests need no terminal, model or credential. */
export interface SupervisorDeps {
	env: NodeJS.ProcessEnv;
	pid: number;
	uid: number | undefined;
	isTty(): boolean;
	/** Command that starts this CLI with the given arguments: `node cli.js ...` or the compiled binary. */
	command(args: string[]): { file: string; args: string[] };
	spawnChild(file: string, args: string[], env: NodeJS.ProcessEnv): ChildProcess;
	/** Asks the user on the terminal whether to reopen with bypass; false when unreadable, slow or not a yes. */
	confirmBypass(): Promise<boolean>;
	log(message: string): void;
	exit(code: number): never;
}

/** True when the arguments ask for a non-interactive run: those are never supervised. */
export function isHeadless(args: string[]): boolean {
	for (const a of args) {
		if (a === "--") return false;
		if (HEADLESS_FLAGS.has(a) || HEADLESS_PREFIXES.some((p) => a.startsWith(p))) return true;
	}
	return false;
}

/** The compiled binary carries its own entry: only the arguments follow it. A node run needs the script too. */
function selfCommand(args: string[]): { file: string; args: string[] } {
	const compiled =
		import.meta.url.includes("$bunfs") || import.meta.url.includes("~BUN") || import.meta.url.includes("%7EBUN");
	const script = process.argv[1];
	return { file: process.execPath, args: compiled || !script ? args : [...process.execArgv, script, ...args] };
}

function askOnTerminal(): Promise<boolean> {
	return new Promise((resolve) => {
		process.stderr.write("nycode: reabrir esta sessão COM bypass de permissões? [s/N] (30 s, padrão N) ");
		let fd: number;
		try {
			fd = openSync("/dev/tty", "r");
		} catch {
			resolve(false);
			return;
		}
		const timer = setTimeout(() => {
			closeSync(fd);
			resolve(false);
		}, CONFIRM_TIMEOUT_MS);
		const buffer = Buffer.alloc(64);
		setImmediate(() => {
			let answer = "";
			try {
				answer = buffer
					.subarray(0, readSync(fd, buffer, 0, buffer.length, null))
					.toString("utf8")
					.trim();
			} catch {
				// unreadable terminal: deny
			}
			clearTimeout(timer);
			try {
				closeSync(fd);
			} catch {
				// already closed by the timer
			}
			process.stderr.write("\n");
			resolve(["s", "sim"].includes(answer.toLowerCase()));
		});
	});
}

export const defaultDeps: SupervisorDeps = {
	env: process.env,
	pid: process.pid,
	uid: process.getuid?.(),
	isTty: () => Boolean(process.stdin.isTTY && process.stdout.isTTY),
	command: selfCommand,
	spawnChild: (file, args, env) => spawn(file, args, { stdio: "inherit", env }),
	confirmBypass: askOnTerminal,
	log: (message) => process.stderr.write(`${message}\n`),
	exit: (code) => process.exit(code),
};

function maxRestarts(env: NodeJS.ProcessEnv): number {
	const n = /^\d+$/.test(env.NYCODE_RESTART_MAX ?? "") ? Number(env.NYCODE_RESTART_MAX) : DEFAULT_MAX_RESTARTS;
	return n >= 1 && n <= 100 ? n : DEFAULT_MAX_RESTARTS;
}

/** A private directory of ours for the request file, or undefined when none can be trusted. */
function privateDir(env: NodeJS.ProcessEnv, uid: number | undefined): string | undefined {
	const candidates = [env.XDG_RUNTIME_DIR, env.TMPDIR, tmpdir()];
	for (const base of candidates) {
		if (!base) continue;
		try {
			const dir = mkdtempSync(join(base, "nycode-lifecycle."));
			const st = lstatSync(dir);
			if (
				st.isDirectory() &&
				!st.isSymbolicLink() &&
				(uid === undefined || st.uid === uid) &&
				(st.mode & 0o077) === 0
			)
				return dir;
			rmdirSync(dir);
		} catch {
			// try the next base
		}
	}
	return undefined;
}

/** Waits for the child and resolves with how it ended; a signal sent to the supervisor is forwarded to it. */
function waitForChild(child: ChildProcess, signalGot: { code: number | undefined }): Promise<number> {
	return new Promise((resolve) => {
		const forward = (signal: NodeJS.Signals, code: number) => () => {
			signalGot.code = code;
			child.kill(signal);
		};
		const onTerm = forward("SIGTERM", 143);
		const onHup = forward("SIGHUP", 129);
		const onInt = () => {}; // the terminal already delivered SIGINT to the group: the child decides
		process.on("SIGTERM", onTerm);
		process.on("SIGHUP", onHup);
		process.on("SIGINT", onInt);
		child.once("close", (code, signal) => {
			process.off("SIGTERM", onTerm);
			process.off("SIGHUP", onHup);
			process.off("SIGINT", onInt);
			resolve(code ?? (signal ? 128 + (signalNumber(signal) ?? 0) : 1));
		});
		child.once("error", () => resolve(127));
	});
}

const SIGNAL_NUMBERS: Record<string, number> = { SIGHUP: 1, SIGINT: 2, SIGQUIT: 3, SIGKILL: 9, SIGTERM: 15 };
const signalNumber = (signal: string) => SIGNAL_NUMBERS[signal];

/** True when this process should supervise: an interactive terminal run that is not already supervised. */
export function shouldSupervise(args: string[], deps: SupervisorDeps): boolean {
	return !isHeadless(args) && deps.isTty() && !deps.env.NYCODE_RESTART_WRAPPER_PID && deps.env.NYCODE_SUBAGENT !== "1";
}

/**
 * Supervises the CLI when the run is interactive: never returns in that case (it ends the process with the child's
 * code). Returns normally, to run the CLI in this process, when the run is headless, not on a terminal, already
 * supervised, or no private directory for the request exists.
 */
export async function superviseIfInteractive(args: string[], deps: SupervisorDeps = defaultDeps): Promise<void> {
	if (!shouldSupervise(args, deps)) return;
	const dir = privateDir(deps.env, deps.uid);
	if (!dir) return;
	const request = join(dir, "restart.json");
	const cleanup = () => {
		rmSync(request, { force: true });
		try {
			rmdirSync(dir);
		} catch {
			// not empty or gone
		}
	};
	const bypass0 = TRUE_VALUES.has((deps.env.NYCODE_BYPASS_PERMISSIONS ?? "").toLowerCase());
	// Eligibility is fixed at the original launch, as the controller reads it: an explicit value wins, otherwise a launch
	// with bypass on is eligible. The request can only lower it.
	const eligible0 = deps.env.NYCODE_BYPASS_ELIGIBLE === undefined ? bypass0 : deps.env.NYCODE_BYPASS_ELIGIBLE === "1";
	const env: NodeJS.ProcessEnv = {
		...deps.env,
		NYCODE_BYPASS_ELIGIBLE: eligible0 ? "1" : "0",
		NYCODE_RESTART_WRAPPER_PID: String(deps.pid),
		NYCODE_RESTART_REQUEST_FILE: request,
	};
	const max = maxRestarts(deps.env);
	let current = args;
	for (let restarts = 0; ; restarts++) {
		rmSync(request, { force: true });
		const { file, args: childArgs } = deps.command(current);
		const got: { code: number | undefined } = { code: undefined };
		const rc = await waitForChild(deps.spawnChild(file, childArgs, env), got);
		if (got.code !== undefined) {
			cleanup();
			deps.exit(got.code);
		}
		if (rc !== 0) {
			cleanup();
			deps.exit(rc);
		}
		const launch: LaunchState = { argc: current.length, eligible: eligible0, bypass: bypass0 };
		const read = readRequest(request, launch, deps.uid);
		if (read.kind !== "plan") {
			if (read.kind === "invalid") deps.log("nycode: pedido de reinício inválido; encerrando sem relançar.");
			cleanup();
			deps.exit(0);
		}
		let { bypass, optin } = read.plan;
		if (read.needsBypassConfirm && !(await deps.confirmBypass())) {
			deps.log("nycode: bypass de permissões não confirmado no terminal; reabrindo sem bypass.");
			bypass = false;
			optin = false;
		}
		rmSync(request, { force: true });
		if (restarts >= max) {
			deps.log(`nycode: limite de ${max} reinícios atingido; encerrando.`);
			cleanup();
			deps.exit(0);
		}
		// The current permission state, not the launch's: a mode or bypass changed at runtime holds on the reopened session.
		env.NYCODE_PERMISSION_MODE = read.plan.mode;
		env.NYCODE_BYPASS_ELIGIBLE = read.plan.eligible ? "1" : "0";
		env.NYCODE_BYPASS_OPTIN = optin ? "1" : "0";
		env.NYCODE_BYPASS_PERMISSIONS = bypass ? "1" : "0";
		current = relaunchArgs(current, read.plan);
	}
}
