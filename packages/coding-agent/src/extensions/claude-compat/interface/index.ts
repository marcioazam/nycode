/** Interface do Claude Code no nycode: /focus, /color e transcrição (Ctrl+O). Spec: docs/specs/claude-code-parity/interface.md */
import type { ExtensionAPI } from "../../../core/extensions/types.ts";
import { registerColor } from "./color.ts";
import { registerFocus } from "./focus.ts";
import { registerTranscript } from "./transcript.ts";

export function registerInterfaceCommands(nycode: ExtensionAPI): void {
	registerFocus(nycode);
	registerColor(nycode);
	registerTranscript(nycode);
}

export default registerInterfaceCommands;
