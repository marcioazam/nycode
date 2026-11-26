/**
 * Question dialog navigation (patch question-nav): list keymap, batch flow (tabs, review, exit menu) and the
 * extra screens (help, review, exit). Pure UI: nothing here costs a model call. Dismissing, skipping or
 * discarding is always reported to the model with its own text, never as a silent cancel.
 */

import { matchesKey, truncateToWidth, visibleWidth } from "@nycode/tui";
import type { ExtensionContext } from "../../../core/extensions/types.ts";
import type { Theme } from "../../../modes/interactive/theme/theme.ts";

export type Answer = {
	answer: string;
	wasCustom: boolean;
	index?: number;
	timedOut?: boolean;
	note?: string;
	skipped?: boolean;
	delegated?: boolean;
	/** Batch only: move to the previous/next question without answering this one. */
	nav?: "prev" | "next";
	/** Batch only: the exit menu choice (send the answered ones, or discard everything). */
	exit?: "send" | "discard";
	/** The user chose "Chat about this": the call ends with Claude Code's clarify text. */
	chat?: boolean;
} | null;

export type EditKind = "free" | "note" | "delegate";
export type TabStatus = "done" | "skipped" | "pending";
export interface Tab {
	label: string;
	status: TabStatus;
}
export interface Batch {
	tabs: Tab[];
	current: number;
	answered: number;
	initial?: Answer;
}
interface Opt {
	label: string;
	description?: string;
	isOther?: boolean;
	isChat?: boolean;
}

/** The "Chat about this" row the overlay adds below the options (not on the dialog fallback). */
export const CHAT_ROW: Opt = { label: "Conversar sobre isto", isChat: true };

/** Claude Code's clarify text for "Chat about this", then each question with the answer Submit would send. */
export function chatText(asked: { question: string; answer?: string }[]): string {
	const list = asked.map((q) => `- "${q.question}"\n  ${q.answer ? `Answer: ${q.answer}` : "(No answer provided)"}`);
	return `The user wants to clarify these questions.
This means they may have additional information, context or questions for you.
Take their response into account and then reformulate the questions if appropriate.
Start by asking them what they would like to clarify.

Questions asked:
${list.join("\n")}`;
}

export interface SelectState {
	index: number;
	checked: boolean[];
	expanded: boolean;
	mode: "select" | "help" | "exit";
	exit: number;
	edit?: EditKind;
}
export type Effect = { done: Answer } | { edit: EditKind } | "redraw" | undefined;

const AGAIN = "Decide whether to ask again or proceed on your own judgment.";
export const SKIPPED_TEXT = `User skipped this question. ${AGAIN}`;
export const DISMISSED_TEXT = `User dismissed the question without answering (Esc). ${AGAIN}`;
export const DISCARDED_TEXT = `User discarded all answers (Esc). ${AGAIN}`;
export const delegatedText = (note?: string): string => `User asked you to decide${note ? `: ${note}` : ""}.`;

/** The comma-joined labels of the checked options, in order. */
export const selectedLabels = (options: Opt[], checked: boolean[]): string =>
	options
		.filter((_, i) => checked[i])
		.map((o) => o.label)
		.join(", ");

/** A label whose trailing "(…)" tag starts with "recomendad" (the render's ★). */
export const isRecommended = (o: Opt): boolean => o.isOther !== true && /\(\s*recomendad[^()]*\)\s*$/i.test(o.label);

// ---------------------------------------------------------------------------------------------------- keys

type ExitChoice = "send" | "discard" | "continue" | "redraw" | undefined;

function exitKey(data: string, st: { exit: number }): ExitChoice {
	const pick = () => (["send", "discard", "continue"] as const)[st.exit];
	if (/^[1-3]$/.test(data)) {
		st.exit = Number(data) - 1;
		return pick();
	}
	if (matchesKey(data, "enter")) return pick();
	if (matchesKey(data, "escape")) return "continue";
	if (matchesKey(data, "up")) st.exit = (st.exit + 2) % 3;
	else if (matchesKey(data, "down")) st.exit = (st.exit + 1) % 3;
	else return undefined;
	return "redraw";
}

