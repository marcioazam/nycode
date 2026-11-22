// Command segments: the tokens cut at the separators, with the shell syntax that is not a command (`( { then do`, `case`
// patterns, `name()`) taken out. Port of `_structure` and `segments` of permissions/parse.py.
export const SEPARATORS = new Set([";", "&&", "||", "|", "&", "|&", "\n", ";;", ";&", ";;&"]);
const CASE_SEPARATORS = new Set([";;", ";&", ";;&"]);
const START_DROP = new Set([
	...["{", "}", "!", "then", "do", "else", "elif", "if", "while", "until", "fi", "done", "esac", "builtin", "coproc"],
]);

/** A token made only of the character `ch` (Python `set(t) == {ch}`). */
const parenOnly = (t: string, ch: string): boolean => t !== "" && [...t].every((c) => c === ch);

function structure(input: string[], casePattern: boolean): [string[][], boolean] {
	let cur = input;
	let openedCase = false;
	const extra: string[][] = [];
	if (casePattern && cur.includes(")")) cur = cur.slice(cur.indexOf(")") + 1);
	while (cur.length > 0) {
		const t = cur[0];
		if (t === "$" && cur.length > 1 && parenOnly(cur[1], "(")) {
			cur = cur.slice(2);
		} else if (START_DROP.has(t) || parenOnly(t, "(") || parenOnly(t, ")")) {
			cur = cur.slice(1);
		} else if (t === "case") {
			let rest = cur.slice(1);
			if (rest.includes("in")) rest = rest.slice(rest.indexOf("in") + 1);
			if (rest.includes(")")) {
				openedCase = false;
				cur = rest.slice(rest.indexOf(")") + 1);
			} else {
				openedCase = true;
				cur = [];
			}
		} else if (t === "for" || t === "select") {
			return [[], false];
		} else if (t === "function") {
			cur = cur.slice(2);
			if (cur.length > 0 && cur[0] === "()") cur = cur.slice(1);
		} else if (cur.length >= 2 && cur[1] === "()") {
			extra.push(cur);
			cur = cur.slice(2);
		} else if (cur.length >= 3 && cur[1] === "(" && cur[2] === ")") {
			extra.push(cur);
			cur = cur.slice(3);
		} else {
			break;
		}
	}
	while (cur.length > 0 && (cur[cur.length - 1] === "}" || parenOnly(cur[cur.length - 1], ")")))
		cur = cur.slice(0, -1);
	return [[...(cur.length > 0 ? [cur] : []), ...extra], openedCase];
}

/** The `[argv, pipedFromPrevious]` list of a token list. */
export function segments(tokens: string[]): Array<[string[], boolean]> {
	const out: Array<[string[], boolean]> = [];
	const joined: string[] = [];
	for (let k = 0; k < tokens.length; k++) {
		const t = tokens[k];
		if (t === "(" && k > 0 && tokens[k - 1] === "$") joined[joined.length - 1] = ";";
		else if (t === "(" && k > 0 && !SEPARATORS.has(tokens[k - 1]) && (tokens[k + 1] ?? "") !== ")") joined.push(";");
		else if (t === ")" && k > 0 && tokens[k - 1] !== "(") joined.push(";");
		else joined.push(t);
	}
	let cur: string[] = [];
	let piped = false;
	let nextPiped = false;
	let patternNext = false;
	let inCase = 0;
	const flush = (): void => {
		if (cur.length === 0) return;
		const isCase = cur[0] === "case";
		if (cur[0] === "esac") inCase = Math.max(0, inCase - 1);
		const [argvs, opened] = structure([...cur], patternNext && inCase > 0);
		if (isCase) inCase++;
		patternNext = opened;
		for (const argv of argvs) out.push([argv, piped]);
	};
	for (const t of joined) {
		if (SEPARATORS.has(t)) {
			flush();
			patternNext = patternNext || (CASE_SEPARATORS.has(t) && inCase > 0);
			cur = [];
			piped = false;
			nextPiped = t === "|" || t === "|&";
			continue;
		}
		if (cur.length === 0) {
			piped = nextPiped;
			nextPiped = false;
		}
		cur.push(t);
	}
	flush();
	return out;
}
