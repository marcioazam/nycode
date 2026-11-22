// node --experimental-strip-types --test ~/.pi/agent/extensions/claude-compat/test/aliases.test.ts
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ALIASES, resolveAlias } from '../aliases.ts'

test('alias exato reescreve para o comando do pi', () => {
  assert.deepEqual(resolveAlias('/continue'), { kind: 'rewrite', text: '/resume', notice: undefined })
  assert.deepEqual(resolveAlias('  /config  '), { kind: 'rewrite', text: '/settings', notice: undefined })
  assert.deepEqual(resolveAlias('/exit'), { kind: 'rewrite', text: '/quit', notice: undefined })
  assert.equal((resolveAlias('/cost') as any).text, '/session')
  assert.match((resolveAlias('/cost') as any).notice, /sessão/)
})

test('argumentos: passam quando o destino os aceita, recusam quando não', () => {
  assert.deepEqual(resolveAlias('/effort high'), { kind: 'rewrite', text: '/claude-effort high', notice: undefined })
  assert.deepEqual(resolveAlias('/effort'), { kind: 'rewrite', text: '/claude-effort', notice: undefined })
  assert.deepEqual(resolveAlias('/config theme=dark'), { kind: 'rewrite', text: '/claude-config theme=dark', notice: undefined })
  assert.deepEqual(resolveAlias('/branch minha-copia'), { kind: 'rewrite', text: '/claude-branch minha-copia', notice: undefined })
  assert.equal((resolveAlias('/branch') as any).text, '/clone')
  assert.equal((resolveAlias('/theme escuro') as any).text, '/claude-theme escuro')
  assert.equal((resolveAlias('/tui regular') as any).text, '/claude-tui regular')
  assert.equal(resolveAlias('/continue abc').kind, 'refuse')
})

test('fronteira do comando: só o primeiro token inteiro, nunca no meio do texto', () => {
  for (const t of ['/configure', '/config-x', 'use /config', 'hello /exit', '', '/', '//config', 'config', '/Config', '/clear', '/new', '/hotkeys', '/__proto__', '/constructor'])
    assert.deepEqual(resolveAlias(t), { kind: 'pass' }, t)
})

test('comando já registrado com o mesmo nome vence o alias', () => {
  assert.deepEqual(resolveAlias('/cost', (n) => n === 'cost'), { kind: 'pass' })
  assert.equal(resolveAlias('/cost', (n) => n === 'other').kind, 'rewrite')
})

test('/fork, /share, /bug, /import e /permissions nunca são aliases (semânticas diferentes)', () => {
  for (const n of ['fork', 'share', 'bug', 'import', 'export', 'permissions', 'allowed-tools', 'clear', 'reset'])
    assert.equal(Object.hasOwn(ALIASES, n), false, n)
})

test('todo destino de alias é comando nativo ou do pi-code conhecido', () => {
  const known = new Set(['claude-effort', 'claude-copy', 'settings', 'resume', 'quit', 'clone', 'rewind', 'tasks', 'session', 'thinking', 'changelog', 'reload'])
  for (const [a, r] of Object.entries(ALIASES)) assert.ok(known.has(r.target), a)
})

test('/copy: sem argumentos continua nativo; com argumentos vai ao /claude-copy', () => {
  assert.deepEqual(resolveAlias('/copy'), { kind: 'pass' })
  assert.deepEqual(resolveAlias('/copy 2'), { kind: 'rewrite', text: '/claude-copy 2', notice: undefined })
  assert.deepEqual(resolveAlias('/copy blocks', (n) => n === 'copy'), { kind: 'pass' })
})
