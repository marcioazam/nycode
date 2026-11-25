/**
 * Plugin skills under Claude Code's namespace. The skill loader names a skill by its directory under the fixed
 * `/skill:` prefix, which drops the plugin prefix, so plugin skills are not handed to it: they register here as
 * `/<plugin>:<skill>` commands for the user and through the `plugin_skill` tool for the model, and expand through
 * the same pipeline as every other Claude skill (skills-compat/index.ts).
 */

import * as fs from "node:fs";
import * as os from "node:os";
import { Type } from "typebox";
import type { ExtensionAPI, ExtensionContext } from "../../core/extensions/types.ts";
import { parseCommandFile } from "../_shared/commands/command-file.ts";
import { parseClaudeFrontmatter } from "../_shared/commands/frontmatter.ts";
import { type InstalledPlugin, installedPlugins, pluginComponentPath } from "../_shared/settings/plugins.ts";
import { errorMessage, isDirectory } from "../_shared/util/values.ts";
import { type CommandPlugin, pluginCommands } from "../commands/expand.ts";
import { slashCommandBudget, slashCommandToolDescription } from "../commands/index.ts";

export interface PluginSkill {
	/** Claude's plugin skill name, `plugin:skill`. */
	name: string;
	/** `plugin:<directory>` when the frontmatter `name` differs from the directory: resolves, listed nowhere. */
	alias?: string;
	filePath: string;
	plugin: CommandPlugin;
}

/** Each warning once per process: discovery runs per session and per invocation. */
const warned = new Set<string>();
function warnOnce(message: string): void {
	if (warned.has(message)) return;
	warned.add(message);
	console.warn(message);
}

/** The manifest's `skills` entries plus the default `skills/`: Claude scans both, a declaration adds to the default.
 * A path that resolves outside the plugin root is dropped by pluginComponentPath. */
function pluginSkillDirs(plugin: InstalledPlugin): string[] {
	const declared = plugin.manifest.skills;
	const extra = Array.isArray(declared) ? declared.map(String) : typeof declared === "string" ? [declared] : [];
	return [...extra, "skills"]
		.map((entry) => pluginComponentPath(plugin, entry))
		.filter((dir): dir is string => dir !== undefined && isDirectory(dir));
}

function skillName(filePath: string, fallback: string): string {
	try {
		const declared = parseClaudeFrontmatter<Record<string, unknown>>(fs.readFileSync(filePath, "utf-8")).frontmatter
			.name;
		if (typeof declared === "string" && declared.trim()) return declared.trim();
	} catch {
		// Malformed frontmatter: named by its directory, as the loader does.
	}
	return fallback;
}

/** The skills one directory holds (`<dir>/<name>/SKILL.md`), named `plugin:skill`. */
function skillsIn(dir: string, pluginName: string, plugin: CommandPlugin): PluginSkill[] {
	let entries: fs.Dirent[];
	try {
		entries = fs.readdirSync(dir, { withFileTypes: true });
	} catch {
		return [];
	}
	const found: PluginSkill[] = [];
	for (const entry of entries) {
		if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
		const filePath = `${dir}/${entry.name}/SKILL.md`;
		if (!fs.existsSync(filePath)) continue;
		const own = skillName(filePath, entry.name);
		const name = own.startsWith(`${pluginName}:`) ? own : `${pluginName}:${own}`;
		const alias = `${pluginName}:${entry.name}`;
		found.push({ name, ...(alias === name ? {} : { alias }), filePath, plugin });
	}
	return found;
}

/** The skills enabled plugins ship. NOT SUPPORTED: Claude's single-skill layout (SKILL.md at the plugin root); the
 * root would also pull in hooks/, agents/ and commands/ as skills. */
export function pluginSkills(home: string = os.homedir()): PluginSkill[] {
	const plugins = installedPlugins(home);
	const commandNames = new Set(pluginCommands(plugins).map((command) => command.name));
	const byName = new Map<string, PluginSkill>();
	for (const plugin of plugins) {
		const info: CommandPlugin = {
			root: plugin.root,
			dataDir: plugin.dataDir,
			...(plugin.userConfig ? { userConfig: plugin.userConfig } : {}),
		};
		for (const skill of pluginSkillDirs(plugin).flatMap((dir) => skillsIn(dir, plugin.name, info))) {
			// A plugin command keeps its established name; two plugins declaring one name resolve to the first.
			if (commandNames.has(skill.name)) {
				warnOnce(`nycode-skills: /${skill.name} is a plugin command; ignoring ${skill.filePath}`);
				continue;
			}
			const existing = byName.get(skill.name);
			if (existing) {
				warnOnce(`nycode-skills: /${skill.name} from ${skill.filePath} is hidden by ${existing.filePath}`);
				continue;
			}
			byName.set(skill.name, skill);
		}
	}
	return [...byName.values()];
}

