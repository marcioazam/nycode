# Censo de superfícies de feature (omp v19.2.1)

Extrator determinístico sobre os 10.247 arquivos do inventário (`git -C ~/source/oh-my-pi-ref ls-files` filtrado), somando 122.9 MB lidos sem erros. Reconcilia todas as ferramentas, comandos CLI, comandos slash, esquemas `internal-urls` e chaves `register({ id })` com `matriz.md`, `achados/` e `rejeitados.md`.

| Superfície | Contagem | Onde está triada |
|---|---:|---|
| Tools built-in + ocultas (`BUILTIN_TOOLS` / `HIDDEN_TOOLS`) | 32 | Tabela 1 abaixo |
| Subcomandos CLI (`packages/coding-agent/src/commands/*.ts`) | 56 | Tabela 2 abaixo |
| Slash commands (`slash-commands/builtin-*.ts`) | 89 | Tabela 3 abaixo |
| Esquemas `internal-urls` (`*-protocol.ts`) | 20 | Tabela 4 abaixo (`rejeitados.md` R13) |
| Configurações registradas (`register({ id })`) | 639 | Agrupadas na Tabela 5 |
| Flags de ambiente `OMP_*` / `PI_*` | 189 / 280 | [censo-flags.md](censo-flags.md) |

## 1. Tools (`BUILTIN_TOOLS` e `HIDDEN_TOOLS`)

| Tool | Tipo | Origem no omp | Triagem |
|---|---|---|---|
| `read` | builtin | `omp:packages/coding-agent/src/tools/index.ts:624` | A/B (supersede/hashline/leitores) — matriz.md / achados/08,13,23 |
| `security_scan` | builtin | `omp:packages/coding-agent/src/tools/index.ts:625` | C — rejeitados.md R22 |
| `bash` | builtin | `omp:packages/coding-agent/src/tools/index.ts:626` | B (minimizer TS) / C (VM Rust) — matriz.md / achados/09 |
| `edit` | builtin | `omp:packages/coding-agent/src/tools/index.ts:627` | B — matriz.md / achados/13 |
| `ast_grep` | builtin | `omp:packages/coding-agent/src/tools/index.ts:628` | B — matriz.md / achados/24 |
| `ast_edit` | builtin | `omp:packages/coding-agent/src/tools/index.ts:629` | B — matriz.md / achados/24 |
| `ask` | builtin | `omp:packages/coding-agent/src/tools/index.ts:630` | C (coberto) — matriz.md / `extensions/question` |
| `debug` | builtin | `omp:packages/coding-agent/src/tools/index.ts:631` | B — matriz.md / achados/23 |
| `eval` | builtin | `omp:packages/coding-agent/src/tools/index.ts:632` | C — matriz.md / rejeitados.md R03 |
| `github` | builtin | `omp:packages/coding-agent/src/tools/index.ts:633` | C — rejeitados.md R15 |
| `glob` | builtin | `omp:packages/coding-agent/src/tools/index.ts:634` | C (coberto) — matriz.md / `core/tools/find.ts` |
| `grep` | builtin | `omp:packages/coding-agent/src/tools/index.ts:635` | C (coberto) — matriz.md / `core/tools/grep.ts` |
| `find` | builtin | `omp:packages/coding-agent/src/tools/index.ts:636` | C — rejeitados.md R14 |
| `lsp` | builtin | `omp:packages/coding-agent/src/tools/index.ts:637` | B — matriz.md / achados/11 |
| `checkpoint` | builtin | `omp:packages/coding-agent/src/tools/index.ts:638` | C (coberto por `git-checkpoint`) — rejeitados.md R17 |
| `rewind` | builtin | `omp:packages/coding-agent/src/tools/index.ts:639` | C (coberto por `git-checkpoint`) — rejeitados.md R17 |
| `context_notes` | builtin | `omp:packages/coding-agent/src/tools/index.ts:640` | C — rejeitados.md R18 |
| `new_context` | builtin | `omp:packages/coding-agent/src/tools/index.ts:641` | C — rejeitados.md R18 |
| `task` | builtin | `omp:packages/coding-agent/src/tools/index.ts:642` | B — matriz.md / achados/15 |
| `wait` | builtin | `omp:packages/coding-agent/src/tools/index.ts:643` | C (`subagent` background) — matriz.md / achados/15 |
| `todo` | builtin | `omp:packages/coding-agent/src/tools/index.ts:644` | C (coberto) — matriz.md / `extensions/todo` |
| `web_search` | builtin | `omp:packages/coding-agent/src/tools/index.ts:645` | B — matriz.md / achados/18 |
| `write` | builtin | `omp:packages/coding-agent/src/tools/index.ts:646` | B (LSP pós-escrita) — matriz.md / achados/11 |
| `memory_edit` | builtin | `omp:packages/coding-agent/src/tools/index.ts:647` | C — rejeitados.md R05 |
| `retain` | builtin | `omp:packages/coding-agent/src/tools/index.ts:648` | C — rejeitados.md R05 |
| `recall` | builtin | `omp:packages/coding-agent/src/tools/index.ts:649` | C — rejeitados.md R05 |
| `reflect` | builtin | `omp:packages/coding-agent/src/tools/index.ts:650` | C — rejeitados.md R05 |
| `learn` | builtin | `omp:packages/coding-agent/src/tools/index.ts:651` | C — rejeitados.md R05 |
| `manage_skill` | builtin | `omp:packages/coding-agent/src/tools/index.ts:652` | C — rejeitados.md R05 |
| `think` | hidden | `omp:packages/coding-agent/src/tools/index.ts:656` | C — rejeitados.md R23 |
| `yield` | hidden | `omp:packages/coding-agent/src/tools/index.ts:657` | B (resultado tipado) — achados/15 |
| `goal` | hidden | `omp:packages/coding-agent/src/tools/index.ts:658` | C — rejeitados.md R04 |

## 2. Subcomandos CLI (`commands/*.ts`)

