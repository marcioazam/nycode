import assert from 'node:assert/strict'
import test from 'node:test'
import { sanitizarExibicao } from '../a11y.ts'

test('tira OSC 52 e C0, e conserva SGR de realce', () => {
  const osc = 'nome\u001b]52;c;c2VjcmV0bw==\u0007fim'
  assert.equal(sanitizarExibicao(osc), 'nomefim')
  assert.equal(sanitizarExibicao('a\u001b[2Jb'), 'ab')
  assert.equal(sanitizarExibicao('\u001b[38;5;81mok\u001b[0m'), '\u001b[38;5;81mok\u001b[0m')
  assert.equal(sanitizarExibicao('x\u0000y\u0007'), 'xy')
})
