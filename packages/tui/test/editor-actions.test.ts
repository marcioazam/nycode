// Seam K16: runEditorAction and withUndoGroup on the Editor (ported from the behavior cases of the editor-actions patch).
import assert from "node:assert";
import { describe, it } from "node:test";
import { Editor } from "../src/components/editor.ts";
import { getKeybindings, KeybindingsManager, setKeybindings, TUI_KEYBINDINGS } from "../src/keybindings.ts";
import type { TUI } from "../src/tui.ts";
import { defaultEditorTheme } from "./test-themes.ts";

const stubTui = { requestRender() {}, terminal: { columns: 80, rows: 24 } } as unknown as TUI;
type Inner = { undoStack: { length: number }; pastes: Map<number, string>; state: { lines: string[] } };
const inner = (e: Editor): Inner => e as unknown as Inner;
const make = (text = ""): Editor => {
	const e = new Editor(stubTui, defaultEditorTheme);
	if (text) e.setText(text);
	return e;
};
const bigPaste = (n: string): string =>
	`\x1b[200~${Array.from({ length: 12 }, (_, i) => `${n}-${i}`).join("\n")}\x1b[201~`;
const snap = (e: Editor): string =>
	JSON.stringify([inner(e).state.lines, e.getCursor(), [...inner(e).pastes], e.getExpandedText()]);
const depth = (e: Editor): number => (e as unknown as { undoGroupDepth: number }).undoGroupDepth;
const type = (e: Editor, s: string): void => {
	for (const ch of s) e.handleInput(ch);
};
// Private members the group touches, reached the way the extension never does.
const priv = (e: Editor) => e as unknown as { handleBackspace(): void };

