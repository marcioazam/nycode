// Port of ponytail hooks/ponytail-config.js (DietrichGebert/ponytail v5.3.3, MIT, see LICENSE): mode names and the
// default-mode, quiet-startup and hide-status resolvers.
//
// Default mode: PONYTAIL_DEFAULT_MODE, then `defaultMode` of $XDG_CONFIG_HOME/ponytail/config.json (or
// ~/.config/ponytail/config.json, %APPDATA%\ponytail\config.json on Windows), then "full".

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { isRecord } from "../_shared/util/values.ts";

export const DEFAULT_MODE = "full";
const VALID_MODES = ["off", "lite", "full", "ultra", "review"] as const;
export const RUNTIME_MODES = ["off", "lite", "full", "ultra"] as const;
export type RuntimeMode = (typeof RUNTIME_MODES)[number];
export type PonytailMode = (typeof VALID_MODES)[number];

const isRuntimeMode = (mode: string): mode is RuntimeMode => (RUNTIME_MODES as readonly string[]).includes(mode);
const isPonytailMode = (mode: string): mode is PonytailMode => (VALID_MODES as readonly string[]).includes(mode);

/** A runtime level (off, lite, full, ultra), or null. */
export function normalizeMode(mode: unknown): RuntimeMode | null {
	if (typeof mode !== "string") return null;
	const normalized = mode.trim().toLowerCase();
	return isRuntimeMode(normalized) ? normalized : null;
}

function normalizeConfigMode(mode: unknown): PonytailMode | null {
	if (typeof mode !== "string") return null;
	const normalized = mode.trim().toLowerCase();
	return isPonytailMode(normalized) ? normalized : null;
}

/** A level that may sit in a session entry: a runtime level or `review`. */
export function normalizePersistedMode(mode: unknown): PonytailMode | null {
	return normalizeMode(mode) ?? normalizeConfigMode(mode);
}

/** "stop ponytail" / "normal mode" as the whole message (case and trailing punctuation ignored); a phrase inside an
 * ordinary request must not turn the rules off mid-task. */
export function isDeactivationCommand(text: unknown): boolean {
	const t = String(text ?? "")
		.trim()
		.toLowerCase()
		.replace(/[.!?\s]+$/, "");
	return t === "stop ponytail" || t === "normal mode";
}

function configPath(): string {
	const base = process.env.XDG_CONFIG_HOME
		? process.env.XDG_CONFIG_HOME
		: process.platform === "win32"
			? (process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming"))
			: path.join(os.homedir(), ".config");
	return path.join(base, "ponytail", "config.json");
}

/** The config file as an object; {} when absent, unreadable or not an object. A UTF-8 BOM is tolerated. */
function readConfig(): Record<string, unknown> {
	try {
		const parsed: unknown = JSON.parse(fs.readFileSync(configPath(), "utf8").replace(/^\uFEFF/, ""));
		return isRecord(parsed) ? parsed : {};
	} catch {
		return {};
	}
}

/** The default level: a runtime level only, `review` is session-only. */
export function getDefaultMode(): RuntimeMode {
	return normalizeMode(process.env.PONYTAIL_DEFAULT_MODE) ?? normalizeMode(readConfig().defaultMode) ?? DEFAULT_MODE;
}

/** An env flag: set to anything but "", "0", "false", "no" is on; unset falls through to the config key. */
function flag(env: string | undefined, key: "quietStartup" | "hideStatus"): boolean {
	if (env !== undefined) {
		const v = env.trim().toLowerCase();
		return v !== "" && v !== "0" && v !== "false" && v !== "no";
	}
	return readConfig()[key] === true;
}

/** Silences the "Ponytail loaded" startup notice, keeping the rules active. */
export const getQuietStartup = (): boolean => flag(process.env.PONYTAIL_QUIET_STARTUP, "quietStartup");

/** Hides the status-bar indicator, keeping the rules active. */
export const getHideStatus = (): boolean => flag(process.env.PONYTAIL_HIDE_STATUS, "hideStatus");

/** Saves `mode` as the default in the config file; null for a level that cannot be a default. */
export function writeDefaultMode(mode: unknown): RuntimeMode | null {
	const normalized = normalizeMode(mode);
	if (!normalized) return null;
	const file = configPath();
	fs.mkdirSync(path.dirname(file), { recursive: true });
	fs.writeFileSync(file, JSON.stringify({ ...readConfig(), defaultMode: normalized }, null, 2), "utf8");
	return normalized;
}
