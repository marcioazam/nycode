# Censo de superfícies de feature (todos os arquivos)

Resposta à pergunta "a codebase inteira foi olhada?". O inventário (`inventario.md`) dá dono a cada arquivo pelo
caminho; não prova leitura. Este censo fecha a lacuna de outra forma: um extrator lê **todos** os arquivos de código e
lista cada ponto onde o OpenCode registra uma feature; cada item é então reconciliado com a matriz, os achados ou os
rejeitados.

## Método

- Script: `/tmp/oc-census.py` (fora do repo; reproduzível). Percorre `git ls-files` do clone em `fc31a48` com o mesmo
  filtro de extensões do inventário.
- Resultado da execução: `files=8809 read=76.7MB errors=0`.
- Padrões extraídos por arquivo: `id: "opencode.*"` (plugins), `editor.add({ name })` (tools), `editor.namespace`,
  `.hook("...")` (hooks de sessão/tool), mensagens sintéticas, `HttpApiEndpoint.*("...")` (rotas HTTP),
  `OPENCODE_*` (flags).
- Item "coberto" = id, nome ou arquivo já citado nos docs desta auditoria (antes deste censo).

| Superfície | Total | Já nos docs | Triados aqui |
|---|---:|---:|---:|
| Plugins `opencode.*` | 113 | 32 | 81 |
| Tools | 64 | 27 | 37 |
| Namespaces de tool | 10 | 6 | 4 |
| Hooks | 12 | 10 | 2 |
| Mensagens sintéticas | 1 | 1 | 0 |
| Rotas HTTP | 122 | 29 | 93 |
| Flags `OPENCODE_*` | 161 | n/a | não triadas (configuração) |

## Profundidade de leitura (honesta)

| Nível | O quê |
|---|---|
| Lido linha a linha | arquivos citados com linha em `matriz.md` e `achados/` (215 caminhos distintos antes deste censo) e os 18 lidos abaixo |
| Lido pelo extrator | os 8809 arquivos (76,7 MB): toda superfície registrada acima |
| Não lido por humano/modelo | corpo de `cli-rs` (1360), `app` (1291), `gui-plugins` (1264), `desktop` (260), handlers do `server`, maior parte da `tui`; ver `fontes.md`, lacunas |

O extrator garante que nenhuma feature **registrada** ficou fora da triagem. Não garante leitura de lógica interna de
arquivos sem registro (helpers, UI); esses ficam na tabela de lacunas.

## Triagem dos plugins e tools não cobertos

Lidos por inteiro nesta etapa (OC) e conferidos no nycode (CA = `packages/coding-agent/src`).

