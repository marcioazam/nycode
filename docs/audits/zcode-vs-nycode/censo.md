# Censo Mecanico do Harness ZCode v4.0.0

Extracao estatica read-only em `~/source/zcode-ref` (SHA `a4b4445141eb7d3b3e99eada9292775383bfc44e`), sem execucao de scripts ZCode e sem leitura de `.env*`.

## Resumo Quantitativo

| Categoria | Quantidade | Fonte Principal |
| :--- | ---: | :--- |
| Tools built-in + session-control + GoalRead | **60** (**44** com `shouldDefer: true`) | `apps/zcode-cli/packages/core/src/tool/handlers/index.ts:89-166` |
| Slash commands nativos da CLI | **19** | `packages/shared/src/zcode-slash-command-help.ts:9-199` |
| Plugins `.zcode-plugin/plugin.json` em `apps/zcode-cli/packages/` | **53** | `apps/zcode-cli/packages/` |
| Bundled skills em `bundled-skills/` | **1** | `apps/zcode-cli/packages/bundled-skills/skills/` |
| Flags CLI (`--*`) em `arguments.ts` / `main.ts` | **3** | `apps/zcode-cli/packages/cli/src/arguments.ts:1` |
| Variaveis `ZCODE_*` em codigo-fonte de producao | **465** | Codigo de `apps/zcode-cli`, `packages/`, `scripts/` |
| Modulos governados em `architecture-policy.yaml` | **254** (`managed: true` = 133) | `architecture-policy.yaml:1` |

## Catalogo Completo de Tools Built-in

| Tool | Grupo | Deferida (`shouldDefer`) | Implementacao (`arquivo:linha`) |
| :--- | :--- | :--- | :--- |
| `ListSessions` | session-control (cli+app) | `True` | `apps/zcode-cli/packages/core/src/tool/session-control/index.ts:82` |
| `ReadSession` | session-control (cli+app) | `True` | `apps/zcode-cli/packages/core/src/tool/session-control/index.ts:97` |
| `CreateSession` | session-control (cli+app) | `True` | `apps/zcode-cli/packages/core/src/tool/session-control/index.ts:107` |
| `ForkSession` | session-control (cli+app) | `True` | `apps/zcode-cli/packages/core/src/tool/session-control/index.ts:117` |
| `SendToSession` | session-control (cli+app) | `True` | `apps/zcode-cli/packages/core/src/tool/session-control/index.ts:126` |
| `WaitSessions` | session-control (cli+app) | `True` | `apps/zcode-cli/packages/core/src/tool/session-control/index.ts:136` |
| `InterruptSession` | session-control (cli+app) | `True` | `apps/zcode-cli/packages/core/src/tool/session-control/index.ts:146` |
| `RenameSession` | session-control (cli+app) | `True` | `apps/zcode-cli/packages/core/src/tool/session-control/index.ts:158` |
| `ListProjects` | session-control (app-only) | `True` | `apps/zcode-cli/packages/core/src/tool/session-control/index.ts:285` |
| `OpenSession` | session-control (app-only) | `True` | `apps/zcode-cli/packages/core/src/tool/session-control/index.ts:295` |
| `SetSessionArchived` | session-control (app-only) | `True` | `apps/zcode-cli/packages/core/src/tool/session-control/index.ts:304` |
| `SetSessionPinned` | session-control (app-only) | `True` | `apps/zcode-cli/packages/core/src/tool/session-control/index.ts:313` |
| `SearchPlugins` | builtin | `True` | `apps/zcode-cli/packages/core/src/tool/handlers/plugin-discovery.ts:56` |
| `SuggestPluginInstall` | builtin | `True` | `apps/zcode-cli/packages/core/src/tool/handlers/plugin-discovery.ts:96` |
| `ToolSearch` | builtin | `False` | `apps/zcode-cli/packages/core/src/tool/handlers/tool-search.ts:21` |
| `DeferredToolCall` | builtin | `False` | `apps/zcode-cli/packages/core/src/tool/handlers/deferred-tool-call.ts:11` |
| `Read` | builtin | `False` | `apps/zcode-cli/packages/core/src/tool/handlers/read.ts:504` |
| `Write` | builtin | `False` | `apps/zcode-cli/packages/core/src/tool/handlers/write.ts:233` |
| `Edit` | builtin | `False` | `apps/zcode-cli/packages/core/src/tool/handlers/edit.ts:284` |
| `Bash` | builtin | `False` | `apps/zcode-cli/packages/core/src/tool/handlers/bash.ts:645` |
| `Glob` | builtin | `False` | `apps/zcode-cli/packages/core/src/tool/handlers/glob.ts:84` |
| `Grep` | builtin | `False` | `apps/zcode-cli/packages/core/src/tool/handlers/grep.ts:140` |
| `WebFetch` | builtin | `False` | `apps/zcode-cli/packages/core/src/tool/handlers/webfetch.ts:197` |
| `WebSearch` | builtin | `False` | `apps/zcode-cli/packages/core/src/tool/handlers/websearch.ts:155` |
| `TodoRead` | builtin | `True` | `apps/zcode-cli/packages/core/src/tool/handlers/todo.ts:74` |
| `TodoWrite` | builtin | `False` | `apps/zcode-cli/packages/core/src/tool/handlers/todo.ts:131` |
| `CronCreate` | builtin | `True` | `apps/zcode-cli/packages/core/src/tool/handlers/cron.ts:223` |
| `CronList` | builtin | `True` | `apps/zcode-cli/packages/core/src/tool/handlers/cron.ts:291` |
| `CronUpdate` | builtin | `True` | `apps/zcode-cli/packages/core/src/tool/handlers/cron.ts:337` |
| `CronDelete` | builtin | `True` | `apps/zcode-cli/packages/core/src/tool/handlers/cron.ts:390` |
| `CronPauseSelf` | builtin | `True` | `apps/zcode-cli/packages/core/src/tool/handlers/cron.ts:431` |
| `OffPeakCreate` | builtin | `True` | `apps/zcode-cli/packages/core/src/tool/handlers/off-peak.ts:183` |
| `OffPeakList` | builtin | `True` | `apps/zcode-cli/packages/core/src/tool/handlers/off-peak.ts:235` |
| `EnterPlanMode` | builtin | `True` | `apps/zcode-cli/packages/core/src/tool/handlers/plan-mode.ts:106` |
| `ExitPlanMode` | builtin | `True` | `apps/zcode-cli/packages/core/src/tool/handlers/plan-mode.ts:155` |
| `AskUserQuestion` | builtin | `False` | `apps/zcode-cli/packages/core/src/tool/handlers/ask-user-question.ts:71` |
| `SendMessage` | builtin | `True` | `apps/zcode-cli/packages/core/src/tool/handlers/send-message.ts:80` |
| `RespondToCoordinator` | builtin | `True` | `apps/zcode-cli/packages/core/src/tool/handlers/respond-to-coordinator.ts:52` |
| `submit_result` | builtin | `False` | `apps/zcode-cli/packages/core/src/tool/handlers/submit-result.ts:76` |
| `escalate` | builtin | `True` | `apps/zcode-cli/packages/core/src/tool/handlers/escalate.ts:95` |
| `TaskOutput` | builtin | `True` | `apps/zcode-cli/packages/core/src/tool/handlers/task-output.ts:87` |
| `TaskStop` | builtin | `True` | `apps/zcode-cli/packages/core/src/tool/handlers/task-stop.ts:90` |
| `ReadTopicResource` | builtin | `True` | `apps/zcode-cli/packages/core/src/tool/handlers/read-topic-resource.ts:36` |
| `Agent` | builtin | `True` | `apps/zcode-cli/packages/core/src/tool/handlers/agent.ts:300` |
| `Task` | builtin | `True` | `apps/zcode-cli/packages/core/src/tool/handlers/agent.ts:359` |
| `Skill` | builtin | `False` | `apps/zcode-cli/packages/core/src/tool/handlers/skill.ts:223` |
| `js` | builtin | `True` | `apps/zcode-cli/packages/core/src/tool/handlers/node-repl.ts:354` |
| `CreateWorkflow` | builtin | `True` | `apps/zcode-cli/packages/core/src/tool/handlers/create-workflow.ts:367` |
| `AmendWorkflow` | builtin | `True` | `apps/zcode-cli/packages/core/src/tool/handlers/amend-workflow.ts:331` |
| `SaveWorkflow` | builtin | `True` | `apps/zcode-cli/packages/core/src/tool/handlers/save-workflow.ts:247` |
| `EvalWorkflowSnippet` | builtin | `True` | `apps/zcode-cli/packages/core/src/tool/handlers/eval-workflow-snippet.ts:261` |
| `ListWorkflowRuns` | builtin | `True` | `apps/zcode-cli/packages/core/src/tool/handlers/list-workflow-runs.ts:136` |
| `GetWorkflowRun` | builtin | `True` | `apps/zcode-cli/packages/core/src/tool/handlers/get-workflow-run.ts:209` |
| `ResumeWorkflowRun` | builtin | `True` | `apps/zcode-cli/packages/core/src/tool/handlers/resume-workflow-run.ts:175` |
| `ResolveWorkflowQuestion` | builtin | `True` | `apps/zcode-cli/packages/core/src/tool/handlers/resolve-workflow-question.ts:132` |
| `FillWorkflowHole` | builtin | `True` | `apps/zcode-cli/packages/core/src/tool/handlers/fill-workflow-hole.ts:299` |
| `ListSavedWorkflows` | builtin | `True` | `apps/zcode-cli/packages/core/src/tool/handlers/list-saved-workflows.ts:109` |
| `ListModels` | builtin | `True` | `apps/zcode-cli/packages/core/src/tool/handlers/list-models.ts:133` |
| `WaitForMcpServers` | builtin | `False` | `apps/zcode-cli/packages/core/src/tool/handlers/wait-for-mcp-servers.ts:73` |
| `GoalRead` | goal-runtime | `False` | `apps/zcode-cli/packages/core/src/tool/handlers/target.ts:29` |

## Slash Commands Built-in

| Comando | Aliases | Uso | Fonte |
| :--- | :--- | :--- | :--- |
| `/help` | - | `/help [command]` | `packages/shared/src/zcode-slash-command-help.ts:15` |
| `/logout` | - | `/logout` | `packages/shared/src/zcode-slash-command-help.ts:32` |
| `/compact` | - | `/compact [instructions]` | `packages/shared/src/zcode-slash-command-help.ts:38` |
| `/init` | - | `/init [notes]` | `packages/shared/src/zcode-slash-command-help.ts:48` |
| `/expert` | - | `/expert [status\|resume\|stop\|<task>]` | `packages/shared/src/zcode-slash-command-help.ts:57` |
| `/effort` | `/variant` | `/effort [list\|<level>]` | `packages/shared/src/zcode-slash-command-help.ts:68` |
| `/dwf` | - | `/dwf [list\|cancel [runId]\|resume <runId>]` | `packages/shared/src/zcode-slash-command-help.ts:78` |
| `/fork` | - | `/fork [latest\|checkpointId]` | `packages/shared/src/zcode-slash-command-help.ts:87` |
| `/locale` | `/language` | `/locale [auto\|en-US\|zh-CN]` | `packages/shared/src/zcode-slash-command-help.ts:97` |
| `/mcp` | - | `/mcp [list\|status\|connect <server>\|disconnect <server>]` | `packages/shared/src/zcode-slash-command-help.ts:106` |
| `/plugins` | `/plugin` | `/plugins [list\|enable <plugin>\|disable <plugin>]` | `packages/shared/src/zcode-slash-command-help.ts:118` |
| `/mode` | - | `/mode [plan\|build\|edit\|yolo\|guarded]` | `packages/shared/src/zcode-slash-command-help.ts:129` |
| `/model` | - | `/model [list\|provider/model]` | `packages/shared/src/zcode-slash-command-help.ts:138` |
| `/new` | `/clear` | `/new` | `packages/shared/src/zcode-slash-command-help.ts:145` |
| `/resume` | `/continue` | `/resume [sessionId]` | `packages/shared/src/zcode-slash-command-help.ts:156` |
| `/rewind` | - | `/rewind [latest\|checkpointId]` | `packages/shared/src/zcode-slash-command-help.ts:165` |
| `/skill` | - | `/skill [<skill-name> [task]]` | `packages/shared/src/zcode-slash-command-help.ts:174` |
| `/goal` | `/target` | `/goal [pause\|resume\|clear\|replace <objective>\|<objective>]` | `packages/shared/src/zcode-slash-command-help.ts:185` |
| `/workflow` | - | `/workflow [what the workflow should accomplish]` | `packages/shared/src/zcode-slash-command-help.ts:195` |

## Plugins Empacotados (`apps/zcode-cli/packages/`)

