import { type AssistantMessage, isRetryableAssistantError } from "@nycode/ai";
import { describe, expect, it } from "vitest";
import type { IdentityKind } from "../../../src/extensions/devin/auth/identity.ts";
import { classifyFailure } from "../../../src/extensions/devin/errors/classify.ts";
import { USAGE_URL } from "../../../src/extensions/devin/errors/describe.ts";
import { DevinError, type DevinFailure } from "../../../src/extensions/devin/errors/failure.ts";
import { parseHttpError, parseTrailerError } from "../../../src/extensions/devin/errors/parse.ts";

const retryable = (message: string) =>
	isRetryableAssistantError({ stopReason: "error", errorMessage: message } as AssistantMessage);

function fromHttp(status: number, body: string): DevinError {
	return new DevinError(classifyFailure(parseHttpError(status, body)));
}

function fromTrailer(error: object, client?: IdentityKind): DevinError {
	const detail = parseTrailerError(Buffer.from(JSON.stringify({ error })));
	if (!detail) throw new Error("trailer without error");
	return new DevinError(classifyFailure(detail, client));
}

describe("error parsing", () => {
	it("keeps code, message and trace ID from a Connect JSON body", () => {
		expect(parseHttpError(401, '{"code":"unauthenticated","message":"bad token (trace ID: 0a1B2c)"}')).toEqual({
			status: 401,
			code: "unauthenticated",
			message: "bad token",
			traceId: "0a1B2c",
		});
	});

	it("falls back to the raw text for non-JSON, empty and field-less bodies", () => {
		expect(parseHttpError(502, "<html>bad gateway</html>")).toEqual({
			status: 502,
			message: "<html>bad gateway</html>",
		});
		expect(parseHttpError(500, "  ")).toEqual({ status: 500, message: "HTTP 500" });
		expect(parseHttpError(400, '{"code":5}').message).toBe('{"code":5}');
		expect(parseHttpError(400, "[1]").message).toBe("[1]");
	});

	it("parses trailers: error object, error string, unparseable text, and no error", () => {
		expect(
			parseTrailerError(Buffer.from('{"error":{"code":"unavailable","message":"busy (trace ID: ab12)"}}')),
		).toEqual({
			status: undefined,
			code: "unavailable",
			message: "busy",
			traceId: "ab12",
		});
		expect(parseTrailerError(Buffer.from('{"error":"raw"}'))).toEqual({ message: "raw" });
		expect(parseTrailerError(Buffer.from('not json but has "error"'))?.message).toContain("not json");
		expect(parseTrailerError(Buffer.from("{}"))).toBeNull();
		expect(parseTrailerError(Buffer.from('{"error":3}'))?.message).toBe('{"error":3}');
	});
});

describe("secret redaction", () => {
	const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl";
	it.each([
		["session token", "bad devin-session-token$abcDEF123_-xyz here"],
		["wspkce key", "bad wspkce$abc123 here"],
		["jwt", `bad ${jwt} here`],
	])("removes a %s from parsed errors", (_name, text) => {
		for (const detail of [
			parseHttpError(400, JSON.stringify({ code: "x", message: text })),
			parseHttpError(500, text),
			parseTrailerError(Buffer.from(JSON.stringify({ error: { message: text } }))),
			parseTrailerError(Buffer.from(JSON.stringify({ error: text }))),
		]) {
			expect(detail?.message).toContain("[redacted]");
			expect(detail?.message).not.toMatch(/devin-session-token\$a|wspkce\$a|eyJhbGci|eyJzdWI/);
		}
		// redacted before the length limit, so a cut token cannot leave a prefix behind
		const cut = parseHttpError(500, `${"a".repeat(590)} ${text}`).message;
		expect(cut).not.toMatch(/devin-session-token\$|wspkce\$|eyJ/);
	});
});

