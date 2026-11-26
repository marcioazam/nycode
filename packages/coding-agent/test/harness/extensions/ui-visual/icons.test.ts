// node --experimental-strip-types --test ~/.nycode/agent/extensions/ui-visual/test/icons.test.ts
import assert from "node:assert/strict";
import { afterEach, beforeEach, test, vi } from "vitest";
import type { IconName } from "../../../../src/extensions/ui-visual/icons.ts";
import * as __r1 from "../../../../src/extensions/ui-visual/icons.ts";
import * as __r2 from "../../../../src/extensions/ui-visual/icons.ts";
import * as __r3 from "../../../../src/extensions/ui-visual/icons.ts";
import * as __r4 from "../../../../src/extensions/ui-visual/icons.ts";
import { icon, iconGap, nerdFont } from "../../../../src/extensions/ui-visual/icons.ts";

// The animations read TERM: pin it so the suite does not depend on the shell it runs in.
beforeEach(() => {
	vi.stubEnv("TERM", "xterm-256color");
});
afterEach(() => {
	vi.unstubAllEnvs();
});

const NAMES: IconName[] = [
	"read",
	"bash",
	"edit",
	"write",
	"grep",
	"find",
	"ls",
	"ok",
	"err",
	"pending",
	"warn",
	"branch",
	"clock",
	"think",
	"todo",
	"agent",
	"question",
	"web",
	"memory",
	"lsp",
	"plan",
	"run",
	"tool",
	"hook",
	"swap",
];

test("nerdFont: kitty ou NYCODE_NERD_FONT=1 ligam; resto desliga", () => {
	assert.equal(nerdFont({}), false);
	assert.equal(nerdFont({ TERM: "xterm-256color" }), false);
	assert.equal(nerdFont({ TERM: "xterm-kitty" }), true);
	assert.equal(nerdFont({ KITTY_WINDOW_ID: "3" }), true);
	assert.equal(nerdFont({ NYCODE_NERD_FONT: "1" }), true);
	assert.equal(nerdFont({ NYCODE_NERD_FONT: "0" }), false);
});

test("nerdFont: NYCODE_ASCII_ICONS, TERM=dumb e TERM=linux vencem o kitty; NO_COLOR não desliga", () => {
	assert.equal(nerdFont({ TERM: "xterm-kitty", NYCODE_ASCII_ICONS: "1" }), false);
	assert.equal(nerdFont({ NYCODE_NERD_FONT: "1", TERM: "dumb" }), false);
	assert.equal(nerdFont({ NYCODE_NERD_FONT: "1", TERM: "linux" }), false);
	assert.equal(nerdFont({ TERM: "xterm-kitty", NO_COLOR: "1" }), true);
	assert.equal(nerdFont({ TERM: "xterm-kitty", NO_COLOR: "" }), true);
});

test("ASCII: NYCODE_ASCII_ICONS, TERM=dumb ou TERM=linux; ok + err x pending *", () => {
	for (const env of [
		{ NYCODE_ASCII_ICONS: "1" },
		{ TERM: "dumb" },
		{ TERM: "linux" },
		{ NYCODE_ASCII_ICONS: "1", NYCODE_NERD_FONT: "1" },
	]) {
		assert.equal(icon("ok", env), "+");
		assert.equal(icon("err", env), "x");
		assert.equal(icon("pending", env), "*");
		for (const n of NAMES) assert.match(icon(n, env), /^[\x20-\x7e]$/, n);
	}
	assert.equal(
		new Set(["read", "bash", "edit", "grep", "ls"].map((n) => icon(n as IconName, { TERM: "dumb" }))).size,
		5,
	);
});

test("todo IconName existe nos três conjuntos e o fallback tem largura 1", () => {
	for (const n of NAMES) {
		const nerd = icon(n, { NYCODE_NERD_FONT: "1" });
		const plain = icon(n, {});
		const ascii = icon(n, { NYCODE_ASCII_ICONS: "1" });
		assert.equal([...ascii].length, 1, n);
		assert.ok(nerd.length > 0, n);
		assert.ok(plain.length > 0, n);
		assert.equal([...plain].length, 1, n);
		assert.notEqual(nerd, plain, n);
	}
});

test("glifos conhecidos", () => {
	assert.equal(icon("think", { NYCODE_NERD_FONT: "1" }), "\u{f0336}"); // lâmpada; cérebro = memória
	assert.equal(icon("ok", { NYCODE_NERD_FONT: "1" }), "\uf42e");
	assert.equal(icon("ok", {}), "✓");
	assert.equal(icon("err", { NYCODE_NERD_FONT: "1" }), "\uea76"); // Codicons close: um pouco maior que o oct-x
	assert.equal(icon("pending", {}), "●");
	assert.equal(icon("pending", { NYCODE_ASCII_ICONS: "1" }), "*");
});

