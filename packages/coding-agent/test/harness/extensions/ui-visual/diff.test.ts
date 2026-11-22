// node --experimental-strip-types --test extensions/ui-visual/test/diff.test.ts
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { visibleWidth } from "@nycode/tui";
import { test } from "vitest";
import * as __m1 from "../../../../src/extensions/ui-visual/diff.ts";
import * as __m2 from "../../../../src/extensions/ui-visual/tools.ts";

const tmp = mkdtempSync(join(tmpdir(), "ui-visual-diff-"));
// motion/ importa ../../ui/a11y.ts (Onda 10, P01): a cópia leva o a11y para o mesmo lugar relativo.
writeFileSync(join(tmp, "tui.mjs"), "export * from '@nycode/tui'\n");
const { renderDiff, mixRgb, TINT, prepareDiff, memoLine } = __m1;
const { fitLine } = __m2;

const ESC = "\x1b[";
const FG: Record<string, string> = { toolDiffAdded: "38;2;48;209;88", toolDiffRemoved: "38;2;255;90;90" };
const BG: Record<string, string> = {
	toolSuccessBg: "48;2;23;39;28",
	toolErrorBg: "48;2;45;24;24",
	toolPendingBg: "48;2;30;30;40",
};
// Tema falso: marca o que foi pedido, para ler a saída como texto.
const theme: any = {
	fg: (c: string, t: string) => `<${c}>${t}</c>`,
	bg: (c: string, t: string) => `<bg:${c}>${t}</bg>`,
	bold: (t: string) => `<b>${t}</b>`,
	inverse: (t: string) => `<inv>${t}</inv>`,
	getFgAnsi: (c: string) => `${ESC}${FG[c] ?? "38;2;1;2;3"}m`,
	getBgAnsi: (c: string) => `${ESC}${BG[c]}m`,
};
// Remove só as marcas do tema falso (mantém ESC para os testes de ênfase).
const unmark = (s: string) => s.split(/<\/?[a-zA-Z:]*>/g).join("");
const plain = (s: string) => unmark(s).replace(/\x1b\[[0-9;]*m/g, "");
// Medidas falsas (ignoram as marcas do tema); o teste de corte usa fitLine/visibleWidth reais.
const base = { fitLine: (t: string) => t, visibleWidth: (s: string) => [...plain(s)].length };
const run = (diff: string, t: any = theme, o: Record<string, unknown> = {}, width = 40) =>
	renderDiff(diff, t, { width, ...base, ...o });

test("linha (Variante 2): número em dim (contexto) ou cor do diff (add/del), sinal +/− em negrito; contexto sem sinal nem fundo", () => {
	const rows = run(" 9 a\n+10 b\n-11 c", theme, {}, 11);
	assert.equal(rows[0], "  <dim> 9</c>    <toolDiffContext>a</c>"); // recuo de 2: números na coluna dos ícones das tools
	assert.equal(rows[1], `<bg:toolSuccessBg>  <toolDiffAdded>10</c> <b><toolDiffAdded>+</c></b>  <text>b</c>  </bg>`);
	assert.equal(rows[2], `<bg:toolErrorBg>  <toolDiffRemoved>11</c> <b><toolDiffRemoved>−</c></b>  <text>c</c>  </bg>`);
});

test("largura do número = maior número (mín. 1) e linha preenchida até a largura", () => {
	const rows = run("+1 x", theme, {}, 12);
	assert.equal(plain(rows[0]), "  1 +  x    ");
	assert.equal(visibleWidth(plain(rows[0])), 12);
	const wide = run(" 99 a\n+100 b", theme, {}, 13);
	assert.equal(plain(wide[0]), "   99    a");
	assert.ok(plain(wide[1]).startsWith("  100 +  b"));
});

test("separador do nativo vira ⋯ em dim alinhado ao conteúdo", () => {
	const rows = run(" 1 a\n     ...\n 8 b", theme, {}, 10);
	assert.equal(rows[1], "       <dim>⋯</c>");
	assert.equal(plain(rows[0]).indexOf("a"), plain(rows[1]).indexOf("⋯"));
});

test("tabs viram 3 espaços; linha malformada vira contexto em dim", () => {
	assert.ok(plain(run("+1 \tx")[0]).startsWith("  1 +     x"));
	const rows = run("???", theme, {}, 10);
	assert.equal(rows[0], "       <dim>???</c>");
	assert.deepEqual(run(""), []);
	assert.equal(run(" 1 a\n").length, 1, "quebra final não vira linha");
});

test("sem cor: barra +/-, sem fundo nem ênfase", () => {
	const mono = {
		...theme,
		fg: (_c: string, t: string) => t,
		bg: (_c: string, t: string) => `[${t}]`,
		inverse: (t: string) => `[${t}]`,
	};
	const rows = run(" 1 a\n-2 hello\n+2 olá", mono, {}, 20);
	assert.deepEqual(rows, ["  1    a", "  2 -  hello", "  2 +  olá"]);
});

test("realce injetado: contexto e mudadas passam por highlight; erro volta à cor do tema", () => {
	const hl = (l: string) => `${ESC}35m${l}${ESC}39m`;
	const rows = run(" 1 ab\n+2 cd", theme, { highlight: hl }, 12);
	assert.ok(rows[0].includes(`${ESC}35mab${ESC}39m`));
	assert.ok(rows[1].includes(`${ESC}35mcd${ESC}39m`));
	const boom = run(
		" 1 ab\n+2 cd",
		theme,
		{
			highlight: () => {
				throw new Error("x");
			},
		},
		12,
	);
	assert.ok(boom[0].includes("<toolDiffContext>ab</c>"));
	assert.ok(boom[1].includes("<text>cd</c>"));
});

test("mixRgb: 30% da frente sobre o fundo, valores exatos", () => {
	assert.deepEqual(mixRgb([48, 209, 88], [23, 39, 28], 0.3), [31, 90, 46]);
	assert.deepEqual(mixRgb([0, 0, 0], [255, 255, 255], 0.3), [179, 179, 179]);
});

test("ênfase 1:1: hello → olá, mundo com fundo forte; fora do trecho texto normal", () => {
	const rows = run("-2 x = 'hello'\n+2 x = 'olá, mundo'", theme, {}, 40);
	const S = `${ESC}48;2;31;90;46m`;
	const R = `${ESC}48;2;23;39;28m`;
	const D = `${ESC}48;2;${mixRgb([255, 90, 90], [45, 24, 24], 0.3).join(";")}m`;
	assert.ok(rows[1].includes(`<text>x = '</c>${S}<text>olá, mundo</c>${R}<text>'</c>`), rows[1]);
	assert.ok(rows[0].includes(`<text>x = '</c>${D}<text>hello</c>${ESC}48;2;45;24;24m<text>'</c>`), rows[0]);
});

test("ênfase: console.log → log.info em trecho único cada", () => {
	const rows = run("-5   console.log(g)\n+5   log.info(g)", theme, {}, 40);
	const S = `${ESC}48;2;31;90;46m`;
	assert.ok(rows[1].includes(`${S}<text>log.info</c>`), rows[1]);
	assert.equal(rows[1].split(S).length, 2);
	assert.ok(rows[0].includes("<text>console.log</c>"), rows[0]);
});

test("ênfase pareia N removidas com N adicionadas por índice; contagens diferentes sem ênfase", () => {
	const two = run("-1 aa 1\n-2 bb 2\n+1 aa 3\n+2 bb 4", theme, {}, 30);
	assert.equal(two.filter((r) => r.includes(`${ESC}48;2;31;90;46m`)).length, 2);
	assert.ok(two[3].includes(`${ESC}48;2;31;90;46m<text>4</c>`));
	const odd = run("-1 aa 1\n+1 aa 3\n+2 cc", theme, {}, 30);
	assert.ok(!odd.join("").includes("48;2;31;90;46"));
});

test("teto do LCS: n*m > 40000 desliga a ênfase", () => {
	const a = Array.from({ length: 201 }, (_, i) => `a${i}`).join(" ");
	const b = Array.from({ length: 201 }, (_, i) => `b${i}`).join(" ");
	assert.ok(!run(`-1 ${a}\n+1 ${b}`, theme, {}, 5000).join("").includes("48;2;31;90;46"));
	assert.ok(run("-1 a1 x\n+1 b1 x", theme, {}, 50).join("").includes("48;2;31;90;46"));
});

test("ênfase sobre texto já realçado: descarta cor de frente dentro do trecho e restaura a última ao sair", () => {
	const hl = (l: string) => l.replace(/(hello)/, `${ESC}31m$1${ESC}39m`).replace(/'/g, `${ESC}33m'${ESC}39m`);
	const rows = run("-1 'hello'\n+1 'hola'", theme, { highlight: hl }, 40);
	const D = `${ESC}48;2;${mixRgb([255, 90, 90], [45, 24, 24], 0.3).join(";")}m`;
	// Dentro do trecho (hello) a cor 31 sai; ao fechar, volta o fundo da linha e a cor de frente anterior (31).
	assert.ok(rows[0].includes(`${D}<text>hello</c>${ESC}48;2;45;24;24m${ESC}31m`), JSON.stringify(rows[0]));
	assert.ok(!rows[0].includes(`${ESC}31mhello`));
});

test("sem truecolor (256 cores): inverse do tema; sem inverse: negrito", () => {
	const t256 = { ...theme, getFgAnsi: () => `${ESC}38;5;70m`, getBgAnsi: () => `${ESC}48;5;22m` };
	const diff = "-1 x hello\n+1 x hola";
	assert.ok(run(diff, t256)[1].includes("<inv><text>hola</c></inv>"));
	const { inverse: _i, ...noInv } = t256;
	assert.ok(run(diff, noInv)[1].includes("<b><text>hola</c></b>"));
	const { getFgAnsi: _f, getBgAnsi: _b, ...noApi } = theme;
	assert.ok(run(diff, noApi)[1].includes("<inv>"));
});

test("largura: corta preservando o fundo (reset parcial) e nunca passa da largura", () => {
	const real = {
		...theme,
		fg: (_c: string, t: string) => `${ESC}38;5;111m${t}${ESC}39m`,
		bg: (c: string, t: string) => `${ESC}${BG[c]}m${t}${ESC}49m`,
	};
	const rows = renderDiff("+1 abcdefghijklmnopqrstuvwxyz", real, { width: 12, fitLine, visibleWidth });
	assert.equal(visibleWidth(rows[0]), 12);
	assert.ok(rows[0].startsWith(`${ESC}${BG.toolSuccessBg}m`));
	assert.ok(rows[0].endsWith(`${ESC}49m`));
	assert.ok(rows[0].includes("…"));
	assert.ok(!rows[0].slice(0, -`${ESC}49m`.length).includes(`${ESC}0m`), "o reset total apagaria o fundo");
	// Linha curta é preenchida com espaços dentro do fundo.
	assert.equal(visibleWidth(renderDiff("+1 a", real, { width: 12, fitLine, visibleWidth })[0]), 12);
});

// ── D4: fundo de diff derivado da cor do diff ────────────────────────────────

const MIXV = 0.3;
const CMB = [38, 39, 52];
const seen: string[] = [];
const tc: any = {
	...theme,
	bg: (c: string, t: string) => {
		seen.push(c);
		return `<bg:${c}>${t}</bg>`;
	},
	getBgAnsi: (c: string) => {
		seen.push(`get:${c}`);
		return `${ESC}48;2;${CMB.join(";")}m`;
	},
};
const tintOf = (fg: number[]) => `${ESC}48;2;${mixRgb(fg, CMB, TINT).join(";")}m`;
const ADD = [48, 209, 88];
const REM = [255, 90, 90];

test("D4: tema truecolor: add/del usam o tint mixRgb(cor do diff, fundo base, TINT) e não pedem toolSuccessBg/toolErrorBg", () => {
	seen.length = 0;
	const rows = run(" 9 a\n+10 b\n-11 c", tc, {}, 10);
	assert.ok(rows[1].startsWith(tintOf(ADD)), JSON.stringify(rows[1]));
	assert.ok(rows[2].startsWith(tintOf(REM)), JSON.stringify(rows[2]));
	assert.ok(!seen.some((c) => /toolSuccessBg|toolErrorBg/.test(c)), seen.join());
	assert.equal(plain(rows[1]).length, 10, "preenchido até a largura");
	// o.base troca o fundo de referência do tint.
	const b = run("+1 x", tc, { base: "toolPendingBg" }, 10)[0];
	assert.ok(b.startsWith(`${ESC}48;2;${mixRgb(ADD, CMB, TINT).join(";")}m`));
});

test("D4: tema sem getFgAnsi/getBgAnsi (ou sem truecolor): fundo nomeado como antes", () => {
	const { getFgAnsi: _f, getBgAnsi: _b, ...noApi } = theme;
	const rows = run("+10 b\n-11 c", noApi, {}, 10);
	assert.ok(rows[0].startsWith("<bg:toolSuccessBg>") && rows[1].startsWith("<bg:toolErrorBg>"));
	const t256 = { ...theme, getFgAnsi: () => `${ESC}38;5;70m`, getBgAnsi: () => `${ESC}48;5;22m` };
	assert.ok(run("+10 b", t256, {}, 10)[0].startsWith("<bg:toolSuccessBg>"));
});

test("D4: gutter na cor do diff nas linhas add/del e dim no contexto", () => {
	const rows = run(" 9 a\n+10 b\n-11 c", theme, {}, 11);
	assert.ok(rows[0].startsWith("  <dim> 9</c>"));
	assert.ok(rows[1].includes("<toolDiffAdded>10</c>") && !rows[1].includes("<dim>"));
	assert.ok(rows[2].includes("<toolDiffRemoved>11</c>") && !rows[2].includes("<dim>"));
});

test("D4: ênfase de palavra mistura 30% sobre o tint da linha e volta ao tint", () => {
	const rows = run("-2 x = 'hello'\n+2 x = 'olá, mundo'", tc, {}, 40);
	const addT = mixRgb(ADD, CMB, TINT);
	const S = `${ESC}48;2;${mixRgb(ADD, addT, MIXV).join(";")}m`;
	assert.ok(rows[1].includes(`${S}<text>olá, mundo</c>${tintOf(ADD)}<text>'</c>`), JSON.stringify(rows[1]));
	const remT = mixRgb(REM, CMB, TINT);
	const D = `${ESC}48;2;${mixRgb(REM, remT, MIXV).join(";")}m`;
	assert.ok(rows[0].includes(`${D}<text>hello</c>${tintOf(REM)}<text>'</c>`), JSON.stringify(rows[0]));
});

test("TINT é uma fração pequena (0,16 é o teto medido pelo contraste; 0,18 falha)", () =>
	assert.ok(TINT > 0 && TINT <= 0.16));

// ── numeração pelo arquivo novo ──────────────────────────────────────────────

test("numeração: contexto pelo arquivo novo após inserção no meio; removidas mantêm o antigo", () => {
	// Nativo: ` 5 a`, `+6 n`, ` 6 b` (antigo 6) → b vira 7 no arquivo novo.
	const rows = run(" 5 a\n+6 n\n 6 b\n 7 c", theme, {}, 12).map(plain);
	assert.deepEqual(
		rows.map((r) => r.trim().split(/\s+/)[0]),
		["5", "6", "7", "8"],
	);
});

test("numeração: deslocamento acumula entre trechos separados por ...", () => {
	const d = " 5 a\n+6 n1\n+7 n2\n 6 b\n     ...\n 20 c\n-21 gone\n 22 d\n     ...\n 30 e";
	const rows = run(d, theme, {}, 14).map(plain);
	// +2 após o 1º trecho: c = 22; remoção em 21 (antigo); d: antigo 22 + 2 − 1 = 23; e: 30 + 1 = 31.
	assert.deepEqual(
		rows.map((r) => r.trim().split(/\s+/)[0]),
		["5", "6", "7", "8", "⋯", "22", "21", "23", "⋯", "31"],
	);
});

test("numeração: remoção pura desloca o contexto seguinte para baixo; largura da coluna depois do ajuste", () => {
	const rows = run(" 8 a\n-9 x\n-10 y\n 11 b", theme, {}, 12).map(plain);
	assert.deepEqual(
		rows.map((r) => r.trim().split(/\s+/)[0]),
		["8", "9", "10", "9"],
	);
	// 99 (antigo) + 1 = 100: a coluna passa a 3 dígitos.
	const wide = run("+99 n\n 99 b", theme, {}, 12).map(plain);
	assert.ok(wide[0].startsWith("   99 + "), wide[0]);
	assert.ok(wide[1].startsWith("  100"), wide[1]);
});

// ── fundo base (caixa neutra do edit) ────────────────────────────────────────

test("base: contexto, separador e malformada ganham o fundo base preenchido; mudadas mantêm o tinto", () => {
	const rows = run(" 1 a\n+2 b\n     ...\n???", theme, { base: "toolPendingBg" }, 11);
	assert.equal(rows[0], "<bg:toolPendingBg>  <dim>1</c>    <toolDiffContext>a</c>   </bg>");
	assert.ok(rows[1].startsWith(`${ESC}48;2;${mixRgb([48, 209, 88], [30, 30, 40], TINT).join(";")}m`)); // D4: fundo de diff derivado
	assert.ok(rows[2].startsWith("<bg:toolPendingBg>") && plain(rows[2]).trim() === "⋯");
	assert.ok(rows[3].startsWith("<bg:toolPendingBg>") && plain(rows[3]).length === 11);
	assert.ok(!rows.join("").includes("toolErrorBg"));
});

test("base: sem cor ou sem base, nada muda", () => {
	const mono = { ...theme, fg: (_c: string, t: string) => t, bg: (_c: string, t: string) => `[${t}]` };
	assert.deepEqual(run(" 1 a", mono, { base: "toolPendingBg" }, 10), ["  1    a"]);
	const noBg = { ...theme, bg: undefined };
	assert.equal(run(" 1 a", noBg, { base: "toolPendingBg" }, 10)[0], "  <dim>1</c>    <toolDiffContext>a</c>");
});

test("base: reset do realce (0m e 49m) reabre o fundo da linha; ênfase devolve o fundo tinto", () => {
	const real = {
		...theme,
		fg: (_c: string, t: string) => `${ESC}38;5;111m${t}${ESC}39m`,
		bg: (c: string, t: string) => `${ESC}${BG[c]}m${t}${ESC}49m`,
	};
	const P = `${ESC}${BG.toolPendingBg}m`;
	const hl = (l: string) => `${ESC}35m${l}${ESC}0m`;
	const ctxRow = run(" 1 ab", real, { base: "toolPendingBg", highlight: hl }, 12)[0];
	assert.ok(ctxRow.includes(`${ESC}0m${P}`), JSON.stringify(ctxRow));
	const hl49 = (l: string) => `${ESC}35m${l}${ESC}49m`;
	assert.ok(run(" 1 ab", real, { base: "toolPendingBg", highlight: hl49 }, 12)[0].includes(`${ESC}49m${P}`));
	const add = run("+1 ab", real, { base: "toolPendingBg", highlight: hl }, 12)[0];
	const T = `${ESC}48;2;${mixRgb([48, 209, 88], [30, 30, 40], TINT).join(";")}m`; // D4: fundo de diff derivado
	assert.ok(add.includes(`${ESC}0m${T}`), JSON.stringify(add));
	// Ênfase: ao sair do trecho forte volta o tinto (nunca o neutro) e o contexto seguinte continua neutro.
	const pair = run("-1 x = 'hello'\n+1 x = 'hola'\n 2 z", real, { base: "toolPendingBg" }, 30);
	assert.ok(pair[1].includes(T) && !pair[1].includes(P)); // D4: fundo de diff derivado
	assert.ok(pair[2].startsWith(P));
});

// U5: parse, ênfase e realce não dependem da largura: arrastar a janela só refaz corte e preenchimento.
test("U5: prepareDiff devolve as mesmas entradas para o mesmo diff; renderDiff igual em qualquer ordem de larguras", () => {
	const diff = " 1 a\n-2 hello world\n+2 hello there\n 3 z";
	assert.equal(prepareDiff(diff), prepareDiff(diff));
	assert.notEqual(prepareDiff(diff), prepareDiff(`${diff}\n 4 q`));
	const frescos = [30, 50, 30].map((w) => renderDiff(diff, theme, { width: w, ...base }));
	// ordem trocada, com o cache já quente: mesma saída
	assert.deepEqual(
		[50, 30, 30].map((w) => run(diff, theme, {}, w)),
		[frescos[1], frescos[0], frescos[2]],
	);
});

test("U5: memoLine realça cada linha uma vez, entre larguras; clear refaz", () => {
	let n = 0;
	const hl = memoLine((l: string) => {
		n++;
		return `[${l}]`;
	});
	const diff = " 1 a\n-2 b\n+2 c";
	const a = run(diff, theme, { highlight: hl.fn }, 30);
	const depois = n;
	const b = run(diff, theme, { highlight: hl.fn }, 50);
	assert.equal(n, depois, "nova largura não realça de novo");
	assert.equal(a.map(plain).join("|").replaceAll(" ", ""), b.map(plain).join("|").replaceAll(" ", ""));
	hl.clear();
	run(diff, theme, { highlight: hl.fn }, 30);
	assert.equal(n, depois * 2);
});

test("U23: diff de centenas de milhares de linhas não estoura a pilha no cálculo da largura dos números", () => {
	const diff = Array.from({ length: 300_000 }, (_, i) => ` ${i + 1} x`).join("\n");
	assert.equal(run(diff).length, 300_000);
});
