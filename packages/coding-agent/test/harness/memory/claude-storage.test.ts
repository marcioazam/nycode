// Upstream parity (1.9.0): `autoMemoryStorage: "claude"` reads and writes the memory store Claude Code keeps for the
// project (<claude config>/projects/<slug>/memory), in place; anything else keeps Nycode's own store.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import {
	claudeFrontmatter,
	claudeProjectSlug,
	memoryStorageSetting,
} from "../../../src/extensions/memory/claude-store.ts";
import { memoryDir, readMemorySettings, resolveMemoryDir } from "../../../src/extensions/memory/index.ts";

const tmp = mkdtempSync(join(tmpdir(), "memory-claude-"));
const savedConfig = process.env.CLAUDE_CONFIG_DIR;
afterEach(() => {
	if (savedConfig === undefined) delete process.env.CLAUDE_CONFIG_DIR;
	else process.env.CLAUDE_CONFIG_DIR = savedConfig;
});
afterAll(() => rmSync(tmp, { recursive: true }));

describe("autoMemoryStorage", () => {
	it("Claude Code's project slug: every non-alphanumeric becomes a dash; long names get a hash", () => {
		expect(claudeProjectSlug("/srv/proj/app-x")).toBe("-srv-proj-app-x");
		expect(claudeProjectSlug("/x/26宁波")).toBe("-x-26--");
		const long = claudeProjectSlug(`/${"a".repeat(300)}`);
		expect(long.startsWith(`-${"a".repeat(199)}-`)).toBe(true);
	});

	it("only 'claude' selects Claude Code's store; a typo keeps Nycode's", () => {
		expect(memoryStorageSetting(" Claude ")).toBe("claude");
		expect(memoryStorageSetting("claud")).toBe("nycode");
		expect(memoryStorageSetting(undefined)).toBe("nycode");
	});

	it("the claude store lives under the Claude config dir, keyed on the repository root", () => {
		const repo = join(tmp, "repo");
		mkdirSync(join(repo, ".git"), { recursive: true });
		mkdirSync(join(repo, "pkg"), { recursive: true });
		process.env.CLAUDE_CONFIG_DIR = join(tmp, "claude");
		expect(resolveMemoryDir(join(repo, "pkg"), undefined, "claude")).toBe(
			join(tmp, "claude", "projects", claudeProjectSlug(repo), "memory"),
		);
		expect(resolveMemoryDir(join(repo, "pkg"))).toBe(memoryDir(join(repo, "pkg")));
		// An explicit autoMemoryDirectory still wins.
		expect(resolveMemoryDir(repo, join(tmp, "own"), "claude")).toBe(join(tmp, "own"));
	});

	it("the setting merges across the settings chain like the other memory keys", () => {
		const file = join(tmp, "settings.json");
		writeFileSync(file, JSON.stringify({ autoMemoryStorage: "claude" }));
		expect(readMemorySettings([file], {}).autoMemoryStorage).toBe("claude");
	});

	it("a save into Claude's store carries the frontmatter Claude Code's recall reads", () => {
		expect(claudeFrontmatter("corpo", "nota", "uma: descrição")).toBe(
			'---\nname: nota\ndescription: "uma: descrição"\n---\n\ncorpo',
		);
		expect(claudeFrontmatter("---\ntype: user\n---\ncorpo", "n", "d")).toBe(
			'---\nname: n\ndescription: "d"\nmetadata:\n  type: user\n---\ncorpo',
		);
		expect(claudeFrontmatter("---\nname: x\ndescription: y\n---\nc", "n", "d")).toBe(
			"---\nname: x\ndescription: y\n---\nc",
		);
	});
});
