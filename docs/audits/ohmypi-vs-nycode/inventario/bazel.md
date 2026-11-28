# Inventario: bazel

Cada linha cobre 1 arquivo rastreado em `~/source/oh-my-pi-ref` (`git ls-files`), com categoria, origem em relação ao Pi `v0.9.4`, dono equivalente no `nycode` (ou `sem equivalente`) e nota resumida verificada nos shards. Regras e totais em [../inventario.md](../inventario.md).

| Arquivo | Categoria | Origem | Dono no nycode | Nota |
|---|---|---|---|---|
| `bazel/BUILD.bazel` | codigo | omp-novo | sem equivalente | 10L; Declara o pacote Bazel `//bazel` e o `config_setting` `fastbuild` para espelhar overrides de perfil dev. |
| `bazel/clippy.bazelrc` | codigo | omp-novo | sem equivalente | 59L; Arquivo gerado a partir do `Cargo.toml` com flags de `clippy-strict` para o aspect do `rules_rust`. |
| `bazel/defs.bzl` | codigo | omp-novo | sem equivalente | 96L; Regra e transição Bazel `native_addon` que compila `//crates/natives:pi_natives` em modo release/opt com thin LTO, aplica link ... |
| `bazel/lints/BUILD.bazel` | codigo | omp-novo | sem equivalente | 69L; Configuração `rust_lint_config` gerada a partir do `Cargo.toml` para aplicar lints do workspace via aspect Bazel. |
| `bazel/patches/BUILD.bazel` | codigo | omp-novo | sem equivalente | 2L; Exporta arquivos `.patch` aplicados sobre módulos Bazel externos. |
| `bazel/patches/hermetic_cc_toolchain-authoritative-target.patch` | config_ou_dado | omp-novo | sem equivalente | 47L; Patch no wrapper Zig que remove `-Wl,-O1` e evita passar `-target <zig-triple>` em chamadas isoladas `--version` (onde o Clang ... |
| `bazel/patches/hermetic_cc_toolchain-drop-cortex-a53-link-arg.patch` | config_ou_dado | omp-novo | sem equivalente | 31L; Patch no wrapper Zig que remove flags de errata cortex-a53 inseridas pelo rustc em Linux aarch64 e rejeitadas pelo `zig cc`. |
| `bazel/patches/hermetic_cc_toolchain-isolated-compile-cache.patch` | config_ou_dado | omp-novo | sem equivalente | 74L; Patch que isola o cache do Zig em invocações `-c`/`-E`/`-S` (contornando corrupção concorrente ziglang/zig#18763) e marca `@zig... |
| `bazel/patches/opusic-sys-install-libdir.patch` | config_ou_dado | omp-novo | sem equivalente | 23L; Patch no `opusic-sys` removendo a busca em `lib64` condicionada ao host Linux, evitando warnings em cross-compilação. |
| `bazel/patches/rules_rust-dep-env-exec-root-paths.patch` | config_ou_dado | omp-novo | sem equivalente | 22L; Patch no runner de build scripts do `rules_rust` preservando caminhos relativos ao exec_root nas variáveis `DEP_<links>_*` em v... |
| `bazel/platforms/BUILD.bazel` | codigo | omp-novo | sem equivalente | 70L; Define as 9 plataformas Bazel de destino para os addons nativos, herdando restrições libc do Zig (glibc 2.17 / musl) e variante... |
| `bazel/toolchains/BUILD.bazel` | codigo | omp-novo | sem equivalente | 155L; Registra wrappers de toolchains Rust para musl com restrição `@zig_sdk//libc:musl`, toolchains cross MSVC, toolchains cross Dar... |
| `bazel/toolchains/darwin/BUILD.bazel` | codigo | omp-novo | sem equivalente | 26L; Expõe `rustc_sdk_env` e `extract_pkg.py` para fornecer `SDKROOT` hermeticamente a ações de link Rust no Linux sem afetar builds... |
| `bazel/toolchains/darwin/cc.bzl` | codigo | omp-novo | sem equivalente | 245L; Regra de repositório que gera wrappers `clang`/`clang++`/`ar` (despachando `llvm-libtool-darwin` vs `llvm-ar`) e `cc_toolchain`... |
| `bazel/toolchains/darwin/extract_pkg.py` | codigo | omp-novo | sem equivalente | 167L; Extrator em Python stdlib puro que lê pacotes Apple `.pkg` (xar -> pbzx/xz -> cpio odc) em qualquer host Linux e descarta symli... |
| `bazel/toolchains/darwin/sdk.bzl` | codigo | omp-novo | sem equivalente | 137L; Baixa o `CLTools_macOSNMOS_SDK.pkg` fixado por SHA-256 do CDN da Apple e extrai `MacOSX27.2.sdk` no Linux, injetando `SDKROOT=$... |
| `bazel/toolchains/llvm.bzl` | codigo | omp-novo | sem equivalente | 175L; Regras de repositório que baixam releases oficiais do LLVM (20.1.7 para MSVC e 23.1.3 para Darwin) e podam o diretório para man... |
| `bazel/toolchains/msvc/BUILD.bazel` | codigo | omp-novo | sem equivalente | 5L; Arquivo marcador do pacote Bazel do toolchain cross MSVC. |
| `bazel/toolchains/msvc/NOTES.md` | doc | omp-novo | sem equivalente | 162L; Documenta arquitetura, decisões de CRT estático `/MT`, flags SSE4.1/4.2, PDBs do xwin, shims de `ml64`/`clang` para `blake3`/`r... |
| `bazel/toolchains/msvc/cc.bzl` | codigo | omp-novo | sem equivalente | 367L; Gera wrappers `clang-cl`, `lld-link`, `llvm-lib`, `ml64`, shim GNU `clang` (para `ring` em arm64 traduzindo `/D` e flags MSVC),... |
| `bazel/toolchains/msvc/sysroot.bzl` | codigo | omp-novo | sem equivalente | 199L; Baixa `xwin` 0.6.5 e materializa o sysroot CRT/Windows SDK (`10.0.22621`) por arquitetura, mantendo PDBs para link estático e p... |
| `bazel/toolchains/swift/BUILD.bazel` | codigo | omp-novo | sem equivalente | 29L; Define o `toolchain_type` Swift e instancia os toolchains `host` (macOS) e `linux` (cross-compile) para a bridge Apple Foundati... |
| `bazel/toolchains/swift/applefm.bzl` | codigo | omp-novo | sem equivalente | 61L; Regra configure do Bazel que detecta o compilador Swift e SDK no macOS executando `build-bridge.sh detect` e registra watches p... |
| `bazel/toolchains/swift/defs.bzl` | codigo | omp-novo | sem equivalente | 85L; Define a regra `applefm_bridge` para compilar `bridge.swift` em dylib (ou gerar arquivo vazio quando não há toolchain Swift par... |
| `bazel/toolchains/swift/linux.bzl` | codigo | omp-novo | sem equivalente | 158L; Baixa e poda o Swift 6.4.0 Linux toolchain e cria um overlay `@swift_darwin_resources` apontando para os stubs Swift do `@macos... |
| `bazel/triples/BUILD.bazel` | codigo | omp-novo | sem equivalente | 107L; Define `config_setting`s por triple Rust para o `crate_universe`, separando Linux GNU (unconstrained ou glibc 2.17) de Linux mu... |
| `bazel/variants/BUILD.bazel` | codigo | omp-novo | sem equivalente | 26L; Define o eixo de restrição `cpu_variant` (`default`, `baseline` x86-64-v2, `modern` AVX2) usado para selecionar `-Ctarget-cpu` ... |
