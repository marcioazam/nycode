/** Trilha de spans: puro (sem nycode), ids W3C, anel de spans fechados e eventos, resumo de tokens; detector de avisos derivados. */

import { createHash, randomBytes } from "node:crypto";

export type Attrs = Record<string, string | number | boolean>;
export interface Span {
	traceId: string;
	spanId: string;
	parentId?: string;
	nome: string;
	tipo: "span" | "evento";
	inicio: number;
	fim?: number;
	durMs?: number;
	attrs: Attrs;
	erro?: string;
}
export interface OpcoesTrilha {
	max?: number;
	agora?: () => number;
	traceparent?: string;
	id?: (bytes: number) => string;
	aoFechar?: (s: Span) => void;
}

const MAX_ABERTOS = 1000;
const RE_TP = /^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/;

/** Entrada não confiável: só o formato W3C estrito; ids zerados são inválidos. */
export function lerTraceparent(v: string | undefined): { traceId: string; spanId: string } | undefined {
	const m = typeof v === "string" ? RE_TP.exec(v) : null;
	if (!m || /^0+$/.test(m[1]) || /^0+$/.test(m[2])) return undefined;
	return { traceId: m[1], spanId: m[2] };
}

export function criarTrilha(o: OpcoesTrilha = {}) {
	const max = o.max ?? 500;
	const agora = o.agora ?? Date.now;
	const id = o.id ?? ((b: number) => randomBytes(b).toString("hex"));
	const recebido = lerTraceparent(o.traceparent);
	const traceId = recebido?.traceId ?? id(16);
	const emAberto = new Map<string, Span>(); // ordem de inserção = do mais antigo ao mais novo
	let anel: Span[] = [];

	const novo = (nome: string, attrs: Attrs | undefined, parentId: string | undefined, spanId: string): Span => ({
		traceId,
		spanId,
		parentId,
		nome,
		tipo: "span",
		inicio: agora(),
		attrs: { ...attrs },
	});
	const guardar = (s: Span) => {
		anel.push(s);
		if (anel.length > max) anel = anel.slice(anel.length - max);
		try {
			o.aoFechar?.(s);
		} catch {} // um observador com defeito não derruba a trilha
	};

	const raiz = novo("nycode", undefined, recebido?.spanId, id(8));
	emAberto.set(raiz.spanId, raiz);
	const raizId = raiz.spanId;

	return {
		traceId,
		raizId,
		abrir(nome: string, attrs?: Attrs, parentId?: string): string {
			const s = novo(nome, attrs, parentId ?? raizId, id(8));
			emAberto.set(s.spanId, s);
			if (emAberto.size > MAX_ABERTOS) {
				// descarta o mais antigo que não seja a raiz
				for (const k of emAberto.keys())
					if (k !== raizId) {
						emAberto.delete(k);
						break;
					}
			}
			return s.spanId;
		},
		fechar(spanId: string, attrs?: Attrs, erro?: string): Span | undefined {
			const s = emAberto.get(spanId);
			if (!s) return undefined;
			emAberto.delete(spanId);
			s.fim = agora();
			s.durMs = s.fim - s.inicio;
			Object.assign(s.attrs, attrs);
			if (erro !== undefined) s.erro = erro;
			guardar(s);
			return s;
		},
		evento(nome: string, attrs?: Attrs, erro?: string): Span {
			const s = novo(nome, attrs, raizId, id(8));
			s.tipo = "evento";
			s.fim = s.inicio;
			s.durMs = 0;
			if (erro !== undefined) s.erro = erro;
			guardar(s);
			return s;
		},
		/** Evento com duração conhecida (hook que já terminou): span fechado com início recuado em `durMs`. */
		medido(nome: string, durMs: number, attrs?: Attrs, erro?: string): Span {
			const s = novo(nome, attrs, raizId, id(8));
			s.fim = s.inicio;
			s.inicio = s.fim - durMs;
			s.durMs = durMs;
			if (erro !== undefined) s.erro = erro;
			guardar(s);
			return s;
		},
		recentes: (): Span[] => anel.slice(),
		/** Spans ainda abertos (raiz incluída), do mais antigo ao mais novo. */
		abertos: (): Span[] => [...emAberto.values()],
		traceparent: (spanId?: string): string => `00-${traceId}-${spanId ?? raizId}-01`,
		resumo() {
			let erros = 0;
			let tokensEntrada = 0;
			let tokensSaida = 0;
			const porNome: Record<string, number> = {};
			for (const s of anel) {
				if (s.erro !== undefined) erros++;
				porNome[s.nome] = (porNome[s.nome] ?? 0) + 1;
				const i = s.attrs["gen_ai.usage.input_tokens"];
				const t = s.attrs["gen_ai.usage.output_tokens"];
				if (typeof i === "number") tokensEntrada += i;
				if (typeof t === "number") tokensSaida += t;
			}
			return { spans: anel.length, erros, tokensEntrada, tokensSaida, porNome };
		},
	};
}

