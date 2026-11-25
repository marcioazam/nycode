// vitest: test/harness/extensions/notify/progresso.test.ts
import assert from "node:assert/strict";
import { afterEach, beforeEach, test, vi } from "vitest";
import * as __typed_avisos_progresso from "../../../../src/extensions/notify/progresso.ts";

// The rendering reads TERM: pin it so the suite does not depend on the shell it runs in.
beforeEach(() => {
	vi.stubEnv("TERM", "xterm-256color");
});
afterEach(() => {
	vi.unstubAllEnvs();
});

// The source tests drive the modules with partial fakes, without types.
const __a_avisos_progresso: any = __typed_avisos_progresso;

const p = __a_avisos_progresso;

test("terminal suportado: Ghostty, Windows Terminal, NYCODE_TERM_PROGRESS; não: outros, 0, tmux", () => {
	assert.equal(p.suportado({ TERM_PROGRAM: "ghostty" }), true);
	assert.equal(p.suportado({ WT_SESSION: "x" }), true);
	assert.equal(p.suportado({ TERM_PROGRAM: "kitty" }), false);
	assert.equal(p.suportado({}), false);
	assert.equal(p.suportado({ NYCODE_TERM_PROGRESS: "1" }), true);
	assert.equal(p.suportado({ TERM_PROGRAM: "ghostty", NO_PROGRESS: "1" }), false);
	assert.equal(p.suportado({ TERM_PROGRAM: "ghostty", TERM: "dumb" }), false);
	assert.equal(p.suportado({ TERM_PROGRAM: "ghostty", NYCODE_REDUCED_MOTION: "0" }), true);
	assert.equal(p.suportado({ TERM_PROGRAM: "ghostty", NYCODE_TERM_PROGRESS: "0" }), false);
	assert.equal(p.suportado({ TERM_PROGRAM: "ghostty", TMUX: "/tmp/tmux-1/default,1,0" }), false);
	assert.equal(p.suportado({ NYCODE_TERM_PROGRESS: "1", TMUX: "x" }), false);
});

/** Relógio injetado: `passa(ms)` dispara os intervalos pendentes. */
function cria(env: Record<string, string>, ligado = () => true) {
	const out: string[] = [];
	const timers = new Map<number, { f: () => void; ms: number; resto: number }>();
	let id = 0;
	const pr = p.criarProgresso({
		escrever: (s: string) => out.push(s),
		ligado,
		env,
		setIntervalFn: (f: () => void, ms: number) => {
			id++;
			timers.set(id, { f, ms, resto: ms });
			return id;
		},
		clearIntervalFn: (t: number) => timers.delete(t),
	});
	const passa = (ms: number) => {
		for (let k = 0; k < ms; k += 100)
			for (const t of [...timers.values()]) {
				t.resto -= 100;
				if (t.resto <= 0) {
					t.resto = t.ms;
					t.f();
				}
			}
	};
	return { out, pr, passa, timers };
}
const GHOSTTY = { TERM_PROGRAM: "ghostty" };

test("estado 3 ao trabalhar, reenviado a cada segundo; 0 ao terminar e o timer morre", () => {
	const { out, pr, passa, timers } = cria(GHOSTTY);
	pr.trabalhando();
	assert.deepEqual(out, ["\x1b]9;4;3\x07"]);
	passa(3000);
	assert.equal(out.length, 4);
	assert.ok(out.every((s) => s === "\x1b]9;4;3\x07"));
	pr.limpar();
	assert.equal(out.at(-1), "\x1b]9;4;0\x07");
	assert.equal(timers.size, 0);
	passa(5000);
	assert.equal(out.length, 5);
});

test("estado 2 no erro (para o keep-alive) e 0 só uma vez", () => {
	const { out, pr, passa, timers } = cria(GHOSTTY);
	pr.trabalhando();
	pr.erro();
	assert.equal(out.at(-1), "\x1b]9;4;2;100\x07");
	assert.equal(timers.size, 0);
	passa(3000);
	assert.equal(out.length, 2);
	pr.limpar();
	pr.limpar();
	assert.deepEqual(out.slice(2), ["\x1b]9;4;0\x07"]);
});

