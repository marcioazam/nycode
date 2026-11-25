/**
 * Auto-resume: resumes the session by itself when the provider fails with a transient error AFTER nycode's internal
 * retries are exhausted (settings retry.maxRetries=10, ~6 min). Reason: the 2026-11-13 503 incidents (Anthropic
 * outage) left sessions stopped mid-work, in the main session and in `subagent` children (NYCODE_SUBAGENT=1), so it
 * applies to both.
 *
 * Mechanism: `agent_before_settle` looks at the last assistant message; if it ended in a retryable error (not a context
 * overflow), it waits 30s/90s/3/5/10 min (abortable, with ±20% jitter) and returns an `auto-resume` `custom_message`
 * with `continue: true`. Limit: 5 consecutive attempts (counted by the `auto-resume` messages after the last reply
 * without error or user message); then it gives up with a warning. `harness.autoResume` (NYCODE_AUTO_RESUME wins)
 * switches it off. Fails open: any exception releases the session.
 *
 * What counts as transient or as an overflow is decided by @nycode/ai (isRetryableAssistantError, isContextOverflow).
 *
 * Account limit: the 429 "would exceed your account's rate limit" is not transient. `message_end` marks the error with
 * "quota exceeded" (a non-retryable pattern), so the 10 internal retries are not spent; the settle waits until the
 * reset (+1 min) and resumes by itself. The time comes from the 429 headers (`anthropic-ratelimit-unified-*reset`,
 * `retry-after`), else from the HUD cache (usage-cache.json, the same source as "resets in 41m"), else 15 min. At most
 * 3 waits in a row. Children (NYCODE_SUBAGENT) and sessions without UI (`-p`, `ctx.hasUI` false) fail fast (give_up,
 * warning on stderr); the main session with a UI waits.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type AssistantMessage, isContextOverflow, isRetryableAssistantError } from "@nycode/ai";
import type { ExtensionAPI } from "../../core/extensions/types.ts";
import { resolveNycodeSettings } from "../../core/settings-nycode.ts";
import { userConfigDir } from "../_shared/settings/config-dir.ts";
import { barraOitavos } from "../ui-visual/motion/motion.ts";

type Entry = Record<string, any>;
export type Decision =
	| { action: "none" }
	| { action: "resume"; attempt: number; delayMs: number; message: string; kind?: "limit" }
	| { action: "give_up"; message: string };

// ~20 min beyond the ~6 min of internal retries: covers a long network/provider outage; a failure is not billed.
export const DELAYS_MS = [30_000, 90_000, 180_000, 300_000, 600_000];
const MAX_ERR = 200;

/** Whether an assistant message that ended in an error is a transient one worth resuming: the classifier of
 * @nycode/ai, with a context overflow (which resuming cannot fix) excluded first, as that function documents. */
function retryable(message: AssistantMessage): boolean {
	return !isContextOverflow(message) && isRetryableAssistantError(message);
}

const ACCOUNT_LIMIT = /exceed your account'?s rate limit|hit your (?:usage )?limit|usage limit (?:reached|exceeded)/i;
const LIMIT_MARK = "quota exceeded (account usage limit; auto-resume waits for the reset)";
export const LIMIT_WAITS = 3;
/** Marca invisível lida pelo patch de avisos do core (caixaNeutra): caixa com fundo de aviso, como a da trava de modelos. */
const CAIXA_AVISO = "\u2063\u2063";
const LIMIT_MARGIN_MS = 60_000;
const LIMIT_UNKNOWN_MS = 15 * 60_000;
// The longest window is 7 days; a later reset is bogus and would overflow setTimeout (fires at once past ~24.8 days).
const LIMIT_MAX_AHEAD_MS = 8 * 86_400_000;

/** The account-limit error rewritten so the retry logic treats it as non-retryable; undefined for anything else. */
export function markLimit(error: string): string | undefined {
	return ACCOUNT_LIMIT.test(error) && !error.startsWith(LIMIT_MARK) ? `${LIMIT_MARK}: ${error}` : undefined;
}

