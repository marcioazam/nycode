// node --experimental-strip-types --test ~/.nycode/agent/extensions/ui-visual/test/tools/estado.test.ts
import assert from "node:assert/strict";
import { afterEach, beforeEach, test, vi } from "vitest";
import * as __m1 from "../../../../../../src/extensions/ui-visual/icons.ts";
import {
	base,
	ctx,
	ficha,
	icon,
	mod,
	nativeComponent,
	plain,
	reguaRun,
	resolverOf,
	toolIcon,
	visibleWidth,
} from "../base.ts";

// The animations read TERM: pin it so the suite does not depend on the shell it runs in.
beforeEach(() => {
	vi.stubEnv("TERM", "xterm-256color");
});
afterEach(() => {
	vi.unstubAllEnvs();
});

const { iconGap, nerdFont } = __m1;
// Régua Run: antes `$ comando` e hora à direita; agora `<ícone> Run ─ comando ───── hora` e corpo/rodapé recuados até o `Run`.
// Prefixos de icon('bash') e iconGap() da cópia tmp (base.ts fixa o terminal): independem de TERM.
const G = iconGap();
const _P = `▎ ${" ".repeat(1 + G.length)}`; // corpo e rodapé: trilho + recuo até o `Run`
const _regua = (cmd: string, hora = "", w = 80) => reguaRun(icon("bash"), G, cmd, hora, w);

const _hhmm = (ms: number) => new Date(ms).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
// Tema ANSI: a hora é alinhada pela largura visível real (as marcas <cor> do tema de teste contariam como colunas).
const ansiTheme = { fg: (_c: string, t: string) => `\x1b[2m${t}\x1b[22m`, bold: (t: string) => `\x1b[1m${t}\x1b[22m` };
const comHora = (branch: unknown[] = []) => {
	const on: Record<string, any> = {};
	let resolver: any;
	mod.default({
		registerToolRenderer: (r: unknown) => {
			resolver = r;
		},
		on: (e: string, h: unknown) => {
			on[e] = h;
		},
	} as never);
	on.session_start?.({}, { sessionManager: { getBranch: () => branch } });
	return { on, resolver };
};

// 2026-11-14: a hora à direita é a do TÉRMINO da execução; enquanto roda não há hora.
// o nome da ferramenta é `Subagent`/`Subagents` e o `│` do corpo fica na coluna do nome; antes `Subagente` e o `│` 2 colunas antes.

// Antigo (2026-11-14): bolinha pulsando, com um timer pedindo redesenho. Novo: sem ícone de estado no chat;
// "executando" é o nome em ciano (syntaxType), sem animação, e nenhum timer pede redesenho.

// A pergunta tem o mesmo alinhamento dos demais blocos, com o atalho e a hora juntos no
// cabeçalho. Resposta em destaque: antes `? pergunta  resposta` + texto atrás de um `│`
// em cartão verde; agora ` cabeçalho · pergunta` (atalho e hora só na 1ª linha) e ` ❯ resposta`, sem fundo.

// `run` saía sem estado, sem ícone e sem hora (não tem renderCall próprio).

// O todo repetia a mesma coisa em duas linhas (chamada + "Started #1: …"). Uma linha só, em
// português, com o andamento da lista à direita; lista e erro continuam com o desenho nativo embaixo.

// Memory é consulta, não execução com resultado: sem ícone de estado. Erro continua visível.
// Contrato trocado: antes cartão com fundo neutro (customMessageBg), `│ corpo` cru abaixo
// e o título nativo; agora uma frase `Memory · estado · nome` sem fundo e sem corpo (detalhes em memoria.test.ts).

// Run com cabeçalho curto (verbo + nome do run) e linha de fatos (estado em cor,
// duração, id, log); saída recuada só quando existe; estado e fundo pelo estado REAL do run, não pelo da chamada.

// "Uma linha" com a Barra: enquanto o run segue vivo no registro do nycode (nycode.run.registry), o tempo
// corre a partir do início e a barra ━ do Bash anda ao lado do estado; terminado no registro, a faixa para e fica como veio.

