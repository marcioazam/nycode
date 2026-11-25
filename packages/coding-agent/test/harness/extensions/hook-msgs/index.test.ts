// node --experimental-strip-types --test extensions/hook-msgs/index.test.ts
// Mensagens de hook no ritmo das tools (docs/designs/onda7-tokens/exemplos/sinais-variantes.html#hook):
// ✓ executado, ✕ erro, ▲ pede atenção/ação; sem bolinha azul.
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { visibleWidth } from "@nycode/tui";
import { afterEach, beforeEach, test, vi } from "vitest";
import * as __m1 from "../../../../src/extensions/hook-msgs/index.ts";

// The rendering reads TERM: pin it so the suite does not depend on the shell it runs in.
beforeEach(() => {
	vi.stubEnv("TERM", "xterm-256color");
});
afterEach(() => {
	vi.unstubAllEnvs();
});

process.env.NYCODE_NERD_FONT = "";
delete process.env.KITTY_WINDOW_ID;
process.env.TERM = "xterm"; // glifos Unicode, determinístico
const _tmp = mkdtempSync(join(tmpdir(), "hook-msgs-test-"));
// O fim do run desenha o cartão do Bash (ui-visual/motion/shell.ts), que puxa o resto do ui-visual e ui/a11y.ts.
const { classify, render, summarize } = __m1;

const HOOK = `[lint-hook@1] Findings may predate this session; do not treat them as regressions.

[lint-hook@1] Findings requiring review in src/a.ts (2 issue(s)):
- [low-contrast] Low contrast text.
- [cramped-padding] Cramped padding.

Triage: fix real problems; unsure, leave it with a reason.`;

const BGN: Record<string, number> = { toolSuccessBg: 42, toolErrorBg: 41, toolPendingBg: 46, customMessageBg: 47 };
const ansi = {
	fg: (_c: string, s: string) => `\x1b[33m${s}\x1b[39m`,
	bg: (c: string, s: string) => `\x1b[${BGN[c]}m${s}\x1b[49m`,
	bold: (s: string) => `\x1b[1m${s}\x1b[22m`,
};
const plain = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");
const msg = (customType: string, content: string) => ({
	role: "custom",
	customType,
	content,
	display: true,
	timestamp: 0,
});
const opts = (expanded = false) => ({ expanded, outputPad: 1, keyText: () => "ctrl+o" });

test("classify: ▲ quando o hook pede ação, ✕ quando falhou, ✓ quando só executou", () => {
	assert.equal(classify("claude-stop-hook", HOOK), "warn");
	assert.equal(classify("claude-stop-hook", "Ainda há tarefas abertas no plano."), "warn");
	assert.equal(classify("claude-stop-hook", "hook falhou: Traceback (most recent call last)"), "err");
	assert.equal(classify("claude-async-hook", "Async hook requested attention (exit 2):\nError: lint quebrou"), "err");
	assert.equal(classify("claude-async-hook", "Async hook requested attention (exit 2):\nrevisar o plano"), "warn");
	assert.equal(classify("claude-async-hook", "gate terminou: 3 checks verdes"), "ok");
});

test("summarize: texto de hook usa a primeira linha como alvo e o resto como detalhe, sem parser por fornecedor", () => {
	const s = summarize("claude-stop-hook", HOOK);
	assert.equal(s.alvo, "lint-hook · Findings may predate this session; do not treat them as regressions.");
	assert.equal(s.quando, "ao parar");
	assert.equal(s.detalhe[0], "[lint-hook@1] Findings requiring review in src/a.ts (2 issue(s)):");
	assert.ok(!s.detalhe.some((l) => l.startsWith("arquivo: ")));
	const livre = summarize("claude-stop-hook", "\n[ralph-loop] Ainda há tarefas abertas no plano.\nitem 3 de 5");
	assert.equal(livre.alvo, "ralph-loop · Ainda há tarefas abertas no plano.");
	assert.deepEqual(livre.detalhe, ["item 3 de 5"]);
	const as = summarize("claude-async-hook", "Async hook requested attention (exit 2):\nrevisar o plano");
	assert.deepEqual([as.alvo, as.quando], ["revisar o plano", "assíncrono"]);
});

