// Display polish (docs/pi-interactive-display-2026-11-13.md):
import assert from "node:assert/strict";
import { visibleWidth } from "@nycode/tui";
import { test } from "vitest";
import * as sl from "../../../src/extensions/status-line/rows.ts";
import * as panel from "../../../src/extensions/subagent/fleet-ui/panel.ts";
import * as chrome from "../../../src/extensions/subagent/fleet-ui/style/chrome.ts";
import * as vm from "../../../src/extensions/subagent/fleet-ui/view-model.ts";
import * as viewer from "../../../src/extensions/subagent/fleet-ui/viewer.ts";
import { fleetTestEnv } from "../subagent/fleet-env.ts";

fleetTestEnv("interactive-display-");

const NOW = 1_000_000;
const plain = { fg: (_c: string, s: string) => s, bold: (s: string) => s };
// Tags each role so tests can see which role painted which text.
const tagged = { fg: (c: string, s: string) => `<${c}>${s}</${c}>`, bold: (s: string) => `<b>${s}</b>` };
const strip = (s: string): string => s.replace(/\x1b\[[0-9;]*m/g, "").split(/<\/?[a-zA-Z]+>/g).join("");
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
		startedAt: NOW - 60_000,
		updatedAt: NOW,
		turns: 1,
		toolCalls: 1,
		tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, context: 114_400 },
		cost: 1.234,
		ownerPid: 1,
		activity: "Reading files",
		...over,
	}) as any;
const HAIKU = { provider: "anthropic", model: "claude-haiku-5-5", effort: "medium", modelSeen: true, effortSeen: true };
const rowsOf = (records: any[], panelMode = true) =>
	vm.buildRows(records, { now: NOW, panel: panelMode, mainRoot: true });
const viewOf = (rows: any[]) => ({
	rows,
	focused: false,
	selectedId: null,
	hint: "1 running · ↓ to manage",
	hintColor: "muted",
	running: rows.length,
	finished: 0,
});
const MAIN = { state: "idle", elapsedMs: 5_000, contextTokens: 5_000, cost: 0.5 };

test("conditional: blank spacing line, Sub Agents chip and rule right below it only with child rows; nothing orphaned without them", () => {
	assert.deepEqual(chrome.frameSubAgents([], false, plain, 80), []);
	assert.deepEqual(
		chrome.frameSubAgents(["✓ 2 finished · /tasks", ""], false, plain, 80),
		["", "✓ 2 finished · /tasks"],
		"finished hint only: still a group, blank first, none last",
	);
	const rows = rowsOf([rec({ ...HAIKU })]);
	const lines = chrome.frameSubAgents(
		panel.renderPanel({ ...viewOf(rows), main: MAIN } as any, plain, 100),
		true,
		plain,
		100,
	);
	assert.equal(lines[0], "", "the group opens with one blank spacing line");
	assert.equal(lines[1], "\x1b[7m SUB AGENTS \x1b[27m", "chip with no fold symbol");
	assert.equal(lines[2], "─".repeat(100), "the rule sits right below the chip");
	assert.equal(lines.filter((l: string) => strip(l) === " SUB AGENTS ").length, 1);
	assert.ok(lines[3].startsWith("● main"), "main row keeps its place right under the rule");
	assert.ok(lines.slice(3).some((l: string) => l.includes("gate-runner")));
	assert.notEqual(lines.at(-1), "", "the group does not end with a blank line");
	assert.ok(!lines.slice(1).includes(""), "no other blank line; no closing rule");
	assert.equal(lines.filter((l: string) => l === "─".repeat(100)).length, 1);
});

test("Status Line group: blank spacing line, then the chip, its rule, the rows untouched; every group opens blank and never ends blank", () => {
	assert.deepEqual(chrome.frameStatusLine([], plain, 80), []);
	assert.deepEqual(chrome.frameStatusLine(["model", "ctx"], plain, 80).map(strip), [
		"",
		" STATUS LINE ",
		"─".repeat(80),
		"model",
		"ctx",
	]);
	const groups = [
		chrome.frameSubAgents(["● main", "└─ a", ""], true, plain, 40),
		chrome.frameSubAgents(["● main", "└─ a", ""], true, plain, 40, "1/2"),
		chrome.frameSubAgents(["✓ 1 finished · /tasks", ""], false, plain, 40),
		chrome.frameStatusLine(["model", "ctx"], plain, 40),
		chrome.frameStatusLine(["one"], plain, 40),
	];
	for (const g of groups) {
		assert.equal(g[0], "", "first line of every group is blank");
		assert.notEqual(g.at(-1), "", "no group ends with a blank line");
		assert.equal(g.filter((l: string) => l === "").length, 1, "exactly one blank line");
	}
	assert.deepEqual(sl.renderStatusRows(["a", "b"], 80, []), ["a", "b"], "renderStatusRows itself is unchanged");
});

