/**
 * Run (local patch): the `run` tool, detection of nohup/`&` in the bash tool and the Run section under Plan.
 * One registry for shells and background subagents (registry.ts); the finish of a run the agent awaits starts a turn.
 */
import type { ExtensionAPI, ExtensionContext } from "../../core/extensions/types.ts";
import { backgroundShell } from "../_shared/seams/background-shell.ts";
import { announceExternalFinish, announceExternalStart } from "../todo/external.ts";
import { extractPid, type Instrumented, instrument } from "./detect.ts";
import { type RunRecord, sharedRegistry } from "./registry.ts";
import { RunSection } from "./section.ts";
import { registerDetected, startShell } from "./shell.ts";
import { registerRunTool, registerTaskSurface, summary } from "./tool.ts";

export function finishMessage(r: RunRecord, now: number): { customType: string; content: string; display: boolean } {
	return { customType: "run-finished", content: `Run terminou:\n${summary(r, now, 20)}`, display: true };
}

export default function run(nycode: ExtensionAPI): void {
	const reg = sharedRegistry();
	const section = new RunSection(reg);
	registerTaskSurface(nycode, reg);
	registerRunTool(nycode, reg);
	// bash run_in_background starts here: the registry owns the process, the Run section shows it, the finish starts a turn.
	backgroundShell.set((command, cwd) => {
		const rec = startShell(reg, { command, cwd, awaited: true });
		return { id: rec.id, logPath: rec.logPath ?? "" };
	});
	/** toolCallId → what tool_call changed, read back by tool_result. */
	const pending = new Map<string, Instrumented & { cwd: string }>();
	let offFinish: (() => void) | undefined;
	/** A reminder without a turn: the finish of a run nobody awaits. */
	const sendQuiet = (content: string): void => {
		try {
			nycode.sendMessage({ customType: "run-finished", content, display: false }, { triggerTurn: false });
		} catch {
			// stale session: nobody to tell
		}
	};

	nycode.on("session_start", (event, ctx: ExtensionContext) => {
		if (event.reason !== "reload") reg.resetSession();
		offFinish?.();
		offFinish = reg.onFinish((r) => {
			if (r.kind !== "shell") return;
			// todo.sync: one reminder naming the item; only when a message goes out (a waiter reads the result itself).
			// A stale session must not abort finish(): no reminder then.
			let reminder: string | undefined;
			try {
				reminder =
					r.waiters > 0
						? undefined
						: announceExternalFinish(
								nycode,
								`run:${r.id}`,
								r.state === "done",
								`${r.name}, exit ${r.exitCode ?? "?"}`,
								r.state === "stopped",
							);
			} catch {
				// stale session: nobody to tell
			}
			if (!r.awaited || r.waiters > 0) {
				if (reminder) sendQuiet(reminder);
				return;
			}
			try {
				const msg = finishMessage(r, reg.now());
				nycode.sendMessage(reminder ? { ...msg, content: `${msg.content}\n${reminder}` } : msg, {
					triggerTurn: true,
				});
			} catch {
				// stale session: nobody to tell
			}
		});
		section.start(ctx);
	});

	nycode.on("session_shutdown", (_event, ctx: ExtensionContext) => {
		offFinish?.();
		offFinish = undefined;
		pending.clear();
		section.shutdown(ctx);
	});

	nycode.on("tool_call", (event, ctx: ExtensionContext) => {
		if (event.toolName !== "bash") return undefined;
		const input = event.input as { command?: unknown };
		if (typeof input.command !== "string") return undefined;
		const cwd = ctx.cwd ?? process.cwd();
		const inst = instrument(input.command, cwd);
		if (!inst) return undefined;
		input.command = inst.command;
		pending.set(event.toolCallId, { ...inst, cwd });
		return undefined;
	});

	nycode.on("tool_result", (event) => {
		if (event.toolName === "subagent") section.sync();
		if (event.toolName === "run" && (event.input as { action?: unknown }).action === "start" && !event.isError) {
			const id = event.content
				.map((c) => (c.type === "text" ? /^iniciado (\S+)/.exec(c.text)?.[1] : undefined))
				.find(Boolean);
			const rec = id ? reg.get(id) : undefined;
			// A run that already ended has had its finish: an item added now would wait forever.
			if (rec?.state === "running") announceExternalStart(nycode, `run:${rec.id}`, `run ${rec.name}`);
		}
		const inst = pending.get(event.toolCallId);
		if (!inst) return undefined;
		pending.delete(event.toolCallId);
		// Always take the marker line out of what the model reads, even when no run is registered.
		let pid: number | undefined;
		const content = event.content.map((c) => {
			if (c.type !== "text") return c;
			const r = extractPid(c.text);
			pid ??= r.pid;
			return { ...c, text: r.text };
		});
		if (pid !== undefined) {
			try {
				registerDetected(reg, {
					pid,
					command: inst.display,
					cwd: inst.cwd,
					logPath: inst.logPath,
					repeatable: inst.trailing,
				});
			} catch {
				// at the live limit: the process runs, just unlisted
			}
		}
		return { content };
	});
}
