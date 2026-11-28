# Achado 09 — Execução Híbrida `RwLock` (Leitura Paralela / Escrita Exclusiva) e Dispatch em Streaming

- **Classificação**: **Classe B** (altera o orquestrador de execução de ferramentas em `agent-loop.ts` e semântica temporal de bloqueio intra-turno).
- **Prioridade no backlog**: #12 (Classe B — **P2**).

## 1. Como o Codex faz

No loop de streaming de turno do Codex (`codex-rs/core/src/session/turn.rs:3145-3225` e `codex-rs/core/src/tools/parallel.rs:53-61,346-361`), as chamadas de ferramenta usam uma fila ordenada `FuturesOrdered` (`in_flight`) combinada a `ToolCallRuntime` com um `Arc<RwLock<()>>` (`parallel_execution`):

```rust
// codex-rs/core/src/tools/parallel.rs:53-61 e 346-361
#[derive(Clone)]
pub(crate) struct ToolCallRuntime {
    session: Arc<Session>,
    pub(crate) step_context: Arc<StepContext>,
    tracker: SharedTurnDiffTracker,
    parallel_execution: Arc<RwLock<()>>,
    timing: Option<DirectToolTiming>,
}
...
                    let guard = if supports_parallel {
                        Either::Left(
                            lock.read()
                                .instrument(trace_span!("tool_dispatch.parallel_lock"))
                                .await,
                        )
                    } else {
                        Either::Right(
                            lock.write()
                                .instrument(trace_span!("tool_dispatch.exclusive_lock"))
                                .await,
                        )
                    };
```

Quando o modelo emite `N` leituras/buscas seguidas no stream, elas executam concorrentemente com read locks (`lock.read()`), e uma mutação/bash exclusiva adquire `lock.write()` para serializar sobre as leituras/escritas em voo, enquanto `in_flight` coleta os resultados na ordem original do turno.

## 2. Como o `nycode` faz

1. **Execução pós-stream sequencial por padrão no loop principal**: em `packages/agent/src/agent-loop.ts:424-465`, `streamAssistantResponse` consome todo o stream da mensagem do assistente até `done`/`error` antes de `agentLoop` processar as `toolCalls`.
2. **Fila de mutação por caminho (`packages/coding-agent/src/core/tools/file-mutation-queue.ts:32-61`)**: o `nycode` já possui `withFileMutationQueue(filePath, fn)` serializando escritas apenas por arquivo de destino (`realpath`), permitindo paralelos em arquivos distintos. Porém, não há controle read-write global distinguindo leitores (`read`, `grep`, `find`, `ls`) de ferramentas que podem mutar estado compartilhado arbitráriamente (`bash`, `codemode`) quando `toolCalls` paralelas chegam juntas.

## 3. Diferença Concreta

Enquanto `file-mutation-queue.ts` evita corrida entre `edit A` e `edit A`, se o modelo emitir `[read foo.ts, bash("sed ...")]` ou `5` chamadas `read`/`grep` enquanto eventos ainda chegam no WebSocket/SSE, o `nycode` espera a resposta inteira terminar para iniciar qualquer tool (aumentando o tempo total de parede em batches I/O-bound).

## 4. Benefício e Custo

- **Benefício**: reduz tempo de parede em batches de exploração (`read`/`grep`/`find`) durante a geração de múltiplos `toolCall` e evita corridas sutis entre `bash` mutador e leituras concorrentes.
- **Custo em tokens**: `0` tokens por turno.
- **Custo em latência**: redução de latência ponta a ponta em turnos com múltiplas chamadas de leitura/busca de arquivos ou ferramentas I/O.
- **Custo de manutenção**: médio (~150 linhas em `agent-loop.ts` + declaração `isReadOnly` / `supportsParallel` nas metadata de `ToolDefinition`, respeitando ordenação estrita dos eventos `tool_execution_start`/`end` na UI).

## 5. Riscos e Licença

- **Riscos**: iniciar uma ferramenta *antes* de o usuário cancelar ou antes de um erro tardio no stream exigir replay/descarte complexo; além disso, aprovações interativas (`ctx.ui.confirm`) não devem abrir múltiplos diálogos simultâneos na TUI. Mitigação: começar apenas com `supportsParallel: true` + `RwLock` leve para execução paralela pós-`toolcall_end` (disparo imediato somente para tools puramente read-only e sem UI modal), drenando em `FuturesOrdered` equivalente antes de continuar.
- **Licença**: Codex (`Apache-2.0`, `LICENSE:1-201`); implementado nativamente com Promises/`RwLock` leve em TypeScript.

## 6. Proposta Técnica e Plano de Eval (Obrigatório — Classe B)

- **Arquivos a tocar no `nycode`**:
  - `packages/agent/src/agent-loop.ts`: suportar execução escalonada em lotes ou dispatch antecipado opcional para tools read-only após `toolcall_end` validado, sincronizando por `AsyncRwLock` (`readLock` para leituras seguras, `writeLock` para mutações/shell).
  - `packages/coding-agent/src/core/tools/`: anotar `parallelSafe: true` nas tools somente-leitura (`read`, `grep`, `find`, `ls`).
- **Testes unitários**:
  - Ordem determinística das entradas `toolResult` no transcript igual à ordem do `assistantMessage` mesmo quando uma leitura posterior termina antes da anterior; `writeLock` de `bash` aguarda leituras em curso e bloqueia leituras subsequentes até terminar.
- **Plano de Eval (Classe B — pareado)**:
  - **Suites**: **S2 (`terminal-bench@2.0`)** + medição de wall-clock e overhead em **`bench/contract/speed.py`** comparando `nycode` sequencial vs `RwLock` híbrido em lotes com faux provider.
  - **Critério (`docs/bench/RUNBOOK.md`)**: acerto S2 `>= -10 pp`, custo/turnos `<= 1.10`, redução ou empate em tempo de execução local.
- **Critério de aceite**: zero alteração na ordem do histórico + ganho em benchmarks multi-leitura.
- **Rollback**: flag booleana no `agentLoop` revertendo para execução pós-resposta sequencial.
