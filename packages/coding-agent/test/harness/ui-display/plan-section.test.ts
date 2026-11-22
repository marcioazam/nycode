// Plan section + collapsible Sub Agents (docs/pi-interactive-display-2026-11-13.md, "Plan section"):
// Written before the code. Mouse events are decoded from SGR here by a copy of @nycode/tui's normalisation (local = screen - top);
// the native frame test drives the real SGR path at the final gate.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { visibleWidth } from "@nycode/tui";
import { afterAll as after, test } from "vitest";
import { PlanSection } from "../../../src/extensions/plan-mode/section.ts";
import statusLine from "../../../src/extensions/status-line/index.ts";
import { registerFleetUi } from "../../../src/extensions/subagent/fleet-ui/index.ts";
import * as panelMod from "../../../src/extensions/subagent/fleet-ui/panel.ts";
import * as sec from "../../../src/extensions/subagent/fleet-ui/section.ts";
import * as chrome from "../../../src/extensions/subagent/fleet-ui/style/chrome.ts";
import { nav } from "../../../src/extensions/subagent/section-nav/nav.ts";
import { fleetTestEnv } from "../subagent/fleet-env.ts";

const { tmp } = fleetTestEnv("interactive-display-plan-");
const home = join(tmp, "home");
mkdirSync(join(home, ".claude"), { recursive: true });
process.env.HOME = home;
delete process.env.NYCODE_SUBAGENT;

