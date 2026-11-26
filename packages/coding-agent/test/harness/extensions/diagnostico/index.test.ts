// node --experimental-strip-types --test extensions/diagnostico/test/index.test.ts
import assert from "node:assert/strict";
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, test, vi } from "vitest";
import * as __d_index from "../../../../src/extensions/diagnostico/index.ts";

// The rendering reads TERM: pin it so the suite does not depend on the shell it runs in.
beforeEach(() => {
	vi.stubEnv("TERM", "xterm-256color");
});
afterEach(() => {
	vi.unstubAllEnvs();
});

const m = __d_index;
const SINK = Symbol.for("nycode:diag");
const T0 = Date.parse("2026-11-14T12:00:00Z");

function cria(env: Record<string, string> = {}, pre?: (d: string) => void, colunas?: number) {
	const d = mkdtempSync(join(tmpdir(), "diag-idx-"));
	pre?.(d);
	const handlers = new Map<string, (...a: any[]) => any>();
	const comandos = new Map<string, any>();
	const atalhos = new Map<string, any>();
	const nycode: any = {
		on: (n: string, h: any) => handlers.set(n, h),
		registerCommand: (n: string, c: any) => comandos.set(n, c),
		registerShortcut: (k: string, o: any) => atalhos.set(k, o),
	};
	const status: Array<string | undefined> = [];
	const notices: Array<[string, string]> = [];
	const widgets: any[] = [];
	const copiados: string[] = [];
	const ui: any = {
		setWidget: (...a: any[]) => widgets.push(a),
		notify: (msg: string, tipo: string) => notices.push([msg, tipo]),
		setStatus: (_k: string, t?: string) => status.push(t),
		custom: async (f: any) => {
			ui.painel = f(
				{ requestRender() {} },
				{ fg: (_c: string, s: string) => s, bg: (_c: string, s: string) => s, bold: (s: string) => s },
				null,
				() => {},
			);
		},
	};
	const ctx: any = { hasUI: true, mode: "tui", ui };
	const original = ui.notify;
	const chamadas: any[] = [];
	const con: any = { warn: (...a: any[]) => chamadas.push(["w", a]), error: (...a: any[]) => chamadas.push(["e", a]) };
	const conOriginal = { ...con };
	const ouvintes: Array<[string, any]> = [];
	const processo = {
		on: (e: string, f: any) => ouvintes.push([e, f]),
		off: (e: string, f: any) =>
			ouvintes.splice(
				ouvintes.findIndex(([x, y]) => x === e && y === f),
				1,
			),
	};
	m.montar(nycode, {
		env,
		agora: () => T0,
		dir: join(d, "diag"),
		console: con,
		processo,
		crashes: join(d, "crashes.json"),
		colunas: colunas ? () => colunas : undefined,
		copiar: async (t: string) => void copiados.push(t),
	});
	const h = (n: string, ...a: any[]) => handlers.get(n)!(...a);
	const log = () =>
		existsSync(join(d, "diag", "diag.jsonl"))
			? readFileSync(join(d, "diag", "diag.jsonl"), "utf8")
					.trim()
					.split("\n")
					.map((l) => JSON.parse(l))
			: [];
	return {
		d,
		nycode,
		handlers,
		comandos,
		atalhos,
		widgets,
		copiados,
		ui,
		ctx,
		h,
		status,
		notices,
		original,
		con,
		conOriginal,
		chamadas,
		ouvintes,
		log,
		start: () => h("session_start", {}, ctx),
		ultimo: () => status.at(-1),
	};
}

test("NYCODE_DIAG=0 não faz nada; subagente não registra comandos (modo reduzido em test/obs)", () => {
	const off = cria({ NYCODE_DIAG: "0" });
	assert.equal(off.handlers.size, 0);
	assert.equal(off.comandos.size, 0);
	const filho = cria({ NYCODE_SUBAGENT: "1" });
	assert.ok(filho.handlers.size > 0);
	assert.equal(filho.comandos.size, 0);
});

