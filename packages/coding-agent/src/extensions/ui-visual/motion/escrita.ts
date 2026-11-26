/**
 * Escrita da resposta e do raciocínio (escolhas, laboratórios /escrita e /raciocinio):
 * - Ritmo suavizado: as rajadas do modelo viram um fluxo constante (CPS letras por segundo), nunca mais de ATRASO_MAX_MS atrás.
 * - Tinta secando (animação 6), refinada em "Tinta longa" (/refino escrita 1): cada letra nasce apagada e
 *   ganha a cor em TINTA_MS com curva suave de entrada e saída (antes 180 ms, saída cúbica). Também vale no comando do Run chegando.
 * - Raciocínio recolhido (variante 2, "Brilho no rótulo"): enquanto pensa, `pensando…` com o brilho da espera, tempo e
 *   palavras; ao terminar, `raciocinou 7 s · 56 palavras · <tecla> abre`.
 * O nycode 1.5.2 não tem gancho para isso: envolve AssistantMessageComponent.prototype.updateContent e render (como
 * code-blocks faz com o Markdown); qualquer erro cai no componente nativo. Só anima em `normal`, com cor e com foco.
 */
import { icon, iconGap } from "../icons.ts";
import { anima, assinarQuadro, lerpRgb, shimmerText } from "./motion.ts";

// ~15 % mais rápido: antes CPS 310 e TINTA_MS 320. Sem cursor na resposta e no raciocínio; barraAlfa segue no comando do Bash chegando (shell.ts).
export const CPS = 360;
export const ATRASO_MAX_MS = 250;
export const TINTA_MS = 270;
/** Texto longo: o updateContent nativo refaz o lexer do Markdown da mensagem inteira (O(n) por quadro, O(n²) no stream). */
export const LONGO_CHARS = 4000;
export const PASSO_LONGO_MS = 100;

type Rgb = readonly [number, number, number];
type Bloco = { type: string; text?: string; thinking?: string };
type Msg = { content: Bloco[] };
type Marco = { t: number; n: number }; // em `t` havia `n` letras (sem espaços) à mostra
export type Estado = {
	real?: Msg;
	idx: number;
	visto: number;
	t: number;
	tinta: number;
	marcos: Marco[];
	alvo?: Rgb;
	pensa: Map<number, { t0: number; t1?: number }>;
	vivo: boolean;
	falta: boolean;
	mostra?: Msg;
	ult?: number;
};
export type Cores = { texto?: Rgb; pensa?: Rgb; fundo?: Rgb; destaque?: Rgb };
export const novoEstado = (): Estado => ({
	idx: -1,
	visto: 0,
	t: 0,
	tinta: 0,
	marcos: [],
	pensa: new Map(),
	vivo: false,
	falta: false,
});

const corpo = (b: Bloco): string | undefined =>
	b.type === "text" ? b.text : b.type === "thinking" ? b.thinking : undefined;
const letras = (s: string): number => s.replace(/\s+/g, "").length;
/** Quanto da cor uma letra com `idadeMs` de vida já tem (0 apagada, 1 seca): entrada e saída cúbicas em TINTA_MS. */
export const tintaAlfa = (idadeMs: number): number => {
	const x = Math.min(1, Math.max(0, idadeMs / TINTA_MS));
	return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
};

