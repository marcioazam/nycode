import assert from "node:assert/strict";
import { afterEach, test } from "vitest";
import * as m from "../../../../src/extensions/travar-modelos/index.ts";

const SINK = Symbol.for("nycode:diag");
const A = { provider: "p", id: "a" };
const B = { provider: "o", id: "x/y" };
const C = { provider: "q", id: "c" };
const TODOS = [A, B, C];
afterEach(() => delete (globalThis as any)[SINK]);

function cria(env: Record<string, string | undefined> = {}, modeloAtual: any = A, nivel = "high") {
	const handlers = new Map<string, any>();
	const comandos = new Map<string, any>();
	const estado = { modelo: modeloAtual, nivel };
	const chamadas: any[] = [];
	const nycode: any = {
		on: (n: string, h: any) => handlers.set(n, h),
		registerCommand: (n: string, c: any) => comandos.set(n, c),
		getThinkingLevel: () => estado.nivel,
		setThinkingLevel: (l: string) => {
			chamadas.push(["nivel", l]);
			estado.nivel = l;
		},
		setModel: async (mo: any) => {
			chamadas.push(["modelo", `${mo.provider}/${mo.id}`]);
			estado.modelo = mo;
			return true;
		},
	};
	const rt: any = { calls: [] as any[] };
	rt.streamSimple = (...a: any[]) => {
		rt.calls.push(["ss", ...a]);
		return "ss";
	};
	rt.stream = (...a: any[]) => {
		rt.calls.push(["s", ...a]);
		return "s";
	};
	const status: any[] = [];
	const avisos: Array<[string, string]> = [];
	const ui = {
		notify: (t: string, k: string) => avisos.push([t, k]),
		setStatus: (_k: string, t?: string) => status.push(t),
		theme: { fg: (_c: string, s: string) => s },
	};
	const registry = {
		runtime: rt,
		find: (p: string, id: string) => TODOS.find((x) => x.provider === p && x.id === id),
		getAvailable: () => TODOS,
	};
	const ctx: any = {
		hasUI: true,
		ui,
		modelRegistry: registry,
		get model() {
			return estado.modelo;
		},
	};
	m.montar(nycode, { env });
	const h = (n: string, ...a: any[]) => handlers.get(n)(...a);
	return {
		nycode,
		rt,
		ctx,
		env,
		estado,
		chamadas,
		status,
		avisos,
		handlers,
		comandos,
		h,
		start: (c = ctx) => h("session_start", {}, c),
		cmd: (a: string, c = ctx) => comandos.get("travar-modelos").handler(a, c),
	};
}
const LOCK = (models: any) => JSON.stringify({ version: 1, models });

test("sem trava: repassa com os mesmos argumentos", () => {
	const t = cria();
	t.start();
	const ctxArg = {},
		opts = { reasoning: "max" };
	assert.equal(t.rt.streamSimple(B, ctxArg, opts), "ss");
	assert.equal(t.rt.calls[0][1], B);
	assert.equal(t.rt.calls[0][2], ctxArg);
	assert.equal(t.rt.calls[0][3], opts);
	assert.equal(t.rt.stream(B, ctxArg, opts), "s");
	assert.equal(t.chamadas.length, 0);
});

test("trava do ambiente (filho sem UI): troca o proibido e deixa o permitido", () => {
	const recebidos: any[] = [];
	(globalThis as any)[SINK] = (x: any) => recebidos.push(x);
	const t = cria({ NYCODE_SUBAGENT: "1", NYCODE_MODEL_LOCK: LOCK({ "p/a": ["low"], "q/c": ["medium", "high"] }) });
	const semUi = { ...t.ctx, hasUI: false };
	t.start(semUi);
	t.rt.streamSimple(B, {}, { reasoning: "high", apiKey: "k" });
	const [, modelo, , o] = t.rt.calls[0];
	assert.equal(modelo, A); // preferido = ctx.model (p/a)
	assert.deepEqual(o, { reasoning: "low", apiKey: "k" });
	const ok = { reasoning: "low" };
	t.rt.streamSimple(A, {}, ok);
	assert.equal(t.rt.calls[1][3], ok);
	t.rt.streamSimple(B, {}, { reasoning: "high" });
	assert.equal(recebidos.length, 1);
	assert.deepEqual(recebidos[0], {
		sev: 13,
		fonte: "travar-modelos",
		tipo: "troca",
		msg: "o/x/y · high → p/a · low",
		quieto: false,
	});
	t.rt.streamSimple(B, {}, undefined);
	assert.equal(recebidos.length, 2);
	assert.equal(t.rt.calls[3][3].reasoning, "low"); // off pedido, menor permitido
});

