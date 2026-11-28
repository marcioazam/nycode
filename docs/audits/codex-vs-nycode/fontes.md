# Fontes, Rastreabilidade, Medições e Lacunas

Registro de versões exatas, ferramentas de análise, buscas na web executadas na Fase 0, medição de tokens (`o200k_base`) e lacunas documentadas da auditoria Codex CLI vs `nycode`.

## 1. Repositórios, SHAs e Isolamento

| Artefato | Localização / Origem | Referência / Tag | Commit SHA | Modo de acesso |
|---|---|---|---|---|
| OpenAI Codex (`openai/codex`) | Clone raso `--depth 1` em `~/source/codex-ref` | `rust-v0.172.0` (tag `fc3036dba44468096953f0e832f3fecd3adc0228`, publicada `2026-11-24T00:03:55Z`) | `3d86e43b075adeba2193ec5c22ac92f55afd82e6` | Somente leitura; nenhuma compilação, instalação ou execução realizada |
| `nycode` (`origin/main` / worktree) | Worktree dedicada `~/source/nycode-audit-codex` (ramo `docs/codex-vs-nycode-audit`) | `origin/main` | `00fed2ae615016b328ebfb48bfaa49814bf1dbc4` | Escrita restrita a `docs/audits/codex-vs-nycode/` |
| `nycode` (checkout principal) | `~/source/nycode` (consultado apenas para índice `codegraph` e leitura de docs locais não comitados em `origin/main`: `docs/{README,ADR,PRD,MEMORY}.md`) | Working tree local | N/A | Somente leitura |

## 2. Triagem de Segurança no Clone (`presente-de-grego` e unicode)

Antes da leitura de código em `~/source/codex-ref`, todos os arquivos de instrução de agentes e configuração de repositório do clone foram submetidos à varredura contra ataques de prompt injection / Unicode oculto (`zero-width` chars) e regras suspeitas:

- **Vetted (`12` arquivos sinalizados + `4` `AGENTS.md`)**: todos confirmados benignos (regras internas de estilo/Rust/Bazel do Codex, zero sequências zero-width ocultas, zero exfiltração).
- **Licenciamento Codex verificável na raiz do clone**:
  - `LICENSE:1-201` (`Apache License, Version 2.0`, janeiro de 2004).
  - `NOTICE:1-6` (`OpenAI Codex Copyright 2025 OpenAI` e atribuição `Ratatui` sob licença MIT).

## 3. CodeGraph e Exploração Estrutural do `nycode`

Executado `codegraph status ~/source/nycode` antes das buscas por `rg`:

- **Arquivos indexados**: `5,662` (`4,458` TypeScript, `894` Python, `129` TSX, `107` JS, `27` Swift, `21` YAML, `17` Rust, `8` C, `1` Objective-C).
- **Grafo**: `114,514` nós (`import`: `29,401`, `function`: `27,075`, `property`: `18,296`, `constant`: `12,801`, `method`: `12,069`) e `435,329` arestas (`477.90 MB`, backend `node:sqlite` WAL).
- **Estado `degraded`**: havia `6` adições e `18` modificações pendentes no checkout principal `~/source/nycode`, motivo pelo qual toda citação `arquivo:linha` do `nycode` nesta auditoria foi validada linha a linha contra os arquivos reais da worktree limpa `~/source/nycode-audit-codex`.

## 4. Consultas Web e Documentação Oficial

### 4.1 Perplexity MCP (Falha / Lacuna Documentada)

- O servidor local `mcp-perplexity` (`http://127.0.0.1:6042/mcp`, ferramenta `perplexity_search`) foi acionado na Fase 0 (`query_perplexity.py`), mas falhou em todas as tentativas por sessão/cookie expirado no provedor local.
- **Mitigação**: substituído por `4` consultas independentes via `search_web` + `4` consultas independentes via **Brave Search MCP** (`http://127.0.0.1:8080/mcp`, `brave_web_search`) + consulta direta ao release via `gh release view rust-v0.172.0 --repo openai/codex` + ingestão direta por HTTP dos arquivos Markdown oficiais em `learn.chatgpt.com/docs/*.md`.

### 4.2 URLs Oficiais Verificadas (HTTP 200 e `gh release view`)

