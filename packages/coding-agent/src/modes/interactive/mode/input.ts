/**
 * InteractiveMode methods, applied to InteractiveMode.prototype in interactive-mode.ts; `this` is the mode.
 */

/**
 * Interactive mode for the coding agent.
 * Handles TUI rendering and user interaction, delegating business logic to AgentSession.
 */

import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { AutocompleteItem, AutocompleteProvider, SlashCommand } from "@nycode/tui";
import * as TuiLayouts from "@nycode/tui";
import {
	CombinedAutocompleteProvider,
	type Component,
	Spacer,
	Text,
	type TuiAltScreen,
	TuiMainScreen,
} from "@nycode/tui";
import { getAgentDir } from "../../../config.ts";
import type { ExtensionRunner } from "../../../core/extensions/index.ts";
import type { ResourceDiagnostic } from "../../../core/resource-loader.ts";
import type { FullscreenExitOutput, TuiMode } from "../../../core/settings-manager.ts";
import { BUILTIN_SLASH_COMMANDS } from "../../../core/slash-commands.ts";
import type { SourceInfo } from "../../../core/source-info.ts";
import { readClipboardFilePaths, readClipboardText } from "../../../utils/clipboard.ts";
import { extensionForImageMimeType, readClipboardImage } from "../../../utils/clipboard-image.ts";
import { parseGitUrl } from "../../../utils/git.ts";
import { DynamicBorder } from "../components/dynamic-border.ts";
import { ThemedText } from "../components/themed-text.ts";
import type { InteractiveMode } from "../interactive-mode.ts";
import { getModelSearchText } from "../model-search.ts";
import { installSendNow, type SendNowHost } from "../send-now/index.ts";
import { theme } from "../theme/theme.ts";
import { createInteractiveTui } from "../tui-renderer.ts";
import {
	createFuzzyAutocompleteItems,
	formatLoginProviderCompletionDescription,
	getLoginProviderCompletionOptions,
	getLoginProviderSearchText,
	quoteIfNeeded,
} from "./helpers.ts";

