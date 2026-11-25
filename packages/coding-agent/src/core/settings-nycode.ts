// Resolution of the nycode settings keys (docs/migration/nycode-core/02-arquitetura-alvo.md section 5).
// Precedence: environment variable, then settings.json, then default. A malformed value in either source is skipped,
// never thrown: settings files are not schema-validated at load time.
import { join } from "node:path";
import { getAgentDir } from "../config.ts";
import { SETTINGS_DEFAULTS } from "./settings-defaults.ts";
import type { Settings } from "./settings-schema.ts";

export type Env = Readonly<Record<string, string | undefined>>;

export interface NycodeSettings {
	/** Kept as written (text) so the permission gate can deny a value it does not know. */
	permissions: { engine: string };
	compaction: { maxContextTokens: number };
	harness: {
		effortSandwich: { enabled: boolean; turns: number };
		headless: { lean: boolean; trim: boolean; tools: "lean" | "all"; floor: boolean };
		/** "auto" means on in interactive sessions only. */
		prefixCache1h: boolean | "auto";
		autoResume: boolean;
		completionGate: boolean;
	};
	subagent: { respawn: boolean };
	tools: { bash: { backgroundOnTimeout: boolean } };
	todo: { staleReminder: boolean; sync: boolean };
	plan: { gate: boolean; readOnlyTools: string[] };
	bash: { mainGuard: { enabled: boolean; timeoutSec: number; capSec: number } };
	footer: { stats: boolean };
	editorMode: "normal" | "vim";
	notify: { sound: boolean; desktop: boolean };
	terminal: { uiState: string; reducedMotion: boolean; nerdFont: boolean | "auto"; asciiIcons: boolean };
	mcp: { configPath: string };
}

/** How one key is read: from the variable text and from the settings.json value. Both return undefined when malformed. */
interface Field<T> {
	fromEnv: (raw: string) => T | undefined;
	fromSettings: (raw: unknown) => T | undefined;
}

const envBoolean = (raw: string): boolean | undefined => {
	const text = raw.trim().toLowerCase();
	if (text === "1" || text === "true" || text === "yes" || text === "on") return true;
	if (text === "0" || text === "false" || text === "no" || text === "off") return false;
	return undefined;
};
const envNumber = (raw: string): number | undefined => (/^\d+(\.\d+)?$/.test(raw.trim()) ? Number(raw) : undefined);

const BOOLEAN: Field<boolean> = {
	fromEnv: envBoolean,
	fromSettings: (raw) => (typeof raw === "boolean" ? raw : undefined),
};
const AUTO: Field<boolean | "auto"> = {
	fromEnv: (raw) => (raw.trim() === "auto" ? "auto" : envBoolean(raw)),
	fromSettings: (raw) => (raw === "auto" ? raw : BOOLEAN.fromSettings(raw)),
};
const TOOLS: Field<"lean" | "all"> = {
	fromEnv: (raw) => (raw === "lean" || raw === "all" ? raw : undefined),
	fromSettings: (raw) => (raw === "lean" || raw === "all" ? raw : undefined),
};
/** Unlike the other keys a malformed value is kept as text, never skipped: the permission gate denies what it does not know. */
const ENGINE: Field<string> = {
	fromEnv: () => undefined,
	fromSettings: (raw) => (raw === undefined ? undefined : typeof raw === "string" ? raw : JSON.stringify(raw)),
};
const EDITOR_MODE: Field<"normal" | "vim"> = {
	fromEnv: () => undefined,
	fromSettings: (raw) => (raw === "normal" || raw === "vim" ? raw : undefined),
};
/** A list of non-empty names; a list with any other entry is malformed as a whole. */
const NAME_LIST: Field<string[]> = {
	fromEnv: () => undefined,
	fromSettings: (raw) =>
		Array.isArray(raw) && raw.every((item) => typeof item === "string" && item !== "") ? [...raw] : undefined,
};
const TEXT: Field<string> = {
	fromEnv: (raw) => (raw === "" ? undefined : raw),
	fromSettings: (raw) => (typeof raw === "string" && raw !== "" ? raw : undefined),
};
const integerAtLeast = (min: number): Field<number> => {
	const valid = (value: number | undefined) =>
		value !== undefined && Number.isSafeInteger(value) && value >= min ? value : undefined;
	return {
		fromEnv: (raw) => valid(envNumber(raw)),
		fromSettings: (raw) => valid(typeof raw === "number" ? raw : undefined),
	};
};
function pickOptional<T>(field: Field<T>, envRaw: string | undefined, settingValue: unknown): T | undefined {
	return (envRaw === undefined ? undefined : field.fromEnv(envRaw)) ?? field.fromSettings(settingValue);
}

function pick<T>(field: Field<T>, envRaw: string | undefined, settingValue: unknown, fallback: T): T {
	return pickOptional(field, envRaw, settingValue) ?? fallback;
}

/** True when NYCODE_BYPASS_PERMISSIONS is set but is not a recognised boolean (an empty value included). */
export function isBypassEnvUnrecognised(env: Env): boolean {
	const raw = env.NYCODE_BYPASS_PERMISSIONS;
	return raw !== undefined && envBoolean(raw) === undefined;
}

/**
 * Whether permission prompts are auto-approved. Flag, then NYCODE_BYPASS_PERMISSIONS, then settings.json, then false.
 * Fail closed: a variable that is set but unrecognised (empty included) is false, never a fall-through to settings.json.
 * `settings` must be the global layer: a project must not switch its own permission prompts off.
 */
