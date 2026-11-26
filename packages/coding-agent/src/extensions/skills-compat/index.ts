/**
 * Claude Skills Extension
 *
 * Bridges Claude Code's skills into nycode. On resources_discover it hands nycode the
 * existing `.claude/skills` directories (user then project) as skill paths, so
 * nycode discovers Claude Code skills the same way it loads its own `.pi/skills`.
 * nycode implements the Agent Skills standard, so `SKILL.md` directories work
 * unchanged and register as `/skill:<name>`.
 *
 * Claude documents that a command file and a skill "work the same way", so a
 * SKILL.md body carries the dynamic features command bodies do: `` !`cmd` ``
 * spans, `@file` references, `$ARGUMENTS`/positional substitution and
 * `${CLAUDE_*}` variables. nycode's loader delivers the raw text, so this extension
 * intercepts `/skill:<name>` input for the skills it contributed, expands the body
 * through the shared command pipeline, and hands nycode the already-expanded content
 * in nycode's own skill-block format (nycode emits the input event before its own
 * expansion, and skips text that no longer starts with `/`).
 *
 * Docs: https://code.claude.com/docs/en/skills.md, https://agentskills.io
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { CONFIG_DIR_NAME, getAgentDir } from "../../config.ts";
import { builtinResourceDir } from "../../core/builtin-resources.ts";
import type { ExtensionAPI, ExtensionContext } from "../../core/extensions/types.ts";
import { SettingsManager } from "../../core/settings-manager.ts";
import { resolvePath } from "../../utils/paths.ts";
import { parseCommandFile } from "../_shared/commands/command-file.ts";
import { parseClaudeFrontmatter } from "../_shared/commands/frontmatter.ts";
import { sessionHasTurns, sessionMailbox } from "../_shared/events/session-mailbox.ts";
import { SKILL_HOOKS_CHANNEL } from "../_shared/events/skill-hooks.ts";
import { isProjectApprovedSilently } from "../_shared/project/project-approval.ts";
import { ancestorDirs } from "../_shared/project/project-root.ts";
import { runAgent } from "../_shared/seams/agent-run.ts";
import { userConfigDir } from "../_shared/settings/config-dir.ts";
import { managedSettingsFile } from "../_shared/settings/managed-settings.ts";
import { claudeSettingsChain, readSettingsChain } from "../_shared/settings/settings-chain.ts";
import { errorMessage, isDirectory, isRecord } from "../_shared/util/values.ts";
import { expandCommand, shellExecutionDisabled } from "../commands/expand.ts";
import {
	type ExpandSkill,
	findPluginSkill,
	pluginSkills,
	registerPluginSkills,
	type SkillExpansion,
} from "./plugin-skills.ts";
import { registerPluginsCommand } from "./plugins-command.ts";

/** Existing `.claude/skills` directories, user first then project. The project
 * directory is included only for approved projects: nycode's loader surfaces every skill's
 * name and description to the model, so an untrusted repository would otherwise get
 * text into the prompt without the user ever agreeing to load its config. Plugin skills
 * are not here: they register as `/<plugin>:<skill>` (plugin-skills.ts). */
export function skillDirs(cwd: string, _home: string, trusted: boolean): string[] {
	// Claude's precedence: enterprise (the skills directory beside the managed
	// settings file) overrides personal, and personal overrides project; discovery
	// here is first-match, so higher precedence goes first.
	// Claude: "Set to 1 to skip loading skills from the system-wide managed skills
	// directory. Useful for container or CI sessions that should not load
	// operator-provisioned skills." The enterprise dir beside managed-settings.json is
	// that directory here; personal and project skills are unaffected.
	const enterprise =
		process.env.CLAUDE_CODE_DISABLE_POLICY_SKILLS === "1"
			? []
			: [path.join(path.dirname(managedSettingsFile()), ".claude", "skills")];
	const candidates = [...enterprise, path.join(userConfigDir(), "skills")];
	// Claude loads skills from every .claude/skills between cwd and the repository
	// root; the list goes nearest-first so findClaudeSkill's first match is the
	// closest definition (nycode's loader receives the same order).
	if (trusted) candidates.push(...ancestorDirs(cwd, path.join(".claude", "skills")));
	// K6: the embedded skills come last, the lowest precedence of this first-match list.
	const embedded = builtinResourceDir("skills");
	if (embedded) candidates.push(embedded);
	const dirs: string[] = [];
	for (const dir of candidates) {
		if (!dirs.includes(dir) && isDirectory(dir)) dirs.push(dir);
	}
	return dirs;
}

