/**
 * The /subagents-setup modal (docs/harness/subagents-setup-ui-2026-11-26.md): step 1 marks the models subagents may
 * use, grouped by provider, with a search field and a scrolling viewport; step 2 marks, per marked model, the efforts
 * allowed. State, keys and rendering live here; the theme is optional so tests render plain text.
 */

import type { Component, TuiMouseEvent, TuiMouseEventResult } from "@nycode/tui";
import { decodeKittyPrintable, isKeyRelease, matchesKey, truncateToWidth, visibleWidth } from "@nycode/tui";
import type { Theme, ThemeColor } from "../../../modes/interactive/theme/theme.ts";
import { NASCE_MS, nasce } from "../../ui-visual/moldura/nasce.ts";
import { anima, assinarQuadro } from "../../ui-visual/motion/motion.ts";
import { EFFORTS, type Effort, type RoutingPolicy } from "./policy.ts";

export interface SetupModel {
	key: string;
	/** Efforts this model supports, ascending. */
	levels: Effort[];
}

export interface SetupOptions {
	models: SetupModel[];
	current: RoutingPolicy | undefined;
	/** The new policy on enter at the last step, undefined on esc. */
	done: (policy: RoutingPolicy | undefined) => void;
	requestRender?: () => void;
	/** Colors; without it (tests, NO_COLOR) the modal renders plain text and does not animate. */
	theme?: Theme;
	/** Terminal height, for the viewport: the overlay takes at most 85% of it. */
	rows?: () => number;
	/** Step 1 title, bold name then a muted hint; /travar-modelos reuses the modal with its own. */
	title?: { name: string; hint: string };
}

const SUBAGENTS_TITLE = { name: "Subagentes", hint: "quais modelos podem usar" };

type Row =
	| { kind: "group"; provider: string; marked: number; total: number }
	| { kind: "model"; model: SetupModel }
	| { kind: "effort"; effort: Effort };

/** What a model not in the current policy starts with: the everyday levels, else everything it supports. */
const DEFAULT_LEVELS: readonly Effort[] = ["low", "medium", "high"];
/** Same cap as the overlay (fleet-ui OVERLAY_OPTIONS maxHeight). */
const MAX_HEIGHT = 0.85;
/** Rows kept visible around the cursor while scrolling. */
const SCROLL_OFF = 2;
const TOGGLE_MS = 180;
const RING = ["○", "◔", "◑", "◕", "●"];
const EFFORT_COLOR: Record<Effort, ThemeColor> = {
	off: "thinkingOff",
	minimal: "thinkingMinimal",
	low: "thinkingLow",
	medium: "thinkingMedium",
	high: "thinkingHigh",
	xhigh: "thinkingXhigh",
	max: "thinkingMax",
};
const SHORT: Partial<Record<Effort, string>> = { minimal: "min", medium: "med" };

const providerOf = (key: string) => key.slice(0, Math.max(0, key.indexOf("/")));
const idOf = (key: string) => key.slice(key.indexOf("/") + 1);
/** Subsequence match, for queries that are not a substring ("gpt5" finds "gpt-5"). */
function fuzzy(query: string, text: string): boolean {
	let i = 0;
	for (const c of text) if (c === query[i]) i++;
	return i === query.length;
}

export class SetupComponent implements Component {
	private step: "models" | "efforts" = "models";
	private cursor = 0;
	private scrollTop = 0;
	private filter = "";
	private onlyMarked = false;
	private error = "";
	private readonly marked: Set<string>;
	private readonly efforts = new Map<string, Set<Effort>>();
	private queue: SetupModel[] = [];
	private page = 0;
	private openedAt: number | undefined;
	private toggled: { key: string; at: number; on: boolean } | undefined;
	private viewport = 10;
	private stopFrames: (() => void) | undefined;

	private readonly opts: SetupOptions;

	constructor(opts: SetupOptions) {
		this.opts = opts;
		this.marked = new Set(opts.models.filter((m) => opts.current?.models[m.key]).map((m) => m.key));
		this.cursor = this.firstSelectable();
	}

	private get animated(): boolean {
		return this.opts.theme !== undefined && anima();
	}

