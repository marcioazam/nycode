import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hookContainer, innerWidth, inset, insetMouse, lead, mesmaSaida, MIN_INNER, padOf, RECUO, wrapInstance } from './inset.ts'

const plain = (s: string) => s.replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b\[[0-9;]*m/g, '')

test('innerWidth: tira a margem dos dois lados; pad 0 ou estreito devolve a largura original', () => {
  assert.equal(innerWidth(100, 1), 98)
  assert.equal(innerWidth(100, 0), 100)
  assert.equal(innerWidth(MIN_INNER + 2, 1), MIN_INNER)
  assert.equal(innerWidth(MIN_INNER + 1, 1), MIN_INNER + 1)
})

test('inset: margem sem fundo dos dois lados, cada linha na largura total', () => {
  const bg = (s: string) => `\x1b[48;5;236m${s}\x1b[49m`
  const out = inset([bg('a'.repeat(98)), bg(' '.repeat(98))], 1)
  for (const l of out) {
    assert.equal(plain(l).length, 100)
    assert.ok(l.startsWith(' \x1b[48;5;236m') && l.endsWith('\x1b[49m '), JSON.stringify(l))
  }
  assert.deepEqual(inset(['x'], 0), ['x'])
})

test('inset: zona OSC 133 fica na coluna 0; linhas de imagem passam intactas', () => {
  const [l] = inset(['\x1b]133;A\x07\x1b]133;B\x1b\\texto'], 1)
  assert.equal(l, '\x1b]133;A\x07\x1b]133;B\x1b\\ texto ')
  const img = '\x1b_Ga=T;AAAA\x1b\\'
  assert.deepEqual(inset([img, 'y'], 1, (s) => s.startsWith('\x1b_G')), [img, ' y '])
})

test('padOf: outputPad do componente, senão paddingX; inválido vira 0', () => {
  assert.equal(padOf({ outputPad: 1, paddingX: 3 }), 1)
  assert.equal(padOf({ paddingX: 1 }), 1)
  assert.equal(padOf({ outputPad: 0, paddingX: 1 }), 0)
  assert.equal(padOf({}), 0)
})

test('insetMouse: coordenada do bloco interno; clique na margem não é do bloco; sem margem, evento original', () => {
  assert.deepEqual(insetMouse({ x: 5, width: 100, y: 2 }, 1), { x: 4, width: 98, y: 2 })
  assert.equal(insetMouse({ x: 0, width: 100 }, 1), undefined)
  assert.equal(insetMouse({ x: 99, width: 100 }, 1), undefined)
  assert.equal(insetMouse({ x: 98, width: 100 }, 1)?.x, 97)
  assert.equal(insetMouse({ x: 5, width: 100 }, 0), null)
})

test('wrapInstance: bloco solto ganha a margem, idempotente; mouse deslocado e clique na margem ignorado', () => {
  let got: any
  const c: any = { render: (w: number) => ['#'.repeat(w)], handleMouse: (e: any) => { got = e; return { handled: true } } }
  wrapInstance(c, () => 1)
  wrapInstance(c, () => 1)
  assert.deepEqual(c.render(40), [` ${'#'.repeat(38)} `])
  assert.deepEqual(c.handleMouse({ x: 3, width: 40, y: 0 }), { handled: true })
  assert.deepEqual(got, { x: 2, width: 38, y: 0 })
  assert.equal(c.handleMouse({ x: 0, width: 40, y: 0 }), undefined)
  let pad = 1
  const d: any = { render: (w: number) => ['#'.repeat(w)] }
  wrapInstance(d, () => pad)
  pad = 0
  assert.deepEqual(d.render(40), ['#'.repeat(40)])
})

test('hookContainer: filhos novos passam pelo filtro antes do render; desfazer volta ao render do protótipo', () => {
  class Box { children: any[] = []; render(w: number) { return this.children.flatMap((c) => c.render(w)) } }
  const box = new Box()
  const solto = { render: (w: number) => ['-'.repeat(w)] }
  class Classe { render(w: number) { return ['='.repeat(w)] } }
  box.children.push(solto, new Classe())
  const undo = hookContainer(box, (c) => { if (Object.getPrototypeOf(c) === Object.prototype) wrapInstance(c, () => 1) })
  assert.deepEqual(box.render(30), [` ${'-'.repeat(28)} `, '='.repeat(30)])
  box.children.push({ render: (w: number) => ['+'.repeat(w)] })
  assert.equal(box.render(30)[2], ` ${'+'.repeat(28)} `)
  undo()
  assert.ok(!Object.prototype.hasOwnProperty.call(box, 'render'))
})

test('lead: recuo simétrico nos dois lados com o fundo do bloco (após OSC/SGR inicial e antes do reset final); vazia e imagem passam', () => {
  const bg = '\x1b[48;5;236m'
  const osc = '\x1b]133;A\x07'
  const [a, b, c, d, e] = lead([`${osc}${bg} ❯ oi \x1b[49m`, `${bg}  \x1b[49m`, '', 'IMG', ' ❯ mono '], RECUO, (l) => l === 'IMG')
  assert.equal(a, `${osc}${bg}   ❯ oi   \x1b[49m`)
  assert.equal(plain(a).indexOf('❯'), 3) // padding 1 + RECUO 2 à esquerda
  assert.ok(plain(a).endsWith('oi   ')) // padding 1 + RECUO 2 à direita (igualando o da direita)
  assert.equal(b, `${bg}      \x1b[49m`)
  assert.equal(c, '')
  assert.equal(d, 'IMG')
  assert.equal(e, '   ❯ mono   ')
  assert.deepEqual(lead(['x'], 0), ['x'])
})

test('mesmaSaida: reaproveita a saída enquanto linhas e chave não mudam; recalcula quando mudam', () => {
  const dono = {}
  let chamadas = 0
  const fn = (ls: readonly string[]) => { chamadas++; return inset(ls, 1) }
  const a = mesmaSaida(dono, '80|1', ['x', 'y'], fn)
  const b = mesmaSaida(dono, '80|1', ['x', 'y'], fn) // outro array, mesmo conteúdo
  assert.deepEqual(b, a)
  assert.deepEqual(a, [' x ', ' y '])
  assert.equal(chamadas, 1)
  b.push('mutado') // quem recebe pode alterar a cópia sem estragar a memória
  assert.deepEqual(mesmaSaida(dono, '80|1', ['x', 'y'], fn), a)
  assert.equal(chamadas, 1)
  assert.deepEqual(mesmaSaida(dono, '80|1', ['x', 'z'], fn), [' x ', ' z ']) // linha mudou
  assert.deepEqual(mesmaSaida(dono, '60|1', ['x', 'z'], fn), [' x ', ' z ']) // chave mudou
  assert.deepEqual(mesmaSaida(dono, '60|1', ['x'], fn), [' x ']) // tamanho mudou
  assert.equal(chamadas, 4)
  mesmaSaida({}, '60|1', ['x'], fn) // outro componente não divide a memória
  assert.equal(chamadas, 5)
})

test('U9: hookContainer chama onChild uma vez por filho; filho novo entra, os vistos não voltam', () => {
  class Box { children: any[] = []; render(w: number) { return this.children.flatMap((c) => c.render(w)) } }
  const box = new Box()
  const a = { render: () => ['a'] }
  box.children.push(a)
  const chamadas: any[] = []
  hookContainer(box, (c) => chamadas.push(c))
  box.render(10); box.render(10); box.render(10)
  assert.deepEqual(chamadas, [a])
  const b = { render: () => ['b'] }
  box.children.push(b)
  box.render(10)
  assert.deepEqual(chamadas, [a, b])
})
