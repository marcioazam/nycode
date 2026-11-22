import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { carregar, gerente, tema, USUARIO } from './carregar.ts'

const t = await carregar('comandos/teclas.ts')
const a = await carregar('comandos/atalhos.ts')
const compat = await import('../../claude-compat/shortcuts.ts')

const rows = async (user: Record<string, unknown>) => t.montarLinhas(await gerente(user))
const marca = (rs: any[], id: string) => rs.find((r) => r.id === id)?.marca

test('Ctrl+S: conflito real antes da U5 (app.thinking.save × rascunho), ausente depois', async () => {
  assert.equal(marca(await rows(USUARIO), 'app.thinking.save'), 'conflito')
  assert.equal(marca(await rows(USUARIO), 'ext.stash'), 'conflito')
  const depois = await rows({ ...USUARIO, ...compat.CLAUDE_KEYBINDINGS })
  assert.deepEqual(depois.find((r: any) => r.id === 'app.thinking.save').teclas, [])
  assert.equal(marca(depois, 'ext.stash'), undefined)
  assert.deepEqual([...compat.CLAUDE_KEYBINDINGS['app.thinking.save'] as string[]], [])
})

test('conflito = mesmo contexto + mesma tecla efetiva; intencionais marcados; outros contextos separados', async () => {
  const rs = await rows({ ...USUARIO, ...compat.CLAUDE_KEYBINDINGS })
  assert.equal(marca(rs, 'app.clear'), 'intencional') // Ctrl+C × interrompe ocupado
  assert.equal(marca(rs, 'ext.interrupt'), 'intencional')
  assert.equal(marca(rs, 'app.message.copy'), 'intencional') // Ctrl+X prefixo de enviar agora
  // Ctrl+N: sessões (filtro nomeadas) e editor (↓) são contextos distintos
  assert.equal(marca(rs, 'app.session.toggleNamedFilter'), undefined)
  assert.equal(marca(rs, 'ext.down'), undefined) // Ctrl+N no editor é só ↓
  const reais = rs.filter((r: any) => r.marca === 'conflito').map((r: any) => r.id)
  assert.ok(!reais.includes('app.thinking.save'))
  assert.ok(!reais.includes('app.model.select'))
})

test('Ctrl+B do fleet só vale com o painel de subagentes: não conflita com cursorLeft', async () => {
  const rs = await rows({ ...USUARIO, ...compat.CLAUDE_KEYBINDINGS })
  assert.equal(rs.find((r: any) => r.id === 'ext.fleet').contexto, 'subagentes')
  assert.equal(marca(rs, 'tui.editor.cursorLeft'), undefined)
  assert.equal(marca(rs, 'ext.fleet'), undefined)
})

test('colisão nova no mesmo contexto aparece como conflito; Alt marcado', async () => {
  const rs = await rows({ ...USUARIO, ...compat.CLAUDE_KEYBINDINGS, 'app.tools.expand': 'ctrl+g' })
  assert.equal(marca(rs, 'app.tools.expand'), 'conflito')
  assert.equal(marca(rs, 'app.editor.external'), 'conflito')
  const alt = rs.find((r: any) => r.id === 'app.model.select')
  assert.equal(alt.alt, true)
  assert.equal(alt.origem, 'seu')
  assert.equal(rs.find((r: any) => r.id === 'app.interrupt').origem, 'padrão')
  assert.equal(rs.find((r: any) => r.id === 'app.clipboard.pasteImage').origem, 'padrão') // override idêntico ao padrão
})

test('formatação de teclas', () => {
  assert.equal(t.fmtTecla('ctrl+shift+p'), 'Ctrl+Shift+P')
  assert.equal(t.fmtTecla('shift+ctrl+p'), 'Ctrl+Shift+P')
  assert.equal(t.fmtTecla('alt+enter'), 'Alt+Enter')
  assert.equal(t.fmtTecla('ctrl+shift+up'), 'Ctrl+Shift+↑')
  assert.equal(t.fmtTecla('?'), '?')
})

