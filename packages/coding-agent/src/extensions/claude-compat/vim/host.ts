/**
 * Ponte entre o motor Vim e o editor do pi-tui, só por API pública. Movimento, delete e undo usam as ações semânticas do
 * patch editor-actions (`runEditorAction`, `withUndoGroup`), independentes das teclas que o usuário remapeou.
 * Sem a API a edição falha de forma explícita, antes de qualquer mutação.
 */
import { VimError, type VimHost } from './engine.ts'
import { activeMarkerIds, Buf } from './text.ts'

export type EditorAction = 'left' | 'right' | 'deleteForward' | 'undo'

export interface EditorLike {
  getText(): string
  getExpandedText(): string
  getCursor(): { line: number; col: number }
  setText(text: string): void
  insertTextAtCursor(text: string): void
  /** Entrada nativa só para texto digitado e ↑/↓ do histórico (não para movimento, delete nem undo). */
  key(seq: string): void
  /** API pública do patch editor-actions; ausente no pi sem o patch. */
  runEditorAction?: (action: EditorAction) => void
  /** Agrupa a edição síncrona em um único passo de undo, preservando undo anterior e conteúdo colado. */
  withUndoGroup?: <T>(edit: () => T) => T
}

/** Máximo de passos nativos (movimento + delete) por comando; acima disso nada é alterado. */
export const MAX_OPS = 20_000
const NO_API = 'Vim precisa do patch editor-actions do pi (runEditorAction/withUndoGroup ausentes); nada foi alterado.'

export class EditorHost implements VimHost {
  private readonly ed: EditorLike
  private readonly openHistory: () => void
  private readonly notify: (message: string) => void

  constructor(ed: EditorLike, openHistory: () => void, notify: (message: string) => void = () => {}) {
    this.ed = ed
    this.openHistory = openHistory
    this.notify = notify
  }

  /** Falha antes de mutar quando o pi não traz a API pública. */
  private api(): { run: (a: EditorAction) => void; group: <T>(f: () => T) => T } {
    const run = this.ed.runEditorAction, group = this.ed.withUndoGroup
    if (typeof run !== 'function' || typeof group !== 'function') throw new VimError(NO_API)
    return { run, group }
  }

  /** Antes de qualquer E/S nativa: a API existe? */
  assertReady(): void { this.api() }

  text(): string { return this.ed.getText() }
  now(): number { return Date.now() }
  history(): void { this.openHistory() }
  warn(message: string): void { this.notify(message) }
  markerIds(): ReadonlySet<string> { return activeMarkerIds(this.ed.getText(), this.ed.getExpandedText()) }

  cursor(): number {
    const { line, col } = this.ed.getCursor()
    const lines = this.ed.getText().split('\n')
    let o = 0
    for (let i = 0; i < line && i < lines.length; i++) o += lines[i]!.length + 1
    return o + col
  }

  send(seq: string): void {
    if (seq === '\x7f') { // backspace semântico: ← e delete-para-frente
      const { run } = this.api()
      run('left')
      run('deleteForward')
      return
    }
    this.ed.key(seq)
  }

  private steps(b: Buf, from: number, to: number): number { return b.between(from, to) }

  private guard(total: number, what: string): void {
    if (total > MAX_OPS) throw new VimError(`Vim: ${what} exige ${total} passos (limite ${MAX_OPS}); nada foi alterado.`)
  }

  private walk(run: (a: EditorAction) => void, b: Buf, from: number, to: number): void {
    const action = to < from ? 'left' : 'right'
    for (let i = this.steps(b, from, to); i > 0; i--) run(action)
  }

  private verifyCursor(target: number): void {
    const at = this.cursor()
    if (at !== target) throw new VimError(`Vim: o cursor ficou em ${at}, esperado ${target} (marcador ambíguo?); o texto não foi alterado por esta etapa.`)
  }

  moveTo(target: number): void {
    const { run } = this.api()
    const b = new Buf(this.ed.getText(), this.markerIds())
    const from = this.cursor()
    this.guard(this.steps(b, from, target), 'movimento')
    this.walk(run, b, from, target)
    this.verifyCursor(target)
  }

  /**
   * Sem marcadores ativos: setText (conteúdo colado inexistente, nada a perder). Com marcadores setText apagaria o
   * conteúdo colado, então só o trecho mudado é apagado/inserido pelas primitivas nativas. Tudo em um grupo de undo.
   */
  edit(text: string, cursor: number): void {
    const api = this.api()
    const old = this.ed.getText()
    if (old === text) return this.moveTo(cursor)
    const ids = this.markerIds()
    const ob = new Buf(old, ids), nb = new Buf(text, ids)
    if (!ids.size) {
      this.guard(this.steps(nb, text.length, cursor), 'edição')
      api.group(() => {
        this.ed.setText(text)
        this.walk(api.run, nb, text.length, cursor)
      })
    } else {
      const max = Math.min(old.length, text.length)
      let p = 0
      while (p < max && old[p] === text[p]) p++
      while (p > 0 && !(ob.has(p) && nb.has(p))) p--
      let s = 0
      while (s < max - p && old[old.length - 1 - s] === text[text.length - 1 - s]) s++
      while (s > 0 && !(ob.has(old.length - s) && nb.has(text.length - s))) s--
      const oe = old.length - s, ne = text.length - s
      const from = this.cursor()
      const dels = this.steps(ob, p, oe)
      this.guard(this.steps(ob, from, p) + dels + 1 + this.steps(nb, ne, cursor), 'edição com conteúdo colado')
      api.group(() => {
        this.walk(api.run, ob, from, p)
        for (let i = 0; i < dels; i++) api.run('deleteForward')
        const ins = text.slice(p, ne)
        if (ins) this.ed.insertTextAtCursor(ins)
        this.walk(api.run, nb, ne, cursor)
      })
    }
    if (this.ed.getText() !== text) {
      api.run('undo') // o grupo inteiro volta; nunca deixa edição no lugar errado
      throw new VimError('Vim: a edição não produziu o texto esperado e foi desfeita.')
    }
    this.verifyCursor(cursor)
  }

  /** `u`: o undo nativo desfaz o grupo inteiro do comando Vim. */
  undo(count: number): void {
    const { run } = this.api()
    for (let i = 0; i < count; i++) run('undo')
  }
}
