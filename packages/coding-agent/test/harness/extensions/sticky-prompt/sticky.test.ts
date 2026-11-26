import assert from "node:assert/strict";
import { stripTerminalSequences, truncateToWidth, visibleWidth } from "@nycode/tui";
import { test } from "vitest";
import {
	findSticky,
	indicadorFim,
	stickyLine,
	stickyLinhas,
	stickyRect,
	stickyStyle,
	userMatcher,
} from "../../../../src/extensions/sticky-prompt/sticky.ts";

const BG = "\x1b[48;5;236m";
const A = "\x1b]133;A\x07";
const BC = "\x1b]133;B\x07\x1b]133;C\x07";
const lines = [
	`${A}${BG}   \x1b[49m`,
	`${BG} primeiro pedido \x1b[49m`,
	`${BC}${BG}   \x1b[49m`,
	`${A}resposta do assistente`,
	`${BC}fim`,
	`${A}${BG}   \x1b[49m`,
	`${BG} segundo \x1b[1mpedido\x1b[22m \x1b[49m`,
	`${BG} linha 2 \x1b[49m`,
	`${BC}${BG}   \x1b[49m`,
	"saída",
	"mais saída",
];
const strip = stripTerminalSequences;
const isUser = userMatcher(["Primeiro   pedido", "segundo **pedido**\nlinha 2", "???"]);

test("matcher ignora pontuação, markdown e textos vazios", () => {
	assert.equal(isUser("primeiro pedido"), true);
	assert.equal(isUser("resposta do assistente fim"), false);
	assert.equal(userMatcher(["!!"])("qualquer"), false);
});

test("acha o prompt do usuário mais recente acima da janela, ignorando o assistente", () => {
	assert.deepEqual(findSticky(lines, 10, isUser, strip), { row: 5, text: "segundo pedido linha 2" });
	assert.deepEqual(findSticky(lines, 5, isUser, strip), { row: 0, text: "primeiro pedido" });
	assert.deepEqual(findSticky(lines, 4, isUser, strip), { row: 0, text: "primeiro pedido" });
});

test("nada quando nenhum prompt saiu da janela", () => {
	assert.equal(findSticky(lines, 0, isUser, strip), undefined);
	assert.equal(findSticky(["x", `${A}${BG}assistente`], 2, isUser, strip), undefined);
	assert.deepEqual(findSticky(lines, 999, isUser, strip)?.row, 5);
});

test("linha cabe na largura e trunca com reticências", () => {
	const id = (s: string) => s;
	const short = stickyLine("oi", 20, truncateToWidth, visibleWidth, id);
	assert.equal(visibleWidth(short), 20);
	assert.ok(short.startsWith("   ❯ oi"));
	const long = stickyLine("x".repeat(100), 30, truncateToWidth, visibleWidth, id);
	assert.equal(visibleWidth(long), 30);
	assert.ok(strip(long).endsWith("…   "), JSON.stringify(long));
	assert.ok(stickyLine("a", 1, truncateToWidth, visibleWidth, (s) => `[${s}]`).startsWith("["));
});

test("estilo usa selectedBg/text do tema e fecha as cores", () => {
	// tema colorido falso
	const theme = { getFgAnsi: () => "<fg>", getBgAnsi: () => "<bg>" };
	assert.equal(stickyStyle(theme)("x"), "<bg><fg>x\x1b[39m\x1b[49m");
});

test("tema mono (NO_COLOR) não emite SGR", () => {
	// cor vazia no nycode = reset padrão: nenhuma sequência de escape
	const mono = { getFgAnsi: () => "\x1b[39m", getBgAnsi: () => "\x1b[49m" };
	assert.equal(stickyStyle(mono)("x"), "x");
	assert.equal(stickyStyle({ getFgAnsi: () => "", getBgAnsi: () => "" })("x"), "x");
});

test("estilo relê o tema a cada chamada", () => {
	// o tema muda em runtime
	let on = true;
	const theme = { getFgAnsi: () => (on ? "<fg>" : "\x1b[39m"), getBgAnsi: () => (on ? "<bg>" : "\x1b[49m") };
	const style = stickyStyle(theme);
	assert.ok(style("a").includes("<bg>"));
	on = false;
	assert.equal(style("a"), "a");
});

// Bug seen by the owner (2026-11-14): with the arrow and hour on sent messages the sticky showed `❯ ❯ continue ... 14...`.
test("stickyLine: não repete a setinha nem mostra a hora que a mensagem já traz", () => {
	const id = (s: string) => s;
	assert.equal(
		stickyLine(`❯ continue${" ".repeat(40)}14:05`, 30, truncateToWidth, visibleWidth, id).trimEnd(),
		"   ❯ continue",
	);
	assert.equal(stickyLine("> continue", 30, truncateToWidth, visibleWidth, id).trimEnd(), "   ❯ continue");
	assert.equal(stickyLine("rodar às 14:05", 30, truncateToWidth, visibleWidth, id).trimEnd(), "   ❯ rodar às 14:05"); // hour in the middle stays
});

