// node --experimental-strip-types --test extensions/claude-compat/commands/test/skills.test.ts
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "vitest";
import {
	doctorChecks,
	doctorText,
	skillDoctor,
} from "../../../../../src/extensions/claude-compat/commands/skills/doctor.ts";
import {
	registerSkillPrompts,
	SKILL_MAP,
} from "../../../../../src/extensions/claude-compat/commands/skills/prompts.ts";
import { mkCtx, tmp } from "./helpers.ts";

test("skill-prompts: expande a skill instalada com argumentos, só pelo usuário; ausente → erro sem turno", async () => {
	const commands: Record<string, any> = {};
	const sent: any[] = [];
	const have = [{ source: "skill", name: "skill:code-simplification" }];
	const nycode: any = {
		registerCommand: (n: string, o: any) => {
			commands[n] = o;
		},
		getCommands: () => have,
		sendUserMessage: (t: string, o: unknown) => sent.push([t, o]),
	};
	registerSkillPrompts(nycode);
	assert.deepEqual(Object.keys(commands).sort(), Object.keys(SKILL_MAP).sort());
	const c = mkCtx();
	await commands.simplify.handler("  src/a.ts  e src/b.ts ", c.ctx);
	assert.deepEqual(sent, [["/skill:code-simplification src/a.ts  e src/b.ts", { expandPromptTemplates: true }]]);
	const busy = mkCtx({ idle: false });
	await commands.simplify.handler("", busy.ctx);
	assert.deepEqual(sent[1], ["/skill:code-simplification", { deliverAs: "followUp", expandPromptTemplates: true }]);
	await commands["security-review"].handler("x", c.ctx);
	assert.equal(sent.length, 2);
	assert.match(c.last(), /security-audit.*não está instalada/);
});

test("doctor: JSON corrompido reportado, valores nunca impressos, guarda ausente detectada", () => {
	const dir = tmp();
	writeFileSync(join(dir, "settings.json"), "{ruim");
	writeFileSync(
		join(dir, "mcp.json"),
		JSON.stringify({ mcpServers: { a: { env: { TOKEN: "SEGREDO-123" } }, b: {} } }),
	);
	const checks = doctorChecks(dir, 3, 2, "24.1.0", join(dir, "hooks", "guard.py"));
	const text = doctorText(checks);
	assert.match(text, /✕ settings\.json: JSON inválido/);
	assert.match(text, /mcp\.json: JSON válido \(2 em mcpServers\)/);
	assert.match(text, /✕ guarda de segurança.*AUSENTE/);
	assert.doesNotMatch(text, /SEGREDO/);
	assert.match(doctorText(doctorChecks(dir, 0, 0, "18.0.0")), /Node 18\.0\.0 \(< 20/);
});

test("doctor: por padrão confere o guard.py embutido, não o claude-home antigo", () => {
	assert.match(doctorText(doctorChecks(tmp(), 1, 1, "24.1.0")), /✓ guarda de segurança.*presente/);
});

test("skill-doctor: frontmatter, nome vs diretório, descrição e duplicatas", () => {
	const root = tmp();
	const mk = (dir: string, body: string) => {
		mkdirSync(join(root, dir), { recursive: true });
		writeFileSync(join(root, dir, "SKILL.md"), body);
		return { name: `skill:${dir}`, path: join(root, dir, "SKILL.md") };
	};
	const good = mk("boa", "---\nname: boa\ndescription: ok\n---\n");
	const p = skillDoctor([
		good,
		mk("semfm", "texto"),
		mk("nome", "---\nname: outro\ndescription: d\n---\n"),
		mk("semdesc", "---\nname: semdesc\n---\n"),
		mk("longa", `---\nname: longa\ndescription: ${"x".repeat(1025)}\n---\n`),
		{ name: "skill:sumiu", path: join(root, "sumiu", "SKILL.md") },
		good,
	]);
	const j = p.join("\n");
	for (const re of [
		/semfm: sem frontmatter/,
		/nome: name "outro" difere/,
		/semdesc: sem description/,
		/longa: description com 1025/,
		/sumiu: arquivo ilegível/,
		/boa: carregada 2 vezes/,
	])
		assert.match(j, re);
	assert.deepEqual(skillDoctor([good]), []);
});
