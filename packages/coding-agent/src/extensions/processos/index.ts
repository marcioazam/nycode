/**
 * `/ps`: the session's process tree (MCP servers, run jobs, subagents, hooks) with resident memory and swap, read from
 * Linux /proc. `/ps kill <pid>` ends one of those processes and its descendants (SIGTERM); it refuses any pid outside
 * the session's tree and the nycode process itself. Other systems have no /proc: the command says so.
 */
import { readdirSync, readFileSync } from "node:fs";
import type { ExtensionAPI } from "../../core/extensions/types.ts";
import { formatTree, type ProcReader, sessionTree } from "./tree.ts";

const procReader: ProcReader = {
	pids: () =>
		readdirSync("/proc")
			.filter((n) => /^\d+$/.test(n))
			.map(Number),
	read: (pid, file) => {
		try {
			return readFileSync(`/proc/${pid}/${file}`, "utf8");
		} catch {
			return undefined; // exited or not ours to read
		}
	},
};

/** Signals `pid` and its descendants; the reply for the user. Exported for tests. */
export function killSubtree(
	reader: ProcReader,
	root: number,
	pid: number,
	kill: (pid: number) => void = (p) => process.kill(p, "SIGTERM"),
): string {
	if (pid === root) return "/ps kill não encerra o próprio nycode.";
	const tree = sessionTree(reader, root);
	const start = tree.findIndex((p) => p.pid === pid);
	if (start < 0) return `pid ${pid} não é um processo desta sessão.`;
	const targets = sessionTree(reader, pid);
	let sent = 0;
	for (const p of targets.reverse()) {
		try {
			kill(p.pid);
			sent++;
		} catch {
			// already exited
		}
	}
	return `SIGTERM enviado a ${sent} processo(s) a partir de ${pid}.`;
}

export default function processos(nycode: ExtensionAPI): void {
	nycode.registerCommand("ps", {
		description: "Árvore de processos da sessão com memória e swap; /ps kill <pid> encerra um deles",
		handler: async (args, ctx) => {
			if (process.platform !== "linux") return ctx.ui.notify("/ps lê /proc e só funciona no Linux.", "warning");
			const [sub, arg] = String(args ?? "")
				.trim()
				.split(/\s+/);
			if (sub === "kill") {
				const pid = Number(arg);
				if (!Number.isInteger(pid) || pid <= 0) return ctx.ui.notify("uso: /ps kill <pid>", "warning");
				return ctx.ui.notify(killSubtree(procReader, process.pid, pid), "info");
			}
			if (sub) return ctx.ui.notify("uso: /ps [kill <pid>]", "warning");
			ctx.ui.notify(formatTree(sessionTree(procReader, process.pid), process.pid).join("\n"), "info");
		},
	});
}
