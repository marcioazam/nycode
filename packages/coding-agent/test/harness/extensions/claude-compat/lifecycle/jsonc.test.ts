import assert from 'node:assert/strict'
import { test } from 'node:test'
import { appendToRootArray, parseJsonc, rootArray, stripJsonc, undoEdits } from '../jsonc.ts'

test('parse: comentários, vírgula final, BOM; strings com // , ,] e escapes intactas', () => {
  const t = '\ufeff// topo\n[\n  { "a": "x // y ,]", /* c */ "b": "\\" ,}" }, // fim\n]\n'
  assert.deepEqual(parseJsonc(t), [{ a: 'x // y ,]', b: '" ,}' }])
  assert.equal(stripJsonc('[1, 2,\n]'), '[1, 2\n]')
})

test('parse: erros explícitos', () => {
  assert.throws(() => parseJsonc('[/* sem fim'), /sem fim/)
  assert.throws(() => parseJsonc('["abc'), /string sem fim/)
  assert.throws(() => parseJsonc('{"a":'))
})

test('rootArray: elementos aninhados, comentários e vírgula final', () => {
  const t = '[ // c\n {"a":[1,2]}, /* x */ [3], 4,\n]'
  const a = rootArray(t)
  assert.equal(a.elements.length, 3)
  assert.equal(t.slice(a.elements[0]!.start, a.elements[0]!.end), '{"a":[1,2]}')
  assert.ok(a.trailingComma !== undefined)
  assert.throws(() => rootArray('{"a":1}'), /não é um array/)
  assert.throws(() => rootArray('[1,'), /array sem fim/)
  assert.throws(() => rootArray('[,1]'), /vírgula inesperada/)
  assert.throws(() => rootArray('[1 /* x'), /sem fim/)
  assert.throws(() => rootArray('\ufeff// só comentário\n'), /não é um array/)
})

test('append: vazio, sem vírgula final, com vírgula final, comentário no fim — texto original preservado', () => {
  for (const base of ['[]', '[\n  {"a":1}\n]', '[\n  {"a":1},\n]', '[\n  {"a":1} // último\n]\n', '[{"a":1}]', '[\n  {"a":1}, // c\n]', '// c\n[\n  1, // um\n  2\n]']) {
    const r = appendToRootArray(base, '{\n  "k": 1\n}')
    assert.equal(undoEdits(r.text, r.edits), base, base)
    const parsed = parseJsonc(r.text) as unknown[]
    assert.deepEqual(parsed.at(-1), { k: 1 }, base)
    assert.equal(parsed.length, (parseJsonc(base) as unknown[]).length + 1)
  }
})
