// Plano em execução ↔ lista do todo ("estava no 1 marcando mas já estávamos no 13"): as etapas do
// plano aparecem na lista, andam com [DONE:n], concluir pelo todo conclui a etapa, sobrevivem ao resume e somem no fim.
import assert from "node:assert/strict";
import { test } from "vitest";
import todoExtension from "../../../src/extensions/todo/index.ts";
import { assistant, fakeCtx, fakeNycode, type Loose } from "../plan-mode/support.ts";

const PLAN13 = `Tier: T0 (teste)\n${Array.from({ length: 13 }, (_, i) => `${i + 1}. etapa ${i + 1}\n- feito ${i + 1}`).join("\n")}`;

/** Plan-mode e todo no mesmo barramento, sessão `s1`, ramo = entradas gravadas até aqui (ou `branch`). */
function boot(branch?: Loose[]) {
	const fake = fakeNycode();
	todoExtension(fake.nycode);
	const ctx = fakeCtx({
		sessionManager: {
			getSessionId: () => "s1",
			getEntries: () => branch ?? [],
			getBranch: () => branch ?? [],
		},
	});
	for (const h of fake.handlers.session_start) h({}, ctx);
	const todo = (params: Loose) => fake.tools.todo.execute("t", params, undefined, undefined, ctx);
	const list = async () => (await todo({ action: "list" })).details.todos as Loose[];
	const turn = (text: string) => fake.on.turn_end({ message: assistant(text) }, ctx);
	const planTodos = () => fake.entries.filter((e) => e.customType === "plan-mode").at(-1)?.data.todos as Loose[];
	return { fake, ctx, todo, list, turn, planTodos };
}

async function execute13(b: ReturnType<typeof boot>) {
	await b.fake.cmds.plan.handler("", b.ctx);
	await b.fake.tools.plan_mode_complete.execute("id", { plan: PLAN13 });
	await b.fake.on.agent_end({ messages: [] }, b.ctx);
}

const linked = (todos: Loose[]) => todos.filter((t) => t.planStep !== undefined);
const statusOf = (todos: Loose[], step: number) => todos.find((t) => t.planStep === step)?.status;

test("aprovar o plano semeia o todo com as 13 etapas; a primeira em andamento; itens do modelo ficam", async () => {
	const b = boot();
	await b.todo({ action: "add", text: "coisa paralela" });
	await execute13(b);
	const todos = await b.list();
	assert.equal(linked(todos).length, 13);
	assert.equal(statusOf(todos, 1), "in_progress");
	assert.equal(todos.find((t) => t.text === "coisa paralela")?.status, "pending");
	assert.equal(linked(todos)[0].text, "1. Etapa 1");
});

test("[DONE:n] fora de ordem conclui o item; a próxima etapa aberta assume", async () => {
	const b = boot();
	await execute13(b);
	b.turn("feito [DONE:2]");
	let todos = await b.list();
	assert.equal(statusOf(todos, 2), "completed");
	assert.equal(statusOf(todos, 1), "in_progress");
	b.turn("[DONE:6] e [DONE:1]");
	todos = await b.list();
	assert.deepEqual(
		[1, 2, 3, 4, 6].map((s) => statusOf(todos, s)),
		["completed", "completed", "in_progress", "pending", "completed"],
	);
	assert.equal(todos.filter((t) => t.status === "in_progress").length, 1);
});

test("concluir o item pelo todo conclui a etapa no plano (o plan-gate lê a mesma entrada)", async () => {
	const b = boot();
	await execute13(b);
	const step1 = linked(await b.list()).find((t) => t.planStep === 1);
	await b.todo({ action: "complete", id: step1.id });
	assert.equal(b.planTodos().find((t: Loose) => t.step === 1)?.completed, true);
	assert.equal(statusOf(await b.list(), 2), "in_progress");
});

test("falhar, bloquear ou cancelar o item ligado não conclui a etapa; a tag [DONE:n] ainda vale", async () => {
	const b = boot();
	await execute13(b);
	const step1 = linked(await b.list()).find((t) => t.planStep === 1);
	await b.todo({ action: "fail", id: step1.id, reason: "gate red" });
	assert.equal(b.planTodos().find((t: Loose) => t.step === 1)?.completed, false);
	assert.equal(statusOf(await b.list(), 1), "failed");
	b.turn("[DONE:1]");
	assert.equal(b.planTodos().find((t: Loose) => t.step === 1)?.completed, true);
	assert.equal(statusOf(await b.list(), 1), "completed");
	assert.equal((await b.list()).find((t) => t.planStep === 1)?.reason, undefined);
});

test("delete de item ligado é recusado; clear tira só os itens do modelo", async () => {
	const b = boot();
	await b.todo({ action: "add", text: "lateral" });
	await execute13(b);
	const step3 = linked(await b.list()).find((t) => t.planStep === 3);
	const del = await b.todo({ action: "delete", id: step3.id });
	assert.match(del.details.error, /plan step 3/);
	await b.todo({ action: "clear" });
	const todos = await b.list();
	assert.equal(todos.length, 13);
	assert.equal(linked(todos).length, 13);
});

test("resume: mesma lista, sem item duplicado, etapa atual em andamento", async () => {
	const a = boot();
	await execute13(a);
	a.turn("[DONE:1] [DONE:2]");
	const branch = a.fake.entries.map((e) => ({ type: "custom", customType: e.customType, data: e.data }));
	const b = boot(branch);
	const todos = await b.list();
	assert.equal(linked(todos).length, 13);
	assert.equal(new Set(linked(todos).map((t) => t.planStep)).size, 13);
	assert.deepEqual(
		[1, 2, 3].map((s) => statusOf(todos, s)),
		["completed", "completed", "in_progress"],
	);
});

test("fim do plano tira os itens ligados; o item do modelo fica", async () => {
	const b = boot();
	await b.todo({ action: "add", text: "lateral" });
	await execute13(b);
	assert.equal(linked(await b.list()).length, 13);
	b.turn(Array.from({ length: 13 }, (_, i) => `[DONE:${i + 1}]`).join(" "));
	await b.fake.on.agent_end({ messages: [] }, b.ctx);
	const todos = await b.list();
	assert.deepEqual(
		todos.map((t) => t.text),
		["lateral"],
	);
});

test("lembrete de lista parada não cobra itens ligados ao plano", async () => {
	const b = boot();
	await execute13(b);
	assert.equal(linked(await b.list()).length, 13);
	const toolResult = b.fake.handlers.tool_result.at(-1);
	let out: Loose;
	for (let i = 0; i < 12; i++)
		out = toolResult({ toolName: "bash", input: {}, content: [{ type: "text", text: "ok" }] }, b.ctx) ?? out;
	assert.equal(out, undefined);
});
