# Censo estático e medição de tokens (`dsh` vs `nycode`)

Levantamento exaustivo de ferramentas, serviços Cordis, presets/modos, seções de prompt, comandos CLI e variáveis de ambiente de `deepseek-harness` (`dsh-v0.2.3-alpha.2`) comparados aos baselines reais de `nycode` (`00fed2ae6150`), medidos com `tiktoken` (`o200k_base`).

## 1. Orçamento de prefixo no Turno 1 (`tiktoken` `o200k_base`)

| Configuração / Preset | Escopo / Plataforma | Tools declaradas | System prompt (toks) | Tool schemas (toks) | Runtime ctx + skill (toks) | Total Turno 1 (toks) |
|---|---|---:|---:|---:|---:|---:|
| `nycode` núcleo puro (`4` tools) | `core/system-prompt.ts` sem extensões (`cwd=/repo`) | 4 | 547 | 714 | 0 | **1261** |
| `nycode` modo headless padrão (`print`) | CLI `-p` + `headless-lean` (cwd limpo) | 8 | 2183 | 1619 | 0 | **3802** |
| `nycode` modo interativo padrão | CLI TUI + `builtInExtensions` (cwd limpo) | 18 | 2387 | 4121 | 0 | **6508** |
| `dsh` `sdk-minimal` (`bundle/sdk-minimal`) | Standalone PTY (`bash` + `read_image`) | 2 | 8 | 297 | 0 | **305** |
| `dsh` `minimal` (`web-app/presets/minimal`) | Linux PTY (`bash` + `read_image`, `complete: true`) | 2 | 8 | 297 | 0 | **305** |
| `dsh` `standard` (`web-app/presets/standard`) | Linux nativo (sem plan mode ativo) | 35 | 944 | 7474 | 258 | **8676** |
| `dsh` `standard` em `plan-mode` | Idem + `plan:policy`/`status` + `exit_plan_mode` sticky | 36 | 1394 | 7589 | 258 | **9241** |
| `dsh` `ptc` (`web-app/presets/ptc`) | Linux Programmatic Tool Calling (`33` APIs em `tools:sdk`) | 1 (`run_code`) | 6995 (`tools:sdk` = 6079) | 929 | 258 | **8182** |
| `dsh` `cordis` (`web-app/presets/cordis`) | Linux customização de plugins + `plugin_market` | 33 | 954 | 7279 | 258 | **8491** |

Observações da medição:

- Em `nycode` núcleo puro, habilitar `resources/instructions/contract.md` soma **250** tokens; `headless.md` pesa **171** tokens (`-79` tokens sobre `contract.md`), e `lite.md` pesa **168** tokens.
- No `nycode`, `headless-lean` reduz o prefixo em **-2.706 tokens (-41,6%)** no cenário de diretório limpo (`18 -> 8` tools declaradas) e adicionalmente extrai `<cwd>` + `<skills>` + `<docs>` em payloads Anthropic reais (`packages/coding-agent/src/extensions/headless-lean/index.ts:1-100`).
- No `dsh`, os presets `standard`, `ptc` e `cordis` declaram em bloco tools pesados desde o Turno 1 (`schedule_*`: 4 tools; `office_*`: 3 tools; `plugin_manager`: 591 toks), elevando o piso para **8,1k–8,7k tokens** contra **3,8k–6,5k tokens** no `nycode` (onde `codemode` e `tool_search` têm `exposure: "model-only"` e ficam inativos até serem necessários).

## 2. Ferramentas do `nycode` (`core` e `builtInExtensions`)

| Tool `nycode` | Exposição padrão | Interativo ativo | Headless ativo | Desc (toks) | Schema (toks) | Total declaração (toks) |
|---|---|---:|---:|---:|---:|---:|
| `read` | `direct` | sim | sim | 74 | 86 | **173** |
| `bash` | `direct` | sim | sim | 55 | 97 | **165** |
| `powershell` | `direct` | não | não | 56 | 97 | **167** |
| `edit` | `direct` | sim | sim | 62 | 197 | **272** |
| `write` | `direct` | sim | sim | 25 | 64 | **102** |
| `grep` | `direct` | não | não | 50 | 216 | **279** |
| `find` | `direct` | não | não | 42 | 110 | **166** |
| `ls` | `direct` | não | não | 38 | 59 | **111** |
| `codemode` | `model-only` | não | não | 341 | 35 | **399** |
| `tool_search` | `model-only` | não | não | 72 | 62 | **151** |
| `memory` | `direct` | sim | não | 93 | 121 | **227** |
| `monitor` | `direct` | sim | sim | 142 | 167 | **322** |
| `plan_mode_complete` | `direct` | sim | não | 79 | 34 | **130** |
| `question` | `direct` | sim | não | 73 | 447 | **538** |
| `task_stop` | `direct` | sim | sim | 12 | 55 | **81** |
| `run` | `direct` | sim | sim | 85 | 246 | **344** |
| `subagent` | `direct` | sim | não | 213 | 646 | **873** |
| `todo` | `direct` | sim | não | 106 | 169 | **288** |
| `web_fetch` | `direct` | sim | sim | 73 | 70 | **158** |
| `lsp_diagnostics` | `direct` | sim | não | 10 | 32 | **58** |
| `lsp_hover` | `direct` | sim | não | 10 | 77 | **102** |
| `lsp_definition` | `direct` | sim | não | 10 | 77 | **102** |
| `lsp_references` | `direct` | sim | não | 9 | 102 | **127** |
| `lsp_symbols` | `direct` | sim | não | 10 | 32 | **57** |
| `advisor` | `direct` | não | não | 34 | 42 | **90** |