/** Autocomplete sources, startup notices and the TUI mount and mode switch. */
export const autocompleteMethods = {
	getAutocompleteSourceTag(this: InteractiveMode, sourceInfo?: SourceInfo): string | undefined {
		// Built-in extension commands are untagged, like built-in commands.
		if (!sourceInfo || sourceInfo.source === "builtin") {
			return undefined;
		}

		const scopePrefix = sourceInfo.scope === "user" ? "u" : sourceInfo.scope === "project" ? "p" : "t";
		const source = sourceInfo.source.trim();

		if (source === "auto" || source === "local" || source === "cli") {
			return scopePrefix;
		}

		if (source.startsWith("npm:")) {
			return `${scopePrefix}:${source}`;
		}

		const gitSource = parseGitUrl(source);
		if (gitSource) {
			const ref = gitSource.ref ? `@${gitSource.ref}` : "";
			return `${scopePrefix}:git:${gitSource.host}/${gitSource.path}${ref}`;
		}

		return scopePrefix;
	},

	prefixAutocompleteDescription(
		this: InteractiveMode,
		description: string | undefined,
		sourceInfo?: SourceInfo,
	): string | undefined {
		const sourceTag = this.getAutocompleteSourceTag(sourceInfo);
		if (!sourceTag) {
			return description;
		}
		return description ? `[${sourceTag}] ${description}` : `[${sourceTag}]`;
	},

	getBuiltInCommandConflictDiagnostics(this: InteractiveMode, extensionRunner: ExtensionRunner): ResourceDiagnostic[] {
		const builtinNames = new Set(BUILTIN_SLASH_COMMANDS.map((command) => command.name));
		return extensionRunner
			.getRegisteredCommands()
			.filter((command) => builtinNames.has(command.name))
			.map((command) => ({
				type: "warning" as const,
				message:
					command.invocationName === command.name
						? `Extension command '/${command.name}' conflicts with built-in interactive command. Skipping in autocomplete.`
						: `Extension command '/${command.name}' conflicts with built-in interactive command. Available as '/${command.invocationName}'.`,
				path: command.sourceInfo.path,
			}));
	},

	createBaseAutocompleteProvider(this: InteractiveMode): AutocompleteProvider {
		// Define commands for autocomplete
		const slashCommands: SlashCommand[] = BUILTIN_SLASH_COMMANDS.map((command) => ({
			name: command.name,
			description: command.description,
			...(command.argumentHint && { argumentHint: command.argumentHint }),
		}));

		const modelCommand = slashCommands.find((command) => command.name === "model");
		if (modelCommand) {
			modelCommand.getArgumentCompletions = (prefix: string): AutocompleteItem[] | null => {
				const models =
					this.session.scopedModels.length > 0
						? this.session.scopedModels.map((s) => s.model)
						: this.session.modelRuntime.getAvailableSnapshot();

				if (models.length === 0) return null;

				// Create items with provider/id format
				const items = models.map((m) => ({
					id: m.id,
					provider: m.provider,
					name: m.name,
					label: `${m.provider}/${m.id}`,
				}));

				return createFuzzyAutocompleteItems(items, prefix, getModelSearchText, (item) => ({
					value: item.label,
					label: item.id,
					description: item.provider,
				}));
			};
		}

		const thinkingCommand = slashCommands.find((command) => command.name === "thinking");
		if (thinkingCommand) {
			thinkingCommand.getArgumentCompletions = (prefix: string): AutocompleteItem[] | null => {
				return createFuzzyAutocompleteItems(
					this.session.getAvailableThinkingLevels(),
					prefix,
					(level) => level,
					(level) => ({
						value: level,
						label: level,
					}),
				);
			};
		}

		const loginCommand = slashCommands.find((command) => command.name === "login");
		if (loginCommand) {
			loginCommand.getArgumentCompletions = (prefix: string): AutocompleteItem[] | null => {
				const providers = getLoginProviderCompletionOptions(this.getLoginProviderOptions());
				return createFuzzyAutocompleteItems(providers, prefix, getLoginProviderSearchText, (provider) => ({
					value: provider.id,
					label: provider.id,
					description: formatLoginProviderCompletionDescription(provider),
				}));
			};
		}

		// Convert prompt templates to SlashCommand format for autocomplete
		const templateCommands: SlashCommand[] = this.session.promptTemplates.map((cmd) => ({
			name: cmd.name,
			description: this.prefixAutocompleteDescription(cmd.description, cmd.sourceInfo),
			...(cmd.argumentHint && { argumentHint: cmd.argumentHint }),
		}));

		// Convert extension commands to SlashCommand format
		const builtinCommandNames = new Set(slashCommands.map((c) => c.name));
		const extensionCommands: SlashCommand[] = this.session.extensionRunner
			.getRegisteredCommands()
			.filter((cmd) => !builtinCommandNames.has(cmd.name))
			.map((cmd) => ({
				name: cmd.invocationName,
				description: this.prefixAutocompleteDescription(cmd.description, cmd.sourceInfo),
				getArgumentCompletions: cmd.getArgumentCompletions,
			}));

		// Build skill commands from session.skills (if enabled)
		this.skillCommands.clear();
		const skillCommandList: SlashCommand[] = [];
		if (this.settingsManager.getEnableSkillCommands()) {
			for (const skill of this.session.resourceLoader.getSkills().skills) {
				const commandName = `skill:${skill.name}`;
				this.skillCommands.set(commandName, skill.filePath);
				skillCommandList.push({
					name: commandName,
					description: this.prefixAutocompleteDescription(skill.description, skill.sourceInfo),
				});
			}
		}

		return new CombinedAutocompleteProvider(
			[...slashCommands, ...templateCommands, ...extensionCommands, ...skillCommandList],
			this.sessionManager.getCwd(),
			this.fdPath,
		);
	},

	setupAutocompleteProvider(this: InteractiveMode): void {
		let provider = this.createBaseAutocompleteProvider();
		const triggerCharacters: string[] = [];
		for (const wrapProvider of this.autocompleteProviderWrappers) {
			provider = wrapProvider(provider);
			triggerCharacters.push(...(provider.triggerCharacters ?? []));
		}
		if (triggerCharacters.length > 0) {
			provider.triggerCharacters = [...new Set(triggerCharacters)];
		}

		this.autocompleteProvider = provider;
		this.defaultEditor.setAutocompleteProvider(provider);
		if (this.editor !== this.defaultEditor) {
			this.editor.setAutocompleteProvider?.(provider);
		}
	},

	showStartupNoticesIfNeeded(this: InteractiveMode): void {
		if (this.startupNoticesShown) {
			return;
		}
		this.startupNoticesShown = true;

		if (!this.changelogMarkdown && this.extensionChangelogUpdates.length === 0) {
			return;
		}

		if (this.chatContainer.children.length > 0) {
			this.chatContainer.addChild(new Spacer(1));
		}
		this.chatContainer.addChild(new DynamicBorder());
		if (this.changelogMarkdown) {
			if (this.settingsManager.getCollapseChangelog()) {
				const versionMatch = this.changelogMarkdown.match(/##\s+\[?(\d+\.\d+\.\d+)\]?/);
				const latestVersion = versionMatch ? versionMatch[1] : this.version;
				const condensedText = `Updated to v${latestVersion}. Use ${theme.bold("/changelog")} to view full changelog.`;
				this.chatContainer.addChild(new Text(condensedText, 1, 0));
			} else {
				this.chatContainer.addChild(new ThemedText(() => theme.bold(theme.fg("accent", "What's New")), 1, 0));
				this.chatContainer.addChild(new Spacer(1));
				this.chatContainer.addChild(this.createChangelogMarkdown(this.changelogMarkdown.trim(), 1, 0));
				this.chatContainer.addChild(new Spacer(1));
			}
		}
		if (this.extensionChangelogUpdates.length > 0) {
			if (this.changelogMarkdown) {
				this.chatContainer.addChild(new Spacer(1));
			}
			if (this.settingsManager.getCollapseChangelog()) {
				const condensedText = this.extensionChangelogUpdates
					.map((update) => `Updated ${update.name} to v${update.version}.`)
					.join("\n");
				this.chatContainer.addChild(new Text(condensedText, 1, 0));
			} else {
				this.chatContainer.addChild(
					new ThemedText(() => theme.bold(theme.fg("accent", "Extension Updates")), 1, 0),
				);
				this.chatContainer.addChild(new Spacer(1));
				const markdown = this.extensionChangelogUpdates.map((update) => update.markdown).join("\n\n");
				this.chatContainer.addChild(this.createChangelogMarkdown(markdown, 1, 0));
				this.chatContainer.addChild(new Spacer(1));
			}
		}
		this.chatContainer.addChild(new DynamicBorder());
	},

	mountInteractiveTui(
		this: InteractiveMode,
		tui: TuiMainScreen | TuiAltScreen,
		components: readonly Component[],
	): void {
		for (const component of components) tui.addChild(component);
		if (TuiLayouts.isViewportTUI(tui)) {
			if (!this.fullscreenLayoutRoot) throw new Error("Fullscreen layout is not initialized");
			tui.setLayoutRoot(this.fullscreenLayoutRoot);
		}
	},

	stopInteractiveTui(this: InteractiveMode, fullscreenExitOutput: FullscreenExitOutput): void {
		if (this.renderer.mode === "fullscreen" && fullscreenExitOutput === "transcript") {
			while (this.renderer.hasOverlayEntries) this.renderer.hideOverlay();
			this.switchTuiMode("regular", false, false);
			this.renderer.renderNow();
		}
		this.ui.stop({ preserveScreen: this.renderer.mode === "fullscreen" });
	},

	switchTuiMode(this: InteractiveMode, mode: TuiMode, restoreProgress = true, startRenderer = true): boolean {
		const previousUi = this.renderer;
		if (mode === previousUi.mode) return true;
		if (previousUi.hasOverlayEntries) return false;

		const components = [...previousUi.children];
		const focus = previousUi.getFocusedComponent();
		const terminal = previousUi.terminal;
		const showHardwareCursor = previousUi.getShowHardwareCursor();
		const clearOnShrink = previousUi.getClearOnShrink();
		const onDebug = previousUi.onDebug;
		if (previousUi instanceof TuiMainScreen) {
			this.mainScreenRenderState = previousUi.captureRenderState();
		}

		previousUi.stop({ preserveScreen: true });
		previousUi.setFocus(null);
		previousUi.clear();
		if (TuiLayouts.isViewportTUI(previousUi)) previousUi.setLayoutRoot(undefined);

		const nextUi = createInteractiveTui({
			tuiMode: mode,
			showHardwareCursor,
			logDirectory: getAgentDir(),
			terminal,
			onRightClickPaste: this.onRightClickPaste,
			fullscreenCopyOnSelect: this.settingsManager.getFullscreenCopyOnSelect(),
			fullscreenWheelScrollLines: this.settingsManager.getFullscreenWheelScrollLines(),
		});
		nextUi.setClearOnShrink(clearOnShrink);
		nextUi.onDebug = onDebug;
		nextUi.setSuspendSignalHandler(() => this.handleCtrlZ());
		if (nextUi instanceof TuiMainScreen && this.mainScreenRenderState) {
			nextUi.restoreRenderState(this.mainScreenRenderState);
		}
		this.renderer = nextUi;
		this.options.tuiMode = mode;
		this.mountInteractiveTui(nextUi, components);
		nextUi.invalidate();
		nextUi.setFocus(focus);
		if (!startRenderer) return true;
		nextUi.start();
		this.themeController.rebindTui();
		this.rebindExtensionTerminalInputListeners();
		if (
			restoreProgress &&
			this.settingsManager.getShowTerminalProgress() &&
			(this.session.isStreaming || this.session.isCompacting)
		) {
			terminal.setProgress(true);
		}
		return true;
	},
};

/** Key handlers, paste and the editor submit flow. */
export const inputMethods = {
	// =========================================================================
	// Key Handlers
	// =========================================================================

	setupKeyHandlers(this: InteractiveMode): void {
		installSendNow(this as unknown as SendNowHost); // nycode: K22
		// Set up handlers on defaultEditor - they use this.editor for text access
		// so they work correctly regardless of which editor is active
		this.defaultEditor.onEscape = () => {
			if (this.session.isStreaming) {
				this.restoreQueuedMessagesToEditor({ abort: true });
			} else if (this.session.isBashRunning) {
				this.session.abortBash();
			} else if (this.isBashMode) {
				this.editor.setText("");
				this.isBashMode = false;
				this.updateEditorBorderColor();
			} else if (!this.editor.getText().trim()) {
				// Double-escape with empty editor triggers /tree, /fork, or nothing based on setting
				const action = this.settingsManager.getDoubleEscapeAction();
				if (action !== "none") {
					const now = Date.now();
					if (now - this.lastEscapeTime < 500) {
						if (action === "tree") {
							this.showTreeSelector();
						} else {
							this.showUserMessageSelector();
						}
						this.lastEscapeTime = 0;
					} else {
						this.lastEscapeTime = now;
					}
				}
			}
		};

		// Register app action handlers
		this.defaultEditor.onAction("app.clear", () => this.handleCtrlC());
		this.defaultEditor.onCtrlD = () => this.handleCtrlD();
		this.defaultEditor.onAction("app.suspend", () => this.handleCtrlZ());
		this.defaultEditor.onAction("app.thinking.cycle", () => this.cycleThinkingLevel());
		this.defaultEditor.onAction("app.model.cycleForward", () => this.cycleModel("forward"));
		this.defaultEditor.onAction("app.model.cycleBackward", () => this.cycleModel("backward"));

		// Global debug handler on TUI (works regardless of focus)
		this.ui.onDebug = () => this.handleDebugCommand();
		this.defaultEditor.onAction("app.model.select", () => this.showModelSelector());
		this.defaultEditor.onAction("app.tools.expand", () => this.toggleToolOutputExpansion());
		this.defaultEditor.onAction("app.thinking.toggle", () => this.toggleThinkingBlockVisibility());
		this.defaultEditor.onAction("app.editor.external", () => void this.handleOpenExternalEditor());
		this.defaultEditor.onAction(
			"app.message.copy",
			() => void this.handleCopyCommand({ flashConfirmation: true, preferSelection: true }),
		);
		this.defaultEditor.onAction("app.message.followUp", () => this.handleFollowUp());
		this.defaultEditor.onAction("app.message.dequeue", () => this.handleDequeue());
		this.defaultEditor.onAction("app.session.new", () => this.handleClearCommand());
		this.defaultEditor.onAction("app.session.tree", () => this.showTreeSelector());
		this.defaultEditor.onAction("app.session.fork", () => this.showUserMessageSelector());
		this.defaultEditor.onAction("app.session.resume", () => this.showSessionSelector());

		this.defaultEditor.onChange = (text: string) => {
			const wasBashMode = this.isBashMode;
			this.isBashMode = text.trimStart().startsWith("!");
			if (wasBashMode !== this.isBashMode) {
				this.updateEditorBorderColor();
			}
		};

		// Handle clipboard paste (triggered on Ctrl+V). Copied files use their original paths,
		// images are attached via temporary files, and plain text is the final fallback.
		this.defaultEditor.onPasteImage = () => {
			void this.handleClipboardPaste();
		};
	},

	async handleRightClickPaste(this: InteractiveMode): Promise<void> {
		const target = this.renderer.getFocusedComponent();
		const handleInput = target?.handleInput;
		if (!target || !handleInput) return;
		try {
			const text = await readClipboardText();
			if (!text || this.renderer.getFocusedComponent() !== target) return;
			handleInput.call(target, `\x1b[200~${text}\x1b[201~`);
			this.ui.requestRender();
		} catch {
			// Silently ignore clipboard errors (may not have permission, etc.)
		}
	},

	async handleClipboardPaste(this: InteractiveMode): Promise<void> {
		try {
			const filePaths = await readClipboardFilePaths();
			if (filePaths) {
				if (filePaths.some((filePath) => /\p{Cc}/u.test(filePath))) {
					throw new Error("Clipboard file path contains control characters");
				}
				const paths = this.isBashMode ? filePaths.map(quoteIfNeeded).join(" ") : filePaths.join("\n");
				const cursor = this.editor.getCursor?.();
				const currentLine = cursor ? (this.editor.getText().split("\n")[cursor.line] ?? "") : "";
				const characterBeforeCursor = cursor && cursor.col > 0 ? currentLine[cursor.col - 1] : "";
				const characterAfterCursor = cursor ? currentLine[cursor.col] : "";
				const leadingSpace = characterBeforeCursor && !/\s/.test(characterBeforeCursor) ? " " : "";
				const trailingSpace = characterAfterCursor && !/\s/.test(characterAfterCursor) ? " " : "";
				this.editor.insertTextAtCursor?.(`${leadingSpace}${paths}${trailingSpace}`);
				this.ui.requestRender();
				return;
			}

			const image = await readClipboardImage();
			if (image) {
				const tmpDir = os.tmpdir();
				const ext = extensionForImageMimeType(image.mimeType) ?? "png";
				const fileName = `nycode-clipboard-${crypto.randomUUID()}.${ext}`;
				const filePath = path.join(tmpDir, fileName);
				fs.writeFileSync(filePath, Buffer.from(image.bytes));

				this.editor.insertTextAtCursor?.(filePath);
				this.ui.requestRender();
				return;
			}

			const text = await readClipboardText();
			if (text) {
				this.editor.insertTextAtCursor?.(text);
				this.ui.requestRender();
			}
		} catch (error) {
			this.showError(`Failed to paste from clipboard: ${error instanceof Error ? error.message : String(error)}`);
		}
	},

	handleStartupSubmit(this: InteractiveMode, text: string): void {
		this.editor.setText(text);
		this.showStatus("Startup is still in progress");
	},

	setupEditorSubmitHandler(this: InteractiveMode): void {
		this.defaultEditor.onSubmit = async (text: string) => {
			text = text.trim();
			if (!text) return;

			// Handle commands
			if (text === "/settings") {
				this.showSettingsSelector();
				this.editor.setText("");
				return;
			}
			if (text === "/scoped-models") {
				this.editor.setText("");
				await this.showModelsSelector();
				return;
			}
			if (text === "/model" || text.startsWith("/model ")) {
				const searchTerm = text.startsWith("/model ") ? text.slice(7).trim() : undefined;
				this.editor.setText("");
				await this.handleModelCommand(searchTerm);
				return;
			}
			if (text === "/thinking" || text.startsWith("/thinking ")) {
				const searchTerm = text.startsWith("/thinking ") ? text.slice(10).trim() : undefined;
				this.editor.setText("");
				this.handleThinkingCommand(searchTerm);
				return;
			}
			if (text === "/export" || text.startsWith("/export ")) {
				await this.handleExportCommand(text);
				this.editor.setText("");
				return;
			}
			if (text === "/import" || text.startsWith("/import ")) {
				await this.handleImportCommand(text);
				this.editor.setText("");
				return;
			}
			if (text === "/share") {
				await this.handleShareCommand();
				this.editor.setText("");
				return;
			}
			if (text === "/bug" || text.startsWith("/bug ")) {
				const hint = text.slice("/bug".length).trim();
				this.editor.setText("");
				await this.handleBugCommand(hint ? hint : undefined);
				return;
			}
			if (text === "/copy") {
				await this.handleCopyCommand();
				this.editor.setText("");
				return;
			}
			if (text === "/name" || text.startsWith("/name ")) {
				this.handleNameCommand(text);
				this.editor.setText("");
				return;
			}
			if (text === "/session") {
				this.handleSessionCommand();
				this.editor.setText("");
				return;
			}
			if (text === "/changelog") {
				this.handleChangelogCommand();
				this.editor.setText("");
				return;
			}
			if (text === "/hotkeys") {
				this.handleHotkeysCommand();
				this.editor.setText("");
				return;
			}
			if (text === "/fork") {
				this.showUserMessageSelector();
				this.editor.setText("");
				return;
			}
			if (text === "/clone") {
				this.editor.setText("");
				await this.handleCloneCommand();
				return;
			}
			if (text === "/tree") {
				this.showTreeSelector();
				this.editor.setText("");
				return;
			}
			if (text === "/trust") {
				this.showTrustSelector();
				this.editor.setText("");
				return;
			}
			if (text === "/login" || text.startsWith("/login ")) {
				const providerRef = text.startsWith("/login ") ? text.slice(7).trim() : undefined;
				this.editor.setText("");
				await this.handleLoginCommand(providerRef);
				return;
			}
			if (text === "/logout") {
				this.showOAuthSelector("logout");
				this.editor.setText("");
				return;
			}
			if (text === "/new") {
				this.editor.setText("");
				await this.handleClearCommand();
				return;
			}
			if (text === "/compact" || text.startsWith("/compact ")) {
				const customInstructions = text.startsWith("/compact ") ? text.slice(9).trim() : undefined;
				this.editor.setText("");
				await this.handleCompactCommand(customInstructions);
				return;
			}
			if (text === "/reload") {
				this.editor.setText("");
				await this.handleReloadCommand();
				return;
			}
			if (text === "/debug") {
				this.handleDebugCommand();
				this.editor.setText("");
				return;
			}
			if (text === "/arminsayshi") {
				this.handleArminSaysHi();
				this.editor.setText("");
				return;
			}
			if (text === "/dementedelves") {
				this.handleDementedDelves();
				this.editor.setText("");
				return;
			}
			if (text === "/resume") {
				this.showSessionSelector();
				this.editor.setText("");
				return;
			}
			if (text === "/quit") {
				this.editor.setText("");
				await this.shutdown();
				return;
			}

			// Handle bash command (! for normal, !! for excluded from context)
			if (text.startsWith("!")) {
				const isExcluded = text.startsWith("!!");
				const command = isExcluded ? text.slice(2).trim() : text.slice(1).trim();
				if (command) {
					if (this.session.isBashRunning) {
						this.showWarning("A bash command is already running. Press Esc to cancel it first.");
						this.editor.setText(text);
						return;
					}
					this.editor.addToHistory?.(text);
					await this.handleBashCommand(command, isExcluded);
					this.isBashMode = false;
					this.updateEditorBorderColor();
					return;
				}
			}

			// Queue input during compaction (extension commands execute immediately)
			if (this.session.isCompacting) {
				if (this.isExtensionCommand(text)) {
					this.editor.addToHistory?.(text);
					this.editor.setText("");
					await this.session.prompt(text);
				} else {
					this.queueCompactionMessage(text, "steer");
				}
				return;
			}

			// If streaming, use prompt() with steer behavior
			// This handles extension commands (execute immediately), prompt template expansion, and queueing
			if (this.session.isStreaming) {
				this.editor.addToHistory?.(text);
				this.editor.setText("");
				await this.session.prompt(text, { streamingBehavior: "steer" });
				this.updatePendingMessagesDisplay();
				this.ui.requestRender();
				return;
			}

			// Normal message submission
			// First, move any pending bash components to chat
			this.flushPendingBashComponents();

			if (this.onInputCallback) {
				this.onInputCallback(text);
			} else {
				this.pendingUserInputs.push(text);
			}
			this.editor.addToHistory?.(text);
		};
	},

	subscribeToAgent(this: InteractiveMode): void {
		this.unsubscribe = this.session.subscribe(async (event) => {
			await this.handleEvent(event);
		});
	},
};
