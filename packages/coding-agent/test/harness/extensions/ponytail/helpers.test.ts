// Ported from DietrichGebert/ponytail v5.3.3 (MIT; its helpers and subagent tests): the pure helpers of the
// embedded ponytail extension, with the config file under XDG_CONFIG_HOME in a temp directory.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	getDefaultMode,
	getHideStatus,
	getQuietStartup,
	isDeactivationCommand,
	normalizeMode,
	writeDefaultMode,
} from "../../../../src/extensions/ponytail/config.ts";
import {
	childMode,
	childTools,
	parsePonytailCommand,
	resolveSessionMode,
	subagentName,
} from "../../../../src/extensions/ponytail/index.ts";
import { filterSkillBodyForMode, getPonytailInstructions } from "../../../../src/extensions/ponytail/instructions.ts";

const KEYS = ["XDG_CONFIG_HOME", "PONYTAIL_DEFAULT_MODE", "PONYTAIL_QUIET_STARTUP", "PONYTAIL_HIDE_STATUS"];
const saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));
let xdg: string;
beforeEach(() => {
	for (const key of KEYS) delete process.env[key];
	xdg = mkdtempSync(join(tmpdir(), "ponytail-xdg-"));
	process.env.XDG_CONFIG_HOME = xdg;
});
afterEach(() => {
	for (const key of KEYS) {
		const value = saved[key];
		if (value === undefined) delete process.env[key];
		else process.env[key] = value;
	}
	rmSync(xdg, { recursive: true });
});

const writeConfig = (config: unknown) => {
	mkdirSync(join(xdg, "ponytail"), { recursive: true });
	writeFileSync(join(xdg, "ponytail", "config.json"), JSON.stringify(config));
};

describe("parsePonytailCommand", () => {
	it("a bare command turns it on at the default, full when the default is off, status when already on", () => {
		expect(parsePonytailCommand("", "off", null)).toEqual({ type: "set-mode", mode: "full" });
		expect(parsePonytailCommand("", "lite", "off")).toEqual({ type: "set-mode", mode: "lite" });
		expect(parsePonytailCommand("", "full", "ultra")).toEqual({ type: "status" });
	});

	it("parses levels, status and the default subcommand; review is never a default", () => {
		expect(parsePonytailCommand("ULTRA", "full", null)).toEqual({ type: "set-mode", mode: "ultra" });
		expect(parsePonytailCommand("status", "full", null)).toEqual({ type: "status" });
		expect(parsePonytailCommand("default lite", "full", null)).toEqual({ type: "set-default", mode: "lite" });
		expect(parsePonytailCommand("default review", "full", null)).toEqual({ type: "invalid" });
		expect(parsePonytailCommand("loud", "full", null)).toEqual({ type: "invalid" });
	});
});

describe("resolveSessionMode", () => {
	it("takes the latest persisted mode, honoring review, else the fallback", () => {
		const entry = (mode: string) => ({ type: "custom", customType: "ponytail-mode", data: { mode } });
		expect(resolveSessionMode([entry("lite"), { type: "message" }, entry("ultra")], "full")).toBe("ultra");
		expect(resolveSessionMode([entry("review")], "full")).toBe("review");
		expect(resolveSessionMode([entry("nonsense")], "lite")).toBe("lite");
		expect(resolveSessionMode(undefined, "lite")).toBe("lite");
	});
});

describe("config", () => {
	it("resolves the default mode from the env, then the config file, then full; review never", () => {
		expect(getDefaultMode()).toBe("full");
		expect(writeDefaultMode("lite")).toBe("lite");
		expect(JSON.parse(readFileSync(join(xdg, "ponytail", "config.json"), "utf8"))).toEqual({ defaultMode: "lite" });
		expect(getDefaultMode()).toBe("lite");
		process.env.PONYTAIL_DEFAULT_MODE = "ULTRA";
		expect(getDefaultMode()).toBe("ultra");
		process.env.PONYTAIL_DEFAULT_MODE = "review";
		expect(getDefaultMode()).toBe("lite");
		expect(writeDefaultMode("review")).toBeNull();
	});

	it("writeDefaultMode keeps the other keys of the config file", () => {
		writeConfig({ quietStartup: true });
		writeDefaultMode("ultra");
		expect(JSON.parse(readFileSync(join(xdg, "ponytail", "config.json"), "utf8"))).toEqual({
			quietStartup: true,
			defaultMode: "ultra",
		});
	});

	it("quiet startup and hide status: the env wins (0/false/no/empty are off), else the config key", () => {
		expect([getQuietStartup(), getHideStatus()]).toEqual([false, false]);
		writeConfig({ quietStartup: true, hideStatus: true });
		expect([getQuietStartup(), getHideStatus()]).toEqual([true, true]);
		process.env.PONYTAIL_QUIET_STARTUP = "0";
		process.env.PONYTAIL_HIDE_STATUS = "false";
		expect([getQuietStartup(), getHideStatus()]).toEqual([false, false]);
		process.env.PONYTAIL_QUIET_STARTUP = "1";
		expect(getQuietStartup()).toBe(true);
	});

	it("a standalone 'stop ponytail' or 'normal mode' deactivates, a request that mentions it does not", () => {
		expect(isDeactivationCommand(" Stop Ponytail! ")).toBe(true);
		expect(isDeactivationCommand("normal mode.")).toBe(true);
		expect(isDeactivationCommand("add a normal mode toggle")).toBe(false);
		expect(normalizeMode(" Lite ")).toBe("lite");
		expect(normalizeMode("review")).toBeNull();
	});
});

