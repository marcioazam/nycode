import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname } from "node:path";
import { test } from "vitest";
import { openExternal, openTranscript } from "../../../../../src/extensions/claude-compat/interface/transcript.ts";
import {
	buildBlocks,
	MAX_BLOCK_CHARS,
	MAX_BLOCKS,
	MAX_TOTAL_CHARS,
	plainText,
	sanitize,
} from "../../../../../src/extensions/claude-compat/interface/transcript-model.ts";
import {
	COLLAPSED_LINES,
	MISSING_SCROLLBACK,
	SNAPSHOT,
	TranscriptView,
} from "../../../../../src/extensions/claude-compat/interface/transcript-view.ts";

const msg = (message: object) => ({ type: "message", message });
const entries = [
	msg({ role: "user", content: "primeiro prompt" }),
	msg({
		role: "assistant",
		content: [
			{ type: "thinking", thinking: "pensando" },
			{ type: "text", text: "resposta 1" },
			{ type: "toolCall", name: "bash", arguments: { command: "ls" } },
		],
	}),
	msg({
		role: "toolResult",
		toolName: "bash",
		isError: true,
		content: [{ type: "text", text: "a\x1b]52;c;SEGREDO\x07b\x1b[31mred\x1b[0m\x1b[2J" }],
	}),
	msg({ role: "bashExecution", command: "echo hi", output: "hi", exitCode: 2 }),
	{ type: "custom_message", customType: "aviso", content: "nota" },
	{ type: "compaction", summary: "resumo" },
	msg({ role: "user", content: [{ type: "text", text: "segundo" }, { type: "image" }] }),
];

test("modelo: tipos, ordem e nenhuma sequência de terminal sobrevive", () => {
	const { blocks, dropped } = buildBlocks(entries);
	assert.equal(dropped, 0);
	assert.deepEqual(
		blocks.map((b) => b.kind),
		["user", "thinking", "assistant", "tool-call", "tool-result", "bash", "custom", "summary", "user"],
	);
	assert.equal(blocks[4].text, "abred");
	assert.equal(blocks[4].title, "Resultado: bash (erro)");
	assert.equal(blocks[5].title, "! echo hi (saída 2)");
	assert.match(blocks[8].text, /\[1 imagem\(ns\)\]/);
	assert.ok(blocks.every((b) => !/[\x00-\x08\x0b-\x1f\x7f-\x9f]/.test(b.text + b.title)));
	assert.equal(sanitize("x\x1bPsecret\x1b\\y\r\nz\x00"), "xy\nz");
});

test("modelo: limite por bloco, por contagem (mais recentes) e por total", () => {
	const big = buildBlocks([msg({ role: "user", content: "x".repeat(MAX_BLOCK_CHARS + 5) })]);
	assert.equal(big.blocks[0].text.length, MAX_BLOCK_CHARS);
	assert.equal(big.blocks[0].clipped, true);
	assert.match(plainText(big.blocks), /bloco truncado/);
	const many = buildBlocks(Array.from({ length: MAX_BLOCKS + 3 }, (_, i) => msg({ role: "user", content: `p${i}` })));
	assert.equal(many.blocks.length, MAX_BLOCKS);
	assert.equal(many.dropped, 3);
	assert.equal(many.blocks[0].text, "p3");
	const chunks = Array.from({ length: Math.ceil(MAX_TOTAL_CHARS / MAX_BLOCK_CHARS) + 5 }, (_, i) =>
		msg({ role: "user", content: String(i % 10).repeat(MAX_BLOCK_CHARS) }),
	);
	const total = buildBlocks(chunks);
	assert.ok(
		total.dropped >= 4 && total.blocks.reduce((n, b) => n + b.text.length, 0) <= MAX_TOTAL_CHARS + MAX_BLOCK_CHARS,
	);
	assert.deepEqual(buildBlocks([]), { blocks: [], dropped: 0 });
});

