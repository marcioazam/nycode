# Limpeza de nomes "claude" (2026-11-25)

Objetivo: tirar o prefixo `claude-` de comandos do nycode e remover sobras do porte que não fazem sentido no nycode,
mantendo o que é compatibilidade real com o Claude Code.

## Contrato antigo → novo

| Antes | Depois | Motivo |
|---|---|---|
| `/claude-effort` (+ alias `/effort`) | `/effort` | Não há `/effort` nativo; o alias deixou de ser necessário |
| `/claude-config`, `/claude-theme`, `/claude-tui` | `/config-set`, `/theme-set`, `/tui-set` | Sem argumentos, `/config`, `/theme` e `/tui` seguem para `/settings` (alias); uma extensão não consegue despachar comando nativo, então a forma com argumentos precisa de outro nome |
| `/claude-branch` | `/clone-as` | `/branch` sem nome segue para `/clone`; com nome, `/clone-as` |
| `/claude-copy` | `/copy-pick` | `/copy` é nativo; `/copy N` vai para `/copy-pick` |
| `/claude-help` | `/compat` | Mapa de compatibilidade com o Claude Code |
| `/revise-claude-md` | `/revise-agents-md` | O arquivo principal do nycode é `AGENTS.md` |
| `/claude-tier` | removido | Sonda de contas Claude Team; segue como prompt pessoal em `~/.nycode/agent/prompts/` |

Correções (bug, TDD): `/list-agents` lia `~/.nycode/agent/claude-home/agents` (inexistente) e `/doctor` procurava o
`guard.py` em `claude-home/hooks`; agora leem os agentes embutidos + `~/.nycode/agent/agents` e o `hooks/guard.py`
embutido.

## Mantido de propósito

- Provedor e modelos Anthropic; leitura de `CLAUDE.md`/`.claude/`; extensões `claude-compat`, `claude-rules`,
  `import-claude-session`; plugin de terceiros `claude-hud`.
- Variáveis `CLAUDE_*`/`CLAUDE_CODE_*`: as de hooks e plugins são o protocolo do Claude Code; as de configuração
  (`CLAUDE_CODE_SUBAGENT_MODEL`, `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP`...) são os nomes documentados do Claude Code que o
  nycode honra por compatibilidade.
- `customType`/entradas de sessão (`claude-stop-hook`, `claude-import`, `claude-prompt-color`...): formato gravado em
  sessões; renomear quebraria sessões antigas sem ganho visível.
- `~/.claude/telemetry/scans` (hook-dispatch) e `claude-graph-context` (cache do codegraph): compartilhados de
  propósito com o harness do Claude Code.
- Entradas `claude-home` do guard (TS e Python): proteções mortas mas inofensivas; mudar regra de segurança fica para
  uma revisão própria.
- `docs/migration/**` e registros antigos de `docs/harness/`: histórico.

## Evidência

Ver o relatório da sessão (checks rodados e resultados).
