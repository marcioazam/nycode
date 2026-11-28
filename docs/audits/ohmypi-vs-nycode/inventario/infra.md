# Inventario: infra

Cada linha cobre 1 arquivo rastreado em `~/source/oh-my-pi-ref` (`git ls-files`), com categoria, origem em relação ao Pi `v0.9.4`, dono equivalente no `nycode` (ou `sem equivalente`) e nota resumida verificada nos shards. Regras e totais em [../inventario.md](../inventario.md).

| Arquivo | Categoria | Origem | Dono no nycode | Nota |
|---|---|---|---|---|
| `infra/docs/01-vmon-runners.md` | doc | omp-novo | sem equivalente | 94L; Documenta o uso dos runners `vmon` (vibemon) no CI: labels `runs-on`, mapeamento de jobs por evento, setup do GitHub App, limit... |
| `infra/docs/02-omp-ci-template.md` | doc | omp-novo | sem equivalente | 60L; Documenta o conteúdo da imagem/template `omp-ci` no vmon (ferramentas apt/CLI, bun, rustup, caches pré-aquecidos de bun/cargo/B... |
| `infra/docs/03-caching.md` | doc | omp-novo | sem equivalente | 43L; Documenta a arquitetura de cache do CI no vmon (template `omp-ci`, cache de Actions no nó e cache HTTP Bazel `cache-rw`/`cache-... |
| `infra/docs/README.md` | doc | omp-novo | sem equivalente | 63L; Visão geral da infraestrutura de CI auto-hospedada no `vibemon` (vmon), com diagrama de arquitetura, ciclo de vida ponta a pont... |
| `infra/vmon/omp_ci_template.py` | codigo | omp-novo | sem equivalente | 335L; Script Python (PEP 723 / `e2b` SDK) que constrói e publica o snapshot de microVM `omp-ci`, instalando toolchains (clang/llvm, s... |
