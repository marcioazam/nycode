// K22: send-now (Ctrl+Enter / Ctrl+X Ctrl+S) and the queue keys against a fake host shaped like InteractiveMode.
// The queues are those of the real Agent (PendingMessageQueue) so the mock does not hide what the native clearAllQueues erases.
import assert from "node:assert/strict";
import { Agent } from "@nycode/agent-core";
import { test, vi } from "vitest";
import * as rt from "../../../../src/modes/interactive/send-now/index.ts";

type Q = string | { custom: string }; // string = mensagem humana (role user); {custom} = mensagem de extensão (ex.: conclusão de subagente)
const user = (text: string) => ({ role: "user", content: [{ type: "text", text }], timestamp: 0 });
const custom = (token: string) => ({
	role: "custom",
	customType: "subagent-background",
	content: token,
	display: true,
	timestamp: 0,
});
const msg = (q: Q): any => (typeof q === "string" ? user(q) : custom(q.custom));
const humans = (ms: any[]) => ms.filter((m) => m.role === "user").map((m) => m.content[0].text);
const lane = (ms: any[]) => ms.map((m) => (m.role === "user" ? m.content[0].text : m.content));

const ID_KEYS: Record<string, string[]> = {
	"app.message.copy": ["\x18"],
	"app.message.sendNowChord": ["\x13"],
	"app.message.sendNow": ["\x1b[13;5u"],
	"app.queue.drop": ["\x1b[127;2u", "\x1b[127;2:1u"],
	"app.queue.selectPrev": ["\x1b[1;2A"],
	"app.queue.selectNext": ["\x1b[1;2B"],
	"app.message.dequeue": ["\x1b[1;2D"],
};
const keybindings = { matches: (data: string, id: string): boolean => ID_KEYS[id]?.includes(data) ?? false };
const CTRL_ENTER = "\x1b[13;5u";

type Deferred = { promise: Promise<void>; resolve(): void; reject(e: Error): void };
function deferred(): Deferred {
	let resolve!: () => void;
	let reject!: (e: Error) => void;
	const promise = new Promise<void>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}
const tick = () => new Promise((r) => setImmediate(r));
async function until(what: string, ok: () => boolean): Promise<void> {
	for (let i = 0; i < 400; i++) {
		if (ok()) return;
		await tick();
	}
	assert.fail(`never: ${what}`);
}

function makeEditor(initial = "", expanded?: string) {
	const e = {
		text: initial,
		history: [] as string[],
		inputs: [] as string[],
		setTexts: [] as string[],
		getText: () => e.text,
		getExpandedText: () => expanded ?? e.text,
		setText: (t: string) => {
			e.setTexts.push(t);
			e.text = t;
		},
		addToHistory: (t: string) => void e.history.push(t),
		handleInput: (d: string) => void e.inputs.push(d),
	};
	return e;
}

