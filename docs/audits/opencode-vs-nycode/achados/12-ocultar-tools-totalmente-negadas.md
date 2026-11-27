# 12. Tool totalmente negada sai do schema enviado ao modelo

Classe: **B**. Prioridade: **P2**.

## O que o OpenCode faz

- `packages/core/src/permission/policy.ts:137-170`: `reachableEffects` calcula os efeitos possíveis de uma ação sobre
  qualquer recurso; `isActionDenied` é verdadeiro só quando o único efeito possível é `deny` ("Narrow denies never undo
  a blanket deny").
- `packages/core/src/tool.ts:327`: `if (PermissionPolicy.isActionDenied(policy, tool.options?.permission ?? name))
  continue` ao montar a lista de tools.
- `:427-437`: se `execute` (Code Mode) é negado, as tools do catálogo aparecem diretas.
- Bug corrigido em `CHANGELOG.md:33` (#65899).

## Como o nycode faz

O guard nega na execução (`core/permissions/guard/decide.ts:60`); a tool continua no schema. Só subagentes removem
tools antes (`extensions/subagent/core/child.ts:209-210`, `--exclude-tools`). No plan mode, `extensions/plan-mode/`
troca o conjunto de tools ativo por conta própria.

## Diferença

Uma tool que nunca será permitida (ex.: modo plano sem `edit`, ou regra do achado 05) custa o schema em toda
requisição e pode ser tentada e negada.

## Benefício

Schema medido das tools default do nycode: read 153, bash 145, edit 239, write 85 tok (`README.md`, Medições). Remover
`edit`+`write` num agente só-leitura = -324 tok por requisição (com cache, ~0,1x isso após a primeira).

## Custo

Manutenção baixa se houver regras declarativas (achado 05); sem elas, o ganho fica restrito a configs explícitas
(`--exclude-tools` já cobre). Mudar o conjunto de tools no meio da sessão quebra o cache se não usar
`tool_addition`/`tool_removal` (o nycode já tem: `ai/src/api/anthropic-messages.ts:1527-1532`).

## Riscos

Esconder uma tool que um `ask` poderia liberar: só esconder quando o único efeito é `deny`, como no OC.

## Licença

MIT; algoritmo de alcançabilidade reimplementável.

## Proposta

Depende do achado 05. Em `core/agent-session.ts` (montagem das tools ativas), filtrar tools com `isActionDenied`.

## Testes

Agente com `edit: deny` não recebe `edit` no payload; com `edit: deny` + `edit /tmp/*: allow` recebe.

## Plano de eval

Agentes só-leitura: tentativas negadas por sessão e tokens fixos por requisição, baseline vs candidato.

## Aceite

Zero tentativas de tool negada; tokens fixos menores; acerto igual.

## Rollback

Desligar o filtro.
