// Port of the plan-sota patch test (nycode 1.7.0) to vitest against the embedded source.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, test } from "vitest";
import * as utils from "../../../../src/extensions/plan-mode/utils.ts";
import { fakeCtx, fakeNycode, type Loose } from "../support.ts";

const tmp = mkdtempSync(join(tmpdir(), "plan-sota-test-"));
const plans = join(tmp, "plans");
const outside = join(tmp, "outside");
const savedPlansDir = process.env.NYCODE_PLANS_DIR;
beforeAll(() => {
	mkdirSync(plans);
	mkdirSync(outside);
	process.env.NYCODE_PLANS_DIR = plans;
});
afterAll(() => {
	if (savedPlansDir === undefined) delete process.env.NYCODE_PLANS_DIR;
	else process.env.NYCODE_PLANS_DIR = savedPlansDir;
	rmSync(tmp, { recursive: true });
});
const agent = (name: string, tools?: string[]) => ({
	name,
	description: name,
	tools,
	systemPrompt: "",
	source: "user" as const,
	filePath: "",
});
const policy = (over: Partial<utils.PlanToolPolicy> = {}): utils.PlanToolPolicy => ({
	tools: [],
	userReadOnly: [],
	agents: [],
	...over,
});
const allowed = (tool: string, input: Loose = {}, p: utils.PlanToolPolicy = policy()) =>
	utils.isPlanModeToolAllowed(tool, input, plans, p);

function setup() {
	const fake = fakeNycode({ active: ["read", "bash", "edit", "write", "plan_mode_complete"] });
	const ctx = fakeCtx({
		sessionManager: { getEntries: () => [], getBranch: () => [], getSessionId: () => "abcdef12-3456" },
	});
	return { on: fake.on, cmds: fake.cmds, tools: fake.tools, sent: fake.sent, shortcuts: fake.shortcuts, ctx };
}

test("AC1: ferramentas fixas de leitura passam", () => {
	for (const t of [
		"tool_search",
		"web_fetch",
		"lsp_diagnostics",
		"lsp_hover",
		"lsp_definition",
		"lsp_references",
		"lsp_symbols",
		"todo",
		"read",
		"question",
		"plan_mode_complete",
	])
		assert.equal(allowed(t).ok, true, t);
});

test("AC2: MCP só com readOnlyHint true ou na lista do usuário", () => {
	const tools = [
		{ name: "mcp__docs__search", annotations: { readOnlyHint: true } },
		{ name: "mcp__docs__write", annotations: { readOnlyHint: false } },
		{ name: "mcp__docs__plain" },
		{ name: "mcp__web__fetch" },
		{ name: "mcp__web__post" },
	];
	assert.equal(allowed("mcp__docs__search", {}, policy({ tools })).ok, true);
	for (const name of ["mcp__docs__write", "mcp__docs__plain", "mcp__docs__unknown"]) {
		const verdict = allowed(name, {}, policy({ tools }));
		assert.equal(verdict.ok, false, name);
		assert.match(verdict.reason ?? "", /plan\.readOnlyTools/);
	}
	assert.equal(allowed("mcp__docs__x").ok, false, "empty registry: unknown tool is denied");
	// plan.readOnlyTools globs: `*` is the only wildcard, every other character is literal
	const listed = (pattern: string, name: string) => allowed(name, {}, policy({ userReadOnly: [pattern] })).ok;
	for (const [pattern, name, ok] of [
		["mcp__web__*", "mcp__web__fetch", true],
		["mcp__*__search", "mcp__docs__search", true],
		["mcp__a*b", "mcp__ab", true],
		["mcp__web__fetch", "mcp__web__fetch", true],
		["mcp__x.y", "mcp__xzy", false],
		["mcp__a*a", "mcp__a", false],
		["mcp__*__search", "mcp__docs__searchx", false],
		["mcp__web__*", "mcp__webx__fetch", false],
	] as const)
		assert.equal(listed(pattern, name), ok, `${pattern} vs ${name}`);
	// the user list: an exact name and a glob, each with no annotation
	const user = policy({ tools, userReadOnly: ["mcp__web__fetch", "mcp__docs__*"] });
	assert.equal(allowed("mcp__web__fetch", {}, user).ok, true);
	assert.equal(allowed("mcp__docs__plain", {}, user).ok, true);
	assert.equal(allowed("mcp__docs__write", {}, user).ok, true, "the user's glob wins over readOnlyHint false");
	assert.equal(allowed("mcp__web__post", {}, user).ok, false);
	assert.equal(allowed("mcp__webx__fetch", {}, user).ok, false, "a name is not a prefix match");
});

