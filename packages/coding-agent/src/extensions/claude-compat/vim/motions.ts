/** Movimentos e objetos de texto do Vim, puros sobre Buf. */
import { Buf } from './text.ts'

export interface Target { to: number; kind: 'excl' | 'incl' | 'line' }
export interface Find { key: 'f' | 'F' | 't' | 'T'; ch: string }
export interface MotionCtx { want: number; find?: Find; op: boolean }

export const MOTIONS = new Set(['h', 'l', 'j', 'k', ' ', 'w', 'W', 'e', 'E', 'b', 'B', '0', '^', '$', 'gg', 'G', 'f', 'F', 't', 'T', ';', ',', '%'])

export function wordFwd(b: Buf, o: number, big: boolean): number {
  if (o >= b.len) return o
  const c = b.cls(o, big)
  if (c === 3) o = b.next(o)
  else if (c > 0) while (o < b.len && b.cls(o, big) === c) o = b.next(o)
  while (o < b.len) {
    const k = b.cls(o, big)
    if (k === 0) o = b.next(o)
    else if (k === 3) {
      if (o === b.lineStart(o)) return o // linha vazia é uma palavra
      o = b.next(o)
    } else return o
  }
  return o
}

export function wordEnd(b: Buf, o: number, big: boolean): number {
  o = b.next(o)
  while (o < b.len && (b.cls(o, big) === 0 || b.cls(o, big) === 3)) o = b.next(o)
  if (o >= b.len) return b.lastChar(b.len)
  const c = b.cls(o, big)
  while (b.next(o) < b.len && b.cls(b.next(o), big) === c) o = b.next(o)
  return o
}

export function wordBack(b: Buf, o: number, big: boolean): number {
  if (o <= 0) return 0
  o = b.prev(o)
  while (o > 0 && (b.cls(o, big) === 0 || (b.cls(o, big) === 3 && o !== b.lineStart(o)))) o = b.prev(o)
  const c = b.cls(o, big)
  if (c === 3) return o
  while (o > 0 && b.cls(b.prev(o), big) === c) o = b.prev(o)
  return o
}

const PAIRS: Record<string, string> = { '(': ')', '[': ']', '{': '}' }
const CLOSERS: Record<string, string> = { ')': '(', ']': '[', '}': '{' }

export function matchBracket(b: Buf, cur: number): number | undefined {
  const t = b.text
  let i = cur
  const e = b.lineEnd(cur)
  while (i < e && !(t[i]! in PAIRS) && !(t[i]! in CLOSERS)) i++
  if (i >= e) return undefined
  const c = t[i]!
  const open = c in PAIRS
  const [a, z] = open ? [c, PAIRS[c]!] : [CLOSERS[c]!, c]
  let depth = 0
  for (let p = i; open ? p < t.length : p >= 0; p += open ? 1 : -1) {
    if (t[p] === (open ? a : z)) depth++
    else if (t[p] === (open ? z : a) && --depth === 0) return p
  }
  return undefined
}

function findChar(b: Buf, cur: number, f: Find, n: number, repeat: boolean): number | undefined {
  const fwd = f.key === 'f' || f.key === 't'
  const till = f.key === 't' || f.key === 'T'
  const ls = b.lineStart(cur), le = b.lineEnd(cur)
  const adjacent = fwd ? b.next(cur) : b.prev(cur)
  let p = cur
  for (let hits = 0; ; ) {
    if (fwd) {
      p = b.next(p)
      if (p >= le) return undefined
    } else {
      if (p <= ls) return undefined
      p = b.prev(p)
    }
    if (b.ch(p) !== f.ch) continue
    if (repeat && till && p === adjacent) continue // ; após t/T pula o vizinho imediato
    if (++hits === n) break
  }
  return till ? (fwd ? b.prev(p) : b.next(p)) : p
}

