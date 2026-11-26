// node --experimental-strip-types --test extensions/diagnostico/test/registro.test.ts
import assert from "node:assert/strict";
import {
	closeSync,
	existsSync,
	fstatSync,
	mkdtempSync,
	openSync,
	readFileSync,
	readSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, test, vi } from "vitest";
import * as __d_registro from "../../../../src/extensions/diagnostico/registro.ts";

// The rendering reads TERM: pin it so the suite does not depend on the shell it runs in.
beforeEach(() => {
	vi.stubEnv("TERM", "xterm-256color");
});
afterEach(() => {
	vi.unstubAllEnvs();
});

const m = __d_registro;
const dir = () => mkdtempSync(join(tmpdir(), "diag-reg-"));
const e = (msg: string, extra: object = {}) => ({ sev: 17, fonte: "f", tipo: "t", msg, ...extra });

test("dedup soma n, atualiza ultimo e sobe para o topo", () => {
	let t = 100;
	const r = m.criarRegistro({ agora: () => t });
	assert.equal(r.adicionar(e("a") as never).novo, true);
	t = 200;
	r.adicionar(e("b") as never);
	t = 300;
	const x = r.adicionar(e("a") as never);
	assert.equal(x.novo, false);
	assert.deepEqual(
		r.lista().map((z: any) => [z.msg, z.n, z.ts, z.ultimo]),
		[
			["a", 2, 100, 300],
			["b", 1, 200, 200],
		],
	);
});

test("limite de registros em memória", () => {
	const r = m.criarRegistro({ agora: () => 1, limite: 3 });
	for (const i of [1, 2, 3, 4]) r.adicionar(e(`m${i}`) as never);
	assert.deepEqual(
		r.lista().map((z: any) => z.msg),
		["m4", "m3", "m2"],
	);
});

test("msg de uma linha; várias linhas sem detalhe viram detalhe", () => {
	const r = m.criarRegistro({ agora: () => 1 });
	const a = r.adicionar(e("\nprimeira\nsegunda") as never).registro;
	assert.equal(a.msg, "primeira");
	assert.equal(a.detalhe, "primeira\nsegunda");
	const b = r.adicionar(e("x\ny", { detalhe: "det" }) as never).registro;
	assert.equal(b.detalhe, "det");
});

test("redigir cobre cada padrão", () => {
	const casos: Array<[string, string]> = [
		["chave sk-abcdefgh12345 fim", "chave «redigido» fim"],
		["ghp_abcdefghij1234 x", "«redigido» x"],
		["Authorization: Bearer abc.def-1", "Authorization: «redigido»"],
		["api_key=zzz123 ok", "api_key=«redigido» ok"],
		['{"token": "abc"}', '{"token": "«redigido»"}'],
		["password: hunter2", "password: «redigido»"],
		["secret=s3", "secret=«redigido»"],
	];
	for (const [i, o] of casos) assert.equal(m.redigir(i), o);
	assert.equal(m.redigir("nada aqui"), "nada aqui");
});

test("JSONL com campos OTel, redigido; rotação acima de maxBytes", () => {
	const arquivo = join(dir(), "sub", "diag.jsonl");
	const r = m.criarRegistro({ agora: () => Date.parse("2026-11-14T10:00:00Z"), arquivo, sessao: "s1", maxBytes: 400 });
	r.adicionar({ sev: 17, fonte: "src", tipo: "ty", msg: "falhou token=abc123", detalhe: "sk-abcdefgh99" });
	const l = JSON.parse(readFileSync(arquivo, "utf8").trim());
	assert.deepEqual(l, {
		ts: "2026-11-14T10:00:00.000Z",
		severityNumber: 17,
		severityText: "ERROR",
		source: "src",
		"error.type": "ty",
		body: "falhou token=«redigido»",
		detail: "«redigido»",
		session: "s1",
		pid: process.pid,
	});
	for (let i = 0; i < 6; i++) r.adicionar(e(`longa ${i} ${"x".repeat(100)}`) as never);
	assert.ok(existsSync(`${arquivo}.1`));
	assert.ok(readFileSync(arquivo, "utf8").length <= 400 + 400);
});

test("falha de escrita não lança e é contada", () => {
	const d = dir();
	writeFileSync(join(d, "arq"), "");
	const r = m.criarRegistro({ agora: () => 1, arquivo: join(d, "arq", "dentro", "diag.jsonl") }); // pai é arquivo
	assert.doesNotThrow(() => r.adicionar(e("a") as never));
	assert.equal(r.falhasDeEscrita(), 1);
	assert.equal(r.lista().length, 1);
});

