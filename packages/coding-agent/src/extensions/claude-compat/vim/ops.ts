/** Edições puras do Vim: cada função devolve o novo texto e o cursor (offset), sem tocar o editor. */
import type { Target } from "./motions.ts";
import { Buf, splice } from "./text.ts";

export interface Register {
	text: string;
	linewise: boolean;
}
export interface Edit {
	text: string;
	cursor: number;
}
export interface Range {
	s: number;
	e: number;
	linewise: boolean;
}

export const SHIFT = "  "; // shiftwidth de >> e <<: duas colunas (a UI do Claude indenta com 2)

export function rangeOf(b: Buf, cur: number, t: Target): Range {
	if (t.kind === "line")
		return { s: b.lineStart(Math.min(cur, t.to)), e: b.lineEnd(Math.max(cur, t.to)), linewise: true };
	const s = Math.min(cur, t.to);
	const hi = Math.max(cur, t.to);
	return { s, e: t.kind === "incl" ? b.next(hi) : hi, linewise: false };
}

export function linesRange(b: Buf, cur: number, n: number): Range {
	const l1 = b.lineNo(cur);
	const l2 = Math.min(l1 + n - 1, b.lineCount() - 1);
	return { s: b.lineStart(cur), e: b.lineEnd(b.startOfLine(l2)), linewise: true };
}

export const yanked = (b: Buf, r: Range): Register => ({ text: b.text.slice(r.s, r.e), linewise: r.linewise });

/** Remove o intervalo; linewise remove também uma quebra de linha (a linha única vira vazia). */
export function deleteRange(b: Buf, r: Range): Edit {
	const t = b.text;
	if (!r.linewise) return { text: splice(t, r.s, r.e), cursor: r.s };
	if (r.e < b.len) {
		const text = splice(t, r.s, r.e + 1);
		return { text, cursor: new Buf(text).firstNonBlank(r.s) };
	}
	if (r.s > 0) {
		const text = splice(t, r.s - 1, r.e);
		return { text, cursor: new Buf(text).firstNonBlank(r.s - 1) };
	}
	return { text: "", cursor: 0 };
}

/** Linewise change: esvazia as linhas mas mantém uma; cursor no início para inserir. */
export const clearLines = (b: Buf, r: Range): Edit => ({ text: splice(b.text, r.s, r.e), cursor: r.s });

export function paste(b: Buf, cur: number, reg: Register, after: boolean, n: number): Edit {
	const t = b.text;
	if (reg.linewise) {
		const body = Array<string>(n).fill(reg.text).join("\n");
		if (after) {
			const le = b.lineEnd(cur);
			const text = splice(t, le, le, `\n${body}`);
			return { text, cursor: new Buf(text).firstNonBlank(le + 1) };
		}
		const ls = b.lineStart(cur);
		const text = splice(t, ls, ls, `${body}\n`);
		return { text, cursor: new Buf(text).firstNonBlank(ls) };
	}
	const at = after && cur < b.lineEnd(cur) ? b.next(cur) : cur;
	const body = reg.text.repeat(n);
	const text = splice(t, at, at, body);
	const nb = new Buf(text);
	return { text, cursor: body ? nb.prev(at + body.length) : at };
}

/** Junta `lines` linhas a partir da linha do cursor (J). */
export function join(b: Buf, cur: number, lines: number): Edit | undefined {
	let text = b.text;
	const pos = b.lineStart(cur);
	let cursor = cur;
	let did = false;
	for (let i = 0; i < Math.max(2, lines) - 1; i++) {
		const nb = new Buf(text);
		const le = nb.lineEnd(pos);
		if (le >= nb.len) break;
		let k = le + 1;
		const nle = nb.lineEnd(k);
		while (k < nle && /[ \t]/.test(text[k]!)) k++;
		const curEmpty = le === nb.lineStart(pos),
			nextEmpty = k >= nle;
		const sep = nextEmpty || curEmpty || /[ \t]/.test(text[le - 1]!) || text[k] === ")" ? "" : " ";
		text = splice(text, le, k, sep);
		cursor = le;
		did = true;
	}
	return did ? { text, cursor } : undefined;
}

/** Linhas [primeira, última] tocadas pelo intervalo. */
export function lineSpan(b: Buf, r: Range): [number, number] {
	return [b.lineNo(r.s), b.lineNo(r.linewise ? r.e : Math.max(r.s, r.e - 1))];
}

/** > e <: desloca as linhas first..last. */
export function shift(b: Buf, first: number, last: number, right: boolean): Edit {
	const lines = b.text.split("\n");
	for (let i = first; i <= last && i < lines.length; i++) {
		const l = lines[i]!;
		if (right) lines[i] = l === "" ? l : SHIFT + l;
		else lines[i] = l.startsWith("\t") ? l.slice(1) : l.replace(/^ {1,2}/, "");
	}
	const text = lines.join("\n");
	return { text, cursor: new Buf(text).firstNonBlank(b.startOfLine(first)) };
}

/** Aplica fn a cada grapheme do intervalo (newline intacto). */
export function mapCase(b: Buf, r: Range, fn: (g: string) => string): Edit {
	let out = "";
	for (let p = r.s; p < r.e; p = b.next(p)) {
		const g = b.ch(p);
		out += g === "\n" ? g : fn(g);
	}
	return { text: splice(b.text, r.s, r.e, out), cursor: r.s };
}

export const toggleCase = (g: string): string => (g === g.toUpperCase() ? g.toLowerCase() : g.toUpperCase());
