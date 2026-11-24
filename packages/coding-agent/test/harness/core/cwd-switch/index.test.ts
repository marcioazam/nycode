// K23: /cd transition, header transaction and the cwd-aware session finders (core/cwd-switch).
import assert from "node:assert/strict";
import {
	appendFileSync,
	chmodSync,
	closeSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	openSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	symlinkSync,
	truncateSync,
	utimesSync,
	writeFileSync,
	writeSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, test, vi } from "vitest";
import {
	installCwdFinders,
	MAX_FINDER_FILES,
	scanForCwd,
	scanLimits,
} from "../../../../src/core/cwd-switch/finders.ts";
import {
	bakTail,
	MAX_SESSION_BYTES,
	readFully,
	setCwdTransaction as realSetCwd,
} from "../../../../src/core/cwd-switch/transaction.ts";
import { hooks, MARK, sessionCwdTransition as realTransition } from "../../../../src/core/cwd-switch/transition.ts";
import { SessionManager as RealSessionManager } from "../../../../src/core/session-manager.ts";
import { InteractiveMode } from "../../../../src/modes/interactive/interactive-mode.ts";

const trust = vi.hoisted(() => ({
	needs: (_cwd: string): boolean => false,
	saved: (_cwd: string): boolean | null => null,
}));
vi.mock("../../../../src/core/trust-manager.ts", () => ({
	hasTrustRequiringProjectResources: (cwd: string) => trust.needs(cwd),
	ProjectTrustStore: class {
		get(cwd: string) {
			return trust.saved(cwd);
		}
	},
}));

// The tests drive private shapes of the session manager structurally.
const SessionManager: any = RealSessionManager;
const setCwdTransaction = (mgr: any, cwd: string): any => realSetCwd(mgr, cwd);
const sessionCwdTransition = (h: any, f: string, o: any): Promise<any> => realTransition(h, f, o);
const roots: string[] = [];
afterAll(() => {
	for (const r of roots) rmSync(r, { recursive: true, force: true });
});

const assistant = (t: any) => ({
	role: "assistant",
	content: [{ type: "text", text: t }],
	api: "x",
	provider: "x",
	model: "x",
	usage: {
		input: 0,
		output: 0,
		cacheRead: 0,
		cacheWrite: 0,
		totalTokens: 0,
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
	},
	stopReason: "stop",
	timestamp: Date.now(),
});
function fx({ flushed = true } = {}) {
	const root = mkdtempSync(join(tmpdir(), "session-cwd-"));
	roots.push(root);
	const a = join(root, "proj-ã é");
	const b = join(root, "novo dir");
	mkdirSync(a);
	mkdirSync(b);
	const dir = join(root, "sessions");
	mkdirSync(dir);
	const sm = SessionManager.create(a, dir);
	if (flushed) {
		sm.appendMessage({ role: "user", content: "oi", timestamp: 1 });
		sm.appendMessage(assistant("olá"));
	}
	return { root, a, b, dir, sm, file: sm.getSessionFile() };
}
const utimes = (f: any, sec: any) => utimesSync(f, sec, sec);
const lines = (f: any) => readFileSync(f, "utf8").split("\n");
const stray = (dir: any) => readdirSync(dir).filter((n) => !n.endsWith(".jsonl"));

test("marca de presença publicada", () => assert.ok((globalThis as any)[MARK]?.version === 1));

test("sucesso: mesmo id, entradas intactas, cabeçalho novo, open/list/modo, sem sobras", async () => {
	const f = fx();
	chmodSync(f.file, 0o640);
	const before = lines(f.file);
	const id = f.sm.getSessionId();
	const tx = setCwdTransaction(f.sm, f.b);
	tx.finish();
	const after_ = lines(f.file);
	assert.deepEqual(after_.slice(1), before.slice(1));
	assert.equal(JSON.parse(after_[0]).cwd, f.b);
	assert.equal(JSON.parse(after_[0]).id, id);
	assert.equal(f.sm.getCwd(), f.b);
	assert.equal(SessionManager.open(f.file).getCwd(), f.b);
	assert.equal(SessionManager.open(f.file).getSessionId(), id);
	assert.equal(statSync(f.file).mode & 0o777, 0o640);
	assert.deepEqual(stray(f.dir), []);
	assert.deepEqual(
		(await SessionManager.list(f.b, f.dir)).map((s: any) => s.id),
		[id],
	);
	assert.deepEqual(await SessionManager.list(f.a, f.dir), []);
	// o fork nativo parte do cabeçalho novo; o arquivo não mudou de pasta
	assert.equal(SessionManager.forkFrom(f.file, f.a, f.dir).getCwd(), f.a);
	assert.ok(f.file.startsWith(f.dir));
});

