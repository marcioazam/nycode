// node --experimental-strip-types --test extensions/claude-compat/commands/test/settings.test.ts
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "vitest";
import {
	autocompactCommand,
	configCommand,
	effortCommand,
	scrollSpeedCommand,
	themeCommand,
	tuiCommand,
} from "../../../../../src/extensions/claude-compat/commands/settings/config.ts";
import {
	createPermissions,
	trackPlanMode,
} from "../../../../../src/extensions/claude-compat/commands/settings/permissions.ts";
import { pluginCommand } from "../../../../../src/extensions/claude-compat/commands/settings/plugin.ts";
import {
	agentDir,
	getSetting,
	KEYS,
	parseRemaps,
	readSettings,
	removePackage,
	setSetting,
} from "../../../../../src/extensions/claude-compat/commands/settings/store.ts";
import { failingOpener, fileOpener, mkCtx, tmp } from "./helpers.ts";

const STORE_URL = pathToFileURL(
	join(import.meta.dirname, "../../../../../src/extensions/claude-compat/commands/settings/store.ts"),
).href;

async function env(initial?: string) {
	const dir = tmp();
	const file = join(dir, "settings.json");
	if (initial !== undefined) writeFileSync(file, initial);
	return {
		dir,
		file,
		open: await fileOpener(dir),
		disk: () => JSON.parse(readFileSync(file, "utf8")),
		raw: () => readFileSync(file, "utf8"),
	};
}

test("store: grava pelo gerenciador nativo, preserva campos desconhecidos e aninhados", async () => {
	const e = await env(JSON.stringify({ keep: 1, compaction: { reserveTokens: 5 } }));
	assert.deepEqual(await setSetting(e.open, e.dir, "compaction.enabled", "off"), {
		ok: true,
		key: "compaction.enabled",
		value: false,
	});
	assert.deepEqual(e.disk(), { keep: 1, compaction: { reserveTokens: 5, enabled: false } });
	assert.deepEqual(await setSetting(e.open, e.dir, "fullscreenWheelScrollLines", "100"), {
		ok: true,
		key: "fullscreenWheelScrollLines",
		value: 100,
	});
	assert.equal(e.disk().fullscreenWheelScrollLines, 100);
	assert.equal(e.disk().keep, 1);
	const r = await readSettings(e.open, e.dir);
	assert.ok(r.ok && getSetting(r.data, "compaction.enabled") === false);
	assert.equal(agentDir({ NYCODE_CODING_AGENT_DIR: "/x" }), "/x");
	assert.match(agentDir({}), /\.nycode[\\/]agent$/);
});

test("store: chave fora da lista, valores inválidos: nada é gravado", async () => {
	const e = await env('{"a":1}');
	const bad: [string, string][] = [
		["apiKey", "x"],
		["__proto__", "1"],
		["tuiMode", "nope"],
		["viewMode", "full"],
		["fullscreenWheelScrollLines", "101"],
		["fullscreenWheelScrollLines", "0"],
		["editorPaddingX", "1.5"],
		["editorPaddingX", ""],
		["theme", "../../x y"],
		["quietStartup", "maybe"],
		["defaultThinkingLevel", "ultra"],
		["showCacheMissNotices", "2"],
	];
	for (const [k, v] of bad) assert.equal((await setSetting(e.open, e.dir, k, v)).ok, false, `${k}=${v}`);
	assert.equal(e.raw(), '{"a":1}');
	for (const [k, v] of [
		["quietStartup", "header"],
		["quietStartup", "true"],
		["theme", "nycode-claro/nycode-escuro"],
		["defaultThinkingLevel", "max"],
		["showCacheMissNotices", "on"],
		["tuiMode", "regular"],
		["editorPaddingX", "3"],
	] as const)
		assert.equal((await setSetting(e.open, e.dir, k, v)).ok, true, `${k}=${v}`);
});

test("store: settings.json corrompido é recusado em toda chave e fica intacto", async () => {
	const e = await env("{ruim");
	for (const k of Object.keys(KEYS)) {
		const r = await setSetting(
			e.open,
			e.dir,
			k,
			k === "vimInsertModeRemaps"
				? '["jj"]'
				: k === "compaction.enabled"
					? "true"
					: k === "tuiMode"
						? "regular"
						: k === "fullscreenWheelScrollLines"
							? "3"
							: k === "editorPaddingX"
								? "1"
								: k === "quietStartup"
									? "true"
									: k === "defaultThinkingLevel"
										? "low"
										: k === "showCacheMissNotices"
											? "true"
											: k === "viewMode"
												? "focus"
												: "dark",
		);
		assert.equal(r.ok, false, k);
		assert.match((r as { error: string }).error, /ilegível/);
	}
	assert.equal(e.raw(), "{ruim");
	assert.equal((await readSettings(e.open, e.dir)).ok, false);
	assert.equal((await removePackage(e.open, e.dir, "x")).ok, false);
});

