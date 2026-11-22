// node --experimental-strip-types --test extensions/diagnostico/test/modal.test.ts
// Modal variante A: visão `problemas` (lista em cima, detalhe do item embaixo) numa moldura fechada.
import assert from "node:assert/strict";
import { visibleWidth } from "@nycode/tui";
import { afterEach, beforeEach, test, vi } from "vitest";
import * as __d_painel from "../../../../src/extensions/diagnostico/painel.ts";

// The rendering reads TERM: pin it so the suite does not depend on the shell it runs in.
beforeEach(() => {
	vi.stubEnv("TERM", "xterm-256color");
});
afterEach(() => {
	vi.unstubAllEnvs();
});

const m = __d_painel;

const theme = { fg: (_c: string, s: string) => s, bg: (_c: string, s: string) => s, bold: (s: string) => s };
/** Tema que marca os tokens, para conferir cor de tecla, verbo, borda e seleção. */
const marcado = {
	fg: (c: string, s: string) => `<${c}>${s}</>`,
	bg: (c: string, s: string) => `[${c}]${s}[/]`,
	bold: (s: string) => s,
};
const h = (hh: number, mm: number, ss = 0) => new Date(2026, 10, 14, hh, mm, ss).getTime();
const reg = (o: object) => ({
	ts: h(9, 5),
	ultimo: h(9, 5),
	sev: 17,
	fonte: "console",
	tipo: "error",
	msg: "falhou",
	n: 1,
	visto: false,
	silencioso: false,
	...o,
});
const J429 =
	'429 {"type":"error","error":{"type":"rate_limit_error","message":"This request would exceed your account\'s rate limit. Please try again later."},"request_id":"req_011CZx4abcdefgh"}';
const JCOTA =
	'429 {"type":"error","error":{"type":"rate_limit_error","message":"Usage limit reached: quota exceeded for this account."},"request_id":"req_022"}';
/** As quatro entradas do desenho aprovado, mais nova primeiro como `reg.lista()`. */
const MOCKUP = () => [
	reg({
		ultimo: h(17, 21, 4),
		fonte: "modelo",
		tipo: "chamada",
		msg: J429,
		traceId: "4bf92f35".repeat(4),
		spanId: "00f067aa".repeat(2),
	}),
	reg({ ultimo: h(17, 21, 9), fonte: "sub:swarm-worker", tipo: "modelo:chamada", msg: J429, n: 2 }),
	reg({ ultimo: h(17, 22), fonte: "sub:swarm-worker", tipo: "modelo:chamada", msg: JCOTA }),
	reg({
		ultimo: h(17, 16),
		sev: 13,
		fonte: "tool",
		tipo: "bash",
		msg: "EXIT=0",
		detalhe: "EXIT=0\n\nCommand exited with code 1",
	}),
];

function cria(
	lista: any[],
	o: { altura?: number; env?: Record<string, string>; tema?: any; aba?: string; obs?: boolean } = {},
) {
	const calls = {
		silenciar: [] as string[],
		reativar: [] as string[],
		limpar: 0,
		done: 0,
		redraw: 0,
		copiado: [] as string[],
	};
	const acoes: any = {
		lista: () => lista,
		silenciar: (k: string) => calls.silenciar.push(k),
		reativar: (k: string) => calls.reativar.push(k),
		limpar: () => {
			calls.limpar++;
			return lista.splice(0);
		},
		caminhoLog: "~/d/diag.jsonl",
		copiar: (s: string) => calls.copiado.push(s),
	};
	if (o.obs)
		Object.assign(acoes, {
			eventos: () => [],
			resumo: () => ({ spans: 0, erros: 0, tokensEntrada: 0, tokensSaida: 0 }),
			saude: () => undefined,
		});
	const p = new m.PainelDiagnostico(
		o.tema ?? theme,
		acoes,
		() => calls.done++,
		() => calls.redraw++,
		() => o.altura ?? 20,
		o.aba as never,
		o.env ?? {},
	);
	return { p, calls, acoes };
}
const semAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");
const TAB = "\t",
	SHIFT_TAB = "\x1b[Z",
	UP = "\x1b[A",
	DOWN = "\x1b[B",
	ENTER = "\r",
	ESC = "\x1b",
	PGDN = "\x1b[6~",
	PGUP = "\x1b[5~";
