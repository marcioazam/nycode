// The built-in agents (Explore, Plan, general-purpose) ship as markdown next to the extension. In nycode they were
// found through import.meta.dirname; embedded, the directory resolves through getBuiltinAgentsDir and copy-assets
// (copy-binary-assets for the standalone binary) puts it in dist. Project agents live under CONFIG_DIR_NAME.
import * as fs from "node:fs";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { CONFIG_DIR_NAME, ENV_AGENT_DIR, getBuiltinAgentsDir } from "../../../src/config.ts";
import { RESOURCES_MARKER } from "../../../src/core/builtin-resources.ts";
import { discoverAgents } from "../../../src/extensions/subagent/registry/agents.ts";

const tmp = mkdtempSync(join(tmpdir(), "nycode-subagent-agents-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

describe("getBuiltinAgentsDir", () => {
	it("holds the three built-in agents", () => {
		const names = fs.readdirSync(getBuiltinAgentsDir()).filter((name) => name.endsWith(".md"));
		expect(names.sort()).toEqual(["explore.md", "general-purpose.md", "plan.md"]);
	});
});

describe("discoverAgents", () => {
	it("lists the built-in agents with the builtin source", () => {
		const previous = process.env[ENV_AGENT_DIR];
		const previousHome = process.env.HOME;
		process.env[ENV_AGENT_DIR] = join(tmp, "agent");
		process.env.HOME = join(tmp, "home"); // no user agents of the machine in the way
		try {
			const builtin = discoverAgents(tmp, "user")
				.agents.filter((agent) => agent.source === "builtin")
				.map((agent) => agent.name);
			// resources/agents (K6) adds embedded agents of the same source, some with the bundled names
			expect(builtin).toEqual(expect.arrayContaining(["Explore", "Plan", "general-purpose"]));
		} finally {
			if (previous === undefined) delete process.env[ENV_AGENT_DIR];
			else process.env[ENV_AGENT_DIR] = previous;
			if (previousHome === undefined) delete process.env.HOME;
			else process.env.HOME = previousHome;
		}
	});

	// Paridade com o harness anterior: o contrato que todo agente lê primeiro precisa existir fora deste
	// repositório (o caminho relativo docs/harness/... dava ENOENT em outro cwd), e os writers mantêm as ferramentas do harness anterior.
	it("every built-in agent reads files that exist from any cwd, and writers keep the previous harness tools", () => {
		const previous = process.env[ENV_AGENT_DIR];
		const previousHome = process.env.HOME;
		process.env[ENV_AGENT_DIR] = join(tmp, "agent");
		process.env.HOME = join(tmp, "home");
		try {
			const builtin = discoverAgents(tmp, "user").agents.filter((agent) => agent.source === "builtin");
			for (const agent of builtin) {
				for (const [, path] of agent.systemPrompt.matchAll(/Read (\S+\.md) in full/g)) {
					expect(path.startsWith("/"), `${agent.name}: ${path}`).toBe(true);
					expect(fs.existsSync(path), `${agent.name}: ${path}`).toBe(true);
				}
			}
			const writerTools = ["find", "todo", "lsp_diagnostics", "lsp_definition", "lsp_references", "subagent"];
			for (const name of ["general-purpose"]) {
				const tools = builtin.find((agent) => agent.name === name)?.tools ?? [];
				expect(tools, name).toEqual(expect.arrayContaining(writerTools));
			}
		} finally {
			if (previous === undefined) delete process.env[ENV_AGENT_DIR];
			else process.env[ENV_AGENT_DIR] = previous;
			if (previousHome === undefined) delete process.env.HOME;
			else process.env.HOME = previousHome;
		}
	});

	it("resolves the resources marker in user agents too, not in project agents", () => {
		const previous = process.env[ENV_AGENT_DIR];
		process.env[ENV_AGENT_DIR] = join(tmp, "agent-marker");
		const body = `---\nname: NAME\ndescription: d\n---\nRead ${RESOURCES_MARKER}/rules/ref/agent-contract.md in full.\n`;
		mkdirSync(join(tmp, "agent-marker", "agents"), { recursive: true });
		writeFileSync(join(tmp, "agent-marker", "agents", "mine.md"), body.replace("NAME", "mine"));
		const projectDir = join(tmp, "project-marker", CONFIG_DIR_NAME, "agents");
		mkdirSync(projectDir, { recursive: true });
		writeFileSync(join(projectDir, "theirs.md"), body.replace("NAME", "theirs"));
		try {
			const agents = discoverAgents(join(tmp, "project-marker"), "both").agents;
			const mine = agents.find((agent) => agent.name === "mine");
			expect(mine?.systemPrompt).not.toContain(RESOURCES_MARKER);
			expect(fs.existsSync(mine!.systemPrompt.match(/Read (\S+) in full/)![1]!)).toBe(true);
			expect(agents.find((agent) => agent.name === "theirs")?.systemPrompt).toContain(RESOURCES_MARKER);
		} finally {
			if (previous === undefined) delete process.env[ENV_AGENT_DIR];
			else process.env[ENV_AGENT_DIR] = previous;
		}
	});

	it("reads project agents from the project config directory", () => {
		const dir = join(tmp, "project", CONFIG_DIR_NAME, "agents");
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(dir, "scout.md"), "---\nname: scout\ndescription: Looks around\n---\nLook around.\n");
		const found = discoverAgents(join(tmp, "project"), "project");
		expect(found.projectAgentsDir).toBe(dir);
		expect(found.agents.map((agent) => agent.name)).toContain("scout");
	});
});
