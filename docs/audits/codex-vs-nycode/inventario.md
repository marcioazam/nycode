# Inventário Codex CLI (`rust-v0.172.0`) -> `nycode`

Mapeamento integral de todos os arquivos de código e prompts em `codex-rs/`, `sdk/` e `codex-cli/` do Codex `rust-v0.172.0` (`3d86e43b075adeba2193ec5c22ac92f55afd82e6`), excluindo gerados, `vendor/` e `third_party/`, para equivalentes verificados no `nycode` (`00fed2ae615016b328ebfb48bfaa49814bf1dbc4`).

## Método e escopo

- **Universo incluído**: arquivos rastreados por `git -C ~/source/codex-ref ls-files` sob `codex-rs/`, `sdk/` e `codex-cli/` filtrados pela regex POSIX de extensões de código e templates de prompt:

```regex
\.(rs|ts|tsx|js|jsx|mjs|cjs|py|sh|bash|zsh|ps1|c|h|cc|cpp|sql|proto|sbpl|bzl|bazel|cmd|lark|codexpolicy)$|/templates/.*\.(md|txt|xml)$|_prompt\.md$|prompt\.md$|/prompts/.*\.md$|_description\.md$|SKILL\.md$|/skills/src/assets/.*/references/.*\.md$|resolve-latest-model-info$
```

- **Excluídos do universo de análise (contabilizados na reconciliação abaixo)**:
  - `third_party/` na raiz (**94** arquivos) e `codex-rs/vendor/` (**51** arquivos).
  - Gerados em `codex-rs/app-server-protocol/schema/` (1.133 arquivos `.ts`/`.json`/`.zst`), `codex-rs/hooks/schema/generated/` (24 `.json`), `sdk/python/src/openai_codex/generated/` (3 `.py`) e `*.d.ts` (1 arquivo): **1161** arquivos no escopo.
  - Snapshots `.snap`, fixtures de texto/JSON/TOML, imagens, ícones e READMEs comuns: **2240** arquivos.
  - Fora de `codex-rs/`, `sdk/` e `codex-cli/` (`.github/`, `scripts/`, `tools/`, `patches/`, `bazel/`, `docs/`, `third_party/`, raiz): **425** arquivos.
- **Categorias**: `teste` (`tests/`, `testing/`, `benches/`, `fixtures/`, `*_tests.rs`, `*.test.*`), `prompt` (`.md`/`.txt`/`.xml` de instrução/template), `codigo` (restante).
- **Dono no `nycode`**: todo caminho listado foi validado em disco na worktree limpa `~/source/nycode-audit-codex`. `sem equivalente` indica que o `nycode` não possui módulo ou crate correspondente.

## Contagem e verificação contra `git ls-files`

- **Total inventariado**: **6596** arquivos (`codigo`: **4002**, `prompt`: **72**, `teste`: **2522**), somando **2,459,901** linhas.
- **Com equivalente no `nycode`**: **5977** arquivos; **`sem equivalente`**: **619** arquivos.

Comando de verificação (os dois números devem ser idênticos: **6596**):

