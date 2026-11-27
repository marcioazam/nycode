# 19 — `fallbackChains` declarativo (via `virtual-models`) e semáforo de concorrência por provedor

- **Classe**: **B** (altera seleção automática de modelo em falhas/rate limits em tempo de execução — exige eval garantindo isolamento total em `bench/` para nunca invalidar comparações de modelo único).
- **Prioridade**: **P2** (resiliência importante para uso interativo longo quando provedores caem, além de semáforo simples anti-429 em subagentes).

## O que o `omp` faz

1. **Cadeias declarativas `retry.fallbackChains`** (`omp:packages/coding-agent/src/session/retry-fallback-chains.ts:445-687`, `omp:packages/coding-agent/src/session/turn-recovery.ts:2099-2661`): resolve o fallback na ordem de especificidade (modelo exato/normalizado/base -> wildcard `provider/*` mais longo -> role -> `default`), valida `contextFitsModel`, thinking ceiling e assinatura Anthropic, faz fallback inclusive em erros duros elegíveis (`isHardErrorFallbackEligible`) e reverte ao primário quando expira o cooldown (`fallbackRevertPolicy: "cooldown-expiry"`):

```ts
	for (const key in context.chains) {
		if (!isRetryFallbackModelKey(key) || isRetryFallbackWildcardKey(key)) continue;
		const kind = selectorMatchKind(
			getRetryFallbackPrimarySelector(context, key),
			parsedCurrent,
			parsedPlainCurrent,
			currentModel,
		);
		if (kind === "exact") return key;
		if (kind === "normalized") normalizedModelKey ??= key;
		if (kind === "base") baseModelKey ??= key;
	}
```

2. **Semáforo por provedor** (`omp:packages/ai/src/stream.ts:225-270`, `omp:packages/coding-agent/src/task/provider-concurrency.ts:78-102`): `withProviderInFlightLimit` limita requisições simultâneas por provedor localmente (`acquireLocalSlot` FIFO) e via daemon (`DaemonProviderSlots`).

- **Ancestralidade Pi**: `pi0.9.4` só escolhia no boot; `pibase` criou `retryAssistantCall` e `virtual-models.ts` (`route(request)` com `reason: "retry"`). `omp` expandiu com settings declarativos, reversão por cooldown e slot broker.

## Como o `nycode` faz

- `packages/coding-agent/src/core/virtual-models.ts:50-102` (herdado do `pibase`) **já dá o gancho programático exato**: uma extensão pode registrar um modelo virtual (`registerVirtualModel`) cujo `route({ reason, failed })` troca dinamicamente de modelo quando `reason === "retry"` e `failed` traz `{ model, thinkingLevel, message }`!
- Porém, o `nycode` **não** entrega nenhuma extensão/setting declarativa `retry.fallbackChains` pronta, `_prepareRetry` (`core/agent-session.ts:3984-4024`) apenas retenta o **mesmo** modelo, e `core/model-runtime.ts:179` não possui semáforo `maxInFlightRequests` por provedor (quando vários subagentes ou chamadas paralelas disparam juntos, estouram limite de concorrência simultânea do provedor).
- Nota crítica em **`extensions/travar-modelos/index.ts:106-125`** e **`docs/bench/RUNBOOK.md:103-106`**: em benchmarks, `429` encerra imediatamente como erro de infra; se `fallback` trocasse de modelo silenciosamente durante um benchmark ou sob `/travar-modelos`, invalidaria o experimento.

## Diferença concreta

| Aspecto | `omp` (`v19.2.1`) | `nycode` (`00fed2ae`) |
|---|---|---|
| Cadeias declarativas de fallback | `retry.fallbackChains` + wildcard `provider/*` + reversão pós-cooldown (`retry-fallback-chains.ts`) | Sem setting declarativo (apenas API programática em `core/virtual-models.ts:50-102`) |
| Fallback em erros duros | `isHardErrorFallbackEligible` (`turn-recovery.ts:2628-2661`) | `_isRetryableError` retorna false e encerra (`agent-session.ts:3931-3935`) |
| Limite in-process de concorrência | `acquireLocalSlot` + `DaemonProviderSlots` (`omp:packages/ai/src/stream.ts:225-270`) | Sem equivalente (`core/model-runtime.ts:179`) |

## Benefício

