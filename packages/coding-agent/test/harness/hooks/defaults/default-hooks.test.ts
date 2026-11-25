// The hooks nycode registers by default (settings-defaults.ts `hooks`): the hooks extension, started on default
// settings. The permission guard is native (gate.ts), not a hook, so no PreToolUse hook is registered by default, and
// the ralph-loop Stop hook is not a default either (ralph-stop.test.ts).
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExtensionAPI, ExtensionContext } from "../../../../src/core/extensions/types.ts";
import { SETTINGS_DEFAULTS } from "../../../../src/core/settings-defaults.ts";
import hooksExtension from "../../../../src/extensions/hooks/index.ts";
import { internalHookNames } from "../../../../src/extensions/hooks/internal/registry.ts";

type Handler = (event: unknown, ctx: ExtensionContext) => unknown;
interface Command {
	handler: (args: string, ctx: ExtensionContext) => Promise<void>;
}

let home: string;
let savedHome: string | undefined;

beforeEach(() => {
	savedHome = process.env.HOME;
	home = mkdtempSync(join(tmpdir(), "defhooks-"));
	process.env.HOME = home; // the user settings of the chain are this home's ~/.nycode/agent/settings.json
});

afterEach(() => {
	if (savedHome === undefined) delete process.env.HOME;
	else process.env.HOME = savedHome;
	rmSync(home, { recursive: true });
});

interface SessionOptions {
	/** The settings.json of ~/.nycode/agent (the global one); `settings` is the merged view the extension gets. */
	global?: Record<string, unknown>;
	/** A project directory with this `.claude/settings.json`, trusted by the user. */
	projectClaude?: Record<string, unknown>;
}

const writeJson = (file: string, value: unknown) => {
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, JSON.stringify(value));
};

/** Starts a session on `settings` and returns the `/hooks` summary. */
async function startSession(settings: { hooks?: Record<string, unknown> } = {}, options: SessionOptions = {}) {
	const handlers = new Map<string, Handler>();
	const commands = new Map<string, Command>();
	const api = {
		on: (name: string, fn: Handler) => handlers.set(name, fn),
		events: { on: () => () => {}, emit: () => {} },
		sendMessage: () => {},
		registerCommand: (name: string, command: Command) => commands.set(name, command),
		getSettings: () => settings,
	};
	hooksExtension(api as unknown as ExtensionAPI);
	const notify = vi.fn();
	if (options.global) writeJson(join(home, ".nycode", "agent", "settings.json"), options.global);
	const project = join(home, "project");
	if (options.projectClaude) writeJson(join(project, ".claude", "settings.json"), options.projectClaude);
	const trusted = options.projectClaude !== undefined;
	const ctx = {
		cwd: trusted ? project : home,
		hasUI: trusted,
		isProjectTrusted: () => trusted,
		ui: { notify, confirm: async () => true },
		sessionManager: { getSessionId: () => "s1", getSessionFile: () => undefined },
		abort: () => {},
	} as unknown as ExtensionContext;
	await handlers.get("session_start")?.({ reason: "startup" }, ctx);
	const summary = async (): Promise<string> => {
		notify.mockClear();
		await commands.get("hooks")?.handler("", ctx);
		return String(notify.mock.calls[0]?.[0]);
	};
	return { summary, notify };
}

describe("default hooks", () => {
	it("registers the core-notes internal hook on SessionStart and PostToolUse, and no Stop hook", async () => {
		const text = await (await startSession()).summary();
		expect(text).toMatch(/SessionStart:\n {2}\[startup\|resume\|clear\|compact\] internal: core-notes/);
		expect(text).toMatch(/PostToolUse:\n {2}\[\*\] internal: core-notes/);
		expect(text).not.toContain("Stop:");
		expect(text).not.toContain("hook-dispatch");
		expect(text).not.toContain("impeccable_gate");
		expect(text).not.toContain("ralph-loop");
	});

	it("registers no PreToolUse or graph-context hook by default (the native gate guards, codegraph is not embedded)", async () => {
		const text = await (await startSession()).summary();
		expect(text).not.toContain("PreToolUse:");
		expect(text).not.toContain("guard.py");
		expect(text).not.toContain("graph-context");
		expect(text).not.toContain("SubagentStart:");
	});

	it("an internal hook with an unknown name is reported and never runs", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const bad = { type: "internal", name: "nope" };
		const text = await (await startSession({ hooks: { SessionStart: [{ hooks: [bad] }] } })).summary();
		expect(warn.mock.calls.flat().join("\n")).toContain('"nope" is not a core hook');
		expect(text).toContain("internal: nope");
		warn.mockRestore();
	});

	it("every default hook names a core hook that is registered", () => {
		const hooks = Object.values(SETTINGS_DEFAULTS.hooks).flatMap((matchers) => matchers.flatMap((m) => m.hooks));
		expect(hooks.length).toBe(2);
		for (const hook of hooks) {
			expect(hook.type).toBe("internal");
			expect(internalHookNames(), hook.name).toContain(hook.name);
		}
	});

	it("other events of the settings still replace their default", async () => {
		const session = await startSession({ hooks: { Stop: [{ hooks: [{ type: "command", command: "true" }] }] } });
		const text = await session.summary();
		expect(text).toContain("Stop:\n  [*] command: true");
		expect(text).toContain("SessionStart:");
	});

	it("disableAllHooks, in a project file or in the user's own, turns every default hook off", async () => {
		const project = await startSession({}, { projectClaude: { disableAllHooks: true } });
		expect(await project.summary()).not.toContain("SessionStart:");
		const user = await startSession({}, { global: { disableAllHooks: true } });
		expect(await user.summary()).not.toContain("SessionStart:");
	});
});
