// node --experimental-strip-types --test extensions/diagnostico/test/obs/integracao.test.ts
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, test, vi } from "vitest";
import * as __d_index from "../../../../../src/extensions/diagnostico/index.ts";
import * as __d_registro from "../../../../../src/extensions/diagnostico/registro.ts";

// The rendering reads TERM: pin it so the suite does not depend on the shell it runs in.
beforeEach(() => {
	vi.stubEnv("TERM", "xterm-256color");
});
afterEach(() => {
	vi.unstubAllEnvs();
});

const m = __d_index;
const { lerCaixa } = __d_registro;
const SINK = Symbol.for("nycode:diag");
const T0 = Date.parse("2026-11-14T12:00:00Z");
const SEGREDO = "SEGREDO-NAO-VAZA-123";
const TP = `00-${"a".repeat(32)}-${"b".repeat(16)}-01`;
const theme = { fg: (_c: string, s: string) => s, bg: (_c: string, s: string) => s, bold: (s: string) => s };

function cria(env: Record<string, string> = {}, extra: Record<string, any> = {}) {
	const d = mkdtempSync(join(tmpdir(), "diag-obs-"));
	const handlers = new Map<string, (...a: any[]) => any>();
	const comandos = new Map<string, any>();
	const nycode: any = {
		on: (n: string, h: any) => handlers.set(n, h),
		registerCommand: (n: string, c: any) => comandos.set(n, c),
		registerShortcut() {},
	};
	const chamadasUi: string[] = [];
	const widgets: any[] = [];
	const status: any[] = [];
	const notices: Array<[string, string]> = [];
	const ui: any = {
		theme,
		notify: (msg: string, tipo: string) => notices.push([msg, tipo]),
		setStatus: (_k: string, v: any) => {
			chamadasUi.push("setStatus");
			status.push(v);
		},
		setWidget: (_k: string, v: any) => {
			chamadasUi.push("setWidget");
			widgets.push(v);
		},
		custom: async (f: any) => {
			ui.painel = f({ requestRender() {} }, theme, null, () => {});
		},
	};
	const rt: any = {
		streamSimple: function (this: any, ...a: any[]) {
			rt.vistos.push({ self: this, a });
			return rt.proximo(...a);
		},
		stream: (...a: any[]) => rt.proximo(...a),
		vistos: [] as any[],
		proximo: (..._a: any[]): any => ({ result: () => Promise.resolve({ stopReason: "stop" }) }),
	};
	const ctx: any = {
		hasUI: extra.hasUI ?? true,
		ui,
		model: { provider: "p", id: "m" },
		sessionManager: { getSessionId: () => "sess-1" },
		modelRegistry: { runtime: rt, hasConfiguredAuth: () => true },
	};
	const con: any = { warn() {}, error() {} };
	const logs: string[] = [];
	m.montar(nycode, {
		env,
		agora: () => T0,
		dir: join(d, "diag"),
		console: con,
		processo: { on() {}, off() {} },
		crashes: join(d, "crashes.json"),
		log: (l: string) => logs.push(l),
		colunas: () => 80,
		exec: async () => ({ code: 0, stdout: "OK\n", stderr: "" }),
		...extra.deps,
	});
	const h = (n: string, ...a: any[]) => handlers.get(n)!(...a);
	const traces = () =>
		existsSync(join(d, "diag", "traces.jsonl"))
			? readFileSync(join(d, "diag", "traces.jsonl"), "utf8")
					.trim()
					.split("\n")
					.flatMap((l) =>
						JSON.parse(l).resourceSpans.flatMap((r: any) => r.scopeSpans.flatMap((s: any) => s.spans)),
					)
			: [];
	const log = () =>
		existsSync(join(d, "diag", "diag.jsonl"))
			? readFileSync(join(d, "diag", "diag.jsonl"), "utf8")
					.trim()
					.split("\n")
					.map((l) => JSON.parse(l))
			: [];
	return {
		d,
		env,
		h,
		handlers,
		comandos,
		ui,
		ctx,
		rt,
		notices,
		widgets,
		ultimo: () => status.at(-1),
		chamadasUi,
		logs,
		traces,
		log,
		start: () => h("session_start", {}, ctx),
		fim: () => h("session_shutdown", {}),
	};
}
const attr = (s: any, k: string) => {
	const a = s.attributes.find((x: any) => x.key === k);
	if (!a) return undefined;
	const v = Object.values(a.value)[0];
	return "intValue" in a.value ? Number(v) : v;
};
const porNome = (sp: any[], n: string) => sp.find((s) => s.name === n);
const tick = () => new Promise((r) => setImmediate(r));

