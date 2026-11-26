/**
 * Plan gate do nycode: um plano aprovado roda até o fim e fecha com o `plan-reviewer`.
 *
 * Porta do hook plan/plan_gate.py do harness. No Claude, o hook guarda estado em arquivos e lê um ledger de edições;
 * no nycode tudo já está no ramo da sessão, então o estado é derivado dele:
 * - aprovação: a última mensagem `plan-mode-execute` (plan-mode, "Execute the plan");
 * - veredito: a linha `PLAN_REVIEW: complete|incomplete` no resultado de um `subagent` que chamou `plan-reviewer`
 *   (single ou `tasks`); a posição da chamada é o início da revisão, então uma edição durante, depois ou na mesma mensagem a invalida;
 * - edições: chamadas `edit`/`write` depois da aprovação (como o ledger do Claude, `bash` não conta);
 * - libera sem bloquear: `PLAN CANCELLED` (encerra), `PLAN BLOCKED:`, `PLAN WAITING:` (ou `PLANO ...`) na resposta
 *   final, e plan mode ligado;
 * - parada abortada pelo usuário (Esc, Enviar agora): libera (`user_interrupt`) sem contar;
 * - desiste (com aviso) depois de 3 paradas sem progresso ou 30 bloqueios.
 * Bloquear = `agent_before_settle` acrescenta uma mensagem `plan-gate` e pede continuação. Cada decisão grava uma
 * entrada `custom` `plan-gate` (estado, contadores, assinatura), que também é o log. `NYCODE_PLAN_GATE=0` (ou `plan.gate: false`) desliga.
 * Falha aberta: qualquer exceção libera. Testes: test/harness/extensions/plan-gate/index.test.ts.
 */

import type { Component } from "@nycode/tui";
import type { ExtensionAPI, MessageRenderOptions, SessionBoundaryDraft } from "../../core/extensions/types.ts";
import { resolveNycodeSettings } from "../../core/settings-nycode.ts";
import { estadoBg } from "../ui-visual/icons.ts";

type Entry = Record<string, any>;
export interface GateRecord {
	state: "blocked" | "allowed" | "completed" | "cancelled" | "gave_up";
	why: string;
	blocks: number;
	noProgress: number;
	sig: string;
}
export interface GateDecision {
	action: "none" | "allow" | "block" | "give_up";
	why?: string;
	message?: string;
	record?: GateRecord;
}

