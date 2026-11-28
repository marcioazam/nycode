# Achado 10: Prefixo Estavel sem Metadados Volateis e Catalogo Incremental de Skills

- **Classe**: **B** (altera estrutura/posicionamento de secoes do system prompt e injecao de `<skills>`; exige eval por poder afetar atencao e comportamento do modelo)
- **Prioridade**: **P2 (ROI relevante para cache e higiene de prompt em sessoes longas)**

## Problema

Colocar catalogos mutaveis de habilidades ou metadados volateis dentro do system prompt estatico traz dois efeitos indesejados:
1. Se uma habilidade for instalada/recarregada ou o ambiente mudar no meio de uma sessao longa, alterar o `system` inteiro invalida o prefix cache de toda a conversa;
2. No `nycode`, `system-prompt.ts` injeta `<tools>` (63 tokens) + `<rules>` + `<docs>` (281 tokens, 51% do prompt base bare!) e `<skills>`, enquanto o ZCode descobriu em producao que tirar o catalogo de skills do `system` para anexos incrementais imutaveis preserva o cache.

## O que o ZCode faz (`~/source/zcode-ref`)

- **Arquivos e linhas**: `apps/zcode-cli/packages/core/src/context/builder.ts:47-52,186-200`, `apps/zcode-cli/packages/core/src/skills/listing.ts:16-58`, e `apps/zcode-cli/packages/core/src/context/sections/skills.ts:12-56` (`~/source/zcode-ref`).
- **Mecanismo concreto**:
  1. `ContextBuilder` (`builder.ts:47-52`) declara explicitamente que o system prompt **nao lista docs redundantes de tools** porque eles ja vao nos JSON schemas da API.
  2. `builder.ts:186-192` separa `RUNTIME_ANNOUNCED_SOURCES` (`env_info`, `desktop_context`, `model`, `current_date`) e o catalogo de skills para nao residirem dentro do prefixo fixo cacheado.
  3. `collectSkillsListingAttachment` (`apps/zcode-cli/packages/core/src/skills/listing.ts:21-54`) calcula fingerprint SHA-256 de 16 hex por linha formatada de skill (`formatSkillLine`), inspeciona anexos `skills_listing` ja enviados no historico e **emite apenas o delta** de skills novas ou alteradas (com degradacao automatica para nome+caminho caso exceda `DEFAULT_SKILL_METADATA_BUDGET = 20_000` chars em `apps/zcode-cli/packages/core/src/context/sections/skills.ts:7-25`).

## Como o nycode faz hoje (`~/source/nycode-audit-zcode`)

- **Arquivos e linhas**: `packages/coding-agent/src/core/system-prompt.ts:165-200,226-238` e `packages/coding-agent/src/core/agent-session.ts:1870-1898`.
- `nycode` ja tem um system prompt extremamente enxuto (**547 tokens** bare em `o200k_base`: `preamble` 27, `tools` 63, `rules` 167, `docs` 281, `cwd` 9) comparado a **1.706 tokens** base do ZCode!
- Porem:
  - Em `system-prompt.ts:188-191`, `<skills>` e renderizado diretamente como secao do `system`. Quando o usuario adiciona ou edita uma skill durante a sessao (`/reload`), `diffSystemPromptSections` envia uma patching `SystemMessage`, mas se o prompt inteiro precisar ser re-renderizado no head (`forceSystemPrompt` ou resume sem `thread.continue`), `<skills>` muda o prefixo de `system`.
  - Mesmo no `tools` (`system-prompt.ts:165-168`), uma secao minima de snippets (`63` tokens para as 4 core tools) pode ser avaliada em relacao a zero duplicacao — mas com ganho liquido pequeno frente aos **63 tokens**. Ja a secao `<docs>` (**281 tokens**, mais da metade do bare prompt do `nycode`!) sempre e enviada mesmo quando ninguem pergunta sobre docs do `nycode`.

## Diferenca concreta

- **Necessario**:
  1. Mover `<skills>` (ou delta de skills adicionadas em runtime) para um mecanismo append-only por hash similar a `skills_listing` quando `skills.length > 0` (especialmente em workspaces com skills personalizadas), mantendo `system` imutavel no prefixo cacheado;
  2. Avaliar via eval se encolher/deferir `<docs>` (ou condensar referencias de caminhos do `nycode` de 281 -> ~40 tokens quando nao solicitado) melhora custo sem perder autossuficiencia quando alguem pede customizacao de harness.
- **Complexidade opcional a rejeitar**: nao copiar as secoes prolixas do ZCode (`communication_prompt` 20 + `pronouns_prompt` 78 + `action_caution_prompt` 103 + `finishing_work_prompt` 263 = 464 tokens que o `nycode` intencionalmente evita para manter o prompt enxuto em `547` tokens).

## Beneficio esperado

- Preserva 100% do prefix cache (`system + tools`) mesmo quando skills de projeto ou usuario sao recarregadas em sessao aberta, e potencial reducao de ate ~200 tokens fixos por requisicao se `<docs>` for compactado/movido apos eval.

## Custo

- **Tokens/turno** (`o200k_base`): neutro a **-200 tokens** no prefixo estatico (ou economia de invalidacao de `cacheRead` nas sessoes que recarregam skills; evitar adicionar qualquer prosa do ZCode que aumentaria dos 547 para ~1.706 tokens).
- **Manutencao**: baixa (~80 linhas no `resource-loader` / `system-prompt.ts` / `skills.ts`).

## Riscos e armadilhas

- Alterar o texto ou posicao de `<skills>` / `<docs>` pode mudar a propensao do modelo invocar habilidades ou consultar `packages/coding-agent/docs/extensions.md` em tarefas de meta-harness.

## Licenca e proveniencia

- Padrao `skills_listing` de `~/source/zcode-ref/apps/zcode-cli/packages/core/src/skills/listing.ts` (**Apache-2.0**, `~/source/zcode-ref/LICENSE:1-202`).

## Proposta de desenho no nycode

- Em `packages/coding-agent/src/core/skills.ts` e `system-prompt.ts:188-191`: emitir catalogo inicial de skills em bloco/anexo estavel indexado por SHA-256 e apenas append de deltas em `/reload` para nao tocar em `SystemPromptSections` apos o turno 1.
- Em ramo experimental separado: testar condensacao de `promptSections.docs` (`system-prompt.ts:170-176`) de 281 tokens para referencia curta sob demanda.

## Testes previstos

- Combinar com Achado 02 (`prefix-continuity.test.ts`): recarregar skill no meio de uma conversa e validar que `system` + prefixo historico permanecem append-only.

## Plano de eval (`bench/` / `packages/evals`)

- **Baseline vs Candidato**:
  1. `bench/suites.toml` (`behavior` + tarefas que carregam habilidades e consultam arquitetura do proprio `nycode`), comparando taxa de acerto (AHEAD_P >= baseline), invocation rate de habilidades relevantes e `cacheRead / input` no provider;
  2. Medicao objetiva via `tiktoken` (`o200k_base`) garantindo que o prompt final nao supere os `547` tokens base do `nycode`. Sem reexecucao de vanilla (`docs/bench/RUNBOOK.md`).

## Criterios de aceite e rollback

- **Aceite**: zero regressao em invocation de skills nem em tarefas de docs do harness; taxa de cache hit 100% apos `/reload` de skill em sessao aberta.
- **Rollback**: reverter alteracoes em `system-prompt.ts` e `skills.ts`.
