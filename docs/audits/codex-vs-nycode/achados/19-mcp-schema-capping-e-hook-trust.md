# Achado 19 — Capping Multi-Passo de Schemas MCP e Hash SHA de Confiança em Hooks

- **Classificação**: **Classe B** (altera schemas JSON de ferramentas MCP expostas ao modelo e bloqueia execução de hooks não confiáveis ou modificados após aprovação).
- **Prioridade no backlog**: #10 (Classe B — **P1**).

## 1. Como o Codex faz

Apesar de o `nycode` já ter importado o truncamento middle-cut de *output* do MCP em 20 KiB (`packages/mcp/src/output-limit.ts:9-48`), o Codex aplica duas proteções complementares na *entrada* e no registro que ainda faltam:

1. **Capping multi-passo de schemas MCP gigantes e colisão de nomes (`codex-rs/tools/src/json_schema/compaction.rs:14-70` e `codex-rs/codex-mcp/src/tools.rs:266-355`)**:
   - Quando um servidor MCP envia um JSON Schema acima de `DEFAULT_COMPACT_TOOL_SCHEMA_BYTES = 5_000` bytes, `compact_large_tool_schema` executa até 4 passes progressivamente mais agressivos até caber no orçamento (`strip_schema_descriptions`, `drop_schema_definitions`, `collapse_deep_schema_objects_from_root`, `prune_schema_compositions`).
   - `unique_callable_parts` limita nomes combinados em `MAX_TOOL_NAME_LENGTH = 128` com sufixo SHA-1 determinístico de 12 chars em caso de truncamento/colisão.

2. **Hash criptográfico de declaração + conteúdo de plugin em Hooks (`codex-rs/hooks/src/engine/discovery.rs:833-893`)**:
   - Calcula `declaration_hash` do grupo/comando e `plugin_content_hash` do diretório do plugin (`{declaration_hash}/{hash}`).
   - Só habilita hooks não gerenciados se o hash atual casar exatamente com o hash aprovado (`HookTrustStatus::Trusted`); se o arquivo do hook ou script do plugin mudar no repo (`HookTrustStatus::Modified`), exige nova confiança antes de rodar:

```rust
// codex-rs/hooks/src/engine/discovery.rs:847-893
            let declaration_hash = hook_hash(event_name, matcher, &group, &config);
            // The config writer persists these two approval hashes separately.
            let current_hash = plugin_content_hash.map_or_else(
                || declaration_hash.clone(),
                |hash| format!("{declaration_hash}/{hash}"),
            );
            ...
            let trust_status = if let Some(content_hash) = plugin_content_hash
                && let Some(trust) = plugin_trust.as_ref()
            {
                match trust.matches_hash(content_hash) {
                    Ok(true) => HookTrustStatus::Trusted,
                    Ok(false) => HookTrustStatus::Modified,
                    ...
                }
            } else {
                hook_trust_status(source.is_managed, builtin, &current_hash, trusted_hash)
            };
```

## 2. Como o `nycode` faz

1. **Schema MCP (`packages/mcp/src/input-schema.ts:7-13`)**: `normalizeMcpInputSchema` apenas preenche `type: "object"` e `properties: {}` se ausentes, passando esquemas com 30 KB–150 KB de descrições/definições aninhadas diretamente para a API LLM.
2. **Confiança em Hooks**: o `nycode` possui confiança por projeto (`isProjectApprovedSilently` / `project-trust.ts`), mas uma vez confiado um repositório, se `git pull` alterar `.claude/settings.json` adicionando ou modificando um comando em `PreToolUse` / `SessionStart`, o hook alterado executa sem verificar hash da declaração específica do hook.

## 3. Diferença Concreta

Servidores MCP grandes (ex.: GitHub/Linear/Jira completos) frequentemente trazem schemas enormes que consomem milhares de tokens por definição ou excedem limites de profundidade/tamanho da API de provedores; e a confiança por projeto binária ("confia no diretório inteiro para sempre") não detecta mutação maliciosa pontual de hooks de projeto após `git pull` / checkout de branch externa.

## 4. Benefício e Custo

- **Benefício**: reduz consumo/erros de schema em MCPs pesados (<= 5 KB/tool) mantendo compatibilidade de nome <= 128 chars, e bloqueia execução silenciosa de hooks modificados sem aprovação explícita do hash.
- **Custo em tokens**: zero para MCPs normais (< 5 KB); redução drástica quando MCPs gigantes estavam ativos.
- **Custo em latência**: `< 1 ms` na carga inicial de ferramentas/hooks (SHA-256 síncrono via `node:crypto`).
- **Custo de manutenção**: baixo (~150 linhas divididas entre `packages/mcp` e `extensions/hooks`).

## 5. Riscos e Licença

- **Riscos**:
  - Passar `drop_schema_definitions` ou `strip_schema_descriptions` pode fazer o modelo errar parâmetros opcionais pouco óbvios de um MCP complexo; mitigação: manter limite configurável (`5,000` bytes por padrão) e só aplicar quando exceder o teto, nunca alterando nomes de propriedades de topo.
  - Em hooks locais do próprio desenvolvedor, invalidar hash a cada edição pode gerar atrito: exigir re-aprovação apenas para hooks vindos de `.claude/settings.json` do repositório (nunca bloquear hooks globais em `~/.nycode` ou gerenciados).
- **Licença**: Codex (`Apache-2.0`, `LICENSE:1-201`); funções puras em TypeScript + `node:crypto`.

## 6. Proposta Técnica e Plano de Eval (Obrigatório — Classe B)

- **Arquivos a tocar no `nycode`**:
  - `packages/mcp/src/input-schema.ts`: adicionar `compactMcpInputSchema(schema, maxBytes = 5000)` aplicando os passes progressivos em schemas acima de 5 KB + truncamento com hash SHA determinístico em nomes `> 64`/`> 128` chars no registro `extensions/mcp/`.
  - `packages/coding-agent/src/extensions/hooks/`: calcular hash SHA-256 por hook de projeto em `SessionStart`, comparando contra lista aprovada em `trusted-hooks.json` no diretório do agente; em `-p`/headless ou se modificado sem aprovação, ignorar com aviso explícito (ou confirmar em UI interativa).
- **Testes unitários**:
  - Schema MCP de 25 KB reduzido para `<= 5 KB` preservando `properties` e `required` de topo.
  - Alterar uma letra em comando de hook em `.claude/settings.json` de projeto confiável dispara revalidação / bloqueio seguro.
- **Plano de Eval (Classe B — pareado)**:
  - **Suite**: eval dedicada em `packages/evals` com servidor MCP mock de schemas grandes (> 15 KB/tool) medindo acerto de chamada de tool com e sem compactação de schema (`>= -10 pp`, redução de tokens de schema).
- **Critério de aceite**: `npm run check` verde + economia de tokens em MCPs grandes sem perda de acurácia de argumentos nos testes.
- **Rollback**: configurar `maxSchemaBytes = Infinity` em `input-schema.ts` e fallback de confiança por projeto inteiro em hooks.
