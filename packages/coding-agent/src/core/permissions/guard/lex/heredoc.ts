// Heredoc masking and the fork bomb: the body of a heredoc is text unless a shell reads it. Port of permissions/parse.py.
import { stripSpaceTab } from "./tokens.ts";

const HEREDOC_HEAD_RE = /<<[-~]?[ \t]*(['"]?)([\p{L}\p{N}_]+)\1/uy;
const SHELL_WORD_RE =
	/(?<![\p{L}\p{N}_.-])(?:(?:ba|z|da|k|fi)?sh|source|eval)(?![\p{L}\p{N}_])(?!\.)|(?<![\p{L}\p{N}_.-])\.(?![\p{L}\p{N}_.-])/gu;
const BOMB_OPEN_RE = /\(\)\s*\{/g;
const BOMB_BODY_RE = /\s*(\S{1,64}?)\s*\|\s*(\S{1,64}?)\s*&\s*\}/uy;
const WORD_START = " \t\n;&|(";

export const commentStart = (cmd: string, i: number): boolean => i === 0 || WORD_START.includes(cmd[i - 1]);

/** Where each line's text (stripped of spaces and tabs) appears, so a heredoc terminator is found by bisection. */
export class LineIndex {
	readonly offsets: number[] = [0];
	private readonly where = new Map<string, number[]>();

	constructor(cmd: string) {
		const lines = cmd.split("\n");
		for (let idx = 0; idx < lines.length; idx++) {
			this.offsets.push(this.offsets[this.offsets.length - 1] + lines[idx].length + 1);
			const s = stripSpaceTab(lines[idx]);
			if (s) {
				const at = this.where.get(s);
				if (at) at.push(idx);
				else this.where.set(s, [idx]);
			}
		}
	}

	/** The line a position falls on (Python `bisect_right(offsets, pos) - 1`). */
	lineOf(pos: number): number {
		let lo = 0;
		let hi = this.offsets.length;
		while (lo < hi) {
			const mid = (lo + hi) >> 1;
			if (pos < this.offsets[mid]) hi = mid;
			else lo = mid + 1;
		}
		return lo - 1;
	}

	/** The first line from `firstLine` on whose text is `tag`. */
	terminator(tag: string, firstLine: number): number | undefined {
		const lines = this.where.get(tag) ?? [];
		let lo = 0;
		let hi = lines.length;
		while (lo < hi) {
			const mid = (lo + hi) >> 1;
			if (lines[mid] < firstLine) lo = mid + 1;
			else hi = mid;
		}
		return lo < lines.length ? lines[lo] : undefined;
	}
}

/** Index of the `)` closing the `(` opened before `i` (quotes and escapes respected), or -1. */
export function matchParen(cmd: string, start: number, lazy: LineIndex[]): number {
	let i = start;
	let depth = 1;
	let quote = "";
	while (i < cmd.length) {
		const c = cmd[i];
		if (quote === "'") {
			if (c === "'") quote = "";
		} else if (c === "\\") {
			i++;
		} else if (quote === '"') {
			if (c === '"') quote = "";
		} else if (c === "'" || c === '"') {
			quote = c;
		} else if (c === "<" && cmd.startsWith("<<", i) && (i === 0 || cmd[i - 1] !== "<") && headAt(cmd, i)) {
			const head = headAt(cmd, i) as RegExpExecArray;
			if (lazy.length === 0) lazy.push(new LineIndex(cmd));
			const term = lazy[0].terminator(head[2], lazy[0].lineOf(i) + 1);
			i = term !== undefined ? lazy[0].offsets[term + 1] - 1 : i + head[0].length;
			continue;
		} else if (c === "(") {
			depth++;
		} else if (c === ")") {
			depth--;
			if (depth === 0) return i;
		}
		i++;
	}
	return -1;
}

function headAt(cmd: string, i: number): RegExpExecArray | null {
	HEREDOC_HEAD_RE.lastIndex = i;
	return HEREDOC_HEAD_RE.exec(cmd);
}

/** Positions of `$( )` and backticks in an unquoted heredoc: the shell runs those, the rest of the body is text. */
function substKeep(cmd: string, start: number, end: number): Set<number> {
	const keep = new Set<number>();
	let i = start;
	let quote = "";
	const mark = (from: number, to: number): void => {
		for (let k = from; k <= to; k++) keep.add(k);
	};
	while (i < end) {
		const c = cmd[i];
		if (quote === "'") {
			if (c === "'") quote = "";
			i++;
			continue;
		}
		if (c === "\\") {
			i += 2;
			continue;
		}
		if (c === "'") {
			quote = "'";
			i++;
			continue;
		}
		if (c === '"') {
			quote = quote === '"' ? "" : '"';
			i++;
			continue;
		}
		if (c === "`") {
			let j = i + 1;
			while (j < end && cmd[j] !== "`") j += cmd[j] === "\\" ? 2 : 1;
			if (j < end) {
				mark(i, j);
				i = j + 1;
				continue;
			}
		}
		if (c === "$" && i + 1 < end && cmd[i + 1] === "(") {
			const j = matchParen(cmd, i + 2, []);
			if (j >= 0 && j < end) {
				mark(i, j);
				i = j + 1;
				continue;
			}
		}
		i++;
	}
	return keep;
}

/** A shell word between `from` and `to` of the heredoc head line (a shell reads the body then). */
function shellOnLine(cmd: string, from: number, to: number): boolean {
	const lead = from > 0 ? 1 : 0;
	const line = cmd.slice(from - lead, to);
	SHELL_WORD_RE.lastIndex = lead;
	return SHELL_WORD_RE.test(line);
}

/** Same length, heredoc body blank (newlines kept), except when the `<<` line has a shell (`bash <<EOF`, `<<EOF | sh`). */
export function maskHeredocs(cmd: string): string {
	if (!cmd.includes("<<")) return cmd;
	const n = cmd.length;
	const index = new LineIndex(cmd);
	const offsets = index.offsets;
	const out = [...cmd];
	const nextLine = new Map<number, number>();
	const jump = new Map<number, number>();
	let quote = "";
	let i = 0;
	while (i < n) {
		const c = cmd[i];
		const jumpTo = c === "\n" ? jump.get(i) : undefined;
		if (jumpTo !== undefined) {
			i = jumpTo;
			continue;
		}
		if (quote === "'") {
			if (c === "'") quote = "";
		} else if (c === "\\") {
			i++;
		} else if (quote === '"') {
			if (c === '"') quote = "";
		} else if (c === "'" || c === '"') {
			quote = c;
		} else if (c === "#" && commentStart(cmd, i)) {
			const nl = cmd.indexOf("\n", i);
			i = nl < 0 ? n : nl;
			continue;
		} else if (c === "<" && (i === 0 || cmd[i - 1] !== "<") && cmd.startsWith("<<", i)) {
			const head = headAt(cmd, i);
			if (head) {
				const headLine = index.lineOf(i);
				const first = nextLine.get(headLine) ?? headLine + 1;
				const term = index.terminator(head[2], first);
				if (term !== undefined) {
					nextLine.set(headLine, term + 1);
					jump.set(offsets[headLine + 1] - 1, offsets[term + 1] - 1);
					if (!shellOnLine(cmd, offsets[headLine], offsets[headLine + 1] - 1)) {
						const keep = head[1] ? new Set<number>() : substKeep(cmd, offsets[first], offsets[term]);
						for (let p = offsets[first]; p < offsets[term]; p++)
							if (out[p] !== "\n" && !keep.has(p)) out[p] = " ";
					}
				}
				i += head[0].length;
				continue;
			}
		}
		i++;
	}
	return out.join("");
}

/** Same length, heredoc bodies and quoted text blanked: quoted text is not a command. */
export function maskText(cmd: string): string {
	const out = [...maskHeredocs(cmd)];
	let quote = "";
	for (let i = 0; i < out.length; i++) {
		const c = out[i];
		if (quote) {
			if (c === quote && (quote === "'" || out[i - 1] !== "\\")) quote = "";
			else out[i] = "x";
		} else if (c === "'" || c === '"') {
			quote = c;
		}
	}
	return out.join("");
}

/** `name(){ name|name& }` for any name. One pass: each `(){` looks at a short window only. */
export function forkBomb(text: string): boolean {
	BOMB_OPEN_RE.lastIndex = 0;
	for (let m = BOMB_OPEN_RE.exec(text); m !== null; m = BOMB_OPEN_RE.exec(text)) {
		let j = m.index;
		while (j > 0 && " \t\n\r\f\v".includes(text[j - 1])) j--;
		BOMB_BODY_RE.lastIndex = m.index + m[0].length;
		const b = BOMB_BODY_RE.exec(text);
		if (b && b[1] === b[2] && text.slice(0, j).endsWith(b[1])) return true;
	}
	return false;
}