export function resolveBypassPermissions(input: { flag?: boolean; env: Env; settings: Settings }): boolean {
	if (input.flag !== undefined) return input.flag;
	const raw = input.env.NYCODE_BYPASS_PERMISSIONS;
	if (raw !== undefined) return envBoolean(raw) ?? false;
	return pick(BOOLEAN, undefined, input.settings.permissions?.bypass, SETTINGS_DEFAULTS.permissions.bypass);
}

/** Resolve every nycode key except `permissions.bypass`, `hooks`, `statusLine` and `env`, which have their own getters. */
export function resolveNycodeSettings(settings: Settings, env: Env): NycodeSettings {
	const d = SETTINGS_DEFAULTS;
	const h = settings.harness;
	const guard = settings.bash?.mainGuard;
	return {
		permissions: { engine: pick(ENGINE, undefined, settings.permissions?.engine, d.permissions.engine) },
		compaction: {
			maxContextTokens: pick(
				integerAtLeast(1),
				env.NYCODE_COMPACT_AT,
				settings.compaction?.maxContextTokens,
				d.compaction.maxContextTokens,
			),
		},
		harness: {
			effortSandwich: {
				enabled: pick(
					BOOLEAN,
					env.NYCODE_EFFORT_SANDWICH,
					h?.effortSandwich?.enabled,
					d.harness.effortSandwich.enabled,
				),
				turns: pick(
					integerAtLeast(1),
					env.NYCODE_EFFORT_SANDWICH_TURNS,
					h?.effortSandwich?.turns,
					d.harness.effortSandwich.turns,
				),
			},
			headless: {
				lean: pick(BOOLEAN, env.NYCODE_HEADLESS_LEAN, h?.headless?.lean, d.harness.headless.lean),
				trim: pick(BOOLEAN, env.NYCODE_HEADLESS_TRIM, h?.headless?.trim, d.harness.headless.trim),
				tools: pick(TOOLS, env.NYCODE_HEADLESS_TOOLS, h?.headless?.tools, d.harness.headless.tools),
				floor: pick(BOOLEAN, env.NYCODE_HEADLESS_FLOOR, h?.headless?.floor, d.harness.headless.floor),
			},
			prefixCache1h: pick(AUTO, env.NYCODE_PREFIX_CACHE_1H, h?.prefixCache1h, d.harness.prefixCache1h),
			autoResume: pick(BOOLEAN, env.NYCODE_AUTO_RESUME, h?.autoResume, d.harness.autoResume),
			completionGate: pick(BOOLEAN, env.NYCODE_COMPLETION_GATE, h?.completionGate, d.harness.completionGate),
		},
		subagent: { respawn: pick(BOOLEAN, env.NYCODE_SUBAGENT_RESPAWN, settings.subagent?.respawn, d.subagent.respawn) },
		tools: {
			bash: {
				backgroundOnTimeout: pick(
					BOOLEAN,
					env.NYCODE_BASH_TIMEOUT_BG,
					settings.tools?.bash?.backgroundOnTimeout,
					d.tools.bash.backgroundOnTimeout,
				),
			},
		},
		todo: {
			staleReminder: pick(BOOLEAN, env.NYCODE_TODO_SYNC, settings.todo?.staleReminder, d.todo.staleReminder),
			sync: pick(BOOLEAN, env.NYCODE_TODO_SYNC_V2, settings.todo?.sync, d.todo.sync),
		},
		plan: {
			gate: pick(BOOLEAN, env.NYCODE_PLAN_GATE, settings.plan?.gate, d.plan.gate),
			readOnlyTools: pick(NAME_LIST, undefined, settings.plan?.readOnlyTools, [...d.plan.readOnlyTools]),
		},
		bash: {
			mainGuard: {
				enabled: pick(BOOLEAN, undefined, guard?.enabled, d.bash.mainGuard.enabled),
				timeoutSec: pick(integerAtLeast(1), undefined, guard?.timeoutSec, d.bash.mainGuard.timeoutSec),
				capSec: pick(integerAtLeast(1), undefined, guard?.capSec, d.bash.mainGuard.capSec),
			},
		},
		footer: { stats: pick(BOOLEAN, undefined, settings.footer?.stats, d.footer.stats) },
		editorMode: pick(EDITOR_MODE, undefined, settings.editorMode, d.editorMode),
		notify: {
			sound: pick(BOOLEAN, env.NYCODE_SOUND_NOTIFY, settings.notify?.sound, d.notify.sound),
			desktop: pick(BOOLEAN, undefined, settings.notify?.desktop, d.notify.desktop),
		},
		terminal: {
			uiState: pick(TEXT, env.NYCODE_UI_STATE, settings.terminal?.uiState, join(getAgentDir(), "ui-state.json")),
			reducedMotion: pick(
				BOOLEAN,
				env.NYCODE_REDUCED_MOTION,
				settings.terminal?.reducedMotion,
				d.terminal.reducedMotion,
			),
			nerdFont: pick(AUTO, env.NYCODE_NERD_FONT, settings.terminal?.nerdFont, d.terminal.nerdFont),
			asciiIcons: pick(BOOLEAN, env.NYCODE_ASCII_ICONS, settings.terminal?.asciiIcons, d.terminal.asciiIcons),
		},
		mcp: { configPath: pick(TEXT, env.NYCODE_MCP_CONFIG, settings.mcp?.configPath, join(getAgentDir(), "mcp.json")) },
	};
}