test("silenciar mantém n, tira da contagem e novo=false", () => {
	const r = m.criarRegistro({ agora: () => 1 });
	const { registro } = r.adicionar(e("a") as never);
	r.silenciar(m.chave(registro));
	const x = r.adicionar(e("a") as never);
	assert.equal(x.novo, false);
	assert.equal(x.registro.n, 2);
	assert.equal(x.registro.silencioso, true);
	assert.deepEqual(r.contagem(), { erros: 0, avisos: 0 });
	r.limpar();
	assert.equal(r.adicionar(e("a") as never).novo, false); // silêncio sobrevive ao limpar
});

test("contagem de não vistos e marcarVistos", () => {
	const r = m.criarRegistro({ agora: () => 1 });
	r.adicionar(e("a", { sev: 17 }) as never);
	r.adicionar(e("b", { sev: 21 }) as never);
	r.adicionar(e("c", { sev: 13 }) as never);
	r.adicionar(e("d", { sev: 9 }) as never);
	assert.deepEqual(r.contagem(), { erros: 2, avisos: 1 });
	r.marcarVistos();
	assert.deepEqual(r.contagem(), { erros: 0, avisos: 0 });
});

test("lerCaixa: escapes, malformadas, linha final incompleta, continuação por offset", () => {
	const f = join(dir(), "inbox.tsv");
	writeFileSync(
		f,
		"17\tguard\tex\tmsg\\tcom tab\tdet\\nlinha2\nlixo\n99\tw\tt\tsev ruim\n13\tw\tt\n13\ta\tb\tparcial",
	);
	const a = m.lerCaixa(f, 0);
	assert.deepEqual(a.entradas, [
		{ sev: 17, fonte: "guard", tipo: "ex", msg: "msg\tcom tab", detalhe: "det\nlinha2" },
		{ sev: 13, fonte: "w", tipo: "t", msg: "sev ruim" },
	]);
	writeFileSync(f, "\tcompleta\n", { flag: "a" });
	const b = m.lerCaixa(f, a.offset);
	assert.deepEqual(b.entradas, [{ sev: 13, fonte: "a", tipo: "b", msg: "parcial", detalhe: "completa" }]);
	assert.deepEqual(m.lerCaixa(f, b.offset), { entradas: [], offset: b.offset });
	assert.deepEqual(m.lerCaixa(join(dir(), "nao-existe"), 5), { entradas: [], offset: 5 });
});

test("reativar desfaz o silêncio: registro volta a contar e novas ocorrências também", () => {
	const r = m.criarRegistro({ agora: () => 1 });
	const { registro } = r.adicionar(e("a") as never);
	r.silenciar(m.chave(registro));
	r.reativar(m.chave(registro));
	assert.equal(registro.silencioso, false);
	assert.equal(r.adicionar(e("a") as never).registro.silencioso, false);
	r.limpar();
	assert.equal(r.adicionar(e("a") as never).novo, true);
});

test("trace_id e span_id: gravados por ocorrência, fora da chave, ausentes quando não vieram", () => {
	const d = dir();
	const arquivo = join(d, "diag.jsonl");
	const r = m.criarRegistro({ agora: () => 1, arquivo });
	r.adicionar(e("a") as never);
	r.adicionar(e("a", { traceId: "t".repeat(32), spanId: "1".repeat(16) }) as never);
	const x = r.adicionar(e("a", { traceId: "t".repeat(32), spanId: "2".repeat(16) }) as never);
	assert.equal(x.novo, false); // mesma chave: ids não entram no agrupamento
	assert.equal(r.lista().length, 1);
	assert.deepEqual([x.registro.n, x.registro.traceId, x.registro.spanId], [3, "t".repeat(32), "2".repeat(16)]);
	const l = readFileSync(arquivo, "utf8")
		.trim()
		.split("\n")
		.map((y: string) => JSON.parse(y));
	assert.ok(!("trace_id" in l[0]) && !("span_id" in l[0]));
	assert.deepEqual(
		l.slice(1).map((y: any) => [y.trace_id, y.span_id]),
		[
			["t".repeat(32), "1".repeat(16)],
			["t".repeat(32), "2".repeat(16)],
		],
	);
	assert.equal(l[1].body, "a");
});

// --- título humano, corpo e correção (só exibição) ---
const { humano, semPi } = __d_registro;
const erroJson = (tipo: string, message = "texto do provedor", rid = "req_1") =>
	JSON.stringify({ type: "error", error: { type: tipo, message }, request_id: rid });
