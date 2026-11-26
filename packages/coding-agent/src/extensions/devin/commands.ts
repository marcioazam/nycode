// /devin-status and /devin-refresh. Ported from pi-devin-plus 0.1.3 (MIT), see ./LICENSE.
import type { ExtensionAPI, ExtensionCommandContext } from "../../core/extensions/types.ts";
import { devinVersion, findDevinBin } from "./auth/cli.ts";
import { credentialsPath, readCredentials } from "./auth/credentials.ts";
import { resolveHostInfo } from "./auth/host.ts";
import { resolveClientIdentity } from "./auth/identity.ts";
import { type LoginSource, readSessionState } from "./auth/login/session.ts";
import { type CachedDevinCatalog, isCatalogCacheFresh, readCatalogCache } from "./catalog/cache.ts";
import { DEVIN_PROVIDER_ID } from "./constants.ts";
import type { DevinProvider } from "./provider.ts";
import { DEVIN_API_KEY_ENV } from "./wire/stream.ts";

const SOURCE_LABELS: Record<LoginSource, string> = {
	cli: "Devin CLI credentials",
	desktop: "Devin Desktop session",
	browser: "browser sign-in (PKCE)",
	code: "pasted sign-in code (PKCE)",
};

/** Which sources built the cached catalog. */
function catalogOrigin(cached: CachedDevinCatalog): string {
	if (cached.source === "cli+rpc") return "Devin CLI + API enrichment";
	if (cached.source === "rpc") return "Devin API only (no CLI)";
	return `Devin CLI (API unavailable${cached.fallbackReason ? `: ${cached.fallbackReason}` : ""})`;
}

function catalogLine(): string {
	try {
		const cached = readCatalogCache();
		if (!cached) return "Catalog: not cached yet (fallback models); run /devin-refresh";
		const minutes = Math.round((Date.now() - cached.fetchedAt) / 60_000);
		return `Catalog: ${catalogOrigin(cached)}, cached ${minutes} min ago${isCatalogCacheFresh(cached) ? "" : " (stale; run /devin-refresh)"}`;
	} catch {
		return "Catalog: cache unreadable (fallback models); run /devin-refresh";
	}
}

/** The stored credential's origin, never the credential. */
async function authLine(ctx: ExtensionCommandContext): Promise<{ text: string; signedIn: boolean }> {
	const stored = await ctx.modelRegistry.getApiKeyForProvider(DEVIN_PROVIDER_ID);
	const env = process.env[DEVIN_API_KEY_ENV]?.trim();
	if (stored && env && stored === env)
		return { text: `Auth: ${DEVIN_API_KEY_ENV} environment variable`, signedIn: true };
	const session = readSessionState();
	if (stored) {
		return {
			text: `Auth: signed in via ${session ? SOURCE_LABELS[session.source] : "a stored credential"}`,
			signedIn: true,
		};
	}
	if (readCredentials())
		return { text: "Auth: Devin CLI credentials found; run /login devin to store them", signedIn: true };
	return { text: `Auth: not signed in. Run /login devin or set ${DEVIN_API_KEY_ENV}`, signedIn: false };
}

function hostLine(): string {
	const info = resolveHostInfo();
	const origin = { default: "default", "cli-credentials": "Devin CLI credentials", login: "sign-in" }[info.source];
	const warning = info.ignored
		? `\nWarning: ignored tenant host "${info.ignored}" (must be https on .codeium.com, .windsurf.com or .devin.ai)`
		: "";
	return `Host: ${info.host} (${origin})${warning}`;
}

/** Registers the two Devin slash commands. */
export function registerDevinCommands(nycode: ExtensionAPI, provider: DevinProvider): void {
	nycode.registerCommand("devin-status", {
		description: "Show Devin auth source, host, client identity and catalog status",
		handler: async (_args, ctx) => {
			const bin = findDevinBin();
			const version = bin ? await devinVersion() : null;
			const identity = await resolveClientIdentity();
			const auth = await authLine(ctx);
			const creds = readCredentials();
			ctx.ui.notify(
				[
					bin ? `CLI: ${bin}` : "CLI: not found (optional; install it or set DEVIN_CLI to its absolute path)",
					`CLI version: ${version ?? "unknown"}`,
					creds ? `CLI credentials: ${creds.path}` : `CLI credentials: none at ${credentialsPath()}`,
					auth.text,
					hostLine(),
					`Identity: ${identity.ide} ${identity.version}${identity.kind === "fallback" ? " (fallback: no Devin CLI found)" : ""}`,
					catalogLine(),
				].join("\n"),
				auth.signedIn ? "info" : "warning",
			);
		},
	});

	nycode.registerCommand("devin-refresh", {
		description: "Refresh the Devin model catalog (`devin models list` enriched by the Devin API)",
		handler: async (_args, ctx) => {
			try {
				const apiKey = await ctx.modelRegistry.getApiKeyForProvider(DEVIN_PROVIDER_ID);
				const { models, source, fallbackReason } = await provider.refreshCatalog(apiKey);
				ctx.ui.notify(
					`Devin: loaded ${models.length} models from ${source === "rpc" ? "the Devin API only" : source === "cli+rpc" ? "the Devin CLI + API enrichment" : "the local CLI"}.${fallbackReason ? ` ${fallbackReason}` : ""}`,
					"info",
				);
			} catch (error) {
				ctx.ui.notify(`Devin refresh failed: ${error instanceof Error ? error.message : String(error)}`, "error");
			}
		},
	});
}
