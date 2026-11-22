/** Ciclo de vida local: /restart (/update) e /terminal-setup (docs/specs/claude-code-parity/lifecycle.md). */
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent'
import { registerRestart } from './restart.ts'
import { registerTerminalSetup } from './terminal-setup.ts'
import { registerWatchdog } from './watchdog.ts'

export default function registerLifecycle(pi: ExtensionAPI): void {
  registerRestart(pi)
  registerWatchdog(pi)
  registerTerminalSetup(pi)
}
