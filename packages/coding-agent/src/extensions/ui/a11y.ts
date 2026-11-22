/**
 * Acessibilidade: NO_COLOR (no-color.org) → tema mono e cabeçalho sem cor; `movimento()` é o único critério de animação
 * (Onda 10, P01): normal, reduzido (sem varredura; só troca de cor curta) ou desligado (texto fixo).
 * O logo do cabeçalho embutido usa cores fixas da marca, fora do tema (pi-logo.js no 1.5.2), por isso o wrapper.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent'

/** Único spinner (cli-spinners 'dots', 80 ms), usado por working.ts; o título do terminal não anima. */
export const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

type Env = Record<string, string | undefined>

export const noColor = (env: Env = process.env): boolean => (env.NO_COLOR ?? '') !== ''

const SEQ_TERMINAL = /\u001b(?:\][\s\S]*?(?:\u0007|\u001b\\)|[P^_][\s\S]*?\u001b\\|\[[0-9:;<=>?]*[ -/]*[@-~])/g
/** Texto de fora da tela: tira OSC, DCS e C0/C1. SGR (`\\x1b[…m`) fica, porque o realce de código já é nosso. */
export const sanitizarExibicao = (texto: string): string =>
  String(texto)
    .replace(SEQ_TERMINAL, (seq) => (seq.startsWith('\u001b[') && seq.endsWith('m') ? seq : ''))
    .replace(/\u001b(?!\[[0-9:;<=>?]*m)/g, '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001a\u001c-\u001f\u007f-\u009f]/g, '')

export const MOVIMENTOS = ['normal', 'reduzido', 'desligado'] as const
export type Movimento = (typeof MOVIMENTOS)[number]
// Cada extensão tem a própria cópia deste módulo (jiti sem cache): a escolha do dono mora em globalThis.
const CHAVE = Symbol.for('pi-harness:movimento')
const nivel = (v: unknown): number => Math.max(0, MOVIMENTOS.indexOf(v as Movimento))
/** Chave `movimento` (ui-state.json pelo /movimento, ou settings.json); valor inválido volta a `normal`. */
export const definirMovimento = (v: unknown): void => void ((globalThis as Record<symbol, unknown>)[CHAVE] = MOVIMENTOS[nivel(v)])
const ligada = (v: string | undefined): boolean => v !== undefined && v !== '' && v !== '0' && v !== 'false'
/** Nível em vigor: o mais restritivo entre o ambiente (TERM=dumb e NO_PROGRESS desligam; PI_REDUCED_MOTION e TERM=linux reduzem) e a chave. */
export const movimento = (env: Env = process.env, chave: unknown = (globalThis as Record<symbol, unknown>)[CHAVE]): Movimento => {
  const amb = env.TERM === 'dumb' || (env.NO_PROGRESS ?? '') !== '' ? 2 : ligada(env.PI_REDUCED_MOTION) || env.TERM === 'linux' ? 1 : 0
  return MOVIMENTOS[Math.max(amb, nivel(chave))]!
}
/** Usado pelo painel de subagentes do pi-code (fleet-ui/palette.ts importa este arquivo). */
export const reducedMotion = (env: Env = process.env): boolean => movimento(env) !== 'normal'

type Part = { children?: Part[]; render?: (w: number) => string[]; setExpanded?: (e: boolean) => void; invalidate?: () => void; onLogoClick?: unknown; plainInner?: Part }

// O BuiltInHeader é o único componente com o campo `onLogoClick`; no /reload ele está atrás do wrapper anterior.
function findBuiltIn(node: Part, depth = 0): Part | undefined {
  if (node.plainInner) return node.plainInner
  if ('onLogoClick' in node) return node
  if (depth > 3) return undefined
  for (const c of node.children ?? []) {
    const hit = findBuiltIn(c, depth + 1)
    if (hit) return hit
  }
  return undefined
}

/** Cabeçalho embutido sem SGR; sem handleMouse, então o clique no logo (easter egg 3D colorido) fica desligado. */
export function plainHeader(tui: unknown) {
  const inner = findBuiltIn(tui as Part)
  return {
    plainInner: inner,
    render: (w: number) => (inner?.render?.(w) ?? []).map((l) => l.replace(/\x1b\[[0-9;:]*m/g, '')),
    setExpanded: (e: boolean) => inner?.setExpanded?.(e),
    invalidate: () => inner?.invalidate?.(),
  }
}

const agentDir = () => process.env.PI_CODING_AGENT_DIR || join(homedir(), '.pi', 'agent')
const uiState = () => process.env.PI_UI_STATE || join(agentDir(), 'ui-state.json') // mesmo arquivo do /vim
const lerJson = (p: string): Record<string, unknown> => {
  try {
    const v: unknown = JSON.parse(readFileSync(p, 'utf8'))
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}
/** Estado de interface do dono (ui-state.json): ler e mesclar sem perder as outras chaves. */
export const lerEstado = (): Record<string, unknown> => lerJson(uiState())
export const gravarEstado = (patch: Record<string, unknown>): void => {
  mkdirSync(dirname(uiState()), { recursive: true })
  writeFileSync(uiState(), `${JSON.stringify({ ...lerJson(uiState()), ...patch }, null, 2)}\n`)
}
/** Chave salva: a do /movimento (ui-state.json) vence a de settings.json; nenhuma = normal. */
export const movimentoSalvo = (): unknown => lerJson(uiState()).movimento ?? lerJson(join(agentDir(), 'settings.json')).movimento

const indicador = (ui: any): void => {
  ui.setWorkingIndicator(movimento() === 'normal' ? { frames: FRAMES.map((f) => ui.theme?.fg?.('accent', f) ?? f), intervalMs: 80 } : { frames: ['●'] })
}

export default function (pi: ExtensionAPI) {
  pi.registerCommand?.('movimento', {
    description: 'Movimento da interface: normal, reduzido (sem varredura) ou desligado (texto fixo)',
    getArgumentCompletions: (p: string) => MOVIMENTOS.filter((m) => m.startsWith(p.trim())).map((m) => ({ value: m, label: m })),
    handler: async (args, ctx) => {
      const pedido = args.trim()
      if (!pedido) return ctx.ui.notify(`Movimento: ${movimento()} (uso: /movimento ${MOVIMENTOS.join('|')})`, 'info')
      if (!(MOVIMENTOS as readonly string[]).includes(pedido)) return ctx.ui.notify(`Movimento desconhecido: ${pedido} (use ${MOVIMENTOS.join(', ')})`, 'warning')
      definirMovimento(pedido)
      try {
        gravarEstado({ movimento: pedido })
      } catch (e) {
        ctx.ui.notify(`ui-state.json não gravado: ${e instanceof Error ? e.message : e}`, 'warning')
      }
      indicador(ctx.ui)
      const ef = movimento()
      ctx.ui.notify(ef === pedido ? `Movimento: ${ef}` : `Movimento: ${ef} (o ambiente pede ${ef}; ${pedido} fica salvo)`, 'info')
    },
  })
  pi.on('session_start', (_event, ctx) => {
    definirMovimento(movimentoSalvo())
    if (!ctx.hasUI) return
    if (noColor()) {
      // Objeto, não nome: setTheme(nome) grava `theme` em settings.json e tira a cor de todas as sessões seguintes.
      const mono = ctx.ui.getTheme('mono')
      const r = mono ? ctx.ui.setTheme(mono) : { success: false, error: 'tema não encontrado' }
      if (!r.success) ctx.ui.notify(`NO_COLOR: tema mono indisponível (${r.error ?? 'erro'})`, 'warning')
      ctx.ui.setHeader((tui) => plainHeader(tui))
    }
    if (movimento() !== 'normal') ctx.ui.setWorkingIndicator({ frames: ['●'] })
  })
}
