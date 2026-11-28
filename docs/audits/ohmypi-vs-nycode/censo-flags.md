# Censo de variáveis de ambiente (`OMP_*` e `PI_*`)

Extraído de 100% dos 10222 arquivos do inventário: **189** flags `OMP_*` e **280** flags `PI_*` herdadas/mantidas.

Legenda: **H** = comportamento de harness/modelo; **I** = infraestrutura/build/caminhos/daemon; **T** = teste/bench/diagnóstico.

## Variáveis `OMP_*`

| Variável | Classe | Ocorrências (amostra até 3 arquivos) |
|---|---|---|
| `OMP_AGENT_DIR` | I (infra/build/paths) | `omp:packages/coding-agent/test/auth-broker-import.test.ts:1`, `omp:packages/utils/test/logger-no-transports.test.ts:1`, `omp:packages/utils/test/postmortem-cleanup-error.test.ts:1` |
| `OMP_AGENT_MD` | I (infra/build/paths) | `omp:packages/coding-agent/test/task/discovery.test.ts:1` |
| `OMP_APPEND` | I (infra/build/paths) | `omp:packages/coding-agent/src/session/redis-session-storage.ts:1`, `omp:packages/coding-agent/test/session/redis-session-storage-manager.test.ts:1`, `omp:packages/coding-agent/test/session/redis-session-storage.test.ts:1` |
| `OMP_APPLEFM_BRIDGE` | I (infra/build/paths) | `omp:crates/natives/BUILD.bazel:1`, `omp:crates/natives/build.rs:1`, `omp:crates/natives/src/applefm/mod.rs:1` |
| `OMP_APPLEFM_DISABLE` | I (infra/build/paths) | `omp:bazel/toolchains/swift/applefm.bzl:1`, `omp:crates/natives/build.rs:1`, `omp:crates/natives/src/applefm/build-bridge.sh:1` |
| `OMP_APPLEFM_MODULE_CACHE` | H (harness/comportamento) | `omp:crates/natives/build.rs:1`, `omp:crates/natives/src/applefm/build-bridge.sh:1` |
| `OMP_APPLEFM_SWIFTC` | I (infra/build/paths) | `omp:bazel/toolchains/swift/applefm.bzl:1`, `omp:crates/natives/build.rs:1`, `omp:crates/natives/src/applefm/build-bridge.sh:1` |
| `OMP_APP_NAME` | I (infra/build/paths) | `omp:packages/utils/src/dirs.ts:1`, `omp:python/robomp/src/worker.py:1` |
| `OMP_AUTH_BROKER_` | H (harness/comportamento) | `omp:packages/coding-agent/src/session/auth-broker-config.ts:1` |
| `OMP_AUTH_BROKER_ACCOUNT_POOL_FILE` | H (harness/comportamento) | `omp:packages/ai/src/auth-broker/discover.ts:1`, `omp:packages/ai/test/auth-broker-config-discovery.test.ts:1`, `omp:packages/ai/test/auth-broker-remote-store.test.ts:1` |
| `OMP_AUTH_BROKER_SNAPSHOT_CACHE` | H (harness/comportamento) | `omp:packages/coding-agent/test/auth-broker-snapshot-cache.test.ts:1`, `omp:packages/utils/src/dirs.ts:1` |
| `OMP_AUTH_BROKER_SNAPSHOT_TTL_MS` | H (harness/comportamento) | `omp:packages/ai/src/auth-broker/discover.ts:1`, `omp:packages/coding-agent/test/auth-broker-live-settings.test.ts:1`, `omp:packages/coding-agent/test/auth-broker-snapshot-cache.test.ts:1` |
| `OMP_AUTH_BROKER_TOKEN` | H (harness/comportamento) | `omp:packages/ai/src/auth-broker/discover.ts:1`, `omp:packages/ai/test/auth-broker-config-discovery.test.ts:1`, `omp:packages/ai/test/auth-broker-nested-config.test.ts:1` |
| `OMP_AUTH_BROKER_URL` | H (harness/comportamento) | `omp:packages/ai/src/auth-broker/discover.ts:1`, `omp:packages/ai/test/auth-broker-config-discovery.test.ts:1`, `omp:packages/ai/test/auth-broker-nested-config.test.ts:1` |
| `OMP_AUTORESEARCH_DB_DIR` | I (infra/build/paths) | `omp:packages/coding-agent/src/autoresearch/storage.ts:1`, `omp:packages/coding-agent/test/autoresearch-before-agent-start.test.ts:1`, `omp:packages/coding-agent/test/autoresearch-state.test.ts:1` |
| `OMP_AUTO_UPDATE_TARGET` | I (infra/build/paths) | `omp:packages/coding-agent/src/cli/auto-update.ts:1` |
| `OMP_BASH_SESSION` | I (infra/build/paths) | `omp:packages/coding-agent/src/exec/bash-executor.ts:1`, `omp:packages/coding-agent/src/exec/session-processes.ts:1`, `omp:packages/coding-agent/test/bash-failure-result.test.ts:1` |
| `OMP_BAZEL_BUILD` | I (infra/build/paths) | `omp:crates/shell/BUILD.bazel:1`, `omp:crates/shell/build.rs:1` |
| `OMP_BAZEL_RC` | I (infra/build/paths) | `omp:scripts/bazel-natives.ts:1` |
| `OMP_BENCH_` | T (teste/bench/debug) | `omp:packages/metaharness/agent/omp_local.py:1`, `omp:packages/metaharness/agent/pi_upstream.py:1`, `omp:packages/metaharness/src/runner.ts:1` |
| `OMP_BENCH_AGENT_ARGS` | T (teste/bench/debug) | `omp:packages/metaharness/agent/omp_local.py:1`, `omp:packages/metaharness/agent/pi_upstream.py:1`, `omp:packages/metaharness/src/runner.ts:1` |
| `OMP_BENCH_AUTO_APPROVE` | T (teste/bench/debug) | `omp:packages/metaharness/agent/omp_local.py:1` |
| `OMP_BENCH_BINARY_ARM64` | T (teste/bench/debug) | `omp:packages/metaharness/agent/omp_local.py:1`, `omp:packages/metaharness/src/runner.ts:1` |
| `OMP_BENCH_BINARY_X64` | T (teste/bench/debug) | `omp:packages/metaharness/agent/omp_local.py:1`, `omp:packages/metaharness/src/runner.ts:1` |
| `OMP_BENCH_BUN_VERSION` | T (teste/bench/debug) | `omp:packages/metaharness/agent/omp_local.py:1` |
| `OMP_BENCH_CONTAINER_DNS` | T (teste/bench/debug) | `omp:packages/metaharness/agent/omp_local.py:1`, `omp:packages/metaharness/src/runner.ts:1` |
| `OMP_BENCH_FORWARD_ENV` | T (teste/bench/debug) | `omp:packages/metaharness/agent/omp_local.py:1`, `omp:packages/metaharness/agent/pi_upstream.py:1`, `omp:packages/metaharness/src/runner.ts:1` |
| `OMP_BENCH_GATEWAY` | T (teste/bench/debug) | `omp:packages/metaharness/agent/omp_local.py:1`, `omp:packages/metaharness/src/runner.ts:1` |
| `OMP_BENCH_GATEWAY_PROVIDERS` | T (teste/bench/debug) | `omp:packages/metaharness/agent/omp_local.py:1`, `omp:packages/metaharness/src/runner.ts:1`, `omp:packages/metaharness/test/runner.test.ts:1` |
| `OMP_BENCH_GATEWAY_TOKEN` | T (teste/bench/debug) | `omp:packages/metaharness/agent/omp_local.py:1`, `omp:packages/metaharness/agent/pi_upstream.py:1`, `omp:packages/metaharness/src/runner.ts:1` |
| `OMP_BENCH_GATEWAY_URL` | T (teste/bench/debug) | `omp:packages/metaharness/agent/omp_local.py:1`, `omp:packages/metaharness/agent/pi_upstream.py:1`, `omp:packages/metaharness/src/runner.ts:1` |
| `OMP_BENCH_INSTALL` | T (teste/bench/debug) | `omp:packages/metaharness/agent/omp_local.py:1`, `omp:packages/metaharness/src/runner.ts:1`, `omp:packages/metaharness/test/runner.test.ts:1` |
| `OMP_BENCH_MODELS_YAML` | T (teste/bench/debug) | `omp:packages/metaharness/agent/omp_local.py:1`, `omp:packages/metaharness/src/runner.ts:1` |
| `OMP_BENCH_NODE_VERSION` | T (teste/bench/debug) | `omp:packages/metaharness/agent/pi_upstream.py:1` |
| `OMP_BENCH_PI_MODELS` | T (teste/bench/debug) | `omp:packages/metaharness/agent/pi_upstream.py:1`, `omp:packages/metaharness/src/runner.ts:1` |
| `OMP_BENCH_PI_SYSTEM_PROMPT` | T (teste/bench/debug) | `omp:packages/metaharness/agent/pi_upstream.py:1`, `omp:packages/metaharness/src/runner.ts:1` |
| `OMP_BENCH_PI_VERSION` | T (teste/bench/debug) | `omp:packages/metaharness/agent/pi_upstream.py:1`, `omp:packages/metaharness/src/runner.ts:1` |
| `OMP_BENCH_SETTINGS` | T (teste/bench/debug) | `omp:packages/metaharness/agent/omp_local.py:1`, `omp:packages/metaharness/src/runner.ts:1` |
| `OMP_BENCH_SOURCE_ARCH` | T (teste/bench/debug) | `omp:packages/metaharness/agent/omp_local.py:1`, `omp:packages/metaharness/src/runner.ts:1`, `omp:packages/metaharness/test/runner.test.ts:1` |
| `OMP_BENCH_SOURCE_BUN` | T (teste/bench/debug) | `omp:packages/metaharness/agent/omp_local.py:1`, `omp:packages/metaharness/src/runner.ts:1`, `omp:packages/metaharness/test/runner.test.ts:1` |
| `OMP_BENCH_SOURCE_DIR` | T (teste/bench/debug) | `omp:packages/metaharness/agent/omp_local.py:1`, `omp:packages/metaharness/src/runner.ts:1`, `omp:packages/metaharness/test/runner.test.ts:1` |
| `OMP_BENCH_TARBALL` | T (teste/bench/debug) | `omp:packages/metaharness/agent/omp_local.py:1`, `omp:packages/metaharness/src/runner.ts:1` |
| `OMP_BENCH_THINKING` | T (teste/bench/debug) | `omp:packages/metaharness/agent/omp_local.py:1`, `omp:packages/metaharness/agent/pi_upstream.py:1`, `omp:packages/metaharness/src/runner.ts:1` |
| `OMP_BENCH_TOOLS` | T (teste/bench/debug) | `omp:packages/metaharness/agent/omp_local.py:1`, `omp:packages/metaharness/agent/pi_upstream.py:1`, `omp:packages/metaharness/src/runner.ts:1` |
| `OMP_BENCH_VERSION` | T (teste/bench/debug) | `omp:packages/metaharness/agent/omp_local.py:1`, `omp:packages/metaharness/src/runner.ts:1` |
| `OMP_BENCH_WEB_SEARCH` | T (teste/bench/debug) | `omp:packages/metaharness/agent/omp_local.py:1`, `omp:packages/metaharness/src/runner.ts:1` |
| `OMP_BIN` | I (infra/build/paths) | `omp:scripts/edit_benchmark_common.py:1`, `omp:scripts/rate-edit-tool.py:1` |
| `OMP_BROWSER_PROBE_PLATFORM` | H (harness/comportamento) | `omp:packages/coding-agent/test/fixtures/browser-executable-probe.ts:1`, `omp:packages/coding-agent/test/tools/browser-launch.test.ts:1` |
| `OMP_BROWSER_PROBE_PURPOSE` | H (harness/comportamento) | `omp:packages/coding-agent/test/fixtures/browser-executable-probe.ts:1`, `omp:packages/coding-agent/test/tools/browser-launch.test.ts:1` |
| `OMP_BUILD` | I (infra/build/paths) | `omp:packages/coding-agent/src/cli/build-service.ts:1`, `omp:packages/coding-agent/test/cli/build-service.test.ts:1`, `omp:packages/coding-agent/test/cli/update-cli.test.ts:1` |
| `OMP_BUILD_LABEL` | I (infra/build/paths) | `omp:packages/coding-agent/src/session/runtime-identity.ts:1` |
| `OMP_CAPTURE_DARWIN_HELPER` | I (infra/build/paths) | `omp:crates/natives/BUILD.bazel:1`, `omp:crates/natives/build.rs:1`, `omp:crates/natives/src/desktop/macos/capture/screen_capture_kit.rs:1` |
| `OMP_CODING_AGENT_DIR` | I (infra/build/paths) | `omp:packages/coding-agent/test/collab/test-home-isolation.test.ts:1` |
| `OMP_COMMIT_CACHE_DB` | H (harness/comportamento) | `omp:packages/utils/src/dirs.ts:1` |
| `OMP_CONFIG_DIR` | I (infra/build/paths) | `omp:packages/coding-agent/test/collab/test-home-isolation.test.ts:1` |
| `OMP_CONFIG_EOF` | I (infra/build/paths) | `omp:packages/metaharness/agent/omp_local.py:1`, `omp:packages/metaharness/src/tb/agent.ts:1` |
| `OMP_DAEMON_DIR` | I (infra/build/paths) | `omp:packages/coding-agent/src/daemon/paths.ts:1`, `omp:packages/coding-agent/src/daemon/protocol.ts:1`, `omp:packages/coding-agent/test/daemon/infer-module.test.ts:1` |
| `OMP_DAEMON_IDLE_EXIT_GRACE_MS` | I (infra/build/paths) | `omp:packages/coding-agent/src/daemon/protocol.ts:1` |
| `OMP_DAEMON_IDLE_GRACE_MS` | I (infra/build/paths) | `omp:packages/metaharness/agent/omp_local.py:1`, `omp:packages/metaharness/src/tb/trial.ts:1` |
| `OMP_DAEMON_ONLY` | I (infra/build/paths) | `omp:packages/coding-agent/test/daemon/unit-lifecycle.test.ts:1` |
| `OMP_DAEMON_RESUME` | I (infra/build/paths) | `omp:packages/coding-agent/src/daemon/protocol.ts:1` |
| `OMP_DAEMON_RESUME_LEASE_GRACE_MS` | I (infra/build/paths) | `omp:packages/coding-agent/src/daemon/protocol.ts:1` |
| `OMP_DAEMON_TCP` | I (infra/build/paths) | `omp:packages/coding-agent/src/daemon/client.ts:1`, `omp:packages/coding-agent/src/daemon/paths.ts:1`, `omp:packages/coding-agent/src/daemon/protocol.ts:1` |
| `OMP_DECLARE_RO` | I (infra/build/paths) | `omp:crates/shell/src/shell/tests/builtins.rs:1` |
| `OMP_DETACH_PROBE_` | I (infra/build/paths) | `omp:packages/coding-agent/test/tools/browser-relay-detach.test.ts:1` |
| `OMP_DIRENV_TEST_` | T (teste/bench/debug) | `omp:packages/coding-agent/test/direnv.test.ts:1` |
| `OMP_DISASM_WORKER_TOKEN` | I (infra/build/paths) | `omp:packages/coding-agent/src/binja/worker.py:1`, `omp:packages/coding-agent/src/disasm/supervisor.ts:1`, `omp:packages/coding-agent/src/ghidra/worker.py:1` |
| `OMP_DOTENV_REPRO_MARKER` | I (infra/build/paths) | `omp:packages/utils/test/env.test.ts:1` |
| `OMP_E2E_ANTHROPIC_MODEL` | H (harness/comportamento) | `omp:packages/ai/test/auth-gateway-anthropic-caching.test.ts:1`, `omp:packages/ai/test/auth-gateway-cross-protocol-caching.test.ts:1` |
| `OMP_E2E_CODEX_MODEL` | H (harness/comportamento) | `omp:packages/ai/test/auth-gateway-anthropic-to-codex-caching.test.ts:1` |
| `OMP_E2E_GATEWAY_URL` | I (infra/build/paths) | `omp:packages/ai/test/auth-gateway-anthropic-caching.test.ts:1`, `omp:packages/ai/test/auth-gateway-anthropic-to-codex-caching.test.ts:1`, `omp:packages/ai/test/auth-gateway-cross-protocol-caching.test.ts:1` |
| `OMP_E2E_OPENAI_RESPONSES_MODEL` | H (harness/comportamento) | `omp:packages/ai/test/auth-gateway-openai-responses-caching.test.ts:1` |
| `OMP_EVAL_HOST_EXECUTION_` | I (infra/build/paths) | `omp:packages/coding-agent/test/eval/context-manager-startup.test.ts:1` |
| `OMP_EXPECTED_DATE` | I (infra/build/paths) | `omp:packages/coding-agent/test/system-prompt-model.test.ts:1` |
| `OMP_FEATURE` | I (infra/build/paths) | `omp:packages/utils/test/env.test.ts:1` |
| `OMP_FORCE_RUST_TASKS` | I (infra/build/paths) | `omp:scripts/ci-test-ts.ts:1`, `omp:scripts/run-rs-task.ts:1` |
| `OMP_GITHUB_CACHE_DB` | H (harness/comportamento) | `omp:packages/coding-agent/test/extensibility/custom-commands/review.test.ts:1`, `omp:packages/coding-agent/test/internal-urls/issue-pr-protocol.test.ts:1`, `omp:packages/coding-agent/test/internal-urls/mr-protocol.test.ts:1` |
| `OMP_GIT_ENV_PROBE` | I (infra/build/paths) | `omp:crates/shell/src/shell/tests/env_cwd.rs:1` |
| `OMP_HARMONY_DEBUG` | T (teste/bench/debug) | `omp:packages/ai/src/utils/harmony-leak.ts:1` |
| `OMP_INJECTED_TOKEN` | I (infra/build/paths) | `omp:packages/coding-agent/test/agent-session-bash-session-ownership.test.ts:1` |
| `OMP_INPUT_RELEASE_HELPER` | I (infra/build/paths) | `omp:crates/natives/BUILD.bazel:1`, `omp:crates/natives/build.rs:1`, `omp:crates/natives/src/desktop/macos/release_guard.rs:1` |
| `OMP_INSTALL_BUILD` | I (infra/build/paths) | `omp:packages/browser-relay/extension/worker/relay.ts:1`, `omp:packages/coding-agent/src/tools/browser/relay/protocol.ts:1` |
| `OMP_INSTALL_TEST_SKIP_NATIVE_BUILD` | T (teste/bench/debug) | `omp:scripts/install-tests/run-ci.sh:1` |
| `OMP_INSTALL_VERSION` | I (infra/build/paths) | `omp:packages/browser-relay/extension/worker/relay.ts:1`, `omp:packages/coding-agent/src/tools/browser/relay/protocol.ts:1` |
| `OMP_JUDGMENT_CACHE_DB` | H (harness/comportamento) | `omp:packages/utils/src/dirs.ts:1` |
| `OMP_KEYMAP_DARWIN_HELPER` | I (infra/build/paths) | `omp:crates/natives/BUILD.bazel:1`, `omp:crates/natives/build.rs:1`, `omp:crates/natives/src/desktop/macos/keymap.rs:1` |
| `OMP_LAUNCH_CWD` | I (infra/build/paths) | `omp:packages/coding-agent/scripts/omp.ts:1` |
| `OMP_LIVE_ENDPOINT_TEST_KEY` | T (teste/bench/debug) | `omp:packages/coding-agent/test/live/endpoint.test.ts:1` |
| `OMP_LOGGER_TEST_NOW` | T (teste/bench/debug) | `omp:packages/utils/test/fixtures/logger-contract-probe.ts:1`, `omp:packages/utils/test/fixtures/logger-fixed-date-preload.ts:1`, `omp:packages/utils/test/fixtures/stderr-guard-rotation-probe.ts:1` |
| `OMP_LOG_LEVEL` | I (infra/build/paths) | `omp:packages/coding-agent/test/auth-broker-serve-shutdown.test.ts:1`, `omp:packages/utils/src/logger.ts:1`, `omp:packages/utils/test/logger-contract.test.ts:1` |
| `OMP_MARK` | I (infra/build/paths) | `omp:packages/browser-relay/extension/offscreen/main.ts:1` |
| `OMP_MARKETPLACE_DIR` | I (infra/build/paths) | `omp:packages/coding-agent/test/debug/dap-config.test.ts:1` |
| `OMP_MARK_PATH` | I (infra/build/paths) | `omp:packages/browser-relay/extension/overlay/dom.ts:1`, `omp:packages/browser-relay/extension/overlay/favicon.ts:1` |
| `OMP_MCP_REQUIRE_READY` | I (infra/build/paths) | `omp:packages/coding-agent/src/modes/print-mode.ts:1`, `omp:packages/coding-agent/test/mcp-print-readiness.test.ts:1`, `omp:packages/coding-agent/test/print-mode-retry-prep.test.ts:1` |
| `OMP_MCP_STARTUP_TIMEOUT_MS` | I (infra/build/paths) | `omp:packages/coding-agent/src/mcp/timeout.ts:1`, `omp:packages/coding-agent/src/modes/acp/acp-agent.ts:1`, `omp:packages/coding-agent/test/mcp-incremental-connect.test.ts:1` |
| `OMP_MCP_TIMEOUT_MS` | I (infra/build/paths) | `omp:packages/coding-agent/src/mcp/client.ts:1`, `omp:packages/coding-agent/src/mcp/errors.ts:1`, `omp:packages/coding-agent/src/mcp/host/header-policy.ts:1` |
| `OMP_MINIMIZER_LEGACY_FILTERS` | I (infra/build/paths) | `omp:crates/natives/src/shell.rs:1`, `omp:crates/shell/src/minimizer/config.rs:1`, `omp:packages/natives/native/index.d.ts:1` |
| `OMP_MNEMOPI_EMBED_IDLE_MS` | I (infra/build/paths) | `omp:packages/coding-agent/src/daemon/modules/infer.ts:1`, `omp:packages/coding-agent/src/mnemopi/embed-protocol.ts:1` |
| `OMP_MODELS_EOF` | H (harness/comportamento) | `omp:packages/metaharness/agent/omp_local.py:1`, `omp:packages/metaharness/src/tb/agent.ts:1` |
| `OMP_NATIVE_AUDIO_CAPTURE_TEST` | T (teste/bench/debug) | `omp:crates/voice/src/audio.rs:1` |
| `OMP_NATIVE_AUDIO_PLAYBACK_TEST` | T (teste/bench/debug) | `omp:crates/voice/src/audio.rs:1` |
| `OMP_NATIVE_BUILD_BACKEND` | I (infra/build/paths) | `omp:scripts/bazel-natives.ts:1`, `omp:scripts/setup.ts:1` |
| `OMP_NATIVE_CARGO_PROFILE` | I (infra/build/paths) | `omp:packages/natives/scripts/build-bindings.ts:1` |
| `OMP_NATIVE_LIBRARY_PATH` | I (infra/build/paths) | `omp:nix/package.nix:1`, `omp:packages/coding-agent/src/subprocess/worker-client.ts:1`, `omp:packages/coding-agent/test/tiny-worker-env.test.ts:1` |
| `OMP_NO_WEBP` | H (harness/comportamento) | `omp:packages/coding-agent/src/tools/browser/tab-protocol.ts:1`, `omp:packages/coding-agent/src/utils/image-input.ts:1`, `omp:packages/coding-agent/src/utils/image-loading.ts:1` |
| `OMP_NUM_THREADS` | I (infra/build/paths) | `omp:crates/builtins/src/nproc.rs:1` |
| `OMP_OAUTH_DARWIN_HELPER` | H (harness/comportamento) | `omp:crates/natives/BUILD.bazel:1`, `omp:crates/natives/build.rs:1`, `omp:crates/natives/src/oauth_callback/mod.rs:1` |
| `OMP_OAUTH_RELAY_BINARY` | H (harness/comportamento) | `omp:crates/natives/BUILD.bazel:1`, `omp:crates/natives/build.rs:1`, `omp:crates/natives/src/oauth_callback/mod.rs:1` |
| `OMP_OBJECT_DETAILS` | I (infra/build/paths) | `omp:packages/coding-agent/test/tools/browser-console.test.ts:1` |
| `OMP_PATH` | I (infra/build/paths) | `omp:packages/metaharness/src/compaction/trial.ts:1` |
| `OMP_PCRE2_JIT` | I (infra/build/paths) | `omp:crates/builtins/src/grep.rs:1`, `omp:crates/builtins/src/rg.rs:1`, `omp:crates/xfs/src/grep/engine.rs:1` |
| `OMP_PERL_FALLBACK` | H (harness/comportamento) | `omp:crates/builtins/src/perl/cli.rs:1`, `omp:crates/builtins/src/perl/mod.rs:1`, `omp:crates/builtins/src/perl/tests.rs:1` |
| `OMP_PLUGIN_AGENT_MD` | I (infra/build/paths) | `omp:packages/coding-agent/test/task/discovery.test.ts:1` |
| `OMP_PLUGIN_DIR` | I (infra/build/paths) | `omp:packages/coding-agent/test/debug/dap-config.test.ts:1` |
| `OMP_PLUGIN_ROOT` | I (infra/build/paths) | `omp:packages/coding-agent/src/capability/types.ts:1`, `omp:packages/coding-agent/src/discovery/claude-plugins.ts:1`, `omp:packages/coding-agent/src/discovery/omp-plugins.ts:1` |
| `OMP_PROCESS_ENTRY_ENV_PROBE` | I (infra/build/paths) | `omp:packages/coding-agent/test/eval/process-entry-import.test.ts:1`, `omp:packages/coding-agent/test/fixtures/js-process-entry-import.ts:1` |
| `OMP_PROC_SYS_TEST` | T (teste/bench/debug) | `omp:crates/builtins/src/proc_snapshot.rs:1` |
| `OMP_PROC_SYS_TEST_SLEEPER` | T (teste/bench/debug) | `omp:crates/builtins/src/proc_snapshot.rs:1` |
| `OMP_PROFILE` | I (infra/build/paths) | `omp:packages/agent/test/otel-content-capture-env.test.ts:1`, `omp:packages/catalog/scripts/generate-models.ts:1`, `omp:packages/coding-agent/src/cli.ts:1` |
| `OMP_PROFILE_BOOTSTRAP_SENTINEL` | I (infra/build/paths) | `omp:packages/coding-agent/test/profile-cli.test.ts:1` |
| `OMP_PROMPT_PERTURBATION` | I (infra/build/paths) | `omp:packages/ai/src/prompts/perturbation.ts:1`, `omp:packages/ai/test/prompt-perturbation.test.ts:1` |
| `OMP_PS_TEST_SLEEPER` | T (teste/bench/debug) | `omp:crates/natives/src/ps.rs:1` |
| `OMP_PS_TEST_TAG` | T (teste/bench/debug) | `omp:crates/natives/src/ps.rs:1` |
| `OMP_PTREE_ENV_PROBE` | I (infra/build/paths) | `omp:packages/utils/test/ptree-env.test.ts:1` |
| `OMP_PTREE_SUBREAPER_BUN_BE_BUN` | I (infra/build/paths) | `omp:packages/utils/src/ptree.ts:1` |
| `OMP_PTREE_SUBREAPER_COMMAND` | I (infra/build/paths) | `omp:packages/utils/src/ptree.ts:1`, `omp:packages/utils/test/ptree-timeout.test.ts:1` |
| `OMP_PTY_PROBE` | I (infra/build/paths) | `omp:packages/coding-agent/test/tools/bash-interactive.test.ts:1` |
| `OMP_REFRESH_DOTENV_ONLY` | I (infra/build/paths) | `omp:packages/utils/test/procmgr.test.ts:1` |
| `OMP_REFRESH_LAUNCH_SECRET` | I (infra/build/paths) | `omp:packages/utils/test/procmgr.test.ts:1` |
| `OMP_REFRESH_SHARED` | I (infra/build/paths) | `omp:packages/utils/test/procmgr.test.ts:1` |
| `OMP_REJECTED_DATE` | I (infra/build/paths) | `omp:packages/coding-agent/test/system-prompt-model.test.ts:1` |
| `OMP_RELEASE_NOTES_FLOOR` | I (infra/build/paths) | `omp:scripts/ci-release-notes.ts:1` |
| `OMP_REPO` | I (infra/build/paths) | `omp:scripts/ci-macos-upload-secrets.sh:1`, `omp:scripts/ci-release-notes.ts:1`, `omp:scripts/fix-changelogs.ts:1` |
| `OMP_REQUIRE_TERN` | I (infra/build/paths) | `omp:packages/coding-agent/test/tern-interactions.test.ts:1` |
| `OMP_ROOT` | I (infra/build/paths) | `omp:packages/coding-agent/src/eval/js/error-text.ts:1` |
| `OMP_RPC_SMOKE` | T (teste/bench/debug) | `omp:sdk/go/omp-rpc/smoke_test.go:1` |
| `OMP_SECURITY_FIXTURE_NOT_A_REAL_SECRET_000000` | I (infra/build/paths) | `omp:packages/coding-agent/test/fixtures/security/seeded-repository/src/fake-secret.ts:1` |
| `OMP_SECURITY_WORKFLOW_VERSION` | I (infra/build/paths) | `omp:packages/coding-agent/src/security/provenance.ts:1` |
| `OMP_SIGNING_DIR` | I (infra/build/paths) | `omp:scripts/ci-macos-upload-secrets.sh:1` |
| `OMP_SKIP_SETUP` | I (infra/build/paths) | `omp:packages/coding-agent/src/modes/view-model/setup/wizard.ts:1`, `omp:packages/coding-agent/test/tern-interactions.test.ts:1` |
| `OMP_SMOKE_INSTANCE_ID` | T (teste/bench/debug) | `omp:packages/coding-agent/test/collab/helpers/registry-host-process.ts:1`, `omp:packages/coding-agent/test/collab/registry-smoke.test.ts:1` |
| `OMP_SMOKE_MARKER` | T (teste/bench/debug) | `omp:packages/coding-agent/test/collab/helpers/registry-host-process.ts:1`, `omp:packages/coding-agent/test/collab/registry-smoke.test.ts:1` |
| `OMP_STATS_ALLOWED_HOSTS` | I (infra/build/paths) | `omp:packages/stats/src/server.ts:1` |
| `OMP_STATS_BUSY_TIMEOUT_MS` | I (infra/build/paths) | `omp:packages/stats/src/db.ts:1` |
| `OMP_STATUS_LINE_RE` | I (infra/build/paths) | `omp:packages/coding-agent/src/modes/controllers/input-controller.ts:1` |
| `OMP_STORE_MARK` | I (infra/build/paths) | `omp:packages/coding-agent/test/daemon/store.test.ts:1` |
| `OMP_SYNTAX_SET` | I (infra/build/paths) | `omp:crates/natives/BUILD.bazel:1`, `omp:crates/natives/build.rs:1`, `omp:crates/natives/src/highlight.rs:1` |
| `OMP_TAKEOVER_EDITOR_PARENT` | H (harness/comportamento) | `omp:crates/natives/src/desktop/win32/mod.rs:1` |
| `OMP_TAKEOVER_TEST_LAYOUT` | T (teste/bench/debug) | `omp:crates/natives/src/desktop/win32/mod.rs:1` |
| `OMP_TAKEOVER_TEST_WINDOWS` | T (teste/bench/debug) | `omp:crates/natives/src/desktop/win32/mod.rs:1` |
| `OMP_TEST_BASE_URL` | T (teste/bench/debug) | `omp:packages/coding-agent/test/main-auto-resume-model-restore.test.ts:1` |
| `OMP_TEST_BROWSER_INSTALL` | T (teste/bench/debug) | `omp:packages/utils/test/browsers.test.ts:1` |
| `OMP_TEST_CHUNK_TIMEOUT` | T (teste/bench/debug) | `omp:scripts/ci-test-ts.ts:1` |
| `OMP_TEST_CONCURRENCY` | T (teste/bench/debug) | `omp:scripts/ci-test-ts.ts:1` |
| `OMP_TEST_CONNURL_DSN` | T (teste/bench/debug) | `omp:packages/coding-agent/test/secrets-obfuscator.test.ts:1` |
| `OMP_TEST_CONNURL_ENCODED` | T (teste/bench/debug) | `omp:packages/coding-agent/test/secrets-obfuscator.test.ts:1` |
| `OMP_TEST_CONNURL_NOUSER` | T (teste/bench/debug) | `omp:packages/coding-agent/test/secrets-obfuscator.test.ts:1` |
| `OMP_TEST_CONNURL_PLAIN` | T (teste/bench/debug) | `omp:packages/coding-agent/test/secrets-obfuscator.test.ts:1` |
| `OMP_TEST_CONNURL_RAW_AT` | T (teste/bench/debug) | `omp:packages/coding-agent/test/secrets-obfuscator.test.ts:1` |
| `OMP_TEST_CONNURL_SHORT` | T (teste/bench/debug) | `omp:packages/coding-agent/test/secrets-obfuscator.test.ts:1` |
| `OMP_TEST_CORRUPT_8925` | T (teste/bench/debug) | `omp:crates/shell/tests/nonutf8_env.rs:1` |
| `OMP_TEST_INHERITED_MARKER` | T (teste/bench/debug) | `omp:packages/coding-agent/test/non-interactive-env.test.ts:1` |
| `OMP_TEST_LIVE_DYN` | T (teste/bench/debug) | `omp:packages/coding-agent/test/model-config-live-headers.test.ts:1` |
| `OMP_TEST_LIVE_KEY` | T (teste/bench/debug) | `omp:packages/coding-agent/test/model-config-live-headers.test.ts:1` |
| `OMP_TEST_MCP_ABSENT` | T (teste/bench/debug) | `omp:packages/coding-agent/test/discovery/opencode.test.ts:1` |
| `OMP_TEST_MCP_KEY` | T (teste/bench/debug) | `omp:packages/coding-agent/test/discovery/opencode.test.ts:1` |
| `OMP_TEST_MCP_PATH` | T (teste/bench/debug) | `omp:packages/coding-agent/test/discovery/opencode.test.ts:1` |
| `OMP_TEST_NOW` | T (teste/bench/debug) | `omp:packages/coding-agent/test/system-prompt-model.test.ts:1` |
| `OMP_TEST_SENTINEL_8925` | T (teste/bench/debug) | `omp:crates/shell/tests/nonutf8_env.rs:1` |
| `OMP_TEST_SHARD` | T (teste/bench/debug) | `omp:scripts/ci-test-ts.ts:1` |
| `OMP_TEST_TIMEOUT` | T (teste/bench/debug) | `omp:scripts/ci-test-ts.ts:1` |
| `OMP_TEST_VERTEX_RESPONSE_OBSERVER_CHILD` | T (teste/bench/debug) | `omp:packages/ai/test/google-provider-response.test.ts:1` |
| `OMP_TEST_VISIBLE_BROWSER` | T (teste/bench/debug) | `omp:packages/coding-agent/test/tools/browser-tab-worker-startup.test.ts:1` |
| `OMP_THREAD_LIMIT` | I (infra/build/paths) | `omp:crates/builtins/src/nproc.rs:1` |
| `OMP_TINY_WORKER_IDLE_MS` | I (infra/build/paths) | `omp:packages/coding-agent/src/daemon/modules/infer.ts:1`, `omp:packages/coding-agent/src/tiny/title-protocol.ts:1` |
| `OMP_TINY_WORKER_MODEL` | H (harness/comportamento) | `omp:packages/coding-agent/src/tiny/title-protocol.ts:1` |
| `OMP_TUI_DEBUG` | T (teste/bench/debug) | `omp:.omp/tools/tui.ts:1`, `omp:packages/coding-agent/test/fatal-stderr-pty.test.ts:1`, `omp:packages/tui/src/debug/server.ts:1` |
| `OMP_TUI_NATIVE` | I (infra/build/paths) | `omp:packages/coding-agent/test/fatal-stderr-pty.test.ts:1`, `omp:packages/coding-agent/test/main-auto-resume-model-restore.test.ts:1` |
| `OMP_UNIT_MARKER` | I (infra/build/paths) | `omp:packages/coding-agent/test/daemon/unit-lifecycle.test.ts:1` |
| `OMP_UPDATE_TITLE` | I (infra/build/paths) | `omp:packages/coding-agent/src/session/redis-session-storage.ts:1`, `omp:packages/coding-agent/test/session/redis-session-storage-manager.test.ts:1`, `omp:packages/coding-agent/test/session/redis-session-storage.test.ts:1` |
| `OMP_USER_SHELL_ENV` | I (infra/build/paths) | `omp:packages/coding-agent/test/agent-session-bash-session-ownership.test.ts:1` |
| `OMP_USER_SHELL_MIRROR` | I (infra/build/paths) | `omp:packages/coding-agent/test/agent-session-bash-session-ownership.test.ts:1` |
| `OMP_VAR` | I (infra/build/paths) | `omp:packages/coding-agent/src/discovery/substitute-plugin-root.ts:1`, `omp:packages/coding-agent/test/marketplace/substitute-plugin-root.test.ts:1` |
| `OMP_WORKER_ENV_PROBE` | I (infra/build/paths) | `omp:packages/coding-agent/test/tiny-worker-env.test.ts:1` |
| `OMP_WORKER_HOST_PROBE` | I (infra/build/paths) | `omp:packages/utils/test/profiles.test.ts:1` |
| `OMP_WORKTREE_DIR` | I (infra/build/paths) | `omp:packages/coding-agent/src/task/settings.ts:1`, `omp:packages/coding-agent/test/acp-builtins.test.ts:1`, `omp:packages/coding-agent/test/cli/worktree-clear-isolation.test.ts:1` |
| `OMP_WRITE_FULL` | I (infra/build/paths) | `omp:packages/coding-agent/src/session/redis-session-storage.ts:1`, `omp:packages/coding-agent/test/session/redis-session-storage-manager.test.ts:1`, `omp:packages/coding-agent/test/session/redis-session-storage.test.ts:1` |
| `OMP_X` | I (infra/build/paths) | `omp:crates/builtins/src/proc_snapshot.rs:1` |
| `OMP_XWIN_CACHE_DIR` | H (harness/comportamento) | `omp:bazel/toolchains/msvc/sysroot.bzl:1`, `omp:infra/vmon/omp_ci_template.py:1` |

