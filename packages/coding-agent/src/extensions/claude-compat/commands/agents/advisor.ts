/**
 * /advisor [provider/modelo|off]: ferramenta `advisor` (o modelo consulta OUTRO modelo configurado) ativa só enquanto há modelo definido.
 * A chamada passa pelo pipeline normal de tools (tool_call, plan mode). O advisor recebe só a pergunta que o modelo principal escrever;
 * pergunta acima do limite é recusada (nunca truncada). Custo: `usage` da resposta vai no ToolResult, inclusive em falha do provedor.
 */
import type { AssistantMessage } from '@earendil-works/pi-ai'
import type { ExtensionAPI, ExtensionCommandContext, ExtensionToolContext, ToolDefinition } from '@earendil-works/pi-coding-agent'
import type { TSchema } from 'typebox'

export const TOOL = 'advisor'
export const ENTRY = 'claude-advisor'
export const MAX_CHARS = 20_000
export const DEADLINE_MS = 120_000

export type ModelSpec = { provider: string; id: string }
export type Reply = Pick<AssistantMessage, 'content' | 'usage' | 'stopReason' | 'errorMessage'>
type Registry = Pick<ExtensionToolContext['modelRegistry'], 'find' | 'complete'>
export type Consult = (spec: ModelSpec, question: string, signal: AbortSignal, registry: Registry) => Promise<Reply>

/** Transporte real: modelRegistry do pi (usa a autenticação já configurada; testes injetam um stub). */
export const defaultConsult: Consult = async (spec, question, signal, registry) => {
  const model = registry.find(spec.provider, spec.id)
  if (!model) throw new Error(`modelo ${spec.provider}/${spec.id} indisponível`)
  return registry.complete(
    model,
    { systemPrompt: 'Você é um consultor sênior. Responda de forma objetiva à pergunta do colega, sem executar ações.', messages: [{ role: 'user', content: [{ type: 'text', text: question }], timestamp: Date.now() }] },
    { signal },
  )
}

export const parseSpec = (raw: string): ModelSpec | undefined => {
  const m = /^([\w.-]+)\/([\w./:@-]+)$/.exec(raw.trim())
  return m ? { provider: m[1]!, id: m[2]! } : undefined
}

const PARAMS = { type: 'object', properties: { question: { type: 'string', description: 'Pergunta com o contexto necessário' } }, required: ['question'], additionalProperties: false } as unknown as TSchema // JSON Schema puro é aceito pelo pi

const fail = (text: string, usage?: Reply['usage']) => ({ content: [{ type: 'text' as const, text }], details: {}, isError: true, ...(usage ? { usage } : {}) })

/** Executa uma consulta: valida, aplica prazo (+ cancelamento do chamador) e preserva o uso consumido em qualquer desfecho. */
export async function runAdvisor(spec: ModelSpec | undefined, question: string, caller: AbortSignal | undefined, registry: Registry, consult: Consult, deadlineMs = DEADLINE_MS) {
  if (!spec) return fail('Nenhum advisor configurado (/advisor provider/modelo).')
  if (!question.trim()) return fail('Pergunta vazia.')
  if (question.length > MAX_CHARS) return fail(`Pergunta com ${question.length} caracteres excede o limite de ${MAX_CHARS}; resuma e tente de novo (nada foi enviado).`)
  const deadline = AbortSignal.timeout(deadlineMs)
  const signal = caller ? AbortSignal.any([caller, deadline]) : deadline
  let reply: Reply
  try {
    reply = await consult(spec, question, signal, registry)
  } catch (e) {
    if (caller?.aborted) return fail('advisor cancelado pelo usuário.')
    if (deadline.aborted) return fail(`advisor excedeu o prazo de ${deadlineMs / 1000}s.`)
    return fail(`advisor falhou: ${e instanceof Error ? e.message : String(e)}`)
  }
  if (reply.stopReason === 'error' || reply.stopReason === 'aborted') {
    const why = caller?.aborted ? 'cancelado pelo usuário' : deadline.aborted ? `excedeu o prazo de ${deadlineMs / 1000}s` : (reply.errorMessage ?? `parou com ${reply.stopReason}`)
    return fail(`advisor falhou: ${why}`, reply.usage)
  }
  const text = reply.content.filter((p): p is Extract<typeof p, { type: 'text' }> => p.type === 'text').map((p) => p.text).join('\n')
  if (!text.trim()) return fail('advisor devolveu resposta vazia.', reply.usage)
  return { content: [{ type: 'text' as const, text }], details: { model: `${spec.provider}/${spec.id}`, stopReason: reply.stopReason }, usage: reply.usage }
}

type Ctx = Pick<ExtensionCommandContext, 'ui' | 'modelRegistry'>

export function registerAdvisor(pi: ExtensionAPI, consult: Consult = defaultConsult, deadlineMs = DEADLINE_MS): void {
  let spec: ModelSpec | undefined
  const sync = () => {
    const active = pi.getActiveTools().filter((t) => t !== TOOL)
    pi.setActiveTools(spec ? [...active, TOOL] : active)
  }
  const tool: ToolDefinition<TSchema> = {
    name: TOOL,
    label: 'Advisor',
    description: 'Consulta o modelo consultor configurado pelo usuário (/advisor) para uma segunda opinião. Inclua no texto todo o contexto necessário (limite de 20000 caracteres).',
    parameters: PARAMS,
    defaultActive: false,
    execute: async (_id, params, signal, _update, ctx) => runAdvisor(spec, String((params as { question?: unknown }).question ?? ''), signal, ctx.modelRegistry, consult, deadlineMs),
  }
  pi.registerTool(tool)
  pi.on('session_start', async (_e, ctx) => {
    spec = undefined
    for (const e of ctx.sessionManager.getEntries() as { type: string; customType?: string; data?: { model?: string } }[])
      if (e.type === 'custom' && e.customType === ENTRY) spec = e.data?.model ? parseSpec(e.data.model) : undefined
    sync()
  })
  pi.registerCommand('advisor', {
    description: 'Configura o modelo consultor: <provider/modelo> | off | (status)',
    handler: async (args, ctx: Ctx) => {
      const a = args.trim()
      if (!a) return ctx.ui.notify(spec ? `Advisor: ${spec.provider}/${spec.id}` : 'Advisor desligado. Uso: /advisor provider/modelo | off', 'info')
      if (a === 'off') {
        spec = undefined
        pi.appendEntry(ENTRY, { model: null })
        sync()
        return ctx.ui.notify('Advisor desligado.', 'info')
      }
      const s = parseSpec(a)
      if (!s) return ctx.ui.notify('Formato: /advisor provider/modelo (ex.: anthropic/claude-opus-4-5) ou off.', 'error')
      if (!ctx.modelRegistry.getAvailable().some((m) => m.provider === s.provider && m.id === s.id)) return ctx.ui.notify(`Modelo ${a} não está disponível (sem autenticação ou desconhecido).`, 'error')
      spec = s
      pi.appendEntry(ENTRY, { model: a })
      sync()
      ctx.ui.notify(`Advisor: ${a}. A ferramenta advisor está ativa.`, 'info')
    },
  })
}