| Pacote | Nome no Manifesto | Skills (`SKILL.md`) | Comandos (`.md`) | Agentes (`.md`) | Hooks | MCP |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: |
| `apps/zcode-cli/packages/android-emulator-plugin` | `android-emulator` (`apps/zcode-cli/packages/android-emulator-plugin/.zcode-plugin/plugin.json:1`) | 1 | 1 | 0 | 1 | 1 |
| `apps/zcode-cli/packages/browser-use-plugin` | `browser-use` (`apps/zcode-cli/packages/browser-use-plugin/.zcode-plugin/plugin.json:1`) | 2 | 0 | 0 | 0 | 0 |
| `apps/zcode-cli/packages/design-plugin` | `design` (`apps/zcode-cli/packages/design-plugin/.zcode-plugin/plugin.json:1`) | 83 | 0 | 0 | 1 | 0 |
| `apps/zcode-cli/packages/documents-plugin` | `documents` (`apps/zcode-cli/packages/documents-plugin/.zcode-plugin/plugin.json:1`) | 2 | 0 | 0 | 0 | 0 |
| `apps/zcode-cli/packages/image-search-plugin` | `image-search` (`apps/zcode-cli/packages/image-search-plugin/.zcode-plugin/plugin.json:1`) | 0 | 0 | 0 | 0 | 1 |
| `apps/zcode-cli/packages/ios-simulator-plugin` | `ios-simulator` (`apps/zcode-cli/packages/ios-simulator-plugin/.zcode-plugin/plugin.json:1`) | 1 | 1 | 0 | 1 | 1 |
| `apps/zcode-cli/packages/node-repl-host` | `node-repl-host` (`apps/zcode-cli/packages/node-repl-host/.zcode-plugin/plugin.json:1`) | 0 | 0 | 0 | 0 | 0 |
| `apps/zcode-cli/packages/pdf-plugin` | `pdf` (`apps/zcode-cli/packages/pdf-plugin/.zcode-plugin/plugin.json:1`) | 2 | 0 | 0 | 0 | 0 |
| `apps/zcode-cli/packages/plugin-creator-plugin` | `plugin-creator` (`apps/zcode-cli/packages/plugin-creator-plugin/.zcode-plugin/plugin.json:1`) | 1 | 0 | 0 | 0 | 0 |
| `apps/zcode-cli/packages/presentations-plugin` | `presentations` (`apps/zcode-cli/packages/presentations-plugin/.zcode-plugin/plugin.json:1`) | 2 | 0 | 0 | 0 | 0 |
| `apps/zcode-cli/packages/restore-legacy-sessions-plugin` | `restore-legacy-sessions` (`apps/zcode-cli/packages/restore-legacy-sessions-plugin/.zcode-plugin/plugin.json:1`) | 1 | 1 | 0 | 0 | 0 |
| `apps/zcode-cli/packages/skill-creator-plugin` | `skill-creator` (`apps/zcode-cli/packages/skill-creator-plugin/.zcode-plugin/plugin.json:1`) | 1 | 0 | 0 | 0 | 0 |
| `apps/zcode-cli/packages/spreadsheets-plugin` | `spreadsheets` (`apps/zcode-cli/packages/spreadsheets-plugin/.zcode-plugin/plugin.json:1`) | 2 | 0 | 0 | 0 | 0 |
| `apps/zcode-cli/packages/superpowers-plugin` | `superpowers` (`apps/zcode-cli/packages/superpowers-plugin/.zcode-plugin/plugin.json:1`) | 14 | 0 | 0 | 1 | 0 |
| `apps/zcode-cli/packages/visualize-plugin` | `visualize` (`apps/zcode-cli/packages/visualize-plugin/.zcode-plugin/plugin.json:1`) | 1 | 0 | 0 | 0 | 0 |
| `apps/zcode-cli/packages/zcode-cua-plugin` | `computer-use` (`apps/zcode-cli/packages/zcode-cua-plugin/.zcode-plugin/plugin.json:1`) | 1 | 0 | 0 | 0 | 0 |
| `apps/zcode-cli/packages/zcode-guide-plugin` | `zcode-guide` (`apps/zcode-cli/packages/zcode-guide-plugin/.zcode-plugin/plugin.json:1`) | 6 | 0 | 0 | 0 | 0 |
| `apps/zcode-cli/packages/zcode-site-plugin` | `zcode-site` (`apps/zcode-cli/packages/zcode-site-plugin/.zcode-plugin/plugin.json:1`) | 1 | 8 | 0 | 0 | 0 |
| `packages/desktop/test/e2e` | `e2e-ext-approvals` (`packages/desktop/test/e2e/fixtures/fs/plugins/plugin-extension-approvals/e2e-ext-approvals/.zcode-plugin/plugin.json:1`) | 0 | 0 | 0 | 0 | 0 |
| `packages/desktop/test/e2e` | `e2e-ext-entries` (`packages/desktop/test/e2e/fixtures/fs/plugins/plugin-extension-entries/e2e-ext-entries/.zcode-plugin/plugin.json:1`) | 0 | 0 | 0 | 0 | 0 |
| `packages/desktop/test/e2e` | `e2e-mcp-viewer` (`packages/desktop/test/e2e/fixtures/fs/plugins/plugin-extension-entries/e2e-mcp-viewer/.zcode-plugin/plugin.json:1`) | 0 | 0 | 0 | 0 | 0 |
| `packages/desktop/test/e2e` | `e2e-ext-hang` (`packages/desktop/test/e2e/fixtures/fs/plugins/plugin-extension-host-runtime/e2e-ext-hang/.zcode-plugin/plugin.json:1`) | 0 | 0 | 0 | 0 | 0 |
| `packages/desktop/test/e2e` | `e2e-ext-incompatible` (`packages/desktop/test/e2e/fixtures/fs/plugins/plugin-extension-host-runtime/e2e-ext-incompatible/.zcode-plugin/plugin.json:1`) | 0 | 0 | 0 | 0 | 0 |
| `packages/desktop/test/e2e` | `e2e-ext-invalid` (`packages/desktop/test/e2e/fixtures/fs/plugins/plugin-extension-host-runtime/e2e-ext-invalid/.zcode-plugin/plugin.json:1`) | 0 | 0 | 0 | 0 | 0 |
| `packages/desktop/test/e2e` | `e2e-ext-status` (`packages/desktop/test/e2e/fixtures/fs/plugins/plugin-extension-host-runtime/e2e-ext-status/.zcode-plugin/plugin.json:1`) | 0 | 0 | 0 | 0 | 0 |
| `packages/desktop/test/e2e` | `e2e-ext-jarvis-host` (`packages/desktop/test/e2e/fixtures/fs/plugins/plugin-extension-jarvis-host/e2e-ext-jarvis-host/.zcode-plugin/plugin.json:1`) | 0 | 0 | 0 | 0 | 0 |
| `packages/desktop/test/e2e` | `e2e-ext-logs-peer` (`packages/desktop/test/e2e/fixtures/fs/plugins/plugin-extension-logs/e2e-ext-logs-peer/.zcode-plugin/plugin.json:1`) | 0 | 0 | 0 | 0 | 0 |
| `packages/desktop/test/e2e` | `e2e-ext-logs` (`packages/desktop/test/e2e/fixtures/fs/plugins/plugin-extension-logs/e2e-ext-logs/.zcode-plugin/plugin.json:1`) | 0 | 0 | 0 | 0 | 0 |
| `packages/desktop/test/e2e` | `e2e-ext-mention` (`packages/desktop/test/e2e/fixtures/fs/plugins/plugin-extension-mention/e2e-ext-mention/.zcode-plugin/plugin.json:1`) | 0 | 0 | 0 | 0 | 0 |
| `packages/desktop/test/e2e` | `e2e-mcp-mention` (`packages/desktop/test/e2e/fixtures/fs/plugins/plugin-extension-mention/e2e-mcp-mention/.zcode-plugin/plugin.json:1`) | 0 | 0 | 0 | 0 | 0 |
| `packages/desktop/test/e2e` | `e2e-ext-network` (`packages/desktop/test/e2e/fixtures/fs/plugins/plugin-extension-network/e2e-ext-network/.zcode-plugin/plugin.json:1`) | 0 | 0 | 0 | 0 | 0 |
| `packages/desktop/test/e2e` | `e2e-ext-projects` (`packages/desktop/test/e2e/fixtures/fs/plugins/plugin-extension-projects/e2e-ext-projects/.zcode-plugin/plugin.json:1`) | 0 | 0 | 0 | 0 | 0 |
| `packages/desktop/test/e2e` | `e2e-ext-reads` (`packages/desktop/test/e2e/fixtures/fs/plugins/plugin-extension-reads/e2e-ext-reads/.zcode-plugin/plugin.json:1`) | 0 | 0 | 0 | 0 | 0 |
| `packages/desktop/test/e2e` | `e2e-ext-store-a` (`packages/desktop/test/e2e/fixtures/fs/plugins/plugin-extension-reads/store-market/plugins/e2e-ext-store-a/.zcode-plugin/plugin.json:1`) | 0 | 0 | 0 | 0 | 0 |
| `packages/desktop/test/e2e` | `e2e-ext-store-b` (`packages/desktop/test/e2e/fixtures/fs/plugins/plugin-extension-reads/store-market/plugins/e2e-ext-store-b/.zcode-plugin/plugin.json:1`) | 0 | 0 | 0 | 0 | 0 |
| `packages/desktop/test/e2e` | `e2e-ext-sessions-late` (`packages/desktop/test/e2e/fixtures/fs/plugins/plugin-extension-sessions/e2e-ext-sessions-late/.zcode-plugin/plugin.json:1`) | 0 | 0 | 0 | 0 | 0 |
| `packages/desktop/test/e2e` | `e2e-ext-sessions-nogrant` (`packages/desktop/test/e2e/fixtures/fs/plugins/plugin-extension-sessions/e2e-ext-sessions-nogrant/.zcode-plugin/plugin.json:1`) | 0 | 0 | 0 | 0 | 0 |
| `packages/desktop/test/e2e` | `e2e-ext-sessions` (`packages/desktop/test/e2e/fixtures/fs/plugins/plugin-extension-sessions/e2e-ext-sessions/.zcode-plugin/plugin.json:1`) | 0 | 0 | 0 | 0 | 0 |
| `packages/desktop/test/e2e` | `e2e-ext-settings-other` (`packages/desktop/test/e2e/fixtures/fs/plugins/plugin-extension-settings/e2e-ext-settings-other/.zcode-plugin/plugin.json:1`) | 0 | 0 | 0 | 0 | 0 |
| `packages/desktop/test/e2e` | `e2e-ext-settings` (`packages/desktop/test/e2e/fixtures/fs/plugins/plugin-extension-settings/e2e-ext-settings/.zcode-plugin/plugin.json:1`) | 0 | 0 | 0 | 0 | 0 |
| `packages/desktop/test/e2e` | `e2e-ext-draft` (`packages/desktop/test/e2e/fixtures/fs/plugins/plugin-extension-start-draft/e2e-ext-draft/.zcode-plugin/plugin.json:1`) | 0 | 0 | 0 | 0 | 0 |
| `packages/desktop/test/e2e` | `e2e-ext-factory` (`packages/desktop/test/e2e/fixtures/fs/plugins/plugin-extension-views/e2e-ext-factory/.zcode-plugin/plugin.json:1`) | 0 | 0 | 0 | 0 | 0 |
| `packages/desktop/test/e2e` | `e2e-ext-view` (`packages/desktop/test/e2e/fixtures/fs/plugins/plugin-extension-views/e2e-ext-view/.zcode-plugin/plugin.json:1`) | 0 | 0 | 0 | 0 | 0 |
| `packages/desktop/test/e2e` | `e2e-ext-writes` (`packages/desktop/test/e2e/fixtures/fs/plugins/plugin-extension-writes/e2e-ext-writes/.zcode-plugin/plugin.json:1`) | 0 | 0 | 0 | 0 | 0 |
| `packages/desktop/test/e2e` | `e2e-ext-compat-future` (`packages/desktop/test/e2e/fixtures/fs/plugins/plugin-store-extension-compat/store-market/plugins/e2e-ext-compat-future/.zcode-plugin/plugin.json:1`) | 0 | 0 | 0 | 0 | 0 |
| `packages/desktop/test/e2e` | `e2e-ext-compat-installed` (`packages/desktop/test/e2e/fixtures/fs/plugins/plugin-store-extension-compat/store-market/plugins/e2e-ext-compat-installed/.zcode-plugin/plugin.json:1`) | 0 | 0 | 0 | 0 | 0 |
| `packages/desktop/test/e2e` | `e2e-ext-compat-ok` (`packages/desktop/test/e2e/fixtures/fs/plugins/plugin-store-extension-compat/store-market/plugins/e2e-ext-compat-ok/.zcode-plugin/plugin.json:1`) | 0 | 0 | 0 | 0 | 0 |
| `packages/desktop/test/e2e` | `e2e-ext-compat-plain` (`packages/desktop/test/e2e/fixtures/fs/plugins/plugin-store-extension-compat/store-market/plugins/e2e-ext-compat-plain/.zcode-plugin/plugin.json:1`) | 0 | 0 | 0 | 0 | 0 |
| `packages/desktop/test/e2e` | `e2e-region-all-regions` (`packages/desktop/test/e2e/fixtures/fs/plugins/plugin-store-login-region/store-market/plugins/e2e-region-all-regions/.zcode-plugin/plugin.json:1`) | 0 | 0 | 0 | 0 | 0 |
| `packages/desktop/test/e2e` | `e2e-region-cn-only` (`packages/desktop/test/e2e/fixtures/fs/plugins/plugin-store-login-region/store-market/plugins/e2e-region-cn-only/.zcode-plugin/plugin.json:1`) | 0 | 0 | 0 | 0 | 0 |
| `packages/desktop/test/e2e` | `e2e-region-global-only` (`packages/desktop/test/e2e/fixtures/fs/plugins/plugin-store-login-region/store-market/plugins/e2e-region-global-only/.zcode-plugin/plugin.json:1`) | 0 | 0 | 0 | 0 | 0 |
| `packages/desktop/test/e2e` | `e2e-plugin-mcp-ping` (`packages/desktop/test/e2e/fixtures/plugin-mcp-skill/e2e-plugin-mcp-ping/.zcode-plugin/plugin.json:1`) | 0 | 0 | 0 | 0 | 0 |
| `packages/desktop/test/e2e` | `e2e-subagent-refresh` (`packages/desktop/test/e2e/fixtures/subagent-refresh-plugin/.zcode-plugin/plugin.json:1`) | 0 | 0 | 0 | 0 | 0 |

## Flags CLI (`arguments.ts` e `main.ts`)

| Flag | Primeira Referencia |
| :--- | :--- |
| `--disallowed` | `apps/zcode-cli/packages/cli/src/arguments.ts:137` |
| `--disallowed-tools` | `apps/zcode-cli/packages/cli/src/arguments.ts:137` |
| `--prepare-storage` | `apps/zcode-cli/packages/cli/src/main.ts:21` |

## Variaveis de Ambiente `ZCODE_*` (465 unicas, nomes somente)

