import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { carregar } from './carregar.ts'

const p = await carregar('comandos/paleta.ts')
const cat = await carregar('comandos/catalog.ts')

const todos = [...cat.COMMANDS.flatMap((c: any) => [c.name, ...(c.aliases ?? [])]), 'skill:foo', 'mcp-prompt']
const items = (names: string[]) => names.map((n) => ({ value: n, label: n, description: 'nativo' }))
const current = (calls: any[] = []) => ({
  triggerCharacters: ['/'],
  getSuggestions: async (lines: string[], l: number, c: number) => {
    calls.push([lines, l, c])
    const t = (lines[l] ?? '').slice(0, c)
    if (!t.startsWith('/')) return { items: [{ value: 'x', label: 'x' }], prefix: 'x' }
    const q = t.slice(1)
    return { items: items(todos.filter((n: string) => n.includes(q))), prefix: t }
  },
  applyCompletion: (lines: string[]) => ({ lines, cursorLine: 0, cursorCol: 0, marca: 'current' }),
})
const keyFor = (id: string) => ({ 'app.model.select': 'Alt+P' } as Record<string, string>)[id]
const sig = { signal: new AbortController().signal }
const run = async (text: string, recentes: string[] = []) => {
  const prov = p.criarProvider(current(), { keyFor, recentes: () => recentes })
  return prov.getSuggestions([text], 0, text.length, sig)
}

test('“/” vazio: recentes no topo (3), depois grupos na ordem do catálogo, sem duplicar', async () => {
  const r = await run('/', ['diff', 'model', 'plan', 'init'])
  const v = r.items.map((i: any) => i.value)
  assert.deepEqual(v.slice(0, 3), ['diff', 'model', 'plan'])
  assert.equal(new Set(v).size, v.length)
  assert.equal(r.prefix, '/')
  assert.ok(v.indexOf('new') < v.indexOf('settings')) // Conversa antes de Configuração
  assert.ok(r.items[0].description.startsWith('Recente · '))
})

test('alias escondido do menu vazio; canônico mostra “também /x”; tecla efetiva no fim', async () => {
  const r = await run('/')
  const v = r.items.map((i: any) => i.value)
  for (const a of ['name', 'clear', 'reset', 'hotkeys']) assert.ok(!v.includes(a), a)
  const rename = r.items.find((i: any) => i.value === 'rename')
  assert.match(rename.description, /^Sessão · .+ · também \/name$/)
  const model = r.items.find((i: any) => i.value === 'model')
  assert.match(model.description, /^Modelo e raciocínio · .+ {2}Alt\+P$/)
  assert.match(r.items.find((i: any) => i.value === 'new').description, /também \/clear \/reset/)
})

test('desconhecidos (skills, MCP) passam intactos no fim, em “Outros”', async () => {
  const r = await run('/')
  const last = r.items.slice(-2)
  assert.deepEqual(last.map((i: any) => i.value), ['skill:foo', 'mcp-prompt'])
  assert.deepEqual(last.map((i: any) => i.description), ['nativo', 'nativo'])
})

test('texto digitado: filtro do current, alias continua achável, descrição reescrita', async () => {
  const r = await run('/nam')
  const v = r.items.map((i: any) => i.value)
  assert.deepEqual(v.sort(), ['name', 'rename'].sort())
  assert.match(r.items.find((i: any) => i.value === 'name').description, /alias de \/rename/)
  assert.equal(r.prefix, '/nam')
})

test('delega ao current fora de “/…” na 1ª linha', async () => {
  const calls: any[] = []
  const prov = p.criarProvider(current(calls), { keyFor, recentes: () => [] })
  const a = await prov.getSuggestions(['olá /mo'], 0, 7, sig)
  assert.equal(a.prefix, 'x')
  const l2 = await prov.getSuggestions(['linha', '/mo'], 1, 3, sig) // fora da 1ª linha: descrições intactas
  assert.ok(l2.items.every((i: any) => i.description === 'nativo'))
  const arg = await prov.getSuggestions(['/model arg'], 0, 10, sig) // argumento: resultado do current, sem reescrever
  assert.ok(arg.items.every((i: any) => i.description === 'nativo'))
  assert.equal(calls.length, 3)
  assert.equal(prov.applyCompletion(['/'], 0, 1, {}, '/').marca, 'current')
})

test('recentes: gravados em ui-state.json (chave recentCommands), canônico, sem duplicar, máx. 3', () => {
  const f = join(mkdtempSync(join(tmpdir(), 'rec-')), 'ui-state.json')
  writeFileSync(f, JSON.stringify({ vim: true }))
  for (const t of ['/diff', '/model x', '/name Novo', '/plan', '/model', 'texto', '/skill:foo', '/inexistente']) p.gravarRecente(t, f)
  assert.deepEqual(p.lerRecentes(f), ['model', 'plan', 'rename'])
  assert.equal(JSON.parse(readFileSync(f, 'utf8')).vim, true)
  assert.deepEqual(p.lerRecentes(join(tmpdir(), 'nao-existe.json')), [])
})

test('/keybindings é comando próprio: visível com “/” vazio e sem “alias”', async () => {
  const r = await run('/')
  const k = r.items.find((i: any) => i.value === 'keybindings')
  assert.ok(k)
  assert.match(k.description, /Edita keybindings\.json direto/)
  assert.doesNotMatch(k.description, /alias/)
})

test('F19: gravarRecente troca o arquivo por rename (nunca truncado no lugar) e não deixa temporário', async () => {
  const { mkdirSync, readdirSync, statSync, writeFileSync: wf } = await import('node:fs')
  const d = join(mkdtempSync(join(tmpdir(), 'rec-at-')), 'sub')
  mkdirSync(d)
  const f = join(d, 'ui-state.json')
  wf(f, JSON.stringify({ outra: 1 }))
  const ino = statSync(f).ino
  p.gravarRecente('/diff', f)
  assert.notEqual(statSync(f).ino, ino, 'mesmo inode = gravação no lugar (janela de arquivo truncado)')
  assert.deepEqual(readdirSync(d), ['ui-state.json'])
  assert.deepEqual(JSON.parse(readFileSync(f, 'utf8')), { outra: 1, recentCommands: ['diff'] })
})

test('F20: lerRecentes memoiza por mtime/tamanho (sem reler a cada tecla) e relê quando o arquivo muda', async () => {
  const { utimesSync, statSync, writeFileSync: wf } = await import('node:fs')
  const f = join(mkdtempSync(join(tmpdir(), 'rec-mt-')), 'ui-state.json')
  wf(f, JSON.stringify({ recentCommands: ['diff'] }))
  assert.deepEqual(p.lerRecentes(f), ['diff'])
  const { mtimeMs } = statSync(f)
  wf(f, JSON.stringify({ recentCommands: ['plan'] })) // mesmo tamanho
  utimesSync(f, mtimeMs / 1000, mtimeMs / 1000)
  assert.deepEqual(p.lerRecentes(f), ['diff'], 'mesma assinatura: veio do cache')
  wf(f, JSON.stringify({ recentCommands: ['model', 'plan'] }))
  assert.deepEqual(p.lerRecentes(f), ['model', 'plan'], 'assinatura nova: relê')
})
