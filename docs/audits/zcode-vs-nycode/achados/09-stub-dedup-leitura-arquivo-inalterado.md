# Achado 09: Deduplicacao de Leitura Repetida em Arquivo Inalterado (`READ_FILE_UNCHANGED_STUB`)

- **Classe**: **B** (altera o texto retornado pela ferramenta `read` ao modelo e muda a conducao do loop quando ha releitura; exige eval antes)
- **Prioridade**: **P3 (Bom ROI para sessoes extensas, exige cuidado apos microcompact/compactacao)**

## Problema

Modelos frequentemente chamam `read` no mesmo arquivo (com mesmo `offset`/`limit`) varias vezes ao longo de uma tarefa longa, re-injetando 500–2.000 linhas (2.000–8.000 tokens) identicas no historico sem que o arquivo tenha sido alterado em disco nem modificado por nenhuma ferramenta.

## O que o ZCode faz (`~/source/zcode-ref`)

- **Arquivos e linhas**: `apps/zcode-cli/packages/core/src/tool/handlers/read.ts:49,53` e `apps/zcode-cli/packages/core/src/tool/handlers/read-text.ts:17-18` (`~/source/zcode-ref`).
- **Mecanismo concreto**: ZCode mantem um `ReadFileStateMap` (`apps/zcode-cli/packages/core/src/runtime/agent-runtime.ts:377`) indexando por caminho `mtimeMs`, `offset`, `limit` (e atualizando tambem apos `Edit`/`Write` com sufixo `"no need to Read it back"` em `apps/zcode-cli/packages/core/src/tool/handlers/edit.ts:69` e `apps/zcode-cli/packages/core/src/tool/handlers/write.ts:51-52`). Quando o modelo invoca `Read` com a mesma visao de arquivo e `mtimeMs` nao mudou, o handler retorna um stub curto de ~18 tokens em vez de reler o arquivo:

```typescript
// ~/source/zcode-ref/apps/zcode-cli/packages/core/src/tool/handlers/read-text.ts:17-18
export const READ_FILE_UNCHANGED_STUB =
  "Wasted call — file unchanged since your last Read. Refer to that earlier tool_result instead.";
```

## Como o nycode faz hoje (`~/source/nycode-audit-zcode`)

- **Arquivos e linhas**: `packages/coding-agent/src/core/tools/read.ts:1-100`.
- `read` sempre le e transmite o trecho integral (ate `DEFAULT_MAX_LINES` / `DEFAULT_MAX_BYTES`), sem consultar se o ramo ativo ja possui aquele exato intervalo de linhas de um `mtimeMs` identico.

## Diferenca concreta

- **Necessario**: rastrear na sessao ativa `ReadFileState` por caminho (`mtimeMs`, `offset`, `limit`, `entryId` no ramo atual) e retornar stub curto somente **se** a leitura anterior equivalente ainda estiver visivel na janela ativa (ou seja, nao foi removida por `compaction` nem limpa por `context_edit`!).
- **Complexidade opcional**: nao portar `read_batch_notice` nem todas as variantes de PDF/video do ZCode juntos; comecar so pela deduplicacao de texto em `packages/coding-agent/src/core/tools/read.ts` invalidadas por `edit`/`write`/`bash` ou mudanca de `mtimeMs`.

## Beneficio esperado

- Elimina repeticoes inteiras de arquivos grandes durante refatoracoes longas, economizando centenas a dezenas de milhares de tokens acumulados por sessao.

## Custo

- **Tokens/turno**: economiza ~500 a >5.000 tokens por releitura redundante; stub custa ~18 tokens (`o200k_base`).
- **Latencia**: economia de streaming dos tokens economizados.
- **Manutencao**: baixa (~70 linhas acoplando `statSync` + verificacao contra fronteira da ultima compactacao no ramo).

## Riscos e armadilhas

- **Risco severo se acoplado mal com compaction/microcompact**: se a leitura antiga foi resumida em `compaction` (ou substituida por `[Old tool result cleared]` no Achado 08), devolver `"Refer to that earlier tool_result instead"` deixa o modelo cego e em loop! Portanto, o mapa de leituras DEVE invalidar entradas cujo `entryId` ficou antes de `firstKeptEntryId` ou foi alvo de `context_edit`.
- Tambem invalidar quando `bash` rodou entre as leituras (porque comandos `git checkout`, `biome --write`, codegen podem modificar `mtimeMs` ou nao manter garantia caso `mtimeMs` tenha resolucao grossa).

## Licenca e proveniencia

- Referencia ZCode **Apache-2.0** (`~/source/zcode-ref/LICENSE:1-202`). Desenho independente no `nycode` integrado ao `SessionProjection`.

## Proposta de desenho no nycode

- Extensao opcional ou estado leve acoplado ao `read` em `packages/coding-agent/src/core/tools/read.ts` recebendo um leitor de estado do ramo ativo (invalidado por mudanca de `mtimeMs + size`, por `compaction` / `context_edit`, `/tree` ou execucao de `bash`).

## Testes previstos

- `packages/coding-agent/test/` verificando: segunda chamada identica retorna stub curto; edicao externa muda `mtimeMs` e rele conteudo novo; apos `compact()`, leitura volta a retornar conteudo integral.

## Plano de eval (`bench/` / `packages/evals`)

- **Baseline vs Candidato**: avaliar em `suites.toml` (`multi` e tarefas com multi-arquivos de `tb2`/`swebenchpro`) comparando tokens de contexto consumidos, taxa de chamadas `read` repetidas e taxa de sucesso (garantindo zero loops de cegueira pos-compactacao). Nao reexecutar referencia vanilla (`docs/bench/RUNBOOK.md`).

## Criterios de aceite e rollback

- **Aceite**: reducao mensuravel de tokens re-lidos sem degradar pass rate nos evals multi-turno, com invalidacao verificada apos `compact()` e `bash`.
- **Rollback**: remover o cache de estado no `createReadToolDefinition`.
