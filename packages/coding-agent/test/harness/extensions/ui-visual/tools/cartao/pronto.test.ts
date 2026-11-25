// plan_mode_complete em "Expandido" + "Cascata": ver plano/pronto.ts.
import assert from "node:assert/strict";
import { test } from "vitest";
import * as __m2 from "../../../../../../src/extensions/ui-visual/motion/vivo.ts";
import * as __m1 from "../../../../../../src/extensions/ui-visual/plano/pronto.ts";
import { ctx, plain as plain0, resolverOf } from "../base.ts";

const { linhasPronto, resumoPronto } = __m1;
const { iniciou, terminou } = __m2;

const RGB: Record<string, number[]> = {
	text: [200, 200, 200],
	accent: [100, 150, 250],
	dim: [90, 90, 90],
	success: [0, 200, 0],
	error: [220, 0, 0],
	muted: [140, 140, 140],
	syntaxType: [0, 200, 200],
	customMessageBg: [30, 30, 40],
};
const th = {
	fg: (c: string, t: string) => (c === "borderMuted" ? `\x1b[38;2;59;66;97m${t}\x1b[39m` : `<${c}>${t}</c>`),
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
const PLANO = "Tier: T2 (sinais: vários módulos)\n\n## Fases\n1. Mapear tokens\n2. Criar o conjunto\n3. Rodar o gate";
const ARQ = `${process.env.HOME}/.nycode/agent/plans/2026-11-20-01a1f5d2.md`;
const OK = txt(`Plan submitted and saved to ${ARQ}. The user will now review it.`);
const desenha = (r: unknown, c: Record<string, unknown> = {}, agora = 5000, args: any = { plan: PLANO }) => {
	const st: any = { uiPronto: r === undefined ? undefined : resumoPronto(r, c.isError === true) };
	return linhasPronto(
		args,
		st,
		th,
		ctx({ toolCallId: "pp-t", isPartial: false, ...c }),
		400,
		c.isPartial === true ? "" : "00:26",
		"alt+o",
		{ agora: () => agora },
	) as string[];
};

test("resumo: enviado com o arquivo; rejeitado com os problemas; sem arquivo e fora do modo plano", () => {
	assert.deepEqual(resumoPronto(OK, false), {
		ok: true,
		rotulo: "plano enviado para revisão",
		arquivo: ARQ,
		problemas: [],
	});
	const rej = resumoPronto(
		txt(
			`Plan not accepted. It was saved to ${ARQ}. Fix these there with the edit tool, then call plan_mode_complete with plan "@file" (do not resend the plan):\n- falta AC1\n- falta risco`,
		),
		false,
	);
	assert.deepEqual(
		[rej.ok, rej.rotulo, rej.arquivo, rej.problemas],
		[false, "plano não aceito", ARQ, ["falta AC1", "falta risco"]],
	);
	assert.match(resumoPronto(txt("No plan file to submit; pass the plan text."), false).problemas[0], /não há arquivo/);
	assert.match(resumoPronto(txt("Not in plan mode; tool ignored."), false).problemas[0], /modo plano/);
	assert.equal(resumoPronto(txt("boom"), true).problemas[0], "boom");
});

test("aberto: ícone e Plano neutros com dois espaços, estado colorido, hora dim e alt+o recolher; tier, 9 etapas numeradas e o arquivo", () =>
	amb(() => {
		const l = desenha(OK, { expanded: true });
		assert.match(plain(l[0]!), /^ \uf0ea {2}Plano · plano enviado para revisão ─+ 00:26 {2}alt\+o recolher$/);
		assert.ok(
			l[0]!.startsWith(
				" <muted>\uf0ea</c>  <text><b>Plano</b></c><dim> · </c><success>plano enviado para revisão</c>",
			),
		);
		assert.ok(
			l[0]!.endsWith("<dim>00:26</c>  <accent>alt+o</c><dim> recolher</c>") && !/\x1b\[48/.test(l[0]!),
			"hora padrão sem pílula",
		);
		assert.deepEqual(l.slice(1).map(plain), [
			"   Tier: T2 (sinais: vários módulos)",
			"    1. Mapear tokens",
			"    2. Criar o conjunto",
			"    3. Rodar o gate",
			"   ~/.nycode/agent/plans/2026-11-20-01a1f5d2.md",
		]);
		assert.ok(
			l[1]!.includes("<muted>") &&
				l[2]!.includes("<text>Mapear tokens</c>") &&
				l[2]!.includes("<dim>") &&
				l.at(-1)!.includes("<dim>"),
		);
	}));

test("recolhido: só o cabeçalho com alt+o expandir e o arquivo; sem as etapas", () =>
	amb(() => {
		const l = desenha(OK, { expanded: false });
		assert.equal(l.length, 2);
		assert.match(plain(l[0]!), /alt\+o expandir$/);
		assert.doesNotMatch(l.join("\n"), /Mapear/);
	}));

test("erro: rótulo e motivo em pt-BR na cor de erro, ícone x neutro, sem etapas", () =>
	amb(() => {
		const r = txt(`Plan not accepted. It was saved to ${ARQ}. Fix:\n- falta AC1`);
		const l = desenha(r, { expanded: true });
		assert.match(plain(l[0]!), /^ \uf00d {2}Plano · plano não aceito ─+/);
		assert.ok(l[0]!.includes("<error>plano não aceito</c>") && l[0]!.includes("<muted>\uf00d</c>"));
		assert.equal(plain(l[1]!), "   falta AC1");
		assert.ok(l[1]!.includes("<error>"));
		assert.doesNotMatch(l.join("\n"), /Mapear/);
	}));

test("enviando: o ícone respira (sem spinner), sem hora nem dica", () =>
	amb(() => {
		iniciou("pp-t", 1000);
		const a = desenha(undefined, { isPartial: true }, 1000),
			b = desenha(undefined, { isPartial: true }, 1800);
		assert.equal(a.length, 1);
		assert.match(plain(a[0]!), /^ \uf0ea {2}Plano · enviando o plano…$/);
		assert.match(a[0]!, /^ \x1b\[38;2;[\d;]+m\uf0ea\x1b\[39m/);
		assert.notEqual(a[0], b[0]);
		assert.doesNotMatch(a[0]!, /[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/);
		terminou("pp-t");
	}));

test("cascata: ao chegar cada linha se revela da esquerda, 80 ms depois da anterior (300 ms cada); histórico e movimento reduzido já assentados", () =>
	amb(() => {
		iniciou("pp-t", 0);
		terminou("pp-t", 10_000);
		const ini = desenha(OK, { expanded: true }, 10_000),
			meio = desenha(OK, { expanded: true }, 10_150),
			fim = desenha(OK, { expanded: true }, 10_900);
		assert.equal(plain(ini[0]!).trim(), "", "nada no 1º quadro");
		assert.ok(
			plain(meio[0]!).trim().length > 0 && plain(meio[0]!).trim().length < plain(fim[0]!).trim().length,
			"a 1ª já avançou",
		);
		assert.equal(plain(meio.at(-1)!).trim(), "", "a última ainda não começou");
		assert.deepEqual(fim, desenha(OK, { expanded: true }, 20_000), "assentado");
		assert.deepEqual(desenha(OK, { expanded: true, toolCallId: "nunca" }, 10_100), fim, "histórico");
		amb(() => assert.deepEqual(desenha(OK, { expanded: true }, 10_100), fim, "reduzido"), {
			NYCODE_REDUCED_MOTION: "1",
		});
	}));

test("integração: plan_mode_complete sem cartão, sem corpo cru e com a dica da tecla configurada", () =>
	amb(() => {
		const w = resolverOf().resolver("plan_mode_complete", () => ({}));
		assert.equal(w.renderShell, "self");
		const c = ctx({ toolCallId: "pp-int", args: { plan: PLANO }, expanded: true, keyText: () => "alt+o" });
		assert.deepEqual(w.renderResult(OK, { expanded: true, isPartial: false }, th, c).render(400), []);
		const call = w.renderCall(c.args, th, c).render(400);
		assert.match(plain(call[0]), /Plano · plano enviado para revisão/);
		assert.ok(!call.join("").includes("plan_mode_complete"));
	}));
