# 21 — RPC v2 (framing, `rpc_chunk`, deltas) e modo servidor ACP (`omp acp`)

- **Classe**: **B** (altera/estende transporte RPC consumido por clientes headless/UI ou adiciona novo modo CLI `acp` sujeito a adaptação de permissões e ponte de arquivo — *já `packages/wire/src/tsp.ts` é Classe C, rejeitado em [rejeitados.md](../rejeitados.md#r16---reescrita-da-tui-para-jsx-reativo-e-protocolo-tsp)*).
- **Prioridade**: **P3** (melhoria de infraestrutura para clientes programáticos externos e futura integração em IDEs compatíveis com ACP, sem impacto direto nos benchmarks CLI atuais).

## O que o `omp` faz

1. **RPC v2 robusto** (`omp:packages/coding-agent/src/modes/rpc/rpc-frame.ts:6-96`, `wire/frames.ts:11-24`, `wire/commands.ts:42-47`): negocia versão `v2` (`negotiate_protocol`), limita frames JSONL a `MAX_RPC_FRAME_BYTES = 1 MiB`, divide payloads até `64 MiB` em `rpc_chunk`, aplica redução progressiva (`SHRINK_PASSES`), introduz `set_event_filter` com `messageUpdates: "delta"` (evita reenviar mensagem inteira $O(n^2)$ a cada token!), correlação explícita `prompt_result` + `session_settled`, e `set_host_tools`:

```ts
/** Maximum UTF-8 size of one newline-delimited RPC frame, including the newline. */
export const MAX_RPC_FRAME_BYTES = 1024 * 1024;
/** Maximum UTF-8 size of one logical frame reassembled by protocol v2. */
export const MAX_RPC_REASSEMBLED_BYTES = 64 * 1024 * 1024;
```

1. **ACP (`omp acp`)** (`omp:packages/coding-agent/src/modes/acp/acp-mode.ts:43-55`, `acp-agent.ts:1-250`, `omp:packages/utils/src/acp/protocol.ts:1`): reimplementação TypeScript zero-deps compatível com Agent Client Protocol (Zed etc.), isolando `stdout` -> `stderr`, ponte `ClientBridge` para `fs`/`terminal` com **read-back pós-escrita** para detectar alterações feitas pelo `format_on_save` do editor (`tools/acp-bridge.ts:78-137`) e `acp-permission-gate.ts`.

- **Ancestralidade Pi**: `pi0.9.4` não tinha `modes/rpc` nem `acp`; `pibase` tinha `modes/rpc/` (~1.8k LOC). Toda a camada RPC v2 e ACP é criação do `omp`.

## Como o `nycode` faz

- `packages/coding-agent/src/modes/rpc/` (`1.815` LOC em `jsonl.ts`, `rpc-client.ts`, `rpc-mode.ts`, `rpc-types.ts`) preserva quase byte-a-byte o RPC v1 do `pibase`, já protegendo `stdout` via `takeOverStdout()` (`core/output-guard.ts`, `rpc-mode.ts:56-63`) e encerramento limpo de filhos (`killTrackedDetachedChildren()`).
- **Lacunas concretas**: sem limite de tamanho de frame JSONL / chunking (um `tool_result` enorme ou imagem base64 pode gerar linha JSON > 10 MB travando buffers de cliente), sem `messageUpdates: "delta"` em streaming RPC (reenvia snapshot completo crescente em cada delta), sem `prompt_result`, e sem servidor ACP (`packages/coding-agent/src/extensions/devin/index.ts:2` registra explicitamente ausência de ACP).

## Diferença concreta

| Aspecto | `omp` (`v19.2.1`) | `nycode` (`00fed2ae`) |
|---|---|---|
| Framing & tamanho RPC | v2 `negotiate_protocol`, teto 1 MiB, `rpc_chunk` até 64 MiB + `SHRINK_PASSES` (`rpc-frame.ts:6-96`) | v1 JSONL puro sem limite de frame nem chunking (`modes/rpc/jsonl.ts`) |
| Custo de serialização em stream | `messageUpdates: "delta"` + serialize-once `isStructureHeavy` (`rpc-frame.ts:29-71`) | Emite snapshot acumulado completo no evento `message_update` |
| Modo ACP para editores (Zed) | `omp acp` completo (~6.5k LOC TS zero-deps) + `ClientBridge` (`modes/acp/`) | Sem equivalente (`main.ts:112`, `extensions/devin/index.ts:2`) |

## Benefício

- **Problema**: consumidores RPC do próprio repositório (ex.: `apps/p2`, `apps/p3`, `bench/`) sofrem overhead $O(n^2)$ de parsing JSON quando respostas de streaming longas emitem `message_update` completo a cada chunk e correm risco de OOM/desync com frames gigantes. Adicionalmente, `omp acp` abre interoperabilidade com Zed/IDEs compatíveis sem adaptador externo.
- **Solução fatiada**:
  1. **Curto prazo (alto ROI em RPC)**: adicionar cap defensivo / `shrink` ou chunking negociável (`v2`) + opção `messageUpdates: "delta"` em `modes/rpc/rpc-mode.ts` e `rpc-client.ts` mantendo 100% compatibilidade retroativa com RPC v1 quando `negotiate_protocol` não for chamado.
  2. **Médio prazo (se priorizado no roadmap de IDE)**: portar camada fina `modes/acp/` + `utils/acp` sem acoplamentos específicos do `omp` (`tts`/`stt`/`html-form`), conectando diretamente ao motor de permissões do `nycode` (`core/permissions/`) e lembrando do **read-back pós-escrita** em caso de `format_on_save` do editor (`tools/acp-bridge.ts:78-137`).

## Custo

- **Tokens / turno**: **0** (protocolos de transporte locais; nenhuma mudança em prompts padrão).
- **Latência**: redução significativa de CPU/alocação de `JSON.stringify`/`JSON.parse` em `apps/p2`/`apps/p3` com `messageUpdates: "delta"`.
- **Manutenção**: ~300 LOC para endurecimento RPC v2 (`delta` + frame cap); ~4k–5k LOC TS puro se implementar ACP completo. Zero dependências externas.

## Riscos

- **Quebra de consumidores internos (`apps/p2`, `apps/p3`, `bench/`)**: toda mudança em `modes/rpc/` precisa manter RPC v1 como comportamento default se o cliente não enviar `negotiate_protocol` / `set_event_filter`, e ser verificada inclusive em `apps/p2` (`cd apps/p2 && npm run check && npm test` conforme `AGENTS.md`).
- **Desincronização com editor em ACP**: editores aplicam `format_on_save` ao receber `fs/write_text_file`, invalidando o diff retornado ao agente caso não haja read-back.
- Docs: qualquer mudança de protocolo RPC ou novo modo CLI exige ADR em `docs/ADR.md` (checkout principal).

## Licença

**MIT** (`omp:LICENSE:1-23`; o próprio protocolo ACP em `omp:packages/utils/src/acp/protocol.ts:1` foi escrito in-house em TS sob MIT).

## Proposta

- **Fase 1 (RPC)**: `packages/coding-agent/src/modes/rpc/{rpc-mode.ts,rpc-types.ts,rpc-client.ts,jsonl.ts}` — adicionar `set_event_filter` (`delta`), cap de frame com truncagem segura de blobs grandes em eventos de stream e comando opcional de negociação v2 retrocompatível.
- **Fase 2 (ACP opt-in)**: `packages/coding-agent/src/modes/acp/` + despacho em `cli/args.ts` e `main.ts:112`, mantendo <= 800 linhas por arquivo novo se modularizado como extensão/modo novo.

## Testes

- `packages/coding-agent/test/rpc*.test.ts` + `test/suite/regressions/{5868,7150,10470}-rpc-*.test.ts`: testar que clientes v1 continuam idênticos, modo `delta` reduz bytes transmitidos reconstruindo a mesma mensagem final em `rpc-client.ts`, e frames > 1 MiB fazem shrink/chunk sem corromper JSONL.
- Verificar consumidores `apps/p2` (`cd apps/p2 && npm run check && npm test`).

## Plano de eval

- **Base e candidato**: protocolos de transporte têm impacto **zero** nos prompts e raciocínio do modelo em `-p`. Rodar `bench/run.py --dry-run` + `suite.s1` (`pr_cases`) como smoke check de regressão de modo headless (pois `packages/coding-agent/src/modes/rpc/**` está em `packages/*/src/**` no classificador funcional `docs/bench/RUNBOOK.md:70-75`), além da suíte completa de testes RPC em Vitest e `apps/p2`. Não reexecutar `cc-vanilla`/`pi-vanilla`.

## Critérios de aceite

1. Clientes RPC v1 existentes funcionam sem nenhuma mudança de contrato.
2. Modo `delta` e limite de frame funcionam em `rpc-client.ts` + `rpc-mode.ts` reduzindo bytes de stream.
3. Todas as regressões RPC (`5868`, `7150`, `10470`) e testes do `p2` passam.

## Rollback

Manter apenas v1 JSONL revertendo as adições em `modes/rpc/` (e removendo `modes/acp/` caso iniciado).
