import { describe, expect, test } from "vitest";
import { buildInitPrompt } from "../src/extensions/init/index.ts";

describe("buildInitPrompt", () => {
	test("asks for commands and conventions, not a repository overview", () => {
		const prompt = buildInitPrompt();

		expect(prompt).toContain("Build, lint, and test commands");
		expect(prompt).toContain("Code conventions");
		expect(prompt).not.toContain("Architecture notes");
		expect(prompt).not.toContain("Project layout");
	});
});
