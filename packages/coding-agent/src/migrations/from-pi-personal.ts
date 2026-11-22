// The personal layer of `nycode migrate from-pi` (D-55): AGENTS.md, subagent routing, themes, the claude-home skills,
// agents and commands the package does not embed, and the personal conta.ts extension. Everything is copied by content
// (symlinks are resolved) and never over an existing destination file: that entry is `keep` with the reason in its label.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { builtinResourceDir } from "../core/builtin-resources.ts";
import { parsePolicy } from "../extensions/subagent/routing/policy.ts";
import { NYCODE_THEME_NAMES } from "../modes/interactive/theme/nycode-themes.ts";
import type { PlanFile } from "./from-pi-plan.ts";

/** Directories whose plan entries are summarised per directory instead of listed one by one. */
export const PERSONAL_DIRS = ["skills", "agents", "commands", "themes"];

const LIST_LIMIT = 20;
const SKIPPED_DIRS = new Set(["__pycache__", "node_modules", ".git"]);
const BUILTIN_THEMES = new Set(["dark", "light", ...NYCODE_THEME_NAMES]);
/** pi themes that the D-56 built-in themes replace; the `theme` setting is converted instead of copying the files. */
export const THEME_RENAMES: Record<string, string> = {
	"pi-claro": "nycode-claro",
	"pi-escuro": "nycode-escuro",
	"pi-noite": "nycode-noite",
};
const CONTA_REPLACEMENTS: [RegExp, string][] = [
	[/@earendil-works\/pi-coding-agent/g, "@nycode/coding-agent"],
	[/PI_CODING_AGENT_DIR/g, "NYCODE_CODING_AGENT_DIR"],
	[/'\.pi', 'agent'/g, "'.nycode', 'agent'"],
];

export interface PersonalSink {
	files: PlanFile[];
	notes: string[];
	dest: string;
}

/** Stats through symlinks; a missing or dangling entry is "missing". */
function kindOf(path: string): "file" | "directory" | "missing" {
	try {
		const stat = statSync(path);
		return stat.isFile() ? "file" : stat.isDirectory() ? "directory" : "missing";
	} catch {
		return "missing";
	}
}

function names(dir: string): string[] {
	try {
		return readdirSync(dir)
			.filter((n) => !n.startsWith("."))
			.sort();
	} catch {
		return [];
	}
}

function walkFiles(root: string, rel: string): string[] {
	const found: string[] = [];
	for (const name of readdirSync(join(root, rel)).sort()) {
		if (SKIPPED_DIRS.has(name) || name.endsWith(".pyc")) continue;
		const entryRel = `${rel}/${name}`;
		const kind = kindOf(join(root, entryRel));
		if (kind === "directory") found.push(...walkFiles(root, entryRel));
		else if (kind === "file") found.push(entryRel);
	}
	return found;
}

function push(sink: PersonalSink, file: Omit<PlanFile, "action">): void {
	const exists = existsSync(join(sink.dest, file.rel));
	sink.files.push({
		...file,
		label: exists ? `${file.label}; kept: already in the destination` : file.label,
		action: exists ? "keep" : "create",
	});
}

function readJson(path: string): unknown {
	try {
		return JSON.parse(readFileSync(path, "utf8"));
	} catch {
		return undefined;
	}
}

function embeddedNames(kind: "skills" | "agents" | "commands"): Set<string> {
	const dir = builtinResourceDir(kind);
	if (!dir) return new Set();
	return new Set(
		kind === "skills"
			? names(dir).filter((n) => kindOf(join(dir, n, "SKILL.md")) === "file")
			: names(dir)
					.filter((n) => extname(n) === ".md")
					.map((n) => basename(n, ".md")),
	);
}

