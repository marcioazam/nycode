// node --experimental-strip-types --test extensions/diagnostico/test/painel.test.ts
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { carregar } from './carregar.ts'

const m = await carregar('diagnostico/painel.ts')
const { visibleWidth } = await carregar('diagnostico/_tui.ts')

const theme = { fg: (_c: string, s: string) => s, bg: (_c: string, s: string) => s, bold: (s: string) => s }
const ENTER = '\r', DOWN = '\x1b[B', TAB = '\t'
/** Linha de corpo da moldura: `│` + conteúdo preenchido + `│`. */
const L = (txt: string, w: number) => `│${txt.padEnd(w - 2)}│`
const miolo = (out: string[]) => out.slice(1, -1).map((l) => l.slice(1, -1))

// A visão `problemas` (lista + detalhe) está em modal.test.ts; aqui ficam `eventos` e `saúde` dentro da mesma moldura.
const span = (o: object = {}) => ({ traceId: 'a'.repeat(32), spanId: 'b'.repeat(16), nome: 'execute_tool bash', tipo: 'span', inicio: new Date(2026, 10, 14, 9, 5, 7).getTime(), durMs: 120, attrs: { 'gen_ai.tool.name': 'bash' }, ...o })
function criaObs(spans: any[], achados: any[] | undefined, altura = 16, aba?: string) {
  const acoes = {
    lista: () => [] as any[], silenciar() {}, reativar() {}, limpar() {}, caminhoLog: '~/x.jsonl', caminhoTrilha: '~/y/traces.jsonl',
    eventos: () => spans, resumo: () => ({ spans: spans.length, erros: spans.filter((s) => s.erro).length, tokensEntrada: 1200, tokensSaida: 34 }), saude: () => achados,
  }
  return new m.PainelDiagnostico(theme, acoes, () => {}, () => {}, () => altura, aba, {})
}

test('aba eventos: resumo, hora HH:MM:SS, nome, duração e marca de erro, em 100/80/40 colunas', () => {
  const spans = [span({ nome: 'chat p/m', erro: 'overloaded', durMs: 900 }), span()]
  for (const w of [100, 80, 40]) {
    const p = criaObs(spans, undefined, 16, 'eventos')
    const out = p.render(w)
    for (const l of out) assert.ok(visibleWidth(l) <= w, `largura ${w}: ${l}`)
    const s = out.join('\n')
    assert.ok(s.includes(w >= 60 ? '2 eventos · 1 com erro · tokens 1200 entrada / 34 saída' : '2 eventos · 1 com erro · tok 1200/34'), `resumo em ${w}`)
    assert.ok(s.includes('09:05:07'), `hora em ${w}`)
    assert.ok(s.includes('✕'), `marca de erro em ${w}`)
    assert.match(out[0]!, /eventos|● eventos/)
  }
  assert.match(criaObs(spans, undefined, 16, 'eventos').render(100)[0]!, /^╭─ Diagnóstico · eventos 2\/3 ─+╮$/)
})

test('aba eventos: detalhe mostra atributos, erro e pi.hook.stderr em várias linhas; s e l não agem', () => {
  const sp = span({ nome: 'pi.hook PreToolUse', tipo: 'evento', erro: 'bloqueou', attrs: { 'pi.hook.exit_code': 2, 'pi.hook.stderr': 'primeira\nsegunda' } })
  const p = criaObs([sp], undefined, 20, 'eventos')
  p.handleInput('s'); p.handleInput('l')
  p.handleInput('\r')
  const s = p.render(80).join('\n')
  assert.ok(s.includes('erro: bloqueou') && s.includes('pi.hook.exit_code: 2') && s.includes('pi.hook.stderr: primeira') && s.includes('segunda'))
  assert.ok(!s.includes('s silenciar') && !s.includes('l limpar'))
})

test('aba eventos vazia e aba saúde antes do /doctor', () => {
  assert.ok(criaObs([], undefined, 16, 'eventos').render(80).join('\n').includes('Nenhum evento ainda'))
  for (const w of [100, 80, 40]) {
    const out = criaObs([], undefined, 16, 'saúde').render(w)
    assert.ok(out.join('\n').includes('rode /doctor'))
    for (const l of out) assert.ok(visibleWidth(l) <= w)
  }
})