interface Opts {
	draft?: string;
	expanded?: string;
	steering?: Q[];
	followUp?: Q[];
	busy?: boolean;
	bash?: boolean;
}
// O abort/abortBash só terminam quando o teste libera `gate.*`; session.isIdle é o que o core expõe (não há waitForIdle).
function makeHost(o: Opts = {}) {
	const log: string[] = [];
	const submits: string[] = [];
	const errors: string[] = [];
	const gate = { abort: deferred(), bash: deferred() };
	const agent: any = new Agent({
		streamFn: () => {
			throw new Error("fixture: nenhuma chamada de modelo é permitida");
		},
	});
	for (const q of o.steering ?? []) agent.steer(msg(q));
	for (const q of o.followUp ?? []) agent.followUp(msg(q));
	for (const lane_ of ["steer", "followUp"] as const) {
		const orig = agent[lane_].bind(agent);
		agent[lane_] = (m: unknown) => {
			log.push(lane_);
			return orig(m);
		};
	}
	const counts = { clear: 0, abort: 0, abortBash: 0 };
	const active = new Set<(d: string) => { consume?: boolean } | undefined>();
	const focus = { current: null as unknown };
	const session: any = {
		agent,
		isIdle: !(o.busy ?? false),
		isBashRunning: o.bash ?? false,
		abort: async () => {
			counts.abort++;
			log.push("abort");
			await gate.abort.promise;
			session.isIdle = true;
		},
		abortBash: () => {
			counts.abortBash++;
			log.push("abortBash");
			void gate.bash.promise.then(() => {
				session.isBashRunning = false;
			});
		},
	};
	const editor = makeEditor(o.draft ?? "", o.expanded);
	const host: any = {
		session,
		editor,
		keybindings,
		defaultEditor: {
			onSubmit: (t: string) => {
				log.push("submit");
				return submits.push(t);
			},
		},
		// Espelha InteractiveMode: devolve só o texto humano e o agent.clearAllQueues() real apaga TUDO (inclusive mensagens custom).
		getAllQueuedMessages: () => ({
			steering: humans(agent.steeringQueue.messages),
			followUp: humans(agent.followUpQueue.messages),
		}),
		clearAllQueues: () => {
			counts.clear++;
			log.push("clear");
			const out = { steering: humans(agent.steeringQueue.messages), followUp: humans(agent.followUpQueue.messages) };
			agent.clearAllQueues();
			return out;
		},
		updatePendingMessagesDisplay: () => void log.push("pending-display"),
		renderer: { getFocusedComponent: () => focus.current },
		showError: (m: string) => void errors.push(m),
		addExtensionTerminalInputListener: (l: (d: string) => { consume?: boolean } | undefined) => {
			active.add(l);
			return () => void active.delete(l);
		},
	};
	focus.current = editor;
	const press = (data: string) => [...active].map((l) => l(data));
	return {
		host,
		session,
		editor,
		agent,
		log,
		submits,
		errors,
		gate,
		counts,
		focus,
		active,
		press,
		type: (s: string) => {
			editor.text += s;
		},
	};
}

test("ordem: abort → ocioso → submit; nada é enviado enquanto o abort não termina", async () => {
	const t = makeHost({ draft: "oi", busy: true });
	const done = rt.sendNow(t.host);
	await until("abort called", () => t.counts.abort === 1);
	assert.deepEqual(t.submits, []);
	t.gate.abort.resolve();
	await done;
	assert.deepEqual(
		t.log.filter((l) => ["abort", "submit"].includes(l)),
		["abort", "submit"],
	);
	assert.deepEqual(t.submits, ["oi"]);
	assert.equal(t.editor.text, "");
});

test("falha de cancelamento NÃO é engolida: abort rejeita com a sessão já ociosa → sem submit, erro visível, texto de volta", async () => {
	const t = makeHost({ draft: "perdeu?", busy: true, steering: ["q1"] });
	t.session.abort = async () => {
		t.counts.abort++;
		t.session.isIdle = true; // ocioso, mas o cancelamento falhou: seguir em frente perderia o motivo
		throw new Error("boom");
	};
	const done = rt.sendNow(t.host);
	await until("abort", () => t.counts.abort === 1);
	t.type("Y");
	await done;
	assert.deepEqual(t.submits, []);
	assert.equal(t.errors.length, 1);
	assert.match(t.errors[0], /boom/);
	assert.match(t.editor.text, /q1[\s\S]*perdeu\?[\s\S]*Y/, "capturado (fila, rascunho) e depois o digitado");
});

test("falha ao cancelar o !bash (abortBash lança) também não envia e devolve o texto", async () => {
	const t = makeHost({ draft: "bash falhou", bash: true });
	t.session.abortBash = () => {
		t.counts.abortBash++;
		throw new Error("sem permissao");
	};
	await rt.sendNow(t.host, 50);
	assert.deepEqual(t.submits, []);
	assert.match(t.errors.join("\n"), /sem permissao/);
	assert.match(t.editor.text, /bash falhou/);
});

