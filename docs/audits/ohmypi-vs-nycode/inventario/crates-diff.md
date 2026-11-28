# Inventario: crates-diff

Cada linha cobre 1 arquivo rastreado em `~/source/oh-my-pi-ref` (`git ls-files`), com categoria, origem em relação ao Pi `v0.9.4`, dono equivalente no `nycode` (ou `sem equivalente`) e nota resumida verificada nos shards. Regras e totais em [../inventario.md](../inventario.md).

| Arquivo | Categoria | Origem | Dono no nycode | Nota |
|---|---|---|---|---|
| `crates/diff/BUILD.bazel` | codigo | omp-novo | `packages/coding-agent/src/core/tools/edit-diff.ts` | 26L; Configuração Bazel da biblioteca e suíte de testes do crate `omp_diff`. |
| `crates/diff/Cargo.toml` | config_ou_dado | omp-novo | `packages/coding-agent/src/core/tools/edit-diff.ts` | 14L; Manifesto Cargo do crate `omp-diff` com dependência em `xutf`. |
| `crates/diff/src/lib.rs` | codigo | omp-novo | `packages/coding-agent/src/core/tools/edit-diff.ts` | 1192L; Implementação nativa em Rust do algoritmo Myers O(ND) compatível com jsdiff v9 (tie-breaking e coalescing), incluindo arena rec... |
