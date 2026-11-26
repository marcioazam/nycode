# Backlog de benchmark herdado do harness Nycode (2026-11-24)

Origem: a sessão 01a1d684 (13 a 20/11) do harness Nycode fechou 105 dos 118 itens. Os que sobraram vêm para cá,
junto com o benchmark (`bench/`, [RUNBOOK](RUNBOOK.md)). A liberação das rodadas com modelo é a
[D-63](../migration/nycode-core/11-decisoes-e-pendencias.md). Plano aprovado:
`~/.nycode/agent/plans/2026-11-24-01a20d72.md`.

Já fechados, que não serão reabertos: #189 (PR #66 do harness, mergeado em 20/11), #175 e #188 (crítico v1 e v2
rejeitados, com registro do mantenedor) e o fork `marcioazam/pi` (criado em 20/11
e não usado, porque o caminho escolhido foi o core).

## Regras pré-registradas

- Adoção: o acerto não pode ser inferior à referência (limite inferior do IC90 pareado acima de -10 pp) e o
  US$/acerto tem de ser ≤ 1,00× o da referência. Se não, a mudança é rejeitada e registrada aqui com o motivo.
  Os números vêm do placar e do `bench gate`, nunca de impressão.
- Conta Claude (OAuth do plano), fila única com a trava `$BENCH_STATE/lock`, teto de US$ 30 por noite e
  "aprovo" para qualquer rodada acima de US$ 15.
- Uma PR por item. A verificação roda uma vez antes do commit: `npm run check`, `./test.sh` e o `bench-pr` do head.

## Estado no início (Passo 0, 2026-11-24 10:40)

- Nenhum PR aberto em `marcioazam/nycode`; os 6 últimos runs de CI da `main` estão concluídos e verdes.
- Nenhum contêiner de benchmark, nenhum processo `harbor`/`bench`, nenhum timer `bench-*` instalado.
- A árvore da `main` em `~/source/nycode` tem cerca de 90 arquivos alterados por outra sessão (o último editado hoje
  às 06:39). Ela não é tocada: este trabalho roda em worktrees a partir de `origin/main` (`1eeaca75c`).

## Itens

| # | Item | Decisão | Δacerto (pp, IC90) | US$/acerto | PR | Registro |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | P-16: referência `nycode`, piloto S2, `baseline-main`, `bench-pr` no ruleset | pi 1.6.0 rejeitado (1,31×); `baseline-main` trocado para o braço `nycode`; poster instalado (clone bare do nycode, overlay `nycode-2026-11-24-noperso`); prova em PR de docs (#422: não funcional, sem rodada); 1ª rodada real na #419: PASS (n = 42, IC90 [−8,5; +2,0] pp, custo 1,03×, US$ 3,60); `bench-pr` obrigatório no ruleset `main` | n/a | 0,0303 (base `nycode`) | #418, #419, esta PR | [p16](p16-pi160-2026-11-24.md) |
| 2 | #90: escopo do núcleo | rejeitado (US$/acerto 1,05×; D-51 fica) | 0,0 (IC99 [−5,8; +2,2]) | 0,0399 (base 0,0378) | n/a | [90](90-escopo-nucleo-2026-11-24.md) |
| 3 | V1 (#75): leituras agrupadas num turno | rejeitado (US$/acerto 1,01×; turnos não caíram) | −1,2 (IC90 [−5,0; +0,4]) | 0,0382 (base 0,0378) | n/a | [V1](v1-75-leituras-agrupadas-2026-11-24.md) |
| 4 | #35: tarefas de comportamento | adotado como piso de regressão (tier `behavior`); caso "contrato curto" aprovado (D-66), em construção | n/a (satura: 15/15) | 0,045 | #414 | [35](35-behavior-2026-11-24.md) |
| 5 | #151: velocidade | registrado sem mudança: Nycode 0,39–0,50× do tempo do Claude Code; K1 34/36 (US$/acerto 0,155 contra 0,219 do CC); guard nativo < 0,1 ms | n/a | 0,155 (K1) | #418, #422 | [151](151-velocidade-2026-11-24.md) |
| 6 | #183: subagente barato de execução | rejeitado: sem efeito (0 delegações em 36); variante forçada é decisão do dono | 0,0 (IC90 [0; 0]) | 0,153 (base 0,155; 0,99×) | #423 | [183](183-executor-barato-2026-11-24.md) |
| 7 | #168: bootstrap e lições de falha | passa a regra por margem nula (0,998×), sem efeito mensurável; adoção no contrato é decisão do dono | 0,0 (12/12; IC90 [0; 0]) | 0,176 (base 0,176) | #422 | [168](168-bootstrap-licoes-2026-11-24.md) |
| 8 | #169: poder contra o Claude Code | bloqueado por futilidade: suítes saturadas (≥ 94% nos dois braços); nenhum desenho dentro de US$ 80 chega a poder 0,80; US$ 0 gasto | n/a (Δ base observado ≈ +1, não pareado) | 0,030 contra 0,076 do CC (base, não pareado) | esta PR | [169](169-poder-cc-2026-11-24.md) |
| 9 | B1: pesquisa e blueprint | pesquisa refeita e plano em 6 etapas aprovado (D-66: release-please, SSH, `AGENTS.md` sem `CLAUDE.md`) | n/a | n/a | (esta PR) | [B1](b1-blueprint-2026-11-24.md) |
| 10 | #167: checkout `~/code/pi-harness` | obsoleto como fonte, mantido como instalação do `pi`; arquivado em `~/archive/` sem apagar | n/a | n/a | (esta PR) | [167](167-pi-harness-checkout-2026-11-24.md) |

## Progresso

- [x] 1. Passo 0: conferir o estado
- [x] 2. Registrar a D-63 (benchmark liberado)
- [x] 3. Item 1: P-16
- [x] 4. Item 2: #90, escopo do núcleo
- [x] 5. Item 3: V1 (#75), leituras agrupadas
- [x] 6. Item 4: #35, tarefas de comportamento
- [x] 7. Item 5: #151, velocidade
- [x] 8. Item 6: #183, subagente barato
- [x] 9. Item 7: #168, bootstrap e lições
- [x] 10. Item 8: #169, poder contra o CC
- [x] 11. Item 9: B1, pesquisa e blueprint
- [x] 12. Item 10: #167, pi-harness
- [x] 13. Fechamento e placar

## Fechamento (2026-11-24)

Os 10 itens estão fechados: 1 adotado com o `bench-pr` obrigatório (P-16), 1 adotado como piso de regressão (#35),
3 rejeitados pela regra (#90, V1, #183), 2 registrados sem mudança (#151, #168), 1 bloqueado com evidência (#169) e
2 sem medição (B1, #167). Nenhuma mudança medida baixou o US$/acerto abaixo de 1,00× com acerto não inferior.

Decisões pendentes do dono:

| Item | Decisão | Opções |
| --- | --- | --- |
| #168 | Levar bootstrap e lições ao contrato embarcado | (a) PR no contrato e o `bench-pr` decide; (b) só registro |
| #183 | Variante com delegação forçada | (a) rodar (≈ US$ 5, sessão principal sem edit/write); (b) encerrar |
| #169 | Como destravar | (a) suíte não saturada; (b) não inferioridade + custo pareado (≈ US$ 4,3); (c) encerrar |