test("!bash em execução: cancela o bash, espera finalizar e só então envia", async () => {
	const t = makeHost({ draft: "depois", bash: true });
	const done = rt.sendNow(t.host);
	await until("abortBash", () => t.counts.abortBash === 1);
	assert.deepEqual(t.submits, []);
	t.gate.bash.resolve();
	await done;
	assert.deepEqual(t.submits, ["depois"]);
	assert.equal(t.session.isBashRunning, false);
});

test("timeout de ociosidade (waitMs): não envia, avisa e preserva o rascunho", async () => {
	const t = makeHost({ draft: "preso", busy: true }); // abort nunca resolve
	await rt.sendNow(t.host, 25);
	assert.deepEqual(t.submits, []);
	assert.equal(t.errors.length, 1);
	assert.match(t.editor.text, /preso/);
});

test("vazio (sem rascunho e sem fila): no-op, não aborta, não apaga", async () => {
	const t = makeHost({ draft: "   ", busy: true });
	await rt.sendNow(t.host);
	assert.equal(t.counts.abort + t.counts.abortBash + t.counts.clear, 0);
	assert.deepEqual(t.submits, []);
	assert.equal(t.editor.text, "   ");
});

test("ocioso com rascunho: envia direto, sem abortar", async () => {
	const t = makeHost({ draft: "ola" });
	await rt.sendNow(t.host);
	assert.equal(t.counts.abort + t.counts.abortBash, 0);
	assert.deepEqual(t.submits, ["ola"]);
});

test("filas capturadas uma vez e em ordem (steer, follow-up, rascunho) numa única mensagem", async () => {
	const t = makeHost({ draft: "rascunho", busy: true, steering: ["s1", "s2"], followUp: ["f1"] });
	t.gate.abort.resolve();
	await rt.sendNow(t.host);
	assert.equal(t.counts.clear, 1);
	assert.deepEqual(t.submits, ["s1\n\ns2\n\nf1\n\nrascunho"]);
	assert.ok(t.log.includes("pending-display"));
});

test("só fila, sem rascunho: aborta e envia a fila", async () => {
	const t = makeHost({ draft: "", busy: true, steering: ["s1"] });
	t.gate.abort.resolve();
	await rt.sendNow(t.host);
	assert.deepEqual(t.submits, ["s1"]);
});

test("atalho duplicado durante a espera: um único envio, uma única captura", async () => {
	const t = makeHost({ draft: "uma vez", busy: true, steering: ["q"] });
	const a = rt.sendNow(t.host);
	const b = rt.sendNow(t.host);
	await tick();
	t.gate.abort.resolve();
	await Promise.all([a, b]);
	assert.deepEqual(t.submits, ["q\n\numa vez"]);
	assert.equal(t.counts.abort, 1);
	assert.equal(t.counts.clear, 1);
});

test("rascunho colado: envia o texto expandido, não o marcador", async () => {
	const t = makeHost({ draft: "[paste #1 +3 lines]", expanded: "l1\nl2\nl3" });
	await rt.sendNow(t.host);
	assert.deepEqual(t.submits, ["l1\nl2\nl3"]);
});

test("o usuário digita durante a espera: enviado é o capturado; o digitado fica no editor", async () => {
	const t = makeHost({ draft: "capturado", busy: true });
	const done = rt.sendNow(t.host);
	await until("abort", () => t.counts.abort === 1);
	t.type("X");
	t.gate.abort.resolve();
	await done;
	assert.deepEqual(t.submits, ["capturado"]);
	assert.equal(t.editor.text, "X");
});

