// node --experimental-strip-types --test extensions/diagnostico/test/obs/correlacao.test.ts
// Correlação registro ↔ trilha (trace_id/span_id), /diagnostico trace, /doctor sem limpar a faixa e detectores de ponta a ponta.
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { carregar } from '../carregar.ts'

const m = await carregar('diagnostico/index.ts')
const { lerCaixa } = await carregar('diagnostico/registro.ts')
const SINK = Symbol.for('pi-harness:diag')
const theme = { fg: (_c: string, s: string) => s, bg: (_c: string, s: string) => s, bold: (s: string) => s }

function cria(env: Record<string, string> = {}, hasUI = true) {
  const d = mkdtempSync(join(tmpdir(), 'diag-cor-'))
  const handlers = new Map<string, (...a: any[]) => any>()
  const comandos = new Map<string, any>()
  const barramento = new Map<string, (...a: any[]) => any>()
  const pi: any = { on: (n: string, h: any) => handlers.set(n, h), registerCommand: (n: string, c: any) => comandos.set(n, c), registerShortcut() {}, events: { on: (n: string, h: any) => barramento.set(n, h) } }
  const widgets: any[] = []
  const status: any[] = []
  const notices: Array<[string, string]> = []
  const ui: any = {
    theme,
    notify: (msg: string, tipo: string) => notices.push([msg, tipo]),
    setStatus: (_k: string, v: any) => status.push(v),
    setWidget: (_k: string, v: any) => widgets.push(v),
    custom: async (f: any) => { ui.painel = f({ requestRender() {} }, theme, null, () => {}) },
  }
  const rt: any = { streamSimple: (...a: any[]) => rt.proximo(...a), stream: (...a: any[]) => rt.proximo(...a), proximo: (): any => ({ result: () => Promise.resolve({ stopReason: 'stop' }) }) }
  const ctx: any = { hasUI, ui, model: { provider: 'p', id: 'm' }, sessionManager: { getSessionId: () => 'sess-1' }, modelRegistry: { runtime: rt, hasConfiguredAuth: () => true } }
  let t = Date.parse('2026-11-14T12:00:00Z')
  type Vigia = { f: () => void; ms: number; ativo: boolean; unrefs: number; unref(): void }
  const timers: Vigia[] = []
  const timer = {
    setInterval: (f: () => void, ms: number) => { const h: Vigia = { f, ms, ativo: true, unrefs: 0, unref() { h.unrefs++ } }; timers.push(h); return h },
    clearInterval: (h: any) => { if (h) h.ativo = false },
  }
  m.montar(pi, { env, agora: () => t, dir: join(d, 'diag'), console: { warn() {}, error() {} }, processo: { on() {}, off() {} }, crashes: join(d, 'crashes.json'), colunas: () => 100, exec: async () => ({ code: 0, stdout: 'OK\n', stderr: '' }), timer })
  const h = (n: string, ...a: any[]) => handlers.get(n)!(...a)
  const ler = (f: string) => (existsSync(join(d, 'diag', f)) ? readFileSync(join(d, 'diag', f), 'utf8').trim().split('\n').map((l) => JSON.parse(l)) : [])
  const traces = () => ler('traces.jsonl').flatMap((l: any) => l.resourceSpans.flatMap((r: any) => r.scopeSpans.flatMap((s: any) => s.spans)))
  return { d, env, h, emit: (canal: string, dados: unknown) => barramento.get(canal)?.(dados), ler, comandos, ui, ctx, rt, notices, widgets, status, timers, traces, log: () => ler('diag.jsonl'), avanca: (ms: number) => (t += ms), start: () => h('session_start', {}, ctx), fim: () => h('session_shutdown', {}) }
}
const tick = () => new Promise((r) => setImmediate(r))
const sink = (x: object) => (globalThis as any)[SINK](x)
const toolErro = (t: ReturnType<typeof cria>, id: string, nome = 'bash') => {
  t.h('tool_execution_start', { toolCallId: id, toolName: nome })
  t.h('tool_execution_end', { toolCallId: id, toolName: nome, isError: true, result: { content: [{ type: 'text', text: `falhou ${id}` }] } })
}
const detector = (t: ReturnType<typeof cria>) => t.log().filter((x: any) => x.source === 'detector').map((x: any) => [x['error.type'], x.severityNumber, x.body])

