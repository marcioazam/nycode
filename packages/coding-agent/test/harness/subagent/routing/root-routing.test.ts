// Real routing of subagent.execute (extensions/subagent/index.ts) in the root TUI with a fake nycode and a fake child:
// async by default, background:false as the manual bypass, the shared cap of 8 detached batches and singles.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "vitest";
import * as bgMod from "../../../../src/extensions/subagent/fleet/background.ts";
import * as detachMod from "../../../../src/extensions/subagent/fleet/detach.ts";
import * as store from "../../../../src/extensions/subagent/fleet/store.ts";
import subagentExtension from "../../../../src/extensions/subagent/index.ts";
import { fleetTestEnv } from "../fleet-env.ts";

const { tmp } = fleetTestEnv("interactive-routing-");
const home = join(tmp, "home");
const agentDir = join(home, ".nycode", "agent");
mkdirSync(join(agentDir, "agents"), { recursive: true });
writeFileSync(join(agentDir, "agents", "fake.md"), "---\nname: fake\ndescription: agente falso\n---\nFalso.\n");
process.env.HOME = home;
process.env.NYCODE_CODING_AGENT_DIR = agentDir;
for (const k of ["NYCODE_SUBAGENT", "NYCODE_SUBAGENT_DEPTH"]) delete process.env[k];

const fakeNycode = join(tmp, "fake-nycode.mjs");
writeFileSync(
	fakeNycode,
	`import { existsSync } from 'node:fs'
import { join } from 'node:path'
const task = (process.argv.at(-1).match(/Task: ([\\s\\S]*)$/) ?? [])[1] ?? ''
const gate = join(process.env.FAKE_NYCODE_DIR, 'release-' + encodeURIComponent(task))
const timer = setInterval(() => {
  if (!existsSync(gate)) return
  clearInterval(timer)
  process.stdout.write(JSON.stringify({ type: 'message_end', message: { role: 'assistant', content: [{ type: 'text', text: 'feito:' + task }], stopReason: 'stop' } }) + '\\n')
  process.exit(0)
}, 20)
`,
);
process.env.FAKE_NYCODE_DIR = tmp;
const release = (t: string) => writeFileSync(join(tmp, `release-${encodeURIComponent(t)}`), ""); // o rótulo pode ter '/'

async function waitFor<T>(what: string, probe: () => T | undefined | false): Promise<T> {
	const end = Date.now() + 5000;
	for (;;) {
		const v = probe();
		if (v) return v;
		if (Date.now() > end) assert.fail(`timeout waiting for ${what}`);
		await new Promise((r) => setTimeout(r, 30));
	}
}

