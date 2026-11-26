/**
 * /travar-modelos: obriga a sessão (chat, subagentes, run, plano) a usar só os modelos e esforços escolhidos.
 * Ponto único: `stream`/`streamSimple` da instância ModelRuntime (docs/pi-travar-modelos-2026-11-14.md). A trava vive em
 * process.env.NYCODE_MODEL_LOCK, que os nycode filhos herdam. Sem trava os embrulhos só repassam. Nada lança para dentro do
 * nycode, exceto os dois erros deliberados (falha fechada) nas chamadas de modelo.
 */

import { type Api, type Context, getSupportedThinkingLevels, type Model } from "@nycode/ai";
import type { ExtensionAPI, ExtensionCommandContext, ExtensionContext } from "../../core/extensions/types.ts";
import { SetupComponent } from "../subagent/routing/setup-ui.ts";
import {
	analisar,
	chave,
	deArgs,
	decidir,
	deEnv,
	EFFORTS,
	type Effort,
	formatar,
	paraEnv,
	type Trava,
} from "./trava.ts";

export interface Deps {
	env?: Record<string, string | undefined>;
}

const MARCA = Symbol.for("nycode:travar-modelos");
const SINK = Symbol.for("nycode:diag");
/** Ícone do rodapé (R2 da onda 12 escolhe um sem emoji); vazio por ora. Ponto único de troca. */
const ICONE_TRAVA = "";
const USO = "uso: /travar-modelos provedor/id:low,medium …";
const mensagem = (e: unknown) => (e instanceof Error ? e.message : String(e));
// Mesmas opções de overlay do /subagents-setup (subagent/fleet-ui/viewer.ts).
const OVERLAY = { anchor: "bottom-center", width: "100%", maxHeight: "85%", margin: 0 } as const;

type Opcoes = { reasoning?: Effort } | undefined;
type Chamada = (this: unknown, model: Model<Api>, context: Context, options?: Opcoes) => unknown;
type Embrulho = Chamada & { [MARCA]?: object; original?: Chamada };
type Nome = "stream" | "streamSimple";
/** O que a trava lê e troca no ModelRuntime: as duas chamadas de modelo e a busca por provedor/id. */
type Runtime = { [N in Nome]?: Embrulho } & { getModel?: (provider: string, id: string) => Model<Api> | undefined };
/** O ModelRegistry guarda o runtime num campo privado; sem ele o próprio objeto é o runtime (testes). */
type ComRuntime = { runtime?: Runtime };
type Sink = (evento: { sev: number; fonte: string; tipo: string; msg: string; quieto: boolean }) => void;

/** `provedor/id`: divide só na primeira barra (ids podem ter barras). */
const separar = (k: string): [string, string] => {
	const i = k.indexOf("/");
	return [k.slice(0, i), k.slice(i + 1)];
};

