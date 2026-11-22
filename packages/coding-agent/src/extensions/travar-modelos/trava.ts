/** Lógica pura da trava de modelos: formato, leitura (args/ambiente) e decisão. Sem dependências do pi. */

export const EFFORTS = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'] as const
export type Effort = (typeof EFFORTS)[number]
export type Trava = { version: 1; models: Record<string, Effort[]> }

const MAX = 120
const RESERVADAS = new Set(['__proto__', 'constructor', 'prototype'])
const ehEsforco = (x: unknown): x is Effort => typeof x === 'string' && (EFFORTS as readonly string[]).includes(x)
const rank = (e: Effort) => EFFORTS.indexOf(e)

/** Mesmas regras do parsePolicy do pi-code (reimplementado: este módulo não importa o pi-code). */
export function analisar(raw: unknown): Trava | string {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return 'não é um objeto JSON'
  const { version, models } = raw as { version?: unknown; models?: unknown }
  if (version !== 1) return 'version deve ser 1'
  if (typeof models !== 'object' || models === null || Array.isArray(models)) return 'models deve ser um objeto'
  const out: Record<string, Effort[]> = {}
  for (const [key, efforts] of Object.entries(models)) {
    if (RESERVADAS.has(key)) return `a chave ${key} é reservada`
    if (key.length === 0 || key.length > MAX) return `a chave do modelo deve ter 1-${MAX} caracteres`
    if (!Array.isArray(efforts) || efforts.length === 0) return `o modelo ${key} precisa de ao menos um esforço`
    if (!efforts.every(ehEsforco)) return `o modelo ${key} tem esforço desconhecido`
    out[key] = EFFORTS.filter((e) => efforts.includes(e))
  }
  if (Object.keys(out).length === 0) return 'models está vazio'
  return { version: 1, models: out }
}

/** `provedor/id:low,medium outro/id:high` (separados por espaço). */
export function deArgs(args: string): Trava | string {
  const models: Record<string, unknown> = {}
  for (const parte of args.trim().split(/\s+/).filter(Boolean)) {
    const i = parte.lastIndexOf(':')
    if (i <= 0 || i === parte.length - 1) return `${parte}: faltam os esforços (provedor/id:low,medium)`
    const chave = parte.slice(0, i)
    if (!chave.includes('/')) return `${chave}: use provedor/id`
    const lista = parte.slice(i + 1).split(',')
    const ruim = lista.find((e) => !ehEsforco(e))
    if (ruim !== undefined) return `${chave}: esforço desconhecido "${ruim}"`
    models[chave] = [...(models[chave] as string[] | undefined ?? []), ...lista]
  }
  return analisar({ version: 1, models })
}

/** PI_MODEL_LOCK ausente ou vazio = sem trava; inválido = erro (falha fechada). */
export function deEnv(env: Record<string, string | undefined>): { trava?: Trava; erro?: string } {
  const bruto = env.PI_MODEL_LOCK
  if (!bruto || !bruto.trim()) return {}
  let json: unknown
  try {
    json = JSON.parse(bruto)
  } catch (e) {
    return { erro: `JSON inválido: ${e instanceof Error ? e.message : String(e)}` }
  }
  const r = analisar(json)
  return typeof r === 'string' ? { erro: r } : { trava: r }
}

export const paraEnv = (trava: Trava): string => JSON.stringify(trava)
export const chave = (model: { provider: string; id: string }): string => `${model.provider}/${model.id}`

/** Maior esforço permitido ≤ pedido; senão o menor permitido. */
function ajustarEsforco(permitidos: Effort[], pedido: Effort): Effort {
  if (permitidos.includes(pedido)) return pedido
  const abaixo = permitidos.filter((e) => rank(e) <= rank(pedido))
  const lista = abaixo.length ? abaixo : permitidos
  return lista.reduce((a, b) => (abaixo.length ? (rank(b) > rank(a) ? b : a) : rank(b) < rank(a) ? b : a))
}

export function decidir(trava: Trava, pedido: { modelo: string; esforco: Effort }, preferido?: string): { modelo: string; esforco: Effort; mudou: boolean } {
  const modelo = trava.models[pedido.modelo] ? pedido.modelo : preferido && trava.models[preferido] ? preferido : Object.keys(trava.models)[0]
  const esforco = ajustarEsforco(trava.models[modelo], pedido.esforco)
  return { modelo, esforco, mudou: modelo !== pedido.modelo || esforco !== pedido.esforco }
}

export function formatar(trava: Trava | undefined): string {
  if (!trava) return 'Sem trava de modelos nesta sessão.'
  return ['Modelos travados nesta sessão:', ...Object.entries(trava.models).map(([m, e]) => `${m} · ${e.join(', ')}`)].join('\n')
}
