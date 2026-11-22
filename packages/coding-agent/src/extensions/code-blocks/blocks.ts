/**
 * Blocos de código sem cerca e sem borda: fundo neutro, rótulo do tipo na cor GitHub Linguist da linguagem
 * (contraste >= 4.5:1 garantido) e botão "⧉ copiar". Lógica pura; index.ts liga ao nycode.
 */

import { sanitizarExibicao } from "../ui/a11y.ts";
import { CATALOG } from "./languages.ts";

export type RGB = [number, number, number];

// Catálogo completo do github-linguist (cores, aliases e extensões); regenerar com scripts/harness/gen-code-blocks-languages.py.
// Sem cor no Linguist, mas são sessões de shell: herdam a cor do Shell.
const COLOR_OVERRIDES: Record<string, string> = { ShellSession: "#89e051" };
// Gramáticas do highlight.js que o Linguist não aponta (modos ace/codemirror diferentes).
const GRAMMAR_EXTRA: Record<string, string[]> = { Vue: ["xml"], Assembly: ["x86asm"] };

export interface Lang {
	name: string;
	color?: string;
	grammars: string[];
}

/** Cinza-azulado neutro para texto puro: distinto das linguagens, sem competir com elas. */
export const TEXT_COLOR = "#8b9bb4";