/** The list keymap. Mutates `st`; the caller applies the returned effect. */
export function selectKey(data: string, st: SelectState, opts: Opt[], multi: boolean, batch?: Batch): Effect {
	if (st.mode === "help") {
		st.mode = "select";
		return "redraw";
	}
	if (st.mode === "exit") {
		const r = exitKey(data, st);
		if (r === "send" || r === "discard") return { done: { answer: "", wasCustom: false, exit: r } };
		if (r === "continue") st.mode = "select";
		return r ? "redraw" : undefined;
	}
	const last = opts.length - 1;
	const go = (i: number): Effect => {
		st.index = i;
		return "redraw";
	};
	const toggle = (i: number): Effect => {
		st.checked[i] = !st.checked[i];
		return "redraw";
	};
	const confirm = (): Effect => {
		if (opts[st.index].isChat)
			return { done: { answer: multi ? selectedLabels(opts, st.checked) : "", wasCustom: false, chat: true } };
		if (multi) return { done: { answer: selectedLabels(opts, st.checked), wasCustom: false } };
		if (opts[st.index].isOther) return { edit: "free" };
		return { done: { answer: opts[st.index].label, wasCustom: false, index: st.index + 1 } };
	};
	if (matchesKey(data, "up")) return go(st.index === 0 ? last : st.index - 1);
	if (matchesKey(data, "down")) return go(st.index === last ? 0 : st.index + 1);
	if (data === "g" || matchesKey(data, "home")) return go(0);
	if (data === "G" || matchesKey(data, "end")) return go(last);
	if (batch && (matchesKey(data, "right") || matchesKey(data, "tab")))
		return { done: { answer: "", wasCustom: false, nav: "next" } };
	if (batch && batch.current > 0 && (matchesKey(data, "left") || matchesKey(data, "shift+tab")))
		return { done: { answer: "", wasCustom: false, nav: "prev" } };
	// A digit picks its option directly: single choice confirms at once (free text opens the editor), multiple toggles.
	if (/^[1-9]$/.test(data) && Number(data) <= opts.length) {
		st.index = Number(data) - 1;
		return multi && !opts[st.index].isOther && !opts[st.index].isChat ? toggle(st.index) : confirm();
	}
	if (multi && data === " ") return opts[st.index].isChat ? undefined : toggle(st.index);
	if (multi && data === "a") {
		const all = opts.every((o, i) => o.isChat || st.checked[i]);
		st.checked = opts.map((o) => !o.isChat && !all);
		return "redraw";
	}
	if (multi && data === "i") {
		st.checked = opts.map((o, i) => !o.isChat && !st.checked[i]);
		return "redraw";
	}
	if (data === "o" || data === "0") {
		const other = multi ? -1 : opts.findIndex((o) => o.isOther);
		if (other < 0) return undefined;
		st.index = other;
		return { edit: "free" };
	}
	if (data === "s") return { done: { answer: "", wasCustom: false, skipped: true } };
	if (data === "r") {
		const rec = opts.findIndex(isRecommended);
		if (rec < 0) return undefined;
		st.index = rec;
		if (multi) {
			st.checked[rec] = true;
			return "redraw";
		}
		return confirm();
	}
	if (data === "d") return { edit: "delegate" };
	if (data === "n") {
		if (opts[st.index].isChat) return undefined;
		if (multi) st.checked[st.index] = true;
		else if (opts[st.index].isOther) return undefined;
		return { edit: "note" };
	}
	if (data === "e") {
		st.expanded = !st.expanded;
		return "redraw";
	}
	if (data === "?") {
		st.mode = "help";
		return "redraw";
	}
	if (matchesKey(data, "enter")) return confirm();
	if (matchesKey(data, "escape")) {
		if (batch && batch.answered > 0) {
			st.mode = "exit";
			st.exit = 0;
			return "redraw";
		}
		return { done: null };
	}
	return undefined;
}

// ---------------------------------------------------------------------------------------------------- render

