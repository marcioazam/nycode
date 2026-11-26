// Reads a response body with a hard size cap, so a hostile or broken server cannot make the process buffer without bound.

/** Largest unary response (catalog, JWT) accepted. */
export const MAX_UNARY_BYTES = 16 * 1024 * 1024;
/** Largest error or exchange body read for a message. */
export const MAX_ERROR_BODY_BYTES = 64 * 1024;

/** Reads `response` fully; throws when the body exceeds `maxBytes`. */
export async function readBodyCapped(response: Response, maxBytes: number): Promise<Buffer> {
	if (!response.body) return Buffer.alloc(0);
	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;
	try {
		while (true) {
			const { value, done } = await reader.read();
			if (done) break;
			size += value.length;
			if (size > maxBytes) {
				await reader.cancel().catch(() => {});
				throw new Error(`Devin response body exceeded ${maxBytes} bytes`);
			}
			chunks.push(value);
		}
	} finally {
		reader.releaseLock();
	}
	return Buffer.concat(chunks);
}

/** Reads an error body as text, truncated (not rejected) at `MAX_ERROR_BODY_BYTES`. */
export async function readErrorText(response: Response): Promise<string> {
	try {
		return (await readBodyCapped(response, MAX_ERROR_BODY_BYTES)).toString("utf8");
	} catch {
		return `HTTP ${response.status} (error body too large or unreadable)`;
	}
}
