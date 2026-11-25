/**
 * The main interactive session never blocks: the turn must not stay stuck while the user waits. Only there
 * (`ctx.hasUI`, not a subagent) the `bash` default timeout drops to `bash.mainGuard.timeoutSec` (120 s) and the cap to
 * `capSec` (600 s), the numbers of Claude Code's Bash; a `sleep` of 30 s or more and polling loops are refused, and
 * `run wait` is shortened to 30 s (Codex hands control back within 30 s). The right way is `run start` with
 * `await: true`, which notifies on finish. `bash.mainGuard.enabled: false` turns all of it off. Subagents and `-p` have
 * nobody waiting: they keep the core policy (600 s / 1800 s, seam K8).
 */

import type { ExtensionAPI } from "../../core/extensions/types.ts";
import { resolveNycodeSettings } from "../../core/settings-nycode.ts";
import { SLEEP_LIMIT_S, waitsInForeground } from "./espera.ts";

/** `run wait` limit of the main interactive session, in seconds. */
export const MAIN_WAIT_S = 30;
const BACKGROUND =
	"Rode em segundo plano: run start {command, await: true} avisa quando terminar (não faça polling nem sleep); run tail mostra o log.";

/** Timeout to apply, or the refusal when the request is above the cap. */
export function decide(timeout: unknown, lim: { def: number; max: number }): { timeout: number } | { deny: string } {
	if (typeof timeout !== "number" || !Number.isFinite(timeout) || timeout <= 0) return { timeout: lim.def };
	if (timeout > lim.max)
		return { deny: `bash: timeout de ${Math.round(timeout)}s acima do teto de ${lim.max}s. ${BACKGROUND}` };
	return { timeout };
}

export default function bashMainGuardExtension(
	nycode: ExtensionAPI,
	env: Record<string, string | undefined> = process.env,
): void {
	nycode.on("tool_call", (event, ctx) => {
		const main = ctx?.hasUI === true && env.NYCODE_SUBAGENT !== "1" && !(Number(env.NYCODE_SUBAGENT_DEPTH) > 0);
		if (!main) return undefined;
		const guard = resolveNycodeSettings(nycode.getSettings(), env).bash.mainGuard;
		if (!guard.enabled) return undefined;
		if (event.toolName === "run") {
			const input = event.input as { action?: string; timeout_s?: number };
			if (input.action === "wait")
				input.timeout_s = Math.min(
					typeof input.timeout_s === "number" && input.timeout_s > 0 ? input.timeout_s : MAIN_WAIT_S,
					MAIN_WAIT_S,
				);
			return undefined;
		}
		if (event.toolName !== "bash") return undefined;
		const input = event.input as { command?: string; timeout?: number };
		if (waitsInForeground(String(input.command ?? "")))
			return {
				block: true,
				reason: `bash: este comando espera em primeiro plano (sleep de ${SLEEP_LIMIT_S}s ou mais, ou laço de consulta) e prende o turno. ${BACKGROUND}`,
			};
		// A default above the cap would be refused by its own rule: the cap wins.
		const d = decide(input.timeout, { def: Math.min(guard.timeoutSec, guard.capSec), max: guard.capSec });
		if ("deny" in d) return { block: true, reason: d.deny };
		input.timeout = d.timeout;
		return undefined;
	});
}
