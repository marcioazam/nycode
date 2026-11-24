import assert from "node:assert/strict";
import {
	getOsc8LinkAtColumn,
	stripTerminalSequences,
	truncateToWidth,
	visibleWidth,
	wrapTextWithAnsi,
} from "@nycode/tui";
import { afterEach, beforeEach, test, vi } from "vitest";

import {
	blockId,
	contrast,
	detectLang,
	ensureContrast,
	hexToRgb,
	keepBg,
	osc8,
	palette,
	parseBgAnsi,
	type RGB,
	renderCodeBlock,
	resolveLang,
	TEXT_COLOR,
} from "../../../../src/extensions/code-blocks/blocks.ts";

// The rendering reads TERM: pin it so the suite does not depend on the shell it runs in.
beforeEach(() => {
	vi.stubEnv("TERM", "xterm-256color");
});
afterEach(() => {
	vi.unstubAllEnvs();
});

const DARK: RGB = [38, 39, 52];
const LIGHT: RGB = [242, 242, 247];
const FB = { bg: "\x1b[48;5;236m", label: "\x1b[38;5;75m", button: "\x1b[38;5;245m" };
const u = { visibleWidth, wrapTextWithAnsi, truncateToWidth };

test("etiqueta vira rótulo e cor; aliases, maiúsculas, language- e metadados", () => {
	assert.equal(resolveLang("py").name, "py");
	assert.equal(resolveLang("py").color, "#3572A5");
	assert.equal(resolveLang("Bash").color, "#89e051");
	assert.equal(resolveLang("console").color, "#89e051");
	assert.equal(resolveLang("language-ts").color, "#3178c6");
	assert.equal(resolveLang("tsx").color, "#3178c6");
	assert.equal(resolveLang("js {1,3}").name, "js");
	assert.equal(resolveLang("js {1,3}").color, "#f1e05a");
	assert.deepEqual(resolveLang("cobolzinho"), { name: "cobolzinho", grammars: ["cobolzinho"] });
	for (const t of ["", undefined, "text", "txt", "plaintext"])
		assert.deepEqual(resolveLang(t), { name: "texto", color: TEXT_COLOR, grammars: [] });
});

test("fundo neutro igual para todas as linguagens; só o rótulo muda de cor", () => {
	const py = palette(resolveLang("python").color, DARK, FB);
	const sh = palette(resolveLang("bash").color, DARK, FB);
	const js = palette(resolveLang("js").color, DARK, FB);
	assert.equal(new Set([py.body, sh.body, js.body]).size, 1);
	assert.equal(py.body, "\x1b[48;2;38;39;52m");
	assert.equal(new Set([py.head, sh.head, js.head]).size, 1);
	assert.equal(new Set([py.label, sh.label, js.label, palette(TEXT_COLOR, DARK, FB).label]).size, 4);
});

test("rótulo e botão sempre com contraste >= 4.5 no escuro e no claro, até com cores quase pretas", () => {
	for (const base of [DARK, LIGHT]) {
		for (const lang of ["python", "bash", "js", "json", "lua", "powershell", "c", "yaml", "x"]) {
			const p = palette(resolveLang(lang).color, base, FB);
			const head = parseBgAnsi(p.head)!;
			const fg = (s: string) => /38;2;(\d+);(\d+);(\d+)m/.exec(s)!.slice(1).map(Number) as RGB;
			assert.ok(contrast(fg(p.label), head) >= 4.5, `${lang} rótulo`);
			assert.ok(contrast(fg(p.button), head) >= 4.5, `${lang} botão`);
		}
	}
});

test("ensureContrast preserva a cor quando ela já basta", () => {
	assert.deepEqual(ensureContrast(hexToRgb("#ffffff"), DARK), [255, 255, 255]);
	assert.ok(contrast(ensureContrast(hexToRgb("#012456"), DARK), DARK) >= 4.5);
});

test("sem truecolor usa as sequências do tema", () => {
	assert.equal(parseBgAnsi("\x1b[48;5;236m"), undefined);
	assert.deepEqual(palette("#3572A5", undefined, FB), {
		body: FB.bg,
		head: FB.bg,
		label: FB.label,
		button: FB.button,
	});
});

test("keepBg reaplica o fundo depois de resets", () => {
	assert.equal(keepBg("a\x1b[0mb\x1b[mc\x1b[49md\x1b[39me", "BG"), "a\x1b[0mBGb\x1b[mBGc\x1b[49mBGd\x1b[39me");
});

