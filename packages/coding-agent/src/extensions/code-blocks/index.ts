/**
 * Blocos de código sem ``` e sem borda: fundo tingido pela cor da linguagem e botão "⧉ copiar" clicável (fullscreen).
 * O clique copia exatamente o código do bloco, sem rótulo, recuo nem quebras do terminal.
 * O core não tem gancho público para blocos de código: envolve Markdown.prototype.renderToken só para tokens
 * `code` e o openUrl do TUI só para links `nycode-copy:`; qualquer erro cai no renderizador nativo.
 * Reverter: apagar este diretório.
 */
import { spawn } from "node:child_process";
import {
	getCapabilities,
	Markdown,
	type MarkdownTheme,
	truncateToWidth,
	visibleWidth,
	wrapTextWithAnsi,
} from "@nycode/tui";
import type { ExtensionAPI } from "../../core/extensions/types.ts";
import type { Theme, ThemeColor } from "../../modes/interactive/theme/theme.ts";
import { copyToClipboard } from "../../utils/clipboard.ts";
import { highlightJs as hljs, supportsLanguage } from "../../utils/syntax-highlight.ts";
import {
	blockId,
	detectLang,
	isDark,
	type Lang,
	osc8,
	type Palette,
	palette,
	parseBgAnsi,
	renderCodeBlock,
	resolveLang,
} from "./blocks.ts";
import {
	fitPalette,
	hljsToAnsi,
	ONE_DARK,
	ONE_LIGHT,
	type SyntaxPalette,
	themePalette as themeSyntax,
} from "./syntax.ts";

const KEY = Symbol.for("nycode.code-blocks");
const THEME_KEY = Symbol.for("@nycode/coding-agent:theme");
const SCHEME = "nycode-copy:";
const MAX_BLOCKS = 500;
const MIN_WIDTH = 24;

// Sobrevive ao /reload: o openUrl já envolvido continua achando os blocos registrados pelo módulo novo.
interface State {
	codes: Map<string, string>;
	notify?: (msg: string, level: "info" | "warning" | "error") => void;
}
const g = globalThis as Record<symbol, unknown>;
g[KEY] ??= { codes: new Map() };
const state = g[KEY] as State;
const liveTheme = (): Theme | undefined => g[THEME_KEY] as Theme | undefined;

// Bloco em stream (cerca ainda aberta) cresce a cada render: ocupa UMA entrada por dono (instância do Markdown), trocada
// a cada prefixo maior. Sem isso cada prefixo vira entrada (O(n²) de memória) e MAX_BLOCKS expulsa os blocos fechados.
const pending = new WeakMap<object, string>();

export function remember(code: string, owner: object = state, open = false): string {
	const id = blockId(code);
	const prev = pending.get(owner);
	if (prev !== undefined) {
		const grew = prev !== id && code.startsWith(state.codes.get(prev) ?? "\0");
		if (grew) state.codes.delete(prev);
		if (grew || (prev === id && !open)) pending.delete(owner);
	}
	if (open) pending.set(owner, id);
	state.codes.delete(id);
	state.codes.set(id, code);
	if (state.codes.size > MAX_BLOCKS) state.codes.delete(state.codes.keys().next().value!);
	return id;
}
export const recall = (id: string): string | undefined => state.codes.get(id);
export const rememberedCount = (): number => state.codes.size;

