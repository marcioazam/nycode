# Achado 10 — Compactação Seletiva por Poda e Trigger em Downshift de Modelo

- **Classificação**: **Classe B** (altera política de compactação, histórico visível após truncamento/troca de modelo e pode expor novas ferramentas de orçamento de janela).
- **Prioridade no backlog**: #9 (Classe B — **P1**).

## 1. Como o Codex faz

O Codex aplica três mecanismos complementares de sobrevivência de janela de contexto que vão além do resumo único ao atingir um percentual fixo:

- **Poda seletiva de saídas antigas sem sumarização cara (`codex-rs/core/src/compact_remote_history.rs:111-166`)**: quando a estimativa passa a janela, `trim_function_call_history_to_fit_context_window` percorre grupos de itens substituindo saídas grandes antigas por versões truncadas até caber no orçamento antes de precisar descartar conversa inteira:

```rust
// codex-rs/core/src/compact_remote_history.rs:134-154
    for group in newest_history_item_groups(original_items) {
        if i64::try_from(estimated_tokens).unwrap_or(i64::MAX) <= context_window {
            break;
        }
        if should_retain_client_item(group.source, &turn_context.config.features) {
            break;
        }
        let Some(rewritten_item) = rewritten_output_for_context_window(group.source) else {
            break;
        };
        estimated_tokens = estimated_tokens
            .saturating_sub(group.estimated_token_count(audio_durations))
            .saturating_add(i128::from(estimate_item_token_count_with_audio(
                &rewritten_item.item,
                audio_durations,
            )));
        retained_len = group.source_position;
        rewritten_items.push(rewritten_item);
    }
```

- **Recuperação incremental em `ContextWindowExceeded` preservando prefixo de cache (`codex-rs/core/src/compact.rs:355-370`)**: ao falhar na própria compactação por excesso de contexto, remove itens mais antigos (`history.remove_first_item()`) preservando mensagens recentes intactas:

```rust
// codex-rs/core/src/compact.rs:359-368
            Err(e) if matches!(e.details(), CodexErrorDetails::ContextWindowExceeded) => {
                if turn_input_len > 1 {
                    // Trim from the beginning to preserve cache (prefix-based) and keep recent messages intact.
                    error!(
                        "Context window exceeded while compacting; removing oldest history item. Error: {e}"
                    );
                    history.remove_first_item();
                    retries = 0;
                    continue;
                }
```

- **Compactação automática ao trocar para modelo com janela menor (`codex-rs/core/src/session/turn.rs:1713-1765`)**: `maybe_run_previous_model_inline_compact` compara o contexto ativo com a janela/limite do novo modelo *antes* de enviar o próximo turno. O Codex também contabiliza orçamento por `BodyAfterPrefix` (`codex-rs/core/src/session/context_window.rs:68-81`).

## 2. Como o `nycode` faz

Em `packages/coding-agent/src/core/compaction/compaction.ts:126-142`, o `nycode` já possui um excelente compactador baseado em árvore JSONL com reserva fixa (`reserveTokens: 16384`, `keepRecentTokens: 20000`) e edição de contexto na sessão (`ContextEditEntry` em `session-manager.ts:523-544`):

```ts
// packages/coding-agent/src/core/compaction/compaction.ts:126-142
export const DEFAULT_COMPACTION_SETTINGS: CompactionSettings = {
   enabled: true,
   reserveTokens: 16384,
   keepRecentTokens: 20000,
};
...
export function calculateContextTokens(usage: Usage): number {
   return usage.totalTokens || usage.input + usage.output + usage.cacheRead + usage.cacheWrite;
}
```

Contudo:
- Não há uma passagem pré-sumarização gratuita (`0` tokens de LLM) que substitua `toolResult` gigantes antigos via `ContextEditEntry` antes de disparar o resumo completo.
- Ao usar `/model` (ou `effort-sandwich` / roteamento) para alternar de um modelo com janela de `1M` para `128k`–`200k`, não há verificação imediata pré-turno que dispare compactação antes de estourar o limite na chamada de API.
- Quando a própria chamada de resumo falha por excesso de contexto, não há corte regressivo automático com retry.

## 3. Diferença Concreta

O `nycode` já possui a primitiva ideal no `SessionManager` (`projectContextEntry` + `ContextEditEntry` sem reescrever histórico gravado), mas ainda não a usa como estágio 0 de poda determinística de tool outputs grandes nem verifica downshift de janela em troca de modelo.

## 4. Benefício e Custo

- **Benefício**: reduz chamadas caras de compactação completa (economiza o custo do prompt de resumo), evita crash abrupto em troca para modelos menores e recupera graciosamente de estouros pontuais de contexto.
- **Custo em tokens**: negativo (economiza compactações desnecessárias com poda local determinística de `toolResult` pesados antigos); apenas o resumo de downshift ocorre quando realmente excede a nova janela.
- **Custo em latência**: `< 2 ms` para poda determinística local; evita `1+` chamadas falhas de API.
- **Custo de manutenção**: médio (~160 linhas em `compaction/` e gancho em `model_select`/`agent-session.ts`).

## 5. Riscos e Licença

- **Riscos**: podar saída recente de leitura que o modelo ainda vai editar no turno imediato invalida o cache de prefixo se feito sem critério temporal/prefixo — portanto a poda deve respeitar janela recente (`keepRecentTokens`), mantendo prefixo quando dentro do teto e podando primeiro resultados extensos antigos fora da cauda ativa.
- **Licença**: Codex (`Apache-2.0`, `LICENSE:1-201`); lógica implementada nativamente sobre `ContextEditEntry` já existente no `nycode`.

## 6. Proposta Técnica e Plano de Eval (Obrigatório — Classe B)

- **Arquivos a tocar no `nycode`**:
  - `packages/coding-agent/src/core/compaction/compaction.ts`: adicionar fase de poda barata opcional de `toolResult` antigos muito acima de um limiar (substituindo por resumo de cabeçalho via `ContextEditEntry`), além de fallback regressivo no resumo caso a API retorne overflow durante `compact()`.
  - `packages/coding-agent/src/core/agent-session.ts`: ao trocar de modelo para um com `contextWindow` menor que o uso corrente estimado, acionar compactação antes da próxima chamada ao provedor.
- **Testes unitários**:
  - Teste com histórico contendo múltiplos outputs de `read`/`bash` > 50 KB simulando troca de modelo `1M -> 128k` e overflow durante compactação.
- **Plano de Eval (Classe B — pareado)**:
  - **Suites**: casos longos em **S4** (`suites/plan`) / **S2 (`terminal-bench@2.0`)** + eval dedicada em `packages/evals/` simulando sessão multi-arquivo longa.
  - **Métricas (`docs/bench/RUNBOOK.md`)**: acerto `>= -10 pp` vs baseline `main`, redução de custo total (tokens de compactação) e zero falhas `ContextWindowExceeded`.
- **Critério de aceite**: zero erro não recuperado ao reduzir janela via `/model` + melhoria/paridade em custo e resolução em S2/S4.
- **Rollback**: desligar estágio pré-poda via flag em `compaction` settings mantendo a lógica atual de compactação única.
