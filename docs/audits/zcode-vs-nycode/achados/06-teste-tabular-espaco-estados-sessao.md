# Achado 06: Teste Tabular de Espaco de Estados de Sessao (Inspirado em `formal-proof`)

- **Classe**: **A** (0 tokens extras; somente artefato de teste estatico/unitario, nenhum impacto no runtime)
- **Prioridade**: **P3 (Media-Baixa dentro da Classe A)**

## Problema

Maquinas de estado compostas por features ortogonais (`running`, `compacting`, `auto-resume`, `goal`, `steering` na fila, `/fork` ou `context_edit`) acumulam dezenas de combinacoes de borda dificeis de cobrir com testes ad-hoc escritos um a um. Bugs aparecem justamente em celulas nunca testadas dessa matriz (por exemplo, `goal` tentando avaliar enquanto uma `compaction` de overflow reescreveu mensagens).

## O que o ZCode faz (`~/source/zcode-ref`)

- **Arquivos e linhas**: `packages/formal-proof/src/model.ts:1-100` e `packages/formal-proof/src/main.ts:1-100` (`~/source/zcode-ref`).
- **Mecanismo concreto**: Apesar do nome grandioso, `packages/formal-proof` **nao usa prover formal** (Lean, TLA+ ou Z3). Trata-se de uma aplicacao Vite + D3 (`model.ts` de 918 linhas + `main.ts` de 905 linhas) que define dimensoes discretas de estado de produto (`RunPhase`, `QueueState`, `CompactMemory`, `GoalState`, `TurnTarget`, `forked`), gera o produto cartesiano de acoes candidatas (`user`, `system`), poda estados invalidos via funcoes guard e marca transicoes ainda nao especificadas como `DecisionKind = "undefined"` para exportacao como casos de teste E2E.

```typescript
// ~/source/zcode-ref/packages/formal-proof/src/model.ts:1-20
export type RunPhase = "idle" | "running" | "completed" | "compacting" | "goalVerifying";
export type QueueState = "empty" | "text" | "goal" | "compact" | "mixed";
export type CompactMemory = "never" | "compactable" | "justCompacted" | "notNeeded";
export type GoalState = "none" | "active" | "verifying" | "verified" | "failed";
...
export type DecisionKind = "allow" | "reject" | "enqueue" | "choice" | "system" | "undefined";
```

## Como o nycode faz hoje (`~/source/nycode-audit-zcode`)

- **Arquivos e linhas**: `packages/coding-agent/test/agent-session-auto-compaction-queue.test.ts` (referenciado em `/tmp/zcode-audit/cg/06-compaction-memory.txt:7`) e `packages/coding-agent/src/extensions/goal/index.ts`.
- `nycode` testa cenarios criticos com excelencia em Vitest e testes de integracao de `AgentSession` + extensoes, mas cada transicao e listada manualmente como `it(...)`, sem um enumerador combinatorio tabular pequeno que obrigue toda combinacao nova `(phase x goal x compaction x queue)` a ter decisao explicita (`allow`/`defer`/`ignore`) e verificacao automatizada contra a implementacao real.

## Diferenca concreta

- **Necessario**: extrair apenas a ideia de **enumerador cartesiano em ~120 linhas dentro de um arquivo `.test.ts`** testando o contrato real de `AgentSession` + `goal` + `auto-resume` + `compaction` usando o provider `faux`.
- **Opcional a rejeitar**: toda a interface web Vite + D3 + revisao em `localStorage` (`packages/formal-proof/src/main.ts`) e totalmente fora de escopo para um harness CLI minimalista.

## Beneficio esperado

- Garante cobertura combinatoria de invariantes de estado (zero transicoes `"undefined"` ocultas) sem inflar codigo de producao.

## Custo

- **Tokens/turno**: **0** (`o200k_base`).
- **Latencia**: +<0.5 s apenas na execucao da suite de testes unitarios.
- **Manutencao**: muito baixa (1 arquivo de teste auto-contido sob `packages/coding-agent/test/suite/`).

## Riscos e armadilhas

- Combinatoria excessiva tornar o teste lento se enumerar dezenas de dimensoes de produto. Manter em 4–5 dimensoes ortogonais essenciais (<64 estados alcancaveis por rodada).

## Licenca e proveniencia

- Inspiracao conceitual de `packages/formal-proof/src/model.ts` (**Apache-2.0**, `~/source/zcode-ref/LICENSE:1-202`), sem copiar codigo da UI.

## Proposta de desenho no nycode

- Criar `packages/coding-agent/test/suite/session-state-matrix.test.ts` enumerando estados reais `(idle|running|compacting) x (goal:none|active) x (queue:empty|steer|followUp) x (lastTurn:ok|overflow|transientError)` e exercitando as decisoes de `AgentSession` / hooks com assertions deterministicos.

## Testes previstos

- O proprio `session-state-matrix.test.ts` rodando via Vitest no `./test.sh`.

## Plano de eval

- **Classe A — verificacao deterministica offline**: zero chamadas de API reais, 100% reproduzivel no harness `faux`.

## Criterios de aceite e rollback

- **Aceite**: zero combinacoes nao cobertas na tabela de decisoes e `./test.sh` passando integralmente.
- **Rollback**: remover o arquivo `.test.ts`.
