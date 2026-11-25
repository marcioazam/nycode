/**
 * Moldura e cartões de cabeçalho das tools (`Solução 2`: pílulas de atalho + hora no topo direito,
 * cartão `Task` conectado ao `plano` e bloco `question`). Extraído para manter cada arquivo abaixo de 800 linhas.
 */
import { truncateToWidth, visibleWidth, wrapTextWithAnsi } from "@nycode/tui";
import { ascii, dicaTecla, iconGap } from "../icons.ts";
import { type AnsiProbeTheme, barraOitavos, fracaoAnimada, pillChip, safeAnsi, tomAbaixo } from "./motion.ts";

export type ChromeTheme = {
	fg: (color: string, text: string) => string;
	bold: (text: string) => string;
	bg?: (color: string, text: string) => string;
};
export type TodoDetalhes = { action?: string; error?: string; todos?: { id: number; text: string; status?: string }[] };

export const RECUO = 2;
export const LEAD = " ".repeat(RECUO);
export const util = (w: number): number => (w > 2 * RECUO ? w - RECUO : Math.max(1, w));
export const indent = (): string => " ".repeat(RECUO + 1 + iconGap().length);

const RESET = "\x1b[0m";
const SOFT_RESET = "\x1b[22;23;24;27;29;39m";
/** Corta em `w` colunas como truncateToWidth, preservando o fundo ativo; sem corte devolve o texto intacto. */
export const fitLine = (text: string, w: number): string => {
	const cut = truncateToWidth(text, Math.max(1, w), "…");
	if (cut === text) return text;
	const end = cut.lastIndexOf(RESET);
	const start = end > 0 ? cut.lastIndexOf(RESET, end - 1) : -1;
	if (end !== cut.length - RESET.length || start < 0) return cut;
	return cut.slice(0, start) + SOFT_RESET + cut.slice(start + RESET.length, end) + SOFT_RESET;
};

/** Duração curta: `0.4s`, `3.2s`, `12s`, `1m 05s`. Trunca (nunca arredonda para cima). */
export const formatDuration = (ms: number): string => {
	if (!Number.isFinite(ms) || ms < 0) return "0.0s";
	if (ms < 10_000) return `${(Math.floor(ms / 100) / 10).toFixed(1)}s`;
	const s = Math.floor(ms / 1000);
	if (s < 60) return `${s}s`;
	return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
};

/** Solução 2 (escolha): atalho (`alt+o abre`) e hora (`01:29`) ficam juntos no cabeçalho em pílulas
 * discretas, liberando 100% da largura de todas as linhas do corpo. Sem espaço, cai primeiro o atalho, depois a hora. */
export const comTopoDireita = (
	row: string,
	w: number,
	theme: ChromeTheme,
	opts: { verbo?: string; tecla?: string; hora?: string; extraLeft?: string; bgName?: string } = {},
): string => {
	const boxRgb = opts.bgName ? safeAnsi(() => (theme as AnsiProbeTheme).getBgAnsi?.(opts.bgName!)) : undefined;
	const dica = opts.verbo ? pillChip(dicaTecla(theme, opts.tecla || "ctrl+o", opts.verbo), boxRgb) : "";
	const relogio = opts.hora ? pillChip(theme.fg("dim", opts.hora), boxRgb) : "";
	const candidatos = [
		[opts.extraLeft, dica, relogio].filter(Boolean).join("  "),
		[opts.extraLeft, relogio].filter(Boolean).join("  "),
		relogio,
	].filter(Boolean);
	for (const r of candidatos) {
		const rw = visibleWidth(r);
		if (w - rw >= 10) {
			const l = fitLine(row, Math.max(1, w - rw - 2));
			const gap = w - visibleWidth(l) - rw;
			if (gap >= 2) return l + " ".repeat(gap) + r;
		}
	}
	return fitLine(row, w);
};

export const comHora = (row: string, w: number, hora: string, theme: ChromeTheme, bgName?: string): string =>
	hora ? comTopoDireita(row, w, theme, { hora, bgName }) : row;

const TASK_BAR_CELLS = 6; // 6 células × 8 oitavos = 48 passos (Onda 10, P08)
const TODO_VERBO: Record<string, [string, string]> = {
	add: ["adicionar", "adicionada"],
	start: ["iniciar", "iniciada"],
	complete: ["concluir", "concluída"],
	delete: ["remover", "removida"],
	clear: ["limpar", "lista limpa"],
	list: ["listar", "lista"],
};

