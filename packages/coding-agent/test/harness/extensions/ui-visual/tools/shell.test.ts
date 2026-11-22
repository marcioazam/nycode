// node --experimental-strip-types --test extensions/ui-visual/test/tools/shell.test.ts
// Variante 04 "Trilho de status" (dono, 2026-11-18): o bash inteiro é um cartão desenhado por renderCall (motion/shell.ts);
// renderResult só entrega a saída ao estado. Execução 5 (barra indeterminada) e transição C (dissolver) só são testadas
// no estado assentado: o laboratório de movimento mede a cadência; aqui nada depende de relógio ou de timer.
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { test } from 'node:test'
import { tmp, mod, theme, ansiPlain, plain, ctx, wrapped, result, visibleWidth, bgTheme, OPEN, icon, BGC as BGC_, reguaRun, semRespiro } from './base.ts'

delete process.env.NO_COLOR // anima() é falso com NO_COLOR; o teste da barra precisa dele ligado
const vivo = await import(join(tmp, 'motion', 'vivo.ts'))
const { definirFoco } = await import(join(tmp, 'motion', 'motion.ts'))
const shell = await import(join(tmp, 'motion', 'shell.ts'))
const { iconGap } = await import(join(tmp, 'icons.ts'))
// Régua Run (dono, 2026-11-18): antes `$ comando` e hora à direita; agora `<ícone> Run ─ comando ───── hora` e corpo/rodapé recuados até o `Run`.
// O prefixo vem de icon('bash') e iconGap() da cópia tmp (base.ts fixa o terminal), sem depender de TERM.
const G = iconGap()
const P = `▎ ${' '.repeat(1 + G.length)}` // corpo e rodapé: trilho + recuo até o `Run`
const regua = (cmd: string, hora = '', w = 80, estado = 'OK') => reguaRun(icon('bash'), G, cmd, hora, w, estado)

type Args = Record<string, unknown>
const T = new Date(2026, 10, 14, 9, 41, 30).getTime()
let n = 0
const id = () => `sh-${n++}`
const txt = (rows: string[]) => rows.map((l) => plain(l).trimEnd())
// Chamada + resultado com o mesmo contexto (como o pi faz): o cartão lê a saída de context.state no desenho.
const draw = (args: Args, texto?: string, c: Record<string, unknown> = {}, th: any = ansiPlain, w = 80) => {
  const w0 = wrapped('bash')
  const shared = ctx({ args, ...c })
  const call = w0.renderCall(args, th, shared)
  const res = texto === undefined ? undefined : w0.renderResult(result(texto), { expanded: c.expanded === true, isPartial: c.isPartial === true }, th, shared)
  return { call, res, shared, rows: call.render(w) }
}
const lines = (args: Args, texto?: string, c: Record<string, unknown> = {}) => txt(semRespiro(draw(args, texto, c).rows))
const nums = (k: number) => Array.from({ length: k }, (_, i) => `o${i}`).join('\n')

test('título: `Bash · OK · comando` (1ª linha; … se multilinha); `…` sem comando pronto', () => {
  // Marcas SGR de largura zero por token (as tags `<cor>` do `theme` contam como colunas no corte do título).
const CODS: Record<string, number> = { success: 32, warning: 33, error: 31, accent: 34, dim: 90, toolTitle: 97, muted: 37 }
const fgm = (c: string, t: string) => `\x1b[${CODS[c] ?? 39}m${t}\x1b[39m`
const marcas = { fg: fgm, bold: (t: string) => t }
// Título sem régua (dono, 2026-11-20): antes `Bash ─ ls -la ─────` e rodapé `OK`; agora o estado vem após o nome e o rodapé vazio some.
  assert.deepEqual(lines({ command: 'ls -la' }), [regua('ls -la')])
  assert.deepEqual(lines({ command: 'echo a\necho b' }), [regua('echo a…')])
  assert.deepEqual(lines({}), [regua('…')])
  // args ainda não prontos (streaming): `Run ─ …` com o … em muted
  const streaming = draw({ command: 'ls' }, undefined, { argsComplete: false, isPartial: true })
  assert.equal(txt(semRespiro(streaming.rows))[0], regua('…', '', 80, 'executando'))
  assert.ok(streaming.rows[1].includes('\x1b[2m…'))
})

test('hora: à direita do título só depois do fim', () => {
  const branch = [{ type: 'message', message: { role: 'toolResult', toolCallId: 'sh-hora', timestamp: T } }]
  const on: Record<string, any> = {}
  let resolver: any
  mod.default({ registerToolRenderer: (r: unknown) => (resolver = r), on: (e: string, h: unknown) => (on[e] = h) })
  on.session_start({}, { sessionManager: { getBranch: () => branch } })
  const w = resolver('bash', () => ({}))
  const t = (c: Record<string, unknown>) => txt(semRespiro(w.renderCall({ command: 'ls' }, ansiPlain, ctx({ args: { command: 'ls' }, toolCallId: 'sh-hora', ...c })).render(80)))
  const fim = t({})
  // (dono, 2026-11-20): antes a régua `─` preenchia até a hora; agora espaços, mesma coluna.
  assert.equal(fim[0], regua('ls', '09:41'))
  // (dono, 2026-11-18): antes 72 - 1 (cartão de no máximo 72); agora 80 - 1 (largura inteira, menos 1 de respiro)
  assert.equal([...fim[0]].length, 80 - 1, 'a hora fecha na borda direita do cartão (w, menos 1 de respiro; sem margem)')
  assert.equal(t({ isError: true })[0].slice(-5), '09:41', 'erro também mostra a hora')
  assert.doesNotMatch(t({ isPartial: true })[0], /\d\d:\d\d$/, 'rodando: sem hora')
  assert.doesNotMatch(t({ isPartial: true, executionStarted: false })[0], /\d\d:\d\d$/, 'preparando: sem hora')
})

