import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import { homedir, tmpdir } from 'node:os'
import path from 'node:path'
import { handleMouse, writeTemp } from './index.ts'

const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
const root = mkdtempSync(path.join(tmpdir(), 'pi-image-open-'))
after(() => rmSync(root, { recursive: true }))
const wait = async (ok: () => boolean, ms = 5000) => { for (let i = 0; i < ms / 50 && !ok(); i++) await new Promise((r) => setTimeout(r, 50)) }

/** Abridor falso: grava o argv (arquivo recebido) e uma cópia do conteúdo (o tmp é apagado no exit). */
function fakeOpener(name: string) {
  const log = path.join(root, `${name}.log`), copy = path.join(root, `${name}.copy`)
  const bin = path.join(root, `${name}.sh`)
  writeFileSync(bin, `#!/bin/sh\necho "$1" >> '${log}'\ncp "$1" '${copy}'\n`)
  chmodSync(bin, 0o755)
  return { bin, log, copy, got: () => existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n') : [] }
}
const ev = (o: object) => ({ type: 'click', button: 'left', shift: false, alt: false, ctrl: false, ...o })
const img = (b64 = PNG, mimeType = 'image/png') => ({ base64Data: b64, mimeType })

test('clique esquerdo simples abre o arquivo 0600 com os bytes certos, em dir 0700; handled', async () => {
  const f = fakeOpener('unit'); process.env.PI_IMAGE_OPENER = f.bin
  assert.deepEqual(handleMouse.call(img(), ev({})), { handled: true })
  await wait(() => f.got().length > 0 && existsSync(f.copy))
  const [file] = f.got()
  assert.match(file, /pi-images-\d+-\d+\/[0-9a-f]{24}\.png$/) // por processo (dono, 2026-11-19): antes pi-images-<uid>
  assert.equal(statSync(file).mode & 0o777, 0o600)
  assert.equal(statSync(path.dirname(file)).mode & 0o777, 0o700)
  assert.deepEqual(readFileSync(f.copy), Buffer.from(PNG, 'base64'))
  handleMouse.call(img(), ev({})) // mesmo conteúdo, mesmo nome
  await wait(() => f.got().length === 2)
  assert.equal(f.got()[1], file)
})

test('press, release, direito, meio, wheel, modificadores, hover: undefined e nada abre', async () => {
  const f = fakeOpener('noop'); process.env.PI_IMAGE_OPENER = f.bin
  for (const o of [{ type: 'press' }, { type: 'release' }, { type: 'move' }, { type: 'drag' }, { type: 'wheel', button: 'none' },
    { button: 'right' }, { button: 'middle' }, { shift: true }, { alt: true }, { ctrl: true }]) {
    assert.equal(handleMouse.call(img(), ev(o)), undefined, JSON.stringify(o))
  }
  await new Promise((r) => setTimeout(r, 300))
  assert.deepEqual(f.got(), [])
})

test('base64 inválido, vazio, mime desconhecido: não abre; abridor inexistente não lança', async () => {
  const f = fakeOpener('bad'); process.env.PI_IMAGE_OPENER = f.bin
  for (const i of [img(''), img('@@@not base64@@@'), img(PNG, 'image/bmp'), img(null as any)]) assert.equal(handleMouse.call(i, ev({})), undefined)
  await new Promise((r) => setTimeout(r, 300))
  assert.deepEqual(f.got(), [])
  process.env.PI_IMAGE_OPENER = path.join(root, 'nao-existe')
  assert.deepEqual(handleMouse.call(img(), ev({})), { handled: true })
  await new Promise((r) => setTimeout(r, 200))
})

/** TMPDIR próprio por teste: `os.tmpdir()` o lê a cada chamada, então `pi-images-<uid>-<pid>` nasce dentro de `root`. */
function comTmp(nome: string, fn: (tmp: string, dir: string) => void) {
  const antigo = process.env.TMPDIR
  const tmp = path.join(root, nome)
  mkdirSync(tmp, { recursive: true })
  process.env.TMPDIR = tmp
  try { fn(tmp, path.join(tmp, `pi-images-${process.getuid?.() ?? 0}-${process.pid}`)) } finally { process.env.TMPDIR = antigo }
}
const nomeDe = () => `${createHash('sha256').update(Buffer.from(PNG, 'base64')).digest('hex').slice(0, 24)}.png`

test('segurança 12: diretório com modo aberto é recusado (sem chmod nem escrita)', () => comTmp('aberto', (_t, dir) => {
  mkdirSync(dir, { mode: 0o755 }); chmodSync(dir, 0o755)
  assert.throws(() => writeTemp(PNG, 'image/png'))
  assert.equal(statSync(dir).mode & 0o777, 0o755)
  assert.equal(existsSync(path.join(dir, nomeDe())), false)
}))

test('segurança 12: diretório symlink é recusado e o alvo não recebe o arquivo', () => comTmp('link', (tmp, dir) => {
  const alvo = path.join(tmp, 'alvo'); mkdirSync(alvo, { mode: 0o700 })
  symlinkSync(alvo, dir)
  assert.throws(() => writeTemp(PNG, 'image/png'))
  assert.equal(existsSync(path.join(alvo, nomeDe())), false)
}))

test('segurança 12: arquivo pré-existente que é symlink é recusado; arquivo regular nosso é reutilizado', () => comTmp('wx', (tmp, dir) => {
  mkdirSync(dir, { mode: 0o700 })
  const isca = path.join(tmp, 'isca'); writeFileSync(isca, 'original')
  symlinkSync(isca, path.join(dir, nomeDe()))
  assert.throws(() => writeTemp(PNG, 'image/png'))
  assert.equal(readFileSync(isca, 'utf8'), 'original')
  rmSync(path.join(dir, nomeDe()))
  const f = writeTemp(PNG, 'image/png')!
  assert.equal(writeTemp(PNG, 'image/png'), f)
}))

test('segurança 12: diretório recusado não derruba o clique nem abre nada', async () => {
  const f = fakeOpener('recusa'); process.env.PI_IMAGE_OPENER = f.bin
  comTmp('recusa', (_t, dir) => {
    mkdirSync(dir, { mode: 0o755 }); chmodSync(dir, 0o755)
    assert.deepEqual(handleMouse.call(img(), ev({})), { handled: true })
  })
  await new Promise((r) => setTimeout(r, 200))
  assert.deepEqual(f.got(), [])
})

// Nativo: pi 1.5.2 real em tmux (env -i, CLI direto, provedor falso 127.0.0.1 sem requests, fullscreen). Prova que o Image da extensão
// é o mesmo do bundle e que o clique SGR no transcript chega ao handleMouse.
test('nativo: clique SGR na imagem do transcript abre o arquivo no abridor falso, 0 requests', async () => {
  assert.equal(spawnSync('tmux', ['-V']).status, 0, 'tmux é necessário (blocked, não skip)')
  const agent = path.join(homedir(), '.pi/agent')
  const cli = process.env.PI_E2E_CLI ?? path.join(agent, 'install/releases', readFileSync(path.join(agent, 'install/current-version'), 'utf8').trim(), 'node_modules/@earendil-works/pi-coding-agent/dist/bundle/cli.js')
  const dir = path.join(root, 'native')
  for (const d of ['agent/themes', 'work', 'home']) mkdirSync(path.join(dir, d), { recursive: true })
  copyFileSync(new URL('../../themes/tokyo-night.json', import.meta.url), path.join(dir, 'agent/themes/tokyo-night.json'))
  const requests: string[] = []
  const server = createServer((req, res) => { requests.push(`${req.method} ${req.url}`); res.writeHead(500).end() })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  const port = (server.address() as { port: number }).port
  writeFileSync(path.join(dir, 'agent/models.json'), JSON.stringify({ providers: { fake: { baseUrl: `http://127.0.0.1:${port}/v1`, api: 'openai-completions', apiKey: 'fake-key', models: [{ id: 'm1', name: 'Fixture', input: ['text'], contextWindow: 32000, maxTokens: 2048 }] } } }))
  writeFileSync(path.join(dir, 'agent/settings.json'), JSON.stringify({ theme: 'tokyo-night', tuiMode: 'fullscreen', packages: [], quietStartup: true }))
  writeFileSync(path.join(dir, 'fixture.ts'), `
import { Image } from '@earendil-works/pi-tui'
export default function (pi) {
  pi.registerMessageRenderer('imgfix', (_m, _o, theme) => new Image('${PNG}', 'image/png', { fallbackColor: (s) => s }, { filename: 'fixture.png' }))
  pi.on('session_start', () => pi.sendMessage({ customType: 'imgfix', content: 'x', display: true }))
}`)
  const f = fakeOpener('native')
  const S = `piimg-${process.pid}`
  const ext = new URL('./index.ts', import.meta.url).pathname
  spawnSync('tmux', ['new-session', '-d', '-s', S, '-x', '120', '-y', '40',
    `cd ${dir}/work && env -i PATH=${process.env.PATH} TERM=xterm-256color LANG=C.UTF-8 HOME=${dir}/home PI_CODING_AGENT_DIR=${dir}/agent CLAUDE_CONFIG_DIR=${dir}/home PI_OFFLINE=1 PI_IMAGE_OPENER=${f.bin} ${process.execPath} ${cli} --no-extensions --no-context-files --no-skills --no-prompt-templates --no-session -e ${ext} -e ${dir}/fixture.ts --model fake/m1; sleep 20`])
  const pane = () => spawnSync('tmux', ['capture-pane', '-p', '-t', S], { encoding: 'utf8' }).stdout
  try {
    let row = -1
    for (let i = 0; i < 400 && row < 0; i++) { row = pane().split('\n').findIndex((l) => /image/i.test(l)); if (row < 0) await new Promise((r) => setTimeout(r, 100)) }
    assert.ok(row >= 0, `sem linha de imagem\n${pane()}`)
    const lit = (t: string) => spawnSync('tmux', ['send-keys', '-t', S, '-l', '--', t])
    lit(`\x1b[<0;6;${row + 1}M`); lit(`\x1b[<0;6;${row + 1}m`)
    await wait(() => existsSync(f.copy), 8000)
    assert.equal(f.got().length, 1, pane())
    assert.deepEqual(readFileSync(f.copy), Buffer.from(PNG, 'base64'))
    assert.deepEqual(requests, [])
  } finally {
    spawnSync('tmux', ['kill-session', '-t', S]); server.close()
  }
})

test('F11: segundo clique na mesma imagem não decodifica/grava de novo (cache por base64Data)', async () => {
  const f = fakeOpener('cache'); process.env.PI_IMAGE_OPENER = f.bin
  const b64 = Buffer.from(`imagem-cache-${process.pid}-${Date.now()}`).toString('base64')
  const orig = Buffer.from
  let decodes = 0
  ;(Buffer as any).from = function (...a: any[]) { if (a[1] === 'base64') decodes++; return (orig as any).apply(Buffer, a) }
  try {
    handleMouse.call(img(b64), ev({}))
    await wait(() => f.got().length === 1)
    handleMouse.call(img(b64), ev({}))
    await wait(() => f.got().length === 2)
  } finally { (Buffer as any).from = orig }
  assert.equal(decodes, 1)
  assert.equal(f.got()[0], f.got()[1])
})

test('F11: cache miss não grava no clique: handleMouse volta antes do arquivo existir e o abridor ainda recebe o arquivo', async () => {
  const f = fakeOpener('assinc'); process.env.PI_IMAGE_OPENER = f.bin
  const b64 = Buffer.from(`imagem-assinc-${process.pid}-${Date.now()}`).toString('base64')
  assert.deepEqual(handleMouse.call(img(b64), ev({})), { handled: true })
  const nome = `${createHash('sha256').update(Buffer.from(b64, 'base64')).digest('hex').slice(0, 24)}.png`
  assert.equal(existsSync(path.join(tmpdirUid(), nome)), false, 'nada gravado de forma síncrona no clique')
  await wait(() => f.got().length === 1)
  assert.match(f.got()[0], new RegExp(`${nome}$`))
})
const tmpdirUid = () => path.join(tmpdir(), `pi-images-${process.getuid?.() ?? 0}-${process.pid}`)

// Dono (2026-11-19): clicar na imagem do chat abre. No pi 1.5.2 o ToolExecutionComponent com renderShell 'self' (todos os
// blocos do ny-pi) só repassa o clique ao próprio conteúdo; as imagens, desenhadas depois dele, nunca recebiam o clique.
test('rotearImagens: clique abaixo do conteúdo self chega à imagem certa, com y local', async () => {
  const { rotearImagens } = await import('./index.ts')
  const recebidos: any[] = []
  const img = (n: number, tag: string) => ({ render: () => Array(n).fill(''), handleMouse: (e: any) => (recebidos.push([tag, e.y, e.height]), { handled: true as const }) })
  const proto: any = { handleMouse: () => undefined, getRenderShell() { return this.shell } }
  rotearImagens(proto)
  const comp = Object.assign(Object.create(proto), {
    shell: 'self', selfRenderHeight: 3, imageSpacers: [{ render: () => [''] }, { render: () => [''] }], imageComponents: [img(4, 'a'), img(2, 'b')],
  })
  const ev = (y: number) => ({ type: 'click', button: 'left', x: 2, y, width: 80, height: 20 })
  // linhas: 0 vazia, 1–3 conteúdo, 4 espaço, 5–8 imagem a, 9 espaço, 10–11 imagem b
  assert.equal(comp.handleMouse(ev(4)), undefined)
  assert.deepEqual(comp.handleMouse(ev(6)), { handled: true })
  assert.deepEqual(comp.handleMouse(ev(11)), { handled: true })
  assert.equal(comp.handleMouse(ev(12)), undefined)
  assert.deepEqual(recebidos, [['a', 1, 4], ['b', 1, 2]])
  comp.shell = 'default'
  assert.equal(comp.handleMouse(ev(6)), undefined, 'fora do self o pi já roteia')
  const antes = proto.handleMouse
  rotearImagens(proto)
  assert.equal(proto.handleMouse, antes, 'embrulho único')
})

// Dono (2026-11-19): cada pi gravava em os.tmpdir()/pi-images-<uid> e apagava o diretório inteiro ao sair, levando as imagens
// que outra sessão aberta acabara de gravar para o visualizador (o e2e nativo falhava sob carga por isso). Agora um por processo.
test('outra sessão saindo não apaga a imagem desta (diretório por processo)', () => {
  const nosso = writeTemp(PNG, 'image/png')!
  const filho = spawnSync(process.execPath, ['--input-type=module', '-e',
    `const m = await import(${JSON.stringify(new URL('./index.ts', import.meta.url).href)}); m.writeTemp(${JSON.stringify(Buffer.from('outra').toString('base64'))}, 'image/png')`], { encoding: 'utf8' })
  assert.equal(filho.status, 0, filho.stderr)
  assert.ok(existsSync(nosso), 'imagem desta sessão sobrevive à saída da outra')
})
