/**
 * Dono dos sinais de fim de turno: notificação (título `sessão · pasta`, corpo por desfecho), som (decidido aqui,
 * tocado por sound-notify), progresso na aba do terminal e o painel /avisos. Anuncia `pi-harness:notify-owner`: o
 * notify.ts do pi-code (patch notify-owner) se cala e o sound-notify deixa de decidir sozinho.
 *
 * `precisa` = pergunta aberta (REMOTE_QUESTION_CHANNEL do question.ts do pi-code). Pedido de permissão não tem evento
 * de extensão confiável: fica de fora.
 */

import { getAgentDir } from '@earendil-works/pi-coding-agent'
import type { ExtensionAPI, ExtensionContext } from '@earendil-works/pi-coding-agent'
import { carregar, caminhoAvisos, gravar, type Config, type Evento } from './config.ts'
import { causa } from './causa.ts'
import { corpo, criarNotificador, type Info } from './notificar.ts'
import { adicionar, PainelAvisos, type Aviso } from './painel.ts'
import { criarProgresso } from './progresso.ts'
import { ausente, desfechoDe, duracao, tituloSessao } from './turno.ts'

const RETRY_CANCELADO = Symbol.for('pi-harness:retry-cancelado')

export const OWNER_CHANNEL = 'pi-harness:notify-owner'
export const SOUND_CHANNEL = 'pi-harness:aviso-som'
export const QUESTION_CHANNEL = 'pi-code:question:v1'

export interface Deps {
  escrever?: (s: string) => void
  agora?: () => number
  caminho?: string
  env?: Record<string, string | undefined>
}

