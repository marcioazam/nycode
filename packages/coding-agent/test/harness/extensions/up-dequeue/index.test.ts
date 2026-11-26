// up-dequeue (wave 9, variant C): the queue view in Portuguese; Up stays exclusive to the history (no rewrite to Alt+Up).
import assert from "node:assert/strict";
import { matchesKey } from "@nycode/tui";
import { afterEach, beforeEach, test, vi } from "vitest";
import register, {
	attachQueueView,
	dequeueKeyLabel,
	MAX_SHOWN,
	NASCE_MS,
	restyleQueue,
} from "../../../../src/extensions/up-dequeue/index.ts";

// The rendering reads TERM: pin it so the suite does not depend on the shell it runs in.
beforeEach(() => {
	vi.stubEnv("TERM", "xterm-256color");
});
afterEach(() => {
	vi.unstubAllEnvs();
});

test("Shift+← e Shift+Backspace são reconhecidos pelo @nycode/tui e ↑ fica exclusivo para o histórico", () => {
	assert.equal(matchesKey("\x1b[1;2D", "shift+left"), true);
	assert.equal(matchesKey("\x1b[1;2:1D", "shift+left"), true);
	assert.equal(matchesKey("\x1b[127;2u", "shift+backspace"), true);
	assert.equal(matchesKey("\x1b[127;2:1u", "shift+backspace"), true);
	assert.equal(matchesKey("\x1b[A", "shift+left"), false);
	assert.equal(matchesKey("\x1b[A", "up"), true);
});

test("dequeueKeyLabel: formata a tecla ativa do nycode e cai em shift+←", () => {
	assert.equal(dequeueKeyLabel("Shift+Left"), "shift+←");
	assert.equal(dequeueKeyLabel("Shift+Left/Ctrl+Shift+Left"), "shift+←");
	assert.equal(dequeueKeyLabel("Ctrl+Shift+Up"), "ctrl+shift+↑");
	assert.equal(dequeueKeyLabel(undefined), "shift+←");
});

test("extensão não intercepta o teclado (↑ continua sendo histórico) e embrulha o contêiner da fila", () => {
	let onStart: any,
		terminalListeners = 0,
		widget: any;
	const ctx = (hasUI: boolean) => ({
		hasUI,
		ui: {
			onTerminalInput: () => {
				terminalListeners++;
			},
			setWidget: (_k: string, f: any) => {
				widget = f;
			},
		},
	});
	register({
		on: (_e: string, fn: any) => {
			onStart = fn;
		},
	} as any);
	onStart({}, ctx(false));
	assert.equal(widget, undefined);
	onStart({}, ctx(true));
	assert.equal(terminalListeners, 0, "nenhum onTerminalInput: ↑ não é mais desviado");
	const box = { children: [], render: (_w?: number) => [" \x1b[2mSteering: oi\x1b[0m"] };
	const w = (widget as unknown as (...a: unknown[]) => { render(): unknown[]; invalidate(): void })(
		{ children: [{}, box] },
		{ fg: (c: string, t: string) => `<${c}>${t}`, bold: (s: string) => `*${s}*` },
	);
	assert.deepEqual(w.render(), []);
	w.invalidate();
	assert.match(box.render(80)[0], /<accent>▎ <accent>\*Na fila\* <dim>· 1/);
	assert.match(box.render(80)[1], /<accent>▎ <dim>1 {2}<text>oi/);
	assert.match(box.render(80)[1], /<syntaxType>no próximo passo$/);
});

const st = {
	dim: (s: string) => s,
	text: (s: string) => s,
	muted: (s: string) => s,
	accent: (s: string) => s,
	fit: (s: string, w: number) => (s.length > w ? `${s.slice(0, w - 1)}…` : s),
	width: (s: string) => s.length,
};
const native = (...l: string[]) => [
	"",
	...l.map((x) => ` \x1b[2m${x}\x1b[22m`),
	" \x1b[2m↳ Shift+Left to edit all queued messages\x1b[22m",
];

