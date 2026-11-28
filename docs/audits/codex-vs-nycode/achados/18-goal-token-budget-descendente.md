# Achado 18 — Orçamento Descendente de Tokens (`token_budget`) no `/goal`

- **Classificação**: **Classe B** (adiciona contabilização explícita de orçamento no estado/aviso do `/goal`, interrompendo runs que excedam o limite declarado).
- **Prioridade no backlog**: #15 (Classe B — **P2**).

## 1. Como o Codex faz

O Codex modela metas de longa duração com orçamento explícito de tokens persistido e contabilizado de forma serializada por turno (`codex-rs/ext/goal/src/spec.rs:25-58` e `codex-rs/ext/goal/src/runtime.rs:547-608`):

```rust
// codex-rs/ext/goal/src/spec.rs:34-40
        (
            "token_budget".to_string(),
            JsonSchema::integer(Some(
                "Positive token budget for the new goal. Omit unless explicitly requested."
                    .to_string(),
            )),
        ),
```

```rust
// codex-rs/ext/goal/src/runtime.rs:565-577
        let outcome = self
            .inner
            .state_dbs
            .thread_goals()
            .account_thread_goal_usage(
                self.thread_id(),
                snapshot.time_delta_seconds,
                snapshot.token_delta,
                mode,
                Some(snapshot.expected_goal_id.as_str()),
            )
            .await
            .map_err(|err| err.to_string())?;
```

Quando `token_budget` (ou tempo máximo) atinge o limite, o Codex injeta `budget_limit.md` (`148` tokens medidos em `o200k_base`) e transiciona o status evitando gasto ilimitado em loops noturnos.

*(Importante: rejeitamos no [Rejeitado C-10](../rejeitados.md#c-10-auto-avaliador-do-goal-pelo-proprio-modelo-principal) a auto-avaliação do Codex feita pelo próprio agente via `update_goal`, pois o juiz externo `Haiku` do `nycode` é superior em rigor).*

## 2. Como o `nycode` faz

Em `packages/coding-agent/src/extensions/goal/session.ts:79-99` e `index.ts:307-368`, o `nycode` já contabiliza cumulativamente `sessionTokens(ctx)` (e `active.evaluatorTokens` das chamadas do juiz), usando um modelo avaliador separado (`Haiku`) com timeout de turno e esquema forçado (`VERDICT_TOOL`). Porém, ao acionar `/goal <condição>`, não existe parâmetro de teto estrito por meta (`--budget-tokens` / `--budget-usd` / `--max-minutes`) nem injeção de orçamento regressivo ("restam X tokens/minutos para concluir e verificar") no feedback ao agente quando o orçamento começa a apertar.

## 3. Diferença Concreta

Sem teto duro por meta configurável no `/goal` (e sem mostrar ao modelo quanto resta do orçamento), um `/goal` autônomo overnight preso em retry de build/teste pode consumir milhões de tokens em loop antes de intervenção humana.

## 4. Benefício e Custo

- **Benefício**: garante teto rígido de gasto (`token_budget` / tempo) em execução autônoma `/goal`, mantendo intacta a imparcialidade superior do juiz externo (`Haiku`) do `nycode`.
- **Custo em tokens**: `0` tokens quando `/goal` não está ativo; ~`148` tokens (apenas se injetar aviso de orçamento próximo ao fim, equivalente a `budget_limit.md`).
- **Custo em latência**: `0 ms` (aritmética sobre `sessionTokens(ctx)` já computado no fim do turno).
- **Custo de manutenção**: baixo (~60 linhas em `extensions/goal/`).

## 5. Riscos e Licença

- **Riscos**: parar abruptamente no meio de uma edição final quando o orçamento acaba; mitigação: enviar um aviso regressivo ao cruzar `80%` do orçamento (permitindo fechar/verificar e commitar estado limpo) e encerrar com `stop` limpo ao atingir `100%`.
- **Licença**: Codex (`Apache-2.0`, `LICENSE:1-201`); extensão limpa de `extensions/goal/` existente no `nycode`.

## 6. Proposta Técnica e Plano de Eval (Obrigatório — Classe B)

- **Arquivos a tocar no `nycode`**:
  - `packages/coding-agent/src/extensions/goal/session.ts`: estender `GoalEntry` com `tokenBudget?: number`, `timeBudgetMs?: number` e helpers `remainingBudget(ctx, entry)`.
  - `packages/coding-agent/src/extensions/goal/index.ts`: parsear flags opcionais `/goal --budget-tokens <N> --max-minutes <M> <condição>`; injetar aviso único ao atingir `>= 80%` e encerrar graciosamente em `>= 100%`, persistindo motivo no status.
- **Testes unitários**:
  - Meta com `--budget-tokens 50000` emite aviso após cruzar `40000` e encerra ao passar `50000` somando tokens do agente + avaliador; estado persistido sobrevive a `/resume`.
- **Plano de Eval (Classe B — pareado)**:
  - **Suite**: adicionar casos de meta de múltiplas etapas com orçamento apertado em `packages/evals` comparando `/goal` sem aviso de orçamento vs `/goal` com aviso de `80%` + corte em `100%`.
  - **Métricas**: zero estouro acima de `100% + 1 turno`, taxa de conclusão limpa antes do teto vs baseline.
- **Critério de aceite**: cumprimento rígido do limite de tokens somando agente principal + `evaluatorTokens`.
- **Rollback**: ignorar flags opcionais de orçamento em `goal/index.ts`.
