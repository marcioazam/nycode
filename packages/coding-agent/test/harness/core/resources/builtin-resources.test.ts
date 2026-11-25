// K6: the built-in scope of the resource loader. Embedded skills have the lowest precedence: a user, project or
// package skill with the same name replaces them, silently; a missing resources directory embeds nothing.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	builtinResourceDir,
	exportResourcesRoot,
	getBuiltinResourcesRoot,
	RESOURCES_MARKER,
	resolveResourcesMarker,
} from "../../../../src/core/builtin-resources.ts";
import { DefaultResourceLoader } from "../../../../src/core/resource-loader.ts";
import { SettingsManager } from "../../../../src/core/settings-manager.ts";
import { formatSkillsForPrompt, loadSkillsFromDir } from "../../../../src/core/skills.ts";
import { createResourcesFixture, type ResourcesFixture } from "./fixture.ts";

const skill = (name: string, description: string) =>
	`---\nname: ${name}\ndescription: ${description}\n---\nBody of ${name}.\n`;

let fx: ResourcesFixture;
let cwd: string;
let agentDir: string;

beforeEach(() => {
	fx = createResourcesFixture();
	cwd = join(fx.root, "project");
	agentDir = process.env.NYCODE_CODING_AGENT_DIR as string;
	mkdirSync(cwd, { recursive: true });
});
afterEach(() => fx.dispose());

async function loadSkills(options: { noSkills?: boolean } = {}) {
	const loader = new DefaultResourceLoader({ cwd, agentDir, ...options });
	await loader.reload();
	return loader.getSkills();
}

describe("resources root and marker", () => {
	it("is <package>/resources and resolves the resources marker in every occurrence", () => {
		expect(getBuiltinResourcesRoot()).toBe(fx.resources);
		const text = `read ${RESOURCES_MARKER}/rules/ref/a.md and ${RESOURCES_MARKER}/skills`;
		expect(resolveResourcesMarker(text)).toBe(`read ${fx.resources}/rules/ref/a.md and ${fx.resources}/skills`);
	});

	it("treats a root with replacement patterns as data", () => {
		expect(resolveResourcesMarker(`${RESOURCES_MARKER}/x`, "/tmp/a$&b")).toBe("/tmp/a$&b/x");
	});

	it("reports a missing kind as undefined and nothing is embedded", async () => {
		expect(builtinResourceDir("skills")).toBeUndefined();
		const { skills, diagnostics } = await loadSkills();
		expect(skills).toEqual([]);
		expect(diagnostics).toEqual([]);
		fx.write("skills/alpha/SKILL.md", skill("alpha", "embedded"));
		expect(builtinResourceDir("skills")).toBe(join(fx.resources, "skills"));
	});
});

describe("built-in skills in the resource loader (K6)", () => {
	it("loads an embedded skill when nothing overrides it", async () => {
		fx.write("skills/alpha/SKILL.md", skill("alpha", "embedded"));
		const { skills } = await loadSkills();
		expect(skills.map((s) => [s.name, s.description])).toEqual([["alpha", "embedded"]]);
	});

	it("a user skill replaces the embedded one of the same name, without a collision warning", async () => {
		fx.write("skills/alpha/SKILL.md", skill("alpha", "embedded"));
		fx.write("skills/beta/SKILL.md", skill("beta", "embedded"));
		mkdirSync(join(agentDir, "skills", "alpha"), { recursive: true });
		writeFileSync(join(agentDir, "skills", "alpha", "SKILL.md"), skill("alpha", "user"));
		const { skills, diagnostics } = await loadSkills();
		expect(skills.map((s) => [s.name, s.description]).sort()).toEqual([
			["alpha", "user"],
			["beta", "embedded"],
		]);
		expect(diagnostics.filter((d) => d.type === "collision")).toEqual([]);
	});

	it("a project skill replaces the embedded one too", async () => {
		fx.write("skills/alpha/SKILL.md", skill("alpha", "embedded"));
		const dir = join(cwd, ".nycode", "skills", "alpha");
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(dir, "SKILL.md"), skill("alpha", "project"));
		const settingsManager = SettingsManager.create(cwd, agentDir, { projectTrusted: true });
		const loader = new DefaultResourceLoader({ cwd, agentDir, settingsManager });
		await loader.reload();
		const { skills, diagnostics } = loader.getSkills();
		expect(skills.map((s) => [s.name, s.description])).toEqual([["alpha", "project"]]);
		expect(diagnostics.filter((d) => d.type === "collision")).toEqual([]);
	});

	it("--no-skills leaves the embedded skills out", async () => {
		fx.write("skills/alpha/SKILL.md", skill("alpha", "embedded"));
		expect((await loadSkills({ noSkills: true })).skills).toEqual([]);
	});
});

// The core engineering skills sit in the model's <available_skills> section; the skills that declare
// disable-model-invocation (plan-workflow, the ponytail family) stay out of it.
const SHIPPED_SKILLS = join(dirname(fileURLToPath(import.meta.url)), "../../../../resources/skills");
const MODEL_VISIBLE = ["pr-review", "security-audit", "diagnose", "code-simplification"];

describe("shipped skills in the model context", () => {
	it("are loaded, invocable and listed in the prompt skills section", () => {
		const { skills } = loadSkillsFromDir({ dir: SHIPPED_SKILLS, source: "builtin" });
		const prompt = formatSkillsForPrompt(skills);
		for (const name of MODEL_VISIBLE) {
			const skill = skills.find((s) => s.name === name);
			expect(skill?.disableModelInvocation).toBe(false);
			expect(prompt).toContain(`<name>${name}</name>`);
		}
	});

	it("still hides the skills that declare disable-model-invocation", () => {
		const { skills } = loadSkillsFromDir({ dir: SHIPPED_SKILLS, source: "builtin" });
		const hidden = skills.find((s) => s.name === "plan-workflow");
		expect(hidden?.disableModelInvocation).toBe(true);
		expect(formatSkillsForPrompt(skills)).not.toContain("<name>plan-workflow</name>");
	});
});

// Measured 2026-11-24: a nycode started inside another nycode (a `!` shell, bash, a probe) inherited the parent's
// NYCODE_RESOURCES and ran the parent version's status-line and hook scripts. Only a value the user set wins.
describe("exportResourcesRoot", () => {
	const keys = ["NYCODE_RESOURCES", "NYCODE_RESOURCES_AUTO"] as const;
	let saved: Record<string, string | undefined>;
	beforeEach(() => {
		saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
	});
	afterEach(() => {
		for (const k of keys) {
			if (saved[k] === undefined) delete process.env[k];
			else process.env[k] = saved[k];
		}
	});

	it("replaces a value another nycode exported, keeps a value the user set", () => {
		fx.write("instructions/contract.md", "x");
		const own = getBuiltinResourcesRoot();
		delete process.env.NYCODE_RESOURCES;
		delete process.env.NYCODE_RESOURCES_AUTO;
		exportResourcesRoot();
		expect(process.env.NYCODE_RESOURCES).toBe(own);
		expect(process.env.NYCODE_RESOURCES_AUTO).toBe("1");

		process.env.NYCODE_RESOURCES = "/other/nycode/resources";
		exportResourcesRoot();
		expect(process.env.NYCODE_RESOURCES).toBe(own);

		process.env.NYCODE_RESOURCES = "/user/choice";
		delete process.env.NYCODE_RESOURCES_AUTO;
		exportResourcesRoot();
		expect(process.env.NYCODE_RESOURCES).toBe("/user/choice");
	});
});
