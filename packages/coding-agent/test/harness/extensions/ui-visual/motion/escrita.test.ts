// node --experimental-strip-types --test extensions/ui-visual/motion/test/escrita.test.ts
import assert from "node:assert/strict";
import { afterAll, afterEach, test } from "vitest";
import { definirMovimento } from "../../../../../src/extensions/ui/a11y.ts";
import {
	ATRASO_MAX_MS,
	barraAlfa,
	CPS,
	instalarEscrita,
	novoEstado,
	PAUSA_MS,
	rotulo,
	suavizar,
	TINTA_MS,
	tinta,
	tintaAlfa,
	trechos,
} from "../../../../../src/extensions/ui-visual/motion/escrita.ts";
import { definirFoco, relogio, tique } from "../../../../../src/extensions/ui-visual/motion/motion.ts";

process.env.TERM = "xterm-256color";
delete process.env.NO_COLOR;
delete process.env.NYCODE_REDUCED_MOTION;
const real = { ...relogio };
relogio.set = () => 0;
relogio.clear = () => {};
afterAll(() => Object.assign(relogio, real));
afterEach(() => {
	definirFoco(undefined);
	definirMovimento(undefined);
});

const strip = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");
const tema = { fg: (_c: string, t: string) => t, italic: (t: string) => t };
const txt = (s: string) => ({ content: [{ type: "text", text: s }] });

test("suavizar: ritmo constante de CPS letras por segundo, corta só o último bloco e termina com o texto inteiro", () => {
	const e = novoEstado();
	const msg = {
		content: [
			{ type: "thinking", thinking: "pronto" },
			{ type: "text", text: "a".repeat(40) },
		],
	};
	assert.equal(suavizar(e, msg, 1000).msg.content[1]!.text, "", "no primeiro quadro nada foi escrito ainda");
	const r = suavizar(e, msg, 1100);
	assert.equal(r.msg.content[1]!.text!.length, Math.floor(CPS / 10));
	assert.equal(r.falta, true);
	assert.equal(r.msg.content[0], msg.content[0], "blocos anteriores intactos");
	assert.equal(msg.content[1]!.text!.length, 40, "a mensagem real não é alterada");
	const fim = suavizar(e, msg, 1300);
	assert.deepEqual([fim.msg, fim.falta], [msg, false]);
});

test("suavizar: rajada grande não fica mais de ATRASO_MAX_MS atrás; bloco novo recomeça; par substituto não é cortado", () => {
	const e = novoEstado();
	const grande = txt("b".repeat(5000));
	suavizar(e, grande, 0);
	assert.equal(suavizar(e, grande, ATRASO_MAX_MS).falta, false, "alcança o texto em ATRASO_MAX_MS");
	const dois = { content: [...grande.content, { type: "text", text: "novo bloco" }] };
	assert.equal(suavizar(e, dois, 300).msg.content[1]!.text, "", "bloco novo começa do zero");
	const emoji = novoEstado();
	const m = txt("😀".repeat(200));
	suavizar(emoji, m, 0);
	for (let t = 1; t < 200; t += 7) {
		const s = suavizar(emoji, m, t).msg.content[0]!.text!;
		assert.equal(s.length % 2, 0, `corte em ${t} ms dentro de um par substituto`);
	}
	assert.deepEqual(
		suavizar(novoEstado(), { content: [{ type: "toolCall" }] }, 0).falta,
		false,
		"bloco que não é texto passa direto",
	);
});

