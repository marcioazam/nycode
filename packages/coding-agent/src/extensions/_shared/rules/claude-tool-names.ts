/**
 * The one place nycode tool names and Claude tool names are paired.
 *
 * Both directions (the Claude->nycode map that resolves `allowed-tools` entries, and the
 * nycode->Claude map behind hook payloads and matchers) derive from this one list, so a
 * tool cannot be nameable in one direction and invisible in the other: two separate
 * tables let a hook matcher written in Claude's vocabulary miss seven tools.
 *
 * Canonical names are the tools reference's own spellings. `claude: null` marks a nycode
 * tool the reference has no counterpart for: it stays untranslated in payloads, and
 * no Claude name resolves to it beyond its own spelling.
 *
 * Input SHAPES are a separate question and deliberately not driven from here. The
 * hooks reference documents per-tool input tables only for the file and shell tools,
 * so those are the only ones claude-tools.ts translates; for the rest there is no
 * documented Claude shape to conform to and the nycode input is passed through.
 */

interface ToolNamePair {
	/** Canonical Claude tool name, or null when the reference has no such tool. */
	claude: string | null;
	/** nycode's registered tool name. */
	nycode: string;
	/** Further Claude spellings accepted when reading a grant: renamed tools and
	 * secondary tools that share one nycode implementation. Never used for payloads. */
	aliases?: string[];
}

const TOOL_NAMES: ToolNamePair[] = [
	{ claude: "Read", nycode: "read" },
	{ claude: "Write", nycode: "write" },
	{ claude: "Edit", nycode: "edit" },
	{ claude: "Bash", nycode: "bash" },
	{ claude: "Grep", nycode: "grep" },
	{ claude: "Glob", nycode: "find" },
	{ claude: "WebFetch", nycode: "web_fetch" },
	{ claude: "WebSearch", nycode: "web_search" },
	// `Task` was renamed `Agent`; both spellings resolve, the payload reports `Agent`.
	{ claude: "Agent", nycode: "subagent", aliases: ["Task"] },
	{ claude: "AskUserQuestion", nycode: "question" },
	{ claude: "ExitPlanMode", nycode: "plan_mode_complete" },
	// Custom commands were folded into skills and the reference no longer lists a
	// SlashCommand tool, so `Skill` is canonical and `SlashCommand` is the legacy name.
	{ claude: "Skill", nycode: "slash_command", aliases: ["SlashCommand"] },
	// nycode's single todo tool serves Claude's whole todo/task-list family. Claude now
	// prefers TaskCreate/TaskGet/TaskList/TaskUpdate over TodoWrite/TodoRead; every
	// spelling resolves so an allowed-tools entry naming the current tools still grants
	// something, and TodoWrite stays the name a payload reports.
	{ claude: "TodoWrite", nycode: "todo", aliases: ["TodoRead", "TaskCreate", "TaskGet", "TaskList", "TaskUpdate"] },
	// KillShell was renamed TaskStop; both resolve, the payload reports TaskStop.
	{ claude: "TaskStop", nycode: "task_stop", aliases: ["KillShell"] },
	{ claude: "Monitor", nycode: "monitor" },
	// nycode tools the tools reference has no entry for.
	{ claude: null, nycode: "ls", aliases: ["LS"] },
];

const fold = (name: string): string => name.trim().toLowerCase();

/** Every Claude spelling -> nycode tool name, for reading a grant list. Includes each
 * nycode name itself so a list written in nycode's own vocabulary still resolves. */
export const CLAUDE_TOOL_MAP: Record<string, string> = Object.fromEntries(
	TOOL_NAMES.flatMap(({ claude, nycode, aliases }) => [
		...(claude === null ? [] : [[fold(claude), nycode]]),
		...(aliases ?? []).map((alias) => [fold(alias), nycode]),
		[fold(nycode), nycode],
	]),
);

const CLAUDE_NAME_BY_TOOL: Record<string, string> = Object.fromEntries(
	TOOL_NAMES.filter((pair): pair is ToolNamePair & { claude: string } => pair.claude !== null).map(
		({ claude, nycode }) => [nycode, claude],
	),
);

/** nycode built-in -> canonical Claude tool name for hook payloads and matchers, or
 * undefined for a nycode tool the reference has no counterpart for. MCP tools ride the
 * alias bus instead and never reach here. */
export function claudeToolName(nycodeName: string): string | undefined {
	return CLAUDE_NAME_BY_TOOL[nycodeName];
}
