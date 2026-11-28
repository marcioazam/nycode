# Achado 04: Trust de Workspace Vinculado a Digest Criptografico e Budget de Startup para MCP

- **Classe**: **A** (0 tokens extras; mecanismo exclusivamente de seguranca/inicializacao no host, invisivel ao LLM quando tudo esta saudavel)
- **Prioridade**: **P2 (Media-Alta dentro da Classe A)**

## Problema

Em projetos abertos no modo interativo, um repositorio malicioso pode ter sua configuracao local de MCP ou hooks alterada por um `git pull` ou commit de terceiros depois que o usuario clicou em "Trust project folder". Alem disso, um servidor MCP configurado no projeto que trava no handshake pode travar o boot da sessao por tempo indefinido.

## O que o ZCode faz (`~/source/zcode-ref`)

- **Arquivos e linhas**: `apps/zcode-cli/packages/bootstrap/src/workspace-mcp-trust/contract.ts:6-15`, `apps/zcode-cli/packages/core/src/hooks/workspace-hook-trust-coordinator.ts:27-99` e `apps/zcode-cli/packages/bootstrap/src/plugin-startup-budget/contract.ts:4-13` (`~/source/zcode-ref`).
- **Mecanismo concreto**:
  1. `WorkspaceMcpTrustContract` e `WorkspaceHookTrustCoordinator` vinculam cada aprovacao persistida ao par `(workspaceIdentity, declarationDigest)` (digest SHA-256 da declaracao exata). Em `allows(serverName, config)` (`apps/zcode-cli/packages/bootstrap/src/workspace-mcp-trust/contract.ts:11-12`), antes de conectar, o digest atual e recalculado e comparado; se o arquivo de projeto mudou, a permissao anterior deixa de valer (fail-closed) ate nova revisao.
  2. `PluginStartupBudget` (`apps/zcode-cli/packages/bootstrap/src/plugin-startup-budget/contract.ts:4-13`) limita o tempo de espera de inicializacao de plugins no processo e marca `degraded` de forma monotona ate o proximo processo se o limite expirar.

```typescript
// ~/source/zcode-ref/apps/zcode-cli/packages/bootstrap/src/workspace-mcp-trust/contract.ts:8-12
inspect(): Promise<Record<string, WorkspaceMcpTrustReview>>;
decide(serverName: string, declarationDigest: string, trusted: boolean): Promise<void>;
allows(serverName: string, config: McpServerConfig): Promise<boolean>;
```

## Como o nycode faz hoje (`~/source/nycode-audit-zcode`)

- **Arquivos e linhas**: `packages/coding-agent/src/core/project-trust.ts:47-97` e `packages/mcp/src/client.ts` / `packages/coding-agent/src/core/mcp-servers.ts`.
- `resolveProjectTrusted(options)` armazena e consulta `options.trustStore.get(options.cwd)` (`boolean` puro indexado pelo caminho `cwd`). Uma vez aprovado `cwd`, alteracoes posteriores em `.claude/settings.json`, extensoes locais ou `.mcp.json` herdam a confianca binaria do diretorio sem revalidar o hash do manifesto executado.

## Diferenca concreta

- **Necessario**: estender `ProjectTrustStore` / `project-trust.ts` no `nycode` para salvar opcionalmente o hash SHA-256 canonico dos recursos executaveis locais (`hooks`, extensoes de projeto e declaracao de MCP servers de projeto) e invalidar a aprovacao se o digest mudar apos `git pull`, junto com timeout de startup nao-bloqueante para MCP servers lentos.
- **Opcional a evitar**: nao importar `WorkspaceHookPolicyProvider` corporativo/MDM do ZCode nem reescrever o modulo de plugins inteiros; manter UX simples com 1 prompt de re-aprovacao mostrando o que mudou.

## Beneficio esperado

- Fecha vetor classico de supply chain em repositorios clonados ou atualizados (`TOCTOU` / mutacao pos-trust em arquivos de projeto).
- Evita sessao CLI travada aguardando MCP server offline durante startup.

## Custo

- **Tokens/turno**: **0** (`o200k_base`).
- **Latencia**: <1 ms para calculo SHA-256 de 1-5 arquivos JSON locais; ganho potencial de varios segundos no startup quando um MCP trava.
- **Manutencao**: baixa (~80–120 linhas entre `project-trust.ts` / `trust-manager.ts` e `mcp-servers.ts`).

## Riscos e armadilhas

- Canonizar ordenacao de chaves ao calcular o SHA-256 para evitar re-prompts falsos por reformatacao identica de whitespace/Biome.
- Cuidar da migracao de usuarios ja confiaveis em `trustStore` antigo (re-prompt unico informativo ao trocar para entrada com digest).

## Licenca e proveniencia

- Referencia ZCode **Apache-2.0** (`~/source/zcode-ref/LICENSE:1-202`). Implementacao nativa no `nycode` sobre `node:crypto` ja usado em `packages/coding-agent/`.

## Proposta de desenho no nycode

- `packages/coding-agent/src/core/trust-manager.ts` e `packages/coding-agent/src/core/project-trust.ts:73-96`: adicionar `computeProjectTrustDigest(cwd)` e comparar digest no `resolveProjectTrusted`.
- `packages/coding-agent/src/core/mcp-servers.ts` / `extensions/mcp/`: encapsular conexao startup de cada MCP com budget configuravel + log estruturado de timeout degradado.

## Testes previstos

- Teste unitario em `packages/coding-agent/test/` simulando mudanca de comando em MCP/hook apos `trustStore.set` -> `resolveProjectTrusted` deve exigir nova aprovacao (`false` em headless `-p` sem override).
- Teste com MCP server fake que nunca responde ao `initialize` -> sessao sobe dentro do timeout sem travar.

## Plano de eval

- **Classe A — verificacao deterministica offline**: validacao puramente por testes unitarios de seguranca e timeout em Vitest; nenhum impacto em tokens nem chamadas de LLM.

## Criterios de aceite e rollback

- **Aceite**: mutacao em config confiavel invalida trust imediatamente; modo `-p` falha fechado (`false`); timeout de MCP degradado nao trava inicializacao.
- **Rollback**: restaurar `trust-manager.ts` e `project-trust.ts` para chave binaria por `cwd`.
