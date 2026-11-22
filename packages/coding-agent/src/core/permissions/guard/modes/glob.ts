// A small `glob.glob`: `*`, `?` and `[seq]` inside one path component, hidden names only when the pattern asks for them.
import * as fs from "node:fs";
import { join } from "./../py-path.ts";

const hasMagic = (s: string): boolean => /[*?[]/.test(s);

/** Python `fnmatch.translate` for one component (no slashes inside). */
function componentRegExp(pattern: string): RegExp {
	let out = "";
	for (let i = 0; i < pattern.length; i++) {
		const c = pattern[i];
		if (c === "*") out += "[^]*";
		else if (c === "?") out += "[^]";
		else if (c === "[") {
			let j = i + 1;
			if (j < pattern.length && pattern[j] === "!") j++;
			if (j < pattern.length && pattern[j] === "]") j++;
			while (j < pattern.length && pattern[j] !== "]") j++;
			if (j >= pattern.length) {
				out += "\\[";
			} else {
				let stuff = pattern.slice(i + 1, j).replaceAll("\\", "\\\\");
				if (stuff.startsWith("!")) stuff = `^${stuff.slice(1)}`;
				out += `[${stuff.replace(/\]/g, "\\]").replace(/^\^\\\]/, "^\\]")}]`;
				i = j;
			}
		} else out += c.replace(/[.*+?^${}()|[\]\\/-]/g, "\\$&");
	}
	return new RegExp(`^${out}$`, "u");
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
			const re = componentRegExp(part);
			for (const name of names) {
				if (name.startsWith(".") && !part.startsWith(".")) continue;
				if (re.test(name)) next.push(base === "" ? name : join(base, name));
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
