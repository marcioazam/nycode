// node --experimental-strip-types --test ~/.nycode/agent/extensions/ui/test/history.test.ts
import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, truncateSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "vitest";
import * as __m1 from "../../../../src/extensions/ui/history.ts";

// O Node não tira tipos de .ts dentro de node_modules: testa uma cópia do módulo, com o nycode ao lado.
const tmp = mkdtempSync(join(tmpdir(), "ui-history-test-"));
// history.ts importa folha/sheet.ts e ui-visual/icons.ts: a cópia mantém o layout de extensions/.
delete process.env.NYCODE_ASCII_ICONS; // glifos (⌕ ❯ ⏎) só fora do modo ASCII
process.env.TERM = "xterm-256color";
const m = __m1;

const line = (content: unknown, role = "user") => JSON.stringify({ type: "message", message: { role, content } });
const file = (dir: string, name: string, lines: string[], mtime?: number) => {
	mkdirSync(dir, { recursive: true });
	const p = join(dir, name);
	writeFileSync(p, lines.join("\n"));
	if (mtime) utimesSync(p, mtime, mtime);
	return p;
};
const tick = () => new Promise((r) => setImmediate(r));

test("parseUserPrompts: string, blocos, outros papéis, linha corrompida e vazia", () => {
	const text = [
		line("um"),
		line([{ type: "text", text: "dois" }, { type: "image" }, { type: "text", text: "três" }]),
		line("resposta", "assistant"),
		'{"role":"user" corrompido',
		line("   "),
		line({ x: 1 }),
		JSON.stringify({ type: "custom", message: { role: "user", content: "ignorado" } }),
	].join("\n");
	assert.deepEqual(m.parseUserPrompts(text), ["um", "dois três"]);
	assert.deepEqual(m.parseUserPrompts(""), []);
});

test("dedupeNewestFirst, filterPrompts e oneLine", () => {
	assert.deepEqual(m.dedupeNewestFirst(["a", "b", "a", "c"]), ["c", "a", "b"]);
	const ps = ["Corrigir o BUG de login", "login ok", "outra coisa"];
	assert.deepEqual(m.filterPrompts(ps, ""), ps);
	assert.deepEqual(m.filterPrompts(ps, "  bug LOGIN "), [ps[0]]);
	assert.deepEqual(m.filterPrompts(ps, "bug xyz"), []);
	assert.equal(m.oneLine("a\nb\r\n  c "), "a ⏎ b ⏎ c");
});

test("stashStep: guarda, devolve, troca e não faz nada quando ambos vazios", () => {
	assert.deepEqual(m.stashStep("abc", undefined), { text: "", stash: "abc" });
	assert.deepEqual(m.stashStep("", "abc"), { text: "abc", stash: undefined });
	assert.deepEqual(m.stashStep("novo", "abc"), { text: "abc", stash: "novo" });
	assert.deepEqual(m.stashStep("", undefined), { text: "", stash: undefined });
});

test("loadFromDirs: ordem por mtime, dedupe, diretório inexistente e arquivo ilegível contados", async () => {
	const d = join(tmp, "proj");
	file(d, "velho.jsonl", [line("a"), line("b")], 1000);
	file(d, "novo.jsonl", [line("b"), line("c")], 2000);
	file(d, "ruim.jsonl", [line("x")], 1500);
	chmodSync(join(d, "ruim.jsonl"), 0o000);
	file(d, "nota.txt", [line("ignorado")]);
	const r = await m.loadFromDirs([d, join(tmp, "nao-existe")], new Map());
	assert.deepEqual(r.prompts, ["c", "b", "a"]);
	assert.equal(r.skipped, 2); // dir inexistente + arquivo ilegível
	chmodSync(join(d, "ruim.jsonl"), 0o600);
});

test("limites: arquivo >128 MB pulado, ≤300 arquivos, ≤5000 prompts", async () => {
	const big = join(tmp, "big");
	mkdirSync(big);
	const p = join(big, "enorme.jsonl");
	writeFileSync(p, "");
	truncateSync(p, m.MAX_FILE_BYTES + 1); // esparso: não ocupa disco
	file(big, "ok.jsonl", [line("ok")]);
	const r = await m.loadFromDirs([big], new Map());
	assert.deepEqual(r.prompts, ["ok"]);
	assert.equal(r.skipped, 1);

	const many = join(tmp, "many");
	for (let i = 0; i < 305; i++) file(many, `s${i}.jsonl`, [line(`p${i}`)], 10000 + i);
	const l = await m.listSessionFiles([many]);
	assert.equal(l.files.length, m.MAX_FILES);
	assert.ok(l.files[0].path.endsWith("s304.jsonl"));

	const lots = join(tmp, "lots");
	file(
		lots,
		"a.jsonl",
		Array.from({ length: 5100 }, (_, i) => line(`q${i}`)),
	);
	assert.equal((await m.loadFromDirs([lots], new Map())).prompts.length, m.MAX_PROMPTS);
});

