/** /insights e /recap (determinísticos, sem modelo). /focus não existe: só há alternância de saída de ferramentas, que não é focus view. */
import type { ExtensionAPI, ExtensionCommandContext } from '@earendil-works/pi-coding-agent'

type Ctx = Pick<ExtensionCommandContext, 'ui' | 'sessionManager'>
interface Msg { role?: string; content?: unknown; usage?: { input?: number; output?: number; cost?: { total?: number } } }
const messages = (ctx: Ctx): Msg[] => (ctx.sessionManager.getBranch() as { type?: string; message?: Msg }[]).filter((e) => e?.type === 'message' && e.message).map((e) => e.message!)
const parts = (m: Msg): { type?: string; text?: string; name?: string }[] => (Array.isArray(m.content) ? m.content : [])
const textOf = (m: Msg) => (typeof m.content === 'string' ? m.content : parts(m).filter((p) => p.type === 'text').map((p) => p.text ?? '').join(' '))

export function insightsText(ctx: Ctx): string {
  const ms = messages(ctx)
  if (!ms.length) return 'Sessão vazia: sem dados para insights.'
  const roles = new Map<string, number>()
  const tools = new Map<string, number>()
  let input = 0, output = 0, cost = 0
  for (const m of ms) {
    roles.set(m.role ?? '?', (roles.get(m.role ?? '?') ?? 0) + 1)
    for (const p of parts(m)) if (p.type === 'toolCall' && p.name) tools.set(p.name, (tools.get(p.name) ?? 0) + 1)
    input += m.usage?.input ?? 0
    output += m.usage?.output ?? 0
    cost += m.usage?.cost?.total ?? 0
  }
  const top = [...tools].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([n, c]) => `${n}×${c}`).join(', ') || 'nenhuma'
  return [`Insights da sessão atual (ramo ativo, ${ms.length} mensagens):`, `  papéis: ${[...roles].map(([r, c]) => `${r}=${c}`).join(' ')}`, `  ferramentas: ${top}`, `  tokens: entrada ${input}, saída ${output}; custo ≈ $${cost.toFixed(4)}`].join('\n')
}

export function recapText(ctx: Ctx): string {
  const ms = messages(ctx)
  const users = ms.filter((m) => m.role === 'user').map(textOf).filter(Boolean)
  if (!users.length) return 'Nada a resumir ainda.'
  const last = [...ms].reverse().find((m) => m.role === 'assistant')
  const clip = (s: string, n: number) => (s.replace(/\s+/g, ' ').trim().slice(0, n))
  return ['Recap (extraído do histórico, sem modelo):', ...users.slice(-5).map((u, i) => `  ${users.length - Math.min(5, users.length) + i + 1}. ${clip(u, 100)}`), last ? `  Última resposta: ${clip(textOf(last), 160)}` : ''].filter(Boolean).join('\n')
}

export function registerInsights(pi: ExtensionAPI): void {
  pi.registerCommand('insights', { description: 'Estatísticas locais da sessão atual', handler: async (_a, ctx) => ctx.ui.notify(insightsText(ctx), 'info') })
  pi.registerCommand('recap', { description: 'Resumo determinístico dos últimos pedidos da sessão', handler: async (_a, ctx) => ctx.ui.notify(recapText(ctx), 'info') })
}
