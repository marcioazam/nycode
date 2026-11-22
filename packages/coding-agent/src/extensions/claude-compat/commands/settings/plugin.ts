/** /plugin e /plugins: lista e remove `packages` (SettingsManager nativo). Instalar de terceiros exige vetting (presente-de-grego): `add` é recusado. */
import type { ExtensionAPI, ExtensionCommandContext } from '@earendil-works/pi-coding-agent'
import { readSettings, realOpener, removePackage, type Opener } from './store.ts'

type Ctx = Pick<ExtensionCommandContext, 'ui' | 'cwd'>
const label = (p: unknown): string => (typeof p === 'string' ? p : String((p as { source?: unknown } | null)?.source ?? '?'))

export async function pluginCommand(args: string, ctx: Ctx, open: Opener = realOpener): Promise<void> {
  const [sub = 'list', ...rest] = args.trim().split(/\s+/).filter(Boolean)
  if (sub === 'list') {
    const cur = await readSettings(open, ctx.cwd)
    if (!cur.ok) return ctx.ui.notify(cur.error, 'error')
    const list = Array.isArray(cur.data.packages) ? cur.data.packages : []
    return ctx.ui.notify(list.length ? `Pacotes (${list.length}):\n${list.map((p) => `  ${label(p)}`).join('\n')}` : 'Nenhum pacote configurado.', 'info')
  }
  if (sub === 'remove' && rest.length === 1) {
    const r = await removePackage(open, ctx.cwd, rest[0]!)
    if (!r.ok) return ctx.ui.notify(r.error, 'error')
    return ctx.ui.notify(r.removed ? `Removido de settings: ${rest[0]}. Rode /reload.` : `Pacote "${rest[0]}" não está em settings.`, r.removed ? 'info' : 'warning')
  }
  if (sub === 'add' || sub === 'install') return ctx.ui.notify('Instalar pacotes de terceiros não é feito por este comando: vete o pacote (skill presente-de-grego) e use `pi install <fonte>` fora da sessão.', 'error')
  ctx.ui.notify('Uso: /plugin [list] | /plugin remove <fonte>', 'error')
}

export function registerPlugin(pi: ExtensionAPI, open?: Opener): void {
  for (const n of ['plugin', 'plugins']) pi.registerCommand(n, { description: 'Lista ou remove pacotes do pi (settings.packages)', handler: (a, ctx) => pluginCommand(a, ctx, open) })
}
