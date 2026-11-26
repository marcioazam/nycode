// Registers the `devin` provider: cached or fallback models at startup, sign-in (CLI, browser, pasted code), catalog
// refresh over the Devin API with `devin models list` as fallback. Ported from an MIT-licensed Devin provider extension, see ./LICENSE.
import type { OAuthCredentials, OAuthLoginCallbacks } from "@nycode/ai";
import type { ExtensionAPI, ProviderChatModelConfig } from "../../core/extensions/types.ts";
import { isOfflineModeEnabled } from "../../core/package-manager.ts";
import { resolveApiHost } from "./auth/host.ts";
import { runLogin } from "./auth/login/flow.ts";
import { writeSessionState } from "./auth/login/session.ts";
import { DEVIN_API_HOST } from "./auth/net.ts";
import {
	type CachedDevinCatalog,
	type CatalogSource,
	isCatalogCacheFresh,
	isUsableCatalog,
	readCatalogCache,
	writeCatalogCache,
} from "./catalog/cache.ts";
import { enrichCatalog } from "./catalog/enrich.ts";
import { type DevinCatalog, FALLBACK_MODELS, loadCliCatalog, modelsFromCatalog } from "./catalog/models.ts";
import { catalogFromRpc, fetchRpcModels } from "./catalog/rpc.ts";
import { DEVIN_API_NAME, DEVIN_PROVIDER_ID } from "./constants.ts";
import { DEVIN_API_KEY_ENV, streamDevin } from "./wire/stream.ts";

export { DEVIN_PROVIDER_ID };

// A Devin API key has no expiry of its own; the stored credential is only renewed by logging in again.
const CREDENTIAL_LIFETIME_MS = 365 * 24 * 60 * 60 * 1000;

export interface CatalogRefresh {
	models: ProviderChatModelConfig[];
	source: CatalogSource;
	/** Why the Devin API was unavailable when `source` is `cli`. */
	fallbackReason?: string;
}

export interface DevinProvider {
	/**
	 * Loads the catalog (`devin models list` owns families and ids, the Devin API enriches it per model; API alone when the CLI fails), writes the cache and re-registers
	 * the models. Concurrent calls share one run.
	 */
	refreshCatalog(apiKey?: string): Promise<CatalogRefresh>;
}

function readCachedCatalog(): CachedDevinCatalog | null {
	try {
		return readCatalogCache();
	} catch {
		// A corrupt cache must never break startup: the fallback models are used instead.
		return null;
	}
}