test("fila Variante C: alinhada à cápsula (sem padding), editar + excluir + enviar agora, sem a dica nativa", () => {
	// Alinhada à cápsula do editor: antes 3 colunas de padding de cada lado; agora ▎ na coluna 0 e nada no fim.
	const out = restyleQueue(
		["saída do bash", ...native("Steering: roda os testes", "Follow-up: atualiza o changelog")],
		90,
		st,
	);
	assert.equal(out[0], "saída do bash");
	assert.equal(out[1], "");
	assert.match(out[2], /^▎ Na fila · 2 +shift\+← editar · shift\+⌫ × excluir · ctrl\+⏎ enviar agora$/);
	assert.match(out[3], /^▎ 1 {2}roda os testes +no próximo passo$/);
	assert.match(out[4], /^▎ 2 {2}atualiza o changelog +ao terminar$/);
	assert.equal(out.length, 5);
	for (const l of out.slice(2)) assert.equal(l.length, 90);
});

test("fila: estreita encurta as teclas progressivamente e trunca a mensagem; além do limite resume", () => {
	// Alinhada à cápsula do editor: antes 3 colunas de padding de cada lado; agora ▎ na coluna 0 e nada no fim.
	const mid = restyleQueue(native("Steering: uma mensagem bem comprida para caber"), 56, st);
	assert.match(mid[1], /^▎ Na fila · 1 +shift\+← editar · shift\+⌫ × excluir$/);
	const narrow = restyleQueue(native("Steering: uma mensagem bem comprida para caber"), 40, st);
	assert.match(narrow[1], /^▎ Na fila · 1 +shift\+← editar$/);
	assert.match(narrow[2], /… +no próximo passo$/);
	assert.ok(narrow.every((l: string) => l.length <= 40));
	assert.equal(restyleQueue(native("Steering: x"), 14, st)[1].trim(), "▎Na fila · 1");
	const many = restyleQueue(native(...Array.from({ length: MAX_SHOWN + 2 }, (_, i) => `Steering: m${i}`)), 70, st);
	assert.equal(many.length, 1 + 1 + MAX_SHOWN + 1);
	assert.match(many.at(-1) as never, /^▎ … {2}mais 2 /);
});

test("fila: texto que não casa (o nycode mudou) passa intacto; contêiner ausente não quebra; /reload não embrulha duas vezes", () => {
	const other = ["", " Queued: x", " ↳ outra dica"];
	assert.deepEqual(restyleQueue(other, 60, st), other);
	attachQueueView(undefined, () => st);
	attachQueueView({ children: [{}] }, () => st);
	attachQueueView({ children: [{}, { render: () => [] }] }, () => st);
	let calls = 0;
	const box = {
		children: [],
		render: (_w?: number) => {
			calls++;
			return native("Follow-up: depois");
		},
	};
	const tui = { children: [{}, box] };
	attachQueueView(tui, () => st);
	attachQueueView(tui, () => ({ ...st, dim: (s: string) => `[${s}]` }));
	const out = box.render(60);
	assert.equal(calls, 1);
	assert.match(out[1], /^▎ Na fila \[· 1\]/);
	assert.match(out[2], /\[ao terminar\]$/);
});

const tag = {
	dim: (s: string) => `<d>${s}</d>`,
	text: (s: string) => `<t>${s}</t>`,
	muted: (s: string) => `<m>${s}</m>`,
	accent: (s: string) => `<a>${s}</a>`,
	cyan: (s: string) => `<c>${s}</c>`,
	err: (s: string) => `<e>${s}</e>`,
	fit: (s: string, _w: number) => s,
	width: (s: string) => s.replace(/<\/?[a-z]>/g, "").length,
};

test('fila: trilho accent em todas as linhas de item e em "mais N"; 1º item em text, demais em muted, steering em cyan', () => {
	const out = restyleQueue(native(...Array.from({ length: MAX_SHOWN + 1 }, (_, i) => `Steering: m${i}`)), 90, tag);
	const items = out.slice(2);
	assert.equal(items.length, MAX_SHOWN + 1);
	for (const l of items) assert.match(l, /^<a>▎<\/a> /);
	assert.match(items[0], /<d>1<\/d> {2}<t>m0<\/t>.*<c>no próximo passo<\/c>$/);
	for (const [i, l] of items.slice(1, MAX_SHOWN).entries())
		assert.match(l, new RegExp(`<d>${i + 2}</d> {2}<m>m${i + 1}</m>`));
	assert.match(items.at(-1) as never, /^<a>▎<\/a> <d>… {2}mais 1<\/d>/);
});

