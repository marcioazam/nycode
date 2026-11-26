/**
 * Todo status rules shared by the todo tool, the reminders and the turn check.
 * open = pending, in_progress; deferred = blocked (waits on something, no nudges); terminal = completed, failed, cancelled.
 */
import type { TodoStatus, TodoSyncItem } from "../_shared/events/plan-mode-state.ts";

export type { TodoStatus };

const STATUSES: readonly string[] = ["pending", "in_progress", "completed", "failed", "blocked", "cancelled"];

/** Persisted or event status to a known one; anything else (legacy, corrupt) is pending. */
export const toStatus = (raw: unknown): TodoStatus =>
	STATUSES.includes(raw as string) ? (raw as TodoStatus) : "pending";

export const isOpen = (status: string): boolean => status === "pending" || status === "in_progress";
export const isDeferred = (status: string): boolean => status === "blocked";
export const isTerminal = (status: string): boolean =>
	status === "completed" || status === "failed" || status === "cancelled";

/** One-shot reminder for a finished background event: names the item and suggests `failed` on failure. */
export function externalFinishReminder(
	items: readonly TodoSyncItem[],
	linkId: string,
	ok: boolean,
	detail?: string,
	stopped = false,
): string | undefined {
	const item = items.find((t) => t.linkId === linkId);
	if (!item || isTerminal(item.status)) return undefined;
	const why = detail ? ` (${detail.slice(0, 120)})` : "";
	const outcome = stopped ? "was stopped" : ok ? "finished" : "failed";
	const next = stopped
		? `It was stopped on purpose: cancel it (todo cancel id=${item.id}, with a reason), or start it again if you retry.`
		: ok
			? `If the work is done, complete it (todo complete id=${item.id}).`
			: `It failed: mark it failed (todo fail id=${item.id}, with a reason), or start it again if you retry.`;
	return `<system-reminder>Todo #${item.id} "${item.text.slice(0, 60)}" waited on a background event that ${outcome}${why}. ${next}</system-reminder>`;
}

/** True when the model closed its own items but no plan step advanced; false when no plan item exists. */
export function modelOwnClosedWithoutStepAdvance(
	before: readonly TodoSyncItem[],
	after: readonly TodoSyncItem[],
): boolean {
	if (!after.some((t) => t.planStep !== undefined)) return false;
	const was = new Map(before.map((t) => [t.id, t.status]));
	const closed = (t: TodoSyncItem, s: string | undefined) => s !== undefined && isOpen(s) && isTerminal(t.status);
	const own = after.some((t) => t.planStep === undefined && closed(t, was.get(t.id)));
	const advanced = after.some(
		(t) => t.planStep !== undefined && t.status === "completed" && was.get(t.id) !== "completed",
	);
	return own && !advanced;
}

/** True when a todo snapshot was written at or after `turnStartIndex` (mutations persist one; list and confirm do not). */
/** Structural: accepts session entries and the turn check's loose entries alike. */
export function listChangedSince(
	entries: readonly { type?: unknown; customType?: unknown }[],
	turnStartIndex: number,
): boolean {
	return entries.slice(turnStartIndex).some((e) => e.type === "custom" && e.customType === "nycode:todo");
}
