// Behavior of the notices runtime: cause table, /reload screen, chips, meter and neutral boxes.
import assert from "node:assert/strict";
import { type Component, Container } from "@nycode/tui";
import { afterEach, beforeEach, test, vi } from "vitest";
import { coresRecarga, gravarGlobal, parado } from "../../../../src/modes/interactive/avisos/base.ts";
import {
	caixaNeutra,
	compactada,
	confianca,
	linhaCompactada,
	MARCA_CAIXA,
} from "../../../../src/modes/interactive/avisos/caixa.ts";
import { blocoErro, causa, retryLinha } from "../../../../src/modes/interactive/avisos/causas.ts";
import { resumoPt } from "../../../../src/modes/interactive/avisos/compactacao.ts";
import {
	brilhoPonto,
	chipsAviso,
	limparTela,
	recarregado,
	recarregando,
} from "../../../../src/modes/interactive/avisos/recarga.ts";
import { initTheme, theme } from "../../../../src/modes/interactive/theme/theme.ts";

const ANSI = /\x1b\[[0-9;:]*m/g;
const plain = (ls: readonly string[]) => ls.map((l) => l.replace(ANSI, "")).join("\n");

beforeEach(() => {
	vi.stubEnv("TERM", "xterm-256color");
	vi.stubEnv("COLORTERM", "truecolor");
	vi.stubEnv("NO_PROGRESS", "");
	vi.stubEnv("NYCODE_REDUCED_MOTION", "");
	initTheme("dark");
});
afterEach(() => {
	vi.unstubAllEnvs();
	vi.useRealTimers();
});

function host() {
	const renders: boolean[] = [];
	const filhos: Array<{ render: (w: number) => string[]; invalidate(): void }> = [
		{ render: () => ["cabeçalho"], invalidate() {} },
		{ render: () => ["chat"], invalidate() {} },
		{ render: () => ["rodapé"], invalidate() {} },
	];
	const editorContainer = new Container();
	const ui = {
		requestRender: (f?: boolean) => renders.push(!!f),
		children: [...filhos, editorContainer] as Component[],
		terminal: { rows: 10, columns: 80 },
	};
	return { chatContainer: new Container(), editorContainer, ui, outputPad: 1, renders };
}

test("causa: status HTTP, palavras-chave e texto livre; retryLinha e blocoErro usam a causa", () => {
	assert.equal(causa('429 {"error":{"type":"rate_limit_error","message":"m"}}').id, "limite");
	assert.equal(causa("401: x").id, "conta");
	assert.equal(
		causa('OAuth refresh failed for anthropic: status=400; body={"error": "invalid_grant"}; stack=Error').id,
		"conta",
	);
	assert.equal(causa("503 down").id, "fora");
	assert.equal(causa("fetch failed").id, "rede");
	assert.equal(causa("422 bad").codigo, "422");
	assert.equal(causa(undefined).id, "outro");
	assert.match(retryLinha("429", 2, 5, 7, "escape"), /nova tentativa em 7s · 2 de 5 · esc cancela/);
	const linhas = blocoErro(
		"overloaded",
		(_c, s) => s,
		(s) => s,
		{ tentativas: 3, segundos: 9 },
	);
	assert.match(linhas[1]!, /Tentei 3 vezes em 9s e parei/);
});

test("brilhoPonto acende em sequência, segura e apaga junto", () => {
	assert.equal(brilhoPonto(0, 0), 0);
	assert.equal(brilhoPonto(0, 300), 1);
	assert.equal(brilhoPonto(2, 1100) > 0.9, true);
	assert.equal(brilhoPonto(1, 1500), 0);
});

test("recarregando: palavra e pontos no centro; limparTela esconde os filhos e libera quando a tela estabiliza", () => {
	let agora = 0;
	const comp = recarregando(host(), theme) as Component & { quadro?: () => void };
	assert.ok(comp);
	const linhas = comp.render(80);
	assert.match(plain(linhas), /recarregando/);
	assert.equal(linhas.length, 10);
	const h = host();
	const tela = limparTela(h, () => false, { agora: () => agora, suave: false, quadro: () => ["carga"], t0: 0 });
	agora = 100;
	tela.tick();
	assert.equal(tela.liberado(), false);
	assert.deepEqual(h.ui.children?.[1]?.render(80), []);
	for (let i = 0; i < 40; i++) {
		agora += 100;
		tela.tick();
	}
	assert.equal(tela.liberado(), true);
	assert.deepEqual(h.ui.children?.[1]?.render(80), ["chat"]);
});

test("recarregado desenha o divisor com a hora e a confiança salva", () => {
	vi.stubEnv("NYCODE_REDUCED_MOTION", "1");
	const h = host();
	gravarGlobal(Symbol.for("nycode:recarga"), { desde: performance.now(), avisos: [{ dist: 1 }] });
	recarregado(h, theme, true);
	const txt = plain(h.chatContainer.render(100));
	assert.match(txt, /recarregado/);
	assert.match(txt, /confiança do projeto salva/);
	assert.ok(h.renders.length > 0);
});

test("chipsAviso só reconhece regras/memória; caixaNeutra desenha a pílula e o texto simples", () => {
	const C = coresRecarga(theme);
	assert.ok(C);
	assert.equal(chipsAviso("outra coisa", C), undefined);
	const chips = chipsAviso("⚖  regras  2 globais · /rules", C)!;
	assert.match(
		chips(60)
			.map((c) => c.c)
			.join(""),
		/Regras: 2 globais · \/rules/,
	);
	const h = host();
	assert.equal(caixaNeutra(h, theme, `${MARCA_CAIXA}⚖  memória  nenhuma`, "info"), true);
	assert.equal(caixaNeutra(h, theme, `${MARCA_CAIXA}${MARCA_CAIXA}Atenção:\ndetalhe`, "info"), true);
	assert.equal(caixaNeutra(h, theme, "comum", "info"), false);
	assert.equal(caixaNeutra(h, theme, `${MARCA_CAIXA}x`, "error"), false);
	assert.match(plain(h.chatContainer.render(100)), /Atenção/);
});

test("caixaNeutra entrega o cartão de limite da espera ativa e esconde o erro vermelho que ele cobre", () => {
	const h = host();
	let encerrado = false;
	const cartao = {
		erro: "429 limite",
		hora: "10:00",
		encerrado: () => encerrado,
		linhas: () => ["espera de limite", "segunda"],
	};
	gravarGlobal(Symbol.for("nycode:cartao-limite"), cartao);
	assert.equal(caixaNeutra(h, theme, `${MARCA_CAIXA}${MARCA_CAIXA}x`, "info"), true);
	assert.match(plain(h.chatContainer.render(100)), /espera de limite/);
	encerrado = true;
	assert.match(plain(h.chatContainer.render(100)), /segunda/);
	gravarGlobal(Symbol.for("nycode:cartao-limite"), undefined);
});

test("compactada e confianca: medidor com bolhas, linha de texto sem truecolor", () => {
	const h = host();
	compactada(h, theme, 12);
	assert.match(plain(h.chatContainer.render(100)), /compactada .*\+2.*12 vezes/s);
	assert.match(plain(h.chatContainer.render(100)), /\/new recomeça limpo/);
	assert.match(
		linhaCompactada(
			(_c, s) => s,
			(s) => s,
			1,
		),
		/1 vez/,
	);
	const txt = confianca(h, theme);
	assert.match(plain(txt.render(120)), /projeto não confiável/);
	assert.equal(parado(), false);
	vi.stubEnv("TERM", "dumb");
	assert.equal(parado(), true);
});

test("resumoPt traduz só títulos exatos, tira o espaço final e as linhas em branco seguintes, em tempo linear", () => {
	assert.equal(resumoPt("## Done\n\n\nNext"), "## Feito\nNext");
	assert.equal(resumoPt("a\n## Goal \t\n  \n\n- item\n## Nope  \n\n"), "a\n## Objetivo\n- item\n## Nope  \n\n");
	assert.equal(resumoPt("#### Done\n"), "#### Done\n");
	assert.equal(resumoPt("<read-files>\nx\n</read-files>"), "### Arquivos lidos\nx\n");
	const t0 = performance.now();
	resumoPt(`## ${" ".repeat(50000)}x`);
	assert.ok(performance.now() - t0 < 500);
});
