# Inventário completo `deepseek-harness` (`dsh-v0.2.3-alpha.2`) -> `nycode`

Mapeamento de **100%** dos arquivos de código em `packages/`, `apps/`, `native/` e `python/` do `deepseek-harness` (`4b399c39a6d1`) para equivalentes no `nycode` (`00fed2ae6150`) ou `sem equivalente`.

## Método e escopo

- **Universo total no `git ls-files` do `dsh`**: **22949** blobs, dos quais **14284** ficam sob `packages/`, `apps/`, `native/` e `python/`. Os demais estão fora do escopo pedido ou excluídos pela Fase 1: `vendor/` (81), `snapshots/` (2254), `website/` (37), `.agents/` (4261), `docs/` (1354), `scripts/` (496), `benchmarks/` (53), `.github/` (69) e arquivos de configuração/documentação na raiz.
- **Filtro de arquivos de código (`packages/`, `apps/`, `native/`, `python/`)**:

```regex
^(packages|apps|native|python)/.*\.(ts|tsx|js|jsx|mjs|cjs|mts|cts|py|swift|cs|cpp|h|c|sh|ps1|cmd|nsh|nsi|css|html)$|^apps/desktop/cli/dsh$
```

- **Arquivos não-código dentro das 4 árvores** (fora do inventário de código, mas amostrados em [censo.md](censo.md) quando são manifests Cordis/prompts/skills): **6160** arquivos (`.json`, `.md`, `.yaml`, `.yml`, `.txt`, `.svg`, `.jsonl`, imagens/ícones, arquivos Office de fixture e metadados).
- **Categorias**:
  - `codigo`: **4232** arquivos de implementação e declaração de tipos.
  - `teste`: **3881** arquivos sob `tests/`, `__tests__/`, `__snapshots__/`, `fixtures/`, `e2e/`, `*.spec.*`, `*.test.*` e `packages/test-support/`.
  - `gerado`: **11** arquivos com marcador de geração automática (`*.generated.*`, `session-format-catalog/src/generated.ts`, `.generated-model-*`), listados nas tabelas para auditoria completa contra `git ls-files` e excluídos da análise.
- **Cobertura**: **8124** arquivos listados (`8113` não gerados), com **6006** mapeados para donos no `nycode` e **2118** classificados como `sem equivalente`.

## Verificação reproduzível contra `git ls-files`

Os dois comandos abaixo devem imprimir exatamente o mesmo número (**8124** com gerados listados; **8113** excluindo os 11 arquivos gerados):