for (const swap of ["sessão", "editor", "ambos"] as const) {
	test(`${swap} trocado durante o abort: nada é entregue nem escrito no rascunho atual; o capturado vai UMA vez ao histórico do editor ATUAL (↑), com aviso`, async () => {
		const t = makeHost({ draft: "da sessao A", busy: true });
		const oldEditor = t.editor;
		const newEditor = makeEditor("rascunho da sessao B");
		const boom = () => {
			throw new Error("estado novo não deve ser tocado");
		};
		const newSession: any = { isIdle: true, isBashRunning: false, abort: boom, abortBash: boom };
		const done = rt.sendNow(t.host);
		await until("abort", () => t.counts.abort === 1);
		if (swap !== "editor") t.host.session = newSession;
		if (swap !== "sessão") t.host.editor = newEditor;
		t.gate.abort.resolve();
		await done;
		const current = t.host.editor;
		assert.deepEqual(t.submits, [], "nenhum prompt entregue ao estado errado");
		assert.ok(
			!current.setTexts.some((x: string) => x.includes("da sessao A")),
			"o capturado não é escrito no rascunho atual",
		);
		if (swap !== "sessão") assert.deepEqual(newEditor.setTexts, [], "o rascunho do editor novo não é tocado");
		assert.deepEqual(current.history, ["da sessao A"], "alcançável por ↑ no editor atual, exatamente uma vez");
		if (swap !== "sessão")
			assert.deepEqual(
				oldEditor.history,
				[],
				"o histórico do editor substituído é inacessível: não é o armazenamento",
			);
		assert.ok(t.errors.length >= 1, "aviso visível");
	});
}

test("editor substituto sem histórico: recupera o capturado só no aviso local, sem rejeição nem prompt errado", async () => {
	const t = makeHost({ draft: "rascunho recuperavel", busy: true });
	const next = makeEditor("texto novo");
	Reflect.deleteProperty(next, "addToHistory"); // EditorComponent declara o método opcional.
	const done = rt.sendNow(t.host);
	await until("abort", () => t.counts.abort === 1);
	t.host.editor = next;
	t.gate.abort.resolve();
	await assert.doesNotReject(done);
	assert.deepEqual(t.submits, []);
	assert.equal(next.text, "texto novo");
	assert.deepEqual(next.setTexts, []);
	assert.ok(t.errors.some((message) => message.includes("rascunho recuperavel")));
});

// F1: o clearAllQueues nativo apaga também as mensagens custom (conclusão de subagente); o enviar-agora tem de preservá-las.
test("F1: só custom na fila e editor vazio: no-op total — não limpa, não aborta, a conclusão continua na fila", async () => {
	const t = makeHost({ draft: "", busy: true, steering: [{ custom: "C1" }], followUp: [{ custom: "C2" }] });
	await rt.sendNow(t.host);
	assert.equal(t.counts.clear + t.counts.abort + t.counts.abortBash, 0);
	assert.deepEqual(t.submits, []);
	assert.deepEqual(lane(t.agent.steeringQueue.messages), ["C1"]);
	assert.deepEqual(lane(t.agent.followUpQueue.messages), ["C2"]);
});

test("F1: rascunho + custom: o rascunho é enviado, as custom voltam às MESMAS filas na ordem, antes de qualquer await/abort", async () => {
	const t = makeHost({
		draft: "D",
		busy: true,
		steering: ["s1", { custom: "C1" }, { custom: "C2" }],
		followUp: [{ custom: "C3" }, "f1", { custom: "C4" }],
	});
	t.gate.abort.resolve();
	await rt.sendNow(t.host);
	assert.deepEqual(t.submits, ["s1\n\nf1\n\nD"], "só texto humano é combinado");
	assert.deepEqual(lane(t.agent.steeringQueue.messages), ["C1", "C2"]);
	assert.deepEqual(lane(t.agent.followUpQueue.messages), ["C3", "C4"]);
	const from = t.log.indexOf("clear");
	assert.deepEqual(
		t.log.slice(from, from + 5),
		["clear", "steer", "steer", "followUp", "followUp"],
		"reenfileiradas logo após o clear, sem abort no meio",
	);
	assert.ok(t.log.indexOf("abort") > from + 4);
});

test("F1: fila humana + custom sem rascunho: envia a fila humana e preserva a custom", async () => {
	const t = makeHost({ draft: "", busy: true, steering: ["s1"], followUp: [{ custom: "C" }] });
	t.gate.abort.resolve();
	await rt.sendNow(t.host);
	assert.deepEqual(t.submits, ["s1"]);
	assert.deepEqual(lane(t.agent.followUpQueue.messages), ["C"]);
	assert.deepEqual(lane(t.agent.steeringQueue.messages), []);
});

