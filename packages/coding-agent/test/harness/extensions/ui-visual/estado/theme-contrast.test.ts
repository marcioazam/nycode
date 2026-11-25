// node --experimental-strip-types --test ~/.nycode/agent/extensions/ui-visual/test/theme-contrast.test.ts
// Portão de contraste da Onda 7 (docs/designs/onda7-tokens): WCAG 2.2 sem arredondar, texto ≥ 4,5:1, controle ≥ 3:1.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "vitest";
import * as __r2 from "../../../../../src/extensions/ui-visual/diff.ts";
import * as __r1 from "../../../../../src/extensions/ui-visual/icons.ts";

const DIR = new URL("../../../../../src/modes/interactive/theme/", import.meta.url);
// Fundo do kitty (~/.config/kitty/tokyonight.conf): o tema do nycode não pinta o fundo, então todo tema escuro precisa passar nele também.
const KITTY_BG = "#1a1b26";

type Theme = {
	name: string;
	appearance?: string;
	vars?: Record<string, string>;
	colors: Record<string, string>;
	export?: Record<string, string>;
};

const lum = (h: string): number => {
	const c = [1, 3, 5]
		.map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
		.map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
	return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
};
const ratio = (a: string, b: string): number => {
	const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
	return (x! + 0.05) / (y! + 0.05);
};

const resolve = (t: Theme, v: string): string => (v === "" || v.startsWith("#") ? v : resolve(t, t.vars![v]!));

// mdCodeBlockBorder também desenha o rótulo de linguagem do bloco (``` ts): é texto (captura real da Onda 7).
const TEXT = [
	"text",
	"muted",
	"dim",
	"accent",
	"success",
	"error",
	"warning",
	"thinkingText",
	"toolTitle",
	"toolOutput",
	"customMessageLabel",
	"mdHeading",
	"mdLink",
	"mdLinkUrl",
	"mdCode",
	"mdCodeBlock",
	"mdCodeBlockBorder",
	"mdQuote",
	"toolDiffAdded",
	"toolDiffRemoved",
	"toolDiffContext",
	"syntaxComment",
	"syntaxKeyword",
	"syntaxFunction",
	"syntaxVariable",
	"syntaxString",
	"syntaxNumber",
	"syntaxType",
	"syntaxOperator",
	"syntaxPunctuation",
	"thinkingOff",
	"thinkingMinimal",
	"thinkingLow",
	"thinkingMedium",
	"thinkingHigh",
	"thinkingXhigh",
	"thinkingMax",
	"bashMode",
];
// [primeiro plano, fundo, mínimo]; "@page" = fundo do terminal.
const PAIRS: [string, string, number][] = [
	...TEXT.map((k): [string, string, number] => [k, "@page", 4.5]),
	...["text", "muted", "dim", "accent", "success", "error", "userMessageText"].map((k): [string, string, number] => [
		k,
		"userMessageBg",
		4.5,
	]),
	...["customMessageText", "customMessageLabel"].map((k): [string, string, number] => [k, "customMessageBg", 4.5]),
	...["text", "muted", "accent", "success", "error"].map((k): [string, string, number] => [k, "selectedBg", 4.5]),
	// Caixas de ferramenta com fundo tingido: título, saída, estado e diff legíveis em cada estado.
	...["toolPendingBg", "toolSuccessBg", "toolErrorBg", "customMessageBg"].flatMap((bg) =>
		[
			"syntaxType",
			"text",
			"muted",
			"dim",
			"success",
			"error",
			"warning",
			"toolTitle",
			"toolOutput",
			"toolDiffAdded",
			"toolDiffRemoved",
			"toolDiffContext",
		].map((k): [string, string, number] => [k, bg, 4.5]),
	),
	["searchMatchText", "searchMatchBg", 4.5],
	["scrollbarThumb", "@page", 3],
	["mdListBullet", "@page", 3],
	["border", "customMessageBg", 3],
	["borderMuted", "customMessageBg", 3],
	["scrollbarTrack", "customMessageBg", 3],
	["border", "@page", 3],
	["borderMuted", "@page", 3],
	["scrollbarTrack", "@page", 3],
	["dim", "selectedBg", 4.5],
	["dim", "searchMatchBg", 4.5],
	["muted", "searchMatchBg", 4.5],
	["syntaxKeyword", "searchMatchBg", 4.5],
	["syntaxKeyword", "toolPendingBg", 4.5],
	["syntaxKeyword", "selectedBg", 4.5],
];

const themes = readdirSync(DIR)
	.filter(
		(f) =>
			f.endsWith(".json") &&
			["nycode-claro", "nycode-escuro", "nycode-noite", "tokyo-night", "mono"].includes(f.replace(".json", "")),
	)
	.map((f) => JSON.parse(readFileSync(new URL(f, DIR), "utf8")) as Theme);

test("há temas e o par claro/escuro existe", () => {
	const names = themes.map((t) => t.name);
	for (const n of ["nycode-claro", "nycode-escuro", "nycode-noite", "tokyo-night", "mono"])
		assert.ok(names.includes(n), n);
});

