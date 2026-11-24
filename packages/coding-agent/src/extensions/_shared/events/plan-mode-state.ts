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

/**
 * Plano em execução ↔ lista da ferramenta `todo` (dono, 2026-11-24: "todo list 100% sem gaps, sempre sincronizando").
 * O plano é a fonte: plan-mode publica as etapas em PLAN_STEPS_CHANNEL a cada mudança e ao restaurar a sessão; a
 * extensão todo espelha cada etapa num item ligado (`planStep`). Concluir um item ligado pela ferramenta publica
 * TODO_STEP_DONE_CHANNEL, que plan-mode trata como um [DONE:n]. As duas extensões não compartilham módulo em memória,
 * então o estado vai pelo barramento.
 */

export const PLAN_STEPS_CHANNEL = "nycode:plan-steps";
export const TODO_STEP_DONE_CHANNEL = "nycode:todo-step-done";

export interface PlanStep {
	step: number;
	text: string;
	completed: boolean;
}

export interface PlanStepsEvent {
	/** Sessão que publicou: um ouvinte reaproveitado entre sessões (RPC) ignora a de outra. */
	session?: string;
	/** Plano em execução: os itens ligados seguem `steps`. Fora de execução (fim, cancelamento, ramo sem plano) eles saem. */
	executing: boolean;
	steps: PlanStep[];
}

export function isPlanStepsEvent(data: unknown): data is PlanStepsEvent {
	const d = data as PlanStepsEvent | undefined;
	return typeof d?.executing === "boolean" && Array.isArray(d.steps);
}