test("eventos viram spans com pais certos e nenhum conteúdo vaza", async () => {
	const t = cria();
	t.start();
	t.h("agent_start", {});
	t.h("turn_start", { turnIndex: 0 });
	t.h("input", { text: `senha ${SEGREDO}`, source: "interactive" });
	t.h("tool_execution_start", { toolCallId: "c1", toolName: "bash", args: { command: `echo ${SEGREDO}` } });
	t.h("tool_execution_end", {
		toolCallId: "c1",
		toolName: "bash",
		isError: true,
		durationMs: 5,
		result: { content: [{ type: "text", text: "falhou" }] },
	});
	t.h("model_select", { model: { provider: "p", id: "m2" }, source: "set" });
	t.h("thinking_level_select", { level: "high", previousLevel: "off" });
	t.h("session_compact", { reason: "manual", willRetry: false });
	t.h("turn_end", { turnIndex: 0 });
	t.h("agent_end", {});
	await t.fim();
	const sp = t.traces();
	const agente = porNome(sp, "invoke_agent nycode");
	const turno = porNome(sp, "turn");
	const tool = porNome(sp, "execute_tool bash");
	assert.equal(attr(agente, "gen_ai.operation.name"), "invoke_agent");
	assert.equal(attr(agente, "gen_ai.agent.name"), "nycode");
	assert.equal(turno.parentSpanId, agente.spanId);
	assert.equal(tool.parentSpanId, turno.spanId);
	assert.equal(attr(tool, "gen_ai.tool.name"), "bash");
	assert.equal(attr(tool, "gen_ai.tool.call.id"), "c1");
	assert.equal(tool.status.code, 2);
	assert.equal(attr(porNome(sp, "input"), "nycode.input.chars"), `senha ${SEGREDO}`.length);
	for (const n of ["session_start", "session_shutdown", "model_select", "thinking_level_select", "session_compact"])
		assert.ok(porNome(sp, n), n);
	assert.equal(porNome(sp, "nycode").parentSpanId, undefined); // raiz fechada no shutdown
	assert.ok(!readFileSync(join(t.d, "diag", "traces.jsonl"), "utf8").includes(SEGREDO));
	assert.ok(!JSON.stringify(sp).includes(SEGREDO));
});

