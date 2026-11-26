// Componente do modal /subagents-setup (docs/harness/subagents-setup-ui-2026-11-26.md): grupos por provedor, busca,
// rolagem com barra e os dois passos (modelos, depois níveis por modelo). Sem tema: texto puro, sem animação.
import assert from "node:assert/strict";
import type { TuiMouseEvent } from "@nycode/tui";
import { test } from "vitest";
import type { RoutingPolicy } from "../../../../src/extensions/subagent/routing/policy.ts";
import { SetupComponent, type SetupModel } from "../../../../src/extensions/subagent/routing/setup-ui.ts";
import { fleetTestEnv } from "../fleet-env.ts";

fleetTestEnv("routing-ui-");

const UP = "\x1b[A";
const DOWN = "\x1b[B";
const PGDN = "\x1b[6~";
const END = "\x1b[F";
const ENTER = "\r";
const ESC = "\x1b";
const TAB = "\t";
const BACKSPACE = "\x7f";
const models = [
	{ key: "a/haiku", levels: ["low", "medium"] },
	{ key: "a/sonnet", levels: ["low", "medium", "high", "xhigh"] },
	{ key: "a/odd", levels: ["xhigh"] },
];
function open(current?: RoutingPolicy, list: unknown[] = models, rows?: number) {
	const results: unknown[] = [];
	let renders = 0;
	const c = new SetupComponent({
		models: list as SetupModel[],
		current,
		done: (p: unknown) => results.push(p),
		requestRender: () => void renders++,
		rows: rows === undefined ? undefined : () => rows,
	});
	const press = (...keys: string[]) =>
		keys.forEach((k) => {
			c.handleInput(k);
		});
	const screen = (width = 80) => c.render(width).join("\n");
	const focused = () => c.render(80).find((l) => l.startsWith("│ ▌"));
	return { c, results, press, screen, focused, renders: () => renders };
}

test("passo 1 sem marcação recusa; marcar, navegar e confirmar leva ao passo 2 com os esforços padrão", () => {
	const { press, results, screen, focused } = open();
	assert.match(screen(), /Subagentes · quais modelos podem usar/);
	assert.match(screen(), /│ {3}a ─+ 0\/3/); // o grupo do provedor abre a lista
	press(ENTER);
	assert.match(screen(), /Marque ao menos um modelo\./);
	press(DOWN, " ", DOWN, UP, UP, " ", " "); // marca sonnet, depois marca e desmarca haiku
	assert.match(focused()!, /▌ ○ {2}haiku/);
	assert.match(screen(), /● {2}sonnet +low·med·high·xhigh/);
	press(ENTER);
	assert.match(screen(), /Níveis de a\/sonnet .*passo 2 · 1\/1/);
	assert.match(screen(), /● {2}low[\s\S]*● {2}medium[\s\S]*● {2}high[\s\S]*○ {2}xhigh/);
	press(ENTER);
	assert.deepEqual(results, [{ version: 1, models: { "a/sonnet": ["low", "medium", "high"] } }]);
});

test("passo 2: um modelo por página, política atual pré-marcada, ao menos um esforço, modelo sem níveis padrão leva todos", () => {
	const { press, results, screen } = open({ version: 1, models: { "a/haiku": ["medium"] } });
	press(DOWN, DOWN, " ", ENTER); // marca também a/odd
	assert.match(screen(), /a\/haiku .*1\/2/);
	assert.match(screen(), /○ {2}low[\s\S]*● {2}medium/);
	press(" "); // low marcado
	press(DOWN, " "); // desmarca medium
	press(UP, " "); // desmarca low: nenhum
	press(ENTER);
	assert.match(screen(), /Marque ao menos um nível\./);
	press(" ", ENTER);
	assert.match(screen(), /a\/odd .*2\/2/);
	assert.match(screen(), /● {2}xhigh/);
	press(ENTER);
	assert.deepEqual(results, [{ version: 1, models: { "a/haiku": ["low"], "a/odd": ["xhigh"] } }]);
});

test("esc no passo 2 volta uma página e depois ao passo 1, sem perder as marcações", () => {
	const { press, results, screen } = open();
	press(" ", DOWN, " ", ENTER, ENTER); // haiku e sonnet; vai à página 2
	assert.match(screen(), /a\/sonnet .*2\/2/);
	press(ESC);
	assert.match(screen(), /a\/haiku .*1\/2/);
	press(ESC);
	assert.match(screen(), /passo 1 · 2 marcados/);
	assert.deepEqual(results, []);
});

