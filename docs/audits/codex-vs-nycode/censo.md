# Censo Mecânico de Capacidades: Codex CLI vs `nycode`

Reconciliação mecânica de ferramentas do modelo, subcomandos CLI, slash commands TUI, eventos de hook, métodos JSON-RPC do App Server e modos de execução entre Codex (`rust-v0.172.0`, `3d86e43b`) e `nycode` (`00fed2ae`).

## 1. Resumo Quantitativo

| Superfície | Codex (`codex-rs`) | `nycode` (`packages/`) | Observação objetiva |
|---|---:|---:|---|
| Arquivos de código/prompt/teste no escopo | 6596 | — | 4002 código, 72 prompt, 2522 teste em `codex-rs/`, `sdk/`, `codex-cli/` |
| Feature flags (`FeatureSpec`) | 226 | ~22 chaves em `settings-nycode.ts` | Detalhamento em [censo-flags.md](censo-flags.md) |
| Subcomandos CLI (`Subcommand`) | 31 | 8 comandos + flags em `args.ts` | Codex inclui `exec`, `execpolicy`, `app-server`, `sandbox`, `mcp`, `cloud` |
| Slash commands TUI | 68 (`SlashCommand`) | 24 núcleo + 46 extensões | `nycode` soma `/btw`, `/recap`, `/diff`, `/rewind`, `/goal`, `/bypass` |
| Eventos oficiais de Hook | 14 (`HOOK_EVENT_NAMES`) | 13+ eventos Claude compat + core | `nycode` executa `prompt`/`agent`/`http`; Codex só `command`/`mcp_tool` |
| Variáveis de ambiente mapeadas | 328 (`CODEX_*` / `OPENAI_*`) | `NYCODE_*` em `docs/environment-variables.md` | Detalhamento completo em [censo-flags.md](censo-flags.md) |
| Métodos App-Server JSON-RPC | 281 (`common.rs`) | ~32 comandos RPC em `rpc-types.ts` | Codex tem daemon multi-cliente WS/Unix; `nycode` tem SDK in-process |

## 2. Ferramentas Expostas ao Modelo (Built-in & Core)

