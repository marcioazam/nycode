import { visibleWidth } from "@nycode/tui";
import { keepBg } from "../diff.ts";
import { estadoBg, icon, iconGap, toolIcon } from "../icons.ts";
import { ehMcp, linhaMcp, type McpEstado, resumoMcp } from "../mcp/linha.ts";
import { linhaMemoria, type MemEstado, resumoMemoria } from "../memoria/linha.ts";
import { comTopoDireita, fitLine, indent, LEAD, RECUO, type TodoDetalhes, todoLinha, util } from "../motion/chrome.ts";
import { BARRA_AVANCO_MS } from "../motion/motion.ts";
import { idadeFim } from "../motion/vivo.ts";
import { perguntaCorpo, perguntasDe } from "../pergunta/bloco.ts";
import { linhasPronto, type ProntoEstado, resumoPronto } from "../plano/pronto.ts";
import { bandaRun, cmdDe, type RunVisto } from "../run/banda.ts";
import {
	cabecalhoAcao,
	cabecalhoFaixa as cabecalhoSub,
	cartaoDaChamada,
	cartaoEnviado,
	corpoDeAcao,
	registraRun,
	type SubEstadoTool,
	type SubRes,
} from "../sub/chips.ts";
import { type Component, type Ctx, empty, lines, type Renderers, type Result, SEP, type Theme } from "./base.ts";
import { HORA_W, horaDe, runTextoVivo, teclaDe } from "./builtin.ts";

export type Estado = "run" | "ok" | "err" | "warn";
/** Estado de uma chamada de subagente pelos resultados: algum rodando, todos ok, nenhum ok ou misto (aviso). */
export const subagentEstado = (result: Result | undefined): Estado | undefined => {
	const rs = (result?.details as unknown as { results?: Array<{ exitCode?: number }> } | undefined)?.results;
	if (!Array.isArray(rs) || !rs.length) return undefined;
	if (rs.some((r) => r.exitCode === -1)) return "run";
	const ok = rs.filter((r) => r.exitCode === 0).length;
	return ok === rs.length ? "ok" : ok === 0 ? "err" : "warn";
};

type OutroState = NonNullable<Ctx["state"]> &
	SubEstadoTool &
	McpEstado &
	MemEstado &
	ProntoEstado & {
		uiEstado?: Estado;
		uiCorpo?: boolean;
		uiTodo?: TodoDetalhes;
		uiRun?: RunVisto;
		uiSub?: string;
		uiDir?: string;
		uiSegue?: boolean;
		uiSemTopo?: boolean;
		uiNeutro?: boolean;
	};

/** Tool sem renderCall próprio (ex.: run): `nome  ação alvo · resto · 300s`, em uma linha; o estado, o ícone e a hora entram por fora. */
const chamadaGenerica =
	(name: string) =>
	(args: unknown, theme: Theme): Component => ({
		render: (w) => {
			const { action, timeout_s, ...rest } = (args ?? {}) as Record<string, unknown>;
			const vals = Object.values(rest)
				.filter((v) => typeof v === "string" || typeof v === "number")
				.map((v) => String(v).replace(/\s+/g, " "));
			const resumo = [
				[action, vals[0]].filter(Boolean).join(" "),
				...vals.slice(1),
				timeout_s ? `${timeout_s}s` : "",
			]
				.filter(Boolean)
				.join(" · ");
			return [
				fitLine(
					`${theme.fg("toolTitle", (theme.bold ?? ((x: string) => x))(name))}${SEP(theme)}${theme.fg("muted", resumo)}`,
					w,
				),
			];
		},
		invalidate() {},
	});

// Run com cabeçalho curto (`run  aguardou 30s gw-lean`) e linha de fatos (estado em cor,
// duração, id, log); a saída vem recuada e só quando existe. O estado é o do RUN (rodando, exit 0, exit ≠ 0, parado), lido do
// texto que a tool devolve (nycode run/tool.ts: `line` e `summary`); texto não reconhecido (list, stop, erro) sai como veio.
const RUN_LINHA =
	/^(\S+) \[(\w+)\] (\S+)((?: exit -?\d+| sinal \S+| terminou)?) · ([\d:]+) · (.*?)( · aguardado)?(?: · log (.+))?$/;
