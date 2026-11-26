// /reload screen: the `recarregando` clock, the screen-clearing wrapper and the `recarregado` divider.

import { type Component, Spacer, Text } from "@nycode/tui";
import type { Theme } from "../theme/theme.ts";
import {
	type Anfitriao,
	bgRgb,
	type Celula,
	type Cores,
	coresRecarga,
	easeC,
	easeIO,
	fgRgb,
	gravarGlobal,
	hora24,
	largura,
	lerGlobal,
	letras,
	mistura,
	nerd,
	parado,
	pintar,
	SGR,
	tocarRecarga,
	vista,
} from "./base.ts";

export const PONTO_MS = 300;
export const CICLO_MS = 1600;
export const QUADRO_MS = 33;
export const SAI_MS = 220;
export const PRONTO_MAX_MS = 3000;
export const ESTAVEL_MS = 400;
export const MIN_MS = 600;
export const ESTAVEL_N = Math.ceil(ESTAVEL_MS / QUADRO_MS);
export const DIVISOR_MS = 340;
const SURGE_MS = 280;
const PASSO_MS = 110;
export const RECARGA_MAX_MS = 5000; // a reload mark older than this is ignored
export const RECARGA = Symbol.for("nycode:recarga");

/** The reload mark written by the avisos extension on session_shutdown (reason 'reload'). */
export interface MarcaRecarga {
	desde: number;
	divisor?: number;
	avisos: Array<{ dist: number }>;
}

type Render = (w: number) => readonly string[];
interface Mutavel extends Component {
	render: Render;
	__vazio?: boolean;
	children?: Mutavel[];
}

/** Brightness (0..1) of dot i at instant ms of the cycle: lights in PONTO_MS one after the other, holds, fades together. */
export function brilhoPonto(i: number, ms: number): number {
	const x = ((ms % CICLO_MS) + CICLO_MS) % CICLO_MS;
	const e = (v: number) => {
		const c = Math.min(1, Math.max(0, v));
		return c * c * (3 - 2 * c);
	};
	return x < 1200 ? e((x - i * PONTO_MS) / PONTO_MS) : 1 - e((x - 1200) / PONTO_MS);
}

interface Espera {
	agora: () => number;
	suave: boolean;
	quadro: (w: number, alfa?: number) => string[];
	t0: number;
}

/** `recarregando  ...` in the exact center of an empty screen; the dots light one by one in a loop. */
export function recarregando(host: object, t: Theme, agora: () => number = () => performance.now()): Component {
	const h = vista<Anfitriao>(host);
	const t0 = agora();
	const quieto = parado();
	const de = bgRgb(t, "customMessageBg");
	const para = fgRgb(t, "accent");
	const muted = fgRgb(t, "muted");
	const texto = fgRgb(t, "text");
	const suave = !quieto && !!(de && para && muted && texto);
	const ponto = (a: number): string => {
		if (a <= 0.02) return " ";
		if (a >= 1 || !de || !para) return a >= 0.5 ? t.fg("accent", ".") : " ";
		return `\x1b[38;2;${de.map((v, k) => Math.round(v + (para[k]! - v) * a)).join(";")}m.\x1b[39m`;
	};
	// alfa: 1 in the box and while waiting; falls to 0 in SAI_MS when the screen is ready.
	const quadro = (w: number, alfa = 1): string[] => {
		const ms = agora() - t0;
		const pts = [0, 1, 2].map((i) => ponto(quieto ? 1 : brilhoPonto(i, ms) * alfa)).join("");
		let palavra = t.fg("muted", "recarregando");
		if (suave && de && muted && texto) {
			const k = 0.6 * (0.5 - 0.5 * Math.cos((ms / CICLO_MS) * 2 * Math.PI));
			const cor = mistura(muted, texto, k);
			palavra = `\x1b[38;2;${(alfa >= 1 ? cor : mistura(de, cor, alfa)).join(";")}mrecarregando\x1b[39m`;
		}
		const txt = w >= 22 ? `${palavra}  ${pts}  ` : `${pts}  `;
		const vis = w >= 22 ? 19 : 5;
		const linha = " ".repeat(Math.max(0, Math.floor((w - vis) / 2))) + txt;
		const altura = Math.max(1, h.ui.terminal?.rows ?? process.stdout.rows ?? 24);
		const cima = Math.floor((altura - 1) / 2);
		return [...Array<string>(cima).fill(""), linha, ...Array<string>(altura - cima - 1).fill("")];
	};
	const comp: Mutavel & { quadro?: () => void } = {
		invalidate() {},
		render(w: number) {
			// Only this line on screen: the native box rules and spacers vanish (objects discarded after the reload).
			const caixa = (h.editorContainer.children as Mutavel[] | undefined)?.find((c) => c.children?.includes(comp));
			for (const k of caixa?.children ?? []) {
				if (k !== comp && !k.__vazio) {
					k.render = () => [];
					k.__vazio = true;
				}
			}
			return quadro(w);
		},
	};
	const na = (c: Mutavel | undefined): boolean => c === comp || (c?.children ?? []).some(na);
	const tela = limparTela(host, () => na(h.editorContainer as Mutavel), { agora, suave, quadro, t0 });
	comp.quadro = tela.tick;
	// One clock, no new timer: it goes on after the box leaves, until the screen is ready and released.
	const id = setInterval(() => {
		tela.tick();
		if (tela.liberado()) clearInterval(id);
		else if (!quieto || !na(h.editorContainer as Mutavel)) h.ui.requestRender();
	}, QUADRO_MS);
	id.unref?.();
	return comp;
}

