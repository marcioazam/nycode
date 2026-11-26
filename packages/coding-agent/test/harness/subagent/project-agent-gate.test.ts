// checkProjectAgentGate: trusted projects run project agents without a prompt unless confirmProjectAgents is true.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExtensionContext } from "../../../src/core/extensions/types.ts";
import { checkProjectAgentGate } from "../../../src/extensions/subagent/core/modes.ts";
import type { AgentConfig } from "../../../src/extensions/subagent/registry/agents.ts";

const approval = vi.hoisted(() => ({ approved: false }));
vi.mock("../../../src/extensions/_shared/project/project-approval.ts", () => ({
	isProjectApproved: async () => approval.approved,
}));

const agent: AgentConfig = {
	name: "motion-analyst",
	description: "d",
	systemPrompt: "",
	source: "project",
	filePath: "/repo/.nycode/agents/motion-analyst.md",
};

async function gate(params: Record<string, unknown>, approved: boolean, hasUI = true) {
	approval.approved = approved;
	const confirm = vi.fn(async () => true);
	const ctx = { hasUI, ui: { confirm } } as unknown as ExtensionContext;
	const result = await checkProjectAgentGate(
		{ agent: "motion-analyst", task: "t", ...params },
		[agent],
		ctx,
		null,
		"single",
		() => () => ({}) as never,
	);
	return { result, confirm };
}

describe("checkProjectAgentGate", () => {
	beforeEach(() => {
		approval.approved = false;
	});

	it("does not confirm in a trusted project when the flag is omitted", async () => {
		const { result, confirm } = await gate({}, true);
		expect(result).toBeNull();
		expect(confirm).not.toHaveBeenCalled();
	});

	it("confirms in a trusted project when the flag is true", async () => {
		const { confirm } = await gate({ confirmProjectAgents: true }, true);
		expect(confirm).toHaveBeenCalledOnce();
	});

	it("confirms in an untrusted project whatever the flag says", async () => {
		for (const params of [{}, { confirmProjectAgents: false }]) {
			const { confirm } = await gate(params, false);
			expect(confirm).toHaveBeenCalledOnce();
		}
	});

	it("refuses an untrusted project without a UI", async () => {
		const { result } = await gate({}, false, false);
		expect(result?.content[0]).toMatchObject({ text: expect.stringContaining("require a trusted project") });
	});
});
