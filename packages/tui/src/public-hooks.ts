// Public hooks for built-in extensions that need what the TUI keeps private (seam K10).

import type { TUI } from "./tui.ts";
import { TuiAltScreen } from "./tui-alt-screen.ts";

export interface PrimaryScrollRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

/** What the primary scroll area showed in the last frame; valid until the next render. */
export interface PrimaryScrollSnapshot {
	scrollTop: number;
	/** True while the view follows the end of the content (not scrolled away from it). */
	isFollowingEnd: boolean;
	/** Every line of the scrolled content, not only the visible ones. */
	contentLines: readonly string[];
	/** Screen rectangle of the scroll area. */
	rect: PrimaryScrollRect;
	scrollTo(row: number, options?: { disableFollow?: boolean }): void;
}

/** The primary scroll area of the last frame, or undefined outside fullscreen mode or before the first frame. */
export function getPrimaryScrollSnapshot(tui: TUI): PrimaryScrollSnapshot | undefined {
	return tui instanceof TuiAltScreen ? tui.getPrimaryScrollSnapshot() : undefined;
}

/**
 * Replaces the jump-to-end label of the fullscreen TUI: `make` receives the current label renderer (undefined when none)
 * and returns the new one. Returns the function that restores the previous renderer; a no-op outside fullscreen mode.
 */
export function replaceScrollToEndIndicator(
	tui: TUI,
	make: (current: (() => string) | undefined) => () => string,
): () => void {
	if (!(tui instanceof TuiAltScreen)) return () => {};
	const original = tui.getScrollToEndIndicator();
	tui.setScrollToEndIndicator(make(original));
	// `tui` may be a reference whose renderer left fullscreen mode since (shutdown, mode switch): nothing to restore then.
	return () => {
		if (tui instanceof TuiAltScreen) tui.setScrollToEndIndicator(original);
	};
}

/** True while a mouse press may still become a text selection (fullscreen mode only). */
export function isSelectionPressActive(tui: TUI): boolean {
	return tui instanceof TuiAltScreen && tui.isSelectionPressActive();
}

/**
 * Observes raw terminal input chunks without consuming them. Unlike `TUI.addInputListener`, it also sees the
 * sequences the TUI handles itself first (focus reports in fullscreen mode). Returns the unsubscribe function.
 */
export function observeTerminalInput(listener: (chunk: string) => void): () => void {
	const onData = (data: Buffer | string): void => listener(String(data));
	process.stdin.on("data", onData);
	return () => {
		process.stdin.off("data", onData);
	};
}
