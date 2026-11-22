// Shared fixtures of the comandos tests: the real core KeybindingsManager, a plain theme and the user's key config.
import { fileURLToPath } from "node:url";
import { type KeybindingsConfig, KeybindingsManager } from "../../../../src/core/keybindings.ts";

/** Directory of the embedded extensions (scanned for registered command names). */
export const raiz = fileURLToPath(new URL("../../../../src/extensions", import.meta.url));
/** Real KeybindingsManager (default definitions) with the given user preferences. */
export const gerente = (user: Record<string, unknown> = {}): KeybindingsManager =>
	new KeybindingsManager(user as KeybindingsConfig);
export const tema = {
	fg: (_c: string, s: string) => s,
	bg: (_c: string, s: string) => `[${s}]`,
	bold: (s: string) => s,
};
/** User configuration of 2026-11-14 (without the U5 fix). */
export const USUARIO: Record<string, unknown> = {
	"app.model.cycleBackward": "ctrl+shift+,",
	"app.message.followUp": "ctrl+q",
	"app.message.dequeue": "shift+left",
	"tui.altScreen.previousPrompt": "ctrl+up",
	"app.tree.foldOrUp": "ctrl+left",
	"app.tree.unfoldOrDown": "ctrl+right",
	"app.models.reorderUp": "ctrl+shift+up",
	"app.models.reorderDown": "ctrl+shift+down",
	"app.clipboard.pasteImage": "ctrl+v",
	"app.model.cycleForward": "ctrl+shift+.",
	"app.model.select": "alt+p",
	"tui.editor.undo": ["ctrl+-", "ctrl+_"],
	"tui.input.newLine": ["shift+enter", "ctrl+j", "alt+enter"],
	"app.thinking.toggle": "alt+t",
};
