import assert from 'node:assert/strict'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { parseJsonc } from '../jsonc.ts'
import { analyze, detect, entryFor, SEQ } from '../targets.ts'
import { registerTerminalSetup, terminalSetup } from '../terminal-setup.ts'

function fx(env: Record<string, string>, o: { confirm?: boolean; hasUI?: boolean; pick?: string; platform?: string } = {}) {
  const home = mkdtempSync(join(tmpdir(), 'lc-ts-'))
  const cfg = join(home, '.config')
  mkdirSync(join(cfg, 'Code', 'User'), { recursive: true })
  const notes: string[] = []
  const asked: string[] = []
  const ctx: any = {
    hasUI: o.hasUI ?? true,
    ui: {
      notify: (m: string) => notes.push(m),
      confirm: async (t: string, m: string) => (asked.push(m), o.confirm ?? true),
      select: async (_t: string, opts: string[]) => (o.pick === undefined ? undefined : opts.find((x) => x.startsWith(o.pick!))),
    },
  }
  const deps = { env, platform: o.platform ?? 'linux', home }
  return { home, cfg, notes, asked, ctx, deps, kb: join(cfg, 'Code', 'User', 'keybindings.json') }
}
const VS = { TERM_PROGRAM: 'vscode' }
const listing = (dir: string) => readdirSync(dir).sort()

test('VS Code: arquivo ausente → criado com a entrada real (0600), sem backup', async () => {
  const f = fx(VS)
  assert.equal(await terminalSetup(f.ctx, '', f.deps), 'installed')
  const doc = parseJsonc(readFileSync(f.kb, 'utf8')) as any[]
  assert.deepEqual(doc, [{ key: 'shift+enter', command: 'workbench.action.terminal.sendSequence', args: { text: SEQ }, when: 'terminalFocus' }])
  assert.deepEqual(listing(join(f.cfg, 'Code', 'User')), ['keybindings.json'])
  assert.equal(analyze('vscode', readFileSync(f.kb, 'utf8')).state, 'present')
})

test('VS Code: preserva comentários e chaves; backup idêntico ao original; idempotente', async () => {
  const f = fx(VS)
  const old = '// minhas chaves\n[\n  { "key": "ctrl+k", "command": "x" }, // keep\n]\n'
  writeFileSync(f.kb, old, { mode: 0o640 })
  assert.equal(await terminalSetup(f.ctx, '', f.deps), 'installed')
  const now = readFileSync(f.kb, 'utf8')
  assert.ok(now.startsWith('// minhas chaves\n[\n  { "key": "ctrl+k", "command": "x" }, // keep\n'))
  const baks = listing(join(f.cfg, 'Code', 'User')).filter((n) => n.endsWith('.bak'))
  assert.equal(baks.length, 1)
  assert.equal(readFileSync(join(f.cfg, 'Code', 'User', baks[0]!), 'utf8'), old)
  assert.equal(await terminalSetup(f.ctx, '', f.deps), 'present')
  assert.equal(readFileSync(f.kb, 'utf8'), now)
  assert.equal(listing(join(f.cfg, 'Code', 'User')).length, 2)
})

test('colisão: pergunta mostrando a ação existente; recusar não altera; aceitar acrescenta depois e mantém a do usuário', async () => {
  const old = '[{"key":"shift+enter","command":"outro.comando","when":"terminalFocus"}]'
  const no = fx(VS, { confirm: false })
  writeFileSync(no.kb, old)
  assert.equal(await terminalSetup(no.ctx, '', no.deps), 'declined')
  assert.match(no.asked[0]!, /outro\.comando/)
  assert.equal(readFileSync(no.kb, 'utf8'), old)
  const yes = fx(VS)
  writeFileSync(yes.kb, old)
  assert.equal(await terminalSetup(yes.ctx, '', yes.deps), 'installed')
  const doc = parseJsonc(readFileSync(yes.kb, 'utf8')) as any[]
  assert.equal(doc[0].command, 'outro.comando')
  assert.equal(doc[1].args.text, SEQ)
})

