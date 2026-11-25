# Auditoria: núcleo do Nycode × harness (2026-11-23)

Objetivo: listar tudo o que o binário embute e marcar o que é núcleo do coding agent e o que é harness ou necessidade
do dono, para decidir o que sai. Só análise; nada foi alterado no código.

Método: diff contra o commit base do fork (`073b0bae`, upstream pi, `docs/fork/2026-11-20-fork-do-pi.md`), leitura do
cabeçalho de cada extensão e de cada recurso, busca por caminhos, ferramentas, modelos e textos específicos.
Fato: no upstream, `src/extensions/` tinha só `codemode`, `llama`, `mcp`, `tool-search` e não existia `resources/`;
o resto entrou depois do fork.

Legenda:

- **N**: núcleo genérico, fica no produto.
- **N\***: núcleo, mas com trecho pessoal que deve sair ou virar configuração.
- **H**: harness genérico (opinião de fluxo de trabalho, reutilizável). Candidato a pacote opcional, fora do binário.
- **P**: pessoal ou específico do dono (caminhos, ferramentas, contas, gosto visual, pt-BR fixo). Sai do produto ou vai
  para `~/.nycode/agent`.

## 0. Lista pessoal consolidada (revisão de 2026-11-24)

Segunda varredura, em `src/` e `resources/` sem testes, por: caminhos da máquina, projetos e contas do dono, MCPs e
ferramentas pessoais, modelos fixos, comandos da máquina, decisões do dono em comentários, e referências a skills ou
agentes que só existem em `~/.nycode/agent`. Itens marcados **novo** não estavam na primeira versão.

### 0.1 Caminhos e segredos da sua máquina

| Onde | O quê |
|---|---|
| `src/extensions/hooks/internal/codegraph.ts:191`, `knowledge.ts:66`, `graph-context.ts:48` | `~/source` como raiz padrão. |
| `src/extensions/hooks/internal/codegraph.ts:218` | `~/.cache/claude-codegraph-auto`. |
| `resources/bin/mcp-header.sh:3-11` | Lê `~/.config/claude-secrets/<servidor>`. |
| **novo** `src/core/permissions/guard/rules/read.ts:9`, `resources/hooks/permissions/rules.py:24`, `resources/hooks/guard.py:25-31` | Lista de negação com `.config/claude-secrets`, `claude-home`, `~/.codex/auth.json`, `~/.config/mcp/secrets.env`, `~/.local/bin/nycode`: suas convenções de segredo dentro do motor de permissões. |
| `resources/skills/engineering-standards/SKILL.md:36` | `~/source/blueprint/base-software-rules/standard/GATES.md`. |
| `resources/skills/agent-routing/references/tool-routing.md:45` | `~/source/nylla/jogai`. |
| `resources/skills/perplexity-urls/SKILL.md:8` | `~/source/perplexity-mcp`. |
| **novo** `resources/skills/sdd-workflow/references/specification-lifecycle.md:3` | Link para `~/.codex/docs/harness-sdd-obsidian-20260928/research.json`. |
| **novo** `resources/commands/claude-tier.md:12` | `~/.local/bin/claude-tier-probe`. |
| **novo** `src/extensions/sound-notify/index.ts:3` | Origem citada: `~/.codex/bin/codex-sound-notify`. |
| `resources/bin/checks/check-instructions.py:118-125` | `chrome-debug`, `build.slice`, `claude-secrets`. |

### 0.2 Seu plugin `claude-hud` acoplado ao produto

| Onde | O quê |
|---|---|
| `src/core/settings-defaults.ts:118` | Status line padrão é o launcher do claude-hud. |
| **novo** `src/extensions/auto-resume/index.ts:349` | Lê `plugins/claude-hud/usage-cache.json`. |
| **novo** `src/extensions/subagent/fleet-ui/style/palette.ts:36` | Lê cores de `plugins/claude-hud/config.json`. |
| **novo** `src/extensions/status-line/config.ts:31` | Trata o claude-hud como piso padrão. |
| `resources/statusline/claude-hud-*.mjs` (4), `commands/claude-hud-setup.md`, `claude-hud-configure.md`, **novo** `commands/statusline.md` | Fluxo do plugin. |
| `resources/commands/claude-tier.md` | Contas Claude Team. |

