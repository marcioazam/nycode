// Ports the active local extension test ui/a11y (node:test) to vitest; the plainHeader cases are covered by
// test/harness/core/appearance/header-no-color.test.ts (the plain header is core, K10).
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, test, vi } from "vitest";
import type { ExtensionAPI } from "../../../../src/core/extensions/types.ts";
import a11y, {
	definirMovimento,
	movimento,
	movimentoSalvo,
	noColor,
	reducedMotion,
} from "../../../../src/extensions/ui/a11y.ts";

// The animations read TERM: pin it so the suite does not depend on the shell it runs in.
beforeEach(() => {
	vi.stubEnv("TERM", "xterm-256color");
});
afterEach(() => {
	vi.unstubAllEnvs();
});

const nycodeStub = { getSettings: () => ({}) } as unknown as ExtensionAPI;
const vazio = mkdtempSync(join(tmpdir(), "a11y-test-"));

test("noColor: só valor não vazio liga", () => {
	assert.equal(noColor({}), false);
	assert.equal(noColor({ NO_COLOR: "" }), false);
	assert.equal(noColor({ NO_COLOR: "1" }), true);
});

// Onda 10, P01: antes havia dois critérios (a11y.ts só aceitava "1"; motion.ts aceitava qualquer valor, NO_COLOR vazio e TERM=linux).
test("movimento: um critério só, três níveis pelo ambiente", () => {
	assert.equal(movimento({}, undefined), "normal");
	assert.equal(movimento({ TERM: "xterm-kitty", NYCODE_REDUCED_MOTION: "0" }, undefined), "normal");
	assert.equal(movimento({ NYCODE_REDUCED_MOTION: "false" }, undefined), "normal");
	assert.equal(movimento({ NYCODE_REDUCED_MOTION: "1" }, undefined), "reduzido");
	assert.equal(movimento({ NYCODE_REDUCED_MOTION: "true" }, undefined), "reduzido");
	assert.equal(movimento({ TERM: "linux" }, undefined), "reduzido");
	assert.equal(movimento({ TERM: "dumb" }, undefined), "desligado");
	assert.equal(movimento({ NO_PROGRESS: "1" }, undefined), "desligado");
	assert.equal(movimento({ NO_PROGRESS: "" }, undefined), "normal");
	assert.equal(movimento({ NO_COLOR: "1" }, undefined), "normal", "NO_COLOR tira cor, não movimento");
});

test("movimento: a chave salva vale junto com o ambiente e ganha o mais restritivo", () => {
	assert.equal(movimento({}, "reduzido"), "reduzido");
	assert.equal(movimento({}, "desligado"), "desligado");
	assert.equal(
		movimento({ NYCODE_REDUCED_MOTION: "1" }, "normal"),
		"reduzido",
		"a chave não religa o que o ambiente reduziu",
	);
	assert.equal(movimento({ NYCODE_REDUCED_MOTION: "1" }, "desligado"), "desligado");
	assert.equal(movimento({}, "turbo"), "normal", "valor desconhecido não muda nada");
	try {
		definirMovimento("desligado");
		assert.equal(movimento({}), "desligado", "definirMovimento vale para todas as extensões (globalThis)");
		assert.equal(reducedMotion(nycodeStub, {}), true);
		definirMovimento("qualquer");
		assert.equal(movimento({}), "normal");
	} finally {
		definirMovimento(undefined);
	}
});

test("reducedMotion (lido pelo painel de subagentes): verdadeiro fora do nível normal", () => {
	assert.equal(reducedMotion(nycodeStub, {}), false);
	assert.equal(reducedMotion(nycodeStub, { NYCODE_REDUCED_MOTION: "0" }), false);
	assert.equal(reducedMotion(nycodeStub, { NYCODE_REDUCED_MOTION: "1" }), true);
});

test("reducedMotion: TERM=dumb liga (clig.dev)", () => {
	assert.equal(reducedMotion(nycodeStub, { TERM: "dumb" }), true);
	assert.equal(reducedMotion(nycodeStub, { TERM: "xterm-256color" }), false);
});

test("reducedMotion: NO_PROGRESS não vazio também liga", () => {
	assert.equal(reducedMotion(nycodeStub, { NO_PROGRESS: "" }), false);
	assert.equal(reducedMotion(nycodeStub, { NO_PROGRESS: "1" }), true);
});

function run(
	env: Record<string, string>,
	hasUI: boolean,
	themeResult = { success: true } as { success: boolean; error?: string },
) {
	const saved = {
		NO_COLOR: process.env.NO_COLOR,
		NYCODE_REDUCED_MOTION: process.env.NYCODE_REDUCED_MOTION,
		NYCODE_UI_STATE: process.env.NYCODE_UI_STATE,
		NYCODE_CODING_AGENT_DIR: process.env.NYCODE_CODING_AGENT_DIR,
	};
	delete process.env.NO_COLOR;
	delete process.env.NYCODE_REDUCED_MOTION;
	process.env.NYCODE_UI_STATE = join(vazio, "ui-state.json"); // isolado do estado real do usuário
	process.env.NYCODE_CODING_AGENT_DIR = vazio;
	Object.assign(process.env, env);
	const calls: unknown[][] = [];
	let handler: any;
	a11y({
		on: (_n: string, h: unknown) => {
			handler = h;
		},
		getSettings: () => ({}),
	} as any);
	handler(
		{},
		{
			hasUI,
			ui: {
				getTheme: (n: string) => (themeResult.success ? { themeObject: n } : undefined),
				setTheme: (t: unknown) => {
					calls.push(["theme", t]);
					return themeResult;
				},
				setHeader: (f: unknown) => calls.push(["header", typeof f]),
				setWorkingIndicator: (o: unknown) => calls.push(["indicator", o]),
				notify: (m: string, l: string) => calls.push(["notify", l, m]),
			},
		},
	);
	for (const [k, v] of Object.entries(saved)) {
		if (v === undefined) delete process.env[k];
		else process.env[k] = v;
	}
	return calls;
}

