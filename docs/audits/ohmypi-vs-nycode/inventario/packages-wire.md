# Inventario: packages-wire

Cada linha cobre 1 arquivo rastreado em `~/source/oh-my-pi-ref` (`git ls-files`), com categoria, origem em relação ao Pi `v0.9.4`, dono equivalente no `nycode` (ou `sem equivalente`) e nota resumida verificada nos shards. Regras e totais em [../inventario.md](../inventario.md).

| Arquivo | Categoria | Origem | Dono no nycode | Nota |
|---|---|---|---|---|
| `packages/wire/CHANGELOG.md` | doc | omp-novo | `packages/coding-agent/src/modes/rpc` | 200L; Historico de versoes do pacote @oh-my-pi/pi-wire ate a v19.2.1 (protocolo collab v3, stream, skillshare, shell-trace e TSP). |
| `packages/wire/LICENSE` | codigo | omp-novo | `packages/coding-agent/src/modes/rpc` | 22L; Licenca MIT do pacote @oh-my-pi/pi-wire. |
| `packages/wire/README.md` | doc | omp-novo | `packages/coding-agent/src/modes/rpc` | 31L; Documentacao resumida das fronteiras e exports do contrato JSON @oh-my-pi/pi-wire entre host CLI, relay e browser guest. |
| `packages/wire/package.json` | config_ou_dado | omp-novo | `packages/coding-agent/src/modes/rpc` | 54L; Manifesto do pacote @oh-my-pi/pi-wire (v19.2.1) com exports TypeScript diretos e scripts Bun/oxlint. |
| `packages/wire/src/index.ts` | codigo | omp-novo | `packages/coding-agent/src/modes/rpc` | 671L; Contrato de protocolo das sessoes colaborativas ao vivo E2E (mensagens, entradas de sessao, eventos, frames, envelopes binarios... |
| `packages/wire/src/shell-trace.ts` | codigo | omp-novo | `packages/coding-agent/src/modes/rpc` | 468L; Modelo de dados e validador runtime (isShellTrace) para rastreamento ao vivo de execucao AST no shell embutido (unidades, nos, ... |
| `packages/wire/src/shell-viz.ts` | codigo | omp-novo | `packages/coding-agent/src/modes/rpc` | 112L; Contrato de apresentacao semantica de execucoes shell (modos raw/pseudo, camadas, efeitos heuristicos, watches por escopo e lin... |
| `packages/wire/src/skillshare.ts` | codigo | omp-novo | `packages/coding-agent/src/modes/rpc` | 323L; Contrato HTTP, limites de pacote, headers de integridade/proveniencia OIDC e tipos do registro de skills Skillshare (skills.omp... |
| `packages/wire/src/stream.ts` | codigo | omp-novo | `packages/coding-agent/src/modes/rpc` | 169L; Contrato WebSocket/HTTP do omp stream (transmissao ao vivo de paineis do terminal com deltas viewport/history/patch, chat e upl... |
| `packages/wire/src/tsp.ts` | codigo | omp-novo | `packages/coding-agent/src/modes/rpc` | 1465L; Especificacao TypeScript do Tern Surface Protocol (parte 1): constantes APC, vocabulario de componentes, acoes, hovercards, tra... |
| `packages/wire/tsconfig.json` | config_ou_dado | omp-novo | `packages/coding-agent/src/modes/rpc` | 4L; Configuracao TypeScript do pacote wire estendendo tsconfig.workspace.json. |
| `packages/wire/tsconfig.publish.json` | config_ou_dado | omp-novo | `packages/coding-agent/src/modes/rpc` | 16L; Configuracao TypeScript de publicacao emitindo declaracoes .d.ts para dist/types. |