function directSkillName(filePath: string, fallbackName: string): string {
	try {
		const content = fs.readFileSync(filePath, "utf-8");
		const declared = parseClaudeFrontmatter<Record<string, unknown>>(content).frontmatter.name;
		if (typeof declared === "string" && declared.trim()) return declared.trim();
	} catch {
		// Malformed frontmatter: nycode's loader falls back to the directory/file name too.
	}
	return fallbackName;
}

function collectDirectSkillNames(roots: string[], target: Set<string>): void {
	for (const root of roots) {
		// A settings.json entry may name one skill (its directory or a .md file) instead of a root of skills.
		if (root.endsWith(".md") && fs.existsSync(root)) {
			target.add(directSkillName(root, path.basename(root, ".md")));
			continue;
		}
		const own = skillAt(path.dirname(root), path.basename(root));
		if (own) {
			target.add(own.name);
			continue;
		}
		let entries: fs.Dirent[];
		try {
			entries = fs.readdirSync(root, { withFileTypes: true });
		} catch {
			continue;
		}
		for (const entry of entries) {
			if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
			const fullPath = path.join(root, entry.name);
			let isDir = entry.isDirectory();
			let isFile = entry.isFile();
			if (entry.isSymbolicLink()) {
				try {
					const st = fs.statSync(fullPath);
					isDir = st.isDirectory();
					isFile = st.isFile();
				} catch {
					continue;
				}
			}
			if (isFile && entry.name.endsWith(".md")) {
				target.add(directSkillName(fullPath, entry.name.slice(0, -3)));
			} else if (isDir) {
				const skill = skillAt(root, entry.name);
				if (skill) target.add(skill.name);
			}
		}
	}
}

/** Direct one-level skill entries under `dirs` (matching Claude Code's `<root>/<skill>/SKILL.md` and direct `.md`
 * files), skipping nested non-skill subtrees and skills already defined in higher-precedence `shadowedRoots` or
 * earlier entries of `dirs` (prevents expected override collisions from flooding startup diagnostics). */
export function discoverableSkillPaths(dirs: string[], shadowedRoots: string[] = []): string[] {
	const seen = new Set<string>();
	collectDirectSkillNames(shadowedRoots, seen);
	const paths: string[] = [];
	for (const root of dirs) {
		let entries: fs.Dirent[];
		try {
			entries = fs.readdirSync(root, { withFileTypes: true });
		} catch {
			continue;
		}
		for (const entry of entries) {
			if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
			const fullPath = path.join(root, entry.name);
			let isDir = entry.isDirectory();
			let isFile = entry.isFile();
			if (entry.isSymbolicLink()) {
				try {
					const st = fs.statSync(fullPath);
					isDir = st.isDirectory();
					isFile = st.isFile();
				} catch {
					continue;
				}
			}
			if (isFile && entry.name.endsWith(".md")) {
				const name = directSkillName(fullPath, entry.name.slice(0, -3));
				if (seen.has(name)) continue;
				seen.add(name);
				paths.push(fullPath);
			} else if (isDir) {
				const skill = skillAt(root, entry.name);
				if (!skill || seen.has(skill.name)) continue;
				seen.add(skill.name);
				paths.push(fullPath);
			}
		}
	}
	return paths;
}

/** What nycode's own loader reads before the paths this extension hands over: the agentDir skill directory, the
 * project's `.nycode/skills` and `.agents/skills` when trusted, and the plain `skills` entries of the
 * global and (trusted) project settings.json, resolved as the loader resolves them. A scope whose list carries a
 * pattern is left out: the pattern may disable an entry, and shadowing a skill nycode did not load would drop the
 * Claude copy instead of a duplicate. */
