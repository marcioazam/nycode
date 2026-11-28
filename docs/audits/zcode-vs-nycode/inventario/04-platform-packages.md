# Inventario de Codigo ZCode v4.0.0: Pacotes Compartilhados, Server/RPC, Policy/Formal-Proof e Scripts

- Escopo: `packages/{server,zcode-server-cli,rpc,session-control,provider*,model-option-map,plugin-api,zcode-cua,formal-proof,services,shared,...} + raiz/scripts`
- Arquivos de codigo de primeira parte listados: **1443**
- Nota: todos os caminhos existem em `~/source/zcode-ref` (SHA `a4b4445141eb7d3b3e99eada9292775383bfc44e`) e todos os equivalentes no `nycode` foram verificados na worktree `~/source/nycode-audit-zcode`.

## Listagem Completa Arquivo por Arquivo

| Arquivo ZCode | Papel / Modulo | Equivalente no nycode | Status |
| :--- | :--- | :--- | :--- |
| `.agents/skills/architecture-governance/references/golden-module/contract.example.ts` | Scripts de governanca e fixtures internas para agentes de dev | `.nycode/skills` | equivalente parcial |
| `.agents/skills/architecture-governance/references/golden-module/contract.ts` | Scripts de governanca e fixtures internas para agentes de dev | `.nycode/skills` | equivalente parcial |
| `.agents/skills/architecture-governance/references/golden-module/module.ts` | Scripts de governanca e fixtures internas para agentes de dev | `.nycode/skills` | equivalente parcial |
| `.agents/skills/architecture-governance/scripts/context-package.mjs` | Scripts de governanca e fixtures internas para agentes de dev | `.nycode/skills` | equivalente parcial |
| `.agents/skills/zcode-large-task-fixture/scripts/generate-large-task-fixture.mjs` | Scripts de governanca e fixtures internas para agentes de dev | `.nycode/skills` | equivalente parcial |
| `.agents/skills/zcode-large-task-fixture/scripts/generate-large-task-fixture.test.mjs` | Scripts de governanca e fixtures internas para agentes de dev | `.nycode/skills` | equivalente parcial |
| `.husky/pre-push` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `.release-it.mjs` | Arquivo de configuracao/toolchain na raiz | `biome.json`; `vitest.base.ts` | equivalente direto |
| `.vscode/start-electron.mjs` | Arquivo de configuracao/toolchain na raiz | `biome.json`; `vitest.base.ts` | equivalente direto |
| `.vscode/tsup-watch.mjs` | Arquivo de configuracao/toolchain na raiz | `biome.json`; `vitest.base.ts` | equivalente direto |
| `.vscode/vite-dev.mjs` | Arquivo de configuracao/toolchain na raiz | `biome.json`; `vitest.base.ts` | equivalente direto |
| `Dockerfile.desktop-e2e` | Arquivo de configuracao/toolchain na raiz | `biome.json`; `vitest.base.ts` | equivalente direto |
| `architecture-policy.yaml` | Governanca arquitetural automatica de camadas e fronteiras entre modulos | `scripts/ci/lint/core_scope.py`; `scripts/ci/run-static.sh` | equivalente parcial |
| `packages/client/src/index.ts` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/client/src/logger.ts` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/client/src/messageport.ts` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/client/src/remoteServiceAccess.ts` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/client/src/rendererLoggingEnv.ts` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/client/src/webRemoteControlAcknowledgedRelayBatchQueue.ts` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/client/src/webRemoteControlAcknowledgedRelayDeadline.ts` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/client/src/webRemoteControlAcknowledgedRelayProtocol.ts` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/client/src/webRemoteControlAcknowledgedRelayProtocolTypes.ts` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/client/src/webRemoteControlRelayPayloadSerializer.ts` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/client/src/webRemoteControlRelayProtocol.ts` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/client/src/websocket.ts` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/design-runtime/src/contract.example.ts` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/design-runtime/src/contract.ts` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/design-runtime/src/designMessages.ts` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/design-runtime/src/elementInspector.ts` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/design-runtime/src/hostScripts.ts` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/design-runtime/src/index.ts` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/design-runtime/src/module.ts` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/design-runtime/src/pageRuntime.ts` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/design-runtime/src/pageSignals.ts` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/design-runtime/src/sourceEdit.ts` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/e2e-report/src/node/index.ts` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/e2e-report/src/shared/types.ts` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/e2e-report/src/viewer/App.tsx` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/e2e-report/src/viewer/ChartPanels.tsx` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/e2e-report/src/viewer/CoveragePanel.tsx` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/e2e-report/src/viewer/format.ts` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/e2e-report/src/viewer/main.tsx` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/e2e-report/src/viewer/reportData.ts` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/e2e-report/src/viewer/trendData.ts` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/e2e-report/vite.config.ts` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/formal-proof/src/main.ts` | Enumerador visual do espaco cartesiano de estados de conversa | sem equivalente (invariantes via testes em `packages/coding-agent/test`) | sem equivalente |
| `packages/formal-proof/src/model.ts` | Enumerador visual do espaco cartesiano de estados de conversa | sem equivalente (invariantes via testes em `packages/coding-agent/test`) | sem equivalente |
| `packages/formal-proof/vite.config.ts` | Enumerador visual do espaco cartesiano de estados de conversa | sem equivalente (invariantes via testes em `packages/coding-agent/test`) | sem equivalente |
| `packages/model-option-map/src/compiler.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/model-option-map/src/evaluator.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/model-option-map/src/index.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/model-option-map/src/merge-patch.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/model-option-map/src/option-maps.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/model-option-map/src/parser.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/model-option-map/src/tokenizer.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/model-option-map/src/types.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/plugin-api/scripts/type-only-exports.mjs` | SDK publico e contratos tipados para plugins UI/Extension Host | `packages/coding-agent/src/core/extensions`; `apps/p2/src` | equivalente parcial |
| `packages/plugin-api/src/contract.example.ts` | SDK publico e contratos tipados para plugins UI/Extension Host | `packages/coding-agent/src/core/extensions`; `apps/p2/src` | equivalente parcial |
| `packages/plugin-api/src/contract.ts` | SDK publico e contratos tipados para plugins UI/Extension Host | `packages/coding-agent/src/core/extensions`; `apps/p2/src` | equivalente parcial |
| `packages/plugin-api/src/manifest.ts` | SDK publico e contratos tipados para plugins UI/Extension Host | `packages/coding-agent/src/core/extensions`; `apps/p2/src` | equivalente parcial |
| `packages/plugin-api/src/module.ts` | SDK publico e contratos tipados para plugins UI/Extension Host | `packages/coding-agent/src/core/extensions`; `apps/p2/src` | equivalente parcial |
| `packages/plugin-api/src/protocol-v4.ts` | SDK publico e contratos tipados para plugins UI/Extension Host | `packages/coding-agent/src/core/extensions`; `apps/p2/src` | equivalente parcial |
| `packages/plugin-api/src/sessions.ts` | SDK publico e contratos tipados para plugins UI/Extension Host | `packages/coding-agent/src/core/extensions`; `apps/p2/src` | equivalente parcial |
| `packages/plugin-api/test/version.test.ts` | SDK publico e contratos tipados para plugins UI/Extension Host | `packages/coding-agent/src/core/extensions`; `apps/p2/src` | equivalente parcial |
| `packages/plugin-api/tsup.config.ts` | SDK publico e contratos tipados para plugins UI/Extension Host | `packages/coding-agent/src/core/extensions`; `apps/p2/src` | equivalente parcial |
| `packages/provider-node/src/endpoint-scoped-zcode-builtin-source.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/provider-node/src/index.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/provider-node/src/legacy-reasoning-level-renames.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/provider-node/src/legacy-reasoning-level.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/provider-node/src/model-selection-config-repository.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/provider-node/src/model-selection-facade.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/provider-node/src/personal-provider-config-repository.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/provider-node/src/provider-config-file-codec.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/provider-node/src/provider-config-runtime.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/provider-node/src/provider-registry-runtime.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/provider-node/src/runtime-paths.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/provider-node/src/zcode-builtin-cache-paths.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/provider-node/src/zcode-builtin-download.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/provider-node/src/zcode-builtin-provider-config-materializer.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/provider-node/src/zcode-builtin-provider-config-source.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/provider-node/src/zcode-builtin-release.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/provider-node/src/zcode-builtin-remote-synchronizer.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/provider/src/account-provider-resolution.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/provider/src/account-provider-service.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/provider/src/account-provider-state.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/provider/src/config-overlay.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/provider/src/config-service.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/provider/src/config/ids.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/provider/src/config/index.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/provider/src/config/manual-model-config.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/provider/src/config/model-config.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/provider/src/config/provider-config.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/provider/src/config/provider-data-schema.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/provider/src/config/rule-data-schema.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/provider/src/config/schema-validation.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/provider/src/config/schema.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/provider/src/effective-model-selection.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/provider/src/facades.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/provider/src/index.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/provider/src/model-selection-config.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/provider/src/owned-order.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/provider/src/registry-service.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/provider/src/registry.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/provider/src/resolver.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/provider/src/sources.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/provider/test/provider-config-fixtures.ts` | Catalogo, resolucao, config de providers e mapa de opcoes de modelo | `packages/ai/src/model-catalog.ts`; `packages/ai/src/models.ts`; `packages/coding-agent/src/core/model-config.ts` | equivalente direto |
| `packages/rpc/examples/01-basic-ipc.ts` | Transporte IPC/RPC multiplexado inspirado no VS Code [adaptado upstream: third-party/copied-components.json] | `packages/coding-agent/src/modes/rpc` | equivalente parcial |
| `packages/rpc/examples/02-proxy-channel.ts` | Transporte IPC/RPC multiplexado inspirado no VS Code [adaptado upstream: third-party/copied-components.json] | `packages/coding-agent/src/modes/rpc` | equivalente parcial |
| `packages/rpc/examples/03-ipc-server-client.ts` | Transporte IPC/RPC multiplexado inspirado no VS Code [adaptado upstream: third-party/copied-components.json] | `packages/coding-agent/src/modes/rpc` | equivalente parcial |
| `packages/rpc/examples/04-remote-connection.ts` | Transporte IPC/RPC multiplexado inspirado no VS Code [adaptado upstream: third-party/copied-components.json] | `packages/coding-agent/src/modes/rpc` | equivalente parcial |
| `packages/rpc/src/buffer.ts` | Transporte IPC/RPC multiplexado inspirado no VS Code [adaptado upstream: third-party/copied-components.json] | `packages/coding-agent/src/modes/rpc` | equivalente parcial |
| `packages/rpc/src/channelClient.ts` | Transporte IPC/RPC multiplexado inspirado no VS Code [adaptado upstream: third-party/copied-components.json] | `packages/coding-agent/src/modes/rpc` | equivalente parcial |
| `packages/rpc/src/channelServer.ts` | Transporte IPC/RPC multiplexado inspirado no VS Code [adaptado upstream: third-party/copied-components.json] | `packages/coding-agent/src/modes/rpc` | equivalente parcial |
| `packages/rpc/src/channels.shared.ts` | Transporte IPC/RPC multiplexado inspirado no VS Code [adaptado upstream: third-party/copied-components.json] | `packages/coding-agent/src/modes/rpc` | equivalente parcial |
| `packages/rpc/src/channels.ts` | Transporte IPC/RPC multiplexado inspirado no VS Code [adaptado upstream: third-party/copied-components.json] | `packages/coding-agent/src/modes/rpc` | equivalente parcial |
| `packages/rpc/src/delayedChannel.ts` | Transporte IPC/RPC multiplexado inspirado no VS Code [adaptado upstream: third-party/copied-components.json] | `packages/coding-agent/src/modes/rpc` | equivalente parcial |
| `packages/rpc/src/foundation.ts` | Transporte IPC/RPC multiplexado inspirado no VS Code [adaptado upstream: third-party/copied-components.json] | `packages/coding-agent/src/modes/rpc` | equivalente parcial |
| `packages/rpc/src/index.ts` | Transporte IPC/RPC multiplexado inspirado no VS Code [adaptado upstream: third-party/copied-components.json] | `packages/coding-agent/src/modes/rpc` | equivalente parcial |
| `packages/rpc/src/ipc.ts` | Transporte IPC/RPC multiplexado inspirado no VS Code [adaptado upstream: third-party/copied-components.json] | `packages/coding-agent/src/modes/rpc` | equivalente parcial |
| `packages/rpc/src/logging-middleware.ts` | Transporte IPC/RPC multiplexado inspirado no VS Code [adaptado upstream: third-party/copied-components.json] | `packages/coding-agent/src/modes/rpc` | equivalente parcial |
| `packages/rpc/src/network-telemetry-middleware.ts` | Transporte IPC/RPC multiplexado inspirado no VS Code [adaptado upstream: third-party/copied-components.json] | `packages/coding-agent/src/modes/rpc` | equivalente parcial |
| `packages/rpc/src/persistent-protocol.ts` | Transporte IPC/RPC multiplexado inspirado no VS Code [adaptado upstream: third-party/copied-components.json] | `packages/coding-agent/src/modes/rpc` | equivalente parcial |
| `packages/rpc/src/protocol.ts` | Transporte IPC/RPC multiplexado inspirado no VS Code [adaptado upstream: third-party/copied-components.json] | `packages/coding-agent/src/modes/rpc` | equivalente parcial |
| `packages/rpc/src/proxy-channel.ts` | Transporte IPC/RPC multiplexado inspirado no VS Code [adaptado upstream: third-party/copied-components.json] | `packages/coding-agent/src/modes/rpc` | equivalente parcial |
| `packages/rpc/src/remote.ts` | Transporte IPC/RPC multiplexado inspirado no VS Code [adaptado upstream: third-party/copied-components.json] | `packages/coding-agent/src/modes/rpc` | equivalente parcial |
| `packages/rpc/src/serialization.ts` | Transporte IPC/RPC multiplexado inspirado no VS Code [adaptado upstream: third-party/copied-components.json] | `packages/coding-agent/src/modes/rpc` | equivalente parcial |
| `packages/server/build-remote.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/buildRemoteValidation.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/bundledZCodeBuiltinProviderConfig.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/entry-http.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/entry-stdio.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/hostCapability.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/http.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/index.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/remote/backend.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/remote/closeEvent.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/remote/connect.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/remote/create-backend.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/remote/deploy.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/remote/deployShared.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/remote/detectEnv.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/remote/docker-backend.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/remote/docker-detect.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/remote/handshake.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/remote/index.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/remote/localTarGz.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/remote/posixShell.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/remote/remoteAssetCache.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/remote/remoteAssetCdn.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/remote/remoteAssetDeployDecision.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/remote/remoteAssetInstaller.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/remote/remoteAssetLiveIdentity.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/remote/remoteAssetNetwork.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/remote/remoteAssetPreflight.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/remote/remoteConnectionProgressContext.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/remote/remoteDeployLock.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/remote/remotePlatformSupport.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/remote/runtimeToolDeploy.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/remote/serverBundleDeployCheck.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/remote/ssh-backend.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/remote/sshAuth.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/remote/sshUploadProgress.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/remote/stdio-socket.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/remote/wsl-backend.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/remote/wsl-detect.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/remote/wslProxy.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/remote/zcodeAgentBundleWrapper.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/remote/zcodeAgentDeploy.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/remote/zcodeAgentDevDeploy.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/remote/zcodeAgentOfficialPluginAssets.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/remote/zcodeAgentOfficialPluginPermissionRepair.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/remote/zcodeAgentWrapperDeploy.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/source-server/index.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/source-server/sourceServerProbe.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/source-server/sourceServerReleaseDownload.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/source-server/sourceServerTransportRuntime.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/source-server/transportAdapter.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/stdio-lifecycle.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/stdio.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/stdioDeviceMid.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/src/stdioServices.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/test/remoteOfficialPluginAssets.test.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/test/tsupConfig.test.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/server/tsup.config.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/services/src/accessor.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/app-control/context.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/app-control/contract.example.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/app-control/contract.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/app-control/discovery-directory.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/app-control/discovery.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/app-control/execution.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/app-control/index.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/app-control/module.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/app-control/observation.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/app-control/reverseRpc.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bigmodel/codingPlanEntitlement.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bigmodel/teamPlanApiKey.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bot-project-runtime/contract.example.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bot-project-runtime/contract.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bot-project-runtime/index.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bot-project-runtime/module.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/botConfigHelpers.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/bots.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/botsService.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/channelMentionResolver.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/channelReply.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/channelRuntime.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/commandOrder.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/commandParser.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/config.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/feishuChannelRuntime.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/groupAdminAttention.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/groupDeliveryThrottle.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/groupQueueCard.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/groupReply.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/groupResultDelivery.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/groupSessions.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/messages.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/modelSelectionHelpers.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/providers/feishuAppRegistration.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/providers/feishuGroupMessages.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/providers/feishuProvider.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/providers/groupInputReaction.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/providers/groupMemberDirectory.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/providers/providerRequest.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/providers/telegramProvider.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/providers/types.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/providers/webhookProvider.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/providers/weixinProvider.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/providers/weixinRegistration.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/replyFormatter.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/repo.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/statusFormatting.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/storageMigration.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/taskStreamHub.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/telegramChannelRuntime.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/topic-history-attachment/contract.example.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/topic-history-attachment/contract.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/topic-history-attachment/module.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/topicContinuation.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/topicHistory.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/topicHistoryAttachment.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/topicPreparationState.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/topicResource.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/weixinChannelRuntime.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/bots/workspaceHelpers.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/broadcast/broadcast.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/broadcast/broadcastService.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/client-config/clientConfig.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/client-config/clientConfigService.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/client-scenes/clientScenes.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/client-scenes/clientScenesService.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/cloud-content/cloudContent.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/cloud-content/cloudContentService.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/cloud-content/contentBundleCache.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/coding-plan-subscription/bigmodelCodingPlanSubscriptionProvider.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/coding-plan-subscription/codingPlanSubscription.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/coding-plan-subscription/codingPlanSubscriptionService.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/coding-plan-subscription/zaiCodingPlanSubscriptionProvider.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/collection.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/commands/commandFileParser.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/commands/commands.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/commands/commandsService.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/conversation-share/conversationShare.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/conversation-share/conversationShareArtifactDiscovery.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/conversation-share/conversationShareArtifactSource.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/conversation-share/conversationShareConnectionScope.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/conversation-share/conversationShareHttpClient.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/conversation-share/conversationShareInlineImages.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/conversation-share/conversationShareIntegrity.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/conversation-share/conversationSharePublicProjection.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/conversation-share/conversationShareService.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/conversation-share/conversationShareWorkflowSnapshot.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/conversation-share/sharedContextFormatter.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/conversation-telemetry/contract.example.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/conversation-telemetry/contract.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/conversation-telemetry/conversationTelemetry.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/conversation-telemetry/module.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/conversation-telemetry/remoteConversationTelemetry.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/credential/credential.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/credential/credentialService.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/credential/providers/credentialCipherProvider.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/cua-permission-broker/cuaAgentAdmissionGate.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/cua-permission-broker/cuaHelperInstaller.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/cua-permission-broker/cuaPermissionService.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/cua-permission-broker/cuaPipSession.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/cua-permission-broker/cuaPipSessionService.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/cua-permission-broker/cuaStandaloneStatusLaunch.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/cua-permission-broker/index.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/cua-permission-broker/stableCuaTransport.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/cua-permission-broker/windowsCuaDevHelperHost.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/cua-permission-broker/windowsCuaDevRuntime.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/cua-permission-broker/windowsCuaHelperHostSupport.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/data-sync/commandDataSync.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/data-sync/contract.example.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/data-sync/contract.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/data-sync/deviceSyncStateService.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/data-sync/directoryContent.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/data-sync/hookDataSync.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/data-sync/index.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/data-sync/inlinePluginDataSync.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/data-sync/mcpDataSync.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/data-sync/module.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/data-sync/node.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/data-sync/skillDataSync.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/data-sync/subagentDataSync.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/data-sync/syncUtils.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/data-sync/userConfigSyncService.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/descriptors.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/extensions/auditLog.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/extensions/capabilityGateway.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/extensions/capabilityTypes.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/extensions/contextPump.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/extensions/contract.example.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/extensions/contract.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/extensions/draftRelay.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/extensions/envState.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/extensions/generationPump.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/extensions/grantRequestRelay.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/extensions/grants/contract.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/extensions/grantsStore.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/extensions/index.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/extensions/manifestReader.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/extensions/mentionItems.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/extensions/modelsBackend.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/extensions/module.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/extensions/node.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/extensions/notificationRelay.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/extensions/pluginProjects.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/extensions/sessionControls.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/extensions/sessionListPump.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/extensions/sessionReads.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/extensions/sessionsAudit.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/extensions/sessionsBackend.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/extensions/settingsBackend.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/extensions/viewRelay.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/extensions/views/contract.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/extensions/windowHostExtensions.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/extensions/workbenchState.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/feedback/compactLogArchive.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/feedback/feedback.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/feedback/feedbackHttpClient.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/feedback/feedbackLogArchive.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/feedback/feedbackService.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/file/file.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/file/fileService.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/file/workspaceFileIgnore.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/file/workspaceFileMentionFilter.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/file/workspaceFileSearch.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/fileWatcher/fileWatcher.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/fileWatcher/fileWatcherService.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/fs/atomicFileUtils.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/fs/fsFaultInjection.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/gen-ui/adapters/files.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/gen-ui/adapters/service.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/gen-ui/adapters/stateStorage.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/gen-ui/app/ports.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/gen-ui/contract.example.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/gen-ui/contract.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/gen-ui/index.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/gen-ui/module.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/gen-ui/node.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/git/commitMessageFileScope.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/git/config.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/git/git.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/git/gitCheckpoint.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/git/gitCheckpointService.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/git/gitCommitMessageGenerator.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/git/gitService.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/git/managed-worktree/contract.example.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/git/managed-worktree/contract.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/git/managed-worktree/gitWorktreeRepo.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/git/managed-worktree/index.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/git/managed-worktree/module.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/git/providers/gitCommandProvider.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/git/providers/gitEnvironmentProvider.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/git/repo/gitCheckpointHelpers.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/git/repo/gitCheckpointRepo.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/git/repo/gitCheckpointStore.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/git/repo/gitCliHelpers.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/git/repo/gitCliRepo.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/git/repo/gitCliTypes.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/highspeed/highspeedCard.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/highspeed/highspeedCardService.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/highspeed/highspeedHttpTransport.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/highspeed/highspeedMockTransport.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/hooks/hooks.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/hooks/hooksService.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/hooks/index.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/hooks/workspaceHookConfigMutation.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/hooks/workspaceHookSettingsModel.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/index.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/logger/serviceLogger.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/managed-worktree-tasks/contract.example.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/managed-worktree-tasks/contract.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/managed-worktree-tasks/index.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/managed-worktree-tasks/module.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/managed-worktree-tasks/ports.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/managed-worktree-tasks/removal-gate.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/managed-worktree-tasks/removal.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/managed-worktree-tasks/service.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/marketing-touch/marketingAssetRegistry.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/marketing-touch/marketingTouch.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/marketing-touch/marketingTouchService.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/mcp-sync/mcpSync.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/mcp-sync/mcpSyncService.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/media-preview/mediaPreview.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/memory/index.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/memory/memory.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/memory/memoryService.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/memory/projectMemoryStableRead.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/memoryDiagnostics.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/model-provider/accountProjectTokenClient.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/model-provider/accountProviderApiClient.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/model-provider/accountProviderApiKeyResolver.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/model-provider/accountProviderApiTypes.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/model-provider/accountProviderConnectionResolver.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/model-provider/accountProviderCredentialKey.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/model-provider/accountProviderCredentialService.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/model-provider/accountProviderCredentialStore.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/model-provider/accountProviderInvalidation.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/model-provider/accountProviderRequestAuthService.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/model-provider/accountProviderTeamPlanRequestKey.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/model-provider/accountRequestAuthService.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/model-provider/bigmodelStartPlanZcodeJwt.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/model-provider/codingPlanProviderAvailability.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/model-provider/legacyModelProviderSerialized.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/model-provider/legacyPersonalProviderConfigImporter.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/model-provider/legacyTeamOrganizationResolver.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/model-provider/legacyZCodeConfigProviderReader.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/model-provider/offPeakModelSelectionView.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/model-provider/providerConfigRuntime.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/model-provider/providerFacadeServices.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/model-provider/providerProvisioning.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/model-provider/providerProvisioningSource.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/model-provider/providerProvisioningTarget.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/model-provider/providerRuntime.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/model-provider/providerSettingsConnectivity.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/model-provider/zaiStartPlanBilling.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/model-provider/zcodeBuiltinRemoteConfig.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/node.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/oauth/callbackAttribution.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/oauth/oauth.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/oauth/oauthProfileSchema.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/oauth/oauthProviderLogout.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/oauth/oauthService.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/oauth/oauthUnauthorizedRequest.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/oauth/providers/bigmodelProviderAdapter.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/oauth/providers/bigmodelProviderConfig.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/oauth/providers/configUtils.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/oauth/providers/index.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/oauth/providers/providerAdapter.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/oauth/providers/zaiProviderAdapter.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/oauth/providers/zaiProviderConfig.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/oauth/repo/oauthCredentialRepo.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/oauth/runtimeConfig.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/official-mcp/officialMcpCredentials.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/official-mcp/officialMcpIssuanceAudit.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/onboarding/localUsageEvidence.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/onboarding/onboardingRecord.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/onboarding/onboardingRecordService.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/output-style/index.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/output-style/outputStyle.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/output-style/outputStyleService.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/paths.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/plugin-sync/pluginSync.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/plugin-sync/pluginSyncArchive.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/plugin-sync/pluginSyncPath.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/plugin-sync/pluginSyncService.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/plugin-ui-bridge/appToolsContract.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/plugin-ui-bridge/contract.example.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/plugin-ui-bridge/contract.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/plugin-ui-bridge/index.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/plugin-ui-bridge/instanceAccounts.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/plugin-ui-bridge/module.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/plugin-ui-bridge/pluginUiAppToolsService.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/plugin-ui-bridge/pluginUiBridgeService.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/plugin-ui-bridge/pluginUiSamplingService.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/plugin-ui-bridge/samplingContract.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/plugins/installedPluginRoots.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/plugins/officialPluginCache.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/plugins/pluginManagement.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/plugins/pluginManagementService.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/plugins/plugins.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/plugins/pluginsService.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/process/processResourceSampler.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/process/processTreeOwnership.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/process/processTreeSnapshot.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/process/processTreeSnapshotAsync.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/process/processTreeTerminator.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/process/processTreeTypes.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/process/processTreeWaiter.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/process/runtimeProcessLifecycle.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/process/windowsProcessListAsync.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/process/windowsTaskkillRunner.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/project-catalog/contract.example.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/project-catalog/contract.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/project-catalog/index.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/project-catalog/module.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/project-catalog/selection-id.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/project-storage/contract.example.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/project-storage/contract.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/project-storage/default-workspace/migration.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/project-storage/host-mismatch.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/project-storage/index.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/project-storage/legacy-tasks.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/project-storage/migrate-projects.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/project-storage/migration-order/migration.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/project-storage/module.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/project-storage/project-repository.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/project-storage/purge/contract.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/project-storage/remote-policy.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/project-storage/repository-contract.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/project-storage/schema.baseline.sql` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/project-storage/schema.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/project-storage/startup-entry.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/project-storage/startup.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/project-workspace-navigation/contract.example.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/project-workspace-navigation/contract.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/project-workspace-navigation/index.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/project-workspace-navigation/module.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/project/autoArchiveScheduler.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/project/contract.example.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/project/contract.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/project/data/contract.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/project/data/project-data-port.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/project/data/project-data.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/project/index.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/project/legacy-single-root.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/project/module.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/prompt-attachment-transfer/promptAttachmentTransfer.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/prompt-attachment-transfer/promptAttachmentTransferService.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/provider-provisioning-status/contract.example.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/provider-provisioning-status/contract.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/provider-provisioning-status/hostProviderProvisioningStatus.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/provider-provisioning-status/index.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/provider-provisioning-status/module.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/provider-provisioning-status/node.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/providers/api/apiEndpoints.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/providers/api/apiJson.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/providers/api/apiKeyHeaders.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/providers/api/index.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/providers/api/networkErrorClassifier.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/providers/api/nodeApiClient.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/providers/api/nodeApiNetwork.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/providers/api/requestIdHeaders.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/providers/codexConfigToml.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/providers/sourceHeaders.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/providers/zaiBusinessTokenResolver.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/remote-projects/connection-membership.ts` | Servicos de workspace remoto e source-server | `packages/env/src`; `apps/p3/src` | equivalente parcial |
| `packages/services/src/remote-projects/contract.example.ts` | Servicos de workspace remoto e source-server | `packages/env/src`; `apps/p3/src` | equivalente parcial |
| `packages/services/src/remote-projects/contract.ts` | Servicos de workspace remoto e source-server | `packages/env/src`; `apps/p3/src` | equivalente parcial |
| `packages/services/src/remote-projects/index.ts` | Servicos de workspace remoto e source-server | `packages/env/src`; `apps/p3/src` | equivalente parcial |
| `packages/services/src/remote-projects/module.ts` | Servicos de workspace remoto e source-server | `packages/env/src`; `apps/p3/src` | equivalente parcial |
| `packages/services/src/remote-projects/validation.ts` | Servicos de workspace remoto e source-server | `packages/env/src`; `apps/p3/src` | equivalente parcial |
| `packages/services/src/remote-projects/workspace-settings.ts` | Servicos de workspace remoto e source-server | `packages/env/src`; `apps/p3/src` | equivalente parcial |
| `packages/services/src/remote-sync/remoteSyncWriteAccess.ts` | Servicos de workspace remoto e source-server | `packages/env/src`; `apps/p3/src` | equivalente parcial |
| `packages/services/src/runtime-tools/agentProxyEnv.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/runtime-tools/appCaCert.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/runtime-tools/clientPlatform.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/runtime-tools/nodeEnv.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/runtime-tools/providerRuntimeResolver.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/runtime-tools/runtimeCommandEnv.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/runtime-tools/runtimeLoginShellEnvCapture.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/runtime-tools/runtimeToolResolver.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/session/automationCron.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/automationCronValidation.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/automationIntervalCarrier.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/automationRepo.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/automationService.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/claude-native/buildImportedClaudeTaskFile.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/claude-native/claudeNativeImportedSessionTypes.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/claude-native/claudeNativeSessionHeadParser.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/claude-native/claudeNativeSessionImportParser.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/claude-native/claudeNativeSessionImportRepo.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/claude-native/claudeNativeSessionImportService.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/claude-native/importedClaudeHistoryRepair.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/claude-native/importedClaudeTaskFileFilter.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/claude-native/jsonLineRecord.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/claude-native/persistImportedClaudeTask.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/claude-native/sessionHistoryJsonl.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/continuousStreamCoalescer.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/controllerRemoteIdentityMigration.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/fileChangeTracker.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/legacyTaskSessionFile.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/mcpWorkspaceScope.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/offPeakMockGateway.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/offPeakResidentExecutions.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/offPeakRuntimeModel.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/offPeakServerClient.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/offPeakTask.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/offPeakTaskRepo.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/offPeakTaskService.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/offPeakWorkspaceIdentityMigration.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/sessionMailbox.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/sessionModeOptions.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/sessionRealtimePort.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/sessionTitle.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/sourceServerWorkspaceAliasRepo.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/taskChangeSummary.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/taskIndexRepo.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/tasksDatabase/controller-remote-schema-v4.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/tasksDatabase/migrations.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/tasksDatabase/official-glm-selection-v3.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/tasksDatabase/prepared.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/tasksDatabase/provider-selection-v2.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/tasksDatabase/schema-v1.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/tasksDatabase/source-server-schema-v5.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/toolPlanAdapter.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/zcodeTaskListTypes.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/session/zcodeTaskService.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/setting/legacyAccountConnectionSettings.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/setting/normalizeSettingsPatch.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/setting/observableSettingService.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/setting/setting.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/setting/settingService.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/setting/settingsWriteQueue.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/settings-sync/settingsSync.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/settings-sync/settingsSyncService.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/settings-sync/types.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/skill-sync/skillSync.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/skill-sync/skillSyncArchive.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/skill-sync/skillSyncErrors.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/skill-sync/skillSyncPath.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/skill-sync/skillSyncService.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/skills/skillDiscoveryWalk.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/skills/skills.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/skills/skillsService.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/source-server-management/sourceServerManagement.ts` | Servicos de workspace remoto e source-server | `packages/env/src`; `apps/p3/src` | equivalente parcial |
| `packages/services/src/source-server-workspace/sourceServerWorkspace.ts` | Servicos de workspace remoto e source-server | `packages/env/src`; `apps/p3/src` | equivalente parcial |
| `packages/services/src/source-server-workspace/sourceServerWorkspaceIdentityChannelServer.ts` | Servicos de workspace remoto e source-server | `packages/env/src`; `apps/p3/src` | equivalente parcial |
| `packages/services/src/source-server-workspace/sourceServerWorkspaceService.ts` | Servicos de workspace remoto e source-server | `packages/env/src`; `apps/p3/src` | equivalente parcial |
| `packages/services/src/startup-storage/contract.example.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/startup-storage/contract.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/startup-storage/index.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/startup-storage/module.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/storage/adapters/fsCleaner.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/storage/adapters/fsWalker.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/storage/adapters/inProcessScanRunner.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/storage/adapters/rootsResolver.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/storage/adapters/volumeProbe.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/storage/app/ports.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/storage/app/scanJob.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/storage/app/storageService.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/storage/contract.example.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/storage/contract.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/storage/domain/cleanPlan.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/storage/domain/storageCatalog.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/storage/domain/usageAggregate.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/storage/module.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/subagents/subagentConfigScope.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/subagents/subagentMarkdown.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/subagents/subagentModelSelection.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/subagents/subagentRuntimeConfig.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/subagents/subagentStorage.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/subagents/subagents.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/subagents/subagentsService.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/symlinkPointsToTarget.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/system/integratedTerminalShells.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/system/sshConfigAlias.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/system/system.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/system/systemService.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/task-facts/contract.example.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/task-facts/contract.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/task-facts/index.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/task-facts/module.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/task-facts/repairSubagentTaskIndex.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/task-groups/contract.example.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/task-groups/contract.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/task-groups/index.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/task-groups/migration-v6.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/task-groups/module.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/task-groups/repository.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/telemetry/telemetryCore.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/terminal/terminal.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/terminal/terminalProfile.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/terminal/terminalProfileMacOs.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/terminal/terminalProfileTypes.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/terminal/terminalService.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/usage-stats/providers/bigmodelSubscriptionProvider.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/usage-stats/providers/bigmodelUsageMonitorMapper.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/usage-stats/providers/bigmodelUsageMonitorRange.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/usage-stats/providers/bigmodelUsageQuotaMapper.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/usage-stats/providers/bigmodelUsageQuotaProvider.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/usage-stats/providers/zcodeMcpQuotaProvider.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/usage-stats/usageStats.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/usage-stats/usageStatsConfig.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/usage-stats/usageStatsService.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/voice-input/contract.example.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/voice-input/contract.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/voice-input/index.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/voice-input/module.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/voice-input/node.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/voice-input/voiceInputService.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/window-controller/windowController.ts` | Servico de produto Desktop/Bots/GenUI/Marketing/CUA | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/window-project-directory/contract.example.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/window-project-directory/contract.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/window-project-directory/index.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/window-project-directory/module.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/window-project-directory/webRemoteProjectTreeActivity.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/windows-runtime-host/contract.example.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/windows-runtime-host/contract.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/windows-runtime-host/index.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/windows-runtime-host/module.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/src/zcode-agent/agentStderrCollector.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-agent/agentTelemetryEnv.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-agent/automationToolPolicy.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-agent/botTopicAdmission.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-agent/contextCompositionClient.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-agent/cuaOperationTurnTracker.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-agent/groupAttachmentUpload.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-agent/groupRuntimeSnapshot.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-agent/independentPlanSupport.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-agent/inputPredictionSwitch.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-agent/localRuntimeNetworkCapture.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-agent/modelTrajectory.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-agent/modelTrajectoryFileTail.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-agent/pluginHostQueriesClient.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-agent/pluginReferenceCatalogRequest.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-agent/resident-rows-range/contract.example.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-agent/resident-rows-range/contract.test.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-agent/resident-rows-range/contract.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-agent/resident-rows-range/module.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-agent/topicResourceBridge.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-agent/topicResourcePeers.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-agent/topicResourceRelay.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-agent/topicResourceRelayChannel.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-agent/topicResourceRelayClient.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-agent/topicResourceUpload.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-agent/zcodeAgent.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-agent/zcodeAgentBrowserAmbientContext.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-agent/zcodeAgentConnectionScope.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-agent/zcodeAgentErrors.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-agent/zcodeAgentPluginParams.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-agent/zcodeAgentPresentationSurface.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-agent/zcodeAgentProcessManager.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-agent/zcodeAgentService.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-agent/zcodeAgentSpawnCwd.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-agent/zcodeAgentWorkflowParams.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-agent/zcodeConfigOptions.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-agent/zcodeProtocolClient.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-agent/zcodeProtocolTransport.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-agent/zcodeSessionEventCoalescer.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-agent/zcodeStdioTapDevConfig.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-agent/zcodeStdioTransport.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-agent/zcodeStorageStartupGate.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-agent/zcodeTaskIndexSyncer.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-agent/zcodeTaskServiceAdapter.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-agent/zcodeV4HostCommand.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-session/importedClaudeSessionRepair.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-session/zcodeSession.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-session/zcodeSessionApiRetry.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-session/zcodeSessionDraftRegistry.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/src/zcode-session/zcodeSessionService.ts` | Camada de servicos compartilhados de agente, sessao, provider e extensoes | `packages/durable/src`; `packages/ai/src`; `packages/coding-agent/src/core` | equivalente parcial |
| `packages/services/test/helpers/conversationShareMockApiClient.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/test/inputPredictionSwitch.test.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/services/test/webRemoteProjectTreeActivity.test.ts` | Servico utilitario/infraestrutura do workbench | fora do escopo de harness | fora do escopo de harness |
| `packages/session-control/src/application/app/index.ts` | Contratos e politicas de concorrencia/isolamento de controle de sessao | `packages/durable/src/session`; `packages/coding-agent/src/modes/rpc` | equivalente parcial |
| `packages/session-control/src/application/cli/index.ts` | Contratos e politicas de concorrencia/isolamento de controle de sessao | `packages/durable/src/session`; `packages/coding-agent/src/modes/rpc` | equivalente parcial |
| `packages/session-control/src/application/common/boundary.ts` | Contratos e politicas de concorrencia/isolamento de controle de sessao | `packages/durable/src/session`; `packages/coding-agent/src/modes/rpc` | equivalente parcial |
| `packages/session-control/src/application/common/wait.ts` | Contratos e politicas de concorrencia/isolamento de controle de sessao | `packages/durable/src/session`; `packages/coding-agent/src/modes/rpc` | equivalente parcial |
| `packages/session-control/src/contract.example.ts` | Contratos e politicas de concorrencia/isolamento de controle de sessao | `packages/durable/src/session`; `packages/coding-agent/src/modes/rpc` | equivalente parcial |
| `packages/session-control/src/contract.test.ts` | Contratos e politicas de concorrencia/isolamento de controle de sessao | `packages/durable/src/session`; `packages/coding-agent/src/modes/rpc` | equivalente parcial |
| `packages/session-control/src/contract.ts` | Contratos e politicas de concorrencia/isolamento de controle de sessao | `packages/durable/src/session`; `packages/coding-agent/src/modes/rpc` | equivalente parcial |
| `packages/session-control/src/contract/app.ts` | Contratos e politicas de concorrencia/isolamento de controle de sessao | `packages/durable/src/session`; `packages/coding-agent/src/modes/rpc` | equivalente parcial |
| `packages/session-control/src/contract/cli.ts` | Contratos e politicas de concorrencia/isolamento de controle de sessao | `packages/durable/src/session`; `packages/coding-agent/src/modes/rpc` | equivalente parcial |
| `packages/session-control/src/contract/common.ts` | Contratos e politicas de concorrencia/isolamento de controle de sessao | `packages/durable/src/session`; `packages/coding-agent/src/modes/rpc` | equivalente parcial |
| `packages/session-control/src/contract/observation.ts` | Contratos e politicas de concorrencia/isolamento de controle de sessao | `packages/durable/src/session`; `packages/coding-agent/src/modes/rpc` | equivalente parcial |
| `packages/session-control/src/contract/results.ts` | Contratos e politicas de concorrencia/isolamento de controle de sessao | `packages/durable/src/session`; `packages/coding-agent/src/modes/rpc` | equivalente parcial |
| `packages/session-control/src/domain/operation-outcome.ts` | Contratos e politicas de concorrencia/isolamento de controle de sessao | `packages/durable/src/session`; `packages/coding-agent/src/modes/rpc` | equivalente parcial |
| `packages/session-control/src/domain/reference-scope.ts` | Contratos e politicas de concorrencia/isolamento de controle de sessao | `packages/durable/src/session`; `packages/coding-agent/src/modes/rpc` | equivalente parcial |
| `packages/session-control/src/module.ts` | Contratos e politicas de concorrencia/isolamento de controle de sessao | `packages/durable/src/session`; `packages/coding-agent/src/modes/rpc` | equivalente parcial |
| `packages/session-control/src/testing/index.ts` | Contratos e politicas de concorrencia/isolamento de controle de sessao | `packages/durable/src/session`; `packages/coding-agent/src/modes/rpc` | equivalente parcial |
| `packages/session-control/test/client-caller.test.ts` | Contratos e politicas de concorrencia/isolamento de controle de sessao | `packages/durable/src/session`; `packages/coding-agent/src/modes/rpc` | equivalente parcial |
| `packages/session-control/test/control.test.ts` | Contratos e politicas de concorrencia/isolamento de controle de sessao | `packages/durable/src/session`; `packages/coding-agent/src/modes/rpc` | equivalente parcial |
| `packages/session-control/test/isolation.test.ts` | Contratos e politicas de concorrencia/isolamento de controle de sessao | `packages/durable/src/session`; `packages/coding-agent/src/modes/rpc` | equivalente parcial |
| `packages/session-control/test/review-regressions.test.ts` | Contratos e politicas de concorrencia/isolamento de controle de sessao | `packages/durable/src/session`; `packages/coding-agent/src/modes/rpc` | equivalente parcial |
| `packages/session-control/test/session-id.test.ts` | Contratos e politicas de concorrencia/isolamento de controle de sessao | `packages/durable/src/session`; `packages/coding-agent/src/modes/rpc` | equivalente parcial |
| `packages/session-control/test/wait.test.ts` | Contratos e politicas de concorrencia/isolamento de controle de sessao | `packages/durable/src/session`; `packages/coding-agent/src/modes/rpc` | equivalente parcial |
| `packages/session-control/vitest.config.ts` | Contratos e politicas de concorrencia/isolamento de controle de sessao | `packages/durable/src/session`; `packages/coding-agent/src/modes/rpc` | equivalente parcial |
| `packages/share-ui/src/index.ts` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/shared/src/account-provider-state.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/agent-crash-diagnostic/agentCrashDiagnostic.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/agent-crash-diagnostic/contract.example.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/agent-crash-diagnostic/contract.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/agent-crash-diagnostic/index.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/agent-crash-diagnostic/module.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/api-key-usage-scene.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/api.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/app-control/contract.example.ts` | Protocolo de relay web, GenUI e UI de app Desktop | fora do escopo de harness | fora do escopo de harness |
| `packages/shared/src/app-control/contract.ts` | Protocolo de relay web, GenUI e UI de app Desktop | fora do escopo de harness | fora do escopo de harness |
| `packages/shared/src/app-control/index.ts` | Protocolo de relay web, GenUI e UI de app Desktop | fora do escopo de harness | fora do escopo de harness |
| `packages/shared/src/app-control/module.ts` | Protocolo de relay web, GenUI e UI de app Desktop | fora do escopo de harness | fora do escopo de harness |
| `packages/shared/src/app-runtime-preferences.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/assistant-message-parts.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/assistant-presentation.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/attachment-source.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/automation-types.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/background-bash-jobs.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/background-bash-output.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/background-task-control-merge.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/background-task-controls.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/background-task-notifications.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/bash-output-display.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/bots.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/browser-use/backend.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/browser-use/command-metadata.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/browser-use/commands.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/browser-use/index.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/browser-use/nodeReplBroker.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/browser-use/result.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/browser-use/snapshot.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/channel-mention.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/channels.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/clientConfig.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/cloudContent.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/coding-plan-reset.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/coding-plan-subscription.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/command-types.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/config-schema.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/conversation-message-projection-policy.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/conversation-preview-artifacts.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/conversation-share-content.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/conversation-share-tool-presentation.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/conversation-share.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/conversation-telemetry/contract.example.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/conversation-telemetry/contract.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/conversation-telemetry/conversationRewindTelemetry.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/conversation-telemetry/conversationTelemetryEngine.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/conversation-telemetry/index.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/conversation-telemetry/messageTelemetry.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/conversation-telemetry/module.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/conversation-telemetry/permissionPromptTelemetry.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/conversation-telemetry/providerTelemetryIdentity.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/conversation-telemetry/remoteTelemetryEvent.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/conversation-telemetry/runtimeModelTelemetry.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/conversation-telemetry/workflowRunTelemetry.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/conversationSelection.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/credential-security/boundStoreReset.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/credential-security/bridge.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/credential-security/contract.example.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/credential-security/contract.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/credential-security/credentialFile.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/credential-security/credentialFileState.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/credential-security/module.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/credential-security/systemCredentialCipher.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/cuaAccessibilitySettings.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/custom-model-value.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/database-startup.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/desktopMenu.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/dynamic-workflow-feature.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/e2e-test-bridge.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/env.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/errors.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/execution-output-preview.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/execution-state.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/extension-host/capabilities.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/extension-host/channels.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/extension-host/context.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/extension-host/contract.example.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/extension-host/contract.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/extension-host/contributions.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/extension-host/control.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/extension-host/env.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/extension-host/errors.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/extension-host/generation.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/extension-host/grants.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/extension-host/index.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/extension-host/interactions.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/extension-host/logs.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/extension-host/manifest.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/extension-host/manifestSlots.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/extension-host/mention.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/extension-host/models.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/extension-host/module.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/extension-host/notifications.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/extension-host/sessionActions.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/extension-host/sessions.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/extension-host/settings.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/extension-host/slots.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/extension-host/staticTable.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/extension-host/views.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/extension-host/workbench.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/feedback.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/feedbackPrivacy.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/forceUpdate.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/gen-ui/contract.example.ts` | Protocolo de relay web, GenUI e UI de app Desktop | fora do escopo de harness | fora do escopo de harness |
| `packages/shared/src/gen-ui/contract.ts` | Protocolo de relay web, GenUI e UI de app Desktop | fora do escopo de harness | fora do escopo de harness |
| `packages/shared/src/gen-ui/index.ts` | Protocolo de relay web, GenUI e UI de app Desktop | fora do escopo de harness | fora do escopo de harness |
| `packages/shared/src/gen-ui/module.ts` | Protocolo de relay web, GenUI e UI de app Desktop | fora do escopo de harness | fora do escopo de harness |
| `packages/shared/src/gen-ui/tweakProtocol.ts` | Protocolo de relay web, GenUI e UI de app Desktop | fora do escopo de harness | fora do escopo de harness |
| `packages/shared/src/git.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/handshake.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/helpAppConfig.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/highspeed.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/hooks.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/index.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/intranetDefaults.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/intranetProbe.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/launchMarks.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/legacy-model-provider-identity.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/lineChangeStat.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/local-ttft/contract.example.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/local-ttft/contract.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/local-ttft/module.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/locale.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/log-format.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/managed-worktree/contract.example.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/managed-worktree/contract.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/managed-worktree/index.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/managed-worktree/layout.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/managed-worktree/module.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/managed-worktree/trust-identity.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/markdown-artifact-images.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/marketingTouch.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/mcp-apps/appTools.ts` | Protocolo de relay web, GenUI e UI de app Desktop | fora do escopo de harness | fora do escopo de harness |
| `packages/shared/src/mcp-apps/content.ts` | Protocolo de relay web, GenUI e UI de app Desktop | fora do escopo de harness | fora do escopo de harness |
| `packages/shared/src/mcp-apps/contract.example.ts` | Protocolo de relay web, GenUI e UI de app Desktop | fora do escopo de harness | fora do escopo de harness |
| `packages/shared/src/mcp-apps/contract.ts` | Protocolo de relay web, GenUI e UI de app Desktop | fora do escopo de harness | fora do escopo de harness |
| `packages/shared/src/mcp-apps/hostContract.ts` | Protocolo de relay web, GenUI e UI de app Desktop | fora do escopo de harness | fora do escopo de harness |
| `packages/shared/src/mcp-apps/index.ts` | Protocolo de relay web, GenUI e UI de app Desktop | fora do escopo de harness | fora do escopo de harness |
| `packages/shared/src/mcp-apps/instance.ts` | Protocolo de relay web, GenUI e UI de app Desktop | fora do escopo de harness | fora do escopo de harness |
| `packages/shared/src/mcp-apps/module.ts` | Protocolo de relay web, GenUI e UI de app Desktop | fora do escopo de harness | fora do escopo de harness |
| `packages/shared/src/mcp-apps/resourceMime.ts` | Protocolo de relay web, GenUI e UI de app Desktop | fora do escopo de harness | fora do escopo de harness |
| `packages/shared/src/mcp-apps/sampling.ts` | Protocolo de relay web, GenUI e UI de app Desktop | fora do escopo de harness | fora do escopo de harness |
| `packages/shared/src/mcp-apps/schemas.ts` | Protocolo de relay web, GenUI e UI de app Desktop | fora do escopo de harness | fora do escopo de harness |
| `packages/shared/src/mcp-apps/toolMeta.ts` | Protocolo de relay web, GenUI e UI de app Desktop | fora do escopo de harness | fora do escopo de harness |
| `packages/shared/src/mcp-sync.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/mcp.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/media-preview.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/memory.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/memoryDiagnostics.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/model-config.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/model-execution.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/model-provider-family.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/model-provider-types.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/model-selection-key.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/model-selection-types.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/model-selection.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/networkCapture.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/node.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/node/atomicFileLock.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/node/genUiPaths.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/node/lockInstanceObserver.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/node/networkCapture.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/node/nodeSelfResourceTelemetry.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/node/officialPluginCache.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/node/privateFilePersistence.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/node/subagentMarkdownMigration.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/node/windowsGitBashDiscovery/contract.example.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/node/windowsGitBashDiscovery/contract.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/node/windowsGitBashDiscovery/discovery.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/node/windowsGitBashDiscovery/module.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/node/windowsGitBashDiscovery/types.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/oauth.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/off-peak-execution.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/off-peak-types.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/official-glm-model-id.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/official-mcp-auth.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/official-mcp-tool-error.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/onboardingRecord.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/openrouter-attribution.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/output-style.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/permission-request-preview.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/plan-identity.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/platform.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/platformUpdate.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/plugin-discovery/contract.example.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/plugin-discovery/contract.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/plugin-discovery/module.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/plugin-display-name.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/plugin-marketplaces.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/plugin-store-visibility.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/plugin-sync.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/plugin-types.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/pluginStoreOrder.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/pluginStoreOrdering.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/preinstalled-tools/contract.example.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/preinstalled-tools/contract.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/preinstalled-tools/module.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/preinstalled-tools/node.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/preinstalled-tools/rewrite-bytes.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/preinstalled-tools/validation.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/process-diagnostic.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/process-names.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/processResourceTelemetry.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/project-access-token-client.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/project-access-token-response.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/project-access-token.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/protocol.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/provider-family-connection-selection.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/provider-provisioning.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/providers.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/remote-sync.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/remote-workspace-identity.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/remoteAppConfig.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/remoteAssetInstallMode.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/remoteEnvironmentKey.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/remoteResourcePackages.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/remoteSshHostKey.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/remoteTarget.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/remoteUsageTelemetry.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/rendererActionTrace.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/request-security-edition/contract.example.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/request-security-edition/contract.test.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/request-security-edition/contract.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/request-security-edition/index.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/request-security-edition/module.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/request-security-edition/policy.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/request-security-edition/verification-policy.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/rewardsBridge.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/rewardsEmbedded.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/runtime-tool-runtime.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/runtimeEnv.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/server-remote.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/serviceAuthority.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/session-debug.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/sessionCreateTelemetry.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/settings-errors.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/settings-source.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/settings-sync.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/shortcutCommands.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/skill-scan-policy.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/skill-sync.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/skills-types.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/source-server/compatibility.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/source-server/connectionErrors.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/source-server/connectionLog.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/source-server/contracts.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/source-server/errorCodes.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/source-server/index.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/source-server/release.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/sqlite-migrations/backup-volumes.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/sqlite-migrations/backup.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/sqlite-migrations/contract.example.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/sqlite-migrations/contract.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/sqlite-migrations/index.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/sqlite-migrations/legacy.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/sqlite-migrations/module.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/sqlite-migrations/restore.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/sqlite-migrations/runner.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/sqlite-migrations/table-snapshot.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/storage.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/streaming-tool-input-preview.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/subagent-markdown-selection.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/subagent-profile-frontmatter.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/subagent-profile-parser.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/subagent-profile.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/subagent-runtime-config.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/subagent-state-migration.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/subagents-types.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/task-realtime-core.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/task-realtime.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/telemetry.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/telemetryRedaction.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/test-ids-workflow.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/test-ids.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/tool-call-summary.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/tool-identity.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/tool-plan-adapter.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/update.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/usage-quota.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/usage-stats.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/userInstructions.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/uuid.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/validation.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/validationAppSettings.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/version.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/web-remote-control-rpc-transport.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/web-remote-control.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/web-remote-relay/adapters/heartbeat.ts` | Protocolo de relay web, GenUI e UI de app Desktop | fora do escopo de harness | fora do escopo de harness |
| `packages/shared/src/web-remote-relay/contract.example.ts` | Protocolo de relay web, GenUI e UI de app Desktop | fora do escopo de harness | fora do escopo de harness |
| `packages/shared/src/web-remote-relay/contract.ts` | Protocolo de relay web, GenUI e UI de app Desktop | fora do escopo de harness | fora do escopo de harness |
| `packages/shared/src/web-remote-relay/domain/heartbeatTiming.ts` | Protocolo de relay web, GenUI e UI de app Desktop | fora do escopo de harness | fora do escopo de harness |
| `packages/shared/src/web-remote-relay/domain/notification.ts` | Protocolo de relay web, GenUI e UI de app Desktop | fora do escopo de harness | fora do escopo de harness |
| `packages/shared/src/web-remote-relay/domain/retry.ts` | Protocolo de relay web, GenUI e UI de app Desktop | fora do escopo de harness | fora do escopo de harness |
| `packages/shared/src/web-remote-relay/domain/webRemoteControlActions.ts` | Protocolo de relay web, GenUI e UI de app Desktop | fora do escopo de harness | fora do escopo de harness |
| `packages/shared/src/web-remote-relay/index.ts` | Protocolo de relay web, GenUI e UI de app Desktop | fora do escopo de harness | fora do escopo de harness |
| `packages/shared/src/web-remote-relay/mobileLog.ts` | Protocolo de relay web, GenUI e UI de app Desktop | fora do escopo de harness | fora do escopo de harness |
| `packages/shared/src/web-remote-relay/module.ts` | Protocolo de relay web, GenUI e UI de app Desktop | fora do escopo de harness | fora do escopo de harness |
| `packages/shared/src/workspace-hook-config.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/workspace-hook-digest.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/workspace-hook-discovery.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/workspace-hook-mutation.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/workspace-hook-review-monotonicity.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/workspace-hook-trust-store-file.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/workspaceFileEntriesCodec.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/workspaceFileSearch.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/workspacePurpose.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/workspaceSessionRestore.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/wslUserValidation.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/zcode-agent-model-state.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/zcode-agent-policy.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/zcode-agent-runtime.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/zcode-api-retry-status.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/zcode-media-policy.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/zcode-network-debug-status.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/zcode-protocol-legacy-types.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/apply.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/attachment-faults.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/attachment-ref.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/coalesce.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/command.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/context-composition/contract.example.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/context-composition/contract.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/context-composition/module.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/controller.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/core.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/create-session-config.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/create-workflow-display.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/cuaPermission.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/delta.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/fork.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/index.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/input-intent.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/input-prediction/contract.example.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/input-prediction/contract.test.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/input-prediction/contract.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/input-prediction/module.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/pluginInstall.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/profiles.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/rows.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/session-config.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/session-data/contract.example.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/session-data/contract.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/session-data/index.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/session-data/module.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/sessions-index-workflow-activity.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/sessions-index.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/shared-context-import.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/shared-context-ref.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/snapshot.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/submission.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/telemetry.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/toolDisplay.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/transport.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/wire-assembler.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/wire-binary.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/wire-codec.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca [adaptado upstream: third-party/copied-components.json] | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/wire-fault.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/wire-reassembly.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/wire.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/workflow-artifact.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/workflow-artifacts.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/workflow-command-rejections.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/workflow-observation-display.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/workflow-row-meta.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/workflow-run-settings-command.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/workflow-runs-actor-session.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/workflow-runs-actor-status.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/workflow-runs-artifacts.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/workflow-runs-caps.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/workflow-runs-concurrency.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/workflow-runs-delta.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/workflow-runs-entries.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/workflow-runs-eviction.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/workflow-runs-holes.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/workflow-runs-legacy.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/workflow-runs-lineage.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/workflow-runs-node-progress.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/workflow-runs-phases.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/workflow-runs-reducer.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/workflow-runs-started.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/workflow-runs-tables.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/workflow-runs-unlisted.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/workflow-runs.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/workflow-workspace.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/workspace-config.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol-v4/workspace-hook-review.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol/index.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol/plugin-host-queries/contract.example.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol/plugin-host-queries/contract.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol/plugin-host-queries/module.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-protocol/trace.ts` | Contratos compartilhados de protocolo, worktree, migracao e seguranca | `packages/coding-agent/src/modes/rpc`; `packages/durable/src` | equivalente parcial |
| `packages/shared/src/zcode-session-content-profile.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/zcode-session-task-status.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/zcode-session-visible-content.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/zcode-slash-command-help.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/zcode-source-headers.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/zcode-task-mode-schema.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/zcode-task-types-core.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/zcode-task-types.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/zcode-tool-projection-memory.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/zcodeEndpoint.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/src/zcodePersistedMessageMerge.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/test/fixtures/fake-relay-v2.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/test/messageTelemetry.test.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/test/webRemoteControlActions.test.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/test/webRemoteControlMobileLog.test.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/test/zcodeProtocolV4InputPrediction.test.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/shared/vitest.config.ts` | Tipos e helpers compartilhados entre CLI, services e UI | `packages/schema/src`; `packages/ai/src/types.ts` | equivalente parcial |
| `packages/stream-animate/src/App.tsx` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/stream-animate/src/client/Aggregates.tsx` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/stream-animate/src/client/FrameChart.tsx` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/stream-animate/src/client/RunForm.tsx` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/stream-animate/src/client/RunHistory.tsx` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/stream-animate/src/client/RunSummaryPanel.tsx` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/stream-animate/src/client/api.ts` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/stream-animate/src/main.tsx` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/stream-animate/src/server/cli.ts` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/stream-animate/src/server/dataStore.ts` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/stream-animate/src/server/deepseekRunner.ts` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/stream-animate/src/server/frameBuckets.ts` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/stream-animate/src/server/frameForecast.ts` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/stream-animate/src/server/http.ts` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/stream-animate/src/server/index.ts` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/stream-animate/src/shared/types.ts` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/stream-animate/vite.config.ts` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/web-share/src/ShareAuthPages.tsx` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/web-share/src/main.tsx` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/web-share/vite.config.ts` | Pacote auxiliar de cliente WebSocket, share web, UI ou viewer E2E | fora do escopo de harness | fora do escopo de harness |
| `packages/zcode-cua/broker-helper-constants.js` | Placeholder open-source fail-closed do runtime CUA (macOS/Windows no app fechado) | sem equivalente | fora do escopo de harness |
| `packages/zcode-cua/broker-helper-health.js` | Placeholder open-source fail-closed do runtime CUA (macOS/Windows no app fechado) | sem equivalente | fora do escopo de harness |
| `packages/zcode-cua/broker-in-process.js` | Placeholder open-source fail-closed do runtime CUA (macOS/Windows no app fechado) | sem equivalente | fora do escopo de harness |
| `packages/zcode-cua/broker-ports.js` | Placeholder open-source fail-closed do runtime CUA (macOS/Windows no app fechado) | sem equivalente | fora do escopo de harness |
| `packages/zcode-cua/broker-server.js` | Placeholder open-source fail-closed do runtime CUA (macOS/Windows no app fechado) | sem equivalente | fora do escopo de harness |
| `packages/zcode-cua/broker-socket-path.js` | Placeholder open-source fail-closed do runtime CUA (macOS/Windows no app fechado) | sem equivalente | fora do escopo de harness |
| `packages/zcode-cua/broker.js` | Placeholder open-source fail-closed do runtime CUA (macOS/Windows no app fechado) | sem equivalente | fora do escopo de harness |
| `packages/zcode-cua/frame-contract.js` | Placeholder open-source fail-closed do runtime CUA (macOS/Windows no app fechado) | sem equivalente | fora do escopo de harness |
| `packages/zcode-cua/host-display-contract.js` | Placeholder open-source fail-closed do runtime CUA (macOS/Windows no app fechado) | sem equivalente | fora do escopo de harness |
| `packages/zcode-cua/index.js` | Placeholder open-source fail-closed do runtime CUA (macOS/Windows no app fechado) | sem equivalente | fora do escopo de harness |
| `packages/zcode-cua/pip-session-node.js` | Placeholder open-source fail-closed do runtime CUA (macOS/Windows no app fechado) | sem equivalente | fora do escopo de harness |
| `packages/zcode-cua/pip-session.js` | Placeholder open-source fail-closed do runtime CUA (macOS/Windows no app fechado) | sem equivalente | fora do escopo de harness |
| `packages/zcode-cua/request-access-contract.js` | Placeholder open-source fail-closed do runtime CUA (macOS/Windows no app fechado) | sem equivalente | fora do escopo de harness |
| `packages/zcode-cua/test/availability.test.ts` | Placeholder open-source fail-closed do runtime CUA (macOS/Windows no app fechado) | sem equivalente | fora do escopo de harness |
| `packages/zcode-cua/vitest.config.ts` | Placeholder open-source fail-closed do runtime CUA (macOS/Windows no app fechado) | sem equivalente | fora do escopo de harness |
| `packages/zcode-server-cli/scripts/verify-proxy-stdio-docker.mjs` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/scripts/verify-proxy-stdio-wsl.mjs` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/scripts/verify-remote-ssh-runtime.mjs` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/scripts/verify-remote-ssh-target.mjs` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/scripts/verify-remote-ssh.mjs` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/cli.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/contracts.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/index.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/ipc/controlClient.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/ipc/controlError.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/ipc/controlServer.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/ipc/framing.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/main.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/packaging/nodeDistMirror.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/packaging/remoteAssetRelease.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/packaging/stage.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/packaging/stageArchives.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/packaging/stageCli.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/packaging/stageDependencies.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/packaging/stageRemoteAssetsCli.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/packaging/tarCommand.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/platform/serviceManager.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/runtime/agentWiring.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/runtime/componentCache.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/runtime/immutableRelease.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/runtime/installationOwnership.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/runtime/lock.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/runtime/manifest.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/runtime/paths.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/runtime/releaseDownload.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/runtime/releaseInstaller.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/runtime/releaseManager.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/runtime/serviceInstallation.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/runtime/shutdownWait.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/runtime/stableLauncher.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/runtime/startupRecovery.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/runtime/statusSnapshot.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/runtime/uninstallGuard.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/runtime/updateCommand.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/runtime/updateErrors.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/runtime/updateHandoff.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/runtime/updatePreparation.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/runtime/updateReadiness.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/server-core/core.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/server-core/entry.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/server-core/hostCapability.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/server-core/http.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/server-core/ingressToken.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/server-core/parentDisconnect.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/server-core/proxyStdio.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/server-core/serverIdentity.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/server-core/taskActivityTracker.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/supervisor/crashBudget.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/src/supervisor/supervisor.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/test/packaging.test.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/test/stageRemoteAssetsCli.test.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/test/tsupConfig.test.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/test/verifyRemoteSshTarget.test.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `packages/zcode-server-cli/tsup.config.ts` | Servidor remoto stdio/HTTP, supervisor e deploy SSH/WSL | `packages/env/src`; `packages/durable/src` | equivalente parcial |
| `scripts/architecture/adopt.mjs` | Governanca arquitetural automatica de camadas e fronteiras entre modulos | `scripts/ci/lint/core_scope.py`; `scripts/ci/run-static.sh` | equivalente parcial |
| `scripts/architecture/architecture-check.mjs` | Governanca arquitetural automatica de camadas e fronteiras entre modulos | `scripts/ci/lint/core_scope.py`; `scripts/ci/run-static.sh` | equivalente parcial |
| `scripts/architecture/context.mjs` | Governanca arquitetural automatica de camadas e fronteiras entre modulos | `scripts/ci/lint/core_scope.py`; `scripts/ci/run-static.sh` | equivalente parcial |
| `scripts/architecture/default-branch.mjs` | Governanca arquitetural automatica de camadas e fronteiras entre modulos | `scripts/ci/lint/core_scope.py`; `scripts/ci/run-static.sh` | equivalente parcial |
| `scripts/architecture/git-base.mjs` | Governanca arquitetural automatica de camadas e fronteiras entre modulos | `scripts/ci/lint/core_scope.py`; `scripts/ci/run-static.sh` | equivalente parcial |
| `scripts/architecture/git-file-names.mjs` | Governanca arquitetural automatica de camadas e fronteiras entre modulos | `scripts/ci/lint/core_scope.py`; `scripts/ci/run-static.sh` | equivalente parcial |
| `scripts/architecture/index.mjs` | Governanca arquitetural automatica de camadas e fronteiras entre modulos | `scripts/ci/lint/core_scope.py`; `scripts/ci/run-static.sh` | equivalente parcial |
| `scripts/architecture/policy.mjs` | Governanca arquitetural automatica de camadas e fronteiras entre modulos | `scripts/ci/lint/core_scope.py`; `scripts/ci/run-static.sh` | equivalente parcial |
| `scripts/architecture/report.mjs` | Governanca arquitetural automatica de camadas e fronteiras entre modulos | `scripts/ci/lint/core_scope.py`; `scripts/ci/run-static.sh` | equivalente parcial |
| `scripts/architecture/resolver.mjs` | Governanca arquitetural automatica de camadas e fronteiras entre modulos | `scripts/ci/lint/core_scope.py`; `scripts/ci/run-static.sh` | equivalente parcial |
| `scripts/architecture/session-control-boundary.mjs` | Governanca arquitetural automatica de camadas e fronteiras entre modulos | `scripts/ci/lint/core_scope.py`; `scripts/ci/run-static.sh` | equivalente parcial |
| `scripts/architecture/upstream-admission.mjs` | Governanca arquitetural automatica de camadas e fronteiras entre modulos | `scripts/ci/lint/core_scope.py`; `scripts/ci/run-static.sh` | equivalente parcial |
| `scripts/architecture/upstream-snapshot.mjs` | Governanca arquitetural automatica de camadas e fronteiras entre modulos | `scripts/ci/lint/core_scope.py`; `scripts/ci/run-static.sh` | equivalente parcial |
| `scripts/architecture/violations.mjs` | Governanca arquitetural automatica de camadas e fronteiras entre modulos | `scripts/ci/lint/core_scope.py`; `scripts/ci/run-static.sh` | equivalente parcial |
| `scripts/assert-node-version.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/audit-conversation-session-case-coverage.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/audit-zcode-agent-remnants.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/bootstrap-patched-dependencies.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/bootstrap.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/build-desktop-agent-bytecode.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/build-desktop-agent-cli.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/build-native-search-tools.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/build-time-config.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/build-windows-runtime-host.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/build-zcode.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/builtin-provider-config.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/cdn-preload.sh` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/check-document-libreoffice.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/check-document-libreoffice.test.ts` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/check-document-python.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/check-document-python.test.ts` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/check-e2e-remote-targets.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/check-push-worktree.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/check-sqlite-schema.ts` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/check-stale-doc-phrases.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/check-workspace-freshness.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/clean.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/cli-lint-admission.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/compile-desktop-agent-bytecode.cjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/count-lines.sh` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/create-workspace-hook-trust-uat-fixture.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/dep-refs.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/dependency-graph.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/desktop-agent-bytecode-runtime.cjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/deterministic-tar-archive.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/dev-desktop-cua-env.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/dev-desktop-env.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/dev-desktop-remote-prod.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/dev-official-mcp-server.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/dev-web-remote-control-desktop.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/dev-web-share-env.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/dev/zcode-stdio-tap.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/doctor-macos-release-app.sh` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/download-glm.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/download-glm.sh` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/download-native-search-tools.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/download-ripgrep.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/engineering-tests/process.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/engineering-tests/scope.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/ensure-native-search-deps.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/generate-third-party-notices.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/intranetDefaults.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/lib/conversation-session-formal-admission-audit.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/lib/conversation-session-formal-admission-contract.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/lib/conversation-session-formal-admission-ledger.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/lib/conversation-session-formal-admission-paths.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/lib/conversation-session-formal-admission-utils.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/lib/conversation-session-formal-admission.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/lib/retired-app-unit-evidence.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/license-identifiers.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/licenses.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/load-endpoint-env.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/marketing-executable-lines.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/marketing-source-map-evidence.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/marketing-touch-coverage-audit.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/mcp-image-payload-test-server.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/mise-run.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/mise-toolchain-env.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/multimodal-marker-png.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/multimodal-marker-png.test.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/multimodal-tool-result-p0.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/native-binary-archs.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/native-search-tools-bundle-meta.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/native-search-tools-config.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/native-search-tools-process.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/native-search-tools-unix.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/native-search-tools-verify.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/native-search-tools-windows-pe.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/native-search-tools-windows.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/package-native-search-tools.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/prebuilt-binary-download.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/prebuilt-binary-extract.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/preinstalled-tools/catalog.test.ts` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/prepare-native-search-tools.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/release-it/changelog-writer.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/release-it/release-it-dry-run-wrapper.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/release-it/task-status-printer.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/remote-native-search-tools-config.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/restore-sqlite-migration.ts` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/run-affected-engineering-tests.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/run-cli-lint.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/spawn-command.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/sqlite-schema-contract.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/stage-credential-keyring.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/stage-dev-cua-plugin-runtime.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/test-desktop-e2e-container.sh` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/test-native-search-tools-e2e.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/test-sea-runtime-tools-e2e.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/test-web-app-gateway-reset.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/test/affected-engineering-test-cli.test.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/test/architecture-default-branch.test.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/test/architecture-governance-review.test.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/test/architecture-governance.test.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/test/architecture-upstream-admission.test.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/test/arms-patch-install-contract.test.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/test/audit-conversation-session-json-out.test.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/test/bootstrap-patched-dependencies.test.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/test/build-time-config.test.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/test/cli-lint-admission.test.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/test/cli-release.test.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/test/cli-test-environment.test.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/test/conversation-session-formal-admission-audit.test.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/test/conversation-session-formal-admission-review-2.test.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/test/conversation-session-formal-admission-review.test.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/test/conversation-session-formal-admission.test.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/test/e2e-remote-targets-check.test.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/test/git-product-invocation.test.ts` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/test/installer-process-helper.test.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/test/license-identifiers.test.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/test/marketing-executable-lines.test.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/test/marketing-source-map-evidence.test.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/test/marketing-touch-coverage-audit.test.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/test/pre-push-worktree.test.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/test/react-hooks-lint.test.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/test/retired-app-unit-evidence.test.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/test/session-control-boundary.test.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/test/source-size-policy.test.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/test/sqlite-schema-contract.test.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/test/third-party-npm-platform.test.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/test/verify-electron-builder-binaries-mirror.test.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/test/windows-runtime-host-build.test.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/third-party-notices.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/third-party-notices.test.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/third-party-npm.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/verify-electron-builder-binaries-mirror.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/verify-project-upgrade.mts` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/windows-runtime-host/acceptance.cpp` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/windows-runtime-host/host-acceptance.cjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/windows-runtime-host/installer-process-fixture.cpp` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/windows-runtime-host/installer-process-helper.cpp` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/windows-runtime-host/main.cpp` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/zcode-distribution-smoke.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/zcode-distribution.test.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/zcode-distribution/assets.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/zcode-distribution/installer.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `scripts/zcode-distribution/runner.mjs` | Hooks Git e scripts de build, CI e verificacao do monorepo | `scripts/ci/run-static.sh`; `scripts` | equivalente direto |
| `vitest.config.ts` | Arquivo de configuracao/toolchain na raiz | `biome.json`; `vitest.base.ts` | equivalente direto |
| `vitest.setup.ts` | Arquivo de configuracao/toolchain na raiz | `biome.json`; `vitest.base.ts` | equivalente direto |
