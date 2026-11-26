// Packs the server's thinking signature and its type into nycode's single `thinkingSignature` string.
// Ported from an MIT-licensed Devin provider extension, see ../LICENSE.
//
// Devin streams thinking as a summary plus an opaque signature and a signature type. The signature lets the server
// verify and continue a reasoning trace, so it travels back with the thinking text on the next request, as the
// official Devin CLI does. Sealed signatures describe themselves (`sealed.v1.…`), so the type is only prefixed when it
// could not be derived again.

const TYPE_SEPARATOR = "\u001f";

export interface ChatThinking {
	/** Thinking text as sent by the server (already summarized upstream). */
	text: string;
	/** Opaque signature for server-side verification/continuation. */
	signature: string;
	/** `signature_type` reported by the server. */
	signatureType?: string;
	/** Server flagged the trace as redacted by safety filters. */
	redacted?: boolean;
}

function signatureTypeOf(signature: string): string {
	return signature.startsWith("sealed.") ? "sealed" : "non-sealed";
}

/** Stores `signature` in `thinkingSignature` without losing its type. */
export function packThinkingSignature(signature: string, signatureType?: string): string {
	if (!signatureType || signatureType === signatureTypeOf(signature)) return signature;
	return `${signatureType}${TYPE_SEPARATOR}${signature}`;
}

/** Inverse of `packThinkingSignature`. */
export function unpackThinkingSignature(value: string | undefined): { signature?: string; signatureType?: string } {
	if (!value) return {};
	const index = value.indexOf(TYPE_SEPARATOR);
	if (index === -1) return { signature: value, signatureType: signatureTypeOf(value) };
	return { signatureType: value.slice(0, index), signature: value.slice(index + 1) };
}
