import assert from "node:assert/strict";
import { test } from "vitest";
import { sweepRow } from "../../../../../src/extensions/ui/editor.ts";
import { highlightPeak, lerpRgb, parseRgb, type Rgb3 } from "../../../../../src/extensions/ui-visual/motion/motion.ts";

/** The char-by-char version sweepRow replaced (editor.ts before perf 2026-11-24): the output must stay identical. */
function sweepRef(row: string, width: number, progress: number, base: Rgb3, peak: Rgb3): string {
	const center = progress * width;
	let col = 0;
	let inEsc = false;
	let out = "";
	for (let i = 0; i < row.length; i++) {
		const ch = row[i]!;
		if (ch === "\x1b") {
			inEsc = true;
			out += ch;
			continue;
		}
		if (inEsc) {
			out += ch;
			if ((ch >= "A" && ch <= "Z") || (ch >= "a" && ch <= "z") || ch === "\x07") inEsc = false;
			continue;
		}
		if (ch === "─") {
			const d = Math.abs(col - center);
			const w = Math.exp(-(d * d) / 90) * (1 - progress * 0.35);
			if (w > 0.04) {
				const [r, g, b] = lerpRgb(base, peak, w * 0.85);
				out += `\x1b[38;2;${r};${g};${b}m─\x1b[38;2;${base[0]};${base[1]};${base[2]}m`;
				col++;
				continue;
			}
		}
		out += ch;
		col++;
	}
	return out;
}

test("sweepRow: same bytes as the char-by-char sweep on rules with color, labels, OSC links and wide text", () => {
	const base: Rgb3 = [90, 110, 140];
	const peak = highlightPeak(base);
	const rows = [
		"",
		"─".repeat(140),
		`\x1b[38;2;90;110;140m╭${"─".repeat(60)}\x1b[0m rascunho 日本語 \x1b[38;2;90;110;140m${"─".repeat(40)}╮\x1b[0m`,
		`${"─".repeat(20)}\x1b]8;;https://x.test\x07link\x1b]8;;\x07${"─".repeat(30)}`,
		"sem régua nenhuma aqui",
		`\x1b[2m${"─".repeat(10)}\x1b[22m❯ 🙂 ${"─".repeat(90)}`,
	];
	for (const row of rows)
		for (const width of [1, 40, 140])
			for (const progress of [0, 0.13, 0.5, 0.77, 1])
				assert.equal(
					sweepRow(row, width, progress, base, peak),
					sweepRef(row, width, progress, base, peak),
					JSON.stringify({ row, width, progress }),
				);
});

test("sweepRow: a row with no lit rule comes back as the same string", () => {
	const base: Rgb3 = [1, 2, 3];
	const row = `texto ${"─".repeat(5)}`;
	assert.equal(sweepRow(row, 140, 1, base, highlightPeak(base)), row);
});

test("parseRgb: cached per sequence, but each caller gets its own array", () => {
	const a = parseRgb("\x1b[38;2;10;20;30m");
	assert.deepEqual(a, [10, 20, 30]);
	a![0] = 99;
	assert.deepEqual(parseRgb("\x1b[38;2;10;20;30m"), [10, 20, 30]);
	assert.deepEqual(parseRgb("\x1b[48;2;1;2;3m"), [1, 2, 3]);
	assert.equal(parseRgb("\x1b[31m"), undefined);
	assert.equal(parseRgb(undefined), undefined);
});
