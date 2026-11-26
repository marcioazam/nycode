/**
 * Motor de movimento (Onda 10): um relógio só, cadência adaptativa e efeitos de cor em ANSI 24-bit.
 * - `assinarQuadro` (P02): 16 ms só enquanto há transição curta; contínuos a 33 ms (66 ms em tmux/SSH) e a 1 tique por
 *   segundo sem foco ou em `reduzido`; em `desligado` nada assina. O timer desliga sem assinantes.
 * - Critério único: `movimento()` de ui/a11y.ts (P01). `NO_COLOR` não vazio tira só os efeitos de cor.
 * - Sem truecolor no tema (`getFgAnsi` ausente) todo efeito devolve o texto padrão, sem mudar coluna visível.
 */
import { performance } from "node:perf_hooks";
import { movimento, noColor } from "../../ui/a11y.ts";

type Env = Record<string, string | undefined>;
type Rgb = readonly number[];
export type Rgb3 = [number, number, number];

export type AnsiProbeTheme = {
	fg: (color: string, text: string) => string;
	bg?: (color: string, text: string) => string;
	getFgAnsi?: (color: string) => string;
	getBgAnsi?: (color: string) => string;
};

// ── cadência (P02) ───────────────────────────────────────────────────────────
/** Codex desenha a 32 ms por quadro e o Ink limita a 30 fps; 16 ms é o piso do próprio @nycode/tui. */
export const QUADRO_MS = { transicao: 16, continuo: 33, remoto: 66, parado: 1000 } as const;
const ACORDA_MS = 250; // contínuo parado (sem foco, reduzido): acorda 4×/s para retomar logo, desenha 1×/s
// Foco do terminal, posto por ui/terminal.ts; cada extensão tem a própria cópia deste módulo, daí o globalThis.
const FOCO = Symbol.for("nycode:foco");
export const definirFoco = (focado: boolean | undefined): void => {
	(globalThis as Record<symbol, unknown>)[FOCO] = focado;
};
const semFoco = (): boolean => (globalThis as Record<symbol, unknown>)[FOCO] === false;
const remoto = (env: Env): boolean => Boolean(env.TMUX || env.SSH_CONNECTION || env.SSH_TTY);

/** Varredura, brilho e mistura de cor: só em `normal`, com cor e com o terminal em foco. */
export const anima = (env: Env = process.env): boolean => movimento(env) === "normal" && !noColor(env) && !semFoco();
// D2 (docs/perf-sota.md): fator 1, 2, 4 ou 8 sobre a cadência contínua, guiado pela ocupação do laço de eventos (ELU) lida a cada >= 1 s.
const ELU_JANELA_MS = 1000;
const ELU_SOBE = 0.3;
const ELU_DESCE = 0.12;
const FATOR_MAX = 8;
type Assinante = { passo: (now: number) => boolean; transicao: boolean; ultimo: number; env: Env };
type EstadoRelogio = {
	subs: Map<string, Assinante>;
	timer: unknown;
	timerMs: number;
	fator: number;
	leituraEm: number | undefined;
};
// jiti carrega este arquivo mais de uma vez: o relógio mora em globalThis para não haver dois timers.
const RELOGIO = Symbol.for("nycode:relogio");
const est = (): EstadoRelogio => {
	const g = globalThis as Record<symbol, EstadoRelogio>;
	g[RELOGIO] ??= { subs: new Map(), timer: undefined, timerMs: 0, fator: 1, leituraEm: undefined };
	return g[RELOGIO];
};
/** De quanto em quanto tempo um efeito contínuo é redesenhado (cadência base × fator de carga, teto 250 ms). */
export const intervaloContinuo = (env: Env = process.env): number =>
	movimento(env) !== "normal" || semFoco()
		? QUADRO_MS.parado
		: Math.min(ACORDA_MS, (remoto(env) ? QUADRO_MS.remoto : QUADRO_MS.continuo) * est().fator);
/** Emenda de teste: o timer real pode ser trocado por um gravador. */
export const relogio = {
	set: (f: () => void, ms: number): unknown => {
		const t = setInterval(f, ms);
		t.unref?.();
		return t;
	},
	clear: (t: unknown): void => clearInterval(t as ReturnType<typeof setInterval>),
	agora: (): number => performance.now(),
	/** Ocupação do laço de eventos (0 a 1) desde a leitura anterior. */
	ocupacao: ((): (() => number) => {
		let ant: ReturnType<typeof performance.eventLoopUtilization> | undefined;
		return () => {
			const atual = performance.eventLoopUtilization();
			const u = ant ? performance.eventLoopUtilization(atual, ant).utilization : 0;
			ant = atual;
			return u;
		};
	})(),
};
const acertar = (): void => {
	const e = est();
	if (!e.subs.size) {
		e.fator = 1;
		e.leituraEm = undefined;
	}
	let ms = 0;
	for (const s of e.subs.values())
		ms = Math.min(ms || Infinity, s.transicao ? QUADRO_MS.transicao : Math.min(intervaloContinuo(s.env), ACORDA_MS));
	if (ms === e.timerMs) return;
	if (e.timer !== undefined) relogio.clear(e.timer);
	e.timer = ms ? relogio.set(() => tique(relogio.agora()), ms) : undefined;
	e.timerMs = ms;
};