test("undo devolve os bytes originais; novo append depois do /cd vai ao arquivo", () => {
	const f = fx();
	const orig = readFileSync(f.file);
	const tx = setCwdTransaction(f.sm, f.b);
	f.sm.appendMessage({ role: "user", content: "depois", timestamp: 2 });
	assert.match(readFileSync(f.file, "utf8"), /depois/);
	tx.undo();
	assert.match(readFileSync(f.file, "utf8"), /depois/); // nada perdido no undo
	assert.equal(JSON.parse(lines(f.file)[0]).cwd, f.a);
	assert.equal(f.sm.getCwd(), f.a);
	assert.ok(readFileSync(f.file).subarray(0, orig.length).equals(orig));
	assert.deepEqual(stray(f.dir), []);
});

test("acréscimo concorrente no inode antigo é reanexado (nada perdido)", () => {
	const f = fx();
	const fd = openSync(f.file, "a"); // outro processo com o arquivo já aberto
	const tx = setCwdTransaction(f.sm, f.b);
	writeSync(
		fd,
		`${JSON.stringify({ type: "custom", customType: "x", id: "zzzz", parentId: null, timestamp: "t", data: 1 })}\n`,
	);
	closeSync(fd);
	tx.finish();
	assert.match(readFileSync(f.file, "utf8"), /"id":"zzzz"/);
	assert.equal(JSON.parse(lines(f.file)[0]).cwd, f.b);
	assert.deepEqual(stray(f.dir), []);
});

test("acréscimo de outro processo ANTES do /cd sobrevive (a transação lê o disco, não a memória)", () => {
	const f = fx();
	appendFileSync(
		f.file,
		`${JSON.stringify({ type: "custom", customType: "x", id: "yyyy", parentId: null, timestamp: "t", data: 1 })}\n`,
	);
	setCwdTransaction(f.sm, f.b).finish();
	assert.match(readFileSync(f.file, "utf8"), /"id":"yyyy"/);
});

for (const [name, mutate, re] of [
	[
		"cabeçalho corrompido",
		(f: any) => writeFileSync(f.file, `{not json\n${lines(f.file).slice(1).join("\n")}`),
		/não é JSON/,
	],
	[
		"1ª linha não é cabeçalho",
		(f: any) => writeFileSync(f.file, `${lines(f.file).slice(1).join("\n")}`),
		/não é um cabeçalho/,
	],
	[
		"id divergente",
		(f: any) => writeFileSync(f.file, readFileSync(f.file, "utf8").replace(f.sm.getSessionId(), "outro-id")),
		/difere da sessão aberta/,
	],
] as [string, (f: any) => void, RegExp][]) {
	test(`aborta sem gravar: ${name}`, () => {
		const f = fx();
		mutate(f);
		const snap = readFileSync(f.file);
		assert.throws(() => setCwdTransaction(f.sm, f.b), re);
		assert.ok(readFileSync(f.file).equals(snap));
		assert.equal(f.sm.getCwd(), f.a);
		assert.deepEqual(stray(f.dir), []);
	});
}

test("cwd inválido (relativo, controle) é recusado", () => {
	const f = fx();
	assert.throws(() => setCwdTransaction(f.sm, "rel/dir"), /absoluto/);
	assert.throws(() => setCwdTransaction(f.sm, `${f.b}\nx`), /absoluto/);
	assert.equal(f.sm.getCwd(), f.a);
});

test("sessão ainda sem arquivo: materializa com o novo cwd, undo remove, colisão recusa", () => {
	const f = fx({ flushed: false });
	assert.ok(!existsSync(f.file));
	const tx = setCwdTransaction(f.sm, f.b);
	assert.equal(JSON.parse(lines(f.file)[0]).cwd, f.b);
	assert.equal(SessionManager.open(f.file).getSessionId(), f.sm.getSessionId());
	tx.undo();
	assert.ok(!existsSync(f.file));
	assert.equal(f.sm.getCwd(), f.a);
	writeFileSync(f.file, "ocupado\n");
	assert.throws(() => setCwdTransaction(f.sm, f.b), /não é JSON/);
	assert.equal(readFileSync(f.file, "utf8"), "ocupado\n");
});