export function montar(pi: ExtensionAPI, deps: Deps = {}): void {
  const env = deps.env ?? process.env
  if (env.PI_CODE_SUBAGENT === '1') return
  const escrever = deps.escrever ?? ((s: string) => void (process.stdout.isTTY && process.stdout.write(s)))
  const agora = deps.agora ?? Date.now
  const caminho = () => deps.caminho ?? caminhoAvisos(getAgentDir())
  let config: Config = carregar(caminho())
  let recentes: Aviso[] = []
  let ctxRef: ExtensionContext | undefined
  let focused: boolean | undefined
  let lastInputAt: number | undefined
  let inicio: number | undefined
  let ultimo: unknown[] = []
  const notificador = criarNotificador(escrever, env)
  const progresso = criarProgresso({ escrever, ligado: () => config.progresso, env })

  const titulo = () => tituloSessao(pi.getSessionName(), ctxRef?.cwd ?? process.cwd())
  const tocar = () => {
    if (env.PI_SOUND_NOTIFY !== '0') pi.events.emit(SOUND_CHANNEL, {})
  }

  /** Registra, notifica (só ausente) e toca (só nos eventos de `som`). */
  const sinalizar = (evento: Evento, info: Info, glifo: Aviso['glifo']) => {
    recentes = adicionar(recentes, { hora: agora(), glifo, texto: corpo(evento, { duracao: info.duracao, rotulo: info.rotulo }) })
    if (config.avisar.includes(evento) && ausente(focused, lastInputAt, agora())) {
      const nome = pi.getSessionName()
      notificador.enviar(config.canal, evento, (info.resultado || info.pergunta) && nome ? `pi · ${nome}` : titulo(), info)
    }
    if (config.som.includes(evento)) tocar()
  }

  pi.events.on(QUESTION_CHANNEL, (evento) => {
    if (!ctxRef) return
    progresso.esperar(true)
    const pergunta = (evento as { question?: unknown } | undefined)?.question
    sinalizar('precisa', { pergunta: typeof pergunta === 'string' ? pergunta : undefined }, '▲')
  })
  pi.events.on('pi-ui:terminal-focus', (d) => {
    focused = (d as { focused: boolean }).focused
    if (focused) notificador.fechar()
  })

  pi.on('session_start', (_e, ctx) => {
    if (!ctx.hasUI) return
    ctxRef = ctx
    config = carregar(caminho())
    lastInputAt = undefined
    inicio = undefined // um agent_start sem agent_settled da sessão anterior não infla a próxima duração
    ultimo = []
    pi.events.emit(OWNER_CHANNEL, {})
  })
  pi.on('input', (e) => {
    if (e.source !== 'extension') lastInputAt = agora()
  })
  pi.on('agent_start', () => {
    if (!ctxRef) return
    inicio ??= agora()
    progresso.trabalhando()
  })
  // P22: % do Task quando a lista tem itens; a pergunta respondida tira a pausa.
  pi.on('tool_execution_end', (e: { toolName?: string; result?: { details?: { todos?: Array<{ status?: string }> } } }) => {
    if (e.toolName === 'question') progresso.esperar(false)
    const todos = e.toolName === 'todo' ? e.result?.details?.todos : undefined
    if (Array.isArray(todos)) progresso.percentual(todos.length ? (100 * todos.filter((t) => t.status === 'completed').length) / todos.length : undefined)
  })
  pi.on('agent_end', (e) => {
    ultimo = e.messages as unknown[]
  })
  pi.on('agent_settled', (e: { aborted?: boolean }) => {
    const mensagens = ultimo
    const dur = inicio === undefined ? undefined : duracao(agora() - inicio)
    inicio = undefined
    ultimo = []
    if (!ctxRef) return
    // Esc na espera entre tentativas chega com aborted=false e mensagem de erro; o patch do core deixa a marca.
    const g = globalThis as Record<symbol, unknown>
    const cancelou = g[RETRY_CANCELADO] !== undefined
    delete g[RETRY_CANCELADO]
    const { desfecho, erro } = desfechoDe(mensagens, e?.aborted === true || cancelou)
    if (desfecho === 'erro') progresso.erro()
    else progresso.limpar()
    if (desfecho === 'terminou') {
      const resposta = mensagens.findLast((m) => (m as { role?: string } | undefined)?.role === 'assistant') as { content?: Array<{ type: string; text?: string }> } | undefined
      const resultado = resposta?.content?.find((parte) => parte.type === 'text' && parte.text?.trim())?.text
      sinalizar('terminou', { duracao: dur, resultado }, '✓')
    } else if (desfecho === 'erro') sinalizar('erro', { rotulo: causa(erro).rotulo }, '✕')
  })
  // Só compactação automática (threshold/overflow). O evento traz o tamanho de antes, não o de depois: não inventamos o número.
  pi.on('session_compact', (e: { reason?: string; compactionEntry?: { tokensBefore?: number } }) => {
    if (!ctxRef || e.reason === 'manual') return
    const antes = e.compactionEntry?.tokensBefore
    const tam = typeof antes === 'number' && antes > 0 ? ` · de ${Math.round(antes / 1000)}k tokens` : ''
    recentes = adicionar(recentes, { hora: agora(), glifo: '▲', texto: `Contexto compactado sozinho${tam}` })
  })
  pi.on('session_shutdown', (e: { reason?: string }) => {
    // Reload (dono, 2026-11-19): o core (patches/pi-core/avisos/runtime.mjs) segura os avisos do novo início até o divisor.
    if (e?.reason === 'reload') (globalThis as Record<symbol, unknown>)[Symbol.for('pi-harness:recarga')] = { desde: performance.now(), avisos: [] }
    progresso.limpar()
    ctxRef = undefined
  })

  pi.registerCommand('avisos', {
    description: 'Avisos desta sessão e ajustes de notificação, som e progresso na aba',
    handler: async (_args: string, ctx) => {
      if (!ctx.hasUI) return
      const acoes = {
        recentes: () => recentes,
        agora,
        config: () => config,
        salvar: (c: Config) => {
          const antes = config
          config = c
          try {
            gravar(caminho(), c)
          } catch (e) {
            config = antes
            ctx.ui.notify(`Não consegui gravar avisos.json: ${e instanceof Error ? e.message : e}`, 'warning')
          }
        },
        // Testar agora ignora foco e ausência; respeita canal e a lista de som.
        testar: () => {
          notificador.enviar(config.canal, 'teste', titulo())
          if (config.som.length) tocar()
        },
      }
      await ctx.ui.custom<void>((t, theme, _kb, done) => new PainelAvisos(theme, acoes, () => done(), () => t.requestRender()), { overlay: true, overlayOptions: { anchor: 'bottom-center', width: '100%', maxHeight: '70%' } })
    },
  })
}

export default function (pi: ExtensionAPI) {
  montar(pi)
}