export function montar(nycode: ExtensionAPI, deps: Deps = {}): void {
	const env = deps.env ?? process.env;
	const lido = deEnv(env);
	let trava: Trava | undefined = lido.trava;
	let erroEnv: string | undefined = lido.erro;
	let ctxRef: ExtensionContext | undefined;
	let preferido: string | undefined;
	let ajustando = false;
	const vistos = new Set<string>();

	// Modelos já vistos numa chamada: o ctx guardado vence após reload ou compactação e o registro passa a lançar.
	const conhecidos = new Map<string, Model<Api>>();
	const resolver = (k: string): Model<Api> | undefined => {
		try {
			const [p, id] = separar(k);
			const registro = ctxRef?.modelRegistry;
			return (
				registro?.find(p, id) ??
				registro?.getAll().find((m) => m.provider === p && m.id === id) ??
				conhecidos.get(k)
			);
		} catch {
			return conhecidos.get(k);
		}
	};

	/** O runtime embrulhado resolve o modelo sem depender do ctx guardado. */
	const doRuntime = (rt: Runtime | undefined, k: string): Model<Api> | undefined => {
		try {
			const [p, id] = separar(k);
			return rt?.getModel?.(p, id);
		} catch {
			return undefined;
		}
	};
	const dono = {};

	const registrar = (de: string, para: string) => {
		const msg = `${de} → ${para}`;
		if (vistos.has(msg)) return;
		vistos.add(msg);
		try {
			const sink = (globalThis as Record<symbol, Sink | undefined>)[SINK];
			sink?.({ sev: 13, fonte: "travar-modelos", tipo: "troca", msg, quieto: false });
		} catch {}
	};

	const embrulhar = (rt: Runtime, nome: Nome) => {
		const atual = rt[nome];
		if (typeof atual !== "function" || atual[MARCA] === dono) return;
		// Após /reload o embrulho da instância antiga (ctx vencido, código antigo) continua no runtime: troca, não empilha.
		const orig: Chamada = atual[MARCA] && typeof atual.original === "function" ? atual.original : atual;
		const f: Embrulho = function (this: unknown, model, context, options) {
			if (erroEnv)
				throw new Error(
					`travar-modelos: NYCODE_MODEL_LOCK inválido (${erroEnv}); nenhuma chamada de modelo é permitida`,
				);
			if (!trava) return orig.call(this, model, context, options);
			const k = chave(model);
			if (trava.models[k]) conhecidos.set(k, model);
			if (nome === "stream") {
				if (!trava.models[k]) throw new Error(`travar-modelos: ${k} não está na trava desta sessão`);
				return orig.call(this, model, context, options);
			}
			const esforco: Effort = options?.reasoning ?? "off";
			const d = decidir(trava, { modelo: k, esforco }, preferido);
			if (!d.mudou) return orig.call(this, model, context, options);
			const alvo =
				d.modelo === k ? model : (doRuntime((this as Runtime | undefined) ?? rt, d.modelo) ?? resolver(d.modelo));
			if (!alvo) throw new Error(`travar-modelos: não achei o modelo ${d.modelo} da trava; chamada recusada`);
			registrar(`${k} · ${esforco}`, `${d.modelo} · ${d.esforco}`);
			return orig.call(this, alvo, context, { ...options, reasoning: d.esforco === "off" ? undefined : d.esforco });
		};
		f[MARCA] = dono;
		f.original = orig;
		rt[nome] = f;
	};

	const status = (ctx: ExtensionContext) => {
		try {
			if (!ctx.hasUI) return;
			const n = trava ? Object.keys(trava.models).length : 0;
			const th = ctx.ui.theme;
			const texto = `${ICONE_TRAVA ? `${ICONE_TRAVA} ` : ""}${n} ${n === 1 ? "modelo travado" : "modelos travados"}`;
			ctx.ui.setStatus("travar-modelos", trava ? th.fg("warning", texto) : undefined);
		} catch {}
	};

	/** Leva o chat principal para um par permitido. Sem reentrada: setModel/setThinkingLevel disparam os mesmos eventos. */
	async function ajustar(
		ctx: ExtensionContext,
		avisar: boolean,
		model: Model<Api> | undefined = ctx.model,
		pref?: string,
	): Promise<void> {
		if (!trava || ajustando) return;
		ajustando = true;
		try {
			const nivel: Effort = nycode.getThinkingLevel();
			const atual = model ? chave(model) : "";
			const d = decidir(trava, { modelo: atual, esforco: nivel }, pref ?? preferido);
			preferido = d.modelo;
			if (!d.mudou) return;
			if (d.modelo !== atual) {
				const alvo = resolver(d.modelo);
				if (!alvo || !(await nycode.setModel(alvo))) {
					if (ctx.hasUI)
						ctx.ui.notify(
							`Trava de modelos: não consegui usar ${d.modelo} (sem chave ou desconhecido).`,
							"warning",
						);
					return;
				}
			}
			if (d.esforco !== nycode.getThinkingLevel()) nycode.setThinkingLevel(d.esforco);
			if (avisar && ctx.hasUI)
				ctx.ui.notify(
					`Trava de modelos: ${atual} · ${nivel} não é permitido nesta sessão; voltei para ${d.modelo} · ${d.esforco}`,
					"warning",
				);
		} catch (e) {
			try {
				if (ctx.hasUI) ctx.ui.notify(`Trava de modelos: falha ao ajustar a sessão (${mensagem(e)})`, "warning");
			} catch {}
		} finally {
			ajustando = false;
		}
	}

	const seguro =
		<A extends unknown[]>(f: (...a: A) => Promise<void> | void) =>
		async (...a: A) => {
			try {
				await f(...a);
			} catch {}
		};

	nycode.on(
		"session_start",
		seguro(async (_e, ctx) => {
			ctxRef = ctx;
			const reg = ctx.modelRegistry as unknown as ComRuntime & Runtime;
			const rt = reg.runtime ?? reg;
			embrulhar(rt, "streamSimple");
			embrulhar(rt, "stream");
			if (ctx.model) preferido = chave(ctx.model);
			if (trava) {
				await ajustar(ctx, false);
				status(ctx);
			}
		}),
	);

	nycode.on(
		"model_select",
		seguro(async (e, ctx) => {
			ctxRef = ctx;
			if (ajustando) return;
			const prev = e.previousModel ? chave(e.previousModel) : undefined;
			if (!trava || trava.models[chave(e.model)]) preferido = chave(e.model);
			await ajustar(ctx, true, e.model, prev);
		}),
	);

	nycode.on(
		"thinking_level_select",
		seguro(async (_e, ctx) => {
			ctxRef = ctx;
			await ajustar(ctx, true);
		}),
	);

	nycode.on("tool_call", (e) => {
		try {
			if (!trava || (e.toolName !== "bash" && e.toolName !== "run")) return undefined;
			if (JSON.stringify(e.input ?? "").includes("NYCODE_MODEL_LOCK")) {
				return {
					block: true,
					reason:
						"travar-modelos: comandos que mexem em NYCODE_MODEL_LOCK são bloqueados enquanto a trava está ligada",
				};
			}
		} catch {}
		return undefined;
	});

	/** Lista para o seletor, como setupModels do roteamento (subagent/routing/command.ts). */
	function modelosDoSeletor(ctx: ExtensionCommandContext): Array<{ key: string; levels: Effort[] }> {
		return ctx.modelRegistry
			.getAvailable()
			.map((m) => ({ key: chave(m), levels: EFFORTS.filter((e) => getSupportedThinkingLevels(m).includes(e)) }))
			.filter((m) => m.levels.length > 0);
	}

	async function aplicar(nova: Trava, ctx: ExtensionCommandContext) {
		trava = nova;
		erroEnv = undefined;
		env.NYCODE_MODEL_LOCK = paraEnv(nova);
		ctxRef = ctx;
		await ajustar(ctx, false);
		status(ctx);
		ctx.ui.notify(CAIXA_AVISO + formatar(nova), "info");
	}

	nycode.registerCommand("travar-modelos", {
		description:
			"Obriga esta sessão (chat, subagentes, run, plano) a usar só os modelos e esforços escolhidos (show | off)",
		handler: async (args: string, ctx: ExtensionCommandContext) => {
			try {
				const arg = args.trim();
				if (arg.toLowerCase() === "show") {
					return ctx.ui.notify(
						erroEnv
							? `NYCODE_MODEL_LOCK inválido (${erroEnv}): chamadas de modelo bloqueadas.`
							: (trava ? CAIXA_AVISO : "") + formatar(trava),
						erroEnv ? "error" : "info",
					);
				}
				if (arg.toLowerCase() === "off") {
					trava = undefined;
					erroEnv = undefined;
					delete env.NYCODE_MODEL_LOCK;
					status(ctx);
					return ctx.ui.notify("Trava de modelos desligada.", "info");
				}
				if (arg) {
					const r = deArgs(arg);
					if (typeof r === "string") return ctx.ui.notify(`${r}\n${USO}`, "error");
					const desconhecido = Object.keys(r.models).find((k) => !resolverEm(ctx, k));
					if (desconhecido)
						return ctx.ui.notify(`Modelo desconhecido: ${desconhecido}. Nada foi aplicado.`, "error");
					return await aplicar(r, ctx);
				}
				if (!ctx.hasUI) return ctx.ui.notify(`Sem argumentos precisa da TUI. ${USO}`, "error");
				const models = modelosDoSeletor(ctx);
				if (models.length === 0) return ctx.ui.notify("Nenhum modelo disponível para escolher.", "error");
				const escolhido = await ctx.ui.custom<unknown>(
					(tui, theme, _k, done) =>
						new SetupComponent({
							models,
							current: trava,
							done,
							requestRender: () => tui.requestRender(),
							theme,
							rows: () => tui.terminal.rows,
							title: { name: "Trava de modelos", hint: "quais modelos a sessão pode usar" },
						}),
					{ overlay: true, overlayOptions: { ...OVERLAY } },
				);
				if (!escolhido) return ctx.ui.notify("Trava de modelos inalterada.", "info");
				const v = analisar(escolhido);
				if (typeof v === "string") return ctx.ui.notify(`Seleção inválida: ${v}`, "error");
				await aplicar(v, ctx);
			} catch (e) {
				try {
					ctx.ui.notify(`travar-modelos: ${mensagem(e)}`, "error");
				} catch {}
			}
		},
	});
}

const resolverEm = (ctx: ExtensionCommandContext, k: string): boolean => {
	const [p, id] = separar(k);
	return !!ctx.modelRegistry.find(p, id);
};

/** Marca invisível lida pelo patch de avisos do core (caixaNeutra): caixa com fundo de aviso. */
const CAIXA_AVISO = "\u2063\u2063";

export default montar;
