// node --experimental-strip-types --test extensions/claude-compat/runbooks/test/usage.test.ts
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { collectUsage, isEntry, main, modelCategory, resolveLimits } from '../usage.ts'

const USAGE = join(dirname(fileURLToPath(import.meta.url)), '..', 'usage.ts')

const NOW = Date.parse('2026-11-14T12:00:00Z')
const DAY = 86_400_000
const iso = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString()

function sessions(): string {
  const root = mkdtempSync(join(tmpdir(), 'usage-'))
  mkdirSync(join(root, 'sessions', 'slug'), { recursive: true })
  return join(root, 'sessions')
}
const put = (dir: string, name: string, lines: unknown[], raw = ''): string => {
  const p = join(dir, 'slug', name)
  writeFileSync(p, lines.map((l) => JSON.stringify(l)).join('\n') + (raw ? `\n${raw}` : ''))
  const t = new Date(NOW)
  utimesSync(p, t, t)
  return p
}
const user = (text: unknown, ts = iso(1)) => ({ type: 'message', timestamp: ts, message: { role: 'user', content: text } })
const asst = (names: string[], model: string, ts = iso(1)) => ({
  type: 'message', timestamp: ts, message: { role: 'assistant', model, content: names.map((name) => ({ type: 'toolCall', name, arguments: { command: 'SEGREDO' } })) },
})

test('agrega só contagens e nunca vaza conteúdo, argumentos, caminhos ou provedor', () => {
  const d = sessions()
  put(d, 'a.jsonl', [
    { type: 'session', version: 3, timestamp: iso(2), cwd: '/home/privado' },
    user('/review src/segredo.ts token=abc'),
    user([{ type: 'text', text: '/Commit agora' }]),
    user('/home/u/x'),
    user('/solo'),
    user('texto livre a@b.com'),
    asst(['read', 'bash', 'mcp__codegraph__codegraph_explore', 'bad name!'], 'anthropic/claude-opus-5'),
    asst(['read'], 'openai/gpt-5'),
  ])
  const u = collectUsage({ dir: d, now: () => NOW })
  assert.deepEqual(u.tools, { read: 2, bash: 1, '(invalid)': 1 })
  assert.deepEqual(u.mcp, { codegraph: 1 })
  assert.deepEqual(u.commands, { review: 1, commit: 1, solo: 1 })
  assert.deepEqual(u.models, { opus: 1, gpt: 1 })
  assert.equal(u.sessions, 1)
  assert.equal(u.complete, true)
  const out = JSON.stringify(u)
  for (const s of ['SEGREDO', 'segredo', 'a@b.com', 'privado', 'anthropic', 'openai', d]) assert.ok(!out.includes(s), s)
})

test('linhas corrompidas são contadas e tornam o resultado parcial', () => {
  const d = sessions()
  put(d, 'a.jsonl', [user('/x')], '{quebrada\n[1,2')
  const u = collectUsage({ dir: d, now: () => NOW })
  assert.equal(u.lines.corrupt, 2)
  assert.equal(u.complete, false)
  assert.ok(u.truncated.includes('corruptLines'))
  assert.deepEqual(u.commands, { x: 1 })
})

test('datas: janela de 30 dias, timestamp inválido, futuro distante e arquivo antigo', () => {
  const d = sessions()
  put(d, 'a.jsonl', [
    user('/dentro', iso(29)),
    user('/fora', iso(31)),
    user('/futuro', iso(-5)),
    user('/semdata', 'ontem'),
    { type: 'message', message: { role: 'user', content: '/sem-ts' } },
  ])
  const old = put(d, 'b.jsonl', [user('/antigo', iso(1))])
  utimesSync(old, new Date(NOW - 40 * DAY), new Date(NOW - 40 * DAY))
  const u = collectUsage({ dir: d, now: () => NOW })
  assert.deepEqual(u.commands, { dentro: 1 })
  assert.equal(u.lines.outsideWindow, 2)
  assert.equal(u.lines.badTimestamp, 2)
  assert.equal(u.files.outsideWindow, 1)
  assert.equal(u.window.from, iso(30))
})

