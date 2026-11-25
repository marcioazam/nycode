// node --experimental-strip-types --test ~/.nycode/agent/extensions/ui-visual/test/working.test.ts
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, test, vi } from "vitest";
import { definirMovimento } from "../../../../../src/extensions/ui/a11y.ts";
import { relogio } from "../../../../../src/extensions/ui-visual/motion/motion.ts";
import working, {
	DICAS,
	dicaDe,
	formatElapsed,
	frames,
	phaseText,
	quadrosTravados,
	tokensTexto,
	toolTarget,
	travaMistura,
	truncate,
} from "../../../../../src/extensions/ui-visual/working.ts";

// The animations read TERM: pin it so the suite does not depend on the shell it runs in.
beforeEach(() => {
	vi.stubEnv("TERM", "xterm-256color");
});
afterEach(() => {
	vi.unstubAllEnvs();
});

// O relógio único lê a hora por `relogio.agora`; com os timers falsos do node:test a hora que anda é a do Date.
relogio.agora = () => Date.now();
process.env.NYCODE_UI_STATE = join(mkdtempSync(join(tmpdir(), "working-test-")), "ui-state.json"); // sem o estado real do usuário

// The event-loop utilization the limiter reads is real: vitest keeps the loop busy, node:test did not.
relogio.ocupacao = () => 0;
afterEach(() => {
	vi.useRealTimers();
	definirMovimento(undefined);
});

test("formatElapsed: limites", () => {
	assert.equal(formatElapsed(-5), "0s");
	assert.equal(formatElapsed(4000), "4s");
	assert.equal(formatElapsed(59999), "59s");
	assert.equal(formatElapsed(60000), "1m 00s");
	assert.equal(formatElapsed(65000), "1m 05s");
	assert.equal(formatElapsed(3599000), "59m 59s");
	assert.equal(formatElapsed(3720000), "1h 02m");
});

test("truncate e toolTarget", () => {
	assert.equal(truncate("abc", 5), "abc");
	assert.equal(truncate("a".repeat(50)).length, 40);
	assert.ok(truncate("a".repeat(50)).endsWith("…"));
	assert.equal(toolTarget({ path: "/a/b.ts" }), "/a/b.ts");
	assert.equal(toolTarget({ command: "ls -la\nrm x" }), "ls -la");
	assert.equal(toolTarget({ pattern: "foo" }), "foo");
	assert.equal(toolTarget({ path: "", pattern: "x" }), "x");
	assert.equal(toolTarget(undefined), "");
	assert.equal(toolTarget({ n: 1 }), "");
});

test("phaseText: 0, 1 e 2 ferramentas", () => {
	assert.equal(phaseText({ phase: "pensando", tools: [], elapsedMs: 4000 }), "pensando · 4s · esc interrompe");
	assert.equal(
		phaseText({ phase: "escrevendo", tools: [], elapsedMs: 65000 }),
		"escrevendo · 1m 05s · esc interrompe",
	);
	assert.equal(
		phaseText({ phase: "pensando", tools: [{ name: "read", target: "a.ts" }], elapsedMs: 1000 }),
		"read · a.ts · 1s · esc interrompe",
	);
	assert.equal(
		phaseText({ phase: "pensando", tools: [{ name: "bash", target: "" }], elapsedMs: 1000 }),
		"bash · 1s · esc interrompe",
	);
	const two = [
		{ name: "read", target: "a" },
		{ name: "ls", target: "b" },
	];
	assert.equal(phaseText({ phase: "pensando", tools: two, elapsedMs: 2000 }), "2 ferramentas · 2s · esc interrompe");
});

// Spinner nas cores do nycode (`accent`, como o Loader nativo), não mais arco-íris; sem movimento 1 quadro.
test("frames: 10 quadros em accent; sem movimento 1 quadro accent", () => {
	const theme = { fg: (k: string, s: string) => `<${k}>${s}` };
	assert.deepEqual(
		frames(theme, true),
		["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"].map((f) => `<accent>${f}`),
	);
	assert.deepEqual(frames(theme, false), ["<accent>●"]);
});

