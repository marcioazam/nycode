// PKCE (S256) helpers and the Devin CLI sign-in URL. Logic from JoShMiQueL/devin-core auth/pkce.ts and auth/url.ts
// (MIT, Copyright (c) JoShMiQueL), see ../../LICENSE.
import { createHash, randomBytes } from "node:crypto";

/** Devin web app: hosts the CLI sign-in page. */
export const WEBAPP_URL = "https://app.devin.ai";

/** A PKCE code verifier or CSRF state: 32 random bytes, base64url. */
export function randomToken(): string {
	return randomBytes(32).toString("base64url");
}

/** S256 challenge: base64url(sha256(verifier)). */
export function challengeFor(verifier: string): string {
	return createHash("sha256").update(verifier).digest("base64url");
}

/** `{webapp}/auth/cli/continue` URL. Without `redirectUri` the web app shows a code to paste back instead. */
export function authorizeUrl(input: { state: string; challenge: string; redirectUri?: string }): string {
	const url = new URL("/auth/cli/continue", WEBAPP_URL);
	if (input.redirectUri) url.searchParams.set("redirect_uri", input.redirectUri);
	url.searchParams.set("state", input.state);
	url.searchParams.set("prompt", "select_account");
	url.searchParams.set("code_challenge", input.challenge);
	url.searchParams.set("code_challenge_method", "S256");
	return url.toString();
}