test('aba saúde: achados com ✓ ▲ ✕, detalhe e correção, rola e cabe em 100/80/40', () => {
  const achados = [
    { id: 'a', estado: 'ok', titulo: 'node 22' },
    { id: 'b', estado: 'aviso', titulo: 'wrapper fora de uso', correcao: 'abra pelo ~/.local/bin/pi' },
    { id: 'c', estado: 'erro', titulo: 'sem credencial para p/m', detalhe: 'nada em auth.json', correcao: 'rode /login' },
  ]
  for (const w of [100, 80, 40]) {
    const p = criaObs(achados, achados as any, 16, 'saúde')
    const out = p.render(w)
    for (const l of out) assert.ok(visibleWidth(l) <= w, `largura ${w}`)
    const s = out.join('\n')
    assert.ok(s.includes('✕') && s.includes('▲') && s.includes('✓'))
    assert.ok(s.indexOf('sem credencial') < s.indexOf('wrapper') && s.indexOf('wrapper') < s.indexOf('node 22'))
    assert.ok(s.includes('rode /login'))
    assert.equal(out[1], L(' ✕ 1 erro · ▲ 1 aviso · ✓ 1 ok', w)) // resumo fixo na 1ª linha do corpo, na ordem da lista
    assert.ok(!out.slice(2).some((l) => /\d+ ok/.test(l)), 'sem resumo repetido no fim')
  }
  const longa = Array.from({ length: 30 }, (_, i) => ({ id: `i${i}`, estado: 'ok', titulo: `item ${i}` }))
  const p = criaObs(longa, longa as any, 8, 'saúde')
  assert.ok(p.render(80).length <= 8 && !p.render(80).join('\n').includes('item 29'))
  assert.equal(p.render(80)[1], L(' ✓ 30 verificações, nenhum problema', 80))
  for (let i = 0; i < 40; i++) p.handleInput('\x1b[B')
  const fim = p.render(80)
  assert.ok(fim.join('\n').includes('item 29') && fim.length <= 8)
  assert.equal(fim[1], L(' ✓ 30 verificações, nenhum problema', 80)) // continua fixo ao rolar
})

// --- revisão de UX das abas eventos/saúde (2026-11-14) ---
const PGDN = '\x1b[6~', PGUP = '\x1b[5~'
const DICA = /↑↓|enter |tab visão|esc fechar|pgup/
/** Itens das dicas na ordem: linhas do corpo que só têm dicas e a borda de baixo. */
const itensDica = (out: string[]) => [...miolo(out).filter((l) => DICA.test(l)).map((l) => l.trim()), out.at(-1)!.replace(/^╰─ /, '').replace(/ ─+╯$/, '')].flatMap((l) => l.split(' · '))

test('dicas na borda de baixo: inteiras em 100 e 80, quebram só entre itens em 40; `tab visão` nas visões', () => {
  const saude = ['↑↓ rolar', 'pgup pgdn página', 'tab visão', 'esc fechar']
  for (const w of [100, 80, 40]) {
    const out = criaObs([], [{ id: 'a', estado: 'ok', titulo: 'x' }], 16, 'saúde').render(w)
    assert.deepEqual(itensDica(out), saude, `itens em ${w}`)
    for (const l of out) assert.equal(visibleWidth(l), w)
  }
  assert.match(criaObs([], [], 16, 'saúde').render(100).at(-1)!, /^╰─ ↑↓ rolar · pgup pgdn página · tab visão · esc fechar ─+╯$/)
  assert.equal(criaObs([], [], 16, 'saúde').render(40).at(-2), L(' ↑↓ rolar · pgup pgdn página', 40))
  assert.match(criaObs([], [], 16, 'saúde').render(40).at(-1)!, /^╰─ tab visão · esc fechar ─+╯$/)
  const ev = criaObs([span()], undefined, 16, 'eventos')
  assert.deepEqual(itensDica(ev.render(100)), ['↑↓ escolher', 'enter detalhe', 'tab visão', 'esc fechar'])
  ev.handleInput(ENTER)
  assert.deepEqual(itensDica(ev.render(100)), ['↑↓ rolar', 'pgup pgdn página', 'enter fechar detalhe', 'esc fechar'])
})