test('diag.jsonl leva trace_id e span_id do span ativo: raiz, turno, tool, chamada de modelo e hook', async () => {
  const t = cria()
  t.start()
  t.ui.notify('antes do agente', 'warning') // sem turno: raiz
  t.h('agent_start', {})
  t.h('turn_start', { turnIndex: 0 })
  t.ui.notify('no turno', 'warning')
  t.h('tool_execution_start', { toolCallId: 'c1', toolName: 'bash' })
  t.ui.notify('durante a tool', 'warning')
  t.h('tool_execution_end', { toolCallId: 'c1', toolName: 'bash', isError: true, result: { content: [{ type: 'text', text: 'tool falhou' }] } })
  t.rt.proximo = () => ({ result: () => Promise.reject(new Error('rede caiu')) })
  t.rt.streamSimple({ provider: 'p', id: 'm' }, {}, {})
  t.ui.notify('durante o chat', 'warning')
  await tick(); await tick()
  sink({ sev: 17, fonte: 'hook', tipo: 'hook', msg: 'Stop · h.sh · saiu 1 · 3 ms', dados: { evento: 'Stop', comando: '/x/h.sh', code: 1, durMs: 3, timedOut: false } })
  t.h('turn_end', {})
  t.h('agent_end', {})
  await t.fim()
  const sp = t.traces()
  const log = t.log()
  const traceId = t.env.TRACEPARENT!.split('-')[1]
  assert.ok(log.length >= 7 && log.every((l: any) => l.trace_id === traceId && /^[0-9a-f]{16}$/.test(l.span_id)))
  assert.ok(sp.every((s: any) => s.traceId === traceId))
  const spanDe = (body: string) => sp.find((s: any) => s.spanId === log.find((l: any) => l.body === body).span_id)?.name
  assert.equal(spanDe('antes do agente'), 'pi')
  assert.equal(spanDe('no turno'), 'turn')
  assert.equal(spanDe('durante a tool'), 'execute_tool bash')
  assert.equal(spanDe('tool falhou'), 'execute_tool bash') // o erro aponta para a tool que falhou, já fechada
  assert.equal(spanDe('durante o chat'), 'chat p/m')
  assert.equal(spanDe('rede caiu'), 'chat p/m')
  assert.equal(spanDe('Stop · h.sh · saiu 1 · 3 ms'), 'pi.hook Stop')
  // leitores antigos: os campos de antes continuam iguais
  const l = log.find((x: any) => x.body === 'tool falhou')
  assert.deepEqual([l.severityNumber, l.severityText, l.source, l['error.type'], l.session], [13, 'WARN', 'tool', 'bash', 'sess-1'])
})

test('painel: detalhe do registro mostra trace e span; crash de outra execução fica sem ids', async () => {
  const t = cria()
  writeFileSync(join(t.d, 'crashes.json'), JSON.stringify([{ timestamp: Date.parse('2026-11-14T11:00:00Z'), message: 'caiu antes', stack: 'Error: caiu antes' }]))
  t.start()
  t.ui.notify('falha', 'error')
  await t.comandos.get('diagnostico').handler('', t.ctx)
  t.ui.painel.handleInput('\r')
  const traceId = t.env.TRACEPARENT!.split('-')[1]!
  assert.ok(t.ui.painel.render(100).join('\n').includes(`trace ${traceId.slice(0, 8)}… · span `))
  t.ui.painel.handleInput('\r'); t.ui.painel.handleInput('\x1b[B'); t.ui.painel.handleInput('\r')
  const crash = t.ui.painel.render(100).join('\n')
  assert.ok(crash.includes('caiu antes') && !crash.includes('trace '))
})

test('/diagnostico trace: avisa o trace id e os dois arquivos; completa os subcomandos', async () => {
  const t = cria({ HOME: '/home/fulano' })
  t.start()
  const cmd = t.comandos.get('diagnostico')
  await cmd.handler('trace', t.ctx)
  const [msg, tipo] = t.notices.at(-1)!
  const traceId = t.env.TRACEPARENT!.split('-')[1]
  assert.equal(tipo, 'info')
  assert.equal(msg, `trace ${traceId} · trilha: ${join(t.d, 'diag', 'traces.jsonl')} · registro: ${join(t.d, 'diag', 'diag.jsonl')}`)
  assert.equal(t.ui.painel, undefined) // não abre o painel
  assert.deepEqual(cmd.getArgumentCompletions('').map((x: any) => x.value), ['eventos', 'trace', 'limpar', 'nivel'])
  assert.deepEqual(cmd.getArgumentCompletions('tr').map((x: any) => x.value), ['trace'])
  assert.equal(cmd.getArgumentCompletions('zz'), null)
  assert.equal(cmd.getArgumentCompletions('nivel '), null)
  await cmd.handler('xis', t.ctx)
  assert.deepEqual(t.notices.at(-1), ['uso: /diagnostico [eventos|trace|limpar|nivel erros|avisos|tudo]', 'info'])
})