- **Problema**: (1) usuários em sessões interativas que configuram chave da Anthropic + Bedrock/OpenRouter hoje caem quando um provedor dá 529/overloaded em vez de failover automático temporário; (2) quando 4 subagentes rodam em paralelo contra provedores com teto estrito de requisições em voo (ex.: Ollama Cloud / Bedrock tiers baixos), todos batem 429 ao mesmo tempo.
- **Solução em TS puro (rejeitando `DaemonProviderSlots` e os 3.789 LOC de `TurnRecovery`)**:
  1. Construir uma extensão opt-in leve (`extensions/fallback-chains/`) usando a interface **`VirtualModelDefinition` já existente** (`virtual-models.ts:50-102`) + respeitando `NYCODE_MODEL_LOCK` (`/travar-modelos`) e desligada por padrão em modo headless/`bench`! Validar janela de contexto (`contextFits`) e thinking level compatível antes de devolver o candidato, revertendo ao primário após `cooldownMs`.
  2. Adicionar semáforo FIFO leve **em-processo** (`providers.maxInFlightRequests`) no `ModelRuntime` (`core/model-runtime.ts:179`) sem daemon residente (observando que subagentes em processos separados não compartilhariam esse semáforo sem IPC/lock — documentar claramente que é por processo/árvore local ou arquivo de lock leve opcional).

## Custo

- **Tokens / turno**: **0** fixo no prompt; se houver failover para modelo de outro provedor, o primeiro turno no fallback paga **cache miss** no novo provedor.
- **Latência**: semáforo enfileira apenas quando excede `maxInFlightRequests`.
- **Manutenção**: ~200 LOC TS puro reutilizando `virtual-models.ts`, zero dependências.

## Riscos

- **Contaminação de benchmark / violação de `/travar-modelos`**: qualquer cadeia de fallback **tem** de ser desativada em runs headless de benchmark (`--no-fallback` / exigir opt-in explícito e checar `NYCODE_MODEL_LOCK`).
- **Blocos `thinking` assinados (Anthropic -> outro modelo)**: trocar diretamente para outro modelo quando o histórico recente contém blocos `thinking` com assinatura criptográfica da Anthropic requer conversão/remoção das assinaturas compatível com `packages/ai/src/api/` — testar explicitamente!
- **Deadlock de semáforo em chamadas aninhadas**: `subagent` roda em subprocesso separado (então o pai esperando filho não segura o slot HTTP do semáforo em-processo), mas chamadas síncronas dentro de hooks `before_agent_start` / `answerFromPage` (`web_fetch`) / `goal` avaliador precisam estar atentas se o limite for `1`! Usar limite mínimo razoável ou escopo adequado.

## Licença

**MIT** (`omp:LICENSE:1-23`).

## Proposta

- **`packages/coding-agent/src/extensions/fallback-chains/index.ts`** (nova extensão usando `registerVirtualModel`, respeitando `/travar-modelos` e desligada por default salvo se `fallbackChains` configurado no `settings.json`).
- **`packages/coding-agent/src/core/model-runtime.ts`** + **`core/settings-schema.ts`**: semáforo FIFO leve por provedor quando `maxInFlightRequests[provider] > 0`.

## Testes

- `packages/coding-agent/test/virtual-models.test.ts` & `test/suite/`: usando `faux` provider offline, testar failover `modeloA -> modeloB` em 529/overloaded respeitando janela de contexto, reversão após expiração de cooldown, bloqueio sob `NYCODE_MODEL_LOCK`, e semáforo limitando concorrência simultânea sem deadlock.

## Plano de eval

- **Base e candidato**: validar via testes integrados determinísticos com `faux` provider (injetando falhas 429/529 e blocos `thinking`) + rodada de sanidade `bench/run.py --dry-run` e `suite.s1` (`pr_cases`) verificando que com a feature desativada por default (ou em regime nominal sem falha) custo e acerto ficam `1.00×` idênticos. Não reexecutar `cc-vanilla`/`pi-vanilla`.

## Critérios de aceite

1. Failover nunca ocorre quando `/travar-modelos` (`NYCODE_MODEL_LOCK`) bloqueia o destino ou em modo benchmark headless.
2. Conversas com `thinking` não quebram HTTP 400 após trocar de provedor/modelo.
3. Semáforo `maxInFlightRequests` limita requisições simultâneas por provedor no processo sem deadlock.

## Rollback

Desabilitar a extensão `fallback-chains` e remover `maxInFlightRequests` em `model-runtime.ts`.
