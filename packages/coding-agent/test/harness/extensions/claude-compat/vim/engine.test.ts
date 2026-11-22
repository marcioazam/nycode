// node --experimental-strip-types --test extensions/claude-compat/vim/test/engine.test.ts
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { VimEngine, VimError, type VimHost } from '../engine.ts'
import { Buf } from '../text.ts'

const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

/** Host em memória: edit empilha snapshot (um passo de undo), send aplica teclado nativo mínimo. */
class Fake implements VimHost {
  t: string
  cur: number
  snaps: Array<[string, number]> = []
  sent: string[] = []
  clock = 0
  ids: ReadonlySet<string> = new Set()
  warnings: string[] = []
  failNext: string | undefined
  histCalls = 0
  constructor(spec: string) {
    this.cur = Math.max(0, spec.indexOf('|'))
    this.t = spec.replace('|', '')
  }
  text() { return this.t }
  cursor() { return this.cur }
  markerIds() { return this.ids }
  warn(m: string) { this.warnings.push(m) }
  now() { return this.clock }
  edit(text: string, cursor: number) {
    if (this.failNext) { const m = this.failNext; this.failNext = undefined; throw new VimError(m) }
    if (text !== this.t) this.snaps.push([this.t, this.cur]); this.t = text; this.cur = cursor
  }
  moveTo(c: number) { this.cur = c }
  history() { this.histCalls++ }
  undo(n: number) { for (let i = 0; i < n; i++) { const s = this.snaps.pop(); if (s) [this.t, this.cur] = s } }
  send(seq: string) { this.sent.push(seq); this.native(seq) }
  native(seq: string) {
    if (seq === '\x7f') {
      const b = new Buf(this.t)
      const p = b.prev(this.cur)
      this.t = this.t.slice(0, p) + this.t.slice(this.cur)
      this.cur = p
    } else if (!seq.startsWith('\x1b') && seq >= ' ') {
      this.t = this.t.slice(0, this.cur) + seq + this.t.slice(this.cur)
      this.cur += seq.length
    }
  }
  show() { return `${this.t.slice(0, this.cur)}|${this.t.slice(this.cur)}` }
}

function setup(spec: string, remaps: string[] = []) {
  const f = new Fake(spec)
  const e = new VimEngine(f)
  e.mode = 'normal'
  e.remaps = new Set(remaps)
  const feed = (keys: string) => {
    for (const { segment: k } of seg.segment(keys)) if (e.handle(k, k === '\x1b') === 'pass') f.native(k)
  }
  return { f, e, feed }
}
const run = (spec: string, keys: string) => {
  const { f, feed } = setup(spec)
  feed(keys)
  return f.show()
}

import { CASES, ESC } from './cases.ts'
for (const [name, from, keys, want] of CASES) test(`vim: ${name}`, () => assert.equal(run(from, keys), want))

test('Esc: normal sem pendência repassa (cancelamento do app); com pendência/visual consome', () => {
  const { e, f } = setup('a|b')
  assert.equal(e.handle(ESC, true), 'pass')
  e.handle('d', false)
  assert.equal(e.handle(ESC, true), 'consumed')
  assert.equal(e.pending(), '')
  e.handle('v', false)
  assert.equal(e.mode, 'visual')
  assert.equal(e.handle(ESC, true), 'consumed')
  assert.equal(e.mode, 'normal')
  assert.equal(f.show(), 'a|b')
})

test('Esc no insert volta ao normal com o cursor recuado; teclas não vim e controles passam', () => {
  const { e, f, feed } = setup('|')
  feed('i')
  assert.equal(e.mode, 'insert')
  feed('ab')
  assert.equal(f.show(), 'ab|')
  feed(ESC)
  assert.equal(e.mode, 'normal')
  assert.equal(f.show(), 'a|b')
  assert.equal(e.handle('\x03', false), 'pass')
  assert.equal(e.handle('\x1b[A', false), 'pass')
  assert.equal(e.handle('é', false), 'consumed') // tecla desconhecida: consumida, nunca digitada
  assert.equal(f.show(), 'a|b')
})

test('comando inválido descarta pendência e mantém o texto', () => {
  const { f, feed } = setup('a|bc')
  feed('dzz')
  assert.equal(f.show(), 'a|bc')
  feed('gz')
  assert.equal(f.show(), 'a|bc')
})