/** Painel sem moldura: régua no topo e na base, corpo preenchido até a largura pedida. */
function aberta(out: string[], w: number, ascii = false) {
	for (const l of out) assert.ok(visibleWidth(l) <= w, `largura ${w}: ${l}`);
	assert.ok(out[0]!.startsWith(ascii ? "-- " : "── "), out[0]);
	assert.match(out.at(-1)!, ascii ? /^-+$/ : /^─+$/);
}
const sem = (l: string) => semAnsi(l).trimEnd();

test("desenho aprovado em 80 colunas: régua com a visão, contagem, lista, divisória, detalhe e dicas", () => {
	const out = cria(MOCKUP(), { obs: true }).p.render(80);
	aberta(out, 80);
	assert.match(out[0]!, /^── Diagnóstico ─+ +problemas +eventos +saúde +──$/);
	assert.equal(sem(out[1]!), " ✕ 3 erros · ▲ 1 aviso");
	assert.equal(sem(out[2]!), ` ❯ erro    Limite de requisições (429)${" ".repeat(36)}17:21`);
	assert.ok(sem(out[3]!).startsWith("   erro    Limite de requisições (429) ×2"));
	assert.ok(sem(out[4]!).startsWith("   erro    Cota da conta esgotada (429)"));
	assert.ok(sem(out[5]!).startsWith("   atenção tool bash: saiu com código 1") && sem(out[5]!).endsWith("17:16"));
	assert.match(out[6]!, /^─+$/);
	assert.deepEqual(out.slice(7, -2).map(sem), [
		" modelo · rate_limit_error · 17:21:04",
		"",
		" This request would exceed your account's rate limit. Please try again later.",
		"",
		" → aguarde a renovação ou troque de modelo com /model",
		" request_id req_011CZx4a… · trace 4bf92f35… · span 00f067aa…",
	]);
	assert.equal(sem(out.at(-2)!), "  enter  json bruto    c  copiar    tab  visão    esc  fechar    ?  mais");
});

test("larguras 100/80/40 e ASCII: régua nos extremos, em 40 a fonte some e o texto quebra na largura", () => {
	for (const w of [100, 80, 40]) aberta(cria(MOCKUP()).p.render(w), w);
	const o40 = cria(MOCKUP()).p.render(40);
	assert.equal(sem(o40[0]!), "── Diagnóstico ──────────  problemas  ──");
	assert.equal(sem(o40[2]!), " ❯ erro    Limite de requisições… 17:21");
	assert.equal(sem(o40[5]!), "   atenção tool bash: saiu com c… 17:16");
	assert.ok(!o40.join("\n").includes("swarm-worker"), "sem a coluna da fonte");
	assert.ok(
		o40.some((l: string) => l.includes("→ aguarde a renovação ou troque de")),
		"correção quebrada na largura",
	);
	assert.match(sem(o40.at(-2)!), /^ {1,2}enter {2}json bruto {4}c {2}copiar {4}esc…$/, "dicas cortadas com … em 40");
	assert.ok(!cria(MOCKUP()).p.render(100).at(-2)!.includes("tab  visão")); // sem eventos/saúde não há outra visão
	assert.ok(cria(MOCKUP(), { obs: true }).p.render(100).at(-2)!.includes("tab  visão"));
	const a = cria(MOCKUP(), { env: { NYCODE_ASCII_ICONS: "1" } }).p.render(80);
	assert.equal(sem(a[1]!), " x 3 erros · ! 1 aviso");
	assert.match(a[0]!, /^── Diagnóstico ─+ +problemas +──$/);
});

