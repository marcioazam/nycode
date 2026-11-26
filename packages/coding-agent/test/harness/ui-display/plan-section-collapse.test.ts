// Plan section + collapsible Sub Agents (docs/pi-interactive-display-2026-11-13.md, "Plan section"):
// Written before the code. Mouse events are decoded from SGR here by a copy of @nycode/tui's normalisation (local = screen - top);
// the native frame test drives the real SGR path at the final gate.
import assert from "node:assert/strict";
import { visibleWidth } from "@nycode/tui";
import { test } from "vitest";
import { PlanSection } from "../../../src/extensions/plan-mode/section.ts";
import * as panelMod from "../../../src/extensions/subagent/fleet-ui/panel.ts";
import * as chrome from "../../../src/extensions/subagent/fleet-ui/style/chrome.ts";
import { nav } from "../../../src/extensions/subagent/section-nav/nav.ts";
import {
	BAR,
	boot,
	CLICK,
	fakeEditor,
	host,
	items,
	MULTI,
	NOW,
	RULE,
	rec,
	sgr,
	strip,
	tabsOf,
	theme,
	tmp,
} from "./plan-section-support.ts";

// ---- Sub Agents collapse ----
test("Sub Agents frame: chip and rule above the rows, no fold symbol, nothing without rows", () => {
	const lines = ["● main", "├─ a", "└─ b", ""];
	assert.deepEqual(chrome.frameSubAgents(lines, true, theme, 40).map(strip), [
		"",
		" SUB AGENTS ",
		"─".repeat(40),
		"● main",
		"├─ a",
		"└─ b",
	]);
	assert.deepEqual(chrome.frameSubAgents([], false, theme, 40), [], "no rows: nothing");
});

test("Sub Agents tab: click on a closed name opens it, on the open one does nothing; Enter enters the list, Space/←/→ in the body never fold its tab; ↓ focuses the open tab", async () => {
	nav.unregister("plan");
	const { h } = await boot(MULTI, [rec()]);
	const fleet = h.below.get("nycode-fleet");
	const lines = () => fleet.render(100).map(strip);
	const at = () => lines()[1]!.indexOf("Agentes");
	nav.open("subagents");
	assert.equal(lines()[0], "", "row 0 is the spacing line");
	assert.match(lines()[1]!, /^Status {3}Agentes 1 {2}0\/1/, "the Sub Agents summary follows the last tab");
	assert.equal(fleet.handleMouse(sgr(CLICK(at() + 2, 1), 0, 100, 5)), undefined, "the spacing row is not the bar");
	assert.equal(fleet.handleMouse(sgr(CLICK(80, 2), 0, 100, 5)), undefined, "outside a tab name");
	assert.equal(fleet.handleMouse(sgr(CLICK(at() + 2, 4), 0, 100, 5)), undefined, "body clicks fall through");
	const before = lines().join("\n");
	assert.equal(
		fleet.handleMouse(sgr(CLICK(at() + 2, 2), 0, 100, 5)).handled,
		true,
		"the click on the open tab is consumed",
	);
	assert.equal(nav.shown(), "subagents", "and the tab stays open");
	assert.equal(lines().join("\n"), before, "nothing changes");
	assert.equal(fleet.handleMouse(sgr(CLICK(2, 2), 0, 100, 5)).handled, true, "a closed tab (Status) opens");
	assert.equal(nav.shown(), "status");
	assert.equal(lines().length, 3, "Agentes closed: blank, tabs, rule");
	assert.match(lines()[1]!, /^Status {3}Agentes 1\s*$/, "closed: no detail");
	assert.equal(fleet.handleMouse(sgr(CLICK(at() + 2, 2), 0, 100, 5)).handled, true, "a closed tab opens");
	assert.equal(nav.shown(), "subagents");
	assert.match(lines()[1]!, /^Status {3}Agentes 1 {2}0\/1/);
	nav.open("status");
	h.setEditorText("");
	assert.ok(h.key("\x1b[B") === true, "↓ focuses a tab");
	assert.equal(nav.title, "status", "the open tab");
	assert.equal(nav.shown(), "status");
	h.key("\x1b[C");
	h.key("\r"); // Enter: opens the tab and enters the list
	assert.equal(nav.shown(), "subagents");
	assert.match(lines()[3]!, /^❯ main|^○ main/, "the list starts right below the bar");
	for (const k of ["\x1b[D", "\x1b[D", "\x1b[C", " "]) {
		h.key(k);
		assert.equal(nav.shown(), "subagents", `key ${JSON.stringify(k)} in the body keeps the tab open`);
	}
});

