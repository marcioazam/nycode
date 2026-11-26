/**
 * Diagnostics: records what otherwise disappears (notify, console, global sink, inbox of external processes, tool and
 * model errors, compaction, crashes) in memory + diag.jsonl, shows only the count in the footer and opens the /diagnostico
 * modal (command or ctrl+e). Also builds the span trail (events, model calls, hooks), exports it (traces.jsonl, optional
 * OTLP) and runs /doctor. Nothing here may throw into nycode: only `uncaughtExceptionMonitor` (observes).
 * NYCODE_DIAG=0 turns it off. Subagent (NYCODE_SUBAGENT=1): reduced mode, no UI and no own file; trail, wire and hooks
 * go on and every warning/error goes as a TSV line to the parent's NYCODE_DIAG_INBOX, with source `sub:<agent>`.
 */

import { accessSync, appendFileSync, existsSync, readdirSync, readFileSync, statSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { format } from "node:util";
import { visibleWidth } from "@nycode/tui";
import { getAgentDir, VERSION } from "../../config.ts";
import type { ExtensionAPI, ExtensionContext } from "../../core/extensions/types.ts";
import type { ThemeColor } from "../../modes/interactive/theme/theme.ts";
import { copyToClipboard } from "../../utils/clipboard.ts";
import { icon } from "../ui-visual/icons.ts";
import {
	ATALHO,
	cortar,
	type Deps,
	DIA,
	DOCTOR,
	entradaValida,
	escapar,
	eventoModelo,
	execReal,
	MARCA,
	MAX_LINHA,
	mensagem,
	type NotifyFn,
	type NotifyType,
	nomeDoFilho,
	type ParteTexto,
	primeiraLinha,
	RESERVA,
	SINK,
	SUBS,
	type SubagenteEvento,
	seguro,
	VIGIA_MS,
} from "./base.ts";
import { caminhosDiagnostico, registrarContexto } from "./contexto.ts";
import { type Achado, formatarDoctor, verificar } from "./doctor.ts";
import { criarExportador, lerHeaders } from "./observabilidade/exportar.ts";
import { criarFio } from "./observabilidade/fio.ts";
import {
	type Attrs,
	criarDetector,
	criarGuardaLaco,
	criarTrilha,
	lerLimiteLaco,
	lerLimites,
} from "./observabilidade/trilha.ts";
import { type Aba, PainelDiagnostico } from "./painel.ts";
import { chave, criarRegistro, type Entrada, lerCaixa, redigir } from "./registro.ts";

export { ATALHO, type Deps, DOCTOR, SINK } from "./base.ts";

export function montar(nycode: ExtensionAPI, deps: Deps = {}): void {
	const env = deps.env ?? process.env;
	if (env.NYCODE_DIAG === "0") return;
	const filho = env.NYCODE_SUBAGENT === "1";
	const agora = deps.agora ?? Date.now;
	const dir = deps.dir ?? join(getAgentDir(), "diag");
	const con = deps.console ?? globalThis.console;
	const proc = deps.processo ?? process;
	const agentDir = deps.agentDir ?? (deps.dir ? dirname(deps.dir) : getAgentDir());
	const crashes = deps.crashes ?? join(agentDir, "crashes.json");
	const caminhoLog = join(dir, "diag.jsonl");
	const caminhoTrilha = join(dir, "traces.jsonl");
	const til = (c: string) => {
		const home = env.HOME ?? homedir();
		return c.startsWith(home) ? `~${c.slice(home.length)}` : c;
	};
	let sessao: string | undefined;
	const reg = criarRegistro({ agora, arquivo: filho ? undefined : caminhoLog, sessao: () => sessao });
	let achados: Achado[] | undefined;
	let exp: ReturnType<typeof criarExportador> | undefined;
	let sessaoExp: string | undefined;

	// Trilha: uma por processo; o filho herda o trace id de TRACEPARENT, o pai publica o seu para os filhos.
	const trilha = criarTrilha({
		agora,
		traceparent: env.TRACEPARENT,
		aoFechar: (s) => {
			exp?.enfileirar(s);
			detector.aoFechar(s);
		},
	});
	if (!filho) env.TRACEPARENT = trilha.traceparent();
	let spanAgente: string | undefined;
	let spanTurno: string | undefined;
	const spansTool = new Map<string, string>();
	const spansChat = new Set<string>();
	const pai = () => spanTurno ?? spanAgente;
	/** Span ativo para a correlação: tool em curso, senão chamada de modelo, senão turno, senão a raiz. */
	const spanAtivo = () => [...spansTool.values()].at(-1) ?? [...spansChat].at(-1) ?? spanTurno ?? trilha.raizId;
	// Avisos derivados (hook lento, modelo lento, tool em laço ou travada, falhas seguidas de modelo): caminho normal de captura.
	const detector = criarDetector({
		agora,
		limites: lerLimites(env),
		relatar: (d) => capturar({ sev: d.sev, fonte: "detector", tipo: d.regra, msg: d.msg, spanId: d.spanId }),
	});
	const vigiar = () => {
		try {
			detector.verificarAbertos(trilha.abertos());
		} catch {}
	};
	const relogio = deps.timer ?? {
		setInterval: (f: () => void, ms: number) => setInterval(f, ms),
		clearInterval: (h: unknown) => clearInterval(h as ReturnType<typeof setInterval>),
	};
	let vigia: unknown;

	let ctxRef: ExtensionContext | undefined;
	let notifyOrig: ((m: string, t?: NotifyType) => void) | undefined;
	let uiRef: ExtensionContext["ui"] | undefined;
	let gravando = false;
	let offset = 0;
	let restaurar: Array<() => void> = [];
	const dono = {};

	/** Rodapé, o único lugar em que um problema novo aparece: `✕ 2 erros · ▲ 1 aviso · ctrl+e abre` (onda 12, D4).
	 * Falta de largura tira as palavras (`✕ 2 · ▲ 1 · ctrl+e`). Tudo visto: `diagnóstico: n` (total da sessão). */
	const status = () => {
		try {
			const ui = ctxRef?.ui;
			if (!ui) return;
			const th = ui.theme;
			const cor = (c: string, s: string) => (th?.fg ? th.fg(c as ThemeColor, s) : s);
			const { erros, avisos } = reg.contagem();
			if (!erros && !avisos) {
				const total = reg.lista().filter((r) => r.sev >= 13 && r.tipo !== "crash-anterior").length;
				return ui.setStatus("diag", total ? cor("dim", `diagnóstico: ${total}`) : undefined);
			}
			const monta = (c: (k: string, s: string) => string, palavras: boolean) => {
				const n = (q: number, um: string, varios: string) =>
					palavras ? `${q} ${q === 1 ? um : varios}` : String(q);
				const partes = [
					erros ? c("error", `${icon("err", env)} ${n(erros, "erro", "erros")}`) : "",
					avisos ? c("warning", `${icon("warn", env)} ${n(avisos, "aviso", "avisos")}`) : "",
					c("dim", palavras ? `${ATALHO} abre` : ATALHO),
				];
				return partes.filter(Boolean).join(c("dim", " · "));
			};
			const orcamento = (deps.colunas?.() ?? process.stdout.columns ?? 80) - RESERVA;
			ui.setStatus("diag", monta(cor, visibleWidth(monta((_k, s) => s, true)) <= orcamento));
		} catch {}
	};

	const relatados = new Set<string>();
	let nomeFilho: string | undefined;
	const fonteDoFilho = () => {
		nomeFilho ??= nomeDoFilho(env);
		return nomeFilho ? `sub:${nomeFilho}` : "sub";
	};
	const relayar = (e: Entrada) => {
		try {
			const caminho = env.NYCODE_DIAG_INBOX;
			if (!caminho || e.sev < 13) return;
			const msg =
				redigir(e.msg)
					.split(/\r?\n/)
					.find((l) => l.trim())
					?.trim() ?? "(sem mensagem)";
			const k = chave({ fonte: e.fonte, tipo: e.tipo, msg });
			if (relatados.has(k)) return;
			if (relatados.size > 500) relatados.clear();
			relatados.add(k);
			const cab = `${e.sev}\t${escapar(fonteDoFilho())}\t${escapar(`${e.fonte}:${e.tipo}`)}\t`;
			let m = escapar(msg);
			let d = e.detalhe ? escapar(redigir(e.detalhe)) : "";
			const tam = (x: string) => Buffer.byteLength(x);
			const resto = () => MAX_LINHA - 1 - tam(cab); // 1 byte do \n final
			if (d) d = cortar(d, Math.max(0, resto() - tam(m) - 1));
			while (tam(m) + (d ? tam(d) + 1 : 0) > resto() && m.length > 1) m = cortar(m, Math.floor(m.length * 0.9));
			appendFileSync(caminho, `${cab}${m}${d ? `\t${d}` : ""}\n`);
		} catch {}
	};

	/** Registra e atualiza o contador do rodapé: nenhum notify, nada acima do editor. Nunca lança nem reentra. */
	const capturar = (e0: Entrada, op?: { visto?: boolean; ts?: number; persistir?: boolean }) => {
		if (filho) return relayar(e0);
		if (!ctxRef || gravando) return;
		gravando = true;
		try {
			// Correlação log ↔ trilha (trace_id/span_id do OTel); histórico de outra execução (`op.ts`) fica sem ids.
			const e: Entrada =
				op?.ts !== undefined ? e0 : { ...e0, traceId: trilha.traceId, spanId: e0.spanId ?? spanAtivo() };
			reg.adicionar(e, op);
		} catch {
		} finally {
			gravando = false;
			status();
		}
	};

	const modeloVisto = new Map<string, { quem: string; ts: number }>();
	const reportarModelo = (quem: "fio" | "fim", msg: string, tipo: string, spanId?: string) => {
		const t = agora();
		for (const [k, v] of modeloVisto) if (t - v.ts > 30_000) modeloVisto.delete(k);
		const v = modeloVisto.get(msg);
		if (v && v.quem !== quem) {
			modeloVisto.delete(msg);
			return;
		}
		modeloVisto.set(msg, { quem, ts: t });
		capturar({ sev: 17, fonte: "modelo", tipo, msg, spanId });
	};

	const lerInbox = () => {
		try {
			const caminho = env.NYCODE_DIAG_INBOX;
			if (!caminho || filho) return;
			const r = lerCaixa(caminho, offset);
			offset = r.offset;
			for (const e of r.entradas) capturar(e);
		} catch {}
	};

	const podarInbox = () => {
		try {
			for (const f of readdirSync(dir)) {
				const p = join(dir, f);
				if (/^inbox-.*\.tsv$/.test(f) && p !== env.NYCODE_DIAG_INBOX && agora() - statSync(p).mtimeMs > 7 * DIA)
					unlinkSync(p);
			}
		} catch {}
	};

	const crashesAnteriores = () => {
		try {
			if (!existsSync(crashes)) return;
			const lista = JSON.parse(readFileSync(crashes, "utf8"));
			if (!Array.isArray(lista)) return;
			for (const c of lista) {
				const ts = typeof c?.timestamp === "number" ? c.timestamp : Date.parse(String(c?.timestamp));
				if (!Number.isFinite(ts) || agora() - ts > DIA) continue;
				capturar(
					{
						sev: 21,
						fonte: "nycode",
						tipo: "crash-anterior",
						msg: String(c.message ?? c.kind ?? "crash"),
						detalhe: typeof c.stack === "string" ? c.stack : undefined,
					},
					{ visto: true, ts, persistir: false },
				);
			}
		} catch {}
	};

	const embrulharNotify = (ui: ExtensionContext["ui"]) => {
		const atual = ui.notify as NotifyFn;
		if (typeof atual !== "function") return;
		uiRef = ui;
		if (atual[MARCA] === dono) {
			notifyOrig = atual.original;
			return;
		}
		const original: NotifyFn = atual[MARCA] ? (atual.original ?? atual) : atual;
		notifyOrig = (m, t) => original.call(ui, m, t);
		const embrulhado: NotifyFn = function (this: unknown, m: string, t?: NotifyType) {
			try {
				if (!gravando)
					capturar({
						sev: t === "error" ? 17 : t === "warning" ? 13 : 9,
						fonte: "notify",
						tipo: "notify",
						msg: String(m),
					});
			} catch {}
			return original.call(ui, m, t);
		};
		embrulhado[MARCA] = dono;
		embrulhado.original = original;
		ui.notify = embrulhado;
		restaurar.push(() => {
			if (uiRef && uiRef.notify === embrulhado) uiRef.notify = original;
		});
	};

	const embrulharConsole = () => {
		for (const tipo of ["warn", "error"] as const) {
			const original = con[tipo];
			const fn = (...args: unknown[]) => {
				try {
					const erro = args.find((a) => a instanceof Error) as Error | undefined;
					capturar({
						sev: tipo === "error" ? 17 : 13,
						fonte: "console",
						tipo,
						msg: format(...args),
						detalhe: erro?.stack,
					});
				} catch {}
			};
			con[tipo] = fn;
			restaurar.push(() => {
				if (con[tipo] === fn) con[tipo] = original;
			});
		}
	};

	const g = globalThis as Record<symbol, unknown>;
	const aoCrash = (err: unknown) =>
		capturar({
			sev: 21,
			fonte: "nycode",
			tipo: "crash",
			msg: mensagem(err),
			detalhe: err instanceof Error ? err.stack : undefined,
		});
	/** Hook de comando (patch do nycode, via sink) vira evento da trilha; stderr só no arquivo local e no painel.
	 * O registro da falha aponta para esse evento (`spanId`). */
	const hookParaTrilha = (e: Entrada, d: Record<string, unknown>) => {
		const a: Attrs = {};
		if (typeof d.comando === "string") a["nycode.hook.command"] = redigir(d.comando).slice(0, 500);
		if (typeof d.code === "number") a["nycode.hook.exit_code"] = d.code;
		if (typeof d.durMs === "number") a["nycode.hook.duration_ms"] = d.durMs;
		if (typeof d.timedOut === "boolean") a["nycode.hook.timed_out"] = d.timedOut;
		if (e.detalhe) a["nycode.hook.stderr"] = redigir(e.detalhe).slice(0, MAX_LINHA);
		const nome = `nycode.hook ${typeof d.evento === "string" ? d.evento : "hook"}`;
		const erro = e.sev >= 13 ? redigir(e.msg).slice(0, 300) : undefined;
		// Duração real do hook (medida no patch do nycode): o span cobre o intervalo, não um instante.
		e.spanId = (
			typeof d.durMs === "number" && d.durMs >= 0
				? trilha.medido(nome, d.durMs, a, erro)
				: trilha.evento(nome, a, erro)
		).spanId;
	};

	const fio = criarFio({ trilha, spansChat, pai, reportarModelo });

	const descarregar = () => {
		try {
			exp?.descarregar().catch(() => {});
		} catch {}
	};

	const prepararExportador = () => {
		if (exp && sessaoExp === sessao) return;
		descarregar();
		sessaoExp = sessao;
		const recurso: Record<string, string> = { "service.name": "nycode", "nycode.subagent": filho ? "1" : "0" };
		const versao = deps.versao ?? VERSION;
		if (versao) recurso["service.version"] = versao;
		if (sessao) recurso["nycode.session.id"] = sessao;
		if (filho && /^[\w-]{1,40}$/.test(env.NYCODE_FLEET_RUN_ID ?? ""))
			recurso["nycode.run.id"] = env.NYCODE_FLEET_RUN_ID as string;
		exp = criarExportador({
			arquivo: caminhoTrilha,
			endpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
			headers: lerHeaders(env.OTEL_EXPORTER_OTLP_HEADERS),
			recurso,
			fetch: deps.fetch,
			filtro: (s) => {
				const { "nycode.hook.stderr": _omitido, ...attrs } = s.attrs;
				return { ...s, attrs };
			},
			aoFalhar: (m) => capturar({ sev: 13, fonte: "otlp", tipo: "exportar", msg: m }),
		});
	};

	nycode.on("session_start", (_e, ctx) => {
		const ui = !filho && ctx.hasUI;
		if (ui) ctxRef = ctx;
		try {
			sessao = ctx.sessionManager?.getSessionId?.();
		} catch {}
		let fresco = true;
		try {
			// Segundo session_start com o mesmo ui (sem shutdown no meio): nada a reinstalar.
			fresco = !restaurar.length || (ui && ctx.ui !== uiRef);
			if (fresco) {
				for (const f of restaurar) f();
				restaurar = [];
				if (ui) {
					embrulharNotify(ctx.ui);
					// RPC also has UI, but there stderr is the channel for runtime diagnostics: only the TUI swallows console.
					if (ctx.mode === "tui") embrulharConsole();
				}
				const sink = (x: unknown) => {
					try {
						const e = entradaValida(x);
						if (!e) return;
						const d = (x as { dados?: unknown }).dados;
						if (e.tipo === "hook" && d && typeof d === "object") {
							seguro(hookParaTrilha)(e, d as Record<string, unknown>);
							if (e.quieto && e.sev < 13) return; // hook que deu certo fica só na trilha
						}
						capturar(e);
					} catch {}
				};
				g[SINK] = sink;
				restaurar.push(() => {
					if (g[SINK] === sink) delete g[SINK];
				});
				if (ui || filho) {
					proc.on("uncaughtExceptionMonitor", aoCrash);
					restaurar.push(() => void proc.off("uncaughtExceptionMonitor", aoCrash));
				}
				fio.embrulhar(ctx);
				restaurar.push(() => fio.limpar());
			}
		} catch {}
		try {
			prepararExportador();
			trilha.evento("session_start", { "nycode.subagent": filho });
			if (vigia === undefined) {
				vigia = relogio.setInterval(vigiar, VIGIA_MS);
				(vigia as { unref?: () => void } | undefined)?.unref?.(); // nunca segura o processo aberto
			}
		} catch {}
		if (fresco) podarInbox(); // também sem UI (nycode -p, subagente): senão nenhum desses caminhos poda
		if (!ui) return;
		if (fresco) {
			crashesAnteriores();
			offset = 0;
		}
		lerInbox();
		status();
	});

	nycode.on("session_shutdown", async () => {
		seguro(() => {
			if (vigia !== undefined) relogio.clearInterval(vigia);
			vigia = undefined;
		})();
		seguro(() => {
			trilha.evento("session_shutdown");
			trilha.fechar(trilha.raizId);
		})();
		for (const f of restaurar) {
			try {
				f();
			} catch {}
		}
		restaurar = [];
		ctxRef = undefined;
		// Entrega final com teto de 2 s: nunca atrasa o encerramento do nycode.
		let timer: ReturnType<typeof setTimeout> | undefined;
		try {
			if (exp)
				await Promise.race([
					exp.descarregar(),
					new Promise((r) => {
						timer = setTimeout(r, 2000);
					}),
				]);
		} catch {
		} finally {
			clearTimeout(timer);
		}
	});

	nycode.on(
		"agent_start",
		seguro(() => {
			spanAgente = trilha.abrir("invoke_agent nycode", {
				"gen_ai.operation.name": "invoke_agent",
				"gen_ai.agent.name": "nycode",
			});
		}),
	);
	nycode.on(
		"agent_end",
		seguro(() => {
			if (spanAgente) trilha.fechar(spanAgente);
			spanAgente = spanTurno = undefined;
			descarregar();
		}),
	);
	nycode.on(
		"turn_start",
		seguro((e) => {
			spanTurno = trilha.abrir(
				"turn",
				typeof e?.turnIndex === "number" ? { "nycode.turn.index": e.turnIndex } : undefined,
				spanAgente,
			);
			vigiar();
		}),
	);
	nycode.on("turn_end", () => {
		seguro(() => {
			if (spanTurno) trilha.fechar(spanTurno);
			spanTurno = undefined;
			descarregar();
		})();
		vigiar();
		lerInbox();
	});
	nycode.on(
		"tool_execution_start",
		seguro((e) => {
			const nome = String(e?.toolName ?? "ferramenta");
			const attrs: Attrs = { "gen_ai.operation.name": "execute_tool", "gen_ai.tool.name": nome };
			if (typeof e?.toolCallId === "string") attrs["gen_ai.tool.call.id"] = e.toolCallId;
			const id = trilha.abrir(`execute_tool ${nome}`, attrs, pai());
			if (typeof e?.toolCallId === "string") spansTool.set(e.toolCallId, id);
			vigiar();
		}),
	);
	nycode.on(
		"model_select",
		seguro((e) => {
			trilha.evento("model_select", {
				"nycode.model": eventoModelo(e?.model),
				"nycode.model.source": String(e?.source ?? ""),
			});
		}),
	);
	nycode.on(
		"thinking_level_select",
		seguro((e) => {
			trilha.evento("thinking_level_select", {
				"nycode.effort": String(e?.level ?? ""),
				"nycode.effort.previous": String(e?.previousLevel ?? ""),
			});
		}),
	);
	// Só o tamanho do texto: o conteúdo do prompt nunca entra na trilha.
	nycode.on(
		"input",
		seguro((e) => {
			trilha.evento("input", {
				"nycode.input.chars": typeof e?.text === "string" ? e.text.length : 0,
				"nycode.input.source": String(e?.source ?? ""),
			});
		}),
	);
	nycode.on(
		"session_compact",
		seguro((e) => {
			trilha.evento("session_compact", {
				"nycode.compact.reason": String(e?.reason ?? ""),
				"nycode.compact.will_retry": e?.willRetry === true,
			});
		}),
	);

	// D11 (docs/sync-observabilidade.md): o ciclo de cada agente no canal do nycode vira evento persistente da trilha, com os ids que ligam
	// agente ↔ chamada `subagent` (gen_ai.tool.call.id) ↔ run (nycode.run.id) ↔ etapa do plano (nycode.plan.step, heurístico). Sem prompt nem saída.
	nycode.events?.on(
		"nycode:subagent",
		seguro((dado) => {
			const e = dado as SubagenteEvento;
			if (e?.phase !== "start" && e?.phase !== "stop") return;
			const attrs: Attrs = {
				"nycode.run.id": String(e.agentId ?? ""),
				"nycode.subagent.type": String(e.agentType ?? ""),
			};
			if (typeof e.toolCallId === "string") attrs["gen_ai.tool.call.id"] = e.toolCallId;
			if (typeof e.planStep === "number") attrs["nycode.plan.step"] = e.planStep;
			if (e.phase === "stop") {
				if (typeof e.state === "string") attrs["nycode.run.state"] = e.state;
				if (typeof e.exitCode === "number") attrs["nycode.run.exit_code"] = e.exitCode;
				if (e.partial === true) attrs["nycode.run.partial"] = true;
			}
			trilha.evento(`nycode.subagent ${e.phase}`, attrs);
		}),
	);

	// Escalada do `tool-em-laco`: a mesma chamada repetida N vezes (resultado já visto) é bloqueada com recado ao modelo.
	const laco = criarGuardaLaco(lerLimiteLaco(env));
	nycode.on("tool_call", (e) => {
		try {
			const motivo = laco.aoChamar(String(e?.toolCallId), String(e?.toolName ?? "ferramenta"), e?.input);
			if (motivo === undefined) return undefined;
			capturar({
				sev: 13,
				fonte: "detector",
				tipo: "tool-em-laco-bloqueio",
				msg: `tool ${String(e?.toolName)} bloqueada: chamada idêntica repetida`,
				detalhe: motivo,
			});
			return { block: true, reason: motivo };
		} catch {
			return undefined;
		}
	});
	nycode.on("tool_execution_end", (e) => {
		try {
			laco.aoResultado(String(e?.toolCallId), e?.result, e?.isError === true);
		} catch {}
		let id: string | undefined;
		try {
			id = spansTool.get(e?.toolCallId);
			if (id) {
				spansTool.delete(e.toolCallId);
				trilha.fechar(
					id,
					typeof e?.durationMs === "number" ? { "nycode.tool.duration_ms": e.durationMs } : undefined,
					e?.isError ? "erro na ferramenta" : undefined,
				);
			}
		} catch {}
		try {
			if (e?.isError) {
				const partes: ParteTexto[] = Array.isArray(e.result?.content) ? e.result.content : [];
				const texto = partes
					.filter((p) => p?.type === "text" && typeof p.text === "string")
					.map((p) => p.text)
					.join("\n");
				capturar({
					sev: 13,
					fonte: "tool",
					tipo: String(e.toolName ?? "ferramenta"),
					msg: primeiraLinha(texto) || "erro sem texto",
					detalhe: texto || undefined,
					spanId: id,
				});
			}
		} catch {}
		vigiar();
		lerInbox(); // também aqui: a falha de um subagente aparece quando a ferramenta subagent volta
	});
	nycode.on("message_end", (e) => {
		try {
			const m = e?.message;
			if (m?.role === "assistant" && m.stopReason === "error")
				reportarModelo("fim", m.errorMessage ?? "erro sem mensagem", "erro");
		} catch {}
	});
	nycode.on("session_compact_failed", (e) => {
		try {
			// Cancelada (Esc, abort de extensão, cancel de hook): só trilha, sem alerta; antes sumia sem rastro.
			if (e?.aborted)
				return void seguro(() =>
					trilha.evento("session_compact_aborted", {
						"nycode.compact.reason": String(e?.reason ?? ""),
						"nycode.compact.from_extension": e?.fromExtension === true,
					}),
				)();
			const msg = e?.errorMessage ?? String(e?.reason ?? "compactação");
			seguro(() =>
				trilha.evento(
					"session_compact_failed",
					{ "nycode.compact.reason": String(e?.reason ?? "") },
					redigir(String(msg)).slice(0, 300),
				),
			)();
			capturar({ sev: e?.willRetry ? 13 : 17, fonte: "compactação", tipo: String(e?.reason ?? "compactação"), msg });
		} catch {}
	});
	nycode.on("agent_settled", () => lerInbox());

	if (filho) return; // sem comandos nem painel: o pai mostra o que o filho relata

	// Pergunta sobre o contador do rodapé → o modelo recebe as entradas da sessão e os caminhos dos logs.
	registrarContexto(nycode, reg, caminhosDiagnostico(caminhoLog, caminhoTrilha, agentDir));

	/** Só abre: quem marca as entradas como vistas (/diagnostico, atalho) é que zera o contador; o /doctor não. */
	const abrirPainel = async (ctx: ExtensionContext, aba: Aba) => {
		const copiar = deps.copiar ?? copyToClipboard;
		const acoes = {
			lista: () => reg.lista(),
			silenciar: (k: string) => {
				reg.silenciar(k);
				return status();
			},
			reativar: (k: string) => {
				reg.reativar(k);
				return status();
			},
			limpar: () => {
				reg.limpar();
				return status();
			},
			caminhoLog: til(caminhoLog),
			caminhoTrilha: til(caminhoTrilha),
			eventos: () => trilha.recentes().reverse(),
			resumo: () => trilha.resumo(),
			saude: () => achados,
			copiar: (texto: string) =>
				void Promise.resolve()
					.then(() => copiar(texto))
					.catch(() => {}),
		};
		await ctx.ui.custom<void>(
			(t, theme, _kb, done) =>
				new PainelDiagnostico(
					theme,
					acoes,
					() => done(),
					() => t.requestRender(),
					() => Math.max(8, Math.floor((t.terminal?.rows ?? 24) * 0.7)),
					aba,
					env,
				),
			{ overlay: true, overlayOptions: { anchor: "center", width: "90%", minWidth: 40, maxHeight: "70%" } },
		);
	};

	/** `/diagnostico` sem argumento e o atalho: lê a caixa, marca tudo como visto (zera o rodapé) e abre em `problemas`. */
	let modalAberto = false;
	const abrirModal = async (ctx: ExtensionContext, aba: Aba = "problemas") => {
		if (!ctx.hasUI || modalAberto) return;
		modalAberto = true;
		try {
			lerInbox();
			reg.marcarVistos();
			status();
			await abrirPainel(ctx, aba);
		} finally {
			modalAberto = false;
		}
	};
	nycode.registerShortcut(ATALHO, {
		description: "Diagnóstico: erros e avisos da sessão",
		handler: (ctx) => abrirModal(ctx),
	});

	nycode.registerCommand("diagnostico", {
		description: "Erros e avisos internos do nycode, do modelo, dos hooks e do harness nesta sessão",
		getArgumentCompletions: (prefixo: string) => {
			if (prefixo.includes(" ")) return null;
			const itens = SUBS.filter(([v]) => v.startsWith(prefixo)).map(([value, description]) => ({
				value,
				label: value,
				description,
			}));
			return itens.length ? itens : null;
		},
		handler: async (args: string, ctx) => {
			if (!ctx.hasUI) return;
			const [sub] = String(args ?? "")
				.trim()
				.split(/\s+/);
			const avisar = (m: string) => (notifyOrig ?? ((x: string) => ctx.ui.notify(x, "info")))(m, "info");
			if (sub === "limpar") {
				reg.limpar();
				return status();
			}
			// O mesmo id está em `trace_id` do registro e em `traceId` da trilha: dá para procurar nos dois arquivos.
			if (sub === "trace")
				return avisar(`trace ${trilha.traceId} · trilha: ${til(caminhoTrilha)} · registro: ${til(caminhoLog)}`);
			if (sub && sub !== "eventos") return avisar("uso: /diagnostico [eventos|trace|limpar]");
			await abrirModal(ctx, sub === "eventos" ? "eventos" : "problemas");
		},
	});

	/** `extras`: checagens de outro dono do /doctor (claude-compat), somadas aos achados. */
	const rodarDoctor = async (ctx: ExtensionContext, extras: Array<{ ok: boolean; text: string }> = []) => {
		try {
			const reg0 = ctx.modelRegistry;
			const modelo = ctx.model;
			let temAuth: boolean | undefined;
			try {
				if (modelo) temAuth = reg0.hasConfiguredAuth(modelo);
			} catch {}
			const l = reg.lista();
			const crashes = l.filter((r) => r.tipo === "crash" || r.tipo === "crash-anterior").length;
			achados = await verificar({
				env,
				agentDir,
				versao: deps.versao ?? VERSION,
				exec: deps.exec ?? execReal,
				fs: { existsSync, readFileSync, statSync, accessSync, readdirSync },
				sessao: {
					modelo: modelo ? eventoModelo(modelo) : undefined,
					temAuth,
					erros: l.filter((r) => r.sev >= 17).length - crashes,
					avisos: l.filter((r) => r.sev === 13).length,
					crashes,
				},
			});
			achados.push(
				...extras.map((x, i) => ({
					id: `compat:${i}`,
					estado: x.ok ? ("ok" as const) : ("erro" as const),
					titulo: x.text,
				})),
			);
			if (ctx.hasUI) return await abrirPainel(ctx, "saúde");
			const nome = { ok: "ok", aviso: "warn", erro: "err" } as const;
			for (const linha of formatarDoctor(achados, (e) => icon(nome[e], env)))
				(deps.log ?? ((s: string) => console.log(s)))(linha);
		} catch (e) {
			capturar({ sev: 13, fonte: "doctor", tipo: "falha", msg: mensagem(e) });
		}
	};
	// O claude-compat registra /doctor antes (ordem de carga) e delega para cá por este símbolo.
	g[DOCTOR] = rodarDoctor;
	nycode.registerCommand("doctor", {
		description: "Verifica a saúde do nycode: config, hooks, MCP, credencial, exportação",
		handler: async (_args: string, ctx) => rodarDoctor(ctx),
	});
}

export default function (nycode: ExtensionAPI) {
	montar(nycode);
}
