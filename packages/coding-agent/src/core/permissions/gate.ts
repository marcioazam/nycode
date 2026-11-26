// K11: the permission gate in front of every tool call. The native engine (the TypeScript guard) decides here;
// `permissions.engine` only accepts "native". An engine that throws or a value other than "native" denies the call
// (C-F8-12).
import { checkoutRoot } from "../../extensions/_shared/project/project-root.ts";
import { claudePreCall } from "../../extensions/hooks/claude-tools.ts";
import type { ExtensionContext, ToolCallEventResult } from "../extensions/types.ts";
import { isBypassOn } from "./bypass-state.ts";
import { globalPermissionsEngine } from "./global-settings.ts";
import { decide } from "./guard/decide.ts";

/** The tools the embedded guard judges: its hook matcher in settings-defaults.ts is `Bash|run|Edit|Write|Read|Grep`. */
const GUARDED_TOOLS = new Set(["Bash", "run", "Edit", "Write", "Read", "Grep"]);

/** What the gate needs from the session: a way to reach the UI. The engine comes from the global settings.json only. */
export interface GateHost {
	runner: { createContext(): ExtensionContext };
}

type NativeOutcome = { kind: "pass" } | { kind: "ask"; reason: string } | { kind: "block"; reason: string };

/** Why no engine can decide, or undefined for "native". The removed "script" engine is refused by name: fail closed. */
function engineUnavailable(engine: string): string | undefined {
	if (engine === "native") return undefined;
	return engine === "script"
		? 'permissions.engine "script" was removed (the guard.py engine is gone); set "native" or delete the key; call denied'
		: `permissions.engine "${engine}" is not known (use "native"); call denied`;
}

/** The native engine's outcome for one call; throws when the engine does, and the caller denies the call. */
function nativeOutcome(toolName: string, input: unknown, cwd: string): NativeOutcome {
	const call = claudePreCall(toolName, input, cwd);
	const tool = call.name ?? (toolName === "run" ? "run" : undefined);
	if (tool === undefined || !GUARDED_TOOLS.has(tool)) return { kind: "pass" };
	const rawInput = input !== null && typeof input === "object" ? (input as Record<string, unknown>) : {};
	const verdict = decide({
		tool,
		// `run` is judged by its own action (a `start` with a command already came as Bash)
		input: tool === "run" ? rawInput : (call.input ?? {}),
		mode: process.env.NYCODE_PERMISSION_MODE,
		cwd,
		project: checkoutRoot(cwd),
		bypass: isBypassOn(),
	});
	return verdict.kind === "allow"
		? { kind: "pass" }
		: { kind: verdict.kind === "ask" ? "ask" : "block", reason: verdict.reason };
}

/** NYCODE_GUARD_FAIL_OPEN=1, set by whoever launches nycode, lets calls through when the engine itself fails. */
const failOpen = (): boolean => process.env.NYCODE_GUARD_FAIL_OPEN === "1";

const failure = (error: unknown): string =>
	`The permission engine failed, call denied: ${error instanceof Error ? error.message : String(error)}`;

/**
 * Decides a `tool_call` before the extension handlers see it. Returns undefined to let the call continue, or the block.
 * `ask` confirms with the user as the `hooks` extension does for a guard verdict; without a UI the block stands.
 */
export async function gateToolCall(
	toolName: string,
	input: unknown,
	host: GateHost,
): Promise<ToolCallEventResult | undefined> {
	try {
		const engine = globalPermissionsEngine();
		const unavailable = engineUnavailable(engine);
		if (unavailable !== undefined) return { block: true, reason: unavailable };
		const ctx = host.runner.createContext();
		const outcome = nativeOutcome(toolName, input, ctx.cwd);
		if (outcome.kind === "pass") return undefined;
		if (outcome.kind === "block") return { block: true, reason: outcome.reason };
		if (ctx.hasUI && (await ctx.ui.confirm(`Allow ${toolName}?`, outcome.reason))) return undefined;
		// A declined prompt ends the run, with the user there to say what next; without a UI the model sees the reason.
		return ctx.hasUI
			? { block: true, reason: outcome.reason, terminate: true }
			: { block: true, reason: outcome.reason };
	} catch (error) {
		if (failOpen()) return undefined;
		return { block: true, reason: failure(error) };
	}
}
