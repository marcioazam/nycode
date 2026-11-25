// C7: the embedded resources must not cite a skill, agent, command or resource path that is not embedded. A missing
// reference makes the model look for something that is not there (Claude Code skips such a skill and only logs a
// warning). A sentence that says the piece is optional ("if ... installed", "se ... instalad...") is allowed.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { BUILTIN_SLASH_COMMANDS } from "../../../../../src/core/slash-commands.ts";
import { ALIASES } from "../../../../../src/extensions/claude-compat/aliases.ts";

const pkgRoot = join(import.meta.dirname, "../../../../..");
const resources = join(pkgRoot, "resources");

/** Proven false positives: `<file>|<kind>:<text>` -> reason. Keep each entry justified. */
const ALLOWLIST = new Map<string, string>([
	["*|command:/docs", "the /docs directory of the user's repository"],
	["*|command:/tmp", "a temporary directory path"],
	[
		"skills/ponytail-help/SKILL.md|command:/plugin",
		"Claude Code host command in the update instructions for that host",
	],
	[
		"skills/ponytail-help/SKILL.md|command:/reload-plugins",
		"Claude Code host command in the update instructions for that host",
	],
	...["origin", "debug", "test", "status", "metrics", "env", "config", "admin", "health"].map(
		(route) =>
			[
				`skills/security-audit/references/full-audit/ATTACK-CLASSES.md|command:/${route}`,
				"HTTP route used as an attack example",
			] as [string, string],
	),
]);

function walk(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		return entry.isDirectory() ? walk(path) : entry.name.endsWith(".md") ? [path] : [];
	});
}

const names = (dir: string) => (existsSync(dir) ? readdirSync(dir) : []);

const skills = new Set(names(join(resources, "skills")));
const embeddedAgents = names(join(resources, "agents"))
	.filter((file) => file.endsWith(".md"))
	.map((file) => file.slice(0, -3));
// The built-in agents of the subagent extension (explore, general-purpose, plan) answer to their frontmatter names too.
const extensionAgents = names(join(pkgRoot, "src/extensions/subagent/agents"))
	.filter((file) => file.endsWith(".md"))
	.map((file) => file.slice(0, -3));
const agents = new Set([...embeddedAgents, ...extensionAgents].flatMap((name) => [name, name.toLowerCase()]));

