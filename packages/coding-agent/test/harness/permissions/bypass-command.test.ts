// Wave 9 bypass: orthogonal to the permission modes (K11, core/permissions). Ported from bypass-permissions/test/index.test.ts.
import assert from "node:assert/strict";
import { Key } from "@nycode/tui";
import { afterEach, beforeEach, test } from "vitest";
import bypass from "../../../src/core/permissions/bypass-command.ts";

const VAR = "NYCODE_BYPASS_PERMISSIONS";
const SLOT = Symbol.for("nycode.permission-modes");
const g = globalThis as Record<symbol, unknown>;
const orig = { env: process.env[VAR], noColor: process.env.NO_COLOR, hadSlot: SLOT in g, slot: g[SLOT] };
const restore = (k: string, v: string | undefined) => {
	if (v === undefined) delete process.env[k];
	else process.env[k] = v;
};

beforeEach(() => {
	delete process.env[VAR];
	delete process.env.NO_COLOR;
	delete g[SLOT];
});
afterEach(() => {
	restore(VAR, orig.env);
	restore("NO_COLOR", orig.noColor);
	if (orig.hadSlot) g[SLOT] = orig.slot;
	else delete g[SLOT];
});

type Status = [string, string | undefined];
function ctxFalso(hasUI = true) {
	const notifs: Array<[string, string]> = [];
	const statuses: Status[] = [];
	const fgCalls: Array<[string, string]> = [];
	const ctx: any = {
		hasUI,
		ui: {
			notify: (m: string, l: string) => notifs.push([m, l]),
			setStatus: (k: string, v: string | undefined) => statuses.push([k, v]),
			theme: {
				fg: (c: string, t: string) => {
					fgCalls.push([c, t]);
					return `<${c}>${t}</${c}>`;
				},
			},
		},
	};
	return { ctx, notifs, statuses, fgCalls };
}

function inicia() {
	const handlers = new Map<string, (...a: any[]) => any>();
	const bus = new Map<string, Array<(d: unknown) => void>>();
	const commands = new Map<string, any>();
	const shortcuts = new Map<string, any>();
	const api: any = {
		on: (n: string, h: any) => handlers.set(n, h),
		events: { on: (n: string, h: any) => bus.set(n, [...(bus.get(n) ?? []), h]) },
		registerCommand: (n: string, o: any) => commands.set(n, o),
		registerShortcut: (k: string, o: any) => shortcuts.set(k, o),
	};
	bypass(api);
	return {
		handlers,
		bus,
		commands,
		shortcuts,
		cmd: (args: string | undefined, ctx: any) => commands.get("bypass").handler(args, ctx),
		plan: (active: unknown) => {
			for (const h of bus.get("nycode:plan-mode") ?? []) h({ active });
		},
	};
}

// Controlador falso: o bypass é ortogonal ao modo; setBypass registra [on, opts] e só muda o estado se result.ok.
function controlador(bypass: boolean, result: { ok: boolean } = { ok: true }, mode = "default") {
	const selects: Array<[boolean, unknown]> = [];
	const c = {
		setBypass: (on: boolean, o?: unknown) => {
			selects.push([on, o]);
			if (result.ok) bypass = on;
			return result;
		},
		select: () => ({ ok: true }),
		status: () => ({ mode, bypass }),
	};
	g[SLOT] = c;
	return { c, selects };
}

const MSG_ON = "Bypass ligado: o nycode age sem perguntar (bloqueios catastróficos continuam) · /bypass off desliga";
const MSG_OFF = "Bypass desligado: o nycode volta a perguntar";
const WARN = `${process.env.NYCODE_ASCII_ICONS || ["dumb", "linux"].includes(process.env.TERM ?? "") ? "!" : "▲"} bypass ligado`; // onda 12, D4: sem emoji

test("registro: comando bypass, Ctrl+Shift+B, session_start e canal do plan mode", () => {
	const r = inicia();
	assert.deepEqual([...r.commands.keys()], ["bypass"]);
	assert.match(r.commands.get("bypass").description, /Bypass Permissions/);
	assert.deepEqual([...r.shortcuts.keys()], [Key.ctrlShift("b")]);
	assert.ok(r.handlers.has("session_start"));
	assert.equal(r.bus.get("nycode:plan-mode")?.length, 1);
});

test("sem controlador: /bypass on e off gravam o env, notificam com nível e pintam o status", async () => {
	const r = inicia();
	const { ctx, notifs, statuses } = ctxFalso();
	await r.cmd("on", ctx);
	assert.equal(process.env[VAR], "1");
	assert.deepEqual(notifs.at(-1), [MSG_ON, "warning"]);
	assert.deepEqual(statuses.at(-1), ["bypass-permissions", `<error>${WARN}</error>`]);
	await r.cmd("  OFF ", ctx); // trim + caixa
	assert.equal(process.env[VAR], "0");
	assert.deepEqual(notifs.at(-1), [MSG_OFF, "info"]);
	assert.deepEqual(statuses.at(-1), ["bypass-permissions", undefined]);
	assert.equal(notifs.length, 2);
});