test("store: falha de escrita do storage é reportada, nunca sucesso", async () => {
	const open = await failingOpener();
	const r = await setSetting(open, "/tmp", "compaction.enabled", "on");
	assert.equal(r.ok, false);
	assert.match((r as { error: string }).error, /falha ao gravar.*disco cheio/);
	const v = await setSetting(open, "/tmp", "vimInsertModeRemaps", '["jj"]');
	assert.equal(v.ok, false);
	assert.match((v as { error: string }).error, /disco cheio/);
	const throwing = async () => {
		throw new Error("sem acesso");
	};
	assert.match(((await setSetting(throwing, "/tmp", "theme", "x")) as { error: string }).error, /sem acesso/);
	assert.equal((await readSettings(throwing, "/tmp")).ok, false);
	assert.equal((await removePackage(throwing, "/tmp", "x")).ok, false);
});

test("vimInsertModeRemaps: contrato público (2 imprimíveis → <Esc>), gravado como objeto, [] limpa", async () => {
	assert.deepEqual(parseRemaps('["jj","kj"]'), { ok: true, value: { jj: "<Esc>", kj: "<Esc>" } });
	assert.deepEqual(parseRemaps('{"jk":"<Esc>"}'), { ok: true, value: { jk: "<Esc>" } });
	for (const bad of [
		"jj",
		'"jj"',
		"[1]",
		'["j"]',
		'["jjj"]',
		'["j j"]',
		'["j\\u0001"]',
		'["éé"]',
		'{"jj":"<CR>"}',
		'{"jj":1}',
		'["jj","jj"]',
		JSON.stringify(Array.from({ length: 9 }, (_, i) => `a${i}`)),
		"null",
		"7",
	])
		assert.equal(parseRemaps(bad).ok, false, bad);
	const e = await env('{"keep":1}');
	assert.equal((await setSetting(e.open, e.dir, "vimInsertModeRemaps", '["jj"]')).ok, true);
	assert.deepEqual(e.disk(), { keep: 1, vimInsertModeRemaps: { jj: "<Esc>" } });
	await setSetting(e.open, e.dir, "theme", "dark"); // outro campo não apaga o contrato
	assert.deepEqual(e.disk().vimInsertModeRemaps, { jj: "<Esc>" });
	assert.equal((await setSetting(e.open, e.dir, "vimInsertModeRemaps", '["j j"]')).ok, false);
	assert.deepEqual(e.disk().vimInsertModeRemaps, { jj: "<Esc>" });
	assert.equal((await setSetting(e.open, e.dir, "vimInsertModeRemaps", "[]")).ok, true);
	assert.equal("vimInsertModeRemaps" in e.disk(), false);
	const fresh = await env();
	assert.equal((await setSetting(fresh.open, fresh.dir, "vimInsertModeRemaps", "[]")).ok, true);
});

test("config: ao vivo — tema por setTheme, thinking por setThinkingLevel, demais por reload quando ocioso", async () => {
	const e = await env();
	let level = "medium";
	const nycode: any = {
		getThinkingLevel: () => level,
		setThinkingLevel: (l: string) => {
			level = l;
		},
	};
	const d = { open: e.open, nycode };
	const c = mkCtx({ cwd: e.dir });
	await configCommand("theme=light", c.ctx, d);
	assert.deepEqual(c.calls, ["theme:light"]);
	assert.equal(e.disk().theme, "light");
	await configCommand("theme=neon", c.ctx, d); // inexistente: não grava nem troca
	assert.equal(e.disk().theme, "light");
	assert.equal(c.notes.at(-1)!.t, "error");
	await configCommand("defaultThinkingLevel=high", c.ctx, d);
	assert.equal(level, "high");
	assert.equal(e.disk().defaultThinkingLevel, "high");
	await configCommand("compaction.enabled=false", c.ctx, d);
	assert.equal(c.calls.at(-1), "reload");
	const busy = mkCtx({ cwd: e.dir, idle: false });
	await configCommand("editorPaddingX=2", busy.ctx, d);
	assert.deepEqual(busy.calls, []);
	assert.match(busy.notes.at(-1)!.m, /próximo \/reload/);
	const themeFail = mkCtx({ cwd: e.dir, themeFails: true });
	await configCommand("theme=dark", themeFail.ctx, d);
	assert.equal(themeFail.notes.at(-1)!.t, "warning");
	const clamp: any = { getThinkingLevel: () => "off", setThinkingLevel: () => {} };
	const cl = mkCtx({ cwd: e.dir });
	await configCommand("defaultThinkingLevel=xhigh", cl.ctx, { open: e.open, nycode: clamp });
	assert.ok(cl.notes.some((n) => n.t === "warning"));
});