/** Um quadro do relógio: chama quem está na vez, tira quem devolveu `false` e reajusta o timer (foco e nível mudam em vida). */
export function tique(now: number): void {
	const e = est();
	if (e.leituraEm === undefined) e.leituraEm = now;
	else if (now - e.leituraEm >= ELU_JANELA_MS) {
		e.leituraEm = now;
		const u = relogio.ocupacao();
		if (u > ELU_SOBE) e.fator = Math.min(FATOR_MAX, e.fator * 2);
		else if (u < ELU_DESCE) e.fator = Math.max(1, e.fator / 2);
	}
	for (const [k, s] of e.subs) {
		if (!s.transicao && now - s.ultimo < intervaloContinuo(s.env) - 2) continue; // 2 ms de folga para o atraso do timer
		s.ultimo = now;
		let segue = false;
		try {
			segue = s.passo(now);
		} catch {
			segue = false;
		}
		if (!segue) est().subs.delete(k);
	}
	acertar();
}

/** Assina o relógio único. `transicao: true` é para efeito de até 300 ms (60 fps); o resto é contínuo. Devolve o cancelamento. */
export function assinarQuadro(
	chave: string,
	passo: (now: number) => boolean,
	opts: { transicao?: boolean; env?: Env } = {},
): () => void {
	const env = opts.env ?? process.env;
	if (movimento(env) === "desligado") return () => {};
	if (!est().subs.size) relogio.ocupacao(); // descarta o intervalo ocioso: a janela de carga começa com o 1º assinante
	est().subs.set(chave, { passo, transicao: opts.transicao === true, ultimo: -Infinity, env });
	acertar();
	return () => {
		est().subs.delete(chave);
		acertar();
	};
}

export const activeSubscriberCount = (): number => est().subs.size;
/** Intervalo do timer em uso (0 = desligado). */
export const intervaloAtual = (): number => est().timerMs;

// ── cor ──────────────────────────────────────────────────────────────────────
const rgbs = new Map<string, Rgb3 | undefined>();
/** Extrai `[R, G, B]` de uma sequência SGR truecolor (`38;2;R;G;B` ou `48;2;R;G;B`). Devolve uma cópia: quem recebe pode
 * mexer no array sem estragar o cache. */
export const parseRgb = (ansi: string | undefined): Rgb3 | undefined => {
	const key = ansi ?? "";
	let rgb = rgbs.get(key);
	if (rgb === undefined && !rgbs.has(key)) {
		const m = /[34]8;2;(\d+);(\d+);(\d+)/.exec(key);
		rgb = m ? [Number(m[1]), Number(m[2]), Number(m[3])] : undefined;
		// The theme has a few dozen colors; effects ask for them on every frame of every message (perf 2026-11-24).
		if (rgbs.size >= 256) rgbs.clear();
		rgbs.set(key, rgb);
	}
	return rgb && [rgb[0], rgb[1], rgb[2]];
};

export const safeAnsi = (fn: (() => string | undefined) | undefined): Rgb3 | undefined => {
	if (!fn) return undefined;
	try {
		return parseRgb(fn());
	} catch {
		return undefined;
	}
};

export const lerpChannel = (a: number, b: number, t: number): number =>
	Math.max(0, Math.min(255, Math.round(a + (b - a) * t)));

export const lerpRgb = (c1: Rgb, c2: Rgb, t: number): Rgb3 => [
	lerpChannel(c1[0]!, c2[0]!, t),
	lerpChannel(c1[1]!, c2[1]!, t),
	lerpChannel(c1[2]!, c2[2]!, t),
];

/** Linha com SGR truecolor a `a` do caminho entre `fundo` (0) e a cor dela (1): frente e fundo RGB misturados, e a frente
 * padrão tingida a partir de `texto`. Fundo padrão fica (é o do terminal). Cores de 256 não mudam. */
