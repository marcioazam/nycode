/** Máquina de estados Vim (modos, operadores, visual, repetição). Pura: toda E/S passa pelo VimHost. */
import { type Find, MOTIONS, motion, textObject, wordEnd } from "./motions.ts";
import {
	clearLines,
	deleteRange,
	type Edit,
	join,
	lineSpan,
	linesRange,
	mapCase,
	paste,
	type Range,
	type Register,
	rangeOf,
	shift,
	toggleCase,
	yanked,
} from "./ops.ts";
import { Buf, splice } from "./text.ts";

export type VimMode = "insert" | "normal" | "visual" | "visualLine";

export interface VimHost {
	text(): string;
	cursor(): number;
	/** Troca o texto e posiciona o cursor (preserva marcadores de colagem). */
	edit(text: string, cursor: number): void;
	moveTo(cursor: number): void;
	/** Entrada nativa do editor (digitação no insert, ↑/↓ no limite do histórico). */
	send(seq: string): void;
	undo(count: number): void;
	/** Busca reversa no histórico (`/`). */
	history(): void;
	/** Ids de marcadores [paste #N] com conteúdo guardado (átomos); literais ficam de fora. */
	markerIds(): ReadonlySet<string>;
	now(): number;
	/** Aviso visível ao usuário (limite excedido, ação nativa ausente...). */
	warn(message: string): void;
}

/** Falha esperada do host (nada foi alterado, ou o texto foi restaurado): o motor avisa e segue sem lançar ao TUI. */
export class VimError extends Error {}

interface Cmd {
	n?: number;
	op?: string;
	self?: boolean;
	key: string;
	arg?: string;
}
interface VisualInfo {
	key: string;
	arg?: string;
	linewise: boolean;
	size: number;
}
interface Last {
	keys?: string[];
	visual?: VisualInfo;
	insert?: string[];
}

const OPS = "dcy<>";
const OBJECTS = "wW\"'`()[]{}bB";
const NORMAL_CMDS = new Set([
	"x",
	"X",
	"r",
	"D",
	"C",
	"s",
	"S",
	"Y",
	"p",
	"P",
	"J",
	"u",
	".",
	"i",
	"I",
	"a",
	"A",
	"o",
	"O",
	"v",
	"V",
	"~",
	"/",
]);
const VISUAL_CMDS = new Set(["d", "x", "y", "c", "s", "p", "P", "r", "~", "u", "U", ">", "<", "J", "o", "v", "V", "/"]);
const FIND_KEYS = "fFtT";
const MAX_INSERT = 4000;
/** Teto de teclas reenviadas por repetição de insert (`3iabc<Esc>`, `.`); mesmo valor de MAX_OPS em host.ts. */
const MAX_REPEAT_OPS = 20_000;
const MAX_COUNT = 9999;

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
export const isSingle = (d: string): boolean => {
	const it = segmenter.segment(d)[Symbol.iterator]();
	it.next();
	return d !== "" && !!it.next().done && d.codePointAt(0)! >= 32 && d !== "\x7f";
};

type Parsed = Cmd | "need" | "bad";

