// Fallback when a Claude settings file points statusLine at a missing or failing command: nycode falls back to its
// built-in statusline launcher instead of hiding the HUD, while an explicit empty own statusLine still turns it off.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExtensionAPI } from "../../../src/core/extensions/types.ts";
import { setManagedSettingsPath } from "../../../src/extensions/_shared/settings/managed-settings.ts";
import statusLine from "../../../src/extensions/status-line/index.ts";
import { statusPendente } from "../../../src/extensions/status-line/rows.ts";

type Handler = (event: unknown, ctx: unknown) => void;

let tmp: string;
let home: string;
let cwd: string;
const savedHome = process.env.HOME;
const savedAgentDir = process.env.NYCODE_CODING_AGENT_DIR;

beforeEach(() => {
	tmp = mkdtempSync(join(tmpdir(), "nycode-statusline-fallback-"));
	home = join(tmp, "home");
	cwd = join(tmp, "cwd");
	mkdirSync(join(home, ".claude"), { recursive: true });
	mkdirSync(cwd, { recursive: true });
	process.env.HOME = home;
	process.env.NYCODE_CODING_AGENT_DIR = join(home, ".nycode", "agent");
	setManagedSettingsPath(join(tmp, "managed-absent.json"));
});

afterEach(() => {
	if (savedHome === undefined) delete process.env.HOME;
	else process.env.HOME = savedHome;
	if (savedAgentDir === undefined) delete process.env.NYCODE_CODING_AGENT_DIR;
	else process.env.NYCODE_CODING_AGENT_DIR = savedAgentDir;
	setManagedSettingsPath(undefined);
	rmSync(tmp, { recursive: true, force: true });
});

function boot(ownStatusLine: unknown) {
	const handlers = new Map<string, Handler[]>();
	let widgetShown = false;
	const nycode = {
		on(name: string, fn: Handler) {
			const list = handlers.get(name) ?? [];
			list.push(fn);
			handlers.set(name, list);
		},
		events: { on() {}, emit() {} },
		getSettings: () => ({ statusLine: ownStatusLine }),
		getThinkingLevel: () => "medium",
	} as unknown as ExtensionAPI;
	statusLine(nycode);
	const ctx = {
		cwd,
		model: { id: "claude-opus-5-5", name: "Claude Opus 5.5", provider: "anthropic" },
		thinkingLevel: "medium",
		ui: {
			theme: { fg: (_c: string, s: string) => s, bold: (s: string) => s },
			setStatus() {},
			setWidget(_key: string, factory: unknown) {
				widgetShown = factory !== undefined;
			},
			notify() {},
		},
		sessionManager: {
			getSessionId: () => "s1",
			getSessionFile: () => undefined,
			getSessionName: () => undefined,
			getBranch: () => [],
		},
		getContextUsage: () => ({ tokens: 0, contextWindow: 200_000, percent: 0 }),
		isProjectTrusted: () => false,
		hasUI: true,
	};
	const started = Promise.all((handlers.get("session_start") ?? []).map((fn) => fn({}, ctx)));
	return {
		started,
		isWidgetShown: () => widgetShown,
		shutdown: () => {
			for (const fn of handlers.get("session_shutdown") ?? []) fn({}, ctx);
		},
	};
}

describe("statusLine fallback on broken Claude settings command", () => {
	it("falls back to the built-in statusline when ~/.claude/settings.json points to a nonexistent script", async () => {
		writeFileSync(
			join(home, ".claude", "settings.json"),
			JSON.stringify({ statusLine: { type: "command", command: join(tmp, "missing-statusline.sh") } }),
		);
		const session = boot(undefined);
		try {
			await vi.waitFor(() => expect(session.isWidgetShown()).toBe(true), { timeout: 5_000 });
		} finally {
			session.shutdown();
		}
	});

	it("does not fall back when nycode's own settings.json explicitly disables statusLine", async () => {
		writeFileSync(
			join(home, ".claude", "settings.json"),
			JSON.stringify({ statusLine: { type: "command", command: join(tmp, "missing-statusline.sh") } }),
		);
		const session = boot({ type: "command", command: "" });
		try {
			await new Promise((resolve) => setTimeout(resolve, 600));
			expect(session.isWidgetShown()).toBe(false);
		} finally {
			session.shutdown();
		}
	});

	// Abertura sem salto (2026-11-24): o widget de status entrava ~300 ms depois do editor e o empurrava para cima no meio
	// da animação. A 1ª execução roda já no session_start e fica pendente até terminar; o cabeçalho espera por ela.
	it("a 1ª execução do script roda no session_start, que espera por ela, e o status fica pendente até terminar", async () => {
		const script = join(tmp, "two-rows.sh");
		writeFileSync(script, "#!/bin/sh\nprintf 'a\\nb\\n'\n", { mode: 0o755 });
		const session = boot({ type: "command", command: script });
		try {
			expect(statusPendente()).toBe(true);
			// session_start waits for it (bounded), so the widget is in before ui installs the editor above it.
			await session.started;
			expect(session.isWidgetShown()).toBe(true);
			expect(statusPendente()).toBe(false);
		} finally {
			session.shutdown();
		}
	});

	it("sem script nada fica pendente", () => {
		const session = boot({ type: "command", command: "" });
		try {
			expect(statusPendente()).toBe(false);
		} finally {
			session.shutdown();
		}
	});
});
