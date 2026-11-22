// The `graph-context` internal hook: repository context at SessionStart and SubagentStart (code graph state and
// knowledge pointers), as additionalContext. Port of hooks/graph_context.py; it never blocks a session.
import { statSync } from "node:fs";
import { durable, findIndex, indexStatus, mainCheckout, runGit, startIndex, under } from "./codegraph.ts";
import { report } from "./diag.ts";
import { knowledge, MAX_CONTEXT } from "./knowledge.ts";
import type { InternalHookResult } from "./registry.ts";

const SILENT: InternalHookResult = { code: 0, stdout: "", stderr: "" };

function freshness(status: Record<string, unknown> | undefined): [string, number | undefined, string] {
	if (!status || !(status.initialized ?? true)) return ["unknown", undefined, "?"];
	const changes = (status.pendingChanges ?? {}) as Record<string, unknown>;
	const pending = ["added", "modified", "removed"].reduce((sum, k) => sum + (Number(changes[k]) || 0), 0);
	const index = (status.index ?? {}) as Record<string, unknown>;
	const complete = (index.state ?? "complete") === "complete" && !index.reindexRecommended;
	const state = pending === 0 && complete ? "fresh" : "stale";
	return [state, Math.min(pending, 99_999), String(status.lastIndexed || "?").slice(0, 16)];
}

function workspaceWarning(cwd: string): string {
	// A failed Git probe is unverified, not proof that a repository is absent.
	let display = JSON.stringify(cwd);
	if (display.length > 260) display = JSON.stringify(`${cwd.slice(0, 20)}…${cwd.slice(-20)}`);
	return (
		`Workspace: cwd=${display}; Git worktree unavailable (unverified). ` +
		"nycode's subagent has no isolation field: parallel writers need disjoint files or run sequentially; " +
		"never initialize Git/dummy hooks."
	);
}

async function graphLine(cwd: string, root: string, event: string): Promise<string> {
	const [lookupRoot, isWorktree] = await mainCheckout(root);
	const start = !isWorktree || !under(cwd, root) ? cwd : lookupRoot;
	const indexRoot = findIndex(start, under(start, lookupRoot) ? lookupRoot : root);
	if (!indexRoot) {
		const spawned = event === "SessionStart" && (await durable(root)) ? startIndex(root) : undefined;
		if (spawned) {
			const what =
				spawned[0] === "started" ? "indexing started in background" : "indexing already running or failed recently";
			return (
				`Graph: ${root} has no codegraph index yet; ${what} (\`codegraph init\`, log ${spawned[1]}); ` +
				`use rg/fdfind until \`codegraph status ${root}\` is complete, then mcp__codegraph__* with projectPath=${root}.`
			);
		}
		return (
			`Graph: ${root} has no codegraph index; use rg/fdfind and report degraded coverage. ` +
			"Auto-indexing covers main checkouts under ~/source; elsewhere run `codegraph init` only when the " +
			"task asks for it (never home, worktrees, /tmp or from a subagent)."
		);
	}
	const [state, pending, indexed] = freshness(await indexStatus(indexRoot));
	const parts = [
		`Graph: codegraph root=${indexRoot} index=${state} (indexed ${indexed}, ${pending === undefined ? "pending=?" : `pending=${pending}`})`,
	];
	if (isWorktree) parts.push("worktree: graph reflects the main checkout, verify edited files literally");
	parts.push(
		"For structural questions load mcp__codegraph__* via tool_search and pass " +
			`projectPath=${indexRoot}; codegraph_status before negative or exhaustive claims; ` +
			"stale/unknown => confirm with rg. The MCP watcher keeps it fresh; never init/sync from a subagent.",
	);
	return parts.join("; ").slice(0, MAX_CONTEXT);
}

async function buildContext(cwd: string, event: string): Promise<string> {
	const root = await runGit(cwd, "rev-parse", "--show-toplevel");
	if (!root) return workspaceWarning(cwd);
	const graph = await graphLine(cwd, root, event);
	const kb = event === "SessionStart" ? knowledge(root) : undefined;
	return kb ? `${graph}\n${kb}` : graph;
}

const isDirectory = (p: string): boolean => {
	try {
		return statSync(p).isDirectory();
	} catch {
		return false;
	}
};

/** The hook: the payload names the event and the cwd; the result carries additionalContext as a command hook prints it. */
export async function graphContext(payload: Record<string, unknown>): Promise<InternalHookResult> {
	try {
		const event = payload.hook_event_name;
		const cwd = typeof payload.cwd === "string" && payload.cwd ? payload.cwd : process.cwd();
		if ((event !== "SessionStart" && event !== "SubagentStart") || !isDirectory(cwd)) return SILENT;
		const context = await buildContext(cwd, event);
		if (!context) return SILENT;
		const hookSpecificOutput = { hookEventName: event, additionalContext: context };
		return { code: 0, stdout: JSON.stringify({ hookSpecificOutput }), stderr: "" };
	} catch (error) {
		// Context hooks never block a session.
		const name = error instanceof Error ? error.constructor.name : "Error";
		const message = error instanceof Error ? error.message : String(error);
		report(
			13,
			"graph_context",
			"erro-interno",
			`Graph: indisponível (${name}: ${message})`,
			error instanceof Error ? (error.stack ?? "") : "",
		);
		return SILENT;
	}
}
