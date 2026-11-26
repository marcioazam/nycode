/**
 * Subagent display formatters: the pure helpers that turn a run's messages and usage
 * into the strings the subagent tool renders. No process spawning, no nycode API, no state,
 * so they render the same way for the live tool and for tests.
 */

import * as os from "node:os";
import type { Message } from "@nycode/ai";
import type { Theme } from "../../../modes/interactive/theme/theme.ts";

export function formatTokens(count: number): string {
	if (count < 1000) return count.toString();
	if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
	if (count < 1000000) return `${Math.round(count / 1000)}k`;
	return `${(count / 1000000).toFixed(1)}M`;
}

export function formatUsageStats(
	usage: {
		input: number;
		output: number;
		cacheRead: number;
		cacheWrite: number;
		cost: number;
		contextTokens?: number;
		turns?: number;
	},
	model?: string,
): string {
	const parts: string[] = [];
	if (usage.turns) parts.push(`${usage.turns} turn${usage.turns > 1 ? "s" : ""}`);
	if (usage.input) parts.push(`↑${formatTokens(usage.input)}`);
	if (usage.output) parts.push(`↓${formatTokens(usage.output)}`);
	if (usage.cacheRead) parts.push(`R${formatTokens(usage.cacheRead)}`);
	if (usage.cacheWrite) parts.push(`W${formatTokens(usage.cacheWrite)}`);
	if (usage.cost) parts.push(`$${usage.cost.toFixed(4)}`);
	if (usage.contextTokens && usage.contextTokens > 0) {
		parts.push(`ctx:${formatTokens(usage.contextTokens)}`);
	}
	if (model) parts.push(model);
	return parts.join(" ");
}

function shortenPath(p: string): string {
	const home = os.homedir();
	return p.startsWith(home) ? `~${p.slice(home.length)}` : p;
}

type ToolCallFormatter = (args: Record<string, unknown>, themeFg: Theme["fg"]) => string;

function formatBashCall(args: Record<string, unknown>, themeFg: Theme["fg"]): string {
	const command = (args.command as string) || "...";
	const preview = command.length > 60 ? `${command.slice(0, 60)}...` : command;
	return themeFg("muted", "$ ") + themeFg("toolOutput", preview);
}

function formatReadCall(args: Record<string, unknown>, themeFg: Theme["fg"]): string {
	const rawPath = (args.file_path || args.path || "...") as string;
	const filePath = shortenPath(rawPath);
	const offset = args.offset as number | undefined;
	const limit = args.limit as number | undefined;
	let text = themeFg("accent", filePath);
	if (offset !== undefined || limit !== undefined) {
		const startLine = offset ?? 1;
		const endLine = limit !== undefined ? startLine + limit - 1 : "";
		const rangeSuffix = endLine ? `-${endLine}` : "";
		text += themeFg("warning", `:${startLine}${rangeSuffix}`);
	}
	return themeFg("muted", "read ") + text;
}

function formatWriteCall(args: Record<string, unknown>, themeFg: Theme["fg"]): string {
	const rawPath = (args.file_path || args.path || "...") as string;
	const filePath = shortenPath(rawPath);
	const content = (args.content || "") as string;
	const lines = content.split("\n").length;
	let text = themeFg("muted", "write ") + themeFg("accent", filePath);
	if (lines > 1) text += themeFg("dim", ` (${lines} lines)`);
	return text;
}

function formatEditCall(args: Record<string, unknown>, themeFg: Theme["fg"]): string {
	const rawPath = (args.file_path || args.path || "...") as string;
	return themeFg("muted", "edit ") + themeFg("accent", shortenPath(rawPath));
}

function formatLsCall(args: Record<string, unknown>, themeFg: Theme["fg"]): string {
	const rawPath = (args.path || ".") as string;
	return themeFg("muted", "ls ") + themeFg("accent", shortenPath(rawPath));
}

function formatFindCall(args: Record<string, unknown>, themeFg: Theme["fg"]): string {
	const pattern = (args.pattern || "*") as string;
	const rawPath = (args.path || ".") as string;
	return themeFg("muted", "find ") + themeFg("accent", pattern) + themeFg("dim", ` in ${shortenPath(rawPath)}`);
}

function formatGrepCall(args: Record<string, unknown>, themeFg: Theme["fg"]): string {
	const pattern = (args.pattern || "") as string;
	const rawPath = (args.path || ".") as string;
	return themeFg("muted", "grep ") + themeFg("accent", `/${pattern}/`) + themeFg("dim", ` in ${shortenPath(rawPath)}`);
}

