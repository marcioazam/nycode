# Achado 04: Lease exclusivo de sessão (`flock`), checkpoints fail-closed e recuperação de tool calls em falha

## O que o `dsh` faz

O `dsh` combina três salvaguardas de durabilidade de sessão que não alteram nenhum byte visível ao modelo:

1. **Lease exclusivo no kernel por sessão (`SessionWriteLease`)**: `packages/session/session-persistence-jsonl/src/lease.ts:1-85` adquire `flock(LOCK_EX | LOCK_NB)` em `session.lock` via addon nativo (ou semáforo kernel nomeado no Windows), revalidando o inode após o lock para impedir corrida caso o arquivo tenha sido recriado, e liberando automaticamente se o processo morrer (`SessionAlreadyOwnedError` quando outro processo já detém a escrita).
2. **Checkpoints fail-closed nos limites críticos**: `packages/session/session-checkpoint-policy/src/index.ts:63-83` exige `await ctx.sessions.flush(...)` antes de abrir qualquer stream ao modelo (`llm/stream`), antes de executar qualquer tool top-level (`tools/execute` com `exec.parent === undefined`) e antes de cada passo (`agent/pre-step`), abortando o side-effect se o flush falhar:

   ```ts
   // packages/session/session-checkpoint-policy/src/index.ts:63-75
   export function apply(ctx: Context): void {
     ctx.on('llm/stream', (options, next): AsyncIterable<StreamChunk> => {
       if (options.sessionId === undefined) return next()
       const session = ctx.sessions.get(options.sessionId)
       return session === undefined ? next() : afterCheckpoint(ctx, session, next)
     })

     ctx.on('tools/execute', async (exec, next): Promise<ToolExecutionResult> => {
       if (exec.agent === undefined || exec.parent !== undefined) return next()
       await ctx.sessions.flush(exec.agent.session)
       if (exec.signal.aborted) return abortedBeforeDispatchResult()
       return next()
     })
   ```

3. **Liquidação sintética em falha de step (`ToolCallRecovery`)**: `packages/core/agent-loop/src/agent.ts:359-385` observa eventos do step em voo; se uma exceção derrubar o batch de tools no meio, grava resultados sintéticos de erro (`TOOL_NOT_STARTED` / `TOOL_OUTCOME_UNKNOWN`) para toda `toolCall` pendente antes de propagar o erro, evitando histórico desbalanceado (chamada sem resultado) ao retomar a sessão.

## Como o `nycode` faz hoje

`packages/coding-agent/src/core/session-manager.ts:288-348,1282-1308` persiste sessões em JSONL via writes assíncronos por processo sem lock exclusivo cross-processo em nível de sessão (risco caso duas instâncias CLI/SDK abram `--session <mesmo-id>` simultaneamente) e sem barreira explícita garantindo `flush` síncrono/aguardado antes de despachar comandos destrutivos (`bash`, `write`, `edit`) ou chamadas de modelo. Além disso, o loop em `packages/agent/src/agent-loop.ts:251-287,646-659` só grava `ToolResultMessage` após retornar do batch; uma exceção não capturada no meio de `finalizeExecutedToolCall` pode deixar `assistant` com `toolCall` sem par `toolResult` no histórico em memória antes de o processo encerrar.

## Diferença concreta

- `dsh`: garante exclusão mútua entre escritores do mesmo log no SO (`flock`), durabilidade pré-side-effect (`checkpoint-policy`) e reparo automático do pareamento `tool_use`/`tool_result` em exceção de step.
- `nycode`: confia em fluxo único de processo por arquivo JSONL sem lock de escrita exclusivo e sem garantia formal de flush pré-tool ou liquidação em exceções mid-batch.

## Classificação

**Classe A** — Nenhuma alteração em prompt, tool schema, orçamento de contexto ou comportamento nominal do modelo. Atua exclusivamente sobre consistência transacional em disco, concorrência entre processos do harness e integridade do transcript após falhas inesperadas.

