/**
 * Diagnóstico: registra o que hoje some (notify, console, sink global, caixa de entrada dos processos externos, erros de
 * ferramenta e de modelo, compactação, crashes) em memória + diag.jsonl, mostra só a contagem no rodapé e abre o modal
 * /diagnostico (comando ou ctrl+e); nada aparece acima do editor nem vira notify. Também monta a trilha de spans (eventos do pi, chamadas de modelo, hooks) e a
 * exporta (traces.jsonl, OTLP opcional); /doctor verifica a saúde do harness. Cada registro leva o trace/span ativo
 * (correlação com a trilha) e o detector da trilha gera avisos derivados (fonte `detector`).
 * Nada aqui pode lançar para dentro do pi nem mudar o comportamento de falha: só `uncaughtExceptionMonitor` (observa).
 * PI_DIAG=0 desliga. Subagente (PI_CODE_SUBAGENT=1): modo reduzido, sem UI nem arquivo próprio; trilha, fio e hooks
 * continuam e todo aviso/erro vai como linha TSV para PI_DIAG_INBOX do pai, com fonte `sub:<agente>`.
 */

import { accessSync, appendFileSync, existsSync, readdirSync, readFileSync, statSync, unlinkSync } from 'node:fs'
import { execFile } from 'node:child_process'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { format } from 'node:util'
import { copyToClipboard, getAgentDir } from '@earendil-works/pi-coding-agent'
import type { ExtensionAPI, ExtensionContext } from '@earendil-works/pi-coding-agent'
import { visibleWidth } from '@earendil-works/pi-tui'
import { icon } from '../ui-visual/icons.ts'
import { formatarDoctor, verificar, type Achado } from './doctor.ts'
import { criarExportador, lerHeaders } from './exportar.ts'
import { PainelDiagnostico, type Aba } from './painel.ts'
import { chave, criarRegistro, lerCaixa, redigir, SEVS, type Entrada, type Sev } from './registro.ts'
import { criarDetector, criarGuardaLaco, criarTrilha, lerLimiteLaco, lerLimites, type Attrs } from './trilha.ts'

export const SINK = Symbol.for('pi-harness:diag')
export const DOCTOR = Symbol.for('pi-harness:doctor')
const MARCA = Symbol.for('pi-harness:diag-notify')
const MARCA_FIO = Symbol.for('pi-harness:diag-fio')
/** Abre o modal; livre nos padrões do pi 1.5.2, em claude-compat/shortcuts.ts e em EXT_ACTIONS (comandos/catalog.ts). */
export const ATALHO = 'ctrl+e' // dono, 2026-11-19: antes alt+e; ctrl+e sai do fim de linha (fica End) em keybindings.json
const RESERVA = 40 // colunas do rodapé que ficam para o resto da linha (modelo, esforço, pasta, custo)
const MAX_LINHA = 2048
const DIA = 24 * 3600_000
const VIGIA_MS = 30_000 // intervalo da checagem de tool travada
const SUBS: Array<[string, string]> = [['eventos', 'abre na aba eventos'], ['trace', 'mostra o trace id desta sessão'], ['limpar', 'limpa a lista']]

export interface Deps {
  env?: Record<string, string | undefined>
  agora?: () => number
  dir?: string
  console?: { warn: (...a: any[]) => void; error: (...a: any[]) => void }
  processo?: { on: (e: any, f: any) => unknown; off: (e: any, f: any) => unknown }
  crashes?: string
  agentDir?: string
  versao?: string
  fetch?: typeof fetch
  exec?: (cmd: string, args: string[]) => Promise<{ code: number; stdout: string; stderr: string }>
  log?: (linha: string) => void
  colunas?: () => number
  copiar?: (texto: string) => Promise<void>
  timer?: { setInterval: (f: () => void, ms: number) => unknown; clearInterval: (h: unknown) => void }
}

const execReal = (cmd: string, args: string[]) =>
  new Promise<{ code: number; stdout: string; stderr: string }>((res) =>
    execFile(cmd, args, { timeout: 20_000, maxBuffer: 1 << 20, encoding: 'utf8' }, (err: any, stdout, stderr) =>
      res({ code: err ? (typeof err.code === 'number' ? err.code : 1) : 0, stdout: String(stdout ?? ''), stderr: String(stderr ?? '') })),
  )

const escapar = (s: string) => s.replace(/\r/g, '').replace(/\t/g, '\\t').replace(/\n/g, '\\n')
const cortar = (s: string, n: number) => (n <= 0 ? '' : s.slice(0, n))
const eventoModelo = (m: any) => (m?.provider && m?.id ? `${m.provider}/${m.id}` : 'desconhecido')

const primeiraLinha = (s: string) => s.split(/\r?\n/).find((l) => l.trim()) ?? ''
const mensagem = (e: unknown) => (e instanceof Error ? e.message : String(e))

