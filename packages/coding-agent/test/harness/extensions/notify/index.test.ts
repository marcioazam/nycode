// vitest: test/harness/extensions/notify/index.test.ts
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, test, vi } from "vitest";
import * as __typed_avisos_index from "../../../../src/extensions/notify/index.ts";

// The rendering reads TERM: pin it so the suite does not depend on the shell it runs in.
beforeEach(() => {
	vi.stubEnv("TERM", "xterm-256color");
});
afterEach(() => {
	vi.unstubAllEnvs();
});

// The source tests drive the modules with partial fakes, without types.
const __a_avisos_index: any = __typed_avisos_index;

const m = __a_avisos_index;

const SOM = "som"; // marker the injected player pushes into `emitidos`
const msgs = (extra: object = {}) => [{ role: "user" }, { role: "assistant", stopReason: "stop", ...extra }];
const MIN = 60_000;

/** nycode falso + relógio injetado; `cfg` vira o avisos.json da sessão. */
// Onda 10, P23: env vazio virou "terminal desconhecido" (777 e BEL); o padrão aqui é um terminal de 777 (GNOME VTE).
function cria(cfg: object | undefined, env: Record<string, string> = { VTE_VERSION: "7600" }, settings: object = {}) {
	const dir = mkdtempSync(join(tmpdir(), "avisos-idx-"));
	const caminho = join(dir, "avisos.json");
	if (cfg) writeFileSync(caminho, JSON.stringify(cfg));
	const handlers = new Map<string, (...a: any[]) => any>();
	const bus = new Map<string, Array<(d: unknown) => void>>();
	const comandos = new Map<string, any>();
	const emitidos: string[] = [];
	const out: string[] = [];
	let agora = 1_000_000;
	const nycode: any = {
		on: (n: string, h: any) => handlers.set(n, h),
		events: {
			on: (n: string, h: any) => bus.set(n, [...(bus.get(n) ?? []), h]),
			emit: (n: string, d: unknown) => {
				emitidos.push(n);
				for (const h of bus.get(n) ?? []) h(d);
			},
		},
		getSessionName: () => "refatora o parser",
		getSettings: () => settings,
		registerCommand: (n: string, c: any) => comandos.set(n, c),
	};
	m.montar(nycode, {
		escrever: (s: string) => out.push(s),
		agora: () => agora,
		caminho,
		env,
		tocar: () => emitidos.push(SOM),
	});
	const ctx = { hasUI: true, cwd: "/x/projeto-demo" };
	const h = {
		start: () => handlers.get("session_start")!({}, ctx),
		input: (source = "interactive") => handlers.get("input")!({ source }),
		foco: (focused: boolean) => nycode.events.emit("nycode-ui:terminal-focus", { focused }),
		turno: (mensagens: unknown[], ms: number, aborted?: boolean) => {
			handlers.get("agent_start")!({});
			agora += ms;
			handlers.get("agent_end")!({ messages: mensagens });
			handlers.get("agent_settled")!({ aborted });
		},
		inicia: () => handlers.get("agent_start")!({}),
		compacta: (e: object) => handlers.get("session_compact")!(e, ctx),
		pergunta: () => nycode.events.emit("nycode:question:v1", {}),
	};
	return {
		h,
		out,
		emitidos,
		comandos,
		ctx,
		caminho,
		avanca: (ms: number) => {
			agora += ms;
			return agora;
		},
		handlers,
	};
}
const sons = (e: string[]) => e.filter((x) => x === SOM).length;

test("sem UI ou em subagente não notifica nem toca; session_start não anuncia dono", () => {
	const a = cria(undefined);
	a.h.start();
	assert.deepEqual(a.emitidos, []);
	const b = cria(undefined);
	b.handlers.get("session_start")!({}, { hasUI: false, cwd: "/x" });
	b.h.turno(msgs({ stopReason: "error" }), MIN);
	assert.deepEqual([b.emitidos, b.out], [[], []]);
	const c = cria(undefined, { NYCODE_SUBAGENT: "1" });
	assert.equal(c.handlers.size, 0);
});

