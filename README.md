<p align="center">
  <img src="docs/assets/nycode-pixel.svg" alt="Nycode" width="480">
</p>

<p align="center">
  <a href="https://github.com/marcioazam/nycode/releases/latest"><img src="https://img.shields.io/badge/release-beta-orange?style=flat-square" alt="Beta"></a>
  <a href="https://github.com/marcioazam/nycode/releases/latest"><img src="https://img.shields.io/github/v/release/marcioazam/nycode?style=flat-square" alt="Latest beta release"></a>
  <a href="https://github.com/marcioazam/nycode/actions/workflows/ci.yml"><img src="https://github.com/marcioazam/nycode/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/marcioazam/nycode/actions/workflows/ci-security.yml"><img src="https://github.com/marcioazam/nycode/actions/workflows/ci-security.yml/badge.svg" alt="Security"></a>
  <a href="https://github.com/marcioazam/nycode/actions/workflows/codeql.yml"><img src="https://github.com/marcioazam/nycode/actions/workflows/codeql.yml/badge.svg" alt="CodeQL"></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/marcioazam/nycode"><img src="https://api.scorecard.dev/projects/github.com/marcioazam/nycode/badge" alt="OpenSSF Scorecard"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT License"></a>
</p>

# Nycode

Nycode is a terminal coding agent with its harness built in: extensions, hooks, skills, agents, themes, a status line and a native TypeScript permission engine ship inside one standalone binary. It reads and edits files, runs shell commands, talks to many model providers, and can be driven [interactively](packages/coding-agent/docs/usage.md), in [print or JSON mode](packages/coding-agent/docs/cli.md), over [RPC](packages/coding-agent/docs/rpc.md) or from the [TypeScript SDK](packages/coding-agent/docs/sdk.md).

