# Auditoria técnica: `oh-my-pi` (`omp v19.2.1`) vs `nycode`

Comparação integral, orientada a código citado (`arquivo:linha`) e medição de tokens (`tiktoken` `o200k_base`), entre `can1357/oh-my-pi` (`omp`, MIT) e `nycode`. **Auditoria apenas documental**: nenhum código, teste, prompt ou configuração do `nycode` foi alterado, e nenhum script ou binário do `omp` foi instalado, compilado ou executado.

## Pontos de referência (SHAs e ancestralidade Pi)

| Repositório / Marco | Tag / Ref | SHA | Commits desde o ancestral | Papel |
|---|---|---|---|---|
| **Ancestral comum Pi** (`merge-base`) | `v0.9.4` (2025-11-27) | `15d5120b6a5dc757355b99d20d8d1885143d0865` | 0 | Ponto exato de divergência |
| **oh-my-pi auditado** (read-only) | `v19.2.1` (2026-11-25) | `b55cd1bb664d8ab46ddc77f2a34eb47555dbf1ac` | +41.657 (`omp`) | Clone raso em `~/source/oh-my-pi-ref` |
| **Base do fork do `nycode`** | `earendil-works/pi` | `073b0bae8488ee20def26e873b77036dac4e9eea` | +7.624 (`Pi`) | Referência secundária (`/tmp/pi-base`) |
| **`nycode` auditado** | `origin/main` | `00fed2ae615016b328ebfb48bfaa49814bf1dbc4` | — | Worktree limpo `~/source/nycode-audit-ohmypi` |

*(Observação de método: `docs/ADR.md`, `docs/MEMORY.md` e `docs/PRD.md`, não rastreados em `origin/main`, foram lidos do checkout principal `~/source/nycode` e sinalizados explicitamente em toda citação.)*

## Medição comparativa de baseline (`o200k_base`)

Medições obtidas em `/tmp/tokvenv`: no `nycode` executando `buildSystemPrompt` e registro das ferramentas sobre `~/source/nycode` (com `git diff --quiet HEAD` nos arquivos core); no `omp` medindo os arquivos `.md` sem execução.

| Superfície | `omp` (`v19.2.1`) | `nycode` (`00fed2ae`) | Observação |
|---|---:|---:|---|
| System prompt base (padrão) | **~4.010 tok** (`5.039` bruto com tags `{{...}}`) | **539 tok** (`270` sem `<docs>`) | `omp`: `system-prompt.md` + `project-prompt.md` + `personalities/default.md`; `nycode`: `prompt4` (`preamble+tools+rules+docs+cwd`) |
| Contrato de instrução embutido | Embutido no `system-prompt.md` | **250 tok** (`contract.md`) / **171 tok** (`headless.md`) | `headless-lean` reduz ainda mais em `-p` |
| Tools essenciais padrão (quarteto) | **1.605 tok** só em `.md` (`read` 543 + `bash` 400 + `hashline` 563 + `write` 99) | **622 tok** completos (`name+description+schema`: `read` 153 + `bash` 145 + `edit` 239 + `write` 85) | `omp` inclui ainda `glob` 126 + `eval` **1.321** + `task` **1.238** + `wait` **245** (descrições: `4.535` tok antes dos schemas JSON) + `1.320` tok de `toolCommandDocs` (6 tools discoverable) |
| Prefixo `read` por linha | `+N#TAG` em toda linha lida (`~2–3` tok/linha) | Texto limpo sem numeração por hash | Em arquivo de 300 L, `omp` adiciona ~600–900 tok na leitura |
| Extensões TUI ativas no `nycode` | N/A | **2.591 tok** somados (`lsp` 351, `subagent` 1.200, `memory` 199, `web_fetch` 145, `question` 446, `todo` 250) | `codemode` (`383` tok) nasce desligado (`defaultActive: false`) |

## Resumo executivo e contagens (A / B / C)

