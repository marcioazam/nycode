# Inventario: docs

Cada linha cobre 1 arquivo rastreado em `~/source/oh-my-pi-ref` (`git ls-files`), com categoria, origem em relação ao Pi `v0.9.4`, dono equivalente no `nycode` (ou `sem equivalente`) e nota resumida verificada nos shards. Regras e totais em [../inventario.md](../inventario.md).

| Arquivo | Categoria | Origem | Dono no nycode | Nota |
|---|---|---|---|---|
| `docs/ERRATA-GPT5-HARMONY.md` | doc | omp-novo | `docs` | 251L; Nota técnica e estatística sobre vazamento de cabeçalhos de roteamento Harmony em GPT-5/Codex (`to=functions.X` + spam após tok... |
| `docs/adding-a-provider.md` | doc | omp-novo | `docs` | 162L; Documenta como adicionar um provedor e fluxo de auth via arquivos KDL compilados (`gen:compat`, `gen:models`), referência compl... |
| `docs/advisor-watchdog.md` | doc | omp-novo | `docs` | 434L; Especificação completa do subsistema de Advisor/Watchdog (linhas 1-410): configuração de modelo e fallback, cadência (`turn`/`a... |
| `docs/agent-hub.md` | doc | omp-novo | `docs` | 123L; Documenta a TUI do Agent Hub (`Alt+A`/`Ctrl+S`): roster plano ou em árvore, inspetor de subagentes, log unificado de atividade,... |
| `docs/ai-schema-normalize.md` | doc | omp-novo | `docs` | 205L; Documenta a arquitetura de normalização e sanitização de JSON Schemas de ferramentas por provedor em `@oh-my-pi/pi-ai/utils/sch... |
| `docs/approval-mode.md` | doc | omp-novo | `docs` | 217L; Documenta o sistema de aprovação de ferramentas: tiers (`read`/`write`/`exec`), modos incluindo `always-ask-cached` (SQLite `ap... |
| `docs/auth-broker-gateway.md` | doc | omp-novo | `docs` | 396L; Parte 1 da doc de Auth Broker e Auth Gateway: fluxo de dados, CLI e endpoints HTTP/SSE/long-polling do broker, compatibilidade ... |
| `docs/autoresearch.md` | doc | omp-novo | `docs` | 169L; Especificação completa da extensão `/autoresearch`: gates de ativação e branch `autoresearch/*`, loop via hooks `before_agent_s... |
| `docs/bash-tool-runtime.md` | doc | omp-novo | `docs` | 381L; Documenta o pipeline completo da tool bash no omp: normalização de entrada e tradução de URLs internas (`skill://`, `local://`)... |
| `docs/blob-artifact-architecture.md` | doc | omp-novo | `docs` | 265L; Descreve a arquitetura dual de persistência do omp: `BlobStore` global (`blob:sha256:<hash>`) para externalização e reidratação... |
| `docs/cli-reference.md` | doc | omp-novo | `docs` | 343L; Referência da interface CLI do omp (`omp [command] [flags] [messages...]`), cobrindo anexos `@`, stdin automático em modo print... |
| `docs/collab.md` | doc | omp-novo | `docs` | 203L; Documenta o sistema `/collab` de compartilhamento ao vivo de sessões com criptografia ponta-a-ponta AES-256-GCM (links full-con... |
| `docs/compaction.md` | doc | omp-novo | `docs` | 560L; Primeira parte da arquitetura de compactação do omp: modelo de entradas (`CompactionEntry`, `BranchSummaryEntry`), reconstrução... |
| `docs/computer-use.md` | doc | omp-novo | `docs` | 320L; Primeira metade da documentação do prelúdio `computer` no Eval: configuração (`computer.enabled`, `display`, `maxWidth`/`maxHei... |
| `docs/config-usage.md` | doc | omp-novo | `docs` | 377L; Documenta descoberta e resolução de configuração no omp: raízes canônicas (`.omp`, `.claude`, `.codex`, `.gemini`), perfis isol... |
| `docs/context-files.md` | doc | omp-novo | `docs` | 328L; Documenta descoberta, sombreamento e injeção de arquivos de contexto: regra nativa de parada no primeiro `.omp/` não-vazio, reg... |
| `docs/custom-tools.md` | doc | omp-novo | `docs` | 232L; Documenta custom tools em TypeScript/JavaScript no omp: caminhos SDK vs descoberta em filesystem (incluindo recarregamento por ... |
| `docs/environment-variables.md` | doc | omp-novo | `docs` | 783L; Primeira parte da referência de variáveis de ambiente: resolução em cascata do `$env` a partir de `.env` (mantendo `OTEL_*` pri... |
| `docs/extension-loading.md` | doc | omp-novo | `docs` | 416L; Especifica descoberta, precedencia, deduplicacao, re-escopo ao vivo, allowlist `--trusted-extension`, carregamento via Bun `onL... |
| `docs/extensions.md` | doc | omp-novo | `docs` | 1604L; Documenta o contrato central de `ExtensionAPI` e `ExtensionContext`, registro e takeover parcial de providers, backends de todo... |
| `docs/fs-scan-cache-architecture.md` | doc | omp-novo | `docs` | 70L; Define o contrato arquitetural do cache global de listagem por diretorio em `crates/xfs` (64 shards, 64 MiB), validado por stam... |
| `docs/gemini-manifest-extensions.md` | doc | omp-novo | `docs` | 205L; Documenta descoberta, parsing tolerante, precedencia e deduplicacao de manifestos `gemini-extension.json` na capability `extens... |
| `docs/handoff-generation-pipeline.md` | doc | omp-novo | `docs` | 116L; Descreve o pipeline de `/handoff`: disparo, geracao oneshot via pipeline de side-request compartilhado com o turno vivo (preser... |
| `docs/hooks.md` | doc | omp-novo | `docs` | 419L; Documenta o subsistema legado de hooks (`src/extensibility/hooks/*`), esclarecendo que em runtime normal hooks descobertos em `... |
| `docs/install-id.md` | doc | omp-novo | `docs` | 48L; Especifica o UUID v4 persistente de instalacao (`install-id`), criado atomicamente com `O_EXCL` e permissao `0o600` na raiz bas... |
| `docs/keybindings.md` | doc | omp-novo | `docs` | 206L; Cataloga acoes e remapeamentos em `keybindings.yml`, comportamento de push-to-talk/ditado, recuperacao de rascunhos limpos com ... |
| `docs/kiro.md` | doc | omp-novo | `docs` | 60L; Documenta o provedor nativo Kiro: fluxos de login (Identity Center com suporte GovCloud, Builder ID, Google/GitHub device flow,... |
| `docs/local-models.md` | doc | omp-novo | `docs` | 241L; Documenta o catalogo local (texto, TTS Phonon, STT Whisper/Parakeet/Nemotron), workers por socket/named pipe para ONNX e MLX Ap... |
| `docs/lsp-config.md` | doc | omp-novo | `docs` | 279L; Explica auto-deteccao de servidores LSP por `rootMarkers` e bins locais, precedencia multicamada de arquivos (`.omp`, `.claude`... |
| `docs/macos-signing-notarization.md` | doc | omp-novo | `docs` | 160L; Documenta o pipeline de cross-compilação, assinatura Developer ID e notarização na CI Linux via rcodesign para binários macOS d... |
| `docs/magic-keywords.md` | doc | omp-novo | `docs` | 58L; Especifica as 5 magic keywords do OMP (ultrathink, chillax, orchestrate, workflowz, jevify), definidas em tabela única para inj... |
| `docs/marketplace.md` | doc | omp-novo | `docs` | 267L; Descreve o sistema de marketplace de plugins compatível com Claude Code: descoberta de catálogos Git/URL/locais, instalação em ... |
| `docs/mcp-config.md` | doc | omp-novo | `docs` | 599L; Guia completo de configuração MCP no OMP: caminhos nativos e isolamento por perfil, importação de configs de ferramentas tercei... |
| `docs/mcp-protocol-transports.md` | doc | omp-novo | `docs` | 133L; Detalha a arquitetura MCP em dois saltos (sessão via HostLink em MCP 2026-07-28 + extensões omp/* até unidade do host e transpo... |
| `docs/mcp-runtime-lifecycle.md` | doc | omp-novo | `docs` | 137L; Explica o ciclo de vida MCP entre sessão e host (daemon ou in-process): janelas de startup (250ms/1.5s/print), cache SQLite com... |
| `docs/mcp-server-tool-authoring.md` | doc | omp-novo | `docs` | 355L; Documenta o pipeline de autoria e conversão de servidores MCP em ferramentas mcp__<server>_<tool>: validação, deduplicação por ... |
| `docs/memory.md` | doc | omp-novo | `docs` | 189L; Apresenta os cinco modos de memória autônoma (off, local, hindsight, mnemopi, sharpshooter), leitura via URLs memory://, ferram... |
| `docs/mnemosyne-memory-backend.md` | doc | omp-novo | `docs` | 247L; Especifica o backend local Mnemopi em SQLite: escopos de banco (global, per-project, per-project-tagged), entrada memory_recall... |
| `docs/models.md` | doc | omp-novo | `docs` | 1386L; Primeira parte da documentação de models.yml/models.yaml: localização/migração, overrides de provedor e modelo, maxContextWindo... |
| `docs/native-crates.md` | doc | omp-novo | `docs` | 64L; Mapa da workspace Rust em crates/: lista as 12 crates próprias (natives, builtins, diff, edit, predict, vfs, shell com engine b... |
| `docs/natives-addon-loader-runtime.md` | doc | omp-novo | `docs` | 142L; Documenta o loader runtime em packages/natives/native/loader-state.js: entrypoints eager/lazy, detecção de AVX2 x64 e cache via... |
| `docs/natives-architecture.md` | doc | omp-novo | `docs` | 116L; Visão arquitetural de @oh-my-pi/pi-natives: 5 entrypoints públicos (root eager e subpaths lazy), adaptador DesktopSession, dist... |
| `docs/natives-binding-contract.md` | doc | omp-novo | `docs` | 120L; Define o contrato público JS/TS do pacote @oh-my-pi/pi-natives: geração de index.d.ts e objetos enum ESM via napi-rs + gen-enum... |
| `docs/natives-build-release-debugging.md` | doc | omp-novo | `docs` | 451L; Primeira parte do runbook de build/release/debugging dos addons nativos: alvos Bazel para 9 combinações incluindo cross-build L... |
| `docs/natives-media-system-utils.md` | doc | omp-novo | `docs` | 211L; Detalha o contrato dos utilitários nativos de mídia, conversão e sistema: áudio/WebRTC, SIXEL com pré-multiplicação alpha, SVG,... |
| `docs/natives-rust-task-cancellation.md` | doc | omp-novo | `docs` | 234L; Documenta agendamento e cancelamento de tarefas nativas em crates/natives/src/task.rs: modelos blocking (libuv + panic guard + ... |
| `docs/natives-shell-pty-process.md` | doc | omp-novo | `docs` | 346L; Documenta a camada nativa de shell, PTY, processo e parsing de teclas em @oh-my-pi/pi-natives: engine bash embarcada em Rust co... |
| `docs/natives-text-search-pipeline.md` | doc | omp-novo | `docs` | 287L; Mapeia o pipeline nativo de busca, descoberta e texto entre JS e Rust N-API: grep/search/hasMatch (in-memory, arquivo unico e d... |
| `docs/non-compaction-retry-policy.md` | doc | omp-novo | `docs` | 288L; Descreve a politica de auto-retry nao ligada a context overflow coordenada por TurnRecovery: fronteira com compactacao, excecao... |
| `docs/notebook-tool-runtime.md` | doc | omp-novo | `docs` | 189L; Explica a separacao entre edicao de arquivos .ipynb e execucao Python: read/edit convertem notebooks em texto virtual com marca... |
| `docs/omptype-guide.md` | doc | omp-novo | `docs` | 146L; Guia de uso do validador @oh-my-pi/omptype (DSL compativel com ArkType, interpretador nas 2 primeiras chamadas + JIT via new Fu... |
| `docs/plugin-manager-installer-plumbing.md` | doc | omp-novo | `docs` | 302L; Detalha o gerenciamento de plugins em disco e carregamento em runtime: PluginManager vs MarketplaceManager, gramatica de specs ... |
| `docs/porting-to-natives.md` | doc | omp-novo | `docs` | 149L; Guia de contribuicao para portar hot paths JS/TS para crates/natives (N-API): criterios de porte, organizacao de subpaths lazy ... |
| `docs/prewalk.md` | doc | omp-novo | `docs` | 197L; Especifica o sistema de Prewalk e Auto-prewalk: handoff one-shot apos planejamento para um modelo mais rapido/barato (@smol/@in... |
| `docs/provider-compat-reference.md` | doc | omp-novo | `docs` | 355L; Parte 1 da referencia de compatibilidade: arquitetura em duas fases (cascade KDL em build-time com pre-construcao de compat.whe... |
| `docs/provider-endpoint-constraints.md` | doc | omp-novo | `docs` | 514L; Guia arquitetural de restricoes por camada de endpoint (familia de protocolo, gateway/auth, metadados/compat do modelo e contex... |
| `docs/provider-quirks.md` | doc | omp-novo | `docs` | 2739L; Parte 1 de provider quirks: especializacoes, comportamento de stream, auth/uso e catalogo para OpenAI Chat Completions (empty-c... |
| `docs/provider-streaming-internals.md` | doc | omp-novo | `docs` | 332L; Descreve a arquitetura interna de streaming em `@oh-my-pi/pi-ai` até `AgentSession`: contrato `AssistantMessageEvent`, parsing ... |
| `docs/providers.md` | doc | omp-novo | `docs` | 502L; Explica o modelo de disponibilidade de provedores, integração `antigravity-cli` (ACP) e `factory-droid`, precedência de resoluç... |
| `docs/python-repl.md` | doc | omp-novo | `docs` | 259L; Especifica o backend Python da tool `eval`: subprocesso NDJSON persistente sem Jupyter, ciclo de vida e sinais (`SIGINT`->`SIGT... |
| `docs/resolve-tool-runtime.md` | doc | omp-novo | `docs` | 57L; Documenta o runtime de comandos encenados (`resolve`, `reject`, `propose`, `report_issue`) para finalizar previews pendentes e ... |
| `docs/rpc.md` | doc | omp-novo | `docs` | 1887L; Primeira metade da referência do protocolo RPC JSONL sobre stdio: startup, transporte v1/v2 com `rpc_chunk` lossless e spooling... |
| `docs/rulebook-matching-pipeline.md` | doc | omp-novo | `docs` | 352L; Especifica o pipeline completo de descoberta, normalização e precedência de regras (.omp, plugins, .agent/.agents, Cursor, Wind... |
| `docs/sdk.md` | doc | omp-novo | `docs` | 482L; Documenta a superfície programática in-process do SDK (`@oh-my-pi/pi-coding-agent`): pontos de entrada, auto-descoberta de depe... |
| `docs/secrets.md` | doc | omp-novo | `docs` | 155L; Descreve o subsistema de ofuscação de segredos em processo: coleta de variáveis de ambiente (incluindo senhas em URLs de conexã... |
| `docs/session-operations-export-share-fork-resume.md` | doc | omp-novo | `docs` | 622L; Detalha operações de sessão voltadas ao operador: matriz de comandos (`/dump [all]`, `/export`, `/share` custom e E2E criptogra... |
| `docs/session-switching-and-recent-listing.md` | doc | omp-novo | `docs` | 261L; Explica a descoberta e listagem de sessões recentes (pipeline leve com índice `history.db` vs scan completo com prefixo 4 KiB /... |
| `docs/session-tree-plan.md` | doc | omp-novo | `docs` | 228L; Descreve a arquitetura em árvore da sessão (modelo append-only + `leafId` mutável, índices em `SessionEntryIndex`), primitivas ... |
| `docs/session.md` | doc | omp-novo | `docs` | 743L; Fonte da verdade do formato JSONL e modelo de dados de sessão: layout em disco (slot fixo de título de 256 bytes, blobs SHA-256... |
| `docs/settings.md` | doc | omp-novo | `docs` | 1284L; Cobre camadas de resolução e precedência de configurações (defaults, global `config.yml`, projeto `.omp/`, overlays `--config`,... |
| `docs/skills.md` | doc | omp-novo | `docs` | 274L; Referência de skills: layout de diretórios e frontmatter de `SKILL.md`, pipeline de descoberta em 3 passes e precedência entre ... |
| `docs/skills/authoring-extensions.md` | doc | omp-novo | `docs` | 299L; Guia prático de autoria de extensões via `ExtensionAPI`: fábrica mínima e exemplo completo, caminhos de descoberta e manifesto ... |
| `docs/skills/authoring-hooks.md` | doc | omp-novo | `docs` | 278L; Guia de autoria de hooks (incluindo transição de `HookAPI` legado para `ExtensionAPI`): assinatura de fábrica, catálogo de even... |
| `docs/skills/authoring-marketplaces.md` | doc | omp-novo | `docs` | 283L; Documenta autoria de marketplaces compatíveis com `.omp-plugin/marketplace.json` e `.claude-plugin/marketplace.json`: schema de... |
| `docs/skills/examples/hello-extension/README.md` | doc | omp-novo | `docs` | 41L; README do exemplo mínimo `hello-extension` explicando instalação em diretório de extensões, via `config.yml` ou `--extension`, ... |
| `docs/skills/examples/hello-extension/index.ts` | codigo | omp-novo | `docs` | 26L; Código TypeScript do exemplo `hello-extension` demonstrando notificação em `session_start` e registro do comando `/hello` via `... |
| `docs/skills/examples/hello-extension/package.json` | config_ou_dado | omp-novo | `docs` | 9L; Manifesto `package.json` do exemplo `hello-extension` declarando o entrypoint `./index.ts` em `omp.extensions`. |
| `docs/skills/examples/mini-marketplace/.claude-plugin/marketplace.json` | config_ou_dado | omp-novo | `docs` | 16L; Catálogo `marketplace.json` mínimo listando o plugin local `my-plugin` via fonte relativa `./my-plugin`. |
| `docs/skills/examples/mini-marketplace/README.md` | doc | omp-novo | `docs` | 41L; README do exemplo `mini-marketplace` mostrando comandos `/marketplace add`/`install` e estrutura de diretórios do catálogo. |
| `docs/skills/examples/mini-marketplace/my-plugin/index.ts` | codigo | omp-novo | `docs` | 7L; Ponto de entrada mínimo do plugin de exemplo `my-plugin` notificando no evento `session_start`. |
| `docs/skills/examples/mini-marketplace/my-plugin/package.json` | config_ou_dado | omp-novo | `docs` | 8L; Manifesto `package.json` do plugin `my-plugin` apontando `omp.extensions` para `./index.ts`. |
| `docs/skills/examples/safety-hook/README.md` | doc | omp-novo | `docs` | 44L; README do exemplo `safety-hook` explicando interceptação `tool_call` para bloquear `rm -rf` com caminho absoluto no `bash`. |
| `docs/skills/examples/safety-hook/index.ts` | codigo | omp-novo | `docs` | 27L; Código TypeScript do exemplo `safety-hook` retornando `{ block: true, reason }` em chamadas `bash` casadas por regex. |
| `docs/skills/examples/safety-hook/package.json` | config_ou_dado | omp-novo | `docs` | 9L; Manifesto `package.json` do exemplo `safety-hook` declarando `./index.ts` em `omp.extensions`. |
| `docs/slash-command-internals.md` | doc | omp-novo | `docs` | 585L; Descreve a arquitetura interna de slash commands: descoberta por capabilities e precedência entre provedores, materialização de... |
| `docs/stream.md` | doc | omp-novo | `docs` | 109L; Documenta transmissão ao vivo de sessões (`omp stream`) para `live.omp.sh`, console do streamer, pipeline de diff de linhas de ... |
| `docs/system-prompt-customization.md` | doc | omp-novo | `docs` | 274L; Explica montagem e customização do system prompt: ordem de blocos e breakpoint de cache antes de `<project-context>`, precedênc... |
| `docs/task-agent-discovery.md` | doc | omp-novo | `docs` | 403L; Detalha descoberta e seleção de agentes de tarefa: schema de frontmatter (`structured`, `prewalk`, `advisor`, `readSummarize`),... |
| `docs/theme.md` | doc | omp-novo | `docs` | 409L; Referência completa do sistema de temas: tokens obrigatórios e opcionais (incluindo `assistantMessageText`, `mdExtensionLink`, ... |
| `docs/toolconv/anthropic.md` | doc | omp-novo | `docs` | 702L; Documenta o formato de tool calling da Messages API da Anthropic e o comportamento do adaptador nativo do omp (normalização de ... |
| `docs/toolconv/deepseek.md` | doc | omp-novo | `docs` | 480L; Documenta o protocolo wire de tool calling do DeepSeek (tokens fullwidth-pipe U+FF5C/U+2581 em V3.1 vs V3-0324/R1-0528 e envelo... |
| `docs/toolconv/gemini.md` | doc | omp-novo | `docs` | 160L; Especifica o dialeto in-band `gemini` do OMP (blocos `tool_code`/`tool_outputs` com sintaxe Python `default_api.*` para Gemma 3... |
| `docs/toolconv/gemma.md` | doc | omp-novo | `docs` | 118L; Documenta o formato token-delimited do Gemma 4 (`<\|tool_call>call:NAME{...}<tool_call\|>` e strings `<\|"\|>`) e o scanner/renderi... |
| `docs/toolconv/glm-4.5.md` | doc | omp-novo | `docs` | 368L; Detalha o protocolo nativo XML-like do GLM-4.5/4.6 (e variante 4.7 sem quebras de linha) e o conversor `glm` do OMP: strings nã... |
| `docs/toolconv/harmony.md` | doc | omp-novo | `docs` | 241L; Especifica o formato OpenAI Harmony (`gpt-oss`) com canais `analysis`/`commentary`/`final`, stop tokens `<\|call\|>`/`<\|return\|>`... |
| `docs/toolconv/hermes.md` | doc | omp-novo | `docs` | 190L; Documenta a convenção ChatML Hermes 2 Pro/3 e o dialeto `hermes` do OMP (`arguments` objeto JSON aninhado, `parseThinking` opci... |
| `docs/toolconv/kimi-k2.md` | doc | omp-novo | `docs` | 265L; Descreve o protocolo nativo do Kimi K2 (seções de chamada com IDs `functions.<name>:<idx>`, respostas `## Return of ...`) e o c... |
| `docs/toolconv/minimax.md` | doc | omp-novo | `docs` | 239L; Documenta o dialeto `minimax` do OMP (`<minimax:tool_call>`/`<invoke>`/`<parameter>` sem escape XML e `<function_results>` dist... |
| `docs/toolconv/pi-native.md` | doc | omp-novo | `docs` | 218L; Especifica o transporte `pi-native` (não é um dialeto textual, o antigo `<call:NAME>` foi removido) entre cliente pi-ai e `omp ... |
| `docs/toolconv/qwen3.md` | doc | omp-novo | `docs` | 300L; Detalha o formato Qwen3 (Hermes dobrado em turno `user` sem campo `name` em `<tool_response>`) e o dialeto `qwen3` do OMP, além... |
| `docs/toolconv/xml.md` | doc | omp-novo | `docs` | 278L; Descreve o dialeto genérico `xml` do OMP (`<invoke>`/`<parameter>`/`<tool_response>`) baseado no `AnthropicInbandScanner` e a o... |
| `docs/tools/ask.md` | doc | omp-novo | `docs` | 84L; Especifica a tool `ask` do OMP baseada em formulário `<form>` HTML semântico, validação HTML, abas por `<fieldset>`, opção livr... |
| `docs/tools/ast-edit.md` | doc | omp-novo | `docs` | 134L; Documenta a tool `ast_edit` do OMP com rewrite estrutural via ast-grep nativo em fluxo preview-first obrigatório, fila `resolve... |
| `docs/tools/ast-grep.md` | doc | omp-novo | `docs` | 127L; Documenta a tool `ast_grep` de busca estrutural por AST via Rust/tree-sitter, com metavariáveis `$NAME`/`$$$`, fallback para fr... |
| `docs/tools/bash.md` | doc | omp-novo | `docs` | 330L; Parte 1 da spec da tool `bash` do OMP: shell embutido bash 5.3 + builtins uutils, CLI de tool commands montadas, roteamento `ba... |
| `docs/tools/browser.md` | doc | omp-novo | `docs` | 227L; Parte 1 da doc do prelude `browser` de Eval: entrega preguiçosa de `firstCallDocumentation` via mensagem oculta (re-entregue ap... |
| `docs/tools/checkpoint.md` | doc | omp-novo | `docs` | 95L; Documenta a tool `checkpoint` do OMP (não faz snapshot git apesar do resumo legado): marca um limite conversacional e ativa `#e... |
| `docs/tools/computer.md` | doc | omp-novo | `docs` | 269L; Parte 1 da doc do prelude `computer` de Eval: automação desktop nativa multiplataforma, política `computer.takeover`, API JS/Py... |
| `docs/tools/context-notes.md` | doc | omp-novo | `docs` | 47L; Documenta a tool experimental `context_notes`: caderno persistente por ramo de sessão (limite de 16.384 bytes UTF-8, aprovação ... |
| `docs/tools/debug.md` | doc | omp-novo | `docs` | 390L; Documenta a ferramenta DAP `debug` (entradas, saídas, aprovação por ação, ciclo de vida `DapSessionManager`/`DapClient`, revers... |
| `docs/tools/dsm.md` | doc | omp-novo | `docs` | 108L; Descreve o namespace `dsm` no prelude de `eval` para análise binária (IDA, Ghidra, Binary Ninja) hospedada por processo no daem... |
| `docs/tools/edit.md` | doc | omp-novo | `docs` | 216L; Documenta a ferramenta `edit`, seu modo padrão `hashline` (âncoras `[PATH#TAG]`, operações de linha/bloco tree-sitter, registra... |
| `docs/tools/eval.md` | doc | omp-novo | `docs` | 279L; Especifica a ferramenta `eval` para execução persistente em Python e JavaScript, comandos `%load`/`%pip`/`%bun`, auto-backgroun... |
| `docs/tools/find.md` | doc | omp-novo | `docs` | 91L; Documenta a ferramenta de busca semântica `find` e CLI `omp find` em cascata de 4 estágios (varredura lexical IDF, ranqueamento... |
| `docs/tools/generate_image.md` | doc | omp-novo | `docs` | 101L; Descreve a ferramenta customizada `generate_image` para criação e edição de imagens com cadeia de fallback por role `image`, ca... |
| `docs/tools/github.md` | doc | omp-novo | `docs` | 334L; Cobre a primeira metade da ferramenta `github` (`gh.ts`): disponibilidade, aprovações, resolução de repositório/host (`GH_HOST`... |
| `docs/tools/glob.md` | doc | omp-novo | `docs` | 129L; Documenta a ferramenta `glob`: normalização e expansão de múltiplos alvos, suporte a URLs internas (`skill://`, `omp://`, `ssh:... |
| `docs/tools/grep.md` | doc | omp-novo | `docs` | 188L; Documenta `grep`: fallback Rust regex → PCRE2 → literal, escopos múltiplos com `!` exclusões, membros de arquivo compactado e U... |
| `docs/tools/learn.md` | doc | omp-novo | `docs` | 94L; Descreve `learn` para gravar lições duráveis em memória (Mnemopi, Hindsight ou `learned.md` local) e opcionalmente criar/atuali... |
| `docs/tools/lsp.md` | doc | omp-novo | `docs` | 391L; Documenta a ferramenta `lsp`: 14 ações (diagnósticos, navegação, symbols, `rename`, `rename_file`, `code_actions`, `reload`, `r... |
| `docs/tools/manage_skill.md` | doc | omp-novo | `docs` | 84L; Descreve `manage_skill` para criar (`wx`), atualizar ou remover `SKILL.md` sob `<agent-dir>/managed-skills`, com sanitização de... |
| `docs/tools/memory_edit.md` | doc | omp-novo | `docs` | 80L; Documenta `memory_edit` (`update`, `forget`, `invalidate`) exclusivo do backend Mnemopi para alterar memória de trabalho ou inv... |
| `docs/tools/new-context.md` | doc | omp-novo | `docs` | 47L; Documenta `new_context` para solicitar rolagem experimental de janela de contexto preservando `context_notes` e histórico integ... |
| `docs/tools/read.md` | doc | omp-novo | `docs` | 410L; Descreve `read` até o pipeline web: gramática de seletores (`:raw`, `:img`, `:conflicts`, faixas múltiplas, `:-N`), resumo AST ... |
| `docs/tools/recall.md` | doc | omp-novo | `docs` | 130L; Documenta `recall` para busca explícita em memória de longo prazo (Mnemopi local com IDs e previews de 500 chars ou Hindsight H... |
| `docs/tools/reflect.md` | doc | omp-novo | `docs` | 116L; Documenta `reflect` para síntese sobre memória de longo prazo: chamada remota `/reflect` no Hindsight (com `ensureBankExists` b... |
| `docs/tools/retain.md` | doc | omp-novo | `docs` | 153L; Documenta a tool retain para armazenamento de memória de longo prazo nos backends Hindsight (outbox durável em disco, batches p... |
| `docs/tools/rewind.md` | doc | omp-novo | `docs` | 113L; Documenta a tool rewind que encerra um checkpoint ativo em turn_end, podando exploração da árvore de sessão com branchWithSumma... |
| `docs/tools/security_scan.md` | doc | omp-novo | `docs` | 262L; Documenta a tool security_scan para revisões nativas (plano imutável em preflight, sessão restrita de revisão, validação de pat... |
| `docs/tools/task.md` | doc | omp-novo | `docs` | 250L; Primeira metade da spec da tool task: inputs dinâmicos (batch vs flat, steps, solutionSpace, effort, perCallModel, outputSchema... |
| `docs/tools/todo.md` | doc | omp-novo | `docs` | 177L; Documenta a tool todo single-op (init, start, done, drop, rm, append, view), inferência leniente de op omitido, normalização de... |
| `docs/tools/tts.md` | doc | omp-novo | `docs` | 82L; Documenta a tool tts para síntese de fala via cadeia do role speech (inferência local Phonon 31M em WAV, xAI Grok Voice e endpo... |
| `docs/tools/wait.md` | doc | omp-novo | `docs` | 35L; Documenta a tool wait sem argumentos para bloquear até resultados de jobs, mensagens de peer ou interrupções, detalhando janela... |
| `docs/tools/web_search.md` | doc | omp-novo | `docs` | 365L; Primeira metade da spec de web_search: inputs/filtros de busca, formatação LLM, fluxo da cadeia de role web, relaxamento de con... |
| `docs/tools/write.md` | doc | omp-novo | `docs` | 234L; Documenta a tool write multi-alvo (arquivos simples, arquivos compactados zip/tar/asar, linhas SQLite via JSON5, recursos inter... |
| `docs/tree.md` | doc | omp-novo | `docs` | 275L; Referência do comando /tree e navegador interativo da árvore de sessão: ordenação do branch ativo, atalhos, modos de filtro (de... |
| `docs/ttsr-injection-lifecycle.md` | doc | omp-novo | `docs` | 332L; Especificação do ciclo completo do TTSR: descoberta e deduplicação de regras, matching linear em streaming (LinearRegExp), proj... |
| `docs/tui-core-renderer.md` | doc | omp-novo | `docs` | 392L; Contrato do renderer core de pi-tui baseado em Elastic Speculative Slots: propriedade de frame e commit frontier, cabeçalhos es... |
| `docs/tui-runtime-internals.md` | doc | omp-novo | `docs` | 123L; Mapeia a arquitetura interna do runtime TUI entre pi-tui e coding-agent: pipeline de entrada e foco, ciclo de vida explícito de... |
| `docs/tui.md` | doc | omp-novo | `docs` | 238L; Documenta a integração TUI para extensões e custom tools: disponibilidade por modo (interactive/headless/RPC), ferramenta de de... |
| `docs/user-facing-packages.md` | doc | omp-novo | `docs` | 119L; Índice de pacotes e CLIs voltados ao usuário fora do pacote principal: robomp (triagem GitHub), omp-stats (dashboard local), om... |
| `docs/vibe-mode.md` | doc | omp-novo | `docs` | 65L; Documenta o Vibe mode (/vibe), modo diretor interativo que restringe a sessão pai a read, todo e 5 tools de controle de workers... |
