// Apoio compartilhado dos testes de tools.ts (dividido para caber no limite de 800 linhas por arquivo).
import assert from "node:assert/strict";
import { setCapabilities } from "@nycode/tui";
import * as __m2 from "../../../../../src/extensions/ui-visual/icons.ts";
import * as __m1 from "../../../../../src/extensions/ui-visual/tools.ts";

// motion/ importa ../../ui/a11y.ts: a cópia mantém a árvore extensions/{ui,ui-visual}.
// Ícones e links dependem do terminal (Nerd Font no kitty, OSC 8): os testes de texto fixam um terminal neutro,
// para darem o mesmo resultado dentro e fora do kitty e do tmux. Nerd Font tem teste próprio em icons.test.ts.
for (const k of ["KITTY_WINDOW_ID", "NYCODE_NERD_FONT", "NYCODE_ASCII_ICONS", "TMUX"]) delete process.env[k];
process.env.TERM = "xterm-256color";
// Links OSC 8 dependem do terminal (P13): os testes de texto rodam sem eles, em qualquer terminal.
setCapabilities({ images: null, trueColor: true, hyperlinks: false });
export const mod = __m1;
export const { icon, toolIcon } = __m2;
export const visibleWidth = (s: string) => [...s].length; // sem largura dupla nos casos testados