	/** The scrolling rows of the current step: provider groups and their models, or one model's efforts. */
	private rows(): Row[] {
		if (this.step === "efforts")
			return (this.queue[this.page]?.levels ?? []).map((effort) => ({ kind: "effort", effort }));
		const q = this.filter.toLowerCase();
		let list = this.opts.models;
		if (this.onlyMarked) list = list.filter((m) => this.marked.has(m.key));
		if (q) {
			// Fuzzy only when nothing contains the text: on hundreds of models a subsequence matches almost anything.
			const exact = list.filter((m) => m.key.toLowerCase().includes(q));
			list = exact.length ? exact : list.filter((m) => fuzzy(q, m.key.toLowerCase()));
		}
		const providers = [...new Set(this.opts.models.map((m) => providerOf(m.key)))];
		const out: Row[] = [];
		for (const provider of providers) {
			const shown = list.filter((m) => providerOf(m.key) === provider);
			if (shown.length === 0) continue;
			const all = this.opts.models.filter((m) => providerOf(m.key) === provider);
			out.push({
				kind: "group",
				provider,
				marked: all.filter((m) => this.marked.has(m.key)).length,
				total: all.length,
			});
			for (const model of shown) out.push({ kind: "model", model });
		}
		return out;
	}

	private selectable(rows = this.rows()): number[] {
		return rows.flatMap((r, i) => (r.kind === "group" ? [] : [i]));
	}

	private firstSelectable(): number {
		return this.selectable()[0] ?? 0;
	}

	private effortsOf(model: SetupModel): Set<Effort> {
		let set = this.efforts.get(model.key);
		if (!set) {
			const own = this.opts.current?.models[model.key]?.filter((e) => model.levels.includes(e));
			const fallback = model.levels.filter((e) => DEFAULT_LEVELS.includes(e));
			set = new Set(own?.length ? own : fallback.length ? fallback : model.levels);
			this.efforts.set(model.key, set);
		}
		return set;
	}

	private move(delta: number): void {
		const sel = this.selectable();
		if (sel.length === 0) return;
		const at = Math.max(0, sel.indexOf(this.cursor));
		this.cursor = sel[Math.max(0, Math.min(sel.length - 1, at + delta))]!;
	}

	private toggle(): void {
		const row = this.rows()[this.cursor];
		if (!row || row.kind === "group") return;
		this.error = "";
		const [set, item, key] =
			row.kind === "model"
				? [this.marked as Set<string>, row.model.key, row.model.key]
				: [
						this.effortsOf(this.queue[this.page]!) as Set<string>,
						row.effort,
						`${this.queue[this.page]!.key}:${row.effort}`,
					];
		const on = !set.has(item);
		if (on) set.add(item);
		else set.delete(item);
		this.toggled = { key, at: performance.now(), on };
		this.animate(TOGGLE_MS);
	}

	private setFilter(next: string, onlyMarked = this.onlyMarked): void {
		this.filter = next;
		this.onlyMarked = onlyMarked;
		this.scrollTop = 0;
		this.cursor = this.firstSelectable();
	}

	private enter(): void {
		if (this.step === "models") {
			this.queue = this.opts.models.filter((m) => this.marked.has(m.key));
			if (this.queue.length === 0) {
				this.error = "Marque ao menos um modelo.";
				return;
			}
			this.showPage("efforts", 0);
			return;
		}
		if (this.effortsOf(this.queue[this.page]!).size === 0) {
			this.error = "Marque ao menos um nível.";
			return;
		}
		if (this.page + 1 < this.queue.length) {
			this.showPage("efforts", this.page + 1);
			return;
		}
		const models: Record<string, Effort[]> = {};
		for (const m of this.queue) models[m.key] = EFFORTS.filter((e) => this.effortsOf(m).has(e));
		this.finish({ version: 1, models });
	}

	/** Esc: clears the search first, then steps back a page, then cancels. */
	private back(): void {
		if (this.step === "models" && (this.filter || this.onlyMarked)) this.setFilter("", false);
		else if (this.step === "efforts" && this.page > 0) this.showPage("efforts", this.page - 1);
		else if (this.step === "efforts") this.showPage("models", 0);
		else this.finish(undefined);
	}

	private showPage(step: "models" | "efforts", page: number): void {
		this.step = step;
		this.page = page;
		this.scrollTop = 0;
		this.error = "";
		this.cursor = this.firstSelectable();
	}

	private finish(policy: RoutingPolicy | undefined): void {
		this.stopFrames?.();
		this.opts.done(policy);
	}