Nycode is in **beta**. The latest [GitHub Release](https://github.com/marcioazam/nycode/releases/latest) is the beta to install. Behavior can still change. Versions stay on `2.0.x`, the line opened by `2.0.0` when nycode broke from pi 1.x. Beta is the product stage, not part of the version: a `0.x` number or a `-beta` suffix would sort below the releases already published, and `nycode update` would ignore it.

It is a fork of the pi coding agent that absorbed the former `ny-pi` harness. Everything the harness used to add from outside (a wrapper script, runtime patches, a separate config directory) is now part of the product.

## Contents

- [Why Nycode](#why-nycode) · [What is built in](#what-is-built-in)
- [Install](#install) · [First run](#first-run) · [Migrating from ny-pi or pi](#migrating-from-ny-pi-or-pi)
- [Where your configuration lives](#where-your-configuration-lives) · [Permissions](#permissions)
- [Benchmarks](#benchmarks) · [Packages](#packages)
- [Development](#development) · [Building standalone binaries](#building-standalone-binaries) · [Security and quality gates](#security-and-quality-gates) · [Supply-chain hardening](#supply-chain-hardening)
- [Contributing](#contributing) · [License](#license)

## Why Nycode

The goal: **cost close to Pi Agent, solve at least as many tasks as Claude Code.**

What has been measured so far (same model, Claude Sonnet 5.5, on the pre-migration harness):

| Against | Tasks solved | Cost per task |
|---|---|---|
| Pi Agent (pi with no harness) | **More**: +3.8 points on 42 tasks, +7.9 on 72 Terminal-Bench 2.0 tasks (both intervals above zero) | Higher: 1.2x to 1.3x |
| Claude Code (no configuration) | **Not inferior** on Terminal-Bench 2.0 (+1.4 points, 90% interval -3.2 to +6.0), **not shown ahead** | Lower: 0.57x to 0.82x |

These figures come from the harness before it moved into the core. The post-migration binary has not been benchmarked yet; see [Benchmarks](#benchmarks) for intervals, losses and limits.

## What is built in

- **Terminal UI:** animated header wordmark, capsule composer, tool cards for read, shell, diff and subagents, compact and diff views, sticky prompt with jump-to-end, chat margin, code blocks with copy, image preview, the `calm` status line (HUD) and the built-in themes `nycode-claro`, `nycode-escuro`, `nycode-noite`, `tokyo-night` and `mono`. Motion respects `NYCODE_REDUCED_MOTION` and `NO_COLOR`.
- **Agent workflow:** `subagent` with fleet panel and model routing, `plan-mode` and `plan-gate`, `goal`, `todo`, `question`, `memory`, `git-checkpoint` with `/rewind`, `contexto` (per-session compaction limit), `travar-modelos`, `auto-resume`, `ponytail` and `ralph-loop`.
- **Tools and integrations:** `lsp`, `mcp`, `web_fetch`, `codemode`, `tool-search`, `llama.cpp`, and `/puxar` to import a session from another tool on request.
- **Safety:** the native permission engine (on by default), hooks, notices (`avisos`) and diagnostics (`/diagnostico`, `/doctor`).
- **Lifecycle:** native `/restart` and `/update`, no wrapper script.
- **Resources:** rules, agents, skills, commands and helper scripts under `resources/`, at the lowest precedence, so your own files with the same name win.

## Install

Nycode ships as self-contained binaries (no Node.js, no `npm install`) on the [GitHub Releases](https://github.com/marcioazam/nycode/releases) page. It is not published to npm. The latest release is the current beta.

Download the archive for your platform (`darwin-arm64`, `darwin-x64`, `linux-x64`, `linux-arm64`, `windows-x64`, `windows-arm64`) with `SHA256SUMS`, check the hash and put `nycode` on your `PATH` (Linux x64 shown; Windows ships `nycode-<platform>.zip`):

```bash
b=https://github.com/marcioazam/nycode/releases/latest/download
curl -fsSLO "$b/nycode-linux-x64.tar.gz"
curl -fsSLO "$b/SHA256SUMS"
grep " nycode-linux-x64.tar.gz\$" SHA256SUMS | sha256sum -c -
tar -xzf nycode-linux-x64.tar.gz
mkdir -p ~/.local/share/nycode ~/.local/bin
mv nycode ~/.local/share/nycode/current
ln -sfn ~/.local/share/nycode/current/nycode ~/.local/bin/nycode
nycode --version
```

Verify the build provenance with the [GitHub CLI](https://cli.github.com/) 2.49 or newer:

```bash
gh attestation verify nycode-linux-x64.tar.gz -R marcioazam/nycode
```

`nycode update` does not replace a standalone binary in place: it prints the Releases URL of the new version.

**From source** (Node.js 22.19 or newer; `--ignore-scripts` is safe, no lifecycle script is needed):

```bash
git clone https://github.com/marcioazam/nycode.git
cd nycode
npm ci --ignore-scripts
npm run build
node packages/coding-agent/dist/bundle/cli.js
```

`./nycode-test.sh` runs Nycode from the sources without building.

## First run

```bash
cd /path/to/project
nycode
```

Inside Nycode, `/login` (or `nycode auth login <provider>` outside it) connects a subscription or an API key. `?` lists the shortcuts, `/` the commands and `!` runs a shell command. The [documentation](packages/coding-agent/docs/) covers setup and usage in full.

## Migrating from ny-pi or pi

```bash
nycode migrate from-pi          # dry run: prints the plan, writes nothing
nycode migrate from-pi --apply  # applies it, with a backup of every file it replaces
```

It converts `~/.pi/agent` into `~/.nycode/agent`: settings (`PI_*` names become `NYCODE_*`), `local.env`, MCP and LSP configuration, sessions, memory, plans, themes (`pi-claro`, `pi-escuro` and `pi-noite` become the built-in `nycode-*` themes), and the personal layer of the ny-pi harness: skills, agents and commands that Nycode does not embed, and `claude-home/rules/personal.md`, appended to `~/.nycode/agent/AGENTS.md`. Credentials (`auth.json`, `mcp-auth.json`) are copied only after you confirm in a terminal. A file already in the destination is kept, never overwritten, and `~/.pi` is left untouched.

After migrating, sign in again in Nycode (`/login`) when a provider uses OAuth: the copied refresh token stops working as soon as either program refreshes it.

## Where your configuration lives

Your configuration has one home: **`~/.nycode/agent`** (or `NYCODE_CODING_AGENT_DIR`). Nycode does not read the home directory of another tool or agent, and the home directory is never treated as a project.

| Path | What it holds |
|---|---|
| `settings.json` | Settings, including `hooks`, `env`, `statusLine` and `permissions` |
| `AGENTS.md` | Your global instructions (the personal overlay goes here) |
| `rules/`, `skills/`, `agents/`, `commands/`, `output-styles/`, `themes/`, `extensions/` | Your own resources; each wins over the embedded one of the same name |
| `mcp.json`, `lsp.json`, `keybindings.json`, `local.env` | Integrations, keys and the environment file (mode 0600) |
| `plugins/` | Status-line state and optional plugins (`plugins/claude-hud/config.json`) |
| `sessions/`, `memory/`, `plans/` | Your history |

Projects add `.nycode/` and the instruction files of the repository (`AGENTS.md`, `CLAUDE.md`); configuration that can run code or reach the prompt loads only after you trust the project. Machine-wide policy, when an administrator deploys one, is read from `/etc/nycode/managed-settings.json` (`/Library/Application Support/Nycode/` on macOS, `C:\Program Files\Nycode\` on Windows). See [settings](packages/coding-agent/docs/settings.md).

## Permissions

The **native TypeScript permission engine** (`permissions.engine: "native"`, the default; the `guard.py` script engine stays selectable) checks every tool call before it runs and blocks when it fails ([security](packages/coding-agent/docs/security.md), [SECURITY.md](SECURITY.md)):

- **Modes:** `ask` (default), `auto` and `plan`. Bypass (`--bypass`, `--safe`, `NYCODE_BYPASS_PERMISSIONS`, `local.env` or `permissions.bypass`; precedence flag > env > `local.env` > `settings.json` > off) approves the `ask` prompts and nothing else.
- **Always denied, bypass or not:** destructive filesystem commands (shell forms such as `bash -c`, `eval` and `$()` are re-parsed), download-and-execute pipelines, writes to disk devices, force-push to `main`, and reads of `.env*` and credential files.
- **Not a sandbox:** it guards against mistakes, not against an adversary. For hard isolation see the four patterns in [containerization](packages/coding-agent/docs/containerization.md) (Gondolin micro-VM, plain Docker, Docker Sandboxes, OpenShell).

## Benchmarks

Every number here was measured on **Nycode** before it moved into this binary (pi 1.5.2 with pi-code 1.7.0, frozen by hash), not on the binary in this repository (pending by owner decision D-29 / D-49). A later round will replace these figures. A difference whose interval crosses zero is reported as "not shown", never as a win.

| Suite | Nycode | Pi Agent | Claude Code |
|---|---|---|---|
| 42 tasks: solved | **97.8%** | 94.0% | 95.2% |
| 42 tasks: cost per solved task | US$ 0.047 | **US$ 0.040** | US$ 0.085 |
| 12 harder tasks (36 runs): solved | **36 of 36** | 34 of 36 | **36 of 36** |
| 12 harder tasks: cost per solved task | US$ 0.178 | **US$ 0.156** | US$ 0.219 |
| Terminal-Bench 2.0 (72 tasks, 168 runs): solved | **134 of 168** (79.8%) | 125 of 168 | 129 of 168 (76.8%) |
| Terminal-Bench 2.0: cost per solved task | US$ 0.106 | **US$ 0.087** | US$ 0.144 |

- **Wins:** more tasks than Pi Agent (intervals above zero); lower cost than Claude Code.
- **Losses:** 1.2x to 1.3x the cost of Pi Agent; slower than Claude Code on Terminal-Bench 2.0 (225 s against 207 s per run); later first reply than Pi Agent (larger fixed prompt).
- **Not shown:** ahead of Claude Code (probability 0.68, below the 0.80 threshold).

<details>
<summary>Full results, intervals, older rounds, data and how to reproduce</summary>

Names used below:

- **Nycode**: the pre-migration tree (wrapper, extensions, hooks, skills, agents) on pi 1.5.2 with pi-code 1.7.0, frozen by hash (arm `nycode-harness` in the raw data). The tables use this name for that measurement.
- **Pi Agent**: pi 1.5.2 with no harness (arm `pi-vanilla` in the raw data).
- **Claude Code**: Claude Code 2.1.323 with no configuration (arm `cc-vanilla`).

All three used the same model (Claude Sonnet 5.5). Results are from 2026-11-15; the Terminal-Bench 2.0 figures for `Nycode` are a re-measurement of 2026-11-18 (72 tasks). The figures come from the README of `marcioazam/ny-pi` at commit `e4f8729` (2026-11-20); which raw data are in this repository is listed under [Data in this repository](#data-in-this-repository).

### Where it wins and where it loses

**Against Pi Agent**

- Wins: solves more of the 42 tasks, +3.8 points (90% interval +1.2 to +10.5). Solves more on Terminal-Bench 2.0 (72 tasks), +7.9 points (+2.3 to +13.9), probability of being ahead 0.99. On the 52 Terminal-Bench tasks left after removing those corrected in Terminal-Bench 2.1 the lead holds: +9.6 points (+3.2 to +16.7).
- Loses: costs more per task, 1.23x on the 42 tasks, about 1.2x on the harder suite and 1.30x on Terminal-Bench 2.0. Takes more turns on the harder suite (6.2 against 5.6 per run; no interval computed). Answers later: first reply at 2.3 to 2.6 s against 1.1 to 1.6 s in a one-turn timing of 3 runs per arm, because of the larger fixed prompt (local timing, not in `docs/bench/`).
- Not shown: accuracy on the harder suite (36 of 36 against 34 of 36: too few failures to resolve).

**Against Claude Code**

- Wins: costs less per task, 0.57x on the 42 tasks, 0.82x on the harder suite (90% interval 0.73 to 0.91), 0.77x on Terminal-Bench 2.0 (US$ 0.106 against 0.144 per solved task). Fewer turns on the harder suite (6.2 against 6.6; no interval computed). **Not inferior** on Terminal-Bench 2.0: +1.4 points (134 of 168 against 129 of 168), interval -3.2 to +6.0.
- Loses: slower on Terminal-Bench 2.0 (225 s against 207 s mean wall per run; no interval computed). On the 52 Terminal-Bench tasks without those corrected in Terminal-Bench 2.1 the difference is -0.6 points (-6.4 to +4.5). `vulnerable-secret` is out of the new measurement; in the previous one Nycode lost it 0 of 3 against 3 of 3.
- Not shown: **ahead**. On Terminal-Bench 2.0 the probability of being ahead is 0.68, below the 0.80 threshold. On the 42 tasks the difference is +2.6 points with an interval of -1.4 to +9.9 (it crosses zero). On the harder suite both solved 36 of 36.

### Results at a glance

| Suite | Nycode | Pi Agent | Claude Code |
|---|---|---|---|
| 42 tasks: solved | **97.8%** | 94.0% | 95.2% |
| 42 tasks: cost per solved task | US$ 0.047 | **US$ 0.040** | US$ 0.085 |
| 12 harder tasks (36 runs): solved | **36 of 36** | 34 of 36 | **36 of 36** |
| 12 harder tasks: cost per solved task | US$ 0.178 | **US$ 0.156** | US$ 0.219 |
| Terminal-Bench 2.0 (72 tasks, 168 runs): solved | **134 of 168** (79.8%) | 125 of 168 | 129 of 168 (76.8%) |
| Terminal-Bench 2.0: cost per solved task | US$ 0.106 | **US$ 0.087** | US$ 0.144 |

The Terminal-Bench rows are the 72 tasks all three ran (`vulnerable-secret` excluded). The `Nycode` column was re-run on 2026-11-18; the other two are the 2026-11-15/16 references, not interleaved with that run. Bold marks the best value in a row; a bold cell does not mean the difference is resolved (see the intervals below). The 97.8% and 94.0% are means over the 42 tasks both arms ran.

### 42 tasks

Same model, same 42 tasks, results of 2026-11-15.

| Harness | Tasks solved | Cost per task | Cost per solved task | Repetitions |
|---|---|---|---|---|
| Nycode | **97.8%** | US$ 0.046 | US$ 0.047 | 12 |
| Pi Agent | 94.0% | **US$ 0.038** | **US$ 0.040** | 12 |
| Claude Code | 95.2% | US$ 0.081 | US$ 0.085 | 2 |

| Nycode against | Difference in tasks solved | 90% interval (paired by task) | Nycode cost |
|---|---|---|---|
| Pi Agent | +3.8 points | +1.2 to +10.5 | 1.23x |
| Claude Code | +2.6 points | -1.4 to +9.9 | 0.57x |

The 42 tasks: harness evaluations (tool use, refusals, output discipline), 12 plan-first tasks, 10 multi-module tasks with hidden tests, and 4 [Terminal-Bench 2.0](https://www.tbench.ai/) tasks. Against Claude Code the advantage shown here is cost, not accuracy.

### Harder, multi-file tasks

12 tasks in repositories of 20 to 40 files (a bug far from its symptom, a cross-cutting change with many rules, long and wide work), hidden tests, 3 repetitions each, results of 2026-11-15.

| Harness | Tasks solved | Cost per solved task | Turns per run |
|---|---|---|---|
| Nycode | **36 of 36** | US$ 0.178 | 6.2 |
| Claude Code | **36 of 36** | US$ 0.219 | 6.6 |
| Pi Agent | 34 of 36 | **US$ 0.156** | **5.6** |

- This suite does not separate accuracy: all three are at or near the ceiling.
- It separates cost: paired by task, `Nycode` costs 0.82x Claude Code (90% interval 0.73 to 0.91) and about 1.2x Pi Agent.
- The `Nycode` row was measured without the shell-output clamp, which was removed the same day because of this measurement: with it, `Nycode` needed twice the tool calls and cost 0.97x Claude Code (0.86 to 1.09).
- The hidden tests were audited by reviewers who did not write the tasks; 23 demands that neither the prompt nor the spec stated were relaxed, and every stored run was re-scored.

### Terminal-Bench 2.0 re-measurement (72 tasks)

The 24 tasks of the first sample (below) plus 48 more unseen Terminal-Bench 2.0 tasks. Only the `Nycode` arm was re-run, on 2026-11-18 on `marcioazam/ny-pi` `main` at `e4f1746` (168 runs, 0 infrastructure errors, 7 agent timeouts against 10 before). Claude Code and Pi Agent are the references of 2026-11-15/16. Graded by Terminal-Bench's own tests; difference = mean per task, bootstrap paired by task (10,000 resamples, fixed seed). `vulnerable-secret` is excluded because the new `Nycode` arm did not run it. The per-run data are **not** in this repository: the numbers come from the maintainer's benchmark log.

| Nycode against | Tasks | Solved (Nycode against other) | Difference, 90% interval | Probability Nycode is ahead | Nycode cost per task | US$ per solved task | Wall per run |
|---|---|---|---|---|---|---|---|
| Claude Code | 72 | 134 of 168 against 129 of 168 | +1.4 points (-3.2 to +6.0) | 0.68 | 0.77x | 0.106 against 0.144 | 225 s against 207 s |
| Claude Code, without the tasks corrected in Terminal-Bench 2.1 | 52 | 111 of 120 against 108 of 120 | -0.6 points (-6.4 to +4.5) | 0.42 | 0.70x | 0.081 against 0.119 | 120 s against 134 s |
| Pi Agent | 72 | 134 of 168 against 125 of 168 | +7.9 points (+2.3 to +13.9) | 0.99 | 1.30x | 0.106 against 0.087 | 225 s against 183 s |
| Pi Agent, without the tasks corrected in Terminal-Bench 2.1 | 52 | 111 of 120 against 102 of 120 | +9.6 points (+3.2 to +16.7) | 0.995 | 1.18x | 0.081 against 0.075 | 120 s against 123 s |

- Against Claude Code: **not inferior** (the lower limit, -3.2, is above the -10 point margin the Nycode gate uses), **not ahead** (probability 0.68, below the 0.80 threshold). `Nycode` costs 23% less per task (0.77x) and 26% less per solved task, and is slower on the full set. Without the tasks corrected in Terminal-Bench 2.1 the estimate is -0.6 points, so the +1.4 does not hold on that cut. The -10 point margin is a choice of the Nycode gate, not a standard.
- Against Pi Agent: **superior** (interval above zero), at 1.30x the cost per task and US$ 0.106 against 0.087 per solved task: `Nycode` solves tasks Pi Agent does not, and pays for it.
- Caveats: (1) the references were measured two to three days before and not interleaved with this run, so API or model drift under the same model id is not excluded; (2) `vulnerable-secret` is out, so this table does not say what happens on it now; (3) `Nycode` and Claude Code ran through a subscription login and Pi Agent through an API key, and the modes are not controlled between arms; (4) power: showing an advantage over Claude Code would need interleaved arms and more tasks.
- Not comparable with the public Terminal-Bench leaderboard (version 4.1, maximum effort, several attempts).

#### Previous Nycode measurement (2026-11-15/16)

Same 72 tasks and same references, `Nycode` at `fd1bfb9`/`127e1be`, 10 agent timeouts. It is kept to show the change; the table above replaces it as the current figure.

| Nycode against | Tasks | Solved (Nycode against other) | Difference, 90% interval | Probability Nycode is ahead | Nycode cost per task | US$ per solved task | Wall per run |
|---|---|---|---|---|---|---|---|
| Claude Code | 73 | 124 of 171 against 132 of 171 | -5.5 points (-11.4 to +0.5) | 0.06 | 0.77x | 0.118 against 0.143 | 247 s against 203 s |
| Claude Code, without `vulnerable-secret` | 72 | 124 of 168 against 129 of 168 | -4.2 points (-10.2 to +1.4) | 0.10 | 0.79x | 0.117 against 0.144 | 252 s against 207 s |
| Claude Code, without the tasks corrected in Terminal-Bench 2.1 | 53 | 107 of 123 against 111 of 123 | -5.0 points (-11.3 to +0.6) | 0.07 | 0.73x | 0.090 against 0.119 | 118 s against 132 s |
| Pi Agent | 72 | 124 of 168 against 125 of 168 | +2.3 points (-5.1 to +10.2) | 0.68 | 1.34x | 0.117 against 0.087 | 252 s against 183 s |
| Pi Agent, without the tasks corrected in Terminal-Bench 2.1 | 52 | 107 of 120 against 102 of 120 | +7.1 points (-1.3 to +16.0) | 0.91 | 1.26x | 0.090 against 0.075 | 121 s against 123 s |

What changed: the `Nycode` arm ran on a `main` that includes the 2026-11-18 changes of the `marcioazam/ny-pi` repository, and agent timeouts fell from 10 to 7. The re-run is a different sample of the same tasks, not a controlled A/B of those changes, so the data do not attribute the +5.6 point move (-4.2 to +1.4 on the same 72 tasks) to any one of them. In the references Claude Code solves more than Pi Agent (+6.5 points, interval 0.0 to +13.4, probability 0.95).

### Terminal-Bench 2.0 first sample (24 tasks)

24 tasks drawn at random (seed fixed before any run) from Terminal-Bench 2.0 tasks no harness had seen; one attempt per task, default effort, each harness run once on 2026-11-15. Graded by Terminal-Bench's own tests.

| | Nycode | Claude Code | Pi Agent |
|---|---|---|---|
| Solved | 19 of 24 (first run: 20) | **21 of 24** | 16 of 24 |
| Cost per solved task | **US$ 0.073** (first run: 0.074) | US$ 0.094 | US$ 0.090 |
| Median wall per task | 30 s | **23 s** | 30 s |

| Nycode against | Difference in tasks solved | 90% interval (paired by task) | Nycode cost per task | Nycode wall per task |
|---|---|---|---|---|
| Claude Code | -8.3 points (1 won, 3 lost) | -29.2 to 0.0 | 0.71x | 1.39x |
| Pi Agent | +12.5 points (5 won, 2 lost) | -8.3 to +25.0 | 1.15x | 1.10x |

- Neither accuracy interval excludes zero: on these tasks `Nycode` is not shown better or worse than either. It costs less than Claude Code per task and is slower.
- The first `Nycode` run lost its local settings inside the container (fixed before the second run); both runs are published in the source. One task (`dna-assembly`) flipped between the two runs of the same harness, so single-attempt differences of one or two tasks are noise.
- Failures shared by all three: both `polyglot` tasks (test binaries left in the output directory). `Nycode` also failed `feal-linear-cryptanalysis` (ran out of time on a slow attack) and `overfull-hbox` (changed a word it was not allowed to change).

### What the numbers do not show

- Against Claude Code the 42-task interval (-1.4 to +9.9 points) crosses zero: the advantage shown there is cost, not accuracy. Claude Code has 2 repetitions on the 42 tasks; `Nycode` and Pi Agent have 12.
- Both task sets are close to saturated (most tasks are solved by every harness), so differences under about 6 points cannot be resolved.
- One model, one machine, Python-heavy tasks. No task was solved by `Nycode` alone.
- Terminal-Bench 2.0: against Claude Code the interval crosses zero, so non-inferiority is shown and a lead is not. The references were not interleaved with the re-run. The auth modes differ between arms (subscription login for `Nycode` and Claude Code, API key for Pi Agent), which no analysis here controls.
- The `Nycode` arm is the harness plus the maintainer's untracked personal layer (personal rules of about 2,500 tokens, settings, local environment, vendored packages), frozen by hash. Without the personal rules (2026-11-18, 42 tasks, one round, not interleaved): same accuracy (40 of 42 both ways) and 17% lower cost (90% interval 0.69x to 1.04x). Without the rest of the layer, and on Terminal-Bench, it has not been benchmarked.
- The post-migration Nycode binary ships the embedded harness, and a benchmark round on it has not been run yet (D-29 / D-49); embedding may change behavior, cost and speed relative to the measurement above.

Historical weaknesses of the pre-migration `Nycode` that are not in the tables:

- In the 2026-11-15 `Nycode` snapshot, the guard hook did not recognise every indirect shell form (`bash -c`, subshells, `xargs`, `find -exec`) and leaving plan mode turned bypass on in safe mode. Both have since been addressed in Nycode's native TypeScript permission engine (recursive shell re-parsing and orthogonal Ask/Auto/Plan + bypass modes). Treat any permission engine as a guard against mistakes, not as a kernel sandbox.
- Wall-clock time is not gated (it depends on API and machine load); local start-up and hook overhead is not measured by any check yet.

### An older, worse round (2026-11-14)

The raw runs of this round are in the repository. Its `Nycode` loss was mostly runs that called `plan_mode_complete` outside plan mode and stopped, and a `question` tool that failed without an interface. The round is **superseded** by the 2026-11-15 round above, which is more recent and is the one used elsewhere in this README. It is shown because it is the only round whose raw data cover all arms here, and because it is a loss.

Sonnet 5.5, 76 units per arm, 2026-11-14:

| Arm | Solved | Total cost | Median cost per run |
|---|---|---|---|
| Pi Agent | **74 of 76 (97.4%)** | **US$ 2.10** | US$ 0.0231 |
| Claude Code | 73 of 76 (96.1%) | US$ 5.57 | US$ 0.0645 |
| Nycode | 62 of 76 (81.6%) | US$ 7.06 | US$ 0.0861 |

In that round `Nycode` cost 3.4x Pi Agent and 1.3x Claude Code and solved 12 runs fewer than Pi Agent; the loss was almost all in the plan suite (14 of 24 against 24 of 24 for both others). On Opus 5.5 (22 units per arm) Pi Agent solved 22 of 22, `Nycode` and Claude Code 20 of 22, and `Nycode` cost 1.6x Claude Code. On 6 Terminal-Bench 4.1 tasks (one run each) `Nycode` solved 2, the others 1. With 76 units and wide intervals, the data note calls these figures an order-of-magnitude reference, not proof of small differences. The 42-task round of 2026-11-15 was recorded after the headless fix (PR #23 of the `marcioazam/ny-pi` repository, per the data note).

### Data in this repository

| What | Where |
|---|---|
| Method, summaries and per-suite tables of the 2026-11-14 round (Pi Agent, Claude Code, Nycode and a fourth agent, Oh My Pi, arm `omp`) | [`docs/bench/BASELINE-VANILLA-2026-11.md`](docs/bench/BASELINE-VANILLA-2026-11.md) |
| Aggregates of that round | [`docs/bench/BASELINE-VANILLA-2026-11.json`](docs/bench/BASELINE-VANILLA-2026-11.json) |
| Raw runs of that round (`runs.jsonl` and `meta.json` per arm) | [`docs/bench/baseline-vanilla-2026-11/`](docs/bench/baseline-vanilla-2026-11/) |
| Frozen Nycode round that pull requests are compared with | [`docs/bench/baseline-main/`](docs/bench/baseline-main/) |
| Runbook, gate rule and statistics | [`docs/bench/RUNBOOK.md`](docs/bench/RUNBOOK.md) |

What is **not** in the repository:

- The per-run data of the 2026-11-15 rounds of Pi Agent and Claude Code, of the harder suite and of the first Terminal-Bench sample.
- The per-run data of the Terminal-Bench 2.0 re-measurement (72 tasks), which come from the maintainer's benchmark log.
- The local one-turn timing of first-reply latency.

So the headline figures above cannot be recomputed from this repository. Two things in `docs/bench/` also disagree with them, and the figures above are the more recent:

- The text of `BASELINE-VANILLA-2026-11.md` reports the 2026-11-14 round (`Nycode` 62 of 76). The 42-task paired comparison it records (0.978 against 0.940, +0.038, interval +0.012 to +0.105, 1.23x cost) matches the +3.8 points above.
- `docs/bench/baseline-main/` holds the later `Nycode` round of 2026-11-18 (commit `0ed4943`): 410 of 431 runs solved (95.1% pooled), US$ 17.43. The same file's text describes an earlier round of 2026-11-15 (417 of 428 runs, 97.4% pooled), and the 97.8% above is a mean over the 42 tasks both arms ran, so it is not the pooled rate of any one file.

### Reproduce

The runner is in [`bench/`](bench/); its arms are Pi Agent (`pi-vanilla`), Claude Code (`cc-vanilla`), Nycode (`nycode-harness`) and the migration arm `nycode`, listed in [`bench/arms.toml`](bench/arms.toml). Real rounds spend model tokens, are capped by `--budget-usd` and need the credentials described in the [runbook](docs/bench/RUNBOOK.md). Under D-29 only `--dry-run` runs during the migration:

```bash
python3 bench/run.py run --arm nycode-harness --tier baseline --model claude-sonnet-5-5 --budget-usd 40 --dry-run  # the 42 tasks
python3 bench/run.py run --arm nycode-harness --tier hard --model claude-sonnet-5-5 --budget-usd 40 --dry-run      # the harder suite
```

</details>

## Packages

| Package | Description |
|---------|-------------|
| **[@nycode/coding-agent](packages/coding-agent)** | The interactive coding agent CLI |
| **[@nycode/agent-core](packages/agent)** | Agent runtime with tool calling and state management |
| **[@nycode/ai](packages/ai)** | Unified multi-provider LLM API (OpenAI, Anthropic, Google and more) |
| **[@nycode/tui](packages/tui)** | Terminal UI library with differential rendering |
| **[@nycode/mcp](packages/mcp)** | Standalone Model Context Protocol client |
| **[@nycode/codemode](packages/codemode)** | Sandboxed JavaScript execution whose only capability is calling injected tools |
| **[@nycode/schema](packages/schema)** | JSON Schema validation without `eval`: drafts 2020-12 and 7, compiled into plain closures |
| **[@nycode/chord](packages/chord)** | Object runtime for apps across processes: contracts, documents, a store, links, plugins with hot reload, HTTP, workers, web and terminal clients |
| **[@nycode/durable](packages/durable)** | Durable conversation, task and document runtime |
| **[@nycode/env](packages/env)** | Remote execution environments for Durable: a small daemon deployed over SSH and its client |
| **[@nycode/telemetry](packages/telemetry)** | Vendor-neutral telemetry contracts, reference adapter, conformance tests and typed schemas |

## Development

```bash
npm install --ignore-scripts  # Install all dependencies without running lifecycle scripts
npm run build         # Refresh model data, then build all packages
npm run build:offline # Rebuild using existing model data without network access
npm run check         # Lint, format, and type check
./test.sh            # Run tests (skips LLM-dependent tests without API keys)
./nycode-test.sh         # Run nycode from sources (can be run from any directory)
```

### Using local packages outside the monorepo

Build every public package into one coherent local artifact set:

```bash
npm run pack:packages -- --out .artifacts/nycode-packages
```

This refreshes model data before building `nycode-ai`. To avoid network access when
model data is already hydrated, pass `--offline-model-data`.

Then configure an external project to consume one package and resolve all of
its Nycode dependencies from the same artifact set. npm is the default:

```bash
node scripts/use-local-packages.mjs \
  --manifest .artifacts/nycode-packages/manifest.json \
  --consumer ../my-project \
  --package @nycode/durable \
  --package @nycode/agent-core
cd ../my-project
npm install --ignore-scripts
```

For a pnpm project, point `--consumer` at the workspace root:

```bash
node scripts/use-local-packages.mjs \
  --manifest .artifacts/nycode-packages/manifest.json \
  --consumer ../my-project \
  --package @nycode/agent-core \
  --package-manager pnpm
cd ../my-project
pnpm install --ignore-scripts
```

Repeat `--package` for each direct dependency. The command updates the
consumer's `package.json` with content-addressed local `file:` references. It
writes transitive overrides to `package.json` for npm or `pnpm-workspace.yaml`
for pnpm. Keep the artifact directory available while installing or updating
the consumer. Re-run both commands after changing Nycode source.

## Building standalone binaries

The binaries on the [Releases](https://github.com/marcioazam/nycode/releases) page are built by the `publish.yml` workflow with this script. To build them from a checkout, hydrate the model data and run the build script:

```bash
npm ci --ignore-scripts
npm run hydrate:model-data
./scripts/build-binaries.sh --skip-install --platform linux-x64 --out "$PWD/out"
```

The script builds the executable with its runtime assets for the platform you name (`darwin-arm64`, `darwin-x64`, `linux-x64`, `linux-arm64`, `windows-x64`, `windows-arm64`; all of them when `--platform` is omitted). Pass `--offline-model-data` to use the bundled model data instead of refreshing it. `./scripts/create-source-archive.sh --version <version> --ref <git-ref> --out <archive.tar.gz>` creates the deterministic source archive that releases carry.

## Security and quality gates

Every pull request and push to `main` is verified by SHA-pinned, least-privilege GitHub Actions workflows:

| Workflow | What it verifies |
| --- | --- |
| [`ci.yml`](.github/workflows/ci.yml) | Offline/online build, Biome lint/format, `tsc --noEmit`, pinned deps, entry-graph budgets, `install-lock` sync, changelog immutability, full workspace test suites (`coding-agent`, `chord`, `durable`, `other` including Rust `nycode-env` daemon) and MCP conformance |
| [`ci-static.yml`](.github/workflows/ci-static.yml) | Python (`ruff`, `mypy --strict`, `pytest` + `diff-cover >= 80%`), Shell (`shellcheck`, `shfmt`), Markdown (`markdownlint`), fork seam inventory (`seams 25/25 --strict`), residue/scope gates, structure budgets and mutation checks |
| [`ci-security.yml`](.github/workflows/ci-security.yml) | Hardened runner (`egress-policy: block`) running `gitleaks`, `trufflehog`, `semgrep`, `osv-scanner`, `actionlint` and `zizmor` |
| [`codeql.yml`](.github/workflows/codeql.yml) | GitHub CodeQL SAST across `javascript-typescript`, `python` and `actions` |
| [`dependency-review.yml`](.github/workflows/dependency-review.yml) | GitHub Dependency Review on pull requests (fails on `high`+ advisories) |
| [`scorecard.yml`](.github/workflows/scorecard.yml) | OpenSSF Scorecard supply-chain score with SARIF upload and published results |
| [`npm-audit.yml`](.github/workflows/npm-audit.yml) | Daily production dependency audit, `npm audit signatures --omit=dev` and recursive OSV scan |
| [`publish.yml`](.github/workflows/publish.yml) | Deterministic source archive, 6-platform standalone binaries, cross-OS smoke tests (Linux, macOS, Windows), `SHA256SUMS` and keyless SLSA build-provenance attestations |
| [`merge-policy.yml`](.github/workflows/merge-policy.yml) | Enforces squash merges for normal PRs and merge commits only for upstream syncs (D-07) |

See [SECURITY.md](SECURITY.md) for the threat model, scope and private vulnerability reporting, and [SUPPORT.md](SUPPORT.md) for where to get help.

## Supply-chain hardening

We treat npm dependency changes as reviewed code changes.

- Direct external and internal workspace dependencies are pinned to exact versions, enforced by `npm run check:pinned-deps`.
- `.npmrc` sets `save-exact=true` and `min-release-age=2` to avoid same-day dependency releases during npm resolution; `.github/dependabot.yml` applies a 7-day cooldown and groups only `minor`/`patch` npm updates (breaking majors arrive via upstream syncs; security updates stay enabled).
- `package-lock.json` is the dependency ground truth. Pre-commit blocks accidental lockfile commits unless `NYCODE_ALLOW_LOCKFILE_CHANGE=1` is set.
- `npm run check` verifies pinned direct deps, native TypeScript import compatibility, and the generated coding-agent install lock.
- `packages/coding-agent/install-lock/` is generated from the root lockfile to pin transitive dependencies for release installs, and `npm run check` fails when it is out of date. The npm package does not pin transitive dependencies.
- Nycode is not published to npm. Releases are GitHub Releases of this repository with `SHA256SUMS` and build-provenance attestations (`gh attestation verify <file> -R marcioazam/nycode`). `npm run pack:packages` and `npm run release:local` build and smoke-test the tarballs locally.
- `nycode update` installs with `--ignore-scripts`.
- CI installs with `npm ci --ignore-scripts`, and a scheduled GitHub workflow (`npm-audit.yml`) runs a production dependency audit and `npm audit signatures --omit=dev`.
- Install lock generation has an explicit allowlist for dependency lifecycle scripts; new lifecycle-script deps fail checks until reviewed.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines and [AGENTS.md](AGENTS.md) for project rules (for humans and agents alike).

## License

MIT. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
