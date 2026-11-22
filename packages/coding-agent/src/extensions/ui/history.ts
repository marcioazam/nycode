/**
 * Ferramentas de prompt do editor: histórico pesquisável (Ctrl+R) com leitura limitada dos JSONL de sessão
 * e rascunho guardado (Ctrl+S). Funções puras + componente do overlay.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { matchesKey, truncateToWidth, visibleWidth } from "@nycode/tui";
import { teclas } from "../folha/sheet.ts";
import { ascii } from "../ui-visual/icons.ts";

export const MAX_FILES = 300;
export const MAX_FILE_BYTES = 128 * 1024 * 1024;
export const MAX_PROMPTS = 5000;

export type Scope = "sessão" | "projeto" | "todas";
export const SCOPES: Scope[] = ["sessão", "projeto", "todas"];

/** Entrada de sessão como o histórico a lê: SessionEntry do core ou uma linha de JSONL (fronteira de confiança). */
export interface EntryLike {
	type?: string;
	timestamp?: string;
	message?: MessageLike;
}
interface MessageLike {
	role?: string;
	content?: unknown;
	timestamp?: number;
}

/** Texto de uma mensagem de usuário (string ou blocos text); undefined se não for de usuário. */
export function messageText(m: MessageLike | undefined): string | undefined {
	if (m?.role !== "user") return undefined;
	if (typeof m.content === "string") return m.content;
	if (!Array.isArray(m.content)) return undefined;
	return (m.content as ({ type?: string; text?: string } | null)[])
		.filter((c) => c?.type === "text")
		.map((c) => c?.text)
		.join(" ");
}

export interface Prompt {
	text: string;
	at?: number;
}

/** Instante (ms) de uma entrada de sessão: `message.timestamp` (ms) ou `timestamp` ISO da entrada; undefined se não houver. */
export function entryTime(o: EntryLike | undefined): number | undefined {
	const ms = typeof o?.message?.timestamp === "number" ? o.message.timestamp : Date.parse(o?.timestamp ?? "");
	return Number.isFinite(ms) ? ms : undefined;
}

/** Prompts de usuário de um JSONL de sessão com a hora (quando a entrada tem), na ordem do arquivo; linhas corrompidas são ignoradas. */
export function parseUserPromptsAt(jsonl: string): Prompt[] {
	const out: Prompt[] = [];
	for (const line of jsonl.split("\n")) {
		if (!line.includes('"role":"user"')) continue;
		try {
			const o = JSON.parse(line);
			const t = o?.type === "message" ? messageText(o.message) : undefined;
			if (t?.trim()) out.push({ text: t, at: entryTime(o) });
		} catch {
			/* linha corrompida: pula */
		}
	}
	return out;
}

/** Prompts de usuário de um JSONL de sessão, na ordem do arquivo. */
export const parseUserPrompts = (jsonl: string): string[] => parseUserPromptsAt(jsonl).map((p) => p.text);

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const dayStart = (ms: number): number => new Date(new Date(ms).setHours(0, 0, 0, 0)).getTime();

/** Idade para a lista: `agora`, `há 5 min`, `há 2 h`, `ontem`, `3 nov` (com o ano se for de outro ano). Hora no futuro conta como agora. */
export function ageLabel(at: number, now: number = Date.now()): string {
	const min = Math.floor((now - at) / 60_000);
	if (min < 1) return "agora";
	if (min < 60) return `há ${min} min`;
	const days = Math.round((dayStart(now) - dayStart(at)) / 86_400_000);
	if (days < 1) return `há ${Math.floor(min / 60)} h`;
	if (days === 1) return "ontem";
	const d = new Date(at);
	return `${d.getDate()} ${MESES[d.getMonth()]}${d.getFullYear() === new Date(now).getFullYear() ? "" : ` ${d.getFullYear()}`}`;
}

/** Mais recentes primeiro (entrada em ordem cronológica), sem repetidos. */
export function dedupeNewestFirst(chronological: string[]): string[] {
	return [...new Set([...chronological].reverse())];
}

