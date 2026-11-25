/** Pure end-of-turn rules: outcome, user away, duration, session title and provider error causes. */

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

/**
 * Provider error causes (one table; the core has the same table in modes/interactive/avisos/causas.ts with a parity
 * test). Pure: error text -> label, title, action, code, message.
 */

export interface Causa {
	id: "limite" | "conta" | "pedido" | "fora" | "rede" | "outro";
	rotulo: string;
	titulo: string;
	acao: string;
	codigo: string;
	mensagem: string;
}

type Base = Omit<Causa, "codigo" | "mensagem">;

const LIMITE: Base = {
	id: "limite",
	rotulo: "limite de uso do provedor",
	titulo: "O provedor está limitando o uso",
	acao: "↑ traz o pedido de volta · /model troca de modelo",
};
const CONTA: Base = {
	id: "conta",
	rotulo: "conta não reconhecida pelo provedor",
	titulo: "O provedor não reconheceu a sua conta",
	acao: "/login entra de novo",
};
const PEDIDO: Base = {
	id: "pedido",
	rotulo: "pedido recusado pelo provedor",
	titulo: "O provedor recusou o pedido",
	acao: "↑ traz o pedido de volta · /bug relata ao nycode",
};
const FORA: Base = {
	id: "fora",
	rotulo: "provedor fora do ar",
	titulo: "O provedor está fora do ar",
	acao: "↑ traz o pedido de volta",
};
const REDE: Base = {
	id: "rede",
	rotulo: "sem conexão com o provedor",
	titulo: "Sem conexão com o provedor",
	acao: "↑ traz o pedido de volta",
};
const OUTRO: Base = {
	id: "outro",
	rotulo: "falha no nycode",
	titulo: "Algo falhou no nycode",
	acao: "/bug relata ao nycode",
};

const POR_PALAVRA: Array<[RegExp, Base]> = [
	[/rate_limit|rate limit/i, LIMITE],
	[/authentication|unauthorized|permission_error|invalid_grant/i, CONTA],
	[/invalid_request/i, PEDIDO],
	[/overloaded/i, FORA],
	[/ECONNREFUSED|ECONNRESET|ENOTFOUND|ETIMEDOUT|fetch failed|network|socket/i, REDE],
];

function porStatus(status: number): Base | undefined {
	if (status === 429) return LIMITE;
	if (status === 401 || status === 403) return CONTA;
	if ([400, 404, 413, 422].includes(status)) return PEDIDO;
	if (status >= 500 && status <= 599) return FORA;
	return undefined;
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");
/** Texto aparado ou vazio: igual ao `texto` do core (runtime.mjs), a referência. */
const texto = (v: unknown): string => (typeof v === "string" && v.trim() ? v.trim() : "");

/** JSON do provedor no fim do texto (`Error: 400: {...}`); objeto vazio se não houver ou não for JSON. */
type Json = Record<string, unknown>;
function jsonDe(texto: string): Json {
	const i = texto.indexOf("{");
	if (i < 0) return {};
	try {
		const o = JSON.parse(texto.slice(i));
		return o && typeof o === "object" ? o : {};
	} catch {
		return {};
	}
}

export function causa(entrada: string): Causa {
	const original = str(entrada)
		.trim()
		.replace(/^error:\s*/i, "");
	const m = /^(\d{3})\b/.exec(original);
	const status = m ? Number(m[1]) : undefined;
	const base =
		(status !== undefined ? porStatus(status) : undefined) ??
		POR_PALAVRA.find(([re]) => re.test(original))?.[1] ??
		OUTRO;
	const json = jsonDe(original);
	const interno = json.error && typeof json.error === "object" ? (json.error as Json) : json;
	const tipoDe = (o: Json): string => (texto(o.type) && o.type !== "error" ? texto(o.type) : "");
	const tipo = tipoDe(interno) || tipoDe(json);
	const codigo = [m?.[1], tipo].filter(Boolean).join(" ");
	const mensagem = texto(interno.message) || texto(json.message) || texto(json.error) || original;
	return { ...base, codigo, mensagem };
}
