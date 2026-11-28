# Achado 15: Busca SQLite FTS5 lazy (`openAt: 'first-search'`) sobre sessões anteriores, exposta sob demanda

## O que o `dsh` faz

Em `packages/session-query/session-query-sqlite/src/index.ts:89-106`, o `dsh` implementa um índice SQLite FTS5 (`unicode61`) capaz de buscar tanto sessões persistidas quanto eventos vivos em memória (`persisted_docs UNION ALL temp.live_docs`, ranking por `match_count` e `ROW_NUMBER()` por sessão), com abertura configurável em três fases (`'startup' | 'first-search' | 'never'`):

```ts
// packages/session-query/session-query-sqlite/src/index.ts:89-106
export type OpenAt = 'startup' | 'first-search' | 'never'
...
/**
 * Open the SQLite module and handle at service activation or the first
 * search, or `never` to disable full-text search...
 */
openAt?: OpenAt
```

Com `openAt: 'first-search'`, sessões que nunca pesquisam o histórico não carregam o módulo `node:sqlite` nem abrem banco algum no startup. O acesso do modelo ocorre por dois caminhos separados no `dsh`:
1. `experimental/tool-session-query` (`index.ts:66-123`): 5 tools dedicadas (`session_search` = **`428`** tokens, `session_event_search` = **`267`** tokens, mais `session_trace`, `session_event_trace`, `session_event_read`), restringindo resultados ao mesmo `cwd` (`header.cwd === caller.header.cwd`) e bloqueando que uma sessão consulte eventos de seu próprio passo em andamento (`range.to <= lastStepStartSeq - 1`).
2. `context/session-reference` (`index.ts:174-191`): resolve menções explícitas `@[label](dsh-session:<id>)` digitadas pelo usuário injetando um resumo `recall` limitado (`65_536` bytes com fallback em spill).

## Como o `nycode` faz hoje

1. `packages/coding-agent/src/extensions/memory/index.ts` oferece memória persistente curada por projeto em arquivos Markdown (`MEMORY.md`, teto `200` linhas / `25 KB` no prompt) com tool `memory` (`227` tokens), mas **não** indexa nem pesquisa o texto completo dos JSONLs de sessões passadas do projeto via FTS5.
2. A busca/leitura de transcrições históricas no `nycode` hoje existe apenas como script offline de diagnóstico/análise (`packages/coding-agent/scripts/session-transcripts.ts`), sem índice incremental nem ferramenta chamável durante a sessão (embora `extensions/tool-search` + `exposure: "deferred" | "codemode"` já exista pronto para abrigar novas tools sem custo fixo de schema no Turno 1!).

## Diferença concreta

- `dsh`: indexação FTS5 lazy por projeto + ferramentas de busca/leitura de eventos passados + resolução de `@session` digitado pelo usuário, com isolamento estrito por `cwd`.
- `nycode`: persistência JSONL independente por sessão sem índice FTS5 de busca entre sessões nem menção `@session` no prompt de entrada (dependendo apenas do resumo curado em `memory`).

## Classificação

**Classe B** — Mesmo exposta com `exposure: "deferred"` ou `"codemode"` para gastar **`0` tokens de schema no Turno 1** (respeitando `docs/ADR.md` / `docs/PRD.md`, ao contrário do `dsh` que quando ativa `session-query` declara `~1.127` tokens de 5 schemas diretamente!), mudar a disponibilidade de memória/histórico via `tool_search` ou menção `@session` altera a recuperação de contexto e exige eval de assertividade e latência.

## Benefício esperado

- Permite que o agente recupere decisões, stack traces ou comandos exatos de sessões anteriores no mesmo repositório sem depender de o usuário ter pedido para salvar em `MEMORY.md` antes.
- Com `openAt: 'first-search'` (`node:sqlite` já presente nativamente no Node `>= 22.19` que o `nycode` exige em `packages/coding-agent/package.json:100`), o custo de startup para sessões que não buscam histórico é **zero**.

## Custo

