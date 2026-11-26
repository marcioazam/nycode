/**
 * Bypass Permissions (estilo Claude Code) para o motor de permissões do nycode.
 *
 * Padrão: DESLIGADO (modo seguro). Liga com `nycode --bypass`, NYCODE_BYPASS_PERMISSIONS=1 ou `permissions.bypass`;
 * `nycode --safe` (ou NYCODE_BYPASS_PERMISSIONS=0) mantém as confirmações.
 *
 * O motor nativo de permissões (core/permissions) lê
 * NYCODE_BYPASS_PERMISSIONS do ambiente; os hooks herdam o process.env do nycode, então
 * alternar a variável aqui vale imediatamente para esta sessão (e subagents iniciados depois).
 *
 *   /bypass          alterna
 *   /bypass on|off   define      /bypass status   mostra
 *   Ctrl+Shift+B     alterna
 *
 * Bypass é ortogonal aos modos Ask/Auto/Plan (docs/specs/claude-code-parity/bypass-orthogonal.md): /bypass on|off muda só o
 * bypass e mantém o modo atual (off não volta mais a Manual). Com o controlador de modos (claude-compat/permissions, slot
 * `nycode.permission-modes`) ele é o dono do estado e da restauração do plano; sem controlador, só reativa o bypass se
 * estava ligado ao entrar no plano (nunca liga por conta própria). /bypass on é opt-in deliberado (vale também em `nycode --safe`).
 *
 * Com bypass ON as confirmações ("ask") somem; os bloqueios catastróficos ("deny") continuam.
 */

import { Key } from "@nycode/tui";
import { PLAN_MODE_CHANNEL } from "../../extensions/_shared/events/plan-mode-state.ts";
import { ascii } from "../../extensions/ui-visual/icons.ts";
import type { ExtensionAPI, ExtensionContext } from "../extensions/types.ts";
import { isBypassOn, setBypassState } from "./bypass-state.ts";

const STATUS_KEY = "bypass-permissions";
/** Slot do controlador de modos (claude-compat/permissions/slot.ts); duplicado aqui para não acoplar as extensões. */
interface ModesApi {
	setBypass(on: boolean, opts?: { explicit?: boolean }): { ok: boolean };
	status(): { bypass: boolean };
}
function modes(): ModesApi | undefined {
	const v = (globalThis as Record<symbol, unknown>)[Symbol.for("nycode.permission-modes")] as
		| Partial<ModesApi>
		| undefined;
	return v && typeof v.setBypass === "function" && typeof v.status === "function" ? (v as ModesApi) : undefined;
}

function isOn(): boolean {
	const m = modes();
	if (m) return m.status().bypass;
	return isBypassOn();
}

function render(ctx: ExtensionContext | undefined): void {
	if (!ctx?.hasUI) return;
	if (modes()) {
		ctx.ui.setStatus(STATUS_KEY, undefined); // o controlador mostra o estado do modo
		return;
	}
	// Glifo + texto levam o estado; a cor (atenção, não falha) é reforço. Sem NO_COLOR: ui/a11y.ts só troca o tema depois.
	// Modo padrão (ask) não ocupa linha.
	const texto = `${ascii(process.env) ? "!" : "▲"} bypass ligado`; // onda 12, D4: sem emoji
	const warn = process.env.NO_COLOR ? texto : ctx.ui.theme.fg("error", texto); // vermelho
	ctx.ui.setStatus(STATUS_KEY, isOn() ? warn : undefined);
}

function set(ctx: ExtensionContext | undefined, on: boolean, why?: string): void {
	const m = modes();
	if (m) {
		m.setBypass(on, { explicit: true }); // o controlador notifica, mantém as variáveis e preserva o modo
		render(ctx);
		return;
	}
	setBypassState(on);
	render(ctx);
	if (ctx?.hasUI) {
		const base = on
			? "Bypass ligado: o nycode age sem perguntar (bloqueios catastróficos continuam) · /bypass off desliga"
			: "Bypass desligado: o nycode volta a perguntar";
		ctx.ui.notify(why ? `${base} (${why})` : base, on ? "warning" : "info");
	}
}

export default function (nycode: ExtensionAPI) {
	let lastCtx: ExtensionContext | undefined;
	let planActive = false;
	let wasOnBeforePlan = false;

	nycode.on("session_start", async (_event, ctx) => {
		lastCtx = ctx;
		render(ctx);
	});

	// nycode publica { active } no bus ao entrar/sair do plan mode. Com o controlador, ele cuida da restauração.
	// Sem ele: só restaura o bypass que já estava ligado antes do plano; nunca liga por conta própria (--safe segue seguro).
	nycode.events.on(PLAN_MODE_CHANNEL, (data: unknown) => {
		const active = (data as { active?: unknown } | undefined)?.active;
		if (typeof active !== "boolean") return;
		const entering = !planActive && active;
		const leaving = planActive && !active;
		planActive = active;
		if (modes()) return;
		if (entering) wasOnBeforePlan = isOn();
		if (leaving && wasOnBeforePlan && !isOn()) set(lastCtx, true, "restaurado ao sair do plan mode");
	});

	nycode.registerCommand("bypass", {
		description: "Bypass Permissions: alterna (ou on/off/status) as confirmações do guard",
		handler: async (args, ctx) => {
			lastCtx = ctx;
			const arg = (args ?? "").trim().toLowerCase();
			if (arg === "on") set(ctx, true);
			else if (arg === "off") set(ctx, false);
			else if (arg === "status")
				ctx.ui.notify(
					isOn() ? "Bypass ligado · /bypass off desliga" : "Bypass desligado · /bypass on liga",
					"info",
				);
			else set(ctx, !isOn());
		},
	});

	nycode.registerShortcut(Key.ctrlShift("b"), {
		description: "Alternar Bypass Permissions",
		handler: async (ctx) => {
			lastCtx = ctx;
			set(ctx, !isOn());
		},
	});
}
