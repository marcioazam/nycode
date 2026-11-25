/**
 * Monitor: Claude Code's Monitor tool. A command runs in the background and each stdout line comes back to the model as
 * an event (shaped and rate-limited by events.ts), so it reacts to log entries, status polls or file changes mid-turn.
 * The watch is a run of the shared run registry: the Run section shows it and task_stop stops it. It ends at its
 * deadline (5 min default, 30 max), on task_stop, on flood, or when the session ends, with one notice.
 *
 * The guard and Bash-matched hooks judge its command as Bash (hooks/claude-tools.ts claudePreCall). Without a UI no
 * later turn could take an event, so the tool refuses; it is dropped from a session whose tools leave bash out.
 * Deviation: Claude's `ws` source is not offered (a polling command covers it).
 */

import { spawn } from "node:child_process";
import { createWriteStream, mkdirSync } from "node:fs";
import { join } from "node:path";
import { StringDecoder } from "node:string_decoder";
import { Type } from "typebox";
import type { ExtensionAPI, ExtensionContext } from "../../core/extensions/types.ts";
import { sessionHasTurns, sessionMailbox } from "../_shared/events/session-mailbox.ts";
import { type RunRecord, sharedRegistry } from "../run/registry.ts";
import { ensurePolling, runsDir, stopRun } from "../run/shell.ts";
import {
	BATCH_WINDOW_MS,
	DEFAULT_DEADLINE_MS,
	deadlineMs,
	eventGate,
	FLOOD_BURST,
	FLOOD_REFILL_MS,
	lineBatcher,
	MAX_DEADLINE_MS,
	MIN_DEADLINE_MS,
	SUPPRESSION_LIMIT_MS,
} from "./events.ts";

/** Claude Code stops a background command whose output passes 5 GB. */
const MAX_OUTPUT_BYTES = 5 * 1024 ** 3;

const Params = Type.Object({
	description: Type.String({
		description: "Short description of what you are watching. It names the watch in every message it sends.",
	}),
	command: Type.String({
		description:
			"Shell command to watch. Each line it prints is delivered to you as an event; make it print only the lines worth reacting to (for example tail -F with grep --line-buffered, or a polling loop that prints on change).",
	}),
	timeout_ms: Type.Optional(
		Type.Number({
			minimum: MIN_DEADLINE_MS,
			description: `Deadline in milliseconds (default ${DEFAULT_DEADLINE_MS}, minimum ${MIN_DEADLINE_MS}, maximum ${MAX_DEADLINE_MS}). At the deadline the watch ends and you get one notice.`,
		}),
	),
});

const label = (id: string, description: string): string =>
	`Monitor ${id} ("${description.replace(/\s+/g, " ").trim().slice(0, 60)}")`;
const minutes = (ms: number): string => (ms % 60_000 === 0 ? `${ms / 60_000}-minute` : `${ms / 1000}-second`);

