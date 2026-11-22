// Bounded admission of the auto-detached batches (fleet/detach.ts): MAX_AUTO_DETACHED_BATCHES, reserveAutoBatchSlot,
// activeAutoBatchSlots. raceDetach does not enforce the cap by itself: admission belongs to whoever reserves.
import assert from "node:assert/strict";
import { afterEach, test } from "vitest";
import * as d from "../../../../src/extensions/subagent/fleet/detach.ts";

const held: Array<() => void> = [];
const take = (active = 0) => {
	const r = d.reserveAutoBatchSlot(active);
	if (r) held.push(r);
	return r;
};
afterEach(() => {
	for (const r of held.splice(0)) r();
	assert.equal(d.activeAutoBatchSlots(), 0, "cada teste devolve todos os slots");
});

test("o teto é 8", () => assert.equal(d.MAX_AUTO_DETACHED_BATCHES, 8));

test("8 reservas passam, a 9ª é recusada de forma síncrona e não deixa slot preso", () => {
	for (let i = 0; i < 8; i++) assert.equal(typeof take(), "function", `reserva ${i + 1}`);
	assert.equal(d.activeAutoBatchSlots(), 8);
	assert.equal(take(), undefined);
	assert.equal(d.activeAutoBatchSlots(), 8, "a recusa não consome slot");
});

test("release libera exatamente um slot e é idempotente (duas chamadas não liberam dois)", () => {
	const rs = Array.from({ length: 8 }, () => take()!);
	rs[0]();
	rs[0]();
	assert.equal(d.activeAutoBatchSlots(), 7);
	assert.equal(typeof take(), "function");
	assert.equal(take(), undefined, "só uma vaga reaberta, não duas");
});

test("o total é compartilhado com singles em background: slots + activeBackground >= 8 recusa", () => {
	assert.equal(take(8), undefined, "singles já ocupam tudo");
	assert.equal(d.activeAutoBatchSlots(), 0);
	for (let i = 0; i < 5; i++) assert.equal(typeof take(3), "function");
	assert.equal(take(3), undefined, "5 lotes + 3 singles = 8");
	assert.equal(typeof take(0), "function", "sem singles ativos ainda cabe mais um lote (6º slot de 8)");
});

test("o estado vive em símbolo global: outra cópia/import do módulo enxerga os mesmos slots (reload não zera)", async () => {
	take();
	const again = "../../../../src/extensions/subagent/fleet/detach.ts?again=1";
	const other = await import(again);
	assert.equal(other.activeAutoBatchSlots(), 1);
});

test("raceDetach com autoDetach não impõe teto sozinho: a admissão é de quem reserva", async () => {
	const gates: Array<() => void> = [];
	const calls: Array<Promise<unknown>> = [];
	for (let i = 0; i < 9; i++) {
		calls.push(d.raceDetach(undefined, () => new Promise<string>((r) => gates.push(() => r("ok"))), true));
	}
	const out = await Promise.all(calls);
	assert.equal(out.filter((o: any) => "detached" in o).length, 9);
	for (const g of gates) g();
	await Promise.all(out.map((o: any) => o.detached));
});
