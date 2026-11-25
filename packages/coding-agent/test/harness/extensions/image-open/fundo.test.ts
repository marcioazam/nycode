import assert from "node:assert/strict";
import { afterEach, beforeEach, test, vi } from "vitest";
import * as __r1 from "../../../../src/extensions/image-open/fundo.ts";
import * as __r2 from "../../../../src/extensions/image-open/fundo.ts";
import * as __r3 from "../../../../src/extensions/image-open/fundo.ts";
import * as __r4 from "../../../../src/extensions/image-open/fundo.ts";
import * as __r5 from "../../../../src/extensions/image-open/fundo.ts";
import { pintarImagem } from "../../../../src/extensions/image-open/fundo.ts";

// The rendering reads TERM: pin it so the suite does not depend on the shell it runs in.
beforeEach(() => {
	vi.stubEnv("TERM", "xterm-256color");
});
afterEach(() => {
	vi.unstubAllEnvs();
});

const bg = (s: string) => `<${s}>`;
const KITTY = "\x1b_Ga=T,f=100,q=2,C=1,r=3;AAAA\x1b\\";

test("spacer, linha da imagem, linhas reservadas e margem inferior ganham o fundo da tool; o topo fica intacto", () => {
	const lines = ["cabeçalho", "", KITTY, "", ""];
	assert.deepEqual(pintarImagem(lines, 4, 6, bg, 1), [
		"cabeçalho",
		"<      >",
		`< >${KITTY}<     >`, // recuo do Box antes, resto da linha depois (C=1: o cursor não anda)
		"<      >",
		"<      >",
		"<      >", // margem inferior
	]);
});

test("sem imagem (n=0) devolve as linhas como estão", () => {
	const lines = ["a", "b"];
	assert.equal(pintarImagem(lines, 0, 6, bg, 1), lines);
});

test("linha com texto (fallback sem suporte a imagem) recebe recuo e preenchimento até a largura", () => {
	assert.deepEqual(pintarImagem(["[img]"], 1, 8, bg, 1), ["< [img]  >", "<        >"]);
});

test("sequência iTerm2 (move o cursor) fica sem pintura para não deslocar a imagem", () => {
	const iterm = "\x1b]1337;File=inline=1:AAAA\x07";
	assert.deepEqual(pintarImagem([iterm], 1, 6, bg, 1), [iterm, "<      >"]);
});

const fg = (s: string) => `[${s}]`;
const vw = (s: string) => s.replace(/[<>[\]]/g, "").length;
const seq = (c: string) => `\x1b_Ga=T,f=100,q=2,C=1,${c};AAAA\x1b\\`;
const strip = (s: string) => s.replace(/\x1b_G.*?\x1b\\/g, "");

test("moldura arredondada fina em volta da imagem kitty (c=10, 3 linhas), tudo dentro do fundo", () => {
	const k = seq("c=10,r=3");
	const out = pintarImagem(["cab", "", k, "", ""], 4, 16, bg, 1, fg);
	assert.deepEqual(out, [
		"cab",
		"< [╭──────────╮]   >",
		`< [│]>${k}<          [│]   >`,
		"< [│]          [│]   >",
		"< [│]          [│]   >",
		"< [╰──────────╯]   >",
		"<                >",
	]);
	for (const l of out.slice(1)) assert.equal(vw(strip(l)), 16);
});

test("sem c=/r= parseáveis, sem fg ou largura estreita: sem moldura", () => {
	const k = seq("c=10");
	assert.deepEqual(pintarImagem(["", k, ""], 3, 20, bg, 1, fg).length, 4);
	assert.equal(pintarImagem(["", seq("r=2"), ""], 3, 20, bg, 1, fg).filter((l) => l.includes("╭")).length, 0);
	assert.equal(pintarImagem(["", seq("c=10,r=2"), ""], 3, 20, bg, 1).filter((l) => l.includes("╭")).length, 0);
	const estreito = pintarImagem(["", seq("c=10,r=2"), ""], 3, 12, bg, 1, fg);
	assert.equal(estreito.filter((l) => l.includes("╭")).length, 0);
	assert.equal(estreito.length, 4);
});

