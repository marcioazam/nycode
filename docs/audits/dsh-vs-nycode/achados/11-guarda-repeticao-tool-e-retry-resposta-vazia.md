# Achado 11: Guarda progressiva de repetição de tool calls (`[3, 5, 8]`) e retry para `EMPTY_RESPONSE` / turn vazio

## O que o `dsh` faz

O `dsh` combina dois mecanismos leves de resiliência contra loops improdutivos e respostas vazias de modelo:

1. **Guarda de chamada repetida idêntica (`repeat-tool-reminder`)**: `packages/guard/repeat-tool-reminder/src/index.ts:169-232` acompanha em `WeakMap<Agent, Chain>` chamadas diretas consecutivas com mesmo par `[toolName, canonicalize(arguments)]` (JSON ordenado recursivamente). Ao atingir os limiares padrão `[3, 5, 8]` (mesmo em chamadas bloqueadas/negadas), anexa uma `UserMessage` progressiva (`GENTLE_REMINDER` no `3` e `detailedReminder` com preview de argumentos no `5` e `8`), resetando a contagem somente quando há nova mensagem real do usuário:

   ```ts
   // packages/guard/repeat-tool-reminder/src/index.ts:199-211
   const canonical = canonicalize(exec.arguments)
   const key = JSON.stringify([exec.name, canonical])
   const chain = chains.get(exec.agent)
   const count = chain !== undefined && chain.key === key ? chain.count + 1 : 1
   chains.set(exec.agent, { key, count })
   if (!thresholdSet.has(count)) return undefined
   const text = count === thresholds[0]
     ? GENTLE_REMINDER
     : detailedReminder(exec.name, count, previewArguments(canonical, argumentsPreviewChars))
   return createUserMessage({
     content: [{ type: 'text', text }],
     source: { ...REMINDER_SOURCE, form: 'notice', summary: `${exec.name} × ${count}` },
   })
   ```

2. **Tratamento de resposta vazia (`EMPTY_RESPONSE`) e turn vazio no step 0**:
   - Quando o adaptador LLM termina com `reason.kind === 'stop'` e `0` blocos (`llm-deepseek/src/translate.ts:164` e `llm-pi-ai/src/stream.ts:107-115`), dispara erro tipado retryable `EMPTY_RESPONSE` (tratado em `llm/src/retry-policy.ts:15-25`, com até `5` retries em-step e jitter `0.1`).
   - Se `step === 0 && decision.messages.length === 0` (`core/agent-loop/src/agent.ts:352-355`), `turn()` retorna `false` sem gastar chamada ao modelo.

## Como o `nycode` faz hoje

1. **`nycode` tem apenas detector de laço em `diagnostico` / sem lembrete progressivo canônico**: `packages/coding-agent/src/extensions/diagnostico/index.ts` possui `criarGuardaLaco` (`observabilidade/trilha.ts`) voltado a spans de observabilidade/telemetria e interrupção extrema; não existe um observador pós-execução simples que injeta um lembrete leve na 3ª tentativa consecutiva idêntica (especialmente quando uma tool falha ou é bloqueada por `core/permissions` e o modelo insiste nos mesmos argumentos).
2. **Sem `EMPTY_RESPONSE` retryable**: em `packages/agent/src/agent-loop.ts:251-287`, se um modelo responder com `stopReason: "stop"` e `content: []` (0 blocos de texto e 0 tool calls — bug intermitente comum em gateways OpenAI/DeepSeek ou sobrecarga silenciosa), o loop considera o turno concluído (`hasMoreToolCalls = false`) e devolve uma resposta vazia ao usuário/harness sem tentar retry. Em `openai-completions.ts:1389-1395`, mensagens assistentes vazias anteriores apenas são omitidas na serialização seguinte.

## Diferença concreta

- `dsh`: quebra loops degenerados de chamada idêntica com intervenção mínima escalonada em `[3, 5, 8]` e trata `stop` com `0` blocos como `EMPTY_RESPONSE` retryable no próprio step.
- `nycode`: encerra o agente silenciosamente se o provedor devolver `0` blocos com `stopReason === "stop"` e só reage a repetições quando um guardião pesado ou limite de tentativas global atua.

## Classificação

**Classe B** — Muda o fluxo do loop em caso de `EMPTY_RESPONSE` (realiza nova chamada ao provedor em vez de encerrar) e injeta mensagens curtas (`UserMessage`/contexto) ao modelo a partir da 3ª repetição consecutiva idêntica. Afeta assertividade e gasto potencial de tokens em cenários de falha; requer eval.

## Benefício esperado

