# Triagem da onda 9 (D-56, D-57, D-58)

Fonte: foto congelada em 2026-11-22 de `/home/marcio/code/pi-harness` (ramo `feat/ui-onda9-harness`, HEAD `4e38f41`, mais
mudanças não commitadas), em `/tmp/pi-harness-snap-20261122` com `MANIFEST.sha256` (960 arquivos). Base da fusão: `40cc6ef`
(D-57). Estado: `feito` (PR em `main`), `em curso`, `fora` (motivo na coluna).

## Extensões

| Grupo | Origem | Estado | PR |
| --- | --- | --- | --- |
| Temas `nycode-claro`, `nycode-escuro`, `nycode-noite` | `themes/pi-*.json` | feito | #325 |
| `folha` e `ui/a11y` | `extensions/folha`, `extensions/ui/a11y.ts` | feito | #326 |
| `claude-compat` base (aliases, fleet, slot de permissões, vim) | `extensions/claude-compat` | feito | #327 |
| `travar-modelos` | `extensions/travar-modelos` | feito | #329 |
| `chat-margin` (K15) | `extensions/chat-margin` | feito | #330 |
| `ui` e `ui-visual`, tema `tokyo-night` | `extensions/ui`, `extensions/ui-visual`, `themes/tokyo-night.json` | feito | #333 |
| `hook-msgs` | `extensions/hook-msgs` | feito | #334 |
| `image-open` | `extensions/image-open` | feito | #335 |
| `code-blocks` | `extensions/code-blocks` | feito | #336 |
| `comandos` | `extensions/comandos` | feito | #339 |
| `avisos` (K17) | `extensions/avisos`, `patches/pi-core/avisos` | feito | #340 |
| `diagnostico` | `extensions/diagnostico` | feito | #342 |
| Já migradas: `auto-resume`, `bash-timeout`, `bypass-permissions`, `compact-at-400k`, `plan-gate`, `syntax-check`, `sticky-prompt`, `up-dequeue`, `footer-no-stats`, `sound-notify`, `pi-docs` (ferramentas, sessão, núcleo) | `extensions/<nome>` | feito | #343, #344, #345 |
| `claude-compat` partes 2 e 3 | `extensions/claude-compat` | feito | #346, #348 |
| `/contexto` (K18) | `extensions/contexto` | feito | #347 |
| `bash-clamp` | `extensions/bash-clamp` | fora: coberta pelo `bash-main-guard` e pelo limite do `bash` do core (#28) | — |
| `no-context-files-covers-claude-md`, `cache-prefix-probe` | `extensions/<nome>` | fora (D-10) | — |
| `claude-compat/background/`, `test/acceptance/` | `extensions/claude-compat` | fora (D-56) | — |

## `claude-home`

| Grupo | Arquivos (alterados/novos) | Estado | PR |
| --- | --- | --- | --- |
| `patches/pi-code` | 99 | fora (D-32, já no core) | — |
| `patches/pi-core/editor-actions` (K16) | 3 | feito | #332 |
| `patches/pi-core`: `interface` (K19) | — | feito | #350 |
| `patches/pi-core`: `retomada` (K20) | — | feito | #354 |
| `patches/pi-core`: `scrollbar-imagem` (K21) | — | feito | #355 |
| `patches/pi-core`: `send-now` (K22) | — | feito | #356 |
| `patches/pi-core`: `session-cwd` (K23, `/cd`) | — | feito | #357 |
| `patches/pi-core`: `avisos` (K17) | — | feito | #340 |
| `patches/pi-core`: `ui-controls`, `contexto-reserve` | — | feito (junto de K18 e das partes de `claude-compat`) | #346, #347, #348 |
| `agents/`, `skills/`, `rules-ref/`, `CLAUDE.md` | 28/0 | feito | #349 |
| `commands/` | 1/7 | feito | #351 |
| `lite/settings.json`, `plugins/claude-hud`, `settings.json.example` | 3/0 | feito | #352 |
| `hooks/`: `dispatch`, `graph_context.py`, `diag.py`, `claims` | 6/14 | feito | #353 |
| `hooks/`: `guard.py` e `permissions/` (motor `script`) | — | feito | #359 |
| `lifecycle/supervisor.sh` (restart) | 1 | fora: substituído pelo supervisor nativo (K24, D-59) | #360 |
| Motor nativo de permissão com paridade ao `guard.py` (D-60, parte 1) | — | feito | #362 |
| Motor nativo como padrão (D-60, parte 2) | — | em curso | — |
| Hooks em TypeScript (`graph-context` interno, D-60) | — | em curso | — |
| `bin/` parte 1: `hud` (`calm`, usage), `checks`, `puxar`, `mcp-header.sh`, `fonte-icones.py` | 18/20 | feito | #363 |
| `bin/` parte 2: `session-transport` (`nycode-session`), `evals/harbor`, `mcp-header` testado, testes de display e roteamento | — | em curso | — |
| Remoção de `import/ny-pi/` e do braço `omp` do bench | — | em curso | — |
| `docs/` | 2/10 | só o que um texto embarcado cita (coberto por #349 e #351) | — |

## Fora, com o motivo

- `bash-clamp` (#28): ver tabela acima.
- `impeccable_gate.sh`: fica como recurso `optional`; fora dos defaults por decisão do dono (a onda 9 o tirou).
- `lifecycle/supervisor.sh`, `lifecycle/test_supervisor.sh`: substituídos pelo K24.
- `lifecycle/patches-manifest.sh`, `lifecycle/patches.sha256` e seus testes: só serviam aos patches do pi.
- Testes de `bin/tests` cobertos ou redundantes: `avisos-core/*`, `retomada-core`, `send-now-apply`, `send-now-runtime` (cobertos pelos testes de K17, K20 e K22); `claude-compat/*` (`sdk-hooks`, `sdk-register`, `with-sdk`, `coverage-map`, `pycov`: ferramentas do SDK gerenciado e de cobertura); `extensions-contract/*`; `headless-lean.test.ts` e `lifecycle/*`; `tests/no-context-files` (D-10).
- Testes `native-*` (`native-frame`, `native-panels`, `native-harness`, `native-cli-e2e`): abrem o CLI real em tmux; pendência do gate final.
- `claims.py`: não é chamado por hook; fica como referência do `check-instructions.py`.
- `claude-compat/background/` e `test/acceptance/` (D-56).

## Pendências

- O motor TypeScript de permissão cobria menos que o `guard.py` até o #362 (modos, reanálise recursiva, baixar-e-executar, `$X` como comando, `/dev/*`, credenciais, `Grep`, `.env.*`, 256 KB, falha fechada); a paridade está no diferencial, e o padrão `native` ainda não vale (parte 2 da D-60).
- Testes intermitentes sob carga: o de SIGTERM do `subagent-extension` (a fixture grava o pid antes da mensagem), o de `agent-session-mcp` e o clique nativo do `image-open` (corrigido no #361).
- Destinos do E: resolvido. O gerador voltou a ser a única fonte do TSV (lista da onda 9 em `--onda9`, regras R18 a R20 e exceções para renomeações e subpastas), e `test_gerar_mapa.py` falha se uma linha for editada à mão ou se um destino não existir.