const epochMs = (v: unknown): number | undefined => {
	if (typeof v === "number") return Number.isFinite(v) ? v * 1000 : undefined;
	if (typeof v !== "string" || !v.trim()) return undefined;
	const ms = /^\d+(\.\d+)?$/.test(v.trim()) ? Number(v) * 1000 : Date.parse(v);
	return Number.isFinite(ms) ? ms : undefined;
};

/** When the exhausted window resets (epoch ms): 429 headers first, then the HUD's usage cache; future times only. */
export function limitReset(headers: Record<string, string>, cache: any, now: number): number | undefined {
	const future = (xs: Array<number | undefined>) =>
		xs.filter((x): x is number => x !== undefined && x > now && x <= now + LIMIT_MAX_AHEAD_MS);
	const retryAfter = headers["retry-after"]?.trim() ?? "";
	const h = (k: string) => headers[`anthropic-ratelimit-unified-${k}`];
	const windows = ["5h", "7d", "7d_opus", "7d_sonnet"].map((w) => ({
		rejected: h(`${w}-status`) === "rejected",
		at: epochMs(h(`${w}-reset`)),
	}));
	const fromHeaders = [
		future([epochMs(h("reset"))])[0],
		Math.max(...future(windows.filter((w) => w.rejected).map((w) => w.at)), -Infinity),
		future([/^\d+$/.test(retryAfter) ? now + Number(retryAfter) * 1000 : Date.parse(retryAfter)])[0],
		Math.min(...future(windows.map((w) => w.at)), Infinity),
	].find((x) => x !== undefined && Number.isFinite(x));
	if (fromHeaders !== undefined) return fromHeaders;
	const wins = Object.values(cache?.rate_limits ?? {}) as Array<{ used_percentage?: number; resets_at?: number }>;
	const full = future(wins.filter((w) => (w?.used_percentage ?? 0) >= 95).map((w) => epochMs(w?.resets_at)));
	if (full.length > 0) return Math.max(...full);
	const any = future(wins.map((w) => epochMs(w?.resets_at)));
	return any.length > 0 ? Math.min(...any) : undefined;
}

/** Atraso para a tela: minutos só quando exatos (90s fica `90s`, não `2 min`). */
export const delayText = (ms: number): string =>
	ms >= 60_000 && ms % 60_000 === 0 ? `${ms / 60_000} min` : `${Math.round(ms / 1000)}s`;

const clock = (ms: number) =>
	new Date(ms).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

const SINAL_LIMITE = Symbol.for("nycode:cartao-limite");
const minutos = (ms: number) => Math.ceil(Math.max(0, ms) / 60_000);
type TemaCartao = { fg: (cor: string, texto: string) => string; bold: (texto: string) => string };

/** O core desenha este objeto no chat, nunca no histórico de prompts nem no contexto do modelo. */
function cartaoLimite(erro: string, inicio: number, atraso: number, agora: () => number) {
	const ascii = process.env.NYCODE_ASCII_ICONS === "1" || /^(?:dumb|linux)$/.test(process.env.TERM ?? "");
	const fim = inicio + atraso;
	const provedor = ACCOUNT_LIMIT.exec(erro.slice(LIMIT_MARK.length))?.[0];
	const progresso = (t: number) => Math.max(0, Math.min(1, (t - inicio) / atraso));
	let assinatura = "";
	let final: { retomou: boolean; hora: number } | undefined;
	return {
		erro,
		redesenhar: undefined as (() => void) | undefined,
		encerrado: () => final !== undefined,
		linhas(t: TemaCartao) {
			const titulo = "Limite de uso da conta";
			const dica = "/model troca de modelo";
			if (final?.retomou)
				return [
					t.fg("success", t.bold(`${titulo} · retomou às ${clock(final.hora)}`)),
					t.fg("dim", `esperou ${minutos(final.hora - inicio)} min`),
				];
			if (final)
				return [
					t.fg("dim", `${titulo} · espera cancelada`),
					t.fg("dim", `${ascii ? "cima" : "↑"} traz o pedido de volta · ${dica}`),
				];
			const hora = agora();
			const barra = barraOitavos(progresso(hora), 6, {
				ascii,
				ok: (s) => t.fg("warning", s),
				resto: (s) => t.fg("borderMuted", s),
			});
			return [
				t.fg("warning", t.bold(titulo)),
				`${barra} retoma às ${clock(fim)} · faltam ${minutos(fim - hora)} min`,
				t.fg("dim", `esc cancela · ${dica}`),
				...(provedor ? [t.fg("dim", `provedor: ${provedor}`)] : []),
			];
		},
		hora: clock(inicio),
		atualizar() {
			if (final || !this.redesenhar) return;
			const t = agora();
			const proxima = `${Math.round(progresso(t) * (ascii ? 6 : 48))}/${minutos(fim - t)}`;
			if (proxima === assinatura) return;
			assinatura = proxima;
			this.redesenhar();
		},
		terminar(retomou: boolean) {
			final = { retomou, hora: agora() };
			this.redesenhar?.();
			this.redesenhar = undefined;
		},
	};
}

