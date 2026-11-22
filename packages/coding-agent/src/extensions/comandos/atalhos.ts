/** /atalhos: ação · tecla · origem · marca; filtro ao digitar, Enter = detalhe, r = nova tecla (checa colisão, grava com .bak, recarrega). */

import { join } from 'node:path'
import { getAgentDir } from '@earendil-works/pi-coding-agent'
import { matchesKey, parseKey, truncateToWidth, visibleWidth } from '@earendil-works/pi-tui'
import { editKeybindings } from '../dev-commands/keybindings.ts'
import { rule, MAX_ROWS, type ThemeLike } from '../folha/sheet.ts'
import { CONTEXTS } from './catalog.ts'
import { OVERLAY } from './painel.ts'
import { canonica, fmtTecla, gravarMudancas, montarLinhas, norm, type KbLike, type Linha } from './teclas.ts'

export type Resultado = { mudancas: Record<string, string | string[]> } | { json: true } | undefined
type Entrada = { json: true } | Linha
const isJson = (e: Entrada): e is { json: true } => 'json' in e
const JSON_ROTULO = 'Editar JSON (avançado) · /keybindings'
const pad = (s: string, w: number) => s + ' '.repeat(Math.max(0, w - visibleWidth(s)))
const teclasDe = (l: Linha) => l.teclas.map(fmtTecla).join(' ou ') || 'sem tecla'
/** Quebra por palavras em `w` colunas. */
function quebrar(texto: string, w: number): string[] {
  const out: string[] = []
  let atual = ''
  for (const p of texto.split(' ')) {
    if (atual && visibleWidth(`${atual} ${p}`) > w) { out.push(atual); atual = p } else atual = atual ? `${atual} ${p}` : p
  }
  return atual ? [...out, atual] : out
}

// Ordem de menu: o que pede atenção, depois o mais usado; edição e movimento do editor por último.
const ORDEM_APP = ['app.model.select', 'app.thinking.toggle', 'app.thinking.cycle', 'app.model.cycleForward', 'app.model.cycleBackward', 'app.tools.expand', 'app.message.followUp', 'app.message.dequeue', 'app.message.copy', 'app.session.new', 'app.session.tree', 'app.session.fork', 'app.session.resume', 'app.editor.external', 'app.clipboard.pasteImage', 'app.interrupt', 'app.clear', 'app.suspend', 'app.exit']
const CTX_ORDEM = ['seletores', 'sessões', 'modelos', 'árvore', 'tela cheia', 'subagentes']
const ATENCAO = 'Atenção: conflitos e Alt'
/** [ordem da seção, título] da linha. */
function secao(l: Linha): [number, string] {
  if (l.marca === 'conflito' || (l.alt && !l.altOk)) return [0, ATENCAO]
  if (l.contexto !== 'editor') return [10 + CTX_ORDEM.indexOf(l.contexto), CONTEXTS[l.contexto]]
  if (l.origem === 'extensão' || l.origem === 'harness') return [3, 'Harness e extensões']
  if (l.id.startsWith('tui.')) return [4, 'Edição e movimento do editor']
  return [1, 'Ações do app']
}
const prioridade = (l: Linha) => { const i = ORDEM_APP.indexOf(l.id); return i < 0 ? ORDEM_APP.length : i }
/** Linhas na ordem de menu (estável dentro da mesma seção e prioridade). */
function ordenar(linhas: Linha[]): Linha[] {
  return linhas.map((l, i) => ({ l, i, s: secao(l)[0] })).sort((a, b) => a.s - b.s || prioridade(a.l) - prioridade(b.l) || a.i - b.i).map((x) => x.l)
}
const resumo = (ls: Linha[]) => `${ls.length} ações · ${ls.filter((l) => l.marca === 'conflito').length} conflitos · ${ls.filter((l) => l.alt).length} com Alt`
const aspas = (xs: string[]) => xs.map((x) => `“${x}”`).join(', ')

export class Atalhos {
  private filtro = ''
  private ativo = 0
  private modo: 'lista' | 'detalhe' | 'captura' = 'lista'
  private msg = ''
  private pendente: { tecla: string; id: string; colide: Linha[] } | undefined

  private readonly t: ThemeLike
  private readonly linhas: Linha[]
  private readonly done: (v?: Resultado) => void
  private readonly redraw: () => void

  constructor(t: ThemeLike, linhas: Linha[], done: (v?: Resultado) => void, redraw: () => void) {
    this.t = t
    this.linhas = linhas
    this.done = done
    this.redraw = redraw
  }

