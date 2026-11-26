/** The optional footer stats line (`footer.stats`): tokens, cache, cost, context and model of the session. */

import type { ExtensionContext } from "../../core/extensions/types.ts";
import { addUsageToTotals, createUsageTotals } from "../../core/usage-totals.ts";
import { formatTokens } from "../../modes/interactive/components/footer.ts";

/** Same sources as the built-in footer: every usage-bearing session entry, the context estimate and the active model. */
export function statsLine(ctx: ExtensionContext): string {
	const totals = createUsageTotals();
	for (const entry of ctx.sessionManager.getEntries()) {
		if (entry.type === "usage") addUsageToTotals(totals, entry.usage);
		else if (entry.type === "message" && entry.message.role === "assistant")
			addUsageToTotals(totals, entry.message.usage);
		else if (entry.type === "message" && entry.message.role === "toolResult" && entry.message.usage)
			addUsageToTotals(totals, entry.message.usage);
		else if ((entry.type === "branch_summary" || entry.type === "compaction") && entry.usage)
			addUsageToTotals(totals, entry.usage);
	}
	const parts: string[] = [];
	if (totals.input) parts.push(`↑${formatTokens(totals.input)}`);
	if (totals.output) parts.push(`↓${formatTokens(totals.output)}`);
	if (totals.cacheRead) parts.push(`R${formatTokens(totals.cacheRead)}`);
	if (totals.cacheWrite) parts.push(`W${formatTokens(totals.cacheWrite)}`);
	if (totals.cost) parts.push(`$${totals.cost.toFixed(3)}`);
	const usage = ctx.getContextUsage();
	if (usage)
		parts.push(`${usage.percent === null ? "?" : usage.percent.toFixed(1)}%/${formatTokens(usage.contextWindow)}`);
	if (ctx.model) parts.push(ctx.model.id);
	return parts.join(" ");
}
