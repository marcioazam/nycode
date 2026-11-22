/** /terminal-setup: grava a vinculação Shift+Enter (ESC[13;2u) no terminal detectado, com backup, validação e rollback. */
import { randomBytes } from 'node:crypto'
import { chmodSync, constants, copyFileSync, existsSync, readFileSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname } from 'node:path'
import type { ExtensionAPI, ExtensionCommandContext } from '@earendil-works/pi-coding-agent'
import { appendToRootArray, rootArray, undoEdits } from './jsonc.ts'
import { ALACRITTY_ENTRY, analyze, appendToml, detect, entryFor, type Target } from './targets.ts'
import { assertOnlyAppended, pythonToml, type TomlParse } from './toml.ts'

const MAX_BYTES = 1 << 20
type Ctx = Pick<ExtensionCommandContext, 'ui' | 'hasUI'>
export interface SetupDeps {
  env?: Record<string, string | undefined>
  platform?: string
  home?: string
  rename?: (from: string, to: string) => void
  hex?: () => string
  toml?: TomlParse
}
export type SetupResult = 'installed' | 'present' | 'native' | 'unavailable' | 'declined' | 'refused' | 'failed'

/** Texto novo = antigo + entrada, mais a prova de que o original ficou intacto fora do trecho inserido. */
function build(t: Target, old: string): { text: string; block: string } {
  const e = entryFor(t.id)
  if (t.format === 'toml') return appendToml(old)
  if (!old.trim()) return { text: `[\n${e.json.split('\n').map((l) => '  ' + l).join('\n')}\n]\n`, block: e.json }
  rootArray(old) // lança se não for array
  const r = appendToRootArray(old, e.json)
  if (undoEdits(r.text, r.edits) !== old) throw new Error('inserção alterou o texto original')
  return { text: r.text, block: e.json }
}

/** Transação: backup → temporário no mesmo diretório → rename → releitura; qualquer falha restaura o original. */
function commit(t: Target, old: string | undefined, text: string, d: SetupDeps): string | undefined {
  // ponytail: sem lock; edição concorrente do mesmo arquivo entre a leitura e o rename é perdida (janela de ms)
  const real = old === undefined ? t.file : realpathSync(t.file)
  const hex = (d.hex ?? (() => randomBytes(4).toString('hex')))()
  const bak = `${real}.${hex}.bak`
  const tmp = `${real}.${hex}.tmp`
  const mode = old === undefined ? 0o600 : statSync(real).mode & 0o777
  try {
    if (old !== undefined) { copyFileSync(real, bak, constants.COPYFILE_EXCL); chmodSync(bak, mode) }
    writeFileSync(tmp, text, { mode, flag: 'wx' })
    ;(d.rename ?? renameSync)(tmp, real)
    if (readFileSync(real, 'utf8') !== text) throw new Error('releitura difere do escrito')
    return old === undefined ? undefined : bak
  } catch (e) {
    rmSync(tmp, { force: true })
    if (old === undefined) rmSync(real, { force: true })
    else try {
      if (readFileSync(real, 'utf8') !== old) { const back = `${real}.${hex}.restore`; copyFileSync(bak, back); renameSync(back, real) }
      rmSync(bak, { force: true })
    } catch { /* restauração falhou: o backup .bak fica ao lado do arquivo */ }
    throw e
  }
}

export async function terminalSetup(ctx: Ctx, args: string, d: SetupDeps = {}): Promise<SetupResult> {
  const say = (m: string, t: 'info' | 'warning' | 'error' = 'info') => ctx.ui.notify(m, t)
  if (args.trim()) { say('/terminal-setup não aceita argumentos.', 'error'); return 'refused' }
  const det = detect({ env: d.env ?? process.env, platform: d.platform ?? process.platform, home: d.home ?? homedir(), exists: existsSync })
  if (det.kind === 'native') { say(`${det.terminal} já envia Shift+Enter sem configuração; nada foi alterado.`); return 'native' }
  if (det.kind === 'unavailable') { say(`/terminal-setup indisponível: ${det.reason}`, 'warning'); return 'unavailable' }
  if (!ctx.hasUI) { say('/terminal-setup exige confirmação interativa; nada foi gravado.', 'error'); return 'refused' }
  let target = det.targets[0]!
  if (det.targets.length > 1) {
    const pick = await ctx.ui.select('Qual editor configurar?', det.targets.map((t) => `${t.label} (${t.file})`))
    const chosen = det.targets.find((t) => pick?.startsWith(`${t.label} (`))
    if (!chosen) { say('/terminal-setup cancelado; nada foi alterado.'); return 'declined' }
    target = chosen
  }
  let old: string | undefined
  try {
    if (existsSync(target.file)) {
      if (statSync(target.file).size > MAX_BYTES) throw new Error('arquivo maior que 1 MiB')
      old = readFileSync(target.file, 'utf8')
    }
  } catch (e) { say(`/terminal-setup: não consegui ler ${target.file}: ${e instanceof Error ? e.message : e}`, 'error'); return 'failed' }
  const toml = d.toml ?? pythonToml
  const a = analyze(target.id, old ?? '', toml)
  const manual = (why: string) => say(`${why}\nAdicione à mão em ${target.file}:\n${entryFor(target.id).toml ?? entryFor(target.id).json}`, 'warning')
  if (a.state === 'present') { say(`${target.label}: vinculação Shift+Enter já configurada; nada foi alterado.`); return 'present' }
  if (a.state === 'unsupported') { manual(`${target.label}: ${a.reason}; arquivo intocado.`); return 'failed' }
  const what = a.state === 'collision'
    ? `Shift+Enter já está vinculado a: ${a.existing}\nA nova entrada será ACRESCENTADA depois dela (a última vence; a sua permanece no arquivo).`
    : 'Será acrescentada uma vinculação Shift+Enter (ESC[13;2u); suas outras chaves e comentários ficam intactos.'
  if (!(await ctx.ui.confirm(`Configurar Shift+Enter em ${target.label}?`, `${target.file}\n${what}\nUm backup .bak é criado ao lado.`))) {
    say('/terminal-setup cancelado; nada foi alterado.'); return 'declined'
  }
  let block = ''
  try {
    const b = build(target, old ?? '')
    block = b.block
    if (target.format === 'jsonc') { if (analyze(target.id, b.text).state !== 'present') throw new Error('verificação do resultado falhou') }
    else { if (!b.text.startsWith(old ?? '')) throw new Error('prefixo original alterado'); assertOnlyAppended(toml(old ?? ''), toml(b.text), ALACRITTY_ENTRY) }
    const bak = commit(target, old, b.text, d)
    say(`Shift+Enter instalado em ${target.label}: ${target.file}${bak ? ` (backup: ${bak})` : ''}. Reinicie o terminal/janela se a tecla ainda não funcionar.`)
    return 'installed'
  } catch (e) {
    manual(`/terminal-setup falhou (${e instanceof Error ? e.message : e}); arquivo restaurado.`)
    return 'failed'
  }
}

export function registerTerminalSetup(pi: ExtensionAPI, d?: SetupDeps): void {
  pi.registerCommand('terminal-setup', {
    description: 'Instala a vinculação Shift+Enter (nova linha) no terminal detectado: VS Code, Cursor, Zed ou Alacritty',
    handler: async (args, ctx) => void (await terminalSetup(ctx, args, d)),
  })
}
