// Compaction summary line (green bar) and the pt-BR summary text.

import { type Component, Markdown, type MarkdownTheme } from "@nycode/tui";
import type { MarkdownTransformer } from "../../../core/extensions/types.ts";
import type { CompactionSummaryMessage } from "../../../core/messages.ts";
import { keyText } from "../components/keybinding-hints.ts";
import { createMarkdownTransform } from "../components/markdown-transform.ts";
import { type Theme, theme } from "../theme/theme.ts";
import {
	type Celula,
	coresRecarga,
	easeIO,
	hora24,
	letras,
	MIN_INTERNO,
	parado,
	pintar,
	RECUO,
	tocarRecarga,
	uiAtual,
	vista,
} from "./base.ts";

/** The members of the compaction component this module reads (the component keeps them private). */
interface CompactacaoVista {
	message: CompactionSummaryMessage;
	expanded: boolean;
	markdownTheme: MarkdownTheme;
	markdownTransformers: readonly MarkdownTransformer[];
	messageId?: string;
	timestamp?: string;
	setBgFn(bgFn?: (text: string) => string): void;
}

/** 252284 -> "252 mil"; 1250000 -> "1,3 mi". */
export const mil = (n: number): string =>
	n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\./, ",")} mi` : n >= 1e3 ? `${Math.round(n / 1e3)} mil` : String(n);

export function linhasCompactacao(msg: CompactionSummaryMessage, tecla: string): string[] {
	const seta = /^(?:dumb|linux)$/.test(process.env.TERM ?? "") || process.env.NYCODE_ASCII_ICONS === "1" ? "->" : "→";
	const alvo = `${mil(msg.tokensBefore)} ${seta} ~${mil(Math.ceil(msg.summary.length / 4))} tokens`;
	const ts = new Date(msg.timestamp);
	return ["compactado", alvo, tecla, ...(!Number.isNaN(ts.getTime()) ? [hora24(ts)] : [])];
}

const TITULOS: Record<string, string> = {
	Goal: "Objetivo",
	"Constraints & Preferences": "Restrições e preferências",
	Progress: "Progresso",
	Done: "Feito",
	"In Progress": "Em andamento",
	Blocked: "Bloqueado",
	"Key Decisions": "Decisões",
	"Next Steps": "Próximos passos",
	"Critical Context": "Contexto crítico",
};

/**
 * Translates `## Title` / `### Title` lines with an exact TITULOS match, line by line (linear time). Same output as the
 * former `/^(#{2,3}) (.+?)\s*$/gm` replace: a translated title drops its trailing whitespace and the blank lines after it.
 */