/** Short footer; the least useful segments go first when the width is short, nothing is cut with "...". */
export function navFooter(o: { multi: boolean; count: number; batch: boolean; rec: boolean; width: number }): string {
	const segs: { t: string; drop: number }[] = [
		{ t: o.multi ? `1-${o.count} marca` : `1-${o.count} escolhe`, drop: 9 },
		{ t: "↑↓ move", drop: 9 },
		...(o.multi
			? [
					{ t: "espaço marca", drop: 9 },
					{ t: "⏎ confirma", drop: 4 },
				]
			: []),
		...(o.batch ? [{ t: "←→ pergunta", drop: 3 }] : []),
		{ t: "s pula", drop: 2 },
		...(o.rec ? [{ t: "r recomendada", drop: 1 }] : []),
		{ t: "? ajuda", drop: 9 },
		{ t: "esc sai", drop: 9 },
	];
	const text = () => ` ${segs.map((s) => s.t).join(" · ")}`;
	while (visibleWidth(text()) > o.width && segs.some((s) => s.drop < 9))
		segs.splice(segs.indexOf(segs.reduce((a, b) => (b.drop < a.drop ? b : a))), 1);
	return text();
}

/** ✓ answered, ● current (highlighted), ○ pending, ↷ skipped; [Revisar] once `current` is past the last question. */
export function tabsLine(tabs: Tab[], current: number, theme: Theme): string {
	const parts = tabs.map((t, i) => {
		if (i === current) return theme.fg("accent", theme.bold(`[${t.label} ●]`));
		const mark = t.status === "done" ? theme.fg("success", "✓") : theme.fg("dim", t.status === "skipped" ? "↷" : "○");
		return `${theme.fg(t.status === "done" ? "success" : "muted", t.label)} ${mark}`;
	});
	if (current >= tabs.length) parts.push(theme.fg("accent", theme.bold("[Revisar]")));
	return parts.join("  ");
}

/** Title row with the tabs after it and `right` flush right; the tabs drop to their own row when they do not fit. */
export function batchHeader(title: string, tabs: string, right: string, width: number): string[] {
	const row = (left: string) =>
		`${left}${" ".repeat(Math.max(2, width - visibleWidth(left) - visibleWidth(right) - 1))}${right}`;
	const one = `${title}  ${tabs}`;
	return visibleWidth(one) + visibleWidth(right) + 3 <= width ? [row(one)] : [row(title), ` ${tabs}`];
}

const rule = (width: number, theme: Theme): string => theme.fg("accent", "─".repeat(width));
const fitLines = (lines: string[], width: number): string[] => lines.map((l) => truncateToWidth(l, width));

export function helpLines(width: number, theme: Theme): string[] {
	const left = [
		["1-9", "escolhe (multi: marca)"],
		["↑↓ g G", "move · primeira · última"],
		["⏎", "confirma"],
		["o / 0", "outra resposta (texto livre)"],
		["n", "escolhe + nota"],
		["a / i", "multi: marca todas / inverte"],
	];
	const right = [
		["←→ Tab", "pergunta anterior/próxima"],
		["s", "pula (o agente decide e segue)"],
		["r", "escolhe a ★ recomendada"],
		["d", '"decide você" + motivo opcional'],
		["e", "expande todas as descrições"],
		["esc", "sai (pergunta se há respostas)"],
	];
	const cell = (p: string[]) => ` ${theme.fg("accent", p[0].padEnd(8))}${theme.fg("text", p[1])}`;
	const leftW = 1 + 8 + Math.max(...left.map((p) => p[1].length));
	const body =
		leftW + 1 + 1 + 8 + Math.max(...right.map((p) => p[1].length)) <= width
			? left.map((p, i) => `${cell(p)}${" ".repeat(leftW - visibleWidth(cell(p)) + 1)}${cell(right[i])}`)
			: [...left, ...right].map(cell);
	return fitLines(
		[
			rule(width, theme),
			` ${theme.fg("accent", theme.bold("Atalhos"))}`,
			...body,
			theme.fg("dim", " qualquer tecla fecha"),
			rule(width, theme),
		],
		width,
	);
}

