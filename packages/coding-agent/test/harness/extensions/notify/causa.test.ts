// vitest: test/harness/extensions/notify/causa.test.ts
import assert from "node:assert/strict";
import { afterEach, beforeEach, test, vi } from "vitest";
import * as __typed_avisos_causa from "../../../../src/extensions/notify/turno.ts";

// The rendering reads TERM: pin it so the suite does not depend on the shell it runs in.
beforeEach(() => {
	vi.stubEnv("TERM", "xterm-256color");
});
afterEach(() => {
	vi.unstubAllEnvs();
});

// The source tests drive the modules with partial fakes, without types.
const __a_avisos_causa: any = __typed_avisos_causa;

const { causa } = __a_avisos_causa;

// id, entrada, rótulo, título, ação: textos literais da tabela do README (docs/designs/onda6-avisos).
const TABELA: Array<[string, string, string, string, string]> = [
	[
		"limite",
		'Error: 429: {"error":{"type":"rate_limit_error","message":"Muitos pedidos"}}',
		"limite de uso do provedor",
		"O provedor está limitando o uso",
		"↑ traz o pedido de volta · /model troca de modelo",
	],
	[
		"limite",
		"quota: rate limit reached",
		"limite de uso do provedor",
		"O provedor está limitando o uso",
		"↑ traz o pedido de volta · /model troca de modelo",
	],
	[
		"conta",
		'Error: 401: {"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"}}',
		"conta não reconhecida pelo provedor",
		"O provedor não reconheceu a sua conta",
		"/login entra de novo",
	],
	[
		"conta",
		"403 forbidden",
		"conta não reconhecida pelo provedor",
		"O provedor não reconheceu a sua conta",
		"/login entra de novo",
	],
	[
		"conta",
		'OAuth refresh failed for anthropic: HTTP request failed. status=400; body={"error": "invalid_grant", "error_description": "Refresh token not found or invalid"}; stack=Error',
		"conta não reconhecida pelo provedor",
		"O provedor não reconheceu a sua conta",
		"/login entra de novo",
	],
	[
		"conta",
		"permission_error: sem acesso",
		"conta não reconhecida pelo provedor",
		"O provedor não reconheceu a sua conta",
		"/login entra de novo",
	],
	[
		"pedido",
		'Error: 400: {"error":{"type":"invalid_request_error","message":"bad"}}',
		"pedido recusado pelo provedor",
		"O provedor recusou o pedido",
		"↑ traz o pedido de volta · /bug relata ao nycode",
	],
	[
		"pedido",
		"422 unprocessable",
		"pedido recusado pelo provedor",
		"O provedor recusou o pedido",
		"↑ traz o pedido de volta · /bug relata ao nycode",
	],
	[
		"pedido",
		"invalid_request na mensagem",
		"pedido recusado pelo provedor",
		"O provedor recusou o pedido",
		"↑ traz o pedido de volta · /bug relata ao nycode",
	],
	[
		"fora",
		"Error: 503: indisponível",
		"provedor fora do ar",
		"O provedor está fora do ar",
		"↑ traz o pedido de volta",
	],
	["fora", "overloaded_error", "provedor fora do ar", "O provedor está fora do ar", "↑ traz o pedido de volta"],
	[
		"rede",
		"TypeError: fetch failed",
		"sem conexão com o provedor",
		"Sem conexão com o provedor",
		"↑ traz o pedido de volta",
	],
	[
		"rede",
		"connect ECONNREFUSED 127.0.0.1:1",
		"sem conexão com o provedor",
		"Sem conexão com o provedor",
		"↑ traz o pedido de volta",
	],
	["outro", "Error: quebrou algo", "falha no nycode", "Algo falhou no nycode", "/bug relata ao nycode"],
	["outro", "", "falha no nycode", "Algo falhou no nycode", "/bug relata ao nycode"],
];

for (const [id, entrada, rotulo, titulo, acao] of TABELA) {
	test(`causa ${id}: ${entrada.slice(0, 40) || "(vazio)"}`, () => {
		const c = causa(entrada);
		assert.deepEqual([c.id, c.rotulo, c.titulo, c.acao], [id, rotulo, titulo, acao]);
	});
}

test("status HTTP vence palavra-chave", () => {
	assert.equal(causa("429 network").id, "limite");
});

test("codigo e mensagem: JSON do provedor, só status, texto livre", () => {
	const j = causa('Error: 429: {"type":"error","error":{"type":"rate_limit","message":"Muitos"}}');
	assert.equal(j.codigo, "429 rate_limit");
	assert.equal(j.mensagem, "Muitos");
	const s = causa("Error: 503: fora");
	assert.equal(s.codigo, "503");
	assert.equal(s.mensagem, "503: fora");
	const l = causa("Error: algo quebrou");
	assert.equal(l.codigo, "");
	assert.equal(l.mensagem, "algo quebrou");
	assert.equal(causa("{ json quebrado 400").mensagem, "{ json quebrado 400");
});
