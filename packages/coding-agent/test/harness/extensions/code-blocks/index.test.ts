import assert from "node:assert/strict";
import { afterEach, beforeEach, test, vi } from "vitest";
import * as __r1 from "../../../../src/extensions/code-blocks/index.ts";

// The rendering reads TERM: pin it so the suite does not depend on the shell it runs in.
beforeEach(() => {
	vi.stubEnv("TERM", "xterm-256color");
});
afterEach(() => {
	vi.unstubAllEnvs();
});

const { memoHighlight, resetHighlightCache, remember, recall, rememberedCount, syntaxPalette } = __r1;

const lines = (n: number) => Array.from({ length: n }, (_, i) => `l${i}`).join("\n");
const counter = () => {
	let n = 0;
	return {
		calls: () => n,
		run: (t: string) => () => {
			n++;
			return t.split("\n").map((l) => `<${l}>`);
		},
	};
};
const plain = (t: string) => t.split("\n");

test("realce: duas renderizações do mesmo bloco chamam o realce uma vez; texto diferente chama de novo", () => {
	resetHighlightCache();
	const c = counter();
	const a = memoHighlight("t1", "ts", "const a = 1\n", c.run("const a = 1\n"), plain);
	const b = memoHighlight("t1", "ts", "const a = 1\n", c.run("const a = 1\n"), plain);
	assert.equal(c.calls(), 1);
	assert.deepEqual(b, a);
	memoHighlight("t1", "ts", "const a = 2\n", c.run("const a = 2\n"), plain);
	assert.equal(c.calls(), 2);
	memoHighlight("t1", "py", "const a = 1\n", c.run("const a = 1\n"), plain); // outra gramática
	assert.equal(c.calls(), 3);
});

test("realce: mudança de tema invalida", () => {
	resetHighlightCache();
	const c = counter();
	memoHighlight("escuro", "ts", "x\n", c.run("x\n"), plain);
	memoHighlight("claro", "ts", "x\n", c.run("x\n"), plain);
	assert.equal(c.calls(), 2);
	memoHighlight("escuro", "ts", "x\n", c.run("x\n"), plain);
	assert.equal(c.calls(), 3, "entradas do tema anterior não ficam");
});

test("realce: bloco acima de 2.000 linhas não é realçado; 2.000 é", () => {
	resetHighlightCache();
	const c = counter();
	const big = lines(2001);
	assert.deepEqual(memoHighlight("t", "ts", big, c.run(big), plain), plain(big));
	assert.equal(c.calls(), 0);
	memoHighlight("t", "ts", lines(2000), c.run(lines(2000)), plain);
	assert.equal(c.calls(), 1);
});

test("realce: teto de 200 entradas (LRU) e de bytes", () => {
	resetHighlightCache();
	const c = counter();
	for (let i = 0; i < 201; i++) memoHighlight("t", "ts", `a${i}\n`, c.run(`a${i}\n`), plain);
	assert.equal(c.calls(), 201);
	memoHighlight("t", "ts", "a200\n", c.run("a200\n"), plain); // mais recente: acerta
	assert.equal(c.calls(), 201);
	memoHighlight("t", "ts", "a0\n", c.run("a0\n"), plain); // o mais antigo foi expulso
	assert.equal(c.calls(), 202);
	resetHighlightCache();
	const huge = "y".repeat(3 << 20); // 2 x 3 MB passam de 4 MB: só o último fica
	memoHighlight("t", "ts", `${huge}1\n`, () => [`${huge}1\n`], plain);
	memoHighlight("t", "ts", `${huge}2\n`, () => [`${huge}2\n`], plain);
	memoHighlight("t", "ts", `${huge}1\n`, c.run("z"), plain);
	assert.equal(c.calls(), 203);
});

test("remember: bloco em stream ocupa uma entrada e não expulsa o bloco fechado", () => {
	const owner = {};
	const first = remember("bloco um", owner, false);
	const code = "x".repeat(700);
	let id = "";
	for (let i = 1; i <= 600; i++) id = remember(code.slice(0, i), owner, true);
	assert.equal(recall(first), "bloco um");
	assert.ok(rememberedCount() <= 3, `entradas: ${rememberedCount()}`);
	assert.equal(recall(id), code.slice(0, 600)); // o botão do bloco em stream copia o texto mais recente
});

test("remember: bloco fechado continua recuperável; fechar o bloco troca a entrada parcial pela final", () => {
	const owner = {};
	const before = rememberedCount();
	remember("ls", owner, true);
	remember("ls -la", owner, true);
	const closed = remember("ls -la /tmp", owner, false);
	assert.equal(recall(closed), "ls -la /tmp");
	assert.equal(rememberedCount(), before + 1);
});

test("remember: blocos fechados distintos que começam igual não se substituem", () => {
	const owner = {};
	const a = remember("git", owner, false);
	const b = remember("git status", owner, false);
	assert.equal(recall(a), "git");
	assert.equal(recall(b), "git status");
});

test("U26: paleta de sintaxe usa os tokens syntax* do tema e troca com o tema", () => {
	const key = Symbol.for("@nycode/coding-agent:theme");
	const g = globalThis as unknown as Record<symbol, unknown>;
	const prev = g[key];
	const tema = (name: string, kw?: string) => ({
		name,
		getBgAnsi: () => "\x1b[48;2;30;30;30m",
		getFgAnsi: (t: string) => (t === "syntaxKeyword" && kw ? kw : "\x1b[39m"),
	});
	try {
		g[key] = tema("a");
		const semToken = syntaxPalette();
		g[key] = tema("b", "\x1b[38;2;255;200;0m");
		const comToken = syntaxPalette();
		assert.ok(semToken && comToken);
		assert.notDeepEqual(comToken.p.byClass, semToken.p.byClass, "o token do tema muda a paleta");
		assert.notEqual(comToken.key, semToken.key, "temas diferentes no mesmo fundo não dividem o cache");
	} finally {
		g[key] = prev;
	}
});