const hm = (msg: string, o: object = {}) => humano({ fonte: "modelo", tipo: "chamada", msg, ...o });

test("humano: cada linha da tabela de provedor, pelo tipo e pelo status", () => {
	const ESPERA = "aguarde a renovação ou troque de modelo com /model";
	const casos: Array<[string, string, string | undefined]> = [
		[`429 ${erroJson("rate_limit_error")}`, "Limite de requisições (429)", ESPERA],
		[`429 ${erroJson("outro_tipo")}`, "Limite de requisições (429)", ESPERA],
		[`529 ${erroJson("overloaded_error")}`, "Provedor sobrecarregado (529)", "tente de novo em instantes"],
		[`529 {"x":1}`, "Provedor sobrecarregado (529)", "tente de novo em instantes"],
		[`401 ${erroJson("authentication_error")}`, "Credencial recusada (401)", "refaça o login com /login"],
		[`403 ${erroJson("permission_error")}`, "Sem permissão (403)", undefined],
		[`400 ${erroJson("invalid_request_error")}`, "Requisição inválida (400)", undefined],
		[`500 ${erroJson("api_error")}`, "Erro do provedor (500)", undefined],
		[`503 {"error":{"message":"bad gateway"}}`, "Erro do provedor (503)", undefined],
		[`Error: 429 ${erroJson("rate_limit_error")}`, "Limite de requisições (429)", ESPERA],
	];
	for (const [msg, titulo, correcao] of casos) {
		const h = hm(msg);
		assert.deepEqual([h.titulo, h.correcao], [titulo, correcao], msg);
	}
	const h = hm(`429 ${erroJson("rate_limit_error", "linha 1\nlinha 2", "req_abc")}`);
	assert.deepEqual(h, {
		titulo: "Limite de requisições (429)",
		tipo: "rate_limit_error",
		corpo: "linha 1\nlinha 2",
		correcao: ESPERA,
		requestId: "req_abc",
	});
});

test("humano: cota vence o 429; vale para texto sem JSON só em entradas de modelo", () => {
	const COTA = "aguarde a renovação do limite; a retomada automática espera por ela";
	const a = hm(`429 ${erroJson("rate_limit_error", "Quota exceeded for this account")}`);
	assert.deepEqual(
		[a.titulo, a.correcao, a.corpo, a.tipo],
		["Cota da conta esgotada (429)", COTA, "Quota exceeded for this account", "rate_limit_error"],
	);
	const b = hm("You have hit your usage limit, resets at 5pm");
	assert.deepEqual([b.titulo, b.correcao, b.tipo], ["Cota da conta esgotada (429)", COTA, "chamada"]);
	assert.equal(
		humano({ fonte: "console", tipo: "warn", msg: "usage limit of the cache" }).titulo,
		"usage limit of the cache",
	);
});

test("humano: JSON cortado é lido por regex (tipo, mensagem, request_id)", () => {
	const inteiro = `429 ${erroJson("rate_limit_error", 'This request would exceed the "rate" limit.\nTry later', "req_011CZx4abc")}`;
	const semFim = hm(inteiro.slice(0, -6));
	assert.deepEqual(
		[semFim.titulo, semFim.tipo, semFim.corpo, semFim.requestId],
		[
			"Limite de requisições (429)",
			"rate_limit_error",
			'This request would exceed the "rate" limit.\nTry later',
			"req_011CZx",
		],
	);
	const noMeio = hm(inteiro.slice(0, inteiro.indexOf("Try")));
	assert.deepEqual(
		[noMeio.titulo, noMeio.tipo, noMeio.requestId],
		["Limite de requisições (429)", "rate_limit_error", undefined],
	);
	assert.ok(noMeio.corpo.startsWith('This request would exceed the "rate" limit.'));
	const soTipo = hm('529 {"type":"error","error":{"type":"overloaded_error","mess');
	assert.deepEqual([soTipo.titulo, soTipo.tipo], ["Provedor sobrecarregado (529)", "overloaded_error"]);
	assert.equal(soTipo.corpo, '529 {"type":"error","error":{"type":"overloaded_error","mess'); // sem mensagem interna: o texto original
});

