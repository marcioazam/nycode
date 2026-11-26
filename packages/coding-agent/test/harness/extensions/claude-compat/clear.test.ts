// node --experimental-strip-types --test ~/.nycode/agent/extensions/claude-compat/test/clear.test.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "vitest";
import { ALIASES } from "../../../../src/extensions/claude-compat/aliases.ts";
import compat, { clearSession, helpAll, helpText, skillsText } from "../../../../src/extensions/claude-compat/index.ts";
import { COMMANDS, renderMatrix } from "../../../../src/extensions/claude-compat/matrix.ts";

function setup(opts: { idle?: boolean; cancelled?: boolean; throws?: boolean; name?: string } = {}) {
	const calls: string[] = [];
	const notes: string[] = [];
	let name = opts.name;
	const nycode = {
		getSessionName: () => name,
		setSessionName: (n: string) => {
			calls.push(`name:${n}`);
			name = n || undefined;
		},
	};
	const ctx: any = {
		isIdle: () => opts.idle ?? true,
		ui: { notify: (m: string) => notes.push(m) },
		newSession: async (o?: unknown) => {
			calls.push(`newSession:${o === undefined ? "" : "opts"}`);
			if (opts.throws) throw new Error("boom");
			return { cancelled: opts.cancelled ?? false };
		},
	};
	return { nycode, ctx, calls, notes, name: () => name };
}

test("/clear: sessão nova sem opções, sem nome, sem mensagem ao modelo", async () => {
	const s = setup();
	assert.equal(await clearSession(s.nycode, "", s.ctx), "cleared");
	assert.deepEqual(s.calls, ["newSession:"]);
	assert.deepEqual(s.notes, []);
});

test("/clear <nome>: rotula a sessão anterior antes de trocar", async () => {
	const s = setup();
	assert.equal(await clearSession(s.nycode, "  api-work ", s.ctx), "cleared");
	assert.deepEqual(s.calls, ["name:api-work", "newSession:"]);
});

test("cancelamento por hook preserva a sessão e o nome anterior", async () => {
	const s = setup({ cancelled: true, name: "antigo" });
	assert.equal(await clearSession(s.nycode, "novo", s.ctx), "cancelled");
	assert.equal(s.name(), "antigo");
	const t = setup({ cancelled: true });
	await clearSession(t.nycode, "novo", t.ctx);
	assert.equal(t.name(), undefined); // sem nome anterior: o rótulo é limpo
	assert.match(t.notes[0]!, /cancelado/);
});

test("cancelamento sem nome não mexe no nome", async () => {
	const s = setup({ cancelled: true, name: "x" });
	await clearSession(s.nycode, "", s.ctx);
	assert.deepEqual(s.calls, ["newSession:"]);
});

test("falha do newSession restaura o nome e avisa", async () => {
	const s = setup({ throws: true, name: "antigo" });
	assert.equal(await clearSession(s.nycode, "novo", s.ctx), "failed");
	assert.equal(s.name(), "antigo");
	assert.match(s.notes[0]!, /boom/);
});

test("agente ocupado: não troca a sessão", async () => {
	const s = setup({ idle: false });
	assert.equal(await clearSession(s.nycode, "x", s.ctx), "busy");
	assert.deepEqual(s.calls, []);
});

const CMDS = [
	{ name: "foo", source: "extension" },
	{ name: "tpl", source: "prompt" },
	{ name: "skill:b", source: "skill", description: "segunda" },
	{ name: "skill:a", source: "skill", description: "primeira" },
];

test("registra clear, reset, help, skills, compat e os comandos locais; nunca fork, share, bug, import, export", async () => {
	const reg: Record<string, any> = {};
	const nycode = {
		registerCommand: (n: string, o: unknown) => {
			reg[n] = o;
		},
		registerTool: () => {},
		registerShortcut: () => {},
		appendEntry: () => {},
		on: () => () => {},
		events: { on: () => () => {}, emit: () => {} },
		getSessionName: () => undefined,
		setSessionName: () => {},
		getCommands: () => CMDS,
	};
	compat(nycode as any);
	const local = [
		"add-dir",
		"advisor",
		"allowed-tools",
		"autocompact",
		"checkup",
		"clone-as",
		"config-set",
		"copy-pick",
		"effort",
		"theme-set",
		"tui-set",
		"deep-research",
		"doctor",
		"heapdump",
		"insights",
		"list-agents",
		"loop",
		"peers",
		"permissions",
		"plugin",
		"plugins",
		"recap",
		"scroll-speed",
		"security-review",
		"simplify",
		"skill-doctor",
		"stop",
	];
	assert.deepEqual(
		Object.keys(reg).sort(),
		[
			...local,
			"compat",
			"clear",
			"help",
			"reset",
			"skills",
			"mobile",
			"ios",
			"android",
			"stickers",
			"upgrade",
			"restart",
			"update",
			"terminal-setup",
			"focus",
			"color",
			"transcript",
			"cd",
			// background, bg come with the later claude-compat parts.
		].sort(),
	);
	for (const n of ["fork", "share", "bug", "import", "export"]) assert.equal(n in reg, false, n);
	const s = setup();
	await reg.reset.handler("", s.ctx);
	assert.deepEqual(s.calls, ["newSession:"]);
	await reg["compat"].handler("", s.ctx);
	assert.match(s.notes[0]!, /\/fork do nycode ≠/);
	await reg.help.handler("", s.ctx);
	assert.match(s.notes[1]!, /\/foo \/tpl/);
	assert.ok(!s.notes[1]!.includes("/skill:a"));
	await reg.skills.handler("", s.ctx);
	assert.match(s.notes[2]!, /skill:a — primeira[\s\S]*skill:b — segunda/);
});