test("sessão em memória: só memória", () => {
	const sm = SessionManager.inMemory("/tmp");
	const tx = setCwdTransaction(sm, "/var");
	assert.equal(sm.getCwd(), "/var");
	tx.undo();
	assert.equal(sm.getCwd(), "/tmp");
});

function host(f: any, switchImpl: any, extra = {}) {
	const calls: any[] = [];
	const h = {
		sessionManager: f.sm,
		clearStatusIndicator() {},
		createProjectTrustContext: (c: any) => ({ cwd: c }),
		handleFatalRuntimeError: async (p: any, e: any) => {
			calls.push(["fatal", p, e.message]);
			return { cancelled: true, fatal: true };
		},
		runtimeHost: {
			cwd: f.b,
			services: { agentDir: f.root, settingsManager: { projectTrusted: true } },
			switchSession: async (p: any, o: any) => {
				calls.push(["switch", SessionManager.open(p).getCwd(), typeof o.projectTrustContextFactory]);
				return switchImpl(calls.length, p);
			},
		},
		...extra,
	};
	return { h, calls };
}

test("transição ok: runtime religado já com o cabeçalho novo, mesmo arquivo, sem cwdOverride", async () => {
	const f = fx();
	const { h, calls } = host(f, async () => ({ cancelled: false }));
	const r = await sessionCwdTransition(h, f.file, { piSessionCwd: { cwd: f.b } });
	assert.deepEqual(r, { cancelled: false, piSessionCwd: { ok: true, cwd: f.b, trusted: true } });
	assert.deepEqual(calls, [["switch", f.b, "function"]]);
	assert.deepEqual(stray(f.dir), []);
	assert.equal(JSON.parse(lines(f.file)[0]).cwd, f.b);
});

test("cancelamento por extensão: cwd antigo, bytes originais", async () => {
	const f = fx();
	const orig = readFileSync(f.file);
	const { h, calls } = host(f, async () => ({ cancelled: true }));
	const r = await sessionCwdTransition(h, f.file, { piSessionCwd: { cwd: f.b } });
	assert.equal(r.piSessionCwd.ok, false);
	assert.ok(readFileSync(f.file).equals(orig));
	assert.equal(f.sm.getCwd(), f.a);
	assert.equal(calls.length, 1);
	assert.deepEqual(stray(f.dir), []);
});

test("falha ao criar o runtime: desfaz o cabeçalho e religa no cwd antigo", async () => {
	const f = fx();
	const orig = readFileSync(f.file);
	const { h, calls } = host(f, async (n: any) => {
		if (n === 1) throw new Error("boom");
		return { cancelled: false };
	});
	const r = await sessionCwdTransition(h, f.file, { piSessionCwd: { cwd: f.b } });
	assert.match(r.piSessionCwd.reason, /boom.*voltou a/);
	assert.deepEqual(
		calls.map((c) => c[1]),
		[f.b, f.a],
	); // 2ª religação já lê o cwd antigo
	assert.ok(readFileSync(f.file).equals(orig));
});

test("falha também na religação: erro fatal nativo", async () => {
	const f = fx();
	const { h, calls } = host(f, async () => {
		throw new Error("boom");
	});
	const r = await sessionCwdTransition(h, f.file, { piSessionCwd: { cwd: f.b } });
	assert.equal(r.fatal, true);
	assert.equal(calls.at(-1)[0], "fatal");
});

test("recusas sem tocar na sessão: não-diretório, inexistente, outra sessão, cwd relativo", async () => {
	const f = fx();
	const orig = readFileSync(f.file);
	const { h, calls } = host(f, async () => ({ cancelled: false }));
	const file2 = join(f.root, "arq");
	writeFileSync(file2, "x");
	for (const [cwd, path, re] of [
		[file2, f.file, /não é um diretório/],
		[join(f.root, "nada"), f.file, /não existe/],
		[f.b, join(f.dir, "outra.jsonl"), /sessão atual/],
		["rel", f.file, /inválido/],
	]) {
		const r = await sessionCwdTransition(h, path, { piSessionCwd: { cwd } });
		assert.equal(r.cancelled, true);
		assert.match(r.piSessionCwd.reason, re);
	}
	assert.deepEqual(calls, []);
	assert.ok(readFileSync(f.file).equals(orig));
});