const KEY = { enter: '\r', esc: '\x1b', down: '\x1b[B', ctrlG: '\x07', ctrlP: '\x10' }
async function abrir(user: Record<string, unknown> = { ...USUARIO, ...compat.CLAUDE_KEYBINDINGS }) {
  const feitos: any[] = []
  const lista = await rows(user)
  const c = new a.Atalhos(tema, lista, (v?: any) => feitos.push(v), () => {})
  return { c, feitos, lista }
}
const texto = (c: any) => c.render(100).join('\n')

test('lista: contextos separados, marcas em texto, último item “Editar JSON”', async () => {
  const { c } = await abrir()
  assert.match(texto(c), /Ações do app/)
  const ver = async (f: string) => { const k = await abrir({ ...USUARIO, ...compat.CLAUDE_KEYBINDINGS, 'app.tools.expand': 'ctrl+g' }); for (const ch of f) k.c.handleInput(ch); return texto(k.c) }
  assert.match(await ver('alt+p'), /Alt\+P.*seu.*⌥ usa Alt/)
  assert.match(await ver('conflito'), /▲ conflito/)
  assert.match(await ver('intencional'), /intencional/)
  const arv = await ver('árvore')
  assert.match(arv, /Árvore da sessão/)
  assert.match(await ver('json'), /Avançado[\s\S]*Editar JSON \(avançado\)/)
  for (const l of c.render(40)) assert.ok([...l.replace(/\x1b\[[0-9;]*m/g, '').replace(/\[|\]/g, '')].length <= 40)
})

test('filtro ao digitar; Enter abre detalhe; Esc volta e depois fecha', async () => {
  const { c, feitos } = await abrir()
  for (const ch of 'model.select') c.handleInput(ch)
  const s = texto(c)
  assert.match(s, /Trocar modelo/)
  assert.doesNotMatch(s, /Colar imagem/)
  c.handleInput(KEY.enter)
  assert.match(texto(c), /Padrão do pi: Ctrl\+L/)
  c.handleInput(KEY.esc)
  assert.match(texto(c), /Trocar modelo/)
  c.handleInput(KEY.esc) // limpa o filtro
  c.handleInput(KEY.esc)
  assert.deepEqual(feitos, [undefined])
})

test('Editar JSON devolve { json }', async () => {
  const { c, feitos } = await abrir()
  for (const ch of 'json') c.handleInput(ch)
  c.handleInput(KEY.enter)
  assert.deepEqual(feitos, [{ json: true }])
})

test('captura: tecla livre grava só a ação; Esc cancela; ação de extensão não muda', async () => {
  const { c, feitos } = await abrir()
  for (const ch of 'external') c.handleInput(ch)
  c.handleInput(KEY.enter)
  c.handleInput('r')
  assert.match(texto(c), /Pressione a nova tecla/)
  c.handleInput(KEY.esc)
  assert.match(texto(c), /Padrão do pi: Ctrl\+G/)
  c.handleInput('r')
  c.handleInput('\x1b[103;6u') // ctrl+shift+g
  assert.deepEqual(feitos, [{ mudancas: { 'app.editor.external': 'ctrl+shift+g' } }])
  const b = await abrir()
  for (const ch of 'rascunho') b.c.handleInput(ch)
  b.c.handleInput(KEY.enter)
  b.c.handleInput('r')
  assert.match(texto(b.c), /fixa|não muda/i)
  assert.deepEqual(b.feitos, [])
})

test('captura colidindo: bloqueia com mensagem; s substitui (libera a outra); esc mantém', async () => {
  // A paridade Claude (claude-compat/shortcuts.ts) tirou app.tools.expand de ctrl+o; o teste fixa a tecla que colide em vez de depender dessa tabela.
  const comExpandir = { ...USUARIO, ...compat.CLAUDE_KEYBINDINGS, 'app.tools.expand': 'ctrl+o' }
  const { c, feitos } = await abrir(comExpandir)
  for (const ch of 'external') c.handleInput(ch)
  c.handleInput(KEY.enter)
  c.handleInput('r')
  c.handleInput('\x0f') // ctrl+o = Expandir tools (mesmo contexto)
  assert.match(texto(c), /Ctrl\+O já é “Expandir saída das ferramentas”/)
  assert.match(texto(c), /s substitui/)
  assert.deepEqual(feitos, [])
  c.handleInput('s')
  assert.deepEqual(feitos, [{ mudancas: { 'app.editor.external': 'ctrl+o', 'app.tools.expand': [] } }])
  const d = await abrir(comExpandir)
  for (const ch of 'external') d.c.handleInput(ch)
  d.c.handleInput(KEY.enter); d.c.handleInput('r'); d.c.handleInput('\x0f'); d.c.handleInput(KEY.esc)
  assert.deepEqual(d.feitos, [])
  assert.match(texto(d.c), /Padrão do pi: Ctrl\+G/)
})

test('Ctrl+N: em “sessões” é livre, mas no editor colide com a ação fixa do harness (sem “s”)', async () => {
  const { c, feitos } = await abrir()
  for (const ch of 'toggleNamed') c.handleInput(ch)
  c.handleInput(KEY.enter); c.handleInput('r'); c.handleInput('\x0e') // ctrl+n em sessões: a ação do editor (↓) é outro contexto
  assert.deepEqual(feitos, [{ mudancas: { 'app.session.toggleNamedFilter': 'ctrl+n' } }])
  const b = await abrir()
  for (const ch of 'external') b.c.handleInput(ch)
  b.c.handleInput(KEY.enter); b.c.handleInput('r'); b.c.handleInput('\x0e')
  assert.match(texto(b.c).replace(/\s+/g, ' '), /Ctrl\+N já é “Linha ou histórico seguinte”.*fixa.*não dá para substituir/)
  b.c.handleInput('s')
  assert.deepEqual(b.feitos, [])
})

test('gravar: mescla, valida, cria .bak, preserva chaves; inválido não grava', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kb-'))
  const f = join(dir, 'keybindings.json')
  writeFileSync(f, '{\n  "app.exit": "ctrl+d",\n  "x": 1\n}\n')
  const ruim = t.gravarMudancas(f, { 'app.interrupt': 'escape' })
  assert.deepEqual(ruim.erros.length, 1) // "x": 1 é inválido no arquivo existente → nada é gravado
  assert.equal(existsSync(`${f}.bak`), false)
  writeFileSync(f, '{\n  "app.exit": "ctrl+d"\n}\n')
  const ok = t.gravarMudancas(f, { 'app.editor.external': 'ctrl+shift+g', 'app.tools.expand': [] })
  assert.deepEqual(ok.erros, [])
  assert.deepEqual(JSON.parse(readFileSync(f, 'utf8')), { 'app.exit': 'ctrl+d', 'app.editor.external': 'ctrl+shift+g', 'app.tools.expand': [] })
  assert.equal(readFileSync(`${f}.bak`, 'utf8'), '{\n  "app.exit": "ctrl+d"\n}\n')
  const novo = join(dir, 'novo.json')
  assert.deepEqual(t.gravarMudancas(novo, { 'app.exit': 'ctrl+d' }).erros, [])
  assert.equal(existsSync(`${novo}.bak`), false)
})