test("sem UI nada é instalado", () => {
	const t = cria();
	t.h("session_start", {}, { hasUI: false, ui: t.ui });
	assert.equal(t.ui.notify, t.original);
	assert.equal(t.ouvintes.length, 0);
});

test("notify é embrulhado uma vez e registra sem aviso duplicado", () => {
	const t = cria();
	t.start();
	const embrulhado = t.ui.notify;
	assert.notEqual(embrulhado, t.original);
	t.start();
	assert.equal(t.ui.notify, embrulhado);
	t.ui.notify("hook falhou\nstack...", "error");
	t.ui.notify("só info", "info");
	assert.deepEqual(t.notices, [
		["hook falhou\nstack...", "error"],
		["só info", "info"],
	]);
	assert.equal(t.log().length, 2);
	assert.equal(t.log()[0].severityNumber, 17);
	assert.equal(t.log()[0].source, "notify");
	assert.equal(t.log()[1].severityNumber, 9);
	assert.equal(t.ultimo(), "✕ 1 erro · ctrl+e abre");
});

test("console.warn/error: registra sem notify nem stderr; repetição soma; restaura no shutdown", () => {
	const t = cria();
	t.start();
	t.con.warn("config %s inválida", "x");
	t.con.warn("config %s inválida", "x");
	assert.deepEqual(t.notices, []); // sem aviso de primeira ocorrência: só o rodapé
	assert.equal(t.chamadas.length, 0); // não vai para o stderr atrás da TUI
	assert.equal(t.log().length, 2);
	t.con.error(new Error("boom"));
	assert.deepEqual(t.notices, []);
	assert.ok(t.log().at(-1).detail.includes("Error: boom"));
	assert.equal(t.ultimo(), "✕ 1 erro · ▲ 1 aviso · ctrl+e abre");
	t.h("session_shutdown", {});
	assert.equal(t.con.warn, t.conOriginal.warn);
	assert.equal(t.con.error, t.conOriginal.error);
	assert.equal(t.ui.notify, t.original);
	assert.equal(t.ouvintes.length, 0);
	assert.equal((globalThis as any)[SINK], undefined);
});

test("modo rpc: console.warn/error seguem para o stderr (canal dos diagnósticos do runtime)", () => {
	const t = cria();
	t.ctx.mode = "rpc";
	t.start();
	t.con.error("Warning: Could not restore model");
	assert.equal(t.con.error, t.conOriginal.error);
	assert.equal(t.chamadas.length, 1);
});

test("sink global valida e registra sem notify", () => {
	const t = cria();
	t.start();
	const sink = (globalThis as any)[SINK];
	for (const lixo of [null, 3, {}, { sev: 5, fonte: "a", tipo: "b", msg: "c" }, { sev: 13, fonte: "a" }])
		assert.doesNotThrow(() => sink(lixo));
	assert.equal(t.notices.length, 0);
	sink({ sev: 13, fonte: "hook", tipo: "guard", msg: "excecao interna" });
	sink({ sev: 13, fonte: "hook", tipo: "guard", msg: "excecao interna" });
	sink({ sev: 17, fonte: "modelo", tipo: "retry", msg: "visível em outro lugar", quieto: true });
	assert.deepEqual(t.notices, []);
	assert.equal(t.ultimo(), "✕ 1 erro · ▲ 1 aviso · ctrl+e abre");
	t.h("session_shutdown", {});
	assert.equal((globalThis as any)[SINK], undefined);
});

