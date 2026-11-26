// Plan section + collapsible Sub Agents (docs/pi-interactive-display-2026-11-13.md, "Plan section"):
// Written before the code. Mouse events are decoded from SGR here by a copy of @nycode/tui's normalisation (local = screen - top);
// the native frame test drives the real SGR path at the final gate.
import assert from "node:assert/strict";
import { visibleWidth } from "@nycode/tui";
import { test } from "vitest";
import { PlanSection } from "../../../src/extensions/plan-mode/section.ts";
import * as sec from "../../../src/extensions/subagent/fleet-ui/section.ts";
import { nav } from "../../../src/extensions/subagent/section-nav/nav.ts";
import {
	BAR,
	boot,
	CLICK,
	fakeEditor,
	host,
	items,
	MULTI,
	RULE,
	rec,
	SINGLE,
	sgr,
	strip,
	tabsOf,
	WHEEL_DOWN,
	WHEEL_UP,
	withStatusTab,
} from "./plan-section-support.ts";

// ---- pure helpers ----
test("viewport: 6 rows on a tall terminal, shrinks to 3, never unbounded; offset clamps", () => {
	assert.equal(sec.viewportSize(24), 6);
	assert.equal(sec.viewportSize(40), 6);
	assert.equal(sec.viewportSize(20), 3);
	assert.equal(sec.viewportSize(5), 3);
	assert.equal(sec.clampOffset(99, 12, 6), 6);
	assert.equal(sec.clampOffset(-3, 12, 6), 0);
	assert.equal(sec.clampOffset(4, 4, 6), 0);
});

