import assert from "node:assert/strict";
import { test } from "vitest";
import { detachAgents, stopAgents } from "../../../../src/extensions/claude-compat/fleet.ts";

test("stopAgents cancela apenas runs ativos do source da sessão, incluindo descendentes", () => {
	const stopped: string[] = [];
	const source = {
		list: () => [
			{ id: "a", state: "running" },
			{ id: "b", state: "done" },
			{ id: "child", state: "running" },
		],
		stop: (id: string) => {
			stopped.push(id);
			return "stopping";
		},
		detachForeground: () => 0,
	};
	assert.deepEqual(stopAgents(source), { stopped: 2, refused: 0 });
	assert.deepEqual(stopped, ["a", "child"]);
});

test("recusa e corrida de término não viram sucesso falso", () => {
	assert.deepEqual(
		stopAgents({
			list: () => [
				{ id: "a", state: "running" },
				{ id: "b", state: "running" },
			],
			stop: (id) => (id === "a" ? "refused" : "not-running"),
			detachForeground: () => 0,
		}),
		{ stopped: 0, refused: 1 },
	);
});

test("source ausente, formato inválido e quantidade não limitada falham antes de cancelar", () => {
	assert.throws(() => stopAgents(undefined), /indisponível/);
	let calls = 0;
	const source = {
		list: (): unknown[] => [{ id: "good", state: "running" }, null],
		stop: () => {
			calls++;
			return "stopping";
		},
		detachForeground: () => 0,
	};
	assert.throws(() => stopAgents(source), /formato/);
	assert.equal(calls, 0);
	assert.throws(
		() => stopAgents({ ...source, list: () => Array(1001).fill({ id: "a", state: "running" }) }),
		/limite/,
	);
	assert.equal(calls, 0);
});

test("falha explícita do stop propaga, sem alegar cancelamento; detach usa o source real", () => {
	const source = {
		list: () => [{ id: "a", state: "running" }],
		stop: () => {
			throw new Error("stop failed");
		},
		detachForeground: () => 3,
	};
	assert.throws(() => stopAgents(source), /stop failed/);
	assert.equal(detachAgents(source), 3);
	assert.throws(() => detachAgents(undefined), /indisponível/);
});

test("source usa o singleton do fleet no mesmo processo, sem importar uma segunda cópia do registry", () => {
	const key = Symbol.for("nycode.fleet.source");
	const old = Reflect.get(globalThis, key);
	try {
		Reflect.set(globalThis, key, { source: { list: () => [], stop: () => "unknown", detachForeground: () => 2 } });
		assert.deepEqual(stopAgents(), { stopped: 0, refused: 0 });
		assert.equal(detachAgents(), 2);
		Reflect.set(globalThis, key, { source: {} });
		assert.throws(() => stopAgents(), /indisponível/);
	} finally {
		if (old === undefined) Reflect.deleteProperty(globalThis, key);
		else Reflect.set(globalThis, key, old);
	}
});
