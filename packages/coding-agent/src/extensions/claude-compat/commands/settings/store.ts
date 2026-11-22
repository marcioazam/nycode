/**
 * Validação por chave + persistência pelo dono nativo (SettingsManager do pi: lock de arquivo, merge só dos campos
 * modificados, erros em `drainErrors`). Este módulo não tem protocolo de escrita próprio: as únicas exceções são
 * `viewMode` e `vimInsertModeRemaps` (sem setter nativo), gravada dentro do MESMO `storage.withLock` nativo.
 * Arquivo global corrompido: o gerenciador recusa gravar (erro em drainErrors) e o disco fica intacto.
 */
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { SettingsManager } from '@earendil-works/pi-coding-agent'

/** Backend de armazenamento aceito por `SettingsManager.fromStorage` (o pi 1.5.2 não exporta `SettingsStorage` na raiz). */
export type SettingsStorage = Parameters<typeof SettingsManager.fromStorage>[0]

export const THINKING_LEVELS = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'] as const
export type Thinking = (typeof THINKING_LEVELS)[number]

export function agentDir(env: NodeJS.ProcessEnv = process.env): string {
  return env.PI_CODING_AGENT_DIR || join(homedir(), '.pi', 'agent')
}

export type Native = Pick<
  SettingsManager,
  | 'getGlobalSettings' | 'flush' | 'drainErrors' | 'setTheme' | 'setTuiMode' | 'setFullscreenWheelScrollLines' | 'setEditorPaddingX'
  | 'setQuietStartup' | 'setDefaultThinkingLevel' | 'setShowCacheMissNotices' | 'setCompactionEnabled' | 'getPackages' | 'setPackages'
>
export interface Handle { sm: Native; storage: SettingsStorage }
export type Opener = (cwd: string) => Promise<Handle>

/**
 * Gerenciador real do pi (import tardio: só existe dentro do pi). O `FileSettingsStorage` nativo (lockfile + retry) não é
 * exportado na raiz do pacote, mas `SettingsManager.create` o instala em `.storage` (TS `private`, propriedade pública em
 * runtime no SDK gerenciado 1.5.2, versão fixada). Reusa-se esse mesmo storage, validado; se o formato mudar, falha fechada.
 * `projectTrusted: false`: só o settings GLOBAL é lido/gravado (nenhuma config de projeto não vetada); logo `getPackages()`
 * devolve apenas os pacotes globais e `setPackages` grava no global.
 */
export const realOpener: Opener = async (cwd) => {
  const { SettingsManager } = await import('@earendil-works/pi-coding-agent')
  const sm = SettingsManager.create(cwd, agentDir(), { projectTrusted: false })
  const storage: unknown = Reflect.get(sm, 'storage')
  if (!storage || typeof storage !== 'object' || typeof (storage as { withLock?: unknown }).withLock !== 'function') {
    throw new Error('SettingsManager.storage.withLock ausente: API interna do pi mudou (esperado SDK 1.5.2); nada foi lido nem gravado')
  }
  return { sm, storage: storage as SettingsStorage }
}

type Parsed = { ok: true; value: unknown } | { ok: false; error: string }
interface KeyDef { parse(raw: string): Parsed; apply(h: Handle, value: any): void }

const bool = (r: string): Parsed => (r === 'true' || r === 'on' ? { ok: true, value: true } : r === 'false' || r === 'off' ? { ok: true, value: false } : { ok: false, error: 'use true/false (ou on/off)' })
const oneOf = (...v: string[]) => (r: string): Parsed => (v.includes(r) ? { ok: true, value: r } : { ok: false, error: `valores: ${v.join(', ')}` })
const range = (lo: number, hi: number, auto = false) => (r: string): Parsed => {
  if (auto && r === 'auto') return { ok: true, value: 'auto' }
  const n = Number(r)
  return r.trim() !== '' && Number.isInteger(n) && n >= lo && n <= hi ? { ok: true, value: n } : { ok: false, error: `inteiro de ${lo} a ${hi}${auto ? ' ou auto' : ''}` }
}

export const MAX_REMAPS = 8
const printable2 = /^[\x21-\x7e]{2}$/

/** Contrato público `settings.json.vimInsertModeRemaps`: lista ["jj"] ou objeto {"jj":"<Esc>"}; 2 caracteres imprimíveis → <Esc> apenas. Gravado como objeto. */
export function parseRemaps(raw: string): Parsed {
  let v: unknown
  try {
    v = JSON.parse(raw)
  } catch {
    return { ok: false, error: 'JSON inválido (use ["jj"] ou {"jj":"<Esc>"})' }
  }
  const pairs: [string, unknown][] | undefined = Array.isArray(v) ? v.map((k) => [k as string, '<Esc>']) : v && typeof v === 'object' ? Object.entries(v) : undefined
  if (!pairs) return { ok: false, error: 'esperado lista ou objeto' }
  if (pairs.length > MAX_REMAPS) return { ok: false, error: `no máximo ${MAX_REMAPS} pares` }
  const out: Record<string, '<Esc>'> = {}
  for (const [k, a] of pairs) {
    if (typeof k !== 'string' || !printable2.test(k)) return { ok: false, error: `"${String(k)}": use exatamente 2 caracteres imprimíveis sem espaço` }
    if (a !== '<Esc>') return { ok: false, error: `"${k}": só <Esc> é permitido como destino` }
    if (Object.hasOwn(out, k)) return { ok: false, error: `"${k}" duplicado` }
    out[k] = '<Esc>'
  }
  return { ok: true, value: out }
}

