# Decisões: núcleo × harness × pessoal (2026-11-24)

Pauta de debate, um item por vez. Evidência detalhada em `auditoria-core-vs-harness-2026-11-23.md`.

Destinos possíveis:

- **Núcleo**: fica no binário, ligado, sem nada do dono.
- **Harness**: fica fora do núcleo (destino definido em D0).
- **Pessoal**: sai do produto e vai para `~/.nycode/agent`.
- **Corrigir**: fica no núcleo, mas tira o trecho pessoal.

| ID | Item | Evidência curta | Recomendação | Decisão |
|---|---|---|---|---|
| D0 | Onde vive o harness | Hoje tudo vem embutido e ligado | Pacote opcional instalável (`nycode install`), fora do binário | **Embutido e ligado** (dono, 2026-11-24): o harness continua no binário; só sai o que for pessoal |
| **A. Núcleo com trecho pessoal** | | | | |
| A1 | Codegraph | schema e `local-env`; hooks padrão `graph-context`; raiz `~/source` | Pessoal (hook e settings saem do núcleo) | **LSP + outline** (dono, 2026-11-24): codegraph sai do núcleo (hook `graph-context`, auto-index, settings `codegraph`, skill `codegraph`); entra uma tool `outline` sob demanda com o tree-sitter WASM já embutido (`syntax-check`); codegraph só via `mcp.json` do usuário. Evidência: seção A1 abaixo |
| A2 | Cofre de conhecimento pessoal | `knowledge.vault`, `graphsVault`, hook `knowledge.ts` | Pessoal | **Pessoal** (dono, 2026-11-24): saem settings `knowledge.*`, hook `knowledge.ts`, lembrete de captura e lint no `hook-dispatch`, menções a Obsidian em regras e skills; o dono mantém hook e skill em `~/.nycode/agent`; `memory` do núcleo cobre o caso genérico |
| A3 | Claude-hud | status line padrão, `auto-resume:349`, `palette.ts:36`, `/statusline` | Pessoal; núcleo sem status line padrão e sem ler o plugin | **Manter** (dono, 2026-11-24): o claude-hud continua padrão do produto |
| A4 | Segredos na lista de leitura proibida | `.config/claude-secrets`, `claude-home`, `~/.codex/auth.json` | Corrigir: manter `.ssh`, `.gnupg`, `.env*`; o resto vira configuração do usuário | **Mínimo** (dono, 2026-11-24): remover só `claude-home/.credentials.json` (TS e Python); `claude-secrets` e `mcp/secrets.env` ficam, documentadas como caminhos comuns |
| A5 | MCPs fixos no plan-mode | `utils.ts:120/563/569`, `messages.ts:22` | Corrigir: liberar tool MCP por `readOnlyHint` ou lista em settings | **readOnlyHint + setting** (dono, 2026-11-24): MCP com `readOnlyHint: true` liberado, mais lista do usuário em settings (`plan.readOnlyTools`); agente somente leitura derivado do `tools:` (sem `edit`, `write`, `bash`); saem `kb.py`, `mcp__keenable__…` e as listas fixas |
| A6 | `PONYTAIL_SUBAGENT_MATCHER` | 8 agentes que só você tem | Pessoal (acompanha B1) | **Derivar do `tools:`** (dono, 2026-11-24): ponytail entra em subagente com `edit` ou `write`; a lista de nomes sai dos defaults; a variável continua como sobrescrita. Cai junto se B1 tirar o ponytail |
| A7 | Prefixo `nycode-harness:` | ≈45 identificadores | Corrigir: `nycode:` (já decidido) | **Corrigir** (decisão anterior do dono, 2026-11-24): `nycode-harness:`/`.` → `nycode:`/`.` |
| A8 | Comentários "pedido do dono", "D-NN" | ≈40 arquivos | Corrigir: manter o porquê técnico, tirar a autoria | **Tirar autoria, manter D-NN** (dono, 2026-11-24): "pedido do dono/usuário, data" vira o porquê técnico; `D-NN` fica onde há registro em `/docs`, senão vira o porquê por extenso |
| A9 | Interface fixa em pt-BR | 6 extensões com nome PT, ≈280 strings, 24 comandos | Decidir o idioma do produto (ver debate) | **EN padrão + pt-BR** (dono, 2026-11-24): catálogo `en`/`pt-BR` escolhido por `LANG` ou setting `language`; comandos em inglês com apelidos em português; etapa própria depois das remoções |
| **B. Extensões** | | | | |
| B1 | `ponytail` (ligado por padrão) | Projeto seu | Pessoal (revista para manter ligado após a evidência) | **Ligado + re-medir** (dono, 2026-11-24): fica no binário, nível `full`, com as 6 skills; entra um braço com e sem ponytail no bench do binário atual. **Atualizar para o Ponytail 5** (v5.3.3: regras, config, 6 skills, marcador `shortcut:`); o braço mede o 5 contra sem ponytail. Evidência: seção B1 abaixo |
| B2 | `completion-gate` | Política sua de verificação | Harness | **Ligado** (dono, 2026-11-24): fica no binário, ligado, desliga por `harness.completionGate`. Evidência: A/B de 2026-11-13 (dieta + gate, Opus 5.5, n=12) sem regressão, custo 0,83 (0,66–1,08), `preamble-diet-completion-gate-2026-11-13.md` |
| B3 | `plan-gate` | Depende do agente `plan-reviewer` | Harness | **Ligado** (dono, 2026-11-24): fica no binário, ligado, desliga por `plan.gate: false`; custo só com plano aprovado (≈US$ 0,09 do `plan-reviewer`); sem A/B próprio |
| B4 | `prefix-cache-1h`, `headless-lean`, `docs-pointer` | Economia de custo e prompt | Núcleo | **Núcleo** (dono, 2026-11-24): os três ficam no core, ligados |
| B5 | `effort-sandwich` | Opt-in, política de custo | Harness | **No binário, desligado** (dono, 2026-11-24): como hoje, liga por `harness.effortSandwich.enabled`; critério de custo do gate segue mediano (≤1,10×). Evidência: `docs/specs/0009-effort-sandwich.md` (difíceis +15,4 pp [+0,0; +33,3], 0,82× US$/acerto; fáceis 1,095× e 1,16×) |
| B6 | `auto-resume` | Genérico, mas lê o claude-hud | Núcleo, corrigido por A3 | **Núcleo, ligado** (dono, 2026-11-24): trocar a cópia inline dos padrões por `isRetryableAssistantError`/overflow de `@nycode/ai`; reset de conta: headers 429 → cache do claude-hud (A3) → 15 min |
| B7 | `bash-main-guard` | Timeout 120/600 s por pedido seu | Núcleo como setting com o padrão do upstream | **Núcleo, ligado + setting** (dono, 2026-11-24): novo `bash.mainGuard` (`enabled`, timeout padrão 120 s, teto 600 s); recusa de `sleep` ≥30 s e polling e `run wait` 30 s ficam; só sessão principal com UI. Motivo: Claude Code e Codex devolvem o controle; hoje não há setting |
| B8 | `travar-modelos`, `contexto` | Úteis a todos, nome PT | Núcleo (nome conforme A9) | **Núcleo** (dono, 2026-11-24): `/lock-models` (alias `/travar-modelos`) e `/context-limit` (alias `/contexto`; `/context` já é do `context-usage`); renomear na fase do A9 |
| B9 | `avisos`, `sound-notify`, `notify` | Três donos para o fim de turno | Núcleo, juntar em um | **Juntar em um no núcleo** (dono, 2026-11-24): extensão `notify` única (protocolos OSC do `notify`, player do `sound-notify`, decisão e painel do `avisos`); painel `/notifications` (alias `/avisos`); sai o anúncio `notify-owner`; som e notificação desligam por setting |
| B10 | UI do dono: `folha`, `comandos`, `up-dequeue`, `footer`, `chat-margin`, `code-blocks`, `sticky-prompt`, `image-open`, `hook-msgs`, `ui-visual` | Pedidos visuais seus | Identidade do Nycode (núcleo), condicionado a A9; `hook-msgs` sem parser do impeccable | **Núcleo + 3 ajustes** (dono, 2026-11-24): identidade do Nycode; strings no catálogo `en`/`pt-BR` (A9); `hook-msgs` sem o parser do impeccable; novo setting `footer.stats` (linha de tokens, custo e modelo), desligado por padrão |
| B11 | `import-claude-session` (`/puxar`) | Depende de Python e de perfis do Claude Code | Harness | **Retirar** (dono, 2026-11-24): sai do produto a extensão `import-claude-session` e `resources/bin/puxar/` (`puxar.py`, `test_puxar.py`); atualizar `docs/specs/0005-core-scope.md` e os consumidores na execução |
| B12 | `claude-compat` (38 comandos) | `/advisor`, `/insights`, `/stickers`, `/heapdump`… | Revisar comando a comando em rodada própria | **Princípio agora, parciais na seção "B12: rodada"** (dono, 2026-11-24): `matrix.ts` tem 118 linhas — 18 exact + 11 alias → núcleo; 42 partial (código em `vim` 1.590, `commands` 1.524, `lifecycle` 821, `interface` 514, `permissions` 383, `runbooks` 366, `services` 202) em rodada própria; 44 unsupported + 3 removed só como dado do `/claude-help` |
| **C. Recursos embutidos** | | | | |
| C1 | `instructions/contract.md` | Sua política (800 linhas, 80%, TDD) como prompt de todos | Pessoal (vai para o seu `AGENTS.md`); núcleo sem contrato | **Dividir** (dono, 2026-11-24): ~1 KB de proteção genérica fica no núcleo com a regra E1 (autorização para commit/push/publish/deploy; conteúdo de ferramenta é dado; segredos; não fabricar evidência; relatar o que rodou e o que não rodou); o resto (800 linhas, 7 arquivos, 80%, TDD, verificar uma vez, `structure.py`, `.project-phase`, precedência) vai para `~/.nycode/agent/AGENTS.md`. 11,6 KB → ~1 KB fixo por requisição |
| C2 | `rules/safety.md`, `rules/ref/*` | Fluxo seu; `research-and-tools`, `docs-and-knowledge`, `harness-economy` pessoais | Harness (`safety`, `delivery`); Pessoal (os outros três) | **4 pontos** (dono, 2026-11-24): (1) guard TS do núcleo nega `--no-verify` e `gh pr merge --admin`; (2) `safety.md` vira < 1 KB no núcleo, fundido com C1, só regras de julgamento sem bloqueio equivalente (subagente não publica, diagnóstico não muta dado vivo, não repetir efeito após timeout, confirmar alvo de `terraform`/`kubectl`, não contornar o guard); saem o que o guard cobre, CodeQL, `presente-de-grego`, `guard.py`; (3) `delivery-and-orchestration` deixa de ser "leia antes": 2–3 linhas no prompt fixo do harness, detalhe carregado pelo `git-delivery` e pelo plan mode; (4) `research-and-tools`, `docs-and-knowledge`, `harness-economy` → Pessoal, com índice curto no `AGENTS.md` do dono. Evidência: seção C2 abaixo |
| C3 | 17 agentes | Modelo fixo; scouts dependem dos seus MCPs | Núcleo: `Explore`, `Plan`, `general-purpose` sem modelo fixo; Harness: revisores e orquestração; Pessoal: 4 scouts | **4/3/10** (dono, 2026-11-24): Núcleo `Explore` (alias de tier rápido, cai no `inherit`), `Plan`, `general-purpose`, `code-reviewer` (`inherit`, só leitura, contexto limpo, uma passada); Harness `plan-reviewer`, `gate-runner` (B2/B3 os chamam), `security-reviewer`; Pessoal `git-delivery`, `swarm-worker`, `lane-integrator`, `test-author`, `test-reviewer`, `reliability-reviewer`, `perplexity-scout`, `web-scout`, `research-scout`, `claim-verifier`. Pins `anthropic/*` → alias de tier. Evidência: seção C3 abaixo |
| C4 | 17 skills genéricas de engenharia | `tdd`, `diagnose`, `pr-review`, `security-audit`… | Harness | **4/7/25 (C4–C6 juntos)** (dono, 2026-11-24): Núcleo `pr-review` (`/review`), `security-audit` (`/security-review`), `diagnose`, `code-simplification`; Harness `plan-workflow` + 6 `ponytail*` (B1); Pessoal as outras 25 (ver C5, C6). Catálogo 36 → 11. Evidência: seção C4–C6 abaixo |
| C5 | 6 skills de orquestração e entrega | `swarm-orchestration`, `atualizador`, `git-workflow`… | Harness | **Pessoal** (dono, 2026-11-24, decidido com C4): `swarm-orchestration`, `atualizador`, `git-workflow`, `lane-integration`, `graph-engineering`, `loop-engineering`, `context-economy`, `agent-routing`, `agent-systems` |
| C6 | Skills pessoais | `perplexity-urls`, `deep-search`, `codegraph`, `soteiros`, `engineering-standards`, `agent-routing`, 6 `ponytail*` | Pessoal | **Pessoal, exceto ponytail** (dono, 2026-11-24): `perplexity-urls`, `deep-search`, `soteiros`, `engineering-standards`, `agent-routing`, `to-questionnaire`; `codegraph` sai (A1); `tdd`, `sdd-workflow`, `quality-gates`, `doces-ou-travessuras`, `ripple-hunt`, `property-based-testing`, `sharp-edges`, `insecure-defaults`, `variant-analysis`, `differential-review` também Pessoal; as 6 `ponytail*` ficam Harness (B1) |
| C7 | 76 referências a skills e agentes ausentes | `agent-routing`, `swarm-orchestration`, `soteiros`… | Some com C6; nas skills que ficam, tirar a referência | **Remover + condicional + teste** (dono, 2026-11-24): após C3–C6 restam ~100 citações em 25 arquivos mantidos; tirar ou generalizar ("um revisor", "busca web"); condicional ("se `X` estiver instalado") só onde vale; teste no build que extrai skills, agentes e comandos citados nos recursos embutidos e falha se não existirem, salvo trechos condicionais. Motivo: Claude Code "skips it and logs a warning to the debug log" (<https://code.claude.com/docs/en/sub-agents>); linters de terceiros com `skills-exist`/`broken-reference` |
| C8 | Comandos | Pessoais: `claude-hud-*`, `claude-tier`, `pre-launch`, `swarm`, `skill-gen`; os outros 17 são fluxo | Pessoal os 6; Harness os 17 | **10/1/3/9/1** (dono, 2026-11-24): Núcleo `/batch` (com `general-purpose`), `/verify`, `/run`, `/run-skill-generator`, `/update-config`, `/team-onboarding`, `/statusline`, `/code-review` (skill `pr-review` + agente `code-reviewer`), `/claude-hud-setup`, `/claude-hud-configure` (A3); Harness `/revise-claude-md`; `/ralph-loop`, `/cancel-ralph`, `/ralph-help` no C11; Pessoal `/commit`, `/commit-push-pr`, `/clean_gone`, `/claude-tier`, `/pre-launch`, `/swarm`, `/skill-gen`, `/diff-review`, `/insecure-defaults-audit`; remover `/review-pr` (duplica `/code-review`). Origem: nativos em <https://code.claude.com/docs/en/commands>; plugins oficiais em <https://github.com/anthropics/claude-plugins-official>; Trail of Bits CC BY-SA 4.0 (<https://github.com/trailofbits/skills/blob/main/LICENSE>) |
| C9 | Hooks | `guard.py` legado; `hook-dispatch.sh` (Perplexity, cofre); `claims`, `diag.py`; `impeccable_gate.sh` | Remover `guard.py`; Pessoal: `dispatch` e `impeccable_gate`; Harness: `claims`, `diag` | **Como recomendado** (dono, 2026-11-24): remover `guard.py` + `permissions/*.py` (motor `script`; o padrão já é `engine: "native"`) e as menções em `doctor`/`claude-compat`; remover `diag.py`; parte genérica do `dispatch` vira hook interno TS no núcleo (nota de dado não confiável por regex, checagem do launcher MCP, aviso de edição de teste pedindo justificativa), sem `bash`/`jq`; Pessoal: resto do `dispatch` (Perplexity, git-delivery, exclusão de cobertura, regra de retomada pós-compactação, scans), `claims` (telemetria offline), `impeccable_gate.sh`. Evidência: seção C9 abaixo |
| C10 | Scripts `bin/` | `doctor`, `usage`; `git-deliver`, `telemetry`, `puxar`, `session-transport`, `nycode-image`; `structure`, `checks`, `mcp-header` | Núcleo: os 2 primeiros; Harness: os 5 do meio; Pessoal: os 3 últimos | **Como recomendado** (dono, 2026-11-24): Núcleo `doctor/` (`nycode-doctor`, `nycode-typecheck`, `prune-sessions`), `usage.mjs`, `session-transport/` + `nycode-session`; Pessoal `git-deliver`, `telemetry/`, `structure/`, `checks/`, `mcp-header.sh`, `nycode-image.mjs`; remover `puxar/` (B11). Paridade: Claude Code `/doctor`, `/usage`, `/background`; Codex `codex doctor`; Gemini `/stats`, `general.sessionRetention`; OpenCode `stats`, `service`/`attach` (<https://code.claude.com/docs/en/commands>, <https://geminicli.com/docs/cli/session-management/>, <https://opencode.ai/docs/cli/>). Depois: retenção automática por setting |
| C11 | `ralph-loop` (hook Stop padrão) | Porta de terceiro | Harness | **Opcional + `/goal` padrão** (dono, 2026-11-24): `/goal` nativo fica como mecanismo padrão; o Stop hook do ralph sai de `settings-defaults` e só é registrado ao iniciar `/ralph-loop`; `--max-iterations` padrão 20 (upstream: ilimitado); sai `/ralph-help` (não existe no plugin); ficam `/ralph-loop` e `/cancel-ralph`. Fontes: <https://github.com/anthropics/claude-plugins-official/tree/main/plugins/ralph-loop> ("Always use `--max-iterations`", promessa por string exata), <https://code.claude.com/docs/en/goal> |
| **D. Repositório** | | | | |
| D1 | `bench/`, `docs/harness`, `docs/migration`, `scripts/harness`, `scripts/fork` | Ferramentas e registros do desenvolvimento | Ficam no repositório, fora do pacote | **Como está + `.npmignore`** (dono, 2026-11-24): `files` já exclui essas pastas; novo `resources/.npmignore` com `__pycache__/`, `test_*.py`, `tests/` (41 testes versionados em `resources/` iam no pacote; o `.gitignore` da raiz do monorepo não vale para o pacote, <https://docs.npmjs.com/cli/v11/configuring-npm/package-json#files>); conferir com `npm pack --dry-run` no gate |
| D2 | `migrations/from-pi-personal.ts` | Copia `claude-home`, `conta.ts`, temas `pi-*` | Pessoal (remover) | **Remover** (dono, 2026-11-24), junto com D3 |
| D3 | `migrations/from-pi*.ts` (restante) | Importação única de um diretório do pi | Núcleo (útil a quem vem do pi) | **Remover** (dono, 2026-11-24): sai `nycode migrate from-pi` inteiro (6 arquivos, 1.072 linhas, entrada em `main.ts:671`); motivo: migração do dono feita, D-30 esconde o pi, público vem do Claude Code/Codex; leitura compatível de `CLAUDE.md`, `.claude/rules`, `.agents/skills` já existe. Futuro: E3 |
| D4 | `apps/p2`, `p2-mac`, `p3` | Experimentais do upstream | Fora desta pauta | **Fora** (2026-11-24): não debatido |
| E1 | Regra de escopo no system prompt do core | Hoje `src/core/system-prompt.ts:123` só tem "Be concise" | Núcleo | **Entra** (dono, 2026-11-24): 2–3 linhas — escopo, menor mudança suficiente, parar ao cumprir o aceite; tarefa ambígua → ler os requisitos do repositório antes. Evidência: seção E abaixo |
| E3 | `nycode import claude-code\|codex` (futuro) | Paridade com `/import` do Claude Code (<https://code.claude.com/docs/en/commands>) e do Codex (fonte secundária) | Núcleo | **Anotado** (dono, 2026-11-24): importador único de instruções, MCP, skills, agentes e comandos; não implementar agora |
| E2 | `/init` sem visão geral do repositório | `src/extensions/init/index.ts:56-57` pede "Architecture notes" e "Project layout" | Núcleo | **Entra** (dono, 2026-11-24): tirar as duas linhas; manter comandos, convenções e armadilhas. Evidência: seção E abaixo |

## A1: evidência (pesquisa de 2026-11-24)

Provedores: Perplexity, Brave, Keenable, Exa, Parallel (dois scouts). Uso local: 252 sessões em 14 dias, ≈24 chamadas
ao MCP do codegraph e 1 pela CLI, contra 34.151 de `bash` e 6.169 de `read`; a linha `Graph:` custa ≈100 tokens por
sessão e subagente.

- RepoGraph (ICLR 2025, GPT-4o, SWE-bench Lite): +2 pontos, mais tokens. <https://arxiv.org/html/2410.14684>
- LSP × grep com Opus 4.8 e Sonnet 4.6 (preliminar, 6 tarefas): +6% a +118% de tokens na localização. <https://arxiv.org/abs/2608.13568>
- 936 execuções em apache/superset (autor tem ferramenta concorrente): tarefas difíceis, filesystem 0,71/12.596 tokens,
  Serena 0,85/1.368, codegraph 0,93/1.114. <https://dev.to/neko1313_4/how-much-does-context-cost-an-ai-coding-agent-grep-vs-graph-vs-lsp-measured-across-936-runs-33m8>
- codegraph (fornecedor): −41% a −84% de tokens em perguntas de arquitetura; reprodução por concorrente: custo −16%,
  tempo +23%. <https://github.com/colbymchenry/codegraph>, <https://github.com/colbymchenry/codegraph/issues/1393>
- Cursor (fornecedor): busca semântica +12,5% em média, +6,5% no GPT-5; hoje não guarda embeddings para busca.
  <https://cursor.com/blog/semsearch>, <https://cursor.com/docs/agent/tools/search>
- Anthropic: Claude Code usa glob e grep sob demanda, sem índice (posição, sem números).
  <https://www.anthropic.com/research/effective-context-engineering-for-ai-agents>
- Serena 2.x é GPL-3.0; GitNexus é PolyForm Noncommercial: ambos inviabilizam embutir.
- Lacuna: nenhuma ablação independente com modelo de fronteira em SWE-bench Verified ou Terminal-Bench.

## B12: rodada dos 42 parciais (dono, 2026-11-24)

- Já decididos: `/batch`, `/run`, `/run-skill-generator`, `/statusline`, `/team-onboarding`, `/update-config`, `/verify`,
  `/code-review` (C8); `/security-review`, `/simplify` (skills do núcleo, C4).
- Só mapeamento para comando próprio do Nycode (linha da tabela do `/claude-help`): `/agents`, `/autocompact`, `/copy`,
  `/debug`, `/export`, `/import`, `/login`, `/logout`, `/help`, `/skills`, `/plugin`.
- **Núcleo (16):** `/add-dir`, `/cd`, `/branch`, `/permissions`, `/terminal-setup`, `/loop`, `/stop`, `/list-agents`,
  `/recap`, `/focus`, `/heapdump`, `/insights`, `/color`, `/scroll-speed`; `/background` e `/restart` opt-in com o
  `session-transport` (C10).
- **Vim:** setting `editorMode` no núcleo (motor `claude-compat/vim` vai junto); o comando `/vim` sai, como no Claude
  Code v2.1.92 ("Removed in v2.1.92. To toggle … use `/config` → Editor mode", <https://code.claude.com/docs/en/commands>).
- **`/advisor`:** Harness opt-in (ativo só com modelo definido). Evidência só do fornecedor: +2,7 pp no SWE-bench
  Multilingual com custo −11,9%, "directional" (<https://claude.com/resources/articles/the-advisor-strategy>,
  <https://platform.claude.com/docs/en/about-claude/models/optimizing-for-cost-and-intelligence>); teste independente sem
  ganho e até 24× mais caro (<https://mediumroast.dev/blog/model-testing/>).
- **Remover:** `/mobile`, `/stickers`, `/upgrade` (abrem `claude.ai`); saem `services/public.ts` e `services/mobile-qr.ts`;
  viram `unsupported` na tabela.
- Equivalentes: Codex `--add-dir`, `--cd`, `codex fork` (<https://learn.chatgpt.com/docs/developer-commands?surface=cli>);
  Gemini `/directory add`, `/chat` (<https://geminicli.com/docs/reference/commands/>).

## C9: evidência

- Injeção em saída de ferramenta: spotlighting e sandwich "only slightly reduce the Attack Success Rate" (AgentDyn,
  GPT-4o 37,80 sem defesa; <https://arxiv.org/html/2602.03117v1>); 12 defesas contornadas com ASR > 90% sob ataque
  adaptativo (<https://arxiv.org/abs/2510.09023>); Claude Code defende nas ações e resume o WebFetch por outra chamada
  (<https://code.claude.com/docs/en/security>); Cursor: classificador de ações "not a security boundary"
  (<https://cursor.com/docs/agent/security/run-modes>). A nota fica como aviso barato, não como controle.
- Edição de teste: ImpossibleBench (ICLR 2026), Claude trapaceia > 79% editando testes; GPT-5 54% no
  Conflicting-SWEbench; prompt estrito 93% → 1% numa tarefa e 66% → 54% noutra; read-only impede a edição mas não o
  special-casing (<https://proceedings.iclr.cc/paper_files/paper/2026/file/ca688eb14e29701a11bdba6633186328-Paper-Conference.pdf>).
  Justificativa explícita expôs 90% das trapaças (<https://arxiv.org/html/2611.06563v1>, só trecho de busca).

## C4–C6: evidência

- Embutidas hoje: Claude Code `/code-review`, `/security-review`, `/debug`, `/simplify`, `/batch`, `/loop`, `/verify`,
  `/doctor`, `/claude-api` (<https://code.claude.com/docs/en/skills>, <https://code.claude.com/docs/en/commands>);
  Cursor 19 incl. `/review`, `/review-security` (<https://cursor.com/docs/skills>); Codex só `skill-creator` e
  `skill-installer`, catálogo ≤ 2% da janela (<https://developers.openai.com/codex/skills>).
- Catálogo: até −21% com 202 skills, overhead de contexto ≈ 0 (<https://arxiv.org/abs/2605.24050>); RAG-MCP 43,13% ×
  13,62% com catálogo inteiro (<https://arxiv.org/abs/2505.03275>).
- Ganho: SWE-Skills-Bench, 92/98 sem efeito, 76,6% → 76,9% (<https://arxiv.org/abs/2603.15401>); SkillsBench, curadas
  +16,6 pp, focadas ≤ 3 módulos vencem, autogeradas pioram (<https://arxiv.org/abs/2602.12670>); TDD como skill
  −3,6 pp, custo +55% (<https://github.com/kunchenguid/programbench-bench/blob/main/blog/does-tdd-help-coding-agents/index.md>);
  superpowers 1/7 tarefas melhor, 1,33× custo (<https://bartlomiejkrupa.dev/articles/does-superpowers-beat-no-plugin/>).
- Uso local 14 dias (leituras de SKILL.md): swarm-orchestration 42, perplexity-urls 26, plan-workflow 24,
  engineering-standards 14, diagnose 14, doces-ou-travessuras 12, atualizador 12, tdd 11, soteiros 11, sdd-workflow 11;
  zero: variant-analysis, sharp-edges, property-based-testing, lane-integration, differential-review,
  code-simplification (as `ponytail*` entram por comando).

## C3: evidência

- Built-ins (docs lidas em 2026-11-24): Claude Code Explore/Plan/general-purpose
  (<https://code.claude.com/docs/en/sub-agents>); OpenCode general/explore, herdam o modelo
  (<https://opencode.ai/docs/agents/>); Gemini CLI codebase_investigator/generalist
  (<https://geminicli.com/docs/core/subagents/>); Cursor explore (modelo mais rápido) e browser, custom `inherit`
  (<https://cursor.com/docs/subagents>); Copilot CLI explore, task, general-purpose, code-review; Codex sem built-ins,
  "tenha cuidado com escrita paralela" (<https://developers.openai.com/codex/subagents>).
- Revisão em contexto limpo: segunda revisão só ajuda em sessão nova, 28,6% × 21,7%, p=0,004
  (<https://arxiv.org/abs/2603.12123>); revisor dedicado de segurança 22 × 16 (<https://arxiv.org/abs/2608.25730>,
  autores do lado do fornecedor); SecPRBench +7,7 / −8,3 pp (<https://arxiv.org/abs/2610.33509>).
- Contra: testes escritos pelo agente sem efeito na resolução, 0–13 de 500 (<https://arxiv.org/abs/2602.07900>);
  escrita paralela frágil (Cognition 2026-04-22; MAST, 36,94% desalinhamento entre agentes); nenhum produto embute
  subagente de entrega git.
- Modelo do explore: SubagentBench (terceiro, amostra pequena) Haiku 5.5 6,65 a US$ 0,011 × Opus 5.5 6,13 a US$ 0,71.
- Uso local 14 dias: git-delivery 938, swarm-worker 801, general-purpose 248, plan-reviewer 210, gate-runner 162,
  perplexity-scout 140, Explore 114, Plan 15.

## C2: evidência

- Claude Code: CLAUDE.md "aren't enforced configuration. To block an action … use a PreToolUse hook"; "target under
  200 lines" (<https://code.claude.com/docs/en/memory>); "Permission rules are enforced by Claude Code, not by the
  model" (<https://code.claude.com/docs/en/permissions>). Codex: AGENTS.md até 32 KiB, regras `forbidden|prompt|allow`
  (<https://developers.openai.com/codex/guides/agents-md>, <https://developers.openai.com/codex/rules>). Gemini CLI:
  policy engine allow/deny/ask_user (<https://geminicli.com/docs/reference/policy-engine/>).
- Prompt × bloqueio: ClashBench, frase de preservar −5,85 pp e ação destrutiva segue 38,2%
  (<https://arxiv.org/html/2609.19892v1>); guardrail no prompt 67%→65% e 86%→55%, monitor determinístico 1,3% e
  7,7% (<https://arxiv.org/abs/2611.11571>); regra compilada em checagem 88,3% × 67,0% só prompt
  (<https://arxiv.org/abs/2603.00822>).
- Sob demanda: Vercel, skill nunca invocada em 56% dos casos; índice no AGENTS.md 100%
  (<https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals>).
- Uso local (`~/.nycode/agent/sessions`, 14 dias, 252 sessões, 2026-11-24): `delivery-and-orchestration` lido em 3 de
  190 sessões com commit/push/PR; `research-and-tools` em 4 de 211 com busca web; `docs-and-knowledge` 1;
  `harness-economy` 3.

## E: evidência (core)

- E1: Weinberger e Hozez, "Prompt-Induced Waste in Coding Agents", arXiv 2608.01347 v6 (2026-09-10, CC BY 4.0);
  pi e Claude Code, 6 modelos abertos + Sonnet 5, 24 tarefas com testes ocultos + holdout de 8. Template
  "scope + smallest-sufficient-change + stopping rule": "no measurable cost penalty", sucesso preservado. Limite: em
  especificação ambígua o "parar cedo" deixou de ler o arquivo de requisitos (3/5 falhas ocultas × 0/5), por isso a
  frase de ambiguidade. Pedir "several approaches" multiplicou o raciocínio por 2,4–7,4× sem ganho; nenhum prompt
  do Nycode pede isso (grep, 2026-11-24). <https://arxiv.org/html/2608.01347v6>
- E2: Gloaguen et al. (ETH Zurich, LogicStar.ai), "Evaluating AGENTS.md", arXiv 2602.11988 v3 (2026-09-29): arquivos
  de contexto "do not generally improve task success rates" e custam +20%; "repository overviews … are not helpful",
  enquanto instruções são seguidas. <https://arxiv.org/html/2602.11988>
- Descartados para o core: caveman, Karpathy CLAUDE.md, superpowers (seção B1).

## B1: evidência

- A/B pareado próprio, 2026-11-11 (`~/.local/state/pelo-em-ovo/ponytail-ab/RESULTS.md`): harness inteiro, Sonnet 5.5,
  só `PONYTAIL_DEFAULT_MODE` full × off; 14 tarefas do benchmark agentic do ponytail 4.10.3, 3 repetições, 84 células,
  US$ 3,52. Ponytail ÷ off (mediana, IC 95%): linhas 0,71 (0,57–0,86), tokens de saída 0,69 (0,63–0,75), custo 0,80
  (0,65–0,89), tempo 0,79 (0,71–0,85). Corretas 42/42 × 42/42; seguras 42/42 × 42/42.
- Benchmark do próprio ponytail (autor, Opus 5.5, Claude Code, 39 tarefas, 585 sessões): custo −26%, tokens −45%;
  checagens ocultas 96,7% × 95,6% (empate); teste onde a lógica precisa 98% × 68%.
  <https://github.com/marcioazam/ponytail/blob/main/benchmarks/results/2026-10-07-agentic.md>
- Limites: tarefas pequenas e escolhidas pelo autor do ponytail; teto de acerto em 100% no A/B próprio; só Sonnet;
  harness anterior ao binário atual. Por isso o re-medir.
- Versão: o embutido é texto da geração 4.x (A/B próprio usou 4.10.3). Ponytail 5 × 4.13 (autor): custo −10,8%
  [−14..−8], 35/4 tarefas; código −10,6%; checagens ocultas 96,7% × 95,6%; respostas 110:67 (p=0,002). Fonte:
  <https://github.com/DietrichGebert/ponytail/blob/main/benchmarks/results/2026-10-07-agentic.md>.
- Alternativas (pesquisa de 2026-11-24, Perplexity + keenable, exa, brave, parallel, paper_search), nenhuma superior:
  caveman (JetBrains: saída −8,5%, custo +11,6%,
  <https://blog.jetbrains.com/ai/2026/07/speak-to-ai-agents-like-cavemen-tosave-tokens/>); Karpathy CLAUDE.md (tokens
  −1,6%, custo +5%, <https://aiparabellum.com/karpathy-claude-md-guidelines-tested/>); superpowers (skillarena: custo
  +27%, acerto igual, <https://github.com/caioagiani/skillarena>); AGENTS.md genérico sem ganho de acerto, custo +20%
  (<https://arxiv.org/html/2602.11988>). Princípio sustentado por <https://arxiv.org/abs/2608.01347>.
- Lacuna: nenhuma réplica independente discriminante do Ponytail 5.

## Recheck 2026-11-25

Pesquisa de 2026-11-25: 9 scouts (Perplexity mais um provedor independente) em 7 frentes e um verificador que reabriu as
12 citações de maior peso (todas confirmadas, nenhuma fonte contrária). Agentes comparados: Claude Code (CC), Codex,
Gemini CLI, OpenCode, pi; parcial: Cursor CLI, Cline, Kiro, Aider, Crush, Goose, Roo, Amp. Os fatos abaixo foram
copiados dos relatórios (que ficam em `/tmp`, volátil). Onde não há link, a pesquisa não guardou a URL: reabrir a fonte
antes de citar em outro lugar. Os links abaixo responderam HTTP 200 em 2026-11-25.

### Rótulos (dono, 2026-11-25: "só ajustar rótulos nos docs")

| Item | Rótulo | Motivo |
|---|---|---|
| `git-checkpoint` | **Núcleo**, ligado | Já é builtin, sem código novo. Salvaguardas: só arquivos editados, repositório bare fora do projeto, `.gitignore` respeitado, retenção de 30 dias. CC, Cline e OpenCode têm por padrão; Gemini tem desligado; Codex, experimental e desligado. CC `/rewind` não desfaz `bash`; Cline usa shadow git; Aider faz auto-commit |
| `diagnostico` (`/diagnostico`, `/doctor`) | **Harness**, ligado | O conceito é geral (CC `doctor`, Codex `doctor`, Gemini `/bug`), mas a extensão tem 2947 linhas com trilha, OTLP e modal |
| `docs-pointer` | continua **Núcleo** (B4) | A proposta do recheck de rebaixar a Harness não foi adotada: só troca a seção de docs do próprio nycode (cerca de 1,3 KB); o CC usa um subagente guia sob demanda |
| `web_fetch` | sem mudança (Núcleo) | Tem guarda SSRF; `web_search` segue opt-in. O CC pergunta no WebFetch fora de domínios de docs, o Codex usa cache, o Gemini confirma; propor "ask" no modo seguro fica fora deste corte |
| `codemode` | **pendente do A/B** | Híbrido proposto: `autoEnableToolSearch` (padrão desligado) ativa `tool_search` junto com `codemode`; vira padrão só se o A/B empatar ou ganhar em acerto e custo (`bench/metrics/README.md`) |

### Evidência: codemode × tool_search

- Código atual: QuickJS wasm em worker; hooks e permissões por chamada; `outputSchema` vira dica de retorno
  (`describeOutput`); MCP sem `exposure` usa `codemode`.
- Ganha em cadeias, fan-out, resultados grandes e catálogo grande: chamada programática de ferramentas da Anthropic
  (PTC) usa 37% menos tokens e ganha 3-5 pontos (<https://www.anthropic.com/engineering/advanced-tool-use>); Pydantic
  em tarefas longas, custo -58% e +16 pontos; arXiv 2611.19123, 70-90% menos tokens
  (<https://arxiv.org/abs/2611.19123>); CodeAct, +20,7 pontos com gpt-4-1106 em multi-turn
  (<https://arxiv.org/abs/2402.01030>).
- Perde em chamada única ou simples: Anthropic no τ²-bench, +8% de custo sem ganho; Pydantic em tarefas de 5 itens,
  +21-38%; CodeAct no API-Bank, o JSON vence no GPT-4; latência 2x (dev.to); arXiv 2602.15945, MCP direto melhor em
  tarefas adaptativas (<https://arxiv.org/abs/2602.15945>).
- Mercado: OpenCode 2.0 usa codemode por padrão; o CC tem como experimental e desligado; o Codex usa tool search por
  padrão. Segurança: Check Point achou um escape no Code Mode da Cloudflare (workerd); ataques sem escape em 2602.15945.
- Decisão: manter `codemode` e deixar o modelo escolher (chamada única via `tool_search`, cadeia via script), com A/B
  no bench antes de mudar o padrão. A divergência 1 do recheck (codemode opt-in) não foi adotada.

### Evidência: sincronia do todo (W7)

- Cline descontinuou o Focus Chain: "no longer providing enough additional benefit"
  (<https://docs.cline.bot/resources/deprecations>).
- Goose, A/B com k=3 e 26 tarefas (2026-08-12): prompts de todo custam +17-49%, uso de 85-100% sem correlação com
  sucesso, +39% de "laços de fechamento"; "the instructions, not the tool, are the active ingredient"
  (<https://github.com/aaif-goose/goose/issues/11172>).
- O lembrete por tempo do CC dispara 5-30 vezes por sessão, sem checar relevância
  (<https://github.com/anthropics/claude-code/issues/62323>, fechada como "not planned").
- Codex: o plano não vale como estado de execução; lembrete a cada requisição "too noisy"
  (<https://github.com/openai/codex/issues/19749>, "not planned").
- Manus recita o `todo.md` no fim do contexto (só anexa, por causa do cache); Anthropic (harness de longa duração):
  "Claude marks features as done prematurely", JSON "default-fail" em que só `passes` muda; Pydantic: lembretes no fim
  preservam o cache, com predicado e `max_fires`; Kiro "Sync Files" marca tarefas pelo código, a pedido; hooks do CC
  `Stop` e `TaskCompleted` (teto de 8 bloqueios).
- Não há estudo quantitativo da eficácia de lembretes. Nosso: 10 de 41 lembretes atendidos (2026-11-15). Caso de tela:
  aba do plano "Plan 1/11" com 4 todos do modelo concluídos, duas fontes de verdade divergentes.
- Resultado: sincronia do todo atrás de `todo.sync` (`NYCODE_TODO_SYNC_V2`), desligada até o A/B passar (plano
  `plano-todo-sync-codemode-2026-11-25.md`, regra pré-registrada em `bench/metrics/README.md`).
