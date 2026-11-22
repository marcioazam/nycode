// node --experimental-strip-types --test extensions/chat-margin/index.test.ts
import assert from 'node:assert/strict'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

// Cópia com o pi ao lado: o Node não resolve @earendil-works a partir de extensions/.
const tmp = mkdtempSync(join(tmpdir(), 'chat-margin-'))
// O pi entrega às extensões um pi-tui que também exporta isImageLine (o index.js do pacote não): um pi-tui de fachada.
const rel = `${homedir()}/.pi/agent/install/releases/${readFileSync(`${homedir()}/.pi/agent/install/current-version`, 'utf8').trim()}/node_modules/@earendil-works`
const ew = join(tmp, 'node_modules', '@earendil-works'), tui = join(ew, 'pi-tui')
mkdirSync(tui, { recursive: true }); mkdirSync(join(tmp, 'cm'))
symlinkSync(join(rel, 'pi-coding-agent'), join(ew, 'pi-coding-agent'))
writeFileSync(join(tui, 'package.json'), '{"name":"@earendil-works/pi-tui","type":"module","main":"index.js"}')
writeFileSync(join(tui, 'index.js'), `export * from '${rel}/pi-tui/dist/index.js'\nexport { isImageLine } from '${rel}/pi-tui/dist/terminal-image.js'\n`)
for (const f of ['index.ts', 'inset.ts']) cpSync(join(import.meta.dirname, f), join(tmp, 'cm', f))
const { UserMessageComponent, initTheme } = await import(join(tmp, 'node_modules/@earendil-works/pi-coding-agent/dist/index.js'))
initTheme('dark')

// Dono (2026-11-19): a mensagem do usuário perdeu quase todo o recuo lateral; antes RECUO (2) de cada lado além do padding
// do Markdown, agora só o padding (1). Fica a margem do chat (outputPad 1) sem fundo, como o texto da resposta.
test('mensagem do usuário: só a margem do chat e o padding do Markdown, sem RECUO', async () => {
  const ext = (await import(join(tmp, 'cm', 'index.ts'))).default
  ext({ on() {}, getSettings: () => ({}) })
  const plain = (l: string) => l.replace(/\x1b\[[0-9;]*m|\x1b\][^\x07]*\x07/g, '')
  const ls = new UserMessageComponent('oi', undefined, 1).render(40).map(plain)
  const linha = ls.find((l: string) => l.includes('oi'))!
  assert.equal(linha.indexOf('oi'), 2, `margem 1 + padding 1: «${linha}»`)
  assert.equal(linha.length, 40)
})
