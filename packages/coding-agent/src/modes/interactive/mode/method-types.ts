/**
 * The signatures of the InteractiveMode methods that live in mode/ and mode-actions/ (merged into the class by module
 * augmentation; Object.assign in interactive-mode.ts adds the implementations). Explicit, because `typeof` the method
 * objects is circular: their `this` is InteractiveMode.
 */

/**
 * Interactive mode for the coding agent.
 * Handles TUI rendering and user interaction, delegating business logic to AgentSession.
 */

import type { AgentMessage, ThinkingLevel } from "@nycode/agent-core";
import type { AuthEvent, AuthPrompt } from "@nycode/ai";
import type { AssistantMessage, Message, Model } from "@nycode/ai/compat";
import type {
	AutocompleteProvider,
	Component,
	Container,
	DefaultTextStyle,
	Keybinding,
	Markdown,
	MarkdownTheme,
	OverlayHandle,
	OverlayOptions,
	TUI,
	TuiAltScreen,
	TuiMainScreen,
} from "@nycode/tui";
import type { AgentSessionEvent } from "../../../core/agent-session.ts";
import type { AgentSessionRuntimeDiagnostic } from "../../../core/agent-session-services.ts";
import type { CacheMiss } from "../../../core/cache-stats.ts";
import type {
	EditorFactory,
	ExtensionCommandContext,
	ExtensionRunner,
	ExtensionUIContext,
	ExtensionUIDialogOptions,
	ExtensionWidgetOptions,
	MarkdownTransformer,
	ProjectTrustContext,
	WorkingIndicatorOptions,
} from "../../../core/extensions/index.ts";
import type { ToolRenderers } from "../../../core/extensions/types.ts";
import type { ReadonlyFooterDataProvider } from "../../../core/footer-data-provider.ts";
import type { AppKeybinding, KeybindingsManager } from "../../../core/keybindings.ts";
import type { ResourceDiagnostic } from "../../../core/resource-loader.ts";
import type { MissingSessionCwdChoice, MissingSessionCwdError } from "../../../core/session-cwd.ts";
import type { SessionEntry, UsageEntry } from "../../../core/session-manager.ts";
import type { FullscreenExitOutput, TuiMode } from "../../../core/settings-manager.ts";
import type { SourceInfo } from "../../../core/source-info.ts";
import type { ToolStatus } from "../../../utils/tools-manager.ts";
import type { LatestNycodeRelease } from "../../../utils/version-check.ts";
import type { LoginDialogComponent } from "../components/login-dialog.ts";
import type { AuthSelectorProvider } from "../components/oauth-selector.ts";
import type { StatusIndicator } from "../components/status-indicator.ts";
import type { BlockedStatus } from "../program-status-reporter.ts";
import type { Theme } from "../theme/theme.ts";
import type {
	CompactionCostNotice,
	ExtensionChangelogUpdate,
	ExtensionDialogComponent,
	RenderSessionItem,
} from "./helpers.ts";