// Título sem régua (dono, 2026-11-20): `<ícone> Bash · ESTADO · comando` + espaços + hora; estado colorido logo após o nome.
// Marcas SGR de largura zero por token (as tags `<cor>` do `theme` contam como colunas no corte do título).
const CODS: Record<string, number> = { success: 32, warning: 33, error: 31, accent: 34, dim: 90, toolTitle: 97, muted: 37 }
const fgm = (c: string, t: string) => `\x1b[${CODS[c] ?? 39}m${t}\x1b[39m`
const marcas = { fg: fgm, bold: (t: string) => t }
test('título: sem `─`, estado após o Bash na cor do token e separadores `·` dim', () => {
  const casos: Array<[string, Record<string, unknown>, string | undefined, string, string]> = [
    ['OK', {}, 'a', 'OK', 'success'],
    ['aviso', {}, 'warning: a', 'OK · 1 aviso', 'warning'],
    ['erro', { isError: true }, 'a\n\nCommand exited with code 2', 'Erro 2', 'error'],
    ['rodando', { isPartial: true }, undefined, 'executando', 'accent'],
    ['prep', { isPartial: true, executionStarted: false }, undefined, 'recebendo', 'dim'],
  ]
  for (const [nome, c, texto, est, token] of casos) {
    const bruto = draw({ command: 'ls' }, texto, c, marcas).rows[1]!
    const sem = plain(bruto)
    assert.doesNotMatch(sem.slice(2), /─/, `${nome}: sem régua no título`)
    assert.match(sem, new RegExp(`Bash · ${est} · ls`), nome)
    assert.ok(bruto.includes(fgm(token, est)), `${nome}: estado no token ${token}`)
    assert.ok(bruto.includes(fgm('dim', ' · ')), `${nome}: separador dim`)
    assert.ok(bruto.indexOf('Bash') < bruto.indexOf(est), `${nome}: estado depois do nome`)
  }
})

test('título: hora dim na mesma coluna de antes (w - 1) e sem régua; estreito corta o comando, nunca o estado', () => {
  const branch = [{ type: 'message', message: { role: 'toolResult', toolCallId: 'sh-tit', timestamp: T } }]
  const on: Record<string, any> = {}
  let resolver: any
  mod.default({ registerToolRenderer: (r: unknown) => (resolver = r), on: (e: string, h: unknown) => (on[e] = h) })
  on.session_start({}, { sessionManager: { getBranch: () => branch } })
  const w0 = resolver('bash', () => ({}))
  const tit = (cmd: string, w: number, th: any = ansiPlain) => semRespiro(w0.renderCall({ command: cmd }, th, ctx({ args: { command: cmd }, toolCallId: 'sh-tit' })).render(w), w)[0]!
  assert.equal(txt([tit('ls', 80)])[0], regua('ls', '09:41'))
  assert.equal([...txt([tit('ls', 80)])[0]].length, 79, 'hora termina na coluna w - 1')
  assert.ok(tit('ls', 80, marcas).includes(fgm('dim', '09:41')), 'hora dim')
  const longa = 'echo ' + 'x'.repeat(200)
  for (const w of [40, 50, 60]) {
    const t = plain(tit(longa, w))
    assert.equal(visibleWidth(t), w, `w=${w}`)
    assert.match(t, /Bash · OK · echo x+…/, `w=${w}: comando cortado com …, estado inteiro`)
    assert.match(t, / 09:41 $/, `w=${w}: hora preservada`)
  }
  const r = plain(draw({ command: longa }, 'a\n\nCommand exited with code 12', { isError: true }, ansiPlain, 22).rows[1]!)
  assert.match(r, /Bash · Erro 12 ·/, 'estado nunca cortado em 22 colunas')
})

test('prévia: 5 últimas linhas + `K acima` + `<tecla> abre`; expandido mostra tudo + fecha', () => {
  assert.deepEqual(lines({ command: 'x' }, nums(8)), [regua('x'), `${P}o3`, `${P}o4`, `${P}o5`, `${P}o6`, `${P}o7`, '▎', `${P}8 linhas · 3 acima · ctrl+o abre`])
  assert.deepEqual(lines({ command: 'x' }, nums(5)), [regua('x'), `${P}o0`, `${P}o1`, `${P}o2`, `${P}o3`, `${P}o4`, '▎', `${P}5 linhas`], '5 cabem: sem acima nem atalho')
  assert.deepEqual(lines({ command: 'x' }, 'só').slice(2), ['▎', `${P}1 linha`])
  const aberto = lines({ command: 'x' }, nums(8), { expanded: true })
  assert.deepEqual(aberto, [regua('x'), ...Array.from({ length: 8 }, (_, i) => `${P}o${i}`), '▎', `${P}8 linhas · ctrl+o fecha`])
  assert.equal(lines({ command: 'x' }, nums(3), { expanded: true }).at(-1), `${P}3 linhas`, 'expandido curto: sem atalho')
  // a tecla vem do pi (keyText)
  assert.equal(lines({ command: 'x' }, nums(8), { keyText: () => 'alt+o' }).at(-1), `${P}8 linhas · 3 acima · alt+o abre`)
})

