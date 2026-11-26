// node --experimental-strip-types --test extensions/ui-visual/motion/test/motion.test.ts
import assert from "node:assert/strict";
import { afterAll, afterEach, test } from "vitest";
import { definirMovimento } from "../../../../../src/extensions/ui/a11y.ts";
import {
	activeSubscriberCount,
	anima,
	assinarQuadro,
	barraOitavos,
	contraste,
	definirFoco,
	fracaoAnimada,
	highlightPeak,
	intervaloAtual,
	intervaloContinuo,
	pillChip,
	QUADRO_MS,
	relogio,
	SETTLE_DURATION_MS,
	SHIMMER_VARRE_MS,
	settleFlashText,
	shimmerText,
	tique,
} from "../../../../../src/extensions/ui-visual/motion/motion.ts";

const strip = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");
const KITTY = { TERM: "xterm-kitty" };

// Timer falso: o relógio é dirigido por `tique(now)`; `ms` guarda o intervalo pedido (0 = desligado).
const real = { ...relogio };
let ms = 0;
relogio.set = (_f, m) => {
	ms = m;
	return m;
};
relogio.clear = () => {
	ms = 0;
};
// The event-loop utilization the limiter reads is real: vitest keeps the loop busy, node:test did not.
relogio.ocupacao = () => 0;
afterEach(() => {
	definirFoco(undefined);
	definirMovimento(undefined);
});
afterAll(() => Object.assign(relogio, real));

// Tokens reais dos dois temas do nycode (docs/designs/onda10-sota/README.md).
const CASOS: [string, number[], number[]][] = [
	["nycode-noite syntaxType sobre toolPendingBg", [125, 207, 255], [36, 45, 60]],
	["nycode-noite success sobre o fundo", [158, 206, 106], [26, 27, 38]],
	["nycode-claro syntaxType sobre toolPendingBg", [11, 79, 121], [235, 241, 244]],
	["nycode-claro success sobre o fundo", [29, 122, 52], [255, 255, 255]],
];
for (const [nome, base, fundo] of CASOS)
	test(`P04 ${nome}: toda letra da varredura fica a 3:1 ou mais do fundo`, () => {
		let pior = Infinity;
		let pintou = false;
		for (let t = 0; t < 1400; t += 20) {
			const s = shimmerText("executando", base, t, () => "", KITTY, fundo);
			for (const m of s.matchAll(/38;2;(\d+);(\d+);(\d+)m/g)) {
				pintou = true;
				pior = Math.min(pior, contraste([+m[1]!, +m[2]!, +m[3]!], fundo));
			}
		}
		assert.ok(pintou, "a varredura pinta em truecolor");
		assert.ok(pior >= 3, `pior contraste ${pior.toFixed(2)}:1`);
	});

test("P04 highlightPeak: clareia o próprio token e, sem fundo conhecido, supõe o lado oposto do texto", () => {
	const [r, g, _b] = highlightPeak([125, 207, 255], [36, 45, 60]);
	assert.ok(r > 125 && g > 207, "no tema escuro o pico é mais claro que o token, não grafite");
	assert.ok(
		contraste(highlightPeak([11, 79, 121]), [255, 255, 255]) >= 3,
		"texto escuro sem fundo: piso contra branco",
	);
	assert.deepEqual(
		highlightPeak([200, 200, 200], [210, 210, 210]),
		[200, 200, 200],
		"token que já não tem 3:1 fica como está",
	);
});

