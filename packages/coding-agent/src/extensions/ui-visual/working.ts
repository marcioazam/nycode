/**
 * Indicador de trabalho: spinner nas cores do nycode, status em ciano com shimmer e deduplicação anti-flicker.
 * Onda 10: aviso de travamento (P05), dica rotativa (P09), tokens recebidos (P10); em `desligado`, texto fixo (P01).
 */

import type { ExtensionAPI, ExtensionContext } from "../../core/extensions/types.ts";
import type { Theme } from "../../modes/interactive/theme/theme.ts";
import { FRAMES, gravarEstado, lerEstado, movimento } from "../ui/a11y.ts";
import { icon, iconGap } from "./icons.ts";
import { assinarQuadro, lerpRgb, safeAnsi, shimmerText } from "./motion/motion.ts";

const TARGET_MAX = 40;

export type Tool = { name: string; target: string };
export type PhaseState = { phase: "pensando" | "escrevendo"; tools: Tool[]; elapsedMs: number };
type Fg = Pick<Theme, "fg"> & Partial<Pick<Theme, "getFgAnsi">>;
type Env = Record<string, string | undefined>;

/** 4s, 59s, 1m 05s, 1h 02m. */
export function formatElapsed(ms: number): string {
	const s = Math.max(0, Math.floor(ms / 1000));
	if (s < 60) return `${s}s`;
	const m = Math.floor(s / 60);
	if (m < 60) return `${m}m ${String(s % 60).padStart(2, "0")}s`;
	return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
}

export const truncate = (s: string, max = TARGET_MAX): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

/** Alvo curto de uma chamada: path, primeira linha do comando ou padrão. */
export function toolTarget(args: unknown): string {
	const a = (args ?? {}) as Record<string, unknown>;
	const raw = [a.path, a.command, a.pattern].find((v) => typeof v === "string" && v !== "");
	return typeof raw === "string" ? truncate(raw.split("\n")[0]) : "";
}

export function phaseText(state: PhaseState): string {
	const { tools } = state;
	let phase: string = state.phase;
	if (tools.length === 1) phase = tools[0].target ? `${tools[0].name} · ${tools[0].target}` : tools[0].name;
	else if (tools.length > 1) phase = `${tools.length} ferramentas`;
	return `${phase} · ${formatElapsed(state.elapsedMs)} · esc interrompe`;
}

/** Spinner nas cores do nycode (supera o arco-íris): `accent`, como o Loader nativo. Sem movimento: 1 quadro. */
export function frames(theme: Fg, motion: boolean): string[] {
	return (motion ? FRAMES : ["●"]).map((f) => theme.fg("accent", f));
}

// ── travamento (P05) ─────────────────────────────────────────────────────────
export const TRAVA_MS = 10_000; // sem evento do modelo nem tool rodando há 10 s
export const TRAVA_COR_MS = 2_000; // o spinner vai de azul a âmbar em 2 s
/** Quanto do âmbar entra no spinner (0 a 1, em 10 passos); `reduzido` troca direto. */
export const travaMistura = (quietoMs: number, env: Env = process.env): number => {
	if (quietoMs < TRAVA_MS) return 0;
	if (movimento(env) !== "normal") return 1;
	return Math.min(10, Math.floor(((quietoMs - TRAVA_MS) / TRAVA_COR_MS) * 10)) / 10;
};

/** Quadros do spinner com a mistura de âmbar, girados para continuar do quadro em que estavam (setIndicator volta ao 1º). */
export function quadrosTravados(theme: Fg, mistura: number, agoraMs: number, env: Env = process.env): string[] {
	const base = movimento(env) === "normal" ? FRAMES : ["●"];
	const a = safeAnsi(() => theme.getFgAnsi?.("accent"));
	const w = safeAnsi(() => theme.getFgAnsi?.("warning"));
	const pinta = (f: string) => {
		if (mistura <= 0) return theme.fg("accent", f);
		if (!a || !w || mistura >= 1) return theme.fg("warning", f);
		const [r, g, b] = lerpRgb(a, w, mistura);
		return `\x1b[38;2;${r};${g};${b}m${f}\x1b[39m`;
	};
	const k = Math.floor(agoraMs / 80) % base.length;
	return [...base.slice(k), ...base.slice(0, k)].map(pinta);
}