test('estado no título e rodapé final: OK, OK · N avisos, Erro, Erro N, tempo esgotado, interrompido; duração antes das linhas', () => {
  // (dono, 2026-11-20): antes o estado abria o rodapé (`OK · 2 linhas`); agora fica no título e o rodapé traz só dur · linhas · acima · atalho · log.
  const rows = (texto: string, c: Record<string, unknown> = {}) => lines({ command: 'x' }, texto, c)
  const foot = (texto: string, c: Record<string, unknown> = {}) => { const r = rows(texto, c); return r.length === 1 ? '' : r.at(-1) }
  const est = (texto: string, c: Record<string, unknown> = {}) => rows(texto, c)[0]
  assert.equal(foot(''), '', 'sem rodapé: a linha some')
  assert.equal(est(''), regua('x'))
  assert.equal(foot('a\nb'), `${P}2 linhas`)
  assert.equal(est('warning: a\nok\nwarning: b'), regua('x', '', 80, 'OK · 2 avisos').replace(/ +$/, ''), 'aviso no título')
  assert.equal(foot('warning: a\nok\nwarning: b'), `${P}3 linhas`)
  assert.equal(est('aviso: a\nok'), regua('x', '', 80, 'OK · 1 aviso'))
  const err = (texto: string, estado: string) => { assert.equal(est(texto, { isError: true }), regua('x', '', 80, estado)); return foot(texto, { isError: true }) }
  assert.equal(err('falhou\n\nCommand exited with code 1', 'Erro'), `${P}1 linha`)
  assert.equal(err('falhou\n\nCommand exited with code 2', 'Erro 2'), `${P}1 linha`)
  assert.equal(err('a\n\nCommand timed out after 5 seconds', 'tempo esgotado'), `${P}1 linha`)
  assert.equal(err('a\n\nCommand aborted', 'interrompido'), `${P}1 linha`)
  assert.equal(err('só isso', 'Erro'), `${P}1 linha`, 'erro sem rodapé nativo')
  assert.equal(err('warning: a', 'Erro'), `${P}1 linha`, 'em erro, aviso não vira OK · avisos')
  assert.equal(foot('a', { durationMs: 65_000 }), `${P}1m 05s · 1 linha`)
  assert.equal(foot('a', { durationMs: 999 }), `${P}1 linha`)
  // `bash false`: o marcador nativo `(no output)` não é saída nem conta como linha
  assert.deepEqual(lines({ command: 'false' }, '(no output)\n\nCommand exited with code 1', { isError: true }), [regua('false', '', 80, 'Erro')])
  assert.deepEqual(lines({ command: 'true' }, '(no output)'), [regua('true')])
  assert.deepEqual(lines({ command: 'x' }, 'a\n(no output)'), [regua('x'), `${P}a`, '▎', `${P}1 linha`])
})

test('execução: recebendo o comando, executando, args.description, barra e tempo vivo', () => {
  // Régua Run (dono, 2026-11-18): antes `$ x` + `preparando o comando…`; agora o título mostra o comando parcial (muted + cursor) e o rodapé `recebendo o comando…`.
  // Preparando anima: o cursor `▏` pisca e a barra `━/─` abre o rodapé; saem do texto antes de comparar.
  // Barra que respira (dono, 2026-11-18, /cursor variante 3): antes o cursor do comando chegando era `▌`; agora `▏`.
  const prepara = (args: Args, c: Record<string, unknown> = {}) => lines(args, undefined, { isPartial: true, executionStarted: false, ...c })
    .map((l) => l.replace('▏', ' ').replace(/^(▎ +)[━─]{10} /, '$1').trimEnd())
  // o espaço final do comando esperado é a célula do cursor
  assert.deepEqual(prepara({}), [regua(' ', '', 80, 'recebendo'), `${P}recebendo o comando…`])
  // Args prontos antes do início: o comando completo fica no título (antes o título ficava vazio até a execução começar).
  assert.deepEqual(prepara({ command: 'x' }), [regua('x ', '', 80, 'recebendo'), `${P}recebendo o comando · 1 caractere`], 'args prontos: comando completo no título')
  // args.command parcial (args ainda não prontos): o comando entra no título e o tamanho no rodapé
  assert.deepEqual(prepara({ command: 'pnpm te' }, { argsComplete: false }), [regua('pnpm te ', '', 80, 'recebendo'), `${P}recebendo o comando · 7 caracteres`])
  assert.equal(prepara({ command: 'p' }, { argsComplete: false }).at(-1), `${P}recebendo o comando · 1 caractere`)
  assert.equal(prepara({ command: 'ação' }, { argsComplete: false }).at(-1), `${P}recebendo o comando · 4 caracteres`, 'conta caracteres, não bytes')
  assert.deepEqual(lines({ command: 'x' }, undefined, { isPartial: true }), [regua('x', '', 80, 'executando'), `${P}executando`])
  assert.deepEqual(lines({ command: 'x', description: '  Rodando os testes ' }, undefined, { isPartial: true }), [regua('x', '', 80, 'executando'), `${P}Rodando os testes`])
  assert.deepEqual(lines({ command: 'x', description: '   ' }, undefined, { isPartial: true }), [regua('x', '', 80, 'executando'), `${P}executando`], 'descrição vazia')
  // saída parcial entra na prévia e no contador
  assert.deepEqual(lines({ command: 'x' }, 'a\nb', { isPartial: true }), [regua('x', '', 80, 'executando'), `${P}a`, `${P}b`, '▎', `${P}executando · 2 linhas`])
  // Chamada que o pi iniciou (tool_execution_start): barra `━/─` e tempo vivo a partir de 2 s. Sem `invalidate` nenhum timer é armado.
  const vivoId = id()
  // Relógio falso (dono, 2026-11-19): antes usava o performance.now() real, e em 1 de cada 13 leituras a barra cai na posição 0,
  // sem trecho aceso, o que deixava o teste instável. Em 109 550 ms a posição é 5, seja no passo de 70 ms ou no de 1 s.
  const realNow = performance.now
  performance.now = () => 109_550
  vivo.iniciou(vivoId, 109_550 - 14_500)
  try {
    const run = lines({ command: 'sleep 20' }, 'a', { isPartial: true, toolCallId: vivoId })
    assert.match(run.at(-1)!, new RegExp(`^▎ ${' '.repeat(1 + G.length)}[━─]{10} executando · 14s · 1 linha$`))
    assert.ok(run.at(-1)!.includes('━'), 'trecho aceso da barra')
    const curto = id()
    vivo.iniciou(curto)
    assert.equal(lines({ command: 'x' }, undefined, { isPartial: true, toolCallId: curto }).at(-1)!.replace(/[━─]{10} /, ''), `${P}executando`, 'abaixo de 2 s: sem tempo')
  } finally {
    performance.now = realNow
    vivo.terminou(vivoId)
  }
})

