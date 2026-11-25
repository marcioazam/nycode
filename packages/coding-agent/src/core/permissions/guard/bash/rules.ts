// The Bash rules of the guard: the text is cut into segments, each segment is judged by the command table (commands.ts),
// and what runs another command (`bash -c`, `eval`, `xargs`, `find -exec`, `$( )`) is judged again, to a depth.
// Port of `check_bash`, `check_segment` and `check_indirection` of the former Python guard.

import { forkBomb, maskHeredocs } from "../lex/heredoc.ts";
import { SEPARATORS, segments } from "../lex/segments.ts";
import { extractSubstitutions, FETCH_SUBST, PLAIN_SUBST } from "../lex/substitutions.ts";
import { type Finding, joinContinuations, tokenize } from "../lex/tokens.ts";
import { fetches, fetchTag, isInterpreter, readsStdin, SHELLS, stripPrefixes } from "../lex/wrappers.ts";
import { basename } from "../py-path.ts";
import { devBlocked } from "../rules/read.ts";
import { catastrophicRmTarget, commandFindings } from "./commands.ts";
import { checkSelfKill, fullMatchPattern, matchesSelf, selfKillMessage } from "./self-kill.ts";

/** Above MAX_DEPTH: ask, but the analysis goes on (a deny still wins) up to HARD_DEPTH. */
export const MAX_DEPTH = 3;
const HARD_DEPTH = 24;
/** Above this size the guard asks instead of analysing (never a silent allow). */
export const MAX_CMD = 262_144;
const FIND_EXEC = new Set(["-exec", "-execdir", "-ok", "-okdir"]);
const XARGS_VALUE_OPTS = new Set([
	"-I",
	"-L",
	"-n",
	"-P",
	"-s",
	"-d",
	"-E",
	"-a",
	"--max-args",
	"--max-lines",
	"--max-procs",
	"--max-chars",
	"--delimiter",
	"--arg-file",
	"--process-slot-var",
]);
const EXPANSION_WORD_RE = /^(\$[\p{L}\p{N}_]+|\$\{[^}]*\}|__SUBST__|__FETCHSUBST__)\n?$/u;
const IFS_RE = /\$\{IFS[^}]*\}|\$IFS(?![\p{L}\p{N}_])/gu;
const SHELL_C_RE = /^[-+][A-Za-z]*c[A-Za-z]*\n?$/;
const OPTION_SHAPED_RE = /^[-+][\p{L}\p{N}_=-]*$/u;
const HEREDOC_MARK_RE = /<<-?[ \t]*['"]?[\p{L}\p{N}_]+['"]?/gu;
const SSH_AGENT_EVAL_RE = /(?:^|[;&|]\s*)eval\s+"?(?:\$\(ssh-agent(?: -s)?\)|`ssh-agent(?: -s)?`)"?\s*(?:\n?$|[;&|])/;
const deepAsk: Finding = ["ask", `shell aninhado além de ${MAX_DEPTH} níveis`];

/** The text a shell executes: the argument of `-c` (`-lc` too) or the here-string (`<<< text`). */
function shellScript(args: string[]): string | undefined {
	const here = args.indexOf("<<<");
	if (here >= 0) return here + 1 < args.length ? args[here + 1] : undefined;
	for (let k = 0; k < args.length; k++) {
		if (!SHELL_C_RE.test(args[k])) continue;
		let i = k + 1;
		while (i < args.length) {
			const b = args[i];
			if ((b === "-o" || b === "+o") && i + 1 < args.length) {
				i += 2;
				continue;
			}
			if (OPTION_SHAPED_RE.test(b)) {
				i++;
				continue;
			}
			return b;
		}
		return undefined;
	}
	return undefined;
}

function xargsCommand(args: string[]): string[] {
	let i = 0;
	while (i < args.length && args[i].startsWith("-")) {
		const a = args[i];
		i++;
		if (a === "--") break;
		if (XARGS_VALUE_OPTS.has(a) && i < args.length) i++;
	}
	return args.slice(i);
}

function execFindings(tokens: string[], top: string, cwd: string, depth: number): Finding[] {
	const cmdv: string[] = [];
	for (const [k, t] of tokens.entries()) {
		if (FIND_EXEC.has(t) || t === ";" || (t === "+" && k > 0 && tokens[k - 1] === "{}")) break;
		cmdv.push(t);
	}
	return cmdv.length > 0 ? checkSegment(cmdv, false, new Set(), top, cwd, depth)[0] : [];
}

function checkFind(args: string[], top: string, cwd: string, depth: number): Finding[] {
	const found: Finding[] = [];
	const roots: string[] = [];
	for (const a of args) {
		if (a.startsWith("-") || a === "(" || a === "!") break;
		roots.push(a);
	}
	if (args.includes("-delete") && roots.some(catastrophicRmTarget))
		found.push(["deny", "find -delete em diretório raiz, home ou sistema"]);
	for (const [k, a] of args.entries())
		if (FIND_EXEC.has(a)) found.push(...execFindings(args.slice(k + 1), top, cwd, depth));
	return found;
}

function checkIndirection(name: string, args: string[], top: string, cwd: string, depth: number): Finding[] {
	const found: Finding[] = [];
	const pos = args.filter((a) => !a.startsWith("-"));
	if (SHELLS.has(name)) {
		const script = shellScript(args);
		if (script !== undefined) {
			found.push(...checkBash(script, cwd, depth + 1, top));
			if (script.includes("<<")) found.push(...checkBash(script.replace(HEREDOC_MARK_RE, ""), cwd, depth + 1, top));
		}
	} else if (name === "eval") {
		if (!(args.length === 1 && args[0] === PLAIN_SUBST && SSH_AGENT_EVAL_RE.test(top))) {
			found.push(...checkBash(args.join(" "), cwd, depth + 1, top));
			if (args.some((a) => a.includes(PLAIN_SUBST))) found.push(["ask", "eval de texto montado por substituição"]);
		}
	} else if (name === "xargs") {
		const inner = xargsCommand(args);
		if (inner.length > 0) found.push(...checkSegment(inner, false, new Set(), top, cwd, depth)[0]);
	} else if (name === "find") {
		found.push(...checkFind(args, top, cwd, depth));
	}
	const runsText =
		(isInterpreter(name) && pos.length > 0 && pos[0].includes(FETCH_SUBST)) ||
		((name === "eval" || name === "source" || name === ".") && args.some((a) => a.includes(FETCH_SUBST)));
	if (runsText) found.push(["deny", "executa texto baixado ou decodificado (curl/wget/base64 -d via $( ) ou <( ))"]);
	return found;
}

const REDIRECTS = new Set([">", ">>", ">|", "&>", ">&", "&>>"]);

/** Findings of one segment and the command name (for the pipe-from-download rule). */
export function checkSegment(
	argv: string[],
	piped: boolean,
	prevNames: Set<string>,
	top: string,
	cwd: string,
	depth: number,
): [Finding[], string | undefined] {
	const found: Finding[] = [];
	const [real, priv] = stripPrefixes(argv);
	if (priv) found.push(["ask", "comando com privilégio (sudo/su/doas)"]);
	if (real.length === 0) return [found, undefined];
	if (FIND_EXEC.has(real[0])) return [[...found, ...execFindings(real.slice(1), top, cwd, depth)], undefined];
	if (EXPANSION_WORD_RE.test(real[0])) {
		for (const f of checkSegment(["rm", ...real.slice(1)], false, new Set(), top, cwd, depth)[0])
			if (f[0] === "deny") found.push(f);
		found.push(["ask", "palavra de comando vem de expansão ($VAR, $( ), $IFS)"]);
		return [found, undefined];
	}
	const name = basename(real[0]);
	const args = real.slice(1);
	if (piped && prevNames.has("<fetch>") && (SHELLS.has(name) || (isInterpreter(name) && readsStdin(args))))
		found.push(["deny", "download com pipe direto para shell"]);
	if (fetchTag(real)) prevNames.add("<fetch>");
	found.push(...checkIndirection(name, args, top, cwd, depth));
	for (const [i, t] of argv.entries()) {
		if (REDIRECTS.has(t) && i + 1 < argv.length && devBlocked(argv[i + 1]))
			found.push(["deny", `escrita direta em disco ${argv[i + 1]}`]);
	}
	found.push(...commandFindings(name, args, top, cwd));
	return [found, name];
}

/** `pkill -f` whose pattern matches the shell's own line, judged on pieces cut only at real separators. */
function pkillSelfMatch(tokens: string[], top: string): Finding[] {
	const found: Finding[] = [];
	let piece: string[] = [];
	for (const t of [...tokens, ";"]) {
		if (!SEPARATORS.has(t)) {
			piece.push(t);
			continue;
		}
		const [real] = stripPrefixes(piece);
		piece = [];
		if (real.length > 0 && real[0] === "pkill") {
			const pattern = fullMatchPattern(real.slice(1));
			if (pattern && matchesSelf(pattern, top)) found.push(["deny", selfKillMessage("pkill")]);
		}
	}
	return found;
}

/** Findings of a Bash command line; `top` is the outermost line (self-kill rules look at it) and `cwd` the repository. */
export function checkBash(cmd: string, cwd = "", depth = 0, topInput?: string): Finding[] {
	const top = topInput ?? cmd;
	if (depth > HARD_DEPTH) return [deepAsk];
	if (cmd.length > MAX_CMD) return [["ask", `comando maior que ${MAX_CMD / 1024} KB: não analisado`]];
	const found: Finding[] = depth > MAX_DEPTH ? [deepAsk] : [];
	let text = maskHeredocs(joinContinuations(cmd));
	if (forkBomb(text)) found.push(["deny", "fork bomb"]);
	found.push(...checkSelfKill(cmd, top));
	if (new RegExp(IFS_RE.source, "u").test(text)) {
		found.push(["ask", "uso de $IFS: o comando pode se montar na execução"]);
		text = text.replace(IFS_RE, " ");
	}
	const [outer, inners] = extractSubstitutions(text, (s) => fetches(s));
	text = outer;
	for (const inner of inners) {
		found.push(...checkBash(inner, cwd, depth + 1, top));
		if (inner.includes("<<") && maskHeredocs(text) === text)
			found.push(...checkBash(inner.replace(HEREDOC_MARK_RE, ""), cwd, depth + 1, top));
	}
	const tokens = tokenize(text);
	found.push(...pkillSelfMatch(tokens, top));
	let prevNames = new Set<string>();
	for (const [argv, piped] of segments(tokens)) {
		if (!piped) prevNames = new Set();
		const [f, name] = checkSegment(argv, piped, prevNames, top, cwd, depth);
		found.push(...f);
		if (name) prevNames.add(name);
	}
	return found;
}