test("cache por caminho, mtime e tamanho", async () => {
	const d = join(tmp, "cache");
	const p = file(d, "a.jsonl", [line("aaa")], 3000);
	const cache = new Map();
	assert.deepEqual((await m.loadFromDirs([d], cache)).prompts, ["aaa"]);
	writeFileSync(p, line("bbb")); // mesmo tamanho; mtime restaurado → cache serve o antigo
	utimesSync(p, 3000, 3000);
	assert.deepEqual((await m.loadFromDirs([d], cache)).prompts, ["aaa"]);
	writeFileSync(p, line("cccc")); // tamanho mudou → relê
	assert.deepEqual((await m.loadFromDirs([d], cache)).prompts, ["cccc"]);
});

test("loadScope: sessão, projeto e todas", async () => {
	const root = join(tmp, "sessions");
	const dir = join(root, "proj-a");
	file(dir, "a.jsonl", [line("pa")], 1000);
	file(join(root, "proj-b"), "b.jsonl", [line("pb")], 2000);
	file(root, "solto.jsonl", [line("ignorado")]);
	const src = {
		branch: [
			{ type: "message", message: { role: "user", content: "x" } },
			{ type: "message", message: { role: "assistant", content: "r" } },
			{ type: "label" },
			{ type: "message", message: { role: "user", content: "x" } },
			{ type: "message", message: { role: "user", content: "y" } },
		],
		sessionDir: dir,
	};
	assert.deepEqual((await m.loadScope("sessão", src, new Map())).prompts, ["y", "x"]);
	assert.deepEqual((await m.loadScope("projeto", src, new Map())).prompts, ["pa"]);
	assert.deepEqual((await m.loadScope("todas", src, new Map())).prompts, ["pb", "pa"]);
	const gone = await m.loadScope("todas", { branch: [], sessionDir: join(tmp, "nada", "x") }, new Map());
	assert.deepEqual(gone, { prompts: [], skipped: 1 });
});

const theme = { fg: (_c: string, s: string) => s, bg: (_c: string, s: string) => `[${s}]`, bold: (s: string) => s };
function overlay(load: (s: string) => Promise<{ prompts: string[]; skipped: number }>) {
	const result: { done: boolean; value?: string } = { done: false };
	let renders = 0;
	const o = new m.PromptHistory(
		theme,
		load,
		(v: string | undefined) => {
			result.done = true;
			result.value = v;
		},
		() => {
			renders++;
		},
	);
	return { o, result, renders: () => renders };
}
const items = ["um\ndois", "tres", "quatro"];

test("overlay: Carregando…, lista com ⏎, filtro, setas e Enter", async () => {
	const { o, result } = overlay(async () => ({ prompts: items, skipped: 1 }));
	assert.ok(o.render(60).join("\n").includes("Carregando…"));
	await tick();
	const out = o.render(60);
	assert.ok(
		out[0].includes("── Histórico ") &&
			out[0].includes("[ sessão ]") &&
			!out[0].includes("[ projeto ]") &&
			!out[0].includes("●"),
	);
	assert.ok(out.at(-2)!.includes("[ ⏎ ] usar   [ tab ] escopo   [ esc ] fechar"));
	assert.ok(out[1].includes("Buscar nos prompts") && out[1].trimEnd().endsWith("1 de 3"));
	assert.ok(out.some((l) => l.includes("um ⏎ dois")));
	assert.ok(out.some((l) => l.includes("1 arquivo ignorado")));
	assert.ok(out.some((l) => l.startsWith("[ ❯ um")));
	o.handleInput("\x1b[B");
	assert.equal(o.index, 1);
	o.handleInput("\x1b[B");
	o.handleInput("\x1b[B"); // limite inferior
	assert.equal(o.index, 2);
	o.handleInput("\x1b[A");
	o.handleInput("\x1b[A");
	o.handleInput("\x1b[A"); // limite superior
	assert.equal(o.index, 0);
	for (const c of "TR") o.handleInput(c);
	assert.deepEqual(o.visible(), ["tres", "quatro"]); // sem caixa: "TR" também casa "quaTRo"
	assert.ok(o.render(60)[1].startsWith(" ⌕ TR") && o.render(60)[1].trimEnd().endsWith("1 de 2"));
	o.handleInput("\x7f");
	assert.equal(o.query, "T");
	o.handleInput("\x1b[C"); // sequência de escape não vira texto
	assert.equal(o.query, "T");
	o.handleInput("R");
	o.handleInput("\r");
	assert.deepEqual(result, { done: true, value: "tres" });
});