test('bash-clamp: total e log do rodapé da extensão; o aviso não entra no corpo', () => {
  const foot = '[Output clamped: showing 100 of 400 lines. Full output: /tmp/c.log — read({ path: "/tmp/c.log", offset: 51, limit: 250 }) for the largest omitted span]'
  const out = Array.from({ length: 100 }, (_, i) => `linha ${i}`).join('\n')
  const ok = lines({ command: 'seq' }, `${out}\n\n${foot}`)
  assert.deepEqual(ok.slice(0, 6), [regua('seq'), `${P}linha 95`, `${P}linha 96`, `${P}linha 97`, `${P}linha 98`, `${P}linha 99`])
  assert.equal(ok.length, 8)
  assert.equal(ok[6], '▎')
  assert.equal(ok[7], `${P}400 linhas · 395 acima · ctrl+o abre · log /tmp/c.log`)
  assert.ok(ok.every((l) => !l.includes('Output clamped')))
  const erro = lines({ command: 'seq' }, `${out}\n\n${foot}\n\nCommand exited with code 1`, { isError: true })
  assert.equal(erro.at(-1), `${P}400 linhas · 395 acima · ctrl+o abre · log /tmp/c.log`)
  // caminho longo: o rodapé corta com … dentro do cartão
  const longo = foot.replaceAll('/tmp/c.log', '/tmp/pi-bash-clamp/' + 'd'.repeat(80) + '.log')
  const cortado = lines({ command: 'seq' }, `${out}\n\n${longo}`).at(-1)!
  // (dono, 2026-11-18): antes o cartão tinha no máximo 72 colunas; agora a largura inteira (w = 80)
  assert.ok(cortado.endsWith('…') && [...cortado].length <= 80, cortado)
})

test('trilho ▎ na cor do estado em toda linha do cartão', () => {
  const cor = (c: Record<string, unknown>, texto?: string) => draw({ command: 'x' }, texto, c, theme).rows
  const todas = (rows: string[], token: string) => rows.every((l) => l.startsWith(`<${token}>▎</c> `))
  assert.ok(todas(cor({}, 'a'), 'success'))
  assert.ok(todas(cor({}, 'warning: a'), 'warning'))
  assert.ok(todas(cor({ isError: true }, 'a\n\nCommand exited with code 1'), 'error'))
  assert.ok(todas(cor({ isPartial: true }), 'accent'))
  assert.ok(todas(cor({ isPartial: true, executionStarted: false }), 'dim'))
  // (dono, 2026-11-18): antes 8 linhas; agora 10 (título, 5 de prévia, vazia, rodapé + 2 linhas de respiro com trilho)
  assert.ok(cor({}, nums(8)).length === 10 && todas(cor({}, nums(8)), 'success'))
})

