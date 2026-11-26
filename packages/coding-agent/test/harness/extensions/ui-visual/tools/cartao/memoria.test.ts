// memory em uma frase: ver memoria/linha.ts.
import assert from "node:assert/strict";
import { test } from "vitest";
import * as __m1 from "../../../../../../src/extensions/ui-visual/memoria/linha.ts";
import * as __m2 from "../../../../../../src/extensions/ui-visual/motion/vivo.ts";
import { ctx, plain as plain0, resolverOf } from "../base.ts";

const { linhaMemoria, resumoMemoria } = __m1;
const { iniciou, terminou } = __m2;

const RGB: Record<string, number[]> = {
	text: [200, 200, 200],
	accent: [100, 150, 250],
	dim: [90, 90, 90],
	success: [0, 200, 0],
	error: [220, 0, 0],
	warning: [220, 180, 0],
	muted: [140, 140, 140],
	syntaxType: [0, 200, 200],
	customMessageBg: [30, 30, 40],
};
const th = {
	fg: (c: string, t: string) => `<${c}>${t}</c>`,
	bold: (t: string) => `<b>${t}</b>`,
	getFgAnsi: (c: string) => `\x1b[38;2;${(RGB[c] ?? [1, 1, 1]).join(";")}m`,
	getBgAnsi: (c: string) => `\x1b[48;2;${(RGB[c] ?? [1, 1, 1]).join(";")}m`,
};
const plain = (s: string) => plain0(s).replace(/<\/?b>/g, "");
const AMB = ["NO_COLOR", "NYCODE_REDUCED_MOTION", "NYCODE_NERD_FONT"];
const amb = (f: () => void, env: Record<string, string> = {}) => {
	const salvo = Object.fromEntries(AMB.map((k) => [k, process.env[k]]));
	for (const k of AMB) delete process.env[k];
	process.env.NYCODE_NERD_FONT = "1";
	Object.assign(process.env, env);
	try {
		f();
	} finally {
		for (const k of AMB) {
			if (salvo[k] === undefined) delete process.env[k];
			else process.env[k] = salvo[k];
		}
	}
};
const txt = (text: string) => ({ content: [{ type: "text", text }] });
const INDEX =
	"# Memory index\n- [tema-nycode-noite](tema-nycode-noite.md): paleta\n- [a](a.md): x\n- [b](b.md): y\n- [c](c.md): z\n";
const desenha = (
	args: any,
	result: unknown,
	c: Record<string, unknown> = {},
	w = 200,
	hora = "00:54",
	agora = 5000,
) => {
	const st: any = { uiMem: result === undefined ? undefined : resumoMemoria(result, args, c.isError === true) };
	return linhaMemoria(args, st, th, ctx({ toolCallId: "mem-t", isPartial: false, ...c }), w, hora, {
		agora: () => agora,
	}) as string[];
};

test("resumo: nome, erro curto, trecho do read e contagem real do list a partir do texto cru do tool", () => {
	assert.deepEqual(resumoMemoria(txt("Saved memory spinner-only."), { action: "save", name: "Spinner Only" }, false), {
		nome: "spinner-only",
		trecho: [],
	});
	assert.equal(resumoMemoria(txt("No memory named x."), { action: "read", name: "x" }, false).erro, "não encontrada");
	assert.deepEqual(
		resumoMemoria(txt("---\nname: a\n---\nl1\n\nl2\nl3"), { action: "read", name: "a" }, false).trecho,
		["l1", "l2"],
	);
	assert.deepEqual(resumoMemoria(txt(INDEX), { action: "list" }, false), {
		nome: "4 memórias",
		trecho: ["tema-nycode-noite · a · b · +1"],
	});
	assert.equal(
		resumoMemoria(txt("No memories saved for this project yet."), { action: "list" }, false).nome,
		"0 memórias",
	);
	assert.equal(resumoMemoria(txt("boom\nx"), { action: "save" }, true).erro, "boom");
});

