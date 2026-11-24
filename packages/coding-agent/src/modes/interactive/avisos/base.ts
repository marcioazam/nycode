// Shared pieces of the pt-BR notices (K17): theme access, color math, the animation clock and the cell painter.

import type { Component } from "@nycode/tui";
import type { Theme, ThemeBg, ThemeColor } from "../theme/theme.ts";

export type Rgb = [number, number, number];

/** What the notices read from the interactive mode; it keeps these members private, so callers pass `this` as `object`. */
export interface Anfitriao {
	chatContainer: { addChild(c: Component): void; removeChild(c: Component): void };
	editorContainer: Component & { children?: Component[] };
	ui: {
		requestRender(force?: boolean): void;
		terminal?: { rows?: number; columns?: number };
		children?: Component[];
	};
	outputPad: number;
}

/** Reads a private-member host through its structural shape (the one cast of the module; the shape is the contract). */
export const vista = <T>(host: object): T => host as T;

/** Set by the embedded `avisos` extension when it loads; without it (or with NYCODE_AVISOS=0) the upstream texts stay. */
const SIMBOLO_ATIVO = Symbol.for("nycode:avisos-ativos");
export const ativo = (): boolean => process.env.NYCODE_AVISOS !== "0" && lerGlobal<boolean>(SIMBOLO_ATIVO) === true;
/** Turns the notices on (the avisos extension) or off (tests). */
export const ligar = (ligado: boolean): void => gravarGlobal(SIMBOLO_ATIVO, ligado);

export const SGR = /\x1b\[[0-9;:]*m/g;
export const SIMBOLO_TUI = Symbol.for("nycode:tui");
const SIMBOLO_MOVIMENTO = Symbol.for("nycode:movimento");

const global = globalThis as Record<symbol, unknown>;
export const lerGlobal = <T>(chave: symbol): T | undefined => global[chave] as T | undefined;
export const gravarGlobal = (chave: symbol, valor: unknown): void => {
	global[chave] = valor;
};

export const tema = (t: Theme): [(cor: ThemeColor, s: string) => string, (s: string) => string] => [
	(cor, s) => t.fg(cor, s),
	(s) => t.bold(s),
];

/** Visible width without the tui: SGR and width-1 characters only (the glyphs used here are narrow). */
export const largura = (s: string): number => [...s.replace(SGR, "")].length;
export const hora24 = (ts: number | Date): string =>
	new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

export const parado = (): boolean => {
	const e = process.env;
	const ligada = (v: string | undefined) => v !== undefined && v !== "" && v !== "0" && v !== "false";
	const movimento = lerGlobal<string>(SIMBOLO_MOVIMENTO);
	return (
		e.TERM === "dumb" ||
		(e.NO_PROGRESS ?? "") !== "" ||
		ligada(e.NYCODE_REDUCED_MOTION) ||
		e.TERM === "linux" ||
		movimento === "reduzido" ||
		movimento === "desligado"
	);
};
export const nerd = (): boolean =>
	!(process.env.NYCODE_ASCII_ICONS || /^(?:dumb|linux)$/.test(process.env.TERM ?? "")) &&
	(process.env.NYCODE_NERD_FONT === "1" || process.env.TERM === "xterm-kitty" || !!process.env.KITTY_WINDOW_ID);

export const easeC = (x: number): number => 1 - (1 - Math.min(1, Math.max(0, x))) ** 3;
export const easeIO = (t: number): number => {
	const x = Math.min(1, Math.max(0, t));
	return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
};
export const mistura = (a: Rgb, b: Rgb, p: number): Rgb => a.map((v, k) => Math.round(v + (b[k]! - v) * p)) as Rgb;

export const rgbDe = (ansi: string | undefined): Rgb | undefined => {
	const m = /[34]8;2;(\d+);(\d+);(\d+)/.exec(ansi ?? "");
	return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : undefined;
};
export const lumDe = (c: Rgb): number => [0.2126, 0.7152, 0.0722].reduce((a, w, k) => a + w * (c[k]! / 255) ** 2.2, 0);

export const fgRgb = (t: Theme, cor: ThemeColor): Rgb | undefined => rgbDe(t.getFgAnsi(cor));
export const bgRgb = (t: Theme, cor: ThemeBg): Rgb | undefined => rgbDe(t.getBgAnsi(cor));

export interface Cores {
	box: Rgb;
	accent: Rgb;
	text: Rgb;
	muted: Rgb;
	dim: Rgb;
	ok: Rgb;
	borda: Rgb;
	chat: Rgb;
}

/** Theme colors in RGB; undefined without truecolor (the plain drawing stays). */
export function coresRecarga(t: Theme): Cores | undefined {
	try {
		const box = bgRgb(t, "customMessageBg");
		const accent = fgRgb(t, "accent");
		const text = fgRgb(t, "text");
		const muted = fgRgb(t, "muted");
		const dim = fgRgb(t, "dim");
		const ok = fgRgb(t, "success");
		const borda = fgRgb(t, "borderMuted");
		if (!box || !accent || !text || !muted || !dim || !ok || !borda) return undefined;
		const chat = mistura(box, lumDe(box) < 0.5 ? [0, 0, 0] : [255, 255, 255], 0.35); // estimated chat background: the terminal does not say
		return { box, accent, text, muted, dim, ok, borda, chat };
	} catch {
		return undefined;
	}
}

// One 16 ms frame clock while some block animates, with a deadline.
let prazo = 0;
let relogio: ReturnType<typeof setInterval> | undefined;
let teto = 0;
/** Keeps redrawing the UI until `ate` (performance.now clock); never longer than 3 s after the last request. */
export function tocarRecarga(host: Pick<Anfitriao, "ui">, ate: number): void {
	if (parado()) return;
	prazo = Math.max(prazo, ate);
	teto = Date.now() + 3000;
	if (relogio) return;
	relogio = setInterval(() => {
		host.ui.requestRender();
		if (performance.now() > prazo + 32 || Date.now() > teto) {
			clearInterval(relogio);
			relogio = undefined;
		}
	}, 16);
	relogio.unref?.();
}

/** The TUI recorded by the header extension, or a no-op renderer. */
export const uiAtual = (): Pick<Anfitriao, "ui"> => ({
	ui: lerGlobal<Anfitriao["ui"]>(SIMBOLO_TUI) ?? { requestRender() {} },
});

export interface Celula {
	c: string;
	f?: Rgb;
	b?: Rgb;
	bo?: boolean;
}

/** Cells to a line with SGR only where it changes; `a` blends the colors into the chat background (0 = erased). */
export function pintar(cels: Celula[], C: Cores, a = 1): string {
	let s = "";
	let cf = "";
	let cb = "";
	let cbo = false;
	const viva = (k: Rgb): Rgb => (a >= 1 ? k : mistura(C.chat, k, a));
	for (const x of cels) {
		const nf = x.f ? `\x1b[38;2;${viva(x.f).join(";")}m` : "\x1b[39m";
		const nb = x.b ? `\x1b[48;2;${viva(x.b).join(";")}m` : "\x1b[49m";
		if (nf !== cf) {
			cf = nf;
			s += nf;
		}
		if (nb !== cb) {
			cb = nb;
			s += nb;
		}
		if (!!x.bo !== cbo) {
			cbo = !!x.bo;
			s += cbo ? "\x1b[1m" : "\x1b[22m";
		}
		s += x.c;
	}
	return `${s}\x1b[0m`;
}
export const letras = (s: string, f?: Rgb, b?: Rgb, bo?: boolean): Celula[] => [...s].map((c) => ({ c, f, b, bo }));

export const MIN_INTERNO = 20;
export const RECUO = 2;
