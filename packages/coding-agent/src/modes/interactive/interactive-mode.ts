/**
 * Interactive mode for the coding agent.
 * Handles TUI rendering and user interaction, delegating business logic to AgentSession.
 */

import * as path from "node:path";
import type { AssistantMessage } from "@nycode/ai/compat";
import type * as TuiLayouts from "@nycode/tui";
import type { AutocompleteProvider, OverlayHandle, TuiMainScreenRenderState } from "@nycode/tui";
import {
	type Component,
	Container,
	Spacer,
	setCapabilityOverrides,
	setKeybindings,
	Text,
	type TUI,
	type TuiAltScreen,
	type TuiMainScreen,
} from "@nycode/tui";
import { APP_NAME, APP_TITLE, getAgentDir, VERSION } from "../../config.ts";
import type { AgentSession } from "../../core/agent-session.ts";
import type { AgentSessionRuntime } from "../../core/agent-session-runtime.ts";
import { takeUnnotifiedCrash } from "../../core/crash-log.ts";
import type {
	AutocompleteProviderFactory,
	EditorFactory,
	MarkdownTransformer,
	WorkingIndicatorOptions,
} from "../../core/extensions/index.ts";
import { FooterDataProvider } from "../../core/footer-data-provider.ts";
import { type AppKeybinding, KeybindingsManager } from "../../core/keybindings.ts";
import { allHighlightLanguagesLoaded } from "../../utils/syntax-highlight.ts";
import { ensureTool } from "../../utils/tools-manager.ts";
import { checkForNewNycodeVersion } from "../../utils/version-check.ts";
import { createChatViewport } from "./chat-viewport.ts";
import type { AssistantMessageComponent } from "./components/assistant-message.ts";
import type { BashExecutionComponent } from "./components/bash-execution.ts";
import { CustomEditor } from "./components/custom-editor.ts";
import { FooterComponent } from "./components/footer.ts";
import { keyHint, keyText, rawKeyHint } from "./components/keybinding-hints.ts";
import { createMermaidMarkdownTransformer } from "./components/mermaid.ts";
import { IdleStatus, type StatusIndicator } from "./components/status-indicator.ts";
import type { ThemedText } from "./components/themed-text.ts";
import type { ToolExecutionComponent } from "./components/tool-execution.ts";
import {
	type ActiveEditor,
	BuiltInHeader,
	type CompactionQueuedMessage,
	type ExtensionChangelogUpdate,
	type ExtensionDialogComponent,
	HeldContainer,
	type InteractiveModeOptions,
} from "./mode/helpers.ts";
import { refreshModelCatalogs } from "./model-catalog-refresh.ts";
import { type BlockedStatus, ProgramStatusReporter } from "./program-status-reporter.ts";
import { initialThemeSetting } from "./theme/nycode-themes.ts";
import { getEditorTheme, onThemeChange, setRegisteredThemes, theme } from "./theme/theme.ts";
import { InteractiveThemeController } from "./theme/theme-controller.ts";
import { createInteractiveTui, createInteractiveTuiReference } from "./tui-renderer.ts";
import "./mode/method-types.ts";
import { extensionChromeMethods } from "./mode/extension-chrome.ts";
import { extensionDialogMethods } from "./mode/extension-dialogs.ts";
import { autocompleteMethods, inputMethods } from "./mode/input.ts";
import { resourcesMethods } from "./mode/resources.ts";
import { startupInfoMethods } from "./mode/startup-info.ts";
import { authMethods } from "./mode-actions/auth.ts";
import { chatMethods } from "./mode-actions/chat.ts";
import { commandMethods } from "./mode-actions/commands.ts";
import { collectWhenIdle, eventMethods, STARTUP_IDLE_GC_DELAY_MS } from "./mode-actions/events.ts";
import { lifecycleMethods } from "./mode-actions/lifecycle.ts";
import { selectorMethods } from "./mode-actions/selectors.ts";
import { sessionSelectorMethods } from "./mode-actions/session-selectors.ts";

