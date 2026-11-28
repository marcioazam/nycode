# Inventario: sdk-python

Cada linha cobre 1 arquivo rastreado em `~/source/oh-my-pi-ref` (`git ls-files`), com categoria, origem em relação ao Pi `v0.9.4`, dono equivalente no `nycode` (ou `sem equivalente`) e nota resumida verificada nos shards. Regras e totais em [../inventario.md](../inventario.md).

| Arquivo | Categoria | Origem | Dono no nycode | Nota |
|---|---|---|---|---|
| `sdk/python/omp-rpc/LICENSE` | codigo | omp-novo | sem equivalente | 21L; Arquivo de licença MIT (Copyright 2026 Stencil Labs, Inc.) do pacote SDK Python `omp-rpc`. |
| `sdk/python/omp-rpc/README.md` | doc | omp-novo | sem equivalente | 535L; Documentacao do SDK Python omp-rpc descrevendo geracao de wire schema, ciclo de vida prompt_result vs session_settled, filtrage... |
| `sdk/python/omp-rpc/pyproject.toml` | config_ou_dado | omp-novo | sem equivalente | 37L; Manifesto de empacotamento setuptools do pacote Python omp-rpc (Python >=3.11, py.typed). |
| `sdk/python/omp-rpc/src/omp_rpc/__init__.py` | codigo | omp-novo | sem equivalente | 102L; Ponto de entrada do pacote omp_rpc reexportando tipos gerados de _wire, cliente, helpers de host tools/URIs e utilitarios de te... |
| `sdk/python/omp-rpc/src/omp_rpc/_extension_ui.py` | codigo | omp-novo | sem equivalente | 41L; Classifica metodos de extension_ui_request entre passivos, interativos e baseados em texto via mixin compartilhado. |
| `sdk/python/omp-rpc/src/omp_rpc/_wire.py` | codigo | omp-novo | sem equivalente | 4579L; Tipos gerados do protocolo wire (enums literais, TypedDicts de mensagens/eventos de streaming e dataclasses iniciais como Sessi... |
| `sdk/python/omp-rpc/src/omp_rpc/_wire_runtime.py` | codigo | omp-novo | sem equivalente | 180L; Primitivas de decodificacao compostas por _wire.py, com validacao de caminho de erro, open records tolerantes, fallbacks para s... |
| `sdk/python/omp-rpc/src/omp_rpc/client.py` | codigo | omp-novo | sem equivalente | 2210L; Decodificador de chunks v2, encerramento por PGID com rastreio de sobreviventes, excecoes RPC, coordenador single-flight e inic... |
| `sdk/python/omp-rpc/src/omp_rpc/host_tools.py` | codigo | omp-novo | sem equivalente | 88L; Definicao e contexto de execucao para ferramentas customizadas do host Python, com suporte a streaming updates, cancelamento, d... |
| `sdk/python/omp-rpc/src/omp_rpc/host_uris.py` | codigo | omp-novo | sem equivalente | 126L; Definicao de esquemas URI virtuais servidos pelo host Python via operacoes read/write com suporte a cancelamento, contentType e... |
| `sdk/python/omp-rpc/src/omp_rpc/protocol.py` | codigo | omp-novo | sem equivalente | 78L; Helpers para carregar imagens em base64 e extrair texto visivel (ou com thinking opcional) de mensagens do protocolo. |
| `sdk/python/omp-rpc/src/omp_rpc/py.typed` | codigo | omp-novo | sem equivalente | 1L; Marcador PEP 561 indicando que o pacote omp_rpc fornece tipagem estatica. |
| `sdk/python/omp-rpc/tests/__init__.py` | teste | omp-novo | sem equivalente | 6L; Inicialização do pacote de testes do SDK Python omp-rpc adicionando src/ ao sys.path. |
| `sdk/python/omp-rpc/tests/test_client.py` | teste | omp-novo | sem equivalente | 2565L; Infraestrutura de servidores falsos RPC e primeira parte dos testes de RpcClient (UI ask/form/headless, handoff/cycle_model nul... |
| `sdk/python/omp-rpc/tests/test_host_uris.py` | teste | omp-novo | sem equivalente | 254L; Testes unitários e de ponte RPC para host URIs em Python: normalização de esquemas e resultados de leitura (`contentType`, `not... |
| `sdk/python/omp-rpc/tests/test_protocol.py` | teste | omp-novo | sem equivalente | 804L; Testes de parsing e validação do protocolo RPC em Python cobrindo `SessionState` (`goal`, `usageLimit`, `fastMode*`, `slowMode*... |
| `sdk/python/omp-rpc/tests/test_user_group.py` | teste | omp-novo | sem equivalente | 47L; Testes unitários em pytest verificando o repasse dos argumentos `user`, `group` e `extra_groups` (distinguindo `None` de lista ... |
| `sdk/python/omp-rpc/uv.lock` | gerado | omp-novo | sem equivalente | 8L; Lockfile ou artefato gerado automaticamente (excluido) |
