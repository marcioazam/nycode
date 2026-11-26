// Native frame of the Status / Agentes / Plan tabs in the built nycode CLI (tmux, fullscreen): one bar, only the open tab has
// a body, conditional tabs, 0 model calls. NYCODE_DISPLAY_FRAME_OUT=<file> saves the 120x40 frame (plain) and <file>.ansi.
// Rows are found by fixture text only (tab names, TASK-nn, gate-runner); nothing here reads an animated glyph.
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { test as vitestTest } from "vitest";
import {
	BAR,
	barRow,
	find,
	isRule,
	lines,
	openTab,
	type S,
	scenario,
	tabCol,
	tabLine,
	tabNames,
} from "./native-harness.ts";

const test = (name: string, fn: () => Promise<void>) => vitestTest(name, { timeout: 180_000 }, fn);

// Contract: docs/pi-group-tabs-2026-11-14.md. One bar (blank line, tabs, rule), only the open tab shows its body; the ─ rules counted here are the editor's own.
const ruleCount = (t: string) => lines(t).filter(isRule).length;
const barCount = (t: string) => lines(t).filter((l) => BAR.test(l)).length;
const BARRULE = /^[━─]{20,}\s*$/;
/** Clicks the tab name on the bar row and waits until it is the open one. */
async function openByClick(s: S, name: RegExp, label: string) {
	s.click(s.row(BAR), tabCol(s.pane(), name));
	return s.waitFor(`${label} open`, (t) => openTab(t) !== undefined && name.test(openTab(t)!));
}
/** Shared checks of the bar frame (blank line, one bar, rule below it) and, when Status is open, its model row and second row. */
function assertBar(t: string, label: string, names: RegExp[]) {
	const i = barRow(t);
	assert.ok(i >= 1, `${label}: no tab bar\n${t}`);
	assert.equal(barCount(t), 1, `${label}: exactly one bar (no duplicate)\n${t}`);
	assert.equal(lines(t)[i - 1].trim(), "", `${label}: blank line before the bar\n${t}`);
	assert.ok(BARRULE.test(lines(t)[i + 1]), `${label}: rule right below the bar\n${t}`);
	assert.deepEqual(
		tabNames(t).map((n) => n.replace(/ .*/, "")),
		names.map((n) => n.source),
		`${label}: tabs in the fixed order\n${t}`,
	);
}
function assertStatusRows(t: string, label: string) {
	const i = barRow(t);
	// Only the main model's outer brackets go; the clock is one ◷ with a single-cell gap; other sources keep their brackets.
	assert.equal(lines(t)[i + 2].trimEnd(), "Fixture Model ◐ medium ◷ 1h10m", `${label}\n${t}`);
	assert.ok(lines(t)[i + 3].startsWith("[keep] Context test"), `${label}: non-model brackets must stay\n${t}`);
	assert.ok(!t.includes("[Fixture Model") && !t.includes("⏱"), `${label}\n${t}`);
}
const agentRows = /gate-runner \[fake[\s\S]*swarm-worker \[fake/;
const NAMES = (...n: string[]) => n.map((x) => ({ source: x }) as RegExp);

test("native nycode: one tab bar with a rule below, only the open tab has a body, Status → Agentes → Plan, conditional tabs, 0 model calls", async () => {
	let baseline = -1;
	await scenario("empty", { plan: false, agents: false }, async (s) => {
		const t = s.pane();
		baseline = ruleCount(t); // the editor's own borders
		assertBar(t, "empty", NAMES("Status"));
		assert.equal(openTab(t), "Status", `Status is the default open tab\n${t}`);
		assert.ok(!/Agentes|Plan \d|Todo \d|Run \d/.test(tabLine(t)), `no Agentes/Plan tabs without content\n${t}`);
		assertStatusRows(t, "empty");
	});

	await scenario("agents", { plan: false, agents: true }, async (s) => {
		const t = s.pane();
		assertBar(t, "agents", NAMES("Status", "Agentes"));
		assert.deepEqual(tabNames(t), ["Status", "Agentes 2"], t);
		assert.equal(openTab(t), "Status", `a tab that appears does not open by itself\n${t}`);
		assert.ok(!/gate-runner/.test(t), `Agentes body hidden while Status is open\n${t}`);
		assertStatusRows(t, "agents");
		assert.equal(ruleCount(t), baseline, `no extra ─ rule: the bar is the only one\n${t}`);
		const o = await openByClick(s, /Agentes/, "Agentes");
		assert.equal(barCount(o), 1, o);
		assert.ok(agentRows.test(o), `both agent rows under the bar\n${o}`);
		assert.ok(!/Context test/.test(o), `Status body hidden once Agentes is open\n${o}`);
		assert.match(tabLine(o), /Agentes 2 {2}.*0\/2/, `Sub Agents summary on the bar line\n${o}`);
		assert.ok(!/^(?:❯ | )[▾▸] SUB AGENTS/m.test(o), `no chip title\n${o}`);
		assert.equal(lines(o)[barRow(o) + 1].replace(/[━─]/g, "").length, 0, o);
	});

	await scenario("plan", { plan: true, agents: false }, async (s) => {
		const t = s.pane();
		assertBar(t, "plan", NAMES("Status", "Plan"));
		assert.deepEqual(tabNames(t), ["Status", "Plan 3/20"], t);
		assert.ok(!/TASK-01/.test(t), `Plan body hidden while Status is open\n${t}`);
		assertStatusRows(t, "plan");
		assert.equal(ruleCount(t), baseline, `no extra ─ rule\n${t}`);
		const o = await openByClick(s, /Plan/, "Plan");
		const bar = barRow(o);
		assert.ok(!/Context test/.test(o), `Status body hidden once Plan is open\n${o}`);
		// Plan detail (time, window) sits on the footer line under the table (was the bar); the count stays in the label only.
		assert.match(lines(o)[bar], /^Status {3}Plan 3\/20\s*$/, o);
		assert.match(lines(o)[bar + 9], /^\d\d:\d\d · \d\/6 na tela/, o);
		assert.equal(lines(o)[bar].split("3/20").length - 1, 1, `count not repeated\n${o}`);
		assert.ok(
			find(o, /TASK-06/) === bar + 8 && !isRule(lines(o)[bar + 9]),
			`table header and six body rows right under the bar, no closing rule\n${o}`,
		);
	});

	for (const rows of [40, 50]) {
		await scenario(
			`both-${rows}`,
			{ plan: true, agents: true },
			async (s) => {
				const t = s.pane();
				assertBar(t, `both-${rows}`, NAMES("Status", "Agentes", "Plan"));
				assert.deepEqual(tabNames(t), ["Status", "Agentes 2", "Plan 3/20"], t);
				assert.ok(!/gate-runner/.test(t) && !/TASK-01/.test(t), `only the Status body shows\n${t}`);
				assertStatusRows(t, `both-${rows}`);
				assert.equal(ruleCount(t), baseline, `one bar, no extra ─ rule\n${t}`);
				const a = await openByClick(s, /Agentes/, "Agentes");
				assert.ok(
					agentRows.test(a) && !/TASK-01/.test(a) && !/Context test/.test(a),
					`only the Agentes body\n${a}`,
				);
				assert.equal(barCount(a), 1, a);
				const o = await openByClick(s, /Plan/, "Plan");
				assert.equal(barCount(o), 1, o);
				assert.ok(find(o, /TASK-06/) === barRow(o) + 8 && find(o, /TASK-07/) < 0, `six body rows\n${o}`);
				assert.ok(!/gate-runner/.test(o) && !/Context test/.test(o), `only the Plan body\n${o}`);
				assert.ok(
					lines(o).filter((l) => l.trim()).length <= rows && !o.includes("…"),
					`frame within ${rows} rows, no truncated line\n${o}`,
				);
				const out = process.env.NYCODE_DISPLAY_FRAME_OUT;
				if (out && rows === 40) {
					writeFileSync(out, o);
					writeFileSync(`${out}.ansi`, s.pane(true));
				}
			},
			rows,
		);
	}
});
