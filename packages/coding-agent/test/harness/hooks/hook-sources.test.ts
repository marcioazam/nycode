// Upstream parity (1.8.0): plugin manifests list hooks as a path, an object or an array of them, merged into
// hooks/hooks.json; a handler declared in several settings files runs once, as the copy from the highest-precedence
// source; a project or local settings hook gets the checkout folder holding its `.claude` as CLAUDE_PROJECT_DIR.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import type { InstalledPlugin } from "../../../src/extensions/_shared/settings/plugins.ts";
import {
	type HookCommand,
	type HooksConfig,
	loadHooks,
	loadPluginHooks,
	settingsSourceStamps,
} from "../../../src/extensions/hooks/config.ts";
import { matchingCommands } from "../../../src/extensions/hooks/matcher.ts";

const tmp = mkdtempSync(join(tmpdir(), "hook-sources-"));
afterAll(() => rmSync(tmp, { recursive: true }));

const write = (file: string, value: unknown): string => {
	mkdirSync(join(file, ".."), { recursive: true });
	writeFileSync(file, JSON.stringify(value));
	return file;
};
const pre = (command: string, extra: Record<string, unknown> = {}) => ({
	hooks: { PreToolUse: [{ matcher: "*", hooks: [{ type: "command", command, ...extra }] }] },
});
const commands = (config: HooksConfig): HookCommand[] => matchingCommands(config.PreToolUse, "bash");

describe("plugin manifest hooks", () => {
	const plugin = (name: string, manifest: Record<string, unknown>): InstalledPlugin => {
		const root = join(tmp, name);
		write(join(root, "hooks", "hooks.json"), pre("default.sh"));
		write(join(root, "extra.json"), pre("extra.sh"));
		return {
			name,
			root,
			dataDir: join(tmp, `${name}-data`),
			manifest,
			enablementKeys: { qualified: `${name}@m`, directory: name },
		};
	};

	it("an array of a path and an inline object adds to hooks/hooks.json", () => {
		const config: HooksConfig = {};
		const inline = pre("inline.sh").hooks;
		loadPluginHooks(config, [plugin("arr", { hooks: ["./extra.json", inline, "./extra.json"] })]);
		expect(commands(config).map((h) => h.command)).toEqual(["default.sh", "extra.sh", "inline.sh"]);
	});

	it("a single path still loads hooks/hooks.json first", () => {
		const config: HooksConfig = {};
		loadPluginHooks(config, [plugin("one", { hooks: "./extra.json" })]);
		expect(commands(config).map((h) => h.command)).toEqual(["default.sh", "extra.sh"]);
	});
});

describe("settings precedence", () => {
	it("a handler in several settings files runs once, as the highest-precedence copy", () => {
		const user = write(join(tmp, "p1", "user.json"), pre("guard.sh"));
		const project = write(join(tmp, "p1", "project.json"), pre("guard.sh", { async: true }));
		const stamps = new Map([
			[user, { sourceRank: 2 }],
			[project, { sourceRank: 1 }],
		]);
		const ran = commands(loadHooks([user, project], undefined, stamps));
		expect(ran).toHaveLength(1);
		expect(ran[0].async).toBeUndefined();
	});

	it("a later, higher-ranked copy replaces an earlier one in place", () => {
		const low = write(join(tmp, "p2", "low.json"), pre("guard.sh", { async: true }));
		const high = write(join(tmp, "p2", "high.json"), pre("guard.sh"));
		const stamps = new Map([
			[low, { sourceRank: 1 }],
			[high, { sourceRank: 2 }],
		]);
		const ran = commands(loadHooks([low, high], undefined, stamps));
		expect(ran).toHaveLength(1);
		expect(ran[0].async).toBeUndefined();
	});
});

describe("CLAUDE_PROJECT_DIR per settings source", () => {
	it("project and local hooks get the folder that holds their .claude; others get none", () => {
		const repo = join(tmp, "repo");
		const sub = join(repo, "pkg");
		mkdirSync(join(repo, ".git"), { recursive: true });
		mkdirSync(sub, { recursive: true });
		const stamps = settingsSourceStamps(sub, join(tmp, "home"), true);
		const local = [...stamps.entries()].find(([file]) => file === join(repo, ".claude", "settings.local.json"));
		const shared = [...stamps.entries()].find(([file]) => file === join(sub, ".claude", "settings.json"));
		expect(local?.[1].projectDir).toBe(repo);
		expect(shared?.[1].projectDir).toBe(sub);
		const ranks = [...stamps.values()].map((stamp) => stamp.sourceRank);
		expect(ranks).toEqual([...ranks].sort((a, b) => (a ?? 0) - (b ?? 0)));
	});
});
