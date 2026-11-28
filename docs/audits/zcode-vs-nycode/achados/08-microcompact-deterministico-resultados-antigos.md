# Achado 08: Microcompact Deterministico Pre-LLM para Limpar Resultados Antigos

- **Classe**: **B** (altera o historico visivel enviado ao modelo e o prefixo cacheado; exige eval cuidadoso antes de habilitar por padrao)
- **Prioridade**: **P2 (Alto potencial de economia de tokens, exige validacao cache vs janela)**

## Problema

Na maioria das sessoes de codigo, 70%–85% dos tokens acumulados no historico sao saidas antigas de `read`, `bash`, `grep` e `edit` que o modelo ja processou ha 6–15 turnos. Esperar o contexto atingir quase 100% da janela para rodar uma sumarizacao LLM cara (`compact()`) obriga pagar custo alto de resumo alem de perder detalhes verbatim das ultimas mensagens ou sofrer overflow subito com comandos barulhentos.

## O que o ZCode faz (`~/source/zcode-ref`)

- **Arquivos e linhas**: `apps/zcode-cli/packages/core/src/compact/microcompact.ts:1-291` e `apps/zcode-cli/packages/core/src/runtime/methods/microcompact.ts:22-100` (`~/source/zcode-ref`).
- **Mecanismo concreto**: antes de tentar `autoCompactIfNeeded`, ZCode roda `maybeLocalMicrocompactMessages` (`apps/zcode-cli/packages/core/src/compact/microcompact.ts`) com custo de **0 tokens LLM**:
  1. Preserva intactos os ultimos `5` grupos de chamadas de ferramenta;
  2. Nas chamadas anteriores das tools elegiveis (`Read`, `Bash`, `Grep`, `Glob`, `WebFetch`, `WebSearch`, `Edit`, `Write`, `ApplyPatch`), mantem erros intactos (salvo `clearErrorResults`) e midia intacta, e substitui payloads textuais grandes por `[Old tool result content cleared]`;
  3. Dispara sob duas politicas configuraveis: **`TimeBased`** (apos `> 60 min` ocioso, quando o prompt cache de 5m/1h provavelmente ja expirou — tornando a reescrita de prefixo quase gratis em cache!) ou **`TokenPressure`** (`threshold = min(floor(auto*0.9), auto - 2000)`);
  4. So aplica a substituicao se `tokensSaved >= 256`, gravando um evento `MicrocompactBoundary`.

## Como o nycode faz hoje (`~/source/nycode-audit-zcode`)

- **Arquivos e linhas**: `packages/coding-agent/src/core/session-manager.ts:176-180,1381`, `packages/coding-agent/src/core/compaction/compaction.ts:227-262`, e `packages/coding-agent/src/core/agent-session.ts:1377-1383,3268-3296`.
- `nycode` ja possui toda a infraestrutura de projecao reversivel: `SessionManager.appendContextEdit(targetId, replacement)` grava edicoes sem destruir o JSONL original, `buildSessionProjection` aplica os `context_edit` ao contexto projetado para o modelo, e `estimateProjectedContextTokens` (`compaction.ts:227-262`) ja recalcula o uso de janela descontando os `context_edit`!
- Contudo, hoje `nycode` chama `appendContextEdit` **somente** para omitir tentativas falhas de overflow (`_omitRecoveryAttempt` em `agent-session.ts:1379`), nunca para podar deterministicamente `toolResult` antigos antes de acionar `compact()`.

## Diferenca concreta

- **Necessario**: criar uma politica pura `prepareMicrocompactEdits(projection, { keepRecentToolGroups: 5, idleMs: 60 * 60_000, pressureRatio: 0.9 })` emitindo `appendContextEdit(targetEntryId, [{ type: "text", text: "[Old tool result cleared]" }])` no limiar exato em que **ou** o cache de prefixo ja expirou por ociosidade (`> 5m` sem `prefixCache1h` ou `> 60m` com `prefixCache1h`), **ou** esta prestes a disparar `compaction` de qualquer modo.
- **Complexidade opcional**: nao reescrever `messageHistory` em memoria fora de `appendContextEdit`; o proprio `SessionManager` ja suporta replay na arvore JSONL.

