// node --experimental-strip-types --test extensions/ui-visual/test/tools/shell.test.ts
// Variante 04 "Trilho de status": o bash inteiro é um cartão desenhado por renderCall (motion/shell.ts);
// renderResult só entrega a saída ao estado. Execução 5 (barra indeterminada) e transição C (dissolver) só são testadas
// no estado assentado: o laboratório de movimento mede a cadência; aqui nada depende de relógio ou de timer.
import assert from "node:assert/strict";
import { afterEach, beforeEach, test, vi } from "vitest";
import * as __m4 from "../../../../../../src/extensions/ui-visual/icons.ts";
import * as __m3 from "../../../../../../src/extensions/ui-visual/motion/shell.ts";
import * as __m1 from "../../../../../../src/extensions/ui-visual/motion/vivo.ts";
import {
	ansiPlain,
	ctx,
	icon,
	mod,
	plain,
	reguaRun,
	result,
	semRespiro,
	theme,
	visibleWidth,
	wrapped,
} from "../base.ts";

// The animations read TERM: pin it so the suite does not depend on the shell it runs in.
beforeEach(() => {
	vi.stubEnv("TERM", "xterm-256color");
});
afterEach(() => {
	vi.unstubAllEnvs();
});

delete process.env.NO_COLOR; // anima() é falso com NO_COLOR; o teste da barra precisa dele ligado
const vivo = __m1;
const _shell = __m3;
const { iconGap } = __m4;
// Régua Run: antes `$ comando` e hora à direita; agora `<ícone> Run ─ comando ───── hora` e corpo/rodapé recuados até o `Run`.
// O prefixo vem de icon('bash') e iconGap() da cópia tmp (base.ts fixa o terminal), sem depender de TERM.
const G = iconGap();
const P = `▎ ${" ".repeat(1 + G.length)}`; // corpo e rodapé: trilho + recuo até o `Run`
const regua = (cmd: string, hora = "", w = 80, estado = "OK") => reguaRun(icon("bash"), G, cmd, hora, w, estado);

type Args = Record<string, unknown>;
const T = new Date(2026, 10, 14, 9, 41, 30).getTime();
let n = 0;
const id = () => `sh-${n++}`;
const txt = (rows: string[]) => rows.map((l) => plain(l).trimEnd());
// Chamada + resultado com o mesmo contexto (como o nycode faz): o cartão lê a saída de context.state no desenho.
const draw = (args: Args, texto?: string, c: Record<string, unknown> = {}, th: any = ansiPlain, w = 80) => {
	const w0 = wrapped("bash");
	const shared = ctx({ args, ...c });
	const call = w0.renderCall(args, th, shared);
	const res =
		texto === undefined
			? undefined
			: w0.renderResult(
					result(texto),
					{ expanded: c.expanded === true, isPartial: c.isPartial === true },
					th,
					shared,
				);
	return { call, res, shared, rows: call.render(w) };
};
const lines = (args: Args, texto?: string, c: Record<string, unknown> = {}) =>
	txt(semRespiro(draw(args, texto, c).rows));
const nums = (k: number) => Array.from({ length: k }, (_, i) => `o${i}`).join("\n");

test("título: `Bash · OK · comando` (1ª linha; … se multilinha); `…` sem comando pronto", () => {
	// Marcas SGR de largura zero por token (as tags `<cor>` do `theme` contam como colunas no corte do título).
	const CODS: Record<string, number> = {
		success: 32,
		warning: 33,
		error: 31,
		accent: 34,
		dim: 90,
		toolTitle: 97,
		muted: 37,
	};
	const fgm = (c: string, t: string) => `\x1b[${CODS[c] ?? 39}m${t}\x1b[39m`;
	const _marcas = { fg: fgm, bold: (t: string) => t };
	// Título sem régua: antes `Bash ─ ls -la ─────` e rodapé `OK`; agora o estado vem após o nome e o rodapé vazio some.
	assert.deepEqual(lines({ command: "ls -la" }), [regua("ls -la")]);
	assert.deepEqual(lines({ command: "echo a\necho b" }), [regua("echo a…")]);
	assert.deepEqual(lines({}), [regua("…")]);
	// args ainda não prontos (streaming): `Run ─ …` com o … em muted
	const streaming = draw({ command: "ls" }, undefined, { argsComplete: false, isPartial: true });
	assert.equal(txt(semRespiro(streaming.rows))[0], regua("…", "", 80, "executando"));
	assert.ok(streaming.rows[1].includes("\x1b[2m…"));
});