test("erro de tool, erro de modelo e compactação, sem aviso extra", () => {
	const t = cria();
	t.start();
	t.h("tool_execution_end", {
		toolName: "bash",
		isError: true,
		result: { content: [{ type: "text", text: "falhou\nlinha 2" }, { type: "image" }] },
	});
	t.h("tool_execution_end", { toolName: "read", isError: true, result: {} });
	t.h("tool_execution_end", { toolName: "ok", isError: false, result: {} });
	t.h("message_end", { message: { role: "assistant", stopReason: "error", errorMessage: "529 overloaded" } });
	t.h("message_end", { message: { role: "assistant", stopReason: "error" } });
	t.h("message_end", { message: { role: "assistant", stopReason: "stop" } });
	t.h("session_compact_failed", { reason: "threshold", errorMessage: "sem espaço", willRetry: true });
	t.h("session_compact_failed", { reason: "overflow", willRetry: false });
	t.h("session_compact_failed", { reason: "manual", aborted: true });
	const l = t.log().map((x: any) => [x.source, x["error.type"], x.severityNumber, x.body, x.detail]);
	assert.deepEqual(l, [
		["tool", "bash", 13, "falhou", "falhou\nlinha 2"],
		["tool", "read", 13, "erro sem texto", undefined],
		["modelo", "erro", 17, "529 overloaded", undefined],
		["modelo", "erro", 17, "erro sem mensagem", undefined],
		["compactação", "threshold", 13, "sem espaço", undefined],
		["compactação", "overflow", 17, "overflow", undefined],
	]);
	assert.deepEqual(t.notices, []);
	assert.equal(t.ultimo(), "✕ 3 erros · ▲ 3 avisos · ctrl+e abre");
});

test("caixa de entrada: lê no start e nos eventos, sem notify", () => {
	const inbox = join(tmpdir(), `diag-inbox-${process.pid}-${Math.random()}.tsv`);
	writeFileSync(inbox, "17\twrapper\tpatch\tpatch não aplicou\tdetalhe\\ncompleto\n");
	const t = cria({ NYCODE_DIAG_INBOX: inbox });
	t.start();
	assert.equal(t.log().length, 1);
	assert.equal(t.log()[0].detail, "detalhe\ncompleto");
	appendFileSync(inbox, "13\tguard\tex\tnovo\n13\tguard\tex\tparcial");
	t.h("turn_end", {});
	assert.equal(t.log().at(-1).body, "novo");
	assert.equal(t.log().length, 2);
	appendFileSync(inbox, "\n");
	t.h("agent_settled", {});
	assert.equal(t.log().length, 3);
	assert.deepEqual(t.notices, []);
	assert.equal(t.ultimo(), "✕ 1 erro · ▲ 2 avisos · ctrl+e abre");
});

test("inbox antigo é podado; o atual não", () => {
	const t = cria({}, (d) => {
		mkdirSync(join(d, "diag"));
		writeFileSync(join(d, "diag", "inbox-1.tsv"), "");
		writeFileSync(join(d, "diag", "inbox-2.tsv"), "");
		const velho = new Date(T0 - 8 * 86400_000);
		utimesSync(join(d, "diag", "inbox-1.tsv"), velho, velho);
		const novo = new Date(T0 - 1000);
		utimesSync(join(d, "diag", "inbox-2.tsv"), novo, novo);
	});
	t.start();
	assert.ok(!existsSync(join(t.d, "diag", "inbox-1.tsv")));
	assert.ok(existsSync(join(t.d, "diag", "inbox-2.tsv")));
});

test("crashes.json: últimas 24 h entram já vistos, sem aviso e fora do rodapé", async () => {
	const t = cria({}, (d) => {
		writeFileSync(
			join(d, "crashes.json"),
			JSON.stringify([
				{ timestamp: T0 - 3600_000, kind: "uncaughtException", message: "caiu", stack: "Error: caiu\n  at x" },
				{ timestamp: T0 - 30 * 3600_000, kind: "uncaughtException", message: "velho", stack: "" },
			]),
		);
	});
	t.start();
	assert.deepEqual(t.notices, []);
	assert.equal(t.ultimo(), undefined);
	const l = t.log();
	assert.equal(l.length, 0); // histórico anterior não é regravado no log
	await t.comandos.get("diagnostico").handler("", t.ctx);
	const o = t.ui.painel.render(100).join("\n");
	assert.ok(o.includes("caiu") && !o.includes("velho"));
	assert.equal(cria().ultimo(), undefined);
	const inv = cria({}, (d) => writeFileSync(join(d, "crashes.json"), "{lixo"));
	assert.doesNotThrow(() => inv.start());
});

