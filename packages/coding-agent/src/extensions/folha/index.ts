// folha: confirmações seguras em português, saídas /context /memory /agents /hooks em folha e /painel. Desligue com PI_FOLHA=0.
import { homedir } from 'node:os'
import { installConfirm } from './confirm.ts'
import { installNotify } from './info.ts'
import { registerPainel } from './painel.ts'

export default function (pi: any): void {
  if (process.env.PI_FOLHA === '0') return
  registerPainel(pi)
  pi.on('session_start', (_event: unknown, ctx: any) => {
    if (!ctx.hasUI) return
    installConfirm(ctx.ui)
    installNotify(ctx.ui, homedir())
  })
}
