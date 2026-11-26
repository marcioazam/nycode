// Upstream parity (1.9.0): Claude Code skips its personal `skills/synced` cache; a skill inside it is not a local skill.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { discoverableSkillPaths } from "../../../src/extensions/skills-compat/index.ts";

const root = mkdtempSync(join(tmpdir(), "skills-synced-"));
afterAll(() => rmSync(root, { recursive: true }));
const skill = (dir: string, name: string): void => {
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, "SKILL.md"), `---\nname: ${name}\ndescription: d\n---\n`);
};

describe("skills/synced", () => {
	it("the synced cache contributes no skill; a sibling personal skill still does", () => {
		skill(join(root, "synced", "cached"), "cached");
		skill(join(root, "mine"), "mine");
		expect(discoverableSkillPaths([root])).toEqual([join(root, "mine")]);
	});
});
