/** Publica as etapas do plano para a extensão todo (contrato em `_shared/events/plan-steps.ts`), sem repetir estado igual. */
import type { ExtensionAPI, ExtensionContext } from "../../../core/extensions/types.ts";
import { PLAN_STEPS_CHANNEL, type PlanStepsEvent } from "../../_shared/events/plan-mode-state.ts";
import type { TodoItem } from "../utils.ts";

const sessionOf = (ctx: ExtensionContext | undefined): string | undefined => {
	try {
		return (ctx?.sessionManager as { getSessionId?: () => string } | undefined)?.getSessionId?.();
	} catch {
		return undefined; // contexto de sessão velho
	}
};

export function createStepPublisher(nycode: ExtensionAPI) {
	let last = "";
	const emit = (ev: PlanStepsEvent): void => {
		const json = JSON.stringify(ev);
		if (json === last) return;
		last = json;
		nycode.events.emit(PLAN_STEPS_CHANNEL, ev);
	};
	return {
		/** Plano em execução: etapas atuais. */
		publish(ctx: ExtensionContext | undefined, items: TodoItem[]): void {
			const steps = items.map((t) => ({ step: t.step, text: t.text, completed: t.completed }));
			emit({ session: sessionOf(ctx), executing: true, steps });
		},
		/** Fora de execução (fim, cancelamento, ramo restaurado sem plano): os itens ligados saem. */
		end(ctx: ExtensionContext | undefined): void {
			emit({ session: sessionOf(ctx), executing: false, steps: [] });
		},
		/** Nova sessão ou outro ramo: o próximo estado sai mesmo se igual ao último. */
		reset(): void {
			last = "";
		},
	};
}
