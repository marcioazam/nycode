// Apoio compartilhado dos testes de tools.ts (dividido para caber no limite de 800 linhas por arquivo).
import assert from 'node:assert/strict'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'

// O Node não resolve @earendil-works a partir de extensions/: testa uma cópia com o pi ao lado.
// motion/ importa ../../ui/a11y.ts: a cópia mantém a árvore extensions/{ui,ui-visual}.
const raiz = mkdtempSync(join(tmpdir(), 'ui-visual-test-'))
export const tmp = join(raiz, 'ui-visual')
mkdirSync(join(raiz, 'ui'), { recursive: true })
cpSync(join(import.meta.dirname, '..', '..', '..', 'ui', 'a11y.ts'), join(raiz, 'ui', 'a11y.ts'))
mkdirSync(join(tmp, 'node_modules'), { recursive: true })
symlinkSync(`${homedir()}/.pi/agent/install/releases/${readFileSync(`${homedir()}/.pi/agent/install/current-version`, 'utf8').trim()}/node_modules/@earendil-works`, join(tmp, 'node_modules', '@earendil-works'))
for (const f of ['tools.ts', 'icons.ts', 'diff.ts']) cpSync(join(import.meta.dirname, '..', '..', f), join(tmp, f))
cpSync(join(import.meta.dirname, '..', '..', 'motion'), join(tmp, 'motion'), { recursive: true, filter: (p) => !p.includes('/test') })
cpSync(join(import.meta.dirname, '..', '..', 'read'), join(tmp, 'read'), { recursive: true })
cpSync(join(import.meta.dirname, '..', '..', 'run'), join(tmp, 'run'), { recursive: true }) // run/banda.ts (tools.ts)
cpSync(join(import.meta.dirname, '..', '..', 'sub'), join(tmp, 'sub'), { recursive: true }) // sub/chips.ts (tools.ts)
cpSync(join(import.meta.dirname, '..', '..', 'mcp'), join(tmp, 'mcp'), { recursive: true }) // mcp/linha.ts (tools.ts)
cpSync(join(import.meta.dirname, '..', '..', 'pergunta'), join(tmp, 'pergunta'), { recursive: true }) // pergunta/bloco.ts (tools.ts)
cpSync(join(import.meta.dirname, '..', '..', 'memoria'), join(tmp, 'memoria'), { recursive: true }) // memoria/linha.ts (tools.ts)
cpSync(join(import.meta.dirname, '..', '..', 'moldura'), join(tmp, 'moldura'), { recursive: true }) // moldura/ (tools.ts, memoria/)
cpSync(join(import.meta.dirname, '..', '..', 'plano'), join(tmp, 'plano'), { recursive: true }) // plano/pronto.ts (tools.ts)
// Ícones e links dependem do terminal (Nerd Font no kitty, OSC 8): os testes de texto fixam um terminal neutro,
// para darem o mesmo resultado dentro e fora do kitty e do tmux. Nerd Font tem teste próprio em icons.test.ts.
for (const k of ['KITTY_WINDOW_ID', 'PI_NERD_FONT', 'PI_ASCII_ICONS', 'TMUX']) delete process.env[k]
process.env.TERM = 'xterm-256color'
// Links OSC 8 dependem do terminal (P13): os testes de texto rodam sem eles, em qualquer terminal.
const tui = await import(join(tmp, 'node_modules', '@earendil-works', 'pi-tui', 'dist', 'index.js'))
tui.setCapabilities({ images: null, trueColor: true, hyperlinks: false })
export const mod = await import(join(tmp, 'tools.ts'))
export const { icon, toolIcon } = await import(join(tmp, 'icons.ts'))
export const visibleWidth = (s: string) => [...s].length // sem largura dupla nos casos testados

