// vitest: test/harness/extensions/notify/notificar.test.ts
import assert from "node:assert/strict";
import { afterEach, beforeEach, test, vi } from "vitest";
import * as __typed_avisos_notificar from "../../../../src/extensions/notify/notificar.ts";
import * as __typed_avisos_turno from "../../../../src/extensions/notify/turno.ts";
import * as __typed_ui_terminal from "../../../../src/extensions/ui/terminal.ts";

// The rendering reads TERM: pin it so the suite does not depend on the shell it runs in.
beforeEach(() => {
	vi.stubEnv("TERM", "xterm-256color");
});
afterEach(() => {
	vi.unstubAllEnvs();
});

// The source tests drive the modules with partial fakes, without types.
const __a_avisos_notificar: any = __typed_avisos_notificar;
const __a_avisos_turno: any = __typed_avisos_turno;
const __a_ui_terminal: any = __typed_ui_terminal;

const n = __a_avisos_notificar;
const t = __a_avisos_turno;
const ui = __a_ui_terminal;

test("regra de ausência: foco conhecido decide; sem foco, 30 s desde o último input", () => {
	assert.equal(t.ausente(true, undefined, 0), false);
	assert.equal(t.ausente(false, 0, 1), true);
	assert.equal(t.ausente(undefined, undefined, 0), true);
	assert.equal(t.ausente(undefined, 1000, 30_999), false);
	assert.equal(t.ausente(undefined, 1000, 31_000), true);
});

test("desfecho: terminou, erro (stopReason ou errorMessage), interrompido; sem assistente = terminou", () => {
	const a = (extra: object) => [{ role: "user" }, { role: "assistant", stopReason: "stop", ...extra }];
	assert.deepEqual(t.desfechoDe(a({})), { desfecho: "terminou", erro: "" });
	assert.deepEqual(t.desfechoDe(a({ stopReason: "error", errorMessage: "429 rate_limit" })), {
		desfecho: "erro",
		erro: "429 rate_limit",
	});
	assert.deepEqual(t.desfechoDe(a({ errorMessage: "x" })).desfecho, "erro");
	assert.deepEqual(t.desfechoDe(a({ stopReason: "error" })), { desfecho: "erro", erro: "" });
	assert.equal(t.desfechoDe(a({ stopReason: "aborted" })).desfecho, "interrompido");
	assert.equal(t.desfechoDe([]).desfecho, "terminou");
	assert.equal(t.desfechoDe(undefined).desfecho, "terminou");
});

test("duração legível", () => {
	assert.deepEqual([0, 45_000, 134_000, 3_780_000].map(t.duracao), ["0s", "45s", "2m 14s", "1h 3m"]);
});

test("título da sessão idêntico ao do terminal (ui/terminal.ts)", () => {
	for (const [nome, cwd] of [
		["refatora o parser", "/a/projeto-demo"],
		[undefined, "/a/b"],
	] as const) {
		assert.equal(t.tituloSessao(nome, cwd), ui.baseTitle(nome, cwd));
	}
});

test("corpo e urgência por evento (nunca 2)", () => {
	assert.equal(n.corpo("terminou", { duracao: "2m 14s" }), "Terminou · 2m 14s");
	assert.equal(n.corpo("precisa"), "Precisa de você · pergunta aberta");
	assert.equal(
		n.corpo("terminou", { duracao: "2m 14s", resultado: "\n## Resultado\nNão vai para o aviso" }),
		"Terminou em 2m 14s: Resultado",
	);
	assert.equal(n.corpo("precisa", { pergunta: "Qual tema?\nDetalhes" }), "Pergunta: Qual tema?");
	assert.equal(n.corpo("erro", { rotulo: "limite de uso do provedor" }), "Parou com erro · limite de uso do provedor");
	assert.deepEqual(["terminou", "precisa", "erro", "teste"].map(n.urgencia), [0, 1, 1, 0]);
});

test("sanitização: sem ESC, BEL, quebras; `;` só some no OSC 777; corta o tamanho", () => {
	const sujo = "a\x1b]0;x\x07b\nc\r\n;d\x9bz";
	assert.equal(n.sanitizar(sujo), "a ]0;x b c ;d z");
	assert.equal(n.sanitizar(sujo, true), "a ]0,x b c ,d z");
	assert.equal(n.sanitizar("x".repeat(500)).length, 120);
	const osc = n.osc777("nome\x07\x1b[31m;injeção", "corpo;\nlinha");
	assert.equal(osc, "\x1b]777;notify;nome [31m,injeção;corpo, linha\x07");
	assert.equal(osc.split("\x07").length, 2); // um único BEL: o terminador
	assert.equal(osc.split("\x1b").length, 2); // um único ESC: o início
	for (const parte of n.osc99("i", "a\x1b\\b", "c\x07\x1b]x", 0)) assert.equal(parte.split("\x1b").length, 3); // só ESC] e ESC\ do próprio OSC
	assert.ok(!n.osc99("i", "t", "c\x07", 0).join("").includes("\x07"));
});

