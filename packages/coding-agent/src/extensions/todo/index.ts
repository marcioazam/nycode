/**
 * Todo Extension - Claude Code style todo tracking
 *
 * This extension:
 * - Registers a `todo` tool for the LLM (add, start, complete, delete, clear, list)
 * - Registers a `/todos` command for users to view the list
 * - Publishes the list on the `nycode:todos` event; the Plan section draws it, the chat does not
 *
 * Todos move through a status machine: pending -> in_progress -> completed, or failed / blocked / cancelled
 * (each with an optional reason). `confirm` changes nothing; the todo.sync turn check sees the call and lets the turn end.
 * Exactly one todo is in_progress at a time; `start` moves any other
 * in_progress todo back to pending. An optional activeForm label (present
 * continuous, e.g. "Writing tests") is shown while a todo is in_progress.
 *
 * Mutations persist copied snapshots in branch-local custom session entries,
 * including calls nested inside other tools. Legacy tool result details still
 * replay on older branches. The same replay runs on session_start, session_tree,
 * and session_compact, so the list survives compaction without external files.
 */

import { matchesKey, Text, truncateToWidth } from "@nycode/tui";
import { type Static, Type } from "typebox";
import type { ExtensionAPI, ExtensionContext } from "../../core/extensions/types.ts";
import type { SessionEntry } from "../../core/session-manager.ts";
import type { Theme } from "../../modes/interactive/theme/theme.ts";
import {
	type ExternalFinish,
	isPlanStepsEvent,
	isTodoExternalEvent,
	PLAN_STEPS_CHANNEL,
	type PlanStepsEvent,
	TODO_EXTERNAL_CHANNEL,
	TODO_STEP_DONE_CHANNEL,
	TODO_TURN_STATE_CHANNEL,
	type TodoStatus,
	type TodoTurnStateRequest,
} from "../_shared/events/plan-mode-state.ts";
import { stringEnum } from "../_shared/model/string-enum.ts";
import { setTodoWidgetMode, TODO_WIDGET_MODES, todoWidgetMode } from "../_shared/ui/todo-widget.ts";
import { registerExternal } from "./external.ts";
import { reconcilePlan } from "./plan-link.ts";
import { readTodoSyncEnabled, registerStaleReminder } from "./stale-reminder.ts";
import { isTerminal, toStatus } from "./status.ts";

type TodoAction = "add" | "start" | "complete" | "fail" | "block" | "cancel" | "confirm" | "delete" | "clear" | "list";
/** Actions that close or park an item, and the status each one sets. */
const CLOSING: Partial<Record<TodoAction, TodoStatus>> = { fail: "failed", block: "blocked", cancel: "cancelled" };

export interface Todo {
	id: number;
	text: string;
	status: TodoStatus;
	activeForm?: string;
	/** Why it failed, is blocked or was cancelled. */
	reason?: string;
	/** Etapa do plano em execução que o item espelha (todo/plan-link.ts). */
	planStep?: number;
	/** Background event the item waits for (todo.sync). */
	linkId?: string;
}

interface PersistedTodoState {
	todos?: LegacyTodo[];
	nextId: number;
}

interface TodoDetails {
	action: TodoAction;
	todos: Todo[];
	nextId: number;
	error?: string;
}

/** Pre-status-machine persisted shape (`done` boolean) still replays. */
export interface LegacyTodo {
	id: number;
	text: string;
	status?: string;
	activeForm?: string;
	done?: boolean;
	reason?: string;
	planStep?: number;
	linkId?: string;
}

const TodoParams = Type.Object({
	action: stringEnum([
		"add",
		"start",
		"complete",
		"fail",
		"block",
		"cancel",
		"confirm",
		"delete",
		"clear",
		"list",
	] as const),
	text: Type.Optional(Type.String({ description: "Todo text (for add)" })),
	activeForm: Type.Optional(
		Type.String({
			description: "Present-continuous label shown while in_progress, e.g. 'Writing tests' (for add/start)",
		}),
	),
	id: Type.Optional(Type.Number({ description: "Todo ID (for start, complete, fail, block, cancel, delete)" })),
	reason: Type.Optional(Type.String({ description: "Why (for fail, block, cancel)" })),
});

type TodoParamsType = Static<typeof TodoParams>;

const TOOL_NAME = "todo";
const STATE_ENTRY_TYPE = "nycode:todo";