function parse(keys: string[], visual: boolean): Parsed {
	let i = 0;
	const num = (): number | undefined => {
		let s = "";
		while (i < keys.length && /[0-9]/.test(keys[i]!) && !(s === "" && keys[i] === "0")) s += keys[i++];
		return s ? Math.min(Number(s), MAX_COUNT) : undefined;
	};
	const target = (m: string, objects: boolean): { key: string; arg?: string } | "need" | "bad" => {
		if (FIND_KEYS.includes(m)) return i >= keys.length ? "need" : { key: m, arg: keys[i++]! };
		if (m === "g") return i >= keys.length ? "need" : keys[i++] === "g" ? { key: "gg" } : "bad";
		if (objects && (m === "i" || m === "a")) {
			if (i >= keys.length) return "need";
			const a = keys[i++]!;
			return OBJECTS.includes(a) ? { key: m, arg: a } : "bad";
		}
		return MOTIONS.has(m) ? { key: m } : "bad";
	};
	const n1 = num();
	if (i >= keys.length) return "need";
	const k = keys[i++]!;
	if (!visual && OPS.includes(k)) {
		const n2 = num();
		if (i >= keys.length) return "need";
		const m = keys[i++]!;
		const n = n1 === undefined && n2 === undefined ? undefined : (n1 ?? 1) * (n2 ?? 1);
		if (m === k) return { n, op: k, self: true, key: "" };
		const t = target(m, true);
		return typeof t === "string" ? t : { n, op: k, ...t };
	}
	if (k === "r") return i >= keys.length ? "need" : { n: n1, key: "r", arg: keys[i++]! };
	if ((visual ? VISUAL_CMDS : NORMAL_CMDS).has(k)) return { n: n1, key: k };
	const t = target(k, visual);
	return typeof t === "string" ? t : { n: n1, ...t };
}

export class VimEngine {
	mode: VimMode = "insert";
	/** Pares de teclas (ex.: "jj") que saem do INSERT quando digitados em até 1 s. */
	remaps = new Set<string>();
	private readonly host: VimHost;
	private keys: string[] = [];
	private anchor = 0;
	private want = 0;
	private vertical = false;
	private endSticky = false;
	private reg: Register | undefined;
	private find: Find | undefined;
	private last: Last | undefined;
	private capture: string[] | undefined;
	private repeatIns = 1;
	private replaying = false;
	private remap: { ch: string; at: number } | undefined;

	constructor(host: VimHost) {
		this.host = host;
	}

	private buf(): Buf {
		return new Buf(this.host.text(), this.host.markerIds());
	}

	reset(): void {
		this.mode = "insert";
		this.keys = [];
		this.capture = undefined;
		this.remap = undefined;
		this.repeatIns = 1;
	}

	/** Teclas pendentes (ex.: "2d"), para exibição. */
	pending(): string {
		return this.keys.join("");
	}

	/** Seleção visual atual, ou undefined fora do visual. */
	selection(): Range | undefined {
		if (this.mode !== "visual" && this.mode !== "visualLine") return undefined;
		return this.sel(this.buf());
	}

	private sel(b: Buf): Range {
		const cur = b.clamp(this.host.cursor());
		const lo = Math.min(this.anchor, cur),
			hi = Math.max(this.anchor, cur);
		return this.mode === "visualLine"
			? { s: b.lineStart(lo), e: b.lineEnd(hi), linewise: true }
			: { s: lo, e: b.next(hi), linewise: false };
	}

	/** 'pass' = o editor nativo ainda deve receber a tecla. */
	handle(data: string, esc: boolean): "consumed" | "pass" {
		const prev = { mode: this.mode, anchor: this.anchor };
		try {
			return this.dispatch(data, esc);
		} catch (e) {
			if (!(e instanceof VimError)) throw e;
			this.keys = [];
			this.mode = prev.mode;
			this.anchor = prev.anchor;
			this.repeatIns = 1;
			this.host.warn(e.message);
			return "consumed";
		}
	}

	private dispatch(data: string, esc: boolean): "consumed" | "pass" {
		if (this.mode === "insert") return this.insertKey(data, esc);
		if (esc) {
			if (this.keys.length) this.keys = [];
			else if (this.mode !== "normal") this.exitVisual();
			else return "pass";
			return "consumed";
		}
		if (!isSingle(data)) {
			this.keys = [];
			return "pass";
		}
		this.keys.push(data);
		const p = parse(this.keys, this.mode !== "normal");
		if (p === "need") return "consumed";
		const keys = this.keys;
		this.keys = [];
		if (p === "bad") return "consumed";
		const b = this.buf();
		const isMove = !p.op && MOTIONS.has(p.key);
		if (!isMove) {
			this.vertical = false;
			this.endSticky = false;
		}
		if (this.mode === "normal") this.runNormal(b, p, keys);
		else this.runVisual(b, p);
		return "consumed";
	}