test("/notifications e o alias /avisos abrem o mesmo painel", () => {
	const t = cria(undefined);
	assert.equal(t.comandos.get("notifications"), t.comandos.get("avisos"));
});

test("notify.sound=false cala o som; notify.desktop=false cala a notificação e mantém o sino do canal", () => {
	const a = cria(undefined, undefined, { notify: { sound: false } });
	a.h.start();
	a.h.turno(msgs({ stopReason: "error" }), MIN);
	assert.equal(a.out.length, 1);
	assert.equal(sons(a.emitidos), 0);
	const b = cria(undefined, undefined, { notify: { desktop: false } });
	b.h.start();
	b.h.turno(msgs({ stopReason: "error" }), MIN);
	assert.deepEqual(b.out, []);
	assert.equal(sons(b.emitidos), 1);
	const c = cria({ canal: "ambos" }, undefined, { notify: { desktop: false } });
	c.h.start();
	c.h.turno(msgs({ stopReason: "error" }), MIN);
	assert.deepEqual(c.out, ["\x07"]);
});

test("terminou, ausente: título sessão · pasta, corpo com duração, OSC 777; sem som no padrão", () => {
	const t = cria(undefined);
	t.h.start();
	t.h.turno(msgs(), 134_000);
	assert.deepEqual(t.out, ["\x1b]777;notify;refatora o parser · projeto-demo;Terminou · 2m 14s\x07"]);
	assert.equal(sons(t.emitidos), 0);
});

test("erro: rótulo da causa no corpo, som no padrão; pergunta: precisa + som", () => {
	const t = cria(undefined);
	t.h.start();
	t.h.turno(
		msgs({ stopReason: "error", errorMessage: 'Error: 429: {"error":{"type":"rate_limit_error","message":"x"}}' }),
		5000,
	);
	assert.deepEqual(t.out, [
		"\x1b]777;notify;refatora o parser · projeto-demo;Parou com erro · limite de uso do provedor\x07",
	]);
	assert.equal(sons(t.emitidos), 1);
	t.out.length = 0;
	t.h.pergunta();
	assert.deepEqual(t.out, ["\x1b]777;notify;refatora o parser · projeto-demo;Precisa de você · pergunta aberta\x07"]);
	assert.equal(sons(t.emitidos), 2);
});

test("interrompido: nada de notificação, som nem registro; pergunta antes do session_start é ignorada", () => {
	const t = cria(undefined);
	t.h.pergunta();
	t.h.start();
	t.h.turno(msgs({ stopReason: "aborted" }), MIN);
	assert.deepEqual(t.out, []);
	assert.equal(sons(t.emitidos), 0);
});

test("presente (foco, ou input há menos de 30 s sem foco): não notifica, mas o som segue a lista", () => {
	const t = cria({ som: ["terminou", "erro", "precisa"] });
	t.h.start();
	t.h.foco(true);
	t.h.turno(msgs(), MIN);
	assert.deepEqual(t.out, []);
	assert.equal(sons(t.emitidos), 1);
	const u = cria(undefined);
	u.h.start();
	u.h.input();
	u.avanca(1000);
	u.h.turno(msgs({ stopReason: "error" }), 10_000);
	assert.deepEqual(u.out, []);
	u.h.input("extension"); // input de extensão não conta como presença
	u.h.turno(msgs(), 40_000);
	assert.equal(u.out.length, 1);
});

test("avisar filtra o evento; canal desligado cala; NYCODE_SOUND_NOTIFY=0 cala o som", () => {
	const a = cria({ avisar: ["erro"] });
	a.h.start();
	a.h.turno(msgs(), MIN);
	assert.deepEqual(a.out, []);
	const b = cria({ canal: "desligado" });
	b.h.start();
	b.h.turno(msgs({ stopReason: "error" }), MIN);
	assert.deepEqual(b.out, []);
	assert.equal(sons(b.emitidos), 1);
	const c = cria(undefined, { NYCODE_SOUND_NOTIFY: "0" });
	c.h.start();
	c.h.turno(msgs({ stopReason: "error" }), MIN);
	assert.equal(sons(c.emitidos), 0);
});

