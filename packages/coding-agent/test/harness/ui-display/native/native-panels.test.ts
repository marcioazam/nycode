// Native SGR mouse and keyboard acceptance of the Status / Agentes / Plan tabs in the built nycode CLI (tmux, fullscreen):
// clicks on tab names, wheel scroll of the focused Plan body, PageUp/PageDown ownership, focus return to the editor, the tab
// focus keys, the fleet stop marker. The fixture is native-entry.ts (real status-line, fleet UI and PlanSection).
import assert from "node:assert/strict";
import { existsSync, rmSync } from "node:fs";
import { test as vitestTest } from "vitest";
import {
	BAR,
	barRow,
	type Cfg,
	isRule,
	lines,
	openTab,
	type S,
	scenario,
	sleep,
	tabCol,
	tabLine,
	tabNames,
} from "./native-harness.ts";

const test = (name: string, fn: () => Promise<void>) => vitestTest(name, { timeout: 180_000 }, fn);

const both: Cfg = { plan: true, agents: true };
const word = (n: string | undefined) => n?.split(" ")[0];
// The Plan detail (time, window, keys) is the footer line under the table, not the bar.
const footer = (t: string) => lines(t).find((l) => /\d+\/\d+ na tela/.test(l));
const range = (t: string) =>
	footer(t)?.match(/(?:\d+:\d\d)?(?: · (\d+\/\d+ na tela))/)?.[0] ?? `<no Plan footer>\n${t}`;
/** Plan body owns the keyboard: its keys appear on the footer line. */
const focused = (t: string) => /na tela.*esc back/.test(footer(t) ?? "");
const HINT = /← → tabs · enter open · esc back/;
/** Tab carrying the level-1 focus: hint on the bar line; the focused tab is the one with ━ besides the open one (or the open one itself). */
const tabFocus = (t: string) => {
	if (!HINT.test(tabLine(t))) return undefined;
	const r = lines(t)[barRow(t) + 1] ?? "",
		l = tabLine(t),
		open = openTab(t);
	const marked = tabNames(t).filter((n) => {
		const i = l.indexOf(n);
		return r.slice(i, i + n.length) === "━".repeat(n.length);
	});
	return word(marked.find((n) => n !== open) ?? open);
};
const bar = (s: S) => s.row(BAR);
/** Click on a tab name (SGR column from the real bar). */
const clickTab = (s: S, name: RegExp) => s.click(bar(s), tabCol(s.pane(), name));
async function openTabByClick(s: S, name: RegExp) {
	if (!name.test(openTab(s.pane()) ?? "")) clickTab(s, name);
	return s.waitFor(`${name} open`, (t) => name.test(openTab(t) ?? ""));
}
/** ↓ (empty editor) then ←/→ until `name` holds the tab focus. */
async function goTab(s: S, name: string) {
	if (tabFocus(s.pane()) === undefined) {
		s.keys("Down");
		await s.waitFor("tab focus", (t) => tabFocus(t) !== undefined);
	}
	for (let i = 0; i < 6 && tabFocus(s.pane()) !== name; i++) {
		const order = tabNames(s.pane()).map(word);
		s.keys(order.indexOf(name) > order.indexOf(tabFocus(s.pane())) ? "Right" : "Left");
		await sleep(250);
	}
	return s.waitFor(`tab focus on ${name}`, (t) => tabFocus(t) === name);
}

/** Opens Plan, types the draft, then clicks the Plan body so Plan owns the keyboard. */
async function focusPlan(s: S) {
	await openTabByClick(s, /Plan/);
	s.lit("DRAFT-STAYS");
	await s.waitFor("draft", (t) => t.includes("DRAFT-STAYS"));
	s.click(bar(s) + 2);
	await s.waitFor("Plan focus (hint on the bar line)", focused);
}

