// Funções puras do chat-margin (sem import do core, para testar sem a TUI).

/** Abaixo disso a margem come espaço demais: o bloco volta a ocupar a largura toda. */
export const MIN_INNER = 20;

// Marcas OSC no começo da linha (zona OSC 133 da mensagem do usuário) ficam na coluna 0: o sticky-prompt e o nycode as procuram ali.
const LEAD_OSC = /^(?:\x1b\][^\x07\x1b]*(?:\x07|\x1b\\))*/;

/** Largura interna do bloco com margem `p` de cada lado; estreito demais ou p=0: a largura original. */
export function innerWidth(width: number, p: number): number {
	return p > 0 && width - 2 * p >= MIN_INNER ? width - 2 * p : width;
}

/** Põe `p` espaços sem fundo antes e depois de cada linha. Linhas de imagem (kitty/iTerm) passam intactas. */
export function inset(lines: readonly string[], p: number, skip: (line: string) => boolean = () => false): string[] {
	if (p <= 0) return [...lines];
	const m = " ".repeat(p);
	return lines.map((l) => {
		if (skip(l)) return l;
		const lead = LEAD_OSC.exec(l)?.[0] ?? "";
		return lead + m + l.slice(lead.length) + m;
	});
}

/** Recuo interno padrão dos blocos do chat (simétrico em 2026-11-18): padding + RECUO colunas dos dois lados. */
export const RECUO = 2;
const LEAD_SGR = /^(?:\x1b\[[0-9;:]*m)*/;
const TAIL_END = /(?:\x1b\[(?:0|49)?m|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\))*$/;

/** Põe `n` espaços com o fundo do bloco nos dois lados (após OSC/SGR inicial e antes do fecho final). Linhas vazias e de imagem passam. */
export function lead(lines: readonly string[], n: number, skip: (line: string) => boolean = () => false): string[] {
	if (n <= 0) return [...lines];
	const m = " ".repeat(n);
	return lines.map((l) => {
		if (!l || skip(l)) return l;
		const osc = LEAD_OSC.exec(l)?.[0] ?? "";
		const sgr = LEAD_SGR.exec(l.slice(osc.length))?.[0] ?? "";
		const i = osc.length + sgr.length;
		const tail = TAIL_END.exec(l)?.[0] ?? "";
		const j = Math.max(i, l.length - tail.length);
		return l.slice(0, i) + m + l.slice(i, j) + m + l.slice(j);
	});
}

/** Margem do componente: o nycode guarda `outputPad` (tools, custom, bash) ou o passa como `paddingX` (Box, Markdown do usuário). */
export function padOf(c: { outputPad?: unknown; paddingX?: unknown }): number {
	const v = typeof c.outputPad === "number" ? c.outputPad : c.paddingX;
	return typeof v === "number" && v > 0 ? Math.floor(v) : 0;
}

const MARK = Symbol.for("nycode.chat-margin.child");

export interface MouseLike {
	x: number;
	width: number;
}

/** O que o embrulho por instância e o hook de container tocam num componente da TUI. */
export interface Embrulhavel {
	render?: (width: number) => string[];
	handleMouse?: (event: MouseLike) => unknown;
	children?: unknown[];
	[MARK]?: boolean;
}

/** Evento do mouse em coordenadas do bloco interno; clique na margem: undefined (não é do bloco). */
export function insetMouse<E extends MouseLike>(e: E, p: number): E | undefined | null {
	const w = innerWidth(e.width, p);
	if (w === e.width) return null; // sem margem: evento original
	if (e.x < p || e.x >= e.width - p) return undefined;
	return { ...e, x: e.x - p, width: w };
}

/** O chat inteiro é redesenhado a cada quadro de animação: devolve a saída anterior de `fn` enquanto as linhas de entrada
 * e a chave forem as mesmas (comparação por linha, barata quando o bloco não mudou). Uma memória por componente. */
const MEMO = new WeakMap<object, { key: string; src: readonly string[]; out: string[] }>();
export function mesmaSaida(
	owner: object,
	key: string,
	src: readonly string[],
	fn: (src: readonly string[]) => string[],
): string[] {
	const m = MEMO.get(owner);
	if (m && m.key === key && m.src.length === src.length && src.every((l, i) => l === m.src[i])) return m.out;
	const out = fn(src);
	MEMO.set(owner, { key, src, out });
	return out;
}

/** Embrulho por instância (marcado, idempotente): renderiza na largura interna, margem sem fundo, mouse deslocado. */
export function wrapInstance(
	c: Embrulhavel | undefined,
	pad: () => number,
	skip: (line: string) => boolean = () => false,
): void {
	if (!c || c[MARK] || typeof c.render !== "function") return;
	const r = c.render,
		m = c.handleMouse;
	c.render = (width: number) => {
		const p = pad(),
			w = innerWidth(width, p);
		return w === width ? r.call(c, width) : mesmaSaida(c, `${width}|${p}`, r.call(c, w), (ls) => inset(ls, p, skip));
	};
	if (typeof m === "function") {
		c.handleMouse = (event: MouseLike) => {
			const e = insetMouse(event, pad());
			return e === null ? m.call(c, event) : e && m.call(c, e);
		};
	}
	c[MARK] = true;
}

/** Marca o render do hook: `pre` passa os filhos novos por onChild; `prev` é o render que ele encadeia (a compactação das tools usa os dois). */
export const HOOK = Symbol.for("nycode.chat-margin.hook");
export type HookInfo = { pre: (self: ContainerLike) => void; prev: unknown };
/** Container da TUI: filhos e render encadeável. */
export type ContainerLike = { children: unknown[]; render: (this: ContainerLike, width: number) => string[] };

/** Antes de cada render do container, passa os filhos ainda não vistos por `onChild` (uma vez por filho). Encadeia o render
 * que já existe (de outra extensão ou do protótipo). Devolve a função que desfaz. */
export function hookContainer(c: ContainerLike, onChild: (child: unknown) => void): () => void {
	const prev = c.render,
		own = Object.hasOwn(c, "render");
	const seen = new WeakSet<object>();
	const pre = (self: ContainerLike) => {
		(prev as { [HOOK]?: HookInfo })[HOOK]?.pre(self); // hook anterior (recarga): também filtra
		for (const child of self.children) {
			if (child !== null && typeof child === "object") {
				if (seen.has(child)) continue;
				seen.add(child);
			}
			onChild(child);
		}
	};
	const fn: ContainerLike["render"] & { [HOOK]?: HookInfo } = function (this: ContainerLike, width: number) {
		pre(this);
		return prev.call(this, width);
	};
	fn[HOOK] = { pre, prev } satisfies HookInfo;
	c.render = fn;
	return () => {
		if (c.render !== fn) return; // outra extensão embrulhou por cima: não a desfaz
		if (own) c.render = prev;
		else Reflect.deleteProperty(c, "render");
	};
}
