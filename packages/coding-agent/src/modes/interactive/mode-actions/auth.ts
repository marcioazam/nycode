/**
 * InteractiveMode methods, applied to InteractiveMode.prototype in interactive-mode.ts; `this` is the mode.
 */

/**
 * Interactive mode for the coding agent.
 * Handles TUI rendering and user interaction, delegating business logic to AgentSession.
 */

import * as path from "node:path";
import type { AuthEvent, AuthPrompt } from "@nycode/ai";
import type { Model } from "@nycode/ai/compat";
import { APP_NAME, getAgentDir, getAuthPath, getDocsPath } from "../../../config.ts";
import { defaultModelPerProvider } from "../../../core/model-resolver.ts";
import { CredentialSynchronizationError } from "../../../core/model-runtime.ts";
import { compareProviders } from "../../../core/preferred-providers.ts";
import { findMatchingProviders } from "../../../core/provider-matching.ts";
import { RADIUS_PROVIDER_ID } from "../../../core/radius.ts";
import { planRadiusMcpServer } from "../../../core/radius-mcp.ts";
import { addMcpServerConfig } from "../../../extensions/mcp/config.ts";
import { ExtensionSelectorComponent } from "../components/extension-selector.ts";
import { LoginDialogComponent } from "../components/login-dialog.ts";
import {
	type AuthSelectorProvider,
	formatAuthSelectorProviderStatus,
	OAuthSelectorComponent,
} from "../components/oauth-selector.ts";
import { createLoginMenuSelector } from "../components/radius-login-selector.ts";
import type { InteractiveMode } from "../interactive-mode.ts";
import {
	hasDefaultModelProvider,
	isUnknownModel,
	llamaCppPostLoginGuidance,
	RADIUS_LOGIN_INTRO,
} from "../mode/helpers.ts";
import { theme } from "../theme/theme.ts";