/** Chave (pontos = objeto aninhado) → validador + setter NATIVO. Só estas são graváveis. */
export const KEYS: Readonly<Record<string, KeyDef>> = {
  theme: { parse: (r) => (/^[\w./@-]{1,80}$/.test(r) ? { ok: true, value: r } : { ok: false, error: 'nome de tema inválido' }), apply: (h, v) => h.sm.setTheme(v) },
  tuiMode: { parse: oneOf('regular', 'fullscreen'), apply: (h, v) => h.sm.setTuiMode(v) },
  fullscreenWheelScrollLines: { parse: range(1, 100, true), apply: (h, v) => h.sm.setFullscreenWheelScrollLines(v) },
  editorPaddingX: { parse: range(0, 3), apply: (h, v) => h.sm.setEditorPaddingX(v) },
  quietStartup: { parse: (r) => (r === 'header' ? { ok: true, value: 'header' } : bool(r)), apply: (h, v) => h.sm.setQuietStartup(v) },
  defaultThinkingLevel: { parse: oneOf(...THINKING_LEVELS), apply: (h, v) => h.sm.setDefaultThinkingLevel(v) },
  showCacheMissNotices: { parse: bool, apply: (h, v) => h.sm.setShowCacheMissNotices(v) },
  'compaction.enabled': { parse: bool, apply: (h, v) => h.sm.setCompactionEnabled(v) },
  // Sem setter nativo: mesmo `storage.withLock` do gerenciador (interface.md §3); enum fechado, valor inválido nunca grava.
  viewMode: {
    parse: oneOf('focus', 'default'),
    apply: (h, v) =>
      h.storage.withLock('global', (cur) => {
        const d: Record<string, unknown> = cur ? JSON.parse(cur) : {}
        d.viewMode = v
        return JSON.stringify(d, null, 2)
      }),
  },
  vimInsertModeRemaps: {
    parse: parseRemaps,
    apply: (h, v) =>
      h.storage.withLock('global', (cur) => {
        const d: Record<string, unknown> = cur ? JSON.parse(cur) : {}
        if (Object.keys(v).length) d.vimInsertModeRemaps = v
        else delete d.vimInsertModeRemaps
        return JSON.stringify(d, null, 2)
      }),
  },
}

export type Settings = Record<string, unknown>
const errText = (e: { error: Error }[]) => e.map((x) => x.error.message).join('; ')

export function getSetting(data: Settings, key: string): unknown {
  let cur: unknown = data
  for (const p of key.split('.')) cur = cur && typeof cur === 'object' ? (cur as Settings)[p] : undefined
  return cur
}

export type Read = { ok: true; data: Settings } | { ok: false; error: string }

/** Configurações globais atuais; falha explícita quando o arquivo está corrompido. */
export async function readSettings(open: Opener, cwd: string): Promise<Read> {
  try {
    const h = await open(cwd)
    const errs = h.sm.drainErrors()
    return errs.length ? { ok: false, error: `settings.json ilegível: ${errText(errs)}` } : { ok: true, data: h.sm.getGlobalSettings() as Settings }
  } catch (e) {
    return { ok: false, error: `falha ao abrir settings: ${e instanceof Error ? e.message : String(e)}` }
  }
}

export type SetResult = { ok: true; key: string; value: unknown } | { ok: false; error: string }

async function commit(h: Handle, write: () => void): Promise<string | undefined> {
  try {
    write()
    await h.sm.flush()
  } catch (e) {
    return `falha ao gravar: ${e instanceof Error ? e.message : String(e)}`
  }
  const errs = h.sm.drainErrors()
  return errs.length ? `falha ao gravar: ${errText(errs)}` : undefined
}

/** Valida e grava `key=raw` pelo gerenciador nativo; falha de gravação ou arquivo corrompido nunca vira sucesso. */
export async function setSetting(open: Opener, cwd: string, key: string, raw: string): Promise<SetResult> {
  const def = Object.hasOwn(KEYS, key) ? KEYS[key] : undefined
  if (!def) return { ok: false, error: `chave "${key}" não é configurável aqui. Permitidas: ${Object.keys(KEYS).join(', ')}` }
  const v = def.parse(raw.trim())
  if (!v.ok) return { ok: false, error: `valor inválido para ${key}: ${v.error}` }
  let h: Handle
  try {
    h = await open(cwd)
  } catch (e) {
    return { ok: false, error: `falha ao abrir settings: ${e instanceof Error ? e.message : String(e)}` }
  }
  const loadErrs = h.sm.drainErrors()
  if (loadErrs.length) return { ok: false, error: `settings.json ilegível; nada foi gravado: ${errText(loadErrs)}` }
  const err = await commit(h, () => def.apply(h, v.value))
  return err ? { ok: false, error: err } : { ok: true, key, value: v.value }
}

/** Remove um item de `packages` (fonte exata ou objeto com `source`) pelo gerenciador nativo. */
export async function removePackage(open: Opener, cwd: string, source: string): Promise<{ ok: true; removed: boolean } | { ok: false; error: string }> {
  let h: Handle
  try {
    h = await open(cwd)
  } catch (e) {
    return { ok: false, error: `falha ao abrir settings: ${e instanceof Error ? e.message : String(e)}` }
  }
  const loadErrs = h.sm.drainErrors()
  if (loadErrs.length) return { ok: false, error: `settings.json ilegível; nada foi gravado: ${errText(loadErrs)}` }
  const list = h.sm.getPackages()
  const keep = list.filter((p) => (typeof p === 'string' ? p : p.source) !== source)
  if (keep.length === list.length) return { ok: true, removed: false }
  const err = await commit(h, () => h.sm.setPackages(keep))
  return err ? { ok: false, error: err } : { ok: true, removed: true }
}
