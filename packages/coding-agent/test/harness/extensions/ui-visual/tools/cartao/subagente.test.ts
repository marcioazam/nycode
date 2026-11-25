// Card dos subagentes: ver sub/chips.ts.
// antes chips com fundo por agente (lab /subag desenho 5); agora cabeçalho + uma linha por agente, `·` dim, sem fundo.
import assert from "node:assert/strict";
import { test } from "vitest";
import * as __m3 from "../../../../../../src/extensions/ui-visual/icons.ts";
import * as __m2 from "../../../../../../src/extensions/ui-visual/motion/vivo.ts";
import * as __m1 from "../../../../../../src/extensions/ui-visual/sub/chips.ts";
import * as __m4 from "../../../../../../src/extensions/ui-visual/sub/chips.ts";
import { ctx, mod, plain as plain0, visibleWidth } from "../base.ts";

// o cabeçalho agora leva a faixa neutra (`[customMessageBg]` até o fim); antes sem fundo. `plain` a tira e apara a direita.
const plain = (s: string) => plain0(s.replace("[customMessageBg]", "")).replace(/ {2,}/g, " ").trimEnd();

const { cartaoDaChamada } = __m1;
const { iniciou, terminou } = __m2;
const { icon } = __m3;
const { colSub } = __m4;

const RGB: Record<string, number[]> = {
	text: [200, 200, 200],
	accent: [100, 150, 250],
	dim: [90, 90, 90],
	success: [0, 200, 0],
	error: [220, 0, 0],
	warning: [220, 180, 0],
	muted: [140, 140, 140],
	syntaxType: [0, 200, 200],
	customMessageBg: [30, 30, 40],
};
const th = {
	fg: (c: string, t: string) => `<${c}>${t}</c>`,
	bold: (t: string) => t,
	bg: (c: string, t: string) => `[${c}]${t}`,
	getFgAnsi: (c: string) => `\x1b[38;2;${RGB[c]!.join(";")}m`,
	getBgAnsi: (c: string) => `\x1b[48;2;${RGB[c]!.join(";")}m`,
};
const sgr = (c: number[]) => `\x1b[38;2;${c.join(";")}m`;
const AMB = ["NO_COLOR", "NYCODE_REDUCED_MOTION"];
const comMovimento = (f: () => void, env: Record<string, string> = {}) => {
	const salvo = Object.fromEntries(AMB.map((k) => [k, process.env[k]]));
	for (const k of AMB) delete process.env[k];
	Object.assign(process.env, env);
	try {
		f();
	} finally {
		for (const k of AMB) {
			if (salvo[k] === undefined) delete process.env[k];
			else process.env[k] = salvo[k];
		}
	}
};
const run = (extra: Record<string, unknown> = {}) => ({
	agent: "gate-runner",
	task: "Rode o gate",
	exitCode: -1,
	usage: {},
	messages: [],
	...extra,
});
const feito = (extra: Record<string, unknown> = {}) => ({
	agent: "gate-runner",
	task: "Rode o gate",
	exitCode: 0,
	usage: {},
	messages: [{ role: "assistant", content: [{ type: "text", text: "gate verde" }] }],
	...extra,
});
const card = (
	st: any,
	rs: unknown[],
	agora: number,
	extra: Record<string, unknown> = {},
	args: Record<string, unknown> = { agent: "gate-runner", task: "Rode o gate" },
	o: Record<string, unknown> = {},
	w = 400,
) => {
	st.uiCartao = { rs, abortou: false };
	return cartaoDaChamada(args, st, th, ctx({ toolCallId: "sub-t", ...extra }), w, {
		tecla: "ctrl+o",
		agora: () => agora,
		...o,
	}) as string[];
};

// o nome da ferramenta é `Subagent`/`Subagents`; antes `Subagente`/`Subagentes`.
// Lab /subag2 desenho 3 "Cabeçalho + └": antes `Subagent · concluído · fatos` e `└ gate-runner · concluído · texto`;
// agora o nome e o estado no cabeçalho e o `└` só com o texto.
test("um agente: cabeçalho `Subagent · agente · estado · turnos · tok · custo` só com dado real; linha `└ texto`", () =>
	comMovimento(() => {
		const sem = card({}, [feito()], 0).map(plain);
		assert.equal(sem[0], "◎ Subagent · gate-runner · concluído");
		assert.doesNotMatch(sem[0]!, /turno|tok|US\$/);
		const com = card({}, [feito({ usage: { turns: 3, input: 9000, output: 3400, cost: 0.08 } })], 0).map(plain);
		assert.equal(com[0], "◎ Subagent · gate-runner · concluído · 3 turnos · 12,4k tok · US$ 0,08");
		assert.match(plain(card({}, [feito({ usage: { turns: 1, contextTokens: 800 } })], 0)[0]!), /1 turno · 800 tok/);
		assert.equal(com[1], " └ gate verde");
		const pr = card({}, [run({ usage: { turns: 0 } })], 0).map(plain);
		assert.equal(pr[1], " └ Rode o gate"); // rodando: a tarefa
		assert.equal(pr[0], "◎ Subagent · gate-runner · executando");
		assert.doesNotMatch(card({}, [feito()], 0).join("\n"), /\[toolSuccessBg\]/);
		assert.doesNotMatch(
			card({}, [feito()], 0).slice(1).join("\n"),
			/\[customMessageBg\]/,
			"só o cabeçalho tem a faixa",
		); // antes nenhuma linha com fundo
	}));

