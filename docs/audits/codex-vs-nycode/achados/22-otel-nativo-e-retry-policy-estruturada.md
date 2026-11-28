# Achado 22 — Política Tipada de Retry e Telemetria OTEL Estruturada

- **Classificação**: **Classe B** (altera política de retentativas em falhas de conexão/filtro de conteúdo, podendo continuar loops automaticamente e adicionar eventos de telemetria).
- **Prioridade no backlog**: #16 (Classe B — **P2**).

## 1. Como o Codex faz

O Codex combina classificação exaustiva de erro em `RetryPolicy` com tratamento especializado em runtime e eventos OpenTelemetry padronizados:

1. **Política tipada explícita por variante (`codex-rs/protocol/src/error.rs:473-560`)**: todo erro implementa `retry_policy() -> RetryPolicy` entre exatamente quatro variantes (`Never`, `ServerDirected`, `Backoff`, `FallBackToHttp`), garantindo que erros de cota, `ContextWindowExceeded`, `AuthDenial` ou schema inválido **nunca** sejam retentados, enquanto `ServerOverloaded` exige `server_retry_delay()`, `WebsocketMessageTooLarge` força `FallBackToHttp` e erros transitórios aplicam backoff com jitter (`codex-rs/codex-client/src/retry.rs:43-52`).
2. **Recuperação em filtro de conteúdo e retries de conexão longos (`codex-rs/core/src/responses_retry.rs:35-95`)**: distingue explicitamente desfechos terminais (`is_terminal_sampling_outcome`), injeta `ContentFilterGuidance` como fragmento contextual para o modelo reformular em caso de bloqueio acidental de filtro de conteúdo, e oferece flag `UnboundedConnectionRetries` para desconexões puras de rede com teto de delay `MAX_CONNECTION_RETRY_DELAY = 60s`.
3. **Telemetria OTEL sem vazar payloads (`codex-rs/otel/src/skill_invocation.rs:15-60` e `codex-rs/codex-client/src/retry.rs:64-80`)**: registra `codex.retry` (`retry.attempt`, `retry.delay_ms`, `retry.layer`, `retry.operation`) e `codex.skill_invocation` (`skill.name`, `skill.scope`, `skill.invocation_type`) nunca incluindo código ou conteúdo de prompts.

## 2. Como o `nycode` faz

1. Em `packages/ai/src/utils/retry.ts:7-85` e `provider-retry.ts:25-69`, o `nycode` já é muito maduro no suporte cross-provider (OpenRouter, Anthropic, OpenAI Codex, Zhipu `1308`, `x-should-retry`, `retry-after-ms`, `retry-after`, backoff com cap `DEFAULT_MAX_RETRY_DELAY_MS`).
2. Contudo, a classificação de não-retentável vs retentável mistura regex sobre texto de erro (`retry.ts`) com checks HTTP esparsos (`provider-retry.ts`), sem variante formal equivalente a `FallBackToHttp` unificada ou tratamento de `ContentFilterGuidance` automático, nem modo de retentativa de rede de longa duração para runs noturnos (`/goal`).
3. Em `packages/telemetry/src/index.ts:1-65`, o `nycode` possui estrutura excelente de `StoredTrace`/`StoredSpan`/`TelemetryPropagation`, mas ainda não padroniza métricas granulares de `retry` por camada (`http` vs `ws` vs `stream`) e invocação de skill/sandbox com a mesma clareza operacional.

## 3. Diferença Concreta

Enquanto `retry.ts` já supera o Codex em cobertura de provedores terceiros (Anthropic/OpenRouter/Cloudflare 520-525), falta encapsular a política de decisão por variantes fechadas de erro + fallback automático de transporte WebSocket em erro de tamanho de frame + eventos OTEL uniformes de retry/skill/sandbox.

## 4. Benefício e Custo

- **Benefício**: aumenta robustez em automações longas sob conexões instáveis, evita perda de sessão em frames WebSocket muito grandes e dá visibilidade quantitativa de gargalos de rede/skills via `packages/telemetry`.
- **Custo em tokens**: `0` tokens no fluxo normal; `+1` turno apenas quando `ContentFilterGuidance` recuperar um bloqueio raro.
- **Custo em latência**: apenas tempo real de backoff quando ocorrem falhas de rede; zero overhead no caminho feliz.
- **Custo de manutenção**: baixo a médio (~120 linhas entre `provider-retry.ts`, `openai-codex-responses.ts` e `packages/telemetry`).

## 5. Riscos e Licença

- **Riscos**: `UnboundedConnectionRetries` ligado sem limite em CLI interativa ou headless trava o processo infinitamente se o usuário estiver realmente offline; mitigação: exigir teto máximo configurável por tempo total (`maxConnectionRetryDurationMs`) e **desabilitar completamente** quando `NYCODE_OFFLINE=1` ou abortado por usuário.
- **Licença**: Codex (`Apache-2.0`, `LICENSE:1-201`); integração limpa sobre `packages/ai/src/utils/` e `packages/telemetry/` já pertencentes ao `nycode`.

## 6. Proposta Técnica e Plano de Eval (Obrigatório — Classe B)

- **Arquivos a tocar no `nycode`**:
  - `packages/ai/src/utils/provider-retry.ts`: refinar retorno de decisão em tagged union `{ kind: "never" | "server-directed" | "backoff" | "fallback-http" }`, honrando teto máximo de espera em modo persistente opcional (`/goal`).
  - `packages/coding-agent/src/core/agent-session.ts` e `packages/telemetry/src/`: emitir eventos padronizados de span (`retry`, `skill_invocation`, `sandbox_outcome`) sem anexar código/segredos nos atributos.
- **Testes unitários**:
  - Erro WS de payload grande aciona `fallback-http` imediato para SSE zstd sem queimar contagem de retry; erros `401`/`quota` retornam `never`; `retry-after-ms` dentro do teto é respeitado exatamente e eventos de telemetria gravam `attempt` e `layer`.
- **Plano de Eval (Classe B — pareado)**:
  - **Suites**: injeção de falhas determinísticas (rede derrubada + `retry-after` + WS oversize) + **S2** / **S4** em `bench` garantindo que o novo retry policy não mascara erros fatais nem ultrapassa orçamento `1.10×`.
- **Critério de aceite**: `npm run check` verde + cobertura completa da tabela `RetryPolicy` nos testes de `packages/ai/test/`.
- **Rollback**: reverter flag de longa espera e restaurar verificação booleana em `isRetryableProviderError`.
