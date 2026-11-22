import assert from "node:assert";
import { describe, it } from "node:test";
import { paintScrollbarOnImageLine } from "../src/scrollbar-image.ts";

const ESC = "\x1b";
const strip = (s: string) => s.replace(/\x1b_G[^\x1b]*\x1b\\/g, "").replace(/\x1b\[[0-9;]*m/g, "");
// Replaces the character at the visible column (plain lines, no ANSI): enough to check column and width.
const cell = (line: string, col: number, width: number, repl: string) =>
	(line.slice(0, col) + repl + line.slice(col + 1)).slice(0, Math.max(width, 0) || undefined);
const run = (line: string, col: number, total: number) => paintScrollbarOnImageLine(line, col, total, "┃", false, cell);
const k1 = `${ESC}_Ga=T,C=1;AAAA${ESC}\\`;
const k2 = `${ESC}_Gm=1;AAAA${ESC}\\${ESC}_Gm=0;BBBB${ESC}\\`;

describe("scrollbar cell on image lines (seam K21)", () => {
	it("paints the cell at the right column of a one-chunk kitty line, sequence intact", () => {
		const line = ` ${k1}${" ".repeat(9)}`;
		assert.strictEqual(strip(run(line, 5, 10)), "     ┃    ");
		assert.ok(run(line, 5, 10).startsWith(` ${k1}`));
	});

	it("uses the end of the last APC on a multi-chunk kitty line", () => {
		const line = ` ${k2}${" ".repeat(9)}`;
		const out = run(line, 9, 10);
		assert.ok(out.startsWith(` ${k2}`));
		assert.strictEqual(strip(out), `${" ".repeat(9)}┃`);
	});

	it("leaves the line alone when the column is inside the prefix", () => {
		const line = `   ${k1}${" ".repeat(7)}`;
		assert.strictEqual(run(line, 2, 10), line);
	});

	it("leaves an iTerm2 line alone", () => {
		const line = `${ESC}]1337;File=inline=1:AAAA\x07`;
		assert.strictEqual(run(line, 3, 10), line);
	});

	it("returns a line without an image sequence as it is", () => {
		assert.strictEqual(run("plain text", 3, 10), "plain text");
		assert.strictEqual(run(`${ESC}_Gunterminated`, 3, 10), `${ESC}_Gunterminated`);
	});
});
