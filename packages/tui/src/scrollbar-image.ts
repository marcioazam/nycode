// nycode: K21 scrollbar cell on image lines: replaceScrollbarCell used to return every image line untouched, so the
// scrollbar column had a hole there. A kitty line (C=1: the cursor does not move) gets the cell painted on the rest of
// the line after its last APC; iTerm2 lines (which move the cursor) and columns inside the prefix stay untouched.
import { visibleWidth } from "./utils.ts";

type CellPainter = (
	line: string,
	column: number,
	totalWidth: number,
	replacement: string,
	preserveTargetBackground: boolean,
) => string;

const ITERM_FILE = "\x1b]1337;File=";
const KITTY_APC = "\x1b_G";
const APC_END = "\x1b\\";
const KITTY_APCS = /\x1b_G[^\x1b]*\x1b\\/g;

/** Paints the scrollbar cell on a kitty image line, after its last APC; any other image line is returned as is. */
export function paintScrollbarOnImageLine(
	line: string,
	column: number,
	totalWidth: number,
	replacement: string,
	preserveTargetBackground: boolean,
	paintCell: CellPainter,
): string {
	if (line.includes(ITERM_FILE)) return line;
	const start = line.lastIndexOf(KITTY_APC);
	if (start < 0) return line;
	const end = line.indexOf(APC_END, start);
	if (end < 0) return line;
	const prefix = line.slice(0, end + APC_END.length);
	const rest = line.slice(end + APC_END.length);
	const prefixWidth = visibleWidth(prefix.replace(KITTY_APCS, ""));
	if (column < prefixWidth) return line;
	return (
		prefix + paintCell(rest, column - prefixWidth, totalWidth - prefixWidth, replacement, preserveTargetBackground)
	);
}