export default function monitor(nycode: ExtensionAPI): void {
	const reg = sharedRegistry();
	const events = sessionMailbox("monitor");
	const send = (content: string): void =>
		events.deliver((current, startsTurn) =>
			current.sendMessage({ customType: "monitor", content, display: true }, { triggerTurn: startsTurn }),
		);
	const watches = new Set<RunRecord>();

	function start(description: string, command: string, limitMs: number, cwd: string): RunRecord {
		mkdirSync(runsDir(), { recursive: true, mode: 0o700 });
		const rec = reg.add({ name: `monitor: ${description}`, command, cwd, repeatable: false });
		rec.logPath = join(runsDir(), `${rec.id}.log`);
		const log = createWriteStream(rec.logPath, { mode: 0o600 });
		log.on("error", () => {}); // a full disk must not take nycode down from a stream event
		const name = label(rec.id, description);
		let endReason: string | undefined;
		const stop = (reason: string): void => {
			endReason ??= reason;
			stopRun(reg, rec);
		};
		const gate = eventGate({ send: (event) => send(`${name} output:\n${event}`), stop });
		const batcher = lineBatcher({
			emit: (event) => rec.state === "running" && !rec.stopRequested && gate.offer(event),
		});
		const decoder = new StringDecoder("utf8");
		let written = 0;
		const record = (data: Buffer): void => {
			written += data.length;
			log.write(data);
			if (written > MAX_OUTPUT_BYTES) stop(`${name} was stopped: its output passed the 5 GB limit.`);
		};
		const deadline = setTimeout(
			() =>
				stop(`${name} reached its ${minutes(limitMs)} deadline and stopped. Start it again if you still need it.`),
			limitMs,
		);
		deadline.unref?.();

		const child = spawn("bash", ["-c", command], { cwd, detached: true, stdio: ["ignore", "pipe", "pipe"] });
		rec.pid = rec.pgid = child.pid;
		watches.add(rec);
		child.stdout.on("data", (data: Buffer) => {
			record(data);
			if (!rec.stopRequested) batcher.push(decoder.write(data));
		});
		child.stderr.on("data", record);
		const finish = (exitCode: number | undefined, signal: string | undefined, error?: Error): void => {
			if (rec.state !== "running") return;
			clearTimeout(deadline);
			watches.delete(rec);
			batcher.push(decoder.end());
			const rest = batcher.drain();
			// Stopped through task_stop or the session ending: nothing waits for a notice.
			const onRequest = rec.stopRequested && endReason === undefined;
			log.end(() => {
				reg.finish(rec, { exitCode, signal });
				if (onRequest) return;
				const last = rest !== undefined && !rec.stopRequested && gate.admit() ? [`${name} output:\n${rest}`] : [];
				const notice =
					endReason ??
					(error
						? `${name} could not run: ${error.message}`
						: `${name} ended: the command exited with code ${exitCode ?? "?"}. Full output: ${rec.logPath}`);
				send([...last, notice].join("\n"));
			});
		};
		child.once("error", (error) => finish(127, undefined, error));
		child.once("close", (code, signal) => finish(code ?? undefined, signal ?? undefined));
		child.unref();
		ensurePolling(reg);
		return rec;
	}

	nycode.registerTool({
		name: "monitor",
		label: "monitor",
		description: `Run a command in the background and receive each line it prints as an event, so you can react to log entries, file changes, or polled status while the conversation continues. Only stdout lines are events; stderr goes to the output file. Lines within ${BATCH_WINDOW_MS} ms of the first arrive together as one event. A monitor may send ${FLOOD_BURST} events at once and one more every ${FLOOD_REFILL_MS / 1000} seconds; events past that are suppressed and counted, and a monitor suppressed for ${SUPPRESSION_LIMIT_MS / 1000} seconds without a break is stopped, so filter the command down to the lines worth reacting to. The watch ends at its deadline (${DEFAULT_DEADLINE_MS / 60_000} minutes by default, at most ${MAX_DEADLINE_MS / 60_000}) with one notice; stop it earlier with task_stop.`,
		promptSnippet: "Watch a background command and react to each line it prints",
		promptGuidelines: [
			"Use monitor to watch logs, CI or PR status, or file changes instead of polling with sleep; make the command print only lines worth reacting to. Stop a monitor with task_stop once it is no longer needed.",
		],
		parameters: Params,
		async execute(_id, params, _signal, _onUpdate, ctx) {
			if (!ctx.hasUI)
				throw new Error(
					"Monitor is unavailable in a session without a UI (print or json mode, or a subagent): no later turn could receive its events. Run the command with bash instead.",
				);
			if (params.command.trim() === "") throw new Error("command must not be empty");
			if (params.description.trim() === "") throw new Error("description must not be empty");
			const limitMs = deadlineMs(params.timeout_ms);
			const rec = start(params.description, params.command, limitMs, ctx.cwd);
			return {
				content: [
					{
						type: "text",
						text: `Monitor started with ID: ${rec.id}. Each line the command prints is delivered to you as it arrives, in batches. It stops at its ${minutes(limitMs)} deadline; use task_stop to stop it sooner. Full output is written to: ${rec.logPath}`,
					},
				],
				details: {},
			};
		},
	});

	/** Claude Code: with Bash off, there is no Monitor (it runs shell commands under Bash's rules). */
	const followBash = (): void => {
		const active = nycode.getActiveTools();
		if (active.includes("monitor") && !active.includes("bash"))
			nycode.setActiveTools(active.filter((name) => name !== "monitor"));
	};
	nycode.on("session_start", (_event, ctx: ExtensionContext) => {
		followBash();
		events.attach(nycode, sessionHasTurns(ctx));
	});
	nycode.on("agent_start", () => events.markPrompted(nycode));
	nycode.on("session_shutdown", (event) => {
		events.detach(nycode);
		// Events belong to the session that asked: a switch or quit ends the watches; /reload keeps them.
		if (event.reason === "reload") return;
		for (const rec of [...watches]) stopRun(reg, rec);
	});
}
