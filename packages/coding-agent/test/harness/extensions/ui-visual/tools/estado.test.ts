// node --experimental-strip-types --test ~/.pi/agent/extensions/ui-visual/test/tools/estado.test.ts
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { test } from 'node:test'
import { tmp, mod, visibleWidth, plain, ctx, nativeComponent, base, resolverOf, result, row, bgTheme, icon, toolIcon, ficha, tg, ansiTags, reguaRun, semRespiro } from './base.ts'

const { iconGap, nerdFont } = await import(join(tmp, 'icons.ts'))
// Régua Run (dono, 2026-11-18): antes `$ comando` e hora à direita; agora `<ícone> Run ─ comando ───── hora` e corpo/rodapé recuados até o `Run`.
// Prefixos de icon('bash') e iconGap() da cópia tmp (base.ts fixa o terminal): independem de TERM.
const G = iconGap()
const P = `▎ ${' '.repeat(1 + G.length)}` // corpo e rodapé: trilho + recuo até o `Run`
const regua = (cmd: string, hora = '', w = 80) => reguaRun(icon('bash'), G, cmd, hora, w)

const hhmm = (ms: number) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
// Tema ANSI: a hora é alinhada pela largura visível real (as marcas <cor> do tema de teste contariam como colunas).
const ansiTheme = { fg: (_c: string, t: string) => `\x1b[2m${t}\x1b[22m`, bold: (t: string) => `\x1b[1m${t}\x1b[22m` }
const comHora = (branch: unknown[] = []) => {
  const on: Record<string, any> = {}
  let resolver: any
  mod.default({ registerToolRenderer: (r: unknown) => (resolver = r), on: (e: string, h: unknown) => (on[e] = h) })
  on.session_start?.({}, { sessionManager: { getBranch: () => branch } })
  return { on, resolver }
}

// 2026-11-14 (dono): a hora à direita é a do TÉRMINO da execução; enquanto roda não há hora.
// (dono, 2026-11-20): o nome da ferramenta é `Subagent`/`Subagents` e o `│` do corpo fica na coluna do nome; antes `Subagente` e o `│` 2 colunas antes.
test('hora: tool ao vivo mostra a hora do término à direita, alinhada à largura; rodando ou sem hora conhecida a linha não muda', () => {
  const { on, resolver } = comHora()
  const antes = Date.now()
  const w = resolver('bash', base)
  // Variante 04 (dono, 2026-11-18): antes a hora ficava na borda direita do cartão de 58 colunas e sumia em largura estreita;
  // agora é o título do cartão do shell (72 colunas, sem margem desde 2026-11-18: o trilho fica na coluna do texto), com a hora à direita só depois do fim.
  const titulo = (c: Record<string, unknown>, largura = 80) => w.renderCall({ command: 'ls' }, ansiTheme, ctx({ args: { command: 'ls' }, ...c })).render(largura)
  // Respiro (dono, 2026-11-18): antes o título era a 1ª linha; agora vem depois da linha de respiro.
  const rodando = plain(titulo({ toolCallId: 'vivo-1', isPartial: true })[1]).trimEnd()
  assert.doesNotMatch(rodando, /\d\d:\d\d$/)
  on.tool_execution_end({ toolCallId: 'vivo-1', toolName: 'bash' })
  const linha = semRespiro(titulo({ toolCallId: 'vivo-1' }))[0]
  const row = plain(linha).trimEnd()
  // (dono, 2026-11-18): antes 72 (teto do cartão); agora a largura inteira, 80.
  assert.equal(visibleWidth(plain(linha)), 80)
  assert.ok([hhmm(antes), hhmm(Date.now())].some((h) => row === regua('ls', h)), row) // Régua Run (dono, 2026-11-18): antes `$ ls` + espaços + hora; agora a régua `─` até a hora
  const sem = plain(semRespiro(titulo({ toolCallId: 'desconhecida' }))[0]).trimEnd()
  assert.doesNotMatch(sem, /\d\d:\d\d$/)
  // estreito: o cartão encolhe e a linha continua cabendo
  assert.ok(titulo({ toolCallId: 'vivo-1' }, 20).every((l: string) => visibleWidth(plain(l)) <= 20))
})

test('hora: histórico usa o horário do resultado (término); tool em andamento não consulta o histórico', () => {
  const T = new Date(2026, 10, 14, 9, 41, 30).getTime()
  let leituras = 0
  const branch = [{ type: 'message', message: { role: 'user', timestamp: 1 } }, { type: 'message', message: { role: 'toolResult', toolCallId: 'hist-1', timestamp: T } }]
  const on: Record<string, any> = {}
  let resolver: any
  mod.default({ registerToolRenderer: (r: unknown) => (resolver = r), on: (e: string, h: unknown) => (on[e] = h) })
  on.session_start({}, { sessionManager: { getBranch: () => (leituras++, branch) } })
  const w = resolver('read', base)
  const c = ctx({ args: { path: '/work/proj/a.ts' }, toolCallId: 'hist-1', durationMs: 120_000 })
  assert.ok(ficha(w.renderCall({}, ansiTheme, c).render(90)[0]).endsWith('  09:41'))
  w.renderCall({}, ansiTheme, c).render(90)
  assert.equal(leituras, 1, 'o histórico é lido uma vez por chamada')
  w.renderCall({}, ansiTheme, ctx({ args: { path: 'a' }, toolCallId: 'andando', isPartial: true })).render(90)
  assert.equal(leituras, 1)
})

test('hora: demais ferramentas (ícone) também ganham a hora na 1ª linha quando cabe', () => {
  const { on, resolver } = comHora()
  on.tool_execution_end({ toolCallId: 'mcp-1', toolName: 'mcp__x' })
  const w = resolver('mcp__x', base)
  const rows = w.renderCall({}, ansiTheme, { state: {}, toolCallId: 'mcp-1' }).render(60).map(plain)
  assert.equal(visibleWidth(rows[0]), 58)
  assert.match(rows[0], /native-call +\d\d:\d\d$/)
  const curta = w.renderCall({}, ansiTheme, { state: {}, toolCallId: 'mcp-1' }).render(14).map(plain)
  assert.doesNotMatch(curta[0], /\d\d:\d\d$/)
})

// Antigo (2026-11-14): bolinha pulsando, com um timer pedindo redesenho. Novo (dono, 2026-11-15): sem ícone de estado no chat;
// "executando" é o nome em ciano (syntaxType), sem animação, e nenhum timer pede redesenho.
test('executando: nome do estado em ciano, sem animação nem redesenho por timer', async (t) => {
  // Relógio controlado (plano de testes, item 14): qualquer setTimeout/setInterval pedido pelo cartão vira pendente aqui.
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] })
  const tags = ansiTags // marcas de largura zero: o cartão (58 colunas) cortaria as tags <cor> como texto
  let redesenhos = 0
  const c = ctx({ args: { command: 'sleep 1' }, toolCallId: 'anim-1', isPartial: true, invalidate: () => redesenhos++ })
  const { on, resolver } = comHora()
  const w = resolver('bash', base)
  // Onda 10, P06: o início da chamada agora é ouvido (tempo vivo); sem início visto e sem truecolor, nada pede redesenho.
  assert.equal(typeof on.tool_execution_start, 'function')
  // Variante 04 (dono, 2026-11-18): antes `· executando` em ciano (syntaxType) no título; agora o rodapé do cartão diz `executando` em accent.
  // Respiro (dono, 2026-11-18): antes o rodapé era a última linha; agora vem antes da linha de respiro.
  const run = semRespiro(w.renderCall({}, tags, c).render(80))
  assert.ok(run.at(-1).includes(tg('accent', 'executando')))
  t.mock.timers.tick(5_000)
  assert.equal(redesenhos, 0)
  assert.equal(plain(semRespiro(w.renderCall({}, ansiTheme, { ...c, isPartial: false }).render(80))[0]).trimEnd(), regua('sleep 1'))
})

