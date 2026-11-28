# Backlog priorizado de melhorias (`dsh` -> `nycode`)

Ordenação estrita pela Fase 4: todos os itens **Classe A** primeiro (ordenados por relação benefício/custo de manutenção), seguidos pelos itens **Classe B** (ordenados por relação benefício / custo em tokens + esforço de eval + manutenção). Itens **Classe C** não entram no backlog e estão documentados em [rejeitados.md](rejeitados.md).

## Resumo numérico

- **Classe A**: **6** itens (`01` a `06`) — `0` tokens adicionais e nenhuma mudança no comportamento nominal do modelo.
- **Classe B**: **10** itens (`07` a `16`) — tocam tokens, prompt, schemas, compactação ou loop; cada um traz plano de eval obrigatório.
- **Classe C**: **16** itens (`C01` a `C16`) — rejeitados com motivo concreto em [rejeitados.md](rejeitados.md).

## Tabela priorizada

| Ordem | ID | Classe | Tema | Impacto em tokens (`o200k_base`) | Esforço | Prioridade | Ficha |
|---:|---|---|---|---|---|---|---|
| 1 | `01` | **A** | Pool de concorrência (`10`) com barreiras exclusivas e reclassificação dinâmica em `agent-loop` | `0` | Baixo (~120 LOC em `packages/agent`) | P1 | [achados/01-pool-concorrencia-barreiras-tools.md](achados/01-pool-concorrencia-barreiras-tools.md) |
| 2 | `03` | **A** | Escrita atômica em `write` e `edit` via arquivo temporário `'wx'` + preservação de permissões/symlinks | `0` | Baixo (~90 LOC em `core/tools`) | P1 | [achados/03-escrita-atomica-fs-locks.md](achados/03-escrita-atomica-fs-locks.md) |
| 3 | `04` | **A** | Lease exclusivo por arquivo de sessão, `flush()` fail-closed e liquidação de `toolCall` em exceção | `0` | Baixo-Médio (~150 LOC em `session-manager`/`agent-loop`) | P2 | [achados/04-checkpoint-flush-lease-sessao.md](achados/04-checkpoint-flush-lease-sessao.md) |
| 4 | `02` | **A** | Confinamento opcional em kernel (`bwrap` / `Seatbelt`) sob `bash` transparente em schema/prompt | `0` | Médio (~180 LOC opt-in em `core/permissions`) | P2 | [achados/02-sandbox-os-bwrap-landlock-seatbelt.md](achados/02-sandbox-os-bwrap-landlock-seatbelt.md) |
| 5 | `05` | **A** | Subdiretório privado `0o700` e varredura TTL (`30d`) segura contra symlinks para spills | `0` | Baixo (~100 LOC em `utils/output-files.ts`) | P3 | [achados/05-limpeza-ttl-arquivos-spill-temp.md](achados/05-limpeza-ttl-arquivos-spill-temp.md) |
| 6 | `06` | **A** | Cascata de redatores extensível e teto `4 MiB` para exportação consentida em `diagnostico` | `0` | Baixo (~80 LOC em `extensions/diagnostico`) | P4 | [achados/06-telemetria-consentida-por-feedback.md](achados/06-telemetria-consentida-por-feedback.md) |
| 7 | `07` | **B** | Podador gratuito pré-LLM de `toolResult` (`8192 -> 4096+1024`) + sumarização preservando prefix cache | `0` fixos; evita compactações e converte input para `cacheRead` | Médio (~250 LOC em `core/compaction`) | P0 (B) | [achados/07-compaction-cache-prefix-e-pruner.md](achados/07-compaction-cache-prefix-e-pruner.md) |
| 8 | `08` | **B** | Congelar seção `memory` no prefixo + dedup SHA-1 de `AGENTS.md`/`CLAUDE.md` + opção de catálogo estável em `plan-mode` para DeepSeek | `0` extras; elimina `cacheWrite` mid-sessão e reduz duplicatas | Baixo-Médio (~160 LOC em `memory` / `resource-loader`) | P1 (B) | [achados/08-isolamento-prefix-cache-injecoes-dinamicas.md](achados/08-isolamento-prefix-cache-injecoes-dinamicas.md) |
| 9 | `11` | **B** | Retry específico de `EMPTY_RESPONSE` (`0` blocos em `stop`) e lembrete de chamada repetida idêntica (`[3, 5, 8]`) | `0` fixos; `+25–45` toks apenas no disparo `[3, 5, 8]` | Baixo (~110 LOC) | P1 (B) | [achados/11-guarda-repeticao-tool-e-retry-resposta-vazia.md](achados/11-guarda-repeticao-tool-e-retry-resposta-vazia.md) |
| 10 | `09` | **B** | Spill em disco para `grep`/`find` truncados via `writeOutputFile` e offload reativo de imagens antigas em overflow | `0` Turno 1; `+18–25` toks só quando truncar busca | Baixo-Médio (~140 LOC) | P2 (B) | [achados/09-spill-orcamento-grep-find-e-offload-imagens.md](achados/09-spill-orcamento-grep-find-e-offload-imagens.md) |
| 11 | `10` | **B** | Opção `forkContext` em `subagent` clonando turnos fechados do pai para reuso de KV cache (`~0.1x`) | `+15–25` schema (`forkContext`); filhos consomem `cacheRead` | Médio (~220 LOC sobre `--session` de subagente) | P3 (B) | [achados/10-subagent-fork-reuso-kv-cache.md](achados/10-subagent-fork-reuso-kv-cache.md) |
| 12 | `12` | **B** | Experimento de ablação `minimal` (`bash` + `read`/`read_image` + `lite.md`) antes de cogitar PTY persistente | Potencial `-3.1k` a `-3.5k` toks de entrada no Turno 1 (`bench/`) | Baixo (H1 flag) / Alto (H2 PTY) | P4 (B) | [achados/12-preset-minimal-pty-persistente.md](achados/12-preset-minimal-pty-persistente.md) |
| 13 | `13` | **B** | Promoção automática de `bash` em timeout para registro `run` em sessões interativas | `0` Turno 1; `~30–60` toks só quando promover timeout | Médio (~150 LOC em `bash` + `extensions/run`) | P5 (B) | [achados/13-promocao-automatica-timeout-bash-jobs.md](achados/13-promocao-automatica-timeout-bash-jobs.md) |
| 14 | `14` | **B** | Validação DAG (`blockedBy`, sem ciclos) no `tasks` do `/team` mantendo trava de arquivo `O_EXCL` | `0` por padrão (`NYCODE_TEAMS=1`: `+15–30` schema) | Baixo (~80 LOC em `subagent/team/tasks.ts`) | P6 (B) | [achados/14-dag-dependencias-cas-task-board-team.md](achados/14-dag-dependencias-cas-task-board-team.md) |
| 15 | `15` | **B** | Extensão opcional FTS5 lazy (`openAt: 'first-search'`) sobre sessões passadas exposta só como `deferred` | `0` Turno 1 (`exposure: "deferred"`) | Médio-Alto (~400 LOC em nova extensão) | P7 (B) | [achados/15-busca-fts5-sessoes-sob-demanda.md](achados/15-busca-fts5-sessoes-sob-demanda.md) |
| 16 | `16` | **B** | Avaliação de Cordis vs `ExtensionRunner`: rejeitar migração completa e portar só guarda `next()` | `0` se adotar só guarda `next()` | Altíssimo se migrar; mínimo na guarda | P8 (B / Não migrar) | [achados/16-arquitetura-cordis-vs-extensoes.md](achados/16-arquitetura-cordis-vs-extensoes.md) |