	/** Asks the shared frame clock for renders until `ms` after now (entrance fade, toggle ring). */
	private animate(ms: number): void {
		if (!this.animated || !this.opts.requestRender) return;
		const until = performance.now() + ms;
		this.stopFrames?.();
		this.stopFrames = assinarQuadro(
			"subagents-setup",
			(now) => {
				this.opts.requestRender?.();
				return now <= until + 34;
			},
			{ transicao: true },
		);
	}

	handleInput(data: string): void {
		if (isKeyRelease(data)) return;
		const search = this.step === "models";
		const char = decodeKittyPrintable(data) ?? data;
		if (matchesKey(data, "escape")) this.back();
		else if (matchesKey(data, "up")) this.move(-1);
		else if (matchesKey(data, "down")) this.move(1);
		else if (matchesKey(data, "pageUp")) this.move(-Math.max(1, this.viewport - 1));
		else if (matchesKey(data, "pageDown")) this.move(Math.max(1, this.viewport - 1));
		else if (matchesKey(data, "home")) this.move(-Infinity);
		else if (matchesKey(data, "end")) this.move(Infinity);
		else if (matchesKey(data, "space")) this.toggle();
		else if (matchesKey(data, "enter")) this.enter();
		else if (search && matchesKey(data, "tab")) this.setFilter(this.filter, !this.onlyMarked);
		else if (search && matchesKey(data, "backspace")) this.setFilter(this.filter.slice(0, -1));
		else if (search && matchesKey(data, "ctrl+u")) this.setFilter("");
		else if (search && /^[\w./:-]$/.test(char)) this.setFilter(this.filter + char);
		else return;
		this.opts.requestRender?.();
	}

	/** The wheel moves the cursor, so the viewport follows it the same way as with the arrow keys. */
	handleMouse(event: TuiMouseEvent): TuiMouseEventResult | undefined {
		if (event.type !== "wheel" || !event.wheelDelta) return undefined;
		this.move(event.wheelDelta);
		return { handled: true, render: true };
	}

	render(width: number): string[] {
		const t = this.opts.theme;
		const fg = (c: ThemeColor, s: string) => (t ? t.fg(c, s) : s);
		const bold = (s: string) => (t ? t.bold(s) : s);
		const iw = Math.max(1, width - 4);
		const rows = this.rows();
		const search = this.step === "models";
		const chrome = search ? 7 : 4;
		const maxLines = Math.floor((this.opts.rows?.() ?? 24) * MAX_HEIGHT);
		this.viewport = Math.max(3, Math.min(rows.length, maxLines - chrome));
		this.scrollTop = this.follow(rows.length);

		const lines: string[] = [this.top(width, fg, bold)];
		const frame = (content: string, bar = "│", bg: "customMessageBg" | "selectedBg" = "customMessageBg") =>
			this.paintRow(content, iw, bar, bg, fg);
		if (search) {
			const matches = rows.filter((r) => r.kind === "model").length;
			const query = this.filter
				? `${fg("text", this.filter)}${fg("accent", "▏")}`
				: `${fg("accent", "▏")}${fg("borderMuted", "filtrar modelos…")}`;
			const scope = `   ${matches} de ${this.opts.models.length}${this.onlyMarked ? " · só marcados" : ""}`;
			lines.push(frame(`${fg("accent", "⌕ ")}${query}${fg("dim", scope)}`));
			lines.push(frame(this.scrollTop > 0 ? fg("dim", `  ↑ ${this.scrollTop} acima`) : ""));
		}
		const thumb = this.thumb(rows.length);
		const over = rows.length > this.viewport;
		for (let i = 0; i < this.viewport; i++) {
			const index = this.scrollTop + i;
			let row = rows[index];
			// The group label sticks to the top while its models scroll under it.
			let sticky = false;
			// Not when the next row starts a group: the label would sit right above another one.
			if (i === 0 && row && row.kind !== "group" && rows[index + 1]?.kind !== "group") {
				const group = rows.slice(0, index).findLast((r) => r.kind === "group");
				if (group) [row, sticky] = [group, true];
			}
			const focused = index === this.cursor && row === rows[index];
			const bar = over ? (thumb(i) ? fg("muted", thumb(i)) : fg("borderMuted", "▕")) : "│";
			lines.push(
				frame(
					row ? this.rowText(row, focused, iw, sticky, fg, bold) : "",
					bar,
					focused ? "selectedBg" : "customMessageBg",
				),
			);
		}
		if (search) {
			const below = Math.max(0, rows.length - this.scrollTop - this.viewport);
			lines.push(frame(below ? fg("dim", `  ↓ ${below} abaixo`) : ""));
		}
		lines.push(frame(""));
		lines.push(frame(this.error ? fg("warning", this.error) : this.keys(fg)));
		lines.push(this.paintEdge(`╰${"─".repeat(Math.max(0, width - 2))}╯`, width, fg));

		if (!this.animated) return lines;
		if (this.openedAt === undefined) {
			this.openedAt = performance.now();
			this.animate(NASCE_MS);
		}
		const age = performance.now() - this.openedAt;
		// nasce reads the two colors by token name as plain strings; both tokens exist in every theme.
		return age < NASCE_MS ? nasce(lines, t as Parameters<typeof nasce>[1], age) : lines;
	}

