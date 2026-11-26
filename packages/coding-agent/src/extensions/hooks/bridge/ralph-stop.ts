// The ralph-loop Stop hook, registered only while a loop runs: /ralph-loop writes the state file, /cancel-ralph and the
// hook itself remove it. No loop, no Stop hook, no process spawned at the end of a turn.
import { existsSync } from "node:fs";
import path from "node:path";
import { type HookMatcher, type HooksConfig, mergeSkillHooks } from "../config.ts";

/** The state file /ralph-loop creates in the session's working directory (see resources/ralph-loop/scripts). */
export const RALPH_STATE_FILE = path.join(".claude", "ralph-loop.local.md");

// biome-ignore lint/suspicious/noTemplateCurlyInString: shell variable, expanded when the hook runs
const STOP_HOOK = 'bash "${NYCODE_RESOURCES}/ralph-loop/hooks/stop-hook.sh"';

/** The Stop entries of the ralph-loop hook for `cwd`: empty unless a loop state file exists there. */
export function ralphStopMatchers(cwd: string): HookMatcher[] {
	if (!existsSync(path.join(cwd, RALPH_STATE_FILE))) return [];
	const config: HooksConfig = {};
	mergeSkillHooks(config, "ralph-loop", { Stop: [{ hooks: [{ type: "command", command: STOP_HOOK, timeout: 10 }] }] });
	return config.Stop ?? [];
}
