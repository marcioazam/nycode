// Detects bash commands that wait in the foreground (long `sleep`, polling loops), ignoring background lists (`... &`).

const SLEEP_LIMIT_S = 30;
const UNIT: Record<string, number> = { "": 1, s: 1, m: 60, h: 3600, d: 86400 };
// `sleep` in command position (start, after ; & | ( newline, do/then, or `timeout N`); inside another command's quotes it does not count.
const SLEEP = /(?:^|[;&|(\n]|\bdo\b|\bthen\b|\btimeout\s+\S+)\s*sleep\s+(\d+(?:\.\d+)?)([smhd]?)/g;

/**
 * The command without the lists that end in `&` (background): `sleep 90 &`, `(sleep 90 && cmd) &`, `a && sleep 9 &`,
 * `while ...; do sleep 1; done &`. A scan over quotes, parentheses and do/done; not a full shell parser
 * (`if/fi`, `{ }` and `case` followed by `&` are not recognized; the worst case is refusing a background sleep).
 */
function withoutBackground(command: string): string {
	const lists: string[] = [];
	let start = 0;
	let paren = 0;
	let loops = 0;
	let quote = "";
	const cut = (end: number, background: boolean, next: number) => {
		if (!background) lists.push(command.slice(start, end));
		start = next;
	};
	for (let i = 0; i < command.length; i++) {
		const c = command[i] as string;
		if (quote) {
			if (c === "\\" && quote === '"') i++;
			else if (c === quote) quote = "";
			continue;
		}
		if (c === "\\") i++;
		else if (c === "'" || c === '"') quote = c;
		else if (c === "(") paren++;
		else if (c === ")") paren = Math.max(0, paren - 1);
		else if (/[a-z]/.test(c) && !/\w/.test(command[i - 1] ?? " ")) {
			const word = /^[a-z]+(?![\w-])/.exec(command.slice(i))?.[0];
			if (word === "do") loops++;
			else if (word === "done") loops = Math.max(0, loops - 1);
			if (word) i += word.length - 1;
		} else if (paren === 0 && loops === 0) {
			if (c === ";" || c === "\n") cut(i, false, i + 1);
			else if (
				c === "&" &&
				command[i + 1] !== "&" &&
				command[i - 1] !== "&" &&
				!/[|<>]/.test(command[i - 1] ?? "") &&
				command[i + 1] !== ">"
			)
				cut(i, true, i + 1);
		}
	}
	cut(command.length, false, command.length);
	return lists.join("\n");
}

/** The command exists to wait: `sleep`s adding up to 30 s or more, or a while/until loop with `sleep` (periodic polling). */
export function waitsInForeground(full: string): boolean {
	const command = withoutBackground(full);
	let total = 0;
	let n = 0;
	for (const m of command.matchAll(SLEEP)) {
		total += Number(m[1]) * (UNIT[m[2] ?? ""] as number);
		n++;
	}
	return total >= SLEEP_LIMIT_S || (n > 0 && /(?:^|[;&|(\n])\s*(?:while|until)\b/.test(command));
}

export { SLEEP_LIMIT_S };
