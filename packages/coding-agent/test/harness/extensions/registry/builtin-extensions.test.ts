// K5: extensions/index.ts holds one registration line per embedded nycode extension. The registry must list them, each as a
// built-in with a factory, once, in the order the K5 block keeps: claude-rules first, the rest after the third-party-style
// built-ins (llama.cpp, codemode, tool-search, mcp).
import { describe, expect, it } from "vitest";
import { builtInExtensions } from "../../../../src/extensions/index.ts";

const entries = builtInExtensions.flatMap((extension) => (typeof extension === "function" ? [] : [extension]));
const names = entries.map((extension) => extension.name);

describe("embedded extension registry (K5)", () => {
	it("lists the embedded nycode extensions", () => {
		for (const name of [
			"claude-rules",
			"auto-resume",
			"bash-main-guard",
			"bypass-permissions",
			"chat-margin",
			"claude-compat",
			"hooks",
			"image-open",
			"status-line",
			"subagent",
			"todo",
			"web",
		]) {
			expect(names, `registration line of ${name}`).toContain(name);
		}
	});

	it("registers each extension once, as a built-in with a factory", () => {
		expect(entries.length, "every entry is named").toBe(builtInExtensions.length);
		expect(new Set(names).size).toBe(names.length);
		for (const extension of entries) {
			expect(extension.builtin, extension.name).toBe(true);
			expect(typeof extension.factory, extension.name).toBe("function");
		}
	});

	it("runs the todo turn check after the completion-gate and plan-gate, so it sees their drafts", () => {
		expect(names.indexOf("todo-turn-check")).toBeGreaterThan(names.indexOf("completion-gate"));
		expect(names.indexOf("todo-turn-check")).toBeGreaterThan(names.indexOf("plan-gate"));
	});

	it("keeps claude-rules ahead of the other embedded nycode extensions", () => {
		expect(names.indexOf("claude-rules")).toBeLessThan(names.indexOf("status-line"));
		expect(names.indexOf("mcp")).toBeLessThan(names.indexOf("claude-rules"));
	});
});