test("shimmerText: mesma largura visível, descansa na cor do token e cai no fallback sem cor, reduzido ou sem foco", () => {
	const s = shimmerText("rodando", [125, 207, 255], 400, () => "<fb>", KITTY);
	assert.equal(strip(s), "rodando");
	assert.match(s, /\x1b\[38;2;\d+;\d+;\d+m/);
	assert.equal(
		shimmerText("rodando", [125, 207, 255], SHIMMER_VARRE_MS + 10, () => "<fb>", KITTY),
		"<fb>",
		"descanso de 500 ms",
	);
	assert.equal(
		shimmerText("rodando", [125, 207, 255], 400, () => "<fb>", { NO_COLOR: "1", TERM: "xterm-kitty" }),
		"<fb>",
	);
	assert.equal(
		shimmerText("rodando", [125, 207, 255], 400, () => "<fb>", { NYCODE_REDUCED_MOTION: "1", TERM: "xterm-kitty" }),
		"<fb>",
	);
	assert.notEqual(
		shimmerText("rodando", [125, 207, 255], 400, () => "<fb>", { NO_COLOR: "", TERM: "xterm-kitty" }),
		"<fb>",
		"NO_COLOR vazio não conta (no-color.org)",
	);
	definirFoco(false);
	assert.equal(
		shimmerText("rodando", [125, 207, 255], 400, () => "<fb>", KITTY),
		"<fb>",
	);
});

test("settleFlashText: brilho só dentro dos 240 ms e só em movimento normal", () => {
	const flash = settleFlashText("concluído", [158, 206, 106], 100, 140, () => "<ok>", KITTY);
	assert.equal(strip(flash), "concluído");
	assert.match(flash, /\x1b\[38;2;/);
	assert.equal(
		settleFlashText("concluído", [158, 206, 106], 100, 100 + SETTLE_DURATION_MS + 5, () => "<ok>", KITTY),
		"<ok>",
	);
	definirMovimento("reduzido");
	assert.equal(
		settleFlashText("concluído", [158, 206, 106], 100, 140, () => "<ok>", KITTY),
		"<ok>",
	);
});

test("P02 cadência: 33 ms contínuo, 66 ms em tmux ou SSH, 1 s sem foco ou reduzido", () => {
	assert.equal(intervaloContinuo(KITTY), QUADRO_MS.continuo);
	assert.equal(intervaloContinuo({ ...KITTY, TMUX: "/tmp/tmux-1000/default,1,0" }), QUADRO_MS.remoto);
	assert.equal(intervaloContinuo({ ...KITTY, SSH_CONNECTION: "10.0.0.2 5 10.0.0.1 22" }), QUADRO_MS.remoto);
	assert.equal(intervaloContinuo({ ...KITTY, NYCODE_REDUCED_MOTION: "1" }), QUADRO_MS.parado);
	assert.equal(anima(KITTY), true);
	definirFoco(false);
	assert.equal(intervaloContinuo(KITTY), QUADRO_MS.parado);
	assert.equal(anima(KITTY), false);
});

test("P02 assinarQuadro: um timer só, 16 ms só enquanto há transição, e desliga sem assinantes", () => {
	let continuo = 0;
	let curta = 0;
	const sair = assinarQuadro(
		"t-continuo",
		() => {
			continuo++;
			return true;
		},
		{ env: KITTY },
	);
	assert.equal(intervaloAtual(), QUADRO_MS.continuo);
	assert.equal(ms, QUADRO_MS.continuo);
	assinarQuadro("t-curta", () => ++curta < 3, { transicao: true, env: KITTY });
	assert.equal(ms, QUADRO_MS.transicao, "a transição sobe o timer para 16 ms");
	for (const now of [1000, 1016, 1032, 1048]) tique(now);
	assert.equal(curta, 3, "a transição roda a cada quadro e sai sozinha");
	assert.equal(continuo, 2, "o contínuo segue a 33 ms mesmo com o timer a 16 ms (1000 e 1032)");
	assert.equal(ms, QUADRO_MS.continuo, "sem transição o timer volta a 33 ms");
	sair();
	assert.equal(activeSubscriberCount(), 0);
	assert.equal(ms, 0, "sem assinantes o timer desliga");
});

test("P02 assinarQuadro: sem foco desenha 1 vez por segundo; desligado não assina; assinante que lança sai", () => {
	let n = 0;
	const sair = assinarQuadro(
		"t-foco",
		() => {
			n++;
			return true;
		},
		{ env: KITTY },
	);
	definirFoco(false);
	for (const now of [5000, 5250, 5500, 5750, 6000]) tique(now);
	assert.equal(n, 2, "sem foco: 5000 e 6000");
	assert.ok(ms > QUADRO_MS.remoto && ms <= 250, `acorda devagar sem foco (${ms} ms)`);
	definirFoco(true);
	tique(6033);
	assert.equal(n, 3, "com foco de volta retoma no quadro seguinte");
	sair();
	assert.equal(typeof assinarQuadro("t-off", () => true, { env: { TERM: "dumb" } }), "function");
	assert.equal(activeSubscriberCount(), 0, "TERM=dumb: nada assina");
	assinarQuadro(
		"t-erro",
		() => {
			throw new Error("x");
		},
		{ env: KITTY },
	);
	tique(7000);
	assert.equal(activeSubscriberCount(), 0);
});

test("P08 barraOitavos: 8 passos por célula, trilho como fundo, ASCII e fallback sem truecolor", () => {
	const o = { ok: (x: string) => `<g>${x}</g>`, resto: (x: string) => `<d>${x}</d>` };
	assert.equal(barraOitavos(0.5, 6, o), "<g>███</g><d>╌╌╌</d>");
	assert.equal(barraOitavos(1 / 8, 6, o), "<g>▊</g><d>╌╌╌╌╌</d>", "1 de 8 tarefas = 6 de 48 oitavos");
	assert.equal(barraOitavos(0, 6, o), "<d>╌╌╌╌╌╌</d>");
	assert.equal(barraOitavos(1, 6, o), "<g>██████</g>");
	assert.equal(barraOitavos(0.5, 6, { ...o, ascii: true }), "<g>###</g><d>---</d>");
	const t = barraOitavos(1 / 8, 6, { ...o, trilho: [20, 21, 30] });
	assert.equal(t, "\x1b[48;2;20;21;30m<g>▊</g>     \x1b[49m");
	assert.equal(barraOitavos(Number.NaN, 4, o), "<d>╌╌╌╌</d>");
	assert.equal(barraOitavos(9, 4, o), "<g>████</g>");
});

test("P08 fracaoAnimada: avança em 200 ms com saída suave; sem movimento vai direto", () => {
	assert.equal(fracaoAnimada(0.25, 0.5, 0, KITTY), 0.25);
	const meio = fracaoAnimada(0.25, 0.5, 100, KITTY);
	assert.ok(meio > 0.375 && meio < 0.5, "saída suave: passa da metade em 100 ms");
	assert.equal(fracaoAnimada(0.25, 0.5, 200, KITTY), 0.5);
	assert.equal(fracaoAnimada(0.25, 0.5, undefined, KITTY), 0.5);
	assert.equal(fracaoAnimada(0.25, 0.5, 50, { ...KITTY, NYCODE_REDUCED_MOTION: "1" }), 0.5);
});

test("pillChip: pílula com 1 espaço de respiro interno e fundo um tom abaixo da caixa", () => {
	const chip = pillChip("02:45", [38, 39, 52]);
	assert.equal(strip(chip), " 02:45 ");
	assert.ok(chip.startsWith("\x1b[48;2;") && chip.endsWith("\x1b[49m"));
	assert.equal(pillChip("02:45", undefined), "02:45");
});

// D2 (docs/perf-sota.md): fator 1, 2, 4 ou 8 sobre a cadência contínua, guiado pela ocupação do laço de eventos lida a cada >= 1 s.
test("D2 limitador: sobe com 0,45, mantém com 0,20, desce com 0,05 e respeita o teto de 250 ms", () => {
	let occ = 0.45;
	relogio.ocupacao = () => occ;
	const sair = assinarQuadro("d2", () => true, { env: KITTY });
	tique(1000); // 1ª leitura só marca o início da janela
	assert.equal(intervaloContinuo(KITTY), 33);
	tique(1500); // menos de 1 s: não lê
	assert.equal(intervaloContinuo(KITTY), 33);
	tique(2000);
	assert.equal(intervaloContinuo(KITTY), 66, "0,45 > 0,30: f = 2");
	assert.equal(ms, 66, "o timer acompanha o fator");
	tique(3000);
	assert.equal(intervaloContinuo(KITTY), 132);
	tique(4000);
	assert.equal(intervaloContinuo(KITTY), 250, "33 × 8 = 264 passa do teto");
	assert.equal(ms, 250);
	tique(5000);
	assert.equal(intervaloContinuo(KITTY), 250, "f não passa de 8");
	occ = 0.2;
	tique(6000);
	assert.equal(intervaloContinuo(KITTY), 250, "0,20 entre 0,12 e 0,30: mantém");
	occ = 0.05;
	tique(7000);
	assert.equal(intervaloContinuo(KITTY), 132, "0,05 < 0,12: f = 4");
	tique(8000);
	tique(9000);
	tique(10000);
	assert.equal(intervaloContinuo(KITTY), QUADRO_MS.continuo, "f não desce de 1");
	sair();
});

test("D2 limitador: no remoto 66 ms × f respeita o mesmo teto e sem foco continua 1 s", () => {
	relogio.ocupacao = () => 0.9;
	const env = { ...KITTY, TMUX: "/tmp/tmux-1000/default,1,0" };
	const sair = assinarQuadro("d2-remoto", () => true, { env });
	tique(1000);
	tique(2000);
	assert.equal(intervaloContinuo(env), 132);
	tique(3000);
	assert.equal(intervaloContinuo(env), 250, "66 × 4 = 264 passa do teto");
	definirFoco(false);
	assert.equal(intervaloContinuo(env), QUADRO_MS.parado, "parado não é escalado");
	sair();
});

test("D2 limitador: transição segue a 16 ms e o fator volta a 1 sem assinantes", () => {
	relogio.ocupacao = () => 0.9;
	const sair = assinarQuadro("d2-c", () => true, { env: KITTY });
	tique(1000);
	tique(2000);
	tique(3000);
	assert.equal(intervaloContinuo(KITTY), 132);
	const curta = assinarQuadro("d2-t", () => true, { transicao: true, env: KITTY });
	assert.equal(ms, QUADRO_MS.transicao, "transição não muda com o fator");
	curta();
	assert.equal(ms, 132);
	sair();
	assert.equal(ms, 0);
	assert.equal(intervaloContinuo(KITTY), QUADRO_MS.continuo, "sem assinantes: f = 1");
	const de = assinarQuadro("d2-novo", () => true, { env: KITTY });
	assert.equal(ms, QUADRO_MS.continuo, "novo assinante começa a 33 ms");
	de();
});
