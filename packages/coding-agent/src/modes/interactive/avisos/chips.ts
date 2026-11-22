// Reload and start-up notices as chips: rules and memory lines drawn as pills in the chat margin, with the entry animation.

import type { Component } from "@nycode/tui";
import {
	type Anfitriao,
	type Celula,
	type Cores,
	easeC,
	lerGlobal,
	letras,
	parado,
	pintar,
	SGR,
	tocarRecarga,
} from "./base.ts";
import { type MarcaRecarga, RECARGA, RECARGA_MAX_MS } from "./recarga.ts";

export const ABERTURA = Symbol.for("nycode-harness:abertura");
const ESPERA_MS = 1500;
const CASCATA_MS = 90;
const SURGE_MS = 280;
const PASSO_MS = 110;

interface MarcaAbertura {
	desde: number;
	t0?: number;
	avisos?: number;
}
interface Meu {
	criado: number;
	g?: MarcaRecarga;
	ab?: MarcaAbertura;
	dist: number;
}

/** A memory/rules notice (`icon  label  part · part`) as chips; undefined when it is not in that format. */
export function chipsAviso(cru: string, C: Cores): ((w: number) => Celula[]) | undefined {
	const m = /^(\S+)(\s+)(regras|memória)\s{2,}(.+)$/u.exec(cru.replace(SGR, ""));
	if (!m) return undefined;
	const nome = m[3] as string;
	const resto = m[4] as string;
	// `Regras: 2 globais · ...` without icon, background or hour; parts separated by `·`.
	const cels = [
		...letras(nome.charAt(0).toUpperCase() + nome.slice(1), C.text, undefined, true),
		...letras(": ", C.dim),
	];
	resto.split(" · ").forEach((p, i) => {
		if (i) cels.push(...letras(" · ", C.dim));
		const cor = p.startsWith("/")
			? C.accent
			: nome === "memória" && /projeto$/.test(p)
				? C.accent
				: nome === "memória" && /orientação$/.test(p)
					? C.ok
					: /^nenhuma|sem tipo$/.test(p) || !/^\d/.test(p)
						? C.dim
						: C.muted;
		cels.push(...letras(p, cor));
	});
	// Neutral strip: customMessageBg end to end, indent like the neutral cards.
	const faixa: Celula = { c: " ", b: C.box };
	const todas = [faixa, faixa, ...cels.map((x) => ({ ...x, b: C.box }))];
	return (w) => {
		if (w < 1) return [];
		const l = todas.slice(0, w);
		while (l.length < w) l.push(faixa);
		return l;
	};
}

let ultimoAviso = { em: -Infinity, i: -1 };

/** Chip notice with its entry animation: after the divider on reload, after the header mark at start, else a 90 ms cascade. */
export function avisoAnimado(host: Pick<Anfitriao, "ui">, celsDe: (w: number) => Celula[], C: Cores): Component {
	const now = performance.now();
	const g = lerGlobal<MarcaRecarga>(RECARGA);
	const ab = lerGlobal<MarcaAbertura>(ABERTURA);
	const meu: Meu = { criado: now, g: g && now - g.desde < RECARGA_MAX_MS && !g.divisor ? g : undefined, dist: 1 };
	if (meu.g) meu.g.avisos.push(meu);
	else if (ab && now - ab.desde < RECARGA_MAX_MS) {
		ab.avisos = (ab.avisos ?? 0) + 1;
		meu.ab = ab;
		meu.dist = ab.avisos;
	}
	ultimoAviso = { em: now, i: now - ultimoAviso.em < 300 ? Math.min(3, ultimoAviso.i + 1) : 0 }; // at most 3 steps of delay
	const i = ultimoAviso.i;
	const alfa = (t: number): number => {
		if (parado()) return 1;
		if (meu.g?.divisor) return easeC((t - meu.g.divisor - 300 - (meu.dist - 1) * PASSO_MS) / SURGE_MS);
		if (meu.ab)
			return meu.ab.t0 === undefined
				? t - now < 2 * ESPERA_MS
					? 0
					: 1
				: easeC((t - meu.ab.t0 - 300 - (meu.dist - 1) * PASSO_MS) / SURGE_MS);
		if (meu.g && t - now < ESPERA_MS) return 0; // reload: wait for the divider
		return easeC((t - now - (meu.g ? ESPERA_MS : i * CASCATA_MS)) / SURGE_MS);
	};
	tocarRecarga(
		host,
		now + (meu.g ? ESPERA_MS : meu.ab ? 2 * ESPERA_MS + 300 + meu.dist * PASSO_MS : i * CASCATA_MS) + SURGE_MS,
	);
	let fixo: { w: number; l: string[] } | undefined;
	return {
		invalidate() {
			fixo = undefined;
		},
		render(w: number) {
			if (fixo?.w === w) return fixo.l.slice();
			const a = alfa(performance.now());
			const l = [a <= 0 ? " ".repeat(Math.max(0, w)) : pintar(celsDe(w), C, a)];
			if (a >= 1) fixo = { w, l };
			return l;
		},
	};
}
