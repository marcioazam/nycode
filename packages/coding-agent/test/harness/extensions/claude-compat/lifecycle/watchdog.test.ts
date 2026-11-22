import assert from "node:assert/strict";
import { test } from "vitest";
import { registerWatchdog, startWatchdog } from "../../../../../src/extensions/claude-compat/lifecycle/watchdog.ts";

const base = { NYCODE_RESTART_WRAPPER_PID: "500", NYCODE_LIFECYCLE_ROOT_PID: "700" };
function mk(env: Record<string, string>, o: { pid?: number; ppid?: number } = {}) {
	const st = { ppid: o.ppid ?? 500, alive: true, shutdowns: 0, exits: [] as number[], killed: [] as number[] };
	const stop = startWatchdog(() => st.shutdowns++, {
		env,
		pid: o.pid ?? 700,
		ppid: () => st.ppid,
		alive: () => st.alive,
		exit: (c) => st.exits.push(c),
		intervalMs: 5,
		graceMs: 20,
	});
	return { st, stop };
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

test("morte do supervisor aborta o turno antes do shutdown, mesmo se abort lançar", async () => {
	for (const throws of [false, true]) {
		const handlers: Record<string, (...a: any[]) => unknown> = {};
		const calls: string[] = [];
		let parent = 500;
		let finish!: () => void;
		const finished = new Promise<void>((resolve) => {
			finish = resolve;
		});
		registerWatchdog(
			{
				on: (event: string, handler: (...a: any[]) => unknown) => {
					handlers[event] = handler;
				},
			} as any,
			{
				env: base,
				pid: 700,
				ppid: () => parent,
				alive: () => true,
				exit: () => {},
				intervalMs: 1,
			},
		);
		handlers.session_start!(
			{},
			{
				abort() {
					calls.push("abort");
					if (throws) throw new Error("fixture abort");
				},
				shutdown() {
					calls.push("shutdown");
					finish();
				},
			},
		);
		parent = 1;
		let deadline: ReturnType<typeof setTimeout> | undefined;
		try {
			await Promise.race([
				finished,
				new Promise<never>((_resolve, reject) => {
					deadline = setTimeout(() => reject(new Error("watchdog não reagiu")), 5000);
				}),
			]);
			assert.deepEqual(calls, ["abort", "shutdown"]);
		} finally {
			clearTimeout(deadline);
			handlers.session_shutdown!({});
		}
	}
});

test("não liga fora do processo raiz (subagente herda env mas tem outro PID) nem com pai diferente", () => {
	assert.equal(mk(base, { pid: 701 }).stop, undefined);
	assert.equal(mk(base, { ppid: 1 }).stop, undefined);
	assert.equal(mk({ NYCODE_RESTART_WRAPPER_PID: "500" }).stop, undefined);
	assert.equal(mk({ ...base, NYCODE_RESTART_WRAPPER_PID: "1", NYCODE_LIFECYCLE_ROOT_PID: "700" }).stop, undefined);
	assert.equal(mk({ NYCODE_RESTART_WRAPPER_PID: "x", NYCODE_LIFECYCLE_ROOT_PID: "700" }).stop, undefined);
});

test("wrapper vivo: nada acontece; reparentado: shutdown uma vez e backstop exit(1) depois da graça", async () => {
	const { st, stop } = mk(base);
	await sleep(30);
	assert.deepEqual([st.shutdowns, st.exits], [0, []]);
	st.ppid = 1; // SIGKILL no supervisor: o init adota o filho
	await sleep(10);
	assert.equal(st.shutdowns, 1);
	assert.deepEqual(st.exits, []);
	await sleep(60);
	assert.equal(st.shutdowns, 1);
	assert.deepEqual(st.exits, [1]);
	stop!();
});

test("wrapper morto sem reparentar (alive=false) também encerra; stop cancela", async () => {
	const a = mk(base);
	a.st.alive = false;
	await sleep(15);
	assert.equal(a.st.shutdowns, 1);
	const b = mk(base);
	b.stop!();
	b.st.ppid = 1;
	await sleep(20);
	assert.equal(b.st.shutdowns, 0);
});
