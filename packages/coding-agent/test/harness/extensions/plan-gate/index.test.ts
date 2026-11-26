// Ported from the pre-migration harness: claude-home/bin/tests/plan-gate.test.ts (node:test), same cases and expectations.
import { strict as assert } from "node:assert";
import { test } from "vitest";
import type { ExtensionAPI, MessageRenderOptions } from "../../../../src/core/extensions/types.ts";
import { resolveNycodeSettings } from "../../../../src/core/settings-nycode.ts";
import planGateExtension, {
	decidePlanGate,
	gateComponent,
	giveUpNotice,
} from "../../../../src/extensions/plan-gate/index.ts";

type Entry = Record<string, unknown>;
let n = 0;
const id = () => `e${++n}`;
const approve = (): Entry => ({
	type: "custom_message",
	id: id(),
	customType: "plan-mode-execute",
	content: "Execute the plan.",
});
const say = (text: string): Entry => ({
	type: "message",
	id: id(),
	message: { role: "assistant", content: [{ type: "text", text }] },
});
const call = (name: string, args: Record<string, unknown>, callId = `c${n + 1}`): Entry => ({
	type: "message",
	id: id(),
	message: { role: "assistant", content: [{ type: "toolCall", id: callId, name, arguments: args }] },
});
const result = (callId: string, toolName: string, text: string): Entry => ({
	type: "message",
	id: id(),
	message: { role: "toolResult", toolCallId: callId, toolName, content: [{ type: "text", text }] },
});
const review = (verdict: string, callId: string): Entry[] => [
	call("subagent", { agent: "plan-reviewer", task: "review" }, callId),
	result(callId, "subagent", `- gap one\nPLAN_REVIEW: ${verdict}`),
];
const record = (data: object): Entry => ({ type: "custom", id: id(), customType: "plan-gate", data });

test("sem plano aprovado: nada a fazer", () => {
	assert.equal(decidePlanGate([say("oi")]).action, "none");
});

test("plano aprovado sem revisão: bloqueia pedindo plan-reviewer", () => {
	const d = decidePlanGate([approve(), call("edit", { path: "a" }), say("pronto")]);
	assert.equal(d.action, "block");
	assert.equal(d.why, "no_review");
	assert.match(d.message ?? "", /plan-reviewer/);
});

test("revisão complete depois da última edição: libera e encerra", () => {
	const d = decidePlanGate([approve(), call("edit", { path: "a" }), ...review("complete", "r1"), say("feito")]);
	assert.equal(d.action, "allow");
	assert.equal(d.why, "review_complete");
	assert.equal(d.record?.state, "completed");
});

test("edição depois da revisão complete: bloqueia", () => {
	const d = decidePlanGate([approve(), ...review("complete", "r1"), call("write", { path: "b" }), say("feito")]);
	assert.equal(d.why, "edit_after_review");
});

test("revisão incomplete: bloqueia com os gaps", () => {
	const d = decidePlanGate([approve(), ...review("incomplete", "r1"), say("feito")]);
	assert.equal(d.why, "review_incomplete");
	assert.match(d.message ?? "", /gap one/);
});

test("revisão de outro agente não conta", () => {
	const d = decidePlanGate([
		approve(),
		call("subagent", { agent: "code-reviewer", task: "x" }, "x1"),
		result("x1", "subagent", "PLAN_REVIEW: complete"),
		say("ok"),
	]);
	assert.equal(d.why, "no_review");
});

test("revisão em chamada paralela (tasks) conta", () => {
	const d = decidePlanGate([
		approve(),
		call("subagent", { tasks: [{ agent: "plan-reviewer", task: "r" }] }, "p1"),
		result("p1", "subagent", "PLAN_REVIEW: complete"),
		say("ok"),
	]);
	assert.equal(d.why, "review_complete");
});

test("marcadores: CANCELLED encerra, BLOCKED e WAITING liberam", () => {
	assert.equal(decidePlanGate([approve(), say("PLAN CANCELLED")]).record?.state, "cancelled");
	assert.equal(decidePlanGate([approve(), say("PLAN BLOCKED: preciso da sua decisão")]).why, "marker_blocked");
	assert.equal(decidePlanGate([approve(), say("PLANO AGUARDANDO: lanes rodando")]).why, "marker_waiting");
});

test("plan mode ligado de novo: libera", () => {
	const d = decidePlanGate([
		approve(),
		{ type: "custom", id: id(), customType: "plan-mode", data: { enabled: true } },
		say("planejando"),
	]);
	assert.equal(d.why, "plan_mode");
});

test("estado encerrado não reativa até nova aprovação", () => {
	const base = [approve(), ...review("complete", "r1"), say("ok"), record({ state: "completed" })];
	assert.equal(decidePlanGate([...base, say("outra coisa")]).action, "none");
	assert.equal(decidePlanGate([...base, approve(), say("novo plano")]).why, "no_review");
});