test("render: caixa no fundo das tools, linhas na largura exata; aberta mostra o detalhe com │; estreito não estoura", () => {
	for (const [w, expanded] of [
		[120, false],
		[120, true],
		[30, false],
		[30, true],
	] as const) {
		const lines = render(msg("claude-stop-hook", HOOK), opts(expanded), ansi)!.render(w);
		for (const l of lines) assert.equal(visibleWidth(l), w, `${w} ${expanded}: ${JSON.stringify(plain(l))}`);
	}
	const fechada = render(msg("claude-stop-hook", HOOK), opts(), ansi)!.render(130).map(plain) as string[];
	// Faixa âmbar: antes respiro + cabeça + respiro com padding e pílulas; agora a faixa é a linha 0 e o corpo vem logo abaixo, sem fundo.
	assert.equal(fechada.length, 1);
	assert.match(fechada[0]!, /^ ⚑ hook · atenção · lint-hook · Findings may predate .* · ao parar +ctrl\+o abre $/);
	const aberta = render(msg("claude-stop-hook", HOOK), opts(true), ansi)!.render(120).map(plain) as string[];
	assert.ok(aberta.some((l) => l.startsWith("   │ - [low-contrast] Low contrast text.")));
	// o fundo acompanha o estado: ✓ verde, ✕ vermelho; ▲ cai no neutro aqui (tema de teste sem truecolor)
	const linha = (tipo: string, texto: string) => render(msg(tipo, texto), opts(), ansi)!.render(60)[0]!;
	assert.ok(
		linha("claude-async-hook", "gate terminou").startsWith("\x1b[42m") &&
			plain(linha("claude-async-hook", "gate terminou")).startsWith(" ⚑ hook · concluído · gate terminou"),
	);
	assert.ok(
		linha("claude-stop-hook", "Error: quebrou").startsWith("\x1b[41m") &&
			plain(linha("claude-stop-hook", "Error: quebrou")).startsWith(" ⚑ hook · falhou"),
	);
	assert.ok(linha("claude-stop-hook", "revisar").startsWith("\x1b[47m"));
});

const GATE =
	"Completion gate: code was edited this turn (/home/u/a/calm.mjs, /tmp/fila.mjs) and no check passed after the last edit. If this ends the task, run the relevant checks now (tests, type check, lint, build, or the gate-runner) and report their result. If the work is not finished or verification is deferred on purpose (verify-once before the commit), say so in one line and stop. This gate blocks once per turn.";

test("completion-gate: uma linha ⚑ gate · atenção com resumo em português; ctrl+o lista os arquivos e o pedido", () => {
	assert.equal(classify("completion-gate", GATE), "warn");
	const s = summarize("completion-gate", GATE);
	// Faixa âmbar: antes `conclusão · …` e quando `ao parar`; agora só o resumo.
	assert.equal(s.alvo, "2 arquivos editados, nenhum check depois");
	assert.equal(s.quando, "");
	assert.deepEqual(s.detalhe, [
		"/home/u/a/calm.mjs",
		"/tmp/fila.mjs",
		"pedido ao agente: rodar os checks e reportar, ou dizer em uma linha que a verificação fica para o commit",
	]);
	const fechada = render(msg("completion-gate", GATE), opts(), ansi)!.render(120).map(plain) as string[];
	assert.equal(fechada.length, 1);
	assert.match(fechada[0]!, /^ ⚑ gate · atenção · 2 arquivos editados, nenhum check depois +ctrl\+o abre $/);
	const um = summarize("completion-gate", GATE.replace("/home/u/a/calm.mjs, ", ""));
	assert.equal(um.alvo, "1 arquivo editado, nenhum check depois");
});