### 0.3 Cofre de conhecimento e codegraph no núcleo

| Onde | O quê |
|---|---|
| `src/core/settings-nycode-schema.ts:103`, `settings-nycode.ts:176`, `local-env.ts:20` | Bloco `codegraph`. |
| **novo** `src/core/settings-nycode-schema.ts:99-100`, `settings-nycode.ts:173-174`, `local-env.ts:18-19` | `knowledge.vault` e `knowledge.graphsVault` (`NYCODE_KNOWLEDGE_VAULT`, `NYCODE_GRAPHS_VAULT`): seus cofres pessoais (notas e grafos). |
| `src/extensions/hooks/internal/{codegraph,graph-context,knowledge}.ts` | Hooks padrão de SessionStart e SubagentStart. |
| `resources/rules/ref/docs-and-knowledge.md`, **novo** `skills/engineering-standards/references/documentation.md:16` | Exigem `obsidian-cli`. |

### 0.4 Seus MCPs e ferramentas, fixos no código

| Onde | O quê |
|---|---|
| `src/extensions/plan-mode/utils.ts:120`, `:563`, `:569`; `messages.ts:22` | Lista de MCPs de busca, `kb.py`, `perplexity-scout`. |
| **novo** `src/extensions/ui-visual/icons.ts:146` | Regex de ícone com `perplexity`, `keenable`, `firecrawl`, `youcom`, `octen`. Inofensivo, mas é a sua lista. |
| **novo** `resources/bin/telemetry/nycode_telemetry.py:38-46` | Lista dos seus MCPs de busca. |
| **novo** `resources/bin/checks/check-agents.py:53`, `:184` | Exceção para `mcp__keenable__search_web_pages`. |
| `resources/hooks/dispatch/hook-dispatch.sh:195`, `:227`, `:237` | Cofre, matcher do Perplexity, detecção de injeção em português. |
| **novo** `src/extensions/hook-msgs/index.ts:149-199` | Parser dedicado à saída do `impeccable` (skill pessoal). |
| **novo** `resources/bin/structure/structure.py:99-101` | Exceção para o `impeccable`. |
| **novo** `resources/bin/nycode-image.mjs:3` | Substituto do `impeccable generate-image`. |
| `resources/hooks/impeccable_gate.sh` | Gate do `impeccable`. |
| **novo** `src/extensions/claude-compat/commands/settings/plugin.ts:1`, `:32` | Manda usar a skill `presente-de-grego`, que não vem no binário. |
| `resources/commands/skill-gen.md` | Firecrawl. |
| `resources/rules/ref/research-and-tools.md` | Perplexity primeiro, `systemd-run --slice`, Linear. |
| `resources/skills/deep-search/references/providers.md`, `perplexity-urls`, `codegraph`, `soteiros` | Seu conjunto de provedores e políticas. |

### 0.5 Modelos e agentes pessoais

| Onde | O quê |
|---|---|
| `resources/agents/*.md` (17) | Modelo fixo `anthropic/claude-sonnet-5-5` ou `claude-haiku-5-5`. |
| `resources/agents/{swarm-worker,lane-integrator,test-author,research-scout}.md` | Tools dos seus MCPs (`computer_use_linux`, `linear`, `nimble`, `exa`, `firecrawl`). |
| `resources/skills/swarm-orchestration/SKILL.md:16-26`, **novo** `skills/context-economy/references/agent-context.md` | Decisões de modelo do dono. |
| `src/core/settings-defaults.ts` `env.PONYTAIL_SUBAGENT_MATCHER` | 8 agentes que só existem no seu `~/.nycode/agent/agents`. |

