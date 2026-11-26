// The guard's verdict for one tool call: a TypeScript port of the former Python guard's `decide` (same verdicts and
// reasons; the Python guard is gone).
import { checkBash } from "./bash/rules.ts";
import { currentMode, decideMode, type Mode } from "./modes/decide.ts";
import { abspath } from "./py-path.ts";
import { checkFile } from "./rules/edit.ts";
import { checkGrep, checkRead, readDenied } from "./rules/read.ts";

/** What the guard decides: let the call run, ask the user, or block it. */
export type GuardVerdict = { kind: "allow" } | { kind: "ask"; reason: string } | { kind: "deny"; reason: string };

/** A tool call in Claude's vocabulary (`Bash`, `Edit`, `Write`, `MultiEdit`, `Read`, `Grep`, `run`), as the Python guard read it. */
export interface GuardCall {
	tool: string;
	input: Record<string, unknown>;
	cwd: string;
	/** The project root (CLAUDE_PROJECT_DIR for the script); the cwd when empty. */
	project: string;
	/** Bypass Permissions: every ask becomes allow, denies stay. */
	bypass: boolean;
	/** NYCODE_PERMISSION_MODE as set (undefined or empty: the legacy guard without modes). */
	mode?: string;
}

/** Python `x or ""` on a tool input field: falsy is empty, text stays, anything else is a malformed call. */
function text(value: unknown): string {
	if (!value) return "";
	if (typeof value !== "string") throw new TypeError(`tool input field is ${typeof value}, expected text`);
	return value;
}

const unique = (reasons: string[]): string => [...new Set(reasons)].join("; ");
type Found = ReturnType<typeof checkBash>;

/** The findings of the tool, or a verdict when the call is decided without them (an unknown `run` action). */
function findings(call: GuardCall, cwd: string, project: string): Found | GuardVerdict | undefined {
	const abs = abspath(cwd);
	if (call.tool === "Bash") return checkBash(text(call.input.command), abs);
	if (call.tool === "Edit" || call.tool === "Write" || call.tool === "MultiEdit")
		return checkFile(text(call.input.file_path), abs, abspath(project));
	if (call.tool === "Read") return checkRead(text(call.input.file_path), abs);
	if (call.tool === "Grep") return checkGrep((call.input.path as string | undefined) || undefined, abs);
	if (call.tool === "run") {
		const action = call.input.action;
		if (action === "start") return checkBash(text(call.input.command), abs);
		if (action === "list" || action === "tail" || action === "stop" || action === "wait") return [];
		return { kind: "deny", reason: "ação desconhecida da tool run" };
	}
	return undefined;
}

/** The guard's verdict for `call`. Throws on a malformed input; the caller fails closed. */
export function decide(call: GuardCall): GuardVerdict {
	const cwd = call.cwd || process.cwd();
	const project = call.project || cwd;
	const found = findings(call, cwd, project);
	if (found === undefined) return { kind: "allow" };
	if (!Array.isArray(found)) return found as GuardVerdict;
	const denies = found.filter(([level]) => level === "deny").map(([, reason]) => reason);
	if (denies.length > 0) return { kind: "deny", reason: `Bloqueado pelo guard: ${unique(denies)}` };
	const asks = found.filter(([level]) => level === "ask").map(([, reason]) => reason);
	const mode: Mode | undefined = currentMode(call.mode);
	if (mode !== undefined) {
		const result = decideMode({
			mode,
			tool: call.tool,
			input: call.input,
			cwd: abspath(cwd),
			project: abspath(project),
			asks,
			readDenied,
			bypass: call.bypass,
		});
		return result ? { kind: result[0] as "ask", reason: result[1] } : { kind: "allow" };
	}
	if (asks.length > 0 && !call.bypass) return { kind: "ask", reason: `Confirmação necessária: ${unique(asks)}` };
	return { kind: "allow" };
}