function boot(ctxExtra: Record<string, unknown>) {
	const handlers = new Map<string, Array<(...a: any[]) => any>>();
	const tools: any[] = [];
	const sent: Array<{ content: string; customType: string }> = [];
	const nycode = {
		on: (e: string, h: (...a: any[]) => any) => void handlers.set(e, [...(handlers.get(e) ?? []), h]),
		registerTool: (d: any) => void tools.push(d),
		registerCommand: () => {},
		events: { emit: () => {}, on: () => () => {} },
		getActiveTools: () => ["subagent"],
		sendMessage: (m: any) => void sent.push(m),
		sendUserMessage: () => {},
	};
	const ctx = {
		cwd: tmp,
		hasUI: true,
		ui: {
			setWidget: () => {},
			onTerminalInput: () => () => {},
			getEditorText: () => "",
			notify: () => {},
			custom: async () => undefined,
		},
		sessionManager: { getBranch: () => [{ type: "message" }] },
		modelRegistry: { getAvailable: () => [] },
		...ctxExtra,
	};
	const saved = process.argv[1];
	process.argv[1] = fakeNycode;
	subagentExtension(nycode as never);
	const fire = async (e: string, p: unknown = {}) => {
		for (const h of handlers.get(e) ?? []) await h(p, ctx);
	};
	const tool = tools.find((t) => t.name === "subagent");
	const run = (params: object, signal?: AbortSignal): Promise<any> =>
		tool.execute("c", params, signal, undefined, ctx);
	const gone = (pid: number) => {
		try {
			process.kill(pid, 0);
			return false;
		} catch (e) {
			return (e as NodeJS.ErrnoException).code === "ESRCH";
		}
	};
	// Mata só os grupos dos filhos DESTE teste e espera (condição observável, prazo limitado) os filhos saírem e os slots de lote voltarem a 0,
	// antes de apagar a frota: senão o teste seguinte herda slots presos e vê a recusa do teto.
	const finish = async () => {
		const pids: number[] = [];
		let leak = "";
		try {
			await fire("session_shutdown", { reason: "reload" });
		} finally {
			const dir = store.currentFleetDir();
			for (const r of dir ? store.readRecords(dir) : [])
				if (r.pid && r.state === "running") {
					pids.push(r.pid as number);
					// Parada intencional, não crash: sem o marcador nativo o respawn mantém o job/slot vivo.
					store.requestStop(dir as string, r.id, "agent");
					try {
						process.kill(-r.pid, "SIGKILL");
					} catch {
						/* saiu */
					}
				}
			const end = Date.now() + 8000;
			const settled = () =>
				pids.every(gone) && detachMod.activeAutoBatchSlots() === 0 && bgMod.activeBackgroundRuns() === 0;
			while (Date.now() < end && !settled()) await new Promise((r) => setTimeout(r, 25));
			if (!settled())
				leak = `cleanup: filhos vivos=${pids.filter((x) => !gone(x))} slots=${detachMod.activeAutoBatchSlots()} singles=${bgMod.activeBackgroundRuns()}`;
			store.removeFleetDir();
			bgMod.resetBackgroundRuns();
			process.argv[1] = saved;
			delete process.env.NYCODE_SUBAGENT_DEPTH;
		}
		assert.equal(leak, "", leak);
	};
	const text = (r: any): string => r.content[0].text;
	const delivered = (needle: string) => () => sent.find((s) => s.content.includes(needle));
	return {
		fire,
		run,
		finish,
		text,
		sent,
		delivered,
		records: () => (store.currentFleetDir() ? store.readRecords(store.currentFleetDir() as string) : []) as any[],
	};
}

const batches: Array<[string, (t: string) => object]> = [
	["parallel", (t) => ({ tasks: [{ agent: "fake", task: t }] })],
	["chain", (t) => ({ chain: [{ agent: "fake", task: t }] })],
];

for (const [name, mk] of batches) {
	test(`TUI raiz: ${name} sem flag volta na hora (reconhecimento) e a conclusão chega depois como mensagem`, async () => {
		const h = boot({ mode: "tui" });
		try {
			await h.fire("session_start");
			const res = await h.run(mk(`a-${name}`)); // sem release: só resolve se desanexar
			assert.ok(!h.text(res).includes(`feito:a-${name}`));
			assert.equal(h.sent.length, 0);
			release(`a-${name}`);
			const msg = await waitFor("completion", h.delivered(`feito:a-${name}`));
			assert.match(msg.content, /started in the background/);
			assert.equal(msg.customType, "subagent-background");
		} finally {
			await h.finish();
		}
	});

	test(`TUI raiz: ${name} com background:false espera o resultado em foreground`, async () => {
		const h = boot({ mode: "tui" });
		try {
			await h.fire("session_start");
			let settled = false;
			const p = h.run({ ...mk(`w-${name}`), background: false }).then((r) => {
				settled = true;
				return r;
			});
			await waitFor("child running", () => h.records().find((r) => r.state === "running" && r.pid));
			assert.equal(settled, false);
			release(`w-${name}`);
			const res = await p;
			assert.ok(h.text(res).includes(`feito:w-${name}`));
			assert.equal(h.sent.length, 0);
		} finally {
			await h.finish();
		}
	});

	for (const [label, extra, depth] of [
		["RPC (hasUI true)", { mode: "rpc" }, undefined],
		["print/headless", { mode: "print", hasUI: false }, undefined],
		["aninhado (depth 1)", { mode: "tui" }, "1"],
	] as const) {
		test(`${label}: ${name} sem flag continua em foreground`, async () => {
			if (depth) process.env.NYCODE_SUBAGENT_DEPTH = depth;
			const h = boot(extra);
			try {
				await h.fire("session_start");
				release(`f-${name}-${label}`);
				const res = await h.run(mk(`f-${name}-${label}`));
				assert.ok(h.text(res).includes(`feito:f-${name}-${label}`), h.text(res));
				assert.equal(h.sent.length, 0);
			} finally {
				await h.finish();
			}
		});
	}
}

