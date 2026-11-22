// Wrappers and download detection: `env`, `nice`, `timeout`... and sudo are peeled off a segment, and a segment that
// downloads or decodes data is tagged. Port of the last part of permissions/parse.py.
import { basename } from "../py-path.ts";
import { maskHeredocs } from "./heredoc.ts";
import { segments } from "./segments.ts";
import { extractSubstitutions, FETCH_SUBST } from "./substitutions.ts";
import { shortFlags, tokenize } from "./tokens.ts";

export const SHELLS = new Set(["sh", "bash", "zsh", "dash", "ksh", "fish"]);
const FETCHERS = new Set(["curl", "wget"]);
const PRIV = new Set(["sudo", "su", "doas"]);
const ASSIGN_RE = /^[A-Za-z_][A-Za-z0-9_]*=/;
const INTERP_RE = /^(python[\p{Nd}.]*|perl|ruby|node)$/u;
const FETCH_HINT_RE = /\b(curl|wget)\b|base64\s+-\w*[dD]|--decode|xxd\s+-\w*r|openssl\s+enc/;

type Positional = "" | "duration" | "one" | "mask";
const WRAPPERS = new Map<string, [Set<string>, Positional]>([
	["env", [new Set(["-u", "-C", "-S", "--unset", "--chdir", "--split-string"]), ""]],
	["nice", [new Set(["-n", "--adjustment"]), ""]],
	["nohup", [new Set(), ""]],
	["setsid", [new Set(), ""]],
	["command", [new Set(), ""]],
	["exec", [new Set(["-a"]), ""]],
	["time", [new Set(["-f", "-o", "--format", "--output"]), ""]],
	["stdbuf", [new Set(["-i", "-o", "-e", "--input", "--output", "--error"]), ""]],
	["timeout", [new Set(["-s", "-k", "--signal", "--kill-after"]), "duration"]],
	["ionice", [new Set(["-c", "-n", "-p", "-P", "-u", "--class", "--classdata", "--pid", "--pgid", "--uid"]), ""]],
	["chrt", [new Set(["-T", "-P", "-D", "--sched-runtime", "--sched-period", "--sched-deadline"]), "one"]],
	["taskset", [new Set(["-c", "--cpu-list"]), "mask"]],
	["busybox", [new Set(), ""]],
	["toybox", [new Set(), ""]],
	["builtin", [new Set(["-p"]), ""]],
	["coproc", [new Set(), ""]],
]);
const PRIV_VALUE_OPTS = new Set([
	...["-u", "-g", "-C", "-h", "-p", "-c", "-r", "-t", "-U", "-D", "-R", "-T"],
	...[
		"--user",
		"--group",
		"--chdir",
		"--host",
		"--prompt",
		"--role",
		"--type",
		"--other-user",
		"--close-from",
		"--chroot",
	],
]);

function suCommand(args: string[]): string | undefined {
	for (let k = 0; k < args.length; k++) {
		const a = args[k];
		if ((a === "-c" || a === "--command") && k + 1 < args.length) return args[k + 1];
		if (a.startsWith("--command=")) return a.slice(a.indexOf("=") + 1);
	}
	return undefined;
}

/** Removes VAR=x, wrappers (with the values of their own options) and sudo; returns the real argv and whether privilege was used. */
export function stripPrefixes(input: string[]): [string[], boolean] {
	let argv = [...input];
	let priv = false;
	let i = 0;
	while (i < argv.length) {
		const w = argv[i];
		const base = basename(w);
		const wrapper = WRAPPERS.get(base);
		if (ASSIGN_RE.test(w)) {
			i++;
		} else if (PRIV.has(base)) {
			priv = true;
			if (base === "su") {
				const su = suCommand(argv.slice(i + 1));
				if (su !== undefined) return [["sh", "-c", su], true];
			}
			i++;
			while (i < argv.length && argv[i].startsWith("-")) {
				const flag = argv[i];
				i++;
				if (base !== "su" && PRIV_VALUE_OPTS.has(flag) && i < argv.length) i++;
			}
		} else if (wrapper) {
			const [values, positional] = wrapper;
			i++;
			let listGiven = false;
			let broke = false;
			while (i < argv.length && argv[i].startsWith("-")) {
				const flag = argv[i];
				i++;
				const eqAt = flag.indexOf("=");
				const key = eqAt < 0 ? flag : flag.slice(0, eqAt);
				const eq = eqAt >= 0;
				let val = eq ? flag.slice(eqAt + 1) : "";
				listGiven = listGiven || key === "-c" || key === "--cpu-list";
				const gluedS = base === "env" && flag.startsWith("-S") && !flag.startsWith("--") && flag !== "-S";
				if (base === "env" && (key === "-S" || key === "--split-string" || gluedS)) {
					if (gluedS) {
						val = flag.slice(2);
					} else if (!eq && i < argv.length) {
						val = argv[i];
						i++;
					}
					argv = [...tokenize(val), ...argv.slice(i)];
					i = 0;
					broke = true;
					break;
				}
				if (values.has(key) && !eq && i < argv.length) i++;
			}
			if (!broke && i < argv.length) {
				if (
					positional === "one" ||
					(positional === "mask" && !listGiven) ||
					(positional === "duration" && /^[\p{Nd}.]/u.test(argv[i]))
				)
					i++;
			}
		} else {
			break;
		}
	}
	return [argv.slice(i), priv];
}

/** True when the segment downloads or decodes data (curl, wget, base64 -d, xxd -r, openssl enc -d). */
export function fetchTag(real: string[]): boolean {
	if (real.length === 0) return false;
	const name = basename(real[0]);
	const args = real.slice(1);
	const flags = shortFlags(args);
	if (FETCHERS.has(name)) return true;
	if (name === "base64") return flags.has("-d") || flags.has("-D") || flags.has("--decode");
	if (name === "xxd") return flags.has("-r");
	return name === "openssl" && args[0] === "enc" && flags.has("-d");
}

export const isInterpreter = (name: string): boolean => SHELLS.has(name) || INTERP_RE.test(name);

/** An interpreter without a script file (or with `-`) reads its program from stdin. */
export function readsStdin(args: string[]): boolean {
	const positional = args.filter((a) => !a.startsWith("-") || a === "-");
	return positional.length === 0 || positional.includes("-");
}

/** Some command of the text downloads or decodes data; nesting stops at the second level (cost stays linear). */
export function fetches(inner: string, depth = 0): boolean {
	if (depth >= 2) return FETCH_HINT_RE.test(inner);
	const [text] = extractSubstitutions(maskHeredocs(inner), (s) => fetches(s, depth + 1));
	return text.includes(FETCH_SUBST) || segments(tokenize(text)).some(([argv]) => fetchTag(stripPrefixes(argv)[0]));
}
