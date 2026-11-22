// node --experimental-strip-types --test extensions/diagnostico/test/obs/detector.test.ts
import assert from "node:assert/strict";
import { afterEach, beforeEach, test, vi } from "vitest";
import {
	criarDetector,
	criarGuardaLaco,
	criarTrilha,
	type Deteccao,
	LIMITES_PADRAO,
	lerLimiteLaco,
	lerLimites,
	type Span,
} from "../../../../../src/extensions/diagnostico/observabilidade/trilha.ts";

// The rendering reads TERM: pin it so the suite does not depend on the shell it runs in.
beforeEach(() => {
	vi.stubEnv("TERM", "xterm-256color");
});
afterEach(() => {
	vi.unstubAllEnvs();
});

let seq = 0;
const span = (o: Partial<Span> = {}): Span => ({
	traceId: "a".repeat(32),
	spanId: `s${++seq}`,
	nome: "execute_tool bash",
	tipo: "span",
	inicio: 0,
	fim: 10,
	durMs: 10,
	attrs: {},
	...o,
});
const hook = (durMs: number, evento = "Stop", comando = "/x/y/lento.sh --a b") =>
	span({
		nome: `nycode.hook ${evento}`,
		tipo: "evento",
		durMs: 0,
		attrs: { "nycode.hook.command": comando, "nycode.hook.duration_ms": durMs, "nycode.hook.exit_code": 0 },
	});
const chat = (o: Partial<Span> = {}) => span({ nome: "chat p/m", ...o });

function cria(limites: object = {}) {
	let t = 1_000_000;
	const vistos: Deteccao[] = [];
	const d = criarDetector({ agora: () => t, limites, relatar: (x) => vistos.push(x) });
	return {
		d,
		vistos,
		avanca: (ms: number) => {
			t += ms;
			return t;
		},
		agora: () => t,
		msgs: () => vistos.map((v) => [v.regra, v.sev, v.msg]),
	};
}

test("lerLimites: padrões, valores válidos, 0 e inválidos", () => {
	assert.deepEqual(lerLimites({}), LIMITES_PADRAO);
	assert.deepEqual(LIMITES_PADRAO, { hookLentoMs: 2000, modeloLentoMs: 120000, toolTravadaMs: 600000 });
	assert.deepEqual(
		lerLimites({
			NYCODE_DIAG_HOOK_LENTO_MS: "500",
			NYCODE_DIAG_MODELO_LENTO_MS: " 30000 ",
			NYCODE_DIAG_TOOL_TRAVADA_MS: "0",
		}),
		{ hookLentoMs: 500, modeloLentoMs: 30000, toolTravadaMs: 0 },
	);
	for (const lixo of ["abc", "-5", "1.5", "", "1e3", "12ms", "NaN", "Infinity"])
		assert.deepEqual(
			lerLimites({
				NYCODE_DIAG_HOOK_LENTO_MS: lixo,
				NYCODE_DIAG_MODELO_LENTO_MS: lixo,
				NYCODE_DIAG_TOOL_TRAVADA_MS: lixo,
			}),
			LIMITES_PADRAO,
			lixo,
		);
});

test("hook-lento: no limite avisa uma vez por evento+comando; abaixo não", () => {
	const t = cria();
	t.d.aoFechar(hook(1999));
	assert.deepEqual(t.vistos, []);
	t.d.aoFechar(hook(2000));
	t.d.aoFechar(hook(9000)); // mesma chave
	assert.deepEqual(t.msgs(), [["hook-lento", 13, "hook Stop · lento.sh levou 2000 ms"]]);
	t.d.aoFechar(hook(2500, "PreToolUse"));
	t.d.aoFechar(hook(2600, "Stop", "outro.py"));
	assert.deepEqual(t.msgs().slice(1), [
		["hook-lento", 13, "hook PreToolUse · lento.sh levou 2500 ms"],
		["hook-lento", 13, "hook Stop · outro.py levou 2600 ms"],
	]);
	assert.equal(new Set((t.vistos as Deteccao[]).map((v) => v.chave)).size, 3);
});

test("hook-lento: limite próprio e 0 desliga", () => {
	const a = cria({ hookLentoMs: 100 });
	a.d.aoFechar(hook(100));
	assert.equal(a.vistos.length, 1);
	const b = cria({ hookLentoMs: 0 });
	b.d.aoFechar(hook(999_999));
	assert.deepEqual(b.vistos, []);
});

