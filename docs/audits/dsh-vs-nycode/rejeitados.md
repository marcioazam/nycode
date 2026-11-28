# Itens rejeitados — Classe C (`dsh` vs `nycode`)

Todos os **16** itens abaixo foram classificados na **Classe C** conforme a Fase 3 (pior no `dsh`, já coberto de forma igual ou superior no `nycode`, ou irrelevante/fora do escopo do produto definido em `docs/PRD.md`, lido em `/home/marcio/source/nycode/docs/PRD.md:29-45`).

| ID | Tema | Veredito resumido | Economia / Risco evitado |
|---|---|---|---|
| `C01` | LSP somente leitura sem diagnósticos pós-edição | `nycode` já possui sessão LSP persistente, diagnósticos automáticos pós-edit e Tree-sitter | Evita regressão de qualidade em edições |
| `C02` | `plan-mode` puramente textual sem trava dura | `nycode` já impõe bloqueio real de escrita, allowlist bash, `lintPlan` e `plan-gate` | Evita edições ilegais durante planejamento |
| `C03` | `tool-goal` auto-avaliado sem juiz externo | `nycode` possui juiz LLM independente (`goal-evaluator.ts`), check-in e `completion-gate` | Evita falsos positivos de conclusão |
| `C04` | `ptc-runtime` em `node:vm` vs QuickJS-WASI `codemode` | `nycode` já usa QuickJS-WASI + `lockdown()` + `@nycode/durable` e não infla o Turno 1 | Poupado de `6.079–7.008` toks no Turno 1 |
| `C05` | MCP `eager` por padrão e `load_tools` por servidor | `nycode` já usa `exposure: "codemode"` + `tool_search` BM25 + idle close `30s` | Evita dezenas de schemas carregados em bloco |
| `C06` | `web-fetch-http` sem SSRF check / DNS pinning | `nycode` já bloqueia RFC1918/ULA/metadata e faz DNS pinning por salto | Segurança de rede crítica preservada |
| `C07` | `todo_write` destrutivo com reset por turno | `nycode` tem ações incrementais com IDs, integração `plan-mode` e turn check | Menos tokens de saída e sem perda de checklist |
| `C08` | Tool dedicada `skill` + hooks Claude parciais (`7/14`) | `nycode` já lê skills via `read` (`0` schema extra), tem `context: fork` e `14` eventos de hook | Economia de schema + melhor paridade hooks |
| `C09` | Contexto de UI `time-context`, `tmux-context` e `workspace-changes` | Baixíssimo ROI no `nycode`; `date` ou `git status` pontuais custam `0` tokens fixos | Evita ruído contínuo na cauda da conversa |
| `C10` | `fs-observation-policy` obrigatório e `str_replace_editor` / `apply_patch` redundantes | `nycode` já tem `edit` multi-edit fuzzy (`272` toks) e trava opcional/regras sem burocracia extra | Poupa `774` toks (`str_replace_editor`) |
| `C11` | Auto-modificação de runtime (`plugin_manager` e `cordis-*-runner`) | Viola simplicidade de binário único (`docs/PRD.md:31-35`); `nycode` carrega extensões explícitas | Poupa `591` + `338` toks e superfície de risco |
| `C12` | `tool-ralph` e execução efêmera `workflow-ptc` | `workflow` consome `819` toks Turno 1; `tool-ralph` não tem juiz independente; `@nycode/durable` já cobre durabilidade | Poupa `819` toks e duplicação de orquestrador |
| `C13` | `schedule_*` sempre declaradas (`>1.240` toks) e motor RRULE | Fora do escopo de CLI/sessão local (`claude-compat/matrix.ts:252`); `@nycode/chord` já cobre rotinas de plataforma | Poupa `> 1.240` tokens em toda sessão |
| `C14` | Extensões cloud DeepSeek (conta, `dsh_session_log`, headers) | Paridade real de protocolo já existe no `nycode` (`reasoning_content` + `prompt_cache_hit_tokens`); resto é vendor lock-in | Evita acoplamento à plataforma proprietária |
| `C15` | Superfícies ACP, Python SDK, Desktop Electron, Web e `typert` | Fora de escopo de `nycode` CLI (`apps/p2`/`p3` já cobrem superfície web/remota separada) | Evita `> 200k` LOC de infra GUI no harness |
| `C16` | Domínios específicos (`office-kit` MPL-2.0, Browser/CUA, conectores IM, SSH) | Fora de escopo de `docs/PRD.md` e envolve dependências pesadas/MPL-2.0/binários externos | Mantém licença MIT limpa e binário enxuto |

