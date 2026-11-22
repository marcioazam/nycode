// E2E of the built nycode CLI in tmux against a LOCAL fake provider (OpenAI-compatible HTTP server): no network, no paid model.
// The fake model asks for `bash sleep <marker>`; while the tool runs the test types a draft and presses Ctrl+Enter or Ctrl+X Ctrl+S
// (send now, K22), checks the queue edit and that a queued custom message is not lost. Every tmux call uses a PRIVATE socket and
// `-f /dev/null`, and each app gets its own HOME, agent dir and cwd under a short /tmp root. NYCODE_E2E_CLI overrides the CLI.
// A missing tmux fails (no skip). A failure keeps the temporary directory.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
	accessSync,
	constants,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	realpathSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { createServer, type IncomingMessage } from "node:http";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll as after, test as vitestTest } from "vitest";

const test = (name: string, fn: () => unknown) => vitestTest(name, { timeout: 180_000 }, fn as () => Promise<void>);

// Resolved before any fake HOME.
const REAL_HOME = homedir();
function resolveNativeCli(): string {
	const p = realpathSync(
		process.env.NYCODE_E2E_CLI ?? fileURLToPath(new URL("../../../../dist/bundle/cli.js", import.meta.url)),
	);
	assert.ok(statSync(p).isFile() && p.endsWith(".js"), `CLI is not a JS file: ${p}`);
	return p;
}
function resolveTmux(): string {
	for (const d of (process.env.PATH ?? "").split(delimiter)) {
		const c = join(d, "tmux");
		try {
			accessSync(c, constants.X_OK);
			if (statSync(c).isFile()) return realpathSync(c);
		} catch {}
	}
	return assert.fail("tmux não encontrado no PATH (pré-requisito do E2E)");
}
const BIN = resolveNativeCli();
const TMUX = resolveTmux();
const NODE = process.execPath;
const root = mkdtempSync(join("/tmp", "nye-")); // mkdtemp: modo 0700, dono único
const SOCK = join(root, "tmux.sock");
const SAFE_PATH = "/usr/local/bin:/usr/bin:/bin";
let failed = false;
const tmuxCalls: string[][] = [];
after(() => {
	spawnSync(TMUX, tmuxArgs(["kill-server"]), { env: cleanEnv(root), stdio: "ignore" }); // só o servidor do socket PRIVADO
	if (failed) console.error(`nycode-send-now-e2e: failed; recibos mantidos em ${root}`);
	else rmSync(root, { recursive: true });
});

// Ambiente em lista branca: nada do ambiente do chamador (credenciais, XDG, MCP, TMUX, SSH…) é repassado.
function cleanEnv(dir: string, extra: Record<string, string> = {}): Record<string, string> {
	return {
		PATH: SAFE_PATH,
		HOME: join(dir, "home"),
		TMPDIR: join(dir, "tmp"),
		TERM: "xterm-256color",
		LANG: "C.UTF-8",
		...extra,
	};
}
const tmuxArgs = (a: string[]) => ["-S", SOCK, "-f", "/dev/null", ...a];
const tmux = (a: string[], dir: string, opts: object = {}) => {
	const args = tmuxArgs(a);
	tmuxCalls.push(args);
	return spawnSync(TMUX, args, { env: cleanEnv(dir), ...opts });
};
const q = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function waitFor<T>(what: string, probe: () => T | undefined | false, ms = 20000): Promise<T> {
	const end = Date.now() + ms;
	for (;;) {
		const v = probe();
		if (v) return v;
		if (Date.now() > end) assert.fail(`timeout waiting for ${what}`);
		await sleep(100);
	}
}

// Servidor: 1ª requisição → tool call bash `command`; as seguintes → texto. Guarda os corpos para inspeção.
function fakeProvider(command: string) {
	const bodies: any[] = [];
	const server = createServer((req: IncomingMessage, res) => {
		let raw = "";
		req.on("data", (c) => {
			raw += c;
		});
		req.on("end", () => {
			bodies.push(JSON.parse(raw || "{}"));
			const chunk = (delta: object, finish: string | null) =>
				`data: ${JSON.stringify({ id: "c", object: "chat.completion.chunk", created: 0, model: "m1", choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`;
			res.writeHead(200, { "content-type": "text/event-stream" });
			if (bodies.length === 1) {
				res.write(
					chunk(
						{
							role: "assistant",
							tool_calls: [
								{
									index: 0,
									id: "call_1",
									type: "function",
									function: { name: "bash", arguments: JSON.stringify({ command }) },
								},
							],
						},
						null,
					),
				);
				res.write(chunk({}, "tool_calls"));
			} else {
				res.write(chunk({ role: "assistant", content: "ok" }, null));
				res.write(chunk({}, "stop"));
			}
			res.end("data: [DONE]\n\n");
		});
	});
	return { server, bodies };
}

