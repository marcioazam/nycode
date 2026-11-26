// /ps: the session's process tree from a fake /proc, its formatting and the subtree kill limited to the session.
import { describe, expect, it } from "vitest";
import { killSubtree } from "../../../../src/extensions/processos/index.ts";
import { formatTree, type ProcReader, readProc, sessionTree } from "../../../../src/extensions/processos/tree.ts";

interface Fake {
	ppid: number;
	comm: string;
	rss: number;
	swap?: number;
	argv?: string[];
}

function reader(procs: Record<number, Fake>): ProcReader {
	return {
		pids: () => Object.keys(procs).map(Number),
		read: (pid, file) => {
			const p = procs[pid];
			if (!p) return undefined;
			if (file === "stat") return `${pid} (${p.comm}) S ${p.ppid} ${pid} ${pid} 0 -1`;
			if (file === "status")
				return `Name:\t${p.comm}\nVmRSS:\t${p.rss} kB\n${p.swap ? `VmSwap:\t${p.swap} kB\n` : ""}`;
			return p.argv ? `${p.argv.join("\0")}\0` : "";
		},
	};
}

// 100 nycode → 200 mcp (→ 201 its child), 300 run job; 900 belongs to another session.
const PROCS: Record<number, Fake> = {
	100: { ppid: 1, comm: "nycode", rss: 300 * 1024, argv: ["nycode"] },
	200: { ppid: 100, comm: "node", rss: 100 * 1024, swap: 20 * 1024, argv: ["node", "mcp-server.js"] },
	201: { ppid: 200, comm: "kworker) x", rss: 0 },
	300: { ppid: 100, comm: "bash", rss: 4 * 1024, argv: ["bash", "-lc", "npm test"] },
	900: { ppid: 1, comm: "other", rss: 50 * 1024, argv: ["other"] },
};

describe("sessionTree", () => {
	it("lists the root and its descendants, parents before children, and nothing else", () => {
		expect(sessionTree(reader(PROCS), 100).map((p) => p.pid)).toEqual([100, 200, 201, 300]);
	});

	it("is empty when the root is gone", () => {
		expect(sessionTree(reader(PROCS), 42)).toEqual([]);
	});

	it("reads a command name with spaces and parentheses, and falls back to it without a cmdline", () => {
		expect(readProc(reader(PROCS), 201)).toEqual({ pid: 201, ppid: 200, rssKb: 0, swapKb: 0, cmd: "[kworker) x]" });
	});
});

describe("formatTree", () => {
	it("indents by depth, shows swap only when used, and sums the totals", () => {
		expect(formatTree(sessionTree(reader(PROCS), 100), 100)).toEqual([
			"100  300 MB  nycode",
			"  200  100 MB swap 20 MB  node mcp-server.js",
			"    201  0 MB  [kworker) x]",
			"  300  4 MB  bash -lc npm test",
			"total: 4 processos · 404 MB residente · 20 MB em swap",
		]);
	});

	it("cuts a long line to the width", () => {
		const [line] = formatTree([{ pid: 1, ppid: 0, rssKb: 0, swapKb: 0, cmd: "x".repeat(200) }], 1, 20);
		expect(line).toHaveLength(20);
		expect(line?.endsWith("…")).toBe(true);
	});
});

describe("killSubtree", () => {
	it("signals the process and its descendants, children first", () => {
		const sent: number[] = [];
		expect(killSubtree(reader(PROCS), 100, 200, (p) => sent.push(p))).toBe(
			"SIGTERM enviado a 2 processo(s) a partir de 200.",
		);
		expect(sent).toEqual([201, 200]);
	});

	it("refuses the nycode process itself and any pid outside the session", () => {
		const sent: number[] = [];
		expect(killSubtree(reader(PROCS), 100, 100, (p) => sent.push(p))).toMatch(/próprio nycode/);
		expect(killSubtree(reader(PROCS), 100, 900, (p) => sent.push(p))).toMatch(/não é um processo desta sessão/);
		expect(sent).toEqual([]);
	});

	it("counts only the signals that were delivered", () => {
		const fail = (p: number) => {
			if (p === 201) throw new Error("ESRCH");
		};
		expect(killSubtree(reader(PROCS), 100, 200, fail)).toBe("SIGTERM enviado a 1 processo(s) a partir de 200.");
	});
});