---

## Detalhamento por item rejeitado

### C01: LSP somente leitura sem diagnósticos pós-edição

- **No `dsh`**: `packages/lsp/lsp/README.md:12` afirma explicitamente excluir diagnósticos e listas de símbolos; `packages/lsp/lsp-stdio/src/connection.ts:271-274` descarta notificações `publishDiagnostics`; `packages/lsp/tool-lsp/src/index.ts:109-123` expõe 1 tool (`lsp`) somente leitura em coordenadas 1-based (`goToImplementation` extra).
- **No `nycode`**: `packages/coding-agent/src/extensions/lsp/index.ts:656-763` mantém servidores LSP vivos (`didOpen`/`didChange`/`didSave`), armazena `PublishDiagnosticsNotification`, injeta até `10` erros no `tool_result` de `edit`/`write` (`extensions/lsp/post-edit.ts:17-23`), complementado por verificação sintática via `@vscode/tree-sitter-wasm` em `packages/coding-agent/src/extensions/syntax-check/index.ts:15-152`. Em headless `-p`, `headless-lean` desliga as `5` tools `lsp_*` (`446` toks combinados).
- **Motivo da rejeição**: o subsistema LSP do `nycode` é amplamente superior para assertividade de código (feedback imediato após edição). Se um dia faltar `goToImplementation`, trata-se de trivialidade de 15 linhas, não de portar `lsp-stdio` do `dsh`.

### C02: `plan-mode` puramente textual sem trava dura de edição

- **No `dsh`**: `packages/plan/plan-mode/README.md:32,81` assume explicitamente que `plan-mode` é apenas texto no prompt sem restringir tools de escrita nem `bash`.
- **No `nycode`**: `packages/coding-agent/src/extensions/plan-mode/index.ts:186-209,519-562` filtra tools declaradas, aplica hook `tool_call` bloqueando mutações e `bash` fora do allowlist (`utils.ts:76-253`), restringe escritas `.md` a `plansDir()`, valida plano via `lintPlan`, propaga `NYCODE_PLAN_READONLY="1"` para subagentes e verifica entrega via `packages/coding-agent/src/extensions/plan-gate/index.ts:39-194`.
- **Motivo da rejeição**: regredir para bloqueio puramente textual piora a segurança e a conformidade. (Apenas a ideia específica de estabilidade do catálogo de tools para provedores sem suporte a delta mid-convo foi separada e aproveitada no Achado `08`).

### C03: `tool-goal` auto-avaliado sem juiz externo

- **No `dsh`**: `packages/goal/tool-goal/src/index.ts:115-123,270-294` e `packages/goal/goal-round-driver/src/index.ts:177-208` deixam o próprio agente declarar `complete` ou `blocked` via CAS (após `3` rodadas bloqueadas, limite de `256`), embora tenham boa trava impedindo que o modelo retome goal pausado (`GOAL_TOOL_RESUME_PAUSED`) e validando entrada humana direta (`authority.ts`).
- **No `nycode`**: `packages/coding-agent/src/extensions/goal/index.ts:285-297,363-395` e `packages/coding-agent/src/extensions/_shared/goal/goal-evaluator.ts:28-67,170-173` rodam um avaliador LLM separado cético (`VERDICT_TOOL`) mais `extensions/completion-gate/index.ts:113-171` (exigindo verificação em `bash` ou `gate-runner` antes de assentar após edição) e `extensions/auto-resume/index.ts`.
- **Motivo da rejeição**: substituir juiz externo independente por auto-declaração do agente degrada assertividade em execuções longas.

### C04: Node `vm` `ptc-runtime` e `workflow-ptc` vs QuickJS-WASI `codemode` e `durable`

