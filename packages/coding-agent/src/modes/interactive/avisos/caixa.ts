// Neutral boxes and one-liners: compacted-session meter, untrusted project, informational extension notices.

import { type Component, Spacer, Text } from "@nycode/tui";
import type { Theme } from "../theme/theme.ts";
import {
	type Anfitriao,
	bgRgb,
	type Cores,
	coresRecarga,
	easeIO,
	fgRgb,
	largura,
	lerGlobal,
	letras,
	lumDe,
	mistura,
	nerd,
	parado,
	pintar,
	type Rgb,
	tocarRecarga,
	vista,
} from "./base.ts";
import { comRecuo, esconder, ultimoErro } from "./erro.ts";
import { avisoAnimado, chipsAviso } from "./recarga.ts";

export const MAX_BOLAS = 10;
export const COMPACTADA_MS = 360;
export const CONFIANCA_MS = 450;
export const MARCA_CAIXA = "\u2063";
const vezes = (n: number) => `${n} ${n === 1 ? "vez" : "vezes"}`;
const PERDA = "cada compactação perde detalhe do contexto";
const DICA = "/new recomeça limpo";

/** Text without RGB (theme colors only). */
export const linhaCompactada = (
	fg: (c: "warning" | "dim" | "muted", s: string) => string,
	bold: (s: string) => string,
	n: number,
): string =>
	`${fg("warning", bold("compactada "))}${fg("warning", "●".repeat(Math.min(n, MAX_BOLAS)))}${n > MAX_BOLAS ? fg("dim", ` +${n - MAX_BOLAS}`) : ""}${fg("dim", `  ${vezes(n)}`)}\n${fg("muted", PERDA)}${n >= 3 ? fg("dim", ` · ${DICA}`) : ""}`;

/** Hook of renderInitialMessages: replaces the "Session compacted N times" status. */
export function compactada(host: object, t: Theme, n: number): void {
	const h = vista<Anfitriao>(host);
	h.chatContainer.addChild(new Spacer(1));
	const C = coresRecarga(t);
	const warn = fgRgb(t, "warning");
	if (!C || !warn)
		h.chatContainer.addChild(
			new Text(
				linhaCompactada(
					(c, s) => t.fg(c, s),
					(s) => t.bold(s),
					n,
				),
				0,
				0,
			),
		);
	else h.chatContainer.addChild(medidorCompactada(h, C, warn, n));
	h.ui.requestRender();
}

function medidorCompactada(host: Anfitriao, C: Cores, warn: Rgb, n: number): Component {
	const m = Math.min(n, MAX_BOLAS);
	const bolas = Array.from({ length: m }, (_, j) => ({
		c: "●",
		f: mistura(C.muted, warn, m === 1 ? 1 : j / (m - 1)),
	}));
	const titulo = [
		...letras("compactada ", warn, undefined, true),
		...bolas,
		...(n > MAX_BOLAS ? letras(` +${n - MAX_BOLAS}`, C.dim) : []),
		...letras(`  ${vezes(n)}`, C.dim),
	];
	const perda = letras(PERDA, C.muted);
	const dica = n >= 3 ? letras(DICA, C.dim) : undefined;
	let ini: number | undefined;
	return {
		invalidate() {},
		render(w: number) {
			if (w < 1) return [];
			if (ini === undefined) ini = parado() ? -Infinity : performance.now();
			const a = easeIO((performance.now() - ini) / COMPACTADA_MS);
			if (a < 1) tocarRecarga(host, ini + COMPACTADA_MS);
			const ls = !dica
				? [titulo, perda]
				: perda.length + 3 + dica.length <= w
					? [titulo, [...perda, ...letras(" · ", C.dim), ...dica]]
					: [titulo, perda, dica];
			return ls.map((l) => (a <= 0 ? " ".repeat(w) : pintar(l.slice(0, w), C, a)));
		},
	};
}

export const linhaConfianca = (fg: (c: "warning" | "dim" | "accent", s: string) => string, icone = ""): string =>
	`${icone ? `${fg("warning", icone)} ` : ""}${fg("warning", "projeto não confiável")}${fg("dim", " · recursos .nycode do projeto ignorados · ")}${fg("accent", "/trust")}${fg("dim", " salva a decisão (reinicie)")}`;

/** Hook of renderProjectTrustWarningIfNeeded: replaces the English text; same indent as the original. */
export function confianca(host: object, t: Theme): Component {
	const h = vista<Anfitriao>(host);
	const txt = new Text(
		linhaConfianca((c, s) => t.fg(c, s), nerd() ? "\uf071" : "!"),
		1,
		0,
	);
	const base = txt.render.bind(txt);
	const C = coresRecarga(t);
	let ini: number | undefined;
	txt.render = (w) => {
		const ls = base(w);
		if (!C) return ls;
		if (ini === undefined) ini = parado() ? -Infinity : performance.now();
		const a = easeIO((performance.now() - ini) / CONFIANCA_MS);
		if (a >= 1) return ls;
		tocarRecarga(h, ini + CONFIANCA_MS);
		return ls.map((l) =>
			l.replace(
				/38;2;(\d+);(\d+);(\d+)m/g,
				(_, r: string, g: string, b: string) => `38;2;${mistura(C.chat, [+r, +g, +b], a).join(";")}m`,
			),
		);
	};
	return txt;
}

