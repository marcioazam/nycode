import { isAbsolute, relative } from "node:path";
import { bgOpen } from "../diff.ts";
import { fitLine, indent, util } from "../motion/chrome.ts";
import { linkArquivo, type Sintaxe } from "../motion/marcas.ts";
import type { SaidaShell } from "../motion/shell.ts";
import type { Leitura } from "../read/chips.ts";

export type Theme = {
	fg: (color: string, text: string) => string;
	bold: (text: string) => string;
	bg?: (color: string, text: string) => string;
};
export type Component = { render: (width: number) => string[]; invalidate: () => void };
// Contexto/resultado do renderizador (core/extensions/types.ts ToolRenderContext); só o que lemos.
export type Ctx = {
	args?: Record<string, unknown>;
	cwd?: string;
	argsComplete?: boolean;
	/** Posto pelo nycode em tool_execution_start: daí em diante os args estão completos (o nycode só marca argsComplete no fim do streaming). */
	executionStarted?: boolean;
	expanded?: boolean;
	isError?: boolean;
	isPartial?: boolean;
	durationMs?: number;
	toolCallId?: string;
	invalidate?: () => void;
	/** Compartilhado entre renderCall e renderResult da mesma chamada: o resultado deixa aqui o resumo da linha. */
	/** uiStatus: nome do estado vindo do resultado; uiShell: saída do bash para o cartão do shell (motion/shell.ts); uiDica: verbo do atalho ao lado do comando (`abre`/`fecha`). */
	state?: {
		uiRight?: string;
		uiNative?: Component;
		uiCall?: Component;
		uiStatus?: string;
		uiDica?: string;
		uiLinha?: number;
		uiShell?: SaidaShell;
		uiLeitura?: Leitura;
		uiMoldura?: boolean;
	}; // prefixo ui: o edit nativo guarda chaves próprias aqui
	outputPad?: number;
	lastComponent?: Component;
};
type Block = { type: string; text?: string };
// `sintaxe`: posto por extensions/syntax-check no resultado de edit/write (Onda 10, P12).
export type Result = {
	content?: Block[];
	details?: { truncation?: { truncated?: boolean }; diff?: string; sintaxe?: Sintaxe };
};
type Options = { expanded?: boolean; isPartial?: boolean };
export type Renderers = {
	renderCall?: (args: unknown, theme: Theme, context: Ctx) => Component;
	renderResult?: (result: Result, options: Options, theme: Theme, context: Ctx) => Component;
	renderShell?: "default" | "self";
	[key: string]: unknown;
};

export const TOOLS = ["read", "bash", "edit", "write", "grep", "find", "ls"] as const;
export type ToolName = (typeof TOOLS)[number];
/** Título e tarefa separados por bolinha (`bash · cd /tmp`); antes dois espaços com o verbo em coluna fixa. */
export const SEP = (theme: Theme): string => ` ${theme.fg("dim", "·")} `;
export const MIN_DURATION_MS = 1000; // abaixo disso a duração é ruído ("0.0s")

// Componente de linhas fixas: toda linha é cortada na largura útil (nunca quebra o cabeçalho nem invade o padding direito).
// O desenho roda a cada quadro de animação para o histórico inteiro: saída guardada por chave (largura, estado, tema).
export const memo = (
	chave: (w: number) => string,
	render: (w: number) => string[],
	invalidate: () => void = () => {},
): Component => {
	let k: string | undefined,
		out: string[] = [];
	return {
		render: (w) => {
			const c = chave(w);
			if (c !== k) {
				out = render(w);
				k = c;
			}
			return out;
		},
		invalidate() {
			k = undefined;
			invalidate();
		},
	};
};
export const bgDe = (theme: Theme, name: string): string => {
	try {
		return bgOpen(theme, name);
	} catch {
		return "?";
	}
};
export const lines = (rows: string[]): Component =>
	memo(String, (w) => {
		const uw = util(w);
		return rows.map((r) => fitLine(r, uw));
	});
export const empty = (): Component => lines([]);
/** Linhas de detalhe: recuo até a coluna do verbo e `│` em dim. */
export const detail = (rows: string[], theme: Theme): Component =>
	lines(rows.map((r) => `${indent()}${theme.fg("dim", "│")} ${r}`));
/** Render nativo (expandido, diff) sob o mesmo recuo. */
export const indented = (inner: Component): Component => {
	const pad = indent();
	return {
		render: (w) => {
			const rows = inner.render(Math.max(1, util(w) - pad.length));
			// O nativo abre com linhas em branco (respiro do shell nativo): o detalhe cola na chamada.
			const start = rows.findIndex((l) => l.trim() !== "");
			return start < 0 ? [] : rows.slice(start).map((l) => pad + l);
		},
		invalidate: () => inner.invalidate(),
	};
};

export const str = (v: unknown): string | undefined => (typeof v === "string" && v !== "" ? v : undefined);

export const relPath = (p: string, cwd?: string): string => {
	if (cwd && isAbsolute(p)) {
		const r = relative(cwd, p);
		if (r === "") return ".";
		if (!r.startsWith("..") && !isAbsolute(r)) return r;
	}
	return p;
};

export const argPath = (args: Record<string, unknown>) => str(args.file_path) ?? str(args.path);

/** Divide um caminho relativo em `{ base, dir }` para o cabeçalho da Variante 2 do `edit`. */
export const splitFile = (p: string): { base: string; dir: string } => {
	const i = p.lastIndexOf("/");
	return i < 0 ? { base: p, dir: "" } : { base: p.slice(i + 1) || p, dir: p.slice(0, i + 1) };
};

/** Args prontos para o cabeçalho. O nycode não marca argsComplete ao reconstruir o histórico nem quando a chamada nasce em
 * tool_execution_start (sem streaming dos args): com resultado ou com a execução iniciada, os args estão completos. */
export const argsProntos = (ctx: Ctx): boolean =>
	ctx.argsComplete !== false || ctx.isPartial === false || ctx.executionStarted === true;

/** Alvo (muted) e meta (dim) do cabeçalho; '…' quando os args ainda não estão completos ou faltam. */
export const describe = (name: ToolName, ctx: Ctx, theme: Theme): { target: string; meta: string } => {
	const args = ctx.args ?? {};
	const ellipsis = { target: theme.fg("muted", "…"), meta: "" };
	if (!argsProntos(ctx)) return ellipsis;
	if (name === "grep" || name === "find") {
		const pattern = str(args.pattern);
		if (!pattern) return ellipsis;
		const where = str(args.path);
		return {
			target: theme.fg("muted", pattern),
			meta: where ? theme.fg("dim", ` em ${relPath(where, ctx.cwd)}`) : "",
		};
	}
	const raw = argPath(args) ?? (name === "ls" ? "." : undefined);
	if (!raw) return ellipsis;
	let meta = "";
	const { offset, limit } = args;
	if (name === "read") {
		if (typeof limit === "number")
			meta = ` :${typeof offset === "number" ? offset : 1}-${(typeof offset === "number" ? offset : 1) + limit}`;
		else if (typeof offset === "number") meta = ` :${offset}`;
	}
	// Caminho clicável (OSC 8, P13); no read aponta para a linha inicial.
	const linha = name === "read" && typeof offset === "number" ? offset : undefined;
	return {
		target: linkArquivo(theme.fg("muted", relPath(raw, ctx.cwd)), raw, ctx.cwd, linha),
		meta: meta ? theme.fg("dim", meta) : "",
	};
};
