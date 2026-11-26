# V1 (#75): leituras independentes agrupadas num turno

Data: 2026-11-24. Braço `nycode`, modelo `claude-sonnet-5-5`, overlay `nycode-2026-11-24-noperso`.

## Regra de adoção (pré-registrada, a mesma do #175)

Adotar só se o acerto for não inferior (limite inferior do IC90 pareado > −10 pp) e o US$/acerto ficar ≤ 1,00× da
base; senão, rejeitar. Números do scoreboard (média por tarefa nas tarefas pareadas).

## Mudança medida

Uma linha do contrato (`resources/instructions/contract.md`, Delivery):

- antes: "Run independent read-only inspections in parallel; edits to overlapping files stay sequential."
- depois: "Issue independent read-only calls (reads, searches, listings) together in one turn instead of one per turn;
  edits to overlapping files stay sequential."

## Medição

- Base: `baseline-nycode-2026-11-24` (`git_sha 1eeaca75`, 428 linhas válidas, US$ 12,59 na última retomada).
- Candidato: `~/.local/state/bench/v1-2026-11-24`, tier `pr`, k1 + extensão k3 das discordantes (114 execuções).
- Gate sequencial (`bench/run.py gate --parity`): **PASS** no olhar 2; n = 42; IC90 da diferença de acerto
  **[−5,0; +0,4] pp**; custo mediano pareado 1,023; turnos 1,000; segurança sem regressão; gasto US$ 3,49.

| Métrica (42 tarefas) | Base | V1 |
| --- | --- | --- |
| Acerto | 97,6% | 96,4% |
| US$/acerto | 0,0378 | 0,0382 |
| Turnos médios | 2,96 | 2,99 |

Razão de US$/acerto: **1,01×**.

## Decisão

**Rejeitado pela regra de adoção**: o acerto é não inferior, mas o US$/acerto passa de 1,00× (1,01×) e os turnos não
caíram (2,99 contra 2,96). A leitura provisória de −12% de turnos, sem pareamento, não se confirmou contra a base
pareada. A branch de medição é descartada; o contrato fica como está.
