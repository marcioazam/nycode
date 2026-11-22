// Display assembled from the REAL registerFleetUi + status-line extensions over a fake widget host
// (docs/pi-interactive-display-2026-11-13.md):
// The host copies nycode's InteractiveMode.setExtensionWidget (delete from both maps, then Map.set) and
// renderWidgetContainer (iterate insertion order, no sort); it is a model of those 20 lines, not the native TUI.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { visibleWidth } from "@nycode/tui";
import { afterAll as after, test, vi } from "vitest";
import statusLine from "../../../src/extensions/status-line/index.ts";
import { registerFleetUi } from "../../../src/extensions/subagent/fleet-ui/index.ts";
import { nav } from "../../../src/extensions/subagent/section-nav/nav.ts";
import { fleetTestEnv } from "../subagent/fleet-env.ts";

const { tmp } = fleetTestEnv("interactive-display-assembled-");
const home = join(tmp, "home");
mkdirSync(join(home, ".claude"), { recursive: true });
process.env.HOME = home;
delete process.env.NYCODE_SUBAGENT;
process.env.NO_COLOR = ""; // palette keeps color codes: ANSI correctness is part of the check

// The running mark depends on the wall clock (palette.ts spinnerAt): keep it still.
vi.useFakeTimers({ toFake: ["Date"] });
vi.setSystemTime(1_800_000_000_000);
const NOW = Date.now();
const strip = (s: string): string => s.replace(/\x1b\[[0-9;]*m/g, "");
const theme = {
	fg: (c: string, s: string) => `\x1b[3${c.length % 8}m${s}\x1b[39m`,
	bold: (s: string) => `\x1b[1m${s}\x1b[22m`,
};
const rec = (over: Record<string, unknown> = {}) =>
	({
		v: 1,
		id: "a",
		parentId: null,
		depth: 1,
		agent: "gate-runner",
		task: "run the gate",
		background: false,
		state: "running",
		provider: "anthropic",
		model: "claude-haiku-5-5",
		effort: "medium",
		modelSeen: true,
		effortSeen: true,
		startedAt: NOW - 60_000,
		updatedAt: NOW,
		turns: 1,
		toolCalls: 1,
		tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, context: 114_400 },
		cost: 1.2,
		ownerPid: process.pid,
		activity: "Reading files",
		...over,
	}) as any;

