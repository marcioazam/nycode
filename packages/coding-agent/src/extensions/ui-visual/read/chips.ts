/**
 * Read em chips (laboratórios /read desenho 4 + animação 4 e /refino variante 2):
 * - verbo numa pílula tingida pelo estado: ciano lendo, verde lido, âmbar truncado (aviso), vermelho erro;
 * - lendo: um brilho atravessa a pílula (VARRE_MS por passada);
 * - transição de estado em TRANSICAO_MS: a pílula (e o fundo do cartão, no erro) funde do ciano à cor do desfecho,
 *   com um clarão curto (CLARAO_MS); a contagem sobe de 0 ao total (CONTADOR_MS) e as pílulas da direita surgem do fundo,
 *   uma a uma (SURGE_MS, ESCALONA_MS).
 * Sem cores no tema quem desenha é tools.ts (a linha de texto corrido de antes); sem movimento, o estado assentado.
 */
import { keepBg } from "../diff.ts";
import { iconGap, warnBgRgb } from "../icons.ts";
import { anima, lerpRgb, safeAnsi, tomAbaixo } from "../motion/motion.ts";
import { idadeFim } from "../motion/vivo.ts";

export type Rgb = [number, number, number];
export type Leitura = { n: number; img: boolean; trunc: boolean };
type Tema = {
	fg: (c: string, t: string) => string;
	bold: (t: string) => string;
	getFgAnsi?: (c: string) => string;
	getBgAnsi?: (c: string) => string;
};
type Ctx = {
	isError?: boolean;
	isPartial?: boolean;
	toolCallId?: string;
	invalidate?: () => void;
	state?: { uiLeitura?: Leitura };
};

export const TRANSICAO_MS = 300;
export const CLARAO_MS = 260;
export const CONTADOR_MS = 400;
export const SURGE_MS = 260;
export const ESCALONA_MS = 120;
export const VARRE_MS = 700;
/** Pulso (lab /rwerro desenho 1 + "Pulso"; antes o erro e o aviso só fundiam e assentavam): depois da
 * transição, a cor do erro (Read/Write) ou do aviso (Read truncado) pulsa duas vezes em PULSO_MS e assenta. */
export const PULSO_MS = 1200;
/** Janela em que o read terminado ainda muda a cada quadro (tools.ts não guarda o desenho antes dela). */
export const ASSENTA_MS = Math.max(TRANSICAO_MS, CONTADOR_MS, ESCALONA_MS + SURGE_MS);
const pulsa = (ctx: Ctx): boolean => !!ctx.isError || (ctx.isPartial === false && !!ctx.state?.uiLeitura?.trunc);
/** Janela de quadros vivos do Read/Write terminado: com pulso (erro, aviso) vai até o fim dele. */
export const janelaLeitura = (ctx: Ctx): number => (pulsa(ctx) ? TRANSICAO_MS + PULSO_MS : ASSENTA_MS);