const cria = (env: Record<string, string>) => {
	const out: string[] = [];
	return { out, nt: n.criarNotificador((s: string) => out.push(s), env, "nycode-1") };
};

test("kitty: OSC 99 com id fixo (substitui), u=0 terminou e u=1 precisa/erro, p=close ao voltar o foco", () => {
	const { out, nt } = cria({ KITTY_WINDOW_ID: "3" });
	nt.enviar("sistema", "terminou", "sessão · pasta", { duracao: "2m 14s" });
	assert.deepEqual(out, [
		"\x1b]99;i=nycode-1:d=0:p=title:u=0;sessão · pasta\x1b\\",
		"\x1b]99;i=nycode-1:d=1:p=body;Terminou · 2m 14s\x1b\\",
	]);
	out.length = 0;
	nt.enviar("sistema", "precisa", "sessão · pasta");
	assert.ok(out[0].includes("i=nycode-1") && out[0].includes("u=1") && !out.join("").includes("u=2"));
	out.length = 0;
	nt.enviar("sistema", "erro", "sessão · pasta", { rotulo: "rede" });
	assert.ok(out[0].includes("u=1"));
	out.length = 0;
	nt.fechar();
	assert.deepEqual(out, ["\x1b]99;i=nycode-1:p=close;\x1b\\"]);
	nt.fechar();
	assert.equal(out.length, 1); // nada aberto: não repete
});

// Onda 10, P23: o env vazio virou "terminal desconhecido" (777 e BEL); aqui o caso é um terminal de 777 (GNOME VTE).
const VTE = { VTE_VERSION: "7600" };
test("fora do kitty: OSC 777; fechar não escreve", () => {
	const { out, nt } = cria(VTE);
	nt.enviar("sistema", "terminou", "s · p", { duracao: "5s" });
	assert.deepEqual(out, ["\x1b]777;notify;s · p;Terminou · 5s\x07"]);
	nt.fechar();
	assert.equal(out.length, 1);
});

test("canal: sistema | sino | ambos | desligado", () => {
	for (const [canal, esperado] of [
		["sistema", 1],
		["sino", 1],
		["ambos", 2],
		["desligado", 0],
	] as const) {
		const { out, nt } = cria(VTE);
		nt.enviar(canal, "erro", "s · p", { rotulo: "r" });
		assert.equal(out.length, esperado, canal);
		assert.equal(out.includes("\x07"), canal === "sino" || canal === "ambos");
		assert.equal(
			out.some((s) => s.startsWith("\x1b]777")),
			canal === "sistema" || canal === "ambos",
		);
	}
});

// Onda 10, P23: OSC 9 no iTerm2, foot e Windows Terminal; terminal desconhecido recebe 777 e BEL.
test("P23 protocolo por terminal, OSC 9 seguro e BEL de reserva", () => {
	assert.equal(n.protocolo({ KITTY_WINDOW_ID: "1" }), "99");
	for (const env of [{ TERM_PROGRAM: "iTerm.app" }, { WT_SESSION: "x" }, { TERM: "foot" }, { TERM: "foot-extra" }])
		assert.equal(n.protocolo(env), "9", JSON.stringify(env));
	for (const env of [{ TERM_PROGRAM: "ghostty" }, { TERM_PROGRAM: "WezTerm" }, { VTE_VERSION: "7600" }, { TMUX: "x" }])
		assert.equal(n.protocolo(env), "777", JSON.stringify(env));
	assert.equal(n.protocolo({}), "desconhecido");
	assert.equal(n.osc9("s · p", "Terminou · 5s"), "\x1b]9;s · p · Terminou · 5s\x07");
	assert.equal(n.osc9("4;50", "x"), "\x1b]9;nycode: 4;50 · x\x07", "não vira subcomando 9;4");
	assert.equal(n.osc9("a\x07\x1b]b", "c").split("\x07").length, 2);
	const iterm = cria({ TERM_PROGRAM: "iTerm.app" });
	iterm.nt.enviar("sistema", "terminou", "s · p", { duracao: "5s" });
	assert.deepEqual(iterm.out, ["\x1b]9;s · p · Terminou · 5s\x07"]);
	const nada = cria({});
	nada.nt.enviar("sistema", "terminou", "s · p", { duracao: "5s" });
	assert.deepEqual(nada.out, ["\x1b]777;notify;s · p;Terminou · 5s\x07", "\x07"]);
	const desligado = cria({});
	desligado.nt.enviar("desligado", "terminou", "s · p");
	assert.deepEqual(desligado.out, []);
});
