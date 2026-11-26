// node --experimental-strip-types --test extensions/claude-compat/commands/test/wiring.test.ts
import assert from "node:assert/strict";
import { test } from "vitest";
import registerLocalCommands from "../../../../../src/extensions/claude-compat/commands/index.ts";
import { mkCtx, tmp } from "./helpers.ts";

test("registerLocalCommands: todo handler registrado responde sem exceção e sem tocar fora do diretório isolado", async () => {
	process.env.NYCODE_CODING_AGENT_DIR = tmp();
	const commands: Record<string, any> = {};
	const tools: string[] = [];
	const nycode: any = {
		registerCommand: (n: string, o: any) => {
			commands[n] = o;
		},
		registerTool: (t: any) => tools.push(t.name),
		on: () => () => {},
		events: { on: () => () => {} },
		appendEntry: () => {},
		getActiveTools: () => ["read"],
		getAllTools: () => [{ name: "read" }],
		setActiveTools: () => {},
		getThinkingLevel: () => "medium",
		setThinkingLevel: () => {},
		getCommands: () => [{ source: "skill", name: "skill:x", sourceInfo: { path: "/inexistente/SKILL.md" } }],
	};
	registerLocalCommands(nycode);
	assert.deepEqual(tools, ["advisor"]);
	const skip = new Set(["heapdump", "stop", "loop", "clone-as", "simplify", "security-review", "deep-research"]); // com efeitos: cobertos em testes próprios
	for (const [name, def] of Object.entries(commands)) {
		if (skip.has(name)) continue;
		const c = mkCtx({ confirm: false });
		await def.handler("", c.ctx);
		assert.ok(c.notes.length >= 1, `/${name} deve responder`);
	}
	const hd = mkCtx({ hasUI: false });
	await commands.heapdump.handler("", hd.ctx);
	assert.match(hd.last(), /exige confirmação/);
	const st = mkCtx();
	await commands.stop.handler("", st.ctx);
	assert.match(st.last(), /Nada em execução/);
	const sd = mkCtx();
	await commands["skill-doctor"].handler("", sd.ctx);
	assert.match(sd.last(), /ilegível/);
});
