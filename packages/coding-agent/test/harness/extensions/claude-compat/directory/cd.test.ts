import assert from 'node:assert/strict'
import { test } from 'node:test'
import registerDirectory, { cdCommand, type Deps } from '../index.ts'

function fx(o: { idle?: boolean; pending?: boolean; file?: string | undefined; result?: any; cwd?: string } = {}) {
  const notes: [string, string][] = []
  const calls: any[] = []
  const ctx: any = {
    cwd: o.cwd ?? '/w/a',
    ui: { notify: (m: string, t: string) => notes.push([m, t]) },
    isIdle: () => o.idle ?? true,
    hasPendingMessages: () => o.pending ?? false,
    sessionManager: { getSessionFile: () => ('file' in o ? o.file : '/s/x.jsonl') },
    switchSession: async (p: string, opts: any) => {
      calls.push([p, opts.piSessionCwd])
      const r = o.result ?? { cancelled: false }
      if (!r.cancelled) await opts.withSession({ ui: ctx.ui }, r.piSessionCwd)
      return r
    },
  }
  const deps = (over: Partial<Deps> = {}): Deps => ({ patched: () => true, resolve: (a: string) => ({ ok: true, dir: `/w/${a}` }), ...over })
  return { ctx, notes, calls, deps }
}

test('sucesso: chama switchSession com o arquivo atual e só {cwd}; avisa pelo withSession', async () => {
  const f = fx({ result: { cancelled: false, piSessionCwd: { ok: true, cwd: '/w/b', trusted: true } } })
  assert.equal(await cdCommand(f.ctx, 'b', f.deps()), 'moved')
  assert.deepEqual(f.calls, [['/s/x.jsonl', { cwd: '/w/b' }]])
  assert.deepEqual(f.notes, [['Diretório de trabalho: /w/b', 'info']])
})

test('projeto não confiável: aviso explícito, nunca finge carga', async () => {
  const f = fx({ result: { cancelled: false, piSessionCwd: { ok: true, cwd: '/w/b', trusted: false } } })
  await cdCommand(f.ctx, 'b', f.deps())
  assert.equal(f.notes[0]![1], 'warning'); assert.match(f.notes[0]![0], /NÃO confiável.*NÃO foram carregados/)
})

test('política (--no-approve): aviso diz política, não "não confiável"', async () => {
  const f = fx({ result: { cancelled: false, piSessionCwd: { ok: true, cwd: '/w/b', trusted: false, policy: true } } })
  await cdCommand(f.ctx, 'b', f.deps())
  assert.equal(f.notes[0]![1], 'warning'); assert.match(f.notes[0]![0], /desativadas por política.*NÃO foram carregados/)
})

for (const [name, o, deps, re] of [
  ['patch ausente', {}, { patched: () => false }, /patch pi-core session-cwd/],
  ['ocupado', { idle: false }, {}, /ocupada/],
  ['mensagens pendentes', { pending: true }, {}, /ocupada/],
  ['sessão efêmera', { file: undefined }, {}, /efêmera/],
  ['destino inválido', {}, { resolve: () => ({ ok: false as const, error: 'nada não existe' }) }, /nada não existe/],
] as const) {
  test(`recusa sem tocar na sessão: ${name}`, async () => {
    const f = fx(o as any)
    assert.equal(await cdCommand(f.ctx, 'b', f.deps(deps as any)), 'refused')
    assert.deepEqual(f.calls, []); assert.equal(f.notes[0]![1], 'error'); assert.match(f.notes[0]![0], re)
  })
}

test('mesmo diretório: avisa e não troca; sem argumento: mostra uso', async () => {
  const f = fx()
  await cdCommand(f.ctx, 'a', f.deps({ resolve: () => ({ ok: true, dir: '/w/a' }) }))
  assert.deepEqual(f.calls, []); assert.match(f.notes[0]![0], /Já está/)
  await cdCommand(f.ctx, '  ', f.deps())
  assert.match(f.notes[1]![0], /Uso: \/cd/)
})

test('recusa do runtime (cancelado/falha): motivo mostrado uma vez, contexto antigo', async () => {
  const f = fx({ result: { cancelled: true, piSessionCwd: { ok: false, reason: 'cancelado por uma extensão' } } })
  assert.equal(await cdCommand(f.ctx, 'b', f.deps()), 'refused')
  assert.deepEqual(f.notes, [['/cd: cancelado por uma extensão', 'error']])
})

test('ctx obsoleto na notificação não derruba o comando', async () => {
  const f = fx({ result: { cancelled: true, piSessionCwd: { ok: false, reason: 'x' } } })
  f.ctx.ui.notify = () => { throw new Error('stale') }
  assert.equal(await cdCommand(f.ctx, 'b', f.deps()), 'refused')
})

test('registro: comando cd com completação; session_start move a base da completação', async () => {
  const cmds: Record<string, any> = {}; const hooks: Record<string, any> = {}
  registerDirectory({ registerCommand: (n: string, c: any) => { cmds[n] = c }, on: (e: string, h: any) => { hooks[e] = h } } as any)
  assert.ok(cmds.cd.description && typeof cmds.cd.getArgumentCompletions === 'function')
  await hooks.session_start({}, { cwd: '/nao/existe' })
  assert.equal(cmds.cd.getArgumentCompletions('x'), null)
})
