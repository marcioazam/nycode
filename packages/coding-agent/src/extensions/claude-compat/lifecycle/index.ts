/** Ciclo de vida local: /restart (/update) e /terminal-setup (docs/specs/claude-code-parity/lifecycle.md). */
import type { ExtensionAPI } from "../../../core/extensions/types.ts";
import { registerRestart } from "./restart.ts";
import { registerTerminalSetup } from "./terminal-setup.ts";
import { registerWatchdog } from "./watchdog.ts";

export default function registerLifecycle(nycode: ExtensionAPI): void {
	registerRestart(nycode);
	registerWatchdog(nycode);
	registerTerminalSetup(nycode);
}