test("contagem com plural certo e só do que existe; vazio", () => {
	const um = cria([reg({ sev: 13, msg: "a" })]).p.render(80);
	assert.equal(sem(um[1]!), " ▲ 1 aviso");
	const dois = cria([reg({ sev: 13, msg: "a" }), reg({ sev: 13, msg: "b" }), reg({ sev: 21, msg: "c" })]).p.render(80);
	assert.equal(sem(dois[1]!), " ✕ 1 erro · ▲ 2 avisos");
	const vazio = cria([]).p.render(80);
	aberta(vazio, 80);
	assert.equal(vazio.length, 4);
	assert.ok(vazio[1]!.includes("Nenhum erro ou aviso nesta sessão"));
});

test("cores: régua em borderMuted, glifo pela severidade, linha escolhida com selectedBg e dicas accent/dim", () => {
	const out = cria(MOCKUP(), { tema: marcado }).p.render(400);
	assert.ok(out[0]!.startsWith("<borderMuted>── </>Diagnóstico"));
	assert.ok(out[1]!.includes("<error>✕ 3 erros</>") && out[1]!.includes("<warning>▲ 1 aviso</>"));
	assert.ok(out[2]!.includes("[selectedBg]") && out[2]!.includes("<accent>❯</>"));
	assert.ok(!out[3]!.includes("[selectedBg]"));
	assert.ok(out[5]!.includes("<warning>atenção</>"));
	assert.ok(out.at(-2)!.includes("[customMessageBg]") && out.at(-2)!.includes("<dim>json bruto</>"));
	assert.ok(out.some((l: string) => l.includes("com <accent>/model</>")));
	assert.ok(out.at(-3)!.includes("<dim>request_id req_011CZx4a… · trace 4bf92f35… · span 00f067aa…</>"));
});

test("↑↓ trocam o item e o detalhe acompanha; sem ids nem correção a última linha é o corpo", () => {
	const { p } = cria(MOCKUP());
	p.handleInput(DOWN);
	p.handleInput(DOWN);
	let s = p.render(100).map(sem).join("\n");
	assert.ok(s.includes(" ❯ erro    Cota da conta esgotada (429)"));
	assert.ok(s.includes(" sub:swarm-worker · rate_limit_error · 17:22:00"));
	assert.ok(s.includes(" Usage limit reached: quota exceeded for this account."));
	assert.ok(s.includes(" → aguarde a renovação do limite; a retomada automática espera por ela"));
	assert.ok(s.includes(" request_id req_022") && !s.includes("trace "));
	p.handleInput(DOWN);
	p.handleInput(DOWN); // para no último
	assert.equal(p.index, 3);
	s = p.render(100).map(sem).join("\n");
	assert.ok(s.includes(" tool · bash · 17:16:00") && s.includes(" Command exited with code 1"));
	assert.ok(!s.includes("→") && !s.includes("request_id"));
	p.handleInput(UP);
	assert.equal(p.index, 2);
});

test("enter alterna o detalhe entre a leitura humana e o texto original", () => {
	const { p } = cria(MOCKUP());
	p.handleInput(ENTER);
	let o = p.render(100);
	aberta(o, 100);
	const s = o.map(sem).join("").replace(/ /g, "");
	assert.ok(s.includes(J429.replace(/ /g, "")), "json original inteiro, só quebrado");
	assert.ok(!o.join("\n").includes("→ aguarde"));
	assert.ok(sem(o.at(-2)!).includes("enter  resumo"));
	assert.ok(o.join("\n").includes("trace 4bf92f35…"));
	p.handleInput(ENTER);
	o = p.render(100);
	assert.ok(o.join("\n").includes("→ aguarde") && sem(o.at(-2)!).includes("enter  json bruto"));
	const q = cria([reg({ msg: "curta", detalhe: "Error: outra\n  at x (y.ts:1)" })]).p;
	q.handleInput(ENTER);
	const b = q.render(80).map(sem).join("\n");
	assert.ok(b.includes(" curta") && b.includes(" Error: outra") && b.includes("   at x (y.ts:1)"));
});