describe("instructions", () => {
	const body = [
		"---",
		"name: x",
		"---",
		"| Level | What change |",
		"| **lite** | lite row |",
		"| **full** | full row |",
		'- lite: "lite example"',
		'- full: "full example"',
		"- Full: a prose rule that stays",
		"- No unrequested abstractions: a rule that stays",
	].join("\n");

	it("keeps the rows and examples of the requested level only, and the prose rules", () => {
		const text = filterSkillBodyForMode(body, "lite");
		expect(text).toContain("lite row");
		expect(text).toContain('- lite: "lite example"');
		expect(text).not.toContain("full row");
		expect(text).not.toContain("full example");
		expect(text).toContain("- Full: a prose rule that stays");
		expect(text).toContain("No unrequested abstractions");
		expect(text).not.toContain("name: x");
	});

	it("builds the rules from the embedded skill, and review points at its own skill", () => {
		const full = getPonytailInstructions("full");
		expect(full).toMatch(/^PONYTAIL MODE ACTIVE — level: full\n\n/);
		expect(full).toContain("## The smallest complete change");
		expect(full).toContain("`shortcut: <the limit>, <when to upgrade>`");
		expect(full).not.toContain("`ponytail:`");
		expect(full).not.toContain("| **ultra**");
		expect(getPonytailInstructions("review")).toBe(
			"PONYTAIL MODE ACTIVE — level: review. Behavior defined by /ponytail-review skill.",
		);
	});

	it("falls back to the short rules when the skill file is missing", () => {
		const text = getPonytailInstructions("ultra", join(xdg, "missing", "SKILL.md"));
		expect(text).toContain("level: ultra");
		expect(text).toContain("## The smallest complete change");
		expect(text).toContain("`shortcut: <the limit>, <when to upgrade>`");
	});
});

describe("subagent matcher", () => {
	const argv = (name: string) => ["node", "nycode", "--system-prompt", `/tmp/x/prompt-${name}.md`];

	it("reads the agent name from the prompt file name", () => {
		expect(subagentName(argv("swarm-worker"))).toBe("swarm-worker");
		expect(subagentName(["node", "nycode"])).toBeNull();
		expect(subagentName(["--system-prompt", "/tmp/other.md"])).toBeNull();
	});

	it("inherits the parent mode and turns it off for agents the matcher does not match", () => {
		const base = { parentMode: "ultra", matcher: "^(swarm-worker|general-purpose)$", fallback: "full" as const };
		expect(childMode({ ...base, argv: argv("swarm-worker") })).toBe("ultra");
		expect(childMode({ ...base, argv: argv("Explore") })).toBe("off");
		expect(childMode({ ...base, parentMode: "off", argv: argv("swarm-worker") })).toBe("off");
		expect(childMode({ ...base, parentMode: undefined, argv: argv("swarm-worker") })).toBe("full");
	});

	it("without a matcher, keeps the rules for agents whose tools include edit or write, or that have no tools list", () => {
		const base = { parentMode: "ultra", fallback: "full" as const };
		const withTools = (tools: string) => [...argv("x"), "--tools", tools];
		expect(childMode({ ...base, argv: withTools("read,grep,find,bash") })).toBe("off");
		expect(childMode({ ...base, argv: withTools("read,edit,bash") })).toBe("ultra");
		expect(childMode({ ...base, argv: withTools("read, write") })).toBe("ultra");
		expect(childMode({ ...base, argv: argv("x") })).toBe("ultra");
		expect(childMode({ ...base, parentMode: "off", argv: withTools("edit") })).toBe("off");
		expect(childMode({ ...base, matcher: "", argv: withTools("read") })).toBe("off");
	});

	it("a set matcher overrides the tools rule in both directions", () => {
		const base = { parentMode: "lite", fallback: "full" as const };
		const reader = [...argv("Explore"), "--tools", "read,grep"];
		const writer = [...argv("swarm-worker"), "--tools", "read,edit,write"];
		expect(childMode({ ...base, matcher: "explore", argv: reader })).toBe("lite");
		expect(childMode({ ...base, matcher: "explore", argv: writer })).toBe("off");
	});

	it("reads the tools allowlist from the child's --tools argument", () => {
		expect(childTools(["node", "--tools", "read, edit,bash"])).toEqual(["read", "edit", "bash"]);
		expect(childTools(["node", "nycode"])).toBeNull();
		expect(childTools(["node", "--tools"])).toBeNull();
	});

	it("fails open on a bad regex or an unparseable agent name", () => {
		expect(childMode({ parentMode: "lite", matcher: "(", argv: argv("x"), fallback: "full" })).toBe("lite");
		expect(childMode({ parentMode: "lite", matcher: "^a$", argv: ["node"], fallback: "full" })).toBe("lite");
		expect(childMode({ parentMode: "lite", matcher: undefined, argv: argv("x"), fallback: "full" })).toBe("lite");
	});
});