const strip = (s: string): string => s.replace(/\x1b\[[0-9;]*m/g, "");
const theme = { fg: (_c: string, s: string) => s, bold: (s: string) => s };
const items = (n: number, done = 0) =>
	Array.from({ length: n }, (_, i) => ({ step: i + 1, text: `item ${i + 1} ${"x".repeat(30)}`, completed: i < done }));

/** Fake TUI with nycode's focus semantics: setFocus flips `focused` on both components. */
function fakeTui(editor: any, rows = 24) {
	const tui: any = {
		focusedComponent: editor,
		terminal: { rows },
		renders: 0,
		requestRender() {
			tui.renders++;
		},
		setFocus(c: any) {
			if (tui.focusedComponent && tui.focusedComponent !== c) tui.focusedComponent.focused = false;
			tui.focusedComponent = c;
			if (c) c.focused = true;
		},
	};
	return tui;
}
function fakeEditor() {
	const e: any = {
		text: "draft in progress",
		got: [] as string[],
		focused: true,
		render: () => [],
		invalidate() {},
		getText: () => e.text,
		setText() {},
		handleInput: (d: string) => void e.got.push(d),
	};
	return e;
}
/** SGR `ESC[<b;x;yM` (1-based) → TuiMouseEvent local to a component whose first row is `top`. */
function sgr(data: string, top: number, width: number, height: number) {
	const m = /^\x1b\[<(\d+);(\d+);(\d+)([Mm])$/.exec(data)!;
	const b = Number(m[1]);
	const wheel = (b & 64) !== 0;
	return {
		type: wheel ? "wheel" : m[4] === "M" ? "click" : "release",
		button: wheel ? "none" : "left",
		x: Number(m[2]) - 1,
		y: Number(m[3]) - 1 - top,
		screenX: Number(m[2]) - 1,
		screenY: Number(m[3]) - 1,
		width,
		height,
		shift: false,
		alt: false,
		ctrl: false,
		...(wheel ? { wheelDelta: (b & 1) === 1 ? 3 : -3 } : {}),
	} as any;
}
const CLICK = (x: number, y: number) => `\x1b[<0;${x};${y}M`;
const WHEEL_DOWN = (x: number, y: number) => `\x1b[<65;${x};${y}M`;
const WHEEL_UP = (x: number, y: number) => `\x1b[<64;${x};${y}M`;

/** Widget host copying nycode's setExtensionWidget/renderWidgetContainer (delete then set; insertion order). */
function host(editor: any, rows = 24) {
	nav.resetTabs(); // the tab state is shared by the whole process: every test starts with Status open
	const transcriptKeys: string[] = [];
	const tui = fakeTui(editor, rows);
	const below = new Map<string, any>();
	const factories = new Map<string, any>();
	const statuses = new Map<string, string | undefined>();
	const inputs = new Set<(d: string) => { consume?: boolean } | undefined>();
	let editorText = editor.text;
	const ctx: any = {
		cwd: tmp,
		hasUI: true,
		model: { id: "m", name: "m" },
		thinkingLevel: "off",
		ui: {
			theme,
			setStatus: (k: string, v: string | undefined) => void statuses.set(k, v),
			setWidget(key: string, content: any, o?: any) {
				below.delete(key);
				factories.delete(key);
				if (content === undefined) return;
				factories.set(key, content);
				assert.equal(o?.placement, "belowEditor");
				below.set(key, content(tui, theme));
			},
			notify() {},
			onTerminalInput: (l: any) => {
				inputs.add(l);
				return () => void inputs.delete(l);
			},
			getEditorText: () => editorText,
		},
		sessionManager: {
			getSessionId: () => "s",
			getSessionFile: () => undefined,
			getSessionName: () => undefined,
			getBranch: () => [],
		},
		getContextUsage: () => undefined,
		isProjectTrusted: () => false,
	};
	return {
		tui,
		ctx,
		below,
		factories,
		statuses,
		inputs,
		setEditorText: (t: string) => {
			editorText = t;
		},
		// nycode order: extension listeners; then the fullscreen viewport takes PageUp/PageDown/Home/End for the transcript unless
		// the focused component says `capturesViewportInput`; then the focused component. Editor stub: not captured, no handler here.
		key: (d: string) => {
			for (const l of [...inputs]) {
				const r = l(d);
				if (r?.consume) return true;
			}
			const f = tui.focusedComponent;
			if (/^\x1b\[(5~|6~|H|F|1~|4~)$/.test(d) && !f?.capturesViewportInput) {
				transcriptKeys.push(d);
				return true;
			}
			if (f && f !== editor) {
				f.handleInput?.(d);
				return true;
			}
			return false;
		},
		transcriptKeys,
		lines: (w: number) => [...below.values()].flatMap((c) => c.render(w)).map(strip),
	};
}

/** A second (body-less) tab so Plan can be the closed one; returns the cleanup. Plan alone is always the shown tab. */
const withStatusTab = (): (() => void) => {
	nav.register({
		id: "status",
		active: () => true,
		hasBody: false,
		label: () => "Status",
		changed() {},
		enter: () => false,
	});
	return () => nav.unregister("status");
};

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
		// Owner request (2026-11-14): time, window and keys moved from the bar to a footer line under the table.
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
	assert.equal(h.lines(80).length, 1 + 1 + 1 + 1 + 3 + 1); // footer line (owner, 2026-11-14; was the bar)
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
	assert.equal(h.lines(80).length, 1 + 1 + 1 + 1 + 4 + 1); // footer line (owner, 2026-11-14; was the bar)
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

// ---- ordering with the real status-line and fleet extensions ----
const MULTI = `printf '[m ◐ medium] ⏱️  1h 10m\\nContext 10%%\\n'`;
const SINGLE = `printf '[m ◐ medium] ⏱️  1h 10m\\n'`;
const NOW = Date.now();
const rec = () =>
	({
		v: 1,
		id: "a",
		parentId: null,
		depth: 1,
		agent: "gate-runner",
		task: "run",
		background: false,
		state: "running",
		startedAt: NOW - 1000,
		updatedAt: NOW,
		turns: 1,
		toolCalls: 1,
		tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, context: 1 },
		cost: 0,
		ownerPid: process.pid,
		activity: "x",
	}) as any;
async function boot(command: string | undefined, records: any[]) {
	writeFileSync(
		join(home, ".claude", "settings.json"),
		JSON.stringify(command ? { statusLine: { type: "command", command } } : {}),
	);
	const editor = fakeEditor();
	const h = host(editor);
	const handlers = new Map<string, Array<(e: any, c: any) => void>>();
	const nycode = {
		on: (n: string, f: any) => handlers.set(n, [...(handlers.get(n) ?? []), f]),
		events: { on: () => () => {} },
		registerCommand() {},
		getSettings: () => ({}),
		registerShortcut() {},
	};
	const source = { list: () => records, onChange: () => () => {}, hasForeground: () => false };
	registerFleetUi(nycode as any, () => source as any);
	statusLine(nycode as any);
	const plan = new PlanSection();
	for (const f of handlers.get("session_start") ?? []) f({}, h.ctx);
	for (
		let i = 0;
		i < 40 &&
		!(command
			? command.includes("\\n")
				? h.below.has("nycode-statusline")
				: h.statuses.get("nycode-status")?.includes("STATUS LINE")
			: h.statuses.has("nycode-status"));
		i++
	)
		await new Promise((r) => setTimeout(r, 50));
	await new Promise((r) => setTimeout(r, 100));
	after(() => {
		plan.shutdown(h.ctx);
		for (const f of handlers.get("session_shutdown") ?? []) f({}, h.ctx);
	});
	return { h, plan, handlers, editor };
}
const BAR = /^(Status|Agentes \d+|Todo \d+\/\d+|Plan \d+\/\d+|Run \d+)( {3}| {2}|$)/;
const RULE = /^[━─]{20,}$/;
const tabsOf = (lines: string[]) =>
	(lines.find((l) => BAR.test(l)) ?? "").match(/Status|Agentes \d+|(?:Todo|Plan) \d+\/\d+|Run \d+/g) ?? [];

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
		assert.match(f.at(-1)!, /^\d\d:\d\d · \d\/6 na tela/, "the plan detail is the footer line"); // footer line (owner, 2026-11-14; was the bar)
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
	// Owner request (2026-11-14): time, window and keys live on the footer line under the table, not after the tab names.
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