const MAX_NO_PROGRESS = 3;
const MAX_BLOCKS = 30;
const GAPS_LIMIT = 400;
const VERDICT = /^\s*PLAN_REVIEW:\s*(complete|incomplete)\b/gim;
// O marcador só vale no começo de uma linha (espaços e ênfase markdown antes), nunca citado no meio de uma frase.
const CANCELLED = /^[\s*_`]*(?:PLAN CANCELLED|PLANO CANCELADO)/im;
const BLOCKED = /^[\s*_`]*(?:PLAN BLOCKED:|PLANO BLOQUEADO:)/im;
const WAITING = /^[\s*_`]*(?:PLAN WAITING:|PLANO AGUARDANDO:)/im;
const STATES: Record<string, string> = {
	no_review: "no plan-reviewer verdict yet",
	review_incomplete: "the last review was incomplete",
	edit_after_review: "files were edited after the last complete review",
};
const INSTRUCTION =
	'Finish the remaining plan items and the final gate (gate-runner), then call subagent {agent: "plan-reviewer"} with ' +
	"the plan, the /docs record and the git base; fix every gap through workers, review again. Stop only on " +
	"PLAN_REVIEW: complete, or end with PLAN BLOCKED: <reason> (needs a user decision or authorization), " +
	"PLAN WAITING: <background work> or PLAN CANCELLED (user cancelled).";

const role = (e: Entry): string | undefined => (e.type === "message" ? e.message?.role : undefined);
const blocks = (e: Entry): Entry[] => (Array.isArray(e.message?.content) ? e.message.content : []);
const textOf = (e: Entry): string =>
	typeof e.content === "string"
		? e.content
		: blocks(e)
				.filter((b) => b?.type === "text")
				.map((b) => String(b.text ?? ""))
				.join("\n");

function callsReviewer(args: any): boolean {
	if (!args || typeof args !== "object") return false;
	if (args.agent === "plan-reviewer") return true;
	const many = [...(Array.isArray(args.tasks) ? args.tasks : []), ...(Array.isArray(args.chain) ? args.chain : [])];
	return many.some((t: any) => t?.agent === "plan-reviewer");
}

function gapsOf(before: string): string {
	const lines = before.trimEnd().split("\n");
	let start = lines.length;
	while (start > 0 && /^\s*[-*]\s/.test(lines[start - 1])) start--;
	const text = start < lines.length ? lines.slice(start).join(" ") : before;
	return text.replace(/\s+/g, " ").trim().slice(0, GAPS_LIMIT);
}

export function decidePlanGate(entries: Entry[], enabled = true): GateDecision {
	if (!enabled) return { action: "none" };
	let approved = -1;
	for (let i = entries.length - 1; i >= 0; i--) {
		if (entries[i].type === "custom_message" && entries[i].customType === "plan-mode-execute") {
			approved = i;
			break;
		}
	}
	if (approved < 0) return { action: "none" };

	let lastRecord: GateRecord | undefined;
	let planMode = false;
	let lastEdit = -1;
	let lastAssistant = "";
	let review: { at: number; verdict: string; gaps: string } | undefined;
	let progress = 0;
	let lastAborted = false;
	const reviewerCalls = new Map<string, number>();
	for (let i = approved + 1; i < entries.length; i++) {
		const e = entries[i];
		if (e.type === "custom" && e.customType === "plan-gate") lastRecord = e.data as GateRecord;
		if (e.type === "custom" && e.customType === "plan-mode") planMode = e.data?.enabled === true;
		if (role(e)) lastAborted = role(e) === "assistant" && e.message?.stopReason === "aborted";
		if (role(e) === "assistant") {
			const text = textOf(e);
			if (text.trim()) lastAssistant = text;
			for (const b of blocks(e)) {
				if (b?.type !== "toolCall") continue;
				progress++;
				if (b.name === "edit" || b.name === "write") lastEdit = i;
				if (b.name === "subagent" && callsReviewer(b.arguments)) reviewerCalls.set(String(b.id), i);
			}
		}
		if (
			role(e) === "toolResult" &&
			e.message?.toolName === "subagent" &&
			reviewerCalls.has(String(e.message?.toolCallId))
		) {
			const text = textOf(e);
			const matches = [...text.matchAll(VERDICT)];
			const last = matches.at(-1);
			review = last
				? {
						at: reviewerCalls.get(String(e.message.toolCallId)) ?? i,
						verdict: last[1].toLowerCase(),
						gaps: gapsOf(text.slice(0, last.index)),
					}
				: {
						at: reviewerCalls.get(String(e.message.toolCallId)) ?? i,
						verdict: "incomplete",
						gaps: "reviewer returned no PLAN_REVIEW line",
					};
		}
	}
	if (lastRecord && ["completed", "cancelled", "gave_up"].includes(lastRecord.state)) return { action: "none" };

	const prev = {
		blocks: lastRecord?.blocks ?? 0,
		noProgress: lastRecord?.noProgress ?? 0,
		sig: lastRecord?.sig ?? "",
	};
	const keep = (state: GateRecord["state"], why: string, extra: Partial<GateRecord> = {}): GateRecord => ({
		state,
		why,
		...prev,
		...extra,
	});
	// Esc ou Enviar agora do usuário: o plano segue ativo, sem cobrança nem contagem (contrato 2026-11-15).
	if (lastAborted) return { action: "allow", why: "user_interrupt", record: keep("allowed", "user_interrupt") };
	if (planMode) return { action: "allow", why: "plan_mode", record: keep("allowed", "plan_mode") };
	if (CANCELLED.test(lastAssistant))
		return { action: "allow", why: "marker_cancelled", record: keep("cancelled", "marker_cancelled") };
	if (BLOCKED.test(lastAssistant))
		return { action: "allow", why: "marker_blocked", record: keep("allowed", "marker_blocked", { noProgress: 0 }) };
	if (WAITING.test(lastAssistant))
		return { action: "allow", why: "marker_waiting", record: keep("allowed", "marker_waiting") };
	if (review?.verdict === "complete" && review.at > lastEdit) {
		return { action: "allow", why: "review_complete", record: keep("completed", "review_complete") };
	}

	const sig = `${progress}:${review?.at ?? "-"}`;
	const noProgress = sig === prev.sig ? prev.noProgress + 1 : 0;
	if (noProgress >= MAX_NO_PROGRESS || prev.blocks >= MAX_BLOCKS) {
		const message =
			`Plan gate stopped enforcing (${noProgress} stops without progress, ${prev.blocks} blocks). ` +
			"The plan still lacks PLAN_REVIEW: complete; run the plan-reviewer before treating the plan as done.";
		return {
			action: "give_up",
			why: "gave_up",
			message,
			record: { state: "gave_up", why: "gave_up", blocks: prev.blocks, noProgress, sig },
		};
	}
	const why = !review ? "no_review" : review.verdict !== "complete" ? "review_incomplete" : "edit_after_review";
	let head = `Plan gate: ${STATES[why]}.`;
	if (why === "review_incomplete" && review?.gaps) head += ` Gaps: ${review.gaps}`;
	// D5: o rastreador só lê a tag [DONE:n]; lembrar os passos abertos no bloqueio que já ia acontecer (zero turno extra).
	// Com D1 o plan-mode só grava quando muda: a última entrada pode vir antes da aprovação, então o ramo todo é lido.
	const tracker = entries.findLast((e) => e.type === "custom" && e.customType === "plan-mode")?.data?.todos;
	const open = (Array.isArray(tracker) ? tracker : [])
		.filter((t: any) => t && t.completed !== true && Number.isFinite(t.step))
		.map((t: any) => t.step);
	if (open.length > 0)
		head += ` Open plan steps: ${open.join(", ")}; write [DONE:n] in your final reply (the message without a tool call) for each one already finished.`;
	return {
		action: "block",
		why,
		message: `${head} ${INSTRUCTION}`,
		record: { state: "blocked", why, blocks: prev.blocks + 1, noProgress, sig },
	};
}

/** Aviso final (só tela): o texto em inglês de `decision.message` continua no GateDecision. */
export const giveUpNotice = (noProgress: number, blocks = 0): string =>
	`▲ Plano  parou de cobrar após ${noProgress >= MAX_NO_PROGRESS ? `${noProgress} avisos sem avanço` : `${blocks} avisos`} · rode o plan-reviewer antes de concluir`;

const wrap = (text: string, width: number): string[] => {
	const out: string[] = [];
	let line = "";
	for (const word of text.split(/\s+/).filter(Boolean)) {
		for (let w = word; w; w = w.slice(width)) {
			const piece = w.slice(0, width);
			if (line && line.length + 1 + piece.length <= width) line += ` ${piece}`;
			else {
				if (line) out.push(line);
				line = piece;
			}
			if (w.length <= width) break;
		}
	}
	return line ? [...out, line] : out;
};

/** Renderer do bloco `plan-gate` (só tela: `content` vai ao modelo sem mudança). Sem import de @nycode/tui: componente mínimo. */
/** The slice of the theme the gate line uses (methods: bivariant, so the core Theme fits). */
interface GateTheme {
	fg(c: string, s: string): string;
	bg?(c: string, s: string): string;
}

export function gateComponent(
	message: { content?: unknown; timestamp?: number; details?: { blocks?: number } },
	options: MessageRenderOptions,
	theme: GateTheme,
): Component & { handleMouse(e: { type: string; button: string }): { handled: boolean } | undefined } {
	const n = Number(message?.details?.blocks) || 1;
	const head = "▲ Plano  falta a revisão final (plan-reviewer) · o agente foi avisado";
	let virado = false; // clique esquerdo abre e fecha só este bloco
	return {
		invalidate() {},
		handleMouse(e: { type: string; button: string }) {
			if (e?.type !== "click" || e.button !== "left") return undefined;
			virado = !virado;
			return { handled: true };
		},
		render(width: number): string[] {
			const w = Math.max(1, width);
			const basePad = options?.outputPad ?? 1;
			const pad = Math.min(basePad + (w - 2 * (basePad + 2) >= 20 ? 2 : 0), Math.max(0, Math.floor((w - 1) / 2)));
			const iw = Math.max(1, w - 2 * pad);
			const side = " ".repeat(pad);
			// ▲ = aviso: com cor de fundo no tema, a faixa ganha o fundo de aviso na largura toda, padding simétrico e respiro vertical.
			const faixa = theme?.bg
				? (l: string, len: number) => estadoBg("warn", theme)(side + l + " ".repeat(Math.max(0, iw - len)) + side)
				: (l: string) => side + l;
			const frame = (rows: string[]) => (theme?.bg ? [faixa("", 0), ...rows, faixa("", 0)] : rows);
			if (!!options?.expanded !== virado) {
				const body = wrap(String(message?.content ?? ""), Math.max(1, iw - 2)).map((l) =>
					faixa(theme.fg("dim", `  ${l}`), l.length + 2),
				);
				return frame([faixa(theme.fg("warning", head.slice(0, iw)), Math.min(head.length, iw)), ...body]);
			}
			const key = String(options?.keyText?.("app.tools.expand") ?? "ctrl+o");
			const ts = Number(message?.timestamp); // ausente ou 0: sem hora
			const hora = ts > 0 ? new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
			const tail = ` · ${n > 1 ? `${n}ª vez · ` : ""}${key} abre`;
			const line = (head + tail).slice(0, iw);
			// Hora sozinha no canto direito, separada do atalho; sem espaço, some.
			const gap = iw - line.length - hora.length;
			const fim = hora && gap >= 2 ? " ".repeat(gap) + hora : "";
			// Tecla no azul do tema (`accent`) quando coube inteira; o resto do rabo segue em dim.
			const rabo = line.slice(head.length);
			const k = rabo.lastIndexOf(`${key} abre`);
			const rabic =
				k >= 0
					? theme.fg("dim", rabo.slice(0, k)) +
						theme.fg("accent", key) +
						theme.fg("dim", rabo.slice(k + key.length) + fim)
					: theme.fg("dim", rabo + fim);
			return frame([faixa(theme.fg("warning", line.slice(0, head.length)) + rabic, line.length + fim.length)]);
		},
	};
}

export default function planGateExtension(nycode: ExtensionAPI) {
	if (process.env.NYCODE_SUBAGENT === "1") return; // o gate vale para a sessão principal, não para os workers
	nycode.registerMessageRenderer?.("plan-gate", gateComponent); // sem a API o gate continua valendo, só sem a linha curta
	nycode.on("agent_before_settle", (event, ctx) => {
		try {
			const enabled = resolveNycodeSettings(nycode.getSettings(), process.env).plan.gate;
			const decision = decidePlanGate(ctx.sessionManager.getBranch() as Entry[], enabled);
			if (decision.action === "none" || !decision.record) return;
			const branch = ctx.sessionManager.getBranch() as Entry[];
			const prev = branch.findLast((e) => e.type === "custom" && e.customType === "plan-gate")?.data as
				| GateRecord
				| undefined;
			// Liberação repetida (mesmo state e why da última entrada) não cresce a sessão a cada parada.
			if (decision.action === "allow" && prev?.state === decision.record.state && prev.why === decision.record.why)
				return;
			const entries: SessionBoundaryDraft[] = [
				...event.entries,
				{ type: "custom", customType: "plan-gate", data: decision.record },
			];
			if (decision.action === "give_up") {
				ctx.ui.notify(giveUpNotice(decision.record.noProgress, decision.record.blocks), "warning");
				return { entries };
			}
			if (decision.action !== "block") return { entries };
			entries.push({
				type: "custom_message",
				customType: "plan-gate",
				content: decision.message ?? "",
				display: true,
				details: { blocks: decision.record.blocks },
			});
			return { entries, continue: true };
		} catch {
			return; // falha aberta: nunca prende a sessão
		}
	});
}
