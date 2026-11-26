# Settings Reference

This reference lists user-configurable settings, their types, defaults, and purposes. Project settings override agent-directory settings. Resource lists are combined. See [Configuration](configuration.md) for file locations and trust behavior.

Add `"$schema": "https://raw.githubusercontent.com/marcioazam/nycode/main/packages/coding-agent/schemas/settings.schema.json"` to `settings.json` for editor validation and completion.

## Model and thinking

<a id="model-cycling"></a>

| Setting | Type | Default | Description |
|---|---|---|---|
| `defaultProvider` | string | Automatic | Startup AI provider. |
| `defaultModel` | string | Automatic | Startup model ID. |
| `defaultThinkingLevel` | `"off" \| "minimal" \| "low" \| "medium" \| "high" \| "xhigh" \| "max"` | `"medium"` | Startup thinking level. |
| `modelThinkingLevels` | object | None | Per-model startup thinking levels keyed by exact `provider/modelId`. |
| `thinkingBudgets` | object | Built-in budgets | Token budgets for `minimal`, `low`, `medium`, and `high` thinking levels. |
| `enabledModels` | `string[]` | All available models | Model patterns used for startup selection and model cycling. Uses the same format as `--models`. |
| `hideThinkingBlock` | boolean | `false` | Hide thinking blocks in the transcript. |
| `showCacheMissNotices` | boolean | `false` | Show notices for significant cache misses, successful cache warming, compaction usage, and provider recovery. |
| `cacheWarming` | `"off" \| "streaming" \| "idle"` | `"idle"` | Keep eligible provider prompt caches warm during active runs and, with `"idle"`, for up to 30 minutes between runs. `"streaming"` warms only during active runs. Global setting only. |