/** Todas as palavras da consulta (sem caixa) precisam aparecer no prompt. */
export function filterPrompts(prompts: string[], query: string): string[] {
	const words = query.toLowerCase().split(/\s+/).filter(Boolean);
	if (!words.length) return prompts;
	return prompts.filter((p) => {
		const low = p.toLowerCase();
		return words.every((w) => low.includes(w));
	});
}

/** Uma linha para a lista: quebras de linha viram `⏎`. */
export const oneLine = (p: string): string => p.trim().replace(/\s*\r?\n\s*/g, " ⏎ ");

/** Ctrl+S: texto → guarda e limpa; vazio com guardado → devolve; os dois → troca. */
export function stashStep(text: string, stash: string | undefined): { text: string; stash: string | undefined } {
	if (text !== "") return { text: stash ?? "", stash: text };
	if (stash !== undefined) return { text: stash, stash: undefined };
	return { text, stash };
}

interface CacheEntry {
	mtimeMs: number;
	size: number;
	prompts: Prompt[];
}
export type PromptCache = Map<string, CacheEntry>;
export const defaultCache: PromptCache = new Map();

interface FileInfo {
	path: string;
	mtimeMs: number;
	size: number;
}

/** Prompts mais recentes primeiro, as falhas de leitura e, quando a fonte tem data, a hora de cada prompt (sem data: sem idade). */
export interface Loaded {
	prompts: string[];
	skipped: number;
	when?: Map<string, number>;
}

/** *.jsonl dos diretórios, mais novos primeiro, no máximo MAX_FILES; erros de leitura contam em `skipped`. */
export async function listSessionFiles(dirs: string[]): Promise<{ files: FileInfo[]; skipped: number }> {
	let skipped = 0;
	const all: FileInfo[] = [];
	for (const dir of dirs) {
		let names: string[];
		try {
			names = (await readdir(dir)).filter((n) => n.endsWith(".jsonl"));
		} catch {
			skipped++;
			continue;
		}
		for (const n of names) {
			const path = join(dir, n);
			try {
				const s = await stat(path);
				if (s.isFile()) all.push({ path, mtimeMs: s.mtimeMs, size: s.size });
			} catch {
				skipped++;
			}
		}
	}
	all.sort((a, b) => b.mtimeMs - a.mtimeMs);
	return { files: all.slice(0, MAX_FILES), skipped };
}

/** Prompts (mais recentes primeiro, sem repetidos, ≤MAX_PROMPTS) dos arquivos; cache por caminho, mtime e tamanho. */
export async function loadFromDirs(dirs: string[], cache: PromptCache = defaultCache): Promise<Loaded> {
	const { files, skipped: listSkipped } = await listSessionFiles(dirs);
	let skipped = listSkipped;
	const seen = new Set<string>();
	const prompts: string[] = [];
	const when = new Map<string, number>();
	for (const f of files) {
		if (prompts.length >= MAX_PROMPTS) break;
		if (f.size > MAX_FILE_BYTES) {
			skipped++;
			continue;
		}
		let list: Prompt[];
		const hit = cache.get(f.path);
		if (hit && hit.mtimeMs === f.mtimeMs && hit.size === f.size) list = hit.prompts;
		else {
			try {
				list = parseUserPromptsAt(await readFile(f.path, "utf8"));
				cache.set(f.path, { mtimeMs: f.mtimeMs, size: f.size, prompts: list });
			} catch {
				skipped++;
				continue;
			}
		}
		for (let i = list.length - 1; i >= 0 && prompts.length < MAX_PROMPTS; i--) {
			const { text, at } = list[i]!;
			if (!seen.has(text)) {
				seen.add(text);
				prompts.push(text);
				if (at !== undefined) when.set(text, at);
			}
		}
	}
	return { prompts, skipped, when };
}

export interface HistorySource {
	branch: EntryLike[];
	sessionDir: string;
}

