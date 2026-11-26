/** Controlador de modos (Ask/Auto/Plan + bypass ortogonal): dono de NYCODE_PERMISSION_MODE e NYCODE_BYPASS_PERMISSIONS. Decide nada; o motor nativo (core/permissions) autoriza. */

import { ascii } from "../../ui-visual/icons.ts";
import {
	BYPASS_ENV,
	ELIGIBLE_ENV,
	MODE_ENV,
	MODE_LABEL,
	nextMode,
	OPTIN_ENV,
	type PermissionMode,
	parseMode,
	truthy,
} from "./modes.ts";
import type { PlanControl } from "./plan-bridge.ts";

export type ModeResult = { ok: true; mode: PermissionMode; bypass: boolean } | { ok: false; error: string };
export interface ModeStatus {
	mode: PermissionMode;
	label: string;
	/** Interruptor ortogonal ao modo: liga a permissão total ao LLM (DENY catastrófico continua no guard). */
	bypass: boolean;
	bypassAvailable: boolean;
	planControl: boolean;
}
/** API pública do slot global. `explicit` é só para comandos deliberados (/bypass on, /permissions bypass on). */
export interface PermissionModes {
	current(): PermissionMode;
	cycle(): ModeResult;
	/** Muda só o modo; 'bypassPermissions' (legado) equivale a setBypass(true, opts). */
	select(mode: string, opts?: { explicit?: boolean }): ModeResult;
	setBypass(on: boolean, opts?: { explicit?: boolean }): ModeResult;
	status(): ModeStatus;
}
/** Uma parte da linha de status: o tipo escolhe a cor na UI (ask verde, auto azul, plan roxo, bypass vermelho). */
export type StatusParte = { tipo: PermissionMode | "bypass"; texto: string };
export interface Sink {
	notify(message: string, level: "info" | "warning" | "error"): void;
	/** undefined limpa. */
	status(partes: StatusParte[] | undefined): void;
}
export interface Controller extends PermissionModes {
	bind(sink: Sink | undefined): void;
	/** Reconcilia com o plan mode real (evento ou consulta); `hint` é o booleano do evento quando não há controle semântico. */
	reconcile(hint?: boolean): void;
	dispose(): void;
}

/** Linha de status (antes só `⏵⏵ auto on` e/ou o bypass, Ask vazio e Plan só no HUD do nycode): o modo
 * sempre aparece, junto ao bypass: `⏵ ask` · `⏵⏵ auto` · `⏸ plan`, depois `▲ bypass ligado` quando ligado. */
const ICONE: Record<PermissionMode, [string, string]> = {
	default: ["⏵", ">"],
	acceptEdits: ["⏵⏵", ">>"],
	plan: ["⏸", "||"],
};
const NOME: Record<PermissionMode, string> = { default: "ask", acceptEdits: "auto", plan: "plan" };
export function statusPartes(mode: PermissionMode, bypass: boolean): StatusParte[] {
	const a = ascii(process.env) ? 1 : 0;
	const partes: StatusParte[] = [{ tipo: mode, texto: `${ICONE[mode][a]} ${NOME[mode]}` }];
	if (bypass) partes.push({ tipo: "bypass", texto: `${a ? "!" : "▲"} bypass ligado` });
	return partes;
}