// Pedido do dono (2026-11-14, print b4b98ee1): a pergunta tem o mesmo alinhamento dos demais blocos, com o atalho e a hora juntos no
// cabeçalho. Resposta em destaque (dono, 2026-11-20, lab /pergunta desenho 7): antes `? pergunta  resposta` + texto atrás de um `│`
// em cartão verde; agora ` cabeçalho · pergunta` (atalho e hora só na 1ª linha) e ` ❯ resposta`, sem fundo.
test('question (Resposta em destaque): atalho + hora no cabeçalho da 1ª pergunta; texto dim cortado com …; resposta em ❯', () => {
  const { on, resolver } = comHora()
  const longa = 'palavra '.repeat(12).trim()
  const wq = resolver('question', () => ({ renderCall: () => ({ render: () => [], invalidate() {} }), renderResult: () => nativeComponent('nativo') }))
  on.tool_execution_end({ toolCallId: 'q-2', toolName: 'question' })
  const l = wq.renderResult({ content: [], details: { question: longa, header: 'Forma', answer: 'a' } }, { isPartial: false }, ansiTheme, ctx({ toolCallId: 'q-2' })).render(80).map(plain)
  assert.equal(l.length, 2)
  // (dono, 2026-11-20): na margem do chat e a hora na margem direita; antes recuo 3 e 78 colunas (recuo direito 2).
  assert.match(l[0]!, /^Forma · palavra .*… +ctrl\+o abre {2}\d\d:\d\d$/)
  assert.equal(l[1], '❯ a')
  assert.ok(l.every((x: string) => [...x].length <= 80))
})

// Pedido do dono (2026-11-14): `run` saía sem estado, sem ícone e sem hora (não tem renderCall próprio).
test('tool sem renderCall (run): linha com ícone, nome, argumentos resumidos e hora do término; erro por nome no título', () => {
  const { on, resolver } = comHora()
  const w = resolver('run', () => ({}))
  const args = { action: 'wait', id: 'rhwep1', timeout_s: 300 }
  const vivo = plain(w.renderCall(args, ansiTheme, ctx({ args, toolCallId: 'run-1', isPartial: true })).render(70)[0])
  assert.equal(vivo, `  ${icon(toolIcon('run'))} run · wait rhwep1 · 300s`)
  on.tool_execution_end({ toolCallId: 'run-1', toolName: 'run' })
  const feito = plain(w.renderCall(args, ansiTheme, ctx({ args, toolCallId: 'run-1' })).render(70)[0])
  assert.match(feito, new RegExp(`^  . run · wait rhwep1 · 300s +\\d\\d:\\d\\d$`))
  assert.equal(visibleWidth(feito), 66) // caixa própria: 70 menos outputPad (1 de cada lado) e o recuo direito (2)
  const erro = plain(w.renderCall(args, ansiTheme, ctx({ args, toolCallId: 'run-1', isError: true })).render(70)[0])
  assert.ok(erro.startsWith(`  ${icon(toolIcon('run'))} run · erro · `), erro)
  const longo = { action: 'start', command: 'x'.repeat(200), await: true }
  assert.ok(w.renderCall(longo, ansiTheme, ctx({ args: longo, toolCallId: 'run-2' })).render(50).every((r: string) => visibleWidth(plain(r)) <= 50))
})

// Pedido do dono (2026-11-14): o todo repetia a mesma coisa em duas linhas (chamada + "Started #1: …"). Uma linha só, em
// português, com o andamento da lista à direita; lista e erro continuam com o desenho nativo embaixo.
test('Task: verbo como título, id apagado, barra e contagem sem percentual; resultado não repete', async () => {
  const { on, resolver } = comHora()
  const nativo = { renderCall: () => nativeComponent('todo start #1'), renderResult: () => nativeComponent('Started #1: Tema') }
  const w = resolver('todo', () => nativo)
  const state = {}
  const args = { action: 'start', id: 1, activeForm: 'Ajustando fundos' }
  const c = ctx({ args, toolCallId: 'todo-1', state })
  assert.equal(plain(w.renderCall(args, ansiTheme, { ...c, isPartial: true }).render(80)[0]), `  ${icon(toolIcon('todo'))} Iniciar #1`)
  on.tool_execution_end({ toolCallId: 'todo-1', toolName: 'todo' })
  const todos = [{ id: 1, text: 'Tema: fundo verde', status: 'in_progress' }, { id: 2, text: 'Bolinha', status: 'completed' }, { id: 3, text: 'Hora', status: 'pending' }]
  const res = w.renderResult({ content: [{ type: 'text', text: 'Started #1: Tema' }], details: { action: 'start', todos, nextId: 4 } }, { expanded: false, isPartial: false }, ansiTheme, c)
  assert.deepEqual(res.render(80), [])
  const linha = plain(w.renderCall(args, ansiTheme, c).render(80)[0])
  assert.match(linha, new RegExp(`^  . Iniciada #1  Tema: fundo verde +██╌╌╌╌ 1/3  \\d\\d:\\d\\d$`))
  const { visibleWidth: tuiWidth } = await import(join(tmp, 'node_modules', '@earendil-works', 'pi-tui', 'dist', 'index.js'))
  assert.equal(tuiWidth(linha), 78)
  // add: o número vem do resultado (a tarefa nova é a de maior id)
  const s2 = {}
  const a2 = { action: 'add', text: 'Hora' }
  w.renderResult({ content: [], details: { action: 'add', todos, nextId: 4 } }, { expanded: false, isPartial: false }, ansiTheme, ctx({ args: a2, state: s2 }))
  assert.ok(plain(w.renderCall(a2, ansiTheme, ctx({ args: a2, state: s2 })).render(80)[0]).includes('Adicionada #3  Hora'))
  // lista e erro: o desenho nativo continua embaixo
  const s3 = {}
  assert.deepEqual(w.renderResult({ content: [], details: { action: 'list', todos, nextId: 4 } }, { expanded: false, isPartial: false }, ansiTheme, ctx({ state: s3 })).render(80), ['  Started #1: Tema'])
  assert.deepEqual(w.renderResult({ content: [], details: { action: 'start', todos, nextId: 4, error: 'x' } }, { expanded: false, isPartial: false }, ansiTheme, ctx({ state: {} })).render(80), ['  Started #1: Tema'])
})

