// node --experimental-strip-types --test extensions/ui-visual/test/tools/marcas.test.ts
// Onda 10: P12 (sublinhado ondulado), P13 (links OSC 8) e o estado vivo das tools (P06, P08).
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { hostname, tmpdir } from "node:os";
import { join } from "node:path";
import { resetCapabilitiesCache, setCapabilities } from "@nycode/tui";
import { afterEach, test, vi } from "vitest";
import * as __m3 from "../../../../../src/extensions/ui/a11y.ts";
import * as __m1 from "../../../../../src/extensions/ui-visual/motion/marcas.ts";
import * as __m2 from "../../../../../src/extensions/ui-visual/motion/vivo.ts";
import * as __r4 from "./base.ts";

const m = __m1;
const vivo = __m2;
const a11y = __m3;

const theme = {
	fg: (c: string, t: string) => `<${c}>${t}</>`,
	getFgAnsi: (c: string) => (c === "error" ? "\x1b[38;2;215;0;21m" : ""),
};
const comLinks = (v: boolean) => setCapabilities({ images: null, trueColor: true, hyperlinks: v });
afterEach(() => {
	resetCapabilitiesCache();
	a11y.definirMovimento(undefined);
});

test("P12 ondulado: 4:3 e cor 58 no kitty; sublinhado simples no tmux e em terminal desconhecido; NO_COLOR sem cor", () => {
	assert.equal(m.ondulado("}", theme, { TERM: "xterm-kitty" }), "\x1b[4:3m\x1b[58:2::215:0:21m}\x1b[59m\x1b[4:0m");
	assert.equal(m.ondulado("}", theme, { TERM: "xterm-kitty", NO_COLOR: "1" }), "\x1b[4:3m}\x1b[4:0m");
	assert.equal(m.ondulado("}", theme, { TERM: "xterm-kitty", TMUX: "/tmp/x" }), "\x1b[4m<error>}</>\x1b[24m");
	assert.equal(m.ondulado("}", theme, { TERM: "xterm-256color" }), "\x1b[4m<error>}</>\x1b[24m");
	assert.equal(m.temOndulado({ TERM: "xterm-256color", VTE_VERSION: "7600" }), true);
	assert.equal(m.temOndulado({ TERM: "xterm-256color", TERM_PROGRAM: "WezTerm" }), true);
	assert.equal(m.ondulado("", theme, {}), "");
});

test("P12 linhaSintaxe: posição em texto e só o trecho sublinhado", () => {
	const l = m.linhaSintaxe({ line: 12, column: 5, text: "unexpected }" }, theme, { TERM: "dumb" });
	assert.equal(
		l,
		"<error>✕</> <muted>erro de sintaxe na linha 12:5</>  <dim>inesperado</> \x1b[4m<error>}</>\x1b[24m",
	);
	assert.match(
		m.linhaSintaxe({ line: 1, column: 1, text: "missing )" }, theme, { TERM: "dumb" }),
		/<dim>falta<\/> \x1b\[4m<error>\)/,
	);
});

test("P13 linkArquivo: OSC 8 com host e linha só quando o terminal entende; senão o texto puro", () => {
	comLinks(true);
	assert.equal(
		m.linkArquivo("a.ts", "src/a.ts", "/w", 42),
		`\x1b]8;;file://${hostname()}/w/src/a.ts#42\x1b\\a.ts\x1b]8;;\x1b\\`,
	);
	assert.equal(m.urlArquivo("/w/x #1.ts"), `file://${hostname()}/w/x%20%231.ts`);
	comLinks(false);
	assert.equal(m.linkArquivo("a.ts", "src/a.ts", "/w", 42), "a.ts");
	assert.equal(m.primeiraLinhaDiff("  3 ctx\n- 4 old\n+ 4 new"), 4);
	assert.equal(m.primeiraLinhaDiff(undefined), undefined);
});

test("P13 ligarCaminhos: liga caminho que existe e #123 do GitHub; respeita cercas e links prontos", () => {
	const cwd = mkdtempSync(join(tmpdir(), "marcas-"));
	mkdirSync(join(cwd, "src"));
	writeFileSync(join(cwd, "src", "a.ts"), "");
	const u = (p: string, l?: number) => `file://${hostname()}${join(cwd, p)}${l ? `#${l}` : ""}`;
	comLinks(true);
	assert.equal(
		m.ligarCaminhos("veja `src/a.ts:3` e src/a.ts", cwd, undefined),
		`veja [\`src/a.ts:3\`](${u("src/a.ts", 3)}) e [src/a.ts](${u("src/a.ts")})`,
	);
	assert.equal(
		m.ligarCaminhos("src/nao.ts e v1.5.2", cwd, undefined),
		"src/nao.ts e v1.5.2",
		"só o que existe vira link",
	);
	assert.equal(m.ligarCaminhos("fecha #12", cwd, "dono/repo"), "fecha [#12](https://github.com/dono/repo/issues/12)");
	assert.equal(m.ligarCaminhos("fecha #12", cwd, undefined), "fecha #12");
	const cerca = "```\nsrc/a.ts #12\n```";
	assert.equal(m.ligarCaminhos(cerca, cwd, "dono/repo"), cerca);
	assert.equal(
		m.ligarCaminhos("[src/a.ts](x) https://h/src/a.ts", cwd, undefined),
		"[src/a.ts](x) https://h/src/a.ts",
	);
	comLinks(false);
	assert.equal(m.ligarCaminhos("src/a.ts #12", cwd, "dono/repo"), "src/a.ts #12", "sem OSC 8 nada muda");
});