function decideLimit(
	branch: Entry[],
	last: number,
	error: string,
	env: Record<string, string | undefined>,
	opts: { now: number; resetAt?: number; hasUI?: boolean },
): Decision {
	if (env.NYCODE_SUBAGENT) return { action: "none" };
	// No UI (-p): nobody can see or cancel a long wait (gate #28: 600 s lost to a headless 429); end now.
	if (opts.hasUI === false)
		return {
			action: "give_up",
			message: `Auto-resume: account usage limit reached in a session without a UI; not waiting for the reset ("${error.slice(0, MAX_ERR)}").`,
		};
	let prior = 0;
	for (let i = last; i >= 0; i--) {
		const e = branch[i];
		if (e.type === "message" && e.message?.role === "assistant" && e.message.stopReason !== "error") break;
		if (e.type === "message" && e.message?.role === "user") break; // prompt novo: contagem recomeça
		if (e.type === "custom_message" && e.customType === "auto-resume-limit") prior++;
	}
	if (prior >= LIMIT_WAITS)
		return {
			action: "give_up",
			message: `Retomada automática desistiu após ${prior} esperas pelo limite de uso da conta ("${error.slice(0, MAX_ERR)}").`,
		};
	const until = opts.resetAt === undefined ? opts.now + LIMIT_UNKNOWN_MS : opts.resetAt + LIMIT_MARGIN_MS;
	return {
		action: "resume",
		kind: "limit",
		attempt: prior + 1,
		delayMs: until - opts.now,
		message:
			`Auto-resume after the account usage limit (wait ${prior + 1}/${LIMIT_WAITS}, resumed at ${clock(until)}${opts.resetAt === undefined ? ", reset time unknown" : ""}). ` +
			"Continue exactly where you stopped; do not repeat completed tool calls or side effects — check current state first if unsure.",
	};
}

export function decideResume(
	branch: Entry[],
	env: Record<string, string | undefined> = process.env,
	opts: { now: number; resetAt?: number; hasUI?: boolean } = { now: Date.now() },
): Decision {
	let last = -1;
	for (let i = branch.length - 1; i >= 0; i--) {
		if (branch[i].type === "message" && branch[i].message?.role === "assistant") {
			last = i;
			break;
		}
	}
	if (last < 0) return { action: "none" };
	const msg = branch[last].message;
	const error = String(msg.errorMessage ?? "");
	if (msg.stopReason === "error" && error.startsWith(LIMIT_MARK)) return decideLimit(branch, last, error, env, opts);
	if (!retryable(msg)) return { action: "none" };

	let prior = 0;
	for (let i = last; i >= 0; i--) {
		const e = branch[i];
		if (e.type === "message" && e.message?.role === "assistant" && e.message.stopReason !== "error") break;
		if (e.type === "message" && e.message?.role === "user") break; // prompt novo: contagem recomeça
		if (e.type === "custom_message" && e.customType === "auto-resume") prior++;
	}
	if (prior >= DELAYS_MS.length) {
		return {
			action: "give_up",
			message: `Retomada automática desistiu após ${prior} tentativas; o provedor continua falhando ("${error.slice(0, MAX_ERR)}").`,
		};
	}
	const attempt = prior + 1;
	return {
		action: "resume",
		attempt,
		delayMs: DELAYS_MS[prior],
		message:
			`Auto-resume ${attempt}/${DELAYS_MS.length}: the previous request failed with a transient provider error ("${error.slice(0, MAX_ERR)}"). ` +
			"Continue exactly where you stopped; do not repeat completed tool calls or side effects — check current state first if unsure.",
	};
}

