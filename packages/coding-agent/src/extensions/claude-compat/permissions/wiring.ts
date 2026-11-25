/** Liga o controlador a uma instância do nycode: slot global, sink da UI, evento do plan mode e limpeza no shutdown. */
import type { ExtensionAPI, ExtensionContext } from "../../../core/extensions/types.ts";
import { type Controller, createController, type Sink, type StatusParte } from "./controller.ts";
import { getPlanControl, PLAN_MODE_CHANNEL } from "./plan-bridge.ts";
import { registerPermissionModes } from "./slot.ts";

const STATUS_KEY = "permission-mode";
/** Cores dos modos: ask verde, auto azul, plan roxo (bashMode é o roxo dos temas nycode-*), bypass vermelho. */
export const COR: Record<StatusParte["tipo"], string> = {
	default: "success",
	acceptEdits: "accent",
	plan: "bashMode",
	bypass: "error",
};

export function sinkFor(ctx: ExtensionContext): Sink | undefined {
	if (!ctx.hasUI) return undefined;
	return {
		notify: (m, l) => {
			try {
				ctx.ui.notify(m, l);
			} catch {
				/* contexto de sessão antiga */
			}
		},
		status: (partes) => {
			try {
				const t = ctx.ui.theme;
				const pinta = (p: StatusParte) => (process.env.NO_COLOR ? p.texto : t.fg(COR[p.tipo] as never, p.texto));
				ctx.ui.setStatus(
					STATUS_KEY,
					partes?.length ? partes.map(pinta).join(process.env.NO_COLOR ? " · " : t.fg("dim", " · ")) : undefined,
				);
			} catch {
				/* contexto de sessão antiga */
			}
		},
	};
}

export function installPermissionModes(nycode: ExtensionAPI, env: NodeJS.ProcessEnv = process.env): Controller {
	const controller = createController(env, getPlanControl);
	const unregister = registerPermissionModes({
		current: controller.current,
		cycle: controller.cycle,
		select: controller.select,
		setBypass: controller.setBypass,
		status: controller.status,
	});
	const off = nycode.events.on(PLAN_MODE_CHANNEL, (d: unknown) => {
		const a = d && typeof d === "object" ? (d as { active?: unknown }).active : undefined;
		controller.reconcile(typeof a === "boolean" ? a : undefined);
	}) as unknown;
	nycode.on("session_start", async (_e, ctx) => {
		controller.bind(sinkFor(ctx));
		controller.reconcile();
	});
	nycode.on("session_shutdown", async () => {
		controller.dispose();
		unregister();
		if (typeof off === "function") off();
	});
	return controller;
}
