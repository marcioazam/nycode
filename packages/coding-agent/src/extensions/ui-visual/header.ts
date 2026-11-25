/** Cabeçalho: marca nycode, versão e atalhos; sem NO_COLOR (ui/a11y.ts põe o cabeçalho plano). */

import { truncateToWidth, visibleWidth } from "@nycode/tui";
import { VERSION } from "../../config.ts";
import type { ExtensionAPI } from "../../core/extensions/types.ts";
import type { Theme } from "../../modes/interactive/theme/theme.ts";
import { statusPendente } from "../status-line/rows.ts";
import { noColor } from "../ui/a11y.ts";
import { anima, assinarQuadro, esmaecer, safeAnsi } from "./motion/motion.ts";
import { ABERTURA_MS, MARCA_W, marcaLinhas } from "./motion/nycode.ts";

export { ABERTURA_MS };
export const PASSO_MAX_MS = 34; // 2 quadros de 60 fps
const TETO_MS = 4 * ABERTURA_MS; // travado demais: assenta de vez
// Partida calma: o 1º desenho chega no meio da carga do início (skills, hooks, MCP;
// ~200 ms de laço ocupado medidos no nycode real), e a abertura congelava. Ela só começa depois de CALMA_QUADROS desenhos
// seguidos a menos de CALMA_GAP_MS um do outro, ou ESPERA_MAX_MS após o 1º desenho; até lá, só o cursor parado.
export const CALMA_QUADROS = 6,
	CALMA_GAP_MS = 28,
	ESPERA_MAX_MS = 1500;
// Abertura em sequência: quando a marca começa, a linha `nycode versão   atalhos` nasce do fundo em
// TEXTO_MS (como o divisor do /reload), os avisos de regras e memória abrem depois dela (patch de avisos do core
// lê globalThis[ABERTURA].t0) e editor, status e rodapé sobem do fundo em BASE_MS. Só na partida, só em movimento normal.
export const ABERTURA = Symbol.for("nycode:abertura");
export const TEXTO_MS = 340,
	BASE_MS = 360;
type Abertura = { desde: number; t0?: number };
const easeC = (x: number): number => 1 - (1 - Math.min(1, Math.max(0, x))) ** 3;
const easeIO = (t: number): number => {
	const x = Math.min(1, Math.max(0, t));
	return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
};
type Style = Pick<Theme, "fg" | "bold"> & Partial<Pick<Theme, "getColorMode" | "getFgAnsi" | "getBgAnsi">>;

export const HINTS: [string, string][] = [
	["?", "atalhos"],
	["/", "comandos"],
	["!", "shell"],
];

/** Junta segmentos e descarta os de menor prioridade (os últimos) até caber; trunca só o que sobrar. */
function fitLine(prefix: string, segs: string[], gap: string, width: number): string {
	const s = [...segs];
	while (s.length > 1 && visibleWidth(prefix + s.join(gap)) > width) s.pop();
	return truncateToWidth(prefix + s.join(gap), Math.max(0, width));
}

const claro = (t: Style): boolean => {
	const c = safeAnsi(() => t.getFgAnsi?.("text"));
	return !!c && c[0] + c[1] + c[2] < 380; // tema claro: texto escuro
};

/**
 * Marca nycode (7 linhas, 70 colunas) no lugar do logo do nycode, uma linha em branco e
 * `nycode versão   atalhos`. Abaixo de 71 colunas fica só a linha de texto. `t`: ms desde a abertura (Infinity = assentada).
 */
export function buildHeaderLines(version: string, theme: Style, width: number, t = Infinity): string[] {
	const dim = (s: string) => theme.fg("dim", s);
	const hints = HINTS.map(([k, label]) => `${theme.bold(theme.fg("text", k))} ${dim(label)}`);
	let texto = fitLine(" ", [`${theme.bold(theme.fg("text", "nycode"))} ${dim(version)}`, ...hints], "   ", width);
	const cor = t < TEXTO_MS && fundoTexto(theme);
	if (cor) texto = t < 0 ? "" : esmaecer(texto, easeC(t / TEXTO_MS), cor[0], cor[1]);
	if (width < MARCA_W + 1) return [texto];
	const marca = marcaLinhas(
		t,
		{ claro: claro(theme), destaque: safeAnsi(() => theme.getFgAnsi?.("accent")) },
		theme.getColorMode?.() ?? "truecolor",
	);
	return [...marca.map((l) => ` ${l}`), "", texto];
}

/** [fundo, texto] em RGB para esmaecer; undefined sem truecolor (aparece pronto). */
function fundoTexto(theme: Style): [number[], number[]] | undefined {
	if ((theme.getColorMode?.() ?? "truecolor") !== "truecolor") return undefined;
	const f = safeAnsi(() => theme.getBgAnsi?.("customMessageBg")),
		x = safeAnsi(() => theme.getFgAnsi?.("text"));
	return f && x ? [f, x] : undefined;
}

/** Editor, status e rodapé (filhos 3 a 6 do TUI) sobem do fundo em `ms` a partir de `ab.t0`; depois o embrulho sai.
 * `de`: primeiro filho embrulhado; `ultimas`: só as últimas N linhas de cada filho esmaecem (as de cima, fora da tela, não);
 * `noPrimeiro`: sem t0, o 1º desenho o marca (no /reload o relógio começa quando a tela volta, não durante a carga). */
