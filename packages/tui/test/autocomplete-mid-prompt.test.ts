// Slash-command completion partway through a prompt: "/" after whitespace opens the command list, as many times as the
// user wants in one message, and inserting a match keeps the surrounding text.
import assert from "node:assert";
import { describe, it } from "node:test";
import { CombinedAutocompleteProvider } from "../src/autocomplete.ts";
import { Editor } from "../src/components/editor.ts";
import type { TUI } from "../src/tui.ts";
import { TuiMainScreen } from "../src/tui-main-screen.ts";
import { defaultEditorTheme } from "./test-themes.ts";
import { VirtualTerminal } from "./virtual-terminal.ts";

const COMMANDS = [
	{ name: "commit", description: "Commit" },
	{ name: "compat", description: "Compat map" },
	{ name: "model", description: "Select model" },
	{ name: "session", description: "Session info" },
	{ name: "skill:deep-research", description: "Deep research" },
	{ name: "skill:brainstorm", description: "Ideas" },
];

function provider(): CombinedAutocompleteProvider {
	return new CombinedAutocompleteProvider(COMMANDS, process.cwd());
}

async function suggest(line: string, col = line.length) {
	return provider().getSuggestions([line], 0, col, { signal: new AbortController().signal });
}

describe("CombinedAutocompleteProvider mid-prompt commands", () => {
	it("lists only commands whose name starts with the typed letters", async () => {
		const result = await suggest("rode os testes, depois /com");
		assert.ok(result);
		assert.equal(result.prefix, "/com");
		assert.deepStrictEqual(
			result.items.map((i) => i.value),
			["commit", "compat"],
		);
	});

	it("matches a skill on its bare name and inserts the full name, keeping the text around it", async () => {
		const line = "use /deep agora";
		const col = "use /deep".length;
		const result = await suggest(line, col);
		assert.ok(result);
		assert.deepStrictEqual(
			result.items.map((i) => i.value),
			["skill:deep-research"],
		);
		const applied = provider().applyCompletion([line], 0, col, result.items[0]!, result.prefix);
		assert.equal(applied.lines[0], "use /skill:deep-research agora");
		assert.equal(applied.cursorCol, "use /skill:deep-research ".length);
	});

	it("completes a second command in the same message", async () => {
		const result = await suggest("/skill:deep-research sobre X e /bra");
		assert.ok(result);
		assert.deepStrictEqual(
			result.items.map((i) => i.value),
			["skill:brainstorm"],
		);
	});

	it("keeps no list open for a word no command starts with (a path such as /tm)", async () => {
		assert.equal(await suggest("veja /tm"), null);
	});

	it("leaves argument completion of a leading command alone when no command matches", async () => {
		const p = new CombinedAutocompleteProvider(
			[{ name: "open", getArgumentCompletions: () => [{ value: "/tmp/alpha", label: "alpha" }] }],
			process.cwd(),
		);
		const line = "/open /tm";
		const result = await p.getSuggestions([line], 0, line.length, { signal: new AbortController().signal });
		assert.deepStrictEqual(
			result?.items.map((i) => i.value),
			["/tmp/alpha"],
		);
	});
});

function createTestTUI(): TUI {
	return new TuiMainScreen(new VirtualTerminal(80, 24));
}

async function flushAutocomplete(): Promise<void> {
	await Promise.resolve();
	await new Promise((resolve) => setImmediate(resolve));
}

async function type(editor: Editor, text: string): Promise<void> {
	for (const ch of text) {
		editor.handleInput(ch);
		await flushAutocomplete();
	}
}

describe("Editor mid-prompt command menu", () => {
	it("opens after whitespace, inserts on Enter without submitting, and opens again for a second command", async () => {
		const editor = new Editor(createTestTUI(), defaultEditorTheme);
		const submitted: string[] = [];
		editor.onSubmit = (text) => submitted.push(text);
		editor.setAutocompleteProvider(provider());

		await type(editor, "faça x /mo");
		assert.strictEqual(editor.isShowingAutocomplete(), true);
		editor.handleInput("\r");
		assert.deepStrictEqual(submitted, []);
		assert.strictEqual(editor.getText(), "faça x /model ");

		await type(editor, "e /se");
		assert.strictEqual(editor.isShowingAutocomplete(), true);
		editor.handleInput("\r");
		assert.strictEqual(editor.getText(), "faça x /model e /session ");

		editor.handleInput("\r");
		assert.deepStrictEqual(submitted, ["faça x /model e /session"]);
	});

	it("opens at the start of a later line", async () => {
		const editor = new Editor(createTestTUI(), defaultEditorTheme);
		editor.setAutocompleteProvider(provider());
		editor.setText("primeira linha\n");
		await type(editor, "/bra");
		assert.strictEqual(editor.isShowingAutocomplete(), true);
		editor.handleInput("\r");
		assert.strictEqual(editor.getText(), "primeira linha\n/skill:brainstorm ");
	});

	it("does not open for a slash inside a word", async () => {
		const editor = new Editor(createTestTUI(), defaultEditorTheme);
		editor.setAutocompleteProvider(provider());
		await type(editor, "e/ou /x");
		assert.strictEqual(editor.isShowingAutocomplete(), false);
	});
});
