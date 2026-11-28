# 07 — Tabela centralizada de timeouts (`TOOL_TIMEOUTS`) e reconexão MCP em falhas de transporte

- **Classe**: **A** (organização defensiva de limites internos de transporte/timeout sem alterar prompts, schemas ou comportamento nominal do modelo).
- **Prioridade**: **P2** (elimina falhas frustrantes de conexão MCP expirada em sessões longas e unifica clamps inconsistentes de timeout).

## O que o `omp` faz

1. **Tabela central de timeouts**: em `omp:packages/coding-agent/src/tools/tool-timeouts.ts:10-39`, todas as ferramentas com timeout declaram `{ default, min, max }` numa única tabela `TOOL_TIMEOUTS` e aplicam `clampTimeout(tool, rawTimeout, maxTimeout)` garantindo inclusive que um teto global (`tools.maxTimeout`) governe defaults:

```ts
export const TOOL_TIMEOUTS = {
   bash: { default: 300, min: 1, max: 3600 },
   eval: { default: 30, min: 1, max: 3600 },
   browser: { default: 30, min: 1, max: 300 },
   computer: { default: 120, min: 1, max: 300 },
   ssh: { default: 60, min: 1, max: 3600 },
   fetch: { default: 20, min: 1, max: 45 },
   lsp: { default: 20, min: 5, max: 300 },
   debug: { default: 30, min: 5, max: 300 },
   dsm: { default: 120, min: 1, max: 3600 },
} as const satisfies Record<string, ToolTimeoutConfig>;
```

1. **Reconexão transparente MCP + limite de 64 chars**: em `omp:packages/coding-agent/src/mcp/tool-bridge.ts:59-92`, `isRetriableConnectionError` detecta erros transitórios de transporte (`econnrefused`, `econnreset`, `epipe`, `transport closed`, HTTP `404`/`502`/`503`) e sessões HTTP expiradas (`EXPIRED_SESSION`, JSON-RPC `-32001`), reconectando e tentando **uma vez** de forma transparente para o modelo; adicionalmente normaliza/encurta nomes MCP acima de `MAX_MCP_TOOL_NAME_LENGTH = 64` (exigência da API OpenAI/Anthropic).

- **Ancestralidade Pi**: ausente em `pi0.9.4` e `pibase` (`omp` criou `tool-timeouts.ts` e `mcp/tool-bridge.ts`).

## Como o `nycode` faz

- Timeouts das ferramentas do `nycode` ficam distribuídos em módulos independentes: `bash` em `packages/coding-agent/src/core/tools/bash-timeout.ts:13-31` (`DEFAULT_TIMEOUT_S = 600`, `MAX_TIMEOUT_S = 1800` via `BASH_DEFAULT_TIMEOUT_MS`/`BASH_MAX_TIMEOUT_MS`), `web_fetch` em `extensions/web/index.ts`, `lsp` em `extensions/lsp/index.ts:43` (`45s` start, `1500ms` wait), `subagent` em `extensions/subagent/`, sem registro central ou clamp global unificado.
- Em `packages/coding-agent/src/extensions/mcp/index.ts:157-1348`, quando um servidor MCP local cai (SSE morto, processo filho reiniciado ou sessão HTTP expirada entre turnos ociosos), a chamada de ferramenta devolve erro para o modelo em vez de executar 1 reconexão transparente automática de transporte/sessão expirada.

## Diferença concreta

| Aspecto | `omp` (`v19.2.1`) | `nycode` (`00fed2ae`) |
|---|---|---|
| Limites de timeout por tool | `TOOL_TIMEOUTS` + `clampTimeout` centralizado (`omp:packages/coding-agent/src/tools/tool-timeouts.ts:10-39`) | Espalhado por módulo (`core/tools/bash-timeout.ts:13-31`, `extensions/web`, `extensions/lsp`) |
| Queda/expiração de conexão MCP | `isRetriableConnectionError` faz reconnect + 1 retry transparente (`omp:packages/coding-agent/src/mcp/tool-bridge.ts:59-92`) | Erro sobe direto para o agente como falha de ferramenta (`extensions/mcp/index.ts`) |
| Nomes MCP > 64 chars | Truncamento determinístico com hash p/ `MAX_MCP_TOOL_NAME_LENGTH = 64` (`mcp/tool-bridge.ts`) | Requer atenção manual em nomes compostos extensos servidor+tool |