test("AC3: subagent só com agente cujo tools: é read-only", () => {
	const tools = [
		{ name: "mcp__docs__search", annotations: { readOnlyHint: true } },
		{ name: "mcp__docs__list", annotations: { readOnlyHint: true } },
		{ name: "mcp__docs__write", annotations: { readOnlyHint: false } },
	];
	const agents = [
		agent("reader", ["read", "grep"]),
		agent("finder", ["read", "grep", "find", "ls", "tool_search", "lsp_symbols", "web_fetch"]),
		agent("editor", ["read", "edit"]),
		agent("writer", ["read", "write"]),
		agent("shell", ["read", "grep", "bash"]),
		agent("shell-edit", ["read", "bash", "edit"]),
		agent("spawner", ["read", "subagent"]),
		agent("unrestricted"),
		agent("docs-exact", ["read", "mcp__docs__search"]),
		agent("docs-glob-ro", ["mcp__docs__search", "mcp__docs__list"]),
		agent("docs-glob", ["read", "mcp__docs__*"]),
		agent("empty-glob", ["mcp__nothing__*"]),
	];
	const p = policy({ tools, agents });
	for (const a of ["reader", "finder", "docs-exact", "shell"]) {
		assert.equal(allowed("subagent", { agent: a, task: "x" }, p).ok, true, a);
		assert.equal(allowed("subagent", { tasks: [{ agent: a, task: "x" }] }, p).ok, true, a);
		assert.equal(allowed("subagent", { chain: [{ agent: a, task: "x" }] }, p).ok, true, a);
	}
	for (const a of [
		"editor",
		"writer",
		"shell-edit",
		"spawner",
		"unrestricted",
		"docs-glob",
		"empty-glob",
		"missing",
	]) {
		const verdict = allowed("subagent", { agent: a, task: "x" }, p);
		assert.equal(verdict.ok, false, a);
		assert.ok(verdict.reason?.includes(a), a);
	}
	assert.match(allowed("subagent", { agent: "unrestricted", task: "x" }, p).reason ?? "", /no tools/);
	assert.match(allowed("subagent", { agent: "editor", task: "x" }, p).reason ?? "", /edit/);
	// a server glob counts when the user lists it, or when every registered tool it covers is read-only
	assert.equal(
		allowed("subagent", { agent: "docs-glob", task: "x" }, policy({ tools, agents, userReadOnly: ["mcp__docs__*"] }))
			.ok,
		true,
	);
	const readOnlyDocs = policy({ tools: tools.slice(0, 2), agents: [agent("g", ["mcp__docs__*"])] });
	assert.equal(allowed("subagent", { agent: "g", task: "x" }, readOnlyDocs).ok, true);
	assert.equal(
		allowed(
			"subagent",
			{
				chain: [
					{ agent: "reader", task: "x" },
					{ agent: "writer", task: "y" },
				],
			},
			p,
		).ok,
		false,
	);
	assert.equal(allowed("subagent", { status: true }, p).ok, true);
	assert.equal(allowed("subagent", { cancel: "bg_1" }, p).ok, true);
	assert.equal(allowed("subagent", { resume: "bg_1", task: "x" }, p).ok, false);
	// resume reopens any earlier run (a writer too); a project scope lets a local agent shadow a name
	assert.equal(allowed("subagent", { resume: "bg_1", agent: "reader", task: "x" }, p).ok, false);
	assert.equal(allowed("subagent", { agent: "reader", task: "x", agentScope: "project" }, p).ok, false);
	assert.equal(allowed("subagent", { agent: "reader", task: "x", agentScope: "both" }, p).ok, false);
	assert.equal(allowed("subagent", { agent: "reader", task: "x", agentScope: "user" }, p).ok, true);
});

