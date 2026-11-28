# Auditoria Técnica: Codex CLI (`rust-v0.172.0`) vs `nycode`

Comparação estrita baseada em leitura direta de código, citações `arquivo:linha` e medições determinísticas (`o200k_base`) entre o OpenAI Codex CLI (`openai/codex`, Apache-2.0, Rust em `codex-rs/`) e o `nycode` (TypeScript). Escopo **100% documental** em worktree dedicada — zero alterações em código, testes, prompts ou configurações do `nycode` e zero compilação ou execução de código do Codex.

## 1. Referências e Versões Analisadas

| Repositório | Caminho local | Ref / Tag | Commit SHA | Licença |
|---|---|---|---|---|
| `openai/codex` | `~/source/codex-ref` (clone raso read-only) | `rust-v0.172.0` (`fc3036dba44468096953f0e832f3fecd3adc0228`) | `3d86e43b075adeba2193ec5c22ac92f55afd82e6` | Apache-2.0 (`LICENSE:1-201`, `NOTICE:1-6`) |
| `nycode` | `~/source/nycode-audit-codex` (ramo `docs/codex-vs-nycode-audit`) | `origin/main` | `00fed2ae615016b328ebfb48bfaa49814bf1dbc4` | Conforme raiz do repositório |

## 2. Resumo Executivo e Contagem `A / B / C`

- **Universo inventariado**: **6,596** arquivos de código/prompt/teste em `codex-rs/`, `sdk/` e `codex-cli/` (`4,002` código, `72` prompt, `2,522` teste; `2,459,901` LOC; **5,977** mapeados para o `nycode`, **619** `sem equivalente`), reconciliados 100% com os **10,473** arquivos rastreados em `git ls-files`.
- **Total de itens avaliados**: **38** frentes técnicas concretas:
  - **Classe A (`5` achados)** — ganho operacional/segurança/latência/disco imediato com **0 tokens extras**, sem alterar comportamento de modelo, prompts ou esquemas, e sem dependência nativa:
    1. `BoundOutput` (`-o`) e `exit(1)` em `--mode json` quando o turno falha ([Achado 01](achados/01-exec-bound-output-e-exit-json.md))
    2. Redação regex de segredos em texto livre para `crash-log.ts` e `bug-report.ts` ([Achado 02](achados/02-redacao-segredos-em-artefatos-locais.md))
    3. Sticky routing `x-codex-turn-state` + ordenação de campos JSON antes de `input` ([Achado 03](achados/03-sticky-routing-turn-state-e-ordenacao-json.md))
    4. Lock cross-processo de escritor + `.jsonl.zst` transparente em `node:zlib` ([Achado 04](achados/04-writer-lock-e-zstd-rollout.md))
    5. Cache do índice BM25 entre chamadas em `tool_search` ([Achado 05](achados/05-cache-indice-bm25-tool-search.md))
  - **Classe B (`17` achados)** — mexem em segurança/sandbox OS, loop, compactação, esquemas, prompts ou latência/dependências nativas; todos exigem eval pareada (`packages/evals/` ou `bench/` conforme [docs/bench/RUNBOOK.md](../../bench/RUNBOOK.md)) antes da adoção:
    - **P1 (`5`)**: limpeza de ambiente `process.env` + `tree-sitter-bash` ([11](achados/11-parser-shell-treesitter-e-env-secrets.md)), sandbox OS `bwrap`+seccomp/Seatbelt ([06](achados/06-sandbox-os-bwrap-seccomp-seatbelt.md)), escalonamento in-turn `ToolOrchestrator` ([08](achados/08-escalonamento-in-tool-orchestrator.md)), poda + compactação em downshift de modelo ([10](achados/10-compactacao-podas-e-model-downshift.md)), capping 4-pass de schemas MCP + hash SHA de hooks ([19](achados/19-mcp-schema-capping-e-hook-trust.md)).
    - **P2 (`8`)**: orçamento `<skills>`/`32 KiB` `AGENTS.md` ([16](achados/16-orcamento-skills-e-agents-md-markers.md)), `RwLock` + dispatch paralelo ([09](achados/09-execucao-hibrida-rwlock-e-streaming.md)), subagentes in-process/`fork_turns`/schema enxuto ([15](achados/15-subagentes-in-process-fork-turns-e-schema.md)), `--output-schema` em `-p` ([12](achados/12-exec-output-schema.md)), `token_budget` descendente no `/goal` ([18](achados/18-goal-token-budget-descendente.md)), política formal de retry + OTEL ([22](achados/22-otel-nativo-e-retry-policy-estruturada.md)), prewarm WS + busca fuzzy em memória ([21](achados/21-file-search-nucleo-prewarm-ws-e-retry-after.md)), memória automática opt-in em 2 fases ([17](achados/17-memoria-background-duas-fases.md)).
    - **P3 (`4`)**: proxy de egresso + credential broker ([13](achados/13-proxy-egresso-e-credential-broker.md)), auto-revisor Guardian read-only ([14](achados/14-guardian-auto-reviewer.md)), pool PTY persistente `exec_command`/`write_stdin` ([20](achados/20-unified-exec-pty-persistente.md)), `apply_patch` Lark condicional a OpenAI ([07](achados/07-apply-patch-lark-freeform.md)).
  - **Classe C (`16` rejeitados)** — já cobertos melhor no `nycode` (`/rewind` vs `GhostCommit` retirado no Codex; `/btw`, `/recap` 0-token, `/diff`, `/code-review`, `/advisor`; QuickJS WASM `codemode`; hooks `Prompt`/`Agent`/`Http`/`UserBash`; juiz externo `Haiku` no `/goal`; JSONL único em árvore), proibitivos em tokens (prompts `4,365–5,070` tok), descontinuados (`SpawnCsv` `Stage::Removed`) ou proprietários da nuvem/desktop OpenAI ([rejeitados.md](rejeitados.md)).

