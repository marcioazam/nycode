/**
 * Ferramenta `memory` em uma linha (lab /memoria, desenho 9 "Frase compacta" + "Nasce do fundo"; antes cartão
 * neutro `● memory · save nome · descrição` e o texto cru do resultado fora dele):
 *   ` <MEM> <Memory> · <salvou|leu|apagou|listou|falhou> · <nome>` (erro: `· <motivo>`), hora dim à direita, sem fundo.
 * Estado na cor da ação (save success, read accent, delete warning, list syntaxType, erro error); `·` neutros (dim).
 * read e list ganham o trecho abaixo (recuo 3). Executando: o ícone respira (sem spinner). O resultado do tool é texto
 * cru em inglês (nycode memory.ts), então a ação vem dos args e o desfecho/contagem do texto.
 */
import { visibleWidth } from "@nycode/tui";
import { icon, nerdFont } from "../icons.ts";
import { NASCE_MS, nasce } from "../moldura/nasce.ts";
import { fitLine } from "../motion/chrome.ts";
import { anima, respira } from "../motion/motion.ts";
import { idadeFim, tocar } from "../motion/vivo.ts";

export type Acao = "save" | "read" | "delete" | "list";
export type MemVisto = { nome: string; erro?: string; trecho: string[] };
export type MemEstado = { uiMem?: MemVisto };
type Tema = {
	fg: (c: string, t: string) => string;
	bold: (t: string) => string;
	getFgAnsi?: (c: string) => string;
	getBgAnsi?: (c: string) => string;
};
type Ctx = { toolCallId?: string; invalidate?: () => void; isError?: boolean; isPartial?: boolean };
type Bloco = { type?: string; text?: string };

const COR: Record<Acao | "erro", string> = {
	save: "success",
	read: "accent",
	delete: "warning",
	list: "syntaxType",
	erro: "error",
};
const PALAVRA: Record<Acao | "erro", string> = {
	save: "saved",
	read: "read",
	delete: "deleted",
	list: "listed",
	erro: "failed",
};
const ERROS: [RegExp, string][] = [
	[/^No memory named /, "não encontrada"],
	[/could not be read/, "leitura falhou"],
	[/could not be removed/, "arquivo não removido"],
	[/delete failed/i, "não apagada"],
	[/requires name/, "nome ausente"],
	[/unavailable|is disabled/, "indisponível"],
];
const acaoDe = (a: Record<string, unknown> | undefined): Acao | undefined =>
	(["save", "read", "delete", "list"] as const).find((x) => x === a?.action);

/** Nome, erro curto e trecho (read: 2 linhas do corpo; list: `a · b · c · +N`) a partir do texto cru do tool. */
export function resumoMemoria(result: unknown, args: Record<string, unknown> | undefined, erro: boolean): MemVisto {
	const texto = ((result as { content?: Bloco[] } | undefined)?.content ?? [])
		.filter((b) => b.type === "text")
		.map((b) => b.text ?? "")
		.join("\n");
	const acao = acaoDe(args);
	const nome =
		acao === "list"
			? ""
			: (/^(?:Saved|Deleted) memory (.+?)(?:[.,]| from )/.exec(texto)?.[1] ??
				(typeof args?.name === "string" ? args.name : ""));
	const motivo =
		ERROS.find(([re]) => re.test(texto))?.[1] ??
		(erro
			? (texto
					.split("\n")
					.find((l) => l.trim())
					?.trim() ?? "erro")
			: undefined);
	if (motivo) return { nome, erro: motivo, trecho: [] };
	if (acao === "read")
		return {
			nome,
			trecho: texto
				.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "")
				.split("\n")
				.map((l) => l.trimEnd())
				.filter((l) => l.trim())
				.slice(0, 2),
		};
	if (acao !== "list") return { nome, trecho: [] };
	const nomes = texto.split("\n").flatMap((l) => /^- \[([^\]]+)\]/.exec(l)?.[1] ?? []);
	return {
		nome: `${nomes.length} ${nomes.length === 1 ? "memória" : "memórias"}`,
		trecho: nomes.length
			? [[...nomes.slice(0, 3), ...(nomes.length > 3 ? [`+${nomes.length - 3}`] : [])].join(" · ")]
			: [],
	};
}

/** Linhas da chamada para a largura `w`; `hora` já formatada ('' enquanto roda). `agora` injeta o relógio nos testes. */
export function linhaMemoria(
	args: Record<string, unknown> | undefined,
	st: MemEstado,
	t: Tema,
	ctx: Ctx,
	w: number,
	hora: string,
	o: { agora?: () => number } = {},
): string[] {
	const roda = ctx.isPartial !== false && !ctx.isError;
	const v = st.uiMem;
	const acao = acaoDe(args);
	const now = o.agora ? o.agora() : roda ? tocar(ctx) : performance.now();
	const mem = nerdFont() ? "\u{f09d1}" : icon("memory");
	const ic = roda ? respira(t, now, mem, "accent") : t.fg("muted", mem);
	const sep = t.fg("dim", " · ");
	const chave = roda || !acao ? undefined : v?.erro ? "erro" : acao;
	const nome = v?.nome ?? (acao === "list" ? "" : typeof args?.name === "string" ? args.name : "");
	const esq = `${ic} ${t.fg("text", t.bold("Memory"))}${chave ? sep + t.fg(COR[chave], PALAVRA[chave]) : ""}${nome ? sep + t.fg("text", nome) : ""}${!roda && v?.erro ? sep + t.fg("error", v.erro) : ""}`;
	const dir = hora ? t.fg("dim", hora) : "";
	const rw = visibleWidth(dir);
	const e = fitLine(esq, Math.max(1, w - rw - (rw ? 2 : 0)));
	const linha = e + (rw ? " ".repeat(Math.max(2, w - visibleWidth(e) - rw)) + dir : "");
	const rows = [
		fitLine(linha, w),
		...(roda ? [] : (v?.trecho ?? []).map((l) => `   ${t.fg("muted", fitLine(l, w - 3))}`)),
	];
	return nasce(rows, t, anima() ? idadeFim(ctx, NASCE_MS, o.agora?.()) : undefined);
}
