// node --experimental-strip-types --test extensions/claude-compat/interface/test/*.test.ts
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "vitest";
import {
	getSetting,
	KEYS,
	readSettings,
	setSetting,
} from "../../../../../src/extensions/claude-compat/commands/settings/store.ts";
import {
	CONTROLS_KEY,
	type Controls,
	getControls,
	MISSING,
} from "../../../../../src/extensions/claude-compat/interface/controls.ts";
import {
	applyViewMode,
	focusCommand,
	registerFocus,
} from "../../../../../src/extensions/claude-compat/interface/focus.ts";
import { failingOpener, fileOpener, tmp } from "../commands/helpers.ts";

function fake(mode: "regular" | "fullscreen" = "fullscreen") {
	const calls: string[] = [];
	let focus = false;
	const c: Controls = {
		apiVersion: 1,
		mode: () => mode,
		setFocus: (on) => {
			if (on && mode !== "fullscreen") throw new Error("o modo foco só existe no modo de tela fullscreen");
			calls.push(`focus:${on}`);
			focus = on;
		},
		isFocus: () => focus,
		setPromptColor: (n) => void calls.push(`color:${n}`),
		getPromptColor: () => "default",
		reset: () => {
			calls.push("reset");
			focus = false;
		},
	};
	return { c, calls };
}
const mkCtx = (cwd: string) => {
	const notes: { m: string; t?: string }[] = [];
	return { ctx: { cwd, ui: { notify: (m: string, t?: any) => notes.push({ m, t }) } }, notes };
};
const disk = (dir: string) =>
	existsSync(join(dir, "settings.json")) ? JSON.parse(readFileSync(join(dir, "settings.json"), "utf8")) : undefined;

test("getControls só aceita a forma versionada; ausente = undefined", () => {
	const { c } = fake();
	assert.equal(getControls({}), undefined);
	assert.equal(getControls({ [CONTROLS_KEY]: { ...c, apiVersion: 2 } }), undefined);
	assert.equal(getControls({ [CONTROLS_KEY]: { apiVersion: 1 } }), undefined);
	assert.equal(getControls({ [CONTROLS_KEY]: c }), c);
});

test("/focus sem argumento alterna e persiste viewMode global; preserva outras chaves", async () => {
	const dir = tmp();
	writeFileSync(join(dir, "settings.json"), JSON.stringify({ keep: 1, theme: "dark" }));
	const open = await fileOpener(dir);
	const { c, calls } = fake();
	const { ctx, notes } = mkCtx(dir);
	await focusCommand("", ctx, { open, controls: () => c });
	assert.deepEqual(calls, ["focus:true"]);
	assert.equal(disk(dir).viewMode, "focus");
	assert.equal(disk(dir).keep, 1);
	assert.match(notes.at(-1)!.m, /viewMode = "focus" salvo/);
	await focusCommand("", ctx, { open, controls: () => c });
	assert.deepEqual(calls, ["focus:true", "focus:false"]);
	assert.equal(disk(dir).viewMode, "default");
});

test("/focus on|off só sobrescreve a sessão: nada é gravado", async () => {
	const dir = tmp();
	const open = await fileOpener(dir);
	const { c, calls } = fake();
	const { ctx, notes } = mkCtx(dir);
	await focusCommand("ON", ctx, { open, controls: () => c });
	await focusCommand("off", ctx, { open, controls: () => c });
	assert.deepEqual(calls, ["focus:true", "focus:false"]);
	assert.equal(disk(dir), undefined);
	assert.match(notes[0].m, /só nesta sessão \(nada foi salvo\)/);
});

