/**
 * Channel and payload for the plan-mode state the plan-mode extension publishes on
 * nycode's shared extension event bus. Hooks report Claude's permission_mode from it;
 * nycode loads extensions without a shared module cache, so state rides the bus.
 */

export const PLAN_MODE_CHANNEL = "nycode:plan-mode";

export interface PlanModeState {
	active: boolean;
}

export function isPlanModeState(data: unknown): data is PlanModeState {
	return typeof (data as PlanModeState)?.active === "boolean";
}
