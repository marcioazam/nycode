# Achado 07: Circuit Breaker `rapid_refill` + Falhas Consecutivas contra Thrashing de Auto-Compaction

- **Classe**: **B** (altera o comportamento de interrupcao/parada do loop de compactacao automatica; exige verificacao por eval antes de ativar por padrao)
- **Prioridade**: **P1 (Mais alto ROI na Classe B)**

## Problema

Quando instrucoes de sistema + um `AGENTS.md` grande + 1 ou 2 chamadas de ferramenta com saida longa preenchem novamente o contexto logo apos uma compactacao, `shouldCompact(contextTokens, contextWindow, settings)` volta a disparar em loop apertado: `compacta -> roda 1 tool -> compacta de novo -> roda 1 tool`, queimando dezenas de milhares de tokens de resumo e degradando o historico a cada ciclo. Um circuito parecido ocorre quando a propria chamada de resumo falha repetidamente.

## O que o ZCode faz (`~/source/zcode-ref`)

- **Arquivos e linhas**: `apps/zcode-cli/packages/core/src/compact/policy.ts:1-167`, `apps/zcode-cli/packages/core/src/runtime/methods/turn-loop-state.ts:25-26,185-218`, e `apps/zcode-cli/packages/core/src/runtime/methods/compact.ts:197-235` (`~/source/zcode-ref`).
- **Traco concreto**:
  1. Em `policy.ts`, ZCode define `MAX_CONSECUTIVE_AUTOCOMPACT_FAILURES = 3` (`shouldAutoCompact` aborta novas tentativas automaticas apos 3 falhas seguidas) e reserva `AUTOCOMPACT_BUFFER_TOKENS = 13_000` mais `outputReserveTokens` proporcional.
  2. Em `turn-loop-state.ts:25-26,185-209`, rastreia `toolTurnsSinceCompact` e `consecutiveRapidRefills`. Se ocorrer nova auto-compactacao com `toolTurnsSinceCompact < RAPID_REFILL_TOOL_TURN_THRESHOLD` (`3` lotes de tools), `consecutiveRapidRefills` incrementa; ao atingir `MAX_CONSECUTIVE_RAPID_REFILLS` (`3`), `autoCompactIfNeeded` retorna `"rapid_refill_blocked"` (`compact.ts:220-235`) e `runRegularTurnLoop` (`turn-loop.ts:187-194`) encerra o turno com erro explicito acionavel ao usuario em vez de entrar em loop infinito caro.

```typescript
// ~/source/zcode-ref/apps/zcode-cli/packages/core/src/runtime/methods/turn-loop-state.ts:185-199
export function evaluateRapidRefill(tracking: CompactLoopTracking | undefined): RapidRefillDecision {
  const toolTurnsSinceCompact = tracking?.toolTurnsSinceCompact ?? 0;
  const consecutiveRapidRefills =
    tracking && toolTurnsSinceCompact < RAPID_REFILL_TOOL_TURN_THRESHOLD
      ? tracking.consecutiveRapidRefills + 1
      : 0;
  return {
    consecutiveRapidRefills,
    shouldBlock: consecutiveRapidRefills >= MAX_CONSECUTIVE_RAPID_REFILLS,
    toolTurnsSinceCompact,
  };
}
```

## Como o nycode faz hoje (`~/source/nycode-audit-zcode`)

- **Arquivos e linhas**: `packages/coding-agent/src/core/agent-session.ts:3232-3260,3294-3328` e `packages/coding-agent/src/core/compaction/compaction.ts:267-270`.
- `nycode` ja possui trava de **1 tentativa** para recuperacao de overflow (`this._overflowRecoveryAttempted` em `agent-session.ts:3232-3256`) e evita repetir imediatamente usando `usageMsg.timestamp <= compactionEntry.timestamp` (`agent-session.ts:3283-3288`).
- Porem, no caminho `"threshold"` (`agent-session.ts:3294-3296`), se cada turno novo produzir um pequeno `usage` atualizado que ainda ultrapassa `contextWindow - settings.reserveTokens` (ou se falhar 5 vezes seguidas na API de sumarizacao durante longas execucoes com `/goal`), nao ha contador persistente no ciclo de `consecutiveThresholdFailures` nem `consecutiveRapidRefills < 3 tool turns`.

