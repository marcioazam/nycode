// Runbook commands (/run, /verify, /batch ...): frontmatter and body contracts and the REAL expandCommand of the core.
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, test } from "vitest";
import { resolveResourcesMarker } from "../../../../../src/core/builtin-resources.ts";
import { parseCommandFile } from "../../../../../src/extensions/_shared/commands/command-file.ts";
import { expandCommand } from "../../../../../src/extensions/commands/expand.ts";

const RESOURCES = join(import.meta.dirname, "../../../../../resources");
const NAMES = ["run", "verify", "run-skill-generator", "update-config", "batch", "team-onboarding", "statusline"];
const MARKER = ["$", "{NYCODE_RESOURCES}"].join("");
const commandPath = (name: string) => join(RESOURCES, "commands", `${name}.md`);

const FIX = mkdtempSync(join(tmpdir(), "cmd-fixture-"));
afterAll(() => rmSync(FIX, { recursive: true, force: true }));

function load(name: string): { fm: Record<string, string>; body: string } {
	const raw = readFileSync(commandPath(name), "utf8");
	const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw);
	assert.ok(m, `${name}: frontmatter ausente`);
	const fm: Record<string, string> = {};
	for (const line of m[1]!.split("\n")) {
		const kv = /^([\w-]+):\s*(.*)$/.exec(line);
		assert.ok(kv, `${name}: linha de frontmatter inválida: ${line}`);
		fm[kv[1]!] = kv[2]!.replace(/^"(.*)"$/, "$1");
	}
	return { fm, body: m[2]! };
}

const CANARY_FILE = join(FIX, "canary.txt");
writeFileSync(CANARY_FILE, "CANARY-CONTEUDO-PRIVADO");

/** Runner que nunca deveria ser chamado: conta e lança. */
function canary(): { runner: { exec: () => Promise<never> }; calls: () => number } {
	let n = 0;
	return {
		runner: {
			exec: () => {
				n++;
				return Promise.reject(new Error("exec chamado"));
			},
		},
		calls: () => n,
	};
}
const HOSTIL = `x $(rm -x) !\`id\` @${CANARY_FILE} \${CLAUDE_PROJECT_DIR} $ARGUMENTS $1 $@`;

async function expandReal(name: string, args: string): Promise<{ out: string; body: string; calls: number }> {
	const parsed = parseCommandFile(readFileSync(commandPath(name), "utf8"));
	const c = canary();
	const out: string = await expandCommand(c.runner, parsed, args, { cwd: FIX }, commandPath(name));
	return { out, body: parsed.body, calls: c.calls() };
}

test("frontmatter: só do usuário, com descrição", () => {
	for (const n of NAMES) {
		const { fm } = load(n);
		assert.equal(fm["disable-model-invocation"], "true", n);
		assert.ok(fm.description && fm.description.length >= 20 && fm.description.length <= 400, n);
	}
});

test("corpo: sem placeholder de argumento, spans de shell, @arquivo nem variáveis", () => {
	for (const n of NAMES) {
		const { body } = load(n);
		assert.doesNotMatch(
			body,
			/\$ARGUMENTS|\$@|\$\d|\$\{ARGUMENTS/,
			`${n}: placeholder de argumento (o fallback nativo anexa os argumentos crus)`,
		);
		assert.doesNotMatch(body, /!`|```!/, `${n}: span de shell`);
		assert.doesNotMatch(body.split(MARKER).join(""), /\$\{|\$\(/, `${n}: expansão de shell/variável`);
		assert.doesNotMatch(body, /(^|\s)@[\w./~-]/, `${n}: @arquivo`);
	}
});

test("expandCommand real: argumentos hostis aparecem uma vez, crus, depois de toda expansão; nada executa nem é lido", async () => {
	for (const n of NAMES) {
		const { out, body, calls } = await expandReal(n, HOSTIL);
		assert.equal(calls, 0, `${n}: exec chamado`);
		assert.equal(out, `${resolveResourcesMarker(body)}\n\nARGUMENTS: ${HOSTIL}`, n);
		assert.equal(out.split(HOSTIL).length - 1, 1, n);
		assert.ok(out.includes(["$", "{CLAUDE_PROJECT_DIR}"].join("")) && out.includes("$ARGUMENTS"), `${n}: literais`);
		assert.ok(!out.includes("CANARY-CONTEUDO-PRIVADO"), `${n}: @arquivo foi lido`);
	}
});

test("expandCommand real: sem argumentos nada é anexado", async () => {
	for (const n of NAMES) {
		for (const args of ["", "   "]) {
			const { out, body, calls } = await expandReal(n, args);
			assert.equal(out, resolveResourcesMarker(body), n);
			assert.equal(calls, 0, n);
		}
	}
});

test("contrato antigo obsoleto (controle negativo): placeholder no corpo expande o span dos argumentos antes do fallback", async () => {
	const parsed = parseCommandFile("---\ndescription: x\n---\nPedido: $ARGUMENTS\n");
	const c = canary();
	await assert.rejects(expandCommand(c.runner, parsed, "a !`id` b", { cwd: FIX }, join(FIX, "x.md")), /exec chamado/);
	assert.equal(c.calls(), 1);
});

test("referências: skills e comandos citados existem em resources", () => {
	const re = /\$\{NYCODE_RESOURCES\}\/([\w./-]+\.md)/g;
	let seen = 0;
	for (const n of NAMES) {
		for (const m of load(n).body.matchAll(re)) {
			assert.ok(existsSync(join(RESOURCES, m[1]!)), `${n}: ${m[0]} não existe`);
			seen++;
		}
	}
	// statusline cites the two claude-hud commands; batch lost its skill links when those skills left the package
	assert.ok(seen >= 2);
});

test("skill por projeto: só .nycode/skills/run/SKILL.md do projeto, nunca o home", () => {
	const all = NAMES.map((n) => load(n).body).join("\n");
	assert.match(load("run-skill-generator").body, /\.nycode\/skills\/run\/SKILL\.md/);
	assert.doesNotMatch(all, /~\/\.nycode\/skills|claude-home\/skills\/run\b|~\/\.agents/);
	assert.match(load("run-skill-generator").body, /nunca marque o projeto como confiável/i);
});

test("limites de /batch, /team-onboarding e /update-config no texto operacional", () => {
	assert.match(load("batch").body, /4 writers/);
	assert.match(load("batch").body, /general-purpose/);
	assert.match(load("team-onboarding").body, /usage\.ts/);
	assert.match(load("update-config").body, /\/config/);
});