test('/atalhos: sem UI não abre; mudança grava e recarrega; json chama o editor do /keybindings', async () => {
  let cmd: any
  const ger = await gerente(USUARIO)
  const dir = mkdtempSync(join(tmpdir(), 'kb2-'))
  const f = join(dir, 'keybindings.json')
  a.registrarAtalhos({ registerCommand: (n: string, o: any) => (cmd = { n, ...o }) }, { arquivo: () => f, editarJson: async () => { feito.push('json') } })
  const feito: string[] = []
  assert.equal(cmd.n, 'atalhos')
  let abriu = 0
  await cmd.handler('', { hasUI: false, ui: { custom: () => abriu++ } })
  assert.equal(abriu, 0)
  const ctx = (res: any) => ({ hasUI: true, ui: { custom: async (fab: any) => (fab({ requestRender() {} }, tema, ger, () => {}), res), notify: (m: string) => feito.push(m) }, reload: async () => void feito.push('reload') })
  await cmd.handler('', ctx({ mudancas: { 'app.editor.external': 'ctrl+shift+g' } }))
  assert.deepEqual(JSON.parse(readFileSync(f, 'utf8')), { 'app.editor.external': 'ctrl+shift+g' })
  assert.equal(feito.at(-1), 'reload')
  await cmd.handler('', ctx({ json: true }))
  assert.equal(feito.at(-1), 'json')
  await cmd.handler('', ctx(undefined))
  assert.equal(feito.at(-1), 'json')
})

