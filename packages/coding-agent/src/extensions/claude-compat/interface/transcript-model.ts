/** Entradas da sessão → blocos de texto seguros para a visão de transcrição (interface.md §4). Só leitura, sem pi-tui. */
export type Kind = 'user' | 'assistant' | 'thinking' | 'tool-call' | 'tool-result' | 'bash' | 'custom' | 'summary'
export interface Block { kind: Kind; title: string; text: string; clipped: boolean }

export const MAX_BLOCK_CHARS = 20_000
export const MAX_BLOCKS = 5_000
export const MAX_TOTAL_CHARS = 4_000_000

// OSC/CSI/DCS e demais sequências de terminal + controles C0/C1 (mantém \n e \t). Conteúdo de ferramenta nunca injeta escape.
const OSC = /\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)?/g
const CSI = /\x1b\[[0-?]*[ -/]*[@-~]?/g
const ESC_OTHER = /\x1b[P^_X][\s\S]*?(?:\x1b\\|$)|\x1b[@-Z\\-_]?/g
// biome-ignore lint/suspicious/noControlCharactersInRegex: sanitização deliberada
const CONTROLS = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g

export function sanitize(raw: string): string {
  return raw.replace(/\r\n?/g, '\n').replace(OSC, '').replace(CSI, '').replace(ESC_OTHER, '').replace(CONTROLS, '')
}

function clip(raw: unknown): { text: string; clipped: boolean } {
  const s = typeof raw === 'string' ? raw : ''
  const clipped = s.length > MAX_BLOCK_CHARS
  return { text: sanitize(clipped ? s.slice(0, MAX_BLOCK_CHARS) : s), clipped }
}

const block = (kind: Kind, title: string, raw: unknown): Block => ({ kind, title: sanitize(title).slice(0, 80), ...clip(raw) })

function parts(content: unknown): { text: string; images: number } {
  if (typeof content === 'string') return { text: content, images: 0 }
  if (!Array.isArray(content)) return { text: '', images: 0 }
  let images = 0
  const texts: string[] = []
  for (const p of content) {
    if (p?.type === 'text' && typeof p.text === 'string') texts.push(p.text)
    else if (p?.type === 'image') images++
  }
  return { text: texts.join('\n'), images }
}

function args(a: unknown): string {
  try {
    return JSON.stringify(a, null, 2) ?? ''
  } catch {
    return '[argumentos não serializáveis]'
  }
}

/** Constrói os blocos; acima de MAX_BLOCKS mantém os mais recentes e informa o corte. */
export function buildBlocks(entries: unknown[]): { blocks: Block[]; dropped: number } {
  const out: Block[] = []
  for (const e of entries as Record<string, any>[]) {
    if (e?.type === 'message' && e.message) {
      const m = e.message
      if (m.role === 'user') {
        const p = parts(m.content)
        out.push(block('user', 'Você', p.images ? `${p.text}\n[${p.images} imagem(ns)]` : p.text))
      } else if (m.role === 'assistant' && Array.isArray(m.content)) {
        for (const c of m.content) {
          if (c?.type === 'text') out.push(block('assistant', 'Assistente', c.text))
          else if (c?.type === 'thinking') out.push(block('thinking', 'Raciocínio', c.thinking))
          else if (c?.type === 'toolCall') out.push(block('tool-call', `Chamada: ${String(c.name)}`, args(c.arguments)))
        }
      } else if (m.role === 'toolResult') {
        const p = parts(m.content)
        out.push(block('tool-result', `Resultado: ${String(m.toolName)}${m.isError ? ' (erro)' : ''}`, p.images ? `${p.text}\n[${p.images} imagem(ns)]` : p.text))
      } else if (m.role === 'bashExecution') {
        out.push(block('bash', `! ${String(m.command)}${m.exitCode !== undefined && m.exitCode !== 0 ? ` (saída ${m.exitCode})` : ''}`, m.output))
      } else if (m.role === 'custom') out.push(block('custom', String(m.customType ?? 'mensagem'), parts(m.content).text))
    } else if (e?.type === 'custom_message') out.push(block('custom', String(e.customType ?? 'mensagem'), parts(e.content).text))
    else if (e?.type === 'compaction') out.push(block('summary', 'Compactação', e.summary))
    else if (e?.type === 'branch_summary') out.push(block('summary', 'Resumo do ramo', e.summary))
  }
  // Mantém os blocos mais recentes dentro dos dois limites (contagem e caracteres totais).
  let keep = Math.min(out.length, MAX_BLOCKS)
  let total = 0
  let i = out.length
  while (i > out.length - keep) {
    total += out[i - 1].text.length
    if (total > MAX_TOTAL_CHARS && i < out.length) break
    i--
  }
  keep = out.length - i
  const dropped = out.length - keep
  return { blocks: dropped ? out.slice(dropped) : out, dropped }
}

/** Texto completo para o editor externo (sem truncar a exibição; ainda sanitizado e limitado por bloco). */
export function plainText(blocks: Block[]): string {
  return blocks.map((b) => `## ${b.title}\n${b.text}${b.clipped ? '\n[… bloco truncado em 20000 caracteres]' : ''}`).join('\n\n') + '\n'
}
