# Achado 01 — `BoundOutput` (`-o`) e `exit(1)` em `--mode json` com erro

- **Classificação**: **Classe A** (0 tokens extras, zero mudança no comportamento do modelo/prompt/tool/loop, sem dependência nativa).
- **Prioridade no backlog**: #1 (Classe A).

## 1. Como o Codex faz

No comando não interativo `codex exec`, o Codex abre antecipadamente o descritor de arquivo de `-o` / `--output-last-message` via `BoundOutput::open` antes de iniciar o agente (`codex-rs/exec/src/lib.rs:1101-1109`), impedindo que atividade dentro da sandbox redirecione ou troque o destino via symlink. Além disso, durante o loop de eventos em `--json`, qualquer `ServerNotification::Error` sem retry ou `TurnCompleted` com status `Failed` ou `Interrupted` liga `error_seen = true` e termina o processo com `std::process::exit(1)` (`codex-rs/exec/src/lib.rs:1531-1548,1599-1603`):

```rust
// codex-rs/exec/src/lib.rs:1101-1109
    // Bind before starting the agent. Sandbox activity cannot redirect the final write.
    let bound_output = last_message_file
        .as_deref()
        .map(|path| {
            codex_exec_server::BoundOutput::open(path).map_err(|error| {
                anyhow::anyhow!("Failed to open last message file {path:?}: {error}")
            })
        })
        .transpose()?;
```

```rust
// codex-rs/exec/src/lib.rs:1531-1548 e 1599-1603
                if let ServerNotification::Error(payload) = &notification {
                    if payload.thread_id == primary_thread_id_for_requests
                        && payload.turn_id == task_id
                        && !payload.will_retry
                    {
                        error_seen = true;
                    }
                } else if let ServerNotification::TurnCompleted(payload) = &notification
                    && payload.thread_id == primary_thread_id_for_requests
                    && payload.turn.id == task_id
                    && matches!(
                        payload.turn.status,
                        codex_app_server_protocol::TurnStatus::Failed
                            | codex_app_server_protocol::TurnStatus::Interrupted
                    )
                {
                    error_seen = true;
                }
...
    event_processor.print_final_output(bound_output)?;
    if error_seen {
        std::process::exit(1);
    }
```

## 2. Como o `nycode` faz

Em `packages/coding-agent/src/modes/print-mode.ts:145-169`, a verificação de `assistantMsg.stopReason === "error" || assistantMsg.stopReason === "aborted" || assistantMsg.stopReason === "length"` que ajusta `exitCode = 1` só executa dentro de `if (mode === "text")`:

```ts
// packages/coding-agent/src/modes/print-mode.ts:145-168
      if (mode === "text") {
         const state = session.state;
         const lastMessage = state.messages[state.messages.length - 1];

         if (lastMessage?.role === "assistant") {
            const assistantMsg = lastMessage as AssistantMessage;
            if (assistantMsg.stopReason === "error" || assistantMsg.stopReason === "aborted") {
               console.error(assistantMsg.errorMessage || `Request ${assistantMsg.stopReason}`);
               exitCode = 1;
            } else {
               for (const content of assistantMsg.content) {
                  if (content.type === "text") {
                     writeRawStdout(`${content.text}\n`);
                  }
               }
               if (assistantMsg.stopReason === "length") {
                  console.error("Response was truncated: the model reached its output token limit.");
                  exitCode = 1;
               }
            }
         }
      }

      return exitCode;
```

Além disso, o `nycode` não possui flag `-o` / `--output-last-message` com arquivo pré-aberto (`O_WRONLY | O_CREAT | O_TRUNC | O_NOFOLLOW`) antes do turno em modo `-p` / `--mode json`.

## 3. Diferença Concreta

1. Ao executar `nycode --mode json`, quando a última mensagem termina com `stopReason` `"error"`, `"aborted"` ou `"length"`, o bloco `if (mode === "text")` não roda e `runPrintMode` devolve `exitCode = 0`.
2. Pipelines que redirecionam stdout JSONL com `> saida.json` ou dependem de código de saída em CI obtêm falso positivo (`0`) em falhas de API/truncamento, e precisam de `jq` manual para isolar a resposta final quando apenas o texto consolidado interessa.

## 4. Benefício e Custo

- **Benefício**: elimina falso sucesso silencioso em `--mode json` (alinhado ao comportamento de `mode === "text"`), fecha ataque TOCTOU/symlink em arquivo de saída final (`-o`) e evita boilerplate em scripts CI.
- **Custo em tokens**: `0` tokens por turno.
- **Custo em latência**: `0 ms` (um `fs.openSync` + `ftruncateSync`/`writeFileSync`).
- **Custo de manutenção**: muito baixo (~35 linhas isoladas).

## 5. Riscos e Licença

- **Riscos**: scripts legados que invocavam `--mode json` esperando exit `0` mesmo com `stopReason: "error"` passarão a receber exit `1` — comportamento desejado em CI, mas que deve constar nas notas de release.
- **Licença**: Codex é `Apache-2.0` (`LICENSE:1-201`, `NOTICE:1-6`). A implementação em TypeScript é clean-room (uso padrão de flags POSIX `O_NOFOLLOW` e propagação de `exitCode = 1`), sem copiar código Rust.

## 6. Proposta Técnica e Critérios

- **Arquivos a tocar no `nycode`**:
  - `packages/coding-agent/src/modes/print-mode.ts`: mover a avaliação de `lastMessage?.role === "assistant"` e `stopReason` para fora do guard `mode === "text"`, mantendo escrita em stdout apenas no modo texto; abrir e validar o `fd` de `--output-last-message` antes de `rebindSession()` / `session.prompt()`, gravando via `fd` com `fs.ftruncateSync` no `finally` apenas se houver mensagem final válida.
  - `packages/coding-agent/src/cli/args.ts`: registrar flag `-o` / `--output-last-message <file>`.
- **Testes unitários e de integração**:
  - Teste em `packages/coding-agent/test/` simulando `--mode json` com faux provider retornando `stopReason: "error"`, `"aborted"` e `"length"`, verificando código de saída `1` e emissão normal dos eventos JSONL no stdout.
  - Teste verificando que `-o <arquivo>` pré-aberto não segue symlink criado durante a execução do turno.
- **Plano de eval**: não aplicável (Classe A; não altera comportamento do modelo nem tokens).
- **Critério de aceite**: `npm run check` limpo + novos testes passando + exit code `1` em ambos os modos (`text` e `json`) para falhas de turno.
- **Rollback**: reverter adição da flag `-o` e restaurar o bloco condicional em `print-mode.ts`.