// ── dicas (P09): só atalhos que o código atende (ui/editor.ts, ui-visual/tools.ts) ──
export const DICAS = [
	"ctrl+o abre a saída da tool",
	"? mostra os atalhos",
	"ctrl+s guarda o rascunho",
	"ctrl+r abre o histórico de prompts",
	"ctrl+t mostra a lista de tarefas",
	"shift+tab troca o modo de permissão",
];
export const DICA_APOS_MS = 5_000;
export const DICA_TROCA_MS = 8_000;
export const dicaDe = (decorridoMs: number): string =>
	decorridoMs < DICA_APOS_MS ? "" : DICAS[Math.floor((decorridoMs - DICA_APOS_MS) / DICA_TROCA_MS) % DICAS.length]!;

// ── tokens (P10): o provedor só informa a saída no fim da mensagem; no stream, estimativa de 4 caracteres por token ──
const fmtTok = (n: number): string =>
	n < 1000 ? String(n) : `${(Math.floor(n / 100) / 10).toFixed(1).replace(".", ",")}k`;
/** `↓ ~840`, `↓ 1,2k`: largura fixa (5 colunas) para a linha não tremer; `~` enquanto há estimativa. */
export const tokensTexto = (exatos: number, estimados: number): string =>
	exatos + estimados <= 0 ? "" : `↓ ${`${estimados > 0 ? "~" : ""}${fmtTok(exatos + estimados)}`.padStart(5)}`;

const DICAS_CHAVE = Symbol.for("nycode:dicas");
/** Turno sem resposta há TRAVA_MS: a cápsula do composer (ui/editor.ts) fica âmbar. */
export const TRAVADO_CHAVE = Symbol.for("nycode:travado");
const marcaTravado = (v: boolean) => {
	(globalThis as Record<symbol, unknown>)[TRAVADO_CHAVE] = v;
};
const dicasLigadas = (): boolean => (globalThis as Record<symbol, unknown>)[DICAS_CHAVE] !== false;

