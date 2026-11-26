/**
 * Ponytail ("lazy senior dev" rules), on by default: a port of the extension of DietrichGebert/ponytail v5.3.3
 * (MIT, see LICENSE). The rules join the system prompt as the `ponytail` section, at the level of the session
 * (`/ponytail lite|full|ultra|off|status|default <level>`; default `full`, PONYTAIL_DEFAULT_MODE or the config file).
 * A subagent child inherits the parent's level, kept only by agents that can write (`tools:` with edit or write, or no
 * tools restriction); PONYTAIL_SUBAGENT_MATCHER (unanchored, case-insensitive regex over the agent name) overrides that
 * rule when set. The six `ponytail*` skills are embedded resources.
 */

import type { ExtensionAPI, ExtensionContext } from "../../core/extensions/types.ts";
import { errorMessage } from "../_shared/util/values.ts";
import {
	DEFAULT_MODE,
	getDefaultMode,
	getHideStatus,
	getQuietStartup,
	isDeactivationCommand,
	normalizeMode,
	normalizePersistedMode,
	type PonytailMode,
	RUNTIME_MODES,
	writeDefaultMode,
} from "./config.ts";
import { getPonytailInstructions } from "./instructions.ts";

const ALIASES = ["review", "audit", "gain", "debt", "help"] as const;
const STATUS_KEY = "ponytail";
const MODE_ENTRY = "ponytail-mode";
const LEVEL_ICONS: Record<string, string> = { lite: "🌿", full: "⚡", ultra: "🔥" };

/** The level a session resumes at: the last `ponytail-mode` entry, else `fallback`. */
export function resolveSessionMode(entries: unknown, fallback: unknown = DEFAULT_MODE): PonytailMode {
	const base = normalizePersistedMode(fallback) ?? DEFAULT_MODE;
	if (!Array.isArray(entries)) return base;
	for (let i = entries.length - 1; i >= 0; i -= 1) {
		const entry = entries[i] as { type?: string; customType?: string; data?: { mode?: unknown } } | undefined;
		if (entry?.type !== "custom" || entry.customType !== MODE_ENTRY) continue;
		const mode = normalizePersistedMode(entry.data?.mode);
		if (mode) return mode;
	}
	return base;
}

/** The subagent name from the `--system-prompt <dir>/prompt-<name>.md` argument the subagent extension passes to a
 * child; null when absent or unparseable. */
export function subagentName(argv: readonly string[]): string | null {
	const i = argv.indexOf("--system-prompt");
	const file = i >= 0 ? (argv[i + 1] ?? "").split(/[\\/]/).pop() : undefined;
	return (file && /^prompt-(.+)\.md$/.exec(file)?.[1]) || null;
}

/** The `--tools` allowlist the subagent extension passes to a child (its agent's `tools:` frontmatter, already
 * normalized); null when the agent has no tools restriction and so inherits every tool. */
export function childTools(argv: readonly string[]): string[] | null {
	const i = argv.indexOf("--tools");
	const list = i >= 0 ? argv[i + 1] : undefined;
	return list === undefined ? null : list.split(",").map((tool) => tool.trim());
}

/** The level of a child process: the parent's, turned off for an agent that cannot write. `matcher`
 * (PONYTAIL_SUBAGENT_MATCHER) is an explicit override: when set, only agents whose name it matches keep the level,
 * and an unparseable name or a bad regex keeps it. Without it, the agent keeps the level when its tools include
 * `edit` or `write`, or when it has no tools restriction. */
export function childMode(options: {
	parentMode?: string;
	matcher?: string;
	argv: readonly string[];
	fallback: PonytailMode;
}): PonytailMode {
	const mode = normalizePersistedMode(options.parentMode) ?? options.fallback;
	if (mode === "off") return mode;
	if (!options.matcher) {
		const tools = childTools(options.argv);
		return tools === null || tools.some((tool) => tool === "edit" || tool === "write") ? mode : "off";
	}
	const name = subagentName(options.argv);
	if (name === null) return mode;
	try {
		// nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp -- PONYTAIL_SUBAGENT_MATCHER is a regex by contract from the user's own environment or settings, tested against a short agent name
		return new RegExp(options.matcher, "i").test(name) ? mode : "off";
	} catch {
		return mode;
	}
}

type Parsed =
	| { type: "status" }
	| { type: "set-mode"; mode: ReturnType<typeof normalizeMode> & string }
	| { type: "set-default"; mode: ReturnType<typeof normalizeMode> & string }
	| { type: "invalid" };

/** `/ponytail <args>`: bare turns it on (or reports the level when on), `status`, `default <level>`, or a level. */
export function parsePonytailCommand(text: string, defaultMode: string, currentMode: string | null): Parsed {
	const fallback = normalizePersistedMode(defaultMode) ?? DEFAULT_MODE;
	const [primary, secondary] = text.trim().toLowerCase().split(/\s+/);
	if (!primary) {
		if (currentMode && currentMode !== "off") return { type: "status" };
		return { type: "set-mode", mode: normalizeMode(fallback === "off" ? "full" : fallback) ?? "full" };
	}
	if (primary === "status") return { type: "status" };
	if (primary === "default") {
		const mode = normalizeMode(secondary);
		return mode ? { type: "set-default", mode } : { type: "invalid" };
	}
	const mode = normalizeMode(primary);
	return mode ? { type: "set-mode", mode } : { type: "invalid" };
}