export {
	BuiltInHeader,
	formatCrashExtensionHint,
	formatResumeCommand,
	HeldContainer,
	type InteractiveModeOptions,
} from "./mode/helpers.ts";
export { createInteractiveTui, createInteractiveTuiReference } from "./tui-renderer.ts";

export class InteractiveMode {
	runtimeHost: AgentSessionRuntime;
	renderer: TuiMainScreen | TuiAltScreen;
	ui: TUI;
	mainScreenRenderState: TuiMainScreenRenderState | undefined;
	loadedResourcesContainer: Container;
	chatContainer: HeldContainer;
	documentContainer: Container;
	transcriptScrollView: TuiLayouts.ScrollView | undefined;
	fullscreenLayoutRoot: Component | undefined;
	pendingMessagesContainer: Container;
	statusContainer: Container;
	defaultEditor: CustomEditor;
	editor: ActiveEditor;
	editorComponentFactory: EditorFactory | undefined;
	autocompleteProvider: AutocompleteProvider | undefined;
	autocompleteProviderWrappers: AutocompleteProviderFactory[] = [];
	fdPath: string | undefined;
	editorContainer: Container;
	activeSelectorToken?: object;
	activeSelectorDispose?: () => void;
	footer: FooterComponent;
	footerContainer: Container;
	footerDataProvider: FooterDataProvider;
	// Stored so the same manager can be injected into custom editors, selectors, and extension UI.
	keybindings: KeybindingsManager;
	version: string;
	isInitialized = false;
	onInputCallback?: (text: string) => void;
	pendingUserInputs: string[] = [];
	activeStatusIndicator: StatusIndicator | undefined = undefined;
	activeWorkingIndicatorEmbedded = false;
	readonly idleStatus = new IdleStatus();
	workingMessage: string | undefined = undefined;
	workingVisible = true;
	workingIndicatorOptions: WorkingIndicatorOptions | undefined = undefined;
	readonly defaultWorkingMessage = "Working";
	readonly defaultHiddenThinkingLabel = "Thinking...";
	hiddenThinkingLabel = this.defaultHiddenThinkingLabel;

	lastSigintTime = 0;
	lastEscapeTime = 0;
	changelogMarkdown: string | undefined = undefined;
	extensionChangelogUpdates: ExtensionChangelogUpdate[] = [];
	startupNoticesShown = false;
	/** Last cache-warming notice, extended in place while it is the last chat line. */
	cacheWarmingNotice: { component: ThemedText; total: { cost: number }; note: string | undefined } | undefined;
	anthropicSubscriptionWarningShown = false;

	// Status line tracking (for mutating immediately-sequential status updates)
	lastStatusSpacer: Spacer | undefined = undefined;
	lastStatusText: ThemedText | undefined = undefined;
	lastStatusMessage = "";
	managedToolStatusStarted = false;

	// Streaming message tracking
	streamingComponent: AssistantMessageComponent | undefined = undefined;
	readonly entriesRenderedByBoundaryCompaction = new Set<string>();
	streamingMessage: AssistantMessage | undefined = undefined;

	// Tool execution tracking: toolCallId -> component
	pendingTools = new Map<string, ToolExecutionComponent>();

	// Tool output expansion state
	toolOutputExpanded = false;

	// Thinking block visibility state
	hideThinkingBlock = false;
	outputPad = 1;
	readonly mermaidMarkdownTransformer: MarkdownTransformer = createMermaidMarkdownTransformer({
		getMode: () => this.settingsManager.getMermaidRenderingMode(),
		theme,
	});

	// Skill commands: command name -> skill file path
	skillCommands = new Map<string, string>();

	// Agent subscription unsubscribe function
	unsubscribe?: () => void;
	signalCleanupHandlers: Array<() => void> = [];

	// Track if editor is in bash mode (text starts with !)
	isBashMode = false;

	// Track current bash execution component
	bashComponent: BashExecutionComponent | undefined = undefined;