	// ── insert ────────────────────────────────────────────────────────────────
	private insertKey(data: string, esc: boolean): "consumed" | "pass" {
		if (esc) {
			this.leaveInsert();
			return "consumed";
		}
		if (this.remaps.size && isSingle(data)) {
			const r = this.remap;
			if (r && this.host.now() - r.at <= 1000 && this.remaps.has(r.ch + data)) {
				this.host.send("\x7f"); // apaga a primeira tecla já inserida
				this.capture?.pop();
				this.leaveInsert();
				return "consumed";
			}
			this.remap = { ch: data, at: this.host.now() };
		} else this.remap = undefined;
		// Só texto e backspace são repetíveis por `.`; setas, Enter e colagens em bloco não.
		if (
			this.capture &&
			!this.replaying &&
			this.capture.length < MAX_INSERT &&
			(data === "\x7f" || (!/[\x00-\x09\x0b-\x1f]/.test(data) && !data.startsWith("\x1b")))
		)
			this.capture.push(data);
		return "pass";
	}

	private enterInsert(): void {
		this.mode = "insert";
		this.remap = undefined;
	}

	/** Barra repetição que reenviaria mais que MAX_REPEAT_OPS teclas (trava a UI); nada foi reenviado ainda. */
	private guardRepeat(keys: number): void {
		const total = this.repeatIns * keys;
		if (total > MAX_REPEAT_OPS)
			throw new VimError(
				`Vim: repetição exige ${total} passos (limite ${MAX_REPEAT_OPS}); a repetição foi ignorada.`,
			);
	}

	private leaveInsert(): void {
		const cap = this.capture;
		if (this.repeatIns > 1 && cap) this.guardRepeat(cap.length);
		if (this.repeatIns > 1 && cap) for (let i = 1; i < this.repeatIns; i++) for (const s of cap) this.host.send(s);
		this.repeatIns = 1;
		this.capture = undefined;
		this.remap = undefined;
		this.mode = "normal";
		const b = this.buf(),
			cur = this.host.cursor();
		this.host.moveTo(cur > b.lineStart(cur) ? b.prev(cur) : cur);
	}

	private exitVisual(): void {
		this.mode = "normal";
		const b = this.buf();
		this.host.moveTo(b.clamp(this.host.cursor()));
	}

	// ── helpers ───────────────────────────────────────────────────────────────
	private put(e: Edit, insert: boolean): void {
		const nb = new Buf(e.text, this.host.markerIds());
		this.host.edit(e.text, insert ? Math.min(e.cursor, e.text.length) : nb.clamp(e.cursor));
	}

	private changed(keys: string[]): void {
		if (this.replaying) return;
		this.last = { keys: [...keys] };
		if (this.mode === "insert") this.capture = this.last.insert = [];
	}

	private move(b: Buf, cmd: Cmd, visual: boolean): void {
		const cur = b.clamp(this.host.cursor());
		const vertical = cmd.key === "j" || cmd.key === "k";
		if (vertical && !this.vertical) this.want = this.endSticky ? Infinity : b.col(cur);
		this.vertical = vertical;
		if (cmd.key === "$") this.endSticky = true;
		else if (!vertical) this.endSticky = false;
		const t = motion(b, cur, cmd.key, cmd.n, cmd.arg, { want: this.want, find: this.find, op: false });
		if (FIND_KEYS.includes(cmd.key)) this.find = { key: cmd.key as Find["key"], ch: cmd.arg! };
		if (!t) {
			if (!visual && vertical) this.host.send(cmd.key === "j" ? "\x1b[B" : "\x1b[A"); // limite: histórico nativo
			return;
		}
		this.host.moveTo(b.clamp(t.to));
	}

