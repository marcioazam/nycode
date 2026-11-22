// node --experimental-strip-types --test extensions/diagnostico/test/obs/trilha.test.ts
import assert from "node:assert/strict";
import { afterEach, beforeEach, test, vi } from "vitest";
import { criarTrilha, lerTraceparent } from "../../../../../src/extensions/diagnostico/observabilidade/trilha.ts";

// The rendering reads TERM: pin it so the suite does not depend on the shell it runs in.
beforeEach(() => {
	vi.stubEnv("TERM", "xterm-256color");
});
afterEach(() => {
	vi.unstubAllEnvs();
});

const T = "a".repeat(32);
const S = "b".repeat(16);

function fake(extra: object = {}) {
	let t = 1000;
	let n = 0;
	const avanca = (ms: number) => {
		t += ms;
		return t;
	};
	const id = (b: number) => (++n).toString(16).padStart(b * 2, "0");
	return { avanca, trilha: criarTrilha({ agora: () => t, id, ...extra }) };
}

test("lerTraceparent aceita só o formato W3C", () => {
	assert.deepEqual(lerTraceparent(`00-${T}-${S}-01`), { traceId: T, spanId: S });
	for (const v of [
		undefined,
		"",
		`00-${T}-${S}`,
		`01-${T}-${S}-01`,
		`00-${"0".repeat(32)}-${S}-01`,
		`00-${T}-${"0".repeat(16)}-01`,
		`00-${T.toUpperCase()}-${S}-01`,
		`00-${T.slice(1)}-${S}-01`,
		`00-${T}-${S}-1`,
		`00-${T}-${S}-zz`,
		` 00-${T}-${S}-01`,
		`00-${T}-${S}-01\n`,
	])
		assert.equal(lerTraceparent(v), undefined, String(v));
});

test("ids aleatórios são hex minúsculo de 32 e 16 caracteres", () => {
	const t = criarTrilha();
	assert.match(t.traceId, /^[0-9a-f]{32}$/);
	assert.match(t.raizId, /^[0-9a-f]{16}$/);
	assert.match(t.abrir("x"), /^[0-9a-f]{16}$/);
});

test("traceparent válido reaproveita o traceId e a raiz é filha do span recebido", () => {
	const { trilha } = fake({ traceparent: `00-${T}-${S}-01` });
	assert.equal(trilha.traceId, T);
	assert.equal(trilha.traceparent(), `00-${T}-${trilha.raizId}-01`);
	const raiz = trilha.fechar(trilha.raizId);
	assert.equal(raiz?.parentId, S);
});

test("traceparent inválido gera trace novo e raiz sem pai", () => {
	const { trilha } = fake({ traceparent: "lixo" });
	assert.notEqual(trilha.traceId, T);
	assert.equal(trilha.fechar(trilha.raizId)?.parentId, undefined);
});

test("abrir/fechar: pai padrão é a raiz, durMs usa o relógio injetado, attrs mesclam", () => {
	const { trilha, avanca } = fake();
	const a = trilha.abrir("a", { x: 1 });
	avanca(25);
	const s = trilha.fechar(a, { y: "z" })!;
	assert.equal(s.parentId, trilha.raizId);
	assert.equal(s.durMs, 25);
	assert.equal(s.fim! - s.inicio, 25);
	assert.deepEqual(s.attrs, { x: 1, y: "z" });
	assert.equal(s.tipo, "span");
	assert.equal(s.traceId, trilha.traceId);
	assert.equal(trilha.fechar(a), undefined); // já fechado
});

test("pai explícito e erro", () => {
	const { trilha } = fake();
	const p = trilha.abrir("p");
	const f = trilha.abrir("f", {}, p);
	assert.equal(trilha.fechar(f, {}, "boom")?.parentId, p);
	assert.equal(trilha.recentes()[0].erro, "boom");
});

test("fechar id desconhecido devolve undefined", () => {
	assert.equal(fake().trilha.fechar("nada"), undefined);
});

test("evento é instantâneo, filho da raiz, e chama aoFechar", () => {
	const vistos: string[] = [];
	const { trilha } = fake({ aoFechar: (s: { nome: string }) => vistos.push(s.nome) });
	const e = trilha.evento("ev", { k: true }, "ruim");
	assert.equal(e.tipo, "evento");
	assert.equal(e.durMs, 0);
	assert.equal(e.fim, e.inicio);
	assert.equal(e.parentId, trilha.raizId);
	assert.equal(e.erro, "ruim");
	const a = trilha.abrir("sp");
	trilha.fechar(a);
	assert.deepEqual(vistos, ["ev", "sp"]);
});

test("aoFechar que lança não propaga", () => {
	const { trilha } = fake({
		aoFechar: () => {
			throw new Error("x");
		},
	});
	assert.doesNotThrow(() => trilha.evento("e"));
	assert.doesNotThrow(() => trilha.fechar(trilha.abrir("a")));
});

test("anel descarta os mais antigos; mais novo por último", () => {
	const { trilha } = fake({ max: 3 });
	for (let i = 0; i < 5; i++) trilha.evento(`e${i}`);
	assert.deepEqual(
		trilha.recentes().map((s) => s.nome),
		["e2", "e3", "e4"],
	);
});

test("máximo padrão do anel é 500", () => {
	const { trilha } = fake();
	for (let i = 0; i < 520; i++) trilha.evento(`e${i}`);
	const r = trilha.recentes();
	assert.equal(r.length, 500);
	assert.equal(r[0].nome, "e20");
});

test("spans abertos limitados a 1000: o mais antigo é descartado", () => {
	const { trilha } = fake();
	const primeiro = trilha.abrir("p");
	for (let i = 0; i < 1000; i++) trilha.abrir("x");
	assert.equal(trilha.fechar(primeiro), undefined);
});

test("traceparent(spanId) usa o span dado", () => {
	const { trilha } = fake();
	assert.equal(trilha.traceparent(S), `00-${trilha.traceId}-${S}-01`);
});

test("resumo soma tokens, conta por nome e erros", () => {
	const { trilha } = fake();
	trilha.fechar(trilha.abrir("chat m", { "gen_ai.usage.input_tokens": 10, "gen_ai.usage.output_tokens": 3 }));
	trilha.fechar(
		trilha.abrir("chat m", { "gen_ai.usage.input_tokens": 5, "gen_ai.usage.output_tokens": "9" }),
		{},
		"e",
	);
	trilha.evento("ev");
	const r = trilha.resumo();
	assert.deepEqual(r, { spans: 3, erros: 1, tokensEntrada: 15, tokensSaida: 3, porNome: { "chat m": 2, ev: 1 } });
});
