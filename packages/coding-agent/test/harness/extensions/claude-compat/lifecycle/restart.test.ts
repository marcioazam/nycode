import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "vitest";
import registerLifecycle from "../../../../../src/extensions/claude-compat/lifecycle/index.ts";
import { flagValueIndices, restartCommand } from "../../../../../src/extensions/claude-compat/lifecycle/restart.ts";

function fx(o: { idle?: boolean; pending?: boolean; session?: string | undefined | "make"; dirMode?: number } = {}) {
	const root = mkdtempSync(join(tmpdir(), "lc-restart-"));
	const dir = join(root, "priv");
	mkdirSync(dir, { mode: 0o700 });
	if (o.dirMode !== undefined) chmodSync(dir, o.dirMode);
	const sess = join(root, "sess.jsonl");
	writeFileSync(sess, "");
	const notes: string[] = [];
	const calls: string[] = [];
	const ctx: any = {
		ui: { notify: (m: string) => notes.push(m) },
		isIdle: () => o.idle ?? true,
		hasPendingMessages: () => o.pending ?? false,
		sessionManager: { getSessionFile: () => (o.session === "make" || !("session" in o) ? sess : o.session) },
		shutdown: () => calls.push("shutdown"),
	};
	const req = join(dir, "restart.json");
	const env: Record<string, string> = {
		NYCODE_RESTART_WRAPPER_PID: "4242",
		NYCODE_RESTART_REQUEST_FILE: req,
		NYCODE_PERMISSION_MODE: "default",
		NYCODE_BYPASS_ELIGIBLE: "0",
		NYCODE_BYPASS_OPTIN: "0",
	};
	return { ctx, notes, calls, env, req, sess, dir, deps: { env, ppid: 4242 } };
}

test("pedido válido: grava só o arquivo da sessão (0600), desliga uma vez, sem abort", async () => {
	const f = fx();
	assert.equal(await restartCommand(f.ctx, "", f.deps), "requested");
	assert.deepEqual(JSON.parse(readFileSync(f.req, "utf8")), {
		v: 2,
		sessionFile: f.sess,
		permission: { mode: "default", bypass: 0, eligible: 0, optin: 0 },
		argc: process.argv.length - 2,
		flagValues: [],
	});
	assert.equal(readFileSync(f.req, "utf8").split("\n").length, 2); // uma linha
	assert.deepEqual(f.calls, ["shutdown"]);
	assert.equal(readdirSync(f.dir).join(), "restart.json"); // sem temporário sobrando
});

const req = (f: ReturnType<typeof fx>) => JSON.parse(readFileSync(f.req, "utf8"));
for (const [mode, pbyp, elig, optin, wantMode, bypass] of [
	["acceptEdits", "0", "1", "0", "acceptEdits", 0],
	["default", "0", "1", "0", "default", 0],
	["default", "1", "1", "0", "default", 1],
	["acceptEdits", "1", "1", "1", "acceptEdits", 1],
	["default", "1", "0", "1", "default", 1],
	["bypassPermissions", "1", "1", "1", "default", 1],
	["bypassPermissions", "", "0", "1", "default", 1], // legado: modo bypassPermissions = default + bypass
] as const) {
	test(`permissão atual vai no pedido: ${mode} NYCODE_BYPASS_PERMISSIONS=${pbyp} eligible=${elig} optin=${optin}`, async () => {
		const f = fx();
		Object.assign(f.env, { NYCODE_PERMISSION_MODE: mode, NYCODE_BYPASS_ELIGIBLE: elig, NYCODE_BYPASS_OPTIN: optin });
		if (pbyp) f.env.NYCODE_BYPASS_PERMISSIONS = pbyp;
		assert.equal(await restartCommand(f.ctx, "", f.deps), "requested");
		assert.deepEqual(req(f).permission, { mode: wantMode, bypass, eligible: Number(elig), optin: Number(optin) });
	});
}

test("plan mode ativo: recusa (nunca reinicia como default), sem gravar", async () => {
	const f = fx();
	f.env.NYCODE_PERMISSION_MODE = "plan";
	assert.equal(await restartCommand(f.ctx, "", f.deps), "refused");
	assert.match(f.notes.join(), /plan mode/);
	assert.deepEqual(f.calls, []);
	assert.equal(readdirSync(f.dir).length, 0);
});

for (const [name, patch] of [
	["modo inválido", { NYCODE_PERMISSION_MODE: "dontAsk" }],
	["sem modo", { NYCODE_PERMISSION_MODE: "" }],
	["sem elegibilidade", { NYCODE_BYPASS_ELIGIBLE: undefined }],
	["bypass sem elegibilidade nem opt-in", { NYCODE_PERMISSION_MODE: "bypassPermissions" }],
	["bypass ligado sem elegibilidade nem opt-in", { NYCODE_BYPASS_PERMISSIONS: "1" }],
] as const) {
	test(`estado de permissão malformado recusa: ${name}`, async () => {
		const f = fx();
		Object.assign(f.env, patch);
		assert.equal(await restartCommand(f.ctx, "", f.deps), "refused");
		assert.deepEqual(f.calls, []);
		assert.equal(readdirSync(f.dir).length, 0);
	});
}