	// ── normal ────────────────────────────────────────────────────────────────
	private runNormal(b: Buf, cmd: Cmd, keys: string[]): void {
		const n = cmd.n;
		const cur = b.clamp(this.host.cursor());
		if (cmd.op) {
			this.operate(b, cur, cmd, keys);
			return;
		}
		const at = (o: number, rep = 1) => {
			this.host.moveTo(o);
			this.repeatIns = rep;
			this.enterInsert();
			this.changed(keys);
		};
		switch (cmd.key) {
			case "i":
				at(cur, n);
				return;
			case "a":
				at(b.lineEnd(cur) > cur ? b.next(cur) : cur, n);
				return;
			case "I":
				at(b.firstNonBlank(cur), n);
				return;
			case "A":
				at(b.lineEnd(cur), n);
				return;
			case "o":
			case "O": {
				const p = cmd.key === "o" ? b.lineEnd(cur) : b.lineStart(cur);
				this.host.edit(splice(b.text, p, p, "\n"), cmd.key === "o" ? p + 1 : p);
				this.repeatIns = 1;
				this.enterInsert();
				this.changed(keys);
				return;
			}
			case "v":
			case "V":
				this.anchor = cur;
				this.mode = cmd.key === "v" ? "visual" : "visualLine";
				return;
			case "x":
				this.operate(b, cur, { n, op: "d", key: "l" }, keys);
				return;
			case "X":
				this.operate(b, cur, { n, op: "d", key: "h" }, keys);
				return;
			case "D":
				this.operate(b, cur, { n, op: "d", key: "$" }, keys);
				return;
			case "C":
				this.operate(b, cur, { n, op: "c", key: "$" }, keys);
				return;
			case "s":
				this.operate(b, cur, { n, op: "c", key: "l" }, keys);
				return;
			case "S":
				this.operate(b, cur, { n, op: "c", self: true, key: "" }, keys);
				return;
			case "Y":
				this.operate(b, cur, { n, op: "y", self: true, key: "" }, keys);
				return;
			case "r": {
				const count = n ?? 1;
				const e = this.charRange(b, cur, count);
				if (!e || b.between(cur, e) < count) return;
				this.put(
					{ text: splice(b.text, cur, e, cmd.arg!.repeat(count)), cursor: cur + cmd.arg!.length * (count - 1) },
					false,
				);
				this.changed(keys);
				return;
			}
			case "~": {
				const e = this.charRange(b, cur, n ?? 1);
				if (!e) return;
				const r = mapCase(b, { s: cur, e, linewise: false }, toggleCase);
				this.put({ text: r.text, cursor: e }, false);
				this.changed(keys);
				return;
			}
			case "p":
			case "P": {
				if (!this.reg) return;
				this.put(paste(b, cur, this.reg, cmd.key === "p", n ?? 1), false);
				this.changed(keys);
				return;
			}
			case "J": {
				const e = join(b, cur, n ?? 2);
				if (!e) return;
				this.put(e, false);
				this.changed(keys);
				return;
			}
			case "u": {
				this.host.undo(n ?? 1);
				const nb = this.buf();
				this.host.moveTo(nb.clamp(this.host.cursor()));
				return;
			}
			case ".":
				this.dot();
				return;
			case "/":
				this.host.history();
				return;
			default:
				this.move(b, cmd, false);
				return;
		}
	}

	/** Fim de `count` graphemes a partir de cur dentro da linha; undefined se a linha está vazia. */
	private charRange(b: Buf, cur: number, count: number): number | undefined {
		const le = b.lineEnd(cur);
		if (cur >= le) return undefined;
		let e = cur;
		for (let i = 0; i < count && e < le; i++) e = b.next(e);
		return e;
	}

