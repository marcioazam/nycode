/** Comando /painel: visão geral do que está ligado; Enter leva o comando da linha ao campo de texto. */

import { basename } from "node:path";
import { OVERLAY } from "./info.ts";
import { bar, type Line, Sheet, type SheetModel, type ThemeLike } from "./sheet.ts";

export type PainelData = {
	model?: string;
	thinking?: string;
	usage?: { tokens: number | null; contextWindow: number; percent: number | null };
	bypass: boolean;
	trusted?: boolean;
	project: string;
};

const plain: ThemeLike = { fg: (_c, s) => s, bg: (_c, s) => s, bold: (s) => s };
const LABEL = 13;
const BAR_WIDTH = 20;

/** 4800 → 4,8k; 32000 → 32k; 1500000 → 1,5M. */
export function compact(n: number): string {
	const f = (v: number, u: string) => `${(Math.round(v * 10) / 10).toLocaleString("pt-BR")}${u}`;
	if (n >= 1e6) return f(n / 1e6, "M");
	if (n >= 1e3) return f(n / 1e3, "k");
	return String(n);
}

export function painelModel(d: PainelData, t: ThemeLike = plain): SheetModel {
	const row = (label: string, text: string, value: string): Line => ({
		kind: "row",
		left: `${label.padEnd(LABEL)}${text}`,
		right: value,
		value,
	});
	const lines: Line[] = [];
	if (d.model) lines.push(row("Modelo", d.thinking ? `${d.model} · raciocínio ${d.thinking}` : d.model, "/model"));
	const u = d.usage;
	if (u && u.contextWindow > 0) {
		if (u.tokens === null) lines.push(row("Contexto", `janela de ${compact(u.contextWindow)}`, "/context"));
		else {
			const pct = u.percent === null ? "" : ` · ${Math.round(u.percent)}%`;
			const b = u.percent === null ? "" : `${bar(t, BAR_WIDTH, u.percent)}  `;
			lines.push(row("Contexto", `${b}${compact(u.tokens)} de ${compact(u.contextWindow)}${pct}`, "/context"));
		}
	}
	lines.push(row("Permissões", d.bypass ? "▲ bypass ligado: age sem perguntar" : "pergunta antes de agir", "/bypass"));
	if (d.trusted !== undefined)
		lines.push(
			row(
				"Confiança",
				d.trusted ? "✓ projeto confiável" : "▲ projeto não confiável · a configuração dele não carrega",
				"/trust",
			),
		);
	lines.push({ kind: "group", text: "Gerenciar" });
	for (const [label, cmd] of [
		["Memória", "/memory"],
		["MCP", "/mcp"],
		["Agentes", "/agents"],
		["Hooks", "/hooks"],
		["Ajustes", "/settings"],
	] as const) {
		lines.push(row(label, "", cmd));
	}
	return { title: "Visão geral", right: d.project, lines, footer: "↑↓ escolher · ⏎ levar ao campo · esc fechar" };
}

const attempt = <T>(f: () => T): T | undefined => {
	try {
		return f();
	} catch {
		return undefined;
	}
};

/** Mesma regra de extensions/bypass-permissions/index.ts:29-31. */
const bypassOn = () => ["1", "true", "on", "yes"].includes((process.env.NYCODE_BYPASS_PERMISSIONS ?? "").toLowerCase());

export function registerPainel(nycode: any): void {
	nycode.registerCommand("painel", {
		description: "Visão geral do que está ligado",
		handler: async (_args: string, ctx: any) => {
			if (!ctx.hasUI) return;
			const u = attempt(() => ctx.getContextUsage?.());
			const data: PainelData = {
				model: attempt(() => ctx.model?.name ?? ctx.model?.id),
				thinking: attempt(() => nycode.getThinkingLevel?.()),
				usage: u
					? {
							tokens: u.tokens ?? null,
							contextWindow: u.contextWindow ?? ctx.model?.contextWindow ?? 0,
							percent: u.percent ?? null,
						}
					: undefined,
				bypass: bypassOn(),
				trusted: attempt(() => ctx.isProjectTrusted?.()),
				project: basename(ctx.cwd ?? ""),
			};
			const chosen: string | undefined = await ctx.ui.custom(
				(tui: any, theme: ThemeLike, _kb: unknown, done: (v?: string) => void) =>
					new Sheet(theme, painelModel(data, theme), done, () => tui.requestRender()),
				OVERLAY,
			);
			if (chosen !== undefined) ctx.ui.setEditorText?.(chosen);
		},
	});
}
