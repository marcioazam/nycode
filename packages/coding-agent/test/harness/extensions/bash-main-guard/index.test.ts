// bash-main-guard: the main interactive session never blocks (ported from the wave 9 bash-timeout test; the 600/1800 policy is the core's K8).
import assert from "node:assert/strict";
import { test } from "vitest";
import type { ExtensionAPI } from "../../../../src/core/extensions/types.ts";
import { waitsInForeground } from "../../../../src/extensions/bash-main-guard/espera.ts";
import ext, { decide, MAIN_WAIT_S } from "../../../../src/extensions/bash-main-guard/index.ts";

type Handler = (event: unknown, ctx: unknown) => { block?: boolean; reason?: string } | undefined;

function run(
	toolName: string,
	input: Record<string, unknown>,
	ctx: unknown = undefined,
	env: Record<string, string | undefined> = {},
	settings: unknown = {},
) {
	let handler: Handler | undefined;
	ext(
		{
			getSettings: () => settings,
			on: (name: string, h: Handler) => {
				if (name === "tool_call") handler = h;
			},
		} as unknown as ExtensionAPI,
		env,
	);
	const out = handler?.({ toolName, input }, ctx);
	return { out, input };
}

test("decide: sem timeout vale o padrão; acima do teto recusa e aponta para run start", () => {
	const lim = { def: 120, max: 600 };
	assert.deepEqual(decide(undefined, lim), { timeout: 120 });
	assert.deepEqual(decide(-1, lim), { timeout: 120 });
	assert.deepEqual(decide(300, lim), { timeout: 300 });
	const d = decide(601, lim);
	assert.ok("deny" in d && /run start/.test(d.deny));
});

test("só mexe em bash e run", () => {
	const { out, input } = run("read", { path: "x" }, { hasUI: true });
	assert.equal(out, undefined);
	assert.deepEqual(input, { path: "x" });
});

// Sessão principal interativa: nada pode prender o turno enquanto o usuário espera.
// Números: Claude Code usa 120 s de padrão e 600 s de teto no Bash em primeiro plano; Codex devolve o controle em até 30 s.
const UI = { hasUI: true };

test("sessão principal: padrão 120 s e teto 600 s; acima do teto aponta para run start", () => {
	assert.equal(run("bash", { command: "make" }, UI).input.timeout, 120);
	assert.equal(run("bash", { command: "make", timeout: 600 }, UI).input.timeout, 600);
	const { out } = run("bash", { command: "make", timeout: 601 }, UI);
	assert.equal(out?.block, true);
	assert.match(out?.reason ?? "", /run start.*await: true/);
});

test("subagente e modo sem UI mantêm 600 s / 1800 s e podem dormir", () => {
	for (const [ctx, env] of [
		[UI, { NYCODE_SUBAGENT_DEPTH: "1" }],
		[{ hasUI: false }, {}],
		[undefined, {}],
	] as const) {
		assert.equal(run("bash", { command: "make" }, ctx, env).input.timeout, undefined);
		assert.equal(run("bash", { command: "sleep 240; ls", timeout: 900 }, ctx, env).out, undefined);
		assert.equal(run("run", { action: "wait", id: "r1", timeout_s: 900 }, ctx, env).input.timeout_s, 900);
	}
});

test("espera em primeiro plano: sleep de 30 s ou mais, ou laço de consulta com sleep", () => {
	for (const c of [
		'sleep 240; cd x && python3 -c "1"',
		"make && sleep 30",
		"sleep 1m",
		"sleep 0.5h",
		"sleep 20; sleep 15",
		"while ! test -f x; do sleep 2; done",
		"until curl -sf localhost; do\n  sleep 1\ndone",
		"(sleep 45)",
		"timeout 100 sleep 60",
	])
		assert.equal(waitsInForeground(c), true, c);
	for (const c of [
		"sleep 5; ls",
		"sleep 29",
		'rg "sleep 240" src',
		"echo sleep 600",
		"for f in a b; do sleep 1; done",
		"git log --grep=sleep",
		"ls",
	])
		assert.equal(waitsInForeground(c), false, c);
});

