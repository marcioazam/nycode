/** How the todo tool's list shows in the Plan section, chosen by `/todos-widget`: `full` (the table, the default),
 * `compact` (one line: counts and the active task) or `off`. Process-wide; the todo extension resets it per session. */

export const TODO_WIDGET_MODES = ["off", "compact", "full"] as const;
export type TodoWidgetMode = (typeof TODO_WIDGET_MODES)[number];

let mode: TodoWidgetMode = "full";
const listeners = new Set<() => void>();

export const todoWidgetMode = (): TodoWidgetMode => mode;

export function setTodoWidgetMode(next: TodoWidgetMode): void {
	if (next === mode) return;
	mode = next;
	for (const listener of listeners) listener();
}

/** Called after every change; returns the unsubscribe. */
export function onTodoWidgetMode(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}