	// Track pending bash components (shown in pending area, moved to chat on submit)
	pendingBashComponents: BashExecutionComponent[] = [];

	// Auto-compaction state
	autoCompactionEscapeHandler?: () => void;

	// Auto-retry state
	retryEscapeHandler?: () => void;

	// Messages queued while compaction is running
	compactionQueuedMessages: CompactionQueuedMessage[] = [];

	// Shutdown state
	shutdownRequested = false;

	/** Reports working, blocked, done, and error states to terminals that support OSC 7501. */
	readonly programStatus = new ProgramStatusReporter(
		() => this.ui.terminal,
		() => this.sessionManager.getSessionName(),
	);

	/** The `/bug` hint is shown at most once per session so error output stays readable. */
	bugReportHintShown = false;
	installChangeWarningShown = false;

	// Extension UI state
	// Extension dialogs shown in the editor slot (select, confirm, input, editor, inline custom).
	// The last entry is visible; see pushExtensionDialog().
	extensionDialogs: Array<{ component: ExtensionDialogComponent; blocked: BlockedStatus | undefined }> = [];
	/** Numbers the program status sources of blocking overlays, so closing one keeps the others. */
	nextBlockingOverlayId = 0;
	/**
	 * Open extension overlays (custom with overlay: true) and the function that removes each, in opening
	 * order. Reset removes only these, not nycode's own overlays.
	 */
	readonly extensionOverlays = new Map<OverlayHandle, () => void>();
	extensionTerminalInputSubscriptions = new Set<{
		handler: (data: string) => { consume?: boolean; data?: string } | undefined;
		unsubscribe: () => void;
	}>();

	// Extension widgets (components rendered above/below the editor)
	extensionWidgetsAbove = new Map<string, Component & { dispose?(): void }>();
	extensionWidgetsBelow = new Map<string, Component & { dispose?(): void }>();
	widgetContainerAbove!: Container;
	widgetContainerBelow!: Container;

	// Custom footer from extension (undefined = use built-in footer)
	customFooter: (Component & { dispose?(): void }) | undefined = undefined;

	// Header container that holds the built-in or custom header
	headerContainer: Container;

	// Built-in header (logo + keybinding hints + changelog)
	builtInHeader: Component | undefined = undefined;

	// Custom header from extension (undefined = use built-in header)
	customHeader: (Component & { dispose?(): void }) | undefined = undefined;

	options: InteractiveModeOptions;
	readonly onRightClickPaste = (): void => {
		void this.handleRightClickPaste();
	};
	autoTrustOnReloadCwd: string | undefined;
	themeController: InteractiveThemeController;

	// Convenience accessors
	get session(): AgentSession {
		return this.runtimeHost.session;
	}
	get agent() {
		return this.session.agent;
	}
	get sessionManager() {
		return this.session.sessionManager;
	}
	get settingsManager() {
		return this.session.settingsManager;
	}

