# Inventario: sdk-go

Cada linha cobre 1 arquivo rastreado em `~/source/oh-my-pi-ref` (`git ls-files`), com categoria, origem em relação ao Pi `v0.9.4`, dono equivalente no `nycode` (ou `sem equivalente`) e nota resumida verificada nos shards. Regras e totais em [../inventario.md](../inventario.md).

| Arquivo | Categoria | Origem | Dono no nycode | Nota |
|---|---|---|---|---|
| `sdk/go/omp-rpc/README.md` | doc | omp-novo | sem equivalente | 170L; Documentação do SDK Go (omprpc) para o protocolo RPC do omp, detalhando geração de wire.go, negociação v2, PromptAndWait, host ... |
| `sdk/go/omp-rpc/client.go` | codigo | omp-novo | sem equivalente | 624L; Núcleo do cliente RPC em Go: handshake com negociação de protocolo v2 e registro de host tools/URIs, correlação de comandos via... |
| `sdk/go/omp-rpc/client_test.go` | codigo | omp-novo | sem equivalente | 455L; Testes unitários do cliente Go cobrindo degradação de frames inválidos, reassembly e rejeições de chunks v2, PromptAndWait (inc... |
| `sdk/go/omp-rpc/fake_test.go` | codigo | omp-novo | sem equivalente | 190L; Servidor fake em memória sobre io.Pipe e helpers de teste para simular respostas, falhas, negociação v2 e fragmentação em rpc_c... |
| `sdk/go/omp-rpc/frame.go` | codigo | omp-novo | sem equivalente | 144L; Decodificador de sequências rpc_chunk do protocolo RPC v2 com validação estrita de metadados, base64 canônico, limites de 1 MiB... |
| `sdk/go/omp-rpc/go.mod` | codigo | omp-novo | sem equivalente | 3L; Definição do módulo Go github.com/can1357/oh-my-pi/sdk/go/omp-rpc sem dependências externas. |
| `sdk/go/omp-rpc/hosttools.go` | codigo | omp-novo | sem equivalente | 140L; Suporte a host tools no SDK Go: registro via set_host_tools, execução concorrente com recover de pânicos, streaming SendUpdate,... |
| `sdk/go/omp-rpc/hosturis.go` | codigo | omp-novo | sem equivalente | 175L; Suporte a esquemas de URI do host no SDK Go: validação e registro via set_host_uri_schemes, despacho assíncrono de leitura/escr... |
| `sdk/go/omp-rpc/hosturis_test.go` | codigo | omp-novo | sem equivalente | 186L; Testes unitários de HostUri validando leitura, escrita, erros de esquema/operação, supressão de resposta após cancelamento e va... |
| `sdk/go/omp-rpc/process.go` | codigo | omp-novo | sem equivalente | 95L; Gerenciamento do ciclo de vida do processo servidor (pipes stdin/stdout, Wait em background, WaitDelay e fechamento limitado de... |
| `sdk/go/omp-rpc/process_other.go` | codigo | omp-novo | sem equivalente | 27L; Fallback não-Unix para encerramento do processo servidor via Process.Kill. |
| `sdk/go/omp-rpc/process_unix.go` | codigo | omp-novo | sem equivalente | 77L; Isolamento em process group Unix (Setpgid) e teardown escalonado do grupo inteiro (-pgid) com SIGTERM seguido de SIGKILL e sond... |
| `sdk/go/omp-rpc/process_unix_test.go` | codigo | omp-novo | sem equivalente | 81L; Testes Unix comprovando que Close() mata processos filhos órfãos ignorando SIGTERM via SIGKILL no grupo e sai rápido quando o s... |
| `sdk/go/omp-rpc/prompt.go` | codigo | omp-novo | sem equivalente | 248L; Implementa PromptAndWait (correlação por prompt_result, conclusão local, reconstrução de agent_end compactado via message_end) ... |
| `sdk/go/omp-rpc/robustness_test.go` | codigo | omp-novo | sem equivalente | 161L; Testes de robustez concorrente cobrindo desbloqueio de escrita travada em Close, ausência de vazamento de goroutines em falha d... |
| `sdk/go/omp-rpc/runtime.go` | codigo | omp-novo | sem equivalente | 344L; Runtime do SDK Go de RPC da OMP: define a interface Transport e wrapper Commands, UnknownNotification para frames desconhecidos... |
| `sdk/go/omp-rpc/smoke_test.go` | codigo | omp-novo | sem equivalente | 410L; Testes de fumaça em Go contra servidor OMP real via bun (--mode rpc): TestSmoke valida ready/v2, get_state, get_available_comma... |
| `sdk/go/omp-rpc/wire.go` | codigo | omp-novo | sem equivalente | 8838L; Início do código gerado por `bun run gen:rpc`: enums básicos (Attribution, StopReason), blocos de conteúdo (Text, Thinking com ... |
| `sdk/go/omp-rpc/wire_test.go` | codigo | omp-novo | sem equivalente | 327L; Testes unitários do codec RPC em Go cobrindo UnknownNotification com preservação verbatim do frame, roteamento em uniões aninha... |
