/**
 * Todo bloco com fundo do chat respeita a margem do texto (outputPad), pedido do usuário 2026-11-15: usuário, tools,
 * mensagens de extensão, resumos e `!bash` pintavam o fundo de ponta a ponta enquanto o texto e os blocos de código
 * ficavam dentro da margem. Embrulha `render`/`handleMouse` dos componentes exportados do pi: o bloco renderiza na
 * largura interna e ganha a margem sem fundo dos dois lados. Réguas, avisos soltos e recursos carregados: hookDocument. Erro e
 * interrupção (dentro da mensagem do assistente) ficam em patches/pi-core/avisos.
 * Reverter: apagar este diretório.
 */
import {
  BashExecutionComponent, BranchSummaryMessageComponent, CompactionSummaryMessageComponent, CustomMessageComponent, DynamicBorder,
  SkillInvocationMessageComponent, ToolExecutionComponent, UserMessageComponent, type ExtensionAPI,
} from '@earendil-works/pi-coding-agent'
import { isImageLine } from '@earendil-works/pi-tui'
import { hookContainer, innerWidth, MIN_INNER, inset, insetMouse, lead, mesmaSaida, padOf, RECUO, wrapInstance } from './inset.ts'

const KEY = Symbol.for('pi-harness.chat-margin')
type Orig = { proto: any, render: any, handleMouse: any, ownRender: boolean, ownMouse: boolean }
const g = globalThis as any
const state: { origs: Orig[], pad: number, unhook?: (() => void)[] } = (g[KEY] ??= { origs: [], pad: 1 })
state.pad ??= 1

const CLASSES = [
  UserMessageComponent, ToolExecutionComponent, CustomMessageComponent, CompactionSummaryMessageComponent,
  BranchSummaryMessageComponent, SkillInvocationMessageComponent, BashExecutionComponent,
]

function restore(): void {
  for (const o of state.origs) {
    if (o.ownRender) o.proto.render = o.render
    else delete o.proto.render
    if (o.ownMouse) o.proto.handleMouse = o.handleMouse
    else delete o.proto.handleMouse
  }
  state.origs = []
}

// Blocos com fundo do core cujo padding interno nativo é só outputPad (1): ganham RECUO simétrico dos dois lados
// (branch, skill, mensagem de extensão na caixa padrão e tool sem definição). A do usuário saiu (dono, 2026-11-19: quase
// sem padding lateral, só o do Markdown).
const RECUADOS = new Set<any>([BranchSummaryMessageComponent.prototype, SkillInvocationMessageComponent.prototype])
const recuoDe = (self: any, proto: any): number => {
  if (RECUADOS.has(proto)) return RECUO
  if (proto === CustomMessageComponent.prototype && !self?.customComponent) return RECUO
  if (proto === ToolExecutionComponent.prototype && typeof self?.hasRendererDefinition === 'function' && !self.hasRendererDefinition()) return RECUO
  return 0
}

function wrap(proto: any): void {
  const has = (k: string) => Object.prototype.hasOwnProperty.call(proto, k)
  const o: Orig = { proto, render: proto.render, handleMouse: proto.handleMouse, ownRender: has('render'), ownMouse: has('handleMouse') }
  if (typeof o.render !== 'function') return
  state.origs.push(o)
  proto.render = function (width: number) {
    const p = padOf(this)
    const w = innerWidth(width, p)
    const r = recuoDe(this, proto)
    const recua = r > 0 && w - 2 * r >= MIN_INNER
    const src = o.render.call(this, recua ? w - 2 * r : w)
    if (!recua && w === width) return src
    return mesmaSaida(this, `${width}|${p}|${recua ? r : 0}`, src, (ls) => {
      const lines = recua ? lead(ls, r, isImageLine) : ls
      return w === width ? [...lines] : inset(lines, p, isImageLine)
    })
  }
  if (typeof o.handleMouse !== 'function') return
  proto.handleMouse = function (event: any) {
    const base = insetMouse(event, padOf(this))
    if (base === undefined) return undefined
    const e = base ?? event
    const r = recuoDe(this, proto)
    if (r && e.width - 2 * r >= MIN_INNER) {
      const iw = e.width - 2 * r
      return o.handleMouse.call(this, { ...e, x: Math.min(Math.max(0, e.x - r), iw - 1), width: iw })
    }
    return o.handleMouse.call(this, e)
  }
}

// Filhos diretos do chat fora de CLASSES: as réguas do core (What's New, atalhos, atualização), os objetos simples dos
// runtimes do harness (recarregado, caixa de memória, divisor de sessão retomada) e as classes que o pi não exporta
// (entrada de sessão com renderer de extensão, anúncio). Embrulho por instância, marcado.
const UNEXPORTED = new Set(['CustomEntryComponent', 'EarendilAnnouncementComponent'])
const isLoose = (c: any) => c instanceof DynamicBorder || Object.getPrototypeOf(c) === Object.prototype || UNEXPORTED.has(c?.constructor?.name)
const pad = () => state.pad

/** Documento = 1º filho do TUI: cabeçalho, recursos carregados, chat. Os recursos carregados ([Context], [Skills], avisos
 * de extensão) vêm com padding 0 do core: todos os filhos ganham a margem. No chat, só os filhos soltos (isLoose). */
function hookDocument(tui: any): void {
  const doc = tui?.children?.[0]
  const resources = doc?.children?.[1], chat = doc?.children?.[2]
  const ok = (c: any) => c && Array.isArray(c.children) && typeof c.render === 'function'
  if (!ok(resources) || !ok(chat)) return
  for (const undo of state.unhook ?? []) undo()
  state.unhook = [
    hookContainer(resources, (c) => wrapInstance(c, pad, isImageLine)),
    hookContainer(chat, (c) => { if (c && isLoose(c)) wrapInstance(c, pad, isImageLine) }),
  ]
}

export default function (pi: ExtensionAPI) {
  restore() // /reload: tira o embrulho da carga anterior antes de pôr o novo
  for (const C of CLASSES) if (C?.prototype) wrap(C.prototype)
  pi.on('session_start', (_e, ctx) => {
    try { state.pad = (pi.getSettings() as any).outputPad === 0 ? 0 : 1 } catch { state.pad = 1 } // padrão do pi: 1
    if (!ctx.hasUI) return
    ctx.ui.setWidget('chat-margin', (tui: any) => {
      hookDocument(tui)
      return { render: () => [], invalidate: () => {} }
    })
  })
}