- Release `rust-v0.172.0`: <https://github.com/openai/codex/releases/tag/rust-v0.172.0>
- Índice oficial em Markdown (`36,343` bytes, HTTP 200): <https://learn.chatgpt.com/docs/llms.txt>
- Segurança (`3,617` bytes, HTTP 200): <https://learn.chatgpt.com/docs/security.md>
- Sandbox & auto-review (`agent-approvals-security.md`, `sandboxing.md`, `sandboxing/auto-review.md`): <https://learn.chatgpt.com/docs/sandboxing.md> e <https://learn.chatgpt.com/docs/sandboxing/auto-review.md>
- Regras / ExecPolicy Starlark (`6,865` bytes, HTTP 200): <https://learn.chatgpt.com/docs/agent-configuration/rules.md>
- `AGENTS.md` (`9,145` bytes, HTTP 200): <https://learn.chatgpt.com/docs/agent-configuration/agents-md.md>
- Modo não interativo / `codex exec` (`15,779` bytes, HTTP 200): <https://learn.chatgpt.com/docs/non-interactive-mode.md>
- App Server JSON-RPC (`114,490` bytes, HTTP 200): <https://learn.chatgpt.com/docs/app-server.md>
- MCP (`31,982` bytes, HTTP 200): <https://learn.chatgpt.com/docs/extend/mcp.md>
- Skills (`11,396` bytes, HTTP 200): <https://learn.chatgpt.com/docs/build-skills.md>
- Subagentes (`22,822` bytes, HTTP 200): <https://learn.chatgpt.com/docs/agent-configuration/subagents.md>
- Hooks (`49,306` bytes, HTTP 200): <https://learn.chatgpt.com/docs/hooks.md>
- Memórias (`6,550` bytes, HTTP 200): <https://learn.chatgpt.com/docs/customization/memories.md>
- Comandos de desenvolvedor (`65,880` bytes, HTTP 200): <https://learn.chatgpt.com/docs/developer-commands.md>
- Referência `config.toml` (`155,662` bytes, HTTP 200): <https://learn.chatgpt.com/docs/config-file/config-reference.md>
- Autenticação (`17,334` bytes, HTTP 200): <https://learn.chatgpt.com/docs/auth.md>

### 4.3 Queries Executadas no Provedor Independente (Brave Search MCP)

1. `site:github.com/openai/codex/releases rust-v0.172.0`
2. `site:developers.openai.com/codex/ security OR rules OR exec-policy OR noninteractive OR app-server`
3. `site:developers.openai.com/codex/ subagents OR hooks OR skills OR memories OR guides/agents-md OR mcp`
4. `site:developers.openai.com/codex/ cli/slash-commands OR compaction OR code-mode OR apply_patch`

## 5. Metodologia de Medição de Tokens (`o200k_base`)

Todas as contagens de tokens desta auditoria foram medidas deterministicamente com o tokenizador **`o200k_base`** (`tiktoken`), em ambiente virtual isolado, sem chamadas de API pagas:

- **Prompts do Codex**: lidos diretamente dos arquivos `.md` e templates em `codex-rs/` (`protocol/src/prompts/base_instructions/default.md`, `core/gpt_*.md`, `prompts/templates/...`, `ext/goal/templates/goals/...`).
- **Tool specs do Codex**: reconstruídos em JSON equivalente exatamente a partir dos `ResponsesApiTool`, `JsonSchema` e `FreeformTool` (`apply_patch.lark`) inspecionados nos arquivos Rust.
- **Prompts e esquemas do `nycode`**: extraídos dos retornos reais de `buildSystemPrompt` (`core/system-prompt.ts`), `resources/instructions/{contract,headless}.md`, `extensions/headless-lean/index.ts`, e dos objetos TypeBox compilados de `core/tools/{read,bash,edit,write,grep,find,ls}.ts`, `extensions/tool-search/tool.ts` e `extensions/subagent/core/params.ts`.

Observação importante: embora o `nycode` use majoritariamente modelos Anthropic e múltiplos provedores, `o200k_base` foi adotado como régua única neutra entre Codex e `nycode` para evitar viés de tokenizadores distintos na comparação relativa.

## 6. Lacunas Declaradas

1. **Perplexity MCP offline**: mitigado por Brave Search MCP + `search_web` + `gh` CLI + docs oficiais em Markdown direto (`learn.chatgpt.com`).
2. **Provedores/chaves pagos**: não foram executadas evals ao vivo nem rodadas em `bench/` (proibido pelo escopo documentation-only). Planos de eval pareados acompanham todos os achados Classe B.
3. **Semântica binária fechada do servidor ChatGPT/Responses**: endpoints remotos proprietários (`/responses/compact` remote v2, modelo classificador `gpt-6-luna` em `api.openai.com/v1/decisions` e `Daybreak`) só são observáveis pelo cliente open source (`codex-rs/`); sua implementação server-side está fora do repositório.
4. **Windows e macOS em runtime**: analisados estaticamente no código-fonte (`windows-sandbox-rs/` e `sandboxing/src/seatbelt.rs`), sem execução local em Windows ou macOS nesta máquina Linux.
5. **Documentos de arquitetura apenas no checkout principal**: `docs/README.md`, `docs/ADR.md`, `docs/PRD.md` e `docs/MEMORY.md` existem no checkout principal `~/source/nycode` (ainda não integrados à `origin/main` da worktree limpa). Sempre que citados, essa diferença de origem é indicada explicitamente.
