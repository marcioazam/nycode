/**
 * InteractiveMode methods, applied to InteractiveMode.prototype in interactive-mode.ts; `this` is the mode.
 */

/**
 * Interactive mode for the coding agent.
 * Handles TUI rendering and user interaction, delegating business logic to AgentSession.
 */

import type { KeyId } from "@nycode/tui";
import { type Component, Container, matchesKey, Spacer, Text, type TUI } from "@nycode/tui";
import type {
	ExtensionContext,
	ExtensionRunner,
	ExtensionWidgetOptions,
	ProjectTrustContext,
	WorkingIndicatorOptions,
} from "../../../core/extensions/index.ts";
import type { ReadonlyFooterDataProvider } from "../../../core/footer-data-provider.ts";
import { AssistantMessageComponent } from "../components/assistant-message.ts";
import { keyText } from "../components/keybinding-hints.ts";
import { type StatusIndicator, WorkingStatusIndicator } from "../components/status-indicator.ts";
import { ThemedText } from "../components/themed-text.ts";
import type { InteractiveMode } from "../interactive-mode.ts";
import { installSendNow, type SendNowHost } from "../send-now/index.ts";
import { type Theme, theme } from "../theme/theme.ts";
import { BuiltInHeader, isEmbeddedStatus, isExpandable } from "./helpers.ts";

/** Most lines a string-array extension widget shows before "... (widget truncated)". */
const MAX_WIDGET_LINES = 10;