| Comando | Arquivo omp | Triagem |
|---|---|---|
| `acp` | `omp:packages/coding-agent/src/commands/acp.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `agents` | `omp:packages/coding-agent/src/commands/agents.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `anonymize` | `omp:packages/coding-agent/src/commands/anonymize.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `auth-broker` | `omp:packages/coding-agent/src/commands/auth-broker.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `auth-gateway` | `omp:packages/coding-agent/src/commands/auth-gateway.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `auth` | `omp:packages/coding-agent/src/commands/auth.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `bench` | `omp:packages/coding-agent/src/commands/bench.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `browser-relay` | `omp:packages/coding-agent/src/commands/browser-relay.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `cleanse` | `omp:packages/coding-agent/src/commands/cleanse.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `clip` | `omp:packages/coding-agent/src/commands/clip.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `collab` | `omp:packages/coding-agent/src/commands/collab.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `commit` | `omp:packages/coding-agent/src/commands/commit.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `complete` | `omp:packages/coding-agent/src/commands/complete.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `completions` | `omp:packages/coding-agent/src/commands/completions.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `compress` | `omp:packages/coding-agent/src/commands/compress.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `config` | `omp:packages/coding-agent/src/commands/config.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `dry-balance` | `omp:packages/coding-agent/src/commands/dry-balance.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `find` | `omp:packages/coding-agent/src/commands/find.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `gallery` | `omp:packages/coding-agent/src/commands/gallery.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `gc` | `omp:packages/coding-agent/src/commands/gc.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `git` | `omp:packages/coding-agent/src/commands/git.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `grep` | `omp:packages/coding-agent/src/commands/grep.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `grievances` | `omp:packages/coding-agent/src/commands/grievances.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `if-bench` | `omp:packages/coding-agent/src/commands/if-bench.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `images` | `omp:packages/coding-agent/src/commands/images.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `install` | `omp:packages/coding-agent/src/commands/install.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `join` | `omp:packages/coding-agent/src/commands/join.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `launch-help` | `omp:packages/coding-agent/src/commands/launch-help.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `launch` | `omp:packages/coding-agent/src/commands/launch.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `login` | `omp:packages/coding-agent/src/commands/login.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `models` | `omp:packages/coding-agent/src/commands/models.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `native-shell` | `omp:packages/coding-agent/src/commands/native-shell.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `play` | `omp:packages/coding-agent/src/commands/play.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `plugin` | `omp:packages/coding-agent/src/commands/plugin.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `predict` | `omp:packages/coding-agent/src/commands/predict.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `ps` | `omp:packages/coding-agent/src/commands/ps.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `read` | `omp:packages/coding-agent/src/commands/read.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `render` | `omp:packages/coding-agent/src/commands/render.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `say` | `omp:packages/coding-agent/src/commands/say.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `session` | `omp:packages/coding-agent/src/commands/session.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `settings` | `omp:packages/coding-agent/src/commands/settings.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `setup` | `omp:packages/coding-agent/src/commands/setup.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `share` | `omp:packages/coding-agent/src/commands/share.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `shell` | `omp:packages/coding-agent/src/commands/shell.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `skill` | `omp:packages/coding-agent/src/commands/skill.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `ssh` | `omp:packages/coding-agent/src/commands/ssh.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `stats` | `omp:packages/coding-agent/src/commands/stats.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `stream` | `omp:packages/coding-agent/src/commands/stream.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `tiny-models` | `omp:packages/coding-agent/src/commands/tiny-models.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `token` | `omp:packages/coding-agent/src/commands/token.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `toks` | `omp:packages/coding-agent/src/commands/toks.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `ttsr` | `omp:packages/coding-agent/src/commands/ttsr.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `update` | `omp:packages/coding-agent/src/commands/update.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `usage` | `omp:packages/coding-agent/src/commands/usage.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `web-search` | `omp:packages/coding-agent/src/commands/web-search.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |
| `worktree` | `omp:packages/coding-agent/src/commands/worktree.ts:1` | Coberto em `matriz.md` / `rejeitados.md` ou infra CLI |

## 3. Slash commands built-in (`builtin-*.ts`)

| Nome | Origem no omp |
|---|---|
| `advisor` | `omp:packages/coding-agent/src/slash-commands/builtin-collaboration.ts:71` |
| `export` | `omp:packages/coding-agent/src/slash-commands/builtin-collaboration.ts:188` |
| `trace` | `omp:packages/coding-agent/src/slash-commands/builtin-collaboration.ts:212` |
| `dump` | `omp:packages/coding-agent/src/slash-commands/builtin-collaboration.ts:239` |
| `share` | `omp:packages/coding-agent/src/slash-commands/builtin-collaboration.ts:301` |
| `collab` | `omp:packages/coding-agent/src/slash-commands/builtin-collaboration.ts:327` |
| `join` | `omp:packages/coding-agent/src/slash-commands/builtin-collaboration.ts:459` |
| `leave` | `omp:packages/coding-agent/src/slash-commands/builtin-collaboration.ts:491` |
| `browser` | `omp:packages/coding-agent/src/slash-commands/builtin-collaboration.ts:516` |
| `copy` | `omp:packages/coding-agent/src/slash-commands/builtin-collaboration.ts:586` |
| `open` | `omp:packages/coding-agent/src/slash-commands/builtin-collaboration.ts:647` |
| `commit` | `omp:packages/coding-agent/src/slash-commands/builtin-commit.ts:15` |
| `force` | `omp:packages/coding-agent/src/slash-commands/builtin-control.ts:89` |
| `live` | `omp:packages/coding-agent/src/slash-commands/builtin-control.ts:139` |
| `record` | `omp:packages/coding-agent/src/slash-commands/builtin-control.ts:148` |
| `pause` | `omp:packages/coding-agent/src/slash-commands/builtin-control.ts:157` |
| `forget-approvals` | `omp:packages/coding-agent/src/slash-commands/builtin-control.ts:166` |
| `quit` | `omp:packages/coding-agent/src/slash-commands/builtin-control.ts:176` |
| `ssh` | `omp:packages/coding-agent/src/slash-commands/builtin-lifecycle.ts:227` |
| `new` | `omp:packages/coding-agent/src/slash-commands/builtin-lifecycle.ts:250` |
| `fresh` | `omp:packages/coding-agent/src/slash-commands/builtin-lifecycle.ts:259` |
| `clear` | `omp:packages/coding-agent/src/slash-commands/builtin-lifecycle.ts:281` |
| `delete` | `omp:packages/coding-agent/src/slash-commands/builtin-lifecycle.ts:292` |
| `compact` | `omp:packages/coding-agent/src/slash-commands/builtin-lifecycle.ts:301` |
| `shake` | `omp:packages/coding-agent/src/slash-commands/builtin-lifecycle.ts:320` |
| `handoff` | `omp:packages/coding-agent/src/slash-commands/builtin-lifecycle.ts:349` |
| `resume` | `omp:packages/coding-agent/src/slash-commands/builtin-lifecycle.ts:358` |
| `pin` | `omp:packages/coding-agent/src/slash-commands/builtin-lifecycle.ts:394` |
| `unpin` | `omp:packages/coding-agent/src/slash-commands/builtin-lifecycle.ts:409` |
| `btw` | `omp:packages/coding-agent/src/slash-commands/builtin-lifecycle.ts:424` |
| `tan` | `omp:packages/coding-agent/src/slash-commands/builtin-lifecycle.ts:440` |
| `omfg` | `omp:packages/coding-agent/src/slash-commands/builtin-lifecycle.ts:453` |
| `cleanse` | `omp:packages/coding-agent/src/slash-commands/builtin-lifecycle.ts:466` |
| `retry` | `omp:packages/coding-agent/src/slash-commands/builtin-lifecycle.ts:479` |
| `debug` | `omp:packages/coding-agent/src/slash-commands/builtin-lifecycle.ts:514` |
| `memory` | `omp:packages/coding-agent/src/slash-commands/builtin-lifecycle.ts:523` |
| `rename` | `omp:packages/coding-agent/src/slash-commands/builtin-lifecycle.ts:613` |
| `move` | `omp:packages/coding-agent/src/slash-commands/builtin-lifecycle.ts:691` |
| `wt` | `omp:packages/coding-agent/src/slash-commands/builtin-lifecycle.ts:721` |
| `add-dir` | `omp:packages/coding-agent/src/slash-commands/builtin-lifecycle.ts:762` |
| `remove-dir` | `omp:packages/coding-agent/src/slash-commands/builtin-lifecycle.ts:794` |
| `dirs` | `omp:packages/coding-agent/src/slash-commands/builtin-lifecycle.ts:823` |
| `exit` | `omp:packages/coding-agent/src/slash-commands/builtin-lifecycle.ts:832` |
| `restart` | `omp:packages/coding-agent/src/slash-commands/builtin-lifecycle.ts:837` |
| `marketplace` | `omp:packages/coding-agent/src/slash-commands/builtin-marketplace.ts:52` |
| `plugins` | `omp:packages/coding-agent/src/slash-commands/builtin-marketplace.ts:441` |
| `reload-plugins` | `omp:packages/coding-agent/src/slash-commands/builtin-marketplace.ts:514` |
| `security` | `omp:packages/coding-agent/src/slash-commands/builtin-modes.ts:242` |
| `settings` | `omp:packages/coding-agent/src/slash-commands/builtin-modes.ts:263` |
| `setup` | `omp:packages/coding-agent/src/slash-commands/builtin-modes.ts:272` |
| `plan` | `omp:packages/coding-agent/src/slash-commands/builtin-modes.ts:290` |
| `plan-review` | `omp:packages/coding-agent/src/slash-commands/builtin-modes.ts:311` |
| `vibe` | `omp:packages/coding-agent/src/slash-commands/builtin-modes.ts:322` |
| `goal` | `omp:packages/coding-agent/src/slash-commands/builtin-modes.ts:340` |
| `guided-goal` | `omp:packages/coding-agent/src/slash-commands/builtin-modes.ts:366` |
| `loop` | `omp:packages/coding-agent/src/slash-commands/builtin-modes.ts:378` |
| `queue` | `omp:packages/coding-agent/src/slash-commands/builtin-modes.ts:405` |
| `model` | `omp:packages/coding-agent/src/slash-commands/builtin-modes.ts:418` |
| `switch` | `omp:packages/coding-agent/src/slash-commands/builtin-modes.ts:462` |
| `fast` | `omp:packages/coding-agent/src/slash-commands/builtin-modes.ts:513` |
| `slow` | `omp:packages/coding-agent/src/slash-commands/builtin-modes.ts:541` |
| `skillful` | `omp:packages/coding-agent/src/slash-commands/builtin-modes.ts:569` |
| `extended-context` | `omp:packages/coding-agent/src/slash-commands/builtin-modes.ts:625` |
| `computer` | `omp:packages/coding-agent/src/slash-commands/builtin-modes.ts:652` |
| `ratchet` | `omp:packages/coding-agent/src/slash-commands/builtin-modes.ts:697` |
| `prewalk` | `omp:packages/coding-agent/src/slash-commands/builtin-modes.ts:731` |
| `modelpreset` | `omp:packages/coding-agent/src/slash-commands/builtin-modes.ts:806` |
| `effort` | `omp:packages/coding-agent/src/slash-commands/builtin-modes.ts:855` |
| `todo` | `omp:packages/coding-agent/src/slash-commands/builtin-session.ts:211` |
| `session` | `omp:packages/coding-agent/src/slash-commands/builtin-session.ts:249` |
| `jobs` | `omp:packages/coding-agent/src/slash-commands/builtin-session.ts:336` |
| `usage` | `omp:packages/coding-agent/src/slash-commands/builtin-session.ts:412` |
| `stats` | `omp:packages/coding-agent/src/slash-commands/builtin-session.ts:459` |
| `changelog` | `omp:packages/coding-agent/src/slash-commands/builtin-session.ts:497` |
| `hotkeys` | `omp:packages/coding-agent/src/slash-commands/builtin-session.ts:526` |
| `tools` | `omp:packages/coding-agent/src/slash-commands/builtin-session.ts:535` |
| `context` | `omp:packages/coding-agent/src/slash-commands/builtin-session.ts:564` |
| `extensions` | `omp:packages/coding-agent/src/slash-commands/builtin-session.ts:583` |
| `agents` | `omp:packages/coding-agent/src/slash-commands/builtin-session.ts:593` |
| `git` | `omp:packages/coding-agent/src/slash-commands/builtin-session.ts:602` |
| `local` | `omp:packages/coding-agent/src/slash-commands/builtin-session.ts:613` |
| `hub` | `omp:packages/coding-agent/src/slash-commands/builtin-session.ts:624` |
| `branch` | `omp:packages/coding-agent/src/slash-commands/builtin-session.ts:634` |
| `fork` | `omp:packages/coding-agent/src/slash-commands/builtin-session.ts:644` |
| `tree` | `omp:packages/coding-agent/src/slash-commands/builtin-session.ts:684` |
| `login` | `omp:packages/coding-agent/src/slash-commands/builtin-session.ts:693` |
| `logout` | `omp:packages/coding-agent/src/slash-commands/builtin-session.ts:746` |
| `mcp` | `omp:packages/coding-agent/src/slash-commands/builtin-session.ts:769` |
| `skills` | `omp:packages/coding-agent/src/slash-commands/builtin-skills.ts:67` |

## 4. Esquemas `internal-urls` (`rejeitados.md` R13)

| Esquema | Origem no omp |
|---|---|
| `agent://` | `omp:packages/coding-agent/src/internal-urls/agent-protocol.ts:289` |
| `attachment://` | `omp:packages/coding-agent/src/internal-urls/attachment-protocol.ts:15` |
| `cfg://` | `omp:packages/coding-agent/src/internal-urls/cfg-protocol.ts:343` |
| `conflict://` | `omp:packages/coding-agent/src/internal-urls/conflict-protocol.ts:28` |
| `help://` | `omp:packages/coding-agent/src/internal-urls/help-protocol.ts:18` |
| `history://` | `omp:packages/coding-agent/src/internal-urls/history-protocol.ts:393` |
| `issue://` | `omp:packages/coding-agent/src/internal-urls/issue-pr-protocol.ts:443` |
| `pr://` | `omp:packages/coding-agent/src/internal-urls/issue-pr-protocol.ts:501` |
| `local://` | `omp:packages/coding-agent/src/internal-urls/local-protocol.ts:431` |
| `mcp://` | `omp:packages/coding-agent/src/internal-urls/mcp-protocol.ts:216` |
| `memory://` | `omp:packages/coding-agent/src/internal-urls/memory-protocol.ts:331` |
| `mr://` | `omp:packages/coding-agent/src/internal-urls/mr-protocol.ts:81` |
| `omp://` | `omp:packages/coding-agent/src/internal-urls/omp-protocol.ts:51` |
| `out://` | `omp:packages/coding-agent/src/internal-urls/out-protocol.ts:68` |
| `proc://` | `omp:packages/coding-agent/src/internal-urls/proc-protocol.ts:182` |
| `rule://` | `omp:packages/coding-agent/src/internal-urls/rule-protocol.ts:43` |
| `security://` | `omp:packages/coding-agent/src/internal-urls/security-protocol.ts:108` |
| `skill://` | `omp:packages/coding-agent/src/internal-urls/skill-protocol.ts:309` |
| `ssh://` | `omp:packages/coding-agent/src/internal-urls/ssh-protocol.ts:263` |
| `vault://` | `omp:packages/coding-agent/src/internal-urls/vault-protocol.ts:573` |