/** Prompts de um escopo: sessão = ramo atual; projeto = diretório da sessão; todas = irmãos desse diretório. */
export async function loadScope(scope: Scope, src: HistorySource, cache: PromptCache = defaultCache): Promise<Loaded> {
	if (scope === "sessão") {
		const chrono = src.branch.flatMap((e): Prompt[] => {
			const text = e?.type === "message" ? messageText(e.message) : undefined;
			return text?.trim() ? [{ text, at: entryTime(e) }] : [];
		});
		const when = new Map<string, number>();
		for (const { text, at } of chrono) if (at !== undefined) when.set(text, at); // o mais recente de cada texto vence
		return { prompts: dedupeNewestFirst(chrono.map((p) => p.text)).slice(0, MAX_PROMPTS), skipped: 0, when };
	}
	if (scope === "projeto") return loadFromDirs([src.sessionDir], cache);
	const parent = dirname(src.sessionDir);
	try {
		const dirs = (await readdir(parent, { withFileTypes: true }))
			.filter((d) => d.isDirectory())
			.map((d) => join(parent, d.name));
		return loadFromDirs(dirs, cache);
	} catch {
		return { prompts: [], skipped: 1 };
	}
}

interface ThemeLike {
	fg(c: string, s: string): string;
	bg(c: string, s: string): string;
	bold(s: string): string;
}
const MAX_ROWS = 10;
const WHERE: Record<Scope, string> = { sessão: "nesta sessão", projeto: "neste projeto", todas: "em nenhuma sessão" };
const CURSOR = "\x1b[7m \x1b[27m";

/** Destaca no texto (sem ANSI) cada trecho que casa uma palavra da consulta, sem caixa. */
export function highlight(text: string, query: string, mark: (s: string) => string): string {
	const words = query
		.split(/\s+/)
		.filter(Boolean)
		.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
	return words.length ? text.replace(new RegExp(words.join("|"), "gi"), mark) : text;
}

/** Overlay "Histórico de prompts": filtro, ↑↓, Enter escolhe, Esc fecha, Tab troca o escopo. */
export class PromptHistory {
	scope: Scope = "sessão";
	query = "";
	index = 0;
	loading = true;
	items: string[] = [];
	skipped = 0;
	when = new Map<string, number>();
	private token = 0;
	private readonly theme: ThemeLike;
	private readonly load: (scope: Scope) => Promise<Loaded>;
	private readonly done: (v: string | undefined) => void;
	private readonly redraw: () => void;

	constructor(
		theme: ThemeLike,
		load: (scope: Scope) => Promise<Loaded>,
		done: (v: string | undefined) => void,
		redraw: () => void,
	) {
		this.theme = theme;
		this.load = load;
		this.done = done;
		this.redraw = redraw;
		void this.reload();
	}

	async reload(): Promise<void> {
		const mine = ++this.token;
		this.loading = true;
		this.redraw();
		let r: Loaded;
		try {
			r = await this.load(this.scope);
		} catch {
			r = { prompts: [], skipped: 1 };
		}
		if (mine !== this.token) return; // escopo mudou durante a leitura
		this.items = r.prompts;
		this.skipped = r.skipped;
		this.when = r.when ?? new Map();
		this.loading = false;
		this.index = 0;
		this.redraw();
	}

	visible(): string[] {
		return filterPrompts(this.items, this.query);
	}

	handleInput(data: string): void {
		const list = this.visible();
		if (matchesKey(data, "escape") || matchesKey(data, "ctrl+c")) {
			this.done(undefined);
			return;
		}
		if (matchesKey(data, "enter")) {
			if (list[this.index] !== undefined) this.done(list[this.index]);
			return;
		}
		if (matchesKey(data, "tab")) {
			this.scope = SCOPES[(SCOPES.indexOf(this.scope) + 1) % SCOPES.length]!;
			void this.reload();
			return;
		}
		if (matchesKey(data, "up")) this.index = Math.max(0, this.index - 1);
		else if (matchesKey(data, "down")) this.index = Math.min(Math.max(0, list.length - 1), this.index + 1);
		else if (matchesKey(data, "backspace")) {
			this.query = this.query.slice(0, -1);
			this.index = 0;
		} else if (data.length > 0 && !/[\x00-\x1f\x7f]/.test(data) && !data.startsWith("\x1b")) {
			this.query += data;
			this.index = 0;
		} else return;
		this.redraw();
	}