test("duas imagens: cada uma com a sua moldura e nenhuma linha passa da largura", () => {
	const k = seq("c=4,r=2");
	const out = pintarImagem(["cab", "", k, "", "", k, ""], 6, 10, bg, 1, fg);
	assert.equal(out.filter((l) => l.includes("╭")).length, 2);
	assert.equal(out.filter((l) => l.includes("╰")).length, 2);
	for (const l of out.slice(1)) assert.equal(vw(strip(l)), 10);
});

test("iTerm2 continua intacto mesmo com fg", () => {
	const iterm = "\x1b]1337;File=inline=1:AAAA\x07";
	assert.deepEqual(pintarImagem([iterm], 1, 6, bg, 1, fg), [iterm, "<      >"]);
});

// Fundo neutro atrás da imagem (customMessageBg); só muda em aviso (truncado: neutro puxado ao âmbar)
// ou erro (toolErrorBg). Antes era o verde de sucesso (toolSuccessBg) e o ciano em execução. O fundo respeita a margem do
// chat: com o chat-margin por dentro (linhas já com a margem), o fundo fica entre as margens; antes ia de ponta a ponta.
test("instalarFundo: fundo neutro, âmbar só em aviso e vermelho só em erro; respeita a margem do chat", async () => {
	const { instalarFundo } = __r1;
	const k = seq("c=4,r=2");
	const RGB: Record<string, string> = {
		customMessageBg: "40;42;54",
		toolErrorBg: "70;30;34",
		toolSuccessBg: "9;9;9",
		toolPendingBg: "8;8;8",
	};
	const tema = {
		bg: (c: string, s: string) => `\x1b[48;2;${RGB[c]}m${s}\x1b[49m`,
		fg: (_c: string, s: string) => s,
		getBgAnsi: (c: string) => `\x1b[48;2;${RGB[c]}m`,
		getFgAnsi: (c: string) => (c === "warning" ? "\x1b[38;2;240;180;80m" : "\x1b[38;2;200;200;200m"),
	};
	const img = { render: () => [k, ""] },
		sp = { render: () => [""] };
	// margem: o chat-margin (de dentro) renderiza na largura interna e põe 1 espaço sem fundo de cada lado; a imagem passa intacta
	class Comp {
		imageComponents = [img];
		imageSpacers = [sp];
		outputPad = 1;
		isPartial = false;
		result: any = {};
		render(w: number) {
			return [` cab${" ".repeat(w - 5)} `, "  ", k, "  "];
		}
	}
	instalarFundo(Comp.prototype as any, () => tema);
	const fundos = (ls: string[]) => [
		...new Set(ls.flatMap((l) => [...l.matchAll(/\x1b\[48;2;(\d+;\d+;\d+)m/g)].map((m) => m[1]))),
	];
	const c = new Comp();
	const out = c.render(40);
	assert.deepEqual(fundos(out), [RGB.customMessageBg], "neutro");
	for (const l of out.slice(1)) {
		assert.equal(strip(l).replace(/\x1b\[[0-9;]*m/g, "").length, 40);
		assert.ok(
			l.startsWith(" \x1b[48;2;") && /\x1b\[49m $/.test(l),
			`margem sem fundo dos dois lados: ${JSON.stringify(l)}`,
		);
	}
	assert.equal(out.filter((l) => l.includes("╭")).length, 1, "moldura volta com a margem certa");
	c.result = { isError: true };
	assert.deepEqual(fundos(c.render(40)), [RGB.toolErrorBg], "erro");
	c.result = { details: { truncation: { truncated: true } } };
	const av = fundos(c.render(40));
	assert.equal(av.length, 1);
	assert.ok(av[0] !== RGB.customMessageBg && Number(av[0]!.split(";")[0]) > 40, `aviso puxa ao âmbar: ${av}`);
	c.result = {};
	c.isPartial = true;
	assert.deepEqual(fundos(c.render(40)), [RGB.customMessageBg], "em execução também neutro");
});

// Miniatura + ficha: imagem do Read em MINI_COLS colunas e, à direita da
// moldura, nome, tipo · dimensões · tamanho e `clique abre`; outras tools seguem com a imagem na largura de antes.
test("ficha: linhas ao lado da moldura, cortadas com …; poucas linhas juntam as últimas com ·", () => {
	const k = seq("c=4,r=2");
	const ficha = { linhas: [["a.png", "png · 10×5 · 1 KB", "clique abre"]], cor: (_i: number, s: string) => s };
	const out = pintarImagem(["cab", "", k, ""], 3, 44, bg, 1, fg, ficha);
	// … antes o nome ficava na 1ª linha da imagem e a última linha na borda de baixo;
	// agora a ficha é centrada na moldura (4 linhas → 2 de texto, nas duas linhas da imagem).
	assert.match(strip(out[1]!), /\[╭────╮\] +>$/);
	assert.match(strip(out[2]!), /\[│\] {3}a\.png +>$/);
	assert.match(out[3]!, /\[│\] {3}png · 10×5 · 1 KB · clique abre +>$/);
	assert.match(out[4]!, /\[╰────╯\] +>$/);
	for (const l of out.slice(1)) assert.equal(vw(strip(l)), 44);
	const um = pintarImagem(["cab", "", seq("c=4,r=1")], 2, 50, bg, 1, fg, ficha); // 50: a junção (31 colunas) cabe sem corte
	assert.match(um[1]!, /a\.png +>$/); // moldura de 3 linhas: 3 linhas de texto, uma por linha da moldura
	assert.match(um[2]!, /png · 10×5 · 1 KB +>$/);
	assert.match(um[3]!, /clique abre +>$/);
	const curto = pintarImagem(["cab", "", k, ""], 3, 20, bg, 1, fg, ficha);
	for (const l of curto.slice(1)) assert.equal(vw(strip(l)), 20);
	assert.ok(curto.some((l) => l.includes("…")));
});

test("instalarFundo: Read encolhe a imagem para MINI_COLS e escreve a ficha; outra tool não", async () => {
	const { instalarFundo, MINI_COLS } = __r2;
	const tema = { bg: (_c: string, s: string) => s, fg: (_c: string, s: string) => s };
	class Comp {
		toolName = "read";
		args = { path: "/tmp/x/foto.png" };
		outputPad = 0;
		result: any = {};
		imageSpacers = [{ render: () => [""] }];
		imageComponents = [
			{
				options: { maxWidthCells: 60 } as { maxWidthCells?: number },
				mimeType: "image/png",
				base64Data: "A".repeat(4096),
				dimensions: { widthPx: 1712, heightPx: 345 },
				inv: 0,
				invalidate() {
					this.inv++;
				},
				render() {
					return [seq(`c=${this.options.maxWidthCells},r=2`), ""];
				},
			},
		];
		render(_w: number) {
			return ["cab", "", ...this.imageComponents[0]!.render()];
		}
	}
	instalarFundo(Comp.prototype as any, () => tema);
	const c = new Comp();
	const out = c.render(80).map(strip).join("\n");
	assert.equal(c.imageComponents[0]!.options.maxWidthCells, MINI_COLS);
	assert.ok(out.includes("foto.png") && out.includes("png · 1712×345 · 3 KB") && out.includes("clique abre"), out);
	c.render(80);
	assert.equal(c.imageComponents[0]!.inv, 1, "invalida uma vez só");
	const b = new Comp();
	b.toolName = "bash";
	const ob = b.render(80).map(strip).join("\n");
	assert.equal(b.imageComponents[0]!.options.maxWidthCells, 60);
	assert.ok(!ob.includes("foto.png"));
});

// Moldura alinhada com a margem do chat: o chat-margin põe 1 espaço dos dois lados também
// na linha da imagem; a moldura somava esses espaços e o `│` direito e a ficha saíam 2 colunas à direita.
test("instalarFundo: linha da imagem com a margem do chat fica alinhada à moldura", async () => {
	const { instalarFundo } = __r3;
	const tema = { bg: (_c: string, s: string) => s, fg: (_c: string, s: string) => s };
	const k = seq("c=16,r=1");
	class Comp {
		toolName = "read";
		args = { path: "/tmp/a.png" };
		outputPad = 1;
		result: any = {};
		imageSpacers = [{ render: () => [""] }];
		imageComponents = [
			{ options: { maxWidthCells: 16 }, mimeType: "image/png", base64Data: "AAAA", render: () => [k] },
		];
		render(w: number) {
			return [` cab${" ".repeat(w - 5)} `, "  ", ` ${k} `];
		}
	}
	instalarFundo(Comp.prototype as any, () => tema);
	const out = new Comp().render(60).map(strip);
	// … antes o 1º `│` da saída era o da miniatura; agora a moldura externa vem antes, então
	// a linha da imagem é a seguinte ao topo e os dois `│` da miniatura ficam sob o ╭ e o ╮.
	const topo = out.find((l) => l.includes("╭"))!,
		img = out[out.indexOf(topo) + 1]!;
	assert.equal(img[topo.indexOf("╭")], "│", `│ sob o ╭:\n${topo}\n${img}`);
	assert.equal(img[topo.indexOf("╮")], "│", `│ sob o ╮:\n${topo}\n${img}`);
	for (const l of out.slice(1)) assert.equal(l.length, 60);
});

// Moldura do resultado: `│` dos dois lados da caixa da miniatura e
// `╰─…─╯` embaixo (o cabeçalho dobra em ╮ no ui-visual); a miniatura continua emoldurada por dentro e a caixa mantém o fundo.
const mf = (s: string) => `{${s}}`;
test("moldura: a caixa ganha │ dos dois lados e o fecho ╰─╯; a miniatura e a ficha seguem dentro, na largura inteira", () => {
	const k = seq("c=4,r=2");
	const ficha = { linhas: [["a.png", "png", "clique abre"]], cor: (_i: number, s: string) => s };
	const out = pintarImagem(["cab", "", k, ""], 3, 30, bg, 1, fg, ficha, mf);
	assert.equal(out[0], "cab");
	assert.ok(out[1]!.startsWith("{│}") && out[1]!.endsWith("{│}"), out[1]);
	assert.equal(out.at(-1), `{╰${"─".repeat(28)}╯}`);
	assert.ok(
		out.some((l) => strip(l).includes("╭") && l.startsWith("{│}")),
		"miniatura emoldurada por dentro",
	);
	assert.match(out[3]!, /\[│\]/);
	for (const l of out.slice(1)) assert.equal(strip(l).replace(/[{}<>[\]]/g, "").length, 30, l);
	assert.ok(out.some((l) => strip(l).includes("a.png")));
});

test("moldura: sem miniatura emoldurada (iTerm2, estreito, sem fg) o desenho de antes, sem │ de fora", () => {
	const iterm = "\x1b]1337;File=inline=1:AAAA\x07";
	assert.deepEqual(pintarImagem([iterm], 1, 30, bg, 1, fg, undefined, mf), pintarImagem([iterm], 1, 30, bg, 1, fg));
	const k = seq("c=4,r=2");
	assert.deepEqual(
		pintarImagem(["", k, ""], 3, 20, bg, 1, fg, undefined, mf),
		pintarImagem(["", k, ""], 3, 20, bg, 1, fg),
		"estreito",
	);
	assert.deepEqual(
		pintarImagem(["", k, ""], 3, 30, bg, 1, undefined, undefined, mf),
		pintarImagem(["", k, ""], 3, 30, bg, 1),
		"sem fg",
	);
});

test("instalarFundo: moldura em borderMuted (error no erro) só no Read; nasce do fundo em 450 ms se visto executando, uma vez", async () => {
	const { instalarFundo } = __r4;
	delete process.env.NYCODE_REDUCED_MOTION;
	delete process.env.NO_COLOR;
	const k = seq("c=4,r=2");
	const tema = {
		bg: (_c: string, s: string) => s,
		fg: (c: string, s: string) =>
			`\x1b[38;2;${c === "error" ? "9;0;0" : c === "borderMuted" ? "0;0;9" : "5;5;5"}m${s}\x1b[39m`,
		getBgAnsi: () => "\x1b[48;2;40;42;54m",
		getFgAnsi: () => "\x1b[38;2;200;200;200m",
	};
	let agora = 1000;
	class Comp {
		toolName = "read";
		args = { path: "/tmp/a.png" };
		outputPad = 0;
		isPartial = true;
		result: any = {};
		imageSpacers = [{ render: () => [""] }];
		imageComponents = [
			{ options: { maxWidthCells: 4 }, mimeType: "image/png", base64Data: "AAAA", render: () => [k, ""] },
		];
		render(_w: number) {
			return this.isPartial ? ["cab"] : ["cab", "", k, ""];
		}
	}
	instalarFundo(
		Comp.prototype as any,
		() => tema,
		() => agora,
	);
	const c = new Comp();
	c.render(40);
	c.isPartial = false;
	const t0 = c.render(40);
	agora = 1200;
	const t200 = c.render(40);
	agora = 1500;
	const t500 = c.render(40);
	assert.ok(t500[1]!.includes("\x1b[38;2;0;0;9m│"), "borderMuted");
	assert.ok(t500.at(-1)!.includes("\x1b[38;2;0;0;9m╰"));
	assert.notEqual(t0[1], t500[1]);
	assert.notEqual(t200[1], t500[1]);
	assert.equal(t0[0], "cab", "o cabeçalho não é mexido");
	c.result = { isError: true };
	assert.ok(c.render(40)[1]!.includes("\x1b[38;2;9;0;0m│"), "error");
	const h = new Comp();
	h.isPartial = false; // histórico: nunca visto executando
	agora = 1000;
	assert.deepEqual(h.render(40), h.render(40));
	assert.ok(h.render(40)[1]!.includes("\x1b[38;2;0;0;9m│") && !h.render(40)[1]!.includes("\x1b[38;2;4"), "assentado");
	const b = new Comp();
	b.toolName = "bash";
	b.isPartial = false;
	assert.ok(!b.render(40).some((l) => l.includes("\x1b[38;2;0;0;9m")), "outra tool sem moldura");
});

// Ficha centrada na moldura: para cada proporção e largura, o centro das linhas de texto é o centro da moldura.
test("instalarFundo: a ficha fica centrada na moldura da miniatura (larga, quadrada, alta; 80/110/180)", async () => {
	const { instalarFundo } = __r5;
	const tema = { bg: (_c: string, s: string) => s, fg: (_c: string, s: string) => s };
	for (const [nome, wpx, hpx] of [
		["larga", 1675, 75],
		["quadrada", 512, 512],
		["alta", 300, 900],
	] as const) {
		const R = Math.min(24, Math.max(1, Math.round((16 * hpx) / wpx / 2)));
		class Comp {
			toolName = "read";
			args = { path: "/tmp/x/foto.png" };
			outputPad = 0;
			result: any = {};
			imageSpacers = [{ render: () => [""] }];
			imageComponents = [
				{
					options: { maxWidthCells: 16 },
					mimeType: "image/png",
					base64Data: "A".repeat(4096),
					dimensions: { widthPx: wpx, heightPx: hpx },
					render: () => [seq(`c=16,r=${R}`), ...Array(R - 1).fill("")],
				},
			];
			render(_w: number) {
				return ["cab", "", ...this.imageComponents[0]!.render()];
			}
		}
		instalarFundo(Comp.prototype as any, () => tema);
		for (const w of [80, 110, 180]) {
			const out = new Comp().render(w).map(strip);
			const topo = out.findIndex((l) => l.includes("╭")),
				base = out.findIndex((l) => l.includes("╰"));
			assert.equal(base - topo + 1, R + 2, `${nome} ${w}: moldura de ${R + 2} linhas`);
			const com = out.flatMap((l, i) =>
				l.includes("foto.png") || l.includes("png ·") || l.includes("clique abre") ? [i] : [],
			);
			assert.ok(com.length >= 2 && com.length <= 3, `${nome} ${w}: linhas da ficha ${com}`);
			assert.equal(com.at(-1)! - com[0]! + 1, com.length, "linhas seguidas");
			assert.equal(
				com[0]! + com.at(-1)!,
				topo + base,
				`${nome} ${w}: texto ${com} centrado na moldura ${topo}-${base}`,
			);
		}
	}
});