test("humano: fonte sub:<agente> recebe o mesmo tratamento; desconhecido fica com a primeira linha", () => {
	const s = humano({ fonte: "sub:swarm-worker", tipo: "modelo:chamada", msg: `429 ${erroJson("rate_limit_error")}` });
	assert.deepEqual(
		[s.titulo, s.tipo, s.correcao],
		["Limite de requisições (429)", "rate_limit_error", "aguarde a renovação ou troque de modelo com /model"],
	);
	assert.equal(
		humano({ fonte: "sub", tipo: "modelo:erro", msg: "quota exceeded" }).titulo,
		"Cota da conta esgotada (429)",
	);
	const d = hm("rede caiu", { detalhe: "Error: rede caiu\n  at x" });
	assert.deepEqual(d, {
		titulo: "rede caiu",
		tipo: "chamada",
		corpo: "Error: rede caiu\n  at x",
		correcao: undefined,
	});
	const nf = hm(`404 ${erroJson("not_found_error", "modelo não existe")}`);
	assert.deepEqual(
		[nf.titulo.slice(0, 5), nf.tipo, nf.corpo, nf.correcao, nf.requestId],
		["404 {", "not_found_error", "modelo não existe", undefined, "req_1"],
	);
	assert.equal(hm("529 overloaded").titulo, "529 overloaded"); // sem JSON não é a forma do provedor
	assert.equal(semPi("wrapper", "nycode: x"), "x");
	assert.equal(semPi("outro", "nycode: x"), "nycode: x");
});

test("humano: tool sempre com o nome; EXIT=0 de um comando que saiu ≠ 0 vira `saiu com código N`", () => {
	const t = (tipo: string, msg: string, detalhe?: string, fonte = "tool") =>
		humano({ fonte, tipo, msg, detalhe }).titulo;
	assert.equal(t("bash", "EXIT=0", "EXIT=0\n\nCommand exited with code 1"), "tool bash: saiu com código 1");
	assert.equal(t("bash", "Command exited with code 2"), "tool bash: saiu com código 2");
	assert.equal(t("bash", "RC=3", "RC=3\nls: não achei x\n\nCommand exited with code 2"), "tool bash: ls: não achei x");
	assert.equal(
		t("bash", "ls: não achei x", "ls: não achei x\n\nCommand exited with code 2"),
		"tool bash: ls: não achei x",
	); // erro real continua
	assert.equal(t("read", "EXIT=0"), "tool read: EXIT=0"); // isError com essa linha e sem código: mostra o que há
	assert.equal(t("read", "erro sem texto"), "tool read: erro sem texto");
	assert.equal(
		t("tool:bash", "EXIT=0", "EXIT=0\n\nCommand exited with code 7", "sub:Plan"),
		"tool bash: saiu com código 7",
	);
	const h = humano({ fonte: "tool", tipo: "bash", msg: "EXIT=0", detalhe: "EXIT=0\n\nCommand exited with code 1" });
	assert.deepEqual([h.tipo, h.corpo, h.correcao], ["bash", "EXIT=0\n\nCommand exited with code 1", undefined]);
});

test("humano: última linha útil de falhas bash", () => {
	const titulo = (detalhe: string) => humano({ fonte: "tool", tipo: "bash", msg: "saída", detalhe }).titulo;
	assert.equal(
		titulo(
			'Traceback (most recent call last):\n  File "script.py", line 1\nAssertionError\nCommand exited with code 1',
		),
		"tool bash: AssertionError",
	);
	assert.equal(titulo("stdout 1\nstdout 2\nerro real\nRC=1\nCommand exited with code 1"), "tool bash: erro real");
});

test("humano: correções das entradas que não são de provedor; a correção que a entrada já traz vence", () => {
	const c = (fonte: string, tipo: string, msg: string, detalhe?: string) =>
		humano({ fonte, tipo, msg, detalhe }).correcao;
	assert.equal(
		c("detector", "hook-lento", "hook Stop · lento.sh levou 2500 ms"),
		"veja o comando do hook em settings.json",
	);
	assert.equal(
		c("detector", "tool-em-laco", "tool bash falhou 3 vezes seguidas"),
		"interrompa com esc e revise o comando",
	);
	assert.equal(
		c("detector", "tool-travada", "tool bash rodando há 12 min"),
		"interrompa com esc ou espere; ctrl+b manda para segundo plano",
	);
	assert.equal(c("detector", "modelo-lento", "modelo p/m levou 130 s"), undefined);
	assert.equal(c("hook", "hook", "Stop · h.sh · saiu 1 · 3 ms"), "rode o comando do hook à mão para ver o erro");
	assert.equal(
		c("hook", "hook", "PreToolUse · g.sh · bloqueou (2) · 9 ms"),
		"rode o comando do hook à mão para ver o erro",
	);
	assert.equal(c("hook", "hook", "Stop · h.sh · timeout · 5000 ms"), undefined);
	assert.equal(c("hook", "hook", "Stop · h.sh · saiu 0 · 3 ms"), undefined);
	assert.equal(c("wrapper", "patch", "nycode: patch não aplicou"), "rode /doctor");
	assert.equal(c("otlp", "exportar", "coletor recusou: 503"), "confira OTEL_EXPORTER_OTLP_ENDPOINT");
	assert.equal(
		c("sub:Plan", "detector:tool-em-laco", "tool bash falhou 3 vezes seguidas"),
		"interrompa com esc e revise o comando",
	);
	assert.equal(c("console", "warn", "qualquer"), undefined);
	const p = humano({ fonte: "wrapper", tipo: "patch", msg: "falhou", detalhe: "falhou\n→ reinstale o nycode" });
	assert.deepEqual([p.correcao, p.corpo], ["reinstale o nycode", "falhou"]);
});

