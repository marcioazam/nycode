// The /restart request of the supervisor: validation of the file the extension writes and the arguments of the relaunch.
import { lstatSync, readFileSync } from "node:fs";

/** What the user's permission state was when the request was written, after the supervisor's own checks. */
export interface RestartPlan {
	sessionFile: string;
	mode: "default" | "acceptEdits";
	bypass: boolean;
	eligible: boolean;
	optin: boolean;
	flagValues: number[];
}

/** The launch that is being supervised, as the request must agree with it. */
export interface LaunchState {
	argc: number;
	eligible: boolean;
	bypass: boolean;
}

export type RequestRead =
	| { kind: "none" }
	| { kind: "invalid" }
	| { kind: "plan"; plan: RestartPlan; needsBypassConfirm: boolean };

const MODES = new Set(["default", "acceptEdits", "bypassPermissions"]);
const FLAG_VALUE_OPTS = new Set([
	"--provider",
	"--model",
	"--api-key",
	"--system-prompt",
	"--append-system-prompt",
	"--session-dir",
	"--models",
	"--tools",
	"-t",
	"--exclude-tools",
	"-xt",
	"--thinking",
	"--extension",
	"-e",
	"--skill",
	"--prompt-template",
	"--theme",
	"--use-theme",
	"--tui-mode",
	"--add-dir",
	"--settings",
	"--setting-sources",
	"--mcp-config",
]);
const DROP_WITH_VALUE = new Set(["--session", "--session-id", "--fork", "--name", "-n"]);
const DROP_ALONE = new Set(["--continue", "-c", "--resume", "-r", "--no-session"]);
const DROP_PREFIXES = ["--session=", "--session-id=", "--fork=", "--name="];

const isBit = (v: unknown): v is 0 | 1 => v === 0 || v === 1;

/** True for a request file the supervisor may trust: a regular file of ours, mode 0600, one line. */
function readTrustedText(file: string, uid: number | undefined): string | undefined {
	const st = lstatSync(file);
	if (!st.isFile() || st.isSymbolicLink()) return undefined;
	if (uid !== undefined && st.uid !== uid) return undefined;
	if ((st.mode & 0o777) !== 0o600) return undefined;
	const text = readFileSync(file, "utf8");
	return text.split("\n").length - 1 <= 1 ? text : undefined;
}

/** Reads and validates the v2 request against the launch being supervised; any field out of shape invalidates it. */
export function readRequest(file: string, launch: LaunchState, uid: number | undefined): RequestRead {
	let text: string | undefined;
	try {
		text = readTrustedText(file, uid);
	} catch (error) {
		return (error as NodeJS.ErrnoException).code === "ENOENT" ? { kind: "none" } : { kind: "invalid" };
	}
	if (text === undefined) return { kind: "invalid" };
	let json: unknown;
	try {
		json = JSON.parse(text);
	} catch {
		return { kind: "invalid" };
	}
	const req = json as {
		v?: unknown;
		sessionFile?: unknown;
		permission?: { mode?: unknown; bypass?: unknown; eligible?: unknown; optin?: unknown };
		argc?: unknown;
		flagValues?: unknown;
	};
	const perm = req.permission;
	if (req.v !== 2 || typeof req.sessionFile !== "string" || !/^\/[^"\\]*$/.test(req.sessionFile))
		return { kind: "invalid" };
	if (!perm || typeof perm.mode !== "string" || !MODES.has(perm.mode)) return { kind: "invalid" };
	if (!isBit(perm.bypass) || !isBit(perm.eligible) || !isBit(perm.optin)) return { kind: "invalid" };
	if (perm.mode === "bypassPermissions" && perm.bypass !== 1) return { kind: "invalid" };
	if (req.argc !== launch.argc || !Array.isArray(req.flagValues)) return { kind: "invalid" };
	if (!req.flagValues.every((i) => Number.isInteger(i) && i >= 0 && i < launch.argc)) return { kind: "invalid" };
	// Eligibility never rises: the minimum of the request and the original launch.
	const eligible = perm.eligible === 1 && launch.eligible;
	if (perm.bypass === 1 && !eligible && perm.optin !== 1) return { kind: "invalid" };
	// `optin` comes from the file (the agent, same uid, can forge it): a launch without bypass and without the original
	// eligibility reopens with bypass only if the user confirms on the terminal.
	const needsBypassConfirm = perm.bypass === 1 && !eligible && !launch.bypass;
	return {
		kind: "plan",
		needsBypassConfirm,
		plan: {
			sessionFile: req.sessionFile,
			mode: perm.mode === "acceptEdits" ? "acceptEdits" : "default",
			bypass: perm.bypass === 1,
			eligible,
			optin: perm.optin === 1,
			flagValues: req.flagValues as number[],
		},
	};
}

/**
 * Arguments of the relaunch: flags are kept, the prompt, @files and session selectors are dropped, and the same session
 * is reopened. A flag the extension marked (by index) as having a string value keeps its value.
 */
export function relaunchArgs(args: string[], plan: RestartPlan): string[] {
	const out: string[] = [];
	let keepNext = false;
	let skipNext = false;
	for (const [i, a] of args.entries()) {
		if (keepNext) {
			keepNext = false;
			out.push(a);
			continue;
		}
		if (skipNext) {
			skipNext = false;
			continue;
		}
		if (a === "--") break;
		if (DROP_WITH_VALUE.has(a)) skipNext = true;
		else if (DROP_ALONE.has(a) || DROP_PREFIXES.some((p) => a.startsWith(p))) continue;
		else if (FLAG_VALUE_OPTS.has(a)) {
			out.push(a);
			keepNext = true;
		} else if (a.startsWith("--") && a.includes("=")) out.push(a);
		else if (a.startsWith("--")) {
			out.push(a);
			if (plan.flagValues.includes(i + 1)) keepNext = true;
		} else if (a.startsWith("-")) out.push(a);
	}
	return ["--session", plan.sessionFile, ...out];
}
