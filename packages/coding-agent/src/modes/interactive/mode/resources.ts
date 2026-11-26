/**
 * InteractiveMode methods, applied to InteractiveMode.prototype in interactive-mode.ts; `this` is the mode.
 */

/**
 * Interactive mode for the coding agent.
 * Handles TUI rendering and user interaction, delegating business logic to AgentSession.
 */

import { type AssistantMessage, isRetryableAssistantError } from "@nycode/ai/compat";
import { type DefaultTextStyle, Markdown, Spacer, setCapabilityOverrides, TuiAltScreen } from "@nycode/tui";
import { APP_NAME, detectInstallChange, VERSION } from "../../../config.ts";
import type { AgentSessionRuntimeDiagnostic } from "../../../core/agent-session-services.ts";
import { findExtensionStackMatches, recordCrash } from "../../../core/crash-log.ts";
import type { MarkdownTransformer } from "../../../core/extensions/index.ts";
import type { ToolRenderers } from "../../../core/extensions/types.ts";
import { configureHttpDispatcher } from "../../../core/http-dispatcher.ts";
import type { ResourceDiagnostic } from "../../../core/resource-loader.ts";
import type { SourceInfo } from "../../../core/source-info.ts";
import { withBuiltInRenderers } from "../../../core/tools/renderers/index.ts";
import { flushStdout } from "../../../utils/flush-stdout.ts";
import { ensurePngTranscoder } from "../../../utils/image-convert.ts";
import * as avisos from "../avisos/index.ts";
import { createMarkdownTransform } from "../components/markdown-transform.ts";
import { ThemedText } from "../components/themed-text.ts";
import type { InteractiveMode } from "../interactive-mode.ts";
import { setRegisteredThemes, stopThemeWatcher, type ThemeColor, theme } from "../theme/theme.ts";
import { ExpandableText, formatCrashExtensionHint, formatResumeCommand } from "./helpers.ts";

