# 14. Tool de busca em sessões anteriores para o modelo

Classe: **B**. Prioridade: **P3** (nova tool = schema fixo; ganho só em tarefas de retomada).

## O que o OpenCode faz

- `packages/core/src/tool/plugin/session-search.ts:15-30`: tool com `query`, `scope` (`project`/`all`), `sessionID`,
  `directory`, subagentes, `limit` (5 buscando, 20 listando).
- `packages/core/src/session/search-index.ts:319-322`: índice FTS5 (SQLite) com remoção por rowid.

## Como o nycode faz

`packages/coding-agent/src/cli/session-picker.ts:16` (`selectSession`): busca só para o usuário no `/resume`. Sem tool para o modelo
(`rg -n session_search packages/coding-agent/src` vazio). A memória persistente fica em `extensions/memory/`.

## Diferença

O modelo do OC consegue achar "o que decidimos sobre X na semana passada" sem o usuário colar contexto.

## Benefício

Retomada de trabalho sem colar histórico manualmente.

## Custo

Schema novo em toda requisição (~150-250 tok estimados pelo tamanho das descrições de `session-search.ts:15-30`);
índice de texto sobre JSONL (manutenção média). Pode ser carregada sob demanda via `tool_search`
(`packages/coding-agent/src/extensions/tool-search/index.ts:14`, registrada com `defaultActive: false`), o que zera o custo fixo.

## Riscos

Vazar contexto de outro projeto (escopo `all`); padrão deve ser o projeto atual, como no OC.

## Licença

MIT; reimplementação.

## Proposta

Extensão `session-search` registrada como tool diferida (carregada por `tool_search`), índice incremental simples
(ripgrep sobre os JSONL do projeto basta para v1).

## Testes

Busca acha mensagem de outra sessão do mesmo projeto; não acha de outro projeto com escopo padrão.

## Plano de eval

Tarefas de retomada ("continue o que fizemos em X"): acerto e tokens, baseline (sem tool) vs candidato (tool
diferida).

## Aceite

Acerto maior em retomada; custo fixo zero (tool diferida).

## Rollback

Não registrar a extensão.