test("overlay: Esc fecha sem valor; Enter sem resultado não fecha; sem resultados", async () => {
	const a = overlay(async () => ({ prompts: items, skipped: 0 }));
	await tick();
	a.o.handleInput("\x1b");
	assert.deepEqual(a.result, { done: true, value: undefined });
	const b = overlay(async () => ({ prompts: [], skipped: 0 }));
	await tick();
	b.o.handleInput("\r");
	assert.equal(b.result.done, false);
	assert.ok(b.o.render(70).join("\n").includes("Nenhum prompt nesta sessão ainda · Tab amplia a busca"));
	for (const c of "zz") a.o.query += c;
	assert.ok(a.o.render(60).join("\n").includes("Nada com “zz” · Tab amplia a busca"));
	a.o.scope = "todas";
	assert.ok(a.o.render(60).some((l: string) => l.trimEnd().endsWith("Nada com “zz”")));
});

test("overlay: Tab troca sessão → projeto → todas → sessão; leitura antiga é descartada; falha não lança", async () => {
	const seen: string[] = [];
	let release: (() => void) | undefined;
	const { o } = overlay((scope) => {
		seen.push(scope);
		if (scope === "sessão")
			return new Promise((res) => {
				release = () => res({ prompts: ["velho"], skipped: 0 });
			});
		if (scope === "todas") return Promise.reject(new Error("falhou"));
		return Promise.resolve({ prompts: ["proj"], skipped: 0 });
	});
	o.handleInput("\t"); // projeto, enquanto sessão ainda lê
	await tick();
	release?.();
	await tick();
	assert.deepEqual(o.items, ["proj"]);
	o.handleInput("\t"); // todas: rejeita
	await tick();
	assert.deepEqual(o.items, []);
	assert.equal(o.skipped, 1);
	o.handleInput("\t");
	assert.deepEqual(seen, ["sessão", "projeto", "todas", "sessão"]);
	assert.equal(o.scope, "sessão");
	o.invalidate();
});

test("overlay: rolagem mantém o item selecionado visível", async () => {
	const many = Array.from({ length: 30 }, (_, i) => `item${i}`);
	const { o } = overlay(async () => ({ prompts: many, skipped: 0 }));
	await tick();
	for (let i = 0; i < 20; i++) o.handleInput("\x1b[B");
	const out = o.render(40);
	assert.ok(out.some((l) => l.includes("item20")));
	assert.ok(!out.some((l) => l.includes("item0")));
});

