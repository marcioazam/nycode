# Plano: sincronia do todo (W7), codemode híbrido e rótulos (2026-11-25)

Branch `harness/todo-sync-codemode` (worktree `~/source/nycode.wt/todo-sync`, base `deaab137`).

## Autorização

- Dono, 2026-11-25: escolheu "1+2+3+4+5 (recomendado)" para a sincronia do todo e pediu medir custo x benefício
  ("é importante o humano operador ter controle de tarefas concluídas, com erro etc.").
- Dono, 2026-11-25: escolheu "Codemode híbrido + A/B no bench (recomendado)" e "Só ajustar rótulos nos docs".
- Overlay do dono: commits, push, PR e merge autônomos dentro do trabalho pedido, só com tudo verde.

## Aceitação

1. Lista única no plano: concluir um item ligado a uma etapa marca a etapa (a tag `[DONE:n]` continua valendo).
2. Status `failed`, `blocked`, `cancelled` com motivo opcional, cores próprias na aba Todo, no widget e no
   cabeçalho do plano. `failed`/`cancelled`/`blocked` não concluem a etapa do plano; o cabeçalho mostra
   concluídas/total mais contagens de falha e bloqueio.
3. Checagem no fim do turno (`agent_before_settle`, no máximo uma vez por turno, pulada se outro gate já bloqueou o
   turno, fora de subagente e de plan mode): com trabalho no turno, lista parada e item aberto, pede uma de três
   saídas: concluir/falhar item, bloquear/cancelar, ou `todo confirm`. `blocked` conta como adiado (não aberto).
4. Itens por evento: `run` em segundo plano e subagente em segundo plano criam "aguardando X" ligado ao id; ao terminar,
   um lembrete único cita o item e sugere `failed` quando o evento falhou. PR esperando CI: fora deste corte.
5. Lembrete por contagem: de 10 para 30 chamadas, no máximo 2 por sessão.
6. Tudo de 3 a 5 atrás de `todo.sync` (env `NYCODE_TODO_SYNC_V2`), desligado por padrão até o A/B passar.
7. Métrica no bench (`bench/metrics/trace.py`, contrato de estado em `_shared/events/plan-mode-state.ts`): turnos só de todo, coerência da lista no fim, lembretes atendidos.
   Regra pré-registrada para ligar por padrão: razão de custo por tarefa ≤ 1,05, sem perda de acerto, coerência maior.
8. MCP: `autoEnableToolSearch` (padrão false) ativa `tool_search` junto com `codemode`. Vira padrão só se o A/B
   empatar ou ganhar em acerto e custo.
9. Docs: git-checkpoint Núcleo, diagnostico Harness, docs-pointer segue Núcleo; decisão e fontes registradas.

## Unidades

- U1 (todo núcleo): `todo/{index,plan-link,stale-reminder,status}.ts`, `_shared/events/plan-mode-state.ts`,
  `plan-mode/{index,messages}.ts`, settings, testes de todo e settings.
- U2 (depois de U1): `todo/{turn-check,external}.ts`, `run/index.ts`, `subagent/index.ts`, `core/modes.ts`, testes.
- U3 (paralela a U1): `mcp/{index,config}.ts`, `docs/mcp.md`, `bench/metrics/*`, `bench/arms*`, `docs/harness/*`
  (exceto este arquivo), CHANGELOG.

## Riscos

- Teto de bloqueios: `DEFAULT_STOP_HOOK_BLOCK_CAP` vale só para o Stop hook de shell; gates de extensão limitam-se
  a um bloqueio por turno, então a checagem nova pula o turno em que outro gate já bloqueou.
- Custo: o Goose mediu +17–49% de custo com prompts de todo; por isso tudo fica desligado até o A/B.

## Checkpoint

- [x] U1 feita  - [x] U3 feita  - [x] U2 feita  - [x] revisão rodadas 1 e 2 corrigidas  - [ ] gate  - [ ] A/B bench  - [ ] entrega

Notas da revisão: o bench roda headless e o `headless-lean` tira a ferramenta `todo` (item 8); o A/B do todo compara
`nycode-todo-v2` com o controle `nycode-todo-v1`, ambos com `NYCODE_HEADLESS_TRIM=0`. Subagente cancelado ainda
sugere `todo fail` (não `cancel`); aceito por ora.