test("hora: à direita do título só depois do fim", () => {
	const branch = [{ type: "message", message: { role: "toolResult", toolCallId: "sh-hora", timestamp: T } }];
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
	on.session_start({}, { sessionManager: { getBranch: () => branch } });
	const w = resolver("bash", () => ({}));
	const t = (c: Record<string, unknown>) =>
		txt(
			semRespiro(
				w
					.renderCall({ command: "ls" }, ansiPlain, ctx({ args: { command: "ls" }, toolCallId: "sh-hora", ...c }))
					.render(80),
			),
		);
	const fim = t({});
	// antes a régua `─` preenchia até a hora; agora espaços, mesma coluna.
	assert.equal(fim[0], regua("ls", "09:41"));
	// antes 72 - 1 (cartão de no máximo 72); agora 80 - 1 (largura inteira, menos 1 de respiro)
	assert.equal(
		[...fim[0]].length,
		80 - 1,
		"a hora fecha na borda direita do cartão (w, menos 1 de respiro; sem margem)",
	);
	assert.equal(t({ isError: true })[0].slice(-5), "09:41", "erro também mostra a hora");
	assert.doesNotMatch(t({ isPartial: true })[0], /\d\d:\d\d$/, "rodando: sem hora");
	assert.doesNotMatch(t({ isPartial: true, executionStarted: false })[0], /\d\d:\d\d$/, "preparando: sem hora");
});

// Título sem régua: `<ícone> Bash · ESTADO · comando` + espaços + hora; estado colorido logo após o nome.
// Marcas SGR de largura zero por token (as tags `<cor>` do `theme` contam como colunas no corte do título).
const CODS: Record<string, number> = {
	success: 32,
	warning: 33,
	error: 31,
	accent: 34,
	dim: 90,
	toolTitle: 97,
	muted: 37,
};
const fgm = (c: string, t: string) => `\x1b[${CODS[c] ?? 39}m${t}\x1b[39m`;
const marcas = { fg: fgm, bold: (t: string) => t };
test("título: sem `─`, estado após o Bash na cor do token e separadores `·` dim", () => {
	const casos: Array<[string, Record<string, unknown>, string | undefined, string, string]> = [
		["OK", {}, "a", "OK", "success"],
		["aviso", {}, "warning: a", "OK · 1 aviso", "warning"],
		["erro", { isError: true }, "a\n\nCommand exited with code 2", "Erro 2", "error"],
		["rodando", { isPartial: true }, undefined, "executando", "accent"],
		["prep", { isPartial: true, executionStarted: false }, undefined, "recebendo", "dim"],
	];
	for (const [nome, c, texto, est, token] of casos) {
		const bruto = draw({ command: "ls" }, texto, c, marcas).rows[1]!;
		const sem = plain(bruto);
		assert.doesNotMatch(sem.slice(2), /─/, `${nome}: sem régua no título`);
		assert.match(sem, new RegExp(`Bash · ${est} · ls`), nome);
		assert.ok(bruto.includes(fgm(token, est)), `${nome}: estado no token ${token}`);
		assert.ok(bruto.includes(fgm("dim", " · ")), `${nome}: separador dim`);
		assert.ok(bruto.indexOf("Bash") < bruto.indexOf(est), `${nome}: estado depois do nome`);
	}
});

