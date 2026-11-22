/**
 * Título do terminal (indicador animado enquanto trabalha, ✓ ao terminar fora de foco) e rastreio de foco (DEC 1004).
 * No fullscreen o viewport do @nycode/tui (tui-alt-screen.ts) consome \x1b[I / \x1b[O antes dos listeners das extensões,
 * então o foco é lido por observeTerminalInput, do @nycode/tui (K10; não consome nada); onTerminalInput só
 * engole as sequências no modo regular, onde a extensão liga o 1004 e o editor as receberia.
 */

import { basename } from "node:path";
import { observeTerminalInput } from "@nycode/tui";
import type { ExtensionAPI, ExtensionContext } from "../../core/extensions/types.ts";
import { assinarQuadro, definirFoco } from "../ui-visual/motion/motion.ts";
import { movimento } from "./a11y.ts";

const TITULO_MS = 160;
const rodando = () =>
	/^(?:dumb|linux)$/.test(process.env.TERM ?? "") || process.env.NYCODE_ASCII_ICONS === "1" ? "|/-\\" : "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏";

export type TitleState = "idle" | "working" | "done";

/** Mais específico primeiro (abas cortam pela direita): sessão · pasta. */
export const baseTitle = (sessionName: string | undefined, cwd: string): string =>
	sessionName ? `${sessionName} · ${basename(cwd)}` : basename(cwd);

export const titleFor = (base: string, state: TitleState, frame: string): string =>
	state === "working" ? `${frame} ${base}` : state === "done" ? `✓ ${base}` : base;

/** Relato de foco: só a sequência exata (o terminal a envia como escrita própria); outra entrada → undefined. */
export const parseFocus = (data: string): boolean | undefined =>
	data === "\x1b[I" ? true : data === "\x1b[O" ? false : undefined;

/** Último relato de foco num bloco cru do stdin (pode vir junto de outros bytes). */
export const lastFocus = (chunk: string): boolean | undefined => {
	const i = chunk.lastIndexOf("\x1b[I");
	const o = chunk.lastIndexOf("\x1b[O");
	return i < 0 && o < 0 ? undefined : i > o;
};

export default function (nycode: ExtensionAPI) {
	let unsub: (() => void) | undefined;
	let working = false;
	let done = false;
	let focused: boolean | undefined;
	let regular = false;
	let ctxRef: ExtensionContext | undefined;

	let parar: (() => void) | undefined;
	let anterior = "";
	let desde = 0;
	const apply = (now = performance.now()) => {
		if (!ctxRef) return;
		const state: TitleState = working ? "working" : done ? "done" : "idle";
		const frames = rodando();
		const glyph =
			working && focused !== false && movimento() === "normal"
				? frames[Math.floor(Math.max(0, now - desde) / TITULO_MS) % frames.length]
				: frames[0] === "|"
					? "*"
					: "●";
		const title = titleFor(baseTitle(nycode.getSessionName(), ctxRef.cwd), state, glyph);
		if (title !== anterior) {
			anterior = title;
			ctxRef.ui.setTitle(title);
		}
	};
	const retomar = () => {
		parar?.();
		parar =
			working && focused !== false && movimento() === "normal"
				? assinarQuadro("titulo-terminal", (now) => {
						apply(now);
						return working && focused !== false && movimento() === "normal";
					})
				: undefined;
	};
	const active = () => ctxRef !== undefined;

	nycode.on("session_start", (_event, ctx) => {
		if (!ctx.hasUI || process.env.NYCODE_SUBAGENT === "1") return;
		ctxRef = ctx;
		anterior = "";
		regular = (nycode.getSettings() as { tuiMode?: string }).tuiMode === "regular";
		if (regular) process.stdout.write("\x1b[?1004h");
		unsub?.();
		const onData = (chunk: string) => {
			const f = lastFocus(chunk);
			if (f === undefined || f === focused) return;
			focused = f;
			definirFoco(f); // sem foco as animações param (Onda 10, P02)
			if (f) done = false;
			nycode.events.emit("nycode-ui:terminal-focus", { focused: f });
			retomar();
			apply();
		};
		const stopObserving = observeTerminalInput(onData);
		const off = ctx.ui.onTerminalInput((data) =>
			regular && parseFocus(data) !== undefined ? { consume: true } : undefined,
		);
		unsub = () => {
			stopObserving();
			off();
		};
	});

	nycode.on("agent_start", () => {
		if (!active()) return;
		working = true;
		done = false;
		desde = performance.now();
		retomar();
		apply(desde);
	});

	nycode.on("agent_settled", () => {
		if (!active()) return;
		working = false;
		done = focused === false;
		retomar();
		apply();
	});

	nycode.on("session_info_changed", () => apply());

	nycode.on("session_shutdown", () => {
		parar?.();
		parar = undefined;
		working = done = false;
		focused = undefined;
		unsub?.();
		unsub = undefined;
		if (regular) process.stdout.write("\x1b[?1004l");
		regular = false;
		definirFoco(undefined);
		ctxRef = undefined;
	});
}
