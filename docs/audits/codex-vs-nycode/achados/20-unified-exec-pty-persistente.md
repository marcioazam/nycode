# Achado 20 — Unified Exec PTY Persistente (`exec_command` + `write_stdin`)

- **Classificação**: **Classe B** (expande esquema de ferramentas se adicionado `write_stdin`, muda modelo de interação shell e exige dependência nativa PTY como `node-pty`).
- **Prioridade no backlog**: #21 (Classe B — **P3**).

## 1. Como o Codex faz

No Codex, a ferramenta padrão de shell (`exec_command` + `write_stdin`) roda sobre um gerenciador unificado de PTY/pipes com pool LRU (`codex-rs/core/src/unified_exec/mod.rs:68-78` e `tools/handlers/shell_spec.rs:10-44`):

```rust
// codex-rs/core/src/unified_exec/mod.rs:68-78
pub(crate) const MIN_YIELD_TIME_MS: u64 = 250;
pub(crate) const WINDOWS_INITIAL_EXEC_YIELD_TIME_FLOOR_MS: u64 = 10_000;
// Minimum yield time for an empty `write_stdin`.
pub(crate) const MIN_EMPTY_YIELD_TIME_MS: u64 = 5_000;
pub(crate) const MAX_YIELD_TIME_MS: u64 = 30_000;
pub(crate) const DEFAULT_MAX_BACKGROUND_TERMINAL_TIMEOUT_MS: u64 = 300_000;
pub(crate) const DEFAULT_MAX_OUTPUT_TOKENS: usize = 10_000;
pub(crate) const UNIFIED_EXEC_OUTPUT_MAX_BYTES: usize = 1024 * 1024; // 1 MiB
pub(crate) const UNIFIED_EXEC_OUTPUT_MAX_TOKENS: usize = UNIFIED_EXEC_OUTPUT_MAX_BYTES / 4;
pub(crate) const MAX_UNIFIED_EXEC_PROCESSES: usize = 64;
```

Se um comando rápido termina em < `yield_time_ms` (padrão `10,000 ms`), retorna na hora; se continuar rodando (ex.: servidor dev, debugger `gdb`, REPL Python, paginador), retorna um `session_id` e o modelo pode enviar teclas/comandos via `write_stdin` (`chars`, `yield_time_ms`, `max_output_tokens`) aproveitando o mesmo processo até 64 sessões simultâneas.

Medido em `o200k_base`: `exec_command` custa `334` tokens e `write_stdin` custa `167` tokens (`501` tokens ao todo).

## 2. Como o `nycode` faz

Em `packages/coding-agent/src/extensions/run/tool.ts:17-58` (e `core/tools/bash.ts`), o `nycode` separa:
1. `bash` (`144` tok): síncrono com timeout (opcionalmente promove para background no timeout dependendo de `tools.bash.backgroundOnTimeout`), fecha stdin (`pipe`) sem pseudo-terminal.
2. `run`: gerencia jobs em background (`start`, `list`, `tail`, `stop`, `wait`), também via pipes sem `write_stdin` interativo nem alocação de PTY (`tty: true`).

## 3. Diferença Concreta

Comandos que detectam `isatty()`, aguardam entrada em REPLs (`python -i`, `psql`, `gdb`, `lldb`), exibem TUI simples ou pedem confirmação Y/n após alguns passos travam até o timeout no `nycode` (e não aceitam envio incremental de stdin depois que `run.start` já iniciou). Por outro lado, o sistema atual do `nycode` não depende de addon nativo C++ (`node-pty`) no binário.

## 4. Benefício e Custo

- **Benefício**: desbloqueia fluxos interativos reais (depuração passo a passo em `gdb`/`pdb`, prompts interativos inesperados, REPLs stateful sem reiniciar do zero) e unifica espera curta (`yield_time_ms`) + continuação stateful.
- **Custo em tokens**: `+167` a `+350` tokens por turno caso `write_stdin` / campos PTY fiquem sempre no schema padrão; `0` tokens se exposto apenas sob demanda via `tool_search` ou flag/extensão opt-in.
- **Custo em latência**: abertura de PTY `< 5 ms`; potencial ganho grande em sessões iterativas (evita reiniciar ambiente/REPL).
- **Custo de manutenção**: **alto** — exige binding nativo PTY (`node-pty` ou helper C/Rust compilado cross-platform para Linux/macOS dentro do binário único empacotado) e controle cuidadoso de escape sequences ANSI antes de devolver ao modelo.

## 5. Riscos e Licença

- **Riscos**: quebra de portabilidade do binário único sem Node/compilador caso `node-pty` falhe no target musl/arm64; poluição do contexto do modelo por códigos ANSI/spinner de TUI capturados por PTY. Mitigação: normalizar/remover sequências ANSI antes de truncar saída e expor ação `send` / `tty` no `run` apenas quando addon PTY carregar com segurança (fallback limpo para pipe).
- **Licença**: Codex (`Apache-2.0`, `LICENSE:1-201`); se usar `node-pty`, licença `MIT`.

## 6. Proposta Técnica e Plano de Eval (Obrigatório — Classe B)

- **Arquivos a tocar no `nycode`**:
  - `packages/coding-agent/src/extensions/run/tool.ts` e `shell.ts`: adicionar opção `tty?: boolean` em `start` e nova ação `send` (envio de texto/`\n`/`\u0003` + yield curto) suportada por pool limitado (`MAX_PTY = 16–64`) via wrapper PTY opcional.
  - Manter `bash` intacto (`144` tok) para não inflar o schema padrão em sessões simples/headless `-p`.
- **Testes unitários**:
  - Teste com processo Python REPL (`python3 -i`): `run start(tty: true)` -> `run send("print(2+2)\n")` -> `run stop` verificando saída limpa sem ANSI quebrado e limpeza de processos zumbis ao fechar sessão.
- **Plano de Eval (Classe B — pareado)**:
  - **Suite**: **S2 (`terminal-bench@2.0`)** + casos específicos interativos (`gdb`/REPL) em `packages/evals` comparando `nycode` baseline vs candidato com `run(tty + send)` habilitado.
  - **Métricas (`docs/bench/RUNBOOK.md`)**: acerto `>= -10 pp`, custo/turnos `<= 1.10`, sem regressão no custo de cold start (`bench/contract/speed.py`).
- **Critério de aceite**: nenhum processo órfão ao sair + aprovação no gate S2 e build do binário único verde.
- **Rollback**: desabilitar `tty`/`send` deixando `run` atual via pipes sem dependência nativa.
