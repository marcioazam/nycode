// One unary Connect+proto POST (GetUserJwt, GetCascadeModelConfigs): classified errors, bounded time, no redirects.

import type { IdentityKind } from "../auth/identity.ts";
import { fetchWithRetry, isTransientNetworkError } from "../auth/net.ts";
import { classifyFailure } from "../errors/classify.ts";
import { DevinError } from "../errors/failure.ts";
import { parseHttpError } from "../errors/parse.ts";
import { MAX_UNARY_BYTES, readBodyCapped, readErrorText } from "./bounded-body.ts";

/** Sends `body` to `<host><path>` and returns the response bytes; a non-2xx answer throws a DevinError. */
export async function postUnary(
	host: string,
	path: string,
	body: Buffer,
	options: { signal?: AbortSignal; timeoutMs: number; client?: IdentityKind },
): Promise<Buffer> {
	const timeout = AbortSignal.timeout(options.timeoutMs);
	const response = await fetchWithRetry(
		`${host}${path}`,
		{
			method: "POST",
			headers: { "Content-Type": "application/proto", "Connect-Protocol-Version": "1" },
			body: new Uint8Array(body),
		},
		isTransientNetworkError,
		options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
	);
	if (!response.ok) {
		throw new DevinError(
			classifyFailure(parseHttpError(response.status, await readErrorText(response)), options.client),
		);
	}
	return readBodyCapped(response, MAX_UNARY_BYTES);
}