describe("failure classification", () => {
	const cases: Array<[string, DevinError, DevinFailure["kind"], boolean]> = [
		[
			"daily quota",
			fromTrailer({
				code: "failed_precondition",
				message:
					"Your daily usage quota has been exhausted. Visit https://app.devin.ai/settings/usage (trace ID: abc123)",
			}),
			"quota",
			false,
		],
		[
			"weekly quota",
			fromTrailer({ code: "permission_denied", message: "Your weekly usage quota has been exhausted" }),
			"quota",
			false,
		],
		["out of credits", fromTrailer({ message: "You are out of credits" }), "quota", false],
		[
			"rate limit with reset",
			fromTrailer({
				code: "resource_exhausted",
				message: "Reached message rate limit for this model. Please try again later. Resets in: 3h0m0s",
			}),
			"quota",
			false,
		],
		[
			"retired model",
			fromHttp(401, '{"code":"permission_denied","message":"This model is no longer available for your account"}'),
			"model_unavailable",
			false,
		],
		[
			"permission_denied internal error",
			fromTrailer({ code: "permission_denied", message: "an internal error occurred (trace ID: ff00)" }),
			"model_unavailable",
			false,
		],
		[
			"content policy",
			fromTrailer({ code: "permission_denied", message: "blocked by our content policy; remove sensitive content" }),
			"content_policy",
			false,
		],
		["unauthenticated", fromHttp(401, '{"code":"unauthenticated","message":"jwt expired"}'), "auth", false],
		["permission denied alone", fromHttp(403, '{"code":"permission_denied","message":"nope"}'), "auth", false],
		[
			"invalid argument with an ambiguous internal-error text",
			fromTrailer({ code: "invalid_argument", message: "an internal error occurred" }),
			"invalid_request",
			false,
		],
		[
			"failed precondition",
			fromTrailer({ code: "failed_precondition", message: "bad shape" }),
			"invalid_request",
			false,
		],
		["unavailable", fromTrailer({ code: "unavailable", message: "try again" }), "transient", true],
		["capacity", fromTrailer({ message: "We're currently facing high demand for this model." }), "transient", true],
		["internal", fromTrailer({ code: "internal", message: "boom" }), "transient", true],
		["HTTP 502", fromHttp(502, "bad gateway"), "transient", true],
		["bare 429", fromHttp(429, "slow down"), "transient", true],
		["429 with a quota text", fromHttp(429, "Your weekly usage quota has been exhausted"), "quota", false],
		[
			"resource_exhausted with a quota text",
			fromTrailer({ code: "resource_exhausted", message: "Your weekly usage quota has been exhausted" }),
			"quota",
			false,
		],
		[
			"backend internal error",
			fromTrailer({ message: "an internal error occurred (trace ID: 12ab)" }),
			"transient",
			true,
		],
		["empty-ish unknown", fromTrailer({ code: "weird", message: "strange" }), "unknown", false],
		[
			"client version",
			fromTrailer({
				message: "Your Windsurf version is out of date. Please update to the latest version to continue.",
			}),
			"client_version",
			false,
		],
	];

	it.each(cases)("%s -> %s, retryable=%s per @nycode/ai", (_name, error, kind, isRetry) => {
		expect(error.failure.kind).toBe(kind);
		if (kind !== "unknown") expect(retryable(error.message)).toBe(isRetry);
	});

	it("quota text carries the server text, quota wording, the usage URL and the reset time", () => {
		const error = fromTrailer({
			message: "Reached message rate limit for this model. Resets in: 3h0m0s (trace ID: abc123)",
		});
		expect(error.failure).toMatchObject({ kind: "quota", resetsIn: "3h0m0s", traceId: "abc123" });
		expect(error.message).toContain("Reached message rate limit");
		expect(error.message).toContain("quota exceeded");
		expect(error.message).toContain(USAGE_URL);
		expect(error.message).toContain("(trace ID: abc123)");
	});

	const VERSION_TEXT = "Your Windsurf version is out of date. Please update to the latest version to continue.";

	it("with the CLI identity, version-out-of-date is a quota hint with the usage page, not retried", () => {
		const error = fromTrailer({ message: VERSION_TEXT }, "cli");
		expect(error.failure).toMatchObject({ kind: "client_version", client: "cli" });
		expect(error.message).toContain("quota");
		expect(error.message).toContain(USAGE_URL);
		expect(retryable(error.message)).toBe(false);
	});

	it("with the Windsurf fallback, version-out-of-date says the identity was rejected and to install the CLI", () => {
		const error = fromTrailer({ message: VERSION_TEXT }, "fallback");
		expect(error.failure).toMatchObject({ kind: "client_version", client: "fallback" });
		expect(error.message).toContain("fallback client identity");
		expect(error.message).toContain("Install the Devin CLI");
		expect(error.message).not.toContain("quota");
		expect(retryable(error.message)).toBe(false);
	});

	it("marks 401 as unauthenticated (re-mintable) and a bare 403 as not", () => {
		expect(fromHttp(401, "x").failure).toMatchObject({ kind: "auth", unauthenticated: true });
		expect(fromHttp(403, "x").failure).toMatchObject({ kind: "auth", unauthenticated: false });
	});

	it("withholds ambiguous server text from non-retryable messages but keeps the trace ID", () => {
		const message = fromTrailer({
			code: "invalid_argument",
			message: "an internal error occurred (trace ID: 9f)",
		}).message;
		expect(message).not.toContain("internal error");
		expect(message).toContain("trace ID: 9f");
		expect(fromTrailer({ code: "invalid_argument", message: "tool schema is wrong" }).message).toContain(
			"tool schema is wrong",
		);
	});

	it("transient text names the server error and keeps the trace ID", () => {
		const error = fromTrailer({ code: "unavailable", message: "busy (trace ID: dead01)" });
		expect(error.message).toContain("temporarily unavailable");
		expect(error.message).toContain("dead01");
	});
});
