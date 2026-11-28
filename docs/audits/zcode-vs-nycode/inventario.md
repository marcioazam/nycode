# Inventario Completo ZCode v4.0.0 -> nycode

Este documento reconcilia **100% dos arquivos rastreados** por `git -C ~/source/zcode-ref ls-files` na tag `v4.0.0` (SHA `a4b4445141eb7d3b3e99eada9292775383bfc44e`) contra os arquivos de codigo listados individualmente nos subarquivos em [inventario/01-harness-core-cli-tui.md](inventario/01-harness-core-cli-tui.md).

## Reconciliacao Deterministica com `git ls-files`

| Categoria / Particao | Quantidade | Observacao |
| :--- | ---: | :--- |
| **Total `git -C ~/source/zcode-ref ls-files`** | **19355** | Soma exata dos 5 baldes abaixo |
| 1. Codigo de primeira parte (listado 1:1) | 9212 | Somatorio das tabelas em `inventario/01..06-*.md` = **9212** |
| 2. Codigo/declaracoes geradas excluidas | 33 | `.d.ts` (28), `.js.map`/`.d.ts.map` (4), `bash-command-registry.ts` (1) |
| 3. Vendor excluido | 9 | `apps/zcode-cli/packages/visualize-plugin/.../assets/vendor/**` (D3, Floating UI, Lucide) |
| 4. Third-party standalone / espelhos / skills travadas / patches | 3898 | Catalogado em `third-party/copied-components.json` e `skills-lock.json` |
| 5. Demais arquivos rastreados nao-codigo | 6203 | Markdown, JSON, YAML, fixtures `.txt`/`.mmd`, imagens/fontes, `.env*` nao lidos (codigo nesse balde = 0) |

### Detalhamento do Balde 4 (Third-Party Excluido)

| Raiz / Padrao Excluido | Arquivos |
| :--- | ---: |
| `packages/{desktop,web}/.../material-icons/**` | 2292 |
| `docs/electron/**` (espelho docs Electron) | 494 |
| `apps/zcode-cli/packages/design-plugin/skills/design/design-resources/**` | 361 |
| `.agents/skills/{agent-browser,ai-elements,dogfood,react-best-practices}/**` | 219 |
| `third-party/**` (inventarios/licencas/upstream) | 219 |
| `docs/knip/**` (espelho docs Knip) | 173 |
| `apps/zcode-cli/.agents/skills/{opentui,vercel-react-*}/**` | 130 |
| `patches/*.patch` | 10 |

### Subarquivos do Inventario 1:1 (Total = 9212 arquivos)

| Subarquivo | Ordem / Escopo | Arquivos |
| :--- | :--- | ---: |
| [01-harness-core-cli-tui.md](inventario/01-harness-core-cli-tui.md) | Nucleo do Harness: core, contracts, shared-types, cli e tui (`apps/zcode-cli/packages/{core,contracts,shared-types,cli,tui}`) | 1422 |
| [02-harness-adapters-bootstrap.md](inventario/02-harness-adapters-bootstrap.md) | Adaptadores, Bootstrap, I18n, Debug, Telemetria e CLI Tooling (`apps/zcode-cli/packages/{adapters,bootstrap,i18n,debug,telemetry} + apps/zcode-cli/{scripts,tools,e2e,tests}`) | 1297 |
| [03-harness-workflows-repl-plugins.md](inventario/03-harness-workflows-repl-plugins.md) | Dynamic Workflow, Node REPL Host e Plugins/Skills Empacotadas (`apps/zcode-cli/packages/{dynamic-workflow*,node-repl-host,bundled-skills,*-plugin,office-runtime,swift-bridge}`) | 765 |
| [04-platform-packages.md](inventario/04-platform-packages.md) | Pacotes Compartilhados, Server/RPC, Policy/Formal-Proof e Scripts (`packages/{server,zcode-server-cli,rpc,session-control,provider*,model-option-map,plugin-api,zcode-cua,formal-proof,services,shared,...} + raiz/scripts`) | 1443 |
| [05-ui-web-android.md](inventario/05-ui-web-android.md) | Superficies UI React, Web, Android e Dev-Docs (`packages/{ui,web,android} + apps/dev-docs`) | 2407 |
| [06-desktop.md](inventario/06-desktop.md) | Aplicacao Desktop Electron e Suite E2E (`packages/desktop`) | 1878 |