describe("editor actions (seam K16)", () => {
	it("left/right/deleteForward/undo run natively, independent of any key map", () => {
		const e = make();
		type(e, "abc");
		e.runEditorAction("left");
		e.runEditorAction("left");
		assert.deepStrictEqual(e.getCursor(), { line: 0, col: 1 });
		e.runEditorAction("right");
		assert.deepStrictEqual(e.getCursor(), { line: 0, col: 2 });
		e.runEditorAction("left");
		e.runEditorAction("deleteForward");
		assert.strictEqual(e.getText(), "ac");
		e.runEditorAction("undo");
		assert.strictEqual(e.getText(), "abc");
	});

	it("an unknown action throws before mutating", () => {
		const e = make("abc");
		const before = snap(e);
		const len = inner(e).undoStack.length;
		for (const bad of ["up", "submit", "", undefined, null, 3, {}]) {
			assert.throws(() => e.runEditorAction(bad as never), /unknown editor action/);
		}
		assert.strictEqual(snap(e), before);
		assert.strictEqual(inner(e).undoStack.length, len);
	});

	it("one undo for delete + insert with a paste marker; earlier history is kept", () => {
		const e = make();
		type(e, "ab");
		e.handleInput(bigPaste("p"));
		assert.match(e.getText(), /\[paste #1 \+12 lines\]/);
		const expanded = e.getExpandedText();
		const before = snap(e);
		const base = inner(e).undoStack.length;
		e.withUndoGroup(() => {
			priv(e).handleBackspace();
			e.insertTextAtCursor("X");
			e.insertTextAtCursor("Y");
		});
		assert.strictEqual(e.getText(), "abXY");
		assert.strictEqual(inner(e).undoStack.length, base + 1);
		e.runEditorAction("undo");
		assert.strictEqual(snap(e), before);
		assert.strictEqual(e.getExpandedText(), expanded);
		assert.strictEqual(inner(e).undoStack.length, base);
		e.runEditorAction("undo");
		assert.strictEqual(e.getText(), "ab");
		e.runEditorAction("undo");
		assert.strictEqual(e.getText(), "");
	});

	it("without the group the same edit takes three steps (control)", () => {
		const e = make();
		e.handleInput(bigPaste("p"));
		const base = inner(e).undoStack.length;
		priv(e).handleBackspace();
		e.insertTextAtCursor("X");
		e.insertTextAtCursor("Y");
		assert.strictEqual(inner(e).undoStack.length - base, 3);
	});

	it("nested groups join the outermost and return the callback value", () => {
		const e = make("abc");
		const base = inner(e).undoStack.length;
		const out = e.withUndoGroup(() => {
			e.insertTextAtCursor("1");
			const nested = e.withUndoGroup(() => {
				e.insertTextAtCursor("2");
				return 7;
			});
			e.insertTextAtCursor("3");
			return nested + 1;
		});
		assert.strictEqual(out, 8);
		assert.strictEqual(e.getText(), "abc123");
		assert.strictEqual(inner(e).undoStack.length, base + 1);
		e.runEditorAction("undo");
		assert.strictEqual(e.getText(), "abc");
	});

	it("a callback with no net change creates no step", () => {
		const e = make("abc");
		e.handleInput("d");
		const base = inner(e).undoStack.length;
		assert.strictEqual(
			e.withUndoGroup(() => "nothing"),
			"nothing",
		);
		assert.strictEqual(inner(e).undoStack.length, base);
		e.withUndoGroup(() => {
			e.insertTextAtCursor("Z");
			priv(e).handleBackspace();
		});
		assert.strictEqual(inner(e).undoStack.length, base);
		assert.strictEqual(e.getText(), "abcd");
		e.withUndoGroup(() => e.runEditorAction("left"));
		assert.strictEqual(inner(e).undoStack.length, base);
	});

	it("a failure propagates and the modified text stays as ONE undoable group", () => {
		const e = make("abc");
		const base = inner(e).undoStack.length;
		const boom = new Error("boom");
		assert.throws(
			() =>
				e.withUndoGroup(() => {
					e.insertTextAtCursor("1");
					e.insertTextAtCursor("2");
					throw boom;
				}),
			(err) => err === boom,
		);
		assert.strictEqual(e.getText(), "abc12");
		assert.strictEqual(inner(e).undoStack.length, base + 1);
		e.runEditorAction("undo");
		assert.strictEqual(e.getText(), "abc");
		e.withUndoGroup(() => 1);
	});

	it("undo is refused inside the group without destroying history", () => {
		const e = make("abc");
		e.handleInput("d");
		const base = inner(e).undoStack.length;
		e.withUndoGroup(() => {
			e.insertTextAtCursor("1");
			assert.throws(() => e.runEditorAction("undo"), /undo.*withUndoGroup/);
		});
		assert.strictEqual(inner(e).undoStack.length, base + 1);
		assert.strictEqual(e.getText(), "abcd1");
	});

	it("native undo through a remapped key inside the group throws before mutating; earlier history stays", () => {
		const e = make();
		type(e, "ab");
		e.handleInput(bigPaste("p"));
		const base = inner(e).undoStack.length;
		assert.ok(base >= 2);
		const previous = getKeybindings();
		setKeybindings(new KeybindingsManager(TUI_KEYBINDINGS, { "tui.editor.undo": "ctrl+y" }));
		try {
			let before: [string, number] | undefined;
			assert.throws(
				() =>
					e.withUndoGroup(() => {
						e.insertTextAtCursor("X");
						before = [snap(e), inner(e).undoStack.length];
						e.handleInput("\x19");
					}),
				/undo.*withUndoGroup/,
			);
			assert.deepStrictEqual([snap(e), inner(e).undoStack.length], [before?.[0], base + 1]);
			assert.ok(!Object.hasOwn(e, "undo"), "override removed (undo inherited from the prototype)");
			e.handleInput("\x19");
			assert.match(e.getText(), /\[paste #1 \+12 lines\]/);
			assert.strictEqual(inner(e).undoStack.length, base);
			e.handleInput("\x19");
			e.handleInput("\x19");
			assert.strictEqual(e.getText(), "");
		} finally {
			setKeybindings(previous);
		}
	});

	it("a preexisting own undo override is restored exactly", () => {
		const e = make("abc");
		const own = function own() {};
		Object.defineProperty(e, "undo", { value: own, writable: false, configurable: true, enumerable: false });
		e.withUndoGroup(() => e.insertTextAtCursor("1"));
		assert.deepStrictEqual(Object.getOwnPropertyDescriptor(e, "undo"), {
			value: own,
			writable: false,
			configurable: true,
			enumerable: false,
		});
	});

	it("a non-configurable own undo: the guard is not installed, the callback does not run, depth is not stuck", () => {
		const e = make("abc");
		let calls = 0;
		const native = function native() {
			calls++;
		};
		Object.defineProperty(e, "undo", { value: native, writable: false, configurable: false, enumerable: false });
		const descriptor = Object.getOwnPropertyDescriptor(e, "undo");
		let ran = false;
		assert.throws(
			() =>
				e.withUndoGroup(() => {
					ran = true;
				}),
			TypeError,
		);
		assert.strictEqual(ran, false);
		assert.deepStrictEqual(Object.getOwnPropertyDescriptor(e, "undo"), descriptor);
		assert.strictEqual(depth(e), 0);
		e.runEditorAction("undo");
		assert.strictEqual(calls, 1);
		assert.throws(() => e.withUndoGroup(() => 1), TypeError);
		assert.strictEqual(depth(e), 0);
	});

	it("a failure restoring undo (the callback made it non-configurable) propagates and zeroes the depth", () => {
		const e = make("abc");
		assert.throws(
			() =>
				e.withUndoGroup(() => {
					Object.defineProperty(e, "undo", { value() {}, configurable: false });
				}),
			TypeError,
		);
		assert.strictEqual(depth(e), 0);
	});

	it("a nested group returning a thenable is rejected and the outer group stays undoable", () => {
		const e = make("abc");
		const base = inner(e).undoStack.length;
		assert.throws(
			() =>
				e.withUndoGroup(() => {
					e.insertTextAtCursor("1");
					e.withUndoGroup(() => {
						e.insertTextAtCursor("2");
						// biome-ignore lint/suspicious/noThenProperty: the case needs a thenable
						return { then() {} };
					});
				}),
			TypeError,
		);
		assert.strictEqual(e.getText(), "abc12");
		assert.strictEqual(inner(e).undoStack.length, base + 1);
		assert.ok(!Object.hasOwn(e, "undo") && depth(e) === 0);
		e.runEditorAction("undo");
		assert.strictEqual(e.getText(), "abc");
	});

	it("async callbacks and thenable results are rejected explicitly", () => {
		const e = make("abc");
		let called = false;
		assert.throws(
			() =>
				e.withUndoGroup((async () => {
					called = true;
				}) as never),
			TypeError,
		);
		assert.strictEqual(called, false);
		assert.throws(() => e.withUndoGroup("x" as never), TypeError);
		const base = inner(e).undoStack.length;
		assert.throws(
			() =>
				e.withUndoGroup(() => {
					e.insertTextAtCursor("1");
					return Promise.resolve(1);
				}),
			/thenable/,
		);
		assert.strictEqual(inner(e).undoStack.length, base + 1);
	});

	it("typing after the group does not merge into the group step", () => {
		const e = make("");
		e.handleInput("a");
		e.withUndoGroup(() => e.insertTextAtCursor("xy"));
		e.handleInput("z");
		e.runEditorAction("undo");
		assert.strictEqual(e.getText(), "axy");
		e.runEditorAction("undo");
		assert.strictEqual(e.getText(), "a");
	});
});