/** Task mantém o ícone e a barra; verbo como título, id apagado e só a contagem.
 * `idadeFim` diz há quantos ms a chamada terminou enquanto o avanço da barra anima; `bgName` é o fundo da caixa (trilho). */
export const todoLinha = (
	args: Record<string, unknown>,
	d: TodoDetalhes | undefined,
	theme: ChromeTheme,
	idadeFim?: () => number | undefined,
	bgName?: string,
): { texto: string; andamento: string } => {
	const todos = d?.todos ?? [];
	const acao = String(args.action ?? "");
	const id = args.id ?? (d && acao === "add" ? Math.max(0, ...todos.map((t) => t.id)) || undefined : undefined);
	const texto = (typeof args.text === "string" && args.text) || todos.find((t) => t.id === id)?.text || "";
	const verboTxt = TODO_VERBO[acao]?.[d ? 1 : 0] ?? acao;
	const verboCor = d && acao === "complete" ? "success" : d && acao === "start" ? "syntaxType" : "muted";
	const verbo = verboTxt ? verboTxt[0]!.toUpperCase() + verboTxt.slice(1) : "Task";
	const cabeca = `${theme.fg(verboCor, (theme.bold ?? ((x: string) => x))(verbo))}${id !== undefined ? ` ${theme.fg("dim", `#${id}`)}` : ""}`;
	let andamento = "";
	if (todos.length > 0) {
		const done = todos.filter((t) => t.status === "completed").length;
		const frac = done / todos.length;
		// Um `complete` acabou de mover a barra: ela sai da fração anterior e chega em 200 ms.
		const de = d && acao === "complete" && done > 0 ? (done - 1) / todos.length : frac;
		const boxRgb = bgName ? safeAnsi(() => (theme as AnsiProbeTheme).getBgAnsi?.(bgName)) : undefined;
		const bar = barraOitavos(fracaoAnimada(de, frac, idadeFim?.()), TASK_BAR_CELLS, {
			ok: (s) => theme.fg("success", s),
			resto: (s) => theme.fg("dim", s),
			trilho: boxRgb && tomAbaixo(boxRgb),
			ascii: ascii(process.env),
		});
		andamento = `${bar} ${theme.fg("muted", `${done}/${todos.length}`)}`;
	}
	return {
		texto: d && texto ? `${cabeca}  ${theme.fg("text", texto)}` : cabeca,
		andamento,
	};
};

const SGR = "(?:\x1b\\[[0-9;]*m)*";
const TRILHO = new RegExp(`^${SGR}│${SGR} `);
const DICA = new RegExp(`${SGR} · (\\S+) (abre|fecha)${SGR}$`);
/** Bloco da pergunta (Solução 2): hora e atalho ficam juntos no cabeçalho em pílulas, liberando 100% da largura do corpo sob │. */
export const perguntaLinhas = (
	logicas: string[],
	w: number,
	hora: string,
	theme: ChromeTheme,
	bgName?: string,
): string[] => {
	const uw = util(w);
	const trilho = `${indent()}${theme.fg("dim", "│")} `;
	let dicaAchada: RegExpExecArray | null = null;
	for (const bruta of logicas) {
		const m = DICA.exec(bruta.replace(/ +$/, ""));
		if (m) {
			dicaAchada = m;
			break;
		}
	}
	const out: string[] = [];
	let cab = true;
	for (const bruta of logicas) {
		const row = bruta.replace(/ +$/, "");
		if (!TRILHO.test(row)) {
			const r = row && !/^(?:\x1b\[[0-9;]*m)* {2}/.test(row) ? LEAD + row : row;
			out.push(
				cab && r
					? comTopoDireita(r, uw, theme, {
							verbo: dicaAchada?.[2],
							tecla: dicaAchada?.[1],
							hora,
							bgName,
						})
					: fitLine(r, uw),
			);
			if (r) cab = false;
			continue;
		}
		const partes = wrapTextWithAnsi(row.replace(TRILHO, "").replace(DICA, ""), Math.max(1, uw - indent().length - 2));
		for (const x of partes) out.push(trilho + x);
	}
	return out;
};