test("F1: se o envio falha (abort rejeita) as custom continuam na fila", async () => {
	const t = makeHost({ draft: "D", busy: true, steering: [{ custom: "C1" }] });
	t.session.abort = async () => {
		t.counts.abort++;
		throw new Error("boom");
	};
	await rt.sendNow(t.host);
	assert.deepEqual(t.submits, []);
	assert.deepEqual(lane(t.agent.steeringQueue.messages), ["C1"]);
});

test("F1: forma das filas do core diferente do esperado: falha fechada — nada limpo, nada abortado, rascunho intacto, erro acionável", async () => {
	const t = makeHost({ draft: "D", busy: true, steering: [{ custom: "C1" }] });
	t.agent.followUpQueue = {}; // outra versão do core: sem `messages`
	await rt.sendNow(t.host);
	assert.equal(t.counts.clear + t.counts.abort, 0);
	assert.deepEqual(t.submits, []);
	assert.equal(t.editor.text, "D");
	assert.ok(t.errors.length >= 1);
	assert.deepEqual(lane(t.agent.steeringQueue.messages), ["C1"]);
});

test("listener: Ctrl+Enter envia e consome; Enter simples passa intacto e não envia", async () => {
	const t = makeHost({ draft: "k" });
	rt.installSendNow(t.host);
	assert.equal(t.active.size, 1);
	assert.deepEqual(t.press("\r"), [undefined]);
	assert.deepEqual(t.submits, []);
	assert.deepEqual(t.press(CTRL_ENTER), [{ consume: true }]);
	await until("submit", () => t.submits.length === 1);
	assert.deepEqual(t.submits, ["k"]);
});

test("acorde: Ctrl+X é consumido para esperar o Ctrl+S; Ctrl+S em seguida envia e o Ctrl+X nunca chega ao editor", async () => {
	vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
	try {
		const t = makeHost({ draft: "acorde" });
		rt.installSendNow(t.host);
		assert.deepEqual(t.press("\x18"), [{ consume: true }]);
		assert.deepEqual(t.press("\x13"), [{ consume: true }]);
		vi.advanceTimersByTime(rt.CHORD_MS * 2);
		await until("submit", () => t.submits.length === 1);
		assert.deepEqual(t.submits, ["acorde"]);
		assert.deepEqual(t.editor.inputs, []);
	} finally {
		vi.useRealTimers();
	}
});

test("Ctrl+X nu: copiar nativo atrasado — só chega ao editor quando a janela CHORD_MS fecha, uma vez, sem enviar", async () => {
	vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
	try {
		const t = makeHost({ draft: "copia" });
		rt.installSendNow(t.host);
		t.press("\x18");
		vi.advanceTimersByTime(rt.CHORD_MS - 1);
		assert.deepEqual(t.editor.inputs, [], "ainda dentro da janela");
		vi.advanceTimersByTime(1);
		assert.deepEqual(t.editor.inputs, ["\x18"]);
		vi.advanceTimersByTime(rt.CHORD_MS * 4);
		assert.deepEqual(t.editor.inputs, ["\x18"], "sem repetição");
		assert.deepEqual(t.submits, []);
		assert.equal(t.counts.abort, 0);
	} finally {
		vi.useRealTimers();
	}
});

test("Ctrl+X seguido de outra tecla: o Ctrl+X é devolvido ao editor na hora, a tecla segue o caminho normal e o timer é cancelado", async () => {
	vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
	try {
		const t = makeHost({ draft: "x" });
		rt.installSendNow(t.host);
		t.press("\x18");
		assert.deepEqual(t.press("a"), [undefined]);
		assert.deepEqual(t.editor.inputs, ["\x18"]);
		vi.advanceTimersByTime(rt.CHORD_MS * 4);
		assert.deepEqual(t.editor.inputs, ["\x18"]);
		assert.deepEqual(t.press("\x13"), [undefined], "Ctrl+S depois do acorde expirado não envia");
		assert.deepEqual(t.submits, []);
	} finally {
		vi.useRealTimers();
	}
});

