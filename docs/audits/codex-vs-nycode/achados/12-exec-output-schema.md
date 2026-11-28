# Achado 12 — Flag `--output-schema` em Execução Headless (`nycode -p`)

- **Classificação**: **Classe B** (altera contrato de payload da API com JSON Schema estruturado e adiciona tentativa/validação de resposta estruturada do modelo).
- **Prioridade no backlog**: #14 (Classe B — **P2**).

## 1. Como o Codex faz

O subcomando `codex exec` aceita `--output-schema <FILE>` (`codex-rs/exec/src/cli.rs:75-77`) e valida o arquivo JSON **antes** de subir a sessão em `load_output_schema` (`codex-rs/exec/src/lib.rs:2516-2540`), anexando-o como `text.format` (`TextControls`) para forçar resposta aderente ao schema na API Responses:

```rust
// codex-rs/exec/src/cli.rs:75-77
    /// Path to a JSON Schema file describing the model's final response shape.
    #[arg(long = "output-schema", value_name = "FILE", global = true)]
    pub output_schema: Option<PathBuf>,
```

```rust
// codex-rs/exec/src/lib.rs:2516-2540
fn load_output_schema(path: Option<PathBuf>) -> Option<Value> {
    let path = path?;

    let schema_str = match std::fs::read_to_string(&path) {
        Ok(contents) => contents,
        Err(err) => {
            eprintln!(
                "Failed to read output schema file {}: {err}",
                path.display()
            );
            std::process::exit(1);
        }
    };

    match serde_json::from_str::<Value>(&schema_str) {
        Ok(value) => Some(value),
        Err(err) => {
            eprintln!(
                "Output schema file {} is not valid JSON: {err}",
                path.display()
            );
            std::process::exit(1);
        }
    }
}
```

## 2. Como o `nycode` faz

Em `packages/coding-agent/src/cli/args.ts:82-120` e `packages/coding-agent/src/modes/print-mode.ts:135-168`, não existe `--output-schema`: automações via `nycode -p` dependem de instruções em linguagem natural no prompt ou de pós-processamento externo sobre `--mode json`, sem validação estrita no provedor nem erro imediato em schema inválido.

## 3. Diferença Concreta

Enquanto `codex exec` garante contrato estrutural nativo (OpenAI Structured Outputs / equivalent schema format) validado antes da primeira chamada LLM e acoplado com `-o` ([Achado 01](01-exec-bound-output-e-exit-json.md)), o `nycode` depende do modelo obedecer markdown/JSON por prompt puro, sujeito a cercas markdown e campos ausentes.

## 4. Benefício e Custo

- **Benefício**: viabiliza uso do `nycode -p` como etapa determinística tipada em pipelines de CI, triagem, migração e extração de dados sem wrappers externos frágeis.
- **Custo em tokens**: variável — equivalente ao tamanho do JSON Schema serializado na requisição (0 tokens extras quando a flag `--output-schema` não é passada).
- **Custo em latência**: validação local `< 1 ms`; possível sobrecarga inicial de compilação de gramática estruturada no provedor na primeira requisição.
- **Custo de manutenção**: baixo (~90 linhas somando CLI + transporte `packages/ai/src/api/`).

## 5. Riscos e Licença

- **Riscos**: suporte desigual de structured output entre provedores suportados pelo `nycode` (OpenAI `text.format` vs Anthropic `output_config`/tool-use forçado). Mitigação: mapear nativamente em OpenAI Responses e usar tool sintética forçada (como `goal/index.ts:326-332` já faz) ou validação AJV + erro claro quando o provedor não suportar grammar enforcement.
- **Licença**: Codex (`Apache-2.0`, `LICENSE:1-201`); uso de JSON Schema Draft 2020-12 padrão.

## 6. Proposta Técnica e Plano de Eval (Obrigatório — Classe B)

- **Arquivos a tocar no `nycode`**:
  - `packages/coding-agent/src/cli/args.ts`: adicionar `--output-schema <file>` e `--output-schema` validation early-fail.
  - `packages/coding-agent/src/modes/print-mode.ts` e `packages/coding-agent/src/core/agent-session.ts`: propagar `outputSchema` nas opções do turno final.
  - `packages/ai/src/api/openai-codex-responses.ts`, `openai-responses.ts` e `anthropic-messages.ts`: aplicar `text.format: { type: "json_schema", strict: true, schema }` (OpenAI) ou estratégia equivalente no provedor alvo.
- **Testes unitários**:
  - Validação imediata exit `1` para arquivo inexistente ou JSON inválido.
  - Serialização correta no payload para faux provider e falha explícita se resposta violar o schema na validação final AJV em `print-mode.ts`.
- **Plano de Eval (Classe B — pareado)**:
  - **Suite**: criar casos em `packages/evals/evals/` (ex.: `output-schema.docs.eval.ts` ou host eval com modelo real) comparando prompt livre JSON vs `--output-schema` em tarefas multi-passo (onde o agente primeiro lê/edita arquivos e depois entrega JSON conforme schema).
  - **Métricas (`docs/bench/RUNBOOK.md`)**: taxa de conformidade JSON válida (`100%` esperado com flag), delta de acerto de tarefa (`>= -10 pp`) e razão de custo (`<= 1.10`).
- **Critério de aceite**: `npm run check` verde + `100%` aderência ao schema em respostas bem-sucedidas dos testes.
- **Rollback**: remover opção CLI e mapeamento de schema nas chamadas da API.