	constructor(runtimeHost: AgentSessionRuntime, options: InteractiveModeOptions = {}) {
		this.runtimeHost = runtimeHost;
		setCapabilityOverrides(this.settingsManager.getTerminalCapabilityOverrides());
		const tuiMode = options.tuiMode ?? this.settingsManager.getTuiMode();
		this.options = { ...options, tuiMode };
		this.autoTrustOnReloadCwd = options.autoTrustOnReloadCwd;
		this.runtimeHost.setBeforeSessionInvalidate(() => {
			this.resetExtensionUI();
			// Session switch (/clear, /new, /resume, /fork): blank until the new session's extensions set their
			// header and footer, instead of flashing the built-in ones while the runtime loads.
			if (!this.isShuttingDown) this.setChromeHidden(true);
		});
		this.runtimeHost.setRebindSession(async () => {
			try {
				await this.rebindCurrentSession({ renderBeforeBind: true });
			} finally {
				this.setChromeHidden(false);
			}
			this.themeController.applyFromSettings();
			this.showRuntimeDiagnostics(this.runtimeHost.takeUnreportedDiagnostics());
		});
		this.version = VERSION;
		this.renderer = createInteractiveTui({
			tuiMode,
			showHardwareCursor: this.settingsManager.getShowHardwareCursor(),
			logDirectory: getAgentDir(),
			terminal: options.terminal,
			onRightClickPaste: this.onRightClickPaste,
			fullscreenCopyOnSelect: this.settingsManager.getFullscreenCopyOnSelect(),
			fullscreenWheelScrollLines: this.settingsManager.getFullscreenWheelScrollLines(),
		});
		this.ui = createInteractiveTuiReference(() => this.renderer);
		this.ui.setClearOnShrink(this.settingsManager.getClearOnShrink());
		this.headerContainer = new Container();
		this.loadedResourcesContainer = new Container();
		this.chatContainer = new HeldContainer();
		this.documentContainer = new Container();
		this.documentContainer.addChild(this.headerContainer);
		this.documentContainer.addChild(this.loadedResourcesContainer);
		this.documentContainer.addChild(this.chatContainer);
		this.pendingMessagesContainer = new Container();
		this.statusContainer = new Container();
		this.widgetContainerAbove = new Container();
		this.widgetContainerBelow = new Container();
		this.keybindings = KeybindingsManager.create();
		setKeybindings(this.keybindings);
		const editorPaddingX = this.settingsManager.getEditorPaddingX();
		const autocompleteMaxVisible = this.settingsManager.getAutocompleteMaxVisible();
		this.defaultEditor = new CustomEditor(this.ui, getEditorTheme(), this.keybindings, {
			paddingX: editorPaddingX,
			autocompleteMaxVisible,
			embedWorkingStatus: true,
		});
		this.editor = this.defaultEditor;
		this.editorContainer = new Container();
		this.editorContainer.addChild(this.editor as Component);
		this.footerDataProvider = new FooterDataProvider(this.sessionManager.getCwd());
		this.footer = new FooterComponent(this.session, this.footerDataProvider);
		this.footer.setAutoCompactEnabled(this.session.autoCompactionEnabled);
		this.footerContainer = new Container();
		this.footerContainer.addChild(this.footer);

		// Load hide thinking block setting
		this.hideThinkingBlock = this.settingsManager.getHideThinkingBlock();
		this.outputPad = this.settingsManager.getOutputPad();

		// Register themes from resource loader and initialize
		setRegisteredThemes(this.session.resourceLoader.getThemes().themes);
		this.themeController = new InteractiveThemeController(this.ui, {
			getSettingsManager: () => this.settingsManager,
			showError: (message) => this.showError(message),
			onChanged: () => this.updateEditorBorderColor(),
			// nycode: K4 tokyo-night is the session theme when none is chosen (not saved to settings.json)
			initialThemeSetting: initialThemeSetting(options.initialThemeSetting, this.settingsManager.getThemeSetting()),
		});
	}

