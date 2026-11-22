// node --experimental-strip-types --test extensions/claude-compat/runbooks/test/commands.test.ts
import assert from 'node:assert/strict'
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, test } from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')
const NAMES = ['run', 'verify', 'run-skill-generator', 'update-config', 'batch', 'team-onboarding', 'statusline']

function load(name: string): { fm: Record<string, string>; body: string } {
  const raw = readFileSync(join(REPO, 'claude-home', 'commands', `${name}.md`), 'utf8')
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw)
  assert.ok(m, `${name}: frontmatter ausente`)
  const fm: Record<string, string> = {}
  for (const line of m[1]!.split('\n')) {
    const kv = /^([\w-]+):\s*(.*)$/.exec(line)
    assert.ok(kv, `${name}: linha de frontmatter inválida: ${line}`)
    fm[kv[1]!] = kv[2]!.replace(/^"(.*)"$/, '$1')
  }
  return { fm, body: m[2]! }
}

// Expansão REAL: o `expandCommand` e os helpers gerenciados do pi-code, copiados para um diretório temporário porque o
// Node não remove tipos sob node_modules. Dependências (typebox, @earendil-works/*) vêm do release instalado.
// Sobrescreva com PI_CODE_EXTENSIONS / PI_CODE_NODE_MODULES; ausência de qualquer um falha o teste (nunca pula).
const AGENT = join(process.env.HOME ?? '', '.pi', 'agent')
const EXT_SRC = process.env.PI_CODE_EXTENSIONS ?? join(AGENT, 'npm', 'node_modules', 'pi-code', 'extensions')
const NM_SRC = process.env.PI_CODE_NODE_MODULES
  ?? join(AGENT, 'install', 'releases', readFileSync(join(AGENT, 'install', 'current-version'), 'utf8').trim(), 'node_modules')
const FIX = mkdtempSync(join(tmpdir(), 'cmd-fixture-'))
cpSync(EXT_SRC, join(FIX, 'extensions'), { recursive: true })
symlinkSync(NM_SRC, join(FIX, 'node_modules'))
after(() => rmSync(FIX, { recursive: true, force: true }))
const real = await import(pathToFileURL(join(FIX, 'extensions', 'commands.ts')).href)
const file = await import(pathToFileURL(join(FIX, 'extensions', 'internal', 'command-file.ts')).href)
const CANARY_FILE = join(FIX, 'canary.txt')
writeFileSync(CANARY_FILE, 'CANARY-CONTEUDO-PRIVADO')

/** Runner que nunca deveria ser chamado: conta e lança. */
function canary(): { runner: { exec: () => Promise<never> }; calls: () => number } {
  let n = 0
  return { runner: { exec: () => { n++; return Promise.reject(new Error('exec chamado')) } }, calls: () => n }
}
const HOSTIL = `x $(rm -x) !\`id\` @${CANARY_FILE} \${CLAUDE_PROJECT_DIR} $ARGUMENTS $1 $@`

async function expandReal(name: string, args: string): Promise<{ out: string; body: string; calls: number }> {
  const parsed = file.parseCommandFile(readFileSync(join(REPO, 'claude-home', 'commands', `${name}.md`), 'utf8'))
  const c = canary()
  const out: string = await real.expandCommand(c.runner, parsed, args, { cwd: FIX }, join(REPO, 'claude-home', 'commands', `${name}.md`))
  return { out, body: parsed.body, calls: c.calls() }
}

test('frontmatter: só do usuário, com descrição', () => {
  for (const n of NAMES) {
    const { fm } = load(n)
    assert.equal(fm['disable-model-invocation'], 'true', n)
    assert.ok(fm.description && fm.description.length >= 20 && fm.description.length <= 400, n)
  }
})

test('corpo: sem placeholder de argumento, spans de shell, @arquivo nem variáveis', () => {
  for (const n of NAMES) {
    const { body } = load(n)
    assert.doesNotMatch(body, /\$ARGUMENTS|\$@|\$\d|\$\{ARGUMENTS/, `${n}: placeholder de argumento (o fallback nativo anexa os argumentos crus)`)
    assert.doesNotMatch(body, /!`|```!/, `${n}: span de shell`)
    assert.doesNotMatch(body, /\$\{|\$\(/, `${n}: expansão de shell/variável`)
    assert.doesNotMatch(body, /(^|\s)@[\w./~-]/, `${n}: @arquivo`)
  }
})

test('expandCommand real: argumentos hostis aparecem uma vez, crus, depois de toda expansão; nada executa nem é lido', async () => {
  for (const n of NAMES) {
    const { out, body, calls } = await expandReal(n, HOSTIL)
    assert.equal(calls, 0, `${n}: exec chamado`)
    assert.equal(out, `${body}\n\nARGUMENTS: ${HOSTIL}`, n)
    assert.equal(out.split(HOSTIL).length - 1, 1, n)
    assert.ok(out.includes('${CLAUDE_PROJECT_DIR}') && out.includes('$ARGUMENTS'), `${n}: literais`)
    assert.ok(!out.includes('CANARY-CONTEUDO-PRIVADO'), `${n}: @arquivo foi lido`)
  }
})

test('expandCommand real: sem argumentos nada é anexado', async () => {
  for (const n of NAMES) {
    for (const args of ['', '   ']) {
      const { out, body, calls } = await expandReal(n, args)
      assert.equal(out, body, n)
      assert.equal(calls, 0, n)
    }
  }
})

test('contrato antigo obsoleto (controle negativo): placeholder no corpo expande o span dos argumentos antes do fallback', async () => {
  const parsed = file.parseCommandFile('---\ndescription: x\n---\nPedido: $ARGUMENTS\n')
  const c = canary()
  await assert.rejects(real.expandCommand(c.runner, parsed, 'a !`id` b', { cwd: FIX }, join(FIX, 'x.md')), /exec chamado/)
  assert.equal(c.calls(), 1)
})

test('referências: skills, comandos e helper citados existem no repositório', () => {
  const re = /~\/\.pi\/agent\/(claude-home\/)?([\w./-]+\.(?:md|ts|mjs))/g
  let seen = 0
  for (const n of NAMES) {
    for (const m of load(n).body.matchAll(re)) {
      const p = join(REPO, m[1] ? 'claude-home' : '', m[2]!)
      assert.ok(existsSync(p), `${n}: ${m[0]} não existe`)
      seen++
    }
  }
  assert.ok(seen >= 5)
})

test('skill por projeto: só .pi/skills/run/SKILL.md do projeto, nunca o home', () => {
  const all = NAMES.map((n) => load(n).body).join('\n')
  assert.match(load('run-skill-generator').body, /\.pi\/skills\/run\/SKILL\.md/)
  assert.doesNotMatch(all, /~\/\.pi\/skills|claude-home\/skills\/run\b|~\/\.agents/)
  assert.match(load('run-skill-generator').body, /nunca marque o projeto como confiável/i)
})

test('limites de /batch, /team-onboarding e /update-config no texto operacional', () => {
  assert.match(load('batch').body, /4 writers/)
  assert.match(load('batch').body, /git-delivery/)
  assert.match(load('team-onboarding').body, /usage\.ts/)
  assert.match(load('update-config').body, /\/config/)
})