// (dono, 2026-11-18): antes o cartão tinha no máximo 72 colunas (min(72, w)); agora tem exatamente w, sem teto
test('largura: nenhuma linha passa de w; o cartão tem exatamente w e começa na coluna 0 (sem margem, dono 2026-11-18; antes margem 2 e teto de 72)', () => {
  const longa = 'echo ' + 'x'.repeat(300)
  const estados: Array<[string, Record<string, unknown>, string | undefined]> = [
    ['ok', { durationMs: 65_000 }, `${nums(8)}\n${longa}`],
    ['aviso', {}, `warning: ${longa}`],
    ['erro', { isError: true }, `${longa}\n\nCommand exited with code 12`],
    ['rodando', { isPartial: true }, longa],
    ['prep', { isPartial: true, executionStarted: false }, undefined],
  ]
  for (const w of [20, 60, 200]) {
    const esperado = w
    for (const [nome, c, texto] of estados) {
      for (const comando of ['x', longa]) {
        const rows = draw({ command: comando, description: longa }, texto, { expanded: nome === 'ok', ...c }, ansiPlain, w).rows.map(plain)
        assert.ok(rows.length >= 2, `${nome} w=${w}`)
        for (const l of rows) {
          assert.ok(visibleWidth(l) <= w, `${nome} w=${w}: ${visibleWidth(l)}`)
          assert.equal(visibleWidth(l), esperado, `${nome} w=${w}: cartão preenchido até a largura`)
        }
      }
    }
  }
})

test('largura: sem teto de 72; o cartão tem exatamente w em w = 120 e w = 200', () => {
  // (dono, 2026-11-18): antes min(72, w); agora a largura inteira.
  for (const w of [120, 200]) {
    for (const [c, texto] of [[{}, nums(8)], [{ isError: true }, 'a\n\nCommand exited with code 1'], [{ isPartial: true }, 'a']] as const) {
      const rows = draw({ command: 'x' }, texto, c, ansiPlain, w).rows.map(plain)
      assert.ok(rows.length >= 3)
      for (const l of rows) assert.equal(visibleWidth(l), w, `w=${w}`)
    }
    // (dono, 2026-11-20): antes o título ia até w - 1 pela régua `─`; agora termina no texto (sem hora aqui) e o cartão segue com w colunas.
    assert.equal(txt(semRespiro(draw({ command: 'x' }, '', {}, ansiPlain, w).rows, w))[0], regua('x', '', w), `título sem régua, w=${w}`)
  }
})

test('respiro: uma linha vazia com trilho e fundo em cima e embaixo do cartão', () => {
  // (dono, 2026-11-18): antes o cartão começava no título e acabava no rodapé; agora há uma linha de respiro em cada ponta.
  for (const w of [80, 120]) {
    for (const [c, texto, bg] of [[{}, nums(8), 'customMessageBg'], [{}, undefined, 'customMessageBg'], [{ isError: true }, 'a\n\nCommand exited with code 1', 'toolErrorBg']] as const) {
      const rows = draw({ command: 'x' }, texto, c, bgTheme, w).rows
      for (const l of [rows[0]!, rows.at(-1)!]) {
        assert.match(plain(l), /^▎ +$/, `trilho + espaços, w=${w}`)
        assert.equal(visibleWidth(plain(l)), w, `largura w=${w}`)
        assert.ok(l.includes(`\x1b[48;5;${BGC_[bg]}m`), `fundo ${bg}`)
        assert.ok(bgPerChar(l).every((b) => b === `5;${BGC_[bg]}`), 'fundo em toda coluna')
      }
      assert.match(plain(rows[1]!), /Bash · /, // antes `Bash ─` (dono, 2026-11-20) e `Run ─` (2026-11-19)
      'o título vem logo depois do respiro')
    }
  }
})

