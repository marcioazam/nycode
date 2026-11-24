/**
 * InteractiveMode methods, applied to InteractiveMode.prototype in interactive-mode.ts; `this` is the mode.
 */

/**
 * Interactive mode for the coding agent.
 * Handles TUI rendering and user interaction, delegating business logic to AgentSession.
 */

import type { AgentMessage } from "@nycode/agent-core";
import type { AssistantMessage } from "@nycode/ai/compat";
import { Spacer, TuiAltScreen } from "@nycode/tui";
import { CONFIG_DIR_NAME } from "../../../config.ts";
import { parseSkillBlock } from "../../../core/agent-session.ts";
import { CACHE_TTL_MS, type CacheMiss, collectCacheMisses, detectCacheMiss } from "../../../core/cache-stats.ts";
import { formatCacheWarmingUsage } from "../../../core/cache-warmer.ts";
import { type SessionEntry, sessionEntryToContextMessages, type UsageEntry } from "../../../core/session-manager.ts";
import type { TruncationResult } from "../../../core/tools/truncate.ts";
import { hasTrustRequiringProjectResources } from "../../../core/trust-manager.ts";
import * as avisos from "../avisos/index.ts";
import { AssistantMessageComponent } from "../components/assistant-message.ts";
import { BashExecutionComponent } from "../components/bash-execution.ts";
import { BranchSummaryMessageComponent } from "../components/branch-summary-message.ts";
import { CompactionSummaryMessageComponent } from "../components/compaction-summary-message.ts";
import { CustomMessageComponent } from "../components/custom-message.ts";
import { formatTokens } from "../components/footer.ts";
import { SkillInvocationMessageComponent } from "../components/skill-invocation-message.ts";
import { ThemedText } from "../components/themed-text.ts";
import { ToolExecutionComponent } from "../components/tool-execution.ts";
import { UserMessageComponent } from "../components/user-message.ts";
import type { InteractiveMode } from "../interactive-mode.ts";
import {
	type CompactionCostNotice,
	getDroppedReasoning,
	isCompactionCostNotice,
	isCustomSessionEntry,
	isUsageSessionEntry,
	type RenderSessionItem,
} from "../mode/helpers.ts";
import { theme } from "../theme/theme.ts";

