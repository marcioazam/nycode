# 09. Continuação automática após parada por limite de saída

Classe: **B**. Prioridade: **P2**.

## O que o OpenCode faz

`packages/core/src/session/runner/llm.ts`:

- `packages/core/src/session/runner/llm.ts:42-43`: `CONTINUE_AFTER_OUTPUT_LIMIT = "Your last response hit the output token limit (stop reason: length). Do not
  apologize, recap, or repeat yourself. Break the remaining work into smaller pieces."` (32 tok medidos).
- `packages/core/src/session/runner/llm.ts:353-382`: no resultado `OutputLimit`, lê as 3 últimas mensagens; se as três são assistant com `finish = "length"`,
  falha com "Response still truncated after two output token limit continuations"; senão publica a mensagem sintética e
  segue.

## Como o nycode faz

`packages/agent/src/agent-loop.ts:270-279`: com `stopReason === "length"` as tool calls da mensagem falham
(`failToolCallsFromTruncatedMessage`) e o loop continua só porque há resultados de tool. Uma resposta só de texto
cortada encerra o turno. `packages/coding-agent/src/core/agent-session.ts:1285` só reseta a recuperação de overflow.

## Diferença

No nycode, texto truncado espera o usuário; com tool calls truncadas o modelo recebe erro de tool, não a instrução de
dividir o trabalho.

## Benefício

Evita turno humano para "continue"; instrução específica reduz repetição (o modelo tende a recomeçar a resposta).

## Custo

+32 tok por continuação + o turno extra (que aconteceria de qualquer forma pelo usuário). Teto de 2 continuações.
Manutenção baixa (~30-50 linhas).

## Riscos

Loop de saída longa: o teto de 2 do OC resolve. Em modo `-p`, continuação automática muda a saída final; aplicar igual.

## Licença

MIT; texto da mensagem curto, reescrever.

## Proposta

`agent-loop.ts`: após `length` sem tool calls, se as duas últimas assistant não foram `length`, empurrar mensagem
sintética (tipo `custom`, não `user`) e continuar; com tool calls, anexar a mesma instrução ao resultado de erro.

## Testes

`packages/agent/test`: faux com `stopReason: "length"` → uma continuação; três seguidos → erro; tool calls truncadas
recebem a instrução.

## Plano de eval

Tarefas de geração longa (arquivos grandes, relatórios) com `maxTokens` baixo forçado. Baseline vs candidato: tarefas
concluídas sem intervenção, tokens de saída repetidos (diff entre respostas consecutivas).

## Aceite

Concluídas sem intervenção sobem; repetição não cresce.

## Rollback

Flag `agent.continueOnLength` desligada.