| OC (arquivo:linha) | O que faz | nycode (arquivo:linha) | Veredito |
|---|---|---|---|
| `core/src/plugin/command.ts:55-83` | prompts MCP viram `/servidor:prompt` | ausente; `packages/mcp/src/client.ts:302` só resources | **A, achado 19** |
| `core/src/plugin/identity.ts:11-29` | "# Your Model" no sistema, 35 tok | ausente em `CA/core/system-prompt.ts` | **B, achado 20** |
| `core/src/plugin/command.ts:30,43` | `/init`, `/review` | `CA/extensions/init/index.ts:83`; `packages/coding-agent/resources/commands/code-review.md` | C, R27 |
| `tui/src/feature-plugins/prompt/btw.tsx:53-70` | `/btw` sem gravar | `CA/extensions/ui/btw.ts:62` | C, R27 |
| `core/src/plugin/plan.ts:5-40` | agente Plan, nota ao sair, erro reescrito | `CA/extensions/plan-mode/index.ts:275-277` (`PLAN_ENDED_NOTE`); tools removidas em vez de negadas | C, R27 |
| `core/src/tool/plugin/session-interrupt.ts:30-37` | interrupção em cascata (filhos e jobs) | `CA/extensions/subagent/fleet/source.ts:59-76` (SIGTERM no grupo); `CA/modes/print-mode.ts:55-68` (`killTrackedDetachedChildren` no filho) | C, R27 |
| `core/src/tool/plugin/mcp-resource.ts:21-58` | `list_mcp_resources`, `read_mcp_resource` | `CA/core/mcp-servers.ts:37`; `CA/extensions/mcp/tools.ts:51` | C, R27 |
| `core/src/config/plugin/instruction.ts:24-108` | descoberta de AGENTS.md/CLAUDE.md com subida de diretórios | `CA/core/resource-loader.ts:211` | C, R27 |
| `core/src/config/plugin/compatibility.ts:3-40` | recarrega skills de `.claude/` | `CA/extensions/claude-compat/`, `CA/extensions/skills-compat/` | C, R27 |
| `core/src/tool/plugin/cd.ts:26-87` | tool `cd` do modelo, com máquinas remotas | `CA/extensions/claude-compat/directory/index.ts:80` (`/cd`); `cd` no bash | C, R28 |
| `core/src/tool/plugin/glob.ts:47`, `grep.ts:65` | glob, grep | `CA/core/tools/find.ts:77`, `CA/core/tools/grep.ts:88` | C, R27 (matriz, linha de tools) |
| `core/src/tool/plugin/question.ts:49`, `todo.ts:45` | question, todo | `CA/extensions/question/index.ts:20`; `CA/extensions/todo/index.ts:486` | C, R27 |
| `core/src/tool/plugin/webfetch.ts:127`, `websearch.ts:39`; `core/src/plugin/websearch/{exa,firecrawl,parallel,tavily,tinyfish}.ts` | fetch e busca com 5 backends | `CA/extensions/web/index.ts:472` (`web_fetch`); busca via MCP diferido | C, R29 |
| `core/src/plugin/home-memory.ts:55-120` | memória em `~/` com manutenção diária por LLM | tool `memory` do harness; `knowledge-curator` | C, R30 |
| `core/src/plugin/mcp-skill.ts:14-99` | skills servidas por MCP (`skills/get`) | `packages/mcp/src/client.ts` sem esse método | C, R31 |
| `core/src/plugin/provider/opencode-watches.ts:13-26`, `core/src/tool/plugin/artifact.ts:13-35`, `core/src/usage-limits.ts:23-155` | watches, artifacts, orçamento: serviços do OpenCode Console | sem equivalente (serviço proprietário) | C, R32 |
| `core/src/tool/plugin/mcp-events.ts:35` | eventos MCP como gatilho de automação | sem equivalente | C, R06 |
| `core/src/tool/plugin/machine.ts:39` | `forward`, `copy`, `unforward` entre máquinas | sem equivalente | C, R21 |
| `core/src/wellknown/plugin.ts:3-25` | login via `.well-known` | sem equivalente | C, R33 |
| `core/src/plugin/vcs/hg.ts:26` | Mercurial | só git | C, R34 |
| `core/src/plugin/provider/*.ts` (31 plugins) | quirks por provider | `packages/ai/catalog/providers/` | C, R35 |
| `core/src/plugin/provider/openai-context-caps.ts:8-50` | janela 272k/500k no plano ChatGPT | `packages/ai/catalog/providers/openai-codex.ts:18-21` (mesmas janelas) | C, R35 |
| `core/src/plugin/provider/prompt-cache-key.ts:6-35` | `prompt_cache_key` em 12 providers de catálogo | `packages/ai/src/api/openai-codex-responses.ts:607` | C, R35 |
| `tui/src/feature-plugins/system/notifications.ts` | notificações | `CA/extensions/notify/index.ts:198` | C, R27 |
| `cli-rs/crates/tui/plugins/{home_footer,prompt_footer,sidebar_*}.rs`, `cli-rs/crates/latex/src/lib.rs`, `latex/src/plugin.ts`, `merman/src/plugin.ts` | TUI em Rust, LaTeX, Mermaid | TUI própria (`packages/tui`) | C, R36 |
| `simulation/src/backend/simulated-provider.ts`, `tui/src/app.tsx` (`opencode.storybook`) | provider simulado, storybook | faux provider em `packages/coding-agent/test/suite/harness.ts` | C, R36 |
| `core/src/config/plugin/{command,formatter,image,mcp,websearch,location-watcher}.ts` | encanamento de config | `CA/core/settings-manager.ts` | C, R36 |
| 26 tools de teste (`greet`, `healthy`, `phone_type`...) em `core/test/**`, `server/test/**`, `sdk/test/**` | fixtures | n/a | fora de escopo |
| hook `http.response` (`core/src/plugin/provider/opencode.ts`), `create.before` (teste) | Console / fixture | n/a | C, R32 |

## Rotas HTTP (93 não citadas), por grupo

nycode não tem servidor HTTP; o equivalente é o modo RPC (`CA/modes/rpc/rpc-types.ts:20-74`). Matriz, linha "server e
API".

| Grupo de rotas OC | Equivalente RPC nycode (`rpc-types.ts:linha`) | Veredito |
|---|---|---|
| `sessionPrompt`, `sessionInterrupt`, `sessionCompact`, `sessionFork`, `sessionSwitchModel`, `sessionRename`, `sessionGet`, `messageList` | `prompt` :22, `abort` :25, `compact` :47, `fork` :62, `set_model` :33, `set_session_name` :68, `get_state` :30, `get_messages` :71 | coberto |
| `sessionInbox*` (fila) | `follow_up` :24, `steer` :23, `clear_queue` :26 | coberto |
| `sessionRevertStage/Commit/Clear` | sem RPC | achado 02 (snapshots) |
| `sessionForm*`, `formRequests`, `sessionPermission*` | `extension_ui_request` :253 / `extension_ui_response` :295 | coberto |
| `persistentPty*`, `shellOutput`, `shellRemove`, `sessionShell` | `bash` :55, `abort_bash` :56; tool `run` | C, R36 |
| `fs*`, `vcs*`, `worktree*`, `project*`, `location` | sem RPC (cliente remoto/desktop) | C, R21 |
| `integration*`, `credential*`, `mcpConnect/Disconnect`, `usageLimits`, `websearchProviders`, `stats`, `experimentalStats` | sem RPC; `/login`, `/mcp` no TUI | C, R32/R36 |
| `events`, `subscribe`, `health`, `rpcCall`, `jobList`, `sessionWait`, `sessionBackground`, `sessionActive` | eventos JSONL do modo RPC; `/tasks` | coberto / C, R36 |
| `annotated`, `first`, `second`, `spoofed`, `aborted`, `configure` | nomes de teste | fora de escopo |
