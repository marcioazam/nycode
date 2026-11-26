// node --experimental-strip-types --test ~/.nycode/agent/extensions/ui/test/editor.test.ts
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
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
let _renders = 0;
const tui = {
	requestRender() {
		_renders++;
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

const _flush = () => new Promise((r) => setImmediate(r));
const hist = { fg: (_c: string, s: string) => s, bg: (_c: string, s: string) => s, bold: (s: string) => s };

function _historyCtx(s: ReturnType<typeof setup>, branchText: string, sessionDir = tmp) {
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

const _strip = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "").replace(/\x1b_[^\x07]*\x07/g, "");

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

test("Shift+Tab aciona somente o plan mode protegido; sem extensão avisa e não muda permissões", () => {
	const { e, notes } = compatEditor();
	const seen: string[] = [];
	e.onExtensionShortcut = (data: string) => {
		seen.push(data);
		return true;
	};
	e.handleInput("\x1b[Z");
	assert.deepEqual(seen, []);
	assert.match(notes.at(-1)!, /não está carregado/);
	e.compat.hasCommand = (name: string) => name === "plan";
	e.handleInput("\x1b[Z");
	assert.deepEqual(seen, ["\x1b[112;6u"]);
});

const MODES_SLOT = Symbol.for("nycode-harness.permission-modes");

function withController(cycle: () => unknown, run: () => void) {
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

test("Shift+Tab delega ao controlador de modos: ok e erro consomem a tecla, sem fallback nem mexer no rascunho", () => {
	for (const result of [
		{ ok: true, mode: "acceptEdits" },
		{ ok: false, error: "recusado" },
	]) {
		const { e, notes } = compatEditor();
		const seen: string[] = [];
		let calls = 0;
		e.onExtensionShortcut = (data: string) => {
			seen.push(data);
			return true;
		};
		e.compat.hasCommand = (name: string) => name === "plan";
		e.setText("rascunho\nem andamento");
		withController(
			() => {
				calls++;
				return result;
			},
			() => e.handleInput("\x1b[Z"),
		);
		assert.equal(calls, 1);
		assert.deepEqual(seen, [], "não aciona o toggle manual/plan");
		assert.deepEqual(notes, [], "o controlador, não o editor, notifica");
		assert.equal(e.getText(), "rascunho\nem andamento");
	}
});

test("Shift+Tab: controlador que lança vira erro explícito e também não cai no fallback", () => {
	const { e } = compatEditor();
	const seen: string[] = [];
	e.onExtensionShortcut = (data: string) => {
		seen.push(data);
		return true;
	};
	e.compat.hasCommand = () => true;
	e.setText("texto");
	withController(
		() => {
			throw new Error("boom");
		},
		() => e.handleInput("\x1b[Z"),
	);
	assert.deepEqual(seen, []);
	assert.equal(e.getText(), "texto");
});

test("barra invertida + Enter insere nova linha sem submissão nem barra residual", () => {
	const { e, submitted } = compatEditor();
	e.setText("primeira\\");
	e.handleInput("\r");
	assert.equal(e.getText(), "primeira\n");
	assert.deepEqual(submitted, []);
});

test("onSubmit: alias reescrito no submit, args preservados, texto comum intacto", () => {
	const { e, submitted, notes } = compatEditor();
	e.onSubmit("/continue");
	e.onSubmit("/effort high");
	e.onSubmit("/cost");
	e.onSubmit("/hotkeys");
	e.onSubmit("olá /config");
	e.onSubmit("/registrado");
	assert.deepEqual(submitted, ["/resume", "/effort high", "/session", "/hotkeys", "olá /config", "/registrado"]);
	assert.equal(notes.length, 1); // /cost avisa; /effort usa o handler completo de níveis/status
});

test("onSubmit: config com argumentos usa o handler real; argumento sem equivalente continua recusado", () => {
	const { e, submitted, notes } = compatEditor();
	e.onSubmit("/config theme=dark");
	assert.deepEqual(submitted, ["/config-set theme=dark"]);
	e.onSubmit("/continue inexistente");
	assert.deepEqual(submitted, ["/config-set theme=dark"]);
	assert.equal(e.getText(), "/continue inexistente");
	assert.match(notes[0]!, /\/resume/);
});

test("onSubmit: sem handler atribuído o acessor devolve undefined; reatribuir troca o destino", () => {
	const t = { requestRender() {}, terminal: { rows: 24, columns: 80 } };
	const e = new m.UiEditor(t, theme, kb, { enabled: false }, () => undefined);
	assert.equal(e.onSubmit, undefined);
	const seen: string[] = [];
	e.onSubmit = (x: string) => seen.push(x);
	e.onSubmit("/exit");
	assert.deepEqual(seen, ["/quit"]);
});

test("Enter real com /continue digitado entrega /resume ao app", () => {
	const { e, submitted } = compatEditor();
	for (const c of "/continue") e.handleInput(c);
	e.handleInput("\r");
	assert.deepEqual(submitted, ["/resume"]);
});

test("Ctrl+L redesenha quando não é o seletor de modelo; com a tecla nativa, passa adiante", () => {
	const { e, renders } = compatEditor();
	e.handleInput("\x0c");
	assert.deepEqual(renders, [true]);
	const t = {
		requestRender: (f?: boolean) => {
			(renders as unknown[]).push(`b${f}`);
		},
		terminal: { rows: 24, columns: 80 },
	};
	const native = new m.UiEditor(t, theme, kbWith(["app.model.select"]), { enabled: false }, () => undefined);
	native.handleInput("\x0c");
	assert.deepEqual(renders, [true]); // não redesenhou
});

test("Ctrl+T vira ctrl+shift+t (atalho do nycode) quando o raciocínio não usa Ctrl+T", () => {
	const { e } = compatEditor();
	const got: string[] = [];
	e.onExtensionShortcut = (d: string) => {
		got.push(d);
		return true;
	};
	e.handleInput("\x14");
	assert.deepEqual(got, [m.CTRL_SHIFT_T]);
	const t = { requestRender() {}, terminal: { rows: 24, columns: 80 } };
	const native = new m.UiEditor(t, theme, kbWith(["app.thinking.toggle"]), { enabled: false }, () => undefined);
	const got2: string[] = [];
	native.onExtensionShortcut = (d: string) => {
		got2.push(d);
		return false;
	};
	native.handleInput("\x14");
	assert.deepEqual(got2, ["\x14"]); // seguiu o fluxo nativo
});

test("Ctrl+C com agente ocupado interrompe e não toca no rascunho; ocioso segue o fluxo nativo", () => {
	const busy = compatEditor(true);
	busy.e.setText("rascunho");
	busy.e.handleInput("\x03");
	assert.deepEqual(busy.aborted, [1]);
	assert.equal(busy.e.getText(), "rascunho");
	const idle = compatEditor(false);
	idle.e.setText("rascunho");
	idle.e.handleInput("\x03");
	assert.deepEqual(idle.aborted, []);
});

test("fábrica liga abort, notify e hasCommand ao contexto atual e ao nycode", () => {
	const calls: string[] = [];
	const handlers: Record<string, any> = {};
	let factory: any;
	m.default({
		on: (n: string, h: unknown) => {
			handlers[n] = h;
		},
		getSettings: () => ({}),
		registerCommand() {},
		setSessionName() {},
		getSessionName: () => undefined,
		getCommands: () => [{ name: "foo" }],
	} as never);
	const ctx = {
		hasUI: true,
		isIdle: () => false,
		abort: () => calls.push("abort"),
		ui: {
			getEditorComponent: () => undefined,
			setEditorComponent: (f: unknown) => {
				factory = f;
			},
			notify: (x: string) => calls.push(x),
		},
	};
	handlers.session_start({}, ctx);
	const ed = factory(tui, theme, kb);
	ed.handleInput("\x03");
	ed.compat.notify("oi", "info");
	assert.deepEqual(calls, ["abort", "oi"]);
	assert.equal(ed.compat.hasCommand("foo"), true);
	assert.equal(ed.compat.hasCommand("bar"), false);
});

test("Ctrl+P/N viram ↑/↓ nativos (histórico no limite); com o ciclo de modelo em Ctrl+P, não traduz", () => {
	const { e } = compatEditor();
	e.addToHistory("antes");
	e.handleInput("\x10");
	assert.equal(e.getText(), "antes");
	e.handleInput("\x0e");
	assert.equal(e.getText(), "");
	const t = { requestRender() {}, terminal: { rows: 24, columns: 80 } };
	const native = new m.UiEditor(t, theme, kbWith(["app.model.cycleForward"]), { enabled: false }, () => undefined);
	native.addToHistory("antes");
	native.handleInput("\x10");
	assert.equal(native.getText(), ""); // o app trata Ctrl+P como ciclo de modelo
});

test("alias reescrito entra no histórico com a grafia ORIGINAL (↑/Ctrl+P); recusa e texto comum não", async () => {
	const { e } = compatEditor();
	e.onSubmit("/config");
	e.setText("");
	e.handleInput("\x10"); // Ctrl+P → ↑ nativo
	assert.equal(e.getText(), "/config"); // o comando nativo /settings volta ao app sem passar pelo histórico do editor
	e.setText("");
	e.onSubmit("/theme escuro");
	e.setText("");
	e.handleInput("\x10");
	assert.equal(e.getText(), "/theme escuro"); // argumentos preservados, grafia original
	e.setText("");
	e.onSubmit("/continue inexistente"); // recusado: nada roda, nada é lembrado
	e.setText("");
	e.handleInput("\x10");
	assert.equal(e.getText(), "/theme escuro");
});

test("histórico do alias só depois que o handler assíncrono termina; falha do handler não o grava", async () => {
	const t = { requestRender() {}, terminal: { rows: 24, columns: 80 } };
	const e = new m.UiEditor(t, theme, kbWith([]), { enabled: false }, () => undefined);
	let release!: () => void;
	e.onSubmit = () =>
		new Promise<void>((r) => {
			release = r;
		});
	e.onSubmit("/exit");
	e.setText("");
	e.handleInput("\x10");
	assert.equal(e.getText(), ""); // handler ainda rodando
	release();
	await new Promise((r) => setTimeout(r, 0));
	e.setText("");
	e.handleInput("\x10");
	assert.equal(e.getText(), "/exit");
	const f = new m.UiEditor(t, theme, kbWith([]), { enabled: false }, () => undefined);
	f.onSubmit = () => Promise.reject(new Error("boom"));
	await f.onSubmit("/exit").catch(() => {}); // a rejeição chega ao chamador
	f.handleInput("\x10");
	assert.equal(f.getText(), "");
});

// Pedido do dono (2026-11-14): `❯` no começo da caixa de entrada (antes só o cursor em bloco), alinhado ao `❯` das mensagens enviadas.
// Cápsula (dono, 2026-11-18): antes ` ❯ texto` e continuação em 3 colunas; agora `│ ❯ texto`, continuação em 4, `│` no fim.
test("prompt: ❯ antes do texto na 1ª linha; as demais linhas ficam alinhadas ao texto", () => {
	const { e } = editor({ enabled: false });
	assert.ok(
		e
			.render(40)[1]
			.replace(/\x1b\[[0-9;]*m|\x1b_[^\x07]*\x07/g, "")
			.startsWith("│ ❯ "),
	);
	for (const c of "abc") e.handleInput(c);
	const linhas = e.render(40).map((l: string) => l.replace(/\x1b\[[0-9;]*m|\x1b_[^\x07]*\x07/g, ""));
	assert.ok(linhas[1].startsWith("│ ❯ abc") && linhas[1].endsWith("│"), linhas[1]);
	e.setText("um\ndois");
	const duas = e.render(40).map((l: string) => l.replace(/\x1b\[[0-9;]*m|\x1b_[^\x07]*\x07/g, ""));
	assert.ok(duas[1].startsWith("│ ❯ um") && duas[2].startsWith("│   dois") && duas[2].endsWith("│"), duas.join("|"));
	assert.ok(
		duas[0].startsWith("╭") && duas[0].endsWith("╮") && duas[3].startsWith("╰") && duas[3].endsWith("╯"),
		duas.join("|"),
	);
	assert.ok(duas.every((l: string) => [...l].length <= 40));
});

// Dono, 2026-11-15: a régua do composer (barra de envio) fica no ciano do sistema; o modo shell mantém a cor do nycode (magenta).
test("borda: ciano do ui.cyan; com ! usa a cor que o nycode atribuiu", () => {
	const e = new m.UiEditor(tui, theme, kb, { enabled: false }, () => undefined, {
		cyan: (s: string) => `<c>${s}</c>`,
	});
	e.borderColor = (s: string) => `<nycode>${s}</nycode>`;
	e.focused = true;
	assert.equal(e.borderColor("─"), "<c>─</c>");
	e.setText("!ls");
	assert.equal(e.borderColor("─"), "<nycode>─</nycode>");
	const sem = new m.UiEditor(tui, theme, kb, { enabled: false }, () => undefined);
	sem.borderColor = (s: string) => `<nycode>${s}</nycode>`;
	assert.equal(sem.borderColor("─"), "<nycode>─</nycode>"); // sem ui.cyan: comportamento do nycode
});

// Dono, 2026-11-15: o ciano marca onde está o foco; a régua só fica ciano com o composer focado e nenhuma tab focada.
test("borda: ciano só com o editor focado e sem tab focada na barra de grupos", () => {
	const e = new m.UiEditor(tui, theme, kb, { enabled: false }, () => undefined, {
		cyan: (s: string) => `<c>${s}</c>`,
	});
	e.borderColor = (s: string) => `<nycode>${s}</nycode>`;
	e.focused = false;
	assert.equal(e.borderColor("─"), "<nycode>─</nycode>");
	e.focused = true;
	const slot = Symbol.for("nycode.group-nav");
	const g = globalThis as Record<symbol, unknown>;
	const prev = g[slot];
	try {
		g[slot] = { title: "status", isTitle: (id: string) => id === "status" };
		assert.equal(e.borderColor("─"), "<nycode>─</nycode>");
		g[slot] = { title: undefined, isTitle: () => false };
		assert.equal(e.borderColor("─"), "<c>─</c>");
	} finally {
		g[slot] = prev;
	}
});

// Onda 10, P18: o editor vazio lembra as três portas; some na primeira tecla, sem mudar a largura.
test("placeholder: só com o editor vazio, em dim, na mesma largura", () => {
	const plain = (s: string) => s.replace(/\x1b\[[0-9;]*m|\x1b_[^\x07]*\x07/g, "");
	const { e } = editor({ enabled: false });
	const vazio = e.render(70)[1];
	assert.match(plain(vazio), /^│ ❯ . Pergunte, ou \/ comandos · @ arquivos · ! shell +│$/); // cápsula (dono, 2026-11-18): antes sem `│`
	assert.equal(plain(vazio).length, plain(e.render(70)[0]).length);
	e.handleInput("a");
	assert.ok(!plain(e.render(70)[1]).includes("Pergunte"));
	assert.equal(
		m.comPlaceholder("abc", (s: string) => s),
		"abc",
		"sem espaço sobrando não escreve nada",
	);
	const curto = m.comPlaceholder(`x${" ".repeat(12)}\x1b[0m`, (s: string) => `<${s}>`);
	assert.equal(plain(curto), "x <Pergunte, …>", "corta com reticências no espaço que sobra");
	assert.ok(curto.endsWith("\x1b[0m"), "mantém o fecho de cor da linha");
});

// Cápsula (dono, 2026-11-18, /barra variante 2): a borda respira entre a régua e o ciano enquanto o agente trabalha e fica âmbar
// parada quando o turno está sem resposta; fora do turno, a cor de sempre.
test("cápsula: respira no trabalho, âmbar sem resposta, cor de sempre ocioso", () => {
	const FOCO = Symbol.for("nycode-harness:foco"),
		TRAV = Symbol.for("nycode-harness:travado");
	const g = globalThis as Record<symbol, unknown>;
	const salvo = [g[FOCO], g[TRAV]];
	let busy = false;
	const e = new m.UiEditor(tui, theme, kb, { enabled: false }, () => undefined, {
		busy: () => busy,
		borderRgb: (c: boolean) => (c ? [0, 200, 200] : [100, 100, 100]),
		warnRgb: () => [230, 160, 40],
	});
	try {
		g[FOCO] = true;
		const cor = () => /38;2;(\d+);(\d+);(\d+)m─/.exec(e.borderColor("─"))?.slice(1).join(",");
		assert.equal(cor(), undefined, "ocioso: sem respiração");
		busy = true;
		const real = performance.now;
		const vistos = new Set<string | undefined>();
		try {
			for (const t of [0, 1100, 2200, 3300]) {
				performance.now = () => t;
				vistos.add(cor());
			}
		} finally {
			performance.now = real;
		}
		assert.ok(vistos.size >= 3 && !vistos.has(undefined), `respira: ${[...vistos]}`);
		g[TRAV] = true;
		assert.equal(cor(), "230,160,40", "sem resposta: âmbar");
		const rows = e.render(40).map((l: string) => l.replace(/\x1b\[[0-9;]*m|\x1b_[^\x07]*\x07/g, ""));
		assert.ok(
			rows[0].startsWith("╭") && rows.at(-1)!.endsWith("╯") && rows[1].startsWith("│") && rows[1].endsWith("│"),
			rows.join("|"),
		);
		assert.equal(m.lados("abc", "|"), "abc", "linha sem respiro nas pontas fica intacta");
		assert.equal(m.cantos("x──", "╭", "╮"), "x─╮", "só troca ponta que é régua");
	} finally {
		g[FOCO] = salvo[0];
		g[TRAV] = salvo[1];
	}
});

// U7: o getter borderColor roda várias vezes por quadro; o texto (join de todas as linhas) e o respiro valem uma vez por render().
test("U7: render lê o texto e calcula o respiro uma vez por quadro; saída igual", () => {
	const FOCO = Symbol.for("nycode-harness:foco");
	const g = globalThis as Record<symbol, unknown>;
	const salvo = g[FOCO];
	let rgb = 0;
	const e = new m.UiEditor(tui, theme, kb, { enabled: false }, () => "nome", {
		busy: () => true,
		borderRgb: (c: boolean) => {
			rgb++;
			return c ? [0, 200, 200] : [100, 100, 100];
		},
	});
	const real = performance.now;
	try {
		g[FOCO] = true;
		e.setText("um\ndois\n!x".repeat(3));
		performance.now = () => 1234;
		const get = e.getText.bind(e);
		let leituras = 0;
		e.getText = () => {
			leituras++;
			return get();
		};
		const saida = e.render(60);
		// Saída capturada antes da mudança (tempo fixo em 1234 ms): o cache por quadro não pode alterar um byte.
		assert.deepEqual(
			saida,
			JSON.parse(
				String.raw`["\u001b[38;2;1;199;199m╭──────────────────────────────────────────────────\u001b[39m nome \u001b[38;2;1;199;199m──╮\u001b[39m","\u001b[38;2;1;199;199m│\u001b[39m ❯ um                                                     \u001b[38;2;1;199;199m│\u001b[39m","\u001b[38;2;1;199;199m│\u001b[39m   dois                                                   \u001b[38;2;1;199;199m│\u001b[39m","\u001b[38;2;1;199;199m│\u001b[39m   !xum                                                   \u001b[38;2;1;199;199m│\u001b[39m","\u001b[38;2;1;199;199m│\u001b[39m   dois                                                   \u001b[38;2;1;199;199m│\u001b[39m","\u001b[38;2;1;199;199m│\u001b[39m   !xum                                                   \u001b[38;2;1;199;199m│\u001b[39m","\u001b[38;2;1;199;199m│\u001b[39m   dois                                                   \u001b[38;2;1;199;199m│\u001b[39m","\u001b[38;2;1;199;199m│\u001b[39m   !x\u001b_nycode:fc\u0007 \u001b_nycode:/fc\u0007                                                    \u001b[38;2;1;199;199m│\u001b[39m","\u001b[38;2;1;199;199m╰───────────────────────────────────────\u001b[39m ⏎ entra na fila \u001b[38;2;1;199;199m──╯\u001b[39m"]`,
			),
		);
		assert.ok(leituras <= 3, `getText por quadro: ${leituras}`);
		assert.ok(rgb <= 2, `borderRgb por quadro: ${rgb}`);
		assert.deepEqual(saida, e.render(60), "mesma saída no quadro seguinte (tempo fixo)");
	} finally {
		performance.now = real;
		g[FOCO] = salvo;
	}
});
