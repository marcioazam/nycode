/**
 * Faixa do run, desenho "Uma linha" com a animação "Barra" (lab /rodando; antes caixa com o
 * fundo do estado, linhas em branco acima e abaixo e `▸ nome · rotulo · tempo · resumo`). Uma linha neutra (vermelha no
 * erro): `▸ nome  [barra] estado · tempo[ · N linhas]` à esquerda, `id[ · tecla abre] · hora` à direita.
 * Enquanto o registro do nycode (Symbol.for('nycode.run.registry')) diz que o run segue rodando, o tempo corre e a barra
 * indeterminada do Bash anda; terminado (ou sem registro, ex. histórico), a faixa fica como o texto da tool a deixou.
 */
import { visibleWidth } from "@nycode/tui";
import { nerdFont } from "../icons.ts";
import { fitLine } from "../motion/chrome.ts";
import { anima, esmaecer, safeAnsi } from "../motion/motion.ts";
import { idadeFim, tocar } from "../motion/vivo.ts";

export type RunVisto = {
	nome: string;
	estado: "run" | "ok" | "err" | "warn";
	rotulo: string;
	id?: string;
	tempo?: string;
	linhas?: number;
	agente?: boolean;
	cmd?: string;
};
/** Comando do run para a prévia, só quando o nome não é o próprio comando. */
export const cmdDe = (a: Record<string, unknown>): string | undefined =>
	typeof a.command === "string" && a.name && a.name !== a.command ? a.command.replace(/\s+/g, " ") : undefined;
type Tema = {
	fg: (c: string, t: string) => string;
	bold: (t: string) => string;
	bg?: (c: string, t: string) => string;
	getFgAnsi?: (c: string) => string;
	getBgAnsi?: (c: string) => string;
};
type Registro = { get?: (id: string) => { state?: string; startedAt?: number } | undefined };

const COR: Record<RunVisto["estado"], string> = { run: "syntaxType", ok: "success", err: "error", warn: "warning" };
/** Entrada: a faixa sobe do fundo em NASCE_MS, uma vez por run. */
export const NASCE_MS = 450;
const nascidas = new Map<string, number>(); // run (ou chamada) -> instante em que a faixa nasceu; o histórico nunca entra
/** Marcador da faixa: md-layers para todo run (antes md-cog_play no subagente e `▸`
 * no shell); sem Nerd Font, `▸`. */
const marca = (): string => (nerdFont() ? "\u{f0328}" : "▸");
/** Estado em palavra (desenho 19 "Refinada"; antes `em segundo plano` rodando e o rótulo cru, ex. `exit 0`, no fim). */
const PALAVRA: Record<RunVisto["estado"], string> = { run: "rodando", ok: "concluído", err: "falhou", warn: "parado" };
const CMD_MAX = 22;
const BARRA = 10; // as 10 colunas da barra do cartão do Bash (motion/shell.ts)
const relogio = (ms: number): string => {
	const s = Math.max(0, Math.floor(ms / 1000));
	return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export function bandaRun(
	v: RunVisto,
	theme: Tema,
	ctx: { toolCallId?: string; invalidate?: () => void },
	w: number,
	o: { hora: string; dica?: string; tecla: string; agora?: () => number },
): string {
	const reg = (globalThis as Record<symbol, unknown>)[Symbol.for("nycode.run.registry")] as Registro | undefined;
	const rec = v.estado === "run" && v.id ? reg?.get?.(v.id) : undefined;
	const vivo = rec?.state === "running" && typeof rec.startedAt === "number";
	const now = vivo ? tocar(ctx) : 0;
	const tempo = vivo ? relogio(Date.now() - rec!.startedAt!) : v.tempo;
	const pos = Math.floor(now / 70) % (BARRA + 3);
	const barra =
		vivo && anima()
			? `${Array.from({ length: BARRA }, (_, i) =>
					i >= pos - 3 && i < pos ? theme.fg("accent", "━") : theme.fg("dim", "─"),
				).join("")} `
			: "";
	// Lab /runbanda desenho 19 "Refinada · md-layers" + "Barra varrendo" (antes `estado · tempo · linhas` e
	// `id · tecla abre · hora`): `ícone nome  [barra] estado · tempo · tipo · exit N · N linhas · comando`; à direita `id · hora`.
	const saida = v.estado !== "run" && /^(exit [1-9-]|sinal )/.test(v.rotulo) ? theme.fg(COR[v.estado], v.rotulo) : "";
	const cmd = v.cmd ? (v.cmd.length > CMD_MAX ? `${v.cmd.slice(0, CMD_MAX - 2)} …` : v.cmd) : "";
	const fatos = [
		theme.fg(COR[v.estado], PALAVRA[v.estado]),
		tempo && theme.fg("dim", tempo),
		theme.fg("dim", v.agente ? "subagent" : "shell"),
		saida,
		v.linhas ? theme.fg("dim", `${v.linhas} ${v.linhas === 1 ? "linha" : "linhas"}`) : "",
		cmd && theme.fg("dim", cmd),
	]
		.filter(Boolean)
		.join(theme.fg("dim", " · "));
	const esq = ` ${theme.fg(COR[v.estado], marca())} ${theme.fg("toolTitle", theme.bold(v.nome))}  ${barra}${fatos}`;
	const dir = `${theme.fg("dim", [v.id, o.hora].filter(Boolean).join(" · "))} `;
	const rw = visibleWidth(dir);
	const e = fitLine(esq, Math.max(1, w - rw - 2));
	const linha = fitLine(e + " ".repeat(Math.max(2, w - visibleWidth(e) - rw)) + dir, w);
	const pronta = theme.bg ? theme.bg(v.estado === "err" ? "toolErrorBg" : "customMessageBg", linha) : linha;
	// Só uma chamada ao vivo (recém-terminada) nasce, e só na primeira vez do run; re-desenho e histórico já a mostram pronta.
	const chave = v.id ?? ctx.toolCallId;
	const agora = o.agora?.() ?? performance.now();
	if (chave && anima()) {
		const idade = nascidas.has(chave) ? undefined : idadeFim(ctx, NASCE_MS, agora);
		if (idade !== undefined) {
			if (nascidas.size > 300) nascidas.clear();
			nascidas.set(chave, agora - idade);
		}
		const t0 = nascidas.get(chave);
		const k = t0 === undefined ? 1 : (agora - t0) / NASCE_MS;
		const fundo = safeAnsi(() => theme.getBgAnsi?.("customMessageBg")),
			texto = safeAnsi(() => theme.getFgAnsi?.("text"));
		if (k < 1 && fundo && texto) return esmaecer(pronta, 1 - (1 - Math.max(0, k)) ** 3, fundo, texto);
	}
	return pronta;
}
