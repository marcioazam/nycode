# Achado 03 — Sticky Routing (`x-codex-turn-state`) e Ordenação JSON no OpenAI Responses

- **Classificação**: **Classe A** (0 tokens extras, zero mudança semântica no modelo/prompt/tool/loop, sem dependência nativa).
- **Prioridade no backlog**: #3 (Classe A).

## 1. Como o Codex faz

O Codex preserva dois invariantes de transporte na API Responses para melhorar o roteamento sticky de cache no servidor e o parsing incremental em gateways:

- Em `codex-rs/core/src/client.rs:382-403`, cada `ModelClientSession` mantém um `turn_state: Arc<OnceLock<String>>` por turno: captura o cabeçalho de resposta `x-codex-turn-state` no primeiro request do turno e o reenvia em todas as retentativas/continuações dentro do mesmo turno (nunca entre turnos distintos):

```rust
// codex-rs/core/src/client.rs:382-403
/// - The `x-codex-turn-state` sticky-routing token, which must be replayed for all requests within
///   the same turn.
...
    /// This is a contract between the client and server: we receive it at turn start,
    /// keep sending it unchanged between turn requests (e.g., for retries, incremental
    /// appends, or continuation requests), and must not send it between different turns.
    /// An auth ownership change clears it so the new owner gets fresh routing state.
    turn_state: Arc<OnceLock<String>>,
```

- Em `codex-rs/codex-api/src/common.rs:407-416`, `ResponsesApiRequest` declara explicitamente `model`, `stream` e `service_tier` **antes** de `input` para que gateways possam rotear a requisição inspecionando os primeiros bytes do JSON sem bufferizar megabytes de histórico:

```rust
// codex-rs/codex-api/src/common.rs:407-416
#[derive(Debug, Serialize, Clone, PartialEq)]
pub struct ResponsesApiRequest {
    // Keep routing fields first: serde serializes struct fields in declaration order, and
    // gateways may inspect request bodies incrementally before potentially multi-megabyte input.
    pub model: String,
    pub stream: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub service_tier: Option<String>,
    pub input: Vec<ResponseItem>,
```

## 2. Como o `nycode` faz

Em `packages/ai/src/api/openai-codex-responses.ts:1510-1527`, o transporte já envia `previous_response_id` e deltas em WebSocket (`buildCachedWebSocketRequestBody`), com fallback SSE zstd (`openai-codex-responses.ts:404-408`). Porém, ao reconstruir ou retentar requisições HTTP/SSE/WS dentro de um mesmo turno ou ao serializar o corpo em JS, não há captura nem replay do header `x-codex-turn-state` entre requisições do mesmo turno, nem ordenação explícita garantida dos metadados de roteamento antes de `input` no objeto literal passado a `JSON.stringify`.

## 3. Diferença Concreta

Sem `x-codex-turn-state` em retentativas/reconciliações HTTP no backend Codex Responses, requisições subsequentes no mesmo turno podem cair em workers distintos no backend remoto e perder afinidade de KV cache em memória; e, com payloads grandes em gateways/proxies streaming, colocar `instructions` ou `input` antes de `model`/`stream` atrasa a inspeção de roteamento no lado do proxy.

## 4. Benefício e Custo

- **Benefício**: melhora taxa de reutilização de KV cache do servidor em retentativas/continuações dentro do turno na família OpenAI Codex Responses e reduz latência/memória em gateways compatíveis.
- **Custo em tokens**: `0` tokens por turno.
- **Custo em latência**: `0 ms` de sobrecarga local; tende a reduzir TTFT em cache hit.
- **Custo de manutenção**: muito baixo (~30 linhas).

## 5. Riscos e Licença

- **Riscos**: **reutilizar `x-codex-turn-state` entre turnos distintos** viola o contrato do servidor e provoca bugs de roteamento (`client.rs:385-387`). Portanto, o estado deve ficar estritamente ligado a um único ciclo de requisição/retentativa de turno (ou limpo a cada nova chamada de turno), nunca em cache global por sessão como o socket WS.
- **Licença**: protocolo HTTP aberto do backend Codex; `Apache-2.0` (`LICENSE:1-201`). Reimplementação limpa de headers/ordenação JSON em TypeScript.

## 6. Proposta Técnica e Critérios

- **Arquivos a tocar no `nycode`**:
  - `packages/ai/src/api/openai-codex-responses.ts`: capturar header `x-codex-turn-state` da resposta SSE/WS dentro da mesma execução `stream()` (ou escopo explícito de turno) e incluí-lo em tentativas/continuações subsequentes desse mesmo turno; garantir na montagem de `body` que `model`, `stream` e `service_tier` (quando presente) apareçam nas primeiras chaves antes de `input` e `tools`.
  - `packages/ai/src/api/openai-responses-shared.ts`: garantir ordenação canônica das chaves iniciais do payload compatível com Responses API.
- **Testes unitários**:
  - Teste verificando que `JSON.stringify(body)` inicia com `{"model":...,"stream":true,...` antes de `"input":`.
  - Teste com mock de SSE/fetch garantindo captura de `x-codex-turn-state` na resposta 1 e envio em retry dentro do mesmo turno, além de não vazar para a chamada seguinte de outro turno.
- **Plano de eval**: não aplicável (Classe A).
- **Critério de aceite**: `npm run check` limpo + novos testes em `packages/ai/test/` verdes.
- **Rollback**: remover envio de `x-codex-turn-state` e ordenação explícita do payload.
