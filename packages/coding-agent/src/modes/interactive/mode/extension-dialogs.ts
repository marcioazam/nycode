/**
 * InteractiveMode methods, applied to InteractiveMode.prototype in interactive-mode.ts; `this` is the mode.
 */

/**
 * Interactive mode for the coding agent.
 * Handles TUI rendering and user interaction, delegating business logic to AgentSession.
 */

import type { Component, OverlayHandle, OverlayOptions, TUI } from "@nycode/tui";
import type { EditorFactory, ExtensionUIContext, ExtensionUIDialogOptions } from "../../../core/extensions/index.ts";
import type { KeybindingsManager } from "../../../core/keybindings.ts";
import {
	formatMissingSessionCwdPrompt,
	getMissingSessionCwdOptions,
	type MissingSessionCwdChoice,
	type MissingSessionCwdError,
} from "../../../core/session-cwd.ts";
import * as avisos from "../avisos/index.ts";
import { ExtensionEditorComponent } from "../components/extension-editor.ts";
import { ExtensionInputComponent } from "../components/extension-input.ts";
import { ExtensionSelectorComponent } from "../components/extension-selector.ts";
import { ThemedText } from "../components/themed-text.ts";
import type { InteractiveMode } from "../interactive-mode.ts";
import type { BlockedStatus } from "../program-status-reporter.ts";
import { getAvailableThemesWithPaths, getEditorTheme, getThemeByName, Theme, theme } from "../theme/theme.ts";
import type { ExtensionDialogComponent } from "./helpers.ts";

