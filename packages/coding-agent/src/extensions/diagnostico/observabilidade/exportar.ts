/** Exportação OTLP JSON: TracesData em JSON Lines (arquivo com rotação) e POST OTLP/HTTP opcional. Puro (sem nycode). */

import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { rotacionar } from "../registro.ts";
import type { Attrs, Span } from "./trilha.ts";

type Valor = { stringValue: string } | { intValue: string } | { doubleValue: number } | { boolValue: boolean };

const valor = (v: Attrs[string]): Valor => {
	if (typeof v === "boolean") return { boolValue: v };
	if (typeof v === "number") {
		if (!Number.isFinite(v)) return { stringValue: String(v) }; // JSON não representa NaN/Infinity
		return Number.isInteger(v) ? { intValue: String(v) } : { doubleValue: v };
	}
	return { stringValue: String(v) };
};
const attrs = (a: Record<string, string | number | boolean>) =>
	Object.entries(a).map(([key, v]) => ({ key, value: valor(v) }));
const nanos = (ms: number) => (BigInt(Math.trunc(ms)) * 1_000_000n).toString();

/** TracesData do OTLP/JSON; evento tem fim = início; kind 3 (CLIENT) para `chat …`, senão 1 (INTERNAL). */
export function paraOtlp(spans: Span[], recurso: Record<string, string>): object {
	return {
		resourceSpans: [
			{
				resource: { attributes: Object.entries(recurso).map(([key, v]) => ({ key, value: { stringValue: v } })) },
				scopeSpans: [
					{
						scope: { name: "nycode.diagnostico" },
						spans: spans.map((s) => ({
							traceId: s.traceId,
							spanId: s.spanId,
							...(s.parentId ? { parentSpanId: s.parentId } : {}),
							name: s.nome,
							kind: s.nome.startsWith("chat ") ? 3 : 1,
							startTimeUnixNano: nanos(s.inicio),
							endTimeUnixNano: nanos(s.tipo === "evento" ? s.inicio : (s.fim ?? s.inicio)),
							attributes: attrs(s.attrs),
							status: s.erro !== undefined ? { code: 2, message: s.erro } : { code: 1 },
						})),
					},
				],
			},
		],
	};
}

/** `OTEL_EXPORTER_OTLP_HEADERS`: `k=v,k2=v2`; pares sem `=` ou sem chave são ignorados. */
export function lerHeaders(v: string | undefined): Record<string, string> {
	const r: Record<string, string> = {};
	for (const par of (v ?? "").split(",")) {
		const i = par.indexOf("=");
		const k = i > 0 ? par.slice(0, i).trim() : "";
		if (k) r[k] = par.slice(i + 1).trim();
	}
	return r;
}

export interface OpcoesExportador {
	arquivo?: string;
	endpoint?: string;
	headers?: Record<string, string>;
	recurso: Record<string, string>;
	fetch?: typeof fetch;
	lote?: number;
	fila?: number;
	maxBytes?: number;
	aoFalhar?: (msg: string) => void;
	filtro?: (s: Span) => Span;
}

export function criarExportador(o: OpcoesExportador) {
	const lote = Math.max(1, o.lote ?? 100);
	const limite = o.fila ?? 1000;
	const maxBytes = o.maxBytes ?? 5 * 1024 * 1024;
	const dito = new Set<string>();
	let fila: Span[] = [];
	let preparado = false;

	const falhar = (msg: string) => {
		if (dito.has(msg)) return;
		dito.add(msg);
		try {
			o.aoFalhar?.(msg);
		} catch {}
	};

	let url: string | undefined;
	if (o.endpoint) {
		try {
			const u = new URL(o.endpoint);
			if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error(u.protocol);
			url = `${o.endpoint.replace(/\/+$/, "")}/v1/traces`;
		} catch {
			falhar("endpoint OTLP inválido (só http: e https:)");
		}
	}

	const gravar = (linha: string) => {
		const a = o.arquivo;
		if (!a) return;
		try {
			if (!preparado) {
				mkdirSync(dirname(a), { recursive: true });
				preparado = true;
			}
			rotacionar(a, maxBytes);
			appendFileSync(a, `${linha}\n`, { mode: 0o600 });
		} catch (e) {
			falhar(`falha ao gravar ${a}: ${e instanceof Error ? e.message : String(e)}`);
		}
	};

	const enviar = async (corpo: string) => {
		if (!url) return;
		try {
			const f = o.fetch ?? globalThis.fetch;
			const r = await f(url, {
				method: "POST",
				headers: { ...o.headers, "content-type": "application/json" },
				body: corpo,
				signal: AbortSignal.timeout(5000),
			});
			if (!r.ok) falhar(`OTLP ${url}: HTTP ${r.status}`);
		} catch (e) {
			falhar(`OTLP ${url}: ${e instanceof Error ? e.message : String(e)}`);
		}
	};

	return {
		enfileirar(s: Span): void {
			fila.push(s);
			if (fila.length > limite) fila = fila.slice(fila.length - limite);
		},
		async descarregar(): Promise<void> {
			const pegos = fila; // troca síncrona: chamadas concorrentes veem a fila vazia
			fila = [];
			try {
				for (let i = 0; i < pegos.length; i += lote) {
					const parte = pegos.slice(i, i + lote);
					gravar(JSON.stringify(paraOtlp(parte, o.recurso)));
					if (url) {
						const rede = o.filtro
							? parte.map((s) => {
									try {
										return o.filtro!(s);
									} catch {
										return s;
									}
								})
							: parte;
						await enviar(JSON.stringify(paraOtlp(rede, o.recurso)));
					}
				}
			} catch (e) {
				falhar(`exportação: ${e instanceof Error ? e.message : String(e)}`);
			}
		},
	};
}
