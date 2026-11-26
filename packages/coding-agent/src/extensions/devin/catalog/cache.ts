// On-disk cache and validation of the Devin model catalog. Ported from pi-devin-plus 0.1.3 (MIT), see ../LICENSE.
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getAgentDir } from "../../../config.ts";
import type { DevinCatalog } from "./models.ts";

const CACHE_VERSION = 1;

/** Catalog older than this is stale: it is refreshed on /devin-refresh, /login and, in the background, on the first request. */
export const CATALOG_CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000;

// Catalog ids reach the wire and the model picker: keep them short and free of control characters.
const ID_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;
const LABEL_MAX = 200;
const REASON_MAX = 300;

/** Where a cached catalog came from: the Devin API only (`rpc`), `devin models list` (`cli`) or the CLI list enriched per model by the API (`cli+rpc`). */
export type CatalogSource = "rpc" | "cli" | "cli+rpc";

export interface CachedDevinCatalog {
	catalog: DevinCatalog;
	fetchedAt: number;
	source: CatalogSource;
	/** Why the Devin API catalog was not used (set only when `source` is `cli`). */
	fallbackReason?: string;
}

interface CatalogCacheFile extends CachedDevinCatalog {
	version: typeof CACHE_VERSION;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isId(value: unknown): value is string {
	return typeof value === "string" && ID_PATTERN.test(value);
}

function isLabel(value: unknown): value is string {
	return typeof value === "string" && value.length <= LABEL_MAX;
}

/** Trust boundary: the catalog comes from the CLI output or the cache file. Checks shape, id charset and length. */
export function isUsableCatalog(value: unknown): value is DevinCatalog {
	if (!isRecord(value) || !Array.isArray(value.families) || value.families.length === 0) return false;
	return (
		value.families.some(
			(family) => isRecord(family) && Array.isArray(family.variants) && family.variants.length > 0,
		) &&
		value.families.every(
			(family) =>
				isRecord(family) &&
				isLabel(family.family_label) &&
				isId(family.family_uid) &&
				isId(family.slug) &&
				Array.isArray(family.variants) &&
				family.variants.every((variant) => isRecord(variant) && isId(variant.model_uid) && isLabel(variant.label)),
		)
	);
}

/** `<agent dir>/cache/devin/models.json`. */
export function catalogCachePath(agentDir: string = getAgentDir()): string {
	return join(agentDir, "cache", "devin", "models.json");
}

/** Reads the cache; null when absent, throws when present but invalid. */
export function readCatalogCache(path: string = catalogCachePath()): CachedDevinCatalog | null {
	if (!existsSync(path)) return null;
	const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
	if (
		!isRecord(parsed) ||
		parsed.version !== CACHE_VERSION ||
		typeof parsed.fetchedAt !== "number" ||
		!Number.isFinite(parsed.fetchedAt) ||
		!isUsableCatalog(parsed.catalog)
	) {
		throw new Error(`Invalid Devin model catalog cache: ${path}`);
	}
	const fallbackReason =
		typeof parsed.fallbackReason === "string" ? parsed.fallbackReason.slice(0, REASON_MAX) : undefined;
	return {
		catalog: parsed.catalog,
		fetchedAt: parsed.fetchedAt,
		source: parsed.source === "rpc" || parsed.source === "cli+rpc" ? parsed.source : "cli",
		...(fallbackReason ? { fallbackReason } : {}),
	};
}

/** Writes the cache atomically (temp file + rename), directory 0700 and file 0600. */
export function writeCatalogCache(
	catalog: DevinCatalog,
	path: string = catalogCachePath(),
	fetchedAt: number = Date.now(),
	source: CatalogSource = "cli",
	fallbackReason?: string,
): void {
	if (!isUsableCatalog(catalog)) throw new Error("Refusing to cache an invalid Devin model catalog");
	mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
	const temporaryPath = `${path}.${process.pid}.${fetchedAt}.tmp`;
	const body: CatalogCacheFile = {
		version: CACHE_VERSION,
		fetchedAt,
		catalog,
		source,
		...(fallbackReason ? { fallbackReason: fallbackReason.slice(0, REASON_MAX) } : {}),
	};
	try {
		writeFileSync(temporaryPath, `${JSON.stringify(body)}\n`, { mode: 0o600 });
		renameSync(temporaryPath, path);
	} finally {
		if (existsSync(temporaryPath)) unlinkSync(temporaryPath);
	}
}

/** Whether the cached catalog is within `maxAgeMs`. */
export function isCatalogCacheFresh(
	cached: CachedDevinCatalog,
	now: number = Date.now(),
	maxAgeMs: number = CATALOG_CACHE_MAX_AGE_MS,
): boolean {
	const age = now - cached.fetchedAt;
	return age >= 0 && age <= maxAgeMs;
}
