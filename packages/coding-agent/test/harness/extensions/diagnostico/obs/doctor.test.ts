// node --experimental-strip-types --test extensions/diagnostico/test/obs/doctor.test.ts
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { codigoSaida, formatarDoctor, verificar } from '../../doctor.ts'

const A = '/ag'
const TOKEN = 'sk-SEGREDO-123'
type Cfg = { files?: Record<string, string>; exec?: any; env?: Record<string, string>; sessao?: any; exe?: string[]; sizes?: Record<string, number>; ro?: string[] }

// fs em memória: files = existentes (conteúdo); exe = executáveis; sizes = tamanhos
function montar(c: Cfg = {}) {
  const files: Record<string, string> = {
    [`${A}/claude-home/bin/doctor/pi-doctor`]: '',
    [`${A}/install/current-version`]: '0.9.1',
    [`${A}/install/releases/0.9.1/node_modules/@earendil-works/pi-coding-agent/package.json`]: '{"version":"0.9.1"}',
    [`${A}/npm/node_modules/pi-code/package.json`]: '{"version":"2.3.4"}',
    [`${A}/diag`]: '', ...c.files,
  }
  const exe = new Set(c.exe ?? [])
  const fs = {
    existsSync: (p: string) => p in files,
    readFileSync: (p: string) => { if (!(p in files)) throw new Error('ENOENT'); return files[p] },
    statSync: (p: string) => { if (!(p in files)) throw new Error('ENOENT'); return { size: c.sizes?.[p] ?? files[p].length } },
    accessSync: (p: string, m?: number) => { if (!(p in files) || (m === 1 && !exe.has(p)) || c.ro?.includes(p)) throw new Error('EACCES') },
  }
  const exec = c.exec ?? (async () => ({ code: 0, stdout: 'tudo bem\n', stderr: '' }))
  const env = { PATH: '/bin:/usr/bin', HOME: '/home/u', PI_DIAG_INBOX: '/x', ...c.env }
  return { env, agentDir: A, exec, fs, sessao: c.sessao } as any
}
const get = (r: any[], id: string) => r.filter((x) => x.id === id)

test('pi-doctor: ok, FALHA vira erro, ausente vira aviso, exec que lança vira erro', async () => {
  assert.equal(get(await verificar(montar()), 'pi-doctor')[0].estado, 'ok')
  const falha = await verificar(montar({ exec: async () => ({ code: 1, stdout: 'ok x\nFALHA  settings quebrado\nFALHA  patch\n', stderr: '' }) }))
  const f = get(falha, 'pi-doctor')
  assert.equal(f.length, 2); assert.ok(f.every((x) => x.estado === 'erro' && x.correcao))
  assert.match(f[0].titulo, /settings quebrado/)
  const m = montar(); m.fs.existsSync = (p: string) => !p.endsWith('pi-doctor')
  assert.equal(get(await verificar(m), 'pi-doctor')[0].estado, 'aviso')
  const t = get(await verificar(montar({ exec: async () => { throw new Error('boom') } })), 'pi-doctor')[0]
  assert.equal(t.estado, 'erro'); assert.match(t.detalhe, /boom/)
})

test('wrapper', async () => {
  assert.equal(get(await verificar(montar()), 'wrapper')[0].estado, 'ok')
  const d = montar(); delete d.env.PI_DIAG_INBOX
  const w2 = get(await verificar(d), 'wrapper')[0]
  assert.equal(w2.estado, 'aviso'); assert.equal(w2.correcao, 'abra o pi pelo ~/.local/bin/pi')
})

test('versoes: ok, PI_VERSION, faltando = aviso', async () => {
  const v = get(await verificar(montar({ env: { PI_DOCTOR_NODE: 'v22.1.0' } })), 'versoes')[0]
  assert.equal(v.estado, 'ok'); assert.match(v.titulo, /0\.9\.1.*2\.3\.4.*v22\.1\.0/)
  assert.match(get(await verificar(montar({ env: { PI_VERSION: '7.7.7' } })), 'versoes')[0].titulo, /7\.7\.7/)
  const m = montar(); m.fs.existsSync = () => false; m.fs.readFileSync = () => { throw new Error('x') }
  assert.equal(get(await verificar(m), 'versoes')[0].estado, 'aviso')
})

