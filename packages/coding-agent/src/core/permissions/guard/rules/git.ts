// Git rules of the guard: push (force and protected branches), reset --hard, clean -f, rebase, branch -D, checkout
// that discards changes, an alias defined on the command line, and `--no-verify` on commit, push and merge (always
// denied: hooks are a gate the agent may not skip). Port of `check_git` of permissions/rules.py.
import * as fs from "node:fs";
import { type Finding, shortFlags } from "../lex/tokens.ts";
import { abspath, dirname, join, pyStrip } from "../py-path.ts";

export const PROTECTED_BRANCHES = new Set(["main", "master"]);
const HEADS_PREFIX = "ref: refs/heads/";
const FIRST_CHUNK = 8192; // Python's text reader decodes this much before readline returns

const stripRef = (ref: string): string => (ref.startsWith("refs/heads/") ? ref.slice("refs/heads/".length) : ref);

function isFile(path: string): boolean {
	try {
		return fs.statSync(path).isFile();
	} catch {
		return false;
	}
}

function isDir(path: string): boolean {
	try {
		return fs.statSync(path).isDirectory();
	} catch {
		return false;
	}
}

/** First line of a text file, read like Python's `open().readline().strip()`; throws on bad UTF-8 or I/O errors. */
function firstLine(path: string): string {
	const fd = fs.openSync(path, "r");
	try {
		const buffer = Buffer.alloc(FIRST_CHUNK);
		const read = fs.readSync(fd, buffer, 0, FIRST_CHUNK, 0);
		const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(buffer.subarray(0, read), {
			stream: true,
		});
		return pyStrip(text.split(/\r\n|\r|\n/)[0]);
	} finally {
		fs.closeSync(fd);
	}
}

/** Current branch read from HEAD (`.git/HEAD` or a worktree's gitdir) upward from cwd, with no subprocess. */
export function currentBranch(cwd: string): string | undefined {
	let d = cwd ? abspath(cwd) : "";
	try {
		while (d) {
			let g = join(d, ".git");
			if (isFile(g)) {
				const first = firstLine(g);
				if (!first.startsWith("gitdir:")) return undefined;
				g = join(d, pyStrip(first.slice(7)));
			}
			if (isDir(g)) {
				const head = firstLine(join(g, "HEAD"));
				return head.startsWith(HEADS_PREFIX) ? head.slice(HEADS_PREFIX.length) : undefined;
			}
			const parent = dirname(d);
			if (parent === d) break;
			d = parent;
		}
	} catch {
		// Unreadable or not UTF-8: the branch is unknown, as in the former Python guard.
	}
	return undefined;
}

const lstripPlus = (text: string): string => text.replace(/^\++/, "");
const PUSH_VALUE_OPTS = new Set(["-o", "--push-option", "--repo", "--receive-pack", "--exec"]);
const PUSH_VALUE_OPTS_SHORT = new Set(["o"]);
// git global options whose value may be the next word (git 2.53); a missing one makes its value read as the subcommand
const GIT_VALUE_OPTS = new Set([
	"-C",
	"-c",
	"--git-dir",
	"--work-tree",
	"--namespace",
	"--config-env",
	"--attr-source",
	"--exec-path",
]);

// Options of `git commit` and `git merge` that take a value (the next word, or the rest of a short cluster): a value
// such as `-m "--no-verify"` is a message, not the flag.
const COMMIT_VALUE_SHORT = new Set(["m", "F", "C", "c", "t"]);
const COMMIT_VALUE_LONG = new Set(["--message", "--file", "--reuse-message", "--reedit-message", "--template"]);
const MERGE_VALUE_SHORT = new Set(["m", "F", "s", "X"]);
const MERGE_VALUE_LONG = new Set(["--message", "--file", "--strategy", "--strategy-option", "--into-name"]);

/**
 * True when `args` (after the git subcommand) skip the hooks: `--no-verify` (git accepts any unique prefix, so `--no-v`
 * and longer), or `-n` in a short cluster when `shortN` (`git commit` only: `git push -n` is a dry run).
 * Values of message-like options are skipped; every other word is judged, so a quoted flag-like word elsewhere is
 * a false positive that stays denied (fail closed).
 */
function skipsHooks(args: string[], valueShort: Set<string>, valueLong: Set<string>, shortN: boolean): boolean {
	for (let i = 0; i < args.length; i++) {
		const a = args[i];
		if (a === "--") return false;
		if (a.startsWith("--")) {
			const key = a.split("=")[0];
			if (key.length >= 6 && "--no-verify".startsWith(key)) return true;
			if (valueLong.has(key) && !a.includes("=")) i++;
		} else if (a.startsWith("-") && a.length > 1) {
			for (let k = 1; k < a.length; k++) {
				if (shortN && a[k] === "n") return true;
				if (valueShort.has(a[k])) {
					if (k === a.length - 1) i++;
					break;
				}
			}
		}
	}
	return false;
}

