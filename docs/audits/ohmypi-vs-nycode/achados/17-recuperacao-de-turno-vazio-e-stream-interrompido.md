# 17 — Recuperação de turno vazio / stream interrompido, sugestão de tools e barreiras `shared`/`exclusive`

- **Classe**: **B** (altera o loop de execução de tools, recuperação pós-erro de stream e ordenação de chamadas paralelas — exige eval em `bench/` para medir impacto em turnos/custo/regressões).
- **Prioridade**: **P2** (ganho real em estabilidade de stream e segurança de paralelismo sem serializar leituras).

## O que o `omp` faz

1. **Preservação de chamadas completas em stream cortado** (`omp:packages/agent/src/agent-loop.ts:2818-2884`): `retainCompletedToolCalls` filtra apenas blocos `toolCall` incompletos em mensagens terminadas em `"error"`/`"aborted"`, permitindo aproveitar resultados das ferramentas já executadas em vez de descartar todo o turno:

```ts
function retainCompletedToolCalls(
   message: AssistantMessage,
   completedToolCallIds: ReadonlySet<string>,
): AssistantMessage {
   if (message.stopReason !== "error" && message.stopReason !== "aborted") return message;
   let droppedIncompleteToolCall = false;
   const content = message.content.filter(block => {
      if (block.type !== "toolCall") return true;
      const keep = completedToolCallIds.has(block.id);
      if (!keep) droppedIncompleteToolCall = true;
      return keep;
   });
   if (!droppedIncompleteToolCall) return message;
```

1. **Barreira de concorrência `shared`/`exclusive`** (`omp:packages/agent/src/agent-loop.ts:120-131,4039-4078`): leituras (`shared`) executam em paralelo, mas uma ferramenta `exclusive` cria barreira `[lastExclusive, ...sharedTasks]`, e leituras subsequentes aguardam `earlierEffectsSettled` de escritas `shared` anteriores sem serializar o lote inteiro:

```ts
      const concurrency = resolveToolConcurrency(record.tool, record.args);
      const start = concurrency === "exclusive" ? Promise.all([lastExclusive, ...sharedTasks]) : lastExclusive;
      const earlierEffectsSettled =
         concurrency === "shared" && sharedEffects.length > 0
            ? Promise.allSettled(sharedEffects).then(() => undefined)
            : undefined;
```

1. **Turnos vazios e sugestão de tool** (`omp:packages/coding-agent/src/session/turn-recovery.ts:1154-1850`, `omp:packages/agent/src/agent-loop.ts:3063-3135`): remove duravelmente turnos `stop` vazios (`EMPTY_STOP_MAX_RETRIES = 3`, `empty-stop-retry.md`) para não poluir histórico, e `formatToolNotFoundMessage` sugere até 3 nomes parecidos (`"Tool ${name} not found. Did you mean ${suggestions[0]}?"`).

- **Ancestralidade Pi**: `pi0.9.4` não tinha recuperação nem concorrência tipada; `pibase` adicionou `failToolCallsFromTruncatedMessage` e flag binária `sequential`. O `omp` construiu todo o restante.

## Como o `nycode` faz

- Em `packages/agent/src/agent-loop.ts:488-533,708-779`:
  - `failToolCallsFromTruncatedMessage` (`:488-513`) recusa todas as chamadas quando `stopReason === "length"`, sem preservar blocos já executados em corte transitório após emissão parcial.
  - `executeToolCalls` (`:518-533`) usa chave binária: tudo sequencial se `hasSequentialToolCall` ou `toolExecution === "sequential"`, caso contrário `Promise.all` total.
  - `Tool not found` retorna erro genérico sem sugestão do último segmento (`mcp__server__foo`).
- Em `packages/coding-agent/src/core/agent-session.ts:1356-1384,3931-4024` + `extensions/auto-resume/index.ts:37-48`: `_omitRecoveryAttempt` usa `appendContextEdit(targetId, null)` em retries de erro transitório, mas não trata explicitamente turno terminado com `stop` e array de conteúdo vazio.

## Diferença concreta

