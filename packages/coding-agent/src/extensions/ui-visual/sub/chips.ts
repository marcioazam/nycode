/**
 * Card dos subagentes (lab /subag3 desenho 7 "Chips" sem fundo + animação 4 "Brilho no nome"; antes chips com
 * fundo por agente, lab /subag). Cabeçalho ` <robô>  subagentes · contagem por estado` (um agente: `subagente · <estado> · turnos · tok · custo`)
 * e uma linha por agente `├ agente · estado · mm:ss · texto`, `·` neutro dim, sem fundo. Turnos, tokens e custo só quando o resultado
 * do nycode os traz (usage); nada é inventado; sem estado `aviso` (o nycode não o distingue).
 * Rodando, a palavra `executando` respira entre dim e syntaxType (sem spinner: braille só na caixa de digitação) e um brilho do
 * accent corre pelo nome a cada BRILHO_MS. Ao assentar, a cor do estado sai do dim (ok, interrompido) ou pulsa duas vezes (erro)
 * em TRANSICAO_MS. Sem movimento ou sem cor, o estado assentado em theme.fg.
 */

import { visibleWidth } from "@nycode/tui";
import { sanitizarExibicao } from "../../ui/a11y.ts";
import { bgOpen, keepBg } from "../diff.ts";
import { icon, iconGap, nerdFont } from "../icons.ts";
import { fitLine } from "../motion/chrome.ts";
import { anima, highlightPeak, lerpRgb, respira, safeAnsi } from "../motion/motion.ts";
import { inicioDe, tocar } from "../motion/vivo.ts";
import { linhasStatus, resumoStatus, statusDe } from "./status.ts";

export type SubE = "run" | "ok" | "err" | "stop";
export type AgenteVisto = {
	nome: string;
	e: SubE;
	turnos?: number;
	tokens?: number;
	custo?: number;
	durMs?: number;
	linha: string;
	k?: number;
};
type Tema = {
	fg: (c: string, t: string) => string;
	bold: (t: string) => string;
	bg?: (c: string, t: string) => string;
	getFgAnsi?: (c: string) => string;
	getBgAnsi?: (c: string) => string;
};
type Ctx = { toolCallId?: string; invalidate?: () => void; durationMs?: number; isError?: boolean };
export type SubRes = {
	agent?: string;
	task?: string;
	exitCode?: number;
	stopReason?: string;
	errorMessage?: string;
	stderr?: string;
	usage?: { turns?: number; input?: number; output?: number; contextTokens?: number; cost?: number };
	messages?: { role?: string; content?: unknown; timestamp?: number }[];
};
export type SubVisto = { e: SubE; fim?: number };

export const TRANSICAO_MS = 600;
export const BRILHO_MS = 1300;
const NOME: Record<SubE, string> = { run: "executando", ok: "concluído", err: "erro", stop: "interrompido" };
const TOK: Record<SubE, string> = { run: "syntaxType", ok: "success", err: "error", stop: "warning" };
const PARADO = "interrompido antes de terminar";

export const linha1 = (t: unknown): string =>
	sanitizarExibicao(
		String(t ?? "")
			.split("\n")
			.find((l) => l.trim())
			?.trim() ?? "",
	);