export function createController(env: NodeJS.ProcessEnv, plan: () => PlanControl | undefined): Controller {
	// Wrappers/filhos legados já expressam opt-in com NYCODE_BYPASS_PERMISSIONS=1; --safe explícito (flag 0) vence.
	const eligible = env[ELIGIBLE_ENV] === undefined ? truthy(env[BYPASS_ENV]) : truthy(env[ELIGIBLE_ENV]);
	let optIn = truthy(env[OPTIN_ENV]);
	let sink: Sink | undefined;
	let beforePlan: PermissionMode | null = null;
	let transitioning = false;
	const bypassAvailable = () => eligible || optIn;

	// Modo ausente/vazio = default; não vazio inválido falha fechado em default (o bypass não muda por isso).
	// 'bypassPermissions' legado = default + pedido de bypass. plan nunca nasce do ambiente (o estado real vem do nycode).
	const rawMode = env[MODE_ENV]?.trim();
	const parsed = rawMode ? parseMode(rawMode) : undefined;
	let mode: PermissionMode = parsed?.ok && "mode" in parsed && parsed.mode !== "plan" ? parsed.mode : "default";
	const legacyBypass = !!parsed && parsed.ok && "bypass" in parsed;
	let bypass = (truthy(env[BYPASS_ENV]) || legacyBypass) && bypassAvailable();

	function commit(next: PermissionMode, nextBypass = bypass): void {
		mode = next;
		bypass = nextBypass;
		env[MODE_ENV] = mode;
		env[BYPASS_ENV] = bypass ? "1" : "0";
		sink?.status(statusPartes(mode, bypass));
	}
	commit(mode);

	const fail = (error: string): ModeResult => {
		sink?.notify(error, "error");
		return { ok: false, error };
	};
	const done = (next: PermissionMode, extra = ""): ModeResult => {
		sink?.notify(`Modo de permissão: ${MODE_LABEL[next]}${extra}`, "info");
		return { ok: true, mode: next, bypass };
	};

	function reconcile(hint?: boolean): void {
		if (transitioning) return;
		let active: boolean | undefined = hint;
		try {
			const p = plan();
			if (p) active = p.active();
		} catch {
			return; // estado do plan mode ilegível: não adivinhar
		}
		if (typeof active !== "boolean") return;
		if (active && mode !== "plan") {
			beforePlan = mode;
			commit("plan");
			done("plan");
		} else if (!active && mode === "plan") {
			const back = beforePlan ?? "default";
			beforePlan = null;
			commit(back);
			done(back, " (restaurado ao sair do plan mode)");
		}
	}

	function setPlan(enabled: boolean): string | undefined {
		const p = plan();
		if (!p)
			return "Controle do plan mode indisponível (patch permission-control do nycode não aplicado); nada foi alterado.";
		transitioning = true;
		try {
			if (!p.set(enabled) || p.active() !== enabled)
				return `O plan mode não ${enabled ? "ativou" : "desativou"}; o modo de permissão não foi alterado.`;
		} catch (e) {
			return `Falha no controle do plan mode: ${e instanceof Error ? e.message : String(e)}`;
		} finally {
			transitioning = false;
		}
		return undefined;
	}

	function setBypass(on: boolean, opts?: { explicit?: boolean }): ModeResult {
		if (on && !bypassAvailable() && !opts?.explicit) {
			return fail(
				"Bypass indisponível nesta sessão (--safe ou sem opt-in). Opte deliberadamente com /bypass on ou /permissions bypass on.",
			);
		}
		if (on && opts?.explicit && !eligible) {
			optIn = true;
			env[OPTIN_ENV] = "1";
		}
		if (on === bypass) {
			sink?.notify(`Bypass ${on ? "ligado" : "desligado"} (já estava)`, "info");
			return { ok: true, mode, bypass };
		}
		commit(mode, on);
		sink?.notify(
			on
				? "Bypass ligado: o nycode age sem perguntar (bloqueios catastróficos continuam) · /bypass off desliga"
				: "Bypass desligado: o nycode volta a perguntar",
			on ? "warning" : "info",
		);
		return { ok: true, mode, bypass };
	}

	function select(raw: string, opts?: { explicit?: boolean }): ModeResult {
		const p = parseMode(raw);
		if (!p.ok) return fail(p.error);
		if ("bypass" in p) return setBypass(true, opts);
		reconcile();
		const target = p.mode;
		if (target === mode) return done(mode, " (já ativo)");
		if (target === "plan" || mode === "plan") {
			const err = setPlan(target === "plan");
			if (err) return fail(err);
		}
		beforePlan = target === "plan" ? mode : null;
		commit(target);
		return done(target);
	}

	return {
		current: () => {
			reconcile();
			return mode;
		},
		cycle: () => {
			reconcile();
			return select(nextMode(mode));
		},
		select,
		setBypass,
		status: () => {
			reconcile();
			return {
				mode,
				label: MODE_LABEL[mode],
				bypass,
				bypassAvailable: bypassAvailable(),
				planControl: plan() !== undefined,
			};
		},
		bind: (s) => {
			sink = s;
			commit(mode);
		},
		reconcile,
		dispose: () => {
			sink = undefined;
		},
	};
}
