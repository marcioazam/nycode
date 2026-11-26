// Exchanges the PKCE authorization code for the Devin session token. Logic from JoShMiQueL/devin-core
// auth/exchange.ts (MIT, Copyright (c) JoShMiQueL), see ../../LICENSE. Never echoes the code or the token.
import { redactSecrets } from "../../errors/redact.ts";
import { readErrorText } from "../../transport/bounded-body.ts";
import { validateApiHost } from "../host.ts";

/** Devin auth API that issues the session token. */
export const AUTH_API_URL = "https://api.devin.ai";

/** Prefix the Devin CLI puts before the session token; it is the API key the chat endpoints take. */
export const TOKEN_PREFIX = "devin-session-token$";

export interface ExchangeResult {
	/** `devin-session-token$<token>`. */
	apiKey: string;
	/** Tenant API host, only when the response named a valid one. */
	host?: string;
}

/** POSTs `{code, code_verifier}`; resolves the stored-form API key. */
export async function exchangeCode(code: string, verifier: string): Promise<ExchangeResult> {
	let response: Response;
	try {
		response = await fetch(`${AUTH_API_URL}/auth/cli/token`, {
			method: "POST",
			headers: { "Content-Type": "application/json", Accept: "application/json" },
			body: JSON.stringify({ code, code_verifier: verifier }),
			signal: AbortSignal.timeout(30_000),
			redirect: "error",
		});
	} catch (error) {
		throw new Error(`Devin sign-in exchange failed: ${error instanceof Error ? error.message : String(error)}`);
	}
	const text = await readErrorText(response);
	// Server bytes: parsed defensively; unknown shapes become a plain error.
	let parsed: { token?: unknown; message?: unknown; api_server_url?: unknown } = {};
	try {
		const value: unknown = JSON.parse(text);
		if (typeof value === "object" && value !== null) parsed = value;
	} catch {
		// non-JSON body
	}
	if (!response.ok) {
		const detail = redactSecrets(typeof parsed.message === "string" ? parsed.message : text).slice(0, 200);
		throw new Error(`Devin sign-in exchange failed (HTTP ${response.status}): ${detail}`);
	}
	if (typeof parsed.token !== "string" || !parsed.token) {
		throw new Error("Devin sign-in exchange succeeded but returned no token");
	}
	const host = typeof parsed.api_server_url === "string" ? validateApiHost(parsed.api_server_url) : null;
	return { apiKey: `${TOKEN_PREFIX}${parsed.token}`, ...(host ? { host } : {}) };
}
