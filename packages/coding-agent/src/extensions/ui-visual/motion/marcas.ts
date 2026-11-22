/**
 * Marcas de texto da Onda 10: sublinhado ondulado em erro de sintaxe (P12) e links OSC 8 em caminhos e `#123` (P13).
 * Sem suporte conhecido o texto sai igual (link) ou com sublinhado simples (ondulado).
 */
import { execFile } from 'node:child_process'
import { statSync } from 'node:fs'
import { hostname } from 'node:os'
import { isAbsolute, resolve } from 'node:path'
import { getCapabilities, hyperlink } from '@earendil-works/pi-tui'
import { noColor, sanitizarExibicao } from '../../ui/a11y.ts'
import { safeAnsi } from './motion.ts'

type Env = Record<string, string | undefined>
type Tema = { fg: (c: string, t: string) => string; getFgAnsi?: (c: string) => string }

// ── P12 ──────────────────────────────────────────────────────────────────────
/** Terminais que desenham `4:3` (ondulado) e `58` (cor do sublinhado). tmux só repassa com `usstyle`: fica de fora. */
export const temOndulado = (env: Env = process.env): boolean =>
  !env.TMUX &&
  (env.TERM === 'xterm-kitty' || Boolean(env.KITTY_WINDOW_ID) || Boolean(env.VTE_VERSION) || /^(foot|xterm-ghostty|wezterm)/.test(env.TERM ?? '') ||
    ['WezTerm', 'ghostty', 'iTerm.app'].includes(env.TERM_PROGRAM ?? ''))

/** Trecho sublinhado: ondulado na cor do erro onde há suporte, sublinhado simples nos demais; NO_COLOR tira só a cor. */
export function ondulado(texto: string, theme: Tema, env: Env = process.env): string {
  if (!texto) return texto
  texto = sanitizarExibicao(texto)
  if (!temOndulado(env)) return `\x1b[4m${noColor(env) ? texto : theme.fg('error', texto)}\x1b[24m`
  const rgb = noColor(env) ? undefined : safeAnsi(() => theme.getFgAnsi?.('error'))
  const cor = rgb ? `\x1b[58:2::${rgb.join(':')}m` : ''
  return `\x1b[4:3m${cor}${texto}${cor ? '\x1b[59m' : ''}\x1b[4:0m`
}

export type Sintaxe = { line: number; column: number; text: string }
/** `✕ linha 12:5  inesperado }`: o trecho com erro vem sublinhado. */
export function linhaSintaxe(s: Sintaxe, theme: Tema, env: Env = process.env): string {
  const m = /^(unexpected|missing) (.*)$/.exec(s.text)
  const rotulo = m ? (m[1] === 'missing' ? 'falta' : 'inesperado') : ''
  const trecho = m ? m[2]! : s.text
  return `${theme.fg('error', '✕')} ${theme.fg('muted', `erro de sintaxe na linha ${s.line}:${s.column}`)}  ${rotulo ? `${theme.fg('dim', rotulo)} ` : ''}${ondulado(trecho, theme, env)}`
}

// ── P13 ──────────────────────────────────────────────────────────────────────
const links = (): boolean => {
  try {
    return getCapabilities().hyperlinks === true
  } catch {
    return false
  }
}

/** `file://host/caminho#linha`: a forma que o kitty abre no editor (open-actions); o host evita abrir arquivo de outra máquina via SSH. */
let HOST: string | undefined // hostname() é um syscall: uma vez por processo
export const urlArquivo = (abs: string, linha?: number): string =>
  `file://${(HOST ??= hostname())}${encodeURI(abs).replace(/#/g, '%23')}${linha ? `#${linha}` : ''}`

/** Envolve o texto num link para o arquivo quando o terminal entende OSC 8; senão devolve o texto. */
export const linkArquivo = (texto: string, caminho: string | undefined, cwd: string | undefined, linha?: number): string => {
  if (!caminho || !texto || !links()) return sanitizarExibicao(texto)
  const abs = isAbsolute(caminho) ? caminho : resolve(cwd ?? process.cwd(), caminho)
  return hyperlink(sanitizarExibicao(texto), urlArquivo(abs, linha))
}

