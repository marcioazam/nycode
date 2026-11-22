// Conservative classification of a Bash command for the modes: "readonly", "edit" or undefined (not proven, so ask).
// Never executes the command. Port of permissions/shell.py.
import * as fs from "node:fs";
import { dirname, expanduser, isabs, join } from "../py-path.ts";
import { ShlexError, shlexSplit } from "../shlex.ts";
import { globPaths } from "./glob.ts";
import { isCritical, noProtectedBelow, resolve, scopedTarget } from "./paths.ts";

type ReadDenied = (path: string) => boolean;
export type Kind = "readonly" | "edit";

const FORBIDDEN_CHARS = new Set("`$<>\n\r\\{}!()");
const SEPS = new Set([";", "&&", "||", "|"]);
const PUNCT = new Set("();<>|&");
const GLOB_LIMIT = 200;
const READONLY = new Set([
	..."ls cat head tail wc pwd echo date whoami uname id stat file du df which true false basename dirname realpath readlink".split(
		" ",
	),
	..."sort uniq cut tr diff cmp grep egrep fgrep rg tree nl find".split(" "),
]);
const BANNED_ARGS = new Map<string, Set<string>>([
	[
		"find",
		new Set([
			"-exec",
			"-execdir",
			"-ok",
			"-okdir",
			"-delete",
			"-fprint",
			"-fprint0",
			"-fprintf",
			"-fls",
			"-files0-from",
		]),
	],
	["sort", new Set(["-o", "--output", "--compress-program", "-T", "--temporary-directory", "--files0-from"])],
	["wc", new Set(["--files0-from"])],
	["du", new Set(["--files0-from"])],
	["tree", new Set(["-o", "-R"])],
	["date", new Set(["-s", "--set"])],
	["file", new Set(["-C", "--compile", "-f", "--files-from"])],
	["rg", new Set(["--pre", "--pre-glob", "--hostname-bin", "-z", "--search-zip"])],
]);
const GNU_LONG = new Set(["sort", "date", "file", "wc", "du"]);
const BANNED_PREFIXES = new Map<string, string[]>([
	["sort", ["--output=", "--compress-program=", "--temporary-directory=", "--files0-from="]],
	["wc", ["--files0-from="]],
	["du", ["--files0-from="]],
	["file", ["--files-from="]],
	["rg", ["--pre=", "--pre-glob=", "--hostname-bin="]],
]);
const SED_S = /^s([/|,#:@])(?:(?!\1)[^\\\n])*\1(?:(?!\1)[^\\\n])*\1[gIip0-9]*\n?$/;
const SED_INPLACE = /^-i[A-Za-z0-9._~]*\n?$/;
const CONTENT_SEARCH = new Set(["grep", "egrep", "fgrep", "rg", "diff"]);
const GREP_RECURSION_LONG = ["--recursive", "--dereference-recursive", "--directories"];
const RG_FLAGS = new Set([
	...[
		"-n",
		"-i",
		"-S",
		"-F",
		"-w",
		"-c",
		"-l",
		"-H",
		"-N",
		"-s",
		"-v",
		"-q",
		"--line-number",
		"--ignore-case",
		"--fixed-strings",
	],
	...[
		"--word-regexp",
		"--count",
		"--files-with-matches",
		"--no-heading",
		"--with-filename",
		"--no-line-number",
		"--invert-match",
		"--quiet",
	],
]);
const DIFF_FLAGS = new Set([
	...[
		"-u",
		"-q",
		"-s",
		"-i",
		"-w",
		"-b",
		"-B",
		"-a",
		"-y",
		"--unified",
		"--brief",
		"--report-identical-files",
		"--ignore-case",
	],
	...["--ignore-all-space", "--ignore-space-change", "--ignore-blank-lines", "--text", "--side-by-side"],
]);
const FS_FLAGS = new Map<string, [Set<string>, number, boolean]>([
	["mkdir", [new Set(["-p", "-v", "--parents", "--verbose"]), 1, false]],
	["touch", [new Set(), 1, false]],
	["rmdir", [new Set(["-v", "--verbose"]), 1, true]],
	["rm", [new Set(["-r", "-R", "-v", "-f", "--recursive", "--verbose", "--force"]), 1, true]],
	["mv", [new Set(["-v", "-n", "-f", "--verbose", "--no-clobber", "--force"]), 2, true]],
	["cp", [new Set(["-v", "-n", "-p", "-f", "--verbose", "--no-clobber", "--force"]), 2, false]],
]);

const hasGlob = (s: string): boolean => [...s].some((c) => c === "*" || c === "?" || c === "[");

export function tokens(cmd: unknown): string[] | undefined {
	if (typeof cmd !== "string" || [...cmd].some((c) => FORBIDDEN_CHARS.has(c))) return undefined;
	try {
		const out = shlexSplit(cmd, true);
		return out.length > 0 ? out : undefined;
	} catch (error) {
		if (error instanceof ShlexError) return undefined;
		throw error;
	}
}

export function splitSegments(toks: string[]): string[][] | undefined {
	const segs: string[][] = [];
	let cur: string[] = [];
	for (const t of toks) {
		if (SEPS.has(t)) {
			if (cur.length === 0) return undefined;
			segs.push(cur);
			cur = [];
		} else if (t !== "" && [...t].every((c) => PUNCT.has(c))) {
			return undefined;
		} else cur.push(t);
	}
	if (cur.length > 0) segs.push(cur);
	return segs.length > 0 ? segs : undefined;
}

function readBlocked(arg: string, cwd: string, readDenied: ReadDenied): boolean {
	let val = arg;
	if (arg.startsWith("--")) {
		if (!arg.includes("=")) return false;
		val = arg.slice(arg.indexOf("=") + 1);
	} else if (arg.startsWith("-") && arg.length > 2) {
		for (let i = 2; i < arg.length; i++) {
			const tail = arg.slice(i);
			if (tail && !tail.startsWith("-") && readBlocked(tail, cwd, readDenied)) return true;
		}
		return arg.includes("=") && readBlocked(arg.slice(arg.indexOf("=") + 1), cwd, readDenied);
	} else if (arg.startsWith("-")) {
		return false;
	}
	if (val.startsWith("~") && !(val === "~" || val.startsWith("~/"))) return true;
	if (!val) return false;
	const cands = [val];
	if (hasGlob(val)) {
		const pat = val.startsWith("~/") ? expanduser("~") + val.slice(1) : val;
		const found = globPaths(isabs(pat) ? pat : join(cwd, pat));
		if (found.length > GLOB_LIMIT) return true;
		cands.push(...found);
	}
	for (const c of cands) {
		const r = resolve(c, cwd);
		if (r && (readDenied(r[0]) || readDenied(r[1]))) return true;
	}
	return false;
}

function bannedOption(name: string, a: string): boolean {
	const banned = BANNED_ARGS.get(name) ?? new Set<string>();
	if (banned.has(a) || (BANNED_PREFIXES.get(name) ?? []).some((p) => a.startsWith(p))) return true;
	if (a.startsWith("--")) {
		const key = a.split("=")[0];
		return GNU_LONG.has(name) && key.length >= 3 && [...banned].some((b) => b.startsWith("--") && b.startsWith(key));
	}
	if (a.startsWith("-") && a.length > 2 && a[1] !== "-") {
		return (
			name !== "find" && [...banned].some((b) => b.length === 2 && !b.startsWith("--") && a.slice(1).includes(b[1]))
		);
	}
	return false;
}

function isFile(p: string): boolean {
	try {
		return fs.statSync(p).isFile();
	} catch {
		return false;
	}
}
const isLink = (p: string): boolean => {
	try {
		return fs.lstatSync(p).isSymbolicLink();
	} catch {
		return false;
	}
};
const isDir = (p: string): boolean => {
	try {
		return fs.statSync(p).isDirectory();
	} catch {
		return false;
	}
};

function explicitRegularFiles(operands: string[], cwd: string, readDenied: ReadDenied): boolean {
	if (operands.length === 0) return false;
	for (const o of operands) {
		const r = o !== "-" && !hasGlob(o) ? resolve(o, cwd) : undefined;
		if (r === undefined || isLink(r[0]) || !isFile(r[1]) || readDenied(r[0]) || readDenied(r[1])) return false;
	}
	return true;
}

function grepRecursive(a: string): boolean {
	if (a === "recurse" || a.includes("recurse")) return true;
	if (a.startsWith("--")) {
		const key = a.split("=")[0];
		return key.length >= 4 && GREP_RECURSION_LONG.some((b) => b.startsWith(key));
	}
	return a.startsWith("-") && a.length > 1 && [...a.slice(1)].some((c) => c === "r" || c === "R");
}

function contentSearchOk(name: string, args: string[], cwd: string, readDenied: ReadDenied): boolean {
	if (name === "grep" || name === "egrep" || name === "fgrep") return !args.some(grepRecursive);
	const allowed = name === "rg" ? RG_FLAGS : DIFF_FLAGS;
	let operands: string[] = [];
	for (const a of args) {
		if (operands.length > 0 || !a.startsWith("-") || a === "-") operands.push(a);
		else if (!allowed.has(a)) return false;
	}
	if (name === "rg") operands = operands.slice(1);
	else if (operands.length !== 2) return false;
	return explicitRegularFiles(operands, cwd, readDenied);
}

function uniqOperands(args: string[]): string[] | undefined {
	const valueShort = new Set("fsw");
	const valueLong = new Set(["--skip-fields", "--skip-chars", "--check-chars", "--group"]);
	const knownLong = new Set([
		...valueLong,
		"--count",
		"--repeated",
		"--all-repeated",
		"--ignore-case",
		"--unique",
		"--zero-terminated",
	]);
	const operands: string[] = [];
	let dd = false;
	let i = 0;
	while (i < args.length) {
		const a = args[i];
		if (dd || a === "-" || !a.startsWith("-")) operands.push(a);
		else if (a === "--") dd = true;
		else if (a.startsWith("--")) {
			const eqAt = a.indexOf("=");
			const key = eqAt < 0 ? a : a.slice(0, eqAt);
			if (!knownLong.has(key)) return undefined;
			if (valueLong.has(key) && eqAt < 0) {
				if (i + 1 >= args.length) return undefined;
				i++;
			}
		} else {
			const chars = a.slice(1);
			for (let j = 0; j < chars.length; j++) {
				const c = chars[j];
				if (valueShort.has(c)) {
					if (chars.slice(j + 1) === "") {
						if (i + 1 >= args.length) return undefined;
						i++;
					}
					break;
				}
				if (!"cdDiuz".includes(c)) return undefined;
			}
		}
		i++;
	}
	return operands;
}

function readonlyOk(name: string, args: string[], cwd: string, readDenied: ReadDenied, piped: boolean): boolean {
	if (CONTENT_SEARCH.has(name) && !contentSearchOk(name, args, cwd, readDenied)) return false;
	if (args.some((a) => bannedOption(name, a))) return false;
	if (name === "uniq") {
		const operands = uniqOperands(args);
		if (operands === undefined || operands.length > 1 || (piped && operands.length > 0)) return false;
	}
	return !args.some((a) => readBlocked(a, cwd, readDenied));
}

function parseOperands(args: string[], allowed: Set<string>): [Set<string>, string[]] | undefined {
	const flags = new Set<string>();
	const operands: string[] = [];
	let dd = false;
	for (const a of args) {
		if (dd || a === "-" || !a.startsWith("-")) operands.push(a);
		else if (a === "--") dd = true;
		else if (a.startsWith("--")) {
			if (!allowed.has(a)) return undefined;
			flags.add(a);
		} else {
			for (const c of a.slice(1)) {
				if (!allowed.has(`-${c}`)) return undefined;
				flags.add(`-${c}`);
			}
		}
	}
	return [flags, operands];
}

function targetsOk(operands: string[], cwd: string, roots: string[], critical: boolean): boolean {
	for (const o of operands) {
		if (hasGlob(o)) return false;
		const r = scopedTarget(o, cwd, roots);
		if (r === undefined || (critical && (isCritical(r[0], roots) || isCritical(r[1], roots)))) return false;
	}
	return true;
}

function sedKind(args: string[], cwd: string, roots: string[], readDenied: ReadDenied): Kind | undefined {
	let inplace = false;
	let script: string | undefined;
	const operands: string[] = [];
	let dd = false;
	for (let i = 0; i < args.length; i++) {
		const a = args[i];
		if (dd || a === "-" || !a.startsWith("-")) operands.push(a);
		else if (a === "--") dd = true;
		else if (a === "-n" || a === "-E" || a === "-r") continue;
		else if (SED_INPLACE.test(a)) inplace = true;
		else if (a === "-e" && script === undefined && i + 1 < args.length) {
			i++;
			script = args[i];
		} else return undefined;
	}
	if (script === undefined) {
		if (operands.length === 0) return undefined;
		script = operands.shift() as string;
	}
	if (!SED_S.test(script) || (inplace && operands.length === 0)) return undefined;
	if (!targetsOk(operands, cwd, roots, false) || operands.some((o) => readBlocked(o, cwd, readDenied)))
		return undefined;
	return inplace ? "edit" : "readonly";
}

function filePairOk(name: string, operands: string[], cwd: string): boolean {
	if (operands.length !== 2) return false;
	const src = resolve(operands[0], cwd);
	const dst = resolve(operands[1], cwd);
	if (src === undefined || dst === undefined || isLink(src[0]) || !isFile(src[1])) return false;
	if (isLink(dst[0]) || isDir(dst[1]) || operands[1].endsWith("/") || !isDir(dirname(dst[1]))) return false;
	let exists = true;
	try {
		fs.lstatSync(dst[1]);
	} catch {
		exists = false;
	}
	if (exists) return isFile(dst[1]) && (name === "mv" || fs.statSync(dst[1]).nlink === 1);
	return true;
}

function fsOk(name: string, args: string[], cwd: string, roots: string[], readDenied: ReadDenied): boolean {
	const [allowed, minimum, critical] = FS_FLAGS.get(name) as [Set<string>, number, boolean];
	const parsed = parseOperands(args, allowed);
	if (parsed === undefined) return false;
	const [flags, operands] = parsed;
	const recursive = flags.has("-r") || flags.has("-R") || flags.has("--recursive");
	if (operands.length < minimum || (name === "rm" && recursive && (flags.has("-f") || flags.has("--force"))))
		return false;
	if (name === "cp" && operands.some((o) => readBlocked(o, cwd, readDenied))) return false;
	if (!targetsOk(operands, cwd, roots, critical)) return false;
	if (name === "cp" || name === "mv") return filePairOk(name, operands, cwd);
	if (name === "rm" && recursive) {
		return operands.every((o) => {
			const r = resolve(o, cwd) as [string, string];
			return r[0] === r[1] && noProtectedBelow(r[1]);
		});
	}
	return true;
}

function segmentKind(
	argv: string[],
	cwd: string,
	roots: string[],
	readDenied: ReadDenied,
	piped: boolean,
): Kind | undefined {
	const name = argv[0];
	const args = argv.slice(1);
	if (name.includes("/") || name.includes("=")) return undefined;
	if (name === "sed") return sedKind(args, cwd, roots, readDenied);
	if (FS_FLAGS.has(name)) return fsOk(name, args, cwd, roots, readDenied) ? "edit" : undefined;
	if (READONLY.has(name)) return readonlyOk(name, args, cwd, readDenied, piped) ? "readonly" : undefined;
	return undefined;
}

function pipedFlags(toks: string[], segs: string[][]): boolean[] | undefined {
	const flags: boolean[] = [];
	let piped = false;
	let started = false;
	for (const t of toks) {
		if (SEPS.has(t)) {
			if (started) flags.push(piped);
			piped = t === "|";
			started = false;
		} else started = true;
	}
	if (started) flags.push(piped);
	return flags.length === segs.length ? flags : undefined;
}

/** "readonly": proven read only (chains and pipes allowed). "edit": ONE filesystem command in scope. Otherwise undefined. */
export function analyze(cmd: unknown, cwd: string, roots: string[], readDenied: ReadDenied): Kind | undefined {
	const toks = tokens(cmd);
	const segs = toks ? splitSegments(toks) : undefined;
	if (!toks || !segs) return undefined;
	const piped = pipedFlags(toks, segs);
	if (piped === undefined) return undefined;
	const kinds = segs.map((s, i) => segmentKind(s, cwd, roots, readDenied, piped[i]));
	if (kinds.includes(undefined)) return undefined;
	if (kinds.includes("edit")) return segs.length === 1 ? "edit" : undefined;
	return "readonly";
}