test("mensagem de trabalho em ciano (syntaxType)", () => {
	withEnv({}, () => {
		const { handlers, calls, ctx } = setup();
		handlers.agent_start({}, ctx);
		handlers.agent_settled({}, ctx);
		assert.equal(calls.find((c) => c[0] === "message")?.[1], "<syntaxType>pensando · 0s · esc interrompe");
	});
});

function setup(hasUI = true) {
	const handlers: Record<string, (e: any, c: any) => void> = {};
	const calls: unknown[][] = [];
	const ctx = {
		hasUI,
		ui: {
			theme: { fg: (k: string, s: string) => `<${k}>${s}` },
			setWorkingIndicator: (o: unknown) => calls.push(["indicator", o]),
			setHiddenThinkingLabel: (t: string) => calls.push(["label", t]),
			setWorkingMessage: (t?: string) => calls.push(["message", t]),
		},
	};
	working({
		on: (n: string, h: any) => {
			handlers[n] = h;
		},
	} as any);
	return { handlers, calls, ctx };
}

function withEnv(env: Record<string, string>, fn: () => void) {
	const keys = ["NYCODE_REDUCED_MOTION", "NO_PROGRESS", "NYCODE_SUBAGENT"];
	const saved = keys.map((k) => process.env[k]);
	for (const k of keys) delete process.env[k];
	Object.assign(process.env, env);
	try {
		fn();
	} finally {
		keys.forEach((k, i) => {
			if (saved[i] === undefined) delete process.env[k];
			else process.env[k] = saved[i];
		});
	}
}

test("session_start: indicador animado e rótulo de raciocínio", () => {
	withEnv({}, () => {
		const { handlers, calls, ctx } = setup();
		handlers.session_start({}, ctx);
		const ind = calls[0][1] as { frames: string[]; intervalMs: number };
		assert.equal(ind.frames.length, 10);
		assert.equal(ind.intervalMs, 80);
		// O rótulo fica no histórico de um raciocínio já terminado; "raciocinando…" parecia em andamento
		assert.match(String(calls[1][1]), /raciocínio · clique abre$/);
	});
});

test("session_start: NYCODE_REDUCED_MOTION deixa 1 quadro", () => {
	withEnv({ NYCODE_REDUCED_MOTION: "1" }, () => {
		const { handlers, calls, ctx } = setup();
		handlers.session_start({}, ctx);
		assert.equal((calls[0][1] as { frames: string[] }).frames.length, 1);
	});
});

test("sem UI ou em subagente não faz nada", () => {
	withEnv({}, () => {
		const { handlers, calls, ctx } = setup(false);
		for (const n of [
			"session_start",
			"agent_start",
			"message_update",
			"tool_execution_start",
			"tool_execution_end",
			"agent_settled",
		])
			handlers[n]({}, ctx);
		assert.deepEqual(calls, []);
	});
	withEnv({ NYCODE_SUBAGENT: "1" }, () => {
		const { handlers, calls, ctx } = setup();
		handlers.session_start({}, ctx);
		handlers.agent_start({}, ctx);
		assert.deepEqual(calls, []);
	});
});

