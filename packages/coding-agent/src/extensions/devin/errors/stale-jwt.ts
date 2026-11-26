// Whether an error means the cached JWT was rejected, so one fresh mint is worth trying.
import { DevinError } from "./failure.ts";

/** HTTP 401 or code `unauthenticated`; a bare permission_denied is not a stale token. */
export function isStaleJwtError(error: unknown): boolean {
	return error instanceof DevinError && error.failure.kind === "auth" && error.failure.unauthenticated;
}