// O nycode grava em settings.json o tema trocado por nome (interactive-mode.js: setTheme(name) chama
// settingsManager.setTheme); por objeto (setThemeInstance) vale só para a sessão. Antes do conserto, uma única
// sessão com NO_COLOR deixou "theme": "mono" salvo e todas as sessões seguintes ficaram sem cor.
test("NO_COLOR aplica o tema mono só nesta sessão (objeto, não nome); falha vira aviso", () => {
	assert.deepEqual(run({ NO_COLOR: "1" }, true), [["theme", { themeObject: "mono" }]]);
	const c = run({ NO_COLOR: "1" }, true, { success: false, error: "x" });
	assert.deepEqual(c[0], ["notify", "warning", "NO_COLOR: tema mono indisponível (tema não encontrado)"]);
	assert.ok(!c.some((x) => x[0] === "theme"), "sem tema, nada é trocado nem gravado");
});

test("NYCODE_REDUCED_MOTION troca o indicador por um quadro estático", () => {
	assert.deepEqual(run({ NYCODE_REDUCED_MOTION: "1" }, true), [["indicator", { frames: ["●"] }]]);
});

test("sem UI ou sem env não faz nada", () => {
	assert.deepEqual(run({ NO_COLOR: "1" }, false), []);
	assert.deepEqual(run({}, true), []);
});

test("/movimento: grava a escolha, troca o indicador e respeita o ambiente mais restritivo", async () => {
	const dir = mkdtempSync(join(tmpdir(), "a11y-mov-"));
	const saved = {
		a: process.env.NYCODE_UI_STATE,
		b: process.env.NYCODE_CODING_AGENT_DIR,
		c: process.env.NYCODE_REDUCED_MOTION,
	};
	process.env.NYCODE_UI_STATE = join(dir, "ui-state.json");
	process.env.NYCODE_CODING_AGENT_DIR = dir;
	delete process.env.NYCODE_REDUCED_MOTION;
	writeFileSync(join(dir, "ui-state.json"), '{"vim":true}');
	writeFileSync(join(dir, "settings.json"), '{"movimento":"reduzido"}');
	let cmd: any;
	const calls: unknown[][] = [];
	a11y({
		on: () => {},
		getSettings: () => ({}),
		registerCommand: (n: string, c: unknown) => {
			cmd = [n, c];
		},
	} as any);
	const ui = {
		theme: { fg: (_c: string, t: string) => `<${t}>` },
		setWorkingIndicator: (o: unknown) => calls.push(["ind", o]),
		notify: (m: string, l: string) => calls.push([l, m]),
	};
	try {
		assert.equal(cmd[0], "movimento");
		assert.equal(movimentoSalvo(), "reduzido", "sem /movimento vale settings.json");
		assert.deepEqual(cmd[1].getArgumentCompletions("d"), [{ value: "desligado", label: "desligado" }]);
		await cmd[1].handler("turbo", { ui });
		assert.deepEqual(calls.pop(), ["warning", "Movimento desconhecido: turbo (use normal, reduzido, desligado)"]);
		await cmd[1].handler("desligado", { ui });
		assert.deepEqual(
			JSON.parse(readFileSync(join(dir, "ui-state.json"), "utf8")),
			{ vim: true, movimento: "desligado" },
			"preserva as outras chaves",
		);
		assert.equal(movimentoSalvo(), "desligado", "ui-state.json vence settings.json");
		assert.deepEqual(calls.slice(-2), [
			["ind", { frames: ["●"] }],
			["info", "Movimento: desligado"],
		]);
		await cmd[1].handler("normal", { ui });
		assert.deepEqual((calls.at(-2) as any)[1].frames.length, 10, "normal volta ao spinner");
		process.env.NYCODE_REDUCED_MOTION = "1";
		await cmd[1].handler("normal", { ui });
		assert.deepEqual(calls.at(-1), ["info", "Movimento: reduzido (o ambiente pede reduzido; normal fica salvo)"]);
		await cmd[1].handler("", { ui });
		assert.deepEqual(calls.at(-1), ["info", "Movimento: reduzido (uso: /movimento normal|reduzido|desligado)"]);
	} finally {
		definirMovimento(undefined);
		for (const [k, v] of [
			["NYCODE_UI_STATE", saved.a],
			["NYCODE_CODING_AGENT_DIR", saved.b],
			["NYCODE_REDUCED_MOTION", saved.c],
		] as const)
			if (v === undefined) delete process.env[k];
			else process.env[k] = v;
	}
});
