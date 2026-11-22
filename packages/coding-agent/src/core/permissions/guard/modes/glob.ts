// A small `glob.glob`: `*`, `?` and `[seq]` inside one path component, hidden names only when the pattern asks for them.
import * as fs from "node:fs";
import { join } from "./../py-path.ts";

const hasMagic = (s: string): boolean => /[*?[]/.test(s);

type Token =
	| { kind: "star" }
	| { kind: "one" }
	| { kind: "char"; c: string }
	| { kind: "set"; neg: boolean; items: [string, string][] };

/** Python `fnmatch` tokens for one component: `*`, `?`, `[seq]`/`[!seq]` with `a-z` ranges; an unclosed `[` is literal. */
function tokens(pattern: string): Token[] {
	const out: Token[] = [];
	for (let i = 0; i < pattern.length; i++) {
		const c = pattern[i];
		if (c === "*") out.push({ kind: "star" });
		else if (c === "?") out.push({ kind: "one" });
		else if (c === "[") {
			let j = i + 1;
			if (j < pattern.length && pattern[j] === "!") j++;
			if (j < pattern.length && pattern[j] === "]") j++;
			while (j < pattern.length && pattern[j] !== "]") j++;
			if (j >= pattern.length) {
				out.push({ kind: "char", c });
				continue;
			}
			let body = pattern.slice(i + 1, j);
			const neg = body.startsWith("!");
			if (neg) body = body.slice(1);
			const items: [string, string][] = [];
			for (let k = 0; k < body.length; k++) {
				if (body[k + 1] === "-" && k + 2 < body.length) {
					if (body[k] <= body[k + 2]) items.push([body[k], body[k + 2]]);
					k += 2;
				} else items.push([body[k], body[k]]);
			}
			out.push({ kind: "set", neg, items });
			i = j;
		} else out.push({ kind: "char", c });
	}
	return out;
}

const one = (t: Token, ch: string): boolean => {
	if (t.kind === "one") return true;
	if (t.kind === "char") return t.c === ch;
	if (t.kind === "set") return t.items.some(([lo, hi]) => lo <= ch && ch <= hi) !== t.neg;
	return false;
};

/** Whole-name match of one component without building a RegExp from the pattern (linear backtracking on `*`). */
function matchComponent(pattern: Token[], name: string): boolean {
	const chars = [...name];
	let p = 0;
	let n = 0;
	let starP = -1;
	let starN = 0;
	while (n < chars.length) {
		const t = pattern[p];
		if (t !== undefined && t.kind === "star") {
			starP = p++;
			starN = n;
		} else if (t !== undefined && one(t, chars[n])) {
			p++;
			n++;
		} else if (starP >= 0) {
			p = starP + 1;
			n = ++starN;
		} else return false;
	}
	while (pattern[p]?.kind === "star") p++;
	return p === pattern.length;
}

/** The existing paths matching `pattern` (absolute, or already joined to the cwd). */
export function globPaths(pattern: string): string[] {
	const abs = pattern.startsWith("/");
	const parts = pattern.split("/").filter((p, i) => p !== "" || i === 0);
	let bases = [abs ? "/" : ""];
	for (const part of parts.slice(abs ? 1 : 0)) {
		const next: string[] = [];
		for (const base of bases) {
			if (!hasMagic(part)) {
				const candidate = base === "" ? part : join(base, part);
				if (fs.existsSync(candidate) || isLink(candidate)) next.push(candidate);
				continue;
			}
			let names: string[];
			try {
				names = fs.readdirSync(base === "" ? "." : base);
			} catch {
				continue;
			}
			const toks = tokens(part);
			for (const name of names) {
				if (name.startsWith(".") && !part.startsWith(".")) continue;
				if (matchComponent(toks, name)) next.push(base === "" ? name : join(base, name));
			}
		}
		bases = next;
	}
	return bases;
}

function isLink(p: string): boolean {
	try {
		return fs.lstatSync(p).isSymbolicLink();
	} catch {
		return false;
	}
}
