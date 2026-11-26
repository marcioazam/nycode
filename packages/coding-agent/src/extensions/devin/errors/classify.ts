// Classifies a parsed Devin error into a DevinFailure. Order matters: narrower, account-scoped verdicts come first.
// Wording and ordering follow the live observations in dwgx/WindsurfAPI `classifyUpstreamError` (MIT), see ../LICENSE.
import type { IdentityKind } from "../auth/identity.ts";
import type { DevinFailure, FailureDetail } from "./failure.ts";

const CLIENT_VERSION = /version is out of date|update to the latest version/i;
const RATE_LIMIT_WITH_RESET = /(message |request )?rate limit(ed)?[\s\S]*resets? in[:\s]/i;
const RESET_IN = /resets? in[:\s]+([0-9hms.]+)/i;
const CAPACITY =
	/high demand|try again later|currently (busy|overloaded|at capacity)|model is (busy|overloaded)|temporarily (busy|overloaded|unavailable)|server is busy|overloaded|(service|backend|model|server) (is )?(temporarily )?unavailable|capacity/i;
const INTERNAL_ERROR = /internal error occurred/i;
const CONTENT_POLICY = /blocked by (our |the )?content policy|remove (sensitive|unsafe) content|content[_ ]policy/i;
const QUOTA = [
	/insufficient.*(credit|quota|balance|funds)/i,
	/out of (credit|quota|balance|funds)/i,
	/(credit|quota|balance|allowance|usage)[\s\w-]{0,40}?(exceeded|exhausted|depleted|used up)/i,
	/on.?demand[^.]{0,60}(exhausted|exceeded|depleted|out of|insufficient)/i,
	/run(?:ning)? out of (credit|quota|balance|funds|usage)/i,
];
const MODEL_UNAVAILABLE = /\b(?:model|selector)\b[^.]{0,60}?\bno longer available for your account\b/i;
const UNAUTHENTICATED = /unauthenticated|invalid.*token/i;
const REQUEST_REJECTION_CODES = new Set(["invalid_argument", "failed_precondition"]);

/** Maps what the server said onto one failure class; `client` is the identity the request presented. */
export function classifyFailure(detail: FailureDetail, client: IdentityKind = "cli"): DevinFailure {
	const { code, status } = detail;
	const text = detail.message;

	if (CLIENT_VERSION.test(text)) return { ...detail, kind: "client_version", client };
	if (RATE_LIMIT_WITH_RESET.test(text)) return { ...detail, kind: "quota", resetsIn: RESET_IN.exec(text)?.[1] };
	if (status === 429 || code === "resource_exhausted") {
		// A spent plan can arrive as a 429 too; only a bare throttle clears by itself.
		if (QUOTA.some((pattern) => pattern.test(text)))
			return { ...detail, kind: "quota", resetsIn: RESET_IN.exec(text)?.[1] };
		return { ...detail, kind: "transient" };
	}
	if (CAPACITY.test(text) || code === "unavailable") return { ...detail, kind: "transient" };
	if (INTERNAL_ERROR.test(text) && !REQUEST_REJECTION_CODES.has(code ?? "")) {
		// permission_denied + "an internal error occurred" is how a model this account may not use is refused.
		return code === "permission_denied" ? { ...detail, kind: "model_unavailable" } : { ...detail, kind: "transient" };
	}
	if (CONTENT_POLICY.test(text)) return { ...detail, kind: "content_policy" };
	if (code === "insufficient_quota" || QUOTA.some((pattern) => pattern.test(text))) {
		return { ...detail, kind: "quota", resetsIn: RESET_IN.exec(text)?.[1] };
	}
	if (MODEL_UNAVAILABLE.test(text)) return { ...detail, kind: "model_unavailable" };
	if (REQUEST_REJECTION_CODES.has(code ?? "")) return { ...detail, kind: "invalid_request" };
	if (status === 401 || code === "unauthenticated" || UNAUTHENTICATED.test(text)) {
		return { ...detail, kind: "auth", unauthenticated: true };
	}
	if (status === 403 || code === "permission_denied") return { ...detail, kind: "auth", unauthenticated: false };
	if ((status !== undefined && status >= 500) || code === "internal" || code === "unknown") {
		return { ...detail, kind: "transient" };
	}
	return { ...detail, kind: "unknown" };
}
