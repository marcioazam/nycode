/**
 * Moldura do resultado de Read/Write (lab /pertence desenho 5 "Moldura" + "Nasce do fundo"; antes a caixa ficava
 * solta embaixo do cabeçalho): a régua dobra em `╮` no fim do cabeçalho, `│` desce dos dois lados do corpo e `╰─…─╯` fecha.
 * Cor borderMuted; error no erro. Só quando há corpo (imagem, erro, aberto, aviso de sintaxe do write); sem cor no tema,
 * em ASCII ou estreito, vale o desenho de antes (sem moldura). A imagem é emoldurada por image-open/fundo.ts (mesma regra).
 */
import { getCapabilities, visibleWidth } from "@nycode/tui";
import { noColor } from "../../ui/a11y.ts";
import { bgOpen, keepBg } from "../diff.ts";
import { ascii } from "../icons.ts";
import { fitLine } from "../motion/chrome.ts";
import { anima } from "../motion/motion.ts";
import { idadeFim } from "../motion/vivo.ts";
import { NASCE_MS, nasce } from "./nasce.ts";

type Tema = {
	fg: (c: string, t: string) => string;
	bg?: (c: string, t: string) => string;
	getFgAnsi?: (c: string) => string;
	getBgAnsi?: (c: string) => string;
};
type Comp = { render: (w: number) => string[]; invalidate: () => void };
type Ctx = {
	toolCallId?: string;
	invalidate?: () => void;
	isError?: boolean;
	state?: { uiLeitura?: { img: boolean }; uiMoldura?: boolean };
};
export const LARG_MIN = 24;
export const molduraOk = (t: Tema, w = LARG_MIN): boolean =>
	typeof t.bg === "function" && w >= LARG_MIN && !noColor(process.env) && !ascii(process.env);
const corDe = (erro: boolean) => (erro ? "error" : "borderMuted");

/** Cabeçalho `esq ──── lado ╮` na largura `w`; a régua toma a cor da moldura. */
export function cabecalhoCurvo(esq: string, lado: string, w: number, t: Tema, erro: boolean): string {
	const rw = lado && visibleWidth(lado) <= w / 2 ? visibleWidth(lado) : 0;
	const e = fitLine(esq, Math.max(1, w - rw - 6));
	const n = Math.max(1, w - visibleWidth(e) - 3 - (rw ? rw + 1 : 0));
	return `${e} ${t.fg(corDe(erro), "─".repeat(n))}${rw ? ` ${lado}` : ""} ${t.fg(corDe(erro), "╮")}`;
}

/** Linha de respiro `│ … │` na largura `w`, fundo neutro (mesma pintura de `quadro`). */
const linhaVazia = (w: number, t: Tema) =>
	t.fg("borderMuted", "│") + t.bg!("customMessageBg", " ".repeat(Math.max(0, w - 2))) + t.fg("borderMuted", "│");

/** Corpo emoldurado: `│ linha │` sobre customMessageBg, uma linha de respiro e o fecho; nasce do fundo ao chegar (relógio `agora` injetável). */
export function quadro(corpo: (iw: number) => string[], t: Tema, ctx: Ctx, erro: boolean, agora?: () => number): Comp {
	return {
		render: (w) => {
			const iw = Math.max(1, w - 4);
			const rows = corpo(iw);
			if (!rows.length) return [];
			const open = bgOpen(t, "customMessageBg"),
				fr = (s: string) => t.fg(corDe(erro), s);
			if (!molduraOk(t, w) || !open) return rows.map((r) => `  ${fitLine(r, Math.max(1, w - 2))}`);
			const pinta = (r: string) => {
				const c = keepBg(fitLine(r, iw), open);
				return (
					fr("│") + t.bg!("customMessageBg", ` ${c}${" ".repeat(Math.max(0, iw - visibleWidth(c)))} `) + fr("│")
				);
			};
			const out = [...rows.map(pinta), pinta(""), fr(`╰${"─".repeat(w - 2)}╯`)];
			return nasce(out, t, anima() ? idadeFim(ctx, NASCE_MS, agora?.()) : undefined);
		},
		invalidate() {},
	};
}

type Entrada = {
	name: string;
	partial: boolean;
	expanded: boolean;
	ctx: Ctx;
	theme: Tema;
	erro?: string;
	sintaxe?: string;
	nativo: () => Comp;
	agora?: () => number;
};
/** Corpo emoldurado de um Read/Write terminado, ou undefined (desenho de antes). Grava `state.uiMoldura`, que o cabeçalho lê para dobrar. */
export function moldurado(e: Entrada): Comp | undefined {
	const st = e.ctx.state;
	if (st) st.uiMoldura = false;
	if ((e.name !== "read" && e.name !== "write") || e.partial || !st || !molduraOk(e.theme)) return undefined;
	const sai = (c: Comp, v: boolean) => {
		st.uiMoldura = v;
		return c;
	};
	// Imagem (kitty): só a linha de respiro, com `│` dos dois lados (sem eles abria um buraco entre `╮` e a caixa);
	// image-open/fundo.ts emoldura a miniatura e o cabeçalho dobra.
	if (st.uiLeitura?.img && !e.ctx.isError && getCapabilities().images === "kitty")
		return sai(
			{
				render: (w) => {
					const idade = anima() ? idadeFim(e.ctx, NASCE_MS + 60, e.agora?.()) : undefined;
					return nasce(molduraOk(e.theme, w) ? [linhaVazia(w, e.theme)] : [""], e.theme, idade);
				},
				invalidate() {},
			},
			true,
		); // a chamada mantém os quadros da entrada
	const nativo = () => e.nativo().render;
	const linhas: ((iw: number) => string[]) | undefined =
		e.sintaxe && e.name === "write" && !e.expanded && !e.ctx.isError
			? () => [e.sintaxe!]
			: e.expanded
				? (iw) => {
						const r = nativo()(iw);
						const i = r.findIndex((l) => l.trim() !== "");
						return i < 0 ? [] : r.slice(i);
					}
				: e.ctx.isError && e.erro
					? () => [e.theme.fg("error", e.erro!)]
					: undefined;
	return linhas ? sai(quadro(linhas, e.theme, e.ctx, e.ctx.isError === true, e.agora), true) : undefined;
}
