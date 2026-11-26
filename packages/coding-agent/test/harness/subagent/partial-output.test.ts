// Capped (maxTurns) runs: the partial note must carry the child's last actions and a
// transcript path, so a run that ended on tool-call-only turns still tells the parent
// what it did. Unit tests pin the summary builder; integration tests run fake children.
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Message } from "@nycode/ai";
import { test } from "vitest";
import * as runMod from "../../../src/extensions/subagent/core/run.ts";
import type { SingleResult, SubagentDetails } from "../../../src/extensions/subagent/core/types.ts";
import * as bgMod from "../../../src/extensions/subagent/fleet/background.ts";
import * as store from "../../../src/extensions/subagent/fleet/store.ts";
import type { AgentConfig } from "../../../src/extensions/subagent/registry/agents.ts";
import * as registryText from "../../../src/extensions/subagent/registry/registry-text.ts";
import {
	buildCappedRunSummary,
	getFinalOutput,
	tailCappedActions,
} from "../../../src/extensions/subagent/render/render.ts";
import { fleetTestEnv } from "./support/fleet-env.ts";

const { tmp } = fleetTestEnv("partial-output-");

// O filho falso: 'tools-last' emite um turno de texto e dois turnos só de tool calls e fica vivo;
// 'text-last' emite um turno de tool call e um turno de texto final; 'clean' emite um turno e sai com 0.
const fakeCapped = join(tmp, "fake-capped.mjs");
writeFileSync(
	fakeCapped,
	`const text = { type: 'message_end', message: { role: 'assistant', content: [{ type: 'text', text: 'working on it' }] } }
const call = (n) => ({ type: 'message_end', message: { role: 'assistant', content: [{ type: 'toolCall', name: 'bash', arguments: { command: 'step-' + n } }] } })
const shape = process.env.FAKE_SHAPE || 'tools-last'
if (shape === 'tools-last') {
	process.stdout.write(JSON.stringify(text) + '\\n')
	process.stdout.write(JSON.stringify(call(1)) + '\\n')
	process.stdout.write(JSON.stringify(call(2)) + '\\n')
	setInterval(() => {}, 1000)
} else if (shape === 'text-last') {
	process.stdout.write(JSON.stringify(call(1)) + '\\n')
	process.stdout.write(JSON.stringify(text) + '\\n')
	setInterval(() => {}, 1000)
} else {
	process.stdout.write(JSON.stringify(text) + '\\n')
	process.exit(0)
}
`,
);

const agent: AgentConfig = {
	name: "fake",
	description: "fake",
	systemPrompt: "x",
	source: "user",
	filePath: join(tmp, "fake.md"),
};
const fakeDetails = (): SubagentDetails => ({}) as unknown as SubagentDetails;

type Rec = { id: string; state: string; pid?: number };

// Mesma moldura dos testes de frota: diretório de frota próprio e argv[1] apontando para o filho falso.
async function withFleet(body: () => Promise<void>): Promise<void> {
	delete process.env.NYCODE_SUBAGENT_DEPTH;
	delete process.env.NYCODE_SUBAGENT;
	const dir = store.ensureFleetDir() as string;
	const savedArgv = process.argv[1];
	process.argv[1] = fakeCapped;
	try {
		await body();
	} finally {
		process.argv[1] = savedArgv;
		for (const r of store.readRecords(dir) as Rec[]) {
			if (r.pid && r.state === "running")
				try {
					process.kill(-r.pid, "SIGKILL");
				} catch {
					/* já saiu */
				}
		}
		store.removeFleetDir();
	}
}

function startForegroundCapped(maxTurns: number): { id: () => string; result: Promise<SingleResult> } {
	let id = "";
	const result = runMod.runSingleAgent({
		defaultCwd: tmp,
		agents: [{ ...agent, maxTurns }],
		agentName: "fake",
		task: "go",
		makeDetails: fakeDetails,
		onPhase: (phase: string, _a: string, agentId: string) => {
			if (phase === "start") id = agentId;
		},
	});
	return { id: () => id, result };
}

