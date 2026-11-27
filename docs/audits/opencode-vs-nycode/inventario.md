# Inventario OpenCode -> nycode

Cada arquivo de codigo do OpenCode v2.4.2 (`fc31a485317970bcf6be7b431a9830aaef875731`) tem uma linha nos arquivos
`inventario/<grupo>.md`, com o dono no nycode (`00fed2ae615016b328ebfb48bfaa49814bf1dbc4`) ou `sem equivalente`.

## Metodo

- Universo: `git -C ~/source/opencode-ref ls-files` filtrado pela regex de extensoes de codigo
  `\.(ts|tsx|js|jsx|mjs|cjs|mts|cts|rs|go|py|sh|swift|kt|java|zig|c|h|cpp|lua|luau|nix|bash|ps1|astro|svelte|vue|scm|sql)$`.
  Documentacao (`.md`, `.mdx`), dados (`.json`, `.yml`), estilos e midia ficam fora.
- Categoria: `vendor` (caminho com `/vendor/`), `gerado` (`/generated/`, `*.gen.ts`, migracoes drizzle em
  `packages/core/src/database/migration/`, `sst-env.d.ts`, tipos de icones gerados, `nix/node_modules.nix`), `teste`
  (diretorios de teste/e2e/parity/fixtures ou `*.test.*`/`*.spec.*`), senao `codigo`. Gerados e vendor sao listados mas
  excluidos da analise.
- Dono: regras deterministicas abaixo (prefixo mais especifico primeiro). Providers de `packages/ai/src/providers/<x>`
  so recebem dono se `packages/ai/src/providers/<x>.ts` existir no nycode. O gerador falha se algum arquivo ficar sem
  regra ou se um dono apontar para caminho inexistente no nycode.
- O dono e o modulo nycode que responde pela mesma responsabilidade; nao afirma paridade de comportamento. Paridade e
  diferencas concretas estao em `matriz.md` e `achados/`, sempre com arquivo:linha.

## Contagem

Total: 8809 arquivos de codigo (codigo 5778, teste 2930, gerado 96, vendor 5).
Com dono no nycode: 4924; sem equivalente: 3885.

Verificacao (deve imprimir dois numeros iguais):