### 0.6 **Novo:** referências quebradas para skills e agentes que só você tem

Os recursos embutidos citam 76 skills ou agentes que não vêm no binário (existem só em `~/.nycode/agent`). Para outro
usuário são instruções mortas. Concentração por arquivo:

| Arquivo embutido | Cita (exemplos) |
|---|---|
| `skills/agent-routing/SKILL.md` e `references/tool-routing.md` | Quase todo o seu catálogo: `impeccable`, `web-ui-craft`, `linear`, `obsidian-*`, `ocr-*`, `wizard`, `harness-audit`, `zero-legado`, `go-service-engineer`, `terraform-specialist`, `browser-harness`, `e2e`… (≈50 nomes). |
| `skills/swarm-orchestration/SKILL.md` | `egm-structural`, `impeccable-manual-edit-applier`, `mobile-app-engineer`, `quality-toolkit-engineer`, `code-mapper`, `linear-operator`, os `*-engineer`. |
| `skills/soteiros/**` | `accessibility-audit`, `api-contract-design`, `architecture-decision`, `containerization`, `db-migration-safety`, `performance-audit`, `reliability-operations`, `supply-chain-risk-auditor`, `soteiros-auditor`, `zero-legado-builder`. |
| `skills/deep-search/**` | `academic-search`, `entity-search`, `fact-check`, `legal-search`, `tech-search`, `wide-search`, `scholar-scout`, `evidence-research`. |
| `skills/security-audit/**` | `codeql`, `semgrep`, `sarif-parsing`, `supply-chain-risk-auditor`. |
| `skills/pr-review`, `diagnose`, `atualizador`, `sdd-workflow`, `plan-workflow`, `context-economy`, `differential-review`, `perplexity-urls` | `ci-triage`, `code-mapper`, `ux-reviewer`, `agent-systems-auditor`, `contract-migration-reviewer`, `adversarial-modeler`, `design-review`, `validate-data`, `perplexity-mcp-sota`. |
| `agents/test-author.md`, `reliability-reviewer.md`, `research-scout.md` | `browser-testing-with-devtools`, `reliability-operations`, `evidence-research`. |
| `rules/safety.md`, `rules/ref/*` | `presente-de-grego`, `linear-operator`, `knowledge-curator`, `pelo-em-ovo`, `browser-testing-with-devtools`. |
| `commands/diff-review.md` | `adversarial-modeler`. |

### 0.7 Migração pessoal e decisões do dono no código

| Onde | O quê |
|---|---|
| **novo** `src/migrations/from-pi-personal.ts` (219 linhas) | Camada pessoal do `nycode migrate from-pi`: copia o seu overlay `claude-home/rules/personal.md`, a extensão `conta.ts` (reescreve o `pi-conta`), os temas `pi-claro/escuro/noite`. Só serve para a sua máquina. |
| **novo** `src/migrations/from-pi*.ts` (restante, ≈850 linhas) | Migração de uma vez a partir do diretório do pi. Genérica em tese; avaliar se fica. |
| **novo** IDs `nycode-harness:*` / `nycode-harness.*` em `Symbol.for` e canais de evento (≈45 ocorrências em `src/`) | Prefixo do harness; pela decisão de 2026-11-24 deve virar `nycode:`. |
| **novo** Comentários "pedido do usuário/dono", "owner's request/choice", "D-NN" | ≈40 arquivos em `src/` (`ui-visual` 7, `_shared` 6, `image-open`, `hooks`, `claude-compat`, `core/permissions` 2 cada, e outros). |

### 0.8 Idioma fixo em pt-BR

- Extensões com nome em português: `avisos`, `comandos`, `contexto`, `diagnostico`, `folha`, `travar-modelos`; comando `/puxar`; arquivos `modes/interactive/avisos/*`, `retomada/`.
- As 24 descrições de `resources/commands/*.md` estão em português.
- `insecure-defaults/scripts/pipeline_prompts.py`, `calm-statusline.mjs:281`, `plan-mode/table.ts:253`, `hook-dispatch.sh:237`, `hooks/claims/claims.py:215`.
- ≈280 strings de interface em português nas extensões.