## Benefício

- **Problema**: (1) em sessões longas com servidores MCP HTTP/SSE ou processos stdio reiniciados após sleep da máquina, a próxima chamada falha com `ECONNRESET`/`Unknown session`, obrigando o LLM a gastar turnos tentando diagnosticar ou pedir `/mcp` restart; (2) cada nova ferramenta inventa sua própria regra de clamping de timeout.
- **Rastro**: `isRetriableConnectionError` distingue falhas puramente de sessão/transporte antes da execução da tool (onde a requisição não rodou no servidor, como `-32001` ou `ECONNREFUSED`), tornando seguro tentar reconectar 1× antes de expor falha ao agente.
- **Solução**: extrair a tabela de timeouts das ferramentas/extensões de rede do `nycode` (preservando os valores deliberados de `bash-timeout.ts:13-14`, `DEFAULT_TIMEOUT_S = 600` e `MAX_TIMEOUT_S = 1800`, comentados no código) e implementar reconexão única em erros elegíveis de conexão/sessão expirada em `extensions/mcp/index.ts`.

## Custo

- **Tokens / turno**: **0** (inclusive evita turnos extras perdidos quando servidor MCP expirou).
- **Latência**: **0 ms** no caminho feliz; no erro de transporte morto faz 1 handshake de reconexão transparente.
- **Manutenção**: ~70 LOC TS puro sem dependências externas.

## Riscos

- **Idempotência de retry MCP**: só tentar reconexão automática quando a falha for claramente de estabelecimento de conexão (`ECONNREFUSED`, `-32001 expired session`, `transport not connected`) e **nunca** em timeout após envio do payload de mutação (um `timeout` de tool MCP após envio não sabe se a mutação executou no servidor!). A lista conservadora `RETRIABLE_PATTERNS` em `omp:packages/coding-agent/src/mcp/tool-bridge.ts:59-92` exclui `timeout` justamente por esse motivo.
- **Preservar seam K8 do `bash-timeout.ts`**: não alterar `DEFAULT_TIMEOUT_S = 600` nem `MAX_TIMEOUT_S = 1800` nem `wrapForBackground` do `nycode` — apenas referenciá-los ou documentar na tabela central.

## Licença

**MIT** (`omp:LICENSE:1-23`).

## Proposta

- **`packages/coding-agent/src/extensions/mcp/index.ts`** (ou cliente MCP compartilhado no `@nycode/mcp` caso a reconexão viva lá): adicionar `isRetriableConnectionError` (excluindo estritamente timeouts pós-envio) com 1 tentativa de reconexão + re-call, mais normalização segura com hash para nomes > 64 caracteres quando expostos em `direct`/`deferred`.
- **`packages/coding-agent/src/core/tools/tool-timeouts.ts`** (opcional, se houver mais ferramentas core/rede consumindo): consolidar constantes e helper `clampToolTimeout` sem mudar os números de `bash-timeout.ts`.

## Testes

- `packages/coding-agent/test/harness/mcp/` (ou `packages/mcp/test/`): testar (1) `ECONNRESET` / HTTP `-32001` reconecta e sucede na 2ª tentativa; (2) erro semântico da tool ou `ETIMEDOUT` pós-disparo **não** retenta; (3) nomes > 64 chars truncam deterministicamente sem colisão.

## Plano de eval

Não aplicável (Classe A: resiliência de transporte MCP sem alterar prompts, schemas nominais ou fluxo do modelo).

## Critérios de aceite

1. Reconexão única em queda/expiração de sessão MCP sem erro espúrio no histórico do agente.
2. Zero retry em erro de execução da tool ou timeout pós-envio.
3. `npm run check` e suítes unitárias de `mcp` passam.

## Rollback

Reverter a wrapper de reconexão em `extensions/mcp/index.ts` e eventuais referências a `tool-timeouts.ts`.
