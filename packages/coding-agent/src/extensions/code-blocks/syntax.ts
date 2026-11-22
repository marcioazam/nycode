/**
 * Realce por tipo de token com a paleta Atom One Dark / One Light (a mesma do "One Dark Pro" do VS Code), aplicada
 * sobre o HTML de classes do highlight.js. Base: highlight.js 10.7 styles/atom-one-{dark,light}.css; classes fora do
 * CSS seguem a referência docs/css-classes-reference.rst e as escolhas do One Dark Pro. Lógica pura.
 */
import { ensureContrast, hexToRgb, type RGB } from "./blocks.ts";

export interface Style {
	color?: string;
	italic?: boolean;
	bold?: boolean;
	underline?: boolean;
}
export interface SyntaxPalette {
	text: string;
	byClass: Record<string, Style>;
	command: Style;
	flag: Style;
}

interface Hues {
	mono1: string;
	mono3: string;
	hue1: string;
	hue2: string;
	hue3: string;
	hue4: string;
	hue5: string;
	hue6: string;
	hue62: string;
}

function build(c: Hues): SyntaxPalette {
	const S = (color: string, extra: Omit<Style, "color"> = {}): Style => ({ color, ...extra });
	const g = (st: Style, ...names: string[]) => Object.fromEntries(names.map((n) => [n, st]));
	const byClass: Record<string, Style> = {
		// atom-one-*.css
		...g(S(c.mono3, { italic: true }), "comment", "quote"),
		...g(S(c.hue3), "doctag", "keyword", "formula"),
		...g(S(c.hue5), "section", "name", "selector-tag", "deletion", "subst"),
		...g(S(c.hue1), "literal"),
		...g(S(c.hue4), "string", "regexp", "addition", "attribute", "meta-string"),
		...g(S(c.hue62), "built_in", "class>title"),
		...g(
			S(c.hue6),
			"attr",
			"variable",
			"template-variable",
			"type",
			"selector-class",
			"selector-attr",
			"selector-pseudo",
			"number",
		),
		...g(S(c.hue2), "symbol", "bullet", "meta", "selector-id", "title"),
		link: S(c.hue2, { underline: true }),
		emphasis: { italic: true },
		strong: { bold: true },
		// Referência do highlight.js sem cor no CSS: segue o papel semântico (One Dark Pro).
		...g(S(c.hue3), "meta-keyword", "template-tag", "dispatch"),
		...g(S(c.hue62), "builtin-name", "builtin-symbol", "constructor", "module", "module-access", "module-def"),
		...g(S(c.hue1), "operator", "named-character"),
		...g(S(c.hue4), "code", "character"),
		...g(S(c.hue6), "keyframePosition", "pattern", "pattern-match", "slot", "typing", "rest_arg"),
		...g(S(c.hue2), "label", "message-name"),
		...g(S(c.mono1), "punctuation", "brace", "identifier"),
	};
	// O bash do highlight.js não marca o comando nem as opções: comando como função, opção como atributo.
	return { text: c.mono1, byClass, command: S(c.hue2), flag: S(c.hue6) };
}

// Comentários: o mono-3 original (#5c6370 escuro, #a0a1a7 claro) fica ilegível no terminal; usa o "lightDark" do
// One Dark Pro (#7f848e) no escuro e o mono-2 (#686b77) no claro.
export const ONE_DARK = build({
	mono1: "#abb2bf",
	mono3: "#7f848e",
	hue1: "#56b6c2",
	hue2: "#61aeee",
	hue3: "#c678dd",
	hue4: "#98c379",
	hue5: "#e06c75",
	hue6: "#d19a66",
	hue62: "#e6c07b",
});
export const ONE_LIGHT = build({
	mono1: "#383a42",
	mono3: "#686b77",
	hue1: "#0184bb",
	hue2: "#4078f2",
	hue3: "#a626a4",
	hue4: "#50a14f",
	hue5: "#e45649",
	hue6: "#986801",
	hue62: "#c18401",
});

