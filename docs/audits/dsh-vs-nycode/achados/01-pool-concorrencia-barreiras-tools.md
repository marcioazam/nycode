# Achado 01: Pool de concorrência com barreiras e reclassificação dinâmica no batch de tools

## O que o `dsh` faz

O executor de tools do `dsh` limita a concorrência com um pool deslizante (`maxParallelToolCalls = 10` em `packages/core/agent-loop/src/constants.ts:6`) e particiona o lote em trechos contínuos de chamadas seguras para paralelismo separados por chamadas exclusivas (fail-closed: toda tool sem `isConcurrencySafe(args) === true` é exclusiva em `packages/core/tools/src/pipeline.ts:106`). Antes de iniciar cada nova chamada paralela no pool, o escalonador reavalia `executionMode` para capturar mudanças de registro feitas pelos commits já encerrados (`packages/core/tools/src/batch.ts:76-91,186-218`):

```ts
// packages/core/tools/src/batch.ts:79-84,187-193
const first = planned[next]!
const mode = pipeline.executionMode(first.exec).kind
const group = mode === 'parallel' ? planned.slice(next) : [first]
const outcome = await runGroup(
  pipeline, settlement, maxParallelToolCalls ?? maxParallel(), group, mode, signal,
)
...
while (!aborted && nextToStart < group.length && inFlight.size < maxParallelToolCalls) {
  const nextCall = group[nextToStart]!
  if (nextToStart > 0 && mode === 'parallel'
    && pipeline.executionMode(nextCall.exec).kind !== 'parallel') break
```

Além disso, `Promise.race(inFlight.values())` libera imediatamente um slot assim que cada chamada termina, mantendo os resultados ordenados em `commitReady()`.

## Como o `nycode` faz hoje

Em `packages/agent/src/agent-loop.ts:525-533`, se **uma única** tool call do turno tiver `executionMode === "sequential"`, o batch **inteiro** rebaixa para `executeToolCallsSequential`, perdendo o paralelismo de todas as chamadas `read`/`grep`/`find` do mesmo turno. Quando nenhuma é sequencial, `executeToolCallsParallel` dispara todas as chamadas de uma vez com `Promise.all` ilimitado (`packages/agent/src/agent-loop.ts:646-648`):

```ts
// packages/agent/src/agent-loop.ts:526-532,646-648
const hasSequentialToolCall = toolCalls.some(
  (tc) => currentContext.tools?.find((t) => t.name === tc.name)?.executionMode === "sequential",
);
if (config.toolExecution === "sequential" || hasSequentialToolCall) {
  return executeToolCallsSequential(currentContext, assistantMessage, toolCalls, config, signal, emit);
}
return executeToolCallsParallel(currentContext, assistantMessage, toolCalls, config, signal, emit);
```

## Diferença concreta

1. No `dsh`, `[read, read, read, bash, read, read]` executa `[read, read, read]` em paralelo, espera a barreira exclusiva `[bash]`, e depois executa `[read, read]` em paralelo; no `nycode`, se `bash` estiver marcada sequencial no turno, todas as 6 calls rodam em série.
2. No `dsh`, um burst de 40 chamadas paralelas é limitado a `maxParallelToolCalls = 10` em voo; no `nycode`, todas as 40 disparam simultaneamente em `Promise.all` (risco de pico de FDs, processos `rg`/`fd` e I/O).
3. O `dsh` reavalia `executionMode` após cada commit antes de admitir a próxima chamada paralela no pool.

## Classificação

**Classe A** — Nenhuma alteração de prompt, schema, seleção de modelo ou comportamento nominal de turno. Mantém estritamente a mesma ordem lógica dos resultados (`ToolResultMessage[]`) enviada ao modelo, adicionando apenas partição em spans, limite máximo de paralelismo e barreira entre chamadas exclusivas.

## Benefício esperado

- Redução de latência de wall-clock em turnos mistos (ex.: várias leituras antes/depois de uma mutação ou comando sequencial).
- Prevenção de tempestade de subprocessos/descritores quando o modelo emite lotes extensos (20–50 tool calls) em uma única resposta.
- Alinhamento com reclassificações dinâmicas de ferramentas (ex.: extensão ativando/desativando modo exclusivo durante commits anteriores).

## Custo

- **Tokens/turno**: `0` (`o200k_base`).
- **Latência**: neutra ou menor em lotes mistos; pequena fila quando o lote excede `maxParallel` (configurável em `10`).
- **Manutenção**: baixa — alteração confinada ao escalonador de `executeToolCalls` em `packages/agent/src/agent-loop.ts`.

## Riscos e modos de falha

- Deadlock se `Promise.race` falhar em remover índice concluído ou em propagar abort/erros antes de drenar `inFlight`. Mitigação: drenar `Promise.allSettled` antes de lançar, espelhando `packages/core/tools/src/batch.ts:220-222`.
- Alteração acidental da ordem de eventos `tool_execution_end` ou `ToolResultMessage`: garantir array de slots indexado pela posição original da `toolCall`.

## Licença

Código-fonte de referência do `dsh` sob licença **MIT** (`LICENSE:1-21` em `deepseek-harness`). Padrão algorítmico reimplementado nativamente no estilo do `nycode`, sem cópia literal obrigatória nem dependências externas.

## Proposta para o `nycode`

1. Em `packages/agent/src/types.ts`, adicionar opção `maxParallelToolCalls?: number` (padrão `10`) em `AgentLoopConfig` / `AgentOptions`.
2. Em `packages/agent/src/agent-loop.ts:518-533,646-648`, substituir o switch global binário em `executeToolCalls` por:
   - particionamento em trechos contínuos de chamadas não-sequenciais separados por chamadas `executionMode === "sequential"`;
   - pool limitado a `maxParallelToolCalls` usando `Promise.race` e reavaliação da propriedade `executionMode` após cada `finalizeExecutedToolCall` já comitado;
   - emissão ordenada dos `ToolResultMessage` preservando a semântica atual de `before_tool_call` / `after_tool_call`.
3. Manter `config.toolExecution === "sequential"` como override global explícito para compatibilidade com testes/modos que exijam serialização total.

## Testes necessários

- Teste unitário em `packages/agent/test/`:
  - batch `[parallel, parallel, sequential, parallel, parallel]`: verificar sobreposição nos dois blocos paralelos e barreira estrita antes/depois da sequencial;
  - limite `maxParallelToolCalls: 2` com 6 calls: verificar pico exato `active === 2`;
  - reavaliação dinâmica após commit mudando `executionMode` de chamada futura;
  - preservação de ordem de `ToolResultMessage[]` mesmo quando chamada posterior termina antes de chamada anterior;
  - cancelamento por `AbortSignal` mid-pool emitindo resultados ordenados sem pendurar promises.

## Plano de eval

Sem necessidade de eval de assertividade por ser **Classe A** (`0` tokens, zero alteração em prompt/schema/decisão do modelo). Rodar `./test.sh` em `packages/agent` e `packages/coding-agent` + microbenchmark sintético de latência/pico de memória antes/depois (sem gastar tokens de API nem re-executar referências guardadas `cc-vanilla`/`pi-vanilla`).

## Critérios de aceite e rollback

- **Aceite**: `npm run check` e `./test.sh` verdes; picos simultâneos limitados a `maxParallelToolCalls`; nenhum regressão de ordenação em `agent-loop`.
- **Rollback**: reverter a função `executeToolCalls` para a delegação direta anterior em `packages/agent/src/agent-loop.ts`.

## Prioridade

**Alta (P1 entre itens Classe A)** — benefício direto de latência e estabilidade sem nenhum custo em tokens ou risco de regressão semântica.
