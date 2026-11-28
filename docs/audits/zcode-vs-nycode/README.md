# Auditoria Comparativa de Harness: ZCode v4.0.0 vs nycode

Comparação técnica, baseada exclusivamente em código-fonte e medições estáticas de tokens (`o200k_base`), entre o **ZCode** (`zai-org/ZCode`, `Apache-2.0`, tag `v4.0.0`, SHA `a4b4445141eb7d3b3e99eada9292775383bfc44e`) e o **nycode** (`origin/main`, SHA `00fed2ae615016b328ebfb48bfaa49814bf1dbc4`). Este trabalho é **somente documentação**: nenhum código, teste, prompt ou configuração do nycode foi alterado, e nenhum script ou código do ZCode foi executado.

## Índice da Auditoria

- [Inventário 100% e Reconciliação (`git ls-files`)](inventario.md)
  - [01 — Harness: core, cli, tui](inventario/01-harness-core-cli-tui.md)
  - [02 — Harness: adapters, bootstrap e ferramentas](inventario/02-harness-adapters-bootstrap.md)
  - [03 — Harness: workflows, repl, contratos e plugins](inventario/03-harness-workflows-repl-plugins.md)
  - [04 — Pacotes de Plataforma (server, rpc, session-control, plugin-api, cua, formal-proof)](inventario/04-platform-packages.md)
  - [05 — Clientes Web e Android](inventario/05-ui-web-android.md)
  - [06 — Cliente Desktop](inventario/06-desktop.md)
- [Censo Estrutural do ZCode](censo.md)
- [Matriz de Comparação Arquitetural (26 Áreas)](matriz.md)
- [Backlog Priorizado (Classe A -> Classe B)](backlog.md)
- [Itens Rejeitados (Classe C)](rejeitados.md)
- [Fontes, Método e Lacunas](fontes.md)

### Achados Detalhados (`achados/`)

- **Classe A (custo zero em tokens e sem alterar comportamento do modelo)**
  - [01 — Governança arquitetural declarativa (`architecture-policy.yaml`)](achados/01-governanca-arquitetural-declarativa.md)
  - [02 — Verificação de continuidade de prefixo e prompt cache no harness](achados/02-harness-continuidade-prefixo-prompt-cache.md)
  - [03 — Classificação de códigos de negócio de provedores e jitter no retry](achados/03-classificacao-codigos-negocio-jitter-retry.md)
  - [04 — Trust de MCP/hooks por digest SHA-256 e startup budget de plugins](achados/04-trust-por-digest-e-startup-budget-mcp.md)
  - [05 — Contratos RPC com CAS/idempotência e projeção de `input_schema`](achados/05-cas-geracao-rpc-e-projecao-input-schema.md)
  - [06 — Teste tabular exaustivo do espaço de estados de sessão](achados/06-teste-tabular-espaco-estados-sessao.md)
- **Classe B (altera prompt, schema ou loop — exige eval antes de adotar)**
  - [07 — Circuit breaker contra rapid-refill de autocompact](achados/07-circuit-breaker-rapid-refill-autocompact.md)
  - [08 — Microcompact determinístico de tool results antigos em sessão longa](achados/08-microcompact-deterministico-resultados-antigos.md)
  - [09 — Stub de deduplicação para releitura de arquivo inalterado](achados/09-stub-dedup-leitura-arquivo-inalterado.md)
  - [10 — Separação de prefixo estável e catálogo incremental de skills](achados/10-separacao-prefixo-estavel-catalogo-incremental-skills.md)
  - [11 — Compaction prompt estruturado e proteção de memória na extração](achados/11-compaction-prompt-estruturado-extracao-segura.md)
  - [12 — Parser AST de Bash para aprovação granular de comandos compostos](achados/12-parser-ast-bash-aprovacao-granular-guard.md)
  - [13 — Normalização persistente de reasoning assinado e retry para completions vazias](achados/13-normalizacao-persistente-reasoning-assinado-empty-retry.md)
  - [14 — Typecheck estático de scripts antes da execução no codemode](achados/14-typecheck-estatico-scripts-codemode.md)
  - [15 — Exclusão de modos no `/goal`, sanitização do objetivo e relógio de stall em background](achados/15-exclusao-plan-goal-sanitizacao-objetivo-stall-clock.md)

## Contagem Consolidada (A / B / C)

| Classe | Definição | Quantidade | Onde consultar |
| --- | --- | ---: | --- |
| **Classe A** | Custo zero em tokens e sem alteração do comportamento do modelo; agrega em engenharia, invariantes, confiabilidade ou observabilidade | **6** | [backlog.md](backlog.md) e `achados/01..06` |
| **Classe B** | Altera prompt, schema, tool ou fluxo do agent loop; exige eval (baseline vs candidato) antes de qualquer adoção | **9** | [backlog.md](backlog.md) e `achados/07..15` |
| **Classe C** | Pior que o nycode, redundante/já coberto ou fora do escopo do harness (desktop, web, android, stubs/bundles pesados) | **14** | [rejeitados.md](rejeitados.md) |