test("argumento inválido, controlador ausente e tela regular recusam sem gravar nem mudar o estado", async () => {
	const dir = tmp();
	const open = await fileOpener(dir);
	const a = fake();
	const n1 = mkCtx(dir);
	await focusCommand("maybe", n1.ctx, { open, controls: () => a.c });
	assert.deepEqual(a.calls, []);
	assert.match(n1.notes[0].m, /inválido\. Uso: \/focus/);
	const n2 = mkCtx(dir);
	await focusCommand("", n2.ctx, { open, controls: () => undefined });
	assert.equal(n2.notes[0].m, MISSING);
	const r = fake("regular");
	const n3 = mkCtx(dir);
	await focusCommand("", n3.ctx, { open, controls: () => r.c });
	assert.equal(n3.notes[0].t, "error");
	assert.match(n3.notes[0].m, /fullscreen/);
	assert.equal(disk(dir), undefined);
});

test("falha ao salvar: o foco vale agora e o aviso diz que não foi salvo", async () => {
	const { c, calls } = fake();
	const { ctx, notes } = mkCtx("/tmp");
	await focusCommand("", ctx, { open: await failingOpener(), controls: () => c });
	assert.deepEqual(calls, ["focus:true"]);
	assert.equal(notes.at(-1)!.t, "warning");
	assert.match(notes.at(-1)!.m, /não foi possível salvar/);
});

test("viewMode: enum fechado na lista de chaves; inválido nunca grava; arquivo corrompido recusa", async () => {
	assert.ok(Object.hasOwn(KEYS, "viewMode"));
	const dir = tmp();
	const open = await fileOpener(dir);
	const bad = await setSetting(open, dir, "viewMode", "zen");
	assert.ok(!bad.ok && /valores: focus, default/.test(bad.error));
	assert.equal(disk(dir), undefined);
	assert.ok((await setSetting(open, dir, "viewMode", "focus")).ok);
	const r = await readSettings(open, dir);
	assert.ok(r.ok && getSetting(r.data, "viewMode") === "focus");
	writeFileSync(join(dir, "settings.json"), "{ nope");
	const corrupt = await setSetting(await fileOpener(dir), dir, "viewMode", "default");
	assert.equal(corrupt.ok, false);
	assert.equal(readFileSync(join(dir, "settings.json"), "utf8"), "{ nope");
});

test("applyViewMode: focus só em fullscreen; valor inválido ou ausente = vista normal", async () => {
	const dir = tmp();
	const open = await fileOpener(dir);
	const { c, calls } = fake();
	const { ctx } = mkCtx(dir);
	await applyViewMode(ctx, { open, controls: () => c });
	assert.deepEqual(calls, ["focus:false"]);
	writeFileSync(join(dir, "settings.json"), JSON.stringify({ viewMode: "focus" }));
	await applyViewMode(ctx, { open: await fileOpener(dir), controls: () => c });
	assert.equal(calls.at(-1), "focus:true");
	const reg = fake("regular");
	await applyViewMode(ctx, { open: await fileOpener(dir), controls: () => reg.c });
	assert.deepEqual(reg.calls, ["focus:false"]);
	writeFileSync(join(dir, "settings.json"), JSON.stringify({ viewMode: "bogus" }));
	const bogus = fake();
	await applyViewMode(ctx, { open: await fileOpener(dir), controls: () => bogus.c });
	assert.deepEqual(bogus.calls, ["focus:false"]);
});

test("registerFocus: comando, session_start aplica o salvo, shutdown reseta", async () => {
	const dir = tmp();
	writeFileSync(join(dir, "settings.json"), JSON.stringify({ viewMode: "focus" }));
	const handlers: Record<string, (...a: any[]) => unknown> = {};
	const cmds: Record<string, any> = {};
	const nycode: any = {
		registerCommand: (n: string, o: any) => {
			cmds[n] = o;
		},
		on: (e: string, h: (...a: any[]) => unknown) => {
			handlers[e] = h;
		},
	};
	const { c, calls } = fake();
	registerFocus(nycode, { open: await fileOpener(dir), controls: () => c });
	assert.ok(cmds.focus.description.includes("foco"));
	await handlers.session_start({ reason: "startup" }, mkCtx(dir).ctx);
	assert.deepEqual(calls, ["focus:true"]);
	await handlers.session_shutdown({});
	assert.equal(calls.at(-1), "reset");
});