// ---- render ----
for (const width of [80, 120, 200]) {
	test(`@${width} Plan: blank, tab with detail, ━ rule right below, bounded body; none when empty; a closed tab is the bar alone`, () => {
		const h = host(fakeEditor());
		const p = new PlanSection();
		p.update(h.ctx, []);
		assert.deepEqual(h.lines(width), [], "no items: no title, no rule, no widget");
		assert.equal(h.below.size, 0);
		p.update(h.ctx, items(12, 3));
		const f = h.lines(width);
		assert.equal(f[0], "", "the group starts with a blank spacing line");
		// Time, window and keys moved from the bar to a footer line under the table.
		assert.match(f[1], /^Plan 3\/12\s*$/, "the tab alone");
		assert.match(f.at(-1) as string, /^00:00 · 3\/6 na tela( · o abrir plano)?$/, "footer: time and window");
		assert.ok(!/PLAN|[▾▸]/.test(f[1]), "no chip name or fold symbol");
		assert.equal(
			f[2],
			"━".repeat("Plan 3/12".length) + "─".repeat(width - "Plan 3/12".length),
			"━ under the open tab, rule right below the bar",
		);
		assert.equal(f.length, 1 + 1 + 1 + 1 + 6 + 1, "blank, tabs, rule, table header, 6 rows, footer");
		assert.match(f[3], /^#\s+estado\s+tarefa/);
		assert.equal(f.filter((l) => /^[━─]{20,}$/.test(l)).length, 1, "only the bar rule, no closing rule");
		assert.match(f[4], /^01\s+feito\s+item 1.*--:--/);
		assert.match(f[7], /^04\s+fazendo\s+item 4.*00:00/);
		assert.match(f[8], /^05\s+a fazer\s+item 5.*—/);
		for (const l of h.below.get("plan-section").render(width))
			assert.ok(visibleWidth(l) <= width, `${width}: ${strip(l)}`);
		const unregister = withStatusTab();
		nav.open("status"); // another tab opens: Plan is closed
		assert.equal(p.collapsed, true);
		const c = h.lines(width);
		assert.equal(c.length, 3, "blank, tabs, rule: no body");
		assert.equal(c[0], "");
		assert.match(c[1], /^Status {3}Plan 3\/12\s*$/, "closed: the label keeps the count; the bar has no Plan detail");
		assert.ok(!c[1].includes("▸"), "no fold symbol");
		assert.equal(
			c[2],
			"━".repeat("Status".length) + "─".repeat(width - "Status".length),
			"━ under the open tab (Status), not under Plan",
		);
		if (width === 120) console.log([...f, ...c].join("\n"));
		unregister();
		p.shutdown(h.ctx);
	});
}

test("tiny terminal: the viewport shrinks and the section still fits", () => {
	const h = host(fakeEditor(), 18);
	const p = new PlanSection();
	p.update(h.ctx, items(12));
	assert.equal(h.lines(80).length, 1 + 1 + 1 + 1 + 3 + 1); // footer line (was the bar)
	p.shutdown(h.ctx);
});

// ---- mouse ----
test("click on a closed tab name (by column) opens it, on the open one does nothing; the blank row and a miss do nothing; does not take focus", () => {
	const h = host(fakeEditor());
	const p = new PlanSection();
	p.update(h.ctx, items(12));
	const unregister = withStatusTab();
	nav.open("plan");
	const comp = h.below.get("plan-section");
	const top = 10;
	h.lines(80); // the bar records the column of each tab name
	assert.equal(
		comp.handleMouse(sgr(CLICK(5, top + 1), top, 80, 8)),
		undefined,
		"the blank spacing row is not the bar",
	);
	assert.equal(
		comp.handleMouse(sgr(CLICK(60, top + 2), top, 80, 8)),
		undefined,
		"outside the name (the detail) does nothing",
	);
	assert.equal(p.collapsed, false);
	const open = comp.handleMouse(sgr(CLICK(10, top + 2), top, 80, 8)); // `Status   Plan 3/12`: Plan starts at column 9
	assert.equal(open.handled, true, "the click on the open tab is consumed");
	assert.equal(p.collapsed, false, "and changes nothing");
	const r1 = comp.handleMouse(sgr(CLICK(2, top + 2), top, 80, 8));
	assert.equal(r1.handled, true);
	assert.equal(p.collapsed, true, "Status opened, Plan closed");
	h.lines(80);
	comp.handleMouse(sgr(CLICK(10, top + 2), top, 80, 3));
	assert.equal(p.collapsed, false, "a click on the closed Plan opens it");
	assert.equal(h.tui.focusedComponent.getText(), "draft in progress");
	assert.ok(!r1.focus);
	unregister();
	p.shutdown(h.ctx);
});

test("click on the body focuses Plan natively (focus:true), remembers the editor; wheel then scrolls Plan to the last item and is handled", () => {
	const editor = fakeEditor();
	const h = host(editor);
	const p = new PlanSection();
	p.update(h.ctx, items(12));
	const comp = h.below.get("plan-section");
	const top = 10;
	assert.equal(
		comp.handleMouse(sgr(WHEEL_DOWN(5, top + 4), top, 80, 8)),
		undefined,
		"not focused: the wheel is the chat’s",
	);
	assert.equal(p.offset, 0);
	const click = comp.handleMouse(sgr(CLICK(5, top + 4), top, 80, 8));
	assert.equal(click.focus, true);
	h.tui.setFocus(comp); // what nycode does for focus:true
	assert.equal(comp.focused, true);
	for (let i = 0; i < 4; i++) assert.equal(comp.handleMouse(sgr(WHEEL_DOWN(5, top + 4), top, 80, 8)).handled, true);
	assert.equal(p.offset, 6, "clamped at the last page");
	assert.match(h.lines(80)[4], /^07\s+a fazer\s+item 7/);
	assert.ok(h.lines(80).some((l) => /^12\s+a fazer\s+item 12/.test(l)));
	comp.handleMouse(sgr(WHEEL_UP(5, top + 4), top, 80, 8));
	assert.equal(p.offset, 3);
	const unregister = withStatusTab();
	nav.open("status");
	assert.equal(
		comp.handleMouse(sgr(WHEEL_DOWN(5, top + 1), top, 80, 2)),
		undefined,
		"closed tab: nothing to scroll, the chat keeps the wheel",
	);
	assert.equal(editor.text, "draft in progress");
	unregister();
	p.shutdown(h.ctx);
});

test("click outside (the editor takes focus natively) releases Plan; the wheel goes back to the chat", () => {
	const editor = fakeEditor();
	const h = host(editor);
	const p = new PlanSection();
	p.update(h.ctx, items(12));
	const comp = h.below.get("plan-section");
	comp.handleMouse(sgr(CLICK(5, 14), 10, 80, 8));
	h.tui.setFocus(comp);
	h.tui.setFocus(editor); // click on the editor
	assert.equal(comp.focused, false);
	assert.equal(comp.handleMouse(sgr(WHEEL_DOWN(5, 14), 10, 80, 8)), undefined);
	assert.equal(editor.text, "draft in progress");
	p.shutdown(h.ctx);
});

// ---- keys while Plan has native focus ----
test("Space, ← and → in the Plan body do not fold the tab: they are no Plan keys, so Plan lets go and the editor gets them", () => {
	for (const key of [" ", "\x1b[D", "\x1b[C"]) {
		const editor = fakeEditor();
		const h = host(editor);
		const p = new PlanSection();
		p.update(h.ctx, items(12));
		const comp = h.below.get("plan-section");
		comp.handleMouse(sgr(CLICK(5, 14), 10, 80, 8));
		h.tui.setFocus(comp);
		comp.handleInput(key);
		assert.equal(p.collapsed, false);
		assert.equal(nav.shown(), "plan");
		assert.deepEqual(editor.got, [key], "the key reaches the editor");
		p.shutdown(h.ctx);
	}
});

test("Esc returns to the editor and keeps the draft; scroll keys work, Space does not fold; Esc is not forwarded", () => {
	const editor = fakeEditor();
	const h = host(editor);
	const p = new PlanSection();
	p.update(h.ctx, items(12));
	const comp = h.below.get("plan-section");
	comp.handleMouse(sgr(CLICK(5, 14), 10, 80, 8));
	h.tui.setFocus(comp);
	comp.handleInput("\x1b[B");
	assert.deepEqual([p.cursor, p.offset], [1, 0], "↓ moves the selection; the window follows only at its edge");
	comp.handleInput("\x1b[6~");
	assert.deepEqual([p.cursor, p.offset], [7, 2]);
	comp.handleInput("\x1b[5~");
	assert.deepEqual([p.cursor, p.offset], [1, 1]);
	comp.handleInput("\x1b");
	assert.equal(h.tui.focusedComponent, editor);
	assert.equal(editor.focused, true);
	assert.deepEqual(editor.got, [], "Esc is consumed by Plan");
	assert.equal(editor.text, "draft in progress");
	p.shutdown(h.ctx);
});

test("typing refocuses the editor and forwards the first letter once; chords (Ctrl+U, Ctrl+Shift+U, Ctrl+Enter, Alt+Up) also refocus and forward", () => {
	for (const key of ["a", "\x15", "\x1b[85;6u", "\x1b[13;5u", "\x1b[1;3A"]) {
		const editor = fakeEditor();
		const h = host(editor);
		const p = new PlanSection();
		p.update(h.ctx, items(12));
		const comp = h.below.get("plan-section");
		comp.handleMouse(sgr(CLICK(5, 14), 10, 80, 8));
		h.tui.setFocus(comp);
		comp.handleInput(key);
		assert.equal(h.tui.focusedComponent, editor, JSON.stringify(key));
		assert.deepEqual(editor.got, [key], JSON.stringify(key));
		p.shutdown(h.ctx);
	}
});

// ---- keyboard path (regular mode): ↓ gives Plan REAL native focus, so viewport keys reach it ----
test("native focus contract: capturesViewportInput is true exactly while Plan is natively focused", () => {
	const editor = fakeEditor();
	const h = host(editor);
	const p = new PlanSection();
	p.update(h.ctx, items(12));
	const comp = h.below.get("plan-section");
	assert.equal(comp.capturesViewportInput, false);
	h.tui.setFocus(comp);
	assert.equal(comp.capturesViewportInput, true);
	h.tui.setFocus(editor);
	assert.equal(comp.capturesViewportInput, false);
	p.shutdown(h.ctx);
});

test("keyboard: ↓ on an empty editor focuses Plan natively; PageUp/PageDown/Home/End reach Plan, not the transcript; Esc leaves; a draft keeps ↓", () => {
	const editor = fakeEditor();
	const h = host(editor);
	const p = new PlanSection();
	p.update(h.ctx, items(20));
	h.setEditorText("typed");
	assert.equal(h.key("\x1b[B"), false, "a draft keeps ↓ for the editor");
	h.setEditorText("");
	assert.equal((p as any).focusByKeyboard(), true); // what Enter on the Plan title does (section-nav)
	assert.equal(h.tui.focusedComponent, h.below.get("plan-section"), "real native focus, editor blurred");
	assert.equal(p.focusedVisible(), true);
	assert.equal(h.key("\x1b[B"), true);
	assert.equal(p.cursor, 1);
	assert.equal(h.key("\x1b[6~"), true);
	assert.equal(p.cursor, 7);
	assert.equal(h.key("\x1b[F"), true);
	assert.deepEqual([p.cursor, p.offset], [19, 14]);
	assert.equal(h.key("\x1b[H"), true);
	assert.deepEqual([p.cursor, p.offset], [0, 0]);
	assert.deepEqual(h.transcriptKeys, [], "no viewport key went to the transcript while Plan is focused");
	assert.equal(h.key("\x1b"), true);
	assert.equal(h.tui.focusedComponent, editor);
	assert.equal(p.focusedVisible(), false);
	h.key("\x1b[6~");
	assert.deepEqual(h.transcriptKeys, ["\x1b[6~"], "unfocused: the transcript keeps PageDown");
	assert.equal(editor.text, "draft in progress");
	(p as any).focusByKeyboard();
	h.key("\x15");
	assert.deepEqual(editor.got, ["\x15"], "Ctrl+U goes back to the editor, once");
	assert.equal(h.tui.focusedComponent, editor);
	assert.equal(h.key("\x1b[13;5u"), false, "unfocused Ctrl+Enter is never consumed");
	p.shutdown(h.ctx);
});

// ---- state sanity ----
test("progress updates, shrinking lists clamp the offset, empty removes the section, shutdown cleans up", () => {
	const h = host(fakeEditor());
	const p = new PlanSection();
	let changes = 0;
	sec.bridge.onPlanChange = () => void changes++;
	p.update(h.ctx, items(12, 1));
	assert.match(h.lines(80)[1], /1\/12/);
	p.offset = 6;
	p.update(h.ctx, items(12, 5));
	assert.match(h.lines(80)[1], /5\/12/);
	p.update(h.ctx, items(4, 4));
	assert.equal(p.offset, 0);
	assert.equal(h.lines(80).length, 1 + 1 + 1 + 1 + 4 + 1); // footer line (was the bar)
	assert.equal(sec.bridge.planActive(), true);
	p.update(h.ctx, []);
	assert.equal(h.below.size, 0);
	assert.equal(sec.bridge.planActive(), false);
	p.update(h.ctx, items(3));
	assert.equal(h.inputs.size, 0);
	p.shutdown(h.ctx);
	assert.equal(h.below.size, 0);
	assert.equal(h.inputs.size, 0, "no listener left behind");
	assert.ok(changes >= 3);
	sec.bridge.onPlanChange = undefined;
});

for (const [name, cmd] of [
	["multi-row", MULTI],
	["single-row", SINGLE],
	["built-in", undefined],
] as const) {
	test(`tabs Status, Agentes, Plan on one bar (${name}); footer-only status is promoted into the widget only while Plan is active`, async () => {
		const { h, plan } = await boot(cmd, [rec()]);
		const before = h.lines(100);
		if (name !== "multi-row")
			assert.match(
				strip(h.statuses.get("nycode-status") ?? ""),
				/^ STATUS LINE {2}/,
				"inline label while Plan is inactive",
			);
		plan.update(h.ctx, items(12, 2));
		await new Promise((r) => setTimeout(r, 50));
		nav.open("plan"); // the tab state, not the render order, decides what shows: Plan is open only when someone opens it
		h.lines(100);
		const f = h.lines(100);
		assert.deepEqual(tabsOf(f), ["Status", "Agentes 1", "Plan 2/12"], f.join("\n"));
		assert.equal(f[0], "", "blank between the editor and the bar");
		assert.match(f[1]!, /^Status {3}Agentes 1 {3}Plan 2\/12\s*$/, "the bar has the tabs only");
		assert.match(f.at(-1)!, /^\d\d:\d\d · \d\/6 na tela/, "the plan detail is the footer line"); // footer line (was the bar)
		assert.equal(
			f[2],
			"─".repeat("Status   Agentes 1   ".length) +
				"━".repeat("Plan 2/12".length) +
				"─".repeat(100 - "Status   Agentes 1   Plan 2/12".length),
			"━ under the open tab only",
		);
		assert.equal(f.filter((l) => BAR.test(l)).length, 1, "one bar for the three groups");
		assert.equal(f.filter((l) => RULE.test(l)).length, 1, "one rule, none closing");
		assert.equal(f.filter((l) => l === "").length, 1, "one blank line for the whole set");
		assert.ok(!f.some((l) => /^ [▾▸] |PLAN|STATUS LINE|SUB AGENTS/.test(l)), "no chip titles");
		assert.match(f[3]!, /^#\s+estado\s+tarefa/, "the open Plan body starts right below the bar");
		assert.ok(!f.some((l) => /gate-runner|medium/.test(l)), "the closed tabs show no body");
		const per = [...h.below.values()].map((w) => w.render(100).map(strip)); // one pass in widget order, as nycode renders
		for (const g of per) assert.notEqual(g.at(-1), "", "no group ends blank");
		assert.ok(
			per.at(-1)!.length > 0 && per.at(-1)!.every((l: string) => !BAR.test(l) && l !== ""),
			"Plan, not drawing the bar, returns only its body",
		);
		assert.notEqual(f.at(-1), "─".repeat(100), "no closing rule below Plan");
		assert.deepEqual([...h.below.keys()].slice(-1), ["plan-section"], "Plan is the last widget");
		if (name !== "multi-row")
			assert.equal(h.statuses.get("nycode-status"), undefined, "promoted: no duplicate footer text");
		nav.open("status");
		const folded = h.lines(100);
		assert.ok(!folded.some((l) => /^#\s+estado/.test(l)), "closed Plan, Status open: no Plan body");
		assert.deepEqual(tabsOf(folded), ["Status", "Agentes 1", "Plan 2/12"]);
		plan.update(h.ctx, []);
		await new Promise((r) => setTimeout(r, 50));
		const after = h.lines(100);
		assert.ok(!tabsOf(after).some((t) => t.startsWith("Plan")), after.join("\n"));
		if (name !== "multi-row") {
			assert.ok(!h.below.has("nycode-statusline"), "widget gone with Plan");
			assert.match(strip(h.statuses.get("nycode-status") ?? ""), /^ STATUS LINE {2}/, "inline label is back");
		}
		assert.match(before[1]!, /^(Status {3})?Agentes 1( |$)/);
	});
}

test("Plan set before the status widget still ends below it (reassert after the status widget is re-set)", async () => {
	const { h, plan } = await boot(MULTI, []);
	plan.update(h.ctx, items(3));
	h.ctx.ui.setWidget(
		"nycode-statusline",
		(_t: any, _th: any) => ({ render: () => ["Status Line", "x"], invalidate() {} }),
		{ placement: "belowEditor" },
	);
	sec.bridge.reassertPlan();
	assert.deepEqual([...h.below.keys()].slice(-1), ["plan-section"]);
});
