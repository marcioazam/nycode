// Mints and caches the short-lived user JWT the chat endpoint requires. Ported from pi-devin-plus 0.1.3 (MIT), see ../LICENSE.
import { randomUUID } from "node:crypto";
import { postUnary } from "../transport/unary.ts";
import { encodeMessage, iterFields } from "../wire/proto.ts";
import { buildMetadata } from "../wire/request.ts";
import { resolveClientIdentity } from "./identity.ts";

export interface MintedUserJwt {
	jwt: string;
	expiresAt: number;
}

function jwtExpiry(jwt: string): number | undefined {
	try {
		const payload = jwt.split(".")[1] ?? "";
		const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
		const parsed = JSON.parse(Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
		return typeof parsed.exp === "number" ? parsed.exp : undefined;
	} catch {
		return undefined;
	}
}

/** Exchanges the API key for a user JWT (GetUserJwt) on `host`. */
export async function mintUserJwt(apiKey: string, host: string, signal?: AbortSignal): Promise<MintedUserJwt> {
	const identity = await resolveClientIdentity();
	const metadata = buildMetadata({
		apiKey,
		sessionId: randomUUID(),
		requestId: BigInt(Date.now()),
		triggerId: randomUUID(),
		ide: identity.ide,
		version: identity.version,
	});
	const buf = await postUnary(host, "/exa.auth_pb.AuthService/GetUserJwt", encodeMessage(1, metadata), {
		signal,
		timeoutMs: 30_000,
	});

	let jwt: string | null = null;
	for (const field of iterFields(buf)) {
		if (field.num === 1 && field.wire === 2 && Buffer.isBuffer(field.value)) {
			const value = field.value.toString("utf8");
			if (value.startsWith("eyJ")) {
				jwt = value;
				break;
			}
		}
	}
	if (!jwt) throw new Error("GetUserJwt returned no JWT");
	return { jwt, expiresAt: jwtExpiry(jwt) ?? Math.floor(Date.now() / 1000) + 600 };
}

// One slot: switching API keys or hosts re-mints, which is cheap.
let cache: { jwt: string; expiresAt: number; key: string } | null = null;
const inFlight = new Map<string, Promise<MintedUserJwt>>();

// The host is part of the key: a JWT is only valid for the tenant that minted it.
const cacheKey = (apiKey: string, host: string): string => `${host}\n${apiKey}`;

/** JWT for `apiKey` on `host`, reused until a minute before it expires; concurrent callers share one request. */
export async function getCachedUserJwt(apiKey: string, host: string, signal?: AbortSignal): Promise<string> {
	const key = cacheKey(apiKey, host);
	const now = Math.floor(Date.now() / 1000);
	if (cache && cache.key === key && cache.expiresAt > now + 60) return cache.jwt;
	const existing = inFlight.get(key);
	if (existing) return (await existing).jwt;
	const promise = mintUserJwt(apiKey, host, signal);
	inFlight.set(key, promise);
	try {
		const minted = await promise;
		cache = { jwt: minted.jwt, expiresAt: minted.expiresAt, key };
		return minted.jwt;
	} finally {
		inFlight.delete(key);
	}
}

/** Drops the cached JWT of one key and host (a 401 said it is stale); with no arguments, everything (tests). */
export function clearCachedUserJwt(apiKey?: string, host?: string): void {
	if (apiKey !== undefined && host !== undefined && cache?.key !== cacheKey(apiKey, host)) return;
	cache = null;
	inFlight.clear();
}
