/**
 * Seam for Claude Code's `run_in_background` on the bash tool: the run extension registers the starter (its registry
 * owns the process, the Run section and the finish notice), and the bash tool calls it at execute time, after every
 * permission check and hook has seen the real command.
 */
import { sharedSlot } from "./shared-slot.ts";

export type StartBackground = (command: string, cwd: string) => { id: string; logPath: string };

export const backgroundShell = sharedSlot<StartBackground>("background-shell");

/** Claude Code: background tasks are off under CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1, and without a UI no later turn
 * could receive the finish notice. */
export const backgroundAllowed = (hasUI: boolean | undefined, env: NodeJS.ProcessEnv = process.env): boolean =>
	hasUI === true && env.CLAUDE_CODE_DISABLE_BACKGROUND_TASKS !== "1";