test("AC3 pelo handler: subagent read-only roda com agentScope user; o com edit é bloqueado", async () => {
	const agentDir = join(tmp, "agent");
	mkdirSync(join(agentDir, "agents"), { recursive: true });
	writeFileSync(
		join(agentDir, "agents", "ro-reader.md"),
		"---\nname: ro-reader\ndescription: reads\ntools: read, grep\n---\nRead.\n",
	);
	writeFileSync(
		join(agentDir, "agents", "rw-editor.md"),
		"---\nname: rw-editor\ndescription: edits\ntools: read, edit\n---\nEdit.\n",
	);
	const savedAgentDir = process.env.NYCODE_CODING_AGENT_DIR;
	process.env.NYCODE_CODING_AGENT_DIR = agentDir;
	try {
		const { on, cmds, ctx } = setup();
		await cmds.plan.handler("", ctx);
		const input: Loose = { agent: "ro-reader", task: "x" };
		assert.equal(await on.tool_call({ toolName: "subagent", input }, ctx), undefined);
		assert.equal(input.agentScope, "user");
		const blocked = await on.tool_call({ toolName: "subagent", input: { agent: "rw-editor", task: "x" } }, ctx);
		assert.equal(blocked?.block, true);
		assert.match(blocked.reason, /rw-editor/);
	} finally {
		if (savedAgentDir === undefined) delete process.env.NYCODE_CODING_AGENT_DIR;
		else process.env.NYCODE_CODING_AGENT_DIR = savedAgentDir;
	}
});

test("subagente de plan mode herda a marca: bash só da allowlist, edit/write bloqueados; fora de plan mode a marca sai", async () => {
	const saved = process.env.NYCODE_PLAN_READONLY;
	try {
		delete process.env.NYCODE_PLAN_READONLY;
		const parent = setup();
		await parent.on.tool_call({ toolName: "read", input: {} }, parent.ctx);
		assert.equal(process.env.NYCODE_PLAN_READONLY, undefined);
		await parent.cmds.plan.handler("", parent.ctx);
		await parent.on.tool_call({ toolName: "subagent", input: { task: "x" } }, parent.ctx);
		assert.equal(process.env.NYCODE_PLAN_READONLY, "1", "the child spawned by this call inherits the marker");
		// the child: a fresh extension that loads with the inherited marker and is not in plan mode itself
		const child = setup();
		assert.equal(
			(await child.on.tool_call({ toolName: "bash", input: { command: "rm -r src" } }, child.ctx))?.block,
			true,
		);
		assert.equal(
			(await child.on.tool_call({ toolName: "bash", input: { command: "printf x > a.ts" } }, child.ctx))?.block,
			true,
		);
		assert.equal(await child.on.tool_call({ toolName: "bash", input: { command: "ls -la" } }, child.ctx), undefined);
		assert.equal((await child.on.tool_call({ toolName: "edit", input: { path: "a.ts" } }, child.ctx))?.block, true);
		assert.equal(await child.on.tool_call({ toolName: "read", input: { path: "a.ts" } }, child.ctx), undefined);
		// leave plan mode (Ctrl+Shift+P; /plan only enters)
		await parent.shortcuts.find((s: Loose) => s.description === "Toggle plan mode").handler(parent.ctx);
		await parent.on.tool_call({ toolName: "subagent", input: { task: "x" } }, parent.ctx);
		assert.equal(process.env.NYCODE_PLAN_READONLY, undefined, "children spawned after plan mode run unrestricted");
	} finally {
		if (saved === undefined) delete process.env.NYCODE_PLAN_READONLY;
		else process.env.NYCODE_PLAN_READONLY = saved;
	}
});

test("MCP pelo handler: readOnlyHint e plan.readOnlyTools liberam; o resto é bloqueado e fica fora do conjunto ativo", async () => {
	const fake = fakeNycode({
		active: ["read", "mcp__docs__search", "mcp__docs__write", "mcp__web__fetch"],
		allTools: [
			"read",
			{ name: "mcp__docs__search", annotations: { readOnlyHint: true } },
			{ name: "mcp__docs__write", annotations: { readOnlyHint: false } },
			{ name: "mcp__web__fetch" },
		],
		readOnlyTools: ["mcp__web__*"],
	});
	const ctx = fakeCtx({
		sessionManager: { getEntries: () => [], getBranch: () => [], getSessionId: () => "abcdef12-3456" },
	});
	await fake.cmds.plan.handler("", ctx);
	assert.deepEqual(fake.active().sort(), ["mcp__docs__search", "mcp__web__fetch", "read"]);
	for (const [name, block] of [
		["mcp__docs__search", false],
		["mcp__web__fetch", false],
		["mcp__docs__write", true],
		["mcp__playwright__click", true],
	] as const)
		assert.equal((await fake.on.tool_call({ toolName: name, input: {} }, ctx))?.block === true, block, name);
});

test("AC4: symlink pendurado no diretório de planos é recusado", () => {
	symlinkSync(join(outside, "nao-existe.md"), join(plans, "pendurado.md"));
	assert.equal(allowed("write", { path: join(plans, "pendurado.md") }).ok, false);
});

