// Per-session compaction limit set by `/contexto` (extension `contexto`): it moves both the absolute-size rule (K9) and
// the native threshold (K18, reserve tokens) for the current session only.

let sessionLimit: number | undefined;

/** The session override in tokens, or undefined when the configured limit applies. */
export const getSessionCompactAt = (): number | undefined => sessionLimit;

/** Sets (or clears, with undefined) the per-session limit. Only a positive safe integer counts. */
export function setSessionCompactAt(limit: number | undefined): void {
	sessionLimit = limit !== undefined && Number.isSafeInteger(limit) && limit > 0 ? limit : undefined;
}

/**
 * Reserve tokens for the native threshold under the session limit: window - limit, but only when that compacts later
 * than the configured reserve (never earlier) and the limit is below the window.
 */
export function reserveWithSessionLimit(reserve: number, contextWindow: number | undefined): number {
	const limit = sessionLimit;
	if (limit === undefined || contextWindow === undefined || contextWindow <= limit) return reserve;
	return Math.min(reserve, contextWindow - limit);
}