- **Cobertura integral verificada (`100%`)**:
  - **Universo `omp` (`git ls-files`)**: **11.788** arquivos (**4.812.123** linhas totais). Todos os **11.484** arquivos legíveis (**3.756.519** linhas nos buckets 4..7) foram empacotados sem perda e lidos linha a linha do início ao EOF em **441/441** shards `omp` validados por prova cega (`tail` literal das últimas linhas de cada bundle). Os **304** arquivos de vendor (`182`), gerados/lockfiles (`31`) e binários/fontes/vocabulários (`91`) foram integralmente inventariados em [inventario.md](inventario.md).
  - **Universo `nycode` (`packages/*/src` + `packages/coding-agent/resources`)**: **1.675** arquivos (**1.674** arquivos de texto = **349.281** linhas lidas 100% em **40/40** shards validados + 1 arquivo binário), fechando **481/481** shards (`7.010` bundles `<= 740` linhas) e comparação bidirecional completa dos **84/84** subdiretórios de `omp:packages/coding-agent/src/*`, **17/17** de `omp:packages/ai/src/*`, **16/16** pacotes `packages/*`, **13/13** crates Rust, **12/12** pacotes e **58/58** extensões do `nycode` em [cobertura-100.md](cobertura-100.md).
- **Triagem dos achados**:
  - **Classe A — 10 achados** ([01](achados/01-isolar-cwd-e-contexto-do-prefixo-cacheado.md) a [07](achados/07-tabela-central-de-timeouts-e-reconexao-mcp.md), [26](achados/26-reparse-flags-extensao-limites-file-e-bugreport.md), [27](achados/27-separacao-413-payload-vs-overflow-e-resiliencia-stream-ai.md) e [28](achados/28-timeouts-limitados-em-extensoes-managed-timers-e-fail-closed-tool-call.md)): custo zero em tokens e sem alterar comportamento nominal do modelo. Destaques imediatos: isolar `<cwd>` do bloco em cache também em sessões TUI (`01`), congelar `<memory>` durante a sessão (`02`), `fitOutputTokensToContextWindow` (`03`), `ensureUniqueToolCallIds` + `Retry-After` (`06`), `pathScoped` (`04`), dedup/timeout de `AGENTS.md` (`05`), reconexão transparente MCP (`07`), re-parse de flags booleanas + teto `@file` + filtro `NYCODE_` no `bug-report` (`26`), separação `413 PayloadRejected` vs `ContextOverflow` + 200 SSE throttle + stream idle (`27`), e `emitToolCall` fail-closed/timeout + `ManagedTimers` + guarda de tecla em vôo (`28`).
  - **Classe B — 19 achados** ([08](achados/08-read-supersede-poda-leituras-repetidas.md) a [25](achados/25-rotacao-de-credenciais-multi-conta.md) e [29](achados/29-buffer-replay-seguro-e-sanitizacao-vazamento-thinking-dsml-harmony.md)): exigem eval pareado em `bench/` ou `packages/evals/` (sem reexecutar referências guardadas `cc-vanilla`/`pi-vanilla`). Maiores candidatos de ROI em **TS puro**: `read-supersede` sobre `ContextEditEntry` (`08`), minimizador de saída de `bash` gravando log bruto (`09`), `shake` + `SessionHandoff` quente vs `snapcompact` (`10`), `/btw` em cache + `prewarm` + `replay-policy` (`12`), `ToolCallLoopGuard` + `StreamingEditGuard` + `auto-generated` (`14`), LSP reativo por versão + `DiagnosticsLedger` (`11`), `outputSchema` + `isolated` por chamada em `subagent` (`15`), e buffer replay pré-delta + sanitização `<think>`/DSML/Harmony (`29`).
  - **Classe C — 32 rejeitados** ([rejeitados.md](rejeitados.md) `R01..R32`): TTSR com abort de stream (`R01`), `src/thread/` + `crates/iso` (`R02`), `eval` Python/Bun sem sandbox (`R03`), `/goal` sem juiz externo (`R04`), `mnemopi` ~34k LOC + `bun:sqlite`/ONNX (`R05`), `advisor` passivo por turno (`R06`), `auth-broker`/`gateway` + 27 scrapers `/usage` (`R07`), KDL v2 (`R08`), `modelRoles` (`R09`), 76 scrapers web (`R10`), `browser`/`computer`/desktop 159k LOC (`R11`), prompt monolítico Handlebars + `rewrite-system-prompt` (`R12`), `internal-urls` (`R13`), `jfind` (`R14`), `gh`/`glab`/`ssh`/`archive` (`R15`), reescrita JSX/TSP da TUI (`R16`), `auto-graph`, `blob-broker`, `autoresearch`, `ratchet`, `skillshare`, `stencil`, `spotlight`, `prompt-perturbation` e mídia (`R17..R32`).