/** Valida o que chega pelo sink global; lixo vira undefined. */
function entradaValida(x: unknown): Entrada | undefined {
  if (!x || typeof x !== 'object') return undefined
  const o = x as Record<string, unknown>
  if (!SEVS.includes(o.sev as number) || typeof o.fonte !== 'string' || !o.fonte || typeof o.tipo !== 'string' || !o.tipo || typeof o.msg !== 'string' || !o.msg) return undefined
  return { sev: o.sev as Sev, fonte: o.fonte, tipo: o.tipo, msg: o.msg, detalhe: typeof o.detalhe === 'string' ? o.detalhe : undefined, quieto: o.quieto === true }
}

/** Nome do agente do filho: PI_CODE_AGENT_HOOKS (agentes com hooks) ou o registro do fleet do pi-code (`<dir>/<runId>.json`). */
function nomeDoFilho(env: Record<string, string | undefined>): string | undefined {
  const valido = (a: unknown) => (typeof a === 'string' && /^[\w.-]{1,40}$/.test(a) ? a : undefined)
  try {
    const a = valido(JSON.parse(env.PI_CODE_AGENT_HOOKS ?? '').agent)
    if (a) return a
  } catch {}
  try {
    const dir = env.PI_CODE_FLEET_DIR
    const id = env.PI_CODE_FLEET_RUN_ID
    if (!dir || !id || !/^[\w-]{1,40}$/.test(id)) return undefined
    return valido(JSON.parse(readFileSync(join(dir, `${id}.json`), 'utf8')).agent)
  } catch {
    return undefined
  }
}

