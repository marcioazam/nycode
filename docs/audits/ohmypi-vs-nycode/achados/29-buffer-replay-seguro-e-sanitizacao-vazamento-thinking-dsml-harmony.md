# 29 — Buffer pré-conteúdo (`replay-safe retry`) e sanitização de vazamento de reasoning / DSML / Harmony

- **Classe**: **B** (altera política de retry mid-stream e reescreve texto/toolCalls emitidos por modelos abertos ou proxies; exige eval antes da adoção).
- **Prioridade**: **P2** (alto valor se o `nycode` operar com proxies OpenRouter / modelos abertos como DeepSeek V3/V4, Qwen, MiniMax ou GPT-OSS via OpenAI-compat; baixo impacto em Anthropic/OpenAI oficiais).

## O que o `omp` faz

1. **Buffer pré-conteúdo para retries realmente seguros em stream (`omp:packages/ai/src/utils/empty-completion-retry.ts:31-140`)**: `withReplaySafeStreamRetry` retém eventos iniciais não-substantivos (`start`, `toolcall_start`/`end` sem argumentos) até o primeiro evento com conteúdo útil (`text_delta`, `thinking_delta`, `toolcall_delta` não vazio, `image_end`). Se a conexão cair ou o modelo retornar resposta vazia antes de comprometer a tentativa (`!committed`), os marcadores em buffer são descartados silenciosamente e uma nova requisição é feita sem duplicar UI nem corromper histórico.
2. **Saneamento em tempo real de vazamento de raciocínio e chamadas de tool em texto (`omp:packages/ai/src/utils/leaked-thinking-stream.ts:1-120`, `omp:packages/ai/src/utils/dsml-leak.ts:1-44`, `omp:packages/ai/src/utils/harmony-leak.ts:1-45`)**: fora de endpoints first-party oficiais, reprojeta blocos `<think>` / cercas `thinking` vazados no canal de texto visível, remove tags `<｜DSML｜...>` vazadas em histórico/argumentos do DeepSeek (`#10556`), e escapa tokens reservados `<|channel|>`, `<|start|>` (Harmony) em payload de entrada (`escapeHarmonyControlTokens`) para não disparar rejeição de prompt em servidores GPT-5.
3. **Rebaixamento por dialeto ao cruzar provedores (`omp:packages/ai/src/dialect/demotion.ts:33-40`)**: ao reenviar histórico contendo reasoning antigo para outro modelo incapaz de recebê-lo como thinking assinado, evita tags `<thinking>` no dialeto Anthropic (que disparam classificador de recusa `reasoning_extraction`) e usa prosa simples ou `<think>` conforme o destino.

## Como o `nycode` faz

- **`packages/ai/src/utils/retry.ts:249-299`**: `retryAssistantCall` envolve `() => Promise<AssistantMessage>` após a conclusão integral da stream; não possui camada unificada de buffer pré-output no nível de `AssistantMessageEventStream` nem retry automático para completions vazias (`hasVisibleAssistantContent === false`).
- **`packages/ai/src/utils/`**: não possui `leaked-thinking-stream`, `dsml-leak` nem `harmony-leak`; caso um modelo via OpenRouter/compat emita `<think>` em `content` ou tokens DSML brutos, o texto vai direto para o histórico do usuário/assistente e pode contaminar os próximos turnos.

## Diferença concreta

| Aspecto | `omp` (`v19.2.1`) | `nycode` (`00fed2ae`) |
|---|---|---|
| Retry no nível de stream | Bufferiza eventos sem efeito colateral até commit no primeiro delta útil (`omp:packages/ai/src/utils/empty-completion-retry.ts:41-140`) | `retryAssistantCall` atua apenas após `Promise<AssistantMessage>` liquidada (`packages/ai/src/utils/retry.ts:249-299`) |
| Vazamento `<think>` / DSML / Harmony | Healer + stripper em endpoints não oficiais (`omp:packages/ai/src/utils/leaked-thinking-stream.ts:16-120`, `dsml-leak.ts:1-44`, `harmony-leak.ts:33-45`) | Sem equivalente em `packages/ai/src/utils/` |
| Rebaixamento cross-model de reasoning | Tabela `preferredDialect` evitando `<thinking>` na Anthropic (`omp:packages/ai/src/dialect/demotion.ts:33-40`) | Reaproveitamento padrão nos adaptadores `api/*.ts` |