test("tinta: só as letras ainda molhadas mudam de cor, da cor do fundo para a do texto; texto visível igual; seca devolve as linhas", () => {
	const e = novoEstado();
	const m = txt("abcdef ghij");
	suavizar(e, m, 0);
	suavizar(e, m, 10); // 3 letras
	suavizar(e, m, 20); // 6 letras
	const cores = { texto: [200, 200, 200] as const, fundo: [0, 0, 0] as const };
	const linhas = [" \x1b[1mabc\x1b[22mdef "];
	// Tinta longa: antes medido em 20 ms (saída cúbica, 180 ms); agora a curva começa devagar (entrada
	// cúbica em 320 ms) e em 20 ms as letras ainda são quase do fundo: mede em 140 ms, com as idades 140 e 130 ms distintas.
	const out = tinta(linhas, e, 140, cores);
	assert.equal(strip(out[0]!), " abcdef ", "texto visível igual");
	assert.deepEqual(linhas, [" \x1b[1mabc\x1b[22mdef "], "não altera a entrada");
	const cinzas = [...out[0]!.matchAll(/\x1b\[38;2;(\d+);\1;\1m(\w)/g)].map((x) => [x[2], Number(x[1])]);
	assert.deepEqual(
		cinzas.map((c) => c[0]),
		["a", "b", "c", "d", "e", "f"],
	);
	assert.ok((cinzas[0]![1] as number) > (cinzas[5]![1] as number), "letra mais velha mais perto da cor final");
	assert.ok(
		(cinzas[5]![1] as number) < 200 && out[0]!.endsWith("\x1b[39m "),
		"a mais nova ainda apagada; cor fechada no fim",
	);
	assert.ok(out[0]!.includes("\x1b[1m") && out[0]!.includes("\x1b[22m"), "negrito do Markdown preservado");
	// Cor própria do trecho (código, link) é o alvo do degradê, não a cor do texto.
	const cod = tinta(["\x1b[38;2;255;0;0mabcdef\x1b[39m"], e, 20, cores);
	assert.match(cod[0]!, /\x1b\[38;2;\d+;0;0mf/);
	suavizar(e, m, 20 + TINTA_MS + 1);
	const seco = tinta(linhas, e, 20 + 2 * TINTA_MS + 50, cores);
	assert.deepEqual(strip(seco[0]!), " abcdef ");
	assert.equal(tinta(linhas, novoEstado(), 0, cores), linhas, "sem marcos: as mesmas linhas");
	assert.equal(tinta(linhas, e, 20, { texto: cores.texto }), linhas, "sem cor de fundo: as mesmas linhas");
});

test("tinta longa: 270 ms com entrada e saída suaves (antes 180 ms com saída cúbica)", () => {
	// ~15 % mais rápido: antes 320 ms; agora 270 ms, a mesma curva.
	assert.equal(TINTA_MS, 270);
	assert.equal(tintaAlfa(0), 0);
	assert.ok(tintaAlfa(TINTA_MS / 4) < 0.1, "começa devagar (a saída cúbica já daria 0,58)");
	assert.ok(Math.abs(tintaAlfa(TINTA_MS / 2) - 0.5) < 1e-9, "meio do caminho no meio do tempo");
	assert.ok(tintaAlfa(TINTA_MS * 0.75) > 0.9, "termina devagar");
	assert.equal(tintaAlfa(TINTA_MS), 1);
	assert.equal(tintaAlfa(10 * TINTA_MS), 1);
});

test("rotulo: pensando… com tempo e palavras enquanto pensa; raciocinou N s ao terminar; plural e tecla", () => {
	const base = { palavras: 56, tecla: "alt+t", now: 0 };
	assert.match(
		strip(rotulo(tema, { ...base, ativo: true, ms: 4200 })),
		/^\S+ +pensando… · 4 s · 56 palavras · alt\+t abre$/,
	);
	assert.match(
		strip(rotulo(tema, { ...base, ativo: false, ms: 7400 })),
		/^\S+ +raciocinou 7 s · 56 palavras · alt\+t abre$/,
	);
	assert.match(
		strip(rotulo(tema, { ...base, ativo: false, ms: 83_000, palavras: 1 })),
		/raciocinou 1 min 23 s · 1 palavra · alt\+t abre$/,
	);
	assert.match(
		strip(rotulo(tema, { ...base, ativo: false, tecla: "" })),
		/raciocínio · 56 palavras · clique abre$/,
		"histórico: sem duração",
	);
	// Brilho no rótulo (variante 2): em truecolor as letras de `pensando…` ganham cor própria durante a varredura.
	const brilho = rotulo(tema, { ...base, ativo: true, ms: 0, now: 300, cor: [120, 120, 140] });
	assert.ok((brilho.match(/\x1b\[38;2;/g) ?? []).length >= 3, "varredura de cor nas letras");
	assert.match(strip(brilho), /pensando… · 0 s/);
});

test("trechos: junta blocos de raciocínio seguidos, ignora os vazios e marca o que ainda está chegando", () => {
	const m = {
		content: [
			{ type: "thinking", thinking: " um " },
			{ type: "thinking", thinking: "dois" },
			{ type: "text", text: "x" },
			{ type: "thinking", thinking: "  " },
			{ type: "thinking", thinking: "três quatro" },
		],
	};
	assert.deepEqual(trechos(m), [
		{ texto: "um\n\ndois", ultimo: false },
		{ texto: "três quatro", ultimo: true },
	]);
});

// Componente falso com o contrato que o wrapper usa do AssistantMessageComponent do nycode 1.5.2.
class Text {
	text = "";
	constructor(t = "") {
		this.text = t;
	}
	setText(t: string) {
		this.text = t;
	}
}
class Markdown {
	text: string;
	constructor(t = "") {
		this.text = t;
	}
}
class MouseRegion {
	child: object;
	constructor(c: object) {
		this.child = c;
	}
}
const fabrica = () => {
	class Assistant {
		lastMessage: any;
		isStreaming = false;
		hideThinkingBlock = true;
		contentContainer = { children: [] as object[] };
		vistos: any[] = [];
		updateContent(message: any, isStreaming = this.isStreaming) {
			this.lastMessage = message;
			this.isStreaming = isStreaming;
			this.vistos.push(message);
			this.contentContainer.children = trechos(message).map(
				(r) => new MouseRegion(this.hideThinkingBlock ? new Text("rótulo nativo") : new Markdown(r.texto)),
			);
		}
		render(_w: number) {
			const b = this.lastMessage?.content.at(-1);
			return b?.type === "text" ? [b.text as string] : [];
		}
	}
	return Assistant;
};
const instalar = (A: ReturnType<typeof fabrica>, relogioFalso: { t: number }, extra: object = {}) => {
	let redesenhos = 0;
	instalarEscrita({
		Assistant: A as never,
		MouseRegion: MouseRegion as never,
		Text: Text as never,
		tema: () => tema,
		cores: () => ({ texto: [200, 200, 200], pensa: [120, 120, 140], fundo: [0, 0, 0] }),
		tecla: () => "alt+t",
		redesenha: () => void redesenhos++,
		agora: () => relogioFalso.t,
		...extra,
	});
	return () => redesenhos;
};
const rot = (c: InstanceType<ReturnType<typeof fabrica>>, k = 0) =>
	strip(((c.contentContainer.children[k] as MouseRegion).child as Text).text);

test("componente: rótulo vivo enquanto pensa, duração medida ao terminar, histórico sem duração; aberto não troca o Markdown", () => {
	const A = fabrica(),
		rel = { t: 1000 };
	instalar(A, rel);
	const c = new A();
	const pensa = { content: [{ type: "thinking", thinking: "vou rodar o comando" }] };
	c.updateContent(pensa, true);
	assert.match(rot(c), /pensando… · 0 s · \d+ palavras? · alt\+t abre$/);
	rel.t = 4000;
	c.updateContent({ content: [...pensa.content, { type: "text", text: "Pronto." }] }, true);
	assert.match(rot(c), /raciocinou 3 s · 4 palavras · alt\+t abre$/, "a resposta começou: o raciocínio terminou");
	rel.t = 9000;
	c.updateContent({ content: [...pensa.content, { type: "text", text: "Pronto." }] }, false);
	assert.match(rot(c), /raciocinou 3 s · 4 palavras/, "a duração não cresce depois do fim");
	assert.equal(c.lastMessage.content[1].text, "Pronto.", "no fim a mensagem inteira");
	const hist = new A();
	hist.updateContent(pensa, false);
	assert.match(rot(hist), /raciocínio · 4 palavras · alt\+t abre$/);
	const aberto = new A();
	aberto.hideThinkingBlock = false;
	aberto.updateContent(pensa, false);
	assert.ok((aberto.contentContainer.children[0] as MouseRegion).child instanceof Markdown);
});

test("componente: em streaming o texto entra aos poucos e o relógio completa sem novo delta; sem foco ou com movimento reduzido passa direto", () => {
	const A = fabrica(),
		rel = { t: 0 };
	const redesenhos = instalar(A, rel);
	const c = new A();
	const m = txt("x".repeat(60));
	c.updateContent(m, true);
	assert.equal(c.vistos.at(-1)!.content[0].text, "", "começa vazio");
	assert.equal(c.lastMessage, m, "lastMessage guarda a mensagem real (o invalidate nativo redesenha por ela)");
	rel.t = 100;
	tique(100);
	assert.equal(c.vistos.at(-1)!.content[0].text.length, Math.floor(CPS / 10), "o quadro do relógio avança o texto");
	assert.ok(redesenhos() > 0);
	assert.ok(c.render(80)[0]!.includes("\x1b[38;2;"), "tinta secando nas letras novas");
	rel.t = 1000;
	tique(1000);
	assert.equal(c.vistos.at(-1), m, "alcança o texto inteiro");
	rel.t = 1000 + TINTA_MS + 50;
	tique(rel.t);
	assert.equal(c.render(80)[0], "x".repeat(60), "seco: linhas nativas");
	c.updateContent(m, false);
	assert.equal(tique(rel.t + 100), undefined);

	for (const desliga of [() => definirFoco(false), () => definirMovimento("reduzido")]) {
		desliga();
		const d = new A();
		d.updateContent(m, true);
		assert.equal(d.vistos.at(-1), m, "sem animação: mensagem inteira a cada delta");
		assert.equal(d.render(80)[0], "x".repeat(60));
		definirFoco(undefined);
		definirMovimento(undefined);
	}
});

test("componente: erro no wrapper cai no componente nativo; instalar de novo não envolve duas vezes", () => {
	const A = fabrica(),
		rel = { t: 0 };
	instalar(A, rel, {
		cores: () => {
			throw new Error("tema quebrado");
		},
	});
	const c = new A();
	c.updateContent({ content: [{ type: "thinking", thinking: "a b" }] }, false);
	assert.equal(c.contentContainer.children.length, 1, "conteúdo nativo desenhado");
	const antes = A.prototype.updateContent;
	instalar(A, rel);
	assert.equal(A.prototype.updateContent, antes);
	const d = new A();
	d.updateContent({ content: [{ type: "thinking", thinking: "a b" }] }, false);
	assert.match(rot(d), /raciocínio · 2 palavras/, "dependências novas valem depois do /reload");
});

// U24: o updateContent nativo refaz o lexer do Markdown da mensagem inteira; em texto longo o tique não o chama a cada quadro.
test("U24 texto longo: o tique do suavizador refaz o conteúdo no máximo a cada PASSO_LONGO_MS; texto curto segue a cada quadro", () => {
	const A = fabrica(),
		rel = { t: 0 };
	instalar(A, rel);
	const longo = new A(),
		curto = new A();
	const ML = txt("y".repeat(20_000)),
		MC = txt("y".repeat(600));
	curto.updateContent(MC, true); // só o último componente atualizado é o ativo do suavizador
	const c0 = curto.vistos.length;
	for (const t of [33, 66, 99]) {
		rel.t = t;
		tique(t);
	}
	assert.equal(curto.vistos.length - c0, 3, "curto: a cada quadro (comportamento de sempre)");
	rel.t = 100;
	longo.updateContent(ML, true);
	const l0 = longo.vistos.length;
	for (const t of [133, 166, 199]) {
		rel.t = t;
		tique(t);
	}
	assert.equal(longo.vistos.length - l0, 0, "longo: quadros dentro do intervalo não refazem o Markdown");
	rel.t = 240;
	tique(240);
	assert.equal(longo.vistos.length - l0, 1, "passado o intervalo, um refazer com o texto mais adiantado");
	assert.ok(longo.vistos.at(-1)!.content[0].text.length > 0);
	rel.t = 5000;
	tique(5000);
	rel.t = 9000;
	tique(9000);
	assert.equal(longo.vistos.at(-1), ML, "alcança o texto inteiro");
});

// Sem cursor na resposta: antes a "Barra que respira" ▏ seguia a última letra (/cursor variante 3,
// 2026-11-18); agora a resposta e o raciocínio chegam sem cursor. O brilho barraAlfa segue no comando do Bash chegando.
test("barraAlfa (cursor do comando chegando): aceso com letras chegando, respira nas pausas; CPS 360", () => {
	assert.equal(CPS, 360);
	assert.equal(barraAlfa(PAUSA_MS - 1, 12345), 1, "letras chegando: acesa");
	const tons = new Set(Array.from({ length: 20 }, (_, i) => barraAlfa(PAUSA_MS + 1, i * 90).toFixed(2)));
	assert.ok(tons.size > 5 && Math.min(...[...tons].map(Number)) >= 0.4, `pausa: respira sem apagar: ${[...tons]}`);
});

test("componente: resposta e raciocínio em streaming sem cursor ▏, nem parados; o relógio para quando nada muda", () => {
	const A = fabrica(),
		rel = { t: 0 };
	const proto = A.prototype as any;
	const nativo = proto.render;
	proto.render = function (w: number) {
		return nativo.call(this, w).map((l: string) => l.padEnd(w));
	}; // como o Markdown do nycode
	const redesenhos = instalar(A, rel, {
		cores: () => ({ texto: [200, 200, 200], fundo: [0, 0, 0], destaque: [100, 200, 0] }),
	});
	const c = new A();
	const m = txt("Pronto agora");
	c.updateContent(m, true);
	rel.t = 2000;
	tique(2000);
	// antes 'Pronto agora▏       ' e o relógio seguia para a barra respirar
	assert.equal(strip(c.render(20)[0]!), "Pronto agora        ", "texto inteiro, sem cursor");
	rel.t = 3000;
	tique(3000); // a tinta das últimas letras seca
	const antes = redesenhos();
	rel.t = 3100;
	tique(3100);
	assert.equal(redesenhos(), antes, "parado e seco: nenhum quadro a mais (antes a barra respirava)");
	const p = new A();
	p.updateContent({ content: [{ type: "thinking", thinking: "Pensando no plano" }] } as never, true);
	rel.t = 4000;
	tique(4000);
	assert.ok(!p.render(30).join("").includes("▏"), "raciocínio sem cursor");
	c.updateContent(m, false);
	assert.equal(c.render(20)[0], "Pronto agora        ", "fim do streaming: sem cursor");
});
