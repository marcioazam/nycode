// D-62: nycode's user scope is its agent directory. The home directory of another tool is never read, the home
// directory is never a project, and nycode's own settings.json is the user file of the settings chain.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExtensionAPI, ExtensionContext } from "../../../src/core/extensions/types.ts";
import { ancestorDirs, findNearestDir, isHome } from "../../../src/extensions/_shared/project/project-root.ts";
import { managedSettingsPath } from "../../../src/extensions/_shared/settings/managed-settings.ts";
import { claudeSettingsChain, userSettingsFiles } from "../../../src/extensions/_shared/settings/settings-chain.ts";
import contextImportsExtension from "../../../src/extensions/context-imports/index.ts";
import { hookSourceFiles } from "../../../src/extensions/hooks/config.ts";

let root: string;
let home: string;
let agentDir: string;

const write = (file: string, text: string): void => {
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, text);
};

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), "nycode-user-scope-"));
	home = join(root, "home");
	agentDir = join(home, ".nycode", "agent");
	mkdirSync(agentDir, { recursive: true });
	vi.stubEnv("HOME", home);
	vi.stubEnv("NYCODE_CODING_AGENT_DIR", agentDir);
});
afterEach(() => {
	vi.unstubAllEnvs();
	rmSync(root, { recursive: true, force: true });
});

describe("settings chain", () => {
	it("the user file is nycode's settings.json, and the home directory adds no project files", () => {
		write(join(home, ".claude", "settings.json"), "{}");
		expect(userSettingsFiles()).toEqual([join(agentDir, "settings.json")]);
		expect(claudeSettingsChain(home, home, true)).toEqual([join(agentDir, "settings.json")]);
		const project = join(home, "work");
		mkdirSync(project, { recursive: true });
		expect(claudeSettingsChain(project, home, true)).toContain(join(project, ".claude", "settings.json"));
	});

	it("loadHooks skips nycode's own settings.json, whose hooks loadSettingsHooks already merges", () => {
		const project = join(home, "work", ".claude", "settings.json");
		expect(hookSourceFiles([join(agentDir, "settings.json"), project])).toEqual([project]);
	});
});

describe("project walks", () => {
	it("never find configuration in the home directory", () => {
		mkdirSync(join(home, ".claude", "rules"), { recursive: true });
		mkdirSync(join(home, ".agents", "skills"), { recursive: true });
		expect(isHome(home)).toBe(true);
		expect(ancestorDirs(home, join(".claude", "rules"))).toEqual([]);
		expect(ancestorDirs(home, join(".agents", "skills"))).toEqual([]);
		expect(findNearestDir(home, join(".claude", "rules"))).toBeNull();
		const repo = join(home, "repo");
		mkdirSync(join(repo, ".git"), { recursive: true });
		mkdirSync(join(repo, ".claude", "rules"), { recursive: true });
		expect(ancestorDirs(repo, join(".claude", "rules"))).toEqual([join(repo, ".claude", "rules")]);
	});
});

describe("managed settings", () => {
	it.each([
		["linux", "/etc/nycode/managed-settings.json"],
		["darwin", "/Library/Application Support/Nycode/managed-settings.json"],
		["win32", String.raw`C:\Program Files\Nycode\managed-settings.json`],
	] as const)("%s reads nycode's own policy file", (platform, file) => {
		expect(managedSettingsPath(platform)).toBe(file);
	});
});

describe("user CLAUDE.md", () => {
	type Handler = (event: unknown, ctx: ExtensionContext) => unknown;

	/** The system prompt context-imports returns for a session in `cwd`, or "" when it adds nothing. */
	async function prompt(cwd: string, native: Array<{ path: string; content: string }>): Promise<string> {
		const handlers = new Map<string, Handler>();
		contextImportsExtension({
			on: (name: string, fn: Handler) => handlers.set(name, fn),
			events: { emit: () => {}, on: () => () => {} },
			registerFlag: () => {},
			getFlag: () => undefined,
		} as unknown as ExtensionAPI);
		const ctx = { cwd, hasUI: false, isProjectTrusted: () => false, ui: { notify: () => {} } };
		await handlers.get("session_start")?.({ reason: "startup" }, ctx as unknown as ExtensionContext);
		const base = native.map((f) => `<project_instructions path="${f.path}">\n${f.content}\n</project_instructions>`);
		const result = await handlers.get("before_agent_start")?.(
			{ systemPrompt: base.join("\n"), systemPromptOptions: { cwd, contextFiles: native } },
			ctx as unknown as ExtensionContext,
		);
		return (result as { systemPrompt?: string } | undefined)?.systemPrompt ?? base.join("\n");
	}

	it("is read from the agent directory beside its AGENTS.md, never from another tool's home", async () => {
		write(join(agentDir, "AGENTS.md"), "agents body\n");
		write(join(agentDir, "CLAUDE.md"), "nycode memory body\n");
		write(join(home, ".claude", "CLAUDE.md"), "other tool body\n");
		const cwd = join(home, "work");
		mkdirSync(cwd, { recursive: true });
		const text = await prompt(cwd, [{ path: join(agentDir, "AGENTS.md"), content: "agents body\n" }]);
		expect(text).toContain("nycode memory body");
		expect(text).not.toContain("other tool body");
	});

	it("is not repeated when nycode already loads it as the agent directory's context file", async () => {
		write(join(agentDir, "CLAUDE.md"), "nycode memory body\n");
		const cwd = join(home, "work");
		mkdirSync(cwd, { recursive: true });
		const text = await prompt(cwd, [{ path: join(agentDir, "CLAUDE.md"), content: "nycode memory body\n" }]);
		expect(text.split("nycode memory body").length - 1).toBe(1);
	});
});