| Tool / Namespace Codex | Arquivo-fonte Codex | Equivalente `nycode` | Veredito rápido |
|---|---|---|---|
| `exec_command` / `write_stdin` | `codex-rs/core/src/tools/handlers/shell_spec.rs:9-139` | `bash`, `powershell`, `run`, `task_stop` (`core/tools/bash.ts`, `extensions/run/tool.ts`) | Codex tem PTY persistente interativo + pool LRU (`Achado 20`) |
| `apply_patch` (Lark freeform) | `codex-rs/core/assets/tools/apply_patch.lark:1-19` | `edit` + `write` (`core/tools/edit.ts`, `write.ts`) | Codex usa 252 tok multi-arquivo vs 321 tok JSON (`Achado 07`) |
| `update_plan` | `codex-rs/core/src/tools/handlers/plan_spec.rs:7-58` | `todo` (`extensions/todo/`) + `/plan` (`plan-mode`) | Equivalente coberto; `nycode` separa checklist de Plan Mode |
| `view_image` | `codex-rs/core/src/tools/handlers/view_image_spec.rs:16-51` | `read` suporta imagens inline (`core/tools/read.ts:272-295`) | `nycode` unifica texto+imagem num schema único de 152 tok |
| `request_user_input` | `codex-rs/core/src/tools/handlers/request_user_input_spec.rs:16-89` | `question` (`extensions/question/index.ts:21`) | `nycode` ainda suprime `question` em `-p` via `headless-lean` |
| `request_permissions` | `codex-rs/core/src/tools/handlers/shell_spec.rs:141-171` | `gateToolCall` + `ctx.ui.confirm` (`core/permissions/gate.ts`) | Sem escalonamento granular dinâmico de filesystem/rede no `nycode` |
| `tool_search` (BM25) | `codex-rs/core/src/tools/handlers/tool_search.rs:153-277` | `tool_search` (`extensions/tool-search/tool.ts:213-349`) | `nycode` reconstrói índice BM25 a cada chamada (`Achado 05`) |
| `exec` / `wait` (Code Mode V8) | `codex-rs/code-mode-protocol/src/description.rs:24-56` | `codemode` (`extensions/codemode/tool.ts` QuickJS WASM) | `nycode` já possui sandbox WASM + `store()`/`load()`/`models` (`Rejeitado`) |
| `multi_agent_v1` / `collaboration` (V2) | `codex-rs/core/src/tools/handlers/multi_agents_spec.rs:14-382` | `subagent` (`extensions/subagent/core/params.ts:32-126`) | Codex tem subagentes em processo + `fork_turns` (`Achado 15`) |
| `get_goal` / `create_goal` / `update_goal` | `codex-rs/ext/goal/src/spec.rs:13-94` | `/goal` + juiz `Haiku` externo (`extensions/goal/index.ts`) | `nycode` evita auto-aprovação, mas falta `token_budget` descendente (`Achado 18`) |
| `get_context_remaining` / `new_context` | `codex-rs/core/src/tools/handlers/get_context_remaining_spec.rs:12-22`, `new_context_window_spec.rs:10-20` | Compactação automática/manual (`/compact`, `threshold.ts`) | Útil avaliar em conjunto com compactação (`Achado 10`) |
| `notes/*` / `history/*` (`memories`) | `codex-rs/core/src/tools/handlers/extension_tools.rs:145-156` | `memory` (`extensions/memory/index.ts:595`) | Codex tem consolidação 2 fases em background (`Achado 17`) |
| `web/run` + `WebSearch` | `codex-rs/tools/src/tool_spec.rs:39-53` | `web_fetch` + `web_search` (`extensions/web/index.ts:433-472`) | `nycode` já possui proteção SSRF DNS-pinned em `web_fetch` |
| `grep` / `find` / `ls` nativos no core | Substituídos por `exec_command` (`rg`/`fd` no shell) | `grep`, `find`, `ls` (`core/tools/{grep,find,ls}.ts`) | `nycode` oferece tools dedicados opcionais + quarteto enxuto |

## 3. Eventos de Hook (`HOOK_EVENT_NAMES` = 14)

Definidos em `codex-rs/hooks/src/lib.rs:29-44` e comparados com `packages/coding-agent/src/extensions/hooks/index.ts`:

| Evento no Codex | Suporta matcher | Suporte no Codex (`rust-v0.172.0`) | Equivalente no `nycode` |
|---|---|---|---|
| `PreModelRequest` | Não | Command / MCP | `before_agent_start` / `before_provider_request` (extensão core) |
| `PostModelRequest` | Não | Command / MCP | `after_provider_response` (extensão core) |
| `PreToolUse` | Sim | Command / MCP | `PreToolUse` (`hooks/index.ts`) + `user_bash` |
| `PermissionRequest` | Sim | Command / MCP (não burla `PromptUser`) | `PermissionRequest` / `gateToolCall` (`core/permissions/gate.ts`) |
| `PostToolUse` | Sim | Command / MCP | `PostToolUse` + `PostToolUseFailure` (`hooks/index.ts`) |
| `PreCompact` | Sim | Command / MCP | `PreCompact` (`hooks/index.ts`) |
| `PostCompact` | Sim | Command / MCP | `PostCompact` (`hooks/index.ts`) |
| `SessionStart` | Sim | Command / MCP | `SessionStart` (`hooks/index.ts`) |
| `SessionEnd` | Sim | Command / MCP (timeout 1s, teto 3s) | `SessionEnd` (`hooks/index.ts`) |
| `UserPromptSubmit` | Não | Command / MCP | `UserPromptSubmit` (`hooks/index.ts`) |
| `SubagentStart` | Sim | Command / MCP | `SubagentStart` (`hooks/index.ts`) |
| `SubagentStop` | Sim | Command / MCP | `SubagentStop` (`hooks/index.ts`) |
| `Stop` | Não | Command / MCP | `Stop` (`hooks/index.ts`, teto `8` bloqueios) |
| `Interrupt` | Não | Command / MCP (timeout 1s, teto 3s) | `agent_end` / `session_shutdown` (sem evento dedicado Claude compat) |

