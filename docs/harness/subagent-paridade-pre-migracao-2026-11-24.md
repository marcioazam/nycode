# Paridade dos subagentes com o Nycode pré-migração (2026-11-24)

Pedido do dono (2026-11-24): workers e subagentes com problema devem ficar iguais ao Nycode pré-migração antigo, sem gaps.
Comparação: `~/.pi/agent/claude-home/agents` (Nycode pré-migração em uso) × `packages/coding-agent/resources/agents`.

## Achados e correção

| Gap | Antes | Depois |
| --- | --- | --- |
| Contrato dos agentes | `Read docs/harness/agent-contract.md`, caminho relativo: ENOENT fora deste repositório (o perplexity-scout relatou) | arquivo em `resources/rules/ref/agent-contract.md`, lido por `${NYCODE_RESOURCES}/rules/ref/agent-contract.md` |
| Agentes do usuário | `${NYCODE_RESOURCES}` só era resolvido nos agentes embutidos | resolvido também nos do usuário (`~/.nycode/agent/agents`); os de projeto continuam literais |
| Ferramentas dos writers | `swarm-worker`, `test-author`, `lane-integrator` e `general-purpose` sem `find`, `todo`, `lsp_*`, `subagent` (e `web_fetch` no swarm-worker e no general-purpose) | lista igual à do Nycode pré-migração; `general-purpose` volta a poder chamar `code-mapper` |
| Pins | `gate-runner`, `git-delivery`, `research-scout`, `Explore` em Haiku | Sonnet 5.5, decisão do dono de 2026-11-15 (a skill `swarm-orchestration` já dizia isso) |

Contrato antigo → novo: o caminho `docs/harness/agent-contract.md` deixa de existir; quem o citava passa a citar o caminho
embutido. Teste: `test/harness/subagent/builtin-agents.test.ts` (todo arquivo que um agente embutido manda ler existe a
partir de qualquer cwd; writers com as ferramentas do Nycode pré-migração; marcador resolvido em agentes do usuário e não nos de
projeto). Os dois testes falharam antes da correção e passam depois.

## Fora desta mudança

- Roteamento: com `~/.nycode/agent/subagent-routing.json` listando só `openai-codex/*`, o pin é dica de nível e o filho
  roda num modelo da lista (`routing/route.ts`); por isso os workers rodaram em gpt-6.1-terra. Pôr
  `anthropic/claude-sonnet-5-5` na lista é escolha do dono (`/subagents-setup`), não do código.