test("--approve não vaza para cwd novo com recursos que exigem confiança e sem decisão salva", async () => {
	const f = fx();
	const orig = readFileSync(f.file);
	const { h, calls } = host(f, async () => ({ cancelled: false }));
	const saved = { argv: hooks.argv };
	try {
		const decisions = new Map();
		trust.needs = (c) => c === f.b;
		trust.saved = (c) => decisions.get(c) ?? null;
		hooks.argv = () => ["--approve"];
		const r = await sessionCwdTransition(h, f.file, { piSessionCwd: { cwd: f.b } });
		assert.match(r.piSessionCwd.reason, /--approve/);
		assert.deepEqual(calls, []);
		assert.ok(readFileSync(f.file).equals(orig));
		decisions.set(f.b, true); // decisão salva: vale
		assert.equal((await sessionCwdTransition(h, f.file, { piSessionCwd: { cwd: f.b } })).piSessionCwd.ok, true);
	} finally {
		Object.assign(hooks, saved);
	}
});

test("withSession recebe (ctx, info): sucesso e recuperação após falha", async () => {
	const f = fx();
	const seen: any[] = [];
	const withSession = async (_c: any, info: any) => {
		seen.push(info);
	};
	const ok = host(f, async (_n: any, _p: any) => ({ cancelled: false }));
	ok.h.runtimeHost.switchSession = async (_p, o) => {
		await o.withSession({});
		return { cancelled: false };
	};
	await sessionCwdTransition(ok.h, f.file, { piSessionCwd: { cwd: f.b }, withSession });
	assert.deepEqual(seen.pop(), { ok: true, cwd: f.b, trusted: true });
	let n = 0;
	const bad = host(f, async () => ({ cancelled: false }));
	bad.h.runtimeHost.switchSession = async (_p, o) => {
		if (n++ === 0) throw new Error("boom");
		await o.withSession({});
		return { cancelled: false };
	};
	await sessionCwdTransition(bad.h, f.file, { piSessionCwd: { cwd: f.a === f.b ? f.root : f.b }, withSession });
	assert.equal(seen.pop().ok, false);
});

// ---- D12: cauda concorrente também no undo -----------------------------------------------------------------------
test("undo reanexa o que um escritor ainda gravou no inode antigo (nada perdido, cabeçalho antigo)", () => {
	const f = fx();
	const fd = openSync(f.file, "a");
	const tx = setCwdTransaction(f.sm, f.b);
	writeSync(
		fd,
		`${JSON.stringify({ type: "custom", customType: "x", id: "late", parentId: null, timestamp: "t", data: 1 })}\n`,
	);
	closeSync(fd);
	tx.undo();
	assert.match(readFileSync(f.file, "utf8"), /"id":"late"/);
	assert.equal(JSON.parse(lines(f.file)[0]).cwd, f.a);
	assert.deepEqual(stray(f.dir), []);
});

// ---- D6': confiança com contexto observado antes/depois -----------------------------------------------------------
async function trustCase({
	argv = [] as string[],
	needs = true,
	saved = null as boolean | null,
	trustedAfter = false,
	dflt = undefined as string | undefined,
	withSession = undefined as any,
} = {}): Promise<any> {
	const f = fx();
	const orig = readFileSync(f.file);
	const ctx = { trusted: true };
	const { h, calls } = host(f, async () => ({ cancelled: false }));
	const sm: any = h.runtimeHost.services.settingsManager;
	if (dflt) sm.getDefaultProjectTrust = () => dflt;
	h.runtimeHost.switchSession = async (p, o) => {
		const cwd = SessionManager.open(p).getCwd(); // contexto nativo: o runtime novo nasce do cabeçalho em disco
		sm.projectTrusted = cwd === f.b ? trustedAfter : true;
		calls.push(["switch", cwd, sm.projectTrusted]);
		await o.withSession?.({}); // como o core: o callback roda dentro do switchSession, antes do retorno final
		return { cancelled: false };
	};
	const savedHooks = { argv: hooks.argv };
	hooks.argv = () => argv;
	trust.needs = (c) => needs && c === f.b;
	trust.saved = (c) => (c === f.b ? saved : null);
	try {
		const r = await sessionCwdTransition(h, f.file, { piSessionCwd: { cwd: f.b }, withSession });
		return { f, r, calls, orig, ctx };
	} finally {
		Object.assign(hooks, savedHooks);
	}
}
const rolledBack = ({ f, calls, orig }: any) => {
	assert.deepEqual(
		calls.map((c: any) => c[1]),
		[f.b, f.a],
	); // religou no cwd antigo, confiável
	assert.equal(calls[1][2], true);
	assert.ok(readFileSync(f.file).equals(orig));
	assert.equal(f.sm.getCwd(), f.a);
	assert.deepEqual(stray(f.dir), []);
};