test("crash da sessão: monitor grava FATAL; nunca registra unhandledRejection/uncaughtException", () => {
	const t = cria();
	t.start();
	assert.deepEqual(
		t.ouvintes.map(([e]) => e),
		["uncaughtExceptionMonitor"],
	);
	t.ouvintes[0]![1](new Error("fatal!"));
	const l = t.log()[0];
	assert.equal(l.severityNumber, 21);
	assert.equal(l["error.type"], "crash");
	assert.ok(l.detail.includes("fatal!"));
	assert.deepEqual(t.notices, []);
	assert.equal(t.ultimo(), "✕ 1 erro · ctrl+e abre");
});

test("/diagnostico marca tudo visto: o rodapé troca a contagem pelo total da sessão", async () => {
	const t = cria({ HOME: "/home/fulano" });
	t.start();
	t.ui.notify("erro qualquer", "error");
	assert.ok(t.ultimo());
	await t.comandos.get("diagnostico").handler("", t.ctx);
	assert.equal(t.ultimo(), "diagnóstico: 1");
	const out = t.ui.painel.render(120);
	assert.equal(t.ui.painel.aba, "problemas");
	assert.match(out[0], /^── Diagnóstico ─+ +problemas +eventos +saúde +──$/);
	assert.ok(out.join("\n").includes("erro qualquer"));
	await t.comandos.get("diagnostico").handler("limpar", t.ctx);
	assert.equal(t.ultimo(), undefined); // lista vazia: nada no rodapé
	assert.match(t.comandos.get("diagnostico").description, /Erros e avisos internos/);
});

test("notify chamado durante a captura não reentra", () => {
	const t = cria();
	const original = t.ui.notify;
	t.ui.notify = (m: string, tp: string) => {
		original(m, tp);
		if (m !== "dentro") t.ui.notify("dentro", "error"); // reentrada via wrapper
	};
	t.start();
	t.ui.notify("fora", "info");
	assert.ok(t.log().length >= 1);
});

test("status com NYCODE_ASCII_ICONS=1 usa x e !", () => {
	const t = cria({ NYCODE_ASCII_ICONS: "1" });
	t.start();
	t.ui.notify("falha", "error");
	t.ui.notify("atenção", "warning");
	assert.equal(t.ultimo(), "x 1 erro · ! 1 aviso · ctrl+e abre");
});

// Atalho ctrl+e: antes alt+e.
test("atalho ctrl+e registrado: abre o modal em problemas, marca visto; s silencia e reativa pelo registro", async () => {
	const t = cria();
	t.start();
	assert.deepEqual([...t.atalhos.keys()], ["ctrl+e"]);
	assert.equal(m.ATALHO, "ctrl+e");
	t.ui.notify("falha", "error");
	await t.atalhos.get("ctrl+e").handler(t.ctx);
	assert.equal(t.ui.painel.aba, "problemas");
	assert.equal(t.ultimo(), "diagnóstico: 1");
	t.ui.painel.handleInput("s");
	assert.ok(t.ui.painel.render(120).join("\n").includes("falha (silenciado)"));
	t.ui.painel.handleInput("s");
	assert.ok(!t.ui.painel.render(120).join("\n").includes("silenciado"));
	t.ui.painel.handleInput("c");
	await new Promise((r) => setImmediate(r));
	assert.ok(t.copiados[0]!.startsWith("falha\nnotify · notify · "));
	const semUi = cria();
	semUi.start();
	await semUi.atalhos.get("ctrl+e").handler({ hasUI: false, ui: semUi.ui });
	assert.equal(semUi.ui.painel, undefined);
});

test("nada acima do editor nem notify para o que é capturado; notify alheio segue passando", () => {
	const t = cria();
	t.start();
	t.con.warn("aviso de console");
	t.h("tool_execution_end", {
		toolName: "bash",
		isError: true,
		result: { content: [{ type: "text", text: "EXIT=0\n\nCommand exited with code 1" }] },
	});
	(globalThis as any)[SINK]({ sev: 17, fonte: "hook", tipo: "hook", msg: "Stop · h.sh · saiu 1 · 3 ms" });
	t.h("message_end", {
		message: {
			role: "assistant",
			stopReason: "error",
			errorMessage: '529 {"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}',
		},
	});
	assert.deepEqual(t.widgets, []);
	assert.deepEqual(t.notices, []);
	t.ui.notify("de outra extensão", "warning");
	assert.deepEqual(t.notices, [["de outra extensão", "warning"]]);
	assert.deepEqual(t.widgets, []);
	assert.equal(t.log().length, 5);
	t.h("session_shutdown", {});
});