function deletesProtected(rest: string[]): boolean {
	const pos = rest.filter((a) => !a.startsWith("-"));
	if (pos.some((a) => lstripPlus(a).startsWith(":") && PROTECTED_BRANCHES.has(stripRef(lstripPlus(a).slice(1))))) {
		return true;
	}
	const flags = shortFlags(rest);
	return (flags.has("--delete") || flags.has("-d")) && pos.some((a) => PROTECTED_BRANCHES.has(stripRef(a)));
}

function checkPush(rest: string[], cwd: string): Finding[] {
	const flags = shortFlags(rest);
	const pos: string[] = [];
	let skip = false;
	for (const a of rest) {
		if (skip) skip = false;
		else if (PUSH_VALUE_OPTS.has(a)) skip = true;
		else if (!a.startsWith("-")) pos.push(a);
	}
	const refspecs = pos.slice(1);
	const force = [...flags].some((f) => f === "-f" || f.startsWith("--force")) || pos.some((a) => a.startsWith("+"));
	const targets = new Set(pos.map((a) => stripRef(lstripPlus(a).split(":").at(-1) as string)));
	const head = currentBranch(cwd) ?? "";
	for (const t of [...targets]) if (t === "HEAD" || t === "@") targets.add(head);
	if (deletesProtected(rest)) return [["deny", "git push apagando main/master"]];
	if ([...flags].some((f) => f === "--mirror" || (f.length >= 5 && "--mirror".startsWith(f)))) {
		return [["deny", "git push forçado para main/master"]];
	}
	if (force && [...targets].some((t) => PROTECTED_BRANCHES.has(t)))
		return [["deny", "git push forçado para main/master"]];
	const implicit = refspecs.length === 0 || refspecs.some((a) => lstripPlus(a) === "HEAD" || lstripPlus(a) === "@");
	if (force && flags.has("--all")) return [["deny", "git push forçado com --all inclui main/master"]];
	if (force && implicit && PROTECTED_BRANCHES.has(head)) return [["deny", "git push forçado da branch main/master"]];
	return [["ask", `git push${force ? " --force" : ""}`]];
}

/** Findings of a `git` invocation; `cwdInput` is where the branch of a refspec-less push is read. */
export function checkGit(args: string[], cwdInput: string): Finding[] {
	let cwd = cwdInput;
	const found: Finding[] = [];
	let i = 0;
	while (i < args.length && args[i].startsWith("-")) {
		const a = args[i];
		const lower = a.toLowerCase();
		if (
			(a === "-c" && i + 1 < args.length && args[i + 1].toLowerCase().startsWith("alias.")) ||
			lower.startsWith("-calias.")
		) {
			found.push(["ask", "git com alias definido em linha (-c alias.x=...)"]);
		}
		if (["-C", "--git-dir", "--work-tree"].includes(a) || a.startsWith("--git-dir=") || a.startsWith("--work-tree="))
			cwd = "";
		i += GIT_VALUE_OPTS.has(a) ? 2 : 1;
	}
	if (i >= args.length) return found;
	const sub = args[i];
	const rest = args.slice(i + 1);
	const flags = shortFlags(rest);
	const skip: Finding = ["deny", `git ${sub} --no-verify pula os hooks`];
	if (sub === "push") {
		if (skipsHooks(rest, PUSH_VALUE_OPTS_SHORT, PUSH_VALUE_OPTS, false)) found.push(skip);
		return [...found, ...checkPush(rest, cwd)];
	}
	if (sub === "commit" && skipsHooks(rest, COMMIT_VALUE_SHORT, COMMIT_VALUE_LONG, true)) found.push(skip);
	if (sub === "merge" && skipsHooks(rest, MERGE_VALUE_SHORT, MERGE_VALUE_LONG, false)) found.push(skip);
	if (sub === "reset" && rest.includes("--hard")) return [...found, ["ask", "git reset --hard"]];
	if (sub === "clean" && (flags.has("-f") || flags.has("--force"))) return [...found, ["ask", "git clean -f"]];
	if (sub === "rebase") return [...found, ["ask", "git rebase"]];
	if (sub === "branch" && flags.has("-D")) return [...found, ["ask", "git branch -D"]];
	if (sub === "checkout" && (rest.includes("--") || rest.includes(".")))
		return [...found, ["ask", "git checkout descartando mudanças"]];
	return found;
}