const RUN_INICIO = /^iniciado (\S+) \(pid \d+\)\nlog: (.+)\n(.*)/;
const RUN_COR: Record<Estado, string> = { run: "syntaxType", ok: "success", err: "error", warn: "warning" };
const til = (path: string): string =>
	process.env.HOME && path.startsWith(process.env.HOME) ? `~${path.slice(process.env.HOME.length)}` : path;
const runCorpo = (
	result: unknown,
	args: Record<string, unknown>,
	expanded: boolean,
	theme: Theme,
	ctx: Ctx,
	st: OutroState,
): Component => {
	const texto = ((result as { content?: { type?: string; text?: string }[] } | undefined)?.content ?? [])
		.filter((c) => c.type === "text")
		.map((c) => c.text ?? "")
		.join("\n");
	const linhas = texto.split("\n");
	const espera = /^ainda rodando após (\d+)s$/.exec(linhas[0] ?? "");
	if (espera) linhas.shift();
	const m = RUN_LINHA.exec(linhas[0] ?? "");
	const ini = RUN_INICIO.exec(texto);
	let fatos: string[] = [];
	let estado: Estado = "ok";
	let rotulo = "";
	let saida: string[] = [];
	if (ini && !ctx.isError) {
		rotulo = "rodando";
		st.uiRun = {
			nome: String(args.name || args.command || ini[1]).replace(/\s+/g, " "),
			estado: "run",
			rotulo,
			id: ini[1],
			cmd: cmdDe(args),
		};
		fatos = [ini[1]!, /avisado/.test(ini[3] ?? "") ? "aviso ao terminar" : "", `log ${til(ini[2]!)}`];
		st.uiEstado = "ok";
		estado = "run";
	} else if (m && !ctx.isError) {
		const [, id, tipo, base, fim, dur, nome, , log] = m;
		estado = base === "done" ? "ok" : base === "failed" ? "err" : base === "stopped" ? "warn" : "run";
		saida = linhas.slice(1).filter((l) => l !== "(sem output)");
		rotulo =
			fim!.trim() ||
			{ done: "terminou", failed: "falhou", stopped: "parado" }[base!] ||
			(espera ? "ainda rodando" : "rodando");
		st.uiRun = {
			nome: nome!,
			estado,
			rotulo,
			id,
			tempo: dur,
			linhas: saida.length,
			agente: tipo === "agent",
			cmd: cmdDe(args),
		};
		fatos = [dur!, id!, estado === "run" && !saida.length ? "sem saída" : "", log ? `log ${til(log)}` : ""];
		st.uiEstado = estado;
	} else {
		st.uiRun = undefined;
		st.uiEstado = undefined;
	}
	st.uiDica = st.uiRun ? (expanded ? "fecha" : "abre") : undefined;
	if (!st.uiRun) return lines(texto.split("\n").map((l) => LEAD + theme.fg("muted", l)));
	if (!expanded) return empty();
	return lines(
		[fatos.filter(Boolean).join(" · "), ...saida].filter(Boolean).map((l) => indent() + theme.fg("muted", l)),
	);
};

