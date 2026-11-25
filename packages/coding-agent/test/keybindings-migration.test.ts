import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ENV_AGENT_DIR } from "../src/config.ts";
import { KeybindingsManager } from "../src/core/keybindings.ts";
import { runMigrations } from "../src/migrations.ts";

describe("keybindings migration", () => {
	const tempDirs: string[] = [];

	afterEach(() => {
		for (const dir of tempDirs.splice(0)) {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});

	function createAgentDir(config: Record<string, unknown>): string {
		const agentDir = fs.mkdtempSync(path.join(os.tmpdir(), "nycode-keybindings-test-"));
		tempDirs.push(agentDir);
		fs.writeFileSync(path.join(agentDir, "keybindings.json"), `${JSON.stringify(config, null, 2)}\n`, "utf-8");
		return agentDir;
	}

	it("rewrites old key names to namespaced ids", () => {
		const agentDir = createAgentDir({
			cursorUp: ["up", "ctrl+p"],
			expandTools: "ctrl+x",
		});
		const previousAgentDir = process.env[ENV_AGENT_DIR];
		process.env[ENV_AGENT_DIR] = agentDir;
		runMigrations(agentDir);
		if (previousAgentDir === undefined) {
			delete process.env[ENV_AGENT_DIR];
		} else {
			process.env[ENV_AGENT_DIR] = previousAgentDir;
		}

		const migrated = JSON.parse(fs.readFileSync(path.join(agentDir, "keybindings.json"), "utf-8")) as Record<
			string,
			unknown
		>;
		expect(migrated).toEqual({
			"tui.editor.cursorUp": ["up", "ctrl+p"],
			"app.tools.expand": "ctrl+x",
		});
	});

	it("keeps the namespaced value when old and new names both exist", () => {
		const agentDir = createAgentDir({
			expandTools: "ctrl+x",
			"app.tools.expand": "ctrl+y",
		});
		const previousAgentDir = process.env[ENV_AGENT_DIR];
		process.env[ENV_AGENT_DIR] = agentDir;
		runMigrations(agentDir);
		if (previousAgentDir === undefined) {
			delete process.env[ENV_AGENT_DIR];
		} else {
			process.env[ENV_AGENT_DIR] = previousAgentDir;
		}

		const migrated = JSON.parse(fs.readFileSync(path.join(agentDir, "keybindings.json"), "utf-8")) as Record<
			string,
			unknown
		>;
		expect(migrated).toEqual({
			"app.tools.expand": "ctrl+y",
		});
	});

	it("loads old key names in memory before the file is rewritten", () => {
		const agentDir = createAgentDir({
			selectConfirm: "enter",
			interrupt: "ctrl+x",
		});

		const keybindings = KeybindingsManager.create(agentDir);

		expect(keybindings.getUserBindings()).toEqual({
			"tui.select.confirm": "enter",
			"app.interrupt": "ctrl+x",
		});
		const effective = keybindings.getEffectiveConfig();
		expect(effective["tui.select.confirm"]).toBe("enter");
		expect(effective["app.interrupt"]).toBe("ctrl+x");
	});
});

describe("startup deprecation warnings", () => {
	const tempDirs: string[] = [];
	const previousAgentDir = process.env[ENV_AGENT_DIR];

	afterEach(() => {
		if (previousAgentDir === undefined) delete process.env[ENV_AGENT_DIR];
		else process.env[ENV_AGENT_DIR] = previousAgentDir;
		for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
	});

	function agentDirWith(sub: string, file: string): string {
		const agentDir = fs.mkdtempSync(path.join(os.tmpdir(), "nycode-deprecation-test-"));
		tempDirs.push(agentDir);
		fs.mkdirSync(path.join(agentDir, sub));
		fs.writeFileSync(path.join(agentDir, sub, file), "#!/bin/sh\n");
		process.env[ENV_AGENT_DIR] = agentDir;
		return agentDir;
	}

	// hooks/ holds command-hook scripts that settings.json points at (Claude Code layout), not the old hook API.
	it("does not flag a hooks/ directory of hook scripts", () => {
		const agentDir = agentDirWith("hooks", "gate.sh");
		expect(runMigrations(agentDir).deprecationWarnings).toEqual([]);
	});

	it("still flags custom tools left in tools/", () => {
		const agentDir = agentDirWith("tools", "my-tool.ts");
		expect(runMigrations(agentDir).deprecationWarnings).toEqual([
			"Global tools/ directory contains custom tools. Custom tools have been merged into extensions.",
		]);
	});
});
