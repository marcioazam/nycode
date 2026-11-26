# Render leveza (2026-11-24)

Goal (owner): a TUI as light as possible in CPU, RAM and animation cost, with no change to agent behavior.

## Method

Real app from source (`nycode-test.sh --no-env`) in tmux 140x40, isolated HOME, offline, against a local
OpenAI-compatible fake server. 40 turns with a large markdown reply, then 10 s idle and 15 s of a streaming reply.
CPU from `/proc/<pid>/stat`, RSS/HWM from `/proc/<pid>/status`, frames = `ESC[?2026h` (synchronized update) per second
in the pane output. A = HEAD versions of the changed files, B = working tree, interleaved on the same machine.

| run | idle CPU | active CPU | frames/s (active) | bytes/s to terminal | idle RSS | HWM |
|---|---|---|---|---|---|---|
| A1..A5 (HEAD) | 1.8-2.6% | 10.4-14.3% (mean 12.1) | 41.7-42.2 | 86-88 KB/s | 175-214 MB | 300-340 MB |
| B1..B5 (change) | 0.1-2.5% (4 of 5 at 0.1-0.2) | 8.5-10.4% (mean 9.1) | 32.6-32.9 | 71 KB/s | 181-195 MB | 309-325 MB |

CPU profile of the streaming window: 1832 busy samples before, 1324 after the first batch. Heap sampling showed
22.8 MiB/s allocated while streaming, 21% of it in `findSticky` (fixed below).

## Shipped binary (Bun), round 2

The installed `nycode` is a Bun-compiled executable, so round 2 measures that: A = HEAD files built with the HEAD
command, B = this change built with `--bytecode --format=esm`. Same probe, interleaved, 3 rounds each.

| | A (HEAD) | B (change) |
|---|---|---|
| active CPU (streaming) | 9.80 / 9.33 / 9.33% | 6.00 / 6.06 / 5.80% |
| frames/s, bytes/s to terminal | 41.7-42.1, 87 KB/s | 33.2, 72 KB/s |
| idle CPU | 0.6-0.9% | 0.7-0.9% |
| PSS after 40 turns | 189 / 170 / 177 MB | 167 / 172 / 175 MB |
| HWM | 234-243 MB | 248-253 MB |
| `nycode --version` (3 runs) | 0.25-0.31 s, 108-110 MB max RSS | 0.04-0.06 s, 97-99 MB |
| launch to painted composer (3 runs) | 471 / 373 / 395 ms | 190 / 176 / 186 ms |
| agentic smoke (bash tool call, `-p`) | pass, 0.36 s | pass, 0.15 s |

Model requests are byte-identical between A and B (system prompt, tools, messages; sha256 `ed1c960df0116b1f` after
normalizing the temp dir and install path), so the change does not touch what the agent sends or does.

Where the RAM goes (B, after 40 turns, `/proc/<pid>/smaps` and `bun:jsc heapStats` through a preload): JS heap 37 MiB
after a full GC (44 before), JIT code 13.6 MiB, the embedded bundle and bytecode mapped from the executable 43-58 MiB,
the rest Bun/JSC runtime and allocator arenas. Steady-state PSS moved within run-to-run noise; bytecode adds
~10 MB to the peak (the Bun docs say it "will make the final output larger and slightly increase memory usage") in
exchange for a 2-5x faster start, which every subagent and `nycode -p` pays. Tried and dropped (no effect measured):
`--smol` (via `--compile-exec-argv`), `MIMALLOC_PURGE_DELAY=0`, `BUN_JSC_forceRAMSize`, `highlight.js/lib/core`,
`--minify-whitespace --minify-syntax`; `--bytecode-depth=0|1` start slower than the full depth.

## Peak RAM, round 3

A 5 ms RSS trace showed the peak is one spike (~170 -> ~236 MB in 70 ms) at the first keystroke burst, not growth.
`BUN_JSC_reportFTLCompileTimes=1` named it: JSC's optimizing tier compiling `matchesKey` (one ~390-line switch over
every key id) took 93 ms into 92.8 KB of code; `BUN_JSC_useFTLJIT=0` alone dropped the peak to 186 MB. Fix:
`matchesKey` memoizes its boolean per input, key id and Kitty flag (inputs <= 32 chars, 512 entries max, raw BS
uncached because it reads the environment), so the big function stays cold. After it, the top FTL compile is 20 ms.

