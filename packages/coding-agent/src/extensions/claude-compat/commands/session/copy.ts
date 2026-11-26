/**
 * /copy-pick (de `/copy <args>`; `/copy` sem argumentos segue nativo): N-ésima resposta, texto, seletor de blocos.
 * Extração de blocos própria (autocontida: o layout instalado usa symlinks por arquivo; dev-commands/copy-code.ts tem a mesma regra para /copy-code).
 */

import type { ExtensionAPI, ExtensionCommandContext } from "../../../../core/extensions/types.ts";
import { copyToClipboard } from "../../../../utils/clipboard.ts";

export interface Block {
	lang: string;
	code: string;
}

export function assistantTexts(branch: unknown[]): string[] {
	const out: string[] = [];
	for (const raw of branch) {
		const e = raw as { type?: string; message?: { role?: string; content?: unknown } };
		if (e?.type !== "message" || e.message?.role !== "assistant") continue;
		const c = e.message.content;
		out.push(
			typeof c === "string"
				? c
				: Array.isArray(c)
					? c
							.filter((p) => p?.type === "text")
							.map((p) => p.text ?? "")
							.join("\n")
					: "",
		);
	}
	return out;
}

/** Closing fence: up to 3 spaces, a run of the opening character at least as long, then only whitespace. */
const fechaCerca = (line: string, ch: string, len: number): boolean => {
	const run = /^ {0,3}(`+|~+)\s*$/.exec(line)?.[1];
	return run !== undefined && run[0] === ch && run.length >= len;
};

export function blocksOf(text: string): Block[] {
	const blocks: Block[] = [];
	let open: { ch: string; len: number; lang: string; lines: string[] } | undefined;
	for (const line of text.split("\n")) {
		if (!open) {
			const m = /^ {0,3}(`{3,}|~{3,})\s*([^\s`]*)/.exec(line);
			if (m) open = { ch: m[1]![0]!, len: m[1]!.length, lang: m[2] ?? "", lines: [] };
		} else if (fechaCerca(line, open.ch, open.len)) {
			blocks.push({ lang: open.lang, code: open.lines.join("\n") });
			open = undefined;
		} else open.lines.push(line);
	}
	if (open) blocks.push({ lang: open.lang, code: open.lines.join("\n") });
	return blocks;
}

type Ctx = Pick<ExtensionCommandContext, "ui" | "sessionManager" | "hasUI">;
export type Copier = (text: string) => Promise<void>;
const defaultCopy: Copier = (t) => copyToClipboard(t);
const label = (b: Block, i: number) => `${i + 1} · ${b.lang || "texto"} · ${b.code.split("\n")[0]!.slice(0, 40)}`;

export async function copyCommand(args: string, ctx: Ctx, copy: Copier = defaultCopy): Promise<void> {
	const [first = "", second] = args.trim().split(/\s+/).filter(Boolean);
	const mode = first === "text" || first === "blocks" ? first : "nth";
	const nArg = mode === "nth" ? first : second;
	const n = nArg === undefined || nArg === "" ? 1 : Number(nArg);
	const texts = assistantTexts(ctx.sessionManager.getBranch());
	if (!texts.length) return ctx.ui.notify("Nenhuma resposta do assistente nesta conversa.", "info");
	if (!Number.isInteger(n) || n < 1 || n > texts.length)
		return ctx.ui.notify(
			`N inválido "${nArg}". Use 1 a ${texts.length} (1 = a mais recente). Uso: /copy [N] | /copy text [N] | /copy blocks [N]`,
			"error",
		);
	const text = texts[texts.length - n]!;
	let out = text;
	if (mode === "blocks") {
		const blocks = blocksOf(text);
		if (!blocks.length) return ctx.ui.notify("Essa resposta não tem blocos de código.", "info");
		if (blocks.length === 1) out = blocks[0]!.code;
		else if (!ctx.hasUI)
			return ctx.ui.notify(`Vários blocos; use /copy blocks com UI:\n${blocks.map(label).join("\n")}`, "info");
		else {
			const labels = blocks.map(label);
			const pick = await ctx.ui.select("Copiar qual bloco?", labels);
			if (pick === undefined) return ctx.ui.notify("Cópia cancelada.", "info");
			out = blocks[labels.indexOf(pick)]!.code;
		}
	}
	try {
		await copy(out);
		ctx.ui.notify(`Copiado: ${out.length} caracteres.`, "info");
	} catch (e) {
		ctx.ui.notify(`Falha ao copiar: ${e instanceof Error ? e.message : String(e)}`, "error");
	}
}

export function registerCopy(nycode: ExtensionAPI, copy?: Copier): void {
	nycode.registerCommand("copy-pick", {
		description: "Copia a N-ésima resposta | text [N] | blocks [N] (seletor de blocos)",
		handler: async (a, ctx) => copyCommand(a, ctx, copy),
	});
}