function message(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/**
 * Registers the provider with cached models (or the static fallback). Startup never runs the Devin CLI and never
 * touches the network; the catalog refreshes on /devin-refresh, after /login and, over the API only, on the first
 * request once the cache is stale.
 */
export function registerDevinProvider(nycode: ExtensionAPI): DevinProvider {
	let inFlight: Promise<CatalogRefresh> | null = null;
	let backgroundTried = false;
	let backgroundRun: Promise<unknown> | null = null;

	const register = (models: ProviderChatModelConfig[]): void => {
		nycode.registerProvider(DEVIN_PROVIDER_ID, {
			name: "Devin Local",
			api: DEVIN_API_NAME,
			baseUrl: DEVIN_API_HOST,
			// Lets DEVIN_LLM_API_KEY alone make the models available; a stored /login credential still wins.
			apiKey: `$${DEVIN_API_KEY_ENV}`,
			models,
			oauth: {
				name: "Devin",
				isSubscription: true,
				async login(callbacks: OAuthLoginCallbacks): Promise<OAuthCredentials> {
					const outcome = await runLogin(callbacks);
					try {
						writeSessionState({ source: outcome.source, ...(outcome.host ? { host: outcome.host } : {}) });
					} catch {
						// Only the sign-in label and a tenant host are lost; the credential itself is returned below.
					}
					// Best effort: a failed refresh keeps the current models.
					await refreshCatalog(outcome.apiKey).catch(() => undefined);
					return { refresh: "", access: outcome.apiKey, expires: Date.now() + CREDENTIAL_LIFETIME_MS };
				},
				async refreshToken(credentials: OAuthCredentials): Promise<OAuthCredentials> {
					return { ...credentials, expires: Date.now() + CREDENTIAL_LIFETIME_MS };
				},
				getApiKey(credentials: OAuthCredentials): string {
					return credentials.access;
				},
			},
			streamSimple: (model, context, options) => {
				refreshStaleCatalogInBackground(options?.apiKey ?? process.env[DEVIN_API_KEY_ENV]?.trim());
				return streamDevin(model, context, options);
			},
		});
	};

	// `base` is the cached CLI-owned catalog the background refresh enriches (it never runs the CLI itself).
	const loadCatalog = async (
		apiKey: string | undefined,
		useCli: boolean,
		base?: DevinCatalog,
	): Promise<CatalogRefresh> => {
		const [rpcResult, cliResult] = await Promise.allSettled([
			apiKey ? fetchRpcModels(apiKey, resolveApiHost()) : Promise.reject(new Error("no Devin API key")),
			useCli ? loadCliCatalog() : Promise.resolve(base ?? null),
		]);
		const rpcModels = rpcResult.status === "fulfilled" ? rpcResult.value : null;
		const cli = cliResult.status === "fulfilled" && isUsableCatalog(cliResult.value) ? cliResult.value : null;
		const apiError = rpcResult.status === "rejected" ? message(rpcResult.reason) : undefined;
		const cliError =
			cliResult.status === "rejected" ? message(cliResult.reason) : cli ? undefined : "no usable model families";

		let catalog: DevinCatalog;
		let source: CatalogSource;
		let fallbackReason: string | undefined;
		if (cli) {
			// The CLI owns families and ids (what Devin shows and users save); the API only enriches per model uid.
			catalog = rpcModels ? enrichCatalog(cli, rpcModels) : cli;
			source = rpcModels ? "cli+rpc" : "cli";
			fallbackReason = rpcModels ? undefined : `Devin API: ${apiError}`;
		} else if (rpcModels) {
			catalog = catalogFromRpc(rpcModels);
			source = "rpc";
		} else {
			throw new Error(apiKey ? `Devin API: ${apiError}${useCli ? `; Devin CLI: ${cliError}` : ""}` : `${cliError}`);
		}
		if (!isUsableCatalog(catalog)) throw new Error("the Devin catalog has no usable models");
		try {
			writeCatalogCache(catalog, undefined, Date.now(), source, fallbackReason);
		} catch {
			// The registered models still work; only the next startup loses the fresh list.
		}
		const models = modelsFromCatalog(catalog);
		register(models);
		return { models, source, ...(fallbackReason ? { fallbackReason } : {}) };
	};

	const refreshCatalog = async (apiKey?: string): Promise<CatalogRefresh> => {
		if (isOfflineModeEnabled()) throw new Error("NYCODE_OFFLINE is set; the catalog was not refreshed");
		// The background run is API-only: wait for it, then run the full refresh (CLI included) instead of returning it.
		if (backgroundRun) await backgroundRun;
		inFlight ??= loadCatalog(apiKey, true).finally(() => {
			inFlight = null;
		});
		return inFlight;
	};

	// First request of the process with a missing or stale cache: refresh over the API only (never runs the CLI) and
	// never delay the request.
	const refreshStaleCatalogInBackground = (apiKey: string | undefined): void => {
		if (backgroundTried || !apiKey || isOfflineModeEnabled() || inFlight) return;
		const cached = readCachedCatalog();
		if (cached && isCatalogCacheFresh(cached)) return;
		backgroundTried = true;
		const run = loadCatalog(apiKey, false, cached?.source === "rpc" ? undefined : cached?.catalog).finally(() => {
			inFlight = null;
			backgroundRun = null;
		});
		inFlight = run;
		backgroundRun = run.catch(() => undefined);
	};

	const cached = readCachedCatalog();
	register(cached ? modelsFromCatalog(cached.catalog) : FALLBACK_MODELS);
	return { refreshCatalog };
}
