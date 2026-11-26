// What a single command is allowed to do: the static table of the guard (rm, dd, mkfs, chmod, kill, git, docker...).
// Port of the body of `check_segment` of the former Python guard, without the indirections (those live in rules.ts).

import { type Finding, longOpt, shortFlags } from "../lex/tokens.ts";
import { expanduser, normpath } from "../py-path.ts";
import { checkGit } from "../rules/git.ts";
import { devBlocked } from "../rules/read.ts";
import { fullMatchPattern, matchesSelf, selfKillMessage } from "./self-kill.ts";

const POWER_CMDS = new Set(["shutdown", "reboot", "poweroff", "halt"]);
const SYSTEMCTL_POWER = new Set(["poweroff", "reboot", "halt", "kexec"]);
const SFDISK_READ_FLAGS = new Set([
	"-l",
	"--list",
	"-s",
	"--show-size",
	"-d",
	"--dump",
	"-J",
	"--json",
	"-F",
	"--list-free",
	"-V",
	"--verify",
	"-h",
	"--help",
]);
const hasAny = (flags: Set<string>, ...names: string[]): boolean => names.some((n) => flags.has(n));

/** Python `os.path.normpath` for an absolute path with the leading `//` collapsed; other paths stay. */
export function normPath(p: string): string {
	return p.startsWith("/") ? normpath(p).replace(/^\/+/, "/") : p;
}

/** Values of -t and --target-directory (cp, mv). */
export function targetDirs(args: string[]): string[] {
	const out: string[] = [];
	for (const [i, a] of args.entries()) {
		if (a.startsWith("--target-directory=")) out.push(a.slice(a.indexOf("=") + 1));
		else if ((a === "-t" || a === "--target-directory") && i + 1 < args.length) out.push(args[i + 1]);
	}
	return out;
}

function catastrophicSet(): Set<string> {
	const home = expanduser("~");
	return new Set([
		"",
		"~",
		"$HOME",
		// biome-ignore lint/suspicious/noTemplateCurlyInString: the literal text a shell command may contain
		"${HOME}",
		home,
		...["/home", "/usr", "/etc", "/bin", "/sbin", "/lib", "/lib64", "/boot", "/var", "/opt", "/root", "/srv"],
	]);
}

/** The path with its trailing run of `/` and `/*` removed (the regex `(/\*?)+$` without its quadratic cost). */
function stripTrailingSlashes(t: string): string {
	let end = t.length;
	for (;;) {
		if (end >= 1 && t[end - 1] === "/") end -= 1;
		else if (end >= 2 && t[end - 1] === "*" && t[end - 2] === "/") end -= 2;
		else break;
	}
	return t.slice(0, end);
}

export function catastrophicRmTarget(input: string): boolean {
	if (input === "" || !"/~$".includes(input[0])) return false;
	return catastrophicSet().has(stripTrailingSlashes(normPath(input)));
}

/** Targets of `kill` without the signal spec (-9, -KILL, -s X, -n X, --). */
function killTargets(args: string[]): Set<string> {
	let i = 0;
	if (args.length > 0 && ["-s", "-n", "--signal"].includes(args[0])) i = 2;
	else if (args.length > 0 && args[0].startsWith("-") && args[0] !== "--") i = 1;
	if (i < args.length && args[i] === "--") i++;
	return new Set(args.slice(i));
}

