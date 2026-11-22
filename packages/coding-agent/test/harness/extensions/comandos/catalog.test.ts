// node --experimental-strip-types --test extensions/comandos/test/*.test.ts
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { carregar, raiz } from './carregar.ts'

const cat = await carregar('comandos/catalog.ts')

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    if (n === 'test' || n === 'node_modules') return []
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|js|mjs)$/.test(n) ? [p] : []
  })
const namesIn = (dir: string): string[] =>
  walk(dir).flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/registerCommand\(\s*['"]([\w-]+)['"]/g)].map((m) => m[1]!))

/** Comandos reais: nativos do pi, pi-code (se instalado) e do harness (+ /clear e /reset, registrados em laço). */
function loaded(): string[] {
  const versao = readFileSync(`${homedir()}/.pi/agent/install/current-version`, 'utf8').trim()
  const nativo = readFileSync(`${homedir()}/.pi/agent/install/releases/${versao}/node_modules/@earendil-works/pi-coding-agent/dist/core/slash-commands.js`, 'utf8')
  const names = [...nativo.matchAll(/name: "([\w-]+)"/g)].map((m) => m[1]!)
  const piCode = `${homedir()}/.pi/agent/npm/node_modules/pi-code/extensions`
  if (existsSync(piCode)) names.push(...namesIn(piCode))
  names.push(...namesIn(raiz), 'clear', 'reset')
  return [...new Set(names)]
}

test('todo comando carregado tem grupo e descrição pt-BR no catálogo', () => {
  const names = loaded()
  assert.ok(names.length > 50, `só ${names.length} comandos lidos`)
  const sem = names.filter((n) => !cat.findCommand(n))
  assert.deepEqual(sem, [], `sem entrada no catálogo: ${sem.join(' ')}`)
  for (const c of cat.COMMANDS) {
    assert.ok(cat.GROUPS.includes(c.group), `${c.name}: grupo ${c.group}`)
    assert.ok(c.desc.length > 8, `${c.name}: descrição`)
  }
})

test('aliases: canônico e “via alias”; /copy e /copy-code, /todos e /plan-todos são distintos', () => {
  assert.equal(cat.findCommand('name').cmd.name, 'rename')
  assert.equal(cat.findCommand('name').viaAlias, true)
  assert.equal(cat.findCommand('rename').viaAlias, false)
  for (const a of ['clear', 'reset']) assert.equal(cat.findCommand(a).cmd.name, 'new')
  assert.equal(cat.findCommand('hotkeys').cmd.name, 'atalhos')
  assert.equal(cat.findCommand('keybindings').cmd.name, 'keybindings')
  assert.equal(cat.findCommand('keybindings').viaAlias, false)
  for (const [a, b] of [['copy', 'copy-code'], ['todos', 'plan-todos']]) assert.notEqual(cat.findCommand(a).cmd, cat.findCommand(b).cmd)
  assert.equal(cat.findCommand('tasks').cmd.act, undefined) // /tasks não tem Ctrl+B
  assert.equal(cat.findCommand('skill:qualquer'), undefined)
})

test('ações: todo id de tecla do pi tem rótulo pt-BR e contexto; extensão tem origem', async () => {
  const kb = await gerenteLocal()
  const ids = Object.keys(kb.getResolvedBindings())
  const sem = ids.filter((id) => !cat.ACTION_LABELS[id])
  assert.deepEqual(sem, [])
  assert.equal(cat.contextOf('app.tree.foldOrUp'), 'árvore')
  assert.equal(cat.contextOf('app.models.reorderUp'), 'modelos')
  assert.equal(cat.contextOf('app.session.rename'), 'sessões')
  assert.equal(cat.contextOf('tui.select.up'), 'seletores')
  assert.equal(cat.contextOf('app.model.select'), 'editor')
  for (const a of cat.EXT_ACTIONS) assert.ok(['extensão', 'harness'].includes(a.origin) && a.keys.length, a.id)
})

async function gerenteLocal() {
  const { gerente } = await import('./carregar.ts')
  return gerente()
}