test("render: tema que falha ao pintar não derruba o nycode; cai no texto cru", () => {
	const quebrado = {
		...ansi,
		bg: () => {
			throw new Error("tema");
		},
	};
	assert.deepEqual(render(msg("claude-stop-hook", "revisar"), opts(), quebrado)!.render(40), ["revisar"]);
});

const SUB = "subagent-background";
const REL = "## Resultado\n\n**Feito**: ajustei `fila.ts` e os testes passam.\n- item 2";
const run = (estado: string, rel = REL, id = "bg-a16f1baf") =>
	`Background subagent run ${id} (swarm-worker) ${estado} after 10 turns.\n\n${rel}`;
const sub = (texto: string, expanded: boolean, w = 120) =>
	render(msg(SUB, texto), opts(expanded), ansi)!.render(w).map(plain) as string[];

test("subagent-background: done → ⇄ subagente · concluído com agente e turnos; recolhido tem UMA linha │ sem markdown", () => {
	assert.equal(classify(SUB, run("done")), "ok");
	const s = summarize(SUB, run("done"));
	assert.equal(s.alvo, "swarm-worker · 10 turnos");
	assert.equal(s.previa, "Resultado");
	const l = sub(run("done"), false);
	// Faixa âmbar: antes respiro + cabeça + respiro com padding e pílulas; agora a faixa é a linha 0 e o corpo vem logo abaixo, sem fundo.
	assert.equal(l.length, 2);
	assert.match(l[0]!, /^ ⇄ subagente · concluído · swarm-worker · 10 turnos +ctrl\+o abre $/);
	assert.match(l[1]!, /^ {3}│ Resultado +$/);
	assert.ok(!l.join("\n").includes("bg-a16f1baf"));
	assert.equal(sub(run("done", "**Feito**: `x` ok"), false)[1]!.trim(), "│ Feito: x ok");
	assert.match(sub(run("done").replace("10 turns", "1 turn"), false)[0]!, /· 1 turno /);
	assert.match(sub(run("done").replace("10 turns.", "10 turns in 6 min."), false)[0]!, /· 10 turnos · 6 min /);
});

test("subagent-background: expandido mostra o id e o relatório completo nas linhas │, com quebra", () => {
	const l = sub(run("done"), true);
	// Faixa âmbar: antes respiro + cabeça + respiro com padding e pílulas; agora a faixa é a linha 0 e o corpo vem logo abaixo, sem fundo.
	assert.match(l[0]!, / +ctrl\+o fecha $/);
	assert.match(l[1]!, /^ {3}│ run bg-a16f1baf +$/);
	assert.ok(l.some((x) => x.startsWith("   │ **Feito**: ajustei `fila.ts`")));
	assert.ok(l.some((x) => x.startsWith("   │ - item 2")));
	const longo = sub(run("done", "palavra ".repeat(40)), true, 50);
	assert.ok(longo.filter((x) => x.startsWith("   │ palavra")).length > 1);
	for (const x of longo) assert.equal(x.length, 50);
});

test("subagent-background: falha ✕, cancelado ▲, vários runs, chamada destacada", () => {
	assert.equal(classify(SUB, run("failed")), "err");
	assert.equal(classify(SUB, run("timeout")), "err");
	assert.equal(classify(SUB, run("cancelled")), "warn");
	assert.match(sub(run("failed"), false)[0]!, /^ ⇄ subagente · falhou/);
	assert.match(sub(run("cancelled"), false)[0]!, /^ ⇄ subagente · atenção/);
	const dois = `${run("done", "a", "bg-1")}\n\n${run("failed", "b", "bg-2").replace("swarm-worker", "Explore")}`;
	assert.equal(classify(SUB, dois), "warn"); // uns ok e outros com erro = aviso; todos com erro = ✕
	assert.equal(classify(SUB, dois.replace(") done", ") failed")), "err");
	assert.equal(summarize(SUB, dois).alvo, "2 runs · swarm-worker, Explore");
	assert.deepEqual(summarize(SUB, dois).detalhe.slice(0, 2), ["run bg-1 · swarm-worker", "run bg-2 · Explore"]);
	const call = "Background subagent call finished (started in the background):\n\nrelatório x";
	assert.equal(classify(SUB, call), "ok");
	assert.equal(classify(SUB, "Subagent call failed: boom"), "err");
	assert.equal(summarize(SUB, call).alvo, "chamada em segundo plano");
	assert.equal(summarize(SUB, call).previa, "relatório x");
});