- **No `dsh`**: `packages/core/tool-executor-ptc/src/ts-types.ts:308-335` serializa `33` interfaces TypeScript no system prompt (`6.079` tokens na medição `o200k_base` em [censo.md](censo.md) + `927` tokens de `run_code`), executando código no filho Node (`ptc-runtime-node/src/worker.ts:298-339`) dentro de `node:vm` `scoped-repl` (`evaluators/scoped-repl-evaluator.ts:29-36` reconhecendo em comentário próprio que `codeGeneration: false` não é sandbox de segurança por si só, dependendo do sandbox externo do SO).
- **No `nycode`**: `packages/codemode/src/runtime/{host.ts:20-88,prelude-source.ts:34-139}` isola execução JS dentro de WebAssembly (`quickjs-wasi`) em `worker_threads` com `lockdown()`, interrupção via `SharedArrayBuffer`/`Atomics`, replay determinístico, persistência explícita (`codemode-store`), gramática restrita Lark (`extensions/codemode/source.ts`) e `exposure: "model-only"` (`399` tokens apenas quando habilitado — zero tokens no Turno 1 padrão). Além disso, scripts duráveis com replay já existem em `packages/durable/src/codemode/codemode.ts:1-163`.
- **Motivo da rejeição**: o modelo de isolamento por WASI + ativação sob demanda do `nycode` é mais seguro e muito mais econômico em tokens.

### C05: MCP `eager` por padrão e `load_tools` por servidor

- **No `dsh`**: `packages/mcp/mcp-manager/src/index.ts:73,106` adota `toolLoading: 'eager'` por padrão (injetando todos os schemas MCP no contexto) e, no modo `on-demand`, cria uma tool `mcp__<srv>__load_tools` distinta por servidor (`packages/mcp/mcp-client/src/tool-loading.ts:33-168`).
- **No `nycode`**: `packages/coding-agent/src/core/mcp-servers.ts:61-73,157-165` adota `exposure: "codemode"` por padrão (`0` schemas MCP declarados no Turno 1), indexa todas as tools restantes sob uma única `tool_search` BM25 (`extensions/tool-search/tool.ts:213-332`, `151` toks quando ativa), fecha servidores ociosos após `30 s` (`extensions/mcp/runtime/runtime.ts:61,429-436`) e sincroniza refresh OAuth entre processos com `proper-lockfile` (`extensions/mcp/oauth/oauth.ts:99-127`).
- **Motivo da rejeição**: a arquitetura MCP do `nycode` já resolve o problema de inflação de contexto e multi-processo com custo de tokens menor.

### C06: `web-fetch-http` sem bloqueio SSRF nem DNS pinning

- **No `dsh`**: `packages/web/web-fetch-http/src/policy.ts:36-67` e `README.md:12,64` não bloqueiam IPs privados, loopback (`127.0.0.1`), link-local (`169.254.169.254`) nem fazem pinning de DNS (o próprio código mantém comentário desatualizado na linha `45`).
- **No `nycode`**: `packages/coding-agent/src/extensions/web/index.ts` e `extensions/_shared/web/web-transport.ts` validam e bloqueiam endereços privados IPv4/IPv6/NAT64 antes de conectar e aplicam DNS pinning por salto para evitar DNS rebinding, além de cache LRU e síntese por pergunta. (`web_search` DuckDuckGo permanece desligado por padrão via `NYCODE_KEEP_WEB_SEARCH`).
- **Motivo da rejeição**: `dsh` apresenta vulnerabilidade SSRF documentada onde `nycode` já tem proteção sólida.

### C07: `todo_write` destrutivo com reset por turno

- **No `dsh`**: `packages/todo/tool-todo/src/index.ts:63-135,200` exige enviar a lista inteira (`todos[]`) a cada alteração sem IDs e limpa a projeção a cada `turn/start`.
- **No `nycode`**: `packages/coding-agent/src/extensions/todo/index.ts:45-107,486-497` (`288` toks; desligada em headless) usa ações diretas por `id` numérico, estados granulares, sincronismo com `plan-mode` e lembrete anti-abandono (`turn-check.ts`).
- **Motivo da rejeição**: pior ergonomia e maior consumo de tokens de saída no `dsh`.

### C08: Tool `skill` dedicada reinjetando corpo e hooks Claude parciais (`7/14`)

- **No `dsh`**: `packages/skill/tool-skill/src/index.ts:93-264` cria uma tool separada (`skill`, `114` toks) além de listener em `agent/pre-step`, enquanto `packages/experimental/hooks-claude-code` cobre apenas `7` eventos Claude apenas via `command`, com `transcript_path: ''` e sem `updatedInput`.
- **No `nycode`**: `packages/coding-agent/src/core/skills.ts:358-505` e `packages/coding-agent/src/extensions/skills-compat/index.ts:56-369` expõem `<available_skills>` lidas diretamente por `read` (zero tool adicional no núcleo), suportam `context: fork` via subagente e `packages/coding-agent/src/extensions/hooks/index.ts` implementa `14` eventos Claude com `command`/`http`/`prompt`/`agent`, `updatedInput` e `PreCompact` cancelável.
- **Motivo da rejeição**: já integralmente superado pelo `nycode`.