/** Fence aberta (stream): começa com cerca e a última linha não a fecha. Bloco recuado não conta. */
const isOpenFence = (raw: unknown): boolean => {
	if (typeof raw !== "string" || !/^ {0,3}(`{3,}|~{3,})/.test(raw)) return false;
	const rows = raw.trimEnd().split("\n");
	return rows.length < 2 || !/^ {0,3}(`{3,}|~{3,})\s*$/.test(rows[rows.length - 1]);
};

const palettes = new WeakMap<object, Map<string, Palette>>();
function themePalette(color: string | undefined): Palette {
	const t = liveTheme();
	if (!t) return palette(color, undefined, { bg: "", label: "", button: "" });
	let byColor = palettes.get(t);
	if (!byColor) {
		byColor = new Map();
		palettes.set(t, byColor);
	}
	const k = color ?? "";
	let p = byColor.get(k);
	if (!p) {
		const surface = t.getBgAnsi("customMessageBg");
		p = palette(color, parseBgAnsi(surface), {
			bg: surface,
			label: t.getFgAnsi("accent"),
			button: t.getFgAnsi("dim"),
		});
		byColor.set(k, p);
	}
	return p;
}

/** One Dark no tema escuro, One Light no claro, com as cores `syntax*` do tema quando existirem (U26) e contraste
 * >= 4.5:1 sobre o fundo; sem truecolor, undefined. Chave: fundo + nome do tema (cada tema traz seus tokens). */
const fitted = new Map<string, SyntaxPalette>();
export function syntaxPalette(): { key: string; p: SyntaxPalette } | undefined {
	const t = liveTheme();
	const base = parseBgAnsi(t?.getBgAnsi?.("customMessageBg"));
	if (!base) return undefined;
	const key = `${base.join(",")}\0${t?.name ?? ""}`;
	let p = fitted.get(key);
	if (!p) {
		const themed = themeSyntax(isDark(base) ? ONE_DARK : ONE_LIGHT, (token) => t?.getFgAnsi?.(token as ThemeColor));
		p = fitPalette(themed, base);
		fitted.set(key, p);
	}
	return { key, p };
}

/** Primeira gramática do highlight.js entre a etiqueta e os candidatos do Linguist (nome, aliases, modos, extensões). */
function grammarFor(lang: Lang): string | undefined {
	// Same instance as the eager core set; an unregistered first candidate loads the full set and the view redraws.
	if (lang.grammars.length > 0) supportsLanguage(lang.grammars[0]);
	return lang.grammars.find((c) => hljs.getLanguage(c));
}

// Cache de realce do módulo (o @nycode/tui instalado não tem md.blockHighlightedCode): LRU por chave
// (tema + gramática + texto), com tetos de entradas e de bytes; trocar de tema esvazia.
const HL_MAX_ENTRIES = 200;
const HL_MAX_BYTES = 4 << 20;
// ponytail: blocos acima de 2.000 linhas ficam em texto simples (realce custa O(n) por render); subir só medindo.
const HL_MAX_LINES = 2000;
const hlCache = new Map<string, { lines: string[]; bytes: number }>();
let hlBytes = 0;
let hlTheme = "";

export function resetHighlightCache(): void {
	hlCache.clear();
	hlBytes = 0;
	hlTheme = "";
}

const overLines = (text: string, max: number): boolean => {
	let n = 1;
	for (let i = text.indexOf("\n"); i >= 0; i = text.indexOf("\n", i + 1)) if (++n > max) return true;
	return false;
};

export function memoHighlight(
	theme: string,
	grammar: string,
	text: string,
	compute: () => string[],
	plain: (text: string) => string[],
): string[] {
	if (overLines(text, HL_MAX_LINES)) return plain(text);
	if (theme !== hlTheme) {
		resetHighlightCache();
		hlTheme = theme;
	}
	const key = `${grammar}\0${text}`;
	const hit = hlCache.get(key);
	if (hit) {
		hlCache.delete(key);
		hlCache.set(key, hit);
		return hit.lines;
	}
	const lines = compute();
	if (!text.endsWith("\n")) return lines;
	const bytes = text.length + lines.reduce((n, l) => n + l.length, 0);
	if (bytes <= HL_MAX_BYTES) {
		hlCache.set(key, { lines, bytes });
		hlBytes += bytes;
		while (hlCache.size > HL_MAX_ENTRIES || hlBytes > HL_MAX_BYTES) {
			const [k, v] = hlCache.entries().next().value!;
			hlCache.delete(k);
			hlBytes -= v.bytes;
		}
	}
	return lines;
}

const themeIds = new WeakMap<object, number>();
let themeSeq = 0;
const nativeTheme = (th: object): string => {
	let n = themeIds.get(th);
	if (n === undefined) {
		n = ++themeSeq;
		themeIds.set(th, n);
	}
	return `native${n}\0${liveTheme()?.getBgAnsi?.("customMessageBg") ?? ""}`;
};

function highlighted(md: { theme: MarkdownTheme }, text: string, lang: Lang): string[] {
	const sp = syntaxPalette();
	if (sp) {
		const grammar = grammarFor(lang);
		try {
			const shell = grammar !== undefined && hljs.getLanguage(grammar) === hljs.getLanguage("bash");
			return memoHighlight(
				`cb\0${sp.key}`,
				grammar ?? "",
				text,
				() =>
					grammar
						? hljsToAnsi(hljs.highlight(text, { language: grammar, ignoreIllegals: true }).value, sp.p, shell)
						: hljsToAnsi(text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"), sp.p),
				(t) => t.split("\n"),
			);
		} catch {}
	}
	const th = md.theme;
	const nativeHighlight = th.highlightCode;
	if (!nativeHighlight) return text.split("\n").map((l) => th.codeBlock(l));
	return memoHighlight(
		nativeTheme(th),
		lang.grammars[0] ?? "",
		text,
		() => nativeHighlight.call(th, text, lang.grammars[0]),
		(t) => t.split("\n").map((l) => th.codeBlock(l)),
	);
}

type CodeToken = { type?: string; lang?: string; text: string; raw?: unknown };
type MarkdownSelf = { theme: MarkdownTheme; defaultTextStyle?: { bgColor?: unknown } };
type RenderToken = (
	this: MarkdownSelf,
	token: CodeToken,
	width: number,
	next: string | undefined,
	styleContext: unknown,
) => string[];
type MarkdownProto = { renderToken: RenderToken; [KEY]?: RenderToken };

function install(clickable: () => boolean): void {
	// renderToken is private in Markdown: this wrapper reaches it through a structural type.
	const proto = Markdown.prototype as unknown as MarkdownProto;
	const native = proto[KEY] ?? proto.renderToken;
	proto[KEY] = native;
	proto.renderToken = function (this: MarkdownSelf, token, width, next, styleContext) {
		// Texto com fundo próprio (balão do usuário): o reset do bloco apagaria o fundo da margem; fica o nativo.
		if (token.type !== "code" || width < MIN_WIDTH || this.defaultTextStyle?.bgColor)
			return native.call(this, token, width, next, styleContext);
		try {
			const tag = token.lang || detectLang(token.text);
			const lang = resolveLang(tag);
			const id = remember(token.text, this, isOpenFence(token.raw));
			const button = clickable() && getCapabilities().hyperlinks ? osc8(SCHEME + id, "⧉ copiar") : "/copy-code";
			const lines = renderCodeBlock(
				{
					lines: highlighted(this, token.text, lang),
					lang: lang.name,
					button,
					width,
					pal: themePalette(lang.color),
				},
				{ visibleWidth, wrapTextWithAnsi, truncateToWidth },
			);
			if (next && next !== "space") lines.push("");
			return lines;
		} catch {
			return native.call(this, token, width, next, styleContext);
		}
	};
}

/** wl-copy sem --type adivinha o MIME pelo conteúdo e código pode virar application/x-ruby; força texto puro. */
function wlCopy(text: string): Promise<boolean> {
	if (process.platform !== "linux" || !process.env.WAYLAND_DISPLAY) return Promise.resolve(false);
	return new Promise((resolve) => {
		const p = spawn("wl-copy", ["--type", "text/plain;charset=utf-8"], { stdio: ["pipe", "ignore", "ignore"] });
		p.on("error", () => resolve(false));
		p.on("close", (code) => resolve(code === 0));
		p.stdin.end(text);
	});
}

async function copyBlock(id: string): Promise<void> {
	const code = state.codes.get(id);
	if (code === undefined) return state.notify?.("Bloco não está mais em memória; use /copy-code.", "warning");
	try {
		if (!(await wlCopy(code))) await copyToClipboard(code);
	} catch (e) {
		return state.notify?.(`Falha ao copiar: ${e instanceof Error ? e.message : String(e)}`, "error");
	}
	const n = code.split("\n").length;
	state.notify?.(`Código copiado (${n} linha${n === 1 ? "" : "s"})`, "info");
}

/** `tui` é o Proxy estável do nycode: cada leitura de método devolve um invólucro novo, então a marca fica no próprio TUI. */
type Clicavel = { openUrl?: unknown; [KEY]?: boolean };
function hookClicks(tui: Clicavel): void {
	const current = tui.openUrl;
	if (typeof current !== "function" || tui[KEY]) return;
	tui[KEY] = true;
	const abrir = current as (url: string) => unknown;
	tui.openUrl = (url: string) => {
		if (url.startsWith(SCHEME)) return void copyBlock(url.slice(SCHEME.length));
		return abrir(url);
	};
}

export default function (nycode: ExtensionAPI) {
	let fullscreen = true; // padrão do core; getSettings só pode ser chamado depois do carregamento
	install(() => fullscreen);
	nycode.on("session_start", (_e, ctx) => {
		if (!ctx.hasUI) return;
		fullscreen = (nycode.getSettings() as { tuiMode?: string }).tuiMode !== "regular";
		state.notify = (msg, level) => ctx.ui.notify(msg, level);
		ctx.ui.setWidget("code-blocks", (tui) => {
			const target = tui as unknown as Clicavel; // the TUI keeps openUrl as a private field
			fullscreen = typeof target.openUrl === "function";
			hookClicks(target);
			return { render: () => [], invalidate: () => {} };
		});
	});
}