## 4. Subcomandos CLI (`Subcommand` = 31)

Extraídos de `codex-rs/cli/src/main.rs` e mapeados para `packages/coding-agent/src/cli/args.ts`:

| Subcomando Codex | Finalidade | Equivalente no `nycode` |
|---|---|---|
| `Agents` | Gerenciar/inspecionar subagentes/daemons | `/agents` (`extensions/subagent/index.ts:665`) |
| `TcpTunnel` | Túnel TCP auxiliar | `packages/env/` |
| `Exec` | Execução não interativa (`codex exec`, JSONL, `--output-schema`, `-o`) | `-p` / `--mode json` (`modes/print-mode.ts`); falta `-o` e `--output-schema` |
| `Review` | Code review não interativo em worktree/diff | `/code-review` (`resources/commands/code-review.md`) |
| `Login` | Login OAuth/API key ChatGPT/OpenAI | `nycode auth login` (`cli/args.ts:303`) |
| `GitCredential` | Helper de credencial git autenticado | `sem equivalente` |
| `Logout` | Remover credenciais | `nycode auth logout` |
| `Mcp` | Gerenciar servidores MCP | `nycode mcp` (`cli/args.ts:304`) |
| `Plugin` | Instalar/gerenciar plugins | `nycode install/remove/list` + `/claude-plugins` |
| `AppServer` | Servidor JSON-RPC 2.0 multi-transporte | `--mode rpc` (`modes/rpc/rpc-mode.ts`) |
| `RemoteControl` | Controle remoto seguro / pareamento | `sem equivalente` |
| `App` | Abrir/integrar App Desktop | `sem equivalente` |
| `Completion` | Gerar autocomplete shell | `sem equivalente` |
| `Update` | Auto-atualização binária | `nycode update` (`cli/args.ts:300`) |
| `Doctor` | Diagnóstico de ambiente/auth/MCP | `/diagnostico` / `/doctor` (`extensions/diagnostico/index.ts:789`) |
| `Sandbox` | Executar comandos direto sob sandbox OS (`bwrap`/`seatbelt`/Windows) | `sem equivalente` (`Achado 06`) |
| `Debug` | Comandos internos de inspeção/diagnóstico | `/diagnostico` / `NYCODE_TIMING=1` |
| `Execpolicy` | Validar regras Starlark `.rules` (`execpolicycheck`) | `core/permissions/guard/` (JS sem CLI próprio) |
| `Apply` | Aplicar patches/diffs salvos de cloud task | `sem equivalente` |
| `Resume` | Retomar sessão por ID / picker | `--resume` / `-r` / `--session` (`cli/args.ts:316-318`) |
| `Queue` | Inspecionar/gerenciar fila de prompts persistidos | `extensions/up-dequeue/` (somente sessão local) |
| `Archive` | Arquivar thread no SQLite/rollout | `sem equivalente` |
| `Delete` | Apagar thread persistida | `sem equivalente` |
| `MigrateRollouts` | Migrar rollouts para formato novo | `migrateSessionEntries` automático (`session-manager.ts:351`) |
| `MigrateNfsDb` | Migrar base SQLite de NFS | `sem equivalente` |
| `Unarchive` | Desarquivar thread | `sem equivalente` |
| `Fork` | Bifurcar sessão a partir de um turno | `--fork` (`cli/args.ts:319`) e `/fork` |
| `Cloud` | Submeter/listar tarefas no Codex Cloud | `apps/p3/` (fora do pacote CLI base) |
| `ResponsesApiProxy` | Proxy HTTP local injetando API key OpenAI | `packages/ai/` direto |
| `ExecServer` | Daemon remoto de execução/filesystem | `packages/env/` (daemon SSH/remoto) |
| `Features` | Listar/habilitar feature flags experimentais | `settings-flags` / `config` (`cli/args.ts:302`) |

