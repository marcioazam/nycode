// The GetChatMessage streaming call: time limits, one JWT refresh on 401, Connect framing, classified errors.
// Ported from pi-devin-plus 0.1.3 (MIT), see ../LICENSE.
import { randomUUID } from "node:crypto";
import * as zlib from "node:zlib";
import { resolveApiHost } from "../auth/host.ts";
import { resolveClientIdentity } from "../auth/identity.ts";
import { clearCachedUserJwt, getCachedUserJwt } from "../auth/jwt.ts";
import { fetchWithRetry, isTransientNetworkError } from "../auth/net.ts";
import { classifyFailure } from "../errors/classify.ts";
import { DevinError } from "../errors/failure.ts";
import { parseHttpError, parseTrailerError } from "../errors/parse.ts";
import { isStaleJwtError } from "../errors/stale-jwt.ts";
import { type CloudChatEvent, decodeChatFrame } from "../wire/decode.ts";
import { ConnectFrameParser } from "../wire/frames.ts";
import { frameConnectStream } from "../wire/proto.ts";
import { buildGetChatMessageRequest, type ChatHistoryItem, type ToolDef } from "../wire/request.ts";
import { readErrorText } from "./bounded-body.ts";

/** Decompressed frame cap: a small gzip frame must not expand without bound. */
export const MAX_PAYLOAD_BYTES = 64 * 1024 * 1024;
/** A response that stays silent this long between frames is abandoned. */
export const STREAM_IDLE_TIMEOUT_MS = 120_000;
/** Time from sending the request to the first response byte; the model may think, but not this long unannounced. */
export const FIRST_BYTE_TIMEOUT_MS = 60_000;

export interface ChatStreamArgs {
	apiKey: string;
	modelUid: string;
	systemPrompt?: string;
	messages: ChatHistoryItem[];
	tools?: ToolDef[];
	maxTokens?: number;
	temperature?: number;
	topP?: number;
	toolChoice?: "auto" | "none";
	signal?: AbortSignal;
	idleTimeoutMs?: number;
	firstByteTimeoutMs?: number;
}

const sessionCache = new Map<string, { sessionId: string; cascadeId: string; trajectoryId: string }>();

function sessionIds(apiKey: string) {
	let ids = sessionCache.get(apiKey);
	if (!ids) {
		ids = { sessionId: randomUUID(), cascadeId: randomUUID(), trajectoryId: randomUUID() };
		sessionCache.set(apiKey, ids);
	}
	return ids;
}

function timeoutError(what: string, ms: number): DevinError {
	return new DevinError({ kind: "transient", message: `${what} within ${Math.round(ms / 1000)}s (timeout)` });
}

function readWithTimeout(reader: ReadableStreamDefaultReader<Uint8Array>, ms: number, onTimeout: () => Error) {
	return new Promise<ReadableStreamReadResult<Uint8Array>>((resolve, reject) => {
		const timer = setTimeout(() => reject(onTimeout()), ms);
		reader.read().then(
			(result) => {
				clearTimeout(timer);
				resolve(result);
			},
			(error) => {
				clearTimeout(timer);
				reject(error);
			},
		);
	});
}

/**
 * Streams the decoded events of one chat response. A 401 (or an `unauthenticated` trailer before any event) drops the
 * cached JWT and repeats the request once; a second one surfaces as an auth error.
 */
export async function* streamChatEvents(args: ChatStreamArgs): AsyncGenerator<CloudChatEvent> {
	// Nothing is sent for a request that was cancelled before it started.
	if (args.signal?.aborted) throw new Error("Aborted");
	const host = resolveApiHost();
	let emitted = false;
	for (let attempt = 0; ; attempt++) {
		const userJwt = await getCachedUserJwt(args.apiKey, host, args.signal);
		try {
			for await (const event of chatOnce(args, host, userJwt)) {
				emitted = true;
				yield event;
			}
			return;
		} catch (error) {
			if (attempt > 0 || emitted || !isStaleJwtError(error)) throw error;
			clearCachedUserJwt(args.apiKey, host);
		}
	}
}