// Owner's request (2026-11-15): nothing in the chat takes 100%; the sticky line respects the chat margin.
test("stickyRect: dentro da margem e sem a barra de rolagem; pad 0 ou estreito ocupa tudo menos a barra", () => {
	assert.deepEqual(stickyRect({ x: 0, width: 100 }, 1), { col: 1, width: 97 });
	assert.deepEqual(stickyRect({ x: 3, width: 100 }, 0), { col: 3, width: 99 });
	assert.deepEqual(stickyRect({ x: 0, width: 21 }, 1), { col: 0, width: 20 });
});

test("findSticky acha o prompt com a margem do chat-margin (OSC 133 na coluna 0, espaços depois)", () => {
	const l = ["\x1b]133;A\x07 \x1b[48;5;1m ❯ oi mundo\x1b[49m ", "\x1b]133;B\x07 fim ", "x", "y"];
	assert.deepEqual(
		findSticky(l, 3, (z) => z.includes("oi mundo"), strip),
		{ row: 0, text: "❯ oi mundo fim" },
	);
});

// Reference: the previous implementation (line scan on every call).
function findStickyRef(
	l: readonly string[],
	scrollTop: number,
	isU: (z: string) => boolean,
	st: (s: string) => string,
) {
	const START = /^(?:\x1b\]133;[BC](?:\x07|\x1b\\))*\x1b\]133;A(?:\x07|\x1b\\)/;
	const END = /\x1b\]133;B(?:\x07|\x1b\\)/;
	for (let row = Math.min(scrollTop, l.length) - 1; row >= 0; row--) {
		if (!START.test(l[row] ?? "")) continue;
		const parts: string[] = [];
		for (let r = row; r < l.length; r++) {
			const t = st(l[r] ?? "").trim();
			if (t) parts.push(t);
			if (END.test(l[r] ?? "")) break;
		}
		const text = parts.join(" ");
		if (isU(text)) return { row, text };
	}
	return undefined;
}

test("equivalência com a implementação anterior em 200 entradas pseudoaleatórias (semente fixa)", () => {
	let seed = 12345;
	const rnd = (n: number) => {
		seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
		return seed % n;
	};
	const pool = [
		`${A}meu pedido`,
		`${A}${BG}outro pedido`,
		`${A}resposta`,
		`${A}\x1b]133;B\x07um só`,
		BC,
		"texto",
		"",
		"mais texto",
		`x${A}no meio`,
	];
	const user = userMatcher(["meu pedido", "outro pedido"]);
	for (let i = 0; i < 200; i++) {
		const arr = Array.from({ length: rnd(40) }, () => pool[rnd(pool.length)] as string);
		for (let k = 0; k < 3; k++) {
			const top = rnd(arr.length + 5) - 2;
			assert.deepEqual(
				findSticky(arr, top, user, strip),
				findStickyRef(arr, top, user, strip),
				`caso ${i}/${k} top=${top}`,
			);
		}
	}
});

test("mesma entrada não reexecuta a varredura; mudança de comprimento, última linha, scrollTop ou matcher refaz", () => {
	let calls = 0;
	const strip2 = (s: string) => {
		calls++;
		return strip(s);
	};
	const arr = [...lines];
	const first = findSticky(arr, 10, isUser, strip2);
	const n = calls;
	assert.ok(n > 0);
	assert.equal(findSticky(arr, 10, isUser, strip2), first);
	assert.equal(calls, n);
	assert.deepEqual(findSticky(arr, 5, isUser, strip2), { row: 0, text: "primeiro pedido" }); // new scrollTop
	arr.push(`${A}${BG} terceiro \x1b[49m`, `${BC}`); // same array growing (stream)
	assert.deepEqual(findSticky(arr, 13, userMatcher(["terceiro"]), strip2), { row: 11, text: "terceiro" });
	arr[arr.length - 1] = `${BG}tail`;
	assert.deepEqual(findSticky(arr, 13, userMatcher(["terceiro"]), strip2), { row: 11, text: "terceiro tail" }); // last line changed, same length
	assert.deepEqual(findSticky(arr, 13, isUser, strip2), findStickyRef(arr, 13, isUser, strip));
});

