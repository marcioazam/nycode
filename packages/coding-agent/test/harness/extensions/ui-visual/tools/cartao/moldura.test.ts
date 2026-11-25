// Moldura do resultado de Read/Write: ver moldura/quadro.ts.
import assert from "node:assert/strict";
import { setCapabilities } from "@nycode/tui";
import { test } from "vitest";
import * as __m3 from "../../../../../../src/extensions/image-open/fundo.ts";
import * as __m1 from "../../../../../../src/extensions/ui-visual/moldura/quadro.ts";
import * as __m2 from "../../../../../../src/extensions/ui-visual/motion/vivo.ts";
import { ctx, plain, result, visibleWidth, wrapped } from "../base.ts";

delete process.env.NO_COLOR;
delete process.env.NYCODE_REDUCED_MOTION;
const { quadro } = __m1;
const { iniciou, terminou } = __m2;
const RGB: Record<string, string> = {
	customMessageBg: "40;42;54",
	toolErrorBg: "70;30;34",
	borderMuted: "59;66;97",
	error: "230;90;90",
	success: "120;200;120",
	text: "200;200;200",
	syntaxType: "120;200;220",
};
const mk = (bg = true) => ({
	fg: (c: string, t: string) => `\x1b[38;2;${RGB[c] ?? "150;150;150"}m${t}\x1b[39m`,
	bold: (t: string) => t,
	...(bg ? { bg: (c: string, t: string) => `\x1b[48;2;${RGB[c] ?? "1;1;1"}m${t}\x1b[49m` } : {}),
	getBgAnsi: (c: string) => `\x1b[48;2;${RGB[c] ?? "1;1;1"}m`,
	getFgAnsi: (c: string) => `\x1b[38;2;${RGB[c] ?? "200;200;200"}m`,
});
const th = mk();
const OK = { expanded: false, isPartial: false };
const kitty = (v: boolean) => setCapabilities({ images: v ? "kitty" : null, trueColor: true, hyperlinks: false });
const erro = (t: string) => ({ content: [{ type: "text", text: t }], isError: true });
let n = 0;
const montar = (
	name: string,
	args: Record<string, unknown>,
	r: unknown,
	opts = OK,
	c: Record<string, unknown> = {},
	tema: any = th,
) => {
	const w0 = wrapped(name),
		shared = ctx({ args, toolCallId: `mo-${n++}`, ...c });
	const corpo = w0.renderResult(r, opts, tema, shared);
	return { cab: w0.renderCall(args, tema, shared).render(60)[0] as string, corpo, shared, w0 };
};
const imgR = {
	content: [
		{ type: "text", text: "Read image file [image/png]" },
		{ type: "image", data: "AAAA", mimeType: "image/png" },
	],
};
const AMB = ["NO_COLOR", "NYCODE_ASCII_ICONS"];
const sem = (env: Record<string, string>, f: () => void) => {
	Object.assign(process.env, env);
	try {
		f();
	} finally {
		for (const k of AMB) delete process.env[k];
	}
};

test("Read com erro: a régua dobra em ╮ e o corpo desce em │ … │ com o respiro e o fecho ╰─╯, tudo na cor de erro", () => {
	const { cab, corpo } = montar("read", { path: "a.ts" }, erro("ENOENT: sumiu\nsegunda"), OK, { isError: true });
	assert.match(plain(cab), /^\S+ Read · erro · a\.ts ─+ ╮$/);
	assert.equal(visibleWidth(plain(cab)), 60);
	assert.ok(cab.includes(`\x1b[38;2;${RGB.error}m╮`), "dobra na cor de erro");
	const rows = corpo.render(60);
	assert.deepEqual(rows.map(plain), [
		`│ ENOENT: sumiu${" ".repeat(43)} │`,
		`│${" ".repeat(58)}│`,
		`╰${"─".repeat(58)}╯`,
	]);
	assert.ok(rows[0]!.startsWith(`\x1b[38;2;${RGB.error}m│`) && rows[2]!.includes(`\x1b[38;2;${RGB.error}m╰`));
	assert.ok(rows[0]!.includes(`\x1b[48;2;${RGB.customMessageBg}m`), "caixa neutra por dentro");
});

