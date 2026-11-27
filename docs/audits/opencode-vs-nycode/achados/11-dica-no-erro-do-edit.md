# 11. Dica no erro do edit (texto já aplicado ou linhas mais próximas)

Classe: **B**. Prioridade: **P1** (barata; muda só a saída de erro).

## O que o OpenCode faz

`packages/core/src/tool/plugin/edit.ts:188-215` (`missHint`):

```ts
const hintLines = 12
const hintLineLength = 200
/**
 * A short hint for an oldString miss, so the next attempt can succeed without rereading the file: newString is
 * already there (often an edit that already applied), or the lines closest to oldString, numbered like Read output.
 * Lines vote for where oldString starts when they match ignoring all whitespace; at least half must agree. ...
 */
if (replacement.trim().length >= 20 && normalizeForMatch(view).includes(normalizeForMatch(replacement)))
  return "newString is already in the file, so this edit may already be applied."
```

## Como o nycode faz

`packages/coding-agent/src/core/tools/edit-diff.ts:299,303`: "Could not find the exact text in ${path}. The old text
must match exactly including all whitespace and newlines." Sem dica. Os níveis de casamento difuso são equivalentes
(`edit-diff.ts:71-81` vs OC `edit.ts:164-188`; ver matriz linha 15).

## Diferença

Após um erro de edit, o modelo do nycode costuma fazer um `read` do arquivo (ou trecho) antes de tentar de novo; o OC
devolve até 12 linhas x 200 chars ou avisa que o edit já foi aplicado (caso comum em retry após erro de rede).

## Benefício

Um `read` evitado custa o trecho lido (centenas a milhares de tokens) + um turno. A dica custa no máximo ~12 x 200
chars ≈ 600-700 tok, normalmente bem menos. Assertividade: o aviso "já aplicado" evita edits duplicados.

## Custo

+0 a ~700 tok só no caminho de erro. Manutenção baixa (~60 linhas).

## Riscos

Dica com linhas erradas induz edit errado: exigir maioria de votos (como o OC) e não mostrar além da janela votada.

## Licença

MIT. Algoritmo pequeno; reescrever.

## Proposta

`core/tools/edit-diff.ts`: função `missHint(content, oldText, newText)` anexada às mensagens das linhas 299 e 303.

## Testes

`packages/coding-agent/test/tools.test.ts` (ou arquivo do edit): newText já presente → aviso; oldText com indentação
errada → linhas certas numeradas; arquivo sem semelhança → sem dica.

## Plano de eval

Baseline vs candidato em tarefas de edição (bench). Métricas: `read` após erro de edit (contagem), turnos por edit
bem-sucedido, tokens totais.

## Aceite

Menos `read` pós-erro e tokens totais não maiores.

## Rollback

Reverter (texto de erro volta ao atual).