	render(width: number): string[] {
		const t = this.theme;
		const dim = (s: string) => t.fg("dim", s);
		const rule = (s: string) => t.fg("borderMuted", s);
		const flat = ascii(process.env);
		const pad = (s: string) => s + " ".repeat(Math.max(0, width - visibleWidth(s))); // cobre o que está por baixo
		const clip = (s: string) => pad(truncateToWidth(s, width, "…"));
		// Controle segmentado: o escopo ativo é cápsula em negrito (sobrevive a NO_COLOR), os outros ficam apagados.
		const cap = (s: string) => {
			try {
				return t.bg("customMessageBg", t.bold(` ${s} `));
			} catch {
				return t.bold(` ${s} `);
			}
		};
		const tabs = SCOPES.map((s) => (s === this.scope ? cap(s) : dim(` ${s} `))).join(" ");
		const fill = width - visibleWidth(tabs) - 17; // "── Histórico " + " " + " ──"
		const out = [
			fill >= 1
				? clip(rule("── ") + t.bold("Histórico") + rule(` ${"─".repeat(fill)} `) + tabs + rule(" ──"))
				: clip(tabs),
		];
		const list = this.loading ? [] : this.visible();
		const count = list.length ? `${this.index + 1} de ${list.length}` : "";
		const lupa = dim(flat ? "/" : "⌕");
		const field = truncateToWidth(
			` ${lupa} ${this.query ? this.query + CURSOR : CURSOR + dim("Buscar nos prompts")}`,
			Math.max(1, width - count.length - 2),
			"…",
		);
		out.push(pad(field + " ".repeat(Math.max(1, width - visibleWidth(field) - count.length - 1)) + dim(count)));
		const wider = this.scope === "todas" ? "" : " · Tab amplia a busca";
		if (this.loading) out.push(clip(dim(" Carregando…")));
		else if (!this.items.length) out.push(clip(dim(` Nenhum prompt ${WHERE[this.scope]} ainda${wider}`)));
		else if (!list.length) out.push(clip(dim(` Nada com “${this.query}”${wider}`)));
		const start = Math.max(0, Math.min(this.index - Math.floor(MAX_ROWS / 2), list.length - MAX_ROWS));
		const now = Date.now();
		for (let i = start; i < Math.min(list.length, start + MAX_ROWS); i++) {
			const at = this.when.get(list[i]!);
			let age = at === undefined ? "" : ageLabel(at, now);
			if (width - 4 - age.length - 2 < 10) age = ""; // sem espaço para a idade
			const plain = truncateToWidth(oneLine(list[i]!), Math.max(1, width - 4 - (age ? age.length + 2 : 0)), "…");
			const text =
				highlight(plain, this.query, (m) => t.bold(m)) +
				(age ? " ".repeat(Math.max(1, width - 4 - visibleWidth(plain) - age.length)) + dim(age) : "");
			out.push(
				i === this.index
					? t.bg("selectedBg", pad(` ${t.fg("accent", flat ? ">" : "❯")} ${text}`))
					: pad(`   ${text}`),
			);
		}
		if (this.skipped)
			out.push(clip(dim(` ${this.skipped} ${this.skipped === 1 ? "arquivo ignorado" : "arquivos ignorados"}`)));
		out.push(
			clip(
				` ${teclas(t, [
					[flat ? "Enter" : "⏎", "usar"],
					["tab", "escopo"],
					["esc", "fechar"],
				])}`,
			),
			rule("─".repeat(width)),
		);
		return out;
	}

	invalidate(): void {}
}