// ── detecção: avisos derivados dos spans fechados e dos abertos ──────────────
export interface Limites {
	hookLentoMs: number;
	modeloLentoMs: number;
	toolTravadaMs: number;
}
export const LIMITES_PADRAO: Limites = { hookLentoMs: 2000, modeloLentoMs: 120_000, toolTravadaMs: 600_000 };
export interface Deteccao {
	chave: string;
	regra: string;
	sev: 13 | 17;
	msg: string;
	spanId?: string;
}
const FALHAS_TOOL = 3;
const LACO_PADRAO = 6;

/** NYCODE_DIAG_TOOL_LACO_BLOQUEIO: chamadas idênticas seguidas (resultado já visto) que bloqueiam a próxima; `0` desliga; inválido = 6. */
export const lerLimiteLaco = (env: Record<string, string | undefined>): number => {
	const v = env.NYCODE_DIAG_TOOL_LACO_BLOQUEIO;
	return typeof v === "string" && /^\d+$/.test(v.trim()) ? Number(v.trim()) : LACO_PADRAO;
};

const estavel = (x: unknown): string =>
	x && typeof x === "object"
		? Array.isArray(x)
			? `[${x.map(estavel)}]`
			: `{${Object.keys(x)
					.sort()
					.map((k) => `${JSON.stringify(k)}:${estavel((x as Record<string, unknown>)[k])}`)}}`
		: (JSON.stringify(x) ?? "undefined");

/** Escalada do `tool-em-laco`: depois de `limite` chamadas idênticas seguidas (mesma tool, entrada e resultado), cujo resultado o modelo já
 * viu, `aoChamar` devolve o motivo do bloqueio da próxima. Outra entrada ou tool zera; o bloqueio não conta como resultado visto. */
export function criarGuardaLaco(limite: number) {
	let ultima: string | undefined;
	let ultimaChamada: string | undefined;
	let n = 0;
	const pendentes = new Map<string, string>();
	return {
		aoChamar(id: string, nome: string, input: unknown): string | undefined {
			if (!limite) return undefined;
			const k = `${nome}|${createHash("sha1").update(estavel(input)).digest("hex")}`;
			if (k === ultimaChamada && n >= limite)
				return `A tool ${nome} já foi chamada ${n} vezes seguidas com a mesma entrada e o mesmo resultado. Mude de abordagem: outra entrada, outra tool ou explique o que está bloqueando.`;
			if (pendentes.size > 200) pendentes.clear();
			pendentes.set(id, k);
			return undefined;
		},
		/** `resultado` entra na chave: polling (mesma entrada, resultado que muda) nunca é laço. */
		aoResultado(id: string, resultado?: unknown, erro?: boolean): void {
			const c = pendentes.get(id);
			if (c === undefined) return;
			pendentes.delete(id);
			const k = `${c}|${erro ? 1 : 0}|${createHash("sha1")
				.update(estavel(resultado ?? null))
				.digest("hex")}`;
			n = k === ultima ? n + 1 : 1;
			ultima = k;
			ultimaChamada = c;
		},
	};
}
const FALHAS_MODELO = 3;
const JANELA_MODELO = 5 * 60_000;

/** NYCODE_DIAG_*_MS em milissegundos: só inteiro não negativo vale; o resto cai no padrão; `0` desliga a regra. */
export function lerLimites(env: Record<string, string | undefined>): Limites {
	const ler = (v: string | undefined, padrao: number) =>
		typeof v === "string" && /^\d+$/.test(v.trim()) ? Number(v.trim()) : padrao;
	return {
		hookLentoMs: ler(env.NYCODE_DIAG_HOOK_LENTO_MS, LIMITES_PADRAO.hookLentoMs),
		modeloLentoMs: ler(env.NYCODE_DIAG_MODELO_LENTO_MS, LIMITES_PADRAO.modeloLentoMs),
		toolTravadaMs: ler(env.NYCODE_DIAG_TOOL_TRAVADA_MS, LIMITES_PADRAO.toolTravadaMs),
	};
}

