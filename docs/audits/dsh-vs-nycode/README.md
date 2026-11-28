# Auditoria técnica comparativa: `deepseek-harness` (`dsh`) vs `nycode`

Comparação estrita baseada em leitura de código, citação `arquivo:linha` nos dois repositórios e medição de tokens com `tiktoken` (`o200k_base`) para identificar tudo o que agrega valor ao `nycode` sem piorar seu custo x benefício nem violar o escopo de `docs/PRD.md` (lido em `/home/marcio/source/nycode/docs/PRD.md`). Esta auditoria **não altera código, testes, configs ou prompts do `nycode`** e **não executa código do `dsh`**.

## SHAs e baseline

- **`dsh` (`deepseek-ai/deepseek-harness`)**: tag `dsh-v0.2.3-alpha.2`, SHA `4b399c39a6d1479cd84ca591b4d7c88e24d38a96`, licença MIT (`LICENSE:1-21`, observando exceções pontuais como `@deepseek-ai/libreoffice-kit` MPL-2.0 e SDKs externos em `THIRD_PARTY_NOTICES.md`).
- **`nycode` (worktree limpa `nycode-audit-dsh`)**: branch `docs/dsh-vs-nycode-audit` sobre `origin/main` SHA `00fed2ae615016b328ebfb48bfaa49814bf1dbc4`.

## Resumo executivo e contagem A / B / C

Foram auditados **32 itens comparáveis** em todo o harness após inventariar **8.124 arquivos de código** do `dsh` (**8.113 não gerados**, 100% aderentes a `git ls-files`) e **78 definições de ferramentas** (`76` nomes distintos):

| Classificação | Quantidade | Critério (Fase 3) | Síntese |
|---|---:|---|---|
| **Classe A** | **6** | `0` tokens extras e `0` alteração no comportamento nominal do modelo | Escalonamento de batch paralelo com barreiras (`01`), sandbox OS opcional (`02`), escrita atômica com staging (`03`), lease `flock` + `flush()` + recuperação de `toolCall` (`04`), TTL em arquivos de spill (`05`) e redatores de telemetria consentida (`06`). |
| **Classe B** | **10** | Altera tokens, prompt, schema, loop ou assertividade; exige eval em `packages/evals` ou `bench/` | Compactação em 2 estágios `pruner + replay cache` (`07`), congelamento de `memory` no prefixo + dedup SHA-1 de instruções + estabilidade de plano (`08`), guarda de repetição + retry `EMPTY_RESPONSE` (`11`), spill em `grep`/`find` + offload de imagens (`09`), `subagent_fork` com reuso KV (`10`), experimento `minimal` (`12`), promoção de timeout `bash` (`13`), DAG `blockedBy` em `team` (`14`), FTS5 `deferred` (`15`) e Cordis vs extensões — não migrar núcleo, extrair só guarda `next()` (`16`). |
| **Classe C** | **16** | Pior, já coberto melhor no `nycode`, ou fora do escopo (`PRD.md`) | LSP sem diagnósticos (`C01`), plan-mode sem trava (`C02`), goal auto-avaliado (`C03`), PTC em `node:vm` (`C04`), MCP eager (`C05`), HTTP fetch com SSRF (`C06`), `todo_write` destrutivo (`C07`), tool `skill` + 7 hooks (`C08`), ruído `time/tmux/changes` (`C09`), `str_replace_editor` + gate burocrático (`C10`), `plugin_manager` runtime (`C11`), `ralph`/`workflow` (`C12`), `schedule_*` `>1.240` toks (`C13`), cloud DeepSeek (`C14`), Desktop/Web/ACP/Python/Typert (`C15`) e Office/CUA/Conectores (`C16`). |
| **Total** | **32** | — | **6 Classe A + 10 Classe B + 16 Classe C** |

## Baseline de tokens no Turno 1 (`tiktoken` `o200k_base`)

| Harness / Modo | Tools declaradas | System prompt (toks) | Tools (toks) | Runtime ctx + skill (toks) | Total Turno 1 (toks) |
|---|---:|---:|---:|---:|---:|
| `nycode` núcleo puro (`4` tools) | 4 | 547 | 714 | 0 | **1.261** |
| `nycode` headless (`-p` + `headless-lean`) | 8 | 2.183 | 1.619 | 0 | **3.802** |
| `nycode` interativo padrão (`builtInExtensions`) | 18 | 2.387 | 4.121 | 0 | **6.508** |
| `dsh` `sdk-minimal` / `minimal` | 2 | 8 | 297 | 0 | **305** |
| `dsh` `standard` (Linux, sem `plan-mode`) | 35 | 944 | 7.474 | 258 | **8.676** |
| `dsh` `ptc` (Linux, `tools:sdk` 33 APIs) | 1 (`run_code`) | 6.995 | 929 | 258 | **8.182** |
| `dsh` `cordis` (Linux) | 33 | 954 | 7.279 | 258 | **8.491** |