test("modelo-lento: chat no limite avisa uma vez por modelo; 0 desliga", () => {
	const t = cria();
	t.d.aoFechar(chat({ durMs: 119_999 }));
	assert.deepEqual(t.vistos, []);
	const lento = chat({ durMs: 130_000 });
	t.d.aoFechar(lento);
	t.d.aoFechar(chat({ durMs: 500_000 }));
	assert.deepEqual(t.msgs(), [["modelo-lento", 13, "modelo p/m levou 130 s"]]);
	assert.equal((t.vistos as Deteccao[])[0]!.spanId, lento.spanId);
	t.d.aoFechar(chat({ nome: "chat p/outro", durMs: 120_000 }));
	assert.equal(t.vistos.length, 2);
	const off = cria({ modeloLentoMs: 0 });
	off.d.aoFechar(chat({ durMs: 999_999 }));
	assert.deepEqual(off.vistos, []);
});

test("tool-em-laco: 3 erros seguidos da mesma tool; sucesso zera e rearma", () => {
	const t = cria();
	const erro = (nome = "bash") => t.d.aoFechar(span({ nome: `execute_tool ${nome}`, erro: "erro na ferramenta" }));
	const ok = (nome = "bash") => t.d.aoFechar(span({ nome: `execute_tool ${nome}` }));
	erro();
	erro();
	ok();
	erro();
	erro();
	assert.deepEqual(t.vistos, []); // o sucesso no meio zerou
	erro("read"); // outra tool não conta
	erro();
	assert.deepEqual(t.msgs(), [["tool-em-laco", 13, "tool bash falhou 3 vezes seguidas"]]);
	erro();
	erro();
	erro();
	assert.equal(t.vistos.length, 1); // uma vez por chave enquanto não houver sucesso
	ok();
	erro();
	erro();
	erro();
	assert.equal(t.vistos.length, 2); // rearmou
});

test("erros-de-modelo: 3 chats com erro em 5 min, sev 17, uma vez", () => {
	const t = cria();
	const falha = () => t.d.aoFechar(chat({ erro: "529" }));
	falha();
	t.avanca(4 * 60_000);
	falha();
	t.avanca(2 * 60_000); // o primeiro saiu da janela
	falha();
	assert.deepEqual(t.vistos, []);
	t.avanca(60_000);
	falha();
	assert.deepEqual(t.msgs(), [["erros-de-modelo", 17, "3 chamadas de modelo falharam em 5 min"]]);
	falha();
	falha();
	falha();
	assert.equal(t.vistos.length, 1);
	const s = cria();
	s.d.aoFechar(chat());
	s.d.aoFechar(chat());
	s.d.aoFechar(chat()); // sucesso não conta
	assert.deepEqual(s.vistos, []);
});

test("tool-travada: tool aberta além do limite, uma vez por span; outros spans e 0 não", () => {
	const t = cria();
	// bash, não subagent: o subagent em primeiro plano é longo por natureza e não alerta (D12, docs/sync-observabilidade.md).
	const aberta = span({ nome: "execute_tool bash", inicio: t.agora(), fim: undefined, durMs: undefined });
	const turno = span({ nome: "turn", inicio: t.agora(), fim: undefined, durMs: undefined });
	t.avanca(599_999);
	t.d.verificarAbertos([aberta, turno]);
	assert.deepEqual(t.vistos, []);
	t.avanca(60_001);
	t.d.verificarAbertos([aberta, turno]);
	t.avanca(600_000);
	t.d.verificarAbertos([aberta, turno]);
	assert.deepEqual(t.msgs(), [["tool-travada", 13, "tool bash rodando há 11 min"]]);
	assert.equal((t.vistos as Deteccao[])[0]!.spanId, aberta.spanId);
	const off = cria({ toolTravadaMs: 0 });
	off.avanca(9_999_999);
	off.d.verificarAbertos([span({ inicio: 0, fim: undefined })]);
	assert.deepEqual(off.vistos, []);
});

test("tool-travada: question (espera o usuário) não alerta; bash aberto há 11 min alerta", () => {
	const t = cria();
	const aberta = (nome: string) =>
		span({ nome: `execute_tool ${nome}`, inicio: t.agora(), fim: undefined, durMs: undefined });
	const q = aberta("question");
	const b = aberta("bash");
	t.avanca(11 * 60_000);
	t.d.verificarAbertos([q]);
	assert.deepEqual(t.vistos, []);
	t.d.verificarAbertos([q, b]);
	assert.deepEqual(t.msgs(), [["tool-travada", 13, "tool bash rodando há 11 min"]]);
});

