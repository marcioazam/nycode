// Cause table and the plain-text formatters of the provider notices (contract shared with the avisos extension).

import type { Theme } from "../theme/theme.ts";
import type { tema } from "./base.ts";

type Fg = ReturnType<typeof tema>[0];
type Bold = ReturnType<typeof tema>[1];

export interface CausaInfo {
	rotulo: string;
	titulo: string;
	acao: string;
}
export type CausaId = "limite" | "conta" | "pedido" | "fora" | "rede" | "outro";

/** Cause table: single contract with the avisos extension (copy the texts literally). */
export const CAUSAS: Record<CausaId, CausaInfo> = {
	limite: {
		rotulo: "limite de uso do provedor",
		titulo: "O provedor está limitando o uso",
		acao: "↑ traz o pedido de volta · /model troca de modelo",
	},
	conta: {
		rotulo: "conta não reconhecida pelo provedor",
		titulo: "O provedor não reconheceu a sua conta",
		acao: "/login entra de novo",
	},
	pedido: {
		rotulo: "pedido recusado pelo provedor",
		titulo: "O provedor recusou o pedido",
		acao: "↑ traz o pedido de volta · /bug relata ao nycode",
	},
	fora: { rotulo: "provedor fora do ar", titulo: "O provedor está fora do ar", acao: "↑ traz o pedido de volta" },
	rede: {
		rotulo: "sem conexão com o provedor",
		titulo: "Sem conexão com o provedor",
		acao: "↑ traz o pedido de volta",
	},
	outro: { rotulo: "falha no nycode", titulo: "Algo falhou no nycode", acao: "/bug relata ao nycode" },
};

const POR_STATUS: Record<string, CausaId> = {
	"429": "limite",
	"401": "conta",
	"403": "conta",
	"400": "pedido",
	"404": "pedido",
	"413": "pedido",
	"422": "pedido",
};
const PALAVRAS: Array<[CausaId, string[]]> = [
	["limite", ["rate_limit", "rate limit"]],
	["conta", ["authentication", "unauthorized", "permission_error", "invalid_grant"]],
	["pedido", ["invalid_request"]],
	["fora", ["overloaded"]],
	["rede", ["econnrefused", "econnreset", "enotfound", "etimedout", "fetch failed", "network", "socket"]],
];

export interface Causa extends CausaInfo {
	id: CausaId;
	codigo: string;
	mensagem: string;
}

type Json = Record<string, unknown>;
const texto = (v: unknown): string => (typeof v === "string" && v.trim() ? v.trim() : "");

function lerJson(s: string): Json | null {
	const i = s.indexOf("{");
	if (i < 0) return null;
	try {
		const j: unknown = JSON.parse(s.slice(i));
		return j && typeof j === "object" ? (j as Json) : null;
	} catch {
		return null;
	}
}

/** Classifies the error text (`Error: <status>: <json>` or free text): HTTP status first, then keywords. */
export function causa(entrada: string | undefined): Causa {
	const original = String(entrada ?? "")
		.trim()
		.replace(/^error:\s*/i, "");
	const status = /^(\d{3})\b/.exec(original)?.[1] ?? "";
	const json = lerJson(original);
	const interno = json?.error && typeof json.error === "object" ? (json.error as Json) : json;
	const tipoDe = (o: Json | null): string => (texto(o?.type) && o?.type !== "error" ? texto(o?.type) : "");
	const tipo = tipoDe(interno) || tipoDe(json);
	const mensagem = texto(interno?.message) || texto(json?.message) || texto(json?.error) || original;
	const baixo = original.toLowerCase();
	let id: CausaId | "" = POR_STATUS[status] ?? (/^5\d\d$/.test(status) ? "fora" : "");
	if (!id) id = PALAVRAS.find(([, ps]) => ps.some((p) => baixo.includes(p)))?.[0] ?? "outro";
	return { id, ...CAUSAS[id], codigo: [status, tipo].filter(Boolean).join(" "), mensagem };
}

const sufixo = (c: Causa) => (c.codigo ? ` · ${c.codigo}` : "");

/** Indicator line while waiting (the warning color comes from the indicator). */
export const retryLinha = (
	erro: string | undefined,
	tentativa: number,
	max: number,
	segundos: number,
	tecla: string,
): string =>
	`${causa(erro).rotulo} · nova tentativa em ${segundos}s · ${tentativa} de ${max} · ${tecla === "escape" ? "esc" : tecla} cancela`;

/** Three-line block; `esgotou` when it came from an exhausted retry. No state icon in the chat: the title carries the error color. */
export function blocoErro(
	entrada: string | undefined,
	fg: Fg,
	bold: Bold,
	esgotou?: { tentativas: number; segundos?: number },
): string[] {
	const c = causa(entrada);
	const meio = esgotou
		? `Tentei ${esgotou.tentativas} vezes${esgotou.segundos === undefined ? "" : ` em ${esgotou.segundos}s`} e parei.`
		: c.mensagem;
	return [
		`${fg("error", bold(c.titulo))}${c.codigo ? ` ${fg("dim", `· ${c.codigo}`)}` : ""}`,
		`  ${meio}`,
		`  ${fg("dim", c.acao)}`,
	];
}

export const linhaAviso = (entrada: string | undefined, fg: Fg): string =>
	fg("warning", `${causa(entrada).rotulo}${sufixo(causa(entrada))}`);

export const ICONE_PARADA = "▪";
export const linhaInterrompido = (fg: Fg, bold: Bold = (s) => s): string =>
	fg("error", process.env.NYCODE_ASCII_ICONS ? "" : `${ICONE_PARADA} `) +
	fg("error", bold("interrompido por você")) +
	fg("dim", " · o que já foi escrito ficou");
export const PULSO_MS = 1200;
export const linhaCanceladas = (n: number, max: number, fg: Fg): string =>
	fg("dim", `novas tentativas canceladas por você · ${n} de ${max}`);

export type { Theme };
