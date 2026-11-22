/** /heapdump: snapshot do heap do processo. Contém prompts, código e possivelmente segredos: confirmação obrigatória, saída local 0600 em diretório 0700. */
import { chmodSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { writeHeapSnapshot } from 'node:v8'
import type { ExtensionAPI, ExtensionCommandContext } from '@earendil-works/pi-coding-agent'
import { agentDir } from '../settings/store.ts'

export const WARNING = 'O heap dump contém o conteúdo da memória do pi: prompts, respostas, código, variáveis de ambiente e possivelmente chaves/tokens em claro. Fica só neste computador (arquivo 0600). Não o envie a ninguém sem revisar. Gerar?'

export interface HeapDeps { dir?: string; write?: (file: string) => string; now?: () => Date }
type Ctx = Pick<ExtensionCommandContext, 'ui' | 'hasUI'>

export async function heapdumpCommand(ctx: Ctx, d: HeapDeps = {}): Promise<string | undefined> {
  if (!ctx.hasUI) {
    ctx.ui.notify('/heapdump exige confirmação interativa; nada foi gravado.', 'error')
    return undefined
  }
  if (!(await ctx.ui.confirm('Gerar heap dump?', WARNING))) {
    ctx.ui.notify('/heapdump cancelado; nada foi gravado.', 'info')
    return undefined
  }
  const dir = d.dir ?? join(agentDir(), 'heapdumps')
  const stamp = (d.now?.() ?? new Date()).toISOString().replace(/[:.]/g, '-')
  const file = join(dir, `heap-${process.pid}-${stamp}.heapsnapshot`)
  try {
    mkdirSync(dir, { recursive: true, mode: 0o700 })
    chmodSync(dir, 0o700)
    writeFileSync(file, '', { mode: 0o600, flag: 'wx' }) // existe com 0600 antes de receber o conteúdo
    ;(d.write ?? writeHeapSnapshot)(file)
    chmodSync(file, 0o600)
  } catch (e) {
    ctx.ui.notify(`/heapdump falhou: ${e instanceof Error ? e.message : String(e)}`, 'error')
    return undefined
  }
  ctx.ui.notify(`Heap dump gravado (0600): ${file}`, 'info')
  return file
}

export function registerHeapdump(pi: ExtensionAPI, d?: HeapDeps): void {
  pi.registerCommand('heapdump', { description: 'Grava um heap snapshot local (0600) após aviso e confirmação', handler: async (_a, ctx) => void (await heapdumpCommand(ctx, d)) })
}
