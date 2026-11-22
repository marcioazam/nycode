/** /cd: troca real de diretório na MESMA sessão (docs/specs/claude-code-parity/directory.md). Exige o patch pi-core `session-cwd`. */
import type { ExtensionAPI, ExtensionCommandContext } from '@earendil-works/pi-coding-agent'
import { completeDirs, resolveTarget } from './path.ts'

export const MARK = Symbol.for('pi-harness.session-cwd')
type Info = { ok: boolean; cwd?: string; reason?: string; trusted?: boolean; policy?: boolean }
type Ctx = Pick<ExtensionCommandContext, 'ui' | 'cwd' | 'isIdle' | 'hasPendingMessages' | 'sessionManager' | 'switchSession'>
export type Deps = { patched: () => boolean; resolve: typeof resolveTarget }
const defaults: Deps = { patched: () => Boolean((globalThis as Record<symbol, unknown>)[MARK]), resolve: resolveTarget }

const message = (i: Info): [string, 'info' | 'warning' | 'error'] =>
  !i.ok
    ? [`/cd: ${i.reason ?? 'recusado'}`, 'error']
    : i.trusted === false && i.policy
      ? [`Diretório de trabalho: ${i.cwd}\nConfigs de projeto desativadas por política (--no-approve ou defaultProjectTrust: never): .pi/, AGENTS e config do projeto NÃO foram carregados.`, 'warning']
    : i.trusted === false
      ? [`Diretório de trabalho: ${i.cwd}\nProjeto NÃO confiável: .pi/, AGENTS e config do projeto NÃO foram carregados (confie pelo prompt nativo ao reabrir ou rode /cd de novo).`, 'warning']
      : [`Diretório de trabalho: ${i.cwd}`, 'info']

export async function cdCommand(ctx: Ctx, args: string, deps: Deps = defaults): Promise<'moved' | 'refused'> {
  const notify = (m: string, t: 'info' | 'warning' | 'error' = 'info') => {
    try {
      ctx.ui.notify(m, t)
    } catch {
      /* ctx obsoleto: a troca já avisou pelo withSession */
    }
  }
  const refuse = (m: string): 'refused' => (notify(`/cd: ${m}`, 'error'), 'refused')
  if (!args.trim()) {
    notify(`Diretório atual: ${ctx.cwd}\nUso: /cd <diretório> (Tab completa; espaços como \\ ou entre aspas)`)
    return 'refused'
  }
  if (!deps.patched()) return refuse('o patch pi-core session-cwd não está aplicado neste pi (claude-home/patches/pi-core/session-cwd/apply.mjs); nada foi alterado')
  if (!ctx.isIdle() || ctx.hasPendingMessages()) return refuse('sessão ocupada; aguarde o turno terminar')
  const file = ctx.sessionManager.getSessionFile()
  if (!file) return refuse('sessão efêmera (sem arquivo); inicie o pi no diretório desejado')
  const target = deps.resolve(args, ctx.cwd)
  if (!target.ok) return refuse(target.error)
  if (target.dir === ctx.cwd) {
    notify(`Já está em ${target.dir}`)
    return 'refused'
  }
  let announced = false
  const opts = {
    piSessionCwd: { cwd: target.dir },
    withSession: async (rctx: Pick<ExtensionCommandContext, 'ui'>, info?: Info) => {
      announced = true
      const [m, t] = message(info ?? { ok: true, cwd: target.dir })
      rctx.ui.notify(m, t)
    },
  }
  const r = (await (ctx.switchSession as (p: string, o: unknown) => Promise<{ cancelled: boolean; piSessionCwd?: Info }>)(file, opts)) ?? { cancelled: true }
  if (!r.cancelled) return 'moved'
  if (!announced) notify(...message(r.piSessionCwd ?? { ok: false, reason: 'cancelado' }))
  return 'refused'
}

export default function registerDirectory(pi: Pick<ExtensionAPI, 'registerCommand' | 'on'>): void {
  let sessionCwd = process.cwd() // o processo não faz chdir: a completação parte do cwd da SESSÃO
  pi.on('session_start', async (_e, ctx) => {
    sessionCwd = ctx.cwd
  })
  pi.registerCommand('cd', {
    description: 'Muda o diretório de trabalho desta sessão (mesma conversa e arquivo): /cd <diretório>',
    getArgumentCompletions: (prefix: string) => completeDirs(prefix, sessionCwd),
    handler: async (args, ctx) => {
      await cdCommand(ctx, args)
    },
  })
}
