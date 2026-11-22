// node --experimental-strip-types --test extensions/ui/test/vim/editor-vim.test.ts
// Vim no UiEditor real (@nycode/tui): tabela de comportamento, dados colados, undo, seleção visível, controles do app.
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getKeybindings, KeybindingsManager, setKeybindings, TUI_KEYBINDINGS } from "@nycode/tui";
import { test } from "vitest";
import * as __m1 from "../../../../../src/extensions/ui/editor.ts";
import { CASES, ESC } from "../../claude-compat/vim/cases.ts";

const tmp = mkdtempSync(join(tmpdir(), "ui-editor-vim-test-"));
// history.ts importa a folha (teclas) e os ícones: sem eles a cópia não carrega e nenhum teste deste arquivo roda.
const m = __m1;

const theme = { borderColor: (s: string) => s, selectList: {} };
const kb = { matches: () => false };
const tui = { requestRender() {}, terminal: { rows: 24, columns: 80 } };
const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
const LEFT = "\x1b[D";

/** Editor real em modo normal com o texto e o cursor (`|`) da especificação. */
function make(
	spec: string,
	opts: { busy?: boolean; remaps?: string[]; kb?: unknown; notify?: (m: string) => void } = {},
) {
	const vim = { enabled: true, remaps: opts.remaps };
	const e = new m.UiEditor(tui as never, theme as never, (opts.kb ?? kb) as never, vim, () => undefined, {
		busy: () => !!opts.busy,
	});
	if (opts.notify) e.compat = { notify: opts.notify };
	const submitted: string[] = [];
	e.onSubmit = (t: string) => submitted.push(t);
	const i = Math.max(0, spec.indexOf("|"));
	const text = spec.replace("|", "");
	e.setText(text);
	for (let n = [...seg.segment(text.slice(i))].length; n > 0; n--) e.handleInput(LEFT);
	e.mode = "normal";
	const keys = (s: string) => {
		for (const { segment: k } of seg.segment(s)) e.handleInput(k);
	};
	return { e, keys, vim, submitted };
}
const show = (e: any) => {
	const lines = e.getLines();
	const { line, col } = e.getCursor();
	return lines.map((l: string, i: number) => (i === line ? `${l.slice(0, col)}|${l.slice(col)}` : l)).join("\n");
};

for (const [name, from, keys, want] of CASES) {
	test(`UiEditor vim: ${name}`, () => {
		const { e, keys: type } = make(from);
		type(keys);
		assert.equal(show(e), want);
	});
}

const BIG = Array.from({ length: 12 }, (_, i) => `linha colada ${i}`).join("\n");
const paste = (e: any) => e.handleInput(`\x1b[200~${BIG}\x1b[201~`);