export function shadowingSkillPaths(cwd: string, trusted: boolean): string[] {
	const home = os.homedir();
	const settings = SettingsManager.create(cwd, getAgentDir(), { projectTrusted: trusted });
	const declared = (entries: string[] | undefined, baseDir: string) =>
		!entries || entries.some((e) => /^[!+-]|[*?]/.test(e))
			? []
			: entries.map((e) => resolvePath(e, baseDir, { homeDir: home, trim: true }));
	return [
		path.join(getAgentDir(), "skills"),
		...declared(settings.getGlobalSettings().skills, getAgentDir()),
		...(trusted
			? [
					...ancestorDirs(cwd, path.join(CONFIG_DIR_NAME, "skills")),
					...ancestorDirs(cwd, path.join(".agents", "skills")),
					...declared(settings.getProjectSettings().skills, path.join(cwd, CONFIG_DIR_NAME)),
				]
			: []),
	];
}

interface FoundSkill {
	filePath: string;
	baseDir: string;
}

/** The skill a directory entry holds, named as nycode's loader names it (frontmatter
 * `name`, else the directory name); undefined without a readable SKILL.md. */
function skillAt(root: string, dirName: string): { name: string; filePath: string } | undefined {
	const filePath = path.join(root, dirName, "SKILL.md");
	let content: string;
	try {
		content = fs.readFileSync(filePath, "utf-8");
	} catch {
		return undefined;
	}
	let name = dirName;
	try {
		const declared = parseClaudeFrontmatter<Record<string, unknown>>(content).frontmatter.name;
		if (typeof declared === "string" && declared.trim()) name = declared.trim();
	} catch {
		// Malformed frontmatter: nycode's loader falls back to the directory name too.
	}
	return { name, filePath };
}

/** A Claude-contributed skill by the name nycode's loader gives it. One directory
 * level, the standard layout. */
function findClaudeSkill(name: string, roots: string[]): FoundSkill | undefined {
	for (const root of roots) {
		let entries: fs.Dirent[];
		try {
			entries = fs.readdirSync(root, { withFileTypes: true });
		} catch {
			continue;
		}
		for (const entry of entries) {
			// A link counts: nycode's loader follows it, and skillAt already turns a link that
			// leads to no SKILL.md (dangling, or to a plain file) into undefined.
			if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
			const skill = skillAt(root, entry.name);
			if (skill?.name === name) return { filePath: skill.filePath, baseDir: path.dirname(skill.filePath) };
		}
	}
	return undefined;
}

export default function skillsExtension(nycode: ExtensionAPI) {
	registerPluginsCommand(nycode);
	const syncPluginSkills = registerPluginSkills(nycode, (text, ctx, options) =>
		expandSkillInvocation(nycode, text, ctx, options),
	);
	nycode.on("session_start", (_event, ctx) => {
		forkResults.attach(nycode, sessionHasTurns(ctx));
		syncPluginSkills(ctx);
	});
	nycode.on("agent_start", () => forkResults.markPrompted(nycode));
	nycode.on("session_shutdown", () => forkResults.detach(nycode));

	nycode.on("resources_discover", (_event, ctx) => {
		// nycode's --no-skills does not cover paths an extension hands over here; a routed subagent has no skill catalog.
		if (process.env.NYCODE_SUBAGENT_NO_SKILLS === "1") return undefined;
		// resources_discover fires after session_start, so the approval is already
		// resolved; reading it silently keeps a second trust dialog off the screen.
		const trusted = isProjectApprovedSilently(ctx);
		const skillPaths = discoverableSkillPaths(
			skillDirs(ctx.cwd, os.homedir(), trusted),
			shadowingSkillPaths(ctx.cwd, trusted),
		);
		return skillPaths.length > 0 ? { skillPaths } : undefined;
	});

	// The dynamic-content shim: only for skills this extension contributed; nycode's own
	// `.pi/skills` (or an unknown name) pass through to nycode's plain expansion.
	nycode.on("input", async (event, ctx) => {
		if (event.source === "extension") return;
		return expandSkillInvocation(nycode, event.text, ctx);
	});
}

/** Claude's `skillOverrides` value for one skill from the settings chain, later
 * files winning: "off" hides the skill entirely, "name-only" trims its listing
 * (a nycode-loader surface, noted in docs). */
function skillOverrideFor(name: string, cwd: string, trusted: boolean): string | undefined {
	let value: string | undefined;
	for (const settings of readSettingsChain(claudeSettingsChain(cwd, os.homedir(), trusted))) {
		const overrides = settings.skillOverrides;
		if (isRecord(overrides) && typeof overrides[name] === "string") value = overrides[name];
	}
	return value;
}

/** Claude's skillOverrides "off": the skill is hidden and does not run; the
 * invocation is swallowed with a notice. Undefined lets the invocation proceed. */
