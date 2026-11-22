// /contexto: the per-session compaction limit (saved in the session, restored on resume) and the lean summary.
import assert from "node:assert/strict";
import { afterEach, beforeEach, test, vi } from "vitest";
import { getSessionCompactAt, setSessionCompactAt } from "../../../../src/core/compaction/session-limit.ts";
import type { ExtensionAPI } from "../../../../src/core/extensions/types.ts";
import contextoExtension, { condensePrevious, parseTokens } from "../../../../src/extensions/contexto/index.ts";

beforeEach(() => {
	vi.stubEnv("NYCODE_COMPACT_AT", "");
	vi.stubEnv("NYCODE_COMPACT_SUMMARY_MAX", "");
});
afterEach(() => {
	vi.unstubAllEnvs();
	setSessionCompactAt(undefined);
});

test("parseTokens: válidos e inválidos", () => {
	assert.equal(parseTokens("400k"), 400_000);
	assert.equal(parseTokens("1,5m"), 1_500_000);
	assert.equal(parseTokens("0"), null);
	assert.equal(parseTokens("-5"), null);
	assert.equal(parseTokens("abc"), null);
	assert.equal(parseTokens(""), null);
});

test("condensePrevious: no limite não muda; max+1 condensa", () => {
	const mk = (n: number) => ({ previousSummary: "x".repeat(n), messagesToSummarize: [] as unknown[] });
	const a = mk(10);
	assert.equal(condensePrevious(a, 10), false);
	assert.equal(a.messagesToSummarize.length, 0);
	const b = mk(11);
	assert.equal(condensePrevious(b, 10), true);
	assert.equal(b.messagesToSummarize.length, 1);
	assert.equal(b.previousSummary, undefined);
});

test("F2: NYCODE_COMPACT_SUMMARY_MAX inválido usa 40000 (não condensa sempre)", () => {
	vi.stubEnv("NYCODE_COMPACT_SUMMARY_MAX", "abc");
	assert.equal(condensePrevious({ previousSummary: "x".repeat(100), messagesToSummarize: [] }), false);
	assert.equal(condensePrevious({ previousSummary: "x".repeat(40_001), messagesToSummarize: [] }), true);
	vi.stubEnv("NYCODE_COMPACT_SUMMARY_MAX", "50");
	assert.equal(condensePrevious({ previousSummary: "x".repeat(100), messagesToSummarize: [] }), true);
});

type Handler = (...a: any[]) => any;
function boot() {
	const h: Record<string, Handler> = {};
	const commands: Record<string, Handler> = {};
	const entries: Array<[string, unknown]> = [];
	contextoExtension({
		getSettings: () => ({}),
		on: (e: string, f: Handler) => {
			h[e] = f;
		},
		registerCommand: (n: string, o: { handler: Handler }) => {
			commands[n] = o.handler;
		},
		appendEntry: (t: string, d: unknown) => entries.push([t, d]),
	} as unknown as ExtensionAPI);
	const notes: Array<[string, string]> = [];
	const ctx = (window?: number, branch: unknown[] = []) => ({
		hasUI: true,
		getContextUsage: () => ({ contextWindow: window }),
		sessionManager: { getBranch: () => branch },
		ui: { notify: (m: string, t: string) => notes.push([m, t]) },
	});
	return { h, commands, entries, notes, ctx };
}

test("/contexto 400k grava na sessão e define o limite; padrao restaura", async () => {
	const t = boot();
	await t.h.session_start({}, t.ctx());
	assert.equal(getSessionCompactAt(), undefined);
	await t.commands.contexto?.("400k", t.ctx(1_000_000));
	assert.equal(getSessionCompactAt(), 400_000);
	assert.deepEqual(t.entries, [["contexto", { limit: 400_000 }]]);
	assert.match(t.notes.at(-1)?.[0] ?? "", /a partir de 400k tokens/);
	await t.commands.contexto?.("padrao", t.ctx(1_000_000));
	assert.equal(getSessionCompactAt(), undefined);
});

test("/contexto: sem argumento informa; abaixo do padrão, inválido e acima da janela são recusados", async () => {
	const t = boot();
	await t.h.session_start({}, t.ctx());
	await t.commands.contexto?.("", t.ctx(1_000_000));
	assert.match(t.notes.at(-1)?.[0] ?? "", /^Compacta em 250k de 1000k\./);
	for (const bad of ["100k", "abc"]) {
		await t.commands.contexto?.(bad, t.ctx(1_000_000));
		assert.equal(t.notes.at(-1)?.[1], "warning", bad);
	}
	await t.commands.contexto?.("1m", t.ctx(1_000_000));
	assert.match(t.notes.at(-1)?.[0] ?? "", /≥ janela do modelo/);
	assert.equal(getSessionCompactAt(), undefined);
	assert.equal(t.entries.length, 0);
});

test("session_start restaura o último /contexto do ramo; sem registro volta ao padrão", async () => {
	const t = boot();
	const entry = (limit: unknown) => ({ type: "custom", customType: "contexto", data: { limit } });
	await t.h.session_start({}, t.ctx(undefined, [entry(300_000), entry(500_000)]));
	assert.equal(getSessionCompactAt(), 500_000);
	await t.h.session_start({}, t.ctx(undefined, [entry("lixo")]));
	assert.equal(getSessionCompactAt(), undefined);
	await t.h.session_start({}, t.ctx(undefined, []));
	assert.equal(getSessionCompactAt(), undefined);
});

test("session_before_compact condensa um resumo grande e avisa", async () => {
	const t = boot();
	const preparation = { previousSummary: "x".repeat(41_000), messagesToSummarize: [] as unknown[] };
	await t.h.session_before_compact({ preparation }, t.ctx());
	assert.equal(preparation.previousSummary, undefined);
	assert.equal(preparation.messagesToSummarize.length, 1);
	assert.match(t.notes.at(-1)?.[0] ?? "", /Resumo anterior com 41k caracteres/);
});
