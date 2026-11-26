// Reads the Devin CLI's credentials file and drives `devin auth login`. Ported from an MIT-licensed Devin provider extension, see ../LICENSE.
// Read-only: the CLI's own file is never written; nycode keeps the key in its auth store (see ../provider.ts).
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { runDevin } from "./cli.ts";
import { desktopStateDbExists, readDevinDesktopApiKey } from "./desktop-auth.ts";

export interface DevinCredentials {
	apiKey: string;
	path: string;
	/** Raw `api_server_url` of the CLI's file (a tenant host); validated by `resolveHostInfo` before use. */
	apiServerUrl?: string;
}

/** Where the Devin CLI keeps its sign-in. */
export function credentialsPath(home: string = homedir()): string {
	return join(home, ".local/share/devin/credentials.toml");
}

function parseTomlStrings(text: string): Record<string, string> {
	const out: Record<string, string> = {};
	for (const line of text.split("\n")) {
		const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*"(.*)"\s*$/);
		if (match) out[match[1]] = match[2];
	}
	return out;
}

/** The Devin CLI's stored API key, or null when it has none. Only the key is read from the file. */
export function readCredentials(path: string = credentialsPath()): DevinCredentials | null {
	if (!existsSync(path)) return null;
	const raw = parseTomlStrings(readFileSync(path, "utf8"));
	const apiKey = raw.windsurf_api_key || raw.api_key;
	const apiServerUrl = raw.api_server_url || raw.apiServerUrl;
	return apiKey ? { apiKey, path, ...(apiServerUrl ? { apiServerUrl } : {}) } : null;
}

/** Whether `devin auth status` reports a sign-in; a stored key counts when the CLI cannot be run. */
export async function authStatus(path: string = credentialsPath()): Promise<{ loggedIn: boolean; summary: string }> {
	const creds = readCredentials(path);
	try {
		const { stdout, stderr, code } = await runDevin(["auth", "status"], { timeoutMs: 15_000 });
		const text = `${stdout}\n${stderr}`.trim();
		const loggedIn = code === 0 && /logged in/i.test(text);
		return {
			loggedIn: loggedIn || Boolean(creds),
			summary: text || (creds ? "credentials.toml present" : "not signed in"),
		};
	} catch (error) {
		if (creds) return { loggedIn: true, summary: `Devin credentials present at ${path}` };
		return { loggedIn: false, summary: error instanceof Error ? error.message : String(error) };
	}
}

/** Asks the user (through /login's select prompt) whether to reuse a Devin Desktop sign-in. */
export type ConfirmDesktopImport = (source: string) => Promise<boolean>;

/**
 * Resolves an API key for /login: the CLI's own sign-in first; then, only with the user's consent, a signed-in Devin
 * Desktop; otherwise `devin auth login`. Nothing is written to Devin's files.
 */
export async function loginWithCli(confirmDesktopImport: ConfirmDesktopImport): Promise<DevinCredentials> {
	const path = credentialsPath();
	const already = readCredentials(path);
	const status = await authStatus(path);
	if (already && status.loggedIn) return already;

	const desktopDb = desktopStateDbExists();
	if (desktopDb && (await confirmDesktopImport(desktopDb))) {
		const desktop = await readDevinDesktopApiKey();
		if (desktop) return { apiKey: desktop.apiKey, path: desktop.source };
	}

	const { code } = await runDevin(["auth", "login"], { inheritStdio: true });
	const creds = readCredentials(path);
	if (!creds) {
		throw new Error(
			`\`devin auth login\` ${code === 0 ? "finished" : `exited ${code}`} but ${path} is missing. Run \`devin auth login\` yourself, then /login devin again.`,
		);
	}
	return creds;
}