## Benefício

- **Problema**: agregadores OpenAI-compatíveis para modelos abertos frequentemente vazam tokens de template (`<think>`, DSML) no texto visível ou encerram streams com 0 texto visível antes de gerar argumento algum.
- **Solução**: portar em **TS puro** apenas (a) o escape pontual de tokens Harmony/DSML na serialização e (b) o buffer `withReplaySafeStreamRetry` com orçamento `<= 2` retries vazios e guarda estrita por dialeto/provedor para não interferir em Anthropic/OpenAI oficiais.

## Custo

- **Tokens / turno**: **0** em caminho normal; em retries por completion vazia ou corte pré-delta, cobra apenas reenvio do mesmo prompt cacheado até o limite `<= 2`.
- **Latência**: buffer pré-delta retém alguns milissegundos apenas até o primeiro caractere visível ou delta de argumento.
- **Manutenção**: média (~300–500 LOC TS puro se portado em recorte mínimo sem os 10+ parsers de dialeto completos de `omp:packages/ai/src/dialect/`).

## Riscos

- **Falso positivo em cercas Markdown**: sanitizar `<think>` ou DSML sem checar blocos de código (` ``` `) corrompe respostas legítimas sobre modelos ou parsers — manter sempre restrito a providers não first-party e preservando texto dentro de code fences.
- **Interação com `EMPTY_STOP` ([achado 17](achados/17-recuperacao-de-turno-vazio-e-stream-interrompido.md))**: evitar retentativa dupla no `ai` e no `agent-loop`; definir apenas um dono claro para recovery de completion vazia.

## Licença

Código de referência **MIT** (`omp:LICENSE:1-23`). Zero dependências nativas.

## Proposta

- **`packages/ai/src/utils/`**: introduzir wrapper opcional `withReplaySafeStreamRetry` coordenado com a política de retries do `agent-session.ts` para eliminar duplicação de eventos na UI quando um retry ocorrer antes do primeiro token útil, plus helper isolado `stripLeakedReasoningMarkup` ativável por flag `compat` em providers compatíveis com modelos abertos.

## Testes

- Testes offline com stream simulado em `packages/ai/test/`:
  1. `start` + `toolcall_start` seguido de corte antes de qualquer `toolcall_delta` dispara retry sem emitir bloco parcial duplicado para o consumidor.
  2. `<think>...</think>` fora de code fence em modelo compatível vira bloco `thinking`; dentro de ` ```md ` permanece texto intacto.

## Plano de eval

- **Base vs candidato**: `nycode` vs `nycode + stream-replay-and-sanitizer` em `suite.s1` (`pr_cases`) e `suite.s2` (`tasks/tb2.json`) via `bench/run.py` + `bench/gate.py`, mais bateria sintética em `packages/evals/` simulando streams com `<think>` / DSML / corte pré-delta em modelos abertos compatíveis. Não reexecutar `cc-vanilla` nem `pi-vanilla` (`docs/bench/RUNBOOK.md`).

## Critérios de aceite

1. Nenhuma regressão em `suite.s1`/`suite.s2` (`MARGIN = -0.10`, `PARITY_COST_MAX = 1.10`) com modelos Anthropic/OpenAI padrão.
2. Cobertura >= 80% no diff e 0 vazamentos em testes com `<think>` e `<｜DSML｜...>` sintéticos.

## Rollback

Desabilitar o wrapper de stream replay / sanitização por flag no catálogo/compat e remover helper de `packages/ai/src/utils/`.
