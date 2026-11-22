// Ports import/ny-pi/extensions/ui/test/editor.test.ts to vitest.
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "vitest";
import type { ExtensionAPI } from "../../../../../src/core/extensions/types.ts";
import type { Settings } from "../../../../../src/core/settings-schema.ts";
import * as typed from "../../../../../src/extensions/ui/editor.ts";

// Os módulos são exercitados com fakes parciais (como no teste original): sem tipos nas chamadas.
const m: any = typed;

const tmp = mkdtempSync(join(tmpdir(), "ui-editor-test-"));

const theme = { borderColor: (s: string) => s, selectList: {} };
const kb = { matches: () => false };
const tui = { requestRender() {}, terminal: { rows: 24, columns: 80 } };
function _editor(vim: { enabled: boolean }, name?: string) {
	const e = new m.UiEditor(tui, theme, kb, vim, () => name);
	const submitted: string[] = [];
	e.onSubmit = (t: string) => submitted.push(t);
	return { e, submitted };
}

function setup(opts: { hasUI?: boolean; other?: boolean; settings?: Settings } = {}) {
	const handlers: Record<string, any> = {};
	const cmds: Record<string, any> = {};
	const notes: string[] = [];
	let factory: any;
	const renders = 0;
	let named: string | undefined;
	m.default({
		on: (n: string, h: unknown) => {
			handlers[n] = h;
		},
		registerCommand: (n: string, c: unknown) => {
			cmds[n] = c;
		},
		setSessionName: (n: string) => {
			named = n;
		},
		getSessionName: () => named,
		getSettings: () => opts.settings ?? {},
	} as unknown as ExtensionAPI);
	const ctx: any = {
		hasUI: opts.hasUI ?? true,
		ui: {
			getEditorComponent: () => (opts.other ? () => ({}) : undefined),
			setEditorComponent: (f: unknown) => {
				factory = f;
			},
			notify: (msg: string, l: string) => notes.push(`${l}:${msg}`),
		},
	};
	return { handlers, cmds, notes, ctx, factory: () => factory, renders: () => renders, named: () => named };
}

test("/vim grava em terminal.uiState do settings.json quando a variável não está definida", async () => {
	const file = join(tmp, "from-settings.json");
	delete process.env.NYCODE_UI_STATE;
	const s = setup({ settings: { terminal: { uiState: file } } });
	s.handlers.session_start({}, s.ctx);
	s.factory()(tui, theme, kb).handleInput("\x1b");
	await s.cmds.vim.handler("", s.ctx);
	assert.equal(m.readState(file).vim, true);
});

const _flush = () => new Promise((r) => setImmediate(r));
const hist = { fg: (_c: string, s: string) => s, bg: (_c: string, s: string) => s };

function _historyCtx(s: ReturnType<typeof setup>, branchText: string, sessionDir = tmp) {
	let comp: any;
	let opts: any;
	let finish: ((v: unknown) => void) | undefined;
	s.ctx.sessionManager = {
		getBranch: () => [{ type: "message", message: { role: "user", content: branchText } }],
		getSessionDir: () => sessionDir,
	};
	s.ctx.ui.custom = (f: any, o: any) =>
		new Promise((res) => {
			finish = res;
			opts = o;
			comp = f(tui, hist, kb, res);
		});
	return { comp: () => comp, opts: () => opts, finish: () => finish };
}