test("kitty: substitui pelo mesmo id e fecha com p=close quando o foco volta", () => {
	const t = cria(undefined, { KITTY_WINDOW_ID: "1" });
	t.h.start();
	t.h.turno(msgs(), MIN);
	t.h.foco(true);
	assert.equal(t.out.length, 3);
	assert.match(t.out[2], /^\x1b\]99;i=nycode-\d+:p=close;\x1b\\$/);
});

test("progresso: 3 ao começar, 0 ao terminar, 2 no erro, nada em terminal sem suporte", () => {
	const g = cria({ canal: "desligado" }, { TERM_PROGRAM: "ghostty" });
	g.h.start();
	g.h.turno(msgs(), 1000);
	assert.deepEqual(g.out, ["\x1b]9;4;3\x07", "\x1b]9;4;0\x07"]);
	g.h.turno(msgs({ stopReason: "error" }), 1000);
	assert.equal(g.out.at(-1), "\x1b]9;4;2;100\x07");
	g.handlers.get("session_shutdown")!({});
	assert.equal(g.out.at(-1), "\x1b]9;4;0\x07");
	const s = cria({ canal: "desligado" });
	s.h.start();
	s.h.turno(msgs(), 1000);
	assert.deepEqual(s.out, []);
	const off = cria({ canal: "desligado", progresso: false }, { TERM_PROGRAM: "ghostty" });
	off.h.start();
	off.h.turno(msgs(), 1000);
	assert.deepEqual(off.out, []);
});

test("/avisos: painel; testar dispara canal e som mesmo com foco; salvar grava avisos.json", async () => {
	const t = cria({ som: ["erro"] });
	t.h.start();
	t.h.foco(true);
	let painel: any;
	const ctx = {
		...t.ctx,
		ui: {
			notify: () => {},
			custom: async (f: any) => {
				painel = f(
					{ requestRender() {} },
					{ fg: (_c: string, s: string) => s, bg: (_c: string, s: string) => s, bold: (s: string) => s },
					null,
					() => {},
				);
			},
		},
	};
	await t.comandos.get("avisos").handler("", ctx);
	painel.handleInput("\t");
	for (let i = 0; i < 4; i++) painel.handleInput("\x1b[B");
	painel.handleInput(" ");
	assert.deepEqual(t.out, ["\x1b]777;notify;refatora o parser · projeto-demo;Teste · o aviso chegou\x07"]);
	assert.equal(sons(t.emitidos), 1);
	for (let i = 0; i < 4; i++) painel.handleInput("\x1b[A");
	painel.handleInput(" ");
	assert.deepEqual(JSON.parse(readFileSync(t.caminho, "utf8")).avisar, ["precisa", "erro"]);
	// turno seguinte já usa a config nova
	t.h.foco(false);
	t.out.length = 0;
	t.h.turno(msgs(), MIN);
	assert.deepEqual(t.out, []);
	painel.handleInput("\t");
	assert.match(painel.render(80).join("\n"), /Terminou · 1m 0s/);
});

test("agent_settled com aborted=true é interrompido mesmo com mensagem normal: sem aviso nem som", () => {
	const t = cria(undefined);
	t.h.start();
	t.h.turno(msgs(), MIN, true);
	assert.deepEqual(t.out, []);
	assert.equal(sons(t.emitidos), 0);
	t.h.turno(msgs({ stopReason: "error", errorMessage: "429 x" }), MIN, true);
	assert.deepEqual(t.out, []);
	assert.equal(sons(t.emitidos), 0);
});

test("agent_start que não chegou a agent_settled não infla a duração do turno seguinte", () => {
	const t = cria(undefined);
	t.h.start();
	t.h.inicia();
	t.avanca(30 * MIN);
	t.h.start(); // nova sessão: o início pendente é descartado
	t.h.turno(msgs(), MIN);
	assert.ok(t.out.join("").includes("Terminou · 1m 0s"), t.out.join(""));
});