/** Login, logout and provider authentication dialogs. */
export const authMethods = {
	getLoginProviderOptions(this: InteractiveMode, authType?: "oauth" | "api_key"): AuthSelectorProvider[] {
		const options: AuthSelectorProvider[] = [];
		for (const provider of this.session.modelRuntime.getProviders()) {
			const authStatus = this.session.modelRuntime.getProviderAuthStatus(provider.id);
			const status = authStatus.configured
				? {
						type: this.session.modelRuntime.isUsingOAuth(provider.id) ? ("oauth" as const) : ("api_key" as const),
						source: authStatus.label ?? authStatus.source,
					}
				: undefined;
			const subscription = provider.auth.oauth?.isSubscription === true;
			if ((!authType || authType === "oauth") && provider.auth.oauth) {
				options.push({
					id: provider.id,
					name: provider.name,
					authType: "oauth",
					method: provider.auth.oauth,
					status,
					subscription,
				});
			}
			if ((!authType || authType === "api_key") && provider.auth.apiKey) {
				options.push({
					id: provider.id,
					name: provider.name,
					authType: "api_key",
					method: provider.auth.apiKey,
					status,
					subscription,
				});
			}
		}
		// The sort is stable, so a provider's account option stays above its API key option.
		return options.sort(compareProviders);
	},

	async getLogoutProviderOptions(this: InteractiveMode): Promise<AuthSelectorProvider[]> {
		return (await this.session.modelRuntime.listCredentials({ signal: AbortSignal.timeout(15_000) }))
			.map(({ providerId, type }) => {
				const provider = this.session.modelRuntime.getProvider(providerId);
				return {
					id: providerId,
					name: provider?.name ?? providerId,
					authType: type,
					status: { type, source: "stored credential" },
					subscription: provider?.auth.oauth?.isSubscription === true,
				};
			})
			.sort(compareProviders);
	},

	async handleLoginCommand(this: InteractiveMode, providerRef?: string): Promise<void> {
		if (!providerRef) {
			this.showLoginAuthTypeSelector();
			return;
		}

		const providerOptions = findMatchingProviders(this.getLoginProviderOptions(), providerRef);
		if (providerOptions.length === 1) {
			await this.startProviderLogin(providerOptions[0]!);
			return;
		}

		if (providerOptions.length > 1) {
			const providerIds = new Set(providerOptions.map((provider) => provider.id));
			if (providerIds.size === 1) {
				this.showLoginAuthTypeSelector(providerOptions);
				return;
			}
		}

		this.showLoginProviderSelector(undefined, providerRef);
	},

	/** `onBack` reopens the selector the login was started from when the user cancels it. */
	async startProviderLogin(
		this: InteractiveMode,
		providerOption: AuthSelectorProvider,
		onBack?: () => void,
	): Promise<void> {
		if (providerOption.authType === "oauth") {
			await this.showLoginDialog(providerOption.id, providerOption.name, onBack);
		} else if (providerOption.method?.login) {
			await this.showApiKeyLoginDialog(providerOption.id, providerOption.name, onBack);
		} else {
			this.showAmbientAuthDialog(providerOption, onBack);
		}
	},

	showLoginAuthTypeSelector(this: InteractiveMode, providerOptions?: AuthSelectorProvider[]): void {
		// The top-level selector offers Radius directly, as its last option.
		const radiusOption = providerOptions
			? undefined
			: this.getLoginProviderOptions("oauth").find((provider) => provider.id === RADIUS_PROVIDER_ID);
		const radiusText = radiusOption ? `Sign in with ${radiusOption.name}` : undefined;
		const radiusLabel = radiusOption ? `${radiusText}${formatAuthSelectorProviderStatus(radiusOption)}` : undefined;
		const oauthProvider = providerOptions?.find((provider) => provider.authType === "oauth");
		const oauthLoginLabel =
			oauthProvider?.method && "loginLabel" in oauthProvider.method ? oauthProvider.method.loginLabel : undefined;
		const subscriptionLabel = oauthLoginLabel ?? "Sign in with an account";
		const apiKeyLabel = "Sign in with an API key";
		const availableAuthTypes = providerOptions
			? new Set(providerOptions.map((provider) => provider.authType))
			: new Set<AuthSelectorProvider["authType"]>(["oauth", "api_key"]);
		const options: string[] = [];
		if (availableAuthTypes.has("oauth")) {
			options.push(subscriptionLabel);
		}
		if (availableAuthTypes.has("api_key")) {
			options.push(apiKeyLabel);
		}
		if (radiusLabel) options.push(radiusLabel);

		if (options.length === 0) {
			this.showStatus("No login methods available.");
			return;
		}

		if (providerOptions && options.length === 1) {
			const providerOption = providerOptions[0];
			if (providerOption) {
				void this.startProviderLogin(providerOption);
			}
			return;
		}

		const title = providerOptions?.[0]
			? `Select authentication method for ${providerOptions[0].name}:`
			: "Select authentication method:";
		this.showSelector((done) => {
			const onSelect = (option: string) => {
				done();
				if (radiusOption && option === radiusLabel) {
					void this.startProviderLogin(radiusOption, () => this.showLoginAuthTypeSelector());
					return;
				}
				const authType = option === subscriptionLabel ? "oauth" : "api_key";
				if (providerOptions) {
					const providerOption = providerOptions.find((provider) => provider.authType === authType);
					if (providerOption) {
						void this.startProviderLogin(providerOption, () => this.showLoginAuthTypeSelector(providerOptions));
					}
					return;
				}
				this.showLoginProviderSelector(authType);
			};
			const onCancel = () => {
				done();
				this.ui.requestRender();
			};
			const selector =
				radiusLabel && radiusText
					? createLoginMenuSelector(
							this.ui,
							title,
							options,
							{ label: radiusLabel, text: radiusText },
							onSelect,
							onCancel,
						)
					: new ExtensionSelectorComponent(title, options, onSelect, onCancel);
			return { component: selector, focus: selector, dispose: () => selector.dispose() };
		});
	},

	showLoginProviderSelector(
		this: InteractiveMode,
		authType?: AuthSelectorProvider["authType"],
		initialSearchInput?: string,
	): void {
		const providerOptions = this.getLoginProviderOptions(authType);
		if (providerOptions.length === 0) {
			const message =
				authType === "oauth"
					? "No account providers available."
					: authType === "api_key"
						? "No API key providers available."
						: "No login providers available.";
			this.showStatus(message);
			return;
		}

		this.showSelector((done) => {
			const selector = new OAuthSelectorComponent(
				"login",
				providerOptions,
				async (providerId, selectedAuthType) => {
					done();

					const providerOption = providerOptions.find(
						(provider) => provider.id === providerId && provider.authType === selectedAuthType,
					);
					if (!providerOption) {
						return;
					}

					await this.startProviderLogin(providerOption, () =>
						this.showLoginProviderSelector(authType, initialSearchInput),
					);
				},
				() => {
					done();
					if (authType) {
						this.showLoginAuthTypeSelector();
					} else {
						this.ui.requestRender();
					}
				},
				initialSearchInput,
				this.ui,
			);
			return { component: selector, focus: selector, dispose: () => selector.dispose() };
		});
	},

	async showOAuthSelector(this: InteractiveMode, mode: "login" | "logout"): Promise<void> {
		if (mode === "login") {
			this.showLoginAuthTypeSelector();
			return;
		}

		let providerOptions: AuthSelectorProvider[];
		try {
			providerOptions = await this.getLogoutProviderOptions();
		} catch (error) {
			this.showError(`Could not read stored credentials: ${error instanceof Error ? error.message : String(error)}`);
			return;
		}
		if (providerOptions.length === 0) {
			this.showStatus(
				"No stored credentials to remove. /logout only removes credentials saved by /login; environment variables and models.json config are unchanged.",
			);
			return;
		}

		this.showSelector((done) => {
			const selector = new OAuthSelectorComponent(
				mode,
				providerOptions,
				async (providerId: string) => {
					done();

					const providerOption = providerOptions.find((provider) => provider.id === providerId);
					if (!providerOption) {
						return;
					}

					try {
						await this.session.modelRuntime.logout(providerOption.id, {
							signal: AbortSignal.timeout(15_000),
						});
						await this.updateAvailableProviderCount();
						const message =
							providerOption.authType === "oauth"
								? `Logged out of ${providerOption.name}`
								: `Removed stored API key for ${providerOption.name}. Environment variables and models.json config are unchanged.`;
						this.showStatus(message);
					} catch (error: unknown) {
						const message = error instanceof Error ? error.message : String(error);
						this.showError(
							error instanceof CredentialSynchronizationError
								? `Credentials removed for ${providerOption.name}, but local model state could not be synchronized: ${message}`
								: `Logout failed: ${message}`,
						);
					}
				},
				() => {
					done();
					this.ui.requestRender();
				},
				undefined,
				this.ui,
			);
			return { component: selector, focus: selector, dispose: () => selector.dispose() };
		});
	},

	async completeProviderAuthentication(
		this: InteractiveMode,
		providerId: string,
		providerName: string,
		authType: "oauth" | "api_key",
		previousModel: Model<any> | undefined,
	): Promise<void> {
		const actionLabel = authType === "oauth" ? `Logged in to ${providerName}` : `Saved API key for ${providerName}`;

		const session = this.session;
		// Dynamic catalogs may be empty until the first authenticated network refresh.
		const deferSelection =
			isUnknownModel(previousModel) &&
			hasDefaultModelProvider(providerId) &&
			!session.modelRuntime
				.getAvailableSnapshot()
				.some((model) => model.provider === providerId && model.id === defaultModelPerProvider[providerId]);
		const finishAuthentication = async () => {
			let selectedModel: Model<any> | undefined;
			let selectionError: string | undefined;
			if (isUnknownModel(previousModel)) {
				const availableModels = this.session.modelRuntime.getAvailableSnapshot();
				const providerModels = availableModels.filter((model) => model.provider === providerId);
				// Matches LLAMA_PROVIDER_ID from extensions/llama/provider.ts; kept inline to avoid coupling interactive mode to the built-in extension.
				if (providerId === "llama.cpp") {
					selectionError = llamaCppPostLoginGuidance(actionLabel, providerModels.length);
				} else if (!hasDefaultModelProvider(providerId)) {
					selectionError = `${actionLabel}, but no default model is configured for provider "${providerId}". Use /model to select a model.`;
				} else if (providerModels.length === 0) {
					selectionError = `${actionLabel}, but no models are available for that provider. Use /model to select a model.`;
				} else {
					const defaultModelId = defaultModelPerProvider[providerId];
					// Radius catalogs vary by account; prefer balanced, then use catalog order.
					selectedModel =
						providerModels.find((model) => model.id === defaultModelId) ??
						(providerId === "radius" ? providerModels[0] : undefined);
					if (!selectedModel) {
						selectionError = `${actionLabel}, but its default model "${defaultModelId}" is not available. Use /model to select a model.`;
					} else {
						try {
							await this.session.setModel(selectedModel, { persist: true });
						} catch (error: unknown) {
							selectedModel = undefined;
							const errorMessage = error instanceof Error ? error.message : String(error);
							selectionError = `${actionLabel}, but selecting its default model failed: ${errorMessage}. Use /model to select a model.`;
						}
					}
				}
			}

			await this.updateAvailableProviderCount();
			this.footer.invalidate();
			this.updateEditorBorderColor();
			if (selectedModel) {
				this.showStatus(`${actionLabel}. Selected ${selectedModel.id}. Credentials saved to ${getAuthPath()}`);
				void this.maybeWarnAboutAnthropicSubscriptionAuth(selectedModel);
			} else {
				this.showStatus(`${actionLabel}. Credentials saved to ${getAuthPath()}`);
				if (selectionError) {
					this.showError(selectionError);
				} else {
					void this.maybeWarnAboutAnthropicSubscriptionAuth();
				}
			}
		};
		if (deferSelection) {
			this.showStatus(`${actionLabel}. Credentials saved to ${getAuthPath()}. Refreshing model catalog…`);
		} else {
			await finishAuthentication();
		}

		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 15_000);
		void session.modelRuntime
			.refresh({ providers: [providerId], signal: controller.signal })
			.then(async (result) => {
				if (result.aborted) {
					this.showWarning(`${actionLabel}, but its model catalog refresh timed out; using cached models.`);
				} else if (result.errors.size > 0) {
					this.showWarning(`${actionLabel}, but its model catalog could not be refreshed; using cached models.`);
				}
				// Do not replace a model or session selected while the refresh was running.
				if (deferSelection && this.session === session && session.model === previousModel) {
					await finishAuthentication();
				}
				this.updateAvailableProviderCount();
				this.footer.invalidate();
				this.ui.requestRender();
			})
			.catch((error: unknown) => {
				this.showWarning(
					`${actionLabel}, but its model catalog could not be refreshed: ${error instanceof Error ? error.message : String(error)}`,
				);
			})
			.finally(() => clearTimeout(timeout));
	},

	showAmbientAuthDialog(this: InteractiveMode, providerOption: AuthSelectorProvider, onBack?: () => void): void {
		const restoreEditor = () => {
			this.editorContainer.clear();
			this.editorContainer.addChild(this.editor);
			this.ui.setFocus(this.editor);
			this.ui.requestRender();
		};

		const dialog = new LoginDialogComponent(
			this.ui,
			providerOption.id,
			() => {
				restoreEditor();
				onBack?.();
			},
			providerOption.name,
			`${providerOption.name} setup`,
		);
		dialog.showInfo(
			`${providerOption.method?.name ?? "Authentication"} is configured outside ${APP_NAME}.`,
			[],
			true,
		);

		this.editorContainer.clear();
		this.editorContainer.addChild(dialog);
		this.ui.setFocus(dialog);
		this.ui.requestRender();
	},

	async showApiKeyLoginDialog(
		this: InteractiveMode,
		providerId: string,
		providerName: string,
		onBack?: () => void,
	): Promise<void> {
		const previousModel = this.session.model;

		const dialog = new LoginDialogComponent(
			this.ui,
			providerId,
			(_success, _message) => {
				// Completion handled below
			},
			providerName,
		);

		if (providerId === "amazon-bedrock") {
			dialog.showDetails([
				theme.fg("text", "You can also use an AWS profile, IAM keys, or role-based credentials."),
				theme.fg("muted", "See:"),
				theme.fg("accent", `  ${path.join(getDocsPath(), "providers.md")}`),
			]);
		}

		this.editorContainer.clear();
		this.editorContainer.addChild(dialog);
		this.ui.setFocus(dialog);
		this.ui.requestRender();

		const restoreEditor = () => {
			this.editorContainer.clear();
			this.editorContainer.addChild(this.editor);
			this.ui.setFocus(this.editor);
			this.ui.requestRender();
		};

		try {
			await this.loginProvider(dialog, providerId, providerName, "api_key");
			restoreEditor();
			await this.completeProviderAuthentication(providerId, providerName, "api_key", previousModel);
		} catch (error: unknown) {
			restoreEditor();
			const errorMsg = error instanceof Error ? error.message : String(error);
			if (error instanceof CredentialSynchronizationError) {
				this.showError(
					`Saved API key for ${providerName}, but local model state could not be synchronized: ${errorMsg}`,
				);
			} else if (errorMsg === "Login cancelled") {
				onBack?.();
			} else {
				this.showError(`Failed to save API key for ${providerName}: ${errorMsg}`);
			}
		}
	},

	showAuthSelect(
		this: InteractiveMode,
		dialog: LoginDialogComponent,
		prompt: Extract<AuthPrompt, { type: "select" }>,
		providerId: string,
	): Promise<string> {
		return new Promise((resolve, reject) => {
			const restoreDialog = () => {
				this.editorContainer.clear();
				this.editorContainer.addChild(dialog);
				this.ui.setFocus(dialog);
				this.ui.requestRender();
			};
			const labels = prompt.options.map((option) => option.label);
			const selector = new ExtensionSelectorComponent(
				prompt.message,
				labels,
				(optionLabel) => {
					restoreDialog();
					const id = prompt.options.find((option) => option.label === optionLabel)?.id;
					if (id) resolve(id);
					else reject(new Error("Login cancelled"));
				},
				() => {
					restoreDialog();
					reject(new Error("Login cancelled"));
				},
				{ description: providerId === RADIUS_PROVIDER_ID ? RADIUS_LOGIN_INTRO : undefined },
			);
			this.editorContainer.clear();
			this.editorContainer.addChild(selector);
			this.ui.setFocus(selector);
			this.ui.requestRender();
		});
	},

	async showAuthPrompt(
		this: InteractiveMode,
		dialog: LoginDialogComponent,
		prompt: AuthPrompt,
		providerId: string,
	): Promise<string> {
		let response: Promise<string>;
		if (prompt.type === "select") {
			response = this.showAuthSelect(dialog, prompt, providerId);
		} else if (prompt.type === "manual_code") {
			response = dialog.showManualInput(prompt.message);
		} else {
			response = dialog.showPrompt(prompt.message, prompt.placeholder);
		}
		if (!prompt.signal) return response;
		if (prompt.signal.aborted) throw new Error("Login cancelled");
		const signal = prompt.signal;
		let onAbort: (() => void) | undefined;
		const aborted = new Promise<string>((_resolve, reject) => {
			onAbort = () => reject(new Error("Login cancelled"));
			signal.addEventListener("abort", onAbort, { once: true });
		});
		try {
			return await Promise.race([response, aborted]);
		} finally {
			if (onAbort) signal.removeEventListener("abort", onAbort);
		}
	},

	notifyAuthDialog(this: InteractiveMode, dialog: LoginDialogComponent, event: AuthEvent): void {
		if (event.type === "auth_url") {
			dialog.showAuth(event.url, event.instructions);
		} else if (event.type === "device_code") {
			dialog.showDeviceCode(event);
			dialog.showWaiting("Waiting for authentication...");
		} else if (event.type === "info") {
			dialog.showInfo(event.message, event.links);
		} else {
			dialog.showProgress(event.message);
		}
	},

	async loginProvider(
		this: InteractiveMode,
		dialog: LoginDialogComponent,
		providerId: string,
		providerName: string,
		method: "api_key" | "oauth",
	): Promise<void> {
		this.programStatus.setBlocked("login", { kind: "auth", message: `Log in to ${providerName}` });
		try {
			await this.session.modelRuntime.login(
				providerId,
				method,
				{
					signal: dialog.signal,
					prompt: (prompt) => this.showAuthPrompt(dialog, prompt, providerId),
					notify: (event) => this.notifyAuthDialog(dialog, event),
				},
				{ getDeviceId: () => this.settingsManager.getOrCreateDeviceId() },
			);
		} finally {
			this.programStatus.setBlocked("login", undefined);
		}
	},

	async showLoginDialog(
		this: InteractiveMode,
		providerId: string,
		providerName: string,
		onBack?: () => void,
	): Promise<void> {
		const previousModel = this.session.model;
		const dialog = new LoginDialogComponent(this.ui, providerId, (_success, _message) => {}, providerName);
		this.editorContainer.clear();
		this.editorContainer.addChild(dialog);
		this.ui.setFocus(dialog);
		this.ui.requestRender();

		const restoreEditor = () => {
			this.editorContainer.clear();
			this.editorContainer.addChild(this.editor);
			this.ui.setFocus(this.editor);
			this.ui.requestRender();
		};

		try {
			await this.loginProvider(dialog, providerId, providerName, "oauth");
			restoreEditor();
			await this.completeProviderAuthentication(providerId, providerName, "oauth", previousModel);
			if (providerId === RADIUS_PROVIDER_ID) this.offerRadiusMcpServer(providerId, providerName);
		} catch (error: unknown) {
			restoreEditor();
			const errorMsg = error instanceof Error ? error.message : String(error);
			if (error instanceof CredentialSynchronizationError) {
				this.showError(
					`Logged in to ${providerName}, but local model state could not be synchronized: ${errorMsg}`,
				);
			} else if (errorMsg === "Login cancelled") {
				onBack?.();
			} else {
				this.showError(`Failed to login to ${providerName}: ${errorMsg}`);
			}
		}
	},

	/**
	 * Offer to point the Radius MCP server in the global mcp.json at the Radius login, adding the server
	 * when missing. Nothing is asked when a global server already uses this login.
	 */
	offerRadiusMcpServer(this: InteractiveMode, providerId: string, providerName: string): void {
		const plan = planRadiusMcpServer(providerId, getAgentDir(), this.sessionManager.getCwd());
		if (!plan) return;
		const { mcpPath, name, config } = plan;

		this.showSelector((done) => {
			const selector = new ExtensionSelectorComponent(
				`Configure ${providerName} MCP in ${mcpPath}?`,
				["Yes", "No"],
				(option) => {
					done();
					if (option !== "Yes") return;
					try {
						addMcpServerConfig(mcpPath, name, config);
					} catch (error: unknown) {
						this.showError(
							`Could not update ${mcpPath}: ${error instanceof Error ? error.message : String(error)}`,
						);
						return;
					}
					// The MCP extension reads mcp.json when the session starts.
					void this.handleReloadCommand();
				},
				() => {
					done();
					this.ui.requestRender();
				},
			);
			return { component: selector, focus: selector };
		});
	},
};
