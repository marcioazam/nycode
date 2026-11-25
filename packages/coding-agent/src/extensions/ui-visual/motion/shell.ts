/**
 * Cartão do shell (Variante 04 "Trilho de status", escolha): bloco com fundo e trilho `▎` na cor do
 * estado; título `ícone Bash · ESTADO · comando    hora` (sem régua), corpo com as últimas linhas e rodapé que diz o que está rodando ou como terminou.
 * Execução 5 (barra indeterminada ━━━ no rodapé) e transição C em toda troca de estado (preparando → executando e
 * executando → final; dissolver em 600 ms: o fundo brilha na cor do desfecho e assenta,
 * o trilho e o estado vão à cor final, o resto do rodapé e a hora nascem do fundo).
 * Finais: `OK`, `OK · N avisos` (amarelo) e `Erro` (código 1; outro código vira `Erro N`).
 * Cadência: a barra usa o relógio contínuo (glifo, ~30 fps) e o dissolver o de transição (~60 fps), como mediu o laboratório.
 */
import { visibleWidth } from "@nycode/tui";
import { movimento, sanitizarExibicao } from "../../ui/a11y.ts";
import { bgOpen, keepBg } from "../diff.ts";
import { icon, iconGap } from "../icons.ts";
import { fitLine } from "./chrome.ts";
import { barraAlfa, tintaAlfa } from "./escrita.ts";
import { type AnsiProbeTheme, anima, lerpRgb, respira, safeAnsi } from "./motion.ts";
import { idadeFim, idadeInicio, rodando, tempoVivo, tocar } from "./vivo.ts";

type Theme = {
	fg: (color: string, text: string) => string;
	bold: (text: string) => string;
	bg?: (color: string, text: string) => string;
};
type Rgb = [number, number, number];
type Component = { render: (width: number) => string[]; invalidate: () => void };
export type SaidaShell = { linhas: string[]; total: number; log?: string; estado?: string; avisos: number };
export type CtxShell = {
	args?: Record<string, unknown>;
	isError?: boolean;
	isPartial?: boolean;
	executionStarted?: boolean;
	toolCallId?: string;
	invalidate?: () => void;
	state?: { uiShell?: SaidaShell; uiChegada?: number[] };
};
/** comando: pronto (args completos); parcial: o que o modelo já escreveu do comando enquanto prepara. */
export type OpcoesShell = {
	comando?: string;
	parcial?: string;
	hora: string;
	tecla: string;
	expandido: boolean;
	dur: string;
};

export const DISSOLVER_MS = 600;
export const SAI_MS = 450; // a barra do comando escorrega e some ao começar a executar
export const PREVIA = 5;
const BARRA = 10;
const BRILHO = 0.09;

const STATUS_LINE = /^Command (exited with code \d+|timed out|aborted)/i;
const NO_OUTPUT = /^\s*\(no output\)\s*$/; // marcador nativo de saída vazia: não é saída
// Rodapé da extensão bash-clamp: `[Output clamped: showing S of T lines. Full output: CAMINHO( — read(…))]`.
const CLAMP = /^\[Output clamped: showing \d+ of (\d+) lines\. Full output: (.+?)(?: — .*)?\]$/;
const AVISO = /^\s*(?:warning|warn|aviso)\b[:\s]|\bwarning:/i;
const FALHA = /\b(?:error|erro|fail(?:ed|ure)?|falh(?:a|ou))\b|✕|✗/i;

/** Estado de erro pelo rodapé nativo do bash: código 1 é `Erro`; outro código, `Erro N`. */
export const estadoErro = (rows: string[]): string => {
	const status = rows.findLast((l) => STATUS_LINE.test(l));
	const code = status && /code (\d+)/i.exec(status);
	if (code) return code[1] === "1" ? "Erro" : `Erro ${code[1]}`;
	if (status && /timed out/i.test(status)) return "tempo esgotado";
	if (status && /aborted/i.test(status)) return "interrompido";
	return "Erro";
};

/** Resultado do bash já separado: linhas de saída, total real (bash-clamp), log, estado de erro e avisos. */
export const saidaShell = (text: string, isError: boolean): SaidaShell => {
	const all = text
		.split("\n")
		.map((l) => l.replace(/\s+$/, ""))
		.filter((l) => l.trim() !== "");
	let total: number | undefined, log: string | undefined;
	for (const r of all) {
		const m = CLAMP.exec(r.trim());
		if (m) {
			total = Number(m[1]);
			log = m[2];
		}
	}
	const linhas = all
		.filter((l) => !STATUS_LINE.test(l) && !NO_OUTPUT.test(l) && !CLAMP.test(l.trim()))
		.map(sanitizarExibicao);
	return {
		linhas,
		total: total ?? linhas.length,
		log,
		estado: isError ? estadoErro(all) : undefined,
		avisos: isError ? 0 : linhas.filter((l) => AVISO.test(l)).length,
	};
};

