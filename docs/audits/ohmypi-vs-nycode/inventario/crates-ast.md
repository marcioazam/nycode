# Inventario: crates-ast

Cada linha cobre 1 arquivo rastreado em `~/source/oh-my-pi-ref` (`git ls-files`), com categoria, origem em relação ao Pi `v0.9.4`, dono equivalente no `nycode` (ou `sem equivalente`) e nota resumida verificada nos shards. Regras e totais em [../inventario.md](../inventario.md).

| Arquivo | Categoria | Origem | Dono no nycode | Nota |
|---|---|---|---|---|
| `crates/ast/BUILD.bazel` | codigo | omp-novo | sem equivalente | 37L; Alvos Bazel `rust_library` (`omp_ast` com feature `wasm` ativa) e `rust_test` com `ini.wasm` empacotado para testes. |
| `crates/ast/Cargo.toml` | config_ou_dado | omp-novo | sem equivalente | 61L; Manifesto do crate `omp-ast` com 17 gramáticas tree-sitter linkadas estaticamente, feature `wasm` opcional para gramáticas dinâ... |
| `crates/ast/LICENSE` | codigo | omp-novo | sem equivalente | 22L; Licença MIT do crate `omp-ast`. |
| `crates/ast/src/block.rs` | codigo | omp-novo | sem equivalente | 1578L; Implementação completa do resolvedor de blocos AST via tree-sitter para edição `replace block N:`, cadeia de nós por linha e cá... |
| `crates/ast/src/debug.rs` | codigo | omp-novo | sem equivalente | 139L; Utilitários de depuração `--debug-query` do `ast-grep` para imprimir árvores tree-sitter (`ast`/`cst`), S-expressions e árvores... |
| `crates/ast/src/language/grammar.rs` | codigo | omp-novo | sem equivalente | 379L; Gerenciamento híbrido de gramáticas nativas e WebAssembly sob demanda, com cache em processo (`OnceLock`), `WasmStore` por thre... |
| `crates/ast/src/language/mod.rs` | codigo | omp-novo | sem equivalente | 968L; Definições de ~57 linguagens suportadas pelo `ast-grep` (nativas e WASM), suporte a `expando_char` para linguagens que rejeitam... |
| `crates/ast/src/language/parsers.rs` | codigo | omp-novo | sem equivalente | 59L; Funções wrapper que expõem as 19 gramáticas tree-sitter linkadas nativamente no addon. |
| `crates/ast/src/language/testdata/ini.wasm` | binario | omp-novo | sem equivalente | 0L; Binario, fonte bitmap (.bdf) ou vocabulario de tokenizador (excluido de prosa LLM) |
| `crates/ast/src/language/wasm_grammars.rs` | codigo | omp-novo | sem equivalente | 361L; Tabela gerada de metadados (`symbol`, nome de arquivo, SHA-256 e tamanho) de ~38 gramáticas WebAssembly publicadas em `stencil-... |
| `crates/ast/src/lib.rs` | codigo | omp-novo | sem equivalente | 16L; Raiz pública da crate `omp-ast`, reexportando módulos de AST e `SupportLang`. |
| `crates/ast/src/ops.rs` | codigo | omp-novo | sem equivalente | 319L; Resolução de linguagem, compilação de padrões `ast-grep` (com auto-wrapping de fragmentos `MultipleNode` e citação de metavariá... |
| `crates/ast/src/outline.rs` | codigo | omp-novo | sem equivalente | 543L; Extrator de outline estrutural via tree-sitter que coleta itens de topo e membros diretos, desembrulha `export`/decoradores/tem... |
| `crates/ast/src/parse_cache.rs` | codigo | omp-novo | sem equivalente | 1194L; Cache LRU de árvores tree-sitter limitado por custo estimado em memória (`MAX_RETAINED_BYTES = 64 MiB`, `MAX_ENTRIES = 12`), co... |
| `crates/ast/src/search/mod.rs` | codigo | omp-novo | sem equivalente | 1518L; API pública de descoberta, busca estrutural em streaming/paginada (`Finder`, `find_page`, `find_source`) e definição de tipos d... |
| `crates/ast/src/search/tests.rs` | codigo | omp-novo | sem equivalente | 512L; Testes de busca e rewrite estrutural cobrindo tokens ausentes, avisos de padrão `ERROR`, atomicidade de escrita, sobreposições,... |
| `crates/ast/src/summary.rs` | codigo | omp-novo | sem equivalente | 1477L; Implementação da sumarização estrutural AST (`summarize_code`): coleta hierárquica de spans elidíveis (corpos, literais, coment... |
| `crates/ast/src/testing.rs` | codigo | omp-novo | sem equivalente | 167L; Provedor `FileSystem` em memória (`mem://`) exclusivo para testes de busca e rewrite sobre URLs virtuais no `omp-vfs`. |