test("título: hora dim na mesma coluna de antes (w - 1) e sem régua; estreito corta o comando, nunca o estado", () => {
	const branch = [{ type: "message", message: { role: "toolResult", toolCallId: "sh-tit", timestamp: T } }];
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
	on.session_start({}, { sessionManager: { getBranch: () => branch } });
	const w0 = resolver("bash", () => ({}));
	const tit = (cmd: string, w: number, th: any = ansiPlain) =>
		semRespiro(
			w0.renderCall({ command: cmd }, th, ctx({ args: { command: cmd }, toolCallId: "sh-tit" })).render(w),
			w,
		)[0]!;
	assert.equal(txt([tit("ls", 80)])[0], regua("ls", "09:41"));
	assert.equal([...txt([tit("ls", 80)])[0]].length, 79, "hora termina na coluna w - 1");
	assert.ok(tit("ls", 80, marcas).includes(fgm("dim", "09:41")), "hora dim");
	const longa = `echo ${"x".repeat(200)}`;
	for (const w of [40, 50, 60]) {
		const t = plain(tit(longa, w));
		assert.equal(visibleWidth(t), w, `w=${w}`);
		assert.match(t, /Bash · OK · echo x+…/, `w=${w}: comando cortado com …, estado inteiro`);
		assert.match(t, / 09:41 $/, `w=${w}: hora preservada`);
	}
	const r = plain(
		draw({ command: longa }, "a\n\nCommand exited with code 12", { isError: true }, ansiPlain, 22).rows[1]!,
	);
	assert.match(r, /Bash · Erro 12 ·/, "estado nunca cortado em 22 colunas");
});

test("prévia: 5 últimas linhas + `K acima` + `<tecla> abre`; expandido mostra tudo + fecha", () => {
	assert.deepEqual(lines({ command: "x" }, nums(8)), [
		regua("x"),
		`${P}o3`,
		`${P}o4`,
		`${P}o5`,
		`${P}o6`,
		`${P}o7`,
		"▎",
		`${P}8 linhas · 3 acima · ctrl+o abre`,
	]);
	assert.deepEqual(
		lines({ command: "x" }, nums(5)),
		[regua("x"), `${P}o0`, `${P}o1`, `${P}o2`, `${P}o3`, `${P}o4`, "▎", `${P}5 linhas`],
		"5 cabem: sem acima nem atalho",
	);
	assert.deepEqual(lines({ command: "x" }, "só").slice(2), ["▎", `${P}1 linha`]);
	const aberto = lines({ command: "x" }, nums(8), { expanded: true });
	assert.deepEqual(aberto, [
		regua("x"),
		...Array.from({ length: 8 }, (_, i) => `${P}o${i}`),
		"▎",
		`${P}8 linhas · ctrl+o fecha`,
	]);
	assert.equal(
		lines({ command: "x" }, nums(3), { expanded: true }).at(-1),
		`${P}3 linhas`,
		"expandido curto: sem atalho",
	);
	// a tecla vem do nycode (keyText)
	assert.equal(
		lines({ command: "x" }, nums(8), { keyText: () => "alt+o" }).at(-1),
		`${P}8 linhas · 3 acima · alt+o abre`,
	);
});