## Variáveis `PI_*` no omp

| Variável | Classe | Ocorrências (amostra até 3 arquivos) |
|---|---|---|
| `PI_A` | I (infra/build/paths) | `omp:crates/shell/src/shell/tests/session.rs:1` |
| `PI_AFTER_ABORT` | I (infra/build/paths) | `omp:packages/coding-agent/test/bash-executor.test.ts:1` |
| `PI_AGY_PATH` | I (infra/build/paths) | `omp:packages/ai/src/providers/antigravity-cli/binary.ts:1`, `omp:packages/ai/test/antigravity-cli-credentials.test.ts:1` |
| `PI_AI_ANTIGRAVITY_ARCH` | I (infra/build/paths) | `omp:packages/catalog/src/wire/gemini-headers.ts:1` |
| `PI_AI_ANTIGRAVITY_CL` | I (infra/build/paths) | `omp:packages/catalog/src/wire/gemini-headers.ts:1` |
| `PI_AI_ANTIGRAVITY_OS` | I (infra/build/paths) | `omp:packages/catalog/src/wire/gemini-headers.ts:1` |
| `PI_AI_ANTIGRAVITY_VERSION` | I (infra/build/paths) | `omp:packages/ai/test/google-empty-response-retry.test.ts:1`, `omp:packages/ai/test/google-gemini-cli-first-event-timeout.test.ts:1`, `omp:packages/catalog/src/wire/gemini-headers.ts:1` |
| `PI_AI_CLAUDE_CODE_VERSION` | I (infra/build/paths) | `omp:packages/ai/src/providers/claude-code-fingerprint.ts:1` |
| `PI_AI_CODEX_CLIENT_VERSION` | I (infra/build/paths) | `omp:packages/catalog/src/wire/codex-version.ts:1`, `omp:packages/catalog/test/codex-client-version-xdg.test.ts:1` |
| `PI_ALLOW_SIXEL_PASSTHROUGH` | I (infra/build/paths) | `omp:packages/coding-agent/src/utils/sixel-passthrough.ts:1`, `omp:packages/coding-agent/test/streaming-output.test.ts:1` |
| `PI_ANTHROPIC_API_VERSION` | I (infra/build/paths) | `omp:packages/ai/test/anthropic-api-version.test.ts:1`, `omp:packages/catalog/src/compat/anthropic.ts:1`, `omp:packages/coding-agent/test/web/search/anthropic.test.ts:1` |
| `PI_ANTHROPIC_MESSAGE_THREADS` | I (infra/build/paths) | `omp:packages/ai/src/providers/anthropic-threads.ts:1`, `omp:packages/coding-agent/test/agent-session-anthropic-native-compaction.test.ts:1` |
| `PI_ARTIFACTS_DIR` | I (infra/build/paths) | `omp:packages/coding-agent/src/eval/executor-base.ts:1`, `omp:packages/coding-agent/src/eval/py/executor.ts:1`, `omp:packages/coding-agent/src/eval/py/prelude.py:1` |
| `PI_AUTH_NO_BORROW` | H (harness/comportamento) | `omp:packages/ai/src/registry/oauth/perplexity.ts:1`, `omp:packages/ai/test/perplexity-login.test.ts:1` |
| `PI_AUTO_QA` | I (infra/build/paths) | `omp:packages/coding-agent/src/tools/report-tool-issue.ts:1`, `omp:packages/coding-agent/src/tools/settings.ts:1`, `omp:packages/coding-agent/test/tools/report-tool-issue.test.ts:1` |
| `PI_AUTO_QA_PUSH` | I (infra/build/paths) | `omp:packages/coding-agent/src/tools/report-tool-issue.ts:1`, `omp:packages/coding-agent/test/tools/report-tool-issue.test.ts:1` |
| `PI_AUTO_QA_PUSH_TOKEN` | I (infra/build/paths) | `omp:packages/coding-agent/src/tools/report-tool-issue.ts:1` |
| `PI_AUTO_QA_PUSH_URL` | I (infra/build/paths) | `omp:packages/coding-agent/src/cli/grievances-cli.ts:1`, `omp:packages/coding-agent/src/tools/report-tool-issue.ts:1` |
| `PI_B` | I (infra/build/paths) | `omp:crates/shell/src/shell/tests/session.rs:1` |
| `PI_BASH_NO_CI` | H (harness/comportamento) | `omp:packages/coding-agent/src/exec/non-interactive-env.ts:1`, `omp:packages/coding-agent/test/non-interactive-env.test.ts:1`, `omp:packages/utils/src/procmgr.ts:1` |
| `PI_BASH_NO_LOGIN` | H (harness/comportamento) | `omp:packages/utils/src/procmgr.ts:1`, `omp:packages/utils/test/procmgr.test.ts:1` |
| `PI_BASH_OK` | I (infra/build/paths) | `omp:packages/coding-agent/src/ssh/connection-manager.ts:1` |
| `PI_BLOCKED_AGENT` | I (infra/build/paths) | `omp:packages/coding-agent/src/task/index.ts:1`, `omp:packages/coding-agent/src/task/spawn-policy.ts:1`, `omp:packages/coding-agent/test/task/structured-subagent.test.ts:1` |
| `PI_BOTH_VAR` | I (infra/build/paths) | `omp:packages/coding-agent/test/bash-session-state.test.ts:1` |
| `PI_BROWSER_CMUX` | H (harness/comportamento) | `omp:packages/coding-agent/src/tools/browser.ts:1`, `omp:packages/coding-agent/src/tools/browser/cmux/rpc.ts:1`, `omp:packages/coding-agent/src/tools/browser/settings.ts:1` |
| `PI_BROWSER_RELAY` | H (harness/comportamento) | `omp:packages/coding-agent/src/prompts/tools/browser.md:1`, `omp:packages/coding-agent/src/tools/browser.ts:1`, `omp:packages/coding-agent/src/tools/browser/prelude-definition.ts:1` |
| `PI_BROWSER_RELAY_KEEP_FRONT` | H (harness/comportamento) | `omp:packages/coding-agent/src/tools/browser/relay/server.ts:1` |
| `PI_BROWSER_TERN` | H (harness/comportamento) | `omp:packages/coding-agent/src/tools/browser.ts:1`, `omp:packages/coding-agent/src/tools/browser/settings.ts:1`, `omp:packages/coding-agent/src/tools/browser/tern/kind.ts:1` |
| `PI_BROWSER_WEBKIT` | H (harness/comportamento) | `omp:packages/coding-agent/src/prompts/tools/browser.md:1`, `omp:packages/coding-agent/src/tools/browser.ts:1`, `omp:packages/coding-agent/src/tools/browser/settings.ts:1` |
| `PI_BROWSER_WEBKIT_PATH` | H (harness/comportamento) | `omp:packages/coding-agent/src/tools/browser.ts:1`, `omp:packages/coding-agent/src/tools/browser/settings.ts:1`, `omp:packages/coding-agent/src/tools/browser/webkit/install.ts:1` |
| `PI_BUILD_URL` | I (infra/build/paths) | `omp:packages/coding-agent/src/cli/build-service.ts:1`, `omp:packages/coding-agent/test/cli/build-service.test.ts:1`, `omp:packages/coding-agent/test/cli/update-cli.test.ts:1` |
| `PI_BUNDLED` | I (infra/build/paths) | `omp:packages/coding-agent/scripts/bundle-dist.ts:1`, `omp:packages/coding-agent/src/export/html/index.ts:1`, `omp:packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts:1` |
| `PI_CACHE_ONLY_A` | H (harness/comportamento) | `omp:packages/coding-agent/test/direnv.test.ts:1` |
| `PI_CACHE_PROJECT` | H (harness/comportamento) | `omp:packages/coding-agent/test/direnv.test.ts:1` |
| `PI_CACHE_REMOVED` | H (harness/comportamento) | `omp:packages/coding-agent/test/direnv.test.ts:1` |
| `PI_CACHE_RESTORED` | H (harness/comportamento) | `omp:packages/coding-agent/test/direnv.test.ts:1` |
| `PI_CACHE_RETENTION` | H (harness/comportamento) | `omp:packages/agent/src/compaction/openai.ts:1`, `omp:packages/ai/src/providers/anthropic.ts:1`, `omp:packages/ai/src/utils.ts:1` |
| `PI_CHUNK_LINES` | I (infra/build/paths) | `omp:packages/coding-agent/src/auto-graph/chart-plan.ts:1` |
| `PI_CODEX_CONCURRENT_SUMMARIES` | I (infra/build/paths) | `omp:packages/ai/src/providers/openai-codex/request-transformer.ts:1`, `omp:packages/ai/test/openai-codex-responses-lite.test.ts:1` |
| `PI_CODEX_DEBUG` | T (teste/bench/debug) | `omp:packages/ai/src/providers/openai-codex-responses.ts:1` |
| `PI_CODEX_RESPONSES_LITE` | I (infra/build/paths) | `omp:packages/ai/src/providers/openai-codex/request-transformer.ts:1`, `omp:packages/ai/test/openai-codex-responses-lite.test.ts:1` |
| `PI_CODEX_WEBSOCKET` | H (harness/comportamento) | `omp:packages/ai/src/providers/openai-codex-transport.ts:1` |
| `PI_CODEX_WEBSOCKET_FIRST_EVENT_TIMEOUT_MS` | H (harness/comportamento) | `omp:packages/ai/src/providers/openai-codex-responses.ts:1` |
| `PI_CODEX_WEBSOCKET_IDLE_TIMEOUT_MS` | H (harness/comportamento) | `omp:packages/ai/src/providers/openai-codex-responses.ts:1` |
| `PI_CODEX_WEBSOCKET_MAX_IDLE_REUSE_MS` | H (harness/comportamento) | `omp:packages/ai/src/providers/openai-codex-responses.ts:1` |
| `PI_CODEX_WEBSOCKET_MESSAGE_QUEUE_CAPACITY` | H (harness/comportamento) | `omp:packages/ai/src/providers/openai-codex-responses.ts:1` |
| `PI_CODEX_WEBSOCKET_PING_INTERVAL_MS` | H (harness/comportamento) | `omp:packages/ai/src/providers/openai-codex-responses.ts:1` |
| `PI_CODEX_WEBSOCKET_PONG_TIMEOUT_MS` | H (harness/comportamento) | `omp:packages/ai/src/providers/openai-codex-responses.ts:1` |
| `PI_CODEX_WEBSOCKET_RETRY_BUDGET` | H (harness/comportamento) | `omp:packages/ai/src/providers/openai-codex-responses.ts:1` |
| `PI_CODEX_WEBSOCKET_RETRY_DELAY_MS` | H (harness/comportamento) | `omp:packages/ai/src/providers/openai-codex-responses.ts:1` |
| `PI_CODING_AGENT_DIR` | I (infra/build/paths) | `omp:crates/natives/src/crash_handler.rs:1`, `omp:packages/agent/test/otel-content-capture-env.test.ts:1`, `omp:packages/ai/test/antigravity-cli-credentials.test.ts:1` |
| `PI_CODING_AGENT_SESSION_DIR` | I (infra/build/paths) | `omp:packages/coding-agent/src/cli/args.ts:1`, `omp:packages/coding-agent/src/modes/controllers/command-controller.ts:1`, `omp:packages/coding-agent/test/flag-tables.test.ts:1` |
| `PI_COLON` | I (infra/build/paths) | `omp:packages/coding-agent/test/bash-executor.test.ts:1` |
| `PI_COLON_LOOP` | I (infra/build/paths) | `omp:packages/coding-agent/test/bash-executor.test.ts:1` |
| `PI_COMMIT_NO_FALLBACK` | H (harness/comportamento) | `omp:packages/coding-agent/src/commit/agentic/index.ts:1` |
| `PI_COMMIT_TEST_FALLBACK` | T (teste/bench/debug) | `omp:packages/coding-agent/src/commit/agentic/index.ts:1`, `omp:packages/coding-agent/test/commit-fallback-exit.test.ts:1` |
| `PI_COMPILED` | I (infra/build/paths) | `omp:.omp/tests/tui.test.ts:1`, `omp:packages/coding-agent/scripts/compile-binary.ts:1`, `omp:packages/coding-agent/src/cli.ts:1` |
| `PI_COMP_BLESS` | I (infra/build/paths) | `omp:crates/shell/tests/comp_support/mod.rs:1`, `omp:crates/shell/tests/zsh_comp_pty.rs:1` |
| `PI_COMP_ORACLE` | I (infra/build/paths) | `omp:crates/shell/tests/comp_support/mod.rs:1`, `omp:crates/shell/tests/zsh_comp_pty.rs:1`, `omp:crates/shell/tests/zsh_comp_y01.rs:1` |
| `PI_COMP_QUIET_MS` | I (infra/build/paths) | `omp:crates/shell/tests/comp_support/mod.rs:1` |
| `PI_CONFIG_DIR` | I (infra/build/paths) | `omp:crates/natives/src/crash_handler.rs:1`, `omp:crates/natives/src/oauth_callback/darwin.rs:1`, `omp:packages/agent/test/otel-content-capture-env.test.ts:1` |
| `PI_CONFIG_FILES` | I (infra/build/paths) | `omp:packages/coding-agent/src/cli/config-cli.ts:1`, `omp:packages/coding-agent/src/config/settings.ts:1`, `omp:packages/coding-agent/src/main.ts:1` |
| `PI_CONSOLE_PROBE_CHILD` | I (infra/build/paths) | `omp:crates/shell/src/sys/spawn/windows/tests.rs:1` |
| `PI_CONSOLE_PROBE_OUT` | I (infra/build/paths) | `omp:crates/shell/src/sys/spawn/windows/tests.rs:1` |
| `PI_CONSOLE_PROBE_SLEEP` | I (infra/build/paths) | `omp:crates/shell/src/sys/spawn/windows/tests.rs:1` |
| `PI_CONTROL_TEST_FREE` | T (teste/bench/debug) | `omp:crates/natives/src/desktop/control.rs:1` |
| `PI_CONTROL_TEST_LOCK` | T (teste/bench/debug) | `omp:crates/natives/src/desktop/control.rs:1` |
| `PI_CUSTOM` | I (infra/build/paths) | `omp:packages/coding-agent/test/core/python-kernel-env.test.ts:1` |
| `PI_DEBUG_STARTUP` | T (teste/bench/debug) | `omp:packages/coding-agent/src/main.ts:1`, `omp:packages/natives/native/loader-state.js:1`, `omp:packages/utils/src/cli.ts:1` |
| `PI_DESKTOP_TEST_ALONE` | T (teste/bench/debug) | `omp:crates/natives/src/desktop/control.rs:1`, `omp:crates/natives/src/desktop/mod.rs:1` |
| `PI_DIALECT` | I (infra/build/paths) | `omp:packages/agent/src/agent-loop.ts:1`, `omp:packages/agent/src/agent.ts:1`, `omp:packages/agent/src/types.ts:1` |
| `PI_DIRENV_CHILD_TEST` | T (teste/bench/debug) | `omp:packages/coding-agent/test/direnv.test.ts:1` |
| `PI_DIRENV_OPTIONAL` | I (infra/build/paths) | `omp:packages/coding-agent/test/direnv.test.ts:1` |
| `PI_DIRENV_PARENT_TEST` | T (teste/bench/debug) | `omp:packages/coding-agent/test/direnv.test.ts:1` |
| `PI_DIRENV_UNSET_E2E` | I (infra/build/paths) | `omp:packages/coding-agent/test/direnv.test.ts:1` |
| `PI_DIRENV_UNSET_TEST` | T (teste/bench/debug) | `omp:packages/coding-agent/test/direnv.test.ts:1` |
| `PI_DISABLE_` | I (infra/build/paths) | `omp:crates/natives/src/shell.rs:1`, `omp:crates/shell/src/shell.rs:1`, `omp:packages/natives/native/index.d.ts:1` |
| `PI_DISABLE_LSPMUX` | H (harness/comportamento) | `omp:packages/coding-agent/src/lsp/lspmux.ts:1` |
| `PI_DISABLE_MV_BUILTIN` | I (infra/build/paths) | `omp:crates/shell/src/extras.rs:1`, `omp:crates/shell/src/tools/mod.rs:1` |
| `PI_DISABLE_NOHUP_BUILTIN` | I (infra/build/paths) | `omp:crates/shell/src/suites/tools.rs:1`, `omp:crates/shell/src/tools/mod.rs:1`, `omp:crates/shell/tests/callout_in_function.rs:1` |
| `PI_DISABLE_RM_BUILTIN` | I (infra/build/paths) | `omp:crates/shell/src/extras.rs:1`, `omp:crates/shell/src/shell/tests/builtins.rs:1`, `omp:crates/shell/src/suites/extras.rs:1` |
| `PI_DISABLE_UUTILS_` | I (infra/build/paths) | `omp:crates/shell/src/tools/mod.rs:1` |
| `PI_DISABLE_UUTILS_BUILTINS` | I (infra/build/paths) | `omp:crates/shell/src/extras.rs:1`, `omp:crates/shell/src/process/host.rs:1`, `omp:crates/shell/src/shell/tests/builtins.rs:1` |
| `PI_DISABLE_UUTILS_DESTRUCTIVE` | I (infra/build/paths) | `omp:crates/shell/src/extras.rs:1`, `omp:crates/shell/src/suites/extras.rs:1`, `omp:crates/shell/src/tools/mod.rs:1` |
| `PI_DOCS_EMBED` | I (infra/build/paths) | `omp:packages/coding-agent/scripts/bundle-dist.ts:1`, `omp:packages/coding-agent/scripts/compile-binary.ts:1`, `omp:packages/coding-agent/src/internal-urls/docs-index.ts:1` |
| `PI_EDIT_FUZZY` | H (harness/comportamento) | `omp:packages/coding-agent/src/edit/settings.ts:1`, `omp:packages/coding-agent/test/config/settings-registry.test.ts:1`, `omp:packages/coding-agent/test/edit-mode.test.ts:1` |
| `PI_EDIT_FUZZY_THRESHOLD` | H (harness/comportamento) | `omp:packages/coding-agent/src/edit/settings.ts:1`, `omp:packages/metaharness/adapters/edit/runner.ts:1` |
| `PI_EDIT_VARIANT` | H (harness/comportamento) | `omp:packages/coding-agent/src/edit/settings.ts:1`, `omp:packages/coding-agent/src/utils/edit-mode.ts:1`, `omp:packages/coding-agent/test/edit-auto-generated-regressions.test.ts:1` |
| `PI_ENVEXACT_TEST_` | T (teste/bench/debug) | `omp:packages/utils/test/env.test.ts:1` |
| `PI_ENV_PROBE` | I (infra/build/paths) | `omp:crates/shell/src/shell/tests/builtins.rs:1` |
| `PI_EVAL_LOCAL_ROOTS` | I (infra/build/paths) | `omp:packages/coding-agent/src/eval/executor-base.ts:1`, `omp:packages/coding-agent/src/eval/py/executor.ts:1`, `omp:packages/coding-agent/src/eval/py/prelude.py:1` |
| `PI_EXEC_ENV` | I (infra/build/paths) | `omp:crates/shell/src/shell/tests/builtins.rs:1` |
| `PI_FEATURE` | I (infra/build/paths) | `omp:packages/utils/test/env.test.ts:1` |
| `PI_FORCE_HYPERLINKS` | I (infra/build/paths) | `omp:packages/coding-agent/test/ui/app/support/pin-env.ts:1`, `omp:packages/tui/src/driver/caps/env.ts:1`, `omp:packages/tui/test/driver-io/caps.test.ts:1` |
| `PI_FORCE_IMAGE_PROTOCOL` | I (infra/build/paths) | `omp:packages/coding-agent/src/utils/sixel-passthrough.ts:1`, `omp:packages/coding-agent/test/streaming-output.test.ts:1`, `omp:packages/coding-agent/test/ui/app/support/env.ts:1` |
| `PI_FORCE_SYNC_OUTPUT` | I (infra/build/paths) | `omp:packages/tui/src/driver/caps/env.ts:1`, `omp:packages/tui/test/driver-io/caps.test.ts:1` |
| `PI_FORK_VAR` | I (infra/build/paths) | `omp:crates/shell/src/shell/tests/session.rs:1` |
| `PI_GIT_GUARD` | I (infra/build/paths) | `omp:crates/shell/src/git/guard.rs:1`, `omp:crates/shell/src/git/mod.rs:1`, `omp:crates/shell/src/session.rs:1` |
| `PI_GIT_GUARD_OVNFS` | I (infra/build/paths) | `omp:crates/shell/src/git/guard.rs:1`, `omp:crates/shell/src/git/mod.rs:1`, `omp:crates/shell/src/tools/git.rs:1` |
| `PI_GRAMMARS_URL` | I (infra/build/paths) | `omp:packages/coding-agent/src/utils/grammars.ts:1`, `omp:packages/coding-agent/test/utils/grammars.test.ts:1` |
| `PI_GUARD_TEST_GLOBAL_HOME` | T (teste/bench/debug) | `omp:crates/shell/src/git/guard.rs:1` |
| `PI_HOST_PROBE` | I (infra/build/paths) | `omp:packages/coding-agent/src/ssh/connection-manager.ts:1` |
| `PI_INSTALL_DIR` | I (infra/build/paths) | `omp:scripts/install.ps1:1`, `omp:scripts/install.sh:1` |
| `PI_INTENT_DESC` | I (infra/build/paths) | `omp:packages/agent/src/agent-loop.ts:1`, `omp:packages/agent/src/agent.ts:1`, `omp:packages/agent/src/types.ts:1` |
| `PI_INTENT_PROMPT` | I (infra/build/paths) | `omp:packages/coding-agent/src/spotlight/session.ts:1`, `omp:packages/coding-agent/src/system-prompt.ts:1` |
| `PI_INTENT_TRACING` | I (infra/build/paths) | `omp:packages/coding-agent/src/sdk.ts:1`, `omp:packages/coding-agent/src/tools/settings.ts:1` |
| `PI_IN_USE_LOOP` | I (infra/build/paths) | `omp:packages/coding-agent/test/bash-executor.test.ts:1` |
| `PI_JS` | H (harness/comportamento) | `omp:packages/coding-agent/src/eval/settings.ts:1`, `omp:packages/coding-agent/src/eval/startup-warning.ts:1`, `omp:packages/coding-agent/src/tools/eval-backends.ts:1` |
| `PI_KEPT` | I (infra/build/paths) | `omp:crates/shell/src/shell/tests/session.rs:1` |
| `PI_KITTY_PLACEHOLDERS` | I (infra/build/paths) | `omp:packages/tui/src/driver/images/kitty.ts:1`, `omp:packages/tui/test/driver-images/encoders.test.ts:1` |
| `PI_LEFT_SESSION_MARK` | I (infra/build/paths) | `omp:packages/coding-agent/test/agent-session-bash-session-ownership.test.ts:1` |
| `PI_LINK_HOST` | I (infra/build/paths) | `omp:packages/coding-agent/src/utils/file-links.ts:1` |
| `PI_LINK_SCHEME` | I (infra/build/paths) | `omp:packages/coding-agent/src/ui/styles/tools/file-common.ts:1`, `omp:packages/coding-agent/src/ui/tools/file-common.tsx:1`, `omp:packages/coding-agent/src/utils/file-links.ts:1` |
| `PI_LOCAL_LLM` | I (infra/build/paths) | `omp:packages/ai/test/context-overflow.test.ts:1`, `omp:packages/ai/test/stream.test.ts:1` |
| `PI_LOOP` | I (infra/build/paths) | `omp:packages/coding-agent/test/bash-executor.test.ts:1` |
| `PI_LOOP_SAMPLER` | I (infra/build/paths) | `omp:packages/tui/src/diag/loop-sampler.ts:1`, `omp:packages/tui/test/diag/loop-watchdog.test.ts:1` |
| `PI_MAX_AST_FILES` | I (infra/build/paths) | `omp:packages/coding-agent/src/tools/ast-edit.ts:1` |
| `PI_MAX_FPS` | I (infra/build/paths) | `omp:packages/coding-agent/src/commands/launch-help.ts:1`, `omp:packages/coding-agent/src/main.ts:1`, `omp:packages/coding-agent/src/modes/settings.ts:1` |
| `PI_MCP_ENV` | I (infra/build/paths) | `omp:packages/coding-agent/test/discovery/mcp-json.test.ts:1` |
| `PI_MCP_HEADER` | I (infra/build/paths) | `omp:packages/coding-agent/test/discovery/mcp-json.test.ts:1` |
| `PI_MCP_URL` | I (infra/build/paths) | `omp:packages/coding-agent/test/discovery/mcp-json.test.ts:1` |
| `PI_MODELS_EOF` | H (harness/comportamento) | `omp:packages/metaharness/agent/pi_upstream.py:1` |
| `PI_MOTION` | I (infra/build/paths) | `omp:packages/coding-agent/src/commands/launch-help.ts:1`, `omp:packages/coding-agent/src/main.ts:1`, `omp:packages/coding-agent/src/modes/settings.ts:1` |
| `PI_MUSE_STORE_RESPONSES` | I (infra/build/paths) | `omp:packages/ai/src/providers/openai-responses-state.ts:1`, `omp:packages/ai/src/types.ts:1`, `omp:packages/ai/test/openai-responses-resume.test.ts:1` |
| `PI_NATIVES_DIR` | I (infra/build/paths) | `omp:packages/coding-agent/test/cli-responses-websocket-recovery.test.ts:1`, `omp:packages/natives/native/loader-state.js:1`, `omp:packages/natives/test/addon-path-characters.test.ts:1` |
| `PI_NATIVES_VERSION_STAMP` | I (infra/build/paths) | `omp:crates/natives/src/lib.rs:1`, `omp:packages/natives/native/version-sentinel.js:1`, `omp:packages/natives/test/embed-native.test.ts:1` |
| `PI_NATIVE_COMBO_TIMEOUT_CHILD` | I (infra/build/paths) | `omp:crates/natives/src/desktop/win32/value_write.rs:1` |
| `PI_NATIVE_STREAM_FIRST_EVENT_TIMEOUT_ERROR` | I (infra/build/paths) | `omp:packages/ai/src/providers/pi-native-client.ts:1` |
| `PI_NATIVE_STREAM_IDLE_TIMEOUT_ERROR` | I (infra/build/paths) | `omp:packages/ai/src/providers/pi-native-client.ts:1` |
| `PI_NATIVE_VARIANT` | I (infra/build/paths) | `omp:packages/natives/native/loader-state.js:1`, `omp:packages/natives/test/addon-path-characters.test.ts:1`, `omp:packages/natives/test/embed-native.test.ts:1` |
| `PI_NOTIFICATIONS` | I (infra/build/paths) | `omp:packages/coding-agent/src/modes/rpc/rpc-mode.ts:1`, `omp:packages/coding-agent/src/ui/apps/protocol-probe/protocol-probe.tsx:1`, `omp:packages/coding-agent/test/ui/app/support/pin-env.ts:1` |
| `PI_NO_DECCARA` | H (harness/comportamento) | `omp:packages/coding-agent/test/ui/app/support/pin-env.ts:1` |
| `PI_NO_DESKTOP_NOTIFY` | H (harness/comportamento) | `omp:packages/tui/src/driver/desktop-notify.ts:1`, `omp:packages/tui/test/driver-session/desktop-notify.test.ts:1` |
| `PI_NO_GLYPH_PROTOCOL` | H (harness/comportamento) | `omp:packages/tui/src/driver/process/terminal-input.ts:1`, `omp:packages/tui/test/driver-io/terminal-input.test.ts:1` |
| `PI_NO_HYPERLINKS` | H (harness/comportamento) | `omp:packages/coding-agent/test/ui/app/support/env.ts:1`, `omp:packages/coding-agent/test/ui/app/support/pin-env.ts:1`, `omp:packages/tui/src/driver/caps/env.ts:1` |
| `PI_NO_INTENT` | H (harness/comportamento) | `omp:packages/agent/src/agent-loop.ts:1` |
| `PI_NO_INTERLEAVED_THINKING` | H (harness/comportamento) | `omp:packages/ai/src/stream.ts:1` |
| `PI_NO_KITTY_PLACEHOLDERS` | H (harness/comportamento) | `omp:packages/tui/src/driver/images/kitty.ts:1`, `omp:packages/tui/test/driver-images/encoders.test.ts:1` |
| `PI_NO_LOCAL_LLM` | H (harness/comportamento) | `omp:packages/ai/test/context-overflow.test.ts:1` |
| `PI_NO_PTY` | H (harness/comportamento) | `omp:packages/coding-agent/src/cli/help-extra.ts:1`, `omp:packages/coding-agent/src/exec/bash-executor.ts:1`, `omp:packages/coding-agent/src/main.ts:1` |
| `PI_NO_STRICT` | H (harness/comportamento) | `omp:packages/ai/src/utils/schema/adapt.ts:1` |
| `PI_NO_SYNC_OUTPUT` | H (harness/comportamento) | `omp:packages/tui/src/driver/caps/env.ts:1`, `omp:packages/tui/test/driver-io/caps.test.ts:1`, `omp:packages/tui/test/driver-io/terminal-input.test.ts:1` |
| `PI_NO_THINKING_LOOP_GUARD` | H (harness/comportamento) | `omp:packages/ai/src/utils/thinking-loop.ts:1`, `omp:packages/coding-agent/src/session/settings.ts:1` |
| `PI_NO_TITLE` | H (harness/comportamento) | `omp:packages/coding-agent/scripts/bench-title-fork.ts:1`, `omp:packages/coding-agent/src/main.ts:1`, `omp:packages/coding-agent/src/modes/interactive-mode.ts:1` |
| `PI_OAUTH_CALLBACK_PATH` | H (harness/comportamento) | `omp:packages/coding-agent/test/discovery/mcp-json.test.ts:1` |
| `PI_OAUTH_CLIENT_ID` | H (harness/comportamento) | `omp:packages/coding-agent/test/discovery/mcp-json.test.ts:1` |
| `PI_OAUTH_CLIENT_SECRET` | H (harness/comportamento) | `omp:packages/coding-agent/test/discovery/mcp-json.test.ts:1` |
| `PI_OAUTH_REDIRECT_URI` | H (harness/comportamento) | `omp:packages/coding-agent/test/discovery/mcp-json.test.ts:1` |
| `PI_OAUTH_TOKEN_URL` | H (harness/comportamento) | `omp:packages/coding-agent/test/discovery/mcp-json.test.ts:1` |
| `PI_ONLY` | I (infra/build/paths) | `omp:crates/shell/src/shell/tests/env_cwd.rs:1` |
| `PI_OPENAI_STATEFUL` | I (infra/build/paths) | `omp:packages/ai/src/providers/openai-responses.ts:1`, `omp:packages/ai/test/openai-responses-stateful.test.ts:1` |
| `PI_OPENAI_STREAM_FIRST_EVENT_TIMEOUT_MS` | I (infra/build/paths) | `omp:packages/ai/src/types.ts:1`, `omp:packages/ai/src/utils/idle-iterator.ts:1`, `omp:packages/ai/test/openai-first-event-timeout.test.ts:1` |
| `PI_OPENAI_STREAM_IDLE_TIMEOUT_MS` | I (infra/build/paths) | `omp:packages/ai/src/providers/register-builtins.ts:1`, `omp:packages/ai/src/types.ts:1`, `omp:packages/ai/src/utils/idle-iterator.ts:1` |
| `PI_OPENROUTER_RESPONSES` | I (infra/build/paths) | `omp:packages/ai/src/providers/vision-guard.ts:1`, `omp:packages/ai/src/stream.ts:1`, `omp:packages/ai/src/thinking-probe.ts:1` |
| `PI_OTHER` | I (infra/build/paths) | `omp:packages/coding-agent/test/bash-executor.test.ts:1` |
| `PI_OTHER_LOOP` | I (infra/build/paths) | `omp:packages/coding-agent/test/bash-executor.test.ts:1` |
| `PI_PACKAGE_ALTERNATION` | I (infra/build/paths) | `omp:packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts:1` |
| `PI_PACKAGE_DIR` | I (infra/build/paths) | `omp:packages/coding-agent/src/cli/help-extra.ts:1`, `omp:packages/coding-agent/src/config.ts:1`, `omp:packages/coding-agent/src/eval/js/error-text.ts:1` |
| `PI_PACKAGE_NAMES` | I (infra/build/paths) | `omp:packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts:1` |
| `PI_PANEL_RELAY_URL` | I (infra/build/paths) | `omp:packages/coding-agent/src/tools/browser.ts:1`, `omp:packages/coding-agent/src/tools/browser/relay/native-host.ts:1`, `omp:packages/coding-agent/test/tools/browser-relay-native-host.test.ts:1` |
| `PI_PATH_KEY` | I (infra/build/paths) | `omp:packages/coding-agent/test/bash-executor.test.ts:1` |
| `PI_PERPLEXITY_API_MODEL` | H (harness/comportamento) | `omp:packages/coding-agent/src/web/search/providers/perplexity.ts:1`, `omp:packages/coding-agent/test/web/search/perplexity.test.ts:1` |
| `PI_PERPLEXITY_MODEL` | H (harness/comportamento) | `omp:packages/coding-agent/src/web/search/providers/perplexity.ts:1`, `omp:packages/coding-agent/test/web/search/perplexity.test.ts:1` |
| `PI_PERPLEXITY_RESPONSES` | I (infra/build/paths) | `omp:packages/coding-agent/src/web/search/providers/perplexity-auth.ts:1`, `omp:packages/coding-agent/test/web/search/perplexity.test.ts:1` |
| `PI_PF_ORDER` | I (infra/build/paths) | `omp:packages/coding-agent/test/direnv.test.ts:1` |
| `PI_PF_UNSET_A` | I (infra/build/paths) | `omp:packages/coding-agent/test/direnv.test.ts:1` |
| `PI_PF_UNSET_B` | I (infra/build/paths) | `omp:packages/coding-agent/test/direnv.test.ts:1` |
| `PI_PLAIN` | I (infra/build/paths) | `omp:packages/coding-agent/test/bash-executor.test.ts:1` |
| `PI_PLAN_MODEL` | H (harness/comportamento) | `omp:packages/coding-agent/src/cli/help-extra.ts:1`, `omp:packages/coding-agent/src/commands/launch-help.ts:1`, `omp:packages/coding-agent/src/main.ts:1` |
| `PI_PROBE` | I (infra/build/paths) | `omp:crates/shell/src/suites/extras.rs:1` |
| `PI_PROBE_PLAIN` | I (infra/build/paths) | `omp:crates/shell/src/suites/extras.rs:1` |
| `PI_PROFILE` | I (infra/build/paths) | `omp:packages/agent/test/otel-content-capture-env.test.ts:1`, `omp:packages/coding-agent/src/cli.ts:1`, `omp:packages/coding-agent/src/modes/controllers/command-controller.ts:1` |
| `PI_PROXY` | I (infra/build/paths) | `omp:packages/ai/src/providers/cowork-fetch.ts:1`, `omp:packages/ai/src/utils/proxy.ts:1`, `omp:packages/ai/test/cowork-fetch-proxy.test.ts:1` |
| `PI_PROXY_` | I (infra/build/paths) | `omp:packages/ai/src/utils/proxy.ts:1`, `omp:packages/ai/test/proxy.test.ts:1` |
| `PI_PROXY_ANTHROPIC` | I (infra/build/paths) | `omp:packages/ai/src/utils/proxy.ts:1`, `omp:packages/coding-agent/test/agent-session-anthropic-native-compaction.test.ts:1` |
| `PI_PROXY_CODEX_PROXY_TEST` | T (teste/bench/debug) | `omp:packages/ai/test/openai-codex-stream.test.ts:1` |
| `PI_PROXY_COMPACTION_PROXY_TEST` | T (teste/bench/debug) | `omp:packages/agent/test/remote-compaction.test.ts:1` |
| `PI_PROXY_CURSOR` | I (infra/build/paths) | `omp:packages/ai/test/fixtures/cursor-proxy-env.ts:1` |
| `PI_PROXY_GITHUB_COPILOT` | I (infra/build/paths) | `omp:packages/ai/src/utils/proxy.ts:1`, `omp:packages/ai/test/proxy.test.ts:1` |
| `PI_PROXY_GLOBAL_PREC` | I (infra/build/paths) | `omp:packages/ai/test/proxy.test.ts:1` |
| `PI_PROXY_LIVE` | I (infra/build/paths) | `omp:packages/coding-agent/src/live/transport.ts:1` |
| `PI_PROXY_NO_PROXY_TEST` | T (teste/bench/debug) | `omp:packages/ai/test/proxy.test.ts:1` |
| `PI_PROXY_PREC_PROV` | I (infra/build/paths) | `omp:packages/ai/test/proxy.test.ts:1` |
| `PI_PROXY_SAKANA` | I (infra/build/paths) | `omp:packages/ai/test/proxy.test.ts:1` |
| `PI_PROXY_WRAP_BADURL` | I (infra/build/paths) | `omp:packages/ai/test/proxy.test.ts:1` |
| `PI_PROXY_WRAP_BYPASS` | I (infra/build/paths) | `omp:packages/ai/test/proxy.test.ts:1` |
| `PI_PROXY_WRAP_INJECT` | I (infra/build/paths) | `omp:packages/ai/test/proxy.test.ts:1` |
| `PI_PY` | H (harness/comportamento) | `omp:packages/coding-agent/src/eval/settings.ts:1`, `omp:packages/coding-agent/src/eval/startup-warning.ts:1`, `omp:packages/coding-agent/src/tools/eval-backends.ts:1` |
| `PI_PYTHON_INTEGRATION` | H (harness/comportamento) | `omp:packages/coding-agent/test/core/eval-workflow-helpers.integration.test.ts:1`, `omp:packages/coding-agent/test/core/python-runner.integration.test.ts:1`, `omp:packages/coding-agent/test/eval/out-replies.test.ts:1` |
| `PI_PYTHON_IPC_TRACE` | T (teste/bench/debug) | `omp:packages/coding-agent/src/eval/py/kernel.ts:1` |
| `PI_PYTHON_SKIP_CHECK` | H (harness/comportamento) | `omp:packages/coding-agent/src/eval/py/kernel.ts:1`, `omp:packages/coding-agent/test/autolearn-learn-local.test.ts:1`, `omp:packages/coding-agent/test/core/python-executor-per-call.test.ts:1` |
| `PI_REQUEST_COMPRESSION` | I (infra/build/paths) | `omp:packages/ai/src/utils/request-compression.ts:1`, `omp:packages/ai/test/openai-codex-zstd.test.ts:1` |
| `PI_REQ_DEBUG` | T (teste/bench/debug) | `omp:packages/ai/src/utils/request-debug.ts:1`, `omp:packages/ai/src/utils/transport-fetch.ts:1`, `omp:packages/ai/test/request-debug.test.ts:1` |
| `PI_ROOT` | I (infra/build/paths) | `omp:python/robomp/entrypoint.sh:1` |
| `PI_RPC_EMIT_TITLE` | I (infra/build/paths) | `omp:packages/coding-agent/src/modes/rpc/rpc-mode.ts:1` |
| `PI_SAY_OUTPUT` | I (infra/build/paths) | `omp:crates/builtins/src/say/system.rs:1` |
| `PI_SAY_RATE` | I (infra/build/paths) | `omp:crates/builtins/src/say/system.rs:1` |
| `PI_SAY_VOICE` | I (infra/build/paths) | `omp:crates/builtins/src/say/system.rs:1` |
| `PI_SCOPED` | I (infra/build/paths) | `omp:crates/shell/src/shell/tests/env_cwd.rs:1` |
| `PI_SCOPE_ALIASES` | I (infra/build/paths) | `omp:packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts:1` |
| `PI_SCOPE_ALTERNATION` | I (infra/build/paths) | `omp:packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts:1` |
| `PI_SESSION_` | I (infra/build/paths) | `omp:packages/coding-agent/test/bash-acp-terminal.test.ts:1` |
| `PI_SESSION_FILE` | I (infra/build/paths) | `omp:packages/coding-agent/src/eval/executor-base.ts:1`, `omp:packages/coding-agent/src/eval/py/executor.ts:1`, `omp:packages/coding-agent/src/eval/py/prelude.py:1` |
| `PI_SESSION_ID` | I (infra/build/paths) | `omp:packages/coding-agent/src/exec/bash-executor.ts:1`, `omp:packages/coding-agent/src/tools/session-id.ts:1`, `omp:packages/coding-agent/test/agent-session-bash-session-ownership.test.ts:1` |
| `PI_SESSION_ORIGIN` | I (infra/build/paths) | `omp:packages/coding-agent/src/session/session-manager.ts:1`, `omp:packages/coding-agent/src/tools/browser/relay/native-host.ts:1`, `omp:packages/coding-agent/test/session/picker-title-index.test.ts:1` |
| `PI_SHELL_ALLOC_STATS` | I (infra/build/paths) | `omp:crates/shell/src/bin/obash/alloc_stats.rs:1` |
| `PI_SHELL_FAULT` | I (infra/build/paths) | `omp:crates/shell/src/bin/obash/fault.rs:1`, `omp:crates/shell/tests/obash_fault_modes.rs:1`, `omp:crates/shell/tests/obash_support/mod.rs:1` |
| `PI_SHELL_FAULT_DEPTH` | I (infra/build/paths) | `omp:crates/shell/src/bin/obash/fault.rs:1`, `omp:crates/shell/tests/obash_support/mod.rs:1` |
| `PI_SHELL_FAULT_LOST` | I (infra/build/paths) | `omp:crates/shell/src/bin/obash/fault.rs:1`, `omp:crates/shell/src/bin/obash/main.rs:1`, `omp:crates/shell/tests/obash_fault_modes.rs:1` |
| `PI_SHELL_FAULT_MODE` | I (infra/build/paths) | `omp:crates/shell/src/bin/obash/fault.rs:1`, `omp:crates/shell/tests/obash_fault_modes.rs:1`, `omp:crates/shell/tests/obash_support/mod.rs:1` |
| `PI_SHELL_FAULT_STATS` | I (infra/build/paths) | `omp:crates/shell/src/bin/obash/fault.rs:1`, `omp:crates/shell/tests/obash_fault_modes.rs:1`, `omp:crates/shell/tests/obash_support/mod.rs:1` |
| `PI_SHELL_FS` | I (infra/build/paths) | `omp:crates/shell/src/bin/obash/main.rs:1`, `omp:crates/shell/src/process/host.rs:1`, `omp:crates/shell/src/process/pending_fs.rs:1` |
| `PI_SHELL_LOST_LOG` | I (infra/build/paths) | `omp:crates/shell/src/bin/obash/fault.rs:1`, `omp:crates/shell/tests/obash_fault_modes.rs:1`, `omp:crates/shell/tests/obash_support/mod.rs:1` |
| `PI_SHELL_PERSIST` | I (infra/build/paths) | `omp:packages/coding-agent/test/tools.test.ts:1` |
| `PI_SHELL_PREFIX` | I (infra/build/paths) | `omp:packages/utils/src/procmgr.ts:1` |
| `PI_SHELL_PROCESS_TEST_SLEEP_MS` | T (teste/bench/debug) | `omp:crates/shell/src/shell/tests/mod.rs:1` |
| `PI_SHELL_TEST_DELETED_CWD` | T (teste/bench/debug) | `omp:crates/shell/src/shell/tests/env_cwd.rs:1` |
| `PI_SHELL_TEST_DESCRIPTOR_LIMIT_CHILD` | T (teste/bench/debug) | `omp:crates/shell/tests/descriptor_limit.rs:1` |
| `PI_SHELL_TEST_DRAINED_STOP_REPORTS` | T (teste/bench/debug) | `omp:crates/shell/src/shell/tests/process_control.rs:1` |
| `PI_SHELL_TEST_KILL_JOBSPEC_PIPELINE` | T (teste/bench/debug) | `omp:crates/shell/src/shell/tests/process_control.rs:1` |
| `PI_SHELL_TEST_KILL_OWN_GROUP` | T (teste/bench/debug) | `omp:crates/shell/src/shell/tests/process_control.rs:1` |
| `PI_SHELL_TEST_KILL_OWN_PID` | T (teste/bench/debug) | `omp:crates/shell/src/shell/tests/process_control.rs:1` |
| `PI_SHELL_TEST_PKILL_OWN_PID` | T (teste/bench/debug) | `omp:crates/shell/src/shell/tests/process_control.rs:1` |
| `PI_SHELL_TEST_STOPPED_BACKGROUND_JOB` | T (teste/bench/debug) | `omp:crates/shell/src/shell/tests/process_control.rs:1` |
| `PI_SHELL_TEST_STOPPED_INTERACTIVE_JOB` | T (teste/bench/debug) | `omp:crates/shell/src/shell/tests/process_control.rs:1` |
| `PI_SHELL_TEST_STOPPED_LATER_STAGE` | T (teste/bench/debug) | `omp:crates/shell/src/shell/tests/process_control.rs:1` |
| `PI_SHELL_TEST_STOP_BEFORE_WAIT` | T (teste/bench/debug) | `omp:crates/shell/src/shell/tests/process_control.rs:1` |
| `PI_SHELL_UMASK_PROBE_CHILD` | I (infra/build/paths) | `omp:crates/shell/src/sys/spawn/unix/tests.rs:1` |
| `PI_SH_OK` | I (infra/build/paths) | `omp:packages/coding-agent/src/ssh/connection-manager.ts:1` |
| `PI_SLOW_MODEL` | H (harness/comportamento) | `omp:packages/coding-agent/src/cli/help-extra.ts:1`, `omp:packages/coding-agent/src/commands/launch-help.ts:1`, `omp:packages/coding-agent/src/main.ts:1` |
| `PI_SMART_GIT` | I (infra/build/paths) | `omp:crates/shell/src/git/guard.rs:1`, `omp:crates/shell/src/git/mod.rs:1`, `omp:crates/shell/src/session.rs:1` |
| `PI_SMOLLM_DEVICE` | T (teste/bench/debug) | `omp:crates/predict/src/smollm/mod.rs:1` |
| `PI_SMOL_MODEL` | H (harness/comportamento) | `omp:packages/coding-agent/src/cli/help-extra.ts:1`, `omp:packages/coding-agent/src/commands/launch-help.ts:1`, `omp:packages/coding-agent/src/main.ts:1` |
| `PI_SNAPSHOT_TEST` | T (teste/bench/debug) | `omp:packages/coding-agent/test/bash-executor.test.ts:1` |
| `PI_SPINNER_INTERVAL` | I (infra/build/paths) | `omp:packages/coding-agent/src/commands/launch-help.ts:1`, `omp:packages/coding-agent/src/main.ts:1`, `omp:packages/coding-agent/src/modes/settings.ts:1` |
| `PI_SPOTLIGHT_EXPERIMENT` | I (infra/build/paths) | `omp:packages/coding-agent/src/spotlight/settings.ts:1`, `omp:packages/stats/src/client/routes/SpotlightRoute.tsx:1` |
| `PI_SPOTLIGHT_HOLDOUT` | I (infra/build/paths) | `omp:packages/coding-agent/src/spotlight/settings.ts:1` |
| `PI_SPOTLIGHT_SCORE_FREE` | I (infra/build/paths) | `omp:packages/coding-agent/src/spotlight/settings.ts:1` |
| `PI_SPOTLIGHT_TOOLS` | I (infra/build/paths) | `omp:packages/coding-agent/src/spotlight/settings.ts:1` |
| `PI_STATE_VAR` | I (infra/build/paths) | `omp:packages/coding-agent/test/bash-session-state.test.ts:1` |
| `PI_STREAM_FIRST_EVENT_TIMEOUT_MS` | I (infra/build/paths) | `omp:packages/ai/src/providers/register-builtins.ts:1`, `omp:packages/ai/src/types.ts:1`, `omp:packages/ai/src/utils/idle-iterator.ts:1` |
| `PI_STREAM_IDLE_TIMEOUT_MS` | I (infra/build/paths) | `omp:packages/ai/src/providers/register-builtins.ts:1`, `omp:packages/ai/src/types.ts:1`, `omp:packages/ai/src/utils/idle-iterator.ts:1` |
| `PI_STRICT_EDIT_MODE` | H (harness/comportamento) | `omp:packages/coding-agent/scripts/bench-guard.ts:1`, `omp:packages/coding-agent/src/utils/edit-mode.ts:1`, `omp:packages/coding-agent/test/edit-mode.test.ts:1` |
| `PI_SUBPATH_REMAPS` | I (infra/build/paths) | `omp:packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts:1`, `omp:packages/coding-agent/test/extensibility/legacy-pi-bundled-subpath-overrides.test.ts:1` |
| `PI_TASK_MAX_OUTPUT_BYTES` | I (infra/build/paths) | `omp:packages/coding-agent/src/task/types.ts:1` |
| `PI_TASK_MAX_OUTPUT_LINES` | I (infra/build/paths) | `omp:packages/coding-agent/src/task/types.ts:1` |
| `PI_TERMINAL_OWNER_PID` | I (infra/build/paths) | `omp:packages/coding-agent/src/tools/browser/terminal-owner.ts:1`, `omp:packages/coding-agent/test/tools/browser-open-lease.test.ts:1`, `omp:packages/coding-agent/test/tools/browser-relay-kind.test.ts:1` |
| `PI_TEST_ENV` | T (teste/bench/debug) | `omp:packages/coding-agent/test/bash-executor.test.ts:1` |
| `PI_TEST_NO_NATIVES` | T (teste/bench/debug) | `omp:packages/coding-agent/src/subprocess/parent-watchdog-worker.ts:1`, `omp:packages/coding-agent/test/worker-selector.test.ts:1` |
| `PI_TEST_PERSISTENT_MARK` | T (teste/bench/debug) | `omp:packages/coding-agent/test/extension-session-shell-env.test.ts:1` |
| `PI_TEST_RUNTIME` | T (teste/bench/debug) | `omp:packages/coding-agent/test/cli-resume-model-fallback.test.ts:1`, `omp:packages/coding-agent/test/cost-gate-skill-description.test.ts:1`, `omp:packages/coding-agent/test/extensibility/legacy-pi-bundled-virtual.test.ts:1` |
| `PI_TEST_SESSION_OWNERS_DIR` | T (teste/bench/debug) | `omp:packages/coding-agent/src/session/session-storage.ts:1` |
| `PI_TEST_SESSION_SCOPED_ENV` | T (teste/bench/debug) | `omp:packages/coding-agent/test/extension-session-shell-env.test.ts:1` |
| `PI_TEST_VAR` | T (teste/bench/debug) | `omp:packages/coding-agent/test/tools.test.ts:1` |
| `PI_TIMING` | I (infra/build/paths) | `omp:packages/coding-agent/scripts/bench-guard.ts:1`, `omp:packages/coding-agent/src/cli.ts:1`, `omp:packages/coding-agent/src/main.ts:1` |
| `PI_TINY_` | I (infra/build/paths) | `omp:packages/coding-agent/src/cli/tiny-models-cli.ts:1` |
| `PI_TINY_DEVICE` | T (teste/bench/debug) | `omp:packages/coding-agent/src/daemon/modules/speech-frames.ts:1`, `omp:packages/coding-agent/src/session/settings.ts:1`, `omp:packages/coding-agent/src/subprocess/worker-runtime.ts:1` |
| `PI_TINY_DTYPE` | I (infra/build/paths) | `omp:packages/coding-agent/src/daemon/modules/speech-frames.ts:1`, `omp:packages/coding-agent/src/session/settings.ts:1`, `omp:packages/coding-agent/src/stt/models.ts:1` |
| `PI_TOOL_BRIDGE_SESSION` | I (infra/build/paths) | `omp:packages/coding-agent/src/eval/executor-base.ts:1`, `omp:packages/coding-agent/src/eval/py/prelude.py:1`, `omp:packages/coding-agent/src/eval/py/runner.py:1` |
| `PI_TOOL_BRIDGE_TOKEN` | I (infra/build/paths) | `omp:packages/coding-agent/src/eval/executor-base.ts:1`, `omp:packages/coding-agent/src/eval/py/prelude.py:1`, `omp:packages/coding-agent/src/eval/py/runner.py:1` |
| `PI_TOOL_BRIDGE_URL` | I (infra/build/paths) | `omp:packages/coding-agent/src/eval/executor-base.ts:1`, `omp:packages/coding-agent/src/eval/py/prelude.py:1`, `omp:packages/coding-agent/src/eval/py/runner.py:1` |
| `PI_TOOL_CALL_ID` | I (infra/build/paths) | `omp:packages/coding-agent/src/tools/bash.ts:1`, `omp:packages/coding-agent/test/bash-acp-terminal.test.ts:1`, `omp:packages/coding-agent/test/bash-failure-result.test.ts:1` |
| `PI_TRANSFER_OK` | I (infra/build/paths) | `omp:packages/coding-agent/src/ssh/connection-manager.ts:1`, `omp:packages/coding-agent/test/ssh/connection-manager-args.test.ts:1` |
| `PI_TUI_MIGRATION_DOC` | I (infra/build/paths) | `omp:packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts:1`, `omp:packages/coding-agent/test/extensibility/legacy-pi-upstream-root-bridges-alias.test.ts:1` |
| `PI_TUI_NATIVE` | I (infra/build/paths) | `omp:packages/coding-agent/test/fatal-stderr-pty.test.ts:1`, `omp:packages/coding-agent/test/main-auto-resume-model-restore.test.ts:1`, `omp:packages/coding-agent/test/startup-composer.test.ts:1` |
| `PI_TUI_RAW_BACKSPACE_IS_CTRL` | I (infra/build/paths) | `omp:packages/tui/src/driver/caps/env.ts:1`, `omp:packages/tui/test/driver-io/caps.test.ts:1` |
| `PI_TUI_RESIZE_IN_PLACE` | I (infra/build/paths) | `omp:packages/tui/src/driver/index.ts:1` |
| `PI_TUI_RESIZE_SCROLLBACK` | I (infra/build/paths) | `omp:packages/tui/src/driver/index.ts:1` |
| `PI_TUI_SPECIFIER` | I (infra/build/paths) | `omp:packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts:1` |
| `PI_TUI_SYNC_OUTPUT` | I (infra/build/paths) | `omp:packages/tui/src/driver/caps/env.ts:1`, `omp:packages/tui/test/driver-io/caps.test.ts:1` |
| `PI_TUI_WRITE_LOG` | I (infra/build/paths) | `omp:packages/tui/src/driver/index.ts:1`, `omp:packages/tui/src/driver/output/sink.ts:1`, `omp:packages/tui/test/driver-output/sink.test.ts:1` |
| `PI_UI_DEVIATION_DUMP` | T (teste/bench/debug) | `omp:packages/coding-agent/scripts/ui-deviation-report.ts:1`, `omp:packages/coding-agent/test/ui/deviations.ts:1` |
| `PI_UI_SCREEN_RUNNER` | I (infra/build/paths) | `omp:packages/coding-agent/test/ui/tools/screens.ts:1`, `omp:packages/coding-agent/test/ui/transcript/exec-run.test.ts:1`, `omp:packages/coding-agent/test/ui/transcript/read-group.test.tsx:1` |
| `PI_UPSTREAM_IMPORT_PATH` | I (infra/build/paths) | `omp:packages/metaharness/src/runner.ts:1` |
| `PI_UPSTREAM_SYSTEM_PROMPT` | I (infra/build/paths) | `omp:packages/metaharness/src/runner.ts:1` |
| `PI_UPSTREAM_VERSION` | I (infra/build/paths) | `omp:packages/metaharness/src/runner.ts:1` |
| `PI_VCS_TEST_ENV_PROBE_REPO` | T (teste/bench/debug) | `omp:crates/vcs/src/git/cli.rs:1` |
| `PI_WALK_WORKERS` | I (infra/build/paths) | `omp:crates/xfs/src/walk/mod.rs:1`, `omp:packages/coding-agent/src/cli/grep-cli.ts:1` |
| `PI_X` | I (infra/build/paths) | `omp:packages/coding-agent/test/spotlight/shape.test.ts:1` |
| `PI_ZSH_SRC` | I (infra/build/paths) | `omp:crates/shell/tests/zsh_zcompile.rs:1` |