async function* chatOnce(args: ChatStreamArgs, host: string, userJwt: string): AsyncGenerator<CloudChatEvent> {
	const ids = sessionIds(args.apiKey);
	const identity = await resolveClientIdentity();
	const proto = buildGetChatMessageRequest({
		apiKey: args.apiKey,
		userJwt,
		modelUid: args.modelUid,
		systemPrompt: args.systemPrompt,
		messages: args.messages,
		tools: args.tools,
		cascadeId: ids.cascadeId,
		trajectoryId: ids.trajectoryId,
		promptId: randomUUID(),
		sessionId: ids.sessionId,
		requestId: BigInt(Date.now()),
		triggerId: randomUUID(),
		maxTokens: args.maxTokens,
		temperature: args.temperature,
		topP: args.topP,
		toolChoice: args.toolChoice,
		ide: identity.ide,
		version: identity.version,
	});

	const firstByteMs = args.firstByteTimeoutMs ?? FIRST_BYTE_TIMEOUT_MS;
	const startedAt = Date.now();
	// Covers connecting and the response headers; the first body read is bounded by what is left of the same budget.
	const headersTimeout = new AbortController();
	const timer = setTimeout(() => headersTimeout.abort(), firstByteMs);
	const signal = args.signal ? AbortSignal.any([args.signal, headersTimeout.signal]) : headersTimeout.signal;
	let resp: Response;
	try {
		resp = await fetchWithRetry(
			`${host}/exa.api_server_pb.ApiServerService/GetChatMessage`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/connect+proto",
					"Connect-Protocol-Version": "1",
					"Connect-Content-Encoding": "gzip",
					"Connect-Accept-Encoding": "gzip",
				},
				body: new Uint8Array(frameConnectStream(proto, true)),
			},
			isTransientNetworkError,
			signal,
		);
	} catch (error) {
		if (headersTimeout.signal.aborted && !args.signal?.aborted)
			throw timeoutError("Devin did not answer", firstByteMs);
		throw error;
	} finally {
		clearTimeout(timer);
	}
	if (!resp.ok)
		throw new DevinError(classifyFailure(parseHttpError(resp.status, await readErrorText(resp)), identity.kind));
	if (!resp.body) throw new Error("GetChatMessage returned an empty body");

	const reader = resp.body.getReader();
	// reader.closed rejects when the socket dies mid-response; nothing awaits it, so it would crash the process.
	void reader.closed.catch(() => {});
	const parser = new ConnectFrameParser();
	const idleMs = args.idleTimeoutMs ?? STREAM_IDLE_TIMEOUT_MS;
	let firstRead = true;
	let trailer: ReturnType<typeof parseTrailerError> = null;
	let sawEos = false;

	try {
		while (true) {
			const { value, done } = firstRead
				? await readWithTimeout(reader, Math.max(1, firstByteMs - (Date.now() - startedAt)), () =>
						timeoutError("Devin sent no response", firstByteMs),
					)
				: await readWithTimeout(
						reader,
						idleMs,
						() => new Error(`Devin stream stalled for ${Math.round(idleMs / 1000)}s (timeout)`),
					);
			firstRead = false;
			if (done) break;
			for (const frame of parser.push(value)) {
				const payload =
					frame.flags & 0x01
						? zlib.gunzipSync(frame.payload, { maxOutputLength: MAX_PAYLOAD_BYTES })
						: frame.payload;
				if (frame.flags & 0x02) {
					sawEos = true;
					trailer = parseTrailerError(payload);
					continue;
				}
				yield* decodeChatFrame(payload);
			}
		}
	} finally {
		try {
			reader.releaseLock();
		} catch {
			// ignore
		}
		try {
			// await: on an errored stream cancel() returns a rejected promise that `void` would leak as unhandled.
			await resp.body.cancel();
		} catch {
			// ignore
		}
	}

	if (trailer) throw new DevinError(classifyFailure(trailer, identity.kind));
	if (!sawEos) throw new Error("Devin stream ended without an EOS trailer");
}