test("subagent-background: relatório vazio não gera linha de prévia; largura estreita não estoura", () => {
	for (const vazio of ["", "(no output)"]) {
		const l = sub(run("done", vazio), false);
		assert.equal(l.length, 1); // só a faixa (antes respiro, cabeça, respiro)
		assert.equal(
			l.some((x) => x.includes("│")),
			false,
		);
		assert.equal(sub(run("done", vazio), true).filter((x) => x.includes("│")).length, 1); // só o id
	}
	for (const [w, e] of [
		[120, false],
		[120, true],
		[30, false],
		[30, true],
		[8, false],
	] as const)
		for (const x of sub(run("done", "texto bem comprido ".repeat(10)), e, w)) assert.equal(x.length, w, `${w} ${e}`);
});

test("subagent-background: tipos antigos seguem iguais e o texto cru vem se o desenho falhar", () => {
	assert.equal(classify("claude-stop-hook", "Ainda há tarefas abertas no plano."), "warn");
	assert.equal(summarize("claude-async-hook", "x").previa, undefined);
	assert.match(
		render(msg("claude-stop-hook", "revisar"), opts(), ansi)!.render(60).map(plain)[0]!,
		/^ ⚑ hook · atenção · revisar · ao parar *$/,
	);
	const quebrado = {
		...ansi,
		bg: () => {
			throw new Error("tema");
		},
	};
	assert.deepEqual(render(msg(SUB, "x"), opts(), quebrado)!.render(40), ["x"]);
});

// Toda linha de sinal mostra a hora em que aconteceu, à direita, separada do atalho.
const plain2 = (rows: string[]) => rows.map(plain);
test("hora (Solução 2): hook, gate e subagente mostram atalho + HH:MM juntos no cabeçalho; sem timestamp mostra só o atalho", () => {
	const T = new Date(2026, 10, 14, 14, 15, 0).getTime();
	// Faixa âmbar: antes atalho e hora em pílulas separadas por 2 espaços; agora `atalho · hora`.
	const linha = (m: any) => plain(render(m, opts(), ansi).render(120)[0]!);
	assert.match(
		linha({ ...msg("claude-stop-hook", "Ainda há tarefas abertas no plano."), timestamp: T }),
		/ · ao parar +14:15 $/,
	);
	const sub = plain2(
		render(
			{
				...msg("subagent-background", "Background subagent run bg-1 (swarm-worker) done after 3 turns.\n\nFeito."),
				timestamp: T,
			},
			opts(),
			ansi,
		).render(120),
	);
	assert.match(sub[0]!, / +ctrl\+o abre · 14:15 $/);
	assert.match(sub[1]!, /^ {3}│ Feito\. +$/);
	assert.doesNotMatch(linha(msg("claude-stop-hook", "Ainda há tarefas abertas no plano.")), /\d\d:\d\d/);
});