Principais conclusões econômicas:
1. O `nycode` interativo (`6.508` toks) e headless (`3.802` toks) já derrotam com folga os presets completos do `dsh` (`8.182–8.676` toks), porque `schedule_*` (`> 1.240` toks), `workflow` (`819` toks), `office_*`, `plugin_manager` (`591` toks) e `tools:sdk` (`6.079` toks) inflacionam o Turno 1 no `dsh` mesmo quando o usuário não os pediu.
2. Onde o `dsh` de fato reduz custo real está em **operações de ciclo de vida longo**: `ToolResultPruner` sem LLM antes de resumir + sumarização via replay no KV cache (`07`), congelamento de seção mutável fora do `system[0]` (`08`), `subagent_fork` reutilizando prefixo (`10`) e seu preset extremo de `305` tokens (`12`, cuja eficácia vs `edit` precisa ser provada no Terminal-Bench 2.0 antes de qualquer adoção).

## Índice de documentos

- [inventario.md](inventario.md) e subarquivos em `inventario/<grupo>.md`: mapeamento **100%** dos **8.124** arquivos de código do `dsh` para equivalentes no `nycode` ou `sem equivalente`.
- [censo.md](censo.md): orçamento detalhado de tokens por preset e ferramenta (`78` definições `dsh` + `25` tools registradas no `nycode`), `136` serviços Cordis, `44` seções, `10` contextos dinâmicos, `4` comandos e `31` envs `DSH_*`.
- [matriz.md](matriz.md): matriz comparativa completa (`27` linhas, `9` colunas) cobrindo todas as áreas mínimas e demais grupos.
- [backlog.md](backlog.md): tabela priorizada (`6` A primeiro, `10` B em seguida).
- [rejeitados.md](rejeitados.md): os `16` itens Classe C com `arquivo:linha` e justificativa objetiva.
- [fontes.md](fontes.md): SHAs, segurança (`presente-de-grego`), buscas web, `codegraph` e reprodutibilidade do `tiktoken`.
- Fichas em `achados/`:
  - Classe A: [01](achados/01-pool-concorrencia-barreiras-tools.md), [02](achados/02-sandbox-os-bwrap-landlock-seatbelt.md), [03](achados/03-escrita-atomica-fs-locks.md), [04](achados/04-checkpoint-flush-lease-sessao.md), [05](achados/05-limpeza-ttl-arquivos-spill-temp.md), [06](achados/06-telemetria-consentida-por-feedback.md).
  - Classe B: [07](achados/07-compaction-cache-prefix-e-pruner.md), [08](achados/08-isolamento-prefix-cache-injecoes-dinamicas.md), [09](achados/09-spill-orcamento-grep-find-e-offload-imagens.md), [10](achados/10-subagent-fork-reuso-kv-cache.md), [11](achados/11-guarda-repeticao-tool-e-retry-resposta-vazia.md), [12](achados/12-preset-minimal-pty-persistente.md), [13](achados/13-promocao-automatica-timeout-bash-jobs.md), [14](achados/14-dag-dependencias-cas-task-board-team.md), [15](achados/15-busca-fts5-sessoes-sob-demanda.md), [16](achados/16-arquitetura-cordis-vs-extensoes.md).

## Lacunas

- **Perplexity MCP indisponível na máquina**: retornou erro de cookies expirados (`fontes.md`), coberto com Exa + Octen + `search_web` Google grounding + checagem direta HTTP `200` dos endpoints oficiais.
- **`codegraph` em estado `degraded`**: o índice de `/home/marcio/source/nycode` reportou 1 arquivo pendente; toda citação do `nycode` foi reconfirmada diretamente na worktree limpa `/home/marcio/source/nycode-audit-dsh` (e `docs/{README,PRD,ADR,MEMORY}.md`, que não estão rastreados em `origin/main`, foram lidos explicitamente em `/home/marcio/source/nycode/docs/`).
- **Orçamento dinâmico pós-Turno 1**: tokens de `tool_result`, spill e ganho real de `cacheRead` em sessões multi-turno são projeções analíticas que dependem dos planos de eval especificados nas fichas Classe B (`07`–`16`).

## O que não foi lido

Por definição explícita de escopo da Fase 1 ou por serem gerados/não-código, ficaram fora da leitura funcional profunda:

- Árvores excluídas no `dsh`: `snapshots/` (`314` arquivos), `website/` (`208`), `vendor/` (`422` arquivos, **exceto `vendor/cordis/src/` que foi integralmente inspecionado**), `.agents/` (`21`), `benchmarks/` (`19`), `scripts/` (`52`).
- Os **11 arquivos gerados** listados em `inventario.md` (`known-event-types.ts`, `NativeProtocol.generated.swift`, catálogos gerados de `cordis-client-runner` e `tool-cordis`, `provider-data.generated.ts`, `session-format-catalog/src/generated.ts`, 2 `host.mjs` em `.generated-model-*`, `official-bundles/src/catalog.generated.ts`, `workflow-ptc/src/guest-source.ts`).
- Os **6.160 arquivos não-código** dentro de `packages/`, `apps/`, `native/` e `python/` (ícones `.svg`/`.png`, fixtures Office, snapshots `.jsonl`/`.txt`, lockfiles, YAML/JSON de configuração e docs `.md`), além dos corpos internos detalhados das UIs React em `packages/client/` (`~192k` LOC) e integrações experimentais/GUI fora de escopo (`apps/desktop`, `packages/experimental/forge`, `liveshare`, `inspector`) além da inspeção de arquitetura e mapeamento integral de inventário.
