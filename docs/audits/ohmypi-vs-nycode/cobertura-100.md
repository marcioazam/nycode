# Cobertura 100% — Leitura linha a linha e comparação bidirecional (`omp v19.2.1` <-> `nycode`)

Reconciliação auditável de **100%** dos arquivos rastreados do `omp` (`11.788` em `git ls-files`), **100%** dos arquivos legíveis do `omp` (`11.484` arquivos / `3.756.519` linhas) e do `nycode` (`1.674` arquivos legíveis / `349.281` linhas em `packages/*/src` e `packages/coding-agent/resources`), lidos de ponta a ponta em **481/481** shards verificados por prova cega (`7.010` bundles `<= 740` linhas), além da comparação bidirecional de todos os subdiretórios, pacotes, crates e extensões.

## Tabela 1 — Reconciliação integral de arquivos, linhas e shards (100%)

| Origem / Bucket | Arquivos | Linhas | Tamanho (MB) | Escopo de leitura LLM | Prova |
|---|---:|---:|---:|---|---|
| `omp`: `1_vendor` (`crates/vendor/*`, terceirizados `/vendor/`) | 182 | 129851 | 3.60 | Excluído de leitura/adoção (inventariado) | `inventario.md` (`304` excl.) |
| `omp`: `2_generated_lock` (`Cargo.lock`, `bun.lock`, `*.generated.*`, `*.d.ts`) | 31 | 35220 | 4.63 | Excluído de leitura (inventariado) | `inventario.md` (`304` excl.) |
| `omp`: `3_binary_fonts_vocabs` (binários, `.bdf`, `.tiktoken`, `tools/cache/*`) | 91 | 890533 | 76.39 | Excluído de prosa LLM (inventariado c/ SHA-256) | `inventario.md` (`304` excl.) |
| `omp`: `4_static_tables_schemas` (tabelas JSON/schema) | 11 | 14585 | 2.07 | **Lido 100%** em bundles `<= 740` linhas | `481/481` shards ok |
| `omp`: `5_omp_own_code_prompts_docs_cfg` (código, prompts, docs, configs) | 5834 | 1820343 | 67.38 | **Lido 100%** em shards blind-verificados | `481/481` shards ok |
| `omp`: `6_ported_bash_vm_and_gnu_builtins` (`crates/shell`, `crates/builtins`) | 929 | 668723 | 21.09 | **Lido 100%** em shards blind-verificados | `481/481` shards ok |
| `omp`: `7_tests_fixtures_benches` (testes, fixtures, benchmarks) | 4710 | 1252868 | 47.95 | **Lido 100%** em `stage6_tests` | `481/481` shards ok |
| **Subtotal `omp` lido (buckets 4..7)** | **11484** | **3756519** | — | **100,00% dos arquivos legíveis** | **`441/441` shards `omp`** |
| **Total `omp` (`git ls-files`)** | **11788** | **4812123** | — | **100,00% inventariado** | **[inventario.md](inventario.md)** |
| `nycode`: `packages/*/src` + `resources` | 1675 (1674 texto + 1 bin.) | 349281 | — | **100%** dos arquivos de texto lidos | **`40/40` shards `stage5`** |
| **Total lido nos shards (`omp` + `nycode`)** | **13158** | **4105800** | — | **7.010 bundles sem perda** | **`481/481` (`100%` ok)** |

## Tabela 2 — `omp:packages/coding-agent/src/*` (`84` subdiretórios + raiz)

