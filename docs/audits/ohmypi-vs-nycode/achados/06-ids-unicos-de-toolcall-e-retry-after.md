# 06 — IDs únicos de `toolCall` e suporte a cabeçalho `Retry-After` em oneshots

- **Classe**: **A** (proteção puramente defensiva de integridade do histórico e respeito a hints HTTP de rate-limit; zero tokens extras, zero mudança no comportamento normal do modelo).
- **Prioridade**: **P1** (previne corrupção silenciosa de sessão por IDs repetidos e elimina retries apressados/inúteis em `429` durante chamadas oneshot).

## O que o `omp` faz

1. **IDs únicos de `toolCall`**: em `omp:packages/agent/src/agent-loop.ts:3190-3229`, `ensureUniqueToolCallIds` rastreia IDs já despachados na sessão/run (`dispatchedIds`) e IDs duplicados ou vazios dentro da mesma mensagem do assistente, sufixando `_dupN` ou cunhando novo ID (`mintToolCallId`) antes da execução para impedir colisão no protocolo de `tool_result`:

```ts
      if (block.id?.trim() && !seen.has(block.id) && !dispatchedIds.has(block.id)) {
         seen.add(block.id);
         dispatchedIds.add(block.id);
         continue;
      }
      let candidate: string;
      if (block.id?.trim()) {
         let suffix = 1;
         candidate = appendDuplicateSuffix(block.id, `_dup${suffix}`, MAX_TOOL_CALL_ID_LENGTH);
         while (seen.has(candidate) || reserved.has(candidate) || dispatchedIds.has(candidate)) {
            suffix += 1;
            candidate = appendDuplicateSuffix(block.id, `_dup${suffix}`, MAX_TOOL_CALL_ID_LENGTH);
         }
      } else {
         // Process-unique minter: a per-run counter would re-mint `call_1` in
         // every run and collide with earlier runs' calls in session history.
         do {
            candidate = mintToolCallId();
         } while (seen.has(candidate) || reserved.has(candidate) || dispatchedIds.has(candidate));
      }
```

1. **`Retry-After` e curta-circuitagem em `oneshot-retry`**: em `omp:packages/ai/src/oneshot-retry.ts:93-124,156-243`, chamadas auxiliares sem estado (`retryTransientCompletion`) analisam `retry-after-ms` / `Retry-After` via headers de resposta, aplicam teto `maxDelayMs = 30_000` (abortando sem esperar se o provedor pedir mais tempo que o limite do caller, além de `BACKOFF_CEILING_MS = 8_000` com jitter `0.75–1.0`) e jamais retentam `ContextOverflow`, `PayloadRejected`, `ContentBlocked` ou falha determinística de JSON de `llama.cpp`.

- **Ancestralidade Pi**: ausente em `pi0.9.4` e `pibase` (`pibase:packages/agent/src/agent-loop.ts` não deduplica IDs; `pibase:packages/ai/src/utils/retry.ts:174-315` não lê headers `Retry-After` em `retryAssistantCall`).

## Como o `nycode` faz

- Em `packages/agent/src/agent-loop.ts:518-533` e `708-779`, `executeToolCalls` e `prepareToolCall` usam `toolCall.id` diretamente sem verificar colisão com `toolCall`s anteriores no histórico ou duplicatas emitidas pelo mesmo turno (provedores open-weight / proxies OpenAI-compat ocasionalmente emitem `call_0` / `call_1` repetidos em turnos distintos ou no mesmo batch, fazendo a Anthropic/OpenAI rejeitar os turnos seguintes por `tool_use_id` duplicado).
- Em `packages/ai/src/utils/retry.ts:186-299`, `retryDelayMs` usa backoff exponencial puro sem ler cabeçalhos `Retry-After` / `retry-after-ms` em `retryAssistantCall` (ex.: usado em sumarização de compactação em `packages/coding-agent/src/core/compaction/compaction.ts:623-637`), nem aborta cedo quando o servidor exige espera acima do teto máximo permitido.

## Diferença concreta

