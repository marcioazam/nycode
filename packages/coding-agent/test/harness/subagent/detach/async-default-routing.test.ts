// Async delegation by default in the root TUI, and the independence of detach and abort (core/modes.ts, fleet/detach.ts).
import assert from "node:assert/strict";
import { test } from "vitest";
import * as modes from "../../../../src/extensions/subagent/core/modes.ts";
import * as detach from "../../../../src/extensions/subagent/fleet/detach.ts";

const agents = [{ name: "plain" }, { name: "bg", background: true }] as never;
const want = (p: any, root: boolean) => modes.wantsBackground(p, agents, root);

test("raiz interativa: single, parallel e chain sem flag vão para background", () => {
	assert.equal(want({ agent: "plain", task: "t" }, true), true);
	assert.equal(want({ tasks: [{ agent: "plain", task: "t" }] }, true), true);
	assert.equal(want({ chain: [{ agent: "plain", task: "t" }] }, true), true);
});

test("background:false explícito mantém foreground (detachável) mesmo na raiz interativa", () => {
	assert.equal(want({ agent: "plain", task: "t", background: false }, true), false);
	assert.equal(want({ tasks: [{ agent: "plain", task: "t" }], background: false }, true), false);
});

test("aninhado ou headless (interactiveRoot=false): padrão segue foreground", () => {
	assert.equal(want({ agent: "plain", task: "t" }, false), false);
	assert.equal(modes.wantsBackground({ agent: "plain", task: "t" } as any, agents), false); // 3º arg ausente = false
});

test("inalterado: background:true e frontmatter background:true seguem background em qualquer contexto", () => {
	for (const root of [true, false]) {
		assert.equal(want({ agent: "plain", task: "t", background: true }, root), true);
		assert.equal(want({ agent: "bg", task: "t" }, root), true);
	}
});

test("abort do turno principal NÃO mata filho já detached (Ctrl+B/async)", async () => {
	const outer = new AbortController();
	let childAborted = false;
	let release!: () => void;
	const gate = new Promise<void>((r) => {
		release = r;
	});
	const racing = detach.raceDetach(outer.signal, async (signal: AbortSignal) => {
		signal.addEventListener("abort", () => {
			childAborted = true;
		});
		await gate;
		return "ok";
	});
	assert.equal(detach.detachAll(), 1);
	const r = await racing;
	assert.ok("detached" in r);
	outer.abort(); // send-now aborta o turno
	await new Promise((s) => setImmediate(s));
	assert.equal(childAborted, false);
	release();
	assert.equal(await r.detached, "ok");
});

test("abort do turno ANTES do detach cancela o filho em foreground e o tira do conjunto detachável", async () => {
	const outer = new AbortController();
	let childAborted = false;
	const racing = detach.raceDetach(
		outer.signal,
		(signal: AbortSignal) =>
			new Promise((_, rej) => {
				signal.addEventListener("abort", () => {
					childAborted = true;
					rej(new Error("aborted"));
				});
			}),
	);
	racing.catch(() => {});
	outer.abort();
	await assert.rejects(racing, /aborted/);
	assert.equal(childAborted, true);
	assert.equal(detach.detachAll(), 0); // nada para revividar
});

test("autoDetach=true: a chamada sai do foreground na hora e o filho segue; abort posterior não o mata", async () => {
	const outer = new AbortController();
	let childAborted = false;
	let release!: () => void;
	const gate = new Promise<void>((r) => {
		release = r;
	});
	const r = await detach.raceDetach(
		outer.signal,
		async (s: AbortSignal) => {
			s.addEventListener("abort", () => {
				childAborted = true;
			});
			await gate;
			return "ok";
		},
		true,
	);
	assert.ok("detached" in r);
	outer.abort();
	await new Promise((s) => setImmediate(s));
	assert.equal(childAborted, false);
	release();
	assert.equal(await r.detached, "ok");
});

test("autoDetach de uma chamada nunca move a irmã que espera explicitamente", async () => {
	let releaseWait!: () => void;
	const gate = new Promise<void>((r) => {
		releaseWait = r;
	});
	const waiting = detach.raceDetach(undefined, async () => {
		await gate;
		return "espera";
	});
	const auto = await detach.raceDetach(undefined, async () => "auto", true);
	assert.ok("detached" in auto || "done" in auto);
	let settled = false;
	void waiting.then(() => {
		settled = true;
	});
	await new Promise((s) => setImmediate(s));
	assert.equal(settled, false, "a irmã continua em foreground");
	releaseWait();
	assert.deepEqual(await waiting, { done: "espera" });
});

test("sinal já abortado: autoDetach não revive a chamada", async () => {
	const outer = new AbortController();
	outer.abort();
	let childAborted = false;
	const p = detach.raceDetach(
		outer.signal,
		(s: AbortSignal) =>
			new Promise((_, rej) => {
				if (s.aborted) {
					childAborted = true;
					rej(new Error("aborted"));
				}
				s.addEventListener("abort", () => {
					childAborted = true;
					rej(new Error("aborted"));
				});
			}),
		true,
	);
	await assert.rejects(p, /aborted/);
	assert.equal(childAborted, true);
	assert.equal(detach.detachAll(), 0);
});
