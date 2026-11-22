/** /transcript e Ctrl+O (interface.md §4): abre a visão rolável sobre a sessão ativa; o rascunho do editor não é tocado. */
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent'
import { buildBlocks } from './transcript-model.ts'
import { TranscriptView } from './transcript-view.ts'

export interface Stoppable { stop(): void; start(): void; requestRender(force?: boolean): void }
export interface TranscriptDeps {
  env?: NodeJS.ProcessEnv
  run?: (cmd: string, args: string[]) => { status: number | null; error?: Error }
}

/** Fluxo do editor externo nativo: tui.stop → editor → tui.start; arquivo 0600 em diretório 0700, apagado, nunca relido. */
export function openExternal(text: string, tui: Stoppable, d: TranscriptDeps = {}): string {
  const editor = ((d.env ?? process.env).VISUAL || (d.env ?? process.env).EDITOR || '').trim()
  if (!editor) return 'Sem $VISUAL/$EDITOR configurado: nada foi aberto.'
  const [cmd, ...pre] = editor.split(/\s+/)
  const dir = mkdtempSync(join(tmpdir(), 'pi-transcript-'))
  const file = join(dir, 'transcript.txt')
  try {
    writeFileSync(file, text, { mode: 0o600 })
    tui.stop()
    try {
      const r = (d.run ?? ((c, a) => spawnSync(c, a, { stdio: 'inherit' })))(cmd, [...pre, file])
      return r.error ? `Editor falhou: ${r.error.message}` : r.status === 0 ? 'Editor externo fechado.' : `Editor saiu com código ${r.status}.`
    } finally {
      tui.start()
      tui.requestRender(true)
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

type Ctx = Pick<import('@earendil-works/pi-coding-agent').ExtensionContext, 'ui' | 'sessionManager' | 'hasUI'>

export async function openTranscript(ctx: Ctx, d: TranscriptDeps = {}): Promise<void> {
  if (!ctx.hasUI) return ctx.ui.notify('A transcrição precisa da interface interativa.', 'error')
  const { blocks, dropped } = buildBlocks(ctx.sessionManager.getBranch())
  if (!blocks.length) return ctx.ui.notify('A conversa ainda está vazia.', 'info')
  await ctx.ui.custom<void>(
    (tui, _theme, _kb, done) =>
      new TranscriptView(blocks, dropped, {
        rows: () => tui.terminal.rows || 24,
        done: () => done(),
        requestRender: () => tui.requestRender(),
        openFull: (text) => openExternal(text, tui, d),
      }),
    { overlay: true, overlayOptions: { width: '100%', maxHeight: '100%' } },
  )
}

export function registerTranscript(pi: ExtensionAPI, d: TranscriptDeps = {}): void {
  pi.registerCommand('transcript', {
    description: 'Transcrição rolável da conversa (ferramentas, resultados, raciocínio); ? ajuda, q fecha',
    handler: async (_args, ctx) => openTranscript(ctx, d),
  })
  pi.registerShortcut('ctrl+o', { description: 'Transcrição da conversa', handler: (ctx) => openTranscript(ctx, d) })
}