```bash
git -c core.quotePath=false -C ~/source/dsh-ref ls-files -- packages apps native python | grep -cE '\.(ts|tsx|js|jsx|mjs|cjs|mts|cts|py|swift|cs|cpp|h|c|sh|ps1|cmd|nsh|nsi|css|html)$|^apps/desktop/cli/dsh$'
cat docs/audits/dsh-vs-nycode/inventario/*.md | grep -c '^| `'
```

Excluindo os 11 arquivos gerados explicitamente:

```bash
git -c core.quotePath=false -C ~/source/dsh-ref ls-files -- packages apps native python | grep -E '\.(ts|tsx|js|jsx|mjs|cjs|mts|cts|py|swift|cs|cpp|h|c|sh|ps1|cmd|nsh|nsi|css|html)$|^apps/desktop/cli/dsh$' | grep -cvE '(\.generated\.|/\.generated-model-|^packages/core/session/src/known-event-types\.ts$|^packages/extensions/cordis-client-runner/src/client/(api|slot)-catalog\.ts$|^packages/extensions/tool-cordis/src/api-catalog\.ts$|^packages/session/session-format-catalog/src/generated\.ts$|^packages/workflow/workflow-ptc/src/guest-source\.ts$)'
grep -hE '^\| `.*\| (codigo|teste) \|' docs/audits/dsh-vs-nycode/inventario/*.md | wc -l
```

## Resumo por grupo (`inventario/<grupo>.md`)

| Grupo | Total | código | teste | gerado | Com eq. | Sem eq. | Arquivo |
|---|---:|---:|---:|---:|---:|---:|---|
| `apps-cli` | 120 | 10 | 110 | 0 | 120 | 0 | [inventario/apps-cli.md](inventario/apps-cli.md) |
| `apps-desktop` | 535 | 293 | 242 | 0 | 535 | 0 | [inventario/apps-desktop.md](inventario/apps-desktop.md) |
| `apps-desktop-host` | 17 | 11 | 6 | 0 | 17 | 0 | [inventario/apps-desktop-host.md](inventario/apps-desktop-host.md) |
| `apps-desktop-publisher` | 45 | 28 | 17 | 0 | 0 | 45 | [inventario/apps-desktop-publisher.md](inventario/apps-desktop-publisher.md) |
| `apps-plugin-market-generator` | 15 | 9 | 6 | 0 | 0 | 15 | [inventario/apps-plugin-market-generator.md](inventario/apps-plugin-market-generator.md) |
| `apps-web` | 329 | 10 | 319 | 0 | 329 | 0 | [inventario/apps-web.md](inventario/apps-web.md) |
| `native-system` | 31 | 17 | 14 | 0 | 31 | 0 | [inventario/native-system.md](inventario/native-system.md) |
| `packages-account` | 23 | 9 | 14 | 0 | 0 | 23 | [inventario/packages-account.md](inventario/packages-account.md) |
| `packages-acp` | 19 | 7 | 12 | 0 | 19 | 0 | [inventario/packages-acp.md](inventario/packages-acp.md) |
| `packages-api` | 245 | 121 | 124 | 0 | 245 | 0 | [inventario/packages-api.md](inventario/packages-api.md) |
| `packages-attachment` | 28 | 15 | 13 | 0 | 0 | 28 | [inventario/packages-attachment.md](inventario/packages-attachment.md) |
| `packages-boot` | 128 | 63 | 65 | 0 | 128 | 0 | [inventario/packages-boot.md](inventario/packages-boot.md) |
| `packages-browser-use` | 4 | 3 | 1 | 0 | 0 | 4 | [inventario/packages-browser-use.md](inventario/packages-browser-use.md) |
| `packages-bundle` | 35 | 12 | 23 | 0 | 35 | 0 | [inventario/packages-bundle.md](inventario/packages-bundle.md) |
| `packages-client` | 2510 | 1645 | 865 | 0 | 2510 | 0 | [inventario/packages-client.md](inventario/packages-client.md) |
| `packages-compaction` | 33 | 20 | 13 | 0 | 27 | 6 | [inventario/packages-compaction.md](inventario/packages-compaction.md) |
| `packages-computer-use` | 4 | 3 | 1 | 0 | 0 | 4 | [inventario/packages-computer-use.md](inventario/packages-computer-use.md) |
| `packages-connector` | 78 | 42 | 36 | 0 | 0 | 78 | [inventario/packages-connector.md](inventario/packages-connector.md) |
| `packages-context` | 40 | 24 | 16 | 0 | 18 | 22 | [inventario/packages-context.md](inventario/packages-context.md) |
| `packages-core` | 148 | 61 | 86 | 1 | 148 | 0 | [inventario/packages-core.md](inventario/packages-core.md) |
| `packages-credentials` | 18 | 6 | 12 | 0 | 18 | 0 | [inventario/packages-credentials.md](inventario/packages-credentials.md) |
| `packages-deliverables` | 25 | 11 | 14 | 0 | 0 | 25 | [inventario/packages-deliverables.md](inventario/packages-deliverables.md) |
| `packages-document` | 26 | 12 | 14 | 0 | 0 | 26 | [inventario/packages-document.md](inventario/packages-document.md) |
| `packages-experimental` | 1676 | 935 | 740 | 1 | 83 | 1593 | [inventario/packages-experimental.md](inventario/packages-experimental.md) |
| `packages-extensions` | 84 | 50 | 31 | 3 | 84 | 0 | [inventario/packages-extensions.md](inventario/packages-extensions.md) |
| `packages-feedback` | 9 | 4 | 5 | 0 | 0 | 9 | [inventario/packages-feedback.md](inventario/packages-feedback.md) |
| `packages-fs` | 79 | 43 | 36 | 0 | 76 | 3 | [inventario/packages-fs.md](inventario/packages-fs.md) |
| `packages-goal` | 21 | 14 | 7 | 0 | 21 | 0 | [inventario/packages-goal.md](inventario/packages-goal.md) |
| `packages-guard` | 4 | 2 | 2 | 0 | 2 | 2 | [inventario/packages-guard.md](inventario/packages-guard.md) |
| `packages-host` | 60 | 32 | 28 | 0 | 60 | 0 | [inventario/packages-host.md](inventario/packages-host.md) |
| `packages-identity` | 2 | 1 | 1 | 0 | 0 | 2 | [inventario/packages-identity.md](inventario/packages-identity.md) |
| `packages-interaction` | 39 | 21 | 18 | 0 | 28 | 11 | [inventario/packages-interaction.md](inventario/packages-interaction.md) |
| `packages-jobs` | 23 | 12 | 11 | 0 | 23 | 0 | [inventario/packages-jobs.md](inventario/packages-jobs.md) |
| `packages-llm` | 182 | 84 | 97 | 1 | 167 | 15 | [inventario/packages-llm.md](inventario/packages-llm.md) |
| `packages-lsp` | 28 | 13 | 15 | 0 | 28 | 0 | [inventario/packages-lsp.md](inventario/packages-lsp.md) |
| `packages-mcp` | 63 | 28 | 35 | 0 | 56 | 7 | [inventario/packages-mcp.md](inventario/packages-mcp.md) |
| `packages-plan` | 8 | 4 | 4 | 0 | 8 | 0 | [inventario/packages-plan.md](inventario/packages-plan.md) |
| `packages-preset` | 27 | 12 | 15 | 0 | 27 | 0 | [inventario/packages-preset.md](inventario/packages-preset.md) |
| `packages-ptc-runtime` | 74 | 36 | 38 | 0 | 74 | 0 | [inventario/packages-ptc-runtime.md](inventario/packages-ptc-runtime.md) |
| `packages-raiz` | 1 | 1 | 0 | 0 | 0 | 1 | [inventario/packages-raiz.md](inventario/packages-raiz.md) |
| `packages-sandbox` | 56 | 24 | 32 | 0 | 56 | 0 | [inventario/packages-sandbox.md](inventario/packages-sandbox.md) |
| `packages-schedule` | 41 | 10 | 31 | 0 | 0 | 41 | [inventario/packages-schedule.md](inventario/packages-schedule.md) |
| `packages-sdk` | 48 | 16 | 32 | 0 | 48 | 0 | [inventario/packages-sdk.md](inventario/packages-sdk.md) |
| `packages-session` | 279 | 125 | 153 | 1 | 274 | 5 | [inventario/packages-session.md](inventario/packages-session.md) |
| `packages-session-query` | 52 | 29 | 23 | 0 | 52 | 0 | [inventario/packages-session-query.md](inventario/packages-session-query.md) |
| `packages-settings` | 12 | 4 | 8 | 0 | 12 | 0 | [inventario/packages-settings.md](inventario/packages-settings.md) |
| `packages-shell` | 54 | 20 | 34 | 0 | 54 | 0 | [inventario/packages-shell.md](inventario/packages-shell.md) |
| `packages-skill` | 25 | 7 | 18 | 0 | 8 | 17 | [inventario/packages-skill.md](inventario/packages-skill.md) |
| `packages-spill` | 17 | 9 | 8 | 0 | 17 | 0 | [inventario/packages-spill.md](inventario/packages-spill.md) |
| `packages-ssh` | 44 | 12 | 32 | 0 | 44 | 0 | [inventario/packages-ssh.md](inventario/packages-ssh.md) |
| `packages-storage` | 24 | 17 | 7 | 0 | 24 | 0 | [inventario/packages-storage.md](inventario/packages-storage.md) |
| `packages-subagent` | 128 | 44 | 84 | 0 | 87 | 41 | [inventario/packages-subagent.md](inventario/packages-subagent.md) |
| `packages-subprocess` | 64 | 32 | 32 | 0 | 64 | 0 | [inventario/packages-subprocess.md](inventario/packages-subprocess.md) |
| `packages-team` | 21 | 12 | 9 | 0 | 0 | 21 | [inventario/packages-team.md](inventario/packages-team.md) |
| `packages-telemetry` | 7 | 5 | 2 | 0 | 7 | 0 | [inventario/packages-telemetry.md](inventario/packages-telemetry.md) |
| `packages-terminal` | 14 | 7 | 7 | 0 | 14 | 0 | [inventario/packages-terminal.md](inventario/packages-terminal.md) |
| `packages-test-support` | 114 | 0 | 114 | 0 | 114 | 0 | [inventario/packages-test-support.md](inventario/packages-test-support.md) |
| `packages-todo` | 7 | 3 | 4 | 0 | 7 | 0 | [inventario/packages-todo.md](inventario/packages-todo.md) |
| `packages-typert` | 60 | 26 | 32 | 2 | 60 | 0 | [inventario/packages-typert.md](inventario/packages-typert.md) |
| `packages-util` | 97 | 52 | 44 | 1 | 97 | 0 | [inventario/packages-util.md](inventario/packages-util.md) |
| `packages-web` | 43 | 18 | 25 | 0 | 19 | 24 | [inventario/packages-web.md](inventario/packages-web.md) |
| `packages-workflow` | 29 | 15 | 13 | 1 | 25 | 4 | [inventario/packages-workflow.md](inventario/packages-workflow.md) |
| `packages-workspace` | 6 | 5 | 1 | 0 | 6 | 0 | [inventario/packages-workspace.md](inventario/packages-workspace.md) |
| `python` | 46 | 16 | 30 | 0 | 0 | 46 | [inventario/python.md](inventario/python.md) |
| **Total** | **8124** | **4232** | **3881** | **11** | **6006** | **2118** | |

## Mapeamento por pacote (`packages/*/*`, `apps/*`, `native/*`, `python/*`)

Cobertura de todos os **408** pacotes/módulos com código no `dsh`:

| Pacote / Módulo `dsh` | Arquivos | código | teste | gerado | Equivalente no `nycode` | Papel / Nota |
|---|---:|---:|---:|---:|---|---|
| `apps/cli` | 120 | 10 | 110 | 0 | `packages/coding-agent/src/cli/` | CLI e launcher de perfis |
| `apps/desktop` | 535 | 293 | 242 | 0 | `apps/p2-mac/` | app desktop Electron |
| `apps/desktop-host` | 17 | 11 | 6 | 0 | `apps/p2-mac/` | host Node do desktop Electron |
| `apps/desktop-publisher` | 45 | 28 | 17 | 0 | `sem equivalente` | publicador/notarizador desktop |
| `apps/plugin-market-generator` | 15 | 9 | 6 | 0 | `sem equivalente` | gerador de indice de marketplace |
| `apps/web` | 329 | 10 | 319 | 0 | `apps/p2/` | aplicacao frontend Web |
| `native/system` | 31 | 17 | 14 | 0 | `packages/tui/src/` | addon C nativo flock/pty/processo (nycode tem addons C no TUI e proper-lockfile) |
| `packages/account/deepseek-account` | 17 | 7 | 10 | 0 | `sem equivalente` | conta e login DeepSeek |
| `packages/account/deepseek-auth` | 6 | 2 | 4 | 0 | `sem equivalente` | conta e login DeepSeek |
| `packages/acp/acp` | 19 | 7 | 12 | 0 | `packages/coding-agent/src/modes/rpc/` | servidor ACP stdio (nycode usa RPC v1) |
| `packages/api/gateway` | 30 | 13 | 17 | 0 | `apps/p2/` | BFF remoto sobre Typert |
| `packages/api/job-controller` | 16 | 9 | 7 | 0 | `apps/p2/` | BFF remoto sobre Typert |
| `packages/api/remote-access` | 10 | 8 | 2 | 0 | `apps/p2/` | BFF remoto sobre Typert |
| `packages/api/remotes` | 7 | 5 | 2 | 0 | `apps/p2/` | BFF remoto sobre Typert |
| `packages/api/session-controller` | 104 | 45 | 59 | 0 | `apps/p2/` | BFF remoto sobre Typert |
| `packages/api/settings-controller` | 5 | 3 | 2 | 0 | `apps/p2/` | BFF remoto sobre Typert |
| `packages/api/terminal-controller` | 29 | 17 | 12 | 0 | `apps/p2/` | BFF remoto sobre Typert |
| `packages/api/workspace-controller` | 17 | 11 | 6 | 0 | `apps/p2/` | BFF remoto sobre Typert |
| `packages/api/workspace-files` | 27 | 10 | 17 | 0 | `apps/p2/` | BFF remoto sobre Typert |
| `packages/attachment/attachment` | 9 | 6 | 3 | 0 | `sem equivalente` | armazenamento content-addressed de imagens |
| `packages/attachment/attachment-local` | 19 | 9 | 10 | 0 | `sem equivalente` | armazenamento content-addressed de imagens |
| `packages/boot/app-boot` | 47 | 24 | 23 | 0 | `packages/coding-agent/src/core/package-manager.ts` | boot por perfis/HMR/gerenciador de plugins |
| `packages/boot/cmdline` | 2 | 1 | 1 | 0 | `packages/coding-agent/src/core/package-manager.ts` | boot por perfis/HMR/gerenciador de plugins |
| `packages/boot/config-editor` | 1 | 1 | 0 | 0 | `packages/coding-agent/src/core/package-manager.ts` | boot por perfis/HMR/gerenciador de plugins |
| `packages/boot/hmr` | 16 | 5 | 11 | 0 | `packages/coding-agent/src/core/package-manager.ts` | boot por perfis/HMR/gerenciador de plugins |
| `packages/boot/plugin-manager` | 37 | 19 | 18 | 0 | `packages/coding-agent/src/core/package-manager.ts` | boot por perfis/HMR/gerenciador de plugins |
| `packages/boot/plugin-market` | 25 | 13 | 12 | 0 | `packages/coding-agent/src/core/package-manager.ts` | boot por perfis/HMR/gerenciador de plugins |
| `packages/browser-use/browser-use` | 4 | 3 | 1 | 0 | `sem equivalente` | automacao de browser embutida |
| `packages/bundle/acp-app` | 3 | 1 | 2 | 0 | `packages/coding-agent/src/modes/rpc/` | perfil ACP |
| `packages/bundle/base` | 2 | 1 | 1 | 0 | `packages/coding-agent/src/extensions/index.ts` | camada base padrao |
| `packages/bundle/headless` | 10 | 5 | 5 | 0 | `packages/coding-agent/src/modes/print-mode.ts` | perfil headless |
| `packages/bundle/sdk-app` | 3 | 1 | 2 | 0 | `packages/coding-agent/src/core/sdk.ts` | perfil SDK |
| `packages/bundle/sdk-minimal` | 2 | 1 | 1 | 0 | `packages/coding-agent/src/extensions/headless-lean/` | perfil minimal 2-tools |
| `packages/bundle/web-app` | 15 | 3 | 12 | 0 | `apps/p2/` | bundle do Web UI |
| `packages/client/config` | 5 | 4 | 1 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/connection` | 38 | 20 | 18 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/file-upload` | 10 | 8 | 2 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/hmr` | 9 | 5 | 4 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/locale` | 27 | 19 | 8 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/modules` | 23 | 15 | 8 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/product-analytics` | 12 | 6 | 6 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/remote-connection` | 50 | 33 | 17 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/resources` | 7 | 5 | 2 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/script-realm` | 5 | 4 | 1 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/script-realm-iframe` | 6 | 4 | 2 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/shortcuts` | 24 | 14 | 10 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/store` | 4 | 3 | 1 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/tsdown.client.ts` | 1 | 1 | 0 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-account-notifications` | 17 | 10 | 7 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-action-cards` | 14 | 11 | 3 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-agent-preset` | 28 | 20 | 8 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-agent-team` | 21 | 15 | 6 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-approval` | 11 | 10 | 1 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-attachment` | 23 | 17 | 6 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-brand-official` | 13 | 10 | 3 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-chat` | 196 | 127 | 69 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-commands` | 19 | 14 | 5 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-connector-account` | 14 | 10 | 4 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-context-menu` | 19 | 13 | 6 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-conversation` | 163 | 98 | 65 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-creation-recommendations` | 12 | 9 | 3 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-deliverables` | 38 | 27 | 11 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-directory-picker-browse` | 9 | 7 | 2 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-directory-picker-native` | 6 | 4 | 2 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-dockkit` | 41 | 26 | 15 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-entry-customization` | 10 | 7 | 3 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-file-actions` | 9 | 7 | 2 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-file-drag` | 8 | 6 | 2 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-goal` | 20 | 14 | 6 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-input-trigger` | 20 | 15 | 5 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-jobs` | 11 | 8 | 3 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-layout` | 19 | 12 | 7 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-message-feedback` | 19 | 13 | 6 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-model-selection` | 16 | 12 | 4 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-open-in-app` | 30 | 19 | 11 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-permission-presets` | 17 | 12 | 5 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-plan` | 20 | 16 | 4 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-plugin-manager` | 32 | 22 | 10 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-plugin-market` | 16 | 10 | 6 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-plugin-recommendations` | 10 | 8 | 2 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-primitives` | 255 | 161 | 94 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-reference` | 13 | 8 | 5 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-renderer` | 27 | 12 | 15 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-schedule` | 83 | 58 | 25 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-secret-mask` | 17 | 12 | 5 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-session` | 5 | 4 | 1 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-session-panel` | 25 | 19 | 6 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-session-status` | 18 | 10 | 8 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-settings` | 18 | 11 | 7 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-settings-account` | 74 | 50 | 24 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-settings-agent-loop` | 10 | 7 | 3 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-settings-general` | 41 | 30 | 11 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-settings-models` | 49 | 34 | 15 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-settings-session-log` | 10 | 8 | 2 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-settings-shell` | 10 | 7 | 3 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-settings-subagent` | 17 | 14 | 3 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-settings-web-search` | 12 | 8 | 4 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-shortcuts` | 15 | 12 | 3 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-sidebar` | 22 | 13 | 9 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-sidebar-browser` | 38 | 25 | 13 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-sidebar-documentpreview` | 167 | 97 | 70 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-sidebar-files` | 47 | 23 | 24 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-sidebar-right` | 55 | 34 | 21 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-sidebar-terminal` | 27 | 19 | 8 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-skill` | 13 | 9 | 4 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-slots` | 7 | 4 | 3 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-subagent` | 20 | 16 | 4 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-theme` | 52 | 27 | 25 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-tool` | 76 | 53 | 23 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-trajectory` | 57 | 42 | 15 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-user-questions` | 23 | 14 | 9 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-workflow-run` | 10 | 8 | 2 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/ui-workspace` | 52 | 31 | 21 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/client/web` | 23 | 15 | 8 | 0 | `apps/p2/` | plugins browser/React da UI Web |
| `packages/compaction/command-compact` | 3 | 1 | 2 | 0 | `packages/coding-agent/src/extensions/comandos/` | comando /compact |
| `packages/compaction/compaction` | 8 | 6 | 2 | 0 | `packages/coding-agent/src/core/compaction/` | contrato de compactacao |
| `packages/compaction/compaction-basic` | 11 | 6 | 5 | 0 | `packages/coding-agent/src/core/compaction/` | compactacao automatica por pressao |
| `packages/compaction/compaction-image-offload` | 6 | 4 | 2 | 0 | `sem equivalente` | offload incremental de imagens em overflow |
| `packages/compaction/compaction-tool-result-pruner` | 5 | 3 | 2 | 0 | `packages/coding-agent/src/core/compaction/` | poda de tool results antigos >8192 chars |
| `packages/computer-use/computer-use` | 4 | 3 | 1 | 0 | `sem equivalente` | controle de desktop embutido |
| `packages/connector/cli-account` | 12 | 6 | 6 | 0 | `sem equivalente` | conectores Feishu/DingTalk/WeCom/Linear/Notion |
| `packages/connector/dingtalk` | 12 | 6 | 6 | 0 | `sem equivalente` | conectores Feishu/DingTalk/WeCom/Linear/Notion |
| `packages/connector/feishu` | 13 | 7 | 6 | 0 | `sem equivalente` | conectores Feishu/DingTalk/WeCom/Linear/Notion |
| `packages/connector/linear` | 3 | 2 | 1 | 0 | `sem equivalente` | conectores Feishu/DingTalk/WeCom/Linear/Notion |
| `packages/connector/notion` | 3 | 2 | 1 | 0 | `sem equivalente` | conectores Feishu/DingTalk/WeCom/Linear/Notion |
| `packages/connector/tencent-docs` | 3 | 2 | 1 | 0 | `sem equivalente` | conectores Feishu/DingTalk/WeCom/Linear/Notion |
| `packages/connector/tencent-meeting` | 13 | 7 | 6 | 0 | `sem equivalente` | conectores Feishu/DingTalk/WeCom/Linear/Notion |
| `packages/connector/upstream-skills` | 6 | 3 | 3 | 0 | `sem equivalente` | conectores Feishu/DingTalk/WeCom/Linear/Notion |
| `packages/connector/wecom` | 13 | 7 | 6 | 0 | `sem equivalente` | conectores Feishu/DingTalk/WeCom/Linear/Notion |
| `packages/context/agent-instructions` | 8 | 6 | 2 | 0 | `packages/coding-agent/src/core/resource-loader.ts` | descoberta AGENTS.md / instrucoes |
| `packages/context/file-reference` | 4 | 3 | 1 | 0 | `packages/coding-agent/src/extensions/context-imports/` | referencias @file no prompt |
| `packages/context/file-reference-local` | 4 | 2 | 2 | 0 | `packages/coding-agent/src/extensions/context-imports/` | leitor local de @file |
| `packages/context/harness-dev-context` | 2 | 1 | 1 | 0 | `packages/coding-agent/src/core/system-prompt.ts` | ponteiros de docs/checkout do harness |
| `packages/context/session-reference` | 10 | 7 | 3 | 0 | `sem equivalente` | referencia estruturada a outra sessao |
| `packages/context/time-context` | 10 | 4 | 6 | 0 | `sem equivalente` | secao dinamica de data/hora/timezone |
| `packages/context/tmux-context` | 2 | 1 | 1 | 0 | `sem equivalente` | deteccao de sessao tmux no contexto |
| `packages/core/agent` | 15 | 9 | 6 | 0 | `packages/agent/src/agent.ts` | contrato Agent / registro / eventos |
| `packages/core/agent-default-model` | 3 | 2 | 1 | 0 | `packages/coding-agent/src/core/model-config.ts` | modelo padrao de sessao |
| `packages/core/agent-loop` | 39 | 7 | 32 | 0 | `packages/agent/src/agent-loop.ts` | loop principal de turnos e steps |
| `packages/core/agent-tool-presentation` | 2 | 1 | 1 | 0 | `packages/coding-agent/src/extensions/codemode/` | alternancia native vs PTC |
| `packages/core/scope` | 5 | 3 | 2 | 0 | `packages/coding-agent/src/core/extensions/` | escopo isolado por agente (sem equivalente direto de Context/Scope) |
| `packages/core/session` | 37 | 12 | 24 | 1 | `packages/coding-agent/src/core/session-manager.ts` | log append-only e derivacao de mensagens |
| `packages/core/system-prompt` | 7 | 3 | 4 | 0 | `packages/coding-agent/src/core/system-prompt.ts` | montagem de system prompt por secoes |
| `packages/core/tool-executor-native` | 1 | 1 | 0 | 0 | `packages/agent/src/agent-loop.ts` | execucao direta de tools |
| `packages/core/tool-executor-ptc` | 17 | 12 | 5 | 0 | `packages/coding-agent/src/extensions/codemode/` | executor PTC run_code |
| `packages/core/tools` | 22 | 11 | 11 | 0 | `packages/coding-agent/src/core/tools/` | registro e pipeline de tools |
| `packages/credentials/authorization` | 4 | 2 | 2 | 0 | `packages/coding-agent/src/core/auth-storage.ts` | armazenamento e resolucao de credenciais |
| `packages/credentials/credentials` | 7 | 3 | 4 | 0 | `packages/coding-agent/src/core/auth-storage.ts` | armazenamento e resolucao de credenciais |
| `packages/credentials/credentials-local` | 7 | 1 | 6 | 0 | `packages/coding-agent/src/core/auth-storage.ts` | armazenamento e resolucao de credenciais |
| `packages/deliverables/deliverable-file-references` | 2 | 1 | 1 | 0 | `sem equivalente` | present e resumo git por turno |
| `packages/deliverables/tool-present` | 4 | 2 | 2 | 0 | `sem equivalente` | present e resumo git por turno |
| `packages/deliverables/workspace-changes` | 19 | 8 | 11 | 0 | `sem equivalente` | present e resumo git por turno |
| `packages/document/office-kit` | 19 | 8 | 11 | 0 | `sem equivalente` | conversao/render Office via LibreOffice Kit |
| `packages/document/tool-office` | 7 | 4 | 3 | 0 | `sem equivalente` | conversao/render Office via LibreOffice Kit |
| `packages/experimental/api-speech-to-text` | 5 | 3 | 2 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/auto-review` | 5 | 2 | 3 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/badge-skill-bundle` | 1 | 1 | 0 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/browser-use-chrome-devtools-mcp` | 3 | 1 | 2 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/browser-use-playwright-mcp` | 3 | 1 | 2 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/browser-use-runtime` | 10 | 3 | 7 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/browser-use-stagehand-native` | 23 | 8 | 15 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/claude-code-mods` | 50 | 24 | 26 | 0 | `packages/coding-agent/src/extensions/claude-compat/` | mods compat Claude Code |
| `packages/experimental/client-ui-claude-code-mods` | 10 | 8 | 2 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/client-ui-cot-translation` | 19 | 13 | 6 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/client-ui-forge` | 182 | 117 | 65 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/client-ui-stats` | 23 | 18 | 5 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/client-ui-voice-input` | 26 | 17 | 9 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/computer-use-cua-driver-mcp` | 5 | 1 | 4 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/computer-use-cua-driver-native` | 7 | 2 | 5 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/cot-translation-bundle` | 2 | 2 | 0 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/cua` | 54 | 32 | 22 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/cua-bundle` | 2 | 1 | 1 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/cua-macos` | 126 | 47 | 78 | 1 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/cua-mcp` | 10 | 4 | 6 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/cua-windows` | 48 | 35 | 13 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/deepseek-chat-import` | 27 | 16 | 11 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/forge` | 13 | 4 | 9 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/forge-bundle` | 2 | 2 | 0 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/forge-github` | 33 | 17 | 16 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/forge-gitlab` | 29 | 14 | 15 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/forge-session` | 13 | 6 | 7 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/hook-protocol` | 15 | 9 | 6 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/hooks-claude-code` | 9 | 2 | 7 | 0 | `packages/coding-agent/src/extensions/hooks/` | ponte de hooks Claude Code |
| `packages/experimental/hooks-codex` | 8 | 2 | 6 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/inspector` | 200 | 163 | 37 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/inspector-profile` | 2 | 1 | 1 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/liveshare` | 247 | 92 | 155 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/liveshare-protocol` | 17 | 9 | 8 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/plugin-market-bundle` | 2 | 2 | 0 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/ralph-bundle` | 1 | 1 | 0 | 0 | `packages/coding-agent/resources/ralph-loop/` | bundle ralph |
| `packages/experimental/session-inspector` | 59 | 31 | 28 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/session-search` | 1 | 1 | 0 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/session-title-all-prompts-llm` | 2 | 1 | 1 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/session-titles-bundle` | 1 | 1 | 0 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/skill-badge` | 2 | 1 | 1 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/speech-to-text` | 6 | 4 | 2 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/speech-to-text-sensevoice` | 25 | 11 | 14 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/subagent-oar` | 17 | 4 | 13 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/terminal-bundle` | 1 | 1 | 0 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/terminal-panel` | 11 | 5 | 6 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/timeline` | 83 | 49 | 34 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/tool-ralph` | 4 | 2 | 2 | 0 | `packages/coding-agent/resources/ralph-loop/` | loop ralph sobre workflow |
| `packages/experimental/tool-session-query` | 8 | 6 | 2 | 0 | `sem equivalente` | alias experimental session_query |
| `packages/experimental/tool-subagent-oar` | 2 | 1 | 1 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/tool-terminal` | 6 | 3 | 3 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/tool-worktree` | 2 | 1 | 1 | 0 | `packages/coding-agent/src/extensions/git-checkpoint/` | tools enter/exit_worktree |
| `packages/experimental/translator` | 17 | 6 | 11 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/voice-input-bundle` | 2 | 2 | 0 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/webhook` | 7 | 4 | 3 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/webhook-github` | 9 | 5 | 4 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/webworker-packer` | 16 | 9 | 7 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/webworker-runtime` | 146 | 98 | 48 | 0 | `sem equivalente` | capacidades experimentais (CUA, forge, liveshare, inspector, voice, etc.) |
| `packages/experimental/worktree` | 17 | 9 | 8 | 0 | `packages/coding-agent/src/extensions/git-checkpoint/` | gerenciamento de git worktree |
| `packages/extensions/cordis-client-runner` | 18 | 9 | 7 | 2 | `packages/coding-agent/src/extensions/` | auto-extensao/inspecao Cordis em runtime |
| `packages/extensions/cordis-host-runner` | 14 | 7 | 7 | 0 | `packages/coding-agent/src/extensions/` | auto-extensao/inspecao Cordis em runtime |
| `packages/extensions/creation-recommendations` | 10 | 5 | 5 | 0 | `packages/coding-agent/src/extensions/` | auto-extensao/inspecao Cordis em runtime |
| `packages/extensions/plugin-recommendations` | 8 | 4 | 4 | 0 | `packages/coding-agent/src/extensions/` | auto-extensao/inspecao Cordis em runtime |
| `packages/extensions/tool-cordis` | 10 | 5 | 4 | 1 | `packages/coding-agent/src/extensions/` | auto-extensao/inspecao Cordis em runtime |
| `packages/extensions/ui-cordis` | 24 | 20 | 4 | 0 | `packages/coding-agent/src/extensions/` | auto-extensao/inspecao Cordis em runtime |
| `packages/feedback/command-feedback` | 4 | 2 | 2 | 0 | `sem equivalente` | feedback humano com upload opcional |
| `packages/feedback/message-feedback` | 5 | 2 | 3 | 0 | `sem equivalente` | feedback humano com upload opcional |
| `packages/fs/fs` | 5 | 3 | 2 | 0 | `packages/coding-agent/src/core/tools/` | seam de filesystem |
| `packages/fs/fs-local` | 8 | 3 | 5 | 0 | `packages/coding-agent/src/core/tools/` | seam de filesystem |
| `packages/fs/fs-observation-policy` | 3 | 2 | 1 | 0 | `sem equivalente` | gate read-before-write/edit |
| `packages/fs/fs-patch` | 6 | 4 | 2 | 0 | `packages/coding-agent/src/core/tools/edit.ts` | aplicacao de patch estilo apply_patch |
| `packages/fs/fs-sandbox` | 4 | 2 | 2 | 0 | `packages/coding-agent/src/core/permissions/` | policy de FS por sandbox |
| `packages/fs/tool-fs` | 37 | 21 | 16 | 0 | `packages/coding-agent/src/core/tools/` | read/write/edit/apply_patch/read_image |
| `packages/fs/tool-fs-search` | 14 | 7 | 7 | 0 | `packages/coding-agent/src/core/tools/grep.ts` | glob/grep via ripgrep |
| `packages/fs/tool-str-replace-editor` | 2 | 1 | 1 | 0 | `packages/coding-agent/src/core/tools/edit.ts` | editor unificado minimal view/create/str_replace |
| `packages/goal/command-goal` | 2 | 1 | 1 | 0 | `packages/coding-agent/src/extensions/goal/` | /goal e driver de rodadas |
| `packages/goal/goal` | 11 | 7 | 4 | 0 | `packages/coding-agent/src/extensions/goal/` | /goal e driver de rodadas |
| `packages/goal/goal-round-driver` | 4 | 3 | 1 | 0 | `packages/coding-agent/src/extensions/goal/` | /goal e driver de rodadas |
| `packages/goal/tool-goal` | 4 | 3 | 1 | 0 | `packages/coding-agent/src/extensions/goal/` | /goal e driver de rodadas |
| `packages/guard/repeat-tool-reminder` | 2 | 1 | 1 | 0 | `sem equivalente` | lembrete de chamadas repetidas consecutivas |
| `packages/guard/timeout-policy` | 2 | 1 | 1 | 0 | `packages/coding-agent/src/core/bash-executor.ts` | timeout global em tools/execute |
| `packages/host/authentication-desktop` | 2 | 1 | 1 | 0 | `apps/p2/` | servicos host HTTP/web/auth |
| `packages/host/authentication-token` | 7 | 3 | 4 | 0 | `apps/p2/` | servicos host HTTP/web/auth |
| `packages/host/directory-picker` | 3 | 2 | 1 | 0 | `apps/p2/` | servicos host HTTP/web/auth |
| `packages/host/directory-picker-auto` | 5 | 3 | 2 | 0 | `apps/p2/` | servicos host HTTP/web/auth |
| `packages/host/directory-picker-browse` | 3 | 2 | 1 | 0 | `apps/p2/` | servicos host HTTP/web/auth |
| `packages/host/directory-picker-native` | 14 | 8 | 6 | 0 | `apps/p2/` | servicos host HTTP/web/auth |
| `packages/host/frontend-static` | 2 | 1 | 1 | 0 | `apps/p2/` | servicos host HTTP/web/auth |
| `packages/host/open-in-app` | 11 | 7 | 4 | 0 | `apps/p2/` | servicos host HTTP/web/auth |
| `packages/host/plugin-inventory` | 3 | 2 | 1 | 0 | `apps/p2/` | servicos host HTTP/web/auth |
| `packages/host/product-telemetry-otel` | 5 | 1 | 4 | 0 | `apps/p2/` | servicos host HTTP/web/auth |
| `packages/host/webserver` | 5 | 2 | 3 | 0 | `apps/p2/` | servicos host HTTP/web/auth |
| `packages/identity/anonymous-user-id` | 2 | 1 | 1 | 0 | `sem equivalente` | UUID anonimo de telemetria |
| `packages/interaction/action-cards` | 11 | 5 | 6 | 0 | `sem equivalente` | cartoes de acao/recomendacao |
| `packages/interaction/commands` | 6 | 4 | 2 | 0 | `packages/coding-agent/src/core/slash-commands.ts` | comandos slash humanos |
| `packages/interaction/permission-presets` | 7 | 3 | 4 | 0 | `packages/coding-agent/src/core/permissions/` | presets read-only/workspace-write/danger-full-access |
| `packages/interaction/tool-ask-user` | 3 | 2 | 1 | 0 | `packages/coding-agent/src/extensions/question/` | tool ask_user_question |
| `packages/interaction/user-approval` | 5 | 3 | 2 | 0 | `packages/coding-agent/src/core/permissions/` | aprovacao de ferramentas |
| `packages/interaction/user-questions` | 7 | 4 | 3 | 0 | `packages/coding-agent/src/extensions/question/` | seam ask_user_question |
| `packages/jobs/jobs` | 9 | 6 | 3 | 0 | `packages/coding-agent/src/extensions/processos/` | registro e controle de jobs em background |
| `packages/jobs/jobs-local` | 9 | 4 | 5 | 0 | `packages/coding-agent/src/extensions/processos/` | registro e controle de jobs em background |
| `packages/jobs/tool-jobs` | 5 | 2 | 3 | 0 | `packages/coding-agent/src/extensions/processos/` | registro e controle de jobs em background |
| `packages/llm/deepseek-llm-api-extensions` | 3 | 2 | 1 | 0 | `sem equivalente` | extensoes proprietarias da API DeepSeek |
| `packages/llm/llm` | 24 | 13 | 11 | 0 | `packages/ai/src/` | vocabulario LLM e seam de adapters |
| `packages/llm/llm-deepseek` | 64 | 29 | 35 | 0 | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek-account` | 8 | 3 | 5 | 0 | `sem equivalente` | rota autenticada por conta DeepSeek |
| `packages/llm/llm-deepseek-api-key` | 5 | 2 | 3 | 0 | `packages/ai/src/env-api-keys.ts` | resolucao de chave DeepSeek |
| `packages/llm/llm-pi-ai` | 47 | 17 | 29 | 1 | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-retry` | 9 | 4 | 5 | 0 | `packages/ai/src/utils/retry.ts` | politica de retry LLM |
| `packages/llm/plugin-package-inventory-deepseek` | 4 | 2 | 2 | 0 | `sem equivalente` | inventario de pacotes para telemetria DeepSeek |
| `packages/llm/token-meter` | 18 | 12 | 6 | 0 | `packages/coding-agent/src/core/usage-totals.ts` | medicao de tokens/replay |
| `packages/lsp/lsp` | 4 | 3 | 1 | 0 | `packages/coding-agent/src/extensions/lsp/` | LSP stdio e tool lsp |
| `packages/lsp/lsp-stdio` | 18 | 8 | 10 | 0 | `packages/coding-agent/src/extensions/lsp/` | LSP stdio e tool lsp |
| `packages/lsp/tool-lsp` | 6 | 2 | 4 | 0 | `packages/coding-agent/src/extensions/lsp/` | LSP stdio e tool lsp |
| `packages/mcp/mcp-account` | 7 | 4 | 3 | 0 | `sem equivalente` | OAuth manager UI de conectores MCP |
| `packages/mcp/mcp-client` | 46 | 19 | 27 | 0 | `packages/mcp/src/` | cliente e manager MCP |
| `packages/mcp/mcp-manager` | 6 | 2 | 4 | 0 | `packages/mcp/src/` | cliente e manager MCP |
| `packages/mcp/mcp-resources` | 4 | 3 | 1 | 0 | `packages/mcp/src/` | cliente e manager MCP |
| `packages/plan/plan-mode` | 8 | 4 | 4 | 0 | `packages/coding-agent/src/extensions/plan-mode/` | modo plano e exit_plan_mode |
| `packages/preset/agent-preset` | 4 | 3 | 1 | 0 | `packages/coding-agent/src/core/extensions/` | presets por composicao Cordis |
| `packages/preset/agent-preset-registry` | 21 | 8 | 13 | 0 | `packages/coding-agent/src/core/extensions/` | presets por composicao Cordis |
| `packages/preset/persona` | 2 | 1 | 1 | 0 | `packages/coding-agent/src/core/extensions/` | presets por composicao Cordis |
| `packages/ptc-runtime/ptc-runtime` | 6 | 4 | 2 | 0 | `packages/codemode/src/` | runtime PTC em subprocesso Node vs QuickJS-WASM |
| `packages/ptc-runtime/ptc-runtime-node` | 68 | 32 | 36 | 0 | `packages/codemode/src/` | runtime PTC em subprocesso Node vs QuickJS-WASM |
| `packages/sandbox/sandbox` | 9 | 5 | 4 | 0 | `packages/coding-agent/src/core/permissions/` | confinamento bwrap/Landlock/Seatbelt/ACL vs guard lexical |
| `packages/sandbox/sandbox-local` | 11 | 2 | 9 | 0 | `packages/coding-agent/src/core/permissions/` | confinamento bwrap/Landlock/Seatbelt/ACL vs guard lexical |
| `packages/sandbox/sandbox-policy` | 6 | 3 | 3 | 0 | `packages/coding-agent/src/core/permissions/` | confinamento bwrap/Landlock/Seatbelt/ACL vs guard lexical |
| `packages/sandbox/sandbox-windows-acl` | 30 | 14 | 16 | 0 | `packages/coding-agent/src/core/permissions/` | confinamento bwrap/Landlock/Seatbelt/ACL vs guard lexical |
| `packages/schedule/schedule` | 38 | 9 | 29 | 0 | `sem equivalente` | agendador cron/RFC 5545 embutido no harness |
| `packages/schedule/tool-schedule` | 3 | 1 | 2 | 0 | `sem equivalente` | agendador cron/RFC 5545 embutido no harness |
| `packages/sdk/client` | 15 | 6 | 9 | 0 | `packages/coding-agent/src/modes/rpc/` | SDK JSON-RPC TS |
| `packages/sdk/protocol` | 4 | 3 | 1 | 0 | `packages/coding-agent/src/modes/rpc/` | SDK JSON-RPC TS |
| `packages/sdk/server` | 29 | 7 | 22 | 0 | `packages/coding-agent/src/modes/rpc/` | SDK JSON-RPC TS |
| `packages/session-query/session-log-export` | 23 | 11 | 12 | 0 | `packages/coding-agent/src/core/session-export.ts` | exportacao HTML/JSONL |
| `packages/session-query/session-query` | 19 | 13 | 6 | 0 | `packages/coding-agent/src/cli/session-picker.ts` | busca FTS5 e rastreio cross-session |
| `packages/session-query/session-query-sqlite` | 6 | 3 | 3 | 0 | `packages/coding-agent/src/cli/session-picker.ts` | busca FTS5 e rastreio cross-session |
| `packages/session-query/tool-session-list` | 4 | 2 | 2 | 0 | `packages/coding-agent/src/cli/session-picker.ts` | busca FTS5 e rastreio cross-session |
| `packages/session/message-quotes` | 15 | 10 | 5 | 0 | `packages/coding-agent/src/core/session-manager.ts` | infraestrutura de sessao |
| `packages/session/session-checkpoint-policy` | 4 | 1 | 3 | 0 | `packages/coding-agent/src/core/session-manager.ts` | flush antes de request/tool |
| `packages/session/session-format` | 13 | 9 | 4 | 0 | `packages/coding-agent/src/core/session-manager.ts` | versionamento e migracao v0->v4 |
| `packages/session/session-format-catalog` | 12 | 6 | 5 | 1 | `packages/coding-agent/src/core/session-manager.ts` | versionamento e migracao v0->v4 |
| `packages/session/session-format-v0-to-v1` | 16 | 11 | 5 | 0 | `packages/coding-agent/src/core/session-manager.ts` | versionamento e migracao v0->v4 |
| `packages/session/session-format-v1-to-v2` | 10 | 7 | 3 | 0 | `packages/coding-agent/src/core/session-manager.ts` | versionamento e migracao v0->v4 |
| `packages/session/session-format-v2-to-v3` | 16 | 7 | 9 | 0 | `packages/coding-agent/src/core/session-manager.ts` | versionamento e migracao v0->v4 |
| `packages/session/session-format-v3-to-v4` | 38 | 18 | 20 | 0 | `packages/coding-agent/src/core/session-manager.ts` | versionamento e migracao v0->v4 |
| `packages/session/session-log-deepseek` | 5 | 2 | 3 | 0 | `sem equivalente` | envio incremental de log de sessao para DeepSeek |
| `packages/session/session-persistence` | 8 | 5 | 3 | 0 | `packages/coding-agent/src/core/session-manager.ts` | persistencia JSONL / SQLite |
| `packages/session/session-persistence-jsonl` | 42 | 14 | 28 | 0 | `packages/coding-agent/src/core/session-manager.ts` | persistencia JSONL / SQLite |
| `packages/session/session-persistence-sqlite` | 40 | 10 | 30 | 0 | `packages/coding-agent/src/core/session-manager.ts` | persistencia JSONL / SQLite |
| `packages/session/session-projection` | 10 | 2 | 8 | 0 | `packages/coding-agent/src/core/session-manager.ts` | projecoes puras sobre log |
| `packages/session/session-projection-cache` | 4 | 2 | 2 | 0 | `packages/coding-agent/src/core/session-manager.ts` | projecoes puras sobre log |
| `packages/session/session-stats` | 6 | 4 | 2 | 0 | `packages/coding-agent/src/core/usage-totals.ts` | estatisticas de sessao |
| `packages/session/session-telemetry` | 4 | 2 | 2 | 0 | `packages/telemetry/src/` | telemetria outbound de sessao |
| `packages/session/session-telemetry-otel` | 6 | 1 | 5 | 0 | `packages/telemetry/src/` | telemetria outbound de sessao |
| `packages/session/session-title` | 11 | 4 | 7 | 0 | `packages/coding-agent/src/extensions/session-title/` | titulo automatico de sessao |
| `packages/session/session-title-first-prompt-llm` | 4 | 1 | 3 | 0 | `packages/coding-agent/src/extensions/session-title/` | titulo automatico de sessao |
| `packages/session/session-title-llm` | 2 | 1 | 1 | 0 | `packages/coding-agent/src/extensions/session-title/` | titulo automatico de sessao |
| `packages/session/session-turn-outline` | 6 | 4 | 2 | 0 | `packages/coding-agent/src/core/session-manager.ts` | infraestrutura de sessao |
| `packages/session/tool-session-control` | 2 | 1 | 1 | 0 | `packages/coding-agent/src/core/session-manager.ts` | infraestrutura de sessao |
| `packages/session/working-directory` | 5 | 3 | 2 | 0 | `packages/coding-agent/src/core/session-cwd.ts` | diretorio de trabalho da sessao |
| `packages/settings/settings` | 12 | 4 | 8 | 0 | `packages/coding-agent/src/core/settings-manager.ts` | configuracoes em camadas |
| `packages/shell/bash-local` | 3 | 1 | 2 | 0 | `packages/coding-agent/src/core/bash-executor.ts` | executor e tools shell |
| `packages/shell/bash-sandbox` | 10 | 2 | 8 | 0 | `packages/coding-agent/src/core/permissions/` | execucao bash sob sandbox |
| `packages/shell/pwsh-local` | 4 | 2 | 2 | 0 | `packages/coding-agent/src/core/tools/powershell.ts` | execucao PowerShell |
| `packages/shell/pwsh-sandbox` | 5 | 2 | 3 | 0 | `packages/coding-agent/src/core/tools/powershell.ts` | execucao PowerShell |
| `packages/shell/shell` | 5 | 3 | 2 | 0 | `packages/coding-agent/src/core/bash-executor.ts` | executor e tools shell |
| `packages/shell/shell-env` | 3 | 2 | 1 | 0 | `packages/coding-agent/src/core/bash-executor.ts` | executor e tools shell |
| `packages/shell/tool-bash` | 7 | 3 | 4 | 0 | `packages/coding-agent/src/core/bash-executor.ts` | executor e tools shell |
| `packages/shell/tool-bash-persistent` | 3 | 1 | 2 | 0 | `packages/coding-agent/src/core/bash-executor.ts` | executor e tools shell |
| `packages/shell/tool-pwsh` | 9 | 3 | 6 | 0 | `packages/coding-agent/src/core/tools/powershell.ts` | tool pwsh |
| `packages/shell/tool-pwsh-persistent` | 5 | 1 | 4 | 0 | `packages/coding-agent/src/core/tools/powershell.ts` | tool pwsh |
| `packages/skill/skill` | 3 | 2 | 1 | 0 | `packages/coding-agent/src/core/skills.ts` | catalogo e carregamento de skills |
| `packages/skill/skill-filesystem` | 3 | 1 | 2 | 0 | `packages/coding-agent/src/core/skills.ts` | catalogo e carregamento de skills |
| `packages/skill/skill-office` | 13 | 1 | 12 | 0 | `sem equivalente` | skills embutidas de Office |
| `packages/skill/tool-skill` | 2 | 1 | 1 | 0 | `packages/coding-agent/src/core/skills.ts` | catalogo e carregamento de skills |
| `packages/skill/tool-workspace-dependencies` | 4 | 2 | 2 | 0 | `sem equivalente` | deps Python para skills |
| `packages/spill/spill` | 3 | 2 | 1 | 0 | `packages/coding-agent/src/core/tools/truncate.ts` | spill em arquivo vs truncamento de saída |
| `packages/spill/spill-local` | 5 | 3 | 2 | 0 | `packages/coding-agent/src/core/tools/truncate.ts` | spill em arquivo vs truncamento de saída |
| `packages/spill/spill-policy` | 9 | 4 | 5 | 0 | `packages/coding-agent/src/core/tools/truncate.ts` | spill em arquivo vs truncamento de saída |
| `packages/ssh/fs-ssh` | 2 | 1 | 1 | 0 | `packages/env/src/` | execucao/FS/sandbox via SSH |
| `packages/ssh/sandbox-ssh` | 2 | 1 | 1 | 0 | `packages/env/src/` | execucao/FS/sandbox via SSH |
| `packages/ssh/ssh` | 30 | 8 | 22 | 0 | `packages/env/src/` | execucao/FS/sandbox via SSH |
| `packages/ssh/ssh-helper-runtime` | 4 | 1 | 3 | 0 | `packages/env/src/` | execucao/FS/sandbox via SSH |
| `packages/ssh/subprocess-ssh` | 6 | 1 | 5 | 0 | `packages/env/src/` | execucao/FS/sandbox via SSH |
| `packages/storage/storage` | 6 | 4 | 2 | 0 | `packages/durable/src/` | storage KV/domain/SQLite |
| `packages/storage/storage-domain` | 7 | 5 | 2 | 0 | `packages/durable/src/` | storage KV/domain/SQLite |
| `packages/storage/storage-json` | 7 | 5 | 2 | 0 | `packages/durable/src/` | storage KV/domain/SQLite |
| `packages/storage/storage-sqlite` | 4 | 3 | 1 | 0 | `packages/durable/src/` | storage KV/domain/SQLite |
| `packages/subagent/subagent` | 55 | 22 | 33 | 0 | `packages/coding-agent/src/extensions/subagent/` | registro e contrato de subagentes |
| `packages/subagent/subagent-acp` | 8 | 2 | 6 | 0 | `sem equivalente` | subagente sobre ACP |
| `packages/subagent/subagent-claude-code` | 10 | 3 | 7 | 0 | `sem equivalente` | backend externo Claude Code |
| `packages/subagent/subagent-codex` | 13 | 3 | 10 | 0 | `sem equivalente` | backend externo Codex |
| `packages/subagent/subagent-dsh-sdk` | 10 | 2 | 8 | 0 | `sem equivalente` | subagente via SDK |
| `packages/subagent/subagent-fork-in-process` | 4 | 1 | 3 | 0 | `packages/coding-agent/src/extensions/subagent/` | fork de sessao em subagente |
| `packages/subagent/subagent-spawn-in-process` | 4 | 1 | 3 | 0 | `packages/coding-agent/src/extensions/subagent/` | spawn em processo vs filho OS no nycode |
| `packages/subagent/tool-subagent` | 16 | 7 | 9 | 0 | `packages/coding-agent/src/extensions/subagent/` | tool subagent / subagent_fork |
| `packages/subagent/tool-subagent-control` | 8 | 3 | 5 | 0 | `packages/coding-agent/src/extensions/subagent/` | send_message / wait_agent / list_agents / interrupt_agent |
| `packages/subprocess/subprocess` | 9 | 5 | 4 | 0 | `packages/coding-agent/src/core/exec.ts` | processos filhos / arvore de processos |
| `packages/subprocess/subprocess-local` | 40 | 19 | 21 | 0 | `packages/coding-agent/src/core/exec.ts` | processos filhos / arvore de processos |
| `packages/subprocess/win32-process` | 15 | 8 | 7 | 0 | `packages/coding-agent/src/core/exec.ts` | processos filhos / arvore de processos |
| `packages/team/agent-team` | 19 | 11 | 8 | 0 | `sem equivalente` | task board DAG compartilhado entre subagentes |
| `packages/team/tool-agent-team` | 2 | 1 | 1 | 0 | `sem equivalente` | task board DAG compartilhado entre subagentes |
| `packages/telemetry/otel` | 7 | 5 | 2 | 0 | `packages/telemetry/src/` | contratos/canais OTel |
| `packages/terminal/terminal` | 4 | 3 | 1 | 0 | `packages/coding-agent/src/extensions/processos/` | terminais PTY persistentes |
| `packages/terminal/terminal-bash` | 10 | 4 | 6 | 0 | `packages/coding-agent/src/extensions/processos/` | terminais PTY persistentes |
| `packages/test-support/agent-loop-testkit` | 5 | 0 | 5 | 0 | `packages/coding-agent/test/suite/harness.ts` | testkits e replay sem API real |
| `packages/test-support/client-runtime` | 35 | 0 | 35 | 0 | `packages/coding-agent/test/suite/harness.ts` | testkits e replay sem API real |
| `packages/test-support/llm-mock-server` | 6 | 0 | 6 | 0 | `packages/coding-agent/test/suite/harness.ts` | testkits e replay sem API real |
| `packages/test-support/llm-replay` | 4 | 0 | 4 | 0 | `packages/coding-agent/test/suite/harness.ts` | testkits e replay sem API real |
| `packages/test-support/loader-smoke` | 11 | 0 | 11 | 0 | `packages/coding-agent/test/suite/harness.ts` | testkits e replay sem API real |
| `packages/test-support/remote-mock` | 11 | 0 | 11 | 0 | `packages/coding-agent/test/suite/harness.ts` | testkits e replay sem API real |
| `packages/test-support/session-snapshot` | 40 | 0 | 40 | 0 | `packages/coding-agent/test/suite/harness.ts` | testkits e replay sem API real |
| `packages/test-support/tool-testkit` | 2 | 0 | 2 | 0 | `packages/coding-agent/test/suite/harness.ts` | testkits e replay sem API real |
| `packages/todo/tool-todo` | 7 | 3 | 4 | 0 | `packages/coding-agent/src/extensions/todo/` | tool todo_write |
| `packages/tsdown.worker.ts` | 1 | 1 | 0 | 0 | `sem equivalente` | worker de empacotamento tsdown |
| `packages/typert/generator` | 36 | 12 | 22 | 2 | `packages/chord/src/` | RPC tipado / runtime de objetos remoto |
| `packages/typert/loader` | 3 | 1 | 2 | 0 | `packages/chord/src/` | RPC tipado / runtime de objetos remoto |
| `packages/typert/protocol` | 15 | 8 | 7 | 0 | `packages/chord/src/` | RPC tipado / runtime de objetos remoto |
| `packages/typert/registry` | 6 | 5 | 1 | 0 | `packages/chord/src/` | RPC tipado / runtime de objetos remoto |
| `packages/util/atomic-write` | 2 | 1 | 1 | 0 | `packages/coding-agent/src/utils/` | utilitarios compartilhados |
| `packages/util/brand` | 2 | 1 | 1 | 0 | `packages/coding-agent/src/utils/` | utilitarios compartilhados |
| `packages/util/chunked-list` | 2 | 1 | 1 | 0 | `packages/coding-agent/src/utils/` | utilitarios compartilhados |
| `packages/util/code-language` | 2 | 1 | 1 | 0 | `packages/coding-agent/src/utils/` | utilitarios compartilhados |
| `packages/util/crypto` | 2 | 1 | 1 | 0 | `packages/coding-agent/src/utils/` | utilitarios compartilhados |
| `packages/util/deque` | 3 | 2 | 1 | 0 | `packages/coding-agent/src/utils/` | utilitarios compartilhados |
| `packages/util/error` | 2 | 1 | 1 | 0 | `packages/coding-agent/src/utils/` | utilitarios compartilhados |
| `packages/util/file-drag` | 2 | 1 | 1 | 0 | `packages/coding-agent/src/utils/` | utilitarios compartilhados |
| `packages/util/home-paths` | 2 | 1 | 1 | 0 | `packages/coding-agent/src/utils/` | utilitarios compartilhados |
| `packages/util/http-proxy` | 7 | 3 | 4 | 0 | `packages/coding-agent/src/utils/` | utilitarios compartilhados |
| `packages/util/launch-environment` | 2 | 1 | 1 | 0 | `packages/coding-agent/src/utils/` | utilitarios compartilhados |
| `packages/util/lazy-require` | 3 | 1 | 2 | 0 | `packages/coding-agent/src/utils/` | utilitarios compartilhados |
| `packages/util/native-command` | 16 | 9 | 7 | 0 | `packages/coding-agent/src/utils/` | utilitarios compartilhados |
| `packages/util/official-bundles` | 5 | 3 | 1 | 1 | `packages/coding-agent/src/utils/` | utilitarios compartilhados |
| `packages/util/output-retention` | 2 | 1 | 1 | 0 | `packages/coding-agent/src/utils/` | utilitarios compartilhados |
| `packages/util/package-manifest` | 3 | 3 | 0 | 0 | `packages/coding-agent/src/utils/` | utilitarios compartilhados |
| `packages/util/plugin-detail` | 7 | 5 | 2 | 0 | `packages/coding-agent/src/utils/` | utilitarios compartilhados |
| `packages/util/plugin-market-index` | 5 | 3 | 2 | 0 | `packages/coding-agent/src/utils/` | utilitarios compartilhados |
| `packages/util/ripgrep` | 3 | 1 | 2 | 0 | `packages/coding-agent/src/utils/` | utilitarios compartilhados |
| `packages/util/text-search` | 2 | 1 | 1 | 0 | `packages/coding-agent/src/utils/` | utilitarios compartilhados |
| `packages/util/time` | 12 | 6 | 6 | 0 | `packages/coding-agent/src/utils/` | utilitarios compartilhados |
| `packages/util/timeout` | 2 | 1 | 1 | 0 | `packages/coding-agent/src/utils/` | utilitarios compartilhados |
| `packages/util/values` | 4 | 2 | 2 | 0 | `packages/coding-agent/src/utils/` | utilitarios compartilhados |
| `packages/util/workspace-path` | 5 | 2 | 3 | 0 | `packages/coding-agent/src/utils/` | utilitarios compartilhados |
| `packages/web/tool-web` | 9 | 5 | 4 | 0 | `packages/coding-agent/src/extensions/web/` | web_search e web_fetch SSRF-safe |
| `packages/web/web` | 3 | 2 | 1 | 0 | `packages/coding-agent/src/extensions/web/` | web_search e web_fetch SSRF-safe |
| `packages/web/web-deepseek-api` | 16 | 4 | 12 | 0 | `sem equivalente` | search/fetch via API DeepSeek |
| `packages/web/web-fetch-http` | 7 | 4 | 3 | 0 | `packages/coding-agent/src/extensions/web/` | web_search e web_fetch SSRF-safe |
| `packages/web/web-search-deepseek` | 8 | 3 | 5 | 0 | `sem equivalente` | provider DeepSeek Search |
| `packages/workflow/tool-workflow` | 4 | 3 | 1 | 0 | `sem equivalente` | tool workflow programatica |
| `packages/workflow/workflow` | 4 | 3 | 1 | 0 | `packages/durable/src/` | seam de workflow |
| `packages/workflow/workflow-ptc` | 21 | 9 | 11 | 1 | `packages/codemode/src/` | orquestracao programatica de subagentes via PTC |
| `packages/workspace/workspace` | 6 | 5 | 1 | 0 | `apps/p2/plugins/` | entidade workspace |
| `python/sdk` | 42 | 12 | 30 | 0 | `sem equivalente` | SDK Python cliente |
| `python/sdk-runtime` | 4 | 4 | 0 | 0 | `sem equivalente` | wheel runtime empacotando CLI dsh |
