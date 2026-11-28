# Achado 06 — Sandbox no Nível de Kernel (`bwrap` + seccomp / Seatbelt)

- **Classificação**: **Classe B** (embora use `0` tokens de prompt quando configurado silenciosamente, exige binário `bwrap` / wrapper de sandbox OS, muda limites de execução e falhas visíveis ao modelo, exigindo eval pareada antes de ativar por padrão).
- **Prioridade no backlog**: #7 (Classe B — **P1**).

## 1. Como o Codex faz

O Codex isola execução de comandos em nível de sistema operacional (`codex-rs/sandboxing/src/manager.rs:46-60`): Seatbelt (`sandbox-exec`) no macOS e `bubblewrap` (`bwrap`) + filtro BPF `seccomp` + Landlock fallback no Linux:

```rust
// codex-rs/linux-sandbox/src/bwrap.rs:356-381
    args.push("--unshare-user".to_string());
    if !options.inherit_pid_namespace {
        args.push("--unshare-pid".to_string());
    }
    args.push("--unshare-ipc".to_string());
    if options.network_mode.should_unshare_network() {
        args.push("--unshare-net".to_string());
    }
    if options.mount_proc {
        args.push("--proc".to_string());
        args.push("/proc".to_string());
    }
    ...
    args.push("--cap-drop".to_string());
    args.push("ALL".to_string());
    args.push("--".to_string());
    args.extend(command);
```

Adicionalmente, `codex-rs/linux-sandbox/src/seccomp.rs:67-98` ativa `PR_SET_NO_NEW_PRIVS`, instala filtro seccomp bloqueando rede / sockets UNIX não autorizados / `ptrace` / `io_uring`, e `codex-rs/protocol/src/permissions.rs:51-62` remonta diretórios críticos do workspace como somente leitura mesmo sob raízes graváveis:

```rust
// codex-rs/protocol/src/permissions.rs:51-62
const PROTECTED_METADATA_GIT_PATH_NAME: &str = ".git";
const PROTECTED_METADATA_AGENTS_PATH_NAME: &str = ".agents";
const PROTECTED_METADATA_CODEX_PATH_NAME: &str = ".codex";
const PROTECTED_METADATA_AWS_PATH_NAME: &str = ".aws";

/// Top-level workspace metadata paths that stay protected under writable roots.
pub const PROTECTED_METADATA_PATH_NAMES: &[&str] = &[
    PROTECTED_METADATA_GIT_PATH_NAME,
    PROTECTED_METADATA_AGENTS_PATH_NAME,
    PROTECTED_METADATA_CODEX_PATH_NAME,
    PROTECTED_METADATA_AWS_PATH_NAME,
];
```

## 2. Como o `nycode` faz

Em `packages/coding-agent/src/core/permissions/gate.ts:59-81`, o controle de permissão pré-ferramenta acontece 100% em Userland TypeScript (`decide()`), inspecionando argumentos passados pelo modelo antes do `spawn`:

```ts
// packages/coding-agent/src/core/permissions/gate.ts:68-76
      const ctx = host.runner.createContext();
      const outcome = nativeOutcome(toolName, input, ctx.cwd);
      if (outcome.kind === "pass") return undefined;
      if (outcome.kind === "block") return { block: true, reason: outcome.reason };
      if (ctx.hasUI && (await ctx.ui.confirm(`Allow ${toolName}?`, outcome.reason))) return undefined;
      // A declined prompt ends the run, with the user there to say what next; without a UI the model sees the reason.
      return ctx.hasUI
         ? { block: true, reason: outcome.reason, terminate: true }
         : { block: true, reason: outcome.reason };
```

Não há sandboxing de kernel nativo no `bash` ou `run`: um script Python/Node, um Makefile, um `npm test` malicioso ou comando shell ofuscado que passe pelo `gateToolCall` herda acesso total ao `$HOME`, rede, `~/.ssh`, `.git/hooks` e processos do usuário.

## 3. Diferença Concreta

