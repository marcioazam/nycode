// Devin model catalog: parsing `devin models list`, mapping families to nycode models, thinking-level variants.
// Ported from an MIT-licensed Devin provider extension, see ../LICENSE.
import type { ThinkingLevelMap } from "@nycode/ai";
import type { ProviderChatModelConfig } from "../../../core/extensions/types.ts";
import { runDevin } from "../auth/cli.ts";
import { EXTRA_COST_VARIANT } from "./effort.ts";

export interface DevinVariant {
	model_uid: string;
	label: string;
	max_context_tokens?: number;
	max_output_tokens?: number;
	cost_tier?: string;
	cost_summary?: string;
	is_new?: boolean;
	is_beta?: boolean;
	/** Known only from the RPC catalog; `devin models list` does not say, so absent means "assume yes". */
	supports_images?: boolean;
}

export interface DevinFamily {
	family_label: string;
	family_uid: string;
	slug: string;
	aliases?: string[];
	variants: DevinVariant[];
}

export interface DevinCatalog {
	families: DevinFamily[];
}

const THINKING_ORDER = ["off", "minimal", "low", "medium", "high", "xhigh", "max"] as const;

const PRICE_PART = /^\$([0-9.]+)\s*\/\s*(?:1M|MTok)\s+(.+)$/i;

/** Price in dollars per 1M tokens from one `cost_summary` part such as "$0.5 / 1M Input" (the label must match exactly). */
function priceOf(summary: string, label: string): number | undefined {
	for (const part of summary.split("·")) {
		const match = PRICE_PART.exec(part.trim());
		if (match && match[2].toLowerCase() === label.toLowerCase()) return Number(match[1]);
	}
	return undefined;
}

/**
 * Prices from the CLI text "$2 / 1M Input · $0.1 / 1M Cached input · $10 / 1M Output" (sidekick prices are ignored).
 * Cache read is the CLI's "Cached input" price. No source gives cache write, so it is estimated as 1.25x input (the
 * Anthropic ratio); cache read falls back to 0.1x input only when the text has no cached price.
 */
export function parseCost(summary?: string): ProviderChatModelConfig["cost"] {
	const input = (summary && priceOf(summary, "Input")) || 0;
	const output = (summary && priceOf(summary, "Output")) || 0;
	const cached = summary ? priceOf(summary, "Cached input") : undefined;
	return {
		input,
		output,
		cacheRead: cached ?? Number((input * 0.1).toFixed(4)),
		cacheWrite: Number((input * 1.25).toFixed(4)),
	};
}

function variantKey(uid: string): string | null {
	const suffixes = [
		"none-priority",
		"low-priority",
		"medium-priority",
		"high-priority",
		"xhigh-priority",
		"max-priority",
		"low-fast",
		"medium-fast",
		"high-fast",
		"xhigh-fast",
		"max-fast",
		"thinking-1m",
		"thinking",
		"none",
		"low",
		"medium",
		"high",
		"xhigh",
		"max",
		"minimal",
	];
	for (const suffix of suffixes) {
		if (uid === suffix || uid.endsWith(`-${suffix}`)) return suffix;
	}
	return null;
}

function thinkingFromSuffix(suffix: string | null): keyof ThinkingLevelMap | null {
	if (!suffix) return "high";
	if (suffix === "none" || suffix === "none-priority") return "off";
	if (suffix === "minimal") return "minimal";
	if (suffix.startsWith("low")) return "low";
	if (suffix.startsWith("medium")) return "medium";
	if (suffix.startsWith("high") && !suffix.startsWith("xhigh")) return "high";
	if (suffix.startsWith("xhigh")) return "xhigh";
	if (suffix.startsWith("max")) return "max";
	if (suffix.includes("thinking")) return "high";
	return null;
}

function preferredDefault(map: ThinkingLevelMap): string | undefined {
	for (const level of ["high", "medium", "max", "xhigh", "low", "minimal", "off"] as const) {
		const value = map[level];
		if (typeof value === "string") return value;
	}
	return undefined;
}

function familyToModels(family: DevinFamily): ProviderChatModelConfig[] {
	const usable = family.variants.filter((variant) => {
		if (EXTRA_COST_VARIANT.test(variant.model_uid)) return false;
		const key = variantKey(variant.model_uid);
		return !key || (!key.includes("priority") && !key.includes("fast") && key !== "thinking-1m");
	});
	const source = usable.length > 0 ? usable : family.variants;
	if (source.length === 0) return [];
	const thinkingLevelMap: ThinkingLevelMap = {};
	for (const variant of source) {
		const level = thinkingFromSuffix(variantKey(variant.model_uid));
		if (level && thinkingLevelMap[level] === undefined) {
			thinkingLevelMap[level] = variant.model_uid;
		}
	}

	const defaultUid = preferredDefault(thinkingLevelMap) ?? source[0]?.model_uid ?? family.family_uid;
	const sample = source.find((variant) => variant.model_uid === defaultUid) ?? source[0];
	if (!sample) return [];

	// The host treats a missing level as supported and only null hides it, so mark every
	// level this family does not ship. The picker then matches the real variants
	// instead of silently falling back to the default one.
	for (const level of THINKING_ORDER) {
		if (thinkingLevelMap[level] === undefined) thinkingLevelMap[level] = null;
	}

	const mappedLevels = THINKING_ORDER.filter((level) => typeof thinkingLevelMap[level] === "string");
	const reasoning = mappedLevels.length > 1;

	// With a thinking map the host-facing id never reaches the wire — resolveModelUid
	// always maps it — so keep the family id and let the host thinking level choose the
	// variant, instead of baking "-high" into the model id.
	const familyId = family.slug || family.family_uid || defaultUid;

	return [
		{
			id: reasoning ? familyId : defaultUid,
			name: family.family_label || family.slug || defaultUid,
			reasoning,
			thinkingLevelMap: reasoning ? thinkingLevelMap : undefined,
			input: sample.supports_images === false ? ["text"] : ["text", "image"],
			cost: parseCost(sample.cost_summary),
			contextWindow: sample.max_context_tokens ?? 256_000,
			maxTokens: sample.max_output_tokens ?? 128_000,
		},
	];
}

