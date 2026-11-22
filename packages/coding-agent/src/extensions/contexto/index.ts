/**
 * `/contexto <N|Nk|padrao>`: raises the compaction limit of the current session, saved in it (custom entry "contexto")
 * and restored on resume/reload. The limit reaches the compaction through core/compaction/session-limit.ts: the
 * absolute-size rule (K9) and the native reserve (K18) read it.
 *
 * Lean summary: native recompaction asks to "PRESERVE all existing information from the previous summary", so the
 * summary only grows. Above NYCODE_COMPACT_SUMMARY_MAX characters (default 40000) the previous summary becomes the
 * first message to summarize and `previousSummary` is dropped: the initial prompt (no PRESERVE) condenses everything.
 * It mutates the preparation that is passed to session_before_compact and reused by the default compaction.
 */

import { setSessionCompactAt } from "../../core/compaction/session-limit.ts";
import type { ExtensionAPI } from "../../core/extensions/types.ts";
import { resolveNycodeSettings } from "../../core/settings-nycode.ts";

const ENTRY = "contexto";
const USAGE = "Uso: /contexto 400k | 600000 | padrao (atual: limite desta sessão)";

/** Positive number from the env; empty, non-numeric, zero or negative fall back (Number("") = 0 and NaN would switch the limit off). */
const envPositive = (raw: string | undefined, fallback: number): number => {
	const n = Number(raw);
	return raw?.trim() && Number.isFinite(n) && n > 0 ? n : fallback;
};

/** "400k" | "400000" | "1m" to tokens; invalid gives null. */
export function parseTokens(arg: string): number | null {
	const m = /^(\d+(?:[.,]\d+)?)\s*([km]?)$/i.exec(arg.trim());
	if (!m) return null;
	const mult = { "": 1, k: 1_000, m: 1_000_000 }[(m[2] ?? "").toLowerCase() as "" | "k" | "m"];
	const n = Math.round(Number((m[1] ?? "").replace(",", ".")) * mult);
	return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** A previous summary above `max` characters becomes a message to condense; returns true when it changed anything. */
export function condensePrevious(
	prep: { previousSummary?: string; messagesToSummarize: unknown[] },
	max = envPositive(process.env.NYCODE_COMPACT_SUMMARY_MAX, 40_000),
): boolean {
	const prev = prep.previousSummary;
	if (!prev || prev.length <= max) return false;
	const text =
		`<resumo-anterior-da-sessao>\n${prev}\n</resumo-anterior-da-sessao>\n\n` +
		"Histórico acumulado das compactações anteriores. Ao resumir, condense: mantenha objetivo, restrições, decisões em " +
		"vigor, pendências e caminhos de arquivo ainda relevantes; descarte detalhes de tarefas concluídas e superadas.";
	prep.messagesToSummarize.unshift({ role: "user", content: [{ type: "text", text }], timestamp: 0 });
	prep.previousSummary = undefined;
	return true;
}

export default function contextoExtension(nycode: ExtensionAPI): void {
	const defaultLimit = () => resolveNycodeSettings(nycode.getSettings(), process.env).compaction.maxContextTokens;
	let limit = defaultLimit();
	const set = (next: number) => {
		limit = next;
		setSessionCompactAt(next > defaultLimit() ? next : undefined);
	};

	// Each session (new, resumed, fork, reload) restores the last /contexto of its branch; none gives the default.
	nycode.on("session_start", async (_event, ctx) => {
		const base = defaultLimit();
		const last = ctx.sessionManager.getBranch().findLast((e) => e.type === "custom" && e.customType === ENTRY) as
			| { data?: { limit?: unknown } }
			| undefined;
		const saved = Number(last?.data?.limit);
		set(Number.isSafeInteger(saved) && saved >= base ? saved : base);
	});

	nycode.on("session_before_compact", async (event, ctx) => {
		const before = event.preparation.previousSummary?.length ?? 0;
		if (condensePrevious(event.preparation) && ctx.hasUI)
			ctx.ui.notify(
				`Resumo anterior com ${Math.round(before / 1000)}k caracteres: condensando nesta compactação`,
				"info",
			);
	});

	nycode.registerCommand("contexto", {
		description: 'Compactar mais tarde nesta sessão: /contexto 400k ("padrao" restaura o limite configurado)',
		handler: async (args, ctx) => {
			const base = defaultLimit();
			const arg = args.trim().toLowerCase();
			const window = ctx.getContextUsage()?.contextWindow;
			if (!arg) {
				ctx.ui.notify(`Compacta em ${limit / 1000}k${window ? ` de ${window / 1000}k` : ""}. ${USAGE}`, "info");
				return;
			}
			const next = arg === "padrao" || arg === "padrão" || arg === "reset" ? base : parseTokens(arg);
			if (next == null || next < base) {
				ctx.ui.notify(`Valor inválido (mínimo ${base / 1000}k). ${USAGE}`, "warning");
				return;
			}
			if (window && next >= window) {
				ctx.ui.notify(
					`${next / 1000}k ≥ janela do modelo (${window / 1000}k): use até ${window / 1000 - 1}k`,
					"warning",
				);
				return;
			}
			set(next);
			nycode.appendEntry(ENTRY, { limit: next });
			ctx.ui.notify(
				`Compactação automática desta sessão: a partir de ${limit / 1000}k tokens (gravado na sessão)`,
				"info",
			);
		},
	});
}