### C09: `time-context`, `tmux-context` e `workspace-changes` na cauda da conversa

- **No `dsh`**: `packages/context/time-context/src/index.ts:209-242` injeta timestamp UTC periodicamente; `packages/context/tmux-context/src/index.ts:235-270` injeta localização de painel no step 1; `packages/deliverables/workspace-changes/src/index.ts:52-64` varre até `500` arquivos modificados no workspace.
- **No `nycode`**: quando o modelo precisa de hora exata ou diff final do repositório, executa `date` / `git status` / `git diff` via `bash` sem injetar metadados especulativos na conversa padrão. (`harness-dev-context` do `dsh` é específico ao desenvolvimento do próprio `dsh`, análogo ao `docs-pointer` do `nycode` em `extensions/docs-pointer/index.ts`).
- **Motivo da rejeição**: ruído de contexto e complexidade sem ganho claro em assertividade.

### C10: `fs-observation-policy` obrigatório e tools de edição redundantes (`str_replace_editor`, `apply_patch`)

- **No `dsh`**: `packages/fs/fs-observation-policy/src/index.ts:21-60` bloqueia `write`/`edit` em arquivos não lidos previamente na sessão via `WeakMap`; `packages/fs/tool-str-replace-editor/src/index.ts:432-537` (`774` tokens!) replica funções já cobertas por `read`/`write`/`edit`; `tool-fs` tem também `apply_patch` (que exige `edit` + `apply_patch` em paralelo ou alternado).
- **No `nycode`**: `packages/coding-agent/src/core/tools/edit.ts` (`272` toks) já consolida multi-edição (`edits[]`), match fuzzy Unicode (`edit-diff.ts`), preservação de CRLF e orientação de leitura no próprio prompt de `edit` sem impor barreira dura em arquivos novos/refatorações automáticas nem inflar schemas em +`774` tokens.
- **Motivo da rejeição**: inflação de schema (`str_replace_editor`) e burocracia adicional (`fs-observation-policy`) com risco de atrapalhar reescritas válidas sem ganho comprovado sobre `edit` do `nycode`.

### C11: Auto-modificação de runtime (`plugin_manager` e `cordis-*-runner`)

- **No `dsh`**: `packages/boot/plugin-manager/src/tools.ts` (`plugin_manager`: `591` toks) e `plugin-market/src/tools.ts` (`338` toks), somados a `cordis_inspect` (`226` toks) e `cordis-host-runner`/`cordis-client-runner`, deixam o próprio agente instalar pacotes npm/bundles e rodar plugins dinâmicos em runtime.
- **No `nycode`**: `docs/PRD.md:31-35` (lido em `/home/marcio/source/nycode/docs/PRD.md`) define arquitetura de extensões explícitas sem loja interna nem auto-mutação de plugins em execução, evitando `+1.155` tokens de schemas administrativos e superfície complexa de aprovações de scripts npm pelo modelo.
- **Motivo da rejeição**: fora do escopo e modelo de segurança/simplicidade do `nycode`.

### C12: `tool-ralph` e execução efêmera `workflow-ptc`

- **No `dsh`**: `packages/experimental/tool-ralph/src/index.ts:36-41,91-103` reconhece explicitamente que conclusão/bloqueio dependem apenas do relato do worker sem avaliação independente; `packages/workflow/tool-workflow/src/index.ts:328-353` (`819` tokens declarados no Turno 1 dos presets `standard`/`cordis`) roda scripts JS em `node:vm` sem durabilidade após queda de processo.
- **No `nycode`**: `packages/coding-agent/src/extensions/claude-compat/matrix.ts:337` mantém `workflows` fora do catálogo padrão do CLI (`0` tokens no Turno 1), enquanto orquestração durável de longa vida reside separadamente em `@nycode/durable` (`packages/durable/src/harness/` + `durable/src/codemode/codemode.ts`).
- **Motivo da rejeição**: pior custo x benefício (`+819` toks no Turno 1 e sem verificador independente em `ralph`).

### C13: Tools `schedule_*` sempre declaradas (`> 1.240` tokens) e motor RRULE