/** Loaded resources, session binding, runtime settings and crash reporting. */
export const resourcesMethods = {
	showLoadedResources(
		this: InteractiveMode,
		options?: {
			extensions?: Array<{ path: string; sourceInfo?: SourceInfo }>;
			force?: boolean;
			showDiagnosticsWhenQuiet?: boolean;
		},
	): void {
		// Resource rendering is idempotent; chat clears no longer clear this separate container.
		this.loadedResourcesContainer.clear();

		const showListing = options?.force || this.shouldShowStartupDetails();
		const showDiagnostics = showListing || options?.showDiagnosticsWhenQuiet === true;
		if (!showListing && !showDiagnostics) {
			return;
		}

		const sectionHeader = (name: string, color: ThemeColor = "mdHeading") => theme.fg(color, `[${name}]`);
		const formatCompactList = (items: string[], options?: { sort?: boolean }): string => {
			const labels = items.map((item) => item.trim()).filter((item) => item.length > 0);
			if (options?.sort !== false) {
				labels.sort((a, b) => a.localeCompare(b));
			}
			return theme.fg("dim", `  ${labels.join(", ")}`);
		};
		// Bodies are built on demand so the listing follows theme changes.
		const addLoadedSection = (
			name: string,
			collapsedBody: () => string,
			expandedBody = collapsedBody,
			color: ThemeColor = "mdHeading",
		): void => {
			const section = new ExpandableText(
				() => `${sectionHeader(name, color)}\n${collapsedBody()}`,
				() => `${sectionHeader(name, color)}\n${expandedBody()}`,
				this.getStartupExpansionState(),
				0,
				0,
			);
			this.loadedResourcesContainer.addChild(section);
			this.loadedResourcesContainer.addChild(new Spacer(1));
		};

		const skillsResult = this.session.resourceLoader.getSkills();
		const promptsResult = this.session.resourceLoader.getPrompts();
		const themesResult = this.session.resourceLoader.getThemes();
		const extensions =
			options?.extensions ??
			this.session.resourceLoader
				.getExtensions()
				.extensions.filter((extension) => !extension.hidden)
				.map((extension) => ({
					path: extension.path,
					sourceInfo: extension.sourceInfo,
				}));
		const sourceInfos = new Map<string, SourceInfo>();
		for (const extension of extensions) {
			if (extension.sourceInfo) {
				sourceInfos.set(extension.path, extension.sourceInfo);
			}
		}
		for (const skill of skillsResult.skills) {
			if (skill.sourceInfo) {
				sourceInfos.set(skill.filePath, skill.sourceInfo);
			}
		}
		for (const prompt of promptsResult.prompts) {
			if (prompt.sourceInfo) {
				sourceInfos.set(prompt.filePath, prompt.sourceInfo);
			}
		}
		for (const loadedTheme of themesResult.themes) {
			if (loadedTheme.sourcePath && loadedTheme.sourceInfo) {
				sourceInfos.set(loadedTheme.sourcePath, loadedTheme.sourceInfo);
			}
		}

		if (showListing) {
			const systemPromptSource = this.session.resourceLoader.getSystemPromptSource();
			const contextFiles = [
				...(systemPromptSource ? [systemPromptSource] : []),
				...this.session.resourceLoader.getAppendSystemPromptSources(),
				...this.session.resourceLoader.getAgentsFiles().agentsFiles,
			];
			if (contextFiles.length > 0) {
				this.loadedResourcesContainer.addChild(new Spacer(1));
				const contextList = () =>
					contextFiles.map((f) => theme.fg("dim", `  ${this.formatDisplayPath(f.path)}`)).join("\n");
				const contextCompactList = () =>
					formatCompactList(
						contextFiles.map((contextFile) => this.formatContextPath(contextFile.path)),
						{ sort: false },
					);
				addLoadedSection("Context", contextCompactList, contextList);
			}

			const skills = skillsResult.skills;
			if (skills.length > 0) {
				const groups = this.buildScopeGroups(
					skills.map((skill) => ({ path: skill.filePath, sourceInfo: skill.sourceInfo })),
				);
				const skillList = () =>
					this.formatScopeGroups(groups, {
						formatPath: (item) => this.formatDisplayPath(item.path),
						formatPackagePath: (item) => this.getShortPath(item.path, item.sourceInfo),
					});
				const skillCompactList = () => formatCompactList(skills.map((skill) => skill.name));
				addLoadedSection("Skills", skillCompactList, skillList);
			}

			const templates = this.session.promptTemplates;
			if (templates.length > 0) {
				const groups = this.buildScopeGroups(
					templates.map((template) => ({ path: template.filePath, sourceInfo: template.sourceInfo })),
				);
				const templateByPath = new Map(templates.map((t) => [t.filePath, t]));
				const templateList = () =>
					this.formatScopeGroups(groups, {
						formatPath: (item) => {
							const template = templateByPath.get(item.path);
							return template ? `/${template.name}` : this.formatDisplayPath(item.path);
						},
						formatPackagePath: (item) => {
							const template = templateByPath.get(item.path);
							return template ? `/${template.name}` : this.formatDisplayPath(item.path);
						},
					});
				const promptCompactList = () => formatCompactList(templates.map((template) => `/${template.name}`));
				addLoadedSection("Prompts", promptCompactList, templateList);
			}

			if (extensions.length > 0) {
				const groups = this.buildScopeGroups(extensions);
				const extList = () =>
					this.formatScopeGroups(groups, {
						formatPath: (item) => this.formatExtensionDisplayPath(item.path),
						formatPackagePath: (item) =>
							this.formatExtensionDisplayPath(this.getShortPath(item.path, item.sourceInfo)),
					});
				const extensionLabels = this.getCompactExtensionLabels(extensions);
				const extensionCompactList = () => formatCompactList(extensionLabels);
				addLoadedSection("Extensions", extensionCompactList, extList, "mdHeading");
			}
		}

		if (showDiagnostics) {
			const skillDiagnostics = skillsResult.diagnostics;
			if (skillDiagnostics.length > 0) {
				const warningLines = () => this.formatDiagnostics(skillDiagnostics, sourceInfos);
				this.loadedResourcesContainer.addChild(
					new ThemedText(() => `${theme.fg("warning", "[Skill warnings]")}\n${warningLines()}`, 0, 0),
				);
				this.loadedResourcesContainer.addChild(new Spacer(1));
			}

			const promptDiagnostics = promptsResult.diagnostics;
			if (promptDiagnostics.length > 0) {
				const warningLines = () => this.formatDiagnostics(promptDiagnostics, sourceInfos);
				this.loadedResourcesContainer.addChild(
					new ThemedText(() => `${theme.fg("warning", "[Prompt conflicts]")}\n${warningLines()}`, 0, 0),
				);
				this.loadedResourcesContainer.addChild(new Spacer(1));
			}

			const extensionDiagnostics: ResourceDiagnostic[] = [];
			const extensionsResult = this.session.resourceLoader.getExtensions();
			for (const error of extensionsResult.errors) {
				extensionDiagnostics.push({ type: "error", message: error.error, path: error.path });
			}
			for (const warning of extensionsResult.warnings ?? []) {
				extensionDiagnostics.push({ type: "warning", message: warning.warning, path: warning.path });
			}

			const commandDiagnostics = this.session.extensionRunner.getCommandDiagnostics();
			extensionDiagnostics.push(...commandDiagnostics);
			extensionDiagnostics.push(...this.getBuiltInCommandConflictDiagnostics(this.session.extensionRunner));

			const shortcutDiagnostics = this.session.extensionRunner.getShortcutDiagnostics();
			extensionDiagnostics.push(...shortcutDiagnostics);

			if (extensionDiagnostics.length > 0) {
				const warningLines = () => this.formatDiagnostics(extensionDiagnostics, sourceInfos);
				this.loadedResourcesContainer.addChild(
					new ThemedText(() => `${theme.fg("warning", "[Extension issues]")}\n${warningLines()}`, 0, 0),
				);
				this.loadedResourcesContainer.addChild(new Spacer(1));
			}

			const themeDiagnostics = themesResult.diagnostics;
			if (themeDiagnostics.length > 0) {
				const warningLines = () => this.formatDiagnostics(themeDiagnostics, sourceInfos);
				this.loadedResourcesContainer.addChild(
					new ThemedText(() => `${theme.fg("warning", "[Theme conflicts]")}\n${warningLines()}`, 0, 0),
				);
				this.loadedResourcesContainer.addChild(new Spacer(1));
			}
		}
	},

	/**
	 * Initialize the extension system with TUI-based UI context.
	 */
	async bindCurrentSessionExtensions(this: InteractiveMode): Promise<void> {
		const uiContext = this.createExtensionUIContext();
		await this.session.bindExtensions({
			uiContext,
			mode: "tui",
			abortHandler: () => {
				this.restoreQueuedMessagesToEditor({ abort: true });
			},
			commandContextActions: {
				waitForIdle: () => this.session.waitForIdle(),
				newSession: async (options) => {
					this.clearStatusIndicator();
					try {
						return await this.runtimeHost.newSession(options);
					} catch (error: unknown) {
						return this.handleFatalRuntimeError("Failed to create session", error);
					}
				},
				fork: async (entryId, options) => {
					try {
						const result = await this.runtimeHost.fork(entryId, options);
						if (!result.cancelled) {
							this.editor.setText(result.selectedText ?? "");
							this.showStatus("Forked to new session");
						}
						return { cancelled: result.cancelled };
					} catch (error: unknown) {
						return this.handleFatalRuntimeError("Failed to fork session", error);
					}
				},
				navigateTree: async (targetId, options) => {
					const result = await this.session.navigateTree(targetId, {
						summarize: options?.summarize,
						customInstructions: options?.customInstructions,
						replaceInstructions: options?.replaceInstructions,
						label: options?.label,
					});
					if (result.cancelled) {
						return { cancelled: true };
					}

					this.chatContainer.clear();
					this.renderInitialMessages();
					if (result.editorText && !this.editor.getText().trim()) {
						this.editor.setText(result.editorText);
					}
					this.showStatus("Navigated to selected point");
					void this.flushCompactionQueue({ willRetry: false });
					return { cancelled: false };
				},
				switchSession: async (sessionPath, options) => {
					return this.handleResumeSession(sessionPath, options);
				},
				reload: async () => {
					await this.handleReloadCommand();
				},
			},
			shutdownHandler: () => {
				this.shutdownRequested = true;
				if (this.session.isIdle) {
					void this.shutdown();
				}
			},
			onError: (error) => {
				this.showExtensionError(error.extensionPath, error.error, error.stack);
			},
		});

		setRegisteredThemes(this.session.resourceLoader.getThemes().themes);
		this.setupAutocompleteProvider();

		const extensionRunner = this.session.extensionRunner;
		this.setupExtensionShortcuts(extensionRunner);
		this.showLoadedResources({ force: false, showDiagnosticsWhenQuiet: true });
		this.showStartupNoticesIfNeeded();
	},

	applyFullscreenScrollbarSetting(this: InteractiveMode): void {
		this.transcriptScrollView?.setScrollbar(this.settingsManager.getFullscreenScrollbar());
	},

	/** Lets extension images use the PNG transcoder; tool results register it themselves. */
	ensurePngTranscoder(this: InteractiveMode): void {
		ensurePngTranscoder(() => {
			this.ui.invalidate();
			this.ui.requestRender();
		});
	},

	applyRuntimeSettings(this: InteractiveMode): void {
		setCapabilityOverrides(this.settingsManager.getTerminalCapabilityOverrides());
		this.ensurePngTranscoder();
		configureHttpDispatcher(this.settingsManager.getHttpIdleTimeoutMs());
		this.applyFullscreenScrollbarSetting();
		if (this.renderer instanceof TuiAltScreen) {
			this.renderer.setCopyOnSelect(this.settingsManager.getFullscreenCopyOnSelect());
			this.renderer.setWheelScrollLines(this.settingsManager.getFullscreenWheelScrollLines());
		}
		this.footer.setSession(this.session);
		this.footer.setAutoCompactEnabled(this.session.autoCompactionEnabled);
		this.footerDataProvider.setCwd(this.sessionManager.getCwd());
		this.hideThinkingBlock = this.settingsManager.getHideThinkingBlock();
		this.outputPad = this.settingsManager.getOutputPad();
		this.ui.setShowHardwareCursor(this.settingsManager.getShowHardwareCursor());
		const clearOnShrink = this.settingsManager.getClearOnShrink();
		this.ui.setClearOnShrink(clearOnShrink);
		if (!clearOnShrink && !this.activeStatusIndicator) {
			this.statusContainer.clear();
		}
		const editorPaddingX = this.settingsManager.getEditorPaddingX();
		const autocompleteMaxVisible = this.settingsManager.getAutocompleteMaxVisible();
		this.defaultEditor.setPaddingX(editorPaddingX);
		this.defaultEditor.setAutocompleteMaxVisible(autocompleteMaxVisible);
		if (this.editor !== this.defaultEditor) {
			this.editor.setPaddingX?.(editorPaddingX);
			this.editor.setAutocompleteMaxVisible?.(autocompleteMaxVisible);
		}
	},

	showRuntimeDiagnostics(this: InteractiveMode, diagnostics: readonly AgentSessionRuntimeDiagnostic[]): void {
		for (const diagnostic of diagnostics) {
			if (diagnostic.type === "error") {
				this.showError(diagnostic.message);
			} else if (diagnostic.type === "warning") {
				this.showWarning(diagnostic.message);
			} else {
				this.showStatus(diagnostic.message);
			}
		}
	},

	async rebindCurrentSession(this: InteractiveMode, options: { renderBeforeBind?: boolean } = {}): Promise<void> {
		const session = this.session;

		this.unsubscribe?.();
		this.unsubscribe = undefined;
		this.programStatus.reset();
		this.applyRuntimeSettings();

		if (options.renderBeforeBind) {
			this.renderCurrentSessionState();
			this.subscribeToAgent();
		}

		await this.bindCurrentSessionExtensions();

		if (this.session !== session) {
			return;
		}

		if (!options.renderBeforeBind) {
			this.subscribeToAgent();
		}

		await this.updateAvailableProviderCount();
		this.updateEditorBorderColor();
		this.updateTerminalTitle();
	},

	async handleFatalRuntimeError(this: InteractiveMode, prefix: string, error: unknown): Promise<never> {
		const message = error instanceof Error ? error.message : String(error);
		this.setChromeHidden(false); // a failed session switch would otherwise leave the error held off screen
		this.showError(`${prefix}: ${message}`);
		const extensionHint = this.getCrashExtensionHint(error);
		if (extensionHint) {
			this.chatContainer.addChild(new ThemedText(() => theme.fg("warning", extensionHint), this.outputPad, 0));
		}
		if (this.recordCrash("fatal_error", error)) {
			const instructions = this.crashReportInstructions();
			this.chatContainer.addChild(new ThemedText(() => theme.fg("muted", instructions), this.outputPad, 0));
		}
		stopThemeWatcher();
		this.stop("transcript");
		await flushStdout();
		process.exit(1);
	},

	getCrashExtensionHint(this: InteractiveMode, error: unknown): string | undefined {
		try {
			return formatCrashExtensionHint(
				findExtensionStackMatches(
					error instanceof Error ? error.stack : undefined,
					this.session.resourceLoader.getExtensions().extensions,
				),
			);
		} catch {
			return undefined;
		}
	},

	/** Persist a crash so the next start can point the user at `/bug`. Returns false when nothing was written. */
	recordCrash(this: InteractiveMode, kind: "uncaught_exception" | "fatal_error", error: unknown): boolean {
		try {
			return (
				recordCrash({
					kind,
					error,
					sessionFile: this.session.sessionFile,
					cwd: this.session.sessionManager.getCwd(),
				}) !== undefined
			);
		} catch {
			return false;
		}
	},

	crashReportInstructions(this: InteractiveMode): string {
		const resume = this.session.sessionFile
			? `run \`${APP_NAME} -r\` to resume the session, then`
			: "start nycode and";
		return `To report this crash: ${resume} run /bug. The crash details are attached automatically.`;
	},

	suggestBugReport(this: InteractiveMode): void {
		if (avisos.semSugestaoDeBug()) return; // nycode: K17
		if (this.bugReportHintShown) return;
		this.bugReportHintShown = true;
		this.chatContainer.addChild(
			new ThemedText(
				() => theme.fg("muted", `If this looks like a ${APP_NAME} bug, /bug sends a report to the developers.`),
				this.outputPad,
				0,
			),
		);
		this.ui.requestRender();
	},

	maybeSuggestBugReport(this: InteractiveMode, message: AssistantMessage): void {
		if (message.stopReason !== "error" || isRetryableAssistantError(message)) return;
		if (/\b(?:abort(?:ed)?|cancel(?:l?ed)?)\b/i.test(message.errorMessage ?? "")) return;
		if (this.maybeShowInstallChangeWarning()) return;
		this.suggestBugReport();
	},

	/**
	 * After an error, check whether an update replaced or removed this install while the session ran.
	 * Code loaded on demand then fails with missing modules until restart (#10439). Returns true when
	 * the install changed.
	 */
	maybeShowInstallChangeWarning(this: InteractiveMode): boolean {
		if (this.installChangeWarningShown) return true;
		const change = detectInstallChange();
		if (!change) return false;
		this.installChangeWarningShown = true;
		const cause =
			change.kind === "updated"
				? `${APP_NAME} was updated to ${change.version} while this session was running (${VERSION})`
				: `The ${APP_NAME} installation this session runs from was removed or replaced`;
		const resumeCommand = formatResumeCommand(this.sessionManager);
		const restart = resumeCommand
			? `Restart with \`${resumeCommand}\` to continue this session.`
			: `Restart ${APP_NAME}.`;
		this.showWarning(`${cause}. Features that load code on demand can fail until restart. ${restart}`);
		return true;
	},

	renderCurrentSessionState(this: InteractiveMode): void {
		this.loadedResourcesContainer.clear();
		this.chatContainer.clear();
		this.pendingMessagesContainer.clear();
		this.pendingBashComponents = [];
		this.compactionQueuedMessages = [];
		this.streamingComponent = undefined;
		this.streamingMessage = undefined;
		this.pendingTools.clear();
		this.renderInitialMessages();
	},

	/**
	 * Get a registered tool definition by name (for custom rendering).
	 */
	/**
	 * Extension-registered definition, falling back to the built-in one. The renderer components take
	 * whatever this returns, so they never reach into the tool registry themselves.
	 */
	getRegisteredToolDefinition(this: InteractiveMode, toolName: string): ToolRenderers | undefined {
		return this.session.extensionRunner.resolveToolRenderers(toolName, () =>
			withBuiltInRenderers(toolName, this.session.getToolDefinition(toolName)),
		);
	},

	getMarkdownTransformers(this: InteractiveMode): MarkdownTransformer[] {
		return [this.mermaidMarkdownTransformer, ...this.session.extensionRunner.getMarkdownTransformers()];
	},

	/** Markdown of a changelog or release note that runs the Markdown transformers of the `changelog` type. */
	createChangelogMarkdown(
		this: InteractiveMode,
		markdown: string,
		paddingX: number,
		paddingY: number,
		defaultTextStyle?: DefaultTextStyle,
	): Markdown {
		return new Markdown(markdown, paddingX, paddingY, this.getMarkdownThemeWithSettings(), defaultTextStyle, {
			transform: createMarkdownTransform("changelog", () => false, this.getMarkdownTransformers()),
		});
	},
};
