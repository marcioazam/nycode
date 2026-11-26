// Upstream parity (1.9.0): a local marketplace's `./` plugin entry loads from the marketplace itself, not from the
// copy cached at install time; a plugin the local marketplace no longer lists, or whose entry leaves it, does not load.
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { installedPlugins } from "../../../src/extensions/_shared/settings/plugins.ts";

const tmp = mkdtempSync(join(tmpdir(), "local-marketplace-"));
const savedAgentDir = process.env.NYCODE_CODING_AGENT_DIR;
afterAll(() => {
	if (savedAgentDir === undefined) delete process.env.NYCODE_CODING_AGENT_DIR;
	else process.env.NYCODE_CODING_AGENT_DIR = savedAgentDir;
	rmSync(tmp, { recursive: true });
});

const write = (file: string, value: unknown): void => {
	mkdirSync(join(file, ".."), { recursive: true });
	writeFileSync(file, JSON.stringify(value));
};

let run = 0;
let agentDir: string;
let market: string;
/** One cached plugin `demo@local` plus a local marketplace whose entry for it is `entry`. */
function fixture(entry: Record<string, unknown> | undefined, kind = "directory"): void {
	run++;
	agentDir = join(tmp, `agent-${run}`);
	market = join(tmp, `market-${run}`);
	process.env.NYCODE_CODING_AGENT_DIR = agentDir;
	write(join(agentDir, "settings.json"), { enabledPlugins: { "demo@local": true } });
	write(join(agentDir, "plugins", "cache", "local", "demo", "1.0.0", ".claude-plugin", "plugin.json"), {
		name: "demo",
	});
	write(join(agentDir, "plugins", "known_marketplaces.json"), {
		local: { source: { source: kind, path: market }, installLocation: market },
	});
	write(join(market, ".claude-plugin", "marketplace.json"), { plugins: entry ? [entry] : [] });
	write(join(market, "plugins", "demo", ".claude-plugin", "plugin.json"), { name: "demo" });
}
const roots = (): string[] => installedPlugins(join(tmp, "home")).map((plugin) => plugin.root);

describe("local marketplace plugins", () => {
	beforeEach(() => fixture({ name: "demo", source: "./plugins/demo" }));

	it("a `./` entry loads from the marketplace source", () => {
		expect(roots()).toEqual([join(market, "plugins", "demo")]);
	});

	it("a `file` marketplace source counts as local too", () => {
		fixture({ name: "demo", source: "./plugins/demo" }, "file");
		expect(roots()).toEqual([join(market, "plugins", "demo")]);
	});

	it("a remote entry keeps the cached copy", () => {
		fixture({ name: "demo", source: { source: "github", repo: "OWNER/REPO" } });
		expect(roots()).toEqual([join(agentDir, "plugins", "cache", "local", "demo", "1.0.0")]);
	});

	it("a plugin the marketplace no longer lists does not load", () => {
		fixture(undefined);
		expect(roots()).toEqual([]);
	});

	it("an entry that leaves the marketplace does not load, by path or through a link", () => {
		fixture({ name: "demo", source: "./../outside" });
		mkdirSync(join(tmp, "outside"), { recursive: true });
		expect(roots()).toEqual([]);
		fixture({ name: "demo", source: "./linked" });
		symlinkSync(join(tmp, "outside"), join(market, "linked"));
		expect(roots()).toEqual([]);
	});
});