| Aspecto | `omp` (`v19.2.1`) | `nycode` (`00fed2ae`) |
|---|---|---|
| Unicidade de `toolCall.id` | `ensureUniqueToolCallIds` verifica `seen` + `dispatchedIds` (com `mintToolCallId` único por processo e respeito a `MAX_TOOL_CALL_ID_LENGTH`) (`omp:packages/agent/src/agent-loop.ts:3190-3229`) | Assume que o provedor sempre emite `id` não vazio e globalmente único (`packages/agent/src/agent-loop.ts:518-533`) |
| Retry de chamadas oneshot / headers HTTP | `retryTransientCompletion` respeita `Retry-After` / `retry-after-ms`, teto `maxDelayMs` e falha rápida para overflow/bloqueio (`omp:packages/ai/src/oneshot-retry.ts:93-243`) | `retryAssistantCall` usa apenas `retryDelayMs` cego e padrão textual sem ler cabeçalhos HTTP (`packages/ai/src/utils/retry.ts:186-299`) |

## Benefício

- **Problema**: (1) modelos/proxies que reutilizam `id: "call_1"` em dois turnos distintos corrompem a sessão inteira com erro permanente de API (`duplicate tool_use id`) sem auto-cura possível após persistido; (2) chamadas oneshot como compactação ignoram `Retry-After` no HTTP 429, batendo de volta no servidor durante a janela de bloqueio ou queimando retries num `ContextOverflow` determinístico.
- **Rastro**: `AgentLoop` despacha cada bloco em `assistantMessage.content` e grava o `toolResult` pareado por `toolCallId`; se `id` vier duplicado antes do despacho, corrigi-lo no boundary preserva 100% da validade do histórico. Em `retryAssistantCall`, `isRetryableAssistantError` já filtra vários padrões por regex, mas não respeita hints HTTP nem limita `Retry-After` excessivo.
- **Solução**: portar `ensureUniqueToolCallIds` para `packages/agent/src/agent-loop.ts` (semeando `dispatchedIds` com os `toolCall.id` presentes nas mensagens de contexto recebidas no início do loop) e adicionar parsing de `Retry-After` / `retry-after-ms` com curto-circuito acima de `maxDelayMs` em `packages/ai/src/utils/retry.ts`.

## Custo

- **Tokens / turno**: **0**.
- **Latência**: **0 ms** no caminho feliz; no 429 reduz retries desperdiçados.
- **Manutenção**: ~80 LOC TS puro entre `agent-loop.ts` e `retry.ts`, zero deps.

## Riscos

- **Limite de comprimento de `toolCall.id` por provedor**: OpenAI impõe teto de 40 caracteres em `tool_call.id`; por isso `appendDuplicateSuffix` do `omp` trunca a base respeitando `MAX_TOOL_CALL_ID_LENGTH` ao acrescentar `_dup1` — replicar esse teto exatamente para não causar HTTP 400 por ID longo.
- **Assinaturas/hashes externos**: apenas alterar IDs quando houver colisão real ou ID vazio (no caso normal único, `block.id` permanece 100% intocado).

## Licença

**MIT** (`omp:LICENSE:1-23`). Padrão reescrito em TS enxuto.

## Proposta

- **`packages/agent/src/agent-loop.ts`**: semear `dispatchedIds: Set<string>` com os `toolCall`s das mensagens de entrada e executar `ensureUniqueToolCallIds` antes do despacho de ferramentas de cada mensagem assistente, respeitando teto de 40 chars em `_dupN`.
- **`packages/ai/src/utils/retry.ts`**: adicionar extração segura de `retry-after-ms` / `Retry-After` (segundos ou HTTP-date) em `retryAssistantCall`, respeitando jitter e abortando se o hint exceder `maxDelayMs`.

## Testes

- `packages/agent/test/`: novo teste com dois turnos emitindo `id: "call_1"` (e batch com dois `"call_1"` no mesmo turno, além de ID de 40 caracteres), validando que todos os `toolResult` recebem IDs distintos `<= 40` chars e sem tocar IDs já únicos.
- `packages/ai/test/retry.test.ts`: casos testando `Retry-After` numérico, `retry-after-ms` na mensagem/header e desistência imediata quando `Retry-After > maxDelayMs`.

## Plano de eval

Não aplicável (Classe A: comportamento idêntico em todas as respostas bem-formadas; atua somente contra IDs colididos e headers 429).

## Critérios de aceite

1. IDs duplicados ou vazios no mesmo turno ou entre turnos passam a receber IDs únicos válidos (`<= 40` chars).
2. `retryAssistantCall` obedece `Retry-After` dentro do teto e aborta sem dormir além de `maxDelayMs`.
3. `packages/agent` e `packages/ai` passam nos testes Vitest existentes e novos.

## Rollback

Reverter as duas funções em `packages/agent/src/agent-loop.ts` e `packages/ai/src/utils/retry.ts`.