export const theme = { fg: (c: string, t: string) => `<${c}>${t}</c>`, bold: (t: string) => `\u0001${t}\u0002` }
// Para quem só lê texto plano: cores ANSI de verdade, que a medida de largura do pi-tui não conta como colunas.
export const ansiPlain = { fg: (_c: string, t: string) => `\x1b[2m${t}\x1b[22m`, bold: (t: string) => `\x1b[1m${t}\x1b[22m` }
// truncateToWidth fecha com \x1b[0m; não ocupa coluna, então sai antes da medida.
export const plain = (s: string) => s.replace(/<\/?[a-zA-Z]*>/g, '').replace(/[\u0001\u0002]/g, '').replace(/\x1b\[[0-9;]*m/g, '')
export const ctx = (o: Record<string, unknown> = {}) => ({ cwd: '/work/proj', argsComplete: true, isError: false, isPartial: false, durationMs: undefined, args: {}, state: {}, ...o })
export const NATIVE = { tag: 'native' }
export const nativeComponent = (label: string) => ({ render: () => [label], invalidate() {} })
export const base = () => ({
  keep: 'x',
  renderCall: () => nativeComponent('native-call'),
  renderResult: () => nativeComponent('native-result'),
})
export const resolverOf = (env: Record<string, string> = {}) => {
  const old = process.env.PI_CODE_SUBAGENT
  if ('PI_CODE_SUBAGENT' in env) process.env.PI_CODE_SUBAGENT = env.PI_CODE_SUBAGENT
  else delete process.env.PI_CODE_SUBAGENT
  const calls: string[] = []
  let resolver: any
  mod.default({
    registerToolRenderer: (r: unknown) => { calls.push('registerToolRenderer'); resolver = r },
    registerTool: () => calls.push('registerTool'),
  })
  if (old === undefined) delete process.env.PI_CODE_SUBAGENT
  else process.env.PI_CODE_SUBAGENT = old
  return { calls, resolver }
}
export const wrapped = (name: string, b: any = base()) => resolverOf().resolver(name, () => b)
// Cartão 08 (dono, 2026-11-18, `Aplica ele real já`): read/bash/grep/find/ls desenham a linha da chamada como cartão de até 58
// colunas: margem 2 + 1 de respiro à esquerda + preenchimento até a borda. Antigo: `  ícone texto`, sem preenchimento, até a
// largura inteira. `ficha` devolve o texto do cartão no formato antigo (recuo de 2, sem preenchimento) para as asserções de conteúdo.
export const CARD = new Set(['read', 'bash', 'grep', 'find', 'ls'])
// (dono, 2026-11-18): antes margem 2 + 1 de respiro (`^ {3}`) e cartão de até 58; agora sem margem: 1 de respiro e largura w.
export const ficha = (s: string) => plain(s).replace(/^ (?=\S)/, '  ').trimEnd()
const linhaDe = (name: string, s: string) => (CARD.has(name) ? ficha(s) : plain(s))
export const header = (name: string, args: Record<string, unknown>, c: Record<string, unknown> = {}, w = 200) =>
  linhaDe(name, wrapped(name).renderCall(args, ansiPlain, ctx({ args, ...c })).render(w)[0])
export const result = (text: string, details?: unknown) => ({ content: [{ type: 'text', text }], details })
// Chamada + resultado com o mesmo contexto (o resumo passa de um para o outro por context.state).
export const row = (name: string, args: Record<string, unknown>, r: unknown, c: Record<string, unknown> = {}, o: Record<string, unknown> = {}, w = 200) => {
  const w0 = wrapped(name)
  const shared = ctx({ args, ...c })
  const call = w0.renderCall(args, ansiPlain, shared)
  const res = w0.renderResult(r, { expanded: false, isPartial: false, ...o }, ansiPlain, shared)
  return [...call.render(w).map((l: string) => linhaDe(name, l)), ...res.render(w).map(plain)]
}
export const body = (name: string, r: unknown, c: Record<string, unknown> = {}, o: Record<string, unknown> = {}, w = 200) =>
  wrapped(name).renderResult(r, { expanded: false, isPartial: false, ...o }, ansiPlain, ctx(c)).render(w).map(plain)
export const BGC: Record<string, number> = { toolPendingBg: 17, toolSuccessBg: 22, toolErrorBg: 52, customMessageBg: 236 }
export const bgTheme = {
  fg: (c: string, t: string) => `\x1b[38;5;${c === 'dim' ? 244 : 111}m${t}\x1b[39m`,
  bold: (t: string) => `\x1b[1m${t}\x1b[22m`,
  bg: (c: string, t: string) => `\x1b[48;5;${BGC[c]}m${t}\x1b[49m`,
  getBgAnsi: (c: string) => `\x1b[48;5;${BGC[c]}m`,
  getFgAnsi: () => '\x1b[38;5;111m',
}
// Tema com marcas de largura zero (SGR) no lugar das tags <cor>: o cartão corta pela largura visível e as tags contariam como colunas.
const COD: Record<string, number> = { dim: 90, muted: 37, error: 31, syntaxType: 36, toolTitle: 97, accent: 34 }
export const tg = (c: string, t: string) => `\x1b[${COD[c] ?? 39}m${t}\x1b[39m`
export const ansiTags = { fg: tg, bold: (t: string) => t }
export const OPEN = (c: string) => `\x1b[48;5;${BGC[c]}m`

// Régua Run (dono, 2026-11-18): título esperado, sem a margem direita (trimEnd), régua `─` até a hora na largura interna iw = w - 3.
// (dono, 2026-11-18): antes iw = min(72, w) - 3 (cartão de no máximo 72); agora o cartão ocupa a largura inteira w.
// (dono, 2026-11-20): antes `Bash ─ cmd ─────── hora`; agora `Bash · ESTADO · cmd` + espaços + hora na mesma coluna (sem régua `─`).
export const reguaRun = (bashIcon: string, gap: string, cmd: string, hora = '', w = 80, estado = 'OK') => {
  const iw = w - 3
  const esq = `${bashIcon}${gap}Bash · ${estado} · ${cmd}`, dir = hora ? ` ${hora}` : ''
  return `▎ ${esq}${' '.repeat(iw - [...esq].length - [...dir].length)}${dir}`.trimEnd()
}
// Respiro (dono, 2026-11-18): antes o cartão começava no título e acabava no rodapé; agora a 1ª e a última linha são
// linhas vazias com trilho (`▎` + espaços, largura w). Tira as duas para as asserções de conteúdo, mas EXIGE que sejam assim.
export const semRespiro = (rows: string[], w = 80) => {
  assert.ok(rows.length >= 3, 'título, rodapé e as duas linhas de respiro')
  for (const l of [rows[0]!, rows.at(-1)!]) {
    assert.match(plain(l), /^▎ +$/, 'linha de respiro: trilho + espaços')
    assert.equal(visibleWidth(plain(l)), w, 'linha de respiro com a largura w')
  }
  return rows.slice(1, -1)
}
