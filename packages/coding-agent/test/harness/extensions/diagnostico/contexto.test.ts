// node --experimental-strip-types --test extensions/diagnostico/test/contexto.test.ts
import assert from "node:assert/strict";
import { test } from "vitest";
import * as __d_contexto from "../../../../src/extensions/diagnostico/contexto.ts";
import type { Registro } from "../../../../src/extensions/diagnostico/registro.ts";

const m = __d_contexto;
const T0 = Date.parse("2026-11-14T12:00:00Z");

const caminhos = {
	diag: "/tmp/agent/diag/diag.jsonl",
	trilha: "/tmp/agent/diag/traces.jsonl",
	debug: "/tmp/agent/nycode-debug.log",
	mcp: "/tmp/agent/mcp.log",
};

const reg = (over: Partial<Registro> = {}): Registro => ({
	ts: T0,
	ultimo: T0,
	sev: 17,
	fonte: "modelo",
	tipo: "erro",
	msg: "falhou",
	n: 1,
	visto: false,
	silencioso: false,
	...over,
});

test("pedeDiagnostico: positivos de superfície do rodapé, pt-BR e en", () => {
	const positivos = [
		"o que são esses erros no rodapé?",
		"me explica o aviso do RODAPE",
		"what are the errors in the footer?",
		"what does the status line show?",
		"check the statusline counter",
		"the status-line warnings",
		"por que aparece um aviso na barra de status?",
		"o que mostra a linha de status?",
		"warnings in the status bar",
		"o que tem na barra inferior?",
		"o que é aquela faixa de aviso?",
		"o que significa aquela faixa de avisos amarela?",
		"o que tem na parte de baixo da tela?",
		"o que apareceu embaixo da tela?",
		"o que é o diagnóstico?",
		"what does ctrl+e open?",
		"o que é esse contador de erros?",
		"o contador de avisos subiu",
		"me explica os erros do nycode",
		"quais são os avisos do harness?",
		"os erros da tela",
		"what are the errors in the terminal?",
		"quais warnings o terminal mostra?",
	];
	for (const p of positivos) assert.equal(m.pedeDiagnostico(p), true, p);
});

test("pedeDiagnostico: termos ambíguos (footer, toast, notificação) pedem palavra de erro/aviso", () => {
	assert.equal(m.pedeDiagnostico("what are the warnings in the footer?"), true);
	assert.equal(m.pedeDiagnostico("chegou uma notificação de erro?"), true);
	assert.equal(m.pedeDiagnostico("o que foi aquele toast de aviso?"), true);
	assert.equal(m.pedeDiagnostico("error toast appeared"), true);
});

test("pedeDiagnostico: negativos, prompts genéricos de código", () => {
	const negativos = [
		"corrija o erro no teste",
		"fix the type error",
		"o terminal travou",
		"fix the footer css alignment",
		"add a toast component to the app",
		"implemente notificações push",
		"what is the footer component rendering?",
		"",
		"oi",
	];
	for (const p of negativos) assert.equal(m.pedeDiagnostico(p), false, p);
});

test("pedeDiagnostico: falso positivo aceito, notificação de erro de app (bloco escondido, custo baixo)", () => {
	assert.equal(m.pedeDiagnostico("corrija a notificação de erro do app"), true);
});

test("bloco vazio: avisa que não há registros e lista os caminhos", () => {
	const b = m.blocoDiagnostico([], caminhos);
	assert.match(b, /no warnings or errors recorded this session/i);
	for (const c of Object.values(caminhos)) assert.ok(b.includes(c), c);
});

