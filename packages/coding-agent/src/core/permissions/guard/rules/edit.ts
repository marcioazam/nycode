// The Edit, Write and MultiEdit rules: protected and sensitive files, and writes outside the project.
// Port of the former Python guard's `check_file`.

import type { Finding } from "../lex/tokens.ts";
import { abspath, basename, expanduser, isabs, join, realpath, tempDir } from "../py-path.ts";
import { inside } from "./read.ts";

const ENV_SAFE_SUFFIXES = [".example", ".sample", ".template", ".dist"];
const ASK_WRITE_SUFFIXES = ["/.nycode/agent/local.env", "/.nycode/agent/mcp-auth.json"];
const SENSITIVE_DIR_NAMES = [".ssh", ".aws", ".gnupg", ".config/gh", ".kube", ".docker"];
const SENSITIVE_FILE_NAMES = [
	...[".nycode/agent/settings.json", ".nycode/agent/auth.json", ".local/bin/nycode"],
	...[
		".zshrc",
		".zshenv",
		".zprofile",
		".bashrc",
		".bash_profile",
		".profile",
		".netrc",
		".npmrc",
		".git-credentials",
	],
];
const KEY_FILE_SUFFIXES = [".pem", ".key", ".p12", ".pfx"];
const KEY_NAME_RE = /^id_(rsa|ed25519|ecdsa|dsa)/;

function sensitiveFile(path: string): Finding | undefined {
	const home = expanduser("~");
	const base = basename(path);
	if (ASK_WRITE_SUFFIXES.some((s) => path.endsWith(s))) return ["ask", `arquivo sensível ${path}`];
	if ((base === ".env" || base.startsWith(".env.")) && !ENV_SAFE_SUFFIXES.some((s) => base.endsWith(s))) {
		return ["ask", `arquivo de segredos ${base}`];
	}
	if (KEY_FILE_SUFFIXES.some((s) => base.endsWith(s)) || KEY_NAME_RE.test(base))
		return ["ask", `chave/certificado ${base}`];
	if (
		base === "auth.json" ||
		SENSITIVE_FILE_NAMES.some((n) => join(home, n) === path) ||
		SENSITIVE_DIR_NAMES.some((n) => inside(path, join(home, n)))
	) {
		return ["ask", `arquivo sensível ${path}`];
	}
	return undefined;
}

/** Findings for writing `path`; sensitive files ask wherever they are, a protected one is denied. */
export function checkFile(path: string, cwd: string, project: string): Finding[] {
	if (path === "") return [];
	const raw = isabs(path) || path.startsWith("~") ? path : join(cwd || process.cwd(), path);
	const p = abspath(expanduser(raw));
	const real = realpath(p);
	const candidates = real === p ? [p] : [p, real];
	const hits = candidates.map(sensitiveFile).filter((hit): hit is Finding => hit !== undefined);
	if (hits.length > 0) return [[hits.some(([level]) => level === "deny") ? "deny" : "ask", hits[0][1]]];
	const tmpRoots = ["/tmp", tempDir(), "/var/tmp"];
	if (candidates.every((c) => tmpRoots.some((r) => inside(c, r)))) return [];
	if (!(inside(p, project) || inside(p, cwd))) return [["ask", `fora do projeto: ${p}`]];
	return [];
}