test("Ctrl+S sem Ctrl+X passa intacto (stash nativo preservado)", async () => {
	const t = makeHost({ draft: "stash" });
	rt.installSendNow(t.host);
	assert.deepEqual(t.press("\x13"), [undefined]);
	await tick();
	assert.deepEqual(t.submits, []);
});

test("foco sai do editor entre Ctrl+X e Ctrl+S: o acorde é descartado, nada é enviado nem injetado", async () => {
	vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
	try {
		const t = makeHost({ draft: "foco" });
		rt.installSendNow(t.host);
		t.press("\x18");
		t.focus.current = { dialog: true };
		assert.deepEqual(t.press("\x13"), [undefined]);
		vi.advanceTimersByTime(rt.CHORD_MS * 4);
		assert.deepEqual(t.editor.inputs, [], "o Ctrl+X pendente não vai a um componente que não é o editor");
		assert.deepEqual(t.submits, []);
	} finally {
		vi.useRealTimers();
	}
});

test("diálogo/seletor em foco: Ctrl+Enter, Ctrl+X e Ctrl+S não são consumidos e nunca interrompem", async () => {
	const t = makeHost({ draft: "z", busy: true });
	rt.installSendNow(t.host);
	t.focus.current = { dialog: true };
	assert.deepEqual(t.press(CTRL_ENTER), [undefined]);
	assert.deepEqual(t.press("\x18"), [undefined]);
	assert.deepEqual(t.press("\x13"), [undefined]);
	await tick();
	assert.equal(t.counts.abort, 0);
	assert.deepEqual(t.submits, []);
});

test("reinstalar (reload/resetExtensionUI): só o listener novo fica ativo e há um único envio", async () => {
	const t = makeHost({ draft: "uma" });
	rt.installSendNow(t.host);
	rt.installSendNow(t.host);
	assert.equal(t.active.size, 1, "o listener antigo foi removido");
	t.press(CTRL_ENTER);
	await until("submit", () => t.submits.length === 1);
	assert.deepEqual(t.submits, ["uma"]);
});

test("após o core limpar os listeners (clearExtensionTerminalInputListeners), reinstalar volta a funcionar", async () => {
	const t = makeHost({ draft: "de novo" });
	rt.installSendNow(t.host);
	t.active.clear(); // o core esvazia o conjunto por fora, sem chamar o remover
	assert.deepEqual(t.press(CTRL_ENTER), []);
	rt.installSendNow(t.host);
	assert.equal(t.active.size, 1);
	t.press(CTRL_ENTER);
	await until("submit", () => t.submits.length === 1);
});

test("remover devolvido cancela o acorde pendente: nada chega ao editor depois", async () => {
	vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
	try {
		const t = makeHost({ draft: "r" });
		const remove = rt.installSendNow(t.host);
		t.press("\x18");
		remove();
		vi.advanceTimersByTime(rt.CHORD_MS * 4);
		assert.deepEqual(t.editor.inputs, []);
		assert.equal(t.active.size, 0);
	} finally {
		vi.useRealTimers();
	}
});

test("Ctrl+X reconhecido pelo editor não copia nem submete; janela de chord é 3 s", () => {
	vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
	try {
		const t = makeHost({ draft: "rascunho" });
		const got: string[] = [];
		Object.assign(t.editor, {
			handleClaudeChord: (data: string) => {
				got.push(data);
				return true;
			},
		});
		rt.installSendNow(t.host);
		assert.equal(rt.CHORD_MS, 3000);
		t.press("\x18");
		t.press("\x05");
		vi.advanceTimersByTime(rt.CHORD_MS * 2);
		assert.deepEqual(got, ["\x05"]);
		assert.deepEqual(t.editor.inputs, []);
		assert.deepEqual(t.submits, []);
	} finally {
		vi.useRealTimers();
	}
});