test("rodapé: contagem com singular e plural, sem título do problema; cor só no texto; encurta quando falta largura", () => {
	const marcado = (t: any) => {
		t.ui.theme = { fg: (c: string, s: string) => `<${c}>${s}</>` };
	};
	const largo = cria({}, undefined, 120);
	largo.start();
	largo.h("tool_execution_end", {
		toolName: "bash",
		isError: true,
		result: { content: [{ type: "text", text: "EXIT=0\n\nCommand exited with code 1" }] },
	});
	assert.equal(largo.ultimo(), "▲ 1 aviso · ctrl+e abre");
	largo.h("message_end", {
		message: {
			role: "assistant",
			stopReason: "error",
			errorMessage: '429 {"type":"error","error":{"type":"rate_limit_error","message":"x"}}',
		},
	});
	assert.equal(largo.ultimo(), "✕ 1 erro · ▲ 1 aviso · ctrl+e abre");
	marcado(largo);
	largo.ouvintes[0]![1](new Error("quebrou de vez"));
	assert.equal(largo.ultimo(), "<error>✕ 2 erros</><dim> · </><warning>▲ 1 aviso</><dim> · </><dim>ctrl+e abre</>");
	const medio = cria({}, undefined, 80);
	medio.start();
	medio.ui.notify("um erro com mensagem comprida", "error");
	assert.equal(medio.ultimo(), "✕ 1 erro · ctrl+e abre");
	const estreito = cria({}, undefined, 60);
	estreito.start();
	estreito.ui.notify("um erro", "error");
	assert.equal(estreito.ultimo(), "✕ 1 · ctrl+e"); // sem largura para as palavras
});

test("/diagnostico nivel não existe mais: erro de uso; completions sem nivel", async () => {
	const t = cria({ NYCODE_DIAG_NIVEL: "tudo" });
	t.start();
	const cmd = t.comandos.get("diagnostico");
	await cmd.handler("nivel erros", t.ctx);
	assert.deepEqual(t.notices.at(-1), ["uso: /diagnostico [eventos|trace|limpar]", "info"]);
	assert.equal(t.ui.painel, undefined);
	assert.deepEqual(
		cmd.getArgumentCompletions("").map((x: any) => x.value),
		["eventos", "trace", "limpar"],
	);
	assert.equal(cmd.getArgumentCompletions("n"), null);
	(globalThis as any)[SINK]({ sev: 9, fonte: "hook", tipo: "hook", msg: "h ok", quieto: true });
	assert.deepEqual(t.widgets, []);
	t.h("session_shutdown", {});
});

test("S8: sem UI (nycode -p, subagente) também poda inbox antigo; o atual fica", () => {
	const pre = (d: string) => {
		mkdirSync(join(d, "diag"));
		writeFileSync(join(d, "diag", "inbox-1.tsv"), "");
		writeFileSync(join(d, "diag", "inbox-2.tsv"), "");
		const velho = new Date(T0 - 8 * 86400_000);
		utimesSync(join(d, "diag", "inbox-1.tsv"), velho, velho);
	};
	const t = cria({}, pre);
	t.h("session_start", {}, { hasUI: false, ui: t.ui });
	assert.ok(!existsSync(join(t.d, "diag", "inbox-1.tsv")));
	assert.ok(existsSync(join(t.d, "diag", "inbox-2.tsv")));
	const f = cria({ NYCODE_SUBAGENT: "1" }, pre);
	f.h("session_start", {}, { hasUI: true, mode: "tui", ui: f.ui });
	assert.ok(!existsSync(join(f.d, "diag", "inbox-1.tsv")));
});
