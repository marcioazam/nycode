// Reads the sign-in of Devin Desktop (a Windsurf-based editor) from its Electron state database, read-only.
// Ported from pi-devin-plus 0.1.3 (MIT), see ../LICENSE. Only used after the user agrees in /login.
// The raw-file scan fallback of upstream was dropped: without `node:sqlite` there is no Desktop import.
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";

const AUTH_KEY = "windsurfAuthStatus";

export interface DesktopCredential {
	apiKey: string;
	source: string;
}

/** Devin Desktop state database path (`DEVIN_DESKTOP_STATE_DB` overrides the per-platform default). */
export function desktopStateDbPath(
	env: NodeJS.ProcessEnv = process.env,
	platform: NodeJS.Platform = process.platform,
	home: string = homedir(),
): string {
	if (env.DEVIN_DESKTOP_STATE_DB) return env.DEVIN_DESKTOP_STATE_DB;
	if (platform === "darwin") return join(home, "Library/Application Support/Devin/User/globalStorage/state.vscdb");
	if (platform === "win32") {
		return join(env.APPDATA ?? join(home, "AppData/Roaming"), "Devin/User/globalStorage/state.vscdb");
	}
	return join(home, ".config/Devin/User/globalStorage/state.vscdb");
}

/** Path of the Desktop state database when it exists, without opening it. */
export function desktopStateDbExists(path: string = desktopStateDbPath()): string | null {
	return existsSync(path) ? path : null;
}

function normalizeApiKey(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const apiKey = value.trim();
	// Real keys look like `devin-session-token$…` / `wspkce$…`; never contain spaces.
	if (apiKey.length < 16 || /\s/.test(apiKey)) return null;
	return apiKey;
}

function apiKeyFromStatusValue(value: unknown): string | null {
	if (typeof value !== "string" || !value.trim()) return null;
	try {
		const parsed = JSON.parse(value) as { apiKey?: unknown } | null;
		return normalizeApiKey(parsed?.apiKey);
	} catch {
		return null;
	}
}

// Deliberate exception to the no-inline-imports rule: a top-level `import "node:sqlite"` would print Node 22's
// ExperimentalWarning on every nycode startup, so it is loaded only here, after the user consented to the import.
function openReadOnly(path: string): DatabaseSync {
	const sqlite = createRequire(import.meta.url)("node:sqlite") as { DatabaseSync: typeof DatabaseSync };
	return new sqlite.DatabaseSync(path, { readOnly: true });
}

/** Session token of a signed-in Devin Desktop, or null when there is none or the database cannot be read. */
export async function readDevinDesktopApiKey(path: string = desktopStateDbPath()): Promise<DesktopCredential | null> {
	if (!existsSync(path)) return null;
	try {
		const db = openReadOnly(path);
		try {
			const row = db.prepare("SELECT value FROM ItemTable WHERE key = ?").get(AUTH_KEY) as
				| { value?: unknown }
				| undefined;
			const apiKey = apiKeyFromStatusValue(row?.value);
			return apiKey ? { apiKey, source: path } : null;
		} finally {
			db.close();
		}
	} catch {
		return null;
	}
}