### 0.9 Confirmado como não pessoal (falsos positivos da busca)

`model-resolver.ts:14-16` (padrão Opus do upstream), `model-complete.ts:94` (nota técnica de modelos), menções a
`systemd-run` em `run/detect.ts`, `completion-gate/index.ts:86`, `claims/patterns.ere` e `security-audit/WORKFLOW.md`
(reconhecem ou sugerem o comando, não dependem da sua máquina), `marcioazam/nycode` (é o repositório do produto),
`blueprint` em `code-blocks/languages.ts` (nome de linguagem), `linear` em sentido matemático.

## 1. Pacotes e diretórios do monorepo

| Item | Classe | Nota |
|---|---|---|
| `packages/ai`, `agent`, `tui`, `mcp`, `schema`, `env`, `durable`, `telemetry`, `codemode`, `chord`, `evals` | N | Upstream. |
| `packages/coding-agent/src/core` (upstream) | N | Sessão, tools, compactação, modelos, settings, extensões, SDK, RPC. |
| `apps/p2`, `apps/p2-mac`, `apps/p3` | N (upstream) | Experimentais do upstream; não são harness. Avaliar à parte se servem ao produto. |
| `bench/` (≈870 arquivos) | P | Benchmark do dono (arms Pi × Claude Code × nycode). Ferramenta de desenvolvimento, não produto. |
| `docs/harness/` (41), `docs/migration/` (267), `docs/bench/` | P | Registros de decisões do dono e da migração. |
| `scripts/harness/`, `scripts/fork/` | P | Ferramentas da migração e do fork. |

## 2. Núcleo adicionado após o fork (`src/core`, `src/modes`, `src/utils`)

| Item | Classe | Nota |
|---|---|---|
| `core/permissions/**` (motor nativo, bypass) | N | Motor de permissões em TypeScript. |
| `core/lifecycle/**` (`/restart`, `/update`) | N | |
| `core/cwd-switch/**` | N | |
| `core/compaction/session-limit.ts`, `threshold.ts` | N | Usado por `/contexto`. |
| `core/tools/bash-timeout.ts` | N | |
| `core/builtin-instructions.ts`, `builtin-resources.ts` | N | O mecanismo é núcleo; o conteúdo que carregam é H/P (seção 4). |
| `core/settings-nycode.ts`, `settings-nycode-schema.ts` | N\* | Bloco `codegraph` (`:103`, `:176`): ferramenta de terceiro dentro do schema do núcleo. |
| `core/local-env.ts` | N\* | `CODEGRAPH_AUTO_ROOT` e afins em `:20`. |
| `core/settings-defaults.ts` | N\* | Ver tabela abaixo. |
| `modes/interactive/avisos/**`, `retomada/`, `send-now/` | N\* | Funções gerais com textos em pt-BR fixos e nomes de arquivo em português. |
| Temas `nycode-claro`, `nycode-escuro`, `nycode-noite`, `tokyo-night`, `mono` | N | Identidade do produto. |
| `utils/nycode-user-agent.ts`, `cli/run.ts`, `mode-actions/**`, `mode/**`, `ui-controls/**` | N | Divisão de `interactive-mode.ts`. |

### `settings-defaults.ts` (valores padrão)