## 3. Catálogo completo de `78` definições de tools no `dsh` (`76` nomes distintos)

Notas: `bash` e `pwsh` possuem cada um duas definições em pacotes separados (`dsh-tool-{bash,pwsh}` one-shot e `dsh-tool-{bash,pwsh}-persistent` PTY). O preset `minimal`/`sdk-minimal` sobrescreve a descrição de `dsh-tool-bash-persistent` para **138** tokens desc + **44** schema = **201** tokens totais; `subagent_fork` (`modelSelection: false`) pesa **317** tokens.

| # | Tool `dsh` | Pacote | Desc (toks) | Schema (toks) | Total declaração (toks) |
|---:|---|---|---:|---:|---:|
| 1 | `run_code` | `@deepseek-ai/dsh-tool-executor-ptc` | 669 | 244 | **927** |
| 2 | `workflow` | `@deepseek-ai/dsh-tool-workflow` | 373 | 424 | **819** |
| 3 | `str_replace_editor` | `@deepseek-ai/dsh-tool-str-replace-editor` | 249 | 504 | **774** |
| 4 | `schedule_create` | `@deepseek-ai/dsh-tool-schedule` | 71 | 550 | **635** |
| 5 | `plugin_manager` | `@deepseek-ai/dsh-plugin-manager` | 157 | 420 | **591** |
| 6 | `pwsh` | `@deepseek-ai/dsh-tool-pwsh` | 239 | 237 | **490** |
| 7 | `session_search` | `@deepseek-ai/dsh-tool-session-query` | 17 | 397 | **428** |
| 8 | `bash` | `@deepseek-ai/dsh-tool-bash` | 172 | 235 | **420** |
| 9 | `schedule_edit` | `@deepseek-ai/dsh-tool-schedule` | 22 | 317 | **353** |
| 10 | `ask_user_question` | `@deepseek-ai/dsh-tool-ask-user` | 55 | 281 | **351** |
| 11 | `plugin_market` | `@deepseek-ai/dsh-plugin-market` | 97 | 227 | **338** |
| 12 | `subagent` | `@deepseek-ai/dsh-tool-subagent` | 125 | 176 | **315** |
| 13 | `team_task_update` | `@deepseek-ai/dsh-tool-agent-team` | 20 | 265 | **300** |
| 14 | `subagent_oar` | `@deepseek-ai/dsh-experimental-tool-subagent-oar` | 84 | 185 | **285** |
| 15 | `session_event_search` | `@deepseek-ai/dsh-tool-session-query` | 18 | 234 | **267** |
| 16 | `update_goal` | `@deepseek-ai/dsh-tool-goal` | 5 | 218 | **237** |
| 17 | `present` | `@deepseek-ai/dsh-tool-present` | 101 | 122 | **236** |
| 18 | `stagehand_extract` | `@deepseek-ai/dsh-experimental-browser-use-stagehand-native` | 15 | 199 | **229** |
| 19 | `office_render` | `@deepseek-ai/dsh-tool-office` | 15 | 190 | **219** |
| 20 | `todo_write` | `@deepseek-ai/dsh-tool-todo` | 68 | 136 | **218** |
| 21 | `stagehand_tabs` | `@deepseek-ai/dsh-experimental-browser-use-stagehand-native` | 14 | 179 | **208** |
| 22 | `lsp` | `@deepseek-ai/dsh-tool-lsp` | 44 | 147 | **205** |
| 23 | `office_convert` | `@deepseek-ai/dsh-tool-office` | 20 | 171 | **205** |
| 24 | `enter_worktree` | `@deepseek-ai/dsh-experimental-tool-worktree` | 69 | 120 | **204** |
| 25 | `team_task_list` | `@deepseek-ai/dsh-tool-agent-team` | 19 | 170 | **204** |
| 26 | `list_session` | `@deepseek-ai/dsh-tool-session-list` | 43 | 141 | **198** |
| 27 | `terminal_send` | `@deepseek-ai/dsh-tool-terminal` | 45 | 136 | **195** |
| 28 | `cordis_inspect` | `@deepseek-ai/dsh-tool-cordis` | 51 | 123 | **190** |
| 29 | `list_agents` | `@deepseek-ai/dsh-tool-subagent-control` | 161 | 11 | **187** |
| 30 | `glob` | `@deepseek-ai/dsh-tool-fs-search` | 48 | 122 | **183** |
| 31 | `team_task_create` | `@deepseek-ai/dsh-tool-agent-team` | 13 | 150 | **178** |
| 32 | `edit` | `@deepseek-ai/dsh-tool-fs` | 13 | 150 | **176** |
| 33 | `grep` | `@deepseek-ai/dsh-tool-fs-search` | 40 | 121 | **174** |
| 34 | `ralph` | `@deepseek-ai/dsh-tool-ralph` | 89 | 69 | **172** |
| 35 | `apply_patch` | `@deepseek-ai/dsh-tool-fs` | 33 | 121 | **168** |
| 36 | `job_output` | `@deepseek-ai/dsh-tool-jobs` | 24 | 113 | **151** |
| 37 | `session_event_read` | `@deepseek-ai/dsh-tool-session-query` | 19 | 115 | **149** |
| 38 | `terminal_open` | `@deepseek-ai/dsh-tool-terminal` | 30 | 98 | **142** |
| 39 | `load_workspace_dependencies` | `@deepseek-ai/dsh-tool-workspace-dependencies` | 108 | 11 | **135** |
| 40 | `schedule_list` | `@deepseek-ai/dsh-tool-schedule` | 21 | 96 | **131** |
| 41 | `create_goal` | `@deepseek-ai/dsh-tool-goal` | 43 | 69 | **127** |
| 42 | `terminal_signal` | `@deepseek-ai/dsh-tool-terminal` | 15 | 97 | **126** |
| 43 | `read` | `@deepseek-ai/dsh-tool-fs` | 14 | 95 | **122** |
| 44 | `send_message` | `@deepseek-ai/dsh-tool-subagent-control` | 31 | 72 | **117** |
| 45 | `exit_plan_mode` | `@deepseek-ai/dsh-plan-mode` | 54 | 46 | **115** |
| 46 | `terminal_read` | `@deepseek-ai/dsh-tool-terminal` | 15 | 86 | **115** |
| 47 | `interrupt_agent` | `@deepseek-ai/dsh-tool-subagent-control` | 52 | 47 | **113** |
| 48 | `user_terminal_read` | `@deepseek-ai/dsh-terminal-panel` | 36 | 61 | **112** |
| 49 | `wait_agent` | `@deepseek-ai/dsh-tool-subagent-control` | 52 | 46 | **112** |
| 50 | `list_subagent_models` | `@deepseek-ai/dsh-tool-subagent` | 40 | 54 | **110** |
| 51 | `office_recalculate` | `@deepseek-ai/dsh-tool-office` | 18 | 76 | **109** |
| 52 | `list_workspace` | `@deepseek-ai/dsh-tool-session-list` | 25 | 67 | **106** |
| 53 | `write` | `@deepseek-ai/dsh-tool-fs` | 11 | 81 | **105** |
| 54 | `stagehand_observe` | `@deepseek-ai/dsh-experimental-browser-use-stagehand-native` | 13 | 73 | **102** |
| 55 | `session_send_message` | `@deepseek-ai/dsh-tool-session-control` | 26 | 60 | **101** |
| 56 | `stagehand_act` | `@deepseek-ai/dsh-experimental-browser-use-stagehand-native` | 13 | 73 | **101** |
| 57 | `stagehand_screenshot` | `@deepseek-ai/dsh-experimental-browser-use-stagehand-native` | 10 | 74 | **100** |
| 58 | `stagehand_navigate` | `@deepseek-ai/dsh-experimental-browser-use-stagehand-native` | 10 | 73 | **99** |
| 59 | `job_kill` | `@deepseek-ai/dsh-tool-jobs` | 8 | 72 | **95** |
| 60 | `session_event_trace` | `@deepseek-ai/dsh-tool-session-query` | 19 | 61 | **95** |
| 61 | `read_image` | `@deepseek-ai/dsh-tool-fs` | 36 | 44 | **94** |
| 62 | `read_mcp_resource` | `@deepseek-ai/dsh-mcp-resources` | 21 | 57 | **94** |
| 63 | `user_terminal_list` | `@deepseek-ai/dsh-terminal-panel` | 60 | 11 | **87** |
| 64 | `pwsh` | `@deepseek-ai/dsh-tool-pwsh-persistent` | 27 | 45 | **86** |
| 65 | `list_mcp_resource_templates` | `@deepseek-ai/dsh-mcp-resources` | 11 | 56 | **84** |
| 66 | `bash` | `@deepseek-ai/dsh-tool-bash-persistent` | 26 | 44 | **83** |
| 67 | `web_search` | `@deepseek-ai/dsh-tool-web` | 19 | 50 | **83** |
| 68 | `skill` | `@deepseek-ai/dsh-tool-skill` | 28 | 40 | **81** |
| 69 | `list_mcp_resources` | `@deepseek-ai/dsh-mcp-resources` | 8 | 56 | **80** |
| 70 | `web_fetch` | `@deepseek-ai/dsh-tool-web` | 17 | 38 | **69** |
| 71 | `session_trace` | `@deepseek-ai/dsh-tool-session-query` | 17 | 36 | **67** |
| 72 | `exit_worktree` | `@deepseek-ai/dsh-experimental-tool-worktree` | 39 | 11 | **66** |
| 73 | `team_task_get` | `@deepseek-ai/dsh-tool-agent-team` | 15 | 36 | **66** |
| 74 | `terminal_close` | `@deepseek-ai/dsh-tool-terminal` | 15 | 36 | **65** |
| 75 | `schedule_view` | `@deepseek-ai/dsh-tool-schedule` | 7 | 33 | **54** |
| 76 | `job_list` | `@deepseek-ai/dsh-tool-jobs` | 18 | 11 | **44** |
| 77 | `get_goal` | `@deepseek-ai/dsh-tool-goal` | 16 | 11 | **42** |
| 78 | `terminal_list` | `@deepseek-ai/dsh-tool-terminal` | 10 | 11 | **36** |