test('shift+enter só fora do terminal ou desvinculado (-comando) não é colisão', () => {
  assert.equal(analyze('vscode', '[{"key":"shift+enter","command":"a","when":"editorTextFocus"},{"key":"shift+enter","command":"-b"}]').state, 'free')
  assert.equal(analyze('vscode', '').state, 'free')
  assert.equal(analyze('vscode', '{}').state, 'unsupported')
  assert.equal(analyze('vscode', '[1, "x"]').state, 'free')
})

test('rollback: falha no rename restaura o original e não deixa temporário/backup; mostra o bloco manual', async () => {
  const f = fx(VS)
  const old = '[\n  {"key":"a","command":"b"}\n]\n'
  writeFileSync(f.kb, old)
  const r = await terminalSetup(f.ctx, '', { ...f.deps, rename: () => { throw new Error('disco cheio') } })
  assert.equal(r, 'failed')
  assert.equal(readFileSync(f.kb, 'utf8'), old)
  assert.deepEqual(listing(join(f.cfg, 'Code', 'User')), ['keybindings.json'])
  assert.match(f.notes.at(-1)!, /disco cheio[\s\S]*sendSequence/)
})

test('rollback: arquivo ausente e rename falha → nada fica', async () => {
  const f = fx(VS)
  assert.equal(await terminalSetup(f.ctx, '', { ...f.deps, rename: () => { throw new Error('x') } }), 'failed')
  assert.deepEqual(listing(join(f.cfg, 'Code', 'User')), [])
})

test('JSON inválido ou array ausente: arquivo intocado e bloco manual', async () => {
  const f = fx(VS)
  writeFileSync(f.kb, '[ {"a": ')
  assert.equal(await terminalSetup(f.ctx, '', f.deps), 'failed')
  assert.equal(readFileSync(f.kb, 'utf8'), '[ {"a": ')
  assert.match(f.notes.at(-1)!, /intocado/)
  assert.deepEqual(listing(join(f.cfg, 'Code', 'User')), ['keybindings.json'])
})

test('symlink do dotfiles: escreve no destino e mantém o link', async () => {
  const f = fx(VS)
  const real = join(f.home, 'dot.json')
  writeFileSync(real, '[]')
  symlinkSync(real, f.kb)
  assert.equal(await terminalSetup(f.ctx, '', f.deps), 'installed')
  assert.equal((parseJsonc(readFileSync(real, 'utf8')) as any[]).length, 1)
  assert.equal(readFileSync(f.kb, 'utf8'), readFileSync(real, 'utf8'))
})

test('sem UI ou sem confirmação nada é gravado; argumentos recusados; arquivo grande recusado', async () => {
  const f = fx(VS, { hasUI: false })
  assert.equal(await terminalSetup(f.ctx, '', f.deps), 'refused')
  assert.equal(await terminalSetup(f.ctx, 'x', f.deps), 'refused')
  assert.equal(existsSync(f.kb), false)
  const g = fx(VS)
  writeFileSync(g.kb, ' '.repeat((1 << 20) + 1))
  assert.equal(await terminalSetup(g.ctx, '', g.deps), 'failed')
  assert.match(g.notes.at(-1)!, /1 MiB/)
})

test('ambíguo (VS Code e Cursor instalados): select; cancelar não grava; escolha grava no escolhido', async () => {
  const f = fx(VS)
  mkdirSync(join(f.cfg, 'Cursor', 'User'), { recursive: true })
  assert.equal(await terminalSetup(f.ctx, '', f.deps), 'declined')
  const g = fx(VS, { pick: 'Cursor' })
  mkdirSync(join(g.cfg, 'Cursor', 'User'), { recursive: true })
  assert.equal(await terminalSetup(g.ctx, '', g.deps), 'installed')
  assert.ok(existsSync(join(g.cfg, 'Cursor', 'User', 'keybindings.json')))
  assert.equal(existsSync(g.kb), false)
})

