/**
 * `plan_mode_complete` (o agente enviou o plano para revisão) em "Expandido" + "Cascata".
 * Aberto (alt+o): ` <ícone>  Plano · <estado> ──── hora  alt+o recolher`, o tier completo (muted), as etapas numeradas e o arquivo (dim).
 * Recolhido (escolha desta implementação: o lab só define o aberto): a linha do cabeçalho (`alt+o expandir`) e o arquivo. Ícone e `Plano`
 * neutros (muted/text, dois espaços); o estado segue colorido; `·` e hora dim, sem pílula; sem spinner (o ícone respira só enviando).
 * Fonte (nycode plan-mode/index.ts, só leitura): args `{plan}` (texto numerado, 1ª linha `Tier: …`, ou `@file`) e resultado em inglês:
 * `Plan submitted and saved to <arquivo>.`, `Plan not accepted… saved to <arquivo>…:\n- problema…`, `No plan file…`, `Not in plan mode…`.
 * Aprovado/ajustes pedidos (estados do lab) vêm de ação do usuário depois da chamada e não do resultado: não são desenhados.
 * Entrada Cascata: ao chegar o resultado cada linha se revela da esquerda, 80 ms depois da anterior, 300 ms cada, uma vez.
 */
import { truncateToWidth, visibleWidth } from "@nycode/tui";
import { icon, nerdFont } from "../icons.ts";
import { fitLine } from "../motion/chrome.ts";
import { anima, respira } from "../motion/motion.ts";
import { idadeFim, tocar } from "../motion/vivo.ts";

type Tema = { fg: (c: string, t: string) => string; bold: (t: string) => string; getFgAnsi?: (c: string) => string };
type Ctx = { toolCallId?: string; invalidate?: () => void; isError?: boolean; isPartial?: boolean; expanded?: boolean };
type Bloco = { type?: string; text?: string };
export type Pronto = { ok: boolean; rotulo: string; arquivo?: string; problemas: string[] };
export type ProntoEstado = { uiPronto?: Pronto };

export const CASCATA_ATRASO_MS = 80;
export const CASCATA_MS = 300;
const ease = (x: number) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 3;

/** Estado e arquivo a partir do texto cru do tool. */
export function resumoPronto(result: unknown, erro: boolean): Pronto {
	const texto = ((result as { content?: Bloco[] } | undefined)?.content ?? [])
		.filter((b) => b.type === "text")
		.map((b) => b.text ?? "")
		.join("\n");
	const arquivo = /(?:saved to|Saved to) (\S+?)(?:\. |\.$|\.\n|\s|$)/.exec(texto)?.[1];
	if (!erro && /^Plan submitted/.test(texto))
		return { ok: true, rotulo: "plano enviado para revisão", arquivo, problemas: [] };
	const rejeitado = /^Plan not accepted/.test(texto);
	const problemas = rejeitado
		? texto
				.split("\n")
				.filter((l) => l.startsWith("- "))
				.map((l) => l.slice(2))
		: [
				erro || !/^(No plan file|Not in plan mode)/.test(texto)
					? (texto
							.split("\n")
							.find((l) => l.trim())
							?.trim() ?? "erro")
					: /^No plan file/.test(texto)
						? "não há arquivo de plano para enviar"
						: "o modo plano não está ativo",
			];
	return { ok: false, rotulo: rejeitado ? "plano não aceito" : "plano não enviado", arquivo, problemas };
}

const quebra = (s: string, n: number): string[] => {
	const out: string[] = [];
	let cur = "";
	for (let p of s.split(" ")) {
		while (p.length > n) {
			if (cur) {
				out.push(cur);
				cur = "";
			}
			out.push(p.slice(0, n));
			p = p.slice(n);
		}
		if (cur && cur.length + 1 + p.length > n) {
			out.push(cur);
			cur = p;
		} else cur = cur ? `${cur} ${p}` : p;
	}
	return cur ? [...out, cur] : out;
};
const curto = (p: string): string => p.replace(process.env.HOME ?? "\0", "~");

/** Linhas da chamada para a largura `w`. `agora` injeta o relógio nos testes. */
export function linhasPronto(
	args: Record<string, unknown> | undefined,
	st: ProntoEstado,
	t: Tema,
	ctx: Ctx,
	w: number,
	hora: string,
	tecla: string,
	o: { agora?: () => number } = {},
): string[] {
	const v = st.uiPronto;
	const roda = !v && ctx.isError !== true && ctx.isPartial !== false;
	const exp = ctx.expanded === true && !roda;
	const now = o.agora ? o.agora() : roda ? tocar(ctx) : performance.now();
	const clip = nerdFont() ? "\uf0ea" : icon("plan"),
		x = nerdFont() ? "\uf00d" : icon("err");
	const ic = roda ? respira(t, now, clip, "muted") : t.fg("muted", v && !v.ok ? x : clip);
	const estado = roda ? "enviando o plano…" : (v?.rotulo ?? "plano não enviado");
	const cor = roda ? "syntaxType" : v?.ok ? "success" : "error";
	const dica = roda ? "" : `${t.fg("accent", tecla)}${t.fg("dim", exp ? " recolher" : " expandir")}`;
	const dir = [hora ? t.fg("dim", hora) : "", dica].filter(Boolean).join("  ");
	const esq = ` ${ic}  ${t.fg("text", t.bold("Plano"))}${t.fg("dim", " · ")}${t.fg(cor, estado)}`;
	const rw = visibleWidth(dir);
	const e = fitLine(esq, Math.max(1, w - rw - 5));
	const cab =
		rw && w - visibleWidth(e) >= rw + 4
			? `${e} ${t.fg("borderMuted", "─".repeat(Math.max(1, w - visibleWidth(e) - rw - 2)))} ${dir}`
			: e;
	const plano = typeof args?.plan === "string" ? args.plan : "";
	const tier = /^Tier:.*$/m.exec(plano)?.[0];
	const etapas = plano.split("\n").flatMap((l) => /^\d+\.\s+(.+?)\s*$/.exec(l)?.[1] ?? []);
	const arq = v?.arquivo ? [`   ${t.fg("dim", curto(v.arquivo))}`] : [];
	const corpo = roda
		? []
		: !v?.ok
			? [
					...(v?.problemas ?? []).flatMap((p) =>
						quebra(p, Math.max(1, w - 4)).map((l) => `   ${t.fg("error", l)}`),
					),
					...arq,
				]
			: exp
				? [
						...(tier ? quebra(tier, Math.max(1, w - 5)).map((l) => `   ${t.fg("muted", l)}`) : []),
						...etapas.map((e, i) => `   ${t.fg("dim", `${i + 1}.`.padStart(3))} ${t.fg("text", e)}`),
						...arq,
					]
				: arq;
	const rows = [cab, ...corpo].map((l) => truncateToWidth(l, Math.max(1, w), "…"));
	const idade = anima()
		? idadeFim(ctx, CASCATA_MS + CASCATA_ATRASO_MS * Math.max(0, rows.length - 1), o.agora?.())
		: undefined;
	if (idade === undefined) return rows;
	return rows.map((l, i) => {
		const n = Math.round(w * ease((idade - i * CASCATA_ATRASO_MS) / CASCATA_MS));
		return n >= w ? l : `${truncateToWidth(l, n, "")}\x1b[0m${" ".repeat(Math.max(0, w - n))}`;
	});
}