/** Registers the Sub Agents tab the way fleet-ui does, for a controller used without the widget (the fold state lives in nav). */
function panelTab(c: any) {
	nav.resetTabs();
	nav.register({
		id: "subagents",
		active: () => c.rows().length > 0,
		hasBody: true,
		label: () => "Agentes 1",
		changed: () => c.tabChanged(),
		enter: () => c.enterBody(),
	});
}

test("PanelController: ← → Space never fold the tab (on main they do nothing); rows keep → ← x enter as before", () => {
	const c = new panelMod.PanelController({
		getSource: () => ({ list: () => [rec()], hasForeground: () => false }) as any,
		now: () => NOW,
	});
	panelTab(c);
	nav.open("subagents");
	const env = { editorText: "", editorFocused: true, overlayOpen: false };
	c.enterBody();
	assert.equal(c.selectedId, "a");
	c.handleKey("\x1b[D", env);
	assert.equal(c.sectionCollapsed, false, "← on a row without children still goes to main");
	assert.equal(c.selectedId, null);
	for (const k of ["\x1b[D", "\x1b[C", " ", "\x1b[D"]) {
		c.handleKey(k, env);
		assert.equal(c.sectionCollapsed, false, `main: ${JSON.stringify(k)} does not fold the tab`);
		assert.equal(c.view().collapsed, false);
		assert.equal(nav.shown(), "subagents");
	}
	assert.equal((c as any).toggleSection, undefined, "no group toggle left");
	c.enterBody();
	assert.equal(c.selectedId, "a");
	nav.unregister("subagents");
});

// ---- collapsed safety, heights, offset ----
test("closed tab: x and Enter act on nothing (no hidden agent is stopped or opened); ↓ lands on the title; one Esc returns to the editor; Ctrl+B still detaches", () => {
	const calls: string[] = [];
	const source: any = {
		list: () => [rec()],
		hasForeground: () => true,
		stop: (id: string) => {
			calls.push(`stop ${id}`);
			return "stopping";
		},
	};
	const c = new panelMod.PanelController({ getSource: () => source, now: () => NOW });
	panelTab(c);
	nav.open("subagents");
	const env = { editorText: "", editorFocused: true, overlayOpen: false };
	c.enterBody();
	assert.equal(c.selectedId, "a");
	nav.register({
		id: "run",
		active: () => true,
		hasBody: false,
		label: () => "Run",
		changed() {},
		enter: () => false,
	});
	nav.open("run"); // e.g. a tab click while a row is selected: Sub Agents is the closed tab now
	assert.equal(c.selectedId, null, "the selection leaves the hidden row");
	for (const k of ["x", "x"]) assert.equal(c.handleKey(k, env).action, undefined);
	assert.deepEqual(calls, []);
	const e2 = c.handleKey("\r", env);
	assert.equal(e2.action, undefined);
	assert.equal(c.focused, false, "Enter on the title just returns to the editor");
	assert.equal(c.enterBody(), true);
	assert.equal(c.selectedId, null, "↓ on a closed tab focuses the visible title, never a hidden row");
	assert.equal(c.focused, true);
	assert.deepEqual(c.handleKey("\x1b", env), { consume: true });
	assert.equal(c.focused, false, "a single Esc is back in the editor");
	assert.deepEqual(c.handleKey("\x02", env), { consume: true, action: { type: "detach" } });
	nav.unregister("run");
	nav.unregister("subagents");
});

