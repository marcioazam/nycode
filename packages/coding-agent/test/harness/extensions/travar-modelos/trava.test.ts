import assert from 'node:assert/strict'
import { test } from 'node:test'
import { carregar } from './carregar.ts'

const t = await carregar('travar-modelos/trava.ts')
const T = (models: Record<string, string[]>) => ({ version: 1, models })

test('analisar: válidos e inválidos', () => {
  assert.deepEqual(t.analisar({ version: 1, models: { 'a/b': ['high', 'low', 'low'] } }), T({ 'a/b': ['low', 'high'] }))
  for (const ruim of [null, [], 'x', { version: 2, models: {} }, { version: 1 }, { version: 1, models: [] }, { version: 1, models: {} }, { version: 1, models: { a: [] } }, { version: 1, models: { a: ['x'] } }, { version: 1, models: { '': ['low'] } }, { version: 1, models: { ['x'.repeat(121)]: ['low'] } }]) {
    assert.equal(typeof t.analisar(ruim), 'string', JSON.stringify(ruim))
  }
  assert.equal(typeof t.analisar(JSON.parse('{"version":1,"models":{"__proto__":["low"]}}')), 'string')
})

test('deArgs', () => {
  assert.deepEqual(t.deArgs('p/m:low,medium o/x:high'), T({ 'p/m': ['low', 'medium'], 'o/x': ['high'] }))
  assert.deepEqual(t.deArgs('openrouter/anthropic/claude-x:max'), T({ 'openrouter/anthropic/claude-x': ['max'] }))
  for (const ruim of ['p/m', 'p/m:', 'p/m:foo', 'm:low', '', ':low']) assert.equal(typeof t.deArgs(ruim), 'string', ruim)
})

test('deEnv', () => {
  assert.deepEqual(t.deEnv({}), {})
  assert.deepEqual(t.deEnv({ PI_MODEL_LOCK: '' }), {})
  const v = T({ 'a/b': ['low'] })
  assert.deepEqual(t.deEnv({ PI_MODEL_LOCK: t.paraEnv(v) }), { trava: v })
  assert.ok(t.deEnv({ PI_MODEL_LOCK: '{x' }).erro)
  assert.ok(t.deEnv({ PI_MODEL_LOCK: '{"version":3}' }).erro)
})

test('decidir', () => {
  const tr = T({ 'a/b': ['low', 'high'], 'c/d': ['medium'] })
  assert.deepEqual(t.decidir(tr, { modelo: 'a/b', esforco: 'low' }), { modelo: 'a/b', esforco: 'low', mudou: false })
  assert.deepEqual(t.decidir(tr, { modelo: 'a/b', esforco: 'medium' }), { modelo: 'a/b', esforco: 'low', mudou: true })
  assert.deepEqual(t.decidir(tr, { modelo: 'a/b', esforco: 'max' }), { modelo: 'a/b', esforco: 'high', mudou: true })
  assert.deepEqual(t.decidir(tr, { modelo: 'c/d', esforco: 'off' }), { modelo: 'c/d', esforco: 'medium', mudou: true })
  assert.deepEqual(t.decidir(tr, { modelo: 'x/y', esforco: 'high' }), { modelo: 'a/b', esforco: 'high', mudou: true })
  assert.deepEqual(t.decidir(tr, { modelo: 'x/y', esforco: 'high' }, 'c/d'), { modelo: 'c/d', esforco: 'medium', mudou: true })
  assert.equal(t.decidir(tr, { modelo: 'x/y', esforco: 'low' }, 'fora/lista').modelo, 'a/b')
})

test('formatar', () => {
  assert.equal(t.formatar(undefined), 'Sem trava de modelos nesta sessão.')
  assert.equal(t.formatar(T({ 'a/b': ['low', 'medium'] })), 'Modelos travados nesta sessão:\na/b · low, medium')
})
