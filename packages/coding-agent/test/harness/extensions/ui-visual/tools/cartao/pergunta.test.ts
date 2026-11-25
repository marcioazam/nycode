// Resultado da `question` em "Resposta em destaque": pergunta/bloco.ts.
import assert from "node:assert/strict";
import { test } from "vitest";
import * as __m2 from "../../../../../../src/extensions/ui-visual/motion/vivo.ts";
import * as __m1 from "../../../../../../src/extensions/ui-visual/pergunta/bloco.ts";
import { plain as plain0 } from "../base.ts";

const { perguntaCorpo } = __m1;
const { terminou } = __m2;

const RGB: Record<string, number[]> = {
	text: [200, 200, 200],
	dim: [90, 90, 90],
	syntaxType: [0, 200, 200],
	customMessageBg: [30, 30, 40],
};
const th = {
	fg: (c: string, t: string) => `<${c}>${t}</c>`,
	bold: (t: string) => t,
	getFgAnsi: (c: string) => `\x1b[38;2;${(RGB[c] ?? [1, 1, 1]).join(";")}m`,
	getBgAnsi: (c: string) => `\x1b[48;2;${(RGB[c] ?? [1, 1, 1]).join(";")}m`,
};
const plain = (s: string) => plain0(s);
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
const PS = [
	{ header: "Cor", question: "Qual cor?", options: ["Âmbar", "Azul"], answer: "Âmbar" },
	{ header: "Onde", question: "Em que telas?", answer: null },
];
const draw = (ps: unknown[], id: string, agora: number, o: Record<string, unknown> = {}) =>
	perguntaCorpo(
		ps as never,
		th,
		{ toolCallId: id },
		{ hora: () => "10:00", tecla: "ctrl+o", aberto: false, agora: () => agora, ...o },
	).render(200) as string[];

test("entrada: o bloco sobe do fundo em 450 ms na 1ª vez ao vivo; pronto depois; histórico e movimento reduzido já nascem prontos", () =>
	amb(() => {
		const pronto = draw(PS, "hist", 1e9);
		terminou("q-vivo", 1000);
		const k0 = draw(PS, "q-vivo", 1000),
			k5 = draw(PS, "q-vivo", 1225);
		assert.ok(k0[0]!.startsWith("\x1b[38;2;30;30;40m"), "em 0 a frente é a cor do fundo");
		assert.notEqual(k5[0], k0[0]);
		assert.equal(k0[2], "", "a linha em branco entre perguntas não ganha cor");
		assert.deepEqual(draw(PS, "q-vivo", 1000 + 450), pronto);
		assert.deepEqual(draw(PS, "q-vivo", 9e6), pronto, "não repete");
		// outra chamada nasce de novo
		terminou("q-2", 5000);
		assert.notDeepEqual(draw(PS, "q-2", 5000), pronto);
	}, {}));

test("entrada: movimento reduzido mostra o bloco pronto", () =>
	amb(
		() => {
			terminou("q-rm", 1000);
			assert.deepEqual(draw(PS, "q-rm", 1000), draw(PS, "q-rm", 1e9));
			assert.ok(!draw(PS, "q-rm", 1000).join("").includes("\x1b[38;2;30;30;40m"));
		},
		{ NYCODE_REDUCED_MOTION: "1" },
	));

test("aguardando: `aguardando resposta` respira entre dim e syntaxType, sem spinner braille", () =>
	amb(() => {
		const ps = [{ header: "Cor", question: "Qual cor?" }];
		const cor = (agora: number) => /(\x1b\[38;2;[\d;]+m)aguardando resposta/.exec(draw(ps, "q-w", agora)[1]!)?.[1];
		assert.equal(cor(0), `\x1b[38;2;${RGB.dim!.join(";")}m`);
		assert.equal(cor(800), `\x1b[38;2;${RGB.syntaxType!.join(";")}m`);
		for (const t of [0, 400, 800]) assert.doesNotMatch(draw(ps, "q-w", t).join(""), /[\u2800-\u28ff]/);
	}));

test("aberto: lista as opções sob a resposta, com a escolhida marcada; fechado não lista", () =>
	amb(() => {
		const fechado = draw(PS, "q-a", 1e9).map(plain);
		// na margem do chat; antes `   Cor · …` e `   ❯ …` (recuo LEAD + 1) e opções em 5 colunas.
		assert.deepEqual(
			fechado.slice(0, 2).map((l) => l.replace(/(?<=\S) {2,}.*$/, "")),
			["Cor · Qual cor?", "❯ Âmbar"],
		);
		const aberto = draw(PS, "q-a", 1e9, { aberto: true });
		assert.deepEqual(
			aberto.slice(2, 4).map(plain),
			["  ● Âmbar", "  ○ Azul"].map((l) => l),
		);
		assert.ok(aberto[2]!.includes("<success>●</c>") && aberto[3]!.includes("<dim>○</c>"));
		assert.match(plain(aberto[0]!), /ctrl\+o fecha/);
	}));
