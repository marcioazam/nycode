# #168: bootstrap do ambiente e lições de falha

Data: 2026-11-24. Hipótese: um primeiro turno de bootstrap (árvore, spec, comando de teste, rodar os testes uma vez) e
lições gerais tiradas de falhas anteriores reduzem tentativas perdidas nas tarefas difíceis.

## Regra de adoção (pré-registrada, a mesma do #175)

Acerto não inferior (limite inferior do IC90 pareado > −10 pp) e US$/acerto ≤ 1,00× da base; senão, rejeitar.

## Desenho

- Lições tiradas só das falhas `dev` do K1 (`hard-plugin-registry`: API de módulo quebrada na refatoração;
  `hard-six-modules`: entrada `None`), escritas em termos gerais, sem nome de tarefa.
- Aplicadas só nas 4 tarefas `heldout` da s8 (reservadas): `hard-api-v2-migration`, `hard-event-sourcing-replay`,
  `hard-money-multicurrency`, `hard-tz-schedule`; k = 3.
- Base: as mesmas 4 tarefas no K1 (`k1-hard-2026-11-24`). Candidato: overlay `nycode-2026-11-24-168` (settings do
  `noperso` + `AGENTS.md` com o bootstrap e as duas lições), rodada `~/.local/state/bench/168-heldout-2026-11-24`,
  US$ 2,11.

## Resultado

| Tarefa | Base: acerto | Cand.: acerto | Base: US$ | Cand.: US$ | Turnos base | Turnos cand. |
| --- | --- | --- | --- | --- | --- | --- |
| api-v2-migration | 3/3 | 3/3 | 0,821 | 0,804 | 7, 7, 8 | 6, 8, 7 |
| event-sourcing-replay | 3/3 | 3/3 | 0,426 | 0,473 | 5, 5, 6 | 5, 8, 7 |
| money-multicurrency | 3/3 | 3/3 | 0,677 | 0,683 | 5, 7, 8 | 7, 6, 8 |
| tz-schedule | 3/3 | 3/3 | 0,192 | 0,153 | 10, 7, 9 | 5, 5, 5 |

Δacerto 0 pp (12/12 nos dois; IC90 [0; 0]); US$/acerto 0,1764 → 0,1761, razão **0,998×**.

## Decisão

**Passa a regra por margem nula, sem efeito mensurável.** Acerto igual (as tarefas reservadas já saturam em 12/12) e
custo 0,998×: a única diferença visível é `tz-schedule` (turnos 7–10 → 5, US$ −20%), compensada por
`event-sourcing-replay` (+11%). Com n = 4 tarefas saturadas, o resultado não separa efeito de ruído.

Não entra no produto por esta rodada: mudar o contrato embarcado (`resources/instructions/contract.md`) é mudança de
prompt e passa pelo `bench-pr` no tier `pr`, que mede 42 tarefas pareadas. Fica como decisão do dono: (a) abrir a PR
do contrato com o bootstrap e as duas lições e deixar o `bench-pr` decidir; (b) registrar e não adotar.