export default function (nycode: ExtensionAPI) {
	let unsubFast: (() => void) | undefined;
	let activeTurn = false;
	let lastSent = "";
	let startedAt = 0;
	let ultimoEvento = 0;
	let mistura = 0;
	let tokExatos = 0;
	let tokChars = 0;
	let phase: PhaseState["phase"] = "pensando";
	const running = new Map<string, Tool>();

	const enabled = (ctx: { hasUI: boolean }) => ctx.hasUI && process.env.NYCODE_SUBAGENT !== "1";
	const stop = () => {
		marcaTravado(false);
		activeTurn = false;
		lastSent = "";
		unsubFast?.();
		unsubFast = undefined;
	};
	const evento = () => {
		ultimoEvento = Date.now();
	};

	const indicador = (ctx: ExtensionContext, m: number, nowPerf: number) => {
		if (m === mistura) return;
		mistura = m;
		ctx.ui.setWorkingIndicator({ frames: quadrosTravados(ctx.ui.theme, m, nowPerf), intervalMs: 80 });
	};

	// Deduplicação anti-flicker: nunca reenvia a mesma string ao TUI se o SGR quantizado não mudou.
	const render = (ctx: ExtensionContext, nowPerf = performance.now()) => {
		const theme = ctx.ui.theme as Fg;
		let next: string;
		if (movimento() === "desligado") next = theme.fg("syntaxType", "trabalhando… · esc interrompe");
		else {
			const agora = Date.now();
			const quieto = running.size === 0 ? agora - ultimoEvento : 0;
			const tok = tokensTexto(tokExatos, Math.round(tokChars / 4));
			marcaTravado(quieto >= TRAVA_MS);
			if (quieto >= TRAVA_MS) {
				next =
					theme.fg("warning", `sem resposta há ${formatElapsed(quieto)}`) +
					theme.fg(
						"syntaxType",
						` · ${formatElapsed(agora - startedAt)}${tok ? ` · ${tok}` : ""} · esc interrompe`,
					);
			} else {
				const full = phaseText({ phase, tools: [...running.values()], elapsedMs: agora - startedAt });
				const dotIdx = full.indexOf(" · ");
				const head = dotIdx > 0 ? full.slice(0, dotIdx) : full;
				let tail = dotIdx > 0 ? full.slice(dotIdx) : "";
				if (tok) tail = tail.replace(/ · esc interrompe$/, ` · ${tok} · esc interrompe`);
				const cyanRgb = safeAnsi(() => theme.getFgAnsi?.("syntaxType"));
				next = cyanRgb
					? shimmerText(head, cyanRgb, nowPerf, () => theme.fg("syntaxType", head)) + theme.fg("syntaxType", tail)
					: theme.fg("syntaxType", head + tail);
			}
			const dica = dicasLigadas() ? dicaDe(agora - startedAt) : "";
			if (dica) next += `\n${theme.fg("dim", `dica: ${dica}`)}`;
			indicador(ctx, travaMistura(quieto), nowPerf);
		}
		if (next === lastSent) return;
		lastSent = next;
		ctx.ui.setWorkingMessage(next);
	};

	nycode.registerCommand?.("dicas", {
		description: "Liga ou desliga as dicas de atalho na espera",
		handler: async (_args, ctx) => {
			const liga = !dicasLigadas();
			(globalThis as Record<symbol, unknown>)[DICAS_CHAVE] = liga;
			try {
				gravarEstado({ dicas: liga });
			} catch (e) {
				ctx.ui.notify(`ui-state.json não gravado: ${e instanceof Error ? e.message : e}`, "warning");
			}
			ctx.ui.notify(`Dicas na espera ${liga ? "ligadas" : "desligadas"}`, "info");
		},
	});

	nycode.on("session_start", (_e, ctx) => {
		(globalThis as Record<symbol, unknown>)[DICAS_CHAVE] = lerEstado().dicas !== false;
		if (!enabled(ctx)) return;
		mistura = 0;
		ctx.ui.setWorkingIndicator({ frames: frames(ctx.ui.theme, movimento() === "normal"), intervalMs: 80 });
		ctx.ui.setHiddenThinkingLabel(`${icon("think")}${iconGap()}raciocínio · clique abre`);
	});
	nycode.on("agent_start", (_e, ctx) => {
		if (!enabled(ctx)) return;
		stop();
		activeTurn = true;
		startedAt = Date.now();
		evento();
		tokExatos = 0;
		tokChars = 0;
		phase = "pensando";
		running.clear();
		render(ctx);
		// Relógio único: 30 fps com shimmer, 1 tique por segundo em `reduzido` ou sem foco; em `desligado` nada assina.
		unsubFast = assinarQuadro("working-status", (now) => {
			if (!activeTurn) return false;
			render(ctx, now);
			return true;
		});
	});
	nycode.on("message_update", (e, ctx) => {
		if (!enabled(ctx) || !activeTurn) return;
		evento();
		const d = e?.assistantMessageEvent;
		if ((d?.type === "text_delta" || d?.type === "thinking_delta") && typeof d.delta === "string")
			tokChars += d.delta.length;
		phase = "escrevendo";
	});
	nycode.on("message_end", (e, ctx) => {
		if (!enabled(ctx) || !activeTurn || e?.message?.role !== "assistant") return;
		const out = Number(e.message.usage?.output);
		if (Number.isFinite(out) && out > 0) {
			tokExatos += out;
			tokChars = 0;
		}
		evento();
		render(ctx);
	});
	nycode.on("tool_execution_start", (e, ctx) => {
		if (!enabled(ctx) || !activeTurn) return;
		evento();
		running.set(e.toolCallId, { name: e.toolName, target: toolTarget(e.args) });
		render(ctx);
	});
	nycode.on("tool_execution_end", (e, ctx) => {
		if (!enabled(ctx) || !activeTurn) return;
		evento();
		running.delete(e.toolCallId);
		if (running.size === 0) phase = "pensando";
		render(ctx);
	});
	nycode.on("agent_settled", (_e, ctx) => {
		if (!enabled(ctx)) return;
		stop();
		running.clear();
		if (mistura) indicador(ctx, 0, performance.now());
		ctx.ui.setWorkingMessage();
	});
	nycode.on("session_shutdown", () => stop());
}