## 3. Comparativo Medido de Tokens (`o200k_base`)

Medições exatas via `tiktoken` (`o200k_base`):

| Superfície | Codex (`rust-v0.172.0`) | `nycode` (`00fed2ae`) | Razão Codex / `nycode` |
|---|---|---|---|
| System prompt base completo | `4,365` tok (`default.md`) / `4,564` tok (`gpt_5_2_prompt.md`) / `5,070` tok (`gpt_5_1_prompt.md`) / `1,624` tok (`gpt-5.2-codex_prompt.md`) | `785` tok (interativo com `contract.md`) / `498` tok (sem contrato) / **`614` tok** (`headless-lean` em `-p`) | **`5.6×` a `7.4×` menor no `nycode`** |
| Bundle padrão de ferramentas | **`990` tok** (`exec_command` `334` + `write_stdin` `167` + `apply_patch` `252` + `update_plan` `160` + `view_image` `75`) | **`619` tok** (`read` `152` + `bash` `144` + `edit` `237` + `write` `84`) | **`1.6×` menor no `nycode`** |
| Edição (`apply_patch` vs `edit+write`) | **`252` tok** (`apply_patch.lark` = `173` tok) | `321` tok (`edit` `237` + `write` `84`) | Codex `-69` tok em schema |
| Subagentes (schema individual `subagent`) | Namespace separado por operação | **`680` tok** (`3,162` bytes; omitido em `-p` topo por `headless-lean`) | Ponto claro de enxugamento (`Achado 15`) |
| Tool search | `151` tok | **`95` tok** | `1.59×` menor no `nycode` |
| Templates auxiliares Codex | Guardian (`1,994` + `1,565`/`1,876` tok), `/goal` continuation (`1,223` tok), Code Mode preâmbulo+exec+wait (`~1,378` tok) | `/recap` (`0` tok), `/goal` avaliador externo compacto, `codemode` sob demanda | Custos evitados pelo `nycode` |

## 4. Índice dos Documentos da Auditoria