const commands = new Set<string>([
	...names(join(resources, "commands")).map((file) => file.replace(/\.md$/, "")),
	...BUILTIN_SLASH_COMMANDS.map((command) => command.name),
	...Object.keys(ALIASES),
	// the ponytail extension registers one command per embedded ponytail-* skill
	...[...skills].filter((name) => name.startsWith("ponytail")),
]);
for (const path of walkTs(join(pkgRoot, "src"))) {
	for (const match of readFileSync(path, "utf-8").matchAll(/registerCommand\(\s*["'`]([\w:-]+)["'`]/g))
		commands.add(match[1]);
}

function walkTs(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		return entry.isDirectory() ? walkTs(path) : entry.name.endsWith(".ts") ? [path] : [];
	});
}

const isConditional = (sentence: string) =>
	(/\bif\b/i.test(sentence) && /installed/i.test(sentence)) ||
	(/\bse\b/i.test(sentence) && /instalad/i.test(sentence));

// Names that read as an agent when quoted in code: `x-reviewer`, `x-scout`...
const AGENT_SUFFIX =
	/^[a-z][\w]*-(?:reviewer|scout|worker|runner|author|verifier|integrator|mapper|operator|delivery|curator|triage)$/;

interface Citation {
	kind: "resource" | "skill" | "agent" | "command" | "link";
	text: string;
	exists: boolean;
}

function citations(sentence: string, dir = resources): Citation[] {
	const found: Citation[] = [];
	for (const match of sentence.matchAll(/\$\{NYCODE_RESOURCES\}\/([^\s`'")\]>,;|*<{}]+)/g)) {
		const target = match[1].replace(/[.:]+$/, "");
		found.push({ kind: "resource", text: target, exists: existsSync(join(resources, target)) });
	}
	// relative markdown links (`[x](../tdd/SKILL.md)`) must resolve from the file that holds them
	for (const match of sentence.matchAll(/\]\((?!https?:|mailto:|#)([^)#\s]+)\)/g)) {
		found.push({ kind: "link", text: match[1], exists: existsSync(join(dir, match[1])) });
	}
	for (const match of sentence.matchAll(/\/skill:([a-z][\w-]*)|(?:^|[\s`([]|\}\/)skills\/([a-z][\w-]*)\//g)) {
		const name = match[1] ?? match[2];
		found.push({ kind: "skill", text: name, exists: skills.has(name) });
	}
	for (const match of sentence.matchAll(
		/\bagent:\s*["'`]([\w-]+)|\bagente:\s*([A-Za-z][\w-]*)|\bsubagent\s+`([\w-]+)`|`([\w-]+)`\s+subagent/g,
	)) {
		const name = match[1] ?? match[2] ?? match[3] ?? match[4];
		found.push({ kind: "agent", text: name, exists: agents.has(name) });
	}
	for (const match of sentence.matchAll(/`([a-z][\w]*-[\w-]+)`/g)) {
		if (AGENT_SUFFIX.test(match[1])) found.push({ kind: "agent", text: match[1], exists: agents.has(match[1]) });
	}
	// A command is a slash word opened by a backtick or a space and not continued as a path.
	for (const match of sentence.matchAll(/(?:^|[\s`(])\/([a-z][\w:-]*)(?![\w/.:-]*\/)(?=[\s`),.;:]|$)/g)) {
		const name = match[1];
		if (name.startsWith("skill:")) continue; // handled as a skill citation
		// `ns:cmd` is the plugin-style name of an embedded command (`cmd` or `ns-cmd`)
		const [ns, cmd] = name.split(":");
		const exists = cmd === undefined ? commands.has(name) : commands.has(cmd) || commands.has(`${ns}-${cmd}`);
		found.push({ kind: "command", text: `/${name}`, exists });
	}
	return found;
}

function missingReferences(): string[] {
	const missing: string[] = [];
	for (const path of walk(resources)) {
		const rel = relative(resources, path);
		const sentences = readFileSync(path, "utf-8").split(/(?<=[.!?])\s+|\n/);
		for (const sentence of sentences) {
			if (isConditional(sentence)) continue;
			for (const citation of citations(sentence, dirname(path))) {
				if (
					citation.exists ||
					ALLOWLIST.has(`${rel}|${citation.kind}:${citation.text}`) ||
					ALLOWLIST.has(`*|${citation.kind}:${citation.text}`)
				)
					continue;
				missing.push(`${rel}: ${citation.kind} ${citation.text}`);
			}
		}
	}
	return missing;
}

describe("references in the embedded resources", () => {
	it("cites only resources, skills, agents and commands that are embedded or registered", () => {
		expect(missingReferences()).toEqual([]);
	});

	it("keeps the allowlist free of entries that no text needs", () => {
		for (const key of ALLOWLIST.keys()) {
			const [rel, citation] = key.split("|");
			const files = rel === "*" ? walk(resources) : [join(resources, rel)];
			const text = files.map((file) => readFileSync(file, "utf-8")).join("\n");
			expect(text, key).toContain(citation.slice(citation.indexOf(":") + 1));
		}
	});

	it("flags each kind of missing reference and spares a conditional sentence", () => {
		const kinds = (text: string) => citations(text).map((c) => [c.kind, c.text, c.exists]);
		expect(kinds("Run `/skill:nope` now.")).toEqual([["skill", "nope", false]]);
		expect(kinds('Use `subagent {agent: "nope-scout"}`.')).toContainEqual(["agent", "nope-scout", false]);
		expect(kinds("Use the `nope-reviewer` subagent.")).toContainEqual(["agent", "nope-reviewer", false]);
		// biome-ignore lint/suspicious/noTemplateCurlyInString: the resources marker is literal text
		expect(kinds("Read ${NYCODE_RESOURCES}/rules/ref/nope.md.")).toEqual([["resource", "rules/ref/nope.md", false]]);
		expect(kinds("Type `/nope-command` to start.")).toEqual([["command", "/nope-command", false]]);
		expect(kinds("See [x](../nope/SKILL.md).")).toEqual([["link", "../nope/SKILL.md", false]]);
		expect(kinds("Use `/compact` and `Explore`.")).toEqual([["command", "/compact", true]]);
		expect(isConditional("If `nope` is installed, read it.")).toBe(true);
		expect(isConditional("Se a skill `nope` estiver instalada, leia.")).toBe(true);
		expect(isConditional("Read `nope`.")).toBe(false);
	});
});
