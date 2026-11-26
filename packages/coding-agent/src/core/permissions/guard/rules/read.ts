// Read, Grep and device rules of the guard: secrets are never read (cloud, git and npm credentials included, by the real
// path too), a Grep may not reach an area of secrets, and a write to /dev/* is denied outside a short list.
// Port of the rules of permissions/rules.py that do not depend on the Bash lexer.
import * as fs from "node:fs";
import type { Finding } from "../lex/tokens.ts";
import { abspath, basename, expanduser, isabs, join, normpath, realpath } from "../py-path.ts";

const GREP_LISTING_LIMIT = 20_000;
const READ_DENY_DIR_NAMES = [".ssh", ".config/claude-secrets", ".gnupg"];
const READ_DENY_FILE_NAMES = [
	...[".codex/auth.json", ".config/mcp/secrets.env", ".nycode/agent/auth.json", ".nycode/agent/mcp-auth.json"],
	...[".nycode/agent/.credentials.json", ".nycode/agent/local.env"],
	...[".aws/credentials", ".netrc", ".git-credentials", ".config/gh/hosts.yml", ".docker/config.json", ".kube/config"],
	...[".npmrc", ".pypirc"],
];
const READ_ENV_SAFE_SUFFIXES = [".example", ".sample", ".template", ".dist"];
const READ_DENY_ENV_RE = /^\.env(\.[^\n]+)?\n?$/;
const PROC_ENVIRON_RE = /^\/proc\/[^/]+(\/task\/[^/]+)?\/environ\n?$/;
const DEV_SAFE_RE = /^\/dev\/(null|zero|full|stdout|stderr|stdin|tty|fd\/[^\n]+|pts\/[^\n]+|shm\/[^\n]+)\n?$/;
const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The home directory and its real path: the list of secrets holds for both. */
function homes(): string[] {
	const home = expanduser("~");
	return [...new Set([home, realpath(home)])];
}

export function inside(path: string, root: string): boolean {
	return root !== "" && (path === root || path.startsWith(`${root.replace(/\/+$/, "")}/`));
}

/** Writing to /dev/* is denied outside null, zero, full, stdout, stderr, stdin, tty and fd, pts and shm entries. */
export function devBlocked(target: string): boolean {
	if (!target.startsWith("/")) return false;
	const p = normpath(target).replace(/^\/+/, "/");
	return p.startsWith("/dev/") && !DEV_SAFE_RE.test(p);
}

const envDenied = (base: string): boolean =>
	READ_DENY_ENV_RE.test(base) && !READ_ENV_SAFE_SUFFIXES.some((s) => base.endsWith(s));

/** `p` is absolute and normalized (the caller tests the real path too). */
export function readDenied(p: string): boolean {
	const hs = homes();
	const credentials = new RegExp(`^(${hs.map(escapeRegExp).join("|")})/\\.claude(-[^/]+)?/\\.credentials\\.json\\n?$`);
	return (
		hs.some((h) => READ_DENY_FILE_NAMES.some((f) => join(h, f) === p)) ||
		hs.some((h) => READ_DENY_DIR_NAMES.some((d) => inside(p, join(h, d)))) ||
		credentials.test(p) ||
		envDenied(basename(p)) ||
		PROC_ENVIRON_RE.test(p)
	);
}

function absolute(path: string, cwd: string): string {
	return abspath(expanduser(isabs(path) || path.startsWith("~") ? path : join(cwd || process.cwd(), path)));
}

/** The Read tool: a secret, or a link to one, is denied. */
export function checkRead(path: string, cwd: string): Finding[] {
	if (path === "") return [];
	const p = absolute(path, cwd);
	if (readDenied(p) || readDenied(realpath(p))) return [["deny", `leitura de segredo bloqueada: ${p}`]];
	return [];
}

/** A path that holds a secret deeper down, or anything under /proc; empty when it covers none. */
function coversSecret(p: string): string {
	if (p === "/proc" || p.startsWith("/proc/")) return "/proc";
	const root = p.replace(/\/+$/, "") || "/";
	const prefix = `${root}/`;
	const secrets = new Set<string>();
	for (const h of homes()) for (const n of [...READ_DENY_FILE_NAMES, ...READ_DENY_DIR_NAMES]) secrets.add(join(h, n));
	for (const secret of [...secrets].sort()) {
		if (secret !== root && secret.startsWith(prefix)) return secret;
	}
	return "";
}

function isDirectory(p: string): boolean {
	try {
		return fs.statSync(p).isDirectory();
	} catch {
		return false;
	}
}

/** Why a Grep path (already absolute) is denied; empty when it is free. */
function grepDenied(p: string): string {
	if (readDenied(p)) return "segredo";
	if (homes().includes(p) || p === "/") return "diretório amplo (home ou raiz)";
	const covered = coversSecret(p);
	if (covered) return `ancestral de ${covered}`;
	if (!isDirectory(p)) return "";
	try {
		const dir = fs.opendirSync(p);
		try {
			for (let k = 0, e = dir.readSync(); e !== null; k++, e = dir.readSync()) {
				if (k >= GREP_LISTING_LIMIT) return "diretório grande demais para conferir";
				const full = join(p, e.name);
				if (readDenied(full) || (e.isSymbolicLink() && readDenied(realpath(full)))) return `guarda ${e.name}`;
			}
		} finally {
			dir.closeSync();
		}
	} catch {
		return "";
	}
	return "";
}

/** The Grep tool (no path means the cwd): the Read denial, for a file, a tree or a directory. */
export function checkGrep(path: string | undefined, cwd: string): Finding[] {
	const p = path ? absolute(path, cwd) : abspath(cwd);
	for (const cand of new Set([p, realpath(p)])) {
		const why = grepDenied(cand);
		if (why) return [["deny", `Grep em área de segredos bloqueado (${why}): ${p}`]];
	}
	return [];
}
