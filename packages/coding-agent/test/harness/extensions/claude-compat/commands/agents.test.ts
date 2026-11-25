// node --experimental-strip-types --test extensions/claude-compat/commands/test/agents.test.ts
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "vitest";
import {
	defaultConsult,
	MAX_CHARS,
	parseSpec,
	registerAdvisor,
	runAdvisor,
	TOOL,
} from "../../../../../src/extensions/claude-compat/commands/agents/advisor.ts";
import {
	listAgentsText,
	readAgentDefs,
	registerListing,
} from "../../../../../src/extensions/claude-compat/commands/agents/listing.ts";
import { parseInterval, registerLoop } from "../../../../../src/extensions/claude-compat/commands/agents/loop.ts";
import { mkCtx, tmp } from "./helpers.ts";

function reg(extra: object = {}) {
	const commands: Record<string, any> = {};
	const handlers: Record<string, any> = {};
	const tools: any[] = [];
	const sent: any[] = [];
	let active = ["read"];
	const nycode: any = {
		registerCommand: (n: string, o: any) => {
			commands[n] = o;
		},
		on: (e: string, h: any) => {
			handlers[e] = h;
		},
		registerTool: (t: any) => tools.push(t),
		appendEntry: () => {},
		getActiveTools: () => active,
		setActiveTools: (n: string[]) => {
			active = n;
		},
		sendUserMessage: (t: string, o?: unknown) => sent.push([t, o]),
		...extra,
	};
	return { nycode, commands, handlers, tools, sent, active: () => active };
}

const USAGE = {
	input: 11,
	output: 7,
	cacheRead: 0,
	cacheWrite: 0,
	totalTokens: 18,
	cost: { input: 0.01, output: 0.02, cacheRead: 0, cacheWrite: 0, total: 0.03 },
};
const reply = (o: object = {}) =>
	({ content: [{ type: "text", text: "resposta" }], usage: USAGE, stopReason: "stop", ...o }) as any;
const REG: any = {
	find: (p: string, id: string) => (p === "p" && id === "m" ? { provider: p, id } : undefined),
	complete: async () => reply(),
};
const SPEC = { provider: "p", id: "m" };

test("advisor: uso/custo da resposta vai no ToolResult (sucesso)", async () => {
	const seen: any[] = [];
	const out = await runAdvisor(SPEC, "devo?", undefined, REG, async (s, q, sig) => {
		seen.push([s, q, sig instanceof AbortSignal]);
		return reply();
	});
	assert.equal(out.content[0]!.text, "resposta");
	assert.deepEqual(out.usage, USAGE);
	assert.equal((out as any).isError, undefined);
	assert.deepEqual(seen, [[SPEC, "devo?", true]]);
});

test("advisor: stopReason error/aborted do provedor vira erro e PRESERVA o uso consumido", async () => {
	const err = await runAdvisor(SPEC, "q", undefined, REG, async () =>
		reply({ stopReason: "error", errorMessage: "529 overloaded", content: [] }),
	);
	assert.equal((err as any).isError, true);
	assert.match(err.content[0]!.text, /529 overloaded/);
	assert.deepEqual(err.usage, USAGE);
	const ab = await runAdvisor(SPEC, "q", undefined, REG, async () => reply({ stopReason: "aborted" }));
	assert.equal((ab as any).isError, true);
	assert.match(ab.content[0]!.text, /aborted/);
	assert.deepEqual(ab.usage, USAGE);
	const empty = await runAdvisor(SPEC, "q", undefined, REG, async () =>
		reply({ content: [{ type: "thinking", thinking: "x" }] }),
	);
	assert.match(empty.content[0]!.text, /vazia/);
	assert.deepEqual(empty.usage, USAGE);
});

test("advisor: pergunta longa é recusada sem enviar; vazia e sem modelo também", async () => {
	let called = 0;
	const consult = async () => {
		called++;
		return reply();
	};
	const long = await runAdvisor(SPEC, "x".repeat(MAX_CHARS + 1), undefined, REG, consult);
	assert.match(long.content[0]!.text, /excede o limite de 20000.*nada foi enviado/);
	assert.equal((await runAdvisor(SPEC, "x".repeat(MAX_CHARS), undefined, REG, consult)).content[0]!.text, "resposta");
	assert.equal(called, 1);
	assert.match((await runAdvisor(SPEC, "  ", undefined, REG, consult)).content[0]!.text, /vazia/);
	assert.match((await runAdvisor(undefined, "q", undefined, REG, consult)).content[0]!.text, /Nenhum advisor/);
	assert.equal(called, 1);
});