Cache warming runs only when the model declares a cache lifetime and Nycode estimates at least $0.05 in avoided cache-miss cost. Refresh usage counts toward session totals but does not enter model context. `/session` shows the next decision; extensions can override it with `cache_warming_decision`. See [Prompt Cache Lifetimes](models.md#prompt-cache-lifetimes).

See [Choose a Model](models.md) for model selection and thinking controls.

## Interaction

| Setting | Type | Default | Description |
|---|---|---|---|
| `steeringMode` | `"all" \| "one-at-a-time"` | `"one-at-a-time"` | How queued steering messages are delivered. |
| `followUpMode` | `"all" \| "one-at-a-time"` | `"one-at-a-time"` | How queued follow-up messages are delivered. |
| `externalEditor` | string | `$VISUAL`, `$EDITOR`, then platform default | Command opened by the external-editor keybinding. |
| `doubleEscapeAction` | `"tree" \| "fork" \| "none"` | `"tree"` | Action for double Escape with an empty editor. |
| `treeFilterMode` | `"default" \| "no-tools" \| "user-only" \| "labeled-only" \| "all"` | `"default"` | Initial filter used by `/tree`. |
| `defaultProjectTrust` | `"ask" \| "always" \| "never"` | `"ask"` | Fallback project-trust behavior. **Can only be set in agent-directory settings.** |

## Tools

| Setting | Type | Default | Description |
|---|---|---|---|
| `defaultTools` | `string[]` | `read`, `bash`, `edit`, `write` | Tools enabled at startup. Plain names replace the defaults; `+name` adds a tool and `-name` removes one. An empty array disables all built-in tools but not extension or SDK tools. |
| `codemode.mode` | `"on"` \| `"only"` | `"on"` | How the `codemode` tool presents tools while it is active. `on`: declared tools get a note on calling them from scripts appended to their description, and `codemode` lists only tools that are not declared. `only`: `codemode` lists every tool scripts can call, and active built-in and extension tools are hidden from the model, so it reaches them through `codemode`. |
| `codemode.inlineBudget` | number | `3000` | Estimated tokens (characters / 4) the `codemode` tool's description may spend on tool declarations. Tools that do not fit are left out and found with `searchTools()`. `0` lists only namespaces. |

Available built-in tools are `read`, `bash`, `powershell`, `edit`, `write`, `grep`, `find`, and `ls`. `defaultTools` can also name `codemode` and `tool_search`, which built-in extensions register inactive, and other extension tools registered inactive.

A list of only `+name` and `-name` entries changes the inherited selection instead of replacing it. For example, this enables `codemode` next to the default tools:

```json
{
  "defaultTools": ["+codemode"]
}
```

This replaces `bash` with `powershell` and enables `grep`: `["-bash", "+powershell", "+grep"]`. Project settings apply on top of user settings: a project list with only `+name` and `-name` entries changes the user's selection, and a project list with a plain name replaces it. In one list, plain names form the selection, and `+name` and `-name` then apply in order.

`/reload` enables tools newly added to `defaultTools`. It does not disable tools removed from it or re-enable unchanged tools you turned off. `--tools` with plain names, `--no-tools`, and `--no-builtin-tools` override `defaultTools`, also on reload.

CLI tool options override this setting for one invocation. `--tools` with only `+name` and `-name` entries changes the resolved `defaultTools` selection instead, for example `nycode --tools +codemode`. On `/reload`, these entries apply to the reloaded setting too, so a tool removed with `-name` stays removed. See [Command Line](cli.md#tools).

## Sessions and context

| Setting | Type | Default | Description |
|---|---|---|---|
| `sessionDir` | string | Agent session directory | Session storage directory. Relative paths resolve from the working directory. `NYCODE_CODING_AGENT_SESSION_DIR` and `--session-dir` override this setting. |
| `sessionShareDestination` | `"auto" \| "gist" \| "radius"` | `"auto"` | Destination used by `/share`. `auto` uses Radius when authenticated and otherwise creates a GitHub gist. `gist` always uses a gist. `radius` requires Radius authentication and never falls back to a gist. |

### Compaction

| Setting | Type | Default | Description |
|---|---|---|---|
| `compaction.enabled` | boolean | `true` | Enable automatic compaction. |
| `compaction.reserveTokens` | number | `16384` | Free context tokens below which automatic compaction starts. |
| `compaction.keepRecentTokens` | number | `20000` | Recent tokens retained without summarization. |
| `compaction.maxContextTokens` | number | `250000` | Absolute context size in tokens that triggers compaction, whatever the model window. `NYCODE_COMPACT_AT` takes precedence. |
| `compaction.modelOverrides` | object | None | Per-model token settings keyed by exact `provider/modelId`. |

<a id="per-model-compaction-overrides"></a>

Compaction token values must be non-negative safe integers. Each value resolves independently from the matching model override, then the ordinary compaction setting, then the built-in default. Project and user objects merge before model lookup.

See [Compaction Reference](compaction.md) for trigger, summarization, and validation behavior.

### Branch summaries

| Setting | Type | Default | Description |
|---|---|---|---|
| `branchSummary.reserveTokens` | number | `16384` | Tokens reserved when summarizing branch history. |
| `branchSummary.skipPrompt` | boolean | `false` | Skip the branch-summary prompt and default to no summary. |

## Terminal and display

| Setting | Type | Default | Description |
|---|---|---|---|
| `theme` | string | `"system"` | Built-in or custom theme name. `system` derives colors from the terminal theme. |
| `quietStartup` | boolean \| `"header"` | `"header"` | `true` hides the startup header and loaded-resource listing. `"header"` keeps the header (version and key hints) but hides the model scope line and loaded-resource listing. |
| `tuiMode` | `"regular" \| "fullscreen"` | `"fullscreen"` | Interactive terminal UI mode. |
| `fullscreenExitOutput` | `"transcript" \| "resume-hint"` | `"transcript"` | Output printed when fullscreen mode exits. |
| `fullscreenScrollbar` | `"auto" \| "always" \| "hidden"` | `"auto"` | Fullscreen transcript scrollbar behavior. |
| `fullscreenCopyOnSelect` | boolean | `true` | Copy selected text automatically in fullscreen mode. |
| `fullscreenWheelScrollLines` | `"auto"` \| number | `"auto"` | Lines per mouse-wheel event in fullscreen mode, from 1 to 100. `"auto"` moves one line per event in local macOS terminals, which already accelerate wheel and trackpad input; elsewhere, and over SSH, it speeds up fast wheel spins to at most 6 lines per event. Alt+wheel moves five times as far. |
| `editorPaddingX` | number | `0` | Horizontal editor padding from 0 to 3 cells. |
| `outputPad` | `0 \| 1` | `1` | Horizontal transcript padding for messages, tool output, `!` command output, and summary blocks. |
| `autocompleteMaxVisible` | number | `5` | Visible autocomplete entries, from 3 to 20. |
| `showHardwareCursor` | boolean | `false` | Use the terminal cursor instead of Nycode's drawn cursor. Nycode still positions it for input methods. |
| `terminal.showImages` | boolean | `true` | Display inline images when supported. |
| `terminal.imageWidthCells` | number | `60` | Preferred inline image width in terminal cells. |
| `terminal.clearOnShrink` | boolean | `false` | Clear empty rows when rendered content shrinks. When unset, `NYCODE_CLEAR_ON_SHRINK=1` enables it. |
| `terminal.showTerminalProgress` | boolean | `false` | Show OSC 9;4 progress in the terminal tab. |
| `terminal.hyperlinks` | `boolean \| "auto"` | `"auto"` | Override OSC 8 hyperlink detection. |
| `terminal.images` | `"kitty" \| "iterm2" \| "auto" \| false` | `"auto"` | Override inline-image protocol detection. |
| `terminal.trueColor` | `boolean \| "auto"` | `"auto"` | Override true-color detection. |
| `images.autoResize` | boolean | `true` | Resize images to at most 2000 by 2000 pixels before sending them to a model. |
| `images.blockImages` | boolean | `false` | Prevent images from being sent to models. |
| `markdown.codeBlockIndent` | string | `"  "` | Prefix used to indent rendered code blocks. |
| `markdown.mermaid` | `"off" \| "final" \| "streaming"` | `"streaming"` | Mermaid rendering mode. |

See [Themes](themes.md) and [Terminal Setup](terminal-setup.md) for format and platform details.

## Network and retries

| Setting | Type | Default | Description |
|---|---|---|---|
| `transport` | `"auto" \| "sse" \| "websocket" \| "websocket-cached"` | `"auto"` | Preferred transport for AI providers that support multiple transports. |
| `httpProxy` | string | None | Proxy URL applied as `HTTP_PROXY` and `HTTPS_PROXY` for Nycode-managed HTTP clients. **Can only be set in agent-directory settings.** |
| `httpIdleTimeoutMs` | number \| `"disabled"` | `300000` | HTTP header and body idle timeout in milliseconds. Set to `0` or `"disabled"` to disable. |
| `websocketConnectTimeoutMs` | number \| `"disabled"` | `15000` | WebSocket connection timeout in milliseconds. Set to `0` or `"disabled"` to disable. |
| `retry.enabled` | boolean | `true` | Enable automatic agent-level retry for transient failures. |
| `retry.maxRetries` | number | `10` | Maximum agent-level retry attempts. |
| `retry.baseDelayMs` | number | `2000` | Initial exponential-backoff delay in milliseconds. |
| `retry.maxAgentDelayMs` | number | `60000` | Maximum agent-level retry delay in milliseconds. |
| `retry.provider.timeoutMs` | number | `httpIdleTimeoutMs` | Provider request timeout in milliseconds. |
| `retry.provider.maxRetries` | number | `0` | Provider-level retry attempts. |
| `retry.provider.maxRetryDelayMs` | number | `60000` | Maximum server-requested delay in milliseconds. Set to `0` to disable the limit. |

Keep `retry.provider.maxRetries` at `0` unless provider-level retries are required. Provider retries can delay Nycode from handling quota and usage-limit errors itself.

## Shell

| Setting | Type | Default | Description |
|---|---|---|---|
| `shellPath` | string | Platform default | Custom shell executable path. Supports a leading `~`. |
| `shellCommandPrefix` | string | `export GIT_EDITOR=true GIT_SEQUENCE_EDITOR=true GIT_MERGE_AUTOEDIT=no GIT_PAGER=cat PAGER=cat AWS_PAGER= LESS=FRX` | Prefix prepended to every shell command. The default keeps git and pagers from waiting on a terminal. |
| `npmCommand` | `string[]` | `npm` | Command and arguments used for npm package lookup and installation. |
| `selfUpdateCommand` | `string[]` | None | Command and arguments `nycode update` runs to update Nycode itself, with `{packageName}`, `{version}`, and `{installSpec}` placeholders. `NYCODE_SELF_UPDATE_COMMAND` takes precedence. **Can only be set in agent-directory settings.** See [Custom update command](cli.md#custom-update-command). |

See [Shell aliases](shell-aliases.md) for shell setup and [Nycode Packages](packages.md) for package-manager behavior.

## Resources

Resource paths in user settings resolve from the agent directory. Paths in project settings resolve from the project `.nycode` directory. Absolute paths and `~` are supported.

| Setting | Type | Default | Description |
|---|---|---|---|
| `packages` | array | `[]` | npm, git, or local Nycode package sources. See [Nycode Packages](packages.md). |
| `extensions` | `string[]` | `[]` | Extension files or directories. |
| `skills` | `string[]` | `[]` | Skill files or directories. |
| `prompts` | `string[]` | `[]` | Prompt-template files or directories. |
| `themes` | `string[]` | `[]` | Theme files or directories. |
| `enableSkillCommands` | boolean | `true` | Register skills as `/skill:name` commands. |

Resource arrays support glob exclusions with `!pattern`, exact inclusion with `+path`, and exact exclusion with `-path`. Nycode loads resources listed in both user-level and project settings.

The built-in extensions are named `builtin:mcp`, `builtin:llama.cpp`, `builtin:codemode`, and `builtin:tool-search` in `extensions`. They load by default; `-builtin:mcp` disables one. A `+builtin:<name>` or `-builtin:<name>` entry in project settings overrides the user setting. The `web` extension (`web_fetch`) loads by default too (D-52); `-builtin:web` turns it off. `web_search` is not registered unless `NYCODE_KEEP_WEB_SEARCH=1` is set in the environment (it scrapes DuckDuckGo and often fails; the default search is an MCP server). A built-in extension that ships off by default would load only when `"extensions": ["builtin:<name>"]` (or `+builtin:<name>`) is set or `-e builtin:<name>` is passed; none does today. `nycode config` lists them under Built-in. `--no-extensions` disables them too, and `-e builtin:<name>` loads one explicitly.

## Permissions, harness, and integrations

These keys only exist, validate, and are read here; the built-in extensions that use them read them through `SettingsManager.getNycodeSettings()`. Each key has a variable that takes precedence over `settings.json`, so automation can override a file without editing it. Variables that hold a switch accept `1`/`true` and `0`/`false`; a value that does not parse is ignored and the `settings.json` value applies. See [Environment variables](environment-variables.md#nycode-settings-variables).

| Setting | Type | Default | Variable | Description |
|---|---|---|---|---|
| `permissions.bypass` | boolean | `false` | `NYCODE_BYPASS_PERMISSIONS` | Auto-approve permission prompts; deny rules still apply. `--bypass` and `--dangerously-skip-permissions` turn it on for one run, `--safe` and `--no-bypass` turn it off; a flag beats the variable, which beats the file. **Can only be set in agent-directory settings.** |
| `permissions.engine` | `"native"` | `"native"` | none | Who decides the permission of each tool call: the in-process TypeScript engine, the only one. Any other value denies every tool call; the removed `"script"` engine (`guard.py`) is refused by name. Global setting only: a project `settings.json` cannot change it. |
| `harness.effortSandwich.enabled` | boolean | `false` | `NYCODE_EFFORT_SANDWICH` | High thinking on the first turns of a top-level headless run. |
| `harness.effortSandwich.turns` | integer ≥ 1 | `1` | `NYCODE_EFFORT_SANDWICH_TURNS` | Turns that use high thinking. |
| `subagent.respawn` | boolean | `true` | `NYCODE_SUBAGENT_RESPAWN` | Respawn a crashed foreground subagent. |
| `harness.headless.lean` | boolean | `true` | `NYCODE_HEADLESS_LEAN` | Lean prompt and tools in top-level headless runs. |
| `harness.headless.trim` | boolean | `true` | `NYCODE_HEADLESS_TRIM` | Trim docs and tool schemas in headless runs. |
| `harness.headless.tools` | `"lean" \| "all"` | `"lean"` | `NYCODE_HEADLESS_TOOLS` | `"all"` keeps `subagent`, `memory`, `lsp_*`, and `todo` in headless runs. |
| `harness.headless.floor` | boolean | `true` | `NYCODE_HEADLESS_FLOOR` | Add the headless instruction floor. |
| `tools.bash.backgroundOnTimeout` | boolean | `false` | `NYCODE_BASH_TIMEOUT_BG` | Keep a command that hits its timeout running in the background. |
| `todo.staleReminder` | boolean | `true` | `NYCODE_TODO_SYNC` | Remind the model of a stale todo list. |
| `todo.sync` | boolean | `false` | `NYCODE_TODO_SYNC_V2` | End-of-turn todo check, items for background runs and subagents, rarer stale reminder (disable only the check with `-builtin:todo-turn-check`). |
| `harness.prefixCache1h` | boolean \| `"auto"` | `"auto"` | `NYCODE_PREFIX_CACHE_1H` | One-hour prompt-prefix cache TTL; `"auto"` enables it in interactive sessions only. |
| `harness.autoResume` | boolean | `true` | `NYCODE_AUTO_RESUME` | Resume a turn cut short by a transient failure. |
| `plan.gate` | boolean | `true` | `NYCODE_PLAN_GATE` | Keep plan mode open until the plan is submitted. |
| `plan.readOnlyTools` | `string[]` | `[]` | none | Tools plan mode allows besides the read-only built-ins and the MCP tools that declare `readOnlyHint`. Tool names or simple globs, for example `"mcp__docs__*"`. |
| `harness.completionGate` | boolean | `true` | `NYCODE_COMPLETION_GATE` | Block a final answer while the task has unfinished steps. |
| `bash.mainGuard.enabled` | boolean | `true` | none | In the main interactive session only: cap the `bash` timeout and refuse `sleep` of 30 s or more and polling loops, so control returns to you (`run wait` is capped at 30 s). Subagents and print mode are not affected. |
| `bash.mainGuard.timeoutSec` | integer ≥ 1 | `120` | none | Timeout in seconds of a `bash` call that sets none, in the main session. |
| `bash.mainGuard.capSec` | integer ≥ 1 | `600` | none | Longest timeout in seconds a `bash` call may ask for, in the main session. |
| `footer.stats` | boolean | `false` | none | Show the stats line (tokens, cost and model) in the footer. |
| `editorMode` | `"normal" \| "vim"` | `"normal"` | none | Prompt editor keys. `"vim"` turns on modal editing; it replaces the removed `/vim` command, as in Claude Code, where the toggle is `/config` → Editor mode. |
| `notify.sound` | boolean | `true` | `NYCODE_SOUND_NOTIFY` | Play a sound when the agent finishes. Read by the `notify` extension; the `/notifications` panel (alias `/avisos`) toggles it. |
| `notify.desktop` | boolean | `true` | none | Send a desktop notification when the agent finishes. Read by the `notify` extension; the `/notifications` panel (alias `/avisos`) toggles it. |
| `terminal.uiState` | string | `ui-state.json` in the agent directory | `NYCODE_UI_STATE` | File that stores the editor UI state. |
| `terminal.reducedMotion` | boolean | `false` | `NYCODE_REDUCED_MOTION` | Reduce animation. |
| `terminal.nerdFont` | boolean \| `"auto"` | `"auto"` | `NYCODE_NERD_FONT` | Use Nerd Font icons; `"auto"` detects kitty. |
| `terminal.asciiIcons` | boolean | `false` | `NYCODE_ASCII_ICONS` | Use plain Unicode icons. |
| `mcp.configPath` | string | `mcp.json` in the agent directory | `NYCODE_MCP_CONFIG` | MCP servers file. |
| `hooks` | object | Embedded hooks (below) | none | Hooks by event name, each `[{ "matcher": "Bash", "hooks": [{ "type": "command", "command": "...", "timeout": 30 }] }]` (a hook of the core is `{ "type": "internal", "name": "core-notes" }`); run by the hooks extension. An event named here replaces that event's embedded default. |
| `statusLine` | object | Embedded claude-hud launcher (below) | none | `{ "type": "command", "command": "...", "padding": 0 }`; status line command. An empty `command` turns the status line off. |
| `env` | `Record<string, string>` | `{ "EIO_BACKEND": "posix", "PONYTAIL_QUIET_STARTUP": "1" }` | none | Variables exported to the nycode process, so to hooks and the status line command. A value here overrides the default. |

`quietStartup`, `retry`, and `shellCommandPrefix` above carry the pre-migration Nycode defaults. `defaultProjectTrust` was `"never"` there; it is `"ask"` now, so entering an untrusted project prompts once and saves the decision instead of needing `/trust` and a restart.

### `local.env`

Nycode reads `~/.nycode/agent/local.env` (the agent directory; `NYCODE_LOCAL_ENV` names another file) at startup, before it reads any other variable (D-52). The file is `KEY=VALUE` lines, `#` comments, no `export`, no quoting rules beyond one pair of matching quotes around a value. Values are literal: nothing is expanded or evaluated. Only these keys are read; any other line is ignored with a `local.env:<n> ignored` warning on stderr:

`NYCODE_BYPASS_PERMISSIONS`, `NYCODE_COMPACT_AT`, `PONYTAIL_QUIET_STARTUP`, `NYCODE_SUBAGENT_RESPAWN`, `NYCODE_EFFORT_SANDWICH`, `NYCODE_EFFORT_SANDWICH_TURNS`.

The file must belong to you and have mode `0600` or `0400`; otherwise nothing is loaded and a warning says why (not checked on Windows). A variable already set in the real environment wins over the file; the file wins over `settings.json`, like any `NYCODE_*` variable. A missing file is fine. Precedence, highest first: the real environment, then `local.env`, then `settings.json`, then the default.

### Embedded hooks and status line

nycode registers one hook of the core by default, `core-notes`, which runs in-process (no `bash`, no `jq`). It only adds
notes to the model's context and never blocks. The permission guard is not a hook: it is the native engine
(`permissions.engine`).

| Event | Matcher | Hook |
| --- | --- | --- |
| `SessionStart` | `startup\|resume\|clear\|compact` | `core-notes` |
| `PostToolUse` | `*` | `core-notes` |

`core-notes` adds three notes:

- Untrusted data: a tool result (except the harness's own edit, todo and question confirmations) that contains imperative
  prompt-injection phrasing, in English or Portuguese, gets a note not to follow instructions embedded in it. Only the
  first and last 64 KB of a result are scanned, so a longer result always gets the note. It is a cheap warning, not a
  security boundary.
- MCP launchers: at session start, `mcp.json` servers whose absolute launcher path no longer exists are named in one note
  (bounded to 3 s).
- Test edits: an `Edit` or `Write` of a test file asks the model to justify the change in its final report.

To turn hooks off or replace them:

- One event: an entry in `settings.json` replaces the default of that event, for example a `PostToolUse` list; an empty
  list turns that event's default off. `PreToolUse` has no default (the native engine guards tool calls); the entries of
  the user's or the project's `settings.json` run as they are.
- Every hook: set `"disableAllHooks": true` in `~/.nycode/agent/settings.json` (or the `--settings` file) or in the
  project's `.claude/settings.json` or `settings.local.json`.

The ralph-loop `Stop` hook is not a default: the hooks extension registers it only while a `/ralph-loop` state file
(`.claude/ralph-loop.local.md`) exists in the working directory. `/ralph-loop` runs up to 20 iterations unless
`--max-iterations N` says otherwise (`0` is unlimited). The `ponytail` variable `PONYTAIL_QUIET_STARTUP` is in the default
`env`. See [Optional Packages](optional-packages.md#embedded-ponytail-and-ralph-loop).

The default `statusLine` runs `node "${NYCODE_RESOURCES}/statusline/statusline.mjs"`, the claude-hud launcher. It prints
the built-in `calm` HUD; the claude-hud renderer (`"renderer": "claude-hud"`) is looked up only under
`~/.nycode/agent/plugins/cache` (`/claude-hud-setup`). A `statusLine` in a project settings file replaces the default,
and one in nycode's `settings.json` replaces both. `"statusLine": { "type": "command", "command": "" }` turns it off.

## Updates, telemetry, and warnings

| Setting | Type | Default | Description |
|---|---|---|---|
| `collapseChangelog` | boolean | `false` | Show a condensed changelog after an update. Also condenses extension package changelogs to one line per package. |
| `enableInstallTelemetry` | boolean | `true` | Enable selected provider attribution headers (there is no install report). Does not control update checks. |
| `enableAnalytics` | boolean | `false` | Opt in to analytics data sharing. Currently used only by the experimental first-run setup. |
| `warnings.anthropicExtraUsage` | boolean | `true` | Warn when Anthropic subscription authentication may use paid extra usage. |
