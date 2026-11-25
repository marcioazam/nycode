// node --experimental-strip-types --test extensions/claude-compat/permissions/test/*.test.ts

import assert from "node:assert/strict";
import { test } from "vitest";
import { createController, type Sink } from "../../../../../src/extensions/claude-compat/permissions/controller.ts";
import { nextMode, parseMode } from "../../../../../src/extensions/claude-compat/permissions/modes.ts";
import type { PlanControl } from "../../../../../src/extensions/claude-compat/permissions/plan-bridge.ts";
import { COR, sinkFor } from "../../../../../src/extensions/claude-compat/permissions/wiring.ts";

function fakePlan(initial = false, opts: { refuse?: boolean; throws?: boolean } = {}) {
	let active = initial;
	const calls: boolean[] = [];
	const ctl: PlanControl = {
		active: () => active,
		set: (e) => {
			calls.push(e);
			if (opts.throws) throw new Error("boom");
			if (opts.refuse) return false;
			active = e;
			return true;
		},
	};
	return {
		ctl,
		calls,
		flip: (v: boolean) => {
			active = v;
		},
	};
}

function sink() {
	const notes: Array<[string, string]> = [];
	const status: Array<string | undefined> = [];
	const s: Sink = {
		notify: (m, l) => notes.push([m, l]),
		status: (p) => status.push(p?.map((x) => `${x.tipo}:${x.texto}`).join(" | ")),
	};
	return { s, notes, status };
}

const env = (e: Record<string, string> = {}): NodeJS.ProcessEnv => ({ ...e });

test("parseMode: aliases ask/auto, bypassPermissions legado distinto e erro explícito", () => {
	assert.deepEqual(parseMode("Manual"), { ok: true, mode: "default" });
	assert.deepEqual(parseMode("ask"), { ok: true, mode: "default" });
	assert.deepEqual(parseMode("acceptEdits"), { ok: true, mode: "acceptEdits" });
	assert.deepEqual(parseMode("AUTO"), { ok: true, mode: "acceptEdits" });
	assert.deepEqual(parseMode("plan"), { ok: true, mode: "plan" });
	assert.deepEqual(parseMode("bypassPermissions"), { ok: true, bypass: true });
	assert.equal(parseMode("dontAsk").ok, false);
	assert.equal(parseMode(undefined).ok, false);
	assert.deepEqual(
		["default", "acceptEdits", "plan"].map((m) => nextMode(m as never)),
		["acceptEdits", "plan", "default"],
	);
});

test("largada: --safe vence ambiente antigo; bypass só com disponibilidade; plan nunca vem do ambiente", () => {
	const safe = env({
		NYCODE_BYPASS_ELIGIBLE: "0",
		NYCODE_PERMISSION_MODE: "bypassPermissions",
		NYCODE_BYPASS_PERMISSIONS: "1",
	});
	const a = createController(safe, () => undefined);
	assert.equal(a.current(), "default");
	assert.equal(a.status().bypass, false);
	assert.equal(safe.NYCODE_PERMISSION_MODE, "default");
	assert.equal(safe.NYCODE_BYPASS_PERMISSIONS, "0");
	const bypass = env({ NYCODE_BYPASS_ELIGIBLE: "1", NYCODE_BYPASS_PERMISSIONS: "1" });
	const b = createController(bypass, () => undefined);
	assert.equal(b.current(), "default"); // bypass é ortogonal: não vira modo
	assert.equal(b.status().bypass, true);
	assert.equal(bypass.NYCODE_PERMISSION_MODE, "default");
	assert.equal(bypass.NYCODE_BYPASS_PERMISSIONS, "1");
	const stale = env({ NYCODE_PERMISSION_MODE: "plan" });
	assert.equal(createController(stale, () => undefined).current(), "default");
	assert.equal(createController(env({ NYCODE_PERMISSION_MODE: "lixo" }), () => undefined).current(), "default");
	assert.equal(
		createController(env({ NYCODE_PERMISSION_MODE: "acceptEdits" }), () => undefined).current(),
		"acceptEdits",
	);
	assert.equal(createController(env({ NYCODE_PERMISSION_MODE: "auto" }), () => undefined).current(), "acceptEdits");
	assert.equal(createController(env({ NYCODE_PERMISSION_MODE: "ask" }), () => undefined).current(), "default");
});