// Subagente no padrão do run. Cabeçalho `subagente  <agente | paralelo · N agentes>`,
// linha de fatos (estado em cor, onde roda, id, turnos) e embaixo a tarefa (rodando) ou a 1ª linha do resultado de cada agente,
// quem falhou primeiro. Quem foi para segundo plano sai como "enviado", sem estado e com fundo neutro (o resultado chega no aviso). Aberto (ctrl+o) mostra os
// fatos e o desenho nativo inteiro; status, cancel, resume, send e erros saem com o desenho nativo.
const subAlvo = (a: Record<string, unknown>): string => {
	const n = (x: unknown) => (Array.isArray(x) ? x.length : 0);
	if (n(a.tasks)) return `paralelo · ${n(a.tasks)} agentes`;
	if (n(a.chain)) return `cadeia · ${n(a.chain)} etapas`;
	if (a.agent) return String(a.agent);
	return a.status
		? "status"
		: a.cancel
			? `cancelar ${a.cancel}`
			: a.resume
				? `retomar ${a.resume}`
				: a.send
					? `mensagem para ${a.send}`
					: "";
};
// Card em chips: quem desenha é sub/chips.ts, na linha da chamada;
// o resultado só decide os dados (st.uiCartao) e a expansão. Antes: árvore `├ agente · concluído · resultado`.
const subCorpo = (
	result: unknown,
	args: Record<string, unknown>,
	options: { expanded?: boolean; isPartial?: boolean },
	theme: Theme,
	ctx: Ctx,
	st: OutroState,
	native: Component,
): Component => {
	const res = result as { content?: { type?: string; text?: string }[]; details?: { results?: SubRes[] } } | undefined;
	const texto = (res?.content ?? [])
		.filter((c) => c.type === "text")
		.map((c) => c.text ?? "")
		.join("\n");
	const rs = Array.isArray(res?.details?.results) ? res!.details!.results! : [];
	const bg = registraRun(texto);
	const solto = !rs.length && (bg || /runs in the background|moved this subagent call to the background/.test(texto));
	st.uiSegue = false;
	st.uiSub = st.uiDir = undefined;
	st.uiNeutro = false;
	st.uiEstado = undefined;
	st.uiCartao = undefined;
	const nativoRecuado: Component = {
		render: (w) => {
			const uw = util(w);
			return native.render(Math.max(1, uw - RECUO)).map((r) => (r ? LEAD + r : r));
		},
		invalidate: () => native.invalidate(),
	};
	// Interrompido: o nycode lança `Subagent was aborted` e a chamada volta como erro sem detalhes; antes caía em erro.
	const abortou = ctx.isError === true && !rs.length && /was aborted/.test(texto);
	if ((ctx.isError && !abortou) || (!solto && !rs.length && !abortou))
		return corpoDeAcao(native, theme, st, args, texto, ctx.isError === true);
	if (solto) {
		// A chamada só entrega o agente ao segundo plano e termina: não é estado (ficava "rodando" para sempre no histórico).
		st.uiNeutro = true;
		const c = cartaoEnviado(args, theme, ASCII_ARV());
		st.uiSub = c.cab;
		st.uiDica = undefined;
		return lines(c.linhas);
	}
	st.uiCartao = { rs, abortou };
	st.uiEstado = abortou ? "warn" : options.isPartial ? "run" : (subagentEstado(result as Result) ?? "ok");
	st.uiDica = rs.length ? (options.expanded ? "fecha" : "abre") : undefined;
	return options.expanded && !abortou ? nativoRecuado : empty();
};
const ASCII_ARV = (): boolean =>
	Boolean(process.env.NYCODE_ASCII_ICONS) || /^(?:linux|dumb)$/.test(process.env.TERM ?? "");