function addRootFiles(source: string, sink: PersonalSink): void {
	if (kindOf(join(source, "AGENTS.md")) === "file") {
		push(sink, { rel: "AGENTS.md", label: "agent instructions", from: join(source, "AGENTS.md") });
	}
	const routing = join(source, "subagent-routing.json");
	if (kindOf(routing) === "file") {
		const problem = parsePolicy(readJson(routing));
		if (typeof problem === "string") sink.notes.push(`subagent-routing.json not copied: ${problem}`);
		else push(sink, { rel: "subagent-routing.json", label: "subagent routing policy", from: routing, mode: 0o600 });
	}
	const conta = join(source, "extensions", "conta.ts");
	if (kindOf(conta) === "file") {
		const text = CONTA_REPLACEMENTS.reduce(
			(acc, [pattern, to]) => acc.replace(pattern, to),
			readFileSync(conta, "utf8"),
		);
		push(sink, {
			rel: "extensions/conta.ts",
			label: "personal extension; pi names converted",
			from: conta,
			data: text,
		});
	}
}

function addThemes(source: string, sink: PersonalSink): void {
	const dir = join(source, "themes");
	for (const file of names(dir).filter((n) => extname(n) === ".json")) {
		if (kindOf(join(dir, file)) !== "file") continue;
		const json = readJson(join(dir, file));
		const declared = (json as { name?: unknown } | undefined)?.name;
		const name = typeof declared === "string" ? declared : basename(file, ".json");
		if (typeof json !== "object" || json === null) sink.notes.push(`themes/${file} not copied: not a JSON object`);
		else if (name in THEME_RENAMES)
			sink.notes.push(`themes/${file}: replaced by the built-in theme ${THEME_RENAMES[name]}; not copied`);
		else if (BUILTIN_THEMES.has(name))
			sink.notes.push(`themes/${file}: the built-in theme "${name}" wins; not copied`);
		else push(sink, { rel: `themes/${file}`, label: "theme", from: join(dir, file) });
	}
}

function noteBuiltin(sink: PersonalSink, kind: string, builtin: string[]): void {
	if (builtin.length === 0) return;
	const shown = builtin.slice(0, LIST_LIMIT).join(", ");
	const more = builtin.length > LIST_LIMIT ? `, ... (${builtin.length - LIST_LIMIT} more)` : "";
	sink.notes.push(
		`claude-home ${kind}: ${builtin.length} not copied, the package embeds ones with the same name: ${shown}${more}`,
	);
}

function addClaudeHome(source: string, sink: PersonalSink): void {
	const home = join(source, "claude-home");
	if (kindOf(home) !== "directory") return;
	const skills = embeddedNames("skills");
	const builtinSkills: string[] = [];
	for (const name of names(join(home, "skills"))) {
		const root = join(home, "skills", name);
		if (kindOf(join(root, "SKILL.md")) !== "file") continue;
		if (skills.has(name)) {
			builtinSkills.push(name);
			continue;
		}
		for (const rel of walkFiles(join(home, "skills"), name)) {
			push(sink, { rel: `skills/${rel}`, label: "claude-home skill", from: join(home, "skills", rel) });
		}
	}
	noteBuiltin(sink, "skills", builtinSkills);
	for (const kind of ["agents", "commands"] as const) {
		const embedded = embeddedNames(kind);
		const builtin: string[] = [];
		for (const file of names(join(home, kind)).filter((n) => extname(n) === ".md")) {
			if (kindOf(join(home, kind, file)) !== "file") continue;
			if (embedded.has(basename(file, ".md"))) builtin.push(basename(file, ".md"));
			else
				push(sink, {
					rel: `${kind}/${file}`,
					label: `claude-home ${kind.slice(0, -1)}`,
					from: join(home, kind, file),
				});
		}
		noteBuiltin(sink, kind, builtin);
	}
	sink.notes.push("claude-home hooks are not copied: the embedded hooks, permission engine and tests cover them");
}

/** Adds the personal layer of the pi agent directory `source` to the plan. */
export function addPersonalLayer(source: string, sink: PersonalSink): void {
	addRootFiles(source, sink);
	addThemes(source, sink);
	addClaudeHome(source, sink);
}
