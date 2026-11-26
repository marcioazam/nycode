// Client identity (ide name and version) the Devin server sees. Ported from pi-devin-plus 0.1.3 (MIT), see ../LICENSE.
import { runDevin } from "./cli.ts";

/**
 * Cognition gates some Devin Local-only models by client ide name; dwgx/WindsurfAPI notes (not re-verified here) say the
 * gpt-5.6 and swe-2 families reject ide "windsurf". The extension therefore presents itself as the Devin CLI (real
 * binary and version) when it is installed. This is an accepted compliance risk (docs/harness/devin-provider-2026-11-26.md).
 */

/**
 * ide "windsurf" with the version devin-core 0.0.7 sends. Last-known-good, verified live on 2026-11-26 (Devin CLI
 * 3000.14.30821 installed, free swe-2* models): GetCascadeModelConfigs returns the full catalog (319 models) and swe-2
 * chat answers. The same RPC answers an EMPTY body to ide "devin-cli", and chat with ide "devin-desktop" 3.7.0 is
 * rejected as "Your Windsurf version is out of date". Cognition enforces a minimum client version server-side, so a
 * live request decides whether this is still accepted. Change it here and nowhere else.
 */
export const WINDSURF_IDENTITY = { ide: "windsurf", version: "2.0.0" } as const;

/** `cli`: the real Devin CLI identity; `fallback`: the Windsurf constant, used when no CLI is installed. */
export type IdentityKind = "cli" | "fallback";

export interface ClientIdentity {
	ide: string;
	version: string;
	kind: IdentityKind;
}

let cachedIdentity: ClientIdentity | null = null;

/** Drops the memoized identity (tests, and after a CLI update). */
export function clearClientIdentityCache(): void {
	cachedIdentity = null;
}

/**
 * Chat identity: the CLI's real one (ide "devin-cli" plus its reported version) when the binary exists, else
 * WINDSURF_IDENTITY. Runs `devin --version` at most once per process, on the first request, never at startup.
 */
export async function resolveClientIdentity(): Promise<ClientIdentity> {
	if (cachedIdentity) return cachedIdentity;
	try {
		const { stdout, code } = await runDevin(["--version"], { timeoutMs: 8_000 });
		const match = code === 0 ? stdout.match(/\d+\.\d+\.\d+/) : null;
		if (match) {
			cachedIdentity = { ide: "devin-cli", version: match[0], kind: "cli" };
			return cachedIdentity;
		}
	} catch {
		// fall through to the Windsurf identity
	}
	cachedIdentity = { ...WINDSURF_IDENTITY, kind: "fallback" };
	return cachedIdentity;
}