test("estado no título e rodapé final: OK, OK · N avisos, Erro, Erro N, tempo esgotado, interrompido; duração antes das linhas", () => {
	// antes o estado abria o rodapé (`OK · 2 linhas`); agora fica no título e o rodapé traz só dur · linhas · acima · atalho · log.
	const rows = (texto: string, c: Record<string, unknown> = {}) => lines({ command: "x" }, texto, c);
	const foot = (texto: string, c: Record<string, unknown> = {}) => {
		const r = rows(texto, c);
		return r.length === 1 ? "" : r.at(-1);
	};
	const est = (texto: string, c: Record<string, unknown> = {}) => rows(texto, c)[0];
	assert.equal(foot(""), "", "sem rodapé: a linha some");
	assert.equal(est(""), regua("x"));
	assert.equal(foot("a\nb"), `${P}2 linhas`);
	assert.equal(
		est("warning: a\nok\nwarning: b"),
		regua("x", "", 80, "OK · 2 avisos").replace(/ +$/, ""),
		"aviso no título",
	);
	assert.equal(foot("warning: a\nok\nwarning: b"), `${P}3 linhas`);
	assert.equal(est("aviso: a\nok"), regua("x", "", 80, "OK · 1 aviso"));
	const err = (texto: string, estado: string) => {
		assert.equal(est(texto, { isError: true }), regua("x", "", 80, estado));
		return foot(texto, { isError: true });
	};
	assert.equal(err("falhou\n\nCommand exited with code 1", "Erro"), `${P}1 linha`);
	assert.equal(err("falhou\n\nCommand exited with code 2", "Erro 2"), `${P}1 linha`);
	assert.equal(err("a\n\nCommand timed out after 5 seconds", "tempo esgotado"), `${P}1 linha`);
	assert.equal(err("a\n\nCommand aborted", "interrompido"), `${P}1 linha`);
	assert.equal(err("só isso", "Erro"), `${P}1 linha`, "erro sem rodapé nativo");
	assert.equal(err("warning: a", "Erro"), `${P}1 linha`, "em erro, aviso não vira OK · avisos");
	assert.equal(foot("a", { durationMs: 65_000 }), `${P}1m 05s · 1 linha`);
	assert.equal(foot("a", { durationMs: 999 }), `${P}1 linha`);
	// `bash false`: o marcador nativo `(no output)` não é saída nem conta como linha
	assert.deepEqual(lines({ command: "false" }, "(no output)\n\nCommand exited with code 1", { isError: true }), [
		regua("false", "", 80, "Erro"),
	]);
	assert.deepEqual(lines({ command: "true" }, "(no output)"), [regua("true")]);
	assert.deepEqual(lines({ command: "x" }, "a\n(no output)"), [regua("x"), `${P}a`, "▎", `${P}1 linha`]);
});

test("execução: recebendo o comando, executando, args.description, barra e tempo vivo", () => {
	// Régua Run: antes `$ x` + `preparando o comando…`; agora o título mostra o comando parcial (muted + cursor) e o rodapé `recebendo o comando…`.
	// Preparando anima: o cursor `▏` pisca e a barra `━/─` abre o rodapé; saem do texto antes de comparar.
	// Barra que respira: antes o cursor do comando chegando era `▌`; agora `▏`.
	const prepara = (args: Args, c: Record<string, unknown> = {}) =>
		lines(args, undefined, { isPartial: true, executionStarted: false, ...c }).map((l) =>
			l
				.replace("▏", " ")
				.replace(/^(▎ +)[━─]{10} /, "$1")
				.trimEnd(),
		);
	// o espaço final do comando esperado é a célula do cursor
	assert.deepEqual(prepara({}), [regua(" ", "", 80, "recebendo"), `${P}recebendo o comando…`]);
	// Args prontos antes do início: o comando completo fica no título (antes o título ficava vazio até a execução começar).
	assert.deepEqual(
		prepara({ command: "x" }),
		[regua("x ", "", 80, "recebendo"), `${P}recebendo o comando · 1 caractere`],
		"args prontos: comando completo no título",
	);
	// args.command parcial (args ainda não prontos): o comando entra no título e o tamanho no rodapé
	assert.deepEqual(prepara({ command: "pnpm te" }, { argsComplete: false }), [
		regua("pnpm te ", "", 80, "recebendo"),
		`${P}recebendo o comando · 7 caracteres`,
	]);
	assert.equal(prepara({ command: "p" }, { argsComplete: false }).at(-1), `${P}recebendo o comando · 1 caractere`);
	assert.equal(
		prepara({ command: "ação" }, { argsComplete: false }).at(-1),
		`${P}recebendo o comando · 4 caracteres`,
		"conta caracteres, não bytes",
	);
	assert.deepEqual(lines({ command: "x" }, undefined, { isPartial: true }), [
		regua("x", "", 80, "executando"),
		`${P}executando`,
	]);
	assert.deepEqual(lines({ command: "x", description: "  Rodando os testes " }, undefined, { isPartial: true }), [
		regua("x", "", 80, "executando"),
		`${P}Rodando os testes`,
	]);
	assert.deepEqual(
		lines({ command: "x", description: "   " }, undefined, { isPartial: true }),
		[regua("x", "", 80, "executando"), `${P}executando`],
		"descrição vazia",
	);
	// saída parcial entra na prévia e no contador
	assert.deepEqual(lines({ command: "x" }, "a\nb", { isPartial: true }), [
		regua("x", "", 80, "executando"),
		`${P}a`,
		`${P}b`,
		"▎",
		`${P}executando · 2 linhas`,
	]);
	// Chamada que o nycode iniciou (tool_execution_start): barra `━/─` e tempo vivo a partir de 2 s. Sem `invalidate` nenhum timer é armado.
	const vivoId = id();
	// Relógio falso: antes usava o performance.now() real, e em 1 de cada 13 leituras a barra cai na posição 0,
	// sem trecho aceso, o que deixava o teste instável. Em 109 550 ms a posição é 5, seja no passo de 70 ms ou no de 1 s.
	const realNow = performance.now;
	performance.now = () => 109_550;
	vivo.iniciou(vivoId, 109_550 - 14_500);
	try {
		const run = lines({ command: "sleep 20" }, "a", { isPartial: true, toolCallId: vivoId });
		assert.match(run.at(-1)!, new RegExp(`^▎ ${" ".repeat(1 + G.length)}[━─]{10} executando · 14s · 1 linha$`));
		assert.ok(run.at(-1)!.includes("━"), "trecho aceso da barra");
		const curto = id();
		vivo.iniciou(curto);
		assert.equal(
			lines({ command: "x" }, undefined, { isPartial: true, toolCallId: curto })
				.at(-1)!
				.replace(/[━─]{10} /, ""),
			`${P}executando`,
			"abaixo de 2 s: sem tempo",
		);
	} finally {
		performance.now = realNow;
		vivo.terminou(vivoId);
	}
});

