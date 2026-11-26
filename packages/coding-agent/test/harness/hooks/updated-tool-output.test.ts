// PostToolUse updatedToolOutput is read under hookSpecificOutput only, as in Claude Code; an MCP tool
// prefers updatedToolOutput and falls back to updatedMCPToolOutput.
import { describe, expect, it } from "vitest";
import { updatedToolOutput } from "../../../src/extensions/hooks/lifecycle.ts";

const run = (output: unknown) => [{ code: 0, stdout: JSON.stringify(output), stderr: "", timedOut: false }];

describe("updatedToolOutput", () => {
	it("reads hookSpecificOutput.updatedToolOutput", () => {
		const results = run({ hookSpecificOutput: { hookEventName: "PostToolUse", updatedToolOutput: "new" } });
		expect(updatedToolOutput(results, "read", false)).toBe("new");
	});

	it("ignores a top-level updatedToolOutput", () => {
		expect(updatedToolOutput(run({ updatedToolOutput: "top" }), "read", false)).toBeUndefined();
		expect(updatedToolOutput(run({ updatedMCPToolOutput: "top" }), "mcp__s__t", true)).toBeUndefined();
	});

	it("for an MCP tool, updatedToolOutput wins over updatedMCPToolOutput", () => {
		const both = run({ hookSpecificOutput: { updatedToolOutput: "generic", updatedMCPToolOutput: "mcp" } });
		expect(updatedToolOutput(both, "mcp__s__t", true)).toBe("generic");
		const mcpOnly = run({ hookSpecificOutput: { updatedMCPToolOutput: "mcp" } });
		expect(updatedToolOutput(mcpOnly, "mcp__s__t", true)).toBe("mcp");
	});
});
