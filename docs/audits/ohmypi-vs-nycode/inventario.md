# Inventário completo `oh-my-pi` (`omp v19.2.1`) -> `nycode`

Cobertura de **100%** dos **11788** arquivos rastreados por `git -C ~/source/oh-my-pi-ref ls-files` (`b55cd1bb664d8ab46ddc77f2a34eb47555dbf1ac`), mapeados para seus equivalentes no `nycode` (`00fed2ae`) ou `sem equivalente`, e cruzados com a leitura cega linha-a-linha em [cobertura-100.md](cobertura-100.md).

## Método e reconciliação de escopo

- **Universo total (`git ls-files`)**: **11.788** arquivos (4.812.123 linhas brutas).
- **Lidos 100% linha a linha em LLM shards**: **11.484** arquivos (**3.756.519** linhas) nos buckets legíveis (`codigo` 5660, `prompt` 415, `teste` 4710, `doc` 382, `config_ou_dado` 317).
- **Inventariados e excluídos de leitura LLM**: **304** arquivos (`vendor` 182, `gerado`/lockfile 31, `binario` + `vocab_ou_fonte` 91).
- **Com dono equivalente no `nycode`**: **9571**; `sem equivalente`: **2217**.

Comando de reconciliação (ambos devem resultar em `11788`):

