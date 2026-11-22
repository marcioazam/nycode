/**
 * Clicar numa imagem do transcript (Image do pi-tui: resultado de tool, screenshot, MCP) abre o arquivo no
 * visualizador do sistema, pedido do usuário 2026-11-13. Define Image.prototype.handleMouse; só o clique esquerdo
 * simples (release sem arrasto, sem modificadores) age, o resto devolve undefined (seleção e rolagem intactas).
 * Override do abridor: PI_IMAGE_OPENER (testes). Temporários em os.tmpdir()/pi-images-<uid>-<pid> (0700), apagados no exit.
 * Também pinta o fundo da tool atrás da imagem (fundo.ts).
 * Reverter: apagar este diretório (e o link em ~/.pi/agent/extensions).
 */
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { lstatSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { instalarFundo } from './fundo.ts'

const EXT: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp' }
export const MAX_BYTES = 50 * 1024 * 1024
// Um diretório por processo (dono, 2026-11-19; antes pi-images-<uid> compartilhado, que a saída de uma sessão apagava inteiro).
const dir = () => join(tmpdir(), `pi-images-${process.getuid?.() ?? 0}-${process.pid}`)
let cleanup = false

/** Grava a imagem (nome por hash) e devolve o caminho; undefined se base64 vazio/inválido, mime desconhecido ou grande demais; lança se o diretório/arquivo temporário não for nosso. */
export function writeTemp(base64: string, mime: string, d = dir()): string | undefined {
  const ext = EXT[mime?.toLowerCase()]
  if (!ext || typeof base64 !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64.trim()) || base64.length > MAX_BYTES * 1.4) return undefined
  const bytes = Buffer.from(base64, 'base64')
  if (bytes.length === 0 || bytes.length > MAX_BYTES) return undefined
  mkdirSync(d, { recursive: true, mode: 0o700 })
  const uid = process.getuid?.() ?? 0
  const sd = lstatSync(d) // /tmp é compartilhado: só diretório real, nosso e 0700 (sem chmod: recusa em vez de adotar)
  if (!sd.isDirectory() || sd.uid !== uid || (sd.mode & 0o777) !== 0o700) throw new Error(`diretório temporário inseguro: ${d}`)
  const file = join(d, `${createHash('sha256').update(bytes).digest('hex').slice(0, 24)}.${ext}`)
  try {
    writeFileSync(file, bytes, { mode: 0o600, flag: 'wx' })
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e
    const sf = lstatSync(file) // já existe: só reutiliza arquivo regular nosso (nunca symlink)
    if (!sf.isFile() || sf.uid !== uid) throw new Error(`arquivo temporário inseguro: ${file}`)
  }
  if (!cleanup) { cleanup = true; process.on('exit', () => { try { rmSync(dir(), { recursive: true }) } catch {} }) }
  return file
}

export function openFile(file: string, onError: (m: string) => void): void {
  const opener = process.env.PI_IMAGE_OPENER || (process.platform === 'darwin' ? 'open' : 'xdg-open')
  try {
    const child = spawn(opener, [file], { detached: true, stdio: 'ignore' })
    child.on('error', (e) => onError(`não abriu a imagem: ${e.message}`))
    child.unref()
  } catch (e) { onError(`não abriu a imagem: ${(e as Error).message}`) }
}

let notify: (m: string) => void = () => {}

// Clique repetido na mesma imagem não decodifica nem hasheia de novo (até 70 MB): caminho por base64Data.
const CACHE_MAX = 8
const cache = new Map<string, { mime: string; dir: string; file: string }>()

/** Triagem barata no clique (sem varrer os até 70 MB): o que a validação completa de writeTemp rejeitaria de cara. */
const plausible = (base64: unknown, mime: string): base64 is string =>
  typeof base64 === 'string' && base64.length > 0 && base64.length <= MAX_BYTES * 1.4 && !!EXT[mime?.toLowerCase()]
  && /^[A-Za-z0-9+/]+={0,2}$/.test(base64.slice(0, 256)) && /^[A-Za-z0-9+/=]+$/.test(base64.slice(-256))

/** Ainda é arquivo regular nosso? (o /tmp é compartilhado: nunca abrir symlink nem arquivo de outro uid) */
function cachedFile(base64: string, mime: string, d: string): string | undefined {
  const hit = cache.get(base64)
  if (!hit || hit.mime !== mime || hit.dir !== d) return undefined
  try {
    const st = lstatSync(hit.file)
    if (st.isFile() && st.uid === (process.getuid?.() ?? 0)) return hit.file
  } catch { /* apagado */ }
  cache.delete(base64)
  return undefined
}