## 4. Seções de System Prompt (`44`) e Contextos Dinâmicos (`10`) no `dsh`

Resumo das seções estáticas de prompt e contextos de runtime medidos em `o200k_base`:

| Chave / Seção | Chars | Tokens (`o200k_base`) | Local / Papel |
|---|---:|---:|---|
| `context:file-reference` | 407 | **79** | Ver `packages/core/system-prompt/src/index.ts` / dono |
| `ctx:approval-policy:ask` | 177 | **31** | Ver `packages/core/system-prompt/src/index.ts` / dono |
| `ctx:sandbox-policy:read-only` | 285 | **53** | Ver `packages/core/system-prompt/src/index.ts` / dono |
| `ctx:sandbox-policy:workspace-write` | 205 | **39** | Ver `packages/core/system-prompt/src/index.ts` / dono |
| `ctx:time-context` | 50 | **22** | Ver `packages/core/system-prompt/src/index.ts` / dono |
| `ctx:working-directory` | 35 | **7** | Ver `packages/core/system-prompt/src/index.ts` / dono |
| `harness:identity` | 48 | **11** | Ver `packages/core/system-prompt/src/index.ts` / dono |
| `plan:status:active` | 55 | **11** | Ver `packages/core/system-prompt/src/index.ts` / dono |
| `plan:status:idle` | 66 | **13** | Ver `packages/core/system-prompt/src/index.ts` / dono |
| `team:policy` | 947 | **187** | Ver `packages/core/system-prompt/src/index.ts` / dono |
| `tool:bash` | 92 | **20** | Ver `packages/core/system-prompt/src/index.ts` / dono |
| `tool:cordis` | 0 | **0** | Ver `packages/core/system-prompt/src/index.ts` / dono |
| `tool:edit` | 83 | **17** | Ver `packages/core/system-prompt/src/index.ts` / dono |
| `tool:glob` | 71 | **16** | Ver `packages/core/system-prompt/src/index.ts` / dono |
| `tool:goal` | 457 | **88** | Ver `packages/core/system-prompt/src/index.ts` / dono |
| `tool:grep` | 129 | **28** | Ver `packages/core/system-prompt/src/index.ts` / dono |
| `tool:jobs` | 382 | **82** | Ver `packages/core/system-prompt/src/index.ts` / dono |
| `tool:lsp` | 325 | **60** | Ver `packages/core/system-prompt/src/index.ts` / dono |
| `tool:read` | 160 | **38** | Ver `packages/core/system-prompt/src/index.ts` / dono |
| `tool:schedule` | 149 | **24** | Ver `packages/core/system-prompt/src/index.ts` / dono |
| `tool:subagent` | 638 | **123** | Ver `packages/core/system-prompt/src/index.ts` / dono |
| `tool:web_fetch` | 150 | **32** | Ver `packages/core/system-prompt/src/index.ts` / dono |
| `tool:web_search` | 215 | **42** | Ver `packages/core/system-prompt/src/index.ts` / dono |
| `tool:workflow` | 325 | **63** | Ver `packages/core/system-prompt/src/index.ts` / dono |
| `tool:write` | 92 | **17** | Ver `packages/core/system-prompt/src/index.ts` / dono |
| `tools:ptc-only` | 157 | **34** | Ver `packages/core/system-prompt/src/index.ts` / dono |
| `ui:deliverable-file-references` | 1283 | **251** | Ver `packages/core/system-prompt/src/index.ts` / dono |
| `plan:policy` (preset `standard`) | - | **439** | `packages/bundle/web-app/presets/standard.patch.yml:60-71` |
| `<available_skills>` (`dsh-doc` no preset `standard`/`ptc`) | - | **145** | `packages/preset/agent-preset/skills/dsh-doc/SKILL.md:1-4` |

