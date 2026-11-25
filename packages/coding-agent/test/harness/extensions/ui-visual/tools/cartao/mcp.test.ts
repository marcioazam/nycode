// Ferramentas MCP em uma linha: ver mcp/linha.ts.
import assert from "node:assert/strict";
import { test } from "vitest";
import * as __m1 from "../../../../../../src/extensions/ui-visual/mcp/linha.ts";
import * as __m2 from "../../../../../../src/extensions/ui-visual/motion/vivo.ts";
import { ctx, mod, nativeComponent, plain as plain0 } from "../base.ts";

const { linhaMcp } = __m1;
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
const NOME = "mcp__computer_use_linux__screenshot";
const ARGS = { wm_class: "Nybot", max_width: 900 };
const desenha = (st: any, c: Record<string, unknown>, agora: number, w = 200) =>
	linhaMcp(NOME, ARGS, st, th, ctx({ toolCallId: "mcp-t", ...c }), w, { agora: () => agora }) as string[];

test('executando: uma linha com a chave respirando, só o tempo vivo à direita e a barra fina; sem "aguardando"', () =>
	amb(() => {
		iniciou("mcp-t", 1000);
		const l = desenha({}, { isPartial: true }, 1000 + 12_000);
		assert.equal(l.length, 2, "linha + barra");
		const p = plain(l[0]!);
		assert.match(p, /^ {3}\uf0ad computer_use_linux › screenshot {2}wm_class="Nybot" max_width=900 +00:12 $/);
		assert.doesNotMatch(plain(l.join("\n")), /aguardando/);
		assert.match(l[0]!, /\x1b\[38;2;[\d;]+m\uf0ad\x1b\[39m/, "a chave respira (cor interpolada, não token fixo)");
		assert.ok(
			l[0]!.includes("<syntaxType>computer_use_linux</c>") &&
				l[0]!.includes("<dim>›</c>") &&
				l[0]!.includes("<b>screenshot</b>"),
		);
		assert.match(plain(l[1]!), /^ {2}[━─]+$/);
		assert.ok(l[1]!.includes("<accent>━</c>") && l[1]!.includes("<borderMuted>─</c>"));
		assert.notEqual(desenha({}, { isPartial: true }, 1000 + 12_450)[1], l[1], "o trecho desliza");
		terminou("mcp-t");
	}));

test("ok: uma linha, chave verde, resumo em muted e duração; sem barra", () =>
	amb(() => {
		const st = { uiMcp: { res: "imagem · 33 KB", aviso: false } };
		const l = desenha(st, { isPartial: false, durationMs: 1200 }, 5000);
		assert.equal(l.length, 1);
		assert.match(plain(l[0]!), /\uf0ad computer_use_linux › screenshot.* imagem · 33 KB {2}1,2 s $/);
		assert.ok(
			l[0]!.includes("<success>\uf0ad</c>") &&
				l[0]!.includes("<muted>imagem · 33 KB</c>") &&
				l[0]!.includes("<dim>1,2 s</c>"),
		);
	}));

test("erro e aviso: resumo na cor do estado, chave vermelha ou âmbar, uma linha", () =>
	amb(() => {
		const e = desenha(
			{ uiMcp: { res: "janela não encontrada", aviso: false } },
			{ isPartial: false, isError: true, durationMs: 400 },
			5000,
		);
		assert.equal(e.length, 1);
		assert.ok(
			e[0]!.includes("<error>\uf0ad</c>") &&
				e[0]!.includes("<error>janela não encontrada</c>") &&
				plain(e[0]!).trimEnd().endsWith("0,4 s"),
		);
		const a = desenha({ uiMcp: { res: "truncado", aviso: true } }, { isPartial: false, durationMs: 1200 }, 5000);
		assert.equal(a.length, 1);
		assert.ok(a[0]!.includes("<warning>\uf0ad</c>") && a[0]!.includes("<warning>truncado</c>"));
	}));

test("flash na troca: ao assentar a linha sobe do fundo em 500 ms, uma vez; histórico e movimento reduzido já nascem assentados", () =>
	amb(() => {
		const st: any = {};
		desenha(st, { isPartial: true }, 1000);
		st.uiMcp = { res: "imagem", aviso: false };
		const k0 = desenha(st, { isPartial: false, durationMs: 900 }, 1100)[0]!;
		const meio = desenha(st, { isPartial: false, durationMs: 900 }, 1350)[0]!;
		const fim = desenha(st, { isPartial: false, durationMs: 900 }, 1100 + 500)[0]!;
		assert.ok(k0.slice(2).startsWith("\x1b[38;2;30;30;40m"), "em 0 a frente é a cor do fundo");
		assert.ok(meio.slice(2).startsWith("\x1b[38;2;") && meio !== k0 && meio !== fim);
		assert.ok(!fim.includes("\x1b[38;2;30;30;40m") && fim.includes("<success>\uf0ad</c>"), "assentado");
		assert.equal(desenha(st, { isPartial: false, durationMs: 900 }, 9000)[0], fim, "não repete");
		// histórico: nunca visto rodando
		assert.equal(
			desenha({ uiMcp: { res: "imagem", aviso: false } }, { isPartial: false, durationMs: 900 }, 1)[0],
			fim,
		);
	}));

test("movimento reduzido: sem flash e sem respiração", () =>
	amb(
		() => {
			const r: any = {};
			desenha(r, { isPartial: true }, 1000);
			r.uiMcp = { res: "imagem", aviso: false };
			assert.ok(!desenha(r, { isPartial: false, durationMs: 900 }, 1100)[0]!.includes("\x1b[38;2;"));
			assert.equal(desenha({}, { isPartial: true }, 0)[0], desenha({}, { isPartial: true }, 800)[0]);
		},
		{ NYCODE_REDUCED_MOTION: "1" },
	));

test("integração: mcp__ vira uma linha sem caixa; expandido mostra o corpo; demais tools não mudam; imagem segue no resultado", () =>
	amb(() => {
		const w =
			(mod as any).default &&
			(() => {
				let r: any;
				mod.default({
					registerToolRenderer: (x: unknown) => {
						r = x;
					},
					on: () => {},
				} as never);
				return r;
			})();
		const r = w(NOME, () => ({
			renderCall: () => nativeComponent("nativo-call"),
			renderResult: () => nativeComponent("nativo-result"),
		}));
		assert.equal(r.renderShell, "self");
		const c = ctx({ args: ARGS, state: {}, isPartial: false, durationMs: 1200, keyText: () => "ctrl+o" });
		const result = { content: [{ type: "image", data: "x", mimeType: "image/png" }], details: {} };
		const corpo = r.renderResult(result, { expanded: false, isPartial: false }, th, c).render(120);
		assert.deepEqual(corpo, [], "fechado: só a linha");
		const l = r.renderCall(ARGS, th, c).render(200).map(plain);
		assert.equal(l.length, 1);
		assert.match(l[0], /computer_use_linux › screenshot.* imagem {2}1,2 s/);
		const aberto = r.renderResult(result, { expanded: true, isPartial: false }, th, c).render(120).map(plain);
		assert.deepEqual(aberto, ["  nativo-result"]);
		const outro = w("mcp_nao", () => ({
			renderCall: () => nativeComponent("x"),
			renderResult: () => nativeComponent("y"),
		}));
		assert.notEqual(outro.renderShell, "self");
	}));