test("falha do handler de chord é explícita, sem copiar prefixo nem enviar rascunho", () => {
	const t = makeHost({ draft: "rascunho" });
	Object.assign(t.editor, {
		handleClaudeChord: () => {
			throw new Error("chord failed");
		},
	});
	rt.installSendNow(t.host);
	t.press("\x18");
	t.press("\x05");
	assert.match(t.errors.at(-1)!, /chord failed/);
	assert.deepEqual(t.editor.inputs, []);
	assert.deepEqual(t.submits, []);
});

// Bug: com o auto-resume esperando o reset do limite, o enviar-agora estourava os 10 s. A espera
// fica fora do run do agente; o enviar-agora a acorda pelo gancho global que a extensão registra.
test("enviar-agora acorda a espera do auto-resume antes de abortar", async () => {
	const t = makeHost({ draft: "oi", busy: true });
	const ordem: string[] = [];
	(globalThis as any).__piAutoResumeCancel = () => ordem.push(`cancel@abort=${t.counts.abort}`);
	try {
		const done = rt.sendNow(t.host);
		await until("abort called", () => t.counts.abort === 1);
		t.gate.abort.resolve();
		await done;
	} finally {
		delete (globalThis as any).__piAutoResumeCancel;
	}
	assert.deepEqual(ordem, ["cancel@abort=0"]);
	assert.deepEqual(t.submits, ["oi"]);
});

test("Shift+Backspace remove a última mensagem humana da fila (1 por vez), preserva custom (F1), guarda no histórico e passa adiante quando vazia", () => {
	const t = makeHost({
		draft: "rascunho intacto",
		steering: ["s1", { custom: "SUB-1" }, "s2"],
		followUp: ["f1", { custom: "SUB-2" }],
		busy: true,
	});
	t.session._steeringMessages = ["s1", "s2"];
	t.session._followUpMessages = ["f1"];
	rt.installSendNow(t.host);

	// 1º Shift+Backspace: remove 'f1' (última da fila: follow-up), preserva SUB-2 e o rascunho
	assert.deepEqual(t.press("\x1b[127;2u"), [{ consume: true }]);
	assert.deepEqual(lane(t.agent.followUpQueue.messages), ["SUB-2"]);
	assert.deepEqual(lane(t.agent.steeringQueue.messages), ["s1", "SUB-1", "s2"]);
	assert.deepEqual(t.session._followUpMessages, []);
	assert.deepEqual(t.editor.history, ["f1"]);
	assert.equal(t.editor.text, "rascunho intacto");

	// 2º Shift+Backspace: remove 's2', preserva 's1' e SUB-1
	assert.deepEqual(t.press("\x1b[127;2:1u"), [{ consume: true }]);
	assert.deepEqual(lane(t.agent.steeringQueue.messages), ["s1", "SUB-1"]);
	assert.deepEqual(t.session._steeringMessages, ["s1"]);
	assert.deepEqual(t.editor.history, ["f1", "s2"]);

	// 3º Shift+Backspace: remove 's1'
	assert.deepEqual(t.press("\x1b[8;2u"), [{ consume: true }]);
	assert.deepEqual(lane(t.agent.steeringQueue.messages), ["SUB-1"]);
	assert.deepEqual(t.session._steeringMessages, []);
	assert.deepEqual(t.editor.history, ["f1", "s2", "s1"]);

	// 4º Shift+Backspace: fila humana vazia (só custom SUB-1/SUB-2) → NÃO consome (segue para o editor)
	assert.deepEqual(t.press("\x1b[127;2u"), [undefined]);
	assert.deepEqual(lane(t.agent.steeringQueue.messages), ["SUB-1"]);
	assert.deepEqual(lane(t.agent.followUpQueue.messages), ["SUB-2"]);
	assert.equal(t.counts.abort, 0, "excluir da fila não aborta o agente");
});