test("3 paradas sem progresso: desiste com aviso", () => {
	const entries: Entry[] = [approve(), say("a")];
	let d = decidePlanGate(entries);
	for (let i = 0; i < 3; i++) {
		entries.push(record(d.record ?? {}), say("sem progresso"));
		d = decidePlanGate(entries);
	}
	assert.equal(d.action, "give_up");
	assert.equal(d.record?.state, "gave_up");
	assert.match(d.message ?? "", /PLAN_REVIEW: complete/);
});

test("progresso (edição nova) zera o contador", () => {
	const entries: Entry[] = [approve(), say("a")];
	let d = decidePlanGate(entries);
	entries.push(record(d.record ?? {}), say("b"));
	d = decidePlanGate(entries);
	entries.push(record(d.record ?? {}), call("edit", { path: "x" }), say("c"));
	d = decidePlanGate(entries);
	assert.equal(d.action, "block");
	assert.equal(d.record?.noProgress, 0);
});

test("NYCODE_PLAN_GATE=0 desliga", () => {
	const enabled = resolveNycodeSettings({}, { NYCODE_PLAN_GATE: "0" }).plan.gate;
	assert.equal(decidePlanGate([approve(), say("x")], enabled).action, "none");
});

test("marcador citado no meio de uma frase não vale", () => {
	const d = decidePlanGate([approve(), say("this is not a PLAN CANCELLED case, nem PLAN BLOCKED: aqui")]);
	assert.equal(d.why, "no_review");
	assert.equal(d.action, "block");
});

test("marcador em linha própria vale, também com ênfase markdown", () => {
	assert.equal(decidePlanGate([approve(), say("texto\nPLAN CANCELLED")]).record?.state, "cancelled");
	assert.equal(decidePlanGate([approve(), say("texto\n**PLAN BLOCKED:** preciso de decisão")]).why, "marker_blocked");
	assert.equal(decidePlanGate([approve(), say("texto\n  `PLANO AGUARDANDO: lanes`")]).why, "marker_waiting");
	assert.equal(decidePlanGate([approve(), say("PLANO CANCELADO")]).record?.state, "cancelled");
});

test("edição e revisão na mesma mensagem: não completa", () => {
	const both: Entry = {
		type: "message",
		id: id(),
		message: {
			role: "assistant",
			content: [
				{ type: "toolCall", id: "ed", name: "edit", arguments: { path: "a" } },
				{ type: "toolCall", id: "rv", name: "subagent", arguments: { agent: "plan-reviewer", task: "r" } },
			],
		},
	};
	const d = decidePlanGate([approve(), both, result("rv", "subagent", "PLAN_REVIEW: complete"), say("ok")]);
	assert.equal(d.why, "edit_after_review");
});

// --- display (wave 9, 8a): only the screen changes; the text to the model and the decision stay the same ---
const theme = { fg: (_c: string, t: string) => t, bold: (t: string) => t };
const opts = (expanded: boolean) =>
	({ expanded, outputPad: 1, keyText: () => "ctrl+o" }) as unknown as MessageRenderOptions;
const msg = (blocks?: number) => ({
	content: "Plan gate: no plan-reviewer verdict yet. Finish the remaining plan items.",
	details: blocks === undefined ? undefined : { blocks },
});
type Clicavel = { render(w: number): readonly string[]; handleMouse(e: { type: string; button: string }): unknown };

test("bloco do gate recolhido: uma linha em português, sem o parágrafo em inglês", () => {
	const lines = gateComponent(msg(1), opts(false), theme).render(100);
	assert.equal(lines.length, 1);
	assert.match(lines[0] as string, /^ {3}▲ Plano {2}falta a revisão final \(plan-reviewer\) · o agente foi avisado/);
	assert.match(lines[0] as string, /ctrl\+o/);
	assert.doesNotMatch(lines[0] as string, /vez/);
	assert.doesNotMatch(lines[0] as string, /Plan gate/);
});

test("bloco do gate: contador a partir da 2ª vez e linha nunca passa da largura", () => {
	assert.match(gateComponent(msg(3), opts(false), theme).render(100)[0] as string, /3ª vez · ctrl\+o/);
	for (const w of [20, 40, 60])
		for (const l of gateComponent(msg(3), opts(false), theme).render(w))
			assert.ok(l.length <= w, `${l.length} > ${w}`);
});

test("bloco do gate expandido: cabeçalho e o texto completo original", () => {
	const lines = gateComponent(msg(2), opts(true), theme).render(30);
	assert.match(lines[0] as string, /▲ Plano/);
	assert.equal(
		lines
			.slice(1)
			.map((l) => l.trim())
			.join(" ")
			.replace(/\s+/g, " ")
			.trim(),
		msg().content,
	);
	for (const l of lines) assert.ok(l.length <= 30);
});

test("bloco do gate: ▲ = aviso, então a faixa tem o fundo de aviso na largura toda", () => {
	const bg = { fg: (_c: string, s: string) => s, bg: (c: string, s: string) => `[${c}]${s}` };
	for (const expanded of [false, true])
		for (const l of gateComponent(msg(1), opts(expanded), bg).render(90))
			assert.ok(l.replace(/\[[A-Za-z]+\]/, "").length >= 90, l);
});

