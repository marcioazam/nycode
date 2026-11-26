// Shared fixtures for the devin extension tests: a fake `devin` binary, wire builders and a fetch stub.
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as zlib from "node:zlib";
import { vi } from "vitest";
import {
	encodeMessage,
	encodeString,
	encodeVarintField,
	frameConnectStream,
	iterFields,
	type ProtoField,
} from "../../src/extensions/devin/wire/proto.ts";

export function tempDir(prefix = "devin-test-"): string {
	return mkdtempSync(join(tmpdir(), prefix));
}

export const API_KEY = "devin-session-token$0123456789abcdef";

export const CATALOG = {
	families: [
		{
			family_label: "Claude Opus 5",
			family_uid: "claude-opus-5",
			slug: "claude-opus-5",
			variants: [
				{ model_uid: "claude-opus-5-low", label: "Low", cost_summary: "$5 / MTok In, $25 / MTok Out" },
				{ model_uid: "claude-opus-5-high", label: "High", max_context_tokens: 500000, max_output_tokens: 64000 },
				{ model_uid: "claude-opus-5-high-priority", label: "High priority" },
			],
		},
	],
};

/** A `devin` shell script; `models list` prints $FAKE_DEVIN_MODELS, `auth login` stores a key under $HOME. */
export function writeFakeDevin(dir: string, opts: { loggedIn?: boolean } = {}): string {
	const path = join(dir, "devin");
	const script = [
		"#!/bin/sh",
		'case "$1" in',
		'  --version|version) echo "devin 1.2.3" ;;',
		`  auth) if [ "$2" = status ]; then ${opts.loggedIn ? 'echo "Logged in"' : 'echo "Not logged in"; exit 1'}; fi`,
		'        if [ "$2" = login ]; then mkdir -p "$HOME/.local/share/devin"; printf \'windsurf_api_key = "%s"\\n\' "$FAKE_DEVIN_KEY" > "$HOME/.local/share/devin/credentials.toml"; fi ;;',
		'  models) if [ -n "$FAKE_DEVIN_FAIL" ]; then echo boom >&2; exit 3; fi; cat "$FAKE_DEVIN_MODELS" ;;',
		"esac",
		"",
	].join("\n");
	writeFileSync(path, script);
	chmodSync(path, 0o755);
	return path;
}

export function writeCredentialsFile(home: string, key: string): string {
	const dir = join(home, ".local/share/devin");
	mkdirSync(dir, { recursive: true });
	const path = join(dir, "credentials.toml");
	writeFileSync(path, `windsurf_api_key = "${key}"\nother = "x"\n`);
	return path;
}

function float32Field(num: number, value: number): Buffer {
	const body = Buffer.alloc(4);
	body.writeFloatLE(value, 0);
	return Buffer.concat([Buffer.from([(num << 3) | 5]), body]);
}

export function usageMessage(metrics: Record<string, number>): Buffer {
	return Buffer.concat(
		Object.entries(metrics).map(([metric, value]) =>
			encodeMessage(2, Buffer.concat([encodeString(5, metric), encodeMessage(4, float32Field(2, value))])),
		),
	);
}

export function toolCallMessage(id: string, name: string, args: string): Buffer {
	return Buffer.concat([encodeString(1, id), encodeString(2, name), encodeString(3, args)]);
}

/** One uncompressed Connect frame. */
export function rawFrame(flags: number, payload: Buffer): Buffer {
	const header = Buffer.alloc(5);
	header[0] = flags;
	header.writeUInt32BE(payload.length, 1);
	return Buffer.concat([header, payload]);
}

export function eosFrame(trailer = "{}"): Buffer {
	return rawFrame(0x02, Buffer.from(trailer));
}

export function gzipFrame(payload: Buffer): Buffer {
	return rawFrame(0x01, zlib.gzipSync(payload));
}

export function jwtWithExp(exp: number): string {
	const payload = Buffer.from(JSON.stringify({ exp })).toString("base64url");
	return `eyJhbGciOiJub25lIn0.${payload}.sig`;
}

export function jwtResponse(jwt: string): Response {
	return new Response(new Uint8Array(encodeString(1, jwt)), { status: 200 });
}

export function streamResponse(chunks: Buffer[]): Response {
	return new Response(
		new ReadableStream<Uint8Array>({
			start(controller) {
				for (const chunk of chunks) controller.enqueue(new Uint8Array(chunk));
				controller.close();
			},
		}),
		{ status: 200 },
	);
}

/** Stubs global fetch: GetUserJwt answers with a fresh JWT, GetChatMessage with `chat()`. Returns the call log. */
export function stubDevinFetch(chat: () => Response): Array<{ url: string; init: RequestInit }> {
	const calls: Array<{ url: string; init: RequestInit }> = [];
	vi.stubGlobal(
		"fetch",
		vi.fn(async (url: string, init: RequestInit) => {
			calls.push({ url, init });
			return url.endsWith("GetUserJwt") ? jwtResponse(jwtWithExp(Math.floor(Date.now() / 1000) + 3600)) : chat();
		}),
	);
	return calls;
}

/** Top-level fields of a captured GetChatMessage request (one gzip Connect frame). */
export function chatRequestFields(call: { init: RequestInit }): ProtoField[] {
	return [...iterFields(zlib.gunzipSync(Buffer.from(call.init.body as Uint8Array).subarray(5)))];
}

/** Fields of the CompletionConfiguration (#8) of a captured request, by field number. */
export function completionConfig(call: { init: RequestInit }): Map<number, bigint | Buffer> {
	const config = chatRequestFields(call).find((field) => field.num === 8)?.value as Buffer;
	return new Map([...iterFields(config)].map((field) => [field.num, field.value]));
}

export { encodeMessage, encodeString, encodeVarintField, frameConnectStream };

export interface RpcModelInput {
	uid: string;
	label?: string;
	disabled?: boolean;
	supportsImages?: boolean;
	contextWindow?: number;
	maxOutput?: number;
	inputPrice?: number;
	outputPrice?: number;
	/** ClientModelConfig #18 max_tokens, outside model_info. */
	topLevelMaxTokens?: number;
}

/** One ClientModelConfig (field numbers from the Devin client's proto) inside a GetCascadeModelConfigsResponse. */
export function rpcModelConfig(model: RpcModelInput): Buffer {
	const info = Buffer.concat([
		...(model.contextWindow !== undefined ? [encodeVarintField(4, model.contextWindow)] : []),
		...(model.maxOutput !== undefined ? [encodeVarintField(13, model.maxOutput)] : []),
	]);
	const price = (type: string, value: number) =>
		encodeMessage(32, Buffer.concat([encodeString(1, type), float32Field(2, value)]));
	const body = Buffer.concat([
		encodeString(1, model.label ?? model.uid),
		encodeString(22, model.uid),
		...(model.disabled ? [encodeVarintField(4, 1)] : []),
		...(model.supportsImages ? [encodeVarintField(5, 1)] : []),
		...(model.topLevelMaxTokens !== undefined ? [encodeVarintField(18, model.topLevelMaxTokens)] : []),
		...(info.length > 0 ? [encodeMessage(23, info)] : []),
		...(model.inputPrice !== undefined ? [price("Input", model.inputPrice)] : []),
		...(model.outputPrice !== undefined ? [price("Output", model.outputPrice)] : []),
	]);
	return encodeMessage(1, body);
}

export function rpcCatalogResponse(models: RpcModelInput[]): Response {
	return new Response(new Uint8Array(Buffer.concat(models.map(rpcModelConfig))), { status: 200 });
}
