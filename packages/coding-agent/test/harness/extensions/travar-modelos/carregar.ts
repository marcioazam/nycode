// Carrega os módulos de extensions/travar-modelos de uma cópia em /tmp com o pi ao lado (o Node não resolve
// @earendil-works/* a partir do repositório; mesmo padrão de extensions/diagnostico/test/carregar.ts).
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, symlinkSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'

const raiz = new URL('../..', import.meta.url).pathname
const tmp = mkdtempSync(join(tmpdir(), 'travar-modelos-test-'))
mkdirSync(join(tmp, 'node_modules'))
const versao = readFileSync(`${homedir()}/.pi/agent/install/current-version`, 'utf8').trim()
symlinkSync(`${homedir()}/.pi/agent/install/releases/${versao}/node_modules/@earendil-works`, join(tmp, 'node_modules', '@earendil-works'))
mkdirSync(join(tmp, 'travar-modelos'))
for (const f of readdirSync(join(raiz, 'travar-modelos')).filter((n) => n.endsWith('.ts'))) cpSync(join(raiz, 'travar-modelos', f), join(tmp, 'travar-modelos', f))

export const carregar = (caminho: string): Promise<any> => import(join(tmp, caminho))
