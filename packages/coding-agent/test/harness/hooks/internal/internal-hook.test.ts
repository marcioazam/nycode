// The `internal` hook type: the runner (registered name, timeout, unknown name) and the configuration check.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { formatHooksSummary } from "../../../../src/extensions/hooks/config.ts";
import { internalHook, internalHookNames } from "../../../../src/extensions/hooks/internal/registry.ts";
import { runInternalHook } from "../../../../src/extensions/hooks/runners.ts";

const dirs: string[] = [];
afterEach(() => {
	for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
	vi.restoreAllMocks();
});

describe("internal hooks", () => {
	it("registers graph-context and nothing unknown", () => {
		expect(internalHookNames()).toEqual(["graph-context"]);
		expect(internalHook("graph-context")).toBeTypeOf("function");
		expect(internalHook("nope")).toBeUndefined();
		expect(internalHook(undefined)).toBeUndefined();
	});

	it("runs a registered hook like a command hook: exit code, stdout, no timeout", async () => {
		const cwd = mkdtempSync(join(tmpdir(), "internal-hook-"));
		dirs.push(cwd);
		const result = await runInternalHook(
			{ type: "internal", name: "graph-context", command: "internal:graph-context" },
			{ hook_event_name: "SessionStart", cwd },
			20_000,
		);
		expect(result).toMatchObject({ code: 0, timedOut: false });
		expect(JSON.parse(result.stdout).hookSpecificOutput.hookEventName).toBe("SessionStart");
	});

	it("an unknown name is a failed hook, never a silent pass", async () => {
		const result = await runInternalHook({ type: "internal", name: "nope", command: "internal:nope" }, {}, 1000);
		expect(result.code).toBe(1);
		expect(result.stderr).toContain("not registered");
	});

	it("reports the deadline as a timeout so a gated event fails closed", async () => {
		const result = await runInternalHook(
			{ type: "internal", name: "graph-context", command: "internal:graph-context" },
			{ hook_event_name: "SessionStart", cwd: tmpdir() },
			1,
		);
		expect(result).toMatchObject({ code: 1, timedOut: true });
	});

	it("shows in /hooks as internal: name, and names a missing one", () => {
		const text = formatHooksSummary({
			SessionStart: [
				{
					hooks: [
						{ type: "internal", name: "graph-context", command: "" },
						{ type: "internal", command: "" },
					],
				},
			],
		});
		expect(text).toContain("internal: graph-context");
		expect(text).toContain("internal: (missing name)");
	});
});