const settings = (cmd: string) => JSON.stringify({ hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: cmd }] }] } })
test('hooks: ok, caminho ausente, não executável, PATH, ~, e sem segredo', async () => {
  const ok = await verificar(montar({ files: { [`${A}/settings.json`]: settings('python3 /h/g.py'), '/bin/python3': '' }, exe: ['/bin/python3'] }))
  assert.equal(get(ok, 'hooks')[0].estado, 'ok')
  const r = await verificar(montar({ files: { [`${A}/settings.json`]: settings(`/h/falta.sh --token ${TOKEN}`) } }))
  const h = get(r, 'hooks')[0]
  assert.equal(h.estado, 'erro'); assert.match(h.titulo, /PreToolUse/); assert.match(h.titulo, /\/h\/falta\.sh/)
  assert.ok(!JSON.stringify(r).includes(TOKEN))
  const ne = await verificar(montar({ files: { [`${A}/settings.json`]: settings('~/b/h.sh'), '/home/u/b/h.sh': '' } }))
  assert.equal(get(ne, 'hooks')[0].estado, 'erro')
  const ex = await verificar(montar({ files: { [`${A}/settings.json`]: settings('$HOME/b/h.sh'), '/home/u/b/h.sh': '' }, exe: ['/home/u/b/h.sh'] }))
  assert.equal(get(ex, 'hooks')[0].estado, 'ok')
  const np = await verificar(montar({ files: { [`${A}/settings.json`]: settings('nada --x') } }))
  assert.equal(get(np, 'hooks')[0].estado, 'erro')
})

test('mcp: ok conta, ausente avisa, URL ignorada, env secreto não vaza', async () => {
  const cfg = JSON.stringify({ mcpServers: { a: { command: 'bin-a', env: { K: TOKEN } }, b: { command: '/opt/b' }, c: { url: 'https://x', headers: { Authorization: TOKEN } } } })
  const r = await verificar(montar({ files: { [`${A}/mcp.json`]: cfg, '/bin/bin-a': '' }, exe: ['/bin/bin-a'] }))
  assert.equal(get(r, 'mcp')[0].estado, 'ok'); assert.match(get(r, 'mcp')[0].titulo, /1/)
  const b = get(r, 'mcp:b')[0]; assert.equal(b.estado, 'aviso'); assert.match(b.titulo, /b/)
  assert.equal(get(r, 'mcp:c').length, 0)
  assert.ok(!JSON.stringify(r).includes(TOKEN))
})

test('credencial', async () => {
  assert.equal(get(await verificar(montar()), 'credencial').length, 0)
  const s = { modelo: 'p/m', temAuth: false, erros: 0, avisos: 0, crashes: 0 }
  const e = get(await verificar(montar({ sessao: s })), 'credencial')[0]
  assert.equal(e.estado, 'erro'); assert.match(e.titulo, /sem credencial para p\/m/)
  assert.equal(get(await verificar(montar({ sessao: { ...s, temAuth: true } })), 'credencial')[0].estado, 'ok')
})

test('diag: ok, não gravável, log grande', async () => {
  assert.equal(get(await verificar(montar()), 'diag')[0].estado, 'ok')
  assert.equal(get(await verificar(montar({ ro: [`${A}/diag`] })), 'diag')[0].estado, 'erro')
  const g = montar({ files: { [`${A}/diag/diag.jsonl`]: '' }, sizes: { [`${A}/diag/diag.jsonl`]: 21 * 1024 * 1024 } })
  assert.ok((await verificar(g)).some((x) => x.id === 'diag:diag.jsonl' && x.estado === 'aviso'))
  const m = montar(); m.fs.existsSync = (p: string) => p !== `${A}/diag` && p.length > 0
  assert.equal(get(await verificar(m), 'diag')[0].estado, 'erro')
})

test('trava', async () => {
  assert.equal(get(await verificar(montar()), 'trava').length, 0)
  const v = get(await verificar(montar({ env: { PI_MODEL_LOCK: '{"version":1,"models":{"p/m":["low"]}}' } })), 'trava')[0]
  assert.equal(v.estado, 'ok'); assert.match(v.titulo + v.detalhe, /p\/m/)
  assert.equal(get(await verificar(montar({ env: { PI_MODEL_LOCK: '{nope' } })), 'trava')[0].estado, 'erro')
  assert.equal(get(await verificar(montar({ env: { PI_MODEL_LOCK: '{"version":2,"models":{}}' } })), 'trava')[0].estado, 'erro')
})