Registro completo das **44** chamadas `.section(` e **10** chamadas `.context(` no código do `dsh`:

| Tipo | Nome / Expressão | Arquivo fonte (`~/source/dsh-ref/`) |
|---|---|---|
| `.section()` | `'browser-use:stagehand-native'` | `packages/experimental/browser-use-stagehand-native/src/index.ts` |
| `.section()` | `'computer-use:cua-driver-native'` | `packages/experimental/computer-use-cua-driver-native/src/index.ts` |
| `.section()` | `'context:file-reference'` | `packages/context/file-reference-local/src/index.ts` |
| `.section()` | `'harness:identity'` | `packages/core/system-prompt/src/index.ts` |
| `.section()` | `'mcp-resource-servers'` | `packages/mcp/mcp-resources/src/index.ts` |
| `.section()` | `'plan:policy'` | `packages/plan/plan-mode/src/index.ts` |
| `.section()` | `'plan:status'` | `packages/plan/plan-mode/src/index.ts` |
| `.section()` | `'team:policy'` | `packages/team/tool-agent-team/src/index.ts` |
| `.section()` | `'timeline:planning'` | `packages/experimental/timeline/src/guidance.ts` |
| `.section()` | `'tool:apply_patch'` | `packages/fs/tool-fs/src/apply-patch.ts` |
| `.section()` | `'tool:bash'` | `packages/shell/tool-bash/src/index.ts` |
| `.section()` | `'tool:edit'` | `packages/fs/tool-fs/src/edit.ts` |
| `.section()` | `'tool:glob'` | `packages/fs/tool-fs-search/src/glob.ts` |
| `.section()` | `'tool:goal'` | `packages/goal/tool-goal/src/index.ts` |
| `.section()` | `'tool:grep'` | `packages/fs/tool-fs-search/src/grep.ts` |
| `.section()` | `'tool:jobs'` | `packages/jobs/tool-jobs/src/index.ts` |
| `.section()` | `'tool:lsp'` | `packages/lsp/tool-lsp/src/index.ts` |
| `.section()` | `'tool:pty'` | `packages/experimental/tool-terminal/src/index.ts` |
| `.section()` | `'tool:pty-panel'` | `packages/experimental/terminal-panel/src/index.ts` |
| `.section()` | `'tool:pwsh'` | `packages/shell/tool-pwsh/src/index.ts` |
| `.section()` | `'tool:ralph'` | `packages/experimental/tool-ralph/src/index.ts` |
| `.section()` | `'tool:read'` | `packages/fs/tool-fs/src/read.ts` |
| `.section()` | `'tool:schedule'` | `packages/schedule/tool-schedule/src/index.ts` |
| `.section()` | `'tool:session-query'` | `packages/experimental/tool-session-query/src/index.ts` |
| `.section()` | `'tool:web_fetch'` | `packages/web/tool-web/src/fetch.ts` |
| `.section()` | `'tool:web_search'` | `packages/web/tool-web/src/search.ts` |
| `.section()` | `'tool:write'` | `packages/fs/tool-fs/src/write.ts` |
| `.section()` | `'ui:deliverable-file-references'` | `packages/deliverables/deliverable-file-references/src/index.ts` |
| `.section()` | `HARNESS_SOURCE` | `packages/context/harness-dev-context/src/index.ts` |
| `.section()` | `PERSONA_PREFIX_SECTION` | `packages/core/system-prompt/src/index.ts` |
| `.section()` | `PERSONA_PREFIX_SECTION` | `packages/preset/persona/src/index.ts` |
| `.section()` | `PERSONA_PREFIX_SECTION` | `packages/subagent/subagent/src/child-agent.ts` |
| `.section()` | `PERSONA_SUFFIX_SECTION` | `packages/core/system-prompt/src/index.ts` |
| `.section()` | `PERSONA_SUFFIX_SECTION` | `packages/preset/persona/src/index.ts` |
| `.section()` | `SERVER_NAME` | `packages/connector/linear/src/index.ts` |
| `.section()` | `SERVER_NAME` | `packages/connector/notion/src/index.ts` |
| `.section()` | `SERVER_NAME` | `packages/connector/tencent-docs/src/index.ts` |
| `.section()` | `WEB_SURFACE` | `packages/context/harness-dev-context/src/index.ts` |
| `.section()` | ``mcp:${server}:tools`` | `packages/mcp/mcp-client/src/server-context.ts` |
| `.section()` | ``mcp:${server}`` | `packages/mcp/mcp-client/src/server-context.ts` |
| `.section()` | ``tool:${STRUCTURED_OUTPUT_TOOL}`` | `packages/subagent/subagent/src/structured.ts` |
| `.section()` | ``tool:${toolName}`` | `packages/subagent/tool-subagent/src/index.ts` |
| `.section()` | ``tool:${toolName}`` | `packages/workflow/tool-workflow/src/index.ts` |
| `.section()` | `section.name` | `packages/core/tools/src/index.ts` |
| `.context()` | `'approval:policy'` | `packages/interaction/user-approval/src/index.ts` |
| `.context()` | `'sandbox:policy'` | `packages/sandbox/sandbox-policy/src/index.ts` |
| `.context()` | `'subagent:delegation'` | `packages/subagent/subagent/src/child-agent.ts` |
| `.context()` | `'subagent:identity'` | `packages/subagent/tool-subagent-control/src/index.ts` |
| `.context()` | `'timeline:maintenance'` | `packages/experimental/timeline/src/reminders.ts` |
| `.context()` | `'timeline:state'` | `packages/experimental/timeline/src/guidance.ts` |
| `.context()` | `'working-directory:current'` | `packages/session/working-directory/src/index.ts` |
| `.context()` | `HARNESS_SOURCE` | `packages/context/harness-dev-context/src/index.ts` |
| `.context()` | `WEB_SURFACE` | `packages/context/harness-dev-context/src/index.ts` |
| `.context()` | ``tool:${toolName}:depth`` | `packages/subagent/tool-subagent/src/index.ts` |