test("sem controlador: status só informa, sem mudar env nem status; aceita true/yes/on", async () => {
	const r = inicia();
	const { ctx, notifs, statuses } = ctxFalso();
	await r.cmd("status", ctx);
	assert.deepEqual(notifs.pop(), ["Bypass desligado · /bypass on liga", "info"]);
	for (const v of ["true", "ON", "Yes", "1"]) {
		process.env[VAR] = v;
		await r.cmd("status", ctx);
		assert.deepEqual(notifs.pop(), ["Bypass ligado · /bypass off desliga", "info"], v);
	}
	for (const v of ["0", "false", "", "talvez"]) {
		process.env[VAR] = v;
		await r.cmd("status", ctx);
		assert.equal(notifs.pop()?.[0], "Bypass desligado · /bypass on liga", v);
	}
	assert.equal(process.env[VAR], "talvez");
	assert.equal(statuses.length, 0);
});

test("toggle: sem argumento (undefined) e argumento desconhecido alternam; atalho também", async () => {
	const r = inicia();
	const { ctx } = ctxFalso();
	await r.cmd(undefined, ctx);
	assert.equal(process.env[VAR], "1");
	await r.cmd("qualquer", ctx);
	assert.equal(process.env[VAR], "0");
	await r.cmd("", ctx);
	assert.equal(process.env[VAR], "1");
	await r.shortcuts.get(Key.ctrlShift("b")).handler(ctx);
	assert.equal(process.env[VAR], "0");
	await r.shortcuts.get(Key.ctrlShift("b")).handler(ctx);
	assert.equal(process.env[VAR], "1");
});

test("session_start renderiza o estado vindo do env: ligado mostra aviso, desligado limpa", async () => {
	const r = inicia();
	const { ctx, statuses } = ctxFalso();
	process.env[VAR] = "1";
	await r.handlers.get("session_start")!({}, ctx);
	process.env[VAR] = "0";
	await r.handlers.get("session_start")!({}, ctx);
	assert.deepEqual(statuses, [
		["bypass-permissions", `<error>${WARN}</error>`],
		["bypass-permissions", undefined],
	]);
});

test("headless: env muda, mas sem notify nem setStatus", async () => {
	const r = inicia();
	const { ctx, notifs, statuses } = ctxFalso(false);
	await r.handlers.get("session_start")!({}, ctx);
	await r.cmd("on", ctx);
	assert.equal(process.env[VAR], "1");
	await r.cmd("off", ctx);
	assert.equal(process.env[VAR], "0");
	assert.deepEqual([notifs, statuses], [[], []]);
});

test('NO_COLOR: texto puro, sem chamar o tema vermelho; sem NO_COLOR usa fg("error")', async () => {
	const r = inicia();
	process.env.NO_COLOR = "1";
	const a = ctxFalso();
	await r.cmd("on", a.ctx);
	assert.deepEqual(a.statuses.at(-1), ["bypass-permissions", WARN]);
	assert.deepEqual(a.fgCalls, []);
	delete process.env.NO_COLOR;
	const b = ctxFalso();
	await r.cmd("on", b.ctx);
	assert.deepEqual(b.fgCalls, [["error", WARN]]);
});

test("slot inválido (não objeto, select/status ausentes ou não funções) cai no env", async () => {
	const r = inicia();
	for (const slot of [
		null,
		"x",
		7,
		{},
		{ setBypass() {} },
		{ status() {} },
		{ setBypass: 1, status: () => ({ bypass: true }) },
	]) {
		g[SLOT] = slot;
		process.env[VAR] = "0";
		const { ctx, notifs } = ctxFalso();
		await r.cmd("on", ctx);
		assert.equal(process.env[VAR], "1", JSON.stringify(slot));
		assert.equal(notifs.at(-1)?.[0], MSG_ON);
	}
});

test("controlador válido: setBypass recebe on/off e explicit:true; sem env, sem notify próprio, status do slot limpo", async () => {
	process.env[VAR] = "0";
	const { c, selects } = controlador(false);
	const r = inicia();
	const { ctx, notifs, statuses } = ctxFalso();
	await r.cmd("on", ctx);
	await r.cmd("off", ctx);
	assert.deepEqual(selects, [
		[true, { explicit: true }],
		[false, { explicit: true }],
	]);
	assert.equal(process.env[VAR], "0"); // o controlador mantém as variáveis; a extensão não as toca
	assert.deepEqual(notifs, []);
	assert.deepEqual(statuses, [
		["bypass-permissions", undefined],
		["bypass-permissions", undefined],
	]); // sem status duplicado
	assert.equal(c.status().bypass, false);
});

test("controlador: /bypass on em Auto e /bypass off mantêm o modo (só setBypass, nunca select)", async () => {
	const { c, selects } = controlador(false, { ok: true }, "acceptEdits");
	let selectCalls = 0;
	c.select = () => {
		selectCalls++;
		return { ok: true };
	};
	const r = inicia();
	const { ctx } = ctxFalso();
	await r.cmd("on", ctx);
	await r.cmd("off", ctx);
	assert.deepEqual(selects, [
		[true, { explicit: true }],
		[false, { explicit: true }],
	]);
	assert.equal(selectCalls, 0);
	assert.equal(c.status().mode, "acceptEdits");
});

