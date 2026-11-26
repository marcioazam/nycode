/**
 * End-of-turn todo check (todo.sync only). One block per user turn, from `agent_before_settle`.
 *
 * Block when the turn ran >= MIN_CALLS tool calls, the list did not change and an item is open (pending/in_progress;
 * blocked is deferred). The message offers three exits: complete/fail, block/cancel, or `todo confirm`.
 * A1 nudge (plan execution): the model closed its own (unlinked) items but no linked plan step advanced; it runs
 * with plan steps linked, i.e. after approval. Plan mode itself (planning, read-only) is skipped by both, because
 * an enabled `plan-mode` entry means no execution is happening yet.
 * Skips: subagent, plan mode, a completion-gate/plan-gate block already in this turn, this check already fired.
 */
import type { ExtensionAPI } from "../../core/extensions/types.ts";
import { readTodoTurnState, type TodoSyncItem } from "../_shared/events/plan-mode-state.ts";
import { readTodoSyncEnabled } from "./stale-reminder.ts";
import { isOpen, listChangedSince, modelOwnClosedWithoutStepAdvance, toStatus } from "./status.ts";

export const TURN_CHECK_TYPE = "todo-turn-check";
const MIN_CALLS = 3;
const MAX_LISTED = 8;

type Entry = Record<string, any>;
type Decision = { kind: "list" | "step"; message: string } | undefined;

const isUser = (e: Entry): boolean => e.type === "message" && e.message?.role === "user";
const blocksOf = (e: Entry): Entry[] =>
	e.type === "message" && e.message?.role === "assistant" && Array.isArray(e.message.content) ? e.message.content : [];

/** Items of the last todo snapshot written before `index`. */
function itemsBefore(branch: readonly Entry[], index: number): TodoSyncItem[] {
	const snap = branch.slice(0, index).findLast((e) => e.type === "custom" && e.customType === "nycode:todo");
	const todos: Entry[] = Array.isArray(snap?.data?.todos) ? snap.data.todos : [];
	return todos.map((t) => ({
		id: t.id,
		text: String(t.text ?? ""),
		status: toStatus(t.status),
		planStep: t.planStep,
	}));
}

/** Pure decision over the branch, the drafts of this settle and the current items. */
export function decideTurnCheck(
	branch: readonly Entry[],
	drafts: readonly Entry[],
	items: readonly TodoSyncItem[],
): Decision {
	let start = 0;
	let planMode = false;
	for (let i = 0; i < branch.length; i++) {
		if (isUser(branch[i])) start = i + 1;
		if (branch[i].type === "custom" && branch[i].customType === "plan-mode")
			planMode = branch[i].data?.enabled === true;
	}
	if (planMode) return undefined;
	const turn = [...branch.slice(start), ...drafts];
	const marked = (type: string) =>
		turn.some((e) => e.customType === type && (e.type === "custom" || e.type === "custom_message"));
	if (marked("completion-gate") || marked("plan-gate") || marked(TURN_CHECK_TYPE)) return undefined;

	const calls = turn.flatMap(blocksOf).filter((b) => b?.type === "toolCall");
	const confirmed = calls.some((b) => b.name === "todo" && b.arguments?.action === "confirm");
	if (confirmed) return undefined;

	if (modelOwnClosedWithoutStepAdvance(itemsBefore(branch, start), items)) {
		return {
			kind: "step",
			message:
				"Todo check: you closed your own todo item(s) but no plan step advanced. If a plan step is done, complete its linked todo item (todo complete id=<n>) or write [DONE:n]; otherwise carry on.",
		};
	}
	if (calls.length < MIN_CALLS || listChangedSince(branch, start)) return undefined;
	// Plan-linked items advance with the plan (plan-gate covers execution), as the stale reminder does.
	const open = items.filter((t) => isOpen(t.status) && t.planStep === undefined);
	if (open.length === 0) return undefined;
	const lines = open.slice(0, MAX_LISTED).map((t) => `#${t.id} [${t.status}] ${t.text.slice(0, 60)}`);
	if (open.length > MAX_LISTED) lines.push(`+${open.length - MAX_LISTED} more`);
	return {
		kind: "list",
		message: `Todo check: this turn ran ${calls.length} tool calls and the todo list did not change. Open items:\n${lines.join("\n")}\nBefore you stop, do one of: complete or fail an item; block or cancel it (deferred); or call \`todo confirm\` if the list is already right. This check fires once per turn.`,
	};
}

/** Registers the check; a no-op in subagents and unless todo.sync is on. */
export function registerTurnCheck(nycode: ExtensionAPI): void {
	if (process.env.NYCODE_SUBAGENT === "1") return;
	nycode.on("agent_before_settle", (event, ctx) => {
		try {
			if (!readTodoSyncEnabled(nycode)) return;
			const state = readTodoTurnState(nycode.events);
			if (!state) return;
			const decision = decideTurnCheck(
				ctx.sessionManager.getBranch() as Entry[],
				event.entries as Entry[],
				state.items,
			);
			if (!decision) return;
			return {
				entries: [
					...event.entries,
					{ type: "custom", customType: TURN_CHECK_TYPE, data: { kind: decision.kind } },
					{ type: "custom_message", customType: TURN_CHECK_TYPE, content: decision.message, display: true },
				],
				continue: true,
			};
		} catch {
			return; // fail open: never traps the session
		}
	});
}
