/**
 * `/claude-plugins`: lists the installed Claude Code plugins with the source that decides each one, and turns them on
 * or off through `enabledPlugins` in Nycode's user settings.json. Installing and removing plugins stays with Claude Code.
 */

import { type SettingItem, SettingsList } from "@nycode/tui";
import type { ExtensionAPI, ExtensionCommandContext } from "../../core/extensions/types.ts";
import { getSettingsListTheme } from "../../modes/interactive/theme/theme.ts";
import {
	type EnablementSource,
	type PluginState,
	pluginStates,
	resetInstalledPluginsCache,
	setPluginEnabled,
} from "../_shared/settings/plugins.ts";
import { errorMessage } from "../_shared/util/values.ts";

const SOURCE_LABEL: Record<EnablementSource, string> = {
	managed: "managed settings",
	flag: "--settings flag",
	user: "user settings",
	default: "plugin default",
};

/** Sources that outrank the user settings.json, where a toggle would not take effect. */
const LOCKED_NOTE: Partial<Record<EnablementSource, string>> = {
	managed: "Set by managed settings",
	flag: "Set by the --settings flag for this session",
};

const MAX_VISIBLE = 15;

export function pluginLabel(state: PluginState): string {
	return `${state.enabled ? "●" : "○"} ${state.qualified}: ${state.enabled ? "on" : "off"} (${SOURCE_LABEL[state.decidedBy]})`;
}

function settingItem(state: PluginState): SettingItem {
	const value = state.enabled ? "on" : "off";
	const locked = LOCKED_NOTE[state.decidedBy];
	// An item without `values` cannot be cycled.
	if (locked) return { id: state.qualified, label: state.qualified, currentValue: value, description: locked };
	return {
		id: state.qualified,
		label: state.qualified,
		currentValue: value,
		values: ["on", "off"],
		description: `Currently from ${SOURCE_LABEL[state.decidedBy]}`,
	};
}

/** Saves one toggle. A failed write puts the row back and says why. */
function saveToggle(ctx: ExtensionCommandContext, list: SettingsList, item: SettingItem, value: string): void {
	try {
		setPluginEnabled(item.id, value === "on");
	} catch (error) {
		list.updateValue(item.id, value === "on" ? "off" : "on");
		ctx.ui.notify(`Could not update settings: ${errorMessage(error)}`, "error");
		return;
	}
	const fresh = pluginStates().find((state) => state.qualified === item.id);
	if (fresh) item.description = settingItem(fresh).description;
}

export function registerPluginsCommand(nycode: ExtensionAPI): void {
	nycode.registerCommand("claude-plugins", {
		description: "Turn installed Claude Code plugins on or off",
		handler: async (_args, ctx) => {
			const states = pluginStates();
			if (states.length === 0) {
				ctx.ui.notify("No Claude Code plugins installed. Install them with Claude Code's /plugin.", "info");
				return;
			}
			if (ctx.mode !== "tui") {
				ctx.ui.notify(states.map(pluginLabel).join("\n"), "info");
				return;
			}
			const atOpen = new Map(states.map((state) => [state.qualified, state.enabled]));
			const items = states.map(settingItem);
			await ctx.ui.custom<void>((tui, _theme, _keybindings, done) => {
				const list = new SettingsList(
					items,
					Math.min(items.length, MAX_VISIBLE),
					getSettingsListTheme(),
					(id, value) => {
						const item = items.find((candidate) => candidate.id === id);
						if (item) saveToggle(ctx, list, item, value);
					},
					() => done(),
				);
				return {
					render: (width: number) => list.render(width),
					invalidate: () => list.invalidate(),
					handleInput: (data: string) => {
						list.handleInput(data);
						tui.requestRender();
					},
				};
			});
			resetInstalledPluginsCache();
			// A reload aborts running subagents and background work, so it stays the user's call.
			if (pluginStates().some((state) => atOpen.get(state.qualified) !== state.enabled))
				ctx.ui.notify("Plugin changes saved. Run /reload to apply them.", "info");
		},
	});
}