| (3 rounds, 40 turns) | B (round 2) | C (B + matchesKey cache) |
|---|---|---|
| HWM | 245 / 245 / 255 MB | 192 / 188 / 167 MB |
| PSS after turns | 170 / 169 / 171 MB | 169 / 167 / 146 MB |
| active CPU, frames/s | 6.0-6.4%, 33.0-33.2 | 6.0-6.3%, 32.9-33.0 |
| launch to composer | 176-190 ms | 173-189 ms |

Versus HEAD (234-243 MB) the peak is now 42-76 MB lower. Agentic smoke passes with the same request sha.
Also tried, no effect: `BUN_JSC_smallHeapGrowthFactor`, `BUN_JSC_smallHeapRAMFraction`, `useConcurrentJIT=0`.

## Session footprint with real MCP config, round 4

With the owner's `~/.nycode/agent/mcp.json` (16 servers, all `deferred`, two of them stdio) nycode started both stdio
servers at launch to learn their tools and instructions and kept them running: 4 extra processes, ~200 MB, in a
session that never calls them. Now a stdio server no call has used stops 30 s after it connected
(`UNUSED_CLOSE_MS`, `mcp/runtime/runtime.ts`); its tools and instructions stay known, the state stays
`connected`, and the first call starts it again through the existing reconnect path. A server that was used keeps
running, so its own state is never lost. Round 7 applies the same rule to HTTP servers (see below).

Idle session 45 s after launch, process tree summed (`/tmp/nyperf/peer.sh`, 2 rounds):

| | processes | RSS | PSS |
|---|---|---|---|
| HEAD (installed) | 5 | 361 / 364 MB | 272 / 276 MB |
| C (round 3) | 5 | 363 / 364 MB | 287 / 287 MB |
| E (this round) | 1 | 166 / 164 MB | 163 / 161 MB |

Other agent CLIs on the same machine, same method at 12 s with their own configs: Claude Code 155-170 MB (1 process),
Cursor Agent 216-219 MB, Codex 96 MB (1 process; 469 MB when it started its MCP children), Gemini CLI 468-477 MB,
opencode 1066-1133 MB.

E2E through the TUI (`/tmp/nyperf/mcp_e2e.sh`, a stdio server with `direct` exposure): server alive at 5 s, gone at
35 s, the model's `mcp__echo__pid` call starts a new process and its result reaches the model; with `deferred`
exposure the server's instructions stay in every request's system prompt. Unit test in `test/mcp-extension.test.ts`
(red on HEAD: `expected 1 to be 2`). Cost: the first call to a stopped server waits for its start.

Gate: Biome pinned 2.3.15 (`npx @biomejs/biome@2.3.15 check --error-on-warnings .`) is clean on the whole tree; the
local `node_modules` held 2.3.5, which reported 78 formatting differences in untouched files (environment drift, not
code).

## Where the remaining RAM is, round 5

- Runtime floor: a compiled Bun 1.4.4 binary (`--bytecode`) that only idles holds 14 MB RSS (2 MB anonymous), so
  nycode's ~105 MB anonymous memory is its own modules and state.
- No growth with the conversation: JS heap after a full GC is 31 MB after the first reply, 38 MB after 40 turns,
  39 MB after 120 turns (RSS 148 / 161 / 175 MB; the rest is heap capacity and allocator pages). Caches are bounded.
- Measured per-module costs in the bytecode binary are small: the LSP extension ~1 MB, full highlight.js 3-4 MB; the
  undici dispatcher is the global fetch (idle timeout, proxy) and stays. No single module is worth a behavior change.
- `npm run check` as written exits 0 after `npm ci` restored the locked Biome 2.3.15 (the local 2.3.5 was drift);
  the working tree hash was identical before and after its `--write` (`db7a5b1c7fe3e6f4`, 79 files).

## Private memory, round 6

RSS mixes the process's own memory with pages of the executable. Those pages are file-backed (`RssFile`; under
tmpfs `/tmp` they show as `RssShmem`), shared by every nycode process including subagents, and reclaimable. The
per-process cost is `RssAnon`:

| | startup (5 s) | after 40 turns (3 rounds) |
|---|---|---|
| A (HEAD) | 89 MB | 159 / 154 / 139 MB |
| E (round 4) | 69-70 MB | 108 / 106 / 107 MB |
| H (this round) | 64 MB | 103 / 103 MB |

All 58 built-in extensions together cost ~22 MB anonymous at startup (build with none: 47-48 MB), so lazy-loading
them could not save more than that and would change when their hooks exist; not done.

