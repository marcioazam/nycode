/** Buffer de texto do Vim: offsets UTF-16 sempre em fronteiras de grapheme; marcadores [paste #N] com conteúdo guardado são átomos. */

export const MARKER = /\[paste #(\d+)(?: (?:\+\d+ lines|\d+ chars))?\]/g;

/**
 * Ids de marcador realmente guardados pelo editor: o getExpandedText troca todo marcador ativo pelo conteúdo,
 * então um id ativo não sobra no texto expandido; um marcador literal (sem conteúdo) sobra e vira texto comum.
 */
export function activeMarkerIds(text: string, expanded: string): Set<string> {
	const ids = new Set<string>();
	if (text === expanded) return ids;
	for (const m of text.matchAll(MARKER)) {
		const id = m[1]!;
		if (!ids.has(id) && !new RegExp(`\\[paste #${id}(?: (?:\\+\\d+ lines|\\d+ chars))?\\]`).test(expanded))
			ids.add(id);
	}
	return ids;
}
const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

export class Buf {
	readonly text: string;
	private readonly bounds: number[];

	constructor(text: string, atoms: ReadonlySet<string> = new Set()) {
		this.text = text;
		const marks: Array<[number, number]> = atoms.size
			? [...text.matchAll(MARKER)].filter((m) => atoms.has(m[1]!)).map((m) => [m.index!, m.index! + m[0].length])
			: [];
		const bounds: number[] = [];
		let mi = 0;
		for (const s of segmenter.segment(text)) {
			while (mi < marks.length && marks[mi]![1] <= s.index) mi++;
			if (mi < marks.length && marks[mi]![0] < s.index && s.index < marks[mi]![1]) continue;
			bounds.push(s.index);
		}
		bounds.push(text.length);
		this.bounds = bounds;
	}

	get len(): number {
		return this.text.length;
	}
	has(o: number): boolean {
		return this.search(o) === o;
	}
	/** Maior fronteira ≤ o. */
	private search(o: number): number {
		let lo = 0,
			hi = this.bounds.length - 1;
		while (lo < hi) {
			const mid = (lo + hi + 1) >> 1;
			if (this.bounds[mid]! <= o) lo = mid;
			else hi = mid - 1;
		}
		return this.bounds[lo]!;
	}
	next(o: number): number {
		let lo = 0,
			hi = this.bounds.length - 1;
		while (lo < hi) {
			const mid = (lo + hi) >> 1;
			if (this.bounds[mid]! > o) hi = mid;
			else lo = mid + 1;
		}
		return this.bounds[lo]! > o ? this.bounds[lo]! : this.len;
	}
	prev(o: number): number {
		if (o <= 0) return 0;
		const s = this.search(o);
		return s < o ? s : this.search(o - 1);
	}
	ch(o: number): string {
		return this.text.slice(o, this.next(o));
	}
	lineStart(o: number): number {
		return o <= 0 ? 0 : this.text.lastIndexOf("\n", o - 1) + 1;
	}
	lineEnd(o: number): number {
		const i = this.text.indexOf("\n", o);
		return i < 0 ? this.len : i;
	}
	lineNo(o: number): number {
		let n = 0;
		for (let i = this.text.indexOf("\n"); i >= 0 && i < o; i = this.text.indexOf("\n", i + 1)) n++;
		return n;
	}
	lineCount(): number {
		return this.lineNo(this.len) + 1;
	}
	/** Início da linha n (clamp). */
	startOfLine(n: number): number {
		let o = 0;
		for (let i = 0; i < n; i++) {
			const e = this.text.indexOf("\n", o);
			if (e < 0) break;
			o = e + 1;
		}
		return o;
	}
	firstNonBlank(o: number): number {
		let p = this.lineStart(o);
		const e = this.lineEnd(o);
		while (p < e && /[ \t]/.test(this.text[p]!)) p++;
		return p;
	}
	/** Último grapheme da linha (ou o início se vazia). */
	lastChar(o: number): number {
		const s = this.lineStart(o),
			e = this.lineEnd(o);
		return e > s ? this.prev(e) : s;
	}
	/** Cursor do modo normal: nunca sobre o fim da linha, exceto linha vazia. */
	clamp(o: number): number {
		o = Math.max(0, Math.min(o, this.len));
		if (!this.has(o)) o = this.prev(o);
		return o >= this.lineEnd(o) ? this.lastChar(o) : o;
	}
	/** Índice de grapheme dentro da linha. */
	col(o: number): number {
		let n = 0;
		for (let p = this.lineStart(o); p < o; p = this.next(p)) n++;
		return n;
	}
	atCol(lineStart: number, col: number): number {
		const e = this.lineEnd(lineStart);
		let p = lineStart;
		for (let i = 0; i < col && p < e; i++) p = this.next(p);
		return p;
	}
	/** Quantidade de graphemes entre dois offsets (newline conta 1). */
	between(a: number, b: number): number {
		let n = 0;
		for (let p = Math.min(a, b); p < Math.max(a, b); p = this.next(p)) n++;
		return n;
	}
	/** 0 branco, 1 palavra, 2 pontuação, 3 newline/fim. */
	cls(o: number, big = false): number {
		if (o >= this.len) return 3;
		const c = this.text[o]!;
		if (c === "\n") return 3;
		if (/\s/.test(c)) return 0;
		if (c === "[" && this.next(o) - o > 1) return 1;
		if (/[\p{L}\p{N}\p{M}_]/u.test(String.fromCodePoint(this.text.codePointAt(o)!))) return 1;
		return big ? 1 : 2;
	}
}

/** Substitui [s,e) por ins. */
export const splice = (t: string, s: number, e: number, ins = ""): string => t.slice(0, s) + ins + t.slice(e);