/** Primeira linha alterada de um diff do pi (`+ 12 texto` / `- 12 texto`). */
export const primeiraLinhaDiff = (diff: unknown): number | undefined => {
  if (typeof diff !== 'string') return undefined
  const m = /^[+-]\s*(\d+)\s/m.exec(diff)
  return m ? Number(m[1]) : undefined
}

/** Caminho que ainda não existe é consultado de novo depois disto: um arquivo criado logo após ser citado vira link. */
export const NEGATIVO_MS = 2000
const existe = new Map<string, { v: boolean; t: number }>()
const ehArquivo = (abs: string): boolean => {
  const now = Date.now()
  const c = existe.get(abs)
  if (c && (c.v || now - c.t < NEGATIVO_MS)) return c.v
  let v: boolean
  try {
    v = statSync(abs).isFile()
  } catch {
    v = false
  }
  if (existe.size > 500) existe.clear()
  existe.set(abs, { v, t: now })
  return v
}

/** `owner/repo` do `origin` quando é GitHub; senão undefined (então `#123` não vira link). Assíncrono: não segura o 1º prompt. */
export const repoGithub = (cwd: string): Promise<string | undefined> =>
  new Promise((ok) => {
    try {
      execFile('git', ['-C', cwd, 'remote', 'get-url', 'origin'], { encoding: 'utf8', timeout: 2000 }, (erro, saida) =>
        ok(erro ? undefined : /github\.com[:/]([\w.-]+\/[\w.-]+?)(?:\.git)?$/.exec(saida.trim())?.[1]))
    } catch {
      ok(undefined)
    }
  })

// Caminho com barra ou extensão, opcionalmente `:linha`; em código inline (`a/b.ts:3`) ou solto.
const CAMINHO = /(`?)((?:\.{0,2}\/)?[\w.@-]+(?:\/[\w.@-]+)*\.[A-Za-z0-9]{1,8}|(?:\.{0,2}\/)?[\w.@-]+(?:\/[\w.@-]+)+)(?::(\d+))?\1/g
const ISSUE = /(^|[\s(])#(\d{1,6})\b/g

/**
 * Transformador de Markdown do assistente: caminhos que existem viram `[texto](file://…)` e `#123` vira link do GitHub.
 * Não mexe em blocos de código cercados nem em links já escritos. Sem OSC 8 devolve o texto como veio.
 */
export function ligarCaminhos(md: string, cwd: string, repo: string | undefined): string {
  if (!links() || !md) return md
  const cercas = md.match(/^```/gm)?.length ?? 0
  if (cercas % 2 === 1) return md
  const now = Date.now()
  const u = ultimo
  if (u && u.md === md && u.cwd === cwd && u.repo === repo && now - u.t < NEGATIVO_MS) return u.out // re-render do mesmo texto (tique do suavizador)
  const out = converter(md, cwd, repo)
  ultimo = { md, cwd, repo, t: now, out }
  return out
}
let ultimo: { md: string; cwd: string; repo: string | undefined; t: number; out: string } | undefined

function converter(md: string, cwd: string, repo: string | undefined): string {
  return md
    .split(/(^```[\s\S]*?^```[^\n]*$|^~~~[\s\S]*?^~~~[^\n]*$)/m)
    .map((parte, i) => {
      if (i % 2) return parte // cerca de código
      return parte
        .split(/(\[[^\]]*\]\([^)]*\)|<https?:[^>]*>|https?:\/\/\S+)/)
        .map((p, j) => {
          if (j % 2) return p // link ou URL já existentes
          let out = p.replace(CAMINHO, (todo, crase: string, cam: string, linha?: string) => {
            const abs = isAbsolute(cam) ? cam : resolve(cwd, cam)
            return ehArquivo(abs) ? `[${todo}](${urlArquivo(abs, linha ? Number(linha) : undefined)})` : todo
          })
          if (repo) out = out.replace(ISSUE, (_t, antes: string, n: string) => `${antes}[#${n}](https://github.com/${repo}/issues/${n})`)
          return out
        })
        .join('')
    })
    .join('')
}