test("P06 tempoVivo: só a partir de 2 s, com minutos; some ao terminar e em desligado", () => {
	vivo.iniciou("t1", 1000);
	assert.equal(vivo.tempoVivo("t1", 2999, {}), "");
	assert.equal(vivo.tempoVivo("t1", 15_000, {}), "14s");
	assert.equal(vivo.tempoVivo("t1", 66_000, {}), "1m 05s");
	assert.equal(vivo.tempoVivo("t1", 15_000, { NO_PROGRESS: "1" }), "");
	vivo.terminou("t1", 20_000);
	assert.equal(vivo.tempoVivo("t1", 30_000, {}), "");
	assert.equal(vivo.tempoVivo(undefined, 30_000, {}), "");
});

test("P08 idadeFim e tocar: transição dura o tempo pedido e quem não redesenha sai", () => {
	let inv = 0;
	const ctx = { toolCallId: "t2", invalidate: () => inv++ };
	assert.equal(vivo.idadeFim(ctx, 200), undefined, "sem fim conhecido");
	vivo.terminou("t2");
	const idade = vivo.idadeFim(ctx, 200);
	assert.ok(idade !== undefined && idade >= 0 && idade < 200);
	assert.equal(vivo.vivas(), 1, "a transição mantém o redesenho");
	vivo.terminou("t2", performance.now() - 500);
	assert.equal(vivo.idadeFim(ctx, 200), undefined, "passado o tempo, assentado");
	assert.equal(vivo.vivas(), 0);
	a11y.definirMovimento("desligado");
	vivo.tocar({ toolCallId: "t3", invalidate: () => inv++ });
	assert.equal(vivo.vivas(), 0, "desligado: nada fica vivo");
});

// U10/U11: caminho citado antes de o arquivo existir vira link depois de NEGATIVO_MS; o mesmo texto reaproveita o resultado.
test("U11 caminho que não existia vira link depois do TTL; U10 o mesmo texto reaproveita o resultado dentro dele", () => {
	const cwd = mkdtempSync(join(tmpdir(), "marcas-neg-"));
	comLinks(true);
	const mock = vi.spyOn(Date, "now").mockImplementation(() => 1_000_000);
	const md = "criei novo/arquivo.ts agora";
	assert.equal(m.ligarCaminhos(md, cwd, undefined), md);
	mkdirSync(join(cwd, "novo"));
	writeFileSync(join(cwd, "novo", "arquivo.ts"), "");
	assert.equal(m.ligarCaminhos(md, cwd, undefined), md, "dentro do TTL: mesmo resultado (memo e negativo recente)");
	mock.mockImplementation(() => 1_000_000 + m.NEGATIVO_MS + 1);
	assert.match(
		m.ligarCaminhos(md, cwd, undefined),
		/\[novo\/arquivo\.ts\]\(file:\/\/.*\/novo\/arquivo\.ts\)/,
		"passado o TTL o arquivo novo é visto",
	);
	assert.match(m.ligarCaminhos("de novo novo/arquivo.ts", cwd, undefined), /\]\(file:/, "outro texto também enxerga");
});

// U25: a consulta ao git não bloqueia.
test("U25 repoGithub é assíncrono e acha o owner/repo do origin; sem origin, undefined", async () => {
	const { execFileSync } = await import("node:child_process");
	const dir = mkdtempSync(join(tmpdir(), "marcas-git-"));
	execFileSync("git", ["init", "-q", dir]);
	const sem = m.repoGithub(dir);
	assert.ok(sem instanceof Promise, "devolve promessa em vez de bloquear o laço");
	assert.equal(await sem, undefined);
	execFileSync("git", ["-C", dir, "remote", "add", "origin", "git@github.com:dono/repo.git"]);
	assert.equal(await m.repoGithub(dir), "dono/repo");
	assert.equal(await m.repoGithub(join(dir, "nao-existe")), undefined);
});

// U15: sem tool_execution_end a chamada não fica rodando para sempre nem o mapa cresce sem teto.
test("U15 reiniciar limpa o que está rodando; o mapa de início tem teto", () => {
	vivo.iniciou("orfa");
	assert.equal(vivo.rodando("orfa"), true);
	vivo.reiniciar();
	assert.equal(vivo.rodando("orfa"), false);
	for (let i = 0; i < 1000; i++) vivo.iniciou(`o${i}`);
	assert.equal(vivo.rodando("o0"), false, "as mais antigas saem");
	assert.equal(vivo.rodando("o999"), true);
	vivo.reiniciar();
});

test("U15 session_start e session_shutdown da tool limpam as chamadas rodando", async () => {
	const { mod } = __r4;
	const on: Record<string, any> = {};
	mod.default({
		registerToolRenderer() {},
		on: (e: string, h: unknown) => {
			on[e] = h;
		},
	} as never);
	vivo.iniciou("x1");
	on.session_start({}, {});
	assert.equal(vivo.rodando("x1"), false);
	vivo.iniciou("x2");
	on.session_shutdown({}, {});
	assert.equal(vivo.rodando("x2"), false);
});