/** Delay with ±20% jitter (rand in [0,1)): keeps N children that failed together from coming back at the same instant. */
export const jitter = (ms: number, rand: () => number = Math.random): number => Math.round(ms * (0.8 + 0.4 * rand()));

/** Waits `ms`; returns false if aborted first. */
export function sleep(ms: number, signal?: AbortSignal): Promise<boolean> {
	if (signal?.aborted) return Promise.resolve(false);
	return new Promise((resolve) => {
		const done = (ok: boolean) => {
			clearTimeout(timer);
			signal?.removeEventListener("abort", onAbort);
			resolve(ok);
		};
		const onAbort = () => done(false);
		const timer = setTimeout(() => done(true), ms);
		signal?.addEventListener("abort", onAbort, { once: true });
	});
}

// esc, ctrl+c (cru e no protocolo kitty). ponytail: caps/num lock mudam o modificador do kitty e não casam; a fila e o
// enviar-agora seguem acordando a espera.
const TECLA_CANCELA = /^(?:\x1b|\x03|\x1b\[27(?:;1)?(?::[12])?u|\x1b\[99;5(?::[12])?u)$/;
const POLL_FILA_MS = 250;

/** Sinal próprio da espera. Nesta fase (agent_before_settle) o run do agente já terminou: `ctx.signal` é undefined e o abort
 * do nycode não acorda ninguém, então a sessão ficava presa até o reset (bug observado). Acordam a espera:
 * `ctx.signal` (se houver), esc/ctrl+c, mensagem do usuário na fila e o enviar-agora (`globalThis.__piAutoResumeCancel`). */
function cancelavel(
	ctx: any,
	atualizar?: () => void,
): { signal: AbortSignal; cancelar: () => void; soltar: () => void } {
	const own = new AbortController();
	const abortar = () => own.abort();
	if (ctx.signal?.aborted) abortar();
	else ctx.signal?.addEventListener?.("abort", abortar, { once: true });
	let off: (() => void) | undefined;
	try {
		off = ctx.ui?.onTerminalInput?.((data: string) => {
			if (TECLA_CANCELA.test(data)) abortar();
			return undefined; // a tecla segue para o nycode
		});
	} catch {
		off = undefined; // sem UI interativa
	}
	const poll = setInterval(() => {
		try {
			if (ctx.hasPendingMessages?.()) abortar();
			else atualizar?.();
		} catch {
			// contexto encerrado: a espera termina pelo timer
		}
	}, POLL_FILA_MS);
	(globalThis as any).__piAutoResumeCancel = abortar;
	return {
		signal: own.signal,
		cancelar: abortar,
		soltar() {
			clearInterval(poll);
			ctx.signal?.removeEventListener?.("abort", abortar);
			if ((globalThis as any).__piAutoResumeCancel === abortar) delete (globalThis as any).__piAutoResumeCancel;
			try {
				off?.();
			} catch {
				// já desligado
			}
		},
	};
}

function hudCache(): unknown {
	try {
		return JSON.parse(readFileSync(join(userConfigDir(), "plugins", "claude-hud", "usage-cache.json"), "utf8"));
	} catch {
		return undefined;
	}
}

export default function autoResumeExtension(
	nycode: ExtensionAPI,
	wait: typeof sleep = sleep,
	now: () => number = Date.now,
	rand: () => number = Math.random,
) {
	// Headers of the last 429: they carry the reset time; a later 200 does not clear them (the settle reads them),
	// a successful assistant reply does (the limit it described has passed).
	let limitHeaders: Record<string, string> = {};
	let cancelarEspera: (() => void) | undefined;
	nycode.on("session_shutdown", () => cancelarEspera?.());
	nycode.on("after_provider_response", (event: any) => {
		if (event?.status !== 429) return;
		limitHeaders = Object.fromEntries(
			Object.entries(event.headers ?? {})
				.filter(([, v]) => typeof v === "string")
				.map(([k, v]) => [k.toLowerCase(), v as string]),
		);
	});
	nycode.on("message_end", (event: any) => {
		const m = event?.message;
		// Headers only describe the account limit: drop them on a success or on any error that is not that limit.
		if (m?.role === "assistant" && (m.stopReason !== "error" || !ACCOUNT_LIMIT.test(String(m.errorMessage ?? ""))))
			limitHeaders = {};
		const marked =
			m?.role === "assistant" && m.stopReason === "error" ? markLimit(String(m.errorMessage ?? "")) : undefined;
		return marked ? { message: { ...m, errorMessage: marked } } : undefined;
	});
	nycode.on("agent_before_settle", async (event: any, ctx: any) => {
		try {
			if (!resolveNycodeSettings(nycode.getSettings(), process.env).harness.autoResume) return;
			const t = now();
			const branch = ctx.sessionManager.getBranch() as Entry[];
			const hasUI = Boolean(ctx.hasUI);
			let d = decideResume(branch, process.env, { now: t, hasUI });
			// The HUD cache (file read + parse) only matters for the wait on the account limit.
			if (d.action === "resume" && d.kind === "limit")
				d = decideResume(branch, process.env, { now: t, resetAt: limitReset(limitHeaders, hudCache(), t), hasUI });
			if (d.action === "none") return;
			if (d.action === "give_up") {
				if (ctx.ui?.notify) ctx.ui.notify(d.message, "warning");
				else process.stderr.write(`${d.message}\n`);
				return;
			}
			let cartao: ReturnType<typeof cartaoLimite> | undefined;
			let status = false;
			if (d.kind === "limit") {
				limitHeaders = {}; // Depois de cancelar, o próximo 429 precisa fornecer os próprios headers.
				const erro = branch.findLast((e) => e.type === "message" && e.message?.role === "assistant")?.message
					.errorMessage;
				cartao = cartaoLimite(String(erro ?? ""), t, d.delayMs, now);
				const at = clock(t + d.delayMs);
				const ponte = globalThis as Record<symbol, unknown>;
				ponte[SINAL_LIMITE] = cartao;
				try {
					ctx.ui?.notify?.(
						`${CAIXA_AVISO}Limite de uso da conta atingido\na conversa retoma sozinha às ${at} · esc cancela`,
						"info",
					);
				} finally {
					delete ponte[SINAL_LIMITE];
				}
				status = !cartao.redesenhar; // Sem patch, mantém o aviso e o indicador antigos.
				if (status)
					ctx.ui?.setStatus?.("auto-resume", `⏸ limite de uso da conta · retoma sozinho às ${at} · esc cancela`);
				else cartao.atualizar();
			} else {
				status = true;
				ctx.ui?.setStatus?.(
					"auto-resume",
					`↻ nova tentativa em ${delayText(d.delayMs)} · ${d.attempt} de ${DELAYS_MS.length} · esc cancela`,
				);
			}
			let ok = false;
			const fim = cancelavel(ctx, cartao ? () => cartao.atualizar() : undefined);
			cancelarEspera = fim.cancelar;
			try {
				ok = await wait(d.kind === "limit" ? d.delayMs : jitter(d.delayMs, rand), fim.signal);
			} finally {
				if (cancelarEspera === fim.cancelar) cancelarEspera = undefined;
				fim.soltar();
				if (status) ctx.ui?.setStatus?.("auto-resume", undefined);
				cartao?.terminar(ok);
			}
			if (!ok) {
				// O settle nem sempre marca Esc como aborted; não envie uma notificação de erro após cancelar a espera.
				if (d.kind === "limit")
					(globalThis as Record<symbol, unknown>)[Symbol.for("nycode:retry-cancelado")] = now();
				return;
			}
			const entries = [
				...event.entries,
				{
					type: "custom_message",
					customType: d.kind === "limit" ? "auto-resume-limit" : "auto-resume",
					content: d.message,
					display: status,
				},
			];
			return { entries, continue: true };
		} catch {
			return; // fail open: never traps the session
		}
	});
}