| Chave | Classe | Nota |
|---|---|---|
| `harness.*` (`effortSandwich`, `headless`, `prefixCache1h`, `autoResume`, `completionGate`) | H | O nome já diz: harness ligado por padrão. |
| `plan.gate: true` | H | Depende do agente `plan-reviewer`. |
| `hooks.PreToolUse` → `guard.py` | H | Python; legado do motor nativo (seção 4.5). |
| `hooks.SessionStart`/`SubagentStart` → `graphContext` | P | Codegraph com auto-index em `~/source`. |
| `hooks.SessionStart`/`PostToolUse` → `hook-dispatch.sh` | H/P | Precisa de `jq`; contém regras de Perplexity e do cofre. |
| `hooks.Stop` → ralph-loop | H | |
| `statusLine` → launcher do claude-hud | P | Depende do plugin pessoal `claude-hud`. |
| `env.PONYTAIL_SUBAGENT_MATCHER` | P | Lista agentes que só existem no seu `~/.nycode/agent/agents` (`go-service-engineer`, `gateway-engineer`, `web-platform-engineer`, `terraform-specialist`, `zero-legado-builder`, `dependency-remediator`, `contract-engineer`, `docs-architect`). |
| `env.EIO_BACKEND: "posix"` | N | |
| `retry.maxRetries: 10`, `compaction.maxContextTokens: 250000`, `cacheWarming: "idle"`, `tuiMode: "fullscreen"` | N | São padrões de produto; a origem foi incidente ou gosto do dono, mas são aceitáveis. |

## 3. Extensões embutidas (`src/extensions`, 59)

### 3.1 Núcleo

| Extensão | Classe | Nota |
|---|---|---|
| `codemode`, `llama`, `mcp`, `tool-search` | N | Upstream. |
| `lsp` | N | |
| `web` (`web_fetch`; `web_search` via DuckDuckGo é opt-in) | N | |
| `subagent` (9,8 mil linhas) | N | O mecanismo é núcleo; os agentes que ele carrega são H/P. |
| `todo`, `question`, `memory`, `goal`, `run`, `git-checkpoint`, `thinking`, `init` | N | Paridade com o Claude Code. `git-checkpoint` confirmado Núcleo no recheck de 2026-11-25 (salvaguardas: só arquivos editados, repositório bare fora do projeto, `.gitignore`, 30 dias). |
| `plan-mode` | N\* | `utils.ts:563` tem a lista fixa dos seus MCPs (`keenable`, `perplexity`, `exa`, `brave_search`, `octen`, `parallel`, `youcom`, `context7`, `codegraph`…); `:120` (`kb.py` do obsidian-cli); `:569` (`perplexity-scout`); `messages.ts:22`; `table.ts:253` (`toLocaleTimeString("pt-BR")`). |
| `hooks` (executor) | N\* | `internal/codegraph.ts`, `internal/graph-context.ts` e `internal/knowledge.ts` são P (seção 3.4). |
| `status-line` (executor do contrato `statusLine`) | N | |
| `notify` | N | |
| `session-title` | N | |
| `syntax-check` (tree-sitter) | N | |
| `diagnostico` (`/diagnostico`, `/doctor`) | H | Reclassificado no recheck de 2026-11-25: função geral, mas 2947 linhas com trilha, OTLP e modal; fica Harness, ligado. |
| `contexto` (`/contexto`) | N\* | Útil a todos; nome em português. |

### 3.2 Compatibilidade com o Claude Code (decisão de produto)

| Extensão | Classe | Nota |
|---|---|---|
| `claude-rules`, `context-imports`, `commands`, `skills-compat`, `output-styles`, `env-settings`, `settings-flags`, `context-usage` | N | Lêem `.claude/*`; é a proposta do produto. |
| `claude-compat` (6,6 mil linhas, 38 comandos) | N\* | Revisar comando a comando; tem `/advisor`, `/insights`, `/stickers`, `/heapdump`, `/claude-tier` (via `resources/commands`) e outros de valor duvidoso. |
| `import-claude-session` (`/puxar`) | H | Depende de `resources/bin/puxar` (Python) e de perfis do Claude Code; nome em português. |

### 3.3 Harness opinativo (H)