## Benefício esperado

- Impede corrupção silenciosa ou interleaving de JSONL quando dois processos `--resume`/`--session` abrem o mesmo arquivo de sessão.
- Garante que o prompt enviado e os `tool_call` emitidos estejam gravados antes de efeitos colaterais no sistema de arquivos ou na API do provedor.
- Evita sessões irrecuperáveis na Anthropic/OpenAI por erro HTTP `400` de `tool_use` sem `tool_result` correspondente após falha mid-step.

## Custo

- **Tokens/turno**: `0` (`o200k_base`).
- **Latência**: `< 1 ms` para verificação de flush quando o stream de arquivo está em dia; aquisição do lock apenas uma vez na abertura da sessão para escrita.
- **Manutenção**: baixa-média se implementado em TypeScript puro usando `proper-lockfile` (já é dependência em `packages/coding-agent/package.json:62`, como visto em `core/auth-storage.ts` e `core/settings-manager.ts:7`) ou `O_EXCL` sem precisar de addon nativo em C.

## Riscos e modos de falha

- Locks baseados em arquivo sem `flock` kernel (ex.: `proper-lockfile` usa diretório `mtime`/renovação periódica) podem deixar lock obsoleto por até `stale` ms após `SIGKILL` — escolher `stale` curto (ou `flock` se futuro addon existir) e exibir mensagem clara com PID/lock path para `--session` concorrente, mantendo sessões `--fork` e leituras (`SessionManager.list`) completamente livres de lock.
- Bloquear flush antes de cada tool pode travar se o filesystem do `~/.nycode` estiver lento: manter flush restrito à criação do arquivo/buffer pendente já enfileirado (append assíncrono em série), sem `fsync` bloqueante em toda linha.

## Licença

Referência `dsh` sob licença **MIT** (`LICENSE:1-21`). O `nycode` já utiliza `proper-lockfile` (MIT) em `packages/coding-agent/package.json:62`.

## Proposta para o `nycode`

1. Em `packages/coding-agent/src/core/session-manager.ts`:
   - adicionar aquisição opcional de lock de escrita por arquivo de sessão (via `proper-lockfile` já disponível ou helper dedicado, falhando rápido com erro explícito se outro processo estiver escrevendo no mesmo `.jsonl`);
   - expor método `flush(): Promise<void>` aguardando o draining da fila de gravação pendente.
2. Em `packages/coding-agent/src/core/agent-session.ts`, invocar `await this.sessionManager.flush()` antes do despacho da requisição ao provedor e antes de ferramentas top-level com side-effect.
3. Em `packages/agent/src/agent-loop.ts:630-660`, garantir que `try/catch` em volta de execução de lote finalize/emita `ToolResultMessage` (`isError: true`) para qualquer `toolCall` ainda sem resultado caso uma exceção aborte o batch no meio.

## Testes necessários

- Teste unitário em `packages/coding-agent/test/`:
  - duas instâncias abrindo a mesma sessão em modo escrita: segunda falha com erro claro; `--fork` e leitura apenas não bloqueiam;
  - `flush()` completa todos os appends antes do callback pré-tool/pré-LLM ser executado;
  - injeção de falha no meio de `executeToolCalls` produz pares completos `toolCall -> toolResult (isError: true)` no histórico resultante.

## Plano de eval

Sem eval de LLM necessário (**Classe A** — invariantes puramente operacionais com zero tokens). Validar com `npm run check` e `./test.sh` nos pacotes `agent` e `coding-agent`.

## Critérios de aceite e rollback

- **Aceite**: zero sessões corrompidas em teste concorrente, nenhum `toolCall` órfão após exceção simulada, `./test.sh` verde.
- **Rollback**: remover o lock de sessão / chamada `flush()` mantendo o append atual em `session-manager.ts` e restaurar `agent-loop.ts`.

## Prioridade

**Média-Alta (P2 entre itens Classe A)** — protege diretamente a integridade do transcript sem custo de contexto.
