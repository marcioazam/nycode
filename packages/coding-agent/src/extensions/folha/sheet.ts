/**
 * A "folha": componente de overlay (régua, linhas, rodapé) no estilo do histórico de prompts.
 * Puro: sem estado global; quem abre decide o que fazer com o valor escolhido.
 */

import { matchesKey, truncateToWidth, visibleWidth } from '@earendil-works/pi-tui'
import { movimento } from '../ui/a11y.ts'

export interface ThemeLike { fg(c: string, s: string): string; bg(c: string, s: string): string; bold(s: string): string; getFgAnsi?(c: string): string }
export type Line =
  | { kind: 'group'; text: string }
  | { kind: 'row'; left: string; right?: string; value?: string }
  | { kind: 'text'; text: string }
export type SheetModel = { title: string; right?: string; lines: Line[]; footer: string }

export const MAX_ROWS = 12
const GLIDE_MS = 140
const RGB_RE = /38;2;(\d+);(\d+);(\d+)/
const padTo = (s: string, width: number) => s + ' '.repeat(Math.max(0, width - visibleWidth(s)))
const parseAccent = (t: ThemeLike): [number, number, number] | undefined => {
  try {
    const m = t.getFgAnsi ? RGB_RE.exec(t.getFgAnsi('accent')) : null
    return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : undefined
  } catch {
    return undefined
  }
}

/** Régua com exatamente `width` colunas visíveis. */
export function rule(t: ThemeLike, width: number, title?: string, right?: string): string {
  const b = (s: string) => t.fg('borderMuted', s)
  if (!title) return b('─'.repeat(Math.max(0, width)))
  const r = right ?? ''
  const fixed = 3 + visibleWidth(title) + 1 + 1 + (r ? visibleWidth(r) + 1 : 0) + 2
  const fill = Math.max(1, width - fixed)
  // sem resumo à direita a régua segue contínua (sem o vão do resumo)
  const full = b('── ') + t.bold(title) + (r ? b(` ${'─'.repeat(fill)} `) + t.fg('dim', r) + b(' ──') : b(` ${'─'.repeat(fill + 3)}`))
  return padTo(truncateToWidth(full, width, ''), width)
}

/** Rodapé de teclas em cápsula (onda 12, D2): tecla com fundo `customMessageBg`, verbo em `dim`, 3 espaços entre pares.
 * Mais de 4 pares viram os 4 primeiros e `? mais` (regra da onda 4). Sem fundo no tema (mono): a tecla fica em negrito. */
export function teclas(t: ThemeLike, pares: Array<[tecla: string, verbo: string]>, mais = pares.length > 4): string {
  const cap = (k: string) => {
    try {
      return t.bg('customMessageBg', ` ${k} `)
    } catch {
      return t.bold(k)
    }
  }
  const lista = mais ? [...pares.slice(0, 4), ['?', 'mais'] as [string, string]] : pares
  return lista.map(([k, v]) => `${cap(k)} ${t.fg('dim', v)}`).join('   ')
}

/** Barra proporcional de `width` colunas; percent limitado a 0–100. */
export function bar(t: ThemeLike, width: number, percent: number): string {
  const p = Math.min(100, Math.max(0, Number.isFinite(percent) ? percent : 0))
  const on = Math.round((width * p) / 100)
  return t.fg('accent', '━'.repeat(on)) + t.fg('borderMuted', '─'.repeat(Math.max(0, width - on)))
}

/** Folha: ↑↓ escolhem (ou rolam), Enter devolve o `value` da linha ativa, Esc/Ctrl+C devolvem undefined. */
export class Sheet {
  private active: number // índice em `lines` da linha selecionável ativa; -1 sem seleção
  private offset = 0 // primeira linha visível quando não há seleção
  private movedAt = 0
  private glideTimer?: ReturnType<typeof setInterval>
  private readonly theme: ThemeLike
  private readonly model: SheetModel
  private readonly done: (value?: string) => void
  private readonly redraw: () => void

