// The decision of a permission mode, applied after every deny of the guard. Port of permissions/modes.py and decide.py.
import { analyze } from "./classify.ts";
import { scopedTarget, scopeRoots } from "./paths.ts";

export type Mode = "default" | "acceptEdits" | "plan" | "bypassPermissions";
const ALIASES = new Map<string, Mode>([
	["default", "default"],
	["manual", "default"],
	["ask", "default"],
	["acceptedits", "acceptEdits"],
	["auto", "acceptEdits"],
	["plan", "plan"],
	["bypasspermissions", "bypassPermissions"],
]);
const RM_RECURSIVE_REASON = "rm recursivo";
const EDIT_TOOLS = new Set(["Edit", "Write", "MultiEdit"]);

export const truthy = (value: unknown): boolean =>
	["1", "true", "on", "yes"].includes(
		String(value ?? "")
			.trim()
			.toLowerCase(),
	);

/** Undefined when the mode is not set (the legacy guard); an unknown value fails closed to default. */
export function currentMode(raw: string | undefined): Mode | undefined {
	const text = (raw ?? "").trim();
	if (!text) return undefined;
	return ALIASES.get(text.toLowerCase()) ?? "default";
}

const ask = (mode: Mode, reasons: string[]): [string, string] => [
	"ask",
	`Confirmação necessária (modo ${mode}): ${[...new Set(reasons)].join("; ")}`,
];

export interface ModeCall {
	mode: Mode;
	tool: string;
	input: Record<string, unknown>;
	cwd: string;
	project: string;
	asks: string[];
	readDenied: (path: string) => boolean;
	bypass: boolean;
}

/** Undefined (allow) or an ask. `asks` are the ask reasons of the guard; the denies were decided before. */
export function decideMode(call: ModeCall): [string, string] | undefined {
	let mode = call.mode;
	if (call.bypass) return undefined;
	if (mode === "bypassPermissions") mode = "default";
	const { asks } = call;
	if (mode === "plan") return asks.length > 0 ? ask(mode, asks) : undefined;
	if (EDIT_TOOLS.has(call.tool)) {
		const path = call.input.file_path;
		const roots = scopeRoots(call.cwd, call.project);
		if (
			mode === "acceptEdits" &&
			asks.length === 0 &&
			typeof path === "string" &&
			scopedTarget(path, call.cwd, roots)
		)
			return undefined;
		const why =
			mode === "acceptEdits"
				? "edição fora do escopo seguro (caminho protegido, externo ou symlink)"
				: "edição requer confirmação";
		return ask(mode, [...asks, why]);
	}
	if (call.tool === "Bash") {
		const cmd = call.input.command;
		const kind =
			typeof cmd === "string"
				? analyze(cmd, call.cwd, scopeRoots(call.cwd, call.project), call.readDenied)
				: undefined;
		const proven = kind === "readonly" || (kind === "edit" && mode === "acceptEdits");
		const remaining = asks.filter((r) => !(kind === "edit" && r === RM_RECURSIVE_REASON));
		if (proven && remaining.length === 0) return undefined;
		return ask(mode, [...remaining, ...(proven ? [] : ["comando não comprovadamente seguro"])]);
	}
	return asks.length > 0 ? ask(mode, asks) : undefined;
}