test("legado: NYCODE_PERMISSION_MODE=bypassPermissions = default + bypass (se disponível); modo e bypass combinam", () => {
	const e = env({ NYCODE_BYPASS_ELIGIBLE: "1", NYCODE_PERMISSION_MODE: "bypassPermissions" });
	const c = createController(e, () => undefined);
	assert.equal(c.current(), "default");
	assert.equal(c.status().bypass, true);
	assert.equal(e.NYCODE_PERMISSION_MODE, "default");
	assert.equal(e.NYCODE_BYPASS_PERMISSIONS, "1");
	const opt = env({ NYCODE_BYPASS_OPTIN: "1", NYCODE_PERMISSION_MODE: "bypassPermissions" });
	assert.equal(createController(opt, () => undefined).status().bypass, true);
	const both = env({
		NYCODE_BYPASS_ELIGIBLE: "1",
		NYCODE_BYPASS_PERMISSIONS: "1",
		NYCODE_PERMISSION_MODE: "acceptEdits",
	});
	const d = createController(both, () => undefined);
	assert.deepEqual([d.current(), d.status().bypass], ["acceptEdits", true]);
	const none = env({ NYCODE_PERMISSION_MODE: "bypassPermissions" }); // sem disponibilidade
	assert.equal(createController(none, () => undefined).status().bypass, false);
	assert.equal(none.NYCODE_BYPASS_PERMISSIONS, "0");
});

test("compatibilidade de bootstrap: NYCODE_BYPASS_PERMISSIONS legado liga o bypass; --safe explícito vence", () => {
	const inherited = env({ NYCODE_BYPASS_PERMISSIONS: "1" });
	const c = createController(inherited, () => undefined);
	assert.equal(c.current(), "default");
	assert.equal(inherited.NYCODE_BYPASS_PERMISSIONS, "1");
	assert.equal(c.status().bypass, true);
	assert.equal(c.status().bypassAvailable, true);
	const safe = createController(env({ NYCODE_BYPASS_PERMISSIONS: "1", NYCODE_BYPASS_ELIGIBLE: "0" }), () => undefined);
	assert.equal(safe.status().bypass, false);
});

test("modo inválido falha fechado em default; o bypass segue o ambiente, não o modo inválido", () => {
	for (const bad of ["junk", "Plano", "bypass"]) {
		const e = env({ NYCODE_BYPASS_ELIGIBLE: "1", NYCODE_BYPASS_PERMISSIONS: "1", NYCODE_PERMISSION_MODE: bad });
		const c = createController(e, () => undefined);
		assert.equal(c.current(), "default", bad);
		assert.equal(c.status().bypass, true);
		assert.equal(e.NYCODE_BYPASS_PERMISSIONS, "1");
		const off = env({ NYCODE_BYPASS_ELIGIBLE: "1", NYCODE_PERMISSION_MODE: bad });
		assert.equal(createController(off, () => undefined).status().bypass, false);
	}
	for (const empty of ["", "   "]) {
		const c = createController(
			env({ NYCODE_BYPASS_PERMISSIONS: "1", NYCODE_PERMISSION_MODE: empty }),
			() => undefined,
		);
		assert.deepEqual([c.current(), c.status().bypass], ["default", true]);
	}
});

test("ciclo default→acceptEdits→plan→default com plan real; nunca passa por bypass; env acompanha", () => {
	const e = env({ NYCODE_BYPASS_ELIGIBLE: "1" });
	const plan = fakePlan();
	const c = createController(e, () => plan.ctl);
	const seen: string[] = [];
	for (let i = 0; i < 4; i++) {
		assert.equal(c.cycle().ok, true);
		seen.push(e.NYCODE_PERMISSION_MODE!);
	}
	assert.deepEqual(seen, ["acceptEdits", "plan", "default", "acceptEdits"]);
	assert.deepEqual(plan.calls, [true, false]);
	assert.equal(c.status().bypass, false);
	assert.equal(e.NYCODE_BYPASS_PERMISSIONS, "0");
});

test("bypass ligado + select(plan) mantém o bypass e o env 1; sair do plano restaura o modo com bypass igual", () => {
	const e = env({ NYCODE_BYPASS_ELIGIBLE: "1" });
	const plan = fakePlan();
	const c = createController(e, () => plan.ctl);
	c.select("acceptEdits");
	assert.equal(c.setBypass(true).ok, true);
	assert.equal(c.select("plan").ok, true);
	assert.deepEqual([e.NYCODE_PERMISSION_MODE, e.NYCODE_BYPASS_PERMISSIONS, c.status().bypass], ["plan", "1", true]);
	assert.equal(c.select("default").ok, true); // sai do plano pelo select
	assert.deepEqual([e.NYCODE_PERMISSION_MODE, e.NYCODE_BYPASS_PERMISSIONS], ["default", "1"]);
	c.select("acceptEdits");
	plan.flip(true); // entrada externa
	c.reconcile();
	assert.deepEqual([e.NYCODE_PERMISSION_MODE, e.NYCODE_BYPASS_PERMISSIONS], ["plan", "1"]);
	plan.flip(false);
	c.reconcile();
	assert.deepEqual(
		[e.NYCODE_PERMISSION_MODE, e.NYCODE_BYPASS_PERMISSIONS, c.status().bypass],
		["acceptEdits", "1", true],
	);
	// bypass ligado/desligado durante o plano não é desfeito pela restauração
	plan.flip(true);
	c.reconcile();
	assert.equal(c.setBypass(false).ok, true);
	plan.flip(false);
	c.reconcile();
	assert.deepEqual([e.NYCODE_PERMISSION_MODE, e.NYCODE_BYPASS_PERMISSIONS], ["acceptEdits", "0"]);
});

