// Faixa do run: entrada "Nasce do fundo": 450 ms, uma vez por run.
import assert from "node:assert/strict";
import { test } from "vitest";
import * as __m2 from "../../../../../../src/extensions/ui-visual/motion/vivo.ts";
import * as __m1 from "../../../../../../src/extensions/ui-visual/run/banda.ts";
import * as __r3 from "../base.ts";

const { bandaRun } = __m1;
const { terminou } = __m2;

const RGB: Record<string, number[]> = {
	text: [200, 200, 200],
	customMessageBg: [30, 30, 40],
	toolErrorBg: [60, 20, 20],
};
const th = {
	fg: (c: string, t: string) => `<${c}>${t}</c>`,
	bold: (t: string) => t,
	bg: (c: string, t: string) => `\x1b[48;2;${RGB[c] ?? [0, 0, 0]}m${t}\x1b[49m`,
	getFgAnsi: (c: string) => `\x1b[38;2;${RGB[c]!.join(";")}m`,
	getBgAnsi: (c: string) => `\x1b[48;2;${RGB[c]!.join(";")}m`,
};
const v = (id: string) => ({ nome: "gw-lean", estado: "ok" as const, rotulo: "exit 0", id, tempo: "00:40" });
const faixa = (id: string, call: string, agora: number) =>
	bandaRun(v(id), th, { toolCallId: call }, 120, { hora: "10:00", tecla: "ctrl+o", agora: () => agora }) as string;
const comMovimento = (f: () => void, env: Record<string, string> = {}) => {
	const salvo = { NO_COLOR: process.env.NO_COLOR, NYCODE_REDUCED_MOTION: process.env.NYCODE_REDUCED_MOTION };
	delete process.env.NO_COLOR;
	delete process.env.NYCODE_REDUCED_MOTION;
	Object.assign(process.env, env);
	try {
		f();
	} finally {
		for (const [k, x] of Object.entries(salvo)) {
			if (x === undefined) delete process.env[k];
			else process.env[k] = x;
		}
	}
};

test("nasce do fundo: ao vivo a faixa sobe em 450 ms; pronta depois, e só uma vez por run", () =>
	comMovimento(() => {
		const pronta = faixa("r-1", "sem-fim", 1e9); // sem fim conhecido = histórico: pronta
		terminou("c-1", 1000);
		const k0 = faixa("r-1", "c-1", 1000);
		const k5 = faixa("r-1", "c-1", 1225);
		assert.notEqual(k0, pronta);
		assert.ok(k0.startsWith("\x1b[38;2;30;30;40m"), "em 0 a frente é a cor do fundo");
		assert.notEqual(k5, k0);
		assert.notEqual(k5, pronta);
		assert.equal(faixa("r-1", "c-1", 1000 + 450), faixa("r-1", "sem-fim", 1e9), "em 450 ms, pronta");
		// o mesmo run numa segunda chamada (wait/tail) já aparece pronto, mesmo recém-terminada
		terminou("c-2", 5000);
		assert.equal(faixa("r-1", "c-2", 5000), faixa("r-1", "sem-fim", 1e9));
		// outro run nasce de novo
		terminou("c-3", 6000);
		assert.notEqual(faixa("r-2", "c-3", 6000), faixa("r-2", "sem-fim", 1e9));
	}));

test("nasce do fundo: movimento reduzido e NO_COLOR a mostram pronta", () => {
	for (const env of [{ NYCODE_REDUCED_MOTION: "1" }, { NO_COLOR: "1" }]) {
		comMovimento(() => {
			terminou("c-9", 1000);
			assert.equal(faixa("r-9", "c-9", 1000), faixa("r-9", "sem-fim", 1e9));
		}, env as never);
	}
});

// Marcador: md-layers em todo run; antes md-cog_play só no subagente e `▸` no shell.
// Sem Nerd Font volta ao `▸`. O tipo vem escrito: `subagent` ou `shell`.
test("marcador: todo run usa md-layers com Nerd Font, na cor do estado; sem Nerd Font fica ▸", async () => {
	const { resolverOf, ctx } = __r3;
	const nerd = process.env.NYCODE_NERD_FONT;
	const draw = (texto: string, id: string) => {
		const w = resolverOf().resolver("run", () => ({}));
		const c = ctx({ args: { action: "wait", id }, state: {}, toolCallId: `m-${id}` });
		w.renderResult({ content: [{ type: "text", text: texto }] }, { expanded: false, isPartial: false }, th, c).render(
			300,
		);
		return w.renderCall(c.args, th, c).render(300)[0] as string;
	};
	try {
		process.env.NYCODE_NERD_FONT = "1";
		const ag = draw("fg-151d7d9f [agent] running · 00:45 · web-platform-engineer · aguardado", "fg-151d7d9f");
		assert.ok(ag.includes("<syntaxType>\u{f0328}</c>") && !ag.includes("▸") && !ag.includes("\u{f1935}"), ag);
		assert.ok(ag.includes("<dim>subagent</c>"), ag);
		const sh = draw("rhwep1 [shell] running · 00:40 · gw-lean · aguardado", "rhwep1");
		assert.ok(sh.includes("<syntaxType>\u{f0328}</c>") && !sh.includes("▸") && sh.includes("<dim>shell</c>"), sh);
		delete process.env.NYCODE_NERD_FONT;
		assert.ok(
			draw("fg-151d7d9f [agent] running · 00:45 · web-platform-engineer · aguardado", "fg-151d7d9f").includes("▸"),
		);
	} finally {
		if (nerd === undefined) delete process.env.NYCODE_NERD_FONT;
		else process.env.NYCODE_NERD_FONT = nerd;
	}
});

// Lab /runbanda desenho 19: prévia do comando dim, cortada em 22 com ` …`; à direita só `id · hora`.
test("refinada: comando longo cortado em 22 colunas; sem atalho à direita", () => {
	const fg = { fg: (c: string, t: string) => `<${c}>${t}</c>`, bold: (t: string) => t };
	const l = bandaRun(
		{
			nome: "testes",
			estado: "ok",
			rotulo: "exit 0",
			id: "r7",
			tempo: "2:14",
			linhas: 148,
			cmd: "npm test -- --coverage --silent",
		},
		fg,
		{},
		400,
		{ hora: "15:59", dica: "abre", tecla: "alt+o" },
	) as string;
	const p = l.split(/<\/?[a-zA-Z]*>/g).join("");
	assert.match(p, / testes {2}concluído · 2:14 · shell · 148 linhas · npm test -- --covera … {2,}r7 · 15:59 $/);
	assert.ok(!p.includes("alt+o") && l.includes("<dim>npm test -- --covera …</c>"), l);
});