/** Text of the first row of the "Na fila" queue panel (K22: `▎ 1  <text>   <when>`), undefined while the panel is closed. */
const queuedRow = (pane: string): string | undefined => {
	const row = pane.split("\n").find((l) => l.startsWith("▎ 1 "));
	return row?.slice(4).split("  ")[0]?.trim();
};
const alive = (marker: string) => spawnSync("pgrep", ["-f", marker]).status === 0;
const userTexts = (bodies: any[]) => JSON.stringify(bodies.slice(1));

async function session(
	name: string,
	command: string,
	drive: (s: { pane(): string; keys(...k: string[]): void; lit(t: string): void; bodies: any[] }) => Promise<void>,
	withExt = false,
) {
	const dir = join(root, name);
	mkdirSync(join(dir, "agent"), { recursive: true });
	mkdirSync(join(dir, "work"));
	writeFileSync(
		join(dir, "agent", "keybindings.json"),
		JSON.stringify({ "app.message.dequeue": ["shift+left"], "tui.altScreen.previousPrompt": ["ctrl+up"] }),
	);
	const { server, bodies } = fakeProvider(command);
	await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
	const port = (server.address() as { port: number }).port;
	writeFileSync(
		join(dir, "agent", "models.json"),
		JSON.stringify({
			providers: {
				fake: {
					baseUrl: `http://127.0.0.1:${port}/v1`,
					api: "openai-completions",
					apiKey: "fake-key",
					models: [{ id: "m1", name: "m1", input: ["text"], contextWindow: 32000, maxTokens: 2048 }],
				},
			},
		}),
	);
	if (withExt) {
		// extensão global isolada: enfileira uma mensagem custom (como a conclusão de um subagente) quando a tool começa
		mkdirSync(join(dir, "agent", "extensions"));
		writeFileSync(
			join(dir, "agent", "extensions", "custom-completion.ts"),
			`export default function (pi) {\n  pi.on('tool_execution_start', () => {\n    pi.sendMessage({ customType: 'subagent-background', content: 'CUSTOM_COMPLETION_TOKEN', display: true }, { triggerTurn: true })\n  })\n}\n`,
		);
	}
	for (const d of ["home", "tmp"]) mkdirSync(join(dir, d), { recursive: true });
	const S = `nye-${process.pid}-${name}`;
	const appEnv = cleanEnv(dir, {
		NYCODE_CODING_AGENT_DIR: join(dir, "agent"),
		NYCODE_OFFLINE: "1",
		NYCODE_BYPASS_PERMISSIONS: "1",
	});
	const envArgs = Object.entries(appEnv)
		.map(([k, v]) => q(`${k}=${v}`))
		.join(" ");
	const cmd = `cd ${q(join(dir, "work"))} && env -i ${envArgs} ${q(NODE)} ${q(BIN)} --offline --model fake/m1 --session-dir ${q(join(dir, "sessions"))}; sleep 20`;
	tmux(["new-session", "-d", "-s", S, "-x", "140", "-y", "40", cmd], dir);
	const pane = () => tmux(["capture-pane", "-p", "-t", S, "-S", "-80"], dir, { encoding: "utf8" }).stdout.toString();
	const keys = (...k: string[]) => void tmux(["send-keys", "-t", S, ...k], dir);
	const lit = (t: string) => void tmux(["send-keys", "-t", S, "-l", "--", t], dir);
	try {
		await waitFor("nycode prompt", () => /─{10}/.test(pane()), 40000);
		await sleep(1500);
		await drive({ pane, keys, lit, bodies });
	} catch (e) {
		failed = true;
		if (e instanceof Error) e.message = `${e.message}\n--- pane\n${pane()}\n--- provider requests: ${bodies.length}`;
		throw e;
	} finally {
		tmux(["kill-session", "-t", S], dir);
		await new Promise((r) => server.close(r));
	}
}

async function startTool(s: Parameters<Parameters<typeof session>[2]>[0], marker: string) {
	s.lit("rode o comando");
	s.keys("Enter");
	await waitFor("a tool bash em execução", () => alive(marker));
}