test("--safe: setBypass sem disponibilidade falha; select(bypassPermissions) idem; ciclo segue sem bypass", () => {
	const e = env({ NYCODE_BYPASS_ELIGIBLE: "0" });
	const plan = fakePlan();
	const c = createController(e, () => plan.ctl);
	c.cycle();
	c.cycle();
	assert.equal(c.cycle().ok && e.NYCODE_PERMISSION_MODE, "default");
	assert.equal(e.NYCODE_BYPASS_PERMISSIONS, "0");
	assert.equal(c.setBypass(true).ok, false);
	assert.equal(c.select("bypassPermissions").ok, false);
	assert.equal(e.NYCODE_BYPASS_PERMISSIONS, "0");
	assert.equal(c.status().bypassAvailable, false);
	assert.equal(c.setBypass(false).ok, true); // desligar sempre vale
});

test("opt-in explícito vale na sessão, propaga ao filho; /bypass off mantém o modo", () => {
	const e = env({ NYCODE_BYPASS_ELIGIBLE: "0" });
	const c = createController(e, () => undefined);
	c.select("acceptEdits");
	const r = c.setBypass(true, { explicit: true });
	assert.deepEqual(r, { ok: true, mode: "acceptEdits", bypass: true });
	assert.equal(e.NYCODE_BYPASS_PERMISSIONS, "1");
	assert.equal(e.NYCODE_BYPASS_OPTIN, "1");
	assert.equal(e.NYCODE_BYPASS_ELIGIBLE, "0");
	assert.equal(e.NYCODE_PERMISSION_MODE, "acceptEdits");
	const child = createController({ ...e }, () => undefined);
	assert.deepEqual([child.current(), child.status().bypass], ["acceptEdits", true]);
	assert.equal(c.setBypass(false, { explicit: true }).ok, true);
	assert.deepEqual([e.NYCODE_PERMISSION_MODE, e.NYCODE_BYPASS_PERMISSIONS], ["acceptEdits", "0"]);
	const legacy = createController(env(), () => undefined);
	assert.equal(legacy.select("bypassPermissions", { explicit: true }).ok, true);
	assert.equal(legacy.status().bypass, true);
	assert.equal(legacy.current(), "default");
});

test("plan indisponível ou recusado: erro explícito e nada muda", () => {
	const e = env();
	const s = sink();
	const c = createController(e, () => undefined);
	c.bind(s.s);
	const r = c.select("plan");
	assert.equal(r.ok, false);
	assert.match((r as { error: string }).error, /indisponível/);
	assert.equal(e.NYCODE_PERMISSION_MODE, "default");
	assert.equal(s.notes.at(-1)![1], "error");
	for (const opts of [{ refuse: true }, { throws: true }]) {
		const e2 = env();
		const p = fakePlan(false, opts);
		const c2 = createController(e2, () => p.ctl);
		assert.equal(c2.select("plan").ok, false);
		assert.equal(e2.NYCODE_PERMISSION_MODE, "default");
	}
});

test("saída externa do plan restaura o modo anterior; bypass inalterado", () => {
	const e = env({ NYCODE_BYPASS_ELIGIBLE: "0" });
	const plan = fakePlan();
	const c = createController(e, () => plan.ctl);
	c.select("acceptEdits");
	plan.flip(true);
	c.reconcile();
	assert.equal(e.NYCODE_PERMISSION_MODE, "plan");
	plan.flip(false);
	c.reconcile();
	assert.equal(e.NYCODE_PERMISSION_MODE, "acceptEdits");
	assert.equal(e.NYCODE_BYPASS_PERMISSIONS, "0");
	plan.flip(true);
	assert.equal(c.current(), "plan");
	plan.flip(false);
	assert.equal(c.current(), "acceptEdits");
});

test("sem controle semântico o controlador usa a dica do evento", () => {
	const e2 = env();
	const c2 = createController(e2, () => undefined);
	c2.reconcile(true);
	assert.equal(e2.NYCODE_PERMISSION_MODE, "plan");
	c2.reconcile(false);
	assert.equal(e2.NYCODE_PERMISSION_MODE, "default");
	c2.reconcile(undefined);
	assert.equal(e2.NYCODE_PERMISSION_MODE, "default");
});