test("aviso final em português com N", () => {
	assert.equal(
		giveUpNotice(3),
		"▲ Plano  parou de cobrar após 3 avisos sem avanço · rode o plan-reviewer antes de concluir",
	);
	assert.equal(
		giveUpNotice(1, 30),
		"▲ Plano  parou de cobrar após 30 avisos · rode o plan-reviewer antes de concluir",
	);
});

test("handler: bloqueio mantém o content e grava o contador em details; give_up notifica em português", async () => {
	const saved = process.env.NYCODE_SUBAGENT;
	delete process.env.NYCODE_SUBAGENT;
	const h: Record<string, (...a: unknown[]) => Promise<any>> = {};
	const renderers: Record<string, unknown> = {};
	planGateExtension({
		on: (e: string, f: (...a: unknown[]) => Promise<unknown>) => {
			h[e] = f as never;
		},
		getSettings: () => ({}),
		registerMessageRenderer: (t: string, f: unknown) => {
			renderers[t] = f;
		},
	} as unknown as ExtensionAPI);
	if (saved !== undefined) process.env.NYCODE_SUBAGENT = saved;
	assert.equal(typeof renderers["plan-gate"], "function");
	const branch: Entry[] = [approve(), say("a")];
	const notes: unknown[] = [];
	const ctx = {
		sessionManager: { getBranch: () => branch },
		ui: { notify: (...a: unknown[]) => notes.push(a) },
	};
	const expected = decidePlanGate(branch);
	const out = await (h.agent_before_settle as (...a: unknown[]) => Promise<any>)({ entries: [] }, ctx);
	const m = out.entries.at(-1);
	assert.equal(m.content, expected.message);
	assert.deepEqual(m.details, { blocks: 1 });
	assert.equal(out.continue, true);
	for (let i = 0; i < 3; i++) branch.push(record(decidePlanGate(branch).record ?? {}), say("sem progresso"));
	const fin = await (h.agent_before_settle as (...a: unknown[]) => Promise<any>)({ entries: [] }, ctx);
	assert.equal(fin?.continue, undefined);
	assert.deepEqual(notes, [[giveUpNotice(3, 3), "warning"]]);
});

// Every signal line shows the hour it happened.
test("gateComponent: mostra HH:MM do timestamp antes da tecla; sem timestamp fica como antes", () => {
	const T = new Date(2026, 10, 14, 14, 15, 0).getTime();
	assert.match(
		gateComponent({ ...msg(1), timestamp: T }, opts(false), theme).render(100)[0] as string,
		/o agente foi avisado · ctrl\+o abre +14:15$/,
	);
	assert.doesNotMatch(gateComponent(msg(1), opts(false), theme).render(100)[0] as string, /\d\d:\d\d/);
});

// Every chat block opens and closes with a click, this one included.
test("bloco do gate: clique esquerdo abre e fecha", () => {
	const c = gateComponent(msg(1), opts(false), theme) as Clicavel;
	assert.equal(c.render(100).length, 1);
	assert.deepEqual(c.handleMouse({ type: "click", button: "left" }), { handled: true });
	assert.ok(c.render(100).length > 1);
	c.handleMouse({ type: "click", button: "left" });
	assert.equal(c.render(100).length, 1);
	assert.equal(c.handleMouse({ type: "click", button: "right" }), undefined);
});

// Contract 2026-11-15: Esc / send now (stopReason aborted) never blocks nor counts; the plan stays active.
const aborted = (text = "parcial"): Entry => ({
	type: "message",
	id: id(),
	message: { role: "assistant", content: [{ type: "text", text }], stopReason: "aborted" },
});

test("parada abortada pelo usuário: libera sem bloquear nem contar", () => {
	const d = decidePlanGate([approve(), call("edit", { path: "a" }), aborted()]);
	assert.equal(d.action, "allow");
	assert.equal(d.why, "user_interrupt");
	assert.equal(d.record?.state, "allowed");
	assert.equal(d.record?.blocks, 0);
	assert.equal(d.record?.noProgress, 0);
});

test("aborto não soma ao contador anterior e a parada normal seguinte volta a bloquear", () => {
	const before = [approve(), call("edit", { path: "a" }), say("pronto")];
	const first = decidePlanGate(before);
	assert.equal(first.action, "block");
	const withRec = [...before, record(first.record as unknown as Record<string, unknown>)];
	const ab = decidePlanGate([...withRec, aborted()]);
	assert.equal(ab.action, "allow");
	assert.deepEqual(
		[ab.record?.blocks, ab.record?.noProgress, ab.record?.sig],
		[first.record?.blocks, first.record?.noProgress, first.record?.sig],
	);
	const next = decidePlanGate([
		...withRec,
		record(ab.record as unknown as Record<string, unknown>),
		aborted(),
		say("de novo"),
	]);
	assert.equal(next.action, "block");
});