test("headings and rule are dim, the title is bold, and NO_COLOR-style plain themes add no codes", () => {
	assert.equal(
		chrome.heading("Sub Agents", tagged, 80, "subagents"),
		"<b>\x1b[7m<accent> SUB AGENTS </accent>\x1b[27m</b>",
		"no fold symbol",
	);
	assert.equal(
		chrome.heading("Sub Agents 2 running", tagged, 80, "subagents"),
		"<b>\x1b[7m<accent> SUB AGENTS </accent>\x1b[27m</b><dim> 2 running</dim>",
	);
	assert.equal(chrome.rule(tagged, 5), "<dim>─────</dim>");
	assert.equal(chrome.heading("Status Line", plain, 80, "statusline"), "\x1b[7m STATUS LINE \x1b[27m");
	assert.equal(
		chrome.heading("Plan 3/20", tagged, 80, "plan", "accent"),
		"<b>\x1b[7m<accent> PLAN </accent>\x1b[27m</b><dim> 3/20</dim>",
		"focused Plan: role override",
	);
});

test("the three section chips differ in name and in color role (SGR, reverse video), and the detail after the chip stays dim", () => {
	const sgr = {
		fg: (c: string, s: string) => `\x1b[${{ accent: 34, success: 32, warning: 33, dim: 90 }[c]}m${s}\x1b[39m`,
		bold: (s: string) => `\x1b[1m${s}\x1b[22m`,
	};
	const kinds = ["subagents", "statusline", "plan"] as const;
	const out = kinds.map((k) =>
		chrome.heading(
			{ subagents: "Sub Agents 2 running", statusline: "Status Line", plan: "Plan 3/20" }[k],
			sgr,
			80,
			k,
		),
	);
	const plainOut = out.map((l) => l.replace(/\x1b\[[0-9;]*m/g, ""));
	assert.deepEqual(
		plainOut.map((l) => /^ ([A-Z]+(?: [A-Z]+)*) /.exec(l)?.[1]),
		["SUB AGENTS", "STATUS LINE", "PLAN"],
	);
	assert.ok(
		plainOut.every((l) => !/[▸▾]/.test(l)),
		"no fold symbol in the chip",
	);
	assert.ok(
		plainOut.every((l) => !/[◆●■]/.test(l)),
		"the glyphs are gone",
	);
	for (const l of out)
		assert.match(
			l,
			/^\x1b\[1m\x1b\[7m\x1b\[\d+m [A-Z ]+ \x1b\[39m\x1b\[27m\x1b\[22m/,
			"bold, reverse video around the role color",
		);
	assert.equal(
		new Set(out.map((l) => /^\x1b\[1m\x1b\[7m(\x1b\[\d+m)/.exec(l)?.[1])).size,
		3,
		"one color SGR per section",
	);
	assert.match(out[0], /\x1b\[90m 2 running\x1b\[39m$/);
	assert.match(out[2], /\x1b\[90m 3\/20\x1b\[39m$/);
});

test("model: neutral text (dim once finished), provider and effort dim; only a costly effort (max/xhigh) stands out while live", () => {
	assert.equal(
		chrome.styleModelMeta("[anthropic/claude-haiku-5-5 · medium]", tagged, true),
		"<dim>[</dim><dim>anthropic/</dim><text>claude-haiku-5-5</text><dim> · </dim><dim>medium</dim><dim>]</dim>",
	);
	assert.equal(
		chrome.styleModelMeta("[claude-haiku-5-5·high]", tagged, false),
		"<dim>[</dim><dim>claude-haiku-5-5</dim><dim>·</dim><dim>high</dim><dim>]</dim>",
	);
	assert.equal(
		chrome.styleModelMeta("[claude-opus-5 · max]", tagged, true),
		"<dim>[</dim><text>claude-opus-5</text><dim> · </dim><warning>max</warning><dim>]</dim>",
	);
	assert.equal(
		chrome.styleModelMeta("[claude-opus-5 · max]", tagged, false),
		"<dim>[</dim><dim>claude-opus-5</dim><dim> · </dim><dim>max</dim><dim>]</dim>",
		"finished: no emphasis",
	);
	assert.equal(
		chrome.styleModelMeta("[? · ?]", tagged, true),
		"<dim>[</dim><text>?</text><dim> · </dim><dim>?</dim><dim>]</dim>",
	);
	assert.equal(chrome.styleModelMeta("odd", tagged, true), "<dim>odd</dim>");
	const row = rowsOf([rec({ ...HAIKU })])[0];
	const o = panel.renderRow(row, false, tagged, 600);
	assert.ok(o.includes("<text>claude-haiku-5-5</text>") && !o.includes("<accent>claude"), o);
});

test("model styling does not change the text: full id stays in the row (wide) and in the viewer metadata", async () => {
	const row = rowsOf([rec({ ...HAIKU })])[0];
	assert.ok(
		strip(panel.renderRow(row, false, tagged, 600)).includes("gate-runner [anthropic/claude-haiku-5-5 · medium]"),
	);
	const src = {
		list: () => [rec({ ...HAIKU })],
		readTranscript: () => ({ items: [], next: 0 }),
		stop: () => "stopping",
		send: () => "queued",
		hasForeground: () => false,
		detachForeground: () => 0,
		onChange: () => () => {},
	};
	const lines = new viewer.ViewerComponent({
		source: src as any,
		theme: plain,
		id: "a",
		done() {},
		requestRender() {},
		rows: () => 30,
		now: () => NOW,
		poll: false,
	}).render(120);
	// Viewer header (zzzzzzzzzzzzzz-onda5-viewer.patch, runtimeSummary): one `model · effort` line; an observed value has no suffix (was `Model: … (observed)`).
	assert.ok(lines.includes("anthropic/claude-haiku-5-5 · medium"), lines.slice(0, 4).join("\n"));
});

test("clock: stopwatch emoji becomes ◷ with one space and tight units; other text and ANSI survive", () => {
	assert.equal(chrome.tidyClock("⏱️  1h 10m"), "◷ 1h10m");
	assert.equal(chrome.tidyClock("⏱ 2d 3h"), "◷ 2d3h");
	assert.equal(chrome.tidyClock("⏱️  42s"), "◷ 42s");
	assert.equal(chrome.tidyClock("⏱️  <1m"), "◷ <1m");
	assert.equal(chrome.tidyClock("\x1b[38;2;86;95;137m⏱️  1h 10m\x1b[0m"), "\x1b[38;2;86;95;137m◷ 1h10m\x1b[0m");
	assert.equal(chrome.tidyClock("⏱ expired"), "⏱ expired", "non-duration text is left alone");
	assert.equal(chrome.tidyClock("Context 10% | 1h 10m"), "Context 10% | 1h 10m");
	assert.equal(visibleWidth("◷"), 1);
	assert.equal(visibleWidth(chrome.tidyClock("⏱️  1h 10m")), 7);
	assert.ok(
		!/\p{Extended_Pictographic}/u.test(chrome.tidyClock("⏱️  1h 10m")) &&
			!chrome.tidyClock("⏱️  1h 10m").includes("\uFE0F"),
	);
});

test("snapshots at 80 / 120 / 200 columns: width, ANSI correctness, ANSI-stripped sample", () => {
	const records = [
		rec({ ...HAIKU }),
		rec({
			id: "b",
			agent: "swarm-worker",
			task: "x".repeat(300),
			provider: "anthropic",
			model: "claude-sonnet-5-5",
			effort: "high",
			modelSeen: true,
			effortSeen: true,
		}),
	];
	const rows = rowsOf(records);
	const ansi = {
		fg: (c: string, s: string) => `\x1b[3${c.length % 8}m${s}\x1b[39m`,
		bold: (s: string) => `\x1b[1m${s}\x1b[22m`,
	};
	for (const width of [80, 120, 200]) {
		const lines = chrome.frameSubAgents(
			panel.renderPanel({ ...viewOf(rows), main: MAIN } as any, ansi, width),
			true,
			ansi,
			width,
		);
		for (const l of lines) assert.ok(visibleWidth(l) <= width, `@${width}: ${strip(l)}`);
		for (const l of lines)
			assert.equal((l.match(/\x1b\[1m/g) ?? []).length, (l.match(/\x1b\[22m/g) ?? []).length, "balanced bold");
		const out = lines.map(strip);
		assert.equal(out[0], "");
		assert.equal(out[1], " SUB AGENTS ");
		assert.equal(out[2], "─".repeat(width));
		assert.notEqual(out.at(-1), "");
		assert.ok(
			out.some((l: string) => /\[(anthropic\/)?claude-haiku-5-5 ?· ?medium\]/.test(l)),
			`@${width}`,
		);
		const status = chrome
			.frameStatusLine(
				sl.renderStatusRows(
					["[m ◐ medium] ⏱️  1h 10m"].map((r: string) => chrome.tidyRow(r, true, ["m"])),
					width,
				),
				ansi,
				width,
			)
			.map(strip);
		assert.deepEqual(status, ["", " STATUS LINE ", "─".repeat(width), "m ◐ medium ◷ 1h10m"]);
		if (width === 120) console.log([...out, ...status].join("\n"));
	}
	assert.ok(chrome.frameStatusLine(["x"], plain, 4).every((l: string) => visibleWidth(l) <= 4));
});

test("panel keys and actions still work with the framed output (controller untouched)", () => {
	const c = new panel.PanelController({
		getSource: () => ({ list: () => [rec({ ...HAIKU })], hasForeground: () => false }) as any,
		now: () => NOW,
	});
	const env = { editorText: "", editorFocused: true, overlayOpen: false };
	assert.equal(c.enterBody(), true);
	assert.equal(c.selectedId, "a");
	assert.deepEqual(c.handleKey("\r", env), { consume: true, action: { type: "open", id: "a" } });
	assert.deepEqual(c.handleKey("\x1b", env), { consume: true });
	assert.equal(c.focused, false);
});

test("model brackets: only the first segment that is the live model loses its outer brackets; ANSI, effort and other brackets stay", () => {
	const names = chrome.modelNames({ id: "gpt-6.1-sol", name: "GPT-6.1 Sol" });
	const row = "\x1b[0m\x1b[38;2;125;207;255m[GPT-6.1 Sol ◐ medium]\x1b[0m \x1b[2m|\x1b[0m [source/example]";
	assert.equal(
		chrome.unbracketModel(row, names),
		"\x1b[0m\x1b[38;2;125;207;255mGPT-6.1 Sol ◐ medium\x1b[0m \x1b[2m|\x1b[0m [source/example]",
	);
	assert.equal(
		chrome.unbracketModel("[source/example] | x", names),
		"[source/example] | x",
		"a folder first (model hidden) keeps its brackets",
	);
	assert.equal(
		chrome.unbracketModel("plain [GPT-6.1 Sol]", names),
		"plain [GPT-6.1 Sol]",
		"not anchored at the row start",
	);
	assert.equal(chrome.tidyRow("[GPT-6.1 Sol ◐ medium]", false, names), "[GPT-6.1 Sol ◐ medium]", "only the first row");
	assert.equal(
		chrome.unbracketModel("[gpt-6.1-sol/data]", names),
		"[gpt-6.1-sol/data]",
		"a folder sharing the model prefix is not the model",
	);
	assert.equal(
		chrome.unbracketModel("\x1b[38:2:125:207:255m[GPT-6.1 Sol]\x1b[0m", names),
		"\x1b[38:2:125:207:255mGPT-6.1 Sol\x1b[0m",
		"colon-form SGR is retained",
	);
	assert.equal(chrome.unbracketModel("[x]", []), "[x]");
});

test("layoutStatus: the one default at every width: merged identity, labels shortened, meters on one line; untouched when not a HUD", () => {
	const rows = [
		"[M]\x1b[0m │ home │ \x1b[2m◷ 5m\x1b[0m │ Cost $1.00",
		"Context ━━ 10% │ Usage ── 4% │ Weekly ── 39%",
		"✓ Bash ×2 | ✓ Read ×1",
		"▲ BYPASS",
	];
	for (const w of [60, 100, 200]) {
		assert.deepEqual(
			chrome.layoutStatus(rows, plain, w).map(strip),
			["[M] · home · ◷ 5m · $1.00", "ctx ━━ 10% · 5h ── 4% · wk ── 39%", "✓ Bash ×2  ✓ Read ×1", "▲ BYPASS"],
			`@${w}: no right alignment, no padding`,
		);
	}
	const colored = chrome
		.layoutStatus(
			[
				"\x1b[36m[M]\x1b[0m │ \x1b[34mhome \x1b[0m │ \x1b[2m◷ 5m\x1b[0m │ \x1b[2mCost $1\x1b[0m",
				"\x1b[2mContext\x1b[0m ━ │ \x1b[2mUsage\x1b[0m ─ │ \x1b[2mWeekly\x1b[0m ─",
			],
			plain,
			100,
		)
		.map(strip);
	assert.deepEqual(
		colored,
		["[M] · home · ◷ 5m · $1", "ctx ━ · 5h ─ · wk ─"],
		"ANSI-wrapped Cost label, trailing space and labels",
	);
	assert.deepEqual(chrome.layoutStatus(["a", "b"], plain, 100), ["a", "b"], "not a HUD");
	assert.deepEqual(chrome.layoutStatus(["x │ y"], plain, 100), ["x │ y"], "single row");
});

const HUD_ROWS = [
	"[M ◐ medium]\x1b[0m │ home │ \x1b[2m◷ 5m\x1b[0m │ Cost $1.00",
	"Context ━━━━━━━━━━ 10% (98k/1.0M) │ Usage ━━━━ 4% (resets in 3h) │ Weekly ━━━━ 39%",
	"✓ Bash ×2 | ✓ Read ×1",
	"▲ BYPASS",
];

test("layoutStatus responsive: one identity line, ONE meters line (details, then bars shrink, then drop), tools and extras below; no blanks or rules", () => {
	const at = (w: number) => chrome.layoutStatus(HUD_ROWS, plain, w).map(strip);
	const mid = at(80);
	assert.equal(mid[0], "[M ◐ medium] · home · ◷ 5m · $1.00", "identity merged into one line");
	assert.match(
		mid[1]!,
		/^ctx ━+ 10% \(98k\/1\.0M\) · 5h ━+ 4% \(resets in 3h\) · wk ━+ 39%$/,
		"meters share one line, details kept while they fit",
	);
	assert.deepEqual(mid.slice(2), ["✓ Bash ×2  ✓ Read ×1", "▲ BYPASS"]);
	const less = at(62);
	assert.match(less[1]!, /^ctx ━+ 10% · 5h ━+ 4% · wk ━+ 39%$/, "details drop first");
	const narrow = at(36);
	assert.equal(narrow.filter((l) => /^ctx /.test(l)).length, 1);
	assert.match(
		narrow.find((l) => /^ctx /.test(l))!,
		/^ctx ━{3,8} 10% · 5h ━{3,8} 4% · wk ━{3,8} 39%$/,
		`bars shrink, all three meters on one line\n${narrow.join("\n")}`,
	);
	const tiny = at(30);
	assert.ok(
		tiny.some((l) => l === "ctx 10% · 5h 4% · wk 39%"),
		`bars dropped, still one line\n${tiny.join("\n")}`,
	);
	for (const w of [30, 44, 80, 99])
		assert.ok(
			at(w).every((l) => visibleWidth(l) <= w && l !== "" && !/─{5}/.test(l)),
			`@${w}`,
		);
});

test("fitBar: keeps the filled/empty proportion and the color codes; 0 drops the bar", () => {
	const part = "\x1b[32mContext \x1b[0m\x1b[32m━━━━\x1b[2m━━━━━━\x1b[0m 40%";
	const small = chrome.fitBar(part, 5);
	assert.equal(strip(small), "Context ━━━━━ 40%");
	assert.ok(small.includes("\x1b[32m━━\x1b[2m━━━"), "filled 2 of 5 (40%)");
	assert.equal(strip(chrome.fitBar(part, 0)), "Context 40%");
	assert.equal(chrome.fitBar(part, 20), part, "never grows");
	assert.equal(chrome.fitBar("no bar 5%", 3), "no bar 5%");
});

test("dropTodoRows: the HUD todo line is gone, the model/meters/tools rows stay", () => {
	const rows = ["model │ ◷ 1m", "Context 1%", "✓ Bash ×2", "\x1b[32m✓\x1b[0m All todos complete (7/7)"];
	assert.deepEqual(chrome.dropTodoRows(rows), rows.slice(0, 3));
	assert.deepEqual(
		chrome.dropTodoRows(["a (1/2)", "b (1/2)", "▸ fix it (2/7)"]),
		["a (1/2)", "b (1/2)"],
		"only rows after the first two are candidates",
	);
	assert.deepEqual(chrome.dropTodoRows(["m", "c", "✓ Bash ×1 | +1 more"]), ["m", "c", "✓ Bash ×1 | +1 more"]);
});

// ---- fleet management (design study 2026-11-13, "Gestão do painel Sub Agents") ----
const tree = () => [
	rec({ id: "p", agent: "swarm-worker", updatedAt: NOW }),
	rec({ id: "c", parentId: "p", depth: 2, agent: "go-service-engineer", updatedAt: NOW }),
	rec({ id: "g", parentId: "c", depth: 3, agent: "test-author", updatedAt: NOW - 150_000 }),
	rec({
		id: "f",
		parentId: "c",
		depth: 3,
		agent: "gate-runner",
		state: "failed",
		error: "boom",
		endedAt: NOW,
		updatedAt: NOW,
	}),
];

test('quiet: a running run silent for 2 min shows ◌ and "quiet 2m 30s", warning colored; finished or recent runs do not', () => {
	const rows = vm.buildRows(tree(), { now: NOW, panel: true, mainRoot: true });
	const g: any = rows.find((r: any) => r.id === "g");
	assert.equal(g.quietMs, 150_000);
	assert.equal((rows.find((r: any) => r.id === "p") as any).quietMs, 0);
	const out = panel.renderRow(g, false, tagged, 600);
	assert.ok(out.includes("<warning>◌</warning>") && out.includes("<warning>quiet 2m 30s</warning>"), out);
	const calm = panel.renderRow(rows.find((r: any) => r.id === "c") as any, false, tagged, 600);
	assert.ok(!calm.includes("◌") && !calm.includes("quiet"), calm);
	assert.equal(panel.isQuiet({ state: "failed", quietMs: 999_999 }), false);
	assert.equal(panel.isQuiet({ state: "running", quietMs: 119_999 }), false);
});

test("folded parent: (+N · ● running · ✕ failed) so a failure below stays visible", () => {
	const rows = vm.buildRows(tree(), { now: NOW, panel: true, mainRoot: true, collapsed: new Set(["p"]) });
	assert.equal(rows.length, 1);
	assert.deepEqual(rows[0].hiddenSummary, { running: 2, failed: 1 });
	const out = strip(panel.renderRow(rows[0], false, plain, 200));
	assert.match(out, /swarm-worker \(\+3 · ● 2 · ✕ 1\)/);
	const colored = panel.renderRow(rows[0], false, tagged, 600);
	assert.ok(colored.includes("<success>● 2</success>") && colored.includes("<error>✕ 1</error>"), colored);
	const open = vm.buildRows(tree(), { now: NOW, panel: true, mainRoot: true });
	assert.equal(open[0].hiddenSummary, undefined);
});

test("chip row summary: x/y (ended/total), cyan while running, red on a failure, green when all ended; frameSubAgents puts it after the chip", () => {
	assert.equal(chrome.summaryLine({ running: 5, quiet: 1, failed: 1, done: 2 }, tagged), "<error>3/8</error>");
	assert.equal(chrome.summaryLine({ running: 2, quiet: 0, failed: 0, done: 1 }, tagged), "<text>1/3</text>");
	assert.equal(chrome.summaryLine({ running: 0, quiet: 0, failed: 0, done: 4 }, tagged), "<success>4/4</success>");
	assert.equal(chrome.summaryLine({ running: 0, quiet: 0, failed: 0, done: 0 }, tagged), "");
	// zzzzzzzzzzzzzzzzzz-group-tabs.patch dropped the `collapsed` parameter: the summary is the 5th argument (the 6th is titleFocus).
	const lines = chrome.frameSubAgents(["row", ""], true, plain, 80, "1/3").map(strip);
	assert.match(lines[1], /^ SUB AGENTS {1,2}1\/3$/);
});

test("keys: the hint lists only what works for the selected row; x again names the descendants under a parent", () => {
	assert.equal(panel.focusHint(undefined), "↑↓ select · →← fold · esc back");
	const rows = vm.buildRows(tree(), { now: NOW, panel: true, mainRoot: true });
	const byId = (id: string) => rows.find((r: any) => r.id === id);
	assert.equal(panel.focusHint(byId("p")), "↑↓ select · enter open · →← fold · x stop · esc back");
	assert.equal(panel.focusHint(byId("g")), "↑↓ select · enter open · x stop · esc back", "a leaf has nothing to fold");
	assert.equal(
		panel.focusHint(byId("f")),
		"↑↓ select · enter open · x dismiss · esc back",
		"a finished run is dismissed, not stopped",
	);
	assert.equal(panel.descendantCount(tree(), "p"), 3);
	assert.equal(panel.descendantCount(tree(), "g"), 0);
});
