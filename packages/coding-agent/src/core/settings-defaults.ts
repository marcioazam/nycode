import { DEFAULT_MAX_AGENT_RETRY_DELAY_MS } from "@nycode/ai/utils/retry";

// nycode: K4 embedded hooks, status line and env defaults (docs/migration/nycode-core/02-arquitetura-alvo.md sections 5 and 6)
// The embedded resources root as the shell sees it: the `claude-rules` and `hooks` extensions export NYCODE_RESOURCES
// (core/builtin-resources.ts), so the commands below expand when they run. Quoted in the commands: the root may have spaces.
// biome-ignore lint/suspicious/noTemplateCurlyInString: shell variable, expanded when the hook runs
const RES = "${NYCODE_RESOURCES}";

/** One core hook, run in-process (`src/extensions/hooks/internal/registry.ts`). */
const core = (name: string) => ({ type: "internal", name, timeout: 10 }) as const;
const coreNotes = core("core-notes");

/** Runtime defaults shared by settings accessors and the published JSON Schema. */
export const SETTINGS_DEFAULTS = {
	transport: "auto",
	sessionShareDestination: "auto",
	steeringMode: "one-at-a-time",
	followUpMode: "one-at-a-time",
	compaction: {
		enabled: true,
		reserveTokens: 16384,
		keepRecentTokens: 20000,
		maxContextTokens: 250000,
	},
	branchSummary: {
		reserveTokens: 16384,
		skipPrompt: false,
	},
	retry: {
		enabled: true,
		maxRetries: 10,
		baseDelayMs: 2000,
		maxAgentDelayMs: DEFAULT_MAX_AGENT_RETRY_DELAY_MS,
		provider: {
			maxRetryDelayMs: 60000,
		},
	},
	hideThinkingBlock: false,
	showCacheMissNotices: false,
	// nycode: K4 nycode defaults: quietStartup "header", defaultProjectTrust "never", retry, permissions and harness blocks
	quietStartup: "header",
	defaultProjectTrust: "never",
	shellCommandPrefix:
		"export GIT_EDITOR=true GIT_SEQUENCE_EDITOR=true GIT_MERGE_AUTOEDIT=no GIT_PAGER=cat PAGER=cat AWS_PAGER= LESS=FRX",
	collapseChangelog: false,
	enableInstallTelemetry: true,
	enableAnalytics: false,
	enableSkillCommands: true,
	terminal: {
		showImages: true,
		imageWidthCells: 60,
		clearOnShrink: false,
		showTerminalProgress: false,
		reducedMotion: false,
		nerdFont: "auto",
		asciiIcons: false,
	},
	images: {
		autoResize: true,
		blockImages: false,
	},
	doubleEscapeAction: "tree",
	treeFilterMode: "default",
	editorPaddingX: 0,
	outputPad: 1,
	autocompleteMaxVisible: 5,
	markdown: {
		codeBlockIndent: "  ",
		mermaid: "streaming",
	},
	warnings: {
		anthropicExtraUsage: true,
	},
	codemode: {
		mode: "on",
		inlineBudget: 3000,
	},
	cacheWarming: "idle",
	tuiMode: "fullscreen",
	fullscreenExitOutput: "transcript",
	fullscreenScrollbar: "auto",
	fullscreenCopyOnSelect: true,
	fullscreenWheelScrollLines: "auto",
	// nycode keys (docs/migration/nycode-core/02-arquitetura-alvo.md section 5); read by the extensions that own them.
	permissions: { bypass: false, engine: "native" },
	harness: {
		effortSandwich: { enabled: false, turns: 1 },
		headless: { lean: true, trim: true, tools: "lean", floor: true },
		prefixCache1h: "auto",
		autoResume: true,
		completionGate: true,
	},
	subagent: { respawn: true },
	tools: { bash: { backgroundOnTimeout: false } },
	todo: { staleReminder: true, sync: false },
	plan: { gate: true, readOnlyTools: [] as string[] },
	bash: { mainGuard: { enabled: true, timeoutSec: 120, capSec: 600 } },
	footer: { stats: false },
	editorMode: "normal",
	notify: { sound: true, desktop: true },
	// nycode: K4 hooks, statusLine and env defaults
	// Hooks registered by default, run by the `hooks` extension. The permission guard is native (core/permissions), not
	// a hook. A `hooks` entry in settings.json replaces the default list of that event. The ralph-loop Stop hook is not
	// a default: the hooks extension registers it while a /ralph-loop state file exists.
	hooks: {
		SessionStart: [{ matcher: "startup|resume|clear|compact", hooks: [coreNotes] }],
		PostToolUse: [{ matcher: "*", hooks: [coreNotes] }],
	},
	// Status line: the claude-hud launcher. It prints nothing until the claude-hud plugin is installed (/claude-hud-setup).
	// A `statusLine` entry in settings.json replaces it; an empty `command` turns it off.
	statusLine: { type: "command", command: `node "${RES}/statusline/statusline.mjs"`, refreshInterval: 60 },
	// Exported to every process by the `env-settings` extension; a `env` entry in settings.json adds to or overrides it.
	// PONYTAIL_*: the embedded ponytail extension (D-54).
	env: {
		EIO_BACKEND: "posix",
		PONYTAIL_QUIET_STARTUP: "1",
	},
} as const;
