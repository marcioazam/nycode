# 17. Tool `patch` (formato apply_patch) para modelos GPT

Classe: **B**. Prioridade: **P3**.

## O que o OpenCode faz

`packages/core/src/tool/plugin/patch.ts:24-30` (`patchText`: "The full patch text describing add, update, and delete
operations"), descrição em `DESCRIPTION` (`:18,77`, arquivo `packages/core/src/tool/patch.txt`). Add, update e delete de vários arquivos numa chamada. Correção recente:
`CHANGELOG.md:36` (v2.4.2, #66378) (linha em branco final em arquivo adicionado).

## Como o nycode faz

`packages/coding-agent/src/core/tools/edit.ts:32` com `edits[]` múltiplos num arquivo por chamada (schema medido 239 tok);
criação por `write` (`packages/coding-agent/src/core/tools/write.ts:11-12`, 85 tok). Sem formato de patch multi-arquivo (`rg -n apply_patch packages/coding-agent/src/core/tools`
vazio).

## Diferença

Modelos GPT/Codex são treinados no formato apply_patch; em Anthropic não há vantagem conhecida.

## Benefício

Possível acerto maior e menos chamadas em GPT para mudanças multi-arquivo.

## Custo

+1 tool no schema: a descrição do OC (`packages/core/src/tool/patch.txt`, importada em `patch.ts:18`) mede 262 tok, mais
o parâmetro `patchText`, ou troca de `edit` por `patch` por família. Manutenção: parser de patch.

## Riscos

Dois caminhos de edição para manter; patch malformado.

## Licença

MIT (OC); o formato apply_patch é do Codex (Apache-2.0).

## Proposta

Só por família GPT, como alternativa a `edit` (não adicional), atrás de setting.

## Testes

Parser: add/update/delete, contexto ambíguo, CRLF, linha final.

## Plano de eval

Modelo GPT: `edit` vs `patch` em tarefas multi-arquivo. Métricas: acerto, chamadas, tokens.

## Aceite

Acerto maior ou igual com menos tokens em GPT.

## Rollback

Setting desligada.
