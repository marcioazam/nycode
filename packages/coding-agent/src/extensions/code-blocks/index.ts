/**
 * Blocos de código sem ``` e sem borda: fundo tingido pela cor da linguagem e botão "⧉ copiar" clicável (fullscreen).
 * O clique copia exatamente o código do bloco, sem rótulo, recuo nem quebras do terminal. Pedido do dono 2026-11-15.
 * O pi 1.5.2 não tem gancho público para blocos de código: envolve Markdown.prototype.renderToken só para tokens
 * `code` e o openUrl do TUI só para links `pi-copy:`; qualquer erro cai no renderizador nativo.
 * Reverter: apagar este diretório.
 */
import { spawn } from 'node:child_process'
import { realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent'
import { copyToClipboard } from '@earendil-works/pi-coding-agent'
import { getCapabilities, Markdown, truncateToWidth, visibleWidth, wrapTextWithAnsi } from '@earendil-works/pi-tui'
import { blockId, detectLang, isDark, type Lang, osc8, palette, parseBgAnsi, renderCodeBlock, resolveLang, type Palette } from './blocks.ts'
import { fitPalette, hljsToAnsi, ONE_DARK, ONE_LIGHT, type SyntaxPalette, themePalette as themeSyntax } from './syntax.ts'

const KEY = Symbol.for('pi-harness.code-blocks')
const THEME_KEY = Symbol.for('@earendil-works/pi-coding-agent:theme')
const SCHEME = 'pi-copy:'
const MAX_BLOCKS = 500
const MIN_WIDTH = 24

// Sobrevive ao /reload: o openUrl já envolvido continua achando os blocos registrados pelo módulo novo.
interface State { codes: Map<string, string>; notify?: (msg: string, level: 'info' | 'warning' | 'error') => void }
const g = globalThis as any
const state: State = (g[KEY] ??= { codes: new Map() })

// Bloco em stream (cerca ainda aberta) cresce a cada render: ocupa UMA entrada por dono (instância do Markdown), trocada
// a cada prefixo maior. Sem isso cada prefixo vira entrada (O(n²) de memória) e MAX_BLOCKS expulsa os blocos fechados.
const pending = new WeakMap<object, string>()

export function remember(code: string, owner: object = state, open = false): string {
  const id = blockId(code)
  const prev = pending.get(owner)
  if (prev !== undefined) {
    const grew = prev !== id && code.startsWith(state.codes.get(prev) ?? '\0')
    if (grew) state.codes.delete(prev)
    if (grew || (prev === id && !open)) pending.delete(owner)
  }
  if (open) pending.set(owner, id)
  state.codes.delete(id)
  state.codes.set(id, code)
  if (state.codes.size > MAX_BLOCKS) state.codes.delete(state.codes.keys().next().value!)
  return id
}
export const recall = (id: string): string | undefined => state.codes.get(id)
export const rememberedCount = (): number => state.codes.size

/** Fence aberta (stream): começa com cerca e a última linha não a fecha. Bloco recuado não conta. */
const isOpenFence = (raw: unknown): boolean => {
  if (typeof raw !== 'string' || !/^ {0,3}(`{3,}|~{3,})/.test(raw)) return false
  const rows = raw.trimEnd().split('\n')
  return rows.length < 2 || !/^ {0,3}(`{3,}|~{3,})\s*$/.test(rows[rows.length - 1])
}

const palettes = new WeakMap<object, Map<string, Palette>>()
function themePalette(color: string | undefined): Palette {
  const t = g[THEME_KEY]
  if (!t) return palette(color, undefined, { bg: '', label: '', button: '' })
  let byColor = palettes.get(t)
  if (!byColor) palettes.set(t, (byColor = new Map()))
  const k = color ?? ''
  let p = byColor.get(k)
  if (!p) {
    const surface = t.getBgAnsi('customMessageBg')
    p = palette(color, parseBgAnsi(surface), { bg: surface, label: t.getFgAnsi('accent'), button: t.getFgAnsi('dim') })
    byColor.set(k, p)
  }
  return p
}

/** O highlight.js que o próprio pi instala (resolvido a partir do cli em execução); ausente: realce nativo do pi. */
let hljs: any
try {
  hljs = createRequire(realpathSync(process.argv[1]))('highlight.js')
} catch {}

/** One Dark no tema escuro, One Light no claro, com as cores `syntax*` do tema quando existirem (U26) e contraste
 * >= 4.5:1 sobre o fundo; sem truecolor, undefined. Chave: fundo + nome do tema (cada tema traz seus tokens). */
const fitted = new Map<string, SyntaxPalette>()
export function syntaxPalette(): { key: string; p: SyntaxPalette } | undefined {
  const t = g[THEME_KEY]
  const base = parseBgAnsi(t?.getBgAnsi?.('customMessageBg'))
  if (!base) return undefined
  const key = `${base.join(',')}\0${t?.name ?? ''}`
  let p = fitted.get(key)
  if (!p) {
    const themed = themeSyntax(isDark(base) ? ONE_DARK : ONE_LIGHT, (token) => t?.getFgAnsi?.(token))
    fitted.set(key, (p = fitPalette(themed, base)))
  }
  return { key, p }
}

/** Primeira gramática do highlight.js entre a etiqueta e os candidatos do Linguist (nome, aliases, modos, extensões). */
function grammarFor(lang: Lang): string | undefined {
  return lang.grammars.find((c) => hljs.getLanguage(c))
}

// Cache de realce do módulo (o pi-tui instalado não tem md.blockHighlightedCode): LRU por chave
// (tema + gramática + texto), com tetos de entradas e de bytes; trocar de tema esvazia.
const HL_MAX_ENTRIES = 200
const HL_MAX_BYTES = 4 << 20
// ponytail: blocos acima de 2.000 linhas ficam em texto simples (realce custa O(n) por render); subir só medindo.
const HL_MAX_LINES = 2000
const hlCache = new Map<string, { lines: string[]; bytes: number }>()
let hlBytes = 0
let hlTheme = ''

export function resetHighlightCache(): void {
  hlCache.clear()
  hlBytes = 0
  hlTheme = ''
}

const overLines = (text: string, max: number): boolean => {
  let n = 1
  for (let i = text.indexOf('\n'); i >= 0; i = text.indexOf('\n', i + 1)) if (++n > max) return true
  return false
}

export function memoHighlight(theme: string, grammar: string, text: string, compute: () => string[], plain: (text: string) => string[]): string[] {
  if (overLines(text, HL_MAX_LINES)) return plain(text)
  if (theme !== hlTheme) {
    resetHighlightCache()
    hlTheme = theme
  }
  const key = `${grammar}\0${text}`
  const hit = hlCache.get(key)
  if (hit) {
    hlCache.delete(key)
    hlCache.set(key, hit)
    return hit.lines
  }
  const lines = compute()
  if (!text.endsWith('\n')) return lines
  const bytes = text.length + lines.reduce((n, l) => n + l.length, 0)
  if (bytes <= HL_MAX_BYTES) {
    hlCache.set(key, { lines, bytes })
    hlBytes += bytes
    while (hlCache.size > HL_MAX_ENTRIES || hlBytes > HL_MAX_BYTES) {
      const [k, v] = hlCache.entries().next().value!
      hlCache.delete(k)
      hlBytes -= v.bytes
    }
  }
  return lines
}

const themeIds = new WeakMap<object, number>()
let themeSeq = 0
const nativeTheme = (th: object): string => {
  let n = themeIds.get(th)
  if (n === undefined) themeIds.set(th, (n = ++themeSeq))
  return `native${n}\0${g[THEME_KEY]?.getBgAnsi?.('customMessageBg') ?? ''}`
}

function highlighted(md: any, text: string, lang: Lang): string[] {
  const sp = syntaxPalette()
  if (sp && hljs) {
    const grammar = grammarFor(lang)
    try {
      const shell = grammar !== undefined && hljs.getLanguage(grammar) === hljs.getLanguage('bash')
      return memoHighlight(`cb\0${sp.key}`, grammar ?? '', text, () => grammar
        ? hljsToAnsi(hljs.highlight(text, { language: grammar, ignoreIllegals: true }).value, sp.p, shell)
        : hljsToAnsi(text.replace(/&/g, '&amp;').replace(/</g, '&lt;'), sp.p), (t) => t.split('\n'))
    } catch {}
  }
  const th = md.theme
  if (!th.highlightCode) return text.split('\n').map((l: string) => th.codeBlock(l))
  return memoHighlight(nativeTheme(th), lang.grammars[0] ?? '', text, () => th.highlightCode(text, lang.grammars[0]), (t) => t.split('\n').map((l) => th.codeBlock(l)))
}

function install(clickable: () => boolean): void {
  const proto = (Markdown as any).prototype
  const native = (proto[KEY] ??= proto.renderToken)
  proto.renderToken = function (token: any, width: number, next: string | undefined, styleContext: unknown) {
    // Texto com fundo próprio (balão do usuário): o reset do bloco apagaria o fundo da margem; fica o nativo.
    if (token?.type !== 'code' || width < MIN_WIDTH || this.defaultTextStyle?.bgColor) return native.call(this, token, width, next, styleContext)
    try {
      const tag = token.lang || detectLang(token.text)
      const lang = resolveLang(tag)
      const id = remember(token.text, this, isOpenFence(token.raw))
      const button = clickable() && getCapabilities().hyperlinks ? osc8(SCHEME + id, '⧉ copiar') : '/copy-code'
      const lines = renderCodeBlock(
        { lines: highlighted(this, token.text, lang), lang: lang.name, button, width, pal: themePalette(lang.color) },
        { visibleWidth, wrapTextWithAnsi, truncateToWidth },
      )
      if (next && next !== 'space') lines.push('')
      return lines
    } catch {
      return native.call(this, token, width, next, styleContext)
    }
  }
}

/** wl-copy sem --type adivinha o MIME pelo conteúdo e código pode virar application/x-ruby; força texto puro. */
function wlCopy(text: string): Promise<boolean> {
  if (process.platform !== 'linux' || !process.env.WAYLAND_DISPLAY) return Promise.resolve(false)
  return new Promise((resolve) => {
    const p = spawn('wl-copy', ['--type', 'text/plain;charset=utf-8'], { stdio: ['pipe', 'ignore', 'ignore'] })
    p.on('error', () => resolve(false))
    p.on('close', (code) => resolve(code === 0))
    p.stdin.end(text)
  })
}

async function copyBlock(id: string): Promise<void> {
  const code = state.codes.get(id)
  if (code === undefined) return state.notify?.('Bloco não está mais em memória; use /copy-code.', 'warning')
  try {
    if (!(await wlCopy(code))) await copyToClipboard(code)
  } catch (e) {
    return state.notify?.(`Falha ao copiar: ${e instanceof Error ? e.message : String(e)}`, 'error')
  }
  const n = code.split('\n').length
  state.notify?.(`Código copiado (${n} linha${n === 1 ? '' : 's'})`, 'info')
}

/** `tui` é o Proxy estável do pi: cada leitura de método devolve um invólucro novo, então a marca fica no próprio TUI. */
function hookClicks(tui: any): void {
  const current = tui.openUrl
  if (typeof current !== 'function' || tui[KEY]) return
  tui[KEY] = true
  tui.openUrl = (url: string) => {
    if (typeof url === 'string' && url.startsWith(SCHEME)) return void copyBlock(url.slice(SCHEME.length))
    return current(url)
  }
}

export default function (pi: ExtensionAPI) {
  let fullscreen = true // padrão do pi 1.5.2; getSettings só pode ser chamado depois do carregamento
  install(() => fullscreen)
  pi.on('session_start', (_e, ctx) => {
    if (!ctx.hasUI) return
    fullscreen = (pi.getSettings() as { tuiMode?: string }).tuiMode !== 'regular'
    state.notify = (msg, level) => ctx.ui.notify(msg, level)
    ctx.ui.setWidget('code-blocks', (tui: any) => {
      fullscreen = typeof tui.openUrl === 'function'
      hookClicks(tui)
      return { render: () => [], invalidate: () => {} }
    })
  })
}