test("t inclui as informativas; s silencia e reativa; l limpa; esc fecha", () => {
	const lista = [
		reg({ fonte: "a", tipo: "b", msg: "c" }),
		reg({ sev: 9, fonte: "notify", tipo: "notify", msg: "só informação" }),
	];
	const { p, calls } = cria(lista);
	assert.ok(!p.render(120).join("\n").includes("só informação"));
	p.handleInput("t");
	const o = p.render(120).map(sem);
	assert.ok(o.some((l) => l.includes("info    só informação")));
	assert.equal(o[1], " ✕ 1 erro · com informativas");
	p.handleInput("t");
	assert.ok(!p.render(120).join("\n").includes("só informação"));
	p.handleInput("s");
	assert.deepEqual(calls.silenciar, ["a|b|c"]);
	lista[0]!.silencioso = true;
	assert.ok(p.render(120).join("\n").includes("c (silenciado)"));
	p.handleInput("s");
	assert.deepEqual(calls.reativar, ["a|b|c"]);
	p.handleInput("l");
	assert.equal(calls.limpar, 1);
	assert.ok(p.render(80)[1]!.includes("Nenhum erro ou aviso"));
	p.handleInput(ESC);
	assert.equal(calls.done, 1);
});

test("c copia título humano, texto original e ids inteiros; sem `copiar` a tecla some", () => {
	const { p, calls } = cria(MOCKUP());
	p.handleInput("c");
	assert.equal(calls.copiado.length, 1);
	const c = calls.copiado[0]!;
	assert.ok(c.startsWith("Limite de requisições (429)\nmodelo · rate_limit_error · 17:21:04 · ×1\n\n"));
	assert.ok(c.includes(J429));
	assert.ok(
		c.endsWith(`request_id req_011CZx4abcdefgh · trace ${"4bf92f35".repeat(4)} · span ${"00f067aa".repeat(2)}`),
	);
	assert.ok(p.render(100).at(-2)!.includes("c  copiado"));
	p.handleInput(DOWN);
	assert.ok(p.render(100).at(-2)!.includes("c  copiar"));
	const s = cria(MOCKUP());
	delete s.acoes.copiar;
	s.p.handleInput("c");
	assert.ok(!s.p.render(100).at(-2)!.includes("copiar"));
});

test("altura: lista com … acima/abaixo, nunca passa do orçamento, régua de baixo sempre presente", () => {
	const lista = Array.from({ length: 12 }, (_, i) => reg({ msg: `m${i}` }));
	for (const w of [100, 80, 40]) {
		for (const altura of [8, 10, 16]) {
			const { p } = cria(lista, { altura });
			let o = p.render(w);
			assert.ok(o.length <= altura, `${w}x${altura}: ${o.length}`);
			aberta(o, w);
			assert.ok(o.some((l: string) => /… \d+ abaixo/.test(l)) && !o.some((l: string) => /\d+ acima/.test(l)));
			for (let i = 0; i < 6; i++) p.handleInput(DOWN);
			o = p.render(w);
			assert.ok(o.length <= altura);
			aberta(o, w);
			if (altura <= 10)
				assert.ok(
					o.some((l: string) => /… \d+ acima/.test(l)) && o.some((l: string) => /… \d+ abaixo/.test(l)),
					`meio ${w}x${altura}`,
				);
			assert.ok(o.find((l: string) => l.includes("m6"))!.includes("❯"));
			for (let i = 0; i < 9; i++) p.handleInput(DOWN);
			o = p.render(w);
			assert.ok(o.some((l: string) => l.includes("m11")) && !o.some((l: string) => /\d+ abaixo/.test(l)));
		}
	}
});