test("save: uma linha `Memory · saved · nome`, estado em success, · dim, hora dim à direita sem fundo", () =>
	amb(() => {
		const l = desenha({ action: "save", name: "x" }, txt("Saved memory x."));
		assert.equal(l.length, 1);
		assert.match(plain(l[0]!), /^\u{f09d1} Memory · saved · x +00:54$/u);
		assert.ok(
			l[0]!.startsWith(
				"<muted>\u{f09d1}</c> <text><b>Memory</b></c><dim> · </c><success>saved</c><dim> · </c><text>x</c>",
			),
		);
		assert.ok(l[0]!.endsWith("<dim>00:54</c>") && !/\x1b\[48/.test(l[0]!), "hora padrão, sem fundo");
	}));

test("cores por ação e erro com o motivo", () =>
	amb(() => {
		assert.ok(
			desenha({ action: "delete", name: "x" }, txt("Deleted memory x."))[0]!.includes("<warning>deleted</c>"),
		);
		assert.ok(desenha({ action: "read", name: "x" }, txt("corpo"))[0]!.includes("<accent>read</c>"));
		const e = desenha({ action: "read", name: "plano" }, txt("No memory named plano."));
		assert.match(plain(e[0]!), /Memory · failed · plano · não encontrada +00:54$/);
		assert.ok(e[0]!.includes("<error>failed</c>") && e[0]!.includes("<error>não encontrada</c>"));
	}));

test("read e list: trecho em muted recuado 3 abaixo", () =>
	amb(() => {
		const r = desenha({ action: "read", name: "a" }, txt("l1\nl2\nl3"));
		assert.deepEqual(r.slice(1).map(plain), ["   l1", "   l2"]);
		assert.ok(r[1]!.includes("<muted>l1</c>"));
		const l = desenha({ action: "list" }, txt(INDEX));
		assert.match(plain(l[0]!), /Memory · listed · 4 memórias/);
		assert.equal(plain(l[1]!), "   tema-nycode-noite · a · b · +1");
	}));

test("executando: sem spinner, o ícone respira e não há estado nem hora", () =>
	amb(() => {
		iniciou("mem-t", 1000);
		const l = desenha({ action: "save", name: "x" }, undefined, { isPartial: true }, 200, "", 1000);
		assert.equal(l.length, 1);
		assert.match(l[0]!, /^\x1b\[38;2;[\d;]+m\u{f09d1}\x1b\[39m /u);
		assert.doesNotMatch(plain(l[0]!), /saved|[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/);
		assert.notEqual(
			desenha({ action: "save", name: "x" }, undefined, { isPartial: true }, 200, "", 1800)[0],
			l[0],
			"respira",
		);
		terminou("mem-t");
	}));

test("nasce do fundo: ao terminar sobe em 450 ms, uma vez; histórico e movimento reduzido já assentados", () =>
	amb(() => {
		iniciou("mem-t", 0);
		terminou("mem-t", 10_000);
		const res = txt("Saved memory x.");
		const meio = desenha({ action: "save", name: "x" }, res, {}, 200, "00:54", 10_200)[0]!;
		const fim = desenha({ action: "save", name: "x" }, res, {}, 200, "00:54", 10_600)[0]!;
		assert.notEqual(meio, fim);
		assert.ok(/\x1b\[38;2;/.test(meio) && fim.includes("<success>saved</c>"));
		assert.ok(
			desenha({ action: "save", name: "y" }, res, { toolCallId: "nunca-visto" }, 200, "00:54", 10_200)[0]!.includes(
				"<success>saved</c>",
			),
			"histórico",
		);
		amb(
			() =>
				assert.ok(
					desenha({ action: "save", name: "x" }, res, {}, 200, "00:54", 10_200)[0]!.includes("<success>saved</c>"),
					"reduzido",
				),
			{ NYCODE_REDUCED_MOTION: "1" },
		);
	}));

test("integração: memory sem caixa nem fundo, o resultado cru não aparece fora da linha", () =>
	amb(() => {
		const w = resolverOf().resolver("memory", () => ({
			renderCall: () => ({ render: () => ["x"], invalidate() {} }),
			renderResult: () => ({ render: () => ["Saved memory x"], invalidate() {} }),
		}));
		const c = ctx({ toolCallId: "mem-int", args: { action: "save", name: "x" } });
		const out = w.renderResult(txt("Saved memory x."), { expanded: false, isPartial: false }, th, c).render(200);
		assert.deepEqual(out, []);
		const call = w.renderCall(c.args, th, c).render(200);
		assert.match(plain(call[0]), /Memory · saved · x/);
		assert.ok(!call.join("").includes("customMessageBg") && !call.join("").includes("x]"));
	}));