test("bloco: filtra sev 9, ordena do mais novo, rótulos WARN/ERROR/FATAL", () => {
	const lista = [
		reg({ sev: 9, msg: "info não entra", ultimo: T0 + 9000 }),
		reg({ sev: 13, fonte: "hook", tipo: "pre", msg: "aviso-alpha", ultimo: T0 + 1000 }),
		reg({ sev: 21, fonte: "nycode", tipo: "crash", msg: "fatal-bravo", ultimo: T0 + 3000 }),
		reg({ sev: 17, msg: "erro-charlie", ultimo: T0 + 2000 }),
	];
	const b = m.blocoDiagnostico(lista as never, caminhos);
	assert.ok(!b.includes("info não entra"));
	const iFatal = b.indexOf("fatal-bravo");
	const iErro = b.indexOf("erro-charlie");
	const iAviso = b.indexOf("aviso-alpha");
	assert.ok(iFatal >= 0 && iErro > iFatal && iAviso > iErro, "mais novo primeiro");
	assert.match(b, /FATAL nycode\/crash/);
	assert.match(b, /ERROR modelo\/erro/);
	assert.match(b, /WARN hook\/pre/);
	assert.match(b, /\d{2}:\d{2}:\d{2} ERROR/);
});

test("bloco: ×n só com repetição, [seen]/[silenced] marcados", () => {
	const lista = [
		reg({ msg: "repetido", n: 3 }),
		reg({ msg: "visto", visto: true, fonte: "notify", tipo: "notify" }),
		reg({ msg: "silenciado", silencioso: true, fonte: "console", tipo: "warn" }),
	];
	const b = m.blocoDiagnostico(lista as never, caminhos);
	assert.match(b, /×3/);
	assert.ok(!/×1/.test(b));
	assert.match(b, /\[seen]/);
	assert.match(b, /\[silenced]/);
});

test("bloco: no máximo 20 entradas, com aviso das demais", () => {
	const lista = Array.from({ length: 25 }, (_, i) => reg({ msg: `entrada-${i}`, ultimo: T0 + i }));
	const b = m.blocoDiagnostico(lista as never, caminhos);
	assert.ok(b.includes("entrada-24"));
	assert.ok(b.includes("entrada-5"));
	assert.ok(!b.includes("entrada-4"));
	assert.match(b, /5 more/);
});

test("bloco: msg cortada em ~300 e detalhe em ~600, detalhe indentado", () => {
	const lista = [reg({ msg: "m".repeat(400), detalhe: "d".repeat(700) })];
	const b = m.blocoDiagnostico(lista as never, caminhos);
	assert.ok(!b.includes("m".repeat(301)));
	assert.ok(b.includes("m".repeat(290)));
	assert.ok(!b.includes("d".repeat(601)));
	assert.match(b, /\n {2}d{100}/);
});

test("bloco: teto de ~8 KB com nota de truncamento", () => {
	const lista = Array.from({ length: 20 }, (_, i) =>
		reg({ msg: `m${i}-${"x".repeat(290)}`, detalhe: "y".repeat(590), ultimo: T0 + i }),
	);
	const b = m.blocoDiagnostico(lista as never, caminhos);
	assert.ok(b.length <= 8300, `tamanho ${b.length}`);
	assert.match(b, /truncat/i);
});

test("bloco: aviso de dado não confiável e correlação trace_id", () => {
	const b = m.blocoDiagnostico([reg()], caminhos);
	assert.match(b, /untrusted/i);
	assert.match(b, /trace_id/);
});

function criaNycode(lista: unknown[]) {
	const handlers = new Map<string, (...a: never[]) => unknown>();
	const nycode = { on: (n: string, h: never) => handlers.set(n, h) };
	m.registrarContexto(nycode as never, { lista: () => lista } as never, caminhos);
	return handlers.get("before_agent_start")!;
}

test("handler: injeta mensagem escondida em prompt que pede diagnóstico", () => {
	const h = criaNycode([reg()]);
	const r = h({ messageType: "user", prompt: "o que são esses erros no rodapé?" } as never);
	assert.ok(r && typeof r === "object");
	const msg = (r as { message: { customType: string; content: string; display: boolean } }).message;
	assert.equal(msg.customType, "diagnostico-contexto");
	assert.equal(msg.display, false);
	assert.ok(msg.content.includes("falhou"));
});

test("handler: não injeta em prompt genérico nem em mensagem não-user", () => {
	const h = criaNycode([reg()]);
	assert.equal(h({ messageType: "user", prompt: "corrija o erro no teste" } as never), undefined);
	assert.equal(h({ messageType: "custom", message: {} } as never), undefined);
});
