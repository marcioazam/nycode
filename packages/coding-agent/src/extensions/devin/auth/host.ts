// Which API host the extension talks to. The API key, the JWT and the whole conversation go there, so a tenant host is
// accepted only from the Devin CLI's credentials or a PKCE exchange, and only when it is https on a Cognition domain.
import { readCredentials } from "./credentials.ts";
import { readSessionState } from "./login/session.ts";
import { DEVIN_API_HOST } from "./net.ts";

// Hostname shape: lowercase labels under a Cognition domain, at most 4 labels before the suffix. Residual risk: any
// subdomain of those domains passes, so a takeover of one would receive the key (see the harness record).
const ALLOWED_HOST = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.(codeium\.com|windsurf\.com|devin\.ai)$/;
const MAX_PREFIX_LABELS = 4;

/** The origin of `raw` when it is a plain https URL on an allowed domain; null otherwise. */
export function validateApiHost(raw: string): string | null {
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		return null;
	}
	if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
	if (!ALLOWED_HOST.test(url.hostname)) return null;
	// The suffix is two labels, so the prefix is everything before them.
	return url.hostname.split(".").length - 2 <= MAX_PREFIX_LABELS ? url.origin : null;
}

export interface HostInfo {
	host: string;
	source: "default" | "cli-credentials" | "login";
	/** A tenant host that was offered and refused (shown by /devin-status). */
	ignored?: string;
}

/** Resolves the host: the PKCE sign-in's tenant, else the CLI credentials' `api_server_url`, else the default. */
export function resolveHostInfo(): HostInfo {
	const session = readSessionState();
	if (session?.host) {
		const host = validateApiHost(session.host);
		if (host) return { host, source: "login" };
		return { host: DEVIN_API_HOST, source: "default", ignored: session.host };
	}
	let raw: string | undefined;
	try {
		raw = readCredentials()?.apiServerUrl;
	} catch {
		raw = undefined;
	}
	if (!raw) return { host: DEVIN_API_HOST, source: "default" };
	const host = validateApiHost(raw);
	return host ? { host, source: "cli-credentials" } : { host: DEVIN_API_HOST, source: "default", ignored: raw };
}

/** The host every RPC (JWT, catalog, chat) uses. */
export function resolveApiHost(): string {
	return resolveHostInfo().host;
}
