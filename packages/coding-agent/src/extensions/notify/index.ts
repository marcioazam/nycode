/**
 * Single owner of the end-of-turn signals: notification (title `session · folder`, body by outcome, OSC 99/9/777),
 * sound, terminal-tab progress and the `/notifications` panel (alias `/avisos`). `notify.desktop` turns the system
 * notification off and `notify.sound` the sound (NYCODE_SOUND_NOTIFY wins); the bell channel still follows avisos.json.
 *
 * `precisa` = pergunta aberta (REMOTE_QUESTION_CHANNEL do question.ts do nycode). Pedido de permissão não tem evento
 * de extensão confiável: fica de fora.
 */

import { getAgentDir } from "../../config.ts";
import type { ExtensionAPI, ExtensionCommandContext, ExtensionContext } from "../../core/extensions/types.ts";
import { resolveNycodeSettings } from "../../core/settings-nycode.ts";
import { ligarAvisos } from "../../modes/interactive/avisos/index.ts";
import { todoProgress } from "../todo/status.ts";
import { type Config, caminhoAvisos, canalEfetivo, carregar, type Evento, gravar } from "./config.ts";
import { corpo, criarNotificador, type Info } from "./notificar.ts";
import { type Aviso, adicionar, PainelAvisos } from "./painel.ts";
import { criarProgresso } from "./progresso.ts";
import { play } from "./sound.ts";
import { ausente, causa, desfechoDe, duracao, tituloSessao } from "./turno.ts";

const RETRY_CANCELADO = Symbol.for("nycode:retry-cancelado");

export const QUESTION_CHANNEL = "nycode:question:v1";

export interface Deps {
	escrever?: (s: string) => void;
	agora?: () => number;
	caminho?: string;
	env?: Record<string, string | undefined>;
	/** Plays the end-of-turn sound; injected by tests so none is ever heard. */
	tocar?: () => void;
}