- **No `dsh`**: `packages/schedule/tool-schedule/src/index.ts:198-265` injeta `4` tools (`schedule_create` = `635` toks, `schedule_edit` = `353` toks, `schedule_list`, `schedule_view`) desde o Turno 1 em `standard`, `ptc` e `cordis`, exigindo parser completo RFC 5545 + calendário gregoriano/DST (`packages/util/time/src/rrule.ts:18-82`).
- **No `nycode`**: `packages/coding-agent/src/extensions/claude-compat/matrix.ts:252` mantém `schedule`/`routines` fora do CLI de sessão única; para jobs recorrentes de plataforma já existe `packages/chord/src/host/routines.ts` / `jobs/`.
- **Motivo da rejeição**: pagar > `1.240` tokens fixos no Turno 1 de toda sessão de código por agendamento de cron viola frontalmente a disciplina de custo x benefício.

### C14: Extensões proprietárias da API DeepSeek (`deepseek-account`, `dsh_session_log`, headers)

- **No `dsh`**: `packages/account/deepseek-account`, `deepseek-auth`, `deepseek-llm-api-extensions`, `plugin-package-inventory-deepseek` e `session-log-deepseek` integram autenticação de conta proprietária `platform.deepseek.com` e enviam incrementos do log da sessão (`8 MiB`) para endpoints da DeepSeek. Enquanto isso, as otimizações reais de **protocolo de modelo** que importam (preservar `thinking` / `reasoning_content` entre turnos e ler métricas de cache) ficam em `llm-deepseek/src/serialize.ts:27-40,118-129`.
- **No `nycode`**: já possui **paridade real** nas otimizações de protocolo para modelos DeepSeek no caminho `openai-completions`: `packages/ai/src/api/openai-completions.ts:1382-1388` preenche `reasoning_content = ""` quando `compat.requiresReasoningContentOnAssistantMessages` é true (definido em `packages/ai/catalog/families/deepseek.ts` e `catalog/providers/deepseek.ts` para `deepseek-flash` e `deepseek-v4-pro`), e `packages/ai/src/api/openai-completions.ts:1530-1545` lê `rawUsage.prompt_cache_hit_tokens` em `cacheRead` sem descontar errado.
- **Motivo da rejeição**: `nycode` já implementa corretamente o essencial de protocolo DeepSeek mantendo autonomia multi-provedor; conta proprietária e upload automático `dsh_session_log` contrariam privacidade e neutralidade do harness.

### C15: Superfícies ACP, SDK JSON-RPC, Python SDK, Desktop Electron, Web UI e `typert`

- **No `dsh`**: `apps/{desktop,desktop-host,desktop-publisher,web}`, `packages/client/*` (~192k LOC), `packages/api/*` (~24,9k LOC), `packages/typert/*` (`10.886` LOC), `packages/acp/acp` (`1.786` LOC), `packages/sdk/*` e `python/sdk*` constroem um aplicativo desktop Electron + cliente web completo + protocolo ACP + cliente Python com binário SEA.
- **No `nycode`**: escopo intencionalmente focado em CLI/TUI/RPC leve (`packages/coding-agent/src/modes/rpc/rpc-mode.ts:96-338`, `core/sdk.ts:205-496`), mantendo produto web/serviço separado em `apps/p2`/`apps/p3`.
- **Motivo da rejeição**: fora de escopo do `docs/PRD.md`; custo de manutenção ordens de grandeza maior que o próprio harness core.

### C16: Extensões de domínio específico (`office-kit`, Browser/CUA, conectores IM, SSH e `experimental`)

- **No `dsh`**: `packages/document/office-kit` + `tool-office` (depende de LibreOffice e `THIRD_PARTY_NOTICES.md` aponta **MPL-2.0** em `@deepseek-ai/libreoffice-kit`), `packages/browser-use/*`, `packages/computer-use/*`, `packages/connector/{feishu,dingtalk,wecom,linear,notion,tencent-*}`, `packages/ssh/*` e 59 diretórios em `packages/experimental/*` (`forge`, `liveshare`, `inspector`, `speech-to-text`, `cua-*`).
- **No `nycode`**: nenhum desses domínios pertence ao núcleo de coding agent (`docs/PRD.md:39-45`), e todos trazem schemas pesados (`office_*` 3 tools, `stagehand_*` 6 tools, `tool-present`), dependências nativas pesadas ou risco de licença não-MIT (`MPL-2.0` / `@anthropic-ai/claude-agent-sdk` proprietário).
- **Motivo da rejeição**: irrelevante para coding CLI, risco de bloat e implicações de licenciamento/dependências fora da base MIT enxuta do `nycode`.
