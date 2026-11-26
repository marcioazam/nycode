// K10: the built-in header drops its colors under NO_COLOR (it was the ui/a11y plainHeader wrapper in pre-migration Nycode).
import { afterEach, describe, expect, it } from "vitest";
import { BuiltInHeader, HeldContainer } from "../../../../src/modes/interactive/interactive-mode.ts";

const LOGO = "\x1b[38;2;228;138;122m\x1b[48;2;79;142;179m▀\x1b[0m";
const header = () =>
	new BuiltInHeader(
		() => `${LOGO} v1\nshort`,
		() => `${LOGO} v1\nfull`,
		false,
		0,
		0,
	);
const saved = process.env.NO_COLOR;

afterEach(() => {
	if (saved === undefined) delete process.env.NO_COLOR;
	else process.env.NO_COLOR = saved;
});

describe("BuiltInHeader under NO_COLOR", () => {
	it("keeps the logo colors without NO_COLOR", () => {
		delete process.env.NO_COLOR;
		expect(header().render(40).join("\n")).toContain("\x1b[38;2;228;138;122m");
	});

	it("renders without any escape sequence and keeps expand and invalidate working", () => {
		process.env.NO_COLOR = "1";
		const h = header();
		expect(h.render(40).join("\n")).not.toContain("\x1b");
		expect(h.render(40).join("\n")).toContain("▀ v1");
		expect(h.render(40).join("\n")).toContain("short");
		h.setExpanded(true);
		expect(h.render(40).join("\n")).toContain("full");
	});

	it("draws nothing while hidden, so a header set at startup replaces it unseen", () => {
		delete process.env.NO_COLOR;
		const h = header();
		h.hidden = true;
		expect(h.render(40)).toEqual([]);
		h.hidden = false;
		expect(h.render(40).join("\n")).toContain("short");
	});

	it("an empty NO_COLOR counts as unset", () => {
		process.env.NO_COLOR = "";
		expect(header().render(40).join("\n")).toContain("\x1b[38;2;228;138;122m");
	});
});

// Abertura sem salto (2026-11-24): o aviso de regras chega no session_start da claude-rules, antes do cabeçalho; desenhado
// na hora ele aparecia no topo e descia 9 linhas quando o cabeçalho entrava. O chat fica retido até o cabeçalho aparecer.
describe("HeldContainer", () => {
	it("draws nothing while held and its children once released", () => {
		const c = new HeldContainer();
		c.addChild(header());
		c.held = true;
		expect(c.render(40)).toEqual([]);
		c.held = false;
		expect(c.render(40).join("\n")).toContain("short");
	});
});