  private entradas(): Entrada[] {
    const f = this.filtro.toLowerCase()
    const casa = (s: string) => !f || s.toLowerCase().includes(f)
    const rows = ordenar(this.linhas).filter((l) => casa(`${l.rotulo} ${l.id} ${l.teclas.map(fmtTecla).join(' ')} ${l.origem} ${CONTEXTS[l.contexto]} ${l.marca ?? ''}`))
    return [...rows, ...(casa(JSON_ROTULO) ? [{ json: true } as const] : [])]
  }

  private atual(): Entrada | undefined {
    const e = this.entradas()
    return e[Math.min(this.ativo, e.length - 1)]
  }

  private colisoes(id: string, tecla: string, contexto: Linha['contexto']): Linha[] {
    return this.linhas.filter((l) => l.id !== id && l.contexto === contexto && l.teclas.some((k) => norm(k) === norm(tecla)))
  }

  handleInput(data: string): void {
    if (this.modo === 'captura') return this.capturar(data)
    if (this.modo === 'detalhe') {
      const l = this.atual()
      if (matchesKey(data, 'escape') || matchesKey(data, 'ctrl+c')) { this.modo = 'lista'; this.msg = ''; return this.redraw() }
      if (data === 'r' && l && !isJson(l)) {
        if (l.fixa) this.msg = `Tecla fixa (${l.origem}): não muda por aqui.`
        else { this.modo = 'captura'; this.msg = ''; this.pendente = undefined }
        this.redraw()
      }
      return
    }
    if (matchesKey(data, 'escape') || matchesKey(data, 'ctrl+c')) {
      if (this.filtro) { this.filtro = ''; this.ativo = 0; return this.redraw() }
      return this.done(undefined)
    }
    if (matchesKey(data, 'enter')) {
      const e = this.atual()
      if (!e) return
      if (isJson(e)) return this.done({ json: true })
      this.modo = 'detalhe'
      return this.redraw()
    }
    const n = this.entradas().length
    if (matchesKey(data, 'up')) this.ativo = Math.max(0, this.ativo - 1)
    else if (matchesKey(data, 'down')) this.ativo = Math.min(n - 1, this.ativo + 1)
    else if (matchesKey(data, 'backspace')) { this.filtro = this.filtro.slice(0, -1); this.ativo = 0 }
    else if (data.length === 1 && data.charCodeAt(0) >= 32 && data.charCodeAt(0) !== 127) { this.filtro += data; this.ativo = 0 }
    else return
    this.redraw()
  }

  private capturar(data: string): void {
    const l = this.atual()
    if (!l || isJson(l)) return
    if (this.pendente && data === 's') {
      if (this.pendente.colide.some((c) => c.fixa)) return // bloqueada: só esc ou outra tecla
      const { tecla, colide } = this.pendente
      const mudancas: Record<string, string | string[]> = { [l.id]: tecla }
      for (const c of colide) mudancas[c.id] = c.teclas.filter((k) => norm(k) !== norm(tecla))
      return this.done({ mudancas })
    }
    if (matchesKey(data, 'escape') || matchesKey(data, 'ctrl+c')) { this.modo = 'detalhe'; this.msg = ''; this.pendente = undefined; return this.redraw() }
    const bruta = parseKey(data)
    const tecla = bruta && canonica(bruta)
    if (!tecla) { this.msg = 'Tecla não reconhecida; tente outra ou esc cancela.'; return this.redraw() }
    const colide = this.colisoes(l.id, tecla, l.contexto)
    if (!colide.length) return this.done({ mudancas: { [l.id]: tecla } })
    this.pendente = { tecla, id: l.id, colide }
    const quem = `${fmtTecla(tecla)} já é ${aspas(colide.map((c) => c.rotulo))} neste contexto.`
    this.msg = colide.some((c) => c.fixa) ? `${quem} É fixa (extensão): não dá para substituir; esc cancela.` : `${quem} s substitui · esc cancela`
    this.redraw()
  }

  private detalhe(l: Linha): string[] {
    const out = [`Tecla: ${teclasDe(l)}`, `Origem: ${l.origem}`]
    out.push(l.fixa ? 'Tecla tratada pelo harness: não muda por aqui.' : `Padrão do pi: ${l.padrao.map(fmtTecla).join(' ou ') || 'sem tecla'}`)
    if (l.marca === 'conflito') out.push(`▲ Conflito: a mesma tecla também é ${aspas(l.outros)} no mesmo contexto.`)
    if (l.marca === 'intencional') out.push(`Intencional: divide a tecla com ${aspas(l.outros)} (o editor decide pelo estado).`)
    if (l.alt) out.push('⌥ Usa Alt: no macOS a Option compõe caracteres em alguns terminais.')
    return out
  }

