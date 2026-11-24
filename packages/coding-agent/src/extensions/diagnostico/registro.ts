/** Registro de erros e avisos: memória (dedup, limite), log JSONL com campos OTel, leitura da caixa de entrada TSV e título humano (só exibição). */

import {
	appendFileSync,
	closeSync,
	fstatSync,
	mkdirSync,
	openSync,
	readFileSync,
	readSync,
	renameSync,
	statSync,
	unlinkSync,
} from "node:fs";
import { dirname } from "node:path";

export type Sev = 9 | 13 | 17 | 21; // SeverityNumber do OTel: INFO, WARN, ERROR, FATAL
/** `traceId`/`spanId`: span ativo na captura (correlação log ↔ trilha); ficam fora da chave de agrupamento. */
export interface Entrada {
	sev: Sev;
	fonte: string;
	tipo: string;
	msg: string;
	detalhe?: string;
	quieto?: boolean;
	traceId?: string;
	spanId?: string;
}
export interface Registro {
	ts: number;
	ultimo: number;
	sev: Sev;
	fonte: string;
	tipo: string;
	msg: string;
	detalhe?: string;
	n: number;
	visto: boolean;
	silencioso: boolean;
	traceId?: string;
	spanId?: string;
}
export interface Opcoes {
	agora: () => number;
	arquivo?: string;
	sessao?: string | (() => string | undefined);
	limite?: number;
	maxBytes?: number;
}
export interface OpcoesAdicionar {
	visto?: boolean;
	ts?: number;
	persistir?: boolean;
}

const TEXTO: Record<Sev, string> = { 9: "INFO", 13: "WARN", 17: "ERROR", 21: "FATAL" };
export const SEVS: readonly number[] = [9, 13, 17, 21];
export const REDIGIDO = "«redigido»";

/** Segredos conhecidos viram «redigido» (a mensagem fica legível, o valor some). */
export function redigir(s: string): string {
	return s
		.replace(/\bsk-[A-Za-z0-9_-]{8,}/g, REDIGIDO)
		.replace(/\bgh[pousr]_[A-Za-z0-9]{10,}/g, REDIGIDO)
		.replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, REDIGIDO)
		.replace(
			/\b(api[_-]?key|token|secret|password|authorization)(["']?\s*[:=]\s*["']?)(?!«)[^\s"',;&]+/gi,
			`$1$2${REDIGIDO}`,
		);
}

export const chave = (r: { fonte: string; tipo: string; msg: string }): string => `${r.fonte}|${r.tipo}|${r.msg}`;

/** Rotação segura entre processos: o rename para um nome próprio é o "trinco" (só um processo leva o arquivo grande); quem
 * levou o arquivo pequeno e novo de outro devolve o conteúdo. Mantém `.1` e `.2` (teto: 3 × maxBytes). Nunca lança.
 * ponytail: um crash entre o trinco e o fim deixa `<arquivo>.rot.<pid>`; sem limpeza automática. */
export function rotacionar(
	arquivo: string,
	maxBytes: number,
	io: { statSync: (p: string) => { size: number } } = { statSync },
): void {
	try {
		if (io.statSync(arquivo).size <= maxBytes) return;
	} catch {
		return;
	}
	const tmp = `${arquivo}.rot.${process.pid}`;
	try {
		renameSync(arquivo, tmp);
	} catch {
		return; // outro processo levou
	}
	try {
		if (statSync(tmp).size <= maxBytes) {
			appendFileSync(arquivo, readFileSync(tmp), { mode: 0o600 }); // já tinha rotacionado: devolve o arquivo novo
			unlinkSync(tmp);
			return;
		}
		try {
			renameSync(`${arquivo}.1`, `${arquivo}.2`);
		} catch {}
		renameSync(tmp, `${arquivo}.1`);
	} catch {}
}