/** Extension shortcuts, status, working indicator, widgets, header, footer and terminal input. */
export const extensionChromeMethods = {
	/**
	 * Set up keyboard shortcuts registered by extensions.
	 */
	setupExtensionShortcuts(this: InteractiveMode, extensionRunner: ExtensionRunner): void {
		const shortcuts = extensionRunner.getShortcuts(this.keybindings.getEffectiveConfig());
		if (shortcuts.size === 0) return;

		// Create a context for shortcut handlers
		const createContext = (): ExtensionContext => ({
			ui: this.createExtensionUIContext(),
			mode: "tui",
			hasUI: true,
			cwd: this.sessionManager.getCwd(),
			sessionManager: this.sessionManager,
			modelRegistry: extensionRunner.getModelRegistry(),
			model: this.session.model,
			scopedModels: this.session.scopedModels,
			thinkingLevel: this.session.thinkingLevel,
			isIdle: () => this.session.isIdle,
			isProjectTrusted: () => this.settingsManager.isProjectTrusted(),
			signal: this.session.agent.signal,
			abort: () => {
				this.restoreQueuedMessagesToEditor({ abort: true });
			},
			hasPendingMessages: () => this.session.pendingMessageCount > 0,
			shutdown: () => {
				this.shutdownRequested = true;
			},
			getContextUsage: () => this.session.getContextUsage(),
			compact: (options) => {
				void (async () => {
					try {
						const result = await this.session.compact(options?.customInstructions);
						options?.onComplete?.(result);
					} catch (error) {
						const err = error instanceof Error ? error : new Error(String(error));
						options?.onError?.(err);
					}
				})();
			},
			getSystemPrompt: () => this.session.systemPrompt,
		});

		// Set up the extension shortcut handler on the default editor
		this.defaultEditor.onExtensionShortcut = (data: string) => {
			for (const [shortcutStr, shortcut] of shortcuts) {
				// Cast to KeyId - extension shortcuts use the same format
				if (matchesKey(data, shortcutStr as KeyId)) {
					// Run handler async, don't block input
					Promise.resolve(shortcut.handler(createContext())).catch((err) => {
						this.showError(`Shortcut handler error: ${err instanceof Error ? err.message : String(err)}`);
					});
					return true;
				}
			}
			return false;
		};
	},

	/**
	 * Set extension status text in the footer.
	 */
	setExtensionStatus(this: InteractiveMode, key: string, text: string | undefined): void {
		this.footerDataProvider.setExtensionStatus(key, text);
		this.ui.requestRender();
	},

	setEditorWorkingStatusIndicator(this: InteractiveMode, indicator: StatusIndicator | undefined): boolean {
		this.defaultEditor.setWorkingStatusIndicator(undefined);
		if (!isEmbeddedStatus(this.editor)) return false;
		this.editor.setWorkingStatusIndicator(indicator);
		return true;
	},

	showStatusIndicator(this: InteractiveMode, indicator: StatusIndicator): void {
		this.activeStatusIndicator?.dispose();
		this.activeStatusIndicator = indicator;
		this.activeWorkingIndicatorEmbedded = false;
		this.statusContainer.clear();
		this.setEditorWorkingStatusIndicator(undefined);
		if (this.setEditorWorkingStatusIndicator(indicator)) {
			this.activeWorkingIndicatorEmbedded = true;
			return;
		}
		this.statusContainer.addChild(indicator);
	},

	clearStatusIndicator(this: InteractiveMode, kind?: StatusIndicator["kind"]): void {
		if (kind && this.activeStatusIndicator?.kind !== kind) {
			return;
		}
		const clearedIndicator = this.activeStatusIndicator;
		const clearedIndicatorWasEmbedded = this.activeWorkingIndicatorEmbedded;
		clearedIndicator?.dispose();
		this.activeStatusIndicator = undefined;
		this.activeWorkingIndicatorEmbedded = false;
		this.statusContainer.clear();
		this.setEditorWorkingStatusIndicator(undefined);
		if (
			clearedIndicator &&
			!clearedIndicatorWasEmbedded &&
			this.options.tuiMode === "regular" &&
			this.ui.getClearOnShrink()
		) {
			this.statusContainer.addChild(this.idleStatus);
		}
	},

	showWorkingStatusIndicator(this: InteractiveMode): void {
		const colorFn = isEmbeddedStatus(this.editor)
			? (text: string) =>
					(this.editor.borderColor ?? theme.getThinkingBorderColor(this.session.thinkingLevel || "off"))(text)
			: undefined;
		this.showStatusIndicator(
			new WorkingStatusIndicator(
				this.ui,
				this.workingMessage ?? this.defaultWorkingMessage,
				this.workingIndicatorOptions,
				colorFn,
			),
		);
	},

	setWorkingVisible(this: InteractiveMode, visible: boolean): void {
		this.workingVisible = visible;
		if (!visible) {
			this.clearStatusIndicator("working");
			this.ui.requestRender();
			return;
		}
		if (this.session.isStreaming && this.activeStatusIndicator?.kind !== "working") {
			this.showWorkingStatusIndicator();
		}
		this.ui.requestRender();
	},

	setWorkingIndicator(this: InteractiveMode, options?: WorkingIndicatorOptions): void {
		this.workingIndicatorOptions = options;
		if (this.activeStatusIndicator?.kind === "working") {
			this.activeStatusIndicator.setIndicator(options);
		}
		this.ui.requestRender();
	},

	setHiddenThinkingLabel(this: InteractiveMode, label?: string): void {
		this.hiddenThinkingLabel = label ?? this.defaultHiddenThinkingLabel;
		for (const child of this.chatContainer.children) {
			if (child instanceof AssistantMessageComponent) {
				child.setHiddenThinkingLabel(this.hiddenThinkingLabel);
			}
		}
		if (this.streamingComponent) {
			this.streamingComponent.setHiddenThinkingLabel(this.hiddenThinkingLabel);
		}
		this.ui.requestRender();
	},

	/**
	 * Set an extension widget (string array or custom component).
	 */
	setExtensionWidget(
		this: InteractiveMode,
		key: string,
		content: string[] | ((tui: TUI, thm: Theme) => Component & { dispose?(): void }) | undefined,
		options?: ExtensionWidgetOptions,
	): void {
		const placement = options?.placement ?? "aboveEditor";
		const removeExisting = (map: Map<string, Component & { dispose?(): void }>) => {
			const existing = map.get(key);
			if (existing?.dispose) existing.dispose();
			map.delete(key);
		};

		removeExisting(this.extensionWidgetsAbove);
		removeExisting(this.extensionWidgetsBelow);

		if (content === undefined) {
			this.renderWidgets();
			return;
		}

		let component: Component & { dispose?(): void };

		if (Array.isArray(content)) {
			// Wrap string array in a Container with Text components
			const container = new Container();
			for (const line of content.slice(0, MAX_WIDGET_LINES)) {
				container.addChild(new Text(line, 1, 0));
			}
			if (content.length > MAX_WIDGET_LINES) {
				container.addChild(new ThemedText(() => theme.fg("muted", "... (widget truncated)"), 1, 0));
			}
			component = container;
		} else {
			// Factory function - create component
			component = content(this.ui, theme);
		}

		const targetMap = placement === "belowEditor" ? this.extensionWidgetsBelow : this.extensionWidgetsAbove;
		targetMap.set(key, component);
		this.renderWidgets();
	},

	clearExtensionWidgets(this: InteractiveMode): void {
		for (const widget of this.extensionWidgetsAbove.values()) {
			widget.dispose?.();
		}
		for (const widget of this.extensionWidgetsBelow.values()) {
			widget.dispose?.();
		}
		this.extensionWidgetsAbove.clear();
		this.extensionWidgetsBelow.clear();
		this.renderWidgets();
	},

	/**
	 * Hides the built-in header, footer and editor and holds the chat while extensions bind (startup, session
	 * switch), so a header or footer an extension sets replaces the built-in one unseen.
	 */
	setChromeHidden(this: InteractiveMode, hidden: boolean): void {
		if (this.builtInHeader instanceof BuiltInHeader) {
			this.builtInHeader.hidden = hidden;
			this.chatContainer.held = hidden;
		}
		this.footer.hidden = hidden;
		this.defaultEditor.hidden = hidden;
		this.ui.requestRender();
	},

	resetExtensionUI(this: InteractiveMode): void {
		if (this.extensionDialogs.length > 0) {
			for (const dialog of this.extensionDialogs) {
				dialog.component.dispose?.();
			}
			this.extensionDialogs = [];
			this.showTopExtensionDialog();
		}
		// Reload and session switches replace every extension without calling done(): remove their overlays,
		// newest first, the same way done() does, but leave the promises pending as for inline dialogs.
		for (const removeOverlay of [...this.extensionOverlays.values()].reverse()) removeOverlay();
		this.clearExtensionTerminalInputListeners();
		installSendNow(this as unknown as SendNowHost); // nycode: K22
		this.setExtensionFooter(undefined);
		this.setExtensionHeader(undefined);
		this.clearExtensionWidgets();
		this.footerDataProvider.clearExtensionStatuses();
		this.footer.invalidate();
		this.autocompleteProviderWrappers = [];
		this.setCustomEditorComponent(undefined);
		this.setupAutocompleteProvider();
		this.defaultEditor.onExtensionShortcut = undefined;
		this.updateTerminalTitle();
		this.workingMessage = undefined;
		this.workingVisible = true;
		this.setWorkingIndicator();
		if (this.activeStatusIndicator?.kind === "working") {
			this.activeStatusIndicator.setMessage(
				`${this.defaultWorkingMessage} (${keyText("app.interrupt")} to interrupt)`,
			);
		}
		this.setHiddenThinkingLabel();
	},

	/**
	 * Render all extension widgets to the widget container.
	 */
	renderWidgets(this: InteractiveMode): void {
		if (!this.widgetContainerAbove || !this.widgetContainerBelow) return;
		this.renderWidgetContainer(this.widgetContainerAbove, this.extensionWidgetsAbove, true, true);
		this.renderWidgetContainer(this.widgetContainerBelow, this.extensionWidgetsBelow, false, false);
		this.ui.requestRender();
	},

	renderWidgetContainer(
		this: InteractiveMode,
		container: Container,
		widgets: Map<string, Component & { dispose?(): void }>,
		spacerWhenEmpty: boolean,
		leadingSpacer: boolean,
	): void {
		container.clear();

		if (widgets.size === 0) {
			if (spacerWhenEmpty) {
				container.addChild(new Spacer(1));
			}
			return;
		}

		if (leadingSpacer) {
			container.addChild(new Spacer(1));
		}
		for (const component of widgets.values()) {
			container.addChild(component);
		}
	},

	/**
	 * Set a custom footer component, or restore the built-in footer.
	 */
	setExtensionFooter(
		this: InteractiveMode,
		factory:
			| ((tui: TUI, thm: Theme, footerData: ReadonlyFooterDataProvider) => Component & { dispose?(): void })
			| undefined,
	): void {
		// Dispose existing custom footer
		if (this.customFooter?.dispose) {
			this.customFooter.dispose();
		}

		this.footerContainer.clear();
		if (factory) {
			// Create and add custom footer, passing the data provider
			this.customFooter = factory(this.ui, theme, this.footerDataProvider);
			this.footerContainer.addChild(this.customFooter);
		} else {
			// Restore built-in footer
			this.customFooter = undefined;
			this.footerContainer.addChild(this.footer);
		}

		this.ui.requestRender();
	},

	/**
	 * Set a custom header component, or restore the built-in header.
	 */
	setExtensionHeader(
		this: InteractiveMode,
		factory: ((tui: TUI, thm: Theme) => Component & { dispose?(): void }) | undefined,
	): void {
		// Header may not be initialized yet if called during early initialization
		if (!this.builtInHeader) {
			return;
		}

		// Dispose existing custom header
		if (this.customHeader?.dispose) {
			this.customHeader.dispose();
		}

		// Find the index of the current header in the header container
		const currentHeader = this.customHeader || this.builtInHeader;
		const index = this.headerContainer.children.indexOf(currentHeader);

		if (factory) {
			// Create and add custom header
			this.customHeader = factory(this.ui, theme);
			this.chatContainer.held = false;
			if (isExpandable(this.customHeader)) {
				this.customHeader.setExpanded(this.toolOutputExpanded);
			}
			if (index !== -1) {
				this.headerContainer.children[index] = this.customHeader;
			} else {
				// If not found (e.g. builtInHeader was never added), add at the top
				this.headerContainer.children.unshift(this.customHeader);
			}
		} else {
			// Restore built-in header
			this.customHeader = undefined;
			if (isExpandable(this.builtInHeader)) {
				this.builtInHeader.setExpanded(this.toolOutputExpanded);
			}
			if (index !== -1) {
				this.headerContainer.children[index] = this.builtInHeader;
			}
		}

		this.ui.requestRender();
	},

	addExtensionTerminalInputListener(
		this: InteractiveMode,
		handler: (data: string) => { consume?: boolean; data?: string } | undefined,
	): () => void {
		const subscription = { handler, unsubscribe: this.ui.addInputListener(handler) };
		this.extensionTerminalInputSubscriptions.add(subscription);
		return () => {
			subscription.unsubscribe();
			this.extensionTerminalInputSubscriptions.delete(subscription);
		};
	},

	rebindExtensionTerminalInputListeners(this: InteractiveMode): void {
		for (const subscription of this.extensionTerminalInputSubscriptions) {
			subscription.unsubscribe();
			subscription.unsubscribe = this.ui.addInputListener(subscription.handler);
		}
	},

	clearExtensionTerminalInputListeners(this: InteractiveMode): void {
		for (const subscription of this.extensionTerminalInputSubscriptions) subscription.unsubscribe();
		this.extensionTerminalInputSubscriptions.clear();
	},

	/**
	 * Create the ExtensionUIContext for extensions.
	 */
	createProjectTrustContext(this: InteractiveMode, cwd: string): ProjectTrustContext {
		const ui = this.createExtensionUIContext();
		return {
			cwd,
			mode: "tui",
			hasUI: true,
			ui: {
				select: ui.select,
				confirm: ui.confirm,
				input: ui.input,
				notify: ui.notify,
			},
		};
	},
};
