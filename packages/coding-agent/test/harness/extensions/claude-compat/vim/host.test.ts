// node --experimental-strip-types --test extensions/claude-compat/vim/test/host.test.ts
// EditorHost + VimEngine sobre um editor falso que cumpre o contrato do patch editor-actions (ações semânticas,
// grupo de undo, setText que apaga o conteúdo colado). Sem teclas cruas para mover/apagar/desfazer.
import assert from "node:assert/strict";
import { test } from "vitest";
import { VimEngine } from "../../../../../src/extensions/claude-compat/vim/engine.ts";
import {
	type EditorAction,
	EditorHost,
	type EditorLike,
	MAX_OPS,
} from "../../../../../src/extensions/claude-compat/vim/host.ts";
import { Buf } from "../../../../../src/extensions/claude-compat/vim/text.ts";

interface Snap {
	text: string;
	cur: number;
	payloads: Map<string, string>;
}

class FakeEditor implements EditorLike {
	text = "";
	cur = 0;
	payloads = new Map<string, string>();
	stack: Snap[] = [];
	actions: string[] = [];
	groups = 0;
	keys: string[] = [];
	inGroup = false;
	api = true;
	skipRight = false; // defeito simulado: 'right' não anda
	mangle: ((t: string) => string) | undefined;
	constructor(spec = "") {
		this.set(spec);
	}
	set(spec: string) {
		const at = spec.indexOf("|");
		this.cur = Math.max(0, at);
		this.text = at < 0 ? spec : spec.slice(0, at) + spec.slice(at + 1);
	}
	private buf() {
		return new Buf(this.text, new Set(this.payloads.keys()));
	}
	private snap() {
		if (!this.inGroup) this.stack.push({ text: this.text, cur: this.cur, payloads: new Map(this.payloads) });
	}
	getText() {
		return this.text;
	}
	getExpandedText() {
		let t = this.text;
		for (const [id, c] of this.payloads)
			t = t.replace(new RegExp(`\\[paste #${id}(?: (?:\\+\\d+ lines|\\d+ chars))?\\]`, "g"), () => c);
		return t;
	}
	getCursor() {
		const before = this.text.slice(0, this.cur).split("\n");
		return { line: before.length - 1, col: before.at(-1)!.length };
	}
	setText(t: string) {
		this.snap();
		this.text = this.mangle ? this.mangle(t) : t;
		this.cur = this.text.length;
		this.payloads.clear();
	}
	insertTextAtCursor(t: string) {
		this.snap();
		this.text = this.text.slice(0, this.cur) + t + this.text.slice(this.cur);
		this.cur += t.length;
	}
	key(seq: string) {
		this.keys.push(seq);
		if (seq.startsWith("\x1b") || seq < " ") return;
		this.text = this.text.slice(0, this.cur) + seq + this.text.slice(this.cur);
		this.cur += seq.length;
	}
	runEditorAction = (a: EditorAction) => {
		this.actions.push(a);
		const b = this.buf();
		if (a === "left") this.cur = b.prev(this.cur);
		else if (a === "right") {
			if (!this.skipRight) this.cur = b.next(this.cur);
		} else if (a === "deleteForward") {
			this.snap();
			this.text = this.text.slice(0, this.cur) + this.text.slice(b.next(this.cur));
		} else {
			const s = this.stack.pop();
			if (s) {
				this.text = s.text;
				this.cur = s.cur;
				this.payloads = s.payloads;
			}
		}
	};
	withUndoGroup = <T>(f: () => T): T => {
		this.groups++;
		this.snap();
		this.inGroup = true;
		try {
			return f();
		} finally {
			this.inGroup = false;
		}
	};
	show() {
		return `${this.text.slice(0, this.cur)}|${this.text.slice(this.cur)}`;
	}
}

const MARK = "[paste #1 +12 lines]";
const BIG = Array.from({ length: 12 }, (_, i) => `colado ${i}`).join("\n");

function rig(spec: string, opts: { api?: boolean } = {}) {
	const ed = new FakeEditor(spec);
	if (opts.api === false) {
		(ed as { runEditorAction?: unknown }).runEditorAction = undefined;
		(ed as { withUndoGroup?: unknown }).withUndoGroup = undefined;
	}
	const warnings: string[] = [];
	const engine = new VimEngine(
		new EditorHost(
			ed,
			() => {},
			(m) => warnings.push(m),
		),
	);
	engine.mode = "normal";
	const feed = (k: string) => {
		for (const c of k) if (engine.handle(c, c === "\x1b") === "pass") ed.key(c);
	};
	return { ed, engine, feed, warnings };
}
const withPaste = (spec: string) => {
	const r = rig(spec);
	r.ed.payloads.set("1", BIG);
	return r;
};

