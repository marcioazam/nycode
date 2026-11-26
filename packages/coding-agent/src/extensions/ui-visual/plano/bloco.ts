/**
 * Bloco de progresso do plano no chat em "Trilho" sem a barra lateral + "Pulso".
 * O nycode (patch zzzz…-plan-bloco-hook) consulta `globalThis.__nyPlanoBloco(estado)` para cada bloco que desenha (tags [DONE:n],
 * `PLAN WAITING|BLOCKED`, `PLAN CANCELLED`); devolver `undefined` mantém a exibição original. Quatro linhas, sem fundo:
 *   ` <ícone>  plano · <estado> · etapa N de T                      hora`   (hora dim, sem pílula)
 *   `    <barra 12 células> <pct%>`   `    atual: <etapa> · <saldo>`   `    <motivo> · <o que fazer>`
 * Estados: em espera, executando, aguardando subagentes (espera com id de segundo plano), bloqueado, concluído, cancelado.
 * Pulso: a cor do estado pulsa duas vezes (1,2 s) na chegada do bloco e a cada mudança de estado; depois assenta. Sem spinner.
 * Sem cor (NO_COLOR) o texto sai puro; movimento reduzido ou sem foco: sem pulso.
 */
import { truncateToWidth, visibleWidth } from "@nycode/tui";
import { noColor } from "../../ui/a11y.ts";
import { anima, highlightPeak, lerpRgb, parseRgb, safeAnsi } from "../motion/motion.ts";

type Tema = {
	fg: (c: string, t: string) => string;
	bold: (t: string) => string;
	getFgAnsi?: (c: string) => string;
	getBgAnsi?: (c: string) => string;
};
type Etapa = { step: number; text: string; completed?: boolean };
/** Dados do nycode (plan-mode/done-view.ts, `PlanoBloco`). */
export type EstadoBloco = {
	kind: "progresso" | "espera" | "bloqueado" | "cancelado";
	steps: readonly Etapa[];
	total: number;
	nums: number[];
	reason: string;
	bgId?: string;
	sentAt: string;
	width: number;
	streaming: boolean;
	theme?: unknown;
};
type E = "espera" | "exec" | "sub" | "bloq" | "conc" | "canc";

export const PULSO_MS = 1200;
export const CELULAS = 12;
const TOK: Record<E, string> = {
	espera: "bashMode",
	exec: "syntaxType",
	sub: "bashMode",
	bloq: "warning",
	conc: "success",
	canc: "muted",
};
const NOME: Record<E, string> = {
	espera: "em espera",
	exec: "executando",
	sub: "aguardando subagentes",
	bloq: "bloqueado",
	conc: "concluído",
	canc: "cancelado",
};
const PLANO = "\ueb9d",
	AVISO = "\uf421",
	OK = "\uf42e";
const PLANO_TEMA: Tema = { fg: (_c, s) => s, bold: (s) => s };

/** Estado exibido e progresso; `undefined` quando falta dado para desenhar sem inventar (a exibição original assume). */
function modelo(s: EstadoBloco): { e: E; feitas: number; atual?: string } | undefined {
	const titulo = (n: number) => s.steps.find((x) => x.step === n)?.text;
	if (s.kind === "progresso") {
		const ultima = Math.max(0, ...s.nums);
		if (s.total <= 0 || ultima <= 0 || titulo(ultima) === undefined) return undefined;
		return { e: ultima >= s.total ? "conc" : "exec", feitas: ultima, atual: titulo(ultima + 1) };
	}
	const e: E = s.kind === "espera" ? (s.bgId ? "sub" : "espera") : s.kind === "bloqueado" ? "bloq" : "canc";
	return { e, feitas: s.steps.filter((x) => x.completed).length, atual: s.steps.find((x) => !x.completed)?.text };
}