- **Tokens/turno**: **`0` tokens no Turno 1** se registrada com `exposure: "deferred"` (acessível via `tool_search`, `+151` tokens apenas se `tool_search` já estiver ativo, ou `codemode`), contra **`1.127` tokens** se todas as 5 tools de `tool-session-query` do `dsh` fossem declaradas diretamente como o `dsh` faz no catálogo. Quando ativada sob demanda via `tool_search` (`session_search` compacta de ~`200–350` tokens) ou menção explícita do usuário, gasta apenas os tokens do snippet retornado (`maxSnippetChars = 240`).
- **Latência**: zero no boot (`first-search`); na 1ª busca, indexação incremental de JSONLs novos no diretório de sessões do `cwd` leva ~`50–300 ms` dependendo da quantidade de sessões.
- **Manutenção**: média-alta — manter índice FTS5 sincronizado com edições/compactações e filtragem estrita de segredos/cwd (`workspace-access`).

## Riscos e modos de falha

- **Inconsistência de ADR se declarada em `direct`**: nunca declarar `session_search` sempre ativa no Turno 1; obrigatoriamente usar `exposure: "deferred"` / `"codemode"` ou disparo explícito via menção `@session` pelo usuário.
- **Vazamento cross-repo / poluição**: limitar estritamente ao mesmo repositório/`cwd` canônico da sessão atual e nunca indexar segredos redigidos.

## Licença

Código-fonte de referência `dsh` sob licença **MIT** (`LICENSE:1-21`). `node:sqlite` é nativo do Node.js (MIT), sem dependências C++ externas novas.

## Proposta para o `nycode`

1. Em nova extensão opcional `packages/coding-agent/src/extensions/session-search/` (ou integrada ao comando `/resume` + `deferred` tool):
   - usar `node:sqlite` (`DatabaseSync`) em modo lazy (`openAt: 'first-search'`), criando banco derivado FTS5 `unicode61` em `~/.nycode/agent/cache/session-index.sqlite` indexado por `(cwd, sessionId, entryId, mtimeMs)` somente dos arquivos JSONL no `sessionDir` correspondente ao `cwd`;
   - expor única tool consolidada `session_search` (`action: "search" | "read_trace"`, teto de snippets e bytes) com `exposure: "deferred"` (`tool_search`) para não inflar o prefixo padrão (`0` tokens no Turno 1);
   - opcionalmente suportar expansão sob demanda de referências explícitas de sessão digitadas no input do usuário.

## Testes necessários

- Teste em `packages/coding-agent/test/`:
  - módulo SQLite não é aberto durante startup sem chamadas de busca (`openAt: 'first-search'`);
  - busca retorna apenas sessões do mesmo `cwd`, ranqueadas por FTS5 com snippets truncados;
  - atualização incremental reindexa somente JSONLs cujo `mtimeMs`/tamanho mudou;
  - `exposure: "deferred"` mantém `declaredTools` do Turno 1 intactas (`0` tokens adicionados).

## Plano de eval

- **Baseline**: `nycode` padrão (`memory` curado apenas).
- **Candidato**: `nycode` com extensão `session-search` (`exposure: "deferred"`, encontrável por `tool_search` ou menção explícita).
- **Onde rodar**: `packages/evals` com benchmark multi-sessão onde a tarefa 2 depende de detalhe técnico ocorrido na sessão 1 não salvo em `MEMORY.md` (mais verificação de não regressão em `bench/` padrão garantindo `0` tokens extras quando não acionada: IC BCa 90% >= `-0.10`, mediana custo/turnos <= `1.10`). Nunca re-executar `cc-vanilla` nem `pi-vanilla`.

## Critérios de aceite e rollback

- **Aceite**: zero impacto em startup e tokens no Turno 1, isolamento por `cwd`, melhora em tarefas multi-sessão no eval.
- **Rollback**: desabilitar/remover a extensão `session-search` e apagar o cache derivado `session-index.sqlite` (sem alterar JSONLs originais).

## Prioridade

**Baixa (P7 entre itens Classe B)** — útil para workflows contínuos em um mesmo projeto, mas não melhora tarefas single-session de benchmark e exige cuidados de indexação incremental.