test("paralelo: cabeçalho com contagem por estado, `alt+o abre · hora` dim sem pílula, uma linha por agente com ├ └ e `·` dim", () =>
	comMovimento(() => {
		const rs = [
			run({ agent: "swarm-worker", task: "Atualizar os testes" }),
			feito({
				agent: "code-mapper",
				messages: [{ role: "assistant", content: [{ type: "text", text: "Mapa pronto" }] }],
			}),
			feito({ agent: "web-platform-engineer", exitCode: 1, errorMessage: "falha ao ler tailwind.config.ts" }),
		];
		const ls = card({}, rs, 0, {}, { tasks: [{}, {}, {}] }, { dica: "abre", hora: "10:41" }, 400);
		const p = ls.map(plain);
		assert.equal(p.length, 4);
		assert.match(p[0]!, /^◎ Subagents · 1 executando · 1 ok · 1 erro +ctrl\+o abre · 10:41$/);
		assert.equal(p[1], " ├ swarm-worker · executando · Atualizar os testes");
		assert.equal(p[2], " ├ code-mapper · concluído · Mapa pronto");
		assert.equal(p[3], " └ web-platform-engineer · erro · falha ao ler tailwind.config.ts");
		assert.ok(
			ls[0]!.includes("<syntaxType>1 executando</c>") &&
				ls[0]!.includes("<success>1 ok</c>") &&
				ls[0]!.includes("<error>1 erro</c>"),
		);
		assert.ok(ls[0]!.includes("<dim> · </c>") && ls[2]!.includes("<dim> · </c>"), "separador neutro dim");
		assert.ok(ls[0]!.includes("<dim> abre · 10:41</c>"), "hora no dim padrão");
		assert.ok(!/\[[a-zA-Z]+\]/.test(ls.slice(1).join("")), "linhas dos agentes sem fundo"); // antes nenhuma linha com fundo; agora o cabeçalho tem a faixa
		assert.ok(
			ls[2]!.includes("<text>code-mapper</c>") && ls[3]!.includes("<text>web-platform-engineer</c>"),
			"brilho do nome só em quem executa",
		);
		assert.ok(!ls[1]!.includes("<text>swarm-worker</c>"), "quem executa tem o brilho");
		const e = card({}, rs, 0, {}, { tasks: [{}, {}, {}] }, { dica: "abre", hora: "10:41" }, 40).map(plain);
		assert.doesNotMatch(e[0]!, /Subagents|abre/, "estreito: sem título nem verbo");
	}));

test('interrompido: stopReason aborted e a chamada que lançou "Subagent was aborted" dizem interrompido, não erro', () =>
	comMovimento(() => {
		const a = card({}, [feito({ exitCode: 1, stopReason: "aborted" })], 0).map(plain);
		assert.match(a[0]!, /Subagent · gate-runner · interrompido/); // antes nome e estado na linha └
		assert.doesNotMatch(a.join("\n"), /\berro\b/);
		// pelo renderizador: erro sem detalhes + texto do nycode
		const resolver = (() => {
			let r: any;
			mod.default({
				registerToolRenderer: (x: unknown) => {
					r = x;
				},
				on: () => {},
			} as never);
			return r;
		})();
		const r = resolver("subagent", () => ({
			renderCall: () => ({ render: () => ["nativo"], invalidate() {} }),
			renderResult: () => ({ render: () => ["nativo-result"], invalidate() {} }),
		}));
		const args = { agent: "plan-reviewer", task: "Revise" };
		const c = ctx({ args, state: {}, isError: true, isPartial: false });
		r.renderResult(
			{ content: [{ type: "text", text: "Subagent was aborted" }] },
			{ expanded: false, isPartial: false },
			th,
			c,
		).render(80);
		const linhas = r.renderCall(args, th, c).render(400).map(plain);
		assert.match(linhas[0], /plan-reviewer · interrompido/); // antes na linha └
		assert.doesNotMatch(linhas.join("\n"), /\berro\b|Subagent was aborted/);
		assert.match(linhas[1], /└ interrompido antes de terminar/);
	}));

