# 27 — Separação `413 PayloadRejected` vs `ContextOverflow`, erros in-band 200 SSE e watchdog HTTP/SSE

- **Classe**: **A** (zero tokens extras, sem alteração de system prompt nem tool schemas; melhora precisão de classificação de falhas HTTP/stream e evita compactações destrutivas indevidas).
- **Prioridade**: **P1** (evita loops cegos de compactação em rejeições HTTP 413 por mídia/bytes e falhas falsas em proxies HTTP 200).

## O que o `omp` faz

1. **Separação explícita entre `Flag.PayloadRejected` (HTTP 413 por bytes/mídia) e `Flag.ContextOverflow` (`omp:packages/ai/src/error/flags.ts:56-57,120-130`)**: distingue rejeições HTTP 413 causadas por limite de payload/imagem/mídia daquelas com evidência real de estouro de janela de tokens (`CONTEXT_OVERFLOW_EVIDENCE_PATTERNS`), pois compactar histórico textual não encolhe bytes de imagem nem corrige mídia inválida (`#9235`).
2. **Normalização de erros in-band em respostas HTTP `200 OK` / SSE (`omp:packages/ai/src/error/body-error.ts:70-120`)**: proxies/agregadores (Azure OpenAI, LiteLLM, Bedrock shims) frequentemente respondem `200 OK` + `text/event-stream` e embutem falhas no corpo (`{"error":{"type":"rate_limit_error"}}`, `{"code":429}`, ou texto puro `429 Too Many Requests` / `overloaded`), que sem classificação viram erro terminal opaco e impedem retry/failover.
3. **Watchdog genérico de pré-resposta (TTFB) e inatividade por evento em streaming (`omp:packages/ai/src/utils/idle-iterator.ts:18-100`)**: cobre *todos* os transportes HTTP/SSE de provedores via timeouts configuráveis (`PI_STREAM_IDLE_TIMEOUT_MS`, `PI_STREAM_FIRST_EVENT_TIMEOUT_MS`), evitando conexões SSE zumbis travadas indefinidamente após os cabeçalhos HTTP.

## Como o `nycode` faz

- **`packages/ai/src/utils/overflow.ts:42,68`**: inclui `/request_too_large/i` e `/^(?:[\w -]+ API error \(413\):|413(?:\s|:|$))/i` diretamente em `OVERFLOW_PATTERNS`, sem checar se o erro refere orçamento de mídia/bytes ou limite de tokens; qualquer 413 sem texto de rate limit dispara recuperação/compactação de contexto.
- **`packages/ai/src/utils/error-body.ts:40-57` e `packages/ai/src/utils/retry.ts:7-35,310-315`**: `normalizeProviderError` só inspeciona objetos `Error` lançados pelo SDK; quando um proxy retorna `200 OK` SSE com envelope de erro customizado sem código numérico explícito ou texto reconhecido em `RETRYABLE_PROVIDER_ERROR_PATTERN`, o turno morre como erro não-retriável.
- **`packages/ai/src/api/openai-codex-responses.ts:1360,1444-1452`**: aplica `idleTimeoutMs` somente no transporte WebSocket (`WebSocket idle timeout after ...ms`), sem watchdog unificado de primeiro evento / inatividade para streams SSE dos demais provedores (`anthropic-messages.ts`, `openai-completions.ts`, `google-gemini-cli.ts`).

## Diferença concreta

| Aspecto | `omp` (`v19.2.1`) | `nycode` (`00fed2ae`) |
|---|---|---|
| HTTP `413 Payload Too Large` | Separa `Flag.PayloadRejected` de `Flag.ContextOverflow` salvo evidência explícita de tokens (`omp:packages/ai/src/error/flags.ts:56-57,120-130`) | Todo `413` e `request_too_large` aciona `OVERFLOW_PATTERNS` (`packages/ai/src/utils/overflow.ts:42,68`) |
| Falhas 429/503 dentro de `200 OK` SSE | Tabela normalizada `RETRYABLE_STATUS_BY_CODE` + texto proxy-safe sem inventar 401/403 (`omp:packages/ai/src/error/body-error.ts:70-120`) | Depende de SDK `Error` lançado ou padrões soltos pós-stream (`retry.ts:310-315`) |
| Watchdog de inatividade de stream | Iterator compartilhado com TTFB + idle timeout por provedor (`omp:packages/ai/src/utils/idle-iterator.ts:18-100`) | Apenas no WebSocket Codex (`openai-codex-responses.ts:1444-1452`) |

