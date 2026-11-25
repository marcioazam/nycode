// Upstream parity (1.10.0): /claude-plugins lists cached plugins with the deciding source and toggles them in the
// user settings.json, keeping every other key.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ExtensionAPI } from "../../../src/core/extensions/types.ts";
import { pluginStates, setPluginEnabled } from "../../../src/extensions/_shared/settings/plugins.ts";
import { registerPluginsCommand } from "../../../src/extensions/skills-compat/plugins-command.ts";

const tmp = mkdtempSync(join(tmpdir(), "claude-plugins-"));
const savedAgentDir = process.env.NYCODE_CODING_AGENT_DIR;
const agentDir = join(tmp, "agent");
const settingsFile = join(agentDir, "settings.json");
const write = (file: string, text: string): void => {
	mkdirSync(join(file, ".."), { recursive: true });
	writeFileSync(file, text);
};

beforeAll(() => {
	process.env.NYCODE_CODING_AGENT_DIR = agentDir;
	write(settingsFile, JSON.stringify({ theme: "dark", enabledPlugins: { "on@mk": true } }));
	write(join(agentDir, "plugins", "cache", "mk", "on", "1.0.0", ".claude-plugin", "plugin.json"), "{}");
	write(
		join(agentDir, "plugins", "cache", "mk", "off", "1.0.0", ".claude-plugin", "plugin.json"),
		JSON.stringify({ defaultEnabled: false }),
	);
});
afterAll(() => {
	if (savedAgentDir === undefined) delete process.env.NYCODE_CODING_AGENT_DIR;
	else process.env.NYCODE_CODING_AGENT_DIR = savedAgentDir;
	rmSync(tmp, { recursive: true });
});

describe("/claude-plugins", () => {
	it("reports each plugin with the source that decided it", () => {
		expect(pluginStates().sort((a, b) => a.qualified.localeCompare(b.qualified))).toEqual([
			{ qualified: "off@mk", enabled: false, decidedBy: "default" },
			{ qualified: "on@mk", enabled: true, decidedBy: "user" },
		]);
	});

	it("saves a toggle in the user settings.json, keeping the other keys", () => {
		setPluginEnabled("off@mk", true);
		expect(JSON.parse(readFileSync(settingsFile, "utf-8"))).toEqual({
			theme: "dark",
			enabledPlugins: { "on@mk": true, "off@mk": true },
		});
		expect(pluginStates().find((s) => s.qualified === "off@mk")).toEqual({
			qualified: "off@mk",
			enabled: true,
			decidedBy: "user",
		});
	});

	it("refuses to rewrite a settings file that does not parse", () => {
		const saved = readFileSync(settingsFile, "utf-8");
		writeFileSync(settingsFile, "{ broken");
		expect(() => setPluginEnabled("on@mk", false)).toThrow();
		expect(readFileSync(settingsFile, "utf-8")).toBe("{ broken");
		writeFileSync(settingsFile, saved);
	});

	it("prints the list outside the TUI", async () => {
		let handler: ((args: string, ctx: unknown) => Promise<void>) | undefined;
		registerPluginsCommand({
			registerCommand: (_name: string, spec: { handler: typeof handler }) => {
				handler = spec.handler;
			},
		} as unknown as ExtensionAPI);
		const notes: string[] = [];
		await handler?.("", { mode: "print", ui: { notify: (text: string) => notes.push(text) } });
		expect(notes[0]).toContain("● on@mk: on (user settings)");
	});
});