test("prompt de confiança recusado: cancela, sessão e cwd antigo utilizáveis", async () => {
	const c = await trustCase();
	assert.equal(c.r.cancelled, true);
	assert.equal(c.r.piSessionCwd.ok, false);
	assert.match(c.r.piSessionCwd.reason, /confiança recusada/);
	rolledBack(c);
});

test("decisão salva NEGADA também é recusa (reverte)", async () => rolledBack(await trustCase({ saved: false })));
test("`defaultProjectTrust: never` com decisão salva negada: recusa, não política", async () =>
	rolledBack(await trustCase({ saved: false, dflt: "never" })));

for (const [name, opts] of [
	["--no-approve", { argv: ["--no-approve"] }],
	["-na", { argv: ["-na"] }],
	["defaultProjectTrust never", { dflt: "never" }],
] as [string, any][]) {
	test(`política (${name}): /cd conclui sem fingir carga (policy:true, trusted:false)`, async () => {
		const c = await trustCase(opts);
		assert.deepEqual(c.r, { cancelled: false, piSessionCwd: { ok: true, cwd: c.f.b, trusted: false, policy: true } });
		assert.deepEqual(
			c.calls.map((x: any) => x[1]),
			[c.f.b],
		);
		assert.equal(JSON.parse(lines(c.f.file)[0]).cwd, c.f.b);
	});
}

test("política: o info do withSession já traz policy:true e é igual ao resultado final", async () => {
	const seen: any[] = [];
	const c = await trustCase({
		argv: ["--no-approve"],
		withSession: async (_c: any, info: any) => {
			seen.push(info);
		},
	});
	assert.equal(seen.length, 1);
	assert.equal(seen[0].policy, true);
	assert.deepEqual(seen[0], c.r.piSessionCwd);
	const ok = await trustCase({
		trustedAfter: true,
		withSession: async (_c: any, info: any) => {
			seen.push(info);
		},
	});
	assert.deepEqual(seen.pop(), { ok: true, cwd: ok.f.b, trusted: true });
	assert.ok(!("policy" in ok.r.piSessionCwd));
});

test("cwd sem recursos que exigem confiança: nenhum consentimento, nenhuma reversão", async () => {
	const c = await trustCase({ needs: false, trustedAfter: true });
	assert.equal(c.r.piSessionCwd.ok, true);
	assert.equal(c.r.piSessionCwd.trusted, true);
	assert.deepEqual(
		c.calls.map((x: any) => x[1]),
		[c.f.b],
	);
	const d = await trustCase({ needs: false, trustedAfter: false }); // decisão salva negada em pasta sem recursos: nada a recusar
	assert.equal(d.r.piSessionCwd.ok, true);
});

test("--approve: recusa ANTES de tocar na sessão se escopo novo sem decisão ou com decisão negada; decisão `true` vale", async () => {
	for (const saved of [null, false]) {
		const c = await trustCase({ argv: ["--approve"], saved });
		assert.equal(c.r.piSessionCwd.ok, false);
		assert.match(c.r.piSessionCwd.reason, /--approve/);
		assert.deepEqual(c.calls, []);
		assert.ok(readFileSync(c.f.file).equals(c.orig));
	}
	assert.equal((await trustCase({ argv: ["-a"], saved: true, trustedAfter: true })).r.piSessionCwd.ok, true);
});

test("recusa de confiança + falha na religação no cwd antigo: erro fatal nativo, nada fingido", async () => {
	const f = fx();
	const { h, calls } = host(f, async () => ({ cancelled: false }));
	let n = 0;
	h.runtimeHost.switchSession = async () => {
		if (n++ === 0) {
			h.runtimeHost.services.settingsManager.projectTrusted = false;
			return { cancelled: false };
		}
		throw new Error("boom");
	};
	const saved = { argv: hooks.argv };
	hooks.argv = () => [];
	trust.needs = () => true;
	trust.saved = () => null;
	try {
		assert.equal((await sessionCwdTransition(h, f.file, { piSessionCwd: { cwd: f.b } })).fatal, true);
	} finally {
		Object.assign(hooks, saved);
	}
	assert.equal(calls.at(-1)[0], "fatal");
});