test("índice incremental: arrays novos que repetem, cortam ou trocam linhas do anterior dão o mesmo resultado da varredura completa", () => {
	const user = userMatcher(["meu pedido", "terceiro"]);
	const base = [`${A}${BG} meu pedido \x1b[49m`, BC, `${A}resposta`, BC, "texto", `${A}${BG} terceiro \x1b[49m`, BC];
	const frames = [
		[...base, "stream 1"],
		[...base, "stream 1", "stream 2"],
		[...base.slice(0, 4), "texto trocado", ...base.slice(5), "stream 2"], // linha do meio mudou
		base.slice(0, 3), // encolheu: a zona do terceiro saiu
		[`${A}novo topo`, ...base], // tudo deslocado
		[],
		base,
	];
	for (const [i, f] of frames.entries())
		for (const top of [0, 2, 5, 7, 9])
			assert.deepEqual(
				findSticky(f, top, user, strip),
				findStickyRef(f, top, user, strip),
				`quadro ${i} top=${top}`,
			);
});

test("resposta longa acima da janela: o matcher de prefixo lê só o começo dela; o prompt achado vem inteiro", () => {
	const reply = Array.from({ length: 5000 }, (_, i) => `linha ${i} da resposta em stream`);
	const l = [
		`${A}${BG} meu pedido \x1b[49m`,
		`${BG} segunda linha \x1b[49m`,
		BC,
		`${A}${reply[0]}`,
		...reply.slice(1),
	];
	let stripped = 0;
	const s = (x: string) => {
		stripped++;
		return strip(x);
	};
	const r = findSticky(l, l.length, userMatcher(["meu pedido"]), s);
	assert.deepEqual(r, { row: 0, text: "meu pedido segunda linha" });
	assert.ok(stripped <= 10, `strip chamado ${stripped}x`);
	assert.deepEqual(r, findStickyRef(l, l.length, userMatcher(["meu pedido"]), strip));
});

test("busca por índice: não relê linhas fora das zonas", () => {
	const big = Array.from({ length: 20000 }, (_, i) => (i % 100 === 0 ? `${A}pedido ${i}` : `linha ${i}`));
	big[99] = BC;
	let stripped = 0;
	const s = (x: string) => {
		stripped++;
		return strip(x);
	};
	const r = findSticky(big, 19999, () => true, s);
	assert.equal(r?.row, 19900);
	assert.ok(stripped <= 100, `strip chamado ${stripped}x`);
});

// Lab /rolagem desenho 6 "Duas linhas" (owner, 2026-11-19): label `▎ você · hora` above the strip.
test("stickyLinhas: rótulo você · hora em cima, sem fundo; faixa embaixo; ambas na largura", () => {
	const tr = (s: string, w: number) => s.slice(0, w);
	const me = (s: string) => s.split(/<\/?\w*>/g).join("").length;
	const fg = (c: string, s: string) => `<${c}>${s}</>`;
	const [cima = "", baixo] = stickyLinhas("❯ arrume o login  23:58", 40, tr, me, (s) => `[${s}]`, fg);
	assert.equal(cima, `  <accent>▎ você</><dim> · 23:58</>${" ".repeat(40 - 16)}`);
	assert.equal(me(cima), 40);
	assert.equal(
		baixo,
		stickyLine("❯ arrume o login  23:58", 40, tr, me, (s) => `[${s}]`),
	);
	assert.equal(stickyLinhas("sem hora", 30, tr, me, (s) => s, fg)[0]?.trimEnd(), "  <accent>▎ você</>");
});

// Bug (owner, 2026-11-19): a one-line prompt arrives as `133;B 133;C 133;A text` and the sticky did not find it.
test("findSticky acha prompt de uma linha (B e C antes do A na mesma linha)", () => {
	const l = ["x", `${BC}${A} ❯ arrume o login  23:58`, "resposta 1", "resposta 2", "resposta 3"];
	assert.deepEqual(findSticky(l, 3, userMatcher(["arrume o login"]), strip), {
		row: 1,
		text: "❯ arrume o login  23:58",
	});
});

test("indicadorFim: voltar ao fim sem novas; contagem verde com novas; singular", () => {
	const t = { fg: (c: string, s: string) => `<${c}>${s}</>`, bg: (c: string, s: string) => `[${c}]${s}[/]` } as never;
	assert.equal(indicadorFim(0, "ctrl+end", t), "[selectedBg] <text>↓ voltar ao fim · ctrl+end</> [/]");
	assert.equal(indicadorFim(3, "ctrl+end", t), "[selectedBg] <success>3 novas</><text> · ↓ ctrl+end</> [/]");
	assert.equal(indicadorFim(1, "", t), "[selectedBg] <success>1 nova</><text> · ↓</> [/]");
});
