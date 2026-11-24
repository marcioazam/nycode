# #183: subagente barato de execução (Sonnet planeja, Haiku executa)

Data: 2026-11-24. Hipótese (arXiv 2605.03195): a sessão principal planeja e revisa, e um executor mais barato faz as
edições e roda os testes; o US$/acerto cai sem perder acerto. Sem modelo local (dono: "Nao rode Ollama Local"): o
executor é `anthropic/claude-haiku-5-5` pela conta Claude.

## Regra de adoção (pré-registrada, a mesma do #175)

Acerto não inferior (limite inferior do IC90 pareado > −10 pp) e US$/acerto ≤ 1,00× da base; senão, rejeitar.

## Braços

- Base (K1 do #151): braço `nycode` (`65314851`), overlay `nycode-2026-11-24-noperso`, rodada
  `~/.local/state/bench/k1-hard-2026-11-24`.
- Candidato: o mesmo braço com `NYCODE_HEADLESS_TOOLS=all` (no `-p` a extensão `headless-lean` tira `subagent`,
  `todo`, `memory` e `lsp_*`), política de roteamento só com Sonnet e Haiku (`NYCODE_SUBAGENT_ROUTING_FILE`) e um
  `AGENTS.md` que manda entregar cada passo de implementação a um `swarm-worker` em Haiku com esforço médio, mantendo
  leitura, diagnóstico e verificação final na sessão principal. Overlay `nycode-2026-11-24-183` (`ceb68929db6e47d8`),
  rodada `~/.local/state/bench/183-hard-2026-11-24`.
- Suíte s8 (12 tarefas difíceis, `dev` e `heldout`), k = 3, `claude-sonnet-5-5`, jobs 3.

## Correção de medição

O `bench/runners.py` somava só o custo da sessão principal; o gasto dos filhos chega ao transcript apenas no
resultado da ferramenta `subagent` (`details.results[].usage.cost`). Sem essa soma, delegar pareceria grátis. A
correção e o teste (`test_parse_events_pi_adds_the_subagent_children_cost`, vermelho sem a correção) vão nesta PR.
Sonda manual: a delegação a Haiku funciona no `-p` com as ferramentas liberadas (rota "anthropic/claude-haiku-5-5 ·
low"); o campo `details.results[].model` mostra o modelo fixo do agente, não o roteado (defeito de rótulo, fora do
escopo).

## Resultado

| Braço | Acerto | US$ (36 execuções) | US$/acerto | Delegações |
| --- | --- | --- | --- | --- |
| Base (K1) | 34/36 (94,4%) | 5,27 | 0,155 | 0 |
| Candidato | 34/36 (94,4%) | 5,20 | 0,153 | **0** |

Δacerto pareado por tarefa: 0,0 pp (IC90 bootstrap [0,0; 0,0]); razão de US$/acerto 0,99×. As mesmas duas falhas
(`hard-plugin-registry`, `hard-six-modules`) nos dois braços.

## Decisão

**Rejeitado: sem efeito.** O roster de subagentes e a ferramenta estavam no prompt das 36 execuções, mas o modelo não
delegou nenhuma vez: fez tudo com `bash` na sessão principal. A diferença de custo (0,99×) é ruído entre duas rodadas
iguais na prática, não o efeito do executor barato; adotar uma instrução que não muda o comportamento não tem valor.
A hipótese não foi testada de fato: para testá-la é preciso forçar a delegação (por exemplo, sessão principal sem
`edit`/`write` e com `bash` só leitura), o que é outro experimento e fica como decisão do dono.