```bash
git -C ~/source/oh-my-pi-ref ls-files | wc -l
cat docs/audits/ohmypi-vs-nycode/inventario/*.md | grep -c '^| `'
```

## Inventário por grupo

| Grupo | Total | Código | Prompt | Teste | Doc/Config | Excluídos (v/g/b) | Sem eq. | `omp`-novo | Pi 0.9.4 mod. | Detalhe |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| assets | 13 | 0 | 0 | 0 | 1 | 12 | 13 | 13 | 0 | [inventario/assets.md](inventario/assets.md) |
| bazel | 27 | 21 | 0 | 0 | 6 | 0 | 27 | 27 | 0 | [inventario/bazel.md](inventario/bazel.md) |
| crates-ast | 18 | 16 | 0 | 0 | 1 | 1 | 18 | 18 | 0 | [inventario/crates-ast.md](inventario/crates-ast.md) |
| crates-builtins | 383 | 331 | 0 | 34 | 13 | 5 | 0 | 383 | 0 | [inventario/crates-builtins.md](inventario/crates-builtins.md) |
| crates-diff | 3 | 2 | 0 | 0 | 1 | 0 | 0 | 3 | 0 | [inventario/crates-diff.md](inventario/crates-diff.md) |
| crates-edit | 171 | 42 | 5 | 123 | 1 | 0 | 0 | 171 | 0 | [inventario/crates-edit.md](inventario/crates-edit.md) |
| crates-iso | 15 | 14 | 0 | 0 | 1 | 0 | 15 | 15 | 0 | [inventario/crates-iso.md](inventario/crates-iso.md) |
| crates-natives | 324 | 274 | 0 | 17 | 5 | 28 | 190 | 324 | 0 | [inventario/crates-natives.md](inventario/crates-natives.md) |
| crates-predict | 27 | 24 | 0 | 0 | 2 | 1 | 27 | 27 | 0 | [inventario/crates-predict.md](inventario/crates-predict.md) |
| crates-shell | 984 | 481 | 0 | 390 | 104 | 9 | 0 | 984 | 0 | [inventario/crates-shell.md](inventario/crates-shell.md) |
| crates-vcs | 16 | 14 | 0 | 1 | 1 | 0 | 0 | 16 | 0 | [inventario/crates-vcs.md](inventario/crates-vcs.md) |
| crates-vendor | 182 | 0 | 0 | 0 | 0 | 182 | 182 | 182 | 0 | [inventario/crates-vendor.md](inventario/crates-vendor.md) |
| crates-vfs | 19 | 18 | 0 | 0 | 1 | 0 | 19 | 19 | 0 | [inventario/crates-vfs.md](inventario/crates-vfs.md) |
| crates-voice | 11 | 10 | 0 | 0 | 1 | 0 | 11 | 11 | 0 | [inventario/crates-voice.md](inventario/crates-voice.md) |
| crates-xfs | 48 | 47 | 0 | 0 | 1 | 0 | 48 | 48 | 0 | [inventario/crates-xfs.md](inventario/crates-xfs.md) |
| docs | 142 | 3 | 0 | 0 | 139 | 0 | 0 | 142 | 0 | [inventario/docs.md](inventario/docs.md) |
| dot-github | 14 | 0 | 0 | 0 | 14 | 0 | 10 | 14 | 0 | [inventario/dot-github.md](inventario/dot-github.md) |
| dot-omp | 15 | 0 | 0 | 1 | 13 | 1 | 0 | 15 | 0 | [inventario/dot-omp.md](inventario/dot-omp.md) |
| infra | 5 | 1 | 0 | 0 | 4 | 0 | 5 | 5 | 0 | [inventario/infra.md](inventario/infra.md) |
| nix | 7 | 7 | 0 | 0 | 0 | 0 | 7 | 7 | 0 | [inventario/nix.md](inventario/nix.md) |
| packages-agent | 118 | 38 | 16 | 59 | 5 | 0 | 5 | 113 | 5 | [inventario/packages-agent.md](inventario/packages-agent.md) |
| packages-ai | 1110 | 450 | 10 | 613 | 36 | 1 | 283 | 1090 | 19 | [inventario/packages-ai.md](inventario/packages-ai.md) |
| packages-browser-relay | 86 | 62 | 0 | 10 | 8 | 6 | 86 | 86 | 0 | [inventario/packages-browser-relay.md](inventario/packages-browser-relay.md) |
| packages-catalog | 562 | 384 | 0 | 170 | 8 | 0 | 0 | 562 | 0 | [inventario/packages-catalog.md](inventario/packages-catalog.md) |
| packages-coding-agent-outros | 2632 | 61 | 0 | 2548 | 21 | 2 | 0 | 2628 | 4 | [inventario/packages-coding-agent-outros.md](inventario/packages-coding-agent-outros.md) |
| packages-coding-agent-src | 2798 | 2370 | 324 | 26 | 75 | 3 | 840 | 2791 | 7 | [inventario/packages-coding-agent-src.md](inventario/packages-coding-agent-src.md) |
| packages-collab-web | 107 | 70 | 0 | 13 | 15 | 9 | 107 | 107 | 0 | [inventario/packages-collab-web.md](inventario/packages-collab-web.md) |
| packages-metaharness | 292 | 119 | 9 | 55 | 108 | 1 | 0 | 292 | 0 | [inventario/packages-metaharness.md](inventario/packages-metaharness.md) |
| packages-mnemopi | 157 | 68 | 0 | 84 | 5 | 0 | 0 | 157 | 0 | [inventario/packages-mnemopi.md](inventario/packages-mnemopi.md) |
| packages-natives | 67 | 16 | 0 | 35 | 6 | 10 | 63 | 67 | 0 | [inventario/packages-natives.md](inventario/packages-natives.md) |
| packages-omptype | 276 | 22 | 0 | 248 | 6 | 0 | 0 | 276 | 0 | [inventario/packages-omptype.md](inventario/packages-omptype.md) |
| packages-snapcompact | 119 | 84 | 29 | 1 | 5 | 0 | 0 | 119 | 0 | [inventario/packages-snapcompact.md](inventario/packages-snapcompact.md) |
| packages-stats | 175 | 107 | 0 | 44 | 20 | 4 | 0 | 175 | 0 | [inventario/packages-stats.md](inventario/packages-stats.md) |
| packages-tsconfig.workspace.json | 1 | 0 | 0 | 0 | 1 | 0 | 1 | 1 | 0 | [inventario/packages-tsconfig.workspace.json.md](inventario/packages-tsconfig.workspace.json.md) |
| packages-tui | 232 | 162 | 0 | 60 | 10 | 0 | 0 | 229 | 3 | [inventario/packages-tui.md](inventario/packages-tui.md) |
| packages-typescript-edit-benchmark | 19 | 9 | 3 | 2 | 3 | 2 | 0 | 19 | 0 | [inventario/packages-typescript-edit-benchmark.md](inventario/packages-typescript-edit-benchmark.md) |
| packages-utils | 295 | 153 | 0 | 134 | 5 | 3 | 42 | 295 | 0 | [inventario/packages-utils.md](inventario/packages-utils.md) |
| packages-wire | 12 | 7 | 0 | 0 | 5 | 0 | 0 | 12 | 0 | [inventario/packages-wire.md](inventario/packages-wire.md) |
| python-robomp | 135 | 68 | 19 | 33 | 12 | 3 | 135 | 135 | 0 | [inventario/python-robomp.md](inventario/python-robomp.md) |
| raiz | 40 | 8 | 0 | 0 | 28 | 4 | 31 | 40 | 0 | [inventario/raiz.md](inventario/raiz.md) |
| scripts | 79 | 61 | 0 | 1 | 3 | 14 | 0 | 79 | 0 | [inventario/scripts.md](inventario/scripts.md) |
| sdk-go | 19 | 18 | 0 | 0 | 1 | 0 | 19 | 19 | 0 | [inventario/sdk-go.md](inventario/sdk-go.md) |
| sdk-python | 18 | 10 | 0 | 5 | 2 | 1 | 18 | 18 | 0 | [inventario/sdk-python.md](inventario/sdk-python.md) |
| sdk-rust | 14 | 8 | 0 | 3 | 2 | 1 | 14 | 14 | 0 | [inventario/sdk-rust.md](inventario/sdk-rust.md) |
| types | 1 | 0 | 0 | 0 | 0 | 1 | 1 | 1 | 0 | [inventario/types.md](inventario/types.md) |
| **total** | **11788** | **5660** | **415** | **4710** | **699** | **304** | **2217** | **11749** | **38** | |
