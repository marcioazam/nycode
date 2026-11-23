// Ports the active local extension test folha/info (node:test) to vitest.
import assert from "node:assert/strict";
import { test } from "vitest";
import * as m from "../../../../src/extensions/folha/info.ts";
import type { SheetModel } from "../../../../src/extensions/folha/sheet.ts";

const parse = (message: string, home: string): SheetModel => {
	const r = m.parseInfo(message, home);
	assert.ok(r);
	return r;
};
const HOME = "/home/u";
const tick = () => new Promise((r) => setImmediate(r));
const bar = (n: number) => "━".repeat(n) + "─".repeat(30 - n);

// Fixtures: saída literal das funções do nycode.
// context-usage.ts:19 formatContextUsage
const CONTEXT = "Context usage\n  Used:   4,800 tokens (15.0%)\n  Window: 32,000 tokens\n  Free:   27,200 tokens";
// memory.ts:579-587 showMemoryLocations
const MEMORY = [
	"Memory",
	"  Auto memory: on",
	"  Store:       /home/u/.claude/projects/p/memory",
	"  Index:       /home/u/.claude/projects/p/memory/MEMORY.md",
	"  User memory (CLAUDE.md): /home/u/.claude/CLAUDE.md",
	"  Project memory (CLAUDE.md): /srv/app/CLAUDE.md",
	"  Project memory (CLAUDE.local.md): /srv/app/CLAUDE.local.md",
	"  Project memory (alternate): /srv/app/.claude/CLAUDE.md",
	"Edit one with /memory edit. Toggle with /memory on or /memory off.",
].join("\n");
// subagent/registry-text.ts:151 agentsListText
const AGENTS =
	"builtin:\n  Explore - /opt/nycode/agents/Explore.md\nuser:\n  swarm-worker - /home/u/.claude/agents/swarm-worker.md\n  gate-runner - /home/u/.claude/agents/gate-runner.md\nproject:\n  local - /srv/app/.claude/agents/local.md\n\nAdd agents as markdown files under ~/.nycode/agent/agents (user) or .nycode/agents (project).";
// hooks/config.ts:351 formatHooksSummary
const HOOKS =
	"PreToolUse:\n  [Bash] command: guard.py (/home/u/.claude/settings.json)\n  [.*] command: log.sh\nStop:\n  [*] http: https://x.test/h";

test("contexto", () => {
	assert.deepEqual(parse(CONTEXT, HOME), {
		title: "Contexto",
		footer: "esc fechar",
		lines: [
			{ kind: "text", text: `${bar(5)} 15,0%` },
			{ kind: "row", left: "Usado", right: "4.800 tokens" },
			{ kind: "row", left: "Janela", right: "32.000 tokens" },
			{ kind: "row", left: "Livre", right: "27.200 tokens" },
		],
	});
});

test("memória", () => {
	const r = parse(MEMORY, HOME);
	assert.equal(r.title, "Memória");
	assert.equal(r.right, "● automática ligada");
	assert.deepEqual(r.lines[0], { kind: "row", left: "MEMORY.md", right: "~/.claude/projects/p/memory" });
	assert.deepEqual(r.lines[1], { kind: "row", left: "CLAUDE.md", right: "~/.claude" });
	assert.deepEqual(r.lines[4], { kind: "row", left: "CLAUDE.md", right: "/srv/app/.claude" });
	assert.equal(r.lines.length, 5);
	assert.equal(parse(MEMORY.replace("on", "off"), HOME).right, "○ automática desligada");
});

test("agentes", () => {
	const r = parse(AGENTS, HOME);
	assert.equal(r.right, "4 disponíveis");
	assert.deepEqual(r.lines, [
		{ kind: "group", text: "Embutidos" },
		{ kind: "row", left: "Explore", right: "/opt/nycode/agents" },
		{ kind: "group", text: "Seus" },
		{ kind: "row", left: "swarm-worker", right: "~/.claude/agents" },
		{ kind: "row", left: "gate-runner", right: "~/.claude/agents" },
		{ kind: "group", text: "Do projeto" },
		{ kind: "row", left: "local", right: "/srv/app/.claude/agents" },
	]);
	assert.equal(
		parse(
			AGENTS.replace(/user:[\s\S]*project:/, "project:").replace(/\n {2}local.*\n/, "\n  local - /x/a.md\n"),
			HOME,
		).right,
		"2 disponíveis",
	);
	assert.equal(parse(`user:\n  a - /h/a.md\n\n${AGENTS.split("\n\n")[1]}`, HOME).right, "1 disponível");
});