/** Ritmo suavizado: devolve a mensagem com o último bloco (texto ou raciocínio ainda chegando) cortado no que já "foi escrito". */
export function suavizar(e: Estado, msg: Msg, now: number): { msg: Msg; falta: boolean } {
	const i = msg.content.length - 1;
	const s = i >= 0 ? corpo(msg.content[i]!) : undefined;
	if (s === undefined) {
		e.idx = -1;
		e.marcos = [];
		return { msg, falta: false };
	}
	if (i !== e.idx) Object.assign(e, { idx: i, visto: 0, t: now, tinta: 0, marcos: [{ t: now - TINTA_MS, n: 0 }] });
	const antes = Math.floor(e.visto);
	const ritmo = Math.max(CPS, (s.length - e.visto) / (ATRASO_MAX_MS / 1000));
	e.visto = Math.min(s.length, e.visto + (ritmo * Math.max(0, now - e.t)) / 1000);
	e.t = now;
	let n = Math.floor(e.visto);
	if (n > 0 && n < s.length && s.charCodeAt(n - 1) >= 0xd800 && s.charCodeAt(n - 1) <= 0xdbff) n++; // não corta um par substituto
	if (n > antes) {
		e.tinta += letras(s.slice(antes, n));
		e.marcos.push({ t: now, n: e.tinta });
	}
	// Fica um marco já seco como base; os demais ainda estão secando.
	while (e.marcos.length > 1 && now - e.marcos[1]!.t >= TINTA_MS) e.marcos.shift();
	if (n >= s.length) return { msg, falta: false };
	const b = msg.content[i]!;
	return {
		msg: {
			...msg,
			content: [
				...msg.content.slice(0, i),
				b.type === "text" ? { ...b, text: s.slice(0, n) } : { ...b, thinking: s.slice(0, n) },
			],
		},
		falta: true,
	};
}

/** Brilho do cursor do comando chegando (shell.ts) (0..1): aceso enquanto chegam letras; parada há mais de PAUSA_MS, respira entre 0,4 e 1. */
export const PAUSA_MS = 160;
export const barraAlfa = (desdeUltimaMs: number, now: number): number =>
	desdeUltimaMs < PAUSA_MS ? 1 : 0.4 + 0.3 * (1 + Math.cos(now / 240));
