// Ports the pre-migration harness: extensions/ui-visual/test/index.test.ts to vitest.
import assert from "node:assert/strict";
import { test } from "vitest";
import type { ExtensionAPI } from "../../../../src/core/extensions/types.ts";
import { icon } from "../../../../src/extensions/ui-visual/icons.ts";
import index from "../../../../src/extensions/ui-visual/index.ts";

test("session_start aplica terminal.nerdFont / asciiIcons dos settings aos ícones", () => {
	const starts: Array<() => void> = [];
	let settings: unknown = { terminal: { nerdFont: true } };
	index({
		on: (name: string, fn: () => void) => {
			if (name === "session_start") starts.push(fn);
		},
		registerToolRenderer: () => {},
		getSettings: () => settings,
	} as unknown as ExtensionAPI);
	// The settings handler is registered first, before the header/working parts.
	const start = starts[0];
	assert.ok(start);
	start();
	assert.equal(icon("ok", {}), "\uf42e");
	settings = { terminal: { nerdFont: true, asciiIcons: true } };
	start();
	assert.equal(icon("ok", {}), "+"); // ASCII wins over Nerd Font
	settings = {};
	start();
	assert.equal(icon("ok", {}), "✓");
});
