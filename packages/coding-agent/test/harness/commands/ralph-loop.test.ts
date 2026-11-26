// /ralph-loop runs the embedded script (D-54), no installed package: the `!` span of the command names a file under
// the resources root, and running it with the command's heredoc writes the loop state the embedded Stop hook reads.
// The iteration limit defaults to 20 (0 = unlimited) and /ralph-help does not exist.
import { spawnSync } from "node:child_process";
import { accessSync, constants, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getBuiltinResourcesRoot, resolveResourcesMarker } from "../../../src/core/builtin-resources.ts";

const command = readFileSync(join(getBuiltinResourcesRoot(), "commands", "ralph-loop.md"), "utf8");
const span = /```!\n([\s\S]*?)\n```/.exec(command)?.[1] ?? "";

let work: string;
beforeEach(() => {
	work = mkdtempSync(join(tmpdir(), "ralph-cmd-"));
});
afterEach(() => rmSync(work, { recursive: true }));

describe("/ralph-loop command", () => {
	it("names an executable script of the embedded resources, not an installed package", () => {
		const script = /^"([^"]+)"/.exec(resolveResourcesMarker(span))?.[1] ?? "";
		expect(script.startsWith(getBuiltinResourcesRoot())).toBe(true);
		expect(() => accessSync(script, constants.X_OK)).not.toThrow();
		expect(span).not.toContain(".nycode/agent/git");
	});

	it("starts a loop: the heredoc text becomes the state file with the session id and the limits", () => {
		const text = resolveResourcesMarker(span.replace(/'\$\{CLAUDE_SESSION_ID\}'/, "'sess-1'")).replace(
			"$ARGUMENTS",
			`fix <promise>DONE</promise> it --max-iterations 3 --completion-promise "DONE"`,
		);
		const result = spawnSync("bash", ["-c", text], { cwd: work, encoding: "utf8" });
		expect(result.status, result.stderr).toBe(0);
		const state = join(work, ".claude", "ralph-loop.local.md");
		expect(existsSync(state)).toBe(true);
		const body = readFileSync(state, "utf8");
		expect(body).toContain("session_id: sess-1");
		expect(body).toContain("max_iterations: 3");
		expect(body).toContain("fix <promise>DONE</promise> it");
	});

	const start = (args: string) => {
		const text = resolveResourcesMarker(span.replace(/'\$\{CLAUDE_SESSION_ID\}'/, "'sess-1'")).replace(
			"$ARGUMENTS",
			args,
		);
		const result = spawnSync("bash", ["-c", text], { cwd: work, encoding: "utf8" });
		expect(result.status, result.stderr).toBe(0);
		return readFileSync(join(work, ".claude", "ralph-loop.local.md"), "utf8");
	};

	it("limits the loop to 20 iterations unless --max-iterations says otherwise", () => {
		expect(start("fix the bug")).toContain("max_iterations: 20");
	});

	it("keeps 0 as the explicit unlimited", () => {
		expect(start("fix the bug --max-iterations 0")).toContain("max_iterations: 0");
	});

	it("rejects a limit that is not a non-negative integer", () => {
		const text = resolveResourcesMarker(span).replace("$ARGUMENTS", "fix it --max-iterations 2.5");
		const result = spawnSync("bash", ["-c", text], { cwd: work, encoding: "utf8" });
		expect(result.status).not.toBe(0);
		expect(existsSync(join(work, ".claude", "ralph-loop.local.md"))).toBe(false);
	});

	it("ships /ralph-loop and /cancel-ralph, not /ralph-help", () => {
		const dir = join(getBuiltinResourcesRoot(), "commands");
		expect(existsSync(join(dir, "ralph-loop.md"))).toBe(true);
		expect(existsSync(join(dir, "cancel-ralph.md"))).toBe(true);
		expect(existsSync(join(dir, "ralph-help.md"))).toBe(false);
	});
});