test("tool-travada D12: subagent em primeiro plano (longo e legítimo) não alerta, nem aos 11 nem aos 60 min; bash continua alertando", () => {
	const t = cria();
	const aberta = (nome: string) =>
		span({ nome: `execute_tool ${nome}`, inicio: t.agora(), fim: undefined, durMs: undefined });
	const sub = aberta("subagent");
	const b = aberta("bash");
	t.avanca(11 * 60_000);
	t.d.verificarAbertos([sub]);
	t.avanca(49 * 60_000);
	t.d.verificarAbertos([sub]);
	assert.deepEqual(t.vistos, []);
	t.d.verificarAbertos([sub, b]);
	assert.deepEqual(t.msgs(), [["tool-travada", 13, "tool bash rodando há 60 min"]]);
});

test("relatar que lança não propaga; spans estranhos são ignorados", () => {
	const d = criarDetector({
		agora: () => 1,
		relatar: () => {
			throw new Error("x");
		},
	});
	assert.doesNotThrow(() => d.aoFechar(hook(5000)));
	const t = cria();
	t.d.aoFechar(span({ nome: "turn", durMs: 999_999 }));
	t.d.aoFechar(span({ nome: "nycode.hook Stop", tipo: "evento", attrs: {} }));
	assert.deepEqual(t.vistos, []);
});

test("trilha.abertos(): spans ainda abertos, do mais antigo ao mais novo", () => {
	const tr = criarTrilha({ agora: () => 5 });
	const a = tr.abrir("execute_tool bash");
	const b = tr.abrir("turn");
	assert.deepEqual(
		tr.abertos().map((s) => s.spanId),
		[tr.raizId, a, b],
	);
	tr.fechar(a);
	assert.deepEqual(
		tr.abertos().map((s) => s.nome),
		["nycode", "turn"],
	);
});

test("L9: lerLimiteLaco: padrão 6, 0 desliga, inválido cai no padrão", () => {
	assert.equal(lerLimiteLaco({}), 6);
	assert.equal(lerLimiteLaco({ NYCODE_DIAG_TOOL_LACO_BLOQUEIO: "4" }), 4);
	assert.equal(lerLimiteLaco({ NYCODE_DIAG_TOOL_LACO_BLOQUEIO: "0" }), 0);
	for (const x of ["abc", "-1", "1.5", ""]) assert.equal(lerLimiteLaco({ NYCODE_DIAG_TOOL_LACO_BLOQUEIO: x }), 6, x);
});

test("L9: guarda de laço bloqueia a chamada idêntica depois de N resultados vistos; entrada diferente zera", () => {
	const g = criarGuardaLaco(3);
	const rodar = (id: string, nome: string, input: unknown) => {
		const r = g.aoChamar(id, nome, input);
		if (r === undefined) g.aoResultado(id);
		return r;
	};
	assert.equal(rodar("1", "bash", { command: "ls", timeout: 5 }), undefined);
	assert.equal(rodar("2", "bash", { timeout: 5, command: "ls" }), undefined); // ordem das chaves não importa
	assert.equal(rodar("3", "bash", { command: "ls", timeout: 5 }), undefined);
	const motivo = rodar("4", "bash", { command: "ls", timeout: 5 });
	assert.match(motivo ?? "", /bash.*3.*(abordagem|diferente)/i);
	assert.ok(rodar("5", "bash", { command: "ls", timeout: 5 })); // segue bloqueada
	assert.equal(rodar("6", "bash", { command: "pwd" }), undefined); // entrada diferente zera
	assert.equal(rodar("7", "bash", { command: "ls", timeout: 5 }), undefined);
	assert.equal(rodar("8", "read", { command: "ls", timeout: 5 }), undefined); // outra tool zera
});

test("L9: mesma entrada com resultado que muda (polling) não bloqueia; resultado repetido volta a contar", () => {
	const g = criarGuardaLaco(3);
	const rodar = (id: string, resultado: unknown) => {
		const r = g.aoChamar(id, "bash", { command: "git status" });
		if (r === undefined) g.aoResultado(id, resultado);
		return r;
	};
	for (let i = 0; i < 10; i++) assert.equal(rodar(`s${i}`, { text: `linha ${i}` }), undefined, `poll ${i}`);
	for (let i = 0; i < 3; i++) assert.equal(rodar(`r${i}`, { text: "igual" }), undefined);
	assert.ok(rodar("r3", { text: "igual" }), "3 resultados idênticos seguidos bloqueiam a 4ª");
});

test("L9: chamada sem resultado visto não conta; limite 0 desliga", () => {
	const g = criarGuardaLaco(2);
	for (let i = 0; i < 5; i++) assert.equal(g.aoChamar(`p${i}`, "bash", { c: 1 }), undefined); // nenhum resultado chegou
	const off = criarGuardaLaco(0);
	for (let i = 0; i < 20; i++) {
		assert.equal(off.aoChamar(`o${i}`, "bash", { c: 1 }), undefined);
		off.aoResultado(`o${i}`);
	}
});
