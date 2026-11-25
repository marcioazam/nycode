// Schemas of the nycode settings blocks (docs/migration/nycode-core/02-arquitetura-alvo.md section 5).
// The keys only exist, validate and are read here; the extensions that consume them arrive in later phases.
import { type Static, Type } from "typebox";
import { SETTINGS_DEFAULTS } from "./settings-defaults.ts";

const flag = (description: string, fallback: boolean) =>
	Type.Optional(Type.Boolean({ description, default: fallback }));

const PermissionsSettingsSchema = Type.Object({
	bypass: Type.Optional(
		Type.Boolean({
			description:
				"Auto-approve the permission prompts of the permission engine; deny rules still apply. Global setting only. NYCODE_BYPASS_PERMISSIONS and --bypass/--safe take precedence.",
			default: SETTINGS_DEFAULTS.permissions.bypass,
		}),
	),
	engine: Type.Optional(
		Type.Literal("native", {
			description:
				'Who decides the permission of each tool call: "native" (the TypeScript engine; the only one). Any other value, the removed "script" included, denies every tool call. Global setting only.',
			default: SETTINGS_DEFAULTS.permissions.engine,
		}),
	),
});

const HarnessSettingsSchema = Type.Object({
	effortSandwich: Type.Optional(
		Type.Object({
			enabled: flag(
				"High thinking on the first turns of a top-level headless run. NYCODE_EFFORT_SANDWICH takes precedence.",
				SETTINGS_DEFAULTS.harness.effortSandwich.enabled,
			),
			turns: Type.Optional(
				Type.Integer({
					minimum: 1,
					description: "Turns that use high thinking. NYCODE_EFFORT_SANDWICH_TURNS takes precedence.",
					default: SETTINGS_DEFAULTS.harness.effortSandwich.turns,
				}),
			),
		}),
	),
	headless: Type.Optional(
		Type.Object({
			lean: flag("Lean prompt and tools in top-level headless runs. NYCODE_HEADLESS_LEAN takes precedence.", true),
			trim: flag("Trim docs and tool schemas in headless runs. NYCODE_HEADLESS_TRIM takes precedence.", true),
			tools: Type.Optional(
				Type.Union([Type.Literal("lean"), Type.Literal("all")], {
					description: '"all" keeps subagent, memory, lsp and todo tools. NYCODE_HEADLESS_TOOLS takes precedence.',
					default: SETTINGS_DEFAULTS.harness.headless.tools,
				}),
			),
			floor: flag("Add the headless instruction floor. NYCODE_HEADLESS_FLOOR takes precedence.", true),
		}),
	),
	prefixCache1h: Type.Optional(
		Type.Union([Type.Boolean(), Type.Literal("auto")], {
			description:
				'One-hour prompt-prefix cache TTL. "auto" enables it in interactive sessions only. NYCODE_PREFIX_CACHE_1H takes precedence.',
			default: SETTINGS_DEFAULTS.harness.prefixCache1h,
		}),
	),
	autoResume: flag("Resume a turn cut short by a transient failure. NYCODE_AUTO_RESUME takes precedence.", true),
	completionGate: flag(
		"Block a final answer while the task has unfinished steps. NYCODE_COMPLETION_GATE takes precedence.",
		true,
	),
});

const SubagentSettingsSchema = Type.Object({
	respawn: flag("Respawn a crashed foreground subagent. NYCODE_SUBAGENT_RESPAWN takes precedence.", true),
});

const ToolsSettingsSchema = Type.Object({
	bash: Type.Optional(
		Type.Object({
			backgroundOnTimeout: flag(
				"Keep a command that hits its timeout running in the background. NYCODE_BASH_TIMEOUT_BG takes precedence.",
				false,
			),
		}),
	),
});

const TodoSettingsSchema = Type.Object({
	staleReminder: flag("Remind the model of a stale todo list. NYCODE_TODO_SYNC takes precedence.", true),
	sync: flag(
		"Todo sync: end-of-turn check, items for background work, 30-call reminder. NYCODE_TODO_SYNC_V2 takes precedence.",
		false,
	),
});