test("fila: largura continua respeitada em terminal estreito e largo", () => {
	for (const w of [12, 20, 30, 40, 80]) {
		const out = restyleQueue(
			native("Steering: uma mensagem bem comprida para caber", "Follow-up: outra também bem comprida"),
			w,
			st,
		);
		for (const l of out.slice(1)) assert.ok(l.length <= w, `${w}: ${l.length} ${JSON.stringify(l)}`);
	}
});

// Nasce do fundo: mensagem nova na fila → o bloco sobe do fundo
// em NASCE_MS; depois fica como sempre. Sem `nasce` no estilo (tema sem RGB), aparece direto.
test("fila: mensagem nova nasce do fundo; depois assenta", () => {
	const amb = { NO_COLOR: process.env.NO_COLOR, NYCODE_REDUCED_MOTION: process.env.NYCODE_REDUCED_MOTION };
	delete process.env.NO_COLOR;
	delete process.env.NYCODE_REDUCED_MOTION;
	try {
		let itens = ["Steering: oi"];
		let _pedidos = 0;
		const box = { children: [], render: (_w?: number) => native(...itens) };
		const cor = {
			...st,
			accent: (s: string) => `\x1b[38;2;100;150;250m${s}\x1b[39m`,
			nasce: () =>
				[
					[10, 10, 10],
					[200, 200, 200],
				] as [number[], number[]],
		};
		let agora = 1000;
		attachQueueView(
			{
				children: [{}, box],
				requestRender: () => {
					_pedidos++;
				},
			},
			() => cor,
			() => agora,
		);
		const trilho = (ls: string[]) => /\x1b\[38;2;([\d;]+)m▎/.exec(ls.find((l) => l.includes("▎"))!)?.[1];
		assert.notEqual(trilho(box.render(80)), "100;150;250", "chegando: o trilho ainda vem do fundo");
		agora += NASCE_MS / 2;
		const meio = trilho(box.render(80));
		assert.ok(meio !== "100;150;250", `no meio ainda esmaecido: ${meio}`);
		agora += NASCE_MS;
		assert.equal(trilho(box.render(80)), "100;150;250", "assentado");
		itens = ["Steering: oi", "Follow-up: mais"];
		assert.notEqual(trilho(box.render(80)), "100;150;250", "outra mensagem nova: nasce de novo");
	} finally {
		for (const [k, v] of Object.entries(amb)) if (v !== undefined) process.env[k] = v;
	}
});

// Item escolhido: shift+↑/↓ (patch send-now) marca um item; número em accent e texto em negrito, janela o acompanha.
test("fila: item escolhido em destaque; fora da janela de MAX_SHOWN ela rola até ele; índice inválido = sem escolha", () => {
	const tb = { ...tag, bold: (x: string) => `<b>${x}</b>` };
	const out = restyleQueue(native("Steering: s1", "Follow-up: f1", "Follow-up: f2"), 120, tb, 1).slice(2);
	assert.match(out[1], /<a><b>2<\/b><\/a> {2}<b><t>f1<\/t><\/b>/);
	assert.match(out[0], /<d>1<\/d> {2}<m>s1<\/m>/, "com escolha, o 1º volta a muted");
	assert.match(out[2], /<d>3<\/d> {2}<m>f2<\/m>/);
	const longa = restyleQueue(
		native(...Array.from({ length: MAX_SHOWN + 2 }, (_, i) => `Steering: m${i}`)),
		120,
		tb,
		MAX_SHOWN + 1,
	).slice(2);
	assert.match(longa[MAX_SHOWN - 1], new RegExp(`<a><b>${MAX_SHOWN + 2}</b></a> {2}<b><t>m${MAX_SHOWN + 1}</t></b>`));
	assert.match(longa[0], /<d>3<\/d>/, "a janela começa no 3º");
	assert.deepEqual(restyleQueue(native("Steering: s1"), 120, tb, 7), restyleQueue(native("Steering: s1"), 120, tb));
});
