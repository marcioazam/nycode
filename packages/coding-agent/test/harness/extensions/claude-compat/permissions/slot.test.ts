import assert from "node:assert/strict";
import { test } from "vitest";
import { createController } from "../../../../../src/extensions/claude-compat/permissions/controller.ts";
import {
	getPlanControl,
	PLAN_CONTROLLER_SLOT,
} from "../../../../../src/extensions/claude-compat/permissions/plan-bridge.ts";
import {
	cyclePermissionMode,
	getPermissionModes,
	PERMISSION_MODES_SLOT,
	registerPermissionModes,
} from "../../../../../src/extensions/claude-compat/permissions/slot.ts";
import { installPermissionModes, sinkFor } from "../../../../../src/extensions/claude-compat/permissions/wiring.ts";

const g = globalThis as Record<symbol, unknown>;
const api = () => {
	const c = createController({}, () => undefined);
	return { current: c.current, cycle: c.cycle, select: c.select, setBypass: c.setBypass, status: c.status };
};

test("slot: valida formato, registra e remove só o próprio", () => {
	delete g[PERMISSION_MODES_SLOT];
	assert.equal(getPermissionModes(), undefined);
	assert.equal(cyclePermissionMode(), undefined);
	g[PERMISSION_MODES_SLOT] = { current: () => "default" }; // formato inválido
	assert.equal(getPermissionModes(), undefined);
	delete g[PERMISSION_MODES_SLOT];
	const a = api();
	const offA = registerPermissionModes(a);
	assert.equal(getPermissionModes(), a);
	assert.equal(cyclePermissionMode()?.ok, true);
	const b = api();
	const offB = registerPermissionModes(b);
	offA(); // controlador antigo encerrando depois do novo: não remove o novo
	assert.equal(getPermissionModes(), b);
	offB();
	assert.equal(getPermissionModes(), undefined);
});

test("slot rejeita API sem setBypass", () => {
	delete g[PERMISSION_MODES_SLOT];
	const { setBypass: _s, ...semBypass } = api();
	g[PERMISSION_MODES_SLOT] = semBypass;
	assert.equal(getPermissionModes(), undefined);
	delete g[PERMISSION_MODES_SLOT];
});

test("cyclePermissionMode converte exceção em erro explícito", () => {
	const off = registerPermissionModes({
		...api(),
		cycle: () => {
			throw new Error("quebrou");
		},
	});
	const r = cyclePermissionMode();
	assert.equal(r?.ok, false);
	assert.match((r as { error: string }).error, /quebrou/);
	off();
});

test("plan-bridge: valida o slot do nycode e os tipos devolvidos", () => {
	delete g[PLAN_CONTROLLER_SLOT];
	assert.equal(getPlanControl(), undefined);
	g[PLAN_CONTROLLER_SLOT] = { active: () => "sim", set: () => 1 };
	const p = getPlanControl()!;
	assert.throws(() => p.active(), /boolean/);
	assert.equal(p.set(true), false);
	g[PLAN_CONTROLLER_SLOT] = { active: () => true, set: () => true };
	assert.equal(getPlanControl()!.active(), true);
	g[PLAN_CONTROLLER_SLOT] = { active: 1 };
	assert.equal(getPlanControl(), undefined);
	delete g[PLAN_CONTROLLER_SLOT];
});

test("wiring: sessão nova assume o slot; shutdown remove só o próprio e solta o listener", () => {
	delete g[PERMISSION_MODES_SLOT];
	const make = () => {
		const handlers: Record<string, Array<(...a: unknown[]) => unknown>> = {};
		let listener: ((d: unknown) => void) | undefined;
		let removed = 0;
		const nycode = {
			on: (e: string, f: (...a: unknown[]) => unknown) => {
				handlers[e] ??= [];
				handlers[e].push(f);
			},
			events: {
				on: (_c: string, f: (d: unknown) => void) => {
					listener = f;
					return () => {
						removed++;
					};
				},
			},
		};
		const env: NodeJS.ProcessEnv = {};
		const controller = installPermissionModes(nycode as never, env);
		return { handlers, listener: () => listener!, removed: () => removed, env, controller };
	};
	const old = make();
	const fresh = make(); // reload: a instância nova registra antes do shutdown da antiga
	const slotBefore = getPermissionModes();
	assert.ok(slotBefore);
	void old.handlers.session_shutdown[0]();
	assert.equal(old.removed(), 1);
	assert.equal(getPermissionModes(), slotBefore, "o slot da instância nova permanece");
	fresh.listener()({ active: true }); // sem controle semântico: usa a dica
	assert.equal(fresh.env.NYCODE_PERMISSION_MODE, "plan");
	fresh.listener()({ active: "x" });
	assert.equal(fresh.env.NYCODE_PERMISSION_MODE, "plan");
	void fresh.handlers.session_start[0]({}, { hasUI: false });
	void fresh.handlers.session_shutdown[0]();
	assert.equal(getPermissionModes(), undefined);
});

test("sinkFor: sem UI não há sink; com contexto antigo as chamadas não lançam", () => {
	assert.equal(sinkFor({ hasUI: false } as never), undefined);
	const calls: unknown[] = [];
	const ctx = {
		hasUI: true,
		ui: {
			notify: () => {
				throw new Error("stale");
			},
			setStatus: (...a: unknown[]) => calls.push(a),
			theme: { fg: (_c: string, t: string) => `<${t}>` },
		},
	};
	const s = sinkFor(ctx as never)!;
	s.notify("x", "info");
	// Partes tipadas: antes status(texto, perigo); agora cada parte leva o tipo que escolhe a cor.
	s.status([{ tipo: "bypass", texto: "⚠ bypass ligado" }]);
	s.status(undefined);
	assert.deepEqual(calls[0], ["permission-mode", process.env.NO_COLOR ? "⚠ bypass ligado" : "<⚠ bypass ligado>"]);
	assert.deepEqual(calls[1], ["permission-mode", undefined]);
});