export function criarRegistro(o: Opcoes) {
	const limite = o.limite ?? 200;
	const maxBytes = o.maxBytes ?? 1024 * 1024;
	let lista: Registro[] = [];
	const silenciadas = new Set<string>();
	let falhas = 0;
	let preparado = false;

	const gravar = (r: Registro, ts: number) => {
		if (!o.arquivo) return;
		try {
			if (!preparado) {
				mkdirSync(dirname(o.arquivo), { recursive: true, mode: 0o700 });
				preparado = true;
			}
			rotacionar(o.arquivo, maxBytes);
			const sessao = typeof o.sessao === "function" ? o.sessao() : o.sessao;
			const linha = {
				ts: new Date(ts).toISOString(),
				severityNumber: r.sev,
				severityText: TEXTO[r.sev],
				source: r.fonte,
				"error.type": r.tipo,
				body: r.msg,
				detail: r.detalhe,
				session: sessao,
				pid: process.pid,
				trace_id: r.traceId,
				span_id: r.spanId,
			};
			appendFileSync(o.arquivo, `${JSON.stringify(linha)}\n`, { mode: 0o600 });
		} catch {
			falhas++;
		}
	};

	return {
		adicionar(e: Entrada, op: OpcoesAdicionar = {}): { registro: Registro; novo: boolean } {
			const agora = op.ts ?? o.agora();
			const bruto = redigir(String(e.msg));
			const linhas = bruto
				.split(/\r?\n/)
				.map((l) => l.trim())
				.filter(Boolean);
			const msg = linhas[0] ?? "(sem mensagem)";
			let detalhe = e.detalhe === undefined || e.detalhe === "" ? undefined : redigir(String(e.detalhe));
			if (detalhe === undefined && linhas.length > 1) detalhe = bruto.trim();
			const k = chave({ fonte: e.fonte, tipo: e.tipo, msg });
			const silencioso = silenciadas.has(k);
			let r = lista.find((x) => chave(x) === k);
			const novo = !r && !silencioso;
			if (r) {
				r.n++;
				r.ultimo = agora;
				r.detalhe ??= detalhe;
				if (e.spanId) [r.traceId, r.spanId] = [e.traceId, e.spanId]; // a ocorrência mais recente
				lista = [r, ...lista.filter((x) => x !== r)];
			} else {
				r = {
					ts: agora,
					ultimo: agora,
					sev: e.sev,
					fonte: e.fonte,
					tipo: e.tipo,
					msg,
					detalhe,
					n: 1,
					visto: op.visto === true,
					silencioso,
					traceId: e.traceId,
					spanId: e.spanId,
				};
				lista = [r, ...lista].slice(0, limite);
			}
			if (op.persistir !== false) gravar(r, agora);
			return { registro: r, novo };
		},
		lista: (): Registro[] => lista,
		contagem() {
			let erros = 0;
			let avisos = 0;
			for (const r of lista) {
				if (r.visto || r.silencioso || r.sev < 13) continue;
				if (r.sev >= 17) erros++;
				else avisos++;
			}
			return { erros, avisos };
		},
		marcarVistos() {
			for (const r of lista) r.visto = true;
		},
		silenciar(k: string) {
			silenciadas.add(k);
			for (const r of lista) if (chave(r) === k) r.silencioso = true;
		},
		reativar(k: string) {
			silenciadas.delete(k);
			for (const r of lista) if (chave(r) === k) r.silencioso = false;
		},
		limpar() {
			lista = [];
		},
		falhasDeEscrita: () => falhas,
	};
}

const desescapar = (s: string) => s.replace(/\\([tn])/g, (_m, c: string) => (c === "t" ? "\t" : "\n"));

type IoCaixa = Pick<typeof import("node:fs"), "openSync" | "fstatSync" | "readSync" | "closeSync">;

