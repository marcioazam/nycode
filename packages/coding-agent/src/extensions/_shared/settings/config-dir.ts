/**
 * The user-scope configuration directory (D-62): the nycode agent directory. nycode reads no other tool's home
 * directory: the user's instructions, rules, skills, agents, commands, output styles, plugins and settings all live in
 * `~/.nycode/agent`. A project's own configuration directories are unaffected.
 */

import { getAgentDir } from "../../../config.ts";

/** The user-scope config directory: the nycode agent directory (`~/.nycode/agent` or `NYCODE_CODING_AGENT_DIR`). */
export function userConfigDir(): string {
	return getAgentDir();
}