## 5. Comandos CLI (`4`), variáveis `DSH_*` (`31`) e Serviços Cordis (`136`)

### Comandos slash de CLI no `dsh`

| Comando | Arquivo (`~/source/dsh-ref/`) |
|---|---|
| `/compact` | `packages/compaction/command-compact/src/index.ts` |
| `/export` | `packages/session-query/session-log-export/src/index.ts` |
| `/feedback` | `packages/feedback/command-feedback/src/index.ts` |
| `/goal` | `packages/goal/command-goal/src/index.ts` |

### Variáveis de ambiente `DSH_*` (`31` entradas)

| Variável | Observação |
|---|---|
| `DSH_BUNDLED_SKILL_DIR` | Configurada em runtime/boot/desktop do `dsh` |
| `DSH_CLIENT_BUILD_PROFILE` | Configurada em runtime/boot/desktop do `dsh` |
| `DSH_CLIENT_COMMIT_HASH` | Configurada em runtime/boot/desktop do `dsh` |
| `DSH_CLIENT_GIT_DIRTY` | Configurada em runtime/boot/desktop do `dsh` |
| `DSH_CLIENT_TITLE` | Configurada em runtime/boot/desktop do `dsh` |
| `DSH_CLIENT_VERSION` | Configurada em runtime/boot/desktop do `dsh` |
| `DSH_DESKTOP_DEV_APP` | Configurada em runtime/boot/desktop do `dsh` |
| `DSH_DESKTOP_DIAGNOSTIC_FILE` | Configurada em runtime/boot/desktop do `dsh` |
| `DSH_DESKTOP_DSH_DIR` | Configurada em runtime/boot/desktop do `dsh` |
| `DSH_DESKTOP_HOST_INSPECT_PORT` | Configurada em runtime/boot/desktop do `dsh` |
| `DSH_DESKTOP_IMAGE_READ_MAX_BYTES` | Configurada em runtime/boot/desktop do `dsh` |
| `DSH_DESKTOP_MANDATORY_UPDATE_CONFIG` | Configurada em runtime/boot/desktop do `dsh` |
| `DSH_DESKTOP_OPEN_DEVTOOLS` | Configurada em runtime/boot/desktop do `dsh` |
| `DSH_DESKTOP_PNPM_ENTRY` | Configurada em runtime/boot/desktop do `dsh` |
| `DSH_DESKTOP_PRIMARY_RUNTIME_DIR` | Configurada em runtime/boot/desktop do `dsh` |
| `DSH_DESKTOP_UPDATE_HTTP_IDLE_TIMEOUT_MS` | Configurada em runtime/boot/desktop do `dsh` |
| `DSH_DESKTOP_UPDATE_JOURNAL_DIR` | Configurada em runtime/boot/desktop do `dsh` |
| `DSH_DIALOG_TITLE` | Configurada em runtime/boot/desktop do `dsh` |
| `DSH_EXAMPLE_MODE` | Configurada em runtime/boot/desktop do `dsh` |
| `DSH_HOME` | Configurada em runtime/boot/desktop do `dsh` |
| `DSH_PRIMARY_RUNTIME` | Configurada em runtime/boot/desktop do `dsh` |
| `DSH_PTC_RUNTIME_NODE` | Configurada em runtime/boot/desktop do `dsh` |
| `DSH_SNAPSHOT_CHILD_FILES` | Configurada em runtime/boot/desktop do `dsh` |
| `DSH_SNAPSHOT_FILE` | Configurada em runtime/boot/desktop do `dsh` |
| `DSH_SNAPSHOT_OVERRIDE` | Configurada em runtime/boot/desktop do `dsh` |
| `DSH_SPEECH_TOKEN` | Configurada em runtime/boot/desktop do `dsh` |
| `DSH_SUBPROCESS_RUNNER` | Configurada em runtime/boot/desktop do `dsh` |
| `DSH_TELEMETRY_DISABLED` | Configurada em runtime/boot/desktop do `dsh` |
| `DSH_USER_AGENT_SUFFIX` | Configurada em runtime/boot/desktop do `dsh` |
| `DSH_WEB_FETCH_PROVIDER` | Configurada em runtime/boot/desktop do `dsh` |
| `DSH_WEB_SEARCH_PROVIDER` | Configurada em runtime/boot/desktop do `dsh` |

