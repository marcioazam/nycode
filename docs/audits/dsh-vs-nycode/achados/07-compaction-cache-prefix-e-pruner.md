# Achado 07: Compactação em duas fases (podador gratuito de `toolResult` + replay com preservação de prefix cache)

## O que o `dsh` faz

O pipeline de compactação do `dsh` executa em **duas etapas**, priorizando corte determinístico sem LLM antes de resumir e preservando o prefix cache quando precisa chamar o resumidor:

1. **Etapa 1 sem modelo (`ToolResultPruner`)**: em `packages/compaction/compaction-basic/src/index.ts:364-368`, ao atingir pressão de contexto, o `dsh` roda `prune.pruneSession(agent.session)` (`packages/compaction/compaction-tool-result-pruner/src/index.ts:136-182`) e remede tokens via `tokenMeter.measure`. Se já caiu abaixo do limiar, **nenhuma chamada de LLM é feita**. O podador corta resultados antigos acima de `8.192` chars preservando `4.096` chars de início + `[... tool result middle pruned ...]` + `1.024` chars de fim (`config.ts:7-14`) sem mutar o log original (`surfaceOp: { op: 'replace' }`).
2. **Etapa 2 com reuso de KV cache**: em `packages/compaction/compaction-basic/src/region.ts:550-568` e `summarizer.ts:143-160`, a requisição de resumo reproduz `[systemHead, ...shadowedSeqs]` + `header.tools` originais e apenas anexa `COMPACTION_INSTRUCTION` como última mensagem `user`, enviando `sessionId` original (header `x-deepseek-harness-compact: '1'`):

```ts
// packages/compaction/compaction-basic/src/region.ts:565-568
return {
  ...header?.tools === undefined ? {} : { tools: header.tools },
  messages: system === null ? regionMessages : [system, ...regionMessages],
}

// packages/compaction/compaction-basic/src/summarizer.ts:143-148
const messages: RequestMessage[] = [
  ...input.messages,
  deepFreeze({
    role: 'user',
    content: [{ type: 'text', text: COMPACTION_INSTRUCTION }],
  }),
]
```

## Como o `nycode` faz hoje

1. O `nycode` não possui etapa pré-LLM de poda determinística em `packages/coding-agent/src/core/compaction/compaction.ts`: quando `shouldCompact` dispara (`contextTokens > contextWindow - reserveTokens`, onde padrão é `16.384` em `compaction.ts:126-130,267-270`, ou `NYCODE_COMPACT_AT` / `/contexto`), vai direto para sumarização com LLM (`generateSummary` em `compaction.ts:644`). Durante a preparação de texto para o resumo, `serializeConversation` (`packages/coding-agent/src/core/compaction/utils.ts:121-156`) achata todas as mensagens em texto plano (`[User]: ...`, `[Assistant tool calls]: ...`, `[Tool result]: ...` com corte em `2.000` chars).
2. `completeSummarization` (`packages/coding-agent/src/core/compaction/compaction.ts:618-638`) **desativa explicitamente o prompt cache** (`cacheRetention: "none"` na linha `630`) e não reaproveita nem `systemPrompt` nem `tools` do prefixo já em cache no provedor:

```ts
// packages/coding-agent/src/core/compaction/compaction.ts:628-632
const requestOptions: SimpleStreamOptions = {
  ...options,
  cacheRetention: "none",
  sessionId: options.sessionId ?? uuidv7(),
};
```

## Diferença concreta

- **Economia pré-sumarização**: resultados gigantes de `bash`/`read`/`codemode` antigos disparam sumarização cara no `nycode` mesmo quando podar o meio de 2 ou 3 resultados antigos liberaria dezenas de milhares de tokens sem tocar no raciocínio nem chamar LLM.
- **Custo de entrada da sumarização**: no `nycode`, resumir `N` tokens em Anthropic/OpenAI/DeepSeek paga `1.0x` (sem `cacheRead`) sobre o histórico reserializado inteiro, e o resumo sintetizado sobre texto achatado perde estrutura original de blocos; no `dsh`, o prefixo completo até o fim do intervalo compactado é elegível a `cacheRead` (`~0.1x` custo de entrada) e preserva exatos `toolCall`/`toolResult` originais.

## Classificação

**Classe B** — altera diretamente o histórico visível pelo modelo (tanto a poda intermediária de `toolResult` quanto o formato/contexto da sumarização), mudando potencialmente taxa de acerto em tarefas longas que precisem de trecho do meio de um resultado antigo ou dependam da qualidade do resumo. Exige eval antes de virar padrão.

## Benefício esperado

- Redução substancial de eventos de sumarização (muitas sessões longas resolvem pressão apenas podando o meio de resultados antigos > `8 KiB`, economia direta de chamadas inteiras ao LLM + preservação literal dos turnos recentes).
- Em sumarizações inevitáveis em provedores com prompt cache (Anthropic, DeepSeek), queda de ~70–90% no custo de tokens de entrada da própria chamada de resumo (`cacheRead` em vez de input não-cacheado sobre histórico achatado), reutilizando o prefixo vivo da sessão.

## Custo

