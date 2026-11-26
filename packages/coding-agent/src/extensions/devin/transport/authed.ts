// A unary call that needs the user JWT: a 401 clears the cached JWT and the call is repeated once with a fresh one.
import type { IdentityKind } from "../auth/identity.ts";
import { clearCachedUserJwt, getCachedUserJwt } from "../auth/jwt.ts";
import { isStaleJwtError } from "../errors/stale-jwt.ts";
import { postUnary } from "./unary.ts";

/** `build` receives the JWT and returns the request body; the second 401 propagates as an auth error. */
export async function postUnaryWithJwt(
	apiKey: string,
	host: string,
	path: string,
	build: (jwt: string) => Buffer,
	options: { signal?: AbortSignal; timeoutMs: number; client?: IdentityKind },
): Promise<Buffer> {
	for (let attempt = 0; ; attempt++) {
		const jwt = await getCachedUserJwt(apiKey, host, options.signal);
		try {
			return await postUnary(host, path, build(jwt), options);
		} catch (error) {
			if (attempt > 0 || !isStaleJwtError(error)) throw error;
			clearCachedUserJwt(apiKey, host);
		}
	}
}