| Extensão | Nota |
|---|---|
| `ponytail` | Seu projeto `marcioazam/ponytail`, ligado por padrão e injetado no prompt de todos. |
| `completion-gate` | Bloqueia o fim do turno sem check. Política sua (registro "preamble-diet"). |
| `plan-gate` | Plano aprovado roda até o fim e fecha com `plan-reviewer`. Porta do seu hook. |
| `effort-sandwich` | Opt-in; política de custo em `nycode -p`. |
| `headless-lean` | Troca o contrato por `headless.md` em `-p`; poda de tools. |
| `prefix-cache-1h` | Otimização de custo específica da Anthropic. |
| `auto-resume` | Nasceu dos incidentes 503 de 2026-11-13; genérico, poderia virar setting do núcleo. |
| `bash-main-guard` | "owner's request, 2026-11-14": timeout de bash 120/600 s na sessão principal. |
| `docs-pointer` | Encolhe a seção de docs do prompt. |
| `travar-modelos` | Útil, mas nome e textos em pt-BR. |
| `sound-notify` | Porta do seu `codex-sound-notify`. |
| `avisos` | Dono dos sinais de fim de turno; pt-BR. |

### 3.4 Pessoal ou gosto do dono (P)

| Extensão | Nota |
|---|---|
| `hooks/internal/codegraph.ts` | Auto-index em `~/source` (`:191`), estado em `~/.cache/claude-codegraph-auto` (`:218`). |
| `hooks/internal/graph-context.ts` | Injeta orientação do codegraph em toda sessão; cita `~/source` (`:48`). |
| `hooks/internal/knowledge.ts` | Cofre pessoal no Obsidian; aponta para `obsidian-cli`, que não vem no binário (referência quebrada para outros usuários). |
| `folha` | "confirmações seguras em português"; só pt-BR. |
| `comandos` | Paleta do `/` em pt-BR, `/atalhos`. |
| `up-dequeue` | "variant C (owner's choice, 2026-11-18)", em português. |
| `footer` | Remove a linha de estatísticas e de pasta/sessão ("pedidos do usuário 2026-11-12"). |
| `chat-margin` | "pedido do usuário 2026-11-15". |
| `code-blocks` | "Pedido do dono 2026-11-15"; botão "⧉ copiar". |
| `sticky-prompt` | "pedido do usuário 2026-11-12". |
| `image-open` | "pedido do usuário 2026-11-13". |
| `hook-msgs` | Cartão de hook com textos em pt-BR. |
| `ui-visual` (6,3 mil linhas; `moldura`, `memoria`, `pergunta`, `plano`, `sub`…) | Redesenho visual do dono; nomes e textos em português. |
| `ui` (`/btw`, editor, a11y, histórico) | Misto: `/btw` e os aliases são gosto; o editor e a11y são N. |
| `dev-commands` (`/copy-code`, `/keybindings`) | Pequeno; revisar. |

Observação: o grupo P de UI pode ficar no produto se for tratado como identidade visual do Nycode, mas precisaria de
i18n (≈280 strings em português fixas nas extensões) e de remover as referências a pedidos do dono nos comentários.

## 4. `packages/coding-agent/resources` (embutido no binário)

### 4.1 Instruções e regras

| Arquivo | Classe | Nota |
|---|---|---|
| `instructions/contract.md` | P | Sua política de engenharia, injetada como prompt de todos: 800 linhas por arquivo, 7 arquivos por diretório, 80% de cobertura, TDD obrigatório, "verify once", subagentes obrigatórios. |
| `instructions/headless.md`, `lite.md`, `lite.settings.json` | H | |
| `rules/safety.md` | H/P | Genérico na maior parte; cita `linear-operator`, nota da licença do CodeQL, `presente-de-grego` (skill pessoal). |
| `rules/ref/research-and-tools.md` | P | Perplexity primeiro, conjunto de provedores, `systemd-run --slice`, Linear. |
| `rules/ref/delivery-and-orchestration.md` | H | Fluxo de entrega do dono (git-delivery, lanes). |
| `rules/ref/docs-and-knowledge.md` | P | Cofre de conhecimento. |
| `rules/ref/harness-economy.md` | P | Regras para mexer no próprio harness. |

### 4.2 Agentes (17)