type Tipo = "prep" | "run" | "ok" | "aviso" | "erro";
const COR: Record<Tipo, string> = { prep: "dim", run: "accent", ok: "success", aviso: "warning", erro: "error" };
const plural = (n: number, um: string, muitos: string) => `${n} ${n === 1 ? um : muitos}`;
const ease = (t: number) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3;
const sgrFg = (c: Rgb, s: string) => `\x1b[38;2;${c.join(";")}m${s}\x1b[39m`;

export function cartaoShell(theme: Theme, ctx: CtxShell, o: OpcoesShell): Component {
	const probe = theme as AnsiProbeTheme;
	const cor = (token: string, fundo = false): Rgb | undefined =>
		safeAnsi(() => (fundo ? probe.getBgAnsi?.(token) : probe.getFgAnsi?.(token))) as Rgb | undefined;
	let k: string | undefined,
		ks: SaidaShell | undefined,
		out: string[] = [];
	// Quando cada letra do comando chegou (Tinta longa): no estado da chamada, porque o nycode refaz o renderCall a cada args novo.
	let chegada: number[] = [];
	if (ctx.state) {
		ctx.state.uiChegada ??= [];
		chegada = ctx.state.uiChegada;
	}

	const desenha = (w: number): string[] => {
		const s = ctx.state?.uiShell;
		const tipo: Tipo = ctx.isError
			? "erro"
			: ctx.isPartial === false
				? s?.avisos
					? "aviso"
					: "ok"
				: ctx.executionStarted === false
					? "prep"
					: "run";
		// Preparando também anima (barra e cursor do comando chegando); executando, só enquanto roda de fato.
		// A barra nunca some enquanto prepara ou executa (parecia travado): sem foco ou em movimento
		// reduzido anda 1 passo por segundo, no tique lento do relógio; só `desligado` fica sem ela.
		const fluido = anima();
		const nivel = movimento();
		const vivo = ((tipo === "run" && rodando(ctx.toolCallId)) || tipo === "prep") && nivel === "normal";
		const now = vivo ? tocar(ctx) : performance.now();
		// Toda troca de estado dissolve: preparando → executando pelo início, executando → final pelo fim.
		const idade =
			tipo === "run" ? idadeInicio(ctx, DISSOLVER_MS) : tipo === "prep" ? undefined : idadeFim(ctx, DISSOLVER_MS);
		const p = idade === undefined || !anima() ? 1 : ease(idade / DISSOLVER_MS);

		// Cores do estado; em truecolor o dissolver mistura do estado em execução para o final.
		const base = cor("customMessageBg", true),
			accent = cor("accent"),
			dim = cor("dim");
		const alvo = cor(COR[tipo]),
			errBg = cor("toolErrorBg", true);
		const fundoFim =
			tipo === "erro" ? errBg : tipo === "aviso" && base && alvo ? (lerpRgb(base, alvo, 0.07) as Rgb) : base;
		const rgb = base && accent && dim && alvo && fundoFim;
		const de = tipo === "run" ? dim : accent; // cor do estado anterior
		// Dissolver: o fundo vai ao do desfecho com um brilho na cor dele (pico de 9 % no meio), senão o sucesso não muda nada.
		const fundo = rgb
			? p < 1
				? (lerpRgb(lerpRgb(base, fundoFim, p), alvo, BRILHO * Math.sin(Math.PI * p)) as Rgb)
				: fundoFim
			: undefined;
		const trilho = rgb && p < 1 ? sgrFg(lerpRgb(de!, alvo, p) as Rgb, "▎") : theme.fg(COR[tipo], "▎");
		const token = tipo === "erro" ? "toolErrorBg" : "customMessageBg";
		const open = fundo ? `\x1b[48;2;${fundo.join(";")}m` : bgOpen(theme, token);

		// Sem margem: o trilho fica na coluna do texto da conversa (antes margem 2).
		// Largura inteira dentro da margem do chat (antes no máximo 72 colunas).
		const bw = Math.max(4, w);
		const iw = bw - 3; // trilho + espaço à esquerda, 1 de respiro à direita
		const linha = (conteudo: string): string => {
			const c = fitLine(conteudo, iw);
			const miolo = `${trilho} ${c}${" ".repeat(Math.max(0, iw - visibleWidth(c)))} `;
			const pintada = !open
				? miolo
				: fundo
					? `${open}${keepBg(miolo, open)}\x1b[49m`
					: theme.bg
						? theme.bg(token, keepBg(miolo, open))
						: miolo;
			return pintada;
		};

		// Título "régua": ícone pendurado + `Bash ─ comando ───── hora`; corpo e rodapé recuam até o `Bash`.
		// Nome e ícone de bash: antes `Run` com o ícone de play (inseto com play); o resto igual.
		// Preparando ("comando chegando"): o comando aparece conforme o modelo escreve, com cursor.
		const surge = (t: string) =>
			rgb && fundo && p < 1 ? sgrFg(lerpRgb(fundo, dim, p) as Rgb, t) : theme.fg("dim", t); // nasce do fundo
		const gap = iconGap();
		const recuo = " ".repeat(1 + gap.length);
		const hora = o.hora && tipo !== "run" && tipo !== "prep" && iw >= 30 ? surge(o.hora) : "";
		// Tinta longa (/refino escrita 1): cada letra do comando nasce do fundo e ganha a cor; o cursor respira
		// em vez de piscar. Antes o comando vinha pronto em muted e o cursor piscava a cada 400 ms. Sem movimento fluido, como antes.
		const parcial = [...sanitizarExibicao(o.comando ?? o.parcial ?? "")];
		if (parcial.length < chegada.length) chegada.length = parcial.length;
		while (chegada.length < parcial.length) chegada.push(now);
		const muted = cor("muted");
		const tinta = tipo === "prep" && fluido && fundo && muted;
		// Barra que respira (/cursor variante 3; antes bloco ▌ respirando): acesa enquanto as letras chegam,
		// respira nas pausas do modelo; ao começar a executar escorrega 3 colunas e some (SAI_MS).
		const ultima = chegada.at(-1) ?? -Infinity;
		const saindo = tipo === "run" && fluido && fundo && accent ? idadeInicio(ctx, SAI_MS) : undefined;
		const cursor =
			tipo !== "prep"
				? ""
				: tinta && accent
					? sgrFg(lerpRgb(fundo, accent, barraAlfa(now - ultima, now)) as Rgb, "▏")
					: vivo && (!fluido || Math.floor(now / 400) % 2)
						? theme.fg("accent", "▏")
						: " ";
		const sai =
			saindo === undefined
				? ""
				: (() => {
						const x = Math.min(1, saindo / SAI_MS),
							a = 1 - ease(Math.max(0, (saindo - 150) / (SAI_MS - 150)));
						return a > 0.02
							? " ".repeat(Math.round(3 * ease(x))) + sgrFg(lerpRgb(fundo!, accent!, a) as Rgb, "▏")
							: "";
					})();
		const escrito = tinta
			? parcial
					.map((ch, i) => {
						const a = tintaAlfa(now - chegada[i]!);
						return a >= 1 ? theme.fg("muted", ch) : sgrFg(lerpRgb(fundo, muted, a) as Rgb, ch);
					})
					.join("")
			: theme.fg("muted", parcial.join(""));
		const cmdLimpo = sanitizarExibicao(o.comando ?? "");
		const cmd =
			tipo === "prep"
				? escrito + cursor
				: (cmdLimpo ? theme.fg("toolTitle", theme.bold(cmdLimpo)) : theme.fg("muted", "…")) + sai;
		// Título sem régua (antes `Bash ─ comando ───── hora`): `<ícone> Bash · ESTADO · comando` e a hora à direita.
		// O estado fica logo depois do nome e nunca é cortado: no aperto o comando encolhe primeiro.
		const sep = theme.fg("dim", " · ");
		const nomeEstado =
			tipo === "prep"
				? "recebendo"
				: tipo === "run"
					? "executando"
					: tipo === "erro"
						? (s?.estado ?? "Erro")
						: tipo === "aviso"
							? `OK · ${plural(s?.avisos ?? 0, "aviso", "avisos")}`
							: "OK";
		const estadoTit =
			tipo === "prep"
				? theme.fg("dim", nomeEstado)
				: rgb && p < 1
					? sgrFg(lerpRgb(dim, alvo, p) as Rgb, nomeEstado)
					: tipo === "run"
						? respira(probe as Parameters<typeof respira>[0], now, nomeEstado, "accent")
						: theme.fg(COR[tipo], nomeEstado);
		const cab =
			theme.fg(tipo === "prep" ? "dim" : "accent", icon("bash")) +
			gap +
			theme.fg("accent", theme.bold("Bash")) +
			sep +
			estadoTit +
			sep;
		const dir = hora ? ` ${hora}` : "";
		const esq = cab + fitLine(cmd, Math.max(1, iw - visibleWidth(cab) - visibleWidth(dir) - 1));
		const titulo = esq + " ".repeat(Math.max(dir ? 1 : 0, iw - visibleWidth(esq) - visibleWidth(dir))) + dir;

		// Corpo: últimas linhas (todas quando expandido); falha em vermelho, aviso em amarelo.
		const todas = s?.linhas ?? [];
		const vistas = o.expandido ? todas : todas.slice(-PREVIA);
		const corpo = vistas.map(
			(l) =>
				recuo +
				theme.fg(
					tipo === "erro" && FALHA.test(l) ? "error" : AVISO.test(l) && tipo !== "erro" ? "warning" : "toolOutput",
					l,
				),
		);
		const total = s?.total ?? 0;
		const ocultas = Math.max(0, total - vistas.length);

		// Rodapé: o que está rodando (barra, tempo, linhas) ou como terminou (estado, duração, linhas, ocultas, atalho).
		let rodape: string;
		const n = total ? theme.fg("dim", ` · ${plural(total, "linha", "linhas")}`) : "";
		const pos = Math.floor(now / (fluido ? 70 : 1000)) % (BARRA + 3);
		const barra =
			vivo || nivel === "reduzido"
				? `${Array.from({ length: BARRA }, (_, i) =>
						vivo && i >= pos - 3 && i < pos ? theme.fg("accent", "━") : theme.fg("dim", "─"),
					).join("")} `
				: "";
		if (tipo === "prep") {
			const nc = [...(o.comando ?? o.parcial ?? "")].length;
			rodape =
				barra +
				theme.fg(
					"dim",
					nc ? `recebendo o comando · ${plural(nc, "caractere", "caracteres")}` : "recebendo o comando…",
				);
		} else if (tipo === "run") {
			const faz =
				typeof ctx.args?.description === "string" && ctx.args.description.trim()
					? ctx.args.description.trim()
					: "executando";
			const tempo = tempoVivo(ctx.toolCallId, now);
			rodape =
				barra +
				(rgb && p < 1 ? sgrFg(lerpRgb(dim!, accent!, p) as Rgb, faz) : theme.fg("accent", faz)) +
				(tempo ? theme.fg("dim", ` · ${tempo}`) : "") +
				n;
		} else {
			const dica = ocultas > 0 ? "abre" : o.expandido && total > PREVIA ? "fecha" : "";
			// O estado já está no título: o rodapé final só traz duração, linhas, ocultas, atalho e log, sem separador inicial.
			const resto = [
				o.dur,
				n ? plural(total, "linha", "linhas") : "",
				ocultas ? `${ocultas} acima` : "",
				dica ? `${o.tecla} ${dica}` : "",
				s?.log ? `log ${s.log}` : "",
			]
				.filter(Boolean)
				.join(" · ");
			rodape = resto ? surge(resto) : "";
		}
		// Respiro entre a saída e o rodapé; sem saída o cartão segue com 2 linhas de conteúdo.
		// Uma linha de respiro em cima e embaixo, dentro do fundo e com o trilho.
		return [
			"",
			titulo,
			...corpo,
			...(corpo.length && rodape ? [""] : []),
			...(rodape ? [recuo + rodape] : []),
			"",
		].map(linha);
	};

	return {
		render: (w) => {
			// Terminado e fora do dissolver não muda: guarda pela chave do que o desenho lê.
			const fixo = (ctx.isError || ctx.isPartial === false) && idadeFim(ctx, DISSOLVER_MS) === undefined;
			if (!fixo) return desenha(w);
			const s = ctx.state?.uiShell;
			let tema = "?";
			try {
				tema = `${probe.getBgAnsi?.("customMessageBg")}|${probe.getBgAnsi?.("toolErrorBg")}|${probe.getFgAnsi?.("accent")}`;
			} catch {
				/* tema sem sondagem */
			}
			const chave = [w, ctx.isError, ctx.isPartial, o.expandido, o.hora, o.dur, o.tecla, o.comando, tema].join(
				"\u0001",
			);
			if (chave !== k || s !== ks) {
				out = desenha(w);
				k = chave;
				ks = s;
			}
			return out;
		},
		invalidate() {
			k = undefined;
		},
	};
}