	/** Scroll position that keeps the cursor `SCROLL_OFF` rows from the edges, and a group label above its first model. */
	private follow(total: number): number {
		const vh = this.viewport;
		let top = this.scrollTop;
		if (this.cursor - SCROLL_OFF < top) top = this.cursor - SCROLL_OFF;
		if (this.cursor + SCROLL_OFF >= top + vh) top = this.cursor + SCROLL_OFF - vh + 1;
		return Math.max(0, Math.min(Math.max(0, total - vh), top));
	}

	/** Scrollbar thumb in half cells (▀ ▄ █), so it moves in steps of half a row. */
	private thumb(total: number): (row: number) => string {
		const vh = this.viewport;
		const halves = vh * 2;
		const size = Math.max(2, Math.round((halves * vh) / Math.max(1, total)));
		const top = Math.round(((halves - size) * this.scrollTop) / Math.max(1, total - vh));
		return (row) => {
			const a = row * 2 >= top && row * 2 < top + size;
			const b = row * 2 + 1 >= top && row * 2 + 1 < top + size;
			return a && b ? "█" : a ? "▀" : b ? "▄" : "";
		};
	}

	private top(width: number, fg: (c: ThemeColor, s: string) => string, bold: (s: string) => string): string {
		const named = this.opts.title ?? SUBAGENTS_TITLE;
		const title =
			this.step === "efforts"
				? `${fg("muted", "Níveis de ")}${bold(fg("text", this.queue[this.page]!.key))}`
				: `${bold(fg("text", named.name))}${fg("muted", ` · ${named.hint}`)}`;
		const side =
			this.step === "efforts"
				? `passo 2 · ${this.page + 1}/${this.queue.length}`
				: `passo 1 · ${this.marked.size} ${this.marked.size === 1 ? "marcado" : "marcados"}`;
		const head = `${fg("borderMuted", "╭─ ")}${title} `;
		const rule = Math.max(1, width - visibleWidth(head) - side.length - 4);
		return this.paintEdge(
			`${head}${fg("borderMuted", "─".repeat(rule))} ${fg("dim", side)} ${fg("borderMuted", "─╮")}`,
			width,
			fg,
		);
	}

	private rowText(
		row: Row,
		focused: boolean,
		width: number,
		sticky: boolean,
		fg: (c: ThemeColor, s: string) => string,
		bold: (s: string) => string,
	): string {
		if (row.kind === "group") {
			const count = `${row.marked}/${row.total}`;
			const label = `${sticky ? fg("borderMuted", "▴") : " "} ${bold(fg("accent", row.provider))} `;
			const rule = Math.max(1, width - visibleWidth(label) - count.length - 2);
			return `${label}${fg("borderMuted", "─".repeat(rule))} ${fg(row.marked ? "success" : "dim", count)}`;
		}
		const lead = focused ? fg("accent", "▌") : " ";
		if (row.kind === "effort") {
			const key = `${this.queue[this.page]!.key}:${row.effort}`;
			const on = this.effortsOf(this.queue[this.page]!).has(row.effort);
			const name = fg(EFFORT_COLOR[row.effort], row.effort);
			return `${lead} ${this.mark(key, on, fg)}  ${focused ? bold(name) : name}`;
		}
		const m = row.model;
		const on = this.marked.has(m.key);
		const name = this.highlight(idOf(m.key), on || focused ? "text" : "muted", fg);
		const left = `${lead} ${this.mark(m.key, on, fg)}  ${focused ? bold(name) : name}`;
		const right = on
			? this.strip(m, width - visibleWidth(left) - 2, fg)
			: fg("borderMuted", `${m.levels.length} ${m.levels.length === 1 ? "nível" : "níveis"}`);
		const gap = width - visibleWidth(left) - visibleWidth(right) - 1;
		return gap > 0 ? `${left}${" ".repeat(gap)}${right}` : left;
	}