const subFinal = (r: SubRes): string => {
	for (const m of [...(r.messages ?? [])].reverse()) {
		if (m.role !== "assistant" || !Array.isArray(m.content)) continue;
		const t = linha1(
			(m.content as { type?: string; text?: string }[])
				.filter((c) => c.type === "text")
				.map((c) => c.text)
				.join("\n"),
		);
		if (t) return t;
	}
	return "";
};
const ease = (x: number) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 3;
const mmss = (ms: number) =>
	`${String(Math.floor(ms / 60000)).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;
const virgula = (s: string) => s.replace(".", ",");
export const fTok = (n: number) => `${n < 1000 ? n : `${virgula((n / 1000).toFixed(1))}k`} tok`;
export const fCusto = (n: number) => (n < 0.01 ? "< US$ 0,01" : `US$ ${virgula(n.toFixed(2))}`);
const rgb = (t: Tema, tok: string, bg = false) => safeAnsi(() => (bg ? t.getBgAnsi?.(tok) : t.getFgAnsi?.(tok)));

/** Cor do estado com a transição (k 0..1): ok e interrompido surgem do dim; erro pulsa duas vezes e assenta. k ausente = assentado. */
export function corK(t: Tema, e: SubE, k: number | undefined, s: string): string {
	const tok = TOK[e];
	const c = k === undefined || k >= 1 ? undefined : rgb(t, tok);
	if (!c || k === undefined) return t.fg(tok, s);
	let cor: number[] | undefined;
	if (e === "err")
		cor = lerpRgb(c, highlightPeak(c, rgb(t, "customMessageBg", true)), 0.5 - 0.5 * Math.cos(k * 4 * Math.PI));
	else {
		const d = rgb(t, "dim");
		cor = d ? lerpRgb(d, c, ease(k)) : undefined;
	}
	return cor ? `\x1b[38;2;${cor.join(";")}m${s}\x1b[39m` : t.fg(tok, s);
}

/** Nome do agente; rodando, um brilho do accent corre pelas letras a cada BRILHO_MS. */
function nomeBrilho(t: Tema, nome: string, now: number | undefined): string {
	const base = rgb(t, "text"),
		ac = rgb(t, "accent");
	if (now === undefined || !base || !ac) return t.fg("text", t.bold(nome));
	const cs = [...nome];
	const pos = ((now % BRILHO_MS) / BRILHO_MS) * (cs.length + 8) - 4;
	const out = cs
		.map((c, i) => `\x1b[38;2;${lerpRgb(base, ac, Math.max(0, 1 - Math.abs(i - pos) / 3)).join(";")}m${c}`)
		.join("");
	return t.bold(`${out}\x1b[39m`);
}

/** Coluna da palavra `Subagent` com o ícone na coluna 0, como o Read (antes recuo LEAD, ícone 2-3 colunas à direita do Read). */
export const colSub = (): number => 1 + iconGap().length;
const SEP = (t: Tema) => t.fg("dim", " · ");
const ORDEM: SubE[] = ["run", "ok", "stop", "err"];
const CONTA: Record<SubE, string> = { run: "executando", ok: "ok", err: "erro", stop: "interrompido" };
/** Palavra do estado: rodando respira (sem spinner), assentando faz a transição, assentado = cor do tema. */
const estadoPal = (t: Tema, a: AgenteVisto, now: number): string =>
	a.e === "run" ? respira(t, now, NOME.run) : corK(t, a.e, a.k, NOME[a.e]);

/** Cabeçalho: esquerda à vontade, direita `alt+o abre · hora` em dim (sem pílula), a última coluna é a margem direita do chat (w, como a hora do Read); sem espaço cai o verbo, depois tudo. */
export function cabecalho(
	left: string,
	w: number,
	t: Tema,
	o: { dica?: string; tecla: string; hora?: string; extra?: string },
): string {
	const hora = o.hora ? ` · ${o.hora}` : "";
	if (o.extra) {
		const r = o.extra + (o.hora ? t.fg("dim", ` · ${o.hora}`) : "");
		if (w - visibleWidth(r) >= 12) {
			const l = fitLine(left, w - visibleWidth(r) - 2);
			return l + " ".repeat(Math.max(2, w - visibleWidth(l) - visibleWidth(r))) + r;
		}
	}
	const cand = o.dica
		? [
				t.fg("accent", o.tecla) + t.fg("dim", `${w >= 60 ? ` ${o.dica}` : ""}${hora}`),
				...(o.hora ? [t.fg("dim", o.hora)] : []),
			]
		: o.hora
			? [t.fg("dim", o.hora)]
			: [];
	for (const r of cand) {
		const rw = visibleWidth(r);
		if (w - rw >= 12) {
			const l = fitLine(left, w - rw - 2);
			return l + " ".repeat(Math.max(2, w - visibleWidth(l) - rw)) + r;
		}
	}
	return fitLine(left, w);
}

/** Cabeçalho do `enviado para segundo plano`: faixa neutra (customMessageBg) de ponta a ponta, hora dim dentro dela
 * na margem direita; sem cor no tema, a linha sem fundo. */
export function cabecalhoFaixa(
	left: string,
	w: number,
	t: Tema,
	o: { dica?: string; tecla: string; hora?: string; extra?: string },
): string {
	const row = cabecalho(left, w, t, o);
	const open = bgOpen(t, "customMessageBg");
	return open ? `${open + keepBg(row + " ".repeat(Math.max(0, w - visibleWidth(row))), open)}\x1b[49m` : row;
}

/**
 * Linhas do card (sem o recuo), lab /subag3 desenho 7 "Chips" sem fundo + "Brilho no nome" (antes chips com fundo):
 *   ` <robô>  subagentes · 1 executando · 1 ok · 1 erro` + `alt+o abre · hora` à direita (um agente: `subagente · <estado> · turnos · tok · custo`);
 *   `   ├ agente · estado · mm:ss · texto` por agente (└ no último). `·` neutro dim, sem fundo, sem spinner.
 * `now` é o relógio (performance.now); `anim` liga a respiração e o brilho do nome.
 */
export function cartaoSub(
	ags: AgenteVisto[],
	t: Tema,
	w: number,
	o: { now: number; anim: boolean; dica?: string; tecla: string; hora?: string },
): string[] {
	const um = ags.length === 1 ? ags[0]! : undefined;
	const estreito = w < 60;
	const extras = um
		? [
				um.turnos ? `${um.turnos} ${um.turnos === 1 ? "turno" : "turnos"}` : "",
				um.tokens ? fTok(um.tokens) : "",
				um.custo ? fCusto(um.custo) : "",
			]
				.filter(Boolean)
				.map((x) => t.fg("muted", x))
		: [];
	// Nome em accent, como o `Bash` (antes text).
	const titulo = estreito ? "" : t.bold(t.fg("accent", um ? "Subagent" : "Subagents")) + SEP(t);
	// Um agente = lab /subag2 desenho 3 "Cabeçalho + └" (antes `Subagent · estado · fatos` e `└ agente · estado · mm:ss · texto`):
	// nome (brilho rodando), estado e fatos no cabeçalho; o `└` leva só o texto.
	const resumo = um
		? [
				nomeAg(t, um, o),
				estadoPal(t, um, o.now),
				um.durMs === undefined ? "" : t.fg("muted", mmss(um.durMs)),
				...extras,
			]
				.filter(Boolean)
				.join(SEP(t))
		: ORDEM.filter((e) => ags.some((a) => a.e === e))
				.map((e) => t.fg(TOK[e], `${ags.filter((a) => a.e === e).length} ${CONTA[e]}`))
				.join(SEP(t));
	// Largura `w` inteira (com o recuo): faixa neutra de ponta a ponta e ícone na coluna dos outros cabeçalhos (antes `w` útil + LEAD por fora, ícone 3 colunas à direita do Read).
	const head = cabecalhoFaixa(`${t.fg("accent", icon("agent"))}${iconGap()}${titulo}${resumo}`, w, t, o);
	const rows = ags.map((a, i) => {
		const texto = a.linha ? t.fg(a.e === "err" || a.e === "stop" ? "muted" : "dim", a.linha) : "";
		const partes = um
			? [texto || t.fg("dim", "—")]
			: [
					nomeAg(t, a, o),
					estadoPal(t, a, o.now),
					a.durMs === undefined ? "" : t.fg("dim", mmss(a.durMs)),
					texto,
				].filter(Boolean);
		// `├/└` na coluna da palavra `Subagent` e o texto 2 colunas depois (antes 3 colunas fixas).
		return fitLine(
			`${" ".repeat(colSub())}${t.fg("borderMuted", i === ags.length - 1 ? "└" : "├")} ${partes.join(SEP(t))}`,
			w,
		);
	});
	return [head, ...rows];
}

const nomeAg = (t: Tema, a: AgenteVisto, o: { now: number; anim: boolean }) => {
	const nome = sanitizarExibicao(a.nome);
	return a.e === "run" && o.anim ? nomeBrilho(t, nome, o.now) : t.fg("text", t.bold(nome));
};

/** Ícone de segundo plano (md-cog_play, lab /subag2); sem Nerd Font, `↗`. */
const ENG = () => (nerdFont() ? "\u{f1935}" : "↗");
/**
 * `enviado para segundo plano`, lab /subag2 desenho 3 (antes `Subagent · enviado para segundo plano` + `└ agente · tarefa`):
 * um agente `Subagent · agente ⚙ · enviado` + `└ tarefa`; vários `Subagents · N enviados` + `├ agente ⚙ · tarefa`.
 */
export function cartaoEnviado(
	args: Record<string, unknown>,
	t: Tema,
	ascii: boolean,
): { cab: string; linhas: string[] } {
	const lista = ((Array.isArray(args.tasks) && args.tasks.length ? args.tasks : args.chain) ?? []) as SubRes[];
	const ags = lista.length ? lista : [{ agent: String(args.agent ?? "agente"), task: String(args.task ?? "") }];
	const quem = (r: SubRes) => `${t.fg("text", t.bold(String(r.agent ?? "agente")))} ${t.fg("syntaxType", ENG())}`;
	const env = t.fg("syntaxType", ags.length === 1 ? "enviado" : `${ags.length} enviados`);
	const cab = [
		t.fg("accent", t.bold(ags.length === 1 ? "Subagent" : "Subagents")),
		...(ags.length === 1 ? [quem(ags[0]!)] : []),
		env,
	].join(SEP(t));
	const linhas = ags.map((r, i) => {
		const corpo =
			ags.length === 1
				? t.fg("dim", linha1(r.task) || "—")
				: [quem(r), linha1(r.task) ? t.fg("dim", linha1(r.task)) : ""].filter(Boolean).join(SEP(t));
		return `${" ".repeat(colSub()) + t.fg("borderMuted", ascii ? "-" : i === ags.length - 1 ? "└" : "├")} ${corpo}`;
	});
	return { cab, linhas };
}

const deRes = (r: SubRes): SubE =>
	r.exitCode === -1
		? "run"
		: r.stopReason === "aborted"
			? "stop"
			: r.exitCode === 0 && r.stopReason !== "error"
				? "ok"
				: "err";
const linhaDe = (r: SubRes, e: SubE): string =>
	e === "run"
		? linha1(r.task)
		: e === "stop"
			? PARADO
			: e === "err"
				? linha1(r.errorMessage || r.stderr) || subFinal(r) || linha1(r.stopReason)
				: subFinal(r) || linha1(r.task);
const spanMs = (r: SubRes): number | undefined => {
	const ts = (r.messages ?? []).map((m) => m.timestamp).filter((x): x is number => typeof x === "number");
	return ts.length > 1 && Math.max(...ts) > Math.min(...ts) ? Math.max(...ts) - Math.min(...ts) : undefined;
};
const dados = (r: SubRes): Pick<AgenteVisto, "turnos" | "tokens" | "custo"> => {
	const u = r.usage;
	const tokens = u?.contextTokens || (u?.input ?? 0) + (u?.output ?? 0);
	return { turnos: u?.turns || undefined, tokens: tokens || undefined, custo: u?.cost || undefined };
};

/** Agentes de uma chamada: dos resultados (details.results), do aborto (a chamada lançou `Subagent was aborted`, sem detalhes) ou, antes do 1º resultado, da própria chamada. */
export function agentesDe(
	args: Record<string, unknown>,
	rs: SubRes[],
	abortou: boolean,
	durMs: number | undefined,
	vivoMs: number | undefined,
): AgenteVisto[] | undefined {
	if (rs.length) {
		return rs.map((r) => {
			const e = deRes(r);
			return {
				nome: String(r.agent ?? "agente"),
				e,
				...dados(r),
				// One agent: the call's own duration. Message timestamps mark when each message began, so a
				// one-turn child spans only ms; they remain the per-agent estimate in parallel and chain.
				durMs: e === "run" ? vivoMs : rs.length === 1 ? (durMs ?? spanMs(r)) : spanMs(r),
				linha: linhaDe(r, e),
			};
		});
	}
	const lista = (
		Array.isArray(args.tasks) && args.tasks.length
			? args.tasks
			: Array.isArray(args.chain) && args.chain.length
				? args.chain
				: args.agent
					? [args]
					: []
	) as SubRes[];
	if (!lista.length) return undefined;
	const e: SubE = abortou ? "stop" : "run";
	return lista.map((x) => ({
		nome: String(x.agent ?? "agente"),
		e,
		durMs: e === "run" ? vivoMs : durMs,
		linha: e === "stop" ? PARADO : linha1(x.task),
	}));
}

export type SubEstadoTool = { uiCartao?: { rs: SubRes[]; abortou: boolean }; uiSubVisto?: SubVisto[] };
/**
 * Card do subagente para a linha da chamada (a largura `w` já é a útil). Guarda em `st.uiSubVisto` o estado anterior de cada
 * agente: quem estava rodando e assentou ganha `fim` e anima TRANSICAO_MS; o histórico (nunca visto rodando) já nasce assentado.
 * `agora` injeta o relógio nos testes.
 */
export function cartaoDaChamada(
	args: Record<string, unknown>,
	st: SubEstadoTool,
	t: Tema,
	ctx: Ctx,
	w: number,
	o: { dica?: string; tecla: string; hora?: string; agora?: () => number },
): string[] | undefined {
	const t0 = inicioDe(ctx.toolCallId);
	const clk = o.agora ?? (() => performance.now());
	const ags0 = agentesDe(args, st.uiCartao?.rs ?? [], st.uiCartao?.abortou === true, ctx.durationMs, undefined);
	if (!ags0) return undefined;
	const rodando = ags0.some((a) => a.e === "run");
	const anim = anima();
	st.uiSubVisto ??= [];
	const visto = st.uiSubVisto;
	const agora0 = clk();
	let ate = 0;
	ags0.forEach((a, i) => {
		const p = visto[i];
		if (a.e === "run") visto[i] = { e: "run" };
		else if (p?.e === "run") visto[i] = { e: a.e, fim: agora0 };
		else if (!p || p.e !== a.e) visto[i] = { e: a.e };
		const f = visto[i]!.fim;
		if (f !== undefined && anim && agora0 - f < TRANSICAO_MS) ate = Math.max(ate, f + TRANSICAO_MS);
	});
	// Pede redesenho: contínuo enquanto roda (respiração do ícone, brilho, tempo), curto durante a transição.
	let now = agora0;
	if (rodando) now = o.agora ? agora0 : tocar(ctx);
	else if (ate) now = o.agora ? agora0 : tocar(ctx, ate);
	const ags = ags0.map((a, i) => {
		const f = visto[i]!.fim;
		const k = f !== undefined && anim ? (now - f) / TRANSICAO_MS : undefined;
		const vivoMs = t0 === undefined ? undefined : Math.max(0, now - t0);
		return {
			...a,
			durMs: a.e === "run" ? vivoMs : a.durMs,
			k: k !== undefined && k < 1 ? Math.max(0, k) : undefined,
		};
	});
	return cartaoSub(ags, t, Math.max(1, w), { now, anim: anim && rodando, dica: o.dica, tecla: o.tecla, hora: o.hora });
}

const RUNS = new Map<string, string>(); // id do run em segundo plano -> agente, aprendido do `Started background run <id> (<agente>)`
/** Registra o agente de um run enviado ao segundo plano; devolve o match (id em [1]) ou null. */
export function registraRun(texto: string): RegExpExecArray | null {
	const m = /^Started background run (\S+) \((.+?)\)/.exec(texto);
	if (m) {
		if (RUNS.size > 200) RUNS.clear();
		RUNS.set(m[1]!, m[2]!);
	}
	return m ?? /^Started background run (\S+) \(/.exec(texto);
}
const PALAVRA: Record<string, string> = { send: "mensagem", status: "status", cancel: "cancelar", resume: "retomar" };
const FALHA =
	/^(?:Run \S+ (?:is not running|ended before|was not started|already took)|Unknown (?:background )?run|send is disabled|Pass task|Message too long|This session already sent|Background run \S+ is still running)/;
/** Desfecho curto e real da ação (primeira linha do resultado); texto não reconhecido = nada. */
function desfecho(acao: string, texto: string, erro: boolean): { s: string; tok: string } | undefined {
	const l = texto.trimStart();
	if (erro || FALHA.test(l)) return { s: "falhou", tok: "error" };
	if (acao === "send")
		return /^Message queued/.test(l)
			? { s: "na fila", tok: "accent" }
			: /^Run \S+ had finished; resumed/.test(l)
				? { s: "entregue", tok: "success" }
				: undefined;
	if (acao === "cancel") return /^Cancelled background run/.test(l) ? { s: "cancelado", tok: "success" } : undefined;
	if (acao === "resume") return /^Resumed background run/.test(l) ? { s: "retomado", tok: "success" } : undefined;
	return undefined;
}
type EstAcao = { uiSub?: string; uiDir?: string };
/**
 * Corpo de texto puro (send, status, cancel, resume, list, erro sem detalhes): `│` em dim e o texto na coluna da
 * nome `Subagent` do cabeçalho (colSub()), cortado com … na largura; antes o texto nativo na margem esquerda. Também grava no
 * estado o cabeçalho da ação (`Subagent · mensagem · agente id`, agente só se conhecido) e o desfecho colorido à direita da hora.
 */
export const corpoDeAcao = (
	native: { render: (w: number) => string[]; invalidate: () => void },
	t: Tema,
	st: EstAcao,
	args: Record<string, unknown>,
	texto: string,
	erro: boolean,
): { render: (w: number) => string[]; invalidate: () => void } => {
	const h = cabecalhoAcao(t, args);
	if (h) {
		st.uiSub = h.texto;
		const d = desfecho(h.acao, texto, erro);
		st.uiDir = d ? t.fg(d.tok, d.s) : undefined;
		// status legível (sub/status.ts): contagem no cabeçalho e um run por linha; o texto não reconhecido fica sob `│`.
		const s = h.acao === "status" && !erro ? statusDe(texto) : undefined;
		if (s) {
			st.uiSub = h.texto + SEP(t) + resumoStatus(t, s, SEP(t));
			return { render: (w) => linhasStatus(t, s, colSub(), w, SEP(t)), invalidate: () => native.invalidate() };
		}
	}
	return corpoComTrilho(native, t);
};

/** Cabeçalho da ação sem run: `Subagent · <ação> · <agente, se conhecido> <id dim>`; também antes do resultado chegar. */
export function cabecalhoAcao(t: Tema, args: Record<string, unknown>): { acao: string; texto: string } | undefined {
	const acao = (["send", "cancel", "resume", "status"] as const).find((k) => args[k]);
	if (!acao) return undefined;
	const id = typeof args[acao] === "string" ? (args[acao] as string) : "";
	const nome = RUNS.get(id);
	const quem = [nome ? t.fg("text", nome) : "", id ? t.fg("dim", id) : ""].filter(Boolean).join(" ");
	return {
		acao,
		texto: [t.fg("accent", t.bold("Subagent")), t.fg("text", PALAVRA[acao]!), quem].filter(Boolean).join(SEP(t)),
	};
}
/**
 * Corpo de texto puro (send, status, cancel, resume, list, erro sem detalhes): `│` em dim e o texto na coluna da
 * nome `Subagent` do cabeçalho (colSub()), cortado com … na largura; antes o texto nativo na margem esquerda.
 */
const corpoComTrilho = (
	native: { render: (w: number) => string[]; invalidate: () => void },
	t: Tema,
): { render: (w: number) => string[]; invalidate: () => void } => ({
	render: (w) => {
		// `│` na coluna do nome `Subagent` e o texto 2 colunas depois (antes o `│` 2 colunas antes do nome).
		const col = colSub();
		const pre = `${" ".repeat(col) + t.fg("dim", "│")} `;
		return native.render(Math.max(1, w - col - 2)).map((r) => (r ? fitLine(pre + r, w) : r));
	},
	invalidate: () => native.invalidate(),
});
