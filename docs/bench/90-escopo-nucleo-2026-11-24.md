# #90: escopo do núcleo (skills `optional` fora do contexto do modelo)

Data: 2026-11-24. Braço `nycode`, modelo `claude-sonnet-5-5`, overlay `nycode-2026-11-24-noperso`.

## Regra de adoção (pré-registrada, a mesma do #175)

Adotar só se o acerto for não inferior (limite inferior do IC90 pareado > −10 pp) e o US$/acerto ficar ≤ 1,00× da
base; senão, rejeitar. Pela D-63, o #90 só substitui a D-51 se passar.

## Mudança medida

`disable-model-invocation: true` em seis skills `optional` do núcleo (`agent-systems`, `atualizador`, `codegraph`,
`deep-search`, `perplexity-urls`, `soteiros`): saem do bloco de skills do prompt e só rodam por `/skill:<nome>`.

## Medição

- Base: `baseline-nycode-2026-11-24` (`git_sha 1eeaca75`, 428 linhas válidas).
- Candidato: `~/.local/state/bench/90-2026-11-24`, tier `pr`, k1 (58 execuções).
- Gate sequencial: **PASS** no olhar 1; n = 42; IC99 da diferença de acerto **[−5,8; +2,2] pp**; custo mediano pareado
  0,991; turnos 1,000; segurança sem regressão; gasto US$ 1,76.

| Métrica (42 tarefas) | Base | #90 |
| --- | --- | --- |
| Acerto | 97,6% | 97,6% |
| US$/acerto | 0,0378 | 0,0399 |
| Turnos médios | 2,96 | 2,87 |

Razão de US$/acerto: **1,05×**.

## Decisão

**Rejeitado pela regra de adoção**: acerto igual, mas US$/acerto 1,05× > 1,00×. O prompt menor não baixou o custo
por acerto nas tarefas do tier `pr` (a mediana pareada fica em 0,99; a média sobe com poucas execuções caras). A D-51
continua valendo; a branch de medição é descartada.
