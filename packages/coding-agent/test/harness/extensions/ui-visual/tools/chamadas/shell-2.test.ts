// node --experimental-strip-types --test extensions/ui-visual/test/tools/shell.test.ts
// Variante 04 "Trilho de status": o bash inteiro é um cartão desenhado por renderCall (motion/shell.ts);
// renderResult só entrega a saída ao estado. Execução 5 (barra indeterminada) e transição C (dissolver) só são testadas
// no estado assentado: o laboratório de movimento mede a cadência; aqui nada depende de relógio ou de timer.
import assert from "node:assert/strict";
import { afterEach, beforeEach, test, vi } from "vitest";
import * as __m4 from "../../../../../../src/extensions/ui-visual/icons.ts";
import * as __m2 from "../../../../../../src/extensions/ui-visual/motion/motion.ts";
import * as __m3 from "../../../../../../src/extensions/ui-visual/motion/shell.ts";
import * as __m1 from "../../../../../../src/extensions/ui-visual/motion/vivo.ts";
import {
	ansiPlain,
	BGC as BGC_,
	bgTheme,
	ctx,
	icon,
	OPEN,
	plain,
	reguaRun,
	result,
	semRespiro,
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
const { definirFoco } = __m2;
const shell = __m3;
const { iconGap } = __m4;
// Régua Run: antes `$ comando` e hora à direita; agora `<ícone> Run ─ comando ───── hora` e corpo/rodapé recuados até o `Run`.
// O prefixo vem de icon('bash') e iconGap() da cópia tmp (base.ts fixa o terminal), sem depender de TERM.
const G = iconGap();
const _P = `▎ ${" ".repeat(1 + G.length)}`; // corpo e rodapé: trilho + recuo até o `Run`
const _regua = (cmd: string, hora = "", w = 80, estado = "OK") => reguaRun(icon("bash"), G, cmd, hora, w, estado);

type Args = Record<string, unknown>;
const _T = new Date(2026, 10, 14, 9, 41, 30).getTime();
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
const _marcas = { fg: fgm, bold: (t: string) => t };

// antes o cartão tinha no máximo 72 colunas (min(72, w)); agora tem exatamente w, sem teto

test("respiro: uma linha vazia com trilho e fundo em cima e embaixo do cartão", () => {
	// antes o cartão começava no título e acabava no rodapé; agora há uma linha de respiro em cada ponta.
	for (const w of [80, 120]) {
		for (const [c, texto, bg] of [
			[{}, nums(8), "customMessageBg"],
			[{}, undefined, "customMessageBg"],
			[{ isError: true }, "a\n\nCommand exited with code 1", "toolErrorBg"],
		] as const) {
			const rows = draw({ command: "x" }, texto, c, bgTheme, w).rows;
			for (const l of [rows[0]!, rows.at(-1)!]) {
				assert.match(plain(l), /^▎ +$/, `trilho + espaços, w=${w}`);
				assert.equal(visibleWidth(plain(l)), w, `largura w=${w}`);
				assert.ok(l.includes(`\x1b[48;5;${BGC_[bg]}m`), `fundo ${bg}`);
				assert.ok(
					bgPerChar(l).every((b) => b === `5;${BGC_[bg]}`),
					"fundo em toda coluna",
				);
			}
			assert.match(
				plain(rows[1]!),
				/Bash · /, // antes `Bash ─` e `Run ─` (2026-11-19)
				"o título vem logo depois do respiro",
			);
		}
	}
});

// Modelo de terminal: fundo ativo em cada caractere visível (48;5;N ou 48;2;r;g;b), null quando sem fundo.
const bgPerChar = (line: string): Array<string | null> => {
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

test("fundo: customMessageBg (erro: toolErrorBg) em toda coluna do cartão, também depois do corte", () => {
	const longa = "y".repeat(300);
	const fundos = (rows: string[]) => new Set(rows.flatMap((l) => bgPerChar(l))); // sem margem: toda coluna é do cartão
	const ok = draw({ command: longa }, `${longa}\n${nums(7)}`, {}, bgTheme).rows;
	const err = draw({ command: longa }, `${longa}\n\nCommand exited with code 1`, { isError: true }, bgTheme).rows;
	for (const rows of [ok, err]) {
		assert.ok(
			rows.every((l: string) => bgPerChar(l)[0] !== null),
			"sem margem: a 1ª coluna já tem o fundo do cartão",
		);
		assert.equal(fundos(rows).size, 1, "um único fundo, sem buraco nem null");
		assert.ok(!fundos(rows).has(null));
	}
	assert.ok(plain(ok[1]).includes("…"), "título cortado"); // antes ok[0]; agora ok[0] é o respiro
	assert.notDeepEqual([...fundos(ok)], [...fundos(err)], "erro usa outro fundo");
	assert.ok(ok.every((l: string) => l.includes(OPEN("customMessageBg")) || l.includes("\x1b[48;2;")));
	// corte estreito (w = 20) e largura exata
	for (const w of [20, 60]) {
		const rows = draw({ command: longa }, longa, {}, bgTheme, w).rows;
		assert.ok(
			rows.every(
				(l: string) =>
					bgPerChar(l)
						.slice(2)
						.every((b) => b !== null) && visibleWidth(plain(l)) <= w,
			),
			`w=${w}`,
		);
	}
});

test("renderResult do bash devolve 0 linhas e grava a saída em state.uiShell", () => {
	const w0 = wrapped("bash");
	for (const [o, c] of [
		[{}, {}],
		[{ expanded: true }, {}],
		[{ isPartial: true }, {}],
		[{}, { isError: true }],
	] as const) {
		const shared = ctx({ args: { command: "x" }, ...c });
		const res = w0.renderResult(
			result("a\nb\n\nCommand exited with code 2"),
			{ expanded: false, isPartial: false, ...o },
			ansiPlain,
			shared,
		);
		assert.deepEqual(res.render(80), []);
		assert.deepEqual((shared.state as { uiShell: { linhas: unknown } }).uiShell.linhas, ["a", "b"]);
		assert.equal(
			(shared.state as { uiShell: { estado: unknown } }).uiShell.estado,
			"isError" in c && !("isPartial" in o) ? "Erro 2" : undefined,
		);
	}
	// sem state (nycode antigo): não quebra
	assert.deepEqual(
		w0
			.renderResult(result("a"), { expanded: false, isPartial: false }, ansiPlain, ctx({ state: undefined }))
			.render(80),
		[],
	);
});

test("saidaShell: separa linhas, total, log, estado e avisos", () => {
	const { saidaShell } = shell;
	assert.deepEqual(saidaShell("a\n\n(no output)\nb  \n", false), {
		linhas: ["a", "b"],
		total: 2,
		log: undefined,
		estado: undefined,
		avisos: 0,
	});
	assert.deepEqual(saidaShell("warning: x\nWarning: y\nfine", false).avisos, 2);
	const e = saidaShell("x\n\nCommand exited with code 7", true);
	assert.deepEqual([e.linhas, e.estado, e.avisos], [["x"], "Erro 7", 0]);
	const c = saidaShell("x\n[Output clamped: showing 1 of 9 lines. Full output: /t/a b.log]", false);
	assert.deepEqual([c.linhas, c.total, c.log], [["x"], 9, "/t/a b.log"]);
});

test("cache: chamada terminada fora do dissolver devolve a mesma saída sem redesenhar", () => {
	const th = {
		chamadas: 0,
		fg: (_c: string, x: string) => {
			th.chamadas++;
			return x;
		},
		bold: ansiPlain.bold,
	};
	const shared = ctx({ args: { command: "x" }, toolCallId: id(), durationMs: 2000 });
	const w0 = wrapped("bash");
	const call = w0.renderCall({ command: "x" }, th, shared);
	w0.renderResult(result(nums(8)), { expanded: false, isPartial: false }, th, shared);
	const a = call.render(80);
	const feito = th.chamadas;
	assert.ok(feito > 0);
	for (let i = 0; i < 5; i++) assert.deepEqual(call.render(80), a);
	assert.equal(th.chamadas, feito, "tema não é chamado de novo");
	call.render(60);
	assert.ok(th.chamadas > feito, "outra largura recalcula");
	let k = th.chamadas;
	call.render(60);
	assert.equal(th.chamadas, k);
	// saída nova (mesmo componente) recalcula; invalidate recalcula; erro recalcula
	w0.renderResult(result(nums(3)), { expanded: false, isPartial: false }, th, shared);
	assert.notDeepEqual(txt(call.render(60)), txt(a));
	k = th.chamadas;
	call.invalidate();
	call.render(60);
	assert.ok(th.chamadas > k, "invalidate recalcula");
	k = th.chamadas;
	shared.isError = true;
	call.render(60);
	assert.ok(th.chamadas > k, "virar erro recalcula");
	// em execução recalcula a cada quadro
	const run = wrapped("bash").renderCall({ command: "x" }, th, ctx({ args: { command: "x" }, isPartial: true }));
	run.render(80);
	k = th.chamadas;
	run.render(80);
	assert.ok(th.chamadas > k, "rodando: sem cache");
});

test("dissolver: dentro dos 600 ms o texto já é o final; depois do fim da janela a saída assenta e volta ao cache", async () => {
	// Só o texto: as cores (trilho accent→final, fundo, estado dim→final) dependem de truecolor e do relógio e ficam fora do teste.
	const dissolve = id();
	const th = {
		chamadas: 0,
		fg: (_c: string, x: string) => {
			th.chamadas++;
			return x;
		},
		bold: ansiPlain.bold,
	};
	const shared = ctx({ args: { command: "x" }, toolCallId: dissolve });
	const w0 = wrapped("bash");
	const call = w0.renderCall({ command: "x" }, th, shared);
	w0.renderResult(result(nums(2)), { expanded: false, isPartial: false }, th, shared);
	const assentado = txt(call.render(80));
	vivo.terminou(dissolve, performance.now()); // janela de 600 ms aberta agora
	assert.deepEqual(txt(call.render(80)), assentado, "o texto não muda durante o dissolver");
	vivo.terminou(dissolve, performance.now() - 700); // janela já fechada
	call.invalidate();
	call.render(80);
	const k = th.chamadas;
	call.render(80);
	assert.equal(th.chamadas, k, "assentado: de volta ao cache");
});

test("dissolver em truecolor: no meio da janela o fundo do sucesso brilha na cor do desfecho e o resto do rodapé nasce do fundo", () => {
	// No sucesso o fundo inicial e o final são iguais; sem o brilho, a transição não aparecia.
	const RGB: Record<string, string> = {
		customMessageBg: "30;30;40",
		toolErrorBg: "60;20;20",
		accent: "100;150;250",
		dim: "120;120;130",
		success: "80;200;100",
	};
	const tc = {
		fg: (_c: string, x: string) => x,
		bold: (x: string) => x,
		getBgAnsi: (c: string) => `\x1b[48;2;${RGB[c] ?? "0;0;0"}m`,
		getFgAnsi: (c: string) => `\x1b[38;2;${RGB[c] ?? "0;0;0"}m`,
	};
	const desenho = (idade: number | undefined) => {
		const cid = id();
		const shared = ctx({ args: { command: "x" }, toolCallId: cid });
		const w0 = wrapped("bash");
		const call = w0.renderCall({ command: "x" }, tc, shared);
		w0.renderResult(result("a\nb"), { expanded: false, isPartial: false }, tc, shared);
		if (idade !== undefined) vivo.terminou(cid, performance.now() - idade);
		return call.render(80);
	};
	const fundos = (rows: string[]) => new Set(rows.flatMap((l) => l.match(/48;2;\d+;\d+;\d+/g) ?? []));
	const assentado = desenho(undefined),
		meio = desenho(300);
	assert.deepEqual([...fundos(assentado)], ["48;2;30;30;40"]);
	const [fm] = [...fundos(meio)];
	assert.equal(fundos(meio).size, 1, "um fundo só no quadro");
	assert.notEqual(fm, "48;2;30;30;40", "no meio do dissolver o fundo brilha");
	const [, r, g] = fm!.split(";").slice(1).map(Number);
	assert.ok(g! > r!, `o brilho puxa para o verde do sucesso: ${fm}`);
	const rodape = meio.at(-1)!;
	assert.ok(!rodape.includes("38;2;120;120;130m · "), "o resto do rodapé ainda não está no dim final");
	assert.ok(
		assentado.at(-1)!.includes("38;2;120;120;130") || !assentado.at(-1)!.includes("38;2;"),
		"assentado volta ao tema",
	);
	assert.deepEqual(txt(meio), txt(assentado), "o texto é o mesmo; só a cor muda");
});

test("toda troca de estado dissolve: preparando → executando, e executando → OK, OK · avisos e Erro", () => {
	// Todos os status têm transição. No meio da janela o fundo e o trilho estão entre os dois estados.
	const RGB: Record<string, string> = {
		customMessageBg: "30;30;40",
		toolErrorBg: "60;20;20",
		accent: "100;150;250",
		dim: "120;120;130",
		success: "80;200;100",
		warning: "230;190;60",
		error: "230;70;70",
	};
	const tc = {
		fg: (_c: string, x: string) => x,
		bold: (x: string) => x,
		getBgAnsi: (c: string) => `\x1b[48;2;${RGB[c] ?? "0;0;0"}m`,
		getFgAnsi: (c: string) => `\x1b[38;2;${RGB[c] ?? "0;0;0"}m`,
	};
	const casos: Array<[string, Record<string, unknown>, string | undefined, (cid: string, idade: number) => void]> = [
		["executando", { isPartial: true }, "a", (cid, idade) => vivo.iniciou(cid, performance.now() - idade)],
		["OK", {}, "a", (cid, idade) => vivo.terminou(cid, performance.now() - idade)],
		["aviso", {}, "warning: a", (cid, idade) => vivo.terminou(cid, performance.now() - idade)],
		[
			"erro",
			{ isError: true },
			"a\n\nCommand exited with code 1",
			(cid, idade) => vivo.terminou(cid, performance.now() - idade),
		],
	];
	const fundo = (l: string) => /48;2;(\d+;\d+;\d+)/.exec(l)?.[1];
	const trilho = (l: string) => /38;2;(\d+;\d+;\d+)m▎/.exec(l)?.[1];
	for (const [nome, c, texto, marca] of casos) {
		const desenho = (idade: number) => {
			const cid = id();
			const shared = ctx({ args: { command: "x" }, toolCallId: cid, ...c });
			const w0 = wrapped("bash");
			const call = w0.renderCall({ command: "x" }, tc, shared);
			w0.renderResult(result(texto ?? ""), { expanded: false, isPartial: c.isPartial === true }, tc, shared);
			marca(cid, idade);
			const rows = call.render(80);
			if (nome === "executando") vivo.terminou(cid); // solta o relógio
			return rows;
		};
		const meio = desenho(300),
			fim = desenho(5000);
		assert.notEqual(fundo(meio[0]!), fundo(fim[0]!), `${nome}: o fundo muda no meio da transição`);
		assert.ok(trilho(meio[0]!), `${nome}: trilho em cor interpolada`);
		assert.notEqual(
			trilho(meio[0]!),
			RGB[{ executando: "accent", OK: "success", aviso: "warning", erro: "error" }[nome]!],
			`${nome}: o trilho ainda não chegou à cor final`,
		);
	}
});

test("sem foco: a barra e o cursor continuam no cartão (1 passo por segundo), em preparando e em executando", () => {
	// Antes, sem foco, a barra e o cursor sumiam e `recebendo o comando` parecia travado; agora ficam e andam devagar.
	definirFoco(false);
	const rid = id();
	vivo.iniciou(rid);
	try {
		const prep = lines({ command: "pnpm te" }, undefined, {
			isPartial: true,
			executionStarted: false,
			argsComplete: false,
		});
		assert.match(prep.at(-1)!, /^▎ +[━─]{10} recebendo o comando · 7 caracteres$/);
		// Barra que respira: antes o cursor do comando chegando era `▌`; agora `▏`.
		assert.ok(prep[0]!.includes("pnpm te▏"), "cursor fixo sem foco");
		assert.match(
			lines({ command: "x" }, undefined, { isPartial: true, toolCallId: rid }).at(-1)!,
			/^▎ +[━─]{10} executando$/,
		);
		// Movimento reduzido também mantém a barra (1 passo por segundo); só `desligado` a tira.
		definirFoco(undefined);
		process.env.NYCODE_REDUCED_MOTION = "1";
		assert.match(
			lines({ command: "x" }, undefined, { isPartial: true, toolCallId: rid }).at(-1)!,
			/^▎ +[━─]{10} executando$/,
			"reduzido",
		);
		delete process.env.NYCODE_REDUCED_MOTION;
		process.env.NO_PROGRESS = "1";
		assert.match(
			lines({ command: "x" }, undefined, { isPartial: true, toolCallId: rid }).at(-1)!,
			/^▎ +executando$/,
			"desligado: sem barra",
		);
	} finally {
		delete process.env.NYCODE_REDUCED_MOTION;
		delete process.env.NO_PROGRESS;
		vivo.terminou(rid);
		definirFoco(undefined);
	}
});

test("tinta longa no comando chegando: letras novas nascem do fundo, as antigas secam no muted; o cursor respira", async () => {
	// Tinta longa (/refino escrita 1): antes o comando parcial vinha inteiro em muted e o cursor piscava a cada
	// 400 ms (aceso ou apagado); agora cada letra ganha a cor em TINTA_MS e o cursor muda de intensidade aos poucos.
	// Manual clock: the ink and the cursor phase follow performance.now, so real sleeps made this flaky under load.
	let clock = 1000;
	const clockSpy = vi.spyOn(performance, "now").mockImplementation(() => clock);
	const RGB: Record<string, string> = {
		customMessageBg: "30;30;40",
		accent: "100;150;250",
		dim: "120;120;130",
		muted: "160;160;170",
	};
	const tc = {
		fg: (_c: string, x: string) => x,
		bold: (x: string) => x,
		getBgAnsi: (c: string) => `\x1b[48;2;${RGB[c] ?? "0;0;0"}m`,
		getFgAnsi: (c: string) => `\x1b[38;2;${RGB[c] ?? "0;0;0"}m`,
	};
	const args: Args = { command: "ab" };
	const shared = ctx({ args, toolCallId: id(), isPartial: true, executionStarted: false, argsComplete: false });
	const w0 = wrapped("bash");
	// Como o nycode: a cada args novo o renderCall é chamado de novo, com o mesmo context.state.
	const titulo = () => w0.renderCall(args, tc, shared).render(80)[1] as string;
	const corDe = (l: string, ch: string) => new RegExp(`38;2;(\\d+);(\\d+);(\\d+)m${ch}`).exec(l)?.slice(1).map(Number);
	const cedo = titulo();
	assert.ok(corDe(cedo, "a")![0]! < 100, `letra recém-chegada ainda perto do fundo: ${corDe(cedo, "a")}`);
	clock += 400;
	args.command = "abcd";
	const depois = titulo();
	assert.deepEqual(corDe(depois, "a"), undefined, "a letra antiga secou: volta à cor do tema (muted)");
	assert.ok(corDe(depois, "d")![0]! < 100, "a letra nova nasce do fundo");
	const cursores = new Set<string>();
	for (let i = 0; i < 6; i++) {
		cursores.add(/38;2;(\d+;\d+;\d+)m▏/.exec(titulo())?.[1] ?? "-");
		clock += 60;
	}
	clockSpy.mockRestore();
	assert.ok(cursores.size >= 3 && !cursores.has("-"), `cursor respira em vários tons, sem apagar: ${[...cursores]}`);
});

test("barra que respira: ao começar a executar, a barra do comando escorrega e some em SAI_MS", async () => {
	// Barra que respira: antes o cursor sumia de uma vez ao executar.
	const RGB: Record<string, string> = {
		customMessageBg: "30;30;40",
		accent: "100;150;250",
		dim: "120;120;130",
		muted: "160;160;170",
	};
	const tc = {
		fg: (_c: string, x: string) => x,
		bold: (x: string) => x,
		getBgAnsi: (c: string) => `\x1b[48;2;${RGB[c] ?? "0;0;0"}m`,
		getFgAnsi: (c: string) => `\x1b[38;2;${RGB[c] ?? "0;0;0"}m`,
	};
	const cid = id(),
		args: Args = { command: "ls" };
	const shared = ctx({ args, toolCallId: cid, isPartial: true, executionStarted: true });
	vivo.iniciou(cid);
	const titulo = () => wrapped("bash").renderCall(args, tc, shared).render(80)[1] as string;
	assert.match(titulo(), /ls\x1b\[[0-9;]*m*.*▏/, "logo ao executar: a barra ainda está lá");
	await new Promise((r) => setTimeout(r, 500));
	assert.ok(!titulo().includes("▏"), "depois de SAI_MS: sumiu");
	vivo.terminou(cid);
});