```bash
git -C ~/source/codex-ref ls-files | grep -E '^(codex-rs|sdk|codex-cli)/' | grep -E '\.(rs|ts|tsx|js|jsx|mjs|cjs|py|sh|bash|zsh|ps1|c|h|cc|cpp|sql|proto|sbpl|bzl|bazel|cmd|lark|codexpolicy)$|/templates/.*\.(md|txt|xml)$|_prompt\.md$|prompt\.md$|/prompts/.*\.md$|_description\.md$|SKILL\.md$|/skills/src/assets/.*/references/.*\.md$|resolve-latest-model-info$' | grep -vE '^(third_party/|codex-rs/vendor/)|/vendor/|codex-rs/app-server-protocol/schema/|codex-rs/hooks/schema/generated/|sdk/python/src/openai_codex/generated/|\.generated\.|\.gen\.|/generated/|\.d\.ts$' | wc -l
cat docs/audits/codex-vs-nycode/inventario/*.md | grep -c '^| `'
```

## Reconciliação total do repositório (`git ls-files`)

| Conjunto | Quantidade | Situação no inventário |
|---|---:|---|
| Código, prompts e testes em `codex-rs/`, `sdk/`, `codex-cli/` | 6596 | Listados 100% em `inventario/*.md` |
| Gerados em `codex-rs/` e `sdk/` (`app-server-protocol/schema/`, `hooks/schema/generated/`, `openai_codex/generated/`, `*.d.ts`) | 1161 | Excluídos (conforme regra) |
| Vendor em `codex-rs/vendor/` (bubblewrap) | 51 | Excluídos (conforme regra) |
| Snapshots `.snap`, TOML/JSON/MD não-prompt em `codex-rs/`, `sdk/`, `codex-cli/` | 2240 | Fora de código/prompt |
| `third_party/` (raiz) | 94 | Excluídos (conforme regra) |
| Scripts, CI, bazel, patches, tools, docs e raiz | 331 | Fora de `codex-rs/`, `sdk/`, `codex-cli/` |
| **Total `git ls-files`** | **10473** | **Reconciliado 100%** |

## Resumo por partição (`inventario/*.md`)

| Partição | Total | Código | Prompt | Teste | LOC | Arquivo |
|---|---:|---:|---:|---:|---:|---|
| `codex-core` | 1022 | 478 | 11 | 533 | 548,296 | [inventario/codex-core.md](inventario/codex-core.md) |
| `codex-tools-patch` | 78 | 50 | 0 | 28 | 17,091 | [inventario/codex-tools-patch.md](inventario/codex-tools-patch.md) |
| `codex-sandbox-seguranca` | 566 | 377 | 0 | 189 | 169,124 | [inventario/codex-sandbox-seguranca.md](inventario/codex-sandbox-seguranca.md) |
| `codex-exec` | 273 | 141 | 0 | 132 | 95,153 | [inventario/codex-exec.md](inventario/codex-exec.md) |
| `codex-app-server` | 590 | 283 | 0 | 307 | 308,564 | [inventario/codex-app-server.md](inventario/codex-app-server.md) |
| `codex-code-mode` | 126 | 76 | 0 | 50 | 31,591 | [inventario/codex-code-mode.md](inventario/codex-code-mode.md) |
| `codex-ext-hooks-skills-memories` | 472 | 301 | 59 | 112 | 101,857 | [inventario/codex-ext-hooks-skills-memories.md](inventario/codex-ext-hooks-skills-memories.md) |
| `codex-mcp-plugins` | 339 | 214 | 0 | 125 | 139,769 | [inventario/codex-mcp-plugins.md](inventario/codex-mcp-plugins.md) |
| `codex-rollout-state` | 387 | 297 | 0 | 90 | 126,715 | [inventario/codex-rollout-state.md](inventario/codex-rollout-state.md) |
| `codex-api-auth-modelos` | 387 | 256 | 1 | 130 | 100,974 | [inventario/codex-api-auth-modelos.md](inventario/codex-api-auth-modelos.md) |
| `codex-tui` | 1305 | 810 | 0 | 495 | 540,132 | [inventario/codex-tui.md](inventario/codex-tui.md) |
| `codex-cli-sdk` | 223 | 133 | 0 | 90 | 65,667 | [inventario/codex-cli-sdk.md](inventario/codex-cli-sdk.md) |
| `codex-infra-cloud-utils` | 828 | 586 | 1 | 241 | 214,968 | [inventario/codex-infra-cloud-utils.md](inventario/codex-infra-cloud-utils.md) |

## Mapeamento por crate (`codex-rs/*`, `sdk/*`, `codex-cli`)

| Crate / Diretório | Código | Prompt | Teste | Total | LOC | Partição | Equivalente no `nycode` |
|---|---:|---:|---:|---:|---:|---|---|
| `codex-cli` | 4 | 0 | 2 | 6 | 1,244 | [codex-cli-sdk](inventario/codex-cli-sdk.md) | `packages/coding-agent/src/cli/` |
| `codex-rs/agent-graph-store` | 6 | 0 | 0 | 6 | 487 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `sem equivalente` |
| `codex-rs/agent-identity` | 2 | 0 | 0 | 2 | 1,028 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `sem equivalente` |
| `codex-rs/agent-message-board-client` | 5 | 0 | 1 | 6 | 988 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `sem equivalente` |
| `codex-rs/agent-message-board-host` | 2 | 0 | 0 | 2 | 305 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `sem equivalente` |
| `codex-rs/agent-roles` | 5 | 0 | 0 | 5 | 598 | [codex-ext-hooks-skills-memories](inventario/codex-ext-hooks-skills-memories.md) | `packages/coding-agent/src/extensions/subagent/registry/` |
| `codex-rs/analytics` | 12 | 0 | 20 | 32 | 19,103 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/telemetry/` |
| `codex-rs/ansi-escape` | 2 | 0 | 1 | 3 | 148 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/tui/src/utils.ts` |
| `codex-rs/app-server` | 142 | 0 | 259 | 401 | 224,592 | [codex-app-server](inventario/codex-app-server.md) | `packages/coding-agent/src/modes/rpc/` |
| `codex-rs/app-server-client` | 14 | 0 | 10 | 24 | 8,914 | [codex-app-server](inventario/codex-app-server.md) | `packages/chord/` |
| `codex-rs/app-server-daemon` | 25 | 0 | 11 | 36 | 12,353 | [codex-app-server](inventario/codex-app-server.md) | `packages/durable/` |
| `codex-rs/app-server-protocol` | 66 | 0 | 11 | 77 | 38,979 | [codex-app-server](inventario/codex-app-server.md) | `packages/coding-agent/src/modes/rpc/rpc-types.ts` |
| `codex-rs/app-server-protocol-noop-macros` | 2 | 0 | 0 | 2 | 27 | [codex-app-server](inventario/codex-app-server.md) | `sem equivalente` |
| `codex-rs/app-server-test-client` | 9 | 0 | 2 | 11 | 3,992 | [codex-app-server](inventario/codex-app-server.md) | `packages/coding-agent/test/` |
| `codex-rs/app-server-transport` | 25 | 0 | 14 | 39 | 19,707 | [codex-app-server](inventario/codex-app-server.md) | `packages/chord/` |
| `codex-rs/apply-patch` | 10 | 0 | 7 | 17 | 5,561 | [codex-tools-patch](inventario/codex-tools-patch.md) | `packages/coding-agent/src/core/tools/edit.ts` |
| `codex-rs/arg0` | 2 | 0 | 0 | 2 | 853 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `sem equivalente` |
| `codex-rs/async-utils` | 3 | 0 | 0 | 3 | 116 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/agent/src/` |
| `codex-rs/attachment-store` | 2 | 0 | 1 | 3 | 423 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `sem equivalente` |
| `codex-rs/aws-auth` | 6 | 0 | 2 | 8 | 1,320 | [codex-api-auth-modelos](inventario/codex-api-auth-modelos.md) | `packages/ai/src/api/bedrock-converse-stream.ts` |
| `codex-rs/backend-client` | 13 | 0 | 10 | 23 | 6,000 | [codex-api-auth-modelos](inventario/codex-api-auth-modelos.md) | `sem equivalente` |
| `codex-rs/build-info` | 3 | 0 | 1 | 4 | 366 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/coding-agent/src/config.ts` |
| `codex-rs/bwrap` | 4 | 0 | 0 | 4 | 224 | [codex-sandbox-seguranca](inventario/codex-sandbox-seguranca.md) | `sem equivalente` |
| `codex-rs/chatgpt` | 6 | 0 | 4 | 10 | 1,408 | [codex-api-auth-modelos](inventario/codex-api-auth-modelos.md) | `packages/coding-agent/src/core/` |
| `codex-rs/cli` | 56 | 0 | 58 | 114 | 46,121 | [codex-cli-sdk](inventario/codex-cli-sdk.md) | `packages/coding-agent/src/cli/` |
| `codex-rs/cloud-client` | 18 | 0 | 7 | 25 | 6,568 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `sem equivalente` |
| `codex-rs/cloud-config` | 12 | 0 | 5 | 17 | 4,657 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `sem equivalente` |
| `codex-rs/cloud-tasks` | 9 | 0 | 5 | 14 | 5,919 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `apps/p3/` |
| `codex-rs/cloud-tasks-client` | 4 | 0 | 0 | 4 | 1,131 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `apps/p3/` |
| `codex-rs/cloud-tasks-mock-client` | 3 | 0 | 0 | 3 | 276 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `apps/p3/` |
| `codex-rs/code-mode` | 15 | 0 | 7 | 22 | 4,469 | [codex-code-mode](inventario/codex-code-mode.md) | `packages/coding-agent/src/extensions/codemode/` |
| `codex-rs/code-mode-host` | 15 | 0 | 22 | 37 | 10,088 | [codex-code-mode](inventario/codex-code-mode.md) | `packages/codemode/` |
| `codex-rs/code-mode-protocol` | 13 | 0 | 4 | 17 | 3,433 | [codex-code-mode](inventario/codex-code-mode.md) | `packages/codemode/` |
| `codex-rs/code-mode-runtime` | 31 | 0 | 17 | 48 | 13,160 | [codex-code-mode](inventario/codex-code-mode.md) | `packages/codemode/src/runtime/` |
| `codex-rs/codex-api` | 44 | 0 | 18 | 62 | 20,763 | [codex-api-auth-modelos](inventario/codex-api-auth-modelos.md) | `packages/ai/src/api/` |
| `codex-rs/codex-backend-openapi-models` | 23 | 0 | 0 | 23 | 1,264 | [codex-api-auth-modelos](inventario/codex-api-auth-modelos.md) | `sem equivalente` |
| `codex-rs/codex-client` | 6 | 0 | 0 | 6 | 306 | [codex-api-auth-modelos](inventario/codex-api-auth-modelos.md) | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/codex-experimental-api-macros` | 2 | 0 | 0 | 2 | 317 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `sem equivalente` |
| `codex-rs/codex-home` | 4 | 0 | 0 | 4 | 331 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/coding-agent/src/config.ts` |
| `codex-rs/codex-mcp` | 50 | 0 | 23 | 73 | 34,163 | [codex-mcp-plugins](inventario/codex-mcp-plugins.md) | `packages/coding-agent/src/extensions/mcp/` |
| `codex-rs/collaboration-mode-templates` | 2 | 2 | 0 | 4 | 161 | [codex-ext-hooks-skills-memories](inventario/codex-ext-hooks-skills-memories.md) | `packages/coding-agent/src/extensions/plan-mode/` |
| `codex-rs/config` | 77 | 0 | 32 | 109 | 35,902 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config-schema` | 2 | 0 | 0 | 2 | 49 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/coding-agent/src/core/settings-schema.ts` |
| `codex-rs/connectors` | 16 | 0 | 5 | 21 | 5,738 | [codex-mcp-plugins](inventario/codex-mcp-plugins.md) | `sem equivalente` |
| `codex-rs/context-fragments` | 8 | 0 | 2 | 10 | 880 | [codex-ext-hooks-skills-memories](inventario/codex-ext-hooks-skills-memories.md) | `packages/coding-agent/src/core/system-prompt.ts` |
| `codex-rs/core` | 478 | 11 | 533 | 1022 | 548,296 | [codex-core](inventario/codex-core.md) | `packages/coding-agent/src/core/` |
| `codex-rs/core-api` | 2 | 0 | 0 | 2 | 170 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/coding-agent/src/core/sdk.ts` |
| `codex-rs/core-plugin-common` | 5 | 0 | 1 | 6 | 247 | [codex-mcp-plugins](inventario/codex-mcp-plugins.md) | `packages/coding-agent/src/core/extensions/` |
| `codex-rs/core-plugins` | 66 | 0 | 36 | 102 | 53,021 | [codex-mcp-plugins](inventario/codex-mcp-plugins.md) | `packages/coding-agent/src/extensions/` |
| `codex-rs/diagnostics` | 3 | 0 | 0 | 3 | 274 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/coding-agent/src/extensions/diagnostico/` |
| `codex-rs/direct-tool-timing` | 4 | 0 | 2 | 6 | 902 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/coding-agent/src/core/timings.ts` |
| `codex-rs/exec` | 11 | 0 | 28 | 39 | 14,358 | [codex-exec](inventario/codex-exec.md) | `packages/coding-agent/src/modes/print-mode.ts` |
| `codex-rs/exec-server` | 114 | 0 | 95 | 209 | 74,381 | [codex-exec](inventario/codex-exec.md) | `packages/env/` |
| `codex-rs/exec-server-cli` | 8 | 0 | 6 | 14 | 3,197 | [codex-exec](inventario/codex-exec.md) | `packages/env/` |
| `codex-rs/exec-server-protocol` | 8 | 0 | 3 | 11 | 3,217 | [codex-exec](inventario/codex-exec.md) | `packages/env/` |
| `codex-rs/execpolicy` | 13 | 0 | 2 | 15 | 3,388 | [codex-sandbox-seguranca](inventario/codex-sandbox-seguranca.md) | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/agent` | 2 | 0 | 1 | 3 | 178 | [codex-ext-hooks-skills-memories](inventario/codex-ext-hooks-skills-memories.md) | `packages/coding-agent/src/extensions/subagent/` |
| `codex-rs/ext/agent-message-board` | 6 | 0 | 0 | 6 | 482 | [codex-ext-hooks-skills-memories](inventario/codex-ext-hooks-skills-memories.md) | `sem equivalente` |
| `codex-rs/ext/connectors` | 3 | 0 | 0 | 3 | 80 | [codex-ext-hooks-skills-memories](inventario/codex-ext-hooks-skills-memories.md) | `sem equivalente` |
| `codex-rs/ext/extension-api` | 29 | 0 | 3 | 32 | 3,665 | [codex-ext-hooks-skills-memories](inventario/codex-ext-hooks-skills-memories.md) | `packages/coding-agent/src/core/extensions/` |
| `codex-rs/ext/git-attribution` | 4 | 0 | 1 | 5 | 557 | [codex-ext-hooks-skills-memories](inventario/codex-ext-hooks-skills-memories.md) | `sem equivalente` |
| `codex-rs/ext/goal` | 12 | 3 | 3 | 18 | 6,002 | [codex-ext-hooks-skills-memories](inventario/codex-ext-hooks-skills-memories.md) | `packages/coding-agent/src/extensions/goal/` |
| `codex-rs/ext/guardian-reviewer` | 34 | 0 | 18 | 52 | 8,105 | [codex-sandbox-seguranca](inventario/codex-sandbox-seguranca.md) | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2` | 31 | 0 | 23 | 54 | 19,971 | [codex-sandbox-seguranca](inventario/codex-sandbox-seguranca.md) | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v3` | 15 | 0 | 7 | 22 | 5,416 | [codex-sandbox-seguranca](inventario/codex-sandbox-seguranca.md) | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/history-notes` | 6 | 0 | 4 | 10 | 1,959 | [codex-ext-hooks-skills-memories](inventario/codex-ext-hooks-skills-memories.md) | `sem equivalente` |
| `codex-rs/ext/image-generation` | 7 | 2 | 0 | 9 | 1,927 | [codex-ext-hooks-skills-memories](inventario/codex-ext-hooks-skills-memories.md) | `packages/ai/src/images.ts` |
| `codex-rs/ext/items` | 6 | 0 | 0 | 6 | 526 | [codex-ext-hooks-skills-memories](inventario/codex-ext-hooks-skills-memories.md) | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/ext/mcp` | 11 | 0 | 9 | 20 | 6,266 | [codex-ext-hooks-skills-memories](inventario/codex-ext-hooks-skills-memories.md) | `packages/coding-agent/src/extensions/mcp/` |
| `codex-rs/ext/memories` | 19 | 2 | 1 | 22 | 2,795 | [codex-ext-hooks-skills-memories](inventario/codex-ext-hooks-skills-memories.md) | `packages/coding-agent/src/extensions/memory/` |
| `codex-rs/ext/multi-env-copy-file` | 4 | 0 | 4 | 8 | 1,411 | [codex-ext-hooks-skills-memories](inventario/codex-ext-hooks-skills-memories.md) | `sem equivalente` |
| `codex-rs/ext/queue` | 3 | 0 | 1 | 4 | 1,868 | [codex-ext-hooks-skills-memories](inventario/codex-ext-hooks-skills-memories.md) | `packages/coding-agent/src/extensions/up-dequeue/` |
| `codex-rs/ext/skills` | 63 | 0 | 42 | 105 | 31,559 | [codex-ext-hooks-skills-memories](inventario/codex-ext-hooks-skills-memories.md) | `packages/coding-agent/src/extensions/skills-compat/` |
| `codex-rs/ext/web-search` | 7 | 1 | 1 | 9 | 1,235 | [codex-ext-hooks-skills-memories](inventario/codex-ext-hooks-skills-memories.md) | `packages/coding-agent/src/extensions/web/` |
| `codex-rs/external-agent-migration` | 48 | 0 | 17 | 65 | 16,687 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/features` | 6 | 0 | 0 | 6 | 4,515 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/coding-agent/src/extensions/settings-flags/` |
| `codex-rs/feedback` | 9 | 0 | 8 | 17 | 4,038 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/coding-agent/src/core/bug-report.ts` |
| `codex-rs/file-search` | 5 | 0 | 2 | 7 | 1,824 | [codex-tools-patch](inventario/codex-tools-patch.md) | `packages/coding-agent/src/core/tools/find.ts` |
| `codex-rs/file-system` | 8 | 0 | 0 | 8 | 1,413 | [codex-tools-patch](inventario/codex-tools-patch.md) | `packages/coding-agent/src/core/tools/` |
| `codex-rs/file-watcher` | 2 | 0 | 1 | 3 | 1,661 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `sem equivalente` |
| `codex-rs/git-utils` | 15 | 0 | 7 | 22 | 6,221 | [codex-rollout-state](inventario/codex-rollout-state.md) | `packages/coding-agent/src/extensions/git-checkpoint/` |
| `codex-rs/guardian-context` | 32 | 0 | 20 | 52 | 14,837 | [codex-sandbox-seguranca](inventario/codex-sandbox-seguranca.md) | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/history` | 15 | 0 | 4 | 19 | 5,387 | [codex-rollout-state](inventario/codex-rollout-state.md) | `packages/coding-agent/src/core/session-manager.ts` |
| `codex-rs/hooks` | 35 | 0 | 6 | 41 | 17,593 | [codex-ext-hooks-skills-memories](inventario/codex-ext-hooks-skills-memories.md) | `packages/coding-agent/src/extensions/hooks/` |
| `codex-rs/http-client` | 31 | 0 | 21 | 52 | 13,596 | [codex-api-auth-modelos](inventario/codex-api-auth-modelos.md) | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-headers-helper` | 2 | 0 | 1 | 3 | 197 | [codex-api-auth-modelos](inventario/codex-api-auth-modelos.md) | `packages/ai/src/api/` |
| `codex-rs/install-context` | 2 | 0 | 2 | 4 | 963 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/coding-agent/src/config.ts` |
| `codex-rs/keyring-store` | 3 | 0 | 2 | 5 | 459 | [codex-api-auth-modelos](inventario/codex-api-auth-modelos.md) | `packages/coding-agent/src/core/auth-storage.ts` |
| `codex-rs/linux-sandbox` | 23 | 0 | 28 | 51 | 15,187 | [codex-sandbox-seguranca](inventario/codex-sandbox-seguranca.md) | `sem equivalente` |
| `codex-rs/lmstudio` | 3 | 0 | 0 | 3 | 476 | [codex-api-auth-modelos](inventario/codex-api-auth-modelos.md) | `packages/ai/src/providers/` |
| `codex-rs/login` | 51 | 0 | 34 | 85 | 27,844 | [codex-api-auth-modelos](inventario/codex-api-auth-modelos.md) | `packages/ai/src/auth/` |
| `codex-rs/memories/read` | 5 | 0 | 2 | 7 | 299 | [codex-ext-hooks-skills-memories](inventario/codex-ext-hooks-skills-memories.md) | `packages/coding-agent/src/extensions/memory/` |
| `codex-rs/memories/write` | 18 | 7 | 11 | 36 | 8,164 | [codex-ext-hooks-skills-memories](inventario/codex-ext-hooks-skills-memories.md) | `packages/coding-agent/src/extensions/memory/` |
| `codex-rs/mermaid` | 11 | 0 | 1 | 12 | 2,735 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `sem equivalente` |
| `codex-rs/message-board` | 23 | 0 | 5 | 28 | 6,754 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `sem equivalente` |
| `codex-rs/message-board-mcp` | 6 | 0 | 1 | 7 | 770 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `sem equivalente` |
| `codex-rs/message-history` | 4 | 0 | 1 | 5 | 1,443 | [codex-rollout-state](inventario/codex-rollout-state.md) | `packages/coding-agent/src/core/session-manager.ts` |
| `codex-rs/model-provider` | 32 | 0 | 21 | 53 | 13,245 | [codex-api-auth-modelos](inventario/codex-api-auth-modelos.md) | `packages/ai/src/providers/` |
| `codex-rs/model-provider-info` | 5 | 0 | 2 | 7 | 2,547 | [codex-api-auth-modelos](inventario/codex-api-auth-modelos.md) | `packages/ai/src/model-catalog.ts` |
| `codex-rs/models-manager` | 11 | 1 | 7 | 19 | 4,888 | [codex-api-auth-modelos](inventario/codex-api-auth-modelos.md) | `packages/coding-agent/src/core/model-registry.ts` |
| `codex-rs/mxc-sandbox` | 7 | 0 | 2 | 9 | 2,048 | [codex-sandbox-seguranca](inventario/codex-sandbox-seguranca.md) | `sem equivalente` |
| `codex-rs/network-proxy` | 53 | 0 | 24 | 77 | 36,467 | [codex-sandbox-seguranca](inventario/codex-sandbox-seguranca.md) | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/ollama` | 7 | 0 | 1 | 8 | 1,113 | [codex-api-auth-modelos](inventario/codex-api-auth-modelos.md) | `packages/ai/src/providers/` |
| `codex-rs/otel` | 29 | 0 | 20 | 49 | 12,066 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/telemetry/` |
| `codex-rs/otel-trace-websocket` | 2 | 0 | 0 | 2 | 185 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/telemetry/` |
| `codex-rs/plugin` | 6 | 0 | 1 | 7 | 1,013 | [codex-mcp-plugins](inventario/codex-mcp-plugins.md) | `packages/coding-agent/src/core/package-manager.ts` |
| `codex-rs/plugin-host` | 5 | 0 | 2 | 7 | 683 | [codex-mcp-plugins](inventario/codex-mcp-plugins.md) | `packages/coding-agent/src/core/package-manager.ts` |
| `codex-rs/process-hardening` | 2 | 0 | 0 | 2 | 199 | [codex-sandbox-seguranca](inventario/codex-sandbox-seguranca.md) | `sem equivalente` |
| `codex-rs/prompts` | 22 | 21 | 11 | 54 | 4,722 | [codex-ext-hooks-skills-memories](inventario/codex-ext-hooks-skills-memories.md) | `packages/coding-agent/src/core/system-prompt.ts` |
| `codex-rs/protocol` | 69 | 1 | 27 | 97 | 35,440 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/raiz` | 1 | 0 | 0 | 1 | 109 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/coding-agent/` |
| `codex-rs/realtime-webrtc` | 8 | 0 | 7 | 15 | 2,111 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `sem equivalente` |
| `codex-rs/response-debug-context` | 2 | 0 | 0 | 2 | 206 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/coding-agent/src/core/diagnostics.ts` |
| `codex-rs/responses-api-proxy` | 8 | 0 | 2 | 10 | 2,930 | [codex-api-auth-modelos](inventario/codex-api-auth-modelos.md) | `sem equivalente` |
| `codex-rs/rmcp-client` | 66 | 0 | 57 | 123 | 44,904 | [codex-mcp-plugins](inventario/codex-mcp-plugins.md) | `packages/mcp/` |
| `codex-rs/rollout` | 31 | 0 | 17 | 48 | 20,065 | [codex-rollout-state](inventario/codex-rollout-state.md) | `packages/coding-agent/src/core/session-manager.ts` |
| `codex-rs/rollout-trace` | 30 | 0 | 12 | 42 | 17,370 | [codex-rollout-state](inventario/codex-rollout-state.md) | `packages/coding-agent/src/core/session-manager.ts` |
| `codex-rs/runtime-agent-instance` | 10 | 0 | 3 | 13 | 2,851 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `sem equivalente` |
| `codex-rs/sandboxing` | 26 | 0 | 13 | 39 | 12,811 | [codex-sandbox-seguranca](inventario/codex-sandbox-seguranca.md) | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/scripts` | 2 | 0 | 0 | 2 | 293 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `sem equivalente` |
| `codex-rs/secrets` | 4 | 0 | 1 | 5 | 1,302 | [codex-sandbox-seguranca](inventario/codex-sandbox-seguranca.md) | `packages/coding-agent/src/core/auth-storage.ts` |
| `codex-rs/shell-command` | 20 | 0 | 2 | 22 | 10,835 | [codex-sandbox-seguranca](inventario/codex-sandbox-seguranca.md) | `packages/coding-agent/src/core/permissions/guard/` |
| `codex-rs/skills` | 24 | 21 | 10 | 55 | 8,930 | [codex-ext-hooks-skills-memories](inventario/codex-ext-hooks-skills-memories.md) | `packages/coding-agent/src/core/skills.ts` |
| `codex-rs/state` | 133 | 0 | 22 | 155 | 31,768 | [codex-rollout-state](inventario/codex-rollout-state.md) | `packages/durable/` |
| `codex-rs/tcp-tunnel` | 5 | 0 | 4 | 9 | 1,620 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/env/` |
| `codex-rs/terminal-detection` | 2 | 0 | 1 | 3 | 1,388 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/tui/src/terminal.ts` |
| `codex-rs/test-binary-support` | 2 | 0 | 0 | 2 | 84 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/coding-agent/test/` |
| `codex-rs/thread-manager-sample` | 2 | 0 | 0 | 2 | 537 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `sem equivalente` |
| `codex-rs/thread-store` | 63 | 0 | 24 | 87 | 42,337 | [codex-rollout-state](inventario/codex-rollout-state.md) | `packages/durable/` |
| `codex-rs/tools` | 27 | 0 | 19 | 46 | 8,293 | [codex-tools-patch](inventario/codex-tools-patch.md) | `packages/coding-agent/src/core/tools/` |
| `codex-rs/tui` | 810 | 0 | 495 | 1305 | 540,132 | [codex-tui](inventario/codex-tui.md) | `packages/tui/` |
| `codex-rs/uds` | 6 | 0 | 1 | 7 | 1,096 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/chord/` |
| `codex-rs/user-input` | 4 | 0 | 3 | 7 | 1,266 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/coding-agent/src/extensions/question/` |
| `codex-rs/user-verification` | 14 | 0 | 8 | 22 | 1,567 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `sem equivalente` |
| `codex-rs/utils/absolute-path` | 4 | 0 | 1 | 5 | 1,038 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/coding-agent/src/core/tools/path-utils.ts` |
| `codex-rs/utils/approval-presets` | 2 | 0 | 0 | 2 | 83 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/utils/audio` | 2 | 0 | 1 | 3 | 565 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `sem equivalente` |
| `codex-rs/utils/cache` | 2 | 0 | 2 | 4 | 278 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/coding-agent/src/core/cache-stats.ts` |
| `codex-rs/utils/cargo-bin` | 3 | 0 | 0 | 3 | 338 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `sem equivalente` |
| `codex-rs/utils/cli` | 8 | 0 | 1 | 9 | 721 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/coding-agent/src/cli/` |
| `codex-rs/utils/critical-path` | 3 | 0 | 1 | 4 | 1,024 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/coding-agent/src/core/timings.ts` |
| `codex-rs/utils/elapsed` | 2 | 0 | 0 | 2 | 77 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/coding-agent/src/core/timings.ts` |
| `codex-rs/utils/fuzzy-match` | 2 | 0 | 0 | 2 | 169 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/tui/src/fuzzy.ts` |
| `codex-rs/utils/git-discovery` | 2 | 0 | 1 | 3 | 311 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/coding-agent/src/extensions/git-checkpoint/` |
| `codex-rs/utils/head-tail-buffer` | 2 | 0 | 1 | 3 | 267 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/coding-agent/src/core/tools/truncate.ts` |
| `codex-rs/utils/home-dir` | 2 | 0 | 0 | 2 | 140 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/coding-agent/src/config.ts` |
| `codex-rs/utils/image` | 4 | 0 | 2 | 6 | 1,348 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/coding-agent/src/utils/image-resize.ts` |
| `codex-rs/utils/json-to-toml` | 2 | 0 | 0 | 2 | 89 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `sem equivalente` |
| `codex-rs/utils/model-facing-id` | 4 | 0 | 1 | 5 | 558 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/ai/src/model-catalog.ts` |
| `codex-rs/utils/oss` | 2 | 0 | 0 | 2 | 68 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/ai/src/providers/` |
| `codex-rs/utils/output-truncation` | 2 | 0 | 1 | 3 | 1,090 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/coding-agent/src/core/tools/truncate.ts` |
| `codex-rs/utils/path-uri` | 8 | 0 | 3 | 11 | 4,246 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/coding-agent/src/core/tools/path-utils.ts` |
| `codex-rs/utils/path-utils` | 4 | 0 | 2 | 6 | 676 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/coding-agent/src/core/tools/path-utils.ts` |
| `codex-rs/utils/plugins` | 5 | 0 | 0 | 5 | 452 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/coding-agent/src/core/package-manager.ts` |
| `codex-rs/utils/process` | 2 | 0 | 1 | 3 | 86 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/coding-agent/src/core/exec.ts` |
| `codex-rs/utils/pty` | 21 | 0 | 17 | 38 | 10,127 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/coding-agent/src/extensions/processos/` |
| `codex-rs/utils/readiness` | 2 | 0 | 0 | 2 | 342 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `sem equivalente` |
| `codex-rs/utils/redacted-string` | 2 | 0 | 0 | 2 | 77 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/utils/rustls-provider` | 2 | 0 | 2 | 4 | 87 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `sem equivalente` |
| `codex-rs/utils/sandbox-summary` | 3 | 0 | 0 | 3 | 283 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/utils/sleep-inhibitor` | 7 | 0 | 0 | 7 | 614 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `sem equivalente` |
| `codex-rs/utils/stream-parser` | 9 | 0 | 0 | 9 | 1,512 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/ai/src/utils/` |
| `codex-rs/utils/string` | 5 | 0 | 0 | 5 | 694 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/tui/src/utils.ts` |
| `codex-rs/utils/template` | 2 | 0 | 0 | 2 | 448 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `packages/coding-agent/src/core/prompt-templates.ts` |
| `codex-rs/v8-poc` | 2 | 0 | 0 | 2 | 441 | [codex-code-mode](inventario/codex-code-mode.md) | `sem equivalente` |
| `codex-rs/voice-host` | 17 | 0 | 18 | 35 | 6,234 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `apps/p2/plugins/voice/` |
| `codex-rs/websocket-auth` | 2 | 0 | 1 | 3 | 775 | [codex-api-auth-modelos](inventario/codex-api-auth-modelos.md) | `packages/ai/src/auth/oauth/openai-codex.ts` |
| `codex-rs/websocket-client` | 3 | 0 | 4 | 7 | 1,843 | [codex-api-auth-modelos](inventario/codex-api-auth-modelos.md) | `packages/ai/src/api/openai-codex-responses.ts` |
| `codex-rs/windows-sandbox-rs` | 85 | 0 | 39 | 124 | 31,514 | [codex-sandbox-seguranca](inventario/codex-sandbox-seguranca.md) | `sem equivalente` |
| `codex-rs/windows-sandbox-service` | 28 | 0 | 10 | 38 | 6,820 | [codex-sandbox-seguranca](inventario/codex-sandbox-seguranca.md) | `sem equivalente` |
| `codex-rs/workload-identity` | 5 | 0 | 2 | 7 | 1,671 | [codex-infra-cloud-utils](inventario/codex-infra-cloud-utils.md) | `sem equivalente` |
| `codex-rs/worktree` | 6 | 0 | 3 | 9 | 2,124 | [codex-rollout-state](inventario/codex-rollout-state.md) | `packages/coding-agent/src/extensions/subagent/core/worktree.ts` |
| `sdk/python` | 54 | 0 | 21 | 75 | 14,768 | [codex-cli-sdk](inventario/codex-cli-sdk.md) | `sem equivalente` |
| `sdk/python-runtime` | 2 | 0 | 0 | 2 | 68 | [codex-cli-sdk](inventario/codex-cli-sdk.md) | `sem equivalente` |
| `sdk/typescript` | 17 | 0 | 9 | 26 | 3,466 | [codex-cli-sdk](inventario/codex-cli-sdk.md) | `packages/coding-agent/src/core/sdk.ts` |