test("hooks", () => {
	const r = parse(HOOKS, HOME);
	assert.equal(r.right, "3 ativos");
	assert.deepEqual(r.lines, [
		{ kind: "group", text: "PreToolUse" },
		{ kind: "row", left: "Bash → guard.py", right: "/home/u/.claude/settings.json" },
		{ kind: "row", left: "qualquer ferramenta → log.sh", right: undefined },
		{ kind: "group", text: "Stop" },
		{ kind: "row", left: "qualquer ferramenta → http: https://x.test/h", right: undefined },
	]);
	assert.equal(parse("Stop:\n  [Bash] command: x", HOME).right, "1 ativo");
});

test("rodapé com rolagem acima de 12 linhas", () => {
	const many = `Stop:\n${Array.from({ length: 13 }, (_, i) => `  [Bash] command: c${i}`).join("\n")}`;
	assert.equal(parse(many, HOME).footer, "↑↓ rolar · esc fechar");
});

test("fora do formato → undefined", () => {
	for (const s of [
		"Olá",
		"Context usage is not available yet. It appears once the model has responded (and resets right after a compaction).",
		"Context usage: recalculating the token count (e.g. right after a compaction).",
		"Context usage\n  Used:   x tokens",
		"Memory\n  qualquer coisa",
		"No agents discovered.\nAdd agents as markdown files under ~/.nycode/agent/agents (user) or .nycode/agents (project).",
		'No hooks configured. Add a "hooks" section to ~/.nycode/agent/settings.json or .claude/settings.json.',
		"Nota:\ntexto livre\noutro",
		"Context usage\n  Used:   4,800 tokens\nsobra",
	])
		assert.equal(m.parseInfo(s, HOME), undefined, s);
});

function harness(custom?: (...a: any[]) => any) {
	const orig: any[][] = [];
	const customs: any[][] = [];
	const ui: any = {
		notify: (...a: any[]) => {
			orig.push(a);
		},
		custom: (...a: any[]) => {
			customs.push(a);
			return custom ? custom() : Promise.resolve(undefined);
		},
	};
	m.installNotify(ui, HOME);
	return { ui, orig, customs };
}

test("notify: formato real abre folha em overlay; original não é chamado", async () => {
	const h = harness();
	h.ui.notify(CONTEXT, "info");
	h.ui.notify(HOOKS);
	await tick();
	assert.equal(h.customs.length, 2);
	assert.equal(h.orig.length, 0);
	assert.deepEqual(h.customs[0][1], {
		overlay: true,
		overlayOptions: { anchor: "bottom-center", width: "100%", maxHeight: "70%" },
	});
	const theme = { fg: (_c: string, s: string) => s, bg: (_c: string, s: string) => s, bold: (s: string) => s };
	const sheet = h.customs[0][0]({ requestRender() {} }, theme, null, () => {});
	assert.equal(sheet.render(40)[0].includes("Contexto"), true);
});

test("notify: desconhecido, warning/error e parecido → original", async () => {
	const h = harness();
	h.ui.notify("Olá", "info");
	h.ui.notify(CONTEXT, "warning");
	h.ui.notify(CONTEXT, "error");
	h.ui.notify("Context usage\n  Used:   x tokens", "info");
	await tick();
	assert.equal(h.customs.length, 0);
	assert.equal(h.orig.length, 4);
	assert.deepEqual(h.orig[1], [CONTEXT, "warning"]);
});

test("notify: custom rejeitando ou lançando → original com os mesmos argumentos", async () => {
	const a = harness(() => Promise.reject(new Error("x")));
	a.ui.notify(CONTEXT, "info");
	await tick();
	assert.deepEqual(a.orig, [[CONTEXT, "info"]]);
	const b = harness(() => {
		throw new Error("x");
	});
	b.ui.notify(HOOKS, undefined);
	await tick();
	assert.equal(b.orig.length, 1);
});

test("notify: instalar duas vezes não embrulha duas vezes", () => {
	const h = harness();
	const first = h.ui.notify;
	m.installNotify(h.ui, HOME);
	assert.equal(h.ui.notify, first);
});