// Subagente no padrão do run: cabeçalho `subagente · <agente|paralelo · N agentes>`,
// linha de fatos (estado em cor, onde roda, id) e a tarefa ou o resultado de cada agente embaixo. Sem a frase em inglês.
test("subagente B: árvore sem fundo, estado de cada agente e expansão nativa", () => {
	const { resolver } = comHora();
	const cor = {
		fg: (c: string, t: string) => `<${c}>${t}</c>`,
		bold: (t: string) => t,
		bg: (c: string, t: string) => `[${c}]${t}`,
	};
	const w = resolver("subagent", () => ({
		renderCall: () => nativeComponent("nativo-call"),
		renderResult: () => nativeComponent("nativo-result"),
	}));
	const draw = (args: Record<string, unknown>, result: Record<string, unknown>, o: Record<string, unknown> = {}) => {
		const c = ctx({ args, state: {}, keyText: () => "ctrl+o", ...o });
		const res = w
			.renderResult(result, { expanded: o.expanded === true, isPartial: o.isPartial === true }, cor, c)
			.render(240);
		const call = w.renderCall(args, cor, c).render(240);
		return {
			linhas: [...call, ...res]
				.map(plain)
				.map((l) =>
					l
						.replace(/\[[a-zA-Z]+\]/g, "")
						.replace(/ {3,}ct(?:rl\+)?.*$/, "  ⌨")
						.trimEnd(),
				)
				.filter(Boolean),
			cru: [...call, ...res].join("\n"),
		};
	};
	const txt = (text: string) => ({ content: [{ type: "text", text }], details: { results: [] } });
	const A = icon(toolIcon("subagent"));
	const ENG = nerdFont() ? "\u{f1935}" : "↗"; // ícone de segundo plano (lab /subag2)
	const fim = (agent: string, exitCode: number, out: string, turns = 3) => ({
		agent,
		task: `tarefa de ${agent}`,
		exitCode,
		usage: { turns },
		messages: [{ role: "assistant", content: [{ type: "text", text: out }] }],
	});
	// segundo plano: a chamada só entrega o agente; a caixa diz "enviado", sem bolinha nem fundo
	// de estado (antes ficava "rodando" para sempre no histórico). O resultado chega no aviso subagent-background.
	const bg = draw(
		{ agent: "plan-reviewer", task: "Faça uma re-revisão\nsegunda linha" },
		txt(
			"Started background run bg-1c12d077 (plan-reviewer). A notification will arrive on completion; check progress with {status: true}.",
		),
	);
	assert.deepEqual(bg.linhas, [`${A} Subagent · plan-reviewer ${ENG} · enviado`, "  └ Faça uma re-revisão"]); // antes `Subagent · enviado para segundo plano` e `└ plan-reviewer · tarefa` // antes ícone na coluna 2 e `└` na 4; agora ícone na coluna 0 (a do Read) e `└` na coluna de Subagent
	// antes sem nenhum fundo (`customMessageBg` proibido); agora a 1ª linha é uma faixa neutra de ponta a ponta, a 2ª segue sem fundo.
	assert.doesNotMatch(bg.cru, /\[tool|Started background/);
	assert.match(bg.cru, /^\[customMessageBg\]/);
	assert.doesNotMatch(bg.cru.split("\n")[1]!, /\[customMessageBg\]/);
	// lote que foi para segundo plano: uma linha por agente com a tarefa
	const tasks = [
		{ agent: "gate-runner", task: "Rode o gate" },
		{ agent: "test-author", task: "Escreva os testes" },
	];
	const lote = draw(
		{ tasks },
		txt(
			"This subagent call runs in the background so the user can keep using the main prompt. Its result arrives as a message when it finishes.",
		),
	);
	assert.deepEqual(lote.linhas, [
		`${A} Subagents · 2 enviados`,
		`  ├ gate-runner ${ENG} · Rode o gate`,
		`  └ test-author ${ENG} · Escreva os testes`,
	]); // antes `Subagent · enviado para segundo plano` e sem o ícone
	// primeiro plano, concluído (Solução 2): atalho no cabeçalho, resultado na prévia sem disputa à direita
	const ok = draw(
		{ agent: "plan-reviewer", task: "t" },
		{ content: [], details: { results: [fim("plan-reviewer", 0, "PLAN_REVIEW: complete.\nresto", 12)] } },
	);
	// Chips: antes `◎ 1 agente · 12 turnos` e `└ plan-reviewer · concluído · …`; agora ícone do estado, chips e resultado recuado.
	// antes chips com fundo (`✓  plan-reviewer   concluído   12 turnos`); agora lab /subag3: cabeçalho + linha `└ agente · estado · texto`, `·` dim, sem fundo.
	// nome da tool sempre capitalizado (antes `subagente`/`subagentes`).
	assert.deepEqual(ok.linhas, ["◎ Subagent · plan-reviewer · concluído · 12 turnos  ⌨", "  └ PLAN_REVIEW: complete."]); // antes nome e estado na linha └
	assert.doesNotMatch(ok.cru.split("\n").slice(1).join("\n"), /\[(toolSuccessBg|customMessageBg)\]/); // antes nenhuma linha com fundo; agora o cabeçalho tem a faixa neutra
	assert.ok(ok.cru.includes("<success>concluído</c>"));
	// lote misto: um par de linhas por agente, na ordem da chamada (antes quem falhou primeiro, em árvore)
	const misto = draw(
		{ tasks },
		{
			content: [],
			details: {
				results: [fim("test-author", 0, "6 testes novos"), fim("gate-runner", 1, "structure: 2 violações")],
			},
		},
	);
	// antes `✓  test-author   concluído   3 turnos` + resultado em 2 linhas por agente; agora cabeçalho com contagem + `├ └ agente · estado · texto`.
	assert.deepEqual(misto.linhas, [
		"◎ Subagents · 1 ok · 1 erro  ⌨",
		"  ├ test-author · concluído · 6 testes novos",
		"  └ gate-runner · erro · structure: 2 violações",
	]);
	assert.ok(misto.cru.includes("<error>erro</c>") && misto.cru.includes("<success>concluído</c>"));
	// em andamento (primeiro plano): rodando, com a tarefa de quem ainda não terminou
	const vivo = draw(
		{ tasks },
		{
			content: [],
			details: {
				results: [
					fim("gate-runner", 0, "gate verde"),
					{ agent: "test-author", task: "Escreva os testes", exitCode: -1, usage: { turns: 2 }, messages: [] },
				],
			},
		},
		{ isPartial: true },
	);
	assert.deepEqual(
		vivo.linhas.map((l: string) => l.replace(/^[^\s├└](?= \S)/, "·")),
		[
			"· Subagents · 1 executando · 1 ok  ⌨",
			"  ├ gate-runner · concluído · gate verde",
			"  └ test-author · executando · Escreva os testes",
		],
	); // antes 2 linhas por agente com turnos
	// aberto: fatos + o desenho nativo inteiro; status/cancel/erro: nativo
	const aberto = draw(
		{ agent: "x", task: "t" },
		{ content: [], details: { results: [fim("x", 0, "ok")] } },
		{ expanded: true },
	);
	assert.deepEqual(aberto.linhas.slice(2), ["  nativo-result"]); // antes slice(1); o card de chips tem 2 linhas (chips + resultado)
	assert.deepEqual(draw({ status: true }, txt("No background runs in this session.")).linhas, [
		`${A} Subagent · status · nenhum run`,
	]); // antes `Subagent · status` e o texto cru sob `│`; agora a contagem no cabeçalho
});

// Pergunta cancelada com fundo de aviso (antes ficava verde, como se tivesse dado certo).
// Resposta em destaque: sem fundo algum; cancelada = `sem resposta · Esc` em warning, respondida em success.
test("question: sem fundo; cancelada e tempo esgotado em warning, respondida em success; várias perguntas separadas por linha em branco", () => {
	const BG: Record<string, number> = { toolSuccessBg: 42, toolErrorBg: 41, toolPendingBg: 46, customMessageBg: 47 };
	const t = {
		fg: (c: string, x: string) => `<${c}>${x}</c>`,
		bold: (x: string) => x,
		bg: (c: string, x: string) => `\x1b[${BG[c]}m${x}\x1b[49m`,
	};
	const w = resolverOf().resolver("question", () => ({
		renderCall: () => ({ render: () => [], invalidate() {} }),
		renderResult: () => nativeComponent("? Forma  pergunta"),
	}));
	assert.equal(w.renderShell, "self");
	const draw = (details: unknown) => {
		const c = ctx({ outputPad: 1 });
		return [
			...w.renderCall({}, t, c).render(160),
			...w.renderResult({ content: [], details }, { isPartial: false }, t, c).render(160),
		];
	};
	const ok = draw({ question: "Qual?", answer: "a" });
	assert.equal(ok.length, 2);
	assert.ok(
		ok.every((l) => !/\x1b\[4[1267]m/.test(l)),
		ok.join("|"),
	); // antes a pílula da hora/atalho tinha fundo; agora nada tem
	assert.ok(ok[1]!.includes("<success>a</c>") && ok[1]!.includes("<accent>❯</c>"));
	const cancelada = draw({ question: "Qual?", answer: null });
	assert.ok(cancelada[1]!.includes("<warning>sem resposta · Esc</c>") && !cancelada.join("").includes("<success>"));
	assert.ok(
		draw({ question: "Qual?", answer: "", timedOut: true })[1]!.includes(
			"<warning>tempo esgotado · seguiu sem resposta</c>",
		),
	);
	const lote = draw({
		question: "Q1",
		answer: "a",
		questions: [
			{ header: "Um", question: "Q1", answer: "a" },
			{ header: "Dois", question: "Q2", answer: null },
		],
	}).map(plain);
	assert.deepEqual(
		lote.map((l: string) => l.replace(/(?<=\S) {2,}.*$/, "")),
		["Um · Q1", "❯ a", "", "Dois · Q2", "❯ sem resposta · Esc"],
	); // antes recuo 3
	// resposta digitada: `(outra)` dim; opção com a descrição entre parênteses mostra só o rótulo
	assert.ok(draw({ question: "Q", answer: "texto livre", wasCustom: true })[1]!.includes("<dim> (outra)</c>"));
	assert.ok(draw({ question: "Q", answer: "Sim (recomendado)" })[1]!.includes("<success>Sim</c>"));
	// variante A: a hora do término vai à direita do cabeçalho
	const { on, resolver } = comHora();
	const wh = resolver("question", () => ({
		renderCall: () => ({ render: () => [], invalidate() {} }),
		renderResult: () => nativeComponent("x"),
	}));
	on.tool_execution_end({ toolCallId: "q-1", toolName: "question" });
	const ch = ctx({ toolCallId: "q-1", outputPad: 1 });
	const linhas = wh
		.renderResult(
			{ content: [], details: { header: "Forma", question: "Qual?", answer: "a" } },
			{ isPartial: false },
			ansiTheme,
			ch,
		)
		.render(80)
		.map(plain);
	assert.match(linhas[0]!, /^Forma · Qual\? +ctrl\+o abre {2}\d\d:\d\d$/); // antes recuo 3 (margem do chat agora)
});

// U14: o ramo da sessão é varrido uma vez para montar toolCallId -> hora, não uma vez por chamada.
test("U14 hora do histórico: 300 chamadas leem o ramo uma vez e a hora sai igual", () => {
	const T = new Date(2026, 10, 14, 9, 41, 30).getTime();
	let leituras = 0;
	const branch = Array.from({ length: 300 }, (_, i) => ({
		type: "message",
		message: { role: "toolResult", toolCallId: `u14-${i}`, timestamp: T + i * 60_000 },
	}));
	const on: Record<string, any> = {};
	let resolver: any;
	mod.default({
		registerToolRenderer: (r: unknown) => {
			resolver = r;
		},
		on: (e: string, h: unknown) => {
			on[e] = h;
		},
	} as never);
	on.session_start(
		{},
		{
			sessionManager: {
				getBranch: () => {
					leituras++;
					return branch;
				},
			},
		},
	);
	const w = resolver("read", base);
	const horas = [0, 1, 299].map((i) =>
		ficha(
			w
				.renderCall(
					{},
					ansiTheme,
					ctx({ args: { path: "/work/proj/a.ts" }, toolCallId: `u14-${i}`, durationMs: 1000 }),
				)
				.render(90)[0],
		).slice(-5),
	);
	for (let i = 0; i < 300; i++)
		w.renderCall(
			{},
			ansiTheme,
			ctx({ args: { path: "/work/proj/a.ts" }, toolCallId: `u14-${i}`, durationMs: 1000 }),
		).render(90);
	assert.equal(leituras, 1);
	assert.deepEqual(horas, ["09:41", "09:42", "14:40"]);
});

// Azul do Bash (antes ícone muted nas ações, nome em text, e `enviado para segundo plano` sem nome): ícone e
// `Subagent`/`Subagents` em accent, negrito, em todos os cartões.
test("subagente: ícone e nome em accent em todos os cartões (único, paralelo, segundo plano, ações)", () => {
	const { on, resolver } = comHora();
	const t = { fg: (c: string, x: string) => `<${c}>${x}</c>`, bold: (x: string) => `*${x}*` };
	const sub = resolver("subagent", () => ({
		renderCall: () => nativeComponent("n"),
		renderResult: () => nativeComponent("n"),
	}));
	const cab = (a: Record<string, unknown>, id: string, res?: unknown, parcial = false) => {
		const c = ctx({ args: a, state: {}, toolCallId: id, keyText: () => "ctrl+o", isPartial: parcial });
		on.tool_execution_end({ toolCallId: id, toolName: "x" });
		if (res) sub.renderResult(res, { expanded: false, isPartial: parcial }, t, c);
		return sub.renderCall(a, t, c).render(300)[0] as string;
	};
	const casos = [
		cab({ agent: "a", task: "x" }, "az-1", {
			content: [],
			details: { results: [{ agent: "a", task: "x", exitCode: 0, usage: {}, messages: [] }] },
		}),
		cab(
			{
				tasks: [
					{ agent: "a", task: "x" },
					{ agent: "b", task: "y" },
				],
			},
			"az-2",
			{
				content: [],
				details: {
					results: [
						{ agent: "a", task: "x", exitCode: -1, usage: {}, messages: [] },
						{ agent: "b", task: "y", exitCode: -1, usage: {}, messages: [] },
					],
				},
			},
			true,
		),
		cab({ agent: "a", task: "x" }, "az-3", {
			content: [
				{
					type: "text",
					text: "This subagent call runs in the background so the user can keep using the main prompt.",
				},
			],
			details: { results: [] },
		}),
		cab({ send: "bg-1", task: "oi" }, "az-4"),
		cab({ status: true }, "az-5", { content: [{ type: "text", text: "No background runs in this session." }] }),
	];
	for (const l of casos) {
		assert.match(l, /<accent>\*Subagents?\*<\/c>|\*<accent>Subagents?<\/c>\*/, l); // negrito por dentro ou por fora
		assert.match(l, /^\s*<accent>[^<\s]+<\/c>/, `ícone em accent: ${l}`);
	}
});

// status legível (antes o texto cru em inglês sob `│`): contagem colorida no cabeçalho, um run por linha.
test("subagente: status lista os runs (registro e lanes) com estado colorido; texto desconhecido sob │", () => {
	const { resolver } = comHora();
	const t = { fg: (c: string, x: string) => `<${c}>${x}</c>`, bold: (x: string) => x };
	const texto =
		"bg-1 swarm-worker: running - Handback in pt-BR\nbg-2 plan-reviewer: done (exit 0, 14 turns) - revisar\nbg-3 gate-runner: failed (exit 1, 3 turns) - gate\n\nAgent lanes:\nfg-9 swarm-worker running · 4t · $0.09 · 00:19 · thinking…\n\nbg-4: nota estranha";
	const w = resolver("subagent", () => ({
		renderCall: () => nativeComponent("n"),
		renderResult: () => nativeComponent("n"),
	}));
	const c = ctx({ args: { status: true }, state: {}, keyText: () => "ctrl+o" });
	const corpo = w
		.renderResult({ content: [{ type: "text", text: texto }] }, { expanded: false, isPartial: false }, t, c)
		.render(400)
		.map(plain);
	const cab = w.renderCall({ status: true }, t, c).render(400)[0] as string;
	assert.ok(
		cab.includes("<syntaxType>2 executando</c>") &&
			cab.includes("<success>1 concluído</c>") &&
			cab.includes("<error>1 falhou</c>"),
		cab,
	);
	const col = plain(cab)
		.split(/<[^>]*>/g)
		.join("")
		.indexOf("Subagent");
	assert.deepEqual(
		corpo.map((l: string) =>
			l
				.split(/<[^>]*>/g)
				.join("")
				.trimEnd(),
		),
		[
			`${" ".repeat(col)}├ swarm-worker · executando · bg-1 · Handback in pt-BR`,
			`${" ".repeat(col)}├ plan-reviewer · concluído · 14 turnos · bg-2 · revisar`,
			`${" ".repeat(col)}├ gate-runner · falhou · exit 1 · 3 turnos · bg-3 · gate`,
			`${" ".repeat(col)}├ swarm-worker · executando · 00:19 · 4 turnos · US$ 0,09 · fg-9 · thinking…`,
			`${" ".repeat(col)}│ bg-4: nota estranha`,
		],
	);
	// nada reconhecido: o texto como veio, sob `│`
	const c2 = ctx({ args: { status: true }, state: {}, keyText: () => "ctrl+o" });
	const cru = w
		.renderResult(
			{ content: [{ type: "text", text: "algo novo do nycode" }] },
			{ expanded: false, isPartial: false },
			t,
			c2,
		)
		.render(400)
		.map(plain);
	assert.ok(cru.length >= 1 && cru.every((l: string) => !/├|└/.test(l)), cru.join("|"));
});

// Hora dos subagentes: sem fundo (antes pílula) e na mesma coluna da hora do Read (margem direita do chat).
test("subagente: a hora fica em dim sem fundo e termina na mesma coluna da hora do Read (enviado ao segundo plano, único e paralelo)", () => {
	const { on, resolver } = comHora();
	const tema = {
		fg: (_c: string, t: string) => `\x1b[2m${t}\x1b[22m`,
		bold: (t: string) => t,
		bg: (_c: string, t: string) => `\x1b[48;2;9;9;9m${t}\x1b[49m`,
		getBgAnsi: () => "\x1b[48;2;9;9;9m",
		getFgAnsi: () => "\x1b[38;2;200;200;200m",
	};
	const w = 100;
	const coluna = (linha: string) => {
		const p = plain(linha);
		const m = /\d\d:\d\d(?= *$)/.exec(p)!;
		assert.ok(m, p);
		return visibleWidth(p.slice(0, m.index + m[0].length));
	};
	const rd = resolver("read", () => ({
		renderCall: () => nativeComponent("n"),
		renderResult: () => nativeComponent("n"),
	}));
	const sub = resolver("subagent", () => ({
		renderCall: () => nativeComponent("n"),
		renderResult: () => nativeComponent("n"),
	}));
	const args = {
		tasks: [
			{ agent: "a", task: "x" },
			{ agent: "b", task: "y" },
		],
	};
	const linhaDe = (r: any, a: Record<string, unknown>, id: string, res?: unknown, o: Record<string, unknown> = {}) => {
		const c = ctx({ args: a, state: {}, toolCallId: id, keyText: () => "ctrl+o", ...o });
		on.tool_execution_end({ toolCallId: id, toolName: "x" });
		if (res) r.renderResult(res, { expanded: false, isPartial: o.isPartial === true }, tema, c);
		return r.renderCall(a, tema, c).render(w)[0] as string;
	};
	const ref = coluna(
		linhaDe(rd, { path: "/work/proj/a.ts" }, "rd-h", { content: [{ type: "text", text: "a" }], details: undefined }),
	);
	const bg = linhaDe(sub, { agent: "swarm-worker", task: "Faça X" }, "sub-bg", {
		content: [
			{
				type: "text",
				text: "This subagent call runs in the background so the user can keep using the main prompt. Its result arrives as a message when it finishes.",
			},
		],
		details: { results: [] },
	});
	assert.match(plain(bg), /swarm-worker \S+ · enviado/); // antes `enviado para segundo plano`
	const um = linhaDe(sub, { agent: "a", task: "x" }, "sub-1", {
		content: [],
		details: { results: [{ agent: "a", task: "x", exitCode: 0, usage: {}, messages: [] }] },
	});
	const par = linhaDe(
		sub,
		args,
		"sub-p",
		{
			content: [],
			details: {
				results: [
					{ agent: "a", task: "x", exitCode: 0, usage: {}, messages: [] },
					{ agent: "b", task: "y", exitCode: -1, usage: {}, messages: [] },
				],
			},
		},
		{ isPartial: true },
	);
	for (const l of [bg, um, par]) assert.equal(coluna(l), ref, plain(l));
	// Pergunta na margem do chat (antes 3 colunas para dentro e a hora 2 antes): cabeçalho na coluna 0, hora com a do Read.
	const q = resolver("question", () => ({
		renderCall: () => nativeComponent("n"),
		renderResult: () => nativeComponent("n"),
	}));
	const qc = ctx({ args: {}, state: {}, toolCallId: "q-h", keyText: () => "ctrl+o" });
	on.tool_execution_end({ toolCallId: "q-h", toolName: "question" });
	const ql = q
		.renderResult(
			{
				content: [],
				details: { questions: [{ header: "Fonte", question: "Manter Onest?", answer: "Manter Onest" }] },
			},
			{ expanded: false, isPartial: false },
			tema,
			qc,
		)
		.render(w) as string[];
	assert.ok(plain(ql[0]!).startsWith("Fonte · "), plain(ql[0]!));
	assert.ok(plain(ql[1]!).startsWith("❯ Manter Onest"), plain(ql[1]!));
	assert.equal(coluna(ql[0]!), ref, plain(ql[0]!));
	// enviado ao segundo plano: faixa neutra de ponta a ponta (hora dim dentro dela, sem pílula própria); único e paralelo: sem fundo
	assert.ok(bg.startsWith("\x1b[48;2;9;9;9m") && bg.endsWith("\x1b[49m"), "faixa neutra de ponta a ponta");
	assert.equal(visibleWidth(plain(bg)), w, "a faixa cobre a linha inteira");
	assert.deepEqual(
		[...new Set(bg.match(/\x1b\[48;[0-9;]*m/g))],
		["\x1b[48;2;9;9;9m"],
		"só o fundo neutro, nenhuma pílula atrás da hora",
	);
	assert.doesNotMatch(
		bg
			.slice(0, bg.search(/\d\d:\d\d/))
			.replace(/\x1b\[48;2;9;9;9m/g, "")
			.slice(-60),
		/\x1b\[48;/,
	);
	// antes único e paralelo sem fundo; agora a faixa neutra também (a hora fica dentro dela)
	for (const l of [um, par])
		assert.deepEqual([...new Set(l.match(/\x1b\[48;[0-9;]*m/g))], ["\x1b[48;2;9;9;9m"], "só a faixa neutra");
});

// Corpo de texto puro: send/status/cancel/resume/list e erro sem detalhes saíam na margem esquerda; agora `│` e o texto
// começam na coluna da palavra `Subagent` do cabeçalho, cortados com … na largura.
test("subagente: resultado em texto puro (send, status, cancel, resume) com `│` e o texto alinhado à palavra Subagent", () => {
	const { resolver } = comHora();
	const longo =
		"Message queued for run bg-7b82c991: it is delivered at the run's next turn boundary, not in the middle of a tool call.";
	const w = resolver("subagent", () => ({
		renderCall: () => nativeComponent("nativo-call"),
		renderResult: () => nativeComponent(longo),
	}));
	const tema = { fg: (_c: string, t: string) => t, bold: (t: string) => t };
	for (const args of [
		{ send: "bg-7b82c991", message: "oi" },
		{ status: true },
		{ cancel: "bg-1" },
		{ resume: "bg-2", task: "x" },
	]) {
		const c = ctx({ args, state: {}, keyText: () => "ctrl+o" });
		const res = w.renderResult(
			{ content: [{ type: "text", text: "x" }], details: { results: [] } },
			{ expanded: false, isPartial: false },
			tema,
			c,
		);
		for (const larg of [240, 60]) {
			const cab = plain(w.renderCall(args, tema, c).render(larg)[0]);
			const corpo = plain(res.render(larg)[0]);
			const col = cab.indexOf("Subagent");
			assert.ok(col > 0, cab);
			// `│` na coluna do nome Subagent e o texto 2 colunas depois; antes o texto na coluna do nome e o `│` 2 antes.
			assert.equal(corpo[col], "│", corpo);
			assert.equal(corpo.indexOf(longo.slice(0, 7)), col + 2, `texto 2 colunas após o │: ${corpo}`);
			assert.ok(visibleWidth(corpo) <= larg);
			if (larg === 60) assert.ok(corpo.endsWith("…"), corpo);
		}
	}
});

// Cabeçalho das ações sem run (antes `Subagent · mensagem para bg-…` sem agente nem desfecho): `Subagent · <ação> · <agente> <id dim>`
// e à direita, antes da hora, o desfecho real do resultado (na fila/entregue/cancelado/retomado/falhou); texto não reconhecido = nada.
test("subagente: cabeçalho das ações (send, cancel, resume, status) com agente conhecido, id dim e desfecho colorido", () => {
	const { on, resolver } = comHora();
	const cor = { fg: (c: string, t: string) => `<${c}>${t}</c>`, bold: (t: string) => t };
	const w = resolver("subagent", () => ({
		renderCall: () => nativeComponent("nc"),
		renderResult: () => nativeComponent("nr"),
	}));
	const cab = (args: Record<string, unknown>, texto: string, o: Record<string, unknown> = {}) => {
		const c = ctx({ args, state: {}, ...o });
		w.renderResult(
			{ content: [{ type: "text", text: texto }], details: { results: [] } },
			{ expanded: false, isPartial: false },
			cor,
			c,
		);
		return w.renderCall(args, cor, c).render(300)[0] as string;
	};
	const p = (l: string) => plain(l).replace(/ {2,}/g, " ").trim();
	// agente conhecido do aviso de segundo plano (mesma sessão)
	cab(
		{ agent: "swarm-worker", task: "x" },
		"Started background run bg-7b82c991 (swarm-worker). A notification will arrive on completion.",
	);
	const fila = cab(
		{ send: "bg-7b82c991", task: "oi" },
		"Message queued for run bg-7b82c991: it is delivered at the run's next turn boundary, not in the middle of a tool call.",
	);
	assert.equal(p(fila), "◎ Subagent · mensagem · swarm-worker bg-7b82c991 na fila");
	assert.ok(
		fila.includes("<dim>bg-7b82c991</c>") && fila.includes("<accent>na fila</c>") && fila.includes("<dim> · </c>"),
	);
	assert.equal(
		p(cab({ send: "bg-zz", task: "oi" }, "Run bg-zz had finished; resumed it with your message.")),
		"◎ Subagent · mensagem · bg-zz entregue",
	); // agente desconhecido: omitido
	assert.ok(
		cab({ send: "bg-zz", task: "oi" }, "Run bg-zz had finished; resumed it with your message.").includes(
			"<success>entregue</c>",
		),
	);
	const falha = cab({ send: "bg-q", task: "oi" }, "Unknown run: bg-q.\n\nNo background subagent runs.");
	assert.ok(p(falha).endsWith("bg-q falhou") && falha.includes("<error>falhou</c>"));
	assert.ok(cab({ send: "bg-e", task: "oi" }, "qualquer coisa", { isError: true }).includes("<error>falhou</c>"));
	assert.equal(p(cab({ send: "bg-n", task: "oi" }, "texto que ninguém conhece")), "◎ Subagent · mensagem · bg-n"); // não reconhecido: nada extra
	const canc = cab({ cancel: "bg-1" }, "Cancelled background run bg-1.");
	assert.equal(p(canc), "◎ Subagent · cancelar · bg-1 cancelado");
	assert.ok(canc.includes("<success>cancelado</c>"));
	assert.equal(
		p(cab({ cancel: "bg-1" }, "Background run bg-1 already finished; nothing to cancel.")),
		"◎ Subagent · cancelar · bg-1",
	);
	assert.equal(
		p(
			cab(
				{ resume: "bg-2", task: "x" },
				"Resumed background run bg-2 with the follow-up task; a notification will arrive on completion.",
			),
		),
		"◎ Subagent · retomar · bg-2 retomado",
	);
	assert.ok(
		cab(
			{ resume: "bg-2", task: "x" },
			"Background run bg-2 is still running; wait for it or cancel it first.",
		).includes("<error>falhou</c>"),
	);
	assert.equal(p(cab({ status: true }, "No background subagent runs.")), "◎ Subagent · status · nenhum run"); // antes sem a contagem
	on.tool_execution_end({ toolCallId: "h-1", toolName: "subagent" });
	assert.match(
		cab({ send: "bg-h", task: "x" }, "Message queued for run bg-h: it is delivered", { toolCallId: "h-1" }),
		/<accent>na fila<\/c><dim> · \d\d:\d\d<\/c>$/,
		"desfecho antes da hora, hora dim",
	);
});

// Antes do resultado: a chamada pendente já usa o cabeçalho novo da ação, sem desfecho; antes `Subagent · mensagem para bg-…`.
test("subagente: ação pendente (sem resultado) já mostra `Subagent · ação · id`, sem desfecho", () => {
	const { resolver } = comHora();
	const cor = { fg: (c: string, t: string) => `<${c}>${t}</c>`, bold: (t: string) => t };
	const w = resolver("subagent", () => ({
		renderCall: () => nativeComponent("nc"),
		renderResult: () => nativeComponent("nr"),
	}));
	const p = (l: string) => plain(l).replace(/ {2,}/g, " ").trim();
	const pend = (args: Record<string, unknown>) =>
		w.renderCall(args, cor, ctx({ args, state: {}, isPartial: true })).render(300)[0] as string;
	assert.equal(p(pend({ send: "bg-p1", task: "oi" })), "◎ Subagent · mensagem · bg-p1");
	assert.ok(pend({ send: "bg-p1", task: "oi" }).includes("<dim>bg-p1</c>"));
	assert.equal(p(pend({ cancel: "bg-p2" })), "◎ Subagent · cancelar · bg-p2");
	assert.equal(p(pend({ resume: "bg-p3", task: "x" })), "◎ Subagent · retomar · bg-p3");
	assert.equal(p(pend({ status: true })), "◎ Subagent · status");
	// agente conhecido da sessão
	const c0 = ctx({ args: { agent: "swarm-worker", task: "x" }, state: {} });
	w.renderResult(
		{ content: [{ type: "text", text: "Started background run bg-p4 (swarm-worker). x" }], details: { results: [] } },
		{ expanded: false, isPartial: false },
		cor,
		c0,
	);
	assert.equal(p(pend({ send: "bg-p4", task: "oi" })), "◎ Subagent · mensagem · swarm-worker bg-p4");
});

// Margens do cabeçalho do subagente: ícone na coluna do ícone do Read, `├/└` na coluna da palavra Subagent, faixa neutra de ponta a ponta (rodando incluso).
test("subagente rodando: ícone na coluna do Read, e faixa neutra de ponta a ponta no cabeçalho (`└` na coluna de Subagent: subagente.test.ts)", () => {
	const { on, resolver } = comHora();
	const BG = "\x1b[48;2;9;9;9m";
	const tema = {
		fg: (_c: string, t: string) => `\x1b[2m${t}\x1b[22m`,
		bold: (t: string) => t,
		bg: (_c: string, t: string) => `${BG}${t}\x1b[49m`,
		getBgAnsi: () => BG,
		getFgAnsi: () => "\x1b[38;2;200;200;200m",
	};
	const rd = resolver("read", () => ({
		renderCall: () => nativeComponent("n"),
		renderResult: () => nativeComponent("n"),
	}));
	const sub = resolver("subagent", () => ({
		renderCall: () => nativeComponent("n"),
		renderResult: () => nativeComponent("n"),
	}));
	const ls = (r: any, a: Record<string, unknown>, id: string, res?: unknown) => {
		const c = ctx({ args: a, state: {}, toolCallId: id, keyText: () => "ctrl+o" });
		on.tool_execution_end({ toolCallId: id, toolName: "x" });
		if (res) r.renderResult(res, { expanded: false, isPartial: false }, tema, c);
		return r.renderCall(a, tema, c).render(100) as string[];
	};
	const col = (l: string, m: string) => plain(l).indexOf(m);
	const read = ls(rd, { path: "/work/proj/a.ts" }, "rd-m", {
		content: [{ type: "text", text: "a" }],
		details: undefined,
	})[0]!;
	const run = ls(sub, { agent: "swarm-worker", task: "Faça X" }, "sub-m");
	assert.equal(
		col(run[0]!, icon(toolIcon("subagent"))),
		col(read, icon(toolIcon("read"))),
		"ícone do robô na coluna do ícone do Read",
	);
	assert.ok(
		run[0]!.startsWith(BG) && run[0]!.endsWith("\x1b[49m") && visibleWidth(plain(run[0]!)) === 100,
		"faixa de ponta a ponta",
	);
});
