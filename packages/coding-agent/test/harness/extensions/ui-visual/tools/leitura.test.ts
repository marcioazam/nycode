// node --experimental-strip-types --test extensions/ui-visual/test/tools/leitura.test.ts
// Read em chips + contador (/read desenho 4, animação 4): antes `ícone read · alvo :faixa · N linhas`
// em texto corrido; agora, com cores no tema, verbo/faixa/contagem/truncado em pílulas e a contagem sobe de 0 ao total.
import assert from "node:assert/strict";
import { test } from "vitest";
import * as __m1 from "../../../../../src/extensions/ui-visual/motion/vivo.ts";
import { ctx, plain, result, visibleWidth, wrapped } from "./base.ts";

delete process.env.NO_COLOR; // anima() é falso com NO_COLOR; o contador precisa dele ligado
const vivo = __m1;
const RGB: Record<string, string> = {
	customMessageBg: "40;42;54",
	toolErrorBg: "70;30;34",
	success: "120;200;120",
	error: "230;90;90",
	syntaxType: "120;200;220",
	warning: "230;180;80",
};
const cor = {
	fg: (_c: string, t: string) => `\x1b[38;2;200;200;200m${t}\x1b[39m`,
	bold: (t: string) => `\x1b[1m${t}\x1b[22m`,
	bg: (c: string, t: string) => `\x1b[48;2;${RGB[c] ?? "1;1;1"}m${t}\x1b[49m`,
	getBgAnsi: (c: string) => `\x1b[48;2;${RGB[c] ?? "1;1;1"}m`,
	getFgAnsi: (c: string) => `\x1b[38;2;${RGB[c] ?? "200;200;200"}m`,
};
const fundos = (s: string) => [...s.matchAll(/\x1b\[48;2;(\d+;\d+;\d+)m/g)].map((m) => m[1]);
const cores = (s: string) => [...s.matchAll(/\x1b\[38;2;(\d+;\d+;\d+)m/g)].map((m) => m[1]);
// Ícone + palavra: até o `d` de Read, mesmo com uma cor por letra (varredura).
const antesDoAlvo = (linha: string) => {
	const m = /R(?:\x1b\[[0-9;]*m)*e(?:\x1b\[[0-9;]*m)*a(?:\x1b\[[0-9;]*m)*d/.exec(linha)!;
	return linha.slice(0, m.index + m[0].length);
};
let n = 0;
const desenha = (args: Record<string, unknown>, r: unknown, c: Record<string, unknown> = {}, w = 120) => {
	const w0 = wrapped("read"),
		shared = ctx({ args, toolCallId: `rd-${n++}`, ...c });
	w0.renderResult(r, { expanded: false, isPartial: c.isPartial === true }, cor, shared);
	return { linha: w0.renderCall(args, cor, shared).render(w)[0] as string, shared, w0 };
};

test("chips: verbo tingido pelo estado, faixa e contagem em pílulas, linha na largura inteira", () => {
	const { linha } = desenha({ path: "/work/proj/src/a.ts", offset: 120, limit: 60 }, result("a\nb\nc"));
	const p = plain(linha);
	assert.equal(visibleWidth(p), 120);
	// Sem o fundo do cartão, pílula na margem do chat: antes cartão customMessageBg com 1 espaço de recuo e 1 no fim.
	// Régua como no Run: antes espaços entre o alvo e a contagem e a hora em pílula à parte; agora régua ─ e `·` antes da hora.
	// Verbo sem pílula: antes ` ícone read ` num fundo misturado ao verde; agora `ícone Read` na coluna 0, sem
	// fundo, com a cor do estado no ícone e na palavra.
	// `·` entre o verbo e o alvo: antes `Read src/a.ts`.
	assert.match(p, /^\S+ Read · src\/a\.ts {2}120-180 {2}─{10,} {2}3 linhas $/, p);
	assert.ok(linha.startsWith(`\x1b[38;2;${RGB.success}m`), "ícone na cor do estado, na coluna 0");
	assert.deepEqual(fundos(antesDoAlvo(linha)), [], "verbo sem fundo");
	assert.match(
		antesDoAlvo(linha),
		new RegExp(`\\x1b\\[38;2;${RGB.success}m(\\x1b\\[1m)?Read`),
		"palavra na cor do estado",
	);
	const bgs = fundos(linha);
	assert.ok(!bgs.includes(RGB.customMessageBg), `sem o fundo do cartão: ${bgs}`);
	assert.ok(bgs.length >= 1, "faixa e contagem seguem em pílulas neutras");
});

test("chips: truncado em pílula de aviso; erro tinge o verbo de vermelho e não mostra contagem", () => {
	const t = desenha({ path: "log.jsonl" }, result("a\nb", { truncation: { truncated: true } }));
	// Sem o fundo do cartão, pílula na margem do chat: antes cartão customMessageBg com 1 espaço de recuo e 1 no fim.
	assert.match(plain(t.linha), /2 linhas {3}truncado $/);
	const e = desenha({ path: "x.md" }, result("ENOENT"), { isError: true });
	assert.doesNotMatch(plain(e.linha), /linha/);
	// Erro: antes pílula de fundo vermelho misturado (118;48;51); agora ícone e palavra no vermelho, sem fundo.
	assert.deepEqual(fundos(antesDoAlvo(e.linha)), []);
	assert.ok(cores(antesDoAlvo(e.linha)).includes(RGB.error), cores(e.linha).join(" "));
});

test("contador: ao terminar a contagem sobe de 0 ao total em 400 ms; depois fica no total", async () => {
	const texto = Array.from({ length: 200 }, (_, i) => `l${i}`).join("\n");
	const id = "rd-conta";
	vivo.terminou(id);
	const { w0, shared } = desenha({ path: "a.ts" }, result(texto), { toolCallId: id });
	const conta = () =>
		Number(/(\d+) linhas?/.exec(plain(w0.renderCall({ path: "a.ts" }, cor, shared).render(120)[0]))?.[1]);
	const cedo = conta();
	assert.ok(cedo < 200, `logo após o fim ainda subindo: ${cedo}`);
	await new Promise((r) => setTimeout(r, 450));
	assert.equal(conta(), 200);
});

test("sem cores no tema: a linha de texto corrido de antes", () => {
	const sem = { fg: (_c: string, t: string) => t, bold: (t: string) => t };
	const w0 = wrapped("read"),
		c = ctx({ args: { path: "a.ts" } });
	w0.renderResult(result("a"), { expanded: false, isPartial: false }, sem, c);
	assert.match(plain(w0.renderCall({ path: "a.ts" }, sem, c).render(80)[0]).trimEnd(), / read · a\.ts · 1 linha$/);
});

// Varredura + transição de estado (/refino read 2): antes a pílula trocava de cor de uma vez e não havia
// estado de aviso; agora lendo há um brilho que atravessa a pílula e o desfecho funde em 300 ms (verde, âmbar truncado, vermelho).
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
// Sem pílula: antes o brilho e a transição pintavam o fundo da pílula; agora a cor do ícone e da palavra.
const verboCores = (linha: string) => cores(antesDoAlvo(linha));
test("varredura: lendo, o brilho atravessa o ícone e a palavra (as cores deles mudam letra a letra)", async () => {
	const id = "rd-varre";
	vivo.iniciou(id);
	const { w0, shared } = desenha({ path: "a.ts" }, result(""), {
		toolCallId: id,
		isPartial: true,
		executionStarted: true,
	});
	const q = () => new Set(verboCores(w0.renderCall({ path: "a.ts" }, cor, shared).render(120)[0])).size;
	// O pico de luz pinta letra a letra: num quadro o verbo tem um degradê (várias cores de letra).
	let maior = 0;
	for (let i = 0; i < 12; i++) {
		maior = Math.max(maior, q());
		await espera(40);
	}
	assert.ok(maior >= 4, `degradê da varredura no verbo: ${maior} cores`);
	assert.deepEqual(
		fundos(antesDoAlvo(w0.renderCall({ path: "a.ts" }, cor, shared).render(120)[0])),
		[],
		"lendo também sem fundo",
	);
	vivo.terminou(id);
});

test("transição: o desfecho funde do ciano à cor dele e assenta (verde; âmbar se truncado)", async () => {
	for (const [id, r, alvo] of [
		["rd-ok", result("a"), RGB.success],
		["rd-av", result("a", { truncation: { truncated: true } }), RGB.warning],
	] as const) {
		vivo.terminou(id);
		const { w0, shared } = desenha({ path: "a.ts" }, r, { toolCallId: id });
		const q = () => verboCores(w0.renderCall({ path: "a.ts" }, cor, shared).render(120)[0]);
		assert.ok(!q().includes(alvo), `${id}: logo após o fim ainda em transição: ${q()}`);
		// Pulso no aviso: antes assentava em 450 ms; o truncado pulsa até TRANSICAO_MS + PULSO_MS.
		await espera(id === "rd-av" ? 1650 : 450);
		assert.ok(q().includes(alvo), `${id}: assentado na cor do desfecho: ${q()}`);
	}
});

test("transição: no erro o verbo funde ao vermelho; não há fundo de cartão nem de pílula", async () => {
	// Sem o fundo do cartão: antes o fundo do cartão fundia de customMessageBg a toolErrorBg; agora só a pílula.
	vivo.terminou("rd-err");
	const { w0, shared } = desenha({ path: "x.md" }, result("ENOENT"), { toolCallId: "rd-err", isError: true });
	const linha = () => w0.renderCall({ path: "x.md" }, cor, shared).render(120)[0] as string;
	const verbo = () => verboCores(linha())[0];
	const cedo = verbo();
	// Pulso no erro: antes assentava em 450 ms; agora pulsa até TRANSICAO_MS + PULSO_MS.
	await espera(1650);
	assert.notEqual(verbo(), cedo, "o verbo mudou durante a transição");
	assert.equal(verbo(), RGB.error, "assentado no vermelho");
	assert.deepEqual(fundos(linha()), [], "sem fundo de cartão nem de pílula");
});

// Lab /rwerro desenho 1 + "Pulso", também para aviso: depois da transição a cor do erro (Read, Write) e
// do aviso (truncado) pulsa duas vezes e assenta; sucesso não pulsa. Args estáveis, como no nycode real (o desenho do erro era
// guardado no 1º quadro).
test("pulso: erro e aviso clareiam e voltam à cor depois da transição; sucesso não pulsa", async () => {
	const casos = [
		["read", "rd-pe", result("ENOENT"), { isError: true }, RGB.error],
		["write", "wr-pe", result("EACCES"), { isError: true }, RGB.error],
		["read", "rd-pa", result("a", { truncation: { truncated: true } }), {}, RGB.warning],
		["read", "rd-ps", result("a"), {}, RGB.success],
	] as const;
	const vivos = casos.map(([tool, id, r, c, alvo]) => {
		vivo.terminou(id);
		const args = { path: "a.ts", content: "x" };
		const w0 = wrapped(tool),
			shared = ctx({ args, toolCallId: id, ...c });
		w0.renderResult(r, { expanded: false, isPartial: false }, cor, shared);
		const comp = w0.renderCall(args, cor, shared);
		return { id, alvo, verbo: () => cores((comp.render(120)[0] as string).split(/[·]/)[0]!)[0] };
	});
	await espera(300 + 300); // meio do 1º pulso: o pico
	for (const v of vivos) {
		if (v.id === "rd-ps") assert.equal(v.verbo(), v.alvo, "sucesso não pulsa");
		else assert.notEqual(v.verbo(), v.alvo, `${v.id}: no pico a cor clareou`);
	}
	await espera(1100);
	for (const v of vivos) assert.equal(v.verbo(), v.alvo, `${v.id}: assentou na cor do estado`);
});

test("surgir: a contagem e o truncado nascem do fundo, o truncado depois da contagem", async () => {
	vivo.terminou("rd-surge");
	const { w0, shared } = desenha({ path: "a.ts" }, result("a\nb", { truncation: { truncated: true } }), {
		toolCallId: "rd-surge",
	});
	await espera(60);
	const l = w0.renderCall({ path: "a.ts" }, cor, shared).render(120)[0] as string;
	const fgAntes = (palavra: string) =>
		[...l.split(palavra)[0]!.matchAll(/\x1b\[38;2;(\d+);(\d+);(\d+)m/g)].at(-1)!.slice(1).map(Number);
	const [r, g] = fgAntes("truncado");
	assert.ok(r < 200 || g < 150, `truncado ainda apagado: ${r},${g}`);
	assert.ok(fgAntes("linhas")[0]! > 0, "contagem já surgindo");
});

// Edit no estilo do Read: antes `● arquivo  pasta  ·  +N −M  …  concluído [hora em pílula]` com o fundo do
// cartão; agora lápis + `Edit` na cor do estado, `·` entre verbo, arquivo, pasta e placar, régua até a hora, nada de
// `concluído`. antes o ícone seguia a cor do estado e o cabeçalho ficava sem fundo; agora o ícone é
// sempre muted e a linha leva o fundo da caixa do diff.
test("edit: lápis muted + Edit na cor do estado, · entre as partes, régua, sem concluído e com o fundo da caixa", () => {
	const args = { path: "/work/proj/docs/x/plano.md" };
	const w0 = wrapped("edit"),
		shared = ctx({ args, toolCallId: `ed-${n++}` });
	w0.renderResult(result("ok", { diff: "-1 a\n+1 b" }), { expanded: false, isPartial: false }, cor, shared);
	const linha = w0.renderCall(args, cor, shared).render(120)[0] as string;
	const p = plain(linha).trim();
	assert.equal(visibleWidth(plain(linha)), 120);
	assert.match(p, /^\S+ Edit · plano\.md · docs\/x\/ · \S.* ─{10,}$/, p);
	assert.doesNotMatch(p, /concluído/);
	assert.deepEqual([...new Set(fundos(linha))], [RGB.customMessageBg], "cabeçalho no fundo da caixa");
	assert.ok(linha.startsWith(`\x1b[48;2;${RGB.customMessageBg}m `), "fundo desde a coluna 0, com o recuo da caixa");
	assert.equal(cores(linha)[0], "200;200;200", "ícone muted, não a cor do estado");
	assert.ok(cores(linha).includes(RGB.success), "a palavra Edit segue a cor do estado");
	const erro = ctx({ args, toolCallId: `ed-${n++}`, isError: true });
	const le = wrapped("edit").renderCall(args, cor, erro).render(120)[0] as string;
	assert.equal(cores(le)[0], "200;200;200", "ícone muted também em erro");
	assert.ok(cores(le).includes(RGB.error), "erro em vermelho na palavra");
	assert.deepEqual([...new Set(fundos(le))], [RGB.toolErrorBg], "fundo de erro, igual ao da caixa");
});

// Imagem no Read: uma linha em branco a mais antes da imagem; texto segue sem corpo.
test("imagem: o resultado do Read deixa uma linha de margem acima da imagem; texto não", () => {
	const w0 = wrapped("read");
	const img = {
		content: [
			{ type: "text", text: "Read image file [image/png]" },
			{ type: "image", data: "AAAA", mimeType: "image/png" },
		],
	};
	const c = ctx({ args: { path: "a.png" }, toolCallId: "rd-img" });
	assert.deepEqual(w0.renderResult(img, { expanded: false, isPartial: false }, cor, c).render(80), [""]);
	const t = ctx({ args: { path: "a.ts" }, toolCallId: "rd-txt" });
	assert.deepEqual(w0.renderResult(result("a"), { expanded: false, isPartial: false }, cor, t).render(80), []);
});

// Write igual ao Read, com a bolinha cheia: antes cartão verde do shell padrão com `write` minúsculo e a
// contagem colada ao alvo; agora `● Write · alvo ──── N linhas`, sem fundo, na cor do estado.
test("write: mesma linha do Read, bolinha cheia e Write", () => {
	const args = { path: "/work/proj/src/novo.ts", content: "a\nb\n" };
	const w0 = wrapped("write"),
		shared = ctx({ args, toolCallId: "wr-1" });
	w0.renderResult(result("ok"), { expanded: false, isPartial: false }, cor, shared);
	const linha = w0.renderCall(args, cor, shared).render(120)[0] as string;
	const p = plain(linha);
	assert.equal(visibleWidth(p), 120);
	assert.match(p, /^● Write · src\/novo\.ts ─{10,} 2 linhas$/, p);
	assert.ok(linha.startsWith(`\x1b[38;2;${RGB.success}m`), "bolinha na cor do estado, na coluna 0");
	assert.deepEqual(fundos(linha), [], "sem fundo");
});

// Sem o tipo antes da hora: antes `… ──── imagem · 22:56`; agora a régua vai direto à hora.
test("imagem: cabeçalho do Read sem `imagem`", () => {
	const img = {
		content: [
			{ type: "text", text: "Read image file [image/png]" },
			{ type: "image", data: "AAAA", mimeType: "image/png" },
		],
	};
	const { linha } = desenha({ path: "/work/proj/a.png" }, img);
	const p = plain(linha);
	assert.match(p, /^\S+ Read · a\.png\s*$/, p); // sem hora no teste: sem régua (só ela à direita a puxaria)
	assert.doesNotMatch(p, /imagem/, p);
});
