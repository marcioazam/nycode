// node --experimental-strip-types --test extensions/comandos/test/*.test.ts
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, test, vi } from "vitest";
import * as __typed_catalog from "../../../../src/extensions/comandos/catalog.ts";
import { gerente as gerenteReal, raiz } from "./base.ts";

// The rendering reads TERM: pin it so the suite does not depend on the shell it runs in.
beforeEach(() => {
	vi.stubEnv("TERM", "xterm-256color");
});
afterEach(() => {
	vi.unstubAllEnvs();
});

// The source tests exercise the modules with partial fakes, without types.
const __c_catalog: any = __typed_catalog;

const cat = __c_catalog;

const walk = (dir: string): string[] =>
	readdirSync(dir).flatMap((n) => {
		const p = join(dir, n);
		if (n === "test" || n === "node_modules") return [];
		return statSync(p).isDirectory() ? walk(p) : /\.(ts|js|mjs)$/.test(n) ? [p] : [];
	});
const namesIn = (dir: string): string[] =>
	walk(dir).flatMap((f) =>
		[...readFileSync(f, "utf8").matchAll(/registerCommand\(\s*['"]([\w-]+)['"]/g)].map((m) => m[1]!),
	);

/** Comandos reais: nativos do core (slash-commands.ts) e os registrados pelas extensões embutidas (+ /clear e /reset, registrados em laço). */
function loaded(): string[] {
	const nativo = readFileSync(join(raiz, "../core/slash-commands.ts"), "utf8");
	const names = [...nativo.matchAll(/name: "([\w-]+)"/g)].map((m) => m[1]!);
	names.push(...namesIn(raiz), "clear", "reset");
	return [...new Set(names)];
}

test("todo comando carregado tem grupo e descrição pt-BR no catálogo", () => {
	const names = loaded();
	assert.ok(names.length > 50, `só ${names.length} comandos lidos`);
	const sem = names.filter((n) => !cat.findCommand(n));
	assert.deepEqual(sem, [], `sem entrada no catálogo: ${sem.join(" ")}`);
	for (const c of cat.COMMANDS) {
		assert.ok(cat.GROUPS.includes(c.group), `${c.name}: grupo ${c.group}`);
		assert.ok(c.desc.length > 8, `${c.name}: descrição`);
	}
});

test("aliases: canônico e “via alias”; /copy e /copy-code, /todos e /plan-todos são distintos", () => {
	assert.equal(cat.findCommand("name").cmd.name, "rename");
	assert.equal(cat.findCommand("name").viaAlias, true);
	assert.equal(cat.findCommand("rename").viaAlias, false);
	for (const a of ["clear", "reset"]) assert.equal(cat.findCommand(a).cmd.name, "new");
	assert.equal(cat.findCommand("hotkeys").cmd.name, "atalhos");
	assert.equal(cat.findCommand("keybindings").cmd.name, "keybindings");
	assert.equal(cat.findCommand("keybindings").viaAlias, false);
	for (const [a, b] of [
		["copy", "copy-code"],
		["todos", "plan-todos"],
	])
		assert.notEqual(cat.findCommand(a).cmd, cat.findCommand(b).cmd);
	assert.equal(cat.findCommand("tasks").cmd.act, undefined); // /tasks não tem Ctrl+B
	assert.equal(cat.findCommand("skill:qualquer"), undefined);
});

test("ações: todo id de tecla do nycode tem rótulo pt-BR e contexto; extensão tem origem", async () => {
	const kb = await gerenteLocal();
	const ids = Object.keys(kb.getResolvedBindings());
	const sem = ids.filter((id) => !cat.ACTION_LABELS[id]);
	assert.deepEqual(sem, []);
	assert.equal(cat.contextOf("app.tree.foldOrUp"), "árvore");
	assert.equal(cat.contextOf("app.models.reorderUp"), "modelos");
	assert.equal(cat.contextOf("app.session.rename"), "sessões");
	assert.equal(cat.contextOf("tui.select.up"), "seletores");
	assert.equal(cat.contextOf("app.model.select"), "editor");
	for (const a of cat.EXT_ACTIONS) assert.ok(["extensão", "harness"].includes(a.origin) && a.keys.length, a.id);
});

async function gerenteLocal() {
	return gerenteReal();
}
