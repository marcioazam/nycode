// The session's process tree read from Linux /proc: every descendant of the nycode process (MCP servers, run jobs,
// subagents, hooks) with its resident memory and swap. Pure over a small reader so tests feed a fake /proc.

export interface Proc {
	pid: number;
	ppid: number;
	/** Resident set size, KiB (VmRSS). */
	rssKb: number;
	/** Swapped-out memory, KiB (VmSwap). */
	swapKb: number;
	cmd: string;
}

/** What tree.ts needs from /proc; `undefined` when the process is gone or unreadable. */
export interface ProcReader {
	pids(): number[];
	read(pid: number, file: "stat" | "status" | "cmdline"): string | undefined;
}

/** Reads one process, or `undefined` when it exited between the listing and the read. */
export function readProc(reader: ProcReader, pid: number): Proc | undefined {
	const stat = reader.read(pid, "stat");
	const status = reader.read(pid, "status");
	if (stat === undefined || status === undefined) return undefined;
	// The command name (field 2) is in parentheses and may hold spaces or ")": fields resume after the last ")".
	const close = stat.lastIndexOf(")");
	const comm = stat.slice(stat.indexOf("(") + 1, close);
	const ppid = Number(stat.slice(close + 2).split(" ")[1]);
	const kb = (re: RegExp) => Number(re.exec(status)?.[1] ?? 0);
	const argv = (reader.read(pid, "cmdline") ?? "").split("\0").filter(Boolean).join(" ");
	return { pid, ppid, rssKb: kb(/^VmRSS:\s+(\d+)/m), swapKb: kb(/^VmSwap:\s+(\d+)/m), cmd: argv || `[${comm}]` };
}

/** `root` and all its descendants, parents before children; empty when `root` is gone. */
export function sessionTree(reader: ProcReader, root: number): Proc[] {
	const all = reader.pids().flatMap((pid) => readProc(reader, pid) ?? []);
	const children = new Map<number, Proc[]>();
	for (const p of all) children.set(p.ppid, [...(children.get(p.ppid) ?? []), p]);
	const top = all.find((p) => p.pid === root);
	if (!top) return [];
	const out: Proc[] = [];
	const visit = (p: Proc) => {
		out.push(p);
		for (const c of children.get(p.pid) ?? []) visit(c);
	};
	visit(top);
	return out;
}

const mb = (kb: number) => `${(kb / 1024).toFixed(0)} MB`;

/** One line per process, indented by depth under `root`, then the totals; `width` caps each line. */
export function formatTree(procs: Proc[], root: number, width = 120): string[] {
	const depth = new Map<number, number>([[root, 0]]);
	const lines = procs.map((p) => {
		const d = p.pid === root ? 0 : (depth.get(p.ppid) ?? 0) + 1;
		depth.set(p.pid, d);
		const swap = p.swapKb > 0 ? ` swap ${mb(p.swapKb)}` : "";
		const line = `${"  ".repeat(d)}${p.pid}  ${mb(p.rssKb)}${swap}  ${p.cmd}`;
		return line.length > width ? `${line.slice(0, width - 1)}…` : line;
	});
	const rss = procs.reduce((s, p) => s + p.rssKb, 0);
	const swap = procs.reduce((s, p) => s + p.swapKb, 0);
	return [...lines, `total: ${procs.length} processos · ${mb(rss)} residente · ${mb(swap)} em swap`];
}