test("compactação automática entra nos recentes com o tamanho de antes; manual não", async () => {
	const t = cria(undefined);
	t.h.start();
	t.h.compacta({ reason: "manual", compactionEntry: { tokensBefore: 100_000 } });
	t.h.compacta({ reason: "threshold", compactionEntry: { tokensBefore: 182_400 } });
	t.h.compacta({ reason: "overflow" });
	let painel: any;
	const ctx = {
		...t.ctx,
		ui: {
			notify: () => {},
			custom: async (f: any) => {
				painel = f(
					{ requestRender() {} },
					{ fg: (_c: string, s: string) => s, bg: (_c: string, s: string) => s, bold: (s: string) => s },
					null,
					() => {},
				);
			},
		},
	};
	await t.comandos.get("avisos").handler("", ctx);
	const tela = painel.render(100).join("\n");
	assert.ok(tela.includes("Contexto compactado sozinho · de 182k tokens"), tela);
	assert.equal(tela.split("Contexto compactado sozinho").length - 1, 2, "manual não registra");
});

test("tentativas canceladas por você (marca do core) não é erro: sem aviso, sem som, fora do painel; a marca vale uma vez", () => {
	const k = Symbol.for("nycode:retry-cancelado");
	const t = cria(undefined);
	t.h.start();
	(globalThis as any)[k] = Date.now();
	t.h.turno(msgs({ stopReason: "error", errorMessage: "429 x" }), MIN);
	assert.deepEqual([t.out, sons(t.emitidos)], [[], 0]);
	assert.equal((globalThis as any)[k], undefined);
	t.h.turno(msgs({ stopReason: "error", errorMessage: "429 x" }), MIN);
	assert.equal(t.out.length, 1);
	assert.equal(sons(t.emitidos), 1);
});

// Onda 10, P22: o andamento do Task vira estado 1 com %; a pergunta aberta pausa (estado 4) até ser respondida.
test("P22 progresso: % do todo, pausa na pergunta e volta ao responder", () => {
	const t = cria(undefined, { NYCODE_TERM_PROGRESS: "1", VTE_VERSION: "7600" });
	t.h.start();
	t.h.inicia();
	assert.equal(t.out.at(-1), "\x1b]9;4;3\x07");
	const fim = t.handlers.get("tool_execution_end")!;
	fim({
		toolName: "todo",
		result: {
			details: {
				todos: [{ status: "completed" }, { status: "in_progress" }, { status: "pending" }, { status: "completed" }],
			},
		},
	});
	assert.equal(t.out.at(-1), "\x1b]9;4;1;50\x07");
	t.h.pergunta();
	assert.ok(t.out.includes("\x1b]9;4;4;50\x07"));
	fim({ toolName: "question", result: {} });
	assert.equal(t.out.at(-1), "\x1b]9;4;1;50\x07");
	fim({ toolName: "todo", result: { details: { todos: [] } } });
	assert.equal(t.out.at(-1), "\x1b]9;4;3\x07");
	fim({ toolName: "bash", result: {} });
	assert.equal(t.out.at(-1), "\x1b]9;4;3\x07");
});

test("progresso do todo: item cancelado sai da conta (lista encerrada = 100%)", () => {
	const t = cria(undefined, { NYCODE_TERM_PROGRESS: "1", VTE_VERSION: "7600" });
	t.h.start();
	t.h.inicia();
	const fim = t.handlers.get("tool_execution_end")!;
	fim({ toolName: "todo", result: { details: { todos: [{ status: "completed" }, { status: "cancelled" }] } } });
	assert.equal(t.out.at(-1), "\x1b]9;4;1;100\x07");
	fim({ toolName: "todo", result: { details: { todos: [{ status: "cancelled" }] } } });
	assert.equal(t.out.at(-1), "\x1b]9;4;1;100\x07");
});
