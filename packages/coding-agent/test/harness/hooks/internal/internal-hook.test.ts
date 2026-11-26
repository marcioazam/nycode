// The `internal` hook type: the runner (registered name, timeout, unknown name) and the configuration check. The real
// registry is replaced by a test double that holds two.
import { afterEach, describe, expect, it, vi } from "vitest";
import { formatHooksSummary } from "../../../../src/extensions/hooks/config.ts";
import type { InternalHook } from "../../../../src/extensions/hooks/internal/registry.ts";
import { runInternalHook } from "../../../../src/extensions/hooks/runners.ts";

const { hooks } = vi.hoisted(() => ({ hooks: new Map<string, unknown>() }));

vi.mock("../../../../src/extensions/hooks/internal/registry.ts", () => ({
	internalHook: (name: unknown) => (typeof name === "string" ? hooks.get(name) : undefined),
	internalHookNames: () => [...hooks.keys()],
}));

const echo: InternalHook = async (payload) => ({
	code: 0,
	stdout: JSON.stringify({ seen: payload.event }),
	stderr: "",
});
const never: InternalHook = () => new Promise(() => {});
const boom: InternalHook = async () => {
	throw new Error("boom");
};

afterEach(() => hooks.clear());

describe("internal hooks", () => {
	it("runs a registered hook like a command hook: exit code, stdout, no timeout", async () => {
		hooks.set("echo", echo);
		const result = await runInternalHook(
			{ type: "internal", name: "echo", command: "internal:echo" },
			{ event: "x" },
			1000,
		);
		expect(result).toMatchObject({ code: 0, timedOut: false });
		expect(JSON.parse(result.stdout)).toEqual({ seen: "x" });
	});

	it("an unknown name is a failed hook, never a silent pass", async () => {
		const result = await runInternalHook({ type: "internal", name: "nope", command: "internal:nope" }, {}, 1000);
		expect(result.code).toBe(1);
		expect(result.stderr).toContain("not registered");
	});

	it("a hook that throws is a failed hook (exit 1) with the message", async () => {
		hooks.set("boom", boom);
		const result = await runInternalHook({ type: "internal", name: "boom", command: "internal:boom" }, {}, 1000);
		expect(result).toMatchObject({ code: 1, timedOut: false });
		expect(result.stderr).toContain("boom");
	});

	it("reports the deadline as a timeout so a gated event fails closed", async () => {
		hooks.set("never", never);
		const result = await runInternalHook({ type: "internal", name: "never", command: "internal:never" }, {}, 1);
		expect(result).toMatchObject({ code: 1, timedOut: true });
	});

	it("shows in /hooks as internal: name, and names a missing one", () => {
		const text = formatHooksSummary({
			SessionStart: [
				{
					hooks: [
						{ type: "internal", name: "echo", command: "" },
						{ type: "internal", command: "" },
					],
				},
			],
		});
		expect(text).toContain("internal: echo");
		expect(text).toContain("internal: (missing name)");
	});
});