| Aspecto | `omp` (`v19.2.1`) | `nycode` (`00fed2ae`) |
|---|---|---|
| Barreira de execução paralela | `shared` vs `exclusive` + `earlierEffectsSettled` (`omp:packages/agent/src/agent-loop.ts:4039-4078`) | Tudo paralelo (`Promise.all`) ou tudo sequencial (`packages/agent/src/agent-loop.ts:518-533`) |
| Corte no meio de lote de tools | `retainCompletedToolCalls` preserva tools já concluídas (`agent-loop.ts:2818-2843`) | Descarta/falha em `failToolCallsFromTruncatedMessage` (`agent-loop.ts:488-513`) |
| Parada `stop` vazia / typo de nome | `EMPTY_STOP` remove + retenta até 3x; `suggestToolNames` sugere até 3 nomes | Sem tratamento para `stop` vazio; erro simples em `Tool not found` |

## Benefício

- **Problema**: (1) quando um modelo chama 4 `read` + 1 `bash` no mesmo turno ou `edit` + `read`, `Promise.all` cego pode disparar `read` antes do `edit` terminar, enquanto modo sequencial atrasa os 4 `read` em série; (2) quando o modelo erra um prefixo MCP (`web_search` vs `mcp__server__web_search`), precisa gastar um turno listando ferramentas; (3) resposta vazia com `stopReason: "stop"` encerra a sessão deixando o usuário sem resposta em provedores instáveis.
- **Solução**: portar em TS puro dentro de `@nycode/agent` / `AgentSession`: (a) `formatToolNotFoundMessage` com sugestão por distância/sufixo, (b) barreira `shared`/`exclusive` mantendo paralelismo de leituras (compatível com `file-mutation-queue.ts` já presente no `edit`/`write`), e (c) recuperação de `stop` vazio (máx 1–2 retries omitindo o turno vazio via `appendContextEdit`) + preservação de tool calls completas quando aplicável.

## Custo

- **Tokens / turno**: **0** fixo no prompt; em erro de nome/parada vazia consome apenas aviso curto (`empty-stop-retry.md` tem ~40 tokens).
- **Latência**: melhora em lotes mistos (`read` paralelo mantendo barreira em `bash`/`write`).
- **Manutenção**: ~200–250 LOC TS puro em `packages/agent/src/agent-loop.ts` e `core/agent-session.ts`.

## Riscos

- **Mascarar falha em `bench/`**: se `EMPTY_STOP` ou `recoverTransientErrorToolTurn` retentar indefinidamente, altera contagem de turnos e custo. Limitar estritamente `EMPTY_STOP` a `<= 2` tentativas e manter separada a política `headless` de erro de API/429 (`docs/bench/RUNBOOK.md:103-106`).
- **Contratos com extensões `nested-tool-calls`**: validar compatibilidade com `AgentSession._executeNestedToolCall` (`core/agent-session.ts:822-856`) e `NestedCallRecorder`.

## Licença

**MIT** (`omp:LICENSE:1-23`).

## Proposta

- **`packages/agent/src/agent-loop.ts`**: adicionar `formatToolNotFoundMessage`, opção `concurrency?: "shared" | "exclusive"` no `AgentTool` (default compatível sem quebrar ferramentas existentes) e filtro `retainCompletedToolCalls` no tratamento de erro após execução parcial.
- **`packages/coding-agent/src/core/agent-session.ts`**: adicionar recuperação de turno `stop` vazio (máx 2 retries) limpando o turno vazio da projeção via `appendContextEdit`.

## Testes

- `packages/agent/test/` e `packages/coding-agent/test/suite/`:
  1. Lote `[read A, read B, bash X, read C]`: `read A` e `read B` correm em paralelo; `bash X` (`exclusive`) aguarda ambos; `read C` aguarda `bash X`.
  2. Chamada `not_found_tool` próxima de `mcp__github__search_code` devolve `Did you mean ...`.
  3. Resposta assistente com `stopReason: "stop"` e `content: []` é omitida e retentada 1 vez antes de falhar na 3ª.

## Plano de eval

- **Base e candidato**: `nycode` (`origin/main`) vs `nycode + turn-recovery/barreira/tool-suggest` via `bench/run.py` + `bench/gate.py` em `suite.s1` (`pr_cases`) e `suite.s2` (`tasks/tb2.json`). Garantir zero aumento de `turns` ou custo (`TURNS_MAX = 1.10`, `PARITY_COST_MAX = 1.10`) e acerto >= `MARGIN = -0.10`. Não reexecutar `cc-vanilla`/`pi-vanilla`.

## Critérios de aceite

1. Toda a suíte `packages/agent/test/` e regressões `test/suite/` passam.
2. Zero mudança de comportamento em chamadas bem-sucedidas normais.
3. Gate `bench/` verde.

## Rollback

Reverter os helpers em `packages/agent/src/agent-loop.ts` e `core/agent-session.ts`.
