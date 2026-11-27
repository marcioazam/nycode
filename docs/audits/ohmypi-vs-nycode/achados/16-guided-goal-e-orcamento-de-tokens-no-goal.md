# 16 — `/guided-goal` (entrevista prévia) e orçamento de tokens em `/goal`

- **Classe**: **B** (adiciona comando `/guided-goal` + prompt de entrevista e campo opcional `tokenBudget` no estado do `/goal` — exige validação de custo/comportamento; *o `/goal` sem juiz externo do `omp` fica rejeitado em [rejeitados.md](../rejeitados.md#r04---goal-completo-do-omp-autoavaliação-sem-juiz-externo)*).
- **Prioridade**: **P2** (melhora definição de critérios binários antes de disparar loops autônomos caros e impede consumo ilimitado quando o usuário define um teto de tokens).

## O que o `omp` faz

1. **`/guided-goal`** (`omp:packages/coding-agent/src/slash-commands/builtin-modes.ts:366-376`, `omp:packages/coding-agent/src/prompts/goals/guided-goal-interview.md:1-37`): antes de iniciar o loop autônomo `/goal`, conduz uma entrevista estruturada (sem tools) até fechar 5 campos: critério binário de sucesso, método de verificação, limite de tentativas, escopo permitido e condições de parada.
2. **Orçamento `goalTokenDelta`** (`omp:packages/coding-agent/src/goals/runtime.ts:66-78,326-373`): contabiliza trabalho novo no `/goal` incluindo explicitamente `cacheWrite` e excluindo `cacheRead`, e pausa o loop com `steer` (`budget-limited`) ao atingir `tokenBudget`:

```ts
export function goalTokenDelta(current: GoalTokenUsage, baseline: GoalTokenUsage): number {
	// Diverges from codex-rs: codex omits cache creation because its target providers
	// do not bill cache writes distinctly through the token-usage stream. Pi receives
	// cacheWrite separately on Anthropic/Bedrock; rotating a 1h ephemeral cache or
	// re-anchoring a changed system prompt can write 100K+ tokens, which the goal
	// budget must account for. cacheRead is excluded because it is reused prefix,
	// not new work consumed by the goal.
	return (
		Math.max(0, current.input - baseline.input) +
		Math.max(0, current.cacheWrite - baseline.cacheWrite) +
		Math.max(0, current.output - baseline.output)
	);
}
```

- **Ancestralidade Pi**: ausente em `pi0.9.4` e `pibase`. Criação original do `omp` (`/goal` do `nycode` veio da paridade com Claude Code + Stop hook).

## Como o `nycode` faz

Em `packages/coding-agent/src/extensions/goal/index.ts:307-425,576-628`, `session.ts:22-33`, `evaluator-model.ts:14-44` e `_shared/goal/goal-evaluator.ts:43-83`:
- O `/goal` do `nycode` usa um **segundo modelo avaliador independente** com schema fechado (`VERDICT_TOOL`) em `agent_end` (com retry/deferral e check-in de subagentes), o que é **muito mais confiável** contra declarações prematuras de conclusão do que a autoavaliação `goal({op:"complete"})` do `omp`, e não invalida o prefix cache da sessão principal a cada turno.
- Porém:
  1. Não há comando `/guided-goal` para transformar pedidos vagos em critérios binários antes de entrar no loop (`extensions/goal/index.ts:576`).
  2. `ActiveGoal` (`extensions/goal/session.ts:22-33`) rastreia tokens apenas para exibição informativa, sem suporte a teto `tokenBudget` (ou `budget` via flag/arg) contabilizando `input + cacheWrite + output` para pausar antes de gastar indefinidamente.

## Diferença concreta

| Aspecto | `omp` (`v19.2.1`) | `nycode` (`00fed2ae`) |
|---|---|---|
| Verificação de conclusão | Autoavaliação pelo agente principal (`goal({op:"complete"})`) | Segundo modelo avaliador independente (`VERDICT_TOOL`) em `agent_end` |
| Entrevista prévia (`/guided-goal`) | Existe (`builtin-modes.ts:366-376`, `guided-goal-interview.md` **438 tok**) | Sem equivalente (`extensions/goal/index.ts:576`) |
| Orçamento de tokens | `token_budget` opcional contabilizando `input + cacheWrite + output` (`goalTokenDelta`) | Apenas contador informativo (`ActiveGoal` em `goal/session.ts:22-33`) |

## Benefício

- **Problema**: usuários frequentemente rodam `/goal refatora o auth` sem definir testes de aceite ou limite de gasto; o avaliador do `nycode` fica preso em iterações vagas ou gastando acima do esperado até atingir `noProgressStreak` (`CLAUDE_CODE_STOP_HOOK_BLOCK_CAP = 8`).
- **Rastro**: a entrevista do `/guided-goal` acontece apenas quando o usuário invoca `/guided-goal` (0 tokens quando inativo!) e, no fim, pode iniciar diretamente o `/goal` **já existente do `nycode`** (mantendo o avaliador independente `VERDICT_TOOL`!). E somar `tokenBudget` opcional ao `ActiveGoal` usando `goalTokenDelta` (contando `cacheWrite`, ignorando `cacheRead`) impede estouro silencioso.
- **Solução**: preservar 100% do motor de avaliação externa do `nycode` (`extensions/goal/`) e adicionar apenas: (1) comando `/guided-goal` (fluxo de perguntas via chat normal ou `question` antes de registrar o `ActiveGoal` no `goal/index.ts`), e (2) parâmetro opcional `--budget <tokens>` / `/goal budget <N>` no `ActiveGoal` contabilizando `input + cacheWrite + output` e encerrando/pausando com aviso quando excedido.

## Custo

- **Tokens / turno**: **0** quando `/goal` ou `/guided-goal` não é usado. Quando `/guided-goal` é chamado, custa o prompt de entrevista (~300–438 tokens + turnos curtos de Q&A com o usuário). Quando `tokenBudget` está ativo, economiza evitando corridas infinitas.
- **Latência**: **0 ms**.
- **Manutenção**: ~120 LOC TS puro dentro de `packages/coding-agent/src/extensions/goal/` (sem alterar o núcleo).

## Riscos

- **Auto-disparo no final da entrevista**: no `omp`, o modelo chama uma tool oculta `goal({op:"create"})`. No `nycode`, onde `/goal` não registra tool no catálogo normal, a entrevista pode fechar emitindo um bloco delimitado estruturado detectado por `extensions/goal` (ou registrando uma tool temporária ativa **apenas** enquanto a entrevista `/guided-goal` estiver aberta e removendo-a imediatamente após a criação — preservando 0 tokens fora de `/guided-goal`).
- **Contabilidade de `cacheWrite` no custo**: se um provedor não separa `cacheWrite` no stream `usage`, `current.cacheWrite` vem `0` sem quebrar a fórmula `Math.max(0, ...)`.
- **Modo headless**: `--guided-goal` exige conversa interativa (ou erro explícito em `-p` sem usuário para responder, pois `HEADLESS_PROMPT` não permite loops interativos).
- Docs: `docs/ADR.md` (checkout principal) deve registrar se houver mudança de UX oficial de `/goal`.

## Licença

**MIT** (`omp:LICENSE:1-23`).

## Proposta

- **`packages/coding-agent/src/extensions/goal/index.ts`**: registrar subcomando/comando `/guided-goal` (apenas em modo interativo; bloqueia em `-p` headless) e flag/subcomando `budget` em `/goal`.
- **`packages/coding-agent/src/extensions/goal/session.ts:22-33`**: adicionar `tokenBudget?: number`, baseline `{ input, cacheWrite, output }` e helper `goalTokenDelta` puro para interromper o loop em `agent_end` quando `used >= tokenBudget` (incluindo o restante nos `facts` enviados ao avaliador em `_shared/goal/goal-evaluator.ts:78-83`).

## Testes

- Estender `packages/coding-agent/test/harness/goal/goal.test.ts` e `goal-lifecycle.test.ts`:
  1. `/goal` com `tokenBudget` para imediatamente ao cruzar `input + cacheWrite + output >= budget` (e ignora `cacheRead`).
  2. `/guided-goal` em headless falha rápido sem travar; em sessão simulada interativa dispara entrevista e inicia `ActiveGoal` com critério binário mantendo o avaliador `VERDICT_TOOL` ativo.

## Plano de eval

- **Base e candidato**: `nycode` (`/goal` com prompt vago) vs `nycode` (`/guided-goal` + `tokenBudget`) usando `faux` provider nos testes de integração e rodada amostral offline/online controlada em `packages/coding-agent/test/harness/goal/` + `bench/` caso prompts padrão de `goal` mudem (`bench-pr` gate). Como `/guided-goal` é opt-in de slash command e não altera `prompt4` nem `benchmark` padrão headless, o impacto fora de `/guided-goal` é zero; verificar com `scripts/ci/instruction_budget.py` se algum texto for adicionado em `resources/`.

## Critérios de aceite

1. `/goal` continua usando o avaliador externo `VERDICT_TOOL` do `nycode` (nunca autoavaliação cega do `omp`).
2. `tokenBudget` interrompe o loop contando `input + cacheWrite + output` e ignorando `cacheRead`.
3. Zero tokens extras fora de sessões onde `/goal` ou `/guided-goal` é invocado.

## Rollback

Remover comando `/guided-goal` e campos `tokenBudget` em `extensions/goal/{index,session}.ts`.