/** Lê a caixa de entrada a partir de `offset`; só consome linhas completas (terminadas em \n). Lê só os bytes novos. */
export function lerCaixa(
	caminho: string,
	offset: number,
	io: IoCaixa = { openSync, fstatSync, readSync, closeSync },
): { entradas: Entrada[]; offset: number } {
	let buf: Buffer;
	let base = offset;
	try {
		const fd = io.openSync(caminho, "r");
		try {
			const { size } = io.fstatSync(fd);
			if (size < base) base = 0; // arquivo recriado
			if (size <= base) return { entradas: [], offset: base };
			buf = Buffer.alloc(size - base);
			let lido = 0;
			while (lido < buf.length) {
				const n = io.readSync(fd, buf, lido, buf.length - lido, base + lido);
				if (n <= 0) break;
				lido += n;
			}
			buf = buf.subarray(0, lido);
		} finally {
			io.closeSync(fd);
		}
	} catch {
		return { entradas: [], offset };
	}
	const fim = buf.lastIndexOf(0x0a);
	if (fim < 0) return { entradas: [], offset: base };
	const entradas: Entrada[] = [];
	for (const linha of buf.subarray(0, fim).toString("utf8").split("\n")) {
		const c = linha.replace(/\r$/, "").split("\t");
		if (c.length < 4 || !c[1] || !c[2] || !c[3]) continue;
		const n = Number(c[0]);
		const e: Entrada = { sev: (SEVS.includes(n) ? n : 13) as Sev, fonte: c[1], tipo: c[2], msg: desescapar(c[3]) };
		if (c.length > 4) e.detalhe = desescapar(c.slice(4).join("\t"));
		entradas.push(e);
	}
	return { entradas, offset: base + fim + 1 };
}

/** Só exibição: o wrapper prefixa as mensagens com `nycode: `, redundante ao lado da fonte `wrapper`. */
export const semPi = (fonte: string, msg: string): string => (fonte === "wrapper" ? msg.replace(/^nycode: /, "") : msg);

/** Leitura humana de um registro, só para exibição: o diag.jsonl guarda o texto original. */
export interface Humano {
	titulo: string;
	tipo: string;
	corpo: string;
	correcao?: string;
	requestId?: string;
}
type Alvo = Pick<Registro, "fonte" | "tipo" | "msg" | "detalhe">;

const ESPERA = "aguarde a renovação ou troque de modelo com /model";
const COTA = "aguarde a renovação do limite; a retomada automática espera por ela";
/** Tipo do erro interno do provedor ou, sem ele, o status HTTP. */
const REGRAS: Array<{
	tipo: string;
	status: (s: number) => boolean;
	titulo: (s: number) => string;
	correcao?: string;
}> = [
	{
		tipo: "rate_limit_error",
		status: (s) => s === 429,
		titulo: () => "Limite de requisições (429)",
		correcao: ESPERA,
	},
	{
		tipo: "overloaded_error",
		status: (s) => s === 529,
		titulo: () => "Provedor sobrecarregado (529)",
		correcao: "tente de novo em instantes",
	},
	{
		tipo: "authentication_error",
		status: (s) => s === 401,
		titulo: () => "Credencial recusada (401)",
		correcao: "refaça o login com /login",
	},
	{ tipo: "permission_error", status: (s) => s === 403, titulo: () => "Sem permissão (403)" },
	{ tipo: "invalid_request_error", status: (s) => s === 400, titulo: () => "Requisição inválida (400)" },
	{ tipo: "api_error", status: (s) => s >= 500 && s < 600, titulo: (s) => `Erro do provedor (${s})` },
];

/** `<status> {json}` ou `prefixo: <status> {json}`; JSON cortado é lido por regex. */
function erroDeProvedor(
	texto: string,
): { status: number; tipo?: string; mensagem?: string; requestId?: string } | undefined {
	const m = /(?:^|[:\s])([1-5]\d\d)\s+(\{[\s\S]*)$/.exec(texto);
	if (!m) return undefined;
	const json = m[2]!;
	let o: { error?: { type?: unknown; message?: unknown }; request_id?: unknown } | undefined;
	try {
		o = JSON.parse(json);
	} catch {}
	const pega = (re: RegExp) => re.exec(json)?.[1];
	const texto1 = (v: unknown) => (typeof v === "string" && v ? v : undefined);
	const desescapar1 = (s: string | undefined) => {
		if (s === undefined) return undefined;
		try {
			return String(JSON.parse(`"${s}"`));
		} catch {
			return s.replace(/\\n/g, "\n").replace(/\\(.)/g, "$1");
		}
	};
	return {
		status: Number(m[1]),
		tipo: texto1(o?.error?.type) ?? pega(/"error"\s*:\s*\{[^{}]*?"type"\s*:\s*"([^"]+)"/),
		mensagem: texto1(o?.error?.message) ?? (desescapar1(pega(/"message"\s*:\s*"((?:[^"\\]|\\.)*)/)) || undefined),
		requestId: texto1(o?.request_id) ?? pega(/"request_id"\s*:\s*"([^"]+)/),
	};
}

