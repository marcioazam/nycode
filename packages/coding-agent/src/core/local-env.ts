/**
 * Loader of `<agentDir>/local.env` (D-52; the shell wrapper of the origin harness had the same loader).
 *
 * The file holds KEY=VALUE lines of a fixed allowlist, read as literal text (never evaluated). It must be owned by
 * the user with mode 0600 or 0400, else nothing is loaded. A variable already set in the environment wins over the
 * file. Nothing is read from the directories of the origin harness (D-09).
 */

import { readFileSync, type Stats, statSync } from "node:fs";
import { join } from "node:path";
import { expandTildePath } from "../config.ts";

/** The keys local.env may set, under their nycode names (D-09). */
export const LOCAL_ENV_KEYS: ReadonlySet<string> = new Set([
	"NYCODE_BYPASS_PERMISSIONS",
	"NYCODE_COMPACT_AT",
	"PONYTAIL_QUIET_STARTUP",
	"NYCODE_SUBAGENT_RESPAWN",
	"NYCODE_EFFORT_SANDWICH",
	"NYCODE_EFFORT_SANDWICH_TURNS",
]);

export function localEnvPath(agentDir: string, env: NodeJS.ProcessEnv = process.env): string {
	const override = env.NYCODE_LOCAL_ENV;
	return override ? expandTildePath(override) : join(agentDir, "local.env");
}

/** One pair of matching quotes around a non-empty value is dropped, as the shell wrapper did. */
function unquote(value: string): string {
	const quote = value[0];
	if (value.length > 2 && (quote === '"' || quote === "'") && value.endsWith(quote)) return value.slice(1, -1);
	return value;
}

/** Why the file is refused (a message for stderr), or undefined when its owner and mode are fine. */
function refusal(file: string, mode: number, uid: number): string | undefined {
	const bits = (mode & 0o777).toString(8);
	if (bits !== "600" && bits !== "400") return `${file} must have mode 0600 (found ${bits}), ignoring local.env`;
	if (process.getuid && process.getuid() !== uid) return `${file} is not owned by you, ignoring local.env`;
	return undefined;
}

/** Loads the allowlisted keys of `file` into `env`; problems go to `warn`, never throw. */
export function loadLocalEnv(
	file: string,
	env: NodeJS.ProcessEnv = process.env,
	warn: (message: string) => void = (message) => console.error(`nycode: ${message}`),
): void {
	let stat: Stats;
	try {
		stat = statSync(file);
	} catch {
		return;
	}
	if (!stat.isFile()) return;
	// Windows has no POSIX owner or mode: the check is skipped there.
	if (process.platform !== "win32") {
		const refused = refusal(file, stat.mode, stat.uid);
		if (refused) {
			warn(refused);
			return;
		}
	}
	let text: string;
	try {
		text = readFileSync(file, "utf8");
	} catch {
		return;
	}
	text.split("\n").forEach((raw, index) => {
		const line = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
		if (line === "" || line.startsWith("#")) return;
		const eq = line.indexOf("=");
		const key = eq < 0 ? "" : line.slice(0, eq);
		if (!LOCAL_ENV_KEYS.has(key)) {
			warn(`local.env:${index + 1} ignored`);
			return;
		}
		if (env[key] !== undefined) return;
		env[key] = unquote(line.slice(eq + 1));
	});
}