const PlanSettingsSchema = Type.Object({
	gate: flag("Keep plan mode open until the plan is submitted. NYCODE_PLAN_GATE takes precedence.", true),
	readOnlyTools: Type.Optional(
		Type.Array(Type.String(), {
			description:
				'Tools plan mode allows besides the read-only built-ins and the MCP tools that declare readOnlyHint. Names or simple globs, for example "mcp__docs__*".',
			default: SETTINGS_DEFAULTS.plan.readOnlyTools,
		}),
	),
});

const BashSettingsSchema = Type.Object({
	mainGuard: Type.Optional(
		Type.Object({
			enabled: flag(
				"In the main interactive session, cap the bash timeout and refuse sleeps of 30 s or more and polling loops, so control returns to you. Subagents and print mode are not affected.",
				SETTINGS_DEFAULTS.bash.mainGuard.enabled,
			),
			timeoutSec: Type.Optional(
				Type.Integer({
					minimum: 1,
					description: "Timeout in seconds of a bash call that sets none, in the main session.",
					default: SETTINGS_DEFAULTS.bash.mainGuard.timeoutSec,
				}),
			),
			capSec: Type.Optional(
				Type.Integer({
					minimum: 1,
					description: "Longest timeout in seconds a bash call may ask for, in the main session.",
					default: SETTINGS_DEFAULTS.bash.mainGuard.capSec,
				}),
			),
		}),
	),
});

const FooterSettingsSchema = Type.Object({
	stats: flag("Show the stats line (tokens, cost and model) in the footer.", SETTINGS_DEFAULTS.footer.stats),
});

const NotifySettingsSchema = Type.Object({
	sound: flag("Play a sound when the agent finishes. NYCODE_SOUND_NOTIFY takes precedence.", true),
	desktop: flag("Send a desktop notification when the agent finishes.", SETTINGS_DEFAULTS.notify.desktop),
});

const text = (description: string) => Type.Optional(Type.String({ description }));

const McpSettingsSchema = Type.Object({
	configPath: text(
		"MCP servers file; defaults to mcp.json in the agent directory. NYCODE_MCP_CONFIG takes precedence.",
	),
});

const HookCommandSchema = Type.Union([
	Type.Object({
		type: Type.Literal("command"),
		command: Type.String(),
		timeout: Type.Optional(Type.Number({ minimum: 0 })),
	}),
	Type.Object({
		type: Type.Literal("internal"),
		name: Type.String({ description: "A hook of the core, run in-process." }),
		timeout: Type.Optional(Type.Number({ minimum: 0 })),
	}),
]);

const HookMatcherSchema = Type.Object({
	matcher: Type.Optional(Type.String()),
	hooks: Type.Array(HookCommandSchema),
});

const StatusLineSettingsSchema = Type.Object({
	type: Type.Literal("command"),
	command: Type.String(),
	padding: Type.Optional(Type.Number({ minimum: 0 })),
});

/** Properties added to `SettingsSchema`, one per block of section 5. */
export const NycodeSettingsProperties = {
	permissions: Type.Optional(PermissionsSettingsSchema),
	harness: Type.Optional(HarnessSettingsSchema),
	subagent: Type.Optional(SubagentSettingsSchema),
	tools: Type.Optional(ToolsSettingsSchema),
	todo: Type.Optional(TodoSettingsSchema),
	plan: Type.Optional(PlanSettingsSchema),
	bash: Type.Optional(BashSettingsSchema),
	footer: Type.Optional(FooterSettingsSchema),
	editorMode: Type.Optional(
		Type.Union([Type.Literal("normal"), Type.Literal("vim")], {
			description: 'Prompt editor keys: "normal" or "vim".',
			default: SETTINGS_DEFAULTS.editorMode,
		}),
	),
	notify: Type.Optional(NotifySettingsSchema),
	mcp: Type.Optional(McpSettingsSchema),
	hooks: Type.Optional(
		Type.Record(Type.String(), Type.Array(HookMatcherSchema), {
			description: "Command hooks by event name, read by the hooks extension.",
		}),
	),
	statusLine: Type.Optional(StatusLineSettingsSchema),
	env: Type.Optional(
		Type.Record(Type.String(), Type.String(), {
			description: "Environment variables exported to hooks and the status line command.",
		}),
	),
};

export type HooksSettings = NonNullable<Static<typeof NycodeSettingsProperties.hooks>>;
export type StatusLineSettings = NonNullable<Static<typeof NycodeSettingsProperties.statusLine>>;