export function esmaecer(linha: string, a: number, fundo: Rgb, texto: Rgb): string {
	if (a >= 1) return linha;
	const pad = `\x1b[38;2;${lerpRgb(fundo, texto, a).join(";")}m`;
	const fora = linha.replace(/\x1b\[([0-9;]*)m/g, (_m, ps: string) => {
		const p = ps === "" ? [0] : ps.split(";").map(Number),
			out: string[] = [];
		let volta = false;
		for (let i = 0; i < p.length; i++) {
			if ((p[i] === 38 || p[i] === 48) && p[i + 1] === 2 && i + 4 < p.length) {
				out.push(`${p[i]};2;${lerpRgb(fundo, [p[i + 2]!, p[i + 3]!, p[i + 4]!], a).join(";")}`);
				i += 4;
			} else {
				if (p[i] === 0 || p[i] === 39) volta = true;
				out.push(String(p[i]));
			}
		}
		return `\x1b[${out.join(";")}m${volta ? pad : ""}`;
	});
	return pad + fora;
}

const relLum = (c: Rgb): number =>
	0.2126 * (c[0]! / 255) ** 2.2 + 0.7152 * (c[1]! / 255) ** 2.2 + 0.0722 * (c[2]! / 255) ** 2.2;

const lin = (v: number): number => {
	const c = v / 255;
	return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const lumWcag = (c: Rgb): number => 0.2126 * lin(c[0]!) + 0.7152 * lin(c[1]!) + 0.0722 * lin(c[2]!);
/** Razão de contraste WCAG 2.x entre duas cores. */
export const contraste = (a: Rgb, b: Rgb): number =>
	(Math.max(lumWcag(a), lumWcag(b)) + 0.05) / (Math.min(lumWcag(a), lumWcag(b)) + 0.05);

// Oklab (Björn Ottosson, https://bottosson.github.io/posts/oklab/): clarear em L mantém matiz e croma do token.
const toOk = (c: Rgb): Rgb3 => {
	const [r, g, b] = [lin(c[0]!), lin(c[1]!), lin(c[2]!)];
	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
	return [
		0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
		1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
		0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
	];
};
const fromOk = ([L, a, b]: Rgb3): Rgb3 => {
	const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
	const srgb = (v: number): number => {
		const x = Math.max(0, Math.min(1, v));
		return Math.round(255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055));
	};
	return [
		srgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
		srgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
		srgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
	];
};

const MISTURA = 0.88; // quanto do pico entra no centro da varredura
/**
 * Pico de brilho (P04): o próprio token mais claro em OKLCH, recuando até a letra do centro manter 3:1 contra o fundo.
 * Antes o pico era escolhido pela luminância do texto e caía na cor do fundo (1,0:1 a 1,3:1 nos dois temas).
 * Sem `fundo`, supõe o pior caso do lado oposto do texto (preto para texto claro, branco para texto escuro).
 */
export const highlightPeak = (base: Rgb, fundo?: Rgb): Rgb3 => {
	const bg = fundo ?? (lumWcag(base) > 0.18 ? [0, 0, 0] : [255, 255, 255]);
	const ok = toOk(base);
	const dir = lumWcag(bg) > 0.5 ? -1 : 1;
	for (let d = 0.16; d > 0.01; d -= 0.02) {
		const p = fromOk([Math.max(0, Math.min(1, ok[0] + dir * d)), ok[1], ok[2]]);
		if (contraste(lerpRgb(base, p, MISTURA), bg) >= 4.5) return p;
	}
	return [base[0]!, base[1]!, base[2]!];
};

const easeOut = (t: number): number => 1 - (1 - Math.max(0, Math.min(1, t))) ** 3;
const easeInOut = (t: number): number => {
	const x = Math.max(0, Math.min(1, t));
	return x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2;
};

// ── efeitos ──────────────────────────────────────────────────────────────────
export const SHIMMER_VARRE_MS = 900;
export const SHIMMER_DESCANSO_MS = 500;
/** Shimmer (P04): uma onda gaussiana cruza a palavra em 900 ms com aceleração e freio e descansa 500 ms na cor do token. */
export function shimmerText(
	word: string,
	baseRgb: Rgb | undefined,
	nowMs: number,
	fallback: () => string,
	env: Env = process.env,
	fundo?: Rgb,
): string {
	if (!baseRgb || !word || !anima(env)) return fallback();
	const fase = nowMs % (SHIMMER_VARRE_MS + SHIMMER_DESCANSO_MS);
	if (fase >= SHIMMER_VARRE_MS) return fallback();
	const chars = [...word];
	const sweep = easeInOut(fase / SHIMMER_VARRE_MS) * (chars.length + 5) - 2.5;
	const peak = highlightPeak(baseRgb, fundo);
	let out = "";
	for (let i = 0; i < chars.length; i++) {
		const d = Math.abs(i - sweep);
		const [r, g, b] = lerpRgb(baseRgb, peak, Math.exp(-(d * d) / 2.2) * MISTURA);
		out += `\x1b[38;2;${r};${g};${b}m${chars[i]}`;
	}
	return `${out}\x1b[39m`;
}

/** Assentamento ao concluir (240 ms, saída quadrática): o estado chega mais claro e assenta na cor do token. */
export const SETTLE_DURATION_MS = 240;
export function settleFlashText(
	word: string,
	okRgb: Rgb | undefined,
	finishedPerfMs: number | undefined,
	nowPerfMs: number,
	fallback: () => string,
	env: Env = process.env,
	fundo?: Rgb,
): string {
	if (!okRgb || finishedPerfMs === undefined || !anima(env)) return fallback();
	const age = nowPerfMs - finishedPerfMs;
	if (age < 0 || age >= SETTLE_DURATION_MS) return fallback();
	const glow = (1 - age / SETTLE_DURATION_MS) ** 2;
	if (glow < 0.04) return fallback();
	const [r, g, b] = lerpRgb(okRgb, highlightPeak(okRgb, fundo), glow * 0.78);
	return `\x1b[38;2;${r};${g};${b}m${word}\x1b[39m`;
}

export const BARRA_AVANCO_MS = 200;
/** Fração mostrada `idadeMs` depois de a barra ir de `de` para `para` (P08): 200 ms com saída suave; sem animação, já no fim. */
export const fracaoAnimada = (de: number, para: number, idadeMs: number | undefined, env: Env = process.env): number =>
	idadeMs === undefined || idadeMs >= BARRA_AVANCO_MS || !anima(env)
		? para
		: de + (para - de) * easeOut(idadeMs / BARRA_AVANCO_MS);

const OITAVOS = " ▏▎▍▌▋▊▉";
/**
 * Barra de progresso em oitavos de bloco (P08): 8 passos por célula. Com `trilho` (truecolor) o resto é fundo;
 * sem ele, `╌`. `ascii` volta a `#` e `-`, um passo por célula.
 */
export function barraOitavos(
	frac: number,
	cells: number,
	o: { ok: (s: string) => string; resto: (s: string) => string; trilho?: Rgb; ascii?: boolean },
): string {
	const f = Math.max(0, Math.min(1, Number.isFinite(frac) ? frac : 0));
	if (o.ascii) {
		const n = Math.round(f * cells);
		return (n ? o.ok("#".repeat(n)) : "") + (n < cells ? o.resto("-".repeat(cells - n)) : "");
	}
	const oit = Math.round(f * cells * 8);
	const cheias = Math.floor(oit / 8);
	const parte = oit % 8;
	const blocos = "█".repeat(cheias) + (parte ? OITAVOS[parte] : "");
	const sobra = cells - cheias - (parte ? 1 : 0);
	if (!o.trilho) return (blocos ? o.ok(blocos) : "") + (sobra ? o.resto("╌".repeat(sobra)) : "");
	const open = `\x1b[48;2;${o.trilho[0]};${o.trilho[1]};${o.trilho[2]}m`;
	const cor = (blocos ? o.ok(blocos) : "").replace(/\x1b\[(?:0|49)?m/g, (m) => m + open);
	return `${open}${cor}${" ".repeat(sobra)}\x1b[49m`;
}

/** Fundo um tom abaixo do fundo da caixa: pílulas (` alt+o abre `, ` 01:29 `) e trilho da barra. */
export const tomAbaixo = (boxBgRgb: Rgb): Rgb3 =>
	relLum(boxBgRgb) < 0.25 ? lerpRgb(boxBgRgb, [10, 11, 18], 0.36) : lerpRgb(boxBgRgb, [0, 0, 0], 0.08);

/** Pílula discreta com fundo derivado do fundo da caixa. */
export function pillChip(inner: string, boxBgRgb: Rgb | undefined): string {
	if (!inner) return "";
	if (!boxBgRgb) return inner;
	const [r, g, b] = tomAbaixo(boxBgRgb);
	const open = `\x1b[48;2;${r};${g};${b}m`;
	const body = inner.replace(/\x1b\[(?:0|49)?m/g, (m) => m + open);
	return `${open} ${body} \x1b[49m`;
}

/** Respiração (spinner braille só na caixa de digitação): o texto de quem aguarda oscila entre dim e `token`
 * (ciclo de 1600 ms). Sem movimento, sem cor ou sem foco, fica em `token`. */
export function respira(
	t: { fg: (c: string, s: string) => string; getFgAnsi?: (c: string) => string },
	now: number,
	s: string,
	token = "syntaxType",
	env: Env = process.env,
): string {
	const d = safeAnsi(() => t.getFgAnsi?.("dim")),
		c = safeAnsi(() => t.getFgAnsi?.(token));
	if (!d || !c || !anima(env)) return t.fg(token, s);
	return `\x1b[38;2;${lerpRgb(d, c, 0.5 - 0.5 * Math.cos((now / 1600) * 2 * Math.PI)).join(";")}m${s}\x1b[39m`;
}