test("Read aberto (alt+o) emoldura o corpo nativo na cor borderMuted; fechado e de texto não ganha moldura nem ╮", () => {
	const ab = montar("read", { path: "a.ts" }, result("x"), { expanded: true, isPartial: false });
	assert.match(plain(ab.cab), /─ +1 linha +╮$/);
	assert.ok(ab.cab.includes(`\x1b[38;2;${RGB.borderMuted}m╮`));
	assert.deepEqual(ab.corpo.render(40).map(plain), [
		`│ native-result${" ".repeat(23)} │`,
		`│${" ".repeat(38)}│`,
		`╰${"─".repeat(38)}╯`,
	]);
	const fe = montar("read", { path: "a.ts" }, result("x"));
	assert.doesNotMatch(plain(fe.cab), /╮/);
	assert.deepEqual(fe.corpo.render(40), []);
});

test("Write: o aviso de sintaxe vem emoldurado; o cabeçalho dobra", () => {
	const r = { ...result("ok"), details: { sintaxe: { linguagem: "ts", linha: 3, mensagem: "m" } } };
	const { cab, corpo } = montar("write", { path: "a.ts", content: "x" }, r);
	assert.match(plain(cab), /Write · a\.ts ─+ 1 linha ╮$/);
	const rows = corpo.render(60).map(plain);
	assert.ok(rows[0]!.startsWith("│ ") && rows.at(-1)!.startsWith("╰"), rows.join("\n"));
});

test("Read de imagem no kitty: o cabeçalho dobra (a miniatura é emoldurada por image-open/fundo.ts); sem kitty fica reto", () => {
	kitty(true);
	try {
		const a = montar("read", { path: "a.png" }, imgR);
		assert.match(plain(a.cab), /─ ╮$/);
		assert.deepEqual(
			a.corpo.render(60).map(plain),
			[`│${" ".repeat(58)}│`],
			"respiro com │ dos dois lados (antes uma linha em branco abria buraco)",
		);
		const e = montar("read", { path: "a.png" }, imgR, { expanded: true, isPartial: false });
		assert.deepEqual(
			e.corpo.render(60).map(plain),
			[`│${" ".repeat(58)}│`],
			"aberto não escreve o texto nativo entre o cabeçalho e a miniatura",
		);
		kitty(false);
		assert.doesNotMatch(plain(montar("read", { path: "a.png" }, imgR).cab), /╮/);
	} finally {
		kitty(false);
	}
});

test("fallback sem cor, NO_COLOR ou ASCII: sem moldura, o desenho de antes (│ do detalhe)", () => {
	const casos: [string, () => ReturnType<typeof montar>][] = [
		["tema sem bg", () => montar("read", { path: "a.ts" }, erro("ENOENT"), OK, { isError: true }, mk(false))],
		[
			"NO_COLOR",
			() => {
				process.env.NO_COLOR = "1";
				return montar("read", { path: "a.ts" }, erro("ENOENT"), OK, { isError: true });
			},
		],
		[
			"ASCII",
			() => {
				process.env.NYCODE_ASCII_ICONS = "1";
				return montar("read", { path: "a.ts" }, erro("ENOENT"), OK, { isError: true });
			},
		],
	];
	for (const [nome, f] of casos)
		sem({}, () => {
			const { cab, corpo } = f();
			assert.doesNotMatch(plain(cab), /╮/, nome);
			assert.match(plain(corpo.render(60)[0]!), /│ ENOENT/, nome);
			assert.ok(!corpo.render(60).some((l: string) => plain(l).includes("╰")), nome);
		});
});

test("estreito (< 24 colunas) não dobra o cabeçalho", () => {
	const w0 = wrapped("read"),
		c = ctx({ args: { path: "a.ts" }, toolCallId: "mo-est", isError: true });
	w0.renderResult(erro("x"), OK, th, c);
	assert.doesNotMatch(plain(w0.renderCall({ path: "a.ts" }, th, c).render(20)[0]), /╮/);
});

