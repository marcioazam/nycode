// Bash words of the guard: line continuations, newlines as separators, tokens, short and long flags.
// Port of the first half of permissions/parse.py; every loop is linear in the size of the command.
import { shlexSplit } from "../shlex.ts";

export type Finding = readonly ["ask" | "deny", string];

/** Removes a backslash-newline outside single quotes; inside them the backslash is literal. */
export function joinContinuations(cmd: string): string {
	const out: string[] = [];
	let quote = "";
	for (let i = 0; i < cmd.length; i++) {
		const c = cmd[i];
		if (quote === "'") {
			out.push(c);
			if (c === "'") quote = "";
		} else if (c === "\\" && i + 1 < cmd.length && cmd[i + 1] === "\n") {
			i++;
		} else if (c === "\\" && i + 1 < cmd.length) {
			out.push(cmd.slice(i, i + 2));
			i++;
		} else if ((c === "'" || c === '"') && quote === "") {
			out.push(c);
			quote = c;
		} else if (c === '"' && quote === '"') {
			out.push(c);
			quote = "";
		} else {
			out.push(c);
		}
	}
	return out.join("");
}

/** A newline outside quotes separates commands; inside quotes it stays (a `bash -c` script keeps its lines). */
function newlinesToSeparators(cmd: string): string {
	const out: string[] = [];
	let quote = "";
	for (let i = 0; i < cmd.length; i++) {
		const c = cmd[i];
		if (quote) {
			out.push(c);
			if (c === "\\" && quote === '"' && i + 1 < cmd.length) {
				out.push(cmd[i + 1]);
				i++;
			} else if (c === quote) {
				quote = "";
			}
		} else if (c === "\\" && i + 1 < cmd.length) {
			out.push(cmd.slice(i, i + 2));
			i++;
		} else if (c === "'" || c === '"') {
			quote = c;
			out.push(c);
		} else {
			out.push(c === "\n" ? " ; " : c);
		}
	}
	return out.join("");
}

/** The words of the guard's tokenizer: POSIX shlex with punctuation runs; unbalanced quotes fall back to a rough cut. */
export function tokenize(cmd: string): string[] {
	try {
		return shlexSplit(newlinesToSeparators(cmd), true);
	} catch {
		return cmd.replaceAll("\n", " ; ").match(/\|\||&&|[;|&]|[^\s;|&]+/g) ?? [];
	}
}

/** The flags of an argument list: `--long` as written, `-abc` split into `-a`, `-b`, `-c`. */
export function shortFlags(args: string[]): Set<string> {
	const flags = new Set<string>();
	for (const a of args) {
		if (a.startsWith("--")) flags.add(a);
		else if (a.startsWith("-") && a.length > 1) for (const c of a.slice(1)) flags.add(`-${c}`);
	}
	return flags;
}

/** GNU getopt_long: `--rec` abbreviates `--recursive` (a unique prefix of 3 or more characters, the `--` included). */
export function longOpt(flags: Set<string>, full: string): boolean {
	for (const f of flags) {
		if (!f.startsWith("--")) continue;
		const key = f.split("=")[0];
		if (key.length >= 3 && full.startsWith(key)) return true;
	}
	return false;
}

/** Python `str.strip(" \t")`, without a regular expression. */
export function stripSpaceTab(line: string): string {
	let start = 0;
	let end = line.length;
	while (start < end && (line[start] === " " || line[start] === "\t")) start++;
	while (end > start && (line[end - 1] === " " || line[end - 1] === "\t")) end--;
	return line.slice(start, end);
}
