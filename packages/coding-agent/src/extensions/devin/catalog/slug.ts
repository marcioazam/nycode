// Turns an RPC family uid into the slug `devin models list` shows (what users save as --model).

/**
 * `claude-opus-5-5` -> `claude-opus-5.5`, `claude-5-fable` -> `claude-fable-5`, `muse-wonder-1-0` -> `muse-wonder`,
 * `deepseek-v4-1-flash-1017` -> `deepseek-v4.1-flash`. Rules, in order: drop a trailing 4-digit build id or `-1-0`;
 * `claude-<n>-<name>` becomes `claude-<name>-<n>`; a single digit, dash, single digit becomes a dot.
 */
export function normalizeSlug(uid: string): string {
	return uid
		.replace(/-\d{4}$/, "")
		.replace(/-1-0$/, "")
		.replace(/^claude-(\d)-([a-z]+)$/, "claude-$2-$1")
		.replace(/(?<![\d.])(\d)-(\d)(?!\d)/g, "$1.$2");
}
