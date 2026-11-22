// node --experimental-strip-types --test extensions/ui-visual/test/tools/cache.test.ts
// Perf (docs/perf-sota.md, D2/tarefa 5): hora memoizada por chamada e linha terminada em cache até algo que ela lê mudar.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mod, ctx, base, ansiPlain, ficha } from './base.ts'

const T = new Date(2026, 10, 14, 9, 41, 30).getTime()
const sessao = (ids: string[]) => {
  const branch = ids.map((id) => ({ type: 'message', message: { role: 'toolResult', toolCallId: id, timestamp: T } }))
  const on: Record<string, any> = {}
  let resolver: any
  mod.default({ registerToolRenderer: (r: unknown) => (resolver = r), on: (e: string, h: unknown) => (on[e] = h) })
  on.session_start({}, { sessionManager: { getBranch: () => branch } })
  return resolver
}
// Tema que conta as chamadas de fg: uma linha vinda do cache não chama o tema.
const contado = () => {
  const t = { chamadas: 0, fg: (_c: string, x: string) => (t.chamadas++, `\x1b[2m${x}\x1b[22m`), bold: ansiPlain.bold }
  return t
}
// Conta quantas vezes o formatador Intl é usado (o getter `format` do protótipo).
const espiaFormat = () => {
  const d = Object.getOwnPropertyDescriptor(Intl.DateTimeFormat.prototype, 'format')!
  const o = { n: 0 }
  Object.defineProperty(Intl.DateTimeFormat.prototype, 'format', { ...d, get() { const f = d.get!.call(this); return (...a: unknown[]) => (o.n++, (f as any)(...a)) } })
  return { o, volta: () => Object.defineProperty(Intl.DateTimeFormat.prototype, 'format', d) }
}
const args = { path: '/work/proj/a.ts' }
const nova = (id: string, c: Record<string, unknown> = {}, th: any = contado()) => {
  const resolver = sessao([id])
  const call = resolver('read', base).renderCall(args, th, ctx({ args, toolCallId: id, durationMs: 120_000, ...c }))
  return { call, th }
}

test('cache: mesma saída com e sem cache, com a hora do histórico', () => {
  const { call } = nova('c-1')
  const a = call.render(90)
  assert.ok(ficha(a[0]).endsWith('  09:41'), ficha(a[0]))
  assert.deepEqual(call.render(90), a)
  call.invalidate()
  assert.deepEqual(call.render(90), a, 'recalculado após invalidate dá o mesmo')
  assert.deepEqual(nova('c-1').call.render(90), a, 'componente novo (sem cache) dá o mesmo')
})

test('cache: a linha em cache não chama o tema nem o formatador de novo', () => {
  const { call, th } = nova('c-2')
  const esp = espiaFormat()
  try {
    call.render(90)
    const fg = th.chamadas
    const fmt = esp.o.n
    for (let i = 0; i < 5; i++) call.render(90)
    assert.equal(th.chamadas, fg, 'tema não é chamado de novo')
    assert.equal(esp.o.n, fmt, 'a hora não é formatada de novo')
  } finally {
    esp.volta()
  }
})

test('cache: largura, estado, erro, tema e invalidate recalculam', () => {
  const { call, th } = nova('c-3', { state: { uiRight: '3 linhas' } })
  const w90 = call.render(90)
  let n = th.chamadas
  const w60 = call.render(60)
  assert.ok(th.chamadas > n, 'outra largura recalcula')
  assert.notDeepEqual(w60, w90)
  n = th.chamadas
  call.render(60)
  assert.equal(th.chamadas, n, 'mesma largura volta ao cache')
  const c = ctx({ args, toolCallId: 'c-3', durationMs: 120_000, state: { uiRight: '3 linhas' } })
  const tema = contado()
  const comp = sessao(['c-3'])('read', base).renderCall(args, tema, c)
  const antes = comp.render(90)
  n = tema.chamadas
  c.state.uiRight = '9 linhas'
  const depois = comp.render(90)
  assert.ok(tema.chamadas > n, 'mudar o resumo recalcula')
  assert.match(ficha(depois[0]), /9 linhas/)
  assert.notDeepEqual(depois, antes)
  n = tema.chamadas
  c.isError = true
  comp.render(90)
  assert.ok(tema.chamadas > n, 'virar erro recalcula')
  n = tema.chamadas
  comp.invalidate()
  comp.render(90)
  assert.ok(tema.chamadas > n, 'invalidate recalcula')
  // tema trocado sob o mesmo objeto (token de fundo diferente) também recalcula
  const mut: any = contado()
  mut.bg = (_c: string, x: string) => x
  mut.getBgAnsi = () => 'A'
  mut.getFgAnsi = () => 'F'
  const c2 = ctx({ args, toolCallId: 'c-3', durationMs: 120_000 })
  const comp2 = sessao(['c-3'])('read', base).renderCall(args, mut, c2)
  comp2.render(90)
  n = mut.chamadas
  mut.getBgAnsi = () => 'B'
  comp2.render(90)
  assert.ok(mut.chamadas > n, 'cor do tema mudou: recalcula')
})

test('cache: chamada em execução recalcula a cada quadro', () => {
  const { call, th } = nova('c-4', { isPartial: true })
  call.render(90)
  const n = th.chamadas
  call.render(90)
  assert.ok(th.chamadas > n)
})
