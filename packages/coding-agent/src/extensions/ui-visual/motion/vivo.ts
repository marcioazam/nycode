/**
 * Estado vivo das tools (Onda 10): quem precisa de redesenho, quando cada chamada começou e quando terminou.
 * Dois assinantes do relógio único: um contínuo (shimmer e tempo vivo, P06) e um de transição (assentamento e avanço
 * da barra, até 300 ms). Parado custa zero: sem entrada, nenhum dos dois fica assinado.
 */
import { movimento } from "../../ui/a11y.ts";
import { assinarQuadro, intervaloContinuo } from "./motion.ts";

type Chamada = { toolCallId?: string; invalidate?: () => void };
type Vivo = { inv: () => void; seen: number; until?: number };

const ativas = new Map<string, Vivo>();
const inicio = new Map<string, number>(); // performance.now() de tool_execution_start; só as que estão rodando
const fim = new Map<string, number>(); // performance.now() de tool_execution_end
const sair: [(() => void) | undefined, (() => void) | undefined] = [undefined, undefined];

const liga = (curta: boolean): void => {
	const k = curta ? 1 : 0;
	if (sair[k]) return;
	sair[k] = assinarQuadro(
		curta ? "ui-visual-tools-curta" : "ui-visual-tools",
		(t) => {
			// Quem deixou de ser desenhado (saiu da tela, foi recolhido) para de ser invalidado.
			const parado = curta ? 300 : Math.max(300, 3 * intervaloContinuo());
			let vivos = 0;
			for (const [id, v] of ativas) {
				if ((v.until !== undefined) !== curta) continue;
				if (v.until !== undefined && t >= v.until) {
					ativas.delete(id);
					v.inv(); // último quadro: desenha o estado assentado
				} else if (t - v.seen > parado) ativas.delete(id);
				else {
					v.inv();
					vivos++;
				}
			}
			if (!vivos) sair[k] = undefined;
			return vivos > 0;
		},
		{ transicao: curta },
	);
};

/** Chamado a cada desenho de uma tool animada: mantém o redesenho (até `ate`, quando é transição) e devolve o agora. */
export function tocar(ctx: Chamada, ate?: number): number {
	const now = performance.now();
	const id = ctx.toolCallId;
	if (!id || typeof ctx.invalidate !== "function" || movimento() === "desligado") return now;
	const antes = ativas.get(id);
	ativas.set(id, {
		inv: ctx.invalidate,
		seen: now,
		until: ate === undefined ? undefined : Math.max(ate, antes?.until ?? 0),
	});
	liga(ate !== undefined);
	return now;
}

export function iniciou(id: string, now = performance.now()): void {
	inicio.delete(id); // reinserir move para o fim: o mais antigo é sempre o primeiro
	inicio.set(id, now);
	if (inicio.size > INICIO_MAX) inicio.delete(inicio.keys().next().value as string); // sem teto, fins perdidos acumulam
}

const INICIO_MAX = 300;
/** Recomeço de sessão (session_start/shutdown, /reload): sem tool_execution_end uma chamada ficaria "rodando" para sempre. */
export function reiniciar(): void {
	inicio.clear();
	fim.clear();
	ativas.clear();
}

export function terminou(id: string, now = performance.now()): void {
	inicio.delete(id);
	ativas.delete(id);
	fim.set(id, now);
	if (fim.size > 300) fim.clear();
}

/** Idade do fim da chamada enquanto dura uma transição de `ms` (e mantém o redesenho até lá); depois, ou sem fim conhecido, undefined. */
export function idadeFim(ctx: Chamada, ms: number, agora = performance.now()): number | undefined {
	const t = ctx.toolCallId ? fim.get(ctx.toolCallId) : undefined;
	if (t === undefined) return undefined;
	const idade = agora - t;
	if (idade < 0 || idade >= ms) return undefined;
	tocar(ctx, t + ms);
	return idade;
}

/** Idade do início da execução enquanto dura a transição de entrada (preparando → executando); depois, ou sem início, undefined. */
export function idadeInicio(ctx: Chamada, ms: number): number | undefined {
	const t = ctx.toolCallId ? inicio.get(ctx.toolCallId) : undefined;
	if (t === undefined) return undefined;
	const idade = performance.now() - t;
	if (idade < 0 || idade >= ms) return undefined;
	tocar(ctx, t + ms);
	return idade;
}

export const TEMPO_VIVO_MIN_S = 2;
/** Tempo vivo no título (P06): `14s` a partir de 2 s de execução, um tique por segundo. Em `desligado` a duração só sai no fim. */
export function tempoVivo(
	id: string | undefined,
	now = performance.now(),
	env: Record<string, string | undefined> = process.env,
): string {
	const t0 = id ? inicio.get(id) : undefined;
	if (t0 === undefined || movimento(env) === "desligado") return "";
	const s = Math.floor((now - t0) / 1000);
	if (s < TEMPO_VIVO_MIN_S) return "";
	return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}

export const vivas = (): number => ativas.size;
/** performance.now() do início da execução (tool_execution_start), se a chamada ainda roda. */
export const inicioDe = (id: string | undefined): number | undefined => (id === undefined ? undefined : inicio.get(id));
export const rodando = (id: string | undefined): boolean => id !== undefined && inicio.has(id);