function titulosPt(s: string): string {
	const linhas = s.split("\n");
	const out: string[] = [];
	for (let i = 0; i < linhas.length; i++) {
		const m = /^(#{2,3}) (.+)$/.exec(linhas[i]);
		const pt = m ? TITULOS[m[2].trimEnd()] : undefined;
		if (!m || !pt) {
			out.push(linhas[i]);
			continue;
		}
		out.push(`${m[1]} ${pt}`);
		while (i + 1 < linhas.length && linhas[i + 1].trim() === "") i++;
	}
	return out.join("\n");
}

/** Standard summary titles in pt-BR; file lists become sections. Only the exact title is translated. */
export const resumoPt = (s: string): string =>
	titulosPt(s)
		.replace(/<read-files>\n?/g, "### Arquivos lidos\n")
		.replace(/<modified-files>\n?/g, "### Arquivos editados\n")
		.replace(/<\/(read|modified)-files>/g, "");

/** How much the compaction took out of the context, in integer % from 0 to 100 (~4 characters per token). */
export const pctCompactado = (msg: CompactionSummaryMessage): number =>
	msg.tokensBefore > 0
		? Math.max(0, Math.min(100, Math.round((1 - Math.ceil(msg.summary.length / 4) / msg.tokensBefore) * 100)))
		: 0;
export const COMPACTA_MS = 360;
export const BARRA_N = 20;
const nascida = new WeakMap<object, number>(); // message -> fade start; the fresh one animates once, history is born ready

interface Partes {
	titulo: string;
	pct: string;
	barra: Array<{ c: string; ok?: boolean }>;
	resto: string;
}

/** Centered `compactado  98% ▰▰▰▱  252 mil -> ~6 mil tokens · key · hour`; the line rises from the background in COMPACTA_MS. */
function linhaBarra(t: Theme, msg: CompactionSummaryMessage, tecla: string, comFundo: boolean): Component {
	const [titulo = "", alvo = "", ...fim] = linhasCompactacao(msg, tecla);
	const pct = pctCompactado(msg);
	const cheio = Math.floor((BARRA_N * pct) / 100);
	const C = coresRecarga(t);
	const ts = new Date(msg.timestamp).getTime();
	if (!nascida.has(msg)) nascida.set(msg, !parado() && C && Date.now() - ts < 3000 ? performance.now() : -Infinity);
	const ini = nascida.get(msg) ?? -Infinity;
	const partes = (comBarra: boolean, n: number): Partes => {
		const cauda = [alvo, ...fim].slice(0, n);
		const barra = comBarra
			? [{ c: " " }, ...Array.from({ length: BARRA_N }, (_, j) => ({ c: j < cheio ? "▰" : "▱", ok: j < cheio }))]
			: [];
		return { titulo, pct: `${pct}%`, barra, resto: cauda.length ? `  ${cauda.join(" · ")}` : "" };
	};
	const larg = (p: Partes) => titulo.length + 2 + p.pct.length + p.barra.length + p.resto.length;
	return {
		invalidate() {},
		render(w: number): string[] {
			if (w < 1) return [];
			let p = partes(true, 3);
			for (const [b, n] of [
				[true, 3],
				[true, 2],
				[true, 1],
				[true, 0],
				[false, 0],
			] as const) {
				p = partes(b, n);
				if (larg(p) <= w) break;
			}
			const esq = Math.max(0, Math.floor((w - larg(p)) / 2));
			if (!C) {
				const barra = p.barra
					.map((x) => (x.c === " " ? " " : t.fg(x.ok ? "success" : "borderMuted", x.c)))
					.join("");
				return [
					" ".repeat(esq) +
						t.fg("dim", `${titulo}  `) +
						t.fg("success", t.bold(p.pct)) +
						barra +
						t.fg("dim", p.resto),
				];
			}
			const cels: Celula[] = [
				...letras(" ".repeat(esq)),
				...letras(`${titulo}  `, C.dim),
				...letras(p.pct, C.ok, undefined, true),
				...p.barra.map((x): Celula => (x.c === " " ? { c: " " } : { c: x.c, f: x.ok ? C.ok : C.borda })),
				...letras(p.resto, C.dim),
			].slice(0, w);
			// Open box: the box paints customMessageBg on the whole line; unset cells would erase it, so each cell carries it.
			if (comFundo) {
				for (const x of cels) x.b ??= C.box;
				while (cels.length < w) cels.push({ c: " ", b: C.box });
			}
			const a = easeIO((performance.now() - ini) / COMPACTA_MS);
			if (a < 1) tocarRecarga(uiAtual(), ini + COMPACTA_MS);
			const reabre = comFundo ? `\x1b[48;2;${C.box.join(";")}m` : "";
			return [(a <= 0 ? " ".repeat(w) : pintar(cels, C, a)) + reabre];
		},
	};
}

/** Replaces the label/summary content of the compaction message with the bar line (and the pt-BR summary when expanded). */
export function compactacao(content: { clear(): void; addChild(c: Component): void }, comp: object): void {
	const c = vista<CompactacaoVista>(comp);
	const t = theme;
	content.clear();
	c.setBgFn(c.expanded ? (s) => t.bg("customMessageBg", s) : undefined);
	content.addChild(
		linhaBarra(t, c.message, `${keyText("app.tools.expand")} ${c.expanded ? "fecha" : "abre"}`, c.expanded),
	);
	if (!c.expanded) return;
	const transform = createMarkdownTransform("summary", () => false, c.markdownTransformers, c.messageId, c.timestamp);
	const md = new Markdown(
		resumoPt(c.message.summary),
		0,
		0,
		c.markdownTheme,
		{ color: (s) => t.fg("customMessageText", s) },
		{ transform },
	);
	const borda = `    ${t.fg("dim", "│")} `; // title column (indent + glyph + space), like the tools output
	content.addChild({
		invalidate: () => md.invalidate?.(),
		render: (w: number) =>
			md.render(Math.max(10, w - 6 - (w - 2 * RECUO >= MIN_INTERNO ? RECUO : 0))).map((l) => borda + l),
	});
}
