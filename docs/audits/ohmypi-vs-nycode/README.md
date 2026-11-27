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

- **Universo inventariado (`100%`)**: **10.247** arquivos de código/prompt no `omp` (`5.587` código, `415` prompts, `4.076` testes, `21` gerados, `148` vendor), com **8.318** mapeados a donos no `nycode` e **1.929** `sem equivalente`. Censo completo extraiu **32** tools (`29` builtin + `3` hidden), **56** subcomandos CLI, **89** slash commands built-in, **20** esquemas `internal-urls`, **639** chaves `register({ id })`, **189** variáveis `OMP_*` e **280** `PI_*`.
- **Triagem dos achados**:
  - **Classe A — 7 achados** ([01](achados/01-isolar-cwd-e-contexto-do-prefixo-cacheado.md) a [07](achados/07-tabela-central-de-timeouts-e-reconexao-mcp.md)): custo zero em tokens e sem alterar comportamento nominal do modelo. Destaques imediatos: isolar `<cwd>` do bloco em cache também em sessões TUI (`01`), congelar `<memory>` durante a sessão (`02`), `fitOutputTokensToContextWindow` (`03`), `ensureUniqueToolCallIds` + `Retry-After` (`06`), `pathScoped` (`04`), dedup/timeout de `AGENTS.md` (`05`) e reconexão transparente MCP (`07`).
  - **Classe B — 18 achados** ([08](achados/08-read-supersede-poda-leituras-repetidas.md) a [25](achados/25-rotacao-de-credenciais-multi-conta.md)): exigem eval pareado em `bench/` ou `packages/evals/` (sem reexecutar referências guardadas `cc-vanilla`/`pi-vanilla`). Maiores candidatos de ROI em **TS puro**: `read-supersede` sobre `ContextEditEntry` (`08`), minimizador de saída de `bash` gravando log bruto (`09`), `shake` + `SessionHandoff` quente vs `snapcompact` (`10`), `/btw` em cache + `prewarm` + `replay-policy` (`12`), `ToolCallLoopGuard` + `StreamingEditGuard` + `auto-generated` (`14`), LSP reativo por versão + `DiagnosticsLedger` (`11`), e `outputSchema` + `isolated` por chamada em `subagent` (`15`).
  - **Classe C — 24 rejeitados** ([rejeitados.md](rejeitados.md) `R01..R24`): TTSR com abort de stream (`R01`), `src/thread/` + `crates/iso` (`R02`), `eval` Python/Bun sem sandbox (`R03`), `/goal` sem juiz externo (`R04`), `mnemopi` ~34k LOC + `bun:sqlite`/ONNX (`R05`), `advisor` passivo por turno (`R06`), `auth-broker`/`gateway` + 27 scrapers `/usage` (`R07`), KDL v2 (`R08`), `modelRoles` (`R09`), 76 scrapers web (`R10`), `browser`/`computer`/desktop 159k LOC (`R11`), prompt monolítico Handlebars + `rewrite-system-prompt` (`R12`), `internal-urls` (`R13`), `jfind` (`R14`), `gh`/`glab`/`ssh`/`archive` (`R15`), reescrita JSX/TSP da TUI (`R16`), entre outros (`R17..R24`).
- **Principais vantagens já existentes no `nycode` sobre o `omp`**: núcleo e prompt base **~7× menor** (`539` vs `~4.010` tok), `prefix-cache-1h` com TTL split `1h` só em `tools+system` e `5m` em mensagens, `codemode` em QuickJS-WASM capability-based (vs `eval` sem sandbox), `web_fetch` com DNS pinning anti-SSRF (`resolveAndPin`), `/goal` com juiz externo independente `VERDICT_TOOL` + `completion-gate` determinístico, e compatibilidade limpa com **Node.js `>= 22.19.0`** sem Rust nightly/Bazel/`bun:sqlite`.

## Índice dos documentos

| Arquivo | Conteúdo |
|---|---|
| [inventario.md](inventario.md) + `inventario/*.md` (42 grupos) | Mapeamento de 100% dos **10.247** arquivos do `omp` para equivalentes no `nycode` |
| [censo.md](censo.md) e [censo-flags.md](censo-flags.md) | Censo exaustivo de 32 tools, 56 CLIs, 89 slash commands, 20 internal-urls, 639 settings e flags `OMP_*`/`PI_*` |
| [matriz.md](matriz.md) | Matriz de comparação das 20+ áreas mínimas em 9 colunas + linha de base de tokens |
| [backlog.md](backlog.md) | Backlog priorizado (Classe A primeiro, depois Classe B por benefício/custo) |
| [rejeitados.md](rejeitados.md) | Todos os 24 itens Classe C (`R01..R24`) com evidência e motivo objetivo |
| [fontes.md](fontes.md) | Obtenção, vetting `presente-de-grego`, ancestral Pi, buscas web, medições e `codegraph` |
| `achados/01` .. `achados/25` | Fichas individuais com código citado, diferença, custo, risco, licença, proposta, testes, eval, aceite e rollback |

## O que não foi lido

Por escopo de tempo, contexto e restrição read-only (zero execução do `omp`), os grupos abaixo foram cobertos pelo inventário automatizado, censo AST/regex, `Cargo.toml`/`package.json` e amostragem dirigida — **não** lidos linha a linha em sua totalidade:

- **Código vendored e gerado**: `crates/vendor/*` (148 arquivos), `crates/natives/tools/cache/*` (vocabulários zstd) e arquivos gerados (21 arquivos, ex. `rpc-wire.generated.ts`, `models.generated.ts`).
- **Suítes de teste e pesquisa do `omp`**: os `4.076` arquivos classificados como `teste` em `inventario.md` (ex.: `crates/edit/tests/`, `crates/shell/tests/`, `coding-agent/test/`, exceto verificação pontual de nomes/fixtures como `minimizer_fixtures.rs` e `settings-manager.test.ts`), e os `41` scripts Python em `packages/snapcompact/research/` (~29.8k LOC).
- **Subsistema web/browser/desktop em volume**: os 72 extratores individuais em `web/scrapers/*`, todos os submódulos internos de `tools/browser/**` (45.1k LOC), `packages/browser-relay` (17.7k LOC) e os `88` arquivos OS-específicos de `crates/natives/src/desktop/**` (91.9k LOC).
- **Subsistemas rejeitados de nicho (Classe C)**: corpo completo de `crates/builtins` (320k LOC portados de uutils/jaq/sed), `crates/shell/src/bash/vm/*`, `disasm`/`ida`/`binja`/`ghidra`, `stt`/`tts`/`crates/voice`, `crates/predict`, `vibe`, `irc`, `collab`, `packages/collab-web`, `python/robomp`, `sdk/{go,python,rust}`, `packages/stats`, `if-bench` e `metaharness` fora dos entrypoints e READMEs.
- **Execução dinâmica do `omp`**: nenhuma compilação Rust, build JS ou benchmark runtime do `omp` foi executado (conforme proibição explícita da auditoria).