test("sessão principal: bash que espera é recusado com o caminho certo; o input não muda", () => {
	const { out, input } = run("bash", { command: "sleep 240; python3 x.py" }, UI);
	assert.equal(out?.block, true);
	assert.match(out?.reason ?? "", /run start/);
	assert.match(out?.reason ?? "", /await: true/);
	assert.equal(input.timeout, undefined);
	assert.equal(run("bash", { command: "sleep 5; ls" }, UI).out, undefined);
});

test("sessão principal: run wait é encurtado para 30 s; as outras ações não mudam", () => {
	assert.equal(MAIN_WAIT_S, 30);
	assert.equal(run("run", { action: "wait", id: "r1" }, UI).input.timeout_s, 30);
	assert.equal(run("run", { action: "wait", id: "r1", timeout_s: 900 }, UI).input.timeout_s, 30);
	assert.equal(run("run", { action: "wait", id: "r1", timeout_s: 5 }, UI).input.timeout_s, 5);
	assert.deepEqual(run("run", { action: "start", command: "sleep 900", await: true }, UI).input, {
		action: "start",
		command: "sleep 900",
		await: true,
	});
});

test("F22: sleep em segundo plano (&, ( … ) &, lista com &&, laço com &) não conta como espera em primeiro plano", () => {
	for (const c of [
		"sleep 90 &",
		"(sleep 90 && echo oi) &",
		"nohup sleep 120 > /dev/null 2>&1 &",
		"make && sleep 60 &",
		"while ! test -f x; do sleep 2; done &",
		"(while true; do sleep 60; done) &\necho ok",
		"sleep 90 & echo ok",
	])
		assert.equal(waitsInForeground(c), false, c);
	// `&&`, `>&`, `&>` e `&` entre aspas não são segundo plano; o que sobra em primeiro plano ainda conta.
	for (const c of [
		"sleep 90 && echo oi",
		"sleep 90 2>&1",
		"sleep 90 &> /dev/null",
		'echo "a & b"; sleep 90',
		"sleep 60 & sleep 60",
		"echo ok &\nsleep 45",
		"sleep 90 &&\nls",
		"sleep 90 |& cat",
	])
		assert.equal(waitsInForeground(c), true, c);
});

test("F22: sessão principal deixa passar (sleep 90 && cmd) &", () => {
	assert.equal(run("bash", { command: "(sleep 90 && cmd) &" }, UI).out, undefined);
});

// bash.mainGuard (decision B7): the numbers and the switch come from the settings; the defaults are 120 s and 600 s.
test("bash.mainGuard.timeoutSec e capSec mudam o padrão e o teto da sessão principal", () => {
	const settings = { bash: { mainGuard: { timeoutSec: 45, capSec: 200 } } };
	assert.equal(run("bash", { command: "make" }, UI, {}, settings).input.timeout, 45);
	assert.equal(run("bash", { command: "make", timeout: 200 }, UI, {}, settings).input.timeout, 200);
	const { out } = run("bash", { command: "make", timeout: 201 }, UI, {}, settings);
	assert.equal(out?.block, true);
	assert.match(out?.reason ?? "", /teto de 200s/);
});

test("bash.mainGuard: um padrão acima do teto vale o teto", () => {
	const settings = { bash: { mainGuard: { timeoutSec: 900, capSec: 300 } } };
	assert.equal(run("bash", { command: "make" }, UI, {}, settings).input.timeout, 300);
});

test("bash.mainGuard.enabled false desliga tudo: timeout, recusa de sleep e run wait", () => {
	const settings = { bash: { mainGuard: { enabled: false } } };
	const bash = run("bash", { command: "sleep 240; ls", timeout: 900 }, UI, {}, settings);
	assert.equal(bash.out, undefined);
	assert.equal(bash.input.timeout, 900);
	assert.equal(run("bash", { command: "make" }, UI, {}, settings).input.timeout, undefined);
	assert.equal(run("run", { action: "wait", id: "r1", timeout_s: 900 }, UI, {}, settings).input.timeout_s, 900);
});

test("bash.mainGuard: valores inválidos voltam ao padrão", () => {
	const settings = { bash: { mainGuard: { timeoutSec: 0, capSec: "x", enabled: "no" } } };
	assert.equal(run("bash", { command: "make" }, UI, {}, settings).input.timeout, 120);
	assert.equal(run("bash", { command: "make", timeout: 601 }, UI, {}, settings).out?.block, true);
});