for (const [label, send] of [
	["Ctrl+Enter", (s: any) => s.lit("\x1b[13;5u")],
	["Ctrl+X Ctrl+S", (s: any) => s.keys("C-x", "C-s")],
] as const) {
	test(`E2E nativo: ${label} durante uma tool cancela a tool e envia o rascunho ao modelo`, async () => {
		const marker = `sleep 25; : nye${process.pid}1`;
		await session(`tool-${label.length}`, marker, async (s) => {
			await startTool(s, marker);
			s.lit("RASCUNHO-ENVIADO-AGORA");
			await sleep(300);
			send(s);
			await waitFor("o rascunho chegou ao modelo", () => userTexts(s.bodies).includes("RASCUNHO-ENVIADO-AGORA"));
			await waitFor("a tool foi cancelada", () => !alive(marker), 10000);
			assert.ok(s.bodies.length >= 2);
		});
	});
}

test("E2E nativo: Ctrl+Enter durante um !bash do usuário cancela o bash e envia o rascunho", async () => {
	const marker = `sleep 25; : nye${process.pid}2`;
	await session("bang", "true", async (s) => {
		s.lit(`!${marker}`);
		s.keys("Enter");
		await waitFor("o !bash em execução", () => alive(marker));
		s.lit("DEPOIS-DO-BASH");
		await sleep(300);
		s.lit("\x1b[13;5u");
		await waitFor("o bash foi cancelado", () => !alive(marker), 10000);
		await waitFor("o rascunho chegou ao modelo", () => userTexts(s.bodies).includes("DEPOIS-DO-BASH"));
	});
});

test("E2E nativo: Enter simples durante a tool só enfileira (não cancela nem envia agora)", async () => {
	const marker = `sleep 25; : nye${process.pid}3`;
	await session("enter", marker, async (s) => {
		await startTool(s, marker);
		s.lit("SO-ENFILEIRA");
		s.keys("Enter");
		await sleep(2500); // janela negativa: nada deve acontecer
		assert.ok(alive(marker), "a tool segue viva");
		assert.equal(s.bodies.length, 1);
		spawnSync("pkill", ["-f", marker]);
	});
});

test("E2E nativo: Ctrl+Enter com editor vazio e tool ativa é no-op (a tool segue viva)", async () => {
	const marker = `sleep 25; : nye${process.pid}4`;
	await session("empty", marker, async (s) => {
		await startTool(s, marker);
		s.lit("\x1b[13;5u");
		await sleep(2500);
		assert.ok(alive(marker));
		assert.equal(s.bodies.length, 1);
		spawnSync("pkill", ["-f", marker]);
	});
});

// F1: o clearAllQueues nativo apaga mensagens custom enfileiradas; o enviar-agora não pode perder a conclusão de um subagente.
test("E2E nativo F1: Ctrl+Enter com rascunho durante a tool entrega ao modelo o rascunho E a mensagem custom enfileirada", async () => {
	const marker = `sleep 25; : nye${process.pid}5`;
	await session(
		"f1-draft",
		marker,
		async (s) => {
			await startTool(s, marker);
			s.lit("RASCUNHO-F1");
			await sleep(300);
			s.lit("\x1b[13;5u");
			await waitFor("rascunho no modelo", () => userTexts(s.bodies).includes("RASCUNHO-F1"));
			await waitFor("a mensagem custom também", () => userTexts(s.bodies).includes("CUSTOM_COMPLETION_TOKEN"));
		},
		true,
	);
});

test("E2E nativo F1: Ctrl+Enter com editor vazio não apaga a mensagem custom: ela chega ao modelo quando a tool termina", async () => {
	const marker = `sleep 25; : nye${process.pid}6`;
	await session(
		"f1-empty",
		marker,
		async (s) => {
			await startTool(s, marker);
			s.lit("\x1b[13;5u");
			await sleep(1500); // janela negativa: continua tudo parado
			assert.ok(alive(marker), "no-op: a tool segue viva");
			assert.equal(s.bodies.length, 1);
			spawnSync("pkill", ["-f", marker]); // encerra só a tool deste teste (marcador único com o PID do runner)
			await waitFor("a custom chegou ao modelo após a tool", () =>
				userTexts(s.bodies).includes("CUSTOM_COMPLETION_TOKEN"),
			);
		},
		true,
	);
});

