// node --experimental-strip-types --test ~/.nycode/agent/extensions/ui/test/editor.test.ts
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, test, vi } from "vitest";
import * as __typed1 from "../../../../../src/extensions/ui/editor.ts";

// The animations read TERM: pin it so the suite does not depend on the shell it runs in.
beforeEach(() => {
	vi.stubEnv("TERM", "xterm-256color");
});
afterEach(() => {
	vi.unstubAllEnvs();
});

// The source tests exercise the modules with partial fakes, without types.
const __m1: any = __typed1;

// O Node não tira tipos de .ts dentro de node_modules: testa uma cópia do módulo, com o nycode ao lado.
const tmp = mkdtempSync(join(tmpdir(), "ui-editor-test-"));
// editor.ts importa ../claude-compat/aliases.ts: replica a vizinhança (ui/ e claude-compat/).
// history.ts importa a folha (teclas) e os ícones: sem eles a cópia não carrega e nenhum teste deste arquivo roda.
const m = __m1;

const theme = { borderColor: (s: string) => s, selectList: {} };
const kb = { matches: () => false };
let renders = 0;
const tui = {
	requestRender() {
		renders++;
	},
	terminal: { rows: 24, columns: 80 },
};
function editor(vim: { enabled: boolean }, name?: string) {
	const e = new m.UiEditor(tui, theme, kb, vim, () => name);
	const submitted: string[] = [];
	e.onSubmit = (t: string) => submitted.push(t);
	return { e, submitted };
}

function setup(opts: { hasUI?: boolean; other?: boolean } = {}) {
	const handlers: Record<string, any> = {};
	const cmds: Record<string, any> = {};
	const notes: string[] = [];
	let factory: any;
	const renders = 0;
	let named: string | undefined;
	m.default({
		on: (n: string, h: unknown) => {
			handlers[n] = h;
		},
		getSettings: () => ({}),
		registerCommand: (n: string, c: unknown) => {
			cmds[n] = c;
		},
		setSessionName: (n: string) => {
			named = n;
		},
		getSessionName: () => named,
	} as never);
	const ctx = {
		hasUI: opts.hasUI ?? true,
		ui: {
			getEditorComponent: () => (opts.other ? () => ({}) : undefined),
			setEditorComponent: (f: unknown) => {
				factory = f;
			},
			notify: (msg: string, l: string) => notes.push(`${l}:${msg}`),
		},
	};
	return { handlers, cmds, notes, ctx, factory: () => factory, renders: () => renders, named: () => named };
}

const flush = () => new Promise((r) => setImmediate(r));
const hist = { fg: (_c: string, s: string) => s, bg: (_c: string, s: string) => s, bold: (s: string) => s };

function historyCtx(s: ReturnType<typeof setup>, branchText: string, sessionDir = tmp) {
	let comp: any;
	let opts: any;
	let finish: ((v: unknown) => void) | undefined;
	(s.ctx as Record<string, unknown>).sessionManager = {
		getBranch: () => [{ type: "message", message: { role: "user", content: branchText } }],
		getSessionDir: () => sessionDir,
	};
	(s.ctx.ui as Record<string, unknown>).custom = (f: any, o: any) =>
		new Promise((res) => {
			finish = res;
			opts = o;
			comp = f(tui, hist, kb, res);
		});
	return { comp: () => comp, opts: () => opts, finish: () => finish };
}

const strip = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "").replace(/\x1b_[^\x07]*\x07/g, "");

// Cápsula (dono, 2026-11-18, /barra variante 2): antes réguas retas `───`; agora as pontas viram cantos `╮` e `╯`.

// --- compatibilidade Claude Code ---
function compatEditor(busy = false) {
	const renders: any[] = [];
	const t = { requestRender: (f?: boolean) => renders.push(f), terminal: { rows: 24, columns: 80 } };
	const notes: string[] = [];
	const aborted: number[] = [];
	const e = new m.UiEditor(t, theme, kbWith([]), { enabled: false }, () => undefined, { busy: () => busy });
	const submitted: string[] = [];
	e.compat = {
		abort: () => aborted.push(1),
		notify: (x: string) => notes.push(x),
		hasCommand: (n: string) => n === "registrado",
	};
	e.onSubmit = (x: string) => submitted.push(x);
	return { e, submitted, notes, aborted, renders };
}
const kbWith = (ids: string[]) => ({ matches: (_d: string, id: string) => ids.includes(id) });