// Item escolhido da fila: shift+↑/↓ escolhe; shift+⌫ e shift+← agem só nele; sem escolha, como antes.
test("fila: shift+↑/↓ escolhe um item; shift+⌫ remove o escolhido e shift+← o leva sozinho ao editor; sem fila as teclas passam", () => {
	delete (globalThis as any).__piFilaSel;
	const t = makeHost({
		draft: "rascunho",
		steering: ["s1", { custom: "SUB-1" }, "s2"],
		followUp: ["f1", "f2"],
		busy: true,
	});
	t.session._steeringMessages = ["s1", "s2"];
	t.session._followUpMessages = ["f1", "f2"];
	rt.installSendNow(t.host);
	const SU = "\x1b[1;2A",
		SD = "\x1b[1;2B",
		SL = "\x1b[1;2D",
		SB = "\x1b[127;2u";
	const sel = () => (globalThis as any).__piFilaSel;
	// lista exibida: s1, s2, f1, f2. ↑ começa no último; ↑↑ sobe; ↓ desce; ↓ depois do último = nenhum
	assert.deepEqual(t.press(SU), [{ consume: true }]);
	assert.equal(sel(), 3);
	t.press(SU);
	t.press(SU);
	assert.equal(sel(), 1);
	t.press(SD);
	t.press(SD);
	assert.equal(sel(), 3);
	t.press(SD);
	assert.equal(sel(), undefined);
	t.press(SU);
	t.press(SU);
	t.press(SU);
	t.press(SU);
	t.press(SU);
	assert.equal(sel(), 0, "para no primeiro");
	t.press(SD);
	assert.equal(sel(), 1); // s2
	// shift+⌫ remove só o escolhido (s2), preserva SUB-1, guarda no histórico e mantém a escolha na mesma posição (agora f1)
	assert.deepEqual(t.press(SB), [{ consume: true }]);
	assert.deepEqual(lane(t.agent.steeringQueue.messages), ["s1", "SUB-1"]);
	assert.deepEqual(t.session._steeringMessages, ["s1"]);
	assert.deepEqual(t.editor.history, ["s2"]);
	assert.equal(sel(), 1);
	// shift+← com escolha: tira só f1 da fila e o põe antes do rascunho; a escolha some
	assert.deepEqual(t.press(SL), [{ consume: true }]);
	assert.deepEqual(lane(t.agent.followUpQueue.messages), ["f2"]);
	assert.deepEqual(t.session._followUpMessages, ["f2"]);
	assert.equal(t.editor.text, "f1\n\nrascunho");
	assert.equal(sel(), undefined);
	// sem escolha, shift+← passa para o nycode (edita a fila toda) e shift+⌫ remove a última, como antes
	assert.deepEqual(t.press(SL), [undefined]);
	assert.deepEqual(t.press(SB), [{ consume: true }]);
	assert.deepEqual(lane(t.agent.followUpQueue.messages), []);
	assert.equal(t.counts.abort, 0, "escolher/excluir/editar não aborta o agente");
	// só custom na fila: shift+↑ passa adiante
	t.press(SB); // s1
	assert.deepEqual(t.press(SU), [undefined]);
	assert.equal(sel(), undefined);
});

test("fila: item escolhido guardado durante a compactação também é removido sozinho", () => {
	delete (globalThis as any).__piFilaSel;
	const t = makeHost({ steering: ["s1"], busy: true });
	t.session._steeringMessages = ["s1"];
	t.host.compactionQueuedMessages = [
		{ text: "c-steer", mode: "steer" },
		{ text: "c-fu", mode: "followUp" },
	];
	const base = t.host.getAllQueuedMessages;
	t.host.getAllQueuedMessages = () => {
		const q = base();
		return { steering: [...q.steering, "c-steer"], followUp: [...q.followUp, "c-fu"] };
	};
	rt.installSendNow(t.host);
	t.press("\x1b[1;2A");
	t.press("\x1b[1;2A"); // c-steer (índice 1)
	assert.equal((globalThis as any).__piFilaSel, 1);
	t.press("\x1b[127;2u");
	assert.deepEqual(t.host.compactionQueuedMessages, [{ text: "c-fu", mode: "followUp" }]);
	assert.deepEqual(lane(t.agent.steeringQueue.messages), ["s1"]);
	assert.deepEqual(t.editor.history, ["c-steer"]);
	delete (globalThis as any).__piFilaSel;
});
