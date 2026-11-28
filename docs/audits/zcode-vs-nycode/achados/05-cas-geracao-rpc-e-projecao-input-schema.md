# Achado 05: Geracao de Turno/Branch e Idempotencia `retryOf` / Projecao `io: "input"` em Schemas Zod/TypeBox

- **Classe**: **A** (0 tokens extras quando usada na camada de transporte/harness; nenhuma mudanca no prompt base ou comportamento normal)
- **Prioridade**: **P3 (Media dentro da Classe A)**

## Problema

Dois bugs sutis de estado assincrono ocorrem em harnesses com subagentes, cancelamentos e schemas derivados de validadores:
1. Eventos tardios ou mensagens na fila geradas *antes* de um `fork`/`rewind`/mudanca de execucao (`branchGeneration` / `executionId`) podem contaminar a nova ramificacao ou re-anexar resultados de background stale.
2. Conversores Zod -> JSON Schema sem `{ io: "input" }` marcam campos com `.default(...)` como obrigatorios (`required`) na definicao enviada ao runtime/MCP/tool, criando contradicao com descricoes que dizem "optional".

## O que o ZCode faz (`~/source/zcode-ref`)

- **Arquivos e linhas**: `apps/zcode-cli/packages/core/src/runtime/agent-runtime.ts:385-386`, `apps/zcode-cli/packages/core/src/runtime/command-queue.ts:67-99`, `apps/zcode-cli/packages/core/src/subagent/background-stall.ts:39-69`, e `apps/zcode-cli/packages/core/src/tool/session-control/index.ts:21-44,221-225` (`~/source/zcode-ref`).
- **Mecanismo concreto**:
  1. `runtimeTaskRegistry.setActiveBranchGeneration?.(this.branchGeneration)` (`apps/zcode-cli/packages/core/src/runtime/agent-runtime.ts:386`) e `noteSubagentActivity(..., executionId)` (`apps/zcode-cli/packages/core/src/subagent/background-stall.ts:42-69`): todo evento tardio ou comando enfileirado carrega a geracao/execucao exata e e descartado se a sessao ja deu `rewind` ou avancou para nova `executionId`.
  2. Em `apps/zcode-cli/packages/core/src/tool/session-control/index.ts:221-223`, ZCode projeta `z.toJSONSchema(..., { io: "input" })` especificamente porque a projecao default (`output`) exige campos com `.default()`, e separa `requestIdentity(input, toolCallId)` (`toolCallId` gerado pelo host vs `retryOf` na reconciliacao de timeout).

```typescript
// ~/source/zcode-ref/apps/zcode-cli/packages/core/src/tool/session-control/index.ts:221-223
// io: "input" -- default puts .default() fields into required
inputSchema: z.toJSONSchema(modelFacing(definition.input), { io: "input" }),
```

## Como o nycode faz hoje (`~/source/nycode-audit-zcode`)

- **Arquivos e linhas**: `packages/coding-agent/src/extensions/subagent/core/params.ts:38-44`, `packages/coding-agent/src/core/agent-session.ts:1038-1077`, `packages/coding-agent/src/modes/rpc/rpc-mode.ts:55-99`, e `packages/schema/src/builders.ts`.
- O `nycode` usa `@nycode/schema` e TypeBox (`Type.Optional(..., { default: ... })`), onde `Type.Optional` evita `required`, porem ferramentas externas/MCP registradas via Zod em extensoes ou `@nycode/mcp` podem herdar schemas onde `default` sem `optional` gera incoerencia ou eventos assincronos de `subagent` background apos `/tree` switch precisam de fence por `sessionFile`/`leafId` (`session-manager.ts`).

## Diferenca concreta

- **Necessario**:
  1. Carimbar `leafId` / geracao de turno em notificacoes assincronas de subagentes (`packages/coding-agent/src/extensions/subagent/fleet/inbox.ts`) e comandos `rpc-mode` que enfileiram no loop para descartar respostas orfas apos mudanca de ramo (`/tree`) ou `/new`;
  2. Garantir no adapter Zod -> JSON Schema (se/quando extensoes usarem Zod v4) uso explicito de `{ io: "input" }`.

## Beneficio esperado

- Elimina race conditions onde o usuario faz `/tree` ou `/fork` e recebe injecao retardada de um subagente da ramificacao anterior.
- Garante consistencia estrita de schemas JSON caso extensoes usem Zod v4 com `.default()`.

## Custo

- **Tokens/turno**: **0** (`o200k_base`).
- **Latencia**: **0 ms**.
- **Manutencao**: muito baixa (<40 linhas).

## Riscos e armadilhas

- Nao descartar resultados quando o subagente foi explicitamente lancado para a sessao raiz independente do ramo se o usuario quiser consulta cruzada (aplicar fence por `sessionId + branchEpoch` configurado na criacao da task).

## Licenca e proveniencia

- Referencia ZCode **Apache-2.0** (`~/source/zcode-ref/LICENSE:1-202`). Implementacao nativa no `nycode`.

## Proposta de desenho no nycode

- `packages/coding-agent/src/extensions/subagent/fleet/` (`background.ts` / `inbox.ts`): gravar `branchLeafId` ou `generation` do momento do dispatch e validar antes de injetar notificacao via `sendMessage`.
- `packages/coding-agent/src/extensions/subagent/index.ts`: incrementar `generation` no handler de `session_switch` / `session_tree` / `/new`.

## Testes previstos

- Teste Vitest em `packages/coding-agent/test/harness/extensions/subagent/` simulando tarefa background lancada no ramo A, troca de ramo `/tree` para ramo B, e chegada tardia do resultado do ramo A -> nao deve poluir ramo B.

## Plano de eval

- **Classe A — deterministica**: verificacao por teste unitario de concorrencia em Vitest sem LLM real.

## Criterios de aceite e rollback

- **Aceite**: evento tardio de outra geracao/ramo descartado com log/telemetria limpa e sem re-disparo indesejado no ramo B.
- **Rollback**: remover o campo `generation` e checagem nos handlers de `subagent/fleet/`.