	private operate(b: Buf, cur: number, cmd: Cmd, keys: string[]): void {
		const op = cmd.op!;
		const n = cmd.n ?? 1;
		let r: Range | undefined;
		const word = cmd.key === "w" || cmd.key === "W";
		if (cmd.self) r = linesRange(b, cur, n);
		else if (cmd.key === "i" || cmd.key === "a") {
			const o = textObject(b, cur, cmd.key, cmd.arg!, cmd.n);
			if (o) r = { s: o[0], e: o[1], linewise: false };
		} else if (op === "c" && word && b.cls(cur, cmd.key === "W") > 0) {
			// cw/cW em palavra: muda até o fim da palavra, sem levar o espaço depois dela.
			const big = cmd.key === "W";
			const c = b.cls(cur, big);
			let p = cur;
			while (b.next(p) < b.lineEnd(p) && b.cls(b.next(p), big) === c) p = b.next(p);
			for (let i = 1; i < n; i++) p = wordEnd(b, p, big);
			r = { s: cur, e: b.next(p), linewise: false };
		} else {
			const t = motion(b, cur, cmd.key, cmd.n, cmd.arg, { want: this.want, find: this.find, op: true });
			if (FIND_KEYS.includes(cmd.key)) this.find = { key: cmd.key as Find["key"], ch: cmd.arg! };
			if (t) r = rangeOf(b, cur, t);
			else if (op === "c" && cmd.key === "l") r = { s: cur, e: cur, linewise: false };
		}
		if (!r) return;
		const empty = r.s === r.e && !r.linewise;
		switch (op) {
			case "y":
				this.reg = yanked(b, r);
				this.host.moveTo(b.clamp(r.linewise ? (b.lineStart(cur) === r.s ? cur : r.s) : r.s));
				return;
			case "d": {
				if (empty) return;
				this.reg = yanked(b, r);
				this.put(deleteRange(b, r), false);
				this.changed(keys);
				return;
			}
			case "c": {
				if (!empty) this.reg = yanked(b, r);
				this.enterInsert();
				this.repeatIns = 1;
				this.put(r.linewise ? clearLines(b, r) : deleteRange(b, r), true);
				this.changed(keys);
				return;
			}
			default: {
				const [f, l] = lineSpan(b, r);
				this.put(shift(b, f, l, op === ">"), false);
				this.changed(keys);
				return;
			}
		}
	}

	// ── visual ────────────────────────────────────────────────────────────────
	private runVisual(b: Buf, cmd: Cmd): void {
		const cur = b.clamp(this.host.cursor());
		switch (cmd.key) {
			case "v":
			case "V": {
				const mode = cmd.key === "v" ? "visual" : "visualLine";
				if (this.mode === mode) {
					this.exitVisual();
					return;
				}
				this.mode = mode;
				return;
			}
			case "o": {
				const a = this.anchor;
				this.anchor = cur;
				this.host.moveTo(a);
				return;
			}
			case "/":
				this.host.history();
				return;
			case "i":
			case "a":
				this.visualObject(b, cmd, cur);
				return;
		}
		if (MOTIONS.has(cmd.key)) {
			this.move(b, cmd, true);
			return;
		}
		const r = this.sel(b);
		const info: VisualInfo = {
			key: cmd.key,
			arg: cmd.arg,
			linewise: r.linewise,
			size: r.linewise ? lineSpan(b, r)[1] - lineSpan(b, r)[0] + 1 : b.between(r.s, r.e),
		};
		this.mode = "normal";
		this.visualOp(b, r, info);
		if (cmd.key !== "y" && !this.replaying) {
			this.last = { visual: info, keys: undefined };
			if (this.inInsert()) this.capture = this.last.insert = [];
		}
	}

	/** `visualOp` pode entrar em insert; ler o modo por método evita o estreitamento do compilador após `mode = 'normal'`. */
	private inInsert(): boolean {
		return this.mode === "insert";
	}

