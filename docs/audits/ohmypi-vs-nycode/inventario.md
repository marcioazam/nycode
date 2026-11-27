# Inventário oh-my-pi (omp v19.2.1) -> nycode

Cada arquivo de código e prompt do oh-my-pi `v19.2.1` (`b55cd1bb664d8ab46ddc77f2a34eb47555dbf1ac`) tem uma linha nos arquivos `inventario/<grupo>.md`, com categoria, origem em relação ao ancestral comum Pi `v0.9.4` (`15d5120b6a5dc757355b99d20d8d1885143d0865`) e dono equivalente no nycode (`00fed2ae615016b328ebfb48bfaa49814bf1dbc4`) ou `sem equivalente`.

## Método

- **Universo**: `git -C ~/source/oh-my-pi-ref ls-files` filtrado pela regex estendida de extensões de código e prompts:
  ```regex
  \.(ts|tsx|js|jsx|mjs|cjs|mts|cts|rs|go|py|sh|swift|kt|java|zig|c|h|cpp|lua|luau|nix|bash|ps1|astro|svelte|vue|scm|sql|kdl|proto|bzl|bazel|m|pl|pm|jl|applescript|jq|lark|zsh|hbs)$|/prompts/.*\.md$|^packages/coding-agent/scripts/omp$
  ```
  Documentação geral em Markdown fora de `/prompts/`, dados `.json`/`.toml` e mídia ficam fora do universo.
- **Categorias**:
  - `vendor`: caminho contendo `/vendor/` (ex.: `crates/vendor/*`, 148 arquivos; listados mas excluídos da análise).
  - `gerado`: `*.generated.*`, `*.gen.*`, `/generated/`, `*.d.ts` (21 arquivos; listados mas excluídos da análise).
  - `teste`: caminhos com `test/`, `tests/`, `fixtures/`, `gallery-fixtures/`, `bench/`, `benches/`, `*.test.*`, `*.spec.*`, `*-bench.*`, `*.bench.*` (4.076 arquivos).
  - `prompt`: `/prompts/*.md` (415 arquivos).
  - `codigo`: restante (5.587 arquivos).
- **Origem (vs Pi `v0.9.4`)**: o omp mantém a história do `pi-mono`, com `merge-base` exato em `15d5120b6a5dc757355b99d20d8d1885143d0865` (`v0.9.4`, 2025-11-27; 41.657 commits antes da `v19.2.1`). Como o omp reestruturou pacotes e caminhos ao longo de ~1 ano, a comparação por caminho exato marca apenas 29 arquivos como `pi0.9.4-modificado` e 0 como `pi0.9.4-igual`, subestimando o que veio do Pi; para evidenciar recursos que também chegaram ao Pi depois, a coluna **Nota** acrescenta `existe no Pi 073b0ba` quando o mesmo caminho existe na base do nycode (`earendil-works/pi@073b0ba`).
- **Dono no nycode**: regras determinísticas por prefixo/submódulo em `scratch/inventario.py` (com mapeamento específico dos 65 submódulos de `omp:crates/natives/src/*`), validadas contra a árvore real do worktree `~/source/nycode-audit-ohmypi`. Dono indica módulo responsável pela mesma área, não paridade funcional; diferenças concretas ficam em [matriz.md](matriz.md) e `achados/`.

## Contagem e verificação

Total: **10.247** arquivos (`codigo` 5.587, `prompt` 415, `teste` 4.076, `gerado` 21, `vendor` 148).
Com dono no nycode: **8.318**; `sem equivalente`: **1.929**.

Comando de verificação (os dois números devem ser iguais: `10247`):

