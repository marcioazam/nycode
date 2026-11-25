// Diff do `edit` inline, estilo Xcode (docs/designs/onda7-tokens/exemplos/diff-exemplos.html#ex1): número, barra colorida no
// gutter, fundo suave na linha inteira, realce de sintaxe e fundo forte só nas palavras que mudaram.
// Puro: entra o diff no formato do nycode (`+12 texto`, `-12 texto`, ` 12 texto`, `     ...`) e saem linhas ANSI.
// Tema, realce, corte e medida entram por parâmetro, então nada aqui importa o nycode.

export type DiffTheme = {
	fg: (color: string, text: string) => string;
	bg?: (color: string, text: string) => string;
	bold: (text: string) => string;
	inverse?: (text: string) => string;
	getFgAnsi?: (color: string) => string;
	getBgAnsi?: (color: string) => string;
};
export type DiffOptions = {
	width: number;
	/** Corta em `w` colunas preservando o fundo ativo (fitLine de tools.ts). */
	fitLine: (text: string, w: number) => string;
	visibleWidth: (text: string) => number;
	/** Realça uma linha de código (ANSI); ausente ou com erro, o texto sai na cor do tema. */
	highlight?: (line: string) => string;
	/** Fundo (nome do tema) das linhas de contexto, número e ⋯: o da caixa que envolve o diff. Ausente: sem fundo. */
	base?: string;
};

type Kind = "add" | "del" | "ctx" | "sep" | "bad";
type Span = [number, number]; // [início, fim) em caracteres visíveis (code points)
type Entry = { kind: Kind; num: string; text: string; spans?: Span[] };

const PARSE = /^([+-\s])(\s*\d*)\s(.*)$/; // mesmo formato do nativo (parseDiffLine)
const LCS_CAP = 40_000; // n*m de tokens; acima disso a ênfase some (custo O(n*m))
const MIX = 0.3;
/** Fração da cor do diff misturada ao fundo base no fundo da linha (D4; escolhida pelo teste de contraste dos temas). */
export const TINT = 0.14;
const NUM_MIN = 1;

const detab = (t: string): string => t.replace(/\t/g, "   ");

const parse = (line: string): Entry => {
	const m = PARSE.exec(line);
	if (!m) return { kind: "bad", num: "", text: detab(line) };
	const num = m[2].trim();
	if (m[1] === " " && num === "" && m[3].trim() === "...") return { kind: "sep", num: "", text: "" };
	return { kind: m[1] === "+" ? "add" : m[1] === "-" ? "del" : "ctx", num, text: detab(m[3]) };
};