## Benefício

- **Problema**: sessões com imagem pesada que tomam HTTP 413 sofrem compactação destrutiva à toa; streams SSE travados silenciosamente atrás de proxy ficam pendurados indefinidamente; respostas 200 com corpo throttleado falham sem retry.
- **Solução**: restringir `413` genérico em `overflow.ts` para não compactar quando a mensagem indica rejeição de mídia/byte limit sem menção de janela de tokens; extrair códigos/envelopes de throttle in-band em `error-body.ts`; adicionar wrapper leve de idle timeout com `AbortController` para iteradores SSE.

## Custo

- **Tokens / turno**: **0**.
- **Latência**: **0 ms** no caminho feliz (apenas checagem regex de erro e timer cancelável `unref`'d por chunk).
- **Manutenção**: ~180 LOC TS puro em `packages/ai/src/utils/`.

## Riscos

- Watchdog SSE com valor muito curto pode abortar modelos de raciocínio lentos antes do primeiro token; usar piso alto igual ou superior ao do `omp` (ex.: `900_000 ms` padrão ou configurável).
- Ao filtrar 413 em `overflow.ts`, preservar detecção real dos casos documentados no próprio arquivo (`Anthropic` `"prompt is too long"` / `GitHub Copilot` 413 request overflow).

## Licença

Padrão de referência **MIT** (`omp:LICENSE:1-23`).

## Proposta

- **`packages/ai/src/utils/overflow.ts`**: adicionar sinalização ou exceção para 413 puramente de mídia/byte limit quando não houver evidência de janela de tokens nem pattern conhecido de texto grande (como Copilot `"failed to parse request"`).
- **`packages/ai/src/utils/error-body.ts` + `packages/ai/src/utils/retry.ts`**: portar mapeamento enxuto de códigos estruturados de throttle (`RETRYABLE_STATUS_BY_CODE`, `overloaded_error`, `throttling_exception`, `high_demand`) excluindo caps persistentes de conta/faturamento.
- **`packages/ai/src/utils/` (novo helper leve `stream-idle.ts`)**: iterador `withStreamIdleTimeout` aplicado aos leitores SSE compartilhados em `packages/ai/src/api/`.

## Testes

- `packages/ai/test/overflow-413-payload.test.ts`: HTTP 413 de tamanho de imagem/mídia retorna `isContextOverflow === false`, enquanto Anthropic `"request_too_large"` com tokens ou Copilot 413 mantêm comportamento esperado.
- `packages/ai/test/retry-inband-sse.test.ts`: envelope `{"error":{"type":"throttling_exception"}}` em status 200 é classificado como retryable; `insufficient_quota` permanece terminal.
- `packages/ai/test/stream-idle.test.ts`: timers falsos comprovam abort por inatividade no iterador SSE e limpeza imediata do timer no fechamento normal.

## Plano de eval

Não aplicável (Classe A: zero impacto em tokens, system prompt ou escolhas nominais do modelo; comportamento só altera tratamento de erros HTTP/rede e stream travado).

## Critérios de aceite

1. Erros 413 de payload de imagem não disparam compactação desnecessária.
2. Envelopes in-band `rate_limit_error` / `throttling_exception` em 200 OK passam em `isRetryableAssistantError`.
3. Streams SSE travados respeitam timeout configurável de inatividade.

## Rollback

Reverter os helpers em `packages/ai/src/utils/{overflow,error-body,retry,stream-idle}.ts`.