for (const rows of [24, 40]) {
	test(`terminal ${rows} rows, Sub Agents and Plan both non-empty: each open tab is bounded, one truncation-free frame, one bar rule`, async () => {
		const { h, plan } = await boot(MULTI, [rec(), { ...rec(), id: "b", agent: "swarm-worker" }]);
		h.tui.terminal.rows = rows;
		plan.update(h.ctx, items(30, 4));
		for (const tab of ["plan", "subagents", "status"] as const) {
			nav.open(tab);
			h.lines(100);
			const f = h.lines(100);
			assert.ok(f.length <= 3 + 1 + 6 + (tab === "plan" ? 1 : 0), `${tab}: ${f.length} lines:\n${f.join("\n")}`);
			assert.equal(f.filter((l) => /truncated|…\s*\d+ more/.test(l)).length, 0, f.join("\n"));
			assert.equal(f.filter((l) => RULE.test(l)).length, 1, `${tab}: one rule, under the bar`);
			if (tab === "plan") assert.equal(f.length, 3 + 1 + 6 + 1, "bar, table header, 6 rows, footer");
		}
	});
}

test("Plan offset survives ordinary progress updates and clamps when the list shrinks", () => {
	const h = host(fakeEditor());
	const p = new PlanSection();
	p.update(h.ctx, items(20));
	p.offset = 2;
	p.update(h.ctx, items(20, 3)); // a checkbox ticked (item 3 is inside window [2, 8])
	assert.equal(p.offset, 2);
	p.update(
		h.ctx,
		items(20, 3).map((i) => ({ ...i, text: `${i.text}!` })),
	); // text changed
	assert.equal(p.offset, 2);
	p.update(h.ctx, items(8, 7));
	assert.equal(p.offset, 2);
	p.shutdown(h.ctx);
	nav.resetTabs();
});

// ---- keyboard focus chain on the real extensions (regular mode: no mouse) ----
const chipLine = (h: any, key: string) => h.below.get(key).render(100).map(strip)[1] as string;
const _statusFocused = (h: any) => /esc back/.test(chipLine(h, "nycode-statusline"));
const _fleetFocused = (h: any) =>
	h.below
		.get("nycode-fleet")
		.render(100)
		.map(strip)
		.some((l: string) => l.includes("❯"));
const DOWN = "\x1b[B",
	_UP = "\x1b[A",
	LEFT = "\x1b[D",
	RIGHT = "\x1b[C",
	_ESC = "\x1b";

test("Status tab mouse: a click on the name (bar row or its rule, local y=1-2) is consumed and changes nothing; the spacing, a miss and the body fall through; the tab survives a re-set widget", async () => {
	nav.resetTabs();
	const { h } = await boot(MULTI, []);
	const w = () => h.below.get("nycode-statusline");
	const lines = () => w().render(100).map(strip);
	assert.deepEqual(tabsOf(lines()), ["Status"], "the only active group");
	assert.equal(nav.shown(), "status");
	assert.equal(w().handleMouse(sgr(CLICK(3, 1), 0, 100, 5)), undefined, "row 0 is the blank spacing");
	assert.equal(w().handleMouse(sgr(CLICK(3, 4), 0, 100, 5)), undefined, "body clicks fall through");
	assert.equal(w().handleMouse({ type: "wheel", y: 1 }), undefined, "only a click counts");
	assert.equal(
		w().handleMouse(sgr(CLICK(40, 2), 0, 100, 5)),
		undefined,
		"a click away from the name does nothing (no whole-row band any more)",
	);
	const before = lines();
	assert.deepEqual(w().handleMouse(sgr(CLICK(3, 2), 0, 100, 5)), { handled: true, render: true });
	assert.deepEqual(lines(), before, "the open Status tab does not fold");
	assert.equal(nav.shown(), "status");
	assert.equal(lines().length, 5, "bar plus both HUD rows");
	const fresh = h.factories.get("nycode-statusline")(h.tui, theme);
	assert.equal(fresh.render(100).length, 5, "a re-set widget shows the same");
	assert.equal(fresh.handleMouse(sgr(CLICK(3, 3), 0, 100, 5)).handled, true, "the rule row under the name counts too");
	assert.equal(lines().length, 5);
	assert.match(lines()[2]!, /^━{6}─+$/);
});