// ---- D11: nycode -c / nycode -r / --session em processo NOVO respeitam o cwd do cabeçalho ----------------------------------
test("D11: sessão movida (cabeçalho novo, pasta antiga): padrão do cwd novo acha, do cwd antigo não; mesmo id/arquivo", async () => {
	const agent = mkdtempSync(join(tmpdir(), "session-cwd-agent-"));
	roots.push(agent);
	const prev = process.env.NYCODE_CODING_AGENT_DIR;
	process.env.NYCODE_CODING_AGENT_DIR = agent;
	try {
		const a = join(agent, "proj-a");
		const b = join(agent, "proj-b");
		mkdirSync(a);
		mkdirSync(b);
		const old = SessionManager.create(a); // pasta padrão do cwd antigo, como o nycode faz
		old.appendMessage({ role: "user", content: "oi", timestamp: 1 });
		old.appendMessage(assistant("olá"));
		const stay = SessionManager.create(b); // sessão genuína de b, mais antiga
		stay.appendMessage({ role: "user", content: "b", timestamp: 1 });
		stay.appendMessage(assistant("b"));
		const file = old.getSessionFile();
		const id = old.getSessionId();
		setCwdTransaction(old, b).finish();
		utimes(stay.getSessionFile(), 1000); // determinístico: a sessão genuína de b é mais antiga que a movida (sem empate de mtime)
		installCwdFinders(SessionManager);
		installCwdFinders(SessionManager); // idempotente
		assert.equal(SessionManager.findById(b, id), file);
		assert.equal(SessionManager.findById(a, id), undefined);
		const rb = SessionManager.continueRecent(b);
		assert.equal(rb.getSessionId(), id);
		assert.equal(rb.getSessionFile(), file);
		assert.equal(rb.getCwd(), b);
		const ra = SessionManager.continueRecent(a);
		assert.notEqual(ra.getSessionId(), id); // sessão nova para o cwd antigo
		assert.deepEqual((await SessionManager.list(b)).map((s: any) => s.id).sort(), [id, stay.getSessionId()].sort());
		assert.deepEqual(
			(await SessionManager.list(a)).map((s: any) => s.id),
			[],
		);
		assert.equal((await SessionManager.list(b)).filter((s: any) => s.id === id).length, 1); // sem contagem dupla
		assert.equal(SessionManager.open(file).getCwd(), b);
		// diretório explícito segue nativo
		assert.deepEqual(
			(await SessionManager.list(b, join(agent, "sessions", "..", "nada"))).map((s: any) => s.id),
			[],
		);
	} finally {
		if (prev === undefined) delete process.env.NYCODE_CODING_AGENT_DIR;
		else process.env.NYCODE_CODING_AGENT_DIR = prev;
	}
});

test("D11: mais recente entre as duas origens, id repetido conta uma vez, corrompido ignorado, sem cwd na pasta padrão vale", async () => {
	const agent = mkdtempSync(join(tmpdir(), "session-cwd-agent-"));
	roots.push(agent);
	const prev = process.env.NYCODE_CODING_AGENT_DIR;
	process.env.NYCODE_CODING_AGENT_DIR = agent;
	try {
		installCwdFinders(SessionManager);
		const a = join(agent, "a");
		const b = join(agent, "b");
		mkdirSync(a);
		mkdirSync(b);
		const native = SessionManager.create(b);
		native.appendMessage({ role: "user", content: "n", timestamp: 1 });
		native.appendMessage(assistant("n"));
		const moved = SessionManager.create(a);
		moved.appendMessage({ role: "user", content: "m", timestamp: 1 });
		moved.appendMessage(assistant("m"));
		setCwdTransaction(moved, b).finish();
		const t = Date.now() / 1000;
		utimes(native.getSessionFile(), t - 100);
		utimes(moved.getSessionFile(), t);
		assert.equal(SessionManager.continueRecent(b).getSessionId(), moved.getSessionId()); // o mais recente vence, venha de onde vier
		utimes(native.getSessionFile(), t + 50);
		assert.equal(SessionManager.continueRecent(b).getSessionId(), native.getSessionId());
		// colisão de id: cópia do arquivo em outra pasta; vale o mais recente, uma entrada só
		const dup = join(agent, "sessions", "copia");
		mkdirSync(dup);
		const copy = join(dup, "x.jsonl");
		writeFileSync(copy, readFileSync(native.getSessionFile()));
		utimes(copy, t + 90);
		assert.equal(SessionManager.findById(b, native.getSessionId()), copy);
		assert.equal((await SessionManager.list(b)).filter((s: any) => s.id === native.getSessionId()).length, 1);
		// corrompido ou não-sessão: ignorados
		writeFileSync(join(dup, "ruim.jsonl"), "{nao json\n");
		writeFileSync(join(dup, "vazio.jsonl"), "");
		assert.equal(scanForCwd(b).length, 2);
		// cabeçalho sem cwd na pasta padrão do cwd continua valendo (legado do core)
		const legacy = join(SessionManager.create(a).getSessionDir(), "leg.jsonl");
		writeFileSync(legacy, `${JSON.stringify({ type: "session", version: 3, id: "legacy-1", timestamp: "x" })}\n`);
		assert.equal(SessionManager.findById(a, "legacy-1"), legacy);
		assert.equal(SessionManager.findById(b, "legacy-1"), undefined);
	} finally {
		if (prev === undefined) delete process.env.NYCODE_CODING_AGENT_DIR;
		else process.env.NYCODE_CODING_AGENT_DIR = prev;
	}
});

