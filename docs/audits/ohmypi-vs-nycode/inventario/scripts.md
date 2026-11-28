# Inventario: scripts

Cada linha cobre 1 arquivo rastreado em `~/source/oh-my-pi-ref` (`git ls-files`), com categoria, origem em relação ao Pi `v0.9.4`, dono equivalente no `nycode` (ou `sem equivalente`) e nota resumida verificada nos shards. Regras e totais em [../inventario.md](../inventario.md).

| Arquivo | Categoria | Origem | Dono no nycode | Nota |
|---|---|---|---|---|
| `scripts/__init__.py` | codigo | omp-novo | `scripts` | 0L; Arquivo vazio marcador de pacote Python em `scripts/`. |
| `scripts/analyze_small_edits.py` | codigo | omp-novo | `scripts` | 473L; Script CLI que varre logs de sessão (`~/.omp/agent/sessions`) para classificar falhas de `edit`/`ast_edit` e micro-edições estr... |
| `scripts/bash_corpus_stats.jl` | codigo | omp-novo | `scripts` | 357L; Script Julia com lexer bash próprio que analisa chamadas de shell e escritas `.sh` em `~/.omp/stats.db`, relatando frequências ... |
| `scripts/bazel-natives.ts` | codigo | omp-novo | `scripts` | 620L; Driver Bazel/Cargo para build e instalação dos addons nativos `pi_natives`, com stamp pós-link de versão, verificação ELF de sí... |
| `scripts/check-spoofed-versions.ts` | codigo | omp-novo | `scripts` | 111L; Verificador de drift entre versões de cliente spoofadas no código (`CODEX_CLIENT_VERSION`, `DEFAULT_CLAUDE_CODE_VERSION`) e as ... |
| `scripts/ci-build-upload.ts` | codigo | omp-novo | `scripts` | 255L; Publica os 8 binários de release e o viewer HTML content-addressed (`export-viewer-<sha256>.js`) no serviço `build.stencil.so` ... |
| `scripts/ci-macos-sign.sh` | codigo | omp-novo | `scripts` | 144L; Script bash para assinar (Developer ID + entitlements, ou ad-hoc) e notarizar binários Mach-O do macOS em runners Linux usando ... |
| `scripts/ci-macos-upload-secrets.sh` | codigo | omp-novo | `scripts` | 115L; Valida certificado `.p12` via `security import` em keychain temporário e envia segredos de assinatura/notarização Apple ao GitH... |
| `scripts/ci-release-build-binaries.ts` | codigo | omp-novo | `scripts` | 197L; Compila os 8 alvos standalone do `coding-agent` via `compileCodingAgent`, gera e restaura artefatos (`gen:stats`, check do view... |
| `scripts/ci-release-checksums.ts` | codigo | omp-novo | `scripts` | 54L; Gera arquivo `SHA256SUMS.txt` compatível com `sha256sum -c` ordenado por basename dos assets de release. |
| `scripts/ci-release-notes.ts` | codigo | omp-novo | `scripts` | 280L; Agrega notas de release de `packages/*/CHANGELOG.md` no intervalo `(última release publicada, target]` via `gh release list`, i... |
| `scripts/ci-release-publish.ts` | codigo | omp-novo | `scripts` | 695L; Pipeline de publicação npm: emite `.d.ts`/`dist/js`, ajusta extensões para `nodenext`, reescreve `package.json`, empacota com `... |
| `scripts/ci-test-ts.ts` | codigo | omp-novo | `scripts` | 1375L; Primeira metade do orquestrador de testes TS: classifica testes de `coding-agent` em 4 buckets, divide em chunks balanceados po... |
| `scripts/ci-update-brew-formula.ts` | codigo | omp-novo | `scripts` | 172L; Gera a fórmula Homebrew (`omp.rb`) consultando URLs imutáveis e SHA-256 publicados no serviço de build (`build.stencil.so`) com... |
| `scripts/claude-trace.ts` | codigo | omp-novo | `scripts` | 114L; CLI que analisa argumentos e invoca `runClaudeTraceCommand` para executar o Claude Code em PTY headless atrás de um proxy HTTPS... |
| `scripts/cleanup-scan.ts` | codigo | omp-novo | `scripts` | 492L; Scanner heurístico de descoberta de limpeza para o comando `/cleanup`: identifica god-objects, clusters de código duplicado (ja... |
| `scripts/edit-benchmark.py` | codigo | omp-novo | `scripts` | 82L; Ponto de entrada CLI que seleciona uma variante da ferramenta `edit` (`PI_EDIT_VARIANT` ou `--variant`) e delega ao executor co... |
| `scripts/edit_benchmark_common.py` | codigo | omp-novo | `scripts` | 956L; Define os fixtures Rust inicial/esperado, o diff alvo, o prompt de pesquisa de feedback pós-tarefa em 6 perguntas, dataclasses ... |
| `scripts/eval-bench-runs.ts` | codigo | omp-novo | `scripts` | 466L; Analisa arquivos Markdown gerados por `bench:edit` para tabular e agregar métricas (taxa de sucesso, uso de edit, falhas de pat... |
| `scripts/fix-changelogs.ts` | codigo | omp-novo | `scripts` | 1145L; Parser, normalizador e compactador de `CHANGELOG.md`: remove duplicatas em `[Unreleased]` já presentes em releases, promove ite... |
| `scripts/fix-dt-verdef.ts` | codigo | omp-novo | `scripts` | 108L; Corrige em binários ELF64 little-endian gerados por `bun build --compile` o ponteiro `DT_VERDEF` na seção `.dynamic` após o `pa... |
| `scripts/fix-emit-extensions.ts` | codigo | omp-novo | `scripts` | 103L; Passa pelos arquivos `.d.ts` e `.js` emitidos para adicionar sufixo `.js` ou `/index.js` em especificadores relativos sem exten... |
| `scripts/gen-bazel-lock.ts` | codigo | omp-novo | `scripts` | 49L; Wrapper que executa `bazel fetch --repo=@crates` para atualizar ou validar (`--check`) a entrada da extensão `crate_universe` e... |
| `scripts/gen-clippy-bazelrc.test.ts` | teste | omp-novo | `scripts` | 169L; Testes de contrato do gerador gen-clippy-bazelrc.ts verificando detecção de crates com [lints] workspace = true, exigência de l... |
| `scripts/gen-clippy-bazelrc.ts` | codigo | omp-novo | `scripts` | 817L; Lê `[workspace.lints]` do `Cargo.toml` para gerar `bazel/clippy.bazelrc` e `bazel/lints/BUILD.bazel` com ordenação por priorida... |
| `scripts/gen-grammars.ts` | codigo | omp-novo | `scripts` | 100L; Baixa o `manifest.json` de `stencil-hq/wasm-grammars`, valida compatibilidade de versão minor do ABI com o `tree-sitter` do `Ca... |
| `scripts/gen-nix-bun.ts` | codigo | omp-novo | `scripts` | 85L; Regenera `nix/bun.nix` usando `bun2nix` (nativo, via `nix develop` ou `bunx`), rebaixando `lockfileVersion` 2 de `bun.lock` par... |
| `scripts/gen-prompt-perturbation.ts` | codigo | omp-novo | `scripts` | 368L; Sincroniza e valida `perturbation-pool.json.txt` extraindo fragmentos de prose de arquivos `.md` de prompts, requisitando paráf... |
| `scripts/host-detect.ts` | codigo | omp-novo | `scripts` | 111L; Detecta identidade do addon nativo local: determina musl no Linux lendo `PT_INTERP` do ELF de `process.execPath` e suporte a AV... |
| `scripts/inline-functions.ts` | codigo | omp-novo | `scripts` | 1052L; Analisador AST em `ts-morph` para inlining de funções `function` locais `void`: verifica pureza/duplicabilidade, inverte guarda... |
| `scripts/install-tests/binary.dockerfile` | codigo | omp-novo | `scripts` | 30L; Dockerfile Debian bookworm-slim para testar build do addon nativo e do binário compilado `omp` a partir do repositório local. |
| `scripts/install-tests/native-version.ts` | codigo | omp-novo | `scripts` | 30L; Extrai a versão embutida de um addon `.node` via `__piNativesBuildVersion()` ou export legado `__piNativesV*` para checagens de... |
| `scripts/install-tests/run-ci.sh` | codigo | omp-novo | `scripts` | 245L; Script de smoke test de instalação em CI cobrindo três modos (binário compilado, `bun link` por fonte e tarballs com pacote lea... |
| `scripts/install-tests/run-podman.sh` | codigo | omp-novo | `scripts` | 18L; Executor shell que constrói via `podman` as três imagens de teste de instalação (`binary`, `source` e `tarball`). |
| `scripts/install-tests/settings-session.ts` | codigo | omp-novo | `scripts` | 210L; Teste E2E que executa o CLI instalado contra um servidor SSE OpenAI-compatível em `Bun.serve` para validar isolamento concorren... |
| `scripts/install-tests/source.dockerfile` | codigo | omp-novo | `scripts` | 25L; Dockerfile Debian bookworm-slim que testa instalação `--source` compilando nativos e vinculando `packages/coding-agent` globalm... |
| `scripts/install-tests/tarball.dockerfile` | codigo | omp-novo | `scripts` | 136L; Dockerfile que sobe um registro `verdaccio` local, resolve dependências `workspace:*`, publica os pacotes do monorepo e verific... |
| `scripts/install.ps1` | codigo | omp-novo | `scripts` | 377L; Instalador PowerShell para Windows compatível com PS 5.1+: baixa binário pré-compilado com verificação SHA-256 ou instala via `... |
| `scripts/install.sh` | codigo | omp-novo | `scripts` | 480L; Instalador POSIX (`sh`) para macOS/Linux: detecta arquitetura real sob Rosetta (`sysctl hw.optional.arm64`) e musl, baixa binár... |
| `scripts/link-omp.sh` | codigo | omp-novo | `scripts` | 31L; Cria symlink do `omp` global no binário do Bun apontando para o wrapper `packages/coding-agent/scripts/omp`, com fallback caso ... |
| `scripts/macos-entitlements.plist` | codigo | omp-novo | `scripts` | 30L; Define os entitlements obrigatórios de hardened runtime no macOS para o binário Bun compilado (`allow-jit`, memória executável,... |
| `scripts/merge-pr.ts` | codigo | omp-novo | `scripts` | 140L; Utilitário de merge (`--no-ff`) que resolve metadados do PR via `gh`, valida o primeiro commit convencional compatível em `HEAD... |
| `scripts/rate-edit-tool.py` | codigo | omp-novo | `scripts` | 1572L; Define prompts de avaliação exploratória da ferramenta `edit` e de síntese por modelo oráculo (`ORACLE_REVIEW_PROMPT`), fixture... |
| `scripts/release.ts` | codigo | omp-novo | `scripts` | 525L; Script de release do monorepo `omp` (TS + Rust + Bazel + Nix): valida versão sem prerelease, verifica branch `main` e sincronis... |
| `scripts/rewrite-changelog.ts` | codigo | omp-novo | `scripts` | 511L; Script Bun que passa cada seção `[Unreleased]` não vazia a um LLM via `@oh-my-pi/pi-ai` (`completeSimple` + `discoverAuthStorag... |
| `scripts/rewrite-system-prompt.style.md` | doc | omp-novo | `scripts` | 39L; Prompt/guia de estilo para reescrita de fragmentos de engenharia em voz telegráfica ("scratchpad"), exigindo preservação exata ... |
| `scripts/rewrite-system-prompt.ts` | codigo | omp-novo | `scripts` | 580L; Reescreve a prosa de prompts/regras Markdown usando OpenRouter (`json_schema` estrito) preservando byte-a-byte frontmatter YAML... |
| `scripts/run-rs-task.ts` | codigo | omp-novo | `scripts` | 297L; Wrapper Bun para gates Rust (`check:rs`, `fix:rs`, `fmt:rs`, `lint:rs`, `test:rs`): pula execução se não houver arquivos Rust a... |
| `scripts/session-stats/README.md` | doc | omp-novo | `scripts` | 114L; Documenta o pipeline `session-stats`: sincronização incremental de JSONLs para tabelas `ss_*` em `~/.omp/stats.db` (com tokeniz... |
| `scripts/session-stats/analyze.py` | codigo | omp-novo | `scripts` | 1284L; Primeira metade de `analyze.py`: helpers SQLite/tempo, implementação do subcomando `tools` (totais de tokens por tool, decompos... |
| `scripts/session-stats/analyze_search_relevance.py` | codigo | omp-novo | `scripts` | 693L; Analisa relevância de `search`/`grep` em `stats.db`: extrai caminhos retornados (árvore ou flat), faz lookahead de até 30 calls... |
| `scripts/session-stats/analyze_selector_reads.py` | codigo | omp-novo | `scripts` | 599L; Analisa cobertura de intervalos em chamadas `read` por `(session, file)`: interpreta seletores de faixa/raw/conflicts, classifi... |
| `scripts/session-stats/audit-prompt.md` | doc | omp-novo | `scripts` | 41L; System prompt do auditor de eficiência de tokens (`audit.ts`): detalha o modelo de custo por append-only e `cache-read` (~10%),... |
| `scripts/session-stats/audit.ts` | codigo | omp-novo | `scripts` | 1464L; Primeira metade de `audit.ts`: CLI, contabilidade de uso real (input/output/cacheRead/cacheWrite/cost), scanner de JSONLs com c... |
| `scripts/session-stats/harmony_backtest.py` | codigo | omp-novo | `scripts` | 1168L; Primeira metade de `harmony_backtest.py`: define regexes de vazamento Harmony GPT-5 (`to=functions.*`, `<\|start\|>`, glitch toke... |
| `scripts/session-stats/optimize_read_config.py` | codigo | omp-novo | `scripts` | 907L; Primeira metade de `optimize_read_config.py`: extrai leituras e rodapés `[Showing lines A-B of N.]` de `stats.db`, estima taman... |
| `scripts/session-stats/out/cumulative-tokens.png` | binario | omp-novo | `scripts` | 0L; Binario, fonte bitmap (.bdf) ou vocabulario de tokenizador (excluido de prosa LLM) |
| `scripts/session-stats/out/daily-calls.png` | binario | omp-novo | `scripts` | 0L; Binario, fonte bitmap (.bdf) ou vocabulario de tokenizador (excluido de prosa LLM) |
| `scripts/session-stats/out/daily-tokens.png` | binario | omp-novo | `scripts` | 0L; Binario, fonte bitmap (.bdf) ou vocabulario de tokenizador (excluido de prosa LLM) |
| `scripts/session-stats/out/per-call-histogram.png` | binario | omp-novo | `scripts` | 0L; Binario, fonte bitmap (.bdf) ou vocabulario de tokenizador (excluido de prosa LLM) |
| `scripts/session-stats/out/per-call-median.png` | binario | omp-novo | `scripts` | 0L; Binario, fonte bitmap (.bdf) ou vocabulario de tokenizador (excluido de prosa LLM) |
| `scripts/session-stats/out/per-call-percentiles.png` | binario | omp-novo | `scripts` | 0L; Binario, fonte bitmap (.bdf) ou vocabulario de tokenizador (excluido de prosa LLM) |
| `scripts/session-stats/out/read-config-sweep.png` | binario | omp-novo | `scripts` | 0L; Binario, fonte bitmap (.bdf) ou vocabulario de tokenizador (excluido de prosa LLM) |
| `scripts/session-stats/out/read-optimizer.png` | binario | omp-novo | `scripts` | 0L; Binario, fonte bitmap (.bdf) ou vocabulario de tokenizador (excluido de prosa LLM) |
| `scripts/session-stats/out/read-summarizer.png` | binario | omp-novo | `scripts` | 0L; Binario, fonte bitmap (.bdf) ou vocabulario de tokenizador (excluido de prosa LLM) |
| `scripts/session-stats/out/search-relevance.png` | binario | omp-novo | `scripts` | 0L; Binario, fonte bitmap (.bdf) ou vocabulario de tokenizador (excluido de prosa LLM) |
| `scripts/session-stats/out/selector-coverage.png` | binario | omp-novo | `scripts` | 0L; Binario, fonte bitmap (.bdf) ou vocabulario de tokenizador (excluido de prosa LLM) |
| `scripts/session-stats/out/selector-followups.png` | binario | omp-novo | `scripts` | 0L; Binario, fonte bitmap (.bdf) ou vocabulario de tokenizador (excluido de prosa LLM) |
| `scripts/session-stats/out/tokens-per-call.png` | binario | omp-novo | `scripts` | 0L; Binario, fonte bitmap (.bdf) ou vocabulario de tokenizador (excluido de prosa LLM) |
| `scripts/session-stats/out/tool-trends.png` | binario | omp-novo | `scripts` | 0L; Binario, fonte bitmap (.bdf) ou vocabulario de tokenizador (excluido de prosa LLM) |
| `scripts/session-stats/plot_read_summarizer.py` | codigo | omp-novo | `scripts` | 414L; Avalia impacto pré/pós-deploy do sumarizador de `read`: separa chamadas em `summary-eligible` vs `selector`, normaliza o volume... |
| `scripts/session-stats/plot_tools.py` | codigo | omp-novo | `scripts` | 444L; Lê ~/.omp/stats.db (ss_tool_calls e ss_tool_results) e gera painel 3x2 + gráficos individuais com tendências diárias, média/med... |
| `scripts/session-stats/read_optimizer.py` | codigo | omp-novo | `scripts` | 778L; Implementa replay contrafactual sobre chamadas históricas da tool read em stats.db mantendo cobertura de linhas por (session, f... |
| `scripts/session-stats/sync.py` | codigo | omp-novo | `scripts` | 1307L; Define o schema SQLite ss_* para telemetria de sessões, tokenização em lote via tiktoken (o200k_base), parser multi-geração de ... |
| `scripts/setup-npm-trust.ts` | codigo | omp-novo | `scripts` | 463L; Configura em lote npm Trusted Publishers (OIDC via `npm trust github`) para todos os pacotes publicados e folhas nativas de pla... |
| `scripts/setup.ts` | codigo | omp-novo | `scripts` | 111L; Entrypoint do `bun setup` que encadeia `bun install`, `build:native` (com repasse de flags após `--`), linkagem do coding-agent... |
| `scripts/stamp-native-version.ts` | codigo | omp-novo | `scripts` | 216L; Grava a versão do pacote em um slot fixo dentro de binários nativos `.node` pós-linkagem (evitando recompilar Rust) e atualiza ... |
| `scripts/tool-prompt-usage.ts` | codigo | omp-novo | `scripts` | 250L; Renderiza templates `.md` de prompts de ferramentas com contexto representativo e conta exatamente tokens (`o200k_base` ou `cl1... |
| `scripts/tool_io.py` | codigo | omp-novo | `scripts` | 377L; Módulo Python utilitário para leitura em streaming de invocações de ferramentas em `~/.omp/agent/sessions/**/*.jsonl`, com pare... |
