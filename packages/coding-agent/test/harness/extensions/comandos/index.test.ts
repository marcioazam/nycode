import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, test, vi } from "vitest";
import * as __typed_index from "../../../../src/extensions/comandos/index.ts";

// The rendering reads TERM: pin it so the suite does not depend on the shell it runs in.
beforeEach(() => {
	vi.stubEnv("TERM", "xterm-256color");
});
afterEach(() => {
	vi.unstubAllEnvs();
});

// The source tests exercise the modules with partial fakes, without types.
const __c_index: any = __typed_index;

const m = __c_index;
const G = "__nycodeHarnessComandos";

function nycode() {
	const cmds: string[] = [];
	const on: Record<string, (...a: any[]) => any> = {};
	return {
		cmds,
		on,
		api: {
			registerCommand: (n: string) => cmds.push(n),
			on: (e: string, f: (...a: any[]) => any) => {
				on[e] = f;
			},
		} as any,
	};
}

test("NYCODE_COMANDOS=0 não registra nada", () => {
	process.env.NYCODE_COMANDOS = "0";
	const p = nycode();
	m.default(p.api);
	assert.deepEqual(p.cmds, []);
	assert.deepEqual(Object.keys(p.on), []);
	delete process.env.NYCODE_COMANDOS;
});

test("registra /atalhos; session_start instala o provider e expõe o gancho do painel; sem UI nada", async () => {
	delete (globalThis as any)[G];
	const p = nycode();
	m.default(p.api);
	assert.deepEqual(p.cmds, ["atalhos"]);
	await p.on.session_start({}, { hasUI: false });
	assert.equal((globalThis as any)[G], undefined);
	const provs: any[] = [];
	let entrada: any;
	const ctx = {
		hasUI: true,
		ui: {
			addAutocompleteProvider: (f: any) => provs.push(f),
			onTerminalInput: (f: any) => {
				entrada = f;
			},
			getEditorText: () => "/model",
			custom: async () => undefined,
		},
	};
	await p.on.session_start({}, ctx);
	assert.equal(provs.length, 1);
	assert.equal(typeof (globalThis as any)[G].openShortcuts, "function");
	assert.equal(typeof entrada, "function");
	delete (globalThis as any)[G];
});

test("Enter com “/cmd” no editor grava o recente; texto comum e Shift+Enter não", async () => {
	const f = join(mkdtempSync(join(tmpdir(), "idx-")), "ui-state.json");
	process.env.NYCODE_UI_STATE = f;
	delete (globalThis as any)[G];
	const p = nycode();
	m.default(p.api);
	let texto = "/diff";
	let entrada: any;
	await p.on.session_start(
		{},
		{
			hasUI: true,
			ui: {
				addAutocompleteProvider() {},
				onTerminalInput: (fn: any) => {
					entrada = fn;
				},
				getEditorText: () => texto,
				custom: async () => undefined,
			},
		},
	);
	entrada("\x1b[13;2u"); // shift+enter: nova linha
	assert.throws(() => readFileSync(f));
	texto = "olá";
	entrada("\r");
	assert.throws(() => readFileSync(f));
	texto = "/diff";
	assert.equal(entrada("\r"), undefined);
	assert.deepEqual(JSON.parse(readFileSync(f, "utf8")).recentCommands, ["diff"]);
	delete process.env.NYCODE_UI_STATE;
	delete (globalThis as any)[G];
});

test("session_shutdown limpa a ponte; falha do painel com ctx obsoleto não relança", async () => {
	delete (globalThis as any)[G];
	const p = nycode();
	m.default(p.api);
	let obsoleto = false;
	const avisos: string[] = [];
	const ctx = {
		hasUI: true,
		ui: {
			addAutocompleteProvider() {},
			onTerminalInput() {},
			getEditorText: () => "",
			custom: async () => {
				throw new Error("boom");
			},
			notify: (msg: string) => {
				if (obsoleto) throw new Error("stale");
				avisos.push(msg);
			},
		},
	};
	await p.on.session_start({}, ctx);
	(globalThis as any)[G].openShortcuts(() => {});
	await new Promise((r) => setTimeout(r, 20));
	assert.equal(avisos.length, 1);
	obsoleto = true;
	(globalThis as any)[G].openShortcuts(() => {});
	await new Promise((r) => setTimeout(r, 20)); // rejeição não tratada derrubaria o teste
	assert.equal(typeof p.on.session_shutdown, "function");
	p.on.session_shutdown({}, ctx);
	assert.equal((globalThis as any)[G], undefined);
});
