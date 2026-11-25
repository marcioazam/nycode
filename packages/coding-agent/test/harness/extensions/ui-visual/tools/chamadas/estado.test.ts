// node --experimental-strip-types --test ~/.nycode/agent/extensions/ui-visual/test/tools/estado.test.ts
import assert from "node:assert/strict";
import { visibleWidth as tuiWidth } from "@nycode/tui";
import { afterEach, beforeEach, test, vi } from "vitest";
import * as __m1 from "../../../../../../src/extensions/ui-visual/icons.ts";
import {
	ansiTags,
	base,
	ctx,
	ficha,
	icon,
	mod,
	nativeComponent,
	plain,
	reguaRun,
	semRespiro,
	tg,
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

const { iconGap } = __m1;
// Régua Run: antes `$ comando` e hora à direita; agora `<ícone> Run ─ comando ───── hora` e corpo/rodapé recuados até o `Run`.
// Prefixos de icon('bash') e iconGap() da cópia tmp (base.ts fixa o terminal): independem de TERM.
const G = iconGap();
const _P = `▎ ${" ".repeat(1 + G.length)}`; // corpo e rodapé: trilho + recuo até o `Run`
const regua = (cmd: string, hora = "", w = 80) => reguaRun(icon("bash"), G, cmd, hora, w);

const hhmm = (ms: number) => new Date(ms).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
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
test("hora: tool ao vivo mostra a hora do término à direita, alinhada à largura; rodando ou sem hora conhecida a linha não muda", () => {
	const { on, resolver } = comHora();
	const antes = Date.now();
	const w = resolver("bash", base);
	// Variante 04: antes a hora ficava na borda direita do cartão de 58 colunas e sumia em largura estreita;
	// agora é o título do cartão do shell (72 colunas, sem margem desde 2026-11-18: o trilho fica na coluna do texto), com a hora à direita só depois do fim.
	const titulo = (c: Record<string, unknown>, largura = 80) =>
		w.renderCall({ command: "ls" }, ansiTheme, ctx({ args: { command: "ls" }, ...c })).render(largura);
	// Respiro: antes o título era a 1ª linha; agora vem depois da linha de respiro.
	const rodando = plain(titulo({ toolCallId: "vivo-1", isPartial: true })[1]).trimEnd();
	assert.doesNotMatch(rodando, /\d\d:\d\d$/);
	on.tool_execution_end({ toolCallId: "vivo-1", toolName: "bash" });
	const linha = semRespiro(titulo({ toolCallId: "vivo-1" }))[0];
	const row = plain(linha).trimEnd();
	// antes 72 (teto do cartão); agora a largura inteira, 80.
	assert.equal(visibleWidth(plain(linha)), 80);
	assert.ok(
		[hhmm(antes), hhmm(Date.now())].some((h) => row === regua("ls", h)),
		row,
	); // Régua Run: antes `$ ls` + espaços + hora; agora a régua `─` até a hora
	const sem = plain(semRespiro(titulo({ toolCallId: "desconhecida" }))[0]).trimEnd();
	assert.doesNotMatch(sem, /\d\d:\d\d$/);
	// estreito: o cartão encolhe e a linha continua cabendo
	assert.ok(titulo({ toolCallId: "vivo-1" }, 20).every((l: string) => visibleWidth(plain(l)) <= 20));
});

test("hora: histórico usa o horário do resultado (término); tool em andamento não consulta o histórico", () => {
	const T = new Date(2026, 10, 14, 9, 41, 30).getTime();
	let leituras = 0;
	const branch = [
		{ type: "message", message: { role: "user", timestamp: 1 } },
		{ type: "message", message: { role: "toolResult", toolCallId: "hist-1", timestamp: T } },
	];
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
	const c = ctx({ args: { path: "/work/proj/a.ts" }, toolCallId: "hist-1", durationMs: 120_000 });
	assert.ok(ficha(w.renderCall({}, ansiTheme, c).render(90)[0]).endsWith("  09:41"));
	w.renderCall({}, ansiTheme, c).render(90);
	assert.equal(leituras, 1, "o histórico é lido uma vez por chamada");
	w.renderCall({}, ansiTheme, ctx({ args: { path: "a" }, toolCallId: "andando", isPartial: true })).render(90);
	assert.equal(leituras, 1);
});

test("hora: demais ferramentas (ícone) também ganham a hora na 1ª linha quando cabe", () => {
	const { on, resolver } = comHora();
	on.tool_execution_end({ toolCallId: "mcp-1", toolName: "mcp__x" });
	const w = resolver("mcp__x", base);
	const rows = w.renderCall({}, ansiTheme, { state: {}, toolCallId: "mcp-1" }).render(60).map(plain);
	assert.equal(visibleWidth(rows[0]), 58);
	assert.match(rows[0], /native-call +\d\d:\d\d$/);
	const curta = w.renderCall({}, ansiTheme, { state: {}, toolCallId: "mcp-1" }).render(14).map(plain);
	assert.doesNotMatch(curta[0], /\d\d:\d\d$/);
});

// Antigo (2026-11-14): bolinha pulsando, com um timer pedindo redesenho. Novo: sem ícone de estado no chat;
// "executando" é o nome em ciano (syntaxType), sem animação, e nenhum timer pede redesenho.
test("executando: nome do estado em ciano, sem animação nem redesenho por timer", async () => {
	// Relógio controlado (plano de testes, item 14): qualquer setTimeout/setInterval pedido pelo cartão vira pendente aqui.
	vi.useFakeTimers({ toFake: ["setTimeout", "setInterval"] });
	const tags = ansiTags; // marcas de largura zero: o cartão (58 colunas) cortaria as tags <cor> como texto
	let redesenhos = 0;
	const c = ctx({
		args: { command: "sleep 1" },
		toolCallId: "anim-1",
		isPartial: true,
		invalidate: () => redesenhos++,
	});
	const { on, resolver } = comHora();
	const w = resolver("bash", base);
	// Onda 10, P06: o início da chamada agora é ouvido (tempo vivo); sem início visto e sem truecolor, nada pede redesenho.
	assert.equal(typeof on.tool_execution_start, "function");
	// Variante 04: antes `· executando` em ciano (syntaxType) no título; agora o rodapé do cartão diz `executando` em accent.
	// Respiro: antes o rodapé era a última linha; agora vem antes da linha de respiro.
	const run = semRespiro(w.renderCall({}, tags, c).render(80));
	assert.ok(run.at(-1)!.includes(tg("accent", "executando")));
	vi.advanceTimersByTime(5_000);
	assert.equal(redesenhos, 0);
	assert.equal(
		plain(semRespiro(w.renderCall({}, ansiTheme, { ...c, isPartial: false }).render(80))[0]).trimEnd(),
		regua("sleep 1"),
	);
});

// A pergunta tem o mesmo alinhamento dos demais blocos, com o atalho e a hora juntos no
// cabeçalho. Resposta em destaque: antes `? pergunta  resposta` + texto atrás de um `│`
// em cartão verde; agora ` cabeçalho · pergunta` (atalho e hora só na 1ª linha) e ` ❯ resposta`, sem fundo.
test("question (Resposta em destaque): atalho + hora no cabeçalho da 1ª pergunta; texto dim cortado com …; resposta em ❯", () => {
	const { on, resolver } = comHora();
	const longa = "palavra ".repeat(12).trim();
	const wq = resolver("question", () => ({
		renderCall: () => ({ render: () => [], invalidate() {} }),
		renderResult: () => nativeComponent("nativo"),
	}));
	on.tool_execution_end({ toolCallId: "q-2", toolName: "question" });
	const l = wq
		.renderResult(
			{ content: [], details: { question: longa, header: "Forma", answer: "a" } },
			{ isPartial: false },
			ansiTheme,
			ctx({ toolCallId: "q-2" }),
		)
		.render(80)
		.map(plain);
	assert.equal(l.length, 2);
	// na margem do chat e a hora na margem direita; antes recuo 3 e 78 colunas (recuo direito 2).
	assert.match(l[0]!, /^Forma · palavra .*… +ctrl\+o abre {2}\d\d:\d\d$/);
	assert.equal(l[1], "❯ a");
	assert.ok(l.every((x: string) => [...x].length <= 80));
});

// `run` saía sem estado, sem ícone e sem hora (não tem renderCall próprio).
test("tool sem renderCall (run): linha com ícone, nome, argumentos resumidos e hora do término; erro por nome no título", () => {
	const { on, resolver } = comHora();
	const w = resolver("run", () => ({}));
	const args = { action: "wait", id: "rhwep1", timeout_s: 300 };
	const vivo = plain(w.renderCall(args, ansiTheme, ctx({ args, toolCallId: "run-1", isPartial: true })).render(70)[0]);
	assert.equal(vivo, `  ${icon(toolIcon("run"))} run · wait rhwep1 · 300s`);
	on.tool_execution_end({ toolCallId: "run-1", toolName: "run" });
	const feito = plain(w.renderCall(args, ansiTheme, ctx({ args, toolCallId: "run-1" })).render(70)[0]);
	assert.match(feito, /^ {2}. run · wait rhwep1 · 300s +\d\d:\d\d$/);
	assert.equal(visibleWidth(feito), 66); // caixa própria: 70 menos outputPad (1 de cada lado) e o recuo direito (2)
	const erro = plain(w.renderCall(args, ansiTheme, ctx({ args, toolCallId: "run-1", isError: true })).render(70)[0]);
	assert.ok(erro.startsWith(`  ${icon(toolIcon("run"))} run · erro · `), erro);
	const longo = { action: "start", command: "x".repeat(200), await: true };
	assert.ok(
		w
			.renderCall(longo, ansiTheme, ctx({ args: longo, toolCallId: "run-2" }))
			.render(50)
			.every((r: string) => visibleWidth(plain(r)) <= 50),
	);
});

// O todo repetia a mesma coisa em duas linhas (chamada + "Started #1: …"). Uma linha só, em
// português, com o andamento da lista à direita; lista e erro continuam com o desenho nativo embaixo.
test("Task: verbo como título, id apagado, barra e contagem sem percentual; resultado não repete", async () => {
	const { on, resolver } = comHora();
	const nativo = {
		renderCall: () => nativeComponent("todo start #1"),
		renderResult: () => nativeComponent("Started #1: Tema"),
	};
	const w = resolver("todo", () => nativo);
	const state = {};
	const args = { action: "start", id: 1, activeForm: "Ajustando fundos" };
	const c = ctx({ args, toolCallId: "todo-1", state });
	assert.equal(
		plain(w.renderCall(args, ansiTheme, { ...c, isPartial: true }).render(80)[0]),
		`  ${icon(toolIcon("todo"))} Iniciar #1`,
	);
	on.tool_execution_end({ toolCallId: "todo-1", toolName: "todo" });
	const todos = [
		{ id: 1, text: "Tema: fundo verde", status: "in_progress" },
		{ id: 2, text: "Bolinha", status: "completed" },
		{ id: 3, text: "Hora", status: "pending" },
	];
	const res = w.renderResult(
		{ content: [{ type: "text", text: "Started #1: Tema" }], details: { action: "start", todos, nextId: 4 } },
		{ expanded: false, isPartial: false },
		ansiTheme,
		c,
	);
	assert.deepEqual(res.render(80), []);
	const linha = plain(w.renderCall(args, ansiTheme, c).render(80)[0]);
	assert.match(linha, /^ {2}. Iniciada #1 {2}Tema: fundo verde +██╌╌╌╌ 1\/3 {2}\d\d:\d\d$/);
	assert.equal(tuiWidth(linha), 78);
	// add: o número vem do resultado (a tarefa nova é a de maior id)
	const s2 = {};
	const a2 = { action: "add", text: "Hora" };
	w.renderResult(
		{ content: [], details: { action: "add", todos, nextId: 4 } },
		{ expanded: false, isPartial: false },
		ansiTheme,
		ctx({ args: a2, state: s2 }),
	);
	assert.ok(
		plain(w.renderCall(a2, ansiTheme, ctx({ args: a2, state: s2 })).render(80)[0]).includes("Adicionada #3  Hora"),
	);
	// lista e erro: o desenho nativo continua embaixo
	const s3 = {};
	assert.deepEqual(
		w
			.renderResult(
				{ content: [], details: { action: "list", todos, nextId: 4 } },
				{ expanded: false, isPartial: false },
				ansiTheme,
				ctx({ state: s3 }),
			)
			.render(80),
		["  Started #1: Tema"],
	);
	assert.deepEqual(
		w
			.renderResult(
				{ content: [], details: { action: "start", todos, nextId: 4, error: "x" } },
				{ expanded: false, isPartial: false },
				ansiTheme,
				ctx({ state: {} }),
			)
			.render(80),
		["  Started #1: Tema"],
	);
});

// Memory é consulta, não execução com resultado: sem ícone de estado. Erro continua visível.
// Contrato trocado: antes cartão com fundo neutro (customMessageBg), `│ corpo` cru abaixo
// e o título nativo; agora uma frase `Memory · estado · nome` sem fundo e sem corpo (detalhes em memoria.test.ts).
test("memory: sem fundo e sem corpo cru; a frase traz a hora e o erro aparece como falha", () => {
	const { on, resolver } = comHora();
	const bgTheme = { ...ansiTheme, bg: (c: string, t: string) => `[${c}]${t}[/]` };
	const w = resolver("memory", base);
	assert.equal(w.renderShell, "self");
	on.tool_execution_end({ toolCallId: "mem-1", toolName: "memory" });
	const args = { action: "read", name: "x" };
	const c = ctx({ toolCallId: "mem-1", args });
	const res = w
		.renderResult(
			{ content: [{ type: "text", text: "No memory named x." }] },
			{ expanded: false, isPartial: false },
			bgTheme,
			c,
		)
		.render(60);
	assert.deepEqual(res, []);
	const call = w.renderCall(args, bgTheme, c).render(60);
	assert.ok(
		call.every((r: string) => !r.includes("[customMessageBg]") && !r.includes("[tool")),
		call.join("|"),
	);
	assert.match(plain(call[0]), /Memory · failed · x · não encontrada +\d\d:\d\d$/);
});

// Run com cabeçalho curto (verbo + nome do run) e linha de fatos (estado em cor,
// duração, id, log); saída recuada só quando existe; estado e fundo pelo estado REAL do run, não pelo da chamada.
test("run A: nome, estado e resumo em uma linha; id, log e saída expandidos, sem barra", () => {
	const { resolver } = comHora();
	const cor = {
		fg: (c: string, t: string) => `<${c}>${t}</c>`,
		bold: (t: string) => t,
		bg: (c: string, t: string) => `[${c}]${t}`,
	};
	const w = resolver("run", () => ({}));
	assert.equal(w.renderShell, "self");
	const home = process.env.HOME;
	const log = `${home}/.local/state/nycode-runs/rhwep1.log`;
	const draw = (
		args: Record<string, unknown>,
		text: string,
		extra: Record<string, unknown> = {},
		expanded = false,
		t: typeof cor = cor,
	) => {
		const c = ctx({ args, state: {}, ...extra });
		const res = w
			.renderResult({ content: [{ type: "text", text }] }, { expanded, isPartial: false }, t, c)
			.render(240);
		const call = w.renderCall(args, t, c).render(240);
		return {
			call,
			res,
			linhas: [...call, ...res]
				.map(plain)
				.map((l) => l.replace(/\[[a-zA-Z]+\]/g, "").trimEnd())
				.filter(Boolean),
			cru: [...call, ...res].join("\n"),
		};
	};
	// Desenho "Uma linha" (lab /rodando): antes caixa com o fundo do estado de ponta a ponta,
	// linha em branco acima e abaixo e `▸ nome · rotulo · tempo · resumo`; agora uma faixa só, neutra (vermelha no erro):
	// `▸ nome  estado · tempo[ · N linhas]` à esquerda e `id[ · tecla abre] · hora` à direita. Rodando = "em segundo plano".
	// antes `estado · tempo · linhas` com o rótulo cru (exit 0) e
	// `id · tecla abre · hora`; agora `estado em palavra · tempo · tipo · exit N · N linhas · comando` e `id · hora`.
	const espera = draw(
		{ action: "wait", id: "rhwep1", timeout_s: 30 },
		`ainda rodando após 30s\nrhwep1 [shell] running · 00:40 · gw-lean · aguardado · log ${log}\n(sem output)`,
	);
	assert.equal(espera.call.length, 1, "uma faixa, sem as linhas em branco da caixa");
	assert.deepEqual(espera.res, []);
	assert.match(espera.linhas[0]!, /^ ▸ gw-lean {2}rodando · 00:40 · shell {2,}rhwep1$/);
	assert.ok(espera.cru.startsWith("[customMessageBg]") && !/toolPendingBg|toolSuccessBg/.test(espera.cru));
	assert.ok(espera.cru.includes("<syntaxType>rodando</c>"));
	const falhou = draw(
		{ action: "wait", id: "rhwep1" },
		`rhwep1 [shell] failed exit 1 · 01:05 · gw-lean · aguardado · log ${log}\nerror[E0308]: mismatched types\ngate lean: 1 de 7 falhou`,
	);
	assert.equal(falhou.linhas.length, 1);
	assert.match(falhou.linhas[0]!, /^ ▸ gw-lean {2}falhou · 01:05 · shell · exit 1 · 2 linhas {2,}rhwep1$/);
	assert.ok(
		falhou.cru.startsWith("[toolErrorBg]") &&
			falhou.cru.includes("<error>falhou</c>") &&
			falhou.cru.includes("<error>exit 1</c>"),
	);
	const ok = draw(
		{ action: "tail", id: "rhwep1" },
		`rhwep1 [shell] done exit 0 · 03:12 · gw-lean · log ${log}\n412 passed`,
	);
	assert.match(ok.linhas[0]!, /^ ▸ gw-lean {2}concluído · 03:12 · shell · 1 linha {2,}rhwep1$/);
	assert.ok(
		ok.cru.startsWith("[customMessageBg]") &&
			ok.cru.includes("<success>concluído</c>") &&
			!ok.cru.includes("exit 0") &&
			!ok.cru.includes("[toolSuccessBg]"),
	);
	const parado = draw({ action: "wait", id: "r2" }, "r2 [shell] stopped sinal SIGINT · 00:52 · gw-lean");
	assert.equal(parado.linhas.length, 1);
	assert.match(parado.linhas[0]!, /^ ▸ gw-lean {2}parado · 00:52 · shell · sinal SIGINT {2,}r2$/);
	assert.ok(parado.cru.includes("<warning>sinal SIGINT</c>"));
	const inicio = draw(
		{ action: "start", command: "make gate", name: "gw-lean", await: true },
		`iniciado rhwep1 (pid 77)\nlog: ${log}\nVocê será avisado quando terminar (novo turno); não faça polling.`,
	);
	assert.equal(inicio.linhas.length, 1);
	assert.match(inicio.linhas[0]!, /^ ▸ gw-lean {2}rodando · shell · make gate {2,}rhwep1$/);
	assert.ok(
		draw(
			{ action: "start", name: "gw-lean" },
			`iniciado rhwep1 (pid 77)\nlog: ${log}\navisado`,
			{},
			true,
		).linhas[1]!.includes("rhwep1 · aviso ao terminar · log ~/.local/state/nycode-runs/rhwep1.log"),
	);
	const muitas = Array.from({ length: 9 }, (_, i) => `linha ${i + 1}`).join("\n");
	const longo = `rhwep1 [shell] done exit 0 · 03:12 · gw-lean\n${muitas}`;
	const ansiCor = { ...cor, fg: (_c: string, t: string) => `\x1b[2m${t}\x1b[22m` };
	const fechado = draw({ action: "wait", id: "rhwep1" }, longo, { keyText: () => "alt+o" }, false, ansiCor).linhas;
	assert.equal(fechado.length, 1);
	assert.match(fechado[0]!, /^ ▸ gw-lean {2}concluído · 03:12 · shell · 9 linhas {2,}rhwep1$/);
	const abertoRun = draw({ action: "wait", id: "rhwep1" }, longo, {}, true, ansiCor);
	assert.equal(abertoRun.linhas.length, 11);
	assert.match(abertoRun.linhas[0]!, /rhwep1$/); // antes `rhwep1 · ctrl+o fecha`; o atalho saiu da faixa
	assert.equal(abertoRun.linhas[1]!.trim(), "03:12 · rhwep1");
	assert.deepEqual(
		abertoRun.linhas.slice(2).map((r: string) => r.trim()),
		muitas.split("\n"),
	);
	assert.ok(
		abertoRun.res.every((r: string) => !/\[[a-zA-Z]+Bg\]/.test(r)),
		"saída aberta sem fundo, logo abaixo da faixa",
	);
	// o que não é reconhecido (list, stop, erro) mostra o texto como veio, no padding interno padrão
	const lista = draw({ action: "list" }, "nenhum run");
	assert.deepEqual(lista.linhas, [`   ${icon(toolIcon("run"))} run · list`, "   nenhum run"]);
	assert.ok(
		[...espera.call, ...espera.res, ...falhou.res].every(
			(r: string) => visibleWidth(plain(r).replace(/\[[a-zA-Z]+\]/g, "")) <= 240,
		),
	);
});

// "Uma linha" com a Barra: enquanto o run segue vivo no registro do nycode (nycode.run.registry), o tempo
// corre a partir do início e a barra ━ do Bash anda ao lado do estado; terminado no registro, a faixa para e fica como veio.
test("run vivo: tempo corrente e barra enquanto o registro diz running; terminado, sem barra", () => {
	const { resolver } = comHora();
	const cor = {
		fg: (c: string, t: string) => `<${c}>${t}</c>`,
		bold: (t: string) => t,
		bg: (c: string, t: string) => `[${c}]${t}`,
	};
	const w = resolver("run", () => ({}));
	const KEY = Symbol.for("nycode.run.registry");
	const g = globalThis as Record<symbol, unknown>;
	const salvo = g[KEY];
	// Fixed clocks: the lit cells of the sweep depend on the time phase (70 ms per cell), which made the bar flaky.
	vi.useFakeTimers({ toFake: ["Date"], now: 1_700_000_000_000 });
	const phase = vi.spyOn(performance, "now").mockReturnValue(1000);
	const rec = { state: "running", startedAt: Date.now() - 72_000 };
	g[KEY] = { get: (id: string) => (id === "rv1" ? rec : undefined) };
	const amb = { NO_COLOR: process.env.NO_COLOR, NYCODE_REDUCED_MOTION: process.env.NYCODE_REDUCED_MOTION };
	delete process.env.NO_COLOR;
	delete process.env.NYCODE_REDUCED_MOTION;
	try {
		const c = ctx({ args: { action: "start", name: "suite8" }, state: {}, toolCallId: "rv-call", invalidate() {} });
		const r = w.renderResult(
			{ content: [{ type: "text", text: "iniciado rv1 (pid 9)\nlog: /tmp/rv1.log\navisado" }] },
			{ expanded: false, isPartial: false },
			cor,
			c,
		);
		r.render(120);
		// Largura folgada: as tags <cor> do tema de teste contam como colunas.
		const vivo = w.renderCall(c.args, cor, c).render(400)[0];
		assert.match(plain(vivo).replace(/\[[a-zA-Z]+\]/g, ""), /^ ▸ suite8 {2}[━─]{10} rodando · 1:1\d · shell {2,}rv1/);
		assert.ok(vivo.includes("<accent>━</c>"), "barra acesa");
		rec.state = "done";
		const fim = plain(w.renderCall(c.args, cor, c).render(400)[0]).replace(/\[[a-zA-Z]+\]/g, "");
		assert.match(fim, /^ ▸ suite8 {2}rodando · shell {2,}rv1/, "sem barra e sem tempo corrente");
	} finally {
		if (salvo === undefined) delete g[KEY];
		else g[KEY] = salvo;
		vi.useRealTimers();
		phase.mockRestore();
		for (const [k, v] of Object.entries(amb)) if (v !== undefined) process.env[k] = v;
	}
});

// Subagente no padrão do run: cabeçalho `subagente · <agente|paralelo · N agentes>`,
// linha de fatos (estado em cor, onde roda, id) e a tarefa ou o resultado de cada agente embaixo. Sem a frase em inglês.

// Pergunta cancelada com fundo de aviso (antes ficava verde, como se tivesse dado certo).
// Resposta em destaque: sem fundo algum; cancelada = `sem resposta · Esc` em warning, respondida em success.

// U14: o ramo da sessão é varrido uma vez para montar toolCallId -> hora, não uma vez por chamada.

// Azul do Bash (antes ícone muted nas ações, nome em text, e `enviado para segundo plano` sem nome): ícone e
// `Subagent`/`Subagents` em accent, negrito, em todos os cartões.

// status legível (antes o texto cru em inglês sob `│`): contagem colorida no cabeçalho, um run por linha.

// Hora dos subagentes: sem fundo (antes pílula) e na mesma coluna da hora do Read (margem direita do chat).

// Corpo de texto puro: send/status/cancel/resume/list e erro sem detalhes saíam na margem esquerda; agora `│` e o texto
// começam na coluna da palavra `Subagent` do cabeçalho, cortados com … na largura.

// Cabeçalho das ações sem run (antes `Subagent · mensagem para bg-…` sem agente nem desfecho): `Subagent · <ação> · <agente> <id dim>`
// e à direita, antes da hora, o desfecho real do resultado (na fila/entregue/cancelado/retomado/falhou); texto não reconhecido = nada.

// Antes do resultado: a chamada pendente já usa o cabeçalho novo da ação, sem desfecho; antes `Subagent · mensagem para bg-…`.

// Margens do cabeçalho do subagente: ícone na coluna do ícone do Read, `├/└` na coluna da palavra Subagent, faixa neutra de ponta a ponta (rodando incluso).