Highlight grammars: the remaining ~170 highlight.js grammars now load when a render first asks for a grammar the eager
set lacks (`supportsLanguage`, `code-blocks` `grammarFor`), instead of right after startup; the view redraws when they
land (existing `CodeHighlighter` grammar-count key and interactive-mode invalidate). E2E: an Elixir block renders with
the same 6 colors as before. Test `test/syntax-highlight-on-demand.test.ts` (red on HEAD).

Other agent CLIs, same method (idle 45 s, process tree, their own configs, 2 rounds), anonymous memory:
nycode 100 MB (E) vs HEAD 192 MB; Claude Code 92-93 MB; Cursor Agent 155-158 MB; Gemini CLI 361-362 MB; opencode
804-808 MB; Codex (Rust) 17 MB.

## Round 7: what the real config costs

Idle 45 s with the real agent dir minus one entry (`/tmp/nyperf/cfgbisect.sh`, symlinks only), binary H:
all 96 MB; without `mcp.json` 85; without `skills` (170 skills, 4.3 MB of `SKILL.md`) 86; without agents, plugins
or memory 96-97; without all of them 73.

- Skills: every `name`/`description` from `parseFrontmatter` was a slice of the whole file, and JSC (like V8) keeps
  the source of a slice alive, so the 170 skill entries held every `SKILL.md` body, up to 568 KB each. The header is
  now copied before YAML parsing. `loadSkillsFromDir` on the real dir retains 2.0 MB of heap instead of 6.5 MB
  (Bun, `Bun.gc(true)`, 3 runs each). Test in `test/frontmatter.test.ts` (40 files of 1 MB: 40.4 MB retained on
  HEAD, under 10 now). Reading only the header of each file was tried and reverted: no measurable gain.
- HTTP MCP servers: unused ones now disconnect like stdio ones. Open TCP connections of an idle session: 22-23 ->
  13-14 (at 45 s and at 100 s); memory effect within noise (~1 MB). The 13 left belong to the global fetch pool,
  not to MCP clients; not pursued.

- Idle collection: JSC keeps freed heap blocks mapped (after 45 s idle: heap 31 MB live in 53 MB of capacity after a
  full GC). One forced `Bun.gc(true)` (pause 6.6-12.9 ms, 15 samples) gave back ~5 MB (build L).

Idle 45 s, real config, `RssAnon` (3 rounds): H 97 / 98 / 97 MB; J (frontmatter) 92 / 89 / 90; I (J + HTTP close)
88 / 90 / 91; L (I + idle collection, 50 s) 84 / 85 / 84. Claude Code in the same harness, same rounds: 91-93 MB. After 40 turns L
keeps 33 frames/s and 6.4-6.7% CPU while streaming; idle RSS after the turns 154-155 MB (K, before the idle
collection: 156-157). Gate on the final tree: `npm run check` 0; TUI 1175 pass / 0 fail / 2 skipped; coding-agent
6257 pass / 0 fail / 54 skipped plus 128/128 node tests; `structure_changed` 88 files, 0 problems; agentic smoke
request sha `ed1c960df0116b1f` unchanged; MCP stdio e2e and Elixir highlight e2e pass.

## Round 8: where the rest went, and `Bun.shrink()`

Extension bisect (startup `RssAnon`, isolated config, registry entries commented out, 2 runs each; all on: 64-65 MB):
groups of 4-17 extensions cost 0-5 MB each; the only large single one is `ui-visual`, 8 MB at startup and 10 MB idle
with the real config (85 -> 75). Its JS heap differs by ~1 MB live; the rest is heap capacity left by animation
frames (53 vs 46 MB capacity after GC). `NYCODE_REDUCED_MOTION=1` gives the same 75 MB, so the cost is the animation,
not module loading: lazy-loading extensions would not recover it, and dropping motion is out of scope.

`Bun.shrink()` after the forced GC (JSC `shrinkFootprintWhenIdle`: frees heap blocks and allocator pages, drops JIT
code) recovers it. Measured with the call every 5 s (build M): idle real config 84 -> 64-67 MB; after 40 turns idle
RSS 154-156 -> 118-120 MB, anon 106-111 -> 86 MB; pause 4.9-5.4 ms. Cost: the next run re-warms, active CPU in its
first 12 s 6.6-6.8% -> 8.2-9.0%, frames unchanged (33/s); first keystroke after it 9-10 ms vs 6 ms (then 3-6 ms,
same as before). So the collection runs 60 s after a run settles (back-to-back turns stay warm) and 45 s after
startup; a run start cancels it (`collectWhenIdle`, `mode-actions/events.ts`, test `test/idle-gc.test.ts`). Node,
without `Bun`, schedules nothing.