test('/doctor não limpa a faixa nem o contador; /diagnostico e o `l` do painel limpam os dois', async () => {
  const t = cria()
  t.start()
  t.ui.notify('atenção', 'warning')
  assert.deepEqual(t.widgets.at(-1), ['▲ notify: atenção'])
  assert.equal(t.status.at(-1), '▲ 1 · /diagnostico')
  const nW = t.widgets.length
  await t.comandos.get('doctor').handler('', t.ctx)
  assert.equal(t.ui.painel.aba, 'saúde')
  assert.equal(t.widgets.length, nW, 'faixa intocada pelo /doctor')
  assert.deepEqual(t.widgets.at(-1), ['▲ notify: atenção'])
  assert.equal(t.status.at(-1), '▲ 1 · /diagnostico')
  await t.comandos.get('diagnostico').handler('', t.ctx)
  assert.equal(t.widgets.at(-1), undefined)
  assert.equal(t.status.at(-1), undefined)
  t.ui.notify('outra', 'warning')
  assert.deepEqual(t.widgets.at(-1), ['▲ notify: outra'])
  t.ui.painel.handleInput('l')
  assert.equal(t.widgets.at(-1), undefined)
  assert.equal(t.status.at(-1), undefined)
})

test('aviso do wrapper: `pi: ` some da faixa e do aviso, fica no registro', () => {
  const t = cria()
  t.start()
  sink({ sev: 13, fonte: 'wrapper', tipo: 'patch', msg: 'pi: pi-code 9.9.9 is not 1.7.0, skipping harness patches' })
  assert.deepEqual(t.widgets.at(-1), ['▲ wrapper: pi-code 9.9.9 is not 1.7.0, skipping harness patches'])
  assert.deepEqual(t.notices.at(-1), ['wrapper: pi-code 9.9.9 is not 1.7.0, skipping harness patches', 'warning'])
  assert.equal(t.log().at(-1).body, 'pi: pi-code 9.9.9 is not 1.7.0, skipping harness patches')
})

test('detectores de ponta a ponta: hook lento, tool em laço, modelo lento e falhas de modelo', async () => {
  const t = cria()
  t.start()
  sink({ sev: 9, fonte: 'hook', tipo: 'hook', msg: 'Stop · lento.sh · ok · 2500 ms', quieto: true, dados: { evento: 'Stop', comando: '/x/lento.sh a', code: 0, durMs: 2500, timedOut: false } })
  sink({ sev: 9, fonte: 'hook', tipo: 'hook', msg: 'Stop · lento.sh · ok · 2600 ms', quieto: true, dados: { evento: 'Stop', comando: '/x/lento.sh a', code: 0, durMs: 2600, timedOut: false } })
  assert.deepEqual(detector(t), [['hook-lento', 13, 'hook Stop · lento.sh levou 2500 ms']])
  assert.deepEqual(t.widgets.at(-1), ['▲ detector: hook Stop · lento.sh levou 2500 ms']) // na faixa como qualquer aviso
  assert.equal(t.status.at(-1), '▲ 1 · /diagnostico')
  assert.deepEqual(t.notices, []) // sem aviso extra: a faixa já mostra

  toolErro(t, 'a'); toolErro(t, 'b')
  assert.equal(detector(t).length, 1)
  toolErro(t, 'c')
  assert.deepEqual(detector(t).at(-1), ['tool-em-laco', 13, 'tool bash falhou 3 vezes seguidas'])

  let soltar: (v: unknown) => void = () => {}
  t.rt.proximo = () => ({ result: () => new Promise((r) => (soltar = r)) })
  t.rt.streamSimple({ provider: 'p', id: 'm' }, {}, {})
  t.avanca(130_000)
  soltar({ stopReason: 'stop' })
  await tick()
  assert.deepEqual(detector(t).at(-1), ['modelo-lento', 13, 'modelo p/m levou 130 s'])

  t.rt.proximo = () => ({ result: () => Promise.reject(new Error(`529 ${Math.random()}`)) })
  for (let i = 0; i < 3; i++) { t.rt.streamSimple({ provider: 'p', id: 'm' }, {}, {}); await tick(); await tick() }
  assert.deepEqual(detector(t).at(-1), ['erros-de-modelo', 17, '3 chamadas de modelo falharam em 5 min'])
  assert.equal(detector(t).length, 4)
  // a detecção aponta para um span da trilha
  await t.fim()
  const ids = new Set(t.traces().map((s: any) => s.spanId))
  assert.ok(t.log().filter((x: any) => x.source === 'detector').every((x: any) => ids.has(x.span_id)))
  // e aparece no painel como qualquer entrada
  await t.comandos.get('diagnostico').handler('', t.ctx)
  assert.ok(t.ui.painel.render(100).join('\n').includes('3 chamadas de modelo falharam em 5 min'))
})

