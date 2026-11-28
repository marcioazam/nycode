# Inventario: crates-vcs

Cada linha cobre 1 arquivo rastreado em `~/source/oh-my-pi-ref` (`git ls-files`), com categoria, origem em relação ao Pi `v0.9.4`, dono equivalente no `nycode` (ou `sem equivalente`) e nota resumida verificada nos shards. Regras e totais em [../inventario.md](../inventario.md).

| Arquivo | Categoria | Origem | Dono no nycode | Nota |
|---|---|---|---|---|
| `crates/vcs/BUILD.bazel` | codigo | omp-novo | `packages/coding-agent/src/utils/git.ts` | 28L; Define os alvos Bazel `rust_library` (`omp_vcs`, edição 2024, dependência em `//crates/iso`) e `rust_test` para o crate `vcs`. |
| `crates/vcs/Cargo.toml` | config_ou_dado | omp-novo | `packages/coding-agent/src/utils/git.ts` | 31L; Manifesto Cargo do crate `omp-vcs`, declarando dependências em `gix`, `jj-lib`, `omp-iso`, `tokio`, `tokio-util`, `xutf`, `this... |
| `crates/vcs/src/error.rs` | codigo | omp-novo | `packages/coding-agent/src/utils/git.ts` | 174L; Define o enum de erro unificado `Error` compartilhado pelos backends git e jj (`NotARepository`, `HeadMoved`, `EmptyCherryPick`... |
| `crates/vcs/src/git/cli.rs` | codigo | omp-novo | `packages/coding-agent/src/utils/git.ts` | 1032L; Implementa o runner endurecido do binário `git` (assíncrono e síncrono) para operações de rede, reftable e walks pesados: limpa... |
| `crates/vcs/src/git/diff.rs` | codigo | omp-novo | `packages/coding-agent/src/utils/git.ts` | 2360L; Implementa as APIs de diff e show in-process sobre `gix` (`diff_text`, `changed_files`, `numstat`, `has_diff`, `diff_tree`, `di... |
| `crates/vcs/src/git/filter.rs` | codigo | omp-novo | `packages/coding-agent/src/utils/git.ts` | 157L; Implementa `WorktreeFilter` para aplicar o pipeline clean/smudge do git (`core.autocrlf`, `.gitattributes` `text`/`eol`, `ident... |
| `crates/vcs/src/git/mod.rs` | codigo | omp-novo | `packages/coding-agent/src/utils/git.ts` | 566L; Define `GitRepo` com abertura preguiçosa de `gix::ThreadSafeRepository` e descoberta pura em sistema de arquivos (`discover_inf... |
| `crates/vcs/src/git/mutate.rs` | codigo | omp-novo | `packages/coding-agent/src/utils/git.ts` | 4201L; Implementa mutações git locais in-process: staging com filtros e limpeza de entries `racy`, commits com hooks (`pre-commit`/`co... |
| `crates/vcs/src/git/open.rs` | codigo | omp-novo | `packages/coding-agent/src/utils/git.ts` | 199L; Gerencia abertura lazy e isolada de `gix::Repository` via `.git` (evitando erro em checkouts `*.git`), bloqueia abertura in-pro... |
| `crates/vcs/src/git/patch.rs` | codigo | omp-novo | `packages/coding-agent/src/utils/git.ts` | 3520L; Implementa aplicação e checagem de patches (`apply_patch`, `can_apply_patch`), reconciliação de commit seletivo no índice compa... |
| `crates/vcs/src/git/read.rs` | codigo | omp-novo | `packages/coding-agent/src/utils/git.ts` | 1890L; Implementa leituras Git (HEAD, refs, tags, branches, worktrees, logs, merge-base, status_porcelain, is_dirty e operation_kind) ... |
| `crates/vcs/src/jj/mod.rs` | codigo | omp-novo | `packages/coding-agent/src/utils/git.ts` | 96L; Implementa descoberta leve em filesystem de workspaces Jujutsu via `.jj/repo` (diretório ou arquivo de indireção em workspaces ... |
| `crates/vcs/src/jj/ops.rs` | codigo | omp-novo | `packages/coding-agent/src/utils/git.ts` | 1259L; Implementa operações Jujutsu in-process via `jj-lib` (sem subprocessos) sobre runtime Tokio por chamada: rótulo de working copy... |
| `crates/vcs/src/lib.rs` | codigo | omp-novo | `packages/coding-agent/src/utils/git.ts` | 498L; Define a fachada unificada `Repo` (`Git` \| `Jj`), capacidades `Feature`, validacao de opcoes exclusivas de git para jj e detecc... |
| `crates/vcs/src/types.rs` | codigo | omp-novo | `packages/coding-agent/src/utils/git.ts` | 399L; Define os tipos compartilhados entre os backends Git e Jujutsu (estado de HEAD, worktrees, metadados de commit, opcoes de diff/... |
| `crates/vcs/tests/worktree_clone_carry.rs` | teste | omp-novo | `packages/coding-agent/src/utils/git.ts` | 362L; Testes de `GitRepo::worktree_add` com `WorktreeClone::Auto` (`omp_iso`) validando exclusão de diretórios não-relocáveis auto-ig... |
