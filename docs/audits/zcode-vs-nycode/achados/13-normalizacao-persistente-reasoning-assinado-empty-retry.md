# Achado 13: Normalizacao Persistente de `reasoning` Assinado e Retry de Conclusao Vazia

- **Classe**: **B** (modifica mensagens reenviadas em fallback multi-modelo e reenvia chamadas de turno quando o modelo retorna 0 texto/tools/usage; exige eval)
- **Prioridade**: **P2 (Alta robustez em fluxos com fallback de modelo e thinking)**

## Problema

Em sessoes que alternam modelos ou provedores no meio da conversa (ou sofrem troca apos rate limit / failover / `/model`), blocos criptografados/assinados de `thinking` / `redacted_thinking` de um modelo A podem causar erro `400` (`invalid_encrypted_content` / `thinking prefix mismatch`) ao serem reenviados ao modelo B. Se o harness apenas remover o bloco em memoria na tentativa atual, o erro `400` repete em **todos os turnos seguintes**. Alem disso, providers ocasionalmente encerram um stream HTTP 200 com resposta totalmente vazia (0 texto, 0 tool calls, 0 usage), abortando a sessao inutilmente.

## O que o ZCode faz (`~/source/zcode-ref`)

- **Arquivos e linhas**: `apps/zcode-cli/packages/adapters/src/model/reasoning-history-normalization.ts:50-100` e `apps/zcode-cli/packages/adapters/src/model/empty-completion-retry.ts:14-60` (`~/source/zcode-ref`).
- **Mecanismo concreto**:
  1. `normalizeReasoningHistory` (`reasoning-history-normalization.ts:50-66`) remove `thinking` assinado/redacted de outros grupos de modelo (`REASONING_PROVIDER_GROUPS`), remove trailing reasoning orfao, evita assistente vazio (`(no content)`) apos filtro, e introduz o marcador **`signedReasoningReset: true`** nas mensagens reparadas (`removeReasoningBeforeRepairMarker`, `:75-86`) para que todo o prefixo anterior ao reparo continue normalizado nos turnos futuros — evitando pagar um `400` repetido em cada turno subsequente.
  2. `canRetryEmptyCompletion` / `scheduleEmptyCompletionRetry` (`empty-completion-retry.ts:14-60`): se uma requisicao termina sem texto, sem tool calls e sem tokens de uso (`EMPTY_COMPLETION_MESSAGE`), agenda automaticamente **1 retry** (`EMPTY_COMPLETION_MAX_RETRIES = 1`) respeitando o cooldown e `maxAttempts`.

## Como o nycode faz hoje (`~/source/nycode-audit-zcode`)

- **Arquivos e linhas**: `packages/ai/src/utils/retry.ts:275-315`, `packages/coding-agent/src/extensions/auto-resume/index.ts:36-45`, e `packages/coding-agent/src/core/agent-session.ts:3931-3935`.
- `nycode` normaliza contexto entre providers em `@nycode/ai` e tem `auto-resume` excelente para mensagens encerradas com `stopReason === "error"`. Porem:
  - Quando a resposta vazia vem com `stopReason === "stop"` (sem `"error"`), `isRetryableAssistantError` (`retry.ts:311`) retorna `false` (`if (message.stopReason !== "error" ...)`), encerrando a resposta em silencio sem retentar uma vez;
  - Se um provedor rejeitar assinatura de `thinking` criptografado apos failover de rota/gateway, falta uma marcacao persistente no historico projetado equivalente a `signedReasoningReset` / `appendContextEdit`.

## Diferenca concreta

- **Necessario**:
  1. Tratar resposta vazia anomala (0 blocos uteis e 0 usage/output tokens em `stopReason === "stop"`) como falha retryavel com teto rigido `max 1` tentativa no loop/agent;
  2. Registrar via `ContextEditEntry` ou flag de normalizacao na projecao quando um `invalid_encrypted_content` / erro de assinatura `thinking` exigir remocao do bloco anterior para nao repetir `400` em turnos seguintes.
- **Complexidade opcional**: nao portar `REASONING_PROVIDER_GROUPS` especificos de contas BigModel/Z.ai nem todo `transform.ts` do ZCode.

## Beneficio esperado

- Elimina falhas silenciosas em respostas vazias raras de streaming HTTP 200.
- Corta 1 roundtrip `400` desperdicado por turno apos mudanca de endpoint/chave mantendo cache de prefixo estavel do ponto de reparo em diante.

## Custo

- **Tokens/turno**: **0** no caso normal; em resposta vazia ocasional evita o usuario ter que reenviar prompt manualmente; reparo de thinking remove blocos assinados antigos do historico projetado (economiza tokens invalidos + evita `400`).
- **Latencia**: 1 backoff curto somente em caso real de resposta totalmente vazia.
- **Manutencao**: baixa (~60–90 linhas em `packages/agent/src/agent-loop.ts` / `packages/ai/src/` e `agent-session.ts`).

## Riscos e armadilhas

- **Cuidado**: respostas intencionais de modelos em que `stopReason === "stop"` tem 0 tokens de texto visivel mas **teve tokens de reasoning validos** (`thinking` nao vazio) ou usage > 0 NAO devem ser retentadas cegamente como vazias — por isso a regra do ZCode checa rigorosamente ausencia de texto + tool calls + usage (`EMPTY_COMPLETION_MESSAGE` em `empty-completion-retry.ts:15-16`).

## Licenca e proveniencia

- Referencia ZCode **Apache-2.0** (`~/source/zcode-ref/LICENSE:1-202`). Implementacao limpa no `@nycode/ai` e `@nycode/coding-agent`.

## Proposta de desenho no nycode

- `packages/coding-agent/src/core/agent-session.ts`: detectar conclusao completamente vazia (`content` sem texto/toolCall e `output === 0`) e disparar 1 retry controlado sem quebrar `auto_retry` existente.
- Quando erro `400` mencionar assinatura/encrypted reasoning invalido em turnos apos troca de provider/model, emitir `appendContextEdit` limpando blocos de thinking anteriores na branch atual.

## Testes previstos

- `packages/coding-agent/test/suite/` com provider `faux`:
  1. Resposta `stopReason: "stop"`, `content: []`, `usage: { output: 0 }` -> retenta exatamente 1 vez; se continuar vazia na 2a, para sem loop infinito;
  2. Erro mockado `invalid_encrypted_content` -> limpa thinking historico e o turno seguinte nao repete `400`.

## Plano de eval (`packages/evals` / `bench/`)

- **Baseline vs Candidato**: replay sobre falhas sinteticas de stream + subconjunto `bench/faults/` (`bench/faults/injector.py` injetando 1 resposta vazia e 1 troca de modelo mid-session em tarefas do `bench/suites.toml`), verificando recuperacao 100% vs falha no baseline e garantindo 0 retries falsos em sessoes saudaveis. Sem reexecucao de referencia vanilla (`docs/bench/RUNBOOK.md`).

## Criterios de aceite e rollback

- **Aceite**: zero falsos positivos de retry quando ha output/thinking/usage valido; recuperacao automatica em 1 tentativa nas injeccoes de falha vazia e troca de modelo.
- **Rollback**: remover a condicao no retry de `agent-session.ts` e o reparo de thinking.