// ---- fix-cwd-review: F1–F4 (docs/specs/claude-code-parity/fix-cwd-review.md) --------------------------------------
const hdr = (id: any, cwd: any) =>
	`${JSON.stringify({ type: "session", version: 3, id, timestamp: "x", ...(cwd ? { cwd } : {}) })}\n`;
function withAgent(fn: any) {
	return async () => {
		const agent = mkdtempSync(join(tmpdir(), "session-cwd-scan-"));
		roots.push(agent);
		const prev = process.env.NYCODE_CODING_AGENT_DIR;
		process.env.NYCODE_CODING_AGENT_DIR = agent;
		const saved = { ...scanLimits };
		try {
			await fn(agent, join(agent, "sessions"));
		} finally {
			Object.assign(scanLimits ?? {}, saved);
			if (prev === undefined) delete process.env.NYCODE_CODING_AGENT_DIR;
			else process.env.NYCODE_CODING_AGENT_DIR = prev;
		}
	};
}
const fakeSM = (): any => ({
	list: async () => ["native-list"],
	continueRecent: () => "native-recent",
	findById: () => "native-find",
	create: () => "created",
	open: (p: any) => ({ opened: p }),
});

test(
	"F1: varredura além do orçamento (20001 arquivos) falha explicitamente, não devolve parcial",
	withAgent(async (agent: any, root: any) => {
		const want = join(agent, "want");
		mkdirSync(want);
		const d = join(root, "zz");
		mkdirSync(d, { recursive: true });
		for (let i = 0; i <= MAX_FINDER_FILES; i++) writeFileSync(join(d, `o${i}.jsonl`), hdr(`o${i}`, "/outro"));
		writeFileSync(join(d, "novo.jsonl"), hdr("novo", want));
		assert.throws(() => scanForCwd(want), /incompleta/);
		const SM = fakeSM();
		installCwdFinders(SM);
		assert.throws(() => SM.continueRecent(want), /incompleta/); // nunca sessão nova/antiga por descoberta parcial
		assert.throws(() => SM.findById(want, "novo"), /incompleta/);
		await assert.rejects(SM.list(want), /incompleta/);
	}),
);

test(
	"F1/F2: limites de entradas, diretórios e prazo também falham fechado (limites injetados)",
	withAgent(async (agent: any, root: any) => {
		assert.ok(scanLimits, "scanLimits exportado");
		const want = join(agent, "want");
		mkdirSync(want);
		for (const d of ["a", "b", "c"]) {
			mkdirSync(join(root, d), { recursive: true });
			writeFileSync(join(root, d, "x.jsonl"), hdr(`id-${d}`, want));
			writeFileSync(join(root, d, "y.txt"), "");
		}
		assert.equal(scanForCwd(want).length, 3);
		for (const [k, v] of [
			["maxFiles", 2],
			["maxEntries", 4],
			["maxDirs", 2],
			["deadlineMs", -1],
		]) {
			const saved = { ...scanLimits };
			Object.assign(scanLimits, { [k]: v });
			try {
				assert.throws(() => scanForCwd(want), /incompleta/, String(k));
			} finally {
				Object.assign(scanLimits, saved);
			}
		}
	}),
);

