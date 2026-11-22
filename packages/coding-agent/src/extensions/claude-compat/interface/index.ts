/** Interface do Claude Code no pi: /focus, /color e transcrição (Ctrl+O). Spec: docs/specs/claude-code-parity/interface.md */
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent'
import { registerColor } from './color.ts'
import { registerFocus } from './focus.ts'
import { registerTranscript } from './transcript.ts'

export function registerInterfaceCommands(pi: ExtensionAPI): void {
  registerFocus(pi)
  registerColor(pi)
  registerTranscript(pi)
}

export default registerInterfaceCommands