	/** Objeto de texto no visual: estende a seleção existente (união); já contido, sobe/avança ao próximo. */
	private visualObject(b: Buf, cmd: Cmd, cur: number): void {
		const kind = cmd.key as "i" | "a";
		const arg = cmd.arg!;
		const n = cmd.n ?? 1;
		const lo = Math.min(this.anchor, cur),
			hi = Math.max(this.anchor, cur);
		const o = textObject(b, cur, kind, arg, n);
		if (!o || o[1] <= o[0]) return;
		let s = o[0],
			e = b.prev(o[1]);
		if (lo !== hi) {
			if (s >= lo && e <= hi) {
				// objeto já contido na seleção: palavras avançam ao próximo; pares sobem um nível; aspas passam de i para a
				let nx: [number, number] | undefined;
				if (arg === "w" || arg === "W")
					nx = b.next(hi) < b.len ? textObject(b, b.next(hi), kind, arg, n) : undefined;
				else if (arg === '"' || arg === "'" || arg === "`")
					nx = kind === "i" ? textObject(b, cur, "a", arg) : undefined;
				else nx = textObject(b, cur, kind, arg, n + 1);
				if (!nx || nx[1] <= nx[0]) return;
				s = Math.min(lo, nx[0]);
				e = Math.max(hi, b.prev(nx[1]));
			} else {
				s = Math.min(s, lo);
				e = Math.max(e, hi);
			}
		}
		this.anchor = s;
		this.host.moveTo(e);
	}

	private visualOp(b: Buf, r: Range, info: VisualInfo): void {
		const key = info.key;
		switch (key) {
			case "y":
				this.reg = yanked(b, r);
				this.host.moveTo(b.clamp(r.s));
				return;
			case "d":
			case "x":
				this.reg = yanked(b, r);
				this.put(deleteRange(b, r), false);
				return;
			case "c":
			case "s":
				this.reg = yanked(b, r);
				this.enterInsert();
				this.repeatIns = 1;
				this.put(r.linewise ? clearLines(b, r) : deleteRange(b, r), true);
				return;
			case "p":
			case "P": {
				if (!this.reg) return;
				const reg = this.reg;
				let e: Edit;
				if (r.linewise) e = { text: splice(b.text, r.s, r.e, reg.text), cursor: r.s };
				else if (reg.linewise) e = { text: splice(b.text, r.s, r.e, `\n${reg.text}\n`), cursor: r.s + 1 };
				else
					e = { text: splice(b.text, r.s, r.e, reg.text), cursor: r.s + new Buf(reg.text).prev(reg.text.length) };
				if (key === "p") this.reg = yanked(b, r);
				this.put(e, false);
				return;
			}
			case "r":
				this.put(
					mapCase(b, r, () => info.arg!),
					false,
				);
				return;
			case "~":
				this.put(mapCase(b, r, toggleCase), false);
				return;
			case "u":
				this.put(
					mapCase(b, r, (g) => g.toLowerCase()),
					false,
				);
				return;
			case "U":
				this.put(
					mapCase(b, r, (g) => g.toUpperCase()),
					false,
				);
				return;
			case ">":
			case "<": {
				const [f, l] = lineSpan(b, r);
				this.put(shift(b, f, l, key === ">"), false);
				return;
			}
			case "J": {
				const [f, l] = lineSpan(b, r);
				const e = join(b, b.startOfLine(f), l - f + 1);
				if (e) this.put(e, false);
				return;
			}
		}
	}

	// ── repetição ─────────────────────────────────────────────────────────────
	private dot(): void {
		const l = this.last;
		if (!l) return;
		this.replaying = true;
		try {
			if (l.visual) {
				const b = this.buf();
				const cur = b.clamp(this.host.cursor());
				this.anchor = cur;
				let end = cur;
				if (l.visual.linewise) end = b.startOfLine(Math.min(b.lineNo(cur) + l.visual.size - 1, b.lineCount() - 1));
				else for (let i = 1; i < l.visual.size && b.next(end) < b.len; i++) end = b.next(end);
				this.mode = l.visual.linewise ? "visualLine" : "visual";
				this.host.moveTo(end);
				const nb = this.buf();
				const r = this.sel(nb);
				this.mode = "normal";
				this.visualOp(nb, r, l.visual);
			} else for (const k of l.keys ?? []) this.handle(k, false);
			if (this.mode === "insert") {
				this.capture = l.insert;
				this.guardRepeat(l.insert?.length ?? 0);
				for (const s of l.insert ?? []) this.host.send(s);
				this.leaveInsert();
			}
		} finally {
			this.replaying = false;
		}
	}
}