### Serviços Cordis registrados via `super(ctx, ...)` (`136` entradas)

| # | Serviço | Arquivo fonte (`~/source/dsh-ref/`) |
|---:|---|---|
| 1 | `actionCards` | `packages/interaction/action-cards/src/index.ts` |
| 2 | `agentLoop` | `packages/core/agent-loop/src/index.ts` |
| 3 | `agentPresets` | `packages/preset/agent-preset-registry/src/index.ts` |
| 4 | `agentTeams` | `packages/team/agent-team/src/index.ts` |
| 5 | `agents` | `packages/core/agent/src/index.ts` |
| 6 | `approval` | `packages/interaction/user-approval/src/index.ts` |
| 7 | `attachments` | `packages/attachment/attachment/src/index.ts` |
| 8 | `authorization` | `packages/credentials/authorization/src/index.ts` |
| 9 | `browserUse` | `packages/browser-use/browser-use/src/index.ts` |
| 10 | `claudeCodeMods` | `packages/experimental/claude-code-mods/src/index.ts` |
| 11 | `cliAccounts` | `packages/connector/cli-account/src/index.ts` |
| 12 | `clientModules` | `packages/client/modules/src/index.ts` |
| 13 | `commandUi` | `packages/client/ui-commands/src/client/service.ts` |
| 14 | `commands` | `packages/interaction/commands/src/index.ts` |
| 15 | `compaction` | `packages/compaction/compaction/src/index.ts` |
| 16 | `computerUse` | `packages/computer-use/computer-use/src/index.ts` |
| 17 | `configForms` | `packages/client/ui-settings/src/client/config-form.ts` |
| 18 | `connection` | `packages/client/connection/src/rpc-host.ts` |
| 19 | `connection.authentication` | `packages/client/connection/src/authentication.ts` |
| 20 | `connectorAccounts` | `packages/client/ui-connector-account/src/index.ts` |
| 21 | `conversation` | `packages/client/ui-conversation/src/client/service.ts` |
| 22 | `cordisInspect` | `packages/extensions/cordis-host-runner/src/inspect-registry.ts` |
| 23 | `cotTranslation` | `packages/experimental/client-ui-cot-translation/src/index.ts` |
| 24 | `credentials` | `packages/credentials/credentials/src/index.ts` |
| 25 | `credentialsController` | `packages/api/settings-controller/src/credentials.ts` |
| 26 | `cuaAccess` | `packages/experimental/cua/src/access.ts` |
| 27 | `deepseekAccount` | `packages/account/deepseek-account/src/index.ts` |
| 28 | `deepseekAuth` | `packages/account/deepseek-auth/src/index.ts` |
| 29 | `deepseekChatImport` | `packages/experimental/deepseek-chat-import/src/index.ts` |
| 30 | `deepseekLlmApiExtensions` | `packages/llm/deepseek-llm-api-extensions/src/index.ts` |
| 31 | `directoryPicker` | `packages/host/directory-picker/src/index.ts` |
| 32 | `directoryPickerController` | `packages/api/workspace-controller/src/directory-picker.ts` |
| 33 | `dynamicCordisRunner` | `packages/extensions/cordis-host-runner/src/index.ts` |
| 34 | `fileReferences` | `packages/context/file-reference/src/index.ts` |
| 35 | `fileUpload` | `packages/client/file-upload/src/client/runtime.ts` |
| 36 | `fileUploads` | `packages/client/file-upload/src/index.ts` |
| 37 | `forge` | `packages/experimental/forge/src/index.ts` |
| 38 | `forgePanel` | `packages/experimental/client-ui-forge/src/index.ts` |
| 39 | `forgeSession` | `packages/experimental/forge-session/src/index.ts` |
| 40 | `fs` | `packages/fs/fs/src/index.ts` |
| 41 | `goals` | `packages/goal/goal/src/index.ts` |
| 42 | `hmr` | `packages/boot/hmr/src/index.ts` |
| 43 | `inputTriggers` | `packages/client/ui-input-trigger/src/client/service.ts` |
| 44 | `jobController` | `packages/api/job-controller/src/index.ts` |
| 45 | `jobs` | `packages/api/job-controller/src/client/service.ts` |
| 46 | `jobs` | `packages/jobs/jobs/src/index.ts` |
| 47 | `liveshareShares` | `packages/experimental/liveshare/src/host/share-remote.ts` |
| 48 | `llm` | `packages/llm/llm/src/index.ts` |
| 49 | `lsp` | `packages/lsp/lsp/src/index.ts` |
| 50 | `mcpAccounts` | `packages/mcp/mcp-account/src/index.ts` |
| 51 | `mcpClientHost` | `packages/mcp/mcp-client/src/host.ts` |
| 52 | `mcpManager` | `packages/mcp/mcp-manager/src/index.ts` |
| 53 | `mcpResources` | `packages/mcp/mcp-resources/src/index.ts` |
| 54 | `messageFeedback` | `packages/feedback/message-feedback/src/index.ts` |
| 55 | `modelDirectories` | `packages/client/ui-model-selection/src/client/service.ts` |
| 56 | `officeKit` | `packages/document/office-kit/src/index.ts` |
| 57 | `otel` | `packages/telemetry/otel/src/index.ts` |
| 58 | `permissionPresets` | `packages/interaction/permission-presets/src/index.ts` |
| 59 | `planMode` | `packages/plan/plan-mode/src/index.ts` |
| 60 | `pluginEvents` | `packages/client/hmr/src/plugin-events.ts` |
| 61 | `pluginInventory` | `packages/host/plugin-inventory/src/index.ts` |
| 62 | `pluginManager` | `packages/boot/plugin-manager/src/index.ts` |
| 63 | `pluginMarket` | `packages/boot/plugin-market/src/index.ts` |
| 64 | `pluginPackages` | `packages/boot/app-boot/src/profile-resolution/service.ts` |
| 65 | `pluginRecommendations` | `packages/extensions/plugin-recommendations/src/index.ts` |
| 66 | `pluginRegistryProbe` | `packages/client/ui-plugin-manager/src/index.ts` |
| 67 | `productAnalytics` | `packages/client/product-analytics/src/client/index.ts` |
| 68 | `productAnalytics` | `packages/client/product-analytics/src/index.ts` |
| 69 | `productTelemetry` | `packages/host/product-telemetry-otel/src/index.ts` |
| 70 | `ptcRuntime` | `packages/ptc-runtime/ptc-runtime/src/index.ts` |
| 71 | `remote` | `packages/api/gateway/src/client/index.ts` |
| 72 | `remoteAccess` | `packages/api/remote-access/src/client/mount.ts` |
| 73 | `remoteAccess` | `packages/api/remote-access/src/index.ts` |
| 74 | `remoteAccess` | `packages/test-support/client-runtime/src/access.ts` |
| 75 | `remoteConnection` | `packages/client/remote-connection/src/index.ts` |
| 76 | `sandbox` | `packages/sandbox/sandbox/src/index.ts` |
| 77 | `sandboxPolicy` | `packages/sandbox/sandbox-policy/src/index.ts` |
| 78 | `schedule` | `packages/schedule/schedule/src/index.ts` |
| 79 | `scriptRealms` | `packages/client/script-realm/src/client/index.ts` |
| 80 | `sessionController` | `packages/api/session-controller/src/index.ts` |
| 81 | `sessionFeedback` | `packages/feedback/command-feedback/src/index.ts` |
| 82 | `sessionFileReferences` | `packages/api/session-controller/src/file-references.ts` |
| 83 | `sessionLogDeepSeek` | `packages/session/session-log-deepseek/src/index.ts` |
| 84 | `sessionPersistence` | `packages/session/session-persistence/src/index.ts` |
| 85 | `sessionProjectionCache` | `packages/session/session-projection-cache/src/index.ts` |
| 86 | `sessionProjections` | `packages/session/session-projection/src/index.ts` |
| 87 | `sessionQuery` | `packages/session-query/session-query/src/index.ts` |
| 88 | `sessionReferenceResolver` | `packages/context/session-reference/src/index.ts` |
| 89 | `sessionSkillCatalog` | `packages/api/session-controller/src/skill-catalog.ts` |
| 90 | `sessionStatus` | `packages/client/ui-session-status/src/index.ts` |
| 91 | `sessionTelemetry` | `packages/session/session-telemetry/src/index.ts` |
| 92 | `sessionTitle` | `packages/session/session-title/src/index.ts` |
| 93 | `sessionToolResults` | `packages/client/ui-trajectory/src/index.ts` |
| 94 | `sessions` | `packages/core/session/src/index.ts` |
| 95 | `settingsController` | `packages/api/settings-controller/src/index.ts` |
| 96 | `settingsSchema` | `packages/client/ui-settings/src/client/schema.ts` |
| 97 | `shell` | `packages/shell/shell/src/index.ts` |
| 98 | `shellEnv` | `packages/shell/shell-env/src/index.ts` |
| 99 | `shortcuts` | `packages/client/shortcuts/src/client/index.ts` |
| 100 | `skills` | `packages/skill/skill/src/index.ts` |
| 101 | `slots` | `packages/client/ui-renderer/src/client/registry.ts` |
| 102 | `speechController` | `packages/experimental/api-speech-to-text/src/index.ts` |
| 103 | `speechToText` | `packages/experimental/speech-to-text/src/index.ts` |
| 104 | `spillStore` | `packages/spill/spill/src/index.ts` |
| 105 | `ssh` | `packages/ssh/ssh/src/index.ts` |
| 106 | `storage` | `packages/storage/storage/src/index.ts` |
| 107 | `subagentModelSelection` | `packages/subagent/tool-subagent/src/model-selection-settings.ts` |
| 108 | `subagents` | `packages/subagent/subagent/src/index.ts` |
| 109 | `subprocess` | `packages/subprocess/subprocess/src/index.ts` |
| 110 | `systemPrompt` | `packages/core/system-prompt/src/index.ts` |
| 111 | `terminalController` | `packages/api/terminal-controller/src/index.ts` |
| 112 | `terminals` | `packages/terminal/terminal/src/index.ts` |
| 113 | `timeline` | `packages/experimental/timeline/src/storage.ts` |
| 114 | `tokenMeter` | `packages/llm/token-meter/src/index.ts` |
| 115 | `toolResultPruner` | `packages/compaction/compaction-tool-result-pruner/src/index.ts` |
| 116 | `tools` | `packages/core/tools/src/index.ts` |
| 117 | `translator` | `packages/experimental/translator/src/index.ts` |
| 118 | `typert` | `packages/typert/registry/src/service.ts` |
| 119 | `typertGateway` | `packages/api/gateway/src/index.ts` |
| 120 | `uiConversation` | `packages/client/ui-conversation/src/client/conversation/assembly.ts` |
| 121 | `uiSession` | `packages/client/ui-session/src/client/index.ts` |
| 122 | `uiSession.sessionStatus` | `packages/client/ui-session-status/src/client/status.ts` |
| 123 | `uiWorkspace` | `packages/client/ui-workspace/src/client/navigation.ts` |
| 124 | `upstreamSkills` | `packages/connector/upstream-skills/src/index.ts` |
| 125 | `userQuestions` | `packages/interaction/user-questions/src/index.ts` |
| 126 | `web` | `packages/web/web/src/index.ts` |
| 127 | `webServer` | `packages/host/webserver/src/index.ts` |
| 128 | `webTerminals` | `packages/api/terminal-controller/src/client/index.ts` |
| 129 | `webhookRuntime` | `packages/experimental/webhook/src/index.ts` |
| 130 | `workflowEngine` | `packages/workflow/workflow/src/index.ts` |
| 131 | `workingDirectory` | `packages/session/working-directory/src/index.ts` |
| 132 | `workspaceController` | `packages/api/workspace-controller/src/index.ts` |
| 133 | `workspaceFiles` | `packages/api/workspace-files/src/index.ts` |
| 134 | `workspaceRegistry` | `packages/workspace/workspace/src/index.ts` |
| 135 | `workspaces` | `packages/api/workspace-controller/src/client/service.ts` |
| 136 | `worktrees` | `packages/experimental/worktree/src/index.ts` |