test("flags de extensão: valor string preservado por índice; booleana sem valor; = ignorado", async () => {
	const gf = (n: string) => (({ ext: "v", bool: true, eq: "x" }) as Record<string, string | boolean>)[n];
	const argv = ["--no-approve", "--ext", "val", "--bool", "prompt", "--eq=1", "--model", "m"];
	assert.deepEqual(flagValueIndices(argv, gf), [2]);
	assert.deepEqual(flagValueIndices(["--ext", "a", "--", "--ext", "b"], gf), [1]); // para em --
	assert.equal(typeof flagValueIndices(["--ext"], gf), "string"); // string registrada sem valor: aborta
	assert.equal(typeof flagValueIndices(["--ext", "@f.md"], gf), "string");
	const f = fx();
	assert.equal(await restartCommand(f.ctx, "", { ...f.deps, argv, getFlag: gf }), "requested");
	assert.deepEqual([req(f).argc, req(f).flagValues], [argv.length, [2]]);
	const g = fx();
	assert.equal(await restartCommand(g.ctx, "", { ...g.deps, argv: ["--ext"], getFlag: gf }), "refused");
	assert.deepEqual([g.calls, readdirSync(g.dir).length], [[], 0]);
});

for (const [name, o, deps, re] of [
	["sem wrapper novo", {}, { env: {}, ppid: 1 }, /wrapper `nycode` novo/],
	[
		"PID inválido",
		{},
		{ env: { NYCODE_RESTART_WRAPPER_PID: "x", NYCODE_RESTART_REQUEST_FILE: "/x/y" }, ppid: 1 },
		/wrapper `nycode` novo/,
	],
	["ppid diferente (subagente com variável herdada)", {}, { ppid: 9 }, /não é filho/],
	["agente ocupado", { idle: false }, {}, /ocupado/],
	["mensagens pendentes", { pending: true }, {}, /ocupado/],
	["sem arquivo de sessão", { session: undefined }, {}, /Sem arquivo de sessão/],
	["sessão inexistente", { session: "/nao/existe.jsonl" }, {}, /Sem arquivo de sessão/],
	["caminho com aspas", { session: '/tmp/a"b.jsonl' }, {}, /Sem arquivo de sessão/],
	["diretório do pedido acessível a outros", { dirMode: 0o755 }, {}, /não é privado/],
	["dono diferente", {}, { uid: 123456 }, /não é privado/],
] as const) {
	test(`recusa: ${name}`, async () => {
		const f = fx(o as any);
		assert.equal(await restartCommand(f.ctx, "", { ...f.deps, ...(deps as object) }), "refused");
		assert.match(f.notes.join("\n"), re);
		assert.deepEqual(f.calls, []); // nunca desliga
		assert.equal(readdirSync(f.dir).length, 0); // nunca grava
	});
}

test("argumentos recusados; falha de rename recusa sem desligar", async () => {
	const f = fx();
	assert.equal(await restartCommand(f.ctx, "now", f.deps), "refused");
	assert.equal(
		await restartCommand(f.ctx, "", {
			...f.deps,
			rename: () => {
				throw new Error("boom");
			},
		}),
		"refused",
	);
	assert.match(f.notes.at(-1)!, /boom/);
	assert.deepEqual(f.calls, []);
});

test("registra restart e update com o mesmo handler", async () => {
	const reg: Record<string, any> = {};
	registerLifecycle({
		registerCommand: (n: string, o: unknown) => {
			reg[n] = o;
		},
		on: () => () => {},
		getFlag: () => undefined,
	} as any);
	assert.deepEqual(Object.keys(reg).sort(), ["restart", "terminal-setup", "update"]);
	const f = fx();
	const prev = { ...process.env };
	Object.assign(process.env, {
		NYCODE_RESTART_WRAPPER_PID: String(process.ppid),
		NYCODE_RESTART_REQUEST_FILE: f.req,
		NYCODE_PERMISSION_MODE: "default",
		NYCODE_BYPASS_ELIGIBLE: "0",
		NYCODE_BYPASS_PERMISSIONS: "0",
	});
	try {
		await reg.update.handler("", f.ctx);
		assert.deepEqual(f.calls, ["shutdown"]);
	} finally {
		for (const k of [
			"NYCODE_RESTART_WRAPPER_PID",
			"NYCODE_RESTART_REQUEST_FILE",
			"NYCODE_PERMISSION_MODE",
			"NYCODE_BYPASS_ELIGIBLE",
			"NYCODE_BYPASS_PERMISSIONS",
		])
			if (prev[k] === undefined) delete process.env[k];
			else process.env[k] = prev[k];
	}
});
