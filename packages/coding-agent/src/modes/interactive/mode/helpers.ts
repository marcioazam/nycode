/** Module-level types and helpers of InteractiveMode (split out of interactive-mode.ts). */

/**
 * Interactive mode for the coding agent.
 * Handles TUI rendering and user interaction, delegating business logic to AgentSession.
 */

import * as fs from "node:fs";
import type { AgentMessage } from "@nycode/agent-core";
import type { AssistantMessage, ImageContent, Model, Usage } from "@nycode/ai/compat";
import type { AutocompleteItem, EditorComponent } from "@nycode/tui";
import { type Component, Container, fuzzyFilter, stripTerminalSequences, type Terminal } from "@nycode/tui";
import { APP_NAME } from "../../../config.ts";
import type { AgentSessionRuntimeDiagnostic } from "../../../core/agent-session-services.ts";
import { defaultModelPerProvider } from "../../../core/model-resolver.ts";
import { compareProviders } from "../../../core/preferred-providers.ts";
import type { SessionEntry, SessionManager } from "../../../core/session-manager.ts";
import type { TuiMode } from "../../../core/settings-manager.ts";
import { type AuthSelectorProvider, formatAuthSelectorProviderType } from "../components/oauth-selector.ts";
import type { StatusIndicator } from "../components/status-indicator.ts";
import { ThemedText } from "../components/themed-text.ts";

/** Interface for components that can be expanded/collapsed */
export interface Expandable {
	setExpanded(expanded: boolean): void;
}

export interface ActiveEditor extends EditorComponent {
	getCursor?(): { line: number; col: number };
}

export interface WorkingStatusEditor extends EditorComponent {
	readonly embedWorkingStatus: boolean;
	setWorkingStatusIndicator(indicator: StatusIndicator | undefined): void;
}

export function isEmbeddedStatus(editor: EditorComponent): editor is WorkingStatusEditor {
	return (
		"embedWorkingStatus" in editor &&
		editor.embedWorkingStatus === true &&
		"setWorkingStatusIndicator" in editor &&
		typeof editor.setWorkingStatusIndicator === "function"
	);
}

export function isExpandable(obj: unknown): obj is Expandable {
	return typeof obj === "object" && obj !== null && "setExpanded" in obj && typeof obj.setExpanded === "function";
}

export class ExpandableText extends ThemedText implements Expandable {
	private readonly state: { expanded: boolean };

	constructor(
		getCollapsedText: () => string,
		getExpandedText: () => string,
		expanded = false,
		paddingX = 0,
		paddingY = 0,
	) {
		const state = { expanded };
		super(() => (state.expanded ? getExpandedText() : getCollapsedText()), paddingX, paddingY);
		this.state = state;
	}

	setExpanded(expanded: boolean): void {
		this.state.expanded = expanded;
		this.invalidate();
	}
}

// nycode: K10 NO_COLOR (no-color.org): the header and its logo carry no color, so the extension no longer wraps it
export function noColorRequested(): boolean {
	return (process.env.NO_COLOR ?? "") !== "";
}

/** Draws nothing while `held`: startup holds the chat until the header shows, so a notice posted first does not jump down. */
export class HeldContainer extends Container {
	held = false;
	override render(width: number): readonly string[] {
		return this.held ? [] : super.render(width);
	}
}

/**
 * The built-in header, shown when no extension sets one. Under NO_COLOR it renders without escape sequences.
 */
export class BuiltInHeader extends ExpandableText {
	/** True until the startup extensions are bound: a header an extension sets then replaces this one unseen. */
	hidden = false;

	// nycode: K10 NO_COLOR: strip colors baked into the text
	override render(width: number): readonly string[] {
		if (this.hidden) return [];
		const lines = super.render(width);
		return noColorRequested() ? lines.map(stripTerminalSequences) : lines;
	}
}

export type ExtensionDialogComponent = Component & { dispose?(): void };

export type CompactionQueuedMessage = {
	text: string;
	mode: "steer" | "followUp";
};

export type CompactionCostNotice = {
	type: "compaction_cost";
	kind: "compaction" | "branch_summary";
	usage: Usage;
};

export type RenderSessionItem =
	| AgentMessage
	| Extract<SessionEntry, { type: "custom" | "usage" }>
	| CompactionCostNotice;

export function isCustomSessionEntry(item: RenderSessionItem): item is Extract<SessionEntry, { type: "custom" }> {
	return "type" in item && item.type === "custom";
}

export function isCompactionCostNotice(item: RenderSessionItem): item is CompactionCostNotice {
	return "type" in item && item.type === "compaction_cost";
}

