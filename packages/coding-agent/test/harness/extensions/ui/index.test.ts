// node --experimental-strip-types --test ~/.nycode/agent/extensions/ui/test/index.test.ts
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "vitest";
import * as __m1 from "../../../../src/extensions/ui/index.ts";

// Monta ui/ e claude-compat/aliases.ts numa cópia com o nycode ao lado (o Node não tira tipos dentro de node_modules).
const _tmp = mkdtempSync(join(tmpdir(), "ui-index-test-"));
const _src = new URL("..", import.meta.url);
const { default: ui } = __m1;

function register() {
	const commands: string[] = [];
	const events: Record<string, Array<(e: unknown, ctx: unknown) => unknown>> = {};
	const nycode = {
		registerCommand: (name: string) => commands.push(name),
		on: (name: string, h: (e: unknown, ctx: unknown) => unknown) => {
			events[name] ??= [];
			events[name].push(h);
			return () => {};
		},
		getSessionName: () => undefined,
		setSessionName() {},
		getCommands: () => [],
		getSettings: () => ({}),
	};
	ui(nycode as never);
	return { commands, events };
}

test("ui/index.ts monta todas as partes: comandos, editor, a11y e terminal", () => {
	const { commands, events } = register();
	assert.deepEqual([...commands].sort(), ["btw", "diff", "movimento", "rename"]); // movimento: Onda 10, P01
	assert.ok(events.session_start!.length >= 3); // editor, a11y, terminal
	for (const ev of ["session_info_changed", "agent_start", "agent_settled", "session_shutdown"])
		assert.ok(events[ev]?.length, ev);
});

test("ciclo de vida sem UI: session_start e session_shutdown não falham nem instalam editor", async () => {
	const { events } = register();
	let installed = 0;
	const ctx = { hasUI: false, ui: { setEditorComponent: () => installed++ } };
	for (const h of events.session_start!) await h({}, ctx);
	for (const h of events.session_shutdown!) await h({}, ctx);
	assert.equal(installed, 0);
});
