# Inventario: raiz

OpenCode v2.4.2 (`fc31a485`) -> nycode (`00fed2ae`). 97 arquivos de codigo. Gerado por regras de dono (ver `../inventario.md`, Metodo). Linhas = contagem de `\n`.

| Arquivo OpenCode | Linhas | Categoria | Equivalente nycode | Nota |
|---|---:|---|---|---|
| `.github/nix-hashes/publish.sh` | 66 | codigo | `.github/` | CI |
| `.github/nix-hashes/validate.sh` | 27 | codigo | `.github/` | CI |
| `.github/release/backfill-blockmaps.sh` | 53 | codigo | `.github/` | CI |
| `.github/release/blockmap.mjs` | 179 | codigo | `.github/` | CI |
| `.github/release/cloudflare-token.sh` | 114 | codigo | `.github/` | CI |
| `.github/release/deploy-data.sh` | 86 | codigo | `.github/` | CI |
| `.github/release/deploy-files.sh` | 43 | codigo | `.github/` | CI |
| `.github/release/deploy-legacy.sh` | 59 | codigo | `.github/` | CI |
| `.github/release/deploy-site.sh` | 55 | codigo | `.github/` | CI |
| `.github/release/deploy-update.sh` | 38 | codigo | `.github/` | CI |
| `.github/release/import-certificate.sh` | 14 | codigo | `.github/` | CI |
| `.github/release/lib.sh` | 152 | codigo | `.github/` | CI |
| `.github/release/plan-release.sh` | 79 | codigo | `.github/` | CI |
| `.github/release/publish-aur.sh` | 15 | codigo | `.github/` | CI |
| `.github/release/publish-cli.sh` | 23 | codigo | `.github/` | CI |
| `.github/release/publish-desktop.sh` | 37 | codigo | `.github/` | CI |
| `.github/release/publish-discord.sh` | 19 | codigo | `.github/` | CI |
| `.github/release/publish-docker.sh` | 10 | codigo | `.github/` | CI |
| `.github/release/publish-github-release.sh` | 21 | codigo | `.github/` | CI |
| `.github/release/publish-homebrew.sh` | 17 | codigo | `.github/` | CI |
| `.github/release/publish-npm.sh` | 89 | codigo | `.github/` | CI |
| `.github/release/publish-process-daemon.sh` | 19 | codigo | `.github/` | CI |
| `.github/release/publish-version-pr.sh` | 11 | codigo | `.github/` | CI |
| `.github/release/render-aur.sh` | 80 | codigo | `.github/` | CI |
| `.github/release/render-homebrew.sh` | 47 | codigo | `.github/` | CI |
| `.github/release/render-winget.sh` | 45 | codigo | `.github/` | CI |
| `.github/release/repack-windows.sh` | 13 | codigo | `.github/` | CI |
| `.github/release/sign-cli-macos.sh` | 28 | codigo | `.github/` | CI |
| `.github/release/sign-desktop-macos.sh` | 88 | codigo | `.github/` | CI |
| `.github/release/tag-release.sh` | 51 | codigo | `.github/` | CI |
| `.github/release/unpack-windows.sh` | 17 | codigo | `.github/` | CI |
| `.github/release/verify-artifacts.sh` | 43 | codigo | `.github/` | CI |
| `.github/release/verify-signatures-windows.sh` | 18 | codigo | `.github/` | CI |
| `.github/release/with-secrets.sh` | 21 | codigo | `.github/` | CI |
| `.github/release/write-checksums.sh` | 11 | codigo | `.github/` | CI |
| `.opencode/env.d.ts` | 4 | codigo | `.nycode/` | harness do repo |
| `.opencode/tool/github-pr-search.ts` | 64 | codigo | `.nycode/` | harness do repo |
| `flake.nix` | 72 | codigo | sem equivalente | nix |
| `nix/desktop.nix` | 168 | codigo | sem equivalente | nix |
| `nix/electron.nix` | 10 | codigo | sem equivalente | nix |
| `nix/node_modules.nix` | 87 | gerado | sem equivalente | gerado: excluido da analise; nix |
| `nix/opencode.nix` | 133 | codigo | sem equivalente | nix |
| `nix/scripts/canonicalize-node-modules.ts` | 101 | codigo | sem equivalente | nix |
| `nix/scripts/normalize-bun-binaries.ts` | 130 | codigo | sem equivalente | nix |
| `patches/install-korean-ime-fix.sh` | 120 | codigo | sem equivalente | patches de deps |
| `script/check-greys.ts` | 170 | codigo | `scripts/` | scripts de repo |
| `script/drive/shell-output.ts` | 88 | codigo | `scripts/` | scripts de repo |
| `script/drive/subagent-eviction.ts` | 153 | codigo | `scripts/` | scripts de repo |
| `script/format.ts` | 5 | codigo | `scripts/` | scripts de repo |
| `script/generate.ts` | 9 | codigo | `scripts/` | scripts de repo |
| `script/github/close-issues.ts` | 203 | codigo | `scripts/` | scripts de repo |
| `script/github/close-prs.ts` | 393 | codigo | `scripts/` | scripts de repo |
| `script/lint-changed.ts` | 71 | codigo | `scripts/` | scripts de repo |
| `script/native-arch.ts` | 102 | codigo | `scripts/` | scripts de repo |
| `script/oxlint/anti-slop/effect/index.ts` | 21 | codigo | `scripts/` | scripts de repo |
| `script/oxlint/anti-slop/effect/rules/no-manual-effect-error-tag.ts` | 52 | codigo | `scripts/` | scripts de repo |
| `script/oxlint/anti-slop/effect/rules/no-manual-tag-comparison.ts` | 45 | codigo | `scripts/` | scripts de repo |
| `script/oxlint/anti-slop/effect/rules/no-manual-tagged-construction.ts` | 37 | codigo | `scripts/` | scripts de repo |
| `script/oxlint/anti-slop/effect/rules/no-service-constructor-imports.ts` | 52 | codigo | `scripts/` | scripts de repo |
| `script/oxlint/anti-slop/effect/rules/prefer-effect-match.ts` | 54 | codigo | `scripts/` | scripts de repo |
| `script/oxlint/anti-slop/effect/shared/tagged-values.ts` | 97 | codigo | `scripts/` | scripts de repo |
| `script/oxlint/anti-slop/index.ts` | 47 | codigo | `scripts/` | scripts de repo |
| `script/oxlint/anti-slop/rules/no-array-filter-map.ts` | 28 | codigo | `scripts/` | scripts de repo |
| `script/oxlint/anti-slop/rules/no-chained-type-assertions.ts` | 77 | codigo | `scripts/` | scripts de repo |
| `script/oxlint/anti-slop/rules/no-conditional-empty-object-spread.ts` | 49 | codigo | `scripts/` | scripts de repo |
| `script/oxlint/anti-slop/rules/no-known-value-widening.ts` | 415 | codigo | `scripts/` | scripts de repo |
| `script/oxlint/anti-slop/rules/no-module-mocking.ts` | 80 | codigo | `scripts/` | scripts de repo |
| `script/oxlint/anti-slop/rules/no-object-parameters.ts` | 83 | codigo | `scripts/` | scripts de repo |
| `script/oxlint/anti-slop/rules/no-reduce-accumulator-copy.ts` | 109 | codigo | `scripts/` | scripts de repo |
| `script/oxlint/anti-slop/rules/no-reflect-apply.ts` | 28 | codigo | `scripts/` | scripts de repo |
| `script/oxlint/anti-slop/rules/no-reflect-get.ts` | 28 | codigo | `scripts/` | scripts de repo |
| `script/oxlint/anti-slop/rules/no-runtime-typeof.ts` | 77 | codigo | `scripts/` | scripts de repo |
| `script/oxlint/anti-slop/rules/no-shape-in-symbol-names.ts` | 46 | codigo | `scripts/` | scripts de repo |
| `script/oxlint/anti-slop/rules/no-unknown-parameters.ts` | 69 | codigo | `scripts/` | scripts de repo |
| `script/oxlint/anti-slop/rules/no-unknown-returns.ts` | 82 | codigo | `scripts/` | scripts de repo |
| `script/oxlint/anti-slop/rules/no-unknown-type-aliases.ts` | 54 | codigo | `scripts/` | scripts de repo |
| `script/oxlint/anti-slop/rules/no-unsafe-dictionary-type.ts` | 154 | codigo | `scripts/` | scripts de repo |
| `script/oxlint/anti-slop/rules/no-widen-then-assert.ts` | 366 | codigo | `scripts/` | scripts de repo |
| `script/oxlint/anti-slop/rules/require-readable-spacing.ts` | 47 | codigo | `scripts/` | scripts de repo |
| `script/oxlint/anti-slop/rules/require-safety-comment-for-type-assertion.ts` | 131 | codigo | `scripts/` | scripts de repo |
| `script/oxlint/anti-slop/shared/array-method.ts` | 94 | codigo | `scripts/` | scripts de repo |
| `script/oxlint/anti-slop/shared/dictionary-types.ts` | 515 | codigo | `scripts/` | scripts de repo |
| `script/oxlint/anti-slop/shared/function-parameters.ts` | 49 | codigo | `scripts/` | scripts de repo |
| `script/oxlint/anti-slop/shared/lexical-type-parameters.ts` | 61 | codigo | `scripts/` | scripts de repo |
| `script/oxlint/anti-slop/shared/reflect-method.ts` | 24 | codigo | `scripts/` | scripts de repo |
| `script/oxlint/anti-slop/shared/scope.ts` | 15 | codigo | `scripts/` | scripts de repo |
| `script/oxlint/anti-slop/shared/type-alias-resolution.ts` | 250 | codigo | `scripts/` | scripts de repo |
| `script/oxlint/anti-slop/vendor/eslint-stylistic/padding-line-ast.ts` | 51 | vendor | `scripts/` | vendor: excluido da analise; scripts de repo |
| `script/oxlint/anti-slop/vendor/eslint-stylistic/padding-line-between-statements.ts` | 906 | vendor | `scripts/` | vendor: excluido da analise; scripts de repo |
| `script/oxlint/anti-slop/vendor/eslint-stylistic/padding-line-options.d.ts` | 87 | vendor | `scripts/` | vendor: excluido da analise; scripts de repo |
| `script/pack.ts` | 45 | codigo | `scripts/` | scripts de repo |
| `script/profile-typecheck-packages.ts` | 66 | codigo | `scripts/` | scripts de repo |
| `script/profile-typecheck.ts` | 172 | codigo | `scripts/` | scripts de repo |
| `script/release.ts` | 228 | codigo | `scripts/` | scripts de repo |
| `script/sdk-docs.ts` | 343 | codigo | `scripts/` | scripts de repo |
| `script/upgrade-mcp-sdk.ts` | 313 | codigo | `scripts/` | scripts de repo |
| `script/upgrade-opentui.ts` | 157 | codigo | `scripts/` | scripts de repo |