test("advisor: prazo e cancelamento do chamador chegam ao transporte como AbortSignal", async () => {
	const waits = (sig: AbortSignal) =>
		new Promise<never>((_, rej) => sig.addEventListener("abort", () => rej(new Error("abortado"))));
	const slow = await runAdvisor(SPEC, "q", undefined, REG, async (_s, _q, sig) => waits(sig), 20);
	assert.match(slow.content[0]!.text, /excedeu o prazo/);
	const ctrl = new AbortController();
	const p = runAdvisor(SPEC, "q", ctrl.signal, REG, async (_s, _q, sig) => waits(sig), 5000);
	ctrl.abort();
	assert.match((await p).content[0]!.text, /cancelado pelo usuário/);
	// provedor devolve 'aborted' por causa do prazo: usa o texto do prazo e mantém o uso
	const dl = await runAdvisor(
		SPEC,
		"q",
		undefined,
		REG,
		async (_s, _q, sig) => {
			await new Promise((r) => sig.addEventListener("abort", r));
			return reply({ stopReason: "aborted" });
		},
		20,
	);
	assert.match(dl.content[0]!.text, /prazo/);
	assert.deepEqual(dl.usage, USAGE);
	const generic = await runAdvisor(SPEC, "q", undefined, REG, async () => {
		throw new Error("rede");
	});
	assert.match(generic.content[0]!.text, /advisor falhou: rede/);
	assert.equal(generic.usage, undefined);
	const str = await runAdvisor(SPEC, "q", undefined, REG, async () => {
		throw "texto";
	});
	assert.match(str.content[0]!.text, /texto/);
});

test("advisor: transporte padrão usa modelRegistry.find/complete; modelo ausente é erro", async () => {
	const calls: any[] = [];
	const reg: any = {
		find: REG.find,
		complete: async (m: any, ctx: any, o: any) => {
			calls.push([m, ctx.messages[0].content[0].text, o.signal instanceof AbortSignal]);
			return reply();
		},
	};
	const ok = await defaultConsult(SPEC, "oi", new AbortController().signal, reg);
	assert.equal(ok.usage, USAGE);
	assert.deepEqual(calls, [[SPEC, "oi", true]]);
	await assert.rejects(
		defaultConsult({ provider: "x", id: "y" }, "oi", new AbortController().signal, reg),
		/indisponível/,
	);
});

test("advisor: registro — ferramenta inativa sem modelo, /advisor valida, ativa, persiste, restaura e desliga", async () => {
	const r = reg();
	let seenReg: unknown;
	registerAdvisor(r.nycode, async (_s, _q, _sig, registry) => {
		seenReg = registry;
		return reply();
	});
	assert.equal(r.tools[0].defaultActive, false);
	assert.equal(r.tools[0].parameters.required[0], "question");
	const c = mkCtx();
	await r.commands.advisor.handler("", c.ctx);
	assert.match(c.last(), /desligado/);
	await r.commands.advisor.handler("semBarra", c.ctx);
	await r.commands.advisor.handler("x/y", c.ctx);
	assert.equal(c.notes.at(-1)!.t, "error");
	assert.deepEqual(r.active(), ["read"]);
	const tctx = { modelRegistry: REG };
	assert.match(
		(await r.tools[0].execute("1", { question: "q" }, undefined, undefined, tctx)).content[0].text,
		/Nenhum advisor/,
	);
	await r.commands.advisor.handler("p/m", c.ctx);
	assert.deepEqual(r.active(), ["read", TOOL]);
	await r.commands.advisor.handler("", c.ctx);
	assert.match(c.last(), /p\/m/);
	const out = await r.tools[0].execute("1", { question: "devo?" }, undefined, undefined, tctx);
	assert.equal(out.content[0].text, "resposta");
	assert.deepEqual(out.usage, USAGE);
	assert.equal(seenReg, REG);
	assert.match((await r.tools[0].execute("1", {}, undefined, undefined, tctx)).content[0].text, /vazia/);
	const r2 = reg();
	registerAdvisor(r2.nycode, async () => reply());
	await r2.handlers.session_start(
		{},
		{
			sessionManager: {
				getEntries: () => [{ type: "custom", customType: "claude-advisor", data: { model: "p/m" } }],
			},
		},
	);
	assert.deepEqual(r2.active(), ["read", TOOL]);
	await r.commands.advisor.handler("off", c.ctx);
	assert.deepEqual(r.active(), ["read"]);
	await r.handlers.session_start(
		{},
		{
			sessionManager: {
				getEntries: () => [{ type: "custom", customType: "claude-advisor", data: { model: null } }],
			},
		},
	);
	assert.deepEqual(r.active(), ["read"]);
	assert.deepEqual(parseSpec("a/b:c"), { provider: "a", id: "b:c" });
});