// Pedido do dono (2026-11-14): memory é consulta, não execução com resultado: sem ícone de estado. Erro continua visível.
// Contrato trocado (dono, 2026-11-20, lab /memoria desenho 9): antes cartão com fundo neutro (customMessageBg), `│ corpo` cru abaixo
// e o título nativo; agora uma frase `Memory · estado · nome` sem fundo e sem corpo (detalhes em memoria.test.ts).
test('memory: sem fundo e sem corpo cru; a frase traz a hora e o erro aparece como falha', () => {
  const { on, resolver } = comHora()
  const bgTheme = { ...ansiTheme, bg: (c: string, t: string) => `[${c}]${t}[/]` }
  const w = resolver('memory', base)
  assert.equal(w.renderShell, 'self')
  on.tool_execution_end({ toolCallId: 'mem-1', toolName: 'memory' })
  const args = { action: 'read', name: 'x' }
  const c = ctx({ toolCallId: 'mem-1', args })
  const res = w.renderResult({ content: [{ type: 'text', text: 'No memory named x.' }] }, { expanded: false, isPartial: false }, bgTheme, c).render(60)
  assert.deepEqual(res, [])
  const call = w.renderCall(args, bgTheme, c).render(60)
  assert.ok(call.every((r: string) => !r.includes('[customMessageBg]') && !r.includes('[tool')), call.join('|'))
  assert.match(plain(call[0]), /Memory · failed · x · não encontrada +\d\d:\d\d$/)
})

// Pedido do dono (2026-11-14, variante B): run com cabeçalho curto (verbo + nome do run) e linha de fatos (estado em cor,
// duração, id, log); saída recuada só quando existe; estado e fundo pelo estado REAL do run, não pelo da chamada.
test('run A: nome, estado e resumo em uma linha; id, log e saída expandidos, sem barra', () => {
  const { resolver } = comHora()
  const cor = { fg: (c: string, t: string) => `<${c}>${t}</c>`, bold: (t: string) => t, bg: (c: string, t: string) => `[${c}]${t}` }
  const w = resolver('run', () => ({}))
  assert.equal(w.renderShell, 'self')
  const home = process.env.HOME
  const log = `${home}/.local/state/pi-runs/rhwep1.log`
  const draw = (args: Record<string, unknown>, text: string, extra: Record<string, unknown> = {}, expanded = false, t: typeof cor = cor) => {
    const c = ctx({ args, state: {}, ...extra })
    const res = w.renderResult({ content: [{ type: 'text', text }] }, { expanded, isPartial: false }, t, c).render(240)
    const call = w.renderCall(args, t, c).render(240)
    return { call, res, linhas: [...call, ...res].map(plain).map((l) => l.replace(/\[[a-zA-Z]+\]/g, '').trimEnd()).filter(Boolean), cru: [...call, ...res].join('\n') }
  }
  // Desenho "Uma linha" (escolha do dono no lab /rodando, 2026-11-19): antes caixa com o fundo do estado de ponta a ponta,
  // linha em branco acima e abaixo e `▸ nome · rotulo · tempo · resumo`; agora uma faixa só, neutra (vermelha no erro):
  // `▸ nome  estado · tempo[ · N linhas]` à esquerda e `id[ · tecla abre] · hora` à direita. Rodando = "em segundo plano".
  // (dono, 2026-11-20, lab /runbanda desenho 19 "Refinada"): antes `estado · tempo · linhas` com o rótulo cru (exit 0) e
  // `id · tecla abre · hora`; agora `estado em palavra · tempo · tipo · exit N · N linhas · comando` e `id · hora`.
  const espera = draw({ action: 'wait', id: 'rhwep1', timeout_s: 30 }, `ainda rodando após 30s\nrhwep1 [shell] running · 00:40 · gw-lean · aguardado · log ${log}\n(sem output)`)
  assert.equal(espera.call.length, 1, 'uma faixa, sem as linhas em branco da caixa')
  assert.deepEqual(espera.res, [])
  assert.match(espera.linhas[0]!, /^ ▸ gw-lean {2}rodando · 00:40 · shell {2,}rhwep1$/)
  assert.ok(espera.cru.startsWith('[customMessageBg]') && !/toolPendingBg|toolSuccessBg/.test(espera.cru))
  assert.ok(espera.cru.includes('<syntaxType>rodando</c>'))
  const falhou = draw({ action: 'wait', id: 'rhwep1' }, `rhwep1 [shell] failed exit 1 · 01:05 · gw-lean · aguardado · log ${log}\nerror[E0308]: mismatched types\ngate lean: 1 de 7 falhou`)
  assert.equal(falhou.linhas.length, 1)
  assert.match(falhou.linhas[0]!, /^ ▸ gw-lean {2}falhou · 01:05 · shell · exit 1 · 2 linhas {2,}rhwep1$/)
  assert.ok(falhou.cru.startsWith('[toolErrorBg]') && falhou.cru.includes('<error>falhou</c>') && falhou.cru.includes('<error>exit 1</c>'))
  const ok = draw({ action: 'tail', id: 'rhwep1' }, `rhwep1 [shell] done exit 0 · 03:12 · gw-lean · log ${log}\n412 passed`)
  assert.match(ok.linhas[0]!, /^ ▸ gw-lean {2}concluído · 03:12 · shell · 1 linha {2,}rhwep1$/)
  assert.ok(ok.cru.startsWith('[customMessageBg]') && ok.cru.includes('<success>concluído</c>') && !ok.cru.includes('exit 0') && !ok.cru.includes('[toolSuccessBg]'))
  const parado = draw({ action: 'wait', id: 'r2' }, 'r2 [shell] stopped sinal SIGINT · 00:52 · gw-lean')
  assert.equal(parado.linhas.length, 1)
  assert.match(parado.linhas[0]!, /^ ▸ gw-lean {2}parado · 00:52 · shell · sinal SIGINT {2,}r2$/)
  assert.ok(parado.cru.includes('<warning>sinal SIGINT</c>'))
  const inicio = draw({ action: 'start', command: 'make gate', name: 'gw-lean', await: true }, `iniciado rhwep1 (pid 77)\nlog: ${log}\nVocê será avisado quando terminar (novo turno); não faça polling.`)
  assert.equal(inicio.linhas.length, 1)
  assert.match(inicio.linhas[0]!, /^ ▸ gw-lean {2}rodando · shell · make gate {2,}rhwep1$/)
  assert.ok(draw({ action: 'start', name: 'gw-lean' }, `iniciado rhwep1 (pid 77)\nlog: ${log}\navisado`, {}, true).linhas[1]!.includes('rhwep1 · aviso ao terminar · log ~/.local/state/pi-runs/rhwep1.log'))
  const muitas = Array.from({ length: 9 }, (_, i) => `linha ${i + 1}`).join('\n')
  const longo = `rhwep1 [shell] done exit 0 · 03:12 · gw-lean\n${muitas}`
  const ansiCor = { ...cor, fg: (_c: string, t: string) => `\x1b[2m${t}\x1b[22m` }
  const fechado = draw({ action: 'wait', id: 'rhwep1' }, longo, { keyText: () => 'alt+o' }, false, ansiCor).linhas
  assert.equal(fechado.length, 1)
  assert.match(fechado[0]!, /^ ▸ gw-lean {2}concluído · 03:12 · shell · 9 linhas {2,}rhwep1$/)
  const abertoRun = draw({ action: 'wait', id: 'rhwep1' }, longo, {}, true, ansiCor)
  assert.equal(abertoRun.linhas.length, 11)
  assert.match(abertoRun.linhas[0]!, /rhwep1$/) // (dono, 2026-11-20): antes `rhwep1 · ctrl+o fecha`; o atalho saiu da faixa
  assert.equal(abertoRun.linhas[1]!.trim(), '03:12 · rhwep1')
  assert.deepEqual(abertoRun.linhas.slice(2).map((r: string) => r.trim()), muitas.split('\n'))
  assert.ok(abertoRun.res.every((r: string) => !/\[[a-zA-Z]+Bg\]/.test(r)), 'saída aberta sem fundo, logo abaixo da faixa')
  // o que não é reconhecido (list, stop, erro) mostra o texto como veio, no padding interno padrão
  const lista = draw({ action: 'list' }, 'nenhum run')
  assert.deepEqual(lista.linhas, [`   ${icon(toolIcon('run'))} run · list`, '   nenhum run'])
  assert.ok([...espera.call, ...espera.res, ...falhou.res].every((r: string) => visibleWidth(plain(r).replace(/\[[a-zA-Z]+\]/g, '')) <= 240))
})