export function motion(b: Buf, cur: number, key: string, n: number | undefined, arg: string | undefined, ctx: MotionCtx): Target | undefined {
  const cnt = n ?? 1
  const ls = b.lineStart(cur)
  switch (key) {
    case 'h': {
      let to = cur
      for (let i = 0; i < cnt && to > ls; i++) to = b.prev(to)
      return to === cur ? undefined : { to, kind: 'excl' }
    }
    case 'l': {
      const limit = ctx.op ? b.lineEnd(cur) : b.lastChar(cur)
      let to = cur
      for (let i = 0; i < cnt && to < limit; i++) to = Math.min(b.next(to), limit)
      return to === cur ? undefined : { to, kind: 'excl' }
    }
    case ' ': {
      let to = cur
      for (let i = 0; i < cnt; i++) {
        if (b.next(to) < b.lineEnd(to)) to = b.next(to)
        else if (b.lineEnd(to) < b.len) to = b.lineEnd(to) + 1
        else break
      }
      return to === cur ? undefined : { to, kind: 'excl' }
    }
    case 'j': case 'k': {
      const line = b.lineNo(cur), last = b.lineCount() - 1
      const target = key === 'j' ? line + cnt : line - cnt
      if (key === 'j' ? line >= last : line <= 0) return undefined
      const tl = Math.max(0, Math.min(last, target))
      const s = b.startOfLine(tl)
      const to = ctx.want === Infinity ? b.lastChar(s) : b.atCol(s, ctx.want)
      return { to: ctx.op ? to : b.clamp(to), kind: 'line' }
    }
    case '0': return { to: ls, kind: 'excl' }
    case '^': return { to: b.firstNonBlank(cur), kind: 'excl' }
    case '$': {
      let s = ls
      for (let i = 1; i < cnt; i++) {
        const e = b.lineEnd(s)
        if (e >= b.len) { if (i === 1) return undefined; break }
        s = e + 1
      }
      const to = b.lastChar(s)
      return { to, kind: b.lineEnd(s) === s ? 'excl' : 'incl' }
    }
    case 'gg': case 'G': {
      const line = n !== undefined ? Math.min(n - 1, b.lineCount() - 1) : key === 'gg' ? 0 : b.lineCount() - 1
      return { to: b.firstNonBlank(b.startOfLine(line)), kind: 'line' }
    }
    case 'w': case 'W': {
      const big = key === 'W'
      let p = cur
      for (let i = 0; i < cnt; i++) {
        const t = wordFwd(b, p, big)
        if (ctx.op && i === cnt - 1 && b.lineNo(t) > b.lineNo(p) && t > b.lineEnd(p)) { p = b.lineEnd(p); break }
        p = t
      }
      return p === cur ? undefined : { to: p, kind: 'excl' }
    }
    case 'e': case 'E': {
      let p = cur
      for (let i = 0; i < cnt; i++) p = wordEnd(b, p, key === 'E')
      return p === cur ? undefined : { to: p, kind: 'incl' }
    }
    case 'b': case 'B': {
      let p = cur
      for (let i = 0; i < cnt; i++) p = wordBack(b, p, key === 'B')
      return p === cur ? undefined : { to: p, kind: 'excl' }
    }
    case 'f': case 'F': case 't': case 'T': {
      const to = findChar(b, cur, { key, ch: arg! }, cnt, false)
      return to === undefined ? undefined : { to, kind: key === 'f' || key === 't' ? 'incl' : 'excl' }
    }
    case ';': case ',': {
      if (!ctx.find) return undefined
      const rev = { f: 'F', F: 'f', t: 'T', T: 't' } as const
      const f: Find = key === ';' ? ctx.find : { key: rev[ctx.find.key], ch: ctx.find.ch }
      const to = findChar(b, cur, f, cnt, true)
      return to === undefined ? undefined : { to, kind: f.key === 'f' || f.key === 't' ? 'incl' : 'excl' }
    }
    case '%': {
      const to = matchBracket(b, cur)
      return to === undefined ? undefined : { to, kind: 'incl' }
    }
  }
  return undefined
}