## 5. Slash Commands TUI (`SlashCommand` = 68 variantes no Codex)

Extraídos de `codex-rs/tui/src/slash_command.rs` e conciliados com `core/slash-commands.ts` + `registerCommand()` nas extensões do `nycode`:

| Comando Codex | Equivalente `nycode` |
|---|---|
| `Model` | `/model` (`core/slash-commands.ts:21`) |
| `Presets` | `/settings`, `/scoped-models` (`core/slash-commands.ts:20,24`) |
| `Daybreak` | `sem equivalente` (feature proprietária OpenAI) |
| `Ide` | `sem equivalente` (integração IDE/App Server) |
| `Permissions` | `/bypass` (`core/permissions/bypass-command.ts:101`) |
| `Keymap` | `/hotkeys`, `/keybindings` (`core/slash-commands.ts:33`, `dev-commands/index.ts:12`) |
| `Vim` | `editorMode: "vim"` em `settings-nycode.ts:29` |
| `ElevateSandbox` | `sem equivalente` (Windows/OS sandbox) |
| `Experimental` | `extensions/settings-flags/` + `/config-set` |
| `AutoReview` | `sem equivalente` (`/approve` Guardian no Codex) |
| `Memories` | `/memory` (`extensions/memory/index.ts:626`) |
| `Skills` | `/skills` (`extensions/claude-compat/index.ts:112`) |
| `Import` | `/import` (`core/slash-commands.ts:26`) |
| `Hooks` | `/hooks` (`extensions/hooks/index.ts:641`) |
| `Review` | `/code-review` (`resources/commands/code-review.md`) |
| `Rename` | `/rename` (`extensions/ui/editor.ts:642`) |
| `New` | `/new` (`core/slash-commands.ts:39`) |
| `Archive` | `sem equivalente` |
| `Delete` | `sem equivalente` |
| `Resume` | `/resume` (`core/slash-commands.ts:41`) |
| `Fork` | `/fork` (`core/slash-commands.ts:34`) |
| `Worktree` | Flag `isolation: "worktree"` em `extensions/subagent/` |
| `App` | `sem equivalente` |
| `Init` | `/init` (`extensions/init/index.ts:83`) |
| `Compact` | `/compact` (`core/slash-commands.ts:40`) |
| `Config` | `/settings`, `/config-set` (`core/slash-commands.ts:20`, `claude-compat/commands/settings/config.ts:166`) |
| `Recap` | `/recap` determinístico 0-token (`claude-compat/commands/session/insights.ts:76`) |
| `Plan` | `/plan` (`extensions/plan-mode/index.ts:402`) |
| `Voice` | `sem equivalente` (no CLI; `apps/p2` tem plugin) |
| `Goal` | `/goal` (`extensions/goal/index.ts:576`) |
| `Agents` | `/agents`, `/tasks`, `/team` (`extensions/subagent/index.ts:651,665`) |
| `Side` | `/btw` (`extensions/ui/btw.ts:62`) |
| `Btw` | `/btw` (`extensions/ui/btw.ts:62`) |
| `Copy` | `/copy`, `/copy-pick` (`core/slash-commands.ts:29`, `claude-compat/commands/session/copy.ts:97`) |
| `Export` | `/export` (`core/slash-commands.ts:25`) |
| `Raw` | `/transcript` / `--mode json` (`claude-compat/interface/transcript.ts:65`) |
| `Tui` | `/tui-set` (`claude-compat/commands/settings/config.ts:174`) |
| `Diff` | `/diff` (`extensions/ui/diff.ts:350`) |
| `Mention` | `@file` e autocomplete nativo do editor |
| `Status` | `/session`, `/context`, `/insights` (`core/slash-commands.ts:31`, `context-usage/index.ts:39`) |
| `Daemon` | `sem equivalente` (`packages/durable`) |
| `Rc` | `sem equivalente` |
| `Warnings` | `/diagnostico` (`extensions/diagnostico/index.ts:718`) |
| `Cd` | `/cd` (`claude-compat/directory/index.ts:80`) |
| `Pwd` | `!pwd` / footer |
| `Usage` | `/context`, `/insights`, `/painel` |
| `DebugConfig` | `/diagnostico` (`extensions/diagnostico/index.ts:718`) |
| `Title` | `session-title` automático (`extensions/session-title/`) |
| `Statusline` | `/statusline` (`resources/commands/statusline.md` + `extensions/status-line/`) |
| `Theme` | `/theme-set`, `/color` (`claude-compat/commands/settings/config.ts:170`) |
| `Pets` | `sem equivalente` (recurso lúdico) |
| `Mcp` | `/mcp` (`extensions/mcp/index.ts:1261`) |
| `Apps` | `sem equivalente` (ChatGPT connectors) |
| `Plugins` | `/claude-plugins` (`extensions/skills-compat/plugins-command.ts:65`) |
| `Logout` | `/logout` (`core/slash-commands.ts:38`) |
| `Quit` | `/quit` (`core/slash-commands.ts:43`) |
| `Exit` | `/quit` |
| `Feedback` | `/bug` (`core/slash-commands.ts:28`) |
| `Rollout` | `/export` (`core/slash-commands.ts:25`) |
| `Ps` | `/ps` (`extensions/processos/index.ts:49`) |
| `Stop` | `/stop` (`claude-compat/commands/agents/listing.ts:88`) |
| `Clear` | `/new` (`core/slash-commands.ts:39`) |
| `TestApproval` | `sem equivalente` (comando debug Codex) |
| `MultiAgents` | `/agents` (`extensions/subagent/index.ts:665`) |
| `MemoryDrop` | `/memory` + remoção manual (`extensions/memory/index.ts:626`) |
| `MemoryUpdate` | `/memory` (`extensions/memory/index.ts:626`) |

