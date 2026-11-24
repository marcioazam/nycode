/**
 * InteractiveMode methods, applied to InteractiveMode.prototype in interactive-mode.ts; `this` is the mode.
 */

/**
 * Interactive mode for the coding agent.
 * Handles TUI rendering and user interaction, delegating business logic to AgentSession.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { Keybinding } from "@nycode/tui";
import { type Component, Container, Markdown, Spacer, TuiAltScreen, visibleWidth } from "@nycode/tui";
import { getDebugLogPath } from "../../../config.ts";
import { SessionImportFileNotFoundError } from "../../../core/agent-session-runtime.ts";
import { computeCacheWaste } from "../../../core/cache-stats.ts";
import { formatCacheWarmingStatus } from "../../../core/cache-warmer.ts";
import type { UserBashEventResult } from "../../../core/extensions/index.ts";
import type { AppKeybinding } from "../../../core/keybindings.ts";
import { MissingSessionCwdError } from "../../../core/session-cwd.ts";
import type { TruncationResult } from "../../../core/tools/truncate.ts";
import { getUsageCostBreakdown } from "../../../core/usage-totals.ts";
import { getChangelogPath, normalizeChangelogLinks, parseChangelog } from "../../../utils/changelog.ts";
import { copyToClipboard } from "../../../utils/clipboard.ts";
import * as avisos from "../avisos/index.ts";
import { reportBug } from "../bug-report.ts";
import { ArminComponent } from "../components/armin.ts";
import { BashExecutionComponent } from "../components/bash-execution.ts";
import { DynamicBorder } from "../components/dynamic-border.ts";
import { EarendilAnnouncementComponent } from "../components/earendil-announcement.ts";
import { playArmin3d } from "../components/easter-egg-3d.lazy.ts";
import { formatTokens } from "../components/footer.ts";
import { formatKeyText, keyDisplayText } from "../components/keybinding-hints.ts";
import { ThemedText } from "../components/themed-text.ts";
import type { InteractiveMode } from "../interactive-mode.ts";
import { isExpandable } from "../mode/helpers.ts";
import { shareSession } from "../session-share.ts";
import { setRegisteredThemes, theme } from "../theme/theme.ts";

/** Slash command handlers. */
export const commandMethods = {
	// =========================================================================
	// Command handlers
	// =========================================================================

	async handleReloadCommand(this: InteractiveMode): Promise<void> {
		if (this.session.isStreaming) {
			this.showWarning("Wait for the current response to finish before reloading.");
			return;
		}
		if (this.session.isCompacting) {
			this.showWarning("Wait for compaction to finish before reloading.");
			return;
		}

		this.resetExtensionUI();

		const reloadBox = new Container();
		const borderColor = (s: string) => theme.fg("border", s);
		reloadBox.addChild(new DynamicBorder(borderColor));
		reloadBox.addChild(new Spacer(1));
		reloadBox.addChild(
			avisos.recarregando(this) ?? // nycode: K17
				new ThemedText(
					() =>
						theme.fg("muted", "Reloading keybindings, extensions, skills, prompts, themes, and context files..."),
					1,
					0,
				),
		);
		reloadBox.addChild(new Spacer(1));
		reloadBox.addChild(new DynamicBorder(borderColor));

		const previousEditor = this.editor;
		this.editorContainer.clear();
		this.editorContainer.addChild(reloadBox);
		this.ui.setFocus(reloadBox);
		this.ui.requestRender(true);
		await new Promise((resolve) => process.nextTick(resolve));

		const dismissReloadBox = (editor: Component) => {
			this.editorContainer.clear();
			this.editorContainer.addChild(editor);
			this.ui.setFocus(editor);
			this.ui.requestRender();
		};

		let chatRestoredBeforeSessionStart = false;
		let reloadBoxDismissed = false;
		const restoreChatBeforeSessionStart = () => {
			if (chatRestoredBeforeSessionStart) {
				return;
			}
			this.hideThinkingBlock = this.settingsManager.getHideThinkingBlock();
			this.outputPad = this.settingsManager.getOutputPad();
			this.rebuildChatFromMessages();
			chatRestoredBeforeSessionStart = true;
		};

		try {
			await this.session.reload({ beforeSessionStart: restoreChatBeforeSessionStart });
			restoreChatBeforeSessionStart();
			this.keybindings.reload();
			const activeHeader = this.customHeader ?? this.builtInHeader;
			if (isExpandable(activeHeader)) {
				activeHeader.setExpanded(this.toolOutputExpanded);
			}
			setRegisteredThemes(this.session.resourceLoader.getThemes().themes);
			this.applyRuntimeSettings();
			this.themeController.applyFromSettings();
			this.setupAutocompleteProvider();
			const runner = this.session.extensionRunner;
			this.setupExtensionShortcuts(runner);
			this.showLoadedResources({
				force: false,
				showDiagnosticsWhenQuiet: true,
			});
			const savedImplicitProjectTrust = this.maybeSaveImplicitProjectTrustAfterReload();
			const modelsJsonError = this.session.modelRuntime.getError();
			if (modelsJsonError) {
				this.showError(`models.json error: ${modelsJsonError}`);
			}
			if (!avisos.recarregado(this, savedImplicitProjectTrust))
				// nycode: K17
				this.showStatus(
					savedImplicitProjectTrust
						? "Reloaded keybindings, extensions, skills, prompts, themes, and context files; saved project trust"
						: "Reloaded keybindings, extensions, skills, prompts, themes, and context files",
				);
			dismissReloadBox(this.editor as Component);
			reloadBoxDismissed = true;
		} catch (error) {
			if (!reloadBoxDismissed) {
				dismissReloadBox(previousEditor as Component);
			}
			this.showError(`Reload failed: ${error instanceof Error ? error.message : String(error)}`);
		}
	},

	async handleExportCommand(this: InteractiveMode, text: string): Promise<void> {
		const outputPath = this.getPathCommandArgument(text, "/export");

		try {
			if (outputPath?.endsWith(".jsonl")) {
				const filePath = this.session.exportToJsonl(outputPath);
				this.showStatus(`Session exported to: ${filePath}`);
			} else {
				const filePath = await this.session.exportToHtml(outputPath, {
					themeName: theme.name,
				});
				this.showStatus(`Session exported to: ${filePath}`);
			}
		} catch (error: unknown) {
			this.showError(`Failed to export session: ${error instanceof Error ? error.message : "Unknown error"}`);
		}
	},

	getPathCommandArgument(this: InteractiveMode, text: string, command: "/export" | "/import"): string | undefined {
		if (text === command) {
			return undefined;
		}
		if (!text.startsWith(`${command} `)) {
			return undefined;
		}

		const argsString = text.slice(command.length + 1).trimStart();
		if (!argsString) {
			return undefined;
		}

		const firstChar = argsString[0];
		if (firstChar === '"' || firstChar === "'") {
			const closingQuoteIndex = argsString.indexOf(firstChar, 1);
			if (closingQuoteIndex < 0) {
				return undefined;
			}
			return argsString.slice(1, closingQuoteIndex);
		}

		const firstWhitespaceIndex = argsString.search(/\s/);
		if (firstWhitespaceIndex < 0) {
			return argsString;
		}
		return argsString.slice(0, firstWhitespaceIndex);
	},

	async handleImportCommand(this: InteractiveMode, text: string): Promise<void> {
		const inputPath = this.getPathCommandArgument(text, "/import");
		if (!inputPath) {
			this.showError("Usage: /import <path.jsonl>");
			return;
		}

		const confirmed = await this.showExtensionConfirm("Import session", `Replace current session with ${inputPath}?`);
		if (!confirmed) {
			this.showStatus("Import cancelled");
			return;
		}

		try {
			this.clearStatusIndicator();
			const result = await this.runtimeHost.importFromJsonl(inputPath);
			if (result.cancelled) {
				this.showStatus("Import cancelled");
				return;
			}
			this.showStatus(`Session imported from: ${inputPath}`);
		} catch (error: unknown) {
			if (error instanceof MissingSessionCwdError) {
				switch (await this.promptForMissingSessionCwd(error)) {
					case "continue": {
						const result = await this.runtimeHost.importFromJsonl(inputPath, error.issue.fallbackCwd);
						this.showStatus(result.cancelled ? "Import cancelled" : `Session imported from: ${inputPath}`);
						return;
					}
					case "fork": {
						const result = await this.switchToForkedSession(inputPath, error.issue.fallbackCwd);
						if (result.cancelled) this.showStatus("Import cancelled");
						return;
					}
					case undefined:
						this.showStatus("Import cancelled");
						return;
				}
			}
			if (error instanceof SessionImportFileNotFoundError) {
				this.showError(`Failed to import session: ${error.message}`);
				return;
			}
			await this.handleFatalRuntimeError("Failed to import session", error);
		}
	},

	async handleShareCommand(this: InteractiveMode): Promise<void> {
		await shareSession({
			session: this.session,
			ui: this.ui,
			editorContainer: this.editorContainer,
			editor: this.editor,
			showStatus: (message) => this.showStatus(message),
			showError: (message) => this.showError(message),
		});
	},

	async handleBugCommand(this: InteractiveMode, hint: string | undefined): Promise<void> {
		await reportBug(
			{
				session: this.session,
				ui: this.ui,
				editorContainer: this.editorContainer,
				editor: this.editor,
				keybindings: this.keybindings,
				showStatus: (message) => this.showStatus(message),
				showError: (message) => this.showError(message),
			},
			hint,
		);
	},

	async handleCopyCommand(
		this: InteractiveMode,
		options: { flashConfirmation?: boolean; preferSelection?: boolean } = {},
	): Promise<void> {
		if (
			options.preferSelection &&
			this.ui instanceof TuiAltScreen &&
			!this.ui.getCopyOnSelect() &&
			this.ui.hasActiveSelection()
		) {
			await this.ui.copyActiveSelectionToClipboard();
			return;
		}

		const text = this.session.getLastAssistantText();
		if (!text) {
			this.showError("No agent messages to copy yet.");
			return;
		}

		try {
			await copyToClipboard(text);
			if (options.flashConfirmation && this.ui instanceof TuiAltScreen) {
				this.ui.flash("Copied!");
			} else {
				this.showStatus("Copied last agent message to clipboard");
			}
		} catch (error) {
			this.showError(error instanceof Error ? error.message : String(error));
		}
	},

	handleNameCommand(this: InteractiveMode, text: string): void {
		const name = text.replace(/^\/name\s*/, "").trim();
		if (!name) {
			const currentName = this.sessionManager.getSessionName();
			if (currentName) {
				this.chatContainer.addChild(new Spacer(1));
				this.chatContainer.addChild(new ThemedText(() => theme.fg("dim", `Session name: ${currentName}`), 1, 0));
			} else {
				this.showWarning("Usage: /name <name>");
			}
			this.ui.requestRender();
			return;
		}

		this.session.setSessionName(name);
		const sessionName = this.sessionManager.getSessionName();
		if (sessionName !== name) {
			this.showWarning(`Session name was normalized from ${JSON.stringify(name)} to ${JSON.stringify(sessionName)}`);
		}
		this.chatContainer.addChild(new Spacer(1));
		const displayName = sessionName ?? name;
		this.chatContainer.addChild(new ThemedText(() => theme.fg("dim", `Session name set: ${displayName}`), 1, 0));
		this.ui.requestRender();
	},

	handleSessionCommand(this: InteractiveMode): void {
		const stats = this.session.getSessionStats();
		const sessionName = this.sessionManager.getSessionName();
		const entries = this.sessionManager.getEntries();
		const cacheWaste = computeCacheWaste(entries, this.session.modelRuntime);

		// Cost/token totals per provider/model actually used (e.g. OpenRouter `auto`
		// resolves to a concrete responseModel). Usage without model attribution is
		// grouped separately so the breakdown reconciles with the session total.
		const usageBreakdown = getUsageCostBreakdown(entries);

		// Snapshot the stats; the text is built on demand so it follows theme changes.
		const cacheWarmingStatus = this.session.cacheWarmingStatus;
		const cacheWarmingMode = this.settingsManager.getCacheWarmingMode();
		const model = this.session.model;
		const selectedModelKey = `${model?.provider}/${model?.id}`;
		const renderInfo = (): string => {
			let info = `${theme.bold("Session Info")}\n\n`;
			if (sessionName) {
				info += `${theme.fg("dim", "Name:")} ${sessionName}\n`;
			}
			info += `${theme.fg("dim", "File:")} ${stats.sessionFile ?? "In-memory"}\n`;
			info += `${theme.fg("dim", "ID:")} ${stats.sessionId}\n\n`;
			info += `${theme.bold("Messages")}\n`;
			info += `${theme.fg("dim", "Total:")} ${stats.totalMessages}\n`;
			info += `${theme.fg("dim", "User:")} ${stats.userMessages}\n`;
			info += `${theme.fg("dim", "Assistant:")} ${stats.assistantMessages}\n`;
			info += `${theme.fg("dim", "Tools:")} ${stats.toolCalls} calls, ${stats.toolResults} results\n\n`;
			info += `${theme.bold("Tokens")}\n`;
			// "Input" is the full prompt volume. With cache activity, split it into
			// cached (served from cache) vs uncached (everything else) - the only
			// provider-independent split. Cache writes, where reported, are a detail
			// of the uncached portion.
			const { input, cacheRead, cacheWrite } = stats.tokens;
			const promptTokens = input + cacheRead + cacheWrite;
			info += `${theme.fg("dim", "Input:")} ${promptTokens.toLocaleString()}\n`;
			if (promptTokens > 0 && (cacheRead > 0 || cacheWrite > 0)) {
				const hitRate = theme.fg("dim", `(${((cacheRead / promptTokens) * 100).toFixed(1)}%)`);
				info += `  ${theme.fg("dim", "Cached:")} ${cacheRead.toLocaleString()} ${hitRate}\n`;
				const written =
					cacheWrite > 0 ? ` ${theme.fg("dim", `(${cacheWrite.toLocaleString()} written to cache)`)}` : "";
				info += `  ${theme.fg("dim", "Uncached:")} ${(input + cacheWrite).toLocaleString()}${written}\n`;
			}
			info += `${theme.fg("dim", "Output:")} ${stats.tokens.output.toLocaleString()}\n`;
			info += `${theme.fg("dim", "Total:")} ${stats.tokens.total.toLocaleString()}\n`;

			info += `\n${theme.bold("Cache Warming")}\n`;
			info += `${theme.fg("dim", "Mode:")} ${cacheWarmingMode}\n`;
			info += `${theme.fg("dim", "Status:")} ${cacheWarmingStatus ? formatCacheWarmingStatus(cacheWarmingStatus) : "Inactive (cache warming unavailable)"}\n`;
			const decision = cacheWarmingStatus?.decision;
			if (decision?.economicsAvailable) {
				info += `${theme.fg("dim", "Cache miss penalty:")} $${decision.missCost.toFixed(3)}\n`;
				info += `${theme.fg("dim", "Refresh cost:")} $${decision.warmCost.toFixed(3)}\n`;
			}

			if (stats.cost > 0 || cacheWaste.missedTokens > 0) {
				info += `\n${theme.bold("Cost")}\n`;
				info += `${theme.fg("dim", "Total:")} $${stats.cost.toFixed(3)}`;
				// A single entry repeats the total, unless it names a model other than the selected one.
				if (usageBreakdown.length > 1 || usageBreakdown[0]?.key !== selectedModelKey) {
					for (const entry of usageBreakdown) {
						info += `\n  ${theme.fg("dim", `${entry.key}:`)} $${entry.cost.toFixed(3)} ${theme.fg("dim", `(${formatTokens(entry.tokens)} tokens)`)}`;
					}
				}
				if (cacheWaste.missedTokens > 0) {
					const missLabel = cacheWaste.missCount === 1 ? "1 miss" : `${cacheWaste.missCount} misses`;
					const detail = `${cacheWaste.missedTokens.toLocaleString()} tokens, ${missLabel}`;
					info +=
						cacheWaste.missedCost >= 0.0001
							? `\n${theme.fg("dim", "Cache Re-billed:")} $${cacheWaste.missedCost.toFixed(3)} ${theme.fg("dim", `(${detail})`)}`
							: `\n${theme.fg("dim", "Cache Re-billed:")} ${detail}`;
				}
			}
			return info;
		};

		this.chatContainer.addChild(new Spacer(1));
		this.chatContainer.addChild(new ThemedText(renderInfo, 1, 0));
		this.ui.requestRender();
	},

	handleChangelogCommand(this: InteractiveMode): void {
		const changelogPath = getChangelogPath();
		const allEntries = parseChangelog(changelogPath);

		const changelogMarkdown =
			allEntries.length > 0
				? allEntries
						.reverse()
						.map((e) => normalizeChangelogLinks(e.content, e))
						.join("\n\n")
				: "No changelog entries found.";

		this.chatContainer.addChild(new Spacer(1));
		this.chatContainer.addChild(new DynamicBorder());
		this.chatContainer.addChild(new ThemedText(() => theme.bold(theme.fg("accent", "What's New")), 1, 0));
		this.chatContainer.addChild(new Spacer(1));
		this.chatContainer.addChild(this.createChangelogMarkdown(changelogMarkdown, 1, 1));
		this.chatContainer.addChild(new DynamicBorder());
		this.ui.requestRender();
	},

	/**
	 * Get capitalized display string for an app keybinding action.
	 */
	getAppKeyDisplay(this: InteractiveMode, action: AppKeybinding): string {
		return keyDisplayText(action);
	},

	/**
	 * Get capitalized display string for an editor keybinding action.
	 */
	getEditorKeyDisplay(this: InteractiveMode, action: Keybinding): string {
		return keyDisplayText(action);
	},

	handleHotkeysCommand(this: InteractiveMode): void {
		// Navigation keybindings
		const cursorUp = this.getEditorKeyDisplay("tui.editor.cursorUp");
		const cursorDown = this.getEditorKeyDisplay("tui.editor.cursorDown");
		const cursorLeft = this.getEditorKeyDisplay("tui.editor.cursorLeft");
		const cursorRight = this.getEditorKeyDisplay("tui.editor.cursorRight");
		const cursorWordLeft = this.getEditorKeyDisplay("tui.editor.cursorWordLeft");
		const cursorWordRight = this.getEditorKeyDisplay("tui.editor.cursorWordRight");
		const cursorLineStart = this.getEditorKeyDisplay("tui.editor.cursorLineStart");
		const cursorLineEnd = this.getEditorKeyDisplay("tui.editor.cursorLineEnd");
		const jumpForward = this.getEditorKeyDisplay("tui.editor.jumpForward");
		const jumpBackward = this.getEditorKeyDisplay("tui.editor.jumpBackward");
		const pageUp = this.getEditorKeyDisplay("tui.editor.pageUp");
		const pageDown = this.getEditorKeyDisplay("tui.editor.pageDown");

		// Editing keybindings
		const submit = this.getEditorKeyDisplay("tui.input.submit");
		const newLine = this.getEditorKeyDisplay("tui.input.newLine");
		const deleteWordBackward = this.getEditorKeyDisplay("tui.editor.deleteWordBackward");
		const deleteWordForward = this.getEditorKeyDisplay("tui.editor.deleteWordForward");
		const deleteToLineStart = this.getEditorKeyDisplay("tui.editor.deleteToLineStart");
		const deleteToLineEnd = this.getEditorKeyDisplay("tui.editor.deleteToLineEnd");
		const yank = this.getEditorKeyDisplay("tui.editor.yank");
		const yankPop = this.getEditorKeyDisplay("tui.editor.yankPop");
		const undo = this.getEditorKeyDisplay("tui.editor.undo");
		const tab = this.getEditorKeyDisplay("tui.input.tab");

		// App keybindings
		const interrupt = this.getAppKeyDisplay("app.interrupt");
		const clear = this.getAppKeyDisplay("app.clear");
		const exit = this.getAppKeyDisplay("app.exit");
		const suspend = this.getAppKeyDisplay("app.suspend");
		const cycleThinkingLevel = this.getAppKeyDisplay("app.thinking.cycle");
		const cycleModelForward = this.getAppKeyDisplay("app.model.cycleForward");
		const selectModel = this.getAppKeyDisplay("app.model.select");
		const expandTools = this.getAppKeyDisplay("app.tools.expand");
		const toggleThinking = this.getAppKeyDisplay("app.thinking.toggle");
		const externalEditor = this.getAppKeyDisplay("app.editor.external");
		const cycleModelBackward = this.getAppKeyDisplay("app.model.cycleBackward");
		const copyMessage = this.getAppKeyDisplay("app.message.copy");
		const followUp = this.getAppKeyDisplay("app.message.followUp");
		const sendNow = this.getAppKeyDisplay("app.message.sendNow");
		const sendNowChord = `${copyMessage} ${this.getAppKeyDisplay("app.message.sendNowChord")}`;
		const dequeue = this.getAppKeyDisplay("app.message.dequeue");
		const pasteImage = this.getAppKeyDisplay("app.clipboard.pasteImage");

		let hotkeys = `
**Navigation**
| Key | Action |
|-----|--------|
| \`${cursorUp}\` / \`${cursorDown}\` / \`${cursorLeft}\` / \`${cursorRight}\` | Move cursor / browse history |
| \`${cursorWordLeft}\` / \`${cursorWordRight}\` | Move by word |
| \`${cursorLineStart}\` | Start of line |
| \`${cursorLineEnd}\` | End of line |
| \`${jumpForward}\` | Jump forward to character |
| \`${jumpBackward}\` | Jump backward to character |
| \`${pageUp}\` / \`${pageDown}\` | Scroll by page |

**Editing**
| Key | Action |
|-----|--------|
| \`${submit}\` | Send message |
| \`${newLine}\` | New line${process.platform === "win32" ? " (Ctrl+Enter on Windows Terminal)" : ""} |
| \`${deleteWordBackward}\` | Delete word backwards |
| \`${deleteWordForward}\` | Delete word forwards |
| \`${deleteToLineStart}\` | Delete to start of line |
| \`${deleteToLineEnd}\` | Delete to end of line |
| \`${yank}\` | Paste the most-recently-deleted text |
| \`${yankPop}\` | Cycle through the deleted text after pasting |
| \`${undo}\` | Undo |

**Other**
| Key | Action |
|-----|--------|
| \`${tab}\` | Path completion / accept autocomplete |
| \`${interrupt}\` | Cancel autocomplete / abort streaming |
| \`${clear}\` | Clear editor (first) / exit (second) |
| \`${exit}\` | Exit (when editor is empty) |
| \`${suspend}\` | Suspend to background |
| \`${cycleThinkingLevel}\` | Cycle thinking level |
| \`${cycleModelForward}\` / \`${cycleModelBackward}\` | Cycle models |
| \`${selectModel}\` | Open model selector |
| \`${expandTools}\` | Toggle tool output expansion |
| \`${toggleThinking}\` | Toggle thinking block visibility |
| \`${externalEditor}\` | Edit message in external editor |
| \`${copyMessage}\` | Copy selection or last assistant message |
| \`${followUp}\` | Queue follow-up message |
| \`${sendNow}\` / \`${sendNowChord}\` | Abort active tool and send now |
| \`${dequeue}\` | Restore queued messages |
| \`${pasteImage}\` | Paste files on macOS, images, or text from clipboard |
| \`/\` | Slash commands |
| \`!\` | Run bash command |
| \`!!\` | Run bash command (excluded from context) |
`;

		// Add extension-registered shortcuts
		const extensionRunner = this.session.extensionRunner;
		const shortcuts = extensionRunner.getShortcuts(this.keybindings.getEffectiveConfig());
		if (shortcuts.size > 0) {
			hotkeys += `
**Extensions**
| Key | Action |
|-----|--------|
`;
			for (const [key, shortcut] of shortcuts) {
				const description = shortcut.description ?? shortcut.extensionPath;
				const keyDisplay = formatKeyText(key, { capitalize: true });
				hotkeys += `| \`${keyDisplay}\` | ${description} |\n`;
			}
		}

		this.chatContainer.addChild(new Spacer(1));
		this.chatContainer.addChild(new DynamicBorder());
		this.chatContainer.addChild(new ThemedText(() => theme.bold(theme.fg("accent", "Keyboard Shortcuts")), 1, 0));
		this.chatContainer.addChild(new Spacer(1));
		this.chatContainer.addChild(new Markdown(hotkeys.trim(), 1, 1, this.getMarkdownThemeWithSettings()));
		this.chatContainer.addChild(new DynamicBorder());
		this.ui.requestRender();
	},

	async handleClearCommand(this: InteractiveMode): Promise<void> {
		this.clearStatusIndicator();
		try {
			const result = await this.runtimeHost.newSession();
			if (result.cancelled) {
				return;
			}
			this.chatContainer.addChild(new Spacer(1));
			this.chatContainer.addChild(new ThemedText(() => theme.fg("accent", "✓ New session started"), 1, 1));
			this.ui.requestRender();
		} catch (error: unknown) {
			await this.handleFatalRuntimeError("Failed to create session", error);
		}
	},

	handleDebugCommand(this: InteractiveMode): void {
		const width = this.ui.terminal.columns;
		const height = this.ui.terminal.rows;
		const allLines = this.ui.render(width);

		const debugLogPath = getDebugLogPath();
		const debugData = [
			`Debug output at ${new Date().toISOString()}`,
			`Terminal: ${width}x${height}`,
			`Total lines: ${allLines.length}`,
			"",
			"=== All rendered lines with visible widths ===",
			...allLines.map((line, idx) => {
				const vw = visibleWidth(line);
				const escaped = JSON.stringify(line);
				return `[${idx}] (w=${vw}) ${escaped}`;
			}),
			"",
			"=== Agent messages (JSONL) ===",
			...this.session.messages.map((msg) => JSON.stringify(msg)),
			"",
		].join("\n");

		fs.mkdirSync(path.dirname(debugLogPath), { recursive: true });
		fs.writeFileSync(debugLogPath, debugData);

		this.chatContainer.addChild(new Spacer(1));
		this.chatContainer.addChild(
			new ThemedText(() => `${theme.fg("accent", "✓ Debug log written")}\n${theme.fg("muted", debugLogPath)}`, 1, 1),
		);
		this.ui.requestRender();
	},

	handleArminSaysHi(this: InteractiveMode): void {
		if (playArmin3d(this.renderer)) return;
		this.chatContainer.addChild(new Spacer(1));
		this.chatContainer.addChild(new ArminComponent(this.ui));
		this.ui.requestRender();
	},

	handleDementedDelves(this: InteractiveMode): void {
		this.chatContainer.addChild(new Spacer(1));
		this.chatContainer.addChild(new EarendilAnnouncementComponent());
		this.ui.requestRender();
	},

	async handleBashCommand(this: InteractiveMode, command: string, excludeFromContext = false): Promise<void> {
		const extensionRunner = this.session.extensionRunner;

		// Emit user_bash event to let extensions intercept
		let eventResult: UserBashEventResult | undefined;
		try {
			eventResult = await extensionRunner.emitUserBash({
				type: "user_bash",
				command,
				excludeFromContext,
				cwd: this.sessionManager.getCwd(),
			});
		} catch {
			// The extension runner already reported the error. Do not fall back to local execution.
			return;
		}

		// If extension returned a full result, use it directly
		if (eventResult?.result) {
			const result = eventResult.result;

			// Create UI component for display
			this.bashComponent = new BashExecutionComponent(command, this.ui, excludeFromContext, this.outputPad);
			this.bashComponent.setExpanded(this.toolOutputExpanded);
			if (this.session.isStreaming) {
				this.pendingMessagesContainer.addChild(this.bashComponent);
				this.pendingBashComponents.push(this.bashComponent);
			} else {
				this.chatContainer.addChild(this.bashComponent);
			}

			// Show output and complete
			if (result.output) {
				this.bashComponent.appendOutput(result.output);
			}
			this.bashComponent.setComplete(
				result.exitCode,
				result.cancelled,
				result.truncated ? ({ truncated: true, content: result.output } as TruncationResult) : undefined,
				result.fullOutputPath,
			);

			// Record the result in session
			this.session.recordBashResult(command, result, { excludeFromContext });
			this.bashComponent = undefined;
			this.ui.requestRender();
			return;
		}

		// Normal execution path (possibly with custom operations)
		const isDeferred = this.session.isStreaming;
		this.bashComponent = new BashExecutionComponent(command, this.ui, excludeFromContext, this.outputPad);
		this.bashComponent.setExpanded(this.toolOutputExpanded);

		if (isDeferred) {
			// Show in pending area when agent is streaming
			this.pendingMessagesContainer.addChild(this.bashComponent);
			this.pendingBashComponents.push(this.bashComponent);
		} else {
			// Show in chat immediately when agent is idle
			this.chatContainer.addChild(this.bashComponent);
		}
		this.ui.requestRender();

		try {
			const result = await this.session.executeBash(
				command,
				(chunk) => {
					if (this.bashComponent) {
						this.bashComponent.appendOutput(chunk);
						this.ui.requestRender();
					}
				},
				{ excludeFromContext, operations: eventResult?.operations },
			);

			if (this.bashComponent) {
				this.bashComponent.setComplete(
					result.exitCode,
					result.cancelled,
					result.truncated ? ({ truncated: true, content: result.output } as TruncationResult) : undefined,
					result.fullOutputPath,
				);
			}
		} catch (error) {
			if (this.bashComponent) {
				this.bashComponent.setComplete(undefined, false);
			}
			this.showError(`Bash command failed: ${error instanceof Error ? error.message : "Unknown error"}`);
		}

		this.bashComponent = undefined;
		this.ui.requestRender();
	},

	async handleCompactCommand(this: InteractiveMode, customInstructions?: string): Promise<void> {
		this.clearStatusIndicator();

		try {
			await this.session.compact(customInstructions);
		} catch {
			// Ignore, will be emitted as an event
		}
	},
};