test("conteúdo colado sobrevive a edições Vim ao redor do marcador e o u o devolve", () => {
	const { e, keys } = make("|");
	e.mode = "insert";
	keys("ab ");
	paste(e);
	keys(" z");
	assert.match(e.getText(), /^ab \[paste #\d+ \+\d+ lines\] z$/);
	assert.equal(e.getExpandedText(), `ab ${BIG} z`);
	keys(ESC);
	keys("0x"); // apaga 'a'
	assert.equal(e.getExpandedText(), `b ${BIG} z`);
	keys("$x"); // apaga 'z'
	assert.equal(e.getExpandedText(), `b ${BIG} `);
	keys("0wD"); // marcador e o que vem depois: apagados juntos
	assert.equal(e.getExpandedText(), "b ");
	keys("u");
	assert.equal(e.getExpandedText(), `b ${BIG} `);
});

test("marcador é átomo para o Vim: x e dw o removem inteiro, cursor não entra nele", () => {
	const { e, keys } = make("|");
	e.mode = "insert";
	paste(e);
	keys(" fim");
	keys(ESC);
	keys("0");
	keys("x");
	assert.equal(e.getText(), " fim");
	assert.equal(e.getExpandedText(), " fim");
	keys("u");
	assert.equal(e.getExpandedText(), `${BIG} fim`);
});

test("edição Vim de linha sem marcador usa um único passo de undo nativo (Ctrl+-)", () => {
	const { e, keys } = make("ab|c\nxyz");
	keys("x");
	assert.equal(show(e), "a|b\nxyz");
	e.handleInput("\x1f"); // Ctrl+- nativo
	assert.equal(e.getText(), "abc\nxyz");
	keys("xx");
	keys("u");
	assert.equal(e.getText(), "ab\nxyz");
	e.handleInput("\x1f");
	assert.equal(e.getText(), "abc\nxyz");
});

test("visual: seleção visível no render (vídeo reverso) e rótulo do modo; some ao sair", () => {
	const { e, keys } = make("a|bcd\nefg");
	keys("vl");
	let rows: string[] = e.render(40);
	assert.ok(
		rows.some((r) => r.includes("\x1b[7mb\x1b[27m")),
		rows.join("|"),
	);
	assert.ok(!rows.some((r) => r.includes("\x1b[7ma")), "fora da seleção não realça");
	assert.ok(rows.at(-1)!.includes("VISUAL"));
	keys("V");
	rows = e.render(40);
	assert.ok(rows.at(-1)!.includes("VISUAL LINE"));
	assert.ok(rows.some((r) => r.includes("\x1b[7ma\x1b[27m")));
	keys("j");
	rows = e.render(40);
	assert.ok(rows.some((r) => r.includes("\x1b[7me\x1b[27m")));
	keys(ESC);
	rows = e.render(40);
	assert.ok(!rows.some((r) => r.includes("\x1b[27m")));
	assert.ok(!rows.at(-1)!.includes("VISUAL"));
});

test("visual com linha quebrada pelo tamanho: o realce acompanha o texto", () => {
	const { e, keys } = make(`|${"palavra ".repeat(12).trimEnd()}`);
	keys("vee");
	const rows: string[] = e.render(30);
	const hl = rows.join("\n").match(/\x1b\[7m(.)\x1b\[27m/g);
	assert.ok(hl && hl.length >= 8, String(hl?.length));
});

test("controles do app valem em todos os modos: Ctrl+C ocupado aborta, Ctrl+R histórico, Enter envia, Esc no normal chega ao app", () => {
	const { e, submitted, keys } = make("texto|", {
		busy: true,
		kb: { matches: (d: string, id: string) => id === "app.interrupt" && d === "\x1b" },
	});
	let aborted = 0,
		hist = 0,
		esc = 0;
	e.compat = {
		abort: () => {
			aborted++;
		},
	};
	e.openHistory = () => {
		hist++;
	};
	e.onEscape = () => {
		esc++;
	};
	e.handleInput("\x03");
	assert.equal(aborted, 1);
	keys("v");
	e.handleInput("\x03");
	assert.equal(aborted, 2);
	e.handleInput("\x12");
	assert.equal(hist, 1);
	keys(ESC); // sai do visual, não interrompe
	assert.equal(esc, 0);
	keys(ESC); // normal sem pendência: o app recebe
	assert.equal(esc, 1);
	keys("d");
	keys(ESC); // cancela o operador pendente
	assert.equal(esc, 1);
	assert.equal(e.engine.pending(), "");
	e.handleInput("\r");
	assert.deepEqual(submitted, ["texto"]);
});

test("/ abre o histórico; j/k no limite navegam o histórico nativo", () => {
	const { e, keys } = make("|");
	let hist = 0;
	e.openHistory = () => {
		hist++;
	};
	e.addToHistory("antigo");
	keys("/");
	assert.equal(hist, 1);
	keys("k");
	assert.equal(e.getText(), "antigo");
	keys("j");
	assert.equal(e.getText(), "");
});

test("remap jj via ui-state sai do INSERT sem deixar texto; modo desligado volta a insert", () => {
	const { e, keys, vim } = make("|", { remaps: ["jj"] });
	keys("i");
	keys("ajj");
	assert.equal(e.getText(), "a");
	assert.equal(e.mode, "normal");
	vim.enabled = false;
	e.handleInput("x");
	assert.equal(e.mode, "insert");
	assert.equal(e.getText(), "xa"); // Esc recuou o cursor para antes do 'a'
});

test("Ctrl+[ equivale a Esc; Unicode e multilinha: J, w e dd preservam grapheme", () => {
	const { e, keys } = make("|");
	e.mode = "insert";
	keys("e\u0301🙂 ok");
	e.handleInput("\x1b[91;5u");
	assert.equal(e.mode, "normal");
	keys("0x");
	assert.equal(e.getText(), "🙂 ok");
	keys("o");
	keys("世界");
	keys(ESC);
	keys("kJ");
	assert.equal(e.getText(), "🙂 ok 世界");
	keys("dd");
	assert.equal(e.getText(), "");
});

test("loadRemaps: settings.json do nycode vence (mesmo inválido/vazio); ui-state só sem a chave; só <Esc> vale", () => {
	const dir = mkdtempSync(join(tmp, "remaps-"));
	const settings = join(dir, "settings.json");
	const ui = join(dir, "ui-state.json");
	writeFileSync(ui, JSON.stringify({ vimInsertModeRemaps: { kk: "<Esc>" } }));
	assert.deepEqual(m.loadRemaps(join(dir, "ausente.json"), ui), ["kk"], "sem settings: legado");
	writeFileSync(settings, JSON.stringify({ theme: "x" }));
	assert.deepEqual(m.loadRemaps(settings, ui), ["kk"], "settings sem a chave: legado");
	writeFileSync(settings, JSON.stringify({ vimInsertModeRemaps: { jj: "<Esc>", jk: "foo", abc: "<Esc>" } }));
	assert.deepEqual(m.loadRemaps(settings, ui), ["jj"]);
	writeFileSync(settings, JSON.stringify({ vimInsertModeRemaps: { jk: "foo" } }));
	assert.deepEqual(m.loadRemaps(settings, ui), [], "chave presente e inválida não cai no legado");
	writeFileSync(settings, "{corrompido");
	assert.deepEqual(m.loadRemaps(settings, ui), ["kk"]);
	const old = process.env.NYCODE_CODING_AGENT_DIR;
	process.env.NYCODE_CODING_AGENT_DIR = dir;
	try {
		writeFileSync(settings, JSON.stringify({ vimInsertModeRemaps: { ab: "<Esc>" } }));
		assert.deepEqual(m.loadRemaps(undefined, ui), ["ab"], "padrão = NYCODE_CODING_AGENT_DIR/settings.json");
	} finally {
		if (old === undefined) delete process.env.NYCODE_CODING_AGENT_DIR;
		else process.env.NYCODE_CODING_AGENT_DIR = old;
	}
});

test("sem a API editor-actions o Vim não edita: aviso único, texto intacto, tecla segue o fluxo nativo", () => {
	const notes: string[] = [];
	const { e } = make("a|bc", { notify: (msg) => notes.push(msg) });
	Object.defineProperty(e, "runEditorAction", { value: undefined });
	Object.defineProperty(e, "withUndoGroup", { value: undefined });
	e.handleInput("x");
	e.handleInput("x");
	assert.equal(e.getText(), "axxbc", "o nativo digitou; o Vim não apagou");
	assert.equal(notes.length, 1);
	assert.match(notes[0]!, /editor-actions/);
});

test("teclas nativas remapeadas ou desativadas não quebram as ações semânticas do Vim", async () => {
	// posiciona o cursor com as teclas nativas padrão, antes de o usuário remapeá-las
	const { e, keys } = make("ab|c\ndef");
	const custom = new KeybindingsManager(TUI_KEYBINDINGS, {
		"tui.editor.cursorLeft": [],
		"tui.editor.cursorRight": [],
		"tui.editor.deleteCharForward": [],
		"tui.editor.undo": "alt+9",
	});
	setKeybindings(custom);
	try {
		keys("xhx");
		assert.equal(show(e), "|b\ndef");
		keys("u");
		assert.equal(e.getText(), "ab\ndef");
		keys("u");
		assert.equal(e.getText(), "abc\ndef");
		keys("jx");
		assert.equal(e.getText(), "abc\nde");
		keys("$x");
		assert.equal(e.getText(), "abc\nd");
		// o mapa do usuário não foi sobrescrito
		assert.deepEqual(getKeybindings().getKeys("tui.editor.cursorLeft"), []);
		assert.deepEqual(getKeybindings().getKeys("tui.editor.undo"), ["alt+9"]);
	} finally {
		setKeybindings(new KeybindingsManager(TUI_KEYBINDINGS));
	}
});

/** Textos realçados (vídeo reverso) por linha renderizada. */
const lit = (rows: string[]) =>
	rows.flatMap((r) => [...r.matchAll(/\x1b\[7m(?:\x1b\[7m)?([^\x1b]*)(?:\x1b\[0m)?\x1b\[27m/g)].map((x) => x[1]));

test("render real: padding, linha quebrada, CJK e linhas em branco mantêm o realce correto", () => {
	const padded = make("|abcd");
	padded.e.setPaddingX(2);
	padded.keys("vl");
	assert.deepEqual(lit(padded.e.render(30)).slice(0, 2), ["a", "b"]);
	const wide = make(`|${"palavra ".repeat(8).trimEnd()}`);
	wide.keys("v$");
	// largura 30 (respiro 3): 3 linhas visuais cabem na janela nativa; em 20 colunas o editor rola e esconde a 1ª linha
	const wideRows = wide.e.render(30);
	assert.ok(wideRows.length > 4 && !wideRows.some((r) => r.includes("more")), "sem rolagem nativa");
	assert.equal(lit(wideRows).join("").replace(/ /g, ""), "palavra".repeat(8));
	const cjk = make("|漢字かな");
	cjk.keys("vl");
	assert.deepEqual(lit(cjk.e.render(20)).slice(0, 2), ["漢", "字"]);
	const blank = make("|a\n\nb");
	blank.keys("Vjj");
	assert.deepEqual(lit(blank.e.render(20)).slice(0, 2), ["a", " "]);
});

test("seleção que não consegue ser pintada avisa na borda e não altera o buffer", () => {
	const { e, keys } = make("a|bcd");
	keys("vl");
	e.getLines = () => ["texto que não casa"];
	const rows: string[] = e.render(40);
	assert.ok(rows.at(-1)!.includes("seleção não exibida"), rows.at(-1));
	assert.ok(!rows.some((r) => r.includes("\x1b[27m")));
	assert.equal(e.getText(), "abcd");
});