// "Uma linha" com a Barra (dono, 2026-11-19): enquanto o run segue vivo no registro do pi-code (pi-code.run.registry), o tempo
// corre a partir do início e a barra ━ do Bash anda ao lado do estado; terminado no registro, a faixa para e fica como veio.
test('run vivo: tempo corrente e barra enquanto o registro diz running; terminado, sem barra', () => {
  const { resolver } = comHora()
  const cor = { fg: (c: string, t: string) => `<${c}>${t}</c>`, bold: (t: string) => t, bg: (c: string, t: string) => `[${c}]${t}` }
  const w = resolver('run', () => ({}))
  const KEY = Symbol.for('pi-code.run.registry')
  const g = globalThis as Record<symbol, unknown>
  const salvo = g[KEY]
  const rec = { state: 'running', startedAt: Date.now() - 72_000 }
  g[KEY] = { get: (id: string) => (id === 'rv1' ? rec : undefined) }
  const amb = { NO_COLOR: process.env.NO_COLOR, PI_REDUCED_MOTION: process.env.PI_REDUCED_MOTION }
  delete process.env.NO_COLOR; delete process.env.PI_REDUCED_MOTION
  try {
    const c = ctx({ args: { action: 'start', name: 'suite8' }, state: {}, toolCallId: 'rv-call', invalidate() {} })
    const r = w.renderResult({ content: [{ type: 'text', text: 'iniciado rv1 (pid 9)\nlog: /tmp/rv1.log\navisado' }] }, { expanded: false, isPartial: false }, cor, c)
    r.render(120)
    // Largura folgada: as tags <cor> do tema de teste contam como colunas.
    const vivo = w.renderCall(c.args, cor, c).render(400)[0]
    assert.match(plain(vivo).replace(/\[[a-zA-Z]+\]/g, ''), /^ ▸ suite8 {2}[━─]{10} rodando · 1:1\d · shell {2,}rv1/)
    assert.ok(vivo.includes('<accent>━</c>'), 'barra acesa')
    rec.state = 'done'
    const fim = plain(w.renderCall(c.args, cor, c).render(400)[0]).replace(/\[[a-zA-Z]+\]/g, '')
    assert.match(fim, /^ ▸ suite8 {2}rodando · shell {2,}rv1/, 'sem barra e sem tempo corrente')
  } finally {
    if (salvo === undefined) delete g[KEY]
    else g[KEY] = salvo
    for (const [k, v] of Object.entries(amb)) if (v !== undefined) process.env[k] = v
  }
})

