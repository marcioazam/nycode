# Inventario: raiz

Cada linha cobre 1 arquivo rastreado em `~/source/oh-my-pi-ref` (`git ls-files`), com categoria, origem em relação ao Pi `v0.9.4`, dono equivalente no `nycode` (ou `sem equivalente`) e nota resumida verificada nos shards. Regras e totais em [../inventario.md](../inventario.md).

| Arquivo | Categoria | Origem | Dono no nycode | Nota |
|---|---|---|---|---|
| `.bazelignore` | config_ou_dado | omp-novo | sem equivalente | 7L; Lista diretórios de TypeScript, Python, SDK, infra, docs e saídas locais ignorados pelo Bazel para manter o grafo focado apenas... |
| `.bazelrc` | config_ou_dado | omp-novo | sem equivalente | 117L; Configura o build Bazel para o addon N-API omp-natives: ambiente estrito, compartilhamento de índice cargo e timeout estendido,... |
| `.bazelversion` | config_ou_dado | omp-novo | sem equivalente | 1L; Fixa a versão do Bazelisk/Bazel em 9.2.0. |
| `.cargo/config.toml` | config_ou_dado | omp-novo | sem equivalente | 26L; Configuração do ambiente Cargo no workspace omp: força Ninja para CMake, PCRE2 estático, metadados apenas em `.rmeta` e `finger... |
| `.config/nextest.toml` | config_ou_dado | omp-novo | sem equivalente | 62L; Configuração do cargo-nextest definindo saída imediata+final, zero retries no CI, slow-timeout e serialização exclusiva (`num-t... |
| `.dockerignore` | config_ou_dado | omp-novo | sem equivalente | 82L; Filtro padrão de contexto Docker para smokes de instalação, excluindo artefatos pesados de build, worktrees de agentes, bancos ... |
| `.fallowrc.jsonc` | config_ou_dado | omp-novo | sem equivalente | 31L; Configura o analisador de código morto Fallow, declarando testes, benchmarks e scripts como entrypoints para evitar remoção de ... |
| `.gitattributes` | config_ou_dado | omp-novo | `.gitattributes` | mesmo caminho; 69L; Define regras de Git LFS para .wasm, normalização LF/CRLF por plataforma, merge=union para changelogs, marcação binária de JSON... |
| `.gitignore` | config_ou_dado | omp-novo | `.gitignore` | mesmo caminho; 102L; Lista arquivos e diretórios ignorados no repositório (builds, addons .node, bancos SQLite de sessão, worktrees paralelos, estad... |
| `.oxfmtrc.json` | config_ou_dado | omp-novo | sem equivalente | 29L; Configura formatação Oxfmt (tabs largura 3, 120 colunas, aspas duplas) e padrões ignorados (código gerado, extensões e adapters). |
| `.oxlintrc.json` | config_ou_dado | omp-novo | sem equivalente | 61L; Configura regras e exclusões do Oxlint (prefer-const como erro, avisos de correctness e variáveis não usadas com prefixo _). |
| `AGENTS.md` | doc | omp-novo | `AGENTS.md` | mesmo caminho; 347L; Manual de regras de desenvolvimento do omp: arquitetura de pacotes, convenções de Bun sobre Node, proibição de heurísticas de m... |
| `BUILD.bazel` | codigo | omp-novo | sem equivalente | 61L; Define os alvos Bazel de release `natives-<target>` e grupos `natives-all`/`natives-darwin-all` para compilar e renomear os add... |
| `CONTRIBUTING.md` | doc | omp-novo | `CONTRIBUTING.md` | mesmo caminho; 101L; Guia de contribuição exigindo discussão prévia no Discord para grandes mudanças, revisão humana de código assistido por IA, fra... |
| `Cargo.lock` | gerado | omp-novo | sem equivalente | 11403L; Lockfile ou artefato gerado automaticamente (excluido) |
| `Cargo.toml` | config_ou_dado | omp-novo | sem equivalente | 525L; Manifesto do workspace Rust (12 crates próprios e 7 vendored): explica patches em `grep-searcher`, `jaq-*`, `napi` e `tree-sitt... |
| `Dockerfile` | codigo | omp-novo | sem equivalente | 237L; Dockerfile multi-estágio que compila o addon Rust N-API, constrói a wheel Python `omp-rpc`, monta a imagem base com Bun, shim `... |
| `Dockerfile.dockerignore` | codigo | omp-novo | sem equivalente | 83L; Shadow `.dockerignore` específico do `Dockerfile` raiz para impedir vazamento de builds locais, `.node` do host, arquivos gerad... |
| `Dockerfile.robomp` | codigo | omp-novo | sem equivalente | 82L; Imagem do bot orquestrador `robomp` estendendo `pi-base`, compilando o painel SolidJS com Bun/Vite e empacotando o serviço Fast... |
| `Dockerfile.robomp.dockerignore` | codigo | omp-novo | sem equivalente | 99L; Shadow `.dockerignore` do `Dockerfile.robomp`, removendo também `crates/`, `sdk/`, `docs/` e `scripts/` já que o addon vem da i... |
| `LICENSE` | codigo | omp-novo | `LICENSE` | mesmo caminho; 23L; Texto da licença MIT do projeto omp (Mario Zechner, Can Bölük e Stencil Labs, Inc.). |
| `MODULE.bazel` | codigo | omp-novo | sem equivalente | 377L; Configuração Bzlmod completa do build hermético Rust/C/Swift: registra patches em `hermetic_cc_toolchain` e `rules_rust`, fixa ... |
| `MODULE.bazel.lock` | gerado | omp-novo | sem equivalente | 13995L; Lockfile ou artefato gerado automaticamente (excluido) |
| `README.md` | doc | omp-novo | `README.md` | mesmo caminho; 725L; Primeira parte do README principal apresentando instalação, completions dinâmicos, resultados de benchmark de edição (hashline)... |
| `README.zh-CN.md` | doc | omp-novo | sem equivalente | 710L; Tradução para chinês simplificado das linhas 1-556 do README.md. \| Tradução para chinês simplificado das linhas 557-710 do READ... |
| `about.toml` | config_ou_dado | omp-novo | sem equivalente | 34L; Política do `cargo-about` listando licenças aceitas e exceções revisadas por pacote (`inferno`, `terminfo`, `uluru`) para gerar... |
| `bun.lock` | gerado | omp-novo | sem equivalente | 1306L; Lockfile ou artefato gerado automaticamente (excluido) |
| `bunfig.toml` | config_ou_dado | omp-novo | sem equivalente | 41L; Configura Bun: quarentena de 3 dias (`minimumReleaseAge`) na instalação de pacotes, loaders de texto (`.md`, `.py`, `.lark`) e ... |
| `deny.toml` | config_ou_dado | omp-novo | sem equivalente | 53L; Política do `cargo-deny` bloqueando crates yanked, registros/git desconhecidos e restringindo licenças a uma lista permissiva c... |
| `flake.lock` | gerado | omp-novo | sem equivalente | 264L; Lockfile ou artefato gerado automaticamente (excluido) |
| `flake.nix` | codigo | omp-novo | sem equivalente | 205L; Flake Nix principal do OMP definindo pacotes, apps, devShell, checks (consistência de `bun.nix` e avaliação de módulos), overla... |
| `package.json` | config_ou_dado | omp-novo | `package.json` | mesmo caminho; 201L; Manifesto raiz do monorepo Bun definindo workspaces, catálogo de versões, `patchedDependencies`, `lint-staged` (oxlint/oxfmt) e... |
| `patches/@ark%2Fschema@0.56.2.patch` | config_ou_dado | omp-novo | sem equivalente | 26L; Patch no `@ark/schema` preservando a ordem declarada de chaves `required`/`optional` em vez de ordenar por hash, garantindo ord... |
| `patches/puppeteer-core@25.3.0.patch` | config_ou_dado | omp-novo | sem equivalente | 811L; Patch stealth e de concorrência no `puppeteer-core`: substitui `Runtime.enable` por resolução lazy pull-style de contextos, iso... |
| `rust-analyzer.toml` | config_ou_dado | omp-novo | sem equivalente | 5L; Configuração do `rust-analyzer` impondo granularidade de imports por crate, uso do prelude e prefixo `crate`. |
| `rust-toolchain.toml` | config_ou_dado | omp-novo | sem equivalente | 4L; Fixa o toolchain Rust (`nightly-2026-11-08`), componentes (`rustfmt`, `clippy`, `rust-analyzer`) e targets Linux/Windows MSVC. |
| `rustfmt.toml` | config_ou_dado | omp-novo | sem equivalente | 74L; Regras de formatação do `rustfmt` para Rust 2024 (tabs com largura 3, largura máxima 100, agrupamento `StdExternalCrate` e excl... |
| `tsconfig.base.json` | config_ou_dado | omp-novo | `tsconfig.base.json` | mesmo caminho; 22L; Configuração TypeScript base do OMP com `target: ES2024`, `moduleResolution: Bundler`, `strict: true`, `noEmit: true`, `verbati... |
| `tsconfig.json` | config_ou_dado | omp-novo | `tsconfig.json` | mesmo caminho; 10L; Arquivo raiz de TypeScript usando Project References para `packages/tsconfig.workspace.json` e `tsconfig.tools.json`. |
| `tsconfig.tools.json` | config_ou_dado | omp-novo | sem equivalente | 11L; Configuração TypeScript composta (`composite: true`) para checagem de tipos dos scripts em `scripts/` e `packages/natives/scrip... |