test("bloco: sem cerca nem borda, toda linha com a largura exata e fundo, botão clicável copia pelo id", () => {
	const code = "def f(x):\n    return x * 2\n\nprint(f(21))";
	const id = blockId(code);
	const pal = palette("#3572A5", DARK, FB);
	const out = renderCodeBlock(
		{
			lines: code.split("\n").map((l) => `\x1b[38;5;81m${l}\x1b[0m`),
			lang: "python",
			button: osc8(`nycode-copy:${id}`, "⧉ copiar"),
			width: 40,
			pal,
		},
		u,
	);
	const plain = out.map(stripTerminalSequences);
	assert.equal(out.length, 3 + 1 + 4 + 1); // cabeçalho com respiro próprio + respiro, código, respiro
	for (const l of out) assert.equal(visibleWidth(l), 40);
	assert.ok(!plain.some((l: string) => l.includes("```") || /[│╭╮╰╯─]/.test(l)));
	assert.equal(plain[0], "▄".repeat(40)); // meia linha em cima e embaixo do rótulo, na cor do cabeçalho
	assert.equal(plain[2], "▀".repeat(40));
	const headFg = pal.head.replace("\x1b[48;", "\x1b[38;");
	assert.ok(out[0].startsWith(headFg) && !out[0].includes(pal.head), "em cima: fundo de fora");
	assert.ok(out[2].startsWith(pal.body + headFg), "embaixo: sobre o fundo do corpo");
	assert.match(plain[1], /^ {3}python +⧉ copiar {3}$/);
	assert.equal(plain[3], " ".repeat(40));
	assert.equal(plain[5], "       return x * 2".padEnd(40));
	assert.equal(plain.at(-1), " ".repeat(40));
	for (const l of out.slice(3)) assert.ok(l.startsWith(pal.body));
	assert.ok(out[4].includes(`\x1b[0m${pal.body}`), "fundo volta depois do reset do realce");
	const col = plain[1].indexOf("⧉");
	assert.equal(getOsc8LinkAtColumn(out[1], col), `nycode-copy:${id}`);
	assert.equal(getOsc8LinkAtColumn(out[1], 3), undefined);
});

test("linha longa quebra dentro do fundo; id estável por conteúdo", () => {
	const pal = palette("#89e051", LIGHT, FB);
	const out = renderCodeBlock({ lines: [`echo ${"a".repeat(60)}`], lang: "bash", button: "", width: 30, pal }, u);
	assert.ok(out.length >= 4);
	for (const l of out) assert.equal(visibleWidth(l), 30);
	assert.equal(blockId("x"), blockId("x"));
	assert.notEqual(blockId("x"), blockId("y"));
});

test("detecção sem etiqueta: comandos, linguagens comuns e texto na dúvida", () => {
	assert.equal(detectLang("cursor ~/code/nycode"), "bash");
	assert.equal(detectLang("$ npm install\n$ npm test"), "bash");
	assert.equal(detectLang("cd /tmp\ngit status\nFOO=1 make build"), "bash");
	assert.equal(detectLang("#!/usr/bin/env bash\nqualquer coisa"), "bash");
	assert.equal(detectLang("def f(x):\n    return x"), "python");
	assert.equal(detectLang("from os import path\nprint(path.sep)"), "python");
	assert.equal(detectLang('{ "a": 1 }'), "json");
	assert.equal(detectLang("const a = 1\nconsole.log(a)"), "js");
	assert.equal(detectLang("interface A { x: number }"), "ts");
	assert.equal(detectLang("SELECT * FROM t WHERE id = 1"), "sql");
	assert.equal(detectLang('<div class="x">oi</div>'), "html");
	assert.equal(detectLang("nome: nycode\nversao: 1.5.2"), "yaml");
	assert.equal(detectLang("Olá, isto é só uma frase comum."), undefined);
	assert.equal(detectLang("Passo 1: abra o app\nPasso 2: clique em salvar"), undefined);
	assert.equal(detectLang(""), undefined);
});

// Linha maior que o terminal faz o @nycode/tui lançar e encerrar o processo: o cabeçalho nunca passa de `width`.
test("cabeçalho nunca passa da largura, com rótulo de até 200 colunas (ASCII, CJK, emoji) e botões diversos", () => {
	const pal = palette("#3572A5", DARK, FB);
	const labels = ["x".repeat(200), "漢".repeat(100), "😀".repeat(100), "a漢😀".repeat(30), "python"];
	const buttons = ["", "/copy-code", osc8("nycode-copy:abc", "⧉ copiar")];
	for (const lang of labels)
		for (const button of buttons)
			for (let width = 4; width <= 80; width++) {
				const out = renderCodeBlock({ lines: ["x"], lang, button, width, pal }, u);
				for (const l of out)
					assert.ok(visibleWidth(l) <= width, `w=${width} ${lang.slice(0, 6)} -> ${visibleWidth(l)}`);
				if (width >= 20) {
					for (const l of out) assert.equal(visibleWidth(l), width);
					if (button)
						assert.ok(
							stripTerminalSequences(out[1]).includes(stripTerminalSequences(button)),
							`botão some em w=${width}`,
						);
				}
			}
});

test("rótulo truncado leva reticências; rótulo que cabe fica intacto", () => {
	const pal = palette("#3572A5", DARK, FB);
	const head = (lang: string) =>
		stripTerminalSequences(renderCodeBlock({ lines: [], lang, button: "/copy-code", width: 30, pal }, u)[1]);
	assert.match(head("python"), /^ python +\/copy-code $/);
	assert.match(head("x".repeat(80)), /^ x+… \/copy-code $/);
});
