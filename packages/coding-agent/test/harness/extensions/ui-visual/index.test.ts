// node --experimental-strip-types --test ~/.nycode/agent/extensions/ui-visual/test/index.test.ts
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { visibleWidth } from "@nycode/tui";
import { afterEach, beforeEach, test, vi } from "vitest";
import * as __m1 from "../../../../src/extensions/ui-visual/index.ts";
import * as __m3 from "../../../../src/extensions/ui-visual/index.ts";
import * as __m4 from "../../../../src/extensions/ui-visual/index.ts";
import * as __m5 from "../../../../src/extensions/ui-visual/index.ts";
import * as __m2 from "../../../../src/extensions/ui-visual/motion/marcas.ts";

// The animations read TERM: pin it so the suite does not depend on the shell it runs in.
beforeEach(() => {
	vi.stubEnv("TERM", "xterm-256color");
});
afterEach(() => {
	vi.unstubAllEnvs();
});

const tmp = mkdtempSync(join(tmpdir(), "ui-visual-index-"));
const { default: index } = __m1;

test("index liga indicador, cabeçalho e renderizadores, sem registerTool", () => {
	const saved = process.env.NYCODE_SUBAGENT;
	delete process.env.NYCODE_SUBAGENT;
	const events: string[] = [];
	const calls: string[] = [];
	index({
		on: (name: string) => events.push(name),
		getSettings: () => ({}),
		registerToolRenderer: () => calls.push("registerToolRenderer"),
		registerTool: () => calls.push("registerTool"),
	} as never);
	if (saved !== undefined) process.env.NYCODE_SUBAGENT = saved;
	assert.deepEqual(calls, ["registerToolRenderer"]);
	for (const e of ["session_start", "agent_start", "agent_settled", "tool_execution_start", "tool_execution_end"])
		assert.ok(events.includes(e), e);
});

// A mensagem plan-mode-execute ganha renderer; o ramo da sessão vem do ctx de session_start.
test("index registra o renderer de plan-mode-execute", () => {
	const saved = process.env.NYCODE_SUBAGENT;
	delete process.env.NYCODE_SUBAGENT;
	const tipos: string[] = [];
	index({
		on() {},
		getSettings: () => ({}),
		registerToolRenderer() {},
		registerMessageRenderer: (t: string) => tipos.push(t),
	} as never);
	if (saved !== undefined) process.env.NYCODE_SUBAGENT = saved;
	assert.deepEqual(tipos, ["plan-mode-execute"]);
});

// Setinha nas mensagens enviadas. O índice registra o transformador só para mensagens do usuário.
test("index registra a marca ❯ para mensagens do usuário", async () => {
	const saved = process.env.NYCODE_SUBAGENT;
	delete process.env.NYCODE_SUBAGENT;
	const regs: Array<{ f: (md: string, c?: unknown) => string; o: { messageTypes?: string[] } }> = [];
	const handlers: Record<string, Array<(e: unknown, ctx: unknown) => void>> = {};
	index({
		on: (name: string, h: (e: unknown, ctx: unknown) => void) => {
			handlers[name] ??= [];
			handlers[name].push(h);
		},
		getSettings: () => ({}),
		registerToolRenderer() {},
		registerMarkdownTransformer: (f: (md: string, c?: unknown) => string, o: { messageTypes?: string[] }) =>
			regs.push({ f, o }),
	} as never);
	if (saved !== undefined) process.env.NYCODE_SUBAGENT = saved;
	// Um só transformador: antes eram 2 registros (user, assistant), mas o nycode guarda um por extensão
	// (loader.js: `extension.markdownTransformer = …`) e o 2º apagava o 1º: sem ❯, hora, brilho nem faixa fina.
	assert.equal(regs.length, 1);
	assert.deepEqual(regs[0]!.o, { messageTypes: ["user", "assistant"] });
	const tmpRepo = mkdtempSync(join(tmpdir(), "uiv-ass-"));
	writeFileSync(join(tmpRepo, "a.ts"), "");
	for (const h of handlers.session_start ?? []) h({}, { hasUI: false, cwd: tmpRepo });
	const { ligarCaminhos } = __m2;
	const ass = regs[0]!.f("veja a.ts", { messageType: "assistant" });
	assert.equal(
		ass,
		ligarCaminhos("veja a.ts", tmpRepo, undefined),
		"Onda 10, P13: caminhos e #123 do assistente viram links",
	);
	assert.doesNotMatch(ass, /^[❯>]/, "o assistente não ganha a marca do usuário");
	assert.match(regs[0]!.f("oi"), /^[❯>] oi$/); // sem tema ainda: sem cor
	// hora: da sessão gravada (timestamp ISO) ou, em mensagem ao vivo, a do primeiro desenho (fica estável nos redesenhos)
	const f = regs[0]!.f as unknown as (md: string, c: { availableWidth: number; timestamp?: string }) => string;
	const iso = new Date(2026, 10, 14, 9, 41).toISOString();
	assert.match(f("oi", { availableWidth: 30, timestamp: iso }), /^[❯>] oi +09:41$/);
	const vivo = f("nova", { availableWidth: 30 });
	assert.match(vivo, /^[❯>] nova +\d\d:\d\d$/);
	assert.equal(f("nova", { availableWidth: 30 }), vivo);
});

