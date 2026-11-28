# Achado 02: Harness Offline de Continuidade de Prefixo de Prompt Cache (`prompt-trajectory`)

- **Classe**: **A** (0 tokens extras no modelo; zero alteracao no runtime ou nos prompts reais)
- **Prioridade**: **P1 (Alta dentro da Classe A)**

## Problema

Regressoes silenciosas que invalidam prompt cache (mudar ordem de blocos, reescrever timestamps/IDs, mutar conteudo de mensagem user ja enviada, reordenar propriedades de tools ou alternar textos condicionais entre turnos) nao causam erro HTTP nem falham testes funcionais comuns, mas multiplicam o custo de input e dobram o TTFT em sessoes longas.

## O que o ZCode faz (`~/source/zcode-ref`)

- **Arquivos e linhas**: `apps/zcode-cli/tools/prompt-trajectory/src/message-continuity.ts:5-100` e `apps/zcode-cli/packages/core/src/runtime/methods/turn-model-step-usage.ts:80-165` (`~/source/zcode-ref`).
- **Mecanismo concreto**:
  1. `isAppendOnly(previous, next, options)` (`message-continuity.ts:5-20`) verifica deterministamente entre requisicoes consecutivas `T_n` e `T_{n+1}` se **todas as mensagens anteriores permanecem identicas** apos normalizacao (`removeCacheControl`) — aceitando apenas anexos em `user` via `isUserContentAppend` (`message-continuity.ts:90-100`), jamais mutacao ou remocao silenciosa no meio do prefixo.
  2. `completeAssistantMessage` (`message-continuity.ts:22-50`) reconcilia blocos `thinking`/`redacted_thinking` e espacos filtrados antes de validar continuidade.
  3. No runtime, `mainTurnCacheHitAggregate` (`turn-model-step-usage.ts:149-158`) agrega hits acumulados por sessao, sobrevivendo inclusive a `resume` e `rewind` (`resume.ts:260`, `rewind-message.ts:735`).

```typescript
// ~/source/zcode-ref/apps/zcode-cli/tools/prompt-trajectory/src/message-continuity.ts:14-20
if (next.length < previous.length) return false;
return previous.every(
  (message, index) =>
    isTrajectoryMessageEqual(message, next[index]) ||
    (index === previous.length - 1 && isUserContentAppend(message, next[index])),
);
```

## Como o nycode faz hoje (`~/source/nycode-audit-zcode`)

- **Arquivos e linhas**: `packages/coding-agent/src/core/cache-stats.ts:1-60`, `packages/ai/src/api/anthropic-messages.ts:322-385`, `packages/coding-agent/src/extensions/prefix-cache-1h/index.ts:19-47`, e `packages/coding-agent/src/core/agent-session.ts:1870-1898`.
- `nycode` ja tem excelente infraestrutura de runtime: `cache-stats.ts` estima desperdicio de cache em tokens e dolares por sessao (`CACHE_TTL_MS`, `NOISE_FLOOR_TOKENS=1024`), `anthropic-messages.ts` verifica prefixo por hash (`hashThreadPrefix`) para `thread.continue`, e `prefix-cache-1h` promove o prefixo `tools+system` a TTL de 1h em sessoes interativas.
- Porem, na camada de harness (`packages/coding-agent/test/suite/` com provider faux), nao ha um gate generico estilo `isAppendOnly` que registre todas as requisicoes enviadas ao `StreamFn` mockado durante cenarios multi-turno (tool calls, `tool_search`, alternancia de extensoes, `prepareRequest`, `steer`, `goal`) e falhe automaticamente se o prefixo byte-a-byte entre turnos regredir fora de fronteiras autorizadas de compactacao.

## Diferenca concreta

- **Necessario**: funcao pura de verificacao `assertPromptPrefixAppendOnly(capturedRequests, allowedResetIndices)` para a suite Vitest `packages/coding-agent/test/suite/` sobre provider faux.
- **Opcional a descartar**: o pacote inteiro `tools/prompt-trajectory` do ZCode com CLI separado e proxy HTTP OpenAI (`openai-provider-proxy.ts`) e pesado para as necessidades do `nycode`, pois `packages/coding-agent/test/suite/harness.ts` ja intercepta o `streamFn` em memoria.

## Beneficio esperado

- Detecta no momento da mudanca (em ms, offline, custo zero de API) qualquer PR que quebre cache de `system`, `tools` ou mensagens historicas entre turnos.

## Custo

- **Tokens/turno**: **0** (`o200k_base`, executa apenas em `test/suite`).
- **Latencia de sessao**: **0 ms**.
- **Manutencao**: muito baixa (~90 linhas de helper em `packages/coding-agent/test/suite/`).

## Riscos e armadilhas

- Ignorar propositalmente eventos de `compaction`, troca voluntaria de modelo (`/model`) e edicoes explicitas (`context_edit`), documentando exatamente esses eventos como fronteiras validas de reset do prefixo para evitar testes frageis.

## Licenca e proveniencia

- Referencia ZCode sob **Apache-2.0** (`~/source/zcode-ref/LICENSE:1-202`). Implementacao limpa especifica para os formatos `Context` e `SystemMessage` do `@nycode/ai`.

## Proposta de desenho no nycode

- Criar helper local em `packages/coding-agent/test/suite/prefix-continuity.ts` inspecionando `capturedRequests[]` retornados pelo provider `faux` (`packages/ai/src/providers/faux.ts`).
- Adicionar casos na suite de regressoes multi-turno (`agent_loop` + `tool_search` + `goal` + `steering` + `subagent`) exigindo `isAppendOnly(req[i], req[i+1]) === true` fora de eventos `compaction`.

## Testes previstos

- `packages/coding-agent/test/suite/prefix-continuity.test.ts` rodando via Vitest com provider `faux` (zero chamadas reais de API).

## Plano de eval

- **Classe A — sem eval pago**: validacao 100% offline e deterministica comparando os payloads serializados por `@nycode/ai` antes e depois de cenarios multi-turno sinteticos, medindo taxa esperada de reutilizacao de prefixo (100% nos trechos sem compactacao).

## Criterios de aceite e rollback

- **Aceite**: suite Vitest nova passando em <2s no `./test.sh` sem flakes e falhando intencionalmente quando um timestamp sintetico e injetado no `system` no turno 2.
- **Rollback**: apagar o arquivo de teste e helper sob `packages/coding-agent/test/suite/`.
