// The /goal evaluator and `type: prompt` hooks get the model's own output limit, as in Claude Code: a long
// verdict is never cut off mid-JSON. A model without a declared limit (maxTokens 0) gets the completion default.
import { afterEach, describe, expect, it } from "vitest";
import { modelOutputLimit, setCompleteBackend } from "../../../src/extensions/_shared/model/model-complete.ts";
import { runPromptHook } from "../../../src/extensions/hooks/runners.ts";

// The fake model only carries the fields the runner reads.
type Loose = any;
const model = (maxTokens: number): Loose => ({
	provider: "anthropic",
	api: "anthropic-messages",
	id: "m",
	reasoning: false,
	maxTokens,
});

afterEach(() => setCompleteBackend(null));

describe("model output limit", () => {
	it("is the model's declared limit, undefined when the model declares none", () => {
		expect(modelOutputLimit(model(64_000))).toBe(64_000);
		expect(modelOutputLimit(model(0))).toBeUndefined();
	});

	it("a prompt hook requests the model's own limit and reads a verdict longer than the old 512 cap", async () => {
		const seen: Loose[] = [];
		const reason = "x".repeat(4_000);
		setCompleteBackend((async (_m: Loose, _c: Loose, options: Loose) => {
			seen.push(options);
			return {
				role: "assistant",
				content: [{ type: "text", text: `{"ok":false,"reason":"${reason}"}` }],
				stopReason: "stop",
				usage: {},
			};
		}) as Loose);
		const result = await runPromptHook(
			{ type: "prompt", prompt: "judge $ARGUMENTS" } as Loose,
			{},
			model(64_000),
			5_000,
		);
		expect(seen[0].maxTokens).toBe(64_000);
		expect(JSON.parse(result.stdout).reason).toHaveLength(4_000);
	});

	it("a model with no declared limit falls back to the completion default, never a cap of 0", async () => {
		const seen: Loose[] = [];
		setCompleteBackend((async (_m: Loose, _c: Loose, options: Loose) => {
			seen.push(options);
			return { role: "assistant", content: [{ type: "text", text: '{"ok":true}' }], stopReason: "stop", usage: {} };
		}) as Loose);
		await runPromptHook({ type: "prompt", prompt: "judge" } as Loose, {}, model(0), 5_000);
		expect(seen[0].maxTokens).toBeGreaterThan(0);
	});
});