test("só o esforço fora: ajusta e mantém o modelo; off vira undefined", () => {
	const t = cria({ NYCODE_MODEL_LOCK: LOCK({ "p/a": ["medium"] }) });
	t.start();
	t.rt.streamSimple(A, {}, { reasoning: "max" });
	assert.equal(t.rt.calls[0][1], A);
	assert.equal(t.rt.calls[0][3].reasoning, "medium");
	const t2 = cria({ NYCODE_MODEL_LOCK: LOCK({ "p/a": ["off", "low"] }) });
	t2.start();
	t2.rt.streamSimple(A, {}, { reasoning: "minimal" });
	assert.equal(t2.rt.calls[0][3].reasoning, undefined);
});

test("stream cru: modelo fora lança, dentro passa", () => {
	const t = cria({ NYCODE_MODEL_LOCK: LOCK({ "p/a": ["low"] }) });
	t.start();
	assert.throws(() => t.rt.stream(B, {}, {}), /o\/x\/y não está na trava/);
	const o = {};
	assert.equal(t.rt.stream(A, {}, o), "s");
	assert.equal(t.rt.calls[0][3], o);
});

test("NYCODE_MODEL_LOCK inválido: falha fechada", () => {
	const t = cria({ NYCODE_MODEL_LOCK: "{x" });
	t.start();
	assert.throws(() => t.rt.streamSimple(A, {}, {}), /NYCODE_MODEL_LOCK inválido/);
	assert.throws(() => t.rt.stream(A, {}, {}), /nenhuma chamada de modelo/);
	assert.equal(t.rt.calls.length, 0);
});

test("embrulha uma vez só", () => {
	const t = cria();
	t.start();
	const f = t.rt.streamSimple;
	t.start();
	assert.equal(t.rt.streamSimple, f);
	assert.equal(typeof f.original, "function");
	assert.equal(f.original.original, undefined);
});

test("comando com argumentos: env, setModel, setThinkingLevel e status", async () => {
	const t = cria({}, B, "xhigh");
	t.start();
	await t.cmd("p/a:low,medium q/c:high");
	assert.deepEqual(JSON.parse(t.env.NYCODE_MODEL_LOCK!), {
		version: 1,
		models: { "p/a": ["low", "medium"], "q/c": ["high"] },
	});
	assert.deepEqual(t.chamadas, [
		["modelo", "p/a"],
		["nivel", "medium"],
	]);
	assert.equal(t.status.at(-1), "2 modelos travados");
	assert.match(t.avisos.at(-1)![0], /^\u2063\u2063Modelos travados nesta sessão:/); // marca de caixa de aviso; invisível sem o patch do core
});

test("comando: modelo desconhecido e erro de sintaxe não aplicam nada", async () => {
	const t = cria();
	t.start();
	await t.cmd("zz/nao:low");
	assert.equal(t.avisos.at(-1)![1], "error");
	await t.cmd("p/a");
	assert.match(t.avisos.at(-1)![0], /uso: \/travar-modelos/);
	assert.equal(t.env.NYCODE_MODEL_LOCK, undefined);
	assert.equal(t.status.length, 0);
});

test("off remove env e status e volta ao repasse", async () => {
	const t = cria();
	t.start();
	await t.cmd("p/a:low");
	assert.ok(t.env.NYCODE_MODEL_LOCK);
	await t.cmd("off");
	assert.equal(t.env.NYCODE_MODEL_LOCK, undefined);
	assert.equal(t.status.at(-1), undefined);
	assert.equal(t.avisos.at(-1)![0], "Trava de modelos desligada.");
	const o = { reasoning: "max" };
	t.rt.streamSimple(B, {}, o);
	assert.equal(t.rt.calls[0][1], B);
	assert.equal(t.rt.calls[0][3], o);
});

test("show e sem argumentos sem UI", async () => {
	const t = cria();
	await t.cmd("show");
	assert.equal(t.avisos.at(-1)![0], "Sem trava de modelos nesta sessão.");
	await t.cmd("", { ...t.ctx, hasUI: false });
	assert.equal(t.avisos.at(-1)![1], "error");
});

