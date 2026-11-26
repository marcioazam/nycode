# /subagents-setup por projeto (2026-11-26)

## Problema

A política de roteamento dos subagentes (quais modelos e esforços eles podem usar) só existia num arquivo global,
`~/.nycode/agent/subagent-routing.json`. Um repositório não tinha como restringir ou trocar esses modelos sem mudar a
política de todos os outros. Exemplo: com o `devin/swe-2.1` fora da conta, a única saída era editar o arquivo global.

## Decisão

O dono pediu (2026-11-26) uma política de projeto que sobrepõe a global.

- Arquivo: `<cwd>/.nycode/subagent-routing.json`, no mesmo formato do global (`{"version": 1, "models": {...}}`).
- Precedência: `NYCODE_SUBAGENT_ROUTING_FILE` > arquivo do projeto (só com o projeto confiável e o arquivo presente) >
  global. O arquivo do projeto substitui o global inteiro; não há mescla.
- Confiança: o arquivo do projeto é controlado pelo repositório, então só vale quando o projeto está aprovado
  (`isProjectApprovedSilently`, a mesma porta dos agentes de projeto). Sem confiança ele é ignorado.
- Filhos: o pai passa ao filho `NYCODE_SUBAGENT_ROUTING_FILE` com o arquivo que usou, então um subagente aninhado segue
  a mesma política mesmo rodando em outro `cwd`.
- A descrição e o schema do tool `subagent` são recalculados no `session_start` e só registrados de novo quando a
  política em vigor muda.

## Contrato do comando

- `/subagents-setup`: modal que grava o arquivo global (sem mudança).
- `/subagents-setup project`: modal que grava o arquivo do projeto; começa da política do projeto ou, sem ela, da que
  está em vigor. Em projeto não confiável: erro `needs a trusted project (/trust)`, nada é gravado.
- `/subagents-setup [project] off`: remove o arquivo do alvo (global ou projeto). Remover o global não desliga um
  arquivo de projeto em vigor.
- `/subagents-setup show`: mostra a política em vigor e o caminho do arquivo de onde ela vem.

## Testes

- `test/harness/subagent/routing/round3.test.ts` (7): precedência do `policyFile` e o arquivo herdado pelo filho.
- `test/harness/subagent/routing/integration.test.ts` (projeto confiável): tool, `show`, `project`, `project off` e a
  recusa sem confiança.
- Contrato anterior: `loadPolicy`, `savePolicy`, `removePolicy` e `formatPolicy` recebiam o `env`; agora recebem o caminho
  do arquivo (`policyFile(env, trustedCwd)` resolve o caminho). Os testes de `route.test.ts` e `round3.test.ts` passaram
  a passar o caminho, sem mudar as asserções.
