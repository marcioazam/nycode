// /login devin: Devin CLI sign-in, browser sign-in (PKCE with a loopback redirect) or a pasted code (PKCE, headless).
// PKCE flow after JoShMiQueL/devin-core auth/login.ts (MIT, Copyright (c) JoShMiQueL), see ../../LICENSE.
import type { OAuthLoginCallbacks } from "@nycode/ai";
import { findDevinBin } from "../cli.ts";
import { credentialsPath, loginWithCli } from "../credentials.ts";
import { exchangeCode } from "./exchange.ts";
import { startCallbackServer } from "./loopback.ts";
import { authorizeUrl, challengeFor, randomToken } from "./pkce.ts";
import type { LoginSource } from "./session.ts";

export interface LoginOutcome {
	apiKey: string;
	source: LoginSource;
	/** Tenant host from the PKCE exchange, when it named a valid one. */
	host?: string;
}

type Method = "cli" | "browser" | "code";

async function chooseMethod(callbacks: OAuthLoginCallbacks): Promise<Method> {
	const options = [
		...(findDevinBin() ? [{ id: "cli", label: "Devin CLI login (reuses or runs `devin auth login`)" }] : []),
		{ id: "browser", label: "Browser login (opens app.devin.ai, returns to this machine)" },
		{ id: "code", label: "Paste a code (headless: sign in on any device and paste the code)" },
	];
	const choice = await callbacks.onSelect({ message: "How do you want to sign in to Devin?", options });
	if (choice === "cli" || choice === "browser" || choice === "code") return choice;
	throw new Error("Devin sign-in cancelled");
}

async function cliLogin(callbacks: OAuthLoginCallbacks): Promise<LoginOutcome> {
	const creds = await loginWithCli(
		async (source) =>
			(await callbacks.onSelect({
				message: `A Devin Desktop sign-in was found at ${source}. Reuse its session token?`,
				options: [
					{ id: "desktop", label: "Use the Devin Desktop sign-in" },
					{ id: "cli", label: "Run `devin auth login` instead" },
				],
			})) === "desktop",
	);
	return { apiKey: creds.apiKey, source: creds.path === credentialsPath() ? "cli" : "desktop" };
}

function withAbort<T>(promise: Promise<T>, signal: AbortSignal | undefined, onAbort: () => void): Promise<T> {
	if (!signal) return promise;
	return new Promise<T>((resolve, reject) => {
		const abort = () => {
			onAbort();
			reject(new Error("Devin sign-in cancelled"));
		};
		if (signal.aborted) return abort();
		signal.addEventListener("abort", abort, { once: true });
		promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
	});
}

async function browserLogin(callbacks: OAuthLoginCallbacks): Promise<LoginOutcome> {
	const verifier = randomToken();
	const state = randomToken();
	const server = await startCallbackServer(state);
	try {
		callbacks.onAuth({
			url: authorizeUrl({ state, challenge: challengeFor(verifier), redirectUri: server.redirectUri }),
			instructions: "Sign in to Devin in the browser; this window continues on its own.",
		});
		const code = await withAbort(server.code, callbacks.signal, server.close);
		return { ...(await exchangeCode(code, verifier)), source: "browser" };
	} finally {
		server.close();
	}
}

async function codeLogin(callbacks: OAuthLoginCallbacks): Promise<LoginOutcome> {
	const verifier = randomToken();
	const state = randomToken();
	callbacks.onAuth({
		url: authorizeUrl({ state, challenge: challengeFor(verifier) }),
		instructions: "Open the link on any device, sign in to Devin and copy the code it shows.",
	});
	const code = (await callbacks.onPrompt({ message: "Paste the Devin sign-in code" })).trim();
	if (!code) throw new Error("Devin sign-in needs the pasted code");
	return { ...(await exchangeCode(code, verifier)), source: "code" };
}

/** Runs the sign-in the user picks. The returned key is never printed or logged here. */
export async function runLogin(callbacks: OAuthLoginCallbacks): Promise<LoginOutcome> {
	const method = await chooseMethod(callbacks);
	if (method === "cli") return cliLogin(callbacks);
	return method === "browser" ? browserLogin(callbacks) : codeLogin(callbacks);
}
