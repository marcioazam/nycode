# Achado 07 — `apply_patch` em Gramática Lark Freeform + `seek_sequence` 4 Passes

- **Classificação**: **Classe B** (altera tool schema, formato de chamada do modelo e taxa de sucesso de edição; depende fortemente do pré-treino do provedor).
- **Prioridade no backlog**: #22 (Classe B — **P3**; alto risco se ativado fora de modelos OpenAI/Codex).

## 1. Como o Codex faz

Para reduzir overhead de JSON-escaping em patches multi-arquivo, o Codex registra `apply_patch` como **Freeform Tool** com gramática Lark (`codex-rs/core/assets/tools/apply_patch.lark:1-19`) e resolve localização tolerante a espaços/finais em `codex-rs/apply-patch/src/seek_sequence.rs:12-65`:

```lark
// codex-rs/core/assets/tools/apply_patch.lark:1-19
start: begin_patch hunk+ end_patch
begin_patch: "*** Begin Patch" LF
end_patch: "*** End Patch" LF?

hunk: add_hunk | delete_hunk | update_hunk
add_hunk: "*** Add File: " filename LF add_line+
delete_hunk: "*** Delete File: " filename LF
update_hunk: "*** Update File: " filename LF change_move? change?

filename: /(.+)/
add_line: "+" /(.*)/ LF -> line

change_move: "*** Move to: " filename LF
change: (change_context | change_line)+ eof_line?
change_context: ("@@" | "@@ " /(.+)/) LF
change_line: ("+" | "-" | " ") /(.*)/ LF
eof_line: "*** End of File" LF

%import common.LF
```

```rust
// codex-rs/apply-patch/src/seek_sequence.rs:35-65
    // Exact match first.
    for i in search_start..=lines.len().saturating_sub(pattern.len()) {
        if lines[i..i + pattern.len()] == *pattern {
            return Some(i);
        }
    }
    // Then rstrip match.
    for i in search_start..=lines.len().saturating_sub(pattern.len()) {
        let mut ok = true;
        for (p_idx, pat) in pattern.iter().enumerate() {
            if lines[i + p_idx].trim_end() != pat.trim_end() {
                ok = false;
                break;
            }
        }
        if ok {
            return Some(i);
        }
    }
    // Finally, trim both sides to allow more lenience.
```

Medido em `o200k_base`: o spec completo de `apply_patch` (gramática + descrição) custa **`252` tokens** e cobre adicionar, apagar, mover e editar vários arquivos em uma única chamada.

## 2. Como o `nycode` faz

O `nycode` separa criação (`write`, **`84` tokens**) e substituição multi-hunk em arquivo único (`edit`, **`237` tokens**) como JSON schemas estruturados (`packages/coding-agent/src/core/tools/edit.ts` e `edit-diff.ts`), somando **`321` tokens** no loadout padrão. O algoritmo de matching de `edit-diff.ts` já possui busca fuzzy com normalização de espaços e aspas/traços Unicode antes de gerar diff (`edit-diff.ts:420-434`).

## 3. Diferença Concreta

1. **Economia de schema**: `apply_patch` (`252` tok) economiza **`69` tokens** (`-21,5%`) sobre `edit + write` (`321` tok) em todo turno e evita string-escaping JSON em edições com muitas aspas/quebras de linha.
2. **Assimetria de pré-treino**: modelos da família OpenAI GPT/Codex suportam gramática `custom` freeform nativa no endpoint Responses e têm alto ajuste fino em `*** Begin Patch`; modelos Anthropic (`Claude`) são fortemente treinados em `edit`/`write` JSON e podem perder acurácia ou emitir patch malformado em Lark se `edit` for substituído globalmente.

## 4. Benefício e Custo

- **Benefício**: `-69` tok fixos por turno + patches atômicos multi-arquivo numa única ida ao modelo para provedores compatíveis (`openai-codex`).
- **Custo em tokens**: `-69` tok em schema + redução em strings escapadas no output; risco de retries se o modelo errar delimitadores.
- **Custo em latência**: `0 ms` local; reduz `1..N` round-trips quando altera vários arquivos de uma vez.
- **Custo de manutenção**: alto — obriga manter dois pipelines completos de edição, integração com `git-checkpoint`, permissões por hunk e exibição de diff na TUI.

## 5. Riscos e Licença

- **Riscos**: alto risco de regressão de assertividade em modelos não OpenAI; colisão semântica em hooks `PreToolUse`/`PostToolUse` que mapeiam `Edit`/`Write` no formato Claude compat (`extensions/hooks/index.ts:47-50`).
- **Licença**: Codex (`Apache-2.0`, `LICENSE:1-201`); requer atribuição em `NOTICE` caso a gramática `apply_patch.lark` literal seja copiada.

## 6. Proposta Técnica e Plano de Eval (Obrigatório — Classe B)

- **Arquivos a tocar no `nycode`** (ativação estritamente condicional ao modelo/provedor OpenAI Responses com suporte `custom` tool):
  - `packages/ai/src/api/openai-codex-responses.ts`: suportar tool spec `type: "custom"` com `format: { type: "grammar", syntax: "lark", definition }`.
  - Novo tool opcional em `packages/coding-agent/src/core/tools/apply-patch.ts`: parser TypeScript puro de `*** Begin Patch` reutilizando `edit-diff.ts` para cálculo de hunks e integrando checkpoint por arquivo tocado.
- **Testes unitários**:
  - Parser para `Add File`, `Delete File`, `Update File`, `Move to`, `@@` context e `End of File`, validação de path traversal e replay de hooks por arquivo afetado.
- **Plano de Eval (Classe B — pareado)**:
  - **Braços**: comparar `nycode` baseline (`edit`+`write`) vs candidato (`apply_patch` habilitado apenas quando provedor for `openai-codex`, mantendo `edit`+`write` no Claude) em **S2 (`terminal-bench@2.0`)** e **S1**.
  - **Métricas**: taxa de resolução (`>= -10 pp`), erros de formato por chamada (`tool call failed`), razão de tokens totais e turnos (`<= 1.10` conforme `docs/bench/RUNBOOK.md`).
- **Critério de aceite**: ganho líquido ou empate estatístico em acerto no `openai-codex` com redução de tokens de output e zero regressão em `git-checkpoint`/hooks.
- **Rollback**: feature flag de loadout mantendo `edit`/`write` em 100% dos provedores.