```bash
git -C ~/source/opencode-ref ls-files | grep -cE '\.(ts|tsx|js|jsx|mjs|cjs|mts|cts|rs|go|py|sh|swift|kt|java|zig|c|h|cpp|lua|luau|nix|bash|ps1|astro|svelte|vue|scm|sql)$'
cat docs/audits/opencode-vs-nycode/inventario/*.md | grep -c '^| `'
```

| Grupo | Arquivos | codigo | teste | gerado | vendor | Sem equivalente | Detalhe |
|---|---:|---:|---:|---:|---:|---:|---|
| packages-ai | 505 | 282 | 223 | 0 | 0 | 56 | [inventario/packages-ai.md](inventario/packages-ai.md) |
| packages-app | 1291 | 783 | 507 | 1 | 0 | 0 | [inventario/packages-app.md](inventario/packages-app.md) |
| packages-cli | 220 | 147 | 73 | 0 | 0 | 40 | [inventario/packages-cli.md](inventario/packages-cli.md) |
| packages-cli-rs | 1360 | 630 | 723 | 7 | 0 | 1360 | [inventario/packages-cli-rs.md](inventario/packages-cli-rs.md) |
| packages-client | 68 | 31 | 30 | 7 | 0 | 0 | [inventario/packages-client.md](inventario/packages-client.md) |
| packages-codemode | 27 | 16 | 11 | 0 | 0 | 0 | [inventario/packages-codemode.md](inventario/packages-codemode.md) |
| packages-core | 1010 | 505 | 438 | 67 | 0 | 180 | [inventario/packages-core.md](inventario/packages-core.md) |
| packages-data | 147 | 129 | 18 | 0 | 0 | 147 | [inventario/packages-data.md](inventario/packages-data.md) |
| packages-desktop | 260 | 181 | 78 | 1 | 0 | 0 | [inventario/packages-desktop.md](inventario/packages-desktop.md) |
| packages-effect-drizzle-sqlite | 1 | 1 | 0 | 0 | 0 | 1 | [inventario/packages-effect-drizzle-sqlite.md](inventario/packages-effect-drizzle-sqlite.md) |
| packages-gui-plugins | 1264 | 1062 | 202 | 0 | 0 | 1264 | [inventario/packages-gui-plugins.md](inventario/packages-gui-plugins.md) |
| packages-http-recorder | 22 | 17 | 5 | 0 | 0 | 22 | [inventario/packages-http-recorder.md](inventario/packages-http-recorder.md) |
| packages-httpapi-codegen | 12 | 1 | 4 | 7 | 0 | 12 | [inventario/packages-httpapi-codegen.md](inventario/packages-httpapi-codegen.md) |
| packages-latex | 14 | 8 | 6 | 0 | 0 | 0 | [inventario/packages-latex.md](inventario/packages-latex.md) |
| packages-merman | 89 | 63 | 26 | 0 | 0 | 89 | [inventario/packages-merman.md](inventario/packages-merman.md) |
| packages-nav-menus | 5 | 3 | 2 | 0 | 0 | 5 | [inventario/packages-nav-menus.md](inventario/packages-nav-menus.md) |
| packages-patchmark | 16 | 9 | 7 | 0 | 0 | 16 | [inventario/packages-patchmark.md](inventario/packages-patchmark.md) |
| packages-plugin | 94 | 90 | 4 | 0 | 0 | 0 | [inventario/packages-plugin.md](inventario/packages-plugin.md) |
| packages-plugin-browser | 23 | 15 | 8 | 0 | 0 | 23 | [inventario/packages-plugin-browser.md](inventario/packages-plugin-browser.md) |
| packages-plugins | 11 | 11 | 0 | 0 | 0 | 11 | [inventario/packages-plugins.md](inventario/packages-plugins.md) |
| packages-process-daemon | 43 | 31 | 12 | 0 | 0 | 43 | [inventario/packages-process-daemon.md](inventario/packages-process-daemon.md) |
| packages-protocol | 57 | 51 | 6 | 0 | 0 | 0 | [inventario/packages-protocol.md](inventario/packages-protocol.md) |
| packages-schema | 131 | 112 | 19 | 0 | 0 | 0 | [inventario/packages-schema.md](inventario/packages-schema.md) |
| packages-script | 5 | 3 | 2 | 0 | 0 | 0 | [inventario/packages-script.md](inventario/packages-script.md) |
| packages-sdk | 29 | 18 | 11 | 0 | 0 | 0 | [inventario/packages-sdk.md](inventario/packages-sdk.md) |
| packages-server | 127 | 68 | 59 | 0 | 0 | 0 | [inventario/packages-server.md](inventario/packages-server.md) |
| packages-session-ui | 296 | 188 | 108 | 0 | 0 | 0 | [inventario/packages-session-ui.md](inventario/packages-session-ui.md) |
| packages-simulation | 25 | 15 | 10 | 0 | 0 | 0 | [inventario/packages-simulation.md](inventario/packages-simulation.md) |
| packages-stories | 31 | 31 | 0 | 0 | 0 | 31 | [inventario/packages-stories.md](inventario/packages-stories.md) |
| packages-theme | 14 | 13 | 1 | 0 | 0 | 0 | [inventario/packages-theme.md](inventario/packages-theme.md) |
| packages-tui | 530 | 305 | 225 | 0 | 0 | 0 | [inventario/packages-tui.md](inventario/packages-tui.md) |
| packages-ui | 336 | 287 | 44 | 5 | 0 | 0 | [inventario/packages-ui.md](inventario/packages-ui.md) |
| packages-util | 72 | 49 | 23 | 0 | 0 | 0 | [inventario/packages-util.md](inventario/packages-util.md) |
| raiz | 97 | 93 | 0 | 1 | 3 | 8 | [inventario/raiz.md](inventario/raiz.md) |
| sdks-vscode | 4 | 4 | 0 | 0 | 0 | 4 | [inventario/sdks-vscode.md](inventario/sdks-vscode.md) |
| services-data | 6 | 6 | 0 | 0 | 0 | 6 | [inventario/services-data.md](inventario/services-data.md) |
| services-files | 1 | 1 | 0 | 0 | 0 | 1 | [inventario/services-files.md](inventario/services-files.md) |
| services-legacy | 7 | 5 | 2 | 0 | 0 | 7 | [inventario/services-legacy.md](inventario/services-legacy.md) |
| services-site | 552 | 508 | 42 | 0 | 2 | 552 | [inventario/services-site.md](inventario/services-site.md) |
| services-update | 7 | 6 | 1 | 0 | 0 | 7 | [inventario/services-update.md](inventario/services-update.md) |
| **Total** | **8809** | 5778 | 2930 | 96 | 5 | 3885 | |

## Leitura por modulo

`sem equivalente` e um resultado, nao uma lacuna de inventario. Os grupos sem equivalente em massa sao produtos que o
nycode nao tem: cliente Rust (`packages/cli-rs`), plugins de GUI desktop (`packages/gui-plugins`), app de dados
(`packages/data`), site (`services/site`). Eles nao viram achados de harness; ver `rejeitados.md`.

### Regras de dono: `packages/core/src` por prefixo (antes da tabela por segmento)

| Prefixo | Dono nycode | Nota |
|---|---|---|
| `plugin/provider/` | packages/ai/src/providers/ | provedores como plugins |
| `plugin/goal` | packages/coding-agent/src/extensions/goal/ | /goal |
| `plugin/home-memory` | packages/coding-agent/src/extensions/memory/ | memoria |
| `plugin/plan` | packages/coding-agent/src/extensions/plan-mode/ | modo plano |
| `plugin/websearch/` | packages/coding-agent/src/extensions/web/ | provedores de busca web |
| `plugin/vcs/` | packages/coding-agent/src/extensions/git-checkpoint/ | VCS git/hg |
| `plugin/mcp-` | packages/coding-agent/src/extensions/mcp/ | MCP |
| `plugin/skill` | packages/coding-agent/src/core/skills.ts | skills |
| `plugin/tool-input-repair` | sem equivalente | reparo de input de tool |
| `plugin/verbosity` | sem equivalente | verbosidade da TUI |
| `plugin/models-dev` | packages/ai/src/model-catalog.ts | models.dev |
| `plugin/command` | packages/coding-agent/src/core/slash-commands.ts | comandos |
| `plugin/agent` | packages/coding-agent/src/extensions/subagent/ | agentes |
| `plugin/warming` | packages/ai/src/cache-warming.ts | aquecimento de cache |
| `config/plugin/agent` | packages/coding-agent/src/extensions/subagent/ | config de agentes |
| `config/plugin/command` | packages/coding-agent/src/core/prompt-templates.ts | config de comandos |
| `config/plugin/compaction` | packages/coding-agent/src/core/compaction/ | config de compactacao |
| `config/plugin/mcp` | packages/coding-agent/src/core/mcp-servers.ts | config MCP |
| `config/plugin/skill` | packages/coding-agent/src/core/skills.ts | config de skills |
| `config/plugin/snapshot` | packages/coding-agent/src/extensions/git-checkpoint/ | config de snapshots |
| `config/plugin/tool-output` | packages/coding-agent/src/core/tools/truncate.ts | config de truncamento |
| `config/plugin/policy` | packages/coding-agent/src/core/permissions/ | politica |
| `config/plugin/instruction` | packages/coding-agent/src/core/resource-loader.ts | instrucoes |
| `config/plugin/provider` | packages/coding-agent/src/core/model-registry.ts | provedores |
| `config/plugin/websearch` | packages/coding-agent/src/extensions/web/ | busca web |
| `config/plugin/worktree` | sem equivalente | worktrees |
| `config/plugin/formatter` | sem equivalente | formatadores |
| `session/compaction` | packages/coding-agent/src/core/compaction/ | compactacao |
| `session/runner/` | packages/agent/src/agent-loop.ts | loop do agente |
| `session/model-` | packages/agent/src/agent-loop.ts | requisicao ao modelo |
| `session/run-coordinator` | packages/agent/src/agent.ts | coordenacao de runs |
| `session/system-prompt` | packages/coding-agent/src/core/system-prompt.ts | prompt de sistema |
| `session/instruction` | packages/coding-agent/src/core/resource-loader.ts | entradas de instrucao |
| `session/cwd` | packages/coding-agent/src/core/session-cwd.ts | cwd da sessao |
| `session/title` | packages/coding-agent/src/extensions/session-title/ | titulo |
| `session/search` | packages/coding-agent/src/cli/session-picker.ts | busca de sessoes |
| `session/move` | packages/coding-agent/src/core/session-export.ts | mover sessao |
| `session/transfer` | packages/coding-agent/src/core/session-export.ts | export/import |
| `session/revert` | packages/coding-agent/src/core/session-manager.ts | revert (arvore de sessao) |
| `session/subagent` | packages/coding-agent/src/extensions/subagent/ | subagentes |
| `session/background` | packages/coding-agent/src/extensions/subagent/ | background |
| `session/inbox` | packages/coding-agent/src/extensions/subagent/ | inbox de resultados |
| `session/execution` | packages/coding-agent/src/extensions/subagent/ | execucao/relatorio de subagente |
| `session/stats` | packages/coding-agent/src/core/usage-totals.ts | estatisticas |
| `session/usage` | packages/coding-agent/src/core/usage-totals.ts | uso |
| `session/store` | packages/coding-agent/src/core/session-manager.ts | armazenamento |
| `session/sql` | packages/coding-agent/src/core/session-manager.ts | armazenamento |
| `session/blob` | packages/coding-agent/src/core/session-manager.ts | blobs |
| `session/history` | packages/coding-agent/src/core/session-manager.ts | historico |
| `session/projector` | packages/coding-agent/src/core/session-manager.ts | projecao de eventos |
| `session/shell` | packages/coding-agent/src/core/bash-executor.ts | shell do usuario |
| `session/skill` | packages/coding-agent/src/core/skills.ts | skill na sessao |
| `session/to-session-error` | packages/coding-agent/src/core/agent-session.ts | erros |
| `session/error` | packages/coding-agent/src/core/agent-session.ts | erros |
| `shell/permissions` | packages/coding-agent/src/core/permissions/guard/bash/ | permissao de shell |
| `shell/parse` | packages/coding-agent/src/core/permissions/guard/lex/ | parser de shell |
| `shell/scan` | packages/coding-agent/src/core/permissions/guard/bash/ | scanner de shell |
| `tool/plugin/subagent` | packages/coding-agent/src/extensions/subagent/ | tool subagent |
| `tool/plugin/todo` | packages/coding-agent/src/extensions/todo/ | tool todo |
| `tool/plugin/question` | packages/coding-agent/src/extensions/question/ | tool question |
| `tool/plugin/webfetch` | packages/coding-agent/src/extensions/web/ | tool webfetch |
| `tool/plugin/websearch` | packages/coding-agent/src/extensions/web/ | tool websearch |
| `tool/plugin/skill` | packages/coding-agent/src/core/skills.ts | tool skill |
| `tool/plugin/edit` | packages/coding-agent/src/core/tools/edit.ts | tool edit |
| `tool/plugin/patch` | packages/coding-agent/src/core/tools/edit.ts | tool patch (sem equivalente direto) |
| `tool/plugin/write` | packages/coding-agent/src/core/tools/write.ts | tool write |
| `tool/plugin/read` | packages/coding-agent/src/core/tools/read.ts | tool read |
| `tool/read-filesystem` | packages/coding-agent/src/core/tools/read.ts | leitura |
| `tool/plugin/glob` | packages/coding-agent/src/core/tools/find.ts | tool glob |
| `tool/plugin/grep` | packages/coding-agent/src/core/tools/grep.ts | tool grep |
| `tool/plugin/shell` | packages/coding-agent/src/core/tools/bash.ts | tool shell |
| `tool/plugin/cd` | packages/coding-agent/src/core/cwd-switch/ | tool cd |
| `tool/plugin/automation` | sem equivalente | tool automation |
| `tool/plugin/mcp` | packages/coding-agent/src/extensions/mcp/ | tools MCP |
| `tool/mcp` | packages/coding-agent/src/extensions/mcp/ | tools MCP |
| `tool/search` | packages/coding-agent/src/extensions/tool-search/ | busca de tools |
| `tool/plugin/session-` | sem equivalente | tools de sessao para o modelo |
| `tool/plugin/opencode` | sem equivalente | tools opencode.* (Code Mode) |
| `tool/plugin/machine` | sem equivalente | tool machine |
| `tool/plugin/artifact` | sem equivalente | tool artifact |
| `tool/plugin/image-generate` | sem equivalente | geracao de imagem |
| `tool/plugin/video-generate` | sem equivalente | geracao de video |
| `tool/plugin/file-diff` | packages/coding-agent/src/core/tools/edit-diff.ts | diff |
| `tool/html-markdown` | packages/coding-agent/src/extensions/web/ | HTML->markdown |
| `tool/http-body` | packages/coding-agent/src/extensions/web/ | corpo HTTP |
| `tool/model-policy` | sem equivalente | politica de tool por modelo |

### Regras de dono: `packages/core/src` por primeiro segmento

| Segmento | Dono nycode | Nota |
|---|---|---|
| `account` | packages/coding-agent/src/core/auth-storage.ts | contas/credenciais |
| `agent` | packages/coding-agent/src/extensions/subagent/ | definicao de agentes |
| `aisdk` | packages/ai/src/api/ | adaptador AI SDK vs API propria |
| `aisdk-native` | packages/ai/src/api/ | adaptador AI SDK nativo |
| `app` | packages/coding-agent/src/core/sdk.ts | composicao do app |
| `artifact` | sem equivalente | artefatos de sessao |
| `automation` | sem equivalente | automacoes (timer/cron/evento MCP); parcial: extensions/run, extensions/monitor |
| `blob-store` | packages/coding-agent/src/core/session-manager.ts | blobs em SQLite vs JSONL |
| `bus` | packages/coding-agent/src/core/event-bus.ts | barramento de eventos |
| `codemode` | packages/coding-agent/src/extensions/codemode/ | Code Mode no core |
| `command` | packages/coding-agent/src/core/prompt-templates.ts | comandos markdown |
| `config` | packages/coding-agent/src/core/settings-manager.ts | configuracao |
| `console-access` | sem equivalente | console opencode.ai |
| `credential` | packages/coding-agent/src/core/auth-storage.ts | credenciais em SQLite vs auth.json |
| `database` | sem equivalente | SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `effect` | sem equivalente | runtime Effect; nycode nao usa Effect |
| `environment` | packages/env/src/ | ambiente de execucao |
| `event` | sem equivalente | tabela de eventos SQLite |
| `event-logger` | packages/coding-agent/src/core/telemetry.ts | log de eventos |
| `file-access` | packages/coding-agent/src/core/tools/path-utils.ts | controle de acesso a arquivos |
| `file-mutation` | packages/coding-agent/src/core/tools/file-mutation-queue.ts | fila de mutacao |
| `file-retention` | sem equivalente | retencao de arquivos |
| `file-write` | packages/coding-agent/src/core/tools/write.ts | escrita |
| `filesystem` | packages/coding-agent/src/core/tools/find.ts | busca/watch de FS; grep em core/tools/grep.ts |
| `flag` | packages/coding-agent/src/core/experimental.ts | flags |
| `form` | packages/coding-agent/src/extensions/question/ | formularios ao usuario |
| `formatter` | sem equivalente | formatador pos-edicao; proximo: extensions/syntax-check |
| `generate` | sem equivalente | geracao (imagem/video/voz) |
| `git` | packages/coding-agent/src/extensions/git-checkpoint/ | git |
| `github-copilot` | packages/ai/src/providers/github-copilot.ts | modelos Copilot |
| `image` | packages/coding-agent/src/utils/image-process.ts | processamento de imagem |
| `instance` | packages/coding-agent/src/core/agent-session-runtime.ts | instancia por projeto |
| `instruction-discovery` | packages/coding-agent/src/core/resource-loader.ts | AGENTS.md/instrucoes |
| `instructions` | packages/coding-agent/src/core/resource-loader.ts | instrucoes |
| `integration` | sem equivalente | integracoes gerenciadas |
| `job` | packages/coding-agent/src/extensions/subagent/ | jobs em background; shell em extensions/run |
| `kv` | sem equivalente | kv store |
| `location` | packages/coding-agent/src/core/session-cwd.ts | localizacao/cwd |
| `location-activity` | packages/coding-agent/src/core/session-cwd.ts | localizacao/cwd |
| `location-lifecycle` | packages/coding-agent/src/core/session-cwd.ts | localizacao/cwd |
| `location-service-map` | packages/coding-agent/src/core/session-cwd.ts | localizacao/cwd |
| `location-services` | packages/coding-agent/src/core/session-cwd.ts | localizacao/cwd |
| `machine` | sem equivalente | maquinas remotas (iroh/noise); nycode tem apps/p3 fora de packages/* |
| `managed-policy` | packages/coding-agent/src/core/permissions/global-settings.ts | politica gerenciada |
| `markdown` | sem equivalente | declaracao de tipos |
| `mcp` | packages/mcp/src/ | cliente MCP |
| `mime` | packages/coding-agent/src/../../coding-agent/src/utils/mime.ts | mime |
| `modal` | sem equivalente | modelos Modal |
| `model` | packages/coding-agent/src/core/model-registry.ts | registro de modelos |
| `model-resolver` | packages/coding-agent/src/core/model-resolver.ts | resolucao de modelo |
| `model-retry` | packages/agent/src/agent-loop.ts | retry de modelo; ver matriz |
| `models-dev` | packages/ai/src/model-catalog.ts | catalogo models.dev |
| `node-ffi` | sem equivalente | declaracao de tipos |
| `oauth` | packages/ai/src/oauth.ts | pagina/redirect OAuth |
| `permission` | packages/coding-agent/src/core/permissions/ | permissoes |
| `persistent-pty` | sem equivalente | PTY persistente |
| `plugin` | packages/coding-agent/src/core/extensions/ | sistema de plugins |
| `project` | packages/coding-agent/src/core/project-trust.ts | projeto |
| `provider` | packages/coding-agent/src/core/model-registry.ts | provedores |
| `pty` | sem equivalente | PTY; nycode usa core/bash-executor.ts sem PTY |
| `push` | packages/coding-agent/src/extensions/notify/ | notificacoes push |
| `reference` | sem equivalente | referencias (repos externos como contexto) |
| `repository` | sem equivalente | repositorios |
| `repository-cache` | sem equivalente | cache de repositorios |
| `ripgrep` | packages/coding-agent/src/core/tools/grep.ts | ripgrep |
| `rpc` | packages/coding-agent/src/modes/rpc/ | RPC |
| `schema` | packages/schema/src/ | schemas |
| `session` | packages/coding-agent/src/core/agent-session.ts | sessao |
| `shared-cache` | sem equivalente | cache compartilhado |
| `shell` | packages/coding-agent/src/core/tools/bash.ts | shell; parse/scan p/ permissao em core/permissions/guard/ |
| `skill` | packages/coding-agent/src/core/skills.ts | skills |
| `snapshot` | packages/coding-agent/src/extensions/git-checkpoint/ | snapshots |
| `state` | packages/coding-agent/src/core/agent-session-runtime.ts | estado |
| `tool` | packages/coding-agent/src/core/tools/ | ferramentas |
| `tool-output` | packages/coding-agent/src/core/tools/truncate.ts | truncamento de saida |
| `usage-limits` | packages/coding-agent/src/extensions/context-usage/ | limites de uso |
| `util` | packages/coding-agent/src/utils/ | utilitarios |
| `v1` | packages/coding-agent/src/migrations.ts | migracao de config v1 |
| `variant` | packages/coding-agent/src/core/model-config.ts | variantes de modelo |
| `vcs` | packages/coding-agent/src/extensions/git-checkpoint/ | VCS |
| `video-generation` | sem equivalente | geracao de video |
| `voice` | sem equivalente | voz |
| `websearch` | packages/coding-agent/src/extensions/web/ | busca web |
| `wellknown` | sem equivalente | well-known config remota |
| `workspace` | sem equivalente | workspaces |
| `worktree` | sem equivalente | git worktrees gerenciados; parcial: core/cwd-switch |

### Regras de dono: demais caminhos (primeira que casa)

| Prefixo | Dono nycode | Nota |
|---|---|---|
| `packages/core/test/` | packages/coding-agent/test/ | testes do core |
| `packages/core/script/` | scripts/ | scripts do core |
| `packages/core/` | packages/coding-agent/src/core/ | core (fora de src) |
| `packages/ai/src/protocols/` | packages/ai/src/api/ | protocolos de wire |
| `packages/ai/src/route/` | packages/ai/src/api/ | roteamento/transporte |
| `packages/ai/src/schema/` | packages/ai/src/types.ts | schemas de mensagem |
| `packages/ai/src/utils/` | packages/ai/src/utils/ | utilitarios |
| `packages/ai/test/` | packages/ai/test/ | testes ai |
| `packages/ai/` | packages/ai/src/ | camada de IA |
| `packages/codemode/` | packages/codemode/src/ | interpretador Code Mode |
| `packages/tui/src/feature-plugins/` | packages/coding-agent/src/modes/interactive/ | plugins de TUI |
| `packages/tui/` | packages/coding-agent/src/modes/interactive/ | TUI OpenTUI/Solid; base em packages/tui/src |
| `packages/cli/src/acp/` | sem equivalente | Agent Client Protocol |
| `packages/cli/test/acp/` | sem equivalente | Agent Client Protocol |
| `packages/cli/` | packages/coding-agent/src/cli/ | CLI |
| `packages/cli-rs/` | sem equivalente | cliente Rust (TUI/CLI nativo) |
| `packages/app/` | apps/p2/ | UI web (fora de packages/*) |
| `packages/desktop/` | apps/p2-mac/ | desktop Electron; p2-mac e parcial |
| `packages/gui-plugins/` | sem equivalente | plugins de GUI (browser, terminal, ssh, office) |
| `packages/session-ui/` | apps/p2/ | UI de sessao web |
| `packages/ui/` | apps/p2/ | design system web |
| `packages/stories/` | sem equivalente | storybook |
| `packages/server/` | packages/coding-agent/src/modes/rpc/ | servidor HTTP; nycode tem RPC stdio |
| `packages/protocol/` | packages/coding-agent/src/modes/rpc/ | contrato HTTP |
| `packages/client/` | packages/coding-agent/src/modes/rpc/ | cliente do servidor |
| `packages/sdk/` | packages/coding-agent/src/core/sdk.ts | SDK |
| `packages/httpapi-codegen/` | sem equivalente | gerador de cliente HTTP |
| `packages/plugin-browser/` | sem equivalente | plugin de navegador |
| `packages/plugin/` | packages/coding-agent/src/core/extensions/ | API de plugins |
| `packages/plugins/` | sem equivalente | plugins de terceiros (figma) |
| `packages/schema/` | packages/schema/src/ | schemas |
| `packages/util/` | packages/coding-agent/src/utils/ | utilitarios |
| `packages/effect-drizzle-sqlite/` | sem equivalente | driver drizzle/Effect (exemplo SQL) |
| `packages/process-daemon/` | sem equivalente | daemon de processos |
| `packages/data/` | sem equivalente | app de dados |
| `packages/merman/` | sem equivalente | renderizador mermaid |
| `packages/latex/` | packages/tui/src/latex.ts | latex |
| `packages/theme/` | packages/coding-agent/src/modes/interactive/theme/ | temas |
| `packages/patchmark/` | sem equivalente | patchmark |
| `packages/simulation/` | packages/coding-agent/test/suite/ | simulacao; nycode usa provider faux |
| `packages/http-recorder/` | sem equivalente | gravador HTTP p/ testes |
| `packages/nav-menus/` | sem equivalente | menus nativos |
| `packages/script/` | scripts/ | scripts |
| `services/` | sem equivalente | servicos web (site, legado, update) |
| `sdks/vscode/` | sem equivalente | extensao VS Code |
| `script/` | scripts/ | scripts de repo |
| `.github/` | .github/ | CI |
| `.opencode/` | .nycode/ | harness do repo |
| `nix/` | sem equivalente | nix |
| `flake.nix` | sem equivalente | nix |
| `patches/` | sem equivalente | patches de deps |
