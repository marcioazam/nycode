/**
 * Agregador de uso para /team-onboarding. Lê os JSONL de sessão do pi (`$PI_CODING_AGENT_DIR/sessions`) e devolve
 * SOMENTE contagens: nomes de ferramenta, nomes de comando, servidores MCP e categoria de modelo. Nunca devolve texto de
 * mensagem, argumentos de ferramenta, caminhos, e-mails ou tokens; sem chamada de modelo nem de rede.
 * Resultado parcial é declarado (`complete: false` + `truncated`), nunca apresentado como completo. A listagem de
 * diretórios também é limitada (diretórios, entradas, prazo) e falhas de leitura/stat são contadas, nunca ignoradas.
 * Contagem de comandos = só mensagens de USUÁRIO gravadas que começam com `/nome`; comandos nativos consumidos pelo pi
 * não viram turno de usuário e não aparecem: não é histórico completo de uso de comandos.
 */
import { closeSync, lstatSync, opendirSync, openSync, readSync, realpathSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const LIMITS = { days: 30, maxFiles: 500, maxFileBytes: 8 << 20, maxTotalBytes: 64 << 20, maxMs: 5000, maxKeys: 50, maxEntries: 20_000, maxDirs: 1000 } as const
/** Faixa aceita por limite (inteiros finitos); fora dela, `collectUsage` lança antes de alocar buffer ou calcular data. */
const RANGE: Record<keyof typeof LIMITS, readonly [number, number]> = {
  days: [1, 365], maxFiles: [1, 5000], maxFileBytes: [1, 64 << 20], maxTotalBytes: [1, 512 << 20],
  maxMs: [1, 60_000], maxKeys: [1, 500], maxEntries: [1, 100_000], maxDirs: [1, 5000],
}
const DAY = 86_400_000
const SAFE_NAME = /^[A-Za-z0-9_.:-]{1,64}$/
// primeiro token apenas; `/home/foo` é caminho (a barra interna impede o casamento)
const COMMAND = /^\/([a-z0-9][a-z0-9:_-]{0,39})(?:\s|$)/i
// `/home`, `/etc x`… são raízes de caminho, não comandos
const PATH_ROOTS = new Set(['home', 'etc', 'usr', 'var', 'tmp', 'opt', 'root', 'bin', 'sbin', 'dev', 'proc', 'sys', 'mnt', 'srv', 'lib', 'run', 'boot', 'media'])
const MCP = /^mcp__([A-Za-z0-9_-]{1,40}?)__/
// nomes que parecem credencial (prefixos conhecidos, JWT, hex longo) viram `(invalid)`
const CREDENTIAL = /sk-[A-Za-z0-9_-]{8,}|gh[pousr]_[A-Za-z0-9]{8,}|github_pat_|xox[abprs]-|AKIA[0-9A-Z]{8,}|eyJ[A-Za-z0-9_-]{8,}|[A-Fa-f0-9]{32,}/

export interface Usage {
  schema: 1
  complete: boolean
  truncated: string[]
  window: { days: number; from: string; to: string }
  files: { seen: number; read: number; outsideWindow: number; unreadable: number; oversize: number; statFailed: number }
  dirs: { seen: number; unreadable: number; entries: number }
  lines: { read: number; corrupt: number; badTimestamp: number; outsideWindow: number }
  sessions: number
  tools: Record<string, number>
  commands: Record<string, number>
  mcp: Record<string, number>
  models: Record<string, number>
  notes: string[]
}

export interface Deps { dir: string; now: () => number; limits?: Partial<Record<keyof typeof LIMITS, number>> }

/** Categoria a partir do id do modelo; o id/provedor completo nunca sai. */
export function modelCategory(model: unknown): string {
  const m = typeof model === 'string' ? model.toLowerCase() : ''
  for (const k of ['opus', 'sonnet', 'haiku']) if (m.includes(k)) return k
  if (m.includes('claude')) return 'claude-other'
  if (/gpt|(^|[/-])o\d|codex/.test(m)) return 'gpt'
  if (m.includes('gemini')) return 'gemini'
  return 'other'
}

function bump(map: Record<string, number>, key: string, max: number): void {
  const k = Object.hasOwn(map, key) || Object.keys(map).length < max ? key : '(other)'
  map[k] = (map[k] ?? 0) + 1
}

function userText(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  const t = content.find((c) => c?.type === 'text' && typeof c.text === 'string')
  return t ? t.text : ''
}

interface Listing { files: string[]; dirs: number; dirsUnreadable: number; entries: number; statFailed: number; cut: string[] }

/** Percorre `root` (profundidade ≤2) limitando diretórios, entradas e prazo; falhas são contadas, nunca engolidas. */
function listJsonl(root: string, L: Record<keyof typeof LIMITS, number>, now: () => number, start: number): Listing {
  const r: Listing = { files: [], dirs: 0, dirsUnreadable: 0, entries: 0, statFailed: 0, cut: [] }
  const cut = (why: string): void => { if (!r.cut.includes(why)) r.cut.push(why) }
  const stop = (): boolean => r.cut.some((c) => c !== 'maxFiles')
  const walk = (dir: string, depth: number): void => {
    if (stop()) return
    if (r.dirs >= L.maxDirs) { cut('maxDirs'); return }
    r.dirs++
    const names: string[] = []
    try {
      const d = opendirSync(dir)
      try {
        for (;;) {
          if (r.entries >= L.maxEntries) { cut('maxEntries'); break }
          if (now() - start > L.maxMs) { cut('maxMs'); break }
          const e = d.readSync()
          if (!e) break
          r.entries++
          names.push(e.name)
        }
      } finally { d.closeSync() }
    } catch { r.dirsUnreadable++ }
    for (const n of names.sort()) {
      if (r.files.length > L.maxFiles) { cut('maxFiles'); return }
      const p = join(dir, n)
      let st
      try { st = lstatSync(p) } catch { r.statFailed++; continue } // lstat: symlinks são ignorados
      if (st.isDirectory() && depth < 2) walk(p, depth + 1)
      else if (st.isFile() && n.endsWith('.jsonl')) r.files.push(p)
      if (stop()) return
    }
  }
  walk(root, 0)
  if (r.files.length > L.maxFiles) { cut('maxFiles'); r.files = r.files.slice(0, L.maxFiles) }
  return r
}

function readCapped(path: string, size: number): string | undefined {
  let fd: number | undefined
  try {
    fd = openSync(path, 'r')
    const buf = Buffer.alloc(size) // size já validado ≤ maxFileBytes
    let n = 0
    while (n < size) {
      const k = readSync(fd, buf, n, size - n, n)
      if (k === 0) break
      n += k
    }
    return buf.subarray(0, n).toString('utf8')
  } catch { return undefined } finally { if (fd !== undefined) closeSync(fd) }
}

/** Valida e mescla limites: só chaves conhecidas, inteiros finitos dentro da faixa; nunca opção silenciosamente ilimitada. */
export function resolveLimits(over?: Partial<Record<keyof typeof LIMITS, number>>): Record<keyof typeof LIMITS, number> {
  const L: Record<string, number> = { ...LIMITS }
  for (const [k, v] of Object.entries(over ?? {})) {
    if (v === undefined) continue
    const range = (RANGE as Record<string, readonly [number, number]>)[k]
    if (!range) throw new RangeError(`unknown limit: ${k}`)
    if (typeof v !== 'number' || !Number.isInteger(v) || v < range[0] || v > range[1]) throw new RangeError(`invalid limit: ${k}`)
    L[k] = v
  }
  return L as Record<keyof typeof LIMITS, number>
}

/** Nome seguro para chave de contagem; credencial plausível ou formato inválido vira `(invalid)`. */
function safeKey(name: string): string { return SAFE_NAME.test(name) && !CREDENTIAL.test(name) ? name : '(invalid)' }

export function collectUsage(d: Deps): Usage {
  const L = resolveLimits(d.limits)
  const start = d.now()
  if (!Number.isFinite(start)) throw new RangeError('invalid clock')
  const from = start - L.days * DAY
  const u: Usage = {
    schema: 1, complete: true, truncated: [],
    window: { days: L.days, from: new Date(from).toISOString(), to: new Date(start).toISOString() },
    files: { seen: 0, read: 0, outsideWindow: 0, unreadable: 0, oversize: 0, statFailed: 0 },
    dirs: { seen: 0, unreadable: 0, entries: 0 },
    lines: { read: 0, corrupt: 0, badTimestamp: 0, outsideWindow: 0 },
    sessions: 0, tools: {}, commands: {}, mcp: {}, models: {},
    notes: ['commands: só mensagens de usuário gravadas que começam com /nome; comandos nativos consumidos pelo pi não são registrados como turno, então isto NÃO é o histórico completo de comandos'],
  }
  const cut = (why: string): void => { if (!u.truncated.includes(why)) u.truncated.push(why) }
  const listing = listJsonl(d.dir, L, d.now, start)
  const { files } = listing
  for (const why of listing.cut) cut(why)
  u.dirs = { seen: listing.dirs, unreadable: listing.dirsUnreadable, entries: listing.entries }
  u.files.statFailed = listing.statFailed
  let bytes = 0
  for (const f of files) {
    u.files.seen++
    if (d.now() - start > L.maxMs) { cut('maxMs'); break }
    let st
    try { st = lstatSync(f) } catch { u.files.unreadable++; continue }
    if (st.mtimeMs < from) { u.files.outsideWindow++; continue }
    if (st.size > L.maxFileBytes) { u.files.oversize++; cut('oversizeFile'); continue }
    if (bytes + st.size > L.maxTotalBytes) { cut('maxTotalBytes'); break }
    const text = readCapped(f, st.size)
    if (text === undefined) { u.files.unreadable++; continue }
    bytes += st.size
    u.files.read++
    let counted = false
    let seenLines = 0
    for (const line of text.split('\n')) {
      if (!line.trim()) continue
      if (++seenLines % 256 === 0 && d.now() - start > L.maxMs) { cut('maxMs'); break }
      u.lines.read++
      let e: any
      try { e = JSON.parse(line) } catch { u.lines.corrupt++; continue }
      if (e?.type !== 'message' || !e.message || typeof e.message !== 'object') continue
      const ts = typeof e.timestamp === 'string' ? Date.parse(e.timestamp) : NaN
      if (Number.isNaN(ts)) { u.lines.badTimestamp++; continue }
      if (ts < from || ts > start + DAY) { u.lines.outsideWindow++; continue }
      counted = true
      const m = e.message
      if (m.role === 'user') {
        const c = COMMAND.exec(userText(m.content).trimStart())
        if (c) if (!PATH_ROOTS.has(c[1]!.toLowerCase())) bump(u.commands, safeKey(c[1]!.toLowerCase()), L.maxKeys)
      } else if (m.role === 'assistant') {
        bump(u.models, modelCategory(m.model), L.maxKeys)
        for (const b of Array.isArray(m.content) ? m.content : []) {
          if (b?.type !== 'toolCall' || typeof b.name !== 'string') continue
          const mcp = MCP.exec(b.name)
          if (mcp) bump(u.mcp, safeKey(mcp[1]!), L.maxKeys)
          else bump(u.tools, safeKey(b.name), L.maxKeys)
        }
      }
    }
    if (counted) u.sessions++
  }
  if (u.lines.corrupt) cut('corruptLines')
  if (u.lines.badTimestamp) cut('badTimestamp')
  if (u.files.unreadable) cut('unreadableFile')
  if (u.files.statFailed) cut('statFailed')
  if (u.dirs.unreadable) cut('unreadableDir')
  u.complete = u.truncated.length === 0
  return u
}

export function main(env: NodeJS.ProcessEnv = process.env, now: () => number = Date.now, out: (s: string) => void = (s) => void process.stdout.write(s)): number {
  const dir = join(env.PI_CODING_AGENT_DIR || join(homedir(), '.pi', 'agent'), 'sessions')
  out(`${JSON.stringify(collectUsage({ dir, now }), null, 2)}\n`)
  return 0
}

/** Entrada direta: compara realpath, pois o helper é invocado por um symlink instalado (argv[1]) e o módulo resolve ao real. */
export function isEntry(argv1: string | undefined, metaUrl: string): boolean {
  if (!argv1) return false
  try { return realpathSync(argv1) === realpathSync(fileURLToPath(metaUrl)) } catch { return false }
}

if (isEntry(process.argv[1], import.meta.url)) process.exitCode = main()