| Variavel | Primeiras Referencias |
| :--- | :--- |
| `ZCODE_ACTIVE_STREAMING_TOOL_INPUT_EAGER_DELTA_COUNT` | `packages/shared/src/streaming-tool-input-preview.ts:16`, `packages/shared/src/streaming-tool-input-preview.ts:105` |
| `ZCODE_ACTIVE_STREAMING_TOOL_INPUT_PREVIEW_MIN_INTERVAL_MS` | `packages/shared/src/streaming-tool-input-preview.ts:17`, `packages/shared/src/streaming-tool-input-preview.ts:124` |
| `ZCODE_ACTIVE_STREAMING_TOOL_INPUT_PREVIEW_MIN_RAW_GROWTH` | `packages/shared/src/streaming-tool-input-preview.ts:18`, `packages/shared/src/streaming-tool-input-preview.ts:21`, `packages/shared/src/streaming-tool-input-preview.ts:119` |
| `ZCODE_ACTIVE_STREAMING_TOOL_INPUT_TIME_BUDGET_MAX_RAW_INPUT` | `packages/shared/src/streaming-tool-input-preview.ts:20`, `packages/shared/src/streaming-tool-input-preview.ts:130` |
| `ZCODE_AFFECTED_TEST_BASE` | `scripts/architecture/git-base.mjs:61`, `scripts/engineering-tests/scope.mjs:43` |
| `ZCODE_AGENT_CA_CERT` | `apps/zcode-cli/packages/debug/server/network-capture.ts:132`, `packages/desktop/wdio.conf.ts:2747`, `packages/services/src/runtime-tools/agentProxyEnv.ts:18` |
| `ZCODE_AGENT_CA_CERT_ENV_KEY` | `apps/zcode-cli/packages/adapters/src/network/http-config.ts:3`, `apps/zcode-cli/packages/adapters/src/network/http-config.ts:117`, `apps/zcode-cli/packages/adapters/src/network/subprocess-env.ts:2` |
| `ZCODE_AGENT_ENTRY` | `scripts/test-web-app-gateway-reset.mjs:80` |
| `ZCODE_AGENT_LIFECYCLE_LOG_MARKER` | `packages/desktop/src/main/appARMSBootstrap.ts:5`, `packages/desktop/src/main/appARMSBootstrap.ts:84`, `packages/services/src/zcode-agent/zcodeAgentProcessManager.ts:18` |
| `ZCODE_AGENT_MCP_STATUS_MODE_UNSUPPORTED` | `packages/services/src/zcode-agent/zcodeAgentErrors.ts:4` |
| `ZCODE_AGENT_MCP_STATUS_MODE_UNSUPPORTED_ERROR_CODE` | `packages/services/src/index.ts:159`, `packages/services/src/zcode-agent/zcodeAgentErrors.ts:3`, `packages/services/src/zcode-agent/zcodeAgentErrors.ts:7` |
| `ZCODE_AGENT_MODEL_SELECTION_BASIS_UNSUPPORTED` | `packages/services/src/zcode-agent/zcodeAgentErrors.ts:23` |
| `ZCODE_AGENT_MODEL_SELECTION_BASIS_UNSUPPORTED_ERROR_CODE` | `packages/services/src/zcode-agent/zcodeAgentErrors.ts:22`, `packages/services/src/zcode-agent/zcodeAgentErrors.ts:27`, `packages/services/src/zcode-agent/zcodeAgentErrors.ts:41` |
| `ZCODE_AGENT_MODE_ID_SET` | `packages/shared/src/zcode-agent-model-state.ts:42`, `packages/shared/src/zcode-agent-model-state.ts:50` |
| `ZCODE_AGENT_MODE_OPTIONS` | `packages/shared/src/zcode-agent-model-state.ts:6`, `packages/shared/src/zcode-agent-model-state.ts:19`, `packages/shared/src/zcode-agent-model-state.ts:43` |
| `ZCODE_AGENT_PROVIDER` | `packages/server/src/remote/zcodeAgentDeploy.ts:3`, `packages/server/src/remote/zcodeAgentDeploy.ts:129`, `packages/server/src/remote/zcodeAgentDeploy.ts:158` |
| `ZCODE_AGENT_PROVIDERS` | `packages/ui/src/lib/zcodeProviderPreference.ts:6`, `packages/ui/src/lib/zcodeProviderPreference.ts:28`, `packages/ui/src/lib/zcodeProviders.ts:7` |
| `ZCODE_AGENT_PROVIDER_LABEL` | `packages/shared/src/bots.ts:7`, `packages/shared/src/bots.ts:959`, `packages/shared/src/zcode-agent-policy.ts:6` |
| `ZCODE_AGENT_PROVIDER_LABELS` | `packages/ui/src/lib/zcodeProviders.ts:9` |
| `ZCODE_AGENT_PROVIDER_NOT_READY` | `packages/shared/src/model-selection-types.ts:1` |
| `ZCODE_AGENT_PROVIDER_NOT_READY_CODE` | `packages/desktop/src/host/rpcLogLevel.ts:1`, `packages/desktop/src/host/rpcLogLevel.ts:24`, `packages/services/src/zcode-agent/zcodeAgentService.ts:106` |
| `ZCODE_AGENT_PROVIDER_NOT_READY_REASON` | `packages/services/src/zcode-agent/zcodeAgentService.ts:107`, `packages/services/src/zcode-agent/zcodeAgentService.ts:3928`, `packages/services/src/zcode-agent/zcodeAgentService.ts:3939` |
| `ZCODE_AGENT_RUNTIME` | `packages/desktop/src/main/desktopRuntimeEnv.ts:11`, `packages/desktop/src/main/desktopRuntimeEnv.ts:364`, `packages/server/src/remote/zcodeAgentDeploy.ts:2` |
| `ZCODE_AGENT_RUNTIME_UNAVAILABLE` | `packages/services/src/zcode-agent/zcodeAgent.ts:248` |
| `ZCODE_AGENT_RUNTIME_UNAVAILABLE_CODE` | `packages/desktop/src/host/windowHostSessionsIndexObserver.ts:5`, `packages/desktop/src/host/windowHostSessionsIndexObserver.ts:41`, `packages/services/src/app-control/index.ts:23` |
| `ZCODE_AGENT_SERVER_ARGS_JSON` | `packages/desktop/wdio.conf.ts:1314`, `packages/desktop/wdio.conf.ts:5199`, `packages/services/src/zcode-agent/zcodeAgentProcessManager.ts:307` |
| `ZCODE_AGENT_SERVER_COMMAND` | `packages/desktop/wdio.conf.ts:1313`, `packages/desktop/wdio.conf.ts:5200`, `packages/services/src/zcode-agent/zcodeAgentProcessManager.ts:398` |
| `ZCODE_AGENT_SERVER_CWD` | `packages/desktop/wdio.conf.ts:1315`, `packages/services/src/zcode-agent/zcodeAgentProcessManager.ts:451` |
| `ZCODE_AGENT_UNSUPPORTED_LEGACY_TASK_METHOD` | `packages/services/src/zcode-agent/zcodeTaskServiceAdapter.ts:309` |
| `ZCODE_AGENT_WORKDIR` | `packages/services/src/runtime-tools/providerRuntimeResolver.ts:8`, `packages/services/src/runtime-tools/providerRuntimeResolver.ts:175`, `packages/services/src/runtime-tools/providerRuntimeResolver.ts:185` |
| `ZCODE_AGENT_WORKDIR_ENV` | `packages/services/src/runtime-tools/providerRuntimeResolver.ts:8`, `packages/services/src/runtime-tools/providerRuntimeResolver.ts:213` |
| `ZCODE_API_KEY` | `apps/zcode-cli/packages/adapters/test-model.mjs:5` |
| `ZCODE_API_KEY_NAME` | `packages/services/src/model-provider/accountProviderApiTypes.ts:38` |
| `ZCODE_APP_VERSION` | `apps/zcode-cli/packages/bootstrap/src/telemetry-bootstrap.ts:21`, `apps/zcode-cli/packages/bootstrap/src/zcode-protocol-entrypoint.ts:234`, `apps/zcode-cli/packages/bootstrap/src/zcode-protocol-entrypoint.ts:310` |
| `ZCODE_APP_VERSION_ENV` | `apps/zcode-cli/packages/bootstrap/src/model-config.ts:10`, `apps/zcode-cli/packages/bootstrap/src/model-config.ts:76`, `apps/zcode-cli/packages/bootstrap/src/provider-endpoint-routing-source-headers.ts:8` |
| `ZCODE_ARMS_RUM_ENDPOINT` | `packages/desktop/src/main/appARMSBootstrap.ts:7`, `packages/desktop/src/main/appARMSBootstrap.ts:35`, `packages/desktop/src/main/appARMSBootstrap.ts:241` |
| `ZCODE_ATTACHMENT_FAULT_CODES` | `apps/zcode-cli/packages/bootstrap/src/app/create-app.ts:58`, `apps/zcode-cli/packages/bootstrap/src/app/create-app.ts:1416`, `apps/zcode-cli/packages/bootstrap/src/app/create-app.ts:1439` |
| `ZCODE_AUTO_UPDATE` | `scripts/build-time-config.mjs:45` |
| `ZCODE_AUTO_UPDATE_DEV` | `packages/desktop/scripts/auto-update-source-security-smoke.mjs:46`, `packages/desktop/src/main/autoUpdater.ts:36` |
| `ZCODE_AUTO_UPDATE_DEV_VERSION` | `packages/desktop/scripts/auto-update-source-security-smoke.mjs:47`, `packages/desktop/src/main/autoUpdater.ts:38` |
| `ZCODE_AUTO_UPDATE_ENABLED` | `packages/desktop/src/main/index.ts:94`, `packages/desktop/src/main/index.ts:2510`, `packages/shared/src/env.ts:67` |
| `ZCODE_BACKEND_PORT` | `scripts/test-web-app-gateway-reset.mjs:77` |
| `ZCODE_BASE_URL` | `packages/desktop/scripts/ensure-e2e-desktop-build.mjs:91`, `packages/desktop/scripts/ensure-e2e-desktop-build.mjs:116`, `packages/desktop/scripts/ensure-e2e-desktop-build.mjs:119` |
| `ZCODE_BETA` | `apps/zcode-cli/packages/cli/src/env.ts:149` |
| `ZCODE_BFS_BINARY` | `apps/zcode-cli/packages/cli/scripts/build-sea.mjs:248`, `packages/shared/src/runtime-tool-runtime.ts:25`, `scripts/test-native-search-tools-e2e.mjs:67` |
| `ZCODE_BIGMODEL_TEAM_PLAN_MEMBER_REQUIRED` | `packages/ui/src/ChatErrorBanner.tsx:60`, `packages/ui/src/i18n/locales/en-US.ts:8087`, `packages/ui/src/i18n/locales/ja-JP.ts:7753` |
| `ZCODE_BIGMODEL_USAGE_API_KEY` | `packages/services/src/usage-stats/providers/bigmodelUsageQuotaProvider.ts:861` |
| `ZCODE_BIGMODEL_USAGE_QUOTA_URL` | `packages/services/src/usage-stats/providers/bigmodelUsageQuotaProvider.ts:1679` |
| `ZCODE_BOOTSTRAP_WITH_REMOTE` | `packages/desktop/scripts/prepare-agent-node-bundle.mjs:364`, `scripts/bootstrap.mjs:88`, `scripts/build-desktop-agent-cli.mjs:14` |
| `ZCODE_BROWSER_IMPORT_HELPER` | `packages/desktop/src/main/windowsChromeAppBoundKey.ts:15` |
| `ZCODE_BROWSER_IMPORT_V1` | `packages/desktop/src/main/windowsChromeAppBoundKey.ts:14` |
| `ZCODE_BUILD_COMMIT_ID` | `apps/zcode-cli/packages/telemetry/src/bootstrap.ts:159`, `packages/desktop/scripts/ensure-e2e-desktop-build.mjs:125`, `packages/shared/src/env.ts:44` |
| `ZCODE_BUILD_COMMIT_ID_ENV` | `packages/desktop/src/main/desktopRuntimeEnv.ts:10`, `packages/desktop/src/main/desktopRuntimeEnv.ts:621`, `packages/shared/src/env.ts:44` |
| `ZCODE_BUILD_TIME` | `packages/desktop/src/main/about.ts:9`, `packages/desktop/src/main/about.ts:157`, `packages/services/src/feedback/feedbackService.ts:12` |
| `ZCODE_BUILTIN_PROVIDER_BUNDLED_CONFIG_FILE` | `packages/provider-node/src/runtime-paths.ts:3` |
| `ZCODE_BUILTIN_PROVIDER_BUNDLED_CONFIG_FILE_ENV` | `apps/zcode-cli/packages/bootstrap/src/app/process-provider-registry-runtime.ts:20`, `apps/zcode-cli/packages/bootstrap/src/app/process-provider-registry-runtime.ts:60`, `apps/zcode-cli/packages/cli/src/provider-runtime-env.ts:10` |
| `ZCODE_BUILTIN_PROVIDER_CONFIG_FILE` | `packages/desktop/scripts/mcp-apps-host-fixture/model.ts:165`, `packages/desktop/src/main/desktopProviderConfig.ts:11`, `packages/desktop/wdio.conf.ts:305` |
| `ZCODE_BUILTIN_PROVIDER_CONFIG_FILE_ENV` | `apps/zcode-cli/packages/bootstrap/src/app/standalone-account-provider-runtime.ts:20`, `apps/zcode-cli/packages/bootstrap/src/app/standalone-account-provider-runtime.ts:57`, `apps/zcode-cli/packages/bootstrap/src/app/standalone-account-provider-runtime.ts:59` |
| `ZCODE_BUILTIN_RELEASE_SCHEMA_VERSION` | `packages/provider-node/src/zcode-builtin-release.ts:10`, `packages/provider-node/src/zcode-builtin-release.ts:20`, `packages/provider-node/src/zcode-builtin-release.ts:27` |
| `ZCODE_CI_TMPDIR` | `scripts/ensure-native-search-deps.mjs:104` |
| `ZCODE_CLIENT_CONFIG_API_PATH` | `packages/desktop/src/main/forceUpdateGuard.ts:15`, `packages/desktop/src/main/forceUpdateGuard.ts:54` |
| `ZCODE_CLIENT_CONFIG_API_PREFIX` | `packages/services/src/coding-plan-subscription/bigmodelCodingPlanSubscriptionProvider.ts:100`, `packages/services/src/coding-plan-subscription/bigmodelCodingPlanSubscriptionProvider.ts:1067` |
| `ZCODE_CLIENT_LANGUAGE` | `apps/zcode-cli/packages/bootstrap/src/model-config.ts:80`, `packages/shared/src/env.ts:50` |
| `ZCODE_CLIENT_LANGUAGE_ENV` | `apps/zcode-cli/packages/bootstrap/src/model-config.ts:11`, `apps/zcode-cli/packages/bootstrap/src/model-config.ts:86`, `packages/services/src/node.ts:84` |
| `ZCODE_CLIENT_SCENES_URL` | `packages/services/src/client-scenes/clientScenesService.ts:3`, `packages/services/src/client-scenes/clientScenesService.ts:11`, `packages/services/src/providers/api/apiEndpoints.ts:3` |
| `ZCODE_CLI_ENTRYPOINT` | `packages/desktop/wdio.conf.ts:280`, `packages/desktop/wdio.conf.ts:662`, `packages/desktop/wdio.conf.ts:1285` |
| `ZCODE_CLI_RESOURCE_SAMPLE_INTERVAL_MS` | `apps/zcode-cli/packages/bootstrap/src/process-resource-sampler.ts:4`, `apps/zcode-cli/packages/bootstrap/src/process-resource-sampler.ts:9`, `packages/desktop/src/main/processResourceCliSource.ts:25` |
| `ZCODE_COMMAND_AGENT_SOURCE` | `packages/services/src/commands/commandsService.ts:7`, `packages/services/src/commands/commandsService.ts:44`, `packages/services/src/commands/commandsService.ts:550` |
| `ZCODE_COMMAND_AGENT_SOURCES` | `packages/services/src/commands/commandsService.ts:8`, `packages/services/src/commands/commandsService.ts:45`, `packages/shared/src/zcode-agent-policy.ts:22` |
| `ZCODE_COMMAND_DESCRIPTOR` | `packages/services/src/commands/commandsService.ts:53`, `packages/services/src/commands/commandsService.ts:65`, `packages/services/src/commands/commandsService.ts:69` |
| `ZCODE_COMMIT` | `apps/zcode-cli/packages/adapters/src/memory-diagnostics/index.ts:9`, `apps/zcode-cli/packages/adapters/src/memory-diagnostics/index.ts:89`, `packages/desktop/scripts/build-metadata.mjs:78` |
| `ZCODE_COMPATIBILITY_MANIFEST` | `packages/desktop/src/host/sourceServerConnectionManager.ts:23`, `packages/desktop/src/host/sourceServerConnectionManager.ts:436`, `packages/server/src/http.ts:36` |
| `ZCODE_CONFIG_FILE` | `packages/services/src/hooks/hooksService.ts:51`, `packages/services/src/hooks/hooksService.ts:83` |
| `ZCODE_CONVERSATION_SESSION_FORMAL_ADMISSION_ROOT` | `scripts/audit-conversation-session-case-coverage.mjs:19`, `scripts/audit-conversation-session-case-coverage.mjs:27` |
| `ZCODE_CONVERSATION_SHARE_WEB_URL` | `packages/services/src/conversation-share/conversationShareService.ts:1048`, `packages/services/src/conversation-share/conversationShareService.ts:1051` |
| `ZCODE_CREDENTIALS_FILE` | `apps/zcode-cli/packages/adapters/src/auth/shared-credentials.ts:411`, `packages/desktop/src/main/desktopDataBaseDirBootstrap.ts:41`, `packages/services/src/paths.ts:63` |
| `ZCODE_CREDENTIALS_FILE_ENV` | `packages/desktop/src/main/desktopDataBaseDirBootstrap.ts:5`, `packages/desktop/src/main/desktopDataBaseDirBootstrap.ts:45`, `packages/shared/src/credential-security/credentialFile.ts:14` |
| `ZCODE_CREDENTIAL_DECRYPT_FAILED` | `packages/shared/src/credential-security/bridge.ts:112`, `packages/shared/src/oauth.ts:39` |
| `ZCODE_CREDENTIAL_SECRET` | `packages/desktop/wdio.conf.ts:5193`, `packages/desktop/wdio.conf.ts:5194`, `packages/desktop/wdio.conf.ts:5589` |
| `ZCODE_CREDENTIAL_SECRET_FILE` | `packages/shared/src/credential-security/credentialFile.ts:118`, `packages/shared/src/credential-security/systemCredentialCipher.ts:109`, `packages/shared/src/credential-security/systemCredentialCipher.ts:225` |
| `ZCODE_CREDENTIAL_STORE_CHANGED` | `packages/shared/src/node/privateFilePersistence.ts:44` |
| `ZCODE_CSC_PATH` | `packages/desktop/scripts/build-windows-browser-import-helper.mjs:28`, `packages/desktop/scripts/build-windows-browser-import-helper.mjs:41`, `packages/desktop/scripts/build-windows-browser-import-helper.mjs:43` |
| `ZCODE_CUA_BROKER_SOCKET_ENV` | `apps/zcode-cli/packages/bootstrap/src/mcp-config.ts:19` |
| `ZCODE_CUA_BROKER_SOCKET_ENV_KEY` | `apps/zcode-cli/packages/bootstrap/src/mcp-config.ts:12`, `apps/zcode-cli/packages/bootstrap/src/mcp-config.ts:19`, `apps/zcode-cli/packages/bootstrap/src/mcp-config.ts:27` |
| `ZCODE_CUA_BROKER_UNAVAILABLE_ENV` | `apps/zcode-cli/packages/bootstrap/src/mcp-config.ts:21` |
| `ZCODE_CUA_BUNDLED_HELPER_APP_PATH` | `packages/desktop/scripts/ensure-e2e-desktop-build.mjs:128`, `packages/desktop/src/main/desktopRuntimeEnv.ts:559`, `packages/services/src/node.ts:1196` |
| `ZCODE_CUA_BUNDLED_HELPER_APP_PATH_ENV` | `packages/desktop/src/main/desktopRuntimeEnv.ts:33`, `packages/desktop/src/main/desktopRuntimeEnv.ts:625`, `packages/services/src/node.ts:1196` |
| `ZCODE_CUA_CANONICAL_MODEL_PREFIX` | `apps/zcode-cli/packages/core/src/mcp/index.ts:58`, `apps/zcode-cli/packages/core/src/mcp/index.ts:162`, `apps/zcode-cli/packages/core/src/mcp/index.ts:457` |
| `ZCODE_CUA_DEV_MODE` | `packages/services/src/node.ts:1882`, `packages/shared/src/runtimeEnv.ts:23`, `packages/shared/src/runtimeEnv.ts:29` |
| `ZCODE_CUA_DEV_MODE_ENV_KEY` | `packages/shared/src/runtimeEnv.ts:29`, `packages/shared/src/runtimeEnv.ts:36` |
| `ZCODE_CUA_DEV_ROOT` | `packages/desktop/scripts/prepare-windows-cua-helper.mjs:28`, `packages/desktop/scripts/windows-cua-helper-assets.mjs:731`, `packages/services/src/cua-permission-broker/windowsCuaDevRuntime.ts:7` |
| `ZCODE_CUA_HELPER_ADDON` | `apps/zcode-cli/packages/node-repl-host/src/server.ts:517`, `packages/zcode-cua/broker-server.js:4` |
| `ZCODE_CUA_HELPER_ALLOW_UNSIGNED_LOCAL` | `packages/desktop/src/main/cuaAccessibilitySettings.ts:527`, `packages/desktop/src/main/desktopCuaHelperInstaller.ts:48`, `packages/desktop/src/main/desktopRuntimeEnv.ts:557` |
| `ZCODE_CUA_HELPER_BUILD_ID` | `apps/zcode-cli/packages/node-repl-host/scripts/build.mjs:23`, `apps/zcode-cli/packages/node-repl-host/scripts/build.mjs:36`, `apps/zcode-cli/packages/node-repl-host/scripts/build.mjs:39` |
| `ZCODE_CUA_HELPER_INSTALL_VARIANT` | `packages/desktop/src/main/desktopRuntimeEnv.ts:613`, `scripts/dev-desktop-env.mjs:48` |
| `ZCODE_CUA_HELPER_RUNTIME_PACKAGE_DIR` | `packages/desktop/scripts/prepare-windows-cua-helper.mjs:27`, `packages/desktop/scripts/windows-cua-helper-assets.mjs:730` |
| `ZCODE_CUA_HELPER_VERSION` | `scripts/dev-desktop-env.mjs:46` |
| `ZCODE_CUA_IN_PROCESS_BROKER_SOCKET` | `packages/shared/src/runtimeEnv.ts:16`, `packages/shared/src/runtimeEnv.ts:206` |
| `ZCODE_CUA_LAUNCHER_PID` | `packages/desktop/scripts/ensure-e2e-desktop-build.mjs:129`, `packages/desktop/src/main/desktopHostProcess.ts:292` |
| `ZCODE_CUA_NODE_REPL_HOST` | `packages/shared/src/runtimeEnv.ts:22` |
| `ZCODE_CUA_NODE_REPL_HOST_ENV_KEY` | `apps/zcode-cli/packages/bootstrap/src/mcp-config.ts:13`, `apps/zcode-cli/packages/bootstrap/src/mcp-config.ts:163`, `apps/zcode-cli/packages/cli/src/plugin-host-command.ts:8` |
| `ZCODE_CUA_OFFICIAL_MCP_NAMESPACE_NAME` | `apps/zcode-cli/packages/core/src/mcp/index.ts:22`, `apps/zcode-cli/packages/core/src/runtime/methods/mcp.ts:3`, `apps/zcode-cli/packages/core/src/runtime/methods/mcp.ts:277` |
| `ZCODE_CUA_OFFICIAL_MCP_SERVER_NAME` | `apps/zcode-cli/packages/core/src/mcp/index.ts:22`, `apps/zcode-cli/packages/core/src/mcp/index.ts:157`, `apps/zcode-cli/packages/core/src/mcp/index.ts:456` |
| `ZCODE_CUA_OFFICIAL_PLUGIN_ID` | `apps/zcode-cli/packages/bootstrap/src/app/bundled-plugins.ts:12`, `apps/zcode-cli/packages/bootstrap/src/app/bundled-plugins.ts:470`, `apps/zcode-cli/packages/bootstrap/src/mcp-config.ts:14` |
| `ZCODE_CUA_PERMISSION_BROKER_REFRESH_MARKER` | `apps/zcode-cli/packages/bootstrap/src/mcp-config.ts:36`, `apps/zcode-cli/packages/node-repl-host/src/server.ts:460`, `packages/shared/src/runtimeEnv.ts:77` |
| `ZCODE_CUA_PERMISSION_BROKER_SOCKET` | `packages/shared/src/runtimeEnv.ts:14`, `packages/zcode-cua/broker.js:8` |
| `ZCODE_CUA_PERMISSION_BROKER_TOKEN` | `packages/shared/src/runtimeEnv.ts:76` |
| `ZCODE_CUA_PERMISSION_BROKER_UNAVAILABLE` | `apps/zcode-cli/packages/bootstrap/src/mcp-config.ts:21`, `packages/zcode-cua/broker.js:9` |
| `ZCODE_CUA_PLUGIN_AUTHORITY` | `packages/shared/src/runtimeEnv.ts:78`, `packages/shared/src/runtimeEnv.ts:113`, `packages/shared/src/runtimeEnv.ts:141` |
| `ZCODE_CUA_PLUGIN_AUTHORITY_ENV_KEY` | `apps/zcode-cli/packages/bootstrap/src/mcp-config.ts:15`, `apps/zcode-cli/packages/bootstrap/src/mcp-config.ts:162`, `apps/zcode-cli/packages/core/src/runtime/methods/mcp.ts:5` |
| `ZCODE_CUA_PLUGIN_ROOT` | `apps/zcode-cli/packages/bootstrap/src/app/built-in-node-repl.ts:39`, `apps/zcode-cli/packages/node-repl-host/src/server.ts:72`, `apps/zcode-cli/packages/node-repl-host/src/server.ts:478` |
| `ZCODE_CUA_PRODUCT_HELPER` | `apps/zcode-cli/packages/bootstrap/src/plugins.ts:1044`, `packages/services/src/node.ts:1883`, `packages/shared/src/runtimeEnv.ts:13` |
| `ZCODE_CUA_PRODUCT_HELPER_ENV_KEY` | `packages/shared/src/runtimeEnv.ts:13`, `packages/shared/src/runtimeEnv.ts:44` |
| `ZCODE_CUA_PROVIDER_SPELLING_ALIAS_PREFIX` | `apps/zcode-cli/packages/core/src/mcp/index.ts:59`, `apps/zcode-cli/packages/core/src/mcp/index.ts:463` |
| `ZCODE_CUA_WIN_HELPER_RECIPE` | `packages/services/src/node.ts:2584` |
| `ZCODE_DATA_BASE_DIR` | `apps/zcode-cli/packages/adapters/src/auth/shared-credentials.ts:23`, `apps/zcode-cli/packages/adapters/src/config/config-factory.ts:603`, `apps/zcode-cli/packages/adapters/src/config/config-factory.ts:605` |
| `ZCODE_DATA_BASE_DIR_ENV_KEY` | `apps/zcode-cli/packages/adapters/src/auth/shared-credentials.ts:23`, `apps/zcode-cli/packages/adapters/src/auth/shared-credentials.ts:416`, `apps/zcode-cli/packages/adapters/src/config/config-factory.ts:603` |
| `ZCODE_DATA_DIR_NAME` | `packages/services/src/storage/adapters/rootsResolver.ts:9`, `packages/services/src/storage/adapters/rootsResolver.ts:19`, `packages/services/src/storage/adapters/rootsResolver.ts:24` |
| `ZCODE_DATA_SIZE_ABORTED_RETRY_MS` | `packages/desktop/src/main/desktopZCodeDataSizeTelemetry.ts:23`, `packages/desktop/src/main/desktopZCodeDataSizeTelemetry.ts:41` |
| `ZCODE_DATA_SIZE_ACTIVITY_POLL_MS` | `packages/desktop/src/main/desktopZCodeDataSizeTelemetry.ts:25`, `packages/desktop/src/main/desktopZCodeDataSizeTelemetry.ts:42` |
| `ZCODE_DATA_SIZE_DAILY_INTERVAL_MS` | `packages/desktop/src/main/desktopZCodeDataSizeTelemetry.ts:16`, `packages/desktop/src/main/desktopZCodeDataSizeTelemetry.ts:43`, `packages/desktop/src/main/desktopZCodeDataSizeTelemetry.ts:133` |
| `ZCODE_DATA_SIZE_DAILY_JITTER_MAX_MS` | `packages/desktop/src/main/desktopZCodeDataSizeTelemetry.ts:22`, `packages/desktop/src/main/desktopZCodeDataSizeTelemetry.ts:44` |
| `ZCODE_DATA_SIZE_FAILURE_RETRY_MS` | `packages/desktop/src/main/desktopZCodeDataSizeTelemetry.ts:24`, `packages/desktop/src/main/desktopZCodeDataSizeTelemetry.ts:45` |
| `ZCODE_DATA_SIZE_IDLE_POLL_MS` | `packages/desktop/src/main/desktopZCodeDataSizeTelemetry.ts:17`, `packages/desktop/src/main/desktopZCodeDataSizeTelemetry.ts:46` |
| `ZCODE_DATA_SIZE_IDLE_WAIT_FALLBACK_MS` | `packages/desktop/src/main/desktopZCodeDataSizeTelemetry.ts:18`, `packages/desktop/src/main/desktopZCodeDataSizeTelemetry.ts:47` |
| `ZCODE_DATA_SIZE_MINIMUM_IDLE_SECONDS` | `packages/desktop/src/main/desktopZCodeDataSizeTelemetry.ts:19`, `packages/desktop/src/main/desktopZCodeDataSizeTelemetry.ts:48` |
| `ZCODE_DATA_SIZE_SCAN_MAX_DURATION_MS` | `packages/desktop/src/main/desktopZCodeDataSizeTelemetry.ts:14`, `packages/desktop/src/main/desktopZCodeDataSizeTelemetry.ts:425` |
| `ZCODE_DATA_SIZE_SCAN_MAX_FILES` | `packages/desktop/src/main/desktopZCodeDataSizeTelemetry.ts:15`, `packages/desktop/src/main/desktopZCodeDataSizeTelemetry.ts:426` |
| `ZCODE_DATA_SIZE_STARTUP_JITTER_MAX_MS` | `packages/desktop/src/main/desktopZCodeDataSizeTelemetry.ts:21`, `packages/desktop/src/main/desktopZCodeDataSizeTelemetry.ts:49` |
| `ZCODE_DATA_SIZE_STARTUP_MIN_DELAY_MS` | `packages/desktop/src/main/desktopZCodeDataSizeTelemetry.ts:20`, `packages/desktop/src/main/desktopZCodeDataSizeTelemetry.ts:50` |
| `ZCODE_DEBUG` | `packages/shared/src/env.ts:53`, `packages/shared/src/env.ts:55` |
| `ZCODE_DEBUG_NETWORK_CAPTURE` | `apps/zcode-cli/packages/debug/server/network-capture.ts:309` |
| `ZCODE_DEBUG_NETWORK_CA_DIR` | `apps/zcode-cli/packages/debug/server/network-capture.ts:313` |
| `ZCODE_DEBUG_NETWORK_HOST` | `apps/zcode-cli/packages/debug/server/network-capture.ts:311` |
| `ZCODE_DEBUG_NETWORK_MAX_ENTRIES` | `apps/zcode-cli/packages/debug/server/network-capture.ts:314` |
| `ZCODE_DEBUG_NETWORK_PORT` | `apps/zcode-cli/packages/debug/server/network-capture.ts:312` |
| `ZCODE_DEPS_BASE_URL` | `packages/shared/src/intranetDefaults.ts:4`, `packages/shared/src/intranetDefaults.ts:33`, `packages/shared/src/intranetDefaults.ts:41` |
| `ZCODE_DESKTOP_AGENT_BUILD_MODE` | `packages/desktop/scripts/run-windows-e2e-shards.mjs:172`, `packages/desktop/scripts/run-windows-e2e-shards.mjs:172`, `packages/desktop/wdio.conf.ts:1270` |
| `ZCODE_DESKTOP_AGENT_BYTECODE` | `packages/services/src/zcode-agent/zcodeAgentProcessManager.ts:363`, `scripts/dev-desktop-env.mjs:73` |
| `ZCODE_DESKTOP_APPLICATION_NAME` | `packages/desktop/scripts/auto-update-ca-constraints-smoke.mjs:355`, `packages/desktop/src/main/desktopRuntimeEnv.ts:66`, `packages/desktop/wdio.conf.ts:701` |
| `ZCODE_DESKTOP_CONTEXT_PROMPT_ENABLED` | `packages/desktop/scripts/ensure-e2e-desktop-build.mjs:127`, `packages/shared/src/runtimeEnv.ts:12` |
| `ZCODE_DESKTOP_CONTEXT_PROMPT_ENABLED_ENV` | `packages/desktop/src/main/desktopContextPromptRollout.ts:7`, `packages/desktop/src/main/desktopContextPromptRollout.ts:15`, `packages/desktop/src/main/desktopHostProcess.ts:34` |
| `ZCODE_DESKTOP_DIST_DIR` | `packages/desktop/electron-builder.config.js:88`, `packages/desktop/scripts/bundle.mjs:45` |
| `ZCODE_DESKTOP_HOME_DIR` | `packages/desktop/scripts/auto-update-ca-constraints-smoke.mjs:352`, `packages/desktop/src/main/desktopApplicationLocaleBootstrap.ts:8`, `packages/desktop/src/main/desktopApplicationLocaleBootstrap.ts:13` |
| `ZCODE_DESKTOP_SESSION_DATA_DIR` | `packages/desktop/scripts/auto-update-ca-constraints-smoke.mjs:354`, `packages/desktop/src/main/desktopRuntimeEnv.ts:81` |
| `ZCODE_DESKTOP_USER_DATA_DIR` | `packages/desktop/scripts/auto-update-ca-constraints-smoke.mjs:353`, `packages/desktop/src/main/desktopRuntimeEnv.ts:76` |
| `ZCODE_DESKTOP_USE_ELECTRON_DEFAULT_USER_DATA` | `packages/desktop/src/main/desktopRuntimeEnv.ts:73`, `packages/desktop/wdio.conf.ts:703`, `packages/desktop/wdio.conf.ts:5206` |
| `ZCODE_DEV_REMOTE_ASSET_USE_CDN` | `packages/desktop/src/main/desktopRuntimeEnv.ts:253`, `scripts/dev-desktop-remote-prod.mjs:43` |
| `ZCODE_DIR` | `apps/zcode-cli/packages/adapters/src/commands/roots.ts:10`, `apps/zcode-cli/packages/adapters/src/commands/roots.ts:115`, `apps/zcode-cli/packages/adapters/src/skills/catalog.ts:43` |
| `ZCODE_DISABLE_FIXED_REMOTE_DEBUGGING_PORT` | `packages/desktop/src/main/index.ts:357`, `packages/desktop/wdio.conf.ts:715`, `packages/desktop/wdio.conf.ts:5207` |
| `ZCODE_DIST_BASE_URL` | `scripts/build-zcode.mjs:17`, `scripts/build-zcode.mjs:236`, `scripts/zcode-distribution/installer.mjs:7` |
| `ZCODE_DIST_BIN_DIR` | `scripts/zcode-distribution/installer.mjs:9` |
| `ZCODE_DIST_HOME` | `scripts/zcode-distribution/installer.mjs:8` |
| `ZCODE_DOWNLOAD_URL` | `packages/web/src/share/ConversationShareLandingPage.tsx:102`, `packages/web/src/share/ConversationShareLandingPage.tsx:628`, `packages/web/src/share/ConversationShareLandingPage.tsx:779` |
| `ZCODE_DWF_CHILD_COMMAND` | `apps/zcode-cli/packages/bootstrap/src/app/dynamic-workflow-run-launch.ts:16`, `apps/zcode-cli/packages/bootstrap/src/app/dynamic-workflow-run-launch.ts:447`, `apps/zcode-cli/packages/cli/src/dwf-child-command.ts:21` |
| `ZCODE_DYNAMIC_WORKFLOW_MODE` | `packages/desktop/wdio.conf.ts:5585`, `packages/services/src/coding-plan-subscription/bigmodelCodingPlanSubscriptionProvider.ts:436`, `packages/shared/src/dynamic-workflow-feature.ts:20` |
| `ZCODE_DYNAMIC_WORKFLOW_MODE_ENV` | `packages/desktop/src/main/desktopRuntimeEnv.ts:13`, `packages/desktop/src/main/desktopRuntimeEnv.ts:521`, `packages/desktop/src/main/desktopRuntimeEnv.ts:524` |
| `ZCODE_E2E_ARTIFACT_DIR` | `packages/desktop/scripts/lib/telemetry-field-contract.mjs:226`, `packages/desktop/scripts/run-e2e-session-lifecycle-stress.mjs:70`, `packages/desktop/scripts/run-windows-e2e-shards.mjs:199` |
| `ZCODE_E2E_ASK_USER_QUESTION_CLOCK_SCALE` | `packages/shared/src/app-runtime-preferences.ts:12` |
| `ZCODE_E2E_CERT_CACHE_DIR` | `packages/desktop/wdio.conf.ts:322` |
| `ZCODE_E2E_CODING_PLAN_MOCK_URL` | `packages/desktop/wdio.conf.ts:1417`, `packages/desktop/wdio.conf.ts:2508` |
| `ZCODE_E2E_CONTAINER` | `packages/desktop/scripts/mcp-apps-host-options.mjs:53`, `packages/desktop/wdio.conf.ts:620` |
| `ZCODE_E2E_CORRUPT_OAUTH_TOKEN_PROVIDER` | `packages/desktop/wdio.conf.ts:4020` |
| `ZCODE_E2E_COVERAGE` | `apps/zcode-cli/packages/cli/scripts/build.mjs:131`, `apps/zcode-cli/packages/cli/src/protocol-lifecycle.ts:37`, `apps/zcode-cli/packages/cli/src/shutdown.ts:78` |
| `ZCODE_E2E_CREDENTIAL_OWNER_LOG` | `packages/desktop/wdio.conf.ts:5556` |
| `ZCODE_E2E_DEFER_APP_DATA_CLEANUP` | `packages/desktop/wdio.conf.ts:5210` |
| `ZCODE_E2E_ELECTRON_APP_QUIT_TIMEOUT_MS` | `packages/desktop/wdio.conf.ts:543` |
| `ZCODE_E2E_ELECTRON_FORCE_KILL_GRACE_MS` | `packages/desktop/wdio.conf.ts:545` |
| `ZCODE_E2E_ELECTRON_INSTALL_TIMEOUT_MS` | `packages/desktop/wdio.conf.ts:355` |
| `ZCODE_E2E_EXCLUDE_SPEC` | `packages/desktop/wdio.conf.ts:838` |
| `ZCODE_E2E_FAILURE_ARTIFACT_COLLECTION_TIMEOUT_MS` | `packages/desktop/wdio.conf.ts:553` |
| `ZCODE_E2E_FORCE_DESKTOP_BUILD` | `packages/desktop/scripts/ensure-e2e-desktop-build.mjs:286` |
| `ZCODE_E2E_FS_FAULTS` | `apps/zcode-cli/packages/adapters/src/storage/fs-fault-injection.ts:1`, `packages/services/src/fs/fsFaultInjection.ts:1` |
| `ZCODE_E2E_FS_FAULTS_ALLOW` | `apps/zcode-cli/packages/adapters/src/storage/fs-fault-injection.ts:2`, `packages/services/src/fs/fsFaultInjection.ts:2` |
| `ZCODE_E2E_FS_FAULTS_ALLOW_ENV` | `apps/zcode-cli/packages/adapters/src/storage/fs-fault-injection.ts:2`, `apps/zcode-cli/packages/adapters/src/storage/fs-fault-injection.ts:207`, `packages/services/src/fs/fsFaultInjection.ts:2` |
| `ZCODE_E2E_FS_FAULTS_ENV` | `apps/zcode-cli/packages/adapters/src/storage/fs-fault-injection.ts:1`, `apps/zcode-cli/packages/adapters/src/storage/fs-fault-injection.ts:118`, `apps/zcode-cli/packages/adapters/src/storage/fs-fault-injection.ts:124` |
| `ZCODE_E2E_HOME_DIR` | `packages/desktop/scripts/run-e2e-session-lifecycle-stress.mjs:71`, `packages/desktop/scripts/run-windows-e2e-shards.mjs:201`, `packages/desktop/scripts/run-windows-e2e-shards.mjs:272` |
| `ZCODE_E2E_KEEP_BUILD_CACHE` | `packages/desktop/scripts/ensure-e2e-desktop-build.mjs:97`, `packages/desktop/scripts/run-production-build.mjs:31`, `packages/desktop/scripts/run-production-build.mjs:32` |
| `ZCODE_E2E_KEEP_HOME_ON_FAIL` | `packages/desktop/wdio.conf.ts:3564`, `packages/desktop/wdio.conf.ts:5968`, `packages/desktop/wdio.conf.ts:5971` |
| `ZCODE_E2E_MANUAL_REVIEW` | `packages/desktop/scripts/run-all-e2e-coverage.mjs:58`, `packages/desktop/scripts/run-windows-e2e-shards.mjs:56`, `packages/desktop/wdio.conf.ts:605` |
| `ZCODE_E2E_MANUAL_REVIEW_HOLD_MS` | `packages/desktop/wdio.conf.ts:609` |
| `ZCODE_E2E_MOBILE_BROWSER_EXECUTABLE` | `packages/desktop/wdio.conf.ts:718`, `packages/desktop/wdio.conf.ts:721` |
| `ZCODE_E2E_MOCHA_GREP` | `packages/desktop/wdio.conf.ts:5328`, `packages/desktop/wdio.conf.ts:5329` |
| `ZCODE_E2E_NETWORK_CAPTURE_DIR` | `packages/desktop/scripts/run-windows-e2e-shards.mjs:275`, `packages/desktop/scripts/run-windows-e2e-shards.mjs:278`, `packages/desktop/wdio.conf.ts:316` |
| `ZCODE_E2E_PACKAGED_APP_PATH` | `packages/desktop/wdio.conf.ts:287`, `packages/desktop/wdio.conf.ts:288` |
| `ZCODE_E2E_PLUGIN_MCP_SKILL_STATE` | `packages/desktop/wdio.conf.ts:4078`, `packages/desktop/wdio.conf.ts:4106` |
| `ZCODE_E2E_PLUGIN_SANDBOX_MAX_ENTRIES` | `packages/desktop/src/main/index.ts:2344`, `packages/desktop/src/main/index.ts:2345`, `packages/desktop/src/main/index.ts:2346` |
| `ZCODE_E2E_PREINSTALLED_TOOLS_CATALOG` | `packages/desktop/src/preinstalled-tools/catalog.ts:34`, `packages/desktop/src/preinstalled-tools/catalog.ts:35`, `packages/desktop/wdio.conf.ts:5615` |
| `ZCODE_E2E_PREINSTALLED_TOOLS_EXIT_BEFORE_INIT` | `packages/desktop/src/preinstalled-tools/process.ts:22`, `packages/desktop/wdio.conf.ts:5617`, `packages/desktop/wdio.conf.ts:5620` |
| `ZCODE_E2E_PREINSTALL_ARTIFACTS` | `packages/desktop/wdio.conf.ts:5648` |
| `ZCODE_E2E_PREINSTALL_FIXTURE_URL` | `packages/desktop/wdio.conf.ts:5675`, `packages/desktop/wdio.conf.ts:5831` |
| `ZCODE_E2E_PREINSTALL_UPGRADE_ARTIFACT` | `packages/desktop/wdio.conf.ts:5649` |
| `ZCODE_E2E_PYTHON_ARTIFACT` | `packages/desktop/wdio.conf.ts:5639`, `packages/desktop/wdio.conf.ts:5641` |
| `ZCODE_E2E_REMOTE_PROFILE` | `packages/desktop/wdio.conf.ts:3593`, `packages/desktop/wdio.conf.ts:3938` |
| `ZCODE_E2E_RENDERER_BRIDGE_PREFLIGHT_TIMEOUT_MS` | `packages/desktop/wdio.conf.ts:547` |
| `ZCODE_E2E_REPORT_VIEWER_BASE_URL` | `packages/e2e-report/src/node/index.ts:30` |
| `ZCODE_E2E_REQUESTED_UPSTREAM_HTTP_MODE` | `packages/desktop/wdio.conf.ts:610` |
| `ZCODE_E2E_RUNNER_FINALIZATION_GUARD_TIMEOUT_MS` | `packages/desktop/wdio.conf.ts:551` |
| `ZCODE_E2E_RUNNER_FORCE_EXIT_TIMEOUT_MS` | `packages/desktop/wdio.conf.ts:549` |
| `ZCODE_E2E_RUNTIME_LOG_DIR` | `packages/desktop/src/main/desktopResourceTelemetry.ts:219`, `packages/desktop/src/main/logger.ts:10` |
| `ZCODE_E2E_RUN_ID` | `packages/desktop/scripts/run-e2e-session-lifecycle-stress.mjs:72`, `packages/desktop/scripts/run-windows-e2e-shards.mjs:192`, `packages/desktop/scripts/run-windows-e2e-shards.mjs:273` |
| `ZCODE_E2E_SESSION_STRESS_ITERATIONS` | `packages/desktop/scripts/run-e2e-session-lifecycle-stress.mjs:15` |
| `ZCODE_E2E_SHARD_TOTAL` | `packages/desktop/scripts/run-windows-e2e-shards.mjs:81`, `packages/desktop/scripts/run-windows-e2e-shards.mjs:83` |
| `ZCODE_E2E_SHARED_STAGE` | `packages/desktop/wdio.conf.ts:652`, `packages/desktop/wdio.conf.ts:660` |
| `ZCODE_E2E_SKIP_AGENT_BUILD` | `packages/desktop/scripts/run-windows-e2e-shards.mjs:283`, `packages/desktop/wdio.conf.ts:658`, `packages/desktop/wdio.conf.ts:1213` |
| `ZCODE_E2E_SKIP_BUILD` | `packages/desktop/scripts/run-windows-e2e-shards.mjs:282`, `packages/desktop/wdio.conf.ts:657`, `packages/desktop/wdio.conf.ts:1046` |
| `ZCODE_E2E_SOURCE_EVIDENCE` | `packages/desktop/wdio.conf.ts:659`, `packages/desktop/wdio.conf.ts:5405` |
| `ZCODE_E2E_SPEC` | `packages/desktop/scripts/run-windows-e2e-shards.mjs:42`, `packages/desktop/scripts/run-windows-e2e-shards.mjs:57`, `packages/desktop/scripts/run-windows-e2e-shards.mjs:287` |
| `ZCODE_E2E_SSH_A_HOST` | `packages/desktop/wdio.conf.ts:1167` |
| `ZCODE_E2E_SSH_B_HOST` | `packages/desktop/wdio.conf.ts:1168` |
| `ZCODE_E2E_SSH_CONTAINER` | `packages/desktop/scripts/e2e-formal-spec-selection.mjs:32`, `packages/desktop/scripts/e2e-formal-spec-selection.mjs:36` |
| `ZCODE_E2E_SSH_HOST` | `packages/desktop/scripts/e2e-formal-spec-selection.mjs:23`, `packages/desktop/wdio.conf.ts:1166` |
| `ZCODE_E2E_SSH_PASSWORD` | `packages/desktop/scripts/e2e-formal-spec-selection.mjs:25` |
| `ZCODE_E2E_SSH_USERNAME` | `packages/desktop/scripts/e2e-formal-spec-selection.mjs:24` |
| `ZCODE_E2E_STORAGE_WORKER_DIAGNOSTICS` | `packages/desktop/wdio.conf.ts:5523` |
| `ZCODE_E2E_STORAGE_WORKER_DIAGNOSTICS_DIR` | `packages/desktop/wdio.conf.ts:5558` |
| `ZCODE_E2E_TELEMETRY_FIELD_SYNC` | `packages/desktop/scripts/lib/telemetry-field-contract.mjs:227` |
| `ZCODE_E2E_UPSTREAM_CONTEXT_WINDOW` | `packages/desktop/wdio.conf.ts:531` |
| `ZCODE_E2E_UPSTREAM_MAX_OUTPUT_TOKENS` | `packages/desktop/wdio.conf.ts:534` |
| `ZCODE_E2E_WEBDRIVER_REQUEST_RETRY_COUNT` | `packages/desktop/wdio.conf.ts:557` |
| `ZCODE_E2E_WEBDRIVER_REQUEST_TIMEOUT_MS` | `packages/desktop/wdio.conf.ts:558` |
| `ZCODE_ELECTRON_RUNTIME_MIRROR` | `packages/desktop/electron-builder.config.js:207`, `packages/desktop/scripts/bundle.mjs:159` |
| `ZCODE_EMBEDDED_SEARCH_COMMAND` | `apps/zcode-cli/packages/bootstrap/src/app/embedded-search-backend.ts:4` |
| `ZCODE_ENABLED_AGENT_PROVIDERS` | `packages/shared/src/validationAppSettings.ts:12`, `packages/shared/src/validationAppSettings.ts:78`, `packages/shared/src/validationAppSettings.ts:370` |
| `ZCODE_ENABLE_MAC_SIGN` | `packages/desktop/electron-builder.config.js:73`, `packages/desktop/electron-builder.config.js:258`, `packages/desktop/electron-builder.config.js:262` |
| `ZCODE_ENABLE_WINDOWS_BROWSER_IMPORT` | `packages/desktop/electron-builder.config.js:59`, `packages/desktop/scripts/ensure-local-runtime-assets.mjs:33`, `packages/desktop/scripts/prepare-runtime-assets.mjs:22` |
| `ZCODE_ENABLE_WINDOWS_SIGN` | `packages/desktop/electron-builder.config.js:249` |
| `ZCODE_ENDPOINT_ORIGIN` | `packages/desktop/scripts/ensure-e2e-desktop-build.mjs:94`, `packages/desktop/src/main/desktopRuntimeEnv.ts:281`, `packages/desktop/src/main/desktopRuntimeEnv.ts:284` |
| `ZCODE_ENDPOINT_PROMPT_HEIGHT` | `packages/desktop/src/main/desktopCommandHandlers.ts:45`, `packages/desktop/src/main/desktopCommandHandlers.ts:461` |
| `ZCODE_ENDPOINT_PROMPT_WIDTH` | `packages/desktop/src/main/desktopCommandHandlers.ts:44`, `packages/desktop/src/main/desktopCommandHandlers.ts:460` |
| `ZCODE_ENV` | `apps/zcode-cli/packages/adapters/src/storage/fs-fault-injection.ts:207`, `apps/zcode-cli/packages/bootstrap/src/zcode-protocol-v4/interaction-registry.ts:41`, `apps/zcode-cli/packages/cli/src/env.ts:149` |
| `ZCODE_FEEDBACK_API_BASE` | `packages/services/src/feedback/feedbackService.ts:64` |
| `ZCODE_FILE_APP_ACTION` | `packages/desktop/src/main/file-open-apps/native.ts:101`, `packages/desktop/src/main/file-open-apps/windows.ts:173` |
| `ZCODE_FILE_APP_HANDLER` | `packages/desktop/src/main/file-open-apps/native.ts:102`, `packages/desktop/src/main/file-open-apps/windows.ts:174` |
| `ZCODE_FILE_APP_INCLUDE_ICONS` | `packages/desktop/src/main/file-open-apps/native.ts:103`, `packages/desktop/src/main/file-open-apps/windows-icon.ts:128`, `packages/desktop/src/main/file-open-apps/windows.ts:176` |
| `ZCODE_FILE_APP_PATH` | `packages/desktop/src/main/file-open-apps/native.ts:100`, `packages/desktop/src/main/file-open-apps/windows.ts:174`, `packages/desktop/src/main/file-open-apps/windows.ts:176` |
| `ZCODE_FILE_CITATION_DIRECTIVE_NAME` | `packages/ui/src/lib/zcodeFileCitation.ts:58`, `packages/ui/src/lib/zcodeFileCitation.ts:69`, `packages/ui/src/lib/zcodeFileCitation.ts:112` |
| `ZCODE_FILE_CITATION_SINGLE_COLON_PREFIX_LENGTH` | `packages/ui/src/lib/zcodeFileCitation.ts:59`, `packages/ui/src/lib/zcodeFileCitation.ts:122` |
| `ZCODE_FILE_CITATION_SYNTAX` | `packages/ui/src/lib/zcodeFileCitation.ts:60`, `packages/ui/src/lib/zcodeFileCitation.ts:70`, `packages/ui/src/lib/zcodeFileCitation.ts:114` |
| `ZCODE_FILE_LOCK_TIMEOUT` | `packages/shared/src/credential-security/contract.ts:76`, `packages/shared/src/errors.ts:30` |
| `ZCODE_FILE_LOCK_TIMEOUT_ERROR_CODE` | `apps/zcode-cli/packages/adapters/src/mcp/oauth-lease.ts:4`, `apps/zcode-cli/packages/adapters/src/mcp/oauth-lease.ts:68`, `packages/shared/src/errors.ts:30` |
| `ZCODE_FILE_STREAMING_TOOL_INPUT_PREVIEW_MIN_INTERVAL_MS` | `apps/zcode-cli/packages/bootstrap/src/zcode-protocol-v4/product-projection.ts:80`, `apps/zcode-cli/packages/bootstrap/src/zcode-protocol-v4/product-projection.ts:871`, `apps/zcode-cli/packages/bootstrap/src/zcode-protocol-v4/product-projection.ts:3641` |
| `ZCODE_FIXTURE_CDP_PORT` | `packages/desktop/scripts/mcp-apps-host-fixture/background-main.ts:12`, `packages/desktop/scripts/mcp-apps-host-fixture/background-main.ts:13` |
| `ZCODE_FORCE_REMOTE_MOCK_CDN` | `scripts/download-glm.mjs:178`, `scripts/download-ripgrep.mjs:135` |
| `ZCODE_GEN_UI_OUTPUT_ROOT` | `packages/shared/src/node/genUiPaths.ts:6` |
| `ZCODE_GIT_BINARY` | `apps/zcode-cli/packages/adapters/src/plugins/marketplace.ts:1940`, `packages/desktop/wdio.conf.ts:4011`, `packages/desktop/wdio.conf.ts:5598` |
| `ZCODE_GLOBALS_EVENT` | `packages/desktop/src/renderer/src/plugin-sandbox/alias.ts:2`, `packages/desktop/src/renderer/src/plugin-sandbox/alias.ts:26`, `packages/desktop/src/renderer/src/plugin-sandbox/aliasRuntime.ts:73` |
| `ZCODE_HIGHSPEED_MOCK_SCENARIO` | `packages/services/src/node.ts:3182` |
| `ZCODE_HOME` | `apps/zcode-cli/packages/telemetry/src/bootstrap.ts:129`, `packages/desktop/src/main/desktopRuntimeEnv.ts:561`, `packages/desktop/src/main/desktopRuntimeEnv.ts:612` |
| `ZCODE_HTTP_PROXY` | `apps/zcode-cli/packages/debug/server/network-capture.ts:131`, `packages/desktop/wdio.conf.ts:595`, `packages/services/src/runtime-tools/agentProxyEnv.ts:12` |
| `ZCODE_HTTP_PROXY_ENV_KEY` | `apps/zcode-cli/packages/adapters/src/network/http-config.ts:4`, `apps/zcode-cli/packages/adapters/src/network/http-config.ts:81`, `apps/zcode-cli/packages/adapters/src/network/http-config.ts:81` |
| `ZCODE_INLINE_PLUGIN_MARKETPLACE` | `apps/zcode-cli/packages/adapters/src/plugins/index.ts:23`, `apps/zcode-cli/packages/adapters/src/plugins/index.ts:316`, `apps/zcode-cli/packages/adapters/src/plugins/live-inventory.ts:7` |
| `ZCODE_INSTALLER_PROCESS_HELPER` | `packages/desktop/electron-builder.config.js:619` |
| `ZCODE_INTERACTION_BEHAVIOR_OPTIONS` | `packages/ui/src/settingsPageHelpers.tsx:70`, `packages/ui/src/settingsPageHelpers.tsx:1026` |
| `ZCODE_JWT_INVALID_BROADCAST_CHANNEL` | `packages/services/src/node.ts:674`, `packages/services/src/node.ts:2900`, `packages/shared/src/oauth.ts:195` |
| `ZCODE_JWT_INVALID_RESTART_MARKER_KEY` | `packages/ui/src/root/zcodeJwtInvalidRestartMarker.ts:1`, `packages/ui/src/root/zcodeJwtInvalidRestartMarker.ts:21`, `packages/ui/src/root/zcodeJwtInvalidRestartMarker.ts:26` |
| `ZCODE_JWT_TOKEN_KEY` | `packages/services/src/coding-plan-subscription/bigmodelCodingPlanSubscriptionProvider.ts:104`, `packages/services/src/coding-plan-subscription/bigmodelCodingPlanSubscriptionProvider.ts:281`, `packages/services/src/coding-plan-subscription/bigmodelCodingPlanSubscriptionProvider.ts:341` |
| `ZCODE_KEEP_INSTALLER_FIXTURE` | `packages/desktop/scripts/test-installer-preserve-files.mjs:288` |
| `ZCODE_KNOWN_TOOL_NAMES` | `packages/shared/src/tool-identity.ts:1`, `packages/shared/src/tool-identity.ts:42`, `packages/shared/src/tool-identity.ts:100` |
| `ZCODE_LARK_CLI_BINARY` | `packages/desktop/src/main/desktopRuntimeEnv.ts:538`, `packages/desktop/src/main/desktopRuntimeEnv.ts:628` |
| `ZCODE_LEGACY_CLI_ENTRY` | `packages/zcode-server-cli/src/cli.ts:911` |
| `ZCODE_LOCAL_TTFT_ENABLED` | `packages/desktop/src/main/rendererActionTraceIpc.ts:123` |
| `ZCODE_LOGO_LINES` | `apps/zcode-cli/packages/tui/src/app-empty-transcript.tsx:11`, `apps/zcode-cli/packages/tui/src/app-empty-transcript.tsx:20`, `apps/zcode-cli/packages/tui/src/app-empty-transcript.tsx:51` |
| `ZCODE_LOG_CONSOLE` | `apps/zcode-cli/packages/adapters/src/logging/index.ts:207` |
| `ZCODE_LOG_DIR` | `apps/zcode-cli/packages/adapters/src/logging/index.ts:203`, `packages/desktop/scripts/mcp-apps-host-fixture/agent.ts:74`, `packages/services/src/zcode-agent/zcodeTaskServiceAdapter.ts:246` |
| `ZCODE_MAILBOX_ROOT` | `apps/zcode-cli/packages/bootstrap/src/app/create-app.ts:551` |
| `ZCODE_MANIFEST_PATH` | `apps/zcode-cli/packages/adapters/src/plugins/index.ts:118`, `apps/zcode-cli/packages/adapters/src/plugins/index.ts:820`, `apps/zcode-cli/packages/adapters/src/plugins/marketplace.ts:67` |
| `ZCODE_MAX_TOOL_CONCURRENCY` | `apps/zcode-cli/packages/adapters/src/config/env-config.adapter.ts:70` |
| `ZCODE_MCP_BROWSER_SCREENSHOT_CONTENT_INDICES_META_KEY` | `apps/zcode-cli/packages/contracts/src/interfaces/mcp.port.ts:163`, `apps/zcode-cli/packages/contracts/src/interfaces/mcp.port.ts:172`, `apps/zcode-cli/packages/core/src/mcp/image-normalization.ts:3` |
| `ZCODE_MCP_DESCRIPTOR` | `packages/desktop/src/main/mcpUserDirectory/index.ts:39`, `packages/desktop/src/main/mcpUserDirectory/index.ts:70`, `packages/desktop/src/main/mcpUserDirectory/index.ts:91` |
| `ZCODE_MCP_ERROR_PRESENTATION_MESSAGE_ONLY` | `apps/zcode-cli/packages/contracts/src/interfaces/mcp.port.ts:161`, `apps/zcode-cli/packages/core/src/mcp/index.ts:7`, `apps/zcode-cli/packages/core/src/mcp/index.ts:571` |
| `ZCODE_MCP_ERROR_PRESENTATION_META_KEY` | `apps/zcode-cli/packages/contracts/src/interfaces/mcp.port.ts:160`, `apps/zcode-cli/packages/core/src/mcp/index.ts:8`, `apps/zcode-cli/packages/core/src/mcp/index.ts:569` |
| `ZCODE_MCP_NODE_REPL_BROWSER_USE_META_KEY` | `apps/zcode-cli/packages/contracts/src/interfaces/mcp.port.ts:185`, `apps/zcode-cli/packages/contracts/src/interfaces/mcp.port.ts:189`, `apps/zcode-cli/packages/core/src/runtime/session-features/session-features.ts:17` |
| `ZCODE_MCP_NODE_REPL_COMPUTER_USE_META_KEY` | `apps/zcode-cli/packages/contracts/src/interfaces/mcp.port.ts:191`, `apps/zcode-cli/packages/core/src/runtime/session-features/session-features.ts:18`, `apps/zcode-cli/packages/core/src/runtime/session-features/session-features.ts:191` |
| `ZCODE_MCP_NODE_REPL_CUA_APP_META_KEY` | `apps/zcode-cli/packages/contracts/src/interfaces/mcp.port.ts:174`, `apps/zcode-cli/packages/core/src/tool/executor/result-display.ts:9`, `apps/zcode-cli/packages/core/src/tool/executor/result-display.ts:428` |
| `ZCODE_MCP_RESOURCE_SAMPLE_INTERVAL_MS` | `apps/zcode-cli/packages/adapters/src/mcp/resource-telemetry.ts:3`, `apps/zcode-cli/packages/adapters/src/mcp/resource-telemetry.ts:83`, `apps/zcode-cli/packages/adapters/src/mcp/resource-telemetry.ts:147` |
| `ZCODE_MCP_SERVER_REQUEST_ID_META_KEY` | `apps/zcode-cli/packages/adapters/src/mcp/index.ts:50`, `apps/zcode-cli/packages/adapters/src/mcp/index.ts:1623`, `apps/zcode-cli/packages/contracts/src/interfaces/mcp.port.ts:201` |
| `ZCODE_MESSAGE_ENABLED` | `apps/zcode-cli/packages/bootstrap/src/app/app-config-options.ts:7`, `apps/zcode-cli/packages/bootstrap/src/app/app-config-options.ts:7` |
| `ZCODE_MIGRATION_BACKUP_SKIPPED` | `apps/zcode-cli/packages/adapters/src/storage/session-store/migration-runner.ts:110` |
| `ZCODE_MIN_COMPATIBLE_VERSION` | `packages/shared/src/source-server/compatibility.ts:6`, `packages/shared/src/source-server/compatibility.ts:34` |
| `ZCODE_MODEL` | `scripts/multimodal-tool-result-p0.mjs:7` |
| `ZCODE_MODEL_REASONING_SEPARATOR` | `apps/zcode-cli/packages/core/src/tool/handlers/model-reference.ts:15`, `apps/zcode-cli/packages/core/src/tool/handlers/model-reference.ts:149`, `packages/services/src/zcode-agent/zcodeAgentService.ts:108` |
| `ZCODE_MODEL_RETRY_BACKOFF_FACTOR` | `apps/zcode-cli/packages/adapters/src/model/retry-policy.ts:20` |
| `ZCODE_MODEL_RETRY_BASE_DELAY_MS` | `apps/zcode-cli/packages/adapters/src/model/retry-policy.ts:19` |
| `ZCODE_MODEL_RETRY_MAX_DELAY_MS` | `apps/zcode-cli/packages/adapters/src/model/retry-policy.ts:21` |
| `ZCODE_MODEL_RETRY_MAX_RETRIES` | `apps/zcode-cli/packages/adapters/src/model/retry-policy.ts:18`, `packages/desktop/wdio.conf.ts:593` |
| `ZCODE_MODEL_TELEMETRY_ENABLED` | `apps/zcode-cli/packages/telemetry/src/bootstrap.ts:124`, `packages/shared/src/runtimeEnv.ts:94`, `packages/shared/src/runtimeEnv.ts:303` |
| `ZCODE_MODE_OPTION_DESCRIPTION_IDS` | `packages/ui/src/chat-input-toolbar/display-help.ts:14`, `packages/ui/src/chat-input-toolbar/display.tsx:47`, `packages/ui/src/chat-input-toolbar/display.tsx:223` |
| `ZCODE_MODE_OPTION_LABEL_IDS` | `packages/ui/src/chat-input-toolbar/display-help.ts:3`, `packages/ui/src/chat-input-toolbar/display.tsx:48`, `packages/ui/src/chat-input-toolbar/display.tsx:212` |
| `ZCODE_NATIVE_SEARCH_ALLOW_PUBLISH` | `scripts/ensure-native-search-deps.mjs:61`, `scripts/ensure-native-search-deps.mjs:151` |
| `ZCODE_NATIVE_SEARCH_DEPS_ROOT` | `scripts/ensure-native-search-deps.mjs:101`, `scripts/ensure-native-search-deps.mjs:110`, `scripts/ensure-native-search-deps.mjs:222` |
| `ZCODE_NODE_DIST_MIRROR` | `packages/zcode-server-cli/src/packaging/nodeDistMirror.ts:4`, `packages/zcode-server-cli/src/packaging/nodeDistMirror.ts:21` |
| `ZCODE_NODE_FALLBACK_EXEC_PATH` | `apps/zcode-cli/packages/adapters/src/mcp/node-fallback.ts:14` |
| `ZCODE_NODE_FALLBACK_NPM_ROOT` | `apps/zcode-cli/packages/adapters/src/mcp/node-fallback.ts:15` |
| `ZCODE_NODE_REPL_BROWSER_BROKER_SOCKET` | `packages/shared/src/browser-use/nodeReplBroker.ts:6` |
| `ZCODE_NODE_REPL_BROWSER_BROKER_TOKEN` | `packages/shared/src/browser-use/nodeReplBroker.ts:7` |
| `ZCODE_NO_PROXY` | `packages/desktop/wdio.conf.ts:596`, `packages/services/src/runtime-tools/agentProxyEnv.ts:14`, `packages/shared/src/runtimeEnv.ts:3` |
| `ZCODE_NO_PROXY_ENV_KEY` | `apps/zcode-cli/packages/adapters/src/network/http-config.ts:5`, `apps/zcode-cli/packages/adapters/src/network/http-config.ts:140`, `apps/zcode-cli/packages/adapters/src/network/subprocess-env.ts:4` |
| `ZCODE_OFFICIAL_ENDPOINT` | `apps/zcode-cli/packages/zcode-site-plugin/skills/site-deploy/scripts/zcode-site.mjs:12`, `apps/zcode-cli/packages/zcode-site-plugin/skills/site-deploy/scripts/zcode-site.mjs:45`, `packages/shared/src/runtimeEnv.ts:19` |
| `ZCODE_OFFICIAL_ENDPOINT_ENV_KEY` | `apps/zcode-cli/packages/bootstrap/src/official-command-endpoint/endpoint.ts:13`, `apps/zcode-cli/packages/bootstrap/src/official-command-endpoint/endpoint.ts:206`, `packages/shared/src/runtimeEnv.ts:19` |
| `ZCODE_OFFICIAL_ENDPOINT_TOKEN` | `apps/zcode-cli/packages/zcode-site-plugin/skills/site-deploy/scripts/zcode-site.mjs:14`, `apps/zcode-cli/packages/zcode-site-plugin/skills/site-deploy/scripts/zcode-site.mjs:46`, `packages/shared/src/runtimeEnv.ts:20` |
| `ZCODE_OFFICIAL_ENDPOINT_TOKEN_ENV_KEY` | `apps/zcode-cli/packages/bootstrap/src/official-command-endpoint/endpoint.ts:14`, `apps/zcode-cli/packages/bootstrap/src/official-command-endpoint/endpoint.ts:207`, `packages/shared/src/runtimeEnv.ts:20` |
| `ZCODE_OFFICIAL_MCP_AUTH_PROVIDER_JWT_TOKEN` | `packages/shared/src/official-mcp-auth.ts:11` |
| `ZCODE_OFFICIAL_MCP_AUTH_TYPE` | `apps/zcode-cli/packages/adapters/src/mcp/index.ts:54`, `apps/zcode-cli/packages/adapters/src/mcp/index.ts:803`, `apps/zcode-cli/packages/adapters/src/mcp/index.ts:1955` |
| `ZCODE_OFFICIAL_MCP_DEV_TRUSTED_ORIGINS` | `packages/shared/src/official-mcp-auth.ts:146`, `scripts/dev-official-mcp-server.mjs:483` |
| `ZCODE_OFFICIAL_PLUGIN_MARKETPLACE` | `apps/zcode-cli/packages/adapters/src/plugins/index.ts:24`, `apps/zcode-cli/packages/adapters/src/plugins/index.ts:325`, `apps/zcode-cli/packages/adapters/src/plugins/index.ts:334` |
| `ZCODE_OFFICIAL_PLUGIN_MARKETPLACE_ID` | `apps/zcode-cli/packages/bootstrap/src/zcode-protocol/plugin-discovery-port.ts:18`, `apps/zcode-cli/packages/bootstrap/src/zcode-protocol/plugin-discovery-port.ts:140`, `apps/zcode-cli/packages/bootstrap/src/zcode-protocol/plugin-discovery-port.ts:149` |
| `ZCODE_OFFPEAK_MOCK` | `packages/desktop/wdio.conf.ts:2862`, `packages/desktop/wdio.conf.ts:2868`, `packages/desktop/wdio.conf.ts:2876` |
| `ZCODE_OFFPEAK_MOCK_ACTIVE_MS` | `packages/desktop/wdio.conf.ts:2884`, `packages/services/src/session/offPeakMockGateway.ts:93`, `packages/services/src/session/offPeakMockGateway.ts:94` |
| `ZCODE_OFFPEAK_MOCK_AVAILABILITY_BLOCK_MS` | `packages/desktop/wdio.conf.ts:2905`, `packages/desktop/wdio.conf.ts:2907`, `packages/desktop/wdio.conf.ts:2916` |
| `ZCODE_OFFPEAK_MOCK_NEXT_POLL_S` | `packages/desktop/wdio.conf.ts:2885`, `packages/services/src/session/offPeakMockGateway.ts:110`, `packages/services/src/session/offPeakMockGateway.ts:111` |
| `ZCODE_OFFPEAK_MOCK_NO_PLAN` | `packages/services/src/coding-plan-subscription/bigmodelCodingPlanSubscriptionProvider.ts:1616`, `packages/services/src/coding-plan-subscription/bigmodelCodingPlanSubscriptionProvider.ts:1617`, `packages/services/src/session/offPeakRuntimeModel.ts:146` |
| `ZCODE_OFFPEAK_MOCK_PORT` | `packages/desktop/wdio.conf.ts:1465`, `packages/desktop/wdio.conf.ts:2869`, `packages/desktop/wdio.conf.ts:2877` |
| `ZCODE_OFFPEAK_MOCK_QUEUE_429_COUNT` | `packages/services/src/session/offPeakMockGateway.ts:96`, `packages/services/src/session/offPeakMockGateway.ts:97` |
| `ZCODE_OFFPEAK_MOCK_QUOTA_COUNT` | `packages/services/src/session/offPeakMockGateway.ts:99`, `packages/services/src/session/offPeakMockGateway.ts:100` |
| `ZCODE_OFFPEAK_MOCK_READY_DELAY_MS` | `packages/desktop/wdio.conf.ts:2881`, `packages/services/src/session/offPeakMockGateway.ts:87`, `packages/services/src/session/offPeakMockGateway.ts:88` |
| `ZCODE_OFFPEAK_MOCK_READY_TTL_MS` | `packages/desktop/wdio.conf.ts:2883`, `packages/services/src/session/offPeakMockGateway.ts:90`, `packages/services/src/session/offPeakMockGateway.ts:91` |
| `ZCODE_OFFPEAK_MOCK_RETRY_AFTER_S` | `packages/services/src/session/offPeakMockGateway.ts:107`, `packages/services/src/session/offPeakMockGateway.ts:108` |
| `ZCODE_OFFPEAK_MOCK_SCENARIO` | `packages/desktop/wdio.conf.ts:2887`, `packages/desktop/wdio.conf.ts:2889`, `packages/desktop/wdio.conf.ts:2897` |
| `ZCODE_PACKAGED_AGENT_OTEL_ENDPOINT` | `packages/desktop/scripts/ensure-e2e-desktop-build.mjs:98`, `packages/desktop/tsup.config.ts:103`, `packages/desktop/tsup.config.ts:119` |
| `ZCODE_PACKAGED_AGENT_OTEL_HEADERS` | `packages/desktop/scripts/ensure-e2e-desktop-build.mjs:99`, `packages/desktop/tsup.config.ts:104`, `packages/desktop/tsup.config.ts:119` |
| `ZCODE_PACKAGED_AGENT_OTEL_SERVICE_NAME` | `packages/desktop/scripts/ensure-e2e-desktop-build.mjs:100`, `packages/desktop/tsup.config.ts:106`, `packages/desktop/tsup.config.ts:129` |
| `ZCODE_PERSONAL_PROVIDER_CONFIG_FILE` | `packages/desktop/scripts/mcp-apps-host-fixture/model.ts:166`, `packages/provider-node/src/runtime-paths.ts:4` |
| `ZCODE_PERSONAL_PROVIDER_CONFIG_FILE_ENV` | `apps/zcode-cli/packages/bootstrap/src/auth-login.ts:55`, `apps/zcode-cli/packages/bootstrap/src/auth-login.ts:348`, `apps/zcode-cli/packages/cli/src/provider-runtime-env.ts:12` |
| `ZCODE_PHOTOCRAFT_ONLY` | `packages/desktop/scripts/mcp-apps-host-e2e.mjs:196`, `packages/desktop/scripts/mcp-apps-host-fixture/background-main.ts:23` |
| `ZCODE_PHOTOCRAFT_SERVER` | `packages/desktop/scripts/mcp-apps-host-e2e.mjs:194`, `packages/desktop/scripts/mcp-apps-host-e2e.mjs:195`, `packages/desktop/scripts/mcp-apps-host-e2e.mjs:232` |
| `ZCODE_PLUGIN_DATA` | `apps/zcode-cli/packages/adapters/src/plugins/mcp.ts:250`, `apps/zcode-cli/packages/adapters/src/plugins/mcp.ts:427`, `apps/zcode-cli/packages/contracts/src/commands/index.ts:135` |
| `ZCODE_PLUGIN_HOST_COMMAND` | `apps/zcode-cli/packages/bootstrap/src/app/official-plugin-runtime.ts:5`, `apps/zcode-cli/packages/bootstrap/src/app/official-plugin-runtime.ts:120`, `apps/zcode-cli/packages/bootstrap/src/app/official-plugin-runtime.ts:125` |
| `ZCODE_PLUGIN_ID` | `apps/zcode-cli/packages/contracts/src/commands/index.ts:136`, `apps/zcode-cli/packages/contracts/src/commands/index.ts:228`, `apps/zcode-cli/packages/core/src/hooks/configured-runner-input.ts:93` |
| `ZCODE_PLUGIN_ID_ENV_KEY` | `apps/zcode-cli/packages/adapters/src/plugins/mcp.ts:13`, `apps/zcode-cli/packages/adapters/src/plugins/mcp.ts:263`, `apps/zcode-cli/packages/bootstrap/src/app/official-plugin-runtime.ts:8` |
| `ZCODE_PLUGIN_MANIFEST_PATH` | `packages/services/src/commands/commandsService.ts:50`, `packages/services/src/commands/commandsService.ts:339`, `packages/services/src/settings-sync/settingsSyncService.ts:405` |
| `ZCODE_PLUGIN_MENTION_ERROR_CODES` | `apps/zcode-cli/packages/bootstrap/src/zcode-protocol/plugin-mention-items.ts:9`, `apps/zcode-cli/packages/bootstrap/src/zcode-protocol/plugin-mention-items.ts:80`, `apps/zcode-cli/packages/bootstrap/src/zcode-protocol/plugin-mention-items.ts:91` |
| `ZCODE_PLUGIN_MENTION_LIMITS` | `packages/shared/src/extension-host/mention.ts:3`, `packages/shared/src/extension-host/mention.ts:21`, `packages/shared/src/zcode-protocol/plugin-host-queries/contract.ts:39` |
| `ZCODE_PLUGIN_NAME` | `apps/zcode-cli/packages/contracts/src/commands/index.ts:137`, `apps/zcode-cli/packages/core/src/hooks/configured-runner-input.ts:94` |
| `ZCODE_PLUGIN_READ_USER_OPTIONS_ERROR_CODES` | `apps/zcode-cli/packages/bootstrap/src/zcode-protocol/plugin-user-options.ts:5`, `apps/zcode-cli/packages/bootstrap/src/zcode-protocol/plugin-user-options.ts:40`, `packages/shared/src/zcode-protocol/plugin-host-queries/contract.example.ts:6` |
| `ZCODE_PLUGIN_ROOT` | `apps/zcode-cli/packages/adapters/src/plugins/mcp.ts:251`, `apps/zcode-cli/packages/adapters/src/plugins/mcp.ts:424`, `apps/zcode-cli/packages/bootstrap/src/app/built-in-node-repl.ts:38` |
| `ZCODE_PLUGIN_SEED_INCOMPLETE` | `apps/zcode-cli/packages/bootstrap/src/app/bundled-plugins.ts:297` |
| `ZCODE_PLUGIN_SEED_LOCK_TIMEOUT` | `apps/zcode-cli/packages/bootstrap/src/app/official-plugin-seed-lock.ts:8` |
| `ZCODE_PLUGIN_SOURCES_CHANGED` | `apps/zcode-cli/packages/adapters/src/plugins/helpers.ts:161`, `apps/zcode-cli/packages/bootstrap/src/app/bundled-plugins.ts:190`, `apps/zcode-cli/packages/bootstrap/src/app/bundled-plugins.ts:197` |
| `ZCODE_PLUGIN_STARTUP_TIMEOUT` | `apps/zcode-cli/packages/bootstrap/src/plugin-startup-budget/module.ts:41` |
| `ZCODE_PREINSTALLED_TOOLS_AVAILABLE` | `apps/zcode-cli/packages/adapters/src/exec/shell-init-snapshot.ts:196`, `packages/shared/src/preinstalled-tools/contract.ts:7` |
| `ZCODE_PREINSTALLED_TOOLS_AVAILABLE_ENV` | `packages/services/src/node.ts:1`, `packages/services/src/node.ts:2610`, `packages/services/src/zcode-agent/zcodeAgentProcessManager.ts:2` |
| `ZCODE_PREINSTALLED_TOOLS_CDN_BASE_URL` | `packages/desktop/src/preinstalled-tools/catalog.ts:11`, `packages/desktop/wdio.conf.ts:5616`, `packages/desktop/wdio.conf.ts:5677` |
| `ZCODE_PREVIEW_IDENTITY` | `packages/desktop/scripts/desktop-product-identity.mjs:3`, `packages/desktop/scripts/desktop-product-identity.mjs:6`, `packages/desktop/scripts/desktop-product-identity.mjs:37` |
| `ZCODE_PREVIEW_IDENTITY_ENV` | `packages/desktop/scripts/desktop-product-identity.mjs:6`, `packages/desktop/scripts/desktop-product-identity.mjs:41`, `packages/desktop/scripts/desktop-product-identity.mjs:49` |
| `ZCODE_PRE_PUSH_BASE` | `scripts/architecture/git-base.mjs:60`, `scripts/engineering-tests/scope.mjs:43` |
| `ZCODE_PRE_PUSH_STDIN` | `scripts/architecture/git-base.mjs:76`, `scripts/check-push-worktree.mjs:15`, `scripts/engineering-tests/scope.mjs:52` |
| `ZCODE_PROCESS_DIAGNOSTIC_MAX_LINE_CHARS` | `packages/shared/src/process-diagnostic.ts:8`, `packages/shared/src/process-diagnostic.ts:29` |
| `ZCODE_PROCESS_DIAGNOSTIC_MESSAGE_MAX_CHARS` | `apps/zcode-cli/packages/cli/src/process-errors.ts:5`, `apps/zcode-cli/packages/cli/src/process-errors.ts:103`, `packages/services/src/zcode-agent/zcodeAgentProcessManager.ts:20` |
| `ZCODE_PROCESS_DIAGNOSTIC_NAME_MAX_CHARS` | `apps/zcode-cli/packages/cli/src/process-errors.ts:4`, `apps/zcode-cli/packages/cli/src/process-errors.ts:99`, `packages/services/src/zcode-agent/zcodeAgentProcessManager.ts:19` |
| `ZCODE_PROCESS_DIAGNOSTIC_PREFIX` | `apps/zcode-cli/packages/cli/src/process-errors.ts:3`, `apps/zcode-cli/packages/cli/src/process-errors.ts:111`, `packages/shared/src/process-diagnostic.ts:4` |
| `ZCODE_PROCESS_DIAGNOSTIC_STACK_MAX_CHARS` | `apps/zcode-cli/packages/cli/src/process-errors.ts:6`, `apps/zcode-cli/packages/cli/src/process-errors.ts:91`, `packages/services/src/zcode-agent/zcodeAgentProcessManager.ts:21` |
| `ZCODE_PROCESS_LABEL` | `packages/desktop/scripts/ensure-e2e-desktop-build.mjs:126`, `packages/desktop/src/host/index.ts:290`, `packages/desktop/src/main/desktopCronScheduler.ts:67` |
| `ZCODE_PROCESS_PREFIX` | `packages/shared/src/process-names.ts:1`, `packages/shared/src/process-names.ts:25` |
| `ZCODE_PROCESS_RESOURCE_SAMPLE_INTERVAL_MS` | `apps/zcode-cli/packages/bootstrap/src/process-resource-sampler.ts:9`, `apps/zcode-cli/packages/bootstrap/src/process-resource-sampler.ts:188` |
| `ZCODE_PRODUCTION_BASE_URL` | `packages/desktop/scripts/ensure-e2e-desktop-build.mjs:101`, `packages/desktop/src/main/desktopRuntimeEnv.ts:277`, `packages/desktop/vite.config.ts:189` |
| `ZCODE_PRODUCT_DOCS_URL` | `packages/ui/src/App.tsx:58`, `packages/ui/src/App.tsx:754`, `packages/ui/src/lib/helpMenuActions.ts:5` |
| `ZCODE_PRODUCT_FLAVOR` | `packages/desktop/src/host/index.ts:3`, `packages/desktop/src/host/index.ts:4098`, `packages/desktop/src/main/desktopApplicationMenu.ts:9` |
| `ZCODE_PROJECT_DIR` | `apps/zcode-cli/packages/adapters/src/plugins/mcp.ts:252`, `apps/zcode-cli/packages/adapters/src/plugins/mcp.ts:430`, `apps/zcode-cli/packages/core/src/hooks/configured-runner-input.ts:83` |
| `ZCODE_PROTOCOL_NAME` | `apps/zcode-cli/packages/bootstrap/src/zcode-protocol/session-mapper.ts:2`, `apps/zcode-cli/packages/bootstrap/src/zcode-protocol/session-mapper.ts:105`, `packages/services/src/zcode-agent/zcodeAgentService.ts:110` |
| `ZCODE_PROTOCOL_V4_WIRE_VERSION` | `packages/shared/src/zcode-protocol/index.ts:142` |
| `ZCODE_PROTOCOL_VERSION` | `apps/zcode-cli/packages/bootstrap/src/zcode-protocol/session-mapper.ts:3`, `apps/zcode-cli/packages/bootstrap/src/zcode-protocol/session-mapper.ts:106`, `packages/services/src/zcode-agent/zcodeAgentService.ts:111` |
| `ZCODE_PROVIDER` | `apps/zcode-cli/packages/restore-legacy-sessions-plugin/skills/restore-legacy-sessions/scripts/restore-conversation.mjs:27`, `apps/zcode-cli/packages/restore-legacy-sessions-plugin/skills/restore-legacy-sessions/scripts/restore-conversation.mjs:316`, `apps/zcode-cli/packages/restore-legacy-sessions-plugin/skills/restore-legacy-sessions/scripts/restore-conversation.mjs:352` |
| `ZCODE_PROVIDERS` | `packages/shared/src/providers.ts:10`, `packages/shared/src/providers.ts:12`, `packages/shared/src/providers.ts:14` |
| `ZCODE_PROVIDER_CONFIG_NETWORK_ERROR` | `apps/zcode-cli/packages/adapters/src/model/runner-runtime-headers.ts:2`, `apps/zcode-cli/packages/adapters/src/model/runner-runtime-headers.ts:20`, `packages/services/src/zcode-agent/zcodeAgentService.ts:20` |
| `ZCODE_PROVIDER_PROJECT_TOKEN_NETWORK_ERROR` | `apps/zcode-cli/packages/adapters/src/model/runner-runtime-headers.ts:3`, `apps/zcode-cli/packages/adapters/src/model/runner-runtime-headers.ts:23`, `packages/services/src/zcode-agent/zcodeAgentService.ts:21` |
| `ZCODE_PROXY_STDIO_IMAGE` | `packages/zcode-server-cli/scripts/verify-proxy-stdio-docker.mjs:21` |
| `ZCODE_PRUNE_PACKAGED_PLATFORM_DEPENDENCIES` | `packages/desktop/electron-builder.config.js:492` |
| `ZCODE_REACT_SCAN` | `packages/desktop/vite.config.ts:195` |
| `ZCODE_REDACTED_PATH_` | `packages/shared/src/agent-crash-diagnostic/agentCrashDiagnostic.ts:228`, `packages/shared/src/agent-crash-diagnostic/agentCrashDiagnostic.ts:235` |
| `ZCODE_REMOTE_ASSET_CACHE_DIR` | `packages/desktop/src/main/desktopRuntimeEnv.ts:320`, `scripts/dev-desktop-remote-prod.mjs:35`, `scripts/dev-desktop-remote-prod.mjs:44` |
| `ZCODE_REMOTE_ASSET_CDN_BASE_URL` | `packages/desktop/src/main/desktopRuntimeEnv.ts:260`, `packages/server/src/remote/remoteAssetCdn.ts:136`, `packages/server/src/remote/remoteAssetCdn.ts:143` |
| `ZCODE_REMOTE_DEV_AGENT_BUNDLE` | `packages/server/src/remote/zcodeAgentDevDeploy.ts:51` |
| `ZCODE_REMOTE_HTTP_PROXY` | `packages/shared/src/runtimeEnv.ts:7` |
| `ZCODE_REMOTE_HTTP_PROXY_ENV_KEY` | `packages/server/src/remote/connect.ts:11`, `packages/server/src/remote/connect.ts:399`, `packages/server/src/stdioServices.ts:10` |
| `ZCODE_REMOTE_INPUT_PREDICTION` | `packages/services/src/zcode-agent/inputPredictionSwitch.ts:9` |
| `ZCODE_REMOTE_MEDIA_RANGE_PREVIEW_ENABLED` | `packages/desktop/src/host/index.ts:277` |
| `ZCODE_REMOTE_NO_PROXY` | `packages/shared/src/runtimeEnv.ts:8` |
| `ZCODE_REMOTE_NO_PROXY_ENV_KEY` | `packages/server/src/remote/connect.ts:12`, `packages/server/src/remote/connect.ts:404`, `packages/server/src/stdioServices.ts:11` |
| `ZCODE_REMOTE_RUNTIME_NETWORK_AUTHORITY` | `packages/shared/src/runtimeEnv.ts:6` |
| `ZCODE_REMOTE_RUNTIME_NETWORK_AUTHORITY_ENV_KEY` | `packages/server/src/remote/connect.ts:13`, `packages/server/src/remote/connect.ts:396`, `packages/server/src/stdioServices.ts:12` |
| `ZCODE_REMOTE_WORKSPACE_DISCONNECTED` | `packages/ui/src/hooks/useWorkspaceProviderConfigFile.ts:126`, `packages/ui/src/lib/remoteConnectionPresentationErrors.ts:101`, `packages/ui/src/lib/remoteWorkspaceServiceError.ts:2` |
| `ZCODE_RENDERER_ACTION_TRACE_ENABLED` | `packages/desktop/src/main/rendererActionTraceIpc.ts:124` |
| `ZCODE_REPLY_LANGUAGE_REQUEST_TIMEOUT_MS` | `apps/zcode-cli/packages/bootstrap/src/zcode-protocol/workspace-model-runtime.ts:5`, `apps/zcode-cli/packages/bootstrap/src/zcode-protocol/workspace-model-runtime.ts:157`, `packages/shared/src/zcode-protocol/index.ts:2177` |
| `ZCODE_REQUIRE_NATIVE_SEARCH_E2E` | `scripts/test-native-search-tools-e2e.mjs:68` |
| `ZCODE_RG_BINARY` | `apps/zcode-cli/packages/cli/scripts/build-sea.mjs:249`, `packages/shared/src/runtime-tool-runtime.ts:30`, `scripts/test-native-search-tools-e2e.mjs:69` |
| `ZCODE_RPC_CLIENT_MODE_HEADER` | `packages/shared/src/channels.ts:672` |
| `ZCODE_RPC_HOST_CAPABILITY_HEADER` | `packages/desktop/src/host/serverRemoteConnection.ts:14`, `packages/desktop/src/host/serverRemoteConnection.ts:267`, `packages/desktop/src/host/serverRemoteConnection.ts:396` |
| `ZCODE_RUNTIME_ENV` | `apps/zcode-cli/packages/adapters/src/model/runner-debug.ts:65`, `apps/zcode-cli/packages/adapters/src/model/runner-debug.ts:71`, `apps/zcode-cli/packages/adapters/src/model/runner-debug.ts:167` |
| `ZCODE_RUNTIME_ENV_KEY` | `apps/zcode-cli/packages/adapters/src/logging/index.ts:12`, `apps/zcode-cli/packages/adapters/src/logging/index.ts:261`, `apps/zcode-cli/packages/adapters/src/model/runner-debug.ts:13` |
| `ZCODE_RUNTIME_HOST_PATH` | `packages/services/src/windows-runtime-host/index.ts:25`, `packages/services/src/windows-runtime-host/index.ts:26`, `scripts/windows-runtime-host/host-acceptance.cjs:39` |
| `ZCODE_RUNTIME_MODEL_UNAVAILABLE` | `apps/zcode-cli/packages/bootstrap/src/zcode-protocol-v4/commands/prompt-turn.ts:25`, `packages/ui/src/ChatErrorBanner.tsx:59`, `packages/ui/src/ChatErrorBanner.tsx:166` |
| `ZCODE_SCREENSHOT_SMOKE_RESULT_PATH` | `packages/desktop/scripts/browser-screenshot-surface-smoke.mjs:7` |
| `ZCODE_SCREENSHOT_SMOKE_SCALE_FACTOR` | `packages/desktop/scripts/browser-screenshot-surface-smoke.mjs:8`, `packages/desktop/scripts/browser-screenshot-surface-smoke.mjs:17` |
| `ZCODE_SECURITY_ROOT` | `packages/desktop/scripts/auto-update-source-security-smoke.mjs:43`, `packages/desktop/scripts/auto-update-source-security-smoke.mjs:238` |
| `ZCODE_SECURITY_SCENARIO` | `packages/desktop/scripts/auto-update-source-security-smoke.mjs:42`, `packages/desktop/scripts/auto-update-source-security-smoke.mjs:237` |
| `ZCODE_SERVER_AUTH_TOKEN` | `packages/server/src/entry-http.ts:20`, `scripts/zcode-distribution/runner.mjs:189` |
| `ZCODE_SERVER_CREDENTIAL_FORMAT` | `packages/zcode-server-cli/src/contracts.ts:6` |
| `ZCODE_SERVER_ENTRY` | `scripts/test-web-app-gateway-reset.mjs:79` |
| `ZCODE_SERVER_HOST` | `packages/server/src/entry-http.ts:18`, `scripts/zcode-distribution/runner.mjs:185` |
| `ZCODE_SERVER_ID` | `packages/server/src/http.ts:165` |
| `ZCODE_SERVER_NAME` | `packages/server/src/http.ts:185`, `packages/server/src/http.ts:186` |
| `ZCODE_SERVER_RELEASE_ID` | `packages/zcode-server-cli/src/cli.ts:520`, `packages/zcode-server-cli/src/server-core/core.ts:119`, `packages/zcode-server-cli/src/server-core/core.ts:120` |
| `ZCODE_SERVER_RELEASE_MANIFEST_URL` | `packages/zcode-server-cli/src/runtime/updatePreparation.ts:59` |
| `ZCODE_SERVER_ROOT` | `packages/zcode-server-cli/src/cli.ts:404`, `packages/zcode-server-cli/src/cli.ts:508`, `packages/zcode-server-cli/src/runtime/stableLauncher.ts:48` |
| `ZCODE_SERVER_RUNTIME_ROOT` | `packages/server/src/remote/connect.ts:382`, `packages/server/src/remote/zcodeAgentBundleWrapper.ts:15`, `packages/server/src/remote/zcodeAgentDevDeploy.ts:269` |
| `ZCODE_SERVER_SKIP_SERVICE_REGISTRATION` | `packages/server/src/source-server/transportAdapter.ts:364`, `packages/server/src/source-server/transportAdapter.ts:498`, `packages/zcode-server-cli/scripts/verify-proxy-stdio-docker.mjs:67` |
| `ZCODE_SERVER_TOKEN` | `packages/server/src/http.ts:190` |
| `ZCODE_SERVER_WORKSPACE` | `packages/server/src/http.ts:173`, `scripts/test-web-app-gateway-reset.mjs:81`, `scripts/zcode-distribution/runner.mjs:186` |
| `ZCODE_SERVICE_AUTHORITY_MODE` | `packages/shared/src/serviceAuthority.ts:1` |
| `ZCODE_SESSION_DB` | `packages/desktop/scripts/mcp-apps-host-fixture/agent.ts:76`, `packages/services/src/onboarding/localUsageEvidence.ts:18`, `packages/services/src/onboarding/localUsageEvidence.ts:59` |
| `ZCODE_SESSION_DB_PATH` | `packages/services/src/onboarding/localUsageEvidence.ts:18`, `packages/services/src/onboarding/localUsageEvidence.ts:59` |
| `ZCODE_SESSION_ID` | `apps/zcode-cli/packages/adapters/src/plugins/mcp.ts:434`, `apps/zcode-cli/packages/core/src/hooks/configured-runner-input.ts:84`, `apps/zcode-cli/packages/core/src/hooks/configured-runner-input.ts:111` |
| `ZCODE_SESSION_RUNTIME_PREFERENCES_REQUEST_TIMEOUT_MS` | `apps/zcode-cli/packages/bootstrap/src/zcode-protocol/server-operations.ts:64`, `apps/zcode-cli/packages/bootstrap/src/zcode-protocol/server-operations.ts:3664`, `apps/zcode-cli/packages/bootstrap/src/zcode-protocol/server-operations.ts:3970` |
| `ZCODE_SESSION_TARGET_NOT_FOUND` | `packages/services/src/zcode-agent/zcodeTaskServiceAdapter.ts:1013` |
| `ZCODE_SETTING_WRITE_QUEUE_TIMEOUT_MS` | `packages/services/src/setting/settingsWriteQueue.ts:2` |
| `ZCODE_SHORTCUT_PATH` | `packages/desktop/scripts/test-installer-nsh-smoke.mjs:72`, `packages/desktop/scripts/test-installer-nsh-smoke.mjs:77` |
| `ZCODE_SHOWCASE_SERVER` | `packages/desktop/scripts/mcp-apps-host-e2e.mjs:26`, `packages/desktop/scripts/mcp-apps-host-e2e.mjs:30` |
| `ZCODE_SKILL_DIR` | `apps/zcode-cli/packages/adapters/src/plugins/mcp.ts:439`, `apps/zcode-cli/packages/contracts/src/commands/index.ts:139`, `apps/zcode-cli/packages/core/src/hooks/configured-runner-input.ts:120` |
| `ZCODE_SKIP_BUILD` | `packages/desktop/scripts/bundle.mjs:329` |
| `ZCODE_SKIP_PREPARE` | `packages/desktop/scripts/bundle.mjs:328` |
| `ZCODE_SOURCE_HEADERS` | `packages/services/src/providers/sourceHeaders.ts:8`, `packages/services/src/providers/sourceHeaders.ts:13`, `packages/shared/src/zcode-source-headers.ts:3` |
| `ZCODE_STDIO_TAP_LOG_DIR` | `scripts/dev/zcode-stdio-tap.mjs:32` |
| `ZCODE_STORAGE_DIR` | `apps/zcode-cli/packages/adapters/src/exec/execution-utils.ts:19`, `apps/zcode-cli/packages/cli/scripts/build-sea.mjs:246`, `apps/zcode-cli/packages/cli/src/clipboard-image.ts:33` |
| `ZCODE_SUBAGENT_STALL_NOTIFY_MS` | `apps/zcode-cli/packages/bootstrap/src/app/runtime-config.ts:282`, `apps/zcode-cli/packages/bootstrap/src/app/runtime-config.ts:299` |
| `ZCODE_TARGET_ARCH` | `packages/desktop/scripts/build-windows-browser-import-helper.mjs:14`, `packages/desktop/scripts/build-windows-preinstalled-entry-shim.mjs:177`, `packages/desktop/scripts/bundle.mjs:219` |
| `ZCODE_TARGET_OS` | `packages/desktop/scripts/bundle.mjs:218`, `packages/desktop/scripts/bundle.mjs:303`, `packages/desktop/scripts/bundle.mjs:326` |
| `ZCODE_TELEMETRY_` | `packages/shared/src/runtimeEnv.ts:302` |
| `ZCODE_TELEMETRY_DEVICE_MID` | `apps/zcode-cli/packages/bootstrap/src/telemetry-bootstrap.ts:23`, `apps/zcode-cli/packages/bootstrap/src/telemetry-bootstrap.ts:24`, `apps/zcode-cli/packages/bootstrap/src/zcode-protocol-entrypoint.ts:238` |
| `ZCODE_TELEMETRY_IDENTITY_STATE` | `apps/zcode-cli/packages/telemetry/src/bootstrap.ts:200`, `packages/desktop/src/main/desktopRuntimeEnv.ts:575`, `packages/services/src/zcode-agent/agentTelemetryEnv.ts:26` |
| `ZCODE_TELEMETRY_PARITY_CAPTURE_PATH` | `packages/desktop/wdio.conf.ts:5216`, `packages/desktop/wdio.conf.ts:5218`, `packages/desktop/wdio.conf.ts:5218` |
| `ZCODE_TELEMETRY_PARITY_VARIANT` | `packages/desktop/wdio.conf.ts:5221`, `packages/desktop/wdio.conf.ts:5223`, `packages/desktop/wdio.conf.ts:5223` |
| `ZCODE_TELEMETRY_REPORT_ENDPOINT` | `packages/desktop/src/main/appARMSBootstrap.ts:8`, `packages/desktop/src/main/appARMSBootstrap.ts:35`, `packages/services/src/telemetry/telemetryCore.ts:6` |
| `ZCODE_TELEMETRY_RUNTIME_DISTRIBUTION` | `apps/zcode-cli/packages/telemetry/src/bootstrap.ts:169`, `packages/desktop/src/main/desktopRuntimeEnv.ts:227`, `packages/desktop/src/main/desktopRuntimeEnv.ts:227` |
| `ZCODE_TELEMETRY_RUNTIME_SURFACE` | `apps/zcode-cli/packages/bootstrap/src/zcode-protocol-entrypoint.ts:534`, `apps/zcode-cli/packages/telemetry/src/bootstrap.ts:171`, `packages/desktop/src/main/desktopRuntimeEnv.ts:577` |
| `ZCODE_TELEMETRY_USER_ID` | `packages/desktop/src/main/desktopRuntimeEnv.ts:572`, `packages/shared/src/runtimeEnv.ts:98` |
| `ZCODE_TELEMETRY_USER_ID_HASH` | `packages/desktop/src/main/desktopRuntimeEnv.ts:573`, `packages/shared/src/runtimeEnv.ts:99` |
| `ZCODE_TELEMETRY_USER_SUBJECT_ID` | `apps/zcode-cli/packages/telemetry/src/bootstrap.ts:199`, `packages/desktop/src/main/desktopRuntimeEnv.ts:574`, `packages/services/src/zcode-agent/agentTelemetryEnv.ts:29` |
| `ZCODE_TEST_BACKEND_START_DELAY_MS` | `scripts/test-web-app-gateway-reset.mjs:45`, `scripts/test-web-app-gateway-reset.mjs:83` |
| `ZCODE_TEST_BASE_URL` | `packages/desktop/scripts/ensure-e2e-desktop-build.mjs:102`, `packages/desktop/src/main/desktopRuntimeEnv.ts:277`, `packages/desktop/vite.config.ts:189` |
| `ZCODE_TEST_CLIENT_CONFIG_PLATFORM` | `packages/services/src/runtime-tools/clientPlatform.ts:31` |
| `ZCODE_TEST_RELEASE_ARCH` | `packages/services/src/runtime-tools/clientPlatform.ts:23` |
| `ZCODE_TEST_RELEASE_TARGET` | `packages/services/src/runtime-tools/clientPlatform.ts:18` |
| `ZCODE_TOOL_ENV_PASSTHROUGH_ENV_KEY` | `apps/zcode-cli/packages/adapters/src/network/http-config.ts:6`, `apps/zcode-cli/packages/adapters/src/network/http-config.ts:107`, `apps/zcode-cli/packages/adapters/src/network/subprocess-env.ts:5` |
| `ZCODE_TOOL_ENV_PASSTHROUGH_JSON` | `packages/services/src/runtime-tools/runtimeCommandEnv.ts:264`, `packages/shared/src/runtimeEnv.ts:10` |
| `ZCODE_UGREP_BINARY` | `apps/zcode-cli/packages/cli/scripts/build-sea.mjs:250`, `packages/shared/src/runtime-tool-runtime.ts:35`, `scripts/test-native-search-tools-e2e.mjs:70` |
| `ZCODE_UNSUPPORTED_HTTP_STATUS` | `apps/zcode-cli/packages/adapters/src/network/incoming-response.ts:23` |
| `ZCODE_UPDATE_FEED_URL` | `packages/desktop/scripts/auto-update-source-security-smoke.mjs:75`, `packages/desktop/src/main/autoUpdater.ts:34` |
| `ZCODE_V4_COMMAND_REJECTED` | `packages/services/src/zcode-agent/zcodeV4HostCommand.ts:96` |
| `ZCODE_VERSION` | `apps/zcode-cli/packages/adapters/src/memory-diagnostics/index.ts:9`, `apps/zcode-cli/packages/adapters/src/memory-diagnostics/index.ts:88`, `apps/zcode-cli/packages/bootstrap/src/app/process-provider-registry-runtime.ts:11` |
| `ZCODE_WEBM_SMOKE_CAPTURE_MS` | `packages/desktop/scripts/browser-webm-recording-smoke.mjs:9` |
| `ZCODE_WEBM_SMOKE_OUTPUT_PATH` | `packages/desktop/scripts/browser-webm-recording-smoke.mjs:8` |
| `ZCODE_WEB_DIST_DIR` | `scripts/test-web-app-gateway-reset.mjs:84` |
| `ZCODE_WEB_REMOTE_CONTROL_RELAY_WS_URL` | `packages/desktop/src/main/index.ts:1020` |
| `ZCODE_WEB_REMOTE_CONTROL_URL` | `packages/desktop/src/main/index.ts:1021`, `scripts/dev-web-remote-control-desktop.mjs:9`, `scripts/dev-web-remote-control-desktop.mjs:11` |
| `ZCODE_WEB_STATIC_ROOT` | `packages/server/src/entry-http.ts:19`, `scripts/zcode-distribution/runner.mjs:187` |
| `ZCODE_WINDOWS_APP_INSTALL_DIR` | `packages/services/src/paths.ts:14` |
| `ZCODE_WINDOWS_APP_INSTALL_DIR_ENV` | `packages/desktop/src/main/desktopRuntimeEnv.ts:34`, `packages/desktop/src/main/desktopRuntimeEnv.ts:623`, `packages/services/src/node.ts:169` |
| `ZCODE_WINDOWS_CXX` | `scripts/build-windows-runtime-host.mjs:14` |
| `ZCODE_WINDOWS_OUTPUT_ENCODING` | `apps/zcode-cli/packages/adapters/src/exec/outputEncoding.ts:6` |
| `ZCODE_WORKFLOWS_FOR_RUN_MAX_CANDIDATES` | `packages/shared/src/zcode-protocol/index.ts:3658`, `packages/shared/src/zcode-protocol/index.ts:3665`, `packages/ui/src/v4/workflowRunCardJoin.ts:4` |
| `ZCODE_WORKFLOWS_RUNS_MAX_LIMIT` | `apps/zcode-cli/packages/bootstrap/src/zcode-protocol/saved-workflows.ts:22`, `apps/zcode-cli/packages/bootstrap/src/zcode-protocol/saved-workflows.ts:153`, `packages/shared/src/zcode-protocol/index.ts:3477` |
| `ZCODE_WORKSPACE_IDENTITY` | `packages/shared/src/official-mcp-auth.ts:149` |
| `ZCODE_WORKSPACE_IDENTITY_ENV` | `apps/zcode-cli/packages/bootstrap/src/zcode-protocol-entrypoint.ts:64`, `apps/zcode-cli/packages/bootstrap/src/zcode-protocol-entrypoint.ts:195`, `apps/zcode-cli/packages/bootstrap/src/zcode-protocol-entrypoint.ts:270` |
| `ZCODE_WORKSPACE_ROOT` | `apps/zcode-cli/packages/office-runtime/scripts/e2e.mjs:49`, `apps/zcode-cli/packages/office-runtime/scripts/smoke.mjs:46`, `apps/zcode-cli/packages/office-runtime/src/adapters/main.ts:18` |
