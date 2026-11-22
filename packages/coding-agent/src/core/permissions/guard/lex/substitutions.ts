// Command substitutions: `$( )`, backticks and `<( )`/`>( )` are replaced by a marker and their inside is judged apart.
import { commentStart, type LineIndex, matchParen } from "./heredoc.ts";

/** Marker of a substitution in the outer text. */
export const PLAIN_SUBST = "__SUBST__";
/** Marker of a substitution whose inside downloads or decodes data (fed to an interpreter it is a deny). */
export const FETCH_SUBST = "__FETCHSUBST__";

/** Replaces each substitution outside single quotes by a marker; returns the new text and the insides. */
export function extractSubstitutions(cmd: string, isFetch: (inner: string) => boolean): [string, string[]] {
	if (!cmd.includes("$(") && !cmd.includes("`") && !cmd.includes("<(") && !cmd.includes(">(")) return [cmd, []];
	const out: string[] = [];
	const inners: string[] = [];
	const n = cmd.length;
	const lazy: LineIndex[] = [];
	let quote = "";
	let i = 0;
	while (i < n) {
		const c = cmd[i];
		if (quote === "'") {
			out.push(c);
			if (c === "'") quote = "";
		} else if (c === "\\") {
			out.push(cmd.slice(i, i + 2));
			i++;
		} else if (c === "'" && !quote) {
			out.push(c);
			quote = c;
		} else if (c === '"') {
			out.push(c);
			quote = quote ? "" : c;
		} else if (c === "#" && !quote && commentStart(cmd, i)) {
			const nl = cmd.indexOf("\n", i);
			const end = nl < 0 ? n : nl;
			out.push(cmd.slice(i, end));
			i = end - 1;
		} else if ((c === "$" || (!quote && (c === "<" || c === ">"))) && cmd.startsWith("(", i + 1)) {
			const j = matchParen(cmd, i + 2, lazy);
			const inner = j < 0 ? cmd.slice(i + 2) : cmd.slice(i + 2, j);
			inners.push(inner);
			out.push(isFetch(inner) ? FETCH_SUBST : PLAIN_SUBST);
			i = j < 0 ? n : j;
		} else if (c === "`") {
			let j = i + 1;
			while (j < n && cmd[j] !== "`") j += cmd[j] === "\\" ? 2 : 1;
			const inner = cmd.slice(i + 1, j);
			inners.push(inner);
			out.push(isFetch(inner) ? FETCH_SUBST : PLAIN_SUBST);
			i = j;
		} else {
			out.push(c);
		}
		i++;
	}
	return [out.join(""), inners];
}
