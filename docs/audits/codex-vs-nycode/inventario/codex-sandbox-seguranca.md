# Inventário: codex-sandbox-seguranca

Crates de sandbox OS, `execpolicy`, `network-proxy`, `secrets`, `guardian-*`. Total nesta partição: **566** arquivos.

| Arquivo (Codex) | Crate | Categoria | LOC | Equivalente no nycode |
|---|---|---|---:|---|
| `codex-rs/bwrap/BUILD.bazel` | `codex-rs/bwrap` | codigo | 72 | `sem equivalente` |
| `codex-rs/bwrap/build.rs` | `codex-rs/bwrap` | codigo | 106 | `sem equivalente` |
| `codex-rs/bwrap/config.h` | `codex-rs/bwrap` | codigo | 1 | `sem equivalente` |
| `codex-rs/bwrap/src/main.rs` | `codex-rs/bwrap` | codigo | 45 | `sem equivalente` |
| `codex-rs/execpolicy/BUILD.bazel` | `codex-rs/execpolicy` | codigo | 6 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/execpolicy/examples/example.codexpolicy` | `codex-rs/execpolicy` | codigo | 78 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/execpolicy/src/amend.rs` | `codex-rs/execpolicy` | codigo | 342 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/execpolicy/src/decision.rs` | `codex-rs/execpolicy` | codigo | 30 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/execpolicy/src/error.rs` | `codex-rs/execpolicy` | codigo | 101 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/execpolicy/src/execpolicycheck.rs` | `codex-rs/execpolicy` | codigo | 95 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/execpolicy/src/executable_name.rs` | `codex-rs/execpolicy` | codigo | 29 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/execpolicy/src/lib.rs` | `codex-rs/execpolicy` | codigo | 33 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/execpolicy/src/main.rs` | `codex-rs/execpolicy` | codigo | 18 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/execpolicy/src/parser.rs` | `codex-rs/execpolicy` | codigo | 475 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/execpolicy/src/policy.rs` | `codex-rs/execpolicy` | codigo | 595 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/execpolicy/src/rule.rs` | `codex-rs/execpolicy` | codigo | 319 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/execpolicy/src/sandbox_migration.rs` | `codex-rs/execpolicy` | codigo | 123 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/execpolicy/src/sandbox_migration_tests.rs` | `codex-rs/execpolicy` | teste | 58 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/execpolicy/tests/basic.rs` | `codex-rs/execpolicy` | teste | 1086 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/BUILD.bazel` | `codex-rs/ext/guardian-reviewer` | codigo | 6 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/approval_request.rs` | `codex-rs/ext/guardian-reviewer` | codigo | 306 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/approval_request_json.rs` | `codex-rs/ext/guardian-reviewer` | codigo | 252 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/approval_request_json_tests.rs` | `codex-rs/ext/guardian-reviewer` | teste | 103 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/approval_request_tests.rs` | `codex-rs/ext/guardian-reviewer` | teste | 96 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/assessment.rs` | `codex-rs/ext/guardian-reviewer` | codigo | 120 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/assessment_tests.rs` | `codex-rs/ext/guardian-reviewer` | teste | 50 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/blocking.rs` | `codex-rs/ext/guardian-reviewer` | codigo | 149 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/blocking_tests.rs` | `codex-rs/ext/guardian-reviewer` | teste | 68 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/circuit_breaker.rs` | `codex-rs/ext/guardian-reviewer` | codigo | 102 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/circuit_breaker_tests.rs` | `codex-rs/ext/guardian-reviewer` | teste | 107 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/completion.rs` | `codex-rs/ext/guardian-reviewer` | codigo | 231 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/context_mode.rs` | `codex-rs/ext/guardian-reviewer` | codigo | 50 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/context_policy.rs` | `codex-rs/ext/guardian-reviewer` | codigo | 56 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/conversation.rs` | `codex-rs/ext/guardian-reviewer` | codigo | 99 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/conversation_tests.rs` | `codex-rs/ext/guardian-reviewer` | teste | 62 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/deadline.rs` | `codex-rs/ext/guardian-reviewer` | codigo | 68 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/deadline_tests.rs` | `codex-rs/ext/guardian-reviewer` | teste | 38 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/elicitation.rs` | `codex-rs/ext/guardian-reviewer` | codigo | 211 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/elicitation_tests.rs` | `codex-rs/ext/guardian-reviewer` | teste | 240 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/execution.rs` | `codex-rs/ext/guardian-reviewer` | codigo | 208 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/feedback.rs` | `codex-rs/ext/guardian-reviewer` | codigo | 143 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/feedback_tests.rs` | `codex-rs/ext/guardian-reviewer` | teste | 69 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/instructions.rs` | `codex-rs/ext/guardian-reviewer` | codigo | 60 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/lib.rs` | `codex-rs/ext/guardian-reviewer` | codigo | 144 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/metrics.rs` | `codex-rs/ext/guardian-reviewer` | codigo | 657 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/model.rs` | `codex-rs/ext/guardian-reviewer` | codigo | 84 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/node_repl_review_evidence.rs` | `codex-rs/ext/guardian-reviewer` | codigo | 277 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/node_repl_review_evidence_tests.rs` | `codex-rs/ext/guardian-reviewer` | teste | 248 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/outcome.rs` | `codex-rs/ext/guardian-reviewer` | codigo | 163 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/planned_action.rs` | `codex-rs/ext/guardian-reviewer` | codigo | 59 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/pool.rs` | `codex-rs/ext/guardian-reviewer` | codigo | 376 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/pool_tests.rs` | `codex-rs/ext/guardian-reviewer` | teste | 190 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/prompt.rs` | `codex-rs/ext/guardian-reviewer` | codigo | 98 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/prompt_tests.rs` | `codex-rs/ext/guardian-reviewer` | teste | 315 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/reconsideration.rs` | `codex-rs/ext/guardian-reviewer` | codigo | 104 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/reporting.rs` | `codex-rs/ext/guardian-reviewer` | codigo | 205 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/reporting_tests.rs` | `codex-rs/ext/guardian-reviewer` | teste | 270 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/retry.rs` | `codex-rs/ext/guardian-reviewer` | codigo | 233 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/retry_tests.rs` | `codex-rs/ext/guardian-reviewer` | teste | 275 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/review.rs` | `codex-rs/ext/guardian-reviewer` | codigo | 257 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/review_action.rs` | `codex-rs/ext/guardian-reviewer` | codigo | 44 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/review_action_tests.rs` | `codex-rs/ext/guardian-reviewer` | teste | 80 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/review_evidence.rs` | `codex-rs/ext/guardian-reviewer` | codigo | 251 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/review_state.rs` | `codex-rs/ext/guardian-reviewer` | codigo | 168 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/review_tests.rs` | `codex-rs/ext/guardian-reviewer` | teste | 224 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/routing.rs` | `codex-rs/ext/guardian-reviewer` | codigo | 214 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/routing_tests.rs` | `codex-rs/ext/guardian-reviewer` | teste | 30 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/sender_evidence.rs` | `codex-rs/ext/guardian-reviewer` | codigo | 47 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/session.rs` | `codex-rs/ext/guardian-reviewer` | codigo | 34 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/session_tests.rs` | `codex-rs/ext/guardian-reviewer` | teste | 40 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-reviewer/src/settings.rs` | `codex-rs/ext/guardian-reviewer` | codigo | 124 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/BUILD.bazel` | `codex-rs/ext/guardian-v2` | codigo | 15 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/action.rs` | `codex-rs/ext/guardian-v2` | codigo | 58 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/action_tests.rs` | `codex-rs/ext/guardian-v2` | teste | 37 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/approval.rs` | `codex-rs/ext/guardian-v2` | codigo | 402 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/authorization.rs` | `codex-rs/ext/guardian-v2` | codigo | 3 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/budget_tests.rs` | `codex-rs/ext/guardian-v2` | teste | 319 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/classification.rs` | `codex-rs/ext/guardian-v2` | codigo | 524 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/config.rs` | `codex-rs/ext/guardian-v2` | codigo | 348 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/config_tests.rs` | `codex-rs/ext/guardian-v2` | teste | 327 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/conversation.rs` | `codex-rs/ext/guardian-v2` | codigo | 380 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/conversation_admission_tests.rs` | `codex-rs/ext/guardian-v2` | teste | 36 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/conversation_tests.rs` | `codex-rs/ext/guardian-v2` | teste | 1157 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/coverage.rs` | `codex-rs/ext/guardian-v2` | codigo | 29 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/decisions.rs` | `codex-rs/ext/guardian-v2` | codigo | 423 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/decisions_lifecycle_tests.rs` | `codex-rs/ext/guardian-v2` | teste | 493 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/decisions_tests.rs` | `codex-rs/ext/guardian-v2` | teste | 817 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/extension.rs` | `codex-rs/ext/guardian-v2` | codigo | 200 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/extension_cached_delivery_tests.rs` | `codex-rs/ext/guardian-v2` | teste | 346 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/extension_tests.rs` | `codex-rs/ext/guardian-v2` | teste | 4280 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/metrics.rs` | `codex-rs/ext/guardian-v2` | codigo | 299 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/mod.rs` | `codex-rs/ext/guardian-v2` | codigo | 23 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/observation.rs` | `codex-rs/ext/guardian-v2` | codigo | 444 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/parent_compaction.rs` | `codex-rs/ext/guardian-v2` | codigo | 93 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/parent_compaction_tests.rs` | `codex-rs/ext/guardian-v2` | teste | 199 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/pending_score_tests.rs` | `codex-rs/ext/guardian-v2` | teste | 123 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/request.rs` | `codex-rs/ext/guardian-v2` | codigo | 127 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/request_tests.rs` | `codex-rs/ext/guardian-v2` | teste | 397 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/retained_sampling_tests.rs` | `codex-rs/ext/guardian-v2` | teste | 187 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/sampler.rs` | `codex-rs/ext/guardian-v2` | codigo | 325 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/sampler/connection_pool.rs` | `codex-rs/ext/guardian-v2` | codigo | 685 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/sampler/connection_pool_cancellation_tests.rs` | `codex-rs/ext/guardian-v2` | teste | 200 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/sampler/connection_pool_tests.rs` | `codex-rs/ext/guardian-v2` | teste | 907 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/sampler/execution.rs` | `codex-rs/ext/guardian-v2` | codigo | 425 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/sampler/response.rs` | `codex-rs/ext/guardian-v2` | codigo | 79 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/sampler/telemetry.rs` | `codex-rs/ext/guardian-v2` | codigo | 122 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/sampler_routing_tests.rs` | `codex-rs/ext/guardian-v2` | teste | 308 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/sampler_tests.rs` | `codex-rs/ext/guardian-v2` | teste | 1317 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/score.rs` | `codex-rs/ext/guardian-v2` | codigo | 264 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/score_tests.rs` | `codex-rs/ext/guardian-v2` | teste | 60 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/startup.rs` | `codex-rs/ext/guardian-v2` | codigo | 161 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/transcript.rs` | `codex-rs/ext/guardian-v2` | codigo | 230 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/transcript_tests.rs` | `codex-rs/ext/guardian-v2` | teste | 1420 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/truncation.rs` | `codex-rs/ext/guardian-v2` | codigo | 78 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/trusted_skills.rs` | `codex-rs/ext/guardian-v2` | codigo | 73 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/trusted_skills_tests.rs` | `codex-rs/ext/guardian-v2` | teste | 106 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/trusted_tools.rs` | `codex-rs/ext/guardian-v2` | codigo | 174 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/trusted_tools_tests.rs` | `codex-rs/ext/guardian-v2` | teste | 255 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/async_scorer/wrapper_lag.rs` | `codex-rs/ext/guardian-v2` | codigo | 95 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/lib.rs` | `codex-rs/ext/guardian-v2` | codigo | 22 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/sync_reviewer/conversation_history.rs` | `codex-rs/ext/guardian-v2` | codigo | 63 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/sync_reviewer/lifecycle_tests.rs` | `codex-rs/ext/guardian-v2` | teste | 125 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/sync_reviewer/mod.rs` | `codex-rs/ext/guardian-v2` | codigo | 284 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/sync_reviewer/reviewer_config.rs` | `codex-rs/ext/guardian-v2` | codigo | 71 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v2/src/sync_reviewer/reviewer_config_tests.rs` | `codex-rs/ext/guardian-v2` | teste | 36 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v3/BUILD.bazel` | `codex-rs/ext/guardian-v3` | codigo | 15 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v3/src/actor.rs` | `codex-rs/ext/guardian-v3` | codigo | 282 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v3/src/conversation.rs` | `codex-rs/ext/guardian-v3` | codigo | 130 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v3/src/cutoff.rs` | `codex-rs/ext/guardian-v3` | codigo | 145 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v3/src/cutoff_tests.rs` | `codex-rs/ext/guardian-v3` | teste | 536 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v3/src/delivery.rs` | `codex-rs/ext/guardian-v3` | codigo | 56 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v3/src/evidence.rs` | `codex-rs/ext/guardian-v3` | codigo | 375 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v3/src/host.rs` | `codex-rs/ext/guardian-v3` | codigo | 292 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v3/src/housekeeper.rs` | `codex-rs/ext/guardian-v3` | codigo | 324 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v3/src/housekeeper_sampler.rs` | `codex-rs/ext/guardian-v3` | codigo | 343 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v3/src/housekeeper_transport.rs` | `codex-rs/ext/guardian-v3` | codigo | 419 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v3/src/inbox.rs` | `codex-rs/ext/guardian-v3` | codigo | 149 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v3/src/lib.rs` | `codex-rs/ext/guardian-v3` | codigo | 89 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v3/src/retrieval_tools.rs` | `codex-rs/ext/guardian-v3` | codigo | 101 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v3/src/sampling.rs` | `codex-rs/ext/guardian-v3` | codigo | 25 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v3/src/subscription_tools.rs` | `codex-rs/ext/guardian-v3` | codigo | 149 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v3/tests/common/board_host.rs` | `codex-rs/ext/guardian-v3` | teste | 74 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v3/tests/evidence.rs` | `codex-rs/ext/guardian-v3` | teste | 317 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v3/tests/housekeeping.rs` | `codex-rs/ext/guardian-v3` | teste | 1086 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v3/tests/retrieval.rs` | `codex-rs/ext/guardian-v3` | teste | 268 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v3/tests/retrieval/guidance.rs` | `codex-rs/ext/guardian-v3` | teste | 81 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/ext/guardian-v3/tests/retrieval/subscriptions.rs` | `codex-rs/ext/guardian-v3` | teste | 160 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/BUILD.bazel` | `codex-rs/guardian-context` | codigo | 6 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/action.rs` | `codex-rs/guardian-context` | codigo | 230 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/action_tests.rs` | `codex-rs/guardian-context` | teste | 41 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/allocation.rs` | `codex-rs/guardian-context` | codigo | 600 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/allocation_tests.rs` | `codex-rs/guardian-context` | teste | 377 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/authorization.rs` | `codex-rs/guardian-context` | codigo | 153 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/budget.rs` | `codex-rs/guardian-context` | codigo | 596 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/budget_tests.rs` | `codex-rs/guardian-context` | teste | 260 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/composition.rs` | `codex-rs/guardian-context` | codigo | 832 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/composition_tests.rs` | `codex-rs/guardian-context` | teste | 295 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/cursor.rs` | `codex-rs/guardian-context` | codigo | 60 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/cursor_tests.rs` | `codex-rs/guardian-context` | teste | 76 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/enforcement.rs` | `codex-rs/guardian-context` | codigo | 538 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/enforcement_tests.rs` | `codex-rs/guardian-context` | teste | 678 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/entry.rs` | `codex-rs/guardian-context` | codigo | 98 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/guardian_tool_descriptions.rs` | `codex-rs/guardian-context` | codigo | 55 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/history.rs` | `codex-rs/guardian-context` | codigo | 295 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/history_tests.rs` | `codex-rs/guardian-context` | teste | 283 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/images.rs` | `codex-rs/guardian-context` | codigo | 231 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/images_tests.rs` | `codex-rs/guardian-context` | teste | 389 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/lib.rs` | `codex-rs/guardian-context` | codigo | 399 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/native_tool_call.rs` | `codex-rs/guardian-context` | codigo | 30 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/permissions.rs` | `codex-rs/guardian-context` | codigo | 112 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/preparation/async_entries.rs` | `codex-rs/guardian-context` | codigo | 76 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/preparation/async_entries_tests.rs` | `codex-rs/guardian-context` | teste | 143 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/preparation/elastic.rs` | `codex-rs/guardian-context` | codigo | 115 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/preparation/elastic_tests.rs` | `codex-rs/guardian-context` | teste | 265 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/preparation/mod.rs` | `codex-rs/guardian-context` | codigo | 524 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/preparation/repl.rs` | `codex-rs/guardian-context` | codigo | 361 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/preparation/root.rs` | `codex-rs/guardian-context` | codigo | 442 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/preparation/source_tests.rs` | `codex-rs/guardian-context` | teste | 278 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/preparation/transcript.rs` | `codex-rs/guardian-context` | codigo | 473 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/preparation/transcript/window.rs` | `codex-rs/guardian-context` | codigo | 239 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/preparation/transcript_tests.rs` | `codex-rs/guardian-context` | teste | 425 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/registry_tests.rs` | `codex-rs/guardian-context` | teste | 458 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/retained_instructions.rs` | `codex-rs/guardian-context` | codigo | 406 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/retained_instructions_tests.rs` | `codex-rs/guardian-context` | teste | 912 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/reviews.rs` | `codex-rs/guardian-context` | codigo | 215 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/reviews_tests.rs` | `codex-rs/guardian-context` | teste | 113 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/section.rs` | `codex-rs/guardian-context` | codigo | 45 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/sender_user_messages.rs` | `codex-rs/guardian-context` | codigo | 27 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/transcript.rs` | `codex-rs/guardian-context` | codigo | 515 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/transcript_record.rs` | `codex-rs/guardian-context` | codigo | 176 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/transcript_tests.rs` | `codex-rs/guardian-context` | teste | 1067 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/truncation.rs` | `codex-rs/guardian-context` | codigo | 89 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/truncation_tests.rs` | `codex-rs/guardian-context` | teste | 29 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/trusted_skills.rs` | `codex-rs/guardian-context` | codigo | 104 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/trusted_skills_tests.rs` | `codex-rs/guardian-context` | teste | 49 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/trusted_tool.rs` | `codex-rs/guardian-context` | codigo | 116 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/trusted_tool_tests.rs` | `codex-rs/guardian-context` | teste | 70 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/src/verified_answers.rs` | `codex-rs/guardian-context` | codigo | 125 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/guardian-context/tests/cache_prefix.rs` | `codex-rs/guardian-context` | teste | 346 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/linux-sandbox/BUILD.bazel` | `codex-rs/linux-sandbox` | codigo | 31 | `sem equivalente` |
| `codex-rs/linux-sandbox/build.rs` | `codex-rs/linux-sandbox` | codigo | 3 | `sem equivalente` |
| `codex-rs/linux-sandbox/managed_tcp_test_bwrap.bzl` | `codex-rs/linux-sandbox` | codigo | 13 | `sem equivalente` |
| `codex-rs/linux-sandbox/src/bazel_bwrap.rs` | `codex-rs/linux-sandbox` | codigo | 74 | `sem equivalente` |
| `codex-rs/linux-sandbox/src/bundled_bwrap.rs` | `codex-rs/linux-sandbox` | codigo | 223 | `sem equivalente` |
| `codex-rs/linux-sandbox/src/bundled_bwrap_tests.rs` | `codex-rs/linux-sandbox` | teste | 125 | `sem equivalente` |
| `codex-rs/linux-sandbox/src/bwrap.rs` | `codex-rs/linux-sandbox` | codigo | 1400 | `sem equivalente` |
| `codex-rs/linux-sandbox/src/bwrap_tests.rs` | `codex-rs/linux-sandbox` | teste | 1645 | `sem equivalente` |
| `codex-rs/linux-sandbox/src/bwrap_wslg_tests.rs` | `codex-rs/linux-sandbox` | teste | 238 | `sem equivalente` |
| `codex-rs/linux-sandbox/src/daemon_mounts.rs` | `codex-rs/linux-sandbox` | codigo | 256 | `sem equivalente` |
| `codex-rs/linux-sandbox/src/daemon_mounts_tests.rs` | `codex-rs/linux-sandbox` | teste | 324 | `sem equivalente` |
| `codex-rs/linux-sandbox/src/exec_util.rs` | `codex-rs/linux-sandbox` | codigo | 44 | `sem equivalente` |
| `codex-rs/linux-sandbox/src/exec_util_tests.rs` | `codex-rs/linux-sandbox` | teste | 35 | `sem equivalente` |
| `codex-rs/linux-sandbox/src/fd_mount.rs` | `codex-rs/linux-sandbox` | codigo | 91 | `sem equivalente` |
| `codex-rs/linux-sandbox/src/fd_mount_tests.rs` | `codex-rs/linux-sandbox` | teste | 130 | `sem equivalente` |
| `codex-rs/linux-sandbox/src/launcher.rs` | `codex-rs/linux-sandbox` | codigo | 257 | `sem equivalente` |
| `codex-rs/linux-sandbox/src/launcher_tests.rs` | `codex-rs/linux-sandbox` | teste | 223 | `sem equivalente` |
| `codex-rs/linux-sandbox/src/lib.rs` | `codex-rs/linux-sandbox` | codigo | 56 | `sem equivalente` |
| `codex-rs/linux-sandbox/src/linux_run_main.rs` | `codex-rs/linux-sandbox` | codigo | 1364 | `sem equivalente` |
| `codex-rs/linux-sandbox/src/linux_run_main_tests.rs` | `codex-rs/linux-sandbox` | teste | 709 | `sem equivalente` |
| `codex-rs/linux-sandbox/src/main.rs` | `codex-rs/linux-sandbox` | codigo | 6 | `sem equivalente` |
| `codex-rs/linux-sandbox/src/managed_tcp.rs` | `codex-rs/linux-sandbox` | codigo | 159 | `sem equivalente` |
| `codex-rs/linux-sandbox/src/managed_tcp_dns.rs` | `codex-rs/linux-sandbox` | codigo | 177 | `sem equivalente` |
| `codex-rs/linux-sandbox/src/managed_tcp_pending.rs` | `codex-rs/linux-sandbox` | codigo | 140 | `sem equivalente` |
| `codex-rs/linux-sandbox/src/managed_tcp_relay_tests.rs` | `codex-rs/linux-sandbox` | teste | 38 | `sem equivalente` |
| `codex-rs/linux-sandbox/src/managed_tcp_stack.rs` | `codex-rs/linux-sandbox` | codigo | 344 | `sem equivalente` |
| `codex-rs/linux-sandbox/src/managed_tcp_tests.rs` | `codex-rs/linux-sandbox` | teste | 80 | `sem equivalente` |
| `codex-rs/linux-sandbox/src/proxy_lifecycle.rs` | `codex-rs/linux-sandbox` | codigo | 254 | `sem equivalente` |
| `codex-rs/linux-sandbox/src/proxy_lifecycle_tests.rs` | `codex-rs/linux-sandbox` | teste | 124 | `sem equivalente` |
| `codex-rs/linux-sandbox/src/proxy_routing.rs` | `codex-rs/linux-sandbox` | codigo | 581 | `sem equivalente` |
| `codex-rs/linux-sandbox/src/proxy_routing_tests.rs` | `codex-rs/linux-sandbox` | teste | 197 | `sem equivalente` |
| `codex-rs/linux-sandbox/src/seccomp.rs` | `codex-rs/linux-sandbox` | codigo | 377 | `sem equivalente` |
| `codex-rs/linux-sandbox/src/seccomp_tests.rs` | `codex-rs/linux-sandbox` | teste | 263 | `sem equivalente` |
| `codex-rs/linux-sandbox/src/tcp_namespace.rs` | `codex-rs/linux-sandbox` | codigo | 133 | `sem equivalente` |
| `codex-rs/linux-sandbox/src/tcp_net_setup.rs` | `codex-rs/linux-sandbox` | codigo | 174 | `sem equivalente` |
| `codex-rs/linux-sandbox/src/wslg.rs` | `codex-rs/linux-sandbox` | codigo | 66 | `sem equivalente` |
| `codex-rs/linux-sandbox/src/wslg_tests.rs` | `codex-rs/linux-sandbox` | teste | 49 | `sem equivalente` |
| `codex-rs/linux-sandbox/tests/all.rs` | `codex-rs/linux-sandbox` | teste | 5 | `sem equivalente` |
| `codex-rs/linux-sandbox/tests/suite/bundled_bwrap.rs` | `codex-rs/linux-sandbox` | teste | 87 | `sem equivalente` |
| `codex-rs/linux-sandbox/tests/suite/bwrap_path.rs` | `codex-rs/linux-sandbox` | teste | 134 | `sem equivalente` |
| `codex-rs/linux-sandbox/tests/suite/daemon_sockets_tests.rs` | `codex-rs/linux-sandbox` | teste | 359 | `sem equivalente` |
| `codex-rs/linux-sandbox/tests/suite/denied_files_tests.rs` | `codex-rs/linux-sandbox` | teste | 251 | `sem equivalente` |
| `codex-rs/linux-sandbox/tests/suite/managed_proxy.rs` | `codex-rs/linux-sandbox` | teste | 1153 | `sem equivalente` |
| `codex-rs/linux-sandbox/tests/suite/managed_proxy_bridge_lifecycle_tests.rs` | `codex-rs/linux-sandbox` | teste | 274 | `sem equivalente` |
| `codex-rs/linux-sandbox/tests/suite/managed_proxy_unix_sockets_tests.rs` | `codex-rs/linux-sandbox` | teste | 191 | `sem equivalente` |
| `codex-rs/linux-sandbox/tests/suite/managed_tcp.rs` | `codex-rs/linux-sandbox` | teste | 276 | `sem equivalente` |
| `codex-rs/linux-sandbox/tests/suite/mod.rs` | `codex-rs/linux-sandbox` | teste | 5 | `sem equivalente` |
| `codex-rs/linux-sandbox/tests/suite/nested_metadata_tests.rs` | `codex-rs/linux-sandbox` | teste | 204 | `sem equivalente` |
| `codex-rs/linux-sandbox/tests/suite/root_metadata_tests.rs` | `codex-rs/linux-sandbox` | teste | 191 | `sem equivalente` |
| `codex-rs/linux-sandbox/tests/suite/sandbox.rs` | `codex-rs/linux-sandbox` | teste | 1574 | `sem equivalente` |
| `codex-rs/linux-sandbox/tests/suite/wslg_tests.rs` | `codex-rs/linux-sandbox` | teste | 80 | `sem equivalente` |
| `codex-rs/mxc-sandbox/BUILD.bazel` | `codex-rs/mxc-sandbox` | codigo | 6 | `sem equivalente` |
| `codex-rs/mxc-sandbox/src/availability.rs` | `codex-rs/mxc-sandbox` | codigo | 11 | `sem equivalente` |
| `codex-rs/mxc-sandbox/src/lib.rs` | `codex-rs/mxc-sandbox` | codigo | 184 | `sem equivalente` |
| `codex-rs/mxc-sandbox/src/native.rs` | `codex-rs/mxc-sandbox` | codigo | 32 | `sem equivalente` |
| `codex-rs/mxc-sandbox/src/policy.rs` | `codex-rs/mxc-sandbox` | codigo | 532 | `sem equivalente` |
| `codex-rs/mxc-sandbox/src/policy_tests.rs` | `codex-rs/mxc-sandbox` | teste | 995 | `sem equivalente` |
| `codex-rs/mxc-sandbox/src/transport.rs` | `codex-rs/mxc-sandbox` | codigo | 44 | `sem equivalente` |
| `codex-rs/mxc-sandbox/src/transport_tests.rs` | `codex-rs/mxc-sandbox` | teste | 56 | `sem equivalente` |
| `codex-rs/mxc-sandbox/src/windows.rs` | `codex-rs/mxc-sandbox` | codigo | 188 | `sem equivalente` |
| `codex-rs/network-proxy/BUILD.bazel` | `codex-rs/network-proxy` | codigo | 6 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/attribution.rs` | `codex-rs/network-proxy` | codigo | 145 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/attribution_tests.rs` | `codex-rs/network-proxy` | teste | 61 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/authorization_path.rs` | `codex-rs/network-proxy` | codigo | 64 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/authorization_path_tests.rs` | `codex-rs/network-proxy` | teste | 50 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/aws_sigv4.rs` | `codex-rs/network-proxy` | codigo | 656 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/aws_sigv4_tests.rs` | `codex-rs/network-proxy` | teste | 370 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/body_budget.rs` | `codex-rs/network-proxy` | codigo | 195 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/body_budget_tests.rs` | `codex-rs/network-proxy` | teste | 94 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/brokered_tunnel.rs` | `codex-rs/network-proxy` | codigo | 217 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/brokered_tunnel_tests.rs` | `codex-rs/network-proxy` | teste | 549 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/certs.rs` | `codex-rs/network-proxy` | codigo | 1322 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/config.rs` | `codex-rs/network-proxy` | codigo | 1272 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/config/standalone.rs` | `codex-rs/network-proxy` | codigo | 246 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/connect_policy.rs` | `codex-rs/network-proxy` | codigo | 474 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/connection_lifecycle/lifecycle_tests.rs` | `codex-rs/network-proxy` | teste | 266 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/connection_lifecycle/listeners.rs` | `codex-rs/network-proxy` | codigo | 47 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/connection_lifecycle/mod.rs` | `codex-rs/network-proxy` | codigo | 12 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/connection_lifecycle/scope.rs` | `codex-rs/network-proxy` | codigo | 35 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/connection_lifecycle/service.rs` | `codex-rs/network-proxy` | codigo | 43 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/credential_broker.rs` | `codex-rs/network-proxy` | codigo | 1877 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/credential_broker/configured.rs` | `codex-rs/network-proxy` | codigo | 578 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/credential_broker/configured_tests.rs` | `codex-rs/network-proxy` | teste | 3187 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/credential_broker/destination.rs` | `codex-rs/network-proxy` | codigo | 163 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/credential_broker/environment.rs` | `codex-rs/network-proxy` | codigo | 473 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/credential_broker/matching.rs` | `codex-rs/network-proxy` | codigo | 541 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/credential_broker/provider_config.rs` | `codex-rs/network-proxy` | codigo | 40 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/credential_broker/providers.rs` | `codex-rs/network-proxy` | codigo | 215 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/credential_broker/providers/github.rs` | `codex-rs/network-proxy` | codigo | 171 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/credential_broker/providers/openai.rs` | `codex-rs/network-proxy` | codigo | 95 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/credential_broker/registry.rs` | `codex-rs/network-proxy` | codigo | 473 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/credential_broker/replacement.rs` | `codex-rs/network-proxy` | codigo | 155 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/credential_broker_tests.rs` | `codex-rs/network-proxy` | teste | 1763 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/domain_matcher.rs` | `codex-rs/network-proxy` | codigo | 310 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/domain_matcher_tests.rs` | `codex-rs/network-proxy` | teste | 256 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/environment_policy.rs` | `codex-rs/network-proxy` | codigo | 121 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/host_policy_tests.rs` | `codex-rs/network-proxy` | teste | 153 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/http_proxy.rs` | `codex-rs/network-proxy` | codigo | 2290 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/http_proxy/host_header_tests.rs` | `codex-rs/network-proxy` | teste | 168 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/lib.rs` | `codex-rs/network-proxy` | codigo | 146 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/main.rs` | `codex-rs/network-proxy` | codigo | 103 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/main_tests.rs` | `codex-rs/network-proxy` | teste | 103 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/mitm.rs` | `codex-rs/network-proxy` | codigo | 742 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/mitm_forwarding_tests.rs` | `codex-rs/network-proxy` | teste | 594 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/mitm_hook.rs` | `codex-rs/network-proxy` | codigo | 1320 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/mitm_tests.rs` | `codex-rs/network-proxy` | teste | 600 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/native_certs.rs` | `codex-rs/network-proxy` | codigo | 260 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/network_policy.rs` | `codex-rs/network-proxy` | codigo | 1168 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/policy.rs` | `codex-rs/network-proxy` | codigo | 396 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/process_log_metadata.rs` | `codex-rs/network-proxy` | codigo | 17 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/proxy.rs` | `codex-rs/network-proxy` | codigo | 3322 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/proxy/execution_scope.rs` | `codex-rs/network-proxy` | codigo | 64 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/proxy/managed_routing_tests.rs` | `codex-rs/network-proxy` | teste | 123 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/reasons.rs` | `codex-rs/network-proxy` | codigo | 9 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/remote_config.rs` | `codex-rs/network-proxy` | codigo | 267 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/remote_config_tests.rs` | `codex-rs/network-proxy` | teste | 445 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/request_cancellation.rs` | `codex-rs/network-proxy` | codigo | 32 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/request_disconnect.rs` | `codex-rs/network-proxy` | codigo | 45 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/request_disconnect_tests.rs` | `codex-rs/network-proxy` | teste | 41 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/responses.rs` | `codex-rs/network-proxy` | codigo | 121 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/runtime.rs` | `codex-rs/network-proxy` | codigo | 2623 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/secret_substitution.rs` | `codex-rs/network-proxy` | codigo | 264 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/secret_substitution_tests.rs` | `codex-rs/network-proxy` | teste | 261 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/socket_path.rs` | `codex-rs/network-proxy` | codigo | 36 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/socks5.rs` | `codex-rs/network-proxy` | codigo | 1241 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/state.rs` | `codex-rs/network-proxy` | codigo | 464 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/system_dns.rs` | `codex-rs/network-proxy` | codigo | 56 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/system_dns_tests.rs` | `codex-rs/network-proxy` | teste | 95 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/tcp_upstream.rs` | `codex-rs/network-proxy` | codigo | 133 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/tcp_upstream_tests.rs` | `codex-rs/network-proxy` | teste | 126 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/upstream.rs` | `codex-rs/network-proxy` | codigo | 367 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/upstream_tests.rs` | `codex-rs/network-proxy` | teste | 310 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/windows_proxy_ingress.rs` | `codex-rs/network-proxy` | codigo | 368 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/windows_proxy_ingress_tests.rs` | `codex-rs/network-proxy` | teste | 43 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/windows_tcp_attribution.rs` | `codex-rs/network-proxy` | codigo | 309 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/src/windows_tcp_attribution_tests.rs` | `codex-rs/network-proxy` | teste | 112 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/network-proxy/tests/windows_stable_ingress.rs` | `codex-rs/network-proxy` | teste | 588 | `packages/coding-agent/src/extensions/_shared/web/web-transport.ts` |
| `codex-rs/process-hardening/BUILD.bazel` | `codex-rs/process-hardening` | codigo | 6 | `sem equivalente` |
| `codex-rs/process-hardening/src/lib.rs` | `codex-rs/process-hardening` | codigo | 193 | `sem equivalente` |
| `codex-rs/sandboxing/BUILD.bazel` | `codex-rs/sandboxing` | codigo | 13 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/sandboxing/src/bwrap.rs` | `codex-rs/sandboxing` | codigo | 389 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/sandboxing/src/bwrap_tests.rs` | `codex-rs/sandboxing` | teste | 428 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/sandboxing/src/denial.rs` | `codex-rs/sandboxing` | codigo | 72 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/sandboxing/src/launch.rs` | `codex-rs/sandboxing` | codigo | 422 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/sandboxing/src/lib.rs` | `codex-rs/sandboxing` | codigo | 118 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/sandboxing/src/linux.rs` | `codex-rs/sandboxing` | codigo | 171 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/sandboxing/src/linux_pid_namespace.rs` | `codex-rs/sandboxing` | codigo | 23 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/sandboxing/src/linux_tests.rs` | `codex-rs/sandboxing` | teste | 136 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/sandboxing/src/manager.rs` | `codex-rs/sandboxing` | codigo | 812 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/sandboxing/src/manager_tests.rs` | `codex-rs/sandboxing` | teste | 1087 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/sandboxing/src/policy_transforms.rs` | `codex-rs/sandboxing` | codigo | 670 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/sandboxing/src/policy_transforms_tests.rs` | `codex-rs/sandboxing` | teste | 1402 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/sandboxing/src/sandbox_integrity/contents.rs` | `codex-rs/sandboxing` | codigo | 99 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/sandboxing/src/sandbox_integrity/contents_tests.rs` | `codex-rs/sandboxing` | teste | 143 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/sandboxing/src/sandbox_integrity/finding.rs` | `codex-rs/sandboxing` | codigo | 18 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/sandboxing/src/sandbox_integrity/mod.rs` | `codex-rs/sandboxing` | codigo | 9 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/sandboxing/src/sandbox_integrity/policy.rs` | `codex-rs/sandboxing` | codigo | 31 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/sandboxing/src/sandbox_integrity/request.rs` | `codex-rs/sandboxing` | codigo | 34 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/sandboxing/src/seatbelt.rs` | `codex-rs/sandboxing` | codigo | 1024 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/sandboxing/src/seatbelt_base_policy.sbpl` | `codex-rs/sandboxing` | codigo | 116 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/sandboxing/src/seatbelt_daemon.rs` | `codex-rs/sandboxing` | codigo | 24 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/sandboxing/src/seatbelt_daemon_socket_tests.rs` | `codex-rs/sandboxing` | teste | 84 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/sandboxing/src/seatbelt_fcntl_tests.rs` | `codex-rs/sandboxing` | teste | 254 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/sandboxing/src/seatbelt_network_policy.sbpl` | `codex-rs/sandboxing` | codigo | 31 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/sandboxing/src/seatbelt_network_tests.rs` | `codex-rs/sandboxing` | teste | 86 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/sandboxing/src/seatbelt_preferences_policy.sbpl` | `codex-rs/sandboxing` | codigo | 8 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/sandboxing/src/seatbelt_read_only_platform_defaults.sbpl` | `codex-rs/sandboxing` | codigo | 188 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/sandboxing/src/seatbelt_scratch.rs` | `codex-rs/sandboxing` | codigo | 80 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/sandboxing/src/seatbelt_tests.rs` | `codex-rs/sandboxing` | teste | 3086 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/sandboxing/src/seatbelt_tls_tests.rs` | `codex-rs/sandboxing` | teste | 235 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/sandboxing/src/spawn.rs` | `codex-rs/sandboxing` | codigo | 156 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/sandboxing/src/terminal_queries.rs` | `codex-rs/sandboxing` | codigo | 104 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/sandboxing/src/terminal_queries_tests.rs` | `codex-rs/sandboxing` | teste | 104 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/sandboxing/src/violation.rs` | `codex-rs/sandboxing` | codigo | 300 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/sandboxing/src/violation_tests.rs` | `codex-rs/sandboxing` | teste | 237 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/sandboxing/src/windows.rs` | `codex-rs/sandboxing` | codigo | 499 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/sandboxing/src/windows_mxc.rs` | `codex-rs/sandboxing` | codigo | 60 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/sandboxing/src/windows_tests.rs` | `codex-rs/sandboxing` | teste | 58 | `packages/coding-agent/src/core/permissions/` |
| `codex-rs/secrets/BUILD.bazel` | `codex-rs/secrets` | codigo | 6 | `packages/coding-agent/src/core/auth-storage.ts` |
| `codex-rs/secrets/src/lib.rs` | `codex-rs/secrets` | codigo | 263 | `packages/coding-agent/src/core/auth-storage.ts` |
| `codex-rs/secrets/src/local.rs` | `codex-rs/secrets` | codigo | 763 | `packages/coding-agent/src/core/auth-storage.ts` |
| `codex-rs/secrets/src/local_cache_tests.rs` | `codex-rs/secrets` | teste | 183 | `packages/coding-agent/src/core/auth-storage.ts` |
| `codex-rs/secrets/src/sanitizer.rs` | `codex-rs/secrets` | codigo | 87 | `packages/coding-agent/src/core/auth-storage.ts` |
| `codex-rs/shell-command/BUILD.bazel` | `codex-rs/shell-command` | codigo | 10 | `packages/coding-agent/src/core/permissions/guard/` |
| `codex-rs/shell-command/src/bash.rs` | `codex-rs/shell-command` | codigo | 562 | `packages/coding-agent/src/core/permissions/guard/` |
| `codex-rs/shell-command/src/command_safety/is_dangerous_command.rs` | `codex-rs/shell-command` | codigo | 332 | `packages/coding-agent/src/core/permissions/guard/` |
| `codex-rs/shell-command/src/command_safety/mod.rs` | `codex-rs/shell-command` | codigo | 9 | `packages/coding-agent/src/core/permissions/guard/` |
| `codex-rs/shell-command/src/command_safety/powershell_parser.ps1` | `codex-rs/shell-command` | codigo | 281 | `packages/coding-agent/src/core/permissions/guard/` |
| `codex-rs/shell-command/src/command_safety/powershell_parser.rs` | `codex-rs/shell-command` | codigo | 373 | `packages/coding-agent/src/core/permissions/guard/` |
| `codex-rs/shell-command/src/command_safety/powershell_tree_sitter.rs` | `codex-rs/shell-command` | codigo | 482 | `packages/coding-agent/src/core/permissions/guard/` |
| `codex-rs/shell-command/src/command_safety/powershell_tree_sitter_tests.rs` | `codex-rs/shell-command` | teste | 37 | `packages/coding-agent/src/core/permissions/guard/` |
| `codex-rs/shell-command/src/command_safety/windows_dangerous_commands.rs` | `codex-rs/shell-command` | codigo | 849 | `packages/coding-agent/src/core/permissions/guard/` |
| `codex-rs/shell-command/src/lib.rs` | `codex-rs/shell-command` | codigo | 14 | `packages/coding-agent/src/core/permissions/guard/` |
| `codex-rs/shell-command/src/parse_command.rs` | `codex-rs/shell-command` | codigo | 2766 | `packages/coding-agent/src/core/permissions/guard/` |
| `codex-rs/shell-command/src/powershell.rs` | `codex-rs/shell-command` | codigo | 291 | `packages/coding-agent/src/core/permissions/guard/` |
| `codex-rs/shell-command/src/shell_detect.rs` | `codex-rs/shell-command` | codigo | 508 | `packages/coding-agent/src/core/permissions/guard/` |
| `codex-rs/shell-command/src/shell_snapshot.rs` | `codex-rs/shell-command` | codigo | 118 | `packages/coding-agent/src/core/permissions/guard/` |
| `codex-rs/shell-command/src/shell_snapshot_capture.rs` | `codex-rs/shell-command` | codigo | 462 | `packages/coding-agent/src/core/permissions/guard/` |
| `codex-rs/shell-command/src/shell_snapshot_credentials.rs` | `codex-rs/shell-command` | codigo | 358 | `packages/coding-agent/src/core/permissions/guard/` |
| `codex-rs/shell-command/src/shell_snapshot_exports.rs` | `codex-rs/shell-command` | codigo | 81 | `packages/coding-agent/src/core/permissions/guard/` |
| `codex-rs/shell-command/src/shell_snapshot_literals.rs` | `codex-rs/shell-command` | codigo | 715 | `packages/coding-agent/src/core/permissions/guard/` |
| `codex-rs/shell-command/src/shell_snapshot_render.rs` | `codex-rs/shell-command` | codigo | 119 | `packages/coding-agent/src/core/permissions/guard/` |
| `codex-rs/shell-command/src/shell_snapshot_restore.rs` | `codex-rs/shell-command` | codigo | 80 | `packages/coding-agent/src/core/permissions/guard/` |
| `codex-rs/shell-command/src/shell_snapshot_tests.rs` | `codex-rs/shell-command` | teste | 2358 | `packages/coding-agent/src/core/permissions/guard/` |
| `codex-rs/shell-command/src/startup.rs` | `codex-rs/shell-command` | codigo | 30 | `packages/coding-agent/src/core/permissions/guard/` |
| `codex-rs/windows-sandbox-rs/BUILD.bazel` | `codex-rs/windows-sandbox-rs` | codigo | 71 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/build.rs` | `codex-rs/windows-sandbox-rs` | codigo | 39 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/sandbox_smoketests.py` | `codex-rs/windows-sandbox-rs` | codigo | 936 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/acl.rs` | `codex-rs/windows-sandbox-rs` | codigo | 1170 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/acl_tests.rs` | `codex-rs/windows-sandbox-rs` | teste | 197 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/allow.rs` | `codex-rs/windows-sandbox-rs` | codigo | 383 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/app_package.rs` | `codex-rs/windows-sandbox-rs` | codigo | 253 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/app_package_tests.rs` | `codex-rs/windows-sandbox-rs` | teste | 176 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/bin/command_runner/main.rs` | `codex-rs/windows-sandbox-rs` | codigo | 14 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/bin/command_runner/win.rs` | `codex-rs/windows-sandbox-rs` | codigo | 731 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/bin/command_runner/win/cwd_junction.rs` | `codex-rs/windows-sandbox-rs` | codigo | 140 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/bin/command_runner/win/input_loop_tests.rs` | `codex-rs/windows-sandbox-rs` | teste | 86 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/bin/managed_deny_probe/main.rs` | `codex-rs/windows-sandbox-rs` | codigo | 13 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/bin/managed_deny_probe/win.rs` | `codex-rs/windows-sandbox-rs` | codigo | 101 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/bin/setup_main/main.rs` | `codex-rs/windows-sandbox-rs` | codigo | 9 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/cap.rs` | `codex-rs/windows-sandbox-rs` | codigo | 203 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/cmd_script.rs` | `codex-rs/windows-sandbox-rs` | codigo | 23 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/cmd_script_tests.rs` | `codex-rs/windows-sandbox-rs` | teste | 19 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/conpty/mod.rs` | `codex-rs/windows-sandbox-rs` | codigo | 178 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/deny_read_acl.rs` | `codex-rs/windows-sandbox-rs` | codigo | 152 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/deny_read_resolver.rs` | `codex-rs/windows-sandbox-rs` | codigo | 714 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/deny_read_resolver_access_tests.rs` | `codex-rs/windows-sandbox-rs` | teste | 229 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/deny_read_state.rs` | `codex-rs/windows-sandbox-rs` | codigo | 178 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/deny_read_state_tests.rs` | `codex-rs/windows-sandbox-rs` | teste | 351 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/desktop.rs` | `codex-rs/windows-sandbox-rs` | codigo | 472 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/desktop_tests.rs` | `codex-rs/windows-sandbox-rs` | teste | 241 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/dpapi.rs` | `codex-rs/windows-sandbox-rs` | codigo | 85 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/elevated/ipc_framed.rs` | `codex-rs/windows-sandbox-rs` | codigo | 262 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/elevated/mod.rs` | `codex-rs/windows-sandbox-rs` | codigo | 4 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/elevated/runner_client.rs` | `codex-rs/windows-sandbox-rs` | codigo | 643 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/elevated/runner_metrics.rs` | `codex-rs/windows-sandbox-rs` | codigo | 35 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/elevated/runner_metrics_tests.rs` | `codex-rs/windows-sandbox-rs` | teste | 27 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/elevated/runner_pipe.rs` | `codex-rs/windows-sandbox-rs` | codigo | 133 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/elevated_impl.rs` | `codex-rs/windows-sandbox-rs` | codigo | 332 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/env.rs` | `codex-rs/windows-sandbox-rs` | codigo | 177 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/environment_transport.rs` | `codex-rs/windows-sandbox-rs` | codigo | 197 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/environment_transport_tests.rs` | `codex-rs/windows-sandbox-rs` | teste | 146 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/file_write.rs` | `codex-rs/windows-sandbox-rs` | codigo | 149 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/file_write_tests.rs` | `codex-rs/windows-sandbox-rs` | teste | 70 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/framed_io.rs` | `codex-rs/windows-sandbox-rs` | codigo | 91 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/helper_materialization.rs` | `codex-rs/windows-sandbox-rs` | codigo | 432 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/helper_materialization/copy.rs` | `codex-rs/windows-sandbox-rs` | codigo | 120 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/helper_materialization/copy_tests.rs` | `codex-rs/windows-sandbox-rs` | teste | 58 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/hide_users.rs` | `codex-rs/windows-sandbox-rs` | codigo | 198 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/identity.rs` | `codex-rs/windows-sandbox-rs` | codigo | 627 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/identity_integration_tests.rs` | `codex-rs/windows-sandbox-rs` | teste | 274 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/installation_record.rs` | `codex-rs/windows-sandbox-rs` | codigo | 101 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/launch_environment.rs` | `codex-rs/windows-sandbox-rs` | codigo | 38 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/launch_environment_tests.rs` | `codex-rs/windows-sandbox-rs` | teste | 16 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/lib.rs` | `codex-rs/windows-sandbox-rs` | codigo | 1087 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/logging.rs` | `codex-rs/windows-sandbox-rs` | codigo | 284 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/no_reparse_dir.rs` | `codex-rs/windows-sandbox-rs` | codigo | 284 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/no_reparse_dir_tests.rs` | `codex-rs/windows-sandbox-rs` | teste | 194 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/package_identity.rs` | `codex-rs/windows-sandbox-rs` | codigo | 48 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/path_normalization.rs` | `codex-rs/windows-sandbox-rs` | codigo | 31 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/proc_thread_attr.rs` | `codex-rs/windows-sandbox-rs` | codigo | 143 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/process.rs` | `codex-rs/windows-sandbox-rs` | codigo | 368 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/provisioning_client.rs` | `codex-rs/windows-sandbox-rs` | codigo | 489 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/provisioning_client/group_change.rs` | `codex-rs/windows-sandbox-rs` | codigo | 25 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/provisioning_client/refresh_retry.rs` | `codex-rs/windows-sandbox-rs` | codigo | 105 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/provisioning_client/refresh_retry_tests.rs` | `codex-rs/windows-sandbox-rs` | teste | 121 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/provisioning_client_tests.rs` | `codex-rs/windows-sandbox-rs` | teste | 105 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/provisioning_protocol.rs` | `codex-rs/windows-sandbox-rs` | codigo | 89 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/resolved_permissions.rs` | `codex-rs/windows-sandbox-rs` | codigo | 683 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/runtime_ownership.rs` | `codex-rs/windows-sandbox-rs` | codigo | 254 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/runtime_ownership_tests.rs` | `codex-rs/windows-sandbox-rs` | teste | 275 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/sandbox_utils.rs` | `codex-rs/windows-sandbox-rs` | codigo | 119 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/service_diagnostics.rs` | `codex-rs/windows-sandbox-rs` | codigo | 129 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/service_identity.rs` | `codex-rs/windows-sandbox-rs` | codigo | 67 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/service_identity_tests.rs` | `codex-rs/windows-sandbox-rs` | teste | 26 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/setup.rs` | `codex-rs/windows-sandbox-rs` | codigo | 2757 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/setup_acl_error.rs` | `codex-rs/windows-sandbox-rs` | codigo | 43 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/setup_acl_error_tests.rs` | `codex-rs/windows-sandbox-rs` | teste | 74 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/setup_error.rs` | `codex-rs/windows-sandbox-rs` | codigo | 295 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/setup_launch.rs` | `codex-rs/windows-sandbox-rs` | codigo | 75 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/setup_launch_tests.rs` | `codex-rs/windows-sandbox-rs` | teste | 136 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/setup_mutex.rs` | `codex-rs/windows-sandbox-rs` | codigo | 83 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/setup_provisioning.rs` | `codex-rs/windows-sandbox-rs` | codigo | 1589 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/setup_provisioning/acl_tests.rs` | `codex-rs/windows-sandbox-rs` | teste | 235 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/setup_provisioning/firewall.rs` | `codex-rs/windows-sandbox-rs` | codigo | 643 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/setup_provisioning/firewall_apartment_tests.rs` | `codex-rs/windows-sandbox-rs` | teste | 40 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/setup_provisioning/read_acl_mutex.rs` | `codex-rs/windows-sandbox-rs` | codigo | 61 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/setup_provisioning/registered_tests.rs` | `codex-rs/windows-sandbox-rs` | teste | 91 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/setup_provisioning/sandbox_users.rs` | `codex-rs/windows-sandbox-rs` | codigo | 526 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/setup_provisioning/sandbox_users_tests.rs` | `codex-rs/windows-sandbox-rs` | teste | 104 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/setup_provisioning/service.rs` | `codex-rs/windows-sandbox-rs` | codigo | 50 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/setup_provisioning/setup_runtime_bin.rs` | `codex-rs/windows-sandbox-rs` | codigo | 211 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/setup_provisioning/setup_runtime_bin_tests.rs` | `codex-rs/windows-sandbox-rs` | teste | 249 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/setup_provisioning/setup_runtime_long_paths_tests.rs` | `codex-rs/windows-sandbox-rs` | teste | 80 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/setup_refresh_tests.rs` | `codex-rs/windows-sandbox-rs` | teste | 64 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/spawn_prep.rs` | `codex-rs/windows-sandbox-rs` | codigo | 719 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/ssh_config_dependencies.rs` | `codex-rs/windows-sandbox-rs` | codigo | 249 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/stdio_bridge.rs` | `codex-rs/windows-sandbox-rs` | codigo | 126 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/stdio_bridge_tests.rs` | `codex-rs/windows-sandbox-rs` | teste | 63 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/token.rs` | `codex-rs/windows-sandbox-rs` | codigo | 533 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/token_groups_tests.rs` | `codex-rs/windows-sandbox-rs` | teste | 118 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/token_tests.rs` | `codex-rs/windows-sandbox-rs` | teste | 231 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/token_user.rs` | `codex-rs/windows-sandbox-rs` | codigo | 74 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/token_user_tests.rs` | `codex-rs/windows-sandbox-rs` | teste | 78 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs` | `codex-rs/windows-sandbox-rs` | codigo | 282 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated_tests.rs` | `codex-rs/windows-sandbox-rs` | teste | 260 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/unified_exec/backends/legacy.rs` | `codex-rs/windows-sandbox-rs` | codigo | 505 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/unified_exec/backends/mod.rs` | `codex-rs/windows-sandbox-rs` | codigo | 3 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/unified_exec/backends/windows_common.rs` | `codex-rs/windows-sandbox-rs` | codigo | 178 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/unified_exec/backends/windows_common_tests.rs` | `codex-rs/windows-sandbox-rs` | teste | 34 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/unified_exec/mod.rs` | `codex-rs/windows-sandbox-rs` | codigo | 189 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/unified_exec/tests.rs` | `codex-rs/windows-sandbox-rs` | codigo | 1192 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/uninstall_windows.rs` | `codex-rs/windows-sandbox-rs` | codigo | 203 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/uninstall_windows/firewall.rs` | `codex-rs/windows-sandbox-rs` | codigo | 35 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/uninstall_windows/principals.rs` | `codex-rs/windows-sandbox-rs` | codigo | 185 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/uninstall_windows/principals_tests.rs` | `codex-rs/windows-sandbox-rs` | teste | 240 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/uninstall_windows/processes.rs` | `codex-rs/windows-sandbox-rs` | codigo | 231 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/uninstall_windows/retained_logons.rs` | `codex-rs/windows-sandbox-rs` | codigo | 81 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/uninstall_windows/retained_logons_tests.rs` | `codex-rs/windows-sandbox-rs` | teste | 109 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/wfp.rs` | `codex-rs/windows-sandbox-rs` | codigo | 451 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/wfp/filter_specs.rs` | `codex-rs/windows-sandbox-rs` | codigo | 124 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/wfp_setup.rs` | `codex-rs/windows-sandbox-rs` | codigo | 183 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/winutil.rs` | `codex-rs/windows-sandbox-rs` | codigo | 363 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/workspace_acl.rs` | `codex-rs/windows-sandbox-rs` | codigo | 30 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/wrapper.rs` | `codex-rs/windows-sandbox-rs` | codigo | 489 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/src/wrapper_tests.rs` | `codex-rs/windows-sandbox-rs` | teste | 195 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/tests/helper_manifest.rs` | `codex-rs/windows-sandbox-rs` | teste | 78 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/tests/support/BUILD.bazel` | `codex-rs/windows-sandbox-rs` | teste | 8 | `sem equivalente` |
| `codex-rs/windows-sandbox-rs/tests/support/src/lib.rs` | `codex-rs/windows-sandbox-rs` | teste | 49 | `sem equivalente` |
| `codex-rs/windows-sandbox-service/BUILD.bazel` | `codex-rs/windows-sandbox-service` | codigo | 14 | `sem equivalente` |
| `codex-rs/windows-sandbox-service/src/installation_record.rs` | `codex-rs/windows-sandbox-service` | codigo | 120 | `sem equivalente` |
| `codex-rs/windows-sandbox-service/src/installation_record_tests.rs` | `codex-rs/windows-sandbox-service` | teste | 25 | `sem equivalente` |
| `codex-rs/windows-sandbox-service/src/ipc.rs` | `codex-rs/windows-sandbox-service` | codigo | 405 | `sem equivalente` |
| `codex-rs/windows-sandbox-service/src/ipc/authentication.rs` | `codex-rs/windows-sandbox-service` | codigo | 224 | `sem equivalente` |
| `codex-rs/windows-sandbox-service/src/ipc/home.rs` | `codex-rs/windows-sandbox-service` | codigo | 170 | `sem equivalente` |
| `codex-rs/windows-sandbox-service/src/ipc/listener.rs` | `codex-rs/windows-sandbox-service` | codigo | 121 | `sem equivalente` |
| `codex-rs/windows-sandbox-service/src/ipc/request.rs` | `codex-rs/windows-sandbox-service` | codigo | 97 | `sem equivalente` |
| `codex-rs/windows-sandbox-service/src/ipc_tests.rs` | `codex-rs/windows-sandbox-service` | teste | 901 | `sem equivalente` |
| `codex-rs/windows-sandbox-service/src/lib.rs` | `codex-rs/windows-sandbox-service` | codigo | 45 | `sem equivalente` |
| `codex-rs/windows-sandbox-service/src/machine_policy.rs` | `codex-rs/windows-sandbox-service` | codigo | 157 | `sem equivalente` |
| `codex-rs/windows-sandbox-service/src/machine_policy_tests.rs` | `codex-rs/windows-sandbox-service` | teste | 334 | `sem equivalente` |
| `codex-rs/windows-sandbox-service/src/main.rs` | `codex-rs/windows-sandbox-service` | codigo | 22 | `sem equivalente` |
| `codex-rs/windows-sandbox-service/src/main_tests.rs` | `codex-rs/windows-sandbox-service` | teste | 44 | `sem equivalente` |
| `codex-rs/windows-sandbox-service/src/package_identity.rs` | `codex-rs/windows-sandbox-service` | codigo | 121 | `sem equivalente` |
| `codex-rs/windows-sandbox-service/src/package_identity/registered.rs` | `codex-rs/windows-sandbox-service` | codigo | 83 | `sem equivalente` |
| `codex-rs/windows-sandbox-service/src/package_lifecycle.rs` | `codex-rs/windows-sandbox-service` | codigo | 341 | `sem equivalente` |
| `codex-rs/windows-sandbox-service/src/package_lifecycle/cleanup.rs` | `codex-rs/windows-sandbox-service` | codigo | 193 | `sem equivalente` |
| `codex-rs/windows-sandbox-service/src/package_lifecycle/registered.rs` | `codex-rs/windows-sandbox-service` | codigo | 153 | `sem equivalente` |
| `codex-rs/windows-sandbox-service/src/provisioning.rs` | `codex-rs/windows-sandbox-service` | codigo | 146 | `sem equivalente` |
| `codex-rs/windows-sandbox-service/src/provisioning/legacy_bin.rs` | `codex-rs/windows-sandbox-service` | codigo | 87 | `sem equivalente` |
| `codex-rs/windows-sandbox-service/src/provisioning/registered.rs` | `codex-rs/windows-sandbox-service` | codigo | 222 | `sem equivalente` |
| `codex-rs/windows-sandbox-service/src/provisioning/registered_tests.rs` | `codex-rs/windows-sandbox-service` | teste | 266 | `sem equivalente` |
| `codex-rs/windows-sandbox-service/src/registered_runtime.rs` | `codex-rs/windows-sandbox-service` | codigo | 380 | `sem equivalente` |
| `codex-rs/windows-sandbox-service/src/registered_runtime/known_folder.rs` | `codex-rs/windows-sandbox-service` | codigo | 32 | `sem equivalente` |
| `codex-rs/windows-sandbox-service/src/registered_runtime/metadata.rs` | `codex-rs/windows-sandbox-service` | codigo | 326 | `sem equivalente` |
| `codex-rs/windows-sandbox-service/src/registered_runtime/metadata_tests.rs` | `codex-rs/windows-sandbox-service` | teste | 97 | `sem equivalente` |
| `codex-rs/windows-sandbox-service/src/registered_runtime/registration_result.rs` | `codex-rs/windows-sandbox-service` | codigo | 101 | `sem equivalente` |
| `codex-rs/windows-sandbox-service/src/registered_runtime/registration_result/appx_events.rs` | `codex-rs/windows-sandbox-service` | codigo | 57 | `sem equivalente` |
| `codex-rs/windows-sandbox-service/src/registered_runtime/registration_result_tests.rs` | `codex-rs/windows-sandbox-service` | teste | 118 | `sem equivalente` |
| `codex-rs/windows-sandbox-service/src/registered_runtime/removal.ps1` | `codex-rs/windows-sandbox-service` | codigo | 191 | `sem equivalente` |
| `codex-rs/windows-sandbox-service/src/registered_runtime/removal.rs` | `codex-rs/windows-sandbox-service` | codigo | 283 | `sem equivalente` |
| `codex-rs/windows-sandbox-service/src/registered_runtime/removal_tests.rs` | `codex-rs/windows-sandbox-service` | teste | 153 | `sem equivalente` |
| `codex-rs/windows-sandbox-service/src/service.rs` | `codex-rs/windows-sandbox-service` | codigo | 406 | `sem equivalente` |
| `codex-rs/windows-sandbox-service/src/service/runtime_lifecycle.rs` | `codex-rs/windows-sandbox-service` | codigo | 180 | `sem equivalente` |
| `codex-rs/windows-sandbox-service/src/service/runtime_lifecycle_tests.rs` | `codex-rs/windows-sandbox-service` | teste | 103 | `sem equivalente` |
| `codex-rs/windows-sandbox-service/src/uninstall_policy.rs` | `codex-rs/windows-sandbox-service` | codigo | 28 | `sem equivalente` |
| `codex-rs/windows-sandbox-service/src/uninstall_policy_tests.rs` | `codex-rs/windows-sandbox-service` | teste | 74 | `sem equivalente` |
