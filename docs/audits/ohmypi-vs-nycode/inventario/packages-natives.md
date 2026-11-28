# Inventario: packages-natives

Cada linha cobre 1 arquivo rastreado em `~/source/oh-my-pi-ref` (`git ls-files`), com categoria, origem em relação ao Pi `v0.9.4`, dono equivalente no `nycode` (ou `sem equivalente`) e nota resumida verificada nos shards. Regras e totais em [../inventario.md](../inventario.md).

| Arquivo | Categoria | Origem | Dono no nycode | Nota |
|---|---|---|---|---|
| `packages/natives/CHANGELOG.md` | doc | omp-novo | sem equivalente | 2558L; Registro de alterações das versões 19.2.1 até 18.18.1 de `@oh-my-pi/pi-natives` (shell embarcado com Perl/file, desktop automat... |
| `packages/natives/LICENSE` | codigo | omp-novo | sem equivalente | 22L; Licença MIT do pacote `@oh-my-pi/pi-natives`. |
| `packages/natives/README.md` | doc | omp-novo | sem equivalente | 113L; Documentação e arquitetura do pacote `@oh-my-pi/pi-natives` (bindings N-API Rust para grep, find, SIXEL, áudio, WebRTC, file lo... |
| `packages/natives/THIRD-PARTY-NOTICES.txt` | doc | omp-novo | sem equivalente | 15064L; Avisos de licenças de terceiros do addon `pi_natives` (uutils coreutils/findutils/sed, jaq, rust-utf8, ctok, fonte Silver CC-BY... |
| `packages/natives/bench/grep.ts` | teste | omp-novo | sem equivalente | 166L; Benchmark comparando `grep` nativo vs subprocesso `rg` em execução sequencial e concorrente em múltiplos modos de saída. |
| `packages/natives/bench/ipc.ts` | teste | omp-novo | sem equivalente | 237L; Benchmark comparando transporte IPC nativo (`IpcServer`/`IpcConnection`) contra `node:net` em latência round-trip e throughput ... |
| `packages/natives/bench/text.ts` | teste | omp-novo | sem equivalente | 238L; Microbenchmarks mitata comparando primitivas nativas de texto/ANSI/tokenização/diff contra `pi-tui`, `Bun.stringWidth` e biblio... |
| `packages/natives/bench/workspace.ts` | teste | omp-novo | sem equivalente | 19L; Script simples de benchmark para `listWorkspace` medindo tempo e coleta de arquivos `AGENTS.md` em um diretório. |
| `packages/natives/native/clipboard.d.ts` | gerado | omp-novo | `packages/coding-agent/src/utils/clipboard.ts` | 12L; Lockfile ou artefato gerado automaticamente (excluido) |
| `packages/natives/native/clipboard.js` | codigo | omp-novo | `packages/coding-agent/src/utils/clipboard.ts` | 16L; Entrypoint lazy para funções nativas de área de transferência (texto e imagem), carregando o addon apenas na primeira chamada. |
| `packages/natives/native/desktop-adapter.d.ts` | gerado | omp-novo | sem equivalente | 4L; Lockfile ou artefato gerado automaticamente (excluido) |
| `packages/natives/native/desktop-adapter.js` | codigo | omp-novo | sem equivalente | 46L; Validador de ABI para DesktopSession: verifica todos os métodos e o getter escapeStops no protótipo e substitui addons desatual... |
| `packages/natives/native/desktop.d.ts` | gerado | omp-novo | sem equivalente | 19L; Lockfile ou artefato gerado automaticamente (excluido) |
| `packages/natives/native/desktop.js` | codigo | omp-novo | sem equivalente | 40L; Entrypoint lazy para automação de desktop (DesktopSession, contagem de Escape físico, encerramento de event taps e listagem de ... |
| `packages/natives/native/embedded-addon.js` | codigo | omp-novo | sem equivalente | 23L; Stub em disco sempre null que é substituído em memória durante o build standalone pelo manifesto e frames zstd dos addons nativ... |
| `packages/natives/native/file-poll.d.ts` | gerado | omp-novo | sem equivalente | 9L; Lockfile ou artefato gerado automaticamente (excluido) |
| `packages/natives/native/file-poll.js` | codigo | omp-novo | sem equivalente | 17L; Observador de arquivo baseado em polling de stat (fs.watchFile(...).unref()) que detecta mudanças de mtimeMs, ino e size sobrev... |
| `packages/natives/native/index.d.ts` | gerado | omp-novo | sem equivalente | 5463L; Lockfile ou artefato gerado automaticamente (excluido) |
| `packages/natives/native/index.js` | codigo | omp-novo | sem equivalente | 359L; Entrypoint principal do pacote @oh-my-pi/pi-natives; executa loadNative() e reexporta classes, funções (com fallback missingNat... |
| `packages/natives/native/loader-state.d.ts` | gerado | omp-novo | sem equivalente | 196L; Lockfile ou artefato gerado automaticamente (excluido) |
| `packages/natives/native/loader-state.js` | codigo | omp-novo | sem equivalente | 1113L; Primeira metade do carregador nativo: detecção de binário compilado e suporte AVX2 (com cache em env e bun:ffi no Windows), sta... |
| `packages/natives/native/path.d.ts` | gerado | omp-novo | sem equivalente | 5L; Lockfile ou artefato gerado automaticamente (excluido) |
| `packages/natives/native/path.js` | codigo | omp-novo | sem equivalente | 21L; Helpers lazy de conversão de caminhos Windows 8.3 (curto/longo) que no-op em POSIX e carregam o addon nativo sob demanda apenas... |
| `packages/natives/native/sqlite-locks.d.ts` | gerado | omp-novo | sem equivalente | 12L; Lockfile ou artefato gerado automaticamente (excluido) |
| `packages/natives/native/sqlite-locks.js` | codigo | omp-novo | sem equivalente | 26L; Entrypoint lazy para diagnóstico de locks em arquivos SQLite (database, wal-index, locked) com degradação silenciosa quando o a... |
| `packages/natives/native/vcs.d.ts` | gerado | omp-novo | `packages/coding-agent/src/utils/git.ts` | 101L; Lockfile ou artefato gerado automaticamente (excluido) |
| `packages/natives/native/vcs.js` | codigo | omp-novo | `packages/coding-agent/src/utils/git.ts` | 217L; API JS sobre primitivas nativas de Git/Jujutsu, incluindo cópia atômica de objetos/packs entre worktrees isolados e fallback do... |
| `packages/natives/native/version-sentinel.d.ts` | gerado | omp-novo | sem equivalente | 17L; Lockfile ou artefato gerado automaticamente (excluido) |
| `packages/natives/native/version-sentinel.js` | codigo | omp-novo | sem equivalente | 96L; Utilitários compartilhados para ler e verificar o stamp de versão pós-link (e sentinelas legados __piNativesV*) nos bytes e exp... |
| `packages/natives/package.json` | config_ou_dado | omp-novo | sem equivalente | 106L; Manifesto do pacote @oh-my-pi/pi-natives definindo subpaths (./path, ./desktop, ./clipboard, ./vcs, ./file-poll, ./sqlite-locks... |
| `packages/natives/scripts/build-bindings.ts` | codigo | omp-novo | sem equivalente | 276L; Script de build local do addon Rust via @napi-rs/cli: configura RUSTFLAGS por variante x64/CRT estático no Windows, localiza CM... |
| `packages/natives/scripts/embed-native.ts` | codigo | omp-novo | sem equivalente | 117L; Gera overrides em memória para Bun.build({ files }) comprimindo os addons da plataforma alvo com zstd nível 19 (sem timestamps,... |
| `packages/natives/scripts/gen-enums.ts` | codigo | omp-novo | sem equivalente | 170L; Script pós-build que lê native/index.d.ts, reescreve const enum para declare enum, e injeta exports ESM explícitos (classes, fu... |
| `packages/natives/scripts/gen-npm-packages.ts` | codigo | omp-novo | sem equivalente | 195L; Gerador dos 6 pacotes npm específicos por plataforma (@oh-my-pi/pi-natives-<os>-<cpu>) copiando binários .node, LICENSE, THIRD-... |
| `packages/natives/test/addon-load-verification.test.ts` | teste | omp-novo | sem equivalente | 164L; Testa verificação pós-build de carregamento real do addon nativo (`verifyHostAddonLoads`), timeout contra hang de init, carimbo... |
| `packages/natives/test/addon-path-characters.test.ts` | teste | omp-novo | sem equivalente | 241L; Testa carregamento via `process.dlopen` em diretórios com caracteres especiais (`?`, `#`, `%`, espaço, `'`), cache de bindings ... |
| `packages/natives/test/commit-message-isolation.test.ts` | teste | omp-novo | sem equivalente | 117L; Testa isolamento do arquivo de mensagem em `commitCreate` frente a modificações concorrentes de `COMMIT_EDITMSG`, hooks `commit... |
| `packages/natives/test/dedicated-wait-threads.test.ts` | teste | omp-novo | sem equivalente | 92L; Testa no Windows que `PtySession` e `reapChild` usam threads de espera dedicadas e não travam quando 8 processos ocupam o limit... |
| `packages/natives/test/desktop-adapter.test.ts` | teste | omp-novo | sem equivalente | 81L; Testa validação adiada de ABI do `DesktopSession` (incluindo `escapeStops` e display hold) e mensagens de erro para exports aus... |
| `packages/natives/test/desktop.test.ts` | teste | omp-novo | sem equivalente | 97L; Testa construção, capacidades reportadas, códigos de erro prefixados, fechamento idempotente e rejeição `Closed` após encerrame... |
| `packages/natives/test/devicecheck.test.ts` | teste | omp-novo | sem equivalente | 32L; Testa o contrato da binding macOS `deviceCheckGenerateToken`, verificando fallback não-darwin e formato de resposta/erro sem ex... |
| `packages/natives/test/diff.test.ts` | teste | omp-novo | sem equivalente | 312L; Testa corretude e invariantes de `diffLines`, `diffWords`, `diffLineRuns`, `diffLineRunsWithin`, `structuredPatchHunks` e `Diff... |
| `packages/natives/test/embed-native.test.ts` | teste | omp-novo | sem equivalente | 150L; Testa validação de carimbo de versão, determinismo de compressão zstd, extração do manifesto e extração seletiva por variante e... |
| `packages/natives/test/file-lock.test.ts` | teste | omp-novo | sem equivalente | 37L; Testa exclusão mútua e vinculação de posse de `FileLock.tryAcquire`/`release` para que apenas o dono atual libere o lock. |
| `packages/natives/test/fixtures/parse-status-grammar-probe.ts` | teste | omp-novo | sem equivalente | 36L; Fixture executada em subprocesso para testar comportamento de `parseCodeStatus` e `summarizeCode` diante de gramática WASM ause... |
| `packages/natives/test/ipc.test.ts` | teste | omp-novo | sem equivalente | 355L; Testa transporte IPC nativo em modos lines e raw: round-trip, entrega pré-`start()`, ordenação de frames grandes/pequenos, `end... |
| `packages/natives/test/issue-3238-repro.test.ts` | teste | omp-novo | sem equivalente | 153L; Testa regressão #3238: cache da variante CPU (`__PI_NATIVE_VARIANT_CACHE`) via env herdada por workers, precedência de `PI_NATI... |
| `packages/natives/test/issue-4812-repro.test.ts` | teste | omp-novo | sem equivalente | 99L; Testa regressão #4812: distinção entre addon residente obsoleto em processo (orientar reinício) e addon obsoleto em disco (orie... |
| `packages/natives/test/issue-823-repro.test.ts` | teste | omp-novo | sem equivalente | 341L; Testa regressão #823: detecção de binário compilado via `embeddedAddon`, ordem de candidatos (embedded/leaf/staging), extração ... |
| `packages/natives/test/issue-8901-scoped-leaf.test.ts` | teste | omp-novo | sem equivalente | 102L; Testa regressão #8901: resolução de pacote leaf irmão versionado no cache de instalação do Bun sem segmento `node_modules`. |
| `packages/natives/test/legacy-desktop-sentinel.test.ts` | teste | omp-novo | sem equivalente | 82L; Testa compatibilidade e validação ABI de addons pré-sentinela e distinção entre builds sem sentinela e builds com `__piNativesB... |
| `packages/natives/test/native.test.ts` | teste | omp-novo | sem equivalente | 1303L; Suíte principal nativa (parte 1): corretor macOS, `countTokens`, `summarizeCode`, sintaxes vendored e `HighlightStream`, chaves... |
| `packages/natives/test/natives-dir-override.test.ts` | teste | omp-novo | sem equivalente | 88L; Testa override `PI_NATIVES_DIR`, expansão de `~` e fallback para `XDG_DATA_HOME` quando o valor é vazio ou relativo. |
| `packages/natives/test/npm-packages.test.ts` | teste | omp-novo | sem equivalente | 143L; Testa geração de pacotes npm leaf por plataforma (`buildLeafManifest`/`generateNpmPackages`), exigência de arquivos legais loca... |
| `packages/natives/test/oauth-callback.test.ts` | teste | omp-novo | sem equivalente | 8L; Testa validação de scheme URI no `NativeOAuthCallback` antes de iniciar o receptor e seu descarte. |
| `packages/natives/test/parse-status.test.ts` | teste | omp-novo | sem equivalente | 65L; Testa alinhamento entre `parseCodeStatus` e `summarizeCode`, inferência de `.bzl` como Starlark, recuperação incremental de sin... |
| `packages/natives/test/shell-commands.test.ts` | teste | omp-novo | sem equivalente | 232L; Testa registro de comandos JS no `Shell.run` (pipelines, stdin/argv/cwd, funções anteriores, comandos reservados, escopo por ru... |
| `packages/natives/test/sqlite-ofd-locks.test.ts` | teste | omp-novo | sem equivalente | 90L; Testa no Linux que `installSqliteLockShim()` converte locks do SQLite para OFD (`OFDLCK`), evitando liberação acidental por lei... |
| `packages/natives/test/stale-addon-export.test.ts` | teste | omp-novo | sem equivalente | 98L; Testa stubs diagnósticos para funções e classes ausentes apenas quando o addon carregado está obsoleto, mantendo `undefined` em... |
| `packages/natives/test/tty-writer.test.ts` | teste | omp-novo | sem equivalente | 64L; Testa escrita ordenada de fragmentos Unicode (incluindo surrogates isolados) e despertar do callback de drain do `TtyWriter` co... |
| `packages/natives/test/vcs-commit-head-race.test.ts` | teste | omp-novo | sem equivalente | 97L; Testa semântica compare-and-swap (expectedHead) em commitCreate durante a janela do hook commit-msg, garantindo erro HeadMoved ... |
| `packages/natives/test/vcs-unmerged-commit.test.ts` | teste | omp-novo | sem equivalente | 182L; Testa que commitCreate (incluindo allowEmpty, amend, noVerify, pathspec e index alternativo) e writeTree recusam índices com en... |
| `packages/natives/test/vcs.test.ts` | teste | omp-novo | sem equivalente | 220L; Testa bindings nativos de VCS (status, diffText, applyPatch com índice alternativo e rejeição de escapes octais inválidos, canc... |
| `packages/natives/test/windows-staging.test.ts` | teste | omp-novo | sem equivalente | 202L; Testa staging de addons nativos em Windows para diretório versionado (~/.omp/natives/<version>/) em instalações node_modules pa... |
| `packages/natives/test/workspace.test.ts` | teste | omp-novo | sem equivalente | 97L; Testa listWorkspace quanto à poda de diretórios mantendo arquivos de mesmo nome, coleta de AGENTS.md além de maxDepth, cap lexi... |
| `packages/natives/tsconfig.json` | config_ou_dado | omp-novo | sem equivalente | 8L; Configuração TypeScript do pacote natives estendendo tsconfig.workspace.json para native, scripts e test. |
| `packages/natives/tsconfig.publish.json` | config_ou_dado | omp-novo | sem equivalente | 3L; Configuração TypeScript de publicação do pacote natives estendendo ./tsconfig.json. |
