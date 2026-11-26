// bash claude-home/bin/tests/claude-compat/with-sdk.sh node --experimental-strip-types --test extensions/ui/test/alias/autocomplete.test.ts
// Editor e CombinedAutocompleteProvider REAIS do SDK: o Enter aceita a sugestão do menu ANTES do roteamento de alias.
import assert from "node:assert/strict";
import { CombinedAutocompleteProvider } from "@nycode/tui";
import { test } from "vitest";
import { UiEditor } from "../../../../../src/extensions/ui/editor.ts";

const COMMANDS = ["settings", "config-set", "theme-set", "tui-set", "session", "resume", "model", "clone"];
const DEADLINE_MS = 2000;

function setup(registered: readonly string[] = COMMANDS) {
	const notes: Array<[string, string]> = [];
	let wake: (() => void) | undefined;
	let settled = ""; // texto da última consulta de sugestões concluída
	const tui = { requestRender: () => wake?.(), terminal: { rows: 24, columns: 80 } };
	const e = new UiEditor(
		tui as never,
		{ borderColor: (s: string) => s, selectList: {} } as never,
		{ matches: () => false } as never,
		{ enabled: false },
		() => undefined,
	);
	const submitted: string[] = [];
	e.onSubmit = (t: string) => void submitted.push(t);
	e.compat = { hasCommand: (n) => registered.includes(n), notify: (m, l) => void notes.push([m, l]) };
	const real = new CombinedAutocompleteProvider(
		registered.map((name) => ({ name })),
		process.cwd(),
	);
	e.setAutocompleteProvider({
		triggerCharacters: (real as unknown as { triggerCharacters?: string[] }).triggerCharacters,
		getSuggestions: async (lines, l, c, o) => {
			const r = await real.getSuggestions(lines, l, c, o);
			settled = lines.join("\n");
			return r;
		},
		applyCompletion: (...a) => real.applyCompletion(...a),
	});
	/** Digita; após cada tecla espera o pedido assíncrono de sugestões daquele texto aplicar-se (render), com prazo. */
	async function type(text: string): Promise<void> {
		for (const ch of text) {
			e.handleInput(ch);
			await new Promise<void>((resolve, reject) => {
				const t = setTimeout(() => reject(new Error(`sem sugestões após ${JSON.stringify(ch)}`)), DEADLINE_MS);
				const check = () => {
					if (settled !== e.getText()) return;
					clearTimeout(t);
					wake = undefined;
					resolve();
				};
				wake = check;
				check();
			});
		}
	}
	return { e, submitted, type, notes };
}

for (const [bare, target] of [
	["config", "settings"],
	["theme", "settings"],
	["tui", "settings"],
] as const) {
	test(`/${bare} + Enter com o menu real aberto roteia ao alias /${target}, não à sugestão fuzzy claude-${bare}`, async () => {
		const { e, submitted, type } = setup();
		await type(`/${bare}`);
		e.handleInput("\r");
		assert.deepEqual(submitted, [`/${target}`]);
	});
}

test("/config com argumentos segue ao config-set", async () => {
	const { e, submitted, type } = setup();
	await type("/config x");
	e.handleInput("\r");
	assert.deepEqual(submitted, ["/config-set x"]);
});

test("comando registrado com o nome exato vence o alias (sombra do usuário)", async () => {
	const { e, submitted, type } = setup([...COMMANDS, "config"]);
	await type("/config");
	e.handleInput("\r");
	assert.deepEqual(submitted, ["/config"]);
});

test("escolha deliberada no menu (↓ até config-set) é respeitada", async () => {
	const { e, submitted, type } = setup();
	await type("/config");
	e.handleInput("\x1b[B");
	e.handleInput("\r");
	assert.deepEqual(submitted, ["/config-set"]);
});

test("completação comum segue nativa: /sess + Enter → /session", async () => {
	const { e, submitted, type } = setup();
	await type("/sess");
	e.handleInput("\r");
	assert.deepEqual(submitted, ["/session"]);
});

test("/exit sem sugestão nativa correspondente vira /quit com um único Enter", async () => {
	const { e, submitted, type } = setup();
	await type("/exit");
	e.handleInput("\r");
	assert.deepEqual(submitted, ["/quit"]);
});

test("/status vai a /session mesmo com o workflow statusline registrado (não rouba o prefixo)", async () => {
	const { e, submitted, type } = setup([...COMMANDS, "statusline"]);
	await type("/status");
	e.handleInput("\r");
	assert.deepEqual(submitted, ["/session"]);
});

test("/continue com argumentos recusa: nada é submetido, rascunho exato volta e avisa", async () => {
	const { e, submitted, type, notes } = setup();
	await type("/continue abc");
	e.handleInput("\r");
	assert.deepEqual(submitted, []);
	assert.equal(e.getText(), "/continue abc");
	assert.deepEqual(notes, [["/continue <sessão> não existe; /resume abre o seletor de sessões.", "warning"]]);
});

test("/copy nu continua nativo com copy e copy-pick registrados", async () => {
	const { e, submitted, type } = setup([...COMMANDS, "copy", "copy-pick"]);
	await type("/copy");
	e.handleInput("\r");
	assert.deepEqual(submitted, ["/copy"]);
});