test('limites: arquivos, tamanho, total, tempo e chaves declaram truncamento', () => {
  const d = sessions()
  for (const n of ['a', 'b', 'c']) put(d, `${n}.jsonl`, [user('/x')])
  const base = { dir: d, now: () => NOW }
  const f = collectUsage({ ...base, limits: { maxFiles: 2 } })
  assert.ok(f.truncated.includes('maxFiles') && f.files.read === 2 && !f.complete)
  const o = collectUsage({ ...base, limits: { maxFileBytes: 10 } })
  assert.ok(o.truncated.includes('oversizeFile') && o.files.oversize === 3)
  const t = collectUsage({ ...base, limits: { maxTotalBytes: 1 } })
  assert.ok(t.truncated.includes('maxTotalBytes') && t.files.read === 0)
  let calls = 0
  const ms = collectUsage({ dir: d, now: () => NOW + (calls++ > 0 ? 10 : 0), limits: { maxMs: 5 } })
  assert.ok(ms.truncated.includes('maxMs'))
  const k = sessions()
  put(k, 'a.jsonl', [user('/a'), user('/b'), user('/c'), user('/a')])
  assert.deepEqual(collectUsage({ dir: k, now: () => NOW, limits: { maxKeys: 2 } }).commands, { a: 2, b: 1, '(other)': 1 })
})

test('symlinks e diretório ausente não quebram', () => {
  const d = sessions()
  const real = put(d, 'a.jsonl', [user('/x')])
  symlinkSync(real, join(d, 'slug', 'link.jsonl'))
  assert.deepEqual(collectUsage({ dir: d, now: () => NOW }).commands, { x: 1 })
})

test('diretório ausente ou ilegível é parcial e honesto, sem caminho nem texto de erro', () => {
  const d = sessions()
  const none = collectUsage({ dir: join(d, 'nada'), now: () => NOW })
  assert.equal(none.files.seen, 0)
  assert.equal(none.dirs.unreadable, 1)
  assert.equal(none.complete, false)
  assert.ok(none.truncated.includes('unreadableDir'))
  const file = put(d, 'a.jsonl', [user('/x')]) // raiz que é arquivo: opendir falha com ENOTDIR
  const bad = collectUsage({ dir: file, now: () => NOW })
  assert.equal(bad.complete, false)
  const out = JSON.stringify([none, bad])
  assert.ok(!out.includes(d) && !/ENOENT|ENOTDIR/.test(out))
})

test('listagem limitada: entradas, diretórios e prazo declaram truncamento', () => {
  const d = sessions()
  for (let i = 0; i < 6; i++) mkdirSync(join(d, `s${i}`))
  const base = { dir: d, now: () => NOW }
  const e = collectUsage({ ...base, limits: { maxEntries: 3 } })
  assert.ok(e.truncated.includes('maxEntries') && !e.complete && e.dirs.entries === 3)
  const r = collectUsage({ ...base, limits: { maxDirs: 2 } })
  assert.ok(r.truncated.includes('maxDirs') && r.dirs.seen === 2 && !r.complete)
  let calls = 0
  const t = collectUsage({ dir: d, now: () => NOW + (calls++ > 0 ? 10 : 0), limits: { maxMs: 5 } })
  assert.ok(t.truncated.includes('maxMs') && t.dirs.entries <= 1)
})

test('timestamp inválido torna o resultado parcial', () => {
  const d = sessions()
  put(d, 'a.jsonl', [user('/x'), user('/y', 'ontem')])
  const u = collectUsage({ dir: d, now: () => NOW })
  assert.equal(u.lines.badTimestamp, 1)
  assert.equal(u.complete, false)
  assert.ok(u.truncated.includes('badTimestamp'))
})