export function exitLines(width: number, theme: Theme, answered: number, total: number, index: number): string[] {
	const items = [
		[`Enviar as ${answered} respondidas`, "as outras ficam para o agente decidir"],
		["Descartar tudo", "o agente decide se pergunta de novo"],
		["Continuar respondendo", ""],
	];
	const w = Math.max(...items.map((it) => it[0].length));
	const rows = items.map((it, i) => {
		const head =
			i === index
				? theme.fg("accent", theme.bold(`❯ ${i + 1}  ${it[0].padEnd(w)}`))
				: `${theme.fg("dim", `  ${i + 1}`)}  ${theme.fg("text", it[0].padEnd(w))}`;
		return ` ${head}  ${theme.fg("dim", it[1])}`.trimEnd();
	});
	return fitLines(
		[
			rule(width, theme),
			` ${theme.fg("warning", theme.bold("Sair das perguntas?"))}  ${theme.fg("muted", `${answered} de ${total} respondidas`)}`,
			...rows,
			theme.fg("dim", " 1-3 escolhe · ⏎ confirma · esc continua"),
			rule(width, theme),
		],
		width,
	);
}

// ---------------------------------------------------------------------------------------------------- review

export interface Row {
	header: string;
	kind: "answer" | "skipped" | "delegated" | "pending";
	text: string;
	note?: string;
}
export type ReviewOutcome = "send" | "prev" | "discard" | "dismiss" | { edit: number };

export const statusOf = (raw: Answer | undefined): TabStatus =>
	!raw || raw.timedOut ? "pending" : raw.skipped ? "skipped" : "done";
const plain = (s: string): string => s.replace(/\s*\(\s*recomendad[^()]*\)/gi, "");

export function rowOf(header: string, raw: Answer | undefined): Row {
	const status = statusOf(raw);
	if (!raw || status === "pending") return { header, kind: "pending", text: "sem resposta" };
	if (raw.skipped) return { header, kind: "skipped", text: "pulada: o agente decide" };
	if (raw.delegated)
		return { header, kind: "delegated", text: "decide você", ...(raw.note ? { note: raw.note } : {}) };
	return {
		header,
		kind: "answer",
		text: raw.wasCustom ? raw.answer : plain(raw.answer),
		...(raw.note ? { note: raw.note } : {}),
	};
}

export function reviewLines(width: number, theme: Theme, glyph: string, tabs: Tab[], rows: Row[]): string[] {
	const w = Math.max(...rows.map((r) => visibleWidth(r.header)));
	const body = rows.map((r, i) => {
		const text =
			r.kind === "answer"
				? theme.fg("success", r.text)
				: theme.fg("dim", `${r.kind === "skipped" ? "↷" : r.kind === "pending" ? "○" : "→"} ${r.text}`);
		return ` ${theme.fg("dim", String(i + 1))} ${theme.fg("text", r.header.padEnd(w))}  ${text}${r.note ? `  ${theme.fg("muted", `nota: ${r.note}`)}` : ""}`;
	});
	const title = ` ${theme.fg("accent", glyph)} ${theme.bold("pergunta")}`;
	return fitLines(
		[
			rule(width, theme),
			`${title}  ${tabsLine(tabs, tabs.length, theme)}`,
			...body,
			"",
			theme.fg("dim", ` ⏎ envia · 1-${rows.length} edita · ← volta · esc sai`),
			rule(width, theme),
		],
		width,
	);
}

/** The review screen: ⏎ sends, a number edits that question, ← goes back, esc opens the exit menu (or leaves when nothing was answered). */
export function askReview(
	ctx: ExtensionContext,
	rows: Row[],
	tabs: Tab[],
	glyph: string,
): Promise<ReviewOutcome | null> {
	return ctx.ui.custom<ReviewOutcome | null>(
		(tui: { requestRender: () => void }, theme: Theme, _kb: unknown, done: (v: ReviewOutcome | null) => void) => {
			const answered = rows.filter((r) => r.kind === "answer" || r.kind === "delegated").length;
			const st = { exit: 0, exiting: false };
			return {
				render: (width: number) =>
					st.exiting
						? exitLines(width, theme, answered, rows.length, st.exit)
						: reviewLines(width, theme, glyph, tabs, rows),
				invalidate: () => {},
				handleInput: (data: string) => {
					if (st.exiting) {
						const r = exitKey(data, st);
						if (r === "send" || r === "discard") return done(r);
						if (r === "continue") st.exiting = false;
					} else if (matchesKey(data, "enter")) return done("send");
					else if (matchesKey(data, "left") || matchesKey(data, "shift+tab")) return done("prev");
					else if (/^[1-9]$/.test(data) && Number(data) <= rows.length) return done({ edit: Number(data) - 1 });
					else if (matchesKey(data, "escape")) {
						if (answered === 0) return done("dismiss");
						st.exiting = true;
						st.exit = 0;
					}
					tui.requestRender();
				},
			};
		},
	);
}