// um agente tem nome, estado e tempo no cabeçalho (linha [0]); antes na linha └ ([1]).
test("transição: ao assentar, concluído sai do dim para o verde em 600 ms e erro pulsa duas vezes; depois assenta", () =>
	comMovimento(() => {
		const ok: any = {};
		card(ok, [run()], 1000);
		const k0 = card(ok, [feito()], 1100)[0]!;
		assert.ok(k0.includes(`${sgr(RGB.dim!)}concluído`), "k=0: ainda dim");
		const k5 = card(ok, [feito()], 1400)[0]!;
		assert.ok(
			k5.includes(`${sgr([45, 145, 45])}concluído`) === false && /\x1b\[38;2;(\d+);(\d+);(\d+)mconcluído/.test(k5),
			"no meio: cor entre dim e verde",
		);
		const [, r, g] = /\x1b\[38;2;(\d+);(\d+);(\d+)mconcluído/.exec(k5)!.map(Number);
		assert.ok(r! < 90 && g! > 90 && g! < 200, `${r},${g}`);
		assert.ok(card(ok, [feito()], 1800)[0]!.includes("<success>concluído</c>"), "passou de 600 ms: assentado");
		const er: any = {};
		card(er, [run()], 1000);
		card(er, [feito({ exitCode: 1 })], 1100); // 1º desenho assentado: fim = 1100
		const e1 = card(er, [feito({ exitCode: 1 })], 1100 + 150)[0]!; // k = 0.25: pico do 1º pulso
		const e2 = card(er, [feito({ exitCode: 1 })], 1100 + 300)[0]!; // k = 0.5: de volta à base
		const cor = (l: string) => /\x1b\[38;2;([\d;]+)merro/.exec(l)?.[1];
		assert.notEqual(cor(e1), RGB.error!.join(";"));
		assert.equal(cor(e2), RGB.error!.join(";"));
		// histórico: nunca visto rodando = já assentado
		assert.ok(card({}, [feito()], 5000)[0]!.includes("<success>concluído</c>"));
	}));

test("brilho no nome: só enquanto roda (a cada 1,3 s); assentado é estático; movimento reduzido ou NO_COLOR não animam", () => {
	const nome = (l: string) => l.split("<dim> · </c>")[1]!; // o nome é o 2º trecho do cabeçalho; antes o 1º da linha └
	comMovimento(() => {
		const a = card({}, [run()], 0)[0]!,
			b = card({}, [run()], 400)[0]!,
			c = card({}, [run()], 1300)[0]!;
		assert.notEqual(nome(a), nome(b), "o brilho corre pelas letras");
		assert.equal(nome(a), nome(c), "repete a cada 1,3 s");
		assert.ok(/\x1b\[38;2;\d+;\d+;\d+mg\x1b\[38;2/.test(a) || /\x1b\[38;2;[\d;]+mg/.test(a));
		const s1 = card({}, [feito()], 0)[0]!,
			s2 = card({}, [feito()], 400)[0]!;
		assert.equal(s1, s2, "assentado: estático");
		assert.ok(s1.includes("<text>gate-runner</c>"));
	});
	comMovimento(
		() => {
			const a = card({}, [run()], 0)[0]!,
				b = card({}, [run()], 400)[0]!;
			assert.equal(a, b, "sem animação o nome e a palavra ficam fixos");
			assert.ok(a.includes("<text>gate-runner</c>"));
		},
		{ NYCODE_REDUCED_MOTION: "1" },
	);
	comMovimento(() => assert.ok(card({}, [run()], 400)[0]!.includes("<text>gate-runner</c>")), { NO_COLOR: "1" });
});

test("tempo: rodando corre do início da chamada; assentado usa o intervalo das mensagens", () =>
	comMovimento(() => {
		iniciou("sub-t", 1000);
		const vivo = plain(card({}, [run()], 1000 + 83_000)[0]!);
		assert.match(vivo, /01:23/);
		terminou("sub-t");
		const msgs = [
			{ role: "user", timestamp: 1000 },
			{ role: "assistant", timestamp: 15_000, content: [{ type: "text", text: "x" }] },
		];
		assert.match(plain(card({}, [feito({ messages: msgs })], 0)[0]!), /00:14/);
		assert.doesNotMatch(plain(card({}, [feito()], 0)[0]!), /\d\d:\d\d/, "sem dado de tempo, sem mm:ss");
		// Um agente: vale a duração da chamada. O filho emite system/user/assistant com o timestamp do início de cada
		// mensagem, então um filho de um turno que levou 2,8 s media 21 ms e o card mostrava 00:00 (medido 2026-11-24).
		const umTurno = [
			{ role: "system", timestamp: 1000 },
			{ role: "user", timestamp: 1000 },
			{ role: "assistant", timestamp: 1021, content: [{ type: "text", text: "x" }] },
		];
		assert.match(plain(card({}, [feito({ messages: umTurno })], 0, { durationMs: 2800 })[0]!), /00:02/);
	}));

test("rodando: sem spinner braille; a palavra `executando` respira entre dim e syntaxType (ciclo de 1,6 s) e fica fixa sem movimento", () => {
	comMovimento(() => {
		const l0 = card({}, [run()], 0)[0]!,
			l8 = card({}, [run()], 800)[0]!,
			l16 = card({}, [run()], 1600)[0]!;
		for (const l of [l0, l8, l16]) assert.doesNotMatch(l, /[\u2800-\u28ff]/, "nada de spinner braille");
		const pal = (l: string) => /(\x1b\[38;2;[\d;]+m)executando\x1b\[39m/.exec(l)?.[1];
		assert.equal(pal(l0), sgr(RGB.dim!), "em 0 a palavra está no dim");
		assert.equal(pal(l8), sgr(RGB.syntaxType!), "em 800 ms, no syntaxType");
		assert.equal(pal(l16), sgr(RGB.dim!), "volta ao dim em 1,6 s");
	});
	comMovimento(() => assert.equal(card({}, [run()], 0)[0], card({}, [run()], 800)[0]), { NYCODE_REDUCED_MOTION: "1" });
});

// Faixa e margens: cabeçalho com a faixa neutra de ponta a ponta; ícone na coluna dos outros cabeçalhos; `├/└` na coluna de `Subagent`.
test("cabeçalho: faixa neutra de ponta a ponta (rodando, concluído e paralelo), ícone e `├/└` nas colunas certas; sem cor, sem faixa", () =>
	comMovimento(() => {
		const cols = (ls: string[]) => ls.map((l) => visibleWidth(l.replace(/\x1b\[[0-9;]*m/g, "")));
		// tema com SGR real (o `th` acima marca com <tags>, que o visibleWidth contaria)
		const BG = "\x1b[48;2;9;9;9m";
		const th2 = {
			...th,
			fg: (_c: string, t: string) => `\x1b[2m${t}\x1b[22m`,
			bg: (_c: string, t: string) => `${BG}${t}\x1b[49m`,
		};
		const cartao = (rs: unknown[], args: Record<string, unknown>, w: number) =>
			cartaoDaChamada(args, { uiCartao: { rs, abortou: false } } as any, th2, ctx({ toolCallId: "sub-t" }), w, {
				tecla: "ctrl+o",
				agora: () => 0,
				hora: "10:41",
			}) as string[];
		for (const [rs, args] of [
			[[run()], undefined],
			[[feito()], undefined],
			[[run(), feito({ agent: "b" })], { tasks: [{}, {}] }],
		] as const) {
			const ls = cartao(
				rs as unknown as unknown[],
				(args ?? { agent: "gate-runner", task: "Rode o gate" }) as Record<string, unknown>,
				80,
			);
			assert.ok(ls[0]!.startsWith(BG) && ls[0]!.endsWith("\x1b[49m"), "faixa de ponta a ponta");
			assert.equal(cols(ls)[0], 80, "a faixa cobre a largura inteira (margens do chat)");
			assert.match(plain0(ls[0]!).trimEnd(), / 10:41$/, "hora dim dentro da faixa");
			// ícone: mesma coluna do cabeçalho do Read (0, o recuo é do shell do nycode); `├/└` na coluna da palavra Subagent, texto 2 colunas depois
			const p = plain0(ls[0]!);
			assert.equal(p.indexOf(icon("agent")), 0, "ícone na coluna 0, como o Read");
			assert.equal(p.indexOf("Subagent"), colSub());
			for (const l of ls.slice(1))
				assert.equal(plain0(l).search(/[├└]/), colSub(), "glifo da árvore sob a 1ª letra de Subagent");
		}
		const sem = card({}, [run()], 0, {}, undefined, {}, 80);
		assert.ok(sem[0]!.includes("executando"));
		const t0 = th.bg;
		try {
			(th as any).bg = undefined;
			(th as any).getBgAnsi = undefined;
			assert.doesNotMatch(card({}, [feito()], 0)[0]!, /\[customMessageBg\]|\x1b\[48/);
		} finally {
			(th as any).bg = t0;
		}
	}));