/** Linhas do bloco para o estado `s` com o tema `t`; `idade` (ms desde a chegada) só serve ao Pulso. */
export function blocoLinhas(s: EstadoBloco, t: Tema, idade: number, pulsa = true): string[] | undefined {
	const m = modelo(s);
	if (!m) return undefined;
	const { e, feitas } = m;
	const tot = s.total,
		tok = TOK[e];
	const dim = (x: string) => t.fg("dim", x),
		mut = (x: string) => t.fg("muted", x);
	const sep = dim(" · ");
	const pct = tot ? Math.round((feitas / tot) * 100) : 0;
	const f = tot ? Math.round((feitas / tot) * CELULAS) : 0;
	const barra = Array.from({ length: CELULAS }, (_, i) => (i < f ? t.fg(tok, "━") : t.fg("borderMuted", "╌"))).join(
		"",
	);
	const icone = t.fg(tok, e === "bloq" ? AVISO : e === "conc" ? OK : PLANO);
	const esq = ` ${icone}  ${t.fg("text", t.bold("plano"))}${sep}${t.fg(tok, t.bold(NOME[e]))}${tot ? `${sep}${mut(`etapa ${Math.min(tot, feitas + 1)} de ${tot}`)}` : ""}`;
	const dir = s.sentAt ? `${dim(s.sentAt)} ` : "";
	const gap = s.width - visibleWidth(esq) - visibleWidth(dir);
	const linhas = [
		dir
			? s.width > 0 && gap < 2
				? truncateToWidth(esq, s.width, "…")
				: `${esq}${" ".repeat(s.width > 0 ? gap : 2)}${dir}`
			: esq,
	];
	const r = "    ";
	if (tot) {
		linhas.push(`${r}${barra} ${dim(`${pct}%`)}`);
		const saldo = `${feitas} ${feitas === 1 ? "concluída" : "concluídas"}, ${tot - feitas === 1 ? "falta 1" : `faltam ${tot - feitas}`}`;
		if (e === "conc") linhas.push(`${r}${dim(`as ${tot} etapas foram concluídas`)}`);
		else if (e === "canc") linhas.push(`${r}${dim("plano cancelado")}`);
		else if (m.atual) linhas.push(`${r}${dim("atual:")} ${t.fg("text", m.atual)}${sep}${mut(saldo)}`);
	}
	const acao = {
		espera: `segundo plano · retoma sozinho, nada a fazer`,
		sub: `segundo plano${s.bgId ? ` · ${s.bgId}` : ""} · retoma sozinho, nada a fazer`,
		exec: "sem pendências · avança sozinho",
		bloq: "precisa de você · responda para continuar",
		conc: "nada a fazer",
		canc: "nada a fazer",
	}[e];
	linhas.push(`${r}${mut(s.reason ? `${s.reason} · ${acao}` : acao)}`);
	const out = s.width > 0 ? linhas.map((l) => truncateToWidth(l, s.width, "…")) : linhas;
	return pulsa ? pulsar(out, t, tok, idade) : out;
}

/** Pulso: a cor do estado vai ao pico e volta duas vezes em PULSO_MS (como o `pulso` do lab); depois assenta. */
export function pulsar(ls: string[], t: Tema, token: string, ms: number): string[] {
	const c = parseRgb(t.getFgAnsi?.(token));
	if (!c || ms < 0 || ms >= PULSO_MS) return ls;
	const pico = highlightPeak(
		c,
		safeAnsi(() => t.getBgAnsi?.("customMessageBg")),
	);
	const open = t.getFgAnsi!(token);
	const novo = `\x1b[38;2;${lerpRgb(c, pico, 0.5 - 0.5 * Math.cos((ms / 600) * 2 * Math.PI)).join(";")}m`;
	return ls.map((l) => l.split(open).join(novo));
}

export type Deps = { agora?: () => number /** Pede redesenho enquanto o Pulso anima. */; animar?: () => void };
const vistos = new Map<string, number>();

/** O gancho `__nyPlanoBloco`: texto do bloco, ou `undefined` (sem tema, dado insuficiente ou falha) para o nycode desenhar o original. */
export function blocoPlano(s: EstadoBloco, d: Deps = {}): string | undefined {
	const th = s.theme as Tema | undefined;
	if (!th || typeof th.fg !== "function" || typeof th.bold !== "function") return undefined;
	const agora = (d.agora ?? (() => performance.now()))();
	const chave = [
		s.kind,
		s.nums.join(","),
		s.reason,
		s.bgId ?? "",
		s.total,
		s.sentAt,
		s.steps.filter((x) => x.completed).length,
	].join("|");
	if (!vistos.has(chave)) {
		if (vistos.size >= 200) vistos.clear();
		vistos.set(chave, agora);
	}
	const idade = agora - vistos.get(chave)!;
	const cor = !noColor();
	const pulsa = cor && anima() && idade < PULSO_MS;
	if (pulsa) d.animar?.();
	return blocoLinhas(s, cor ? th : PLANO_TEMA, idade, pulsa)?.join("\n");
}
