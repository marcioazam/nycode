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
 * Plano em execução ↔ lista da ferramenta `todo` (a lista fica sincronizada com as etapas do plano, sem lacunas).
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

// Todo sync contract (todo.sync): the todo extension owns the list; run/subagent/turn-check talk to it over the bus.

export type TodoStatus = "pending" | "in_progress" | "completed" | "failed" | "blocked" | "cancelled";

/** An outside event (background run, background subagent) asks the todo extension for an item or reports its end. */
export const TODO_EXTERNAL_CHANNEL = "nycode:todo-external";

export type TodoExternalEvent =
	| { op: "add"; linkId: string; text: string }
	| { op: "finish"; linkId: string; ok: boolean; detail?: string; stopped?: boolean };

export function isTodoExternalEvent(data: unknown): data is TodoExternalEvent {
	const d = data as { op?: unknown; linkId?: unknown; text?: unknown; ok?: unknown } | undefined;
	if (typeof d?.linkId !== "string") return false;
	if (d.op === "add") return typeof d.text === "string";
	return d.op === "finish" && typeof d.ok === "boolean";
}

/** Request/reply over the bus: the todo extension answers synchronously through `reply`. */
export const TODO_TURN_STATE_CHANNEL = "nycode:todo-turn-state";

export interface TodoSyncItem {
	id: number;
	text: string;
	status: TodoStatus;
	reason?: string;
	/** Plan step the item mirrors; unset = the model's own item. */
	planStep?: number;
	/** Background event the item waits for. */
	linkId?: string;
}

export interface ExternalFinish {
	linkId: string;
	ok: boolean;
	detail?: string;
	/** Ended because someone stopped it: the item is cancelled, not failed. */
	stopped?: boolean;
}

export interface TodoTurnState {
	items: readonly TodoSyncItem[];
	/** Finished background events not yet announced; reading them clears them. */
	takeFinished(): ExternalFinish[];
}

export interface TodoTurnStateRequest {
	reply(state: TodoTurnState): void;
}

/** Reads the todo extension's state; undefined when it is not loaded. */
export function readTodoTurnState(events: { emit(channel: string, data: unknown): void }): TodoTurnState | undefined {
	let state: TodoTurnState | undefined;
	const request: TodoTurnStateRequest = {
		reply: (s) => {
			state = s;
		},
	};
	events.emit(TODO_TURN_STATE_CHANNEL, request);
	return state;
}