const TOKEN = /\x1b\[([0-9;]*)m|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b\[[0-9;?]*[A-Za-z]|[\s\S]/gu;
/** Tinta secando: recolore as últimas letras (as que ainda não secaram) das linhas já desenhadas; o resto fica intacto. */
export function tinta(lines: string[], e: Estado, now: number, c: Cores): string[] {
	if (!c.fundo || e.marcos.length < 2) return lines;
	// idades[m]: idade da m-ésima letra contando do fim.
	const idades: number[] = [];
	for (let k = e.marcos.length - 1; k >= 1; k--)
		for (let q = e.marcos[k]!.n - e.marcos[k - 1]!.n; q > 0; q--) idades.push(now - e.marcos[k]!.t);
	if (!idades.length) return lines;
	const out = lines.slice();
	let m = 0;
	for (let li = out.length - 1; li >= 0 && m < idades.length; li--) {
		// Para frente: guarda a cor de frente em vigor em cada letra (alvo do degradê).
		const itens: Array<{ s: string; letra: boolean; fg?: Rgb }> = [];
		let fg: Rgb | undefined;
		for (const t of out[li]!.matchAll(TOKEN)) {
			if (t[1] !== undefined) {
				const p = t[1].split(";").map(Number);
				const at = p.indexOf(38);
				if (at >= 0 && p[at + 1] === 2 && p.length >= at + 5) fg = [p[at + 2]!, p[at + 3]!, p[at + 4]!];
				else if (t[1] === "" || p.includes(0) || p.includes(39)) fg = undefined;
			}
			itens.push({ s: t[0], letra: t[0].length <= 2 && !t[0].startsWith("\x1b") && t[0].trim() !== "", fg });
		}
		let ultima = -1;
		for (let k = itens.length - 1; k >= 0 && m < idades.length; k--) {
			const it = itens[k]!;
			if (!it.letra) continue;
			const p = tintaAlfa(idades[m++]!);
			if (p >= 1) continue;
			const alvo = it.fg ?? e.alvo ?? c.texto;
			if (!alvo) continue;
			it.s = `\x1b[38;2;${lerpRgb(c.fundo, alvo, p).join(";")}m${it.s}`;
			if (ultima < 0) ultima = k;
		}
		if (ultima >= 0) {
			itens[ultima]!.s += "\x1b[39m";
			out[li] = itens.map((it) => it.s).join("");
		}
	}
	return out;
}

const dur = (ms: number): string => {
	const s = Math.max(0, Math.round(ms / 1000));
	return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s`;
};
const palavras = (s: string): number => (s.trim() ? s.trim().split(/\s+/).length : 0);
type Tema = { fg: (c: string, t: string) => string; italic: (t: string) => string };
/** Rótulo do raciocínio recolhido. `ativo`: o modelo ainda está pensando neste trecho. */
export function rotulo(
	tema: Tema,
	o: { ativo: boolean; ms?: number; palavras: number; tecla: string; now: number; cor?: Rgb },
): string {
	const n = `${o.palavras} ${o.palavras === 1 ? "palavra" : "palavras"}`;
	const cabeca = tema.fg("thinkingText", `${icon("think")}${iconGap()}`);
	const abre = o.tecla ? ` · ${o.tecla} abre` : " · clique abre";
	if (o.ativo) {
		const plano = () => tema.fg("thinkingText", "pensando…");
		return (
			cabeca +
			tema.italic(shimmerText("pensando…", o.cor as never, o.now, plano)) +
			tema.fg("dim", `${o.ms === undefined ? "" : ` · ${dur(o.ms)}`} · ${n}${abre}`)
		);
	}
	return (
		cabeca +
		tema.italic(tema.fg("muted", o.ms === undefined ? "raciocínio" : `raciocinou ${dur(o.ms)}`)) +
		tema.fg("dim", ` · ${n}${abre}`)
	);
}

/** Trechos de raciocínio com conteúdo, na ordem em que o componente cria as regiões clicáveis. */
export function trechos(msg: Msg): Array<{ texto: string; ultimo: boolean }> {
	const out: Array<{ texto: string; ultimo: boolean }> = [];
	for (let i = 0; i < msg.content.length; i++) {
		if (msg.content[i]!.type !== "thinking") continue;
		const partes: string[] = [];
		for (; i < msg.content.length && msg.content[i]!.type === "thinking"; i++)
			if (msg.content[i]!.thinking?.trim()) partes.push(msg.content[i]!.thinking!.trim());
		if (partes.length) out.push({ texto: partes.join("\n\n"), ultimo: i === msg.content.length });
		i--;
	}
	return out;
}

type Comp = {
	lastMessage?: Msg;
	isStreaming?: boolean;
	hideThinkingBlock?: boolean;
	contentContainer?: { children?: unknown[] };
	updateContent: (m: Msg, s?: boolean) => void;
	render: (w: number) => string[];
};
export type Deps = {
	Assistant: { prototype: Comp };
	MouseRegion: new (...a: never[]) => object;
	Text: new (...a: never[]) => object;
	tema: () => (Tema & { getFgAnsi?: (c: string) => string; getBgAnsi?: (c: string) => string }) | undefined;
	cores: () => Cores;
	tecla: () => string;
	redesenha: () => void;
	agora?: () => number;
};
const MARCA = Symbol.for("nycode.escrita");

/** Envolve o componente da mensagem do assistente. Idempotente: no /reload só troca as dependências. */
export function instalarEscrita(d: Deps): void {
	const proto = d.Assistant.prototype as Comp & { [MARCA]?: { d: Deps } };
	if (proto[MARCA]) {
		proto[MARCA].d = d;
		return;
	}
	const ref = { d };
	proto[MARCA] = ref;
	const estados = new WeakMap<object, Estado>();
	const agora = () => ref.d.agora?.() ?? performance.now();
	let ativo: Comp | undefined,
		assinado = false;
	const update = proto.updateContent,
		render = proto.render;

	const rotulos = (c: Comp, e: Estado, msg: Msg, streaming: boolean, now: number): void => {
		const tema = ref.d.tema();
		const regioes = (c.contentContainer?.children ?? []).filter((x) => x instanceof ref.d.MouseRegion) as Array<{
			child?: { setText?: (t: string) => void };
		}>;
		const runs = trechos(msg);
		e.vivo = false;
		if (!tema || regioes.length !== runs.length) return;
		runs.forEach((r, k) => {
			const vivo = streaming && r.ultimo;
			let tp = e.pensa.get(k);
			if (vivo && !tp) {
				tp = { t0: now };
				e.pensa.set(k, tp);
			}
			if (!vivo && tp && tp.t1 === undefined) tp.t1 = now;
			const alvo = regioes[k]!.child as { setText?: (texto: string) => void };
			if (!(alvo instanceof ref.d.Text) || !alvo.setText) return; // aberto: o texto do raciocínio aparece no lugar do rótulo
			if (vivo) e.vivo = true;
			alvo.setText(
				rotulo(tema, {
					ativo: vivo,
					ms: tp ? (tp.t1 ?? now) - tp.t0 : undefined,
					palavras: palavras(r.texto),
					tecla: ref.d.tecla(),
					now,
					cor: ref.d.cores().pensa,
				}),
			);
		});
	};

	// Quadro do relógio contínuo (~30 fps, mais lento sob carga): só refaz o conteúdo quando há texto atrasado;
	// rótulo vivo e tinta secando pedem apenas um redesenho.
	const passo = (): boolean => {
		const c = ativo;
		if (!c?.isStreaming) {
			ativo = undefined;
			return false;
		}
		const e = estados.get(c);
		if (!e?.real) return true;
		try {
			if (e.falta) {
				const b = e.real.content.at(-1);
				const longo = (b ? (corpo(b)?.length ?? 0) : 0) >= LONGO_CHARS;
				if (!longo || agora() - (e.ult ?? -Infinity) >= PASSO_LONGO_MS) c.updateContent(e.real, true); // senão só redesenha; o próximo quadro adianta o corte
			} else if (e.vivo && e.mostra) rotulos(c, e, e.mostra, true, agora());
			else {
				while (e.marcos.length > 1 && agora() - e.marcos[1]!.t >= TINTA_MS) e.marcos.shift(); // tinta seca: como em suavizar
				if (e.marcos.length < 2) return true; // nada mudou: sem quadro
			}
		} catch {
			/* o próximo delta redesenha */
		}
		ref.d.redesenha();
		return true;
	};

	proto.updateContent = function (this: Comp, message: Msg, isStreaming = this.isStreaming) {
		let feito = false;
		try {
			let e = estados.get(this);
			if (!e) {
				e = novoEstado();
				estados.set(this, e);
			}
			const now = agora();
			e.real = message;
			let mostra = message;
			e.falta = false;
			// Raciocínio recolhido não tem texto na tela: passa direto, o rótulo aparece no primeiro delta.
			const recolhido = this.hideThinkingBlock === true && message.content.at(-1)?.type === "thinking";
			if (isStreaming && anima() && !recolhido) ({ msg: mostra, falta: e.falta } = suavizar(e, message, now));
			else Object.assign(e, { idx: -1, marcos: [] });
			e.mostra = mostra;
			update.call(this, mostra, isStreaming);
			feito = true;
			e.ult = now;
			this.lastMessage = message; // o invalidate() nativo redesenha a mensagem inteira e volta por aqui
			const b = e.idx >= 0 ? message.content[e.idx] : undefined;
			const c = ref.d.cores();
			e.alvo = b?.type === "thinking" ? c.pensa : c.texto;
			rotulos(this, e, mostra, isStreaming === true, now);
			if (isStreaming) {
				ativo = this;
				if (!assinado && anima()) {
					assinado = true;
					assinarQuadro("ui-visual-escrita", () => {
						assinado = passo();
						return assinado;
					});
				}
			} else if (ativo === this) ativo = undefined;
		} catch {
			if (!feito) update.call(this, message, isStreaming);
		}
	};
	proto.render = function (this: Comp, w: number) {
		const lines = render.call(this, w);
		try {
			const e = estados.get(this);
			if (!e || !this.isStreaming || !anima()) return lines;
			const now = agora(),
				c = ref.d.cores();
			const tinto = e.marcos.length > 1 ? tinta(lines, e, now, c) : lines;
			return tinto;
		} catch {
			/* linhas nativas */
		}
		return lines;
	};
}
