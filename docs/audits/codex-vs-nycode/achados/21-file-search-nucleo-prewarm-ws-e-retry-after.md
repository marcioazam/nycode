# Achado 21 — Prewarm Assíncrono de Sessão/WebSocket e File Search em Memória

- **Classificação**: **Classe B** (altera inicialização antecipada de conexão com provedor — afetando timing e possíveis requisições `generate: false` — e introduz alternativa em memória ou índice incremental para busca de arquivos).
- **Prioridade no backlog**: #17 (Classe B — **P2**).

## 1. Como o Codex faz

O Codex combina duas otimizações de latência inicial e resposta de TUI:

- **Aquecimento em background de sessão/WebSocket (`codex-rs/core/src/session/startup_prewarm.rs:39-80`)**: ao abrir ou retomar uma thread interativa (`PrewarmInput::Base`, `History`, `Restoring`), dispara em paralelo uma tarefa assíncrona com `CancellationToken` e `timeout` para preparar cliente/TLS/WS e cache antes de o usuário terminar de digitar o prompt:

```rust
// codex-rs/core/src/session/startup_prewarm.rs:39-68
#[derive(Debug)]
pub(crate) enum PrewarmInput {
    Base,
    History,
    Restoring(tokio::sync::oneshot::Receiver<crate::context_manager::ContextManager>),
}
...
pub(crate) struct SessionStartupPrewarmHandle {
    task: AbortOnDropHandle<CodexResult<ModelClientSession>>,
    started_at: Instant,
    timeout: Duration,
}
```

- **Sessão persistente incremental de busca fuzzy de arquivos com `nucleo` (`codex-rs/file-search/src/lib.rs:108-181`)**: em vez de spawnar `fd` a cada consulta, `FileSearchSession::update_query` reaproveita o walk em cache em múltiplos threads respeitando `.gitignore` e devolve `FileSearchSnapshot` ordenado com `indices`.

## 2. Como o `nycode` faz

- **Conexão preguiçosa**: em `packages/ai/src/api/openai-codex-responses.ts:315-399`, o socket WebSocket (`acquireWebSocket`) e o failover SSE só acontecem quando a primeira chamada real `stream()` dispara (após o usuário submeter a mensagem). Existe `cache-warmer.ts` para keepalive após o início, mas não pré-handshake WS no boot da TUI.
- **Busca de arquivos via subprocesso / fuzzy em JS**:
  - A ferramenta `find` (`packages/coding-agent/src/core/tools/find.ts:1-64`) spawna o binário `fd` externo a cada chamada do modelo.
  - `packages/tui/src/fuzzy.ts:12-75` faz ótimo ranqueamento incremental JS sobre listas já carregadas (ex.: picker de modelos, `@file`), mas cada re-caminhada de diretório em repos muito grandes paga I/O ou spawn de processo.

## 3. Diferença Concreta

No `nycode`, o usuário paga TCP+TLS+WebSocket handshake + resolução de headers apenas depois de apertar Enter no primeiro prompt interativo, e `@file`/busca em árvores de 50k+ arquivos não mantém um snapshot walker incremental compartilhado em memória.

## 4. Benefício e Custo

- **Benefício**: reduz ~`150–400 ms` no Time-To-First-Token (TTFT) da primeira interação interativa quando usando WebSocket, e acelera autocomplete/seletores sem spawnar `fd` repetidamente em sessões longas.
- **Custo em tokens**: `0` tokens se limitado a handshake TCP/TLS/WS sem pré-geração; caso envie `generate: false` estilo prewarm completo do Codex, depende da política de cobrança do provedor (manter inicialmente apenas aquecimento de socket/DNS/TLS com `0` tokens).
- **Custo em latência**: redução líquida no primeiro turno (trabalho movido para tempo ocioso de digitação).
- **Custo de manutenção**: médio para prewarm WS (respeitando rigorosamente `NYCODE_OFFLINE=1` e `--offline` em testes); baixo se mantiver `fd` para a tool `find` e adicionar apenas cache incremental curto de lista de arquivos para TUI.

## 5. Riscos e Licença

- **Riscos**: abrir socket no boot em CI offline ou `vitest` violaria a regra de testes offline se não respeitar `NYCODE_OFFLINE=1` / `--no-session` / `-p`; além disso, manter cache de arquivos em memória sem invalidar após escrita (`edit`/`write`/`bash`) pode devolver paths obsoletos. Mitigação: prewarm estritamente limitado ao modo **interativo**, somente quando `NYCODE_OFFLINE !== "1"` e `--offline` ausente, usando `AbortController` no shutdown.
- **Licença**: Codex (`Apache-2.0`, `LICENSE:1-201`); `fd` (`Apache-2.0`/`MIT`) já está empacotado/usado sem dependências Rust extras no Node.

## 6. Proposta Técnica e Plano de Eval (Obrigatório — Classe B)

- **Arquivos a tocar no `nycode`**:
  - `packages/ai/src/api/openai-codex-responses.ts` e `packages/coding-agent/src/core/agent-session.ts`: adicionar `prewarmTransport(model, headers, signal)` não bloqueante apenas no boot da sessão interativa (desligado em `-p`, `--offline`, `NYCODE_OFFLINE=1`).
  - `packages/coding-agent/src/modes/interactive/` e `core/tools/find.ts`: índice curto TTL (ou invalidado por mutação de `write`/`bash`) da listagem `fd --type f` para autocomplete instantâneo `@file`.
- **Testes unitários**:
  - Com `NYCODE_OFFLINE=1` ou `-p`, nenhuma conexão de prewarm é tentada (`0` sockets abertos).
  - Prewarm abortado durante shutdown não vaza handles nem gera `UnhandledRejection`.
- **Plano de Eval (Classe B — pareado)**:
  - **Benchmark**: medir cold/warm startup + 1o turno com **`bench/contract/speed.py`** (`--reps 7`, base vs candidato) garantindo que `session_start` não regrida em `-p` e reduz TTFT interativo; plus **S2** verificando ausência de regressão funcional por cache de path.
- **Critério de aceite**: `0` chamadas de rede em modo offline/headless `-p`, startup `-p` <= baseline, TTFT interativo reduzido.
- **Rollback**: desabilitar chamada opt-in de `prewarmTransport` no startup interativo.
