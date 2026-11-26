/** `autoMemoryStorage: "claude"`: the memory store Claude Code keeps for the project, read and written in place so
 * both tools share one set of memories. The one opt-in exception to D-62 (Nycode otherwise never reads ~/.claude). */

import * as os from "node:os";
import * as path from "node:path";

/** Which per-project store auto memory uses: Nycode's own, or the one Claude Code keeps. */
export type MemoryStorage = "nycode" | "claude";

/** 'claude' selects Claude Code's store; anything else, absent or mistyped, keeps Nycode's own, so a typo cannot
 * silently strand an existing store. */
export function memoryStorageSetting(setting: unknown): MemoryStorage {
	return typeof setting === "string" && setting.trim().toLowerCase() === "claude" ? "claude" : "nycode";
}

/** Claude Code cuts a project directory name at this length and appends a hash. */
const CLAUDE_SLUG_MAX = 200;

/** Claude Code's string hash: 31 * hash + code unit, wrapped to 32 bits. */
function claudePathHash(text: string): number {
	let hash = 0;
	for (let i = 0; i < text.length; i++) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
	return hash;
}

/** The directory name Claude Code gives a project: every character outside the ASCII alphanumerics becomes one
 * dash; a name longer than 200 characters is cut there and gets a base-36 hash of the path. */
export function claudeProjectSlug(project: string): string {
	const slug = project.replace(/[^a-zA-Z0-9]/g, "-");
	if (slug.length <= CLAUDE_SLUG_MAX) return slug;
	return `${slug.slice(0, CLAUDE_SLUG_MAX)}-${Math.abs(claudePathHash(project)).toString(36)}`;
}

/** `CLAUDE_CODE_PROJECT_DIR_NAME` replaces the slug; Claude Code reads it only when `CLAUDE_CONFIG_DIR` is set, and
 * only as one plain segment that is not a Windows device name. */
function claudeProjectDirName(): string | undefined {
	const name = process.env.CLAUDE_CODE_PROJECT_DIR_NAME;
	if (!process.env.CLAUDE_CONFIG_DIR || !name) return undefined;
	return /^[A-Za-z0-9_-]{1,64}$/.test(name) && !/^(?:con|prn|aux|nul|com\d|lpt\d)$/i.test(name) ? name : undefined;
}

/** <claude config>/projects/<project slug>/memory for the project root `project` (the caller keys it on the
 * repository root, as Nycode's own store). `CLAUDE_CODE_REMOTE_MEMORY_DIR` replaces the config dir as the root.
 * Claude Code normalises the path and the result to NFC. */
export function claudeMemoryDir(project: string): string {
	const config = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
	const root = process.env.CLAUDE_CODE_REMOTE_MEMORY_DIR || config;
	const slug = claudeProjectSlug(project.normalize("NFC"));
	const dir = root === config ? (claudeProjectDirName() ?? slug) : slug;
	return path.join(root, "projects", dir, "memory").normalize("NFC");
}

/** `content` with the frontmatter Claude Code's recall reads: `name`, `description` (a memory without one is
 * flagged unreliable) and the type nested under `metadata`. Fields already present are kept. The description is a
 * JSON string (a YAML double-quoted scalar), so a colon or hash in it cannot break the block. */
export function claudeFrontmatter(content: string, name: string, description: string): string {
	const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content);
	const eol = match?.[0].includes("\r\n") ? "\r\n" : "\n";
	const lines = match ? (match[1] === "" ? [] : match[1].split(/\r?\n/)) : [];
	const rest = match ? content.slice(match[0].length) : `\n\n${content}`;
	const has = (key: string): boolean => lines.some((line) => line.startsWith(`${key}:`));
	const added = [
		...(has("name") ? [] : [`name: ${name}`]),
		...(has("description") ? [] : [`description: ${JSON.stringify(description.replace(/\s+/g, " ").trim())}`]),
	];
	const body = has("metadata")
		? lines
		: lines.flatMap((line) => (line.startsWith("type:") ? ["metadata:", `  ${line}`] : [line]));
	return `---${eol}${[...added, ...body].join(eol)}${eol}---${rest}`;
}