/** Nome curto do comando de um hook: basename do primeiro token. */
export const comandoCurto = (cmd: unknown): string =>
	typeof cmd === "string" ? ((cmd.trim().split(/\s+/)[0] ?? "").split(/[\\/]/).pop() ?? "") : "";

/** Cada detecção sai uma vez por chave; só `tool-em-laco` rearma (depois de um sucesso da mesma tool). Nunca lança. */
/** Tools abertas por natureza, sem alerta de tempo: `question` espera o usuário; `subagent` em primeiro plano é um filho longo e
 * legítimo (o tempo total não distingue travado de longo; o `quietMs` do painel de agentes mostra o silêncio do filho). */
const TOOLS_SEM_ALERTA: ReadonlySet<string> = new Set(["question", "subagent"]);

export function criarDetector(o: { agora?: () => number; limites?: Partial<Limites>; relatar: (d: Deteccao) => void }) {
	const agora = o.agora ?? Date.now;
	const lim: Limites = { ...LIMITES_PADRAO, ...o.limites };
	const relatadas = new Set<string>();
	const seguidas = new Map<string, number>(); // tool → erros seguidos
	let falhasModelo: number[] = [];
	const relatar = (chave: string, regra: string, sev: 13 | 17, msg: string, spanId?: string) => {
		if (relatadas.has(chave)) return;
		if (relatadas.size > 500) relatadas.clear(); // ponytail: teto simples; depois dele uma chave antiga pode repetir
		relatadas.add(chave);
		try {
			o.relatar({ chave, regra, sev, msg, spanId });
		} catch {}
	};

	return {
		aoFechar(s: Span): void {
			if (s.nome.startsWith("nycode.hook ")) {
				const ms = s.attrs["nycode.hook.duration_ms"];
				if (!lim.hookLentoMs || typeof ms !== "number" || ms < lim.hookLentoMs) return;
				const evento = s.nome.slice("nycode.hook ".length);
				const cmd = comandoCurto(s.attrs["nycode.hook.command"]);
				relatar(
					`hook-lento|${evento}|${cmd}`,
					"hook-lento",
					13,
					`hook ${evento}${cmd ? ` · ${cmd}` : ""} levou ${ms} ms`,
					s.spanId,
				);
			} else if (s.tipo === "span" && s.nome.startsWith("chat ")) {
				const modelo = s.nome.slice(5);
				if (lim.modeloLentoMs && (s.durMs ?? 0) >= lim.modeloLentoMs)
					relatar(
						`modelo-lento|${modelo}`,
						"modelo-lento",
						13,
						`modelo ${modelo} levou ${Math.round((s.durMs ?? 0) / 1000)} s`,
						s.spanId,
					);
				if (s.erro === undefined) return;
				const t = agora();
				falhasModelo = [...falhasModelo, t].filter((x) => t - x <= JANELA_MODELO).slice(-FALHAS_MODELO);
				if (falhasModelo.length >= FALHAS_MODELO)
					relatar(
						"erros-de-modelo",
						"erros-de-modelo",
						17,
						`${FALHAS_MODELO} chamadas de modelo falharam em 5 min`,
						s.spanId,
					);
			} else if (s.tipo === "span" && s.nome.startsWith("execute_tool ")) {
				const nome = s.nome.slice(13);
				const chave = `tool-em-laco|${nome}`;
				if (s.erro === undefined) {
					seguidas.delete(nome);
					relatadas.delete(chave);
					return;
				}
				const n = (seguidas.get(nome) ?? 0) + 1;
				seguidas.set(nome, n);
				if (n >= FALHAS_TOOL)
					relatar(chave, "tool-em-laco", 13, `tool ${nome} falhou ${FALHAS_TOOL} vezes seguidas`, s.spanId);
			}
		},
		/** `abertos` = `trilha.abertos()`; só spans de tool contam. */
		verificarAbertos(abertos: Span[]): void {
			if (!lim.toolTravadaMs) return;
			const t = agora();
			for (const s of abertos) {
				if (!s.nome.startsWith("execute_tool ") || t - s.inicio < lim.toolTravadaMs) continue;
				if (TOOLS_SEM_ALERTA.has(s.nome.slice(13))) continue;
				relatar(
					`tool-travada|${s.spanId}`,
					"tool-travada",
					13,
					`tool ${s.nome.slice(13)} rodando há ${Math.floor((t - s.inicio) / 60_000)} min`,
					s.spanId,
				);
			}
		},
	};
}