test("config: lista, mostra chave, erros e arquivo corrompido", async () => {
	const e = await env('{"editorPaddingX":2}');
	const c = mkCtx({ cwd: e.dir });
	await configCommand("", c.ctx, { open: e.open });
	assert.match(c.last(), /Configuráveis[\s\S]*editorPaddingX = 2[\s\S]*vimInsertModeRemaps/);
	await configCommand("editorPaddingX", c.ctx, { open: e.open });
	assert.match(c.last(), /editorPaddingX = 2/);
	await configCommand("auth", c.ctx, { open: e.open });
	assert.equal(c.notes.at(-1)!.t, "error");
	await configCommand("auth=1", c.ctx, { open: e.open });
	assert.equal("auth" in e.disk(), false);
	const bad = await env("{x");
	const b = mkCtx({ cwd: bad.dir });
	await configCommand("", b.ctx, { open: bad.open });
	assert.equal(b.notes.at(-1)!.t, "error");
	await configCommand("theme", b.ctx, { open: bad.open });
	assert.equal(b.notes.at(-1)!.t, "error");
});

test("theme, tui, scroll-speed, autocompact: validam, gravam e avisam o que vale agora", async () => {
	const e = await env();
	const d = { open: e.open };
	const c = mkCtx({ cwd: e.dir });
	await themeCommand("", c.ctx, d);
	assert.match(c.last(), /system[\s\S]*dark, light/);
	await themeCommand("dark", c.ctx, d);
	assert.equal(e.disk().theme, "dark");
	await tuiCommand("", c.ctx, d);
	assert.match(c.last(), /fullscreen/);
	await tuiCommand("regular", c.ctx, d);
	assert.match(c.notes.at(-1)!.m, /próximo início/);
	assert.equal(c.calls.includes("reload"), false);
	await tuiCommand("grande", c.ctx, d);
	assert.equal(c.notes.at(-1)!.t, "error");
	await scrollSpeedCommand("", c.ctx, d);
	assert.match(c.last(), /auto/);
	await scrollSpeedCommand("100", c.ctx, d);
	assert.equal(e.disk().fullscreenWheelScrollLines, 100);
	await scrollSpeedCommand("101", c.ctx, d);
	assert.equal(c.notes.at(-1)!.t, "error");
	assert.equal(e.disk().fullscreenWheelScrollLines, 100);
	await autocompactCommand("", c.ctx, d);
	assert.match(c.last(), /true/);
	await autocompactCommand("off", c.ctx, d);
	assert.equal(e.disk().compaction.enabled, false);
	await autocompactCommand("talvez", c.ctx, d);
	assert.equal(c.notes.at(-1)!.t, "error");
});

test("effort: níveis, auto = padrão configurado, inválido recusa, clamp avisado, não grava", async () => {
	const e = await env('{"defaultThinkingLevel":"low"}');
	let level = "medium";
	const nycode: any = {
		getThinkingLevel: () => level,
		setThinkingLevel: (l: string) => {
			level = l;
		},
	};
	const d = { open: e.open };
	const c = mkCtx({ cwd: e.dir });
	await effortCommand(nycode, "MAX", c.ctx, d);
	assert.equal(level, "max");
	await effortCommand(nycode, "auto", c.ctx, d);
	assert.equal(level, "low");
	await effortCommand(nycode, "ultra", c.ctx, d);
	assert.equal(c.notes.at(-1)!.t, "error");
	assert.equal(level, "low");
	await effortCommand(nycode, "status", c.ctx, d);
	assert.match(c.last(), /atual: low/);
	const clamp: any = { getThinkingLevel: () => "off", setThinkingLevel: () => {} };
	await effortCommand(clamp, "high", c.ctx, d);
	assert.equal(c.notes.at(-1)!.t, "warning");
	assert.equal(e.disk().defaultThinkingLevel, "low");
	const none = await env();
	await effortCommand(nycode, "auto", mkCtx({ cwd: none.dir }).ctx, { open: none.open });
	assert.equal(level, "medium");
});

