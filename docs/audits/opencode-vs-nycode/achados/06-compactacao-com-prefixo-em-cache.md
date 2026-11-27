# 06. Compactação que lê o prefixo em cache, antecipada em background

Classe: **B**. Prioridade: **P0** (maior economia medida por evento; exige eval de qualidade do resumo).

## O que o OpenCode faz

`packages/core/src/session/compaction.ts` (v2.4.2):

- `:156-160`: `PRECOMPUTE_LEAD = 60_000`, o resumo começa 60k tokens antes do teto.
- `:161-164`: `CACHE_LIFETIME = 5 * 60_000`, `CACHE_MARGIN = 30_000`: só começa enquanto o cache da última resposta
  ainda vive.
- `:347-356`:

```ts
/**
 * Once the context is within `PRECOMPUTE_LEAD` of the ceiling, summarizes everything before the latest response
 * in the background. That is the prefix the provider just processed, so the summary request reads it from the
 * prompt cache. The summary is held, not applied: swapping it in now would rewrite the prefix and throw away the
 * cache for every step until compaction is actually due.
```

- `:385-400`: não começa após troca de modelo nem com cache expirado ("the summary would write the whole prefix
  again").
- `:146-152`: níveis de recorte da transcrição (`OUTPUTS_CLIPPED`, `OUTPUTS_REMOVED`, `USER_ONLY`) e
  `TRANSCRIPT_CLIP = 2_000` para caber no orçamento.
- `:275`: padrão `{ auto: true, keep: 15_000, background: true }`; `:48`: buffer padrão 15% (mín. 16k).
- Chamada no loop: `packages/core/src/session/runner/llm.ts:258-264` (compacta se devido; senão `precompute`) e
  `:338-342` (precompute quando a sessão vai ficar ociosa).
- Doc: `services/site/src/docs/content/compaction.mdx:13,35,88`.

## Como o nycode faz

`packages/coding-agent/src/core/compaction/compaction.ts`:

- `packages/coding-agent/src/core/compaction/compaction.ts:128-129`: `reserveTokens: 16384`, `keepRecentTokens: 20000`.
- `packages/coding-agent/src/core/compaction/compaction.ts:618-631`:

```ts
// Avoid cache writes for one-off summaries. ...
const requestOptions: SimpleStreamOptions = { ...options, cacheRetention: "none", ... };
```

- `packages/coding-agent/src/core/compaction/compaction.ts:714-735`: converte as mensagens e serializa como texto (`serializeConversation`) dentro de `<conversation>`, com
  `<previous-summary>` quando há resumo anterior. Esse texto é um prompt novo: não compartilha prefixo com o cache da
  sessão.
- Disparo bloqueante no limiar (`packages/coding-agent/src/core/compaction/compaction.ts:269`, `contextTokens > contextWindow - reserveTokens`).

## Diferença

| | OpenCode | nycode |
|---|---|---|
| Entrada do resumo | o mesmo prefixo da sessão (cache read) | conversa re-serializada (input novo) |
| Quando | 60k antes do teto, em background, com cache vivo | no limiar, bloqueando o próximo turno |
| Resumo incremental | sim (`:235-245`, atualiza o checkpoint anterior) | sim (`UPDATE_SUMMARIZATION_PROMPT`, `:577`) |
| Mantido literal | `keep.tokens` 15000 | `keepRecentTokens` 20000 |

## Benefício (estimativa com preço público Anthropic: cache read = 0,1x input; escrita 5 min = 1,25x)

Sessão que compacta com 150k tokens de contexto:

- nycode: ~150k tokens de input cheio (o texto serializado; `cacheRetention: "none"` evita só a escrita).
- OC: ~150k de cache read ≈ 15k tokens-equivalentes + o prompt do resumo.

Economia ≈ 135k tokens-equivalentes de input por compactação, e o usuário não espera o resumo (30-60 s, comentário
`:156-158`). Para Sonnet a US$ 3/MTok: ~US$ 0,40 por compactação. Estimativa, não medida: depende de o provedor
devolver cache hit no pedido de resumo (exige o mesmo modelo e o mesmo prefixo byte a byte).

## Custo

- Tokens: um resumo em background pode ser descartado (o OC documenta que "an unused background summary still costs
  tokens", changelog v2.3.1); teto de 2 falhas (`:173`).
- Latência: remove a espera do resumo do caminho crítico.
- Manutenção: alta. O resumo precisa ser pedido como continuação da própria conversa (mensagens reais + instrução no
  fim), não como texto serializado. Isso muda o formato que o modelo resume e pode mudar a qualidade.

## Riscos

- Modelo "continua a conversa" em vez de resumir (o motivo do comentário em `compaction.ts:720` do nycode). O OC
  mitiga com instrução final e template (`SUMMARY_TEMPLATE`, `:175+`).
- Cache miss silencioso (prefixo difere por um byte): medir `cacheRead` do pedido de resumo; se ~0, a vantagem some.
- Concorrência: resumo em background enquanto a sessão avança; o OC descarta e refaz se a cauda passar de 40% do
  orçamento (`PRECOMPUTED_TAIL_SHARE`, `:165-171`; `PRECOMPUTE_MAX_FAILURES`, `:173`).

## Licença

MIT. Lógica reimplementável; se portar constantes e comentários, manter aviso MIT.

## Proposta

1. `core/compaction/compaction.ts`: modo `cached-prefix`: requisição = system + mensagens atuais (mesmo
   `convertToLlm` do turno) + mensagem final com o prompt de resumo; `cacheRetention` igual ao da sessão.
2. `core/agent-session.ts` (gatilho de compactação): disparar `precompute` quando `contextTokens > limiar - lead`
   e a última resposta tem < 4,5 min; guardar o resultado; aplicar no limiar.
3. Setting `compaction.mode: "serialized" | "cached-prefix"` e `compaction.background: boolean`, padrão atual até o
   eval.

## Testes

- `packages/coding-agent/test/suite/` (provider faux): o pedido de resumo tem o mesmo prefixo de mensagens do último
  turno; resumo pré-computado é aplicado sem nova chamada; cauda > 40% descarta e refaz.
- Teste de regressão do formato do resumo (seções obrigatórias).

## Plano de eval

- Baseline: nycode `00fed2ae` com `compaction.mode=serialized`. Candidato: `cached-prefix` + background.
- Tarefas longas que forçam ≥ 1 compactação (bench `bench/`, braço `nycode` apenas; referências vanilla não são
  re-rodadas, regra do `docs/bench/RUNBOOK.md`).
- Métricas por tarefa: acerto, `cacheRead`/`input`/`output` do pedido de resumo, custo total, tempo de parede, número de
  turnos pós-compactação até retomar.
- Decisão: candidato vence se custo cai e acerto não cai com certeza ≥ 80% (regra do dono).

## Aceite

Pedido de resumo com `cacheRead / (input+cacheRead) ≥ 0,8` em Anthropic; acerto não inferior; sem espera visível do
resumo no limiar.

## Rollback

`compaction.mode=serialized` (padrão atual).