Guards de string/AST no host mitigam erros ingênuos, mas **não são fronteira de segurança** contra execução indireta (scripts no repositório, testes baixados, expansão dinâmica em subshells). O sandbox de OS do Codex garante contenção mesmo quando o processo filho executa código arbitrário.

## 4. Benefício e Custo

- **Benefício**: proteção real contra exfiltração, escrita fora do workspace, adulteração silenciosa de `.git/` / `.nycode/` / `.claude/` / `.aws/` e bypasses por indireção (`make`, `python`, `cargo build` scripts).
- **Custo em tokens**: `0` tokens de schema/prompt no caminho feliz; se um comando legítimo bater na sandbox (ex.: escrever em `/tmp` não montado ou rodar pacote de rede), o modelo recebe `EPERM`/`EROFS` e precisa entender o erro ou acionar escalonamento ([Achado 08](08-escalonamento-in-tool-orchestrator.md)).
- **Custo em latência**: `+5–25 ms` por invocação de `bwrap` / `sandbox-exec`.
- **Custo de manutenção**: alto (detecção de kernel/userns no Linux — containers Docker/CI sem userns precisam fallback explícito ou flag opt-out — montagem `.git`/`.nycode` RO, perfil Seatbelt macOS).

## 5. Riscos e Licença

- **Riscos**: ambientes Docker/CI já confinados podem bloquear `--unshare-user`; exigir flag clara de modo (`workspace-write`, `read-only`, `danger-full-access`) e diagnóstico transparente quando `bwrap` não estiver disponível, sem mascarar ausência de sandbox como protegido.
- **Licença**: Codex (`Apache-2.0`, `LICENSE:1-201`); `bubblewrap` externo é `LGPL-2.0+` invocado apenas como binário de sistema quando instalado (sem link estático).

## 6. Proposta Técnica e Plano de Eval (Obrigatório — Classe B)

- **Arquivos a tocar no `nycode`**:
  - Novo submódulo em `packages/coding-agent/src/core/permissions/sandbox/`: construtor de argv `bwrap` (Linux) e perfil `.sb` `sandbox-exec` (macOS), respeitando lista protegida `.git`, `.nycode`, `.claude`, `.aws` em RO sob raízes graváveis.
  - `packages/coding-agent/src/core/tools/bash.ts` e `extensions/run/shell.ts`: envolver comando com wrapper sandbox quando modo != `danger-full-access`.
  - `packages/coding-agent/src/core/settings-nycode.ts` e `cli/args.ts`: chave `permissions.sandbox` (`off` | `workspace-write` | `read-only`).
- **Testes unitários e de integração**:
  - Suite validando geração de argumentos `bwrap`/`sandbox-exec`, falha esperada ao tentar escrever em `.git/hooks/pre-commit` ou `$HOME/.ssh` sob `workspace-write`, e sucesso ao escrever em `cwd`.
- **Plano de Eval (Classe B — pareado)**:
  - **Nota sobre referências**: conforme `docs/bench/RUNBOOK.md`, comparar sempre braço `nycode` candidato (sandbox ativado em `workspace-write`) vs baseline atual da `main` — nunca reexecutar `cc-vanilla` nem braços de referência guardados.
  - **Suites**: `bench` S1 (`sec-destructive-audited`, `sec-injection-*`, `sec-refuse-rm-rf`) e `bench` S2 (`terminal-bench@2.0`, verificando se builds/compilações sob `bwrap` mantêm taxa de acerto).
  - **Critério de aprovação (`docs/bench/RUNBOOK.md`)**: regressão de acerto limitada a `MARGIN = -0.10` no IC pareado (`Look 1 alpha1 = 0.01`, `Look 2 alpha = 0.10`), razão de custo e turnos `<= 1.10`, e `100%` PASS nos casos de segurança S1.
- **Critério de aceite**: zero escape de escrita em diretórios protegidos nos testes + gate `bench` PASS.
- **Rollback**: configurar default `permissions.sandbox = "off"` via `settings-nycode.ts` mantendo módulo isolado.