test("readState tolera ausente, corrompido e não-objeto; mergeState preserva chaves", () => {
	const p = join(tmp, "state", "ui-state.json");
	assert.deepEqual(m.readState(p), {});
	m.mergeState({ vim: true }, p);
	writeFileSync(p, JSON.stringify({ vim: true, outra: 1 }));
	m.mergeState({ vim: false }, p);
	assert.deepEqual(m.readState(p), { vim: false, outra: 1 });
	writeFileSync(p, "{corrompido");
	assert.deepEqual(m.readState(p), {});
	writeFileSync(p, "[1]");
	assert.deepEqual(m.readState(p), {});
});
test("nameLabel", () => {
	assert.equal(m.nameLabel(undefined, 80), undefined);
	assert.equal(m.nameLabel("nome", 10), undefined);
	const fitLine = m.nameLabel("nome", 80);
	assert.equal(fitLine.label, " nome ");
	assert.equal(fitLine.rest, 80 - 6 - 3);
});
test("parseRemaps: só par de duas teclas imprimíveis → exatamente <Esc>", () => {
	assert.deepEqual(m.parseRemaps({ jj: "<Esc>", jk: "<Esc>", abc: "<Esc>", k: "<Esc>", " j": "<Esc>" }), ["jj", "jk"]);
	assert.deepEqual(m.parseRemaps({ jj: "foo", kk: "<esc>", xx: 1, yy: null }), []);
	assert.deepEqual(m.parseRemaps(["jj"]), []);
	assert.deepEqual(m.parseRemaps("jj"), []);
	assert.deepEqual(m.parseRemaps(undefined), []);
});
test("? com editor vazio abre /hotkeys; com texto digita", () => {
	const { e, submitted } = editor({ enabled: false });
	e.handleInput("?");
	assert.deepEqual(submitted, ["/hotkeys"]);
	e.handleInput("x");
	e.handleInput("?");
	assert.equal(e.getText(), "x?");
	assert.deepEqual(submitted, ["/hotkeys"]);
});
test("? com editor vazio: se o painel de atalhos abre, não vai ao /hotkeys; o caractere devolvido entra no texto", () => {
	const { e, submitted } = editor({ enabled: false });
	let devolver: ((s: string) => void) | undefined;
	e.compat = {
		openShortcuts: (insert: (s: string) => void) => {
			devolver = insert;
			return true;
		},
	};
	e.handleInput("?");
	assert.deepEqual(submitted, []);
	const antes = renders;
	devolver!("a");
	assert.equal(e.getText(), "a");
	assert.ok(renders > antes, "a letra devolvida pede redesenho (sem isso ela só aparece na tecla seguinte)");
	e.compat = { openShortcuts: () => false }; // indisponível: cai no /hotkeys
	e.setText("");
	e.handleInput("?");
	assert.deepEqual(submitted, ["/hotkeys"]);
});
test("vim: Esc → normal, x apaga, i volta, indicador na borda; desligado sem indicador", () => {
	const vim = { enabled: true };
	const { e } = editor(vim);
	for (const c of "abc") e.handleInput(c);
	e.handleInput("\x1b");
	assert.equal(e.mode, "normal");
	assert.ok(e.render(40).at(-1).includes("NORMAL"));
	e.handleInput("0");
	e.handleInput("x");
	assert.equal(e.getText(), "bc");
	e.handleInput("z");
	assert.equal(e.getText(), "bc");
	e.handleInput("?"); // em normal, ? não abre hotkeys
	e.handleInput("i");
	assert.ok(!e.render(40).at(-1).includes("NORMAL") && !e.render(40).at(-1).includes("INSERT")); // insert é o padrão: silêncio
	vim.enabled = false;
	e.handleInput("\x1b");
	assert.equal(e.mode, "insert");
	assert.ok(!e.render(40).at(-1).includes("INSERT"));
});
test("borda superior mostra o nome da sessão quando cabe", () => {
	assert.ok(editor({ enabled: false }, "minha-sessao").e.render(60)[0].includes("minha-sessao"));
	assert.ok(!editor({ enabled: false }).e.render(60)[0].includes("minha-sessao"));
});
test("/rename define e mostra o nome", async () => {
	const s = setup();
	await s.cmds.rename.handler(" novo ", s.ctx);
	assert.equal(s.named(), "novo");
	await s.cmds.rename.handler("", s.ctx);
	assert.deepEqual(s.notes, ["info:Sessão renomeada para “novo”", "info:Sessão: novo"]);
	const t = setup();
	await t.cmds.rename.handler("", t.ctx);
	assert.match(t.notes[0], /sem nome/);
});
test("/vim: indisponível sem editor próprio; alterna, persiste e instala o editor", async () => {
	const file = join(tmp, "vim-state.json");
	process.env.NYCODE_UI_STATE = file;
	try {
		const noEd = setup({ other: true });
		noEd.handlers.session_start({}, noEd.ctx);
		await noEd.cmds.vim.handler("", noEd.ctx);
		assert.match(noEd.notes[0], /^warning:/);
		const off = setup({ hasUI: false });
		off.handlers.session_start({}, off.ctx);
		assert.equal(off.factory(), undefined);

		writeFileSync(file, JSON.stringify({ outra: 1 }));
		const s = setup();
		s.handlers.session_start({}, s.ctx);
		const ed = s.factory()(tui, theme, kb);
		assert.ok(ed instanceof m.UiEditor);
		s.handlers.session_info_changed();
		await s.cmds.vim.handler("", s.ctx);
		assert.deepEqual(m.readState(file), { outra: 1, vim: true });
		assert.match(s.notes[0], /ligado/);
		// novo session_start lê o flag persistido
		const s2 = setup();
		s2.handlers.session_start({}, s2.ctx);
		s2.factory()(tui, theme, kb).handleInput("\x1b");
		await s2.cmds.vim.handler("", s2.ctx);
		assert.equal(m.readState(file).vim, false);
		assert.match(s2.notes[0], /desligado/);
		// falha de gravação vira aviso
		process.env.NYCODE_UI_STATE = join(file, "x", "y.json");
		await s2.cmds.vim.handler("", s2.ctx);
		assert.match(s2.notes[1], /^warning:ui-state/);
	} finally {
		delete process.env.NYCODE_UI_STATE;
	}
});
test("Ctrl+S: guarda, devolve e troca; borda mostra o rascunho; vale no modo normal do vim", () => {
	const vim = { enabled: true };
	const { e } = editor(vim);
	e.handleInput("\x13"); // vazio sem guardado: nada
	assert.equal(e.stash, undefined);
	for (const c of "abc") e.handleInput(c);
	e.handleInput("\x13");
	assert.equal(e.getText(), "");
	assert.equal(e.stash, "abc");
	assert.ok(e.render(60)[0].includes("rascunho"));
	e.handleInput("\x13");
	assert.equal(e.getText(), "abc");
	assert.equal(e.stash, undefined);
	assert.ok(!e.render(60)[0].includes("rascunho"));
	e.handleInput("\x13"); // guarda
	for (const c of "xy") e.handleInput(c);
	e.handleInput("\x1b"); // modo normal
	e.handleInput("\x13"); // troca
	assert.equal(e.getText(), "abc");
	assert.equal(e.stash, "xy");
});
test("borda: rascunho junto do nome da sessão e sem espaço em borda estreita", () => {
	const { e } = editor({ enabled: false }, "minha-sessao");
	e.handleInput("a");
	e.handleInput("\x13");
	const top = e.render(70)[0];
	assert.ok(top.includes("minha-sessao") && top.includes("rascunho"));
	assert.ok(!e.render(14)[0].includes("rascunho"));
});
test("Ctrl+C com texto vai ao histórico (↑ devolve); vazio não adiciona", () => {
	const { e } = editor({ enabled: false });
	e.handleInput("\x03"); // vazio: nada no histórico
	for (const c of "rascunho") e.handleInput(c);
	e.handleInput("\x03"); // o editor nativo do app é quem limpa; aqui o histórico já tem o texto
	e.setText("");
	e.handleInput("\x1b[A");
	assert.equal(e.getText(), "rascunho");
});
test("Ctrl+R chama openHistory (também no vim normal); sem callback é ignorado", () => {
	const { e } = editor({ enabled: true });
	e.handleInput("\x12");
	let n = 0;
	e.openHistory = () => {
		n++;
	};
	e.handleInput("\x12");
	e.handleInput("\x1b");
	e.handleInput("\x12");
	assert.equal(n, 2);
});
test("Ctrl+R abre o overlay com o ctx mais novo; Enter põe o prompt sem enviar; Esc não muda", async () => {
	const s = setup();
	s.handlers.session_start({}, s.ctx);
	const ed = s.factory()(tui, theme, kb);
	const submitted: string[] = [];
	ed.onSubmit = (t: string) => submitted.push(t);
	const stale = historyCtx(s, "antigo");
	s.handlers.session_start({}, s.ctx); // /new: editor já existe, ctx novo
	const h = historyCtx(s, "do ramo atual");
	ed.handleInput("\x12");
	ed.handleInput("\x12"); // reentrada ignorada
	await flush();
	assert.equal(h.opts().overlay, true);
	assert.equal(stale.comp(), undefined);
	assert.ok(h.comp().render(60).join("\n").includes("do ramo atual"));
	h.comp().handleInput("\r");
	await flush();
	assert.equal(ed.getText(), "do ramo atual");
	assert.deepEqual(submitted, []);
	ed.setText("mantido");
	ed.handleInput("\x12");
	await flush();
	h.comp().handleInput("\x1b");
	await flush();
	assert.equal(ed.getText(), "mantido");
});
test("Ctrl+R: falha do overlay vira aviso e libera nova abertura; sem ctx não faz nada", async () => {
	const s = setup();
	const ed0 = new m.UiEditor(tui, theme, kb, { enabled: false }, () => undefined);
	s.handlers.session_start({}, s.ctx);
	const ed = s.factory()(tui, theme, kb);
	ed.handleInput("\x12"); // sem sessionManager/custom: custom lança
	await flush();
	assert.match(s.notes.at(-1) ?? "", /^warning:Histórico indisponível/);
	const h = historyCtx(s, "ok");
	ed.handleInput("\x12");
	await flush();
	assert.ok(h.comp());
	h.finish()?.(undefined);
	const bare = setup();
	bare.handlers.session_start({}, { hasUI: false });
	assert.equal(ed0.openHistory, undefined);
});
test("régua de cima: rascunho diz a tecla que devolve; estreita encurta", () => {
	const { e } = editor({ enabled: false });
	e.handleInput("a");
	e.handleInput("\x13");
	assert.ok(e.render(70)[0].endsWith(" rascunho guardado · ctrl+s devolve ──╮"));
	assert.ok(e.render(30)[0].endsWith(" rascunho ──╮"));
	for (const w of [70, 30, 14]) assert.equal(strip(e.render(w)[0]).length, w);
});
test("régua de baixo: shell, fora do contexto, NORMAL, apagado e dica de fila; padrão é régua lisa", () => {
	assert.equal(m.shellLabel("texto"), undefined);
	assert.equal(m.shellLabel(" !ls"), "shell");
	assert.equal(m.shellLabel("!!ls"), "shell · fora do contexto");
	let busy = false;
	const vim = { enabled: false };
	const e = new m.UiEditor(tui, theme, kb, vim, () => undefined, { dim: (s: string) => `<${s}>`, busy: () => busy });
	const bottom = (w = 70) => e.render(w).at(-1);
	const lisa = (w: number) => `╰${"─".repeat(w - 2)}╯`;
	assert.equal(bottom(), lisa(70));
	for (const c of "oi") e.handleInput(c);
	assert.equal(bottom(), lisa(70)); // ocioso com texto: nada
	busy = true;
	assert.ok(bottom().endsWith(" ⏎ <entra no próximo passo ·> ctrl+⏎ <envia agora> ──╯"));
	assert.ok(bottom(36).endsWith(" ⏎ <entra na fila> ──╯"));
	assert.equal(bottom(20), lisa(20));
	busy = false; // ocupado, Ctrl+C interrompe o agente em vez de apagar
	e.handleInput("\x03");
	e.setText(""); // o app nativo é quem limpa
	assert.ok(bottom().endsWith(" <apagado ·> ↑ <recupera> ──╯"));
	e.handleInput("!");
	assert.ok(bottom().endsWith(" shell ──╯") && !bottom().includes("apagado")); // some na próxima tecla
	e.handleInput("!");
	assert.ok(bottom().endsWith(" shell · fora do contexto ──╯"));
	vim.enabled = true;
	e.handleInput("\x1b");
	assert.ok(bottom().endsWith(" shell · fora do contexto< · >NORMAL ──╯"));
	assert.equal(strip(bottom()).length, 70);
});
test("fábrica liga dim ao tema e busy ao isIdle do contexto atual", () => {
	const s = setup();
	(s.ctx.ui as Record<string, unknown>).theme = { fg: (c: string, t: string) => `<${c}:${t}>` };
	(s.ctx as Record<string, unknown>).isIdle = () => false;
	s.handlers.session_start({}, s.ctx);
	const ed = s.factory()(tui, theme, kb);
	ed.handleInput("x");
	assert.ok(ed.render(100).at(-1).includes("<dim:envia agora>"));
});
test("Ctrl+X Ctrl+E e Ctrl+X Enter usam as ações nativas sem copiar o prefixo", () => {
	const { e } = compatEditor();
	const seen: string[] = [];
	e.onExtensionShortcut = (data: string) => {
		seen.push(data);
		return true;
	};
	assert.equal(e.handleClaudeChord("\x05", 100), true);
	assert.equal(e.handleClaudeChord("\r", 100), true);
	assert.equal(e.handleClaudeChord("z", 100), false);
	assert.deepEqual(seen, ["\x07", "\x11"]);
});
test("Ctrl+X Ctrl+K exige duas confirmações em 3 s e usa somente o fleet da sessão", () => {
	const key = Symbol.for("nycode.fleet.source");
	const old = Reflect.get(globalThis, key);
	const stopped: string[] = [];
	try {
		Reflect.set(globalThis, key, {
			source: {
				list: () => [{ id: "a", state: "running" }],
				stop: (id: string) => {
					stopped.push(id);
					return "stopping";
				},
				detachForeground: () => 1,
			},
		});
		const { e, notes } = compatEditor();
		e.handleClaudeChord("\x0b", 100);
		assert.deepEqual(stopped, []);
		e.handleClaudeChord("\x0b", 3200); // expirou: confirma de novo, não cancela
		assert.deepEqual(stopped, []);
		e.handleClaudeChord("\x0b", 3300);
		assert.deepEqual(stopped, ["a"]);
		assert.match(notes.at(-1)!, /1 cancelamento/);
		assert.equal(e.handleClaudeChord("\x02", 3400), true);
		assert.match(notes.at(-1)!, /1 chamada/);
		Reflect.set(globalThis, key, { source: {} });
		e.handleClaudeChord("\x0b", 3500);
		e.handleClaudeChord("\x0b", 3600);
		assert.match(notes.at(-1)!, /falhou/);
		e.handleClaudeChord("\x02", 3700);
		assert.match(notes.at(-1)!, /falhou/);
	} finally {
		if (old === undefined) Reflect.deleteProperty(globalThis, key);
		else Reflect.set(globalThis, key, old);
	}
});

