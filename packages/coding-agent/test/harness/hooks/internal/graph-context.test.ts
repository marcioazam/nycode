// The graph-context internal hook (SessionStart and SubagentStart context), ported from test_graph_context.py.
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { graphContext } from "../../../../src/extensions/hooks/internal/graph-context.ts";

let tmp: string;
let saved: NodeJS.ProcessEnv;

beforeEach(() => {
	saved = { ...process.env };
	tmp = mkdtempSync(join(tmpdir(), "gctx-"));
	mkdirSync(join(tmp, "brain", "Projects"), { recursive: true });
	Object.assign(process.env, {
		CODEGRAPH_STATUS_TTL: "0",
		NYCODE_KNOWLEDGE_VAULT: join(tmp, "brain"),
		NYCODE_GRAPHS_VAULT: join(tmp, "graphs"),
		CODEGRAPH_AUTO_ROOT: join(tmp, "source"),
		CODEGRAPH_AUTO_STATE: join(tmp, "state"),
	});
	delete process.env.NYCODE_DIAG_INBOX;
});

afterEach(() => {
	for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
	Object.assign(process.env, saved);
	rmSync(tmp, { recursive: true, force: true });
});

/** The additionalContext the hook prints, or undefined when it stays silent. */
async function run(event: string, cwd: string): Promise<string | undefined> {
	const result = await graphContext({ hook_event_name: event, cwd });
	expect(result.code).toBe(0);
	return result.stdout ? JSON.parse(result.stdout).hookSpecificOutput.additionalContext : undefined;
}

function gitRepo(path: string): string {
	expect(spawnSync("git", ["init", "-q", path]).status).toBe(0);
	return path;
}

function fakeCodegraph(status: object): string {
	const bin = join(tmp, "codegraph");
	writeFileSync(bin, `#!/bin/sh\necho '${JSON.stringify(status)}'\n`);
	chmodSync(bin, 0o755);
	return bin;
}

describe("graph-context", () => {
	it("a cwd outside git gets the nycode workspace line", async () => {
		const ctx = await run("SessionStart", tmp);
		expect(ctx).toContain("Workspace:");
		expect(ctx).toContain("subagent has no isolation field");
		expect(ctx).not.toContain("omit the isolation field");
	});

	it("an indexed repository routes through tool_search", async () => {
		const repo = gitRepo(join(tmp, "repo"));
		mkdirSync(join(repo, ".codegraph"));
		writeFileSync(join(repo, ".codegraph", "codegraph.db"), "");
		process.env.CODEGRAPH_BIN = fakeCodegraph({
			initialized: true,
			pendingChanges: {},
			index: { state: "complete" },
			lastIndexed: "2026-11-11T10:00",
		});
		const ctx = await run("SubagentStart", repo);
		expect(ctx).toContain(`Graph: codegraph root=${repo} index=fresh`);
		expect(ctx).toContain("tool_search");
		expect(ctx).not.toContain("ToolSearch");
		expect(ctx).not.toContain("Knowledge vault:");
	});

	it("SessionStart lists the knowledge route with the embedded kb path", async () => {
		const repo = gitRepo(join(tmp, "myrepo"));
		const ctx = await run("SessionStart", repo);
		expect(ctx).toContain("Graph:");
		expect(ctx).toContain("no codegraph index");
		expect(ctx).toContain("Knowledge vault:");
		// biome-ignore lint/suspicious/noTemplateCurlyInString: the marker is literal text for the model
		expect(ctx).toContain("${NYCODE_RESOURCES}/skills/obsidian-cli/scripts/kb.py");
	});

	it("lists the notes of the repository", async () => {
		const repo = gitRepo(join(tmp, "acme"));
		mkdirSync(join(tmp, "brain", "Projects", "Acme"));
		writeFileSync(join(tmp, "brain", "Projects", "Acme", "Decisions.md"), "");
		expect(await run("SessionStart", repo)).toContain("Projects/Acme/Decisions.md");
	});

	it("skips the knowledge line when no vault is set", async () => {
		const repo = gitRepo(join(tmp, "myrepo"));
		process.env.NYCODE_KNOWLEDGE_VAULT = "";
		const ctx = await run("SessionStart", repo);
		expect(ctx).toContain("Graph:");
		expect(ctx).not.toContain("Knowledge vault:");
	});

	it("is silent on other events and on a missing directory", async () => {
		expect(await run("PreToolUse", tmp)).toBeUndefined();
		expect(await run("SessionStart", join(tmp, "missing"))).toBeUndefined();
	});

	it("an exception is reported to the inbox and the hook stays silent", async () => {
		const inbox = join(tmp, "inbox.tsv");
		process.env.NYCODE_DIAG_INBOX = inbox;
		const payload = {
			hook_event_name: "SessionStart",
			get cwd(): string {
				throw new Error("boom");
			},
		};
		expect(await graphContext(payload)).toEqual({ code: 0, stdout: "", stderr: "" });
		const lines = readFileSync(inbox, "utf8").split("\n").filter(Boolean);
		expect(lines).toHaveLength(1);
		const fields = lines[0].split("\t");
		expect(fields.slice(0, 3)).toEqual(["13", "graph_context", "erro-interno"]);
		expect(fields[3]).toBe("Graph: indisponível (Error: boom)");
		expect(fields[4]).toContain("boom");
	});

	it("an exception without an inbox writes nothing", async () => {
		const payload = {
			hook_event_name: "SessionStart",
			get cwd(): string {
				throw new Error("boom");
			},
		};
		expect(await graphContext(payload)).toEqual({ code: 0, stdout: "", stderr: "" });
	});
});