/** Replays any persisted shape: legacy `done`, missing reason or an unknown status. */
export const normalizeTodo = (raw: LegacyTodo): Todo => {
	const extra = {
		...(typeof raw.planStep === "number" ? { planStep: raw.planStep } : {}),
		...(typeof raw.reason === "string" ? { reason: raw.reason } : {}),
		...(typeof raw.linkId === "string" ? { linkId: raw.linkId } : {}),
	};
	if (raw.status)
		return { id: raw.id, text: raw.text, status: toStatus(raw.status), activeForm: raw.activeForm, ...extra };
	return { id: raw.id, text: raw.text, status: raw.done ? "completed" : "pending", ...extra };
};

// Sem ícone de estado: o nome do estado, na cor dele, numa coluna de largura fixa.
const STATUS_NAME: Record<TodoStatus, [string, "success" | "accent" | "dim" | "error" | "warning"]> = {
	completed: ["concluída", "success"],
	in_progress: ["em andamento", "accent"],
	pending: ["pendente", "dim"],
	failed: ["falhou", "error"],
	blocked: ["bloqueada", "warning"],
	cancelled: ["cancelada", "dim"],
};
const STATUS_W = 12;
const statusName = (status: TodoStatus, theme: Theme, pad = true): string => {
	const [name, role] = STATUS_NAME[status];
	return theme.fg(role, pad ? name.padEnd(STATUS_W) : name);
};

const listMark = (status: TodoStatus): string => {
	if (status === "completed") return "[x]";
	if (status === "in_progress") return "[>]";
	if (status === "failed") return "[!]";
	if (status === "blocked") return "[~]";
	if (status === "cancelled") return "[-]";
	return "[ ]";
};

/** Plain-text list, shared by the list action and the non-terminal /todos path. */
const plainTodoList = (todos: Todo[]): string =>
	todos.length
		? todos.map((t) => `${listMark(t.status)} #${t.id}: ${t.text}${t.reason ? ` (${t.reason})` : ""}`).join("\n")
		: "No todos";

/**
 * UI component for the /todos command
 */
class TodoListComponent {
	private readonly todos: Todo[];
	private readonly theme: Theme;
	private readonly onClose: () => void;
	private cachedWidth?: number;
	private cachedLines?: string[];

	constructor(todos: Todo[], theme: Theme, onClose: () => void) {
		this.todos = todos;
		this.theme = theme;
		this.onClose = onClose;
	}

	handleInput(data: string): void {
		if (matchesKey(data, "escape") || matchesKey(data, "ctrl+c")) {
			this.onClose();
		}
	}

	render(width: number): string[] {
		if (this.cachedLines && this.cachedWidth === width) {
			return this.cachedLines;
		}

		const lines: string[] = [];
		const th = this.theme;

		lines.push("");
		const title = th.fg("accent", " Todos ");
		const headerLine =
			th.fg("borderMuted", "─".repeat(3)) + title + th.fg("borderMuted", "─".repeat(Math.max(0, width - 10)));
		lines.push(truncateToWidth(headerLine, width), "");

		if (this.todos.length === 0) {
			lines.push(truncateToWidth(`  ${th.fg("dim", "No todos yet. Ask the agent to add some!")}`, width));
		} else {
			const completed = this.todos.filter((t) => t.status === "completed").length;
			const failed = this.todos.filter((t) => t.status === "failed").length;
			const blocked = this.todos.filter((t) => t.status === "blocked").length;
			const completedLabel = `${completed}/${this.todos.length} completed${failed ? ` · ${failed} failed` : ""}${blocked ? ` · ${blocked} blocked` : ""}`;
			lines.push(truncateToWidth(`  ${th.fg("muted", completedLabel)}`, width), "");

			for (const todo of this.todos) {
				const glyph = statusName(todo.status, th);
				const id = th.fg("accent", `#${todo.id}`);
				const text = isTerminal(todo.status) ? th.fg("dim", todo.text) : th.fg("text", todo.text);
				let line = `  ${glyph} ${id} ${text}`;
				if (todo.reason) line += ` ${th.fg("dim", `(${todo.reason})`)}`;
				if (todo.status === "in_progress" && todo.activeForm) {
					const activeFormLabel = `(${todo.activeForm})`;
					line += ` ${th.fg("dim", activeFormLabel)}`;
				}
				lines.push(truncateToWidth(line, width));
			}
		}

		lines.push("", truncateToWidth(`  ${th.fg("dim", "Press Escape to close")}`, width), "");

		this.cachedWidth = width;
		this.cachedLines = lines;
		return lines;
	}

