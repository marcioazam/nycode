// Merges per-model facts from the Devin API into the `devin models list` catalog, which owns families and ids.

import type { DevinCatalog, DevinFamily, DevinVariant } from "./models.ts";
import type { RpcModel } from "./rpc.ts";

function enrichVariant(variant: DevinVariant, rpc: RpcModel): DevinVariant {
	// Only a model the CLI lists without a price takes the API price (free models have no price on either side).
	const price = (value?: number) => `$${Number((value ?? 0).toFixed(4))} / 1M`;
	const apiCost =
		rpc.inputPrice && rpc.outputPrice
			? `${price(rpc.inputPrice)} Input · ${price(rpc.outputPrice)} Output`
			: undefined;
	return {
		...variant,
		cost_summary: variant.cost_summary ?? apiCost,
		supports_images: rpc.supportsImages,
		max_context_tokens: variant.max_context_tokens ?? (rpc.contextWindow || undefined),
		max_output_tokens: variant.max_output_tokens ?? (rpc.maxOutputTokens || undefined),
	};
}

/**
 * Per model uid: images support, context and output limits and prices (only when the CLI lacks them); variants the API marks
 * disabled are dropped, and so are families left empty. Uids the API does not know (adaptive, fusion) stay as they are.
 */
export function enrichCatalog(cli: DevinCatalog, rpcModels: RpcModel[]): DevinCatalog {
	const byUid = new Map(rpcModels.map((model) => [model.uid, model]));
	const families: DevinFamily[] = [];
	for (const family of cli.families) {
		const variants: DevinVariant[] = [];
		for (const variant of family.variants) {
			const rpc = byUid.get(variant.model_uid);
			if (!rpc) variants.push(variant);
			else if (!rpc.disabled) variants.push(enrichVariant(variant, rpc));
		}
		if (variants.length > 0) families.push({ ...family, variants });
	}
	return { families };
}
