/**
 * Queued message view (steering/follow-up) in Portuguese, variant C: accent rail ▎,
 * symmetric inner indent of 3 columns (1 in a narrow terminal), header with edit (`shift+←`), delete last
 * (`shift+⌫`) and send now (`ctrl+⏎`), `no próximo passo` in cyan and `ao terminar` in dim. Arrow up also restores the
 * queued messages into the editor when the editor is empty (rewrites Up as Alt+Up, app.message.dequeue).
 */

import { truncateToWidth, visibleWidth } from "@nycode/tui";
import type { ExtensionAPI } from "../../core/extensions/types.ts";
import { anima, assinarQuadro, esmaecer, safeAnsi } from "../ui-visual/motion/motion.ts";

// Lista da fila: o nycode 1.5.2 desenha "Steering: x", "Follow-up: x" e "↳ <tecla> to edit all queued messages" em dim.
// Reescreve essas linhas pelo texto (decisão docs/designs/onda2-editor): se o nycode mudar o texto, nada casa e a lista
// nativa passa intacta.
const SGR = /\x1b\[[0-9;:]*m/g;
const ITEM = /^ (Steering|Follow-up): (.*)$/;
const HINT = /^ ↳ (?:(.+?) to edit all queued messages\b.*|.*)$/;
export const MAX_SHOWN = 5;
export const DEFAULT_DEQUEUE_KEY = "shift+←";
export const DROP_QUEUE_KEY = "shift+⌫";

const SYMBOLS: Record<string, string> = {
	up: "↑",
	down: "↓",
	left: "←",
	right: "→",
	enter: "⏎",
	backspace: "⌫",
	delete: "del",
};

/** Formata a tecla anunciada pelo nycode (`Shift+Left` → `shift+←`); sem dica reconhecida, usa `shift+←`. */
export function dequeueKeyLabel(raw: string | undefined): string {
	const first = raw?.split("/")[0]?.trim();
	if (!first) return DEFAULT_DEQUEUE_KEY;
	return first
		.toLowerCase()
		.split("+")
		.map((p) => SYMBOLS[p] ?? p)
		.join("+");
}

export interface QueueStyle {
	dim(s: string): string;
	text(s: string): string;
	muted(s: string): string;
	accent(s: string): string;
	cyan?(s: string): string;
	err?(s: string): string;
	bold?(s: string): string;
	fit(s: string, w: number): string;
	width(s: string): number;
	/** Fundo e texto (RGB) para a fila nascer do fundo; sem eles, aparece direto. */
	nasce?(): [number[], number[]] | undefined;
}

/** Linhas do contêiner de pendências com a fila em português (Variante C): cabeçalho e itens, sem padding lateral. */
export function restyleQueue(lines: readonly string[], width: number, st: QueueStyle, sel?: number): string[] {
	const plain = lines.map((l) => l.replace(SGR, "").trimEnd());
	const items = plain.flatMap((l) => {
		const m = ITEM.exec(l);
		return m
			? [{ steer: m[1] === "Steering", when: m[1] === "Steering" ? "no próximo passo" : "ao terminar", msg: m[2]! }]
			: [];
	});
	if (!items.length) return [...lines];
	// Item escolhido com shift+↑/↓ (patch send-now): número em accent e texto em negrito; a janela de MAX_SHOWN o acompanha.
	const escolhido = sel !== undefined && sel >= 0 && sel < items.length ? sel : undefined;
	const ini = escolhido === undefined ? 0 : Math.max(0, escolhido - MAX_SHOWN + 1);
	const rawKey = plain.map((l) => HINT.exec(l)?.[1]).find(Boolean);
	const editKey = dequeueKeyLabel(rawKey);
	const pad = "";
	const iw = Math.max(1, width - 2 * pad.length);
	const cyan = st.cyan ?? st.dim;
	const err = st.err ?? st.accent;
	const bold = st.bold ?? ((s: string) => s);
	const row = (left: string, right: string) => {
		const r = st.width(right) + 12 <= iw ? right : "";
		const l = st.fit(left, Math.max(1, iw - st.width(r) - (r ? 2 : 0)));
		const gap = Math.max(0, iw - st.width(l) - st.width(r));
		return `${pad}${l}${" ".repeat(gap)}${r}${pad}`.slice(0, width < 2 * pad.length + 1 ? width : undefined);
	};
	const bar = `${st.accent("▎")}${iw >= 18 ? " " : ""}`;
	const head = `${bar}${st.accent(bold("Na fila"))} ${st.dim(`· ${items.length}`)}`;
	const keys = [
		`${st.accent("shift+↑↓")} ${st.dim("escolher ·")} ${st.accent(editKey)} ${st.dim("editar ·")} ${err(DROP_QUEUE_KEY)} ${st.dim("× excluir ·")} ${st.accent("ctrl+⏎")} ${st.dim("enviar agora")}`,
		`${st.accent(editKey)} ${st.dim("editar ·")} ${err(DROP_QUEUE_KEY)} ${st.dim("× excluir ·")} ${st.accent("ctrl+⏎")} ${st.dim("enviar agora")}`,
		`${st.accent(editKey)} ${st.dim("editar ·")} ${err(DROP_QUEUE_KEY)} ${st.dim("× excluir")}`,
		`${st.accent(editKey)} ${st.dim("editar")}`,
	];
	const block = [row(head, keys.find((k) => st.width(head) + st.width(k) + 2 <= iw) ?? "")];
	items.slice(ini, ini + MAX_SHOWN).forEach((it, j) => {
		const i = ini + j;
		const msg =
			i === escolhido
				? bold(st.text(it.msg))
				: i === 0 && escolhido === undefined
					? st.text(it.msg)
					: st.muted(it.msg);
		const num = i === escolhido ? st.accent(bold(String(i + 1))) : st.dim(String(i + 1));
		block.push(row(`${bar}${num}  ${msg}`, it.steer ? cyan(it.when) : st.dim(it.when)));
	});
	const fora = items.length - MAX_SHOWN;
	if (fora > 0) block.push(row(`${bar}${st.dim(`…  mais ${fora}`)}`, ""));
	const first = plain.findIndex((l) => ITEM.test(l));
	const out: string[] = [];
	lines.forEach((l, i) => {
		if (i === first) out.push(...block);
		if (!ITEM.test(plain[i]!) && !HINT.test(plain[i]!)) out.push(l);
	});
	return out;
}

const WRAPPED = Symbol.for("nycode.queue-view");

/** Embrulha o render do contêiner de pendências (2º filho do TUI no nycode 1.5.2); sem ele, não faz nada. */
export function attachQueueView(
	tui: any,
	style: () => QueueStyle,
	relogio: () => number = () => performance.now(),
): void {
	const box = tui?.children?.[1];
	if (!box || typeof box.render !== "function" || !Array.isArray(box.children)) return;
	const hadStyle = box[WRAPPED] !== undefined;
	box[WRAPPED] = style; // /reload troca o estilo sem embrulhar de novo
	if (hadStyle) return;
	const native = box.render.bind(box);
	// Nasce do fundo: a cada mensagem nova na fila, o bloco sobe do fundo em NASCE_MS.
	let antes = 0,
		t0 = -Infinity;
	box.render = (width: number) => {
		const linhas = native(width);
		const st: QueueStyle = box[WRAPPED]();
		const n = linhas.filter((l: string) => ITEM.test(l.replace(SGR, "").trimEnd())).length;
		if (!n) delete (globalThis as { __piFilaSel?: number }).__piFilaSel; // fila vazia: a escolha não sobrevive para a próxima
		const out = restyleQueue(linhas, width, st, (globalThis as { __piFilaSel?: number }).__piFilaSel);
		const agora = relogio();
		if (n > antes && anima()) {
			t0 = agora;
			assinarQuadro(
				"up-dequeue-nasce",
				(t) => {
					tui.requestRender?.();
					return t - t0 < NASCE_MS;
				},
				{ transicao: true },
			);
		}
		antes = n;
		const cor = agora - t0 < NASCE_MS ? st.nasce?.() : undefined;
		if (!cor) return out;
		const a = 1 - (1 - (agora - t0) / NASCE_MS) ** 3;
		return out.map((l) => (l.includes("▎") ? esmaecer(l, a, cor[0], cor[1]) : l));
	};
}
export const NASCE_MS = 450;

export default function upDequeueExtension(nycode: ExtensionAPI): void {
	nycode.on("session_start", (_event, ctx) => {
		if (!ctx.hasUI) return;
		ctx.ui.setWidget("queue-view", (tui, theme) => {
			attachQueueView(tui, () => ({
				dim: (s) => theme.fg("dim", s),
				text: (s) => theme.fg("text", s),
				muted: (s) => theme.fg("muted", s),
				accent: (s) => theme.fg("accent", s),
				cyan: (s) => theme.fg("syntaxType", s),
				err: (s) => theme.fg("error", s),
				bold: (s) => theme.bold(s),
				fit: (s, w) => truncateToWidth(s, w, "…"),
				width: visibleWidth,
				nasce: () => {
					const f = safeAnsi(() => theme.getBgAnsi("customMessageBg")),
						x = safeAnsi(() => theme.getFgAnsi("text"));
					return f && x ? [f, x] : undefined;
				},
			}));
			return { render: () => [], invalidate: () => {} };
		});
	});
}