## 5. Chaves de configuração `register({ id })` por prefixo

Total: 639 definições registradas em `packages/coding-agent/src/`.

| Prefixo | Quantidade | Exemplos (com `omp:arquivo:linha`) |
|---|---:|---|
| `advisor` | 8 | `advisor.enabled` (`omp:packages/coding-agent/src/advisor/settings.ts:13`), `advisor.syncBacklog` (`omp:packages/coding-agent/src/advisor/settings.ts:27`), `advisor.immuneTurns` (`omp:packages/coding-agent/src/advisor/settings.ts:43`), `advisor.continueSeverity` (`omp:packages/coding-agent/src/advisor/settings.ts:66`) |
| `archive` | 1 | `archive.enabled` (`omp:packages/coding-agent/src/tools/settings.ts:733`) |
| `ask` | 3 | `ask.timeout` (`omp:packages/coding-agent/src/modes/settings.ts:1472`), `ask.notify` (`omp:packages/coding-agent/src/modes/settings.ts:1502`), `ask.enabled` (`omp:packages/coding-agent/src/tools/settings.ts:968`) |
| `astEdit` | 1 | `astEdit.enabled` (`omp:packages/coding-agent/src/tools/settings.ts:582`) |
| `astGrep` | 1 | `astGrep.enabled` (`omp:packages/coding-agent/src/tools/settings.ts:570`) |
| `async` | 4 | `async.enabled` (`omp:packages/coding-agent/src/tools/settings.ts:1074`), `async.maxJobs` (`omp:packages/coding-agent/src/tools/settings.ts:1087`), `async.printWake` (`omp:packages/coding-agent/src/tools/settings.ts:1097`), `async.widgets` (`omp:packages/coding-agent/src/tools/settings.ts:1110`) |
| `auth` | 4 | `auth.broker.url` (`omp:packages/coding-agent/src/config/model-settings.ts:45`), `auth.broker.token` (`omp:packages/coding-agent/src/config/model-settings.ts:52`), `auth.accountPolicies` (`omp:packages/coding-agent/src/config/model-settings.ts:60`), `auth.unpausedProviders` (`omp:packages/coding-agent/src/config/model-settings.ts:75`) |
| `autoResume` | 1 | `autoResume` (`omp:packages/coding-agent/src/modes/settings.ts:34`) |
| `autocompleteMaxVisible` | 1 | `autocompleteMaxVisible` (`omp:packages/coding-agent/src/modes/settings.ts:1149`) |
| `autolearn` | 3 | `autolearn.enabled` (`omp:packages/coding-agent/src/autolearn/settings.ts:11`), `autolearn.autoContinue` (`omp:packages/coding-agent/src/autolearn/settings.ts:24`), `autolearn.minToolCalls` (`omp:packages/coding-agent/src/autolearn/settings.ts:38`) |
| `bash` | 10 | `bash.enabled` (`omp:packages/coding-agent/src/exec/settings.ts:118`), `bash.allowCompoundCommands` (`omp:packages/coding-agent/src/exec/settings.ts:130`), `bash.autoBackground.enabled` (`omp:packages/coding-agent/src/exec/settings.ts:143`), `bash.reapBackground` (`omp:packages/coding-agent/src/exec/settings.ts:156`) |
| `bashInterceptor` | 2 | `bashInterceptor.enabled` (`omp:packages/coding-agent/src/exec/settings.ts:211`), `bashInterceptor.patterns` (`omp:packages/coding-agent/src/exec/settings.ts:223`) |
| `binja` | 2 | `binja.installDir` (`omp:packages/coding-agent/src/binja/settings.ts:9`), `binja.python` (`omp:packages/coding-agent/src/binja/settings.ts:23`) |
| `branchSummary` | 2 | `branchSummary.enabled` (`omp:packages/coding-agent/src/session/context-settings.ts:613`), `branchSummary.reserveTokens` (`omp:packages/coding-agent/src/session/context-settings.ts:625`) |
| `browser` | 12 | `browser.enabled` (`omp:packages/coding-agent/src/tools/browser/settings.ts:8`), `browser.cdpUrl` (`omp:packages/coding-agent/src/tools/browser/settings.ts:20`), `browser.relay` (`omp:packages/coding-agent/src/tools/browser/settings.ts:33`), `browser.relayUrl` (`omp:packages/coding-agent/src/tools/browser/settings.ts:46`) |
| `btw` | 1 | `btw.inject` (`omp:packages/coding-agent/src/modes/settings.ts:939`) |
| `checkpoint` | 1 | `checkpoint.enabled` (`omp:packages/coding-agent/src/tools/settings.ts:855`) |
| `claudeResets` | 3 | `claudeResets.minBlockedMinutes` (`omp:packages/coding-agent/src/session/settings.ts:1657`), `claudeResets.keepCredits` (`omp:packages/coding-agent/src/session/settings.ts:1670`), `claudeResets.salvageHorizonHours` (`omp:packages/coding-agent/src/session/settings.ts:1683`) |
| `codexResets` | 3 | `codexResets.minBlockedMinutes` (`omp:packages/coding-agent/src/session/settings.ts:1587`), `codexResets.keepCredits` (`omp:packages/coding-agent/src/session/settings.ts:1600`), `codexResets.salvageHorizonHours` (`omp:packages/coding-agent/src/session/settings.ts:1613`) |
| `collab` | 4 | `collab.relayUrl` (`omp:packages/coding-agent/src/collab/settings.ts:10`), `collab.webUrl` (`omp:packages/coding-agent/src/collab/settings.ts:22`), `collab.displayName` (`omp:packages/coding-agent/src/collab/settings.ts:35`), `collab.autoStart` (`omp:packages/coding-agent/src/collab/settings.ts:47`) |
| `colorBlindMode` | 1 | `colorBlindMode` (`omp:packages/coding-agent/src/modes/settings.ts:115`) |
| `commands` | 4 | `commands.enableClaudeUser` (`omp:packages/coding-agent/src/extensibility/settings.ts:111`), `commands.enableClaudeProject` (`omp:packages/coding-agent/src/extensibility/settings.ts:123`), `commands.enableOpencodeUser` (`omp:packages/coding-agent/src/extensibility/settings.ts:135`), `commands.enableOpencodeProject` (`omp:packages/coding-agent/src/extensibility/settings.ts:147`) |
| `commit` | 7 | `commit.mapReduceEnabled` (`omp:packages/coding-agent/src/commit/settings.ts:7`), `commit.mapReduceThreshold` (`omp:packages/coding-agent/src/commit/settings.ts:9`), `commit.mapBatchTokenBudget` (`omp:packages/coding-agent/src/commit/settings.ts:12`), `commit.cacheEnabled` (`omp:packages/coding-agent/src/commit/settings.ts:17`) |
| `compaction` | 21 | `compaction.enabled` (`omp:packages/coding-agent/src/session/context-settings.ts:107`), `compaction.experimentalContextManagement` (`omp:packages/coding-agent/src/session/context-settings.ts:119`), `compaction.midTurnEnabled` (`omp:packages/coding-agent/src/session/context-settings.ts:131`), `compaction.methodOrder` (`omp:packages/coding-agent/src/session/context-settings.ts:144`) |
| `completion` | 1 | `completion.notify` (`omp:packages/coding-agent/src/modes/settings.ts:1446`) |
| `composer` | 5 | `composer.shape` (`omp:packages/coding-agent/src/modes/settings.ts:129`), `composer.tokenRate` (`omp:packages/coding-agent/src/modes/settings.ts:142`), `composer.recallClearedDrafts` (`omp:packages/coding-agent/src/modes/settings.ts:1081`), `composer.predictions` (`omp:packages/coding-agent/src/modes/settings.ts:1214`) |
| `computer` | 5 | `computer.enabled` (`omp:packages/coding-agent/src/tools/settings.ts:709`), `computer.display` (`omp:packages/coding-agent/src/tools/settings.ts:759`), `computer.maxWidth` (`omp:packages/coding-agent/src/tools/settings.ts:771`), `computer.maxHeight` (`omp:packages/coding-agent/src/tools/settings.ts:783`) |
| `contextFiles` | 1 | `contextFiles.extra` (`omp:packages/coding-agent/src/session/context-settings.ts:49`) |
| `contextPromotion` | 1 | `contextPromotion.enabled` (`omp:packages/coding-agent/src/session/context-settings.ts:77`) |
| `cycleOrder` | 1 | `cycleOrder` (`omp:packages/coding-agent/src/config/model-settings.ts:166`) |
| `debug` | 1 | `debug.enabled` (`omp:packages/coding-agent/src/tools/settings.ts:650`) |
| `defaultThinkingLevel` | 1 | `defaultThinkingLevel` (`omp:packages/coding-agent/src/session/settings.ts:257`) |
| `dev` | 4 | `dev.autoqa` (`omp:packages/coding-agent/src/tools/settings.ts:1185`), `dev.autoqaPush.endpoint` (`omp:packages/coding-agent/src/tools/settings.ts:1199`), `dev.autoqaPush.token` (`omp:packages/coding-agent/src/tools/settings.ts:1211`), `dev.autoqaConsent` (`omp:packages/coding-agent/src/tools/settings.ts:1231`) |
| `disabledExtensions` | 1 | `disabledExtensions` (`omp:packages/coding-agent/src/extensibility/settings.ts:12`) |
| `disabledProviders` | 1 | `disabledProviders` (`omp:packages/coding-agent/src/config/model-settings.ts:109`) |
| `disassembler` | 3 | `disassembler.backend` (`omp:packages/coding-agent/src/disasm/settings.ts:5`), `disassembler.maxOpen` (`omp:packages/coding-agent/src/disasm/settings.ts:45`), `disassembler.idleCloseSec` (`omp:packages/coding-agent/src/disasm/settings.ts:65`) |
| `display` | 11 | `display.shimmer` (`omp:packages/coding-agent/src/modes/settings.ts:671`), `display.pinnedAgents` (`omp:packages/coding-agent/src/modes/settings.ts:723`), `display.subagentLivePreview` (`omp:packages/coding-agent/src/modes/settings.ts:742`), `display.smoothStreaming` (`omp:packages/coding-agent/src/modes/settings.ts:754`) |
| `doubleEscapeAction` | 1 | `doubleEscapeAction` (`omp:packages/coding-agent/src/modes/settings.ts:1095`) |
| `edit` | 11 | `edit.mode` (`omp:packages/coding-agent/src/edit/settings.ts:45`), `edit.magic.model` (`omp:packages/coding-agent/src/edit/settings.ts:62`), `edit.modelVariants` (`omp:packages/coding-agent/src/edit/settings.ts:76`), `edit.fuzzyMatch` (`omp:packages/coding-agent/src/edit/settings.ts:87`) |
| `emojiAutocomplete` | 1 | `emojiAutocomplete` (`omp:packages/coding-agent/src/modes/settings.ts:1256`) |
| `enabledModels` | 1 | `enabledModels` (`omp:packages/coding-agent/src/config/model-settings.ts:95`) |
| `enabledProviders` | 1 | `enabledProviders` (`omp:packages/coding-agent/src/config/model-settings.ts:102`) |
| `encourageEdits` | 1 | `encourageEdits` (`omp:packages/coding-agent/src/session/settings.ts:508`) |
| `error` | 1 | `error.notify` (`omp:packages/coding-agent/src/modes/settings.ts:1459`) |
| `eval` | 7 | `eval.py` (`omp:packages/coding-agent/src/eval/settings.ts:9`), `eval.js` (`omp:packages/coding-agent/src/eval/settings.ts:22`), `eval.autoProvision` (`omp:packages/coding-agent/src/eval/settings.ts:35`), `eval.tools.enabled` (`omp:packages/coding-agent/src/eval/settings.ts:47`) |
| `exa` | 2 | `exa.enabled` (`omp:packages/coding-agent/src/web/settings.ts:9`), `exa.searchDelayMs` (`omp:packages/coding-agent/src/web/settings.ts:21`) |
| `expandThinkingBlocks` | 1 | `expandThinkingBlocks` (`omp:packages/coding-agent/src/session/settings.ts:283`) |
| `extendedContext` | 1 | `extendedContext` (`omp:packages/coding-agent/src/session/context-settings.ts:93`) |
| `extensionHandlers` | 2 | `extensionHandlers.toolCallTimeoutMs` (`omp:packages/coding-agent/src/extensibility/settings.ts:159`), `extensionHandlers.modeControl` (`omp:packages/coding-agent/src/extensibility/settings.ts:172`) |
| `extensionRenderers` | 2 | `extensionRenderers.assistantText` (`omp:packages/coding-agent/src/extensibility/settings.ts:185`), `extensionRenderers.transcriptPresenters` (`omp:packages/coding-agent/src/extensibility/settings.ts:198`) |
| `extensions` | 1 | `extensions` (`omp:packages/coding-agent/src/extensibility/settings.ts:10`) |
| `externalThinking` | 1 | `externalThinking` (`omp:packages/coding-agent/src/session/settings.ts:320`) |
| `features` | 1 | `features.unexpectedStopDetection` (`omp:packages/coding-agent/src/session/settings.ts:1191`) |
| `fetch` | 1 | `fetch.enabled` (`omp:packages/coding-agent/src/tools/settings.ts:868`) |
| `find` | 3 | `find.verifyModel` (`omp:packages/coding-agent/src/tools/settings.ts:594`), `find.enabled` (`omp:packages/coding-agent/src/tools/settings.ts:607`), `find.hitThreshold` (`omp:packages/coding-agent/src/tools/settings.ts:635`) |
| `followUpMode` | 1 | `followUpMode` (`omp:packages/coding-agent/src/modes/settings.ts:913`) |
| `gc` | 14 | `gc.blobs` (`omp:packages/coding-agent/src/cli/gc-settings.ts:7`), `gc.archive` (`omp:packages/coding-agent/src/cli/gc-settings.ts:9`), `gc.wal` (`omp:packages/coding-agent/src/cli/gc-settings.ts:11`), `gc.coldArchiveAfterDays` (`omp:packages/coding-agent/src/cli/gc-settings.ts:13`) |
| `generate_image` | 1 | `generate_image.enabled` (`omp:packages/coding-agent/src/tools/settings.ts:696`) |
| `ghidra` | 2 | `ghidra.installDir` (`omp:packages/coding-agent/src/ghidra/settings.ts:5`), `ghidra.python` (`omp:packages/coding-agent/src/ghidra/settings.ts:19`) |
| `git` | 1 | `git.enabled` (`omp:packages/coding-agent/src/modes/settings.ts:47`) |
| `github` | 4 | `github.enabled` (`omp:packages/coding-agent/src/tools/settings.ts:893`), `github.cache.enabled` (`omp:packages/coding-agent/src/tools/settings.ts:906`), `github.cache.softTtlSec` (`omp:packages/coding-agent/src/tools/settings.ts:918`), `github.cache.hardTtlSec` (`omp:packages/coding-agent/src/tools/settings.ts:930`) |
| `glob` | 1 | `glob.enabled` (`omp:packages/coding-agent/src/tools/settings.ts:507`) |
| `goal` | 3 | `goal.enabled` (`omp:packages/coding-agent/src/goals/settings.ts:4`), `goal.statusInFooter` (`omp:packages/coding-agent/src/goals/settings.ts:16`), `goal.continuationModes` (`omp:packages/coding-agent/src/goals/settings.ts:30`) |
| `grep` | 3 | `grep.enabled` (`omp:packages/coding-agent/src/tools/settings.ts:519`), `grep.contextBefore` (`omp:packages/coding-agent/src/tools/settings.ts:531`), `grep.contextAfter` (`omp:packages/coding-agent/src/tools/settings.ts:550`) |
| `hideThinkingBlock` | 1 | `hideThinkingBlock` (`omp:packages/coding-agent/src/session/settings.ts:271`) |
| `hindsight` | 27 | `hindsight.apiUrl` (`omp:packages/coding-agent/src/hindsight/settings.ts:17`), `hindsight.apiToken` (`omp:packages/coding-agent/src/hindsight/settings.ts:31`), `hindsight.bankId` (`omp:packages/coding-agent/src/hindsight/settings.ts:46`), `hindsight.bankIdPrefix` (`omp:packages/coding-agent/src/hindsight/settings.ts:59`) |
| `ida` | 2 | `ida.python` (`omp:packages/coding-agent/src/ida/settings.ts:9`), `ida.installDir` (`omp:packages/coding-agent/src/ida/settings.ts:22`) |
| `images` | 14 | `images.urls.enabled` (`omp:packages/coding-agent/src/blob-broker/settings.ts:26`), `images.urls.backends` (`omp:packages/coding-agent/src/blob-broker/settings.ts:39`), `images.urls.options` (`omp:packages/coding-agent/src/blob-broker/settings.ts:53`), `images.urls.credentials` (`omp:packages/coding-agent/src/blob-broker/settings.ts:59`) |
| `includeModelInPrompt` | 1 | `includeModelInPrompt` (`omp:packages/coding-agent/src/session/settings.ts:432`) |
| `includeWorkspaceTree` | 1 | `includeWorkspaceTree` (`omp:packages/coding-agent/src/session/settings.ts:494`) |
| `inlineToolDescriptors` | 1 | `inlineToolDescriptors` (`omp:packages/coding-agent/src/session/settings.ts:409`) |
| `input` | 2 | `input.bareExitOnEmptySession` (`omp:packages/coding-agent/src/modes/settings.ts:1110`), `input.bareSlashCommands` (`omp:packages/coding-agent/src/modes/settings.ts:1123`) |
| `interruptMode` | 1 | `interruptMode` (`omp:packages/coding-agent/src/modes/settings.ts:926`) |
| `isolation` | 1 | `isolation.backend` (`omp:packages/coding-agent/src/task/settings.ts:41`) |
| `judgment` | 1 | `judgment.attemptTimeoutMs` (`omp:packages/coding-agent/src/config/model-settings.ts:144`) |
| `launch` | 2 | `launch.enabled` (`omp:packages/coding-agent/src/tools/settings.ts:662`), `launch.persist` (`omp:packages/coding-agent/src/tools/settings.ts:678`) |
| `live` | 3 | `live.voice` (`omp:packages/coding-agent/src/live/settings.ts:9`), `live.endpoint` (`omp:packages/coding-agent/src/live/settings.ts:35`), `live.apiKey` (`omp:packages/coding-agent/src/live/settings.ts:49`) |
| `loop` | 2 | `loop.mode` (`omp:packages/coding-agent/src/modes/settings.ts:1035`), `loop.conditionTimeoutMs` (`omp:packages/coding-agent/src/modes/settings.ts:1061`) |
| `lsp` | 9 | `lsp.diagnosticsOnWrite` (`omp:packages/coding-agent/src/config/registry.ts:13`), `lsp.enabled` (`omp:packages/coding-agent/src/lsp/settings.ts:9`), `lsp.lazy` (`omp:packages/coding-agent/src/lsp/settings.ts:22`), `lsp.shared` (`omp:packages/coding-agent/src/lsp/settings.ts:35`) |
| `magicKeywords` | 1 | `magicKeywords.enabled` (`omp:packages/coding-agent/src/modes/settings.ts:1420`) |
| `marketplace` | 1 | `marketplace.autoUpdate` (`omp:packages/coding-agent/src/modes/settings.ts:1372`) |
| `mcp` | 9 | `mcp.enableProjectConfig` (`omp:packages/coding-agent/src/mcp/settings.ts:9`), `mcp.startupTimeoutMs` (`omp:packages/coding-agent/src/mcp/settings.ts:21`), `mcp.shared` (`omp:packages/coding-agent/src/mcp/settings.ts:33`), `mcp.idleStopMinutes` (`omp:packages/coding-agent/src/mcp/settings.ts:46`) |
| `memories` | 16 | `memories.enabled` (`omp:packages/coding-agent/src/memories/settings.ts:11`), `memories.maxRolloutsPerStartup` (`omp:packages/coding-agent/src/memories/settings.ts:18`), `memories.maxRolloutAgeDays` (`omp:packages/coding-agent/src/memories/settings.ts:23`), `memories.minRolloutIdleHours` (`omp:packages/coding-agent/src/memories/settings.ts:26`) |
| `memory` | 1 | `memory.backend` (`omp:packages/coding-agent/src/memory-backend/settings.ts:13`) |
| `minP` | 1 | `minP` (`omp:packages/coding-agent/src/session/settings.ts:627`) |
| `mnemopi` | 26 | `mnemopi.dbPath` (`omp:packages/coding-agent/src/mnemopi/settings.ts:9`), `mnemopi.bank` (`omp:packages/coding-agent/src/mnemopi/settings.ts:23`), `mnemopi.scoping` (`omp:packages/coding-agent/src/mnemopi/settings.ts:36`), `mnemopi.embeddingVariant` (`omp:packages/coding-agent/src/mnemopi/settings.ts:68`) |
| `model` | 6 | `model.loopGuard.enabled` (`omp:packages/coding-agent/src/session/settings.ts:333`), `model.loopGuard.checkAssistantContent` (`omp:packages/coding-agent/src/session/settings.ts:347`), `model.loopGuard.toolCallReminder` (`omp:packages/coding-agent/src/session/settings.ts:359`), `model.toolCallLoopGuard.enabled` (`omp:packages/coding-agent/src/session/settings.ts:372`) |
| `modelPresets` | 1 | `modelPresets` (`omp:packages/coding-agent/src/config/model-settings.ts:157`) |
| `modelProviderOrder` | 1 | `modelProviderOrder` (`omp:packages/coding-agent/src/config/model-settings.ts:164`) |
| `modelRoleStorage` | 1 | `modelRoleStorage` (`omp:packages/coding-agent/src/config/model-settings.ts:116`) |
| `modelRoles` | 1 | `modelRoles` (`omp:packages/coding-agent/src/config/model-settings.ts:140`) |
| `modelTags` | 1 | `modelTags` (`omp:packages/coding-agent/src/config/model-settings.ts:162`) |
| `models` | 3 | `models.noJudge` (`omp:packages/coding-agent/src/config/auxiliary-model-policy.ts:4`), `models.noSpotlight` (`omp:packages/coding-agent/src/config/auxiliary-model-policy.ts:7`), `models.offline` (`omp:packages/coding-agent/src/config/auxiliary-model-policy.ts:10`) |
| `omitThinking` | 1 | `omitThinking` (`omp:packages/coding-agent/src/session/settings.ts:308`) |
| `out` | 1 | `out.enabled` (`omp:packages/coding-agent/src/tools/settings.ts:980`) |
| `ovnfs` | 1 | `ovnfs.path` (`omp:packages/coding-agent/src/task/settings.ts:174`) |
| `paste` | 1 | `paste.largeMenuThreshold` (`omp:packages/coding-agent/src/modes/settings.ts:1268`) |
| `personality` | 1 | `personality` (`omp:packages/coding-agent/src/session/settings.ts:536`) |
| `plan` | 4 | `plan.enabled` (`omp:packages/coding-agent/src/plan-mode/settings.ts:13`), `plan.defaultOnStartup` (`omp:packages/coding-agent/src/plan-mode/settings.ts:25`), `plan.autosave` (`omp:packages/coding-agent/src/plan-mode/settings.ts:38`), `plan.autosaveDir` (`omp:packages/coding-agent/src/plan-mode/settings.ts:51`) |
| `power` | 1 | `power.sleepPrevention` (`omp:packages/coding-agent/src/session/settings.ts:61`) |
| `presencePenalty` | 1 | `presencePenalty` (`omp:packages/coding-agent/src/session/settings.ts:645`) |
| `prewalk` | 5 | `prewalk.enabled` (`omp:packages/coding-agent/src/session/settings.ts:98`), `prewalk.from` (`omp:packages/coding-agent/src/session/settings.ts:111`), `prewalk.into` (`omp:packages/coding-agent/src/session/settings.ts:124`), `prewalk.auto` (`omp:packages/coding-agent/src/session/settings.ts:137`) |
| `proseOnlyThinking` | 1 | `proseOnlyThinking` (`omp:packages/coding-agent/src/session/settings.ts:296`) |
| `provider` | 1 | `provider.appendOnlyContext` (`omp:packages/coding-agent/src/session/settings.ts:1731`) |
| `providers` | 26 | `providers.maxInFlightRequests` (`omp:packages/coding-agent/src/session/settings.ts:219`), `providers.anthropic.serverSideFallback` (`omp:packages/coding-agent/src/session/settings.ts:1023`), `providers.anthropic.slowMode` (`omp:packages/coding-agent/src/session/settings.ts:1043`), `providers.ollama-cloud.maxConcurrency` (`omp:packages/coding-agent/src/session/settings.ts:1051`) |
| `pty` | 1 | `pty.notify` (`omp:packages/coding-agent/src/modes/settings.ts:1515`) |
| `python` | 2 | `python.kernelMode` (`omp:packages/coding-agent/src/eval/settings.ts:93`), `python.interpreter` (`omp:packages/coding-agent/src/eval/settings.ts:106`) |
| `ratchet` | 1 | `ratchet.enabled` (`omp:packages/coding-agent/src/tools/settings.ts:721`) |
| `read` | 10 | `read.defaultLimit` (`omp:packages/coding-agent/src/tools/settings.ts:161`), `read.renderMarkdown` (`omp:packages/coding-agent/src/tools/settings.ts:180`), `read.summarize.enabled` (`omp:packages/coding-agent/src/tools/settings.ts:192`), `read.summarize.prose` (`omp:packages/coding-agent/src/tools/settings.ts:204`) |
| `readLineNumbers` | 1 | `readLineNumbers` (`omp:packages/coding-agent/src/tools/settings.ts:149`) |
| `recap` | 2 | `recap.enabled` (`omp:packages/coding-agent/src/modes/settings.ts:1528`), `recap.idleSeconds` (`omp:packages/coding-agent/src/modes/settings.ts:1540`) |
| `repetitionPenalty` | 1 | `repetitionPenalty` (`omp:packages/coding-agent/src/session/settings.ts:664`) |
| `retry` | 13 | `retry.enabled` (`omp:packages/coding-agent/src/session/settings.ts:803`), `retry.maxRetries` (`omp:packages/coding-agent/src/session/settings.ts:806`), `retry.baseDelayMs` (`omp:packages/coding-agent/src/session/settings.ts:824`), `retry.maxDelayMs` (`omp:packages/coding-agent/src/session/settings.ts:827`) |
| `searxng` | 8 | `searxng.endpoint` (`omp:packages/coding-agent/src/web/settings.ts:34`), `searxng.token` (`omp:packages/coding-agent/src/web/settings.ts:47`), `searxng.basicUsername` (`omp:packages/coding-agent/src/web/settings.ts:55`), `searxng.basicPassword` (`omp:packages/coding-agent/src/web/settings.ts:63`) |
| `secrets` | 1 | `secrets.enabled` (`omp:packages/coding-agent/src/secrets/settings.ts:14`) |
| `security` | 1 | `security.enabled` (`omp:packages/coding-agent/src/tools/settings.ts:955`) |
| `session` | 3 | `session.worktreeScope` (`omp:packages/coding-agent/src/session/settings.ts:42`), `session.warnCost` (`omp:packages/coding-agent/src/session/settings.ts:1781`), `session.maxCost` (`omp:packages/coding-agent/src/session/settings.ts:1789`) |
| `setupVersion` | 1 | `setupVersion` (`omp:packages/coding-agent/src/modes/settings.ts:31`) |
| `share` | 3 | `share.serverUrl` (`omp:packages/coding-agent/src/commands/settings.ts:9`), `share.store` (`omp:packages/coding-agent/src/commands/settings.ts:22`), `share.redactSecrets` (`omp:packages/coding-agent/src/commands/settings.ts:47`) |
| `sharpshooter` | 4 | `sharpshooter.model` (`omp:packages/coding-agent/src/sharpshooter/settings.ts:8`), `sharpshooter.minPromptLength` (`omp:packages/coding-agent/src/sharpshooter/settings.ts:20`), `sharpshooter.intervalMinutes` (`omp:packages/coding-agent/src/sharpshooter/settings.ts:26`), `sharpshooter.injectionTokenLimit` (`omp:packages/coding-agent/src/sharpshooter/settings.ts:32`) |
| `shellCommandPrefix` | 1 | `shellCommandPrefix` (`omp:packages/coding-agent/src/exec/settings.ts:115`) |
| `shellMinimizer` | 7 | `shellMinimizer.enabled` (`omp:packages/coding-agent/src/exec/settings.ts:259`), `shellMinimizer.settingsPath` (`omp:packages/coding-agent/src/exec/settings.ts:271`), `shellMinimizer.only` (`omp:packages/coding-agent/src/exec/settings.ts:277`), `shellMinimizer.except` (`omp:packages/coding-agent/src/exec/settings.ts:283`) |
| `shellPath` | 1 | `shellPath` (`omp:packages/coding-agent/src/exec/settings.ts:112`) |
| `showHardwareCursor` | 1 | `showHardwareCursor` (`omp:packages/coding-agent/src/modes/settings.ts:871`) |
| `skillful` | 1 | `skillful` (`omp:packages/coding-agent/src/session/settings.ts:520`) |
| `skills` | 14 | `skills.registryUrl` (`omp:packages/coding-agent/src/extensibility/settings.ts:16`), `skills.enabled` (`omp:packages/coding-agent/src/extensibility/settings.ts:29`), `skills.enableSkillCommands` (`omp:packages/coding-agent/src/extensibility/settings.ts:32`), `skills.enableCodexUser` (`omp:packages/coding-agent/src/extensibility/settings.ts:43`) |
| `snapcompact` | 3 | `snapcompact.systemPrompt` (`omp:packages/coding-agent/src/session/context-settings.ts:416`), `snapcompact.toolResults` (`omp:packages/coding-agent/src/session/context-settings.ts:443`), `snapcompact.shape` (`omp:packages/coding-agent/src/session/context-settings.ts:503`) |
| `speech` | 5 | `speech.enabled` (`omp:packages/coding-agent/src/tts/settings.ts:42`), `speech.mode` (`omp:packages/coding-agent/src/tts/settings.ts:54`), `speech.enhanced` (`omp:packages/coding-agent/src/tts/settings.ts:73`), `speech.voice` (`omp:packages/coding-agent/src/tts/settings.ts:86`) |
| `speechgen` | 1 | `speechgen.enabled` (`omp:packages/coding-agent/src/tools/settings.ts:684`) |
| `spelling` | 3 | `spelling.typoDetection` (`omp:packages/coding-agent/src/modes/settings.ts:1169`), `spelling.autocomplete` (`omp:packages/coding-agent/src/modes/settings.ts:1182`), `spelling.autocorrect` (`omp:packages/coding-agent/src/modes/settings.ts:1243`) |
| `spotlight` | 8 | `spotlight.experiment.enabled` (`omp:packages/coding-agent/src/spotlight/settings.ts:9`), `spotlight.experiment.holdout` (`omp:packages/coding-agent/src/spotlight/settings.ts:27`), `spotlight.experiment.scoreFree` (`omp:packages/coding-agent/src/spotlight/settings.ts:39`), `spotlight.experiment.tools` (`omp:packages/coding-agent/src/spotlight/settings.ts:51`) |
| `startup` | 5 | `startup.quiet` (`omp:packages/coding-agent/src/modes/settings.ts:1288`), `startup.showSplash` (`omp:packages/coding-agent/src/modes/settings.ts:1300`), `startup.setupWizard` (`omp:packages/coding-agent/src/modes/settings.ts:1313`), `startup.checkUpdate` (`omp:packages/coding-agent/src/modes/settings.ts:1325`) |
| `statusLine` | 10 | `statusLine.preset` (`omp:packages/coding-agent/src/modes/settings.ts:156`), `statusLine.separator` (`omp:packages/coding-agent/src/modes/settings.ts:178`), `statusLine.contextLine` (`omp:packages/coding-agent/src/modes/settings.ts:200`), `statusLine.sessionAccent` (`omp:packages/coding-agent/src/modes/settings.ts:231`) |
| `steeringMode` | 1 | `steeringMode` (`omp:packages/coding-agent/src/modes/settings.ts:900`) |
| `stream` | 2 | `stream.serverUrl` (`omp:packages/coding-agent/src/stream/settings.ts:12`), `stream.redactPatterns` (`omp:packages/coding-agent/src/stream/settings.ts:25`) |
| `stt` | 3 | `stt.enabled` (`omp:packages/coding-agent/src/stt/settings.ts:10`), `stt.language` (`omp:packages/coding-agent/src/stt/settings.ts:21`), `stt.submitTrigger` (`omp:packages/coding-agent/src/stt/settings.ts:24`) |
| `symbolPreset` | 1 | `symbolPreset` (`omp:packages/coding-agent/src/modes/settings.ts:92`) |
| `systemPromptTemplates` | 1 | `systemPromptTemplates` (`omp:packages/coding-agent/src/session/settings.ts:481`) |
| `task` | 35 | `task.isolation.enabled` (`omp:packages/coding-agent/src/task/settings.ts:28`), `task.isolation.apply` (`omp:packages/coding-agent/src/task/settings.ts:160`), `task.isolation.merge` (`omp:packages/coding-agent/src/task/settings.ts:201`), `task.isolation.commits` (`omp:packages/coding-agent/src/task/settings.ts:219`) |
| `tasks` | 1 | `tasks.todoClearDelay` (`omp:packages/coding-agent/src/tools/settings.ts:485`) |
| `telemetry` | 1 | `telemetry.otlpExportEnabled` (`omp:packages/coding-agent/src/telemetry-settings.ts:9`) |
| `temperature` | 1 | `temperature` (`omp:packages/coding-agent/src/session/settings.ts:568`) |
| `terminal` | 3 | `terminal.showImages` (`omp:packages/coding-agent/src/modes/settings.ts:302`), `terminal.showProgress` (`omp:packages/coding-agent/src/modes/settings.ts:395`), `terminal.programStatus` (`omp:packages/coding-agent/src/modes/settings.ts:408`) |
| `textVerbosity` | 1 | `textVerbosity` (`omp:packages/coding-agent/src/session/settings.ts:708`) |
| `theme` | 2 | `theme.dark` (`omp:packages/coding-agent/src/modes/settings.ts:64`), `theme.light` (`omp:packages/coding-agent/src/modes/settings.ts:78`) |
| `thinkingBudgets` | 6 | `thinkingBudgets.minimal` (`omp:packages/coding-agent/src/session/settings.ts:1749`), `thinkingBudgets.low` (`omp:packages/coding-agent/src/session/settings.ts:1751`), `thinkingBudgets.medium` (`omp:packages/coding-agent/src/session/settings.ts:1753`), `thinkingBudgets.high` (`omp:packages/coding-agent/src/session/settings.ts:1755`) |
| `tier` | 5 | `tier.openai` (`omp:packages/coding-agent/src/session/settings.ts:726`), `tier.anthropic` (`omp:packages/coding-agent/src/session/settings.ts:741`), `tier.google` (`omp:packages/coding-agent/src/session/settings.ts:756`), `tier.subagent` (`omp:packages/coding-agent/src/session/settings.ts:771`) |
| `title` | 4 | `title.icons` (`omp:packages/coding-agent/src/utils/title-settings.ts:14`), `title.generator` (`omp:packages/coding-agent/src/utils/title-settings.ts:36`), `title.refreshOnReplan` (`omp:packages/coding-agent/src/utils/title-settings.ts:58`), `title.refreshAfterPrompts` (`omp:packages/coding-agent/src/utils/title-settings.ts:70`) |
| `todo` | 6 | `todo.enabled` (`omp:packages/coding-agent/src/tools/settings.ts:378`), `todo.reminders` (`omp:packages/coding-agent/src/tools/settings.ts:390`), `todo.remindersMax` (`omp:packages/coding-agent/src/tools/settings.ts:402`), `todo.midRunNudges` (`omp:packages/coding-agent/src/tools/settings.ts:420`) |
| `tools` | 19 | `tools.format` (`omp:packages/coding-agent/src/session/context-settings.ts:456`), `tools.artifactSpillThreshold` (`omp:packages/coding-agent/src/tools/settings.ts:13`), `tools.artifactTailBytes` (`omp:packages/coding-agent/src/tools/settings.ts:39`), `tools.artifactHeadBytes` (`omp:packages/coding-agent/src/tools/settings.ts:61`) |
| `topK` | 1 | `topK` (`omp:packages/coding-agent/src/session/settings.ts:608`) |
| `topP` | 1 | `topP` (`omp:packages/coding-agent/src/session/settings.ts:588`) |
| `treeFilterMode` | 1 | `treeFilterMode` (`omp:packages/coding-agent/src/modes/settings.ts:1136`) |
| `tts` | 2 | `tts.localVoice` (`omp:packages/coding-agent/src/tts/settings.ts:15`), `tts.localSpeed` (`omp:packages/coding-agent/src/tts/settings.ts:29`) |
| `ttsr` | 8 | `ttsr.enabled` (`omp:packages/coding-agent/src/export/ttsr-settings.ts:9`), `ttsr.judge` (`omp:packages/coding-agent/src/export/ttsr-settings.ts:21`), `ttsr.contextMode` (`omp:packages/coding-agent/src/export/ttsr-settings.ts:44`), `ttsr.interruptMode` (`omp:packages/coding-agent/src/export/ttsr-settings.ts:57`) |
| `tui` | 26 | `tui.maxInlineImageColumns` (`omp:packages/coding-agent/src/modes/settings.ts:340`), `tui.maxInlineImageRows` (`omp:packages/coding-agent/src/modes/settings.ts:348`), `tui.maxInlineImages` (`omp:packages/coding-agent/src/modes/settings.ts:357`), `tui.resizeScrollback` (`omp:packages/coding-agent/src/modes/settings.ts:365`) |
| `update` | 2 | `update.channel` (`omp:packages/coding-agent/src/modes/settings.ts:1337`), `update.auto` (`omp:packages/coding-agent/src/modes/settings.ts:1360`) |
| `vault` | 1 | `vault.enabled` (`omp:packages/coding-agent/src/tools/settings.ts:880`) |
| `web_search` | 1 | `web_search.enabled` (`omp:packages/coding-agent/src/tools/settings.ts:943`) |
| `workspace` | 1 | `workspace.additionalDirectories` (`omp:packages/coding-agent/src/session/context-settings.ts:13`) |
| `worktree` | 5 | `worktree.clone` (`omp:packages/coding-agent/src/task/settings.ts:83`), `worktree.cleanSource` (`omp:packages/coding-agent/src/task/settings.ts:97`), `worktree.onStart` (`omp:packages/coding-agent/src/task/settings.ts:111`), `worktree.onExit` (`omp:packages/coding-agent/src/task/settings.ts:130`) |