test('tool travada: intervalo de 30 s injetado, sem segurar o processo, checado nos eventos e limpo no shutdown', async () => {
  const t = cria()
  assert.equal(t.timers.length, 0)
  t.start()
  t.start() // segundo session_start não cria outro intervalo
  assert.deepEqual(t.timers.map((x) => [x.ms, x.ativo, x.unrefs]), [[30_000, true, 1]])
  t.h('tool_execution_start', { toolCallId: 'longa', toolName: 'web_fetch' }) // não `subagent`: ele é longo por natureza e fora do alerta (D12)
  t.avanca(9 * 60_000)
  t.timers[0]!.f()
  assert.deepEqual(detector(t), [])
  t.avanca(2 * 60_000)
  t.timers[0]!.f()
  t.timers[0]!.f()
  assert.deepEqual(detector(t), [['tool-travada', 13, 'tool web_fetch rodando há 11 min']])
  // também nos eventos de turno e de tool, sem esperar o intervalo
  t.h('tool_execution_start', { toolCallId: 'outra', toolName: 'bash' })
  t.avanca(10 * 60_000)
  t.h('turn_start', { turnIndex: 1 })
  assert.deepEqual(detector(t).at(-1), ['tool-travada', 13, 'tool bash rodando há 10 min'])
  assert.equal(detector(t).length, 2)
  await t.fim()
  assert.equal(t.timers[0]!.ativo, false)
  t.start() // nova sessão no mesmo processo: intervalo novo
  assert.deepEqual(t.timers.map((x) => x.ativo), [false, true])
  await t.fim()
})

test('limites pelo ambiente: valor próprio, 0 desliga e lixo cai no padrão', () => {
  const hook = (ms: number) => sink({ sev: 9, fonte: 'hook', tipo: 'hook', msg: `Stop · h · ok · ${ms} ms`, quieto: true, dados: { evento: 'Stop', comando: 'h', code: 0, durMs: ms, timedOut: false } })
  const a = cria({ PI_DIAG_HOOK_LENTO_MS: '100' })
  a.start(); hook(150)
  assert.deepEqual(detector(a), [['hook-lento', 13, 'hook Stop · h levou 150 ms']])
  const b = cria({ PI_DIAG_HOOK_LENTO_MS: '0', PI_DIAG_TOOL_TRAVADA_MS: '0' })
  b.start(); hook(99_999)
  b.h('tool_execution_start', { toolCallId: 'x', toolName: 'bash' })
  b.avanca(3_600_000)
  b.timers[0]!.f()
  assert.deepEqual(detector(b), [])
  const c = cria({ PI_DIAG_HOOK_LENTO_MS: 'rápido' })
  c.start(); hook(1999)
  assert.deepEqual(detector(c), [])
  hook(2000)
  assert.equal(detector(c).length, 1)
})

test('filho: detecção vai pela caixa do pai com a fonte sub e o tipo detector:<regra>; contrato TSV sem colunas novas', async () => {
  const inbox = join(mkdtempSync(join(tmpdir(), 'diag-in-')), 'inbox.tsv')
  const t = cria({ PI_CODE_SUBAGENT: '1', PI_DIAG_INBOX: inbox }, false)
  t.start()
  assert.equal(t.timers.length, 1)
  toolErro(t, 'a'); toolErro(t, 'b'); toolErro(t, 'c')
  const linhas = readFileSync(inbox, 'utf8').trimEnd().split('\n')
  const det = linhas.filter((l) => l.includes('detector:'))
  assert.deepEqual(det, ['13\tsub\tdetector:tool-em-laco\ttool bash falhou 3 vezes seguidas'])
  assert.ok(linhas.every((l) => l.split('\t').length <= 5)) // sev, fonte, tipo, msg[, detalhe]
  assert.deepEqual(lerCaixa(inbox, 0).entradas.filter((e: any) => e.tipo.startsWith('detector')).map((e: any) => [e.sev, e.fonte, e.msg]), [[13, 'sub', 'tool bash falhou 3 vezes seguidas']])
  await t.fim()
  assert.equal(t.timers[0]!.ativo, false)
})

