# Inventario: crates-xfs

Cada linha cobre 1 arquivo rastreado em `~/source/oh-my-pi-ref` (`git ls-files`), com categoria, origem em relação ao Pi `v0.9.4`, dono equivalente no `nycode` (ou `sem equivalente`) e nota resumida verificada nos shards. Regras e totais em [../inventario.md](../inventario.md).

| Arquivo | Categoria | Origem | Dono no nycode | Nota |
|---|---|---|---|---|
| `crates/xfs/BUILD.bazel` | codigo | omp-novo | sem equivalente | 29L; Alvos Bazel (`rust_library` e `rust_test`) para a crate `omp_xfs`. |
| `crates/xfs/Cargo.toml` | config_ou_dado | omp-novo | sem equivalente | 50L; Manifesto Cargo de `omp-xfs` com dependências de busca/grep (`grep-searcher`, `grep-regex`, `grep-pcre2`, `memchr`, `xutf`, `om... |
| `crates/xfs/LICENSE` | codigo | omp-novo | sem equivalente | 22L; Licença MIT da crate `omp-xfs`. |
| `crates/xfs/examples/bench.rs` | codigo | omp-novo | sem equivalente | 175L; Harness de benchmark comparando modos `collect`, `parallel` e `tree` de travessia de diretórios do `omp-xfs`. |
| `crates/xfs/examples/search_bench.rs` | codigo | omp-novo | sem equivalente | 142L; Benchmark CLI para medir latência de `grep` e `glob` do `omp-xfs` (aquecimento + N execuções com mediana e mínimo). |
| `crates/xfs/src/exec.rs` | codigo | omp-novo | sem equivalente | 589L; Executor com pools fixos de workers (`ordered`) e transição adaptativa (`adaptive`) de execução inline para pool em chunks após... |
| `crates/xfs/src/fs/mod.rs` | codigo | omp-novo | sem equivalente | 740L; Abstração de filesystem (`Fs::Native` e `Fs::Provider`) com arena `Listing`, `Session` reutilizável para listagem/stat/abertura... |
| `crates/xfs/src/fs/mounts.rs` | codigo | omp-novo | sem equivalente | 467L; Leitura não-bloqueante da tabela de montagens (`getfsstat` `MNT_NOWAIT` no macOS e `/proc/self/mountinfo` no Linux com TTL de 1... |
| `crates/xfs/src/fs/native/darwin.rs` | codigo | omp-novo | sem equivalente | 310L; Fast-path macOS usando `__getdirentries64` com flag EOF em `Detail::Minimal`, `getattrlistbulk` com `ATTR_DIR_ENTRYCOUNT` em `D... |
| `crates/xfs/src/fs/native/linux.rs` | codigo | omp-novo | sem equivalente | 322L; Fast-path Linux usando `O_NOATIME` adaptativo, `getdents64` com detecção de fim via `d_off`, `statx` com `AT_STATX_DONT_SYNC` (... |
| `crates/xfs/src/fs/native/mod.rs` | codigo | omp-novo | sem equivalente | 68L; Roteamento de módulo nativo por SO (`darwin`, `linux`, `other`, `windows`) e utilitários de buffer alinhado a 8 bytes e leitura... |
| `crates/xfs/src/fs/native/other.rs` | codigo | omp-novo | sem equivalente | 128L; Fallback Unix portável baseado em `fdopendir`/`readdir` e `fstatat` por entrada, assumindo granularidade de 1s para timestamps. |
| `crates/xfs/src/fs/native/unix.rs` | codigo | omp-novo | sem equivalente | 208L; Camada Unix compartilhada de descritores: `openat` com `O_DIRECTORY\|O_NOFOLLOW`, abertura de arquivos com `O_NONBLOCK` + verifi... |
| `crates/xfs/src/fs/native/windows.rs` | codigo | omp-novo | sem equivalente | 536L; Fast-path Windows usando `NtCreateFile` relativo a `RootDirectory` (evitando `MAX_PATH` e reparse points), `NtQueryDirectoryFil... |
| `crates/xfs/src/fs/provider.rs` | codigo | omp-novo | sem equivalente | 155L; Adaptador assíncrono de provedores `omp_vfs::Fs` para a camada `xfs::fs`, validando nomes de entrada contra separadores/compone... |
| `crates/xfs/src/fs/root.rs` | codigo | omp-novo | sem equivalente | 90L; Resolucao de diretorio raiz de busca: preserva URLs virtuais, resolve caminhos relativos contra cwd e canonicaliza atraves de o... |
| `crates/xfs/src/fs/tests.rs` | codigo | omp-novo | sem equivalente | 430L; Testes de integracao da camada fs (nativa e MemFs): listagem minima/completa, protecao contra troca de diretorio por symlink, r... |
| `crates/xfs/src/fs/wtf8.rs` | codigo | omp-novo | sem equivalente | 110L; Conversao bidirecional WTF-8 <-> UTF-16 para nomes Windows preservando surrogates nao pareados e mapeando '/' para '\\'. |
| `crates/xfs/src/glob.rs` | codigo | omp-novo | sem equivalente | 702L; Seletor e busca glob no dialeto do pi: normaliza '\\' e chaves nao fechadas, gera prefixo '**/' recursivo, poda subarvores/prof... |
| `crates/xfs/src/grep/engine.rs` | codigo | omp-novo | sem equivalente | 402L; Compilador dual de regex (Rust regex + PCRE2 com toggle OMP_PCRE2_JIT) e reparador de dialeto LLM (escape de chaves nao-quantif... |
| `crates/xfs/src/grep/mod.rs` | codigo | omp-novo | sem equivalente | 338L; API publica e tipos de busca de conteudo em memoria (search) e em filesystem/ovnfs (grep), incluindo modos Content/Count/FilesW... |
| `crates/xfs/src/grep/render.rs` | codigo | omp-novo | sem equivalente | 140L; Renderizacao de linhas encontradas e de contexto: trim de espacos, decodificacao UTF-8 lossy e janelamento centralizado no prim... |
| `crates/xfs/src/grep/run.rs` | codigo | omp-novo | sem equivalente | 1083L; Primeira parte do orquestrador de grep: filtros de caminho, busca em raiz de arquivo (com streaming acima de 4 MiB), logica de ... |
| `crates/xfs/src/grep/scan.rs` | codigo | omp-novo | sem equivalente | 511L; Scanner de buffer em memoria e adaptador de streaming grep-searcher: deteccao binaria nos primeiros 64 KiB e por linha NUL, blo... |
| `crates/xfs/src/grep/tests.rs` | codigo | omp-novo | sem equivalente | 1259L; Primeira parte dos testes de grep: paridade do Scanner com grep-searcher, janelamento de linhas longas, deteccao binaria/NUL, m... |
| `crates/xfs/src/grep/types.rs` | codigo | omp-novo | sem equivalente | 102L; Tabela de tipos de arquivo do grep (js, ts, rust, docker, etc.) com fallback para extensao ou nome exato case-insensitive. |
| `crates/xfs/src/ignore.rs` | codigo | omp-novo | sem equivalente | 897L; Primeira parte do motor gitignore: parser de regras, resolucao de .git file (gitdir/commondir), cadeia de frames por diretorio,... |
| `crates/xfs/src/ignore/tests.rs` | codigo | omp-novo | sem equivalente | 506L; Testes diferenciais contra o crate ignore, testes de precedencia entre fontes, worktrees/subrepositorios, ancestrais e .fdignor... |
| `crates/xfs/src/lib.rs` | codigo | omp-novo | sem equivalente | 60L; Raiz da crate omp_xfs documentando os modulos de filesystem, glob, grep, ignore, walk, watch e offload para ovnfs. |
| `crates/xfs/src/ovnfs.rs` | codigo | omp-novo | sem equivalente | 783L; Cliente do protocolo admin ovnfs sobre socket Unix (frames JSON u32 LE) para responder glob e grep direto do daemon de overlay ... |
| `crates/xfs/src/pattern.rs` | codigo | omp-novo | sem equivalente | 747L; Compilador e matcher de globs compativel com globset (separador literal): expansao de chaves (limite 256), classes de bytes, es... |
| `crates/xfs/src/pattern/tests.rs` | codigo | omp-novo | sem equivalente | 266L; Testes diferenciais contra globset, validacao de limites de alternancia, complexidade linear sob backtracking e invariancia de ... |
| `crates/xfs/src/testing.rs` | codigo | omp-novo | sem equivalente | 290L; Implementacao em memoria de omp_vfs::FileSystem (mem://) usada em testes, suportando arquivos, diretorios, symlinks com limite ... |
| `crates/xfs/src/walk/arena.rs` | codigo | omp-novo | sem equivalente | 166L; Arena append-only de chunks fixos de 32 KiB para caminhos alocados durante walks sem realocacao/invalidacao de ponteiros Bytes,... |
| `crates/xfs/src/walk/cache.rs` | codigo | omp-novo | sem equivalente | 237L; Cache global em memória com 64 shards (limite ~64 MiB) para listagens de diretórios em walks Minimal nativos, com validação de ... |
| `crates/xfs/src/walk/mod.rs` | codigo | omp-novo | sem equivalente | 675L; API pública e tipos centrais do walker de diretórios (`walk`, `collect`, `ordered`, `Tree`), controle de paralelismo, pool de s... |
| `crates/xfs/src/walk/parallel.rs` | codigo | omp-novo | sem equivalente | 1365L; Definições do motor paralelo em tokio: trait `Sink` para visitar e processar arquivos nos próprios workers, estado compartilhad... |
| `crates/xfs/src/walk/tests.rs` | codigo | omp-novo | sem equivalente | 1627L; Testes de integração do walker cobrindo poda, precedência de ignore (incluindo worktrees e submódulos), ordenação, estresse de ... |
| `crates/xfs/src/walk/tree.rs` | codigo | omp-novo | sem equivalente | 1201L; Travessia em profundidade sequencial e em streaming (`Tree`) orientada a eventos um a um, com `skip_dir`, `contents_first`, ord... |
| `crates/xfs/src/watch/batch.rs` | codigo | omp-novo | sem equivalente | 290L; Armazenamento contíguo de eventos de mudança em arena de bytes (`Batch`) e `Emitter` com filtragem e coalescimento por path via... |
| `crates/xfs/src/watch/flags.rs` | codigo | omp-novo | sem equivalente | 181L; Bitset `Flags` compatível com bits e nomes de `fswatch` (`Created`, `Updated`, `Removed`, `Renamed`, `Overflow`, `CloseWrite`, ... |
| `crates/xfs/src/watch/fsevents.rs` | codigo | omp-novo | sem equivalente | 552L; Backend macOS sobre `FSEventStream` com fila serial libdispatch, suporte opcional a eventos estendidos (`fileID`), canonicaliza... |
| `crates/xfs/src/watch/inotify.rs` | codigo | omp-novo | sem equivalente | 636L; Backend Linux `inotify` com `eventfd` de parada, vigilância de arquivos via diretório pai, adição recursiva dinâmica de novos s... |
| `crates/xfs/src/watch/kqueue.rs` | codigo | omp-novo | sem equivalente | 602L; Backend macOS `kqueue` por vnode (`EVFILT_VNODE`), mantendo descritores e snapshots ordenados de entradas por diretório para de... |
| `crates/xfs/src/watch/mod.rs` | codigo | omp-novo | sem equivalente | 378L; Fachada pública do sistema de file watching (`Watcher`, `Config`, `Root`, `Backend`) selecionando o backend nativo ou sob deman... |
| `crates/xfs/src/watch/poll.rs` | codigo | omp-novo | sem equivalente | 253L; Backend de fallback por polling periódico comparando `Stamp` completo (tipo, mtime, ctime, tamanho, permissões, dono, nlink) en... |
| `crates/xfs/src/watch/tests.rs` | codigo | omp-novo | sem equivalente | 381L; Testes de comportamento real dos backends de watch: raízes recursivas/flat, saves atômicos, rajadas com overflow, coalescimento... |
| `crates/xfs/src/watch/windows.rs` | codigo | omp-novo | sem equivalente | 568L; Implementa o watcher de sistema de arquivos para Windows usando `ReadDirectoryChangesW` com I/O sobreposto (`OVERLAPPED`), dois... |