// Pedido do dono (2026-11-14, variante B): subagente no padrão do run: cabeçalho `subagente · <agente|paralelo · N agentes>`,
// linha de fatos (estado em cor, onde roda, id) e a tarefa ou o resultado de cada agente embaixo. Sem a frase em inglês.
test('subagente B: árvore sem fundo, estado de cada agente e expansão nativa', () => {
  const { resolver } = comHora()
  const cor = { fg: (c: string, t: string) => `<${c}>${t}</c>`, bold: (t: string) => t, bg: (c: string, t: string) => `[${c}]${t}` }
  const w = resolver('subagent', () => ({ renderCall: () => nativeComponent('nativo-call'), renderResult: () => nativeComponent('nativo-result') }))
  const draw = (args: Record<string, unknown>, result: Record<string, unknown>, o: Record<string, unknown> = {}) => {
    const c = ctx({ args, state: {}, keyText: () => 'ctrl+o', ...o })
    const res = w.renderResult(result, { expanded: o.expanded === true, isPartial: o.isPartial === true }, cor, c).render(240)
    const call = w.renderCall(args, cor, c).render(240)
    return { linhas: [...call, ...res].map(plain).map((l) => l.replace(/\[[a-zA-Z]+\]/g, '').replace(/ {3,}ct(?:rl\+)?.*$/, '  ⌨').trimEnd()).filter(Boolean), cru: [...call, ...res].join('\n') }
  }
  const txt = (text: string) => ({ content: [{ type: 'text', text }], details: { results: [] } })
  const A = icon(toolIcon('subagent'))
  const ENG = nerdFont() ? '\u{f1935}' : '↗' // ícone de segundo plano (lab /subag2)
  const fim = (agent: string, exitCode: number, out: string, turns = 3) => ({ agent, task: `tarefa de ${agent}`, exitCode, usage: { turns }, messages: [{ role: 'assistant', content: [{ type: 'text', text: out }] }] })
  // segundo plano (dono, 2026-11-14, variante A): a chamada só entrega o agente; a caixa diz "enviado", sem bolinha nem fundo
  // de estado (antes ficava "rodando" para sempre no histórico). O resultado chega no aviso subagent-background.
  const bg = draw({ agent: 'plan-reviewer', task: 'Faça uma re-revisão\nsegunda linha' }, txt('Started background run bg-1c12d077 (plan-reviewer). A notification will arrive on completion; check progress with {status: true}.'))
  assert.deepEqual(bg.linhas, [`${A} Subagent · plan-reviewer ${ENG} · enviado`, '  └ Faça uma re-revisão']) // (dono, 2026-11-20, /subag2 desenho 3): antes `Subagent · enviado para segundo plano` e `└ plan-reviewer · tarefa` // (dono, 2026-11-20): antes ícone na coluna 2 e `└` na 4; agora ícone na coluna 0 (a do Read) e `└` na coluna de Subagent
  // (dono, 2026-11-20): antes sem nenhum fundo (`customMessageBg` proibido); agora a 1ª linha é uma faixa neutra de ponta a ponta, a 2ª segue sem fundo.
  assert.doesNotMatch(bg.cru, /\[tool|Started background/)
  assert.match(bg.cru, /^\[customMessageBg\]/)
  assert.doesNotMatch(bg.cru.split('\n')[1]!, /\[customMessageBg\]/)
  // lote que foi para segundo plano: uma linha por agente com a tarefa
  const tasks = [{ agent: 'gate-runner', task: 'Rode o gate' }, { agent: 'test-author', task: 'Escreva os testes' }]
  const lote = draw({ tasks }, txt('This subagent call runs in the background so the user can keep using the main prompt. Its result arrives as a message when it finishes.'))
  assert.deepEqual(lote.linhas, [`${A} Subagents · 2 enviados`, `  ├ gate-runner ${ENG} · Rode o gate`, `  └ test-author ${ENG} · Escreva os testes`]) // (dono, 2026-11-20, /subag2 desenho 3): antes `Subagent · enviado para segundo plano` e sem o ícone
  // primeiro plano, concluído (Solução 2): atalho no cabeçalho, resultado na prévia sem disputa à direita
  const ok = draw({ agent: 'plan-reviewer', task: 't' }, { content: [], details: { results: [fim('plan-reviewer', 0, 'PLAN_REVIEW: complete.\nresto', 12)] } })
  // Chips (dono, 2026-11-20): antes `◎ 1 agente · 12 turnos` e `└ plan-reviewer · concluído · …`; agora ícone do estado, chips e resultado recuado.
  // (dono, 2026-11-20): antes chips com fundo (`✓  plan-reviewer   concluído   12 turnos`); agora lab /subag3: cabeçalho + linha `└ agente · estado · texto`, `·` dim, sem fundo.
  // (dono, 2026-11-20): nome da tool sempre capitalizado (antes `subagente`/`subagentes`).
  assert.deepEqual(ok.linhas, ['◎ Subagent · plan-reviewer · concluído · 12 turnos  ⌨', '  └ PLAN_REVIEW: complete.']) // (dono, 2026-11-20, /subag2 desenho 3): antes nome e estado na linha └
  assert.doesNotMatch(ok.cru.split('\n').slice(1).join('\n'), /\[(toolSuccessBg|customMessageBg)\]/) // (dono, 2026-11-20): antes nenhuma linha com fundo; agora o cabeçalho tem a faixa neutra
  assert.ok(ok.cru.includes('<success>concluído</c>'))
  // lote misto: um par de linhas por agente, na ordem da chamada (dono, 2026-11-20; antes quem falhou primeiro, em árvore)
  const misto = draw({ tasks }, { content: [], details: { results: [fim('test-author', 0, '6 testes novos'), fim('gate-runner', 1, 'structure: 2 violações')] } })
  // (dono, 2026-11-20): antes `✓  test-author   concluído   3 turnos` + resultado em 2 linhas por agente; agora cabeçalho com contagem + `├ └ agente · estado · texto`.
  assert.deepEqual(misto.linhas, ['◎ Subagents · 1 ok · 1 erro  ⌨', '  ├ test-author · concluído · 6 testes novos', '  └ gate-runner · erro · structure: 2 violações'])
  assert.ok(misto.cru.includes('<error>erro</c>') && misto.cru.includes('<success>concluído</c>'))
  // em andamento (primeiro plano): rodando, com a tarefa de quem ainda não terminou
  const vivo = draw({ tasks }, { content: [], details: { results: [fim('gate-runner', 0, 'gate verde'), { agent: 'test-author', task: 'Escreva os testes', exitCode: -1, usage: { turns: 2 }, messages: [] }] } }, { isPartial: true })
  assert.deepEqual(vivo.linhas.map((l: string) => l.replace(/^[^\s├└](?= \S)/, '·')), ['· Subagents · 1 executando · 1 ok  ⌨', '  ├ gate-runner · concluído · gate verde', '  └ test-author · executando · Escreva os testes']) // (dono, 2026-11-20): antes 2 linhas por agente com turnos
  // aberto: fatos + o desenho nativo inteiro; status/cancel/erro: nativo
  const aberto = draw({ agent: 'x', task: 't' }, { content: [], details: { results: [fim('x', 0, 'ok')] } }, { expanded: true })
  assert.deepEqual(aberto.linhas.slice(2), ['  nativo-result']) // (dono, 2026-11-20): antes slice(1); o card de chips tem 2 linhas (chips + resultado)
  assert.deepEqual(draw({ status: true }, txt('No background runs in this session.')).linhas, [`${A} Subagent · status · nenhum run`]) // (dono, 2026-11-20): antes `Subagent · status` e o texto cru sob `│`; agora a contagem no cabeçalho
})

// Pedido do dono (2026-11-14): pergunta cancelada com fundo de aviso (antes ficava verde, como se tivesse dado certo).
// Resposta em destaque (dono, 2026-11-20): sem fundo algum; cancelada = `sem resposta · Esc` em warning, respondida em success.
test('question: sem fundo; cancelada e tempo esgotado em warning, respondida em success; várias perguntas separadas por linha em branco', () => {
  const BG: Record<string, number> = { toolSuccessBg: 42, toolErrorBg: 41, toolPendingBg: 46, customMessageBg: 47 }
  const t = { fg: (c: string, x: string) => `<${c}>${x}</c>`, bold: (x: string) => x, bg: (c: string, x: string) => `\x1b[${BG[c]}m${x}\x1b[49m` }
  const w = resolverOf().resolver('question', () => ({ renderCall: () => ({ render: () => [], invalidate() {} }), renderResult: () => nativeComponent('? Forma  pergunta') }))
  assert.equal(w.renderShell, 'self')
  const draw = (details: unknown) => {
    const c = ctx({ outputPad: 1 })
    return [...w.renderCall({}, t, c).render(160), ...w.renderResult({ content: [], details }, { isPartial: false }, t, c).render(160)]
  }
  const ok = draw({ question: 'Qual?', answer: 'a' })
  assert.equal(ok.length, 2)
  assert.ok(ok.every((l) => !/\x1b\[4[1267]m/.test(l)), ok.join('|')) // (dono, 2026-11-20): antes a pílula da hora/atalho tinha fundo; agora nada tem
  assert.ok(ok[1]!.includes('<success>a</c>') && ok[1]!.includes('<accent>❯</c>'))
  const cancelada = draw({ question: 'Qual?', answer: null })
  assert.ok(cancelada[1]!.includes('<warning>sem resposta · Esc</c>') && !cancelada.join('').includes('<success>'))
  assert.ok(draw({ question: 'Qual?', answer: '', timedOut: true })[1]!.includes('<warning>tempo esgotado · seguiu sem resposta</c>'))
  const lote = draw({ question: 'Q1', answer: 'a', questions: [{ header: 'Um', question: 'Q1', answer: 'a' }, { header: 'Dois', question: 'Q2', answer: null }] }).map(plain)
  assert.deepEqual(lote.map((l: string) => l.replace(/(?<=\S) {2,}.*$/, '')), ['Um · Q1', '❯ a', '', 'Dois · Q2', '❯ sem resposta · Esc']) // (dono, 2026-11-20): antes recuo 3
  // resposta digitada: `(outra)` dim; opção com a descrição entre parênteses mostra só o rótulo
  assert.ok(draw({ question: 'Q', answer: 'texto livre', wasCustom: true })[1]!.includes('<dim> (outra)</c>'))
  assert.ok(draw({ question: 'Q', answer: 'Sim (recomendado)' })[1]!.includes('<success>Sim</c>'))
  // variante A (dono, 2026-11-14): a hora do término vai à direita do cabeçalho
  const { on, resolver } = comHora()
  const wh = resolver('question', () => ({ renderCall: () => ({ render: () => [], invalidate() {} }), renderResult: () => nativeComponent('x') }))
  on.tool_execution_end({ toolCallId: 'q-1', toolName: 'question' })
  const ch = ctx({ toolCallId: 'q-1', outputPad: 1 })
  const linhas = wh.renderResult({ content: [], details: { header: 'Forma', question: 'Qual?', answer: 'a' } }, { isPartial: false }, ansiTheme, ch).render(80).map(plain)
  assert.match(linhas[0]!, /^Forma · Qual\? +ctrl\+o abre {2}\d\d:\d\d$/) // (dono, 2026-11-20): antes recuo 3 (margem do chat agora)
})


// U14: o ramo da sessão é varrido uma vez para montar toolCallId -> hora, não uma vez por chamada.
test('U14 hora do histórico: 300 chamadas leem o ramo uma vez e a hora sai igual', () => {
  const T = new Date(2026, 10, 14, 9, 41, 30).getTime()
  let leituras = 0
  const branch = Array.from({ length: 300 }, (_, i) => ({ type: 'message', message: { role: 'toolResult', toolCallId: `u14-${i}`, timestamp: T + i * 60_000 } }))
  const on: Record<string, any> = {}
  let resolver: any
  mod.default({ registerToolRenderer: (r: unknown) => (resolver = r), on: (e: string, h: unknown) => (on[e] = h) })
  on.session_start({}, { sessionManager: { getBranch: () => (leituras++, branch) } })
  const w = resolver('read', base)
  const horas = [0, 1, 299].map((i) => ficha(w.renderCall({}, ansiTheme, ctx({ args: { path: '/work/proj/a.ts' }, toolCallId: `u14-${i}`, durationMs: 1000 })).render(90)[0]).slice(-5))
  for (let i = 0; i < 300; i++) w.renderCall({}, ansiTheme, ctx({ args: { path: '/work/proj/a.ts' }, toolCallId: `u14-${i}`, durationMs: 1000 })).render(90)
  assert.equal(leituras, 1)
  assert.deepEqual(horas, ['09:41', '09:42', '14:40'])
})

// Azul do Bash (dono, 2026-11-20; antes ícone muted nas ações, nome em text, e `enviado para segundo plano` sem nome): ícone e
// `Subagent`/`Subagents` em accent, negrito, em todos os cartões.
test('subagente: ícone e nome em accent em todos os cartões (único, paralelo, segundo plano, ações)', () => {
  const { on, resolver } = comHora()
  const t = { fg: (c: string, x: string) => `<${c}>${x}</c>`, bold: (x: string) => `*${x}*` }
  const sub = resolver('subagent', () => ({ renderCall: () => nativeComponent('n'), renderResult: () => nativeComponent('n') }))
  const cab = (a: Record<string, unknown>, id: string, res?: unknown, parcial = false) => {
    const c = ctx({ args: a, state: {}, toolCallId: id, keyText: () => 'ctrl+o', isPartial: parcial })
    on.tool_execution_end({ toolCallId: id, toolName: 'x' })
    if (res) sub.renderResult(res, { expanded: false, isPartial: parcial }, t, c)
    return sub.renderCall(a, t, c).render(300)[0] as string
  }
  const casos = [
    cab({ agent: 'a', task: 'x' }, 'az-1', { content: [], details: { results: [{ agent: 'a', task: 'x', exitCode: 0, usage: {}, messages: [] }] } }),
    cab({ tasks: [{ agent: 'a', task: 'x' }, { agent: 'b', task: 'y' }] }, 'az-2', { content: [], details: { results: [{ agent: 'a', task: 'x', exitCode: -1, usage: {}, messages: [] }, { agent: 'b', task: 'y', exitCode: -1, usage: {}, messages: [] }] } }, true),
    cab({ agent: 'a', task: 'x' }, 'az-3', { content: [{ type: 'text', text: 'This subagent call runs in the background so the user can keep using the main prompt.' }], details: { results: [] } }),
    cab({ send: 'bg-1', task: 'oi' }, 'az-4'),
    cab({ status: true }, 'az-5', { content: [{ type: 'text', text: 'No background runs in this session.' }] }),
  ]
  for (const l of casos) {
    assert.match(l, /<accent>\*Subagents?\*<\/c>|\*<accent>Subagents?<\/c>\*/, l) // negrito por dentro ou por fora
    assert.match(l, /^\s*<accent>[^<\s]+<\/c>/, `ícone em accent: ${l}`)
  }
})

// status legível (dono, 2026-11-20; antes o texto cru em inglês sob `│`): contagem colorida no cabeçalho, um run por linha.
test('subagente: status lista os runs (registro e lanes) com estado colorido; texto desconhecido sob │', () => {
  const { resolver } = comHora()
  const t = { fg: (c: string, x: string) => `<${c}>${x}</c>`, bold: (x: string) => x }
  const texto = 'bg-1 swarm-worker: running - Handback in pt-BR\nbg-2 plan-reviewer: done (exit 0, 14 turns) - revisar\nbg-3 gate-runner: failed (exit 1, 3 turns) - gate\n\nAgent lanes:\nfg-9 swarm-worker running · 4t · $0.09 · 00:19 · thinking…\n\nbg-4: nota estranha'
  const w = resolver('subagent', () => ({ renderCall: () => nativeComponent('n'), renderResult: () => nativeComponent('n') }))
  const c = ctx({ args: { status: true }, state: {}, keyText: () => 'ctrl+o' })
  const corpo = w.renderResult({ content: [{ type: 'text', text: texto }] }, { expanded: false, isPartial: false }, t, c).render(400).map(plain)
  const cab = w.renderCall({ status: true }, t, c).render(400)[0] as string
  assert.ok(cab.includes('<syntaxType>2 executando</c>') && cab.includes('<success>1 concluído</c>') && cab.includes('<error>1 falhou</c>'), cab)
  const col = plain(cab).replace(/<[^>]*>/g, '').indexOf('Subagent')
  assert.deepEqual(corpo.map((l: string) => l.replace(/<[^>]*>/g, '').trimEnd()), [
    `${' '.repeat(col)}├ swarm-worker · executando · bg-1 · Handback in pt-BR`,
    `${' '.repeat(col)}├ plan-reviewer · concluído · 14 turnos · bg-2 · revisar`,
    `${' '.repeat(col)}├ gate-runner · falhou · exit 1 · 3 turnos · bg-3 · gate`,
    `${' '.repeat(col)}├ swarm-worker · executando · 00:19 · 4 turnos · US$ 0,09 · fg-9 · thinking…`,
    `${' '.repeat(col)}│ bg-4: nota estranha`,
  ])
  // nada reconhecido: o texto como veio, sob `│`
  const c2 = ctx({ args: { status: true }, state: {}, keyText: () => 'ctrl+o' })
  const cru = w.renderResult({ content: [{ type: 'text', text: 'algo novo do pi-code' }] }, { expanded: false, isPartial: false }, t, c2).render(400).map(plain)
  assert.ok(cru.length >= 1 && cru.every((l: string) => !/├|└/.test(l)), cru.join('|'))
})

// Hora dos subagentes (dono, 2026-11-20): sem fundo (antes pílula) e na mesma coluna da hora do Read (margem direita do chat).
test('subagente: a hora fica em dim sem fundo e termina na mesma coluna da hora do Read (enviado ao segundo plano, único e paralelo)', () => {
  const { on, resolver } = comHora()
  const tema = { fg: (_c: string, t: string) => `\x1b[2m${t}\x1b[22m`, bold: (t: string) => t, bg: (c: string, t: string) => `\x1b[48;2;9;9;9m${t}\x1b[49m`, getBgAnsi: () => '\x1b[48;2;9;9;9m', getFgAnsi: () => '\x1b[38;2;200;200;200m' }
  const w = 100
  const coluna = (linha: string) => { const p = plain(linha); const m = /\d\d:\d\d(?= *$)/.exec(p)!; assert.ok(m, p); return visibleWidth(p.slice(0, m.index + m[0].length)) }
  const rd = resolver('read', () => ({ renderCall: () => nativeComponent('n'), renderResult: () => nativeComponent('n') }))
  const sub = resolver('subagent', () => ({ renderCall: () => nativeComponent('n'), renderResult: () => nativeComponent('n') }))
  const args = { tasks: [{ agent: 'a', task: 'x' }, { agent: 'b', task: 'y' }] }
  const linhaDe = (r: any, a: Record<string, unknown>, id: string, res?: unknown, o: Record<string, unknown> = {}) => {
    const c = ctx({ args: a, state: {}, toolCallId: id, keyText: () => 'ctrl+o', ...o })
    on.tool_execution_end({ toolCallId: id, toolName: 'x' })
    if (res) r.renderResult(res, { expanded: false, isPartial: o.isPartial === true }, tema, c)
    return r.renderCall(a, tema, c).render(w)[0] as string
  }
  const ref = coluna(linhaDe(rd, { path: '/work/proj/a.ts' }, 'rd-h', { content: [{ type: 'text', text: 'a' }], details: undefined }))
  const bg = linhaDe(sub, { agent: 'swarm-worker', task: 'Faça X' }, 'sub-bg', { content: [{ type: 'text', text: 'This subagent call runs in the background so the user can keep using the main prompt. Its result arrives as a message when it finishes.' }], details: { results: [] } })
  assert.match(plain(bg), /swarm-worker \S+ · enviado/) // (dono, 2026-11-20, /subag2 desenho 3): antes `enviado para segundo plano`
  const um = linhaDe(sub, { agent: 'a', task: 'x' }, 'sub-1', { content: [], details: { results: [{ agent: 'a', task: 'x', exitCode: 0, usage: {}, messages: [] }] } })
  const par = linhaDe(sub, args, 'sub-p', { content: [], details: { results: [{ agent: 'a', task: 'x', exitCode: 0, usage: {}, messages: [] }, { agent: 'b', task: 'y', exitCode: -1, usage: {}, messages: [] }] } }, { isPartial: true })
  for (const l of [bg, um, par]) assert.equal(coluna(l), ref, plain(l))
  // Pergunta na margem do chat (dono, 2026-11-20; antes 3 colunas para dentro e a hora 2 antes): cabeçalho na coluna 0, hora com a do Read.
  const q = resolver('question', () => ({ renderCall: () => nativeComponent('n'), renderResult: () => nativeComponent('n') }))
  const qc = ctx({ args: {}, state: {}, toolCallId: 'q-h', keyText: () => 'ctrl+o' })
  on.tool_execution_end({ toolCallId: 'q-h', toolName: 'question' })
  const ql = q.renderResult({ content: [], details: { questions: [{ header: 'Fonte', question: 'Manter Onest?', answer: 'Manter Onest' }] } }, { expanded: false, isPartial: false }, tema, qc).render(w) as string[]
  assert.ok(plain(ql[0]!).startsWith('Fonte · '), plain(ql[0]!))
  assert.ok(plain(ql[1]!).startsWith('❯ Manter Onest'), plain(ql[1]!))
  assert.equal(coluna(ql[0]!), ref, plain(ql[0]!))
  // enviado ao segundo plano: faixa neutra de ponta a ponta (hora dim dentro dela, sem pílula própria); único e paralelo: sem fundo
  assert.ok(bg.startsWith('\x1b[48;2;9;9;9m') && bg.endsWith('\x1b[49m'), 'faixa neutra de ponta a ponta')
  assert.equal(visibleWidth(plain(bg)), w, 'a faixa cobre a linha inteira')
  assert.deepEqual([...new Set(bg.match(/\x1b\[48;[0-9;]*m/g))], ['\x1b[48;2;9;9;9m'], 'só o fundo neutro, nenhuma pílula atrás da hora')
  assert.doesNotMatch(bg.slice(0, bg.search(/\d\d:\d\d/)).replace(/\x1b\[48;2;9;9;9m/g, '').slice(-60), /\x1b\[48;/)
  // (dono, 2026-11-20): antes único e paralelo sem fundo; agora a faixa neutra também (a hora fica dentro dela)
  for (const l of [um, par]) assert.deepEqual([...new Set(l.match(/\x1b\[48;[0-9;]*m/g))], ['\x1b[48;2;9;9;9m'], 'só a faixa neutra')
})

// Corpo de texto puro (dono, 2026-11-20): send/status/cancel/resume/list e erro sem detalhes saíam na margem esquerda; agora `│` e o texto
// começam na coluna da palavra `Subagent` do cabeçalho, cortados com … na largura.
test('subagente: resultado em texto puro (send, status, cancel, resume) com `│` e o texto alinhado à palavra Subagent', () => {
  const { resolver } = comHora()
  const longo = 'Message queued for run bg-7b82c991: it is delivered at the run\'s next turn boundary, not in the middle of a tool call.'
  const w = resolver('subagent', () => ({ renderCall: () => nativeComponent('nativo-call'), renderResult: () => nativeComponent(longo) }))
  const tema = { fg: (_c: string, t: string) => t, bold: (t: string) => t }
  for (const args of [{ send: 'bg-7b82c991', message: 'oi' }, { status: true }, { cancel: 'bg-1' }, { resume: 'bg-2', task: 'x' }]) {
    const c = ctx({ args, state: {}, keyText: () => 'ctrl+o' })
    const res = w.renderResult({ content: [{ type: 'text', text: 'x' }], details: { results: [] } }, { expanded: false, isPartial: false }, tema, c)
    for (const larg of [240, 60]) {
      const cab = plain(w.renderCall(args, tema, c).render(larg)[0])
      const corpo = plain(res.render(larg)[0])
      const col = cab.indexOf('Subagent')
      assert.ok(col > 0, cab)
      // (dono, 2026-11-20): `│` na coluna do nome Subagent e o texto 2 colunas depois; antes o texto na coluna do nome e o `│` 2 antes.
      assert.equal(corpo[col], '│', corpo)
      assert.equal(corpo.indexOf(longo.slice(0, 7)), col + 2, `texto 2 colunas após o │: ${corpo}`)
      assert.ok(visibleWidth(corpo) <= larg)
      if (larg === 60) assert.ok(corpo.endsWith('…'), corpo)
    }
  }
})

// Cabeçalho das ações sem run (dono, 2026-11-20; antes `Subagent · mensagem para bg-…` sem agente nem desfecho): `Subagent · <ação> · <agente> <id dim>`
// e à direita, antes da hora, o desfecho real do resultado (na fila/entregue/cancelado/retomado/falhou); texto não reconhecido = nada.
test('subagente: cabeçalho das ações (send, cancel, resume, status) com agente conhecido, id dim e desfecho colorido', () => {
  const { on, resolver } = comHora()
  const cor = { fg: (c: string, t: string) => `<${c}>${t}</c>`, bold: (t: string) => t }
  const w = resolver('subagent', () => ({ renderCall: () => nativeComponent('nc'), renderResult: () => nativeComponent('nr') }))
  const cab = (args: Record<string, unknown>, texto: string, o: Record<string, unknown> = {}) => {
    const c = ctx({ args, state: {}, ...o })
    w.renderResult({ content: [{ type: 'text', text: texto }], details: { results: [] } }, { expanded: false, isPartial: false }, cor, c)
    return w.renderCall(args, cor, c).render(300)[0] as string
  }
  const p = (l: string) => plain(l).replace(/ {2,}/g, ' ').trim()
  // agente conhecido do aviso de segundo plano (mesma sessão)
  cab({ agent: 'swarm-worker', task: 'x' }, 'Started background run bg-7b82c991 (swarm-worker). A notification will arrive on completion.')
  const fila = cab({ send: 'bg-7b82c991', task: 'oi' }, "Message queued for run bg-7b82c991: it is delivered at the run's next turn boundary, not in the middle of a tool call.")
  assert.equal(p(fila), '◎ Subagent · mensagem · swarm-worker bg-7b82c991 na fila')
  assert.ok(fila.includes('<dim>bg-7b82c991</c>') && fila.includes('<accent>na fila</c>') && fila.includes('<dim> · </c>'))
  assert.equal(p(cab({ send: 'bg-zz', task: 'oi' }, 'Run bg-zz had finished; resumed it with your message.')), '◎ Subagent · mensagem · bg-zz entregue') // agente desconhecido: omitido
  assert.ok(cab({ send: 'bg-zz', task: 'oi' }, 'Run bg-zz had finished; resumed it with your message.').includes('<success>entregue</c>'))
  const falha = cab({ send: 'bg-q', task: 'oi' }, 'Unknown run: bg-q.\n\nNo background subagent runs.')
  assert.ok(p(falha).endsWith('bg-q falhou') && falha.includes('<error>falhou</c>'))
  assert.ok(cab({ send: 'bg-e', task: 'oi' }, 'qualquer coisa', { isError: true }).includes('<error>falhou</c>'))
  assert.equal(p(cab({ send: 'bg-n', task: 'oi' }, 'texto que ninguém conhece')), '◎ Subagent · mensagem · bg-n') // não reconhecido: nada extra
  const canc = cab({ cancel: 'bg-1' }, 'Cancelled background run bg-1.')
  assert.equal(p(canc), '◎ Subagent · cancelar · bg-1 cancelado')
  assert.ok(canc.includes('<success>cancelado</c>'))
  assert.equal(p(cab({ cancel: 'bg-1' }, 'Background run bg-1 already finished; nothing to cancel.')), '◎ Subagent · cancelar · bg-1')
  assert.equal(p(cab({ resume: 'bg-2', task: 'x' }, 'Resumed background run bg-2 with the follow-up task; a notification will arrive on completion.')), '◎ Subagent · retomar · bg-2 retomado')
  assert.ok(cab({ resume: 'bg-2', task: 'x' }, 'Background run bg-2 is still running; wait for it or cancel it first.').includes('<error>falhou</c>'))
  assert.equal(p(cab({ status: true }, 'No background subagent runs.')), '◎ Subagent · status · nenhum run') // (dono, 2026-11-20): antes sem a contagem
  on.tool_execution_end({ toolCallId: 'h-1', toolName: 'subagent' })
  assert.match(cab({ send: 'bg-h', task: 'x' }, 'Message queued for run bg-h: it is delivered', { toolCallId: 'h-1' }), /<accent>na fila<\/c><dim> · \d\d:\d\d<\/c>$/, 'desfecho antes da hora, hora dim')
})

// Antes do resultado (dono, 2026-11-20): a chamada pendente já usa o cabeçalho novo da ação, sem desfecho; antes `Subagent · mensagem para bg-…`.
test('subagente: ação pendente (sem resultado) já mostra `Subagent · ação · id`, sem desfecho', () => {
  const { resolver } = comHora()
  const cor = { fg: (c: string, t: string) => `<${c}>${t}</c>`, bold: (t: string) => t }
  const w = resolver('subagent', () => ({ renderCall: () => nativeComponent('nc'), renderResult: () => nativeComponent('nr') }))
  const p = (l: string) => plain(l).replace(/ {2,}/g, ' ').trim()
  const pend = (args: Record<string, unknown>) => w.renderCall(args, cor, ctx({ args, state: {}, isPartial: true })).render(300)[0] as string
  assert.equal(p(pend({ send: 'bg-p1', task: 'oi' })), '◎ Subagent · mensagem · bg-p1')
  assert.ok(pend({ send: 'bg-p1', task: 'oi' }).includes('<dim>bg-p1</c>'))
  assert.equal(p(pend({ cancel: 'bg-p2' })), '◎ Subagent · cancelar · bg-p2')
  assert.equal(p(pend({ resume: 'bg-p3', task: 'x' })), '◎ Subagent · retomar · bg-p3')
  assert.equal(p(pend({ status: true })), '◎ Subagent · status')
  // agente conhecido da sessão
  const c0 = ctx({ args: { agent: 'swarm-worker', task: 'x' }, state: {} })
  w.renderResult({ content: [{ type: 'text', text: 'Started background run bg-p4 (swarm-worker). x' }], details: { results: [] } }, { expanded: false, isPartial: false }, cor, c0)
  assert.equal(p(pend({ send: 'bg-p4', task: 'oi' })), '◎ Subagent · mensagem · swarm-worker bg-p4')
})

// Margens do cabeçalho do subagente (dono, 2026-11-20): ícone na coluna do ícone do Read, `├/└` na coluna da palavra Subagent, faixa neutra de ponta a ponta (rodando incluso).
test('subagente rodando: ícone na coluna do Read, e faixa neutra de ponta a ponta no cabeçalho (`└` na coluna de Subagent: subagente.test.ts)', () => {
  const { on, resolver } = comHora()
  const BG = '\x1b[48;2;9;9;9m'
  const tema = { fg: (_c: string, t: string) => `\x1b[2m${t}\x1b[22m`, bold: (t: string) => t, bg: (_c: string, t: string) => `${BG}${t}\x1b[49m`, getBgAnsi: () => BG, getFgAnsi: () => '\x1b[38;2;200;200;200m' }
  const rd = resolver('read', () => ({ renderCall: () => nativeComponent('n'), renderResult: () => nativeComponent('n') }))
  const sub = resolver('subagent', () => ({ renderCall: () => nativeComponent('n'), renderResult: () => nativeComponent('n') }))
  const ls = (r: any, a: Record<string, unknown>, id: string, res?: unknown) => {
    const c = ctx({ args: a, state: {}, toolCallId: id, keyText: () => 'ctrl+o' })
    on.tool_execution_end({ toolCallId: id, toolName: 'x' })
    if (res) r.renderResult(res, { expanded: false, isPartial: false }, tema, c)
    return r.renderCall(a, tema, c).render(100) as string[]
  }
  const col = (l: string, m: string) => plain(l).indexOf(m)
  const read = ls(rd, { path: '/work/proj/a.ts' }, 'rd-m', { content: [{ type: 'text', text: 'a' }], details: undefined })[0]!
  const run = ls(sub, { agent: 'swarm-worker', task: 'Faça X' }, 'sub-m')
  assert.equal(col(run[0]!, icon(toolIcon('subagent'))), col(read, icon(toolIcon('read'))), 'ícone do robô na coluna do ícone do Read')
  assert.ok(run[0]!.startsWith(BG) && run[0]!.endsWith('\x1b[49m') && visibleWidth(plain(run[0]!)) === 100, 'faixa de ponta a ponta')
})