Final build N (this tree), real config idle 60 s, `RssAnon` 3 rounds: 66 / 66 / 66 MB; Claude Code same rounds
91 / 92 / 92 MB. 40 turns then 8 s idle (no shrink yet): 6.66-6.75% CPU streaming, 33 frames/s, idle RSS 155-156 MB.
40 turns then 66 s idle (after the shrink): idle RSS 115-116 MB, anon 88-89 MB, the next 12 s of streaming 8.1-8.7%
CPU at 33 frames/s. First keystrokes after the startup shrink: 13 4 4 3 6 4 3 3 ms. Gate: `npm run check` 0; TUI 1175
pass / 0 fail / 2 skipped; coding-agent 6257 pass / 0 fail / 54 skipped plus 128/128 node tests; `structure_changed`
88 files, 0 problems; agentic request sha `ed1c960df0116b1f`; MCP stdio and Elixir highlight e2e pass.

## Changes

- `sticky-prompt/sticky.ts`: incremental zone index (reuses the unchanged prefix of the transcript) and a prefix
  matcher that reads only the first 30 letters of each rejected zone instead of the whole streaming reply.
- `subagent/fleet/source.ts`: `list()` reuses parsed records while the directory mtime is unchanged and settled.
- `status-line/index.ts`, `ui-visual/index.ts`: memoized framed lines / padded user message, keyed on their inputs.
- `ui-visual/motion/motion.ts`: `parseRgb` caches the frozen tuple per SGR string (bounded at 256).
- `tui/components/loader.ts`: frame derived from the clock; one timer per frame boundary, no render when another
  render already showed the frame (this is the ~22% drop in frames/s with identical spinner cadence).
- `utils/highlight-js.d.ts`: declares only the modules highlight.js ships no types for (`lib/index.js`,
  `lib/languages/*.js`, typed with its `LanguageFn`); the old duplicate `lib/core.js` declaration merged with the
  shipped one and type-checked only by file order (it broke as soon as `code-blocks` stopped importing `highlight.js`).
- `utils/syntax-highlight.ts`, `code-blocks/index.ts`, `interactive-mode.ts`: grammars beyond the eager set load on
  first use (round 6).
- `mcp/runtime/runtime.ts`: unused MCP servers disconnect 30 s after discovery (stdio round 4, HTTP round 7).
- `mode-actions/events.ts`, `interactive-mode.ts`: one full collection and `Bun.shrink()` when the session goes idle
  (rounds 7-8).
- `utils/frontmatter.ts`: the YAML header is copied before parsing, so parsed values do not keep the file alive
  (round 7).
- `tui/keys.ts` `matchesKey`: memoized (see round 3); tests in `test/keys.test.ts` cover the Kitty flag switch, raw BS
  per environment and long input.
- `ui/editor.ts` `sweepRow`: the composer rule sweep copies unlit runs by slice instead of one concatenation per char
  (46 MiB allocated in 28 s of turns before).
- `subagent/fleet/source.ts`: `statSync(..., { throwIfNoEntry: false })`, no ENOENT error object per frame without a fleet.
- `ui-visual/motion/motion.ts`: `parseRgb` returns a copy of the cached tuple, so callers may mutate it.
- `packages/coding-agent/package.json` `build:binary`, `scripts/build-binaries.sh`: `--bytecode --format=esm`; checked
  that the cross targets (linux-x64-baseline, linux-arm64, darwin-arm64, windows-x64-baseline) still compile.
- `tui/tui.ts` `renderChildLines`: no `parts` array allocated for an unchanged container; content-equal child output
  is recorded in place so the next frame compares by reference.

## Tests

New: `packages/tui/test/loader.test.ts`, `packages/tui/test/child-lines.test.ts`, a sticky long-reply test and an
incremental-equivalence test, a fleet cache test, `test/harness/extensions/ui/editor/sweep.test.ts` (sweepRow equals the
old char-by-char sweep on 90 row/width/progress cases; parseRgb copies). Each new behavior test fails on HEAD and passes on the change.
Adjusted: the fleet read-count expectation (2, the mocked clock makes the mtime settled) and the loader render count
(9, the half-frame wake). Both follow the intended caching/timing contract above; no assertion was loosened.

## Not changed

Animation cadences (`QUADRO_MS`, spinner 80 ms), markdown output, agent loop, providers, tools. `tui.ts` stays above
800 lines; it is upstream and listed in `scripts/ci/lint/structure-upstream.txt`.