test(
	"F2: links simbólicos (pasta ou arquivo) para fora do perfil não são seguidos; raiz inexistente = vazio; raiz link = erro",
	withAgent(async (agent: any, root: any) => {
		const want = join(agent, "want");
		mkdirSync(want);
		const outside = mkdtempSync(join(tmpdir(), "session-cwd-out-"));
		roots.push(outside);
		writeFileSync(join(outside, "alheio.jsonl"), hdr("alheio", want));
		assert.deepEqual(scanForCwd(want), []); // perfil novo: sem pasta de sessões
		mkdirSync(join(root, "real"), { recursive: true });
		symlinkSync(outside, join(root, "link-dir"));
		symlinkSync(join(outside, "alheio.jsonl"), join(root, "real", "link-file.jsonl"));
		writeFileSync(join(root, "real", "meu.jsonl"), hdr("meu", want));
		assert.deepEqual(
			scanForCwd(want).map((s) => s.id),
			["meu"],
		);
		rmSync(root, { recursive: true, force: true });
		symlinkSync(outside, root);
		assert.throws(() => scanForCwd(want), /link|simbólico/);
	}),
);

test(
	"F2: list honra o AbortSignal",
	withAgent(async (agent: any, root: any) => {
		mkdirSync(join(root, "a"), { recursive: true });
		writeFileSync(join(root, "a", "x.jsonl"), hdr("x", agent));
		const SM = fakeSM();
		installCwdFinders(SM);
		await assert.rejects(SM.list(agent, undefined, undefined, AbortSignal.abort()), /abort/i);
	}),
);

function bakOf(f: any) {
	return join(f.dir, readdirSync(f.dir).find((n) => n.includes("cwd-bak")) as string);
}

test("F3: cauda do backup truncada abaixo do ponto lido ou com NUL/linha incompleta: finish falha e o backup fica", () => {
	for (const mutate of [
		(bak: any, size: any) => truncateSync(bak, size - 5),
		(bak: any) => appendFileSync(bak, "x\u0000"),
		(bak: any) => appendFileSync(bak, '{"type":"message"'),
	]) {
		const f = fx();
		const tx = setCwdTransaction(f.sm, f.b);
		const bak = bakOf(f);
		mutate(bak, statSync(bak).size);
		const before = readFileSync(f.file);
		assert.throws(() => tx.finish(), /cauda|backup/);
		assert.ok(existsSync(bak), "backup retido");
		assert.deepEqual(readFileSync(f.file), before, "nada anexado ao arquivo novo");
	}
});

test("F3: readFully repete leituras curtas, falha em EOF curto e recusa tamanho acima do limite", () => {
	const fake =
		(steps: any): any =>
		(_fd: any, buf: any, off: any, _len: any, _pos: any) => {
			const n = steps.shift();
			buf.fill(7, off, off + n);
			return n;
		};
	const buf = Buffer.alloc(10);
	readFully(0, buf, 0, 10, 0, fake([3, 4, 3]));
	assert.ok(buf.every((b) => b === 7));
	assert.throws(() => readFully(0, Buffer.alloc(10), 0, 10, 0, fake([4, 0])), /EOF|curt/);
	const dir = mkdtempSync(join(tmpdir(), "session-cwd-big-"));
	roots.push(dir);
	const f = join(dir, "b");
	writeFileSync(f, "x");
	truncateSync(f, MAX_SESSION_BYTES + 1);
	assert.throws(() => bakTail(f, 0), /maior|limite/);
});

test("F4: reconciliação final que falha NÃO vira sucesso: erro fatal nativo com o caminho do backup, backup retido", async () => {
	const f = fx();
	const { h, calls } = host(f, async () => {
		appendFileSync(bakOf(f), "x\u0000");
		return { cancelled: false };
	});
	const r = await sessionCwdTransition(h, f.file, { piSessionCwd: { cwd: f.b } });
	assert.equal(r.fatal, true);
	const fatal = calls.find((c) => c[0] === "fatal");
	assert.ok(fatal, "handleFatalRuntimeError chamado");
	assert.ok(fatal[2].includes(bakOf(f)), "mensagem nomeia o backup");
	assert.ok(!fatal[2].includes("olá"), "sem conteúdo da transcrição");
	assert.ok(existsSync(bakOf(f)));
});

test("K23: handleResumeSession diverts to the cwd transition when options.piSessionCwd exists", async () => {
	const f = fx();
	const self: any = {
		sessionManager: f.sm,
		clearStatusIndicator() {},
		runtimeHost: { switchSession: async () => assert.fail("a plain resume must not run") },
	};
	const r = await (InteractiveMode.prototype as any).handleResumeSession.call(self, "/outra/sessao.jsonl", {
		piSessionCwd: { cwd: f.b },
	});
	assert.equal(r.cancelled, true);
	assert.match(r.piSessionCwd.reason, /só a sessão atual/);
});

test("K23: SessionManager has the cwd-aware finders installed at load", () => {
	assert.equal((SessionManager as any)[Symbol.for("nycode.session-cwd.finders")], true);
});
