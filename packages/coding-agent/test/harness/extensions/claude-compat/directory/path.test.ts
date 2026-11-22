import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { MAX_ITEMS, completeDirs, escapePath, parseArg, resolveTarget } from '../path.ts'

const root = mkdtempSync(join(tmpdir(), 'cd-path-'))
const home = join(root, 'home')
const agent = join(home, '.pi', 'agent')
for (const d of ['home/proj ã é', 'home/proj b', 'home/.ssh', 'home/.hidden', 'home/.pi/agent', 'home/projx', 'home/w/real']) mkdirSync(join(root, d), { recursive: true })
writeFileSync(join(home, 'file.txt'), 'x')
symlinkSync(join(home, 'w/real'), join(home, 'link'))
symlinkSync(join(home, 'file.txt'), join(home, 'linkfile'))

test('parseArg: aspas, espaço escapado, unicode, vazio, controle, aspas abertas', () => {
  assert.deepEqual(parseArg('  "a b" '), { ok: true, value: 'a b' })
  assert.deepEqual(parseArg('a\\ b/ã'), { ok: true, value: 'a b/ã' })
  assert.deepEqual(parseArg("'a\\b'"), { ok: true, value: 'a\\b' })
  for (const bad of ['', '   ', 'a\u0000b', 'a\tb', '"abc', 'abc\\']) assert.equal(parseArg(bad).ok, false, JSON.stringify(bad))
  assert.equal(escapePath("a b'\"\\"), "a\\ b\\'\\\"\\\\")
})

test('resolveTarget: relativo, ~, symlink -> realpath, unicode, escapado', () => {
  const real = (p: string) => join(root, p)
  assert.deepEqual(resolveTarget('proj\\ b', home, home, agent), { ok: true, dir: real('home/proj b') })
  assert.deepEqual(resolveTarget('"proj ã é"', home, home, agent), { ok: true, dir: real('home/proj ã é') })
  assert.deepEqual(resolveTarget('~/projx', '/', home, agent), { ok: true, dir: real('home/projx') })
  assert.deepEqual(resolveTarget('link', home, home, agent), { ok: true, dir: real('home/w/real') })
  assert.deepEqual(resolveTarget(join(home, 'projx'), '/', home, agent), { ok: true, dir: real('home/projx') })
  assert.deepEqual(resolveTarget('~', '/', home, agent), { ok: true, dir: home })
})

test('resolveTarget recusa: inexistente, arquivo, link p/ arquivo, segredos, controle', () => {
  for (const bad of ['nada', 'file.txt', 'linkfile', '.ssh', '~/.pi/agent', 'x\u0000y', ''])
    assert.equal(resolveTarget(bad, home, home, agent).ok, false, bad)
  const viaLink = join(root, 'toagent')
  symlinkSync(agent, viaLink) // symlink para o agentDir: o realpath é o que vale
  assert.match((resolveTarget(viaLink, '/', home, agent) as { error: string }).error, /segredos/)
})

test('completeDirs: só diretórios, ocultos só com ponto, espaço escapado, ~/ e relativo preservados', () => {
  assert.deepEqual(completeDirs('proj', home, home)?.map((i) => i.value), ['proj\\ b/', 'proj\\ ã\\ é/', 'projx/'])
  assert.deepEqual(completeDirs('proj\\ ', home, home)?.map((i) => i.label), ['proj b/', 'proj ã é/'])
  assert.deepEqual(completeDirs('~/proj\\ b', '/', home)?.map((i) => i.value), ['~/proj\\ b/'])
  assert.deepEqual(completeDirs(`${home}/w/`, '/', home)?.map((i) => i.value), [`${home}/w/real/`])
  const all = completeDirs('', home, home)!.map((i) => i.label)
  assert.ok(!all.includes('.hidden/') && !all.includes('file.txt/') && !all.includes('linkfile/') && all.includes('link/'))
  assert.ok(completeDirs('.', home, home)!.some((i) => i.label === '.hidden/'))
  assert.deepEqual(completeDirs('"proj ', home, home)?.map((i) => i.value), ['proj\\ b/', 'proj\\ ã\\ é/'])
})

test('completeDirs: falha vira null e a leitura é limitada', () => {
  assert.equal(completeDirs('nada/x', home, home), null)
  const big = join(root, 'big')
  for (let i = 0; i < MAX_ITEMS + 20; i++) mkdirSync(join(big, `d${String(i).padStart(3, '0')}`), { recursive: true })
  assert.equal(completeDirs('', big, home)?.length, MAX_ITEMS)
})
