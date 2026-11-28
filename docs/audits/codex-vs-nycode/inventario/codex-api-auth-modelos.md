# Inventário: codex-api-auth-modelos

Crates `codex-api`, `codex-client`, `http-*`, `websocket-*`, `login`, `models-*`, providers. Total nesta partição: **387** arquivos.

| Arquivo (Codex) | Crate | Categoria | LOC | Equivalente no nycode |
|---|---|---|---:|---|
| `codex-rs/aws-auth/BUILD.bazel` | `codex-rs/aws-auth` | codigo | 6 | `packages/ai/src/api/bedrock-converse-stream.ts` |
| `codex-rs/aws-auth/src/config.rs` | `codex-rs/aws-auth` | codigo | 43 | `packages/ai/src/api/bedrock-converse-stream.ts` |
| `codex-rs/aws-auth/src/discovery.rs` | `codex-rs/aws-auth` | codigo | 69 | `packages/ai/src/api/bedrock-converse-stream.ts` |
| `codex-rs/aws-auth/src/lib.rs` | `codex-rs/aws-auth` | codigo | 319 | `packages/ai/src/api/bedrock-converse-stream.ts` |
| `codex-rs/aws-auth/src/lib_tests.rs` | `codex-rs/aws-auth` | teste | 219 | `packages/ai/src/api/bedrock-converse-stream.ts` |
| `codex-rs/aws-auth/src/network_policy_tests.rs` | `codex-rs/aws-auth` | teste | 469 | `packages/ai/src/api/bedrock-converse-stream.ts` |
| `codex-rs/aws-auth/src/signing.rs` | `codex-rs/aws-auth` | codigo | 76 | `packages/ai/src/api/bedrock-converse-stream.ts` |
| `codex-rs/aws-auth/src/transport.rs` | `codex-rs/aws-auth` | codigo | 119 | `packages/ai/src/api/bedrock-converse-stream.ts` |
| `codex-rs/backend-client/BUILD.bazel` | `codex-rs/backend-client` | codigo | 7 | `sem equivalente` |
| `codex-rs/backend-client/src/analytics_session.rs` | `codex-rs/backend-client` | codigo | 182 | `sem equivalente` |
| `codex-rs/backend-client/src/analytics_session_tests.rs` | `codex-rs/backend-client` | teste | 114 | `sem equivalente` |
| `codex-rs/backend-client/src/client.rs` | `codex-rs/backend-client` | codigo | 1464 | `sem equivalente` |
| `codex-rs/backend-client/src/client/analytics.rs` | `codex-rs/backend-client` | codigo | 130 | `sem equivalente` |
| `codex-rs/backend-client/src/client/analytics_tests.rs` | `codex-rs/backend-client` | teste | 190 | `sem equivalente` |
| `codex-rs/backend-client/src/client/chatgpt_turn_cost.rs` | `codex-rs/backend-client` | codigo | 81 | `sem equivalente` |
| `codex-rs/backend-client/src/client/chatgpt_turn_cost_tests.rs` | `codex-rs/backend-client` | teste | 108 | `sem equivalente` |
| `codex-rs/backend-client/src/client/plan_history.rs` | `codex-rs/backend-client` | codigo | 87 | `sem equivalente` |
| `codex-rs/backend-client/src/client/plan_history_tests.rs` | `codex-rs/backend-client` | teste | 51 | `sem equivalente` |
| `codex-rs/backend-client/src/client/profile.rs` | `codex-rs/backend-client` | codigo | 75 | `sem equivalente` |
| `codex-rs/backend-client/src/client/profile_tests.rs` | `codex-rs/backend-client` | teste | 126 | `sem equivalente` |
| `codex-rs/backend-client/src/client/rate_limit_resets.rs` | `codex-rs/backend-client` | codigo | 163 | `sem equivalente` |
| `codex-rs/backend-client/src/client/rate_limit_resets_tests.rs` | `codex-rs/backend-client` | teste | 189 | `sem equivalente` |
| `codex-rs/backend-client/src/client/runtime_auth_tests.rs` | `codex-rs/backend-client` | teste | 673 | `sem equivalente` |
| `codex-rs/backend-client/src/client/task_usage.rs` | `codex-rs/backend-client` | codigo | 229 | `sem equivalente` |
| `codex-rs/backend-client/src/client/task_usage_tests.rs` | `codex-rs/backend-client` | teste | 132 | `sem equivalente` |
| `codex-rs/backend-client/src/client/thread_usage.rs` | `codex-rs/backend-client` | codigo | 130 | `sem equivalente` |
| `codex-rs/backend-client/src/client/thread_usage_tests.rs` | `codex-rs/backend-client` | teste | 363 | `sem equivalente` |
| `codex-rs/backend-client/src/client/turn_usage.rs` | `codex-rs/backend-client` | codigo | 247 | `sem equivalente` |
| `codex-rs/backend-client/src/client_request_tests.rs` | `codex-rs/backend-client` | teste | 514 | `sem equivalente` |
| `codex-rs/backend-client/src/lib.rs` | `codex-rs/backend-client` | codigo | 64 | `sem equivalente` |
| `codex-rs/backend-client/src/types.rs` | `codex-rs/backend-client` | codigo | 681 | `sem equivalente` |
| `codex-rs/chatgpt/BUILD.bazel` | `codex-rs/chatgpt` | codigo | 6 | `packages/coding-agent/src/core/` |
| `codex-rs/chatgpt/src/apply_command.rs` | `codex-rs/chatgpt` | codigo | 77 | `packages/coding-agent/src/core/` |
| `codex-rs/chatgpt/src/chatgpt_client.rs` | `codex-rs/chatgpt` | codigo | 242 | `packages/coding-agent/src/core/` |
| `codex-rs/chatgpt/src/chatgpt_client_runtime_auth_tests.rs` | `codex-rs/chatgpt` | teste | 321 | `packages/coding-agent/src/core/` |
| `codex-rs/chatgpt/src/connectors.rs` | `codex-rs/chatgpt` | codigo | 523 | `packages/coding-agent/src/core/` |
| `codex-rs/chatgpt/src/get_task.rs` | `codex-rs/chatgpt` | codigo | 40 | `packages/coding-agent/src/core/` |
| `codex-rs/chatgpt/src/lib.rs` | `codex-rs/chatgpt` | codigo | 6 | `packages/coding-agent/src/core/` |
| `codex-rs/chatgpt/tests/all.rs` | `codex-rs/chatgpt` | teste | 3 | `packages/coding-agent/src/core/` |
| `codex-rs/chatgpt/tests/suite/apply_command_e2e.rs` | `codex-rs/chatgpt` | teste | 188 | `packages/coding-agent/src/core/` |
| `codex-rs/chatgpt/tests/suite/mod.rs` | `codex-rs/chatgpt` | teste | 2 | `packages/coding-agent/src/core/` |
| `codex-rs/codex-api/BUILD.bazel` | `codex-rs/codex-api` | codigo | 6 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/api_bridge.rs` | `codex-rs/codex-api` | codigo | 412 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/api_bridge_tests.rs` | `codex-rs/codex-api` | teste | 997 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/auth.rs` | `codex-rs/codex-api` | codigo | 127 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/common.rs` | `codex-rs/codex-api` | codigo | 582 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/common_tests.rs` | `codex-rs/codex-api` | teste | 40 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/endpoint/images.rs` | `codex-rs/codex-api` | codigo | 417 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/endpoint/memories.rs` | `codex-rs/codex-api` | codigo | 227 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/endpoint/mod.rs` | `codex-rs/codex-api` | codigo | 37 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/endpoint/models.rs` | `codex-rs/codex-api` | codigo | 434 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/endpoint/realtime_call.rs` | `codex-rs/codex-api` | codigo | 812 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs` | `codex-rs/codex-api` | codigo | 3289 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/endpoint/realtime_websocket/methods/sideband.rs` | `codex-rs/codex-api` | codigo | 158 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/endpoint/realtime_websocket/methods/sideband_tests.rs` | `codex-rs/codex-api` | teste | 210 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/endpoint/realtime_websocket/methods_auth_tests.rs` | `codex-rs/codex-api` | teste | 174 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/endpoint/realtime_websocket/methods_common.rs` | `codex-rs/codex-api` | codigo | 178 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/endpoint/realtime_websocket/methods_common_tests.rs` | `codex-rs/codex-api` | teste | 150 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/endpoint/realtime_websocket/methods_frameless_bidi.rs` | `codex-rs/codex-api` | codigo | 129 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/endpoint/realtime_websocket/methods_frameless_bidi_tests.rs` | `codex-rs/codex-api` | teste | 102 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/endpoint/realtime_websocket/methods_v1.rs` | `codex-rs/codex-api` | codigo | 83 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/endpoint/realtime_websocket/methods_v2.rs` | `codex-rs/codex-api` | codigo | 180 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/endpoint/realtime_websocket/mod.rs` | `codex-rs/codex-api` | codigo | 22 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs` | `codex-rs/codex-api` | codigo | 284 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/endpoint/realtime_websocket/protocol_common.rs` | `codex-rs/codex-api` | codigo | 83 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/endpoint/realtime_websocket/protocol_frameless_bidi.rs` | `codex-rs/codex-api` | codigo | 99 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/endpoint/realtime_websocket/protocol_frameless_bidi_tests.rs` | `codex-rs/codex-api` | teste | 64 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/endpoint/realtime_websocket/protocol_v1.rs` | `codex-rs/codex-api` | codigo | 99 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/endpoint/realtime_websocket/protocol_v2.rs` | `codex-rs/codex-api` | codigo | 210 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/endpoint/realtime_websocket/transcript_tests.rs` | `codex-rs/codex-api` | teste | 131 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/endpoint/responses.rs` | `codex-rs/codex-api` | codigo | 201 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/endpoint/responses_websocket.rs` | `codex-rs/codex-api` | codigo | 1648 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/endpoint/responses_websocket/connector.rs` | `codex-rs/codex-api` | codigo | 51 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/endpoint/responses_websocket_probe.rs` | `codex-rs/codex-api` | codigo | 101 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/endpoint/search.rs` | `codex-rs/codex-api` | codigo | 324 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/endpoint/session.rs` | `codex-rs/codex-api` | codigo | 156 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/error.rs` | `codex-rs/codex-api` | codigo | 208 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/files.rs` | `codex-rs/codex-api` | codigo | 937 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/files_retry_tests.rs` | `codex-rs/codex-api` | teste | 234 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/guardian_assessment.rs` | `codex-rs/codex-api` | codigo | 36 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/images.rs` | `codex-rs/codex-api` | codigo | 93 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/lib.rs` | `codex-rs/codex-api` | codigo | 136 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/provider.rs` | `codex-rs/codex-api` | codigo | 67 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/rate_limits.rs` | `codex-rs/codex-api` | codigo | 382 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/requests/headers.rs` | `codex-rs/codex-api` | codigo | 60 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/requests/mod.rs` | `codex-rs/codex-api` | codigo | 4 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/requests/responses.rs` | `codex-rs/codex-api` | codigo | 6 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/responses_headers.rs` | `codex-rs/codex-api` | codigo | 32 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/safety_buffering.rs` | `codex-rs/codex-api` | codigo | 67 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/search.rs` | `codex-rs/codex-api` | codigo | 308 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/sse/mod.rs` | `codex-rs/codex-api` | codigo | 6 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/sse/responses.rs` | `codex-rs/codex-api` | codigo | 2172 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/sse/responses_error.rs` | `codex-rs/codex-api` | codigo | 127 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/sse/responses_error_parser_tests.rs` | `codex-rs/codex-api` | teste | 47 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/sse/responses_error_tests.rs` | `codex-rs/codex-api` | teste | 453 | `packages/ai/src/api/` |
| `codex-rs/codex-api/src/telemetry.rs` | `codex-rs/codex-api` | codigo | 98 | `packages/ai/src/api/` |
| `codex-rs/codex-api/tests/clients.rs` | `codex-rs/codex-api` | teste | 870 | `packages/ai/src/api/` |
| `codex-rs/codex-api/tests/models_integration.rs` | `codex-rs/codex-api` | teste | 217 | `packages/ai/src/api/` |
| `codex-rs/codex-api/tests/realtime_websocket_e2e.rs` | `codex-rs/codex-api` | teste | 842 | `packages/ai/src/api/` |
| `codex-rs/codex-api/tests/realtime_websocket_tls.rs` | `codex-rs/codex-api` | teste | 172 | `packages/ai/src/api/` |
| `codex-rs/codex-api/tests/responses_websocket_logging.rs` | `codex-rs/codex-api` | teste | 208 | `packages/ai/src/api/` |
| `codex-rs/codex-api/tests/responses_websocket_probe.rs` | `codex-rs/codex-api` | teste | 294 | `packages/ai/src/api/` |
| `codex-rs/codex-api/tests/sse_end_to_end.rs` | `codex-rs/codex-api` | teste | 470 | `packages/ai/src/api/` |
| `codex-rs/codex-backend-openapi-models/BUILD.bazel` | `codex-rs/codex-backend-openapi-models` | codigo | 6 | `sem equivalente` |
| `codex-rs/codex-backend-openapi-models/src/lib.rs` | `codex-rs/codex-backend-openapi-models` | codigo | 6 | `sem equivalente` |
| `codex-rs/codex-backend-openapi-models/src/models/additional_rate_limit_details.rs` | `codex-rs/codex-backend-openapi-models` | codigo | 38 | `sem equivalente` |
| `codex-rs/codex-backend-openapi-models/src/models/analytics.rs` | `codex-rs/codex-backend-openapi-models` | codigo | 230 | `sem equivalente` |
| `codex-rs/codex-backend-openapi-models/src/models/code_task_details_response.rs` | `codex-rs/codex-backend-openapi-models` | codigo | 42 | `sem equivalente` |
| `codex-rs/codex-backend-openapi-models/src/models/config_bundle_response.rs` | `codex-rs/codex-backend-openapi-models` | codigo | 40 | `sem equivalente` |
| `codex-rs/codex-backend-openapi-models/src/models/config_file_response.rs` | `codex-rs/codex-backend-openapi-models` | codigo | 40 | `sem equivalente` |
| `codex-rs/codex-backend-openapi-models/src/models/credit_status_details.rs` | `codex-rs/codex-backend-openapi-models` | codigo | 52 | `sem equivalente` |
| `codex-rs/codex-backend-openapi-models/src/models/delivered_config_toml.rs` | `codex-rs/codex-backend-openapi-models` | codigo | 40 | `sem equivalente` |
| `codex-rs/codex-backend-openapi-models/src/models/delivered_managed_layers.rs` | `codex-rs/codex-backend-openapi-models` | codigo | 33 | `sem equivalente` |
| `codex-rs/codex-backend-openapi-models/src/models/delivered_requirements_toml.rs` | `codex-rs/codex-backend-openapi-models` | codigo | 40 | `sem equivalente` |
| `codex-rs/codex-backend-openapi-models/src/models/delivered_toml_fragment.rs` | `codex-rs/codex-backend-openapi-models` | codigo | 28 | `sem equivalente` |
| `codex-rs/codex-backend-openapi-models/src/models/external_pull_request_response.rs` | `codex-rs/codex-backend-openapi-models` | codigo | 40 | `sem equivalente` |
| `codex-rs/codex-backend-openapi-models/src/models/git_pull_request.rs` | `codex-rs/codex-backend-openapi-models` | codigo | 77 | `sem equivalente` |
| `codex-rs/codex-backend-openapi-models/src/models/mod.rs` | `codex-rs/codex-backend-openapi-models` | codigo | 68 | `sem equivalente` |
| `codex-rs/codex-backend-openapi-models/src/models/paginated_list_task_list_item_.rs` | `codex-rs/codex-backend-openapi-models` | codigo | 30 | `sem equivalente` |
| `codex-rs/codex-backend-openapi-models/src/models/rate_limit_status_details.rs` | `codex-rs/codex-backend-openapi-models` | codigo | 46 | `sem equivalente` |
| `codex-rs/codex-backend-openapi-models/src/models/rate_limit_status_payload.rs` | `codex-rs/codex-backend-openapi-models` | codigo | 149 | `sem equivalente` |
| `codex-rs/codex-backend-openapi-models/src/models/rate_limit_window_snapshot.rs` | `codex-rs/codex-backend-openapi-models` | codigo | 39 | `sem equivalente` |
| `codex-rs/codex-backend-openapi-models/src/models/spend_control_limit_details.rs` | `codex-rs/codex-backend-openapi-models` | codigo | 60 | `sem equivalente` |
| `codex-rs/codex-backend-openapi-models/src/models/spend_control_status_details.rs` | `codex-rs/codex-backend-openapi-models` | codigo | 35 | `sem equivalente` |
| `codex-rs/codex-backend-openapi-models/src/models/task_list_item.rs` | `codex-rs/codex-backend-openapi-models` | codigo | 63 | `sem equivalente` |
| `codex-rs/codex-backend-openapi-models/src/models/task_response.rs` | `codex-rs/codex-backend-openapi-models` | codigo | 62 | `sem equivalente` |
| `codex-rs/codex-client/BUILD.bazel` | `codex-rs/codex-client` | codigo | 6 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/codex-client/src/lib.rs` | `codex-rs/codex-client` | codigo | 17 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/codex-client/src/provider.rs` | `codex-rs/codex-client` | codigo | 103 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/codex-client/src/retry.rs` | `codex-rs/codex-client` | codigo | 118 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/codex-client/src/sse.rs` | `codex-rs/codex-client` | codigo | 48 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/codex-client/src/telemetry.rs` | `codex-rs/codex-client` | codigo | 14 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/BUILD.bazel` | `codex-rs/http-client` | codigo | 8 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/bin/custom_ca_probe.rs` | `codex-rs/http-client` | codigo | 100 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/chatgpt_cloudflare_cookies.rs` | `codex-rs/http-client` | codigo | 491 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/chatgpt_hosts.rs` | `codex-rs/http-client` | codigo | 39 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/chatgpt_routing_affinity.rs` | `codex-rs/http-client` | codigo | 115 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/chatgpt_routing_affinity_tests.rs` | `codex-rs/http-client` | teste | 100 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/client.rs` | `codex-rs/http-client` | codigo | 299 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/client_builder.rs` | `codex-rs/http-client` | codigo | 477 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/client_builder_tests.rs` | `codex-rs/http-client` | teste | 116 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/client_tls.rs` | `codex-rs/http-client` | codigo | 113 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/custom_ca.rs` | `codex-rs/http-client` | codigo | 828 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/custom_ca_tls_tests.rs` | `codex-rs/http-client` | teste | 100 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/error.rs` | `codex-rs/http-client` | codigo | 57 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/lib.rs` | `codex-rs/http-client` | codigo | 130 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/native_roots.rs` | `codex-rs/http-client` | codigo | 68 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/native_roots_tests.rs` | `codex-rs/http-client` | teste | 55 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/network_policy.rs` | `codex-rs/http-client` | codigo | 387 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/network_policy_tests.rs` | `codex-rs/http-client` | teste | 185 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/openai_endpoints.rs` | `codex-rs/http-client` | codigo | 155 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/openai_headers.rs` | `codex-rs/http-client` | codigo | 5 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/outbound_proxy.rs` | `codex-rs/http-client` | codigo | 907 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/outbound_proxy/macos.rs` | `codex-rs/http-client` | codigo | 418 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/outbound_proxy/windows.rs` | `codex-rs/http-client` | codigo | 364 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/outbound_proxy/windows_tests.rs` | `codex-rs/http-client` | teste | 20 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/outbound_proxy_redirect_coverage_tests.rs` | `codex-rs/http-client` | teste | 388 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/outbound_proxy_tests.rs` | `codex-rs/http-client` | teste | 714 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/request.rs` | `codex-rs/http-client` | codigo | 482 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/request_builder.rs` | `codex-rs/http-client` | codigo | 193 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/request_builder_tests.rs` | `codex-rs/http-client` | teste | 117 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/request_draft.rs` | `codex-rs/http-client` | codigo | 78 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/response.rs` | `codex-rs/http-client` | codigo | 147 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/retry_after.rs` | `codex-rs/http-client` | codigo | 54 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/retry_after_tests.rs` | `codex-rs/http-client` | teste | 45 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/route_aware_client_pool.rs` | `codex-rs/http-client` | codigo | 626 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/route_aware_client_pool/execution.rs` | `codex-rs/http-client` | codigo | 391 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/route_aware_client_pool_tests.rs` | `codex-rs/http-client` | teste | 1199 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/route_aware_policy_tests.rs` | `codex-rs/http-client` | teste | 132 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/route_aware_redirect.rs` | `codex-rs/http-client` | codigo | 159 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/route_aware_redirect_integration_tests.rs` | `codex-rs/http-client` | teste | 172 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/route_aware_redirect_tests.rs` | `codex-rs/http-client` | teste | 238 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/route_aware_tls_fallback_tests.rs` | `codex-rs/http-client` | teste | 576 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/tls_backend_fallback.rs` | `codex-rs/http-client` | codigo | 156 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/tls_backend_fallback_tests.rs` | `codex-rs/http-client` | teste | 215 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/transport.rs` | `codex-rs/http-client` | codigo | 324 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/transport_limit_tests.rs` | `codex-rs/http-client` | teste | 492 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/transport_tests.rs` | `codex-rs/http-client` | teste | 128 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/windows_proxy_auth.rs` | `codex-rs/http-client` | codigo | 282 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/windows_proxy_auth/pipe.rs` | `codex-rs/http-client` | codigo | 121 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/windows_tls.rs` | `codex-rs/http-client` | codigo | 22 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/src/windows_tls_tests.rs` | `codex-rs/http-client` | teste | 58 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/tests/ca_env.rs` | `codex-rs/http-client` | teste | 540 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-client/tests/windows_proxy_auth_features.rs` | `codex-rs/http-client` | teste | 10 | `packages/coding-agent/src/core/http-dispatcher.ts` |
| `codex-rs/http-headers-helper/BUILD.bazel` | `codex-rs/http-headers-helper` | codigo | 6 | `packages/ai/src/api/` |
| `codex-rs/http-headers-helper/src/headers_helper_tests.rs` | `codex-rs/http-headers-helper` | teste | 22 | `packages/ai/src/api/` |
| `codex-rs/http-headers-helper/src/lib.rs` | `codex-rs/http-headers-helper` | codigo | 169 | `packages/ai/src/api/` |
| `codex-rs/keyring-store/BUILD.bazel` | `codex-rs/keyring-store` | codigo | 6 | `packages/coding-agent/src/core/auth-storage.ts` |
| `codex-rs/keyring-store/src/error_display_tests.rs` | `codex-rs/keyring-store` | teste | 51 | `packages/coding-agent/src/core/auth-storage.ts` |
| `codex-rs/keyring-store/src/error_kind.rs` | `codex-rs/keyring-store` | codigo | 51 | `packages/coding-agent/src/core/auth-storage.ts` |
| `codex-rs/keyring-store/src/error_kind_tests.rs` | `codex-rs/keyring-store` | teste | 102 | `packages/coding-agent/src/core/auth-storage.ts` |
| `codex-rs/keyring-store/src/lib.rs` | `codex-rs/keyring-store` | codigo | 249 | `packages/coding-agent/src/core/auth-storage.ts` |
| `codex-rs/lmstudio/BUILD.bazel` | `codex-rs/lmstudio` | codigo | 6 | `packages/ai/src/providers/` |
| `codex-rs/lmstudio/src/client.rs` | `codex-rs/lmstudio` | codigo | 424 | `packages/ai/src/providers/` |
| `codex-rs/lmstudio/src/lib.rs` | `codex-rs/lmstudio` | codigo | 46 | `packages/ai/src/providers/` |
| `codex-rs/login/BUILD.bazel` | `codex-rs/login` | codigo | 16 | `packages/ai/src/auth/` |
| `codex-rs/login/src/auth/access_token.rs` | `codex-rs/login` | codigo | 18 | `packages/ai/src/auth/` |
| `codex-rs/login/src/auth/access_token_tests.rs` | `codex-rs/login` | teste | 13 | `packages/ai/src/auth/` |
| `codex-rs/login/src/auth/account_grant.rs` | `codex-rs/login` | codigo | 136 | `packages/ai/src/auth/` |
| `codex-rs/login/src/auth/account_user_id_tests.rs` | `codex-rs/login` | teste | 157 | `packages/ai/src/auth/` |
| `codex-rs/login/src/auth/agent_identity.rs` | `codex-rs/login` | codigo | 601 | `packages/ai/src/auth/` |
| `codex-rs/login/src/auth/api_key.rs` | `codex-rs/login` | codigo | 9 | `packages/ai/src/auth/` |
| `codex-rs/login/src/auth/auth_headers.rs` | `codex-rs/login` | codigo | 32 | `packages/ai/src/auth/` |
| `codex-rs/login/src/auth/auth_tests.rs` | `codex-rs/login` | teste | 3531 | `packages/ai/src/auth/` |
| `codex-rs/login/src/auth/bedrock_access_keys.rs` | `codex-rs/login` | codigo | 63 | `packages/ai/src/auth/` |
| `codex-rs/login/src/auth/bedrock_api_key.rs` | `codex-rs/login` | codigo | 60 | `packages/ai/src/auth/` |
| `codex-rs/login/src/auth/bedrock_api_key_tests.rs` | `codex-rs/login` | teste | 255 | `packages/ai/src/auth/` |
| `codex-rs/login/src/auth/change_state.rs` | `codex-rs/login` | codigo | 114 | `packages/ai/src/auth/` |
| `codex-rs/login/src/auth/change_state_tests.rs` | `codex-rs/login` | teste | 344 | `packages/ai/src/auth/` |
| `codex-rs/login/src/auth/default_client.rs` | `codex-rs/login` | codigo | 514 | `packages/ai/src/auth/` |
| `codex-rs/login/src/auth/default_client_tests.rs` | `codex-rs/login` | teste | 415 | `packages/ai/src/auth/` |
| `codex-rs/login/src/auth/error.rs` | `codex-rs/login` | codigo | 2 | `packages/ai/src/auth/` |
| `codex-rs/login/src/auth/external_bearer.rs` | `codex-rs/login` | codigo | 184 | `packages/ai/src/auth/` |
| `codex-rs/login/src/auth/manager.rs` | `codex-rs/login` | codigo | 3847 | `packages/ai/src/auth/` |
| `codex-rs/login/src/auth/manager/workspace_routing.rs` | `codex-rs/login` | codigo | 91 | `packages/ai/src/auth/` |
| `codex-rs/login/src/auth/manager/workspace_switching.rs` | `codex-rs/login` | codigo | 370 | `packages/ai/src/auth/` |
| `codex-rs/login/src/auth/manager/workspace_switching_tests.rs` | `codex-rs/login` | teste | 363 | `packages/ai/src/auth/` |
| `codex-rs/login/src/auth/mod.rs` | `codex-rs/login` | codigo | 32 | `packages/ai/src/auth/` |
| `codex-rs/login/src/auth/personal_access_token.rs` | `codex-rs/login` | codigo | 134 | `packages/ai/src/auth/` |
| `codex-rs/login/src/auth/personal_access_token_tests.rs` | `codex-rs/login` | teste | 83 | `packages/ai/src/auth/` |
| `codex-rs/login/src/auth/revoke.rs` | `codex-rs/login` | codigo | 207 | `packages/ai/src/auth/` |
| `codex-rs/login/src/auth/source.rs` | `codex-rs/login` | codigo | 94 | `packages/ai/src/auth/` |
| `codex-rs/login/src/auth/source_tests.rs` | `codex-rs/login` | teste | 274 | `packages/ai/src/auth/` |
| `codex-rs/login/src/auth/storage.rs` | `codex-rs/login` | codigo | 757 | `packages/ai/src/auth/` |
| `codex-rs/login/src/auth/storage_commit.rs` | `codex-rs/login` | codigo | 105 | `packages/ai/src/auth/` |
| `codex-rs/login/src/auth/storage_commit_tests.rs` | `codex-rs/login` | teste | 234 | `packages/ai/src/auth/` |
| `codex-rs/login/src/auth/storage_error.rs` | `codex-rs/login` | codigo | 49 | `packages/ai/src/auth/` |
| `codex-rs/login/src/auth/storage_error_tests.rs` | `codex-rs/login` | teste | 146 | `packages/ai/src/auth/` |
| `codex-rs/login/src/auth/storage_file.rs` | `codex-rs/login` | codigo | 73 | `packages/ai/src/auth/` |
| `codex-rs/login/src/auth/storage_file_windows.rs` | `codex-rs/login` | codigo | 128 | `packages/ai/src/auth/` |
| `codex-rs/login/src/auth/storage_file_windows_tests.rs` | `codex-rs/login` | teste | 100 | `packages/ai/src/auth/` |
| `codex-rs/login/src/auth/storage_policy_tests.rs` | `codex-rs/login` | teste | 580 | `packages/ai/src/auth/` |
| `codex-rs/login/src/auth/storage_telemetry.rs` | `codex-rs/login` | codigo | 112 | `packages/ai/src/auth/` |
| `codex-rs/login/src/auth/storage_tests.rs` | `codex-rs/login` | teste | 759 | `packages/ai/src/auth/` |
| `codex-rs/login/src/auth/util.rs` | `codex-rs/login` | codigo | 45 | `packages/ai/src/auth/` |
| `codex-rs/login/src/auth/workload_identity.rs` | `codex-rs/login` | codigo | 574 | `packages/ai/src/auth/` |
| `codex-rs/login/src/auth/workload_identity_tests.rs` | `codex-rs/login` | teste | 880 | `packages/ai/src/auth/` |
| `codex-rs/login/src/auth_env_telemetry.rs` | `codex-rs/login` | codigo | 97 | `packages/ai/src/auth/` |
| `codex-rs/login/src/callback_params.rs` | `codex-rs/login` | codigo | 11 | `packages/ai/src/auth/` |
| `codex-rs/login/src/credential_export.rs` | `codex-rs/login` | codigo | 74 | `packages/ai/src/auth/` |
| `codex-rs/login/src/device_code_auth.rs` | `codex-rs/login` | codigo | 237 | `packages/ai/src/auth/` |
| `codex-rs/login/src/device_code_auth_tests.rs` | `codex-rs/login` | teste | 10 | `packages/ai/src/auth/` |
| `codex-rs/login/src/lib.rs` | `codex-rs/login` | codigo | 103 | `packages/ai/src/auth/` |
| `codex-rs/login/src/oauth/authorization.rs` | `codex-rs/login` | codigo | 105 | `packages/ai/src/auth/` |
| `codex-rs/login/src/oauth/authorization_tests.rs` | `codex-rs/login` | teste | 32 | `packages/ai/src/auth/` |
| `codex-rs/login/src/oauth/client.rs` | `codex-rs/login` | codigo | 155 | `packages/ai/src/auth/` |
| `codex-rs/login/src/oauth/client_tests.rs` | `codex-rs/login` | teste | 306 | `packages/ai/src/auth/` |
| `codex-rs/login/src/oauth/device.rs` | `codex-rs/login` | codigo | 185 | `packages/ai/src/auth/` |
| `codex-rs/login/src/oauth/diagnostics.rs` | `codex-rs/login` | codigo | 106 | `packages/ai/src/auth/` |
| `codex-rs/login/src/oauth/diagnostics_tests.rs` | `codex-rs/login` | teste | 21 | `packages/ai/src/auth/` |
| `codex-rs/login/src/oauth/error.rs` | `codex-rs/login` | codigo | 192 | `packages/ai/src/auth/` |
| `codex-rs/login/src/oauth/error_tests.rs` | `codex-rs/login` | teste | 71 | `packages/ai/src/auth/` |
| `codex-rs/login/src/oauth/mod.rs` | `codex-rs/login` | codigo | 33 | `packages/ai/src/auth/` |
| `codex-rs/login/src/oauth/pkce.rs` | `codex-rs/login` | codigo | 29 | `packages/ai/src/auth/` |
| `codex-rs/login/src/oauth_session.rs` | `codex-rs/login` | codigo | 571 | `packages/ai/src/auth/` |
| `codex-rs/login/src/oauth_session_callback.rs` | `codex-rs/login` | codigo | 116 | `packages/ai/src/auth/` |
| `codex-rs/login/src/oauth_session_device_tests.rs` | `codex-rs/login` | teste | 180 | `packages/ai/src/auth/` |
| `codex-rs/login/src/oauth_session_login.rs` | `codex-rs/login` | codigo | 542 | `packages/ai/src/auth/` |
| `codex-rs/login/src/oauth_session_login_tests.rs` | `codex-rs/login` | teste | 588 | `packages/ai/src/auth/` |
| `codex-rs/login/src/oauth_session_request.rs` | `codex-rs/login` | codigo | 70 | `packages/ai/src/auth/` |
| `codex-rs/login/src/oauth_session_request_tests.rs` | `codex-rs/login` | teste | 56 | `packages/ai/src/auth/` |
| `codex-rs/login/src/oauth_session_storage.rs` | `codex-rs/login` | codigo | 163 | `packages/ai/src/auth/` |
| `codex-rs/login/src/oauth_session_storage_tests.rs` | `codex-rs/login` | teste | 243 | `packages/ai/src/auth/` |
| `codex-rs/login/src/oauth_session_tests.rs` | `codex-rs/login` | teste | 1193 | `packages/ai/src/auth/` |
| `codex-rs/login/src/oauth_session_token.rs` | `codex-rs/login` | codigo | 181 | `packages/ai/src/auth/` |
| `codex-rs/login/src/outbound_proxy.rs` | `codex-rs/login` | codigo | 77 | `packages/ai/src/auth/` |
| `codex-rs/login/src/pkce.rs` | `codex-rs/login` | codigo | 2 | `packages/ai/src/auth/` |
| `codex-rs/login/src/server.rs` | `codex-rs/login` | codigo | 1111 | `packages/ai/src/auth/` |
| `codex-rs/login/src/success_page.rs` | `codex-rs/login` | codigo | 143 | `packages/ai/src/auth/` |
| `codex-rs/login/src/success_page_tests.rs` | `codex-rs/login` | teste | 120 | `packages/ai/src/auth/` |
| `codex-rs/login/src/test_support.rs` | `codex-rs/login` | codigo | 50 | `packages/ai/src/auth/` |
| `codex-rs/login/src/token_data.rs` | `codex-rs/login` | codigo | 232 | `packages/ai/src/auth/` |
| `codex-rs/login/src/token_data_tests.rs` | `codex-rs/login` | teste | 258 | `packages/ai/src/auth/` |
| `codex-rs/login/tests/all.rs` | `codex-rs/login` | teste | 5 | `packages/ai/src/auth/` |
| `codex-rs/login/tests/suite/auth_refresh.rs` | `codex-rs/login` | teste | 2018 | `packages/ai/src/auth/` |
| `codex-rs/login/tests/suite/device_code_login.rs` | `codex-rs/login` | teste | 376 | `packages/ai/src/auth/` |
| `codex-rs/login/tests/suite/login_proxy_fallback.rs` | `codex-rs/login` | teste | 225 | `packages/ai/src/auth/` |
| `codex-rs/login/tests/suite/login_server_e2e.rs` | `codex-rs/login` | teste | 744 | `packages/ai/src/auth/` |
| `codex-rs/login/tests/suite/logout.rs` | `codex-rs/login` | teste | 306 | `packages/ai/src/auth/` |
| `codex-rs/login/tests/suite/mod.rs` | `codex-rs/login` | teste | 6 | `packages/ai/src/auth/` |
| `codex-rs/model-provider-info/BUILD.bazel` | `codex-rs/model-provider-info` | codigo | 6 | `packages/ai/src/model-catalog.ts` |
| `codex-rs/model-provider-info/src/capabilities.rs` | `codex-rs/model-provider-info` | codigo | 32 | `packages/ai/src/model-catalog.ts` |
| `codex-rs/model-provider-info/src/gateway_oauth.rs` | `codex-rs/model-provider-info` | codigo | 250 | `packages/ai/src/model-catalog.ts` |
| `codex-rs/model-provider-info/src/gateway_oauth_tests.rs` | `codex-rs/model-provider-info` | teste | 156 | `packages/ai/src/model-catalog.ts` |
| `codex-rs/model-provider-info/src/lib.rs` | `codex-rs/model-provider-info` | codigo | 951 | `packages/ai/src/model-catalog.ts` |
| `codex-rs/model-provider-info/src/model_provider_info_tests.rs` | `codex-rs/model-provider-info` | teste | 1111 | `packages/ai/src/model-catalog.ts` |
| `codex-rs/model-provider-info/src/oauth_session.rs` | `codex-rs/model-provider-info` | codigo | 41 | `packages/ai/src/model-catalog.ts` |
| `codex-rs/model-provider/BUILD.bazel` | `codex-rs/model-provider` | codigo | 6 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/amazon_bedrock/auth.rs` | `codex-rs/model-provider` | codigo | 619 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/amazon_bedrock/auth_refresh.rs` | `codex-rs/model-provider` | codigo | 90 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/amazon_bedrock/catalog.rs` | `codex-rs/model-provider` | codigo | 491 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/amazon_bedrock/credential_export.rs` | `codex-rs/model-provider` | codigo | 180 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/amazon_bedrock/credential_export_tests.rs` | `codex-rs/model-provider` | teste | 378 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/amazon_bedrock/error.rs` | `codex-rs/model-provider` | codigo | 60 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/amazon_bedrock/error_tests.rs` | `codex-rs/model-provider` | teste | 237 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/amazon_bedrock/mantle.rs` | `codex-rs/model-provider` | codigo | 150 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/amazon_bedrock/mod.rs` | `codex-rs/model-provider` | codigo | 813 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/amazon_bedrock/region.rs` | `codex-rs/model-provider` | codigo | 35 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/amazon_bedrock/runtime.rs` | `codex-rs/model-provider` | codigo | 44 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/amazon_bedrock/runtime_catalog.rs` | `codex-rs/model-provider` | codigo | 56 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/amazon_bedrock/runtime_catalog_tests.rs` | `codex-rs/model-provider` | teste | 199 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/amazon_bedrock/runtime_tests.rs` | `codex-rs/model-provider` | teste | 31 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/auth.rs` | `codex-rs/model-provider` | codigo | 565 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/auth_refresh_tests.rs` | `codex-rs/model-provider` | teste | 263 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/auth_tests.rs` | `codex-rs/model-provider` | teste | 673 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/bearer_auth_provider.rs` | `codex-rs/model-provider` | codigo | 55 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/bearer_auth_provider_tests.rs` | `codex-rs/model-provider` | teste | 61 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/capabilities.rs` | `codex-rs/model-provider` | codigo | 60 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/capabilities_tests.rs` | `codex-rs/model-provider` | teste | 35 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/catalog_factory.rs` | `codex-rs/model-provider` | codigo | 39 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/chatgpt_base_url.rs` | `codex-rs/model-provider` | codigo | 40 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/client_auth.rs` | `codex-rs/model-provider` | codigo | 121 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/combined_auth.rs` | `codex-rs/model-provider` | codigo | 113 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/gateway_auth.rs` | `codex-rs/model-provider` | codigo | 107 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/gateway_export.rs` | `codex-rs/model-provider` | codigo | 68 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/gcp/gcp_tests.rs` | `codex-rs/model-provider` | teste | 346 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/gcp/mod.rs` | `codex-rs/model-provider` | codigo | 257 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/lib.rs` | `codex-rs/model-provider` | codigo | 74 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/models_endpoint.rs` | `codex-rs/model-provider` | codigo | 526 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/models_endpoint_refresh_tests.rs` | `codex-rs/model-provider` | teste | 289 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/models_endpoint_runtime_auth_tests.rs` | `codex-rs/model-provider` | teste | 520 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/models_endpoint_tests.rs` | `codex-rs/model-provider` | teste | 631 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/models_endpoint_timeout_tests.rs` | `codex-rs/model-provider` | teste | 67 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/models_identity.rs` | `codex-rs/model-provider` | codigo | 112 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/models_identity_tests.rs` | `codex-rs/model-provider` | teste | 142 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/models_originator_tests.rs` | `codex-rs/model-provider` | teste | 198 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/provider.rs` | `codex-rs/model-provider` | codigo | 791 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/provider_tests.rs` | `codex-rs/model-provider` | teste | 950 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/request_preparation.rs` | `codex-rs/model-provider` | codigo | 56 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/request_preparation_tests.rs` | `codex-rs/model-provider` | teste | 66 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/request_setup.rs` | `codex-rs/model-provider` | codigo | 209 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/runtime_auth.rs` | `codex-rs/model-provider` | codigo | 221 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/runtime_auth_tests.rs` | `codex-rs/model-provider` | teste | 386 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/shared_state.rs` | `codex-rs/model-provider` | codigo | 197 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/shared_state_test_support.rs` | `codex-rs/model-provider` | codigo | 139 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/shared_state_tests.rs` | `codex-rs/model-provider` | teste | 842 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/test_support.rs` | `codex-rs/model-provider` | codigo | 25 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/workspace_routing.rs` | `codex-rs/model-provider` | codigo | 107 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/src/workspace_routing_tests.rs` | `codex-rs/model-provider` | teste | 200 | `packages/ai/src/providers/` |
| `codex-rs/model-provider/tests/runtime_catalog.rs` | `codex-rs/model-provider` | teste | 305 | `packages/ai/src/providers/` |
| `codex-rs/models-manager/BUILD.bazel` | `codex-rs/models-manager` | codigo | 10 | `packages/coding-agent/src/core/model-registry.ts` |
| `codex-rs/models-manager/prompt.md` | `codex-rs/models-manager` | prompt | 275 | `packages/coding-agent/src/core/model-registry.ts` |
| `codex-rs/models-manager/src/api_key_discovery_tests.rs` | `codex-rs/models-manager` | teste | 116 | `packages/coding-agent/src/core/model-registry.ts` |
| `codex-rs/models-manager/src/cache.rs` | `codex-rs/models-manager` | codigo | 267 | `packages/coding-agent/src/core/model-registry.ts` |
| `codex-rs/models-manager/src/cache_identity_tests.rs` | `codex-rs/models-manager` | teste | 83 | `packages/coding-agent/src/core/model-registry.ts` |
| `codex-rs/models-manager/src/catalog.rs` | `codex-rs/models-manager` | codigo | 81 | `packages/coding-agent/src/core/model-registry.ts` |
| `codex-rs/models-manager/src/catalog_origin_tests.rs` | `codex-rs/models-manager` | teste | 183 | `packages/coding-agent/src/core/model-registry.ts` |
| `codex-rs/models-manager/src/collaboration_mode_presets.rs` | `codex-rs/models-manager` | codigo | 28 | `packages/coding-agent/src/core/model-registry.ts` |
| `codex-rs/models-manager/src/collaboration_mode_presets_tests.rs` | `codex-rs/models-manager` | teste | 34 | `packages/coding-agent/src/core/model-registry.ts` |
| `codex-rs/models-manager/src/config.rs` | `codex-rs/models-manager` | codigo | 12 | `packages/coding-agent/src/core/model-registry.ts` |
| `codex-rs/models-manager/src/lib.rs` | `codex-rs/models-manager` | codigo | 31 | `packages/coding-agent/src/core/model-registry.ts` |
| `codex-rs/models-manager/src/manager.rs` | `codex-rs/models-manager` | codigo | 1256 | `packages/coding-agent/src/core/model-registry.ts` |
| `codex-rs/models-manager/src/manager_tests.rs` | `codex-rs/models-manager` | teste | 1934 | `packages/coding-agent/src/core/model-registry.ts` |
| `codex-rs/models-manager/src/model_info.rs` | `codex-rs/models-manager` | codigo | 161 | `packages/coding-agent/src/core/model-registry.ts` |
| `codex-rs/models-manager/src/model_info_overrides_tests.rs` | `codex-rs/models-manager` | teste | 45 | `packages/coding-agent/src/core/model-registry.ts` |
| `codex-rs/models-manager/src/model_info_tests.rs` | `codex-rs/models-manager` | teste | 281 | `packages/coding-agent/src/core/model-registry.ts` |
| `codex-rs/models-manager/src/model_presets.rs` | `codex-rs/models-manager` | codigo | 6 | `packages/coding-agent/src/core/model-registry.ts` |
| `codex-rs/models-manager/src/originator.rs` | `codex-rs/models-manager` | codigo | 45 | `packages/coding-agent/src/core/model-registry.ts` |
| `codex-rs/models-manager/src/test_support.rs` | `codex-rs/models-manager` | codigo | 40 | `packages/coding-agent/src/core/model-registry.ts` |
| `codex-rs/ollama/BUILD.bazel` | `codex-rs/ollama` | codigo | 6 | `packages/ai/src/providers/` |
| `codex-rs/ollama/src/client.rs` | `codex-rs/ollama` | codigo | 627 | `packages/ai/src/providers/` |
| `codex-rs/ollama/src/lib.rs` | `codex-rs/ollama` | codigo | 145 | `packages/ai/src/providers/` |
| `codex-rs/ollama/src/line_buffer.rs` | `codex-rs/ollama` | codigo | 32 | `packages/ai/src/providers/` |
| `codex-rs/ollama/src/line_buffer_tests.rs` | `codex-rs/ollama` | teste | 42 | `packages/ai/src/providers/` |
| `codex-rs/ollama/src/parser.rs` | `codex-rs/ollama` | codigo | 75 | `packages/ai/src/providers/` |
| `codex-rs/ollama/src/pull.rs` | `codex-rs/ollama` | codigo | 147 | `packages/ai/src/providers/` |
| `codex-rs/ollama/src/url.rs` | `codex-rs/ollama` | codigo | 39 | `packages/ai/src/providers/` |
| `codex-rs/responses-api-proxy/BUILD.bazel` | `codex-rs/responses-api-proxy` | codigo | 11 | `sem equivalente` |
| `codex-rs/responses-api-proxy/npm/bin/codex-responses-api-proxy.js` | `codex-rs/responses-api-proxy` | codigo | 104 | `sem equivalente` |
| `codex-rs/responses-api-proxy/src/auth.rs` | `codex-rs/responses-api-proxy` | codigo | 424 | `sem equivalente` |
| `codex-rs/responses-api-proxy/src/auth_tests.rs` | `codex-rs/responses-api-proxy` | teste | 912 | `sem equivalente` |
| `codex-rs/responses-api-proxy/src/dump.rs` | `codex-rs/responses-api-proxy` | codigo | 378 | `sem equivalente` |
| `codex-rs/responses-api-proxy/src/github_oidc.rs` | `codex-rs/responses-api-proxy` | codigo | 125 | `sem equivalente` |
| `codex-rs/responses-api-proxy/src/github_oidc_tests.rs` | `codex-rs/responses-api-proxy` | teste | 255 | `sem equivalente` |
| `codex-rs/responses-api-proxy/src/lib.rs` | `codex-rs/responses-api-proxy` | codigo | 348 | `sem equivalente` |
| `codex-rs/responses-api-proxy/src/main.rs` | `codex-rs/responses-api-proxy` | codigo | 12 | `sem equivalente` |
| `codex-rs/responses-api-proxy/src/read_api_key.rs` | `codex-rs/responses-api-proxy` | codigo | 361 | `sem equivalente` |
| `codex-rs/websocket-auth/BUILD.bazel` | `codex-rs/websocket-auth` | codigo | 6 | `packages/ai/src/auth/oauth/openai-codex.ts` |
| `codex-rs/websocket-auth/src/auth_tests.rs` | `codex-rs/websocket-auth` | teste | 288 | `packages/ai/src/auth/oauth/openai-codex.ts` |
| `codex-rs/websocket-auth/src/lib.rs` | `codex-rs/websocket-auth` | codigo | 481 | `packages/ai/src/auth/oauth/openai-codex.ts` |
| `codex-rs/websocket-client/BUILD.bazel` | `codex-rs/websocket-client` | codigo | 6 | `packages/ai/src/api/openai-codex-responses.ts` |
| `codex-rs/websocket-client/src/cookie_tests.rs` | `codex-rs/websocket-client` | teste | 258 | `packages/ai/src/api/openai-codex-responses.ts` |
| `codex-rs/websocket-client/src/dialer.rs` | `codex-rs/websocket-client` | codigo | 374 | `packages/ai/src/api/openai-codex-responses.ts` |
| `codex-rs/websocket-client/src/dialer_tests.rs` | `codex-rs/websocket-client` | teste | 715 | `packages/ai/src/api/openai-codex-responses.ts` |
| `codex-rs/websocket-client/src/lib.rs` | `codex-rs/websocket-client` | codigo | 397 | `packages/ai/src/api/openai-codex-responses.ts` |
| `codex-rs/websocket-client/src/lib_tests.rs` | `codex-rs/websocket-client` | teste | 39 | `packages/ai/src/api/openai-codex-responses.ts` |
| `codex-rs/websocket-client/src/network_policy_tests.rs` | `codex-rs/websocket-client` | teste | 54 | `packages/ai/src/api/openai-codex-responses.ts` |