## Mapa Pacote-a-Pacote (Ordem: CLI Core -> Platform Packages -> Desktop/Web/Android)

| Pacote ZCode | Grupo | Arq. Codigo | Equiv. Direto | Equiv. Parcial | Sem Equiv. | Fora Escopo | Mapeamento Principal no nycode |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | :--- |
| `apps/zcode-cli/packages/cli` | `01-harness-core-cli-tui` | 141 | 141 | 0 | 0 | 0 | `packages/coding-agent/src/cli`; `packages/coding-agent/src/modes/interactive` |
| `apps/zcode-cli/packages/contracts` | `01-harness-core-cli-tui` | 168 | 0 | 168 | 0 | 0 | `packages/agent/src/types.ts`; `packages/ai/src/types.ts`; `packages/schema/src` |
| `apps/zcode-cli/packages/core` | `01-harness-core-cli-tui` | 990 | 71 | 907 | 12 | 0 | `packages/agent/src/agent-loop.ts`; `packages/coding-agent/src/core/agent-session.ts`, `packages/chord/src`; `packages/codemode/src` (+27) |
| `apps/zcode-cli/packages/shared-types` | `01-harness-core-cli-tui` | 1 | 1 | 0 | 0 | 0 | `packages/ai/src/types.ts` |
| `apps/zcode-cli/packages/tui` | `01-harness-core-cli-tui` | 122 | 122 | 0 | 0 | 0 | `packages/tui/src`; `packages/coding-agent/src/modes/interactive` |
| `apps/zcode-cli (raiz/scripts/e2e)` | `02-harness-adapters-bootstrap` | 40 | 9 | 31 | 0 | 0 | `packages/coding-agent/scripts`; `scripts`, `packages/evals/src`; `packages/coding-agent/test` |
| `apps/zcode-cli/packages/adapters` | `02-harness-adapters-bootstrap` | 495 | 39 | 440 | 16 | 0 | `packages/ai/src/auth`; `packages/coding-agent/src/core/auth-storage.ts`, `packages/ai/src/providers`; `packages/agent/src/agent-loop.ts` (+6) |
| `apps/zcode-cli/packages/bootstrap` | `02-harness-adapters-bootstrap` | 668 | 470 | 198 | 0 | 0 | `packages/coding-agent/src/core/agent-session-runtime.ts`; `packages/coding-agent/src/core/sdk.ts`, `packages/coding-agent/src/core/project-trust.ts`; `packages/coding-agent/src/core/trust-manager.ts` (+1) |
| `apps/zcode-cli/packages/debug` | `02-harness-adapters-bootstrap` | 16 | 0 | 16 | 0 | 0 | `packages/coding-agent/src/extensions/diagnostico` (parcial) |
| `apps/zcode-cli/packages/i18n` | `02-harness-adapters-bootstrap` | 6 | 0 | 0 | 6 | 0 | sem equivalente |
| `apps/zcode-cli/packages/telemetry` | `02-harness-adapters-bootstrap` | 21 | 21 | 0 | 0 | 0 | `packages/telemetry/src`; `packages/coding-agent/src/core/telemetry.ts` |
| `apps/zcode-cli/tools` | `02-harness-adapters-bootstrap` | 51 | 0 | 51 | 0 | 0 | `packages/evals/src`; `bench` |
| `apps/zcode-cli/packages/android-emulator-plugin` | `03-harness-workflows-repl-plugins` | 19 | 19 | 0 | 0 | 0 | `packages/coding-agent/scripts`; `scripts` |
| `apps/zcode-cli/packages/browser-use-plugin` | `03-harness-workflows-repl-plugins` | 5 | 5 | 0 | 0 | 0 | `packages/coding-agent/scripts`; `scripts` |
| `apps/zcode-cli/packages/design-plugin` | `03-harness-workflows-repl-plugins` | 17 | 17 | 0 | 0 | 0 | `packages/coding-agent/scripts`; `scripts` |
| `apps/zcode-cli/packages/documents-plugin` | `03-harness-workflows-repl-plugins` | 11 | 11 | 0 | 0 | 0 | `packages/coding-agent/scripts`; `scripts` |
| `apps/zcode-cli/packages/dynamic-workflow` | `03-harness-workflows-repl-plugins` | 488 | 488 | 0 | 0 | 0 | `packages/coding-agent/scripts`; `scripts` |
| `apps/zcode-cli/packages/dynamic-workflow-runtime` | `03-harness-workflows-repl-plugins` | 25 | 25 | 0 | 0 | 0 | `packages/coding-agent/scripts`; `scripts` |
| `apps/zcode-cli/packages/ios-simulator-plugin` | `03-harness-workflows-repl-plugins` | 13 | 13 | 0 | 0 | 0 | `packages/coding-agent/scripts`; `scripts` |
| `apps/zcode-cli/packages/node-repl-host` | `03-harness-workflows-repl-plugins` | 24 | 24 | 0 | 0 | 0 | `packages/coding-agent/scripts`; `scripts` |
| `apps/zcode-cli/packages/office-runtime` | `03-harness-workflows-repl-plugins` | 78 | 78 | 0 | 0 | 0 | `packages/coding-agent/scripts`; `scripts` |
| `apps/zcode-cli/packages/pdf-plugin` | `03-harness-workflows-repl-plugins` | 14 | 14 | 0 | 0 | 0 | `packages/coding-agent/scripts`; `scripts` |
| `apps/zcode-cli/packages/plugin-creator-plugin` | `03-harness-workflows-repl-plugins` | 8 | 8 | 0 | 0 | 0 | `packages/coding-agent/scripts`; `scripts` |
| `apps/zcode-cli/packages/presentations-plugin` | `03-harness-workflows-repl-plugins` | 1 | 1 | 0 | 0 | 0 | `packages/coding-agent/scripts`; `scripts` |
| `apps/zcode-cli/packages/restore-legacy-sessions-plugin` | `03-harness-workflows-repl-plugins` | 2 | 2 | 0 | 0 | 0 | `packages/coding-agent/scripts`; `scripts` |
| `apps/zcode-cli/packages/spreadsheets-plugin` | `03-harness-workflows-repl-plugins` | 8 | 8 | 0 | 0 | 0 | `packages/coding-agent/scripts`; `scripts` |
| `apps/zcode-cli/packages/superpowers-plugin` | `03-harness-workflows-repl-plugins` | 9 | 9 | 0 | 0 | 0 | `packages/coding-agent/scripts`; `scripts` |
| `apps/zcode-cli/packages/swift-bridge` | `03-harness-workflows-repl-plugins` | 1 | 1 | 0 | 0 | 0 | `packages/coding-agent/scripts`; `scripts` |
| `apps/zcode-cli/packages/visualize-plugin` | `03-harness-workflows-repl-plugins` | 5 | 5 | 0 | 0 | 0 | `packages/coding-agent/scripts`; `scripts` |
| `apps/zcode-cli/packages/zcode-cua-plugin` | `03-harness-workflows-repl-plugins` | 3 | 3 | 0 | 0 | 0 | `packages/coding-agent/scripts`; `scripts` |
| `apps/zcode-cli/packages/zcode-site-plugin` | `03-harness-workflows-repl-plugins` | 34 | 34 | 0 | 0 | 0 | `packages/coding-agent/scripts`; `scripts` |
| `.agents/` | `04-platform-packages` | 6 | 0 | 6 | 0 | 0 | `.nycode/skills` |
| `.husky/` | `04-platform-packages` | 1 | 1 | 0 | 0 | 0 | `scripts/ci/run-static.sh`; `scripts` |
| `packages/client` | `04-platform-packages` | 12 | 0 | 0 | 0 | 12 | fora do escopo de harness |
| `packages/design-runtime` | `04-platform-packages` | 10 | 0 | 0 | 0 | 10 | fora do escopo de harness |
| `packages/e2e-report` | `04-platform-packages` | 10 | 0 | 0 | 0 | 10 | fora do escopo de harness |
| `packages/formal-proof` | `04-platform-packages` | 3 | 0 | 0 | 3 | 0 | sem equivalente (invariantes via testes em `packages/coding-agent/test`) |
| `packages/model-option-map` | `04-platform-packages` | 8 | 8 | 0 | 0 | 0 | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` |
| `packages/plugin-api` | `04-platform-packages` | 9 | 0 | 9 | 0 | 0 | `packages/coding-agent/src/core/extensions`; `apps/p2/src` |
| `packages/provider` | `04-platform-packages` | 24 | 24 | 0 | 0 | 0 | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` |
| `packages/provider-node` | `04-platform-packages` | 17 | 17 | 0 | 0 | 0 | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` |
| `packages/rpc` | `04-platform-packages` | 20 | 0 | 20 | 0 | 0 | `packages/coding-agent/src/modes/rpc` |
| `packages/server` | `04-platform-packages` | 58 | 0 | 58 | 0 | 0 | `packages/env/src`; `packages/durable/src` |
| `packages/services` | `04-platform-packages` | 573 | 0 | 282 | 0 | 291 | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core`, `packages/env/src`; `apps/p3/src` (+1) |
| `packages/session-control` | `04-platform-packages` | 23 | 0 | 23 | 0 | 0 | `packages/durable/src/session`; `packages/coding-agent/src/modes/rpc` |
| `packages/share-ui` | `04-platform-packages` | 1 | 0 | 0 | 0 | 1 | fora do escopo de harness |
| `packages/shared` | `04-platform-packages` | 410 | 0 | 379 | 0 | 31 | `packages/coding-agent/src/modes/rpc`; `packages/durable/src`, `packages/schema/src`; `packages/ai/src/types.ts` (+1) |
| `packages/stream-animate` | `04-platform-packages` | 17 | 0 | 0 | 0 | 17 | fora do escopo de harness |
| `packages/web-share` | `04-platform-packages` | 3 | 0 | 0 | 0 | 3 | fora do escopo de harness |
| `packages/zcode-cua` | `04-platform-packages` | 15 | 0 | 0 | 0 | 15 | sem equivalente |
| `packages/zcode-server-cli` | `04-platform-packages` | 59 | 0 | 59 | 0 | 0 | `packages/env/src`; `packages/durable/src` |
| `raiz` | `04-platform-packages` | 8 | 7 | 1 | 0 | 0 | `biome.json`; `vitest.base.ts`, `scripts/ci/lint/core_scope.py`; `scripts/ci/run-static.sh` |
| `scripts/` | `04-platform-packages` | 156 | 142 | 14 | 0 | 0 | `scripts/ci/lint/core_scope.py`; `scripts/ci/run-static.sh`, `scripts/ci/run-static.sh`; `scripts` |
| `apps/dev-docs` | `05-ui-web-android` | 26 | 0 | 0 | 0 | 26 | fora do escopo de harness |
| `packages/android` | `05-ui-web-android` | 13 | 0 | 0 | 0 | 13 | fora do escopo de harness |
| `packages/ui` | `05-ui-web-android` | 2276 | 0 | 0 | 0 | 2276 | fora do escopo de harness |
| `packages/web` | `05-ui-web-android` | 92 | 0 | 0 | 0 | 92 | apps/p2/src (app web separado) / fora do escopo CLI, fora do escopo de harness |
| `packages/desktop` | `06-desktop` | 1878 | 0 | 0 | 0 | 1878 | fora do escopo de harness |
