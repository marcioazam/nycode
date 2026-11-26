// The per-account model catalog over GetCascadeModelConfigs. Field numbers come from the proto extracted from the
// Devin client (cniu6/devin-2api outputs/devin-proto, MIT); the call and the effort grouping follow
// JoShMiQueL/devin-core catalog.ts (MIT, Copyright (c) JoShMiQueL), see ../LICENSE.
import { randomUUID } from "node:crypto";
import { WINDSURF_IDENTITY } from "../auth/identity.ts";
import { postUnaryWithJwt } from "../transport/authed.ts";
import { encodeMessage, iterFields } from "../wire/proto.ts";
import { buildMetadata } from "../wire/request.ts";
import { EXTRA_COST_VARIANT, splitEffortSuffix } from "./effort.ts";
import type { DevinCatalog, DevinFamily, DevinVariant } from "./models.ts";
import { normalizeSlug } from "./slug.ts";

const CATALOG_PATH = "/exa.api_server_pb.ApiServerService/GetCascadeModelConfigs";
const CATALOG_TIMEOUT_MS = 10_000;
const TRAILING_EFFORT = /\s*[([]?\b(no thinking|minimal|low|medium|high|xhigh|max)\b[)\]]?\s*$/i;

export interface RpcModel {
	uid: string;
	label: string;
	disabled: boolean;
	supportsImages: boolean;
	contextWindow?: number;
	maxOutputTokens?: number;
	/** Price per million tokens, from ClientModelConfig.model_dimensions (#32). */
	inputPrice?: number;
	outputPrice?: number;
}

function text(value: bigint | Buffer): string {
	return Buffer.isBuffer(value) ? value.toString("utf8") : "";
}

function decodeModelInfo(body: Buffer): { contextWindow?: number; maxOutputTokens?: number } {
	const info: { contextWindow?: number; maxOutputTokens?: number } = {};
	for (const field of iterFields(body)) {
		if (field.wire !== 0) continue;
		if (field.num === 4) info.contextWindow = Number(field.value);
		else if (field.num === 13) info.maxOutputTokens = Number(field.value);
	}
	return info;
}

function decodePrice(body: Buffer): { type: string; price: number } {
	let type = "";
	let price = 0;
	for (const field of iterFields(body)) {
		if (field.num === 1 && field.wire === 2) type = text(field.value).trim().toLowerCase();
		else if (field.num === 2 && field.wire === 5 && Buffer.isBuffer(field.value)) price = field.value.readFloatLE(0);
	}
	return { type, price };
}

function decodeModel(body: Buffer): RpcModel | null {
	const model: RpcModel = { uid: "", label: "", disabled: false, supportsImages: false };
	let topLevelContext: number | undefined;
	for (const field of iterFields(body)) {
		if (field.wire === 2) {
			if (field.num === 1) model.label = text(field.value);
			else if (field.num === 22) model.uid = text(field.value);
			else if (field.num === 23 && Buffer.isBuffer(field.value)) Object.assign(model, decodeModelInfo(field.value));
			else if (field.num === 32 && Buffer.isBuffer(field.value)) {
				const { type, price } = decodePrice(field.value);
				if (type === "input") model.inputPrice = price;
				else if (type === "output") model.outputPrice = price;
			}
		} else if (field.wire === 0) {
			if (field.num === 4) model.disabled = field.value !== 0n;
			else if (field.num === 5) model.supportsImages = field.value !== 0n;
			else if (field.num === 18) topLevelContext = Number(field.value);
		}
	}
	model.contextWindow ??= topLevelContext;
	return model.uid ? model : null;
}

/** Decodes a GetCascadeModelConfigsResponse (repeated ClientModelConfig, #1). */
export function decodeModelConfigs(body: Buffer): RpcModel[] {
	const models: RpcModel[] = [];
	for (const field of iterFields(body)) {
		if (field.num !== 1 || field.wire !== 2 || !Buffer.isBuffer(field.value)) continue;
		const model = decodeModel(field.value);
		if (model) models.push(model);
	}
	return models;
}

function toVariant(model: RpcModel): DevinVariant {
	const price = (value?: number) => (value === undefined ? undefined : `$${Number(value.toFixed(4))} / 1M`);
	const input = price(model.inputPrice);
	const output = price(model.outputPrice);
	return {
		model_uid: model.uid,
		label: model.label || model.uid,
		max_context_tokens: model.contextWindow || undefined,
		max_output_tokens: model.maxOutputTokens || undefined,
		cost_summary: input && output ? `${input} Input · ${output} Output` : undefined,
		supports_images: model.supportsImages,
	};
}

function toFamily(baseUid: string, members: Array<{ model: RpcModel; effort?: string }>): DevinFamily {
	// A bare uid next to effort-suffixed siblings would claim an effort it does not name: the suffixed ones are explicit.
	const suffixed = members.filter((member) => member.effort);
	const kept = suffixed.length > 0 ? suffixed : members;
	const label = kept[0].model.label || baseUid;
	return {
		family_label: label.replace(TRAILING_EFFORT, "") || label,
		family_uid: baseUid,
		slug: normalizeSlug(baseUid),
		variants: kept.map((member) => toVariant(member.model)),
	};
}

/**
 * Groups the enabled, normally priced models into effort families (one family per base uid). Uppercase uids are
 * internal (MODEL_GPT_OSS_120B) and never offered.
 */
export function catalogFromRpc(models: RpcModel[]): DevinCatalog {
	const groups = new Map<string, Array<{ model: RpcModel; effort?: string }>>();
	for (const model of models) {
		if (model.disabled || EXTRA_COST_VARIANT.test(model.uid) || /[A-Z]/.test(model.uid)) continue;
		const { baseUid, effort } = splitEffortSuffix(model.uid);
		const group = groups.get(baseUid);
		if (group) group.push({ model, effort });
		else groups.set(baseUid, [{ model, effort }]);
	}
	return { families: [...groups].map(([baseUid, members]) => toFamily(baseUid, members)) };
}

/**
 * Fetches the account's raw models over RPC with the fixed WINDSURF_IDENTITY, independent of the chat identity; throws
 * a DevinError when the server refuses and an Error when it answers with no models.
 */
export async function fetchRpcModels(apiKey: string, host: string, signal?: AbortSignal): Promise<RpcModel[]> {
	const body = await postUnaryWithJwt(
		apiKey,
		host,
		CATALOG_PATH,
		(jwt) =>
			encodeMessage(
				1,
				buildMetadata({
					apiKey,
					userJwt: jwt,
					sessionId: randomUUID(),
					requestId: BigInt(Date.now()),
					triggerId: randomUUID(),
					ide: WINDSURF_IDENTITY.ide,
					version: WINDSURF_IDENTITY.version,
				}),
			),
		{ signal, timeoutMs: CATALOG_TIMEOUT_MS, client: "fallback" },
	);
	const models = decodeModelConfigs(body);
	// Live 2026-11-26: an identity the server does not serve (ide devin-cli) gets HTTP 200 and an empty body.
	if (models.length === 0) {
		throw new Error(
			`GetCascadeModelConfigs returned no models (${body.length} bytes) for client identity ${WINDSURF_IDENTITY.ide} ${WINDSURF_IDENTITY.version}`,
		);
	}
	return models;
}

/** The account's catalog grouped into effort families (used when there is no Devin CLI catalog). */
export async function fetchRpcCatalog(apiKey: string, host: string, signal?: AbortSignal): Promise<DevinCatalog> {
	return catalogFromRpc(await fetchRpcModels(apiKey, host, signal));
}