const key = {
	up: "\x1b[A",
	down: "\x1b[B",
	pgdn: "\x1b[6~",
	pgup: "\x1b[5~",
	home: "\x1b[H",
	end: "\x1b[F",
	esc: "\x1b",
	ctrlc: "\x03",
	ctrlo: "\x0f",
	ctrle: "\x05",
};
function view(over: Partial<{ rows: number; openFull: (t: string) => string }> = {}, ev = entries) {
	const log = { done: 0, renders: 0, full: [] as string[] };
	const { blocks, dropped } = buildBlocks(ev);
	const v = new TranscriptView(blocks, dropped, {
		rows: () => over.rows ?? 8,
		done: () => log.done++,
		requestRender: () => log.renders++,
		openFull:
			over.openFull ??
			((t) => {
				log.full.push(t);
				return "aberto";
			}),
	});
	return { v, log };
}
const plain = (ls: string[]) => ls.map((l) => l.replace(/\x1b\[[0-9;]*m/g, ""));

test("vista: renderiza com limite de linhas e largura, rola e fecha pelas quatro teclas", () => {
	const { v, log } = view({ rows: 6 });
	const first = plain(v.render(30));
	assert.equal(first.length, 6 - 3 + 2);
	assert.ok(first.every((l) => l.length <= 30));
	assert.match(first[0], /Transcrição/);
	assert.equal(first[1], `${SNAPSHOT.slice(0, 27)}...`); // rótulo explícito de instantâneo estático (truncado na largura)
	assert.equal(first[2], "");
	assert.equal(first[3], "Você");
	v.handleInput(key.down);
	assert.notDeepEqual(plain(v.render(30)), first);
	v.handleInput(key.end);
	assert.match(plain(v.render(30)).at(-1)!, /^\d+\/\d+$/);
	v.handleInput(key.home);
	assert.deepEqual(plain(v.render(30)), first);
	for (const k of ["q", key.esc, key.ctrlc, key.ctrlo]) v.handleInput(k);
	assert.equal(log.done, 4);
});

test("vista: ? ajuda, { } navegam entre prompts, Ctrl+E mostra tudo, [ é capacidade ausente", () => {
	const long = [
		msg({ role: "user", content: "A" }),
		msg({
			role: "toolResult",
			toolName: "t",
			content: [{ type: "text", text: Array.from({ length: 40 }, (_, i) => `linha ${i}`).join("\n") }],
		}),
		msg({ role: "user", content: "B" }),
	];
	const { v } = view({ rows: 8 }, long); // página de 5 linhas; 2 de cabeçalho do instantâneo + 21 de blocos
	v.render(40);
	v.handleInput(key.end);
	assert.ok(
		plain(v.render(40))
			.join("\n")
			.includes(`+${40 - COLLAPSED_LINES} linhas`),
	);
	v.handleInput(key.home);
	v.handleInput("}"); // do topo (cabeçalho do instantâneo), o próximo prompt é A
	let out = plain(v.render(40));
	assert.deepEqual(out.slice(1, 3), ["Você", "  A"]);
	v.handleInput("}");
	out = plain(v.render(40));
	// B é o último bloco: a rolagem trava no fim e B fica nas 2 últimas linhas úteis da página
	assert.deepEqual(out.slice(3, 5), ["Você", "  B"]);
	v.handleInput("{");
	out = plain(v.render(40));
	assert.equal(out[1], "Você");
	assert.equal(out[2], "  A");
	v.handleInput("{");
	assert.match(plain(v.render(40)).at(-1)!, /sem prompt anterior/);
	v.handleInput(key.ctrle);
	v.render(40); // o TUI redesenha após cada tecla; End usa o tamanho do modo "tudo"
	v.handleInput(key.end);
	out = plain(v.render(40));
	assert.ok(out.join("\n").includes("linha 39") && !out.join("\n").includes("linhas (Ctrl+E"));
	v.handleInput("[");
	assert.ok(plain(v.render(40)).at(-1)!.startsWith(MISSING_SCROLLBACK.slice(0, 20)));
	v.handleInput("?");
	// em 40 colunas a ajuda é truncada com reticências; em 100 a linha sai inteira
	assert.ok(plain(v.render(100)).includes("{ / }                   prompt anterior / próximo"));
	v.handleInput("x"); // qualquer tecla fecha a ajuda sem fechar a vista
	assert.match(plain(v.render(40))[0], /Transcrição/);
});

test("vista: v entrega o texto completo ao abridor; sem mudar nada no modelo", () => {
	const { v, log } = view();
	v.render(40);
	v.handleInput("v");
	assert.equal(log.full.length, 1);
	assert.match(log.full[0], /## Você\nprimeiro prompt/);
	assert.match(plain(v.render(40)).at(-1)!, /aberto/);
});

test("editor externo: arquivo 0600 em diretório 0700, removido, TUI parado/religado, sem reler", () => {
	const calls: string[] = [];
	const tui = {
		stop: () => calls.push("stop"),
		start: () => calls.push("start"),
		requestRender: () => calls.push("render"),
	};
	let file = "";
	const msgOk = openExternal("conteúdo", tui, {
		env: { VISUAL: "meu-editor --wait" },
		run: (cmd, args) => {
			file = args.at(-1)!;
			assert.equal(cmd, "meu-editor");
			assert.equal(args[0], "--wait");
			assert.equal(statSync(file).mode & 0o777, 0o600);
			assert.equal(statSync(dirname(file)).mode & 0o777, 0o700);
			assert.equal(readFileSync(file, "utf8"), "conteúdo");
			return { status: 0 };
		},
	});
	assert.equal(msgOk, "Editor externo fechado.");
	assert.deepEqual(calls, ["stop", "start", "render"]);
	assert.equal(existsSync(file), false);
	assert.equal(existsSync(dirname(file)), false);
	assert.match(openExternal("x", tui, { env: {} }), /Sem \$VISUAL\/\$EDITOR/);
	assert.match(openExternal("x", tui, { env: { EDITOR: "e" }, run: () => ({ status: 3 }) }), /código 3/);
	assert.match(
		openExternal("x", tui, { env: { EDITOR: "e" }, run: () => ({ status: null, error: new Error("ENOENT") }) }),
		/Editor falhou: ENOENT/,
	);
});

test("openTranscript: overlay real sem tocar no rascunho do editor; sem UI ou conversa vazia só avisa", async () => {
	const notes: string[] = [];
	let draft = "rascunho";
	let touched = 0;
	let overlay: unknown;
	let comp: any;
	const ctx: any = {
		hasUI: true,
		sessionManager: { getBranch: () => entries },
		ui: {
			notify: (m: string) => notes.push(m),
			getEditorText: () => {
				touched++;
				return draft;
			},
			setEditorText: (t: string) => {
				touched++;
				draft = t;
			},
			custom: async (factory: (...a: any[]) => any, opts: unknown) => {
				overlay = opts;
				const tui = { terminal: { rows: 20 }, requestRender() {}, stop() {}, start() {} };
				comp = await factory(tui, {}, {}, () => {});
			},
		},
	};
	await openTranscript(ctx);
	assert.deepEqual(overlay, { overlay: true, overlayOptions: { width: "100%", maxHeight: "100%" } });
	assert.ok(plain(comp.render(60)).join("\n").includes("primeiro prompt"));
	assert.match(plain(comp.render(200)).join("\n"), /instantâneo da conversa ao abrir/); // rotulado: não acompanha streaming
	assert.equal(draft, "rascunho");
	assert.equal(touched, 0);
	await openTranscript({ ...ctx, hasUI: false });
	await openTranscript({ ...ctx, sessionManager: { getBranch: () => [] } });
	assert.match(notes[0], /interface interativa/);
	assert.match(notes[1], /vazia/);
});