test("click on the Plan body focuses it; the wheel browses all 20 tasks only when focused; draft kept; scroll clamps", () =>
	scenario("wheel", both, async (s) => {
		await openTabByClick(s, /Plan/);
		s.lit("DRAFT-STAYS");
		await s.waitFor("draft", (t) => t.includes("DRAFT-STAYS"));
		const y = bar(s) + 2;
		assert.ok(!/TASK-20\b/.test(s.pane()));
		s.wheelDown(y); // not focused: the wheel belongs to the transcript, Plan must not scroll
		await sleep(500);
		assert.match(range(s.pane()), /3\/6 na tela/, s.pane());
		s.click(y);
		await s.waitFor("Plan focus", focused);
		for (let i = 0; i < 40 && !/TASK-20\b/.test(s.pane()); i++) {
			s.wheelDown(y);
			await sleep(100);
		}
		assert.match(s.pane(), /TASK-20\b/, `last task reachable by the wheel\n${s.pane()}`);
		for (let i = 0; i < 8; i++) {
			s.wheelDown(y);
			await sleep(60);
		}
		await sleep(300);
		const t = s.pane();
		assert.match(range(t), /· 0\/6 na tela/, `scroll clamps at the last page\n${t}`);
		assert.match(t, /TASK-20\b/, t);
		assert.ok(!/TASK-01\b/.test(t), t);
		assert.ok(t.includes("DRAFT-STAYS"), `main draft preserved\n${t}`);
	}));

test("click on the Plan tab opens it, a click on the open tab changes nothing, a click on another tab closes Plan (its body goes) and reopening brings it back; one bar throughout", () =>
	scenario("collapse", both, async (s) => {
		const open = await openTabByClick(s, /Plan/);
		assert.ok(/TASK-06\b/.test(open) && !/Context test/.test(open), `Plan body replaces the Status body\n${open}`);
		assert.equal(lines(open).filter((l) => BAR.test(l)).length, 1, open);
		clickTab(s, /Plan/);
		await sleep(700);
		const same = s.pane();
		assert.equal(openTab(same), "Plan 3/20", `click on the open tab: still open\n${same}`);
		assert.ok(/TASK-06\b/.test(same), `body still there\n${same}`);
		clickTab(s, /Status/);
		const closed = await s.waitFor("Plan closed", (t) => openTab(t) === "Status" && !/TASK-01\b/.test(t));
		assert.ok(!/TASK-06\b/.test(closed) && /Context test/.test(closed), closed);
		assert.deepEqual(tabNames(closed), ["Status", "Agentes 2", "Plan 3/20"], `all tabs stay\n${closed}`);
		assert.equal(lines(closed).filter((l) => BAR.test(l)).length, 1, "one bar");
		clickTab(s, /Plan/);
		const reopened = await s.waitFor(
			"expanded Plan",
			(t) => /^Status.*Plan 3\/20/m.test(t) && openTab(t) === "Plan 3/20" && /TASK-06\b/.test(t),
		);
		assert.equal(lines(reopened).filter(isRule).length, lines(open).filter(isRule).length, reopened);
	}));

test("real PageDown/PageUp do not scroll the transcript once Plan is focused (they do before: control)", () =>
	scenario("keys", { ...both, transcript: true }, async (s) => {
		const seen = (t: string) => (t.match(/LINE-\d{3}/g) ?? []).join(",");
		await s.waitFor("transcript", (t) => /LINE-150/.test(t));
		const bottom = seen(s.pane());
		s.keys("PageUp");
		await s.waitFor("control: PageUp scrolls the transcript before focus", (t) => seen(t) !== bottom);
		s.keys("PageDown");
		await s.waitFor("back at the bottom", (t) => seen(t) === bottom);
		await focusPlan(s);
		const atPlan = seen(s.pane()); // the taller Plan body leaves fewer transcript rows than the Status body: compare against this window
		for (const k of ["PageUp", "PageUp", "PageDown", "PageDown", "PageUp"]) {
			s.keys(k);
			await sleep(250);
		}
		const t = s.pane();
		assert.equal(seen(t), atPlan, `transcript must stay put while Plan is focused\n${t}`);
		assert.ok(focused(t) && t.includes("DRAFT-STAYS"), t);
	}));