## Beneficio esperado

- Economiza tokens nas continuacoes apos pausa longa (>1h) onde o cache ja expirou: limpar saidas antigas reduz diretamente tokens `input` e custo sem perda adicional de cache.
- Reduz o numero de chamadas LLM de `compact()` completo e posterga perda de fidelidade conversacional.

## Custo

- **Tokens/turno**: quando acionado por pressao, economiza milhares de tokens nos turnos subsequentes, mas **invalida o prefixo de prompt cache daquela requisicao** (reescrevendo tokens com `cacheWrite` 1x). Se disparado apenas apos expiracao do TTL de cache (`idle > cacheTtlMs`), o custo liquido e quase sempre negativo (lucro imediato).
- **Latencia**: <2 ms local.
- **Manutencao**: media (~120 linhas em `packages/coding-agent/src/core/compaction/` + integracao em `agent-session.ts`).

## Riscos e armadilhas

- **Armadilha critica de prompt cache** (regra explicita do harness `nycode` em `PRD.md` e `packages/coding-agent/src/extensions/prefix-cache-1h/index.ts:4-8`): invalidar o prefixo cedo enquanto o cache de 5 min ou 1h ainda esta quente custa `1.25x`–`2x` em `cacheWrite` e **piora** o custo x beneficio! Portanto, a versao candidata DEVE amarrar o modo de ociosidade ao TTL efetivo (`> 5 min` ou `> 60 min` quando `prefix-cache-1h` esta ativo) e o modo de pressao apenas imediatamente abaixo do `threshold` da compactacao.
- Risco secundario: apagar o resultado de um `read` cujo codigo o modelo ainda precisara editar 10 turnos depois, forcando nova leitura.

## Licenca e proveniencia

- Conceito e algoritmo de referencia de `~/source/zcode-ref/apps/zcode-cli/packages/core/src/compact/microcompact.ts` (**Apache-2.0**, `~/source/zcode-ref/LICENSE:1-202`). Implementacao limpa no `nycode` reutilizando `ContextEditEntry` ja existente.

## Proposta de desenho no nycode

- Criar `packages/coding-agent/src/core/compaction/microcompact.ts` operando sobre `SessionProjection` para gerar rascunhos `{ type: "context_edit", targetId, replacement }`.
- Integrar opcionalmente atras de setting/flag experimental em `AgentSession` antes de `_checkCompaction`, respeitando `prefixCache1h` TTL (`packages/coding-agent/src/core/cache-stats.ts:8`).

## Testes previstos

- Testes unitarios em `packages/coding-agent/test/compaction-microcompact.test.ts`: verificar preservacao dos ultimos 5 grupos de tools, preservacao de `isError`, economia minima de 256 tokens, e replay deterministico de `buildSessionProjection` + `tree-selector`.

## Plano de eval (`bench/` / `packages/evals`)

- **Baseline vs Candidato A/B em `bench/`**: rodar suites longas (`tb2`, `swebenchpro` subconjunto de >=25 tarefas com >15 turnos) medindo:
  1. Custo total em USD e `input + cacheWrite + cacheRead` (usando precos reais de provider, verificando que economia em contexto supera eventuais rewrites de cache);
  2. Taxa de re-leituras (`read` repetido do mesmo arquivo);
  3. AHEAD_P / taxa de sucesso comparada ao baseline (sem reexecutar referencia vanilla).

## Criterios de aceite e rollback

- **Aceite**: custo total por tarefa menor ou igual ao baseline e perda de acuracia zero dentro da margem estatistica; zero regressions em `buildSessionProjection` / `/tree`.
- **Rollback**: desligar o flag de microcompact ou remover `microcompact.ts` deixando `ContextEditEntry` apenas para recovery.