	invalidate(): void {
		this.cachedWidth = undefined;
		this.cachedLines = undefined;
	}
}

// nycode core's ExtensionRunner throws this exact phrase from an invalidated ctx
// proxy after session replacement/reload. Match the stable substring so
// genuine replay bugs still propagate instead of being silently swallowed.
const isStaleCtxError = (e: unknown): boolean => /stale after session replacement/.test(String(e));

const LIST_RESULT_PREVIEW = 5;

const renderTodoListResult = (todoList: Todo[], expanded: boolean, theme: Theme): Text => {
	if (todoList.length === 0) {
		return new Text(theme.fg("dim", "No todos"), 0, 0);
	}
	let listText = theme.fg("muted", `${todoList.length} todo(s):`);
	const display = expanded ? todoList : todoList.slice(0, LIST_RESULT_PREVIEW);
	for (const t of display) {
		const idLabel = `#${t.id}`;
		const itemText = isTerminal(t.status) ? theme.fg("dim", t.text) : theme.fg("muted", t.text);
		listText += `\n${statusName(t.status, theme)} ${theme.fg("accent", idLabel)} ${itemText}`;
	}
	if (!expanded && todoList.length > LIST_RESULT_PREVIEW) {
		const moreLabel = `... ${todoList.length - LIST_RESULT_PREVIEW} more`;
		listText += `\n${theme.fg("dim", moreLabel)}`;
	}
	return new Text(listText, 0, 0);
};

/** Read provider snapshots, allowing legacy direct results until the first snapshot. */
const persistedTodoDetails = (entry: SessionEntry, includeLegacy: boolean): PersistedTodoState | undefined => {
	if (entry.type === "custom" && entry.customType === STATE_ENTRY_TYPE)
		return entry.data as PersistedTodoState | undefined;
	if (!includeLegacy || entry.type !== "message") return undefined;
	const message = entry.message;
	if (message.role !== "toolResult" || message.toolName !== TOOL_NAME) return undefined;
	return message.details as PersistedTodoState | undefined;
};