test("helpAll lista comandos carregados e aponta /hotkeys; skillsText sem skills avisa", () => {
	const t = helpAll({ getCommands: () => CMDS } as any);
	assert.match(t, /\/hotkeys/);
	assert.match(t, /\? abre o painel de atalhos e \/atalhos mostra todos/);
	assert.match(helpText(), /\? abre o painel de atalhos e \/atalhos lista/);
	assert.match(t, /Comandos carregados[^\n]*\/foo \/tpl/);
	assert.equal(skillsText({ getCommands: () => [] } as any), "Nenhuma skill carregada.");
});

test("helpText cita aliases e a matriz", () => {
	const t = helpText();
	for (const a of Object.keys(ALIASES)) assert.ok(t.includes(`/${a} →`), a);
	assert.ok(t.includes(`${COMMANDS.length} comandos`));
});

const ROSTER =
	`add-dir advisor agents artifact-capabilities artifact-diagramming artifacts auto-mode-setup autocompact autofix-pr background batch branch btw bug cd chrome claude-api claude-in-chrome clear code-review color compact config context copy cost dataviz debug deep-research design design-login design-sync desktop diff doctor effort exit export fast feedback fewer-permission-prompts focus fork goal heapdump help hooks ide import init insights install-github-app install-slack-app keybindings list-agents login logout loop mcp memory mobile model output-style passes permissions plan plugin plugin-authoring powerup pr-comments privacy-settings radio rate-limit-options recap release-notes reload-plugins reload-skills remote-control remote-env rename restart resume rewind run run-skill-generator sandbox schedule scroll-speed security-review setup-bedrock setup-vertex simplify skill-doctor skills slides stats status statusline stickers stop subtask tasks team-onboarding teleport terminal-setup theme tui ultraplan ultrareview update-config upgrade usage-credits verify vim voice web-setup workflow-authoring workflows`.split(
		" ",
	);

test("a matriz cobre todo o roster, sem duplicatas, com status válido", () => {
	const names = new Set(COMMANDS.flatMap((c) => [c.name, ...c.aliases]));
	for (const n of ROSTER) assert.ok(names.has(n), n);
	assert.equal(new Set(COMMANDS.map((c) => c.name)).size, COMMANDS.length);
	for (const c of COMMANDS)
		assert.ok(["exact", "alias", "partial", "unsupported", "removed"].includes(c.status), c.name);
});

test("todo alias reescrito consta na matriz (alias, exact ou partial) e /clear como exact", () => {
	const byName = new Map(COMMANDS.flatMap((c) => [[c.name, c] as const, ...c.aliases.map((a) => [a, c] as const)]));
	for (const a of Object.keys(ALIASES)) assert.ok(["alias", "exact", "partial"].includes(byName.get(a)!.status), a);
	for (const n of ["clear", "reset", "new"]) assert.equal(byName.get(n)!.name, "clear");
});

test("as divergências de semântica estão avisadas na matriz", () => {
	const nycode = (n: string) => COMMANDS.find((c) => c.name === n)!.nycode;
	assert.match(nycode("fork"), /BACKGROUND/);
	assert.match(nycode("bug"), /NÃO/);
	assert.match(nycode("import"), /JSONL/);
	// Contrato superado (docs/specs/claude-code-parity/work.md, integração final): /permissions tem modos locais reais, mas segue partial (sem gate; auto = acceptEdits desde bypass-orthogonal.md).
	assert.equal(COMMANDS.find((c) => c.name === "permissions")!.status, "partial");
});

test("docs/claude-code-compat.md contém a matriz gerada", () => {
	const doc = readFileSync(new URL("../../../../../../docs/claude-code-compat.md", import.meta.url), "utf8");
	assert.ok(doc.includes(renderMatrix()), 'regere a seção "Matriz completa" com renderMatrix()');
});