// A Map, not an object literal: a tool named after an Object.prototype key
// (constructor, toString) must fall through to the generic preview.
const TOOL_CALL_FORMATTERS = new Map<string, ToolCallFormatter>([
	["bash", formatBashCall],
	["read", formatReadCall],
	["write", formatWriteCall],
	["edit", formatEditCall],
	["ls", formatLsCall],
	["find", formatFindCall],
	["grep", formatGrepCall],
]);

export function formatToolCall(toolName: string, args: Record<string, unknown>, themeFg: Theme["fg"]): string {
	const formatter = TOOL_CALL_FORMATTERS.get(toolName);
	if (formatter) return formatter(args, themeFg);
	const argsStr = JSON.stringify(args);
	const preview = argsStr.length > 50 ? `${argsStr.slice(0, 50)}...` : argsStr;
	return themeFg("accent", toolName) + themeFg("dim", ` ${preview}`);
}

export function getFinalOutput(messages: Message[]): string {
	for (let i = messages.length - 1; i >= 0; i--) {
		const msg = messages[i];
		if (msg.role === "assistant") {
			// The complete text of the last assistant message: a message can carry more than one
			// text part, and taking only the first diverged from the background parser.
			const parts = msg.content.filter((part) => part.type === "text").map((part) => part.text);
			if (parts.length > 0) return parts.join("\n");
		}
	}
	return "";
}

export type DisplayItem =
	| { type: "text"; text: string }
	| { type: "toolCall"; name: string; args: Record<string, unknown> };

export function getDisplayItems(messages: Message[]): DisplayItem[] {
	const items: DisplayItem[] = [];
	for (const msg of messages) {
		if (msg.role === "assistant") {
			for (const part of msg.content) {
				if (part.type === "text") items.push({ type: "text", text: part.text });
				else if (part.type === "toolCall") items.push({ type: "toolCall", name: part.name, args: part.arguments });
			}
		}
	}
	return items;
}

/** One tool call of a capped run's tail, its arguments pre-rendered as compact one-line JSON. */
export interface CappedAction {
	name: string;
	args: string;
}

/** Bounds on the capped-run summary: the newest 10 tool calls, one line each, ~2 KB total. */
const PARTIAL_ACTIONS_MAX = 10;
const PARTIAL_ARGS_CHARS = 200;
const PARTIAL_LINE_CHARS = 160;
const PARTIAL_SUMMARY_CHARS = 2048;

/** The call's arguments as a single line of JSON, pre-capped so a streaming consumer
 * (the background parser) can retain the tail without holding whole tool calls. */
export function compactArgsLine(args: Record<string, unknown>): string {
	let json = "{}";
	try {
		json = JSON.stringify(args) ?? "{}";
	} catch {
		// unstringifiable input renders as {}
	}
	return json.length > PARTIAL_ARGS_CHARS ? `${json.slice(0, PARTIAL_ARGS_CHARS)}...` : json;
}

/** The newest tool calls of a run's messages (newest last) and whether the last
 * assistant text predates them — in which case the output the parent reads says
 * nothing about what the run was doing when the cap hit. */
export function tailCappedActions(
	messages: Message[],
	limit = PARTIAL_ACTIONS_MAX,
): { actions: CappedAction[]; lastTextBeforeActions: boolean } {
	const items = getDisplayItems(messages);
	const calls: CappedAction[] = [];
	let lastText = -1;
	let lastCall = -1;
	items.forEach((item, index) => {
		if (item.type === "text") lastText = index;
		else {
			lastCall = index;
			calls.push({ name: item.name, args: compactArgsLine(item.args) });
		}
	});
	return {
		actions: calls.slice(-limit),
		lastTextBeforeActions: lastText !== -1 && lastCall !== -1 && lastText < lastCall,
	};
}

/** The "last actions" block of a maxTurns-capped run's partial note: plain text for the
 * parent model (no theme colors), bounded at ~2 KB. Empty when the run made no tool calls. */
export function buildCappedRunSummary(
	actions: ReadonlyArray<CappedAction>,
	opts: { lastTextBeforeActions: boolean; transcriptPath?: string },
): string {
	const lines: string[] = [];
	if (actions.length > 0) {
		lines.push("Last actions before the cap (newest last):");
		for (const action of actions.slice(-PARTIAL_ACTIONS_MAX)) {
			const line = `- ${action.name} ${action.args}`;
			lines.push(line.length > PARTIAL_LINE_CHARS ? `${line.slice(0, PARTIAL_LINE_CHARS - 3)}...` : line);
		}
		if (opts.lastTextBeforeActions) lines.push("The last assistant text was written before these calls.");
	}
	if (opts.transcriptPath) lines.push(`Transcript saved to ${opts.transcriptPath}`);
	const out = lines.join("\n");
	return out.length > PARTIAL_SUMMARY_CHARS ? out.slice(0, PARTIAL_SUMMARY_CHARS) : out;
}
