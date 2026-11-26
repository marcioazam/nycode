// node --experimental-strip-types --test extensions/claude-compat/interface/test/tui-mode.test.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "vitest";
import { tuiCommand } from "../../../../../src/extensions/claude-compat/commands/settings/config.ts";
import { type Controls, getControls } from "../../../../../src/extensions/claude-compat/interface/controls.ts";
import { failingOpener, fileOpener, mkCtx, tmp } from "../commands/helpers.ts";

const withTui = (setTuiMode?: Controls["setTuiMode"]) => ({ ...({} as Controls), apiVersion: 1 as const, setTuiMode });

test("/tui-set grava e só então aplica ao vivo pelo controlador", async () => {
	const dir = tmp();
	const calls: string[] = [];
	const c = mkCtx({ cwd: dir });
	await tuiCommand("regular", c.ctx, {
		open: await fileOpener(dir),
		controls: () => withTui((m) => void calls.push(m)),
	});
	assert.deepEqual(calls, ["regular"]);
	assert.equal(JSON.parse(readFileSync(join(dir, "settings.json"), "utf8")).tuiMode, "regular");
	assert.match(c.last(), /regular aplicado agora/);
});

test("recusa do core: avisa o motivo real, mantém o valor salvo e não diz aplicado", async () => {
	const dir = tmp();
	const c = mkCtx({ cwd: dir });
	await tuiCommand("fullscreen", c.ctx, {
		open: await fileOpener(dir),
		controls: () =>
			withTui(() => {
				throw new Error("o core recusou a troca (há um diálogo aberto)");
			}),
	});
	const last = c.notes.at(-1)!;
	assert.equal(last.t, "warning");
	assert.match(last.m, /recusou[\s\S]*próximo início/);
	assert.doesNotMatch(last.m, /aplicado agora/);
	assert.equal(JSON.parse(readFileSync(join(dir, "settings.json"), "utf8")).tuiMode, "fullscreen");
});

test("sem controlador, sem setTuiMode, valor inválido ou gravação falha: nada é aplicado", async () => {
	const dir = tmp();
	const open = await fileOpener(dir);
	const calls: string[] = [];
	for (const controls of [() => undefined, () => withTui(undefined)]) {
		const c = mkCtx({ cwd: dir });
		await tuiCommand("regular", c.ctx, { open, controls });
		assert.match(c.last(), /próximo início/);
	}
	const bad = mkCtx({ cwd: dir });
	await tuiCommand("enorme", bad.ctx, { open, controls: () => withTui((m) => void calls.push(m)) });
	assert.equal(bad.notes.at(-1)!.t, "error");
	const fail = mkCtx({ cwd: dir });
	await tuiCommand("regular", fail.ctx, {
		open: await failingOpener(),
		controls: () => withTui((m) => void calls.push(m)),
	});
	assert.equal(fail.notes.at(-1)!.t, "error");
	assert.deepEqual(calls, []);
});

test("getControls aceita runtime sem setTuiMode (opcional) e não o exige", () => {
	const holder = {
		[Symbol.for("nycode-harness.ui-controls")]: {
			apiVersion: 1,
			mode() {},
			setFocus() {},
			isFocus() {},
			setPromptColor() {},
			getPromptColor() {},
			reset() {},
		},
	};
	assert.ok(getControls(holder));
});