/** The extension UI context and its dialogs: selector, confirm, input, editor, custom and notify. */
export const extensionDialogMethods = {
	createExtensionUIContext(this: InteractiveMode): ExtensionUIContext {
		return {
			select: (title, options, opts) => this.showExtensionSelector(title, options, opts),
			confirm: (title, message, opts) => this.showExtensionConfirm(title, message, opts),
			input: (title, placeholder, opts) => this.showExtensionInput(title, placeholder, opts),
			notify: (message, type) => this.showExtensionNotify(message, type),
			onTerminalInput: (handler) => this.addExtensionTerminalInputListener(handler),
			setStatus: (key, text) => this.setExtensionStatus(key, text),
			setWorkingMessage: (message) => {
				this.workingMessage = message;
				if (this.activeStatusIndicator?.kind === "working") {
					this.activeStatusIndicator.setMessage(message ?? this.defaultWorkingMessage);
				}
			},
			setWorkingVisible: (visible) => this.setWorkingVisible(visible),
			setWorkingIndicator: (options) => this.setWorkingIndicator(options),
			setHiddenThinkingLabel: (label) => this.setHiddenThinkingLabel(label),
			setWidget: (key, content, options) => this.setExtensionWidget(key, content, options),
			setFooter: (factory) => this.setExtensionFooter(factory),
			setHeader: (factory) => this.setExtensionHeader(factory),
			setTitle: (title) => this.ui.terminal.setTitle(title),
			custom: (factory, options) => this.showExtensionCustom(factory, options),
			pasteToEditor: (text) => {
				this.editor.handleInput(`\x1b[200~${text}\x1b[201~`);
				this.ui.requestRender();
			},
			setEditorText: (text) => {
				this.editor.setText(text);
				this.ui.requestRender();
			},
			getEditorText: () => this.editor.getExpandedText?.() ?? this.editor.getText(),
			editor: (title, prefill) => this.showExtensionEditor(title, prefill),
			addAutocompleteProvider: (factory) => {
				this.autocompleteProviderWrappers.push(factory);
				this.setupAutocompleteProvider();
			},
			setEditorComponent: (factory) => this.setCustomEditorComponent(factory),
			getEditorComponent: () => this.editorComponentFactory,
			get theme() {
				return theme;
			},
			getAllThemes: () => getAvailableThemesWithPaths(),
			getTheme: (name) => getThemeByName(name),
			setTheme: (themeOrName) => {
				if (themeOrName instanceof Theme) {
					return this.themeController.setThemeInstance(themeOrName);
				}
				const result = this.themeController.setThemeName(themeOrName);
				if (result.success) {
					if (this.settingsManager.getTheme() !== themeOrName) {
						this.settingsManager.setTheme(themeOrName);
					}
				}
				return result;
			},
			getToolsExpanded: () => this.toolOutputExpanded,
			setToolsExpanded: (expanded) => this.setToolsExpanded(expanded),
		};
	},

	/**
	 * Show an extension dialog in the editor slot.
	 * Dialogs form a stack: a new dialog hides the visible one, and closing the visible dialog shows
	 * the previous one again. Every dialog stays answerable, so no dialog promise is left pending,
	 * and dialogs opened from inside another dialog (for example a confirm from a custom component) work.
	 */
	pushExtensionDialog(this: InteractiveMode, component: ExtensionDialogComponent, blocked?: BlockedStatus): void {
		this.disposeActiveSelector();
		this.extensionDialogs.push({ component, blocked });
		this.showTopExtensionDialog();
	},

	/** Remove an extension dialog. If it was visible, show the previous dialog or the editor. */
	removeExtensionDialog(this: InteractiveMode, component: ExtensionDialogComponent): void {
		const index = this.extensionDialogs.findIndex((dialog) => dialog.component === component);
		if (index === -1) return;
		this.extensionDialogs.splice(index, 1);
		if (index === this.extensionDialogs.length) this.showTopExtensionDialog();
	},

	showTopExtensionDialog(this: InteractiveMode): void {
		const top = this.extensionDialogs.at(-1);
		const component = top?.component ?? this.editor;
		this.editorContainer.clear();
		this.editorContainer.addChild(component);
		this.ui.setFocus(component);
		this.programStatus.setBlocked("extension-dialog", top?.blocked);
		this.ui.requestRender();
	},

	/**
	 * Show a selector for extensions.
	 */
	showExtensionSelector(
		this: InteractiveMode,
		title: string,
		options: string[],
		opts?: ExtensionUIDialogOptions,
		blocked: BlockedStatus = { kind: "question", message: title },
	): Promise<string | undefined> {
		return new Promise((resolve) => {
			if (opts?.signal?.aborted) {
				resolve(undefined);
				return;
			}

			const finish = (option: string | undefined) => {
				opts?.signal?.removeEventListener("abort", onAbort);
				selector.dispose();
				this.removeExtensionDialog(selector);
				resolve(option);
			};
			const onAbort = () => finish(undefined);
			opts?.signal?.addEventListener("abort", onAbort, { once: true });

			const selector = new ExtensionSelectorComponent(
				title,
				options,
				(option) => finish(option),
				() => finish(undefined),
				{ tui: this.ui, timeout: opts?.timeout, onToggleToolsExpanded: () => this.toggleToolOutputExpansion() },
			);
			this.pushExtensionDialog(selector, blocked);
		});
	},

	/**
	 * Show a confirmation dialog for extensions.
	 */
	async showExtensionConfirm(
		this: InteractiveMode,
		title: string,
		message: string,
		opts?: ExtensionUIDialogOptions,
	): Promise<boolean> {
		const result = await this.showExtensionSelector(`${title}\n${message}`, ["Yes", "No"], opts, {
			kind: "permission",
			message: title,
		});
		return result === "Yes";
	},

	async promptForMissingSessionCwd(
		this: InteractiveMode,
		error: MissingSessionCwdError,
	): Promise<MissingSessionCwdChoice | undefined> {
		const options = getMissingSessionCwdOptions(error.issue);
		const label = await this.showExtensionSelector(
			formatMissingSessionCwdPrompt(error.issue),
			options.map((option) => option.label),
		);
		return options.find((option) => option.label === label)?.value;
	},

	/**
	 * Show a text input for extensions.
	 */
	showExtensionInput(
		this: InteractiveMode,
		title: string,
		placeholder?: string,
		opts?: ExtensionUIDialogOptions,
	): Promise<string | undefined> {
		return new Promise((resolve) => {
			if (opts?.signal?.aborted) {
				resolve(undefined);
				return;
			}

			const finish = (value: string | undefined) => {
				opts?.signal?.removeEventListener("abort", onAbort);
				input.dispose();
				this.removeExtensionDialog(input);
				resolve(value);
			};
			const onAbort = () => finish(undefined);
			opts?.signal?.addEventListener("abort", onAbort, { once: true });

			const input = new ExtensionInputComponent(
				title,
				placeholder,
				(value) => finish(value),
				() => finish(undefined),
				{ tui: this.ui, timeout: opts?.timeout },
			);
			this.pushExtensionDialog(input, { kind: "question", message: title });
		});
	},

	/**
	 * Show a multi-line editor for extensions (with Ctrl+G support).
	 */
	showExtensionEditor(this: InteractiveMode, title: string, prefill?: string): Promise<string | undefined> {
		return new Promise((resolve) => {
			const finish = (value: string | undefined) => {
				this.removeExtensionDialog(editor);
				resolve(value);
			};
			const editor = new ExtensionEditorComponent(
				this.ui,
				this.keybindings,
				title,
				prefill,
				(value) => finish(value),
				() => finish(undefined),
				undefined,
				this.settingsManager.getExternalEditorCommand(),
			);
			this.pushExtensionDialog(editor, { kind: "question", message: title });
		});
	},

	/**
	 * Set a custom editor component from an extension.
	 * Pass undefined to restore the default editor.
	 */
	setCustomEditorComponent(this: InteractiveMode, factory: EditorFactory | undefined): void {
		this.editorComponentFactory = factory;

		// Save text from current editor before switching
		const currentText = this.editor.getExpandedText?.() ?? this.editor.getText();

		// An open extension dialog keeps the editor slot; the new editor is shown when the last dialog closes.
		const dialogOpen = this.extensionDialogs.length > 0;
		if (!dialogOpen) {
			this.disposeActiveSelector();
			this.editorContainer.clear();
		}

		if (factory) {
			// Create the custom editor with tui, theme, and keybindings
			const newEditor = factory(this.ui, getEditorTheme(), this.keybindings);

			// Wire up callbacks from the default editor
			newEditor.onSubmit = this.defaultEditor.onSubmit;
			newEditor.onChange = this.defaultEditor.onChange;

			// Copy text from previous editor
			newEditor.setText(currentText);

			// Copy appearance settings if supported
			if (newEditor.borderColor !== undefined) {
				newEditor.borderColor = this.defaultEditor.borderColor;
			}
			if (newEditor.setPaddingX !== undefined) {
				newEditor.setPaddingX(this.defaultEditor.getPaddingX());
			}
			if (newEditor.setAutocompleteMaxVisible !== undefined) {
				newEditor.setAutocompleteMaxVisible(this.defaultEditor.getAutocompleteMaxVisible());
			}

			// Set autocomplete if supported
			if (newEditor.setAutocompleteProvider && this.autocompleteProvider) {
				newEditor.setAutocompleteProvider(this.autocompleteProvider);
			}

			// If extending CustomEditor, copy app-level handlers
			// Use duck typing since instanceof fails across jiti module boundaries
			const customEditor = newEditor as unknown as Record<string, unknown>;
			if ("actionHandlers" in customEditor && customEditor.actionHandlers instanceof Map) {
				if (!customEditor.onEscape) {
					customEditor.onEscape = () => this.defaultEditor.onEscape?.();
				}
				if (!customEditor.onCtrlD) {
					customEditor.onCtrlD = () => this.defaultEditor.onCtrlD?.();
				}
				if (!customEditor.onPasteImage) {
					customEditor.onPasteImage = () => this.defaultEditor.onPasteImage?.();
				}
				if (!customEditor.onExtensionShortcut) {
					customEditor.onExtensionShortcut = (data: string) => this.defaultEditor.onExtensionShortcut?.(data);
				}
				// Copy action handlers (clear, suspend, model switching, etc.)
				for (const [action, handler] of this.defaultEditor.actionHandlers) {
					(customEditor.actionHandlers as Map<string, () => void>).set(action, handler);
				}
			}

			this.editor = newEditor;
		} else {
			// Restore default editor with text from custom editor
			this.defaultEditor.setText(currentText);
			this.editor = this.defaultEditor;
		}

		if (!dialogOpen) this.editorContainer.addChild(this.editor as Component);
		if (this.activeStatusIndicator) {
			this.statusContainer.clear();
			this.activeWorkingIndicatorEmbedded = this.setEditorWorkingStatusIndicator(this.activeStatusIndicator);
			if (!this.activeWorkingIndicatorEmbedded) {
				this.statusContainer.addChild(this.activeStatusIndicator);
			}
		}
		if (!dialogOpen) this.ui.setFocus(this.editor as Component);
		this.ui.requestRender();
	},

	/**
	 * Show a notification for extensions.
	 */
	showExtensionNotify(this: InteractiveMode, message: string, type?: "info" | "warning" | "error"): void {
		if (avisos.caixaNeutra(this, message, type)) return; // nycode: K17
		if (type === "error") {
			this.showError(message);
		} else if (type === "warning") {
			this.showWarning(message);
		} else {
			this.showStatus(message);
		}
	},

	/** Show a custom component with keyboard focus. Overlay mode renders on top of existing content. */
	async showExtensionCustom<T>(
		this: InteractiveMode,
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
	): Promise<T> {
		const savedText = this.editor.getExpandedText?.() ?? this.editor.getText();
		const isOverlay = options?.overlay ?? false;

		return new Promise((resolve, reject) => {
			let component: ExtensionDialogComponent | undefined;
			let overlayHandle: OverlayHandle | undefined;
			// An overlay stays blocked until its interaction ends, also while setHidden() hides it.
			const overlayStatusSource =
				isOverlay && options?.blocked ? `extension-overlay:${this.nextBlockingOverlayId++}` : undefined;
			let closed = false;

			const restoreEditor = () => {
				if (component) this.removeExtensionDialog(component);
				this.editor.setText(savedText);
				this.ui.requestRender();
			};

			const disposeComponent = () => {
				try {
					component?.dispose?.();
				} catch {
					/* ignore dispose errors */
				}
			};

			// Shared by done() and resetExtensionUI(). Removing the map entry first makes a second call a no-op.
			const removeOverlay = () => {
				if (!overlayHandle || !this.extensionOverlays.delete(overlayHandle)) return;
				// Remove this overlay, not the topmost one: another overlay may have opened above it.
				overlayHandle.hide();
				if (overlayStatusSource) this.programStatus.setBlocked(overlayStatusSource, undefined);
				disposeComponent();
			};

			const close = (result: T) => {
				if (closed) return;
				closed = true;
				if (isOverlay) {
					removeOverlay();
					resolve(result);
				} else {
					restoreEditor();
					resolve(result);
					disposeComponent();
				}
			};

			Promise.resolve(factory(this.ui, theme, this.keybindings, close))
				.then((c) => {
					if (closed) return;
					component = c;
					if (isOverlay) {
						// Resolve overlay options - can be static or dynamic function
						const resolveOptions = (): OverlayOptions | undefined => {
							if (options?.overlayOptions) {
								const opts =
									typeof options.overlayOptions === "function"
										? options.overlayOptions()
										: options.overlayOptions;
								return opts;
							}
							// Fallback: use component's width property if available
							const w = (c as { width?: number }).width;
							return w ? { width: w } : undefined;
						};
						overlayHandle = this.ui.showOverlay(c, resolveOptions());
						this.extensionOverlays.set(overlayHandle, removeOverlay);
						if (overlayStatusSource) this.programStatus.setBlocked(overlayStatusSource, options?.blocked);
						// Expose handle to caller for visibility control
						options?.onHandle?.(overlayHandle);
					} else {
						this.pushExtensionDialog(c, options?.blocked);
					}
				})
				.catch((err) => {
					if (closed) return;
					if (!isOverlay) restoreEditor();
					reject(err);
				});
		});
	},

	/**
	 * Show an extension error in the UI.
	 */
	showExtensionError(this: InteractiveMode, extensionPath: string, error: string, stack?: string): void {
		const errorMsg = `Extension "${extensionPath}" error: ${error}`;
		const errorText = new ThemedText(() => theme.fg("error", errorMsg), 1, 0);
		this.chatContainer.addChild(errorText);
		if (stack) {
			// Show stack trace in dim color, indented
			const stackLines = stack.split("\n").slice(1); // Skip first line (duplicates error message)
			if (stackLines.length > 0) {
				const renderStack = () => stackLines.map((line) => theme.fg("dim", `  ${line.trim()}`)).join("\n");
				this.chatContainer.addChild(new ThemedText(renderStack, 1, 0));
			}
		}
		this.ui.requestRender();
	},
};