test('rodapé por visão: trilha completa e /doctor verifica de novo', () => {
  const p = criaObs([span()], [{ id: 'a', estado: 'ok', titulo: 'x' }], 16, 'eventos')
  assert.equal(p.render(100).at(-2), L(' trilha completa: ~/y/traces.jsonl', 100))
  p.handleInput(TAB)
  assert.equal(p.aba, 'saúde')
  assert.equal(p.render(100).at(-2), L(' /doctor verifica de novo', 100))
  p.handleInput(TAB)
  assert.equal(p.aba, 'problemas')
  assert.ok(!p.render(100).join('\n').includes('completa'))
})

const T1 = new Date(2026, 10, 14, 9, 5, 0).getTime()
const sp = (id: string, nome: string, fimS: number, o: object = {}) => ({ traceId: 'a'.repeat(32), spanId: id, parentId: 'raiz', nome, tipo: 'span', inicio: T1, fim: T1 + fimS * 1000, durMs: fimS * 1000, attrs: {}, ...o })
const ev = (id: string, nome: string, fimS: number, attrs: object = {}, o: object = {}) => sp(id, nome, fimS, { tipo: 'evento', inicio: T1 + fimS * 1000, durMs: 0, attrs, ...o })
const hk = (id: string, evento: string, fimS: number, code: number, ms: number, o: object = {}) => ev(id, `pi.hook ${evento}`, fimS, { 'pi.hook.command': '/x/y/bash-guard.sh --modo z', 'pi.hook.exit_code': code, 'pi.hook.duration_ms': ms, 'pi.hook.timed_out': false }, o)
// mais novo primeiro, como `acoes.eventos()`
const TRILHA = [
  sp('A', 'invoke_agent pi', 50),
  sp('T', 'turn', 49, { parentId: 'A' }),
  hk('h3', 'Stop', 48, 0, 31),
  ev('s3', 'pi.hook Status', 47, { 'pi.hook.command': 'st', 'pi.hook.exit_code': 0, 'pi.hook.duration_ms': 2 }),
  sp('C', 'chat p/m', 46, { parentId: 'T', durMs: 900, erro: 'overloaded' }),
  sp('t3', 'execute_tool bash', 45, { parentId: 'T', durMs: 120 }),
  sp('t2', 'execute_tool bash', 44, { parentId: 'T', durMs: 80 }),
  ev('s2', 'pi.hook Status', 43, { 'pi.hook.command': 'st', 'pi.hook.exit_code': 0, 'pi.hook.duration_ms': 2 }),
  sp('t1', 'execute_tool bash', 42, { parentId: 'T', durMs: 70 }),
  sp('t0', 'execute_tool read', 41, { parentId: 'T', durMs: 5, erro: 'erro na ferramenta' }),
  hk('h2', 'PreToolUse', 40, 2, 9, { erro: 'PreToolUse · bash-guard.sh · bloqueou (2) · 9 ms' }),
  hk('h1', 'PreToolUse', 39, 1, 7, { erro: 'x' }),
  ev('s1', 'pi.hook Status', 38, { 'pi.hook.command': 'st', 'pi.hook.exit_code': 3, 'pi.hook.duration_ms': 2 }, { erro: 'x' }),
  ev('h0', 'pi.hook Stop', 37, { 'pi.hook.command': 'lento', 'pi.hook.timed_out': true, 'pi.hook.exit_code': 1, 'pi.hook.duration_ms': 5000 }, { erro: 'x' }),
  ev('i', 'input', 36, { 'pi.input.chars': 4 }),
  sp('P', 'execute_tool x', 35, { parentId: 'fora-da-lista', durMs: 1 }),
]
const corpoEventos = (out: string[]) => miolo(out).filter((l) => /\d\d:\d\d:\d\d/.test(l)).map((l) => l.replace(/^ ❯ |^ {3}/, '').trimEnd())