/** /reload clears the screen first: while the box is in the editor, the other TUI children draw nothing; then they come back. */
export function limparTela(
	host: object,
	mostrando: () => boolean,
	espera?: Espera,
): { tick: () => void; liberado: () => boolean } {
	const h = vista<Anfitriao>(host);
	const tui = h.ui;
	const alvo = h.editorContainer;
	const ocultos: Array<[Mutavel, boolean, Render, Render]> = [];
	const todos: Array<[Mutavel, boolean, Render, Render]> = [];
	const agora = espera?.agora ?? (() => performance.now());
	let voltou = false;
	let liberado = !espera;
	let tSaiu: number | undefined;
	let tApaga: number | undefined;
	let ant: string | undefined;
	let iguais = 0;
	let desde = 0;
	const tIni = espera?.t0 ?? agora();
	const volta = () => {
		if (voltou) return;
		voltou = true;
		for (const [c, proprio, orig, nosso] of todos) {
			if (c.render === nosso) {
				if (proprio) c.render = orig;
				else Reflect.deleteProperty(c, "render");
			}
		}
		setImmediate(() => tui.requestRender(true));
	};
	const alfa = () => (tApaga === undefined ? 1 : 1 - easeIO((agora() - tApaga) / SAI_MS));
	const envolver = (c: Mutavel, ehAlvo: boolean): [Mutavel, boolean, Render, Render] => {
		const proprio = Object.hasOwn(c, "render");
		const orig = c.render;
		const nosso = function (this: Mutavel, w: number): readonly string[] {
			if (ehAlvo) {
				if (mostrando()) return orig.call(this, w);
				if (!voltou && !liberado && espera) return espera.quadro(w, alfa());
			} else if (!voltou && (mostrando() || !liberado)) return [];
			volta();
			return orig.call(this, w);
		};
		c.render = nosso;
		const reg: [Mutavel, boolean, Render, Render] = [c, proprio, orig, nosso];
		todos.push(reg);
		return reg;
	};
	// A new child (widget or footer put after the start) also stays hidden until released.
	const cobrir = () => {
		for (const c of (tui.children ?? []) as Mutavel[]) {
			if (typeof c?.render !== "function" || todos.some((x) => x[0] === c)) continue;
			if (c === (alvo as Mutavel)) {
				if (espera) envolver(c, true);
			} else ocultos.push(envolver(c, false));
		}
	};
	cobrir();
	const tick = () => {
		if (liberado || voltou || mostrando()) return;
		const t = agora();
		tSaiu ??= t;
		if (tApaga !== undefined) {
			if (t - tApaga >= SAI_MS) liberado = true;
			return;
		}
		cobrir();
		if (ocultos.length < 2) {
			liberado = true;
			return;
		}
		let pronto = false;
		try {
			const w = Math.max(1, tui.terminal?.columns ?? process.stdout.columns ?? 80);
			const ls = ocultos.map(([c, , orig]) => orig.call(c, w).map((l) => l.replace(SGR, "")));
			const ass = ls.map((l) => l.join("\n")).join("\u0000");
			if (ass === ant) iguais++;
			else {
				iguais = 0;
				desde = t;
			}
			ant = ass;
			pronto =
				!!ls.at(-1)?.some((l) => l.trim() !== "") &&
				iguais >= ESTAVEL_N &&
				t - desde >= ESTAVEL_MS &&
				t - tIni >= MIN_MS;
		} catch {
			liberado = true;
			return;
		}
		if (pronto || t - tSaiu >= PRONTO_MAX_MS) {
			if (espera?.suave) tApaga = t;
			else liberado = true;
		}
	};
	return { tick, liberado: () => liberado || voltou };
}