const asst = (content: unknown[]): Message => ({ role: "assistant", content }) as unknown as Message;

// ---- unitário: o construtor do resumo ----

test("unit: tailCappedActions lista as tool calls e marca texto anterior às ações", () => {
	const messages = [
		asst([{ type: "text", text: "working on it" }]),
		asst([{ type: "toolCall", name: "bash", arguments: { command: "step-1" } }]),
		asst([{ type: "toolCall", name: "edit", arguments: { file_path: "/x.ts" } }]),
	];
	const { actions, lastTextBeforeActions } = tailCappedActions(messages);
	assert.equal(actions.length, 2);
	assert.equal(actions[0].name, "bash");
	assert.equal(lastTextBeforeActions, true);
	const summary = buildCappedRunSummary(actions, { lastTextBeforeActions });
	assert.match(summary, /Last actions/);
	assert.match(summary, /bash \{"command":"step-1"\}/);
	assert.ok(summary.includes('edit {"file_path":"/x.ts"}'));
	assert.match(summary, /last assistant text was written before these calls/);
});

test("unit: texto depois das ações não gera o aviso; sem ações não há lista", () => {
	const messages = [
		asst([{ type: "toolCall", name: "bash", arguments: { command: "step-1" } }]),
		asst([{ type: "text", text: "final answer" }]),
	];
	const { actions, lastTextBeforeActions } = tailCappedActions(messages);
	assert.equal(lastTextBeforeActions, false);
	assert.doesNotMatch(buildCappedRunSummary(actions, { lastTextBeforeActions }), /before these calls/);
	const empty = tailCappedActions([asst([{ type: "text", text: "only text" }])]);
	assert.equal(empty.actions.length, 0);
	assert.equal(buildCappedRunSummary(empty.actions, { lastTextBeforeActions: false }), "");
});

test("unit: no máximo 10 ações (as mais novas), linhas truncadas em ~160 e total limitado", () => {
	const messages: Message[] = [];
	for (let i = 1; i <= 15; i++)
		messages.push(asst([{ type: "toolCall", name: "bash", arguments: { command: `cmd-${i}` } }]));
	messages.push(asst([{ type: "toolCall", name: "write", arguments: { content: "x".repeat(500) } }]));
	const { actions } = tailCappedActions(messages);
	assert.equal(actions.length, 10);
	const summary = buildCappedRunSummary(actions, { lastTextBeforeActions: true, transcriptPath: "/tmp/t.jsonl" });
	assert.match(summary, /cmd-15/, "a mais nova entra");
	assert.doesNotMatch(summary, /cmd-5\b/, "as antigas além de 10 ficam de fora");
	for (const line of summary.split("\n")) assert.ok(line.length <= 160, `linha dentro do teto: ${line.length}`);
	assert.ok(summary.length <= 2048);
	assert.match(summary, /Transcript saved to \/tmp\/t\.jsonl/);
	assert.match(summary, /\.\.\./, "args longos truncados");
});

// ---- integração foreground ----