test("model_select para modelo proibido é desfeito com aviso, sem recursão", async () => {
	const t = cria({ NYCODE_MODEL_LOCK: LOCK({ "p/a": ["high"] }) });
	t.start();
	// simula o nycode: setModel dispara model_select
	const setOrig = t.nycode.setModel;
	t.nycode.setModel = async (mo: any) => {
		const r = await setOrig(mo);
		await t.h("model_select", { model: mo, previousModel: B, source: "set" }, t.ctx);
		return r;
	};
	t.estado.modelo = B;
	await t.h("model_select", { model: B, previousModel: A, source: "cycle" }, t.ctx);
	assert.deepEqual(t.chamadas, [["modelo", "p/a"]]);
	assert.equal(t.estado.modelo, A);
	assert.match(t.avisos.at(-1)![0], /não é permitido nesta sessão; voltei para p\/a · high/);
	assert.equal(t.avisos.at(-1)![1], "warning");
});

test("thinking_level_select fora da lista é desfeito", async () => {
	const t = cria({ NYCODE_MODEL_LOCK: LOCK({ "p/a": ["low", "high"] }) }, A, "low");
	t.start();
	t.estado.nivel = "minimal";
	await t.h("thinking_level_select", { level: "minimal", previousLevel: "low" }, t.ctx);
	assert.deepEqual(t.chamadas, [["nivel", "low"]]);
});

test("tool_call: bash com NYCODE_MODEL_LOCK só é bloqueado com a trava", async () => {
	const t = cria();
	const ev = { toolName: "bash", input: { command: "unset NYCODE_MODEL_LOCK; nycode" } };
	assert.equal(t.h("tool_call", ev, t.ctx), undefined);
	await t.cmd("p/a:low");
	assert.equal(t.h("tool_call", ev, t.ctx).block, true);
	assert.equal(t.h("tool_call", { toolName: "run", input: { x: "NYCODE_MODEL_LOCK=" } }, t.ctx).block, true);
	assert.equal(t.h("tool_call", { toolName: "bash", input: { command: "ls" } }, t.ctx), undefined);
	assert.equal(t.h("tool_call", { toolName: "read", input: { path: "NYCODE_MODEL_LOCK" } }, t.ctx), undefined);
});

test("trava do ambiente no session_start ajusta o próprio modelo", async () => {
	const t = cria({ NYCODE_MODEL_LOCK: LOCK({ "q/c": ["medium"] }) }, A, "high");
	await t.start();
	assert.deepEqual(t.chamadas, [
		["modelo", "q/c"],
		["nivel", "medium"],
	]);
	assert.equal(t.status.at(-1), "1 modelo travado");
});

test("reload: a instância nova troca o embrulho da antiga, sem empilhar", () => {
	const env = { NYCODE_MODEL_LOCK: LOCK({ "p/a": ["low"] }) };
	const velho = cria(env);
	velho.start();
	const antigo = velho.rt.streamSimple;
	Object.defineProperty(velho.ctx, "modelRegistry", {
		get() {
			throw new Error("ctx is stale");
		},
	});
	const handlers = new Map<string, any>();
	m.montar(
		{
			on: (n: string, h: any) => handlers.set(n, h),
			registerCommand: () => {},
			getThinkingLevel: () => "low",
			setThinkingLevel: () => {},
			setModel: async () => true,
		} as never,
		{ env },
	);
	const registry = {
		runtime: velho.rt,
		find: (p: string, id: string) => TODOS.find((x) => x.provider === p && x.id === id),
	};
	handlers.get("session_start")({}, { hasUI: false, modelRegistry: registry, model: A });
	assert.notEqual(velho.rt.streamSimple, antigo);
	assert.equal(velho.rt.streamSimple.original, antigo.original);
	assert.equal(velho.rt.streamSimple(B, {}, { reasoning: "high" }), "ss"); // avaliador do /goal logo após o reload
	assert.equal(velho.rt.calls[0][1], A);
});

test("contexto vencido (reload, compactação): o modelo da trava já visto continua resolvendo", () => {
	const t = cria({ NYCODE_MODEL_LOCK: LOCK({ "p/a": ["low"] }) });
	t.start();
	t.rt.streamSimple(A, {}, { reasoning: "low" }); // o chat usa o modelo da trava
	Object.defineProperty(t.ctx, "modelRegistry", {
		get() {
			throw new Error("ctx is stale");
		},
	});
	assert.equal(t.rt.streamSimple(B, {}, { reasoning: "high" }), "ss"); // avaliador do /goal, modelo fora da trava
	assert.equal(t.rt.calls[1][1], A);
});