test("TUI raiz: single sem flag vai para o registro de background (id de run), com ou sem release", async () => {
	const h = boot({ mode: "tui" });
	try {
		await h.fire("session_start");
		const res = await h.run({ agent: "fake", task: "s1" });
		assert.ok(!h.text(res).includes("feito:s1"));
		await waitFor("bg record", () => h.records().find((r) => r.background));
		release("s1");
		await waitFor("completion", h.delivered("feito:s1"));
	} finally {
		await h.finish();
	}
});

test("TUI raiz: single com background:false continua foreground detachável", async () => {
	const h = boot({ mode: "tui" });
	try {
		await h.fire("session_start");
		release("s2");
		const res = await h.run({ agent: "fake", task: "s2", background: false });
		assert.ok(h.text(res).includes("feito:s2"));
	} finally {
		await h.finish();
	}
});

test("duas chamadas: o auto-detach de um lote não move a irmã com background:false", async () => {
	const h = boot({ mode: "tui" });
	try {
		await h.fire("session_start");
		let waitingSettled = false;
		const waiting = h.run({ tasks: [{ agent: "fake", task: "sib-wait" }], background: false }).then((r) => {
			waitingSettled = true;
			return r;
		});
		await waitFor("waiting child", () => h.records().find((r) => r.state === "running" && r.pid));
		const auto = await h.run({ tasks: [{ agent: "fake", task: "sib-auto" }] });
		assert.ok(!h.text(auto).includes("feito:"));
		assert.equal(waitingSettled, false);
		release("sib-wait");
		assert.ok(h.text(await waiting).includes("feito:sib-wait"));
		release("sib-auto");
		await waitFor("auto completion", h.delivered("feito:sib-auto"));
	} finally {
		await h.finish();
	}
});

test("abort do turno depois do auto-detach não mata o filho: a conclusão ainda chega", async () => {
	const h = boot({ mode: "tui" });
	try {
		await h.fire("session_start");
		const ctl = new AbortController();
		await h.run({ tasks: [{ agent: "fake", task: "surv" }] }, ctl.signal);
		const rec = await waitFor("child", () => h.records().find((r) => r.state === "running" && r.pid));
		ctl.abort();
		await new Promise((r) => setTimeout(r, 100));
		assert.doesNotThrow(() => process.kill(rec.pid, 0), "filho segue vivo");
		release("surv");
		await waitFor("completion", h.delivered("feito:surv"));
	} finally {
		await h.finish();
	}
});

test("sinal já abortado: lote em TUI raiz não é revivido como background", async () => {
	const h = boot({ mode: "tui" });
	try {
		await h.fire("session_start");
		const ctl = new AbortController();
		ctl.abort();
		release("dead");
		await h.run({ tasks: [{ agent: "fake", task: "dead" }] }, ctl.signal).catch(() => {});
		await new Promise((r) => setTimeout(r, 200));
		assert.equal(
			h.sent.some((s) => /started in the background/.test(s.content)),
			false,
		);
	} finally {
		await h.finish();
	}
});

// ---- Teto compartilhado de lotes auto-desanexados + singles em background (MAX_AUTO_DETACHED_BATCHES = 8) ----
const REFUSED = /too many|max|limit|capacity/i;
const running = (h: ReturnType<typeof boot>) => h.records().filter((r) => r.state === "running" && r.pid);
const batch = (t: string) => ({ tasks: [{ agent: "fake", task: t }] });

async function fillBatches(h: ReturnType<typeof boot>, n: number, prefix: string) {
	for (let i = 0; i < n; i++) {
		const res = await h.run(batch(`${prefix}${i}`));
		assert.ok(!REFUSED.test(h.text(res)), `lote ${i + 1} admitido: ${h.text(res)}`);
	}
	const expected = new Set(Array.from({ length: n }, (_, i) => `${prefix}${i}`));
	await waitFor(`${n} batch children`, () => running(h).filter((r) => expected.has(r.task)).length === n);
}
const releaseAll = (prefix: string, n: number) => {
	for (let i = 0; i < n; i++) release(`${prefix}${i}`);
};