export default function ponytailExtension(nycode: ExtensionAPI): void {
	let currentMode: PonytailMode = DEFAULT_MODE;
	let configuredDefault: string = getDefaultMode();
	let hideStatus = getHideStatus();
	let isActive = false;
	let lastCtx: ExtensionContext | undefined;
	// Resolvers of the next agent_settled: an alias without UI waits for its run (`-p` disposes the runtime at once).
	const settledWaiters: Array<() => void> = [];

	function syncStatus(ctx?: ExtensionContext): void {
		if (ctx) lastCtx = ctx;
		const c = ctx ?? lastCtx;
		if (hideStatus || !c?.ui?.setStatus) return;
		let theme: ExtensionContext["ui"]["theme"];
		try {
			theme = c.ui.theme;
			if (!theme?.fg) return;
		} catch {
			return; // a theme proxy that throws before the theme is initialised
		}
		if (currentMode === "off") {
			c.ui.setStatus(STATUS_KEY, "");
			return;
		}
		const dot = isActive ? theme.fg("accent", "●") : theme.fg("dim", "○");
		const icon = LEVEL_ICONS[currentMode] ?? "";
		c.ui.setStatus(
			STATUS_KEY,
			`${dot} 🐴 ${theme.fg("muted", "ponytail: ")}${theme.fg("text", `${icon} ${currentMode.toUpperCase()}`)}`,
		);
	}

	function setMode(mode: unknown, ctx?: ExtensionContext): void {
		const normalized = normalizePersistedMode(mode);
		if (!normalized) return;
		currentMode = normalized;
		process.env.PONYTAIL_PARENT_MODE = currentMode;
		nycode.appendEntry(MODE_ENTRY, { mode: normalized });
		syncStatus(ctx);
		ctx?.ui?.notify?.(`Ponytail mode set to ${normalized}.`, "info");
	}

	async function sendAlias(skill: string, args: string, ctx: ExtensionContext): Promise<void> {
		const message = args.trim() ? `${skill} ${args.trim()}` : skill;
		if (!ctx.isIdle()) {
			nycode.sendUserMessage(message, { deliverAs: "followUp" });
			ctx.ui.notify(`${skill} queued as follow-up.`, "info");
			return;
		}
		if (ctx.hasUI) {
			nycode.sendUserMessage(message);
			return;
		}
		const settled = new Promise<void>((resolve) => settledWaiters.push(resolve));
		nycode.sendUserMessage(message);
		const started = (async () => {
			for (let waited = 0; waited < 60_000; waited += 50) {
				if (!ctx.isIdle()) return true;
				await new Promise((resolve) => setTimeout(resolve, 50));
			}
			return false;
		})();
		if (await Promise.race([settled.then(() => false), started])) await settled;
	}

	nycode.on("agent_settled", async () => {
		for (const resolve of settledWaiters.splice(0)) resolve();
	});

	nycode.registerCommand("ponytail", {
		description: `Set mode: ${RUNTIME_MODES.join("|")}. Commands: status, default <mode>`,
		handler: async (args, ctx) => {
			const parsed = parsePonytailCommand(args, configuredDefault, currentMode);
			if (parsed.type === "status") {
				ctx.ui.notify(`Ponytail: current ${currentMode} • default ${configuredDefault}`, "info");
			} else if (parsed.type === "set-default") {
				try {
					const written = writeDefaultMode(parsed.mode);
					configuredDefault = getDefaultMode();
					ctx.ui.notify(
						configuredDefault === written
							? `Default Ponytail mode set to ${written}.`
							: `Saved default ${written}, but env override keeps default at ${configuredDefault}.`,
						"info",
					);
				} catch (error) {
					ctx.ui.notify(`Failed to save default mode: ${errorMessage(error)}`, "error");
				}
			} else if (parsed.type === "set-mode") {
				setMode(parsed.mode, ctx);
			} else {
				ctx.ui.notify("Unknown or unsupported /ponytail mode.", "warning");
			}
		},
	});

	for (const alias of ALIASES) {
		const name = `ponytail-${alias}`;
		nycode.registerCommand(name, {
			description: `Run /skill:${name}`,
			handler: (args, ctx) => sendAlias(`/skill:${name}`, args, ctx),
		});
	}

	nycode.on("input", async (event) => {
		if (event.source === "extension") return undefined;
		if (currentMode !== "off" && isDeactivationCommand(event.text)) setMode("off");
		return undefined;
	});

	nycode.on("session_start", async (_event, ctx) => {
		const entries = ctx.sessionManager.getBranch();
		configuredDefault = getDefaultMode();
		hideStatus = getHideStatus();
		currentMode = resolveSessionMode(entries, configuredDefault);
		if (process.env.NYCODE_SUBAGENT) {
			currentMode = childMode({
				parentMode: process.env.PONYTAIL_PARENT_MODE,
				matcher: process.env.PONYTAIL_SUBAGENT_MATCHER,
				argv: process.argv,
				fallback: currentMode,
			});
		}
		// Children spawned later inherit the level through the environment.
		process.env.PONYTAIL_PARENT_MODE = currentMode;
		syncStatus(ctx);
		if (!getQuietStartup()) ctx.ui.notify(`Ponytail loaded: ${currentMode}`, "info");
	});

	nycode.on("agent_start", async (_event, ctx) => {
		isActive = true;
		syncStatus(ctx);
	});

	nycode.on("agent_end", async (_event, ctx) => {
		isActive = false;
		syncStatus(ctx);
	});

	nycode.on("before_agent_start", async (event) => {
		const sections = event.systemPromptOptions.sections;
		if (currentMode === "off") {
			delete sections.ponytail; // a section of an earlier turn must not linger
			return undefined;
		}
		sections.ponytail = getPonytailInstructions(currentMode);
		return undefined;
	});
}