/** Findings of the command `name` with `args`; `top` is the whole shell line (a self-matching `pkill -f` denies), `cwd` the repository. */
export function commandFindings(name: string, args: string[], top: string, cwd: string): Finding[] {
	const found: Finding[] = [];
	const flags = shortFlags(args);
	const positional = args.filter((a) => !a.startsWith("-"));
	if (name === "rm") {
		const rec = hasAny(flags, "-r", "-R") || longOpt(flags, "--recursive");
		const force = flags.has("-f") || longOpt(flags, "--force");
		if (rec && force) found.push(["deny", "rm recursivo forçado"]);
		else if (rec) found.push(["ask", "rm recursivo"]);
		if (rec && positional.some(catastrophicRmTarget))
			found.push(["deny", "rm recursivo em diretório raiz, home ou sistema"]);
	} else if (name.startsWith("mkfs")) {
		found.push(["deny", "formatação de sistema de arquivos"]);
	} else if (name === "dd" && args.some((a) => a.startsWith("of=") && devBlocked(a.slice(3)))) {
		found.push(["deny", "dd escrevendo em dispositivo"]);
	} else if (name === "tee" && positional.some(devBlocked)) {
		found.push(["deny", "tee escrevendo em dispositivo de bloco"]);
	} else if (
		(name === "cp" || name === "mv") &&
		((positional.length > 0 && devBlocked(positional[positional.length - 1])) || targetDirs(args).some(devBlocked))
	) {
		found.push(["deny", `${name} escrevendo em dispositivo de bloco`]);
	} else if (name === "wipefs" && hasAny(flags, "-a", "--all", "-o", "--offset")) {
		found.push(["deny", "wipefs apagando assinaturas"]);
	} else if (name === "cryptsetup" && positional.some((p) => ["luksFormat", "erase", "luksErase"].includes(p))) {
		found.push(["deny", "cryptsetup destruindo cabeçalho LUKS"]);
	} else if (name === "blkdiscard") {
		found.push(["deny", "blkdiscard apaga o dispositivo"]);
	} else if (name === "sgdisk" && hasAny(flags, "-Z", "-z", "--zap-all", "--zap")) {
		found.push(["deny", "sgdisk apagando tabela de partições"]);
	} else if (name === "parted" && positional.some((p) => p === "mklabel" || p === "mktable")) {
		found.push(["deny", "parted mklabel apaga a tabela de partições"]);
	} else if (
		name === "sfdisk" &&
		positional.some((a) => a.startsWith("/dev/")) &&
		![...flags].some((f) => SFDISK_READ_FLAGS.has(f))
	) {
		found.push(["deny", "sfdisk reescrevendo tabela de partições"]);
	} else if (POWER_CMDS.has(name) && !flags.has("-c")) {
		found.push(["deny", `${name} desliga/reinicia a máquina`]);
	} else if (name === "systemctl" && positional.some((p) => SYSTEMCTL_POWER.has(p))) {
		found.push(["deny", "systemctl desliga/reinicia a máquina"]);
	} else if (
		(name === "init" || name === "telinit") &&
		positional.length > 0 &&
		(positional[0] === "0" || positional[0] === "6")
	) {
		found.push(["deny", `${name} desliga/reinicia a máquina`]);
	} else if (name === "chmod" || name === "chown" || name === "chgrp") {
		const rec = flags.has("-R") || flags.has("--recursive");
		if (rec && positional.some((a) => normPath(a) === "/")) found.push(["deny", `${name} recursivo na raiz`]);
		else if (rec) found.push(["ask", `${name} recursivo`]);
	} else if (name === "shred") {
		found.push(["ask", "shred"]);
	} else if (name === "kill" || name === "pkill" || name === "killall") {
		if (
			args.some((a) => a === "-9" || a === "-KILL" || a === "-SIGKILL") ||
			(args.includes("-s") && args.some((a) => a === "KILL" || a === "9"))
		)
			found.push(["ask", "kill -9"]);
		if (name === "kill") {
			const targets = killTargets(args);
			if (targets.has("-1") || targets.has("1")) found.push(["deny", "kill em todos os processos ou no PID 1"]);
		}
		const pattern = name === "pkill" ? fullMatchPattern(args) : undefined;
		if (pattern && matchesSelf(pattern, top)) found.push(["deny", selfKillMessage("pkill")]);
	} else if (name === "docker" || name === "podman") {
		if (args.some((a) => a === "rm" || a === "rmi" || a === "prune"))
			found.push(["ask", `${name} removendo recursos`]);
	} else if (["npm", "pnpm", "yarn", "bun"].includes(name) && positional.includes("publish")) {
		found.push(["ask", `${name} publish`]);
	} else if (name === "git") {
		found.push(...checkGit(args, cwd));
	} else if (
		name === "gh" &&
		positional.includes("pr") &&
		positional.includes("merge") &&
		args.some((a) => a === "--admin" || a.startsWith("--admin="))
	) {
		found.push(["deny", "gh pr merge --admin contorna a proteção de branch"]);
	}
	return found;
}