test("controlador: toggle e status seguem o bypass do controlador, não o env", async () => {
	process.env[VAR] = "1";
	const a = controlador(false);
	const r = inicia();
	const { ctx, notifs } = ctxFalso();
	await r.cmd("status", ctx);
	assert.equal(notifs.pop()?.[0], "Bypass desligado · /bypass on liga");
	await r.cmd(undefined, ctx);
	assert.deepEqual(a.selects.at(-1), [true, { explicit: true }]);
	const b = controlador(true);
	process.env[VAR] = "0";
	await r.cmd("status", ctx);
	assert.equal(notifs.pop()?.[0], "Bypass ligado · /bypass off desliga");
	await r.shortcuts.get(Key.ctrlShift("b")).handler(ctx);
	assert.deepEqual(b.selects.at(-1), [false, { explicit: true }]);
});

test("controlador com setBypass falho: nenhum sucesso fabricado (sem notify, env intacto, status limpo)", async () => {
	process.env[VAR] = "0";
	const { selects } = controlador(false, { ok: false });
	const r = inicia();
	const { ctx, notifs, statuses } = ctxFalso();
	await r.cmd("on", ctx);
	assert.equal(selects.length, 1);
	assert.equal(process.env[VAR], "0");
	assert.deepEqual(notifs, []);
	assert.deepEqual(statuses, [["bypass-permissions", undefined]]);
	await r.cmd("status", ctx); // continua desligado: o modo real manda
	assert.equal(notifs.pop()?.[0], "Bypass desligado · /bypass on liga");
});

test("plan mode sem controlador: restaura o bypass que estava ligado ao sair, com motivo", async () => {
	const r = inicia();
	const { ctx, notifs } = ctxFalso();
	await r.cmd("on", ctx);
	notifs.length = 0;
	r.plan(true);
	process.env[VAR] = "0"; // o plan mode desliga durante o plano
	r.plan(false);
	assert.equal(process.env[VAR], "1");
	assert.deepEqual(notifs, [[`${MSG_ON} (restaurado ao sair do plan mode)`, "warning"]]);
});

test("plan mode: seguro (safe) nunca vira bypass ao sair", async () => {
	const r = inicia();
	const { ctx, notifs } = ctxFalso();
	await r.cmd("off", ctx); // registra lastCtx
	notifs.length = 0;
	r.plan(true);
	r.plan(false);
	assert.equal(process.env[VAR], "0");
	assert.deepEqual(notifs, []);
	// sem lastCtx, env ausente: também nada
	delete process.env[VAR];
	const r2 = inicia();
	r2.plan(true);
	r2.plan(false);
	assert.equal(process.env[VAR], undefined);
});

test("plan mode: opt-in feito durante o plano é mantido, sem notificação de restauração", async () => {
	const r = inicia();
	const { ctx, notifs } = ctxFalso();
	await r.cmd("off", ctx);
	r.plan(true);
	await r.cmd("on", ctx);
	notifs.length = 0;
	r.plan(false);
	assert.equal(process.env[VAR], "1");
	assert.deepEqual(notifs, []);
});

test("plan mode: ligado e ainda ligado ao sair não notifica; evento repetido não regrava o estado prévio", async () => {
	const r = inicia();
	const { ctx, notifs } = ctxFalso();
	await r.cmd("on", ctx);
	notifs.length = 0;
	r.plan(true);
	r.plan(true); // repetido: não é nova entrada
	r.plan(false);
	r.plan(false); // repetido: não é nova saída
	assert.deepEqual(notifs, []);
	// entrada duplicada com bypass já desligado não apaga o "estava ligado"
	r.plan(true);
	process.env[VAR] = "0";
	r.plan(true);
	r.plan(false);
	assert.equal(process.env[VAR], "1");
});

test("plan mode: payload inválido é ignorado e não altera o estado", async () => {
	const r = inicia();
	const { ctx, notifs } = ctxFalso();
	await r.cmd("on", ctx);
	notifs.length = 0;
	for (const bad of [undefined, null, "true", 1, {}]) for (const h of r.bus.get("nycode:plan-mode") ?? []) h(bad);
	r.plan(true);
	for (const bad of [{ active: "false" }, { active: 0 }]) for (const h of r.bus.get("nycode:plan-mode") ?? []) h(bad);
	process.env[VAR] = "0";
	r.plan(false);
	assert.equal(process.env[VAR], "1"); // saída real ainda restaura: payloads inválidos não encerraram o plano
});

test("plan mode com controlador: a extensão não chama setBypass nem mexe no env", async () => {
	const { selects } = controlador(false);
	const r = inicia();
	process.env[VAR] = "0";
	r.plan(true);
	r.plan(false);
	assert.deepEqual(selects, []);
	assert.equal(process.env[VAR], "0");
});