test("diag.jsonl nasce 0600 em diretório 0700", () => {
	const d = join(dir(), "novo", "sub");
	const arquivo = join(d, "diag.jsonl");
	m.criarRegistro({ agora: () => 1, arquivo }).adicionar(e("x") as never);
	assert.equal(statSync(arquivo).mode & 0o777, 0o600);
	assert.equal(statSync(d).mode & 0o777, 0o700);
});

/** fs injetado: soma os bytes pedidos a readSync. */
const contado = () => {
	const c = {
		lidos: 0,
		io: {
			openSync,
			fstatSync,
			closeSync,
			readSync: ((fd: number, b: Buffer, o: number, l: number, p: number) => {
				c.lidos += l;
				return readSync(fd, b, o, l, p);
			}) as typeof readSync,
		},
	};
	return c;
};

test("lerCaixa: offset no fim de arquivo grande não lê conteúdo antigo; só os bytes novos", () => {
	const f = join(dir(), "inbox.tsv");
	const antigo = "13\ta\tb\tmsg\n".repeat(200_000);
	writeFileSync(f, antigo);
	const c = contado();
	const r0 = m.lerCaixa(f, antigo.length, c.io);
	assert.deepEqual(r0, { entradas: [], offset: antigo.length });
	assert.equal(c.lidos, 0);
	const novo = "17\tg\tt\tnova\n";
	writeFileSync(f, novo, { flag: "a" });
	const r1 = m.lerCaixa(f, antigo.length, c.io);
	assert.deepEqual(r1.entradas, [{ sev: 17, fonte: "g", tipo: "t", msg: "nova" }]);
	assert.equal(r1.offset, antigo.length + novo.length);
	assert.equal(c.lidos, novo.length);
});

test("lerCaixa: arquivo truncado/rotacionado (size < offset) recomeça do zero", () => {
	const f = join(dir(), "inbox.tsv");
	writeFileSync(f, "13\ta\tb\tcurto\n");
	const r = m.lerCaixa(f, 10_000);
	assert.deepEqual(r.entradas, [{ sev: 13, fonte: "a", tipo: "b", msg: "curto" }]);
	assert.equal(r.offset, 13);
});

test("F14: rotação mantém .1 e .2 (geração antiga não some) com teto de 3 arquivos", () => {
	const arquivo = join(dir(), "diag.jsonl");
	const r = m.criarRegistro({ agora: () => 1, arquivo, maxBytes: 300 });
	for (let i = 0; i < 20; i++) r.adicionar(e(`msg-${i} ${"x".repeat(150)}`) as never);
	assert.ok(existsSync(`${arquivo}.1`));
	assert.ok(existsSync(`${arquivo}.2`));
	assert.ok(!existsSync(`${arquivo}.3`));
	assert.ok(readFileSync(`${arquivo}.2`, "utf8").includes("msg-"));
});

test("F14: rotacionar com decisão velha (outro processo já rotacionou) não apaga o .1 nem o arquivo novo", () => {
	const arquivo = join(dir(), "diag.jsonl");
	writeFileSync(`${arquivo}.1`, "GRANDE-ANTIGO\n".repeat(50));
	writeFileSync(arquivo, "pequeno-novo\n");
	// o 2º processo mediu o arquivo antes do 1º rotacionar: vê "grande"
	m.rotacionar(arquivo, 100, { statSync: () => ({ size: 10_000 }) });
	assert.ok(readFileSync(`${arquivo}.1`, "utf8").startsWith("GRANDE-ANTIGO"));
	assert.ok(!existsSync(`${arquivo}.2`));
	assert.equal(readFileSync(arquivo, "utf8"), "pequeno-novo\n");
});
