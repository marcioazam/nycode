# 03 — Ajuste dinâmico de `maxTokens` dentro da janela restante do modelo

- **Classe**: **A** (zero tokens extras, não altera comportamento do modelo em turnos normais, apenas previne erro HTTP 400 na borda da janela de contexto).
- **Prioridade**: **P1** (elimina falhas evitáveis de API em sessões próximas do limite antes ou logo antes da compactação).

## O que o `omp` faz

Antes de despachar a chamada ao provedor, o `omp` executa `fitOutputTokensToContextWindow` (`omp:packages/agent/src/output-budget.ts:81-96`), calculando o espaço restante (`contextWindow - countPromptTokens - OUTPUT_FIT_HEADWAY_TOKENS`, com margem de `64` tokens e piso `MIN_FITTED_OUTPUT_TOKENS = 1024`) e reduzindo `maxTokens` se `requested > room`:

```ts
export function fitOutputTokensToContextWindow(
   model: Model,
   context: Context,
   maxTokens: number | undefined,
   tokenizer: Tokenizer,
): number | undefined {
   if (maxTokens === undefined && omitsDefaultOutputCap(model.compat)) return undefined;
   const requested = maxTokens ?? model.maxTokens;
   const contextWindow = model.contextWindow;
   if (!requested || !contextWindow || contextWindow <= 0) return maxTokens;
   if (stopsOutputAtContextWindow(model)) return maxTokens;

   const room = contextWindow - countPromptTokens(context, tokenizer) - OUTPUT_FIT_HEADWAY_TOKENS;
   if (room >= requested) return maxTokens;
   return Math.max(MIN_FITTED_OUTPUT_TOKENS, room);
}
```

Também oferece `countContextOverrun` (`omp:packages/agent/src/output-budget.ts:173-184`) para diagnosticar excesso pré-chamada.
- **Ancestralidade Pi**: ausente em `pi0.9.4` e `pibase`. Criação original do `omp` para endpoints que validam `prompt_tokens + max_tokens <= context_window` (OpenAI-compat, vLLM, llama.cpp, Bedrock/Vertex proxies).

## Como o `nycode` faz

- `packages/agent/src/agent-loop.ts` não possui cálculo nem clamp de `maxTokens` pelo espaço restante da janela antes de chamar `streamFn`.
- O `nycode` trata janela de forma reativa após o turno ou via limiar fixo em `packages/coding-agent/src/core/compaction/threshold.ts:50-64` (`compactWhenOverLimit` comparando `tokens` com `NYCODE_COMPACT_AT` / `compaction.maxContextTokens`), além de compactação pós-turno (`reserveTokens = 16384`) e tratamento de erro `isContextOverflow` quando o provedor já devolveu HTTP 400.

## Diferença concreta

| Aspecto | `omp` (`v19.2.1`) | `nycode` (`00fed2ae`) |
|---|---|---|
| Clamp pré-chamada de `maxTokens` | `fitOutputTokensToContextWindow` ajusta `maxTokens` para caber em `contextWindow - promptTokens - 64` (piso `1024`) (`omp:packages/agent/src/output-budget.ts:81-96`) | Sem equivalente (`packages/agent/src/agent-loop.ts` repassa `maxTokens` fixo/padrão do modelo) |
| Comportamento em janela apertada (ex.: prompt 192k em janela 200k c/ `maxTokens=16384`) | Envia `maxTokens = 7936`; turno executa normalmente | Endpoints estritos (`input + max_tokens <= 200k`) rejeitam com HTTP 400 e forçam retry/compactação reativa |

## Benefício

- **Problema**: quando `promptTokens` (ex.: `188k`) somado ao `maxTokens` padrão do catálogo (`16k` ou `32k`) ultrapassa `contextWindow` (`200k`), provedores e gateways que validam `prompt + max_tokens <= contextWindow` retornam HTTP 400 antes de gerar qualquer token — embora o prompt inteiro caiba perfeitamente com 11k tokens de saída disponíveis.
- **Rastro**: sem clamp preventivo, o `nycode` sofre erro de overflow prematuro, consome uma tentativa de retry ou aciona compactação de emergência perdendo parte do histórico antes do necessário.
- **Solução**: adaptar `fitOutputTokensToContextWindow` no `nycode` usando o estimador já existente (`chars / 4` conservador ou `estimateContextTokens` de `core/compaction/utils.ts` + reserva segura de headroom) quando `model.contextWindow > 0`, respeitando o orçamento de thinking da Anthropic (`ensureMaxTokensForThinking` / `thinkingBudget`) para não gerar requisição inválida quando thinking estiver ativo.

## Custo

- **Tokens / turno**: **0** (nunca altera prompts, apenas limita o campo `max_tokens` da requisição HTTP quando `prompt + maxTokens > contextWindow`).
- **Latência**: **< 1 ms** (aritmética sobre estimativa já calculada).
- **Manutenção**: ~40 LOC TS puro, zero dependências externas.

## Riscos

- **Subestimação do `chars / 4` vs BPE real**: se um texto denso (JSON/minificado) tiver 2,5 chars/token, uma margem de apenas 64 tokens baseada em `chars / 4` não bastará para evitar 400 (mas não piora nada em relação ao estado atual!). Em contrapartida, sobre-estimar para baixo nunca pode encurtar uma resposta abaixo de `MIN_FITTED_OUTPUT_TOKENS = 1024`. Usar fator conservador (ex.: `chars / 3` ou margem de 5%) quando não houver tokenizador BPE evita o caso oposto (cortar `maxTokens` cedo demais em texto em inglês de 4+ chars/token).
- **Thinking budget Anthropic**: nunca reduzir `maxTokens` abaixo de `thinkingBudget + reserva`, conforme alertado no docstring em `omp:packages/agent/src/output-budget.ts:76-79`.

## Licença

**MIT** (`omp:LICENSE:1-23`). Implementação própria no `nycode` sem dependências do `omp`.

## Proposta

- **`packages/ai/src/`** ou **`packages/coding-agent/src/core/agent-session.ts`** (onde `maxTokens` e `model.contextWindow` chegam ao stream): adicionar helper puro `fitOutputTokensToContextWindow({ contextWindow, estimatedPromptTokens, requestedMaxTokens, minOutputTokens: 1024, thinkingBudgetTokens })` na montagem da opção `streamSimple`/`prepareRequest`.
- Reaproveitar `estimateContextTokens` já existente em `packages/coding-agent/src/core/compaction/utils.ts` sem duplicar estimador.

## Testes

- Criar teste unitário cobrindo:
  1. Quando `estimatedPromptTokens + requestedMaxTokens + headroom <= contextWindow`, retorna `requestedMaxTokens` intacto.
  2. Quando excede `contextWindow`, reduz para `room` respeitando o piso `1024`.
  3. Quando há `thinkingBudget`, nunca reduz abaixo do mínimo exigido pelo provedor ou delega ao ajuste de thinking.

## Plano de eval

Não aplicável (Classe A: atua apenas como guarda defensiva contra HTTP 400 na borda da janela de contexto sem alterar prompts ou raciocínio normal).

## Critérios de aceite

1. Chamada simulada perto do teto da janela com provedor que rejeita `input + max_tokens > contextWindow` passa a receber `maxTokens` ajustado e completa sem erro 400.
2. Nenhuma alteração no fluxo de turnos fora da borda da janela.

## Rollback

Remover a chamada a `fitOutputTokensToContextWindow` no wrapper de stream.