const MODES_SLOT = Symbol.for("nycode.permission-modes");

function _withController(cycle: () => unknown, run: () => void) {
	const g = globalThis as Record<symbol, unknown>;
	const old = g[MODES_SLOT];
	g[MODES_SLOT] = {
		current: () => "default",
		cycle,
		select: () => ({ ok: true }),
		setBypass: () => ({ ok: true }),
		status: () => "",
	}; // slot com setBypass (bypass-orthogonal.md)
	try {
		run();
	} finally {
		if (old === undefined) delete g[MODES_SLOT];
		else g[MODES_SLOT] = old;
	}
}

// Pedido do dono (2026-11-14): `❯` no começo da caixa de entrada (antes só o cursor em bloco), alinhado ao `❯` das mensagens enviadas.
// Cápsula (dono, 2026-11-18): antes ` ❯ texto` e continuação em 3 colunas; agora `│ ❯ texto`, continuação em 4, `│` no fim.

// Dono, 2026-11-15: a régua do composer (barra de envio) fica no ciano do sistema; o modo shell mantém a cor do nycode (magenta).

// Dono, 2026-11-15: o ciano marca onde está o foco; a régua só fica ciano com o composer focado e nenhuma tab focada.

// Onda 10, P18: o editor vazio lembra as três portas; some na primeira tecla, sem mudar a largura.

// Cápsula (dono, 2026-11-18, /barra variante 2): a borda respira entre a régua e o ciano enquanto o agente trabalha e fica âmbar
// parada quando o turno está sem resposta; fora do turno, a cor de sempre.

// U7: o getter borderColor roda várias vezes por quadro; o texto (join de todas as linhas) e o respiro valem uma vez por render().
