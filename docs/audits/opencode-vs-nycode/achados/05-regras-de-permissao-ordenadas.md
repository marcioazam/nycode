# 05. Regras de permissão declarativas e ordenadas (last-match) por agente

Classe: **A**. Prioridade: **P3** (custo de manutenção alto, ganho só para quem configura).

## O que o OpenCode faz

- `packages/core/src/permission/policy.ts:27-37`: política composta de três semânticas: `override` (camadas
  last-match: padrões → agente → sessão), `restrict` (deny monótono), `fallback` (aprovações salvas).
- `:76-77` e `:103-104`: `rules.findLast(...)` e, sem casamento, `{ effect: "ask" }`.
- `packages/core/src/util/wildcard.ts:4-14`: `*` e `?`, `"cmd *"` também casa `"cmd"`.
- Doc: `services/site/src/docs/content/permissions.mdx:25` ("The last matching rule wins").
- Subagente usa as próprias permissões; as do pai só decidem quem ele pode chamar
  (`packages/core/src/tool/plugin/subagent.ts:240-252`).

## Como o nycode faz

- `packages/coding-agent/src/core/permissions/guard/decide.ts:53-78`: regras codificadas (shell, edição, leitura); um
  `deny` vence, depois `ask`, depois o modo.
- `guard/modes/decide.ts:45-60`: modos default/acceptEdits/plan/bypass.
- Hooks no formato Claude (`extensions/hooks/decisions.ts:340`: deny > defer > ask > allow).
- Subagentes: `tools`/`disallowedTools` no frontmatter (`extensions/subagent/registry/agents.ts:274-289`).

## Diferença

O nycode não tem uma lista declarativa `{ação, recurso, efeito}` por agente; restringir um agente a, por exemplo,
`shell: git *` exige hook. O OC permite isso em configuração.

## Benefício

Configurar agentes restritos sem escrever hooks. Zero tokens (exceto se combinado com o achado 12).

## Custo

Tokens 0. Manutenção alta: segundo motor de decisão ao lado do guard; precisa definir precedência entre regras do
usuário e o guard (o guard catastrófico tem de vencer sempre).

## Riscos

Dois motores divergentes. Mitigação: regras do usuário só podem estreitar (`restrict`) ou decidir `ask`; nunca
liberar o que o guard nega.

## Licença

MIT; reimplementação do algoritmo (findLast + wildcard é trivial).

## Proposta

1. `core/permissions/rules.ts`: avaliador last-match com `wildcard`.
2. `settings.permissions.rules` global/projeto e `permissions` no frontmatter de agentes.
3. `gate.ts`: guard primeiro (deny vence), depois regras do usuário, depois modo.

## Testes

Tabela de casos do OC (`permissions.mdx`) portada para `packages/coding-agent/test/permissions-rules.test.ts`.

## Plano de eval

Classe A. Sem eval de modelo.

## Aceite

Testes verdes; nenhuma regra do usuário consegue liberar um deny do guard.

## Rollback

Chave de configuração ausente = comportamento atual.
