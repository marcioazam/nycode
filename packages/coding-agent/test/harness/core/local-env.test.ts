// <agentDir>/local.env loader (D-52): allowlisted KEY=VALUE, literal values, mode 0600/0400, the real environment wins.
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadLocalEnv, localEnvPath } from "../../../src/core/local-env.ts";
import { resolveBypassPermissions, resolveNycodeSettings } from "../../../src/core/settings-nycode.ts";

const posix = process.platform === "win32" ? describe.skip : describe;

let dir: string;
let file: string;
let warnings: string[];
let env: NodeJS.ProcessEnv;

function write(text: string, mode = 0o600): void {
	writeFileSync(file, text);
	chmodSync(file, mode);
}

function load(): void {
	loadLocalEnv(file, env, (message) => warnings.push(message));
}

beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), "nycode-local-env-"));
	file = join(dir, "local.env");
	warnings = [];
	env = {};
});

afterEach(() => {
	rmSync(dir, { recursive: true });
});

posix("loadLocalEnv", () => {
	it("loads the allowlisted keys, skipping comments and blank lines", () => {
		write("# comment\n\nNYCODE_COMPACT_AT=123456\nPONYTAIL_QUIET_STARTUP=1\nNYCODE_EFFORT_SANDWICH=1\n");
		load();
		expect(env).toEqual({ NYCODE_COMPACT_AT: "123456", PONYTAIL_QUIET_STARTUP: "1", NYCODE_EFFORT_SANDWICH: "1" });
		expect(warnings).toEqual([]);
	});

	it("accepts mode 0400", () => {
		write("NYCODE_BYPASS_PERMISSIONS=1\n", 0o400);
		load();
		expect(env.NYCODE_BYPASS_PERMISSIONS).toBe("1");
	});

	it("never overrides a variable that is already set, even an empty one", () => {
		env = { NYCODE_COMPACT_AT: "999", NYCODE_EFFORT_SANDWICH: "" };
		write("NYCODE_COMPACT_AT=1\nNYCODE_EFFORT_SANDWICH=/vault\n");
		load();
		expect(env).toEqual({ NYCODE_COMPACT_AT: "999", NYCODE_EFFORT_SANDWICH: "" });
	});

	it("keeps values literal: no expansion, no command substitution, split at the first =", () => {
		write("NYCODE_EFFORT_SANDWICH_TURNS=$(touch /nonexistent/x)$HOME=a\n");
		load();
		expect(env.NYCODE_EFFORT_SANDWICH_TURNS).toBe("$(touch /nonexistent/x)$HOME=a");
	});

	it("drops one pair of matching quotes and the CR of a CRLF line", () => {
		write('NYCODE_EFFORT_SANDWICH="/my vault"\r\nNYCODE_EFFORT_SANDWICH_TURNS=\'/g\'\r\nNYCODE_COMPACT_AT=""\r\n');
		load();
		expect(env).toEqual({
			NYCODE_EFFORT_SANDWICH: "/my vault",
			NYCODE_EFFORT_SANDWICH_TURNS: "/g",
			NYCODE_COMPACT_AT: '""',
		});
	});

	it("ignores unknown keys (the old PI_* names included) and lines without =, naming the line", () => {
		write("PI_COMPACT_AT=1\nHOME=/evil\njunk\nNYCODE_SUBAGENT_RESPAWN=2\n");
		load();
		expect(env).toEqual({ NYCODE_SUBAGENT_RESPAWN: "2" });
		expect(warnings).toEqual(["local.env:1 ignored", "local.env:2 ignored", "local.env:3 ignored"]);
	});

	it("loads nothing from a file with open permissions", () => {
		write("NYCODE_COMPACT_AT=1\n", 0o644);
		load();
		expect(env).toEqual({});
		expect(warnings).toEqual([`${file} must have mode 0600 (found 644), ignoring local.env`]);
	});

	it("is silent when the file is missing or is a directory", () => {
		load();
		loadLocalEnv(dir, env, (message) => warnings.push(message));
		expect(env).toEqual({});
		expect(warnings).toEqual([]);
	});
});

describe("localEnvPath", () => {
	it("defaults to <agentDir>/local.env", () => {
		expect(localEnvPath("/home/u/.nycode/agent", {})).toBe("/home/u/.nycode/agent/local.env");
	});

	it("honors NYCODE_LOCAL_ENV", () => {
		expect(localEnvPath("/home/u/.nycode/agent", { NYCODE_LOCAL_ENV: "/tmp/x.env" })).toBe("/tmp/x.env");
	});
});

// Precedence of the keys local.env carries (D-52): real environment > local.env > settings.json > default.
posix("precedence against settings.json", () => {
	it("a local.env value beats settings.json", () => {
		write("NYCODE_COMPACT_AT=222\nNYCODE_BYPASS_PERMISSIONS=1\n");
		load();
		expect(resolveNycodeSettings({ compaction: { maxContextTokens: 111 } }, env).compaction.maxContextTokens).toBe(
			222,
		);
		expect(resolveBypassPermissions({ env, settings: { permissions: { bypass: false } } })).toBe(true);
	});

	it("a real environment variable beats both local.env and settings.json", () => {
		env = { NYCODE_COMPACT_AT: "333" };
		write("NYCODE_COMPACT_AT=222\n");
		load();
		expect(resolveNycodeSettings({ compaction: { maxContextTokens: 111 } }, env).compaction.maxContextTokens).toBe(
			333,
		);
	});

	it("without local.env the settings.json value stands", () => {
		load();
		expect(resolveNycodeSettings({ compaction: { maxContextTokens: 111 } }, env).compaction.maxContextTokens).toBe(
			111,
		);
	});
});
