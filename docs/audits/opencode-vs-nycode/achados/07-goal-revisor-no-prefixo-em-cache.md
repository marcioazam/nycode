# 07. /goal: revisor que lê o prefixo em cache da sessão

Classe: **B**. Prioridade: **P1**.

## O que o OpenCode faz

- `packages/core/src/plugin/goal.ts:104-138`: `judge` chama `ctx.session.generate({ sessionID, prompt })`, isto é, o
  modelo da sessão recebe a conversa como está (mesmo prefixo, cache read) mais o prompt do juiz no fim.
- `packages/core/src/plugin/goal/judge.txt` (298 tok medidos): veredito em uma linha JSON `done | continue (+
  next_step) | blocked | paused | wait`; "The assistant claiming the goal is met is not evidence"; objetivo em
  `<untrusted_objective>`.
- `:126-138`: overflow do juiz → compacta uma vez e julga de novo; segunda vez pausa.
- `:162-166`: `wait` só quando há shell em background que o objetivo precisa.

## Como o nycode faz

- `packages/coding-agent/src/extensions/goal/index.ts:11-18`: avaliador = modelo pequeno (Haiku ou
  `NYCODE_GOAL_MODEL`), thinking desligado, sem tools.
- `extensions/goal/evaluator-model.ts:6-8,43-44`: transcrição limitada a 50% da janela do avaliador, 4 chars/token.
- `extensions/_shared/goal/goal-evaluator.ts:238-250`: `renderTranscript` monta blocos do mais novo para o mais antigo
  e corta os antigos; `:78-82`: `<transcript>…</transcript>` + condição no fim.
- `rg -n cacheRetention extensions/goal` vazio.

## Diferença

O nycode re-renderiza a conversa como texto a cada checagem, e o corte pelo início muda o prefixo quando a sessão
cresce além do orçamento: input novo a cada checagem. O OC paga cache read do modelo grande.

## Benefício (estimativa, preços Anthropic públicos por MTok: Opus 5, Sonnet 3, Haiku 1; cache read 0,1x)

Sessão com 150k de contexto, uma checagem:

| Arranjo | Conta |
|---|---|
| OC, sessão em Sonnet | 150k x 0,1 x 3 = US$ 0,045 |
| OC, sessão em Opus | 150k x 0,1 x 5 = US$ 0,075 |
| nycode, Haiku, transcrição ~100k chars (~25k tok, renderizada e truncada) | 25k x 1 = US$ 0,025 sem cache |
| nycode, Haiku, sessão > 400k chars (orçamento cheio, ~100k tok) | 100k x 1 = US$ 0,10 |

Ou seja: em sessões curtas o nycode é mais barato; em sessões longas o OC é mais barato e o juiz vê tool results
reais em vez de blocos truncados a `BLOCK_MAX_CHARS` (6000 chars, `goal-evaluator.ts:170`). Não é uma vitória automática: decidir por eval.

## Custo

Tokens: depende do arranjo (tabela). Latência: modelo grande é mais lento que Haiku. Manutenção: média; a API de
extensão precisaria de uma chamada "gerar na sessão sem persistir".

## Riscos

- O juiz no mesmo modelo tende a concordar consigo mesmo (viés de autoavaliação); o OC mitiga com a regra "claiming is
  not evidence". O avaliador separado do nycode é a escolha do Claude Code (`docs: code.claude.com/docs/en/goal.md`),
  que o nycode segue de propósito.
- Mudança de verdict schema (`next_step`) afeta o texto de continuação.

## Licença

MIT; prompts do OC podem ser adaptados com aviso MIT se copiados.

## Proposta

1. Setting `goal.evaluator: "small-model" | "session-prefix"`.
2. Modo `session-prefix`: `extensions/goal/index.ts` usa uma chamada que reaproveita `convertToLlm` das mensagens do
   ramo + mensagem final de juiz, `cacheRetention` da sessão.
3. Opcional, independente: adicionar `next_step` ao verdict do avaliador atual (custo ~10-30 tok de saída por
   checagem) e reaproveitá-lo na continuação.

## Testes

Faux provider: o pedido do juiz compartilha prefixo com o último turno; verdict inválido → retry → pausa.

## Plano de eval

Baseline: `small-model`. Candidato: `session-prefix`. Tarefas `/goal` com condição verificável (bench), medir:
falso "met" (encerrou sem cumprir), rodadas até cumprir, custo do juiz por checagem, custo total.

## Aceite

Falso positivo não maior que o baseline; custo total do juiz menor em sessões > 100k tokens.

## Rollback

Setting volta para `small-model`.
