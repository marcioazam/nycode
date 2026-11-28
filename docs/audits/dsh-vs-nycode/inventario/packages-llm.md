# Inventario `dsh`: `packages-llm`

Total: **182** arquivos (`codigo`: 84, `teste`: 97, `gerado`: 1; `sem equivalente`: 15).

| Arquivo `dsh` | Categoria | Equivalente `nycode` | Nota |
|---|---|---|---|
| `packages/llm/deepseek-llm-api-extensions/src/index.ts` | codigo | `sem equivalente` | extensoes proprietarias da API DeepSeek |
| `packages/llm/deepseek-llm-api-extensions/src/types.ts` | codigo | `sem equivalente` | extensoes proprietarias da API DeepSeek |
| `packages/llm/deepseek-llm-api-extensions/tests/registry.spec.ts` | teste | `sem equivalente` | extensoes proprietarias da API DeepSeek |
| `packages/llm/llm-deepseek-account/src/account-tasks.ts` | codigo | `sem equivalente` | rota autenticada por conta DeepSeek |
| `packages/llm/llm-deepseek-account/src/config.ts` | codigo | `sem equivalente` | rota autenticada por conta DeepSeek |
| `packages/llm/llm-deepseek-account/src/index.ts` | codigo | `sem equivalente` | rota autenticada por conta DeepSeek |
| `packages/llm/llm-deepseek-account/tests/account-quota.spec.ts` | teste | `sem equivalente` | rota autenticada por conta DeepSeek |
| `packages/llm/llm-deepseek-account/tests/account-signout.spec.ts` | teste | `sem equivalente` | rota autenticada por conta DeepSeek |
| `packages/llm/llm-deepseek-account/tests/account-tasks.spec.ts` | teste | `sem equivalente` | rota autenticada por conta DeepSeek |
| `packages/llm/llm-deepseek-account/tests/config.spec.ts` | teste | `sem equivalente` | rota autenticada por conta DeepSeek |
| `packages/llm/llm-deepseek-account/tests/provider.spec.ts` | teste | `sem equivalente` | rota autenticada por conta DeepSeek |
| `packages/llm/llm-deepseek-api-key/src/config.ts` | codigo | `packages/ai/src/env-api-keys.ts` | resolucao de chave DeepSeek |
| `packages/llm/llm-deepseek-api-key/src/index.ts` | codigo | `packages/ai/src/env-api-keys.ts` | resolucao de chave DeepSeek |
| `packages/llm/llm-deepseek-api-key/tests/config.spec.ts` | teste | `packages/ai/src/env-api-keys.ts` | resolucao de chave DeepSeek |
| `packages/llm/llm-deepseek-api-key/tests/discovery.spec.ts` | teste | `packages/ai/src/env-api-keys.ts` | resolucao de chave DeepSeek |
| `packages/llm/llm-deepseek-api-key/tests/listing.spec.ts` | teste | `packages/ai/src/env-api-keys.ts` | resolucao de chave DeepSeek |
| `packages/llm/llm-deepseek/src/adapter.ts` | codigo | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/src/auth-headers.ts` | codigo | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/src/config.ts` | codigo | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/src/defaults.ts` | codigo | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/src/file-id.ts` | codigo | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/src/file-store.ts` | codigo | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/src/files-api.ts` | codigo | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/src/host.ts` | codigo | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/src/image-tokens.ts` | codigo | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/src/images.ts` | codigo | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/src/index.ts` | codigo | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/src/listed-catalog.ts` | codigo | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/src/listing-cache.ts` | codigo | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/src/listing-config.ts` | codigo | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/src/listing.ts` | codigo | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/src/messages-api.ts` | codigo | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/src/model-info.ts` | codigo | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/src/models.ts` | codigo | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/src/replay.ts` | codigo | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/src/request-extensions.ts` | codigo | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/src/request-files.ts` | codigo | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/src/request-pricing.ts` | codigo | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/src/serialize.ts` | codigo | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/src/sse.ts` | codigo | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/src/translate.ts` | codigo | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/src/transport.ts` | codigo | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/src/types.ts` | codigo | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/src/upload-index.ts` | codigo | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/src/wire-types.ts` | codigo | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/tests/account-routing.spec.ts` | teste | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/tests/account-signout-composition.spec.ts` | teste | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/tests/adapter.e2e.ts` | teste | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/tests/adapter.spec.ts` | teste | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/tests/assemble.ts` | teste | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/tests/built-in-catalog.spec.ts` | teste | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/tests/dynamic-config.spec.ts` | teste | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/tests/egress.spec.ts` | teste | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/tests/extensions.spec.ts` | teste | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/tests/file-store.spec.ts` | teste | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/tests/files-api.spec.ts` | teste | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/tests/files-upload-cancel.spec.ts` | teste | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/tests/files.spec.ts` | teste | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/tests/fixtures/all-deferred-tools.ts` | teste | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/tests/fixtures/deferred-tools.ts` | teste | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/tests/fixtures/history.ts` | teste | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/tests/fixtures/input-history.ts` | teste | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/tests/helpers.ts` | teste | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/tests/image-tokens.spec.ts` | teste | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/tests/listed-catalog.spec.ts` | teste | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/tests/listing-cache.spec.ts` | teste | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/tests/listing.spec.ts` | teste | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/tests/loader-composition.spec.ts` | teste | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/tests/mock-server.ts` | teste | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/tests/model-info.spec.ts` | teste | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/tests/official-route-turn.spec.ts` | teste | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/tests/prepared-call.spec.ts` | teste | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/tests/provider-hooks.spec.ts` | teste | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/tests/request-pricing.spec.ts` | teste | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/tests/route-credential.spec.ts` | teste | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/tests/runtime.e2e.ts` | teste | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/tests/runtime.spec.ts` | teste | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/tests/serialize.spec.ts` | teste | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/tests/stream.spec.ts` | teste | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-deepseek/tests/upload-index.spec.ts` | teste | `packages/ai/src/api/openai-completions.ts` | adapter nativo DeepSeek API |
| `packages/llm/llm-pi-ai/scripts/gen-provider-data.ts` | codigo | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/src/adapter.ts` | codigo | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/src/auth.ts` | codigo | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/src/catalog.ts` | codigo | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/src/config.ts` | codigo | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/src/context.ts` | codigo | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/src/discovery.ts` | codigo | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/src/image-policy.ts` | codigo | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/src/index.ts` | codigo | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/src/login.ts` | codigo | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/src/models.ts` | codigo | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/src/prefix-binding.ts` | codigo | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/src/provider-data.generated.ts` | gerado | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/src/provider-data.ts` | codigo | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/src/provider.ts` | codigo | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/src/replay.ts` | codigo | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/src/stream.ts` | codigo | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/src/types.ts` | codigo | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/tests/adapter.e2e.ts` | teste | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/tests/adapter.spec.ts` | teste | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/tests/assemble.ts` | teste | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/tests/auth-double.ts` | teste | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/tests/auth.spec.ts` | teste | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/tests/catalog-provider-ids.spec.ts` | teste | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/tests/catalog.spec.ts` | teste | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/tests/compat-upgrade.spec.ts` | teste | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/tests/completed-tool-arguments.spec.ts` | teste | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/tests/config.spec.ts` | teste | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/tests/context.spec.ts` | teste | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/tests/conversation-updates.spec.ts` | teste | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/tests/convert.spec.ts` | teste | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/tests/discovery.spec.ts` | teste | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/tests/dynamic-config.spec.ts` | teste | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/tests/egress.spec.ts` | teste | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/tests/fixtures/image-limits.ts` | teste | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/tests/gemini-protocol.spec.ts` | teste | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/tests/image-policy.spec.ts` | teste | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/tests/loader-composition.spec.ts` | teste | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/tests/login.spec.ts` | teste | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/tests/mock-server.ts` | teste | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/tests/native-auth.spec.ts` | teste | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/tests/prefix-binding.spec.ts` | teste | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/tests/protocol-roundtrip.spec.ts` | teste | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/tests/provider-apis.e2e.ts` | teste | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/tests/request-headers.spec.ts` | teste | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/tests/sdk-options.spec.ts` | teste | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-pi-ai/tests/tool-argument-streaming.spec.ts` | teste | `packages/ai/src/` | ponte multi-provider pi-ai |
| `packages/llm/llm-retry/src/brand.ts` | codigo | `packages/ai/src/utils/retry.ts` | politica de retry LLM |
| `packages/llm/llm-retry/src/index.ts` | codigo | `packages/ai/src/utils/retry.ts` | politica de retry LLM |
| `packages/llm/llm-retry/src/types.ts` | codigo | `packages/ai/src/utils/retry.ts` | politica de retry LLM |
| `packages/llm/llm-retry/tests/initialization.spec.ts` | teste | `packages/ai/src/utils/retry.ts` | politica de retry LLM |
| `packages/llm/llm-retry/tests/loader-composition.spec.ts` | teste | `packages/ai/src/utils/retry.ts` | politica de retry LLM |
| `packages/llm/llm-retry/tests/persistence.spec.ts` | teste | `packages/ai/src/utils/retry.ts` | politica de retry LLM |
| `packages/llm/llm-retry/tests/retry.spec.ts` | teste | `packages/ai/src/utils/retry.ts` | politica de retry LLM |
| `packages/llm/llm-retry/tests/transport-recovery.spec.ts` | teste | `packages/ai/src/utils/retry.ts` | politica de retry LLM |
| `packages/llm/llm-retry/tsdown.config.ts` | codigo | `packages/ai/src/utils/retry.ts` | politica de retry LLM |
| `packages/llm/llm/src/adapter-failure.ts` | codigo | `packages/ai/src/` | vocabulario LLM e seam de adapters |
| `packages/llm/llm/src/assembler.ts` | codigo | `packages/ai/src/` | vocabulario LLM e seam de adapters |
| `packages/llm/llm/src/assistant-stream.ts` | codigo | `packages/ai/src/` | vocabulario LLM e seam de adapters |
| `packages/llm/llm/src/attribution.ts` | codigo | `packages/ai/src/` | vocabulario LLM e seam de adapters |
| `packages/llm/llm/src/brand.ts` | codigo | `packages/ai/src/` | vocabulario LLM e seam de adapters |
| `packages/llm/llm/src/call-config.ts` | codigo | `packages/ai/src/` | vocabulario LLM e seam de adapters |
| `packages/llm/llm/src/content.ts` | codigo | `packages/ai/src/` | vocabulario LLM e seam de adapters |
| `packages/llm/llm/src/error.ts` | codigo | `packages/ai/src/` | vocabulario LLM e seam de adapters |
| `packages/llm/llm/src/index.ts` | codigo | `packages/ai/src/` | vocabulario LLM e seam de adapters |
| `packages/llm/llm/src/message.ts` | codigo | `packages/ai/src/` | vocabulario LLM e seam de adapters |
| `packages/llm/llm/src/request-images.ts` | codigo | `packages/ai/src/` | vocabulario LLM e seam de adapters |
| `packages/llm/llm/src/retry-policy.ts` | codigo | `packages/ai/src/` | vocabulario LLM e seam de adapters |
| `packages/llm/llm/src/types.ts` | codigo | `packages/ai/src/` | vocabulario LLM e seam de adapters |
| `packages/llm/llm/tests/adapter-failure.spec.ts` | teste | `packages/ai/src/` | vocabulario LLM e seam de adapters |
| `packages/llm/llm/tests/assembler.spec.ts` | teste | `packages/ai/src/` | vocabulario LLM e seam de adapters |
| `packages/llm/llm/tests/assistant-stream.spec.ts` | teste | `packages/ai/src/` | vocabulario LLM e seam de adapters |
| `packages/llm/llm/tests/attribution.spec.ts` | teste | `packages/ai/src/` | vocabulario LLM e seam de adapters |
| `packages/llm/llm/tests/call-config.spec.ts` | teste | `packages/ai/src/` | vocabulario LLM e seam de adapters |
| `packages/llm/llm/tests/content.spec.ts` | teste | `packages/ai/src/` | vocabulario LLM e seam de adapters |
| `packages/llm/llm/tests/message.spec.ts` | teste | `packages/ai/src/` | vocabulario LLM e seam de adapters |
| `packages/llm/llm/tests/properties.spec.ts` | teste | `packages/ai/src/` | vocabulario LLM e seam de adapters |
| `packages/llm/llm/tests/retry-policy.spec.ts` | teste | `packages/ai/src/` | vocabulario LLM e seam de adapters |
| `packages/llm/llm/tests/service.spec.ts` | teste | `packages/ai/src/` | vocabulario LLM e seam de adapters |
| `packages/llm/llm/tests/topology.spec.ts` | teste | `packages/ai/src/` | vocabulario LLM e seam de adapters |
| `packages/llm/plugin-package-inventory-deepseek/src/index.ts` | codigo | `sem equivalente` | inventario de pacotes para telemetria DeepSeek |
| `packages/llm/plugin-package-inventory-deepseek/src/types.ts` | codigo | `sem equivalente` | inventario de pacotes para telemetria DeepSeek |
| `packages/llm/plugin-package-inventory-deepseek/tests/inventory.spec.ts` | teste | `sem equivalente` | inventario de pacotes para telemetria DeepSeek |
| `packages/llm/plugin-package-inventory-deepseek/tests/private-package-composition.spec.ts` | teste | `sem equivalente` | inventario de pacotes para telemetria DeepSeek |
| `packages/llm/token-meter/src/breakdown-projection.ts` | codigo | `packages/coding-agent/src/core/usage-totals.ts` | medicao de tokens/replay |
| `packages/llm/token-meter/src/client.ts` | codigo | `packages/coding-agent/src/core/usage-totals.ts` | medicao de tokens/replay |
| `packages/llm/token-meter/src/estimate.ts` | codigo | `packages/coding-agent/src/core/usage-totals.ts` | medicao de tokens/replay |
| `packages/llm/token-meter/src/index.ts` | codigo | `packages/coding-agent/src/core/usage-totals.ts` | medicao de tokens/replay |
| `packages/llm/token-meter/src/measurement-projection.ts` | codigo | `packages/coding-agent/src/core/usage-totals.ts` | medicao de tokens/replay |
| `packages/llm/token-meter/src/projection.ts` | codigo | `packages/coding-agent/src/core/usage-totals.ts` | medicao de tokens/replay |
| `packages/llm/token-meter/src/route-pricing.ts` | codigo | `packages/coding-agent/src/core/usage-totals.ts` | medicao de tokens/replay |
| `packages/llm/token-meter/src/surface-fold.ts` | codigo | `packages/coding-agent/src/core/usage-totals.ts` | medicao de tokens/replay |
| `packages/llm/token-meter/src/surface-projection.ts` | codigo | `packages/coding-agent/src/core/usage-totals.ts` | medicao de tokens/replay |
| `packages/llm/token-meter/src/turn-usage.ts` | codigo | `packages/coding-agent/src/core/usage-totals.ts` | medicao de tokens/replay |
| `packages/llm/token-meter/src/types.ts` | codigo | `packages/coding-agent/src/core/usage-totals.ts` | medicao de tokens/replay |
| `packages/llm/token-meter/src/usage-projection.ts` | codigo | `packages/coding-agent/src/core/usage-totals.ts` | medicao de tokens/replay |
| `packages/llm/token-meter/tests/context-breakdown-projection.spec.ts` | teste | `packages/coding-agent/src/core/usage-totals.ts` | medicao de tokens/replay |
| `packages/llm/token-meter/tests/measurement-projection.spec.ts` | teste | `packages/coding-agent/src/core/usage-totals.ts` | medicao de tokens/replay |
| `packages/llm/token-meter/tests/route-pricing.spec.ts` | teste | `packages/coding-agent/src/core/usage-totals.ts` | medicao de tokens/replay |
| `packages/llm/token-meter/tests/token-meter.spec.ts` | teste | `packages/coding-agent/src/core/usage-totals.ts` | medicao de tokens/replay |
| `packages/llm/token-meter/tests/token-usage-projection.spec.ts` | teste | `packages/coding-agent/src/core/usage-totals.ts` | medicao de tokens/replay |
| `packages/llm/token-meter/tests/turn-usage.spec.ts` | teste | `packages/coding-agent/src/core/usage-totals.ts` | medicao de tokens/replay |
