// import-claude-session (/puxar) ships on (D-52): a default session registers the command, and the
// `extensions` setting can turn it off with `-builtin:import-claude-session`.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DefaultResourceLoader } from "../../../src/core/resource-loader.ts";
import { builtInExtensions } from "../../../src/extensions/index.ts";

let root: string;
let cwd: string;
let agentDir: string;

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), "nycode-puxar-on-"));
	cwd = join(root, "project");
	agentDir = join(root, "agent");
	mkdirSync(cwd, { recursive: true });
	mkdirSync(agentDir, { recursive: true });
});

afterEach(() => {
	rmSync(root, { recursive: true });
});

async function commandNames(settings?: object): Promise<string[]> {
	if (settings) writeFileSync(join(agentDir, "settings.json"), JSON.stringify(settings));
	const loader = new DefaultResourceLoader({
		cwd,
		agentDir,
		extensionFactories: builtInExtensions.filter(
			(e) => typeof e !== "function" && e.name === "import-claude-session",
		),
	});
	await loader.reload();
	expect(loader.getExtensions().errors).toEqual([]);
	return loader.getExtensions().extensions.flatMap((extension) => [...extension.commands.keys()]);
}

describe("builtin:import-claude-session", () => {
	it("registers /puxar in a default session", async () => {
		expect(await commandNames()).toContain("puxar");
	});

	it("stays off when the setting disables it", async () => {
		expect(await commandNames({ extensions: ["-builtin:import-claude-session"] })).not.toContain("puxar");
	});
});
