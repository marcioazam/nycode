# 15. Code Mode como padrão para MCP, com diff de catálogo

Classe: **B**. Prioridade: **P2** (decisão do dono já registrada: híbrido com A/B antes de virar padrão).

## O que o OpenCode faz

- MCP entra em Code Mode por padrão (`CHANGELOG.md` v2.0, changelog web v2.2.7); servidores que já são Code Mode
  ficam fora (`packages/core/src/plugin/mcp-codemode-defaults.ts:6-25`).
- `packages/core/src/codemode/instructions.ts:40-71`: quando servidores conectam/desconectam ou mudam tools, o modelo
  recebe só o que mudou ("The Code Mode tool catalog has changed. This catalog supersedes ...") em vez do catálogo
  inteiro (#62176, `CHANGELOG.md:599`).
- `packages/core/src/codemode/catalog.ts:146`: resumo por tool com limite (500 chars desde #64341, `CHANGELOG.md:356`).
- Negar `execute` expõe as tools diretamente (`packages/core/src/tool.ts:427-437`).

## Como o nycode faz

- `packages/coding-agent/src/extensions/codemode/index.ts:5,44`: `codemode` registrado inativo (`defaultActive:
  false`); ativa por `--tools`/`defaultTools`.
- `packages/coding-agent/src/extensions/tool-search/`: tools MCP diferidas, carregadas por busca.
- Decisão registrada na memória do dono (2026-11-25): "codemode hybrid (codemode + tool_search) with bench A/B before
  default".

## Diferença

O nycode já tem os dois mecanismos; falta o diff de catálogo e o A/B. O diff de catálogo é o único item novo: hoje uma
mudança de tools MCP no meio da sessão no nycode passa por `declareToolChanges` (`packages/agent/src/agent-loop.ts:342`)
com as definições completas das tools adicionadas.

## Benefício

Menos schema MCP fixo; para catálogos grandes (dezenas de tools), milhares de tokens por requisição a menos.

## Custo

Catálogo em texto no prompt (o OC limita a 500 chars por tool); turnos de script podem errar mais que chamadas
diretas. Manutenção média.

## Riscos

Acerto em tarefas MCP pode cair (modelo escrevendo JS em vez de chamar tool). Por isso B.

## Licença

MIT.

## Proposta

Seguir a decisão existente: bench A/B `tool_search` vs `codemode+tool_search`; se o híbrido vencer, implementar o diff
de catálogo em `extensions/codemode/`.

## Testes

Mudança de servidor MCP gera mensagem só com tools adicionadas/removidas.

## Plano de eval

Tarefas com 2-3 servidores MCP grandes (bench). Métricas: acerto, tokens fixos, tokens totais, chamadas por tarefa.

## Aceite

Acerto não inferior com tokens totais menores.

## Rollback

`codemode` volta a inativo.
