# Inventario: crates-vfs

Cada linha cobre 1 arquivo rastreado em `~/source/oh-my-pi-ref` (`git ls-files`), com categoria, origem em relação ao Pi `v0.9.4`, dono equivalente no `nycode` (ou `sem equivalente`) e nota resumida verificada nos shards. Regras e totais em [../inventario.md](../inventario.md).

| Arquivo | Categoria | Origem | Dono no nycode | Nota |
|---|---|---|---|---|
| `crates/vfs/BUILD.bazel` | codigo | omp-novo | sem equivalente | 26L; Regras Bazel para compilar a biblioteca `omp_vfs` (Rust edition 2024) e sua suite de testes `vfs_test`. |
| `crates/vfs/Cargo.toml` | config_ou_dado | omp-novo | sem equivalente | 28L; Manifesto Cargo da crate `omp-vfs`, declarando dependencias `async-trait`, `parking_lot`, `tokio`, `tokio-util` e crates especi... |
| `crates/vfs/src/canonicalize.rs` | codigo | omp-novo | sem equivalente | 150L; Implementa canonicalizacao compativel com `uucore::fs::canonicalize` sobre qualquer backend via trait `Resolver`, preservando r... |
| `crates/vfs/src/changes.rs` | codigo | omp-novo | sem equivalente | 257L; Implementa rastreamento de mudancas liquidas em arquivos de texto do host por escopo de comando ou guarda (`ChangeGuard`), comp... |
| `crates/vfs/src/dir.rs` | codigo | omp-novo | sem equivalente | 233L; Define iteradores `ReadDir` e entradas `DirEntry` unificando `std::fs::ReadDir`/`DirEntry` nativos (sem alocacao extra) e entra... |
| `crates/vfs/src/error.rs` | codigo | omp-novo | sem equivalente | 186L; Mapeia erros canonicos de I/O entre backends virtuais e codigos OS nativos (`ECANCELED`/`ERROR_CANCELLED` em vez de `Interrupte... |
| `crates/vfs/src/file.rs` | codigo | omp-novo | sem equivalente | 1047L; Define `FileHandle` e `File` (nativo ou virtual compartilhado via `Arc`), incluindo sondagem de prontidao cancelavel para socke... |
| `crates/vfs/src/fs.rs` | codigo | omp-novo | sem equivalente | 2105L; Define as fachadas `Fs` e `BlockingFs`, roteamento de caminhos (overlays montados, host nativo ou provider), `creation_mask` (u... |
| `crates/vfs/src/lib.rs` | codigo | omp-novo | sem equivalente | 74L; Ponto de entrada da crate `omp_vfs`, documentando o contrato de threading/URLs e re-exportando a API publica de fachadas, camin... |
| `crates/vfs/src/metadata.rs` | codigo | omp-novo | sem equivalente | 470L; Abstrai metadados de arquivos nativos e virtuais com construtores `with_*`, preservando identidade por handle no Windows (`Hand... |
| `crates/vfs/src/native/mod.rs` | codigo | omp-novo | sem equivalente | 121L; Camada sincrona para operacoes nativas no host (despachando para `unix` ou `windows`) e `NativeResolver` para canonicalizacao d... |
| `crates/vfs/src/native/unix.rs` | codigo | omp-novo | sem equivalente | 378L; Implementacoes nativas Unix usando syscalls (`utimensat`, `futimens`, `access`, `fcntl(F_GETLK)`, `close`, `mkfifo`, `mknod`, `... |
| `crates/vfs/src/native/windows.rs` | codigo | omp-novo | sem equivalente | 403L; Implementacoes nativas Windows via `windows-sys`, incluindo probe de `access` com `PATHEXT`, leitura atomica de metadados+ident... |
| `crates/vfs/src/options.rs` | codigo | omp-novo | sem equivalente | 276L; Estruturas de opcoes estilo `std` (`OpenOptions` com conversao Unix/Windows, `DirOptions`, `CanonicalizeOptions`, `TempOptions`... |
| `crates/vfs/src/path.rs` | codigo | omp-novo | sem equivalente | 601L; Helpers lexicos cientes de URLs (`scheme://`) e drives Windows/MSYS, com percent-encoding/decoding de segmentos, resolucao driv... |
| `crates/vfs/src/provider.rs` | codigo | omp-novo | sem equivalente | 320L; Define a trait assincrona `FileSystem` para backends plugaveis, exigindo apenas `open`/`metadata`/`read_dir` e fornecendo imple... |
| `crates/vfs/src/runtime.rs` | codigo | omp-novo | sem equivalente | 203L; Ponte entre codigo sincrono e futures de providers (`block_in_place`/`park_on`), offload `spawn_blocking` para I/O host cancela... |
| `crates/vfs/src/tests.rs` | codigo | omp-novo | sem equivalente | 960L; Suite de testes com provider em memoria `MemFs` cobrindo helpers de URL, compartilhamento de offset, fechamento em background, ... |
| `crates/vfs/src/types.rs` | codigo | omp-novo | sem equivalente | 347L; Tipos de valor compartilhados pelo VFS (`FileKind`, `FileType` preservando tipo nativo e bits `S_IFMT`, `Permissions`, `FileId`... |