export function isUsageSessionEntry(item: RenderSessionItem): item is Extract<SessionEntry, { type: "usage" }> {
	return "type" in item && item.type === "usage";
}

// EIO: tty reads/ioctls from an orphaned background process group, or writes after hangup.
// ENOTTY: the tty was revoked (macOS) and stdin is no longer a terminal.
export const DEAD_TERMINAL_ERROR_CODES = new Set(["EIO", "EPIPE", "ENOTCONN", "ENOTTY"]);

export function isDeadTerminalError(error: unknown): boolean {
	if (!error || typeof error !== "object" || !("code" in error)) {
		return false;
	}
	const code = (error as NodeJS.ErrnoException).code;
	return code !== undefined && DEAD_TERMINAL_ERROR_CODES.has(code);
}

export function formatCrashExtensionHint(extensionMatches: readonly string[] | undefined): string | undefined {
	const matches = Array.isArray(extensionMatches)
		? extensionMatches.filter((match): match is string => typeof match === "string" && match.length > 0)
		: [];
	if (matches.length === 0) return undefined;
	const quoted = matches.map((match) => `\`${match}\``);
	const labels =
		quoted.length === 1
			? quoted[0]
			: quoted.length === 2
				? quoted.join(" and ")
				: `${quoted.slice(0, -1).join(", ")}, and ${quoted[quoted.length - 1]}`;
	const noun = matches.length === 1 ? "extension" : "extensions";
	const pronoun = matches.length === 1 ? "it" : "them";
	return `A stack frame came from loaded ${noun} ${labels}, which may be involved. Try disabling ${pronoun} with \`${APP_NAME} config\`, or run \`${APP_NAME} -ne\` to confirm.`;
}

export const ANTHROPIC_SUBSCRIPTION_AUTH_WARNING =
	"Anthropic subscription auth is active. Third-party harness usage draws from extra usage and is billed per token, not your Claude plan limits. Manage extra usage at https://claude.ai/settings/usage. Disable this warning in /settings.";

export function isAnthropicSubscriptionAuthKey(apiKey: string | undefined): boolean {
	return typeof apiKey === "string" && apiKey.startsWith("sk-ant-oat");
}

export function isUnknownModel(model: Model<any> | undefined): boolean {
	return !!model && model.provider === "unknown" && model.id === "unknown" && model.api === "unknown";
}

