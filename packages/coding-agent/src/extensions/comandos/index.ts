// comandos: paleta do “/” em pt-BR, painel “?” e /atalhos. Desligue com PI_COMANDOS=0.
import { join } from 'node:path'
import { getAgentDir } from '@earendil-works/pi-coding-agent'
import { matchesKey } from '@earendil-works/pi-tui'
import { abrirPainel } from './painel.ts'
import { criarProvider, gravarRecente, lerRecentes } from './paleta.ts'
import { registrarAtalhos } from './atalhos.ts'
import { teclaEfetiva, teclasDoArquivo } from './teclas.ts'

// Ponte com extensions/ui/editor.ts (carregado à parte): quem lê é o editor, ao digitar `?` num editor vazio.
const PONTE = '__piHarnessComandos'

export default function (pi: any): void {
  if (process.env.PI_COMANDOS === '0') return
  registrarAtalhos(pi)
  const teclas = teclasDoArquivo(join(getAgentDir(), 'keybindings.json'))
  pi.on('session_start', (_event: unknown, ctx: any) => {
    if (!ctx.hasUI) return
    ctx.ui.addAutocompleteProvider((current: any) =>
      criarProvider(current, { keyFor: (id) => teclaEfetiva(teclas, id), recentes: () => lerRecentes() }))
    // `input` não dispara para comandos de extensão nem nativos: Enter com texto “/cmd” no editor registra o recente.
    ctx.ui.onTerminalInput((data: string) => {
      try { if (matchesKey(data, 'enter')) gravarRecente(ctx.ui.getEditorText?.() ?? '') } catch { /* recentes são opcionais */ }
      return undefined
    })
    ;(globalThis as any)[PONTE] = {
      openShortcuts: (inserir: (s: string) => void) => void abrirPainel(ctx, inserir).catch((e) => { try { ctx.ui.notify(`Painel indisponível: ${e instanceof Error ? e.message : e}`, 'warning') } catch { /* ctx obsoleto */ } }),
    }
  })
  pi.on('session_shutdown', () => { delete (globalThis as any)[PONTE] })
}