Todos têm modelo fixo (`anthropic/claude-sonnet-5-5` ou `claude-haiku-5-5`): **P** enquanto o modelo for fixo.
Vários listam tools de MCPs seus (`mcp__computer_use_linux__*`, `mcp__linear__*`, `mcp__nimble__*`, `mcp__exa__*`,
`mcp__firecrawl__*`).

| Agente | Classe | Nota |
|---|---|---|
| `Explore`, `Plan`, `general-purpose` | N\* | Equivalentes aos do Claude Code; tirar o modelo fixo. |
| `code-reviewer`, `test-author`, `test-reviewer`, `security-reviewer`, `reliability-reviewer` | H | |
| `swarm-worker`, `lane-integrator`, `gate-runner`, `plan-reviewer`, `git-delivery` | H | Seu fluxo de orquestração; `git-delivery` depende de `git-deliver`. |
| `perplexity-scout`, `web-scout`, `research-scout`, `claim-verifier` | P | Dependem do seu conjunto de MCPs de busca. |

### 4.3 Skills (36)

| Skill | Classe | Nota |
|---|---|---|
| `code-simplification`, `diagnose`, `tdd`, `pr-review`, `property-based-testing`, `security-audit`, `sharp-edges`, `differential-review`, `variant-analysis`, `insecure-defaults`, `sdd-workflow`, `quality-gates`, `loop-engineering`, `agent-systems`, `context-economy`, `ripple-hunt`, `to-questionnaire` | H | Genéricas de engenharia. `insecure-defaults` tem prompts em português. |
| `swarm-orchestration`, `lane-integration`, `graph-engineering`, `plan-workflow`, `git-workflow`, `atualizador` | H | Seu fluxo de orquestração e entrega. `swarm-orchestration:16-26` registra decisões de modelos fixos do dono. |
| `agent-routing` | P | `tool-routing.md:45` cita `~/source/nylla/jogai`; mapeia seus MCPs. |
| `perplexity-urls` | P | Cita seu fork `~/source/perplexity-mcp`. |
| `deep-search` | P | `references/providers.md` é a sua lista de provedores. |
| `codegraph` | P | Ferramenta de terceiro. |
| `soteiros` | P | Sua política de "SOTA". |
| `engineering-standards` | P | `SKILL.md:36` aponta para `~/source/blueprint/base-software-rules/standard/GATES.md`. |
| `doces-ou-travessuras` | H | A ideia é genérica (detectar test gaming); o nome é seu. |
| `ponytail`, `ponytail-audit`, `ponytail-debt`, `ponytail-gain`, `ponytail-help`, `ponytail-review` | P | Seu projeto. |

### 4.4 Comandos (24; todas as descrições em pt-BR)

| Comando | Classe | Nota |
|---|---|---|
| `claude-hud-setup`, `claude-hud-configure` | P | Plugin pessoal. |
| `claude-tier` | P | Mede se contas Claude Team são Premium ou Standard. |
| `pre-launch` | P | Sua convenção `.project-phase`. |
| `swarm` | P | Fixa Sonnet nos workers. |
| `skill-gen` | P | Depende do Firecrawl MCP. |
| `team-onboarding` | H | |
| `batch`, `commit`, `commit-push-pr`, `clean_gone`, `code-review`, `review-pr`, `diff-review`, `insecure-defaults-audit` | H | `commit*` e `clean_gone` dependem de `git-delivery`. |
| `ralph-loop`, `ralph-help`, `cancel-ralph` | H | Porta de terceiro (com LICENSE/NOTICE). |
| `revise-claude-md`, `run`, `run-skill-generator`, `verify`, `statusline`, `update-config` | H | Próximos dos comandos nativos do Claude Code; poderiam virar N. |

### 4.5 Hooks

