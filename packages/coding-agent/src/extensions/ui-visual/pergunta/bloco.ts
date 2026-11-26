/**
 * Resultado da tool `question` em "Resposta em destaque" (lab /pergunta desenho 7 + "Nasce e sai"; antes um
 * cartão verde toolSuccessBg com `pergunta · cabeçalho  resposta` e o texto atrás de um trilho │). Sem fundo; por pergunta:
 *   ` cabeçalho · texto da pergunta (dim)`   + `ctrl+o abre` e a hora em pílula só na 1ª pergunta
 *   ` ❯ resposta` (negrito: success; sem resposta/tempo esgotado em warning; `(outra)` dim se digitada)
 * e uma linha em branco entre as perguntas. Aberto (ctrl+o) lista as opções sob cada resposta. Aguardando = o texto
 * `aguardando resposta` respira entre dim e syntaxType (sem spinner). Entrada: o bloco sobe do fundo em NASCE_MS na 1ª vez
 * que aparece ao vivo; o histórico já o mostra pronto; movimento reduzido ou NO_COLOR, também.
 */
import { visibleWidth } from "@nycode/tui";
import { dicaTecla } from "../icons.ts";
import { fitLine } from "../motion/chrome.ts";
import { anima, esmaecer, respira, safeAnsi } from "../motion/motion.ts";
import { idadeFim, tocar } from "../motion/vivo.ts";

export const NASCE_MS = 450;
type Tema = {
	fg: (c: string, t: string) => string;
	bold: (t: string) => string;
	getFgAnsi?: (c: string) => string;
	getBgAnsi?: (c: string) => string;
};
type Ctx = { toolCallId?: string; invalidate?: () => void };
export type Pergunta = {
	question?: string;
	header?: string;
	options?: string[];
	answer?: string | null;
	wasCustom?: boolean;
	multiSelect?: boolean;
	timedOut?: boolean;
	skipped?: boolean;
	delegated?: boolean;
	note?: string;
	pending?: boolean;
};
const LABEL_TAG = /^(.*\S)\s*\(([^()]*)\)\s*$/;
const nascidas = new Map<string, number>(); // chamada -> instante em que o bloco nasceu; o histórico nunca entra
const ease = (x: number) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 3;

/** As perguntas do resultado (lote em `questions`, ou a única no próprio `details`); undefined sem `details`. */
export function perguntasDe(result: unknown): Pergunta[] | undefined {
	const d = (result as { details?: Pergunta & { questions?: Pergunta[] } } | undefined)?.details;
	if (!d || typeof d !== "object") return undefined;
	return Array.isArray(d.questions) && d.questions.length ? d.questions : [d];
}

function resposta(t: Tema, p: Pergunta, now: number): string {
	const r = p.answer ?? "";
	if (p.skipped) return t.fg("dim", "↷ pulada · o agente decide");
	if (p.delegated) return t.fg("accent", "decide você") + (p.note ? t.fg("dim", ` · ${p.note}`) : "");
	if (p.pending) return t.fg("dim", "não respondida");
	if (p.answer === undefined) return respira(t, now, "aguardando resposta");
	if (p.answer === null) return t.fg("warning", "sem resposta · Esc");
	if (p.timedOut && r === "") return t.fg("warning", "tempo esgotado · seguiu sem resposta");
	const mostra = p.wasCustom || p.multiSelect ? r : (LABEL_TAG.exec(r)?.[1] ?? r);
	return (
		t.bold(t.fg("success", mostra)) +
		(p.wasCustom ? t.fg("dim", " (outra)") : "") +
		(p.note ? t.fg("dim", ` · nota: ${p.note}`) : "")
	);
}

/** Linhas do bloco para a largura `w`, na margem do chat (antes recuo LEAD + 1 espaço, 3 colunas para dentro). */
export function perguntaBloco(
	ps: Pergunta[],
	t: Tema,
	w: number,
	o: { hora: string; dica?: string; tecla: string; now: number; aberto: boolean },
): string[] {
	const W = Math.max(1, w);
	const sep = t.fg("dim", " · ");
	return ps.flatMap((p, i) => {
		const q = (p.question ?? "").replace(/\s+/g, " ").trim();
		const esq = `${[p.header ? t.fg("muted", p.header) : "", q ? t.fg("dim", q) : ""].filter(Boolean).join(sep)}`;
		// Atalho e hora à direita, sem pílula, a hora terminando na margem direita (coluna da hora do Read).
		const dir =
			i === 0
				? [
						W >= 60 && o.dica ? dicaTecla(t as never, o.tecla || "ctrl+o", o.dica) : "",
						o.hora ? t.fg("dim", o.hora) : "",
					]
						.filter(Boolean)
						.join("  ")
				: "";
		const rw = visibleWidth(dir),
			e = dir && W - rw >= 12 ? fitLine(esq, W - rw - 2) : "";
		const l1 = e ? e + " ".repeat(Math.max(2, W - visibleWidth(e) - rw)) + dir : fitLine(esq, W);
		const marcado = (l: string) =>
			p.wasCustom || p.answer == null
				? false
				: p.multiSelect
					? `, ${p.answer}, `.includes(`, ${l}, `)
					: p.answer === l;
		const opcoes = o.aberto
			? (p.options ?? []).map((l) =>
					fitLine(
						`  ${marcado(l) ? t.fg("success", "●") : t.fg("dim", "○")} ${t.fg(marcado(l) ? "text" : "dim", l)}`,
						W,
					),
				)
			: [];
		return [...(i ? [""] : []), l1, fitLine(`${t.fg("accent", "❯")} ${resposta(t, p, o.now)}`, W), ...opcoes];
	});
}

/** Entrada "Nasce do fundo": só na 1ª vez que o bloco aparece ao vivo (idadeFim conhece o fim da chamada); histórico já pronto. */
function nasce(rows: string[], t: Tema, ctx: Ctx, agora: number): string[] {
	const id = ctx.toolCallId;
	if (!id || !anima()) return rows;
	const idade = nascidas.has(id) ? undefined : idadeFim(ctx, NASCE_MS, agora);
	if (idade !== undefined) {
		if (nascidas.size > 300) nascidas.clear();
		nascidas.set(id, agora - idade);
	}
	const t0 = nascidas.get(id);
	const k = t0 === undefined ? 1 : (agora - t0) / NASCE_MS;
	const fundo = safeAnsi(() => t.getBgAnsi?.("customMessageBg")),
		texto = safeAnsi(() => t.getFgAnsi?.("text"));
	return k < 1 && fundo && texto ? rows.map((r) => (r ? esmaecer(r, ease(k), fundo, texto) : r)) : rows;
}

/** Componente do resultado: `hora` e `tecla` são lidos a cada desenho; `agora` injeta o relógio nos testes. */
export function perguntaCorpo(
	ps: Pergunta[],
	t: Tema,
	ctx: Ctx,
	o: { hora: () => string; tecla: string; aberto: boolean; agora?: () => number },
): { render: (w: number) => string[]; invalidate: () => void } {
	return {
		render: (w) => {
			const agora = o.agora?.() ?? performance.now();
			const espera = ps.some((p) => p.answer === undefined && !p.pending && !p.skipped && !p.delegated);
			const now = espera && !o.agora ? tocar(ctx) : agora;
			const uw = Math.max(1, w);
			const rows = perguntaBloco(ps, t, uw, {
				hora: uw >= 30 ? o.hora() : "",
				dica: o.aberto ? "fecha" : "abre",
				tecla: o.tecla,
				now,
				aberto: o.aberto,
			});
			return nasce(rows, t, ctx, agora);
		},
		invalidate() {},
	};
}