test("detalhe maior que a janela: pgdn/pgup rolam o detalhe; quando cabe, andam a lista", () => {
	const corpo = Array.from({ length: 60 }, (_, i) => `linha-${i + 1}`).join("\n");
	const { p } = cria([reg({ msg: "curta", detalhe: corpo })], { altura: 16 });
	let o = p.render(80);
	aberta(o, 80);
	assert.ok(
		o.length <= 16 &&
			o.some((l: string) => l.includes("linhas abaixo")) &&
			!o.some((l: string) => l.includes("linhas acima")),
	);
	for (let i = 0; i < 12; i++) {
		p.handleInput(PGDN);
		o = p.render(80);
		assert.ok(o.length <= 16);
	}
	assert.ok(
		o.some((l: string) => l.includes("linha-60")) &&
			o.some((l: string) => l.includes("linhas acima")) &&
			!o.some((l: string) => l.includes("linhas abaixo")),
	);
	p.handleInput(PGUP);
	assert.ok(p.render(80).some((l: string) => l.includes("linhas abaixo")));
	const q = cria(
		Array.from({ length: 30 }, (_, i) => reg({ msg: `m${i}` })),
		{ altura: 12 },
	).p;
	q.render(100);
	q.handleInput(PGDN);
	assert.ok(q.index > 1);
	q.handleInput(PGUP);
	assert.equal(q.index, 0);
});

test("tab e shift+tab ciclam problemas → eventos → saúde; a régua do topo mostra as visões", () => {
	const { p } = cria(MOCKUP(), { obs: true });
	const vistas = [p.aba];
	for (let i = 0; i < 3; i++) {
		p.handleInput(TAB);
		vistas.push(p.aba);
	}
	assert.deepEqual(vistas, ["problemas", "eventos", "saúde", "problemas"]);
	p.handleInput(SHIFT_TAB);
	assert.equal(p.aba, "saúde");
	for (const w of [100, 80]) {
		const o = p.render(w);
		aberta(o, w);
		assert.match(o[0]!, /^── Diagnóstico ─+ +problemas +eventos +saúde +──$/);
	}
	assert.match(p.render(40)[0]!, /^── Diagnóstico ─+ +saúde +──$/, "em 40 só cabe a visão atual");
	p.handleInput(SHIFT_TAB);
	assert.match(p.render(40)[0]!, /^── Diagnóstico ─+ +eventos +──$/);
	const so = cria([]).p;
	so.handleInput(TAB);
	assert.equal(so.aba, "problemas"); // sem eventos nem saúde só existe uma visão
});

test("linha do wrapper sem o `nycode: ` redundante; silenciada continua legível em 40", () => {
	const o = cria([reg({ sev: 13, fonte: "wrapper", msg: "nycode: nycode 9.9.9 is not 1.7.0" })]).p.render(100);
	assert.ok(sem(o[2]!).startsWith(" ❯ atenção nycode 9.9.9 is not 1.7.0"));
	assert.ok(o.map(sem).some((l) => l.includes(" wrapper · error · 09:05:00")));
	const e = cria([
		reg({
			fonte: "fonte-x",
			msg: "m".repeat(200),
			detalhe: `${"y".repeat(150)}\n\tcom tab`,
			silencioso: true,
			n: 12,
		}),
	]).p.render(40);
	aberta(e, 40);
	assert.ok(e[2]!.includes("mmm") && !e[2]!.includes("fonte-x"));
	assert.ok(e.map(sem).some((l) => l === " fonte-x · error · 09:05:00"));
});

// --- rastreabilidade: problema ↔ evento da trilha pelo span_id ---
const T1 = h(9, 5);
const sp = (id: string, nome: string, s: number, o: object = {}) => ({
	traceId: "a".repeat(32),
	spanId: id,
	nome,
	tipo: "span",
	inicio: T1,
	fim: T1 + s * 1000,
	durMs: s * 1000,
	attrs: {},
	...o,
});
function criaTrilha(lista: any[], spans: any[]) {
	const t = cria(lista);
	Object.assign(t.acoes, {
		eventos: () => spans,
		resumo: () => ({ spans: spans.length, erros: 0, tokensEntrada: 0, tokensSaida: 0 }),
		saude: () => undefined,
	});
	return t;
}

