/**
 * Skills empacotadas do Claude → skills INSTALADAS equivalentes, só por digitação do usuário. O comando de extensão reenvia
 * `/skill:<nome> <args>` (expansão de template, argumentos preservados) e o turno de modelo é o mesmo esperado de uma skill.
 */
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent'

/** comando do Claude → skill instalada (equivalência semântica avaliada: revisão de código, auditoria de segurança, pesquisa profunda). */
export const SKILL_MAP: Readonly<Record<string, string>> = {
  simplify: 'code-simplification',
  'security-review': 'security-audit',
  'deep-research': 'deep-search',
}

export function registerSkillPrompts(pi: ExtensionAPI): void {
  for (const [cmd, skill] of Object.entries(SKILL_MAP))
    pi.registerCommand(cmd, {
      description: `Executa a skill ${skill} (equivalente instalado de /${cmd} do Claude) [argumentos]`,
      handler: async (args, ctx) => {
        if (!pi.getCommands().some((c) => c.source === 'skill' && c.name === `skill:${skill}`)) return ctx.ui.notify(`/${cmd}: a skill "${skill}" não está instalada.`, 'error')
        const text = `/skill:${skill}${args.trim() ? ` ${args.trim()}` : ''}`
        pi.sendUserMessage(text, ctx.isIdle() ? { expandPromptTemplates: true } : { deliverAs: 'followUp', expandPromptTemplates: true })
      },
    })
}