	/** The model name with the searched text underlined in accent. */
	private highlight(text: string, color: ThemeColor, fg: (c: ThemeColor, s: string) => string): string {
		const at = this.filter ? text.toLowerCase().indexOf(this.filter.toLowerCase()) : -1;
		if (at < 0) return fg(color, text);
		const end = at + this.filter.length;
		const hit = this.opts.theme ? this.opts.theme.underline(fg("accent", text.slice(at, end))) : text.slice(at, end);
		return `${fg(color, text.slice(0, at))}${hit}${fg(color, text.slice(end))}`;
	}

	/** A marked model's levels as `off·low·med·high`: allowed ones in their color, the rest faint; `2/4` when narrow. */
	private strip(m: SetupModel, room: number, fg: (c: ThemeColor, s: string) => string): string {
		const set = this.effortsOf(m);
		const full = m.levels.map((e) => SHORT[e] ?? e).join("·");
		if (full.length > room) return fg("dim", `${set.size}/${m.levels.length}`);
		return m.levels
			.map((e) => fg(set.has(e) ? EFFORT_COLOR[e] : "borderMuted", SHORT[e] ?? e))
			.join(fg("borderMuted", "·"));
	}

	/** ○ or ●; right after a toggle the ring fills (or empties) over TOGGLE_MS. */
	private mark(key: string, on: boolean, fg: (c: ThemeColor, s: string) => string): string {
		const age = this.toggled?.key === key ? performance.now() - this.toggled.at : Infinity;
		if (this.animated && age < TOGGLE_MS) {
			const f = age / TOGGLE_MS;
			return fg(on ? "syntaxType" : "borderMuted", RING[Math.round((on ? f : 1 - f) * 4)]!);
		}
		return on ? fg("success", "●") : fg("borderMuted", "○");
	}

	private keys(fg: (c: ThemeColor, s: string) => string): string {
		const k = (key: string, verb: string) => `${fg("accent", key)} ${fg("dim", verb)}`;
		const last = this.step === "efforts" && this.page + 1 === this.queue.length;
		// Step 1 leaves out "↑↓ move" so the line fits 80 columns; the search field shows that typing filters.
		const parts = this.step === "models" ? [k("espaço", "marca")] : [k("↑↓", "move"), k("espaço", "marca")];
		if (this.step === "models") {
			parts.push(k("digite", "filtra"), k("tab", "marcados"), k("enter", "avança"));
			parts.push(k("esc", this.filter || this.onlyMarked ? "limpa" : "cancela"));
		} else parts.push(k("enter", last ? "salva" : "avança"), k("esc", "volta"));
		return parts.join("   ");
	}

	/** `│ content │` over the modal background, the right edge being the scrollbar column. */
	private paintRow(
		content: string,
		iw: number,
		bar: string,
		bg: "customMessageBg" | "selectedBg",
		fg: (c: ThemeColor, s: string) => string,
	): string {
		const fitted = truncateToWidth(content, iw, "…");
		const body = `${fitted}${" ".repeat(Math.max(0, iw - visibleWidth(fitted)))}`;
		const t = this.opts.theme;
		const edge = bar === "│" ? fg("borderMuted", "│") : bar;
		if (!t) return `│ ${body} ${edge}`;
		return `${t.bg("customMessageBg", `${fg("borderMuted", "│")} `)}${t.bg(bg, body)}${t.bg("customMessageBg", ` ${edge}`)}`;
	}

	private paintEdge(line: string, width: number, fg: (c: ThemeColor, s: string) => string): string {
		const fitted = truncateToWidth(line, width, fg("borderMuted", "╮"));
		const t = this.opts.theme;
		return t ? t.bg("customMessageBg", fitted) : fitted;
	}

	invalidate(): void {}

	dispose(): void {
		this.stopFrames?.();
	}
}