test('limites inválidos lançam antes de alocar: não inteiro, fora da faixa, desconhecido', () => {
  const d = sessions()
  const bad: Record<string, number>[] = [{ maxFileBytes: Number.POSITIVE_INFINITY }, { maxFileBytes: 2 ** 40 }, { maxFiles: 1.5 }, { days: 0 }, { maxMs: Number.NaN }, { maxKeys: -1 }, { nope: 1 }]
  for (const limits of bad) assert.throws(() => collectUsage({ dir: d, now: () => NOW, limits }), RangeError, JSON.stringify(limits))
  assert.throws(() => collectUsage({ dir: d, now: () => Number.NaN }), RangeError)
  assert.equal(resolveLimits({ maxFiles: undefined }).maxFiles, 500)
  assert.equal(resolveLimits({ maxFiles: 7 }).maxFiles, 7)
})

test('comandos: raízes de caminho não contam; nome parecido com credencial vira (invalid); aviso de escopo', () => {
  const d = sessions()
  put(d, 'a.jsonl', [user('/home'), user('/etc passwd'), user('/home/u/x'), user('/sk-fake0000000000'), user('/ok')])
  put(d, 'b.jsonl', [asst(['ghp_fake0000000000', 'mcp__sk-fake0000000000__t', 'read'], 'claude-opus-5')])
  const u = collectUsage({ dir: d, now: () => NOW })
  assert.deepEqual(u.commands, { '(invalid)': 1, ok: 1 })
  assert.deepEqual(u.tools, { '(invalid)': 1, read: 1 })
  assert.deepEqual(u.mcp, { '(invalid)': 1 })
  assert.match(u.notes[0]!, /NÃO é o histórico completo/)
})

test('CLI real via symlink instalado: imprime JSON (regressão: guard comparava symlink ao realpath)', () => {
  const root = mkdtempSync(join(tmpdir(), 'usage-cli-'))
  const sess = join(root, 'agent', 'sessions', 'slug')
  mkdirSync(sess, { recursive: true })
  writeFileSync(join(sess, 'a.jsonl'), `${JSON.stringify(asst(['read'], 'claude-opus-5', new Date().toISOString()))}\n`)
  const link = join(root, 'usage-link.ts')
  symlinkSync(USAGE, link)
  const run = spawnSync(process.execPath, ['--experimental-strip-types', link], {
    env: { PATH: process.env.PATH ?? '', HOME: root, PI_CODING_AGENT_DIR: join(root, 'agent') }, encoding: 'utf8', timeout: 20_000,
  })
  assert.equal(run.status, 0, run.stderr)
  const u = JSON.parse(run.stdout)
  assert.deepEqual(u.tools, { read: 1 })
  assert.equal(u.complete, true)
  assert.ok(!run.stdout.includes(root))
  assert.equal(isEntry(link, import.meta.url), false)
  assert.equal(isEntry(link, `file://${USAGE}`), true)
  assert.equal(isEntry(undefined, import.meta.url), false)
  assert.equal(isEntry(join(root, 'nada'), import.meta.url), false)
})

test('modelCategory e main (PI_CODING_AGENT_DIR, só JSON)', () => {
  assert.equal(modelCategory('claude-sonnet-5'), 'sonnet')
  assert.equal(modelCategory('claude-haiku-5'), 'haiku')
  assert.equal(modelCategory('claude-x'), 'claude-other')
  assert.equal(modelCategory('google/gemini-3'), 'gemini')
  assert.equal(modelCategory('o3'), 'gpt')
  assert.equal(modelCategory(undefined), 'other')
  const d = sessions()
  const p = put(d, 'a.jsonl', [asst(['read'], 'claude-opus-5', new Date().toISOString())])
  utimesSync(p, new Date(), new Date()) // relógio real só aqui (main usa Date.now)
  let out = ''
  const code = main({ PI_CODING_AGENT_DIR: join(d, '..') }, Date.now, (s) => (out += s))
  assert.equal(code, 0)
  assert.deepEqual(JSON.parse(out).tools, { read: 1 })
})