// Onda 10, P25 (variante "só no envio"): a mensagem recém-enviada chega mais clara e assenta; a da sessão gravada não brilha.
test("P25 brilho no envio: só na mensagem ao vivo, só em texto simples, e acha a mensagem mais nova", async () => {
	const { acharMensagem } = __m3;
	const saved = { a: process.env.NYCODE_SUBAGENT, b: process.env.NO_COLOR, c: process.env.NYCODE_REDUCED_MOTION };
	for (const k of ["NYCODE_SUBAGENT", "NO_COLOR", "NYCODE_REDUCED_MOTION"]) delete process.env[k];
	const regs: Array<(md: string, c?: unknown) => string> = [];
	const on: Record<string, (e: unknown, ctx: unknown) => void> = {};
	index({
		on: (n: string, h: (e: unknown, ctx: unknown) => void) => {
			on[n] = h;
		},
		getSettings: () => ({}),
		registerToolRenderer() {},
		registerMarkdownTransformer: (f: (md: string) => string) => regs.push(f),
	} as never);
	const theme = {
		fg: (_c: string, t: string) => t,
		getFgAnsi: () => "\x1b[38;2;29;29;31m",
		getBgAnsi: () => "\x1b[48;2;224;237;249m",
	};
	on.session_start({}, { hasUI: false, cwd: tmp, ui: { theme } });
	on.session_start({}, { hasUI: true, cwd: tmp, ui: { theme } });
	try {
		const user = regs[0]!;
		assert.match(
			user("enviada agora", { availableWidth: 40 }),
			/\x1b\[38;2;(?!29;29;31m)\d+;\d+;\d+menviada agora\x1b\[38;2;29;29;31m/,
		);
		assert.doesNotMatch(user("da sessão", { availableWidth: 40, timestamp: new Date().toISOString() }), /38;2/);
		assert.doesNotMatch(user("- item ao vivo", { availableWidth: 40 }), /38;2/, "bloco Markdown não brilha");
	} finally {
		for (const [k, v] of [
			["NYCODE_SUBAGENT", saved.a],
			["NO_COLOR", saved.b],
			["NYCODE_REDUCED_MOTION", saved.c],
		] as const)
			if (v === undefined) delete process.env[k];
			else process.env[k] = v;
	}
	const velha = { text: "oi", children: [] };
	const nova = { text: "oi", children: [] };
	assert.equal(acharMensagem({ children: [{ children: [velha, { text: "x" }, nova] }] }, "oi"), nova);
	assert.equal(acharMensagem({ children: [] }, "oi"), undefined);
});

// Monta o índice com todos os session_start e uma árvore de TUI que o widget do compact entrega a tuiAtual().
const montar = (tree: { children: unknown[] }) => {
	const saved = process.env.NYCODE_SUBAGENT;
	delete process.env.NYCODE_SUBAGENT;
	const regs: Array<(md: string, c?: unknown) => string> = [];
	const starts: Array<(e: unknown, ctx: unknown) => void> = [];
	index({
		on: (n: string, h: (e: unknown, ctx: unknown) => void) => {
			if (n === "session_start") starts.push(h);
		},
		getSettings: () => ({}),
		registerToolRenderer() {},
		registerMarkdownTransformer: (f: (md: string) => string) => regs.push(f),
	} as never);
	if (saved !== undefined) process.env.NYCODE_SUBAGENT = saved;
	const theme = { fg: (_c: string, t: string) => t, getFgAnsi: () => "", getBgAnsi: () => "" };
	const ui = new Proxy(
		{ theme, setWidget: (_n: string, f: (t: unknown) => unknown) => f(tree) } as Record<string, unknown>,
		{ get: (o, k) => (k in o ? o[k as string] : () => {}) },
	);
	const ctx = { hasUI: true, cwd: tmp, ui, sessionManager: { getBranch: () => [] } };
	for (const s of starts) s({}, ctx);
	return regs[0] as (md: string, c?: { availableWidth: number; timestamp?: string }) => string;
};
const hora = (s: string) => /(\d\d:\d\d)$/.exec(s)?.[1];

// U12: a 2ª mensagem viva com o mesmo texto é outra mensagem (outro componente): hora e brilho próprios.
test("U12 mensagem viva idêntica a uma anterior recebe a própria hora", async () => {
	const tree = { children: [{ text: "sim", children: [] as unknown[] }] };
	const user = montar(tree);
	const agora = new Date(2026, 10, 19, 10, 0).getTime();
	const mock = vi.spyOn(Date, "now").mockImplementation(() => agora);
	const a = user("sim", { availableWidth: 30 });
	assert.equal(hora(a), "10:00");
	mock.mockImplementation(() => agora + 3 * 3600_000);
	tree.children.push({ text: "sim", children: [] });
	assert.equal(hora(user("sim", { availableWidth: 30 })), "13:00", 'o 2º "sim" não herda a hora do 1º');
});

test("U12 ao passar de 200 mensagens vivas as antigas não reganham a hora de agora (LRU, não clear)", () => {
	const user = montar({ children: [] });
	const t0 = new Date(2026, 10, 19, 8, 0).getTime();
	const mock = vi.spyOn(Date, "now").mockImplementation(() => t0);
	const primeira = user("msg-0", { availableWidth: 30 });
	mock.mockImplementation(() => t0 + 5 * 3600_000);
	for (let i = 1; i <= 250; i++) {
		user(`msg-${i}`, { availableWidth: 30 });
		user("msg-0", { availableWidth: 30 }); // a antiga continua em uso: não pode ser a despejada
	}
	assert.equal(user("msg-0", { availableWidth: 30 }), primeira);
	assert.equal(hora(primeira), "08:00");
});

// U13: formatador de hora único.
test("U13 a hora usa um Intl.DateTimeFormat compartilhado, não toLocaleTimeString por render", () => {
	const user = montar({ children: [] });
	const spy = vi.spyOn(Date.prototype, "toLocaleTimeString");
	for (let i = 0; i < 20; i++)
		user("oi", { availableWidth: 30, timestamp: new Date(2026, 10, 14, 9, 41).toISOString() });
	assert.equal(spy.mock.calls.length, 0);
});

// U16: largura em colunas, não code points.
test("U16 CJK e emoji largos: a hora cabe na 1ª linha e nenhuma linha passa da largura", async () => {
	const user = montar({ children: [] });
	const iso = new Date(2026, 10, 14, 9, 41).toISOString();
	const curta = user("あ".repeat(10), { availableWidth: 30, timestamp: iso });
	assert.equal(visibleWidth(curta), 30, "gap calculado em colunas");
	const longa = user("漢字".repeat(30), { availableWidth: 30, timestamp: iso });
	// O resto do texto é quebrado pelo Markdown; a 1ª linha (a da hora) tem de caber.
	assert.equal(visibleWidth(longa.split("\n")[0]!), 30);
	assert.match(longa.split("\n")[0]!, /09:41$/);
	const emoji = user("😀 ok ".repeat(10), { availableWidth: 30, timestamp: iso });
	assert.equal(visibleWidth(emoji.split("\n")[0]!), 30);
});

// A caixa `[tipo]` das mensagens de extensão perde a linha de fundo em cima e embaixo; só uma vez.
test("afinarCaixa zera o paddingY da caixa padrão após cada rebuild, sem embrulhar duas vezes", async () => {
	const { afinarCaixa } = __m4;
	class Caixa {
		box = { paddingY: 1 };
		rebuild() {
			this.box.paddingY = 1;
			return "ok";
		}
	}
	afinarCaixa(Caixa.prototype);
	const um = Caixa.prototype.rebuild;
	afinarCaixa(Caixa.prototype);
	assert.equal(Caixa.prototype.rebuild, um, "idempotente");
	const c = new Caixa();
	assert.equal(c.rebuild(), "ok");
	assert.equal(c.box.paddingY, 0);
	class Renderer {
		rebuild() {
			return "x";
		}
	}
	afinarCaixa(Renderer.prototype);
	assert.equal(new Renderer().rebuild(), "x", "sem caixa: nada muda");
	afinarCaixa(undefined);
});

// Respiro fino de fundo em cima e embaixo na cor da faixa.
// Depois: antes meia linha ▄/▀ na largura toda; agora 1/8 de linha (▁ em cima, ▔ embaixo) só sob a faixa,
// com a margem sem fundo do chat-margin à esquerda e à direita (antes sobravam quadradinhos nas pontas).
test("acolchoar põe ▁ em cima e ▔ embaixo só na extensão da faixa, sem embrulhar duas vezes", async () => {
	const { acolchoar } = __m5;
	let cor: number[] | undefined = [38, 43, 63];
	const faixa = "\x1b]133;A\x07 \x1b[48;2;38;43;63m ❯ oi \x1b[49m ";
	class Msg {
		render(w: number) {
			return w ? [faixa, "\x1b[48;2;38;43;63m x\x1b[49m"] : [];
		}
	}
	acolchoar(Msg.prototype, () => cor);
	const um = Msg.prototype.render;
	acolchoar(Msg.prototype, () => cor);
	assert.equal(Msg.prototype.render, um, "idempotente");
	const c = "\x1b[38;2;38;43;63m";
	assert.deepEqual(new Msg().render(8), [
		` ${c}▁▁▁▁▁▁\x1b[39m `,
		faixa,
		"\x1b[48;2;38;43;63m x\x1b[49m",
		` ${c}▔▔▔▔▔▔\x1b[39m `,
	]);
	class SemFundo {
		render(w: number) {
			return w ? [" ❯ oi"] : [];
		}
	}
	acolchoar(SemFundo.prototype, () => cor);
	assert.deepEqual(
		new SemFundo().render(4),
		[`${c}▁▁▁▁\x1b[39m`, " ❯ oi", `${c}▔▔▔▔\x1b[39m`],
		"sem fundo na linha: largura toda",
	);
	assert.deepEqual(new Msg().render(0), [], "vazio fica vazio");
	cor = undefined;
	assert.deepEqual(
		new Msg().render(8),
		[faixa, "\x1b[48;2;38;43;63m x\x1b[49m"],
		"sem cor de fundo (tema sem truecolor): como antes",
	);
});
