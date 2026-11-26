// Removes credentials from server text before it can reach a user-facing message or a log.

const SECRET_PATTERNS = [/devin-session-token\$[^\s"'`]*/gi, /wspkce\$[^\s"'`]*/gi, /eyJ[\w-]*(?:\.[\w-]*)*/g];

/** Replaces session tokens, `wspkce$` keys and JWT-like strings in `text` with `[redacted]`. */
export function redactSecrets(text: string): string {
	return SECRET_PATTERNS.reduce((out, pattern) => out.replace(pattern, "[redacted]"), text);
}