// Régua Run: antes bash '\ueb70'; depois '\ueb91' (inseto com play); agora '\uebca' (cod-terminal_bash,
// título `Bash`); agora '\u{f018d}' (md-console, opção 6); run segue '\ueb70'.
test("ícones de ferramenta: um Codicon por família, com Unicode e ASCII", () => {
	// Edit com lápis: antes edit '\uea71' (cod-circle_filled), o mesmo do write.
	const nerd: Record<string, string> = {
		read: "\ueabc",
		bash: "\u{f018d}",
		edit: "\uea73",
		write: "\uea71",
		grep: "\ueabc",
		find: "\ueabc",
		ls: "\ueabc",
		todo: "\ueb67",
		agent: "\u{f06a9}",
		question: "\ueac7",
		web: "\ueb01",
		memory: "\uea71",
		lsp: "\ueabc",
		plan: "\ueb9d",
		run: "\ueb70",
		tool: "\ueb6d",
	};
	for (const [n, g] of Object.entries(nerd)) assert.equal(icon(n as IconName, { NYCODE_NERD_FONT: "1" }), g, n);
	const uni: Record<string, string> = {
		todo: "☰",
		agent: "◎",
		question: "?",
		web: "⊕",
		memory: "●",
		lsp: "○",
		plan: "◈",
		run: "▸",
		tool: "•",
	};
	for (const [n, g] of Object.entries(uni)) assert.equal(icon(n as IconName, {}), g, n);
	const asc: Record<string, string> = {
		todo: "-",
		agent: "&",
		question: "?",
		web: "%",
		memory: '"',
		lsp: "<",
		plan: "^",
		run: ">",
		tool: "*",
	};
	for (const [n, g] of Object.entries(asc)) assert.equal(icon(n as IconName, { NYCODE_ASCII_ICONS: "1" }), g, n);
});

test("iconGap: dois espaços só no kitty (o ícone ocupa o espaço seguinte); um no resto e no ASCII", () => {
	assert.equal(iconGap({ TERM: "xterm-kitty" }), "  ");
	assert.equal(iconGap({ KITTY_WINDOW_ID: "3", TERM: "tmux-256color" }), "  ");
	assert.equal(iconGap({ NYCODE_NERD_FONT: "1", TERM: "xterm-256color" }), " ");
	assert.equal(iconGap({ TERM: "xterm-256color" }), " ");
	assert.equal(iconGap({ TERM: "xterm-kitty", NYCODE_ASCII_ICONS: "1" }), " ");
});

test("hooks: bandeira e setas viram Nerd Font no kitty, como os ícones das tools", () => {
	const k = { TERM: "xterm-kitty" };
	assert.equal(icon("hook", k), "\uf024");
	assert.equal(icon("swap", k), "\u{f06a9}");
	assert.equal(icon("hook", {}), "⚑");
	assert.equal(icon("swap", {}), "⇄");
});

test("sem env usa process.env", () => {
	assert.equal(typeof icon("bash"), "string");
	assert.equal(typeof nerdFont(), "boolean");
});

// Vocabulário global de estado: ● ciano = executando, ▲ amarelo = atenção, ✓ verde = feito, ✕ vermelho = erro;
// o fundo acompanha o estado.
test("estado: glifo + cor + fundo por estado; ✕ (não ✗) no Unicode; ▲ no aviso", async () => {
	const { estadoGlyph, estadoBg, warnBgRgb } = __r1;
	assert.equal(icon("err", {}), "✕");
	assert.equal(icon("warn", {}), "▲");
	assert.equal(icon("warn", { NYCODE_ASCII_ICONS: "1" }), "!");
	const fg = (c: string, s: string) => `<${c}>${s}</c>`;
	const bgs: Record<string, string> = { customMessageBg: "\x1b[48;2;44;44;46m" };
	const t = {
		fg,
		bg: (c: string, s: string) => `[${c}]${s}`,
		getBgAnsi: (c: string) => bgs[c],
		getFgAnsi: () => "\x1b[38;2;255;214;10m",
	};
	assert.equal(estadoGlyph("run", t, {}), "<syntaxType>●</c>");
	assert.equal(estadoGlyph("warn", t, {}), "<warning>▲</c>");
	assert.equal(estadoGlyph("ok", t, {}), "<success>✓</c>");
	assert.equal(estadoGlyph("err", t, {}), "<error>✕</c>");
	assert.equal(estadoBg("run", t)("x"), "[toolPendingBg]x");
	assert.equal(estadoBg("ok", t)("x"), "[toolSuccessBg]x");
	assert.equal(estadoBg("err", t)("x"), "[toolErrorBg]x");
	// aviso: não há token de tema; é o amarelo do tema diluído sobre o fundo neutro (antes era a média sucesso/erro, que puxava para o vermelho)
	const w = warnBgRgb([44, 44, 46], [255, 214, 10]);
	assert.ok(w[0]! > 44 && w[2]! < 46 && w[0]! >= w[1]! && w[1]! > w[2]!, `amarelado: ${w}`); // brilho preservado: o verde pode ficar igual ao do fundo
	assert.equal(estadoBg("warn", t)("x"), `\x1b[48;2;${w.join(";")}mx\x1b[49m`);
	// tema sem truecolor (256 cores): cai no fundo neutro, sem quebrar
	assert.equal(
		estadoBg("warn", { fg, bg: t.bg, getBgAnsi: () => "\x1b[48;5;22m", getFgAnsi: () => "\x1b[38;5;3m" })("x"),
		"[customMessageBg]x",
	);
	assert.equal(estadoBg("warn", { fg })("x"), "x");
	// o Theme do nycode é uma classe: bg/fg dependem do `this` (chamar solto derrubava o render)
	class Real {
		p = "#";
		fg(c: string, x: string) {
			return `${this.p}${c}:${x}`;
		}
		bg(c: string, x: string) {
			return `${this.p}[${c}]${x}`;
		}
	}
	for (const e of ["run", "ok", "err", "warn"] as const) assert.ok(estadoBg(e, new Real())("x").startsWith("#["), e);
	assert.equal(estadoGlyph("ok", new Real(), {}), "#success:✓");
});

