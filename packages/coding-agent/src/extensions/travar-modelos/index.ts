/**
 * /travar-modelos: obriga a sessão (chat, subagentes, run, plano) a usar só os modelos e esforços escolhidos.
 * Ponto único: `stream`/`streamSimple` da instância ModelRuntime (docs/pi-travar-modelos-2026-11-14.md). A trava vive em
 * process.env.PI_MODEL_LOCK, que os pi filhos herdam. Sem trava os embrulhos só repassam. Nada lança para dentro do pi,
 * exceto os dois erros deliberados (falha fechada) nas chamadas de modelo.
 */

import { join } from 'node:path'
import { getAgentDir } from '@earendil-works/pi-coding-agent'
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent'
import { chave, decidir, deArgs, deEnv, EFFORTS, analisar, formatar, paraEnv, type Effort, type Trava } from './trava.ts'

export interface Deps {
  env?: Record<string, string | undefined>
}

const MARCA = Symbol.for('pi-harness:travar-modelos')
const SINK = Symbol.for('pi-harness:diag')
/** Ícone do rodapé (R2 da onda 12 escolhe um sem emoji); vazio por ora. Ponto único de troca. */
const ICONE_TRAVA = ''
const USO = 'uso: /travar-modelos provedor/id:low,medium …'
const mensagem = (e: unknown) => (e instanceof Error ? e.message : String(e))
// Mesmas opções de overlay do /subagents-setup (pi-code, subagent/fleet-ui/viewer.ts:380).
const OVERLAY = { anchor: 'bottom-center', width: '100%', maxHeight: '85%', margin: 0 } as const

/** `provedor/id`: divide só na primeira barra (ids podem ter barras). */
const separar = (k: string): [string, string] => {
  const i = k.indexOf('/')
  return [k.slice(0, i), k.slice(i + 1)]
}