test("AC4: write/edit só em .md dentro do diretório de planos", () => {
	writeFileSync(join(plans, "ok.md"), "");
	symlinkSync(outside, join(plans, "link"));
	writeFileSync(join(outside, "x.md"), "");
	symlinkSync(join(outside, "x.md"), join(plans, "lnk.md"));
	for (const tool of ["write", "edit"]) {
		assert.equal(allowed(tool, { path: join(plans, "ok.md") }).ok, true);
		assert.equal(allowed(tool, { path: join(plans, "novo.md") }).ok, true);
		assert.equal(allowed(tool, { path: join(plans, "..", "outside", "x.md") }).ok, false);
		assert.equal(allowed(tool, { path: join(plans, "sub", "..", "..", "x.md") }).ok, false);
		assert.equal(allowed(tool, { path: join(plans, "link", "y.md") }).ok, false);
		assert.equal(allowed(tool, { path: join(plans, "lnk.md") }).ok, false);
		assert.equal(allowed(tool, { path: join(plans, "a.txt") }).ok, false);
		assert.equal(allowed(tool, { path: join(outside, "z.md") }).ok, false);
		assert.equal(allowed(tool, { path: "/etc/x.md" }).ok, false);
		assert.equal(allowed(tool, {}).ok, false);
	}
});

test("AC4 pelo handler tool_call; AC5 contexto; AC6 execução", async () => {
	const { on, cmds, tools, sent, ctx } = setup();
	await cmds.plan.handler("", ctx);
	const date = new Date().toISOString().slice(0, 10);
	const file = join(plans, `${date}-abcdef12.md`);
	const blocked = await on.tool_call({ toolName: "write", input: { path: "/tmp/fora.md", content: "x" } }, ctx);
	assert.equal(blocked?.block, true);
	assert.equal(await on.tool_call({ toolName: "write", input: { path: file, content: "x" } }, ctx), undefined);
	assert.equal((await on.tool_call({ toolName: "mcp__playwright__click", input: {} }, ctx))?.block, true);
	assert.equal(await on.tool_call({ toolName: "tool_search", input: { query: "x" } }, ctx), undefined);
	const text: string = (await on.before_agent_start({}, ctx)).message.content;
	assert.match(text, /\[PLAN MODE ACTIVE\]/);
	assert.ok(text.includes("plan-workflow/SKILL.md"));
	assert.ok(text.includes(file));
	assert.ok(text.includes("Only tracked tasks are numbered"));
	assert.ok(text.length <= 1700, String(text.length));
	await tools.plan_mode_complete.execute("id", {
		plan: "Tier: T0 (teste)\n1. contar a.txt\n- wc -l a.txt\n2. contar b.txt\n- wc -l b.txt",
	});
	await on.agent_end({ messages: [] }, ctx);
	const exec = sent.find((m) => m.customType === "plan-mode-execute");
	assert.match(exec.content, /materialize the plan file/);
	assert.ok(exec.content.includes(file));
	assert.match(exec.content, /literal tag \[DONE:n\]/);
});

test("AC7: o modelo do plano gera exatamente 3 tarefas", () => {
	const tpl = `## Resumo
- Tier: T2
### Fase 1: Base
1. Criar tabela users
   - passo a
   - [ ] check
### Fase 2: API
2. Endpoint POST /users
3. Gate e revisão
## Checklist
- [ ] AC1 coberto
`;
	assert.equal(utils.planToTodos(tpl).length, 3);
});

test("bash: fdfind", () => {
	assert.equal(utils.isSafeCommand("fdfind foo"), true);
	assert.equal(utils.isSafeCommand("fdfind -x rm"), false);
	assert.equal(utils.isSafeCommand("fdfind --exec-batch rm"), false);
	assert.equal(utils.isSafeCommand("python3 ~/.nycode/agent/skills/obsidian-cli/scripts/kb.py search x"), false);
	assert.equal(utils.isSafeCommand("python3 evil.py"), false);
});

const T2 = `## Resumo
- Tier: T2 (sinais: 3 módulos)
## Decisões e suposições
- A1 (~92%, base: convenção em src/x): usar SQLite
## Aceitação
- AC1: WHEN a task is posted THE SYSTEM SHALL persist it
- AC2: IF the disk is full THEN THE SYSTEM SHALL return 507
## Riscos e rollback
- Rollback: reverter o commit
### Fase 1: Base
1. Criar store SQLite
   - AC: AC1, AC2
   - check: \`python -m unittest\`
2. Gate e revisão
   - rodar o gate do repositório
`;
const lint = (p: string): string[] => utils.lintPlan(p);

