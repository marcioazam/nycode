import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import path from 'node:path'
import { hljsToAnsi, ONE_DARK, ONE_LIGHT, themePalette } from './syntax.ts'

const agent = process.env.PI_AGENT_DIR ?? path.join(homedir(), '.pi/agent')
const cli = `${agent}/install/releases/${readFileSync(`${agent}/install/current-version`, 'utf8').trim()}/node_modules/@earendil-works/pi-coding-agent/dist/bundle/cli.js`
const hljs = createRequire(realpathSync(cli))('highlight.js')

const rgb = (hex: string) => { const n = parseInt(hex.slice(1), 16); return `38;2;${(n >> 16) & 255};${(n >> 8) & 255};${n & 255}m` }
/** Cor aplicada logo antes de `word` (que começa logo depois de uma sequência ANSI) na linha. */
function colorOf(line: string, word: string): string | undefined {
  const i = line.search(new RegExp(`(?<=m)${word.replace(/[.*+?^${}()|[\]\\$]/g, '\\$&')}`))
  if (i < 0) return undefined
  const before = line.slice(0, i)
  const all = [...before.matchAll(/\x1b\[(38;2;[\d;]+m)/g)]
  return all.at(-1)?.[1]
}
const hl = (code: string, lang: string, p = ONE_DARK) => hljsToAnsi(hljs.highlight(code, { language: lang, ignoreIllegals: true }).value, p, lang === 'bash')

test('python: palavra-chave, nome de função, built-in, string, número e comentário em itálico', () => {
  const [l1, l2, l3] = hl('def soma(a, b):\n    x = "oi"  # nota\n    return len(a) + 1', 'python')
  assert.equal(colorOf(l1, 'def'), rgb('#c678dd'))
  assert.equal(colorOf(l1, 'soma'), rgb('#61aeee'))
  assert.equal(colorOf(l2, '"oi"'), rgb('#98c379'))
  assert.equal(colorOf(l2, '# nota'), rgb('#7f848e'))
  assert.ok(l2.includes('\x1b[3m# nota\x1b[23m'))
  assert.equal(colorOf(l3, 'len'), rgb('#e6c07b'))
  assert.equal(colorOf(l3, '1'), rgb('#d19a66'))
})

test('js: function, literal, título de classe e interpolação', () => {
  const [l] = hl('function f(x){ const y = `a${x}`; return true }', 'javascript')
  assert.equal(colorOf(l, 'function'), rgb('#c678dd'))
  assert.equal(colorOf(l, 'f\x1b'), rgb('#61aeee'))
  assert.equal(colorOf(l, 'true'), rgb('#56b6c2'))
  const [c] = hl('class Pessoa extends Base {}', 'javascript')
  assert.equal(colorOf(c, 'Pessoa'), rgb('#e6c07b'))
})

test('bash: comando como função, opção como atributo, variável, string e atribuição neutra', () => {
  const [a, b, c] = hl('npm install --save-dev typescript\nFOO=1 make -j4 | grep "ok"\necho "$HOME"', 'bash')
  assert.equal(colorOf(a, 'npm'), rgb('#61aeee'))
  assert.equal(colorOf(a, '--save-dev'), rgb('#d19a66'))
  assert.equal(colorOf(a, 'typescript'), rgb('#abb2bf'))
  assert.equal(colorOf(b, 'FOO=1'), rgb('#abb2bf'))
  assert.equal(colorOf(b, 'make'), rgb('#61aeee'))
  assert.equal(colorOf(b, 'grep'), rgb('#61aeee'))
  assert.equal(colorOf(c, '$HOME'), rgb('#d19a66'))
})

test('tema claro usa One Light; entidades HTML voltam ao texto original; sem vazamento de cor no fim da linha', () => {
  const [l] = hl('if (a < b && c > "x") {}', 'javascript', ONE_LIGHT)
  assert.equal(colorOf(l, 'if'), rgb('#a626a4'))
  assert.ok(l.replace(/\x1b\[[\d;]*m/g, '') === 'if (a < b && c > "x") {}')
  assert.ok(l.endsWith('\x1b[39m'))
})

test('texto puro: só a cor neutra', () => {
  assert.deepEqual(hljsToAnsi('a &amp; b\nc', ONE_DARK), [`\x1b[${rgb('#abb2bf')}a & b\x1b[39m`, `\x1b[${rgb('#abb2bf')}c\x1b[39m`])
})

import { palette, parseBgAnsi, resolveLang, contrast, hexToRgb, type RGB } from './blocks.ts'
import { fitPalette } from './syntax.ts'

// Classes estruturais: só envolvem tokens que já têm cor própria (título, parâmetros, nome da tag).
const WRAPPERS = new Set(['function', 'class', 'params', 'tag'])

test('catálogo de classes: toda classe que alguma das ~190 gramáticas emite tem estilo (ou é invólucro)', () => {
  const seen = new Set<string>()
  const walk = (m: any, vis: Set<any>) => {
    if (!m || typeof m !== 'object' || vis.has(m)) return
    vis.add(m)
    for (const k of ['className', 'scope']) if (typeof m[k] === 'string') for (const c of m[k].split(/[ .]/)) if (c) seen.add(c)
    for (const k of ['contains', 'variants', 'starts']) {
      const v = m[k]
      if (Array.isArray(v)) v.forEach((x) => walk(x, vis))
      else if (v && typeof v === 'object') walk(v, vis)
    }
  }
  for (const l of hljs.listLanguages()) walk(hljs.getLanguage(l), new Set())
  assert.ok(seen.size > 40)
  const missing = [...seen].filter((c) => !ONE_DARK.byClass[c] && !WRAPPERS.has(c))
  assert.deepEqual(missing, [])
  assert.deepEqual(Object.keys(ONE_DARK.byClass).sort(), Object.keys(ONE_LIGHT.byClass).sort())
})

test('contraste: toda cor de sintaxe ajustada fica >= 4.5:1 no fundo escuro e no claro, mantendo as que já passam', () => {
  for (const [base, p] of [[[38, 39, 52], ONE_DARK], [[242, 242, 247], ONE_LIGHT]] as [RGB, typeof ONE_DARK][]) {
    const f = fitPalette(p, base)
    const colors = [f.text, f.command.color!, f.flag.color!, ...Object.values(f.byClass).map((s) => s.color).filter(Boolean) as string[]]
    for (const c of colors) assert.ok(contrast(hexToRgb(c), base) >= 4.5, `${c} em ${base}`)
  }
  assert.equal(fitPalette(ONE_DARK, [38, 39, 52]).byClass.keyword.color, '#c678dd')
})

test('etiquetas comuns acham gramática do highlight.js pelo catálogo do Linguist', () => {
  const tags = ['py', 'python', 'bash', 'sh', 'zsh', 'console', 'js', 'jsx', 'mjs', 'ts', 'tsx', 'json', 'jsonc', 'md', 'markdown', 'rs', 'go',
    'c', 'h', 'cpp', 'cs', 'java', 'kt', 'swift', 'rb', 'php', 'sql', 'yml', 'yaml', 'toml', 'ini', 'xml', 'html', 'vue', 'svelte', 'css',
    'scss', 'less', 'lua', 'r', 'dart', 'ex', 'hs', 'scala', 'clj', 'pl', 'ps1', 'dockerfile', 'makefile', 'nginx', 'diff', 'patch',
    'proto', 'tf', 'hcl', 'nix', 'erl', 'elm', 'ocaml', 'fs', 'vb', 'asm', 'tex', 'cmake', 'gradle', 'groovy', 'objc', 'mm', 'awk', 'vim']
  const none = tags.filter((t) => !resolveLang(t).grammars.some((c) => hljs.getLanguage(c)))
  assert.deepEqual(none, [])
  // Sem gramática no highlight.js 10.7 do pi: rótulo colorido, código em texto neutro.
  for (const t of ['graphql', 'zig']) assert.ok(!resolveLang(t).grammars.some((c) => hljs.getLanguage(c)), t)
})

test('cores de rótulo do catálogo inteiro passam 4.5:1 depois do ajuste', () => {
  for (const base of [[38, 39, 52], [242, 242, 247]] as RGB[]) {
    for (const t of ['py', 'json', 'lua', 'powershell', 'c', 'yaml', 'ini', 'mdx', 'env', 'csv']) {
      const p = palette(resolveLang(t).color, base, { bg: '', label: '', button: '' })
      const fgc = /38;2;(\d+);(\d+);(\d+)m/.exec(p.label)!.slice(1).map(Number) as RGB
      assert.ok(contrast(fgc, parseBgAnsi(p.head)!) >= 4.5, t)
    }
  }
})

// U26: o realce acompanha os tokens syntax* do tema; sem eles, a paleta One Dark/Light de sempre.
test('U26 themePalette: token do tema vence a cor fixa; ausente, sem truecolor ou inválido mantém a paleta', () => {
  const tema: Record<string, string> = { syntaxKeyword: '\x1b[38;2;1;2;3m', syntaxString: '\x1b[38;5;70m', syntaxType: '\x1b[38;2;999;0;0m' }
  const p = themePalette(ONE_DARK, (t) => tema[t])
  assert.equal(p.byClass.keyword!.color, '#010203')
  assert.equal(p.byClass.doctag!.color, '#010203')
  assert.equal(p.byClass.string!.color, ONE_DARK.byClass.string!.color, '256 cores: sem truecolor, fica a fixa')
  assert.equal(p.byClass.type!.color, ONE_DARK.byClass.type!.color, 'valor fora de 0-255 é ignorado')
  assert.equal(p.byClass.comment!.italic, true, 'só a cor muda')
  assert.deepEqual(themePalette(ONE_DARK, () => undefined), ONE_DARK, 'tema sem tokens: comportamento atual')
  assert.deepEqual(themePalette(ONE_LIGHT, () => { throw new Error('sem token') }), ONE_LIGHT)
  const [l] = hl('if (a) {}', 'javascript', p)
  assert.equal(colorOf(l, 'if'), '38;2;1;2;3m')
  const ajustada = fitPalette(p, [0, 0, 0])
  assert.notEqual(ajustada.byClass.keyword!.color, '#010203', 'o ajuste de contraste continua valendo sobre a cor do tema')
})
