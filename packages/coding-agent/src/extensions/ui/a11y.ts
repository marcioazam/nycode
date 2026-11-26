/**
 * Acessibilidade: NO_COLOR (no-color.org) → tema mono; `movimento()` é o único critério de animação (Onda 10, P01):
 * normal, reduzido (sem varredura; só troca de cor curta) ou desligado (texto fixo). O cabeçalho embutido sem cor e sem o
 * clique do logo sob NO_COLOR é do próprio core (K10, interactive-mode.ts), não desta extensão.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getAgentDir } from "../../config.ts";
import type { ExtensionAPI } from "../../core/extensions/types.ts";
import { resolveNycodeSettings } from "../../core/settings-nycode.ts";

/** Único spinner (cli-spinners 'dots', 80 ms), usado por working.ts; o título do terminal não anima. */
export const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

type Env = Record<string, string | undefined>;

export const noColor = (env: Env = process.env): boolean => (env.NO_COLOR ?? "") !== "";

const SEQ_TERMINAL =
	/\u001b(?:\][^\u0007\u001b]*(?:\u0007|\u001b\\)|[P^_][^\u001b]*\u001b\\|\[[0-9:;<=>?]*[ -/]*[@-~])/g;
/** Texto de fora da tela: tira OSC, DCS e C0/C1. SGR (`\\x1b[…m`) fica, porque o realce de código já é nosso. */
export const sanitizarExibicao = (texto: string): string =>
	String(texto)
		.replace(SEQ_TERMINAL, (seq) => (seq.startsWith("\u001b[") && seq.endsWith("m") ? seq : ""))
		.replace(/\u001b(?!\[[0-9:;<=>?]*m)/g, "")
		.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001a\u001c-\u001f\u007f-\u009f]/g, "");

export const MOVIMENTOS = ["normal", "reduzido", "desligado"] as const;
export type Movimento = (typeof MOVIMENTOS)[number];
// Cada extensão tem a própria cópia deste módulo (jiti sem cache): a escolha do usuário mora em globalThis.
const CHAVE = Symbol.for("nycode:movimento");
const nivel = (v: unknown): number => Math.max(0, MOVIMENTOS.indexOf(v as Movimento));
/** Chave `movimento` (ui-state.json pelo /movimento, ou settings.json); valor inválido volta a `normal`. */
export const definirMovimento = (v: unknown): void => {
	(globalThis as Record<symbol, unknown>)[CHAVE] = MOVIMENTOS[nivel(v)];
};
const ligada = (v: string | undefined): boolean => v !== undefined && v !== "" && v !== "0" && v !== "false";
/** Nível em vigor: o mais restritivo entre o ambiente (TERM=dumb e NO_PROGRESS desligam; NYCODE_REDUCED_MOTION e TERM=linux reduzem) e a chave. */
export const movimento = (
	env: Env = process.env,
	chave: unknown = (globalThis as Record<symbol, unknown>)[CHAVE],
): Movimento => {
	const amb =
		env.TERM === "dumb" || (env.NO_PROGRESS ?? "") !== ""
			? 2
			: ligada(env.NYCODE_REDUCED_MOTION) || env.TERM === "linux"
				? 1
				: 0;
	return MOVIMENTOS[Math.max(amb, nivel(chave))]!;
};
/** Movimento reduzido ou desligado, ou terminal.reducedMotion (env NYCODE_REDUCED_MOTION > settings.json). */
export const reducedMotion = (nycode: ExtensionAPI, env: Env = process.env): boolean =>
	resolveNycodeSettings(nycode.getSettings(), env).terminal.reducedMotion || movimento(env) !== "normal";

const agentDir = () => getAgentDir();
const uiState = () => process.env.NYCODE_UI_STATE || join(agentDir(), "ui-state.json"); // mesmo arquivo do STATE_PATH de ui/editor.ts
const lerJson = (p: string): Record<string, unknown> => {
	try {
		const v: unknown = JSON.parse(readFileSync(p, "utf8"));
		return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
	} catch {
		return {};
	}
};
/** Estado de interface do usuário (ui-state.json): ler e mesclar sem perder as outras chaves. */
export const lerEstado = (): Record<string, unknown> => lerJson(uiState());
export const gravarEstado = (patch: Record<string, unknown>): void => {
	mkdirSync(dirname(uiState()), { recursive: true });
	writeFileSync(uiState(), `${JSON.stringify({ ...lerJson(uiState()), ...patch }, null, 2)}\n`);
};
/** Chave salva: a do /movimento (ui-state.json) vence a de settings.json; nenhuma = normal. */
export const movimentoSalvo = (): unknown =>
	lerJson(uiState()).movimento ?? lerJson(join(agentDir(), "settings.json")).movimento;

const indicador = (ui: any): void => {
	ui.setWorkingIndicator(
		movimento() === "normal"
			? { frames: FRAMES.map((f) => ui.theme?.fg?.("accent", f) ?? f), intervalMs: 80 }
			: { frames: ["●"] },
	);
};

export default function (nycode: ExtensionAPI) {
	nycode.registerCommand?.("movimento", {
		description: "Movimento da interface: normal, reduzido (sem varredura) ou desligado (texto fixo)",
		getArgumentCompletions: (p: string) =>
			MOVIMENTOS.filter((m) => m.startsWith(p.trim())).map((m) => ({ value: m, label: m })),
		handler: async (args, ctx) => {
			const pedido = args.trim();
			if (!pedido)
				return ctx.ui.notify(`Movimento: ${movimento()} (uso: /movimento ${MOVIMENTOS.join("|")})`, "info");
			if (!(MOVIMENTOS as readonly string[]).includes(pedido))
				return ctx.ui.notify(`Movimento desconhecido: ${pedido} (use ${MOVIMENTOS.join(", ")})`, "warning");
			definirMovimento(pedido);
			try {
				gravarEstado({ movimento: pedido });
			} catch (e) {
				ctx.ui.notify(`ui-state.json não gravado: ${e instanceof Error ? e.message : e}`, "warning");
			}
			indicador(ctx.ui);
			const ef = movimento();
			ctx.ui.notify(
				ef === pedido ? `Movimento: ${ef}` : `Movimento: ${ef} (o ambiente pede ${ef}; ${pedido} fica salvo)`,
				"info",
			);
		},
	});
	nycode.on("session_start", (_event, ctx) => {
		definirMovimento(movimentoSalvo());
		if (!ctx.hasUI) return;
		if (noColor()) {
			// Objeto, não nome: setTheme(nome) grava `theme` em settings.json e tira a cor de todas as sessões seguintes.
			const mono = ctx.ui.getTheme("mono");
			const r = mono ? ctx.ui.setTheme(mono) : { success: false, error: "tema não encontrado" };
			if (!r.success) ctx.ui.notify(`NO_COLOR: tema mono indisponível (${r.error ?? "erro"})`, "warning");
		}
		if (movimento() !== "normal") ctx.ui.setWorkingIndicator({ frames: ["●"] });
	});
}