test("turno: fases, timer de 1s e restauração", () => {
	withEnv({}, () => {
		vi.useFakeTimers({ toFake: ["setInterval", "Date"] });
		const { handlers, calls, ctx } = setup();
		// Status em ciano desde 2026-11-15: a cor sai daqui; as fases seguem conferidas pelo texto.
		const msgs = () =>
			calls
				.filter((c) => c[0] === "message")
				.map((c) => (typeof c[1] === "string" ? c[1].replace(/^<syntaxType>/, "") : c[1]));
		handlers.tool_execution_start({ toolCallId: "x", toolName: "read", args: {} }, ctx); // sem turno: ignora
		assert.deepEqual(msgs(), []);
		handlers.agent_start({}, ctx);
		assert.deepEqual(msgs(), ["pensando · 0s · esc interrompe"]);
		vi.advanceTimersByTime(3040); // one frame past 3 s: the frame timer ticks every 33 ms, so 3000 ms alone lands on 2.97 s
		assert.equal(msgs().at(-1), "pensando · 3s · esc interrompe");
		handlers.message_update({}, ctx);
		handlers.message_update({}, ctx);
		vi.advanceTimersByTime(40); // the next frame renders the new phase
		assert.equal(msgs().at(-1), "escrevendo · 3s · esc interrompe");
		handlers.tool_execution_start({ toolCallId: "a", toolName: "read", args: { path: "a.ts" } }, ctx);
		assert.equal(msgs().at(-1), "read · a.ts · 3s · esc interrompe");
		handlers.tool_execution_start({ toolCallId: "b", toolName: "bash", args: { command: "ls" } }, ctx);
		assert.equal(msgs().at(-1), "2 ferramentas · 3s · esc interrompe");
		handlers.tool_execution_end({ toolCallId: "a" }, ctx);
		assert.equal(msgs().at(-1), "bash · ls · 3s · esc interrompe");
		handlers.tool_execution_end({ toolCallId: "b" }, ctx);
		assert.equal(msgs().at(-1), "pensando · 3s · esc interrompe");
		handlers.agent_settled({}, ctx);
		assert.equal(msgs().at(-1), undefined);
		const n = calls.length;
		vi.advanceTimersByTime(5000); // timer limpo: nada novo
		assert.equal(calls.length, n);
	});
});

test("session_shutdown limpa o timer; agent_start repetido não vaza", () => {
	withEnv({}, () => {
		vi.useFakeTimers({ toFake: ["setInterval", "Date"] });
		const { handlers, calls, ctx } = setup();
		handlers.agent_start({}, ctx);
		handlers.agent_start({}, ctx);
		handlers.session_shutdown({}, ctx);
		const n = calls.length;
		vi.advanceTimersByTime(3000);
		assert.equal(calls.length, n);
	});
});

const KITTY = { TERM: "xterm-kitty" };
test("P05 travaMistura: nada antes de 10 s; âmbar em 10 passos por 2 s; reduzido troca direto", () => {
	assert.equal(travaMistura(9_999, KITTY), 0);
	assert.equal(travaMistura(10_000, KITTY), 0);
	assert.equal(travaMistura(11_000, KITTY), 0.5);
	assert.equal(travaMistura(13_000, KITTY), 1);
	assert.equal(travaMistura(10_000, { ...KITTY, NYCODE_REDUCED_MOTION: "1" }), 1);
});

test("P05 quadrosTravados: mistura em truecolor, girada para seguir do quadro atual; sem truecolor vira warning", () => {
	const theme = {
		fg: (k: string, t: string) => `<${k}>${t}`,
		getFgAnsi: (k: string) => (k === "accent" ? "\x1b[38;2;0;0;200m" : "\x1b[38;2;200;100;0m"),
	};
	const q = quadrosTravados(theme, 0.5, 160, KITTY);
	assert.equal(q.length, 10);
	assert.equal(q[0], "\x1b[38;2;100;50;100m⠹\x1b[39m", "160 ms = 3º quadro, cor no meio do caminho");
	assert.equal(quadrosTravados(theme, 0, 0, KITTY)[0], "<accent>⠋");
	assert.equal(quadrosTravados({ fg: theme.fg }, 0.5, 0, KITTY)[0], "<warning>⠋");
	assert.deepEqual(quadrosTravados(theme, 1, 0, { ...KITTY, NYCODE_REDUCED_MOTION: "1" }), ["<warning>●"]);
});

test("P09 dicaDe: nada antes de 5 s, troca a cada 8 s e volta ao começo", () => {
	assert.equal(dicaDe(4_999), "");
	assert.equal(dicaDe(5_000), DICAS[0]);
	assert.equal(dicaDe(13_000), DICAS[1]);
	assert.equal(dicaDe(5_000 + DICAS.length * 8_000), DICAS[0]);
});

