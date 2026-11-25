/**
 * `subagent status` legível (antes o texto cru em inglês do nycode sob `│`). Lê as linhas reais do nycode
 * (background.ts formatStatus e fleet/source.ts fleetStatusLines): o cabeçalho ganha a contagem por estado e cada run vira
 * `├ agente · estado · fatos · id · tarefa`. Linha não reconhecida segue como texto (o chamador a põe sob `│`); nada inventado.
 */
import { fitLine } from "../motion/chrome.ts";
import type { SubE } from "./chips.ts";

type Tema = { fg: (c: string, t: string) => string };
export type RunStatus = { id: string; agente: string; e: SubE; fatos: string[]; tarefa: string };
export type Status = { runs: RunStatus[]; resto: string[] };

// `bg-1 general-purpose: done (exit 0, 14 turns) - tarefa` (registro) e `fg-1 general-purpose running · 4t · $0.09 · 00:19 · atividade` (lanes).
const REG = /^(\S+) (\S+): (running|done|failed|cancelled)(?: \(exit (-?\w+|\?), (\d+) turns?\))? - (.*)$/;
const LANE =
	/^\s*(\S+) (\S+) (running|done|failed|cancelled|\w+)(?: \(partial\))?(?: depth \d+)? · (\d+)t · \$([\d.]+) · ([\d:]+)(?: · (.*))?$/;
const VAZIO = /^No background (?:subagent )?runs/;
const TOK: Record<SubE, string> = { run: "syntaxType", ok: "success", err: "error", stop: "warning" };
const NOME: Record<SubE, string> = { run: "executando", ok: "concluído", err: "falhou", stop: "cancelado" };
const PLURAL: Record<SubE, string> = { run: "executando", ok: "concluídos", err: "falharam", stop: "cancelados" };
const ORDEM: SubE[] = ["run", "ok", "err", "stop"];
const estado = (s: string, exit?: string): SubE =>
	s === "running" ? "run" : s === "cancelled" ? "stop" : s === "failed" || (exit && exit !== "0") ? "err" : "ok";
const turnos = (n: number) => `${n} ${n === 1 ? "turno" : "turnos"}`;

/** Status reconhecido, ou undefined quando nenhuma linha é do formato do nycode (o chamador mostra o texto como veio). */
export function statusDe(texto: string): Status | undefined {
	const runs: RunStatus[] = [],
		resto: string[] = [];
	let viu = false;
	for (const l of texto.split("\n")) {
		if (!l.trim() || l.trim() === "Agent lanes:") continue;
		if (VAZIO.test(l.trim())) {
			viu = true;
			continue;
		}
		const r = REG.exec(l),
			f = r ? null : LANE.exec(l);
		if (r)
			runs.push({
				id: r[1]!,
				agente: r[2]!,
				e: estado(r[3]!, r[4]),
				fatos: [r[4] && r[4] !== "0" ? `exit ${r[4]}` : "", r[5] ? turnos(Number(r[5])) : ""].filter(Boolean),
				tarefa: r[6]!.trim(),
			});
		else if (f)
			runs.push({
				id: f[1]!,
				agente: f[2]!,
				e: estado(f[3]!),
				fatos: [f[6]!, turnos(Number(f[4])), `US$ ${Number(f[5]).toFixed(2).replace(".", ",")}`],
				tarefa: (f[7] ?? "").trim(),
			});
		else resto.push(l);
	}
	return viu || runs.length ? { runs, resto } : undefined;
}

/** Contagem por estado para o cabeçalho (`2 executando · 13 concluídos`); sem runs, `nenhum run` em dim. */
export function resumoStatus(t: Tema, s: Status, sep: string): string {
	if (!s.runs.length) return t.fg("dim", "nenhum run");
	return ORDEM.map((e) => [e, s.runs.filter((r) => r.e === e).length] as const)
		.filter(([, n]) => n)
		.map(([e, n]) => t.fg(TOK[e], `${n} ${n === 1 ? NOME[e] : PLURAL[e]}`))
		.join(sep);
}

/** Uma linha por run, `├/└` na coluna `col`, e as linhas não reconhecidas sob `│`. */
export function linhasStatus(t: Tema, s: Status, col: number, w: number, sep: string): string[] {
	const pre = " ".repeat(col);
	const runs = s.runs.map((r, i) => {
		const ult = i === s.runs.length - 1 && !s.resto.length;
		const partes = [
			t.fg("text", r.agente),
			t.fg(TOK[r.e], NOME[r.e]),
			...r.fatos.map((x) => t.fg("dim", x)),
			t.fg("dim", r.id),
			r.tarefa ? t.fg("dim", r.tarefa) : "",
		].filter(Boolean);
		return fitLine(`${pre}${t.fg("borderMuted", ult ? "└" : "├")} ${partes.join(sep)}`, w);
	});
	return [...runs, ...s.resto.map((l) => fitLine(`${pre}${t.fg("dim", "│")} ${l.trim()}`, w))];
}