/** Warning background: same math as ui-visual/icons.ts (warnBgRgb, WARN_TINT 0,20); the core does not import the extension. */
const fundoAviso = (t: Theme): ((x: string) => string) => {
	const base = bgRgb(t, "customMessageBg");
	const warn = fgRgb(t, "warning");
	if (!base || !warn) return (x) => t.bg("customMessageBg", x);
	const mix = base.map((v, k) => v * 0.8 + warn[k]! * 0.2) as Rgb;
	const f = (lumDe(base) / Math.max(lumDe(mix), 1e-6)) ** (1 / 2.2);
	const open = `\x1b[48;2;${mix.map((v) => Math.max(0, Math.min(255, Math.round(v * f)))).join(";")}m`;
	return (x) => `${open}${x}\x1b[49m`;
};

const SINAL_LIMITE = Symbol.for("nycode:cartao-limite");
interface CartaoLimite {
	erro: string;
	hora: string;
	encerrado(): boolean;
	linhas(t: Theme): string[];
	redesenhar?: () => void;
}

/** Only the synchronous notify of the active wait delivers the card; the resume instruction does not come through here. */
function mostrarLimite(h: Anfitriao, t: Theme, cartao: CartaoLimite): true {
	const pad = h.outputPad;
	const aviso = fundoAviso(t);
	h.chatContainer.addChild(new Spacer(1));
	h.chatContainer.addChild({
		invalidate() {},
		render(w: number) {
			const encerrado = cartao.encerrado();
			const bg = encerrado ? (x: string) => t.bg("customMessageBg", x) : aviso;
			return comRecuo(bg, (width) => {
				const linhas = cartao.linhas(t);
				const gap = width - 2 * pad - largura(linhas[0] ?? "") - largura(cartao.hora);
				if (!encerrado && gap >= 2) linhas[0] += " ".repeat(gap) + t.fg("dim", cartao.hora);
				return new Text(linhas.join("\n"), pad, 1, bg).render(width);
			})(w);
		},
	});
	// If there was no wait (give-up, child or missing patch), the red error stays visible.
	const ult = ultimoErro();
	if (ult && (ult === cartao.erro || cartao.erro.endsWith(`: ${ult}`))) esconder();
	cartao.redesenhar = () => h.ui.requestRender();
	return true;
}

/** Start of showExtensionNotify: U+2063 becomes a neutral box; with a double mark, a warning. Returns true when handled. */
export function caixaNeutra(host: object, t: Theme, message: string, type?: "info" | "warning" | "error"): boolean {
	const h = vista<Anfitriao>(host);
	if (!message.startsWith(MARCA_CAIXA) || type === "error" || type === "warning") return false;
	const aviso = message.startsWith(MARCA_CAIXA + MARCA_CAIXA);
	const limite = aviso ? lerGlobal<CartaoLimite>(SINAL_LIMITE) : undefined;
	if (limite) return mostrarLimite(h, t, limite);
	const cru = message.slice(MARCA_CAIXA.length * (aviso ? 2 : 1));
	const C = aviso ? undefined : coresRecarga(t);
	const chips = C && chipsAviso(cru, C);
	if (C && chips) {
		h.chatContainer.addChild(new Spacer(1));
		h.chatContainer.addChild(avisoAnimado(h, chips, C));
		h.ui.requestRender();
		return true;
	}
	h.chatContainer.addChild(new Spacer(1));
	const [titulo = "", ...resto] = cru.split("\n");
	const texto = aviso ? t.fg("warning", t.bold(titulo.replace(/:$/, ""))) : titulo;
	const corpo = resto.map((l) => `\n${aviso ? t.fg("muted", l) : l}`).join("");
	const bg = aviso ? fundoAviso(t) : (x: string) => t.bg("customMessageBg", x);
	const hora = t.fg("dim", new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
	const pad = h.outputPad;
	h.chatContainer.addChild({
		invalidate() {},
		// Hour alone on the right of the first line, like the other signals; narrow: the Text wraps.
		render: comRecuo(bg, (w) =>
			new Text(
				`${texto}${" ".repeat(Math.max(2, w - 2 * pad - largura(texto) - largura(hora)))}${hora}${corpo}`,
				pad,
				1,
				bg,
			).render(w),
		),
	});
	h.ui.requestRender();
	return true;
}