- **Principais vantagens já existentes no `nycode` sobre o `omp`**: núcleo e prompt base **~7× menor** (`539` vs `~4.010` tok), `prefix-cache-1h` com TTL split `1h` só em `tools+system` e `5m` em mensagens, `codemode` em QuickJS-WASM capability-based + `@nycode/durable` (vs `eval` sem sandbox), `@nycode/chord` para coordenação distribuída, `@nycode/schema` sem `new Function` JIT, `web_fetch` com DNS pinning anti-SSRF (`resolveAndPin`), `/goal` com juiz externo independente `VERDICT_TOOL` + `completion-gate` determinístico, trava `/travar-modelos`, e compatibilidade limpa com **Node.js `>= 22.19.0`** sem Rust nightly/Bazel/`bun:sqlite`.

## Índice dos documentos

| Arquivo | Conteúdo |
|---|---|
| [cobertura-100.md](cobertura-100.md) | Reconciliação de 100% (`11.788` arquivos `omp` + `1.675` `nycode`), `84/84` subdirs `coding-agent`, `17/17` `ai`, `13/13` crates, `12/12` pacotes e `58/58` extensões `nycode` |
| [inventario.md](inventario.md) + `inventario/*.md` (45 grupos) | Mapeamento de 100% dos **11.788** arquivos rastreados do `omp` para equivalentes no `nycode` com nota por arquivo |
| [censo.md](censo.md) e [censo-flags.md](censo-flags.md) | Censo exaustivo de 32 tools, 56 CLIs, 89 slash commands, 20 internal-urls, 639 settings e flags `OMP_*`/`PI_*` |
| [matriz.md](matriz.md) | Matriz de comparação das áreas mínimas e net-novas em 9 colunas + linha de base de tokens |
| [backlog.md](backlog.md) | Backlog priorizado (**10 Classe A** primeiro, depois **19 Classe B** por benefício/custo) |
| [rejeitados.md](rejeitados.md) | Todos os **32** itens Classe C (`R01..R32`) com evidência e motivo objetivo |
| [fontes.md](fontes.md) | Obtenção, vetting `presente-de-grego`, ancestral Pi, buscas web, medições, provas em shards e `codegraph` |
| `achados/01` .. `achados/29` | Fichas individuais com código citado, diferença, custo, risco, licença, proposta, testes, eval, aceite e rollback |

## Cobertura de leitura e o que ficou fora de prosa LLM

Todos os **11.484** arquivos legíveis do `omp` (`3.756.519` linhas nos buckets `4_static_tables_schemas`, `5_omp_own_code_prompts_docs_cfg`, `6_ported_bash_vm_and_gnu_builtins` e `7_tests_fixtures_benches`) e os **1.674** arquivos de texto de `packages/*/src` e `packages/coding-agent/resources` do `nycode` (`349.281` linhas) foram empacotados sem perda (`BUNDLE_VERIFY_OK`) e lidos de linha 1 ao fim em **481/481** shards com prova cega verificada em disco. Ficaram fora apenas da leitura em prosa LLM (todos presentes e tipados no inventário em [inventario.md](inventario.md)):

- **`1_vendor` (182 arquivos, 129.851 linhas)**: código terceirizado em `crates/vendor/*` e caminhos `/vendor/`.
- **`2_generated_lock` (31 arquivos, 35.220 linhas)**: lockfiles (`Cargo.lock`, `bun.lock`, `flake.lock`, `MODULE.bazel.lock`) e artefatos `*.generated.*` / `*.gen.*` / `*.d.ts`.
- **`3_binary_fonts_vocabs` (91 arquivos, 890.533 linhas em vocabs/fontes, 76,39 MB)**: mídias/binários, fontes bitmap `.bdf` e caches de vocabulário de tokenizador (`crates/natives/tools/cache/*.tiktoken*`, `*.tokenizer.json`), todos registrados com SHA-256 e tamanho em bytes.
- **Execução dinâmica do `omp`**: nenhuma compilação Rust, build JS ou benchmark runtime do `omp` foi executado (conforme proibição estrita desta auditoria).