test("foreground capped em turnos só de tool calls: a nota traz as últimas ações e o texto antigo", async () => {
	await withFleet(async () => {
		process.env.FAKE_SHAPE = "tools-last";
		const { result } = startForegroundCapped(2);
		const res = await result;
		assert.equal(res.partial, true);
		const out = getFinalOutput(res.messages);
		assert.match(out, /working on it/, "o último texto continua na saída");
		assert.match(out, /\[Output is partial: the subagent stopped at its maxTurns limit\./);
		assert.match(out, /Last actions/);
		assert.match(out, /bash \{"command":"step-2"\}/);
		assert.match(out, /last assistant text was written before these calls/);
		assert.notEqual(out, "(no output)");
	});
});

test("foreground capped com texto final: texto preservado, ações listadas, sem o aviso de texto antigo", async () => {
	await withFleet(async () => {
		process.env.FAKE_SHAPE = "text-last";
		const { result } = startForegroundCapped(2);
		const res = await result;
		assert.equal(res.partial, true);
		const out = getFinalOutput(res.messages);
		assert.match(out, /working on it/);
		assert.match(out, /Last actions/);
		assert.match(out, /bash \{"command":"step-1"\}/);
		assert.doesNotMatch(out, /before these calls/);
	});
});

test("foreground sem cap: nenhuma nota, nenhuma lista, nenhum transcript", async () => {
	await withFleet(async () => {
		process.env.FAKE_SHAPE = "clean";
		const res = await runMod.runSingleAgent({
			defaultCwd: tmp,
			agents: [agent],
			agentName: "fake",
			task: "go",
			makeDetails: fakeDetails,
		});
		assert.equal(res.partial, undefined);
		const out = getFinalOutput(res.messages);
		assert.match(out, /working on it/);
		assert.doesNotMatch(out, /Output is partial/);
		assert.doesNotMatch(out, /Last actions/);
	});
});

test("foreground capped grava o transcript JSONL (0o600, uma mensagem por linha) e cita o caminho na nota", async () => {
	await withFleet(async () => {
		process.env.FAKE_SHAPE = "tools-last";
		const { id: getId, result } = startForegroundCapped(2);
		const res = await result;
		const transcriptPath = join(tmpdir(), `nycode-subagent-capped-${getId()}.jsonl`);
		assert.ok(existsSync(transcriptPath), `transcript existe em ${transcriptPath}`);
		const lines = readFileSync(transcriptPath, "utf8").trim().split("\n");
		// Uma linha por mensagem coletada. Quantas chegam antes do SIGTERM do teto varia com a carga (o CI viu menos de 3 com o
		// teto 2; a primeira versão exigia >= 3), então o contrato é a contagem exata das mensagens, no mínimo o teto.
		assert.equal(lines.length, res.messages.length, "uma linha por mensagem");
		assert.ok(lines.length >= 2, "ao menos as mensagens até o teto");
		for (const line of lines) {
			const msg = JSON.parse(line) as { role?: string };
			assert.equal(msg.role, "assistant");
		}
		assert.equal(statSync(transcriptPath).mode & 0o777, 0o600);
		assert.match(getFinalOutput(res.messages), /Transcript saved to/);
		assert.match(getFinalOutput(res.messages), /nycode-subagent-capped-/);
	});
});

// ---- integração background ----

test("background capped: o aviso de conclusão traz as últimas ações e o parser expõe a cauda", async () => {
	await withFleet(async () => {
		process.env.FAKE_SHAPE = "tools-last";
		let done: (run: bgMod.BackgroundRun) => void = () => {};
		const finished = new Promise<bgMod.BackgroundRun>((r) => {
			done = r;
		});
		const id = bgMod.startBackgroundRun(
			"fake",
			"go",
			{ command: process.execPath, args: [fakeCapped], cwd: tmp, maxTurns: 2 },
			(run) => done(run),
		);
		assert.ok(id);
		const run = await finished;
		assert.equal(run.partial, true);
		const text = registryText.backgroundCompletionText(run);
		assert.match(text, /Output is partial/);
		assert.match(text, /Last actions/);
		assert.match(text, /bash \{"command":"step-2"\}/);
		assert.match(text, /last assistant text was written before these calls/);
	});
});

test("unit: o parser JSONL do background expõe a cauda de ações sem bufferar as mensagens", () => {
	const text = { type: "message_end", message: { role: "assistant", content: [{ type: "text", text: "hi" }] } };
	const call = {
		type: "message_end",
		message: { role: "assistant", content: [{ type: "toolCall", name: "read", arguments: { file_path: "/a.ts" } }] },
	};
	const parser = bgMod.createJsonlOutputParser();
	parser.push(`${JSON.stringify(text)}\n${JSON.stringify(call)}\n`);
	const tail = parser.flush();
	assert.equal(tail.text, "hi");
	assert.equal(tail.actions.length, 1);
	assert.equal(tail.actions[0].name, "read");
	assert.equal(tail.lastTextBeforeActions, true);
});