let ultima: { base64: string; mime: string } | undefined

/** Abre a última imagem pelo mesmo caminho do clique (gravação, cache e abridor). */
export function abrirUltima(): boolean {
  if (!ultima || !plausible(ultima.base64, ultima.mime)) return false
  const d = dir()
  const file = cachedFile(ultima.base64, ultima.mime, d) ?? writeTemp(ultima.base64, ultima.mime, d)
  if (!file) return false
  if (!cache.has(ultima.base64)) {
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!)
    cache.set(ultima.base64, { mime: ultima.mime, dir: d, file })
  }
  openFile(file, notify)
  return true
}

export function handleMouse(this: { base64Data: string; mimeType: string }, event: any): { handled: true } | undefined {
  if (event?.type !== 'click' || event.button !== 'left' || event.shift || event.alt || event.ctrl) return undefined
  const { base64Data, mimeType } = this
  if (!plausible(base64Data, mimeType)) return undefined
  ultima = { base64: base64Data, mime: mimeType }
  const d = dir() // fixado no clique
  const cached = cachedFile(base64Data, mimeType, d)
  if (cached) openFile(cached, notify)
  else {
    // O trabalho pesado (validação completa, decodificação, hash, gravação) sai do tratador do mouse: o clique só agenda.
    // ponytail: a CPU continua no laço principal, só adiada; Worker/stream se uma imagem de 50 MB ainda incomodar.
    setImmediate(() => {
      try {
        const file = writeTemp(base64Data, mimeType, d)
        if (!file) return
        if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!)
        cache.set(base64Data, { mime: mimeType, dir: d, file })
        openFile(file, notify)
      } catch (e) { notify(`não abriu a imagem: ${(e as Error).message}`) }
    })
  }
  return { handled: true }
}

const ROTA = Symbol.for('pi-harness.image-open.rota')
type Peca = { render(w: number): string[]; handleMouse?: (e: any) => any }
/** No pi 1.5.2 o ToolExecutionComponent com renderShell 'self' (todos os blocos do ny-pi) só repassa o clique ao próprio
 * conteúdo; as imagens vêm depois (linha vazia, conteúdo, e por imagem um espaço e a imagem). Aqui o clique abaixo do
 * conteúdo é levado à imagem, com y local, espelhando o render de tool-execution.js (dono, 2026-11-19). */
export function rotearImagens(proto: any): void {
  // Marca na função, não no protótipo: o chat-margin restaura o handleMouse original no /reload e aí reembrulhamos.
  if (proto.handleMouse?.[ROTA]) return
  const orig = proto.handleMouse
  const rota = function (this: any, event: any) {
    const r = orig?.call(this, event)
    if (r || this.getRenderShell?.() !== 'self' || !this.imageComponents?.length) return r
    let y = this.selfRenderHeight > 0 ? this.selfRenderHeight + 1 : 0
    for (let i = 0; i < this.imageComponents.length; i++) {
      y += (this.imageSpacers?.[i] as Peca | undefined)?.render(event.width).length ?? 0
      const img = this.imageComponents[i] as Peca
      const h = img.render(event.width).length
      if (event.y >= y && event.y < y + h) return img.handleMouse?.({ ...event, y: event.y - y, height: h })
      y += h
    }
    return undefined
  }
  ;(rota as any)[ROTA] = true
  proto.handleMouse = rota
}

export default async function (pi: ExtensionAPI) {
  // import dinâmico: o módulo é carregado só pelo pi (o node:test importa este arquivo sem resolver o pi-tui)
  const { Image } = await import('@earendil-works/pi-tui')
  ;(Image.prototype as any).handleMouse = handleMouse
  const { ToolExecutionComponent } = await import('@earendil-works/pi-coding-agent')
  instalarFundo(ToolExecutionComponent.prototype as any)
  rotearImagens(ToolExecutionComponent.prototype as any)
  pi.on('session_start', (_e, ctx) => { if (ctx.hasUI) notify = (m) => ctx.ui.notify(m, 'warning') })
  pi.registerCommand('imagem', {
    description: 'Abre a última imagem do transcript no visualizador',
    handler: async (_args, ctx) => {
      if (!abrirUltima()) ctx.ui.notify('não há imagem para abrir', 'warning')
    },
  })
}