// Setinha ❯ nas mensagens que o usuário enviou (só exibição, via transformador de Markdown).
test("marcaUsuario: ❯ em destaque antes do texto; bloco Markdown no início leva a marca em linha própria; vazio fica vazio", async () => {
	const { marcaUsuario } = __r2;
	const fg = (c: string, t: string) => `<${c}>${t}</>`;
	assert.equal(
		marcaUsuario("rode com o claude-3\nsegunda linha", fg),
		"<accent>❯</> rode com o claude-3\nsegunda linha",
	);
	for (const bloco of ["# título", "- item", "1. item", "```\ncode\n```", "> cita", "| a | b |"])
		assert.equal(marcaUsuario(bloco, fg), `<accent>❯</>\n\n${bloco}`, bloco);
	assert.equal(marcaUsuario("", fg), "");
	assert.equal(marcaUsuario("  \n", fg), "  \n");
	assert.equal(marcaUsuario("oi", fg, { NYCODE_ASCII_ICONS: "1" }), "<accent>></> oi");
});

// A hora do envio à direita, como nos demais sinais. Cabe na 1ª linha: fica nela; não cabe: linha
// própria no fim. Sem hora ou sem largura conhecida nada muda.
test("marcaUsuario: hora do envio sempre à direita da 1ª linha; texto longo quebra antes dela", async () => {
	const { marcaUsuario } = __r3;
	const fg = (_c: string, t: string) => t;
	assert.equal(
		marcaUsuario("terminamos?\nsegunda", fg, {}, "16:20", 30),
		`❯ terminamos?${" ".repeat(12)}16:20\nsegunda`,
	);
	// Não cabe: a 1ª linha é quebrada (na palavra; sem espaço, no corte) para a hora ficar em cima, como nos demais blocos
	// (antes a hora ia para uma linha própria no fim).
	assert.equal(marcaUsuario("x".repeat(26), fg, {}, "16:20", 30), `❯ ${"x".repeat(21)}  16:20\n${"x".repeat(5)}`);
	assert.equal(
		marcaUsuario("um dois tres quatro cinco seis sete\nfim", fg, {}, "16:20", 30),
		`❯ um dois tres quatro${" ".repeat(4)}16:20\ncinco seis sete\nfim`,
	);
	assert.equal(marcaUsuario("# t", fg, {}, "16:20", 30), `❯${" ".repeat(24)}16:20\n\n# t`);
	assert.equal(marcaUsuario("oi", fg, {}, "", 30), "❯ oi");
	assert.equal(marcaUsuario("oi", fg, {}, "16:20"), "❯ oi");
});

// O texto da mensagem não entra na coluna da hora. Todas as linhas quebram antes dela (largura − hora − 2),
// não só a 1ª; blocos de código ficam como estão. Antes a 2ª linha em diante usava a largura toda.
test("marcaUsuario: todas as linhas quebram antes da coluna da hora; cerca de código intacta", async () => {
	const { marcaUsuario } = __r4;
	const fg = (_c: string, t: string) => t;
	const r = marcaUsuario("um dois tres quatro cinco seis sete oito nove dez onze doze", fg, {}, "16:20", 30);
	assert.deepEqual(r.split("\n"), [`❯ um dois tres quatro    16:20`, "cinco seis sete oito", "nove dez onze doze"]);
	assert.ok(
		r
			.split("\n")
			.slice(1)
			.every((l) => l.length <= 23),
		"nenhuma passa de 30 − 5 − 2",
	);
	assert.deepEqual(marcaUsuario("oi\numa linha bem comprida que passaria da hora", fg, {}, "16:20", 30).split("\n"), [
		`❯ oi${" ".repeat(21)}16:20`,
		"uma linha bem comprida",
		"que passaria da hora",
	]);
	const cerca = `\`\`\`\n${"x".repeat(40)}\n\`\`\``;
	assert.equal(marcaUsuario(`oi\n${cerca}`, fg, {}, "16:20", 30), `❯ oi${" ".repeat(21)}16:20\n${cerca}`);
	assert.deepEqual(
		marcaUsuario(`oi\n${"y".repeat(30)}`, fg, {}, "16:20", 30)
			.split("\n")
			.slice(1),
		["y".repeat(23), "y".repeat(7)],
		"palavra sem espaço: corta",
	);
});
