# Achado 05 — Cache do Índice BM25 no `tool_search`

- **Classificação**: **Classe A** (0 tokens extras, zero mudança no comportamento/ranking/schema do modelo, sem dependência nativa).
- **Prioridade no backlog**: #5 (Classe A).

## 1. Como o Codex faz

Em `codex-rs/core/src/tools/handlers/tool_search.rs:50-120`, o Codex envolve o `ToolSearchHandler` em `ToolSearchHandlerCache`, guardando um snapshot das fontes (`Weak<dyn CoreToolRuntime>` para tools imutáveis + `Box<ToolSearchInfo>` para dinâmicos). Se os ponteiros/descritores não mudaram entre chamadas (`sources_match`), retorna o índice BM25 (`search_embedder` + `search_scorer`) já construído em O(1):

```rust
// codex-rs/core/src/tools/handlers/tool_search.rs:51-94
pub(crate) struct ToolSearchHandlerCache {
    cached: Mutex<Option<CachedToolSearchHandler>>,
}
...
        {
            let cached = self.cached();
            if let Some(cached) = cached.as_ref()
                && cached.handler.source_listing == source_listing
                && Self::sources_match(&cached.sources, &sources)
            {
                return Arc::clone(&cached.handler);
            }
        }
```

## 2. Como o `nycode` faz

Em `packages/coding-agent/src/extensions/tool-search/tool.ts:300-314` e `222-226`, toda execução da ferramenta `tool_search` reconstrói do zero os documentos, re-tokeniza todas as descrições de ferramentas MCP/deferred e recalcula IDF + `averageLength`:

```ts
// packages/coding-agent/src/extensions/tool-search/tool.ts:300-310
function searchAndLoad(
   tools: NonNullable<ToolSearchToolOptions["tools"]>,
   query: string,
   limit: number,
): ToolSearchResultTool[] {
   const active = tools.getActiveTools();
   const candidates = tools.getAllTools().filter((tool) => isSearchable(tool.exposure) && !active.includes(tool.name));
   const documents = candidates.map((tool) => createToolSearchDocument(tool, tool.namespace));
   const matches = new Bm25Ranker().rank(query, documents, limit);
   if (matches.length > 0) tools.setActiveTools([...active, ...matches.map((match) => match.name)]);
```

## 3. Diferença Concreta

Quando há muitos servidores MCP conectados (ex.: 100–300 tools deferidas com descrições extensas), cada chamada a `tool_search` no `nycode` repete regex/tokenização e criação de `Map`s para todo o corpus, mesmo que o catálogo de candidatos só mude quando uma ferramenta é ativada ou um servidor MCP reconecta.

## 4. Benefício e Custo

- **Benefício**: reduz CPU e alocação em consultas repetidas de `tool_search` mantendo exatamente o mesmo algoritmo Okapi BM25, desempate e resultados idênticos bit a bit.
- **Custo em tokens**: `0` tokens por turno.
- **Custo em latência**: evita recomputar tokenização/IDF em cache hit.
- **Custo de manutenção**: muito baixo (~30 linhas encapsulando `PreparedBm25Index` dentro de `tool-search/tool.ts`).

## 5. Riscos e Licença

- **Riscos**: cache stale se um plugin/MCP alterar descrição sem alterar nome; mitigável validando assinatura rápida (`length` + pares `(tool, tool.description, tool.namespace?.name)` comparados por referência/comprimento ou string concatenada simples).
- **Licença**: Codex é `Apache-2.0` (`LICENSE:1-201`). Memoização padrão em TypeScript sem dependência externa.

## 6. Proposta Técnica e Critérios

- **Arquivos a tocar no `nycode`**:
  - `packages/coding-agent/src/extensions/tool-search/tool.ts`: adicionar `prepareIndex(documents)` ou cache em `Bm25Ranker` / `searchAndLoad` invalidado automaticamente quando o array de candidatos (nomes + referências de descrição/namespace) mudar.
- **Testes unitários**:
  - Verificar em `packages/coding-agent/test/` que duas buscas consecutivas com o mesmo catálogo retornam resultados idênticos sem reconstruir o índice (contador/spy ou invariância) e que após ativação de uma ferramenta (que muda `candidates`) ou alteração de descrição o cache invalida corretamente.
- **Plano de eval**: não aplicável (Classe A; saída observável pelo modelo é 100% idêntica).
- **Critério de aceite**: `npm run check` limpo + suíte existente de `tool-search` passando sem regressão.
- **Rollback**: remover camada de memoização em `searchAndLoad`.