test("permissions: ask|auto|plan|bypass on|off pelo controlador; status mostra modo e bypass; sem texto de auto indisponível", () => {
	const calls: unknown[][] = [];
	const st = { mode: "acceptEdits", label: "Auto", bypass: false, bypassAvailable: true, planControl: true };
	const modes: any = {
		select: (m: string, o: unknown) => calls.push(["select", m, o]),
		setBypass: (on: boolean, o: unknown) => calls.push(["setBypass", on, o]),
		status: () => st,
	};
	const tools: any = { getActiveTools: () => ["read"], getAllTools: () => [], setActiveTools: () => {} };
	const run = createPermissions(tools, () => false, {}, modes);
	const c = mkCtx();
	for (const w of ["ask", "auto", "default", "manual", "acceptEdits", "plan"]) run(w, c.ctx);
	assert.deepEqual(
		calls.map((x) => x[1]),
		["ask", "auto", "default", "manual", "acceptEdits", "plan"],
	);
	calls.length = 0;
	run("bypass on", c.ctx);
	run("bypass off", c.ctx);
	run("bypassPermissions", c.ctx);
	assert.deepEqual(calls, [
		["setBypass", true, { explicit: true }],
		["setBypass", false, { explicit: true }],
		["setBypass", true, { explicit: true }],
	]);
	calls.length = 0;
	run("bypass talvez", c.ctx);
	run("bypass", c.ctx);
	assert.deepEqual(calls, []);
	assert.equal(c.notes.at(-1)!.t, "error");
	run("status", c.ctx);
	assert.match(c.last(), /Modo de permissão: Auto · bypass: desligado/);
	assert.doesNotMatch(c.last(), /auto indisponível/);
	st.bypass = true;
	run("status", c.ctx);
	assert.match(c.last(), /bypass: ligado/);
});

test("permissions: só restringe; plan mode recusa; religar só o que ele desligou; plan mode vem do barramento", () => {
	let active = ["read", "bash", "write"];
	let plan = false;
	const tools: any = {
		getActiveTools: () => active,
		getAllTools: () => ["read", "bash", "write", "edit"].map((name) => ({ name })),
		setActiveTools: (n: string[]) => {
			active = n;
		},
	};
	const run = createPermissions(tools, () => plan, { NYCODE_BYPASS_PERMISSIONS: "1" });
	const c = mkCtx();
	run("", c.ctx);
	assert.match(c.last(), /bypass: ligado/);
	run("tools off bash", c.ctx);
	assert.deepEqual(active, ["read", "write"]);
	run("", c.ctx);
	assert.match(c.last(), /Desligadas por este comando: bash/);
	run("tools off bash", c.ctx);
	assert.match(c.last(), /já está inativa/);
	run("tools on edit", c.ctx);
	assert.deepEqual(active, ["read", "write"]);
	run("tools off nada", c.ctx);
	assert.match(c.last(), /desconhecida/);
	run("mode acceptEdits", c.ctx);
	assert.equal(c.notes.at(-1)!.t, "error");
	plan = true;
	run("tools on bash", c.ctx);
	assert.match(c.last(), /Plan mode/);
	plan = false;
	run("tools on bash", c.ctx);
	assert.deepEqual(active, ["read", "write", "bash"]);
	const off = createPermissions(tools, () => false, {});
	off("show", c.ctx);
	assert.match(c.last(), /bypass: desligado/);
	let handler: any;
	const bus: any = {
		events: {
			on: (_c: string, h: any) => {
				handler = h;
			},
		},
	};
	const get = trackPlanMode(bus);
	assert.equal(get(), false);
	handler({ active: true });
	assert.equal(get(), true);
	handler({ active: "sim" });
	handler(null);
	assert.equal(get(), true);
	handler({ active: false });
	assert.equal(get(), false);
});

test("plugin: lista, remove, recusa add, falha explícita e arquivo corrompido intacto", async () => {
	const e = await env(JSON.stringify({ packages: ["npm:a", { source: "git:b" }], x: 1 }));
	const c = mkCtx({ cwd: e.dir });
	await pluginCommand("", c.ctx, e.open);
	assert.match(c.last(), /npm:a[\s\S]*git:b/);
	await pluginCommand("remove git:b", c.ctx, e.open);
	assert.deepEqual(e.disk(), { packages: ["npm:a"], x: 1 });
	await pluginCommand("remove inexistente", c.ctx, e.open);
	assert.equal(c.notes.at(-1)!.t, "warning");
	await pluginCommand("add npm:evil", c.ctx, e.open);
	assert.match(c.last(), /vete/);
	await pluginCommand("remove", c.ctx, e.open);
	assert.match(c.last(), /Uso/);
	assert.deepEqual(e.disk().packages, ["npm:a"]);
	const none = await env();
	await pluginCommand("list", mkCtx({ cwd: none.dir }).ctx, none.open);
	const c2 = mkCtx({ cwd: none.dir });
	await pluginCommand("list", c2.ctx, none.open);
	assert.match(c2.last(), /Nenhum pacote/);
	const bad = await env("{x");
	const b = mkCtx({ cwd: bad.dir });
	await pluginCommand("remove npm:a", b.ctx, bad.open);
	await pluginCommand("list", b.ctx, bad.open);
	assert.equal(b.notes.at(-1)!.t, "error");
	assert.equal(bad.raw(), "{x");
	const f = mkCtx();
	await pluginCommand("remove npm:a", f.ctx, await failingOpener('{"packages":["npm:a"]}'));
	assert.match(f.last(), /disco cheio/);
	assert.equal(f.notes.at(-1)!.t, "error");
});

