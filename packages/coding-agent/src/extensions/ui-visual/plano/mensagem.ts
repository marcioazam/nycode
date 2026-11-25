/**
 * Mensagem `[plan-mode-execute]` em "Lista de etapas" + "Desliza". Recolhida:
 *   ` <\uf0ae>  Plano · estado                          feitas/TOTAL`
 *   `   ├ \uf42e 1. anterior` / `   ├ ● 2. atual (o ● respira, sem spinner)` / `   └ ○ 3. próxima`
 * Expandida (alt+o) devolve `undefined`: o nycode desenha o padrão, com o texto original. O progresso vem do ramo da sessão
 * (modelo.ts), redesenhado a cada quadro enquanto está na tela. Entrada: o bloco desliza 12 colunas da direita em 400 ms só
 * quando a mensagem acaba de chegar (< 400 ms); histórico nasce pronto; movimento reduzido ou NO_COLOR também.
 */
import { truncateToWidth, visibleWidth } from "@nycode/tui";
import { anima, assinarQuadro, intervaloContinuo, respira } from "../motion/motion.ts";
import { type Estado, type Plano, planoDe } from "./modelo.ts";

export const DESLIZA_MS = 400;
const DESLIZA_COLS = 12;
type Tema = { fg: (c: string, t: string) => string; bold: (t: string) => string; getFgAnsi?: (c: string) => string };
const ease = (x: number) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 3;
const ESTADO: Record<Estado, [string, string]> = {
	executando: ["executando", "syntaxType"],
	concluido: ["concluído", "success"],
	encerrado: ["encerrado", "warning"],
};

const lados = (e: string, d: string, w: number): string => {
	const gap = w - visibleWidth(e) - visibleWidth(d);
	return gap >= 1 ? e + " ".repeat(gap) + d : truncateToWidth(e, w, "…");
};

/** Linhas do bloco para a largura `w`; `ms` é o relógio da respiração. */
export function planoLinhas(p: Plano, t: Tema, w: number, ms: number): string[] {
	const [nome, tok] = ESTADO[p.estado];
	const aberta = p.etapas.findIndex((e) => !e.completed);
	const atual = aberta < 0 ? Math.max(0, p.etapas.length - 1) : aberta;
	const feitas = p.etapas.filter((e) => e.completed).length;
	const dir = p.total ? `${t.fg("dim", `${feitas}/${p.total}`)} ` : "";
	const cab = lados(
		` ${t.fg("muted", "\uf0ae")}  ${t.fg("accent", t.bold("Plano"))}${t.fg("dim", " · ")}${t.fg(tok, nome)}`,
		dir,
		w,
	);
	const k = Math.min(3, p.etapas.length);
	const ini = Math.max(0, Math.min(p.etapas.length - k, atual - 1));
	const itens = Array.from({ length: k }, (_, j) => {
		const i = ini + j,
			cur = i === atual && p.estado !== "concluido";
		const g = cur
			? p.estado === "executando"
				? respira(t, ms, "●", tok)
				: t.fg(tok, "\uf05e")
			: p.etapas[i]!.completed
				? t.fg("success", "\uf42e")
				: t.fg("borderMuted", "○");
		return `   ${t.fg("borderMuted", j === k - 1 ? "└" : "├")} ${g} ${t.fg(cur ? "text" : "dim", `${i + 1}. ${p.etapas[i]!.text}`)}`;
	});
	return [cab, ...itens].map((l) => truncateToWidth(l, Math.max(1, w), "…"));
}

/** "Desliza": o bloco entra 12 colunas à direita e assenta em 400 ms. */
export const deslizar = (ls: string[], w: number, idade: number): string[] => {
	const o = Math.round((1 - ease(idade / DESLIZA_MS)) * DESLIZA_COLS);
	return o ? ls.map((l) => truncateToWidth(" ".repeat(o) + l, w, "")) : ls;
};

type Msg = { content: string | { type: string; text?: string }[]; timestamp: number };
export type Deps = {
	entradas: () => Record<string, any>[] | undefined;
	agora?: () => number;
	/** Pede redesenho enquanto o bloco anima (a entrada e a respiração); o desenho em si lê o relógio. */
	animar?: () => void;
};
const textoDe = (c: Msg["content"]): string =>
	typeof c === "string" ? c : c.map((b) => (b.type === "text" ? (b.text ?? "") : "")).join("");

/** O renderer da mensagem: `undefined` expandido (texto original do nycode) ou o componente que se desenha a cada quadro. */
export function renderPlano(msg: Msg, expandido: boolean, t: Tema, d: Deps) {
	if (expandido) return undefined;
	const texto = textoDe(msg.content);
	const agora = d.agora ?? Date.now;
	return {
		invalidate() {},
		render(w: number): string[] {
			const p = planoDe(d.entradas(), texto, msg.timestamp);
			const idade = agora() - msg.timestamp;
			const anda = anima() && ((idade >= 0 && idade < DESLIZA_MS + 50) || p.estado === "executando");
			if (anda) d.animar?.();
			const ls = planoLinhas(p, t, w, agora());
			return anima() && idade >= 0 && idade < DESLIZA_MS ? deslizar(ls, w, idade) : ls;
		},
	};
}

/** Assinante do relógio único: redesenha enquanto o componente continua sendo desenhado (fora da tela, para). */
export function animador(redesenha: () => void): () => void {
	let visto = 0,
		saida: (() => void) | undefined;
	return () => {
		visto = performance.now();
		if (saida) return;
		saida = assinarQuadro("ui-visual-plano", (now) => {
			redesenha();
			if (now - visto <= Math.max(300, 3 * intervaloContinuo())) return true;
			saida = undefined;
			return false;
		});
	};
}
