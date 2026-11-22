// Ports the active local extension test folha/painel (node:test) to vitest.
import assert from "node:assert/strict";
import { test } from "vitest";
import * as m from "../../../../src/extensions/folha/painel.ts";
import type { Line } from "../../../../src/extensions/folha/sheet.ts";

const leftOf = (l: Line | undefined): string | undefined => (l?.kind === "row" ? l.left : undefined);
const base = { bypass: false, project: "demo" };
const lefts = (r: any) => r.lines.map((l: any) => (l.kind === "row" ? l.left.trimEnd() : `# ${l.text}`));
const bar = (n: number) => "━".repeat(n) + "─".repeat(20 - n);

test("modelo completo, números em pt-BR", () => {
	const r = m.painelModel({
		...base,
		model: "Modelo Demo",
		thinking: "medium",
		usage: { tokens: 4800, contextWindow: 32000, percent: 15.2 },
		trusted: true,
	});
	assert.equal(r.title, "Visão geral");
	assert.equal(r.right, "demo");
	assert.deepEqual(lefts(r), [
		"Modelo       Modelo Demo · raciocínio medium",
		`Contexto     ${bar(3)}  4,8k de 32k · 15%`,
		"Permissões   pergunta antes de agir",
		"Confiança    ✓ projeto confiável",
		"# Gerenciar",
		"Memória",
		"MCP",
		"Agentes",
		"Hooks",
		"Ajustes",
	]);
	assert.deepEqual(r.lines[0], { kind: "row", left: leftOf(r.lines[0]), right: "/model", value: "/model" });
	assert.deepEqual(
		r.lines.slice(-5).map((l: any) => l.value),
		["/memory", "/mcp", "/agents", "/hooks", "/settings"],
	);
	assert.equal(r.footer, "↑↓ escolher · ⏎ levar ao campo · esc fechar");
});

test("sem dados: linhas somem; tokens nulos mostram a janela", () => {
	assert.deepEqual(lefts(m.painelModel(base)).slice(0, 2), ["Permissões   pergunta antes de agir", "# Gerenciar"]);
	const r = m.painelModel({ ...base, usage: { tokens: null, contextWindow: 32000, percent: null } });
	assert.equal(leftOf(r.lines[0])?.trimEnd(), "Contexto     janela de 32k");
	assert.equal(m.compact(1500000), "1,5M");
	assert.equal(m.compact(950), "950");
});

test("bypass e projeto não confiável", () => {
	const r = m.painelModel({ ...base, bypass: true, trusted: false });
	assert.deepEqual(lefts(r).slice(0, 2), [
		"Permissões   ▲ bypass ligado: age sem perguntar",
		"Confiança    ▲ projeto não confiável · a configuração dele não carrega",
	]);
});

test("comando: sem UI não faz nada; escolha vai ao campo", async () => {
	let cmd: any;
	m.registerPainel({
		registerCommand: (n: string, o: any) => {
			cmd = { n, ...o };
		},
		getThinkingLevel: () => "high",
	});
	assert.equal(cmd.n, "painel");
	assert.equal(cmd.description, "Visão geral do que está ligado");
	let opened = 0;
	await cmd.handler("", {
		hasUI: false,
		ui: {
			custom: () => {
				opened++;
			},
		},
	});
	assert.equal(opened, 0);
	let text: string | undefined;
	const ctx = {
		hasUI: true,
		cwd: "/srv/app",
		model: { name: "M" },
		isProjectTrusted: () => true,
		getContextUsage: () => {
			throw new Error("sem API");
		},
		ui: {
			custom: async () => "/memory",
			setEditorText: (t: string) => {
				text = t;
			},
		},
	};
	await cmd.handler("", ctx);
	assert.equal(text, "/memory");
});
