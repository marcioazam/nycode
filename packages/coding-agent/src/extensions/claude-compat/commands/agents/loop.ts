/**
 * /loop <intervalo> <prompt> | /loop stop | /loop: reenvia o prompt como mensagem de usuário comum (mesma política de plan mode/tools)
 * quando o agente está ocioso e o intervalo passou. Limites: mínimo 60 s, máximo 20 execuções; para em shutdown e em plan mode.
 */
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent'

export const MIN_MS = 60_000
export const MAX_RUNS = 20
export interface Clock { setTimeout(fn: () => void, ms: number): unknown; clearTimeout(t: unknown): void }

export function parseInterval(raw: string): number | undefined {
  const m = /^(\d{1,4})(s|m|h)$/.exec(raw)
  return m ? Number(m[1]) * { s: 1000, m: 60_000, h: 3_600_000 }[m[2] as 's' | 'm' | 'h'] : undefined
}

export function registerLoop(pi: ExtensionAPI, planActive: () => boolean, clock: Clock = globalThis, minMs = MIN_MS): void {
  let st: { prompt: string; ms: number; left: number; timer?: unknown; due: boolean } | undefined
  let notify: (m: string, t?: 'info' | 'warning' | 'error') => void = () => {}
  let idle: (() => boolean) | undefined
  const stop = (why: string) => {
    if (st?.timer !== undefined) clock.clearTimeout(st.timer)
    if (st) notify(`/loop encerrado: ${why}`, 'info')
    st = undefined
  }
  const fire = () => {
    if (!st) return
    if (planActive()) return stop('plan mode ativo')
    if (idle && !idle()) return void (st.due = true) // espera o próximo agent_settled
    st.due = false
    st.left--
    pi.sendUserMessage(st.prompt)
    if (st.left <= 0) stop('limite de execuções atingido')
  }
  const arm = () => {
    if (!st || st.timer !== undefined) return
    st.timer = clock.setTimeout(() => {
      if (st) st.timer = undefined
      st && (st.due = true)
      fire()
    }, st.ms)
  }
  pi.on('agent_settled', async (_e, ctx) => {
    notify = ctx.ui.notify.bind(ctx.ui)
    idle = () => ctx.isIdle()
    if (!st) return
    if (st.due) fire()
    arm()
  })
  pi.on('session_shutdown', async () => {
    if (st?.timer !== undefined) clock.clearTimeout(st.timer)
    st = undefined
  })
  pi.registerCommand('loop', {
    description: 'Repete um prompt: /loop <5m|90s|1h> [--max N] <prompt> | /loop stop',
    handler: async (args, ctx) => {
      notify = ctx.ui.notify.bind(ctx.ui)
      idle = () => ctx.isIdle()
      const a = args.trim()
      if (a === 'stop') return st ? stop('parado pelo usuário') : ctx.ui.notify('Nenhum loop ativo.', 'info')
      if (!a) return ctx.ui.notify(st ? `Loop ativo: "${st.prompt.slice(0, 60)}" a cada ${st.ms / 1000}s, restam ${st.left}.` : 'Uso: /loop <intervalo 60s+> [--max N] <prompt>', 'info')
      const m = /^(\S+)\s+(?:--max\s+(\d+)\s+)?([\s\S]+)$/.exec(a)
      const ms = m ? parseInterval(m[1]!) : undefined
      if (!m || ms === undefined || ms < minMs) return ctx.ui.notify(`Intervalo inválido: use Ns/Nm/Nh com no mínimo ${minMs / 1000}s. Uso: /loop 5m <prompt>`, 'error')
      const max = m[2] ? Number(m[2]) : MAX_RUNS
      if (max < 1 || max > MAX_RUNS) return ctx.ui.notify(`--max deve estar entre 1 e ${MAX_RUNS}.`, 'error')
      if (planActive()) return ctx.ui.notify('Plan mode ativo: /loop recusado.', 'error')
      if (!ctx.isIdle()) return ctx.ui.notify('Agente ocupado: aguarde antes de iniciar /loop.', 'warning')
      if (st) stop('substituído por novo loop')
      st = { prompt: m[3]!.trim(), ms, left: max, due: false }
      ctx.ui.notify(`Loop iniciado: a cada ${ms / 1000}s, até ${max} execuções. /loop stop encerra.`, 'info')
      fire()
      arm()
    },
  })
}
