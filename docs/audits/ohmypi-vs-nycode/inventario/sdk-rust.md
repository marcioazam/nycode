# Inventario: sdk-rust

Cada linha cobre 1 arquivo rastreado em `~/source/oh-my-pi-ref` (`git ls-files`), com categoria, origem em relação ao Pi `v0.9.4`, dono equivalente no `nycode` (ou `sem equivalente`) e nota resumida verificada nos shards. Regras e totais em [../inventario.md](../inventario.md).

| Arquivo | Categoria | Origem | Dono no nycode | Nota |
|---|---|---|---|---|
| `sdk/rust/omp-rpc/.gitignore` | codigo | omp-novo | sem equivalente | 1L; Ignora o diretorio /target da crate Rust omp-rpc. |
| `sdk/rust/omp-rpc/Cargo.lock` | gerado | omp-novo | sem equivalente | 114L; Lockfile ou artefato gerado automaticamente (excluido) |
| `sdk/rust/omp-rpc/Cargo.toml` | config_ou_dado | omp-novo | sem equivalente | 20L; Manifesto Cargo da crate standalone omp-rpc (edition 2024, serde, serde_json, libc em Unix). |
| `sdk/rust/omp-rpc/README.md` | doc | omp-novo | sem equivalente | 120L; Documentacao do SDK Rust omp-rpc cobrindo tipos gerados em wire.rs, protocolo v2, writer thread, teardown de PGID, prompt_and_w... |
| `sdk/rust/omp-rpc/src/client.rs` | codigo | omp-novo | sem equivalente | 1176L; Nucleo compartilhado do cliente RPC em Rust com writer thread isolada, guards atomicos de cancelamento na fila de escrita, desp... |
| `sdk/rust/omp-rpc/src/frame.rs` | codigo | omp-novo | sem equivalente | 199L; Decodificador de frames e reassembly de rpc_chunk do protocolo v2 em Rust com validacao estrita de base64 canonico e testes uni... |
| `sdk/rust/omp-rpc/src/host_tool.rs` | codigo | omp-novo | sem equivalente | 188L; Define HostTool e HostToolContext para ferramentas executadas no processo host via RPC (set_host_tools/host_tool_call), com sup... |
| `sdk/rust/omp-rpc/src/host_uri.rs` | codigo | omp-novo | sem equivalente | 183L; Define HostUri e HostUriContext para esquemas <scheme>:// de propriedade do host servidos via RPC (set_host_uri_schemes/host_ur... |
| `sdk/rust/omp-rpc/src/lib.rs` | codigo | omp-novo | sem equivalente | 20L; Raiz da crate omp-rpc (cliente Rust bloqueante sobre JSONL stdio de omp --mode rpc) que declara módulos e reexporta a API públi... |
| `sdk/rust/omp-rpc/src/turn.rs` | codigo | omp-novo | sem equivalente | 122L; Agrega eventos, mensagens e resposta final de um prompt em PromptTurn, incluindo complete_agent_end_messages para recompor o pr... |
| `sdk/rust/omp-rpc/src/wire.rs` | codigo | omp-novo | sem equivalente | 7650L; Código gerado (gen:rpc): trait Command, helpers de serialização/desserialização aberta (take, serialize_tagged, OrUnknown), enu... |
| `sdk/rust/omp-rpc/tests/smoke.rs` | teste | omp-novo | sem equivalente | 395L; Testes smoke ignorados por padrão do SDK Rust `omp-rpc` contra o servidor real `omp --mode rpc` e o servidor OpenAI scriptado (... |
| `sdk/rust/omp-rpc/tests/transport.rs` | teste | omp-novo | sem equivalente | 1126L; Testes de transporte em memória (pipes) do SDK Rust `omp-rpc`: decodificação/remontagem de `rpc_chunk` (incluindo rejeição fata... |
| `sdk/rust/omp-rpc/tests/wire.rs` | teste | omp-novo | sem equivalente | 202L; Testes de serialização e desserialização de fio (`serde_json`) do SDK Rust `omp-rpc`: preservação de JSON bruto em `Unknown`, r... |
