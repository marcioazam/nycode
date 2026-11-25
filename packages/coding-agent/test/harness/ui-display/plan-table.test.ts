// Plan table (docs/pi-interactive-display-2026-11-13.md, "Plan table"):  file>
import assert from "node:assert/strict";
import { visibleWidth } from "@nycode/tui";
import { test } from "vitest";
import * as mod from "../../../src/extensions/plan-mode/index.ts";
import * as manage from "../../../src/extensions/plan-mode/manage.ts";
import { PlanSection } from "../../../src/extensions/plan-mode/section.ts";
import * as t from "../../../src/extensions/plan-mode/table.ts";
import { nav } from "../../../src/extensions/subagent/section-nav/nav.ts";
import { fleetTestEnv } from "../subagent/fleet-env.ts";

fleetTestEnv("plan-table-");

const plain = { fg: (_c: string, s: string) => s, bold: (s: string) => s };
const CODE: Record<string, number> = { success: 32, task: 34, dim: 90, warning: 33, error: 31, text: 37 };
const tagged = {
	fg: (c: string, s: string) => `\x1b[${CODE[c] ?? 39}m${s}\x1b[39m`,
	bold: (s: string) => `\x1b[1m${s}\x1b[22m`,
};
/** The tab state is process-wide: every PlanSection test starts with the section as the first (so open) tab. */
const freshNav = (): void => nav.resetTabs();
const strip = (s: string): string => s.replace(/\x1b\[[0-9;]*m/g, "");
const item = (step: number, completed = false, extra: Record<string, unknown> = {}) => ({
	step,
	text: `step ${step}`,
	completed,
	...extra,
});

test("formatDuration: mm:ss, h:mm:ss from one hour, never negative", () => {
	assert.equal(t.formatDuration(0), "00:00");
	assert.equal(t.formatDuration(37_400), "00:37");
	assert.equal(t.formatDuration(134_000), "02:14");
	assert.equal(t.formatDuration(3_725_000), "1:02:05");
	assert.equal(t.formatDuration(-5), "00:00");
});

test("PlanTimes: the open step starts when the previous finished; a step done at first sight has no duration", () => {
	const times = new t.PlanTimes();
	times.observe([item(1, true), item(2), item(3)], 1_000); // restored: step 1 already done
	assert.equal(times.took(1), undefined, "unknown, not zero");
	assert.equal(times.running(2, 4_000), 3_000);
	times.observe([item(1, true), item(2, true), item(3)], 5_000);
	assert.equal(times.took(2), 4_000, "started 1 s, finished 5 s");
	assert.equal(times.running(3, 9_000), 4_000, "step 3 started when step 2 finished");
	assert.equal(times.elapsed(9_000), 8_000);
	times.observe([], 9_500);
	assert.equal(times.elapsed(9_500), undefined, "an empty plan forgets the clock");
});

test("state per row: done / doing / todo plus blocked, failed, skipped when set; time and agent cells", () => {
	const times = new t.PlanTimes();
	const items = [
		item(1, true),
		item(2),
		item(3),
		item(4, false, { status: "blocked" }),
		item(5, false, { status: "failed", agent: "code-reviewer" }),
		item(6, false, { status: "skipped" }),
	];
	times.observe([item(1), item(2), item(3)], 0);
	times.observe(items, 134_000);
	const raw = (i: number) => t.tableRow(items[i], tagged, 100, times, 134_000, true, t.activeStep(items));
	const row = (i: number) => strip(raw(i));
	// The cell shows the clock time the step finished, then how long it took (was `finalizado 02:14`).
	assert.match(
		row(0),
		new RegExp(
			`^01\\s+feito\\s+step 1.*${new Date(134_000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · 02:14`,
		),
	);
	assert.ok(raw(0).includes("\x1b[32mfeito"), "done is success-colored");
	assert.match(row(1), /^02\s+fazendo/);
	assert.ok(raw(1).includes("\x1b[1m\x1b[34mfazendo"), "doing is bold task color");
	assert.match(row(1), /00:00\s*$/, "running counter, no blinking mark (no status icons)");
	assert.match(row(2), /a fazer.*—/);
	assert.match(row(3), /bloqueado/);
	assert.ok(raw(3).includes("\x1b[33mbloqueado"), "blocked is warning-colored");
	assert.match(row(4), /falhou.*falhou\s*$/); // no agent cell (was `code-reviewer` at the end)
	assert.ok(raw(4).includes("\x1b[31mfalhou"), "failed is error-colored");
	assert.match(row(5), /pulado/);
	const odd = strip(t.tableRow(items[1], tagged, 100, times, 135_000, true, 2));
	assert.ok(!odd.includes("▮"), "the mark blinks off on odd seconds");
	assert.ok(
		!strip(t.tableRow(items[1], tagged, 100, times, 134_000, false, 2)).includes("▮"),
		"reduced motion: no blinking mark",
	);
	// Narrow rung (no state column): no symbol, the task text alone carries the state color.
	const narrow = t.tableRow(items[4], tagged, 45, times, 134_000, true, t.activeStep(items));
	assert.equal(t.columns(45).label, false);
	assert.ok(narrow.includes("\x1b[31mstep 5"), narrow);
	assert.ok(!/[✓▸○‖✕⊘∥]/.test(strip(narrow)));
});

// No agent column at any width; header `fim` instead of `tempo`.
test("responsive ladder: duration → state label → time and number; every line fits, the task is cut with an ellipsis", () => {
	const times = new t.PlanTimes();
	const long = { ...item(1), text: "x".repeat(200), agent: "swarm-worker" };
	const done = { ...item(1, true), text: "x".repeat(200) };
	times.observe([long, item(2)], 0);
	times.observe([done, item(2)], 1_000); // step 1 took 1 s
	// [width, header has tempo, agente, estado label, header shown]
	for (const [width, tempo, agente, label, header] of [
		[120, true, true, true, true],
		[60, true, false, true, true],
		[50, true, false, true, true],
		[40, true, false, false, true],
		[24, false, false, false, false],
	] as const) {
		const row = t.tableRow(long, plain, width, times, 1_000, false, 1);
		const head = t.tableHeader(plain, width);
		assert.ok(visibleWidth(row) <= width && visibleWidth(head) <= width, `@${width} fits`);
		assert.equal(/\bfim\b/.test(head), tempo, `@${width} time column`);
		assert.equal(
			head.includes("agente") || row.includes("swarm-worker"),
			false,
			`@${width} no agent column (was: ${agente})`,
		);
		assert.equal(row.includes("fazendo"), label, `@${width} state label`);
		assert.equal(head !== "", header, `@${width} header`);
		assert.ok(row.includes("…"), `@${width} task cut`);
	}
	const doneRow = (w: number) => t.tableRow(done, plain, w, times, 1_000, false, undefined);
	const fim = new Date(1_000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
	assert.ok(doneRow(120).includes(`${fim} · 00:01`));
	assert.ok(doneRow(50).includes(fim) && !doneRow(50).includes("· 00:01"), "short time: only the clock");
});

test("section: the counter runs with the clock, one timer while a step runs, none when its tab is closed, empty or shut down", () => {
	freshNav();
	const now = 10_000;
	const ui = { setWidget: () => {}, onTerminalInput: () => () => {}, getEditorText: () => "", theme: plain };
	const ctx = { hasUI: true, ui } as any;
	const p = new PlanSection();
	p.now = () => now;
	p.update(ctx, [item(1), item(2)]);
	assert.ok((p as any).timer, "a step is running: one tick per second");
	nav.register({
		id: "run",
		active: () => true,
		hasBody: false,
		label: () => "Run",
		changed() {},
		enter: () => false,
	});
	nav.open("run"); // another tab opens: Plan is closed and the tab change itself stops the timer
	assert.equal((p as any).timer, undefined, "closed: no timer");
	nav.open("plan");
	assert.ok((p as any).timer, "open again: the tick is back");
	nav.unregister("run");
	p.update(ctx, [item(1, true), item(2, true)]);
	assert.equal((p as any).timer, undefined, "nothing left to run");
	p.update(ctx, [item(1), item(2)]);
	p.shutdown(ctx);
	assert.equal((p as any).timer, undefined, "shutdown clears it");
});

test("todos from the todo tool reach the Plan section through the nycode:todos event (never the chat)", async () => {
	freshNav();
	// Every handler of an event runs, as in nycode: plan-mode/index.ts has two session_start handlers since permission-control (permission-control).
	const handlers = new Map<string, Array<(...a: any[]) => any>>();
	const bus = new Map<string, (d: any) => void>();
	const nycode: any = new Proxy(
		{
			on: (n: string, h: any) => handlers.set(n, [...(handlers.get(n) ?? []), h]),
			events: { on: (c: string, h: any) => bus.set(c, h), emit() {} },
			getFlag: () => false,
		},
		{ get: (t: any, k) => t[k] ?? (() => {}) },
	);
	mod.default(nycode);
	const widgets: any[] = [];
	const ctx: any = {
		hasUI: true,
		ui: {
			theme: plain,
			setStatus() {},
			setWidget: (k: string, f: any) => widgets.push({ k, f }),
			getEditorText: () => "",
			notify() {},
		},
		sessionManager: { getBranch: () => [], getEntries: () => [] },
	};
	for (const h of handlers.get("session_start")!) await h({}, ctx);
	const listener = bus.get("nycode:todos")!;
	assert.ok(listener, "plan-mode listens");
	listener([
		{ id: 1, text: "one", status: "completed" },
		{ id: 2, text: "Doing two", status: "in_progress" },
	]);
	const w = widgets.filter((x) => x.f).at(-1);
	assert.ok(w, "the Plan widget registers");
	const body = w
		.f({ requestRender() {}, terminal: { rows: 40 } }, plain)
		.render(100)
		.map(strip)
		.join("\n");
	assert.match(body, /Doing two/);
	assert.match(body, /^Todo 1\/2/m, "a todo list is the Todo tab");
	listener([]);
	assert.equal(widgets.at(-1).f, undefined, "an empty list removes the widget");
});

test("the plan clock freezes when every step is done and resumes if a step is added", () => {
	const times = new t.PlanTimes();
	times.observe([item(1), item(2)], 1_000);
	times.observe([item(1, true), item(2)], 5_000);
	assert.equal(times.elapsed(8_000), 7_000, "running");
	times.observe([item(1, true), item(2, true)], 9_000);
	assert.equal(times.elapsed(9_000), 8_000);
	assert.equal(times.elapsed(60_000), 8_000, "frozen at the last finish");
	times.observe([item(1, true), item(2, true), item(3)], 70_000);
	assert.equal(times.elapsed(75_000), 74_000, "a new step reopens the plan: the clock runs again");
});

test("management variant 1: note detail line under the row, aligned to the task column; marked counts in the title", () => {
	const items = [
		item(1, true),
		item(2, false, { status: "failed", note: "tentativa 2/3 · 3 testes falharam", agent: "gate-runner" }),
		item(3),
		item(4, false, { status: "blocked", note: "aguardando #3 · pergunta: manter colchetes?" }),
		item(5, false, { status: "skipped", note: "motivo: duplicado" }),
	];
	const W = 100;
	const c = t.columns(W);
	const detail = strip(t.tableDetail(items[1] as any, plain, W, 3) as string);
	assert.equal(detail.indexOf("↳"), c.num + c.state, "the arrow sits at the task column");
	assert.equal(strip(t.tableRow(items[1], plain, W, new t.PlanTimes(), 0, false, 3)).indexOf("Executar") === -1, true);
	assert.equal(t.tableDetail(item(3), plain, W, 3), null, "no note, no detail");
	assert.equal(t.tableDetail(items[1], plain, 20, 3), null, "symbol-only layouts have no room");
	assert.deepEqual(t.markCounts(items), { blocked: 1, failed: 1, skipped: 1 });
	// every row and the header share the same column starts
	const header = strip(t.tableHeader(plain, W));
	const times = new t.PlanTimes();
	for (const it of items) {
		const row = strip(t.tableRow(it, plain, W, times, 0, false, 3));
		assert.equal(
			row.indexOf(it.text.slice(0, 4)),
			header.indexOf("tarefa"),
			`task column aligned for step ${it.step}`,
		);
	}
	freshNav();
	const ctx = { sessionManager: { getBranch: () => [] } } as any;
	const section = new PlanSection();
	(section as any).theme = tagged;
	(section as any).tui = { requestRender() {}, terminal: { rows: 40 } };
	section.now = () => 0;
	section.update(ctx, items); // registers the Plan tab
	const out = section.render(W).map(strip);
	assert.match(out[1]!, /^Plan 1\/5 {2}.*1 bloqueado · 1 falhou · 1 pulado/, "the marked counts follow the tab");
	assert.ok(out.some((l) => l.includes("↳ motivo: duplicado")) && out.some((l) => l.includes("↳ tentativa 2/3")));
	nav.register({
		id: "status",
		active: () => true,
		hasBody: false,
		label: () => "Status",
		changed() {},
		enter: () => false,
	});
	nav.open("status");
	const folded = section.render(W).map(strip);
	assert.equal(folded.length, 3, "closed Plan: the bar alone");
	// Contract (docs/pi-group-tabs-2026-11-14.md item 6 + amendment): only the open tab's group puts its detail on the bar,
	// and no folded `fazendo: …` summary exists; the tab label keeps the count.
	assert.match(folded[1]!, /^Status {3}Plan 1\/5\s*$/);
	nav.unregister("status");
	section.update(ctx, [item(1, true), item(2, true), item(3, false, { status: "skipped" })]);
	nav.open("plan");
	assert.match(section.render(W).map(strip)[1]!, /^Plan 2\/3 {2}.* concluído/);
});

test("spend in the Plan title: tokens and dollars of the assistant messages since the plan began", () => {
	const msg = (ts: string, tokens: number, cost: number) => ({
		type: "message",
		timestamp: ts,
		message: { role: "assistant", usage: { totalTokens: tokens, cost: { total: cost } } },
	});
	const entries = [
		msg("2026-11-13T10:00:00Z", 9999, 9),
		msg("2026-11-13T12:00:00Z", 20_000, 0.4),
		msg("2026-11-13T12:05:00Z", 21_500, 0.226),
		{ type: "message", timestamp: "2026-11-13T12:06:00Z", message: { role: "user" } },
	];
	const since = Date.parse("2026-11-13T11:00:00Z");
	assert.deepEqual(t.spendSince(entries, since), { tokens: 41_500, cost: 0.626 });
	assert.equal(t.formatSpend({ tokens: 41_500, cost: 0.626 }), "42k tok · $0.63");
	assert.equal(t.formatSpend({ tokens: 900, cost: 0.004 }), "900 tok · <$0.01");
	assert.equal(t.formatSpend({ tokens: 2_300_000, cost: 12 }), "2.3M tok · $12.00");
	const section = new PlanSection();
	(section as any).theme = plain;
	(section as any).tui = { requestRender() {}, terminal: { rows: 40 } };
	(section as any).ctx = { sessionManager: { getBranch: () => entries } };
	section.now = () => since;
	(section as any).times.observe([item(1)], since);
	freshNav();
	section.update((section as any).ctx, [item(1)]);
	assert.match(strip(section.render(100).at(-1)!), /^00:00 · 42k tok · \$0\.63/); // footer line (was the bar)
});

// ---- management: select, details, skip, pause, open ----
const DOWN = "\x1b[B";
function managed(items: unknown[], host: Record<string, unknown> = {}) {
	freshNav();
	const s = new PlanSection() as any;
	const log: string[] = [];
	s.theme = plain;
	s.tui = { requestRender() {}, terminal: { rows: 40 } };
	s.ctx = { sessionManager: { getBranch: () => [] } };
	s.host = {
		notify: (x: string, trig?: boolean) => log.push(`notify${trig ? "!" : ""}:${x}`),
		abort: () => log.push("abort"),
		open: async (md: string) => {
			log.push(`open:${md.split("\n").length}`);
			return undefined;
		},
		ask: async () => "não vale a pena",
		...host,
	};
	let clock = 1000;
	s.now = () => clock;
	s.update(s.ctx, items);
	s.nativeFocus = true;
	return {
		s,
		log,
		tick: (ms: number) => {
			clock += ms;
			return clock;
		},
		lines: () => s.render(120).map(strip) as string[],
	};
}

test("manage: ↓ selects (❯ on the row), Enter opens the drawer with the facts, Enter closes it; the title lists only valid keys", () => {
	const { s, lines } = managed([item(1, true), item(2), item(3)]);
	s.handleInput(DOWN);
	assert.equal(s.cursor, 1);
	assert.ok(
		lines().some((l) => /^02❯\s+fazendo/.test(l.trimStart())),
		lines().join("\n"),
	);
	assert.match(lines().at(-1)!, /↵ detalhes · o abrir plano · s pular · p pausar · esc back$/); // keys on the footer line (was the title)
	s.handleInput("\r");
	const open = lines();
	assert.ok(
		open.some((l) => l.includes("┌ passo 02")) && open.some((l) => l.includes("tarefa: step 2")),
		open.join("\n"),
	);
	s.handleInput("\r");
	assert.ok(!lines().some((l) => l.includes("┌ passo")));
	s.handleInput("\x1b[A");
	assert.doesNotMatch(lines().at(-1)!, /s pular/, "a finished step cannot be skipped");
});

test("manage: s asks why, marks the step skipped, tells the agent; r reopens; finished steps are never touched", async () => {
	const { s, log, lines } = managed([item(1, true), item(2), item(3)]);
	s.handleInput("s"); // on the finished step: nothing
	await Promise.resolve();
	assert.deepEqual(log, []);
	s.handleInput(DOWN);
	s.handleInput(DOWN);
	s.handleInput("s");
	await new Promise((r) => setTimeout(r, 0));
	assert.match(log[0]!, /^notify:.*pulou o passo 3.*não vale a pena.*Não o execute/);
	assert.ok(lines().some((l) => /03.*pulado/.test(l)) && lines().some((l) => l.includes("↳ não vale a pena")));
	assert.match(lines()[1]!, /1 pulado/);
	s.handleInput("r");
	await new Promise((r) => setTimeout(r, 0));
	assert.match(log[1]!, /reabriu o passo 3/);
	assert.ok(lines().some((l) => /03.*a fazer/.test(l)));
	const cancelled = managed([item(1), item(2)], { ask: async () => undefined });
	cancelled.s.handleInput("s");
	await new Promise((r) => setTimeout(r, 0));
	assert.deepEqual(cancelled.log, [], "cancelling the question skips nothing");
	assert.deepEqual(manage.applyMarks([item(1, true)], new Map([[1, { status: "skipped", note: "x" }]])), [
		item(1, true),
	]);
});

test("manage: p aborts the run and freezes the clock and the step; p again resumes without the gap and starts a turn", () => {
	const { s, log, tick, lines } = managed([item(1), item(2)]);
	tick(10_000);
	assert.match(lines().at(-1)!, /^00:10/); // footer line (was the bar)
	s.handleInput("p");
	assert.deepEqual(
		log.slice(0, 2).map((x) => x.split(":")[0]),
		["abort", "notify"],
	);
	tick(60_000);
	const frozen = lines();
	assert.match(frozen.at(-1)!, /00:10 · pausado/);
	assert.ok(
		frozen.some((l) => /01.*pausado.*00:10\b/.test(l)),
		frozen.join("\n"),
	);
	s.handleInput("p");
	assert.match(log[2]!, /^notify!:.*retomou/);
	tick(5_000);
	assert.match(lines().at(-1)!, /00:15/, "the minute of pause is not counted");
	assert.doesNotMatch(lines().at(-1)!, /pausado/);
});

test("manage: o hands the plan as markdown to the host; a failure message is shown in the title", async () => {
	const { s, log, lines } = managed([item(1, true), item(2)], { open: async () => "não consegui abrir: /tmp/x.md" });
	s.handleInput("o");
	await new Promise((r) => setTimeout(r, 0));
	assert.match(lines().at(-1)!, /não consegui abrir: \/tmp\/x\.md/);
	assert.equal(log.length, 0);
	assert.equal(
		manage.planMarkdown([item(1, true), item(2, false, { status: "skipped", note: "dup" })]),
		"# Plan\n\n- [x] 1. step 1\n- [-] 2. step 2 — dup\n",
	);
});

test("manage: per-step spend uses the step window; a skipped step closes its clock", () => {
	const times = new t.PlanTimes();
	times.observe([item(1), item(2)], 1000);
	times.observe([item(1, true), item(2)], 5000);
	assert.deepEqual(times.window(1, 9000), { from: 1000, to: 5000 });
	const msg = (at: number, tokens: number) => ({
		type: "message",
		timestamp: new Date(at).toISOString(),
		message: { role: "assistant", usage: { totalTokens: tokens, cost: { total: 0.1 } } },
	});
	assert.deepEqual(manage.stepSpend([msg(500, 7), msg(2000, 10), msg(6000, 20)], times, 1, 9000), {
		tokens: 10,
		cost: 0.1,
	});
	times.observe([item(1, true), item(2, false, { status: "skipped" })], 7000);
	assert.deepEqual(times.window(2, 9000), { from: 5000, to: 7000 });
});
