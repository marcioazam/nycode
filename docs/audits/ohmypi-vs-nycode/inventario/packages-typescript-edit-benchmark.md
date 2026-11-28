# Inventario: packages-typescript-edit-benchmark

Cada linha cobre 1 arquivo rastreado em `~/source/oh-my-pi-ref` (`git ls-files`), com categoria, origem em relação ao Pi `v0.9.4`, dono equivalente no `nycode` (ou `sem equivalente`) e nota resumida verificada nos shards. Regras e totais em [../inventario.md](../inventario.md).

| Arquivo | Categoria | Origem | Dono no nycode | Nota |
|---|---|---|---|---|
| `packages/typescript-edit-benchmark/fixtures.tar.gz` | binario | omp-novo | `packages/evals` | 0L; Binario, fonte bitmap (.bdf) ou vocabulario de tokenizador (excluido de prosa LLM) |
| `packages/typescript-edit-benchmark/package.json` | config_ou_dado | omp-novo | `packages/evals` | 53L; Manifesto do pacote `@oh-my-pi/typescript-edit-benchmark` com scripts de geracao, estatisticas de edicao e dependencias AST/Pre... |
| `packages/typescript-edit-benchmark/src/bun-imports.d.ts` | gerado | omp-novo | `packages/evals` | 4L; Lockfile ou artefato gerado automaticamente (excluido) |
| `packages/typescript-edit-benchmark/src/edit-shape-stats.ts` | codigo | omp-novo | `packages/evals` | 355L; Script CLI que analisa logs JSONL de sessoes reais para medir distribuicao empirica de linhas alteradas, hunks e operacoes em `... |
| `packages/typescript-edit-benchmark/src/formatter.ts` | codigo | omp-novo | `packages/evals` | 69L; Utilitarios Prettier para normalizar formato de fixtures TS/Flow/JSON/Markdown/YAML antes e durante verificacao do benchmark. |
| `packages/typescript-edit-benchmark/src/generate.ts` | codigo | omp-novo | `packages/evals` | 1269L; Primeira parte do gerador de casos do benchmark: planos calibrados pela distribuicao empirica de edicoes, analise de complexida... |
| `packages/typescript-edit-benchmark/src/hunks.ts` | codigo | omp-novo | `packages/evals` | 264L; Maquinario de hunks para geracao de fixtures: extrai placements de diff, mescla regioes proximas, estende contexto ate unicidad... |
| `packages/typescript-edit-benchmark/src/in-process-client.ts` | codigo | omp-novo | `packages/evals` | 231L; Cliente in-process para benchmarks que substitui subprocessos RPC usando `createAgentSession` com `Settings`/`AuthStorage`/`Mod... |
| `packages/typescript-edit-benchmark/src/mutations.ts` | codigo | omp-novo | `packages/evals` | 1599L; Primeira parte do catalogo de mutacoes AST via Babel e `regexp-tree`: operadores binarios/logicos, negacao, incremento, boolean... |
| `packages/typescript-edit-benchmark/src/prompts/identifier-task.md` | prompt | omp-novo | `packages/evals` | 9L; Template Handlebars de prompt para tarefas de correcao de identificador mal soletrado em multiplas ocorrencias. |
| `packages/typescript-edit-benchmark/src/prompts/mutation-task.md` | prompt | omp-novo | `packages/evals` | 85L; Template Handlebars de prompt para tarefas de mutacao pontual/multi-hunk com dica opcional de funcao/regiao e blocos before/after. |
| `packages/typescript-edit-benchmark/src/prompts/structural-task.md` | prompt | omp-novo | `packages/evals` | 37L; Template Handlebars de prompt para mutacoes estruturais descritas em prosa natural mais estado final esperado. |
| `packages/typescript-edit-benchmark/src/shared.ts` | codigo | omp-novo | `packages/evals` | 18L; Helper recursivo ordenado `listFiles` para listar arquivos relativos em diretorios de benchmark. |
| `packages/typescript-edit-benchmark/src/tasks.ts` | codigo | omp-novo | `packages/evals` | 263L; Carregamento, parsing de metadados e validacao estrutural de tarefas de benchmark a partir de diretorios de fixtures. |
| `packages/typescript-edit-benchmark/src/verify.ts` | codigo | omp-novo | `packages/evals` | 338L; Verificador de saidas do benchmark: compara contra expected apos Prettier com `restoreWhitespaceOnlyLineDiffs`, ignora linhas e... |
| `packages/typescript-edit-benchmark/test/hunks.test.ts` | teste | omp-novo | `packages/evals` | 96L; Testa round-trip de hunks no benchmark de edição TypeScript, ancoragem em linhas não vazias, extensão de contexto para unicidad... |
| `packages/typescript-edit-benchmark/test/verify.test.ts` | teste | omp-novo | `packages/evals` | 202L; Testa verificação de arquivos do benchmark de edição: arquivos ausentes/extras, equivalência após formatação, tolerância a linh... |
| `packages/typescript-edit-benchmark/tsconfig.json` | config_ou_dado | omp-novo | `packages/evals` | 7L; Configuracao TypeScript do workspace para `packages/typescript-edit-benchmark`. |
| `packages/typescript-edit-benchmark/tsconfig.publish.json` | config_ou_dado | omp-novo | `packages/evals` | 3L; Configuracao TypeScript de publicacao herdando `tsconfig.json`. |