test("P10 tokensTexto: largura fixa, til enquanto estima, k com vírgula", () => {
	assert.equal(tokensTexto(0, 0), "");
	assert.equal(tokensTexto(0, 42), "↓   ~42");
	assert.equal(tokensTexto(840, 0), "↓   840");
	assert.equal(tokensTexto(1200, 49), "↓ ~1,2k");
	assert.equal(tokensTexto(12_345, 0), "↓ 12,3k");
});

test("P05, P09 e P10 no turno: tokens do stream, aviso de travamento, dica e volta ao normal", () => {
	withEnv({}, () => {
		vi.useFakeTimers({ toFake: ["setInterval", "Date"] });
		const { handlers, calls, ctx } = setup();
		const msgs = () =>
			calls
				.filter((c) => c[0] === "message")
				.map((c) =>
					String(c[1])
						.split(/<[a-zA-Z]+>/g)
						.join(""),
				);
		handlers.agent_start({}, ctx);
		handlers.message_update({ assistantMessageEvent: { type: "text_delta", delta: "x".repeat(400) } }, ctx);
		vi.advanceTimersByTime(40); // the next frame renders the new phase
		assert.equal(msgs().at(-1), "escrevendo · 0s · ↓  ~100 · esc interrompe");
		handlers.message_end({ message: { role: "assistant", usage: { output: 130 } } }, ctx);
		vi.advanceTimersByTime(40);
		assert.equal(
			msgs().at(-1),
			"escrevendo · 0s · ↓   130 · esc interrompe",
			"no fim da mensagem vale o número do provedor",
		);
		vi.advanceTimersByTime(6_000);
		assert.equal(msgs().at(-1), "escrevendo · 6s · ↓   130 · esc interrompe\ndica: ctrl+o abre a saída da tool");
		vi.advanceTimersByTime(6_000);
		assert.equal(
			msgs().at(-1),
			"sem resposta há 12s · 12s · ↓   130 · esc interrompe\ndica: ctrl+o abre a saída da tool",
		);
		const ind = calls.filter((c) => c[0] === "indicator").at(-1)![1] as { frames: string[] };
		assert.match(ind.frames[0]!, /^<warning>/, "sem truecolor no tema o spinner vai direto ao âmbar do tema");
		handlers.tool_execution_start({ toolCallId: "t", toolName: "bash", args: { command: "npm test" } }, ctx);
		vi.advanceTimersByTime(20_000);
		assert.match(msgs().at(-1)!, /^bash · npm test · 32s/, "tool longa não é travamento");
		handlers.agent_settled({}, ctx);
		assert.match(
			(calls.filter((c) => c[0] === "indicator").at(-1)![1] as { frames: string[] }).frames[0]!,
			/^<accent>/,
		);
	});
});

test("P01 desligado: texto fixo, sem relógio; /dicas desliga e grava", async () => {
	withEnv({ NO_PROGRESS: "1" }, () => {
		vi.useFakeTimers({ toFake: ["setInterval", "Date"] });
		const { handlers, calls, ctx } = setup();
		handlers.agent_start({}, ctx);
		vi.advanceTimersByTime(20_000);
		assert.deepEqual(
			calls.filter((c) => c[0] === "message"),
			[["message", "<syntaxType>trabalhando… · esc interrompe"]],
		);
	});
	let cmd: any;
	working({
		on: () => {},
		registerCommand: (_n: string, c: unknown) => {
			cmd = c;
		},
	} as any);
	const avisos: string[] = [];
	await cmd.handler("", { ui: { notify: (m: string) => avisos.push(m) } });
	await cmd.handler("", { ui: { notify: (m: string) => avisos.push(m) } });
	assert.deepEqual(avisos, ["Dicas na espera desligadas", "Dicas na espera ligadas"]);
});
