/**
 * Última mensagem do usuário fixa no topo do transcript (como no Claude Code).
 * Só no modo fullscreen: quando o início do prompt mais recente acima da janela some ao rolar, uma linha flutuante
 * mostra o texto; clicar nela rola até o prompt. Lê o layout pela API pública do @nycode/tui (K10); fora do
 * fullscreen não há área de rolagem e a extensão fica sem efeito.
 * Reverter: apagar este diretório.
 */
import {
	getPrimaryScrollSnapshot,
	isSelectionPressActive,
	type OverlayOptions,
	type PrimaryScrollSnapshot,
	replaceScrollToEndIndicator,
	stripTerminalSequences,
	type TUI,
	truncateToWidth,
	visibleWidth,
} from "@nycode/tui";
import type { ExtensionAPI, ExtensionContext } from "../../core/extensions/types.ts";
import {
	findSticky,
	indicadorFim,
	type Sticky,
	type StickyLabelTheme,
	type StickyTheme,
	stickyLinhas,
	stickyRect,
	stickyStyle,
	type UserTest,
	userMatcher,
} from "./sticky.ts";

/** Replies that arrived while the scroll was away from the end (cleared on return to the end). */
const fila = { novas: 0, seguindo: true };

function attach(
	tui: TUI,
	theme: StickyTheme & StickyLabelTheme,
	style: (s: string) => string,
	isUser: () => UserTest,
	pad: number,
): () => void {
	const opts: OverlayOptions = { row: 0, col: 0, width: 1, nonCapturing: true };
	let current: Sticky | undefined;
	let snapshot: PrimaryScrollSnapshot | undefined;
	opts.visible = () => {
		current = undefined;
		if (isSelectionPressActive(tui)) return false; // some durante a seleção para o arraste rolar o transcript
		snapshot = getPrimaryScrollSnapshot(tui);
		if (!snapshot) return false;
		fila.seguindo = snapshot.isFollowingEnd;
		if (snapshot.isFollowingEnd) fila.novas = 0;
		current = findSticky(snapshot.contentLines, snapshot.scrollTop, isUser(), stripTerminalSequences);
		opts.row = snapshot.rect.y;
		Object.assign(opts, stickyRect(snapshot.rect, pad)); // dentro da margem do chat, sem a coluna da barra de rolagem
		return current !== undefined;
	};
	const component = {
		render: (width: number) =>
			current
				? stickyLinhas(current.text, width, truncateToWidth, visibleWidth, style, (c, x) => theme.fg(c, x))
				: [],
		invalidate: () => {},
		handleMouse: (e: { button: string; type: string }) => {
			if (e.button !== "left") return undefined;
			if (e.type === "click" && current && snapshot) {
				snapshot.scrollTo(current.row, { disableFollow: true });
				tui.requestRender();
			}
			return { handled: true };
		},
	};
	const handle = tui.showOverlay(component, opts);
	// Jump-to-end pill: the shortcut comes from the original label text.
	const restoreIndicator = replaceScrollToEndIndicator(tui, (original) => {
		let atalho = "";
		try {
			atalho = (/·\s*(.+?)\s*$/.exec(stripTerminalSequences(original?.() ?? ""))?.[1] ?? "").toLowerCase();
		} catch {
			// no shortcut in the original label
		}
		return () => indicadorFim(fila.novas, atalho, theme);
	});
	return () => {
		restoreIndicator();
		handle.hide();
	};
}

function userTexts(ctx: ExtensionContext): string[] {
	const out: string[] = [];
	for (const e of ctx.sessionManager.getBranch()) {
		const m = e.type === "message" ? e.message : undefined;
		if (m?.role !== "user") continue;
		out.push(
			typeof m.content === "string"
				? m.content
				: m.content
						.filter((c) => c.type === "text")
						.map((c) => c.text)
						.join(" "),
		);
	}
	return out;
}

function outputPad(nycode: ExtensionAPI): number {
	return nycode.getSettings().outputPad === 0 ? 0 : 1; // nycode default: 1
}

export default function stickyPromptExtension(nycode: ExtensionAPI) {
	let matcher = userMatcher([]);
	const refresh = (_e: unknown, ctx: ExtensionContext) => {
		matcher = userMatcher(userTexts(ctx));
	};
	nycode.on("message_end", (e, ctx) => {
		if (e.message.role === "user") refresh(e, ctx);
		if (e.message.role === "assistant" && !fila.seguindo) fila.novas++;
	});
	nycode.on("session_tree", refresh);
	nycode.on("session_start", (e, ctx) => {
		refresh(e, ctx);
		if (!ctx.hasUI) return;
		ctx.ui.setWidget("sticky-prompt", (tui, theme) => {
			const dispose = attach(tui, theme, stickyStyle(theme), () => matcher, outputPad(nycode));
			return { render: () => [], invalidate: () => {}, dispose };
		});
	});
}