// Modelo de terminal: fundo ativo em cada caractere visível (48;5;N ou 48;2;r;g;b), null quando sem fundo.
const bgPerChar = (line: string): Array<string | null> => {
  let bg: string | null = null
  const out: Array<string | null> = []
  for (const part of line.split(/(\x1b\[[0-9;]*m)/)) {
    const m = /^\x1b\[([0-9;]*)m$/.exec(part)
    if (!m) { for (const _ of part) out.push(bg); continue }
    const c = m[1] === '' ? ['0'] : m[1].split(';')
    for (let i = 0; i < c.length; i++) {
      if (c[i] === '0' || c[i] === '49') bg = null
      else if (c[i] === '48') { bg = c.slice(i + 1, i + (c[i + 1] === '5' ? 3 : 5)).join(';'); i += c[i + 1] === '5' ? 2 : 4 }
      else if (c[i] === '38') i += c[i + 1] === '5' ? 2 : 4
    }
  }
  return out
}

test('fundo: customMessageBg (erro: toolErrorBg) em toda coluna do cartão, também depois do corte', () => {
  const longa = 'y'.repeat(300)
  const fundos = (rows: string[]) => new Set(rows.flatMap((l) => bgPerChar(l))) // sem margem: toda coluna é do cartão
  const ok = draw({ command: longa }, `${longa}\n${nums(7)}`, {}, bgTheme).rows
  const err = draw({ command: longa }, `${longa}\n\nCommand exited with code 1`, { isError: true }, bgTheme).rows
  for (const rows of [ok, err]) {
    assert.ok(rows.every((l: string) => bgPerChar(l)[0] !== null), 'sem margem: a 1ª coluna já tem o fundo do cartão')
    assert.equal(fundos(rows).size, 1, 'um único fundo, sem buraco nem null')
    assert.ok(!fundos(rows).has(null))
  }
  assert.ok(plain(ok[1]).includes('…'), 'título cortado') // (dono, 2026-11-18): antes ok[0]; agora ok[0] é o respiro
  assert.notDeepEqual([...fundos(ok)], [...fundos(err)], 'erro usa outro fundo')
  assert.ok(ok.every((l: string) => l.includes(OPEN('customMessageBg')) || l.includes('\x1b[48;2;')))
  // corte estreito (w = 20) e largura exata
  for (const w of [20, 60]) {
    const rows = draw({ command: longa }, longa, {}, bgTheme, w).rows
    assert.ok(rows.every((l: string) => bgPerChar(l).slice(2).every((b) => b !== null) && visibleWidth(plain(l)) <= w), `w=${w}`)
  }
})

test('renderResult do bash devolve 0 linhas e grava a saída em state.uiShell', () => {
  const w0 = wrapped('bash')
  for (const [o, c] of [[{}, {}], [{ expanded: true }, {}], [{ isPartial: true }, {}], [{}, { isError: true }]] as const) {
    const shared = ctx({ args: { command: 'x' }, ...c })
    const res = w0.renderResult(result('a\nb\n\nCommand exited with code 2'), { expanded: false, isPartial: false, ...o }, ansiPlain, shared)
    assert.deepEqual(res.render(80), [])
    assert.deepEqual(shared.state.uiShell.linhas, ['a', 'b'])
    assert.equal(shared.state.uiShell.estado, 'isError' in c && !('isPartial' in o) ? 'Erro 2' : undefined)
  }
  // sem state (pi antigo): não quebra
  assert.deepEqual(w0.renderResult(result('a'), { expanded: false, isPartial: false }, ansiPlain, ctx({ state: undefined })).render(80), [])
})

test('saidaShell: separa linhas, total, log, estado e avisos', () => {
  const { saidaShell } = shell
  assert.deepEqual(saidaShell('a\n\n(no output)\nb  \n', false), { linhas: ['a', 'b'], total: 2, log: undefined, estado: undefined, avisos: 0 })
  assert.deepEqual(saidaShell('warning: x\nWarning: y\nfine', false).avisos, 2)
  const e = saidaShell('x\n\nCommand exited with code 7', true)
  assert.deepEqual([e.linhas, e.estado, e.avisos], [['x'], 'Erro 7', 0])
  const c = saidaShell('x\n[Output clamped: showing 1 of 9 lines. Full output: /t/a b.log]', false)
  assert.deepEqual([c.linhas, c.total, c.log], [['x'], 9, '/t/a b.log'])
})

test('cache: chamada terminada fora do dissolver devolve a mesma saída sem redesenhar', () => {
  const th = { chamadas: 0, fg: (_c: string, x: string) => (th.chamadas++, x), bold: ansiPlain.bold }
  const shared = ctx({ args: { command: 'x' }, toolCallId: id(), durationMs: 2000 })
  const w0 = wrapped('bash')
  const call = w0.renderCall({ command: 'x' }, th, shared)
  w0.renderResult(result(nums(8)), { expanded: false, isPartial: false }, th, shared)
  const a = call.render(80)
  const feito = th.chamadas
  assert.ok(feito > 0)
  for (let i = 0; i < 5; i++) assert.deepEqual(call.render(80), a)
  assert.equal(th.chamadas, feito, 'tema não é chamado de novo')
  call.render(60)
  assert.ok(th.chamadas > feito, 'outra largura recalcula')
  let k = th.chamadas
  call.render(60)
  assert.equal(th.chamadas, k)
  // saída nova (mesmo componente) recalcula; invalidate recalcula; erro recalcula
  w0.renderResult(result(nums(3)), { expanded: false, isPartial: false }, th, shared)
  assert.notDeepEqual(txt(call.render(60)), txt(a))
  k = th.chamadas
  call.invalidate()
  call.render(60)
  assert.ok(th.chamadas > k, 'invalidate recalcula')
  k = th.chamadas
  shared.isError = true
  call.render(60)
  assert.ok(th.chamadas > k, 'virar erro recalcula')
  // em execução recalcula a cada quadro
  const run = wrapped('bash').renderCall({ command: 'x' }, th, ctx({ args: { command: 'x' }, isPartial: true }))
  run.render(80)
  k = th.chamadas
  run.render(80)
  assert.ok(th.chamadas > k, 'rodando: sem cache')
})

test('dissolver: dentro dos 600 ms o texto já é o final; depois do fim da janela a saída assenta e volta ao cache', async () => {
  // Só o texto: as cores (trilho accent→final, fundo, estado dim→final) dependem de truecolor e do relógio e ficam fora do teste.
  const dissolve = id()
  const th = { chamadas: 0, fg: (_c: string, x: string) => (th.chamadas++, x), bold: ansiPlain.bold }
  const shared = ctx({ args: { command: 'x' }, toolCallId: dissolve })
  const w0 = wrapped('bash')
  const call = w0.renderCall({ command: 'x' }, th, shared)
  w0.renderResult(result(nums(2)), { expanded: false, isPartial: false }, th, shared)
  const assentado = txt(call.render(80))
  vivo.terminou(dissolve, performance.now()) // janela de 600 ms aberta agora
  assert.deepEqual(txt(call.render(80)), assentado, 'o texto não muda durante o dissolver')
  vivo.terminou(dissolve, performance.now() - 700) // janela já fechada
  call.invalidate()
  call.render(80)
  const k = th.chamadas
  call.render(80)
  assert.equal(th.chamadas, k, 'assentado: de volta ao cache')
})

test('dissolver em truecolor: no meio da janela o fundo do sucesso brilha na cor do desfecho e o resto do rodapé nasce do fundo', () => {
  // Pedido do dono (2026-11-18): no sucesso o fundo inicial e o final são iguais; sem o brilho, a transição não aparecia.
  const RGB: Record<string, string> = { customMessageBg: '30;30;40', toolErrorBg: '60;20;20', accent: '100;150;250', dim: '120;120;130', success: '80;200;100' }
  const tc = {
    fg: (_c: string, x: string) => x, bold: (x: string) => x,
    getBgAnsi: (c: string) => `\x1b[48;2;${RGB[c] ?? '0;0;0'}m`, getFgAnsi: (c: string) => `\x1b[38;2;${RGB[c] ?? '0;0;0'}m`,
  }
  const desenho = (idade: number | undefined) => {
    const cid = id()
    const shared = ctx({ args: { command: 'x' }, toolCallId: cid })
    const w0 = wrapped('bash')
    const call = w0.renderCall({ command: 'x' }, tc, shared)
    w0.renderResult(result('a\nb'), { expanded: false, isPartial: false }, tc, shared)
    if (idade !== undefined) vivo.terminou(cid, performance.now() - idade)
    return call.render(80)
  }
  const fundos = (rows: string[]) => new Set(rows.flatMap((l) => l.match(/48;2;\d+;\d+;\d+/g) ?? []))
  const assentado = desenho(undefined), meio = desenho(300)
  assert.deepEqual([...fundos(assentado)], ['48;2;30;30;40'])
  const [fm] = [...fundos(meio)]
  assert.equal(fundos(meio).size, 1, 'um fundo só no quadro')
  assert.notEqual(fm, '48;2;30;30;40', 'no meio do dissolver o fundo brilha')
  const [, r, g] = fm!.split(';').slice(1).map(Number)
  assert.ok(g! > r!, `o brilho puxa para o verde do sucesso: ${fm}`)
  const rodape = meio.at(-1)!
  assert.ok(!rodape.includes('38;2;120;120;130m · '), 'o resto do rodapé ainda não está no dim final')
  assert.ok(assentado.at(-1)!.includes('38;2;120;120;130') || !assentado.at(-1)!.includes('38;2;'), 'assentado volta ao tema')
  assert.deepEqual(txt(meio), txt(assentado), 'o texto é o mesmo; só a cor muda')
})

test('toda troca de estado dissolve: preparando → executando, e executando → OK, OK · avisos e Erro', () => {
  // Pedido do dono (2026-11-18): todos os status têm transição. No meio da janela o fundo e o trilho estão entre os dois estados.
  const RGB: Record<string, string> = { customMessageBg: '30;30;40', toolErrorBg: '60;20;20', accent: '100;150;250', dim: '120;120;130', success: '80;200;100', warning: '230;190;60', error: '230;70;70' }
  const tc = {
    fg: (_c: string, x: string) => x, bold: (x: string) => x,
    getBgAnsi: (c: string) => `\x1b[48;2;${RGB[c] ?? '0;0;0'}m`, getFgAnsi: (c: string) => `\x1b[38;2;${RGB[c] ?? '0;0;0'}m`,
  }
  const casos: Array<[string, Record<string, unknown>, string | undefined, (cid: string, idade: number) => void]> = [
    ['executando', { isPartial: true }, 'a', (cid, idade) => vivo.iniciou(cid, performance.now() - idade)],
    ['OK', {}, 'a', (cid, idade) => vivo.terminou(cid, performance.now() - idade)],
    ['aviso', {}, 'warning: a', (cid, idade) => vivo.terminou(cid, performance.now() - idade)],
    ['erro', { isError: true }, 'a\n\nCommand exited with code 1', (cid, idade) => vivo.terminou(cid, performance.now() - idade)],
  ]
  const fundo = (l: string) => /48;2;(\d+;\d+;\d+)/.exec(l)?.[1]
  const trilho = (l: string) => /38;2;(\d+;\d+;\d+)m▎/.exec(l)?.[1]
  for (const [nome, c, texto, marca] of casos) {
    const desenho = (idade: number) => {
      const cid = id()
      const shared = ctx({ args: { command: 'x' }, toolCallId: cid, ...c })
      const w0 = wrapped('bash')
      const call = w0.renderCall({ command: 'x' }, tc, shared)
      w0.renderResult(result(texto ?? ''), { expanded: false, isPartial: c.isPartial === true }, tc, shared)
      marca(cid, idade)
      const rows = call.render(80)
      if (nome === 'executando') vivo.terminou(cid) // solta o relógio
      return rows
    }
    const meio = desenho(300), fim = desenho(5000)
    assert.notEqual(fundo(meio[0]!), fundo(fim[0]!), `${nome}: o fundo muda no meio da transição`)
    assert.ok(trilho(meio[0]!), `${nome}: trilho em cor interpolada`)
    assert.notEqual(trilho(meio[0]!), RGB[{ executando: 'accent', OK: 'success', aviso: 'warning', erro: 'error' }[nome]!], `${nome}: o trilho ainda não chegou à cor final`)
  }
})

test('sem foco: a barra e o cursor continuam no cartão (1 passo por segundo), em preparando e em executando', () => {
  // Dono, 2026-11-18: antes, sem foco, a barra e o cursor sumiam e `recebendo o comando` parecia travado; agora ficam e andam devagar.
  definirFoco(false)
  const rid = id()
  vivo.iniciou(rid)
  try {
    const prep = lines({ command: 'pnpm te' }, undefined, { isPartial: true, executionStarted: false, argsComplete: false })
    assert.match(prep.at(-1)!, /^▎ +[━─]{10} recebendo o comando · 7 caracteres$/)
    // Barra que respira (dono, 2026-11-18, /cursor variante 3): antes o cursor do comando chegando era `▌`; agora `▏`.
    assert.ok(prep[0]!.includes('pnpm te▏'), 'cursor fixo sem foco')
    assert.match(lines({ command: 'x' }, undefined, { isPartial: true, toolCallId: rid }).at(-1)!, /^▎ +[━─]{10} executando$/)
    // Movimento reduzido também mantém a barra (1 passo por segundo); só `desligado` a tira.
    definirFoco(undefined)
    process.env.PI_REDUCED_MOTION = '1'
    assert.match(lines({ command: 'x' }, undefined, { isPartial: true, toolCallId: rid }).at(-1)!, /^▎ +[━─]{10} executando$/, 'reduzido')
    delete process.env.PI_REDUCED_MOTION
    process.env.NO_PROGRESS = '1'
    assert.match(lines({ command: 'x' }, undefined, { isPartial: true, toolCallId: rid }).at(-1)!, /^▎ +executando$/, 'desligado: sem barra')
  } finally {
    delete process.env.PI_REDUCED_MOTION
    delete process.env.NO_PROGRESS
    vivo.terminou(rid)
    definirFoco(undefined)
  }
})

test('tinta longa no comando chegando: letras novas nascem do fundo, as antigas secam no muted; o cursor respira', async () => {
  // Tinta longa (/refino escrita 1, dono, 2026-11-18): antes o comando parcial vinha inteiro em muted e o cursor piscava a cada
  // 400 ms (aceso ou apagado); agora cada letra ganha a cor em TINTA_MS e o cursor muda de intensidade aos poucos.
  const RGB: Record<string, string> = { customMessageBg: '30;30;40', accent: '100;150;250', dim: '120;120;130', muted: '160;160;170' }
  const tc = {
    fg: (_c: string, x: string) => x, bold: (x: string) => x,
    getBgAnsi: (c: string) => `\x1b[48;2;${RGB[c] ?? '0;0;0'}m`, getFgAnsi: (c: string) => `\x1b[38;2;${RGB[c] ?? '0;0;0'}m`,
  }
  const args: Args = { command: 'ab' }
  const shared = ctx({ args, toolCallId: id(), isPartial: true, executionStarted: false, argsComplete: false })
  const w0 = wrapped('bash')
  // Como o pi: a cada args novo o renderCall é chamado de novo, com o mesmo context.state.
  const titulo = () => w0.renderCall(args, tc, shared).render(80)[1] as string
  const corDe = (l: string, ch: string) => new RegExp(`38;2;(\\d+);(\\d+);(\\d+)m${ch}`).exec(l)?.slice(1).map(Number)
  const cedo = titulo()
  assert.ok(corDe(cedo, 'a')![0]! < 100, `letra recém-chegada ainda perto do fundo: ${corDe(cedo, 'a')}`)
  await new Promise((r) => setTimeout(r, 400))
  args.command = 'abcd'
  const depois = titulo()
  assert.deepEqual(corDe(depois, 'a'), undefined, 'a letra antiga secou: volta à cor do tema (muted)')
  assert.ok(corDe(depois, 'd')![0]! < 100, 'a letra nova nasce do fundo')
  const cursores = new Set<string>()
  for (let i = 0; i < 6; i++) { cursores.add(/38;2;(\d+;\d+;\d+)m▏/.exec(titulo())?.[1] ?? '-'); await new Promise((r) => setTimeout(r, 60)) }
  assert.ok(cursores.size >= 3 && !cursores.has('-'), `cursor respira em vários tons, sem apagar: ${[...cursores]}`)
})

test('barra que respira: ao começar a executar, a barra do comando escorrega e some em SAI_MS', async () => {
  // Barra que respira (dono, 2026-11-18, /cursor variante 3): antes o cursor sumia de uma vez ao executar.
  const RGB: Record<string, string> = { customMessageBg: '30;30;40', accent: '100;150;250', dim: '120;120;130', muted: '160;160;170' }
  const tc = {
    fg: (_c: string, x: string) => x, bold: (x: string) => x,
    getBgAnsi: (c: string) => `\x1b[48;2;${RGB[c] ?? '0;0;0'}m`, getFgAnsi: (c: string) => `\x1b[38;2;${RGB[c] ?? '0;0;0'}m`,
  }
  const cid = id(), args: Args = { command: 'ls' }
  const shared = ctx({ args, toolCallId: cid, isPartial: true, executionStarted: true })
  vivo.iniciou(cid)
  const titulo = () => wrapped('bash').renderCall(args, tc, shared).render(80)[1] as string
  assert.match(titulo(), /ls\x1b\[[0-9;]*m*.*▏/, 'logo ao executar: a barra ainda está lá')
  await new Promise((r) => setTimeout(r, 500))
  assert.ok(!titulo().includes('▏'), 'depois de SAI_MS: sumiu')
  vivo.terminou(cid)
})