| Item | Classe | Nota |
|---|---|---|
| `hooks/guard.py` + `hooks/permissions/*.py` | H (legado) | Duplica o motor nativo em TS; só roda com `permissions.engine` ≠ `native` (`extensions/hooks/index.ts:540`). Candidato a remoção. |
| `hooks/dispatch/hook-dispatch.sh` | P | `:227` matcher só para Perplexity; `:195` captura no cofre; `:237` detecção de injeção em português. |
| `hooks/claims/` | H | Detecta afirmações de teste sem prova (PT/EN). |
| `hooks/diag.py` | H | Envia falha de hook ao diagnóstico. |
| `hooks/impeccable_gate.sh` | P | Para a skill `impeccable`, que só existe no seu diretório pessoal; não registrado. |

### 4.6 Status line, scripts e outros

| Item | Classe | Nota |
|---|---|---|
| `statusline/statusline.mjs` (launcher) | H | |
| `statusline/claude-hud-*.mjs` (4) | P | Plugin pessoal. |
| `statusline/calm-statusline.mjs` | P | Números e textos em pt-BR. |
| `bin/doctor/` (`nycode-doctor`, `nycode-typecheck`, `prune-sessions`) | N | |
| `bin/usage.mjs` | N | Gerado a partir de `claude-compat/runbooks/usage.ts`. |
| `bin/nycode-image.mjs` | H | Substitui o `impeccable generate-image`. |
| `bin/telemetry/` | H | Relatórios a partir das sessões. |
| `bin/git-deliver` | H | Base de `git-delivery` e `atualizador`. |
| `bin/structure/` | P | Aplica sua regra de 800 linhas e 7 arquivos. |
| `bin/checks/` (`check-instructions`, `check-agents`, `skill-usage`, `arg-expansion-check`) | P | Validam o próprio harness; `check-instructions.py:118` cita `chrome-debug`. |
| `bin/puxar/` | H | Base de `/puxar`. |
| `bin/session-transport/`, `bin/nycode-session` | H | Sessão destacável em tmux. |
| `bin/mcp-header.sh` | P | Lê `~/.config/claude-secrets/<servidor>`. |
| `ralph-loop/` | H | Terceiro. |
| `ponytail/LICENSE` | P | Acompanha a extensão `ponytail`. |

## 5. Fora do produto (já no lugar certo)

`~/.nycode/agent/`: `AGENTS.md` (overlay pessoal), mais de 150 skills (`offensive-*`, `egm-*`, `obsidian-*`,
`itau-sms-code`, `kiro-signup-subscribe`…), 38 agentes, `extensions/conta.ts` (depende de `~/.local/bin/pi-conta`),
`plugins/claude-hud`, `mcp.json`, `subagent-routing.json`, `settings.json`. Para retirar algo do binário sem perder
o uso pessoal, o destino natural é este diretório.

## 6. Dependências cruzadas a respeitar na retirada

- `plan-gate` → agente `plan-reviewer`; `/commit*`, `/clean_gone`, `atualizador`, `git-workflow` → `git-delivery` → `bin/git-deliver`.
- `/swarm`, `/batch`, `swarm-orchestration` → `swarm-worker`, `gate-runner`, `lane-integrator`.
- `PONYTAIL_SUBAGENT_MATCHER` → extensão `ponytail`; nomes de agentes pessoais.
- `contract.md` cita `rules/ref/*`, `structure.py`, `gate-runner`, `git-delivery`, `doces-ou-travessuras`.
- `headless-lean` troca `contract.md` por `headless.md`.
- Settings `codegraph` ↔ `hooks/internal/codegraph.ts` ↔ `local-env.ts` ↔ skill `codegraph` ↔ `graph-engineering`.
- Testes em `packages/coding-agent/test/harness/**` cobrem várias dessas peças e sairiam junto.

## Limitações

- Classificação por leitura de cabeçalhos, defaults e busca textual; não li o corpo de todas as 1.082 adições.
- `claude-compat` e `ui-visual` foram classificados em bloco; merecem revisão comando a comando.
- Nada foi executado (build, testes) e nenhuma remoção foi feita.