export const theme = { fg: (c: string, t: string) => `<${c}>${t}</c>`, bold: (t: string) => `\u0001${t}\u0002` };
// Para quem só lê texto plano: cores ANSI de verdade, que a medida de largura do @nycode/tui não conta como colunas.
export const ansiPlain = {
	fg: (_c: string, t: string) => `\x1b[2m${t}\x1b[22m`,
	bold: (t: string) => `\x1b[1m${t}\x1b[22m`,
};
// truncateToWidth fecha com \x1b[0m; não ocupa coluna, então sai antes da medida.
export const plain = (s: string) =>
	s
		.split(/<\/?[a-zA-Z]*>/g)
		.join("")
		.replace(/[\u0001\u0002]/g, "")
		.replace(/\x1b\[[0-9;]*m/g, "");
export const ctx = (o: Record<string, unknown> = {}) => ({
	cwd: "/work/proj",
	argsComplete: true,
	isError: false,
	isPartial: false,
	durationMs: undefined,
	args: {},
	state: {},
	...o,
});
export const NATIVE = { tag: "native" };
export const nativeComponent = (label: string) => ({ render: () => [label], invalidate() {} });
export const base = () => ({
	keep: "x",
	renderCall: () => nativeComponent("native-call"),
	renderResult: () => nativeComponent("native-result"),
});
export const resolverOf = (env: Record<string, string> = {}) => {
	const old = process.env.NYCODE_SUBAGENT;
	if ("NYCODE_SUBAGENT" in env) process.env.NYCODE_SUBAGENT = env.NYCODE_SUBAGENT;
	else delete process.env.NYCODE_SUBAGENT;
	const calls: string[] = [];
	let resolver: any;
	mod.default({
		registerToolRenderer: (r: unknown) => {
			calls.push("registerToolRenderer");
			resolver = r;
		},
		registerTool: () => calls.push("registerTool"),
	} as never);
	if (old === undefined) delete process.env.NYCODE_SUBAGENT;
	else process.env.NYCODE_SUBAGENT = old;
	return { calls, resolver };
};
export const wrapped = (name: string, b: any = base()) => resolverOf().resolver(name, () => b);
// Cartão 08: read/bash/grep/find/ls desenham a linha da chamada como cartão de até 58
// colunas: margem 2 + 1 de respiro à esquerda + preenchimento até a borda. Antigo: `  ícone texto`, sem preenchimento, até a
// largura inteira. `ficha` devolve o texto do cartão no formato antigo (recuo de 2, sem preenchimento) para as asserções de conteúdo.
export const CARD = new Set(["read", "bash", "grep", "find", "ls"]);
// antes margem 2 + 1 de respiro (`^ {3}`) e cartão de até 58; agora sem margem: 1 de respiro e largura w.
export const ficha = (s: string) =>
	plain(s)
		.replace(/^ (?=\S)/, "  ")
		.trimEnd();
const linhaDe = (name: string, s: string) => (CARD.has(name) ? ficha(s) : plain(s));
export const header = (name: string, args: Record<string, unknown>, c: Record<string, unknown> = {}, w = 200) =>
	linhaDe(
		name,
		wrapped(name)
			.renderCall(args, ansiPlain, ctx({ args, ...c }))
			.render(w)[0],
	);
export const result = (text: string, details?: unknown) => ({ content: [{ type: "text", text }], details });
// Chamada + resultado com o mesmo contexto (o resumo passa de um para o outro por context.state).
export const row = (
	name: string,
	args: Record<string, unknown>,
	r: unknown,
	c: Record<string, unknown> = {},
	o: Record<string, unknown> = {},
	w = 200,
) => {
	const w0 = wrapped(name);
	const shared = ctx({ args, ...c });
	const call = w0.renderCall(args, ansiPlain, shared);
	const res = w0.renderResult(r, { expanded: false, isPartial: false, ...o }, ansiPlain, shared);
	return [...call.render(w).map((l: string) => linhaDe(name, l)), ...res.render(w).map(plain)];
};
export const body = (
	name: string,
	r: unknown,
	c: Record<string, unknown> = {},
	o: Record<string, unknown> = {},
	w = 200,
) =>
	wrapped(name)
		.renderResult(r, { expanded: false, isPartial: false, ...o }, ansiPlain, ctx(c))
		.render(w)
		.map(plain);
export const BGC: Record<string, number> = {
	toolPendingBg: 17,
	toolSuccessBg: 22,
	toolErrorBg: 52,
	customMessageBg: 236,
};
export const bgTheme = {
	fg: (c: string, t: string) => `\x1b[38;5;${c === "dim" ? 244 : 111}m${t}\x1b[39m`,
	bold: (t: string) => `\x1b[1m${t}\x1b[22m`,
	bg: (c: string, t: string) => `\x1b[48;5;${BGC[c]}m${t}\x1b[49m`,
	getBgAnsi: (c: string) => `\x1b[48;5;${BGC[c]}m`,
	getFgAnsi: () => "\x1b[38;5;111m",
};
// Tema com marcas de largura zero (SGR) no lugar das tags <cor>: o cartão corta pela largura visível e as tags contariam como colunas.
const COD: Record<string, number> = { dim: 90, muted: 37, error: 31, syntaxType: 36, toolTitle: 97, accent: 34 };
export const tg = (c: string, t: string) => `\x1b[${COD[c] ?? 39}m${t}\x1b[39m`;
export const ansiTags = { fg: tg, bold: (t: string) => t };
export const OPEN = (c: string) => `\x1b[48;5;${BGC[c]}m`;

// Régua Run: título esperado, sem a margem direita (trimEnd), régua `─` até a hora na largura interna iw = w - 3.
// antes iw = min(72, w) - 3 (cartão de no máximo 72); agora o cartão ocupa a largura inteira w.
// antes `Bash ─ cmd ─────── hora`; agora `Bash · ESTADO · cmd` + espaços + hora na mesma coluna (sem régua `─`).
export const reguaRun = (bashIcon: string, gap: string, cmd: string, hora = "", w = 80, estado = "OK") => {
	const iw = w - 3;
	const esq = `${bashIcon}${gap}Bash · ${estado} · ${cmd}`,
		dir = hora ? ` ${hora}` : "";
	return `▎ ${esq}${" ".repeat(iw - [...esq].length - [...dir].length)}${dir}`.trimEnd();
};
// Respiro: antes o cartão começava no título e acabava no rodapé; agora a 1ª e a última linha são
// linhas vazias com trilho (`▎` + espaços, largura w). Tira as duas para as asserções de conteúdo, mas EXIGE que sejam assim.
export const semRespiro = (rows: string[], w = 80) => {
	assert.ok(rows.length >= 3, "título, rodapé e as duas linhas de respiro");
	for (const l of [rows[0]!, rows.at(-1)!]) {
		assert.match(plain(l), /^▎ +$/, "linha de respiro: trilho + espaços");
		assert.equal(visibleWidth(plain(l)), w, "linha de respiro com a largura w");
	}
	return rows.slice(1, -1);
};
