/** Reutiliza o singleton do pi-code; nunca importa uma segunda cópia do registry nem sinaliza PIDs por conta própria. */
export interface FleetControl {
  list(): unknown[]
  stop(id: string): unknown
  detachForeground(): number
}

function currentFleet(): FleetControl | undefined {
  const box: unknown = Reflect.get(globalThis, Symbol.for('pi-code.fleet.source'))
  if (!box || typeof box !== 'object' || !('source' in box)) return undefined
  const s = box.source
  if (!s || typeof s !== 'object' || !('list' in s) || !('stop' in s) || !('detachForeground' in s)) return undefined
  if (typeof s.list !== 'function' || typeof s.stop !== 'function' || typeof s.detachForeground !== 'function') return undefined
  return s as FleetControl
}

/** O source é da árvore desta sessão; sua própria implementação valida identidade do processo e permissão de cancelamento. */
export function stopAgents(source: FleetControl | undefined = currentFleet()): { stopped: number; refused: number } {
  if (!source) throw new Error('Controle de subagentes indisponível nesta sessão.')
  const rows = source.list()
  if (!Array.isArray(rows)) throw new Error('Fleet com formato incompatível; nada cancelado.')
  if (rows.length > 1000) throw new Error('Fleet excedeu o limite de 1000 registros; nada cancelado.')
  const running: string[] = []
  for (const row of rows) {
    if (!row || typeof row !== 'object' || !('id' in row) || typeof row.id !== 'string' || !('state' in row) || typeof row.state !== 'string') {
      throw new Error('Fleet com formato incompatível; nada cancelado.')
    }
    if (row.state === 'running') running.push(row.id)
  }
  let stopped = 0
  let refused = 0
  for (const id of new Set(running)) {
    const outcome = source.stop(id)
    if (outcome === 'stopping') stopped++
    else if (outcome !== 'not-running') refused++
  }
  return { stopped, refused }
}

export function detachAgents(source: FleetControl | undefined = currentFleet()): number {
  if (!source) throw new Error('Controle de subagentes indisponível nesta sessão.')
  return source.detachForeground()
}
