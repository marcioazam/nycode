/** Paleta do “/”: reescreve descrições, agrupa e esconde aliases; o filtro e o resto vêm do provider `current`. */

import { mkdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { findCommand, GROUPS, COMMANDS, type Cmd, type Group } from './catalog.ts'

interface Item { value: string; label: string; description?: string }
interface Sugestoes { items: Item[]; prefix: string }
export interface Opcoes { keyFor(act: string): string | undefined; recentes(): string[] }

// Mesmo arquivo e override de teste de extensions/ui/editor.ts (STATE_PATH / PI_UI_STATE).
const estado = () => process.env.PI_UI_STATE || join(homedir(), '.pi', 'agent', 'ui-state.json')
const MAX_RECENTES = 3

// O autocomplete lê os recentes a cada tecla: memoiza por mtime+tamanho (um stat em vez de read+parse).
const cache = new Map<string, { sig: string; valor: Record<string, unknown> }>()

function lerEstado(path: string): Record<string, unknown> {
  try {
    const st = statSync(path)
    const sig = `${st.mtimeMs}:${st.size}:${st.ino}`
    const hit = cache.get(path)
    if (hit?.sig === sig) return hit.valor
    const v: unknown = JSON.parse(readFileSync(path, 'utf8'))
    const valor = v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
    cache.set(path, { sig, valor })
    return valor
  } catch {
    return {}
  }
}

export function lerRecentes(path = estado()): string[] {
  const v = lerEstado(path).recentCommands
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, MAX_RECENTES) : []
}

/** Grava o comando do texto enviado (canônico, mais recente primeiro, até 3); texto que não é comando do catálogo é ignorado. */
export function gravarRecente(texto: string, path = estado()): void {
  const nome = /^\s*\/(\S+)/.exec(texto)?.[1]
  const achado = nome ? findCommand(nome) : undefined
  if (!achado) return
  const lista = [achado.cmd.name, ...lerRecentes(path).filter((n) => n !== achado.cmd.name)].slice(0, MAX_RECENTES)
  mkdirSync(dirname(path), { recursive: true })
  // tmp + rename: um leitor concorrente (outra sessão, editor.ts) nunca vê o arquivo truncado e apaga as outras chaves.
  const tmp = `${path}.${process.pid}.tmp`
  try {
    writeFileSync(tmp, `${JSON.stringify({ ...lerEstado(path), recentCommands: lista }, null, 2)}\n`)
    renameSync(tmp, path)
  } catch (e) {
    try { unlinkSync(tmp) } catch { /* sem temporário */ }
    throw e
  }
  cache.delete(path)
}

const ORDEM_GRUPO = new Map<Group, number>([...GROUPS, 'Outros' as const].map((g, i) => [g, i]))
const ORDEM_CMD = new Map(COMMANDS.map((c, i) => [c.name, i]))

function descricao(cmd: Cmd, o: Opcoes, extra: { alias?: boolean; recente?: boolean }): string {
  const tecla = cmd.act ? o.keyFor(cmd.act) : undefined
  const base = extra.alias ? `alias de /${cmd.name}` : cmd.desc
  const tambem = !extra.alias && cmd.aliases?.length ? ` · também ${cmd.aliases.map((a) => `/${a}`).join(' ')}` : ''
  return `${extra.recente ? 'Recente' : cmd.group} · ${base}${tambem}${tecla ? `  ${tecla}` : ''}`
}

function reescrever(r: Sugestoes, vazio: boolean, o: Opcoes): Sugestoes {
  const conhecidos = r.items.flatMap((i) => { const f = findCommand(i.value); return f ? [{ i, ...f }] : [] })
  const outros = r.items.filter((i) => !findCommand(i.value))
  if (!vazio) {
    const por = new Map(conhecidos.map((c) => [c.i, c]))
    return { ...r, items: r.items.map((i) => { const c = por.get(i); return c ? { ...i, description: descricao(c.cmd, o, { alias: c.viaAlias }) } : i }) }
  }
  const canonicos = conhecidos.filter((c) => !c.viaAlias)
  const recentes = o.recentes().flatMap((n) => canonicos.filter((c) => c.cmd.name === n)).slice(0, MAX_RECENTES)
  const resto = canonicos.filter((c) => !recentes.includes(c))
    .sort((a, b) => (ORDEM_GRUPO.get(a.cmd.group)! - ORDEM_GRUPO.get(b.cmd.group)!) || (ORDEM_CMD.get(a.cmd.name)! - ORDEM_CMD.get(b.cmd.name)!))
  const fazer = (c: (typeof canonicos)[number], recente: boolean): Item => ({ ...c.i, description: descricao(c.cmd, o, { recente }) })
  return { ...r, items: [...recentes.map((c) => fazer(c, true)), ...resto.map((c) => fazer(c, false)), ...outros] }
}

/** Provider que embrulha `current` (contrato de ctx.ui.addAutocompleteProvider). */
export function criarProvider(current: any, o: Opcoes): any {
  return {
    triggerCharacters: current.triggerCharacters,
    async getSuggestions(lines: string[], l: number, c: number, opts: unknown) {
      const antes = (lines[l] ?? '').slice(0, c)
      const r: Sugestoes | null = await current.getSuggestions(lines, l, c, opts)
      if (l !== 0 || !r || !/^\s*\/\S*$/.test(antes) || !r.prefix.startsWith('/')) return r
      return reescrever(r, antes.trim() === '/', o)
    },
    applyCompletion: (...a: unknown[]) => current.applyCompletion(...a),
    shouldTriggerFileCompletion: (...a: unknown[]) => current.shouldTriggerFileCompletion?.(...a) ?? true,
  }
}
