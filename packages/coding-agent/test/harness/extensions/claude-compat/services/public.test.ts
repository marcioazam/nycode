// node --experimental-strip-types --test extensions/claude-compat/services/test/*.test.ts
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { test } from 'node:test'
import { MOBILE_URL } from '../mobile-qr.ts'
import { nativeOpener, openCommand, PUBLIC_COMMANDS, registerPublicServices, STICKERS_TEXT, UPGRADE_URL, type OpenResult } from '../public.ts'

function setup(result: OpenResult = 'opened') {
  const commands: Record<string, any> = {}
  const opened: string[] = []
  registerPublicServices({ registerCommand: (n: string, o: any) => (commands[n] = o) } as any, async (u) => (opened.push(u), result))
  return { commands, opened }
}

function ctx(o: { hasUI?: boolean; custom?: (f: any, opts: any) => Promise<unknown> | undefined } = {}) {
  const notes: { m: string; t?: string }[] = []
  const ui: any = { notify: (m: string, t?: string) => notes.push({ m, t }) }
  if (o.custom) ui.custom = o.custom
  return { c: { hasUI: o.hasUI ?? true, ui } as any, notes }
}

test('registra exatamente os comandos públicos', () => {
  assert.deepEqual(Object.keys(setup().commands), [...PUBLIC_COMMANDS])
})

for (const name of ['mobile', 'ios', 'android']) {
  test(`/${name}: overlay fecha com Enter/Esc/q e não abre navegador`, async () => {
    for (const key of ['\r', '\x1b', 'q']) {
      const { commands, opened } = setup()
      let widthLines: string[] = []
      const { c, notes } = ctx({
        custom: (factory, opts) =>
          new Promise((res) => {
            assert.equal(opts.overlay, true)
            const p = factory({ requestRender() {} }, {}, {}, () => res(undefined))
            widthLines = p.render(50)
            p.handleInput(key)
          }),
      })
      await commands[name].handler('', c)
      assert.ok(widthLines.some((l) => l.includes(MOBILE_URL)))
      assert.deepEqual(notes, [])
      assert.deepEqual(opened, [])
    }
  })
}

test('/mobile headless: QR + link por notificação', async () => {
  const { commands } = setup()
  const { c, notes } = ctx({ hasUI: false })
  await commands.mobile.handler('  ', c)
  assert.equal(notes.length, 1)
  assert.match(notes[0]!.m, /█/)
  assert.ok(notes[0]!.m.endsWith(MOBILE_URL))
})

test('/mobile: falha do overlay cai para notificação com aviso', async () => {
  const { commands } = setup()
  const { c, notes } = ctx({ custom: async () => { throw new Error('sem tui') } })
  await commands.android.handler('', c)
  assert.equal(notes[0]!.t, 'warning')
  assert.match(notes[0]!.m, /sem tui/)
  assert.ok(notes[1]!.m.endsWith(MOBILE_URL))
  const b = ctx({ custom: async () => { throw 'x' } })
  await commands.ios.handler('', b.c)
  assert.match(b.notes[0]!.m, /x/)
})

test('argumentos desconhecidos são recusados sem efeitos', async () => {
  const { commands, opened } = setup()
  for (const name of PUBLIC_COMMANDS) {
    const { c, notes } = ctx({ custom: async () => assert.fail('não deve abrir overlay') })
    await commands[name].handler('extra', c)
    assert.deepEqual(notes, [{ m: `/${name} não aceita argumentos.`, t: 'warning' }])
  }
  assert.deepEqual(opened, [])
})

test('/stickers: status determinístico real', async () => {
  const { commands } = setup()
  const { c, notes } = ctx()
  await commands.stickers.handler('', c)
  assert.deepEqual(notes, [{ m: STICKERS_TEXT, t: 'info' }])
})

test('/upgrade: abre a URL pública conhecida, uma única vez', async () => {
  const { commands, opened } = setup('opened')
  const { c, notes } = ctx()
  await commands.upgrade.handler('', c)
  assert.deepEqual(opened, ['https://claude.ai/upgrade'])
  assert.equal(UPGRADE_URL, 'https://claude.ai/upgrade')
  assert.equal(notes[0]!.t, 'info')
})

test('/upgrade: navegador indisponível ou ambíguo imprime a URL, sem retry', async () => {
  for (const r of ['failed', 'unconfirmed'] as const) {
    const { commands, opened } = setup(r)
    const { c, notes } = ctx()
    await commands.upgrade.handler('', c)
    assert.equal(opened.length, 1)
    assert.equal(notes[0]!.t, 'warning')
    assert.ok(notes[0]!.m.endsWith(UPGRADE_URL))
  }
})

test('/upgrade headless só imprime a URL', async () => {
  const { commands, opened } = setup()
  const { c, notes } = ctx({ hasUI: false })
  await commands.upgrade.handler('', c)
  assert.deepEqual(opened, [])
  assert.match(notes[0]!.m, /https:\/\/claude\.ai\/upgrade/)
})

test('openCommand: argumentos fixos por plataforma, URL como argumento único', () => {
  assert.deepEqual(openCommand('U', 'linux'), { cmd: 'xdg-open', args: ['U'] })
  assert.deepEqual(openCommand('U', 'darwin'), { cmd: 'open', args: ['U'] })
  assert.deepEqual(openCommand('U', 'win32'), { cmd: 'rundll32', args: ['url.dll,FileProtocolHandler', 'U'] })
})

function fakeSpawn(behavior: (child: EventEmitter & { kill(): void }) => void, calls: any[] = []) {
  return ((cmd: string, args: string[], opts: any) => {
    calls.push([cmd, args, opts])
    const child: any = new EventEmitter()
    child.killed = 0
    child.kill = () => child.killed++
    behavior(child)
    return child
  }) as any
}

test('nativeOpener: saída 0 = opened; ≠0 e erro = failed; spawn lançando = failed; sem shell', async () => {
  const calls: any[] = []
  assert.equal(await nativeOpener('linux', fakeSpawn((c) => setImmediate(() => c.emit('exit', 0)), calls))('U'), 'opened')
  assert.deepEqual(calls[0], ['xdg-open', ['U'], { stdio: 'ignore', shell: false }])
  assert.equal(await nativeOpener('linux', fakeSpawn((c) => setImmediate(() => c.emit('exit', 3))))('U'), 'failed')
  assert.equal(await nativeOpener('linux', fakeSpawn((c) => setImmediate(() => c.emit('error', new Error('ENOENT')))))('U'), 'failed')
  assert.equal(await nativeOpener('linux', (() => { throw new Error('boom') }) as any)('U'), 'failed')
})

test('nativeOpener: sem resposta no prazo = unconfirmed e o processo é encerrado; evento tardio é ignorado', async () => {
  let child: any
  const r = await nativeOpener('linux', fakeSpawn((c) => (child = c)), 20)('U')
  assert.equal(r, 'unconfirmed')
  assert.equal(child.killed, 1)
  child.emit('exit', 0)
})
