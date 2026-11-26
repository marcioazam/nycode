// node --experimental-strip-types --test extensions/diagnostico/test/obs/exportar.test.ts
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, test, vi } from "vitest";
import {
	criarExportador,
	lerHeaders,
	paraOtlp,
} from "../../../../../src/extensions/diagnostico/observabilidade/exportar.ts";

// The rendering reads TERM: pin it so the suite does not depend on the shell it runs in.
beforeEach(() => {
	vi.stubEnv("TERM", "xterm-256color");
});
afterEach(() => {
	vi.unstubAllEnvs();
});

const T = "a".repeat(32);
const span = (extra: object = {}) => ({
	traceId: T,
	spanId: "b".repeat(16),
	nome: "x",
	tipo: "span" as const,
	inicio: 1700000000123,
	fim: 1700000000623,
	durMs: 500,
	attrs: {},
	...extra,
});
const dir = () => mkdtempSync(join(tmpdir(), "diag-exp-"));
const linhas = (f: string) =>
	readFileSync(f, "utf8")
		.trim()
		.split("\n")
		.map((l) => JSON.parse(l));
const resp = (status: number) => ({ ok: status >= 200 && status < 300, status }) as Response;

function fakeFetch(status = 200) {
	const chamadas: { url: string; init: any }[] = [];
	const f = (async (url: any, init: any) => {
		chamadas.push({ url: String(url), init });
		return resp(status);
	}) as typeof fetch;
	return { f, chamadas };
}

test("paraOtlp: forma, ids, nanos via BigInt e status", () => {
	const o: any = paraOtlp([span({ parentId: "c".repeat(16), attrs: { s: "a", i: 3, d: 1.5, b: true } })], {
		"service.name": "nycode",
	});
	const rs = o.resourceSpans[0];
	assert.deepEqual(rs.resource.attributes, [{ key: "service.name", value: { stringValue: "nycode" } }]);
	assert.equal(rs.scopeSpans[0].scope.name, "nycode.diagnostico");
	const s = rs.scopeSpans[0].spans[0];
	assert.equal(s.traceId, T);
	assert.equal(s.parentSpanId, "c".repeat(16));
	assert.equal(s.startTimeUnixNano, "1700000000123000000");
	assert.equal(s.endTimeUnixNano, "1700000000623000000");
	assert.equal(s.kind, 1);
	assert.deepEqual(s.status, { code: 1 });
	assert.deepEqual(s.attributes, [
		{ key: "s", value: { stringValue: "a" } },
		{ key: "i", value: { intValue: "3" } },
		{ key: "d", value: { doubleValue: 1.5 } },
		{ key: "b", value: { boolValue: true } },
	]);
});

test('paraOtlp: sem parentSpanId, CLIENT em "chat ", erro vira status 2, evento fim = início', () => {
	const o: any = paraOtlp(
		[span({ nome: "chat m", erro: "falhou" }), span({ tipo: "evento", fim: 1700000009999 })],
		{},
	);
	const [a, b] = o.resourceSpans[0].scopeSpans[0].spans;
	assert.equal("parentSpanId" in a, false);
	assert.equal(a.kind, 3);
	assert.deepEqual(a.status, { code: 2, message: "falhou" });
	assert.equal(b.endTimeUnixNano, b.startTimeUnixNano);
	assert.equal(b.kind, 1);
});

test("lerHeaders ignora pares malformados", () => {
	assert.deepEqual(lerHeaders("a=1, b=x=y ,ruim,=v,c="), { a: "1", b: "x=y", c: "" });
	assert.deepEqual(lerHeaders(undefined), {});
	assert.deepEqual(lerHeaders(""), {});
});

test("arquivo: uma linha por lote, modo 0600, diretório criado", async () => {
	const arquivo = join(dir(), "sub", "traces.jsonl");
	const e = criarExportador({ arquivo, recurso: { a: "b" } });
	e.enfileirar(span());
	e.enfileirar(span({ nome: "y" }));
	await e.descarregar();
	const l = linhas(arquivo);
	assert.equal(l.length, 1);
	assert.equal(l[0].resourceSpans[0].scopeSpans[0].spans.length, 2);
	assert.equal(statSync(arquivo).mode & 0o777, 0o600);
	await e.descarregar(); // fila vazia: nada novo
	assert.equal(linhas(arquivo).length, 1);
});

test("lote divide a fila em várias linhas", async () => {
	const arquivo = join(dir(), "t.jsonl");
	const e = criarExportador({ arquivo, recurso: {}, lote: 2 });
	for (let i = 0; i < 5; i++) e.enfileirar(span());
	await e.descarregar();
	assert.deepEqual(
		linhas(arquivo).map((l) => l.resourceSpans[0].scopeSpans[0].spans.length),
		[2, 2, 1],
	);
});

test("rotação para .1 quando passa de maxBytes", async () => {
	const arquivo = join(dir(), "t.jsonl");
	const e = criarExportador({ arquivo, recurso: {}, maxBytes: 100 });
	e.enfileirar(span());
	await e.descarregar();
	e.enfileirar(span());
	await e.descarregar(); // a 1ª linha já passou de 100 bytes
	assert.ok(existsSync(`${arquivo}.1`));
	assert.equal(linhas(arquivo).length, 1);
	assert.equal(linhas(`${arquivo}.1`).length, 1);
});