test("click on the editor, Esc and typing hand the keyboard back without losing input", () =>
	scenario("focus-return", both, async (s) => {
		await focusPlan(s);
		s.click(s.row(/DRAFT-STAYS/), 100); // click on the editor row, past the text so the cursor lands at its end
		await s.waitFor("Plan unfocused after an editor click", (t) => !focused(t));
		s.lit("Q");
		await s.waitFor("typing edits the draft", (t) => t.includes("DRAFT-STAYSQ"));
		s.click(bar(s) + 2);
		await s.waitFor("Plan focus again", focused);
		s.keys("Escape");
		await s.waitFor("Esc returns focus", (t) => !focused(t));
		s.lit("Z");
		await s.waitFor("first char after Esc lands in the editor", (t) => t.includes("DRAFT-STAYSQZ"));
		s.keys("C-u");
		await s.waitFor("Ctrl+U edits normally", (t) => !t.includes("DRAFT-STAYS"));
	}));

test("Agentes tab click opens; a click on the open tab changes nothing; a row of a closed tab is not selectable, so x never stops the mock agent", () =>
	scenario("agents-fold", { plan: false, agents: true }, async (s) => {
		// Control: ↓ + → to the Agentes tab, Enter opens and enters the body (first agent selected), x x stops it (the marker is written by the mock source).
		await goTab(s, "Agentes");
		s.keys("Enter");
		await s.waitFor(
			"body focus: agent selection",
			(t) => /select · enter open/.test(t) && openTab(t) === "Agentes 2",
		);
		s.lit("x");
		await s.waitFor("x asks for confirmation", (t) => /press x again to stop/.test(t));
		s.lit("x");
		for (let i = 0; i < 30 && !existsSync(s.marker); i++) await sleep(100);
		assert.ok(existsSync(s.marker), `control: x x on a visible agent must call stop\n${s.pane()}`);
		rmSync(s.marker);
		s.keys("Escape");
		await s.waitFor("Esc from the body returns to the SAME tab", (t) => tabFocus(t) === "Agentes");
		s.keys("Escape");
		await s.waitFor("Esc from the tab returns to the editor", (t) => tabFocus(t) === undefined);
		clickTab(s, /Agentes/); // open tab: nothing changes
		await sleep(700);
		assert.equal(openTab(s.pane()), "Agentes 2", `click on the open tab: still open\n${s.pane()}`);
		assert.ok(/gate-runner/.test(s.pane()), s.pane());
		clickTab(s, /Status/); // another tab opens: Agentes is closed
		const folded = await s.waitFor("closed Agentes", (t) => openTab(t) === "Status" && !/gate-runner \[fake/.test(t)); // rows gone (the "Stopping gate-runner…" notice of the mock stop may linger)
		assert.deepEqual(tabNames(folded), ["Status", "Agentes 2"], `count retained in the label\n${folded}`);
		s.keys("Down");
		await sleep(300); // tab focus only: any other key goes to the editor, never to an agent
		s.lit("x");
		await sleep(300);
		s.lit("x");
		await sleep(300);
		s.keys("C-u");
		await sleep(300);
		s.keys("Enter"); // x went to the editor (not an agent); Enter on the Status tab opens it, still no agent row
		await sleep(800);
		assert.ok(!existsSync(s.marker), "x on a closed tab must not stop an agent");
		assert.ok(!/gate-runner \[fake/.test(s.pane()), s.pane());
		clickTab(s, /Agentes/);
		await s.waitFor("opened", (t) => openTab(t) === "Agentes 2" && /gate-runner/.test(t) && /swarm-worker/.test(t));
	}));

test("keyboard only: ↓ on the empty editor focuses the open tab, ←/→ walk without wrapping, ↑ returns to the editor, Enter opens Plan and enters it, PageDown pages Plan not the transcript, Esc → tab → editor keeps the first letter", () =>
	scenario("keyboard-entry", { ...both, transcript: true }, async (s) => {
		const seen = (t: string) => (t.match(/LINE-\d{3}/g) ?? []).join(",");
		await s.waitFor("transcript", (t) => /LINE-150/.test(t));
		const visual = tabNames(s.pane()).map(word);
		assert.deepEqual(visual, ["Status", "Agentes", "Plan"], s.pane());
		s.keys("Down");
		const t1 = await s.waitFor("↓ focuses the open tab", (t) => tabFocus(t) !== undefined);
		assert.equal(tabFocus(t1), "Status", t1);
		assert.match(tabLine(t1), /enter open · esc back/, `the hint\n${t1}`);
		assert.ok(!/enter fold/.test(tabLine(t1)), `nothing folds\n${t1}`);
		assert.ok(!/select · enter open/.test(t1), `↓ only focuses the tab, no row selected\n${t1}`);
		for (const name of ["Agentes", "Plan"]) {
			s.keys("Right");
			await s.waitFor(`→ to ${name}`, (t) => tabFocus(t) === name);
		}
		assert.equal(openTab(s.pane()), "Status", `arrows only move the focus\n${s.pane()}`);
		s.keys("Right");
		await sleep(300);
		assert.equal(tabFocus(s.pane()), "Plan", `→ on the last tab stays\n${s.pane()}`);
		for (const name of ["Agentes", "Status"]) {
			s.keys("Left");
			await s.waitFor(`← to ${name}`, (t) => tabFocus(t) === name);
		}
		s.keys("Left");
		await sleep(300);
		assert.equal(tabFocus(s.pane()), "Status", `← on the first tab stays\n${s.pane()}`);
		s.keys("Up");
		await s.waitFor("↑ returns to the editor", (t) => tabFocus(t) === undefined);
		await goTab(s, "Plan");
		s.keys("Enter");
		const t0 = await s.waitFor(
			"Enter opens the Plan and enters its body",
			(t) => tabFocus(t) === undefined && focused(t) && openTab(t) === "Plan 3/20",
		);
		const atPlan = seen(t0); // the taller Plan body leaves fewer transcript rows than the Status body
		assert.match(range(t0), /3\/6 na tela/, t0);
		s.keys("PageDown");
		const paged = await s.waitFor("PageDown pages Plan", (t) => /· 2\/6 na tela/.test(t));
		assert.equal(seen(paged), atPlan, `transcript must not scroll\n${paged}`);
		s.keys("Escape");
		await s.waitFor("Esc from the body returns to the SAME tab", (t) => tabFocus(t) === "Plan");
		s.keys("Escape");
		await s.waitFor("Esc from the tab returns to the editor", (t) => tabFocus(t) === undefined && !focused(t));
		s.lit("DRAFT-KEY");
		const typed = await s.waitFor("typed draft", (t) => t.includes("DRAFT-KEY"));
		assert.equal(seen(typed), atPlan, typed);
	}));

test("a tab with a non-empty draft: ↓ stays in the editor; the focused tab is bold cyan next to the open tab in the border colour (ANSI), any key defocuses it", () =>
	scenario("title-band", both, async (s) => {
		s.lit("DRAFT-STAYS");
		await s.waitFor("draft", (t) => t.includes("DRAFT-STAYS"));
		s.keys("Down");
		await sleep(400);
		assert.equal(tabFocus(s.pane()), undefined, `↓ with a draft belongs to the editor\n${s.pane()}`);
		s.keys("C-u");
		await s.waitFor("empty editor", (t) => !t.includes("DRAFT-STAYS"));
		await goTab(s, "Agentes");
		const ansi = s.pane(true);
		const row = lines(ansi).find((l) => /Status.*Agentes 2.*Plan 3\/20/.test(l.replace(/\x1b\[[0-9;]*m/g, "")));
		assert.ok(row, `bar row in the ANSI capture\n${ansi}`);
		assert.match(row, /\x1b\[1m(\x1b\[38;[0-9;]+m)?Status/, `open tab: bold\n${JSON.stringify(row)}`);
		// Open tab colour = editor border colour (thinking<Level>, 2026-11-14). capture-pane only emits attribute changes, so
		// the label may inherit the colour; the ━ rule under it always carries the code: compare it with the border ─ above.
		const all = lines(ansi),
			at = all.indexOf(row);
		const ruleSgr = /\x1b\[1m\x1b\[(38;[0-9;]+)m━/.exec(all[at + 1] ?? "")?.[1];
		const border = all
			.slice(0, at)
			.reverse()
			.find((l) => /^\x1b\[38;[0-9;]+m─+/.test(l));
		assert.ok(
			ruleSgr && border?.startsWith(`\x1b[${ruleSgr}m`),
			`open tab rule in the editor border colour\n${all[at + 1]}\n${border}`,
		);
		// Focused tab in the system cyan (syntaxType: cyan marks the focus), not the open tab's border colour.
		const focusSgr = /\x1b\[1m\x1b\[(38;[0-9;]+)mAgentes 2/.exec(row)?.[1];
		assert.ok(
			focusSgr && focusSgr !== ruleSgr,
			`focused tab: bold, cyan, unlike the open tab\n${JSON.stringify(row)}`,
		);
		assert.match(row.replace(/\x1b\[[0-9;]*m/g, ""), /← → tabs · enter open · esc back\s*$/, row);
		s.lit("Q");
		await s.waitFor(
			"any other key defocuses the tab and types in the editor",
			(t) => tabFocus(t) === undefined && t.includes("Q"),
		);
	}));

test("Status tab: a click on the open tab changes nothing, another tab closes it (HUD rows go); Enter/Space only open, nothing folds; no provider request", () =>
	scenario("status-fold", both, async (s) => {
		const t0 = s.pane();
		assert.deepEqual(tabNames(t0), ["Status", "Agentes 2", "Plan 3/20"], t0);
		assert.equal(openTab(t0), "Status", t0);
		assert.match(t0, /Context test/, t0);
		clickTab(s, /Status/);
		await sleep(700);
		assert.equal(openTab(s.pane()), "Status", `click on the open Status: still open\n${s.pane()}`);
		assert.match(s.pane(), /Context test/, s.pane());
		clickTab(s, /Agentes/);
		const closed = await s.waitFor("Status closed", (t) => openTab(t) === "Agentes 2" && !/Context test/.test(t));
		assert.ok(!/Fixture Model/.test(closed), `no HUD row left under the bar\n${closed}`);
		assert.ok(!/\[keep\]/.test(closed), "the other HUD rows are hidden");
		assert.deepEqual(tabNames(closed), ["Status", "Agentes 2", "Plan 3/20"], "the other tabs are untouched");
		clickTab(s, /Status/);
		await s.waitFor("Status open again", (t) => openTab(t) === "Status" && /Context test/.test(t));
		// keyboard: ↓ to the Status tab (informative group: no body), Enter and Space only open it (it is open: nothing changes), the tab keeps focus, Esc leaves
		await goTab(s, "Status");
		assert.match(tabLine(s.pane()), /enter open · esc back/, s.pane());
		s.keys("Enter");
		await sleep(500);
		assert.ok(
			tabFocus(s.pane()) === "Status" && /Context test/.test(s.pane()) && openTab(s.pane()) === "Status",
			`Enter keeps Status open\n${s.pane()}`,
		);
		s.keys("Space");
		await sleep(500);
		assert.ok(
			tabFocus(s.pane()) === "Status" && /Context test/.test(s.pane()) && openTab(s.pane()) === "Status",
			`Space keeps Status open\n${s.pane()}`,
		);
		s.keys("Right");
		s.keys("Space");
		await s.waitFor(
			"Space opens Agentes without entering its body",
			(t) =>
				tabFocus(t) === "Agentes" &&
				openTab(t) === "Agentes 2" &&
				/gate-runner/.test(t) &&
				!/select · enter open/.test(t),
		);
		s.keys("Space");
		await sleep(500);
		assert.equal(openTab(s.pane()), "Agentes 2", `Space on the open Agentes does not fold\n${s.pane()}`);
		s.keys("Left");
		s.keys("Enter");
		await s.waitFor(
			"Enter on the closed Status opens it",
			(t) => tabFocus(t) === "Status" && openTab(t) === "Status" && /Context test/.test(t),
		);
		s.keys("Escape");
		await s.waitFor("Esc returns to the editor", (t) => tabFocus(t) === undefined);
	}));
