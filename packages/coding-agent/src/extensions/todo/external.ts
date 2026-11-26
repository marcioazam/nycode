/**
 * Producer side of the todo items for background events (todo.sync only). `run` and `subagent` call these helpers;
 * the todo extension consumes TODO_EXTERNAL_CHANNEL (todo/index.ts) and owns the items, so there is no consumer here.
 */
import type { ExtensionAPI } from "../../core/extensions/types.ts";
import { readTodoTurnState, TODO_EXTERNAL_CHANNEL } from "../_shared/events/plan-mode-state.ts";
import { readTodoSyncEnabled } from "./stale-reminder.ts";
import { externalFinishReminder } from "./status.ts";

/** What the producers need from the extension API: the bus and the (trust-resolved) settings. */
type Api = Pick<ExtensionAPI, "events" | "getSettings">;

/** Link ids already announced per bus: a second finish for the same id yields no second reminder. */
const announced = new WeakMap<object, Set<string>>();

/** Asks the todo extension for an "aguardando <text>" item linked to `linkId` (one item per id). */
export function announceExternalStart(api: Api, linkId: string, text: string): void {
	if (!readTodoSyncEnabled(api)) return;
	api.events.emit(TODO_EXTERNAL_CHANNEL, { op: "add", linkId, text });
}

/** Reports the end of the event; returns the one-line reminder for the finish message, or undefined. */
export function announceExternalFinish(
	api: Api,
	linkId: string,
	ok: boolean,
	detail?: string,
	stopped = false,
): string | undefined {
	if (!readTodoSyncEnabled(api)) return undefined;
	const events = api.events;
	const seen = announced.get(events) ?? new Set<string>();
	announced.set(events, seen);
	if (seen.has(linkId)) return undefined;
	events.emit(TODO_EXTERNAL_CHANNEL, { op: "finish", linkId, ok, detail, stopped });
	const state = readTodoTurnState(events);
	if (!state?.takeFinished().some((f) => f.linkId === linkId)) return undefined;
	seen.add(linkId);
	return externalFinishReminder(state.items, linkId, ok, detail, stopped);
}

/** The consumer lives in todo/index.ts; kept as the registration point todo/index.ts calls. */
export function registerExternal(_nycode: ExtensionAPI): void {}
