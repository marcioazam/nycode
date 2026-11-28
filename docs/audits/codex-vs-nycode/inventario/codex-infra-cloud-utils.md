# Inventário: codex-infra-cloud-utils

Crates de cloud, CLI utils, OTEL, diagnóstico, voz, message-board e utilitários. Total nesta partição: **828** arquivos.

| Arquivo (Codex) | Crate | Categoria | LOC | Equivalente no nycode |
|---|---|---|---:|---|
| `codex-rs/BUILD.bazel` | `codex-rs/raiz` | codigo | 109 | `packages/coding-agent/` |
| `codex-rs/agent-graph-store/BUILD.bazel` | `codex-rs/agent-graph-store` | codigo | 6 | `sem equivalente` |
| `codex-rs/agent-graph-store/src/error.rs` | `codex-rs/agent-graph-store` | codigo | 20 | `sem equivalente` |
| `codex-rs/agent-graph-store/src/lib.rs` | `codex-rs/agent-graph-store` | codigo | 13 | `sem equivalente` |
| `codex-rs/agent-graph-store/src/local.rs` | `codex-rs/agent-graph-store` | codigo | 344 | `sem equivalente` |
| `codex-rs/agent-graph-store/src/store.rs` | `codex-rs/agent-graph-store` | codigo | 62 | `sem equivalente` |
| `codex-rs/agent-graph-store/src/types.rs` | `codex-rs/agent-graph-store` | codigo | 42 | `sem equivalente` |
| `codex-rs/agent-identity/BUILD.bazel` | `codex-rs/agent-identity` | codigo | 6 | `sem equivalente` |
| `codex-rs/agent-identity/src/lib.rs` | `codex-rs/agent-identity` | codigo | 1022 | `sem equivalente` |
| `codex-rs/agent-message-board-client/BUILD.bazel` | `codex-rs/agent-message-board-client` | codigo | 6 | `sem equivalente` |
| `codex-rs/agent-message-board-client/src/client.rs` | `codex-rs/agent-message-board-client` | codigo | 437 | `sem equivalente` |
| `codex-rs/agent-message-board-client/src/lib.rs` | `codex-rs/agent-message-board-client` | codigo | 12 | `sem equivalente` |
| `codex-rs/agent-message-board-client/src/notifications.rs` | `codex-rs/agent-message-board-client` | codigo | 122 | `sem equivalente` |
| `codex-rs/agent-message-board-client/src/protocol.rs` | `codex-rs/agent-message-board-client` | codigo | 107 | `sem equivalente` |
| `codex-rs/agent-message-board-client/tests/remote_board.rs` | `codex-rs/agent-message-board-client` | teste | 304 | `sem equivalente` |
| `codex-rs/agent-message-board-host/BUILD.bazel` | `codex-rs/agent-message-board-host` | codigo | 6 | `sem equivalente` |
| `codex-rs/agent-message-board-host/src/lib.rs` | `codex-rs/agent-message-board-host` | codigo | 299 | `sem equivalente` |
| `codex-rs/analytics/BUILD.bazel` | `codex-rs/analytics` | codigo | 6 | `packages/telemetry/` |
| `codex-rs/analytics/src/accepted_lines.rs` | `codex-rs/analytics` | codigo | 187 | `packages/telemetry/` |
| `codex-rs/analytics/src/analytics_capture.rs` | `codex-rs/analytics` | codigo | 34 | `packages/telemetry/` |
| `codex-rs/analytics/src/client.rs` | `codex-rs/analytics` | codigo | 1283 | `packages/telemetry/` |
| `codex-rs/analytics/src/client_product_tests.rs` | `codex-rs/analytics` | teste | 359 | `packages/telemetry/` |
| `codex-rs/analytics/src/client_runtime_auth_tests.rs` | `codex-rs/analytics` | teste | 300 | `packages/telemetry/` |
| `codex-rs/analytics/src/client_tests.rs` | `codex-rs/analytics` | teste | 1284 | `packages/telemetry/` |
| `codex-rs/analytics/src/events.rs` | `codex-rs/analytics` | codigo | 1632 | `packages/telemetry/` |
| `codex-rs/analytics/src/facts.rs` | `codex-rs/analytics` | codigo | 780 | `packages/telemetry/` |
| `codex-rs/analytics/src/guardian_v2.rs` | `codex-rs/analytics` | codigo | 52 | `packages/telemetry/` |
| `codex-rs/analytics/src/lib.rs` | `codex-rs/analytics` | codigo | 122 | `packages/telemetry/` |
| `codex-rs/analytics/src/product_attribution.rs` | `codex-rs/analytics` | codigo | 110 | `packages/telemetry/` |
| `codex-rs/analytics/src/reducer.rs` | `codex-rs/analytics` | codigo | 4442 | `packages/telemetry/` |
| `codex-rs/analytics/src/tests/mod.rs` | `codex-rs/analytics` | teste | 2 | `packages/telemetry/` |
| `codex-rs/analytics/src/tests/suite/approvals_tests.rs` | `codex-rs/analytics` | teste | 1097 | `packages/telemetry/` |
| `codex-rs/analytics/src/tests/suite/apps_tests.rs` | `codex-rs/analytics` | teste | 181 | `packages/telemetry/` |
| `codex-rs/analytics/src/tests/suite/hooks_tests.rs` | `codex-rs/analytics` | teste | 167 | `packages/telemetry/` |
| `codex-rs/analytics/src/tests/suite/mod.rs` | `codex-rs/analytics` | teste | 27 | `packages/telemetry/` |
| `codex-rs/analytics/src/tests/suite/onboarding_tests.rs` | `codex-rs/analytics` | teste | 131 | `packages/telemetry/` |
| `codex-rs/analytics/src/tests/suite/plugins_tests.rs` | `codex-rs/analytics` | teste | 484 | `packages/telemetry/` |
| `codex-rs/analytics/src/tests/suite/reducer_ordering_tests.rs` | `codex-rs/analytics` | teste | 806 | `packages/telemetry/` |
| `codex-rs/analytics/src/tests/suite/skills_tests.rs` | `codex-rs/analytics` | teste | 204 | `packages/telemetry/` |
| `codex-rs/analytics/src/tests/suite/threads_tests.rs` | `codex-rs/analytics` | teste | 914 | `packages/telemetry/` |
| `codex-rs/analytics/src/tests/suite/tools_tests.rs` | `codex-rs/analytics` | teste | 1042 | `packages/telemetry/` |
| `codex-rs/analytics/src/tests/suite/turns/accepted_lines_tests.rs` | `codex-rs/analytics` | teste | 322 | `packages/telemetry/` |
| `codex-rs/analytics/src/tests/suite/turns/compaction_tests.rs` | `codex-rs/analytics` | teste | 381 | `packages/telemetry/` |
| `codex-rs/analytics/src/tests/suite/turns/events_tests.rs` | `codex-rs/analytics` | teste | 1167 | `packages/telemetry/` |
| `codex-rs/analytics/src/tests/suite/turns/requests_tests.rs` | `codex-rs/analytics` | teste | 728 | `packages/telemetry/` |
| `codex-rs/analytics/src/tests/suite/turns_tests.rs` | `codex-rs/analytics` | teste | 8 | `packages/telemetry/` |
| `codex-rs/analytics/src/tests/support.rs` | `codex-rs/analytics` | teste | 710 | `packages/telemetry/` |
| `codex-rs/analytics/src/thread_hint.rs` | `codex-rs/analytics` | codigo | 38 | `packages/telemetry/` |
| `codex-rs/analytics/src/turn_critical_path.rs` | `codex-rs/analytics` | codigo | 103 | `packages/telemetry/` |
| `codex-rs/ansi-escape/BUILD.bazel` | `codex-rs/ansi-escape` | codigo | 6 | `packages/tui/src/utils.ts` |
| `codex-rs/ansi-escape/src/ansi_escape_tests.rs` | `codex-rs/ansi-escape` | teste | 76 | `packages/tui/src/utils.ts` |
| `codex-rs/ansi-escape/src/lib.rs` | `codex-rs/ansi-escape` | codigo | 66 | `packages/tui/src/utils.ts` |
| `codex-rs/arg0/BUILD.bazel` | `codex-rs/arg0` | codigo | 6 | `sem equivalente` |
| `codex-rs/arg0/src/lib.rs` | `codex-rs/arg0` | codigo | 847 | `sem equivalente` |
| `codex-rs/async-utils/BUILD.bazel` | `codex-rs/async-utils` | codigo | 6 | `packages/agent/src/` |
| `codex-rs/async-utils/src/backoff.rs` | `codex-rs/async-utils` | codigo | 17 | `packages/agent/src/` |
| `codex-rs/async-utils/src/lib.rs` | `codex-rs/async-utils` | codigo | 93 | `packages/agent/src/` |
| `codex-rs/attachment-store/BUILD.bazel` | `codex-rs/attachment-store` | codigo | 6 | `sem equivalente` |
| `codex-rs/attachment-store/src/lib.rs` | `codex-rs/attachment-store` | codigo | 298 | `sem equivalente` |
| `codex-rs/attachment-store/src/lib_tests.rs` | `codex-rs/attachment-store` | teste | 119 | `sem equivalente` |
| `codex-rs/build-info/BUILD.bazel` | `codex-rs/build-info` | codigo | 6 | `packages/coding-agent/src/config.ts` |
| `codex-rs/build-info/build.rs` | `codex-rs/build-info` | codigo | 8 | `packages/coding-agent/src/config.ts` |
| `codex-rs/build-info/src/build_info_tests.rs` | `codex-rs/build-info` | teste | 197 | `packages/coding-agent/src/config.ts` |
| `codex-rs/build-info/src/lib.rs` | `codex-rs/build-info` | codigo | 155 | `packages/coding-agent/src/config.ts` |
| `codex-rs/cloud-client/BUILD.bazel` | `codex-rs/cloud-client` | codigo | 6 | `sem equivalente` |
| `codex-rs/cloud-client/examples/attach.rs` | `codex-rs/cloud-client` | codigo | 102 | `sem equivalente` |
| `codex-rs/cloud-client/src/activation.rs` | `codex-rs/cloud-client` | codigo | 536 | `sem equivalente` |
| `codex-rs/cloud-client/src/activation_tests.rs` | `codex-rs/cloud-client` | teste | 52 | `sem equivalente` |
| `codex-rs/cloud-client/src/activation_wire.rs` | `codex-rs/cloud-client` | codigo | 373 | `sem equivalente` |
| `codex-rs/cloud-client/src/client_tests.rs` | `codex-rs/cloud-client` | teste | 853 | `sem equivalente` |
| `codex-rs/cloud-client/src/discovery.rs` | `codex-rs/cloud-client` | codigo | 227 | `sem equivalente` |
| `codex-rs/cloud-client/src/discovery_tests.rs` | `codex-rs/cloud-client` | teste | 175 | `sem equivalente` |
| `codex-rs/cloud-client/src/environments.rs` | `codex-rs/cloud-client` | codigo | 94 | `sem equivalente` |
| `codex-rs/cloud-client/src/history.rs` | `codex-rs/cloud-client` | codigo | 198 | `sem equivalente` |
| `codex-rs/cloud-client/src/history_tests.rs` | `codex-rs/cloud-client` | teste | 246 | `sem equivalente` |
| `codex-rs/cloud-client/src/history_wire.rs` | `codex-rs/cloud-client` | codigo | 57 | `sem equivalente` |
| `codex-rs/cloud-client/src/item_tests.rs` | `codex-rs/cloud-client` | teste | 402 | `sem equivalente` |
| `codex-rs/cloud-client/src/item_wire.rs` | `codex-rs/cloud-client` | codigo | 218 | `sem equivalente` |
| `codex-rs/cloud-client/src/items.rs` | `codex-rs/cloud-client` | codigo | 333 | `sem equivalente` |
| `codex-rs/cloud-client/src/lib.rs` | `codex-rs/cloud-client` | codigo | 431 | `sem equivalente` |
| `codex-rs/cloud-client/src/prewarm.rs` | `codex-rs/cloud-client` | codigo | 208 | `sem equivalente` |
| `codex-rs/cloud-client/src/transcript.rs` | `codex-rs/cloud-client` | codigo | 284 | `sem equivalente` |
| `codex-rs/cloud-client/src/transcript_tests.rs` | `codex-rs/cloud-client` | teste | 303 | `sem equivalente` |
| `codex-rs/cloud-client/src/transcript_wire.rs` | `codex-rs/cloud-client` | codigo | 161 | `sem equivalente` |
| `codex-rs/cloud-client/src/turns.rs` | `codex-rs/cloud-client` | codigo | 358 | `sem equivalente` |
| `codex-rs/cloud-client/src/turns_tests.rs` | `codex-rs/cloud-client` | teste | 621 | `sem equivalente` |
| `codex-rs/cloud-client/src/turns_wire.rs` | `codex-rs/cloud-client` | codigo | 124 | `sem equivalente` |
| `codex-rs/cloud-client/src/types.rs` | `codex-rs/cloud-client` | codigo | 114 | `sem equivalente` |
| `codex-rs/cloud-client/src/wire.rs` | `codex-rs/cloud-client` | codigo | 92 | `sem equivalente` |
| `codex-rs/cloud-config/BUILD.bazel` | `codex-rs/cloud-config` | codigo | 6 | `sem equivalente` |
| `codex-rs/cloud-config/src/backend.rs` | `codex-rs/cloud-config` | codigo | 166 | `sem equivalente` |
| `codex-rs/cloud-config/src/bundle_loader.rs` | `codex-rs/cloud-config` | codigo | 296 | `sem equivalente` |
| `codex-rs/cloud-config/src/cache.rs` | `codex-rs/cloud-config` | codigo | 292 | `sem equivalente` |
| `codex-rs/cloud-config/src/cache_tests.rs` | `codex-rs/cloud-config` | teste | 212 | `sem equivalente` |
| `codex-rs/cloud-config/src/chatgpt.rs` | `codex-rs/cloud-config` | codigo | 103 | `sem equivalente` |
| `codex-rs/cloud-config/src/config_server.rs` | `codex-rs/cloud-config` | codigo | 379 | `sem equivalente` |
| `codex-rs/cloud-config/src/config_server_tests.rs` | `codex-rs/cloud-config` | teste | 278 | `sem equivalente` |
| `codex-rs/cloud-config/src/config_source.rs` | `codex-rs/cloud-config` | codigo | 43 | `sem equivalente` |
| `codex-rs/cloud-config/src/discovery.rs` | `codex-rs/cloud-config` | codigo | 83 | `sem equivalente` |
| `codex-rs/cloud-config/src/discovery_tests.rs` | `codex-rs/cloud-config` | teste | 175 | `sem equivalente` |
| `codex-rs/cloud-config/src/lib.rs` | `codex-rs/cloud-config` | codigo | 28 | `sem equivalente` |
| `codex-rs/cloud-config/src/metrics.rs` | `codex-rs/cloud-config` | codigo | 95 | `sem equivalente` |
| `codex-rs/cloud-config/src/service.rs` | `codex-rs/cloud-config` | codigo | 521 | `sem equivalente` |
| `codex-rs/cloud-config/src/service_tests.rs` | `codex-rs/cloud-config` | teste | 1832 | `sem equivalente` |
| `codex-rs/cloud-config/src/validation.rs` | `codex-rs/cloud-config` | codigo | 42 | `sem equivalente` |
| `codex-rs/cloud-config/src/validation_tests.rs` | `codex-rs/cloud-config` | teste | 106 | `sem equivalente` |
| `codex-rs/cloud-tasks-client/BUILD.bazel` | `codex-rs/cloud-tasks-client` | codigo | 6 | `apps/p3/` |
| `codex-rs/cloud-tasks-client/src/api.rs` | `codex-rs/cloud-tasks-client` | codigo | 176 | `apps/p3/` |
| `codex-rs/cloud-tasks-client/src/http.rs` | `codex-rs/cloud-tasks-client` | codigo | 929 | `apps/p3/` |
| `codex-rs/cloud-tasks-client/src/lib.rs` | `codex-rs/cloud-tasks-client` | codigo | 20 | `apps/p3/` |
| `codex-rs/cloud-tasks-mock-client/BUILD.bazel` | `codex-rs/cloud-tasks-mock-client` | codigo | 6 | `apps/p3/` |
| `codex-rs/cloud-tasks-mock-client/src/lib.rs` | `codex-rs/cloud-tasks-mock-client` | codigo | 3 | `apps/p3/` |
| `codex-rs/cloud-tasks-mock-client/src/mock.rs` | `codex-rs/cloud-tasks-mock-client` | codigo | 267 | `apps/p3/` |
| `codex-rs/cloud-tasks/BUILD.bazel` | `codex-rs/cloud-tasks` | codigo | 7 | `apps/p3/` |
| `codex-rs/cloud-tasks/src/app.rs` | `codex-rs/cloud-tasks` | codigo | 534 | `apps/p3/` |
| `codex-rs/cloud-tasks/src/backend_auth_tests.rs` | `codex-rs/cloud-tasks` | teste | 277 | `apps/p3/` |
| `codex-rs/cloud-tasks/src/cli.rs` | `codex-rs/cloud-tasks` | codigo | 120 | `apps/p3/` |
| `codex-rs/cloud-tasks/src/env_detect.rs` | `codex-rs/cloud-tasks` | codigo | 446 | `apps/p3/` |
| `codex-rs/cloud-tasks/src/env_detect_runtime_auth_tests.rs` | `codex-rs/cloud-tasks` | teste | 130 | `apps/p3/` |
| `codex-rs/cloud-tasks/src/env_detect_tests.rs` | `codex-rs/cloud-tasks` | teste | 362 | `apps/p3/` |
| `codex-rs/cloud-tasks/src/lib.rs` | `codex-rs/cloud-tasks` | codigo | 2467 | `apps/p3/` |
| `codex-rs/cloud-tasks/src/new_task.rs` | `codex-rs/cloud-tasks` | codigo | 35 | `apps/p3/` |
| `codex-rs/cloud-tasks/src/scrollable_diff.rs` | `codex-rs/cloud-tasks` | codigo | 208 | `apps/p3/` |
| `codex-rs/cloud-tasks/src/scrollable_diff_tests.rs` | `codex-rs/cloud-tasks` | teste | 48 | `apps/p3/` |
| `codex-rs/cloud-tasks/src/ui.rs` | `codex-rs/cloud-tasks` | codigo | 1046 | `apps/p3/` |
| `codex-rs/cloud-tasks/src/util.rs` | `codex-rs/cloud-tasks` | codigo | 200 | `apps/p3/` |
| `codex-rs/cloud-tasks/tests/env_filter.rs` | `codex-rs/cloud-tasks` | teste | 39 | `apps/p3/` |
| `codex-rs/codex-experimental-api-macros/BUILD.bazel` | `codex-rs/codex-experimental-api-macros` | codigo | 7 | `sem equivalente` |
| `codex-rs/codex-experimental-api-macros/src/lib.rs` | `codex-rs/codex-experimental-api-macros` | codigo | 310 | `sem equivalente` |
| `codex-rs/codex-home/BUILD.bazel` | `codex-rs/codex-home` | codigo | 6 | `packages/coding-agent/src/config.ts` |
| `codex-rs/codex-home/src/instructions/mod.rs` | `codex-rs/codex-home` | codigo | 113 | `packages/coding-agent/src/config.ts` |
| `codex-rs/codex-home/src/instructions/tests.rs` | `codex-rs/codex-home` | codigo | 209 | `packages/coding-agent/src/config.ts` |
| `codex-rs/codex-home/src/lib.rs` | `codex-rs/codex-home` | codigo | 3 | `packages/coding-agent/src/config.ts` |
| `codex-rs/config-schema/BUILD.bazel` | `codex-rs/config-schema` | codigo | 6 | `packages/coding-agent/src/core/settings-schema.ts` |
| `codex-rs/config-schema/src/main.rs` | `codex-rs/config-schema` | codigo | 43 | `packages/coding-agent/src/core/settings-schema.ts` |
| `codex-rs/config/BUILD.bazel` | `codex-rs/config` | codigo | 7 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/examples/generate-proto.rs` | `codex-rs/config` | codigo | 19 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/scripts/generate-proto.sh` | `codex-rs/config` | codigo | 38 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/application_requirements.rs` | `codex-rs/config` | codigo | 73 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/application_requirements_tests.rs` | `codex-rs/config` | teste | 252 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/application_storage_requirements.rs` | `codex-rs/config` | codigo | 74 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/application_storage_requirements_tests.rs` | `codex-rs/config` | teste | 170 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/auth_policy.rs` | `codex-rs/config` | codigo | 61 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/bedrock_runtime_tests.rs` | `codex-rs/config` | teste | 48 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/browser_computer_use_requirements.rs` | `codex-rs/config` | codigo | 141 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/browser_computer_use_requirements_tests.rs` | `codex-rs/config` | teste | 136 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/browser_use.rs` | `codex-rs/config` | codigo | 26 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/browser_use_tests.rs` | `codex-rs/config` | teste | 52 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/cloud_config_bundle.rs` | `codex-rs/config` | codigo | 528 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/cloud_config_bundle_tests.rs` | `codex-rs/config` | teste | 330 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/cloud_config_layers.rs` | `codex-rs/config` | codigo | 151 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/cloud_config_layers_tests.rs` | `codex-rs/config` | teste | 226 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/codex_home_symlink.rs` | `codex-rs/config` | codigo | 28 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/computer_use.rs` | `codex-rs/config` | codigo | 39 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/computer_use_tests.rs` | `codex-rs/config` | teste | 54 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/config_layer_source.rs` | `codex-rs/config` | codigo | 161 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/config_requirements.rs` | `codex-rs/config` | codigo | 5742 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/config_server.rs` | `codex-rs/config` | codigo | 69 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/config_toml.rs` | `codex-rs/config` | codigo | 1219 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/constraint.rs` | `codex-rs/config` | codigo | 344 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/diagnostics.rs` | `codex-rs/config` | codigo | 504 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/filesystem_constraints.rs` | `codex-rs/config` | codigo | 62 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/fingerprint.rs` | `codex-rs/config` | codigo | 70 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/fingerprint_tests.rs` | `codex-rs/config` | teste | 26 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/guardian.rs` | `codex-rs/config` | codigo | 109 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/guardian_policy.rs` | `codex-rs/config` | codigo | 101 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/guardian_tests.rs` | `codex-rs/config` | teste | 151 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/hook_config.rs` | `codex-rs/config` | codigo | 77 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/hooks_tests.rs` | `codex-rs/config` | teste | 364 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/host_name.rs` | `codex-rs/config` | codigo | 119 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/in_app_browser_requirements.rs` | `codex-rs/config` | codigo | 14 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/in_app_browser_requirements_tests.rs` | `codex-rs/config` | teste | 144 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/key_aliases.rs` | `codex-rs/config` | codigo | 126 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/lib.rs` | `codex-rs/config` | codigo | 259 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/loader/application.rs` | `codex-rs/config` | codigo | 102 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/loader/layer_io.rs` | `codex-rs/config` | codigo | 234 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/loader/local.rs` | `codex-rs/config` | codigo | 445 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/loader/macos.rs` | `codex-rs/config` | codigo | 307 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/loader/macos_tests.rs` | `codex-rs/config` | teste | 139 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/loader/managed_project_discovery_tests.rs` | `codex-rs/config` | teste | 699 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/loader/managed_requirements.rs` | `codex-rs/config` | codigo | 256 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/loader/mod.rs` | `codex-rs/config` | codigo | 2243 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/loader/project_discovery.rs` | `codex-rs/config` | codigo | 42 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/loader/projectless_directory_tests.rs` | `codex-rs/config` | teste | 175 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/loader/tests.rs` | `codex-rs/config` | codigo | 1513 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/loader/windows.rs` | `codex-rs/config` | codigo | 68 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/marketplace_edit.rs` | `codex-rs/config` | codigo | 384 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/mcp_edit.rs` | `codex-rs/config` | codigo | 50 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/mcp_ema.rs` | `codex-rs/config` | codigo | 424 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/mcp_ema_cancellation.rs` | `codex-rs/config` | codigo | 84 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/mcp_ema_tests.rs` | `codex-rs/config` | teste | 327 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/mcp_requirements.rs` | `codex-rs/config` | codigo | 94 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/mcp_requirements_tests.rs` | `codex-rs/config` | teste | 227 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/mcp_types.rs` | `codex-rs/config` | codigo | 720 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/mcp_types_tests.rs` | `codex-rs/config` | teste | 743 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/merge.rs` | `codex-rs/config` | codigo | 245 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/merge_tests.rs` | `codex-rs/config` | teste | 761 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/model_provider_defaults.rs` | `codex-rs/config` | codigo | 27 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/model_provider_requirements.rs` | `codex-rs/config` | codigo | 45 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/model_provider_requirements_tests.rs` | `codex-rs/config` | teste | 99 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/overrides.rs` | `codex-rs/config` | codigo | 99 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/path_context.rs` | `codex-rs/config` | codigo | 115 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/path_context_tests.rs` | `codex-rs/config` | teste | 255 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/permission_config.rs` | `codex-rs/config` | codigo | 107 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/permission_config_tests.rs` | `codex-rs/config` | teste | 167 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/permissions_toml.rs` | `codex-rs/config` | codigo | 694 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/permissions_toml_tests.rs` | `codex-rs/config` | teste | 140 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/plugin_edit.rs` | `codex-rs/config` | codigo | 307 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/profile_toml.rs` | `codex-rs/config` | codigo | 83 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/project_root_markers.rs` | `codex-rs/config` | codigo | 50 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/project_trust.rs` | `codex-rs/config` | codigo | 108 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/project_trust_tests.rs` | `codex-rs/config` | teste | 91 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/requirements_exec_policy.rs` | `codex-rs/config` | codigo | 206 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/requirements_layers/hooks.rs` | `codex-rs/config` | codigo | 245 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/requirements_layers/layer.rs` | `codex-rs/config` | codigo | 374 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/requirements_layers/mod.rs` | `codex-rs/config` | codigo | 12 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/requirements_layers/models.rs` | `codex-rs/config` | codigo | 60 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/requirements_layers/network.rs` | `codex-rs/config` | codigo | 78 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/requirements_layers/permissions.rs` | `codex-rs/config` | codigo | 84 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/requirements_layers/rules.rs` | `codex-rs/config` | codigo | 26 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/requirements_layers/stack.rs` | `codex-rs/config` | codigo | 472 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/requirements_layers/stack_tests.rs` | `codex-rs/config` | teste | 2165 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/schema.rs` | `codex-rs/config` | codigo | 319 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/shell_environment_policy.rs` | `codex-rs/config` | codigo | 173 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/shell_environment_policy_tests.rs` | `codex-rs/config` | teste | 109 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/skills_config.rs` | `codex-rs/config` | codigo | 224 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/skills_config_tests.rs` | `codex-rs/config` | teste | 248 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/state.rs` | `codex-rs/config` | codigo | 960 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/state_tests.rs` | `codex-rs/config` | teste | 426 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/strict_config.rs` | `codex-rs/config` | codigo | 395 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/strict_config_tests.rs` | `codex-rs/config` | teste | 338 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/test_support.rs` | `codex-rs/config` | codigo | 80 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/test_support_tests.rs` | `codex-rs/config` | teste | 25 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/thread_config.rs` | `codex-rs/config` | codigo | 326 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/thread_config/proto/codex.thread_config.v1.proto` | `codex-rs/config` | codigo | 78 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/thread_config/proto/codex.thread_config.v1.rs` | `codex-rs/config` | codigo | 417 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/thread_config/remote.rs` | `codex-rs/config` | codigo | 644 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/tui_effects.rs` | `codex-rs/config` | codigo | 37 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/tui_keymap.rs` | `codex-rs/config` | codigo | 905 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/tui_keymap_chord_tests.rs` | `codex-rs/config` | teste | 93 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/tui_mouse_scroll.rs` | `codex-rs/config` | codigo | 26 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/tui_rendering.rs` | `codex-rs/config` | codigo | 31 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/types.rs` | `codex-rs/config` | codigo | 1339 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/config/src/types_tests.rs` | `codex-rs/config` | teste | 204 | `packages/coding-agent/src/core/settings-manager.ts` |
| `codex-rs/core-api/BUILD.bazel` | `codex-rs/core-api` | codigo | 6 | `packages/coding-agent/src/core/sdk.ts` |
| `codex-rs/core-api/src/lib.rs` | `codex-rs/core-api` | codigo | 164 | `packages/coding-agent/src/core/sdk.ts` |
| `codex-rs/diagnostics/BUILD.bazel` | `codex-rs/diagnostics` | codigo | 6 | `packages/coding-agent/src/extensions/diagnostico/` |
| `codex-rs/diagnostics/src/lib.rs` | `codex-rs/diagnostics` | codigo | 210 | `packages/coding-agent/src/extensions/diagnostico/` |
| `codex-rs/diagnostics/src/tests.rs` | `codex-rs/diagnostics` | codigo | 58 | `packages/coding-agent/src/extensions/diagnostico/` |
| `codex-rs/direct-tool-timing/BUILD.bazel` | `codex-rs/direct-tool-timing` | codigo | 6 | `packages/coding-agent/src/core/timings.ts` |
| `codex-rs/direct-tool-timing/src/direct_tool_timing_tests.rs` | `codex-rs/direct-tool-timing` | teste | 317 | `packages/coding-agent/src/core/timings.ts` |
| `codex-rs/direct-tool-timing/src/lib.rs` | `codex-rs/direct-tool-timing` | codigo | 13 | `packages/coding-agent/src/core/timings.ts` |
| `codex-rs/direct-tool-timing/src/recorder.rs` | `codex-rs/direct-tool-timing` | codigo | 375 | `packages/coding-agent/src/core/timings.ts` |
| `codex-rs/direct-tool-timing/src/recorder/runtime.rs` | `codex-rs/direct-tool-timing` | codigo | 90 | `packages/coding-agent/src/core/timings.ts` |
| `codex-rs/direct-tool-timing/src/recorder/runtime_tests.rs` | `codex-rs/direct-tool-timing` | teste | 101 | `packages/coding-agent/src/core/timings.ts` |
| `codex-rs/external-agent-migration/BUILD.bazel` | `codex-rs/external-agent-migration` | codigo | 6 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/config_values.rs` | `codex-rs/external-agent-migration` | codigo | 101 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/detect/memory.rs` | `codex-rs/external-agent-migration` | codigo | 43 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/detect/mod.rs` | `codex-rs/external-agent-migration` | codigo | 432 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/detect/plugins.rs` | `codex-rs/external-agent-migration` | codigo | 76 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/detect/sessions/cla.rs` | `codex-rs/external-agent-migration` | codigo | 485 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/detect/sessions/common.rs` | `codex-rs/external-agent-migration` | codigo | 101 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/detect/sessions/connectors_cla.rs` | `codex-rs/external-agent-migration` | codigo | 234 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/detect/sessions/connectors_cla_tests.rs` | `codex-rs/external-agent-migration` | teste | 186 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/detect/sessions/connectors_cur.rs` | `codex-rs/external-agent-migration` | codigo | 304 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/detect/sessions/connectors_cur_tests.rs` | `codex-rs/external-agent-migration` | teste | 298 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/detect/sessions/cur.rs` | `codex-rs/external-agent-migration` | codigo | 224 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/detect/sessions/cur_tests.rs` | `codex-rs/external-agent-migration` | teste | 432 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/detect/sessions/mod.rs` | `codex-rs/external-agent-migration` | codigo | 40 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/hooks_cla.rs` | `codex-rs/external-agent-migration` | codigo | 229 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/hooks_common.rs` | `codex-rs/external-agent-migration` | codigo | 291 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/hooks_cur.rs` | `codex-rs/external-agent-migration` | codigo | 170 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/hooks_cur_tests.rs` | `codex-rs/external-agent-migration` | teste | 107 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/lib.rs` | `codex-rs/external-agent-migration` | codigo | 100 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/lib_tests.rs` | `codex-rs/external-agent-migration` | teste | 788 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/mcp.rs` | `codex-rs/external-agent-migration` | codigo | 371 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/memory.rs` | `codex-rs/external-agent-migration` | codigo | 159 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/memory_import.rs` | `codex-rs/external-agent-migration` | codigo | 433 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/memory_import_tests.rs` | `codex-rs/external-agent-migration` | teste | 324 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/memory_tests.rs` | `codex-rs/external-agent-migration` | teste | 118 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/migration_source.rs` | `codex-rs/external-agent-migration` | codigo | 360 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/model.rs` | `codex-rs/external-agent-migration` | codigo | 197 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/plugins.rs` | `codex-rs/external-agent-migration` | codigo | 267 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/reporting.rs` | `codex-rs/external-agent-migration` | codigo | 106 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/rewrite.rs` | `codex-rs/external-agent-migration` | codigo | 159 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/rewrite_tests.rs` | `codex-rs/external-agent-migration` | teste | 73 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/scope.rs` | `codex-rs/external-agent-migration` | codigo | 106 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/scope_tests.rs` | `codex-rs/external-agent-migration` | teste | 35 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/service.rs` | `codex-rs/external-agent-migration` | codigo | 907 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/service_tests.rs` | `codex-rs/external-agent-migration` | teste | 80 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/service_tests/general.rs` | `codex-rs/external-agent-migration` | codigo | 8 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/service_tests/general/config_import.rs` | `codex-rs/external-agent-migration` | codigo | 530 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/service_tests/general/detection.rs` | `codex-rs/external-agent-migration` | codigo | 886 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/service_tests/general/repo_import.rs` | `codex-rs/external-agent-migration` | codigo | 731 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/service_tests/memory.rs` | `codex-rs/external-agent-migration` | codigo | 39 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/service_tests/plugins.rs` | `codex-rs/external-agent-migration` | codigo | 5 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/service_tests/plugins/basics.rs` | `codex-rs/external-agent-migration` | codigo | 751 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/service_tests/plugins/marketplaces.rs` | `codex-rs/external-agent-migration` | codigo | 788 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/sessions/append.rs` | `codex-rs/external-agent-migration` | codigo | 329 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/sessions/append_tests.rs` | `codex-rs/external-agent-migration` | teste | 142 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/sessions/export.rs` | `codex-rs/external-agent-migration` | codigo | 584 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/sessions/ledger.rs` | `codex-rs/external-agent-migration` | codigo | 435 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/sessions/ledger_tests.rs` | `codex-rs/external-agent-migration` | teste | 295 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/sessions/mod.rs` | `codex-rs/external-agent-migration` | codigo | 387 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/sessions/records_cla.rs` | `codex-rs/external-agent-migration` | codigo | 246 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/sessions/records_cla_tests.rs` | `codex-rs/external-agent-migration` | teste | 43 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/sessions/records_common.rs` | `codex-rs/external-agent-migration` | codigo | 154 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/sessions/records_common_tests.rs` | `codex-rs/external-agent-migration` | teste | 53 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/sessions/records_cur.rs` | `codex-rs/external-agent-migration` | codigo | 255 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/sessions/records_cur_tests.rs` | `codex-rs/external-agent-migration` | teste | 76 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/sessions/title.rs` | `codex-rs/external-agent-migration` | codigo | 94 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/sessions/title_tests.rs` | `codex-rs/external-agent-migration` | teste | 123 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/source/cla.rs` | `codex-rs/external-agent-migration` | codigo | 181 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/source/cur.rs` | `codex-rs/external-agent-migration` | codigo | 78 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/source/mod.rs` | `codex-rs/external-agent-migration` | codigo | 91 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/source_cla.rs` | `codex-rs/external-agent-migration` | codigo | 369 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/source_cur.rs` | `codex-rs/external-agent-migration` | codigo | 157 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/source_cur_tests.rs` | `codex-rs/external-agent-migration` | teste | 100 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/subagents.rs` | `codex-rs/external-agent-migration` | codigo | 311 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/external-agent-migration/src/utils.rs` | `codex-rs/external-agent-migration` | codigo | 104 | `packages/coding-agent/src/extensions/claude-compat/` |
| `codex-rs/features/BUILD.bazel` | `codex-rs/features` | codigo | 14 | `packages/coding-agent/src/extensions/settings-flags/` |
| `codex-rs/features/src/feature_configs.rs` | `codex-rs/features` | codigo | 689 | `packages/coding-agent/src/extensions/settings-flags/` |
| `codex-rs/features/src/legacy.rs` | `codex-rs/features` | codigo | 115 | `packages/coding-agent/src/extensions/settings-flags/` |
| `codex-rs/features/src/lib.rs` | `codex-rs/features` | codigo | 2597 | `packages/coding-agent/src/extensions/settings-flags/` |
| `codex-rs/features/src/runtime_auth.rs` | `codex-rs/features` | codigo | 31 | `packages/coding-agent/src/extensions/settings-flags/` |
| `codex-rs/features/src/tests.rs` | `codex-rs/features` | codigo | 1069 | `packages/coding-agent/src/extensions/settings-flags/` |
| `codex-rs/feedback/BUILD.bazel` | `codex-rs/feedback` | codigo | 6 | `packages/coding-agent/src/core/bug-report.ts` |
| `codex-rs/feedback/src/archive.rs` | `codex-rs/feedback` | codigo | 127 | `packages/coding-agent/src/core/bug-report.ts` |
| `codex-rs/feedback/src/archive_tests.rs` | `codex-rs/feedback` | teste | 175 | `packages/coding-agent/src/core/bug-report.ts` |
| `codex-rs/feedback/src/daemon_logs.rs` | `codex-rs/feedback` | codigo | 64 | `packages/coding-agent/src/core/bug-report.ts` |
| `codex-rs/feedback/src/daemon_logs_tests.rs` | `codex-rs/feedback` | teste | 55 | `packages/coding-agent/src/core/bug-report.ts` |
| `codex-rs/feedback/src/feedback_diagnostics.rs` | `codex-rs/feedback` | codigo | 179 | `packages/coding-agent/src/core/bug-report.ts` |
| `codex-rs/feedback/src/feedback_event_tests.rs` | `codex-rs/feedback` | teste | 256 | `packages/coding-agent/src/core/bug-report.ts` |
| `codex-rs/feedback/src/guardian.rs` | `codex-rs/feedback` | codigo | 157 | `packages/coding-agent/src/core/bug-report.ts` |
| `codex-rs/feedback/src/guardian_tests.rs` | `codex-rs/feedback` | teste | 90 | `packages/coding-agent/src/core/bug-report.ts` |
| `codex-rs/feedback/src/lib.rs` | `codex-rs/feedback` | codigo | 1073 | `packages/coding-agent/src/core/bug-report.ts` |
| `codex-rs/feedback/src/lib_tests.rs` | `codex-rs/feedback` | teste | 833 | `packages/coding-agent/src/core/bug-report.ts` |
| `codex-rs/feedback/src/metadata_tests.rs` | `codex-rs/feedback` | teste | 103 | `packages/coding-agent/src/core/bug-report.ts` |
| `codex-rs/feedback/src/report_upload.rs` | `codex-rs/feedback` | codigo | 154 | `packages/coding-agent/src/core/bug-report.ts` |
| `codex-rs/feedback/src/rollout_archive.rs` | `codex-rs/feedback` | codigo | 148 | `packages/coding-agent/src/core/bug-report.ts` |
| `codex-rs/feedback/src/rollout_attachment_tests.rs` | `codex-rs/feedback` | teste | 296 | `packages/coding-agent/src/core/bug-report.ts` |
| `codex-rs/feedback/src/save_rollout_tests.rs` | `codex-rs/feedback` | teste | 107 | `packages/coding-agent/src/core/bug-report.ts` |
| `codex-rs/feedback/src/upload.rs` | `codex-rs/feedback` | codigo | 215 | `packages/coding-agent/src/core/bug-report.ts` |
| `codex-rs/file-watcher/BUILD.bazel` | `codex-rs/file-watcher` | codigo | 6 | `sem equivalente` |
| `codex-rs/file-watcher/src/file_watcher_tests.rs` | `codex-rs/file-watcher` | teste | 723 | `sem equivalente` |
| `codex-rs/file-watcher/src/lib.rs` | `codex-rs/file-watcher` | codigo | 932 | `sem equivalente` |
| `codex-rs/install-context/BUILD.bazel` | `codex-rs/install-context` | codigo | 6 | `packages/coding-agent/src/config.ts` |
| `codex-rs/install-context/src/bundle_tests.rs` | `codex-rs/install-context` | teste | 76 | `packages/coding-agent/src/config.ts` |
| `codex-rs/install-context/src/lib.rs` | `codex-rs/install-context` | codigo | 363 | `packages/coding-agent/src/config.ts` |
| `codex-rs/install-context/src/lib_tests.rs` | `codex-rs/install-context` | teste | 518 | `packages/coding-agent/src/config.ts` |
| `codex-rs/mermaid/BUILD.bazel` | `codex-rs/mermaid` | codigo | 7 | `sem equivalente` |
| `codex-rs/mermaid/examples/render.rs` | `codex-rs/mermaid` | codigo | 17 | `sem equivalente` |
| `codex-rs/mermaid/src/draw.rs` | `codex-rs/mermaid` | codigo | 366 | `sem equivalente` |
| `codex-rs/mermaid/src/families_tests.rs` | `codex-rs/mermaid` | teste | 477 | `sem equivalente` |
| `codex-rs/mermaid/src/lib.rs` | `codex-rs/mermaid` | codigo | 180 | `sem equivalente` |
| `codex-rs/mermaid/src/output.rs` | `codex-rs/mermaid` | codigo | 69 | `sem equivalente` |
| `codex-rs/mermaid/src/parse.rs` | `codex-rs/mermaid` | codigo | 305 | `sem equivalente` |
| `codex-rs/mermaid/src/relations.rs` | `codex-rs/mermaid` | codigo | 241 | `sem equivalente` |
| `codex-rs/mermaid/src/sequence.rs` | `codex-rs/mermaid` | codigo | 306 | `sem equivalente` |
| `codex-rs/mermaid/src/state.rs` | `codex-rs/mermaid` | codigo | 119 | `sem equivalente` |
| `codex-rs/mermaid/src/syntax.rs` | `codex-rs/mermaid` | codigo | 101 | `sem equivalente` |
| `codex-rs/mermaid/src/tests.rs` | `codex-rs/mermaid` | codigo | 547 | `sem equivalente` |
| `codex-rs/message-board-mcp/BUILD.bazel` | `codex-rs/message-board-mcp` | codigo | 6 | `sem equivalente` |
| `codex-rs/message-board-mcp/src/http.rs` | `codex-rs/message-board-mcp` | codigo | 169 | `sem equivalente` |
| `codex-rs/message-board-mcp/src/lib.rs` | `codex-rs/message-board-mcp` | codigo | 186 | `sem equivalente` |
| `codex-rs/message-board-mcp/src/local.rs` | `codex-rs/message-board-mcp` | codigo | 194 | `sem equivalente` |
| `codex-rs/message-board-mcp/src/main.rs` | `codex-rs/message-board-mcp` | codigo | 99 | `sem equivalente` |
| `codex-rs/message-board-mcp/src/persisted.rs` | `codex-rs/message-board-mcp` | codigo | 99 | `sem equivalente` |
| `codex-rs/message-board-mcp/tests/startup.rs` | `codex-rs/message-board-mcp` | teste | 17 | `sem equivalente` |
| `codex-rs/message-board/BUILD.bazel` | `codex-rs/message-board` | codigo | 14 | `sem equivalente` |
| `codex-rs/message-board/src/api.rs` | `codex-rs/message-board` | codigo | 328 | `sem equivalente` |
| `codex-rs/message-board/src/host.rs` | `codex-rs/message-board` | codigo | 38 | `sem equivalente` |
| `codex-rs/message-board/src/in_memory.rs` | `codex-rs/message-board` | codigo | 485 | `sem equivalente` |
| `codex-rs/message-board/src/in_memory/queries.rs` | `codex-rs/message-board` | codigo | 307 | `sem equivalente` |
| `codex-rs/message-board/src/in_memory_tests.rs` | `codex-rs/message-board` | teste | 66 | `sem equivalente` |
| `codex-rs/message-board/src/lib.rs` | `codex-rs/message-board` | codigo | 57 | `sem equivalente` |
| `codex-rs/message-board/src/local.rs` | `codex-rs/message-board` | codigo | 529 | `sem equivalente` |
| `codex-rs/message-board/src/local/catalog.rs` | `codex-rs/message-board` | codigo | 57 | `sem equivalente` |
| `codex-rs/message-board/src/local/connection.rs` | `codex-rs/message-board` | codigo | 129 | `sem equivalente` |
| `codex-rs/message-board/src/local/json_search.rs` | `codex-rs/message-board` | codigo | 81 | `sem equivalente` |
| `codex-rs/message-board/src/local/lifecycle.rs` | `codex-rs/message-board` | codigo | 110 | `sem equivalente` |
| `codex-rs/message-board/src/local/options.rs` | `codex-rs/message-board` | codigo | 48 | `sem equivalente` |
| `codex-rs/message-board/src/local/paging.rs` | `codex-rs/message-board` | codigo | 86 | `sem equivalente` |
| `codex-rs/message-board/src/local/pool.rs` | `codex-rs/message-board` | codigo | 98 | `sem equivalente` |
| `codex-rs/message-board/src/local/pools_tests.rs` | `codex-rs/message-board` | teste | 57 | `sem equivalente` |
| `codex-rs/message-board/src/local/queries.rs` | `codex-rs/message-board` | codigo | 507 | `sem equivalente` |
| `codex-rs/message-board/src/local/setup.rs` | `codex-rs/message-board` | codigo | 117 | `sem equivalente` |
| `codex-rs/message-board/src/local/subscriptions.rs` | `codex-rs/message-board` | codigo | 46 | `sem equivalente` |
| `codex-rs/message-board/src/permissions.rs` | `codex-rs/message-board` | codigo | 84 | `sem equivalente` |
| `codex-rs/message-board/src/tools.rs` | `codex-rs/message-board` | codigo | 496 | `sem equivalente` |
| `codex-rs/message-board/src/tools/arguments.rs` | `codex-rs/message-board` | codigo | 98 | `sem equivalente` |
| `codex-rs/message-board/src/tools/selection.rs` | `codex-rs/message-board` | codigo | 73 | `sem equivalente` |
| `codex-rs/message-board/src/tools/spec.rs` | `codex-rs/message-board` | codigo | 158 | `sem equivalente` |
| `codex-rs/message-board/src/types.rs` | `codex-rs/message-board` | codigo | 124 | `sem equivalente` |
| `codex-rs/message-board/tests/common/mod.rs` | `codex-rs/message-board` | teste | 82 | `sem equivalente` |
| `codex-rs/message-board/tests/local_board.rs` | `codex-rs/message-board` | teste | 2189 | `sem equivalente` |
| `codex-rs/message-board/tests/local_board/mcp_tests.rs` | `codex-rs/message-board` | teste | 290 | `sem equivalente` |
| `codex-rs/otel-trace-websocket/BUILD.bazel` | `codex-rs/otel-trace-websocket` | codigo | 6 | `packages/telemetry/` |
| `codex-rs/otel-trace-websocket/src/lib.rs` | `codex-rs/otel-trace-websocket` | codigo | 179 | `packages/telemetry/` |
| `codex-rs/otel/BUILD.bazel` | `codex-rs/otel` | codigo | 7 | `packages/telemetry/` |
| `codex-rs/otel/src/agent_response.rs` | `codex-rs/otel` | codigo | 111 | `packages/telemetry/` |
| `codex-rs/otel/src/auth_storage.rs` | `codex-rs/otel` | codigo | 257 | `packages/telemetry/` |
| `codex-rs/otel/src/auth_storage/originator.rs` | `codex-rs/otel` | codigo | 45 | `packages/telemetry/` |
| `codex-rs/otel/src/auth_storage/originator_tests.rs` | `codex-rs/otel` | teste | 49 | `packages/telemetry/` |
| `codex-rs/otel/src/auth_storage_tests.rs` | `codex-rs/otel` | teste | 248 | `packages/telemetry/` |
| `codex-rs/otel/src/config.rs` | `codex-rs/otel` | codigo | 148 | `packages/telemetry/` |
| `codex-rs/otel/src/events/mod.rs` | `codex-rs/otel` | codigo | 2 | `packages/telemetry/` |
| `codex-rs/otel/src/events/session_telemetry.rs` | `codex-rs/otel` | codigo | 1530 | `packages/telemetry/` |
| `codex-rs/otel/src/events/shared.rs` | `codex-rs/otel` | codigo | 70 | `packages/telemetry/` |
| `codex-rs/otel/src/guardian_assessment.rs` | `codex-rs/otel` | codigo | 68 | `packages/telemetry/` |
| `codex-rs/otel/src/headers_helper.rs` | `codex-rs/otel` | codigo | 172 | `packages/telemetry/` |
| `codex-rs/otel/src/headers_helper_tests.rs` | `codex-rs/otel` | teste | 283 | `packages/telemetry/` |
| `codex-rs/otel/src/lib.rs` | `codex-rs/otel` | codigo | 106 | `packages/telemetry/` |
| `codex-rs/otel/src/metrics/buffered.rs` | `codex-rs/otel` | codigo | 191 | `packages/telemetry/` |
| `codex-rs/otel/src/metrics/buffered_tests.rs` | `codex-rs/otel` | teste | 236 | `packages/telemetry/` |
| `codex-rs/otel/src/metrics/client.rs` | `codex-rs/otel` | codigo | 772 | `packages/telemetry/` |
| `codex-rs/otel/src/metrics/client_tests.rs` | `codex-rs/otel` | teste | 57 | `packages/telemetry/` |
| `codex-rs/otel/src/metrics/config.rs` | `codex-rs/otel` | codigo | 140 | `packages/telemetry/` |
| `codex-rs/otel/src/metrics/error.rs` | `codex-rs/otel` | codigo | 49 | `packages/telemetry/` |
| `codex-rs/otel/src/metrics/mod.rs` | `codex-rs/otel` | codigo | 62 | `packages/telemetry/` |
| `codex-rs/otel/src/metrics/names.rs` | `codex-rs/otel` | codigo | 156 | `packages/telemetry/` |
| `codex-rs/otel/src/metrics/process.rs` | `codex-rs/otel` | codigo | 27 | `packages/telemetry/` |
| `codex-rs/otel/src/metrics/runtime_metrics.rs` | `codex-rs/otel` | codigo | 220 | `packages/telemetry/` |
| `codex-rs/otel/src/metrics/tags.rs` | `codex-rs/otel` | codigo | 136 | `packages/telemetry/` |
| `codex-rs/otel/src/metrics/timer.rs` | `codex-rs/otel` | codigo | 41 | `packages/telemetry/` |
| `codex-rs/otel/src/metrics/validation.rs` | `codex-rs/otel` | codigo | 55 | `packages/telemetry/` |
| `codex-rs/otel/src/network_policy.rs` | `codex-rs/otel` | codigo | 136 | `packages/telemetry/` |
| `codex-rs/otel/src/otlp.rs` | `codex-rs/otel` | codigo | 345 | `packages/telemetry/` |
| `codex-rs/otel/src/provider.rs` | `codex-rs/otel` | codigo | 944 | `packages/telemetry/` |
| `codex-rs/otel/src/provider_shutdown_tests.rs` | `codex-rs/otel` | teste | 470 | `packages/telemetry/` |
| `codex-rs/otel/src/skill_invocation.rs` | `codex-rs/otel` | codigo | 61 | `packages/telemetry/` |
| `codex-rs/otel/src/targets.rs` | `codex-rs/otel` | codigo | 11 | `packages/telemetry/` |
| `codex-rs/otel/src/tool_result.rs` | `codex-rs/otel` | codigo | 115 | `packages/telemetry/` |
| `codex-rs/otel/src/tool_result_tests.rs` | `codex-rs/otel` | teste | 67 | `packages/telemetry/` |
| `codex-rs/otel/src/trace_context.rs` | `codex-rs/otel` | codigo | 415 | `packages/telemetry/` |
| `codex-rs/otel/tests/harness/mod.rs` | `codex-rs/otel` | teste | 79 | `packages/telemetry/` |
| `codex-rs/otel/tests/suite/buffered_operations_tests.rs` | `codex-rs/otel` | teste | 127 | `packages/telemetry/` |
| `codex-rs/otel/tests/suite/manager_metrics.rs` | `codex-rs/otel` | teste | 569 | `packages/telemetry/` |
| `codex-rs/otel/tests/suite/mod.rs` | `codex-rs/otel` | teste | 10 | `packages/telemetry/` |
| `codex-rs/otel/tests/suite/otel_export_routing_policy.rs` | `codex-rs/otel` | teste | 1435 | `packages/telemetry/` |
| `codex-rs/otel/tests/suite/otel_headers_helper.rs` | `codex-rs/otel` | teste | 126 | `packages/telemetry/` |
| `codex-rs/otel/tests/suite/otlp_http_loopback.rs` | `codex-rs/otel` | teste | 957 | `packages/telemetry/` |
| `codex-rs/otel/tests/suite/runtime_summary.rs` | `codex-rs/otel` | teste | 140 | `packages/telemetry/` |
| `codex-rs/otel/tests/suite/send.rs` | `codex-rs/otel` | teste | 360 | `packages/telemetry/` |
| `codex-rs/otel/tests/suite/snapshot.rs` | `codex-rs/otel` | teste | 222 | `packages/telemetry/` |
| `codex-rs/otel/tests/suite/timing.rs` | `codex-rs/otel` | teste | 144 | `packages/telemetry/` |
| `codex-rs/otel/tests/suite/validation.rs` | `codex-rs/otel` | teste | 91 | `packages/telemetry/` |
| `codex-rs/otel/tests/tests.rs` | `codex-rs/otel` | teste | 4 | `packages/telemetry/` |
| `codex-rs/protocol/BUILD.bazel` | `codex-rs/protocol` | codigo | 7 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/account.rs` | `codex-rs/protocol` | codigo | 272 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/agent_error.rs` | `codex-rs/protocol` | codigo | 32 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/agent_path.rs` | `codex-rs/protocol` | codigo | 240 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/approvals.rs` | `codex-rs/protocol` | codigo | 574 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/auth.rs` | `codex-rs/protocol` | codigo | 267 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/budget_units.rs` | `codex-rs/protocol` | codigo | 54 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/capabilities.rs` | `codex-rs/protocol` | codigo | 89 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/capabilities_tests.rs` | `codex-rs/protocol` | teste | 30 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/codex_error_info.rs` | `codex-rs/protocol` | codigo | 92 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/config_types.rs` | `codex-rs/protocol` | codigo | 980 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/context_window_id.rs` | `codex-rs/protocol` | codigo | 57 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/context_window_id_tests.rs` | `codex-rs/protocol` | teste | 16 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/conversation_start_params_tests.rs` | `codex-rs/protocol` | teste | 52 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/dynamic_tools.rs` | `codex-rs/protocol` | codigo | 175 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/environment.rs` | `codex-rs/protocol` | codigo | 237 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/error.rs` | `codex-rs/protocol` | codigo | 1105 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/error_tests.rs` | `codex-rs/protocol` | teste | 757 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/exec_output.rs` | `codex-rs/protocol` | codigo | 169 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/exec_output_tests.rs` | `codex-rs/protocol` | teste | 77 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/guardian_transcript.rs` | `codex-rs/protocol` | codigo | 16 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/hooks.rs` | `codex-rs/protocol` | codigo | 213 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/item_id_generator.rs` | `codex-rs/protocol` | codigo | 12 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/items.rs` | `codex-rs/protocol` | codigo | 981 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/items/display.rs` | `codex-rs/protocol` | codigo | 147 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/legacy_events.rs` | `codex-rs/protocol` | codigo | 706 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/lib.rs` | `codex-rs/protocol` | codigo | 70 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/mcp.rs` | `codex-rs/protocol` | codigo | 652 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/mcp_approval_meta.rs` | `codex-rs/protocol` | codigo | 42 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/mcp_policy.rs` | `codex-rs/protocol` | codigo | 96 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/memory_citation.rs` | `codex-rs/protocol` | codigo | 20 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/memory_version.rs` | `codex-rs/protocol` | codigo | 23 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/models.rs` | `codex-rs/protocol` | codigo | 4197 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/models/configuration_update.rs` | `codex-rs/protocol` | codigo | 17 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/models/configuration_update_tests.rs` | `codex-rs/protocol` | teste | 51 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/models/executed_tool_calls.rs` | `codex-rs/protocol` | codigo | 1059 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/models/executed_tool_calls_tests.rs` | `codex-rs/protocol` | teste | 768 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/models/item_metadata.rs` | `codex-rs/protocol` | codigo | 164 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/models/item_metadata_tests.rs` | `codex-rs/protocol` | teste | 116 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/models/mcp_content.rs` | `codex-rs/protocol` | codigo | 102 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/network_policy.rs` | `codex-rs/protocol` | codigo | 22 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/num_format.rs` | `codex-rs/protocol` | codigo | 29 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/openai_models.rs` | `codex-rs/protocol` | codigo | 2368 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/openai_models/access_programs.rs` | `codex-rs/protocol` | codigo | 97 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/openai_models/access_programs_tests.rs` | `codex-rs/protocol` | teste | 50 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/openai_models/guardian.rs` | `codex-rs/protocol` | codigo | 205 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/openai_models/guardian_tests.rs` | `codex-rs/protocol` | teste | 48 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/openai_models/guardian_v2.rs` | `codex-rs/protocol` | codigo | 64 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/openai_models/incremental_tools.rs` | `codex-rs/protocol` | codigo | 30 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/openai_models/memento_v2.rs` | `codex-rs/protocol` | codigo | 52 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/openai_models/memento_v2_tests.rs` | `codex-rs/protocol` | teste | 18 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/openai_models/plugins.rs` | `codex-rs/protocol` | codigo | 66 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/openai_models/plugins_tests.rs` | `codex-rs/protocol` | teste | 34 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/openai_models/reasoning_effort.rs` | `codex-rs/protocol` | codigo | 44 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/openai_models/reasoning_effort_tests.rs` | `codex-rs/protocol` | teste | 52 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/parse_command.rs` | `codex-rs/protocol` | codigo | 31 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/permission_profile_intersection.rs` | `codex-rs/protocol` | codigo | 425 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/permission_profile_intersection_tests.rs` | `codex-rs/protocol` | teste | 386 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/permission_profile_snapshot.rs` | `codex-rs/protocol` | codigo | 128 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/permission_profile_snapshot_tests.rs` | `codex-rs/protocol` | teste | 20 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/permissions.rs` | `codex-rs/protocol` | codigo | 2728 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/permissions/deny_read_validator.rs` | `codex-rs/protocol` | codigo | 102 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/permissions/enforcement.rs` | `codex-rs/protocol` | codigo | 91 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/permissions/local_aliases.rs` | `codex-rs/protocol` | codigo | 260 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/permissions/local_aliases_tests.rs` | `codex-rs/protocol` | teste | 163 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/permissions/target.rs` | `codex-rs/protocol` | codigo | 253 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/permissions/target_approved_materialization_tests.rs` | `codex-rs/protocol` | teste | 246 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/permissions/target_tests.rs` | `codex-rs/protocol` | teste | 446 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/permissions/windows_glob.rs` | `codex-rs/protocol` | codigo | 44 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/permissions_tests.rs` | `codex-rs/protocol` | teste | 2084 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/plan_tool.rs` | `codex-rs/protocol` | codigo | 29 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/prompts/base_instructions/default.md` | `codex-rs/protocol` | prompt | 275 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/protocol.rs` | `codex-rs/protocol` | codigo | 6993 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/realtime.rs` | `codex-rs/protocol` | codigo | 123 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/realtime_tests.rs` | `codex-rs/protocol` | teste | 22 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/request_country.rs` | `codex-rs/protocol` | codigo | 59 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/request_country_tests.rs` | `codex-rs/protocol` | teste | 13 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/request_permissions.rs` | `codex-rs/protocol` | codigo | 99 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/request_user_input.rs` | `codex-rs/protocol` | codigo | 103 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/request_user_input_tests.rs` | `codex-rs/protocol` | teste | 44 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/response_item_id.rs` | `codex-rs/protocol` | codigo | 206 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/response_item_id_tests.rs` | `codex-rs/protocol` | teste | 80 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/response_usage.rs` | `codex-rs/protocol` | codigo | 14 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/review_format.rs` | `codex-rs/protocol` | codigo | 82 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/sandbox.rs` | `codex-rs/protocol` | codigo | 61 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/sanitized_git_url.rs` | `codex-rs/protocol` | codigo | 163 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/sanitized_git_url_tests.rs` | `codex-rs/protocol` | teste | 305 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/security_risk.rs` | `codex-rs/protocol` | codigo | 25 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/session_id.rs` | `codex-rs/protocol` | codigo | 126 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/shell_environment.rs` | `codex-rs/protocol` | codigo | 344 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/shell_environment_tests.rs` | `codex-rs/protocol` | teste | 175 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/thread_id.rs` | `codex-rs/protocol` | codigo | 121 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/tool_name.rs` | `codex-rs/protocol` | codigo | 94 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/turn_input.rs` | `codex-rs/protocol` | codigo | 399 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/src/user_input.rs` | `codex-rs/protocol` | codigo | 130 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/tests/support/BUILD.bazel` | `codex-rs/protocol` | teste | 7 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/protocol/tests/support/lib.rs` | `codex-rs/protocol` | teste | 28 | `packages/coding-agent/src/core/messages.ts` |
| `codex-rs/realtime-webrtc/BUILD.bazel` | `codex-rs/realtime-webrtc` | codigo | 6 | `sem equivalente` |
| `codex-rs/realtime-webrtc/src/client.rs` | `codex-rs/realtime-webrtc` | codigo | 341 | `sem equivalente` |
| `codex-rs/realtime-webrtc/src/client_tests.rs` | `codex-rs/realtime-webrtc` | teste | 144 | `sem equivalente` |
| `codex-rs/realtime-webrtc/src/helper_exit.rs` | `codex-rs/realtime-webrtc` | codigo | 55 | `sem equivalente` |
| `codex-rs/realtime-webrtc/src/lib.rs` | `codex-rs/realtime-webrtc` | codigo | 26 | `sem equivalente` |
| `codex-rs/realtime-webrtc/src/linux_alsa.rs` | `codex-rs/realtime-webrtc` | codigo | 28 | `sem equivalente` |
| `codex-rs/realtime-webrtc/src/linux_alsa_tests.rs` | `codex-rs/realtime-webrtc` | teste | 38 | `sem equivalente` |
| `codex-rs/realtime-webrtc/src/message_reader.rs` | `codex-rs/realtime-webrtc` | codigo | 61 | `sem equivalente` |
| `codex-rs/realtime-webrtc/src/message_reader_tests.rs` | `codex-rs/realtime-webrtc` | teste | 144 | `sem equivalente` |
| `codex-rs/realtime-webrtc/src/protocol.rs` | `codex-rs/realtime-webrtc` | codigo | 165 | `sem equivalente` |
| `codex-rs/realtime-webrtc/src/protocol_tests.rs` | `codex-rs/realtime-webrtc` | teste | 28 | `sem equivalente` |
| `codex-rs/realtime-webrtc/src/session.rs` | `codex-rs/realtime-webrtc` | codigo | 380 | `sem equivalente` |
| `codex-rs/realtime-webrtc/src/session_tests.rs` | `codex-rs/realtime-webrtc` | teste | 248 | `sem equivalente` |
| `codex-rs/realtime-webrtc/tests/common/mod.rs` | `codex-rs/realtime-webrtc` | teste | 243 | `sem equivalente` |
| `codex-rs/realtime-webrtc/tests/session_actor.rs` | `codex-rs/realtime-webrtc` | teste | 204 | `sem equivalente` |
| `codex-rs/response-debug-context/BUILD.bazel` | `codex-rs/response-debug-context` | codigo | 6 | `packages/coding-agent/src/core/diagnostics.ts` |
| `codex-rs/response-debug-context/src/lib.rs` | `codex-rs/response-debug-context` | codigo | 200 | `packages/coding-agent/src/core/diagnostics.ts` |
| `codex-rs/runtime-agent-instance/BUILD.bazel` | `codex-rs/runtime-agent-instance` | codigo | 6 | `sem equivalente` |
| `codex-rs/runtime-agent-instance/src/actor.rs` | `codex-rs/runtime-agent-instance` | codigo | 29 | `sem equivalente` |
| `codex-rs/runtime-agent-instance/src/auth.rs` | `codex-rs/runtime-agent-instance` | codigo | 215 | `sem equivalente` |
| `codex-rs/runtime-agent-instance/src/binding.rs` | `codex-rs/runtime-agent-instance` | codigo | 414 | `sem equivalente` |
| `codex-rs/runtime-agent-instance/src/bootstrap.rs` | `codex-rs/runtime-agent-instance` | codigo | 88 | `sem equivalente` |
| `codex-rs/runtime-agent-instance/src/bootstrap_tests.rs` | `codex-rs/runtime-agent-instance` | teste | 98 | `sem equivalente` |
| `codex-rs/runtime-agent-instance/src/installation_id.rs` | `codex-rs/runtime-agent-instance` | codigo | 187 | `sem equivalente` |
| `codex-rs/runtime-agent-instance/src/lib.rs` | `codex-rs/runtime-agent-instance` | codigo | 37 | `sem equivalente` |
| `codex-rs/runtime-agent-instance/src/manager.rs` | `codex-rs/runtime-agent-instance` | codigo | 198 | `sem equivalente` |
| `codex-rs/runtime-agent-instance/src/manager_tests.rs` | `codex-rs/runtime-agent-instance` | teste | 1027 | `sem equivalente` |
| `codex-rs/runtime-agent-instance/src/registration.rs` | `codex-rs/runtime-agent-instance` | codigo | 157 | `sem equivalente` |
| `codex-rs/runtime-agent-instance/src/registration_tests.rs` | `codex-rs/runtime-agent-instance` | teste | 272 | `sem equivalente` |
| `codex-rs/runtime-agent-instance/src/runtime.rs` | `codex-rs/runtime-agent-instance` | codigo | 123 | `sem equivalente` |
| `codex-rs/scripts/run_locked_python_tool.py` | `codex-rs/scripts` | codigo | 47 | `sem equivalente` |
| `codex-rs/scripts/setup-windows.ps1` | `codex-rs/scripts` | codigo | 246 | `sem equivalente` |
| `codex-rs/tcp-tunnel/BUILD.bazel` | `codex-rs/tcp-tunnel` | codigo | 6 | `packages/env/` |
| `codex-rs/tcp-tunnel/src/http2.rs` | `codex-rs/tcp-tunnel` | codigo | 241 | `packages/env/` |
| `codex-rs/tcp-tunnel/src/http2_tests.rs` | `codex-rs/tcp-tunnel` | teste | 262 | `packages/env/` |
| `codex-rs/tcp-tunnel/src/lib.rs` | `codex-rs/tcp-tunnel` | codigo | 240 | `packages/env/` |
| `codex-rs/tcp-tunnel/src/ssh.rs` | `codex-rs/tcp-tunnel` | codigo | 170 | `packages/env/` |
| `codex-rs/tcp-tunnel/src/ssh_tests.rs` | `codex-rs/tcp-tunnel` | teste | 112 | `packages/env/` |
| `codex-rs/tcp-tunnel/src/transport.rs` | `codex-rs/tcp-tunnel` | codigo | 211 | `packages/env/` |
| `codex-rs/tcp-tunnel/src/transport_tests.rs` | `codex-rs/tcp-tunnel` | teste | 338 | `packages/env/` |
| `codex-rs/tcp-tunnel/tests/real-ssh.sh` | `codex-rs/tcp-tunnel` | teste | 40 | `packages/env/` |
| `codex-rs/terminal-detection/BUILD.bazel` | `codex-rs/terminal-detection` | codigo | 6 | `packages/tui/src/terminal.ts` |
| `codex-rs/terminal-detection/src/lib.rs` | `codex-rs/terminal-detection` | codigo | 452 | `packages/tui/src/terminal.ts` |
| `codex-rs/terminal-detection/src/terminal_tests.rs` | `codex-rs/terminal-detection` | teste | 930 | `packages/tui/src/terminal.ts` |
| `codex-rs/test-binary-support/BUILD.bazel` | `codex-rs/test-binary-support` | codigo | 7 | `packages/coding-agent/test/` |
| `codex-rs/test-binary-support/lib.rs` | `codex-rs/test-binary-support` | codigo | 77 | `packages/coding-agent/test/` |
| `codex-rs/thread-manager-sample/BUILD.bazel` | `codex-rs/thread-manager-sample` | codigo | 6 | `sem equivalente` |
| `codex-rs/thread-manager-sample/src/main.rs` | `codex-rs/thread-manager-sample` | codigo | 531 | `sem equivalente` |
| `codex-rs/uds/BUILD.bazel` | `codex-rs/uds` | codigo | 6 | `packages/chord/` |
| `codex-rs/uds/src/daemon_directory.rs` | `codex-rs/uds` | codigo | 39 | `packages/chord/` |
| `codex-rs/uds/src/lib.rs` | `codex-rs/uds` | codigo | 375 | `packages/chord/` |
| `codex-rs/uds/src/lib_tests.rs` | `codex-rs/uds` | teste | 307 | `packages/chord/` |
| `codex-rs/uds/src/windows_peer.rs` | `codex-rs/uds` | codigo | 103 | `packages/chord/` |
| `codex-rs/uds/src/windows_security.rs` | `codex-rs/uds` | codigo | 128 | `packages/chord/` |
| `codex-rs/uds/src/windows_socket_validation.rs` | `codex-rs/uds` | codigo | 138 | `packages/chord/` |
| `codex-rs/user-input/BUILD.bazel` | `codex-rs/user-input` | codigo | 6 | `packages/coding-agent/src/extensions/question/` |
| `codex-rs/user-input/src/lib.rs` | `codex-rs/user-input` | codigo | 13 | `packages/coding-agent/src/extensions/question/` |
| `codex-rs/user-input/src/local_media.rs` | `codex-rs/user-input` | codigo | 101 | `packages/coding-agent/src/extensions/question/` |
| `codex-rs/user-input/src/local_media_tests.rs` | `codex-rs/user-input` | teste | 134 | `packages/coding-agent/src/extensions/question/` |
| `codex-rs/user-input/src/message_tests.rs` | `codex-rs/user-input` | teste | 544 | `packages/coding-agent/src/extensions/question/` |
| `codex-rs/user-input/src/resolved_user_input.rs` | `codex-rs/user-input` | codigo | 279 | `packages/coding-agent/src/extensions/question/` |
| `codex-rs/user-input/src/resolved_user_input_tests.rs` | `codex-rs/user-input` | teste | 189 | `packages/coding-agent/src/extensions/question/` |
| `codex-rs/user-verification/BUILD.bazel` | `codex-rs/user-verification` | codigo | 6 | `sem equivalente` |
| `codex-rs/user-verification/src/credential.rs` | `codex-rs/user-verification` | codigo | 93 | `sem equivalente` |
| `codex-rs/user-verification/src/credential_tests.rs` | `codex-rs/user-verification` | teste | 43 | `sem equivalente` |
| `codex-rs/user-verification/src/error.rs` | `codex-rs/user-verification` | codigo | 42 | `sem equivalente` |
| `codex-rs/user-verification/src/guard.rs` | `codex-rs/user-verification` | codigo | 51 | `sem equivalente` |
| `codex-rs/user-verification/src/guard_tests.rs` | `codex-rs/user-verification` | teste | 32 | `sem equivalente` |
| `codex-rs/user-verification/src/key_namespace.rs` | `codex-rs/user-verification` | codigo | 25 | `sem equivalente` |
| `codex-rs/user-verification/src/key_namespace_tests.rs` | `codex-rs/user-verification` | teste | 12 | `sem equivalente` |
| `codex-rs/user-verification/src/lib.rs` | `codex-rs/user-verification` | codigo | 92 | `sem equivalente` |
| `codex-rs/user-verification/src/lifecycle_lock.rs` | `codex-rs/user-verification` | codigo | 86 | `sem equivalente` |
| `codex-rs/user-verification/src/lifecycle_lock_tests.rs` | `codex-rs/user-verification` | teste | 60 | `sem equivalente` |
| `codex-rs/user-verification/src/native_operation.rs` | `codex-rs/user-verification` | codigo | 43 | `sem equivalente` |
| `codex-rs/user-verification/src/native_operation_tests.rs` | `codex-rs/user-verification` | teste | 70 | `sem equivalente` |
| `codex-rs/user-verification/src/platform_macos.rs` | `codex-rs/user-verification` | codigo | 14 | `sem equivalente` |
| `codex-rs/user-verification/src/platform_macos/enrollment_diagnostics.rs` | `codex-rs/user-verification` | codigo | 81 | `sem equivalente` |
| `codex-rs/user-verification/src/platform_macos/error.rs` | `codex-rs/user-verification` | codigo | 54 | `sem equivalente` |
| `codex-rs/user-verification/src/platform_macos/error_tests.rs` | `codex-rs/user-verification` | teste | 51 | `sem equivalente` |
| `codex-rs/user-verification/src/platform_macos/key_protection.rs` | `codex-rs/user-verification` | codigo | 65 | `sem equivalente` |
| `codex-rs/user-verification/src/platform_macos/key_protection_tests.rs` | `codex-rs/user-verification` | teste | 62 | `sem equivalente` |
| `codex-rs/user-verification/src/platform_macos/provider.rs` | `codex-rs/user-verification` | codigo | 398 | `sem equivalente` |
| `codex-rs/user-verification/src/unsupported.rs` | `codex-rs/user-verification` | codigo | 53 | `sem equivalente` |
| `codex-rs/user-verification/tests/hardware.rs` | `codex-rs/user-verification` | teste | 134 | `sem equivalente` |
| `codex-rs/utils/absolute-path/BUILD.bazel` | `codex-rs/utils/absolute-path` | codigo | 6 | `packages/coding-agent/src/core/tools/path-utils.ts` |
| `codex-rs/utils/absolute-path/src/absolutize.rs` | `codex-rs/utils/absolute-path` | codigo | 171 | `packages/coding-agent/src/core/tools/path-utils.ts` |
| `codex-rs/utils/absolute-path/src/lib.rs` | `codex-rs/utils/absolute-path` | codigo | 797 | `packages/coding-agent/src/core/tools/path-utils.ts` |
| `codex-rs/utils/absolute-path/src/system_aliases.rs` | `codex-rs/utils/absolute-path` | codigo | 35 | `packages/coding-agent/src/core/tools/path-utils.ts` |
| `codex-rs/utils/absolute-path/src/system_aliases_tests.rs` | `codex-rs/utils/absolute-path` | teste | 29 | `packages/coding-agent/src/core/tools/path-utils.ts` |
| `codex-rs/utils/approval-presets/BUILD.bazel` | `codex-rs/utils/approval-presets` | codigo | 6 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/utils/approval-presets/src/lib.rs` | `codex-rs/utils/approval-presets` | codigo | 77 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/utils/audio/BUILD.bazel` | `codex-rs/utils/audio` | codigo | 6 | `sem equivalente` |
| `codex-rs/utils/audio/src/audio_preparation_tests.rs` | `codex-rs/utils/audio` | teste | 222 | `sem equivalente` |
| `codex-rs/utils/audio/src/lib.rs` | `codex-rs/utils/audio` | codigo | 337 | `sem equivalente` |
| `codex-rs/utils/cache/BUILD.bazel` | `codex-rs/utils/cache` | codigo | 6 | `packages/coding-agent/src/core/cache-stats.ts` |
| `codex-rs/utils/cache/src/initialization_tests.rs` | `codex-rs/utils/cache` | teste | 51 | `packages/coding-agent/src/core/cache-stats.ts` |
| `codex-rs/utils/cache/src/lib.rs` | `codex-rs/utils/cache` | codigo | 167 | `packages/coding-agent/src/core/cache-stats.ts` |
| `codex-rs/utils/cache/src/lib_tests.rs` | `codex-rs/utils/cache` | teste | 54 | `packages/coding-agent/src/core/cache-stats.ts` |
| `codex-rs/utils/cargo-bin/BUILD.bazel` | `codex-rs/utils/cargo-bin` | codigo | 18 | `sem equivalente` |
| `codex-rs/utils/cargo-bin/src/executable.rs` | `codex-rs/utils/cargo-bin` | codigo | 62 | `sem equivalente` |
| `codex-rs/utils/cargo-bin/src/lib.rs` | `codex-rs/utils/cargo-bin` | codigo | 258 | `sem equivalente` |
| `codex-rs/utils/cli/BUILD.bazel` | `codex-rs/utils/cli` | codigo | 6 | `packages/coding-agent/src/cli/` |
| `codex-rs/utils/cli/src/approval_mode_cli_arg.rs` | `codex-rs/utils/cli` | codigo | 25 | `packages/coding-agent/src/cli/` |
| `codex-rs/utils/cli/src/config_override.rs` | `codex-rs/utils/cli` | codigo | 203 | `packages/coding-agent/src/cli/` |
| `codex-rs/utils/cli/src/format_env_display.rs` | `codex-rs/utils/cli` | codigo | 72 | `packages/coding-agent/src/cli/` |
| `codex-rs/utils/cli/src/lib.rs` | `codex-rs/utils/cli` | codigo | 16 | `packages/coding-agent/src/cli/` |
| `codex-rs/utils/cli/src/resume_command.rs` | `codex-rs/utils/cli` | codigo | 103 | `packages/coding-agent/src/cli/` |
| `codex-rs/utils/cli/src/sandbox_mode_cli_arg.rs` | `codex-rs/utils/cli` | codigo | 46 | `packages/coding-agent/src/cli/` |
| `codex-rs/utils/cli/src/shared_options.rs` | `codex-rs/utils/cli` | codigo | 220 | `packages/coding-agent/src/cli/` |
| `codex-rs/utils/cli/src/shared_options_tests.rs` | `codex-rs/utils/cli` | teste | 30 | `packages/coding-agent/src/cli/` |
| `codex-rs/utils/critical-path/BUILD.bazel` | `codex-rs/utils/critical-path` | codigo | 6 | `packages/coding-agent/src/core/timings.ts` |
| `codex-rs/utils/critical-path/src/critical_path_tests.rs` | `codex-rs/utils/critical-path` | teste | 615 | `packages/coding-agent/src/core/timings.ts` |
| `codex-rs/utils/critical-path/src/lib.rs` | `codex-rs/utils/critical-path` | codigo | 235 | `packages/coding-agent/src/core/timings.ts` |
| `codex-rs/utils/critical-path/src/review_execution.rs` | `codex-rs/utils/critical-path` | codigo | 168 | `packages/coding-agent/src/core/timings.ts` |
| `codex-rs/utils/elapsed/BUILD.bazel` | `codex-rs/utils/elapsed` | codigo | 6 | `packages/coding-agent/src/core/timings.ts` |
| `codex-rs/utils/elapsed/src/lib.rs` | `codex-rs/utils/elapsed` | codigo | 71 | `packages/coding-agent/src/core/timings.ts` |
| `codex-rs/utils/fuzzy-match/BUILD.bazel` | `codex-rs/utils/fuzzy-match` | codigo | 6 | `packages/tui/src/fuzzy.ts` |
| `codex-rs/utils/fuzzy-match/src/lib.rs` | `codex-rs/utils/fuzzy-match` | codigo | 163 | `packages/tui/src/fuzzy.ts` |
| `codex-rs/utils/git-discovery/BUILD.bazel` | `codex-rs/utils/git-discovery` | codigo | 6 | `packages/coding-agent/src/extensions/git-checkpoint/` |
| `codex-rs/utils/git-discovery/src/git_root_discovery_tests.rs` | `codex-rs/utils/git-discovery` | teste | 185 | `packages/coding-agent/src/extensions/git-checkpoint/` |
| `codex-rs/utils/git-discovery/src/lib.rs` | `codex-rs/utils/git-discovery` | codigo | 120 | `packages/coding-agent/src/extensions/git-checkpoint/` |
| `codex-rs/utils/head-tail-buffer/BUILD.bazel` | `codex-rs/utils/head-tail-buffer` | codigo | 6 | `packages/coding-agent/src/core/tools/truncate.ts` |
| `codex-rs/utils/head-tail-buffer/src/head_tail_buffer_tests.rs` | `codex-rs/utils/head-tail-buffer` | teste | 91 | `packages/coding-agent/src/core/tools/truncate.ts` |
| `codex-rs/utils/head-tail-buffer/src/lib.rs` | `codex-rs/utils/head-tail-buffer` | codigo | 170 | `packages/coding-agent/src/core/tools/truncate.ts` |
| `codex-rs/utils/home-dir/BUILD.bazel` | `codex-rs/utils/home-dir` | codigo | 6 | `packages/coding-agent/src/config.ts` |
| `codex-rs/utils/home-dir/src/lib.rs` | `codex-rs/utils/home-dir` | codigo | 134 | `packages/coding-agent/src/config.ts` |
| `codex-rs/utils/image/BUILD.bazel` | `codex-rs/utils/image` | codigo | 6 | `packages/coding-agent/src/utils/image-resize.ts` |
| `codex-rs/utils/image/benches/prompt_images.rs` | `codex-rs/utils/image` | teste | 178 | `packages/coding-agent/src/utils/image-resize.ts` |
| `codex-rs/utils/image/src/error.rs` | `codex-rs/utils/image` | codigo | 65 | `packages/coding-agent/src/utils/image-resize.ts` |
| `codex-rs/utils/image/src/image_tests.rs` | `codex-rs/utils/image` | teste | 437 | `packages/coding-agent/src/utils/image-resize.ts` |
| `codex-rs/utils/image/src/lib.rs` | `codex-rs/utils/image` | codigo | 495 | `packages/coding-agent/src/utils/image-resize.ts` |
| `codex-rs/utils/image/src/sanitizer.rs` | `codex-rs/utils/image` | codigo | 167 | `packages/coding-agent/src/utils/image-resize.ts` |
| `codex-rs/utils/json-to-toml/BUILD.bazel` | `codex-rs/utils/json-to-toml` | codigo | 6 | `sem equivalente` |
| `codex-rs/utils/json-to-toml/src/lib.rs` | `codex-rs/utils/json-to-toml` | codigo | 83 | `sem equivalente` |
| `codex-rs/utils/model-facing-id/BUILD.bazel` | `codex-rs/utils/model-facing-id` | codigo | 6 | `packages/ai/src/model-catalog.ts` |
| `codex-rs/utils/model-facing-id/src/bindings.rs` | `codex-rs/utils/model-facing-id` | codigo | 59 | `packages/ai/src/model-catalog.ts` |
| `codex-rs/utils/model-facing-id/src/environment.rs` | `codex-rs/utils/model-facing-id` | codigo | 56 | `packages/ai/src/model-catalog.ts` |
| `codex-rs/utils/model-facing-id/src/lib.rs` | `codex-rs/utils/model-facing-id` | codigo | 230 | `packages/ai/src/model-catalog.ts` |
| `codex-rs/utils/model-facing-id/tests/generator.rs` | `codex-rs/utils/model-facing-id` | teste | 207 | `packages/ai/src/model-catalog.ts` |
| `codex-rs/utils/oss/BUILD.bazel` | `codex-rs/utils/oss` | codigo | 6 | `packages/ai/src/providers/` |
| `codex-rs/utils/oss/src/lib.rs` | `codex-rs/utils/oss` | codigo | 62 | `packages/ai/src/providers/` |
| `codex-rs/utils/output-truncation/BUILD.bazel` | `codex-rs/utils/output-truncation` | codigo | 6 | `packages/coding-agent/src/core/tools/truncate.ts` |
| `codex-rs/utils/output-truncation/src/lib.rs` | `codex-rs/utils/output-truncation` | codigo | 481 | `packages/coding-agent/src/core/tools/truncate.ts` |
| `codex-rs/utils/output-truncation/src/truncate_tests.rs` | `codex-rs/utils/output-truncation` | teste | 603 | `packages/coding-agent/src/core/tools/truncate.ts` |
| `codex-rs/utils/path-uri/BUILD.bazel` | `codex-rs/utils/path-uri` | codigo | 6 | `packages/coding-agent/src/core/tools/path-utils.ts` |
| `codex-rs/utils/path-uri/src/absolute_path_normalization.rs` | `codex-rs/utils/path-uri` | codigo | 46 | `packages/coding-agent/src/core/tools/path-utils.ts` |
| `codex-rs/utils/path-uri/src/api_path_string.rs` | `codex-rs/utils/path-uri` | codigo | 458 | `packages/coding-agent/src/core/tools/path-utils.ts` |
| `codex-rs/utils/path-uri/src/api_path_string_tests.rs` | `codex-rs/utils/path-uri` | teste | 718 | `packages/coding-agent/src/core/tools/path-utils.ts` |
| `codex-rs/utils/path-uri/src/config_path.rs` | `codex-rs/utils/path-uri` | codigo | 177 | `packages/coding-agent/src/core/tools/path-utils.ts` |
| `codex-rs/utils/path-uri/src/config_path_tests.rs` | `codex-rs/utils/path-uri` | teste | 228 | `packages/coding-agent/src/core/tools/path-utils.ts` |
| `codex-rs/utils/path-uri/src/lib.rs` | `codex-rs/utils/path-uri` | codigo | 1041 | `packages/coding-agent/src/core/tools/path-utils.ts` |
| `codex-rs/utils/path-uri/src/native_path_bytes.rs` | `codex-rs/utils/path-uri` | codigo | 51 | `packages/coding-agent/src/core/tools/path-utils.ts` |
| `codex-rs/utils/path-uri/src/platform.rs` | `codex-rs/utils/path-uri` | codigo | 51 | `packages/coding-agent/src/core/tools/path-utils.ts` |
| `codex-rs/utils/path-uri/src/platform_tests.rs` | `codex-rs/utils/path-uri` | teste | 43 | `packages/coding-agent/src/core/tools/path-utils.ts` |
| `codex-rs/utils/path-uri/src/tests.rs` | `codex-rs/utils/path-uri` | codigo | 1427 | `packages/coding-agent/src/core/tools/path-utils.ts` |
| `codex-rs/utils/path-utils/BUILD.bazel` | `codex-rs/utils/path-utils` | codigo | 6 | `packages/coding-agent/src/core/tools/path-utils.ts` |
| `codex-rs/utils/path-utils/src/env.rs` | `codex-rs/utils/path-utils` | codigo | 19 | `packages/coding-agent/src/core/tools/path-utils.ts` |
| `codex-rs/utils/path-utils/src/lib.rs` | `codex-rs/utils/path-utils` | codigo | 260 | `packages/coding-agent/src/core/tools/path-utils.ts` |
| `codex-rs/utils/path-utils/src/path_utils_tests.rs` | `codex-rs/utils/path-utils` | teste | 180 | `packages/coding-agent/src/core/tools/path-utils.ts` |
| `codex-rs/utils/path-utils/src/system_commands.rs` | `codex-rs/utils/path-utils` | codigo | 180 | `packages/coding-agent/src/core/tools/path-utils.ts` |
| `codex-rs/utils/path-utils/src/system_commands_tests.rs` | `codex-rs/utils/path-utils` | teste | 31 | `packages/coding-agent/src/core/tools/path-utils.ts` |
| `codex-rs/utils/plugins/BUILD.bazel` | `codex-rs/utils/plugins` | codigo | 6 | `packages/coding-agent/src/core/package-manager.ts` |
| `codex-rs/utils/plugins/src/lib.rs` | `codex-rs/utils/plugins` | codigo | 53 | `packages/coding-agent/src/core/package-manager.ts` |
| `codex-rs/utils/plugins/src/mcp_connector.rs` | `codex-rs/utils/plugins` | codigo | 20 | `packages/coding-agent/src/core/package-manager.ts` |
| `codex-rs/utils/plugins/src/mention_syntax.rs` | `codex-rs/utils/plugins` | codigo | 7 | `packages/coding-agent/src/core/package-manager.ts` |
| `codex-rs/utils/plugins/src/plugin_namespace.rs` | `codex-rs/utils/plugins` | codigo | 366 | `packages/coding-agent/src/core/package-manager.ts` |
| `codex-rs/utils/process/BUILD.bazel` | `codex-rs/utils/process` | codigo | 6 | `packages/coding-agent/src/core/exec.ts` |
| `codex-rs/utils/process/src/background_command_tests.rs` | `codex-rs/utils/process` | teste | 54 | `packages/coding-agent/src/core/exec.ts` |
| `codex-rs/utils/process/src/lib.rs` | `codex-rs/utils/process` | codigo | 26 | `packages/coding-agent/src/core/exec.ts` |
| `codex-rs/utils/pty/BUILD.bazel` | `codex-rs/utils/pty` | codigo | 6 | `packages/coding-agent/src/extensions/processos/` |
| `codex-rs/utils/pty/src/child.rs` | `codex-rs/utils/pty` | codigo | 139 | `packages/coding-agent/src/extensions/processos/` |
| `codex-rs/utils/pty/src/child_command.rs` | `codex-rs/utils/pty` | codigo | 393 | `packages/coding-agent/src/extensions/processos/` |
| `codex-rs/utils/pty/src/child_reaper.rs` | `codex-rs/utils/pty` | codigo | 68 | `packages/coding-agent/src/extensions/processos/` |
| `codex-rs/utils/pty/src/child_tests.rs` | `codex-rs/utils/pty` | teste | 400 | `packages/coding-agent/src/extensions/processos/` |
| `codex-rs/utils/pty/src/command_validation_tests.rs` | `codex-rs/utils/pty` | teste | 126 | `packages/coding-agent/src/extensions/processos/` |
| `codex-rs/utils/pty/src/lib.rs` | `codex-rs/utils/pty` | codigo | 70 | `packages/coding-agent/src/extensions/processos/` |
| `codex-rs/utils/pty/src/linux_child_tests.rs` | `codex-rs/utils/pty` | teste | 59 | `packages/coding-agent/src/extensions/processos/` |
| `codex-rs/utils/pty/src/linux_fds.rs` | `codex-rs/utils/pty` | codigo | 129 | `packages/coding-agent/src/extensions/processos/` |
| `codex-rs/utils/pty/src/linux_fds_tests.rs` | `codex-rs/utils/pty` | teste | 246 | `packages/coding-agent/src/extensions/processos/` |
| `codex-rs/utils/pty/src/macos_child_tests.rs` | `codex-rs/utils/pty` | teste | 294 | `packages/coding-agent/src/extensions/processos/` |
| `codex-rs/utils/pty/src/macos_descriptor_tests.rs` | `codex-rs/utils/pty` | teste | 218 | `packages/coding-agent/src/extensions/processos/` |
| `codex-rs/utils/pty/src/pipe.rs` | `codex-rs/utils/pty` | codigo | 355 | `packages/coding-agent/src/extensions/processos/` |
| `codex-rs/utils/pty/src/pipe_tests.rs` | `codex-rs/utils/pty` | teste | 20 | `packages/coding-agent/src/extensions/processos/` |
| `codex-rs/utils/pty/src/pipe_unix_tests.rs` | `codex-rs/utils/pty` | teste | 137 | `packages/coding-agent/src/extensions/processos/` |
| `codex-rs/utils/pty/src/posix_child.rs` | `codex-rs/utils/pty` | codigo | 488 | `packages/coding-agent/src/extensions/processos/` |
| `codex-rs/utils/pty/src/process.rs` | `codex-rs/utils/pty` | codigo | 482 | `packages/coding-agent/src/extensions/processos/` |
| `codex-rs/utils/pty/src/process_group.rs` | `codex-rs/utils/pty` | codigo | 336 | `packages/coding-agent/src/extensions/processos/` |
| `codex-rs/utils/pty/src/process_group_tests.rs` | `codex-rs/utils/pty` | teste | 94 | `packages/coding-agent/src/extensions/processos/` |
| `codex-rs/utils/pty/src/pty.rs` | `codex-rs/utils/pty` | codigo | 739 | `packages/coding-agent/src/extensions/processos/` |
| `codex-rs/utils/pty/src/pty_linux_tests.rs` | `codex-rs/utils/pty` | teste | 69 | `packages/coding-agent/src/extensions/processos/` |
| `codex-rs/utils/pty/src/spawn_helper.rs` | `codex-rs/utils/pty` | codigo | 201 | `packages/coding-agent/src/extensions/processos/` |
| `codex-rs/utils/pty/src/spawn_helper_main.rs` | `codex-rs/utils/pty` | codigo | 119 | `packages/coding-agent/src/extensions/processos/` |
| `codex-rs/utils/pty/src/spawn_helper_tests.rs` | `codex-rs/utils/pty` | teste | 805 | `packages/coding-agent/src/extensions/processos/` |
| `codex-rs/utils/pty/src/tests.rs` | `codex-rs/utils/pty` | codigo | 1710 | `packages/coding-agent/src/extensions/processos/` |
| `codex-rs/utils/pty/src/unix_io.rs` | `codex-rs/utils/pty` | codigo | 109 | `packages/coding-agent/src/extensions/processos/` |
| `codex-rs/utils/pty/src/win/conpty.rs` | `codex-rs/utils/pty` | codigo | 192 | `packages/coding-agent/src/extensions/processos/` |
| `codex-rs/utils/pty/src/win/job.rs` | `codex-rs/utils/pty` | codigo | 396 | `packages/coding-agent/src/extensions/processos/` |
| `codex-rs/utils/pty/src/win/job_tests.rs` | `codex-rs/utils/pty` | teste | 87 | `packages/coding-agent/src/extensions/processos/` |
| `codex-rs/utils/pty/src/win/mod.rs` | `codex-rs/utils/pty` | codigo | 181 | `packages/coding-agent/src/extensions/processos/` |
| `codex-rs/utils/pty/src/win/procthreadattr.rs` | `codex-rs/utils/pty` | codigo | 127 | `packages/coding-agent/src/extensions/processos/` |
| `codex-rs/utils/pty/src/win/psuedocon.rs` | `codex-rs/utils/pty` | codigo | 387 | `packages/coding-agent/src/extensions/processos/` |
| `codex-rs/utils/pty/src/win/psuedocon_tests.rs` | `codex-rs/utils/pty` | teste | 140 | `packages/coding-agent/src/extensions/processos/` |
| `codex-rs/utils/pty/src/windows_input.rs` | `codex-rs/utils/pty` | codigo | 35 | `packages/coding-agent/src/extensions/processos/` |
| `codex-rs/utils/pty/src/windows_input_tests.rs` | `codex-rs/utils/pty` | teste | 16 | `packages/coding-agent/src/extensions/processos/` |
| `codex-rs/utils/pty/src/windows_tests.rs` | `codex-rs/utils/pty` | teste | 518 | `packages/coding-agent/src/extensions/processos/` |
| `codex-rs/utils/pty/tests/conpty_search_path.rs` | `codex-rs/utils/pty` | teste | 70 | `packages/coding-agent/src/extensions/processos/` |
| `codex-rs/utils/pty/tests/macos_pipe_spawn.rs` | `codex-rs/utils/pty` | teste | 166 | `packages/coding-agent/src/extensions/processos/` |
| `codex-rs/utils/readiness/BUILD.bazel` | `codex-rs/utils/readiness` | codigo | 6 | `sem equivalente` |
| `codex-rs/utils/readiness/src/lib.rs` | `codex-rs/utils/readiness` | codigo | 336 | `sem equivalente` |
| `codex-rs/utils/redacted-string/BUILD.bazel` | `codex-rs/utils/redacted-string` | codigo | 6 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/utils/redacted-string/src/lib.rs` | `codex-rs/utils/redacted-string` | codigo | 71 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/utils/rustls-provider/BUILD.bazel` | `codex-rs/utils/rustls-provider` | codigo | 6 | `sem equivalente` |
| `codex-rs/utils/rustls-provider/src/lib.rs` | `codex-rs/utils/rustls-provider` | codigo | 39 | `sem equivalente` |
| `codex-rs/utils/rustls-provider/tests/preinstalled.rs` | `codex-rs/utils/rustls-provider` | teste | 26 | `sem equivalente` |
| `codex-rs/utils/rustls-provider/tests/provider.rs` | `codex-rs/utils/rustls-provider` | teste | 16 | `sem equivalente` |
| `codex-rs/utils/sandbox-summary/BUILD.bazel` | `codex-rs/utils/sandbox-summary` | codigo | 6 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/utils/sandbox-summary/src/lib.rs` | `codex-rs/utils/sandbox-summary` | codigo | 3 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/utils/sandbox-summary/src/sandbox_summary.rs` | `codex-rs/utils/sandbox-summary` | codigo | 274 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/utils/sleep-inhibitor/BUILD.bazel` | `codex-rs/utils/sleep-inhibitor` | codigo | 6 | `sem equivalente` |
| `codex-rs/utils/sleep-inhibitor/src/dummy.rs` | `codex-rs/utils/sleep-inhibitor` | codigo | 12 | `sem equivalente` |
| `codex-rs/utils/sleep-inhibitor/src/iokit_bindings.rs` | `codex-rs/utils/sleep-inhibitor` | codigo | 27 | `sem equivalente` |
| `codex-rs/utils/sleep-inhibitor/src/lib.rs` | `codex-rs/utils/sleep-inhibitor` | codigo | 113 | `sem equivalente` |
| `codex-rs/utils/sleep-inhibitor/src/linux_inhibitor.rs` | `codex-rs/utils/sleep-inhibitor` | codigo | 230 | `sem equivalente` |
| `codex-rs/utils/sleep-inhibitor/src/macos.rs` | `codex-rs/utils/sleep-inhibitor` | codigo | 107 | `sem equivalente` |
| `codex-rs/utils/sleep-inhibitor/src/windows_inhibitor.rs` | `codex-rs/utils/sleep-inhibitor` | codigo | 119 | `sem equivalente` |
| `codex-rs/utils/stream-parser/BUILD.bazel` | `codex-rs/utils/stream-parser` | codigo | 6 | `packages/ai/src/utils/` |
| `codex-rs/utils/stream-parser/src/assistant_text.rs` | `codex-rs/utils/stream-parser` | codigo | 130 | `packages/ai/src/utils/` |
| `codex-rs/utils/stream-parser/src/citation.rs` | `codex-rs/utils/stream-parser` | codigo | 179 | `packages/ai/src/utils/` |
| `codex-rs/utils/stream-parser/src/inline_hidden_tag.rs` | `codex-rs/utils/stream-parser` | codigo | 344 | `packages/ai/src/utils/` |
| `codex-rs/utils/stream-parser/src/lib.rs` | `codex-rs/utils/stream-parser` | codigo | 23 | `packages/ai/src/utils/` |
| `codex-rs/utils/stream-parser/src/proposed_plan.rs` | `codex-rs/utils/stream-parser` | codigo | 212 | `packages/ai/src/utils/` |
| `codex-rs/utils/stream-parser/src/stream_text.rs` | `codex-rs/utils/stream-parser` | codigo | 36 | `packages/ai/src/utils/` |
| `codex-rs/utils/stream-parser/src/tagged_line_parser.rs` | `codex-rs/utils/stream-parser` | codigo | 249 | `packages/ai/src/utils/` |
| `codex-rs/utils/stream-parser/src/utf8_stream.rs` | `codex-rs/utils/stream-parser` | codigo | 333 | `packages/ai/src/utils/` |
| `codex-rs/utils/string/BUILD.bazel` | `codex-rs/utils/string` | codigo | 6 | `packages/tui/src/utils.ts` |
| `codex-rs/utils/string/src/json.rs` | `codex-rs/utils/string` | codigo | 190 | `packages/tui/src/utils.ts` |
| `codex-rs/utils/string/src/lib.rs` | `codex-rs/utils/string` | codigo | 170 | `packages/tui/src/utils.ts` |
| `codex-rs/utils/string/src/truncate.rs` | `codex-rs/utils/string` | codigo | 163 | `packages/tui/src/utils.ts` |
| `codex-rs/utils/string/src/truncate/tests.rs` | `codex-rs/utils/string` | codigo | 165 | `packages/tui/src/utils.ts` |
| `codex-rs/utils/template/BUILD.bazel` | `codex-rs/utils/template` | codigo | 6 | `packages/coding-agent/src/core/prompt-templates.ts` |
| `codex-rs/utils/template/src/lib.rs` | `codex-rs/utils/template` | codigo | 442 | `packages/coding-agent/src/core/prompt-templates.ts` |
| `codex-rs/voice-host/BUILD.bazel` | `codex-rs/voice-host` | codigo | 13 | `apps/p2/plugins/voice/` |
| `codex-rs/voice-host/src/audio_sink.rs` | `codex-rs/voice-host` | codigo | 122 | `apps/p2/plugins/voice/` |
| `codex-rs/voice-host/src/audio_sink_tests.rs` | `codex-rs/voice-host` | teste | 120 | `apps/p2/plugins/voice/` |
| `codex-rs/voice-host/src/audio_track.rs` | `codex-rs/voice-host` | codigo | 172 | `apps/p2/plugins/voice/` |
| `codex-rs/voice-host/src/audio_track_tests.rs` | `codex-rs/voice-host` | teste | 17 | `apps/p2/plugins/voice/` |
| `codex-rs/voice-host/src/capture_worker.rs` | `codex-rs/voice-host` | codigo | 138 | `apps/p2/plugins/voice/` |
| `codex-rs/voice-host/src/capture_worker_tests.rs` | `codex-rs/voice-host` | teste | 440 | `apps/p2/plugins/voice/` |
| `codex-rs/voice-host/src/device_buffers.rs` | `codex-rs/voice-host` | codigo | 270 | `apps/p2/plugins/voice/` |
| `codex-rs/voice-host/src/device_buffers_tests.rs` | `codex-rs/voice-host` | teste | 252 | `apps/p2/plugins/voice/` |
| `codex-rs/voice-host/src/devices.rs` | `codex-rs/voice-host` | codigo | 517 | `apps/p2/plugins/voice/` |
| `codex-rs/voice-host/src/devices_tests.rs` | `codex-rs/voice-host` | teste | 458 | `apps/p2/plugins/voice/` |
| `codex-rs/voice-host/src/devices_unavailable.rs` | `codex-rs/voice-host` | codigo | 40 | `apps/p2/plugins/voice/` |
| `codex-rs/voice-host/src/incoming.rs` | `codex-rs/voice-host` | codigo | 167 | `apps/p2/plugins/voice/` |
| `codex-rs/voice-host/src/incoming_tests.rs` | `codex-rs/voice-host` | teste | 119 | `apps/p2/plugins/voice/` |
| `codex-rs/voice-host/src/input_channel.rs` | `codex-rs/voice-host` | codigo | 45 | `apps/p2/plugins/voice/` |
| `codex-rs/voice-host/src/input_channel_tests.rs` | `codex-rs/voice-host` | teste | 72 | `apps/p2/plugins/voice/` |
| `codex-rs/voice-host/src/main.rs` | `codex-rs/voice-host` | codigo | 287 | `apps/p2/plugins/voice/` |
| `codex-rs/voice-host/src/main_tests.rs` | `codex-rs/voice-host` | teste | 132 | `apps/p2/plugins/voice/` |
| `codex-rs/voice-host/src/playback.rs` | `codex-rs/voice-host` | codigo | 116 | `apps/p2/plugins/voice/` |
| `codex-rs/voice-host/src/playback_tests.rs` | `codex-rs/voice-host` | teste | 97 | `apps/p2/plugins/voice/` |
| `codex-rs/voice-host/src/playout.rs` | `codex-rs/voice-host` | codigo | 175 | `apps/p2/plugins/voice/` |
| `codex-rs/voice-host/src/playout_tests.rs` | `codex-rs/voice-host` | teste | 284 | `apps/p2/plugins/voice/` |
| `codex-rs/voice-host/src/processing.rs` | `codex-rs/voice-host` | codigo | 270 | `apps/p2/plugins/voice/` |
| `codex-rs/voice-host/src/processing_tests.rs` | `codex-rs/voice-host` | teste | 324 | `apps/p2/plugins/voice/` |
| `codex-rs/voice-host/src/runtime.rs` | `codex-rs/voice-host` | codigo | 161 | `apps/p2/plugins/voice/` |
| `codex-rs/voice-host/src/service_failure.rs` | `codex-rs/voice-host` | codigo | 32 | `apps/p2/plugins/voice/` |
| `codex-rs/voice-host/src/transport.rs` | `codex-rs/voice-host` | codigo | 246 | `apps/p2/plugins/voice/` |
| `codex-rs/voice-host/src/transport_network_tests.rs` | `codex-rs/voice-host` | teste | 134 | `apps/p2/plugins/voice/` |
| `codex-rs/voice-host/src/transport_runtime.rs` | `codex-rs/voice-host` | codigo | 119 | `apps/p2/plugins/voice/` |
| `codex-rs/voice-host/src/transport_runtime_tests.rs` | `codex-rs/voice-host` | teste | 55 | `apps/p2/plugins/voice/` |
| `codex-rs/voice-host/src/transport_tests.rs` | `codex-rs/voice-host` | teste | 210 | `apps/p2/plugins/voice/` |
| `codex-rs/voice-host/tests/common/mod.rs` | `codex-rs/voice-host` | teste | 31 | `apps/p2/plugins/voice/` |
| `codex-rs/voice-host/tests/installed_client.rs` | `codex-rs/voice-host` | teste | 370 | `apps/p2/plugins/voice/` |
| `codex-rs/voice-host/tests/lifecycle.rs` | `codex-rs/voice-host` | teste | 139 | `apps/p2/plugins/voice/` |
| `codex-rs/voice-host/tests/packaged_runtime.rs` | `codex-rs/voice-host` | teste | 90 | `apps/p2/plugins/voice/` |
| `codex-rs/workload-identity/BUILD.bazel` | `codex-rs/workload-identity` | codigo | 6 | `sem equivalente` |
| `codex-rs/workload-identity/src/assertion.rs` | `codex-rs/workload-identity` | codigo | 52 | `sem equivalente` |
| `codex-rs/workload-identity/src/exchange.rs` | `codex-rs/workload-identity` | codigo | 425 | `sem equivalente` |
| `codex-rs/workload-identity/src/lib.rs` | `codex-rs/workload-identity` | codigo | 144 | `sem equivalente` |
| `codex-rs/workload-identity/src/spiffe.rs` | `codex-rs/workload-identity` | codigo | 170 | `sem equivalente` |
| `codex-rs/workload-identity/src/spiffe_tests.rs` | `codex-rs/workload-identity` | teste | 324 | `sem equivalente` |
| `codex-rs/workload-identity/src/workload_identity_tests.rs` | `codex-rs/workload-identity` | teste | 550 | `sem equivalente` |
