# Optional Packages

Two third-party packages extend nycode without being bundled with it: `pr-review-toolkit` and `claude-red`. Each installs from its source repository at a fixed commit, so a clone never moves without a change here. Nothing in this page is needed for nycode to run. The `offensive-*` references of the `security-audit` skill use these packages when present.

`ponytail` and `ralph-loop` are no longer optional: they ship inside nycode and are on by default (decision D-54, which supersedes D-11). The pinned forks are embedded at the commits `DietrichGebert/ponytail` v5.3.3 (`7801d06`) and `marcioazam/ralph-loop@9e7f895`, with the authors' licenses in `NOTICE` and next to the files. Nothing is installed or fetched. See [Embedded ponytail and ralph-loop](#embedded-ponytail-and-ralph-loop).

Installing a package runs no code, but packages can ship extensions and skills that instruct the model to run programs: read the source before you install. See [Nycode Packages](packages.md) for how `nycode install` works.

## Install

```bash
nycode install git:github.com/anthropics/claude-plugins-official@893173fb82a7184fcf3f08ae55930016d84fd588
nycode install git:github.com/SnailSploit/Claude-Red@a8de813edc9f66f60d44cfe42d47750e89d9930b
```

Each clone lands in `~/.nycode/agent/git/github.com/<owner>/<repo>` and the declaration is written to `packages` in `~/.nycode/agent/settings.json`. The installer loads only extensions, skills, prompt templates and themes, and registers no hooks, so the steps under each package below are manual.

| Package | Source | Pinned commit | License | What it adds |
| --- | --- | --- | --- | --- |
| pr-review-toolkit | `anthropics/claude-plugins-official`, directory `plugins/pr-review-toolkit` | `893173f` | Apache-2.0 | 6 reviewer prompts (`code-reviewer`, `code-simplifier`, `comment-analyzer`, `pr-test-analyzer`, `silent-failure-hunter`, `type-design-analyzer`) |
| claude-red | `SnailSploit/Claude-Red` (Copyright (c) 2024-2025 SnailSploit / Kai Aizen) | `a8de813` | MIT | 79 offensive-security skills |

## Embedded ponytail and ralph-loop

| Embedded | Source | Pinned commit | License | Where |
| --- | --- | --- | --- | --- |
| ponytail | `DietrichGebert/ponytail`, tag v5.3.3 (`7801d061243d7b753bad0e0b3c057cd250b11755`) | `7801d06` | MIT | extension `ponytail` (TypeScript port, `src/extensions/ponytail/`), 6 skills `ponytail`, `-audit`, `-debt`, `-gain`, `-help`, `-review` |
| ralph-loop | `marcioazam/ralph-loop`, fork of `anthropics/claude-plugins-official` `893173f`, `plugins/ralph-loop` with history | `9e7f895` | Apache-2.0 | `resources/ralph-loop/` (`Stop` hook, `start-ralph-loop.sh`, `setup-ralph-loop.sh`) |

The forks differ from their upstreams as follows: ponytail v5.3.3 gives the rules to subagents whose `tools:` include `edit` or `write`, or are unrestricted, and nycode recognizes its child processes through `NYCODE_SUBAGENT`; ralph-loop passes the command arguments through a quoted heredoc, so `<promise>X</promise>` in a prompt is no longer shell syntax (upstream issue [anthropics/claude-plugins-official#748](https://github.com/anthropics/claude-plugins-official/issues/748)). The authors' licenses and notices stay in `NOTICE` and in `resources/ponytail/` and `resources/ralph-loop/`.

ponytail adds the `ponytail` section to the system prompt at level `full`. `/ponytail lite|full|ultra|off|status|default <level>` changes it for the session; `PONYTAIL_DEFAULT_MODE` or `~/.config/ponytail/config.json` set the default. By default nycode sets `PONYTAIL_QUIET_STARTUP=1`; subagents get the rules when their `tools:` include `edit` or `write` or are unrestricted. `PONYTAIL_SUBAGENT_MATCHER` overrides that choice: set a regular expression (unanchored, case-insensitive, matched against the subagent name) in `env`:

```json
{
  "env": { "PONYTAIL_SUBAGENT_MATCHER": "general|plan" }
}
```

To turn ponytail off for every session, add `"-builtin:ponytail"` to `extensions` in `~/.nycode/agent/settings.json`.

ralph-loop's `Stop` hook is not a default hook: the hooks extension registers it only while a `/ralph-loop` state file (`.claude/ralph-loop.local.md`) exists in the working directory, so a session without a loop pays nothing. The hook returns the same prompt on each stop until the completion promise or the iteration limit; `--max-iterations` defaults to 20 (`0` is unlimited) and `/cancel-ralph` ends the loop. The hook needs `bash`, and `jq` once a loop is active. An entry for the `Stop` event in `settings.json` replaces the default list of that event (see [Settings](settings.md#embedded-hooks-and-status-line)). The impeccable design gate that used to run after it is a personal hook, not part of nycode.

If you installed either package from the fork before D-54, remove it (`nycode remove git:github.com/marcioazam/ponytail@a75382edeb22ec2917cdfa487c6202d8b6f26c99`, same for `ralph-loop`) and delete the `hooks.Stop` entry of the old instructions: the clone and the embedded copy would otherwise load twice.

## pr-review-toolkit

The repository installs whole (the installer takes no subdirectory) and exposes no resource itself. Read the reviewer prompts from `~/.nycode/agent/git/github.com/anthropics/claude-plugins-official/plugins/pr-review-toolkit/agents/`: `code-reviewer.md`, `code-simplifier.md`, `comment-analyzer.md`, `pr-test-analyzer.md`, `silent-failure-hunter.md` and `type-design-analyzer.md`. They are not registered as agents.

## claude-red

The skills sit in a `Skills` directory with a capital letter, which the installer does not discover. Add it to `skills` in `~/.nycode/agent/settings.json`:

```json
{
  "skills": ["~/.nycode/agent/git/github.com/SnailSploit/Claude-Red/Skills"]
}
```

This loads 79 skills. They are offensive-security material; the `security-audit` skill stays defensive and does not use them.

## Remove

`nycode remove git:github.com/anthropics/claude-plugins-official@893173fb82a7184fcf3f08ae55930016d84fd588` removes the clone and the declaration. Delete the `skills` entry above by hand.
