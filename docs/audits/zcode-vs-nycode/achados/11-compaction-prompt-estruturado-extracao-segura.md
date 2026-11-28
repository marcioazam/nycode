# Achado 11: Extracao Segura do `<summary>` na Compaction (Sem Corrupcao por `$'` ou Texto Pre-Resumo)

- **Classe**: **B** (altera o texto resumido injetado apos compactacao, afetando a continuidade das tarefas; exige eval antes)
- **Prioridade**: **P2 (Baixo custo de mudanca e corrige bugs classicos de regex/LLM)**

## Problema

Duas falhas conhecidas em summarizers de compactacao degradam sessoes longas:
1. Quando um modelo em compactacao emite uma frase introdutoria antes do resumo ou tenta justificar antes de resumir, um parser que pega o texto cru ou a primeira ocorrencia preserva lixo ou perde a estrutura; pior ainda, `str.replace(marker, formattedSummary)` em JS interpreta `$&`, `$'` e `$$` presentes em trechos de codigo/bash dentro do resumo gerado, corrompendo silenciosamente o checkpoint!
2. Em compactacoes sucessivas, partes criticas do segmento recente (`preservedSegment` ou ultimas interacoes) precisam permanecer verbatim sem perder a fronteira exata.

## O que o ZCode faz (`~/source/zcode-ref`)

- **Arquivos e linhas**: `apps/zcode-cli/packages/core/src/compact/prompt.ts:1-206` e `apps/zcode-cli/packages/core/src/agent/compact-session.ts:1-116` (`~/source/zcode-ref`).
- **Mecanismo concreto**:
  1. `selectCompactSummaryText` e `hasCompactSummaryBlock` em `apps/zcode-cli/packages/core/src/compact/prompt.ts` garantem que apenas blocos contendo `<summary>...</summary>` validos sejam extraidos (descartando `<analysis>` rascunho de chain-of-thought para nao inflar a proxima janela!) e validando se houve resumo util antes de substituir a historia.
  2. `buildCompactSummaryMessage` usa explicitamente funcao callback `.replace(..., () => summary)` (`apps/zcode-cli/packages/core/src/compact/prompt.ts`) para neutralizar sequencias `$'` / `$$` quando o resumo contem trechos de Shell, Regex ou PHP/Perl.
  3. `compactPreservedSegmentMessages` (`compact-session.ts`) preserva mensagens iniciais ancoradas + segmento final verbatim.

## Como o nycode faz hoje (`~/source/nycode-audit-zcode`)

- **Arquivos e linhas**: `packages/coding-agent/src/core/compaction/compaction.ts:507-593,952-1104` e `packages/coding-agent/src/core/compaction/utils.ts:162-164`.
- O prompt do `nycode` e **muito mais enxuto** (**56** system + **197** user = **253 tokens** + **120 tokens** para `TURN_PREFIX_SUMMARIZATION_PROMPT`, contra **2.391 tokens** em `apps/zcode-cli/packages/core/src/compact/prompt.ts` do ZCode!), o que economiza ~2.000 tokens em toda chamada de compactacao — vantagem que o `nycode` deve preservar!
- O `nycode` tambem ja trata `stopReason === "length"` e `toolCall` inesperado (`getSummarizationFailure` em `compaction.ts:585-593,1096`), ja calcula split-turn prefix e ja injeta `<read-files>`/`<modified-files>`.
- Porem, `nycode` ainda usa o texto completo `result.text` direto (sem bloco `<summary>` delimitavel caso o modelo gere raciocinio antes do checkpoint Markdown) e nao usa funcao de substituicao imune a `$'` se algum template interpolar resumo via `.replace`.

## Diferenca concreta

- **O que aproveitar (enxuto)**:
  1. Instruir opcionalmente delimitadores `<summary>...</summary>` (ou extracao deterministica segura quando o modelo emite texto introdutorio antes de `## Goal`), descartando rascunho/preambulo antes de persistir no `CompactionEntry`;
  2. Garantir zero uso de `.replace(pat, string)` com strings nao escapadas (sempre template literal ou callback `() => str`) em toda formatacao de summary/branch summary (`branch-summarization.ts`).
- **O que NAO copiar**: o `BASE_COMPACT_PROMPT` de **2.391 tokens** do ZCode — manter o prompt conciso de ~253 tokens do `nycode`!

## Beneficio esperado

- Evita perda de secoes estruturadas ou poluicao do checkpoint por preambulos conversacionais e elimina bug silencioso de substituicao `$'` em trechos com variaveis shell/JS.

## Custo

- **Tokens/turno** (`o200k_base`): **+0 a +25 tokens** apenas na chamada eventual de `compact()`, mantendo ~**2.100 tokens a menos** que o ZCode.
- **Latencia**: 0 ms extra em turnos normais.
- **Manutencao**: muito baixa (<30 linhas em `compaction.ts`).

## Riscos e armadilhas

- Se o modelo falhar em fechar `</summary>`, o extrator deve ter fallback limpo para o texto a partir de `## Goal` (nao descartar resumo valido por falta de tag de fechamento).

## Licenca e proveniencia

- Referencia ZCode **Apache-2.0** (`~/source/zcode-ref/LICENSE:1-202`). Implementacao original sobre `compaction.ts` / `compaction.test.ts`.

## Proposta de desenho no nycode

- `packages/coding-agent/src/core/compaction/compaction.ts:507-538,1038`: adicionar parser `extractSummaryCheckpoint(rawText)` que extrai bloco `<summary>` se presente ou recorta do primeiro `## Goal` para frente, rejeitando preambulos como `"Sure, here is..."`, usando concatenacao pura (sem `.replace` com string dinamica).

## Testes previstos

- `packages/coding-agent/test/compaction.test.ts`: entradas contendo `$'`, `$$`, preambulo conversacional antes de `## Goal`, e `<analysis>...</analysis><summary>...</summary>`.

## Plano de eval (`bench/` / `packages/evals`)

- **Baseline vs Candidato**: executar casos de compactacao encadeada (`evals` / subconjunto longo de `bench/` com compactacao forcada aos ~50% de janela em `suites.toml`), comparando fidelidade de caminhos/simbolos retidos e taxa de resolucao pos-compactacao. Sem reexecutar referencia vanilla (`docs/bench/RUNBOOK.md`).

## Criterios de aceite e rollback

- **Aceite**: checkpoint nunca persiste `$'` corrompido nem perde secoes por preambulo; evals de sessao longa com compactacao empatam ou superam o baseline.
- **Rollback**: restaurar parser de retorno em `compaction.ts`.