for (const t of themes) {
	const pageBgs = [resolve(t, t.export?.pageBg ?? ""), ...(t.appearance === "dark" ? [KITTY_BG] : [])].filter(
		(h) => h !== "",
	);
	test.skipIf(t.name === "mono")(
		// mono usa as cores padrão do terminal
		`${t.name}: contraste mínimo em todo par em uso`,
		() => {
			assert.ok(pageBgs.length > 0, "tema colorido precisa de export.pageBg");
			const bad: string[] = [];
			for (const page of pageBgs) {
				for (const [fg, bg, min] of PAIRS) {
					const f = resolve(t, t.colors[fg]!);
					const b = bg === "@page" ? page : resolve(t, t.colors[bg]!) || page;
					if (f === "") continue;
					const r = ratio(f, b);
					if (r < min) bad.push(`${fg} ${f} / ${bg} ${b} = ${r.toFixed(2)} < ${min}`);
				}
			}
			assert.deepEqual(bad, []);
		},
	);
}

// A caixa de compactação (customMessageBg) não pode ter o mesmo fundo das mensagens dele.
test("nycode-claro/nycode-escuro: mensagem do usuário tem fundo próprio, distinto das caixas de sistema e das tools", () => {
	for (const t of themes.filter((x) => x.name.startsWith("nycode-"))) {
		const u = resolve(t, t.colors.userMessageBg!);
		for (const k of ["customMessageBg", "toolPendingBg", "selectedBg"])
			assert.notEqual(u, resolve(t, t.colors[k]!), `${t.name}: userMessageBg = ${k}`);
	}
});

// Fundo do aviso (▲): não há token no tema; é derivado (icons.ts warnBgRgb). Mesma régua das caixas de tool.
test("fundo derivado do aviso: texto, estado e ▲ com contraste ≥ 4.5 em cada tema colorido", async () => {
	const { warnBgRgb } = __r1;
	const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
	const hex = (c: number[]) => `#${c.map((n) => n.toString(16).padStart(2, "0")).join("")}`;
	const bad: string[] = [];
	for (const t of themes.filter((x) => x.name !== "mono")) {
		const c = (k: string) => resolve(t, t.colors[k]!);
		const bg = hex(warnBgRgb(rgb(c("customMessageBg")), rgb(c("warning"))));
		for (const k of ["warning", "text", "muted", "dim", "toolTitle"])
			if (ratio(c(k), bg) < 4.5) bad.push(`${t.name}: ${k} / ${bg} = ${ratio(c(k), bg).toFixed(2)}`);
	}
	assert.deepEqual(bad, []);
});

test("nycode-noite: sintaxe com 4 cores, raciocínio sem warn, fundo verde no sucesso e vermelho no erro", () => {
	const t = themes.find((x) => x.name === "nycode-noite")!;
	const c = (k: string) => resolve(t, t.colors[k]!);
	const v = (k: string) => resolve(t, k);
	const want: Record<string, string> = {
		syntaxString: "ok",
		syntaxNumber: "magenta",
		syntaxFunction: "accent",
		syntaxType: "cyan",
		syntaxKeyword: "text",
		syntaxVariable: "text",
		syntaxComment: "muted",
		syntaxOperator: "dim",
		syntaxPunctuation: "dim",
		thinkingOff: "dim",
		thinkingMinimal: "muted",
		thinkingLow: "muted",
		thinkingMedium: "text",
		thinkingHigh: "accent",
		thinkingXhigh: "accent",
		thinkingMax: "accent",
	};
	for (const [k, name] of Object.entries(want)) assert.equal(c(k), v(name), k);
	for (const k of Object.keys(t.colors).filter((x) => x.startsWith("thinking") && x !== "thinkingText"))
		assert.notEqual(c(k), v("warn"), k);
	// Executou = fundo verde, erro = fundo vermelho (matiz a 20%, brilho do fundo).
	assert.equal(c("toolSuccessBg"), "#29302a");
	assert.equal(c("toolErrorBg"), "#3b2934");
	assert.equal(c("customMessageBg"), "#262734");
});

test("ratio confere com valores conhecidos (WCAG)", () => {
	assert.equal(ratio("#000000", "#ffffff").toFixed(2), "21.00");
	assert.equal(ratio("#777777", "#ffffff").toFixed(2), "4.48");
});

// D4: o fundo da linha de diff é derivado (diff.ts TINT) da cor do diff sobre customMessageBg; texto legível e barra ▎ visível.
test("fundo derivado do diff: text/muted ≥ 4.5 e barra ≥ 3 sobre o tint, em cada tema colorido", async () => {
	const { TINT, mixRgb } = __r2;
	const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
	const hex = (c: number[]) => `#${c.map((n) => n.toString(16).padStart(2, "0")).join("")}`;
	const bad: string[] = [];
	for (const t of themes.filter((x) => x.name !== "mono")) {
		const c = (k: string) => resolve(t, t.colors[k]!);
		for (const [bar, label] of [
			["toolDiffAdded", "added"],
			["toolDiffRemoved", "removed"],
		] as const) {
			const tint = hex(mixRgb(rgb(c(bar)), rgb(c("customMessageBg")), TINT));
			for (const [k, m] of [
				["text", 4.5],
				["muted", 4.5],
				[bar, 3],
			] as const) {
				const r = ratio(c(k), tint);
				if (r < m) bad.push(`${t.name} ${label}: ${k} ${c(k)} / ${tint} = ${r.toFixed(2)} < ${m}`);
			}
		}
	}
	assert.deepEqual(bad, []);
});
