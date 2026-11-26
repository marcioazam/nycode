// Parses Devin error bodies: Connect JSON over HTTP, and the end-of-stream trailer of a streaming call.

import type { FailureDetail } from "./failure.ts";
import { redactSecrets } from "./redact.ts";

const TRACE_PATTERN = /\s*\(trace ID: ([0-9a-f]+)\)/i;
const BODY_LIMIT = 600;

// Redact before clipping: a cut token must not slip past the patterns.
const clip = (text: string) => redactSecrets(text).slice(0, BODY_LIMIT);

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function withTrace(detail: Omit<FailureDetail, "traceId">): FailureDetail {
	const trace = TRACE_PATTERN.exec(detail.message);
	if (!trace) return detail;
	return { ...detail, message: detail.message.replace(TRACE_PATTERN, "").trim(), traceId: trace[1] };
}

// Server bytes are a trust boundary: every field is checked before use.
function fromRecord(record: Record<string, unknown>, raw: string, status?: number): FailureDetail {
	const code = typeof record.code === "string" ? record.code : undefined;
	const message = typeof record.message === "string" && record.message ? record.message : raw;
	return withTrace({ status, code, message: clip(message) });
}

/** Parses the body of a non-2xx response (Connect error JSON, or plain text from a proxy). */
export function parseHttpError(status: number, body: string): FailureDetail {
	const raw = body.trim() || `HTTP ${status}`;
	try {
		const parsed: unknown = JSON.parse(raw);
		if (isRecord(parsed)) return fromRecord(parsed, raw, status);
	} catch {
		// not JSON: the text itself is the message
	}
	return withTrace({ status, message: clip(raw) });
}

/** Parses a Connect end-of-stream payload; null when it carries no error. */
export function parseTrailerError(payload: Buffer): FailureDetail | null {
	const text = payload.toString("utf8");
	if (!text.includes('"error"')) return null;
	try {
		const parsed: unknown = JSON.parse(text);
		if (isRecord(parsed) && isRecord(parsed.error)) return fromRecord(parsed.error, text);
		if (isRecord(parsed) && typeof parsed.error === "string") return withTrace({ message: clip(parsed.error) });
	} catch {
		// fall through: keep the raw text so nothing is lost
	}
	return withTrace({ message: clip(text) });
}