function fakeClock() {
	const timers: { fn: () => void; ms: number; id: number; live: boolean }[] = [];
	return {
		timers,
		setTimeout: (fn: () => void, ms: number) => {
			timers.push({ fn, ms, id: timers.length, live: true });
			return timers.length - 1;
		},
		clearTimeout: (id: unknown) => {
			timers[id as number]!.live = false;
		},
	};
}

test("loop: intervalo mínimo, limites, só dispara ocioso, para em plan mode/stop/shutdown", async () => {
	assert.equal(parseInterval("5m"), 300_000);
	assert.equal(parseInterval("abc"), undefined);
	const clock = fakeClock();
	let plan = false;
	const r = reg();
	registerLoop(r.nycode, () => plan, clock as any);
	let idle = true;
	const c = mkCtx();
	c.ctx.isIdle = () => idle;
	const h = r.commands.loop.handler;
	await h("30s oi", c.ctx);
	await h("5m --max 99 oi", c.ctx);
	await h("xx oi", c.ctx);
	assert.equal(r.sent.length, 0);
	await h("2m --max 2 verifique", c.ctx);
	assert.deepEqual(r.sent, [["verifique", undefined]]); // 1ª execução imediata, sem expandir comandos
	assert.equal(clock.timers[0]!.ms, 120_000);
	idle = false;
	clock.timers[0]!.fn(); // vence ocupado: espera settle
	assert.equal(r.sent.length, 1);
	idle = true;
	await r.handlers.agent_settled({}, c.ctx);
	assert.equal(r.sent.length, 2);
	assert.match(c.notes.at(-1)!.m, /limite/);
	await h("", c.ctx);
	assert.match(c.last(), /Uso/);
	// plan mode
	plan = true;
	await h("2m x", c.ctx);
	assert.match(c.last(), /Plan mode/);
	plan = false;
	await h("2m x", c.ctx);
	const n = r.sent.length;
	plan = true;
	clock.timers.at(-1)!.fn();
	assert.equal(r.sent.length, n);
	assert.match(c.last(), /plan mode/);
	plan = false;
	await h("2m y", c.ctx);
	await h("stop", c.ctx);
	assert.equal(clock.timers.at(-1)!.live, false);
	await h("2m z", c.ctx);
	await r.handlers.session_shutdown();
	assert.equal(clock.timers.at(-1)!.live, false);
});

test("list-agents sem diretório fixo lista os agentes que o subagent resolve (embutidos e do projeto)", async () => {
	const cwd = tmp();
	mkdirSync(join(cwd, ".nycode", "agents"), { recursive: true });
	writeFileSync(join(cwd, ".nycode", "agents", "local.md"), "---\nname: local-x\ndescription: do projeto\n---\ncorpo");
	const r = reg();
	registerListing(r.nycode);
	const c = mkCtx({ cwd });
	await r.commands["list-agents"].handler("", c.ctx);
	assert.match(c.last(), /^\s+Explore\b/m);
	assert.match(c.last(), /local-x — do projeto/);
});

test("list-agents lê definições sem executar nada; /stop só aborta se ocupado; fleet ausente informado", async () => {
	const dir = join(tmp(), "agents");
	mkdirSync(dir);
	writeFileSync(join(dir, "a.md"), '---\nname: alfa\ndescription: "faz x"\nmodel: m1\n---\ncorpo');
	writeFileSync(join(dir, "b.md"), "sem frontmatter");
	const defs = readAgentDefs(dir);
	assert.deepEqual(
		defs.map((d) => d.name),
		["alfa", "b"],
	);
	assert.match(listAgentsText(defs, undefined), /alfa \[m1\] — faz x[\s\S]*controle indisponível/);
	assert.match(listAgentsText(defs, { list: () => [{ id: "1", status: "running", secret: "x" }] }), /"id":"1"/);
	assert.doesNotMatch(listAgentsText(defs, { list: () => [{ id: "1", secret: "x" }] }), /secret/);
	const r = reg();
	registerListing(r.nycode, dir);
	const idle = mkCtx();
	await r.commands.stop.handler("", idle.ctx);
	assert.match(idle.last(), /Nada em execução/);
	const busy = mkCtx({ idle: false });
	await r.commands.stop.handler("", busy.ctx);
	assert.deepEqual(busy.calls, ["abort"]);
	await r.commands.stop.handler("agents", busy.ctx);
	assert.match(busy.last(), /indisponível/);
	await r.commands.stop.handler("tudo", busy.ctx);
	assert.equal(busy.notes.at(-1)!.t, "error");
});