## Diferenca concreta

- **Necessario**: manter estado `compactTracking` em `AgentSession` contando lotes de `tool_execution` completos desde a ultima compactacao `"threshold"` (`toolTurnsSinceCompact`) e falhas consecutivas de `_runAutoCompaction`; bloquear apenas quando `consecutiveRapidRefills >= 3` ou `consecutiveAutoCompactFailures >= 3` emitindo erro/evento claro no loop.
- **Complexidade opcional a evitar**: nao precisamos duplicar toda a camada `CompactLoopTracking` em eventos SQLite; estado em memoria de sessao resetado em `/compact` manual ou troca de ramo e suficiente.

## Beneficio esperado

- Limita o pior caso de custo/latencia em sessoes near-limit (como tarefas longas de Terminal-Bench com arquivos enormes), impedindo gasto descontrolado de tokens de sumarizacao em cascata.

## Custo

- **Tokens/turno**: **0** em operacao normal (`o200k_base`); economia drastica nos cenarios patologicos de refill rapido.
- **Latencia**: **0 ms** no caminho normal.
- **Manutencao**: muito baixa (~35 linhas em `agent-session.ts` + interface de evento opcional).

## Riscos e armadilhas

- Em sessoes legitimas muito densas com modelo de janela pequena (ex.: 32k), bloquear cedo demais pode interromper uma tarefa recuperavel -> mitigavel tornando o breaker configuravel e disparando somente apos 3 ciclos curtos consecutivos (`< 3` tool batches cada).
- Classificado como **Classe B** justamente porque altera o criterio de parada do loop em condicoes extremas.

## Licenca e proveniencia

- Ideia e constantes de `~/source/zcode-ref/apps/zcode-cli/packages/core/src/runtime/methods/turn-loop-state.ts` (**Apache-2.0**, `~/source/zcode-ref/LICENSE:1-202`). Implementacao limpa no `nycode`.

## Proposta de desenho no nycode

- `packages/coding-agent/src/core/agent-session.ts`: adicionar `_consecutiveAutoCompactFailures` e `_rapidRefillCount` / `_toolTurnsSinceCompact` zerados quando `toolTurns >= 3`, em `/compact` manual bem-sucedido ou troca de ramo.
- Em `_runAutoCompaction("threshold", ...)`: checar os contadores antes de chamar `_runDefaultCompaction` e emitir aviso via `_emitSessionCompactFailed`.

## Testes previstos

- `packages/coding-agent/test/agent-session-auto-compaction-queue.test.ts`: simular 3 compactions `"threshold"` seguidas separadas por apenas 1 tool call que volta a estourar o threshold -> a 4a tentativa deve bloquear com erro explicito sem chamar `completeSummarization`; simular 3 falhas seguidas -> trava ate acao do usuario.

## Plano de eval (`bench/` / `packages/evals`, conforme `docs/bench/RUNBOOK.md`)

- **Baseline vs Candidato**: executar recorte focado de tarefas longas de `bench/` (`suites.toml` -> tarefas de contexto longo em `tb2.json` / `swebenchpro.json` propensas a compactacoes multiplas, mais micro-suite sintetica em `packages/evals` com janela artificialmente reduzida para forcar overflow rapido), comparando `nycode` baseline vs candidato com breaker (sem reexecutar referencia vanilla, usando dados guardados em `docs/bench/BASELINE-VANILLA-2026-11.json` quando aplicavel).
- **Metricas**: numero de auto-compactions por tarefa, tokens totais consumidos em sumarizacao, taxa de conclusao/assertividade (AHEAD_P) e ocorrencias de bloqueio falso-positivo em tarefas saudaveis (deve ser 0).

## Criterios de aceite e rollback

- **Aceite**: zero falso-positivos em tarefas que passam no baseline, reducao de ciclos patologicos para <=3 nos testes sinteticos e todos os testes de regressao de `agent-session-auto-compaction` verdes.
- **Rollback**: reverter os contadores e a guarda no `_runAutoCompaction` em `agent-session.ts`.
