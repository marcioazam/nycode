# Inventario: nix

Cada linha cobre 1 arquivo rastreado em `~/source/oh-my-pi-ref` (`git ls-files`), com categoria, origem em relação ao Pi `v0.9.4`, dono equivalente no `nycode` (ou `sem equivalente`) e nota resumida verificada nos shards. Regras e totais em [../inventario.md](../inventario.md).

| Arquivo | Categoria | Origem | Dono no nycode | Nota |
|---|---|---|---|---|
| `nix/bun-runtime.nix` | codigo | omp-novo | sem equivalente | 21L; Derivação Nix mínima que extrai o binário `bun` para `libexec/bun` a fim de servir como executável alvo de compilação (`BUN_COM... |
| `nix/bun.nix` | codigo | omp-novo | sem equivalente | 1789L; Arquivo autogerado pelo `bun2nix` (parte 1/3) listando pacotes npm e workspaces locais com URLs e hashes SHA-512 para builds of... |
| `nix/dev-shell.nix` | codigo | omp-novo | sem equivalente | 67L; Define o ambiente de desenvolvimento `nix develop` com Bun, `bun2nix`, toolchain Rust, ferramentas Python/TS, bibliotecas C/grá... |
| `nix/home-manager.nix` | codigo | omp-novo | sem equivalente | 62L; Módulo Home Manager para o OMP que instala o pacote e grava `~/.omp/agent/config.yml` como arquivo regular gravável via hook de... |
| `nix/native.nix` | codigo | omp-novo | sem equivalente | 243L; Derivação Crane em duas etapas para compilar `omp-natives`, preservando o cache de dependências (inclusive crates vendored reai... |
| `nix/nixos-module.nix` | codigo | omp-novo | sem equivalente | 26L; Módulo NixOS simples que expõe `programs.omp.enable` e `programs.omp.package`, adicionando o binário a `environment.systemPacka... |
| `nix/package.nix` | codigo | omp-novo | sem equivalente | 351L; Derivação Nix final do `omp`: embute o addon nativo estampado/patcheado (`rpath` de áudio/PipeWire no Linux, repointing de `lib... |
