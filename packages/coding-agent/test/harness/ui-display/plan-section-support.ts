// Shared fixtures of the Plan section tests: a fake TUI and editor, SGR mouse decoding, and the real status-line and
// fleet extensions booted on a fake host.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll as after } from "vitest";
import { PlanSection } from "../../../src/extensions/plan-mode/section.ts";
import statusLine from "../../../src/extensions/status-line/index.ts";
import { registerFleetUi } from "../../../src/extensions/subagent/fleet-ui/index.ts";
import "../../../src/extensions/subagent/fleet-ui/panel.ts";
import "../../../src/extensions/subagent/fleet-ui/style/chrome.ts";
import { nav } from "../../../src/extensions/subagent/section-nav/nav.ts";
import { fleetTestEnv } from "../subagent/fleet-env.ts";

export const { tmp } = fleetTestEnv("interactive-display-plan-");
export const home = join(tmp, "home");
mkdirSync(join(home, ".claude"), { recursive: true });
process.env.HOME = home;
delete process.env.NYCODE_SUBAGENT;

export const strip = (s: string): string => s.replace(/\x1b\[[0-9;]*m/g, "");
export const theme = { fg: (_c: string, s: string) => s, bold: (s: string) => s };
export const items = (n: number, done = 0) =>
	Array.from({ length: n }, (_, i) => ({ step: i + 1, text: `item ${i + 1} ${"x".repeat(30)}`, completed: i < done }));

/** Fake TUI with nycode's focus semantics: setFocus flips `focused` on both components. */
export function fakeTui(editor: any, rows = 24) {
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
export function fakeEditor() {
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
export function sgr(data: string, top: number, width: number, height: number) {
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
export const CLICK = (x: number, y: number) => `\x1b[<0;${x};${y}M`;
export const WHEEL_DOWN = (x: number, y: number) => `\x1b[<65;${x};${y}M`;
export const WHEEL_UP = (x: number, y: number) => `\x1b[<64;${x};${y}M`;

/** Widget host copying nycode's setExtensionWidget/renderWidgetContainer (delete then set; insertion order). */
export function host(editor: any, rows = 24) {
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
export const withStatusTab = (): (() => void) => {
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

// ---- ordering with the real status-line and fleet extensions ----
export const MULTI = `printf '[m ◐ medium] ⏱️  1h 10m\\nContext 10%%\\n'`;
export const SINGLE = `printf '[m ◐ medium] ⏱️  1h 10m\\n'`;
export const NOW = Date.now();
export const rec = () =>
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
export async function boot(command: string | undefined, records: any[]) {
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
export const BAR = /^(Status|Agentes \d+|Todo \d+\/\d+|Plan \d+\/\d+|Run \d+)( {3}| {2}|$)/;
export const RULE = /^[━─]{20,}$/;
export const tabsOf = (lines: string[]) =>
	(lines.find((l) => BAR.test(l)) ?? "").match(/Status|Agentes \d+|(?:Todo|Plan) \d+\/\d+|Run \d+/g) ?? [];