/** Cor pela etiqueta da cerca (`py`, `Bash`, `language-ts`, `js {1,3}`); o rótulo é a própria etiqueta, sem cor se desconhecida. */
export function resolveLang(tag: string | undefined): Lang {
	const t = (tag ?? "")
		.trim()
		.split(/[\s{]/)[0]
		.replace(/^language-/, "")
		.toLowerCase();
	if (!t || t === "text" || t === "txt" || t === "plain" || t === "plaintext" || t === "texto")
		return { name: "texto", color: TEXT_COLOR, grammars: [] };
	const i = CATALOG.tags[t];
	if (i === undefined) return { name: t, grammars: [t] };
	const [name, color, grammars] = CATALOG.langs[i];
	return {
		name: t,
		color: COLOR_OVERRIDES[name] ?? color ?? undefined,
		grammars: [t, ...grammars, ...(GRAMMAR_EXTRA[name] ?? [])],
	};
}

const SHELL_CMDS = new Set(
	(
		"cd ls ll la pwd git gh npm npx pnpm yarn bun bunx deno node pip pip3 pipx uv uvx poetry python python3 " +
		"cargo rustup go make cmake curl wget sudo apt apt-get dnf pacman yay brew snap flatpak docker podman kubectl helm terraform " +
		"ssh scp rsync tmux systemctl journalctl cat less head tail echo printf export source mkdir rmdir rm cp mv ln chmod chown touch " +
		"grep rg find fd sed awk xargs tar unzip zip jq code cursor nycode claude codex vim nvim nano kill pkill ps top htop which env " +
		"open xdg-open wl-copy xclip mise asdf nvm sh bash zsh fish"
	).split(" "),
);

/**
 * Linguagem provável de um bloco sem etiqueta, só pelo conteúdo (custo zero de tokens). Conservador: na dúvida, texto.
 * Devolve a etiqueta que o realce do nycode entende (`bash`, `python`, ...).
 */
export function detectLang(code: string): string | undefined {
	const s = code.trim();
	if (!s) return undefined;
	const lines = s
		.split("\n")
		.map((l) => l.trim())
		.filter(Boolean);
	const first = lines[0];
	if (/^#!.*\b(ba|z|fi)?sh\b/.test(first)) return "bash";
	if (/^#!.*python/.test(first)) return "python";
	if (/^[[{]/.test(s)) {
		try {
			JSON.parse(s);
			return "json";
		} catch {}
	}
	if (/^(diff --git|--- |\+\+\+ |@@ )/m.test(s) && lines.every((l) => /^([-+@ ]|diff |index )/.test(l) || l === ""))
		return "diff";
	if (/^<(!doctype|html|div|span|\?xml|svg|[a-z]+[ >])/i.test(s)) return /^<\?xml|^<svg/i.test(s) ? "xml" : "html";
	if (
		/^\s*(def |class \w.*:|from [\w.]+ import |import \w+$|if __name__ ==|print\()/m.test(s) &&
		!/[;{}]\s*$/m.test(s)
	)
		return "python";
	if (/\b(interface \w+|type \w+ =|: (string|number|boolean)\b|as const\b)/.test(s)) return "ts";
	if (/^(const|let|var|function|export|import .* from ['"])\b|=>|console\.log\(/m.test(s)) return "js";
	if (/^\s*(select|insert into|update \w+ set|delete from|create (table|index|view))\b/im.test(s)) return "sql";
	const shellish = lines.filter((l) => {
		const w = l.replace(/^\$\s+/, "").split(/\s+/)[0];
		return (
			/^\$\s/.test(l) ||
			l.startsWith("#") ||
			SHELL_CMDS.has(w) ||
			/^(\.\/|~\/|\/usr\/|\/bin\/)/.test(w) ||
			/^[A-Z_][A-Z0-9_]*=\S*(\s|$)/.test(l)
		);
	});
	if (shellish.length === lines.length && lines.length <= 30 && lines.some((l) => !l.startsWith("#"))) return "bash";
	if (lines.length >= 2 && lines.every((l) => /^(#|- |[\w"'.-]+:(\s|$))/.test(l))) return "yaml";
	return undefined;
}

export const hexToRgb = (hex: string): RGB => {
	const n = parseInt(hex.slice(1), 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export const mix = (a: RGB, b: RGB, t: number): RGB =>
	[0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as RGB;

function luminance([r, g, b]: RGB): number {
	const f = (c: number) => {
		c /= 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** Contraste WCAG 2.x. */
export function contrast(a: RGB, b: RGB): number {
	const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
	return (x + 0.05) / (y + 0.05);
}

export const isDark = (bg: RGB): boolean => luminance(bg) < 0.18;

/** Aproxima `fg` do branco (fundo escuro) ou do preto (fundo claro) até atingir `min`; mantém o matiz o quanto der. */
export function ensureContrast(fg: RGB, bg: RGB, min = 4.5): RGB {
	const target: RGB = isDark(bg) ? [255, 255, 255] : [0, 0, 0];
	for (let t = 0; t <= 1.0001; t += 0.05) {
		const c = mix(fg, target, t);
		if (contrast(c, bg) >= min) return c;
	}
	return target;
}

/** RGB de uma sequência de fundo truecolor (`\x1b[48;2;R;G;Bm`); 256 cores ou outra forma: undefined. */
export function parseBgAnsi(ansi: string | undefined): RGB | undefined {
	const m = ansi && /48;2;(\d+);(\d+);(\d+)m/.exec(ansi);
	return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : undefined;
}

const bgSeq = ([r, g, b]: RGB) => `\x1b[48;2;${r};${g};${b}m`;
const fgSeq = ([r, g, b]: RGB) => `\x1b[38;2;${r};${g};${b}m`;

export interface Palette {
	/** Fundo das linhas de código. */
	body: string;
	/** Fundo da linha do rótulo (um tom mais forte da mesma cor). */
	head: string;
	/** Cor do nome da linguagem. */
	label: string;
	/** Cor do botão de copiar. */
	button: string;
}

/**
 * Paleta de um bloco. `base` é a superfície neutra do tema (truecolor); sem ela usa as sequências do tema como estão.
 * Fundo neutro para todas as linguagens; só o rótulo leva a cor da linguagem.
 */
export function palette(
	langColor: string | undefined,
	base: RGB | undefined,
	fallback: { bg: string; label: string; button: string },
): Palette {
	if (!base) return { body: fallback.bg, head: fallback.bg, label: fallback.label, button: fallback.button };
	const dark = isDark(base);
	const accent = langColor ? hexToRgb(langColor) : undefined;
	const body = base;
	const head = mix(base, dark ? [255, 255, 255] : [0, 0, 0], dark ? 0.05 : 0.04);
	const label = ensureContrast(accent ?? (dark ? [200, 200, 210] : [60, 60, 70]), head);
	const button = ensureContrast(mix(head, dark ? [255, 255, 255] : [0, 0, 0], 0.45), head);
	return { body: bgSeq(body), head: bgSeq(head), label: fgSeq(label), button: fgSeq(button) };
}

/** Mantém o fundo depois de resets que o apagariam (`\x1b[0m`, `\x1b[m`, `\x1b[49m`). */
export const keepBg = (line: string, bg: string): string => line.replace(/\x1b\[(?:0|49)?m/g, (m) => m + bg);

export const osc8 = (url: string, text: string): string => `\x1b]8;;${url}\x1b\\${text}\x1b]8;;\x1b\\`;

/** Id curto e estável do conteúdo (FNV-1a 32 bits). */
export function blockId(code: string): string {
	let h = 0x811c9dc5;
	for (let i = 0; i < code.length; i++) h = Math.imul(h ^ code.charCodeAt(i), 0x01000193);
	return (h >>> 0).toString(36);
}

export interface RenderInput {
	/** Linhas já realçadas (uma por linha do código). */
	lines: string[];
	lang: string;
	/** Botão já estilizado (pode conter OSC 8) ou '' para nenhum. */
	button: string;
	width: number;
	pal: Palette;
}

export interface TextUtils {
	visibleWidth(s: string): number;
	wrapTextWithAnsi(s: string, width: number): string[];
	truncateToWidth(s: string, width: number, ellipsis: string): string;
}

/** Linhas finais, todas com exatamente `width` colunas visíveis: cabeçalho (meia linha, rótulo, meia linha), código (quebrado se preciso) com respiro.
 * Padding simétrico igual ao dos demais blocos do chat: 3 colunas à esquerda e à direita (1 se estreito), 1 linha em cima e embaixo de cada faixa. */
export function renderCodeBlock(input: RenderInput, u: TextUtils): string[] {
	const { width, pal } = input;
	const R = "\x1b[0m";
	const side = " ".repeat(width >= 40 ? 3 : 1);
	const left = side;
	const right = side;
	const inner = width - left.length - right.length;
	const blank = `${pal.body}${" ".repeat(width)}${R}`;
	const out: string[] = [];
	// Disponibilidade: linha maior que o terminal faz o @nycode/tui lançar. O botão só entra se sobrar >= 1 coluna de rótulo e 1 de vão;
	// o rótulo é truncado ao que sobra (largura abaixo disso: sem botão, rótulo no espaço restante, possivelmente vazio).
	const bw = input.button ? u.visibleWidth(input.button) : 0;
	const showButton = bw > 0 && inner >= bw + 2;
	const name = u.truncateToWidth(sanitizarExibicao(input.lang), Math.max(0, inner - (showButton ? bw + 1 : 0)), "…");
	const label = `${pal.label}\x1b[1m${name}\x1b[22m\x1b[39m`;
	const button = showButton ? `${pal.button}${input.button}\x1b[39m` : "";
	const gap = Math.max(showButton ? 1 : 0, inner - u.visibleWidth(name) - (showButton ? bw : 0));
	// Meia linha de respiro em cima e embaixo do rótulo: meio-bloco na cor do cabeçalho sobre o fundo de fora (em cima) e do corpo (embaixo).
	// Cor sem RGB (tema de fallback): linha inteira.
	const headFg = pal.head.replace(/^\x1b\[48;/, "\x1b[38;");
	const half = headFg !== pal.head;
	const top = half ? `${headFg}${"▄".repeat(width)}${R}` : `${pal.head}${" ".repeat(width)}${R}`;
	const bottom = half ? `${pal.body}${headFg}${"▀".repeat(width)}${R}` : `${pal.head}${" ".repeat(width)}${R}`;
	out.push(
		top,
		`${pal.head}${left}${label}${pal.head}${" ".repeat(gap)}${button}${pal.head}${right}${R}`,
		bottom,
		blank,
	);
	for (const raw of input.lines) {
		const limpo = sanitizarExibicao(raw);
		const parts = limpo === "" ? [""] : u.wrapTextWithAnsi(limpo, inner);
		for (const p of parts) {
			const pad = " ".repeat(Math.max(0, inner - u.visibleWidth(p)));
			out.push(`${pal.body}${left}${keepBg(p, pal.body)}${pal.body}${pad}${right}${R}`);
		}
	}
	out.push(blank);
	return out;
}
