// Contrato: o CLI roda e imprime JSON também quando invocado por um symlink (argv[1] != import.meta.url bruto).
// Antes: a comparação crua `file://${argv[1]}` falhava via symlink -> exit 0 sem stdout e o parse JSON de
// check-instructions.py quebrava. Agora ambos os lados passam por realpath.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const real = path.join(path.dirname(fileURLToPath(import.meta.url)), 'arg-expansion-check.mjs')

test('CLI via symlink produz o mesmo JSON do caminho real, com hit não vazio', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'argexp-'))
  try {
    const md = path.join(dir, 'fake.md')
    fs.writeFileSync(md, '# t\n\nrun `echo $1`\n')
    const link = path.join(dir, 'link.mjs')
    fs.symlinkSync(real, link)
    const run = (bin) => spawnSync(process.execPath, [bin, md], { encoding: 'utf8' })
    const a = run(real)
    const b = run(link)
    assert.equal(a.status, 0, a.stderr)
    assert.equal(b.status, 0, b.stderr)
    assert.notEqual(b.stdout.trim(), '', 'symlink run printed nothing')
    assert.deepEqual(JSON.parse(b.stdout), JSON.parse(a.stdout))
    assert.ok(JSON.parse(b.stdout).length >= 1)
  } finally {
    fs.rmSync(dir, { recursive: true })
  }
})