```bash
git -C ~/source/oh-my-pi-ref ls-files | grep -cE '\.(ts|tsx|js|jsx|mjs|cjs|mts|cts|rs|go|py|sh|swift|kt|java|zig|c|h|cpp|lua|luau|nix|bash|ps1|astro|svelte|vue|scm|sql|kdl|proto|bzl|bazel|m|pl|pm|jl|applescript|jq|lark|zsh|hbs)$|/prompts/.*\.md$|^packages/coding-agent/scripts/omp$'
cat docs/audits/ohmypi-vs-nycode/inventario/*.md | grep -c '^| `'
```

| Grupo | Total | código | prompt | teste | gerado | vendor | Sem eq. | omp-novo | pi0.9.4-mod | pi0.9.4-ig | Detalhe |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| bazel | 20 | 20 | 0 | 0 | 0 | 0 | 20 | 20 | 0 | 0 | [inventario/bazel.md](inventario/bazel.md) |
| crates-ast | 15 | 15 | 0 | 0 | 0 | 0 | 15 | 15 | 0 | 0 | [inventario/crates-ast.md](inventario/crates-ast.md) |
| crates-builtins | 329 | 328 | 0 | 1 | 0 | 0 | 0 | 329 | 0 | 0 | [inventario/crates-builtins.md](inventario/crates-builtins.md) |
| crates-diff | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | [inventario/crates-diff.md](inventario/crates-diff.md) |
| crates-edit | 63 | 42 | 5 | 16 | 0 | 0 | 0 | 63 | 0 | 0 | [inventario/crates-edit.md](inventario/crates-edit.md) |
| crates-iso | 13 | 13 | 0 | 0 | 0 | 0 | 13 | 13 | 0 | 0 | [inventario/crates-iso.md](inventario/crates-iso.md) |
| crates-natives | 249 | 241 | 0 | 8 | 0 | 0 | 143 | 249 | 0 | 0 | [inventario/crates-natives.md](inventario/crates-natives.md) |
| crates-predict | 24 | 24 | 0 | 0 | 0 | 0 | 24 | 24 | 0 | 0 | [inventario/crates-predict.md](inventario/crates-predict.md) |
| crates-shell | 604 | 479 | 0 | 125 | 0 | 0 | 0 | 604 | 0 | 0 | [inventario/crates-shell.md](inventario/crates-shell.md) |
| crates-vcs | 15 | 14 | 0 | 1 | 0 | 0 | 0 | 15 | 0 | 0 | [inventario/crates-vcs.md](inventario/crates-vcs.md) |
| crates-vendor | 148 | 0 | 0 | 0 | 0 | 148 | 148 | 148 | 0 | 0 | [inventario/crates-vendor.md](inventario/crates-vendor.md) |
| crates-vfs | 18 | 18 | 0 | 0 | 0 | 0 | 18 | 18 | 0 | 0 | [inventario/crates-vfs.md](inventario/crates-vfs.md) |
| crates-voice | 9 | 9 | 0 | 0 | 0 | 0 | 9 | 9 | 0 | 0 | [inventario/crates-voice.md](inventario/crates-voice.md) |
| crates-xfs | 46 | 46 | 0 | 0 | 0 | 0 | 46 | 46 | 0 | 0 | [inventario/crates-xfs.md](inventario/crates-xfs.md) |
| docs | 3 | 3 | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | [inventario/docs.md](inventario/docs.md) |
| dot-omp | 4 | 3 | 0 | 1 | 0 | 0 | 0 | 4 | 0 | 0 | [inventario/dot-omp.md](inventario/dot-omp.md) |
| infra | 1 | 1 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 0 | [inventario/infra.md](inventario/infra.md) |
| nix | 7 | 7 | 0 | 0 | 0 | 0 | 7 | 7 | 0 | 0 | [inventario/nix.md](inventario/nix.md) |
| packages-agent | 112 | 37 | 16 | 59 | 0 | 0 | 5 | 108 | 4 | 0 | [inventario/packages-agent.md](inventario/packages-agent.md) |
| packages-ai | 1069 | 449 | 10 | 610 | 0 | 0 | 261 | 1053 | 16 | 0 | [inventario/packages-ai.md](inventario/packages-ai.md) |
| packages-browser-relay | 74 | 62 | 0 | 10 | 2 | 0 | 74 | 74 | 0 | 0 | [inventario/packages-browser-relay.md](inventario/packages-browser-relay.md) |
| packages-catalog | 553 | 383 | 0 | 170 | 0 | 0 | 0 | 553 | 0 | 0 | [inventario/packages-catalog.md](inventario/packages-catalog.md) |
| packages-coding-agent-outros | 2565 | 59 | 0 | 2506 | 0 | 0 | 0 | 2564 | 1 | 0 | [inventario/packages-coding-agent-outros.md](inventario/packages-coding-agent-outros.md) |
| packages-coding-agent-src | 2721 | 2369 | 324 | 26 | 2 | 0 | 804 | 2714 | 7 | 0 | [inventario/packages-coding-agent-src.md](inventario/packages-coding-agent-src.md) |
| packages-collab-web | 83 | 69 | 0 | 13 | 1 | 0 | 83 | 83 | 0 | 0 | [inventario/packages-collab-web.md](inventario/packages-collab-web.md) |
| packages-metaharness | 183 | 119 | 9 | 54 | 1 | 0 | 0 | 183 | 0 | 0 | [inventario/packages-metaharness.md](inventario/packages-metaharness.md) |
| packages-mnemopi | 150 | 67 | 0 | 83 | 0 | 0 | 0 | 150 | 0 | 0 | [inventario/packages-mnemopi.md](inventario/packages-mnemopi.md) |
| packages-natives | 60 | 15 | 0 | 35 | 10 | 0 | 56 | 60 | 0 | 0 | [inventario/packages-natives.md](inventario/packages-natives.md) |
| packages-omptype | 116 | 21 | 0 | 95 | 0 | 0 | 0 | 116 | 0 | 0 | [inventario/packages-omptype.md](inventario/packages-omptype.md) |
| packages-snapcompact | 112 | 82 | 29 | 1 | 0 | 0 | 0 | 112 | 0 | 0 | [inventario/packages-snapcompact.md](inventario/packages-snapcompact.md) |
| packages-stats | 152 | 106 | 0 | 44 | 2 | 0 | 0 | 152 | 0 | 0 | [inventario/packages-stats.md](inventario/packages-stats.md) |
| packages-tui | 221 | 161 | 0 | 60 | 0 | 0 | 0 | 220 | 1 | 0 | [inventario/packages-tui.md](inventario/packages-tui.md) |
| packages-typescript-edit-benchmark | 15 | 9 | 3 | 2 | 1 | 0 | 0 | 15 | 0 | 0 | [inventario/packages-typescript-edit-benchmark.md](inventario/packages-typescript-edit-benchmark.md) |
| packages-utils | 267 | 152 | 0 | 115 | 0 | 0 | 42 | 267 | 0 | 0 | [inventario/packages-utils.md](inventario/packages-utils.md) |
| packages-wire | 6 | 6 | 0 | 0 | 0 | 0 | 0 | 6 | 0 | 0 | [inventario/packages-wire.md](inventario/packages-wire.md) |
| python-robomp | 116 | 64 | 19 | 32 | 1 | 0 | 116 | 116 | 0 | 0 | [inventario/python-robomp.md](inventario/python-robomp.md) |
| raiz | 3 | 3 | 0 | 0 | 0 | 0 | 3 | 3 | 0 | 0 | [inventario/raiz.md](inventario/raiz.md) |
| scripts | 58 | 57 | 0 | 1 | 0 | 0 | 0 | 58 | 0 | 0 | [inventario/scripts.md](inventario/scripts.md) |
| sdk-go | 17 | 17 | 0 | 0 | 0 | 0 | 17 | 17 | 0 | 0 | [inventario/sdk-go.md](inventario/sdk-go.md) |
| sdk-python | 13 | 8 | 0 | 5 | 0 | 0 | 13 | 13 | 0 | 0 | [inventario/sdk-python.md](inventario/sdk-python.md) |
| sdk-rust | 10 | 7 | 0 | 3 | 0 | 0 | 10 | 10 | 0 | 0 | [inventario/sdk-rust.md](inventario/sdk-rust.md) |
| types | 1 | 0 | 0 | 0 | 1 | 0 | 1 | 1 | 0 | 0 | [inventario/types.md](inventario/types.md) |
| **total** | **10247** | **5587** | **415** | **4076** | **21** | **148** | **1929** | **10218** | **29** | **0** | |
