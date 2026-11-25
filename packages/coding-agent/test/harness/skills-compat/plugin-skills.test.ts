// Upstream parity (1.10.0): plugin skills keep Claude Code's namespace. They are not handed to the skill loader
// (which names them `/skill:<dir>`); they register as `/<plugin>:<skill>` and expand with the plugin's variables.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ExtensionAPI } from "../../../src/core/extensions/types.ts";
import skillsExtension, { skillDirs } from "../../../src/extensions/skills-compat/index.ts";
import { findPluginSkill, pluginSkills } from "../../../src/extensions/skills-compat/plugin-skills.ts";

const tmp = mkdtempSync(join(tmpdir(), "plugin-skills-"));
const savedAgentDir = process.env.NYCODE_CODING_AGENT_DIR;
const agentDir = join(tmp, "agent");
const root = join(agentDir, "plugins", "cache", "mk", "demo", "1.0.0");
const write = (file: string, text: string): void => {
	mkdirSync(join(file, ".."), { recursive: true });
	writeFileSync(file, text);
};

beforeAll(() => {
	process.env.NYCODE_CODING_AGENT_DIR = agentDir;
	write(join(agentDir, "settings.json"), JSON.stringify({ enabledPlugins: { "demo@mk": true } }));
	write(join(root, ".claude-plugin", "plugin.json"), JSON.stringify({ name: "demo" }));
	write(
		join(root, "skills", "hello", "SKILL.md"),
		`---\ndescription: diz oi\n---\nOi $ARGUMENTS de $${"{"}CLAUDE_PLUGIN_ROOT}\n`,
	);
	write(join(root, "skills", "dir-name", "SKILL.md"), "---\nname: own-name\ndescription: d\n---\ncorpo\n");
	write(join(root, "skills", "private", "SKILL.md"), "---\ndescription: d\ndisable-model-invocation: true\n---\nx\n");
});
afterAll(() => {
	if (savedAgentDir === undefined) delete process.env.NYCODE_CODING_AGENT_DIR;
	else process.env.NYCODE_CODING_AGENT_DIR = savedAgentDir;
	rmSync(tmp, { recursive: true });
});

describe("plugin skills", () => {
	it("are named plugin:skill, with the directory as an alias when the frontmatter renames it", () => {
		const skills = pluginSkills(join(tmp, "home"));
		expect(skills.map((s) => s.name).sort()).toEqual(["demo:hello", "demo:own-name", "demo:private"]);
		expect(findPluginSkill(skills, "demo:dir-name")?.name).toBe("demo:own-name");
	});

	it("are no longer handed to the skill loader", () => {
		expect(skillDirs(tmp, join(tmp, "home"), false).some((dir) => dir.startsWith(root))).toBe(false);
	});

	it("register /plugin:skill, expand with the plugin variables, and list model-invocable ones in plugin_skill", async () => {
		const commands = new Map<string, { handler: (args: string, ctx: unknown) => Promise<void> }>();
		const tools: Array<{ name: string; description: string; execute: (...a: unknown[]) => Promise<unknown> }> = [];
		const sent: string[] = [];
		const handlers = new Map<string, (event: unknown, ctx: unknown) => unknown>();
		const api = {
			on: (name: string, handler: (event: unknown, ctx: unknown) => unknown) => handlers.set(name, handler),
			events: { on: () => () => {}, emit: () => {} },
			registerCommand: (name: string, spec: { handler: (args: string, ctx: unknown) => Promise<void> }) =>
				commands.set(name, spec),
			registerTool: (tool: (typeof tools)[number]) => tools.push(tool),
			getCommands: () => [],
			sendUserMessage: (text: string) => sent.push(text),
			getSettings: () => ({}),
		};
		skillsExtension(api as unknown as ExtensionAPI);
		const ctx = {
			cwd: tmp,
			hasUI: false,
			isIdle: () => true,
			ui: { notify() {} },
			sessionManager: { getEntries: () => [], getBranch: () => [] },
			isProjectTrusted: () => false,
		};
		await handlers.get("session_start")?.({}, ctx);
		expect([...commands.keys()].filter((name) => name.includes(":")).sort()).toEqual([
			"demo:hello",
			"demo:own-name",
			"demo:private",
		]);
		await commands.get("demo:hello")?.handler("mundo", ctx);
		expect(sent[0]).toContain(`Oi mundo de ${root}`);
		const tool = tools.find((t) => t.name === "plugin_skill");
		expect(tool?.description).toContain("/demo:hello");
		expect(tool?.description).not.toContain("/demo:private");
		const result = (await tool?.execute("id", { command: "/demo:dir-name" }, undefined, undefined, ctx)) as {
			content: Array<{ text: string }>;
		};
		expect(result.content[0].text).toContain("corpo");
	});
});