test('aba eventos: nomes de exibição, hora do fecho, recuo por profundidade, hooks pelos atributos, Status oculto e ×n', () => {
  const p = criaObs(TRILHA, undefined, 30, 'eventos')
  const out = p.render(100)
  assert.equal(out[1], L(' 16 eventos · 6 com erro · tokens 1200 entrada / 34 saída', 100))
  assert.deepEqual(corpoEventos(out), [
    '09:05:50  •  agente · 50000 ms',
    '09:05:49  •    turno · 49000 ms',
    '09:05:48  •  hook Stop · bash-guard.sh · ok · 31 ms',
    '09:05:46  ✕      chat p/m · 900 ms · overloaded',
    '09:05:45  •      tool bash · 120 ms  ×3', // t3, t2 e t1: o Status oculto no meio não separa
    '09:05:41  ✕      tool read · 5 ms · erro na ferramenta',
    '09:05:40  ✕  hook PreToolUse · bash-guard.sh · bloqueou (2) · 9 ms',
    '09:05:39  ✕  hook PreToolUse · bash-guard.sh · saiu 1 · 7 ms',
    '09:05:38  ✕  hook Status · st · saiu 3 · 2 ms', // Status com falha continua na lista
    '09:05:37  ✕  hook Stop · lento · timeout · 5000 ms',
    '09:05:36  •  entrada',
    '09:05:35  •  tool x · 1 ms', // pai fora da lista: nível 0
  ])
  const horas = corpoEventos(out).map((l) => l.slice(0, 8))
  assert.deepEqual(horas, [...horas].sort().reverse(), 'coluna de hora monotônica')
  assert.ok(!out.join('\n').includes('· 0 ms'))
  assert.equal(out.at(-2), L(' trilha completa: ~/y/traces.jsonl', 100))
})

test('aba eventos: recuo limitado a 3 níveis; 80 e 40 colunas cabem e mantêm a ordem', () => {
  const fundo = [sp('a', 'invoke_agent pi', 9), sp('b', 'turn', 8, { parentId: 'a' }), sp('c', 'execute_tool c', 7, { parentId: 'b' }), sp('d', 'execute_tool d', 6, { parentId: 'c' }), sp('e', 'execute_tool e', 5, { parentId: 'd' })]
  const linhas = corpoEventos(criaObs(fundo, undefined, 20, 'eventos').render(100))
  assert.deepEqual(linhas.map((l) => /•( +)/.exec(l)![1]!.length - 2), [0, 2, 4, 6, 6])
  for (const w of [80, 40]) {
    const out = criaObs(TRILHA, undefined, 30, 'eventos').render(w)
    for (const l of out) assert.ok(visibleWidth(l) <= w, `${w}: ${l}`)
    const c = corpoEventos(out)
    assert.equal(c.length, 12)
    assert.ok(c[1]!.includes('•    turno') && c[4]!.includes('•      tool bash') && c[2]!.includes('hook Stop · bash-g'))
    assert.ok(!out.join('\n').includes('Status · st · ok'))
  }
})

test('aba eventos: detalhe mantém o nome OTel na 1ª linha, sem `· 0 ms` em evento e com duração em span', () => {
  const p = criaObs(TRILHA, undefined, 30, 'eventos')
  p.handleInput(ENTER)
  assert.ok(p.render(100).join('\n').includes('│ invoke_agent pi · 09:05:50 · 50000 ms'))
  p.handleInput(ENTER); p.handleInput(DOWN); p.handleInput(DOWN); p.handleInput(ENTER)
  const s = p.render(100).join('\n')
  assert.ok(s.includes('│ pi.hook Stop · 09:05:48') && !/09:05:48 · \d+ ms/.test(s))
  assert.ok(s.includes('pi.hook.command: /x/y/bash-guard.sh --modo z'))
})

const ACHADOS = [
  { id: 'pi-doctor', estado: 'erro', titulo: 'pi-doctor: patch não reverte na árvore instalada: a.patch', correcao: 'rode ~/.pi/agent/claude-home/bin/doctor/pi-doctor para ver o motivo de cada um' },
  { id: 'pi-doctor', estado: 'erro', titulo: 'pi-doctor: patch não reverte na árvore instalada: b.patch', correcao: 'rode ~/.pi/agent/claude-home/bin/doctor/pi-doctor para ver o motivo de cada um' },
  { id: 'crashes', estado: 'aviso', titulo: '1 crash nas últimas 24 h', correcao: 'veja os erros no /diagnostico' },
  { id: 'v', estado: 'ok', titulo: 'pi 1.5.2 · pi-code 1.7.0 · node v24.0.0', detalhe: 'detalhe curto' },
]