	async init(): Promise<void> {
		if (this.isInitialized) return;

		this.registerSignalHandlers();

		// Load changelogs (only show new entries, skip for resumed sessions)
		this.changelogMarkdown = this.getChangelogForDisplay();
		this.extensionChangelogUpdates = this.getExtensionChangelogUpdates();

		// Fullscreen renders on the alternate screen, so text printed to stdout here would stay in the shell
		// after exit. Fullscreen shows the notice in the header instead (#11508).
		if (this.renderer.mode !== "fullscreen") {
			const modelScopeNotice = this.getModelScopeNotice();
			if (modelScopeNotice) console.log(modelScopeNotice);
		}

		// Keep one component tree and remount it when changing renderers.
		this.renderWidgets(); // Initialize with default spacer
		const viewport = createChatViewport({
			document: this.documentContainer,
			pendingMessages: this.pendingMessagesContainer,
			status: this.statusContainer,
			widgetsAbove: this.widgetContainerAbove,
			editor: this.editorContainer,
			widgetsBelow: this.widgetContainerBelow,
			footer: this.footerContainer,
			scrollbar: this.settingsManager.getFullscreenScrollbar(),
			scrollbarTrackStyle: (text) => theme.fg("scrollbarTrack", text),
			scrollbarThumbStyle: (text) => theme.fg("scrollbarThumb", text),
		});
		this.transcriptScrollView = viewport.transcript;
		this.fullscreenLayoutRoot = viewport.root;
		this.mountInteractiveTui(this.renderer, [
			this.documentContainer,
			this.pendingMessagesContainer,
			this.statusContainer,
			this.widgetContainerAbove,
			this.editorContainer,
			this.widgetContainerBelow,
			this.footerContainer,
		]);
		// Accept text while startup completes, but only enable interrupt, exit, and submission feedback.
		this.defaultEditor.onAction("app.clear", () => this.handleCtrlC());
		this.defaultEditor.onCtrlD = () => this.handleCtrlD();
		this.defaultEditor.onSubmit = (text) => this.handleStartupSubmit(text);
		this.ui.setFocus(this.editor);

		// An external SIGTSTP (kill -TSTP) restores the terminal like Ctrl+Z (#12272).
		this.ui.setSuspendSignalHandler(() => this.handleCtrlZ());
		// The footer and ui extensions set the nycode footer and editor on session_start; drawing the built-in ones first flashed them.
		this.footer.hidden = true;
		this.defaultEditor.hidden = true;
		// Start the UI before initializing extensions so session_start handlers can use interactive dialogs
		this.ui.start();
		this.isInitialized = true;
		this.programStatus.report();
		this.ensurePngTranscoder();

		this.themeController.applyFromSettings();
		// The header and startup notices bake theme colors into their text, so build them once the terminal
		// reported its colors. This ends at the terminal's DA1 reply, or after 100 ms if it answers nothing.
		await this.themeController.waitForTerminalColors();

		// Add header with keybindings from config (unless silenced)
		if (this.shouldShowStartupHeader()) {
			const showDetails = this.shouldShowStartupDetails();
			// Built on demand so the header follows theme changes: a "nycode vX" line, the key hints below it.
			const withLogo = (hints: string) =>
				`${theme.bold(theme.fg("text", "nycode"))} ${theme.fg("dim", `v${this.version}`)}\n${hints}`;

			// Build startup instructions using keybinding hint helpers
			const hint = (keybinding: AppKeybinding, description: string) => keyHint(keybinding, description);

			const expandedInstructions = () =>
				[
					hint("app.interrupt", "to interrupt"),
					hint("app.clear", "to clear"),
					rawKeyHint(`${keyText("app.clear")} twice`, "to exit"),
					hint("app.exit", "to exit (empty)"),
					hint("app.suspend", "to suspend"),
					keyHint("tui.editor.deleteToLineEnd", "to delete to end"),
					hint("app.thinking.cycle", "to cycle thinking level"),
					rawKeyHint(
						`${keyText("app.model.cycleForward")}/${keyText("app.model.cycleBackward")}`,
						"to cycle models",
					),
					hint("app.model.select", "to select model"),
					hint("app.tools.expand", "to expand tools"),
					hint("app.thinking.toggle", "to expand thinking"),
					hint("app.editor.external", "for external editor"),
					rawKeyHint("/", "for commands"),
					rawKeyHint("!", "to run bash"),
					rawKeyHint("!!", "to run bash (no context)"),
					hint("app.message.followUp", "to queue follow-up"),
					hint("app.message.dequeue", "to edit all queued messages"),
					hint("app.clipboard.pasteImage", "to paste files on macOS, images, or text"),
					rawKeyHint("drop files", "to attach"),
				].join("\n");
			const compactInstructions = () =>
				[
					hint("app.interrupt", "interrupt"),
					rawKeyHint(`${keyText("app.clear")}/${keyText("app.exit")}`, "clear/exit"),
					rawKeyHint("/", "commands"),
					rawKeyHint("!", "bash"),
					hint("app.tools.expand", "more"),
				].join(theme.fg("muted", " · "));
			const compactOnboarding = () =>
				theme.fg(
					"dim",
					`Press ${keyText("app.tools.expand")} to show full startup help${showDetails ? " and loaded resources" : ""}.`,
				);
			const onboarding = () =>
				theme.fg(
					"dim",
					`Nycode can explain its own features and look up its docs. Ask it how to use or extend Nycode.`,
				);
			const header = new BuiltInHeader(
				() => `${withLogo(compactInstructions())}\n${compactOnboarding()}\n\n${onboarding()}`,
				() => `${withLogo(expandedInstructions())}\n\n${onboarding()}`,
				this.getStartupExpansionState(),
				1,
				0,
			);
			// The ui-visual extension sets the nycode header on session_start; drawing this one first flashed it.
			header.hidden = true;
			this.chatContainer.held = true;
			this.builtInHeader = header;

			// Setup UI layout. No spacer above: the nycode mark's top rows are already mostly blank.
			this.headerContainer.addChild(this.builtInHeader);
			this.headerContainer.addChild(new Spacer(1));
		} else {
			// Minimal header when silenced
			this.builtInHeader = new Text("", 0, 0);
			this.headerContainer.addChild(this.builtInHeader);
		}
		if (this.renderer.mode === "fullscreen") this.showFullscreenModelScopeNotice();
		this.ui.requestRender();

		// Ensure fd and rg are available after mounting the TUI (downloads if missing, adds to PATH via getBinDir)
		// so slow downloads do not make startup appear frozen.
		// Both are needed: fd for autocomplete, rg for grep tool and bash commands.
		const [fdPath] = await Promise.all([
			ensureTool("fd", (status) => this.showManagedToolStatus(status)),
			ensureTool("rg", (status) => this.showManagedToolStatus(status)),
		]);
		this.fdPath = fdPath;

		// Enable the remaining input handlers only after managed-tool setup completes.
		this.setupKeyHandlers();
		this.setupEditorSubmitHandler();
		this.ui.requestRender();

		// Initialize extensions first so resources are shown before messages
		try {
			await this.rebindCurrentSession();
		} finally {
			// Without an extension header, footer or editor (NO_COLOR, extension disabled) the built-in ones show from here on.
			this.setChromeHidden(false);
		}

		// Render initial messages AFTER showing loaded resources
		this.renderInitialMessages();

		// Set up theme file watcher
		onThemeChange(() => {
			this.ui.invalidate();
			this.updateEditorBorderColor();
			this.ui.requestRender();
		});

		// Set up git branch watcher (uses provider instead of footer)
		this.footerDataProvider.onBranchChange(() => {
			this.ui.requestRender();
		});

		// Initialize available provider count for footer display
		await this.updateAvailableProviderCount();

		this.ui.renderNow();
		collectWhenIdle(STARTUP_IDLE_GC_DELAY_MS);
		// The remaining grammars load when a render first asks for one; redraw with them once they are registered.
		void allHighlightLanguagesLoaded.then(() => {
			if (!this.isInitialized) return;
			this.ui.invalidate();
			this.ui.requestRender();
		});
	}

