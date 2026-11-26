// The `env` nycode applies by default (settings-defaults.ts) and the settings.json entry that overrides it.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ExtensionAPI, ExtensionContext } from "../../../src/core/extensions/types.ts";
import envSettingsExtension from "../../../src/extensions/env-settings/index.ts";

type Handler = (event: unknown, ctx: ExtensionContext) => unknown;

const KEYS = ["EIO_BACKEND", "PONYTAIL_SUBAGENT_MATCHER", "PONYTAIL_QUIET_STARTUP"];
const savedHome = process.env.HOME;
const saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));
let home: string;
// An empty HOME: the user's own ~/.claude/settings.json must not decide what the defaults export.
beforeEach(() => {
	home = mkdtempSync(join(tmpdir(), "default-env-"));
	process.env.HOME = home;
});
afterEach(() => {
	process.env.HOME = savedHome;
	rmSync(home, { recursive: true });
	for (const key of KEYS) {
		const value = saved[key];
		if (value === undefined) delete process.env[key];
		else process.env[key] = value;
	}
});

function load(settings: { env?: Record<string, string> }) {
	const handlers = new Map<string, Handler>();
	const api = { on: (name: string, fn: Handler) => handlers.set(name, fn), getSettings: () => settings };
	envSettingsExtension(api as unknown as ExtensionAPI);
	const ctx = { cwd: process.cwd(), isProjectTrusted: () => false } as unknown as ExtensionContext;
	return {
		start: () => handlers.get("session_start")?.({}, ctx),
		stop: () => handlers.get("session_shutdown")?.({}, ctx),
	};
}

describe("default env", () => {
	it("exports EIO_BACKEND=posix when the extension loads, and hands the shell's value back at shutdown", () => {
		process.env.EIO_BACKEND = "epoll";
		const session = load({});
		expect(process.env.EIO_BACKEND).toBe("posix");
		session.start();
		expect(process.env.EIO_BACKEND).toBe("posix");
		session.stop();
		expect(process.env.EIO_BACKEND).toBe("epoll");
	});

	it("a settings.json env entry overrides the default once the session starts", () => {
		const session = load({ env: { EIO_BACKEND: "linux-aio" } });
		session.start();
		expect(process.env.EIO_BACKEND).toBe("linux-aio");
		session.stop();
	});

	// D-54: ponytail is on by default with quiet startup; the subagent matcher is derived by the extension, not a default.
	it("exports the ponytail quiet-startup default and no subagent matcher", () => {
		delete process.env.PONYTAIL_SUBAGENT_MATCHER;
		delete process.env.PONYTAIL_QUIET_STARTUP;
		load({});
		expect(process.env.PONYTAIL_QUIET_STARTUP).toBe("1");
		expect(process.env.PONYTAIL_SUBAGENT_MATCHER).toBeUndefined();
	});

	it("a settings.json env entry sets the ponytail matcher override", () => {
		const session = load({ env: { PONYTAIL_SUBAGENT_MATCHER: "general|plan" } });
		session.start();
		expect(process.env.PONYTAIL_SUBAGENT_MATCHER).toBe("general|plan");
		session.stop();
	});
});