/** Roda `setSetting` com o realOpener nativo em processo filho (handle novo), HOME do agente isolado. */
function child(agent: string, storeUrl: string, key: string, value: string) {
	const code = `import { realOpener, setSetting } from ${JSON.stringify(storeUrl)}
const r = await setSetting(realOpener, process.cwd(), ${JSON.stringify(key)}, ${JSON.stringify(value)})
if (!r.ok) { console.error(r.error); process.exit(1) }`;
	return new Promise<number | null>((done) => {
		const p = spawn(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", code], {
			cwd: agent,
			env: { ...process.env, NYCODE_CODING_AGENT_DIR: agent },
			stdio: "ignore",
		});
		p.on("close", done);
	});
}

test("realOpener: storage nativo com lock; gravações concorrentes de chaves distintas se fundem", async () => {
	const agent = tmp();
	const file = join(agent, "settings.json");
	writeFileSync(file, JSON.stringify({ keep: { nested: 1 }, packages: ["npm:a"] }));
	const url = STORE_URL;
	const jobs: [string, string][] = [
		["theme", "dark"],
		["editorPaddingX", "2"],
		["viewMode", "focus"],
		["vimInsertModeRemaps", '["jj"]'],
		["compaction.enabled", "false"],
		["quietStartup", "true"],
	];
	const codes = await Promise.all(jobs.map(([k, v]) => child(agent, url, k, v)));
	assert.deepEqual(
		codes,
		jobs.map(() => 0),
	);
	assert.deepEqual(JSON.parse(readFileSync(file, "utf8")), {
		keep: { nested: 1 },
		packages: ["npm:a"],
		theme: "dark",
		editorPaddingX: 2,
		viewMode: "focus",
		vimInsertModeRemaps: { jj: "<Esc>" },
		compaction: { enabled: false },
		quietStartup: true,
	});
});

test("realOpener: só settings global (projeto não é lido), getPackages global, corrompido recusado e intacto", async () => {
	const agent = tmp();
	const proj = tmp();
	mkdirSync(join(proj, ".nycode"));
	writeFileSync(join(proj, ".nycode", "settings.json"), '{"packages":["npm:proj"],"theme":"projtheme"}');
	writeFileSync(join(agent, "settings.json"), '{"packages":["npm:a","npm:b"]}');
	const old = process.env.NYCODE_CODING_AGENT_DIR;
	process.env.NYCODE_CODING_AGENT_DIR = agent;
	try {
		const { readSettings, realOpener, removePackage, setSetting } = await import(STORE_URL);
		const r = await readSettings(realOpener, proj);
		assert.ok(r.ok && r.data.theme === undefined);
		assert.deepEqual(await removePackage(realOpener, proj, "npm:proj"), { ok: true, removed: false });
		assert.deepEqual(await removePackage(realOpener, proj, "npm:a"), { ok: true, removed: true });
		assert.deepEqual(JSON.parse(readFileSync(join(agent, "settings.json"), "utf8")).packages, ["npm:b"]);
		assert.equal(
			readFileSync(join(proj, ".nycode", "settings.json"), "utf8"),
			'{"packages":["npm:proj"],"theme":"projtheme"}',
		);
		writeFileSync(join(agent, "settings.json"), "{ nope");
		const bad = await setSetting(realOpener, proj, "viewMode", "focus");
		assert.ok(!bad.ok && /ilegível/.test(bad.error));
		assert.equal(readFileSync(join(agent, "settings.json"), "utf8"), "{ nope");
	} finally {
		if (old === undefined) delete process.env.NYCODE_CODING_AGENT_DIR;
		else process.env.NYCODE_CODING_AGENT_DIR = old;
	}
});