## Resumo Executivo

1. **Eficiência de contexto (`o200k_base`)**: o **nycode** é drasticamente mais enxuto em baseline por turno (`547` tokens de system prompt bare + `714` tokens nos 4 core tools = `1.261` tokens mínimos), contra `1.706` tokens apenas nas seções estáticas de contexto do **ZCode** (`+449` de desktop context, descrições Zod extensas como `read` com `1.037` tokens e `ask-user-question` com `1.144`, além de `111.010` tokens somados nos 39 `SKILL.md` empacotados). O `compact` prompt estático do ZCode consome `2.391` tokens vs `253` tokens no nycode (`56` system + `197` summarization).
2. **Arquitetura onde o nycode já supera o ZCode (mantido como referência negativa em Classe C)**:
   - **Goal Loop (`/goal`)**: o nycode isola a avaliação em subagent dedicado com modelo pequeno/rápido e `VERDICT_TOOL` estruturada; o ZCode avalia na thread principal com fallback fail-open (`failOpenGoalCompletionVerification`).
   - **Codemode / Execução JS**: o `@nycode/codemode` isola scripts em QuickJS WASM com capabilities explícitas; o `node-repl-host` (`0.7.1`) do ZCode sobe um processo Node sem sandbox por chamada, voltado a Browser/CUA.
   - **CUA e Formal Proof**: no snapshot público `v4.0.0`, `packages/zcode-cua` atua como stub fail-closed e `packages/formal-proof` é uma ferramenta visual Vite+D3 de enumeração de estados (sem provador formal SMT/TLA+).
3. **Oportunidades reais para o nycode**:
   - **Vitória imediata sem tokens extras (Classe A)**: importar governança arquitetural declarativa por `architecture-policy.yaml`, harness estático de continuidade de prefixo de prompt cache, classificação tipada de códigos de negócio HTTP/SSE com jitter no retry, trust por hash SHA-256 + budget de startup para MCP/hooks, contratos CAS para sessões/RPC e verificação tabular exaustiva de transições de sessão.
   - **Hipóteses promissoras sujeitas a eval (Classe B)**: circuit breaker de `rapid-refill` para impedir loops de autocompact, microcompact determinístico de tool results antigos, normalização de reasoning assinado com retry de resposta vazia, parsing AST para aprovação granular em `guard`, além de ajustes pontuais em compaction, codemode typecheck e `/goal`.

## Baseline de Medição de Tokens (`o200k_base`)

| Superfície Estática Medida | nycode (`o200k_base`) | ZCode v4.0.0 (`o200k_base`) | Observação |
| --- | ---: | ---: | --- |
| System prompt bare / seções estáticas | `547` | `1.706` | ZCode soma `+449` em contexto desktop e `+35` em preâmbulo de instruções |
| Core tools (`Read` + `Bash` + `Edit` + `Write`) | `714` | `854` (handler descs) + `1.500` (Zod contracts) | ZCode separa `Read: 184` + `Bash: 538` + `Edit: 79` + `Write: 53`; Zod `read` soma `1.037` |
| Compaction prompt base | `253` (`56` + `197`) | `2.391` | ZCode ainda tem variante `turn_prefix: 120` equivalente no nycode |
| Avaliação de Goal (`system` + `tool` / base) | `454` (`321` + `133`) | `1.012` | nycode isola em subagent avaliador dedicado + amostra kickoff `169` |
| Tool search | `151` | `154` (+ `71` Zod) | Ambos aplicam deferring sob demanda (ZCode marca `44/60` tools como `shouldDefer: true`) |
| Codemode bare vs JS REPL contrato | `364` | `172` (+ `1.137` browser guidance) | Propósitos distintos: sandbox QuickJS multiuso vs Node host focado em browser/CUA |
| Catálogo estático empacotado (skills / workflows) | sob demanda (`~0` no bare) | `111.010` (`39` skills) + `22.555` (`dynamic-workflows`) | Carregamento completo inviável; ZCode mitiga com injeção filtrada/listagem |

## Reconciliação Rápida do Inventário

- **Total de arquivos rastreados (`git ls-files`) no ZCode `v4.0.0`**: `19.355`
- **Código first-party inventariado (Bucket 1)**: `9.212` arquivos (`100%` mapeados linha a linha nos 6 arquivos de `inventario/` com `72` destinos equivalentes verificados no `nycode`)
- **Exclusões auditadas**: `33` gerados (Bucket 2), `9` vendor (Bucket 3), `3.898` third-party (Bucket 4) e `6.203` não-código (Bucket 5).
