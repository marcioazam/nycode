/**
 * Progresso na aba do terminal (OSC 9;4): 3 = indeterminado enquanto trabalha, 1;N = N% quando o Task tem total,
 * 4 = pausa enquanto uma pergunta espera você, 2 = erro, 0 = limpa. Reenviado a cada segundo (o Ghostty zera após
 * ~15 s). Em Ghostty, Windows Terminal, kitty ≥ 0.47, iTerm2 ≥ 3.6.6 ou NYCODE_TERM_PROGRESS=1; nunca em tmux (sem
 * passthrough garantido).
 */
import { execFileSync } from "node:child_process";
import { movimento } from "../ui/a11y.ts";

type Env = Record<string, string | undefined>;

export const KEEPALIVE_MS = 1000;

/** `a` ≥ `b` em versões `x.y.z` (partes ausentes valem 0). */
export const versaoMinima = (a: string | undefined, b: string): boolean => {
	if (!a) return false;
	const pa = a.split(".").map((n) => Number.parseInt(n, 10) || 0);
	const pb = b.split(".").map(Number);
	for (let i = 0; i < pb.length; i++) if ((pa[i] ?? 0) !== pb[i]) return (pa[i] ?? 0) > pb[i]!;
	return true;
};

let kittyCache: string | undefined | null = null;
/**
 * Versão do kitty em execução: o binário do processo (`/proc/<KITTY_PID>/exe`), senão o `kitty` do PATH. Antes da
 * 0.47 o kitty mostra `OSC 9` como notificação, então sem versão não liga. Desvio da D14 (XTVERSION): a resposta do
 * terminal chegaria no stdin que o @nycode/tui lê.
 */
export function versaoKitty(
	env: Env = process.env,
	rodar = (bin: string) =>
		execFileSync(bin, ["--version"], { encoding: "utf8", timeout: 500, stdio: ["ignore", "pipe", "ignore"] }),
): string | undefined {
	if (kittyCache !== null) return kittyCache;
	kittyCache = undefined;
	for (const bin of [env.KITTY_PID ? `/proc/${env.KITTY_PID}/exe` : "", "kitty"].filter(Boolean)) {
		try {
			kittyCache = /kitty (\d+\.\d+(?:\.\d+)?)/.exec(rodar(bin))?.[1];
			if (kittyCache) break;
		} catch {}
	}
	return kittyCache;
}
export const esquecerKitty = (): void => {
	kittyCache = null;
};

export function suportado(env: Env = process.env, kitty: (env: Env) => string | undefined = versaoKitty): boolean {
	if (movimento(env) === "desligado") return false;
	if (env.TMUX) return false;
	if (env.NYCODE_TERM_PROGRESS === "0") return false;
	if (env.NYCODE_TERM_PROGRESS === "1") return true;
	if (env.TERM_PROGRAM === "ghostty" || env.WT_SESSION) return true;
	if (env.TERM_PROGRAM === "iTerm.app") return versaoMinima(env.TERM_PROGRAM_VERSION, "3.6.6");
	return Boolean(env.KITTY_WINDOW_ID) && versaoMinima(kitty(env), "0.47");
}

export const OSC = {
	trabalhando: "\x1b]9;4;3\x07",
	percentual: (p: number) => `\x1b]9;4;1;${Math.max(0, Math.min(100, Math.round(p)))}\x07`,
	pausa: (p = 0) => `\x1b]9;4;4;${Math.max(0, Math.min(100, Math.round(p)))}\x07`,
	erro: "\x1b]9;4;2;100\x07",
	limpar: "\x1b]9;4;0\x07",
};

interface Deps {
	escrever: (s: string) => void;
	/** Config `progresso`, lida a cada uso (o painel muda em vida). */
	ligado: () => boolean;
	env?: Env;
	kitty?: (env: Env) => string | undefined;
	setIntervalFn?: (f: () => void, ms: number) => unknown;
	clearIntervalFn?: (t: unknown) => void;
}

export function criarProgresso(d: Deps) {
	const env = d.env ?? process.env;
	const set = d.setIntervalFn ?? ((f, ms) => setInterval(f, ms));
	const clear = d.clearIntervalFn ?? ((t) => clearInterval(t as ReturnType<typeof setInterval>));
	let timer: unknown;
	let emitiu = false;
	let pct: number | undefined;
	let esperando = false;
	const atual = () => (esperando ? OSC.pausa(pct) : pct === undefined ? OSC.trabalhando : OSC.percentual(pct));
	const parar = () => {
		if (timer !== undefined) clear(timer);
		timer = undefined;
	};
	const ativo = () => d.ligado() && suportado(env, d.kitty);
	const emitir = (s: string) => {
		d.escrever(s);
		emitiu = s !== OSC.limpar;
	};
	return {
		trabalhando() {
			parar();
			if (!ativo()) return;
			emitir(atual());
			timer = set(() => (ativo() ? emitir(atual()) : parar()), KEEPALIVE_MS);
			(timer as { unref?: () => void } | undefined)?.unref?.();
		},
		/** Andamento do Task (0–100) ou `undefined` sem total; vale no próximo envio. */
		percentual(p: number | undefined) {
			pct = p;
			if (timer !== undefined) emitir(atual());
		},
		/** Pergunta aberta (estado 4) ou respondida (volta ao andamento). */
		esperar(sim: boolean) {
			esperando = sim;
			if (timer !== undefined) emitir(atual());
		},
		erro() {
			parar();
			if (ativo()) emitir(OSC.erro);
		},
		/** Terminou, interrompeu ou shutdown: só escreve se algo foi emitido antes. */
		limpar() {
			parar();
			if (emitiu && suportado(env, d.kitty)) emitir(OSC.limpar);
			emitiu = false;
			pct = undefined;
			esperando = false;
		},
	};
}