- Recuperação automática de falhas silenciosas de API (`stop` vazio) em pipelines headless/benchmarks sem precisar re-enviar manualmente ou usar `auto-resume` inteiro.
- Saída mais rápida de becos sem saída quando o modelo repete exatamente a mesma chamada `edit` que falhou por `oldText not found` ou o mesmo `read` em loop.

## Custo

- **Tokens/turno**: `0` tokens fixos no Turno 1 e `0` tokens em sessões normais (`o200k_base`); quando o limiar `[3, 5, 8]` dispara, acrescenta ~`25–45` tokens no resultado daquela tool; `EMPTY_RESPONSE` só consome 1 retry quando o provedor devolveu `0` tokens de output.
- **Latência**: `0` ms no caminho nominal (apenas comparação de string JSON canônica da última chamada por agente em `WeakMap`).
- **Manutenção**: baixa — código autocontido (~100 linhas para o detector em extensão ou hook `tool_result` + 10 linhas para `isEmptyAssistantStop` na lógica de retry).

## Riscos e modos de falha

- Falso positivo ao chamar mesma tool em polling legítimo? **Não** se `thresholds` começa em `3` e reseta imediatamente se **qualquer** outro argumento, tool ou mensagem do usuário ocorrer no meio (e só conta chamadas consecutivas idênticas — opcionalmente excluir tools de espera como `run` ou só contar `isError` / argumentos literalmente idênticos). Além disso, `repeat-tool-reminder` é **não-bloqueante** (só orienta na primeira ocorrência).
- Retry infinito em modelo quebrado que sempre retorna vazio: limitar `EMPTY_RESPONSE` ao teto existente de retries do provedor (`maxRetries`, ex.: `1–2` retries específicos para resposta vazia antes de propagar erro).

## Licença

Código-fonte de referência `dsh` sob licença **MIT** (`LICENSE:1-21`).

## Proposta para o `nycode`

1. **Retry específico de `EMPTY_RESPONSE` (`packages/coding-agent/src/core/agent-session.ts:2107-2130` e `packages/ai/src/utils/retry.ts`)**:
   - Tratar `message.stopReason === "stop" && message.content.every(b => (b.type === "text" && b.text.trim() === "") || (b.type === "thinking" && b.thinking.trim() === ""))` (ou `content.length === 0`) como candidato a `_prepareRetry` (respeitando teto pequeno de tentativas, ex.: max `2`, e omitindo a mensagem vazia via `_omitRecoveryAttempt`).
2. **Lembrete de repetição idêntica (`packages/coding-agent/src/extensions/diagnostico/` ou nova extensão leve opt-in `repeat-tool-reminder`)**:
   - Rastrear último par `(toolName, canonicalArgsJson)` no evento `tool_result` (resetado no `before_agent_start` ou troca de argumentos); nas contagens `3`, `5` e `8`, anexar lembrete curto no próximo `content` do `tool_result` (ou via `context`) alertando o modelo para mudar de estratégia ou encerrar.

## Testes necessários

- `packages/coding-agent/test/suite/`:
  - provedor `faux` retornando resposta vazia na 1ª tentativa e texto válido na 2ª conclui com sucesso após retry automático;
  - se continuar vazio além do teto (`2`), falha/encerra limpo sem loop infinito;
  - 3 chamadas consecutivas idênticas da mesma tool (`args` com chaves em ordem diferente, mas canonicamente iguais) disparam o lembrete exatamente na 3ª, 5ª e 8ª chamadas; uma chamada diferente reseta a contagem.

## Plano de eval

- **Baseline**: `nycode` atual.
- **Candidato**: `EMPTY_RESPONSE` retry + `repeat-tool-reminder` (`[3, 5, 8]`).
- **Onde rodar**: suite de confiabilidade / tool loops em `packages/evals` e `bench/` (Terminal-Bench 2.0) — nunca re-executar `cc-vanilla` nem `pi-vanilla`.
- **Critérios**: IC pareado BCa 90% >= `-0.10` e mediana de turnos/custo <= `1.10` (deve evitar turnos desperdiçados em loops repetitivos e zerar falhas por `0` blocos de resposta).

## Critérios de aceite e rollback

- **Aceite**: `npm run check`, `./test.sh` e evals verdes; zero overhead de tokens em execuções sem repetição `>= 3`.
- **Rollback**: remover a condição de retry vazio em `agent-session.ts` e desligar o listener de repetição.

## Prioridade

**Alta (P1 entre itens Classe B)** — custo zero no caminho feliz e ganho imediato de robustez contra loops e respostas vazias.
