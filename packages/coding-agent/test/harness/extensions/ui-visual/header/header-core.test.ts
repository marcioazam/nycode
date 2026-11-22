// Ports import/ny-pi/extensions/ui-visual/test/header.test.ts to vitest.
import assert from "node:assert/strict";
import { homedir } from "node:os";
import { join } from "node:path";
import { test } from "vitest";
import type { ExtensionAPI } from "../../../../../src/core/extensions/types.ts";
import header from "../../../../../src/extensions/ui-visual/header.ts";
import { initTheme } from "../../../../../src/modes/interactive/theme/theme.ts";

initTheme("dark"); // o logo do core lê a cor do tema global

const _theme = { fg: (_k: string, s: string) => s, bold: (s: string) => s };
const _parts = {
	version: "v1.5.2",
	model: "claude-opus-4-7",
	cwd: join(homedir(), "proj"),
	branch: "main",
	thinking: "high",
	context: "200k",
};

function setup(hasUI: boolean, env: Record<string, string>) {
	const keys = ["NO_COLOR", "NYCODE_SUBAGENT"];
	const saved = keys.map((k) => process.env[k]);
	for (const k of keys) delete process.env[k];
	Object.assign(process.env, env);
	let handler: any;
	const calls: any[] = [];
	header({
		on: (_n: string, h: unknown) => {
			handler = h;
		},
		getThinkingLevel: () => "medium",
	} as unknown as ExtensionAPI);
	const ctx = {
		hasUI,
		cwd: "/tmp",
		model: { id: "m1", reasoning: true, contextWindow: 200000 } as any,
		ui: { setHeader: (f: unknown) => calls.push(f) },
	};
	handler({}, ctx);
	for (const [i, k] of keys.entries()) {
		const v = saved[i];
		if (v === undefined) delete process.env[k];
		else process.env[k] = v;
	}
	return { calls, ctx };
}

test("sem UI, em subagente ou com NO_COLOR não há cabeçalho", () => {
	assert.equal(setup(false, {}).calls.length, 0);
	assert.equal(setup(true, { NYCODE_SUBAGENT: "1" }).calls.length, 0);
	assert.equal(setup(true, { NO_COLOR: "1" }).calls.length, 0);
});