test("terminal não suportado, tmux ou progresso:false: não escreve nada", () => {
	for (const [env, ligado] of [
		[{ TERM_PROGRAM: "kitty" }, true],
		[{ ...GHOSTTY, TMUX: "x" }, true],
		[GHOSTTY, false],
	] as const) {
		const { out, pr, passa, timers } = cria(env, () => ligado);
		pr.trabalhando();
		passa(3000);
		pr.erro();
		pr.limpar();
		assert.deepEqual(out, []);
		assert.equal(timers.size, 0);
	}
});

test("desligar no painel em pleno turno para o reenvio", () => {
	let ligado = true;
	const { out, pr, passa, timers } = cria(GHOSTTY, () => ligado);
	pr.trabalhando();
	ligado = false;
	passa(1000);
	assert.equal(out.length, 1);
	assert.equal(timers.size, 0);
});

// Onda 10, P22: kitty ≥ 0.47 e iTerm2 ≥ 3.6.6; estado 1 com % do Task e 4 enquanto uma pergunta espera.
test("P22 kitty e iTerm2 pela versão; kitty sem versão conhecida não liga", () => {
	const v = (s: string | undefined) => () => s;
	assert.equal(p.suportado({ KITTY_WINDOW_ID: "1" }, v("0.47.0")), true);
	assert.equal(p.suportado({ KITTY_WINDOW_ID: "1" }, v("0.50.1")), true);
	assert.equal(p.suportado({ KITTY_WINDOW_ID: "1" }, v("0.45.0")), false);
	assert.equal(p.suportado({ KITTY_WINDOW_ID: "1" }, v(undefined)), false);
	assert.equal(p.suportado({ KITTY_WINDOW_ID: "1", TMUX: "x" }, v("0.50.0")), false);
	assert.equal(p.suportado({ TERM_PROGRAM: "iTerm.app", TERM_PROGRAM_VERSION: "3.6.6" }), true);
	assert.equal(p.suportado({ TERM_PROGRAM: "iTerm.app", TERM_PROGRAM_VERSION: "3.6.5" }), false);
	assert.equal(p.suportado({ TERM_PROGRAM: "iTerm.app", TERM_PROGRAM_VERSION: "3.10" }), true);
	assert.equal(p.suportado({ TERM_PROGRAM: "iTerm.app" }), false);
});

test("P22 versaoKitty: binário do processo primeiro, depois o PATH; guarda o resultado", () => {
	p.esquecerKitty();
	const chamados: string[] = [];
	const rodar = (bin: string) => {
		chamados.push(bin);
		if (bin.startsWith("/proc")) throw new Error("sem /proc");
		return "kitty 0.47.1 created by Kovid Goyal\n";
	};
	assert.equal(p.versaoKitty({ KITTY_PID: "42" }, rodar), "0.47.1");
	assert.deepEqual(chamados, ["/proc/42/exe", "kitty"]);
	assert.equal(p.versaoKitty({ KITTY_PID: "42" }, rodar), "0.47.1");
	assert.equal(chamados.length, 2);
	p.esquecerKitty();
});

test("P22 estados: % do Task (estado 1), pausa na pergunta (4) e volta; limpar zera os dois", () => {
	const { out, pr, passa } = cria(GHOSTTY);
	pr.percentual(40); // antes de trabalhar: só guarda
	assert.deepEqual(out, []);
	pr.trabalhando();
	assert.equal(out.at(-1), "\x1b]9;4;1;40\x07");
	pr.esperar(true);
	assert.equal(out.at(-1), "\x1b]9;4;4;40\x07");
	passa(1000);
	assert.equal(out.at(-1), "\x1b]9;4;4;40\x07", "o keep-alive mantém a pausa");
	pr.esperar(false);
	pr.percentual(undefined);
	assert.equal(out.at(-1), "\x1b]9;4;3\x07");
	pr.percentual(250);
	assert.equal(out.at(-1), "\x1b]9;4;1;100\x07", "limitado a 100");
	pr.limpar();
	pr.trabalhando();
	assert.equal(out.at(-1), "\x1b]9;4;3\x07");
});