function refusedByOverride(name: string, ctx: ExtensionContext, trusted: boolean): { action: "handled" } | undefined {
	if (skillOverrideFor(name, ctx.cwd, trusted) !== "off") return undefined;
	if (ctx.hasUI) ctx.ui.notify(`Skill "${name}" is turned off by skillOverrides in settings.`, "info");
	return { action: "handled" };
}

/** Forked skills still running in the background, by name. */
const runningForks = new Set<string>();

/** Whether a context: fork skill holds the invoking turn for its result. Claude: "The
 * forked subagent runs in the background: you keep working while it runs, and its result
 * arrives in your conversation when it completes. Set background: false in the frontmatter
 * to instead wait for the result in the turn that invoked the skill." It also waits in
 * non-interactive mode, when CLAUDE_CODE_DISABLE_BACKGROUND_TASKS is 1, and "when you
 * invoke a forked skill while an earlier invocation of the same skill is still running". */
function forkWaits(name: string, frontmatter: Record<string, unknown>, ctx: ExtensionContext): boolean {
	if (String(frontmatter.background).trim().toLowerCase() === "false") return true;
	return !ctx.hasUI || process.env.CLAUDE_CODE_DISABLE_BACKGROUND_TASKS === "1" || runningForks.has(name);
}

/** Where a forked skill's result goes: the session current when it completes, which after
 * a /new, /resume, /fork or /reload is not the one whose nycode started it. */
const forkResults = sessionMailbox("skill-fork-results");

/** Start a forked skill in the background and hand its result to the conversation when it
 * completes. The promise has no awaiter, so the catch keeps a delivery that throws from
 * surfacing as an unhandled rejection, which exits nycode. */
function startForkedSkill(
	ctx: ExtensionContext,
	fork: { name: string; filePath: string; expanded: string; agentName: string | undefined },
): { action: "handled" } {
	runningForks.add(fork.name);
	ctx.ui.notify(
		`Skill ${fork.name} is running in a forked subagent in the background; its result arrives here when it completes.`,
		"info",
	);
	void runForkedSkill(fork.name, fork.filePath, fork.expanded, fork.agentName)
		.then((result) =>
			forkResults.deliver((current, startsTurn) =>
				current.sendMessage(
					{ customType: "skill-fork", content: result.text, display: true },
					{ triggerTurn: startsTurn },
				),
			),
		)
		.catch(() => {})
		.finally(() => runningForks.delete(fork.name));
	return { action: "handled" };
}

/** Claude's context: fork run: the expanded skill content becomes the prompt that
 * drives a subagent, without the conversation history. Never rejects: a failed run
 * is reported in the returned block. */
async function runForkedSkill(
	name: string,
	filePath: string,
	expanded: string,
	agentName: string | undefined,
): Promise<{ action: "transform"; text: string }> {
	try {
		const output = await runAgent({ prompt: expanded, fullTools: true, ...(agentName ? { agent: agentName } : {}) });
		return {
			action: "transform",
			text: `<skill name="${name}" location="${filePath}">\nThe skill ran in a forked subagent (no conversation history shared). Its result:\n\n${output}\n</skill>`,
		};
	} catch (error) {
		return {
			action: "transform",
			text: `<skill name="${name}">\nThe forked subagent run failed: ${errorMessage(error)}\n</skill>`,
		};
	}
}

/** A `/skill:<name> args` invocation into its expanded skill block, or undefined to
 * pass the input through to nycode untouched. The expanded body is wrapped in nycode's
 * skill-block format so downstream behavior (the baseDir note for relative
 * references) matches an untouched invocation. */
/** Whether nycode resolved this skill name to another file: nycode loads its own skill directories
 * ahead of the ones this extension adds and the first name wins, so its listing then
 * shows that skill, and the invocation is left to nycode's own expansion of it. */
function shadowedByNycode(nycode: ExtensionAPI, name: string, filePath: string): boolean {
	const loaded = nycode
		.getCommands?.()
		.find((command) => command.source === "skill" && command.name === `skill:${name}`);
	if (loaded === undefined) return false;
	const real = (target: string): string => {
		try {
			return fs.realpathSync(target);
		} catch {
			return path.resolve(target);
		}
	};
	return real(loaded.sourceInfo.path) !== real(filePath);
}

