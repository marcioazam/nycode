// K20: the resumed-session divider replaces the plain "Resumed session" status line.
import assert from "node:assert/strict";
import { visibleWidth } from "@nycode/tui";
import { test } from "vitest";
import { InteractiveMode } from "../../../../src/modes/interactive/interactive-mode.ts";
import { ha, linha, mostrarRetomada, partes } from "../../../../src/modes/interactive/retomada/index.ts";
import { initTheme } from "../../../../src/modes/interactive/theme/theme.ts";

const vw = (s: string) => [...s].length;
const MIN = 60_000;

test("ha: pt-BR curto por faixa; inválido some", () => {
	assert.equal(ha(10_000), "agora há pouco");
	assert.equal(ha(5 * MIN), "há 5 min");
	assert.equal(ha(125 * MIN), "há 2h");
	assert.equal(ha(50 * 60 * MIN), "há 2d");
	assert.equal(ha(Number.NaN), "");
	assert.equal(ha(-1), "");
});

test("partes: título, nome (se houver) e tempo de inatividade", () => {
	assert.deepEqual(partes({ nome: " abas ", ultima: 0, agora: 125 * MIN }), [
		"sessão retomada",
		"abas",
		"parada há 2h",
	]);
	assert.deepEqual(partes({ nome: undefined, ultima: Number.NaN, agora: 0 }), ["sessão retomada"]);
});

test("linha: divisor sem régua, centralizado; detalhes caem do fim quando falta espaço", () => {
	const ps = ["sessão retomada", "abas", "parada há 2h"];
	for (const w of [0, 3, 10, 22, 30, 50, 120]) {
		const l = linha(w, ps, vw);
		assert.ok(vw(l) <= w, `largura ${w}`);
		assert.equal(l.length - l.trimStart().length, Math.floor((w - vw(l.trim())) / 2));
	}
	assert.equal(linha(80, ps, vw).trim(), "sessão retomada · abas · parada há 2h");
	assert.equal(linha(30, ps, vw).trim(), "sessão retomada · abas");
	assert.equal(linha(10, ps, vw), "sessão ret");
});

function host(name: string | undefined, leaf: string | undefined) {
	const kids: any[] = [];
	let renders = 0;
	const im = {
		sessionManager: { getSessionName: () => name, getLeafEntry: () => (leaf ? { timestamp: leaf } : undefined) },
		chatContainer: { addChild: (c: any) => kids.push(c) },
		ui: { requestRender: () => renders++ },
	};
	return { im, kids, renders: () => renders };
}

test("mostrarRetomada: põe espaçador e divisor no chat e pede render", () => {
	initTheme("dark");
	const h = host("abas", new Date(Date.now() - 3 * MIN).toISOString());
	mostrarRetomada(h.im as never);
	assert.equal(h.renders(), 1);
	assert.equal(h.kids.length, 2);
	const texto = "sessão retomada · abas · parada há 3 min";
	const out = h.kids[1].render(80)[0].replace(/\x1b\[[0-9;]*m/g, "");
	assert.equal(out, " ".repeat(Math.floor((80 - visibleWidth(texto)) / 2)) + texto);
});

test("K20: resuming a session shows the divider, not the plain status line", async () => {
	initTheme("dark");
	const h = host("x", undefined);
	const statuses: string[] = [];
	const self: any = {
		...h.im,
		clearStatusIndicator() {},
		runtimeHost: { switchSession: async () => ({ cancelled: false }) },
		createProjectTrustContext: () => undefined,
		showStatus: (m: string) => statuses.push(m),
	};
	const result = await (InteractiveMode.prototype as any).handleResumeSession.call(self, "/tmp/s.jsonl");
	assert.deepEqual(result, { cancelled: false });
	assert.deepEqual(statuses, []);
	assert.equal(h.kids.length, 2);
});