test("edição sem marcador: um grupo, um undo; nenhuma tecla crua para mover/apagar/desfazer", () => {
	const { ed, feed } = rig("a|bc\ndef");
	feed("x");
	assert.equal(ed.show(), "a|c\ndef");
	assert.equal(ed.groups, 1);
	assert.deepEqual(ed.keys, []);
	feed("u");
	assert.equal(ed.show(), "a|bc\ndef");
	assert.deepEqual(ed.keys, []);
});

test("conteúdo colado sobrevive às edições em volta do marcador; um u desfaz o comando inteiro", () => {
	const { ed, feed } = withPaste(`ab |${MARK} z`);
	feed("x"); // cursor sobre o marcador: apaga o átomo inteiro
	assert.equal(ed.text, "ab  z");
	feed("u");
	assert.equal(ed.text, `ab ${MARK} z`);
	assert.equal(ed.getExpandedText(), `ab ${BIG} z`);
	feed("0x$x");
	assert.equal(ed.text, `b ${MARK} `);
	assert.equal(ed.getExpandedText(), `b ${BIG} `);
	feed("uu");
	assert.equal(ed.getExpandedText(), `ab ${BIG} z`);
});

test("comando com vários passos nativos (dd com marcador) é um grupo: u e Ctrl- nativo desfazem tudo", () => {
	const { ed, feed } = withPaste(`x\n|a ${MARK}\nz`);
	feed("dd");
	assert.equal(ed.text, "x\nz");
	assert.equal(ed.groups, 1);
	ed.runEditorAction("undo"); // undo nativo (qualquer tecla que o usuário tenha)
	assert.equal(ed.getExpandedText(), `x\na ${BIG}\nz`);
});

test("marcador literal ou de id inativo não é átomo e o cursor anda por caractere", () => {
	const { ed, feed } = rig("|[paste #7 +3 lines] ok");
	feed("x");
	assert.equal(ed.text, "paste #7 +3 lines] ok");
	const mixed = rig(`|${MARK} [paste #9 +1 lines]`);
	mixed.ed.payloads.set("1", BIG);
	mixed.feed("wx");
	assert.equal(mixed.ed.text, `${MARK} paste #9 +1 lines]`);
});

test("limite de passos: movimento ou edição acima de MAX_OPS falha visível, sem ação nativa nem mutação", () => {
	const long = "x".repeat(MAX_OPS + 50);
	const { ed, feed, warnings } = rig(`${long}|`);
	ed.cur = long.length;
	feed("0");
	assert.equal(warnings.length, 1);
	assert.match(warnings[0]!, /limite/);
	assert.deepEqual(ed.actions, []);
	assert.equal(ed.cur, long.length);
});

test("limite na edição: andar de volta ao cursor passa de MAX_OPS → nada é alterado", () => {
	const long = "x".repeat(MAX_OPS + 50);
	const { ed, feed, warnings } = rig(`|${long}`);
	feed("x"); // setText + andar do fim até o início = MAX_OPS+49 passos
	assert.equal(warnings.length, 1);
	assert.match(warnings[0]!, /limite/);
	assert.equal(ed.text, long);
	assert.equal(ed.groups, 0);
	assert.deepEqual(ed.actions, []);
});

test("API ausente: falha explícita antes de mutar", () => {
	const { ed, feed, warnings } = rig("a|bc", { api: false });
	feed("x");
	assert.match(warnings[0]!, /editor-actions/);
	assert.equal(ed.show(), "a|bc");
	assert.deepEqual(ed.keys, []);
});

test("movimento que o editor não cumpre (cursor ≠ alvo) falha em vez de editar no lugar errado", () => {
	const { ed, feed, warnings } = rig("|abc");
	ed.skipRight = true;
	feed("l");
	assert.match(warnings[0]!, /cursor/);
	assert.equal(ed.text, "abc");
});

test("edição que o editor normaliza diferente é desfeita por inteiro", () => {
	const { ed, feed, warnings } = rig("a|bc");
	ed.mangle = (t) => t.toUpperCase();
	feed("x");
	assert.match(warnings[0]!, /desfeita/);
	assert.equal(ed.text, "abc");
});

test("backspace do remap e do replay usa ←/delete semânticos", () => {
	const { ed, engine, feed } = rig("|");
	engine.remaps = new Set(["jj"]);
	feed("ijj");
	assert.equal(engine.mode, "normal");
	assert.equal(ed.text, "");
	assert.deepEqual(ed.actions.filter((a) => a !== "undo").slice(-2), ["left", "deleteForward"]);
	assert.ok(!ed.keys.includes("\x7f"));
});