/** The skill name and arguments of a `/skill:<name> <args>` or plugin `/<plugin>:<skill> <args>` input. */
function parseSkillInvocation(rawText: string): { name: string; args: string; plugin: boolean } | undefined {
	const text = rawText.trimStart();
	if (!text.startsWith("/")) return undefined;
	const plugin = !text.startsWith("/skill:");
	const space = text.search(/\s/);
	const name = (space === -1 ? text.slice(plugin ? 1 : 7) : text.slice(plugin ? 1 : 7, space)).trim();
	if (!name || (plugin && !name.includes(":"))) return undefined;
	return { name, args: space === -1 ? "" : text.slice(space + 1).trim(), plugin };
}

async function expandSkillInvocation(
	nycode: ExtensionAPI,
	rawText: string,
	ctx: ExtensionContext,
	options: Parameters<ExpandSkill>[2] = {},
): Promise<SkillExpansion> {
	const invocation = parseSkillInvocation(rawText);
	if (!invocation) return;
	const { args } = invocation;
	const trusted = isProjectApprovedSilently(ctx);
	const pluginSkill = invocation.plugin ? findPluginSkill(pluginSkills(), invocation.name) : undefined;
	if (invocation.plugin && !pluginSkill) return;
	const name = pluginSkill?.name ?? invocation.name;
	const found = pluginSkill
		? { filePath: pluginSkill.filePath, baseDir: path.dirname(pluginSkill.filePath) }
		: findClaudeSkill(name, skillDirs(ctx.cwd, os.homedir(), trusted));
	if (!found || (!pluginSkill && shadowedByNycode(nycode, name, found.filePath))) return;
	// Claude: "Plugin skills are not affected by skillOverrides."
	const refused = pluginSkill ? undefined : refusedByOverride(name, ctx, trusted);
	if (refused) return refused;
	let parsed: ReturnType<typeof parseCommandFile>;
	let content: string;
	try {
		content = fs.readFileSync(found.filePath, "utf-8");
		parsed = parseCommandFile(content);
	} catch {
		// Unreadable, or malformed frontmatter: pass through to nycode's plain expansion
		// (the loader registered the skill and delivers the raw body), rather than
		// failing the invocation over the dynamic features it cannot have.
		return;
	}
	// The current file decides, not the listing captured at session start.
	if (options.modelInvocation && parsed.disableModelInvocation)
		throw new Error(
			`/${name} is user-only (disable-model-invocation: true) and was not run. Only the user can invoke it.`,
		);
	// Claude registers hooks a skill's frontmatter declares when the skill is
	// invoked, for the rest of the session; the hooks extension owns running them,
	// so the declaration is announced over the shared bus.
	const frontmatter = parseClaudeFrontmatter<Record<string, unknown>>(content).frontmatter;
	const declaredHooks = frontmatter.hooks;
	if (declaredHooks !== null && typeof declaredHooks === "object" && !Array.isArray(declaredHooks)) {
		nycode.events?.emit(SKILL_HOOKS_CHANNEL, { skillName: name, hooks: declaredHooks });
	}
	let expanded: string;
	try {
		expanded = await expandCommand(nycode, parsed, args, { cwd: ctx.cwd }, found.filePath, pluginSkill?.plugin, {
			allowShell: options.allowShell !== false && !shellExecutionDisabled(ctx.cwd, os.homedir(), trusted),
		});
	} catch (error) {
		// A failed injected command aborts the invocation, as it does for a command: nycode logs a
		// throwing input handler and continues with the raw text, which would send the body
		// unexpanded. The notify carries the failure message.
		ctx.ui.notify(errorMessage(error), "error");
		return { action: "handled" };
	}
	if (typeof frontmatter.context === "string" && frontmatter.context.trim().toLowerCase() === "fork") {
		const agentName = typeof frontmatter.agent === "string" ? frontmatter.agent.trim() : undefined;
		if (options.inlineFork || forkWaits(name, frontmatter, ctx))
			return runForkedSkill(name, found.filePath, expanded, agentName);
		return startForkedSkill(ctx, { name, filePath: found.filePath, expanded, agentName });
	}
	return {
		action: "transform",
		text: `<skill name="${name}" location="${found.filePath}">\nReferences are relative to ${found.baseDir}.\n\n${expanded}\n</skill>`,
	};
}
