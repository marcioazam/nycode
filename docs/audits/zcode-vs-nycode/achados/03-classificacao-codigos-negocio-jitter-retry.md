# Achado 03: Classificacao de Codigos de Negocio de Providers e Jitter em Cooldown (`Retry-After`)

- **Classe**: **A** (0 tokens extras; altera apenas tratamento deterministico de erros HTTP/payloads e temporizacao de backoff em retry)
- **Prioridade**: **P1 (Alta dentro da Classe A)**

## Problema

Gateways e providers compativeis com OpenAI/Anthropic (especialmente provedores GLM, BigModel e relays chineses ou corporativos) frequentemente retornam erros de sobrecarga, rede upstream ou erro de modelo nao encontrado encapsulados em respostas JSON com codigo de negocio numerico (`"1234"`, `"500"`, `"1006"`, `"3006"`, `"3007"`) que nao batem em status HTTP simples nem em regexes inglesas de `RETRYABLE_PROVIDER_ERROR_PATTERN`. Alem disso, multiplos requests paralelos que recebem o mesmo header `Retry-After` acordam no mesmo milissegundo e colidem novamente no rate limit.

## O que o ZCode faz (`~/source/zcode-ref`)

- **Arquivos e linhas**: `apps/zcode-cli/packages/adapters/src/model/failure-provider-business-codes.ts:12-100`, `apps/zcode-cli/packages/adapters/src/model/failure-classifier.ts:51-100` e `apps/zcode-cli/packages/adapters/src/model/retry-policy.ts:32-45` (`~/source/zcode-ref`).
- **Mecanismo concreto**:
  1. `PROVIDER_BUSINESS_CODE_MAPPINGS` (`failure-provider-business-codes.ts:53-100`) mapeia codigos estruturados de negocio para categorias tipadas (`retryable: true/false`, `reason`, `retryReason`) — por exemplo, `"500"` -> `ServerError` (retryable), `"1234"` -> erro de rede encapsulado (retryable quando casado com mensagem de rede interna), `"1006"` -> `AuthFailed` (nao retryable via backoff cego), `"3006"` -> `ModelNotFound` (terminal).
  2. `retryWaitJitterSpreadMs(waitMs)` (`retry-policy.ts:32-45`) adiciona um jitter **positivo** de ate `min(waitMs * 0.2, 5_000)` sobre atrasos impostos por `Retry-After` ou cooldown externo, evitando sincronizacao de manada (*thundering herd*) sem nunca reduzir o tempo minimo pedido pelo servidor.

```typescript
// ~/source/zcode-ref/apps/zcode-cli/packages/adapters/src/model/retry-policy.ts:42-45
export function retryWaitJitterSpreadMs(waitMs: number): number {
  if (!Number.isFinite(waitMs) || waitMs <= 0) return 0;
  return Math.min(waitMs * RETRY_WAIT_JITTER_RATIO, RETRY_WAIT_JITTER_MAX_MS);
}
```

## Como o nycode faz hoje (`~/source/nycode-audit-zcode`)

- **Arquivos e linhas**: `packages/ai/src/utils/provider-retry.ts:25-69`, `packages/ai/src/utils/retry.ts:310-315`, e `packages/coding-agent/src/extensions/auto-resume/index.ts:42-80`.
- `provider-retry.ts:53-69` aplica jitter negativo (`1 - random * 0.25`) somente no backoff exponencial local (`0.5 * 2 ** retryIndex`), mas retorna `delayMs` **cru e sem jitter positivo** quando ha header `retry-after-ms` ou `retry-after`. Se subagentes em paralelo receberem `Retry-After: 5`, todos reenviam exatamente aos 5.000 ms.
- `isRetryableAssistantError` (`packages/ai/src/utils/retry.ts:310-315`) depende apenas de `NON_RETRYABLE_PROVIDER_LIMIT_ERROR_PATTERN` / `RETRYABLE_PROVIDER_ERROR_PATTERN` sobre `message.errorMessage`.

## Diferenca concreta

- **Necessario**:
  1. Adicionar jitter positivo de 0 a `min(delayMs * 0.2, 5_000)` no retorno de `validateServerRetryDelayMs` / `getRetryDelayMs` em `provider-retry.ts` (respeitando `maxRetryDelayMs` quando definido);
  2. Mapear codigos de negocio de gateways OpenAI-compatible (incluindo `zai` / `minimax` / `qwen` / `deepseek` / `openrouter` ja suportados em `packages/ai/src/providers/`) em tabela explicita no classificador de erros antes de cair na regex generica.
- **Opcional do ZCode**: toda a arquitetura paralela `ModelRetryBudget` (`Unbounded` vs `SingleAttempt`) e eventos `model_status` podem permanecer simplificados nas politicas atuais de `RetryPolicy` do `nycode`.

## Beneficio esperado

- Reduz segundas falhas 429 em rajadas de subagentes paralelos quando recebem `Retry-After` identico.
- Evita gastar 10 retries em erro `"1006"` / `"3006"` terminal e recupera erros `"1234"`/`"500"` embrulhados por proxies GLM/OpenAI-compatible.

## Custo

- **Tokens/turno**: **0** (`o200k_base`).
- **Latencia**: 0 a +5 s apenas durante espera explicita de `Retry-After` apos um erro HTTP 429/5xx.
- **Manutencao**: muito baixa (<60 linhas em `packages/ai/src/utils/`).

## Riscos e armadilhas

- Garantir que `delayMs + jitter` nunca ultrapasse `maxRetryDelayMs` quando `maxRetryDelayMs > 0` (`validateServerRetryDelayMs`), e nunca atrase erros marcados explicitamente como nao retryables em `noRetryStatuses`.

## Licenca e proveniencia

- Codigo ZCode **Apache-2.0** (`~/source/zcode-ref/LICENSE:1-202`). Implementacao independente em `packages/ai/src/utils/` verificando `packages/ai/test/provider-retry.test.ts`.

## Proposta de desenho no nycode

- Atualizar `packages/ai/src/utils/provider-retry.ts:53-69` para somar jitter positivo ate `min(waitMs * 0.2, 5_000)` aos delays de `Retry-After` / `retry-after-ms`.
- Adicionar mapa de codigos estruturados de gateway em `packages/ai/src/utils/retry.ts` (ou modulo irmao) consumido por `isRetryableAssistantError`.

## Testes previstos

- `packages/ai/test/provider-retry.test.ts`: validar intervalo `[delayMs, delayMs + min(delayMs*0.2, 5000)]` com RNG mockado e testar aborto imediato durante sleep.
- Novo teste unitario de classificacao de erro JSON com codigo de negocio (`1234`, `500`, `1006`, `3006`).

## Plano de eval

- **Classe A — verificacao deterministica offline**: nenhum eval em modelo real necessario (nao altera prompts nem selecao de ferramentas). Cobertura completa via `node .../vitest/dist/cli.js --run` sobre fixtures de respostas HTTP/SSE mockadas.

## Criterios de aceite e rollback

- **Aceite**: `provider-retry.test.ts` e suite de `packages/ai/test/` verdes; jitter respeita teto `maxRetryDelayMs` e `AbortSignal`.
- **Rollback**: reverter os dois arquivos em `packages/ai/src/utils/`.