test('detecção: Cursor por pista, Zed, Alacritty, nativos, indisponíveis, tmux, plataformas', () => {
  const d = (env: Record<string, string>, platform = 'linux', ok = true) => detect({ env, platform, home: '/h', exists: () => ok })
  const files = (x: ReturnType<typeof d>) => (x.kind === 'candidates' ? x.targets.map((t) => t.file) : x.kind)
  assert.deepEqual(files(d({ ...VS, VSCODE_GIT_ASKPASS_MAIN: '/opt/Cursor/app/x.js' })), ['/h/.config/Cursor/User/keybindings.json'])
  assert.deepEqual(files(d({ ...VS, XDG_CONFIG_HOME: '/x' })).length, 2)
  assert.deepEqual(files(d(VS, 'darwin')), ['/h/Library/Application Support/Code/User/keybindings.json', '/h/Library/Application Support/Cursor/User/keybindings.json'])
  assert.deepEqual(files(d({ ZED_TERM: 'true' })), ['/h/.config/zed/keymap.json'])
  assert.deepEqual(files(d({ TERM: 'alacritty', XDG_CONFIG_HOME: '/x' })), ['/x/alacritty/alacritty.toml'])
  assert.equal(d(VS, 'linux', false).kind, 'unavailable')
  assert.equal(d({ TERM_PROGRAM: 'vscode' }, 'win32').kind, 'unavailable')
  assert.equal(d({ TMUX: '/tmp/t', TERM_PROGRAM: 'vscode' }).kind, 'unavailable')
  for (const env of [{ GHOSTTY_RESOURCES_DIR: '/g' }, { KITTY_WINDOW_ID: '1' }, { TERM_PROGRAM: 'iTerm.app' }, { TERM_PROGRAM: 'WezTerm' }, { TERM_PROGRAM: 'WarpTerminal' }, { WT_SESSION: 'x' }]) assert.equal(d(env).kind, 'native')
  for (const env of [{ TERMINAL_EMULATOR: 'JetBrains-JediTerm' }, { VTE_VERSION: '7000' }, { TERM_PROGRAM: 'Apple_Terminal' }, {}]) assert.equal(d(env).kind, 'unavailable')
})

test('Zed: insere contexto Terminal preservando comentários; colisão e presença detectadas', async () => {
  const f = fx({ TERM_PROGRAM: 'zed' })
  const dir = join(f.home, '.config', 'zed')
  mkdirSync(dir, { recursive: true })
  const file = join(dir, 'keymap.json')
  writeFileSync(file, '// Zed keymap\n[\n  { "context": "Editor", "bindings": { "ctrl-k": "x" } } // meu\n]\n')
  assert.equal(await terminalSetup(f.ctx, '', f.deps), 'installed')
  const doc = parseJsonc(readFileSync(file, 'utf8')) as any[]
  assert.deepEqual(doc[1], JSON.parse(entryFor('zed').json))
  assert.ok(readFileSync(file, 'utf8').includes('// meu'))
  assert.equal(await terminalSetup(f.ctx, '', f.deps), 'present')
  assert.equal(analyze('zed', '[{"context":"Terminal","bindings":{"shift-enter":["terminal::SendText","\\n"]}}]').state, 'collision')
})

