// Tagged union of the ways a Devin call can fail, and the error type that carries one.
import type { IdentityKind } from "../auth/identity.ts";
import { describeFailure } from "./describe.ts";

/** What the server said, parsed from an HTTP error body or a Connect end-of-stream trailer. */
export interface FailureDetail {
	/** HTTP status, absent for a trailer error. */
	status?: number;
	/** Connect/gRPC code such as `unauthenticated`, `permission_denied`, `failed_precondition`. */
	code?: string;
	message: string;
	/** From `(trace ID: <hex>)` in the message; quote it to Cognition support. */
	traceId?: string;
}

export type DevinFailure =
	| (FailureDetail & { kind: "quota"; resetsIn?: string })
	// `client` is the identity that was rejected: the real CLI (the text then means quota) or the Windsurf fallback.
	| (FailureDetail & { kind: "client_version"; client: IdentityKind })
	| (FailureDetail & { kind: "model_unavailable" })
	| (FailureDetail & { kind: "content_policy" })
	// `unauthenticated` is true for HTTP 401 / code unauthenticated: the cached JWT may only be stale.
	| (FailureDetail & { kind: "auth"; unauthenticated: boolean })
	| (FailureDetail & { kind: "invalid_request" })
	| (FailureDetail & { kind: "transient" })
	| (FailureDetail & { kind: "unknown" });

/** An error whose message is the user-facing text of its classified failure. */
export class DevinError extends Error {
	readonly failure: DevinFailure;

	constructor(failure: DevinFailure) {
		super(describeFailure(failure));
		this.name = "DevinError";
		this.failure = failure;
	}
}
