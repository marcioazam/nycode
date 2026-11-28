# Inventario: crates-predict

Cada linha cobre 1 arquivo rastreado em `~/source/oh-my-pi-ref` (`git ls-files`), com categoria, origem em relação ao Pi `v0.9.4`, dono equivalente no `nycode` (ou `sem equivalente`) e nota resumida verificada nos shards. Regras e totais em [../inventario.md](../inventario.md).

| Arquivo | Categoria | Origem | Dono no nycode | Nota |
|---|---|---|---|---|
| `crates/predict/BUILD.bazel` | codigo | omp-novo | sem equivalente | 35L; Regras Bazel (`rust_library` e `rust_test`) para a crate `omp_predict` com dados compilados embutidos (`src/**/*.txt`, `data/*.... |
| `crates/predict/Cargo.toml` | config_ou_dado | omp-novo | sem equivalente | 31L; Manifesto Cargo da crate `omp-predict`, declarando dependências comuns e backends exclusivos de macOS (`candle-core`/`metal`, `... |
| `crates/predict/data/web-prior.bin.zst` | binario | omp-novo | sem equivalente | 0L; Binario, fonte bitmap (.bdf) ou vocabulario de tokenizador (excluido de prosa LLM) |
| `crates/predict/scripts/build-web-prior.ts` | codigo | omp-novo | sem equivalente | 153L; Constrói o prior web `data/web-prior.bin.zst` (formato `PIWP` em CSR delta-codificado + bitmap de dicionário) a partir dos unig... |
| `crates/predict/src/apple/appkit.rs` | codigo | omp-novo | sem equivalente | 237L; Wrapper thread-safe de `NSSpellChecker` sobre thread dedicada com `autoreleasepool` por job, detecção automática de idioma e se... |
| `crates/predict/src/apple/mod.rs` | codigo | omp-novo | sem equivalente | 144L; Motor de predição de palavras via `NSSpellChecker` (somente macOS), filtrando prefixos < 2 chars e rebaixando confiança para pa... |
| `crates/predict/src/lib.rs` | codigo | omp-novo | sem equivalente | 132L; API pública e trait `Predictor` da crate `omp-predict`, despachando entre motores `ngram`, `smollm` e `apple`. |
| `crates/predict/src/ngram/hygiene.rs` | codigo | omp-novo | sem equivalente | 96L; Geração de vizinhos Damerau-1 (`for_each_neighbour`) e deslizes inequívocos de digitação (`for_each_slip`: transposições e dupl... |
| `crates/predict/src/ngram/mod.rs` | codigo | omp-novo | sem equivalente | 198L; Orquestrador do motor n-grama (`NgramPredictor`), documentando a arquitetura, ponto de operação e persistência atômica em `ngra... |
| `crates/predict/src/ngram/model.rs` | codigo | omp-novo | sem equivalente | 904L; Parte 1 do modelo n-grama: hiperparâmetros, cache de sessão, aprendizado ponderado (typed vs paste), dobra/sombreamento de typo... |
| `crates/predict/src/ngram/query.rs` | codigo | omp-novo | sem equivalente | 557L; Ranqueamento sob prefixo: junção ordenada entre seguidores pessoais e CSR web, massa de prefixo com Fenwick/MaxTree, cache loca... |
| `crates/predict/src/ngram/snapshot.rs` | codigo | omp-novo | sem equivalente | 337L; Serialização binária versionada (`PINGRAM\0`) comprimida com zstd e checksum para persistir vocabulário aprendido, bigramas, tr... |
| `crates/predict/src/ngram/structures.rs` | codigo | omp-novo | sem equivalente | 420L; Estruturas compactas do motor n-grama: `FxHasher`, tabela open-addressing `IdTable<V>`, árvore de Fenwick, árvore de segmentos ... |
| `crates/predict/src/ngram/tests.rs` | codigo | omp-novo | sem equivalente | 132L; Testes de integração do motor n-grama cobrindo massa de palavra completa, estabilidade de ghost durante digitação, filtragem de... |
| `crates/predict/src/ngram/text.rs` | codigo | omp-novo | sem equivalente | 188L; Extrai contexto esquerdo de até duas palavras em prosa (`u`, `v`, `<s>` ou `None`) interrompendo a cadeia ao encontrar código, ... |
| `crates/predict/src/ngram/vocab.rs` | codigo | omp-novo | sem equivalente | 192L; Internador de palavras em arena contígua com tabela hash open-addressing, mantendo ids base ordenados por byte para busca binár... |
| `crates/predict/src/ngram/web.rs` | codigo | omp-novo | sem equivalente | 376L; Decodifica uma única vez por processo o artefato zstd `web-prior.bin.zst` com unigramas, bigramas delta-codificados de Norvig e... |
| `crates/predict/src/prose.rs` | codigo | omp-novo | sem equivalente | 502L; Implementa as regras de filtragem prosa vs. código/markup (blocos cercados, backticks, tags/comentários HTML, camelCase, comand... |
| `crates/predict/src/smollm/config.rs` | codigo | omp-novo | sem equivalente | 513L; Define o contrato `Decoder` com truncamento/restauração de KV cache, leitura/validação de `config.json` Llama, tabelas RoPE e c... |
| `crates/predict/src/smollm/cpu.rs` | codigo | omp-novo | sem equivalente | 755L; Decodificador Llama CPU em `Q8_0` com ativações `f32` usando execução SPMD sobre `rayon::broadcast`, barreira spinning/yield, a... |
| `crates/predict/src/smollm/gguf.rs` | codigo | omp-novo | sem equivalente | 475L; Leitor minimalista de GGUF v3 com validação de alinhamento e dimensões, pulando metadados desconhecidos e carregando tensores `... |
| `crates/predict/src/smollm/metal.rs` | codigo | omp-novo | sem equivalente | 420L; Decodificador Llama em Metal via `candle` mantendo pesos `Q8_0` na GPU, alternando entre kernel mat-vec quantizado e batch e us... |
| `crates/predict/src/smollm/mod.rs` | codigo | omp-novo | sem equivalente | 557L; Orquestra o preditor `SmolLM2-135M`: seleção automática Metal/CPU, memória persistente de prompts recentes, janela de contexto ... |
| `crates/predict/src/smollm/preamble.txt` | doc | omp-novo | sem equivalente | 2L; Texto de preâmbulo estático que enquadra o contexto do modelo como mensagem digitada por um engenheiro de software a um assiste... |
| `crates/predict/src/smollm/search.rs` | codigo | omp-novo | sem equivalente | 478L; Busca best-first restrita por prefixo até fronteira de palavra com cálculo conservador de massa consistente `Z` (incluindo pala... |
| `crates/predict/src/smollm/session.rs` | codigo | omp-novo | sem equivalente | 217L; Gerencia o reaproveitamento do maior prefixo comum no KV cache entre head, contexto e caminhos da busca, com snapshots de linha... |
| `crates/predict/src/smollm/tokenizer.rs` | codigo | omp-novo | sem equivalente | 530L; Implementação pura em Rust de tokenizador BPE byte-level compatível com `tokenizer.json` do SmolLM2 (`Digits(individual) + Byte... |
