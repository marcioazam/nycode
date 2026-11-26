/** Modos locais de permissão (contrato: docs/specs/claude-code-parity/bypass-orthogonal.md, que supera permission-modes.md §4).
 * Ask=default, Auto=acceptEdits, Plan=plan; o bypass é um interruptor independente. A autorização real é só do motor nativo (core/permissions). */
export const PERMISSION_MODES = ["default", "acceptEdits", "plan"] as const;
export type PermissionMode = (typeof PERMISSION_MODES)[number];

export const MODE_ENV = "NYCODE_PERMISSION_MODE";
export const BYPASS_ENV = "NYCODE_BYPASS_PERMISSIONS";
/** Elegibilidade de bypass fixada na largada pelo wrapper (--safe=0, --bypass=1); o controlador só lê. */
export const ELIGIBLE_ENV = "NYCODE_BYPASS_ELIGIBLE";
/** Opt-in deliberado de /bypass on ou /permissions bypassPermissions; herdado pelos filhos. */
export const OPTIN_ENV = "NYCODE_BYPASS_OPTIN";

/** `bypass` = valor legado `bypassPermissions`: liga o bypass, não é um modo. */
export type ParsedMode = { ok: true; mode: PermissionMode } | { ok: true; bypass: true } | { ok: false; error: string };

const ALIASES: Record<string, PermissionMode> = {
	default: "default",
	manual: "default",
	ask: "default",
	acceptedits: "acceptEdits",
	auto: "acceptEdits",
	plan: "plan",
};

export function truthy(v: string | undefined): boolean {
	return ["1", "true", "on", "yes"].includes((v ?? "").trim().toLowerCase());
}

export function parseMode(raw: unknown): ParsedMode {
	const key = typeof raw === "string" ? raw.trim().toLowerCase() : "";
	if (key === "bypasspermissions") return { ok: true, bypass: true };
	const mode = ALIASES[key];
	if (mode) return { ok: true, mode };
	return {
		ok: false,
		error: `Modo desconhecido "${typeof raw === "string" ? raw.slice(0, 40) : ""}". Use ask, auto, plan (ou bypass on|off).`,
	};
}

/** default → acceptEdits → plan → default; o bypass nunca entra no ciclo. */
export function nextMode(current: PermissionMode): PermissionMode {
	if (current === "default") return "acceptEdits";
	if (current === "acceptEdits") return "plan";
	return "default";
}

export const MODE_LABEL: Record<PermissionMode, string> = { default: "Ask", acceptEdits: "Auto", plan: "Plan" };
