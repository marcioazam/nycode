# 12 — Cache `prewarm` (`max_tokens: 0`), `/btw` em prefixo quente, `replay-policy` e checkpoints Anthropic

- **Classe**: **B** (`prewarm` faz chamada HTTP `max_tokens: 0` sujeita a compatibilidade de provedor; `/btw` e checkpoints alteram envio de histórico/TTL — exige eval/validação. *Nota: a subpeça isolada `replay-policy.ts` é de risco mínimo, mas em conjunto com checkpoints e `prewarm` o pacote vai para Classe B*).
- **Prioridade**: **P1** (reduz custo de aquecimento de cache, economiza cache completo em `/btw` e evita efeito dominó de recusas da API).

## O que o `omp` faz

1. **`replay-policy.ts` (`48` LOC)** (`omp:packages/agent/src/replay-policy.ts:11-38`): remove mensagens terminais de recusa (`stopType === "refusal" || "sensitive"`) do histórico reenviado ao modelo e substitui mensagens de erro de stream em tool results sintéticos por texto neutro (`PROVIDER_ERROR_NOT_EXECUTED_TEXT`) para que o próprio texto da recusa não dispare novas recusas em cadeia:

```ts
export function toProviderReplayMessage(message: Message): Message | undefined {
	if (message.role === "assistant") return isProviderRefusalMessage(message) ? undefined : message;
	if (message.role !== "toolResult" || !isProviderErrorPlaceholder(message)) return message;
	return { ...message, content: [{ type: "text", text: PROVIDER_ERROR_NOT_EXECUTED_TEXT }] };
}
```

2. **`prewarm` no `CacheWarmer`** (`omp:packages/coding-agent/src/session/cache-warmer.ts:514-1226`): envia pings de aquecimento com `max_tokens: 0` (sem pagar tokens de saída), com fallback automático para `replay` (`maxTokens: 1`) caso o endpoint devolva HTTP 400.
3. **`/btw` no cache quente** (`omp:packages/coding-agent/src/session/btw-turn.ts:60-95`): executa perguntas paralelas `/btw` reutilizando o **system prompt, ferramentas e prefixo já em cache da sessão principal** via `runEphemeralTurn` + `conversationKey`.
4. **Checkpoints decimados no Anthropic** (`omp:packages/ai/src/providers/anthropic.ts:4514-4643`): além de tools, system e tail (teto de 4 breakpoints), coloca breakpoints intermediários a cada 15 turnos (`ANTHROPIC_DECIMATION_INTERVAL`), protegendo contra invalidação total quando uma mensagem recente é reescrita/removida.

- **Ancestralidade Pi**: `pi0.9.4` não tinha warmer; `pibase` introduziu `CacheWarmer` usando apenas `replay` (`maxTokens: 1`) e apenas 3 breakpoints no Anthropic. Todas as quatro melhorias acima são do `omp`.

## Como o `nycode` faz

- `packages/coding-agent/src/core/cache-warmer.ts:259-262` usa apenas `replay` com `maxTokens: 1` (paga ao menos 1 token de saída + lógica de `evaluateCacheWarming`).
- `packages/coding-agent/src/extensions/ui/btw.ts:14-136` serializa um resumo textual `<conversa>` (`MAX_CONTEXT_CHARS = 200_000`) como prompt novo com **`cacheRetention: "none"`** (`ui/btw.ts:57-93`), perdendo todo o prefix cache já pago na sessão ativa.
- `packages/ai/src/api/anthropic-messages.ts:1797-1822` usa no máximo 3 breakpoints (último tool, system e última mensagem `user`/`system`). `extensions/prefix-cache-1h/index.ts:26-40` coloca `1h` apenas em `tools+system` e `5m` no tail (exigindo que todo breakpoint após o system tenha `ttl <= 5m`, caso contrário a API retorna HTTP 400).
- `packages/coding-agent/src/core/agent-session.ts:1356-1384` usa `appendContextEdit(targetId, null)` em retries de recuperação, mas não sanitiza recusas/erros que permaneçam no histórico.

## Diferença concreta

| Aspecto | `omp` (`v19.2.1`) | `nycode` (`00fed2ae`) |
|---|---|---|
| Ping do `CacheWarmer` | `prewarm` (`max_tokens: 0`) com fallback para `replay` (`cache-warmer.ts:514-1226`) | Apenas `replay` (`maxTokens: 1`) (`core/cache-warmer.ts:259-262`) |
| `/btw` (pergunta lateral) | Reutiliza prefixo em cache vivo via `runEphemeralTurn` (`btw-turn.ts:60-95`) | Serializa `<conversa>` frio até 200k chars com `cacheRetention: "none"` (`ui/btw.ts:57-93`) |
| Replay de recusa/erro API | `toProviderReplayMessage` remove `refusal`/`sensitive` (`replay-policy.ts:34-38`) | Não higieniza placeholders de erro/recusa fora de `_omitRecoveryAttempt` |
| Checkpoints de mensagens Anthropic | Até 4 breakpoints com checkpoint a cada 15 turnos (`anthropic.ts:4514-4643`) | 3 breakpoints (tool, system, última mensagem `user`/`system`, `anthropic-messages.ts:1797-1822`) |

## Benefício