/** The plugin skill a qualified name addresses; a skill's own name wins over another skill's directory alias. */
export function findPluginSkill(skills: readonly PluginSkill[], name: string): PluginSkill | undefined {
	return skills.find((skill) => skill.name === name) ?? skills.find((skill) => skill.alias === name);
}

export type SkillExpansion = { action: "transform"; text: string } | { action: "handled" } | undefined;
export type ExpandSkill = (
	text: string,
	ctx: ExtensionContext,
	options?: { allowShell?: boolean; inlineFork?: boolean; modelInvocation?: boolean },
) => Promise<SkillExpansion>;

type Invocable = Map<string, { description: string; argumentHint?: string; alias?: string }>;

/** Registers the plugin skills per session: a command per user-invocable skill (once per process: a command
 * cannot be unregistered) and, once anything is model-invocable, the `plugin_skill` tool. */
export function registerPluginSkills(nycode: ExtensionAPI, expand: ExpandSkill): (ctx: ExtensionContext) => void {
	const registered = new Set<string>();
	const invocable: Invocable = new Map();
	let toolRegistered = false;
	const describe = (contextWindow: number | undefined): string =>
		slashCommandToolDescription(
			[...invocable].map(([name, skill]) => ({
				name,
				description: skill.description,
				argumentHint: skill.argumentHint,
			})),
			slashCommandBudget(contextWindow),
		).replace(
			"Execute a custom slash command",
			"Run a skill shipped by an enabled Claude Code plugin. Its name includes the plugin",
		);

	const registerCommand = (skill: PluginSkill, parsed: ReturnType<typeof parseCommandFile>): void => {
		if (registered.has(skill.name)) return;
		registered.add(skill.name);
		if (nycode.getCommands?.().some((command) => command.name === skill.name)) {
			warnOnce(`nycode-skills: /${skill.name} is already registered; leaving that command in place`);
			return;
		}
		nycode.registerCommand(skill.name, {
			description: parsed.argumentHint ? `${parsed.description} ${parsed.argumentHint}` : parsed.description,
			// A registered command runs its handler instead of the input pipeline, so it expands the body itself.
			handler: async (args, ctx) => {
				const outcome = await expand(args.trim() ? `/${skill.name} ${args}` : `/${skill.name}`, ctx);
				if (!outcome || outcome.action === "handled") return;
				nycode.sendUserMessage(outcome.text, ctx.isIdle() ? {} : { deliverAs: "followUp" });
			},
		});
	};

	const registerTool = (contextWindow: number | undefined): void => {
		nycode.registerTool({
			name: "plugin_skill",
			label: "PluginSkill",
			description: describe(contextWindow),
			// The listing changes per session (enabled plugins, edited frontmatter); the tool registers once.
			prepareLoadout: () => ({ descriptions: { plugin_skill: describe(contextWindow) } }),
			parameters: Type.Object({
				command: Type.String({ description: 'The plugin skill to run with args, e.g. "/plugin:skill the change"' }),
			}),
			async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
				const invocation = params.command.trim().replace(/^\//, "");
				const typed = invocation.split(/\s/, 1)[0];
				const name = invocable.has(typed) ? typed : [...invocable].find(([, skill]) => skill.alias === typed)?.[0];
				if (name === undefined)
					throw new Error(
						`Unknown plugin skill: /${typed || params.command}. It is not available in this session.`,
					);
				// A model call never runs injected shell, and a forked skill returns its result through this tool.
				const outcome = await expand(`/${name}${invocation.slice(typed.length)}`, ctx, {
					allowShell: false,
					inlineFork: true,
					modelInvocation: true,
				});
				if (!outcome || outcome.action === "handled") throw new Error(`/${name} was not run.`);
				return { content: [{ type: "text" as const, text: outcome.text }], details: {} };
			},
		});
	};

	return (ctx) => {
		invocable.clear();
		// Claude: "Plugin skills are not affected by skillOverrides. Manage those through /plugin instead."
		for (const skill of pluginSkills()) {
			let parsed: ReturnType<typeof parseCommandFile>;
			try {
				parsed = parseCommandFile(fs.readFileSync(skill.filePath, "utf-8"));
			} catch (error) {
				warnOnce(`nycode-skills: ignoring ${skill.filePath}: ${errorMessage(error)}`);
				continue;
			}
			if (!parsed.disableModelInvocation)
				invocable.set(skill.name, {
					description: parsed.description,
					...(parsed.argumentHint ? { argumentHint: parsed.argumentHint } : {}),
					...(skill.alias ? { alias: skill.alias } : {}),
				});
			if (parsed.userInvocable) registerCommand(skill, parsed);
		}
		if (!toolRegistered && invocable.size > 0) {
			toolRegistered = true;
			registerTool((ctx as { model?: { contextWindow?: number } }).model?.contextWindow);
		}
	};
}
