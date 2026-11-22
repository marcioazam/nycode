// node --experimental-strip-types --test extensions/folha/test/*.test.ts
import assert from 'node:assert/strict'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

// O Node não tira tipos de .ts dentro de node_modules: testa uma cópia do módulo.
const tmp = mkdtempSync(join(tmpdir(), 'folha-confirm-test-'))
cpSync(new URL('../confirm.ts', import.meta.url), join(tmp, 'confirm.ts'))
const installs = join(homedir(), '.pi/agent/install')
const version = readFileSync(join(installs, 'current-version'), 'utf8').trim()
mkdirSync(join(tmp, 'node_modules'))
symlinkSync(join(installs, 'releases', version, 'node_modules/@earendil-works'), join(tmp, 'node_modules/@earendil-works'))
const m = await import(join(tmp, 'confirm.ts'))

const CASES: Array<[string, string, string, string]> = [
  ['Trust this project?', 'Confiar neste projeto?', 'Não confiar', 'Confiar e carregar'],
  ['Run project-local agents?', 'Executar agentes deste projeto?', 'Não executar', 'Executar'],
  ['Load imports from outside this project?', 'Carregar imports de fora deste projeto?', 'Não carregar', 'Carregar'],
  ['Allow this command?', 'Permitir este comando?', 'Não permitir', 'Permitir'],
  ['Allow Bash(rm x)?', 'Permitir Bash(rm x)?', 'Não permitir', 'Permitir'],
  ['Qualquer outra coisa', 'Qualquer outra coisa', 'Não', 'Sim'],
]

function spy(result: unknown) {
  const calls: any[][] = []
  const select = async (...a: any[]) => { calls.push(a); return result as string | undefined }
  return { select, calls }
}

for (const [title, pt, safe, action] of CASES) {
  test(`catálogo: ${title}`, async () => {
    assert.deepEqual(m.labelsFor(title), { title: pt, safe, action })
    const s = spy(action)
    const opts = { timeout: 5 }
    assert.equal(await m.safeConfirm(s.select)(title, 'corpo\nlinha 2', opts), true)
    assert.equal(s.calls[0][0], `${pt}\ncorpo\nlinha 2`)
    assert.deepEqual(s.calls[0][1], [safe, action]) // seguro sempre no índice 0
    assert.equal(s.calls[0][2], opts) // identidade
    for (const r of [safe, undefined, 'Yes', 'qualquer', '']) {
      assert.equal(await m.safeConfirm(spy(r).select)(title, 'x', undefined), false)
    }
  })
}

test('cartão: borda, ação perigosa em vermelho e foco seguro; mover e Enter confirmam, Esc não', () => {
  const t = { fg: (c: string, s: string) => c === 'error' ? `\x1b[31m${s}\x1b[39m` : s, bold: (s: string) => s }
  const labels = m.labelsFor('Allow this command?')
  const valores: boolean[] = []
  const card = new m.CartaoConfirmar(t, labels, 'rm -r build/', (v: boolean) => valores.push(v), () => {})
  const l = card.render(60)
  assert.match(l.at(-2), /\x1b\[7m\[ Não permitir \]\x1b\[27m {3}\x1b\[31m\[ Permitir \]/)
  card.handleInput('\r')
  card.handleInput('\x1b[C')
  card.handleInput('\r')
  card.handleInput('\x1b')
  assert.deepEqual(valores, [false, true, false])
  assert.equal(m.riscoDe('Trust this project?', ''), 'warning')
  assert.equal(m.riscoDe('Abrir sessão?', ''), 'text')
})

test('cartão ativo: abort e timeout devolvem false, sem chamar fallback', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const ui = { select: async () => assert.fail('fallback select'), confirm: async () => assert.fail('fallback confirm'), custom: (f: any) => new Promise((done) => f({ requestRender() {} }, {}, undefined, done)) }
  m.installConfirm(ui)
  const ctrl = new AbortController()
  const p = (ui.confirm as any)('Permitir?', 'Teste', { signal: ctrl.signal })
  ctrl.abort()
  assert.equal(await p, false)
  const timeout = (ui.confirm as any)('Permitir?', 'Teste', { timeout: 20 })
  t.mock.timers.tick(20)
  assert.equal(await timeout, false)
})

test('instalar duas vezes não embrulha duas vezes', async () => {
  const orig = async () => true
  const ui: any = { select: async () => 'Sim', confirm: orig }
  m.installConfirm(ui)
  const first = ui.confirm
  m.installConfirm(ui)
  assert.equal(ui.confirm, first)
  assert.notEqual(first, orig)
})

test('não instala sem select ou confirm', () => {
  const a: any = { confirm: async () => true }
  m.installConfirm(a)
  assert.equal(typeof a.select, 'undefined')
  const b: any = { select: async () => 'x' }
  m.installConfirm(b)
  assert.equal(b.confirm, undefined)
})

test('erro no select chama o confirm original uma vez e devolve o resultado dele', async () => {
  const seen: any[][] = []
  const opts = {}
  const ui: any = { select: async () => { throw new Error('x') }, confirm: async (...a: any[]) => { seen.push(a); return false } }
  m.installConfirm(ui)
  assert.equal(await ui.confirm('Trust this project?', 'msg', opts), false)
  assert.equal(seen.length, 1)
  assert.deepEqual(seen[0].slice(0, 2), ['Trust this project?', 'msg'])
  assert.equal(seen[0][2], opts)
})