test("E2E nativo: Shift+↑ devolve a fila para editar sem abortar; Ctrl+U continua edição de linha", async () => {
	const marker = `sleep 25; : nye${process.pid}7`;
	await session("dequeue", marker, async (s) => {
		await startTool(s, marker);
		s.lit("QUEUED-MSG");
		s.keys("Enter");
		await waitFor("mensagem na fila", () => queuedRow(s.pane()) === "QUEUED-MSG");
		s.lit("rascunho temporario");
		s.keys("C-u");
		await waitFor(
			"Ctrl+U limpa só a linha",
			() => !s.pane().includes("rascunho temporario") && queuedRow(s.pane()) === "QUEUED-MSG",
		);
		s.keys("S-Left");
		await waitFor(
			"fila devolvida ao editor",
			() => queuedRow(s.pane()) === undefined && s.pane().includes("QUEUED-MSG"),
		);
		assert.ok(alive(marker), "editar a fila não aborta a tool");
		assert.equal(s.bodies.length, 1);
		s.lit("-EDITED");
		s.keys("Enter");
		await waitFor("mensagem editada na fila", () => queuedRow(s.pane()) === "QUEUED-MSG-EDITED");
		spawnSync("pkill", ["-f", marker]);
		await waitFor("mensagem editada no modelo", () => userTexts(s.bodies).includes("QUEUED-MSG-EDITED"));
		// The agent turn, not the session-title request nycode sends to the same provider.
		const turn = s.bodies.filter((b: any) => JSON.stringify(b).includes("QUEUED-MSG-EDITED")).at(-1);
		const texts = turn.messages
			.filter((m: any) => m.role === "user")
			.map((m: any) =>
				typeof m.content === "string"
					? m.content
					: m.content
							.filter((c: any) => c.type === "text")
							.map((c: any) => c.text)
							.join(""),
			);
		assert.ok(texts.includes("QUEUED-MSG-EDITED"));
		assert.ok(!texts.includes("QUEUED-MSG"), "o texto antigo não foi entregue também");
	});
});

test("E2E nativo: isolamento — CLI nativo via Node, tmux privado, ambiente em lista branca", () => {
	assert.ok(BIN.endsWith(".js") && !BIN.includes(`${REAL_HOME}/.local/bin`), "CLI nativo JS, nunca o wrapper global");
	assert.ok(
		!readFileSync(BIN, "utf8").startsWith("#!/bin/bash") && !readFileSync(BIN, "utf8").startsWith("#!/bin/sh"),
		"não é wrapper shell",
	);
	assert.ok(SOCK.startsWith(root) && root.startsWith("/tmp"));
	assert.equal(statSync(root).mode & 0o077, 0, "raiz privada (0700)");
	// sentinelas FALSAS no ambiente do "chamador": nenhuma deve atravessar o ambiente reduzido
	const hostile: Record<string, string> = {
		ANTHROPIC_API_KEY: "SENTINEL-KEY",
		OPENAI_API_KEY: "SENTINEL-KEY",
		XDG_CONFIG_HOME: "/sentinel/xdg",
		TMUX: "/sentinel/tmux,1,0",
		SSH_AUTH_SOCK: "/sentinel/ssh",
		NYCODE_CODING_AGENT_DIR: "/sentinel/agent",
		MCP_CONFIG: "/sentinel/mcp",
	};
	const dir = join(root, "iso");
	for (const d of ["home", "tmp"]) mkdirSync(join(dir, d), { recursive: true });
	const r = spawnSync(
		"env",
		[
			"-i",
			...Object.entries(cleanEnv(dir)).map(([k, v]) => `${k}=${v}`),
			NODE,
			"-e",
			"console.log(JSON.stringify(process.env))",
		],
		{ env: hostile, encoding: "utf8" },
	);
	const seen = JSON.parse(r.stdout) as Record<string, string>;
	assert.deepEqual(Object.keys(seen).sort(), ["HOME", "LANG", "PATH", "TERM", "TMPDIR"]);
	assert.ok(seen.HOME.startsWith(root));
	assert.ok(!JSON.stringify(seen).includes("SENTINEL") && !JSON.stringify(seen).includes("/sentinel/"));
	// toda chamada tmux feita pelo harness usa socket privado e -f /dev/null
	assert.deepEqual(tmuxArgs(["ls"]), ["-S", SOCK, "-f", "/dev/null", "ls"]);
	const v = tmux(["-V"], dir, { encoding: "utf8" });
	assert.equal(v.status, 0, "tmux executável");
	assert.ok(tmuxCalls.every((a) => a[0] === "-S" && a[1] === SOCK && a[2] === "-f" && a[3] === "/dev/null"));
});
