# 10. Limite de passos: passo final de resumo sem tools, mantendo o cache

Classe: **B**. Prioridade: **P2**.

## O que o OpenCode faz

`packages/core/src/session/runner/llm.ts:265-285`:

```ts
const stepLimitReached = loaded.agent.info.steps !== undefined && step >= loaded.agent.info.steps
...
messages: stepLimitReached ? [...transcript.messages, Message.assistant(MAX_STEPS_PROMPT)] : transcript.messages,
// Keep tool definitions on the final Step to preserve the provider's cached prefix.
toolChoice: stepLimitReached ? "none" : undefined,
```

`session/runner/max-steps.ts:1-17`: instrução exigindo resumo do que foi feito, pendências e próximos passos, sem tools.
`session/runner/step.ts:120`: qualquer tool nesse passo falha com "Tools are disabled after the maximum agent steps".

## Como o nycode faz

`packages/coding-agent/src/extensions/subagent/core/run.ts:459-462`: o filho é encerrado no limite de `maxTurns`;
`registry/registry-text.ts:47-52` anexa "[Output is partial ... Resume it with {resume: ...}]" e um `partialSummary`
montado pelo harness (`render/render.ts:202`, "last actions"). A sessão principal não tem limite de passos.

## Diferença

O pai do nycode recebe a última mensagem do filho + as últimas ações, não um resumo escrito pelo filho. O OC gasta um
passo para o filho resumir, com cache intacto (tools mantidas, `toolChoice: none`).

## Benefício

Resumo útil ao pai sem `resume`; o pai decide melhor o próximo passo.

## Custo

+1 passo por limite atingido: ~160 tok de instrução (arquivo `max-steps.ts` inteiro mede 167 tok) + saída do resumo (~200-600 tok), com o
prefixo em cache. Manutenção baixa.

## Riscos

Modelo que ignora `toolChoice: "none"` em alguns provedores; o OC bloqueia na execução também (`step.ts:120`).

## Licença

MIT; reescrever a instrução.

## Proposta

`extensions/subagent/core/run.ts`: ao atingir `maxTurns`, em vez de encerrar, enviar um último turno com
`toolChoice: "none"` (se o provider suportar) e a instrução de resumo; manter a nota "partial" com o resumo.

## Testes

Faux: filho com `maxTurns: 2` faz um turno extra sem tools e o pai recebe o texto do resumo.

## Plano de eval

Tarefas delegadas com `maxTurns` baixo. Métrica: o pai conclui sem `resume`; custo total.

## Aceite

Menos `resume` por tarefa, custo total não maior.

## Rollback

Flag no frontmatter do agente (`summarizeOnMaxTurns: false`).
