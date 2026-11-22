/** Regras puras do fim de turno: desfecho, ausência do usuário, duração e título da sessão. */

import { basename } from "node:path";

/** Mesma regra do notify.ts do nycode: foco conhecido decide; sem foco, 30 s sem input. */
export const AWAY_AFTER_MS = 30_000;

export function ausente(focused: boolean | undefined, lastInputAt: number | undefined, now: number): boolean {
	if (focused !== undefined) return !focused;
	return lastInputAt === undefined || now - lastInputAt >= AWAY_AFTER_MS;
}

export type Desfecho = "terminou" | "erro" | "interrompido";

/** `aborted` (agent_settled) ou stopReason da última mensagem do assistente = você interrompeu; error/errorMessage = parou com erro. */
export function desfechoDe(messages: unknown, aborted?: boolean): { desfecho: Desfecho; erro: string } {
	if (aborted === true) return { desfecho: "interrompido", erro: "" };
	const lista = Array.isArray(messages) ? messages : [];
	const last = [...lista].reverse().find((m: { role?: unknown } | undefined) => m?.role === "assistant") as
		| { stopReason?: unknown; errorMessage?: unknown }
		| undefined;
	if (last?.stopReason === "aborted") return { desfecho: "interrompido", erro: "" };
	const erro = typeof last?.errorMessage === "string" ? last.errorMessage : "";
	if (last?.stopReason === "error" || erro) return { desfecho: "erro", erro };
	return { desfecho: "terminou", erro: "" };
}

export function duracao(ms: number): string {
	const s = Math.max(0, Math.round(ms / 1000));
	if (s < 60) return `${s}s`;
	const m = Math.floor(s / 60);
	if (m < 60) return `${m}m ${s % 60}s`;
	return `${Math.floor(m / 60)}h ${m % 60}m`;
}

/** Igual a baseTitle de extensions/ui/terminal.ts (teste de paridade): sessão · pasta. */
export const tituloSessao = (sessionName: string | undefined, cwd: string): string =>
	sessionName ? `${sessionName} · ${basename(cwd)}` : basename(cwd);