// Lote em segundo plano segue o padrão de estado: todos ok = ✓, parte falhou = ▲, todos falharam = ✕.
test("subagent-background: lote paralelo mostra contagem em português e o estado agregado", () => {
	const lote = (ok: number, n: number, corpo: string) =>
		`Background subagent call finished (started in the background):\n\nParallel: ${ok}/${n} succeeded\n\n${corpo}`;
	const todos = lote(
		2,
		2,
		"[perplexity-scout] completed: Status: complete.\n\n[web-scout] completed: **Status: ok.**",
	);
	assert.equal(classify(SUB, todos), "ok");
	assert.equal(summarize(SUB, todos).alvo, "paralelo · 2 de 2 concluídos");
	assert.equal(summarize(SUB, todos).previa, "perplexity-scout: Status: complete.");
	const misto = lote(1, 2, "[a] completed: feito\n\n[b] failed: estourou o limite");
	assert.equal(classify(SUB, misto), "warn");
	assert.equal(summarize(SUB, misto).alvo, "paralelo · 1 de 2 concluídos · 1 falhou");
	assert.match(sub(misto, false)[0]!, /^ ⇄ subagente · atenção/);
	assert.equal(summarize(SUB, misto).previa, "b: estourou o limite"); // a prévia mostra primeiro o que falhou
	assert.equal(classify(SUB, lote(0, 2, "[a] failed: x\n\n[b] failed: y")), "err");
});

