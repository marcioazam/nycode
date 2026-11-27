# Inventario: packages-agent

Cada linha: arquivo omp (relativo a `~/source/oh-my-pi-ref`), categoria, origem em relacao ao Pi 0.9.4, dono no nycode (relativo a raiz do repositorio) ou `sem equivalente`, nota. Regras em `../inventario.md`.

| Arquivo | Categoria | Origem | Dono no nycode | Nota |
|---|---|---|---|---|
| `packages/agent/bench/normalize-tools.bench.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/bench/proxy-partial-json.bench.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/bench/stable-prefix.bench.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/src/agent-loop.ts` | codigo | omp-novo | `packages/agent/src/agent-loop.ts` | mesmo caminho; existe no Pi 073b0ba |
| `packages/agent/src/agent.ts` | codigo | pi0.9.4-modificado | `packages/agent/src/agent.ts` | mesmo caminho; existe no Pi 073b0ba; +2410/-268 |
| `packages/agent/src/append-only-context.ts` | codigo | omp-novo | sem equivalente |  |
| `packages/agent/src/compaction.ts` | codigo | omp-novo | `packages/coding-agent/src/core/compaction` |  |
| `packages/agent/src/compaction/anthropic.ts` | codigo | omp-novo | `packages/coding-agent/src/core/compaction` |  |
| `packages/agent/src/compaction/azure-openai-endpoint.ts` | codigo | omp-novo | `packages/coding-agent/src/core/compaction` |  |
| `packages/agent/src/compaction/bedrock.ts` | codigo | omp-novo | `packages/coding-agent/src/core/compaction` |  |
| `packages/agent/src/compaction/branch-summarization.ts` | codigo | omp-novo | `packages/coding-agent/src/core/compaction` |  |
| `packages/agent/src/compaction/compaction-v2-streaming.ts` | codigo | omp-novo | `packages/coding-agent/src/core/compaction` |  |
| `packages/agent/src/compaction/compaction.ts` | codigo | omp-novo | `packages/coding-agent/src/core/compaction` |  |
| `packages/agent/src/compaction/entries.ts` | codigo | omp-novo | `packages/coding-agent/src/core/compaction` |  |
| `packages/agent/src/compaction/errors.ts` | codigo | omp-novo | `packages/coding-agent/src/core/compaction` |  |
| `packages/agent/src/compaction/index.ts` | codigo | omp-novo | `packages/coding-agent/src/core/compaction` |  |
| `packages/agent/src/compaction/message-cache.ts` | codigo | omp-novo | `packages/coding-agent/src/core/compaction` |  |
| `packages/agent/src/compaction/messages.ts` | codigo | omp-novo | `packages/coding-agent/src/core/compaction` |  |
| `packages/agent/src/compaction/openai.ts` | codigo | omp-novo | `packages/coding-agent/src/core/compaction` |  |
| `packages/agent/src/compaction/prompts/anthropic-compaction-instructions.md` | prompt | omp-novo | `packages/coding-agent/src/core/compaction` |  |
| `packages/agent/src/compaction/prompts/auto-handoff-threshold-focus.md` | prompt | omp-novo | `packages/coding-agent/src/core/compaction` |  |
| `packages/agent/src/compaction/prompts/branch-summary-context.md` | prompt | omp-novo | `packages/coding-agent/src/core/compaction` |  |
| `packages/agent/src/compaction/prompts/branch-summary-preamble.md` | prompt | omp-novo | `packages/coding-agent/src/core/compaction` |  |
| `packages/agent/src/compaction/prompts/branch-summary.md` | prompt | omp-novo | `packages/coding-agent/src/core/compaction` |  |
| `packages/agent/src/compaction/prompts/compaction-short-summary.md` | prompt | omp-novo | `packages/coding-agent/src/core/compaction` |  |
| `packages/agent/src/compaction/prompts/compaction-summary-context.md` | prompt | omp-novo | `packages/coding-agent/src/core/compaction` |  |
| `packages/agent/src/compaction/prompts/compaction-summary.md` | prompt | omp-novo | `packages/coding-agent/src/core/compaction` |  |
| `packages/agent/src/compaction/prompts/compaction-turn-prefix.md` | prompt | omp-novo | `packages/coding-agent/src/core/compaction` |  |
| `packages/agent/src/compaction/prompts/compaction-update-summary.md` | prompt | omp-novo | `packages/coding-agent/src/core/compaction` |  |
| `packages/agent/src/compaction/prompts/context-window-truncated-output.md` | prompt | omp-novo | `packages/coding-agent/src/core/compaction` |  |
| `packages/agent/src/compaction/prompts/handoff-document.md` | prompt | omp-novo | `packages/coding-agent/src/core/compaction` |  |
| `packages/agent/src/compaction/prompts/handoff-summary-context.md` | prompt | omp-novo | `packages/coding-agent/src/core/compaction` |  |
| `packages/agent/src/compaction/prompts/snapcompact-archive-context.md` | prompt | omp-novo | `packages/coding-agent/src/core/compaction` |  |
| `packages/agent/src/compaction/prompts/summarization-system.md` | prompt | omp-novo | `packages/coding-agent/src/core/compaction` |  |
| `packages/agent/src/compaction/pruning.ts` | codigo | omp-novo | `packages/coding-agent/src/core/compaction` |  |
| `packages/agent/src/compaction/shake.ts` | codigo | omp-novo | `packages/coding-agent/src/core/compaction` |  |
| `packages/agent/src/compaction/tool-protection.ts` | codigo | omp-novo | `packages/coding-agent/src/core/compaction` |  |
| `packages/agent/src/compaction/transcript-tokens.ts` | codigo | omp-novo | `packages/coding-agent/src/core/compaction` |  |
| `packages/agent/src/compaction/utils.ts` | codigo | omp-novo | `packages/coding-agent/src/core/compaction` |  |
| `packages/agent/src/image-tokens.ts` | codigo | omp-novo | `packages/ai/src/utils/estimate.ts` |  |
| `packages/agent/src/index.ts` | codigo | pi0.9.4-modificado | `packages/agent/src/index.ts` | mesmo caminho; existe no Pi 073b0ba; +32/-20 |
| `packages/agent/src/live-steering.ts` | codigo | omp-novo | `packages/coding-agent/src/modes/interactive/send-now` |  |
| `packages/agent/src/output-budget.ts` | codigo | omp-novo | `packages/coding-agent/src/core/output-guard.ts` |  |
| `packages/agent/src/pause.ts` | codigo | omp-novo | `packages/coding-agent/src/modes/interactive/send-now` |  |
| `packages/agent/src/prompts/dsml-tool-call-leak.md` | prompt | omp-novo | sem equivalente |  |
| `packages/agent/src/proxy.ts` | codigo | omp-novo | `packages/agent/src/proxy.ts` | mesmo caminho; existe no Pi 073b0ba |
| `packages/agent/src/replay-policy.ts` | codigo | omp-novo | sem equivalente |  |
| `packages/agent/src/run-collector.ts` | codigo | omp-novo | `packages/agent/src/agent-loop.ts` |  |
| `packages/agent/src/sent-tool-definitions.ts` | codigo | omp-novo | sem equivalente |  |
| `packages/agent/src/speculative-execution.ts` | codigo | omp-novo | sem equivalente |  |
| `packages/agent/src/telemetry.ts` | codigo | omp-novo | `packages/coding-agent/src/core/telemetry.ts` |  |
| `packages/agent/src/thinking.ts` | codigo | omp-novo | `packages/coding-agent/src/extensions/thinking` |  |
| `packages/agent/src/tokenizer.ts` | codigo | omp-novo | `packages/ai/src/utils/estimate.ts` |  |
| `packages/agent/src/tool-arguments.ts` | codigo | omp-novo | `packages/agent/src/agent-loop.ts` |  |
| `packages/agent/src/tool-context.ts` | codigo | omp-novo | `packages/agent/src/agent-loop.ts` |  |
| `packages/agent/src/types.ts` | codigo | pi0.9.4-modificado | `packages/agent/src/types.ts` | mesmo caminho; existe no Pi 073b0ba; +1329/-39 |
| `packages/agent/test/agent-log-context.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/agent-loop-trailing-finalize.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/agent-loop.test.ts` | teste | omp-novo | `packages/agent/test/agent-loop.test.ts` | mesmo caminho; existe no Pi 073b0ba |
| `packages/agent/test/agent-side-request-context.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/agent.test.ts` | teste | pi0.9.4-modificado | `packages/agent/test/agent.test.ts` | mesmo caminho; existe no Pi 073b0ba; +2272/-86 |
| `packages/agent/test/anthropic-fallback-handoff.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/anthropic-native-compaction.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/append-only-context.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/arg-stream.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/branch-summarization.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/compact-reset-boundary.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/compaction-base-window.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/compaction-boundary.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/compaction-cut-point.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/compaction-error-status.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/compaction-file-ops.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/compaction-fixed-threshold.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/compaction-oneshot-retry.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/compaction-oversized-input.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/compaction-reserve-provenance.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/compaction-short-summary.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/compaction-summary-cap.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/compaction-telemetry.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/compaction-thinking-level.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/context-tokens-orchestration.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/continue-empty-transcript.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/handoff.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/helpers.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/image-tokens.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/instrumented-oneshot-retry.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/live-steering.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/message-cache.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/normalize-tools-prune.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/otel-content-capture-env.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/otel.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/output-budget.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/pause-gate.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/prompt-tools-loop.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/proxy-stream-disconnect.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/proxy-toolcall-partial-json.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/queued-message-preparation.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/remote-compaction.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/run-summary.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/sent-tool-definitions.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/serialize-conversation.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/shake.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/snapcompact-frames.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/soft-tool-requirement.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/speculative-commit-gate.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/speculative-transform-once.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/supersede-prune.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/tokenizer.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/tool-protection.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/transcript-tokens.test.ts` | teste | omp-novo | `packages/agent/test` |  |
| `packages/agent/test/utils/calculate.ts` | teste | omp-novo | `packages/agent/test/utils/calculate.ts` | mesmo caminho; existe no Pi 073b0ba |
| `packages/agent/test/utils/get-current-time.ts` | teste | omp-novo | `packages/agent/test/utils/get-current-time.ts` | mesmo caminho; existe no Pi 073b0ba |