const FREE = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };

/** A thinking map for a family that ships only some levels (live catalog 2026-11-26): the others are hidden. */
function sweLevels(levels: Partial<Record<(typeof THINKING_ORDER)[number], string>>): ThinkingLevelMap {
	return Object.fromEntries(THINKING_ORDER.map((level) => [level, levels[level] ?? null]));
}

/** Models registered before a catalog has ever been fetched (the swe-2* family is free, so it works without a plan). */
export const FALLBACK_MODELS: ProviderChatModelConfig[] = [
	{
		id: "claude-opus-5",
		name: "Claude Opus 5",
		reasoning: true,
		thinkingLevelMap: {
			off: null,
			minimal: null,
			low: "claude-opus-5-low",
			medium: "claude-opus-5-medium",
			high: "claude-opus-5-high",
			xhigh: "claude-opus-5-xhigh",
			max: "claude-opus-5-max",
		},
		input: ["text", "image"],
		cost: { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
		contextWindow: 1_000_000,
		maxTokens: 128_000,
	},
	{
		id: "claude-fable-5",
		name: "Claude Fable 5",
		reasoning: true,
		thinkingLevelMap: {
			off: null,
			minimal: null,
			low: "claude-5-fable-low",
			medium: "claude-5-fable-medium",
			high: "claude-5-fable-high",
			xhigh: "claude-5-fable-xhigh",
			max: "claude-5-fable-max",
		},
		input: ["text", "image"],
		cost: { input: 10, output: 50, cacheRead: 1, cacheWrite: 12.5 },
		contextWindow: 1_000_000,
		maxTokens: 128_000,
	},
	{
		id: "gpt-5.6-sol",
		name: "GPT-5.6 Sol",
		reasoning: true,
		thinkingLevelMap: {
			off: "gpt-5-6-sol-none",
			minimal: null,
			low: "gpt-5-6-sol-low",
			medium: "gpt-5-6-sol-medium",
			high: "gpt-5-6-sol-high",
			xhigh: "gpt-5-6-sol-xhigh",
			max: "gpt-5-6-sol-max",
		},
		input: ["text", "image"],
		cost: { input: 5, output: 30, cacheRead: 0.5, cacheWrite: 6.25 },
		contextWindow: 1_000_000,
		maxTokens: 128_000,
	},
	{
		id: "swe-1.7",
		name: "SWE-1.7",
		reasoning: true,
		thinkingLevelMap: sweLevels({ medium: "swe-1-7-medium", high: "swe-1-7" }),
		input: ["text", "image"],
		cost: FREE,
		contextWindow: 262_000,
		maxTokens: 128_000,
	},
	{
		id: "swe-2",
		name: "SWE-2",
		reasoning: true,
		thinkingLevelMap: sweLevels({ medium: "swe-2-medium", high: "swe-2-high", max: "swe-2-max" }),
		input: ["text", "image"],
		cost: FREE,
		contextWindow: 262_000,
		maxTokens: 128_000,
	},
	{
		id: "swe-2-flash",
		name: "SWE-2 Flash",
		reasoning: true,
		thinkingLevelMap: sweLevels({ medium: "swe-2-flash-medium", high: "swe-2-flash-high", max: "swe-2-flash-max" }),
		// Live catalog 2026-11-26: every swe-2-flash variant has supports_images=false.
		input: ["text"],
		cost: FREE,
		contextWindow: 262_000,
		maxTokens: 128_000,
	},
	{
		id: "swe-2.1",
		name: "SWE-2.1",
		reasoning: true,
		thinkingLevelMap: sweLevels({
			low: "swe-2-1-low",
			medium: "swe-2-1-medium",
			high: "swe-2-1",
			xhigh: "swe-2-1-xhigh",
			max: "swe-2-1-max",
		}),
		input: ["text", "image"],
		cost: FREE,
		contextWindow: 262_000,
		maxTokens: 128_000,
	},
];

/** nycode models for a CLI catalog (one per family); the fallback list when the catalog is empty. */
export function modelsFromCatalog(catalog: DevinCatalog | null): ProviderChatModelConfig[] {
	if (!catalog?.families.length) return FALLBACK_MODELS;
	const models = catalog.families.flatMap(familyToModels);
	return models.length > 0 ? models : FALLBACK_MODELS;
}

/** Runs `devin models list --format json`; null when the output has no `families`. */
export async function loadCliCatalog(): Promise<DevinCatalog | null> {
	const { stdout, code, stderr } = await runDevin(["models", "list", "--format", "json"], {
		timeoutMs: 20_000,
	});
	if (code !== 0) {
		throw new Error(stderr.trim() || `devin models list exited ${code}`);
	}
	const parsed = JSON.parse(stdout) as DevinCatalog;
	if (!parsed?.families) return null;
	return parsed;
}

/** The Devin model uid to send for a nycode model id and the requested thinking level. */
export function resolveModelUid(
	modelId: string,
	thinkingLevelMap: ThinkingLevelMap | undefined,
	reasoning?: string,
): string {
	if (reasoning && thinkingLevelMap) {
		const mapped = thinkingLevelMap[reasoning as keyof ThinkingLevelMap];
		if (typeof mapped === "string") return mapped;
	}
	if (thinkingLevelMap) {
		const fallback = preferredDefault(thinkingLevelMap);
		if (fallback) return fallback;
	}
	return modelId;
}
