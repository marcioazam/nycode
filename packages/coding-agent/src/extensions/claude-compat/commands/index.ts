/** Comandos locais do Claude Code sem equivalente nativo (docs/specs/claude-code-parity/local-commands.md). */
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent'
import { registerAdvisor } from './agents/advisor.ts'
import { registerListing } from './agents/listing.ts'
import { registerLoop } from './agents/loop.ts'
import { registerConfig } from './settings/config.ts'
import { registerPermissions, trackPlanMode } from './settings/permissions.ts'
import { registerPlugin } from './settings/plugin.ts'
import { registerAddDir } from './session/adddir.ts'
import { registerBranch } from './session/branch.ts'
import { registerCopy } from './session/copy.ts'
import { registerHeapdump } from './session/heapdump.ts'
import { registerInsights } from './session/insights.ts'
import { registerDoctor } from './skills/doctor.ts'
import { registerSkillPrompts } from './skills/prompts.ts'

export default function registerLocalCommands(pi: ExtensionAPI): void {
  const planActive = trackPlanMode(pi)
  registerConfig(pi)
  registerPermissions(pi, planActive)
  registerPlugin(pi)
  registerAddDir(pi)
  registerBranch(pi)
  registerCopy(pi)
  registerHeapdump(pi)
  registerInsights(pi)
  registerAdvisor(pi)
  registerLoop(pi, planActive)
  registerListing(pi)
  registerDoctor(pi)
  registerSkillPrompts(pi)
}