test("troca interna não é reprocessada pelo evento do plan mode (reentrância)", () => {
	const e = env();
	let c!: ReturnType<typeof createController>;
	let active = false;
	const ctl: PlanControl = {
		active: () => active,
		set: (v) => {
			active = v;
			c.reconcile(v);
			return true;
		},
	};
	c = createController(e, () => ctl);
	const s = sink();
	c.bind(s.s);
	assert.equal(c.select("plan").ok, true);
	assert.equal(s.notes.filter(([m]) => /Modo de permissão: Plan/.test(m)).length, 1);
	assert.equal(c.select("acceptEdits").ok, true);
	assert.equal(e.NYCODE_PERMISSION_MODE, "acceptEdits");
});

test("plan controller ilegível não altera o estado", () => {
	const e = env({ NYCODE_PERMISSION_MODE: "acceptEdits" });
	const bad: PlanControl = {
		active: () => {
			throw new Error("x");
		},
		set: () => true,
	};
	const c = createController(e, () => bad);
	assert.equal(c.current(), "acceptEdits");
});

test("plan controller ilegível não altera o estado", () => {
	const e = env({ NYCODE_PERMISSION_MODE: "acceptEdits" });
	const bad: PlanControl = {
		active: () => {
			throw new Error("x");
		},
		set: () => true,
	};
	const c = createController(e, () => bad);
	assert.equal(c.current(), "acceptEdits");
});

test("select(auto) = acceptEdits; modos inválidos: erro honesto, sem mudança", () => {
	const e = env();
	const s = sink();
	const c = createController(e, () => undefined);
	c.bind(s.s);
	assert.equal(c.select("auto").ok, true);
	assert.equal(e.NYCODE_PERMISSION_MODE, "acceptEdits");
	assert.equal(c.select("xyz").ok, false);
	assert.equal(e.NYCODE_PERMISSION_MODE, "acceptEdits");
	assert.equal(c.status().label, "Auto");
});

// Modo sempre visível junto ao bypass. Antes: `⏵⏵ auto on` e/ou o bypass, e Ask limpava a linha.
// Agora cada parte leva o tipo (a UI pinta ask verde, auto azul, plan roxo, bypass vermelho) e Ask aparece como `⏵ ask`.
test("status da UI: o modo sempre aparece (ask, auto) e o bypass junto; sem segredos", () => {
	const e = env({ NYCODE_BYPASS_ELIGIBLE: "1", ANTHROPIC_API_KEY: "segredo-nao-vazar" });
	const s = sink();
	const c = createController(e, () => undefined);
	c.bind(s.s);
	c.select("acceptEdits");
	c.setBypass(true);
	c.select("default");
	c.setBypass(false);
	const tail = s.status.slice(-4);
	const asc = process.env.NYCODE_ASCII_ICONS || ["dumb", "linux"].includes(process.env.TERM ?? "");
	const w = `bypass:${asc ? "!" : "▲"} bypass ligado`; // onda 12, D4: sem emoji
	const [auto, ask] = asc ? [">> auto", "> ask"] : ["⏵⏵ auto", "⏵ ask"];
	assert.deepEqual(tail, [
		`acceptEdits:${auto}`,
		`acceptEdits:${auto} | ${w}`,
		`default:${ask} | ${w}`,
		`default:${ask}`,
	]);
	assert.equal(JSON.stringify([s.notes, s.status]).includes("segredo-nao-vazar"), false);
	c.dispose();
	c.select("acceptEdits"); // sem sink: não lança
});

// Cores dos modos: ask verde (success), auto azul (accent), plan roxo (bashMode), bypass vermelho (error).
test("sinkFor: pinta cada parte com a cor do modo e junta com · em dim", async () => {
	let visto: string | undefined = "x";
	const ctx = {
		hasUI: true,
		ui: {
			notify() {},
			setStatus: (_k: string, v: string | undefined) => {
				visto = v;
			},
			theme: { fg: (c: string, t: string) => `<${c}>${t}</>` },
		},
	};
	const s = sinkFor(ctx as never)!;
	const cor = process.env.NO_COLOR;
	delete process.env.NO_COLOR;
	try {
		s.status([
			{ tipo: "plan", texto: "⏸ plan" },
			{ tipo: "bypass", texto: "▲ bypass ligado" },
		]);
		assert.equal(visto, "<bashMode>⏸ plan</><dim> · </><error>▲ bypass ligado</>");
		s.status([{ tipo: "default", texto: "⏵ ask" }]);
		assert.equal(visto, "<success>⏵ ask</>");
		s.status([{ tipo: "acceptEdits", texto: "⏵⏵ auto" }]);
		assert.equal(visto, "<accent>⏵⏵ auto</>");
		s.status(undefined);
		assert.equal(visto, undefined);
		assert.deepEqual(COR, { default: "success", acceptEdits: "accent", plan: "bashMode", bypass: "error" });
	} finally {
		if (cor !== undefined) process.env.NO_COLOR = cor;
	}
});