export function montar(nycode: ExtensionAPI, deps: Deps = {}): void {
	const env = deps.env ?? process.env;
	if (env.NYCODE_SUBAGENT === "1") return;
	const escrever = deps.escrever ?? ((s: string) => void (process.stdout.isTTY && process.stdout.write(s)));
	const agora = deps.agora ?? Date.now;
	const caminho = () => deps.caminho ?? caminhoAvisos(getAgentDir());
	let config: Config = carregar(caminho());
	let recentes: Aviso[] = [];
	let ctxRef: ExtensionContext | undefined;
	let focused: boolean | undefined;
	let lastInputAt: number | undefined;
	let inicio: number | undefined;
	let ultimo: unknown[] = [];
	const notificador = criarNotificador(escrever, env);
	const progresso = criarProgresso({ escrever, ligado: () => config.progresso, env });

	const titulo = () => tituloSessao(nycode.getSessionName(), ctxRef?.cwd ?? process.cwd());
	const ajustes = () => resolveNycodeSettings(nycode.getSettings(), env).notify;
	const tocar = () => {
		if (ajustes().sound) (deps.tocar ?? (() => play()))();
	};
	const canal = () => canalEfetivo(config.canal, ajustes().desktop);

	/** Registra, notifica (só ausente) e toca (só nos eventos de `som`). */
	const sinalizar = (evento: Evento, info: Info, glifo: Aviso["glifo"]) => {
		recentes = adicionar(recentes, {
			hora: agora(),
			glifo,
			texto: corpo(evento, { duracao: info.duracao, rotulo: info.rotulo }),
		});
		if (config.avisar.includes(evento) && ausente(focused, lastInputAt, agora())) {
			const nome = nycode.getSessionName();
			notificador.enviar(
				canal(),
				evento,
				(info.resultado || info.pergunta) && nome ? `nycode · ${nome}` : titulo(),
				info,
			);
		}
		if (config.som.includes(evento)) tocar();
	};

	nycode.events.on(QUESTION_CHANNEL, (evento) => {
		if (!ctxRef) return;
		progresso.esperar(true);
		const pergunta = (evento as { question?: unknown } | undefined)?.question;
		sinalizar("precisa", { pergunta: typeof pergunta === "string" ? pergunta : undefined }, "▲");
	});
	nycode.events.on("nycode-ui:terminal-focus", (d) => {
		focused = (d as { focused: boolean }).focused;
		if (focused) notificador.fechar();
	});

	nycode.on("session_start", (_e, ctx) => {
		if (!ctx.hasUI) return;
		ctxRef = ctx;
		config = carregar(caminho());
		lastInputAt = undefined;
		inicio = undefined; // um agent_start sem agent_settled da sessão anterior não infla a próxima duração
		ultimo = [];
	});
	nycode.on("input", (e) => {
		if (e.source !== "extension") lastInputAt = agora();
	});
	nycode.on("agent_start", () => {
		if (!ctxRef) return;
		inicio ??= agora();
		progresso.trabalhando();
	});
	// P22: % do Task quando a lista tem itens; a pergunta respondida tira a pausa.
	nycode.on(
		"tool_execution_end",
		(e: { toolName?: string; result?: { details?: { todos?: Array<{ status?: string }> } } }) => {
			if (e.toolName === "question") progresso.esperar(false);
			const todos = e.toolName === "todo" ? e.result?.details?.todos : undefined;
			if (Array.isArray(todos)) {
				const { done, total } = todoProgress(todos);
				progresso.percentual(todos.length ? (total ? (100 * done) / total : 100) : undefined);
			}
		},
	);
	nycode.on("agent_end", (e) => {
		ultimo = e.messages as unknown[];
	});
	nycode.on("agent_settled", (e: { aborted?: boolean }) => {
		const mensagens = ultimo;
		const dur = inicio === undefined ? undefined : duracao(agora() - inicio);
		inicio = undefined;
		ultimo = [];
		if (!ctxRef) return;
		// Esc na espera entre tentativas chega com aborted=false e mensagem de erro; o patch do core deixa a marca.
		const g = globalThis as Record<symbol, unknown>;
		const cancelou = g[RETRY_CANCELADO] !== undefined;
		delete g[RETRY_CANCELADO];
		const { desfecho, erro } = desfechoDe(mensagens, e?.aborted === true || cancelou);
		if (desfecho === "erro") progresso.erro();
		else progresso.limpar();
		if (desfecho === "terminou") {
			const resposta = mensagens.findLast((m) => (m as { role?: string } | undefined)?.role === "assistant") as
				| { content?: Array<{ type: string; text?: string }> }
				| undefined;
			const resultado = resposta?.content?.find((parte) => parte.type === "text" && parte.text?.trim())?.text;
			sinalizar("terminou", { duracao: dur, resultado }, "✓");
		} else if (desfecho === "erro") sinalizar("erro", { rotulo: causa(erro).rotulo }, "✕");
	});
	// Só compactação automática (threshold/overflow). O evento traz o tamanho de antes, não o de depois: não inventamos o número.
	nycode.on("session_compact", (e: { reason?: string; compactionEntry?: { tokensBefore?: number } }) => {
		if (!ctxRef || e.reason === "manual") return;
		const antes = e.compactionEntry?.tokensBefore;
		const tam = typeof antes === "number" && antes > 0 ? ` · de ${Math.round(antes / 1000)}k tokens` : "";
		recentes = adicionar(recentes, { hora: agora(), glifo: "▲", texto: `Contexto compactado sozinho${tam}` });
	});
	nycode.on("session_shutdown", (e: { reason?: string }) => {
		// Reload: o core (modes/interactive/avisos) segura os avisos do novo início até o divisor.
		if (e?.reason === "reload")
			(globalThis as Record<symbol, unknown>)[Symbol.for("nycode:recarga")] = {
				desde: performance.now(),
				avisos: [],
			};
		progresso.limpar();
		ctxRef = undefined;
	});

	const comandoPainel = {
		description: "Avisos desta sessão e ajustes de notificação, som e progresso na aba",
		handler: async (_args: string, ctx: ExtensionCommandContext) => {
			if (!ctx.hasUI) return;
			const acoes = {
				recentes: () => recentes,
				agora,
				config: () => config,
				salvar: (c: Config) => {
					const antes = config;
					config = c;
					try {
						gravar(caminho(), c);
					} catch (e) {
						config = antes;
						ctx.ui.notify(`Não consegui gravar avisos.json: ${e instanceof Error ? e.message : e}`, "warning");
					}
				},
				// Testar agora ignora foco e ausência; respeita canal e a lista de som.
				testar: () => {
					notificador.enviar(canal(), "teste", titulo());
					if (config.som.length) tocar();
				},
			};
			await ctx.ui.custom<void>(
				(t, theme, _kb, done) =>
					new PainelAvisos(
						theme,
						acoes,
						() => done(),
						() => t.requestRender(),
					),
				{ overlay: true, overlayOptions: { anchor: "bottom-center", width: "100%", maxHeight: "70%" } },
			);
		},
	};
	nycode.registerCommand("notifications", comandoPainel);
	nycode.registerCommand("avisos", comandoPainel); // alias kept for the pre-merge name
}

export default function (nycode: ExtensionAPI) {
	if (process.env.NYCODE_AVISOS === "0") return;
	ligarAvisos(true);
	montar(nycode);
}
