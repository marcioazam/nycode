// Remembers how the user signed in and, for a PKCE sign-in, the tenant host. Non-secret: the key itself only lives in
// nycode's auth store. `<agent dir>/cache/devin/session.json`, mode 0600.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getAgentDir } from "../../../../config.ts";

export type LoginSource = "cli" | "desktop" | "browser" | "code";

export interface SessionState {
	source: LoginSource;
	/** Raw tenant host from a PKCE sign-in; validated again by `resolveHostInfo` before use. */
	host?: string;
}

const SOURCES: readonly string[] = ["cli", "desktop", "browser", "code"];

export function sessionStatePath(agentDir: string = getAgentDir()): string {
	return join(agentDir, "cache", "devin", "session.json");
}

/** The stored sign-in state; null when absent or unreadable. */
export function readSessionState(path: string = sessionStatePath()): SessionState | null {
	try {
		if (!existsSync(path)) return null;
		const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
		if (typeof parsed !== "object" || parsed === null) return null;
		const { source, host } = parsed as { source?: unknown; host?: unknown };
		if (typeof source !== "string" || !SOURCES.includes(source)) return null;
		return { source: source as LoginSource, ...(typeof host === "string" ? { host } : {}) };
	} catch {
		return null;
	}
}

/** Replaces the stored sign-in state. */
export function writeSessionState(state: SessionState, path: string = sessionStatePath()): void {
	mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
	writeFileSync(path, `${JSON.stringify(state)}\n`, { mode: 0o600 });
}