test('Alacritty: acrescenta o bloco TOML mantendo o prefixo; idempotente; inline/colisão tratados', async () => {
  const f = fx({ TERM: 'alacritty' })
  const dir = join(f.cfg, 'alacritty')
  mkdirSync(dir, { recursive: true })
  const file = join(dir, 'alacritty.toml')
  const old = '[font]\nsize = 12 # grande'
  writeFileSync(file, old)
  assert.equal(await terminalSetup(f.ctx, '', f.deps), 'installed')
  const now = readFileSync(file, 'utf8')
  assert.ok(now.startsWith(old + '\n\n[[keyboard.bindings]]\nkey = "Return"\nmods = "Shift"\nchars = "\\u001b[13;2u"'))
  assert.equal(await terminalSetup(f.ctx, '', f.deps), 'present')
  assert.equal(readFileSync(file, 'utf8'), now)
  assert.equal(analyze('alacritty', 'keyboard.bindings = [{key="a"}]').state, 'unsupported')
  assert.equal(analyze('alacritty', '[keyboard]\nbindings = []').state, 'unsupported')
  const col = analyze('alacritty', '[[keyboard.bindings]]\nkey = "Return"\nmods = "Shift"\nchars = "\\n"\n')
  assert.equal(col.state, 'unsupported') // precedência não documentada: nunca acrescentar sobre outra vinculação
  assert.match((col as any).reason, /não é documentada/)
  assert.equal(analyze('alacritty', '[[keyboard.bindings]]\nkey = "Enter"\nmods = "Control | Shift"\naction = "None"\n').state, 'unsupported')
  assert.equal(analyze('alacritty', '[font\nsize = 1').state, 'unsupported') // TOML inválido
  assert.equal(analyze('alacritty', '[[keyboard.bindings]]\nkey = "Return"\nmods = "Shift"\nchars = "\\u001b[13;2u" # meu\n').state, 'present')
  assert.equal(analyze('alacritty', '[[keyboard.bindings]]\nkey = "A"\nmods = "Shift"\nchars = "x"\n').state, 'free')
  const g = fx({ TERM: 'alacritty' })
  mkdirSync(join(g.cfg, 'alacritty'), { recursive: true })
  assert.equal(await terminalSetup(g.ctx, '', g.deps), 'installed') // arquivo ausente
  assert.equal(readFileSync(join(g.cfg, 'alacritty', 'alacritty.toml'), 'utf8'), entryFor('alacritty').toml + '\n')
  const h = fx({ TERM: 'alacritty' })
  mkdirSync(join(h.cfg, 'alacritty'), { recursive: true })
  writeFileSync(join(h.cfg, 'alacritty', 'alacritty.toml'), 'a = 1\n')
  assert.equal(await terminalSetup(h.ctx, '', h.deps), 'installed')
  assert.ok(readFileSync(join(h.cfg, 'alacritty', 'alacritty.toml'), 'utf8').startsWith('a = 1\n\n[[keyboard'))
})

test('Alacritty: sem tomllib/parser → recusa sem gravar; colisão e TOML inválido não escrevem', async () => {
  for (const [old, toml] of [['a = 1\n', () => { throw new Error('python3 com tomllib indisponível') }], ['[[keyboard.bindings]]\nkey = "Return"\nmods = "Shift"\nchars = "x"\n', undefined], ['x = [', undefined]] as const) {
    const f = fx({ TERM: 'alacritty' })
    mkdirSync(join(f.cfg, 'alacritty'), { recursive: true })
    const file = join(f.cfg, 'alacritty', 'alacritty.toml')
    writeFileSync(file, old)
    assert.equal(await terminalSetup(f.ctx, '', { ...f.deps, toml }), 'failed')
    assert.equal(readFileSync(file, 'utf8'), old)
    assert.deepEqual(listing(join(f.cfg, 'alacritty')), ['alacritty.toml'])
    assert.deepEqual(f.asked, []) // nenhuma confirmação de gravação quando recusado
  }
})

test('nativo e indisponível não gravam nem perguntam', async () => {
  const n = fx({ KITTY_WINDOW_ID: '1' })
  assert.equal(await terminalSetup(n.ctx, '', n.deps), 'native')
  const u = fx({ VTE_VERSION: '1' })
  assert.equal(await terminalSetup(u.ctx, '', u.deps), 'unavailable')
  assert.deepEqual(n.asked.concat(u.asked), [])
})

test('registro do comando', async () => {
  const reg: Record<string, any> = {}
  registerTerminalSetup({ registerCommand: (n: string, o: unknown) => (reg[n] = o) } as any, { env: { KITTY_WINDOW_ID: '1' }, platform: 'linux', home: '/h' })
  const f = fx({})
  await reg['terminal-setup'].handler('', f.ctx)
  assert.match(f.notes[0]!, /Kitty/)
})

test('o parser nativo do pi aceita a sequência instalada como shift+enter (quando o pi está instalado)', async (t) => {
  const rel = join(homedir(), '.pi', 'agent', 'install', 'releases')
  if (!existsSync(rel)) return t.skip('pi não instalado')
  const v = readdirSync(rel).sort().at(-1)!
  const keys: any = await import(join(rel, v, 'node_modules', '@earendil-works', 'pi-tui', 'dist', 'keys.js'))
  assert.equal(keys.matchesKey(SEQ, 'shift+enter'), true)
  assert.equal(keys.matchesKey(SEQ, 'enter'), false)
})