test("nasce do fundo: o corpo chegou agora sobe em 450 ms; histórico e movimento reduzido já assentados", () => {
	const c = ctx({ toolCallId: "mo-nasce", isError: true });
	const q = (agora: number, cc = c) =>
		quadro(
			() => ["ENOENT"],
			th,
			cc,
			true,
			() => agora,
		).render(40);
	iniciou("mo-nasce", 0);
	terminou("mo-nasce", 10_000);
	const ini = q(10_000),
		meio = q(10_200),
		fim = q(10_600);
	assert.notEqual(ini[0], meio[0]);
	assert.notEqual(meio[0], fim[0]);
	assert.ok(fim[0]!.includes(`\x1b[38;2;${RGB.error}m│`), "assentado nas cores do tema");
	assert.deepEqual(q(10_200, ctx({ toolCallId: "nunca-visto", isError: true })), fim, "histórico");
	process.env.NYCODE_REDUCED_MOTION = "1";
	try {
		assert.deepEqual(q(10_200), fim, "reduzido");
	} finally {
		delete process.env.NYCODE_REDUCED_MOTION;
	}
});

// Alinhamento das bordas: cabeçalho + corpo + caixa da miniatura (fundo.ts) em largura `w`, sem ANSI nem APC kitty.
const { instalarFundo } = __m3;
const semAnsi = (l: string) => plain(l.replace(/\x1b_G.*?\x1b\\/g, ""));
const KSEQ = "\x1b_Ga=T,f=100,q=2,C=1,c=16,r=3;AAAA\x1b\\";
function imagemRows(w: number) {
	const a = montar("read", { path: "a.png" }, imgR);
	const proto = { render: (_w: number) => [...a.corpo.render(w), "", KSEQ, "", ""] };
	instalarFundo(proto, () => th as never);
	const tool = {
		toolName: "read",
		args: { path: "a.png" },
		imageComponents: [
			{
				render: () => [KSEQ, "", ""],
				options: { maxWidthCells: 16 },
				mimeType: "image/png",
				base64Data: "AAAA",
				dimensions: { widthPx: 10, heightPx: 3 },
			},
		],
		imageSpacers: [{ render: () => [""] }],
		outputPad: 0,
	};
	return [
		plain(a.w0.renderCall({ path: "a.png" }, th, a.shared).render(w)[0] as string),
		...proto.render.call(tool, w).map(semAnsi),
	];
}
const confere = (rows: string[], w: number, nome: string) => {
	const [cab, ...resto] = rows;
	assert.equal(visibleWidth(cab!), w, `${nome}: cabeçalho na largura`);
	assert.ok(cab!.endsWith(" ╮"), `${nome}: ╮ na última coluna`);
	assert.ok(!/\d\d:\d\d$/.test(cab!), `${nome}: a hora não vem depois do ╮`);
	resto.forEach((l, i) => {
		const ult = i === resto.length - 1,
			e = ult ? "╰" : "│",
			d = ult ? "╯" : "│";
		assert.equal(visibleWidth(l), w, `${nome} linha ${i}: largura ${JSON.stringify(l)}`);
		assert.equal([...l][0], e, `${nome} linha ${i}: borda esquerda`);
		assert.equal([...l].at(-1), d, `${nome} linha ${i}: borda direita alinhada ao ╮`);
	});
};

test("Read de imagem (kitty): ╮, │ de cada linha da caixa, ╰ e ╯ nas mesmas colunas em 80, 110 e 180", () => {
	kitty(true);
	try {
		for (const w of [80, 110, 180]) {
			const rows = imagemRows(w);
			assert.ok(
				rows.some((l) => l.includes("╭")) && rows.some((l) => l.includes("clique abre")),
				`${w}: miniatura e ficha`,
			);
			confere(rows, w, `imagem ${w}`);
		}
	} finally {
		kitty(false);
	}
});

test("Read de texto aberto e Read com erro: as bordas ficam nas mesmas colunas do ╮ em 80, 110 e 180", () => {
	for (const w of [80, 110, 180]) {
		const ab = montar("read", { path: "a.ts" }, result("x"), { expanded: true, isPartial: false });
		const er = montar("read", { path: "a.ts" }, erro("ENOENT"), OK, { isError: true });
		for (const [nome, m] of [
			["aberto", ab],
			["erro", er],
		] as const) {
			const cab = plain(m.w0.renderCall({ path: "a.ts" }, th, m.shared).render(w)[0] as string);
			confere([cab, ...m.corpo.render(w).map(semAnsi)], w, `${nome} ${w}`);
		}
	}
});