test("bash-clamp: total e log do rodapé da extensão; o aviso não entra no corpo", () => {
	const foot =
		'[Output clamped: showing 100 of 400 lines. Full output: /tmp/c.log — read({ path: "/tmp/c.log", offset: 51, limit: 250 }) for the largest omitted span]';
	const out = Array.from({ length: 100 }, (_, i) => `linha ${i}`).join("\n");
	const ok = lines({ command: "seq" }, `${out}\n\n${foot}`);
	assert.deepEqual(ok.slice(0, 6), [
		regua("seq"),
		`${P}linha 95`,
		`${P}linha 96`,
		`${P}linha 97`,
		`${P}linha 98`,
		`${P}linha 99`,
	]);
	assert.equal(ok.length, 8);
	assert.equal(ok[6], "▎");
	assert.equal(ok[7], `${P}400 linhas · 395 acima · ctrl+o abre · log /tmp/c.log`);
	assert.ok(ok.every((l) => !l.includes("Output clamped")));
	const erro = lines({ command: "seq" }, `${out}\n\n${foot}\n\nCommand exited with code 1`, { isError: true });
	assert.equal(erro.at(-1), `${P}400 linhas · 395 acima · ctrl+o abre · log /tmp/c.log`);
	// caminho longo: o rodapé corta com … dentro do cartão
	const longo = foot.replaceAll("/tmp/c.log", `/tmp/nycode-bash-clamp/${"d".repeat(80)}.log`);
	const cortado = lines({ command: "seq" }, `${out}\n\n${longo}`).at(-1)!;
	// antes o cartão tinha no máximo 72 colunas; agora a largura inteira (w = 80)
	assert.ok(cortado.endsWith("…") && [...cortado].length <= 80, cortado);
});

