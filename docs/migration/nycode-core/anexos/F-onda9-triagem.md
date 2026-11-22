# Triagem da onda 9 (D-56, D-57, D-58)

Fonte: foto congelada em 2026-11-22 de `/home/marcio/code/pi-harness` (ramo `feat/ui-onda9-harness`, HEAD `4e38f41`, mais
mudanças não commitadas), em `/tmp/pi-harness-snap-20261122` com `MANIFEST.sha256` (960 arquivos). Base da fusão: `40cc6ef`
(D-57). Estado: `feito` (PR em `main`), `em curso`, `a fazer`, `fora` (motivo na coluna).

## Extensões

| Grupo | Origem | Estado | PR |
| --- | --- | --- | --- |
| Temas `nycode-claro`, `nycode-escuro`, `nycode-noite` | `themes/pi-*.json` | feito | #325 |
| `folha` e `ui/a11y` | `extensions/folha`, `extensions/ui/a11y.ts` | feito | #326 |
| `claude-compat` base (aliases, fleet, slot de permissões, vim) | `extensions/claude-compat` | feito | #327 |
| `travar-modelos` | `extensions/travar-modelos` | feito | #329 |
| `chat-margin` (K15) | `extensions/chat-margin` | feito | #330 |
| `ui` e `ui-visual`, tema `tokyo-night` | `extensions/ui`, `extensions/ui-visual`, `themes/tokyo-night.json` | em curso | — |
| `hook-msgs`, `image-open`, `code-blocks`, `avisos`, `diagnostico`, `comandos` | `extensions/<nome>` | a fazer | — |
| `claude-compat` restante | `extensions/claude-compat` | a fazer | — |
| Já migradas: `auto-resume`, `bash-clamp`, `bash-timeout`, `bypass-permissions`, `compact-at-400k`, `plan-gate`, `syntax-check`, `sticky-prompt`, `up-dequeue`, `footer-no-stats`, `sound-notify`, `pi-docs` | `extensions/<nome>` | a fazer | — |
| `no-context-files-covers-claude-md`, `cache-prefix-probe` | `extensions/<nome>` | fora (D-10) | — |
| `claude-compat/background/`, `test/acceptance/` | `extensions/claude-compat` | fora (D-56) | — |

## `claude-home`

| Grupo | Arquivos (alterados/novos) | Estado | PR |
| --- | --- | --- | --- |
| `patches/pi-code` | 99 | fora (D-32, já no core) | — |
| `patches/pi-core/editor-actions` (K16) | 3 | em curso | — |
| `patches/pi-core`: `send-now`, `retomada`, `scrollbar-imagem`, `session-cwd`, `ui-controls`, `avisos`, `contexto-reserve` | 17 | a fazer | — |
| `agents/` | 17/0 | a fazer | — |
| `skills/`, `rules-ref/`, `CLAUDE.md` | 11/0 | a fazer | — |
| `hooks/` (`guard`, `dispatch`, `graph_context`, `diag.py`, `claims`, `permissions/`) | 6/14 | a fazer | — |
| `bin/` (`hud`, `checks`, `evals`, `lifecycle`, `session-transport`, `pi-session`, `puxar`, `mcp-header.sh`, `fonte-icones.py`, `tests/`) | 18/57 | a fazer | — |
| `commands/` | 1/7 | a fazer | — |
| `lite/settings.json`, `plugins/claude-hud`, `settings.json.example` | 3/0 | a fazer | — |
| `docs/` | 2/10 | a fazer (só o que um texto embarcado cita) | — |
