# Inventario: crates-iso

Cada linha cobre 1 arquivo rastreado em `~/source/oh-my-pi-ref` (`git ls-files`), com categoria, origem em relação ao Pi `v0.9.4`, dono equivalente no `nycode` (ou `sem equivalente`) e nota resumida verificada nos shards. Regras e totais em [../inventario.md](../inventario.md).

| Arquivo | Categoria | Origem | Dono no nycode | Nota |
|---|---|---|---|---|
| `crates/iso/BUILD.bazel` | codigo | omp-novo | sem equivalente | 28L; Definição Bazel para a biblioteca `omp_iso` e sua suíte de testes `iso_test`. |
| `crates/iso/Cargo.toml` | config_ou_dado | omp-novo | sem equivalente | 27L; Manifesto Cargo do crate `omp-iso` com dependências cross-platform (`omp-diff`, `tokio`, `xutf`, `libc`, `parking_lot`, `window... |
| `crates/iso/LICENSE` | codigo | omp-novo | sem equivalente | 22L; Licença MIT do crate `omp-iso`. |
| `crates/iso/src/apfs.rs` | codigo | omp-novo | sem equivalente | 240L; Backend macOS baseado em `clonefile(2)` do APFS para clonar árvores inteiras em O(1) copy-on-write, incluindo `clone_tree` que ... |
| `crates/iso/src/btrfs.rs` | codigo | omp-novo | sem equivalente | 271L; Backend Linux para subvolumes btrfs: valida via `stat`/`statfs` se `lower` é raiz de subvolume (inode 256 + magic btrfs), cria ... |
| `crates/iso/src/cow.rs` | codigo | omp-novo | sem equivalente | 436L; Clonagem copy-on-write de arquivos multiplataforma compartilhada pelos backends e shell `cp`: usa `FICLONE` no Linux, `clonefil... |
| `crates/iso/src/diff.rs` | codigo | omp-novo | sem equivalente | 758L; Captura de diferenças agnóstica ao backend: usa `git diff HEAD` + `ls-files --others` com `--no-index` quando há `.git`, ou per... |
| `crates/iso/src/lib.rs` | codigo | omp-novo | sem equivalente | 444L; API pública e PAL de isolamento (`omp-iso`): define `BackendKind`, trait `IsolationBackend`, ordem automática por SO (`auto_ord... |
| `crates/iso/src/linux_reflink.rs` | codigo | omp-novo | sem equivalente | 199L; Backend Linux `FICLONE` que materializa recursivamente `merged` a partir de `lower` clonando arquivos regulares por reflink e p... |
| `crates/iso/src/overlayfs.rs` | codigo | omp-novo | sem equivalente | 410L; Backend Linux OverlayFS: tenta `mount(2)` de kernel `overlay`, faz fallback para `fuse-overlayfs` quando negado/indisponível e ... |
| `crates/iso/src/projfs.rs` | codigo | omp-novo | sem equivalente | 978L; Backend Windows Projected File System (`ProjFS`): carrega `ProjectedFSLib.dll` dinamicamente, bloqueia emulação x64-em-ARM64, g... |
| `crates/iso/src/rcopy.rs` | codigo | omp-novo | sem equivalente | 635L; Backend fallback universal `Rcopy`: cria `git worktree add --detach` e replica estado sujo (staged, unstaged e untracked) quand... |
| `crates/iso/src/tree.rs` | codigo | omp-novo | sem equivalente | 134L; Utilitários compartilhados pelos backends de materialização em árvore: validação e canonicalização de diretório fonte, preparaç... |
| `crates/iso/src/windows_block_clone.rs` | codigo | omp-novo | sem equivalente | 246L; Backend Windows block-clone (`ReFS`/Dev Drive): materializa árvore clonando blocos de arquivos regulares via `cow::clone_new`, ... |
| `crates/iso/src/zfs.rs` | codigo | omp-novo | sem equivalente | 351L; Backend Unix ZFS: identifica dataset exato pelo mountpoint (com pré-filtro `statfs` no Linux), cria snapshot e dataset clone ir... |
