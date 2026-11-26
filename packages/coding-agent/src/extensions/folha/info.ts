/**
 * Saídas informativas do nycode (/context, /memory, /agents, /hooks) viram folha. parseInfo só casa
 * os formatos reais (nycode 1.7.0); qualquer outro texto segue para o notify original.
 */

import { dirname } from "node:path";
import { bar, type Line, MAX_ROWS, Sheet, type SheetModel, type ThemeLike } from "./sheet.ts";

const plain: ThemeLike = { fg: (_c, s) => s, bg: (_c, s) => s, bold: (s) => s };
const BAR_WIDTH = 30;

const abbrev = (dir: string, home: string) =>
	home && (dir === home || dir.startsWith(`${home}/`)) ? `~${dir.slice(home.length)}` : dir;
const num = (s: string) => Number(s.replace(/,/g, ""));
const brNum = (n: number) => n.toLocaleString("pt-BR");
const footer = (lines: Line[]) => (lines.length > MAX_ROWS ? "↑↓ rolar · esc fechar" : "esc fechar");

// context-usage.ts:19 formatContextUsage
function parseContext(lines: string[], t: ThemeLike): SheetModel | undefined {
	const used = /^ {2}Used: +([\d,]+) tokens(?: \(([\d.]+)%\))?$/.exec(lines[1] ?? "");
	if (lines[0] !== "Context usage" || !used) return undefined;
	const rows: Line[] = [];
	if (used[2] !== undefined)
		rows.push({
			kind: "text",
			text: `${bar(t, BAR_WIDTH, Number(used[2]))} ${Number(used[2]).toLocaleString("pt-BR", { minimumFractionDigits: 1 })}%`,
		});
	rows.push({ kind: "row", left: "Usado", right: `${brNum(num(used[1]!))} tokens` });
	const rest = lines.slice(2);
	const win = /^ {2}Window: +([\d,]+) tokens$/.exec(rest[0] ?? "");
	const free = /^ {2}Free: +([\d,]+) tokens$/.exec(rest[1] ?? "");
	if (rest.length !== (win ? (free ? 2 : 1) : 0) || (free && !win)) return undefined;
	if (win) rows.push({ kind: "row", left: "Janela", right: `${brNum(num(win[1]!))} tokens` });
	if (free) rows.push({ kind: "row", left: "Livre", right: `${brNum(num(free[1]!))} tokens` });
	return { title: "Contexto", lines: rows, footer: footer(rows) };
}

// memory.ts:579-587 showMemoryLocations
function parseMemory(lines: string[], home: string): SheetModel | undefined {
	const auto = /^ {2}Auto memory: (on|off)$/.exec(lines[1] ?? "");
	const idx = /^ {2}Index: +(\S.*)$/.exec(lines[3] ?? "");
	const last = lines.at(-1) ?? "";
	if (
		lines[0] !== "Memory" ||
		!auto ||
		!/^ {2}Store: +\S/.test(lines[2] ?? "") ||
		!idx ||
		!last.startsWith("Edit one with /memory edit")
	)
		return undefined;
	const files = [idx[1]!];
	for (const l of lines.slice(4, -1)) {
		const f = /^ {2}[^:]+(?:\([^)]*\))?: (\/\S.*)$/.exec(l);
		if (!f) return undefined;
		files.push(f[1]!.split(" -> ")[0]!);
	}
	if (files.length < 2) return undefined;
	const rows: Line[] = files.map((f) => ({
		kind: "row",
		left: f.slice(f.lastIndexOf("/") + 1),
		right: abbrev(dirname(f), home),
	}));
	return {
		title: "Memória",
		right: auto[1] === "on" ? "● automática ligada" : "○ automática desligada",
		lines: rows,
		footer: footer(rows),
	};
}

const AGENT_GROUPS: Record<string, string> = {
	builtin: "Embutidos",
	user: "Seus",
	project: "Do projeto",
	plugin: "De plugins",
};
const AGENTS_HINT = "Add agents as markdown files under ~/.nycode/agent/agents (user) or .nycode/agents (project).";

// subagent/registry-text.ts:151 agentsListText
function parseAgents(message: string, home: string): SheetModel | undefined {
	if (!message.endsWith(`\n\n${AGENTS_HINT}`)) return undefined;
	const rows: Line[] = [];
	let n = 0;
	for (const l of message.slice(0, -AGENTS_HINT.length - 2).split("\n")) {
		const head = /^(builtin|plugin|user|project):$/.exec(l);
		const entry = /^ {2}(\S.*?) - (.+)$/.exec(l);
		if (head) rows.push({ kind: "group", text: AGENT_GROUPS[head[1]!]! });
		else if (entry && rows.length) {
			n++;
			const p = entry[2]!;
			rows.push({ kind: "row", left: entry[1]!, right: p.includes("/") ? abbrev(dirname(p), home) : undefined });
		} else return undefined;
	}
	if (!n) return undefined;
	return { title: "Agentes", right: n === 1 ? "1 disponível" : `${n} disponíveis`, lines: rows, footer: footer(rows) };
}

// hooks/config.ts:351 formatHooksSummary
function parseHooks(lines: string[]): SheetModel | undefined {
	const rows: Line[] = [];
	let n = 0;
	for (const l of lines) {
		const ev = /^(\S.*):$/.exec(l);
		const hook = /^ {2}\[(.*?)\] (.+)$/.exec(l);
		if (ev) rows.push({ kind: "group", text: ev[1]! });
		else if (hook && rows.length) {
			n++;
			const src = /^(.*\S) \(([^()\s]+)\)$/.exec(hook[2]!);
			const what = (src ? src[1]! : hook[2]!).replace(/^command: /, "");
			const matcher = hook[1] === ".*" || hook[1] === "*" ? "qualquer ferramenta" : hook[1]!;
			rows.push({ kind: "row", left: `${matcher} → ${what}`, right: src?.[2] });
		} else return undefined;
	}
	if (!n) return undefined;
	return { title: "Hooks", right: n === 1 ? "1 ativo" : `${n} ativos`, lines: rows, footer: footer(rows) };
}

/** Modelo da folha para um dos quatro formatos; undefined para o resto. `t` só pinta a barra do contexto. */
export function parseInfo(message: string, home: string, t: ThemeLike = plain): SheetModel | undefined {
	const lines = message.split("\n");
	return parseContext(lines, t) ?? parseMemory(lines, home) ?? parseAgents(message, home) ?? parseHooks(lines);
}

const MARK = Symbol.for("nycode.folha.notify");
export const OVERLAY = { overlay: true, overlayOptions: { anchor: "bottom-center", width: "100%", maxHeight: "70%" } };

export function installNotify(ui: any, home: string): void {
	if (!ui || ui[MARK] || typeof ui.notify !== "function") return;
	const original = ui.notify.bind(ui);
	ui.notify = (message: unknown, type?: unknown, ...rest: unknown[]) => {
		const fallback = () => original(message, type, ...rest);
		if ((type !== undefined && type !== "info") || typeof message !== "string" || typeof ui.custom !== "function")
			return fallback();
		try {
			if (!parseInfo(message, home)) return fallback();
			const shown = ui.custom(
				(tui: any, theme: ThemeLike, _kb: unknown, done: (v?: string) => void) =>
					new Sheet(theme, parseInfo(message, home, theme)!, done, () => tui.requestRender()),
				OVERLAY,
			);
			Promise.resolve(shown).catch(fallback);
		} catch {
			return fallback();
		}
	};
	ui[MARK] = true;
}