test("rede: POST em {endpoint}/v1/traces com headers; filtro só na cópia de rede", async () => {
	const arquivo = join(dir(), "t.jsonl");
	const { f, chamadas } = fakeFetch();
	const e = criarExportador({
		arquivo,
		endpoint: "http://c.local:4318/",
		headers: { authorization: "k" },
		recurso: {},
		fetch: f,
		filtro: (s) => ({
			...s,
			attrs: Object.fromEntries(Object.entries(s.attrs).filter(([k]) => k !== "nycode.hook.stderr")),
		}),
	});
	e.enfileirar(span({ attrs: { "nycode.hook.stderr": "segredo", ok: 1 } }));
	await e.descarregar();
	assert.equal(chamadas.length, 1);
	assert.equal(chamadas[0].url, "http://c.local:4318/v1/traces");
	assert.equal(chamadas[0].init.method, "POST");
	assert.equal(chamadas[0].init.headers["content-type"], "application/json");
	assert.equal(chamadas[0].init.headers.authorization, "k");
	assert.ok(chamadas[0].init.signal instanceof AbortSignal);
	const rede = JSON.parse(chamadas[0].init.body).resourceSpans[0].scopeSpans[0].spans[0].attributes;
	assert.deepEqual(
		rede.map((a: any) => a.key),
		["ok"],
	);
	const local = linhas(arquivo)[0].resourceSpans[0].scopeSpans[0].spans[0].attributes;
	assert.deepEqual(
		local.map((a: any) => a.key),
		["nycode.hook.stderr", "ok"],
	);
});

test("falha de rede (status e rejeição) chama aoFalhar uma vez por mensagem e não lança", async () => {
	const msgs: string[] = [];
	const { f } = fakeFetch(500);
	const e = criarExportador({ endpoint: "https://c.local", recurso: {}, fetch: f, aoFalhar: (m) => msgs.push(m) });
	for (let i = 0; i < 3; i++) {
		e.enfileirar(span());
		await e.descarregar();
	}
	assert.equal(msgs.length, 1);
	assert.match(msgs[0], /500/);
	const rej = criarExportador({
		endpoint: "https://c.local",
		recurso: {},
		fetch: (async () => {
			throw new Error("caiu");
		}) as typeof fetch,
		aoFalhar: (m) => msgs.push(m),
	});
	for (let i = 0; i < 2; i++) {
		rej.enfileirar(span());
		await rej.descarregar();
	}
	assert.equal(msgs.length, 2);
	assert.match(msgs[1], /caiu/);
});

test("esquema de endpoint inválido: aoFalhar uma vez, sem requisição", async () => {
	const msgs: string[] = [];
	const { f, chamadas } = fakeFetch();
	for (const endpoint of ["file:///etc/passwd", "ftp://x", "lixo"]) {
		const e = criarExportador({ endpoint, recurso: {}, fetch: f, aoFalhar: (m) => msgs.push(m) });
		e.enfileirar(span());
		await e.descarregar();
		e.enfileirar(span());
		await e.descarregar();
	}
	assert.equal(chamadas.length, 0);
	assert.equal(msgs.length, 3);
});

test("fila limitada descarta o mais antigo", async () => {
	const arquivo = join(dir(), "t.jsonl");
	const e = criarExportador({ arquivo, recurso: {}, fila: 3 });
	for (let i = 0; i < 5; i++) e.enfileirar(span({ nome: `s${i}` }));
	await e.descarregar();
	const nomes = linhas(arquivo)[0].resourceSpans[0].scopeSpans[0].spans.map((s: any) => s.name);
	assert.deepEqual(nomes, ["s2", "s3", "s4"]);
});

test("descarregar concorrente não escreve o mesmo span duas vezes", async () => {
	const arquivo = join(dir(), "t.jsonl");
	const { f, chamadas } = fakeFetch();
	const e = criarExportador({ arquivo, endpoint: "http://c.local", recurso: {}, fetch: f });
	e.enfileirar(span());
	e.enfileirar(span());
	await Promise.all([e.descarregar(), e.descarregar()]);
	const total = linhas(arquivo).reduce((n, l) => n + l.resourceSpans[0].scopeSpans[0].spans.length, 0);
	assert.equal(total, 2);
	assert.equal(chamadas.length, 1);
});

test("falha de escrita no arquivo vai a aoFalhar e não lança", async () => {
	const msgs: string[] = [];
	const base = dir();
	const e = criarExportador({ arquivo: join(base, "dir", "x"), recurso: {}, aoFalhar: (m) => msgs.push(m) });
	// cria um arquivo no lugar do diretório pai
	const { writeFileSync } = await import("node:fs");
	writeFileSync(join(base, "dir"), "");
	e.enfileirar(span());
	await e.descarregar();
	assert.equal(msgs.length, 1);
});

test("F14: traces também mantém .1 e .2", async () => {
	const arquivo = join(dir(), "t.jsonl");
	const e = criarExportador({ arquivo, recurso: {}, maxBytes: 100 });
	for (let i = 0; i < 4; i++) {
		e.enfileirar(span());
		await e.descarregar();
	}
	assert.ok(existsSync(`${arquivo}.1`));
	assert.ok(existsSync(`${arquivo}.2`));
	assert.ok(!existsSync(`${arquivo}.3`));
});
