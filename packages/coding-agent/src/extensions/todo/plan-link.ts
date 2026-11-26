/**
 * Espelha as etapas do plano em execução na lista do `todo` (contrato em `_shared/events/plan-steps.ts`).
 * Função pura: recebe a lista e devolve a nova, sem tocar na entrada.
 */
import type { PlanStepsEvent, TodoStatus } from "../_shared/events/plan-mode-state.ts";
import { isOpen } from "./status.ts";

export type LinkStatus = TodoStatus;

export interface LinkTodo {
	id: number;
	reason?: string;
	text: string;
	status: LinkStatus;
	activeForm?: string;
	/** Etapa do plano que este item espelha; sem ele, o item é do modelo. */
	planStep?: number;
}

export interface Reconciled<T extends LinkTodo> {
	todos: T[];
	nextId: number;
	changed: boolean;
}

const stepText = (step: number, text: string): string => `${step}. ${text}`;

/**
 * Itens ligados = etapas do plano: um por etapa, concluído junto com ela, a primeira etapa aberta em andamento.
 * Fora de execução (fim, cancelamento, ramo sem plano): os itens ligados saem.
 */
export function reconcilePlan<T extends LinkTodo>(todos: T[], nextId: number, ev: PlanStepsEvent): Reconciled<T> {
	if (!ev.executing) {
		const kept = todos.filter((t) => t.planStep === undefined);
		return { todos: kept, nextId, changed: kept.length !== todos.length };
	}

	const before = JSON.stringify(todos);
	const steps = new Map(ev.steps.map((s) => [s.step, s]));
	// Etapa que não existe mais (plano trocado): o item ligado sai.
	const out = todos.filter((t) => t.planStep === undefined || steps.has(t.planStep)).map((t) => ({ ...t }));
	let id = nextId;
	for (const s of ev.steps) {
		let t = out.find((x) => x.planStep === s.step);
		if (!t) {
			t = { id: id++, text: stepText(s.step, s.text), status: "pending", planStep: s.step } as T;
			out.push(t);
		}
		if (s.completed) {
			t.status = "completed";
			delete t.reason;
		} else if (t.status === "completed") t.status = "pending"; // etapa reaberta (rewind): o item volta
	}
	const current = ev.steps.find((s) => !s.completed);
	const cur = current && out.find((x) => x.planStep === current.step);
	// failed/blocked/cancelled keep their status: they do not complete the step, and the model decides what follows.
	if (cur && cur.status !== "in_progress" && isOpen(cur.status)) {
		// Um item em andamento por vez: a etapa atual assume e os demais voltam a pendente.
		for (const t of out) if (t.status === "in_progress") t.status = "pending";
		cur.status = "in_progress";
	}
	return { todos: out, nextId: id, changed: JSON.stringify(out) !== before || id !== nextId };
}