| Subdiretório (`omp:packages/coding-agent/src/`) | Arquivos | Linhas | Dono no `nycode` | Veredito (`Achado` / `R`) | Resumo verificado |
|---|---:|---:|---|---|---|
| `(root)` | 15 | 14798 | `packages/coding-agent/src/core/telemetry.ts`, `packages/coding-agent/src/cli` | [Achado 01](achados/01-isolar-cwd-e-contexto-do-prefixo-cacheado.md), [Achado 05](achados/05-dedup-de-contexto-e-prazo-no-system-prompt.md), [Achado 20](achados/20-ofuscacao-de-segredos-no-contexto.md), [R13](rejeitados.md) | Tabela declarativa de subcomandos CLI com carregamento dinâmico, proteção contra vazamento de verbos de plugin/marketplace para prompts ao L |
| `activity` | 1 | 499 | sem equivalente | [R29](rejeitados.md) | Índice reativo `AgentActivityIndex` que faz tail incremental (últimos 256KB) de transcrições locais e remotas, trata rotações/truncamentos, |
| `advisor` | 15 | 4342 | `packages/coding-agent/src/extensions/claude-compat/commands/agents/advisor.ts` | [R06](rejeitados.md) | Implementa a tool `advise` usada pelo agente advisor, incluindo retenção e flush determinístico de notas não-blocker durante turnos em andam |
| `archive` | 6 | 1551 | sem equivalente | [R15](rejeitados.md) | Views de atividade do prelúdio `archive` (`calls`, `grep`, `stats`, `messages`) que filtram sessões e subagentes por metadados e delegam var |
| `async` | 6 | 2664 | sem equivalente | [Achado 15](achados/15-subagentes-resultado-tipado-e-isolated-por-chamada.md), [R29](rejeitados.md) | Helpers de espera em primeiro plano para auto-backgrounding: calcula orçamento com margem de 1s antes do timeout e faz corrida contra timer |
| `auto-graph` | 4 | 12506 | sem equivalente | [R25](rejeitados.md) | Define o modelo completo de ChartPlan/ChartSpec/ChartAnnotation para 22 tipos de graficos, heuristicas de direcao/escala, ponto de entrada p |
| `auto-parallel` | 1 | 185 | sem equivalente | [R20](rejeitados.md) | Planejador de paralelização automática (`task.autoParallel`): segmenta o pedido preservando blocos de código e listas aninhadas (`segmentReq |
| `auto-prewalk` | 1 | 134 | sem equivalente | [R20](rejeitados.md) | Classificador de adequação a prewalk (`prewalk.auto`): consulta exclusivamente o judge nativo com probabilidades calibradas sobre o pedido e |
| `auto-thinking` | 1 | 197 | sem equivalente | [R20](rejeitados.md) | Classificador de dificuldade por turno para thinking `auto`: filtra níveis suportados pelo modelo alvo, short-circuita quando há <=1 tier el |
| `autocomplete` | 7 | 3765 | `packages/coding-agent` | [R29](rejeitados.md) | Contratos de autocomplete (incluindo caminhos síncronos, `onPartial`, `getInlineHint` e `trySyncInlineReplace`), ranking de slash commands c |
| `autolearn` | 3 | 457 | `packages/coding-agent/src/extensions/memory` | [R05](rejeitados.md) | Controlador de auto-aprendizagem por sessão que injeta orientação estável no system prompt condicionada às tools presentes (`manage_skill`, |
| `autoresearch` | 17 | 3784 | sem equivalente | [R27](rejeitados.md) | Template de mensagem de usuário enviada ao retomar uma sessão ativa de autoresearch via comando `/autoresearch`. |
| `binja` | 5 | 1541 | sem equivalente | [R24](rejeitados.md) | Barrel file que reexporta módulos `install`, `runtime` e `settings` do backend Binary Ninja. |
| `blob-broker` | 25 | 9011 | sem equivalente | [R26](rejeitados.md) | Backend local do blob-broker para publicar imagens via servidor HTTP + túnel ou uploaders externos com URLs estáveis por hash, render lazy, |
| `capability` | 18 | 2209 | sem equivalente | [R30](rejeitados.md) | Define a capability `context-files` (`CLAUDE.md`, `AGENTS.md`, etc.) deduplicada por escopo (`user` ou `project:<depth>`), permitindo `addit |
| `cleanse` | 12 | 3712 | sem equivalente | [R22](rejeitados.md) | Cria a sessão persistida de `cleanse`, segura LSP compartilhado (`holdSharedLsp`), executa o subagente estruturado de descoberta de checkers |
| `cli` | 96 | 30842 | `packages/coding-agent/src/cli`, `packages/coding-agent/src/cli/args.ts` | [Achado 26](achados/26-reparse-flags-extensao-limites-file-e-bugreport.md) | Implementa `omp agents unpack` para serializar agentes embutidos em arquivos Markdown com frontmatter YAML no diretório do usuário, projeto |
| `collab` | 10 | 5357 | sem equivalente | [R23](rejeitados.md) | Controla o ciclo de vida de hospedagem Collab no processo interativo: `/collab`, política `collab.autoStart`, rotação de sala e geração em t |
| `commands` | 56 | 4104 | `packages/coding-agent/src/cli` | [Achado 26](achados/26-reparse-flags-extensao-limites-file-e-bugreport.md), [R30](rejeitados.md) | Subcomando oclif-like `omp acp` que força `mode = "acp"` (exceto quando terminal-auth pede TUI) e delega a `runRootCommand`. |
| `commit` | 73 | 11454 | sem equivalente | [Achado 22](achados/22-omp-commit-seletivo-e-conflitos.md) | Executor da sessão agêntica de commit: cria sessão restrita sem LSP/MCP/descoberta, exibe progresso streaming/markdown em stdout e força con |
| `compress` | 7 | 783 | sem equivalente | [R12](rejeitados.md) | Orquestrador CLI de `omp compress`: resolve alvos/globs, executa compressão concorrente em sessões isoladas no loop rewrite→review→approve c |
| `config` | 42 | 22251 | `packages/coding-agent/src/core`, `packages/coding-agent/src/core/keybindings.ts` | [Achado 04](achados/04-modelos-por-path-em-enabled-models.md), [R09](rejeitados.md) | Valida task.agentAccountPools e implementa SessionAccountPoolScope, que envolve ModelRegistry em Proxy para restringir sessoes a pools de id |
| `daemon` | 23 | 10231 | sem equivalente | [R23](rejeitados.md) | Calcula a identidade de build `VERSION+<stamp>` usando mtime e tamanho do binário ou entrypoint + addons `.node` para ordenar upgrades do da |
| `dap` | 6 | 4276 | sem equivalente | [Achado 23](achados/23-dap-debug-tool-e-leitores-estruturados.md) | Primeira metade do cliente DAP de baixo nivel: spawn via stdio (detached), unix socket, TCP (com reserva de porta e gate de banner) e client |
| `debug` | 6 | 1907 | sem equivalente | [R29](rejeitados.md) | Menu interativo `/debug` e orquestrador `DebugTools`: profiling de CPU e work scheduling, dump/memória, visualizadores de logs e SSE bruto, |
| `disasm` | 15 | 2978 | sem equivalente | [R24](rejeitados.md) | Configuração derivada `cfgDisasmBackend` que resolve o backend de desmontagem ativo (`ida`, `ghidra` ou `binja`) conforme preferência do usu |
| `discovery` | 57 | 11210 | `packages/coding-agent/src/core/resource-loader.ts` | [R24](rejeitados.md) | Validacao e parsing puros para o padrao Agent Plugins 1.0.0: schema fechado de plugin.json, frontmatter fechado de SKILL.md (skills-ref/NFKC |
| `downloads` | 3 | 442 | sem equivalente | [R15](rejeitados.md) | Registro global de atividades de download/instalação/otimização: pub/sub com coalescência de progresso em bytes (100ms), atualização imediat |
| `edit` | 19 | 3519 | `packages/coding-agent/src/core/tools/edit.ts` | [Achado 13](achados/13-hashline-edit-e-benchmark-de-edicao.md), [Achado 14](achados/14-guarda-de-loop-repetitivo-e-edicao-em-stream.md) | Template de prompt para o modelo smol corrigir apenas o erro de sintaxe introduzido entre BEFORE e AFTER, incluindo suporte a feedback da te |
| `eval` | 64 | 21612 | `packages/coding-agent/src/extensions/codemode` | [R03](rejeitados.md) | Ponte no host para agent() do eval: valida argumentos e orçamento do turno, instancia ferramentas customizadas de eval, agenda subagente est |
| `exa` | 3 | 420 | sem equivalente | [Achado 18](achados/18-web-search-api-first-e-content-negotiation.md), [R30](rejeitados.md) | Barrel file reexportando `mcp-client` e `types` da integração Exa. |
| `exec` | 11 | 3370 | sem equivalente | [Achado 09](achados/09-minimizador-de-saida-de-bash-em-ts.md), [R30](rejeitados.md) | Infraestrutura do executor bash: `applyDirenvPreflight` (mescla `direnv` + `unset -v`), retenção de instâncias `Shell` com jobs em backgroun |
| `export` | 14 | 6050 | sem equivalente | [R29](rejeitados.md) | Carregador de script customizado de compartilhamento (`share.ts`/`.js`/`.mjs` no diretório do agente) validado para importação no Bun e usad |
| `extensibility` | 93 | 28085 | `packages/coding-agent/src/core/extensions` | [Achado 28](achados/28-timeouts-limitados-em-extensoes-managed-timers-e-fail-closed-tool-call.md) | Modelos de dados do recurso `/annotate` para revisão de diffs e textos, notas por arquivo/linha/texto e rascunhos do overlay. |
| `ghidra` | 6 | 1500 | sem equivalente | [R24](rejeitados.md) | Arquivo barril que reexporta instalação, plataforma, runtime e configurações do backend Ghidra. |
| `goals` | 5 | 779 | `packages/coding-agent/src/extensions/goal` | [Achado 16](achados/16-guided-goal-e-orcamento-de-tokens-no-goal.md), [R04](rejeitados.md) | Barrel de re-exportacao do modulo de goals (`runtime`, `state`, `tools/goal-tool`). |
| `hindsight` | 12 | 3796 | `packages/coding-agent/src/extensions/memory` | [R05](rejeitados.md) | Backend de memória Hindsight integrado ao ciclo de vida de `AgentSession`: aliasing de subagentes para o estado pai, montagem ordenada de in |
| `ida` | 5 | 1140 | sem equivalente | [R24](rejeitados.md) | Barrel que reexporta detecção de instalação, resolução de runtime e settings do subsistema IDA Pro. |
| `if-bench` | 8 | 1113 | sem equivalente | [R22](rejeitados.md) | Máquina determinística de array de caracteres do `omp if-bench`: inicializa permutação por LCG e gera/aplica 10 tipos de ações codificadas e |
| `internal-urls` | 35 | 9981 | sem equivalente | [R13](rejeitados.md) | Handler do esquema agent://: resolve saídas .md/.json (com extração por JSON-path), exibe progresso de agentes ativos (yields + último texto |
| `irc` | 6 | 1129 | sem equivalente | [R23](rejeitados.md) | Barramento global de mensagens entre agentes (`IrcBus`): entrega fire-and-forget com resolução de waiters, buffer de mailbox apenas em falha |
| `job-widgets` | 11 | 2929 | sem equivalente | [R29](rejeitados.md) | Autor de specs de job widgets usando o role `widget`/`smol`: redige credenciais, deduplica linhas repetitivas por shape (`MAX_SHAPE_REPEATS= |
| `jsonrpc` | 1 | 198 | sem equivalente | [Achado 21](achados/21-rpc-v2-framing-delta-e-acp.md), [R30](rejeitados.md) | Codec incremental de framing `Content-Length` JSON-RPC para LSP e DAP com buffering em lista de chunks, limites de tamanho, resincronização |
| `judgment` | 3 | 1380 | `packages/coding-agent/src/extensions/goal/evaluator-model.ts` | [R20](rejeitados.md) | Cache SQLite local para julgamentos nativos System One, armazenando estados canônicos (incluindo SHA-256 de imagens), respostas individuais |
| `launch` | 4 | 761 | sem equivalente | [R23](rejeitados.md) | Implementa o comando interno `o2ctl services` (`add`, `ls`, `stop`) no shell embutido, permitindo adotar processos já em execução via PID ou |
| `lib` | 1 | 5 | sem equivalente | [R30](rejeitados.md) | Define a interface mínima `XAIHttpTransport` com `baseURL` e headers opcionais para requisições HTTP de ferramentas xAI. |
| `live` | 9 | 1678 | sem equivalente | [R24](rejeitados.md), [R28](rejeitados.md) | Gera o envelope CBOR/base64url de atestação DeviceCheck no macOS arm64 (`x-oai-attestation`) para chamadas WebRTC live autenticadas com Chat |
| `lsp` | 27 | 12483 | `packages/coding-agent/src/extensions/lsp` | [Achado 11](achados/11-lsp-pos-escrita-ledger-versao-e-defaults.md) | Coordena o batching de diagnósticos LSP entre múltiplas chamadas edit/write dentro da mesma resposta do modelo, sinalizando flush apenas na |
| `markit` | 9 | 862 | sem equivalente | [R30](rejeitados.md) | Aviso de licença MIT e atribuição ao projeto `markit-ai` para a engine de conversão de documentos (excluindo o conversor PDF próprio). |
| `mcp` | 39 | 16803 | `packages/coding-agent/src/extensions/mcp` | [Achado 07](achados/07-tabela-central-de-timeouts-e-reconexao-mcp.md) | Cliente MCP da sessão sobre `HostLink` (MCP 2026-07-28): descoberta `server/discover`, catálogos cacheados, streams `subscriptions/listen` a |
| `memories` | 3 | 2315 | `packages/coding-agent/src/extensions/memory` | [Achado 02](achados/02-congelar-indice-de-memoria-na-sessao.md), [R05](rejeitados.md) | Implementa a primeira metade do subsistema de memórias em background: agendamento no startup, injeção de `memory_summary.md` + lições aprend |
| `memory-backend` | 12 | 857 | `packages/coding-agent/src/extensions/memory` | [R05](rejeitados.md) | Determina se o backend ativo oferece escopo global compartilhado entre projetos (mnemopi não-per-project ou hindsight habilitado) para expor |
| `mnemopi` | 10 | 3472 | `packages/coding-agent/src/extensions/memory` | [R05](rejeitados.md) | Implementa MemoryBackend para Mnemopi: lazy loading do pacote, alias de estado para subagentes, recall/injection, pre-compaction, clear/stat |
| `modes` | 172 | 75957 | `packages/coding-agent/src/modes/interactive`, `packages/coding-agent/src/modes/rpc` | [Achado 21](achados/21-rpc-v2-framing-delta-e-acp.md) | Tipos, validadores estritos de blocos para _session/steering, catálogo de modelos de fala e infraestrutura de elicitation ACP com timeout/ab |
| `ovnfs` | 4 | 471 | sem equivalente | [R02](rejeitados.md) | Operações de checkout (`new`, `rm`) no daemon `ovnfs` compartilhadas entre workspaces isolados de subagentes e checkouts de sessão `/wt`, co |
| `plan-mode` | 9 | 567 | `packages/coding-agent/src/extensions/plan-mode` | Paridade funcional (`extensions/plan-mode/`) | Normalização e resolução com fallbacks de título/slug `local://<slug>-plan.md` ao propor e aprovar planos sem renomear o arquivo. |
| `predict` | 5 | 529 | sem equivalente | [R24](rejeitados.md) | Função de blend ponderado (30% n-gram, 70% SmolLM) somando confianças quando ambos concordam na sugestão e aplicando limiar mínimo `SHOW_THR |
| `prompts` | 313 | 5626 | `packages/coding-agent/src/core/system-prompt.ts`, `packages/coding-agent/src/core/tools` | [R12](rejeitados.md) | Aviso ao advisor quando o cwd está fora do git e há exatamente um repositório filho direto. |
| `ratchet` | 4 | 1394 | sem equivalente | [R27](rejeitados.md) | Definição do prelude `ratchet` no kernel de eval (`init`, `plan`, `split`, `approve`, `check`, `gate`, `train`, `status`), com schema `ompty |
| `registry` | 7 | 2548 | sem equivalente | [R30](rejeitados.md) | Grafo de bloqueios entre agentes e o sentinela @user com consultas transitivas (blocksOn, blockedVia, waitersOn) para detectar esperas circu |
| `secrets` | 10 | 4621 | sem equivalente | [Achado 20](achados/20-ofuscacao-de-segredos-no-contexto.md) | Carrega secrets.yml, variáveis de ambiente e padrões embutidos, gerencia a chave HMAC persistida (criação atômica e fallback efêmero) e mont |
| `security` | 20 | 4914 | sem equivalente | [R22](rejeitados.md) | Seleção e resolução estrita de credenciais OAuth pinadas ou rotas nativas para scans de segurança, bloqueando troca de conta/organização dur |
| `session` | 153 | 86305 | `packages/coding-agent/src/core`, `packages/coding-agent/src/extensions/ui/btw.ts` | [Achado 08](achados/08-read-supersede-poda-leituras-repetidas.md), [Achado 10](achados/10-snapcompact-vs-compaction-e-handoff.md), [Achado 12](achados/12-prewarm-zero-tokens-e-checkpoints-anthropic.md), [R01](rejeitados.md) | Define ferramentas sujeitas a permissão em sessões ACP, inspeciona payloads de edit via editInspect para detectar operações destrutivas (del |
| `sharpshooter` | 9 | 1406 | sem equivalente | [R05](rejeitados.md) | Implementa `MemoryBackend` `sharpshooter`: assina `message_start` para extração assíncrona, inicia agendador de consolidação, injeta arquivo |
| `skillshare` | 5 | 1927 | sem equivalente | [R28](rejeitados.md) | Cliente HTTP para o registry Skillshare (busca, packument, tarball, publicação com SRI/proveniência/OIDC, tags, yank, deprecação, owners, to |
| `slash-commands` | 32 | 8288 | `packages/coding-agent/src/core/slash-commands.ts` | Coberto via `core/slash-commands.ts` | Registro e despacho de slash commands builtin em modo ACP/texto, filtrando comandos TUI-only e detectando colisões/shadowing (nomes, aliases |
| `speculation` | 1 | 343 | sem equivalente | [R19](rejeitados.md) | Controla execução especulativa apenas para leituras locais de texto puro, com bloqueio por hooks/aprovação, detecção de tipos não-texto e va |
| `spotlight` | 22 | 5452 | sem equivalente | [R29](rejeitados.md) | Cliente HTTP de ranqueamento semântico Spotlight (`/v1/spotlight`) com orçamento de timeout sem retries, warm-up assíncrono e backoff compar |
| `ssh` | 5 | 1520 | sem equivalente | [R15](rejeitados.md) | Leitura, validação e escrita atômica (arquivo `.tmp` + rename, permissões `0700`/`0600`) de arquivos `ssh.json` de hosts SSH. |
| `stats` | 3 | 263 | sem equivalente | [R21](rejeitados.md) | Cliente do worker de atividade diária (`/usage`): instancia `Worker`, transmite pontos em cache seguidos dos atualizados com suporte a `Abor |
| `stencil` | 1 | 34 | sem equivalente | [R28](rejeitados.md) | Resolve credencial bearer da Stencil via variável de ambiente ou `AuthStorage` para `stream`, `clip` e `skill`. |
| `stream` | 12 | 2344 | sem equivalente | [R28](rejeitados.md) | Valida gravação `.ompcast`, atualiza metadados de título/descrição no cabeçalho e envia NDJSON comprimido com gzip para a rota de clipes. |
| `stt` | 13 | 2489 | sem equivalente | [R24](rejeitados.md) | Cliente STT sobre `ModelWorkerHost` para transcrição batch, streaming de áudio (`startStream` com `pushAudio`/`stop`/`cancel`, parciais e se |
| `subprocess` | 18 | 2915 | sem equivalente | [R30](rejeitados.md) | Inicia um subprocesso detached via Bun.spawn com stdin ignorado e stdout/stderr redirecionados a arquivo de log para sobreviver ao processo |
| `task` | 40 | 19557 | `packages/coding-agent/src/extensions/subagent` | [Achado 15](achados/15-subagentes-resultado-tipado-e-isolated-por-chamada.md) | Define e carrega lazily os subagentes embutidos (scout, reviewer, security-reviewer, task, sonic) a partir de Markdown com frontmatter de fe |
| `thinking` | 1 | 426 | `packages/coding-agent/src/extensions/thinking` | Coberto via `extensions/thinking/` | Define parsing de seletores e abreviações não-ambíguas de raciocínio, sentinela 'auto' com nível provisório limitado abaixo de Max, clamping |
| `thread` | 45 | 12654 | sem equivalente | [R02](rejeitados.md) | Roteamento de execuções de subagentes, follow-up turns e cold-revive entre main thread e pool de worker_threads, convertendo morte de worker |
| `tiny` | 13 | 2668 | sem equivalente | [R20](rejeitados.md) | Renderiza templates de chat via tokenizer do Transformers.js removendo antes diretivas `{% generation %}`/`{% endgeneration %}` nao suportad |
| `tools` | 270 | 106995 | `packages/coding-agent/src/core/tools`, `packages/coding-agent/src/core/permissions` | [Achado 07](achados/07-tabela-central-de-timeouts-e-reconexao-mcp.md), [Achado 11](achados/11-lsp-pos-escrita-ledger-versao-e-defaults.md), [Achado 14](achados/14-guarda-de-loop-repetitivo-e-edicao-em-stream.md), [Achado 17](achados/17-recuperacao-de-turno-vazio-e-stream-interrompido.md) | Roteia escritas de arquivos pelo client bridge ACP (ex.: Zed) mantendo artefatos internos fora do editor, notifica LSP, atualiza versão de m |
| `tts` | 14 | 2835 | sem equivalente | [R24](rejeitados.md) | Instala e verifica arquivos pinados de checkpoints TTS locais via `installPinnedHubFiles` e limpa caches obsoletos do antigo backend Kokoro- |
| `ui` | 442 | 105820 | `packages/coding-agent/src/modes/interactive`, `packages/coding-agent/src/modes/interactive/theme` | [Achado 28](achados/28-timeouts-limitados-em-extensoes-managed-timers-e-fail-closed-tool-call.md), [R16](rejeitados.md) | Componentes JSX do widget compacto/expandido acima do composer e do overlay rolavel de autoresearch, exibindo estado atual, cartoes de estat |
| `utils` | 79 | 24659 | `packages/coding-agent/src/utils`, `packages/coding-agent/src/utils/changelog.ts` | [Achado 24](achados/24-motor-nativo-rust-crates-e-ast.md) | Detecção assíncrona e síncrona de repositório único (Git ou Jujutsu) entre filhos diretos quando o cwd está fora de qualquer repositório VCS |
| `vibe` | 3 | 1688 | sem equivalente | [R23](rejeitados.md) | Módulo-folha com schema `omptype` e parser para eventos persistidos `vibe-session-lifecycle` (`spawn`, `turn-started`, `turn-settled`, `tomb |
| `web` | 125 | 29735 | `packages/coding-agent/src/extensions/web` | [Achado 18](achados/18-web-search-api-first-e-content-negotiation.md), [R10](rejeitados.md) | Cliente REST do Firecrawl com resolução de URL base (suporte a self-hosting via FIRECRAWL_BASE_URL/FIRECRAWL_API_URL e validação de esquema/ |
| `worktree` | 7 | 748 | `packages/coding-agent/src/extensions/subagent/core/worktree.ts` | [Achado 15](achados/15-subagentes-resultado-tipado-e-isolated-por-chamada.md), [R02](rejeitados.md) | Define as interfaces do contrato `WorktreeBackend` e modelos associados (`SessionWorktree`, `ManagedWorktree`, `WorktreeLocation`, `Worktree |

## Tabela 3 — `omp:packages/ai/src/*` (`17` subdiretórios + raiz)

| Subdiretório (`omp:packages/ai/src/`) | Arquivos | Linhas | Dono no `nycode` | Veredito (`Achado` / `R`) | Resumo verificado |
|---|---:|---:|---|---|---|
| `(root)` | 14 | 7375 | `packages/ai/src/providers`, `packages/ai/src/api` | [Achado 03](achados/03-ajuste-dinamico-de-max-tokens-na-janela.md) | Registro de APIs de streaming customizadas por extensões, com validação exaustiva em compile-time dos `KnownApi` nativos (`BUILTIN_API_IDS`) |
| `auth` | 19 | 13655 | `packages/ai/src/auth`, `packages/ai/src/auth/types.ts` | [Achado 25](achados/25-rotacao-de-credenciais-multi-conta.md) | Helper `raceSignal` que rejeita apenas o chamador abortado com `AIError.AbortError` mantendo a promise single-flight subjacente observada (e |
| `auth-broker` | 11 | 5742 | sem equivalente | [R07](rejeitados.md) | Cliente HTTP/SSE para o servidor `auth-broker` com validação por schemas `omptype`, timeout configurável, retentativa apenas em falhas de tr |
| `auth-gateway` | 17 | 3740 | sem equivalente | [R07](rejeitados.md) | Classificação exaustiva em tempo de compilação de todas as chaves de `SimpleStreamOptions` em níveis `client`, `gateway` e `server`, removen |
| `dialect` | 39 | 6887 | sem equivalente | [Achado 29](achados/29-buffer-replay-seguro-e-sanitizacao-vazamento-thinking-dsml-harmony.md), [R31](rejeitados.md) | Prompt de formato do dialeto Anthropic XML (`<function_calls>`, `<invoke>`, `<parameter>`, `<function_results>`) instruindo saída literal se |
| `embeddings` | 3 | 159 | sem equivalente | [R32](rejeitados.md) | Ponto de entrada do modulo embeddings despachando requisicoes pelo model.api. |
| `error` | 17 | 3533 | `packages/ai/src/utils`, `packages/ai/src/utils/abort.ts` | [Achado 27](achados/27-separacao-413-payload-vs-overflow-e-resiliencia-stream-ai.md) | Define AbortError com Flag.Abort estrutural e helper callerAbortReason para extrair motivo de cancelamento do AbortSignal. |
| `images` | 11 | 1284 | `packages/ai/src/images.ts` | [Achado 24](achados/24-motor-nativo-rust-crates-e-ast.md) | Diretiva de prompt para instruir formato/dimensao/proporcao de imagem ao backend Codex Responses. |
| `judgment` | 14 | 2046 | `packages/coding-agent/src/extensions/goal/evaluator-model.ts` | [R20](rejeitados.md) | Backend TextBackend sobre modelos de chat usando maxTokens=4096 para comportar preambulos de reasoning, temperatura 0 e tool submit_judgment |
| `prompts` | 3 | 33458 | sem equivalente | [R31](rejeitados.md) | Fatia 1/11 do JSON de pool de perturbação de prompts: cabeçalho do pool (`version: 1`, `deepseek-v4.1-flash`) e variantes de frases de `syst |
| `providers` | 171 | 100779 | `packages/ai/src/providers/amazon-bedrock.ts`, `packages/ai/src/providers/anthropic.ts` | [Achado 01](achados/01-isolar-cwd-e-contexto-do-prefixo-cacheado.md), [Achado 12](achados/12-prewarm-zero-tokens-e-checkpoints-anthropic.md), [Achado 19](achados/19-fallback-chains-e-concorrencia-por-provedor.md) | Camada HTTP/SigV4 nativa para Amazon Bedrock (Converse Stream e `InvokeModelWithResponseStream` para compaction), resolução geo-aware de reg |
| `registry` | 63 | 8466 | `packages/ai/src/auth`, `packages/ai/src/auth/oauth/device-code.ts` | [Achado 25](achados/25-rotacao-de-credenciais-multi-conta.md) | Mapeamento de opções de transporte (`region`, `profile`, `bearerToken`) para o provedor Amazon Bedrock. |
| `rerank` | 3 | 174 | sem equivalente | [R32](rejeitados.md) | Ponto de entrada `rerank()` que despacha requisições de reordenação semântica para o transporte selecionado pelo modelo (`openrouter-rerank` |
| `speech` | 5 | 208 | sem equivalente | [R32](rejeitados.md) | Dispatcher `synthesizeSpeech()` e guard `isSpeechApi()` roteando entre `xai-tts` e `openai-speech`. |
| `transcription` | 3 | 184 | sem equivalente | [R32](rejeitados.md) | Dispatcher `transcribeAudio()` que roteia modelos `openai-transcriptions` para o transporte multipart OpenAI. |
| `usage` | 28 | 9330 | sem equivalente | [R07](rejeitados.md) | Implementa consulta de uso do Alibaba Token Plan (consoles China Bailian e Internacional QwenCloud) via sessão com cookie, extração de secTo |
| `utils` | 60 | 16553 | `packages/ai/src/utils`, `packages/ai/src/utils/abort.ts` | [Achado 06](achados/06-ids-unicos-de-toolcall-e-retry-after.md), [Achado 27](achados/27-separacao-413-payload-vs-overflow-e-resiliencia-stream-ai.md), [Achado 29](achados/29-buffer-replay-seguro-e-sanitizacao-vazamento-thinking-dsml-harmony.md) | Rastreador de origem de abort (createAbortSourceTracker) que garante prioridade determinística ao cancelamento pelo usuário sobre watchdogs |
| `video` | 3 | 302 | sem equivalente | [R32](rejeitados.md) | Ponto de entrada da API de geração assíncrona de vídeo (`submitVideo`, `pollVideo`, `downloadVideo`), despachando para o transporte `openrou |

## Tabela 4 — Pacotes (`packages/*`), Crates Rust (`crates/*`), SDKs e Infraestrutura do `omp`

| Módulo / Pacote / Crate (`omp`) | Arquivos | Linhas | Dono no `nycode` | Veredito | Notas verificadas |
|---|---:|---:|---|---|---|
| `(raiz)` | 40 | 32422 | `.gitattributes`, `.gitignore` | [R30](rejeitados.md) | Lista diretórios de TypeScript, Python, SDK, infra, docs e saídas locais ignorados pelo Bazel para manter o grafo focado apenas nos crates R |
| `.github` | 14 | 1898 | `.github/ISSUE_TEMPLATE/config.yml`, `.github/ISSUE_TEMPLATE/feature_request.yml` | [R30](rejeitados.md) | Formulário de GitHub Issue para relatos de bug com campos obrigatórios de descrição, passos, comportamento esperado, plataforma, versão do o |
| `.omp` | 15 | 3248 | `.nycode` | [R30](rejeitados.md) | Comando autônomo de limpeza TS guiado por `scripts/cleanup-scan.ts`: seleciona 1 cluster preservando comportamento e superfície pública (`ex |
| `assets` | 13 | 16 | sem equivalente | [R30](rejeitados.md) | Binario, fonte bitmap (.bdf) ou vocabulario de tokenizador (excluido de prosa LLM) |
| `bazel` | 27 | 2607 | sem equivalente | [R30](rejeitados.md) | Declara o pacote Bazel `//bazel` e o `config_setting` `fastbuild` para espelhar overrides de perfil dev. |
| `crates/ast` | 18 | 9350 | sem equivalente | [Achado 24](achados/24-motor-nativo-rust-crates-e-ast.md) | Alvos Bazel `rust_library` (`omp_ast` com feature `wasm` ativa) e `rust_test` com `ini.wasm` empacotado para testes. |
| `crates/builtins` | 383 | 320207 | `packages/coding-agent/src/core/bash-executor.ts` | [Achado 09](achados/09-minimizador-de-saida-de-bash-em-ts.md), [Achado 24](achados/24-motor-nativo-rust-crates-e-ast.md) | Definição Bazel da biblioteca `omp_builtins` e seus testes, espelhando todas as features `util.*`, dados embutidos (`file/magic*`, módulos P |
| `crates/diff` | 3 | 1232 | `packages/coding-agent/src/core/tools/edit-diff.ts` | [Achado 13](achados/13-hashline-edit-e-benchmark-de-edicao.md), [Achado 24](achados/24-motor-nativo-rust-crates-e-ast.md) | Configuração Bazel da biblioteca e suíte de testes do crate `omp_diff`. |
| `crates/edit` | 171 | 47295 | `packages/coding-agent/src/core/tools/edit.ts` | [Achado 13](achados/13-hashline-edit-e-benchmark-de-edicao.md), [Achado 24](achados/24-motor-nativo-rust-crates-e-ast.md) | Definição Bazel da biblioteca `omp_edit` e de sua suíte de testes (`edit_test`), embutindo prompts, gramáticas Lark e fixtures de notebooks. |
| `crates/iso` | 15 | 5179 | sem equivalente | [R02](rejeitados.md) | Definição Bazel para a biblioteca `omp_iso` e sua suíte de testes `iso_test`. |
| `crates/natives` | 324 | 1094558 | `packages/coding-agent/src/modes/interactive/components/mermaid.ts`, `packages/coding-agent/src/utils/syntax-highlight.ts` | [Achado 24](achados/24-motor-nativo-rust-crates-e-ast.md) | Define as regras Bazel do addon N-API pi_natives e seus binários auxiliares embarcados (gerador de syntaxes, helpers Darwin em Objective-C/R |
| `crates/predict` | 27 | 8581 | sem equivalente | [R24](rejeitados.md) | Regras Bazel (`rust_library` e `rust_test`) para a crate `omp_predict` com dados compilados embutidos (`src/**/*.txt`, `data/*.bin.zst`). |
| `crates/shell` | 984 | 378354 | `packages/coding-agent/src/core/bash-executor.ts` | [Achado 09](achados/09-minimizador-de-saida-de-bash-em-ts.md) (`24` módulos `.rs` em `minimizer/filters`), [Achado 24](achados/24-motor-nativo-rust-crates-e-ast.md) | Definições Bazel da biblioteca `omp_shell`, do binário `obash` e das suítes de teste (incluindo flags `-Copt-level=1` para evitar overflow d |
| `crates/vcs` | 16 | 16772 | `packages/coding-agent/src/utils/git.ts` | [Achado 22](achados/22-omp-commit-seletivo-e-conflitos.md) | Define os alvos Bazel `rust_library` (`omp_vcs`, edição 2024, dependência em `//crates/iso`) e `rust_test` para o crate `vcs`. |
| `crates/vendor` | 182 | 129851 | sem equivalente | Excluído (`1_vendor`) | Codigo terceirizado vendored (excluido de leitura/adocao) |
| `crates/vfs` | 19 | 8185 | sem equivalente | [R02](rejeitados.md), [R24](rejeitados.md) | Regras Bazel para compilar a biblioteca `omp_vfs` (Rust edition 2024) e sua suite de testes `vfs_test`. |
| `crates/voice` | 11 | 4163 | sem equivalente | [R24](rejeitados.md) | Alvos Bazel (`rust_library` e `rust_test`) para a crate `omp_voice` isolando o grafo de dependências WebRTC/Opus da camada N-API. |
| `crates/xfs` | 48 | 21769 | sem equivalente | [Achado 24](achados/24-motor-nativo-rust-crates-e-ast.md) | Alvos Bazel (`rust_library` e `rust_test`) para a crate `omp_xfs`. |
| `docs` | 142 | 41375 | `docs` | [R30](rejeitados.md) | Nota técnica e estatística sobre vazamento de cabeçalhos de roteamento Harmony em GPT-5/Codex (`to=functions.X` + spam após tokens glitch so |
| `infra` | 5 | 595 | sem equivalente | [R30](rejeitados.md) | Documenta o uso dos runners `vmon` (vibemon) no CI: labels `runs-on`, mapeamento de jobs por evento, setup do GitHub App, limites da equipe, |
| `nix` | 7 | 2559 | sem equivalente | [R30](rejeitados.md) | Derivação Nix mínima que extrai o binário `bun` para `libexec/bun` a fim de servir como executável alvo de compilação (`BUN_COMPILE_EXECUTAB |
| `packages/agent` | 118 | 56311 | `packages/agent/test`, `packages/coding-agent/src/core/compaction` | [Achado 06](achados/06-ids-unicos-de-toolcall-e-retry-after.md), [Achado 12](achados/12-prewarm-zero-tokens-e-checkpoints-anthropic.md), [R19](rejeitados.md) | Histórico de versões 19.2.1 até 18.1.19 do pacote @oh-my-pi/pi-agent-core, cobrindo entrega/peek de filas, requisitos soft de ferramentas, s |
| `packages/ai` | 1110 | 438177 | `packages/ai/test`, `packages/ai/src/utils` | [Achado 01](achados/01-isolar-cwd-e-contexto-do-prefixo-cacheado.md), [Achado 03](achados/03-ajuste-dinamico-de-max-tokens-na-janela.md), [Achado 27](achados/27-separacao-413-payload-vs-overflow-e-resiliencia-stream-ai.md), [Achado 29](achados/29-buffer-replay-seguro-e-sanitizacao-vazamento-thinking-dsml-harmony.md) | Historico de mudancas de @oh-my-pi/pi-ai (v18.17.0 a v19.2.1) documentando recursos e correcoes em provedores, OAuth, gateway, prompt pertur |
| `packages/browser-relay` | 86 | 17662 | sem equivalente | [R11](rejeitados.md) | Histórico de versões do pacote `@oh-my-pi/browser-relay`, documentando a migração para Native Messaging, painel lateral no Chrome, neutraliz |
| `packages/catalog` | 562 | 110278 | `packages/ai/catalog`, `packages/ai/src/compat.ts` | [R08](rejeitados.md) | Histórico de mudanças do pacote `@oh-my-pi/pi-catalog` da v18.13.0 à v19.2.1, cobrindo novos provedores (Kiro, Otari, Modal, Liquid, Nace, C |
| `packages/coding-agent` | 5430 | 1574330 | `packages/coding-agent/test`, `packages/coding-agent/src/modes/interactive` | Ver Tabela 2 (`84` submódulos) | Notas de release das versões 19.2.1, 19.2.0, 19.1.1, 19.1.0 e 19.0.1 de coding-agent: migração de UI para pi-tui, daemon MCP compartilhado, |
| `packages/collab-web` | 107 | 16148 | sem equivalente | [R23](rejeitados.md) | Historico de versoes do cliente web @oh-my-pi/collab-web documentando protocolo COLLAB_PROTO v2, Markdown/LaTeX em streaming e tool cards. |
| `packages/metaharness` | 292 | 22343 | `packages/evals` | [R21](rejeitados.md) | Documentação do gerenciador unificado de benchmarks `@oh-my-pi/pi-metaharness` (Harbor, edit, SnapCompact, Terminal-Bench 2.1 em KVM microVM |
| `packages/mnemopi` | 157 | 35632 | `packages/coding-agent/src/extensions/memory` | [R05](rejeitados.md) | Histórico de versões e correções do pacote `@oh-my-pi/pi-mnemopi` até a v19.1.0. |
| `packages/natives` | 67 | 32484 | `packages/coding-agent/src/utils/clipboard.ts`, `packages/coding-agent/src/utils/git.ts` | [Achado 24](achados/24-motor-nativo-rust-crates-e-ast.md) | Registro de alterações das versões 19.2.1 até 18.18.1 de `@oh-my-pi/pi-natives` (shell embarcado com Perl/file, desktop automation macOS/Win |
| `packages/omptype` | 276 | 51379 | `packages/schema` | [R21](rejeitados.md) | Histórico de versões de @oh-my-pi/omptype, documentando o motor JIT lazy, adaptadores Zod/TypeBox/ArkType, fromJsonSchema com fallback inter |
| `packages/snapcompact` | 119 | 35272 | `packages/coding-agent/src/core/compaction` | [Achado 10](achados/10-snapcompact-vs-compaction-e-handoff.md) | Ignora diretórios locais .cache/ e results/ dos experimentos do snapcompact. |
| `packages/stats` | 175 | 46010 | `packages/coding-agent/src/extensions/diagnostico/observabilidade` | [R21](rejeitados.md) | Historico de versoes do pacote @oh-my-pi/omp-stats documentando evolucao do dashboard, rollups horarios, Spotlight, Frustration, Tools, Gain |
| `packages/tsconfig.workspace.json` | 1 | 16 | sem equivalente | [R30](rejeitados.md) | Configuração TypeScript compartilhada dos pacotes sob `packages/*`. |
| `packages/tui` | 232 | 59688 | `packages/tui/src`, `packages/tui/test` | [R16](rejeitados.md) | Ignora artefatos de corpus de testes em `test/corpus/`. |
| `packages/typescript-edit-benchmark` | 19 | 4902 | `packages/evals` | [Achado 13](achados/13-hashline-edit-e-benchmark-de-edicao.md) | Binario, fonte bitmap (.bdf) ou vocabulario de tokenizador (excluido de prosa LLM) |
| `packages/utils` | 295 | 68554 | `packages/coding-agent/src/utils`, `packages/coding-agent/src/extensions/claude-rules` | [Achado 26](achados/26-reparse-flags-extensao-limites-file-e-bugreport.md), [R01](rejeitados.md) | Primeira metade do changelog de `@oh-my-pi/pi-utils` (v18.0.7 a v19.2.1), documentando adicoes e correcoes criticas em regex, JSON streaming |
| `packages/wire` | 12 | 3535 | `packages/coding-agent/src/modes/rpc` | [Achado 21](achados/21-rpc-v2-framing-delta-e-acp.md), [R16](rejeitados.md) | Historico de versoes do pacote @oh-my-pi/pi-wire ate a v19.2.1 (protocolo collab v3, stream, skillshare, shell-trace e TSP). |
| `python/robomp` | 135 | 46247 | sem equivalente | [R21](rejeitados.md) | Modelo documentado de variaveis de ambiente do bot roboomp detalhando modos exclusivos gh-proxy HMAC vs PAT, pools de modelos, rate limits, |
| `scripts` | 79 | 26971 | `scripts` | [R30](rejeitados.md) | Arquivo vazio marcador de pacote Python em `scripts/`. |
| `sdk/go` | 19 | 12695 | sem equivalente | [R21](rejeitados.md) | Documentação do SDK Go (omprpc) para o protocolo RPC do omp, detalhando geração de wire.go, negociação v2, PromptAndWait, host tools, host U |
| `sdk/python` | 18 | 11682 | sem equivalente | [R21](rejeitados.md) | Arquivo de licença MIT (Copyright 2026 Stencil Labs, Inc.) do pacote SDK Python `omp-rpc`. |
| `sdk/rust` | 14 | 11516 | sem equivalente | [R21](rejeitados.md) | Ignora o diretorio /target da crate Rust omp-rpc. |
| `types` | 1 | 75 | sem equivalente | [R30](rejeitados.md) | Lockfile ou artefato gerado automaticamente (excluido) |

## Tabela 5 — Comparação reversa `nycode` -> `omp` (`12` pacotes + `58` extensões)

### 5.1 Pacotes do `nycode` (`12/12`)

| Pacote `nycode` (`packages/<pkg>/src`) | Arquivos | Linhas | Equivalente no `omp` | Avaliação comparativa |
|---|---:|---:|---|---|
| `packages/agent` | 6 | 2548 | `omp:packages/agent` | `nycode` mais enxuto sem speculative-execution (`R19`); `omp` tem `replay-policy` e `toolCallId` únicos (`Achado 06`, `Achado 12`) |
| `packages/ai` | 211 | 29271 | `omp:packages/ai` + `omp:packages/catalog` | `nycode` tem prefix-cache TTL 1h e `openai-codex` zstd; `omp` supera em `maxTokens` dinâmico (`Achado 03`), 413/200-SSE (`Achado 27`), `fallbackChains` (`Achado 19`) |
| `packages/chord` | 336 | 70436 | Sem equivalente direto (`daemon`+`wire` parciais) | **Exclusivo `nycode`**: coordenação distribuída v2 (deltas, fences, bridges) |
| `packages/codemode` | 17 | 3051 | `omp:packages/coding-agent/src/eval/` (`R03`) | **Superior no `nycode`**: sandbox QuickJS-WASM capability-based vs Python/Bun soltos |
| `packages/coding-agent` | 859 | 171965 | `omp:packages/coding-agent` | `nycode` tem prompt base ~7x menor (`539` tok vs `~4.010`), `completion-gate` e `/travar-modelos`; `omp` traz ganhos A em cache/CLI/LSP/bash |
| `packages/durable` | 103 | 35910 | Sem equivalente direto (`ratchet`/`daemon` parciais) | **Exclusivo `nycode`**: runtime durável com replay determinístico por journal sobre QuickJS |
| `packages/env` | 9 | 2578 | `omp:packages/utils/src/env.ts` | `nycode` isola tipagem e carregamento de ambiente como pacote próprio |
| `packages/evals` | 5 | 1454 | `omp:packages/metaharness` + `typescript-edit-benchmark` (`R21`, `Achado 13`) | `nycode` (`packages/evals` + `bench/gate.py`) integra gate BCa custo×assertividade |
| `packages/mcp` | 30 | 4921 | `omp:packages/coding-agent/src/mcp/` (`Achado 07`) | `nycode` separa transporte/OAuth em pacote dedicado; `omp` supera em reconexão `-32001` |
| `packages/schema` | 43 | 4852 | `omp:packages/omptype` (`R21`) | **Superior no `nycode`**: validação compatível com CSP/SES sem `new Function` JIT |
| `packages/telemetry` | 8 | 1631 | `omp:packages/stats` + `telemetry.ts` (`R21`) | `nycode` foca custo/cache e diagnósticos enxutos sem dashboard SQLite separado |
| `packages/tui` | 48 | 20664 | `omp:packages/tui` + `omp:packages/wire/src/tsp.ts` (`R16`) | `nycode` mantém TUI pura sem JSX reativo nem dependência nativa `pi-natives` |

### 5.2 Extensões do `nycode` (`58/58` em `packages/coding-agent/src/extensions/*`)

| Extensão `nycode` | Arquivos | Linhas | Equivalente no `omp` | Avaliação comparativa |
|---|---:|---:|---|---|
| `extensions/_shared` | 56 | 6046 | infra compartilha `claude-compat`/`subagent`/`goal`/`memory`/`web` | `nycode` organiza utilitários compartilhados fora de extensões monolíticas; mantém SSOT em TS puro |
| `extensions/auto-resume` | 1 | 418 | Sem equivalente direto (`session-maintenance.ts` / `--continue`) | Extensão leve do `nycode` para retomada de sessão |
| `extensions/bash-main-guard` | 2 | 125 | Equivalente via regras/permissões em `tools/approval*` e `tool_call` | `nycode` protege branch principal determinísticamente |
| `extensions/chat-margin` | 2 | 324 | Sem equivalente direto (TUI JSX padding) | Componente UI isolado do `nycode` |
| `extensions/claude-compat` | 48 | 6372 | `discovery/claude*` + `advisor/` | `nycode` suporta compatibilidade `.claude/*` modular sem `bun:sqlite` |
| `extensions/claude-rules` | 2 | 635 | `export/ttsr.ts` + `session/ttsr-coordinator.ts` ([R01](rejeitados.md)) | `nycode` executa regras reativas em `tool_result` sem abortar stream nem perder cache |
| `extensions/code-blocks` | 4 | 869 | Renderizador Markdown JSX no `tui` | Formatação específica de terminal no `nycode` |
| `extensions/codemode` | 6 | 1534 | `tools/eval.ts` + `eval/` ([R03](rejeitados.md)) | `nycode` usa sandbox capability-based QuickJS-WASM (`packages/codemode`), zero acesso direto ao FS |
| `extensions/comandos` | 6 | 1180 | `slash-commands/` | Comandos customizados específicos do `nycode` |
| `extensions/commands` | 3 | 857 | `slash-commands/` + `extensibility/custom-commands/` | Despacho de comandos em TS puro no `nycode` |
| `extensions/completion-gate` | 1 | 171 | `advisor/` + `session/unexpected-stop-classifier.ts` ([R06](rejeitados.md), [R20](rejeitados.md)) | `nycode` usa gate determinístico em `agent_before_settle` com zero chamadas extras de LLM |
| `extensions/context-imports` | 7 | 1745 | `prompts/prompt-file.ts` (`@path` / imports) | Importação modular controlada no `nycode` |
| `extensions/context-usage` | 1 | 48 | `ui/status` + `session/usage` | Telemetria de janela em barra/extensão do `nycode` |
| `extensions/contexto` | 1 | 111 | `slash-commands` / status de contexto | Comando local leve no `nycode` |
| `extensions/dev-commands` | 3 | 156 | `extensibility/custom-commands/` | Atalhos de desenvolvimento próprios do `nycode` |
| `extensions/devin` | 43 | 3649 | Sem equivalente | Integração específica no `nycode` |
| `extensions/diagnostico` | 9 | 3109 | `packages/stats` + `ui/apps/raw-sse` ([R21](rejeitados.md)) | Diagnóstico de sessão e observabilidade modular |
| `extensions/docs-pointer` | 2 | 83 | Instruções completas embutidas em `system-prompt.md` ([R12](rejeitados.md)) | Ponteiro enxuto preserva orçamento `prompt4` (`docs/ADR.md`) |
| `extensions/effort-sandwich` | 1 | 34 | `auto-thinking/` ([R06](rejeitados.md), [R20](rejeitados.md)) | Opt-in controlado no `nycode` com histórico documentado de custo em `bench/` |
| `extensions/env-settings` | 1 | 242 | `packages/utils/src/env.ts` + `config/settings.ts` | Mapeamento declarativo env -> settings no `nycode` |
| `extensions/folha` | 5 | 650 | Sem equivalente | Extensão dedicada no `nycode` |
| `extensions/footer` | 2 | 183 | `ui/dock/*` + status line JSX | Rodapé minimalista no `nycode` |
| `extensions/git-checkpoint` | 2 | 852 | `tools/checkpoint.ts` ([R17](rejeitados.md)) | `nycode` mantém checkpoints só no lado do usuário (`/rewind`), sem expor tool ao modelo |
| `extensions/goal` | 3 | 881 | `goals/runtime.ts` ([Achado 16](achados/16-guided-goal-e-orcamento-de-tokens-no-goal.md), [R04](rejeitados.md)) | `nycode` exige juiz externo (`VERDICT_TOOL`) e preserva prefix cache da sessão |
| `extensions/headless-lean` | 1 | 214 | Modos headless em `sdk.ts` | `nycode` isola `<cwd>` em `-p` (`Achado 01` propõe generalizar para TUI) |
| `extensions/hook-msgs` | 1 | 324 | `extensibility/hooks/` | Injeção controlada de mensagens de hook |
| `extensions/hooks` | 13 | 3595 | `extensibility/hooks/` + `tools/approval*` ([R01](rejeitados.md)) | Hooks locais determinísticos + integração `permissions/` |
| `extensions/image-open` | 2 | 495 | Preview de imagem em `tools/read.ts` | Leitor/abertura leve de imagem no `nycode` |
| `extensions/init` | 1 | 107 | `/init` em `prompts/` | Inicialização guiada de `AGENTS.md` |
| `extensions/llama` | 5 | 1630 | Provedores locais em `catalog/` | Integração leve específica no `nycode` |
| `extensions/lsp` | 12 | 1591 | `lsp/` ([Achado 11](achados/11-lsp-pos-escrita-ledger-versao-e-defaults.md)) | `omp` vence em ledger/versão; `nycode` protege auto-detecção com trust |
| `extensions/mcp` | 11 | 3865 | `mcp/` ([Achado 07](achados/07-tabela-central-de-timeouts-e-reconexao-mcp.md)) | `omp` reconecta sessões expiradas; `nycode` conecta sob `packages/mcp` |
| `extensions/memory` | 3 | 891 | `memories/` + `packages/mnemopi` ([Achado 02](achados/02-congelar-indice-de-memoria-na-sessao.md), [R05](rejeitados.md)) | `nycode` tem ~891 LOC simples compatível com Claude vs ~34k LOC + ONNX/SQLite |
| `extensions/monitor` | 2 | 332 | `tools/wait.ts` + `async/job-control.ts` | Monitoramento leve de processos no `nycode` |
| `extensions/notify` | 7 | 884 | `ui/` notificações de sistema | Notificações simples via extensão |
| `extensions/output-styles` | 1 | 319 | `prompts/personalities/` | Estilos opcionais sem inflar prompt padrão |
| `extensions/plan-gate` | 1 | 314 | `plan-mode/` + `tools/plan-mode-guard.ts` | Separação limpa de portão de plano |
| `extensions/plan-mode` | 11 | 3348 | `plan-mode/` | Paridade funcional em TS puro |
| `extensions/ponytail` | 4 | 453 | Sem equivalente | Extensão própria do `nycode` |
| `extensions/prefix-cache-1h` | 1 | 47 | Breakpoints em `providers/anthropic.ts` ([Achado 01](achados/01-isolar-cwd-e-contexto-do-prefixo-cacheado.md), [Achado 12](achados/12-prewarm-zero-tokens-e-checkpoints-anthropic.md)) | `nycode` aplica split TTL `1h` em `tools+system` e `5m` em mensagens com `cache-warmer` |
| `extensions/processos` | 2 | 130 | `async/` + `tools/bash` background | Controle local de processos no `nycode` |
| `extensions/question` | 6 | 1084 | `tools/ask.ts` | Paridade funcional com schema fechado |
| `extensions/run` | 7 | 1661 | `tools/bash.ts` + `exec/` | Wrapper de execução alinhado a permissões |
| `extensions/session-title` | 1 | 175 | `session/session-naming.ts` | Nomeação de sessão automática |
| `extensions/settings-flags` | 1 | 96 | `cli/config-cli.ts` + `config/settings.ts` | Exposição de flags de config como comandos |
| `extensions/skills-compat` | 3 | 787 | `discovery/` + `skillshare/` ([R24](rejeitados.md), [R28](rejeitados.md)) | `nycode` carrega skills sob demanda preservando tokens (`ADR-0004`) |
| `extensions/status-line` | 4 | 890 | `ui/dock/` status | Status line configurável sem daemon TUI nativo |
| `extensions/sticky-prompt` | 2 | 360 | `ui/composer/` | Fixação de rascunho/instrução em TUI |
| `extensions/subagent` | 53 | 10653 | `task/` + `worktree/` + `thread/` ([Achado 15](achados/15-subagentes-resultado-tipado-e-isolated-por-chamada.md), [R02](rejeitados.md)) | `nycode` tem roteamento de tiers em `subagent/routing` sem kernel CoW/ovnfs |
| `extensions/syntax-check` | 1 | 153 | `edit/auto-repair.ts` + `crates/ast` ([Achado 14](achados/14-guarda-de-loop-repetitivo-e-edicao-em-stream.md)) | `nycode` usa checagem tree-sitter isolada após escrita |
| `extensions/thinking` | 1 | 108 | `thinking/` + `packages/agent/src/thinking.ts` | Controle de raciocínio + níveis por modelo |
| `extensions/todo` | 6 | 1015 | `tools/todo.ts` | Paridade funcional simples |
| `extensions/tool-search` | 2 | 367 | `tools/resolve.ts` + `toolCommandDocs` | `nycode` reduz baseline mantendo tools descobertas sob demanda |
| `extensions/travar-modelos` | 2 | 414 | Não existe trava equivalente hard ([R09](rejeitados.md), [Achado 19](achados/19-fallback-chains-e-concorrencia-por-provedor.md)) | **Vantagem do `nycode`**: trava determinística impedindo troca silenciosa de modelo |
| `extensions/ui` | 7 | 1896 | `ui/` + `session/btw-*` ([Achado 12](achados/12-prewarm-zero-tokens-e-checkpoints-anthropic.md)) | Componentes modulares; `/btw` do `omp` ganha em reuso de prefixo em cache |
| `extensions/ui-visual` | 32 | 6280 | `ui/tools/` + `ui/dock/` | Renderizadores visuais de tools |
| `extensions/up-dequeue` | 1 | 181 | `modes/interactive/` queue steering | Desenfileiramento interativo no `nycode` |
| `extensions/web` | 1 | 539 | `tools/fetch.ts` + `web/scrapers/*` ([Achado 18](achados/18-web-search-api-first-e-content-negotiation.md), [R10](rejeitados.md)) | `nycode` tem `resolveAndPin` anti-SSRF superior; `omp` supera em `web_search` API e `llms.txt` |