/** Chat rendering: messages, session items, usage and cache notices. */
export const chatMethods = {
	addMessageToChat(
		this: InteractiveMode,
		message: AgentMessage,
		options?: { populateHistory?: boolean; messageId?: string; timestamp?: string },
	): void {
		switch (message.role) {
			case "bashExecution": {
				const component = new BashExecutionComponent(
					message.command,
					this.ui,
					message.excludeFromContext,
					this.outputPad,
				);
				if (message.output) {
					component.appendOutput(message.output);
				}
				component.setComplete(
					message.exitCode,
					message.cancelled,
					message.truncated ? ({ truncated: true } as TruncationResult) : undefined,
					message.fullOutputPath,
				);
				this.chatContainer.addChild(component);
				break;
			}
			case "custom": {
				if (message.display) {
					const renderer = this.session.extensionRunner.getMessageRenderer(message.customType);
					const component = new CustomMessageComponent(
						message,
						renderer,
						this.getMarkdownThemeWithSettings(),
						this.outputPad,
						this.getMarkdownTransformers(),
						options?.messageId,
						options?.timestamp,
					);
					component.setExpanded(this.toolOutputExpanded);
					this.chatContainer.addChild(component);
				}
				break;
			}
			case "compactionSummary": {
				this.chatContainer.addChild(new Spacer(1));
				const component = new CompactionSummaryMessageComponent(
					message,
					this.getMarkdownThemeWithSettings(),
					this.outputPad,
					this.getMarkdownTransformers(),
					options?.messageId,
					options?.timestamp,
				);
				component.setExpanded(this.toolOutputExpanded);
				this.chatContainer.addChild(component);
				break;
			}
			case "branchSummary": {
				this.chatContainer.addChild(new Spacer(1));
				const component = new BranchSummaryMessageComponent(
					message,
					this.getMarkdownThemeWithSettings(),
					this.outputPad,
					this.getMarkdownTransformers(),
					options?.messageId,
					options?.timestamp,
				);
				component.setExpanded(this.toolOutputExpanded);
				this.chatContainer.addChild(component);
				break;
			}
			case "system":
				break;
			case "user": {
				const textContent = this.getUserMessageText(message);
				if (textContent) {
					if (this.chatContainer.children.length > 0) {
						this.chatContainer.addChild(new Spacer(1));
					}
					const skillBlock = parseSkillBlock(textContent);
					if (skillBlock) {
						// Render skill block (collapsible)
						const component = new SkillInvocationMessageComponent(
							skillBlock,
							this.getMarkdownThemeWithSettings(),
							this.outputPad,
							this.getMarkdownTransformers(),
							options?.messageId,
							options?.timestamp,
						);
						component.setExpanded(this.toolOutputExpanded);
						this.chatContainer.addChild(component);
						// Render user message separately if present
						if (skillBlock.userMessage) {
							this.chatContainer.addChild(new Spacer(1));
							const userComponent = new UserMessageComponent(
								skillBlock.userMessage,
								this.getMarkdownThemeWithSettings(),
								this.outputPad,
								this.getMarkdownTransformers(),
								options?.messageId,
								options?.timestamp,
							);
							this.chatContainer.addChild(userComponent);
						}
					} else {
						const userComponent = new UserMessageComponent(
							textContent,
							this.getMarkdownThemeWithSettings(),
							this.outputPad,
							this.getMarkdownTransformers(),
							options?.messageId,
							options?.timestamp,
						);
						this.chatContainer.addChild(userComponent);
					}
					if (options?.populateHistory) {
						this.editor.addToHistory?.(textContent);
					}
				}
				break;
			}
			case "assistant": {
				const assistantComponent = new AssistantMessageComponent(
					message,
					this.hideThinkingBlock,
					this.getMarkdownThemeWithSettings(),
					this.hiddenThinkingLabel,
					this.outputPad,
					this.getMarkdownTransformers(),
					options?.messageId,
					options?.timestamp,
				);
				this.chatContainer.addChild(assistantComponent);
				break;
			}
			case "toolResult": {
				// Tool results are rendered inline with tool calls, handled separately
				break;
			}
			default: {
				const _exhaustive: never = message;
			}
		}
	},

	renderSessionItems(
		this: InteractiveMode,
		items: readonly RenderSessionItem[],
		messageMeta?: Map<AgentMessage, { id: string; timestamp: string }>,
		options: { updateFooter?: boolean; populateHistory?: boolean } = {},
	): void {
		this.pendingTools.clear();
		const renderedPendingTools = new Map<string, ToolExecutionComponent>();
		// Cache misses are not persisted, unlike successful cache-warming usage.
		// Re-derive them and inject them after the assistant messages that paid for them.
		const cacheMisses = this.settingsManager.getShowCacheMissNotices()
			? collectCacheMisses(this.sessionManager.getEntries(), this.session.modelRuntime)
			: new Map<AssistantMessage, CacheMiss>();

		if (options.updateFooter) {
			this.footer.invalidate();
			this.updateEditorBorderColor();
		}

		for (const item of items) {
			if (isCustomSessionEntry(item)) {
				this.addCustomEntryToChat(item);
				continue;
			}
			if (isUsageSessionEntry(item)) {
				this.addCacheWarmingUsage(item);
				continue;
			}
			if (isCompactionCostNotice(item)) {
				this.addCompactionCostNotice(item);
				continue;
			}

			const message = item;
			// Assistant messages need special handling for tool calls
			if (message.role === "assistant") {
				const meta = messageMeta?.get(message);
				this.addMessageToChat(message, {
					messageId: meta?.id,
					timestamp: meta?.timestamp,
				});
				// Render tool call components
				for (const content of message.content) {
					if (content.type === "toolCall") {
						const component = new ToolExecutionComponent(
							content.name,
							content.id,
							content.arguments,
							{
								showImages: this.settingsManager.getShowImages(),
								imageWidthCells: this.settingsManager.getImageWidthCells(),
								outputPad: this.outputPad,
							},
							this.getRegisteredToolDefinition(content.name),
							this.ui,
							this.sessionManager.getCwd(),
						);
						component.setExpanded(this.toolOutputExpanded);
						this.chatContainer.addChild(component);

						if (message.stopReason === "aborted" || message.stopReason === "error") {
							let errorMessage: string;
							if (message.stopReason === "aborted") {
								const retryAttempt = this.session.retryAttempt;
								errorMessage =
									retryAttempt > 0
										? `Aborted after ${retryAttempt} retry attempt${retryAttempt > 1 ? "s" : ""}`
										: "Operation aborted";
							} else {
								errorMessage = message.errorMessage || "Error";
							}
							component.updateResult({ content: [{ type: "text", text: errorMessage }], isError: true });
						} else {
							renderedPendingTools.set(content.id, component);
						}
					}
				}
				if (message.stopReason !== "aborted" && message.stopReason !== "error") {
					const miss = cacheMisses.get(message);
					if (miss) this.addCacheMissNotice(miss);
				}
			} else if (message.role === "toolResult") {
				// Match tool results to pending tool components
				const component = renderedPendingTools.get(message.toolCallId);
				if (component) {
					component.updateResult(message);
					renderedPendingTools.delete(message.toolCallId);
				}
			} else {
				// All other messages use standard rendering
				const meta = messageMeta?.get(message);
				this.addMessageToChat(message, {
					...options,
					messageId: meta?.id,
					timestamp: meta?.timestamp,
				});
			}
		}

		for (const [toolCallId, component] of renderedPendingTools) {
			this.pendingTools.set(toolCallId, component);
		}
		this.ui.requestRender();
	},

	/**
	 * Render session entries to chat. Used for initial load and rebuild after compaction.
	 * @param entries Compaction-aware session entries to render
	 * @param options.updateFooter Update footer state
	 * @param options.populateHistory Add user messages to editor history
	 */
	renderSessionEntries(
		this: InteractiveMode,
		entries: SessionEntry[],
		options: { updateFooter?: boolean; populateHistory?: boolean } = {},
	): void {
		// Selection coordinates point into the transcript being replaced (#9311).
		if (this.renderer instanceof TuiAltScreen) this.renderer.resetTextSelection();
		const messageMeta = new Map<AgentMessage, { id: string; timestamp: string }>();
		const items = entries.flatMap((entry): RenderSessionItem[] => {
			if (entry.type === "custom" || (entry.type === "usage" && entry.kind === "cache_warm")) {
				return [entry];
			}
			const messages = sessionEntryToContextMessages(entry);
			for (const msg of messages) {
				messageMeta.set(msg, { id: entry.id, timestamp: entry.timestamp });
			}
			if ((entry.type === "compaction" || entry.type === "branch_summary") && entry.usage && messages.length > 0) {
				return [...messages, { type: "compaction_cost", kind: entry.type, usage: entry.usage }];
			}
			return messages;
		});
		this.renderSessionItems(items, messageMeta, options);
	},

	addCacheWarmingUsage(this: InteractiveMode, entry: UsageEntry): void {
		if (!this.settingsManager.getShowCacheMissNotices()) return;
		// Back-to-back warms collapse into one line with the cumulative cost.
		const previous = this.cacheWarmingNotice;
		if (previous && this.chatContainer.children.at(-1) === previous.component && previous.note === entry.note) {
			previous.total.cost += entry.usage.cost.total;
			previous.component.invalidate();
			return;
		}
		const total = { cost: entry.usage.cost.total };
		const component = new ThemedText(() => theme.fg("dim", formatCacheWarmingUsage(total.cost, entry.note)), 1, 0);
		this.cacheWarmingNotice = { component, total, note: entry.note };
		this.chatContainer.addChild(new Spacer(1));
		this.chatContainer.addChild(component);
	},

	/**
	 * Render billing usage for a compaction or branch summary. The notice is derived
	 * from persisted summary usage and is not stored as a separate session entry.
	 */
	addCompactionCostNotice(this: InteractiveMode, notice: CompactionCostNotice): void {
		if (!this.settingsManager.getShowCacheMissNotices()) return;

		const { usage } = notice;
		const tokens = usage.input + usage.output + usage.cacheRead + usage.cacheWrite;
		const cost = usage.cost.total >= 0.01 ? ` (~$${usage.cost.total.toFixed(2)})` : "";
		const label = notice.kind === "compaction" ? "Compaction" : "Branch summary";
		this.chatContainer.addChild(new Spacer(1));
		this.chatContainer.addChild(
			new ThemedText(() => theme.fg("warning", `${label}: ${formatTokens(tokens)} tokens billed${cost}`), 1, 0),
		);
	},

	maybeShowThinkingDropNotice(this: InteractiveMode, message: AssistantMessage): void {
		if (!this.settingsManager.getShowCacheMissNotices()) return;

		const dropped = getDroppedReasoning(message);
		if (!dropped) return;

		// Providers report a withheld block again on every later request that replays it, so only
		// a count above the previous response's means new losses. message_end reaches the UI before
		// the current message is persisted, so the branch's last assistant message is the previous response.
		const branch = this.sessionManager.getBranch();
		for (let i = branch.length - 1; i >= 0; i--) {
			const entry = branch[i];
			if (entry.type === "message" && entry.message.role === "assistant") {
				const previous = getDroppedReasoning(entry.message);
				if (previous?.diagnostic === dropped.diagnostic && dropped.count <= previous.count) return;
				break;
			}
		}

		const { provider, noun: nouns } = dropped.diagnostic;
		const noun = nouns[dropped.count === 1 ? 0 : 1];
		const reasons = dropped.reasons.length > 0 ? `: ${dropped.reasons.join(", ")}` : "";
		this.chatContainer.addChild(new Spacer(1));
		this.chatContainer.addChild(
			new ThemedText(
				() => theme.fg("warning", `${provider} dropped ${dropped.count} ${noun}${reasons} (details in session)`),
				1,
				0,
			),
		);
	},

	/**
	 * Show a transcript notice when a completed assistant message paid for a
	 * significant cache miss. Only states observable facts: the miss itself,
	 * a model switch, or an idle gap past the cache TTL.
	 */
	maybeShowCacheMissNotice(this: InteractiveMode, message: AssistantMessage): void {
		if (!this.settingsManager.getShowCacheMissNotices()) return;

		// Entries don't contain `message` yet: message_end fires before persistence.
		const miss = detectCacheMiss(this.sessionManager.getEntries(), message, this.session.modelRuntime);
		if (miss) this.addCacheMissNotice(miss);
	},

	addCacheMissNotice(this: InteractiveMode, miss: CacheMiss): void {
		if (miss.missedTokens < 20_000 && miss.missedCost < 0.1) return;

		const cost = miss.missedCost >= 0.01 ? ` (~$${miss.missedCost.toFixed(2)})` : "";
		const reBilled = `${formatTokens(miss.missedTokens)} tokens re-billed${cost}`;
		let label = "Cache miss";
		if (miss.modelChanged) {
			label = "Cache miss after model switch";
		} else if (miss.idleMs >= CACHE_TTL_MS) {
			label = `Cache miss after ${Math.round(miss.idleMs / 60_000)}m idle`;
		}
		this.chatContainer.addChild(new Spacer(1));
		this.chatContainer.addChild(new ThemedText(() => theme.fg("warning", `${label}: ${reBilled}`), 1, 0));
	},

	renderInitialMessages(this: InteractiveMode): void {
		const entries = this.sessionManager.buildContextEntries();
		this.renderSessionEntries(entries, {
			updateFooter: true,
			populateHistory: true,
		});
		this.renderProjectTrustWarningIfNeeded();

		// Show compaction info if session was compacted
		const allEntries = this.sessionManager.getEntries();
		const compactionCount = allEntries.filter((e) => e.type === "compaction").length;
		if (compactionCount > 0) {
			const times = compactionCount === 1 ? "1 time" : `${compactionCount} times`;
			if (!avisos.compactada(this, compactionCount)) this.showStatus(`Session compacted ${times}`); // nycode: K17
		}
	},

	renderProjectTrustWarningIfNeeded(this: InteractiveMode): void {
		if (this.settingsManager.isProjectTrusted() || !hasTrustRequiringProjectResources(this.sessionManager.getCwd())) {
			return;
		}

		if (this.chatContainer.children.length > 0) {
			this.chatContainer.addChild(new Spacer(1));
		}
		this.chatContainer.addChild(
			avisos.confianca(this) ?? // nycode: K17
				new ThemedText(
					() =>
						theme.fg(
							"warning",
							`This project is not trusted. Project ${CONFIG_DIR_NAME} resources and packages are ignored. Use /trust to save a trust decision, then restart nycode.`,
						),
					1,
					0,
				),
		);
	},

	async getUserInput(this: InteractiveMode): Promise<string> {
		const queuedInput = this.pendingUserInputs.shift();
		if (queuedInput !== undefined) {
			return queuedInput;
		}

		return new Promise((resolve) => {
			this.onInputCallback = (text: string) => {
				this.onInputCallback = undefined;
				resolve(text);
			};
		});
	},

	rebuildChatFromMessages(this: InteractiveMode): void {
		this.chatContainer.clear();
		this.renderSessionEntries(this.sessionManager.buildContextEntries());
	},
};