test("teto: 8 lotes admitidos; o 9º é recusado com texto claro e SEM iniciar filho", async () => {
	const h = boot({ mode: "tui" });
	try {
		await h.fire("session_start");
		await fillBatches(h, 8, "capA");
		const ninth = await h.run(batch("capA-nono"));
		assert.match(h.text(ninth), REFUSED);
		await new Promise((r) => setTimeout(r, 200));
		assert.equal(running(h).length, 8, "nenhum filho novo");
	} finally {
		releaseAll("capA", 8);
		await h.finish();
	}
});

test("teto: a conclusão real (não o ack imediato) libera o slot; ack imediato não libera", async () => {
	const h = boot({ mode: "tui" });
	try {
		await h.fire("session_start");
		await fillBatches(h, 8, "capB");
		release("capB0");
		await waitFor("completion of capB0", h.delivered("feito:capB0"));
		const res = await h.run(batch("capB-novo"));
		assert.ok(!REFUSED.test(h.text(res)), h.text(res));
		release("capB-novo");
	} finally {
		releaseAll("capB", 8);
		await h.finish();
	}
});

test("teto: abort do turno com 8 lotes desanexados não libera os slots (os filhos seguem rodando)", async () => {
	const h = boot({ mode: "tui" });
	try {
		await h.fire("session_start");
		const ctl = new AbortController();
		for (let i = 0; i < 8; i++) await h.run(batch(`capC${i}`), ctl.signal);
		await waitFor("8 children", () => running(h).length === 8);
		ctl.abort();
		await new Promise((r) => setTimeout(r, 150));
		assert.equal(running(h).length, 8);
		assert.match(h.text(await h.run(batch("capC-nono"))), REFUSED);
	} finally {
		releaseAll("capC", 8);
		await h.finish();
	}
});

test("teto compartilhado: singles em background contam para os lotes e os lotes para os singles", async () => {
	const h = boot({ mode: "tui" });
	try {
		await h.fire("session_start");
		await h.run({ agent: "fake", task: "capD-s0" });
		await h.run({ agent: "fake", task: "capD-s1" });
		await fillBatches(h, 6, "capD"); // 2 singles + 6 lotes = 8
		assert.match(h.text(await h.run(batch("capD-x"))), REFUSED, "lote recusado: singles ocupam vagas");
		assert.match(
			h.text(await h.run({ agent: "fake", task: "capD-s2" })),
			REFUSED,
			"single recusado: lotes ocupam vagas",
		);
		await waitFor("2 singles + 6 batches running", () => running(h).length === 8);
		assert.equal(running(h).length, 8);
	} finally {
		releaseAll("capD", 6);
		release("capD-s0");
		release("capD-s1");
		await h.finish();
	}
});

test("teto: background:false é o desvio manual e segue em foreground mesmo com os 8 slots ocupados", async () => {
	const h = boot({ mode: "tui" });
	try {
		await h.fire("session_start");
		await fillBatches(h, 8, "capE");
		release("capE-fg");
		const res = await h.run({ ...batch("capE-fg"), background: false });
		assert.ok(h.text(res).includes("feito:capE-fg"), h.text(res));
	} finally {
		releaseAll("capE", 8);
		await h.finish();
	}
});

test("teto: lote recusado/abortado antes de iniciar não deixa slot preso", async () => {
	const h = boot({ mode: "tui" });
	try {
		await h.fire("session_start");
		const dead = new AbortController();
		dead.abort();
		for (let i = 0; i < 3; i++) await h.run(batch(`capF-dead${i}`), dead.signal).catch(() => {});
		await fillBatches(h, 8, "capF"); // se os abortados vazassem slot, o 6º+ seria recusado
	} finally {
		releaseAll("capF", 8);
		for (let i = 0; i < 3; i++) release(`capF-dead${i}`);
		await h.finish();
	}
});