const toHex = ([r, g, b]: RGB) => `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;

// Tokens `syntax*` do tema do nycode -> classes do highlight.js. Token ausente (tema antigo) ou sem truecolor: fica a cor da paleta.
const TOKEN_CLASSES: Record<string, string[]> = {
	syntaxComment: ["comment", "quote"],
	syntaxKeyword: ["doctag", "keyword", "formula", "meta-keyword", "template-tag", "dispatch"],
	syntaxFunction: ["symbol", "bullet", "meta", "selector-id", "title", "label", "message-name", "link"],
	syntaxVariable: [
		"attr",
		"variable",
		"template-variable",
		"selector-class",
		"selector-attr",
		"selector-pseudo",
		"keyframePosition",
		"pattern",
		"pattern-match",
		"slot",
		"typing",
		"rest_arg",
	],
	syntaxString: [
		"string",
		"regexp",
		"addition",
		"attribute",
		"meta-string",
		"code",
		"character",
		"section",
		"name",
		"selector-tag",
		"deletion",
		"subst",
	],
	syntaxNumber: ["number", "literal"],
	syntaxType: [
		"type",
		"built_in",
		"class>title",
		"builtin-name",
		"builtin-symbol",
		"constructor",
		"module",
		"module-access",
		"module-def",
	],
	syntaxOperator: ["operator", "named-character"],
	syntaxPunctuation: ["punctuation", "brace", "identifier"],
};
const SGR_RGB = /^\x1b\[38;2;(\d{1,3});(\d{1,3});(\d{1,3})m$/;

/** A paleta com as cores dos tokens `syntax*` do tema do usuário (alto contraste, daltonismo) no lugar das fixas; o chamador
 * aplica `fitPalette` depois, então o ajuste de contraste continua valendo. Sem o token (ou sem truecolor) vale a cor de `base`. */
export function themePalette(base: SyntaxPalette, fgAnsi: (token: string) => string | undefined): SyntaxPalette {
	const byClass = { ...base.byClass };
	let command = base.command,
		flag = base.flag;
	for (const [token, classes] of Object.entries(TOKEN_CLASSES)) {
		let ansi: string | undefined;
		try {
			ansi = fgAnsi(token);
		} catch {
			ansi = undefined;
		}
		const m = ansi && SGR_RGB.exec(ansi);
		if (!m) continue;
		const rgb: RGB = [Number(m[1]), Number(m[2]), Number(m[3])];
		if (rgb.some((n) => n > 255)) continue;
		const color = toHex(rgb);
		for (const c of classes) if (byClass[c]) byClass[c] = { ...byClass[c], color };
		if (token === "syntaxFunction") command = { ...command, color }; // comando do bash segue a função
		if (token === "syntaxVariable") flag = { ...flag, color }; // opção do bash segue o atributo
	}
	return { ...base, byClass, command, flag };
}

/** A paleta com cada cor ajustada (mesmo matiz) para contraste WCAG >= `min` sobre o fundo do bloco. */
export function fitPalette(p: SyntaxPalette, bg: RGB, min = 4.5): SyntaxPalette {
	const fix = (st: Style): Style =>
		st.color ? { ...st, color: toHex(ensureContrast(hexToRgb(st.color), bg, min)) } : st;
	return {
		text: toHex(ensureContrast(hexToRgb(p.text), bg, min)),
		byClass: Object.fromEntries(Object.entries(p.byClass).map(([k, v]) => [k, fix(v)])),
		command: fix(p.command),
		flag: fix(p.flag),
	};
}

const fg = (hex: string) => {
	const n = parseInt(hex.slice(1), 16);
	return `\x1b[38;2;${(n >> 16) & 255};${(n >> 8) & 255};${n & 255}m`;
};

function paint(s: string, st: Style, text: string): string {
	if (!s) return "";
	let on = fg(st.color ?? text);
	let off = "";
	if (st.italic) {
		on += "\x1b[3m";
		off += "\x1b[23m";
	}
	if (st.bold) {
		on += "\x1b[1m";
		off += "\x1b[22m";
	}
	if (st.underline) {
		on += "\x1b[4m";
		off += "\x1b[24m";
	}
	return on + s + off;
}

const ENTITIES: Record<string, string> = {
	"&amp;": "&",
	"&lt;": "<",
	"&gt;": ">",
	"&quot;": '"',
	"&#x27;": "'",
	"&#39;": "'",
};
const unescapeEntities = (s: string) => s.replace(/&(amp|lt|gt|quot|#x27|#39);/g, (m) => ENTITIES[m]);

/** Estilo do span mais interno que tem cor; ênfase/negrito/link de spans externos se somam. */
function styleFor(stack: string[][], p: SyntaxPalette): Style | undefined {
	let found: Style | undefined;
	const extra: Style = {};
	for (let i = stack.length - 1; i >= 0; i--) {
		for (const cls of stack[i]) {
			const st =
				cls === "title" && stack.slice(0, i).some((c) => c.includes("class"))
					? p.byClass["class>title"]
					: p.byClass[cls];
			if (!st) continue;
			if (st.italic) extra.italic = true;
			if (st.bold) extra.bold = true;
			if (st.underline) extra.underline = true;
			if (!found && st.color) found = st;
		}
	}
	if (!found && !extra.italic && !extra.bold && !extra.underline) return undefined;
	return { ...extra, ...found, italic: extra.italic, bold: extra.bold, underline: extra.underline };
}

/** Texto fora de spans no bash: primeira palavra de cada comando e opções `-x`/`--xx`. */
function shellPlain(s: string, atCmd: boolean, p: SyntaxPalette): { out: string; atCmd: boolean } {
	let out = "";
	const re = /(\s+)|([|;&()]+)|(\S+?)(?=[|;&()]|\s|$)/g;
	let m: RegExpExecArray | null;
	for (m = re.exec(s); m; m = re.exec(s)) {
		if (m[1]) {
			out += paint(m[1], {}, p.text);
			if (m[1].includes("\n")) atCmd = true;
			continue;
		}
		if (m[2]) {
			out += paint(m[2], {}, p.text);
			atCmd = true;
			continue;
		}
		const w = m[3];
		if (atCmd && !/^[A-Za-z_][A-Za-z0-9_]*=/.test(w)) {
			out += paint(w, p.command, p.text);
			atCmd = false;
		} else if (/^--?[A-Za-z0-9]/.test(w)) out += paint(w, p.flag, p.text);
		else out += paint(w, {}, p.text);
	}
	return { out, atCmd };
}

/** HTML de classes do highlight.js -> linhas ANSI (só cor de frente; fundo fica por conta de quem desenha o bloco). */
export function hljsToAnsi(html: string, p: SyntaxPalette, shell = false): string[] {
	const stack: string[][] = [];
	let out = "";
	let atCmd = true;
	const re = /<span class="([^"]*)">|<\/span>|([^<]+)/g;
	let m: RegExpExecArray | null;
	for (m = re.exec(html); m; m = re.exec(html)) {
		if (m[1] !== undefined) stack.push(m[1].split(/\s+/).map((c) => c.replace(/^hljs-/, "")));
		else if (m[0] === "</span>") stack.pop();
		else {
			const text = unescapeEntities(m[2]);
			const st = styleFor(stack, p);
			if (!st && shell) {
				const r = shellPlain(text, atCmd, p);
				out += r.out;
				atCmd = r.atCmd;
				continue;
			}
			out += text
				.split("\n")
				.map((t) => paint(t, st ?? {}, p.text))
				.join("\n");
			if (shell) atCmd = /\n\s*$/.test(text) || (atCmd && !text.trim());
		}
	}
	return out.split("\n").map((l) => (l ? `${l}\x1b[39m` : l));
}
