// Mensagem [plan-mode-execute] em "Lista de etapas" + "Desliza": plano/modelo.ts e plano/mensagem.ts.
import assert from "node:assert/strict";
import { afterEach, beforeEach, test, vi } from "vitest";
import * as __m3 from "../../../../../src/extensions/ui-visual/plano/bloco.ts";
import * as __m2 from "../../../../../src/extensions/ui-visual/plano/mensagem.ts";
import * as __m1 from "../../../../../src/extensions/ui-visual/plano/modelo.ts";

// The animations read TERM: pin it so the suite does not depend on the shell it runs in.
beforeEach(() => {
	vi.stubEnv("TERM", "xterm-256color");
});
afterEach(() => {
	vi.unstubAllEnvs();
});

const { planoDe, planoDoTexto } = __m1;
const { planoLinhas, renderPlano, deslizar } = __m2;
const { blocoLinhas, blocoPlano, pulsar, PULSO_MS } = __m3;

const RGB: Record<string, number[]> = { dim: [90, 90, 90], syntaxType: [0, 200, 200] };
const th = {
	fg: (c: string, t: string) => `<${c}>${t}</c>`,
	bold: (t: string) => `*${t}*`,
	getFgAnsi: (c: string) => `\x1b[38;2;${(RGB[c] ?? [1, 1, 1]).join(";")}m`,
};
const plain = (s: string) =>
	s
		.split(/<\/?[a-zA-Z]*>/g)
		.join("")
		.replace(/\x1b\[[0-9;]*m/g, "");
const amb = (f: () => void, env: Record<string, string> = {}) => {
	const salvo = { NO_COLOR: process.env.NO_COLOR, NYCODE_REDUCED_MOTION: process.env.NYCODE_REDUCED_MOTION };
	delete process.env.NO_COLOR;
	delete process.env.NYCODE_REDUCED_MOTION;
	Object.assign(process.env, env);
	try {
		f();
	} finally {
		for (const [k, v] of Object.entries(salvo)) {
			if (v === undefined) delete process.env[k];
			else process.env[k] = v;
		}
	}
};

const TIT = ["Um", "Dois", "Três", "Quatro", "Cinco"];
const todos = (feitas: number, n = TIT.length) =>
	TIT.slice(0, n).map((text, i) => ({ step: i + 1, text, completed: i < feitas }));
const TEXTO = "Execute the plan. Start with: Um\n[DONE:n] rule…";
const msg = (extra: object = {}) => ({
	type: "custom_message",
	customType: "plan-mode-execute",
	content: TEXTO,
	timestamp: new Date(1000).toISOString(),
	...extra,
});
const pm = (n: number) => ({ type: "custom", customType: "plan-mode", data: { todos: todos(n), executing: true } });

test("modelo: etapas da entrada plan-mode anterior à mensagem, progresso das posteriores", () => {
	const p = planoDe([pm(0), msg(), pm(2)], TEXTO, 1000);
	assert.deepEqual(
		p.etapas.map((e: { completed: boolean }) => e.completed),
		[true, true, false, false, false],
	);
	assert.equal(p.total, 5);
	assert.equal(p.estado, "executando");
});

test("modelo: plan-complete conclui tudo, plan-cancelled e um novo plano encerram, entrada com todos vazios não apaga os títulos", () => {
	const vazio = { type: "custom", customType: "plan-mode", data: { todos: [], executing: false } };
	const fim = planoDe(
		[pm(0), msg(), pm(4), { type: "custom_message", customType: "plan-complete" }, vazio],
		TEXTO,
		1000,
	);
	assert.equal(fim.estado, "concluido");
	assert.ok(fim.etapas.every((e: { completed: boolean }) => e.completed));
	assert.equal(
		planoDe([pm(0), msg(), pm(2), { type: "custom_message", customType: "plan-cancelled" }], TEXTO, 1000).estado,
		"encerrado",
	);
	assert.equal(
		planoDe([pm(0), msg(), pm(2), msg({ timestamp: new Date(9000).toISOString() })], TEXTO, 1000).estado,
		"encerrado",
	);
	assert.equal(planoDe([pm(0), msg(), vazio], TEXTO, 1000).etapas.length, 5);
});

test("modelo: duas execuções iguais, cada mensagem acha a sua (a mais próxima no tempo)", () => {
	const a = [
		pm(0),
		msg(),
		pm(5),
		{ type: "custom_message", customType: "plan-complete" },
		pm(0),
		msg({ timestamp: new Date(50_000).toISOString() }),
		pm(1),
	];
	assert.equal(planoDe(a, TEXTO, 1000).estado, "concluido");
	const segunda = planoDe(a, TEXTO, 50_000);
	assert.equal(segunda.estado, "executando");
	assert.equal(segunda.etapas.filter((e: { completed: boolean }) => e.completed).length, 1);
});

test("modelo: sem ramo ou sem entrada plan-mode, só o texto: 1ª etapa, sem total (nunca inventa)", () => {
	for (const e of [undefined, [msg()], []]) {
		const p = planoDe(e, TEXTO, 1000);
		assert.deepEqual(p.etapas, [{ text: "Um", completed: false }]);
		assert.equal(p.total, undefined);
	}
	assert.deepEqual(planoDoTexto("Execute the plan you just created.\nnote").etapas, []);
});

test("linhas: cabeçalho com estado e feitas/total, janela anterior-atual-próxima com ✓ ○ e ●", () =>
	amb(() => {
		const ls = planoLinhas(planoDe([pm(0), msg(), pm(2)], TEXTO, 1000), th, 200, 0); // a etiqueta <cor> do tema falso conta como colunas
		assert.equal(ls.length, 4);
		assert.match(plain(ls[0]!), /^ \uf0ae {2}\*Plano\* · executando +2\/5 $/);
		assert.match(ls[0]!, /<accent>\*Plano\*<\/c>/);
		assert.match(ls[0]!, /<syntaxType>executando<\/c>/);
		assert.match(ls[0]!, /<dim>2\/5<\/c> $/);
		assert.deepEqual(
			ls.slice(1).map((l: string) => plain(l)),
			["   ├ \uf42e 2. Dois", "   ├ ● 3. Três", "   └ ○ 4. Quatro"],
		);
		assert.match(ls[1]!, /<borderMuted>├<\/c> <success>\uf42e<\/c> <dim>2\. Dois/);
		assert.match(ls[2]!, /<text>3\. Três<\/c>/);
		assert.match(ls[3]!, /<borderMuted>○<\/c>/);
		assert.doesNotMatch(ls.join(""), /[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/, "sem spinner braille");
	}));

test("linhas: janela nas pontas, concluído, encerrado e largura estreita", () =>
	amb(() => {
		const nomes = (p: unknown, w = 80) =>
			planoLinhas(p as never, th, w, 0)
				.slice(1)
				.map((l: string) => plain(l).replace(/^ +/, ""));
		assert.deepEqual(nomes(planoDe([pm(0), msg(), pm(0)], TEXTO, 1000)), ["├ ● 1. Um", "├ ○ 2. Dois", "└ ○ 3. Três"]);
		assert.deepEqual(nomes(planoDe([pm(0), msg(), pm(4)], TEXTO, 1000)), [
			"├ \uf42e 3. Três",
			"├ \uf42e 4. Quatro",
			"└ ● 5. Cinco",
		]);
		const fim = planoDe([pm(0), msg(), { type: "custom_message", customType: "plan-complete" }], TEXTO, 1000);
		assert.match(planoLinhas(fim, th, 80, 0)[0]!, /<success>concluído<\/c>/);
		assert.deepEqual(nomes(fim), ["├ \uf42e 3. Três", "├ \uf42e 4. Quatro", "└ \uf42e 5. Cinco"]);
		const canc = planoLinhas(
			planoDe([pm(0), msg(), pm(1), { type: "custom_message", customType: "plan-cancelled" }], TEXTO, 1000),
			th,
			80,
			0,
		);
		assert.match(canc[0]!, /<warning>encerrado<\/c>/);
		assert.match(canc[2]!, /<warning>\uf05e<\/c>/);
		for (const l of planoLinhas(planoDe([pm(0), msg(), pm(2)], TEXTO, 1000), th, 20, 0))
			assert.ok([...plain(l)].length <= 20, l);
		assert.equal(
			planoLinhas(planoDoTexto("Execute the plan you just created."), th, 80, 0).length,
			1,
			"sem etapas: só o cabeçalho",
		);
		assert.doesNotMatch(planoLinhas(planoDoTexto(TEXTO), th, 80, 0)[0]!, /\d+\/\d+/, "sem total, sem contador");
	}));

test("ícone da etapa atual respira entre dim e syntaxType; sem movimento fica na cor do estado", () => {
	const p = planoDe([pm(0), msg(), pm(0)], TEXTO, 1000);
	const ico = (ms: number) => planoLinhas(p, th, 80, ms)[1]!.match(/(\x1b\[38;2;[\d;]+m|<syntaxType>)●/)?.[1];
	amb(() => {
		assert.notEqual(ico(0), ico(800));
		assert.match(ico(0)!, /^\x1b\[38;2;/);
	});
	amb(
		() => {
			assert.equal(ico(0), "<syntaxType>");
			assert.equal(ico(800), "<syntaxType>");
		},
		{ NYCODE_REDUCED_MOTION: "1" },
	);
});

test("Desliza: 12 colunas da direita em 400 ms; só ao chegar; histórico e expandido", () =>
	amb(() => {
		const ramo = [pm(0), msg(), pm(1)];
		let agora = 1000;
		const rd = (expandido = false) =>
			renderPlano({ content: TEXTO, timestamp: 1000 }, expandido, th, { entradas: () => ramo, agora: () => agora });
		const col = () => plain(rd()!.render(80)[0]!).search(/\S/);
		const base = planoLinhas(planoDe(ramo, TEXTO, 1000), th, 80, 0).map(plain);
		assert.equal(col(), 13, "no instante da chegada: 1 + 12 colunas");
		agora = 1200;
		assert.ok(col() > 1 && col() < 13, `meio do caminho: ${col()}`);
		agora = 1400;
		assert.equal(col(), 1);
		agora = 9e6; // histórico (ou depois da entrada): pronto, sem repetir
		assert.deepEqual(rd()!.render(80).map(plain), base);
		agora = 1000;
		assert.equal(rd(true), undefined, "alt+o: o nycode mostra o texto original");
		assert.equal(plain(deslizar(["x"], 40, 0)[0]!), `${" ".repeat(12)}x`);
	}));

test("Desliza: movimento reduzido e NO_COLOR entram prontos; pede redesenho só enquanto anima", () => {
	const ramo = [pm(0), msg(), pm(1)];
	for (const env of [{ NYCODE_REDUCED_MOTION: "1" }, { NO_COLOR: "1" }])
		amb(() => {
			let pedidos = 0;
			const c = renderPlano({ content: TEXTO, timestamp: 1000 }, false, th, {
				entradas: () => ramo,
				agora: () => 1000,
				animar: () => pedidos++,
			})!;
			assert.equal(plain(c.render(80)[0]!).search(/\S/), 1);
			assert.equal(pedidos, 0);
		}, env as never);
	amb(() => {
		let pedidos = 0;
		const c = (agora: number, r = ramo) =>
			renderPlano({ content: TEXTO, timestamp: 1000 }, false, th, {
				entradas: () => r,
				agora: () => agora,
				animar: () => pedidos++,
			})!;
		c(1000).render(80);
		assert.equal(pedidos, 1, "executando: respira, pede quadros");
		c(9e6, [pm(0), msg(), { type: "custom_message", customType: "plan-complete" } as never]).render(80);
		assert.equal(pedidos, 1, "concluído e fora da entrada: parado");
	});
});

// Bloco de progresso do plano (lab /progplano, desenho 10 "Trilho" sem a barra + "Pulso"): plano/bloco.ts, gancho __nyPlanoBloco do nycode.
const ST = ["Um", "Dois", "Três", "Quatro", "Cinco"].map((text, i) => ({ step: i + 1, text, completed: false }));
const bl = (o: object = {}) => ({
	kind: "progresso",
	steps: ST,
	total: 5,
	nums: [2],
	reason: "",
	sentAt: "20/11 00:27",
	width: 80,
	streaming: false,
	theme: th,
	...o,
});
const feitas = (n: number) => ST.map((e, i) => ({ ...e, completed: i < n }));
const ansi = { ...th, fg: (c: string, t: string) => `${th.getFgAnsi(c)}${t}\x1b[39m` };
const [CIANO, BG] = ["syntaxType", "customMessageBg"];
const pl = (x: string) => x.replace(/\x1b\[[0-9;]*m/g, "");
const th2 = {
	...ansi,
	bold: (x: string) => x,
	getFgAnsi: (c: string) => `\x1b[38;2;${(RGB[c] ?? [1, 1, 1]).join(";")}m`,
	getBgAnsi: (c: string) => (c === BG ? "\x1b[48;2;20;20;30m" : ""),
};

test("bloco: progresso em 4 linhas, hora dim à direita, sem pílula nem barra lateral", () => {
	const ls = blocoLinhas(bl({ width: 60 }) as never, th2, 5000)!.map(pl);
	assert.equal(ls.length, 4);
	assert.equal([...ls[0]!].length, 60);
	assert.equal(ls[0]!.replace(/ {3,}/, "  "), " \ueb9d  plano · executando · etapa 3 de 5  20/11 00:27 ");
	assert.equal(ls[1], "    ━━━━━╌╌╌╌╌╌╌ 40%");
	assert.equal(ls[2], "    atual: Três · 2 concluídas, faltam 3");
	assert.equal(ls[3], "    sem pendências · avança sozinho");
	const cru = blocoLinhas(bl() as never, th2, 5000)!.join("\n");
	assert.ok(
		!cru.includes("▎") && !/[\u2800-\u28ff]/.test(cru) && !cru.includes("\x1b[48"),
		"sem trilho, spinner braille nem fundo",
	);
	assert.ok(cru.includes("\x1b[38;2;90;90;90m20/11 00:27\x1b[39m"));
});

test("bloco: estados — espera, aguardando subagentes, bloqueado, concluído, cancelado", () => {
	const nome = (o: object) =>
		pl(blocoLinhas(bl(o) as never, th2, 5000)![0]!)
			.trim()
			.replace(/\s+\d\d\/.*$/, "");
	assert.equal(nome({ kind: "espera", steps: feitas(1), nums: [] }), "\ueb9d  plano · em espera · etapa 2 de 5");
	const sub = blocoLinhas(
		bl({ kind: "espera", steps: feitas(1), nums: [], bgId: "bg-1a", reason: "tarefas 2 e 3", width: 80 }) as never,
		th2,
		5000,
	)!.map(pl);
	assert.ok(
		sub[0]!.includes("aguardando subagentes") &&
			sub[3] === "    tarefas 2 e 3 · segundo plano · bg-1a · retoma sozinho, nada a fazer",
	);
	const bq = blocoLinhas(
		bl({ kind: "bloqueado", steps: feitas(2), nums: [], reason: "falta a classe" }) as never,
		th2,
		5000,
	)!.map(pl);
	assert.ok(
		bq[0]!.includes("\uf421  plano · bloqueado · etapa 3 de 5") &&
			bq[3] === "    falta a classe · precisa de você · responda para continuar",
	);
	const co = blocoLinhas(bl({ nums: [4, 5] }) as never, th2, 5000)!.map(pl);
	assert.ok(
		co[0]!.includes("\uf42e  plano · concluído · etapa 5 de 5") &&
			co[1] === "    ━━━━━━━━━━━━ 100%" &&
			co[2] === "    as 5 etapas foram concluídas",
	);
	const ca = blocoLinhas(bl({ kind: "cancelado", steps: feitas(2), nums: [] }) as never, th2, 5000)!.map(pl);
	assert.ok(ca[0]!.includes("plano · cancelado") && ca[2] === "    plano cancelado" && ca[3] === "    nada a fazer");
});

test("bloco: sem etapas só o cabeçalho e a ação; dado que falta devolve undefined; largura estreita corta", () => {
	assert.equal(blocoLinhas(bl({ kind: "cancelado", steps: [], total: 0, nums: [] }) as never, th, 5000)!.length, 2);
	assert.equal(blocoLinhas(bl({ nums: [9] }) as never, th, 0), undefined);
	assert.equal(blocoLinhas(bl({ total: 0 }) as never, th, 0), undefined);
	for (const l of blocoLinhas(bl({ width: 24 }) as never, th2, 5000)!) assert.ok(pl(l).length <= 24);
});

test("bloco: Pulso pulsa a cor do estado nos primeiros 1,2 s e assenta; reduzido e NO_COLOR ficam fixos", () => {
	const base = blocoLinhas(bl({ theme: th2 }) as never, th2, 5000)!;
	const pico = blocoLinhas(bl({ theme: th2 }) as never, th2, 300)!;
	assert.notDeepEqual(pico, base);
	assert.deepEqual(blocoLinhas(bl({ theme: th2 }) as never, th2, PULSO_MS)!, base);
	assert.deepEqual(pulsar(base, th2, CIANO, 0).length, base.length);
	assert.deepEqual(pulsar(base, { fg: th.fg, bold: th.bold }, CIANO, 300), base);
	let t = 100,
		n = 0;
	const d = { agora: () => t, animar: () => void n++ };
	amb(() => {
		const novo = (o: object = {}) => blocoPlano(bl({ theme: th2, ...o }) as never, d)!;
		const a0 = novo({ sentAt: "01/01 01:01" });
		t = 400;
		assert.notEqual(novo({ sentAt: "01/01 01:01" }), a0); // pulsando
		assert.ok(n >= 2);
		t = 100 + PULSO_MS + 1;
		const assentado = novo({ sentAt: "01/01 01:01" });
		assert.deepEqual(
			assentado.split("\n"),
			blocoLinhas(bl({ theme: th2, sentAt: "01/01 01:01" }) as never, th2, 5000)!,
		);
		novo({ nums: [3], sentAt: "01/01 01:01" });
		t += 300;
		assert.notEqual(
			novo({ nums: [3], sentAt: "01/01 01:01" }),
			blocoLinhas(bl({ theme: th2, nums: [3], sentAt: "01/01 01:01" }) as never, th2, 5000)!.join("\n"),
		); // mudança de estado pulsa de novo
	});
	amb(
		() => {
			t = 9e6;
			const r = blocoPlano(bl({ theme: th2, sentAt: "x" }) as never, d)!;
			t += 10;
			assert.equal(blocoPlano(bl({ theme: th2, sentAt: "x" }) as never, d), r);
		},
		{ NYCODE_REDUCED_MOTION: "1" },
	);
	amb(() => assert.ok(!/\x1b/.test(blocoPlano(bl({ theme: th2 }) as never, d)!)), { NO_COLOR: "1" });
	assert.equal(blocoPlano(bl({ theme: undefined }) as never, d), undefined);
});