test("trilho ▎ na cor do estado em toda linha do cartão", () => {
	const cor = (c: Record<string, unknown>, texto?: string) => draw({ command: "x" }, texto, c, theme).rows;
	const todas = (rows: string[], token: string) => rows.every((l) => l.startsWith(`<${token}>▎</c> `));
	assert.ok(todas(cor({}, "a"), "success"));
	assert.ok(todas(cor({}, "warning: a"), "warning"));
	assert.ok(todas(cor({ isError: true }, "a\n\nCommand exited with code 1"), "error"));
	assert.ok(todas(cor({ isPartial: true }), "accent"));
	assert.ok(todas(cor({ isPartial: true, executionStarted: false }), "dim"));
	// antes 8 linhas; agora 10 (título, 5 de prévia, vazia, rodapé + 2 linhas de respiro com trilho)
	assert.ok(cor({}, nums(8)).length === 10 && todas(cor({}, nums(8)), "success"));
});

// antes o cartão tinha no máximo 72 colunas (min(72, w)); agora tem exatamente w, sem teto
test("largura: nenhuma linha passa de w; o cartão tem exatamente w e começa na coluna 0 (sem margem; antes margem 2 e teto de 72)", () => {
	const longa = `echo ${"x".repeat(300)}`;
	const estados: Array<[string, Record<string, unknown>, string | undefined]> = [
		["ok", { durationMs: 65_000 }, `${nums(8)}\n${longa}`],
		["aviso", {}, `warning: ${longa}`],
		["erro", { isError: true }, `${longa}\n\nCommand exited with code 12`],
		["rodando", { isPartial: true }, longa],
		["prep", { isPartial: true, executionStarted: false }, undefined],
	];
	for (const w of [20, 60, 200]) {
		const esperado = w;
		for (const [nome, c, texto] of estados) {
			for (const comando of ["x", longa]) {
				const rows = draw(
					{ command: comando, description: longa },
					texto,
					{ expanded: nome === "ok", ...c },
					ansiPlain,
					w,
				).rows.map(plain);
				assert.ok(rows.length >= 2, `${nome} w=${w}`);
				for (const l of rows) {
					assert.ok(visibleWidth(l) <= w, `${nome} w=${w}: ${visibleWidth(l)}`);
					assert.equal(visibleWidth(l), esperado, `${nome} w=${w}: cartão preenchido até a largura`);
				}
			}
		}
	}
});

test("largura: sem teto de 72; o cartão tem exatamente w em w = 120 e w = 200", () => {
	// antes min(72, w); agora a largura inteira.
	for (const w of [120, 200]) {
		for (const [c, texto] of [
			[{}, nums(8)],
			[{ isError: true }, "a\n\nCommand exited with code 1"],
			[{ isPartial: true }, "a"],
		] as const) {
			const rows = draw({ command: "x" }, texto, c, ansiPlain, w).rows.map(plain);
			assert.ok(rows.length >= 3);
			for (const l of rows) assert.equal(visibleWidth(l), w, `w=${w}`);
		}
		// antes o título ia até w - 1 pela régua `─`; agora termina no texto (sem hora aqui) e o cartão segue com w colunas.
		assert.equal(
			txt(semRespiro(draw({ command: "x" }, "", {}, ansiPlain, w).rows, w))[0],
			regua("x", "", w),
			`título sem régua, w=${w}`,
		);
	}
});

// Modelo de terminal: fundo ativo em cada caractere visível (48;5;N ou 48;2;r;g;b), null quando sem fundo.
const _bgPerChar = (line: string): Array<string | null> => {
	let bg: string | null = null;
	const out: Array<string | null> = [];
	for (const part of line.split(/(\x1b\[[0-9;]*m)/)) {
		const m = /^\x1b\[([0-9;]*)m$/.exec(part);
		if (!m) {
			for (const _ of part) out.push(bg);
			continue;
		}
		const c = m[1] === "" ? ["0"] : m[1].split(";");
		for (let i = 0; i < c.length; i++) {
			if (c[i] === "0" || c[i] === "49") bg = null;
			else if (c[i] === "48") {
				bg = c.slice(i + 1, i + (c[i + 1] === "5" ? 3 : 5)).join(";");
				i += c[i + 1] === "5" ? 2 : 4;
			} else if (c[i] === "38") i += c[i + 1] === "5" ? 2 : 4;
		}
	}
	return out;
};