export function quoteIfNeeded(value: string): string {
	if (value.length > 0 && !/[^a-zA-Z0-9_\-./~:@]/.test(value)) {
		return value;
	}
	return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function formatResumeCommand(sessionManager: SessionManager): string | undefined {
	if (!process.stdout.isTTY) return undefined;
	if (!sessionManager.isPersisted()) return undefined;

	const sessionFile = sessionManager.getSessionFile();
	if (!sessionFile || !fs.existsSync(sessionFile)) return undefined;

	const args = [APP_NAME];
	if (!sessionManager.usesDefaultSessionDir()) {
		args.push("--session-dir", quoteIfNeeded(sessionManager.getSessionDir()));
	}
	args.push("--session", sessionManager.getSessionId());
	return args.join(" ");
}

export function hasDefaultModelProvider(providerId: string): providerId is keyof typeof defaultModelPerProvider {
	return providerId in defaultModelPerProvider;
}

export function llamaCppPostLoginGuidance(actionLabel: string, loadedModelCount: number): string {
	return loadedModelCount === 0
		? `${actionLabel}. No llama.cpp models are loaded. Use /llama to load a model, then /model to select it.`
		: `${actionLabel}. Use /model to select a loaded llama.cpp model, or /llama to manage models.`;
}

export type LoginProviderCompletionOption = {
	id: string;
	name: string;
	authTypes: AuthSelectorProvider["authType"][];
	subscription?: boolean;
};

export const RADIUS_LOGIN_INTRO = "Radius is a service crafted for Nycode by the builders of Nycode, Earendil Works";

export const AUTH_TYPE_ORDER = { oauth: 0, api_key: 1 } satisfies Record<AuthSelectorProvider["authType"], number>;

export function createFuzzyAutocompleteItems<T>(
	items: T[],
	prefix: string,
	getSearchText: (item: T) => string,
	toAutocompleteItem: (item: T) => AutocompleteItem,
): AutocompleteItem[] | null {
	const filtered = fuzzyFilter(items, prefix, getSearchText);
	if (filtered.length === 0) return null;
	return filtered.map(toAutocompleteItem);
}

export function getLoginProviderCompletionOptions(
	providerOptions: readonly AuthSelectorProvider[],
): LoginProviderCompletionOption[] {
	const byId = new Map<string, LoginProviderCompletionOption>();
	for (const provider of providerOptions) {
		const existing = byId.get(provider.id);
		if (existing) {
			if (!existing.authTypes.includes(provider.authType)) {
				existing.authTypes.push(provider.authType);
				existing.authTypes.sort((a, b) => AUTH_TYPE_ORDER[a] - AUTH_TYPE_ORDER[b]);
			}
			continue;
		}
		byId.set(provider.id, {
			id: provider.id,
			name: provider.name,
			authTypes: [provider.authType],
			subscription: provider.subscription,
		});
	}
	return Array.from(byId.values()).sort(compareProviders);
}

export function getLoginProviderSearchText(provider: LoginProviderCompletionOption): string {
	const authTypes = provider.authTypes
		.map((authType) => `${authType} ${formatAuthSelectorProviderType(authType, provider.subscription)}`)
		.join(" ");
	return `${provider.id} ${provider.name} ${authTypes}`;
}

export function formatLoginProviderCompletionDescription(provider: LoginProviderCompletionOption): string {
	const authTypes = provider.authTypes
		.map((authType) => formatAuthSelectorProviderType(authType, provider.subscription))
		.join("/");
	return provider.name === provider.id ? authTypes : `${provider.name} · ${authTypes}`;
}

/**
 * Options for InteractiveMode initialization.
 */
export interface InteractiveModeOptions {
	/** Providers that were migrated to auth.json (shows warning) */
	migratedProviders?: string[];
	/** Diagnostics collected before the interactive TUI was initialized. */
	startupDiagnostics?: AgentSessionRuntimeDiagnostic[];
	/** Warning message if session model couldn't be restored */
	modelFallbackMessage?: string;
	/** Cwd to trust after reload if it gained a .nycode directory during this implicitly trusted session. */
	autoTrustOnReloadCwd?: string;
	/** Initial message to send on startup (can include @file content) */
	initialMessage?: string;
	/** Images to attach to the initial message */
	initialImages?: ImageContent[];
	/** Additional messages to send after the initial message */
	initialMessages?: string[];
	/** Force verbose startup (overrides quietStartup setting) */
	verbose?: boolean;
	/** TUI layout mode. */
	tuiMode?: TuiMode;
	/** Initial interactive theme setting for this invocation. */
	initialThemeSetting?: string;
	/** Terminal implementation. Defaults to the current process terminal. */
	terminal?: Terminal;
}

export interface ExtensionChangelogUpdate {
	name: string;
	version: string;
	markdown: string;
}

export interface ReasoningDropDiagnostic {
	provider: string;
	/** Transformation `type` of a withheld block. */
	droppedType: string;
	/** Singular and plural name of a withheld block. */
	noun: [string, string];
}

/** Assistant diagnostics that list reasoning a provider withheld from the model, by diagnostic type. */
export const REASONING_DROP_DIAGNOSTICS = new Map<string, ReasoningDropDiagnostic>([
	[
		"anthropic_input_transformations",
		{ provider: "Anthropic", droppedType: "thinking_dropped", noun: ["thinking block", "thinking blocks"] },
	],
	[
		"openai_input_transformations",
		{ provider: "OpenAI", droppedType: "reasoning", noun: ["reasoning item", "reasoning items"] },
	],
]);

export interface DroppedReasoning {
	diagnostic: ReasoningDropDiagnostic;
	count: number;
	reasons: string[];
}

/** Count the reasoning blocks a provider reported as withheld from the request that produced `message`. */
export function getDroppedReasoning(message: AssistantMessage): DroppedReasoning | undefined {
	for (const diagnostic of message.diagnostics ?? []) {
		const kind = REASONING_DROP_DIAGNOSTICS.get(diagnostic.type);
		if (!kind) continue;
		// Session data: diagnostics details are untyped JSON.
		const transformations = diagnostic.details?.transformations;
		if (!Array.isArray(transformations)) continue;
		const dropped = transformations.filter(
			(transformation): transformation is Record<string, unknown> =>
				typeof transformation === "object" &&
				transformation !== null &&
				(transformation as Record<string, unknown>).type === kind.droppedType,
		);
		if (dropped.length === 0) continue;
		const reasons = new Set<string>();
		for (const transformation of dropped) {
			if (typeof transformation.reason === "string") reasons.add(transformation.reason);
		}
		return { diagnostic: kind, count: dropped.length, reasons: [...reasons] };
	}
	return undefined;
}