	/**
	 * Update terminal title with session name and cwd.
	 */
	updateTerminalTitle(): void {
		const cwdBasename = path.basename(this.sessionManager.getCwd());
		const sessionName = this.sessionManager.getSessionName();
		if (sessionName) {
			this.ui.terminal.setTitle(`${APP_TITLE} - ${sessionName} - ${cwdBasename}`);
		} else {
			this.ui.terminal.setTitle(`${APP_TITLE} - ${cwdBasename}`);
		}
	}

	/**
	 * Run the interactive mode. This is the main entry point.
	 * Initializes the UI, shows warnings, processes initial messages, and starts the interactive loop.
	 */
	async run(): Promise<void> {
		await this.init();

		if (!process.env.NYCODE_OFFLINE) {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), 15_000);
			void refreshModelCatalogs(this.session.modelRuntime, controller.signal)
				.then(() => this.updateAvailableProviderCount())
				.catch(() => {})
				.finally(() => clearTimeout(timeout));
		}

		// Start version check asynchronously
		checkForNewNycodeVersion(this.version).then((newRelease) => {
			if (newRelease) {
				this.showNewVersionNotification(newRelease);
			}
		});

		// Start package update check asynchronously
		this.checkForPackageUpdates()
			.then((updates) => {
				if (updates.length > 0) {
					this.showPackageUpdateNotification(updates);
				}
			})
			.finally(() => {
				// On Windows, npm can overwrite the shared console title while checking
				// extension package versions. Restore Nycode's title after the startup check.
				if (process.platform === "win32" && this.isInitialized) {
					this.updateTerminalTitle();
				}
			});

		// Check tmux keyboard setup asynchronously
		this.checkTmuxKeyboardSetup().then((warning) => {
			if (warning) {
				this.showWarning(warning);
			}
		});

		// Show startup warnings
		const {
			migratedProviders,
			startupDiagnostics,
			modelFallbackMessage,
			initialMessage,
			initialImages,
			initialMessages,
		} = this.options;

		this.showRuntimeDiagnostics(startupDiagnostics ?? []);

		if (migratedProviders && migratedProviders.length > 0) {
			this.showWarning(`Migrated credentials to auth.json: ${migratedProviders.join(", ")}`);
		}

		const modelsJsonError = this.session.modelRuntime.getError();
		if (modelsJsonError) {
			this.showError(`models.json error: ${modelsJsonError}`);
		}

		if (modelFallbackMessage) {
			this.showWarning(modelFallbackMessage);
		}

		const crash = takeUnnotifiedCrash();
		if (crash) {
			const when = new Date(crash.timestamp).toLocaleString();
			this.showWarning(
				`${APP_NAME} crashed on ${when} (${crash.message}). Run /bug to report it; the crash details are attached automatically.`,
			);
		}

		void this.maybeWarnAboutAnthropicSubscriptionAuth();

		// Process initial messages
		if (initialMessage) {
			try {
				await this.session.prompt(initialMessage, { images: initialImages });
			} catch (error: unknown) {
				const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
				this.showError(errorMessage);
			}
		}

		if (initialMessages) {
			for (const message of initialMessages) {
				try {
					await this.session.prompt(message);
				} catch (error: unknown) {
					const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
					this.showError(errorMessage);
				}
			}
		}

		// Main interactive loop
		while (true) {
			const userInput = await this.getUserInput();
			try {
				await this.session.prompt(userInput);
			} catch (error: unknown) {
				const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
				this.showError(errorMessage);
			}
		}
	}

	/**
	 * Gracefully shutdown the agent.
	 * Stops the TUI before emitting shutdown events so extension UI cleanup cannot
	 * repaint the final frame while the process is exiting.
	 */
	isShuttingDown = false;

	stop(fullscreenExitOutput = this.settingsManager.getFullscreenExitOutput()): void {
		this.disposeActiveSelector();
		if (this.settingsManager.getShowTerminalProgress()) {
			this.ui.terminal.setProgress(false);
		}
		this.clearStatusIndicator();
		this.themeController.disableAutoSync();
		this.clearExtensionTerminalInputListeners();
		this.footer.dispose();
		this.footerDataProvider.dispose();
		if (this.unsubscribe) {
			this.unsubscribe();
		}
		if (this.isInitialized) {
			this.stopInteractiveTui(fullscreenExitOutput);
			this.isInitialized = false;
		}
		this.unregisterSignalHandlers();
	}
}

// The methods live in mode/ and mode-actions/ by domain (an 800-line file limit); they are applied to the prototype here.
Object.assign(
	InteractiveMode.prototype,
	autocompleteMethods,
	startupInfoMethods,
	resourcesMethods,
	extensionChromeMethods,
	extensionDialogMethods,
	inputMethods,
	eventMethods,
	chatMethods,
	lifecycleMethods,
	selectorMethods,
	sessionSelectorMethods,
	authMethods,
	commandMethods,
);