/** Centered dim divider text on one line. */
function divisorTexto(t: Theme, partes: string[]): Component {
	return {
		invalidate() {},
		render(w: number) {
			if (w < 1) return [];
			const ps = [...partes];
			while (ps.length > 1 && largura(ps.join(" · ")) > w) ps.pop();
			const texto = ps.join(" · ").slice(0, w);
			return new Text(" ".repeat(Math.floor((w - largura(texto)) / 2)) + t.fg("dim", texto), 0, 0).render(
				w,
			) as string[];
		},
	};
}

function divisorRecarga(C: Cores, partes: string[], t0: number): Component {
	const icone = nerd() ? "\uf021" : "↻";
	let fixo: { w: number; l: string[] } | undefined;
	return {
		invalidate() {
			fixo = undefined;
		},
		render(w: number) {
			if (w < 1) return [];
			if (fixo?.w === w) return fixo.l.slice();
			const ps = [...partes];
			while (ps.length > 1 && largura(ps.join(" · ")) + 8 > w) ps.pop();
			const rot = [{ c: " " }, ...letras(`${icone} `, C.accent), ...letras(ps.join(" · "), C.muted), { c: " " }];
			const lado = Math.max(0, Math.floor((w - rot.length) / 2));
			const cels: Celula[] = [
				...letras("─".repeat(lado), C.borda),
				...rot,
				...letras("─".repeat(Math.max(0, w - lado - rot.length)), C.borda),
			].slice(0, w);
			const p = parado() ? 1 : easeIO((performance.now() - t0) / DIVISOR_MS);
			const r = (w / 2) * p;
			const l = [pintar(p >= 1 ? cels : cels.map((x, j) => (Math.abs(j + 0.5 - w / 2) <= r ? x : { c: " " })), C)];
			if (p >= 1) fixo = { w, l };
			return l;
		},
	};
}

/** Hook of the /reload confirmation: the saved-trust note stays as a detail when it fits. */
export function recarregado(host: object, t: Theme, confianca: boolean): void {
	const h = vista<Anfitriao>(host);
	h.chatContainer.addChild(new Spacer(1));
	const partes = ["recarregado", hora24(Date.now()), ...(confianca ? ["confiança do projeto salva"] : [])];
	const cores = coresRecarga(t);
	if (!cores) h.chatContainer.addChild(divisorTexto(t, partes));
	else {
		// Divider first: it draws from the center to the ends; the reload notices open after it.
		const g = lerGlobal<MarcaRecarga>(RECARGA);
		const now = performance.now();
		gravarGlobal(RECARGA, undefined);
		if (g && now - g.desde < RECARGA_MAX_MS) {
			g.divisor = now;
			g.avisos.forEach((a, i) => {
				a.dist = g.avisos.length - i;
			});
		}
		h.chatContainer.addChild(divisorRecarga(cores, partes, now));
		tocarRecarga(h, now + DIVISOR_MS + 300 + (g?.avisos.length ?? 0) * PASSO_MS + SURGE_MS);
	}
	h.ui.requestRender();
}

// ---- Reload and start-up notices as chips: rules and memory lines drawn as pills, with the entry animation ----
export const ABERTURA = Symbol.for("nycode:abertura");
const ESPERA_MS = 1500;
const CASCATA_MS = 90;

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
