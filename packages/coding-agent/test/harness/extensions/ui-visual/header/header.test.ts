// node --experimental-strip-types --test ~/.nycode/agent/extensions/ui-visual/test/header.test.ts
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { visibleWidth } from "@nycode/tui";
import { afterEach, beforeEach, test, vi } from "vitest";
import { VERSION } from "../../../../../src/config.ts";
import { marcarStatusPendente } from "../../../../../src/extensions/status-line/rows.ts";
import * as __m1 from "../../../../../src/extensions/ui-visual/header.ts";
import * as __m3 from "../../../../../src/extensions/ui-visual/header.ts";
import * as __m4 from "../../../../../src/extensions/ui-visual/header.ts";
import * as __m2 from "../../../../../src/extensions/ui-visual/motion/nycode.ts";

// The animations read TERM: pin it so the suite does not depend on the shell it runs in.
beforeEach(() => {
	vi.stubEnv("TERM", "xterm-256color");
});
afterEach(() => {
	vi.unstubAllEnvs();
});

const _tmp = mkdtempSync(join(tmpdir(), "ui-visual-header-"));
const { default: header, HINTS, buildHeaderLines, ABERTURA_MS, PASSO_MAX_MS, CALMA_QUADROS, ESPERA_MAX_MS } = __m1;
const { marcaLinhas, ponto, MARCA_W, MARCA_H } = __m2;
const strip = (l: string) => l.replace(/\x1b\[[0-9;]*m/g, "");

const theme = { fg: (_k: string, s: string) => s, bold: (s: string) => s };
// Marca nycode: antes logo do nycode 4 × 2 com `nycode versão` e atalhos em duas linhas; agora 7 linhas da
// marca, uma em branco e `nycode versão   atalhos` numa linha só.
test("buildHeaderLines: marca de 7 linhas, linha em branco, versão e atalhos na última", () => {
	const lines = buildHeaderLines("1.5.2", theme, 200);
	assert.equal(lines.length, MARCA_H + 2);
	assert.equal(lines[MARCA_H], "");
	assert.ok(lines.at(-1)!.startsWith(" nycode 1.5.2"));
	for (const [k, label] of HINTS) assert.ok(lines.at(-1)!.includes(`${k} ${label}`));
	// estado da sessão e dica de interrupção não moram no cabeçalho
	assert.deepEqual(
		HINTS.map(([k]: [string, string]) => k),
		["?", "/", "!"],
	);
});

test("buildHeaderLines: hierarquia por peso e cinza, sem cor de destaque", () => {
	const tagged = { fg: (k: string, s: string) => `<${k}>${s}</>`, bold: (s: string) => `*${s}*` };
	const all = buildHeaderLines("1.5.2", tagged, 500);
	assert.ok(all.at(-1)!.includes("*<text>nycode</>* <dim>1.5.2</>"));
	assert.ok(all.at(-1)!.includes("*<text>?</>* <dim>atalhos</>"));
	assert.equal(all.join("").includes("<accent>"), false);
});

test("buildHeaderLines: estreito descarta atalhos inteiros e nunca excede a largura", () => {
	assert.equal(buildHeaderLines("1.5.2", theme, 24).at(-1)!.includes("shell"), false);
	assert.equal(buildHeaderLines("1.5.2", theme, MARCA_W).length, 1, "sem espaço para a marca: só a linha de texto");
	for (const w of [0, 1, 5, 10, 20, 40, 70, 71, 80, 200]) {
		for (const line of buildHeaderLines("1.5.2", theme, w)) assert.ok(visibleWidth(line) <= w, `w=${w}`);
	}
});

function setup(hasUI: boolean, env: Record<string, string>) {
	const keys = ["NO_COLOR", "NYCODE_SUBAGENT"];
	const saved = keys.map((k) => process.env[k]);
	for (const k of keys) delete process.env[k];
	Object.assign(process.env, env);
	let handler: any;
	const calls: any[] = [];
	header({
		on: (_n: string, h: unknown) => {
			handler = h;
		},
		getThinkingLevel: () => "medium",
	} as any);
	const ctx = {
		hasUI,
		cwd: "/tmp",
		model: { id: "m1", reasoning: true, contextWindow: 200000 } as any,
		ui: { setHeader: (f: unknown) => calls.push(f) },
	};
	handler({}, ctx);
	keys.forEach((k, i) => {
		if (saved[i] === undefined) delete process.env[k];
		else process.env[k] = saved[i];
	});
	return { calls, ctx };
}

test("session_start: instala o cabeçalho com a marca", () => {
	const { calls } = setup(true, {});
	assert.equal(calls.length, 1);
	const comp = calls[0](undefined, theme);
	const lines = comp.render(200);
	assert.equal(lines.length, MARCA_H + 2);
	assert.equal(lines.join("").includes("m1"), false);
	comp.invalidate();
});

test("sem UI, em subagente ou com NO_COLOR não há cabeçalho", () => {
	assert.equal(setup(false, {}).calls.length, 0);
	assert.equal(setup(true, { NYCODE_SUBAGENT: "1" }).calls.length, 0);
	assert.equal(setup(true, { NO_COLOR: "1" }).calls.length, 0);
});

// Abertura "Letra a letra" (antes revela coluna a coluna em 320 ms).
test("marca: desenho assentado igual à imagem de referência (grade 70 × 13 em meio bloco), degradê do topo à base", () => {
	const l = marcaLinhas(Infinity, { claro: false }, "truecolor");
	assert.equal(l.length, MARCA_H);
	for (const r of l) assert.equal(visibleWidth(r), MARCA_W);
	// Volta das células aos pontos: ▀ com fundo = os dois, ▀ = o de cima, ▄ = o de baixo; a linha de pontos -1 é vazia.
	// O SGR só vem quando a cor muda: o fundo em vigor é acompanhado ao longo da linha.
	const pontos = l
		.flatMap((r: string) => {
			const cima: string[] = [],
				baixo: string[] = [];
			let fundo = false;
			for (const m of r.matchAll(/((?:\x1b\[[0-9;]*m)*)([▀▄ ])/g)) {
				for (const sgr of m[1].matchAll(/\x1b\[([0-9;]*)m/g))
					if (sgr[1].startsWith("48;")) fundo = true;
					else if (sgr[1] === "49") fundo = false;
				const dois = fundo;
				cima.push(m[2] === "▀" ? "#" : ".");
				baixo.push(m[2] === "▄" || dois ? "#" : ".");
			}
			return [cima.join(""), baixo.join("")];
		})
		.slice(1);
	const B = "..........",
		BAR = "..######..",
		ST = "###....###";
	const letras = [
		[B, B, B, BAR, BAR, ST, ST, ST, ST, ST, ST, ST, ST],
		[
			B,
			B,
			B,
			"##.....##.",
			"##.....##.",
			"##.....##.",
			"####..###.",
			".###..##..",
			".#######..",
			"...###....",
			"...###....",
			".###......",
			".###......",
		],
		[B, B, B, BAR, BAR, ST, ST, "###.......", "###.......", ST, ST, BAR, BAR],
		[B, B, B, BAR, BAR, ST, ST, ST, ST, ST, ST, BAR, BAR],
		[
			".......###",
			".......###",
			".......###",
			"..########",
			"..########",
			ST,
			ST,
			ST,
			ST,
			ST,
			ST,
			"..########",
			"..########",
		],
		[B, B, B, BAR, BAR, ST, ST, "##########", "##########", "###.......", "###.......", BAR, BAR],
	];
	assert.deepEqual(
		pontos,
		Array.from({ length: 13 }, (_, y) => letras.map((x) => x[y]).join("..")),
		"grade medida da imagem (n y c o d e)",
	);
	assert.deepEqual(ponto(0, 5, Infinity, { claro: false }), [190, 190, 190], "imagem: 189 nessa altura");
	assert.deepEqual(ponto(0, 12, Infinity, { claro: false }), [122, 122, 122], "base do degradê medido");
	assert.ok(ponto(0, 5, Infinity, { claro: true })![0] < 100, "tema claro: marca escura");
});

test("marca: abertura letra a letra, com cursor de destaque, e assenta em ABERTURA_MS", () => {
	const c = { claro: false, destaque: [255, 0, 0] as const };
	const visiveis = (t: number) => marcaLinhas(t, c, "truecolor").map(strip).join("").replace(/ /g, "").length;
	assert.ok(visiveis(0) < visiveis(Infinity) / 4, "no início só a 1ª letra e o cursor");
	assert.ok(visiveis(250) > visiveis(0) && visiveis(250) < visiveis(Infinity), "a 1ª letra entrou, o resto não");
	assert.ok(marcaLinhas(10, c, "truecolor").join("").includes("38;2;255;0;0"), "cursor na cor de destaque");
	assert.deepEqual(marcaLinhas(ABERTURA_MS, c, "truecolor"), marcaLinhas(Infinity, c, "truecolor"));
	assert.ok(ABERTURA_MS < 2000, "abertura curta");
	assert.equal(visibleWidth(marcaLinhas(100, c, "256color")[3]), MARCA_W, "256 cores: mesma largura");
	// Bytes por quadro: SGR só quando a cor muda (antes uma sequência por célula, ~4 KB).
	assert.ok(marcaLinhas(Infinity, c, "truecolor").join("").length < 2500, "quadro assentado enxuto");
	for (const r of marcaLinhas(Infinity, c, "truecolor"))
		assert.ok(!/\x1b\[4[0-9;]*m$/.test(r) || r.endsWith("\x1b[49m"), "linha fecha o fundo");
});

// Partida calma: antes a abertura começava no 1º desenho, no meio da carga do início
// (~200 ms de laço ocupado no nycode real), e congelava; agora espera CALMA_QUADROS desenhos calmos (ou ESPERA_MAX_MS) com só o cursor.
test("abertura no cabeçalho: espera o laço acalmar, depois um travamento atrasa a animação em vez de pular quadros", () => {
	const real = performance.now;
	let agora = 50_000;
	performance.now = () => agora;
	try {
		const { calls } = setup(true, {});
		const comp = calls[0]({ requestRender() {} }, theme);
		const em = (t: number) => buildHeaderLines(VERSION, theme, 120, t);
		agora += 5000; // instalado muito antes do 1º desenho: a abertura ainda não andou
		assert.deepEqual(comp.render(120), em(-1), "1º desenho: só o cursor");
		for (let i = 0; i < CALMA_QUADROS - 1; i++) {
			agora += 16;
			comp.render(120);
		}
		agora += 200; // carga do início: laço ocupado zera a contagem
		assert.deepEqual(comp.render(120), em(-1));
		for (let i = 0; i < CALMA_QUADROS - 1; i++) {
			agora += 16;
			assert.deepEqual(comp.render(120), em(-1), "ainda contando");
		}
		agora += 16;
		assert.deepEqual(comp.render(120), em(0), "laço calmo: começa do zero");
		agora += 16;
		assert.deepEqual(comp.render(120), em(16));
		agora += 900; // laço travado 900 ms: anda só PASSO_MAX_MS
		assert.deepEqual(comp.render(120), em(16 + PASSO_MAX_MS));
		for (let i = 0; i < 200; i++) {
			agora += 16;
			comp.render(120);
		}
		assert.deepEqual(comp.render(120), em(Infinity), "assenta no fim");
	} finally {
		performance.now = real;
	}
});

// Abertura sem salto (2026-11-24): claude-rules carrega antes e publica o aviso de regras no session_start dela, antes do
// cabeçalho existir. Sem a marca da abertura o aviso abria na hora, no topo, e descia 9 linhas quando a marca entrava.
// A marca nasce no carregamento da extensão e o session_start reaproveita a mesma, então o aviso já espera a abertura.
test("abertura: a marca existe desde o carregamento e o session_start reaproveita a mesma", () => {
	const g = globalThis as Record<symbol, unknown>;
	g[__m1.ABERTURA] = undefined;
	let antes: unknown;
	const ctx = { hasUI: true, ui: { setHeader() {} } };
	header({
		on: (_n: string, h: (e: unknown, c: unknown) => void) => {
			antes = g[__m1.ABERTURA];
			assert.ok(antes, "marca criada no carregamento, antes de qualquer session_start");
			h({}, ctx);
		},
	} as any);
	assert.equal(g[__m1.ABERTURA], antes, "o aviso que guardou a marca é o que a abertura vai soltar");
});

// Abertura sem salto (2026-11-24): com a 1ª execução da Status Line pendente, o laço calmo não basta; a abertura (e a subida do
// editor) espera o widget entrar, para ele não empurrar o editor no meio da animação. ESPERA_MAX_MS continua de teto.
test("abertura no cabeçalho: espera a 1ª Status Line da sessão", () => {
	const real = performance.now;
	let agora = 60_000;
	performance.now = () => agora;
	try {
		marcarStatusPendente(true);
		const comp = setup(true, {}).calls[0]({ requestRender() {} }, theme);
		comp.render(120);
		for (let i = 0; i < CALMA_QUADROS + 3; i++) {
			agora += 16;
			assert.deepEqual(comp.render(120), buildHeaderLines(VERSION, theme, 120, -1), "status pendente: não começa");
		}
		marcarStatusPendente(false);
		agora += 16;
		assert.deepEqual(comp.render(120), buildHeaderLines(VERSION, theme, 120, 0), "status entrou: começa do zero");
	} finally {
		marcarStatusPendente(false);
		performance.now = real;
	}
});

test("abertura no cabeçalho: laço nunca calmo começa mesmo assim em ESPERA_MAX_MS", () => {
	const real = performance.now;
	let agora = 80_000;
	performance.now = () => agora;
	try {
		const comp = setup(true, {}).calls[0]({ requestRender() {} }, theme);
		comp.render(120);
		while (agora < 80_000 + ESPERA_MAX_MS - 40) {
			agora += 40;
			assert.deepEqual(comp.render(120), buildHeaderLines(VERSION, theme, 120, -1));
		}
		agora += 40;
		assert.deepEqual(comp.render(120), buildHeaderLines(VERSION, theme, 120, 0));
	} finally {
		performance.now = real;
	}
});

test("marca: abertura sem saltos (quadro a quadro, poucos pontos mudam) e o brilho termina antes de assentar", () => {
	const c = { claro: false, destaque: [80, 160, 250] as const };
	const cores = (t: number) =>
		Array.from({ length: 14 * MARCA_W }, (_, i) => ponto(i % MARCA_W, Math.floor(i / MARCA_W) - 1, t, c));
	const cur = (p: any) => p && p.join() === c.destaque.join();
	const dist = (a: any, b: any) =>
		!a || !b || cur(a) || cur(b) ? 255 : Math.max(...a.map((v: number, k: number) => Math.abs(v - b[k])));
	let ant = cores(0);
	for (let t = 16; t <= ABERTURA_MS; t += 16) {
		const at = cores(t);
		const salto = Math.max(0, ...at.map((p, i) => dist(p, ant[i])).filter((d) => d < 255)); // acender/apagar um ponto e o cursor passando não contam
		assert.ok(salto <= 140, `t=${t}: cor salta ${salto}`);
		ant = at;
	}
	assert.deepEqual(
		cores(ABERTURA_MS - 16),
		cores(Infinity),
		"o último quadro já é a marca assentada: nada pula ao assentar",
	);
	assert.deepEqual(
		marcaLinhas(-1, c, "truecolor").map(strip).join("").replace(/ /g, "").length > 0,
		true,
		"espera: cursor visível",
	);
});

// Quique: antes a letra assentava direto em 2 pontos; agora desloca 4 e quica.
test("marca: a letra quica ao assentar (desloca até 4 pontos, volta a 0, sobe de novo e assenta)", () => {
	const c = { claro: false };
	const topo = (t: number) => {
		for (let y = -1; y < 13; y++) if (ponto(2, y, t, c)) return y;
		return undefined;
	}; // haste do n: topo em 3
	const offs: number[] = [];
	for (let t = 0; t <= 600; t += 4) {
		const y = topo(t);
		if (y !== undefined && offs.at(-1) !== y - 3) offs.push(y - 3);
	}
	assert.equal(offs[0], 4, `começa 4 pontos fora: ${offs}`);
	assert.equal(offs.at(-1), 0);
	assert.ok(offs.indexOf(0) < offs.length - 1, `quica depois de tocar: ${offs}`);
});

// Barra que respira: antes o cursor da abertura era um bloco de 2 colunas e as letras
// entravam a cada 165 ms; agora uma barra de 1 coluna e ~15 % mais rápido.
test("marca: cursor em barra de 1 coluna e abertura mais rápida", () => {
	const c = { claro: false, destaque: [255, 0, 0] as const };
	const cols = new Set<number>();
	for (let y = 0; y < 13; y++)
		for (let x = 0; x < MARCA_W; x++) if (ponto(x, y, 10, c)?.join() === "255,0,0") cols.add(x);
	assert.deepEqual([...cols], [10], "uma coluna só");
	assert.ok(ABERTURA_MS < 1500, `abertura mais rápida: ${ABERTURA_MS}`);
});

// Abertura em sequência: a linha de texto nasce do fundo; editor, status e rodapé sobem do fundo.
const { TEXTO_MS, BASE_MS, subirBase } = __m3;
const rgbTema = {
	fg: (_k: string, s: string) => `\x1b[38;2;200;200;210m${s}\x1b[39m`,
	bold: (s: string) => s,
	getColorMode: () => "truecolor",
	getFgAnsi: (k: string) => (k === "accent" ? "\x1b[38;2;120;160;240m" : "\x1b[38;2;200;200;210m"),
	getBgAnsi: () => "\x1b[48;2;40;42;54m",
};
test("abertura: a linha `nycode versão` nasce do fundo em TEXTO_MS", () => {
	const cedo = buildHeaderLines("1.5.2", rgbTema as never, 200, TEXTO_MS / 4).at(-1) ?? "";
	const pronto = buildHeaderLines("1.5.2", rgbTema as never, 200, TEXTO_MS).at(-1) ?? "";
	assert.equal(strip(cedo), strip(pronto));
	assert.ok(
		!cedo.includes("38;2;200;200;210m") && pronto.includes("38;2;200;200;210m"),
		"cedo: cor entre o fundo e a do texto",
	);
	assert.equal(buildHeaderLines("1.5.2", rgbTema as never, 200, -1).at(-1), "", "antes da marca começar: vazia");
});

test("abertura: editor, status e rodapé sobem do fundo a partir de t0 e o embrulho sai no fim", () => {
	const real = performance.now;
	let agora = 1000;
	performance.now = () => agora;
	try {
		const filho = () => ({ render: (_w: number) => ["\x1b[38;2;200;200;210mPergunte\x1b[39m sem cor"] });
		const tui = { children: [0, 1, 2, 3, 4, 5, 6].map(filho) };
		const originais = tui.children.map((c) => c.render);
		const ab: { desde: number; t0?: number } = { desde: agora };
		subirBase(tui, rgbTema as never, ab);
		assert.equal(tui.children[0].render, originais[0], "documento fica de fora");
		assert.ok(tui.children[4].render(80)[0].startsWith("\x1b[38;2;40;42;54m"), "sem t0: cor do fundo");
		ab.t0 = agora;
		agora += BASE_MS / 2;
		const meio = tui.children[4].render(80)[0];
		assert.ok(
			/38;2;1[0-9]{2};/.test(meio) && strip(meio) === "Pergunte sem cor",
			`no meio: cor intermediária «${JSON.stringify(meio)}»`,
		);
		agora += BASE_MS;
		assert.equal(tui.children[6].render(80)[0], "\x1b[38;2;200;200;210mPergunte\x1b[39m sem cor", "pronto: intacto");
		assert.ok(!Object.hasOwn(tui.children[6], "render") || tui.children[6].render === originais[6], "embrulho saiu");
	} finally {
		performance.now = real;
	}
});

// O /reload sobe do fundo a tela inteira (chat, editor, abas e rodapé, filhos 0 a 6) em RECARGA_MS a partir do
// 1º desenho depois da recarga; do documento só as últimas `linhas` (as visíveis) passam pelo esmaecer, o resto vem intacto.
const { RECARGA_MS, recarregar } = __m4;
test("reload: todos os filhos sobem do fundo desde o 1º desenho; só as últimas linhas do documento; embrulho sai no fim", () => {
	const real = performance.now;
	let agora = 5000;
	performance.now = () => agora;
	try {
		const cor = "\x1b[38;2;200;200;210m";
		const doc = { render: (_w: number) => [`${cor}antiga\x1b[39m`, `${cor}visível\x1b[39m`] };
		const filho = () => ({ render: (_w: number) => [`${cor}Pergunte\x1b[39m`] });
		const tui = {
			children: [doc, 1, 2, 3, 4, 5, 6].map((x) => (typeof x === "number" ? filho() : x)),
			requestRender() {},
		};
		const originais = tui.children.map((c) => c.render);
		recarregar(tui, rgbTema as never, 1);
		agora += 800; // carga da recarga: o relógio só começa no 1º desenho
		const [antiga, visivel] = tui.children[0].render(80);
		assert.equal(antiga, `${cor}antiga\x1b[39m`, "fora da tela: intacta");
		assert.ok(visivel.startsWith("\x1b[38;2;40;42;54m"), `1º desenho: cor do fundo «${JSON.stringify(visivel)}»`);
		assert.ok(tui.children[5].render(80)[0].startsWith("\x1b[38;2;40;42;54m"), "abas e rodapé também");
		agora += RECARGA_MS / 2;
		assert.ok(/38;2;1[0-9]{2};/.test(tui.children[4].render(80)[0]), "no meio: cor intermediária");
		agora += RECARGA_MS;
		assert.deepEqual(
			tui.children.map((c) => c.render(80)[0]),
			[`${cor}antiga\x1b[39m`, ...Array(6).fill(`${cor}Pergunte\x1b[39m`)],
		);
		tui.children.forEach((c, i) => {
			assert.ok(c.render === originais[i], `embrulho saiu (${i})`);
		});
	} finally {
		performance.now = real;
	}
});

// O /reload esvazia a tela enquanto carrega (avisos limparTela); quadros vazios nesse meio não podem
// gastar o fade, senão a tela volta já pronta. O relógio começa no 1º desenho com conteúdo.
test("reload: quadros vazios da carga não começam o fade", () => {
	const real = performance.now;
	let agora = 9000;
	performance.now = () => agora;
	try {
		const cor = "\x1b[38;2;200;200;210m";
		let oculto = true;
		const filho = () => ({ render: (_w: number) => (oculto ? [] : [`${cor}bypass ligado\x1b[39m`]) });
		const tui = { children: [0, 1, 2, 3, 4, 5, 6].map(filho), requestRender() {} };
		recarregar(tui, rgbTema as never, 5);
		for (let i = 0; i < 20; i++) {
			agora += 33;
			for (const c of tui.children) c.render(80);
		}
		oculto = false;
		assert.ok(
			tui.children[6].render(80)[0].startsWith("\x1b[38;2;40;42;54m"),
			"tela volta: rodapé ainda na cor do fundo",
		);
		agora += RECARGA_MS / 2;
		assert.ok(/38;2;1[0-9]{2};/.test(tui.children[6].render(80)[0]), "no meio: cor intermediária");
	} finally {
		performance.now = real;
	}
});
