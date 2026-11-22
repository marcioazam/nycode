import assert from "node:assert/strict";
import { test } from "vitest";
import {
	COLOR_ENTRY,
	colorCommand,
	registerColor,
	savedColor,
} from "../../../../../src/extensions/claude-compat/interface/color.ts";
import { COLOR_NAMES, type Controls, MISSING } from "../../../../../src/extensions/claude-compat/interface/controls.ts";

function fake() {
	const calls: string[] = [];
	let cur = "default";
	const c: Controls = {
		apiVersion: 1,
		mode: () => "fullscreen",
		setFocus: () => {},
		isFocus: () => false,
		setPromptColor: (n) => {
			calls.push(n);
			cur = n;
		},
		getPromptColor: () => cur,
		reset: () => {},
	};
	return { c, calls };
}
const mk = (entries: unknown[] = []) => {
	const notes: { m: string; t?: string }[] = [];
	const appended: [string, unknown][] = [];
	return {
		ctx: {
			ui: { notify: (m: string, t?: any) => notes.push({ m, t }) },
			sessionManager: { getEntries: () => entries },
		},
		nycode: { appendEntry: (t: string, d: unknown) => void appended.push([t, d]) } as any,
		notes,
		appended,
	};
};

test("cada nome válido (e default) aplica e é guardado como entrada da sessão, sem tocar settings", async () => {
	for (const name of [...COLOR_NAMES, "default"]) {
		const { c, calls } = fake();
		const m = mk();
		await colorCommand(` ${name.toUpperCase()} `, m.ctx, m.nycode, { controls: () => c });
		assert.deepEqual(calls, [name]);
		assert.deepEqual(m.appended, [[COLOR_ENTRY, { color: name }]]);
	}
});

test("sem argumento sorteia uma cor válida diferente da atual (extremos do sorteio)", async () => {
	for (const r of [0, 0.4999, 0.9999999]) {
		const { c, calls } = fake();
		await c.setPromptColor("red");
		calls.length = 0;
		const m = mk();
		await colorCommand("", m.ctx, m.nycode, { controls: () => c, random: () => r });
		assert.equal(calls.length, 1);
		assert.ok((COLOR_NAMES as readonly string[]).includes(calls[0]) && calls[0] !== "red");
		assert.equal(m.appended.length, 1);
	}
});

test("nome inválido (inclusive escape ANSI), controlador ausente ou falha: erro e nada guardado", async () => {
	const { c, calls } = fake();
	const m = mk();
	await colorCommand("magenta", m.ctx, m.nycode, { controls: () => c });
	await colorCommand("\x1b[31m", m.ctx, m.nycode, { controls: () => c });
	assert.deepEqual(calls, []);
	assert.equal(m.appended.length, 0);
	assert.match(m.notes[0].m, /Cores: red, blue, green, yellow, purple, orange, pink, cyan, default/);
	assert.equal(m.notes[1].m.includes("\x1b"), false); // o eco do argumento nunca leva o escape
	const none = mk();
	await colorCommand("red", none.ctx, none.nycode, { controls: () => undefined });
	assert.equal(none.notes[0].m, MISSING);
	const boom = mk();
	const bad = {
		...c,
		setPromptColor: () => {
			throw new Error("recusado");
		},
	};
	await colorCommand("red", boom.ctx, boom.nycode, { controls: () => bad });
	assert.match(boom.notes[0].m, /Cor não aplicada: recusado/);
	assert.equal(boom.appended.length, 0);
});

test("savedColor: última entrada válida vence; inválida/ausente = default", () => {
	const e = (color: unknown) => ({ type: "custom", customType: COLOR_ENTRY, data: { color } });
	assert.equal(savedColor([]), "default");
	assert.equal(savedColor([e("red"), e("blue")]), "blue");
	assert.equal(savedColor([e("red"), e("\x1b[31m")]), "red");
	assert.equal(savedColor([e("red"), { type: "custom", customType: "outro", data: { color: "blue" } }]), "red");
	assert.equal(savedColor([e("red"), e("default")]), "default");
});

test("session_start restaura a cor da sessão (resume/fork) e nova sessão volta ao padrão", async () => {
	const handlers: Record<string, (...a: any[]) => unknown> = {};
	const nycode: any = {
		registerCommand: () => {},
		on: (e: string, h: (...a: any[]) => unknown) => {
			handlers[e] = h;
		},
	};
	const { c, calls } = fake();
	registerColor(nycode, { controls: () => c });
	await handlers.session_start(
		{ reason: "resume" },
		mk([{ type: "custom", customType: COLOR_ENTRY, data: { color: "green" } }]).ctx,
	);
	await handlers.session_start({ reason: "new" }, mk([]).ctx);
	assert.deepEqual(calls, ["green", "default"]);
});