/** Código ANSI que abre o fundo `name` no tema ('' sem cor ou se o tema falhar). */
export const bgOpen = (theme: Pick<DiffTheme, "bg">, name: string): string => {
	try {
		const s = theme.bg?.(name, "\0") ?? "";
		const i = s.indexOf("\0");
		return i > 0 ? s.slice(0, i) : "";
	} catch {
		return "";
	}
};
/** Reabre o fundo depois de um reset total (0m) ou de fundo (49m) vindo do realce de sintaxe. */
export const keepBg = (row: string, open: string): string =>
	open ? row.replace(/\x1b\[(?:0|49)?m/g, (m) => m + open) : row;

// ── ênfase de palavra ────────────────────────────────────────────────────────

const tokens = (s: string): string[] => s.match(/\w+|\s+|[^\w\s]/gu) ?? [];

/** Tokens mudados de cada lado (LCS); null acima do teto. Empate avança no lado novo, o que deixa `console.log` → `log.info` inteiros mudados. */
const changedTokens = (a: string[], b: string[]): [boolean[], boolean[]] | null => {
	const n = a.length;
	const m = b.length;
	if (n * m > LCS_CAP) return null;
	const w = m + 1;
	const dp = new Uint32Array((n + 1) * w);
	for (let i = n - 1; i >= 0; i--)
		for (let j = m - 1; j >= 0; j--)
			dp[i * w + j] = a[i] === b[j] ? dp[(i + 1) * w + j + 1] + 1 : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
	const ca = a.map(() => true);
	const cb = b.map(() => true);
	let i = 0;
	let j = 0;
	while (i < n && j < m) {
		if (a[i] === b[j]) {
			ca[i++] = cb[j++] = false;
		} else if (dp[(i + 1) * w + j] > dp[i * w + j + 1]) i++;
		else j++;
	}
	return [ca, cb];
};

/** Intervalos de caracteres visíveis; une trechos separados por um único token sem letra/número (`.`, `(`, espaço). */
const toSpans = (toks: string[], changed: boolean[]): Span[] => {
	const spans: Span[] = [];
	let pos = 0;
	let gapStart = -1; // posição onde começou o intervalo não mudado depois do último trecho
	let gapTokens = 0;
	let gapWord = false;
	toks.forEach((t, k) => {
		const len = [...t].length;
		if (changed[k]) {
			const last = spans[spans.length - 1];
			if (last && (last[1] === pos || (gapStart >= 0 && gapTokens === 1 && !gapWord))) last[1] = pos + len;
			else spans.push([pos, pos + len]);
			gapStart = -1;
		} else if (spans.length) {
			if (gapStart < 0) {
				gapStart = pos;
				gapTokens = 0;
				gapWord = false;
			}
			gapTokens++;
			if (/\w/.test(t)) gapWord = true;
		}
		pos += len;
	});
	return spans;
};

const emphasize = (rem: Entry[], add: Entry[]): void => {
	if (rem.length !== add.length) return; // pares por índice só com N removidas e N adicionadas
	rem.forEach((r, k) => {
		const ta = tokens(r.text);
		const tb = tokens(add[k].text);
		const c = changedTokens(ta, tb);
		if (!c || (!c[0].includes(true) && !c[1].includes(true))) return;
		r.spans = toSpans(ta, c[0]);
		add[k].spans = toSpans(tb, c[1]);
	});
};

// ── mistura de cor ───────────────────────────────────────────────────────────

/** `ratio` da frente sobre o fundo, por canal, arredondado. */
export const mixRgb = (fg: number[], bg: number[], ratio: number): number[] =>
	fg.map((f, k) => Math.round(Math.round((bg[k] * (1 - ratio) + f * ratio) * 1e6) / 1e6)); // 1e6: absorve o ruído de ponto flutuante em x.5

const RGB_SGR = { 38: /38;2;(\d+);(\d+);(\d+)/, 48: /48;2;(\d+);(\d+);(\d+)/ } as const;

const rgbOf = (ansi: string, kind: 38 | 48): number[] | undefined => {
	const m = RGB_SGR[kind].exec(ansi);
	return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : undefined;
};

// ── caminhador sobre ANSI ────────────────────────────────────────────────────

const SGR = /\x1b\[[0-9;]*m/y;
const isFg = (code: string): boolean => /^\x1b\[(?:3[0-79]|9[0-7]|38;[0-9;]+)m$/.test(code);

/**
 * Percorre a linha ANSI contando caracteres visíveis; cada trecho de `spans` sai por `wrapSpan` sem cores de frente
 * internas e, ao fechar, volta a última cor de frente vista. `outside` pinta o texto fora dos trechos (linha sem realce).
 */
const walk = (s: string, spans: Span[], wrapSpan: (t: string) => string, outside?: (t: string) => string): string => {
	let out = "";
	let run = "";
	let buf = "";
	let idx = 0;
	let si = 0;
	let open = false;
	let lastFg = "";
	const flush = () => {
		if (run) out += outside ? outside(run) : run;
		run = "";
	};
	for (let p = 0; p < s.length; ) {
		if (s[p] === "\x1b") {
			SGR.lastIndex = p;
			const m = SGR.exec(s);
			if (m) {
				const code = m[0];
				p += code.length;
				const fgCode = isFg(code) || code === "\x1b[39m";
				if (fgCode) lastFg = code === "\x1b[39m" ? "" : code;
				if (!open) {
					flush();
					out += code;
				} else if (!fgCode) buf += code;
				continue;
			}
		}
		const cp = String.fromCodePoint(s.codePointAt(p) as number);
		p += cp.length;
		if (!open && si < spans.length && idx === spans[si][0]) {
			flush();
			open = true;
			buf = "";
		}
		if (open) buf += cp;
		else run += cp;
		idx++;
		if (open && idx === spans[si][1]) {
			out += wrapSpan(buf) + lastFg;
			open = false;
			si++;
		}
	}
	flush();
	if (open) out += wrapSpan(buf) + lastFg;
	return out;
};

// ── renderização ─────────────────────────────────────────────────────────────

/** Recuo do diff dentro da caixa do edit: números na coluna dos ícones das tools (padding interno padrão). */
export const RECUO = 2;

/** Parse, ênfase de palavra e numeração: só dependem do texto do diff, não da largura nem do tema. Últimos diffs em memória. */
const PREPARED = new Map<string, Entry[]>();
const PREPARED_MAX = 64;
const PREPARED_MAX_CHARS = 200_000;
export function prepareDiff(diff: string): Entry[] {
	const hit = PREPARED.get(diff);
	if (hit) return hit;
	const entries = diff.split("\n").map(parse);
	while (entries.length && entries[entries.length - 1].kind === "bad" && entries[entries.length - 1].text === "")
		entries.pop();
	for (let i = 0; i < entries.length; ) {
		if (entries[i].kind !== "del") {
			i++;
			continue;
		}
		let j = i;
		while (j < entries.length && entries[j].kind === "del") j++;
		let k = j;
		while (k < entries.length && entries[k].kind === "add") k++;
		emphasize(entries.slice(i, j), entries.slice(j, k));
		i = Math.max(k, i + 1);
	}

	// Contexto numerado pelo arquivo novo: antigo + (adicionadas − removidas) vistas antes, acumulado entre trechos.
	let shift = 0;
	for (const e of entries) {
		if (e.kind === "add") shift++;
		else if (e.kind === "del") shift--;
		else if (e.kind === "ctx" && /^\d+$/.test(e.num)) e.num = String(Number(e.num) + shift);
	}
	if (diff.length > PREPARED_MAX_CHARS) return entries; // diff enorme: não fica retido
	if (PREPARED.size >= PREPARED_MAX) PREPARED.delete(PREPARED.keys().next().value as string);
	PREPARED.set(diff, entries);
	return entries;
}

/** Realce por linha memoizado (o texto da linha e a gramática não mudam com a largura); `clear` quando o tema muda. */
export function memoLine(fn: (line: string) => string): { fn: (line: string) => string; clear: () => void } {
	const cache = new Map<string, string>();
	return {
		fn: (line) => {
			let r = cache.get(line);
			if (r === undefined) {
				r = fn(line);
				cache.set(line, r);
			}
			return r;
		},
		clear: () => cache.clear(),
	};
}

export function renderDiff(diff: string, theme: DiffTheme, o: DiffOptions): string[] {
	const entries = prepareDiff(diff);

	const mono = theme.fg("toolDiffAdded", "x") === "x";
	const dim = (t: string) => theme.fg("dim", t);
	const nw = entries.reduce((n, e) => Math.max(n, e.num.length), NUM_MIN);

	// Fundo da linha: cor do diff misturada ao fundo base. Sem truecolor parseável: undefined (fundo nomeado do tema).
	const tintRgb = (add: boolean): number[] | undefined => {
		try {
			const fgA = theme.getFgAnsi?.(add ? "toolDiffAdded" : "toolDiffRemoved");
			const bgA = theme.getBgAnsi?.(o.base ?? "customMessageBg");
			const fg = fgA === undefined ? undefined : rgbOf(fgA, 38);
			const bg = bgA === undefined ? undefined : rgbOf(bgA, 48);
			return fg && bg ? mixRgb(fg, bg, TINT) : undefined;
		} catch {
			return undefined;
		}
	};
	const rowTint = (add: boolean): string | undefined => {
		const t = tintRgb(add);
		return t && `\x1b[48;2;${t.join(";")}m`;
	};

	const highlighted = (text: string): string | undefined => {
		if (!o.highlight || mono) return undefined;
		try {
			return o.highlight(text);
		} catch {
			return undefined;
		}
	};

	const strongWrapper = (add: boolean): ((t: string) => string) => {
		const fgA = theme.getFgAnsi?.(add ? "toolDiffAdded" : "toolDiffRemoved");
		const fg = fgA === undefined ? undefined : rgbOf(fgA, 38);
		const tint = tintRgb(add);
		if (tint) {
			// D4: ênfase sobre o tint da linha e de volta a ele.
			const start = `\x1b[48;2;${mixRgb(fg as number[], tint, MIX).join(";")}m`;
			const back = rowTint(add) as string;
			return (t) => `${start}${theme.fg("text", t)}${back}`;
		}
		const bgName = add ? "toolSuccessBg" : "toolErrorBg";
		const bgA = theme.getBgAnsi?.(bgName);
		const bg = bgA === undefined ? undefined : rgbOf(bgA, 48);
		if (fg && bg && bgA !== undefined) {
			const start = `\x1b[48;2;${mixRgb(fg, bg, MIX).join(";")}m`;
			return (t) => `${start}${theme.fg("text", t)}${bgA}`;
		}
		return (t) => (theme.inverse ?? theme.bold)(theme.fg("text", t));
	};

	const changedContent = (e: Entry, add: boolean): string => {
		const hl = highlighted(e.text);
		if (mono) return e.text;
		if (!e.spans?.length) return hl ?? theme.fg("text", e.text);
		return walk(hl ?? e.text, e.spans, strongWrapper(add), hl === undefined ? (t) => theme.fg("text", t) : undefined);
	};

	const w = Math.max(1, o.width);
	const pad = w > 2 * RECUO ? RECUO : 0;
	const L = " ".repeat(pad);
	const cw = Math.max(1, w - pad);
	const baseOpen = !mono && o.base ? bgOpen(theme, o.base) : "";
	const neutral = (row: string): string =>
		baseOpen && theme.bg && o.base
			? theme.bg(o.base, keepBg(row, baseOpen) + " ".repeat(Math.max(0, w - o.visibleWidth(row))))
			: row;
	return entries.map((e): string => {
		if (e.kind === "sep") return neutral(o.fitLine(`${L}${" ".repeat(nw + 4)}${dim("⋯")}`, cw));
		if (e.kind === "bad") return neutral(o.fitLine(`${L}${" ".repeat(nw + 4)}${dim(e.text)}`, cw));
		if (e.kind === "ctx") {
			const content = highlighted(e.text) ?? theme.fg("toolDiffContext", e.text);
			return neutral(o.fitLine(`${L}${dim(e.num.padStart(nw))}    ${content}`, cw));
		}
		const add = e.kind === "add";
		const col = add ? "toolDiffAdded" : "toolDiffRemoved";
		const num = mono ? e.num.padStart(nw) : theme.fg(col, e.num.padStart(nw));
		const sign = mono ? (add ? "+" : "-") : theme.bold(theme.fg(col, add ? "+" : "−"));
		const row = o.fitLine(`${L}${num} ${sign}  ${changedContent(e, add)}`, cw);
		if (mono || !theme.bg) return row;
		const tint = rowTint(add);
		if (tint) return `${tint}${keepBg(row, tint)}${" ".repeat(Math.max(0, w - o.visibleWidth(row)))}\x1b[49m`;
		const bgName = add ? "toolSuccessBg" : "toolErrorBg";
		return theme.bg(bgName, keepBg(row, bgOpen(theme, bgName)) + " ".repeat(Math.max(0, w - o.visibleWidth(row))));
	});
}