## 6. App-Server JSON-RPC 2.0 (281 métodos)

Os **281** métodos declarados em `codex-rs/app-server-protocol/src/protocol/common.rs` agrupam-se nas famílias abaixo (listagem integral em [censo-flags.md](censo-flags.md)):

| Prefixo / Família | Qtd. métodos | Papel | Equivalente `nycode` |
|---|---:|---|---|
| `thread/*` | 94 | Ciclo de vida, histórico, goal, guardian, busca, revert e realtime da thread | `rpc-mode.ts` + `session-manager.ts` (sem realtime/guardian/search RPC) |
| `account/*` | 22 | Login, rate limits, usage, Bedrock/GCP/Gateway OAuth setup | `nycode auth` CLI / `model-runtime.ts` |
| `item/*` | 19 | Streaming granular de deltas e aprovações por item | `AgentSessionEvent` em `rpc-mode.ts` + `toJsonEvent` |
| `plugin/*` | 13 | Marketplace, instalação, compartilhamento e skills de plugins | `core/package-manager.ts` + `/claude-plugins` |
| `fs/*` | 10 | Filesystem watch/copy/read/write remoto via servidor | `packages/env/` (daemon SSH/remote-env) |
| `mcpServer/*` | 9 | OAuth login, elicitation, streams e tool calls MCP | `extensions/mcp/` (`mcp-servers.ts`) |
| `turn/*` | 9 | Start, steer, interrupt, deltas de diff/plan/settings | `rpc-types.ts` (`prompt`, `steer`, `follow_up`, `abort`) |
| `project/*` | 8 | CRUD de projetos multi-repositório | `project-trust.ts` (apenas confiança) |
| `remoteControl/*` | 8 | Pareamento e revogação de controle remoto | `sem equivalente` |
| `externalAgentConfig/*` | 6 | Detecção e importação de configurações de agentes externos | `extensions/claude-compat/` |
| `modelProvider/*` | 6 | Auth recovery e configuração dinâmica de providers | `model-runtime.ts` + `model-registry.ts` |
| `process/*` | 6 | Gerenciamento baixo nível de processos/PTY | `extensions/processos/` |
| `command/*` | 5 | Execução direta com delta PTY/resize/terminate | `extensions/run/` |
| `fuzzyFileSearch/*` | 5 | Sessões incrementais `nucleo` de busca de arquivo | `core/tools/find.ts` (`fd`) |
| `userVerification/*` | 5 | Família auxiliar / mock / experimental | `sem equivalente` |
| `app/*` | 4 | Catálogo de conectores/apps ChatGPT | `sem equivalente` |
| `config/*` | 4 | Leitura/escrita em batch de `config.toml` e reload MCP | `settings-manager.ts` |
| `model/*` | 4 | Família auxiliar / mock / experimental | `sem equivalente` |
| `skills/*` | 4 | Listagem, delta, config e roots extras de skills | `core/skills.ts` + `extensions/skills-compat/` |
| `threadSection/*` | 4 | Família auxiliar / mock / experimental | `sem equivalente` |
| `environment/*` | 3 | Multi-ambiente conectado (`exec-server`) | `packages/env/` |
| `marketplace/*` | 3 | Família auxiliar / mock / experimental | `sem equivalente` |
| `windowsSandbox/*` | 3 | Setup/readiness de sandbox Windows | `sem equivalente` |
| `accountSession/*` | 2 | Família auxiliar / mock / experimental | `sem equivalente` |
| `experimentalFeature/*` | 2 | Família auxiliar / mock / experimental | `sem equivalente` |
| `feedback/*` | 2 | Família auxiliar / mock / experimental | `sem equivalente` |
| `hook/*` | 2 | Família auxiliar / mock / experimental | `sem equivalente` |
| `memory/*` | 2 | Status e reset de memórias | `extensions/memory/` (`/memory`) |
| `attestation/*` | 1 | Família auxiliar / mock / experimental | `sem equivalente` |
| `autoApprovalReview/*` | 1 | Família auxiliar / mock / experimental | `sem equivalente` |
| `collaborationMode/*` | 1 | Família auxiliar / mock / experimental | `sem equivalente` |
| `configRequirements/*` | 1 | Família auxiliar / mock / experimental | `sem equivalente` |
| `hooks/*` | 1 | Listagem e eventos `hook/started`/`hook/completed` | `extensions/hooks/` |
| `mcpServerStatus/*` | 1 | Família auxiliar / mock / experimental | `sem equivalente` |
| `mock/*` | 1 | Família auxiliar / mock / experimental | `sem equivalente` |
| `permissionProfile/*` | 1 | Família auxiliar / mock / experimental | `sem equivalente` |
| `rawResponse/*` | 1 | Família auxiliar / mock / experimental | `sem equivalente` |
| `rawResponseItem/*` | 1 | Família auxiliar / mock / experimental | `sem equivalente` |
| `review/*` | 1 | Família auxiliar / mock / experimental | `sem equivalente` |
| `rollout/*` | 1 | Família auxiliar / mock / experimental | `sem equivalente` |
| `server/*` | 1 | Família auxiliar / mock / experimental | `sem equivalente` |
| `serverRequest/*` | 1 | Família auxiliar / mock / experimental | `sem equivalente` |
| `tmp/*` | 1 | Família auxiliar / mock / experimental | `sem equivalente` |
| `unknown/*` | 1 | Família auxiliar / mock / experimental | `sem equivalente` |
| `windows/*` | 1 | Família auxiliar / mock / experimental | `sem equivalente` |