test('catálogo: ext.redraw/ext.tasks/ext.up só existem quando o pi não usa a tecla', async () => {
  const ids = (rs: any[]) => rs.map((r) => r.id)
  const com = await rows({ ...compat.CLAUDE_KEYBINDINGS })
  for (const id of ['ext.redraw', 'ext.tasks', 'ext.up']) assert.ok(ids(com).includes(id), id)
  const sem = await rows({})
  for (const id of ['ext.redraw', 'ext.tasks', 'ext.up']) assert.ok(!ids(sem).includes(id), id)
  assert.equal(marca(sem, 'app.model.select'), undefined)
  assert.equal(marca(sem, 'app.thinking.toggle'), undefined)
  assert.equal(marca(sem, 'app.model.cycleForward'), undefined)
})

test('ordem: atenção, ações do app, harness, editor por último; seções próprias depois; resumo na régua', async () => {
  const { c } = await abrir()
  const ids = c.entradas().map((e: any) => e.id)
  const ix = (id: string) => ids.indexOf(id)
  const ord = ['app.model.select', 'app.thinking.toggle', 'app.tools.expand', 'app.editor.external', 'app.exit', 'ext.stash', 'tui.editor.cursorUp', 'tui.select.up', 'app.tree.foldOrUp', 'ext.fleet']
  const ps = ord.map(ix)
  assert.ok(ps.every((p) => p >= 0), String(ps))
  assert.deepEqual([...ps].sort((x, y) => x - y), ps, String(ps))
  const conf = await abrir({ ...USUARIO, ...compat.CLAUDE_KEYBINDINGS, 'app.tools.expand': 'ctrl+g' })
  assert.match(conf.c.render(110)[1], /Atenção/)
  assert.ok(['app.tools.expand', 'app.editor.external'].includes(conf.c.entradas()[0].id))
  assert.match(c.render(110)[0], /\d+ ações · \d+ conflitos · \d+ com Alt/)
  assert.match(c.render(110).at(-2), /digite para filtrar/)
})

test('resumo conta conflitos e Alt; Alt de paridade Claude é intencional, não ⚠', async () => {
  const user = { ...USUARIO, ...compat.CLAUDE_KEYBINDINGS, 'app.tools.expand': 'alt+x' }
  const { c, lista } = await abrir(user)
  const conf = lista.filter((l: any) => l.marca === 'conflito').length
  const alt = lista.filter((l: any) => l.alt).length
  assert.ok(alt >= 3)
  assert.ok(c.render(110)[0].includes(`${lista.length} ações · ${conf} conflitos · ${alt} com Alt`))
  for (const ch of 'alt+p') c.handleInput(ch)
  assert.match(texto(c), /Alt\+P.*⌥ usa Alt · intencional/)
  c.handleInput('\x1b') // limpa filtro
  for (const ch of 'alt+x') c.handleInput(ch)
  const x = texto(c)
  assert.match(x, /Atenção[\s\S]*Expandir saída/)
  assert.match(x, /Expandir saída.*⌥ usa Alt(?! · intencional)/)
})

test('captura: Ctrl+C cancela como Esc, sem virar a nova tecla', async () => {
  const { c, feitos } = await abrir()
  for (const ch of 'external') c.handleInput(ch)
  c.handleInput(KEY.enter)
  c.handleInput('r')
  c.handleInput('\x03')
  assert.match(texto(c), /Padrão do pi: Ctrl\+G/)
  assert.deepEqual(feitos, [])
})
