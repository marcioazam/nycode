// vitest: test/harness/extensions/notify/painel.test.ts
import assert from "node:assert/strict";
import { afterEach, beforeEach, test, vi } from "vitest";
import * as __typed_avisos_config from "../../../../src/extensions/notify/config.ts";
import * as __typed_avisos_painel from "../../../../src/extensions/notify/painel.ts";

// The rendering reads TERM: pin it so the suite does not depend on the shell it runs in.
beforeEach(() => {
	vi.stubEnv("TERM", "xterm-256color");
});
afterEach(() => {
	vi.unstubAllEnvs();
});

// The source tests drive the modules with partial fakes, without types.
const __a_avisos_painel: any = __typed_avisos_painel;
const __a_avisos_config: any = __typed_avisos_config;

const m = __a_avisos_painel;
const cfg = __a_avisos_config;

const theme = { fg: (_c: string, s: string) => s, bg: (_c: string, s: string) => s, bold: (s: string) => s };
const UP = "\x1b[A";
const DOWN = "\x1b[B";

function cria(recentes: any[] = [], config: any = cfg.PADRAO, agora = Date.now) {
	const estado = { config, salvos: [] as any[], testes: 0, fechou: 0, redraws: 0 };
	const painel = new m.PainelAvisos(
		theme,
		{
			recentes: () => recentes,
			config: () => estado.config,
			salvar: (c: any) => {
				estado.salvos.push(c);
				estado.config = c;
			},
			testar: () => estado.testes++,
			agora,
		},
		() => estado.fechou++,
		() => estado.redraws++,
	);
	return { painel, estado };
}

test("recentes vazio diz o próximo passo; aba ativa em cápsula; dica na última linha", () => {
	const { painel } = cria();
	const l = painel.render(70);
	assert.match(l[0], /^── Avisos ─+ {2}recentes {4}ajustes ──$/);
	assert.equal(l[1].trimEnd(), " Nenhum aviso nesta sessão · Tab abre os ajustes");
	assert.equal(l[2].trimEnd(), "  ↑↓  rola    tab  ajustes    esc  fecha");
	assert.equal(l[3], "─".repeat(70));
	assert.ok(l.every((x: string) => x.length === 70 || x === l[0]));
});

test("recentes: grupos, estado por extenso e hora à direita", () => {
	const hora = new Date(2026, 10, 14, 14, 2).getTime();
	const { painel } = cria(
		[
			{ hora, glifo: "✕", texto: "Parou com erro · rede" },
			{ hora, glifo: "✓", texto: "Terminou · 2m 14s" },
			{ hora: hora - 20 * 60_000, glifo: "▲", texto: "Precisa de você · pergunta aberta" },
		],
		cfg.PADRAO,
		() => hora,
	);
	const l = painel.render(70).map((x: string) => x.trimEnd());
	assert.equal(l[1], " Agora há pouco");
	assert.match(l[2], /^ erro +Parou com erro · rede +14:02$/);
	assert.match(l[3], /^ terminou +Terminou · 2m 14s +14:02$/);
	assert.equal(l[4], " Mais cedo");
	assert.match(l[5], /^ atenção +Precisa de você · pergunta aberta +13:42$/);
});

test("adicionar: mais novo primeiro e limite de 50", () => {
	let lista: any[] = [];
	for (let i = 0; i < 60; i++) lista = m.adicionar(lista, { hora: i, glifo: "●", texto: `a${i}` });
	assert.equal(lista.length, 50);
	assert.equal(lista[0].texto, "a59");
	assert.equal(lista[49].texto, "a10");
});

test("ajustes: linhas, valores atuais, ❯ no item, dica", () => {
	const { painel } = cria();
	painel.handleInput("\t");
	const l = painel.render(80).map((x: string) => x.trimEnd());
	assert.match(l[0], /^── Avisos ─+ recentes {4}ajustes {2}──$/);
	assert.equal(l[1], " ❯ Avisar quando eu estiver fora  terminou · precisa de mim · erro");
	assert.equal(l[2], "   Canal                          notificação do sistema");
	assert.equal(l[3], "   Som                            precisa de mim · erro");
	assert.equal(l[4], "   Progresso na aba do terminal   ligado");
	assert.equal(l[5], "   Testar agora");
	assert.equal(l[6], "  ↑↓  escolhe    espaço  muda    tab  recentes    esc  fecha");
});

test("espaço muda a linha, grava e redesenha; ↑↓ limitam; tab volta; esc fecha", () => {
	const { painel, estado } = cria();
	painel.handleInput("\t");
	painel.handleInput(" "); // avisar: terminou·precisa·erro → precisa·erro
	assert.deepEqual(estado.salvos.at(-1).avisar, ["precisa", "erro"]);
	painel.handleInput(UP);
	assert.equal(painel.index, 0);
	painel.handleInput(DOWN);
	painel.handleInput(" "); // canal: sistema → sino
	assert.equal(estado.salvos.at(-1).canal, "sino");
	painel.handleInput(DOWN);
	painel.handleInput(" "); // som: precisa·erro → erro
	assert.deepEqual(estado.salvos.at(-1).som, ["erro"]);
	painel.handleInput(DOWN);
	painel.handleInput(" "); // progresso: liga → desliga
	assert.equal(estado.salvos.at(-1).progresso, false);
	for (let i = 0; i < 5; i++) painel.handleInput(DOWN);
	assert.equal(painel.index, 4);
	painel.handleInput(" ");
	assert.equal(estado.testes, 1);
	assert.equal(estado.salvos.length, 4);
	assert.ok(estado.redraws >= 8);
	painel.handleInput("\t");
	assert.equal(painel.aba, "recentes");
	painel.handleInput(" "); // fora dos ajustes, espaço não muda nada
	assert.equal(estado.salvos.length, 4);
	painel.handleInput("\x1b");
	assert.equal(estado.fechou, 1);
});

test("girar: ciclos completos voltam ao início; subconjunto estranho vai ao primeiro preset", () => {
	let c = cfg.PADRAO;
	for (let i = 0; i < 4; i++) c = m.girar(c, 1);
	assert.equal(c.canal, "sistema");
	for (let i = 0; i < 4; i++) c = m.girar(c, 2);
	assert.deepEqual(c.som, cfg.PADRAO.som);
	assert.deepEqual(m.girar({ ...cfg.PADRAO, avisar: ["terminou"] }, 0).avisar, ["terminou", "precisa", "erro"]);
	assert.deepEqual(m.girar({ ...cfg.PADRAO, som: ["erro"] }, 2).som, []);
	assert.equal(m.rotuloEventos([]), "nenhum");
});