test('j/k no limite repassam ↑/↓ nativos (histórico); / abre a busca no histórico', () => {
  const { f, feed } = setup('a|b')
  feed('jk')
  assert.deepEqual(f.sent, ['\x1b[B', '\x1b[A'])
  feed('/')
  assert.equal(f.histCalls, 1)
})

test('remap jj: segunda tecla em até 1 s sai do INSERT e apaga a primeira; após 1 s digita', () => {
  const { f, e, feed } = setup('|', ['jj'])
  feed('ij')
  f.clock = 500
  feed('j')
  assert.equal(e.mode, 'normal')
  assert.equal(f.show(), '|')
  feed('ij')
  f.clock = 5000
  feed('j')
  assert.equal(e.mode, 'insert')
  assert.equal(f.t, 'jj')
})

test('marcador de colagem ativo é átomo: x apaga o marcador inteiro, w o atravessa', () => {
  const marker = '[paste #1 +5 lines]'
  const { f, feed } = setup(`a |${marker} b`)
  f.ids = new Set(['1'])
  feed('x')
  assert.equal(f.show(), 'a | b')
  const g = setup(`|a ${marker} b`)
  g.f.ids = new Set(['1'])
  g.feed('ww')
  assert.equal(g.f.cur, `a ${marker} `.length)
})

test('marcador literal (sem conteúdo guardado) é texto comum; só ids ativos são átomos', () => {
  const lit = '[paste #1 +5 lines]'
  const plain = setup(`|${lit}`)
  plain.feed('x')
  assert.equal(plain.f.t, lit.slice(1))
  const mixed = setup(`|${lit} [paste #2 +3 lines]`)
  mixed.f.ids = new Set(['1'])
  mixed.feed('x')
  assert.equal(mixed.f.t, ' [paste #2 +3 lines]')
  mixed.feed('wx') // o #2 é literal: apaga só um caractere
  assert.equal(mixed.f.t, ' paste #2 +3 lines]')
})

test('falha do host (limite, API ausente): avisa, não altera o texto e restaura o modo', () => {
  const { e, f, feed } = setup('a|bc')
  f.failNext = 'limite excedido'
  feed('x')
  assert.deepEqual(f.warnings, ['limite excedido'])
  assert.equal(f.show(), 'a|bc')
  assert.equal(e.mode, 'normal')
  f.failNext = 'sem API'
  feed('cw') // c entra em insert antes de editar: a falha deve voltar ao normal
  assert.equal(e.mode, 'normal')
  assert.equal(f.t, 'abc')
  assert.equal(e.pending(), '')
  feed('x') // segue funcionando
  assert.equal(f.show(), 'a|c')
})

test('estado limitado: captura de insert tem teto e reset volta a insert', () => {
  const { e, f, feed } = setup('|')
  feed('i')
  for (let i = 0; i < 5000; i++) feed('x')
  feed(ESC)
  feed('.')
  assert.ok(f.t.length < 9100)
  e.reset()
  assert.equal(e.mode, 'insert')
})

test('seleção visual exposta ao render', () => {
  const { e, feed } = setup('a|bcd')
  assert.equal(e.selection(), undefined)
  feed('vl')
  assert.deepEqual(e.selection(), { s: 1, e: 3, linewise: false })
  feed('V')
  assert.deepEqual(e.selection(), { s: 0, e: 4, linewise: true })
})

test('F5: contagem enorme de insert é barrada (aviso, sem milhões de send) e o motor segue usável', () => {
  const { e, f, feed } = setup('|')
  feed('99999999iabc' + ESC)
  assert.ok(f.sent.length <= 20_000, `send chamado ${f.sent.length}x`)
  assert.ok(f.warnings.length >= 1)
  feed(ESC)
  assert.equal(e.mode, 'normal')
})

test('F5: repetição pequena de insert continua exata; contagem digitada é limitada a 9999', () => {
  assert.equal(run('|', '3iab' + ESC), 'ababa|b')
  const { f, feed } = setup('|')
  feed('99999999x')
  assert.ok(f.sent.length === 0)
})

test('F5: replay do `.` com contagem enorme também é barrado', () => {
  const { f, feed } = setup('|')
  feed('99999999iabc' + ESC)
  const before = f.sent.length
  feed('.')
  assert.ok(f.sent.length - before <= 20_000, `replay enviou ${f.sent.length - before}`)
})