test("e salta do problema para o evento com o mesmo span_id (mesmo agrupado); sem correlação fica e avisa por uma renderização", () => {
	const spans = [
		sp("t9", "turn", 9),
		sp("b3", "execute_tool bash", 8, { erro: "erro na ferramenta" }),
		sp("b2", "execute_tool bash", 7, { erro: "erro na ferramenta" }),
		sp("c1", "chat p/m", 6, { erro: "x" }),
	];
	const lista = [
		reg({ msg: "no chat", spanId: "c1" }),
		reg({ sev: 13, fonte: "tool", tipo: "bash", msg: "falhou", spanId: "b2" }),
		reg({ msg: "sem span" }),
		reg({ msg: "span antigo", spanId: "zz" }),
	];
	const { p } = criaTrilha(lista, spans);
	assert.ok(p.render(100).at(-2)!.includes("?  mais")); // e/p ficam na ajuda expandida
	p.handleInput("e");
	assert.deepEqual([p.aba, p.index], ["eventos", 2]);
	let o = p.render(100);
	assert.ok(o.find((l: string) => l.includes("❯"))!.includes("chat p/m"));
	assert.ok(o.at(-2)!.includes("enter  detalhe"));
	p.handleInput(ENTER);
	o = p.render(100);
	assert.ok(o.join("\n").includes("│ chat p/m · 09:05:06 · 6000 ms · erro · 1 problema"));
	assert.ok(o.at(-2)!.includes("enter  fechar detalhe"));
	p.handleInput("p");
	assert.deepEqual([p.aba, p.index], ["problemas", 0]);
	p.handleInput(DOWN);
	p.handleInput("e"); // b2 está dentro da linha agrupada `tool bash ×2`
	assert.deepEqual([p.aba, p.index], ["eventos", 1]);
	assert.ok(
		p
			.render(100)
			.find((l: string) => l.includes("❯"))!
			.includes("tool bash"),
	);
	p.handleInput("p");
	assert.deepEqual([p.aba, p.index], ["problemas", 1]);
	for (const i of [2, 3]) {
		p.index = i;
		p.handleInput("e");
		assert.deepEqual([p.aba, p.index], ["problemas", i]);
		o = p.render(100);
		aberta(o, 100);
		assert.ok(o.map(sem).some((l) => l.includes("sem evento correlacionado")));
		p.handleInput(UP);
		p.handleInput(DOWN);
		assert.ok(p.render(100).at(-2)!.includes("?  mais")); // a linha de dicas volta ao normal
	}
});

test("p num evento sem problema: fica e avisa; dois problemas no mesmo span contam no detalhe", () => {
	const spans = [sp("t9", "turn", 9), sp("c1", "chat p/m", 6, { erro: "x" })];
	const lista = [
		reg({ msg: "um", spanId: "c1" }),
		reg({ sev: 13, msg: "dois", spanId: "c1" }),
		reg({ sev: 9, msg: "info", spanId: "t9" }),
	];
	const { p } = criaTrilha(lista, spans);
	p.handleInput(TAB);
	assert.ok(!p.render(100).at(-2)!.includes("p  problema")); // turn só tem entrada informativa
	p.handleInput("p");
	assert.equal(p.aba, "eventos");
	assert.ok(
		p
			.render(100)
			.map(sem)
			.some((l) => l.includes("sem problema correlacionado")),
	);
	p.handleInput(DOWN);
	p.handleInput(ENTER);
	assert.ok(p.render(100).join("\n").includes("· erro · 2 problemas"));
	p.handleInput("p");
	assert.deepEqual([p.aba, p.index], ["problemas", 0]);
});