/** Register the branch-local Todo provider and viewer. */
export default function todoExtension(nycode: ExtensionAPI) {
	const setStaleItems = registerStaleReminder(nycode);
	registerExternal(nycode);
	// In-memory state (reconstructed from session on load)
	let todos: Todo[] = [];
	let nextId = 1;
	let finished: ExternalFinish[] = [];
	/** Todos go to the Plan section (plan-mode/index.ts listens); the chat draws no todo widget. */
	const refresh = () => {
		const shown = todos.map((t) => ({
			id: t.id,
			text: t.status === "in_progress" ? (t.activeForm ?? t.text) : t.text,
			status: t.status,
			...(t.reason ? { reason: t.reason } : {}),
		}));
		// Itens ligados ao plano andam sozinhos com as etapas: o lembrete de lista parada não cobra por eles.
		setStaleItems(shown.filter((_t, i) => todos[i]?.planStep === undefined));
		nycode.events.emit("nycode:todos", shown);
	};

	/** Último estado do plano desta sessão; reaplicado depois de cada replay, que reconstrói a lista do zero. */
	let plan: PlanStepsEvent | undefined;
	let session: string | undefined;
	const sessionOf = (ctx: ExtensionContext): string | undefined =>
		(ctx.sessionManager as { getSessionId?: () => string }).getSessionId?.();
	/** Aplica o plano à lista; grava e publica só quando algo mudou. */
	const applyPlan = (persist: boolean): void => {
		if (!plan) return;
		const r = reconcilePlan(todos, nextId, plan);
		if (!r.changed) return;
		todos = r.todos;
		nextId = r.nextId;
		if (persist) nycode.appendEntry(STATE_ENTRY_TYPE, { todos: snapshot(), nextId });
		refresh();
	};
	nycode.events.on(PLAN_STEPS_CHANNEL, (data) => {
		if (!isPlanStepsEvent(data)) return;
		if (data.session && session && data.session !== session) return; // outra sessão (RPC reaproveita a instância)
		plan = data;
		applyPlan(true);
		if (!data.executing) plan = undefined; // os itens ligados já saíram; um replay posterior não os traz de volta
	});

	/**
	 * Reconstruct state from session entries.
	 * Provider snapshots supersede legacy results, whose completion order can
	 * differ from mutation order. Commit only after a full scan so a stale ctx
	 * leaves the current state intact.
	 */
	const reconstructState = (ctx: ExtensionContext) => {
		let replayTodos: Todo[] = [];
		let replayNextId = 1;
		let hasProviderSnapshot = false;

		for (const entry of ctx.sessionManager.getBranch()) {
			const details = persistedTodoDetails(entry, !hasProviderSnapshot);
			// nycode persists a failed tool call as `details: {}`, which is truthy: a rejected
			// or blocked call would otherwise throw here and break replay for the rest of
			// the session, losing the list on every resume, fork and compaction.
			if (Array.isArray(details?.todos)) {
				replayTodos = details.todos.map(normalizeTodo);
				replayNextId = details.nextId;
				if (entry.type === "custom") hasProviderSnapshot = true;
			}
		}

		todos = replayTodos;
		nextId = replayNextId;
	};

	/**
	 * Replay for session_tree/session_compact. Auto-compaction races session
	 * disposal: nycode core can emit these with an already-invalidated ctx proxy
	 * whose getters throw the stale error. The replacement session's
	 * session_start replays state, so keep current state on a stale ctx.
	 */
	const replayAndRefresh = (ctx: ExtensionContext) => {
		try {
			reconstructState(ctx);
		} catch (e) {
			if (!isStaleCtxError(e)) throw e;
		}
		refresh();
		applyPlan(true);
	};

	nycode.on("session_start", (_event, ctx) => {
		// The /todos-widget choice lasts until reload, new session, resume or fork, as upstream.
		setTodoWidgetMode("full");
		finished = [];
		const next = sessionOf(ctx);
		if (next !== session) plan = plan?.session === next ? plan : undefined;
		session = next;
		reconstructState(ctx);
		refresh();
		applyPlan(true);
	});
	nycode.on("session_tree", (_event, ctx) => replayAndRefresh(ctx));
	nycode.on("session_compact", (_event, ctx) => replayAndRefresh(ctx));

	// Reads live state at render time; never replay the branch here (the
	// branch is stale until message_end runs after tool_execution_end).
	nycode.on("tool_execution_end", (event) => {
		if (event.toolName !== TOOL_NAME || event.isError) return;
		refresh();
	});

	// todo.sync: background events add "aguardando X" items and report their end; the turn check reads the state.
	nycode.events.on(TODO_TURN_STATE_CHANNEL, (data) => {
		(data as TodoTurnStateRequest).reply({
			items: snapshot(),
			takeFinished: () => finished.splice(0),
		});
	});
	nycode.events.on(TODO_EXTERNAL_CHANNEL, (data) => {
		if (!isTodoExternalEvent(data) || !readTodoSyncEnabled(nycode)) return;
		if (data.op === "finish") {
			if (todos.some((t) => t.linkId === data.linkId))
				finished.push({ linkId: data.linkId, ok: data.ok, detail: data.detail, stopped: data.stopped });
			return;
		}
		if (todos.some((t) => t.linkId === data.linkId)) return; // idempotent per linkId
		todos.push({ id: nextId++, text: `aguardando ${data.text}`, status: "pending", linkId: data.linkId });
		nycode.appendEntry(STATE_ENTRY_TYPE, { todos: snapshot(), nextId });
		refresh();
	});

	const toolMessage = (text: string, details: TodoDetails) => ({
		content: [{ type: "text" as const, text }],
		details,
	});
	// nycode keeps a result's details by reference in the live session, and start/complete
	// mutate the todo objects in place, so each result carries its own copies: without
	// them a rewind replays, and the TUI re-renders, today's statuses on earlier calls.
	const snapshot = () => todos.map((t) => ({ ...t }));
	/** Persist successful mutations before direct or nested execution returns. */
	const ok = (action: TodoAction, text: string) => {
		if (action !== "list") nycode.appendEntry(STATE_ENTRY_TYPE, { todos: snapshot(), nextId });
		return toolMessage(text, { action, todos: snapshot(), nextId });
	};
	const fail = (action: TodoAction, error: string) =>
		toolMessage(`Error: ${error}`, { action, todos: snapshot(), nextId, error });

	const handleAdd = (params: TodoParamsType) => {
		if (!params.text) return fail("add", "text required for add");
		const newTodo: Todo = { id: nextId++, text: params.text, status: "pending", activeForm: params.activeForm };
		todos.push(newTodo);
		return ok("add", `Added todo #${newTodo.id}: ${newTodo.text}`);
	};

	const handleStart = (params: TodoParamsType) => {
		if (params.id === undefined) return fail("start", "id required for start");
		const todo = todos.find((t) => t.id === params.id);
		if (!todo) return fail("start", `#${params.id} not found`);
		const demoted = todos.filter((t) => t.status === "in_progress" && t.id !== todo.id);
		for (const other of demoted) other.status = "pending";
		todo.status = "in_progress";
		delete todo.reason;
		if (params.activeForm) todo.activeForm = params.activeForm;
		let text = `Started #${todo.id}: ${todo.text}`;
		if (demoted.length > 0) {
			const movedIds = demoted.map((t) => `#${t.id}`).join(", ");
			text += ` (moved ${movedIds} back to pending)`;
		}
		return ok("start", text);
	};

	const handleComplete = (params: TodoParamsType) => {
		if (params.id === undefined) return fail("complete", "id required for complete");
		const todo = todos.find((t) => t.id === params.id);
		if (!todo) return fail("complete", `#${params.id} not found`);
		todo.status = "completed";
		delete todo.reason;
		const result = ok("complete", `Completed #${todo.id}: ${todo.text}`);
		// Item ligado: conclui a etapa no plano também (mesmo efeito de [DONE:n]); o plano devolve a próxima etapa.
		if (todo.planStep !== undefined) nycode.events.emit(TODO_STEP_DONE_CHANNEL, { step: todo.planStep });
		return result;
	};

	/** fail / block / cancel: park or close an item with a reason. A linked plan item only changes here; the plan step stays open. */
	const handleClosing = (action: TodoAction, params: TodoParamsType) => {
		if (params.id === undefined) return fail(action, `id required for ${action}`);
		const todo = todos.find((t) => t.id === params.id);
		if (!todo) return fail(action, `#${params.id} not found`);
		const status = CLOSING[action] as TodoStatus;
		if (isTerminal(todo.status) || todo.status === status)
			return fail(action, `#${todo.id} is already ${todo.status}`);
		todo.status = status;
		todo.reason = params.reason?.trim() || undefined;
		return ok(action, `Marked #${todo.id} ${status}: ${todo.text}${todo.reason ? ` (${todo.reason})` : ""}`);
	};

	const handleConfirm = () => {
		return toolMessage("Confirmed: the list is accurate as it is.", { action: "confirm", todos: snapshot(), nextId });
	};

	const handleDelete = (params: TodoParamsType) => {
		if (params.id === undefined) return fail("delete", "id required for delete");
		const index = todos.findIndex((t) => t.id === params.id);
		if (index === -1) return fail("delete", `#${params.id} not found`);
		const step = todos[index].planStep;
		if (step !== undefined)
			return fail(
				"delete",
				`#${params.id} is plan step ${step}; it leaves when the plan ends (complete it instead)`,
			);
		const [removed] = todos.splice(index, 1);
		return ok("delete", `Deleted #${removed.id}: ${removed.text}`);
	};

	const handleClear = () => {
		// Itens das etapas do plano em execução ficam: só o fim do plano os tira.
		const kept = todos.filter((t) => t.planStep !== undefined);
		const count = todos.length - kept.length;
		todos = kept;
		if (kept.length === 0) nextId = 1;
		return ok("clear", `Cleared ${count} todos${kept.length ? ` (kept ${kept.length} plan steps)` : ""}`);
	};

	const handleList = () => ok("list", plainTodoList(todos));

	// Register the todo tool for the LLM
	nycode.registerTool({
		name: TOOL_NAME,
		label: "Todo",
		description:
			"Manage a todo list for tracking multi-step progress. Actions: add (text, optional activeForm), start (id, mark in_progress), complete (id), fail (id, reason), block (id, reason), cancel (id, reason), confirm (the list is accurate; changes nothing), delete (id), clear, list. Status machine: pending -> in_progress -> completed, or failed / blocked / cancelled. Exactly one todo is in_progress at a time; start moves any other in_progress todo back to pending.",
		promptSnippet: "Manage a todo list to plan and track multi-step work",
		promptGuidelines: [
			"Use the todo tool to create todos for any multi-step work (3+ steps) or when the user gives you a list of tasks. Skip it for single trivial tasks and purely conversational requests.",
			"Keep exactly one todo in_progress at a time: mark a todo in_progress (todo action start) BEFORE beginning work on it, passing activeForm as a present-continuous label (e.g. 'Writing tests').",
			"Mark a todo completed (todo action complete) IMMEDIATELY after finishing it; never batch completions or leave finished work in_progress.",
		],
		parameters: TodoParams,

		async execute(
			_toolCallId,
			params,
			_signal,
			_onUpdate,
			_ctx,
		) /* NOSONAR typescript:S7503 - nycode types a tool execute as returning a Promise */ {
			switch (params.action) {
				case "add":
					return handleAdd(params);
				case "start":
					return handleStart(params);
				case "complete":
					return handleComplete(params);
				case "fail":
				case "block":
				case "cancel":
					return handleClosing(params.action, params);
				case "confirm":
					return handleConfirm();
				case "delete":
					return handleDelete(params);
				case "clear":
					return handleClear();
				case "list":
					return handleList();
				default:
					return fail("list", `unknown action: ${params.action}`);
			}
		},

		renderCall(args, theme, _context) {
			let text = theme.fg("toolTitle", theme.bold("todo ")) + theme.fg("muted", args.action);
			if (args.id !== undefined) {
				const idLabel = `#${args.id}`;
				text += ` ${theme.fg("accent", idLabel)}`;
			}
			if (args.text) {
				const textLabel = `"${args.text}"`;
				text += ` ${theme.fg("dim", textLabel)}`;
			}
			if (args.activeForm) {
				const activeFormLabel = `(${args.activeForm})`;
				text += ` ${theme.fg("dim", activeFormLabel)}`;
			}
			return new Text(text, 0, 0);
		},

		renderResult(result, { expanded }, theme, _context) {
			const details = result.details as TodoDetails | undefined;
			if (!details) {
				const text = result.content[0];
				return new Text(text?.type === "text" ? text.text : "", 0, 0);
			}

			if (details.error) {
				return new Text(theme.fg("error", `Error: ${details.error}`), 0, 0);
			}

			if (details.action === "list") {
				return renderTodoListResult(details.todos, expanded, theme);
			}

			const text = result.content[0];
			const msg = text?.type === "text" ? text.text : "";
			const nome =
				details.action === "start"
					? "in_progress"
					: details.action === "complete"
						? "completed"
						: CLOSING[details.action];
			const tag = nome ? `${statusName(nome, theme, false)}${theme.fg("dim", " · ")}` : "";
			return new Text(tag + theme.fg("muted", msg), 0, 0);
		},
	});

	nycode.registerCommand("todos-widget", {
		description: "Set the todo list display: off, compact, or full (default)",
		getArgumentCompletions: (prefix) => {
			const modes = TODO_WIDGET_MODES.filter((mode) => mode.startsWith(prefix));
			return modes.length ? modes.map((mode) => ({ value: mode, label: mode })) : null;
		},
		handler: async (args, ctx) => {
			if (ctx.mode !== "tui") {
				ctx.ui.notify("/todos-widget needs the terminal UI; /todos lists the todos", "warning");
				return;
			}
			const arg = args.trim();
			const usage = "Usage: /todos-widget off|compact|full";
			if (!arg) return ctx.ui.notify(`Todo widget: ${todoWidgetMode()}. ${usage}`, "info");
			const mode = TODO_WIDGET_MODES.find((value) => value === arg);
			if (!mode) return ctx.ui.notify(usage, "warning");
			setTodoWidgetMode(mode);
			ctx.ui.notify(`Todo widget: ${mode}`, "info");
		},
	});

	// Register the /todos command for users
	nycode.registerCommand("todos", {
		description: "Show all todos on the current branch",
		handler: async (_args, ctx) => {
			if (!ctx.hasUI) {
				ctx.ui.notify("/todos requires interactive mode", "error");
				return;
			}

			// ui.custom() is terminal-only: with a UI but no terminal (RPC mode) it
			// resolves undefined without showing anything, so notify the plain list.
			if (ctx.mode !== "tui") {
				ctx.ui.notify(plainTodoList(todos), "info");
				return;
			}

			await ctx.ui.custom<void>((_tui, theme, _kb, done) => {
				return new TodoListComponent(todos, theme, () => done());
			});
		},
	});
}
