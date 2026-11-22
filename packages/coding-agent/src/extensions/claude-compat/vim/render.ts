/** Realce da seleção visual sobre as linhas já renderizadas pelo editor nativo (vídeo reverso, sem alterar o estado). */
import type { Range } from './ops.ts'

const ANSI = /(\x1b\[[0-9;:]*[A-Za-z]|\x1b_[^\x07\x1b]*(?:\x07|\x1b\\)|\x1b\][^\x07]*\x07)/
const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
const strip = (s: string): string => s.split(ANSI).filter((_, i) => i % 2 === 0).join('')
const REV = '\x1b[7m'
const REV_OFF = '\x1b[27m'

interface Pos { line: number; col: number }

/** Para cada linha renderizada, de onde do documento ela começa (undefined se não casa). */
function align(rows: string[], lines: string[]): Array<Pos | undefined> | undefined {
  const consume = (sl: number, sc: number): Array<Pos | undefined> | undefined => {
    let l = sl, c = sc
    const out: Array<Pos | undefined> = []
    for (const raw of rows) {
      const rt = raw.trimEnd()
      if (l >= lines.length) return undefined
      const line = lines[l]!
      if (rt === '') {
        if (c !== 0 && c < line.length) return undefined
        out.push({ line: l, col: c })
        l++
        c = 0
        continue
      }
      if (!line.startsWith(rt, c)) return undefined
      out.push({ line: l, col: c })
      c += rt.length
      while (c < line.length && line[c] === ' ') c++
      if (c >= line.length) { l++; c = 0 }
    }
    return out
  }
  const first = consume(0, 0)
  if (first) return first
  const t0 = rows[0]?.trimEnd()
  if (!t0) return undefined
  for (let l = 0; l < lines.length; l++) {
    for (let i = lines[l]!.indexOf(t0); i >= 0; i = lines[l]!.indexOf(t0, i + 1)) {
      const r = consume(l, i)
      if (r) return r
    }
  }
  return undefined
}

/** Aplica o realce de `sel` (offsets no texto de `lines`) nas linhas de conteúdo de `rendered`. */
/** undefined = não foi possível alinhar texto e linhas renderizadas (o chamador avisa; o buffer não é tocado). */
export function highlight(rendered: string[], lines: string[], sel: Range, paddingX: number): string[] | undefined {
  let bottom = -1
  for (let i = rendered.length - 1; i >= 1; i--) if (strip(rendered[i]!).startsWith('─')) { bottom = i; break }
  if (bottom < 2) return undefined
  const content = rendered.slice(1, bottom)
  const texts = content.map((r) => [...segmenter.segment(strip(r))].slice(paddingX).map((g) => g.segment).join(''))
  const starts = align(texts, lines)
  if (!starts) return undefined
  const lineOffset: number[] = []
  let acc = 0
  for (const l of lines) { lineOffset.push(acc); acc += l.length + 1 }
  const out = [...rendered]
  content.forEach((raw, idx) => {
    const st = starts[idx]
    if (!st) return
    const rt = texts[idx]!.trimEnd()
    const base = lineOffset[st.line]! + st.col
    const inSel = (o: number) => o >= sel.s && o < sel.e
    let vis = 0 // gráficos visíveis vistos (inclui o padding)
    let off = 0 // offset UTF-16 dentro de rt
    let res = ''
    raw.split(ANSI).forEach((part, pi) => {
      if (pi % 2 === 1) { res += part; return } // sequência ANSI: zero largura
      for (const g of segmenter.segment(part)) {
        if (vis++ < paddingX) { res += g.segment; continue }
        const inText = off < rt.length
        const emptyRow = !inText && rt === '' && off === 0 && sel.linewise && base >= sel.s && base <= sel.e
        res += (inText && inSel(base + off)) || emptyRow ? REV + g.segment + REV_OFF : g.segment
        off += g.segment.length
      }
    })
    out[idx + 1] = res
  })
  return out
}