  render(width: number): string[] {
    const { t } = this
    const dim = (s: string) => t.fg('dim', s)
    const fit = (s: string) => pad(truncateToWidth(s, width, '…'), width)
    const l = this.atual()
    if (this.modo !== 'lista' && l && !isJson(l)) {
      const corpo = this.modo === 'captura' ? ['Pressione a nova tecla (substitui as atuais).', ...(this.msg ? [this.msg] : [])] : [...this.detalhe(l), ...(this.msg ? [this.msg] : [])]
      const rodape = this.modo === 'captura' ? 'pressione a nova tecla · esc cancela' : l.fixa ? 'esc voltar' : 'r nova tecla · esc voltar'
      return [rule(t, width, l.rotulo, CONTEXTS[l.contexto]), ...corpo.flatMap((x) => quebrar(x, width - 4)).map((x) => fit(`   ${x}`)), fit(dim(` ${rodape}`)), rule(t, width)]
    }
    const linhas: { texto: string; ativa?: boolean }[] = []
    let ctx = ''
    let ativaIdx = 0
    this.entradas().forEach((e, i) => {
      const grupo = isJson(e) ? 'Avançado' : secao(e)[1]
      if (grupo !== ctx) { ctx = grupo; linhas.push({ texto: fit(dim(` ${grupo}`)) }) }
      const ativa = i === Math.min(this.ativo, this.entradas().length - 1)
      if (ativa) ativaIdx = linhas.length
      const esq = isJson(e) ? JSON_ROTULO : e.rotulo
      const dir = isJson(e) ? '' : `${teclasDe(e)}  ${e.origem}${e.marca === 'conflito' ? '  ▲ conflito' : e.marca === 'intencional' ? '  intencional' : ''}${e.alt ? `  ⌥ usa Alt${e.altOk ? ' · intencional' : ''}` : ''}`
      const r = visibleWidth(dir)
      const left = truncateToWidth(esq, Math.max(1, width - 4 - (r ? r + 2 : 0)), '…')
      const corpo = left + (dir ? ' '.repeat(Math.max(1, width - 4 - visibleWidth(left) - r)) + dim(dir) : '')
      linhas.push({ texto: ativa ? t.bg('selectedBg', fit(` ${t.fg('accent', '❯')} ${corpo}`)) : fit(`   ${corpo}`), ativa })
    })
    const ini = Math.max(0, Math.min(ativaIdx - Math.floor(MAX_ROWS / 2), linhas.length - MAX_ROWS))
    return [
      rule(t, width, 'Atalhos', resumo(this.linhas)),
      ...linhas.slice(ini, ini + MAX_ROWS).map((x) => x.texto),
      fit(dim(` ↑↓ escolher · ⏎ detalhe · esc fechar · ${this.filtro ? `filtro: ${this.filtro}` : 'digite para filtrar'}`)), rule(t, width),
    ]
  }

  invalidate(): void {}
}

export interface OpcoesAtalhos { arquivo?: () => string; editarJson?: (ctx: any) => Promise<void> }

export function registrarAtalhos(pi: any, opts: OpcoesAtalhos = {}): void {
  const arquivo = opts.arquivo ?? (() => join(getAgentDir(), 'keybindings.json'))
  const editarJson = opts.editarJson ?? ((ctx: any) => editKeybindings(ctx, arquivo()))
  pi.registerCommand('atalhos', {
    description: 'Ver, buscar e mudar atalhos',
    handler: async (_args: string, ctx: any) => {
      if (!ctx.hasUI) return
      const r: Resultado = await ctx.ui.custom(
        (tui: any, theme: ThemeLike, kb: KbLike, done: (v?: Resultado) => void) => new Atalhos(theme, montarLinhas(kb), done, () => tui.requestRender()),
        OVERLAY,
      )
      if (!r) return
      if ('json' in r) return editarJson(ctx)
      const { erros, avisos } = gravarMudancas(arquivo(), r.mudancas)
      if (erros.length) return ctx.ui.notify(`keybindings.json não gravado:\n${erros.join('\n')}`, 'error')
      ctx.ui.notify(`Atalho gravado em keybindings.json (backup em .bak).${avisos.length ? `\n${avisos.join('\n')}` : ''} Recarregando…`, avisos.length ? 'warning' : 'info')
      await ctx.reload()
    },
  })
}