export function montar(pi: ExtensionAPI, deps: Deps = {}): void {
  const env = deps.env ?? process.env
  const lido = deEnv(env)
  let trava: Trava | undefined = lido.trava
  let erroEnv: string | undefined = lido.erro
  let ctxRef: any
  let preferido: string | undefined
  let ajustando = false
  const vistos = new Set<string>()

  // Modelos já vistos numa chamada: o ctx guardado vence após reload ou compactação e o registro passa a lançar.
  const conhecidos = new Map<string, any>()
  const resolver = (k: string): any => {
    try {
      const [p, id] = separar(k)
      const achado = ctxRef?.modelRegistry?.find?.(p, id) ?? ctxRef?.modelRegistry?.getAll?.().find((m: any) => m.provider === p && m.id === id)
      return achado ?? conhecidos.get(k)
    } catch {
      return conhecidos.get(k)
    }
  }

  /** O runtime embrulhado resolve o modelo sem depender do ctx guardado. */
  const doRuntime = (rt: any, k: string): any => {
    try {
      const [p, id] = separar(k)
      return rt?.getModel?.(p, id)
    } catch {
      return undefined
    }
  }
  const dono = {}

  const registrar = (de: string, para: string) => {
    const msg = `${de} → ${para}`
    if (vistos.has(msg)) return
    vistos.add(msg)
    try {
      ;(globalThis as any)[SINK]?.({ sev: 13, fonte: 'travar-modelos', tipo: 'troca', msg, quieto: false })
    } catch {}
  }

  const embrulhar = (rt: any, nome: 'stream' | 'streamSimple') => {
    const atual = rt?.[nome]
    if (typeof atual !== 'function' || atual[MARCA] === dono) return
    // Após /reload o embrulho da instância antiga (ctx vencido, código antigo) continua no runtime: troca, não empilha.
    const orig = atual[MARCA] && typeof atual.original === 'function' ? atual.original : atual
    const f: any = function (this: any, model: any, context: any, options: any) {
      if (erroEnv) throw new Error(`travar-modelos: PI_MODEL_LOCK inválido (${erroEnv}); nenhuma chamada de modelo é permitida`)
      if (!trava) return orig.call(this, model, context, options)
      const k = chave(model)
      if (trava.models[k]) conhecidos.set(k, model)
      if (nome === 'stream') {
        if (!trava.models[k]) throw new Error(`travar-modelos: ${k} não está na trava desta sessão`)
        return orig.call(this, model, context, options)
      }
      const esforco: Effort = options?.reasoning ?? 'off'
      const d = decidir(trava, { modelo: k, esforco }, preferido)
      if (!d.mudou) return orig.call(this, model, context, options)
      const alvo = d.modelo === k ? model : (doRuntime(this ?? rt, d.modelo) ?? resolver(d.modelo))
      if (!alvo) throw new Error(`travar-modelos: não achei o modelo ${d.modelo} da trava; chamada recusada`)
      registrar(`${k} · ${esforco}`, `${d.modelo} · ${d.esforco}`)
      return orig.call(this, alvo, context, { ...options, reasoning: d.esforco === 'off' ? undefined : d.esforco })
    }
    f[MARCA] = dono
    f.original = orig
    rt[nome] = f
  }

  const status = (ctx: any) => {
    try {
      if (!ctx?.hasUI) return
      const n = trava ? Object.keys(trava.models).length : 0
      const th = ctx.ui.theme
      const texto = `${ICONE_TRAVA ? `${ICONE_TRAVA} ` : ''}${n} ${n === 1 ? 'modelo travado' : 'modelos travados'}`
      ctx.ui.setStatus('travar-modelos', trava ? (th?.fg ? th.fg('warning', texto) : texto) : undefined)
    } catch {}
  }

  /** Leva o chat principal para um par permitido. Sem reentrada: setModel/setThinkingLevel disparam os mesmos eventos. */
  async function ajustar(ctx: any, avisar: boolean, model: any = ctx?.model, pref?: string): Promise<void> {
    if (!trava || ajustando) return
    ajustando = true
    try {
      const nivel = pi.getThinkingLevel() as Effort
      const atual = model ? chave(model) : ''
      const d = decidir(trava, { modelo: atual, esforco: nivel }, pref ?? preferido)
      preferido = d.modelo
      if (!d.mudou) return
      if (d.modelo !== atual) {
        const alvo = resolver(d.modelo)
        if (!alvo || !(await pi.setModel(alvo))) {
          if (ctx?.hasUI) ctx.ui.notify(`Trava de modelos: não consegui usar ${d.modelo} (sem chave ou desconhecido).`, 'warning')
          return
        }
      }
      if (d.esforco !== (pi.getThinkingLevel() as Effort)) pi.setThinkingLevel(d.esforco)
      if (avisar && ctx?.hasUI) ctx.ui.notify(`Trava de modelos: ${atual} · ${nivel} não é permitido nesta sessão; voltei para ${d.modelo} · ${d.esforco}`, 'warning')
    } catch (e) {
      try {
        if (ctx?.hasUI) ctx.ui.notify(`Trava de modelos: falha ao ajustar a sessão (${mensagem(e)})`, 'warning')
      } catch {}
    } finally {
      ajustando = false
    }
  }

  const seguro = <A extends any[]>(f: (...a: A) => Promise<void> | void) => async (...a: A) => {
    try {
      await f(...a)
    } catch {}
  }

  pi.on('session_start', seguro(async (_e: any, ctx: any) => {
    ctxRef = ctx
    const reg: any = ctx?.modelRegistry
    const rt = reg?.runtime ?? reg
    if (rt) {
      embrulhar(rt, 'streamSimple')
      embrulhar(rt, 'stream')
    }
    if (ctx?.model) preferido = chave(ctx.model)
    if (trava) {
      await ajustar(ctx, false)
      status(ctx)
    }
  }))

  pi.on('model_select', seguro(async (e: any, ctx: any) => {
    ctxRef = ctx
    if (ajustando) return
    const prev = e?.previousModel ? chave(e.previousModel) : undefined
    if (e?.model && (!trava || trava.models[chave(e.model)])) preferido = chave(e.model)
    await ajustar(ctx, true, e?.model ?? ctx?.model, prev)
  }))

  pi.on('thinking_level_select', seguro(async (_e: any, ctx: any) => {
    ctxRef = ctx
    await ajustar(ctx, true)
  }))

  pi.on('tool_call', (e: any) => {
    try {
      if (!trava || (e?.toolName !== 'bash' && e?.toolName !== 'run')) return undefined
      if (JSON.stringify(e.input ?? '').includes('PI_MODEL_LOCK')) {
        return { block: true, reason: 'travar-modelos: comandos que mexem em PI_MODEL_LOCK são bloqueados enquanto a trava está ligada' }
      }
    } catch {}
    return undefined
  })

  /** Lista para o seletor, como setupModels do pi-code (subagent/routing/command.ts:14-18). */
  async function modelosDoSeletor(ctx: any): Promise<Array<{ key: string; levels: Effort[] }>> {
    let niveis: ((m: any) => string[]) | undefined
    try {
      niveis = ((await import('@earendil-works/pi-ai')) as any).getSupportedThinkingLevels
    } catch {}
    return ctx.modelRegistry
      .getAvailable()
      .map((m: any) => ({ key: chave(m), levels: EFFORTS.filter((e) => (niveis ? niveis(m) : [...EFFORTS]).includes(e)) }))
      .filter((m: any) => m.levels.length > 0)
  }

  async function aplicar(nova: Trava, ctx: any) {
    trava = nova
    erroEnv = undefined
    env.PI_MODEL_LOCK = paraEnv(nova)
    ctxRef = ctx
    await ajustar(ctx, false)
    status(ctx)
    ctx.ui.notify(CAIXA_AVISO + formatar(nova), 'info')
  }

  pi.registerCommand('travar-modelos', {
    description: 'Obriga esta sessão (chat, subagentes, run, plano) a usar só os modelos e esforços escolhidos (show | off)',
    handler: async (args: string, ctx: any) => {
      try {
        const arg = args.trim()
        if (arg.toLowerCase() === 'show') return ctx.ui.notify(erroEnv ? `PI_MODEL_LOCK inválido (${erroEnv}): chamadas de modelo bloqueadas.` : (trava ? CAIXA_AVISO : '') + formatar(trava), erroEnv ? 'error' : 'info')
        if (arg.toLowerCase() === 'off') {
          trava = undefined
          erroEnv = undefined
          delete env.PI_MODEL_LOCK
          status(ctx)
          return ctx.ui.notify('Trava de modelos desligada.', 'info')
        }
        if (arg) {
          const r = deArgs(arg)
          if (typeof r === 'string') return ctx.ui.notify(`${r}\n${USO}`, 'error')
          const desconhecido = Object.keys(r.models).find((k) => !resolverEm(ctx, k))
          if (desconhecido) return ctx.ui.notify(`Modelo desconhecido: ${desconhecido}. Nada foi aplicado.`, 'error')
          return await aplicar(r, ctx)
        }
        if (!ctx.hasUI) return ctx.ui.notify(`Sem argumentos precisa da TUI. ${USO}`, 'error')
        let SetupComponent: any
        try {
          SetupComponent = (await import(join(getAgentDir(), 'npm/node_modules/pi-code/extensions/subagent/routing/setup-ui.ts'))).SetupComponent
        } catch {
          return ctx.ui.notify(`Seletor indisponível. ${USO}`, 'info')
        }
        const models = await modelosDoSeletor(ctx)
        if (models.length === 0) return ctx.ui.notify('Nenhum modelo disponível para escolher.', 'error')
        const escolhido = await ctx.ui.custom((tui: any, _t: any, _k: any, done: any) => new SetupComponent({ models, current: trava, done, requestRender: () => tui.requestRender() }), { overlay: true, overlayOptions: { ...OVERLAY } })
        if (!escolhido) return ctx.ui.notify('Trava de modelos inalterada.', 'info')
        const v = analisar(escolhido)
        if (typeof v === 'string') return ctx.ui.notify(`Seleção inválida: ${v}`, 'error')
        await aplicar(v, ctx)
      } catch (e) {
        try {
          ctx.ui.notify(`travar-modelos: ${mensagem(e)}`, 'error')
        } catch {}
      }
    },
  })
}

const resolverEm = (ctx: any, k: string): boolean => {
  const [p, id] = separar(k)
  return !!ctx?.modelRegistry?.find?.(p, id)
}

/** Marca invisível lida pelo patch de avisos do core (caixaNeutra): caixa com fundo de aviso (dono, 2026-11-14). */
const CAIXA_AVISO = '\u2063\u2063'

export default montar
