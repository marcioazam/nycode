// Shared fixture of the native display tests (native-frame, native-panels): the built CLI launched directly in tmux under
// `env -i` (temp HOME and agent dir, short root under /tmp), the fixture extension native-entry.ts (real status-line, fleet UI
// and PlanSection), a 127.0.0.1 fake provider that must see 0 requests. A failure prints the trace: the clicks the test sent,
// the raw input the app received, and the pane. NYCODE_E2E_CLI overrides the CLI. Not a test file; tmux missing fails.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll } from "vitest";

const have = spawnSync("tmux", ["-V"]).status === 0;
const CLI = process.env.NYCODE_E2E_CLI ?? fileURLToPath(new URL("../../../../dist/bundle/cli.js", import.meta.url));
const ENTRY = fileURLToPath(new URL("./native-entry.ts", import.meta.url));
// Short: the tmux socket path of a private server must fit sun_path.
const root = mkdtempSync(join("/tmp", "nyd-"));
// Each server's socket lives in root: tmux leaves the socket file behind after kill-server, and a test that failed before
// close() would leave its server (and the CLI in it) running.
const sockets: string[] = [];
afterAll(() => {
	for (const sock of sockets) spawnSync("tmux", ["-S", sock, "kill-server"], { stdio: "ignore" });
	rmSync(root, { recursive: true, force: true });
});

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const lines = (t: string) => t.split("\n");
export const isRule = (l: string) => /^─{20,}\s*$/.test(l);
export const find = (t: string, re: RegExp) => lines(t).findIndex((l) => re.test(l));
/** Tab bar: `Status   Agentes N   Plan d/t   Run N` (only the active tabs), a `━` rule under the open tab. */
export const BAR = /^(?:Status|Agentes \d+|(?:Todo|Plan) \d+\/\d+|Run \d+)(?: {3}| {2}|$)/;
export const barRow = (t: string) => find(t, BAR);
export const tabLine = (t: string) => lines(t)[barRow(t)] ?? "";
export const tabNames = (t: string) => tabLine(t).match(/Status|Agentes \d+|(?:Todo|Plan) \d+\/\d+|Run \d+/g) ?? [];
/** 1-based pane column of a tab name (clicks land on it). */
export const tabCol = (t: string, name: RegExp) => {
	const i = tabLine(t).search(name);
	assert.ok(i >= 0, `no tab ${name}\n${t}`);
	return i + 1;
};
/** Name of the open tab: the one whose rule span is ━ (taken from the rule row under the bar). */
export const openTab = (t: string) => {
	const r = lines(t)[barRow(t) + 1] ?? "";
	const l = tabLine(t);
	return tabNames(t).find((n) => {
		const i = l.indexOf(n);
		return r.slice(i, i + n.length) === "━".repeat(n.length);
	});
};

export interface Cfg {
	plan: boolean;
	agents: boolean;
	transcript?: boolean;
}