// ---------------------------------------------------------------------------------------------------- batch

export interface Out {
	text: string;
	raw: Answer;
	details: Record<string, unknown>;
}

/** Runs the questions with back/forward navigation and the final review. Esc never ends the batch silently:
 * every way out is reported to the model with its own text. */
export async function runBatch(
	specs: { question: string; header?: string }[],
	d: {
		ask: (i: number, b: Batch) => Promise<Out>;
		review: (rows: Row[], tabs: Tab[]) => Promise<ReviewOutcome | null>;
		blank: (i: number) => Record<string, unknown>;
		aborted: () => boolean;
	},
): Promise<{ text: string; details: Record<string, unknown>[] }> {
	const n = specs.length;
	const slots: (Out | undefined)[] = [];
	const label = (i: number) => (specs[i].header ?? "").trim().slice(0, 12) || `Q${i + 1}`;
	const tabs = (): Tab[] => specs.map((_, i) => ({ label: label(i), status: statusOf(slots[i]?.raw) }));
	let outcome: "send" | "discard" | "dismiss" | "chat" = "send";
	let chatAnswer: string | undefined;
	let i = 0;
	let back = false; // came from the review to edit one question: return there after answering
	for (;;) {
		if (d.aborted()) {
			outcome = "dismiss";
			break;
		}
		if (i >= n) {
			const r = await d.review(
				specs.map((_, k) => rowOf(label(k), slots[k]?.raw)),
				tabs(),
			);
			back = false;
			if (r === "prev") i = n - 1;
			else if (r !== null && typeof r === "object") {
				i = r.edit;
				back = true;
			} else {
				outcome = r === "send" || r === "discard" ? r : "dismiss";
				break;
			}
			continue;
		}
		const out = await d.ask(i, {
			tabs: tabs(),
			current: i,
			answered: slots.filter((s) => statusOf(s?.raw) === "done").length,
			initial: slots[i]?.raw,
		});
		const raw = out.raw;
		if (raw === null) {
			outcome = "dismiss";
			break;
		}
		if (raw.exit) {
			outcome = raw.exit;
			break;
		}
		if (raw.chat) {
			outcome = "chat";
			chatAnswer = raw.answer || undefined;
			break;
		}
		if (raw.nav) {
			back = false;
			i = Math.max(0, i + (raw.nav === "next" ? 1 : -1));
			continue;
		}
		slots[i] = out;
		i = back ? n : i + 1;
	}
	const lost = (k: number) => ({ ...d.blank(k), pending: false, dismissed: true });
	if (outcome === "chat") {
		// The question on screen carries what Submit would send for it; the others, their confirmed answers.
		const answerOf = (k: number): string | undefined => {
			const raw = slots[k]?.raw;
			if (statusOf(raw) !== "done" || !raw || raw.skipped || raw.delegated) return undefined;
			return raw.answer;
		};
		const asked = specs.map((s, k) => ({
			question: s.question,
			answer: k === i ? (chatAnswer ?? answerOf(k)) : answerOf(k),
		}));
		return {
			text: chatText(asked),
			details: specs.map((_, k) => ({ ...(slots[k]?.details ?? d.blank(k)), chat: true })),
		};
	}
	if (outcome === "discard") return { text: DISCARDED_TEXT, details: specs.map((_, k) => lost(k)) };
	const parts = specs.map((s, k) => `${s.question}\n${slots[k]?.text ?? "not answered"}`);
	if (outcome === "dismiss")
		return {
			text: slots.some(Boolean) ? [...parts, DISMISSED_TEXT].join("\n\n") : DISMISSED_TEXT,
			details: specs.map((_, k) => slots[k]?.details ?? lost(k)),
		};
	return { text: parts.join("\n\n"), details: specs.map((_, k) => slots[k]?.details ?? d.blank(k)) };
}