- **Tokens/turno**: `0` tokens fixos adicionais no Turno 1 (`o200k_base`); economiza `5k–100k+` tokens no turno em que evita sumarização e converte leitura de resumo em `cacheRead`.
- **Latência**: Etapa 1 (`ToolResultPruner`) leva `< 2 ms` em memória contra `5–20 s` de uma sumarização LLM evitada.
- **Manutenção**: média — exige cuidados com pareamento `toolUse`/`toolResult`, escolha correta de `sessionId` e preservação da trava `ContextEditEntry` (`session-manager.ts:1381-1419`) + rearmamento de `claude-rules` / `context-imports` após compactação.

## Riscos e modos de falha

- Poda de resultado antigo que o modelo realmente precise consultar muitos turnos depois (`toolResult` sem caminho de arquivo externo) pode reduzir recall se o limiar (`8.192` chars) ou o corte (`4.096 + 1.024`) forem agressivos demais. Mitigação: preservar marcador claro com identificador/arquivo de spill quando houver.
- Invalidar o prefix cache da **conversa ativa** após compactar por compartilhar `cacheRetention` errado ou mudar `systemPrompt` no resumo: a sumarização em replay deve manter exatamente `[systemPrompt, ...mensagens_compactadas]` + `[tools]` idênticos ao último turno já aquecido, acrescentando somente a mensagem `user` com a instrução de resumo ao fim — jamais escrevendo o resumo na mesma chave se isso poluir threads paralelos (`sessionId` compartilhado somente até o corte).
- Caso `customInstructions` ou `previousSummary` exijam fusão fora do prefixo (ou quando o modelo ativo não suportar cache de prefixo longo), manter `serializeConversation` atual como fallback.

## Licença

Código-fonte de referência `dsh` sob licença **MIT** (`LICENSE:1-21`).

## Proposta para o `nycode`

1. **Etapa 1 — Podador de `toolResult` sem LLM (`packages/coding-agent/src/core/compaction/`)**:
   - Criar `tool-result-pruner.ts` aplicando recorte puro `thresholdChars = 8192`, `headChars = 4096`, `tailChars = 1024` (excluindo os últimos `keepRecentTokens`) sobre cópia derivada via `ContextEditEntry` ou na preparação de compactação (`prepareCompaction`), antes de chamar `generateSummary`.
   - Recalcular `calculateContextTokens` / estimativa pós-poda; se já abaixo do limiar de `shouldCompact`, concluir compactação sem chamada LLM (registrando entrada leve ou `context_edit`).
2. **Etapa 2 — Replay de prefixo em `completeSummarization` (`packages/coding-agent/src/core/compaction/compaction.ts:618-655`)**:
   - Para modelos compatíveis com prefix cache (Anthropic/DeepSeek/OpenAI quando não há troca de modelo resumidor), montar o contexto da sumarização reproduzindo `systemPrompt` original + `tools` declaradas da sessão + mensagens originais até o ponto de corte + última mensagem `user` com `SUMMARIZATION_PROMPT`, com `cacheRetention` herdado (`"short"` / sessão) e mantendo fallback para `serializeConversation` se o resumidor for um modelo distinto (`modelOverride`) ou se o provedor rejeitar o comprimento em overflow.

## Testes necessários

- Testes unitários em `packages/coding-agent/test/suite/agent-session-compaction*.test.ts`:
  - sessão acima de threshold apenas por 2 `toolResult` > `16 KiB` antigos evita chamada LLM e libera contexto via `ToolResultPruner`;
  - turnos recentes dentro de `keepRecentTokens` nunca são podados;
  - chamada de sumarização com mesmo modelo envia `systemPrompt` + `tools` + prefixo literal + `user` final sem `cacheRetention: "none"`, batendo o cache simulado do `faux` (`packages/ai/src/providers/faux.ts:262-274`);
  - troca de modelo para compactação (`compaction-model-overrides`) faz fallback limpo para `serializeConversation`.

## Plano de eval

- **Baseline**: `nycode` atual em `origin/main` (`serializeConversation` + `cacheRetention: "none"`).
- **Candidato**: Etapa 1 isolada (`pruner`), depois Etapa 1 + Etapa 2 (`replay` com KV cache).
- **Onde rodar**: suite de sessões longas em `packages/evals` e tarefas multi-step pesadas em `bench/` (ex.: Harbor / Terminal-Bench longo com >40 turnos). Nunca re-executar `cc-vanilla` nem `pi-vanilla` — comparar contra referências guardadas em `docs/bench/RUNBOOK.md`.
- **Critérios estatísticos**: taxa de sucesso com IC pareado BCa 90% >= `-0.10` (`bench/stats.py`) e mediana da razão de custo total <= `1.10` (espera-se redução significativa de custo e cache reads > 60% nas compactações).

## Critérios de aceite e rollback

- **Aceite**: `npm run check`, `./test.sh` e eval longo aprovados sem regressão de recall em tarefas após compactação; medição confirmada de `cacheRead > 0` durante chamadas de sumarização.
- **Rollback**: flag/config em `settings.compaction` (`pruneToolResultsBeforeSummary: false`, `cacheFriendlySummary: false`) revertendo instantaneamente para `serializeConversation` puro.

## Prioridade

**Altíssima (P0 entre itens Classe B)** — potencial simultâneo de menor custo em dólares por sessão longa, menor latência de compactação e preservação de detalhes literais nos turnos médios.