test("fundo: depois de um reset no meio da linha o fundo do estado é reaberto até o fim", () => {
	const longo = `Background subagent run bg-1 (swarm-worker) done after 3 turns.\n\n${"palavra ".repeat(40)}`;
	// Faixa âmbar: antes a prévia ficava no fundo; agora só a faixa tem fundo, então o reset é o do corte dela.
	const faixa = render({ ...msg("subagent-background", longo), timestamp: 1 }, opts(), ansi).render(30)[0]!;
	assert.ok(plain(faixa).includes("…"));
	assert.ok([...faixa.matchAll(/\x1b\[0?m/g)].length > 0);
	for (const m of faixa.matchAll(/\x1b\[0?m/g))
		assert.ok(faixa.slice(m.index! + m[0].length).startsWith("\x1b[42m"), "reset sem reabrir o fundo");
});

// Fim do run = o cartão do Bash: antes caixa própria com fundo verde/vermelho de ponta a ponta,
// `▶ run · terminou nome`, hora em pílula e saída numa barra │; agora o mesmo cartão, efeitos e rodapé do Bash
// (trilho ▎, título régua `Bash ─ nome ──── hora`, últimas 5 linhas, rodapé `OK`/`Erro N`, dissolver na chegada).
test("run-finished: mesmo cartão do Bash, com título régua, prévia de 5 linhas e rodapé de desfecho", () => {
	const log = `${process.env.HOME}/.local/state/nycode-runs/r9bqk2.log`;
	const saida = [
		"rc=0",
		"SLICE          STEP                 EXIT  SECONDS",
		"repo-policy    repository-policy       0      148",
		"repo-policy    (slice wall incl. clone) -     150",
		"CHECK=pass",
		"fim",
		"ultima",
	];
	const texto = (estado: string) =>
		`Run terminou:\nr9bqk2 [shell] ${estado} · 02:30 · gw-repopol · aguardado · log ${log}\n${saida.join("\n")}`;
	assert.equal(classify("run-finished", texto("done exit 0")), "ok");
	assert.equal(classify("run-finished", texto("failed exit 1")), "err");
	assert.equal(classify("run-finished", texto("stopped sinal SIGINT")), "warn");
	const fechado = render({ ...msg("run-finished", texto("done exit 0")), timestamp: 1 }, opts(), ansi).render(110);
	const t = fechado.map((l: string) => plain(l).trimEnd());
	assert.equal(t[0], "▎");
	// antes `Bash ─ gw-repopol ──── hora` e rodapé `OK · 2:30 · …`; agora `Bash · OK · nome   hora` e o rodapé sem o estado.
	assert.match(t[1]!, /^▎ \S+ Bash · OK · gw-repopol +\d\d:\d\d$/);
	assert.deepEqual(
		t.slice(2, 7),
		saida.slice(2).map((l) => `▎   ${l}`.trimEnd()),
	);
	assert.equal(t[7], "▎");
	assert.equal(t[8], "▎   2:30 · 7 linhas · 2 acima · ctrl+o abre · log ~/.local/state/nycode-runs/r9bqk2.log");
	assert.equal(t.length, 10);
	assert.ok(
		fechado.every((l: string) => l.startsWith("\x1b[47m") && [...plain(l)].length === 110),
		"fundo neutro na largura",
	);
	assert.ok(!t.join("\n").includes("Run terminou:") && !t.join("\n").includes("[shell]"));
	const aberto = render({ ...msg("run-finished", texto("failed exit 1")), timestamp: 1 }, opts(true), ansi).render(
		110,
	);
	const a = aberto.map((l: string) => plain(l).trimEnd());
	assert.equal(a[2], "▎   rc=0");
	// antes o rodapé aberto começava por `Erro · 2:30 · …`; o estado foi para o título.
	assert.match(a[1]!, /Bash · Erro · /);
	assert.ok(a.at(-2)!.startsWith("▎   2:30 · 7 linhas · ctrl+o fecha"), a.at(-2));
	assert.ok(
		aberto.every((l: string) => l.startsWith("\x1b[41m")),
		"erro no fundo de erro",
	);
	const parado = render(msg("run-finished", texto("stopped sinal SIGINT")), opts(), ansi)
		.render(110)
		.map((l: string) => plain(l).trimEnd());
	assert.match(parado[1]!, /Bash · interrompido · /);
	assert.ok(parado.at(-2)!.startsWith("▎   2:30"), parado.at(-2));
	const dois = render(msg("run-finished", texto("failed exit 2")), opts(), ansi)
		.render(110)
		.map((l: string) => plain(l).trimEnd());
	assert.match(dois[1]!, /Bash · Erro 2 · /);
	assert.ok(dois.at(-2)!.startsWith("▎   2:30 · "), dois.at(-2));
	const vazio = render(
		msg("run-finished", "Run terminou:\nr1 [shell] done exit 0 · 00:02 · x\n(sem output)"),
		opts(),
		ansi,
	)
		.render(80)
		.map((l: string) => plain(l).trimEnd());
	assert.deepEqual(vazio.slice(2), ["▎   0:02", "▎"]);
	assert.ok(
		render(msg("run-finished", "qualquer coisa"), opts(), ansi)
			.render(80)
			.some((l: string) => plain(l).includes("qualquer coisa")),
	);
});

test("run-finished: chegando agora dissolve como o Bash; do histórico já vem assentado", async () => {
	const RGB: Record<string, string> = {
		customMessageBg: "40;42;54",
		toolErrorBg: "70;30;34",
		success: "120;200;120",
		accent: "120;160;240",
		dim: "90;90;110",
		error: "230;90;90",
		muted: "150;150;170",
	};
	const rgb = {
		...ansi,
		getBgAnsi: (c: string) => `\x1b[48;2;${RGB[c] ?? "1;1;1"}m`,
		getFgAnsi: (c: string) => `\x1b[38;2;${RGB[c] ?? "200;200;200"}m`,
	};
	const texto = "Run terminou:\nrnovo [shell] done exit 0 · 00:05 · agora\nok";
	const fundo = (l: string) => /\x1b\[48;2;([\d;]+)m/.exec(l)?.[1];
	const novo = render({ ...msg("run-finished", texto), timestamp: Date.now() }, opts(), rgb);
	await new Promise((r) => setTimeout(r, 250));
	const meio = fundo(novo.render(80)[1]!);
	assert.notEqual(meio, RGB.customMessageBg, `no meio do dissolver o fundo brilha: ${meio}`);
	await new Promise((r) => setTimeout(r, 450));
	assert.equal(fundo(novo.render(80)[1]!), RGB.customMessageBg, "assentado no neutro");
	const velho = render(
		{ ...msg("run-finished", texto.replace("rnovo", "rvelho")), timestamp: Date.now() - 60_000 },
		opts(),
		rgb,
	);
	assert.equal(fundo(velho.render(80)[1]!), RGB.customMessageBg, "histórico sem animação");
});

test("atalho: a tecla usa accent e o verbo dim", () => {
	const marca = { ...ansi, fg: (c: string, s: string) => `<${c}>${s}</${c}>` };
	const l = render(msg("completion-gate", GATE), opts(), marca)!.render(140).join("\n");
	assert.ok(l.includes("<accent>ctrl+o</accent><dim> abre</dim>"), l);
});

test("gate (Solução 2): atalho + hora no cabeçalho; clique esquerdo abre e fecha; sem detalhe o clique não é consumido", () => {
	const c = render(
		{ ...msg("completion-gate", GATE), timestamp: new Date(2026, 10, 14, 16, 37).getTime() },
		opts(),
		ansi,
	)!;
	const ver = () => c.render(120).map(plain) as string[];
	// Faixa âmbar: antes respiro + cabeça + respiro com padding e pílulas; agora a faixa é a linha 0 e o corpo vem logo abaixo, sem fundo.
	assert.equal(ver().length, 1);
	assert.match(ver()[0]!, /^ ⚑ gate · atenção · 2 arquivos editados, nenhum check depois +ctrl\+o abre · 16:37 $/);
	assert.ok(ver().every((l) => l.length === 120));
	const clique = { type: "click", button: "left", x: 3, y: 1 };
	assert.deepEqual(c.handleMouse(clique), { handled: true });
	assert.match(ver()[0]!, /ctrl\+o fecha · 16:37 $/);
	assert.ok(ver().some((l) => l.includes("│ /tmp/fila.mjs")));
	assert.deepEqual(c.handleMouse(clique), { handled: true });
	assert.equal(ver().length, 1);
	assert.equal(c.handleMouse({ ...clique, button: "right" }), undefined);
	assert.equal(c.handleMouse({ ...clique, type: "move" }), undefined);
	const g = render(msg("completion-gate", GATE), opts(true), ansi)!;
	g.handleMouse(clique);
	assert.equal(g.render(120).length, 1);
	assert.equal(render(msg("claude-async-hook", "gate terminou"), opts(), ansi)!.handleMouse(clique), undefined);
});

// Faixa âmbar + "Nasce do fundo" (lab /gate): chegando agora, a faixa sobe do fundo em
// 450 ms; do histórico (ou sem hora) vem assentada. O fundo é o do estado, sem linhas em branco em volta.
test("faixa: chegando agora nasce do fundo; do histórico vem assentada", () => {
	const RGB: Record<string, string> = { customMessageBg: "40;42;54", text: "220;220;230", warning: "230;180;80" };
	const rgb = {
		...ansi,
		fg: (c: string, s: string) => `\x1b[38;2;${RGB[c] ?? "200;200;200"}m${s}\x1b[39m`,
		getBgAnsi: (c: string) => `\x1b[48;2;${RGB[c] ?? "1;1;1"}m`,
		getFgAnsi: (c: string) => `\x1b[38;2;${RGB[c] ?? "200;200;200"}m`,
	};
	const amb = { NO_COLOR: process.env.NO_COLOR, NYCODE_REDUCED_MOTION: process.env.NYCODE_REDUCED_MOTION };
	delete process.env.NO_COLOR;
	delete process.env.NYCODE_REDUCED_MOTION;
	try {
		const cor = (l: string) => /\x1b\[38;2;([\d;]+)m/.exec(l)?.[1];
		const novo = render({ ...msg("completion-gate", GATE), timestamp: Date.now() - 100 }, opts(), rgb).render(
			120,
		)[0]!;
		assert.notEqual(cor(novo), RGB.warning, `no começo a cor do ícone ainda vem do fundo: ${cor(novo)}`);
		const velho = render({ ...msg("completion-gate", GATE), timestamp: Date.now() - 60_000 }, opts(), rgb).render(
			120,
		);
		assert.equal(cor(velho[0]!), RGB.warning, "assentada: ícone na cor do estado");
		assert.equal(velho.length, 1);
	} finally {
		for (const [k, v] of Object.entries(amb)) if (v !== undefined) process.env[k] = v;
	}
});