export async function launch(name: string, cfg: Cfg, rows = 40) {
	assert.ok(have, "tmux is required for the native display tests (blocked, not skipped)");
	const dir = join(root, name);
	for (const d of ["agent", "work", "home"]) mkdirSync(join(dir, d), { recursive: true });
	const requests: string[] = [];
	const server = createServer((req, res) => {
		requests.push(`${req.method} ${req.url}`);
		const chunk = (delta: object, finish: string | null) =>
			`data: ${JSON.stringify({ id: "c", object: "chat.completion.chunk", created: 0, model: "m1", choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`;
		res.writeHead(200, { "content-type": "text/event-stream" });
		res.end(`${chunk({ role: "assistant", content: "ok" }, null) + chunk({}, "stop")}data: [DONE]\n\n`);
	});
	await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
	const port = (server.address() as { port: number }).port;
	const marker = join(dir, "stop-marker");
	const tracePath = join(dir, "trace.log");
	const models = {
		providers: {
			fake: {
				baseUrl: `http://127.0.0.1:${port}/v1`,
				api: "openai-completions",
				apiKey: "fake-key",
				models: [{ id: "m1", name: "Fixture Model", input: ["text"], contextWindow: 32000, maxTokens: 2048 }],
			},
		},
	};
	writeFileSync(join(dir, "agent", "models.json"), JSON.stringify(models));
	// The status line the product reads: the `statusLine` key of the agent settings.json.
	const statusLine = {
		type: "command",
		command: "printf '[Fixture Model ◐ medium] ⏱️  1h 10m\\n[keep] Context test\\n'",
	};
	writeFileSync(
		join(dir, "agent", "settings.json"),
		JSON.stringify({ theme: "tokyo-night", tuiMode: "fullscreen", packages: [], quietStartup: true, statusLine }),
	);
	const S = `nyd-${process.pid}-${name}`;
	const sock = join(root, `${name}.sock`);
	sockets.push(sock);
	const clicks: string[] = [];
	const tmux = (args: string[], opts: object = {}) =>
		spawnSync("tmux", ["-S", sock, "-f", "/dev/null", ...args], {
			env: { PATH: process.env.PATH ?? "", HOME: join(dir, "home") },
			...opts,
		});
	const env = [
		`HOME=${join(dir, "home")}`,
		`NYCODE_CODING_AGENT_DIR=${join(dir, "agent")}`,
		"NYCODE_OFFLINE=1",
		`NYCODE_NATIVE_CFG='${JSON.stringify(cfg)}'`,
		`NYCODE_NATIVE_MARKER=${marker}`,
		`NYCODE_NATIVE_TRACE=${tracePath}`,
	].join(" ");
	const flags = `--no-extensions --no-context-files --no-skills --no-prompt-templates --no-session -e ${ENTRY} --model fake/m1`;
	tmux([
		"new-session",
		"-d",
		"-s",
		S,
		"-x",
		"120",
		"-y",
		String(rows),
		`cd ${join(dir, "work")} && env -i PATH=${process.env.PATH} TERM=xterm-256color LANG=C.UTF-8 ${env} ${process.execPath} ${CLI} ${flags}; sleep 20`,
	]);
	const pane = (ansi = false) =>
		tmux(["capture-pane", "-p", ...(ansi ? ["-e", "-N"] : []), "-t", S]).stdout.toString();
	const note = (what: string) => clicks.push(`${Date.now()} ${what}`);
	const s = {
		pane,
		marker,
		requests,
		rows,
		keys(...k: string[]) {
			note(`keys ${k.join(" ")}`);
			tmux(["send-keys", "-t", S, ...k]);
		},
		lit(t: string) {
			note(`literal ${JSON.stringify(t)}`);
			tmux(["send-keys", "-t", S, "-l", "--", t]);
		},
		click(y: number, x = 5) {
			note(`click press+release at row ${y}, column ${x}`);
			tmux(["send-keys", "-t", S, "-l", "--", `\x1b[<0;${x};${y}M`]);
			tmux(["send-keys", "-t", S, "-l", "--", `\x1b[<0;${x};${y}m`]);
		},
		wheelDown(y: number, x = 5) {
			note(`wheel down at row ${y}, column ${x}`);
			tmux(["send-keys", "-t", S, "-l", "--", `\x1b[<65;${x};${y}M`]);
		},
		/** What a failure prints: the test's own inputs, the raw input the app saw, and the pane. */
		trace: () =>
			`--- sent by the test\n${clicks.join("\n")}\n--- raw input seen by the app\n${existsSync(tracePath) ? readFileSync(tracePath, "utf8") : "(none)"}--- pane\n${pane()}`,
		async waitFor(what: string, ok: (t: string) => boolean, ms = 20000) {
			let t = "";
			for (let i = 0; i < ms / 100; i++) {
				t = pane();
				if (ok(t)) return t;
				await sleep(100);
			}
			throw new Error(`timeout waiting for ${what}\n${s.trace()}`);
		},
		/** 1-based pane row of the first line matching re. */
		row(re: RegExp) {
			const i = find(pane(), re);
			assert.ok(i >= 0, `no row ${re}\n${s.trace()}`);
			return i + 1;
		},
		async ready() {
			await s.waitFor("tab bar with Status", (t) => /^Status(?: {3}|$)/m.test(t) && /Fixture Model/.test(t), 40000);
			if (cfg.plan) await s.waitFor("Plan tab", (t) => /^Status.*Plan \d+\/20/m.test(t));
			if (cfg.agents) await s.waitFor("Agentes tab", (t) => /^Status.*Agentes \d+/m.test(t));
			await sleep(500);
		},
		async close() {
			tmux(["kill-server"]);
			await new Promise((r) => server.close(r));
			return requests.length;
		},
	};
	return s;
}

export type S = Awaited<ReturnType<typeof launch>>;

/** Runs a scenario; the fake provider must see zero requests (clicks and keys never reach a model). A failure carries the trace. */
export async function scenario(name: string, cfg: Cfg, fn: (s: S) => Promise<void>, rows = 40) {
	const s = await launch(name, cfg, rows);
	try {
		await s.ready();
		await fn(s);
	} catch (error) {
		if (error instanceof Error && !error.message.includes("--- sent by the test")) {
			error.message = `${error.message}\n${s.trace()}`;
		}
		throw error;
	} finally {
		const n = await s.close();
		assert.equal(n, 0, `fake provider received requests: ${s.requests.join(", ")}`);
	}
}