export function subirBase(
	tui: { children?: Array<{ render: (w: number) => string[] }> } | undefined,
	theme: Style,
	ab: Abertura,
	{ de = 3, ultimas = Infinity, ms = BASE_MS, noPrimeiro = false } = {},
): void {
	const cor = fundoTexto(theme);
	if (!cor) return;
	for (const c of tui?.children?.slice(de, 7) ?? []) {
		if (!c || typeof c.render !== "function") continue;
		const proprio = Object.hasOwn(c, "render"),
			r = c.render;
		const fn = function (this: unknown, w: number): string[] {
			const ls = r.call(this, w);
			// Tela ainda vazia (o /reload esconde tudo enquanto carrega): o relógio só começa quando houver o que mostrar.
			if (noPrimeiro && ab.t0 === undefined && ls.some((l) => l !== "")) ab.t0 = performance.now();
			const a = ab.t0 === undefined ? 0 : easeIO((performance.now() - ab.t0) / ms);
			if (
				a >= 1 ||
				performance.now() - ab.desde >
					4 * ESPERA_MAX_MS + (noPrimeiro && ab.t0 !== undefined ? ab.t0 - ab.desde : 0)
			) {
				if (c.render === fn) {
					if (proprio) c.render = r;
					else delete (c as { render?: unknown }).render;
				}
				return ls;
			}
			const corte = Math.max(0, ls.length - ultimas);
			return ls.map((l, i) => (i < corte ? l : esmaecer(l, a, cor[0], cor[1])));
		};
		c.render = fn;
	}
}

// /reload: a tela inteira, chat, editor, abas e rodapé, sobe do fundo em RECARGA_MS.
export const RECARGA_MS = 420;
/** Embrulha os filhos 0 a 6 do TUI e pede quadros até o fim; `linhas`: altura do terminal (do documento, só as visíveis). */
export function recarregar(
	tui: { children?: Array<{ render: (w: number) => string[] }>; requestRender?: () => void } | undefined,
	theme: Style,
	linhas: number,
): void {
	if (!fundoTexto(theme)) return;
	const ab: Abertura = { desde: performance.now() };
	subirBase(tui, theme, ab, { de: 0, ultimas: Math.max(1, linhas), ms: RECARGA_MS, noPrimeiro: true });
	assinarQuadro(
		"ui-visual-recarga",
		(t) => {
			tui?.requestRender?.();
			return ab.t0 === undefined ? t - ab.desde < 4 * ESPERA_MAX_MS : t - ab.t0 <= RECARGA_MS + 34;
		},
		{ transicao: true },
	);
}

export default function (nycode: ExtensionAPI) {
	const g = globalThis as Record<symbol, Abertura | undefined>;
	// claude-rules loads first and posts the rules notice on its own session_start: the mark exists from load, so it waits.
	if (process.env.NYCODE_SUBAGENT !== "1" && anima()) g[ABERTURA] = { desde: performance.now() };
	nycode.on("session_start", (e, ctx) => {
		if (!ctx.hasUI || process.env.NYCODE_SUBAGENT === "1" || noColor()) return;
		const marca = g[ABERTURA];
		const ab: Abertura | undefined =
			(e as { reason?: string })?.reason !== "reload" && anima()
				? marca && marca.t0 === undefined
					? marca
					: { desde: performance.now() }
				: undefined;
		g[ABERTURA] = ab;
		const recarga = (e as { reason?: string })?.reason === "reload" && anima();
		ctx.ui.setHeader((tui, theme) => {
			if (ab) subirBase(tui as never, theme, ab);
			if (recarga)
				recarregar(
					tui as never,
					theme,
					(tui as { terminal?: { rows?: number } })?.terminal?.rows ?? process.stdout.rows ?? 60,
				);
			// Abertura "Letra a letra" uma vez por sessão, só em movimento normal; reduzido e desligado mostram a marca assentada.
			// Relógio da abertura: espera o laço acalmar (partida calma, acima) e avança no máximo PASSO_MAX_MS por quadro, então
			// um travamento que sobrar atrasa a animação em vez de pular letras. 60 fps pelo relógio de transição.
			let idade = anima() ? -2 : Infinity,
				visto = 0,
				inicio = 0,
				calmos = 0;
			let chave = "",
				guardado: string[] = [];
			return {
				render: (width: number) => {
					const now = performance.now();
					if (idade === -2) {
						idade = -1;
						inicio = now;
						assinarQuadro(
							"ui-visual-cabecalho",
							(t) => {
								tui?.requestRender?.();
								return idade < ABERTURA_MS && t - inicio <= TETO_MS + ESPERA_MAX_MS;
							},
							{ transicao: true },
						);
					} else if (idade === -1) {
						calmos = now - visto < CALMA_GAP_MS ? calmos + 1 : 0;
						if ((calmos >= CALMA_QUADROS && !statusPendente()) || now - inicio >= ESPERA_MAX_MS) {
							idade = 0;
							inicio = now;
							if (ab) ab.t0 = now;
						}
					} else if (idade < ABERTURA_MS)
						idade = now - inicio > TETO_MS ? Infinity : idade + Math.min(now - visto, PASSO_MAX_MS);
					visto = now;
					if (idade < ABERTURA_MS) return buildHeaderLines(VERSION, theme, width, idade);
					const k = `${width}|${theme.getColorMode?.() ?? ""}`;
					if (k !== chave) {
						guardado = buildHeaderLines(VERSION, theme, width);
						chave = k;
					}
					return guardado.slice();
				},
				invalidate() {
					chave = "";
				},
			};
		});
	});
}