- [inventario.md](inventario.md) — resumo quantitativo, reconciliação `10,473 == git ls-files`, tabela por crate e links para as **13** partições em `inventario/*.md`.
- [censo.md](censo.md) e [censo-flags.md](censo-flags.md) — extração mecânica completa de `226` `FeatureSpec`, `31` subcomandos CLI, `68` slash commands TUI, `14` eventos de hook, `328` env vars `CODEX_*`/`OPENAI_*` e `281` métodos JSON-RPC do App Server.
- [matriz.md](matriz.md) — matriz comparativa completa em 9 colunas para todas as 26+ frentes auditadas.
- [backlog.md](backlog.md) — backlog priorizado (5 Classe A primeiro, depois 17 Classe B por Benefício/Custo).
- [rejeitados.md](rejeitados.md) — os 16 itens Classe C descartados com `arquivo:linha` e justificativa objetiva.
- [fontes.md](fontes.md) — SHAs, vetting `presente-de-grego`, stats do `codegraph`, buscas web, URLs HTTP 200, metodologia `o200k_base` e lacunas.
- Achados individuais em `achados/`:
  - Classe A: [01](achados/01-exec-bound-output-e-exit-json.md), [02](achados/02-redacao-segredos-em-artefatos-locais.md), [03](achados/03-sticky-routing-turn-state-e-ordenacao-json.md), [04](achados/04-writer-lock-e-zstd-rollout.md), [05](achados/05-cache-indice-bm25-tool-search.md)
  - Classe B: [06](achados/06-sandbox-os-bwrap-seccomp-seatbelt.md), [07](achados/07-apply-patch-lark-freeform.md), [08](achados/08-escalonamento-in-tool-orchestrator.md), [09](achados/09-execucao-hibrida-rwlock-e-streaming.md), [10](achados/10-compactacao-podas-e-model-downshift.md), [11](achados/11-parser-shell-treesitter-e-env-secrets.md), [12](achados/12-exec-output-schema.md), [13](achados/13-proxy-egresso-e-credential-broker.md), [14](achados/14-guardian-auto-reviewer.md), [15](achados/15-subagentes-in-process-fork-turns-e-schema.md), [16](achados/16-orcamento-skills-e-agents-md-markers.md), [17](achados/17-memoria-background-duas-fases.md), [18](achados/18-goal-token-budget-descendente.md), [19](achados/19-mcp-schema-capping-e-hook-trust.md), [20](achados/20-unified-exec-pty-persistente.md), [21](achados/21-file-search-nucleo-prewarm-ws-e-retry-after.md), [22](achados/22-otel-nativo-e-retry-policy-estruturada.md)

## 5. O Que Não Foi Lido e Lacunas

1. **Excluídos explicitamente por regra e reconciliados**: `third_party/` (`94` arquivos), `codex-rs/vendor/` (`51` arquivos de empacotamento `bubblewrap`), schemas gerados (`1,161` arquivos), snapshots `.snap`/JSON/MD não-prompt (`2,240`) e scripts/ci/root fora do escopo (`331`).
2. **Leitura linha a linha em testes e UI pura**: entre os `6,596` arquivos inventariados, os `2,522` arquivos de teste e widgets cosméticos da TUI Ratatui foram catalogados integralmente no inventário por papel/equivalente, enquanto a leitura profunda linha a linha concentrou-se no core, segurança, loop, ferramentas, protocolo, compactação, hooks, skills, memórias, `/goal`, subagentes, exec, rollout, rede, segredos e telemetry.
3. **Execução**: nenhum binário Rust do Codex foi compilado ou rodado, nem houve execução de provedores pagos no `nycode` ([fontes.md](fontes.md)).

## 6. Comandos de Verificação

```bash
cat docs/audits/codex-vs-nycode/inventario/*.md | grep -c '^| `'
python3 scripts/check-refs.py
python3 scripts/ci/lint/residuo/residuo.py --root .
python3 scripts/ci/lint/criterio2/criterio2.py --root .
bash scripts/check-leaks.sh --tree
git diff --stat origin/main -- . ':!docs/audits/codex-vs-nycode'
```