// D11 (docs/sync-observabilidade.md): o canal pi-code:subagent vira evento persistente com os ids de correlação.
const attr = (s: any, k: string) => s.attributes.find((a: any) => a.key === k)?.value
test('D11: pi-code:subagent start/stop viram spans persistentes com gen_ai.tool.call.id, pi.run.id, etapa e desfecho; campos ausentes ficam de fora', async () => {
  const t = cria()
  t.start()
  t.emit('pi-code:subagent', { phase: 'start', agentType: 'swarm-worker', agentId: 'fg-ab12cd34', toolCallId: 'call_9', planStep: 4 })
  t.emit('pi-code:subagent', { phase: 'stop', agentType: 'swarm-worker', agentId: 'fg-ab12cd34', toolCallId: 'call_9', planStep: 4, state: 'done', exitCode: 0, partial: true, lastAssistantMessage: 'segredo do texto' })
  t.emit('pi-code:subagent', { phase: 'start', agentType: 'Explore', agentId: 'bg-00000001' }) // sem correlação (plano ausente)
  t.emit('pi-code:subagent', { phase: 'lixo', agentType: 'x', agentId: 'y' })
  await t.fim()
  const sp = t.traces().filter((s: any) => s.name.startsWith('pi.subagent'))
  assert.deepEqual(sp.map((s: any) => s.name), ['pi.subagent start', 'pi.subagent stop', 'pi.subagent start'])
  assert.equal(attr(sp[0], 'gen_ai.tool.call.id').stringValue, 'call_9')
  assert.equal(attr(sp[0], 'pi.run.id').stringValue, 'fg-ab12cd34')
  assert.equal(attr(sp[0], 'pi.plan.step').intValue, '4')
  assert.equal(attr(sp[1], 'pi.run.state').stringValue, 'done')
  assert.equal(attr(sp[1], 'pi.run.partial').boolValue, true)
  assert.equal(attr(sp[2], 'gen_ai.tool.call.id'), undefined)
  assert.equal(attr(sp[2], 'pi.plan.step'), undefined)
  assert.ok(!JSON.stringify(sp).includes('segredo do texto'), 'a saída do agente nunca entra na trilha')
})

test('D11: o filho leva PI_CODE_FLEET_RUN_ID como pi.run.id no recurso OTel; o pai e id inválido não', async () => {
  const recurso = async (env: Record<string, string>) => {
    const t = cria(env, false)
    await t.start()
    t.h('tool_execution_start', { toolCallId: 'c', toolName: 'bash' })
    t.h('tool_execution_end', { toolCallId: 'c', toolName: 'bash', result: { content: [] } })
    await t.fim()
    return t.ler('traces.jsonl')[0].resourceSpans[0].resource.attributes.find((a: any) => a.key === 'pi.run.id')?.value.stringValue
  }
  assert.equal(await recurso({ PI_CODE_SUBAGENT: '1', PI_CODE_FLEET_RUN_ID: 'fg-1' }), 'fg-1')
  assert.equal(await recurso({ PI_CODE_FLEET_RUN_ID: 'fg-1' }), undefined)
  assert.equal(await recurso({ PI_CODE_SUBAGENT: '1', PI_CODE_FLEET_RUN_ID: '../x' }), undefined)
})

test('L9: tool_call idêntica depois do limiar é bloqueada com mensagem ao modelo e registrada; 0 desliga', () => {
  const chama = (t: any, id: string, input: object) => {
    const r = t.h('tool_call', { toolCallId: id, toolName: 'bash', input })
    if (r === undefined || !r.block) { t.h('tool_execution_start', { toolCallId: id, toolName: 'bash' }); t.h('tool_execution_end', { toolCallId: id, toolName: 'bash', isError: false, result: {} }) }
    return r
  }
  const t = cria({ PI_DIAG_TOOL_LACO_BLOQUEIO: '3' })
  t.start()
  for (let i = 0; i < 3; i++) assert.equal(chama(t, `a${i}`, { command: 'x' }), undefined)
  const r = chama(t, 'a3', { command: 'x' })
  assert.equal(r.block, true)
  assert.match(r.reason, /abordagem/i)
  assert.ok(t.log().some((l: any) => l.source === 'detector' && l['error.type'] === 'tool-em-laco-bloqueio'))
  assert.equal(chama(t, 'b0', { command: 'y' }), undefined)
  const off = cria({ PI_DIAG_TOOL_LACO_BLOQUEIO: '0' })
  off.start()
  for (let i = 0; i < 10; i++) assert.equal(chama(off, `c${i}`, { command: 'x' }), undefined)
})
