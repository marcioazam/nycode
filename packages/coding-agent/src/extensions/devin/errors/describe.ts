// User-facing text for each failure class. The wording is load-bearing: @nycode/ai's retry classifier reads it, so
// quota text must match its non-retryable patterns, transient text its retryable ones, and nothing else may match.
import { type AssistantMessage, isRetryableAssistantError } from "@nycode/ai";
import type { DevinFailure } from "./failure.ts";

/** Where the user can see the plan usage behind a quota failure. */
export const USAGE_URL = "https://app.devin.ai/settings/usage";

function retryable(message: string): boolean {
	// Only the two fields the classifier reads are set; the rest of an AssistantMessage is irrelevant to it.
	return isRetryableAssistantError({ stopReason: "error", errorMessage: message } as AssistantMessage);
}

function trace(failure: DevinFailure): string {
	return failure.traceId ? ` (trace ID: ${failure.traceId})` : "";
}

// Server text is quoted only when it cannot turn a permanent failure into a retry loop.
function withDetail(failure: DevinFailure, build: (detail: string) => string, bare: string): string {
	const quoted = build(` Server said: ${failure.message}`);
	return retryable(quoted) ? bare : quoted;
}

/** The message shown to the user (and matched by the retry classifier) for a classified failure. */
export function describeFailure(failure: DevinFailure): string {
	switch (failure.kind) {
		case "quota":
			return `Devin quota exceeded: ${failure.message}. Check your plan usage at ${USAGE_URL}${trace(failure)}`;
		case "client_version":
			// With the CLI identity the server answers a spent plan this way; the Windsurf fallback is a real rejection.
			return failure.client === "cli"
				? `Devin rejected the client version ("${failure.message}"). With the Devin CLI identity this usually ` +
						`means the daily or weekly quota is exceeded. Check ${USAGE_URL}${trace(failure)}`
				: `Devin rejected the fallback client identity ("${failure.message}"). Install the Devin CLI and run ` +
						`\`devin auth login\`, then /login devin${trace(failure)}`;
		case "transient":
			return `Devin service temporarily unavailable (server error): ${failure.message}. Try again shortly.${trace(failure)}`;
		case "model_unavailable":
			return withDetail(
				failure,
				(detail) =>
					`This Devin model is not available for your account.${detail} Choose another with /model.${trace(failure)}`,
				`This Devin model is not available for your account. Choose another with /model.${trace(failure)}`,
			);
		case "content_policy":
			return withDetail(
				failure,
				(detail) => `Devin blocked the request by its content policy.${detail}${trace(failure)}`,
				`Devin blocked the request by its content policy.${trace(failure)}`,
			);
		case "auth":
			return withDetail(
				failure,
				(detail) => `Devin authentication failed.${detail} Run /login devin to sign in again.${trace(failure)}`,
				`Devin authentication failed. Run /login devin to sign in again.${trace(failure)}`,
			);
		case "invalid_request":
			return withDetail(
				failure,
				(detail) =>
					`Devin rejected the request as invalid (${failure.code ?? "invalid"}).${detail} The model may not accept this input, for example an image.${trace(failure)}`,
				`Devin rejected the request as invalid (${failure.code ?? "invalid"}). The model may not accept this input, for example an image.${trace(failure)}`,
			);
		case "unknown":
			return `Devin request failed${failure.code ? ` (${failure.code})` : ""}: ${failure.message}${trace(failure)}`;
	}
}
