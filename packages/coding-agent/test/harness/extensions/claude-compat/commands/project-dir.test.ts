// Upstream parity (1.9.0): Claude passes the launch directory as CLAUDE_PROJECT_DIR, even inside a repository.
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { commandVars } from "../../../../../src/extensions/commands/expand.ts";

const repo = mkdtempSync(join(tmpdir(), "command-project-dir-"));
afterAll(() => rmSync(repo, { recursive: true }));

describe("commandVars CLAUDE_PROJECT_DIR", () => {
	it("is the session cwd, not the repository root", () => {
		const sub = join(repo, "pkg");
		mkdirSync(join(repo, ".git"), { recursive: true });
		mkdirSync(sub, { recursive: true });
		expect(commandVars({ cwd: sub }, join(sub, "cmd.md")).CLAUDE_PROJECT_DIR).toBe(sub);
	});
});
