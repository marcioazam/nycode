/**
 * `/subagents-setup [project] [show|off]` (docs/subagent-routing-2026-11-13.md, AC1/AC2). `project` targets the
 * trusted project's own file, which replaces the global one (docs/harness/subagents-setup-projeto-2026-11-26.md).
 */

import { getSupportedThinkingLevels } from "@nycode/ai";
import type { ExtensionAPI } from "../../../core/extensions/types.ts";
import { isProjectApprovedSilently } from "../../_shared/project/project-approval.ts";
import { OVERLAY_OPTIONS } from "../fleet-ui/viewer.ts";
import {
	EFFORTS,
	type Effort,
	formatPolicy,
	loadPolicy,
	policyFile,
	projectPolicyFile,
	type RoutingPolicy,
	removePolicy,
	savePolicy,
} from "./policy.ts";
import { SetupComponent, type SetupModel } from "./setup-ui.ts";

type Handler = Parameters<ExtensionAPI["registerCommand"]>[1]["handler"];
type CommandCtx = Parameters<Handler>[1];

/** The efforts nycode reports for the model, in ladder order (`off` is a level too). */
function supportedEfforts(model: Parameters<typeof getSupportedThinkingLevels>[0]): Effort[] {
	const levels = getSupportedThinkingLevels(model) as string[];
	return EFFORTS.filter((e) => levels.includes(e));
}

const setupModels = (ctx: CommandCtx): SetupModel[] =>
	ctx.modelRegistry
		.getAvailable()
		.map((m) => ({ key: `${m.provider}/${m.id}`, levels: supportedEfforts(m) }))
		.filter((m) => m.levels.length > 0);

/** `current` seeds the modal: the target file's policy, or the one in force when the target has none yet. */
const runSetup = (
	ctx: CommandCtx,
	models: SetupModel[],
	current: RoutingPolicy | undefined,
): Promise<RoutingPolicy | undefined> => {
	return ctx.ui.custom<RoutingPolicy | undefined>(
		(tui, theme, _kb, done) =>
			new SetupComponent({
				models,
				current,
				done,
				requestRender: () => tui.requestRender(),
				theme,
				rows: () => tui.terminal.rows,
			}),
		{ overlay: true, overlayOptions: { ...OVERLAY_OPTIONS } },
	);
};

/** `onChange` runs after the policy file changed, so the tool can re-register with the new description and schema. */
export function registerRoutingCommand(nycode: ExtensionAPI, onChange: () => void): void {
	nycode.registerCommand("subagents-setup", {
		description: "Choose the models and efforts subagents may use (show | off; project: this project only)",
		handler: async (args, ctx) => {
			const words = args.trim().toLowerCase().split(/\s+/).filter(Boolean);
			const project = words[0] === "project";
			const arg = words.slice(project ? 1 : 0).join(" ");
			const trustedCwd = isProjectApprovedSilently(ctx) ? ctx.cwd : undefined;
			const inForce = policyFile(process.env, trustedCwd);
			if (arg === "show") return ctx.ui.notify(formatPolicy(loadPolicy(inForce), inForce), "info");
			if (project && !trustedCwd)
				return ctx.ui.notify("/subagents-setup project needs a trusted project (/trust).", "error");
			const target = project ? projectPolicyFile(ctx.cwd) : policyFile();
			if (arg === "off") {
				let removed: boolean;
				try {
					removed = removePolicy(target);
				} catch (error) {
					return ctx.ui.notify(`Could not remove ${target}: ${(error as Error).message}`, "error");
				}
				onChange();
				return ctx.ui.notify(
					removed ? `Subagent routing off (removed ${target}).` : formatPolicy(undefined, target),
					"info",
				);
			}
			if (arg) return ctx.ui.notify("Usage: /subagents-setup [project] [show|off]", "error");
			if (!ctx.hasUI)
				return ctx.ui.notify(
					"/subagents-setup needs the interactive TUI; use /subagents-setup show or off here.",
					"error",
				);
			const models = setupModels(ctx);
			if (models.length === 0) return ctx.ui.notify("No models available to choose from.", "error");
			const policy = await runSetup(ctx, models, loadPolicy(target) ?? loadPolicy(inForce));
			if (!policy) return ctx.ui.notify("Subagent routing unchanged.", "info");
			savePolicy(policy, target);
			onChange();
			ctx.ui.notify(`Saved.\n${formatPolicy(policy, target)}`, "info");
		},
	});
}
