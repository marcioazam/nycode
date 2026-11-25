/**
 * Marca "nycode" do cabeçalho.
 * Grade de 70 × 13 pontos medida da imagem de referência (letras de 10 pontos, vão de 2), degradê vertical 239 → 122 (no tema
 * claro, espelhado para o escuro); desenhada em meio bloco: 70 colunas × 7 linhas, duas cores por célula.
 * Abertura: n-y-c-o-d-e entram uma a uma (140 ms cada), nascem do escuro, caem 4 pontos quicando e esfriam da luz ao degradê; cursor
 * desliza à frente; brilho diagonal final.
 */

import type { TerminalColorMode } from "@nycode/tui";
import { backgroundAnsi, foregroundAnsi, rgbColor } from "@nycode/tui";
import { lerpRgb } from "./motion.ts";

type Rgb = readonly [number, number, number];
const B = "..........",
	BAR = "..######..",
	ST = "###....###";
const LETRAS: string[][] = [
	[B, B, B, BAR, BAR, ST, ST, ST, ST, ST, ST, ST, ST], // n
	[
		B,
		B,
		B,
		"##.....##.",
		"##.....##.",
		"##.....##.",
		"####..###.",
		".###..##..",
		".#######..",
		"...###....",
		"...###....",
		".###......",
		".###......",
	], // y
	[B, B, B, BAR, BAR, ST, ST, "###.......", "###.......", ST, ST, BAR, BAR], // c
	[B, B, B, BAR, BAR, ST, ST, ST, ST, ST, ST, BAR, BAR], // o
	[
		".......###",
		".......###",
		".......###",
		"..########",
		"..########",
		ST,
		ST,
		ST,
		ST,
		ST,
		ST,
		"..########",
		"..########",
	], // d
	[B, B, B, BAR, BAR, ST, ST, "##########", "##########", "###.......", "###.......", BAR, BAR], // e
];
export const MARCA_W = 70;
export const MARCA_H = 7;
const H = 13;
const BMP = Array.from({ length: H }, (_, y) => LETRAS.map((l) => l[y]!).join(".."));
const on = (x: number, y: number): boolean => x >= 0 && x < MARCA_W && y >= 0 && y < H && BMP[y]![x] === "#";
// Abertura refinada: a letra nasce do escuro, assenta 4 pontos quicando (Quique,
// laboratório /logo variante 4, no degradê cinza), acende na luz levemente tingida pelo destaque e esfria ao degradê; o cursor
// desliza contínuo à frente das letras e sai pela direita; um brilho diagonal atravessa a marca e a assenta.
// ~15 % mais rápido: antes LETRA_MS 165, QUEDA_MS 420, ACENDE_MS 120, ESFRIA_MS 420.
const LETRA_MS = 140,
	QUEDA_MS = 360,
	QUEDA_PTS = 4,
	ACENDE_MS = 100,
	ESFRIA_MS = 360;
const BRILHO_INI = 5 * LETRA_MS + 260,
	BRILHO_MS = 480;
export const ABERTURA_MS = BRILHO_INI + BRILHO_MS + 35; // 1,5 s
// Quique: a letra cai 4 pontos e quica ao pousar.
const quique = (t: number) => {
	const x = Math.min(1, Math.max(0, t)),
		n = 7.5625,
		d = 2.75;
	return x < 1 / d
		? n * x * x
		: x < 2 / d
			? n * (x - 1.5 / d) ** 2 + 0.75
			: x < 2.5 / d
				? n * (x - 2.25 / d) ** 2 + 0.9375
				: n * (x - 2.625 / d) ** 2 + 0.984375;
};
const easeIO = (t: number) => {
	const x = Math.min(1, Math.max(0, t));
	return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
};

export type CoresMarca = { claro: boolean; destaque?: Rgb };

/**
 * Cor do ponto (x, y) com a abertura em `t` ms (Infinity = assentada; negativo = à espera do laço calmo, só o cursor);
 * undefined = apagado.
 */
export function ponto(x: number, y: number, t: number, c: CoresMarca): Rgb | undefined {
	const topo: Rgb = c.claro ? [45, 45, 45] : [239, 239, 239],
		base: Rgb = c.claro ? [150, 150, 150] : [122, 122, 122];
	const g = lerpRgb(topo, base, Math.min(1, Math.max(0, y / (H - 1))));
	if (t >= ABERTURA_MS) return on(x, y) ? g : undefined;
	// Barra fina (/cursor variante 3; antes bloco de 2 colunas) na altura das minúsculas: parada na espera,
	// depois desliza 12 colunas por letra e sai pela direita.
	const xc = Math.floor(10 + (12 * Math.max(0, t)) / LETRA_MS);
	if (c.destaque && y >= 3 && x === xc) return c.destaque;
	if (t < 0) return undefined;
	const tl = t - Math.floor(x / 12) * LETRA_MS;
	if (tl < 0) return undefined;
	const off = Math.round(QUEDA_PTS * (1 - quique(tl / QUEDA_MS)));
	if (y - off < 0 || !on(x, y - off)) return undefined;
	const luz: Rgb = c.claro ? [0, 0, 0] : c.destaque ? lerpRgb([255, 255, 255], c.destaque, 0.18) : [255, 255, 255];
	const escuro: Rgb = c.claro ? [236, 236, 236] : [30, 30, 38];
	let cor =
		tl < ACENDE_MS
			? lerpRgb(escuro, luz, easeIO(tl / ACENDE_MS))
			: lerpRgb(luz, g, easeIO((tl - ACENDE_MS) / ESFRIA_MS));
	const tb = t - BRILHO_INI;
	if (tb > 0) {
		const centro = -12 + (MARCA_W + 38) * easeIO(tb / BRILHO_MS),
			d = x + y * 0.7 - centro;
		const w = Math.exp(-(d * d) / 22) * 0.6;
		if (w > 0.02) cor = lerpRgb(cor, luz, w);
	}
	return cor;
}

/** As 7 linhas da marca (70 colunas visíveis cada) no instante `t`. SGR só quando a cor muda: menos bytes por quadro. */
export function marcaLinhas(t: number, c: CoresMarca, mode: TerminalColorMode): string[] {
	const fg = (k: Rgb) => foregroundAnsi(rgbColor(k[0], k[1], k[2]), mode);
	const bg = (k: Rgb) => backgroundAnsi(rgbColor(k[0], k[1], k[2]), mode);
	return Array.from({ length: MARCA_H }, (_, cy) => {
		let s = "",
			cf = "",
			cb = "";
		const cor = (f: string, b: string): string => {
			let o = "";
			if (f !== cf) {
				cf = f;
				o += f || "\x1b[39m";
			}
			if (b !== cb) {
				cb = b;
				o += b || "\x1b[49m";
			}
			return o;
		};
		for (let x = 0; x < MARCA_W; x++) {
			// A 1ª linha de pontos é a -1 (vazia): a haste do d cabe na 1ª célula com o meio bloco de baixo.
			const a = ponto(x, cy * 2 - 1, t, c),
				b = ponto(x, cy * 2, t, c);
			s +=
				a && b ? `${cor(fg(a), bg(b))}▀` : a ? `${cor(fg(a), "")}▀` : b ? `${cor(fg(b), "")}▄` : `${cor(cf, "")} `;
		}
		return s + (cf ? "\x1b[39m" : "") + (cb ? "\x1b[49m" : "");
	});
}
