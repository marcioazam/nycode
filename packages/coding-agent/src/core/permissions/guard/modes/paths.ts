// Scope, protected and critical paths of the permission modes. Port of permissions/paths.py; symlinks go through realpath.
import * as fs from "node:fs";
import { dirname, expanduser, isabs, join, normpath, realpath } from "../py-path.ts";

const PROTECTED_DIR_NAMES = new Set([
	".git",
	".vscode",
	".idea",
	".husky",
	".cargo",
	".devcontainer",
	".yarn",
	".mvn",
	".claude",
	".nycode",
]);
const PROTECTED_FILES = new Set([
	...[
		".gitconfig",
		".gitmodules",
		".bashrc",
		".bash_profile",
		".bash_login",
		".bash_aliases",
		".bash_logout",
		".zshrc",
		".zprofile",
	],
	...[
		".zshenv",
		".zlogin",
		".zlogout",
		".profile",
		".envrc",
		".npmrc",
		".yarnrc",
		".yarnrc.yml",
		".pnp.cjs",
		".pnp.loader.mjs",
	],
	...[
		".pnpmfile.cjs",
		"bunfig.toml",
		".bunfig.toml",
		".bazelrc",
		".bazelversion",
		".bazeliskrc",
		".pre-commit-config.yaml",
	],
	...[
		"lefthook.yml",
		"lefthook.yaml",
		".lefthook.yml",
		".lefthook.yaml",
		"gradle-wrapper.properties",
		"maven-wrapper.properties",
	],
	...[".devcontainer.json", ".ripgreprc", "pyrightconfig.json", ".mcp.json", ".claude.json"],
]);
const WALK_LIMIT = 5000;

/** The lexical and the real path of an argument, or undefined for a form the modes do not trust. */
export function resolve(input: unknown, cwd: string): [string, string] | undefined {
	if (typeof input !== "string" || input === "" || input.includes("\0")) return undefined;
	let arg = input;
	if (arg === "~" || arg.startsWith("~/")) arg = expanduser("~") + arg.slice(1);
	else if (arg.startsWith("~")) return undefined;
	const joined = isabs(arg) ? arg : join(cwd, arg);
	return [normpath(joined), realpath(joined)];
}

export function scopeRoots(cwd: string, project: string): string[] {
	const roots: string[] = [];
	for (const r of [cwd, project]) {
		if (!r) continue;
		const real = realpath(r);
		if (real !== "/" && !roots.includes(real)) roots.push(real);
	}
	return roots;
}

export const insidePath = (path: string, root: string): boolean =>
	path === root || path.startsWith(`${root.replace(/\/+$/, "")}/`);
const inScope = (path: string, roots: string[]): boolean => roots.some((r) => insidePath(path, r));

export function isProtected(path: string): boolean {
	const parts = path.split("/").filter((p) => p !== "");
	for (const [i, p] of parts.entries()) {
		if (PROTECTED_DIR_NAMES.has(p)) {
			if (p === ".claude" && parts[i + 1] === "worktrees") continue;
			return true;
		}
		if (p === ".config" && parts[i + 1] === "git") return true;
	}
	return parts.length > 0 && PROTECTED_FILES.has(parts[parts.length - 1]);
}

/** Targets rm and rmdir never get an automatic approval for: the root, its children, home, the scope and its ancestors. */
export function isCritical(path: string, roots: string[]): boolean {
	if (path === "/" || dirname(path) === "/") return true;
	return [...roots, realpath(expanduser("~"))].some((r) => insidePath(r, path));
}

/** The lexical and real path when both are in scope and none is protected. */
export function scopedTarget(arg: string, cwd: string, roots: string[]): [string, string] | undefined {
	const r = resolve(arg, cwd);
	if (r === undefined) return undefined;
	const [lex, real] = r;
	if (!(inScope(lex, roots) && inScope(real, roots)) || isProtected(lex) || isProtected(real)) return undefined;
	return r;
}

/** True when the tree under `real` (links not followed) holds no protected path. Fail-closed on unreadable or huge trees. */
export function noProtectedBelow(real: string): boolean {
	let st: fs.Stats;
	try {
		st = fs.lstatSync(real);
	} catch {
		return false;
	}
	if (!st.isDirectory() || st.isSymbolicLink()) return true;
	let seen = 0;
	const stack = [real];
	while (stack.length > 0) {
		const dir = stack.pop() as string;
		let entries: fs.Dirent[];
		try {
			entries = fs.readdirSync(dir, { withFileTypes: true });
		} catch {
			return false;
		}
		for (const e of entries) {
			seen++;
			const full = join(dir, e.name);
			if (seen > WALK_LIMIT || isProtected(full)) return false;
			if (e.isDirectory() && !e.isSymbolicLink()) stack.push(full);
		}
	}
	return true;
}