const many = [
	...Array.from({ length: 12 }, (_, i) => ({ key: `anthropic/claude-${i}`, levels: ["low", "high"] })),
	...Array.from({ length: 12 }, (_, i) => ({ key: `openai/gpt-${i}`, levels: ["low", "high"] })),
	{ key: "google/gemini-pro", levels: ["low"] },
];

test("lista maior que a tela rola com o cursor, mostra a barra e os contadores acima/abaixo", () => {
	const { press, screen, focused, c } = open(undefined, many, 20); // 17 linhas de overlay: 10 de lista
	const lines = c.render(80);
	assert.equal(lines.length, 17);
	assert.match(screen(), /↓ 18 abaixo/);
	assert.match(lines[3]!, /[█▀▄]$/); // polegar no topo da barra
	press(...Array(15).fill(DOWN));
	assert.match(focused()!, /claude-11|gpt-/);
	assert.ok(
		c.render(80).some((l) => l.startsWith("│ ▌")),
		"o cursor continua visível",
	);
	assert.match(screen(), /↑ \d+ acima/);
	// o rótulo do grupo gruda no topo da janela enquanto seus modelos rolam
	assert.match(c.render(80)[3]!, /▴ (anthropic|openai) ─/);
	press(END);
	assert.match(focused()!, /gemini-pro/);
	assert.doesNotMatch(screen(), /abaixo/);
	press(PGDN, UP);
	assert.ok(c.render(80).some((l) => l.startsWith("│ ▌")));
});

test("a roda do mouse move o cursor; outros eventos de mouse passam adiante", () => {
	const { c, focused } = open(undefined, many, 20);
	const wheel: TuiMouseEvent = {
		type: "wheel",
		button: "none",
		x: 0,
		y: 0,
		screenX: 0,
		screenY: 0,
		width: 80,
		height: 20,
		shift: false,
		alt: false,
		ctrl: false,
		wheelDelta: 3,
	};
	assert.deepEqual(c.handleMouse(wheel), { handled: true, render: true });
	assert.match(focused()!, /claude-3/);
	assert.equal(c.handleMouse({ ...wheel, type: "click", button: "left", wheelDelta: undefined }), undefined);
});

test("busca: substring; aproximado só quando nada contém o texto; grupo sem resultado some, tab mostra só marcados, esc limpa e depois cancela", () => {
	const { press, results, screen, focused } = open(undefined, many, 40);
	press(..."gpt-1");
	assert.match(screen(), /⌕ gpt-1▏ {3}3 de 25/); // gpt-1, gpt-10, gpt-11
	assert.doesNotMatch(screen(), /anthropic ─/);
	assert.match(focused()!, /gpt-1 /);
	press(BACKSPACE, BACKSPACE, BACKSPACE, BACKSPACE, BACKSPACE, ..."gmnpro"); // aproximado
	assert.match(screen(), /1 de 25/);
	assert.match(focused()!, /gemini-pro/);
	press(" ", "\x15"); // marca; ctrl+u limpa
	assert.match(screen(), /passo 1 · 1 marcado ─/);
	press(..."-1");
	assert.match(screen(), /6 de 25/); // claude-1, -10, -11 e gpt-1, -10, -11
	press("\x15");
	assert.match(screen(), /25 de 25/);
	press(TAB);
	assert.match(screen(), /1 de 25 · só marcados/);
	assert.match(screen(), /esc limpa/);
	press(ESC);
	assert.match(screen(), /25 de 25/);
	assert.deepEqual(results, []);
	press(ESC);
	assert.deepEqual(results, [undefined]);
});

test("busca aceita letra no protocolo kitty; liberação de tecla e tecla desconhecida são ignoradas", () => {
	const { c, press, screen, renders } = open();
	c.handleInput("\x1b[111u"); // 'o' em CSI-u
	assert.match(screen(), /⌕ o▏/);
	const before = renders();
	c.handleInput("\x1b[32;1:3u"); // release (kitty)
	press("\x1b[1;5P"); // ctrl+F1
	assert.equal(renders(), before);
});

test("título próprio (travar-modelos) e render truncado na largura", () => {
	const c = new SetupComponent({
		models: models as SetupModel[],
		current: undefined,
		done: () => {},
		title: { name: "Trava de modelos", hint: "quais modelos a sessão pode usar" },
	});
	assert.match(c.render(100)[0]!, /Trava de modelos · quais modelos a sessão pode usar/);
	for (const width of [10, 40, 80]) {
		// eslint-disable-next-line no-control-regex
		assert.ok(c.render(width).every((l: string) => l.replace(/\x1b\[[0-9;]*m/g, "").length <= width));
	}
	c.invalidate();
	c.dispose();
});