test('otlp: local, inválido, válido só com origem', async () => {
  assert.match(get(await verificar(montar()), 'otlp')[0].titulo, /só local/)
  assert.equal(get(await verificar(montar({ env: { OTEL_EXPORTER_OTLP_ENDPOINT: 'ftp://x' } })), 'otlp')[0].estado, 'erro')
  assert.equal(get(await verificar(montar({ env: { OTEL_EXPORTER_OTLP_ENDPOINT: 'lixo' } })), 'otlp')[0].estado, 'erro')
  const r = await verificar(montar({ env: { OTEL_EXPORTER_OTLP_ENDPOINT: `https://u:${TOKEN}@h.io:4318/v1/x?k=${TOKEN}` } }))
  assert.equal(get(r, 'otlp')[0].estado, 'ok'); assert.match(get(r, 'otlp')[0].titulo, /https:\/\/h\.io:4318/)
  assert.ok(!JSON.stringify(r).includes(TOKEN))
})

test('crashes e sessao', async () => {
  const s = { erros: 2, avisos: 3, crashes: 1 }
  const r = await verificar(montar({ sessao: s }))
  const c = get(r, 'crashes')[0]
  assert.deepEqual([c.estado, c.titulo, c.correcao], ['aviso', '1 crash nas últimas 24 h', 'veja os erros no /diagnostico'])
  const x = get(r, 'sessao')[0]
  assert.deepEqual([x.estado, x.titulo, x.detalhe, x.correcao], ['aviso', '2 erros e 3 avisos nesta sessão', undefined, 'veja as abas erros e avisos do /diagnostico'])
  assert.equal(get(await verificar(montar({ sessao: { erros: 0, avisos: 0, crashes: 0 } })), 'crashes').length, 0)
})

test('crashes e sessao: plurais e só as partes diferentes de zero', async () => {
  const titulo = async (s: any, id: string) => get(await verificar(montar({ sessao: s })), id)[0]?.titulo
  assert.equal(await titulo({ erros: 0, avisos: 0, crashes: 4 }, 'crashes'), '4 crashes nas últimas 24 h')
  assert.equal(await titulo({ erros: 0, avisos: 2, crashes: 0 }, 'sessao'), '2 avisos nesta sessão')
  assert.equal(await titulo({ erros: 0, avisos: 1, crashes: 0 }, 'sessao'), '1 aviso nesta sessão')
  assert.equal(await titulo({ erros: 1, avisos: 2, crashes: 0 }, 'sessao'), '1 erro e 2 avisos nesta sessão')
  assert.equal(await titulo({ erros: 3, avisos: 0, crashes: 0 }, 'sessao'), '3 erros nesta sessão')
  assert.equal(await titulo({ erros: 0, avisos: 0, crashes: 0 }, 'sessao'), undefined)
})

const G = (e: string) => ({ ok: '✓', aviso: '▲', erro: '✕' })[e as 'ok']
test('pi-doctor: patches que não revertem viram um bloco só, com ~ no caminho', async () => {
  const H = '/home/u/.pi/agent'
  const stdout = ['FALHA  patch não reverte na árvore instalada: a.patch', 'FALHA  patch não reverte na árvore instalada: b.patch', 'FALHA  patch não reverte na árvore instalada: c.patch', 'FALHA  settings quebrado', ''].join('\n')
  const d = montar({ files: { [`${H}/claude-home/bin/doctor/pi-doctor`]: '', [`${H}/diag`]: '' }, exec: async () => ({ code: 1, stdout, stderr: '' }) })
  d.agentDir = H
  const r = await verificar(d)
  const l = formatarDoctor(get(r, 'pi-doctor'), G)
  assert.deepEqual(l, [
    '✕ pi-doctor: 3 patches não revertem na árvore instalada',
    '  a.patch',
    '  b.patch',
    '  c.patch',
    '  → rode ~/.pi/agent/claude-home/bin/doctor/pi-doctor para ver o motivo de cada um',
    '✕ pi-doctor: settings quebrado',
    '  → rode ~/.pi/agent/claude-home/bin/doctor/pi-doctor e corrija o item',
    '4 erros · 0 avisos · 0 ok', // o resumo conta achados, não blocos
  ])
  assert.ok(!JSON.stringify(r.map((x: any) => [x.detalhe, x.correcao])).includes('/home/u'), 'home abreviado em detalhe e correção')
})

