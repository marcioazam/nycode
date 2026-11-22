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
	return assert.fail("tmux not found on PATH (prerequisite of the e2e)");
}
const BIN = resolveNativeCli();
const TMUX = resolveTmux();
const NODE = process.execPath;
const root = mkdtempSync(join("/tmp", "nye-")); // mkdtemp: mode 0700, single owner
const SOCK = join(root, "tmux.sock");
const SAFE_PATH = "/usr/local/bin:/usr/bin:/bin";
let failed = false;
const tmuxCalls: string[][] = [];
after(() => {
	spawnSync(TMUX, tmuxArgs(["kill-server"]), { env: cleanEnv(root), stdio: "ignore" }); // only the server of the PRIVATE socket
	if (failed) console.error(`nycode-send-now-e2e: failed; recibos mantidos em ${root}`);
	else rmSync(root, { recursive: true });
});

// Allowlisted environment: nothing from the caller's environment (credentials, XDG, MCP, TMUX, SSH...) is passed on.
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

// Server: the 1st request answers with a bash tool call `command`, the following ones with text. Keeps the bodies for inspection.
function fakeProvider(command: string) {
	const bodies: RequestBody[] = [];
	const server = createServer((req: IncomingMessage, res) => {
		let raw = "";
		req.on("data", (c) => {
			raw += c;
		});
		req.on("end", () => {
			bodies.push(JSON.parse(raw || "{}") as RequestBody);
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
/** The part of a chat-completions request body the tests read (trust boundary: the JSON the app sent to the fake provider). */
interface RequestBody {
	messages: { role: string; content: string | { type: string; text?: string }[] }[];
}

interface Driver {
	pane(): string;
	keys(...k: string[]): void;
	lit(t: string): void;
	bodies: RequestBody[];
}

const alive = (marker: string) => spawnSync("pgrep", ["-f", marker]).status === 0;
const userTexts = (bodies: RequestBody[]) => JSON.stringify(bodies.slice(1));

async function session(name: string, command: string, drive: (s: Driver) => Promise<void>, withExt = false) {
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
		// isolated global extension: queues a custom message (like a subagent completion) when the tool starts
		mkdirSync(join(dir, "agent", "extensions"));
		writeFileSync(
			join(dir, "agent", "extensions", "custom-completion.ts"),
			`export default function (nycode) {\n  nycode.on('tool_execution_start', () => {\n    nycode.sendMessage({ customType: 'subagent-background', content: 'CUSTOM_COMPLETION_TOKEN', display: true }, { triggerTurn: true })\n  })\n}\n`,
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
	await waitFor("the bash tool running", () => alive(marker));
}

for (const [label, send] of [
	["Ctrl+Enter", (s: Driver) => s.lit("\x1b[13;5u")],
	["Ctrl+X Ctrl+S", (s: Driver) => s.keys("C-x", "C-s")],
] as const) {
	test(`native e2e: ${label} during a tool cancels the tool and sends the draft to the model`, async () => {
		const marker = `sleep 25; : nye${process.pid}1`;
		await session(`tool-${label.length}`, marker, async (s) => {
			await startTool(s, marker);
			s.lit("DRAFT-SENT-NOW");
			await sleep(300);
			send(s);
			await waitFor("the draft reached the model", () => userTexts(s.bodies).includes("DRAFT-SENT-NOW"));
			await waitFor("the tool was cancelled", () => !alive(marker), 10000);
			assert.ok(s.bodies.length >= 2);
		});
	});
}

test("native e2e: Ctrl+Enter during a user !bash cancels the bash and sends the draft", async () => {
	const marker = `sleep 25; : nye${process.pid}2`;
	await session("bang", "true", async (s) => {
		s.lit(`!${marker}`);
		s.keys("Enter");
		await waitFor("the !bash running", () => alive(marker));
		s.lit("AFTER-BASH");
		await sleep(300);
		s.lit("\x1b[13;5u");
		await waitFor("the bash was cancelled", () => !alive(marker), 10000);
		await waitFor("the draft reached the model", () => userTexts(s.bodies).includes("AFTER-BASH"));
	});
});

test("native e2e: a plain Enter during the tool only queues (neither cancels nor sends now)", async () => {
	const marker = `sleep 25; : nye${process.pid}3`;
	await session("enter", marker, async (s) => {
		await startTool(s, marker);
		s.lit("SO-ENFILEIRA");
		s.keys("Enter");
		await sleep(2500); // negative window: nothing should happen
		assert.ok(alive(marker), "the tool stays alive");
		assert.equal(s.bodies.length, 1);
		spawnSync("pkill", ["-f", marker]);
	});
});

test("native e2e: Ctrl+Enter with an empty editor and an active tool is a no-op (the tool stays alive)", async () => {
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

// F1: the native clearAllQueues drops queued custom messages; send-now must not lose a subagent completion.
test("native e2e F1: Ctrl+Enter with a draft during the tool delivers the draft AND the queued custom message to the model", async () => {
	const marker = `sleep 25; : nye${process.pid}5`;
	await session(
		"f1-draft",
		marker,
		async (s) => {
			await startTool(s, marker);
			s.lit("DRAFT-F1");
			await sleep(300);
			s.lit("\x1b[13;5u");
			await waitFor("the draft at the model", () => userTexts(s.bodies).includes("DRAFT-F1"));
			await waitFor("the custom message too", () => userTexts(s.bodies).includes("CUSTOM_COMPLETION_TOKEN"));
		},
		true,
	);
});

test("native e2e F1: Ctrl+Enter with an empty editor keeps the custom message: it reaches the model when the tool ends", async () => {
	const marker = `sleep 25; : nye${process.pid}6`;
	await session(
		"f1-empty",
		marker,
		async (s) => {
			await startTool(s, marker);
			s.lit("\x1b[13;5u");
			await sleep(1500); // negative window: everything stays still
			assert.ok(alive(marker), "no-op: the tool stays alive");
			assert.equal(s.bodies.length, 1);
			spawnSync("pkill", ["-f", marker]); // ends only this test's tool (unique marker with the runner PID)
			await waitFor("the custom message reached the model after the tool", () =>
				userTexts(s.bodies).includes("CUSTOM_COMPLETION_TOKEN"),
			);
		},
		true,
	);
});

test("native e2e: Shift+Left returns the queue for editing without aborting; Ctrl+U still edits the line", async () => {
	const marker = `sleep 25; : nye${process.pid}7`;
	await session("dequeue", marker, async (s) => {
		await startTool(s, marker);
		s.lit("QUEUED-MSG");
		s.keys("Enter");
		await waitFor("message in the queue", () => queuedRow(s.pane()) === "QUEUED-MSG");
		s.lit("temporary draft");
		s.keys("C-u");
		await waitFor(
			"Ctrl+U clears only the line",
			() => !s.pane().includes("temporary draft") && queuedRow(s.pane()) === "QUEUED-MSG",
		);
		s.keys("S-Left");
		await waitFor(
			"the queue returned to the editor",
			() => queuedRow(s.pane()) === undefined && s.pane().includes("QUEUED-MSG"),
		);
		assert.ok(alive(marker), "editing the queue does not abort the tool");
		assert.equal(s.bodies.length, 1);
		s.lit("-EDITED");
		s.keys("Enter");
		await waitFor("edited message in the queue", () => queuedRow(s.pane()) === "QUEUED-MSG-EDITED");
		spawnSync("pkill", ["-f", marker]);
		await waitFor("edited message at the model", () => userTexts(s.bodies).includes("QUEUED-MSG-EDITED"));
		// The agent turn, not the session-title request nycode sends to the same provider.
		const turn = s.bodies.filter((b) => JSON.stringify(b).includes("QUEUED-MSG-EDITED")).at(-1);
		assert.ok(turn, "a request carries the edited message");
		const texts = turn.messages
			.filter((m) => m.role === "user")
			.map((m) =>
				typeof m.content === "string"
					? m.content
					: m.content
							.filter((c) => c.type === "text")
							.map((c) => c.text)
							.join(""),
			);
		assert.ok(texts.includes("QUEUED-MSG-EDITED"));
		assert.ok(!texts.includes("QUEUED-MSG"), "the old text was not delivered too");
	});
});

test("native e2e: isolation - CLI run by Node, private tmux, allowlisted environment", () => {
	assert.ok(
		BIN.endsWith(".js") && !BIN.includes(`${REAL_HOME}/.local/bin`),
		"the CLI is JS, never the global wrapper",
	);
	assert.ok(
		!readFileSync(BIN, "utf8").startsWith("#!/bin/bash") && !readFileSync(BIN, "utf8").startsWith("#!/bin/sh"),
		"not a shell wrapper",
	);
	assert.ok(SOCK.startsWith(root) && root.startsWith("/tmp"));
	assert.equal(statSync(root).mode & 0o077, 0, "private root (0700)");
	// FAKE sentinels in the "caller" environment: none may cross the reduced environment
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
	// every tmux call of the harness uses the private socket and -f /dev/null
	assert.deepEqual(tmuxArgs(["ls"]), ["-S", SOCK, "-f", "/dev/null", "ls"]);
	const v = tmux(["-V"], dir, { encoding: "utf8" });
	assert.equal(v.status, 0, "tmux executable");
	assert.ok(tmuxCalls.every((a) => a[0] === "-S" && a[1] === SOCK && a[2] === "-f" && a[3] === "/dev/null"));
});
