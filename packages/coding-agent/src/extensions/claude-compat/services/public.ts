/**
 * Serviços públicos sem conta: /mobile /ios /android (QR), /stickers (status) e /upgrade (página pública).
 * Sem autenticação, tokens ou automação de compra. Ver docs/specs/claude-code-parity/public-services.md.
 */
import { spawn } from 'node:child_process'
import type { ExtensionAPI, ExtensionCommandContext } from '@earendil-works/pi-coding-agent'
import { MOBILE_URL, qrNotice, QrPanel } from './mobile-qr.ts'

export const UPGRADE_URL = 'https://claude.ai/upgrade'
export const STICKERS_TEXT = 'Todos os pacotes de stickers já foram resgatados.'
const OPEN_TIMEOUT_MS = 5000

/** opened = saída 0; failed = erro/saída ≠ 0; unconfirmed = sem resposta no prazo (ambíguo: nunca repetir). */
export type OpenResult = 'opened' | 'failed' | 'unconfirmed'
export type UrlOpener = (url: string) => Promise<OpenResult>

/** Comando fixo por plataforma; a URL vai como argumento único, nunca por shell. */
export function openCommand(url: string, platform: string): { cmd: string; args: string[] } {
  if (platform === 'darwin') return { cmd: 'open', args: [url] }
  if (platform === 'win32') return { cmd: 'rundll32', args: ['url.dll,FileProtocolHandler', url] }
  return { cmd: 'xdg-open', args: [url] }
}

export function nativeOpener(platform: string = process.platform, spawnFn: typeof spawn = spawn, timeoutMs = OPEN_TIMEOUT_MS): UrlOpener {
  return (url) =>
    new Promise((resolve) => {
      const { cmd, args } = openCommand(url, platform)
      let done = false
      const end = (r: OpenResult) => {
        if (done) return
        done = true
        clearTimeout(timer)
        resolve(r)
      }
      let child: ReturnType<typeof spawn> | undefined
      const timer = setTimeout(() => {
        child?.kill()
        end('unconfirmed')
      }, timeoutMs)
      try {
        child = spawnFn(cmd, args, { stdio: 'ignore', shell: false })
      } catch {
        return end('failed')
      }
      child.once('error', () => end('failed'))
      child.once('exit', (code) => end(code === 0 ? 'opened' : 'failed'))
    })
}

type Ctx = Pick<ExtensionCommandContext, 'hasUI' | 'ui'>

const noArgs = (name: string, args: string, ctx: Ctx): boolean => {
  if (!args.trim()) return false
  ctx.ui.notify(`/${name} não aceita argumentos.`, 'warning')
  return true
}

async function mobile(name: string, args: string, ctx: Ctx): Promise<void> {
  if (noArgs(name, args, ctx)) return
  if (ctx.hasUI && ctx.ui.custom) {
    try {
      await ctx.ui.custom<undefined>((_tui, _theme, _keys, done) => new QrPanel(() => done(undefined)), { overlay: true, overlayOptions: { anchor: 'center' } })
      return
    } catch (e) {
      ctx.ui.notify(`Painel indisponível (${e instanceof Error ? e.message : String(e)}).`, 'warning')
    }
  }
  ctx.ui.notify(qrNotice(), 'info')
}

async function upgrade(args: string, ctx: Ctx, open: UrlOpener): Promise<void> {
  if (noArgs('upgrade', args, ctx)) return
  if (!ctx.hasUI) return ctx.ui.notify(`Planos do Claude: ${UPGRADE_URL}`, 'info')
  const r = await open(UPGRADE_URL)
  if (r === 'opened') ctx.ui.notify(`Abrindo ${UPGRADE_URL} no navegador. Se não abrir, acesse o link.`, 'info')
  else if (r === 'failed') ctx.ui.notify(`Não foi possível abrir o navegador. Acesse: ${UPGRADE_URL}`, 'warning')
  else ctx.ui.notify(`O navegador não confirmou a abertura (não tentarei de novo). Acesse: ${UPGRADE_URL}`, 'warning')
}

export const PUBLIC_COMMANDS = ['mobile', 'ios', 'android', 'stickers', 'upgrade'] as const

export function registerPublicServices(pi: ExtensionAPI, open: UrlOpener = nativeOpener()): void {
  for (const n of ['mobile', 'ios', 'android']) pi.registerCommand(n, { description: `QR do app Claude (${MOBILE_URL})`, handler: async (a, ctx) => mobile(n, a, ctx) })
  pi.registerCommand('stickers', {
    description: 'Status dos pacotes de stickers',
    handler: async (a, ctx) => {
      if (!noArgs('stickers', a, ctx)) ctx.ui.notify(STICKERS_TEXT, 'info')
    },
  })
  pi.registerCommand('upgrade', { description: `Abre ${UPGRADE_URL}`, handler: async (a, ctx) => upgrade(a, ctx, open) })
}
