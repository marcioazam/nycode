/** JSONC mínimo (sem dependência): parse tolerante a comentários/vírgula final e inserção em array por deslocamento. */

/** Remove comentários e vírgulas finais fora de strings (duas passadas, ambas cientes de strings). */
export function stripJsonc(text: string): string {
  let out = ''
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!
    if (c === '"') {
      const j = stringEnd(text, i)
      out += text.slice(i, j)
      i = j - 1
    } else if (c === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i + 1] !== '\n') i++
    } else if (c === '/' && text[i + 1] === '*') {
      const j = text.indexOf('*/', i + 2)
      if (j < 0) throw new Error('comentário de bloco sem fim')
      i = j + 1
      out += ' '
    } else out += c
  }
  let res = ''
  for (let i = 0; i < out.length; i++) {
    const c = out[i]!
    if (c === '"') {
      const j = stringEnd(out, i)
      res += out.slice(i, j)
      i = j - 1
    } else if (c === ',' && closesAfter(out, i + 1)) continue
    else res += c
  }
  return res
}

function closesAfter(text: string, from: number): boolean {
  const re = /\s*[\]}]/y
  re.lastIndex = from
  return re.test(text)
}

function stringEnd(text: string, start: number): number {
  for (let i = start + 1; i < text.length; i++) {
    if (text[i] === '\\') i++
    else if (text[i] === '"') return i + 1
    else if (text[i] === '\n') break
  }
  throw new Error('string sem fim')
}

export function parseJsonc(text: string): unknown {
  return JSON.parse(stripJsonc(text.replace(/^\ufeff/, '')))
}

interface Span { start: number; end: number }
export interface ArrayInfo { open: number; close: number; elements: Span[]; trailingComma: number | undefined }

/** Localiza o array de nível raiz e os intervalos dos seus elementos (strings/comentários/aninhamento respeitados). */
export function rootArray(text: string): ArrayInfo {
  let i = 0
  const skip = () => {
    for (;;) {
      while (i < text.length && /\s/.test(text[i]!)) i++
      if (text[i] === '/' && text[i + 1] === '/') while (i < text.length && text[i] !== '\n') i++
      else if (text[i] === '/' && text[i + 1] === '*') {
        const j = text.indexOf('*/', i + 2)
        if (j < 0) throw new Error('comentário de bloco sem fim')
        i = j + 2
      } else return
    }
  }
  if (text.charCodeAt(0) === 0xfeff) i = 1
  skip()
  if (text[i] !== '[') throw new Error('o arquivo não é um array JSON')
  const open = i++
  const elements: Span[] = []
  let trailingComma: number | undefined
  for (;;) {
    skip()
    if (i >= text.length) throw new Error('array sem fim')
    if (text[i] === ']') return { open, close: i, elements, trailingComma }
    if (text[i] === ',') { if (!elements.length) throw new Error('vírgula inesperada'); trailingComma = i++; continue }
    const start = i
    let depth = 0
    let last = start // fim do último token (comentários e espaços finais ficam fora do elemento)
    for (; i < text.length; i++) {
      const c = text[i]!
      if (c === '"') { i = stringEnd(text, i) - 1; last = i + 1 }
      else if (c === '/' && text[i + 1] === '/') while (i < text.length && text[i + 1] !== '\n') i++
      else if (c === '/' && text[i + 1] === '*') { const j = text.indexOf('*/', i + 2); if (j < 0) throw new Error('comentário de bloco sem fim'); i = j + 1 }
      else if (c === '{' || c === '[') { depth++; last = i + 1 }
      else if (c === '}' || c === ']') { if (depth === 0) break; depth--; last = i + 1 }
      else if (c === ',' && depth === 0) break
      else if (!/\s/.test(c)) last = i + 1
    }
    const end = last
    elements.push({ start, end })
    trailingComma = undefined
  }
}

export interface Edit { at: number; text: string }

/** Fim da linha em `from` se o resto dela é só espaço ou comentário `//` (o comentário fica com o elemento anterior). */
function lineEnd(text: string, from: number): number {
  const m = /[ \t]*(\/\/[^\n]*)?(?=\n|$)/y
  m.lastIndex = from
  const r = m.exec(text)
  return r ? from + r[0].length : from
}

/** Insere `entry` (JSON já formatado, sem indentação) ao fim do array raiz como edições por deslocamento. */
export function appendToRootArray(text: string, entry: string): { text: string; edits: Edit[] } {
  const a = rootArray(text)
  const body = entry.split('\n').map((l) => '  ' + l).join('\n')
  let edits: Edit[]
  if (!a.elements.length) edits = [{ at: a.open + 1, text: `\n${body}\n` }]
  else if (a.trailingComma !== undefined) edits = [{ at: lineEnd(text, a.trailingComma + 1), text: `\n${body},` }]
  else {
    const e = a.elements.at(-1)!.end
    const le = lineEnd(text, e)
    edits = le === e ? [{ at: e, text: `,\n${body}` }] : [{ at: e, text: ',' }, { at: le, text: `\n${body}` }]
  }
  return { text: applyEdits(text, edits), edits }
}

export function applyEdits(text: string, edits: Edit[]): string {
  return [...edits].sort((x, y) => y.at - x.at).reduce((t, e) => t.slice(0, e.at) + e.text + t.slice(e.at), text)
}

/** Prova de preservação: desfazer as inserções devolve exatamente o texto original. */
export function undoEdits(text: string, edits: Edit[]): string {
  let cum = 0
  const spans = [...edits].sort((x, y) => x.at - y.at).map((e) => { const p = e.at + cum; cum += e.text.length; return { p, l: e.text.length } })
  return spans.reverse().reduce((t, { p, l }) => t.slice(0, p) + t.slice(p + l), text)
}