export function montar(pi: ExtensionAPI, deps: Deps = {}): void {
  const env = deps.env ?? process.env
  if (env.PI_DIAG === '0') return
  const filho = env.PI_CODE_SUBAGENT === '1'
  const agora = deps.agora ?? Date.now
  const dir = deps.dir ?? join(getAgentDir(), 'diag')
  const con = deps.console ?? globalThis.console
  const proc = deps.processo ?? process
  const agentDir = deps.agentDir ?? (deps.dir ? dirname(deps.dir) : getAgentDir())
  const crashes = deps.crashes ?? join(agentDir, 'crashes.json')
  const caminhoLog = join(dir, 'diag.jsonl')
  const caminhoTrilha = join(dir, 'traces.jsonl')
  const til = (c: string) => {
    const home = env.HOME ?? homedir()
    return c.startsWith(home) ? `~${c.slice(home.length)}` : c
  }
  let sessao: string | undefined
  const reg = criarRegistro({ agora, arquivo: filho ? undefined : caminhoLog, sessao: () => sessao })
  let achados: Achado[] | undefined
  let exp: ReturnType<typeof criarExportador> | undefined
  let sessaoExp: string | undefined

  // Trilha: uma por processo; o filho herda o trace id de TRACEPARENT, o pai publica o seu para os filhos.
  const trilha = criarTrilha({
    agora,
    traceparent: env.TRACEPARENT,
    aoFechar: (s) => {
      exp?.enfileirar(s)
      detector.aoFechar(s)
    },
  })
  if (!filho) env.TRACEPARENT = trilha.traceparent()
  let spanAgente: string | undefined
  let spanTurno: string | undefined
  const spansTool = new Map<string, string>()
  const spansChat = new Set<string>()
  const pai = () => spanTurno ?? spanAgente
  /** Span ativo para a correlação: tool em curso, senão chamada de modelo, senão turno, senão a raiz. */
  const spanAtivo = () => [...spansTool.values()].at(-1) ?? [...spansChat].at(-1) ?? spanTurno ?? trilha.raizId
  // Avisos derivados (hook lento, modelo lento, tool em laço ou travada, falhas seguidas de modelo): caminho normal de captura.
  const detector = criarDetector({ agora, limites: lerLimites(env), relatar: (d) => capturar({ sev: d.sev, fonte: 'detector', tipo: d.regra, msg: d.msg, spanId: d.spanId }) })
  const vigiar = () => {
    try {
      detector.verificarAbertos(trilha.abertos())
    } catch {}
  }
  const relogio = deps.timer ?? { setInterval: (f: () => void, ms: number) => setInterval(f, ms), clearInterval: (h: unknown) => clearInterval(h as ReturnType<typeof setInterval>) }
  let vigia: unknown

  let ctxRef: ExtensionContext | undefined
  let notifyOrig: ((m: string, t?: string) => void) | undefined
  let uiRef: any
  let gravando = false
  let offset = 0
  let restaurar: Array<() => void> = []
  const dono = {}

  /** Rodapé, o único lugar em que um problema novo aparece: `✕ 2 erros · ▲ 1 aviso · ctrl+e abre` (onda 12, D4).
   * Falta de largura tira as palavras (`✕ 2 · ▲ 1 · ctrl+e`). Tudo visto: `diagnóstico: n` (total da sessão). */
  const status = () => {
    try {
      const ui: any = ctxRef?.ui
      if (!ui) return
      const th = ui.theme
      const cor = (c: string, s: string) => (th?.fg ? th.fg(c, s) : s)
      const { erros, avisos } = reg.contagem()
      if (!erros && !avisos) {
        const total = reg.lista().filter((r) => r.sev >= 13 && r.tipo !== 'crash-anterior').length
        return ui.setStatus('diag', total ? cor('dim', `diagnóstico: ${total}`) : undefined)
      }
      const monta = (c: (k: string, s: string) => string, palavras: boolean) => {
        const n = (q: number, um: string, varios: string) => (palavras ? `${q} ${q === 1 ? um : varios}` : String(q))
        const partes = [erros ? c('error', `${icon('err', env)} ${n(erros, 'erro', 'erros')}`) : '', avisos ? c('warning', `${icon('warn', env)} ${n(avisos, 'aviso', 'avisos')}`) : '', c('dim', palavras ? `${ATALHO} abre` : ATALHO)]
        return partes.filter(Boolean).join(c('dim', ' · '))
      }
      const orcamento = (deps.colunas?.() ?? process.stdout.columns ?? 80) - RESERVA
      ui.setStatus('diag', monta(cor, visibleWidth(monta((_k, s) => s, true)) <= orcamento))
    } catch {}
  }

  // Filho: sem registro nem UI; cada aviso/erro vira uma linha TSV na caixa do pai (contrato de `lerCaixa`).
  const relatados = new Set<string>()
  let nomeFilho: string | undefined
  const fonteDoFilho = () => ((nomeFilho ??= nomeDoFilho(env)) ? `sub:${nomeFilho}` : 'sub')
  const relayar = (e: Entrada) => {
    try {
      const caminho = env.PI_DIAG_INBOX
      if (!caminho || e.sev < 13) return
      const msg = redigir(e.msg).split(/\r?\n/).find((l) => l.trim())?.trim() ?? '(sem mensagem)'
      const k = chave({ fonte: e.fonte, tipo: e.tipo, msg })
      if (relatados.has(k)) return
      if (relatados.size > 500) relatados.clear()
      relatados.add(k)
      const cab = `${e.sev}\t${escapar(fonteDoFilho())}\t${escapar(`${e.fonte}:${e.tipo}`)}\t`
      let m = escapar(msg)
      let d = e.detalhe ? escapar(redigir(e.detalhe)) : ''
      const tam = (x: string) => Buffer.byteLength(x)
      const resto = () => MAX_LINHA - 1 - tam(cab) // 1 byte do \n final
      if (d) d = cortar(d, Math.max(0, resto() - tam(m) - 1))
      while (tam(m) + (d ? tam(d) + 1 : 0) > resto() && m.length > 1) m = cortar(m, Math.floor(m.length * 0.9))
      appendFileSync(caminho, `${cab}${m}${d ? `\t${d}` : ''}\n`)
    } catch {}
  }

  /** Registra e atualiza o contador do rodapé: nenhum notify, nada acima do editor. Nunca lança nem reentra. */
  const capturar = (e0: Entrada, op?: { visto?: boolean; ts?: number; persistir?: boolean }) => {
    if (filho) return relayar(e0)
    if (!ctxRef || gravando) return
    gravando = true
    try {
      // Correlação log ↔ trilha (trace_id/span_id do OTel); histórico de outra execução (`op.ts`) fica sem ids.
      const e: Entrada = op?.ts !== undefined ? e0 : { ...e0, traceId: trilha.traceId, spanId: e0.spanId ?? spanAtivo() }
      reg.adicionar(e, op)
    } catch {
    } finally {
      gravando = false
      status()
    }
  }

  // Falha de chamada de modelo vista pelo fio e por message_end: quem chega depois do outro não registra de novo.
  const modeloVisto = new Map<string, { quem: string; ts: number }>()
  const reportarModelo = (quem: 'fio' | 'fim', msg: string, tipo: string, spanId?: string) => {
    const t = agora()
    for (const [k, v] of modeloVisto) if (t - v.ts > 30_000) modeloVisto.delete(k)
    const v = modeloVisto.get(msg)
    if (v && v.quem !== quem) {
      modeloVisto.delete(msg)
      return
    }
    modeloVisto.set(msg, { quem, ts: t })
    capturar({ sev: 17, fonte: 'modelo', tipo, msg, spanId })
  }

  const lerInbox = () => {
    try {
      const caminho = env.PI_DIAG_INBOX
      if (!caminho || filho) return
      const r = lerCaixa(caminho, offset)
      offset = r.offset
      for (const e of r.entradas) capturar(e)
    } catch {}
  }

  const podarInbox = () => {
    try {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f)
        if (/^inbox-.*\.tsv$/.test(f) && p !== env.PI_DIAG_INBOX && agora() - statSync(p).mtimeMs > 7 * DIA) unlinkSync(p)
      }
    } catch {}
  }

  const crashesAnteriores = () => {
    try {
      if (!existsSync(crashes)) return
      const lista = JSON.parse(readFileSync(crashes, 'utf8'))
      if (!Array.isArray(lista)) return
      for (const c of lista) {
        const ts = typeof c?.timestamp === 'number' ? c.timestamp : Date.parse(String(c?.timestamp))
        if (!Number.isFinite(ts) || agora() - ts > DIA) continue
        capturar({ sev: 21, fonte: 'pi', tipo: 'crash-anterior', msg: String(c.message ?? c.kind ?? 'crash'), detalhe: typeof c.stack === 'string' ? c.stack : undefined }, { visto: true, ts, persistir: false })
      }
    } catch {}
  }

  const embrulharNotify = (ui: any) => {
    if (typeof ui?.notify !== 'function') return
    uiRef = ui
    if (ui.notify[MARCA] === dono) {
      notifyOrig = ui.notify.original
      return
    }
    const original: (m: string, t?: string) => void = ui.notify[MARCA] ? ui.notify.original : ui.notify
    notifyOrig = (m, t) => original.call(ui, m, t)
    const embrulhado: any = function (this: unknown, m: string, t?: string) {
      try {
        if (!gravando) capturar({ sev: t === 'error' ? 17 : t === 'warning' ? 13 : 9, fonte: 'notify', tipo: 'notify', msg: String(m) })
      } catch {}
      return original.call(ui, m, t)
    }
    embrulhado[MARCA] = dono
    embrulhado.original = original
    ui.notify = embrulhado
    restaurar.push(() => {
      if (uiRef.notify === embrulhado) uiRef.notify = original
    })
  }

  const embrulharConsole = () => {
    for (const tipo of ['warn', 'error'] as const) {
      const original = con[tipo]
      const fn = (...args: any[]) => {
        try {
          const erro = args.find((a) => a instanceof Error) as Error | undefined
          capturar({ sev: tipo === 'error' ? 17 : 13, fonte: 'console', tipo, msg: format(...args), detalhe: erro?.stack })
        } catch {}
      }
      con[tipo] = fn
      restaurar.push(() => {
        if (con[tipo] === fn) con[tipo] = original
      })
    }
  }

  const g = globalThis as Record<symbol, unknown>
  const aoCrash = (err: unknown) => capturar({ sev: 21, fonte: 'pi', tipo: 'crash', msg: mensagem(err), detalhe: err instanceof Error ? err.stack : undefined })
  const seguro = <A extends any[]>(f: (...a: A) => void) => (...a: A) => {
    try {
      f(...a)
    } catch {}
  }

  /** Hook de comando (patch do pi-code, via sink) vira evento da trilha; stderr só no arquivo local e no painel.
   * O registro da falha aponta para esse evento (`spanId`). */
  const hookParaTrilha = (e: Entrada, d: Record<string, unknown>) => {
    const a: Attrs = {}
    if (typeof d.comando === 'string') a['pi.hook.command'] = redigir(d.comando).slice(0, 500)
    if (typeof d.code === 'number') a['pi.hook.exit_code'] = d.code
    if (typeof d.durMs === 'number') a['pi.hook.duration_ms'] = d.durMs
    if (typeof d.timedOut === 'boolean') a['pi.hook.timed_out'] = d.timedOut
    if (e.detalhe) a['pi.hook.stderr'] = redigir(e.detalhe).slice(0, MAX_LINHA)
    const nome = `pi.hook ${typeof d.evento === 'string' ? d.evento : 'hook'}`
    const erro = e.sev >= 13 ? redigir(e.msg).slice(0, 300) : undefined
    // Duração real do hook (medida no patch do pi-code): o span cobre o intervalo, não um instante.
    e.spanId = (typeof d.durMs === 'number' && d.durMs >= 0 ? trilha.medido(nome, d.durMs, a, erro) : trilha.evento(nome, a, erro)).spanId
  }

  type Fim = (msg?: any, err?: unknown) => void
  /** Abre o span `chat` de uma chamada de modelo; devolve o fechamento (idempotente). Só nomes, tamanhos e ids. */
  const observarChamada = (nome: string, model: any, options: any): Fim => {
    const esforco = typeof options?.reasoning === 'string' ? options.reasoning : nome === 'streamSimple' ? 'off' : undefined
    const attrs: Attrs = { 'gen_ai.operation.name': 'chat', 'gen_ai.provider.name': String(model?.provider ?? 'desconhecido'), 'gen_ai.request.model': String(model?.id ?? 'desconhecido') }
    if (esforco) attrs['pi.effort'] = esforco
    const id = trilha.abrir(`chat ${eventoModelo(model)}`, attrs, pai())
    spansChat.add(id)
    let fechado = false
    return (msg, err) => {
      if (fechado) return
      fechado = true
      spansChat.delete(id)
      const a: Attrs = {}
      const u = msg?.usage
      if (typeof u?.input === 'number') a['gen_ai.usage.input_tokens'] = u.input
      if (typeof u?.output === 'number') a['gen_ai.usage.output_tokens'] = u.output
      if (typeof u?.cacheRead === 'number') a['gen_ai.usage.cache_read.input_tokens'] = u.cacheRead
      if (typeof u?.cacheWrite === 'number') a['gen_ai.usage.cache_creation.input_tokens'] = u.cacheWrite
      if (typeof u?.cacheWrite1h === 'number') a['pi.usage.cache_creation_1h.input_tokens'] = u.cacheWrite1h // subconjunto de cacheWrite (só Anthropic)
      if (typeof msg?.stopReason === 'string') a['gen_ai.response.finish_reasons'] = msg.stopReason
      const bruto = err !== undefined ? mensagem(err) : msg?.stopReason === 'error' ? String(msg.errorMessage ?? 'erro sem mensagem') : undefined
      trilha.fechar(id, a, bruto === undefined ? undefined : redigir(bruto).slice(0, 500))
      if (bruto !== undefined) reportarModelo('fio', bruto, 'chamada', id)
    }
  }

  /** `.result()` do stream do pi-ai é uma promessa compartilhada (nunca consome o stream): chamar de novo é seguro. */
  const acompanhar = (ret: any, fim: Fim) => {
    const p = typeof ret?.result === 'function' ? ret.result() : typeof ret?.then === 'function' ? ret : undefined
    if (!p) return fim()
    Promise.resolve(p).then(
      (m) => seguro(fim)(m),
      (e) => seguro(fim)(undefined, e),
    ).catch(() => {})
  }

  type Holder = { obs?: (nome: string, model: any, options: any) => Fim }
  let holders: Holder[] = []
  /** Embrulha streamSimple/stream do runtime uma vez por instância (marca própria, também sob o wrapper do travar-modelos). */
  const embrulharFio = (ctx: ExtensionContext) => {
    const reg0: any = (ctx as any).modelRegistry
    const rt: any = reg0?.runtime ?? reg0
    for (const nome of ['streamSimple', 'stream'] as const) {
      const orig = rt?.[nome]
      if (typeof orig !== 'function') continue
      let holder: Holder | undefined
      for (let x: any = orig, i = 0; x && i < 10 && !holder; x = x.original, i++) holder = x[MARCA_FIO]
      if (!holder) {
        const h: Holder = {}
        holder = h
        const f: any = function (this: any, ...args: any[]) {
          let fim: Fim | undefined
          try {
            fim = h.obs?.(nome, args[0], args[2])
          } catch {}
          let ret: any
          try {
            ret = orig.apply(this, args)
          } catch (e) {
            seguro(() => fim?.(undefined, e))()
            throw e
          }
          if (fim) {
            try {
              acompanhar(ret, fim)
            } catch (e) {
              seguro(() => fim?.(undefined, e))()
            }
          }
          return ret
        }
        f[MARCA_FIO] = h
        f.original = orig
        rt[nome] = f
      }
      holder.obs = observarChamada
      holders.push(holder)
    }
  }

  const descarregar = () => {
    try {
      exp?.descarregar().catch(() => {})
    } catch {}
  }

  const lerVersao = () => {
    try {
      return readFileSync(join(agentDir, 'install', 'current-version'), 'utf8').trim() || undefined
    } catch {
      return undefined
    }
  }

  const prepararExportador = () => {
    if (exp && sessaoExp === sessao) return
    descarregar()
    sessaoExp = sessao
    const recurso: Record<string, string> = { 'service.name': 'pi', 'pi.subagent': filho ? '1' : '0' }
    const versao = deps.versao ?? lerVersao()
    if (versao) recurso['service.version'] = versao
    if (sessao) recurso['pi.session.id'] = sessao
    if (filho && /^[\w-]{1,40}$/.test(env.PI_CODE_FLEET_RUN_ID ?? '')) recurso['pi.run.id'] = env.PI_CODE_FLEET_RUN_ID as string
    exp = criarExportador({
      arquivo: caminhoTrilha,
      endpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
      headers: lerHeaders(env.OTEL_EXPORTER_OTLP_HEADERS),
      recurso,
      fetch: deps.fetch,
      filtro: (s) => {
        const { 'pi.hook.stderr': _omitido, ...attrs } = s.attrs
        return { ...s, attrs }
      },
      aoFalhar: (m) => capturar({ sev: 13, fonte: 'otlp', tipo: 'exportar', msg: m }),
    })
  }

  pi.on('session_start', (_e: any, ctx: ExtensionContext) => {
    const ui = !filho && ctx.hasUI
    if (ui) ctxRef = ctx
    try {
      sessao = (ctx as any).sessionManager?.getSessionId?.()
    } catch {}
    let fresco = true
    try {
      // Segundo session_start com o mesmo ui (sem shutdown no meio): nada a reinstalar.
      fresco = !restaurar.length || (ui && ctx.ui !== uiRef)
      if (fresco) {
        restaurar.forEach((f) => f())
        restaurar = []
        if (ui) {
          embrulharNotify(ctx.ui)
          embrulharConsole()
        }
        const sink = (x: unknown) => {
          try {
            const e = entradaValida(x)
            if (!e) return
            const d = (x as any).dados
            if (e.tipo === 'hook' && d && typeof d === 'object') {
              seguro(hookParaTrilha)(e, d)
              if (e.quieto && e.sev < 13) return // hook que deu certo fica só na trilha
            }
            capturar(e)
          } catch {}
        }
        g[SINK] = sink
        restaurar.push(() => {
          if (g[SINK] === sink) delete g[SINK]
        })
        if (ui || filho) {
          proc.on('uncaughtExceptionMonitor', aoCrash)
          restaurar.push(() => void proc.off('uncaughtExceptionMonitor', aoCrash))
        }
        embrulharFio(ctx)
        restaurar.push(() => {
          for (const h of holders) h.obs = undefined
          holders = []
        })
      }
    } catch {}
    try {
      prepararExportador()
      trilha.evento('session_start', { 'pi.subagent': filho })
      if (vigia === undefined) {
        vigia = relogio.setInterval(vigiar, VIGIA_MS)
        ;(vigia as { unref?: () => void } | undefined)?.unref?.() // nunca segura o processo aberto
      }
    } catch {}
    if (fresco) podarInbox() // também sem UI (pi -p, subagente): senão nenhum desses caminhos poda
    if (!ui) return
    if (fresco) {
      crashesAnteriores()
      offset = 0
    }
    lerInbox()
    status()
  })

  pi.on('session_shutdown', async () => {
    seguro(() => {
      if (vigia !== undefined) relogio.clearInterval(vigia)
      vigia = undefined
    })()
    seguro(() => {
      trilha.evento('session_shutdown')
      trilha.fechar(trilha.raizId)
    })()
    for (const f of restaurar) {
      try {
        f()
      } catch {}
    }
    restaurar = []
    ctxRef = undefined
    // Entrega final com teto de 2 s: nunca atrasa o encerramento do pi.
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      if (exp) await Promise.race([exp.descarregar(), new Promise((r) => (timer = setTimeout(r, 2000)))])
    } catch {
    } finally {
      clearTimeout(timer)
    }
  })

  pi.on('agent_start', seguro(() => {
    spanAgente = trilha.abrir('invoke_agent pi', { 'gen_ai.operation.name': 'invoke_agent', 'gen_ai.agent.name': 'pi' })
  }))
  pi.on('agent_end', seguro(() => {
    if (spanAgente) trilha.fechar(spanAgente)
    spanAgente = spanTurno = undefined
    descarregar()
  }))
  pi.on('turn_start', seguro((e: any) => {
    spanTurno = trilha.abrir('turn', typeof e?.turnIndex === 'number' ? { 'pi.turn.index': e.turnIndex } : undefined, spanAgente)
    vigiar()
  }))
  pi.on('turn_end', () => {
    seguro(() => {
      if (spanTurno) trilha.fechar(spanTurno)
      spanTurno = undefined
      descarregar()
    })()
    vigiar()
    lerInbox()
  })
  pi.on('tool_execution_start', seguro((e: any) => {
    const nome = String(e?.toolName ?? 'ferramenta')
    const attrs: Attrs = { 'gen_ai.operation.name': 'execute_tool', 'gen_ai.tool.name': nome }
    if (typeof e?.toolCallId === 'string') attrs['gen_ai.tool.call.id'] = e.toolCallId
    const id = trilha.abrir(`execute_tool ${nome}`, attrs, pai())
    if (typeof e?.toolCallId === 'string') spansTool.set(e.toolCallId, id)
    vigiar()
  }))
  pi.on('model_select', seguro((e: any) => {
    trilha.evento('model_select', { 'pi.model': eventoModelo(e?.model), 'pi.model.source': String(e?.source ?? '') })
  }))
  pi.on('thinking_level_select', seguro((e: any) => {
    trilha.evento('thinking_level_select', { 'pi.effort': String(e?.level ?? ''), 'pi.effort.previous': String(e?.previousLevel ?? '') })
  }))
  // Só o tamanho do texto: o conteúdo do prompt nunca entra na trilha.
  pi.on('input', seguro((e: any) => {
    trilha.evento('input', { 'pi.input.chars': typeof e?.text === 'string' ? e.text.length : 0, 'pi.input.source': String(e?.source ?? '') })
  }))
  pi.on('session_compact' as any, seguro((e: any) => {
    trilha.evento('session_compact', { 'pi.compact.reason': String(e?.reason ?? ''), 'pi.compact.will_retry': e?.willRetry === true })
  }))

  // D11 (docs/sync-observabilidade.md): o ciclo de cada agente no canal do pi-code vira evento persistente da trilha, com os ids que ligam
  // agente ↔ chamada `subagent` (gen_ai.tool.call.id) ↔ run (pi.run.id) ↔ etapa do plano (pi.plan.step, heurístico). Sem prompt nem saída.
  pi.events?.on('pi-code:subagent', seguro((e: any) => {
    if (e?.phase !== 'start' && e?.phase !== 'stop') return
    const attrs: Attrs = { 'pi.run.id': String(e.agentId ?? ''), 'pi.subagent.type': String(e.agentType ?? '') }
    if (typeof e.toolCallId === 'string') attrs['gen_ai.tool.call.id'] = e.toolCallId
    if (typeof e.planStep === 'number') attrs['pi.plan.step'] = e.planStep
    if (e.phase === 'stop') {
      if (typeof e.state === 'string') attrs['pi.run.state'] = e.state
      if (typeof e.exitCode === 'number') attrs['pi.run.exit_code'] = e.exitCode
      if (e.partial === true) attrs['pi.run.partial'] = true
    }
    trilha.evento(`pi.subagent ${e.phase}`, attrs)
  }))

  // Escalada do `tool-em-laco`: a mesma chamada repetida N vezes (resultado já visto) é bloqueada com recado ao modelo.
  const laco = criarGuardaLaco(lerLimiteLaco(env))
  pi.on('tool_call', (e: any) => {
    try {
      const motivo = laco.aoChamar(String(e?.toolCallId), String(e?.toolName ?? 'ferramenta'), e?.input)
      if (motivo === undefined) return undefined
      capturar({ sev: 13, fonte: 'detector', tipo: 'tool-em-laco-bloqueio', msg: `tool ${String(e?.toolName)} bloqueada: chamada idêntica repetida`, detalhe: motivo })
      return { block: true, reason: motivo }
    } catch {
      return undefined
    }
  })
  pi.on('tool_execution_end', (e: any) => {
    try {
      laco.aoResultado(String(e?.toolCallId), e?.result, e?.isError === true)
    } catch {}
    let id: string | undefined
    try {
      id = spansTool.get(e?.toolCallId)
      if (id) {
        spansTool.delete(e.toolCallId)
        trilha.fechar(id, typeof e?.durationMs === 'number' ? { 'pi.tool.duration_ms': e.durationMs } : undefined, e?.isError ? 'erro na ferramenta' : undefined)
      }
    } catch {}
    try {
      if (e?.isError) {
        const partes = Array.isArray(e.result?.content) ? e.result.content : []
        const texto = partes.filter((p: any) => p?.type === 'text' && typeof p.text === 'string').map((p: any) => p.text).join('\n')
        capturar({ sev: 13, fonte: 'tool', tipo: String(e.toolName ?? 'ferramenta'), msg: primeiraLinha(texto) || 'erro sem texto', detalhe: texto || undefined, spanId: id })
      }
    } catch {}
    vigiar()
    lerInbox() // também aqui: a falha de um subagente aparece quando a ferramenta subagent volta
  })
  pi.on('message_end', (e: any) => {
    try {
      const m = e?.message
      if (m?.role === 'assistant' && m.stopReason === 'error') reportarModelo('fim', m.errorMessage ?? 'erro sem mensagem', 'erro')
    } catch {}
  })
  pi.on('session_compact_failed' as any, (e: any) => {
    try {
      // Cancelada (Esc, abort de extensão, cancel de hook): só trilha, sem alerta; antes sumia sem rastro.
      if (e?.aborted) return void seguro(() => trilha.evento('session_compact_aborted', { 'pi.compact.reason': String(e?.reason ?? ''), 'pi.compact.from_extension': e?.fromExtension === true }))()
      const msg = e?.errorMessage ?? String(e?.reason ?? 'compactação')
      seguro(() => trilha.evento('session_compact_failed', { 'pi.compact.reason': String(e?.reason ?? '') }, redigir(String(msg)).slice(0, 300)))()
      capturar({ sev: e?.willRetry ? 13 : 17, fonte: 'compactação', tipo: String(e?.reason ?? 'compactação'), msg })
    } catch {}
  })
  pi.on('agent_settled' as any, () => lerInbox())

  if (filho) return // sem comandos nem painel: o pai mostra o que o filho relata

  /** Só abre: quem marca as entradas como vistas (/diagnostico, atalho) é que zera o contador; o /doctor não. */
  const abrirPainel = async (ctx: ExtensionContext, aba: Aba) => {
    const copiar = deps.copiar ?? copyToClipboard
    const acoes = {
      lista: () => reg.lista(),
      silenciar: (k: string) => (reg.silenciar(k), status()),
      reativar: (k: string) => (reg.reativar(k), status()),
      limpar: () => (reg.limpar(), status()),
      caminhoLog: til(caminhoLog),
      caminhoTrilha: til(caminhoTrilha),
      eventos: () => trilha.recentes().reverse(),
      resumo: () => trilha.resumo(),
      saude: () => achados,
      copiar: (texto: string) => void Promise.resolve().then(() => copiar(texto)).catch(() => {}),
    }
    await ctx.ui.custom<void>((t, theme, _kb, done) => new PainelDiagnostico(theme, acoes, () => done(), () => t.requestRender(), () => Math.max(8, Math.floor(((t as any).terminal?.rows ?? 24) * 0.7)), aba, env), { overlay: true, overlayOptions: { anchor: 'center', width: '90%', minWidth: 40, maxHeight: '70%' } })
  }

  /** `/diagnostico` sem argumento e o atalho: lê a caixa, marca tudo como visto (zera o rodapé) e abre em `problemas`. */
  let modalAberto = false
  const abrirModal = async (ctx: ExtensionContext, aba: Aba = 'problemas') => {
    if (!ctx.hasUI || modalAberto) return
    modalAberto = true
    try {
      lerInbox()
      reg.marcarVistos()
      status()
      await abrirPainel(ctx, aba)
    } finally {
      modalAberto = false
    }
  }
  pi.registerShortcut(ATALHO as any, { description: 'Diagnóstico: erros e avisos da sessão', handler: (ctx) => abrirModal(ctx) })

  pi.registerCommand('diagnostico', {
    description: 'Erros e avisos internos do pi, do modelo, dos hooks e do harness nesta sessão',
    getArgumentCompletions: (prefixo: string) => {
      if (prefixo.includes(' ')) return null
      const itens = SUBS.filter(([v]) => v.startsWith(prefixo)).map(([value, description]) => ({ value, label: value, description }))
      return itens.length ? itens : null
    },
    handler: async (args: string, ctx) => {
      if (!ctx.hasUI) return
      const [sub] = String(args ?? '').trim().split(/\s+/)
      const avisar = (m: string) => (notifyOrig ?? ((x: string) => ctx.ui.notify(x, 'info')))(m, 'info')
      if (sub === 'limpar') {
        reg.limpar()
        return status()
      }
      // O mesmo id está em `trace_id` do registro e em `traceId` da trilha: dá para procurar nos dois arquivos.
      if (sub === 'trace') return avisar(`trace ${trilha.traceId} · trilha: ${til(caminhoTrilha)} · registro: ${til(caminhoLog)}`)
      if (sub && sub !== 'eventos') return avisar('uso: /diagnostico [eventos|trace|limpar]')
      await abrirModal(ctx, sub === 'eventos' ? 'eventos' : 'problemas')
    },
  })

  /** `extras`: checagens de outro dono do /doctor (claude-compat), somadas aos achados. */
  const rodarDoctor = async (ctx: any, extras: Array<{ ok: boolean; text: string }> = []) => {
      try {
        const reg0: any = (ctx as any).modelRegistry
        const modelo: any = ctx.model
        let temAuth: boolean | undefined
        try {
          if (modelo && typeof reg0?.hasConfiguredAuth === 'function') temAuth = !!reg0.hasConfiguredAuth(modelo)
        } catch {}
        const l = reg.lista()
        const crashes = l.filter((r) => r.tipo === 'crash' || r.tipo === 'crash-anterior').length
        achados = await verificar({
          env,
          agentDir,
          exec: deps.exec ?? execReal,
          fs: { existsSync, readFileSync, statSync, accessSync, readdirSync },
          sessao: { modelo: modelo ? eventoModelo(modelo) : undefined, temAuth, erros: l.filter((r) => r.sev >= 17).length - crashes, avisos: l.filter((r) => r.sev === 13).length, crashes },
        })
        achados.push(...extras.map((x, i) => ({ id: `compat:${i}`, estado: x.ok ? ('ok' as const) : ('erro' as const), titulo: x.text })))
        if (ctx.hasUI) return await abrirPainel(ctx, 'saúde')
        const nome = { ok: 'ok', aviso: 'warn', erro: 'err' } as const
        for (const linha of formatarDoctor(achados, (e) => icon(nome[e], env))) (deps.log ?? ((s: string) => console.log(s)))(linha)
      } catch (e) {
        capturar({ sev: 13, fonte: 'doctor', tipo: 'falha', msg: mensagem(e) })
      }
  }
  // O claude-compat registra /doctor antes (ordem de carga) e delega para cá por este símbolo.
  g[DOCTOR] = rodarDoctor
  pi.registerCommand('doctor', {
    description: 'Verifica a saúde do harness: config, patches, hooks, MCP, credencial, exportação',
    handler: async (_args: string, ctx) => rodarDoctor(ctx),
  })
}

export default function (pi: ExtensionAPI) {
  montar(pi)
}