  constructor(theme: ThemeLike, model: SheetModel, done: (value?: string) => void, requestRender: () => void) {
    this.theme = theme
    this.model = model
    this.done = (v) => {
      this.stopGlide()
      done(v)
    }
    this.redraw = requestRender
    this.active = this.selectable().at(0) ?? -1
  }

  private stopGlide(): void {
    if (!this.glideTimer) return
    clearInterval(this.glideTimer)
    this.glideTimer = undefined
  }

  private startGlide(): void {
    if (movimento() !== 'normal' || !parseAccent(this.theme)) return
    this.movedAt = performance.now()
    if (this.glideTimer) return
    this.glideTimer = setInterval(() => {
      if (performance.now() - this.movedAt >= GLIDE_MS) this.stopGlide()
      this.redraw()
    }, 8)
    this.glideTimer.unref?.()
  }

  private selectable(): number[] {
    const out: number[] = []
    this.model.lines.forEach((l, i) => { if (l.kind === 'row' && l.value !== undefined) out.push(i) })
    return out
  }

  handleInput(data: string): void {
    if (matchesKey(data, 'escape') || matchesKey(data, 'ctrl+c')) return this.done(undefined)
    const up = matchesKey(data, 'up')
    const down = matchesKey(data, 'down')
    if (matchesKey(data, 'enter')) {
      const l = this.model.lines[this.active]
      if (l?.kind === 'row' && l.value !== undefined) this.done(l.value)
      return
    }
    if (!up && !down) return
    const step = down ? 1 : -1
    if (this.active >= 0) {
      const sel = this.selectable()
      const next = sel[sel.indexOf(this.active) + step]
      if (next === undefined) return
      this.active = next
      this.startGlide()
    } else {
      const max = Math.max(0, this.model.lines.length - MAX_ROWS)
      const next = Math.min(max, Math.max(0, this.offset + step))
      if (next === this.offset) return
      this.offset = next
    }
    this.redraw()
  }

  render(width: number): string[] {
    const t = this.theme
    const dim = (s: string) => t.fg('dim', s)
    const fit = (s: string) => padTo(truncateToWidth(s, width, '…'), width)
    const { lines } = this.model
    let start = this.offset
    if (this.active >= 0) start = Math.max(0, Math.min(this.active - Math.floor(MAX_ROWS / 2), lines.length - MAX_ROWS))
    const out = [rule(t, width, this.model.title, this.model.right)]
    for (let i = start; i < Math.min(lines.length, start + MAX_ROWS); i++) {
      const l = lines[i]!
      if (l.kind === 'group') out.push(fit(dim(` ${l.text}`)))
      else if (l.kind === 'text') out.push(fit(`   ${l.text}`))
      else {
        const on = i === this.active
        const r = l.right ? visibleWidth(l.right) : 0
        const left = truncateToWidth(l.left, Math.max(1, width - 4 - (r ? r + 2 : 0)), '…')
        const gap = Math.max(1, width - 4 - visibleWidth(left) - r)
        const body = left + (l.right ? ' '.repeat(gap) + dim(l.right) : '')
        let ptr = t.fg('accent', '❯')
        if (on && this.movedAt > 0) {
          const dt = performance.now() - this.movedAt
          const rgb = dt >= 0 && dt < GLIDE_MS ? parseAccent(t) : undefined
          if (rgb) {
            const k = (1 - dt / GLIDE_MS) ** 2
            const lift = (v: number) => Math.min(255, Math.round(v + 78 * k))
            ptr = `\x1b[38;2;${lift(rgb[0])};${lift(rgb[1])};${lift(rgb[2])}m❯\x1b[39m`
          }
        }
        out.push(on ? t.bg('selectedBg', fit(` ${ptr} ${body}`)) : fit(`   ${body}`))
      }
    }
    out.push(fit(dim(` ${this.model.footer}`)), rule(t, width))
    return out
  }

  invalidate(): void {}
}