test('home abreviado em detalhe (log grande) e intocado sem HOME', async () => {
  const H = '/home/u/.pi/agent'
  const base = { files: { [`${H}/diag`]: '', [`${H}/diag/diag.jsonl`]: '' }, sizes: { [`${H}/diag/diag.jsonl`]: 21 * 1024 * 1024 } }
  const d = montar(base); d.agentDir = H
  assert.equal((await verificar(d)).find((x: any) => x.id === 'diag:diag.jsonl')!.detalhe, '~/.pi/agent/diag/diag.jsonl')
  const s = montar(base); s.agentDir = H; delete s.env.HOME
  assert.equal((await verificar(s)).find((x: any) => x.id === 'diag:diag.jsonl')!.detalhe, `${H}/diag/diag.jsonl`)
  const o = montar({ ...base, env: { HOME: '/home/uu' } }); o.agentDir = H // prefixo parecido não casa
  assert.equal((await verificar(o)).find((x: any) => x.id === 'diag:diag.jsonl')!.detalhe, `${H}/diag/diag.jsonl`)
})

test('formatarDoctor: agrupa consecutivos com mesmo id e mesma correção', () => {
  const a: any[] = [
    { id: 'hooks', estado: 'erro', titulo: 'hook Stop: /a ausente', correcao: 'corrija settings.json' },
    { id: 'hooks', estado: 'erro', titulo: 'hook Stop: /b ausente', detalhe: 'det b', correcao: 'corrija settings.json' },
    { id: 'hooks', estado: 'erro', titulo: 'hook Stop: /a ausente', correcao: 'corrija settings.json' }, // sufixo repetido
    { id: 'x', estado: 'erro', titulo: 'sem prefixo', correcao: 'mesma' },
    { id: 'x', estado: 'erro', titulo: 'outro: titulo', correcao: 'mesma' },
    { id: 'x', estado: 'erro', titulo: 'outra correção', correcao: 'diferente' },
    { id: 'y', estado: 'aviso', titulo: 'p: um' },
    { id: 'y', estado: 'aviso', titulo: 'p: dois' }, // sem correção não agrupa
    { id: 'z', estado: 'ok', titulo: 'bom' },
  ]
  assert.deepEqual(formatarDoctor(a, G), [
    '✕ hook Stop (2)',
    '  /a ausente',
    '  /b ausente',
    '  det b',
    '  → corrija settings.json',
    '✕ sem prefixo',
    '✕ outro: titulo',
    '  → mesma',
    '✕ outra correção',
    '  → diferente',
    '▲ p: um',
    '▲ p: dois',
    '✓ bom',
    '6 erros · 2 avisos · 1 ok',
  ])
})

test('verificar nunca lança: env inválido vira erro por check', async () => {
  const d = montar(); d.fs.readFileSync = () => { throw new Error('quebrou') }
  const r = await verificar(d)
  assert.ok(Array.isArray(r))
  const r2 = await verificar({ env: null, agentDir: A } as any)
  assert.ok(r2.length > 0 && r2.every((x) => x.estado === 'erro'))
})

test('formatarDoctor e codigoSaida', () => {
  const a: any[] = [
    { id: 'a', estado: 'ok', titulo: 'bom' },
    { id: 'b', estado: 'aviso', titulo: 'meh', detalhe: 'd', correcao: 'c' },
    { id: 'c', estado: 'erro', titulo: 'ruim' },
  ]
  const l = formatarDoctor(a, (e) => ({ ok: '✓', aviso: '▲', erro: '✕' })[e as 'ok'])
  assert.deepEqual(l, ['✕ ruim', '▲ meh', '  d', '  → c', '✓ bom', '1 erro · 1 aviso · 1 ok'])
  assert.equal(codigoSaida(a), 1); assert.equal(codigoSaida(a.slice(0, 2)), 0)
})

test('F21: settings.json inválido não impede a verificação do segundo arquivo de hooks', async () => {
  const r = await verificar(montar({ files: { [`${A}/settings.json`]: '{ quebrado', [`${A}/claude-home/settings.json`]: settings('/nao/existe.sh') } }))
  const h = get(r, 'hooks')
  assert.ok(h.some((x: any) => x.estado === 'erro' && /nao\/existe\.sh/.test(x.titulo)), JSON.stringify(h))
  assert.ok(h.some((x: any) => x.estado === 'erro' && /settings\.json/.test(x.titulo)), JSON.stringify(h))
  assert.ok(!h.some((x: any) => /verificação hooks falhou/.test(x.titulo)))
})
