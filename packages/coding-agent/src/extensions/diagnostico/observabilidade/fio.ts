/** Wire observation: wraps the runtime stream functions once per instance and turns each model call into a `chat` span. */
import type { ExtensionContext } from "../../../core/extensions/types.ts";
import { eventoModelo, MARCA_FIO, mensagem, seguro } from "../base.ts";
import { redigir } from "../registro.ts";
import type { Attrs, criarTrilha } from "./trilha.ts";

type Trilha = ReturnType<typeof criarTrilha>;
type ModeloLike = { provider?: string; id?: string };
type OpcoesLike = { reasoning?: unknown };
type UsoLike = {
	input?: unknown;
	output?: unknown;
	cacheRead?: unknown;
	cacheWrite?: unknown;
	cacheWrite1h?: unknown;
};
type MensagemLike = { usage?: UsoLike; stopReason?: unknown; errorMessage?: unknown };
type Fim = (msg?: MensagemLike, err?: unknown) => void;
type Holder = { obs?: (nome: string, model: ModeloLike | undefined, options: OpcoesLike | undefined) => Fim };
type FioFn = ((this: unknown, ...args: unknown[]) => unknown) & { [MARCA_FIO]?: Holder; original?: FioFn };
type Runtime = Partial<Record<"streamSimple" | "stream", FioFn>>;
type Resultado = { result?: () => unknown; then?: unknown };

export type Fio = { embrulhar(ctx: ExtensionContext): void; limpar(): void };

export type DepsFio = {
	trilha: Trilha;
	spansChat: Set<string>;
	pai: () => string | undefined;
	reportarModelo: (quem: "fio" | "fim", msg: string, tipo: string, spanId?: string) => void;
};

export function criarFio(d: DepsFio): Fio {
	const { trilha, spansChat, pai, reportarModelo } = d;
	let holders: Holder[] = [];

	/** Abre o span `chat` de uma chamada de modelo; devolve o fechamento (idempotente). Só nomes, tamanhos e ids. */
	const observarChamada = (nome: string, model: ModeloLike | undefined, options: OpcoesLike | undefined): Fim => {
		const esforco =
			typeof options?.reasoning === "string" ? options.reasoning : nome === "streamSimple" ? "off" : undefined;
		const attrs: Attrs = {
			"gen_ai.operation.name": "chat",
			"gen_ai.provider.name": String(model?.provider ?? "desconhecido"),
			"gen_ai.request.model": String(model?.id ?? "desconhecido"),
		};
		if (esforco) attrs["nycode.effort"] = esforco;
		const id = trilha.abrir(`chat ${eventoModelo(model)}`, attrs, pai());
		spansChat.add(id);
		let fechado = false;
		return (msg, err) => {
			if (fechado) return;
			fechado = true;
			spansChat.delete(id);
			const a: Attrs = {};
			const u = msg?.usage;
			if (typeof u?.input === "number") a["gen_ai.usage.input_tokens"] = u.input;
			if (typeof u?.output === "number") a["gen_ai.usage.output_tokens"] = u.output;
			if (typeof u?.cacheRead === "number") a["gen_ai.usage.cache_read.input_tokens"] = u.cacheRead;
			if (typeof u?.cacheWrite === "number") a["gen_ai.usage.cache_creation.input_tokens"] = u.cacheWrite;
			if (typeof u?.cacheWrite1h === "number") a["nycode.usage.cache_creation_1h.input_tokens"] = u.cacheWrite1h; // subconjunto de cacheWrite (só Anthropic)
			if (typeof msg?.stopReason === "string") a["gen_ai.response.finish_reasons"] = msg.stopReason;
			const bruto =
				err !== undefined
					? mensagem(err)
					: msg?.stopReason === "error"
						? String(msg.errorMessage ?? "erro sem mensagem")
						: undefined;
			trilha.fechar(id, a, bruto === undefined ? undefined : redigir(bruto).slice(0, 500));
			if (bruto !== undefined) reportarModelo("fio", bruto, "chamada", id);
		};
	};

	/** `.result()` do stream é uma promessa compartilhada (nunca consome o stream): chamar de novo é seguro. */
	const acompanhar = (ret: Resultado | undefined, fim: Fim) => {
		const p = typeof ret?.result === "function" ? ret.result() : typeof ret?.then === "function" ? ret : undefined;
		if (!p) return fim();
		Promise.resolve(p)
			.then(
				(m) => seguro(fim)(m as MensagemLike),
				(e) => seguro(fim)(undefined, e),
			)
			.catch(() => {});
	};

	return {
		/** Embrulha streamSimple/stream do runtime uma vez por instância (marca própria, também sob o wrapper do travar-modelos). */
		embrulhar(ctx) {
			// The registry keeps its runtime in a private field; the wrapper reaches it as the harness always did.
			const reg0 = ctx.modelRegistry as unknown as { runtime?: Runtime } | undefined;
			const rt = (reg0?.runtime ?? reg0) as Runtime | undefined;
			if (!rt) return;
			for (const nome of ["streamSimple", "stream"] as const) {
				const orig = rt[nome];
				if (typeof orig !== "function") continue;
				let holder: Holder | undefined;
				for (let x: FioFn | undefined = orig, i = 0; x && i < 10 && !holder; x = x.original, i++)
					holder = x[MARCA_FIO];
				if (!holder) {
					const h: Holder = {};
					holder = h;
					const f: FioFn = function (this: unknown, ...args: unknown[]) {
						let fim: Fim | undefined;
						try {
							fim = h.obs?.(nome, args[0] as ModeloLike | undefined, args[2] as OpcoesLike | undefined);
						} catch {}
						let ret: unknown;
						try {
							ret = orig.apply(this, args);
						} catch (e) {
							seguro(() => fim?.(undefined, e))();
							throw e;
						}
						if (fim) {
							try {
								acompanhar(ret as Resultado | undefined, fim);
							} catch (e) {
								seguro(() => fim?.(undefined, e))();
							}
						}
						return ret;
					};
					f[MARCA_FIO] = h;
					f.original = orig;
					rt[nome] = f;
				}
				holder.obs = observarChamada;
				holders.push(holder);
			}
		},
		limpar() {
			for (const h of holders) h.obs = undefined;
			holders = [];
		},
	};
}