test('aba saúde: resumo primeiro, bloco agrupado, recuos 3/4 na quebra em 100/80/40', () => {
  for (const w of [100, 80, 40]) {
    const out = criaObs([], ACHADOS as any, 30, 'saúde').render(w)
    for (const l of out) assert.ok(visibleWidth(l) <= w, `${w}: ${l}`)
    assert.equal(out[1], L(' ✕ 2 erros · ▲ 1 aviso · ✓ 1 ok', w))
    const dentro = miolo(out)
    const corpo = dentro.slice(1, dentro.findIndex((l) => l.includes('/doctor verifica de novo'))).map((l) => l.trimEnd())
    assert.equal(corpo[0], w === 40 ? ' ✕ pi-doctor: 2 patches não revertem' : ' ✕ pi-doctor: 2 patches não revertem na árvore instalada')
    if (w === 40) assert.equal(corpo[1], '   na árvore instalada') // continuação do título: 3 espaços
    assert.ok(corpo.includes('    a.patch') && corpo.includes('    b.patch'))
    assert.equal(corpo.filter((l) => l.includes('→')).length, 2) // uma correção por bloco
    const i = corpo.findIndex((l) => l.startsWith('    → rode'))
    assert.ok(i > 0)
    if (w === 100) assert.equal(corpo[i], '    → rode ~/.pi/agent/claude-home/bin/doctor/pi-doctor para ver o motivo de cada um')
    else assert.match(corpo[i + 1]!, /^ {4}\S/) // continuação da correção: 4 espaços
    for (const l of corpo) assert.ok((/^ [✕▲✓] /.test(l) || /^ {3}\S/.test(l) || /^ {4}\S/.test(l)), `recuo em ${w}: ${l}`)
    assert.ok(corpo.includes(' ▲ 1 crash nas últimas 24 h') && corpo.includes('    detalhe curto'))
    assert.ok(out.includes(L(' /doctor verifica de novo', w)))
    assert.ok(out.join('\n').includes('pi-doctor para ver o motivo de cada um') || w < 100)
  }
})

test('aba saúde: marcadores … linhas acima/abaixo e PgUp/PgDn com a página da aba', () => {
  const longa = Array.from({ length: 40 }, (_, i) => ({ id: `i${i}`, estado: 'ok', titulo: `item ${i}` }))
  for (const w of [100, 80, 40]) {
    const p = criaObs([], longa as any, 12, 'saúde')
    let o = p.render(w)
    assert.ok(o.length <= 12)
    assert.ok(o.some((l: string) => / … \d+ linhas abaixo/.test(l)) && !o.some((l: string) => l.includes('linhas acima')), `topo em ${w}`)
    const visiveis = o.filter((l: string) => /item \d+/.test(l)).length
    assert.ok(visiveis >= 3)
    p.handleInput(PGDN)
    o = p.render(w)
    assert.ok(o.some((l: string) => / … \d+ linhas acima/.test(l)) && o.some((l: string) => l.includes('linhas abaixo')), `meio em ${w}`)
    const primeiro = Number(/item (\d+)/.exec(o.find((l: string) => /item \d+/.test(l))!)![1])
    assert.ok(primeiro >= visiveis - 2 && primeiro <= visiveis, `PgDn anda uma página da aba (${primeiro} de ${visiveis}) em ${w}`)
    for (let i = 0; i < 30; i++) p.handleInput(PGDN)
    o = p.render(w)
    assert.ok(o.join('\n').includes('item 39') && !o.some((l: string) => l.includes('linhas abaixo')) && o.length <= 12)
    for (let i = 0; i < 30; i++) p.handleInput(PGUP)
    assert.ok(p.render(w).join('\n').includes('item 0'))
  }
})