const ease = (t: number) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3;
const fg = (t: Tema, c: string): Rgb | undefined => safeAnsi(() => t.getFgAnsi?.(c)) as Rgb | undefined;
const bgDe = (t: Tema, c: string): Rgb | undefined => safeAnsi(() => t.getBgAnsi?.(c)) as Rgb | undefined;
const sgr = (c: Rgb, s: string) => `\x1b[38;2;${c.join(";")}m${s}\x1b[39m`;
const abre = (c: Rgb) => `\x1b[48;2;${c.join(";")}m`;
const pilula = (inner: string, bg: Rgb): string => `${abre(bg)} ${keepBg(inner, abre(bg))} \x1b[49m`;
const plural = (n: number) => `${n} ${n === 1 ? "linha" : "linhas"}`;
export const semCor = (s: string): string => s.replace(/\x1b\[[0-9;]*m/g, "");

/** Idade desde o fim enquanto a transição dura (e pede os quadros dela); undefined assentado, sem movimento ou sem fim visto. */
const idade = (ctx: Ctx): number | undefined =>
	anima() && (ctx.isError || ctx.isPartial === false) ? idadeFim(ctx as never, janelaLeitura(ctx)) : undefined;
const desfecho = (ctx: Ctx): string =>
	ctx.isError ? "error" : ctx.isPartial !== false ? "syntaxType" : ctx.state?.uiLeitura?.trunc ? "warning" : "success";

/** Fundo do cartão: no erro funde de customMessageBg a toolErrorBg; undefined quando não há cor no tema. */
export function fundoLeitura(t: Tema, ctx: Ctx): Rgb | undefined {
	const base = bgDe(t, "customMessageBg");
	if (!ctx.isError) return base;
	const err = bgDe(t, "toolErrorBg");
	const a = idade(ctx);
	return base && err ? (lerpRgb(base, err, a === undefined ? 1 : ease(a / TRANSICAO_MS)) as Rgb) : err;
}

/** Verbo sem pílula (antes pílula de fundo tingido): a cor do estado vai no ícone e na palavra, que
 * fundem do ciano ao desfecho com o clarão; lendo, a varredura clareia letra a letra. `box` não pinta mais o verbo. */
export function pilulaVerbo(
	t: Tema,
	ctx: Ctx,
	_box: Rgb,
	marca: string,
	nome: string,
	lendo: boolean,
	now: number,
	marcaNeutra = false,
): string {
	// `marcaNeutra` (Edit): o ícone `marca` já vem colorido pelo chamador e não muda com o estado; só a palavra muda.
	const ciano = fg(t, "syntaxType"),
		alvo = fg(t, desfecho(ctx));
	if (!ciano || !alvo)
		return marcaNeutra
			? `${marca}${iconGap()}${t.fg(desfecho(ctx), t.bold(nome))}`
			: t.fg(desfecho(ctx), `${marca}${iconGap()}${t.bold(nome)}`);
	const a = idade(ctx);
	const p = ctx.isError || ctx.isPartial === false ? (a === undefined ? 1 : ease(a / TRANSICAO_MS)) : 0;
	let c = p >= 1 ? alvo : (lerpRgb(ciano, alvo, p) as Rgb);
	if (a !== undefined && a < CLARAO_MS) c = lerpRgb(c, [255, 255, 255], 0.35 * (1 - a / CLARAO_MS)) as Rgb;
	if (a !== undefined && a >= TRANSICAO_MS && pulsa(ctx)) {
		const k = 0.5 - 0.5 * Math.cos(((a - TRANSICAO_MS) / (PULSO_MS / 2)) * 2 * Math.PI);
		c = lerpRgb(alvo, [255, 255, 255], 0.45 * k) as Rgb;
	}
	const ic = marcaNeutra ? marca : sgr(c, marca);
	if (!lendo) return ic + iconGap() + sgr(c, t.bold(nome));
	// Varredura: um pico gaussiano de luz atravessa o ícone e as letras, uma passada a cada VARRE_MS.
	const chars = marcaNeutra ? [...nome] : [...marca, ...iconGap(), ...nome];
	const pos = ((now % VARRE_MS) / VARRE_MS) * (chars.length + 4) - 2;
	const corpo = chars
		.map((ch, i) => sgr(lerpRgb(c, [255, 255, 255], 0.55 * Math.exp(-((i - pos) ** 2) / 2.5)) as Rgb, ch))
		.join("");
	return marcaNeutra ? `${marca}${iconGap()}\x1b[1m${corpo}\x1b[22m` : `\x1b[1m${corpo}\x1b[22m`;
}

/** Pílulas da direita (contagem · duração, truncado); '' até haver resultado. */
export function pilulasDireita(t: Tema, ctx: Ctx, box: Rgb, dur: string): string {
	const l = ctx.state?.uiLeitura;
	// Imagem sem o tipo antes da hora (antes pílula `imagem`): fica só a duração, se houver.
	if (!l || ctx.isError || ctx.isPartial !== false || (l.img && !l.trunc)) return dur;
	const a = idade(ctx);
	const neutro = tomAbaixo(box) as Rgb;
	const surge = (atraso: number, s: string, cor: string, fundo: Rgb) => {
		const c = fg(t, cor);
		return a === undefined || !c ? t.fg(cor, s) : sgr(lerpRgb(fundo, c, ease((a - atraso) / SURGE_MS)) as Rgb, s);
	};
	const n = l.img ? "imagem" : plural(a === undefined ? l.n : Math.round(l.n * ease(a / CONTADOR_MS)));
	const conta = pilula(surge(0, [n, semCor(dur)].filter(Boolean).join(" · "), "dim", neutro), neutro);
	if (!l.trunc) return conta;
	const aviso = fg(t, "warning"),
		bgAviso = aviso ? (warnBgRgb(box, aviso) as Rgb) : neutro;
	return `${conta} ${pilula(surge(ESCALONA_MS, "truncado", "warning", bgAviso), bgAviso)}`;
}

/** Faixa `:120-180` em pílula neutra. */
export const pilulaFaixa = (t: Tema, box: Rgb, meta: string): string => {
	const m = semCor(meta).trim().replace(/^:/, "");
	return m ? ` ${pilula(t.fg("muted", m), tomAbaixo(box) as Rgb)}` : "";
};
