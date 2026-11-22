/** Comandos locais do Claude Code sem equivalente nativo (docs/specs/claude-code-parity/local-commands.md). */
import type { ExtensionAPI } from "../../../core/extensions/types.ts";
import { registerAdvisor } from "./agents/advisor.ts";
import { registerListing } from "./agents/listing.ts";
import { registerLoop } from "./agents/loop.ts";
import { registerAddDir } from "./session/adddir.ts";
import { registerBranch } from "./session/branch.ts";
import { registerCopy } from "./session/copy.ts";
import { registerHeapdump } from "./session/heapdump.ts";
import { registerInsights } from "./session/insights.ts";
import { registerConfig } from "./settings/config.ts";
import { registerPermissions, trackPlanMode } from "./settings/permissions.ts";
import { registerPlugin } from "./settings/plugin.ts";
import { registerDoctor } from "./skills/doctor.ts";
import { registerSkillPrompts } from "./skills/prompts.ts";

export default function registerLocalCommands(nycode: ExtensionAPI): void {
	const planActive = trackPlanMode(nycode);
	registerConfig(nycode);
	registerPermissions(nycode, planActive);
	registerPlugin(nycode);
	registerAddDir(nycode);
	registerBranch(nycode);
	registerCopy(nycode);
	registerHeapdump(nycode);
	registerInsights(nycode);
	registerAdvisor(nycode);
	registerLoop(nycode, planActive);
	registerListing(nycode);
	registerDoctor(nycode);
	registerSkillPrompts(nycode);
}