declare module "../interactive-mode.ts" {
	interface InteractiveMode {
		getAutocompleteSourceTag(sourceInfo?: SourceInfo): string | undefined;
		prefixAutocompleteDescription(description: string | undefined, sourceInfo?: SourceInfo): string | undefined;
		getBuiltInCommandConflictDiagnostics(extensionRunner: ExtensionRunner): ResourceDiagnostic[];
		createBaseAutocompleteProvider(): AutocompleteProvider;
		setupAutocompleteProvider(): void;
		showStartupNoticesIfNeeded(): void;
		mountInteractiveTui(tui: TuiMainScreen | TuiAltScreen, components: readonly Component[]): void;
		stopInteractiveTui(fullscreenExitOutput: FullscreenExitOutput): void;
		switchTuiMode(mode: TuiMode, restoreProgress?: boolean, startRenderer?: boolean): boolean;
		checkForPackageUpdates(): Promise<string[]>;
		checkTmuxKeyboardSetup(): Promise<string | undefined>;
		getChangelogForDisplay(): string | undefined;
		getExtensionChangelogUpdates(): ExtensionChangelogUpdate[];
		readPackageJson(packageRoot: string): { name?: string; version?: string } | undefined;
		getMarkdownThemeWithSettings(): MarkdownTheme;
		formatDisplayPath(p: string): string;
		formatExtensionDisplayPath(path: string): string;
		formatContextPath(p: string): string;
		getStartupExpansionState(): boolean;
		shouldShowStartupHeader(): boolean;
		getModelScopeNotice(): string | undefined;
		showFullscreenModelScopeNotice(): void;
		shouldShowStartupDetails(): boolean;
		getShortPath(fullPath: string, sourceInfo?: SourceInfo): string;
		getCompactPathLabel(resourcePath: string, sourceInfo?: SourceInfo): string;
		getCompactPackageSourceLabel(sourceInfo?: SourceInfo): string;
		getCompactExtensionLabel(resourcePath: string, sourceInfo?: SourceInfo): string;
		getCompactDisplayPathSegments(resourcePath: string): string[];
		getCompactNonPackageExtensionLabel(
			resourcePath: string,
			index: number,
			allPaths: Array<{ path: string; segments: string[] }>,
		): string;
		getCompactExtensionLabels(extensions: Array<{ path: string; sourceInfo?: SourceInfo }>): string[];
		getDisplaySourceInfo(sourceInfo?: SourceInfo): {
			label: string;
			scopeLabel?: string;
			color: "accent" | "muted";
		};
		getScopeGroup(sourceInfo?: SourceInfo): "user" | "project" | "path";
		isPackageSource(sourceInfo?: SourceInfo): boolean;
		buildScopeGroups(items: Array<{ path: string; sourceInfo?: SourceInfo }>): Array<{
			scope: "user" | "project" | "path";
			paths: Array<{ path: string; sourceInfo?: SourceInfo }>;
			packages: Map<string, Array<{ path: string; sourceInfo?: SourceInfo }>>;
		}>;
		formatScopeGroups(
			groups: Array<{
				scope: "user" | "project" | "path";
				paths: Array<{ path: string; sourceInfo?: SourceInfo }>;
				packages: Map<string, Array<{ path: string; sourceInfo?: SourceInfo }>>;
			}>,
			options: {
				formatPath: (item: { path: string; sourceInfo?: SourceInfo }) => string;
				formatPackagePath: (item: { path: string; sourceInfo?: SourceInfo }, source: string) => string;
			},
		): string;
		findSourceInfoForPath(p: string, sourceInfos: Map<string, SourceInfo>): SourceInfo | undefined;
		formatPathWithSource(p: string, sourceInfo?: SourceInfo): string;
		formatDiagnostics(diagnostics: readonly ResourceDiagnostic[], sourceInfos: Map<string, SourceInfo>): string;
		showLoadedResources(options?: {
			extensions?: Array<{ path: string; sourceInfo?: SourceInfo }>;
			force?: boolean;
			showDiagnosticsWhenQuiet?: boolean;
		}): void;
		bindCurrentSessionExtensions(): Promise<void>;
		applyFullscreenScrollbarSetting(): void;
		ensurePngTranscoder(): void;
		applyRuntimeSettings(): void;
		showRuntimeDiagnostics(diagnostics: readonly AgentSessionRuntimeDiagnostic[]): void;
		rebindCurrentSession(options?: { renderBeforeBind?: boolean }): Promise<void>;
		handleFatalRuntimeError(prefix: string, error: unknown): Promise<never>;
		getCrashExtensionHint(error: unknown): string | undefined;
		recordCrash(kind: "uncaught_exception" | "fatal_error", error: unknown): boolean;
		crashReportInstructions(): string;
		suggestBugReport(): void;
		maybeSuggestBugReport(message: AssistantMessage): void;
		maybeShowInstallChangeWarning(): boolean;
		renderCurrentSessionState(): void;
		getRegisteredToolDefinition(toolName: string): ToolRenderers | undefined;
		getMarkdownTransformers(): MarkdownTransformer[];
		createChangelogMarkdown(
			markdown: string,
			paddingX: number,
			paddingY: number,
			defaultTextStyle?: DefaultTextStyle,
		): Markdown;
		setupExtensionShortcuts(extensionRunner: ExtensionRunner): void;
		setExtensionStatus(key: string, text: string | undefined): void;
		setEditorWorkingStatusIndicator(indicator: StatusIndicator | undefined): boolean;
		showStatusIndicator(indicator: StatusIndicator): void;
		clearStatusIndicator(kind?: StatusIndicator["kind"]): void;
		showWorkingStatusIndicator(): void;
		setWorkingVisible(visible: boolean): void;
		setWorkingIndicator(options?: WorkingIndicatorOptions): void;
		setHiddenThinkingLabel(label?: string): void;
		setExtensionWidget(
			key: string,
			content: string[] | ((tui: TUI, thm: Theme) => Component & { dispose?(): void }) | undefined,
			options?: ExtensionWidgetOptions,
		): void;
		clearExtensionWidgets(): void;
		setChromeHidden(hidden: boolean): void;
		resetExtensionUI(): void;
		renderWidgets(): void;
		renderWidgetContainer(
			container: Container,
			widgets: Map<string, Component & { dispose?(): void }>,
			spacerWhenEmpty: boolean,
			leadingSpacer: boolean,
		): void;
		setExtensionFooter(
			factory:
				| ((tui: TUI, thm: Theme, footerData: ReadonlyFooterDataProvider) => Component & { dispose?(): void })
				| undefined,
		): void;
		setExtensionHeader(factory: ((tui: TUI, thm: Theme) => Component & { dispose?(): void }) | undefined): void;
		addExtensionTerminalInputListener(
			handler: (data: string) => { consume?: boolean; data?: string } | undefined,
		): () => void;
		rebindExtensionTerminalInputListeners(): void;
		clearExtensionTerminalInputListeners(): void;
		createProjectTrustContext(cwd: string): ProjectTrustContext;
		createExtensionUIContext(): ExtensionUIContext;
		pushExtensionDialog(component: ExtensionDialogComponent, blocked?: BlockedStatus): void;
		removeExtensionDialog(component: ExtensionDialogComponent): void;
		showTopExtensionDialog(): void;
		showExtensionSelector(
			title: string,
			options: string[],
			opts?: ExtensionUIDialogOptions,
			blocked?: BlockedStatus,
		): Promise<string | undefined>;
		showExtensionConfirm(title: string, message: string, opts?: ExtensionUIDialogOptions): Promise<boolean>;
		promptForMissingSessionCwd(error: MissingSessionCwdError): Promise<MissingSessionCwdChoice | undefined>;
		showExtensionInput(
			title: string,
			placeholder?: string,
			opts?: ExtensionUIDialogOptions,
		): Promise<string | undefined>;
		showExtensionEditor(title: string, prefill?: string): Promise<string | undefined>;
		setCustomEditorComponent(factory: EditorFactory | undefined): void;
		showExtensionNotify(message: string, type?: "info" | "warning" | "error"): void;
		showExtensionCustom<T>(
			factory: (
				tui: TUI,
				theme: Theme,
				keybindings: KeybindingsManager,
				done: (result: T) => void,
			) => (Component & { dispose?(): void }) | Promise<Component & { dispose?(): void }>,
			options?: {
				overlay?: boolean;
				overlayOptions?: OverlayOptions | (() => OverlayOptions);
				onHandle?: (handle: OverlayHandle) => void;
				blocked?: BlockedStatus;
			},
		): Promise<T>;
		showExtensionError(extensionPath: string, error: string, stack?: string): void;
		setupKeyHandlers(): void;
		handleRightClickPaste(): Promise<void>;
		handleClipboardPaste(): Promise<void>;
		handleStartupSubmit(text: string): void;
		setupEditorSubmitHandler(): void;
		subscribeToAgent(): void;
		handleEvent(event: AgentSessionEvent): Promise<void>;
		getUserMessageText(message: Message): string;
		showManagedToolStatus(status: ToolStatus): void;
		showStatus(message: string): void;
		addCustomEntryToChat(entry: Extract<SessionEntry, { type: "custom" }>): void;
		addMessageToChat(
			message: AgentMessage,
			options?: { populateHistory?: boolean; messageId?: string; timestamp?: string },
		): void;
		renderSessionItems(
			items: readonly RenderSessionItem[],
			messageMeta?: Map<AgentMessage, { id: string; timestamp: string }>,
			options?: { updateFooter?: boolean; populateHistory?: boolean },
		): void;
		renderSessionEntries(
			entries: SessionEntry[],
			options?: { updateFooter?: boolean; populateHistory?: boolean },
		): void;
		addCacheWarmingUsage(entry: UsageEntry): void;
		addCompactionCostNotice(notice: CompactionCostNotice): void;
		maybeShowThinkingDropNotice(message: AssistantMessage): void;
		maybeShowCacheMissNotice(message: AssistantMessage): void;
		addCacheMissNotice(miss: CacheMiss): void;
		renderInitialMessages(): void;
		renderProjectTrustWarningIfNeeded(): void;
		getUserInput(): Promise<string>;
		rebuildChatFromMessages(): void;
		handleCtrlC(): void;
		handleCtrlD(): void;
		shutdown(options?: { fromSignal?: boolean }): Promise<void>;
		emergencyTerminalExit(): never;
		uncaughtCrash(error: Error): never;
		checkShutdownRequested(): Promise<void>;
		registerSignalHandlers(): void;
		unregisterSignalHandlers(): void;
		handleCtrlZ(): void;
		handleFollowUp(): Promise<void>;
		handleDequeue(): void;
		updateEditorBorderColor(): void;
		cycleThinkingLevel(): void;
		cycleModel(direction: "forward" | "backward"): Promise<void>;
		toggleToolOutputExpansion(): void;
		setToolsExpanded(expanded: boolean): void;
		updateThinkingBlockVisibility(): void;
		toggleThinkingBlockVisibility(): void;
		handleOpenExternalEditor(): Promise<void>;
		clearEditor(): void;
		showError(errorMessage: string): void;
		showWarning(warningMessage: string): void;
		showNewVersionNotification(release: LatestNycodeRelease): void;
		showPackageUpdateNotification(packages: string[]): void;
		getAllQueuedMessages(): { steering: string[]; followUp: string[] };
		clearAllQueues(): { steering: string[]; followUp: string[] };
		updatePendingMessagesDisplay(): void;
		restoreQueuedMessagesToEditor(options?: { abort?: boolean; currentText?: string }): number;
		queueCompactionMessage(text: string, mode: "steer" | "followUp"): void;
		isExtensionCommand(text: string): boolean;
		flushCompactionQueue(options?: { willRetry?: boolean }): Promise<void>;
		flushPendingBashComponents(): void;
		disposeActiveSelector(): void;
		showSelector(
			create: (done: () => void) => { component: Component; focus: Component; dispose?: () => void },
		): void;
		showSettingsSelector(): void;
		handleThinkingCommand(searchTerm?: string): void;
		selectThinkingLevel(level: ThinkingLevel, persist: boolean): void;
		showThinkingSelector(): void;
		handleModelCommand(searchTerm?: string): Promise<void>;
		findExactModelMatch(searchTerm: string): Promise<Model<any> | undefined>;
		updateAvailableProviderCount(): void;
		maybeWarnAboutAnthropicSubscriptionAuth(model?: Model<any> | undefined): Promise<void>;
		maybeSaveImplicitProjectTrustAfterReload(): boolean;
		showTrustSelector(): void;
		showModelSelector(initialSearchInput?: string): void;
		showModelsSelector(): void;
		showUserMessageSelector(): void;
		handleCloneCommand(): Promise<void>;
		showTreeSelector(initialSelectedId?: string): void;
		showSessionSelector(): void;
		handleResumeSession(
			sessionPath: string,
			options?: Parameters<ExtensionCommandContext["switchSession"]>[1],
		): Promise<{ cancelled: boolean }>;
		switchToForkedSession(
			sourcePath: string,
			cwd: string,
			options?: Parameters<ExtensionCommandContext["switchSession"]>[1],
		): Promise<{ cancelled: boolean }>;
		getLoginProviderOptions(authType?: "oauth" | "api_key"): AuthSelectorProvider[];
		getLogoutProviderOptions(): Promise<AuthSelectorProvider[]>;
		handleLoginCommand(providerRef?: string): Promise<void>;
		startProviderLogin(providerOption: AuthSelectorProvider, onBack?: () => void): Promise<void>;
		showLoginAuthTypeSelector(providerOptions?: AuthSelectorProvider[]): void;
		showLoginProviderSelector(authType?: AuthSelectorProvider["authType"], initialSearchInput?: string): void;
		showOAuthSelector(mode: "login" | "logout"): Promise<void>;
		completeProviderAuthentication(
			providerId: string,
			providerName: string,
			authType: "oauth" | "api_key",
			previousModel: Model<any> | undefined,
		): Promise<void>;
		showAmbientAuthDialog(providerOption: AuthSelectorProvider, onBack?: () => void): void;
		showApiKeyLoginDialog(providerId: string, providerName: string, onBack?: () => void): Promise<void>;
		showAuthSelect(
			dialog: LoginDialogComponent,
			prompt: Extract<AuthPrompt, { type: "select" }>,
			providerId: string,
		): Promise<string>;
		showAuthPrompt(dialog: LoginDialogComponent, prompt: AuthPrompt, providerId: string): Promise<string>;
		notifyAuthDialog(dialog: LoginDialogComponent, event: AuthEvent): void;
		loginProvider(
			dialog: LoginDialogComponent,
			providerId: string,
			providerName: string,
			method: "api_key" | "oauth",
		): Promise<void>;
		showLoginDialog(providerId: string, providerName: string, onBack?: () => void): Promise<void>;
		offerRadiusMcpServer(providerId: string, providerName: string): void;
		handleReloadCommand(): Promise<void>;
		handleExportCommand(text: string): Promise<void>;
		getPathCommandArgument(text: string, command: "/export" | "/import"): string | undefined;
		handleImportCommand(text: string): Promise<void>;
		handleShareCommand(): Promise<void>;
		handleBugCommand(hint: string | undefined): Promise<void>;
		handleCopyCommand(options?: { flashConfirmation?: boolean; preferSelection?: boolean }): Promise<void>;
		handleNameCommand(text: string): void;
		handleSessionCommand(): void;
		handleChangelogCommand(): void;
		getAppKeyDisplay(action: AppKeybinding): string;
		getEditorKeyDisplay(action: Keybinding): string;
		handleHotkeysCommand(): void;
		handleClearCommand(): Promise<void>;
		handleDebugCommand(): void;
		handleArminSaysHi(): void;
		handleDementedDelves(): void;
		handleBashCommand(command: string, excludeFromContext?: boolean): Promise<void>;
		handleCompactCommand(customInstructions?: string): Promise<void>;
	}
}
