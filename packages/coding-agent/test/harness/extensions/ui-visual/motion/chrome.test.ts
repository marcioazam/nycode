// Behavior of the tool card chrome: top-right pills, todo line, question lines and duration formatting.
import { stripVTControlCharacters } from "node:util";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	comHora,
	comTopoDireita,
	fitLine,
	formatDuration,
	indent,
	perguntaLinhas,
	todoLinha,
	util,
} from "../../../../../src/extensions/ui-visual/motion/chrome.ts";

const theme = { fg: (_c: string, t: string) => t, bold: (t: string) => t };
const plain = (s: string) => stripVTControlCharacters(s);

beforeEach(() => {
	vi.stubEnv("TERM", "xterm-256color");
	vi.stubEnv("KITTY_WINDOW_ID", "");
});
afterEach(() => {
	vi.unstubAllEnvs();
});

describe("chrome", () => {
	it("formatDuration truncates and switches units", () => {
		expect(formatDuration(-1)).toBe("0.0s");
		expect(formatDuration(Number.NaN)).toBe("0.0s");
		expect(formatDuration(450)).toBe("0.4s");
		expect(formatDuration(3290)).toBe("3.2s");
		expect(formatDuration(12_900)).toBe("12s");
		expect(formatDuration(65_000)).toBe("1m 05s");
	});

	it("util and indent keep a minimum width and follow the icon gap", () => {
		expect(util(80)).toBe(78);
		expect(util(3)).toBe(3);
		expect(util(0)).toBe(1);
		expect(indent().length).toBe(4);
	});

	it("fitLine returns short text intact and cuts long text to the width", () => {
		expect(fitLine("abc", 10)).toBe("abc");
		expect(visibleWidthOf(fitLine("x".repeat(40), 10))).toBeLessThanOrEqual(10);
		const cut = fitLine(`\x1b[41m${"y".repeat(40)}\x1b[0m`, 10);
		expect(plain(cut).endsWith("…")).toBe(true);
	});

	it("comTopoDireita puts hint and clock on the right; drops the hint, then the clock, when narrow", () => {
		const wide = plain(comTopoDireita("head", 60, theme, { verbo: "abre", tecla: "alt+o", hora: "01:29" }));
		expect(wide.startsWith("head")).toBe(true);
		expect(wide).toContain("alt+o");
		expect(wide).toContain("01:29");
		const mid = plain(comTopoDireita("head", 24, theme, { verbo: "abre", tecla: "alt+o", hora: "01:29" }));
		expect(mid).not.toContain("alt+o");
		expect(mid).toContain("01:29");
		const tiny = plain(comTopoDireita("head-with-a-long-title", 12, theme, { hora: "01:29" }));
		expect(tiny).not.toContain("01:29");
		expect(visibleWidthOf(tiny)).toBeLessThanOrEqual(12);
	});

	it("comHora is a no-op without a clock", () => {
		expect(comHora("row", 40, "", theme)).toBe("row");
		expect(plain(comHora("row", 40, "09:00", theme))).toContain("09:00");
	});

	it("todoLinha: verb, id and progress for each action", () => {
		const todos = [
			{ id: 1, text: "um", status: "completed" },
			{ id: 2, text: "dois", status: "pending" },
		];
		const pending = todoLinha({ action: "add", text: "novo" }, undefined, theme);
		expect(pending.texto).toBe("Adicionar");
		expect(pending.andamento).toBe("");
		const done = todoLinha({ action: "complete", id: 1 }, { action: "complete", todos }, theme, () => 50);
		expect(done.texto).toBe("Concluída #1  um");
		expect(plain(done.andamento)).toMatch(/1\/2$/);
		const added = todoLinha({ action: "add" }, { todos }, theme);
		expect(added.texto).toContain("#2");
		expect(todoLinha({ action: "weird" }, { todos: [] }, theme).texto).toBe("Weird");
		expect(todoLinha({}, undefined, theme).texto).toBe("Task");
	});

	it("perguntaLinhas: header gets the clock and the hint, body keeps the rail", () => {
		const rail = "│ ";
		const lines = ["Pergunta?", `${rail}opção a`, `${rail}opção b · ctrl+o abre`];
		const out = perguntaLinhas(lines, 70, "10:11", theme).map(plain);
		expect(out[0]).toContain("10:11");
		expect(out[0]).toContain("ctrl+o");
		expect(out.slice(1).every((l) => l.includes("│"))).toBe(true);
		expect(out.slice(1).join("\n")).not.toContain("ctrl+o");
		const bare = perguntaLinhas(["só texto", ""], 40, "", theme).map(plain);
		expect(bare[0]?.trim()).toBe("só texto");
	});
});

function visibleWidthOf(s: string): number {
	return [...plain(s)].length;
}