const estadoDe = (ctx: Ctx): Estado => {
	const visto = (ctx.state as OutroState | undefined)?.uiEstado;
	if (ctx.isError) return "err";
	// No run, 'run' vale mesmo com a chamada terminada: o wait voltou e o comando segue rodando.
	if (
		visto &&
		(visto !== "run" ||
			ctx.isPartial !== false ||
			(ctx.state as OutroState).uiRun ||
			(ctx.state as OutroState).uiSegue)
	)
		return visto;
	return ctx.isPartial === false ? "ok" : "run";
};
const ESTADO_TOOL: Record<Estado, string> = { run: "executando", ok: "", err: "erro", warn: "atenção" };
/** Põe ` · estado` logo após o nome da tool na 1ª linha; se a linha não começa pelo nome, o estado abre a linha. */
const SGR_INICIO = /^(?:\x1b\[[0-9;]*m)*/;
const comEstado = (row: string, name: string, estado: string, theme: Theme): string => {
	const plano = row.replace(/\x1b\[[0-9;]*m/g, "");
	const i = row.indexOf(name);
	if (!plano.trimStart().startsWith(name) || i < 0) return `${estado}${SEP(theme)}${row}`;
	const j = i + name.length + (SGR_INICIO.exec(row.slice(i + name.length))?.[0].length ?? 0);
	return row.slice(0, j) + SEP(theme) + estado + row.slice(j);
};

// Consultas, não execuções com resultado: sem ícone de estado e sem fundo; só o erro aparece como estado.
const SEM_ESTADO = new Set(["memory"]);

/** Caixa própria (renderShell 'self') com o fundo do estado, inclusive o amarelo de "parte falhou", que o nycode não tem. */
export const caixa = (inner: Component, theme: Theme, ctx: Ctx, edge: "call" | "result", name = ""): Component => ({
	render: (w) => {
		const st = ctx.state as OutroState | undefined;
		// Run reconhecido (faixa "Uma linha"): sem caixa; a saída aberta vem logo abaixo, sem fundo.
		if (name === "run" && st?.uiRun) {
			const r = inner.render(w);
			if (edge === "result") st.uiCorpo = r.length > 0;
			return r;
		}
		const pad = ctx.outputPad ?? 1;
		const iw = Math.max(1, w - 2 * pad);
		const rows = inner.render(iw);
		if (edge === "result" && st) st.uiCorpo = rows.length > 0;
		if (edge === "call" && st) st.uiSemTopo = !rows.length;
		if (!rows.length) return [];
		if (!theme.bg) return rows;
		const neutra = (SEM_ESTADO.has(name) || st?.uiNeutro === true) && !ctx.isError;
		const bg = neutra ? (x: string) => theme.bg!("customMessageBg", x) : estadoBg(estadoDe(ctx), theme as never); // neutro, como o edit
		const open = bg("\u0000").split("\u0000")[0] ?? "";
		const paint = (row: string) => {
			const r = keepBg(fitLine(row, iw), open);
			return bg(" ".repeat(pad) + r + " ".repeat(Math.max(0, iw - visibleWidth(r)) + pad));
		};
		// A chamada abre a caixa e só a fecha enquanto o resultado não desenha nada; o resultado fecha.
		if (edge === "call") return [paint(""), ...rows.map(paint), ...(st?.uiCorpo ? [] : [paint("")])];
		// Chamada sem linha (question): o resultado abre a própria caixa.
		return [...(st?.uiSemTopo ? [paint("")] : []), ...rows.map(paint), paint("")];
	},
	invalidate: () => inner.invalidate(),
});

/** Demais ferramentas: o renderCall da base ganha ícone, nome do estado após o nome da tool e hora na 1ª linha; o subagente
 * também pinta a caixa pelo resultado (todos ok = verde, nenhum = vermelho, misto = aviso). O resto fica intacto. */
export const withIcon = (name: string, base: Renderers): Renderers => {
	const inner = base.renderCall ?? chamadaGenerica(name);
	const mcp = ehMcp(name);
	const propria =
		mcp ||
		name === "subagent" ||
		name === "run" ||
		name === "question" ||
		name === "plan_mode_complete" ||
		SEM_ESTADO.has(name);
	return {
		...base,
		...(propria ? { renderShell: "self" as const } : {}),
		renderCall(args, theme, context) {
			const state = context.state;
			if (!state) return inner(args, theme, context);
			// memory: frase compacta sem caixa (memoria/linha.ts); o resultado só entrega os dados.
			// plan_mode_complete: plano/pronto.ts.
			if (name === "plan_mode_complete")
				return {
					render: (w) =>
						linhasPronto(
							(args ?? {}) as Record<string, unknown>,
							state as OutroState,
							theme,
							context,
							w,
							horaDe(context),
							teclaDe(context),
						),
					invalidate() {},
				};
			if (name === "memory")
				return {
					render: (w) =>
						linhaMemoria(
							(args ?? {}) as Record<string, unknown>,
							state as OutroState,
							theme,
							context,
							w,
							horaDe(context),
						),
					invalidate() {},
				};
			// O nycode devolve como lastComponent o que NÓS retornamos; a base recebe o componente que ela mesma criou.
			try {
				const native = inner(args, theme, { ...context, lastComponent: state.uiCall });
				state.uiCall = native;
				const linha: Component = {
					render: (w) => {
						const uw = util(w);
						// MCP: uma linha, chave colorida pelo estado e barra fina só executando (mcp/linha.ts).
						if (mcp)
							return linhaMcp(
								name,
								(args ?? {}) as Record<string, unknown>,
								state as OutroState,
								theme,
								context,
								uw,
							).map((r) => fitLine(r, uw));
						// run, subagente e todo já dizem o estado no corpo (ou no verbo); memória é consulta. Erro sempre aparece no título.
						const corpoDiz =
							name === "run" ||
							name === "subagent" ||
							name === "todo" ||
							name === "question" ||
							SEM_ESTADO.has(name) ||
							(state as OutroState).uiNeutro === true;
						const e = estadoDe(context);
						const estado =
							(corpoDiz && !context.isError) || e === "ok"
								? ""
								: e === "run"
									? runTextoVivo(ESTADO_TOOL[e], theme, context)
									: theme.fg(RUN_COR[e], ESTADO_TOOL[e]);
						const prefix = `${name === "subagent" ? "" : LEAD}${theme.fg(name === "todo" || name === "subagent" ? "accent" : "muted", icon(toolIcon(name)))}${iconGap()}`;
						const hora = w >= 30 ? horaDe(context) : "";
						const neutra = (SEM_ESTADO.has(name) || (state as OutroState).uiNeutro === true) && !context.isError;
						const bgToken = neutra
							? "customMessageBg"
							: e === "err"
								? "toolErrorBg"
								: e === "ok"
									? "toolSuccessBg"
									: e === "run"
										? "toolPendingBg"
										: "customMessageBg";
						if (name === "todo") {
							const t = todoLinha(
								args as Record<string, unknown>,
								(state as OutroState).uiTodo,
								theme,
								() => idadeFim(context, BARRA_AVANCO_MS),
								bgToken,
							);
							return [
								comTopoDireita(
									prefix + (estado ? comEstado(t.texto, "Task", estado, theme) : t.texto),
									uw,
									theme,
									{ extraLeft: w >= 50 && t.andamento ? t.andamento : undefined, hora, bgName: bgToken },
								),
							];
						}
						const visto = name === "run" ? (state as OutroState).uiRun : undefined;
						// Run reconhecido: a faixa "Uma linha" (run/banda.ts), na largura inteira e sem a caixa.
						if (visto)
							return [
								bandaRun(visto, theme, context, w, {
									hora,
									dica: (state as OutroState).uiDica,
									tecla: teclaDe(context),
								}),
							];
						if (
							name === "subagent" &&
							!(state as OutroState).uiSub &&
							((context.isPartial !== false && !context.isError) || (state as OutroState).uiCartao)
						) {
							const card = cartaoDaChamada(
								args as Record<string, unknown>,
								state as OutroState,
								theme,
								context,
								w,
								{ dica: (state as OutroState).uiDica, tecla: teclaDe(context), hora },
							);
							if (card) return card.map((r) => fitLine(r, w));
						}
						const rows =
							name === "subagent"
								? [
										(state as OutroState).uiSub ??
											cabecalhoAcao(theme, args as Record<string, unknown>)?.texto ??
											`${theme.fg("accent", theme.bold("Subagent"))}${SEP(theme)}${theme.fg("text", subAlvo(args as Record<string, unknown>))}`,
									]
								: native.render(Math.max(1, uw - visibleWidth(prefix)));
						if (!rows.length) return rows;
						const nome = name === "subagent" ? "Subagent" : name;
						const dica = (state as OutroState).uiDica;
						const reserve = (hora ? HORA_W : 0) + (dica ? teclaDe(context).length + dica.length + 5 : 0);
						const r0 = estado
							? fitLine(
									comEstado(rows[0]!, nome, estado, theme),
									Math.max(1, uw - visibleWidth(prefix) - reserve),
								)
							: rows[0]!;
						return [
							name === "subagent"
								? cabecalhoSub(prefix + r0, w, theme, {
										dica,
										tecla: teclaDe(context),
										hora,
										extra: (state as OutroState).uiDir,
									})
								: comTopoDireita(prefix + r0, uw, theme, {
										verbo: dica,
										tecla: teclaDe(context),
										hora,
										bgName: bgToken,
									}),
							...rows.slice(1).map((r) => (r ? fitLine(LEAD + r, uw) : r)),
						];
					},
					invalidate: () => native.invalidate(),
				};
				return propria && name !== "subagent" && !mcp ? caixa(linha, theme, context, "call", name) : linha;
			} catch {
				return inner(args, theme, context);
			}
		},
		...(base.renderResult || name === "run" || mcp || name === "memory" || name === "plan_mode_complete"
			? {
					renderResult(result, options, theme, context) {
						const st = context.state as OutroState | undefined;
						if (name === "plan_mode_complete") {
							if (st) st.uiPronto = resumoPronto(result, context.isError === true);
							return empty();
						}
						if (name === "memory") {
							if (st) st.uiMem = resumoMemoria(result, context.args, context.isError === true);
							return empty();
						}
						const d = (result as { details?: TodoDetalhes } | undefined)?.details;
						if (name === "todo" && st && d && !d.error && d.action !== "list" && Array.isArray(d.todos)) {
							st.uiTodo = d; // a linha da chamada já diz tudo: o resultado não repete
							return { render: () => [], invalidate() {} };
						}
						if (name === "question" && st) {
							// Cancelada (answer null, em qualquer pergunta do lote) = aviso, não sucesso.
							const q = (
								result as
									| {
											details?: {
												answer?: unknown;
												timedOut?: boolean;
												questions?: { answer?: unknown; timedOut?: boolean }[];
											};
									  }
									| undefined
							)?.details;
							const semResposta = (x: { answer?: unknown; timedOut?: boolean }) =>
								x.answer === null || (x.timedOut === true && x.answer === "");
							st.uiEstado = q && (semResposta(q) || q.questions?.some(semResposta)) ? "warn" : undefined;
						}
						if (name === "run" && st)
							return caixa(
								runCorpo(
									result,
									context.args as Record<string, unknown>,
									options.expanded === true,
									theme,
									context,
									st,
								),
								theme,
								context,
								"result",
								name,
							);
						if (mcp && st) {
							st.uiMcp = resumoMcp(result, context.isError === true);
							const corpo = (
								(result as { content?: { type?: string; text?: string }[] } | undefined)?.content ?? []
							)
								.filter((c) => c.type === "text")
								.map((c) => c.text ?? "")
								.join("\n");
							st.uiDica = options.isPartial || !corpo ? undefined : options.expanded ? "fecha" : "abre";
							if (!options.expanded) return empty();
							if (!base.renderResult) return lines(corpo.split("\n").map((l) => LEAD + theme.fg("muted", l)));
						}
						if (!base.renderResult) return { render: () => [], invalidate() {} };
						const native = base.renderResult(result, options, theme, { ...context, lastComponent: st?.uiNative });
						if (st) st.uiNative = native;
						if (name === "subagent" && st)
							return subCorpo(
								result,
								context.args as Record<string, unknown>,
								options,
								theme,
								context,
								st,
								native,
							);
						const nativoRecuado: Component = {
							render: (w) => {
								const uw = util(w);
								return native.render(Math.max(1, uw - RECUO)).map((r) => (r ? LEAD + r : r));
							},
							invalidate: () => native.invalidate(),
						};
						// question: "Resposta em destaque" (pergunta/bloco.ts) a partir de details; sem details, o desenho do nycode.
						const ps = name === "question" ? perguntasDe(result) : undefined;
						const corpo: Component = ps
							? perguntaCorpo(ps, theme, context, {
									hora: () => horaDe(context),
									tecla: teclaDe(context),
									aberto: options.expanded === true,
								})
							: nativoRecuado;
						return propria && st && !mcp && !ps ? caixa(corpo, theme, context, "result", name) : corpo;
					},
				}
			: {}),
	};
};