test("lintPlan: planos válidos", () => {
	assert.deepEqual(lint("Tier: T0 (typo)\n1. corrigir typo\n- trocar a palavra"), []);
	assert.deepEqual(lint(T2), []);
});

test("lintPlan: R1 e R2", () => {
	assert.deepEqual(lint("1. tarefa um\n- passo um\n2. tarefa dois\n- passo dois"), [
		'missing "Tier: Tn (signals)" line',
	]);
	assert.deepEqual(lint("texto"), ['missing "Tier: Tn (signals)" line', "no numbered tasks"]);
});

test("lintPlan: R4 e R6 em T1 sem AC", () => {
	assert.deepEqual(lint("Tier: T1 (x)\n1. fazer algo\n- passo simples"), [
		"no EARS acceptance criterion (AC1: WHEN … THE SYSTEM SHALL …)",
		"no check command in any task",
	]);
});

test("lintPlan: R5 AC não referenciado", () => {
	const p = "Tier: T1 (x)\n- AC1: WHEN a THE SYSTEM SHALL b\n1. fazer algo\n   - check: x";
	assert.deepEqual(lint(p), ["AC1 is not covered by any task"]);
	assert.deepEqual(lint(`${p} AC1`), []);
});

test("lintPlan: R3 confiança", () => {
	assert.deepEqual(lint("Tier: T0 (x)\n- A1: algo\n1. tarefa um\n- passo um"), ["assumption A1 has no confidence %"]);
	assert.deepEqual(lint("Tier: T0 (x)\n- A1 (~92%, base x): algo\n1. tarefa um\n- passo um"), []);
});

test("lintPlan: R7 e R8", () => {
	assert.deepEqual(lint(T2.replace("## Riscos e rollback\n- Rollback: reverter o commit\n", "")), [
		"no risks/rollback section",
	]);
	const t3 = T2.replace("Tier: T2", "Tier: T3")
		.replace("Rollback: reverter o commit", "Risco: perda de dados")
		.replace("## Riscos e rollback", "## Riscos");
	assert.deepEqual(lint(t3), ["T3 plan without rollback"]);
});

test("lintPlan: EARS em português", () => {
	const p = "Tier: T1 (x)\n- AC1: QUANDO a tarefa chega O SISTEMA DEVE gravar\n1. fazer algo AC1\n   - check: x";
	assert.deepEqual(lint(p), []);
});

test("lintPlan: linha de 200 000 caracteres é rápida", () => {
	const t = Date.now();
	lint(`Tier: T1 (x)\n- AC1: ${"WHEN ".repeat(40000)}\n1. ${"a ".repeat(100000)}`);
	lint(`- A1 ${"(~".repeat(100000)}`);
	assert.ok(Date.now() - t < 500);
});

