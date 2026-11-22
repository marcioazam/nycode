// node --experimental-strip-types --test extensions/claude-compat/vim/test/render.test.ts
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { highlight } from '../render.ts'

const REV = '\x1b[7m'
const OFF = '\x1b[27m'
const W = 12
const top = '─'.repeat(W)
/** Monta linhas como o editor: borda, conteúdo preenchido até W, borda com rótulo. */
const frame = (content: string[]) => [top, ...content, `${'─'.repeat(W - 8)} VISUAL ───`]
const pad = (s: string, vis: number) => s + ' '.repeat(Math.max(0, W - vis))
const marked = (rows: string[]) => rows.flatMap((r) => [...r.matchAll(/\x1b\[7m([^\x1b]*)\x1b\[27m/g)].map((m) => m[1]))
const strip = (r: string) => r.replace(/\x1b\[[0-9;]*m/g, '')

test('seleção simples e padding: o padding não é realçado e o texto visível não muda', () => {
  const rows = frame([pad('  abcd', 6)])
  const out = highlight(rows, ['abcd'], { s: 1, e: 3, linewise: false }, 2)!
  assert.deepEqual(marked(out), ['b', 'c'])
  assert.equal(strip(out[1]!), rows[1])
  assert.ok(out[1]!.startsWith('  a'))
})

test('ANSI no texto: sequências preservadas e realce por grapheme', () => {
  const rows = frame([`\x1b[31mabcd\x1b[0m` + ' '.repeat(W - 4)])
  const out = highlight(rows, ['abcd'], { s: 1, e: 3, linewise: false }, 0)!
  assert.equal(out[1], `\x1b[31ma${REV}b${OFF}${REV}c${OFF}d\x1b[0m` + ' '.repeat(W - 4))
})

test('linha quebrada: o realce continua na linha seguinte', () => {
  const rows = frame([pad('aaa bbb ', 8), pad('ccc', 3)])
  const out = highlight(rows, ['aaa bbb ccc'], { s: 4, e: 9, linewise: false }, 0)!
  assert.deepEqual(marked(out), ['b', 'b', 'b', 'c']) // o espaço no fim da linha quebrada não é pintado
})

test('linhas em branco entram no realce linewise; fora da seleção não', () => {
  const rows = frame([pad('a', 1), pad('', 0), pad('b', 1)])
  const out = highlight(rows, ['a', '', 'b'], { s: 0, e: 4, linewise: true }, 0)!
  assert.deepEqual(marked(out), ['a', ' ', 'b'])
  const part = highlight(rows, ['a', '', 'b'], { s: 2, e: 4, linewise: true }, 0)!
  assert.deepEqual(marked(part), [' ', 'b'])
})

test('CJK e bidi: alinhamento por texto lógico', () => {
  const cjk = highlight(frame([pad('漢字かな', 8)]), ['漢字かな'], { s: 1, e: 3, linewise: false }, 0)!
  assert.deepEqual(marked(cjk), ['字', 'か'])
  const bidi = highlight(frame([pad('שלום abc', 8)]), ['שלום abc'], { s: 0, e: 4, linewise: false }, 0)!
  assert.deepEqual(marked(bidi), ['ש', 'ל', 'ו', 'ם'])
})

test('composer rolado: só as últimas linhas aparecem e ainda alinham', () => {
  const rows = frame([pad('l2', 2), pad('l3', 2)])
  const out = highlight(rows, ['l0', 'l1', 'l2', 'l3'], { s: 9, e: 11, linewise: false }, 0)!
  assert.deepEqual(marked(out), ['l', '3'])
})

test('célula do cursor no fim da linha não é tratada como texto', () => {
  const rows = frame([`ab${REV} \x1b[0m` + ' '.repeat(W - 3)])
  const out = highlight(rows, ['ab'], { s: 0, e: 2, linewise: false }, 0)!
  assert.deepEqual(marked(out).slice(0, 2), ['a', 'b'])
  assert.ok(out[1]!.includes(`${REV} \x1b[0m`))
})

test('sem alinhamento possível devolve undefined (o editor avisa; nada é pintado errado)', () => {
  assert.equal(highlight(frame([pad('zzz', 3)]), ['abc'], { s: 0, e: 1, linewise: false }, 0), undefined)
  assert.equal(highlight([top, top], ['a'], { s: 0, e: 1, linewise: false }, 0), undefined)
})