/** Correções das entradas que não são de provedor, pela origem e pelo tipo. `ctrl+b` existe em EXT_ACTIONS
 * (comandos/catalog.ts, `ext.fleet`); se sair de lá, a segunda metade de `tool-travada` sai daqui. */
const DETECTOR: Record<string, string> = {
	"hook-lento": "veja o comando do hook em settings.json",
	"tool-em-laco": "interrompa com esc e revise o comando",
	"tool-travada": "interrompa com esc ou espere; ctrl+b manda para segundo plano",
};
function correcaoFixa(origem: string, subtipo: string, msg: string): string | undefined {
	if (origem === "detector") return DETECTOR[subtipo];
	if (origem === "hook")
		return /bloqueou \(\d+\)|saiu [1-9]\d*/.test(msg) ? "rode o comando do hook à mão para ver o erro" : undefined;
	if (origem === "wrapper") return "rode /doctor";
	if (origem === "otlp") return "confira OTEL_EXPORTER_OTLP_ENDPOINT";
	return undefined;
}

const STATUS_BASH = /^Command exited with code (\d+)$/;
/** Linha de marcação que o próprio comando imprimiu (`EXIT=0`, `RC=1`): não explica a falha. */
const MARCA_SHELL = /^[A-Za-z_]\w*=\S*$/;

export function humano(r: Alvo): Humano {
	const sub = /^sub(:|$)/.test(r.fonte);
	const origem = sub ? r.tipo.split(":")[0]! : r.fonte;
	const cru = r.detalhe ?? r.msg;
	// Correção que a própria entrada já traz (`→ …` ou `correção: …` no detalhe).
	const propria = /^\s*(?:→|corre[cç][aã]o:)\s*(.+)$/im.exec(r.detalhe ?? "");
	const corpoSem = propria ? cru.replace(propria[0], "").trim() || r.msg : cru;
	const base: Humano = {
		titulo: semPi(r.fonte, r.msg),
		tipo: r.tipo,
		corpo: corpoSem,
		correcao: propria?.[1]?.trim() ?? correcaoFixa(origem, sub ? r.tipo.slice(origem.length + 1) : r.tipo, r.msg),
	};

	if (origem === "tool") {
		const nome = (sub ? r.tipo.slice(5) : r.tipo) || "ferramenta";
		const linhas = cru
			.split(/\r?\n/)
			.map((l) => l.trim())
			.filter(Boolean);
		const statusIndex = linhas.findIndex((l) => STATUS_BASH.test(l));
		const codigo = statusIndex < 0 ? undefined : STATUS_BASH.exec(linhas[statusIndex]!)?.[1];
		const candidatas = statusIndex < 0 ? linhas : linhas.slice(0, statusIndex).reverse();
		const util = candidatas.find((l) => !STATUS_BASH.test(l) && !(codigo && MARCA_SHELL.test(l)));
		return { ...base, titulo: `tool ${nome}: ${util ?? (codigo ? `saiu com código ${codigo}` : r.msg)}` };
	}

	const p = erroDeProvedor(r.msg) ?? (r.detalhe ? erroDeProvedor(r.detalhe) : undefined);
	if (!p && origem !== "modelo") return base;
	const corpo = p?.mensagem ?? base.corpo;
	const tipo = p?.tipo ?? r.tipo;
	if (/quota exceeded|usage limit/i.test(`${r.msg}\n${cru}`))
		return { titulo: "Cota da conta esgotada (429)", tipo, corpo, correcao: COTA, requestId: p?.requestId };
	if (!p) return base;
	const regra = REGRAS.find((x) => x.tipo === p.tipo) ?? REGRAS.find((x) => x.status(p.status));
	if (!regra) return { ...base, tipo, corpo, requestId: p.requestId };
	return {
		titulo: regra.titulo(p.status),
		tipo,
		corpo,
		correcao: regra.correcao ?? base.correcao,
		requestId: p.requestId,
	};
}