- **Problema**: (1) `/btw` hoje paga entrada fria inteira (100% do preço de input) em vez de pagar `cacheRead` (10% do preço) sobre a conversa que acabou de rodar há segundos; (2) se a Anthropic/provedor emitir recusa em um turno recuperável, mantê-la no histórico alimenta recusas em série; (3) conversas > 30 turnos com `read-supersede` ([achados/08](08-read-supersede-poda-leituras-repetidas.md)) precisam de 1 checkpoint intermediário para não reescrever os primeiros 15 turnos.
- **Solução**:
  1. Portar `replay-policy.ts` (~48 LOC TS puro) no `packages/agent/src/` ou `agent-session.ts`.
  2. Ajustar `extensions/ui/btw.ts` para usar a lista real de mensagens da branch atual + system prompt + tools do turno ativo (reaproveitando o cache quente quando dentro do TTL de 5 min), mantendo fallback de texto só se ultrapassar limites ou estiver fora de sessão.
  3. Testar `prewarm` (`max_tokens: 0`) no `CacheWarmer` para endpoints compatíveis e adicionar 1 checkpoint intermediário opcional (4º slot com `ttl: "5m"`, sempre após os blocos `1h` de `prefix-cache-1h`).

## Custo

- **Tokens / turno**: **0** fixo no prompt. Economia expressiva de custo em uso interativo de `/btw` (0,1× vs 1,0× no histórico).
- **Latência**: neutra ou mais rápida no `/btw` (cache hit no servidor reduz TTFT).
- **Manutenção**: ~180 LOC TS puro distribuídos em módulos pequenos; zero deps nativas.

## Riscos

- **`prewarm` (`max_tokens: 0`)**: diversos proxies/provedores OpenAI-compat e versões Bedrock rejeitam `max_tokens: 0` com HTTP 400. Precisa memoizar falha por `(provider, api)` na sessão e cair para `maxTokens: 1` no primeiro 400 (como o `omp` faz).
- **Ordenação de TTL Anthropic (CRÍTICO)**: `prefix-cache-1h` usa `1h` em `tools` + `system` e `5m` nas mensagens (`extensions/prefix-cache-1h/index.ts:6-7`). Qualquer checkpoint intermediário adicionado em mensagens **tem** de usar `5m` (`defaultCacheControl` curto), nunca `1h`, ou a Anthropic retorna HTTP 400 por violar monotonia decrescente de TTL (`1h -> 5m`).
- **Mudar `tools[]` no `/btw`**: se `/btw` remover todas as `tools[]` quando a sessão principal enviou `tools[]`, **quebra o prefix cache** (tools vêm antes de system/messages no prefixo Anthropic!). O `/btw` deve enviar as mesmas definições de `tools[]` com `tool_choice: { type: "none" }` (quando suportado) ou instrução no turno de usuário sem mexer no `tools[]` nem no `system` prefixo!
- Docs: registrar nota em `docs/MEMORY.md` (checkout principal) sobre invariante de TTL `1h -> 5m` e `tools[]` no `/btw`.

## Licença

**MIT** (`omp:LICENSE:1-23`).

## Proposta

- **`packages/agent/src/replay-policy.ts`** (novo, <= 60 LOC) + hook na projeção antes de `streamFn` em **`packages/coding-agent/src/core/agent-session.ts`**.
- **`packages/coding-agent/src/extensions/ui/btw.ts`**: modo cache-reusing enviando `systemPrompt + tools + branchMessages + <btw_question>` herdando `cacheRetention` da sessão quando dentro da janela ativa.
- **`packages/coding-agent/src/core/cache-warmer.ts`**: suporte a `maxTokens: 0` (`prewarm`) com fallback automático para `1` em HTTP 400.
- **`packages/ai/src/api/anthropic-messages.ts:1797-1822`**: colocar até 1 checkpoint adicional decimado (`5m`) a cada ~15 turnos de usuário em conversas longas quando `cacheControl` estiver ativo e não exceder 4 breakpoints.

## Testes

- `packages/ai/test/anthropic-cache-write-1h-cost.test.ts`: validar limite `<= 4` breakpoints e ordem estrita `1h -> 5m`.
- `packages/coding-agent/test/cache-warmer.test.ts`: testar fallback de `max_tokens: 0` -> `1` após erro HTTP 400 em provedor mock.
- `packages/agent/test/`: testar `toProviderReplayMessage` removendo `stopDetails.type === "refusal"` e preservando demais mensagens.
- Teste em `test/harness/ui/` verificando que `/btw` mantém `tools` + `system` idênticos à sessão principal.

## Plano de eval

- **Base e candidato**: (1) medir offline/simulado taxa de `cacheRead` vs `cacheWrite` no `/btw` e em sessões de 30 turnos com poda (`faux` + traces reais de sessão no `packages/coding-agent/test/`); (2) validar em `bench/run.py` nas suítes `s1` (`pr_cases`) e `s2` (`tasks/tb2.json`) garantindo zero regressão de acerto (`MARGIN = -0.10`) nem aumento de custo (`PARITY_COST_MAX = 1.10`) pelo `replay-policy` e checkpoints. Não reexecutar `cc-vanilla` nem `pi-vanilla`.

## Critérios de aceite

1. Nunca envia mais que 4 blocos `cache_control` ou TTL `1h` depois de `5m` para Anthropic.
2. `/btw` gera payload com mesmo prefixo `tools` + `system` + mensagens da sessão ativa (permitindo `cacheRead`).
3. `CacheWarmer` economiza 1 token de output onde `max_tokens: 0` é aceito e degrada graciosamente no primeiro 400.

## Rollback

Desligar cada item de forma independente: remover `replay-policy` da projeção, manter `cacheRetention: "none"` no `/btw`, fixar `maxTokens: 1` no `cache-warmer.ts` e manter 3 breakpoints no `anthropic-messages.ts`.
