/** Ponte para o controlador semântico do plan mode do nycode (patch permission-control); valida o formato em tempo de execução. */
export const PLAN_CONTROLLER_SLOT = Symbol.for("nycode.plan-controller");
export const PLAN_MODE_CHANNEL = "nycode:plan-mode";

export interface PlanControl {
	active(): boolean;
	/** true quando, ao final, o plan mode está no estado pedido. */
	set(enabled: boolean): boolean;
}

export function getPlanControl(): PlanControl | undefined {
	const slot = (globalThis as Record<symbol, unknown>)[PLAN_CONTROLLER_SLOT] as
		| { active?: unknown; set?: unknown }
		| undefined;
	if (!slot || typeof slot.active !== "function" || typeof slot.set !== "function") return undefined;
	const active = slot.active as () => unknown;
	const set = slot.set as (enabled: boolean) => unknown;
	return {
		active: () => {
			const v = active.call(slot);
			if (typeof v !== "boolean") throw new Error("plan controller: active() não devolveu boolean");
			return v;
		},
		set: (enabled) => set.call(slot, enabled) === true,
	};
}