/** Objeto de texto: [início, fim) ou undefined. */
export function textObject(b: Buf, cur: number, kind: 'i' | 'a', ch: string, count = 1): [number, number] | undefined {
  if (ch === 'w' || ch === 'W') {
    let r = wordObject(b, cur, kind, ch === 'W')
    for (let i = 1; r && i < count && r[1] < b.lineEnd(cur); i++) {
      const next = wordObject(b, r[1], kind, ch === 'W')
      if (!next) break
      r = [r[0], next[1]]
    }
    return r
  }
  if (ch === '"' || ch === "'" || ch === '`') return quoteObject(b, cur, kind, ch) // contagem não suportada
  const open = ch === ')' || ch === 'b' ? '(' : ch === ']' ? '[' : ch === '}' || ch === 'B' ? '{' : ch
  if (!(open in PAIRS)) return undefined
  // contagem = quantos níveis de pares envolventes subir
  let pair = bracketObject(b, cur, 'a', open)
  for (let i = 1; pair && i < count; i++) {
    const outer: [number, number] | undefined = pair[0] > 0 ? bracketObject(b, pair[0] - 1, 'a', open) : undefined
    pair = outer && outer[0] < pair[0] && outer[1] > pair[1] ? outer : undefined
  }
  if (!pair) return undefined
  return kind === 'i' ? [pair[0] + 1, pair[1] - 1] : pair
}

function wordObject(b: Buf, cur: number, kind: 'i' | 'a', big: boolean): [number, number] | undefined {
  const c = b.cls(cur, big)
  if (c === 3) return b.lineEnd(cur) === b.lineStart(cur) && cur < b.len ? [cur, cur] : undefined
  const ls = b.lineStart(cur), le = b.lineEnd(cur)
  let s = cur, e = b.next(cur)
  while (s > ls && b.cls(b.prev(s), big) === c) s = b.prev(s)
  while (e < le && b.cls(e, big) === c) e = b.next(e)
  if (kind === 'i') return [s, e]
  if (c !== 0) {
    let e2 = e
    while (e2 < le && b.cls(e2, big) === 0) e2 = b.next(e2)
    if (e2 > e) return [s, e2]
    while (s > ls && b.cls(b.prev(s), big) === 0) s = b.prev(s)
    return [s, e]
  }
  let e2 = e
  if (e2 < le) {
    const c2 = b.cls(e2, big)
    while (e2 < le && b.cls(e2, big) === c2) e2 = b.next(e2)
  }
  return [s, e2]
}

function quoteObject(b: Buf, cur: number, kind: 'i' | 'a', q: string): [number, number] | undefined {
  const ls = b.lineStart(cur), le = b.lineEnd(cur), t = b.text
  const qs: number[] = []
  for (let i = ls; i < le; i++) {
    if (t[i] === '\\') i++
    else if (t[i] === q) qs.push(i)
  }
  let pair: [number, number] | undefined
  for (let i = 0; i + 1 < qs.length; i += 2) {
    const [s, e] = [qs[i]!, qs[i + 1]!]
    if (s <= cur && cur <= e) { pair = [s, e]; break }
    if (s > cur) { pair = [s, e]; break }
  }
  if (!pair) return undefined
  if (kind === 'i') return [pair[0] + 1, pair[1]]
  let [s, e] = [pair[0], pair[1] + 1]
  const e0 = e
  while (e < le && /[ \t]/.test(t[e]!)) e++
  if (e === e0) while (s > ls && /[ \t]/.test(t[s - 1]!)) s--
  return [s, e]
}

function bracketObject(b: Buf, cur: number, kind: 'i' | 'a', open: string): [number, number] | undefined {
  const t = b.text, close = PAIRS[open]!
  let s = -1
  if (t[cur] === open) s = cur
  else {
    let depth = 0
    for (let i = t[cur] === close ? cur - 1 : cur; i >= 0; i--) {
      if (t[i] === close) depth++
      else if (t[i] === open) {
        if (depth === 0) { s = i; break }
        depth--
      }
    }
  }
  if (s < 0) return undefined
  let depth = 0
  for (let i = s + 1; i < t.length; i++) {
    if (t[i] === open) depth++
    else if (t[i] === close) {
      if (depth === 0) return kind === 'i' ? [s + 1, i] : [s, i + 1]
      depth--
    }
  }
  return undefined
}