/** Boots both extensions in registration order (fleet, then status line) on a fake host. */
async function boot(command: string | undefined, records: any[]) {
	writeFileSync(
		join(home, ".claude", "settings.json"),
		JSON.stringify(command ? { statusLine: { type: "command", command } } : {}),
	);
	const handlers = new Map<string, Array<(e: any, c: any) => void>>();
	const nycode = {
		on: (n: string, h: any) => handlers.set(n, [...(handlers.get(n) ?? []), h]),
		events: { on: () => () => {} },
		registerCommand() {},
		getSettings: () => ({}),
		registerShortcut() {},
	};
	const below = new Map<string, { render(w: number): string[] }>();
	const statuses = new Map<string, string>();
	const ctx = {
		cwd: tmp,
		hasUI: true,
		model: { id: "m", name: "m" },
		thinkingLevel: "off",
		ui: {
			theme,
			setStatus: (k: string, v: string) => void statuses.set(k, v),
			setWidget(key: string, content: any, options?: { placement?: string }) {
				below.delete(key); // nycode: removeExisting() on both maps, then set: a re-set moves the widget last
				if (content === undefined) return;
				assert.equal(options?.placement, "belowEditor");
				below.set(key, content({ requestRender() {} }, theme));
			},
			notify() {},
			onTerminalInput: () => () => {},
			getEditorText: () => "",
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
	const source = { list: () => records, onChange: () => () => {}, hasForeground: () => false };
	registerFleetUi(nycode as any, () => source as any);
	statusLine(nycode as any);
	for (const h of handlers.get("session_start") ?? []) h({}, ctx);
	for (
		let i = 0;
		i < 60 &&
		![...below.keys()].includes("nycode-statusline") &&
		!(command && !command.includes("\\n") && statuses.get("nycode-status")?.includes("STATUS LINE"));
		i++
	)
		await new Promise((r) => setTimeout(r, 50));
	await new Promise((r) => setTimeout(r, 100));
	const shutdown = () => {
		for (const h of handlers.get("session_shutdown") ?? []) h({}, ctx);
	};
	after(shutdown);
	const frame = (width: number): string[] => [...below.values()].flatMap((w) => w.render(width)).map(strip);
	return { below, statuses, frame, shutdown };
}

const MULTI = `printf '[m ◐ medium] ⏱️  1h 10m\\nContext 10%%\\n'`;
const SINGLE = `printf '[m ◐ medium] ⏱️  1h 10m\\n'`;
const TABS = /^(Status|Agentes \d+)( {3}| {2}|$)/;
/** The rule under the bar: ━ under the open tab's name, ─ elsewhere, the whole width. */
const isBarRule = (l: string, w: number) => l.length === w && /^━+─*$/.test(l);
const ruleCount = (lines: string[], w: number) => lines.filter((l) => l.length === w && /^[━─]+$/.test(l)).length;

for (const width of [80, 120, 200]) {
	test(`@${width} no agents: the bar (blank, Status tab, rule) first, the Status body right below, no Agentes tab, no orphan blank`, async () => {
		const s = await boot(MULTI, []);
		nav.resetTabs();
		const f = s.frame(width);
		assert.equal(f[0], "", "blank spacing line between the editor and the bar");
		assert.match(f[1]!, /^Status\s*$/, f.join("\n"));
		assert.ok(
			isBarRule(f[2]!, width) && f[2]!.startsWith(`${"━".repeat("Status".length)}─`),
			"rule across the width, ━ under the open tab",
		);
		assert.equal(f[3], "m ◐ medium ◷ 1h10m", "the body follows the bar with no label or rule of its own");
		assert.ok(
			!f.some((l) => /Agentes|SUB AGENTS|STATUS LINE/.test(l)) && f.filter((l) => l === "").length === 1,
			f.join("\n"),
		);
		assert.notEqual(f.at(-1), "", "the group does not end blank");
		assert.equal(ruleCount(f, width), 1, "only the bar rule");
		s.shutdown();
	});

	test(`@${width} one agent: bar of Status + Agentes tabs, rule, then only the open tab's body (main row, agent rows; Status body when Status is open)`, async () => {
		const s = await boot(MULTI, [rec()]);
		nav.resetTabs();
		assert.deepEqual([...s.below.keys()], ["nycode-fleet", "nycode-statusline"], "fleet is above the status line");
		let f = s.frame(width);
		assert.equal(f[0], "", "blank line between the editor and the bar");
		assert.ok(/^Status {3}Agentes 1( |$)/.test(f[1]!) && isBarRule(f[2]!, width), f.join("\n"));
		assert.equal(f.filter((l) => TABS.test(l)).length, 1, "one bar");
		assert.equal(
			f[3],
			"m ◐ medium ◷ 1h10m",
			"Status is open by default: its body right under the bar, no Agentes rows",
		);
		assert.ok(!f.some((l) => l.startsWith("● main")));
		nav.open("subagents");
		f = s.frame(width);
		f = s.frame(width);
		const main = f.findIndex((l) => l.startsWith("● main"));
		const agent = f.findIndex((l) => /^└─ \S gate-runner/.test(l));
		assert.ok(main === 3 && main < agent, f.join("\n"));
		assert.equal(main, 3, "main row right under the bar rule");
		assert.ok(!f.some((l) => l.startsWith("m ◐ medium")), "the Status body is hidden");
		assert.equal(ruleCount(f, width), 1, "one rule only: the bar rule");
		assert.deepEqual(
			f.flatMap((l, i) => (l === "" ? [i] : [])),
			[0],
			"no other blank line",
		);
		for (const w of s.below.values()) {
			const g = w.render(width).map(strip);
			assert.notEqual(g.at(-1), "", "no group ends blank");
		}
		for (const l of [...s.below.values()].flatMap((w) => w.render(width)))
			assert.ok(visibleWidth(l) <= width, strip(l));
		assert.ok(f.some((l) => /\[(anthropic\/)?claude-haiku-5-5 ?· ?medium\]/.test(l)));
		if (width === 120) console.log(f.join("\n"));
		s.shutdown();
	});

	test(`@${width} only finished agents: no footer hint, no Agentes tab, only the Status bar`, async () => {
		const s = await boot(MULTI, [rec({ state: "done", endedAt: NOW - 1000 })]);
		nav.resetTabs();
		const f = s.frame(width);
		assert.equal(f[0], "", f.join("\n"));
		assert.ok(!f.some((l) => /finished/.test(l)), f.join("\n"));
		assert.equal(f.filter((l) => l === "").length, 1, "blank before the bar only");
		assert.ok(!f.some((l) => /Agentes|SUB AGENTS/.test(l)), f.join("\n"));
		assert.deepEqual(
			f.flatMap((l, i) => (isBarRule(l, width) ? [i] : [])),
			[2],
			"only the bar rule",
		);
		assert.match(f[1]!, /^Status\s*$/);
		s.shutdown();
	});
}

test("single-row status line (footer path) carries the label and the tidy clock", async () => {
	const s = await boot(SINGLE, []);
	const footer = strip(s.statuses.get("nycode-status") ?? "");
	assert.equal(footer, " STATUS LINE  m ◐ medium ◷ 1h10m");
	assert.ok(!s.below.has("nycode-statusline"), "no widget for one row");
	assert.equal(visibleWidth("◷"), 1);
	s.shutdown();
});

test("built-in segment (no statusLine configured) carries the label too", async () => {
	const s = await boot(undefined, []);
	assert.match(strip(s.statuses.get("nycode-status") ?? ""), /^ STATUS LINE {2}○ ready$/);
	s.shutdown();
});

test("multi-row: the footer segment stays unlabelled (the Status tab identifies it): no duplicate heading", async () => {
	const s = await boot(MULTI, []);
	nav.resetTabs();
	assert.ok(!strip(s.statuses.get("nycode-status") ?? "").includes("STATUS LINE"));
	assert.equal(s.frame(80).filter((l) => /^Status\b/.test(l)).length, 1);
	assert.ok(!s.frame(80).some((l) => l.includes("STATUS LINE")));
	s.shutdown();
});