test("NYCODE_DIAG=0: nada registrado e TRACEPARENT intocado; pai publica TRACEPARENT e filho herda o trace id", () => {
	const off = cria({ NYCODE_DIAG: "0" });
	assert.equal(off.handlers.size, 0);
	assert.equal(off.comandos.size, 0);
	assert.equal(off.env.TRACEPARENT, undefined);
	const pai = cria();
	assert.match(pai.env.TRACEPARENT!, /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
});

test("fio: passa os mesmos argumentos, this e retorno; fecha com usage e motivo de parada", async () => {
	const t = cria();
	const orig = t.rt.streamSimple;
	t.start();
	assert.notEqual(t.rt.streamSimple, orig);
	const ret = { result: () => Promise.resolve({ stopReason: "stop", usage: { input: 11, output: 7, cacheRead: 3 } }) };
	t.rt.proximo = () => ret;
	const model = { provider: "anthropic", id: "opus" };
	const ctxArg = { systemPrompt: SEGREDO };
	const opts = { reasoning: "high" };
	const r = t.rt.streamSimple(model, ctxArg, opts);
	assert.equal(r, ret);
	assert.equal(t.rt.vistos[0].self, t.rt);
	assert.deepEqual(t.rt.vistos[0].a, [model, ctxArg, opts]);
	assert.equal(t.rt.vistos[0].a[1], ctxArg);
	await tick();
	await t.fim();
	const s = porNome(t.traces(), "chat anthropic/opus");
	assert.equal(attr(s, "gen_ai.operation.name"), "chat");
	assert.equal(attr(s, "gen_ai.provider.name"), "anthropic");
	assert.equal(attr(s, "gen_ai.request.model"), "opus");
	assert.equal(attr(s, "nycode.effort"), "high");
	assert.equal(attr(s, "gen_ai.usage.input_tokens"), 11);
	assert.equal(attr(s, "gen_ai.usage.output_tokens"), 7);
	assert.equal(attr(s, "gen_ai.usage.cache_read.input_tokens"), 3);
	assert.equal(attr(s, "gen_ai.response.finish_reasons"), "stop");
	assert.ok(!JSON.stringify(t.traces()).includes(SEGREDO));
});

test("fio: embrulha uma vez por instância (segundo session_start)", () => {
	const t = cria();
	t.start();
	const f = t.rt.streamSimple;
	t.start();
	assert.equal(t.rt.streamSimple, f);
	assert.equal(f.original.original, undefined);
});

test("fio: rejeição vira span de erro + registro, sem unhandledRejection", async () => {
	const sem: unknown[] = [];
	const g = (e: unknown) => sem.push(e);
	process.on("unhandledRejection", g);
	try {
		const t = cria();
		t.start();
		t.rt.proximo = () => ({ result: () => Promise.reject(new Error("rede caiu")) });
		t.rt.streamSimple({ provider: "p", id: "m" }, {}, {});
		await tick();
		await tick();
		await t.fim();
		const s = porNome(t.traces(), "chat p/m");
		assert.equal(s.status.code, 2);
		assert.equal(attr(s, "nycode.effort"), "off");
		const l = t.log().filter((x) => x.source === "modelo");
		assert.equal(l.length, 1);
		assert.deepEqual([l[0].severityNumber, l[0]["error.type"], l[0].body], [17, "chamada", "rede caiu"]);
		assert.equal(sem.length, 0);
	} finally {
		process.off("unhandledRejection", g);
	}
});

test("fio: stopReason error registra uma vez mesmo com message_end (qualquer ordem)", async () => {
	for (const antes of [false, true]) {
		const t = cria();
		t.start();
		const msg = {
			role: "assistant",
			stopReason: "error",
			errorMessage: "529 overloaded",
			usage: { input: 1, output: 0, cacheRead: 0 },
		};
		t.rt.proximo = () => ({ result: () => Promise.resolve(msg) });
		if (antes) t.h("message_end", { message: msg });
		t.rt.streamSimple({ provider: "p", id: "m" }, {}, {});
		await tick();
		if (!antes) t.h("message_end", { message: msg });
		assert.equal(t.log().filter((x) => x.source === "modelo").length, 1, `antes=${antes}`);
		await t.fim();
		assert.equal(porNome(t.traces(), "chat p/m").status.code, 2);
	}
});

test("fio: throw síncrono é registrado e relançado igual", async () => {
	const t = cria();
	t.start();
	const erro = new Error("modelo fora da trava");
	t.rt.proximo = () => {
		throw erro;
	};
	assert.throws(
		() => t.rt.stream({ provider: "p", id: "m" }, {}, {}),
		(e) => e === erro,
	);
	await t.fim();
	assert.equal(porNome(t.traces(), "chat p/m").status.code, 2);
	assert.equal(t.log().filter((x) => x["error.type"] === "chamada").length, 1);
});

test("hooks: sink vira evento nycode.hook; sev 9 é quieto, falha avisa", async () => {
	const t = cria({}, {});
	t.start();
	const sink = (globalThis as any)[SINK];
	sink({
		sev: 9,
		fonte: "hook",
		tipo: "hook",
		msg: "h.sh PreToolUse 0 (4 ms)",
		quieto: true,
		dados: { evento: "PreToolUse", comando: "/x/h.sh", code: 0, durMs: 4, timedOut: false },
	});
	assert.deepEqual(t.notices, []);
	sink({
		sev: 13,
		fonte: "hook",
		tipo: "hook",
		msg: "h.sh bloqueou",
		detalhe: "linha1\nlinha2",
		dados: { evento: "PreToolUse", comando: "/x/h.sh", code: 2, durMs: 9, timedOut: false },
	});
	assert.deepEqual(t.notices, [], "sem notify: a falha aparece só no rodapé");
	assert.equal(t.ultimo(), "▲ 1 aviso · ctrl+e abre");
	await t.fim();
	const hooks = t.traces().filter((s: any) => s.name === "nycode.hook PreToolUse");
	assert.equal(hooks.length, 2);
	const falha = hooks.find((s: any) => s.status.code === 2);
	assert.equal(attr(falha, "nycode.hook.exit_code"), 2);
	assert.equal(attr(falha, "nycode.hook.command"), "/x/h.sh");
	assert.equal(attr(falha, "nycode.hook.duration_ms"), 9);
	assert.equal(attr(falha, "nycode.hook.timed_out"), false);
	assert.equal(attr(falha, "nycode.hook.stderr"), "linha1\nlinha2");
	assert.equal(t.log().length, 1); // hook ok fica só na trilha (E2E: o hook Status inundava o diag.jsonl); a falha vai ao registro
});

test("exportador: stderr de hook fica no arquivo local e não vai para a rede", async () => {
	const corpos: string[] = [];
	const fetch = (async (_u: any, init: any) => {
		corpos.push(init.body);
		return { ok: true, status: 200 };
	}) as any;
	const t = cria(
		{ OTEL_EXPORTER_OTLP_ENDPOINT: "http://coletor.local:4318", OTEL_EXPORTER_OTLP_HEADERS: "x-k=v" },
		{ deps: { fetch } },
	);
	t.start();
	(globalThis as any)[SINK]({
		sev: 13,
		fonte: "hook",
		tipo: "hook",
		msg: "falhou",
		detalhe: "STDERR-LOCAL",
		dados: { evento: "Stop", comando: "c", code: 1, durMs: 1, timedOut: false },
	});
	await t.fim();
	assert.ok(corpos.length >= 1);
	assert.ok(!corpos.join("").includes("STDERR-LOCAL"));
	assert.ok(corpos.join("").includes("nycode.hook.exit_code"));
	assert.ok(readFileSync(join(t.d, "diag", "traces.jsonl"), "utf8").includes("STDERR-LOCAL"));
	assert.ok(corpos.join("").includes("sess-1")); // recurso nycode.session.id
});

test("filho: sem UI/comandos/diag.jsonl; relata sev>=13 como TSV em NYCODE_DIAG_INBOX, uma vez por chave; mesmo trace id", async () => {
	const inbox = join(mkdtempSync(join(tmpdir(), "diag-in-")), "inbox.tsv");
	const t = cria(
		{
			NYCODE_SUBAGENT: "1",
			NYCODE_DIAG_INBOX: inbox,
			TRACEPARENT: TP,
			NYCODE_AGENT_HOOKS: JSON.stringify({ agent: "Explore", hooks: {} }),
		},
		{ hasUI: false },
	);
	assert.equal(t.comandos.size, 0);
	t.start();
	const erroTool = {
		toolName: "bash",
		isError: true,
		toolCallId: "x",
		result: { content: [{ type: "text", text: `falhou ${SEGREDO} sk-abcdefghij12345\nlinha\t2` }] },
	};
	t.h("tool_execution_end", erroTool);
	t.h("tool_execution_end", erroTool); // mesma chave: uma linha só
	t.h("message_end", { message: { role: "assistant", stopReason: "error", errorMessage: "529" } });
	t.h("session_compact_failed", { reason: "overflow", willRetry: false, errorMessage: "sem espaço" });
	(globalThis as any)[SINK]({ sev: 9, fonte: "hook", tipo: "hook", msg: "quieto", quieto: true });
	(globalThis as any)[SINK]({ sev: 13, fonte: "hook", tipo: "hook", msg: "hook falhou", detalhe: "x".repeat(5000) });
	const bruto = readFileSync(inbox, "utf8");
	const linhas = bruto.trimEnd().split("\n");
	assert.equal(linhas.length, 4);
	assert.ok(linhas.every((l) => Buffer.byteLength(l) + 1 <= 2048));
	assert.ok(linhas[0]!.startsWith("13\tsub:Explore\ttool:bash\tfalhou "));
	assert.ok(!bruto.includes("sk-abcdefghij12345"));
	assert.ok(bruto.includes("linha\\t2") && !/\t2\n/.test(bruto.split("\n")[0]!));
	const { entradas } = lerCaixa(inbox, 0);
	assert.deepEqual(
		entradas.map((e: any) => [e.sev, e.fonte, e.tipo]),
		[
			[13, "sub:Explore", "tool:bash"],
			[17, "sub:Explore", "modelo:erro"],
			[17, "sub:Explore", "compactação:overflow"],
			[13, "sub:Explore", "hook:hook"],
		],
	);
	assert.equal(entradas[1]!.msg, "529");
	assert.ok(entradas[0]!.detalhe?.includes("\n"));
	assert.deepEqual(t.chamadasUi, []);
	assert.ok(!existsSync(join(t.d, "diag", "diag.jsonl")));
	assert.equal(t.env.TRACEPARENT, TP); // filho não republica
	await t.fim();
	const sp = t.traces();
	assert.ok(sp.length > 0 && sp.every((s: any) => s.traceId === "a".repeat(32)));
	assert.equal(porNome(sp, "nycode").parentSpanId, "b".repeat(16));
	assert.equal(attr(porNome(sp, "session_start"), "nycode.subagent"), true);
});

test("filho sem NYCODE_DIAG_INBOX não escreve nada e sem agente conhecido a fonte é sub", () => {
	const t = cria({ NYCODE_SUBAGENT: "1" }, { hasUI: false });
	t.start();
	t.h("tool_execution_end", { toolName: "bash", isError: true, result: {} });
	assert.ok(!existsSync(join(t.d, "diag", "diag.jsonl")));
	const inbox = join(mkdtempSync(join(tmpdir(), "diag-in-")), "i.tsv");
	const u = cria({ NYCODE_SUBAGENT: "1", NYCODE_DIAG_INBOX: inbox, NYCODE_AGENT_HOOKS: "lixo" }, { hasUI: false });
	u.start();
	u.h("tool_execution_end", { toolName: "bash", isError: true, result: {} });
	assert.match(readFileSync(inbox, "utf8"), /^13\tsub\ttool:bash\t/);
});

test("pai lê a caixa quando a ferramenta termina (falha de subagente aparece ao voltar)", () => {
	const inbox = join(mkdtempSync(join(tmpdir(), "diag-in-")), "inbox.tsv");
	writeFileSync(inbox, "");
	const t = cria({ NYCODE_DIAG_INBOX: inbox });
	t.start();
	writeFileSync(inbox, "17\tsub:Plan\ttool:bash\tfalhou no filho\n");
	t.h("tool_execution_end", { toolName: "subagent", isError: false, toolCallId: "z", result: {} });
	assert.deepEqual(t.notices, []);
	assert.equal(t.ultimo(), "✕ 1 erro · ctrl+e abre");
});

test("rodapé: info não conta, aviso e erro contam, limpar zera e abrir marca como visto", async () => {
	const t = cria();
	t.start();
	const cmd = t.comandos.get("diagnostico");
	t.ui.notify("só info", "info");
	assert.equal(t.ultimo(), undefined);
	t.ui.notify("atenção", "warning");
	assert.equal(t.ultimo(), "▲ 1 aviso · ctrl+e abre");
	t.ui.notify("falha", "error");
	assert.equal(t.ultimo(), "✕ 1 erro · ▲ 1 aviso · ctrl+e abre");
	await cmd.handler("limpar", t.ctx);
	assert.equal(t.ultimo(), undefined);
	assert.equal(t.ui.painel, undefined);
	t.ui.notify("falha 2", "error");
	assert.equal(t.ultimo(), "✕ 1 erro · ctrl+e abre");
	await cmd.handler("", t.ctx); // abrir o painel marca tudo como visto
	assert.equal(t.ultimo(), "diagnóstico: 1");
	await cmd.handler("eventos", t.ctx);
	assert.equal(t.ui.painel.aba, "eventos");
	assert.match(t.ui.painel.render(100)[0], /eventos/);
});

test("hooks quietos e chamadas de modelo bem-sucedidas não entram no rodapé", async () => {
	const t = cria();
	t.start();
	(globalThis as any)[SINK]({ sev: 9, fonte: "hook", tipo: "hook", msg: "h ok", quieto: true });
	assert.equal(t.ultimo(), undefined);
	t.rt.proximo = () => ({
		result: () => Promise.resolve({ stopReason: "stop", usage: { input: 5, output: 2, cacheRead: 0 } }),
	});
	t.rt.streamSimple({ provider: "p", id: "m" }, {}, { reasoning: "low" });
	await tick();
	assert.equal(t.ultimo(), undefined);
	assert.equal(t.widgets.length, 0, "não há faixa acima do editor");
});

test("/doctor: popula a aba saúde; sem UI imprime pelo log original", async () => {
	const t = cria();
	t.start();
	const doc = t.comandos.get("doctor");
	assert.match(doc.description, /^Verifica a saúde do nycode/);
	await t.comandos.get("diagnostico").handler("", t.ctx);
	t.ui.painel.handleInput("\t"); // problemas -> eventos
	t.ui.painel.handleInput("\t"); // eventos -> saúde
	assert.equal(t.ui.painel.aba, "saúde");
	assert.ok(t.ui.painel.render(100).join("\n").includes("rode /doctor"));
	await doc.handler("", t.ctx);
	assert.equal(t.ui.painel.aba, "saúde");
	const out = t.ui.painel.render(100);
	assert.match(out[1], /^ (✕ \d+ erros? · ▲ \d+ avisos? · ✓ \d+ ok|✓ \d+ verificaç(ão|ões), nenhum problema) *$/); // resumo fixo no topo
	assert.ok(!out.join("\n").includes("rode /doctor"));
	const s = cria({}, { hasUI: false });
	s.start();
	await s.comandos.get("doctor").handler("", s.ctx);
	assert.match(s.logs.at(-1)!, /^\d+ erros? · \d+ avisos? · \d+ ok$/);
});

test("filho sem hooks: nome do agente vem do registro do fleet do nycode", () => {
	const fleet = mkdtempSync(join(tmpdir(), "diag-fleet-"));
	writeFileSync(join(fleet, "fg-abc123.json"), JSON.stringify({ v: 1, id: "fg-abc123", agent: "general-purpose" }));
	const inbox = join(mkdtempSync(join(tmpdir(), "diag-in-")), "i.tsv");
	const u = cria(
		{ NYCODE_SUBAGENT: "1", NYCODE_DIAG_INBOX: inbox, NYCODE_FLEET_DIR: fleet, NYCODE_FLEET_RUN_ID: "fg-abc123" },
		{ hasUI: false },
	);
	u.start();
	u.h("tool_execution_end", { toolName: "bash", isError: true, result: {} });
	assert.match(readFileSync(inbox, "utf8"), /^13\tsub:general-purpose\ttool:bash\t/);
	// id fora do formato não é usado como caminho
	const inbox2 = join(mkdtempSync(join(tmpdir(), "diag-in-")), "i.tsv");
	const v = cria(
		{ NYCODE_SUBAGENT: "1", NYCODE_DIAG_INBOX: inbox2, NYCODE_FLEET_DIR: fleet, NYCODE_FLEET_RUN_ID: "../fg-abc123" },
		{ hasUI: false },
	);
	v.start();
	v.h("tool_execution_end", { toolName: "bash", isError: true, result: {} });
	assert.match(readFileSync(inbox2, "utf8"), /^13\tsub\ttool:bash\t/);
});

test("L7: span chat registra cache_creation (total e 1h)", async () => {
	const t = cria();
	t.start();
	t.rt.proximo = () => ({
		result: () =>
			Promise.resolve({
				stopReason: "stop",
				usage: { input: 1, output: 2, cacheRead: 3, cacheWrite: 40, cacheWrite1h: 15 },
			}),
	});
	t.rt.streamSimple({ provider: "anthropic", id: "opus" }, {}, {});
	await tick();
	await t.fim();
	const s = porNome(t.traces(), "chat anthropic/opus");
	assert.equal(attr(s, "gen_ai.usage.cache_creation.input_tokens"), 40);
	assert.equal(attr(s, "nycode.usage.cache_creation_1h.input_tokens"), 15);
});

test("L6: span nycode.hook mede a duração real do hook (início recuado, fim agora)", async () => {
	const t = cria();
	t.start();
	(globalThis as any)[SINK]({
		sev: 9,
		fonte: "hook",
		tipo: "hook",
		msg: "Status · s.sh · ok · 250 ms",
		quieto: true,
		dados: { evento: "Status", comando: "/x/s.sh", code: 0, durMs: 250, timedOut: false },
	});
	await t.fim();
	const s = porNome(t.traces(), "nycode.hook Status");
	assert.equal(Number(BigInt(s.endTimeUnixNano) - BigInt(s.startTimeUnixNano)) / 1e6, 250);
});