test("overlay: destaque do trecho casado, linhas na largura exata e régua estreita sem título", async () => {
	const marks = {
		fg: (_c: string, s: string) => s,
		bg: (_c: string, s: string) => s,
		bold: (s: string) => `**${s}**`,
	};
	const o = new m.PromptHistory(
		marks,
		async () => ({ prompts: ["Refatora o parser (v2)", "outro"], skipped: 2 }),
		() => {},
		() => {},
	);
	await tick();
	for (const c of "PARSER (") o.handleInput(c);
	const out = o.render(50);
	assert.ok(out.some((l: string) => l.includes("Refatora o **parser** **(**v2)")));
	assert.ok(out.some((l: string) => l.includes("2 arquivos ignorados")));
	assert.equal(
		m.highlight("abc", "", (s: string) => `<${s}>`),
		"abc",
	);
	const ansi = { ...theme, bg: (_c: string, s: string) => `\x1b[44m${s}\x1b[49m` };
	const plain = new m.PromptHistory(
		ansi,
		async () => ({ prompts: ["x".repeat(200)], skipped: 0 }),
		() => {},
		() => {},
	);
	await tick();
	for (const w of [50, 24]) for (const l of plain.render(w)) assert.equal(l.replace(/\x1b\[[0-9;]*m/g, "").length, w);
	assert.ok(!plain.render(24)[0].includes("Histórico"));
});

test("ageLabel: agora, minutos, horas, ontem, dia e mês (com ano se for de outro)", () => {
	const now = new Date(2026, 10, 18, 15, 0, 0).getTime();
	const at = (d: Date) => m.ageLabel(d.getTime(), now);
	assert.equal(at(new Date(2026, 10, 18, 14, 59, 30)), "agora");
	assert.equal(at(new Date(2026, 10, 18, 15, 5)), "agora"); // futuro (relógio adiantado)
	assert.equal(at(new Date(2026, 10, 18, 14, 55)), "há 5 min");
	assert.equal(at(new Date(2026, 10, 18, 13, 0)), "há 2 h");
	assert.equal(at(new Date(2026, 10, 17, 22, 0)), "ontem");
	assert.equal(at(new Date(2026, 10, 3, 9, 0)), "3 nov");
	assert.equal(at(new Date(2025, 11, 25, 9, 0)), "25 dez 2025");
});

test("hora do prompt: message.timestamp (ms) ou timestamp ISO da entrada; sem data, sem hora", async () => {
	const withTs = [
		JSON.stringify({
			type: "message",
			timestamp: "2026-11-18T12:00:00.000Z",
			message: { role: "user", content: "iso" },
		}),
		JSON.stringify({
			type: "message",
			timestamp: "2026-11-18T12:00:00.000Z",
			message: { role: "user", content: "ms", timestamp: 1000 },
		}),
		line("sem data"),
	].join("\n");
	assert.deepEqual(m.parseUserPromptsAt(withTs), [
		{ text: "iso", at: Date.parse("2026-11-18T12:00:00.000Z") },
		{ text: "ms", at: 1000 },
		{ text: "sem data", at: undefined },
	]);
	const d = join(tmp, "quando");
	file(
		d,
		"a.jsonl",
		[JSON.stringify({ type: "message", message: { role: "user", content: "a", timestamp: 5 } }), line("b")],
		4000,
	);
	const r = await m.loadFromDirs([d], new Map());
	assert.deepEqual([...(r.when ?? [])], [["a", 5]]); // o prompt sem data não ganha idade
	const sess = await m.loadScope(
		"sessão",
		{
			sessionDir: d,
			branch: [
				{ type: "message", timestamp: "2026-11-18T12:00:00.000Z", message: { role: "user", content: "x" } },
				{ type: "message", timestamp: "2026-11-18T13:00:00.000Z", message: { role: "user", content: "x" } },
			],
		},
		new Map(),
	);
	assert.deepEqual([...(sess.when ?? [])], [["x", Date.parse("2026-11-18T13:00:00.000Z")]]); // a mais recente vence
});

test("overlay: idade dim à direita de cada prompt; sem data, sem idade; estreito esconde a idade", async () => {
	const dimmed = {
		fg: (c: string, s: string) => (c === "dim" ? `<${s}>` : s),
		bg: (_c: string, s: string) => s,
		bold: (s: string) => s,
	};
	const when = new Map([["com data", Date.now() - 5 * 60_000]]);
	const o = new m.PromptHistory(
		dimmed,
		async () => ({ prompts: ["com data", "sem data"], skipped: 0, when }),
		() => {},
		() => {},
	);
	await tick();
	const out = o.render(50);
	const com = out.find((l: string) => l.includes("com data"))!;
	assert.ok(com.trimEnd().endsWith("<há 5 min>"));
	assert.ok(!out.find((l: string) => l.includes("sem data"))!.includes("há"));
	assert.ok(!o.render(14).some((l: string) => l.includes("há 5")));
});

test("overlay: ASCII troca ⌕ ❯ ⏎ por / > Enter", async () => {
	process.env.NYCODE_ASCII_ICONS = "1";
	try {
		const { o } = overlay(async () => ({ prompts: ["um"], skipped: 0 }));
		await tick();
		const out = o.render(60).join("\n");
		assert.ok(
			out.includes(" / ") && out.includes("[ > um") && out.includes("> um") && out.includes("[ Enter ] usar"),
		);
		assert.ok(!/[⌕❯⏎]/.test(out));
	} finally {
		delete process.env.NYCODE_ASCII_ICONS;
	}
});