test("Plan tab keys: ← → Space in the body never fold the tab; the label keeps d/t and the detail (keys, time) shows while the tab is open", async () => {
	const { h, plan } = await boot(MULTI, []);
	plan.update(h.ctx, items(12, 3));
	nav.open("plan");
	h.setEditorText("");
	h.lines(100); // one frame: the groups stamp their visual order
	h.key(DOWN); // the open tab (Plan)
	assert.equal(nav.title, "plan");
	h.key("\r"); // Enter: the body
	assert.equal(plan.focusedVisible(), true);
	// Time, window and keys live on the footer line under the table, not after the tab names.
	const head = (w = 100) => {
		h.lines(w);
		return h.lines(w).at(-1) ?? "";
	};
	h.lines(100);
	assert.match(h.lines(100).find((l: string) => BAR.test(l)) ?? "", /^Status {3}Plan 3\/12\s*$/);
	// The keys that fit (room = width - detail), most useful first, `esc back` always last.
	assert.match(head(50), /^00:00 · 3\/6 na tela · (?:↵ detalhes|o abrir plano) · esc back$/);
	assert.match(head(), /^00:00 · 3\/6 na tela · ↵ detalhes · o abrir plano · p pausar · esc back$/);
	// Amendment 2026-11-14: nothing folds. ← → Space in the body are not Plan keys any more (they go to the editor).
	for (const k of [LEFT, RIGHT, " ", LEFT]) {
		h.key(k);
		assert.equal(nav.shown(), "plan", `${JSON.stringify(k)} keeps Plan open`);
		assert.match(head(), /^00:00 /, "the detail stays");
	}
});

test("ui without TUI hooks (print/rpc): no listener, no throw; with hasUI false nothing is registered; later a full ui works", () => {
	const calls: string[] = [];
	const bare: any = {
		cwd: tmp,
		hasUI: true,
		ui: { setWidget: (k: string, c: unknown) => void calls.push(`${k}:${c === undefined ? "off" : "on"}`) },
	};
	const p = new PlanSection();
	assert.doesNotThrow(() => p.update(bare, items(3, 1)));
	assert.deepEqual(calls, ["plan-section:on"]);
	assert.doesNotThrow(() => p.shutdown(bare));
	const headless: any = {
		cwd: tmp,
		hasUI: false,
		ui: {
			setWidget: () => calls.push("headless"),
			onTerminalInput: () => {
				calls.push("listener");
				return () => {};
			},
		},
	};
	const q = new PlanSection();
	assert.doesNotThrow(() => q.update(headless, items(3, 1)));
	assert.equal(calls.includes("headless") || calls.includes("listener"), false);
	const h = host(fakeEditor());
	const r = new PlanSection();
	r.update(h.ctx, items(3, 1));
	assert.equal(h.inputs.size, 0, "Plan registers no key listener: its entry is the group title (section-nav)");
});

// A narrow terminal must not truncate the HUD rows before the layout sees them (the clock/cost would be cut off and nothing would stack).
const HUD = `printf '[Claude Sonnet 5.5 ◐ medium] │ home/user │ ⏱️  1m │ Cost $16.91\\nContext ━━━━━━━━━━ 10%% (98k/1.0M) │ Usage ━━━━ 4%% │ Weekly ━━━━ 39%%\\n✓ Bash ×19 | ✓ Read ×1\\n'`;
test("Status Line widget: narrow width reflows (rows are laid out before truncation) into one meters line, wide uses the same layout", async () => {
	const { h } = await boot(HUD, []);
	const body = (w: number) =>
		h
			.lines(w)
			.map(strip)
			.filter((l: string) => l !== "");
	for (let i = 0; i < 50 && !body(140).some((l: string) => /16\.91/.test(l)); i++)
		await new Promise((r) => setTimeout(r, 100));
	const narrow = body(50);
	assert.ok(
		narrow.some((l: string) => /^ctx .*5h .*wk /.test(l)),
		`the three meters share one line\n${narrow.join("\n")}`,
	);
	assert.ok(
		narrow.some((l: string) => /\$16\.91/.test(l)),
		"cost survives the narrow width",
	);
	assert.ok(narrow.every((l: string) => visibleWidth(l) <= 50));
	const wide = body(140);
	assert.ok(
		wide.some((l: string) => /^ctx .*5h .*wk /.test(l)) &&
			wide.some((l: string) => /^\[?Claude Sonnet 5\.5 .*\$16\.91/.test(l)),
		`same layout when wide, no right alignment\n${wide.join("\n")}`,
	);
});
