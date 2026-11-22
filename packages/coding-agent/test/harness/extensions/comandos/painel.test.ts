import assert from "node:assert/strict";
import { afterEach, beforeEach, test, vi } from "vitest";
import * as __r1 from "../../../../src/extensions/claude-compat/shortcuts.ts";
import * as __typed_painel from "../../../../src/extensions/comandos/painel.ts";
import { gerente, tema, USUARIO } from "./base.ts";

// The rendering reads TERM: pin it so the suite does not depend on the shell it runs in.
beforeEach(() => {
	vi.stubEnv("TERM", "xterm-256color");
});
afterEach(() => {
	vi.unstubAllEnvs();
});

// The source tests exercise the modules with partial fakes, without types.
const __c_painel: any = __typed_painel;

delete process.env.NYCODE_ASCII_ICONS; // os símbolos de tecla só valem fora do modo ASCII
process.env.TERM = "xterm-256color";
const m = __c_painel;
const compat = __r1;
const w = (s: string) => [...s.replace(/\x1b\[[0-9;]*m/g, "").replace(/\[|\]/g, "")].length;

test("teclas EFETIVAS do KeybindingsManager (overrides do usuário), não as padrão", async () => {
	const kb = await gerente(USUARIO);
	const g = m.painelGrupos(kb);
	assert.deepEqual(
		g.map((x: any) => x.titulo),
		["Essenciais", "Ver", "Sessão"],
	);
	const flat = Object.fromEntries(g.flatMap((x: any) => x.itens.map((i: any) => [i.rotulo, i.tecla])));
	assert.equal(flat["Trocar modelo"], "Alt+P");
	assert.equal(flat.Raciocínio, "Alt+T");
	assert.equal(flat.Enfileirar, "Ctrl+Q");
	assert.equal(flat["Editar fila"], "Shift+←");
	assert.equal(flat["Excluir da fila"], "Shift+Backspace");
	assert.equal(flat.Enviar, "Enter");
	assert.equal(flat["Nova linha"], "Shift+Enter");
	assert.equal(flat.Histórico, "Ctrl+R");
	assert.equal(flat.Plano, "Ctrl+Shift+P");
	const padrao = m.painelGrupos(await gerente());
	assert.equal(
		Object.fromEntries(padrao.flatMap((x: any) => x.itens.map((i: any) => [i.rotulo, i.tecla])))["Trocar modelo"],
		"Ctrl+L",
	);
});

test("largura: 3 colunas ≥60, 1 coluna <60; régua com título, rodapé /atalhos mostra todos e deixa mudar", async () => {
	const kb = await gerente(USUARIO);
	const feitos: any[] = [];
	const pn = new m.Painel(tema, m.painelGrupos(kb), (v?: string) => feitos.push(v));
	const largo = pn.render(90);
	const estreito = pn.render(50);
	assert.ok(
		largo.every((l: string) => w(l) <= 90),
		"largo",
	);
	assert.ok(
		estreito.every((l: string) => w(l) <= 50),
		"estreito",
	);
	assert.ok(largo.length < estreito.length);
	assert.match(largo[0], /^── Atalhos/);
	assert.ok(largo.some((l: string) => /Essenciais.*Ver.*Sessão/.test(l)));
	assert.ok(!estreito.some((l: string) => /Essenciais.*Ver/.test(l)));
	for (const r of [largo, estreito]) assert.match(r.at(-2), /\/atalhos mostra todos e deixa mudar/);
});

test("Esc, q e ctrl+c fecham; setas rolam e o resto não fecha", async () => {
	const kb = await gerente(USUARIO);
	const run = (d: string) => {
		const f: any[] = [];
		new m.Painel(tema, m.painelGrupos(kb), (v?: string) => f.push(v)).handleInput(d);
		return f;
	};
	assert.deepEqual(run("\x1b"), [undefined]);
	assert.deepEqual(run("q"), [undefined]);
	assert.deepEqual(run("\x03"), [undefined]);
	assert.deepEqual(run("\x1b[A"), []);
	assert.deepEqual(run("\r"), []);
	assert.deepEqual(run("a"), []);
	assert.deepEqual(run("?"), []);
});

test("abrirPainel: devolve o caractere ao editor; sem UI não abre", async () => {
	const ins: string[] = [];
	const ctx = { hasUI: true, ui: { custom: async () => "x" } };
	await m.abrirPainel(ctx, (s: string) => ins.push(s));
	assert.deepEqual(ins, ["x"]);
	let abriu = 0;
	await m.abrirPainel({ hasUI: false, ui: { custom: () => abriu++ } }, () => {});
	assert.equal(abriu, 0);
});

const mapa = (g: any[]) => Object.fromEntries(g.flatMap((x) => x.itens.map((i: any) => [i.rotulo, i.tecla])));
const teclas = (g: any[]) => g.flatMap((x) => x.itens.map((i: any) => i.tecla));

test("atalho condicionado do harness só aparece quando o nycode não tem a tecla; nenhuma tecla repetida", async () => {
	const com = m.painelGrupos(await gerente({ ...compat.CLAUDE_KEYBINDINGS }));
	assert.deepEqual(
		[mapa(com)["Trocar modelo"], mapa(com).Raciocínio, mapa(com).Redesenhar, mapa(com).Tarefas],
		["Alt+P", "Alt+T", "Ctrl+L", "Ctrl+T"],
	);
	const sem = m.painelGrupos(await gerente({}));
	assert.deepEqual([mapa(sem)["Trocar modelo"], mapa(sem).Raciocínio], ["Ctrl+L", "Ctrl+T"]);
	assert.equal("Redesenhar" in mapa(sem), false);
	assert.equal("Tarefas" in mapa(sem), false);
	for (const g of [com, sem, m.painelGrupos(await gerente(USUARIO))])
		assert.equal(new Set(teclas(g)).size, teclas(g).length);
});

test("rotuloTecla: símbolos ⌃ ⌥ ⇧ ⏎, esc por extenso; ASCII sem símbolos", () => {
	assert.equal(m.rotuloTecla("Ctrl+O", false), "⌃O");
	assert.equal(m.rotuloTecla("Alt+P", false), "⌥P");
	assert.equal(m.rotuloTecla("Ctrl+Shift+P", false), "⌃⇧P");
	assert.equal(m.rotuloTecla("Shift+Enter", false), "⇧⏎");
	assert.equal(m.rotuloTecla("Enter", false), "⏎");
	assert.equal(m.rotuloTecla("Esc", false), "esc");
	assert.equal(m.rotuloTecla("Shift+←", false), "⇧←");
	assert.equal(m.rotuloTecla("Ctrl+O", true), "ctrl+o");
	assert.equal(m.rotuloTecla("Shift+Enter", true), "shift+enter");
	assert.equal(m.rotuloTecla("Esc", true), "esc");
	assert.equal(m.rotuloTecla("Shift+←", true), "shift+left");
});

test("cápsulas: tecla antes da ação, mesma largura na coluna, 2 espaços até a ação e 3 entre colunas", async () => {
	const kb = await gerente(USUARIO);
	const pn = new m.Painel(tema, m.painelGrupos(kb), () => {});
	const largo = pn.render(100);
	const enviar = largo.find((l: string) => l.includes("Enviar"))!;
	assert.match(enviar, /^ \[ ⏎ +\] {2}Enviar/); // cápsula com a tecla à frente
	const caps = largo
		.slice(2, -2)
		.map((l: string) => /^ (\[[^\]]+\])/.exec(l)?.[1])
		.filter(Boolean);
	assert.ok(caps.length > 1);
	assert.equal(new Set(caps.map((c: string) => [...c].length)).size, 1); // largura, não o texto da tecla
	assert.match(largo.find((l: string) => l.includes("Expandir tools"))!, /\] {2}Expandir tools +\[[^\]]+\] {2}/);
	const colunas = largo[1].match(/Essenciais( +)Ver( +)Sessão/);
	assert.ok(colunas);
	const estreito = pn.render(50);
	assert.ok(estreito.some((l: string) => /^ \[ ⏎ +\] {2}Enviar/.test(l)));
});