test("plan_mode_complete: rejeita duas vezes e aceita na terceira", async () => {
	const { tools, cmds, ctx } = setup();
	await cmds.plan.handler("", ctx);
	for (let i = 0; i < 2; i++) {
		const r = await tools.plan_mode_complete.execute("id", { plan: "1. tarefa um\n- passo um" });
		assert.match(r.content[0].text, /^Plan not accepted/);
		assert.equal(r.terminate, undefined);
	}
	const r = await tools.plan_mode_complete.execute("id", { plan: "1. tarefa um\n- passo um" });
	assert.equal(r.terminate, true);
	assert.match(r.content[0].text, /Unresolved lint: missing "Tier/);
});

test("plan_mode_complete: plano válido é aceito e salvo; contador zera", async () => {
	const { tools, cmds, ctx } = setup();
	await cmds.plan.handler("", ctx);
	const file = join(plans, `${new Date().toISOString().slice(0, 10)}-abcdef12.md`);
	const r = await tools.plan_mode_complete.execute("id", { plan: T2 });
	assert.equal(r.terminate, true);
	assert.equal(readFileSync(file, "utf8"), T2);
	assert.ok(r.content[0].text.startsWith(`Plan submitted and saved to ${file}.`));
	assert.ok(!r.content[0].text.includes("Unresolved"));
	const r2 = await tools.plan_mode_complete.execute("id", { plan: "1. tarefa um\n- passo um" });
	assert.match(r2.content[0].text, /^Plan not accepted/);
});

test("contexto injetado: triagem T0", async () => {
	const { on, cmds, ctx } = setup();
	await cmds.plan.handler("", ctx);
	const text: string = (await on.before_agent_start({}, ctx)).message.content;
	for (const s of ["Triage first", "skip the skill", "lints it and saves it", "each AC cited by a task"])
		assert.ok(text.includes(s), s);
});

test("lintPlan: R9 título acima de 50 caracteres", () => {
	const ok = `Tier: T0 (x)\n1. ${"a".repeat(50)}\n- passo`;
	assert.deepEqual(lint(ok), []);
	assert.deepEqual(lint(`Tier: T0 (x)\n1. curto\n- passo\n7) ${"a".repeat(51)}\n- passo`), [
		`task 7 title is 51 characters (max 50, as shown): "A${"a".repeat(50)}"`,
	]);
});

test("lintPlan: R9 mede o título como o todo o mostra (sem crase nem negrito)", () => {
	// 54 caracteres crus, 50 exibidos
	assert.deepEqual(lint("Tier: T0 (x)\n1. Rename `lst` to `tasks` in store.py and test_app.py ok\n- passo"), []);
	assert.equal(lint("Tier: T0 (x)\n1. Rename `lst` to `tasks` in store.py and test_app.py ok!\n- passo").length, 1);
});

const BAD = "Tier: T0 (x)\n1. tarefa um\n- A1: algo";
const planFileOf = () => join(plans, `${new Date().toISOString().slice(0, 10)}-abcdef12.md`);

test("rejeição salva o arquivo e a mensagem cita arquivo e @file", async () => {
	const { tools, cmds, ctx } = setup();
	await cmds.plan.handler("", ctx);
	const r = await tools.plan_mode_complete.execute("id", { plan: BAD });
	assert.equal(r.terminate, undefined);
	assert.equal(readFileSync(planFileOf(), "utf8"), BAD);
	const t = r.content[0].text;
	assert.ok(
		t.startsWith(
			`Plan not accepted. It was saved to ${planFileOf()}. Fix these there with the edit tool, then call plan_mode_complete with plan "@file" (do not resend the plan):\n- assumption A1 has no confidence %`,
		),
		t,
	);
});

test("@file após editar o arquivo aceita e gera os todos dele", async () => {
	const { tools, cmds, ctx } = setup();
	await cmds.plan.handler("", ctx);
	await tools.plan_mode_complete.execute("id", { plan: BAD });
	const good = "Tier: T0 (x)\n1. tarefa do arquivo\n- passo um\n2. outra do arquivo\n- passo dois";
	writeFileSync(planFileOf(), good);
	const r = await tools.plan_mode_complete.execute("id", { plan: " @file " });
	assert.equal(r.terminate, true);
	assert.equal(readFileSync(planFileOf(), "utf8"), good);
	assert.match(r.content[0].text, /^Plan submitted and saved/);
});

test("@file sem arquivo não conta como rejeição", async () => {
	rmSync(planFileOf(), { force: true });
	const { tools, cmds, ctx } = setup();
	await cmds.plan.handler("", ctx);
	for (let i = 0; i < 3; i++) {
		const r = await tools.plan_mode_complete.execute("id", { plan: "@file" });
		assert.equal(r.content[0].text, "No plan file to submit; pass the plan text.");
		assert.equal(r.terminate, undefined);
	}
	// contador intacto: duas rejeições ainda antes de aceitar
	for (let i = 0; i < 2; i++)
		assert.match(
			(await tools.plan_mode_complete.execute("id", { plan: "1. x tarefa\n- passo" })).content[0].text,
			/^Plan not accepted/,
		);
	assert.equal((await tools.plan_mode_complete.execute("id", { plan: "1. x tarefa\n- passo" })).terminate, true);
});

test("lintPlan: R5 aceita intervalo AC1–AC3 como cobertura", () => {
	const plan = [
		"Tier: T1 (teste)",
		"- AC1: WHEN a THE SYSTEM SHALL b",
		"- AC2: WHEN c THE SYSTEM SHALL d",
		"- AC3: IF e THEN THE SYSTEM SHALL f",
		"1. Implementar a regra nova",
		"   - AC: AC1–AC3",
		"   - check: `python -m unittest`",
	].join("\n");
	assert.deepEqual(utils.lintPlan(plan), []);
	assert.deepEqual(utils.lintPlan(plan.replace("AC1–AC3", "AC1-AC2")), ["AC3 is not covered by any task"]);
});
