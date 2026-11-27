# Auditoria: OpenCode 2.x x nycode

Comparação do OpenCode v2.4.2 (anomalyco/opencode, MIT) com o nycode, para listar o que agregaria ao harness sem piorar
custo x benefício. Só documentação: nenhum código, teste, config ou prompt do nycode foi alterado.

| | Repositório | Ref | SHA |
|---|---|---|---|
| OpenCode | <https://github.com/anomalyco/opencode> | tag `v2.4.2` (2026-11-25) | `fc31a485317970bcf6be7b431a9830aaef875731` |
| nycode | este repositório | `origin/main` | `00fed2ae615016b328ebfb48bfaa49814bf1dbc4` |

## Índice

- [inventario.md](inventario.md): cada um dos 8809 arquivos de código do OpenCode com o dono no nycode (detalhe em
  `inventario/<grupo>.md`).
- [matriz.md](matriz.md): 41 linhas, arquivo:linha dos dois lados, linha de base de tokens medida.
- `achados/`: 20 achados (A: 01-05, 19; B: 06-18, 20), um arquivo cada.
- [censo.md](censo.md): extrator sobre os 8809 arquivos; toda feature registrada (plugin, tool, hook, rota) triada.
- [backlog.md](backlog.md): ordem de execução proposta.
- [rejeitados.md](rejeitados.md): 36 itens classe C com motivo.
- [fontes.md](fontes.md): buscas, URLs, vetting do clone, método de medição, lacunas.

## Método

1. Clone raso da última tag estável, vetado com `presente-de-grego` antes da leitura (`fontes.md`); nada instalado nem
   executado do OpenCode.
2. Pesquisa web: Perplexity + Exa (independente); todo fato usado conferido no clone.
3. nycode: `codegraph sync` no índice do checkout principal, `codegraph` e `rg` no worktree limpo
   `~/source/nycode-audit-opencode` (branch `docs/opencode-vs-nycode-audit`, base `origin/main`).
4. Inventário gerado por regras deterministas de dono (`inventario.md`, Método), conferido contra `git ls-files`.
5. Matriz por área: leitura das funções correspondentes dos dois lados, linhas conferidas com `rg -n`/`sed -n`.
6. Medição de tokens com `o200k_base` (`fontes.md`, Medições).
7. Classes: A = custo zero e não muda o comportamento do modelo; B = gasta tokens ou mexe em prompt, schema ou loop, ou
   muda a assertividade (exige eval); C = pior, coberto ou irrelevante. Na dúvida, B.

## Medições (o200k_base)

| Item | OpenCode | nycode |
|---|---:|---:|
| Prompt de sistema base com as 4 tools default | 413 | 447 |
| Contrato embutido K7 (quando ligado) | — | 250 |
| Schemas read + edit + write + shell/bash | 1013 | 622 |
| Prompts por família (OC): gpt / gpt-astra / gpt-6.2 / meta / trinity / kimi | 563 / 794 / 1559 / 1613 / 1660 / 1804 | — |
| Juiz do /goal / lembrete / continuação / kickoff (OC) | 298 / 60 / 122 / 173 | — |
| Mensagem de continuação por limite de saída (OC) | 32 | — |

O custo fixo por requisição do nycode é menor que o do OpenCode (~1069-1319 vs ~1426). Nenhum achado se justifica
por "enxugar como o OpenCode".

## Resumo executivo

O OpenCode 2.x não é mais barato por requisição; o que ele tem de melhor está em **quando** e **sobre qual prefixo**
gasta tokens:

1. **Compactação (achado 06, B, P0).** O nycode serializa a conversa como texto e pede o resumo sem cache
   (`packages/coding-agent/src/core/compaction/compaction.ts:618-631,714-735`), bloqueando o turno. O OpenCode pede o
   resumo sobre o mesmo prefixo que acabou de ir ao provedor, 60k tokens antes do teto, em background e só com o cache
   vivo (`packages/core/src/session/compaction.ts:156-164,347-400`). Estimativa: ~150k tokens de input cheio viram
   ~15k equivalentes numa compactação de 150k. Exige eval de qualidade do resumo.
2. **/goal (achados 07 e 08, B).** O revisor do OpenCode reaproveita o cache da sessão e devolve `next_step`; o
   objetivo é reinserido após compactação sem mover o breakpoint da cauda; estagnação corta em 3 rodadas (nycode: 8).
3. **Ergonomia sem tokens (A).** Reparo de input de tool (01), snapshots por passo que pegam mudanças de shell + `/redo`
   (02), Esc que devolve a última mensagem (03), aprovações salvas (04), regras de permissão declarativas (05).
4. **Onde o nycode já é igual ou melhor (C).** Cache de prompt e mudança de tools, truncamento, casamento difuso do edit,
   subagentes (modos, roteamento, profundidade), hooks, árvore de sessão, LSP enxuto. O V2 do OpenCode não removeu o LSP
   por custo: o código tem TODOs "after LSP runtime exists" (`packages/core/src/tool/plugin/edit.ts:256`,
   `write.ts:33`, `file-mutation.ts:191`).

## Navegador nativo e features próprias do OpenCode

Avaliadas uma a uma (matriz 11, 24, 37-39; rejeitados R06, R19-R21, R25-R26; achados 14 e 18):

| Feature própria | Veredito | Por quê |
|---|---|---|
| Navegador nativo do app desktop (`packages/plugin-browser`, 38 operações) | C (R25) | Exige app Electron; a capacidade do agente já vem do Playwright MCP/CDP diferidos, custo fixo zero. Ganho do OC é UX desktop, assunto de `apps/p2`. |
| Aviso de fork (`plugin/fork-notice.ts`) | B (achado 18) | Barato (226 tok por fork) e cobre um risco real com subagentes em background. |
| Busca de sessões pelo modelo (`tool/plugin/session-search.ts`) | B (achado 14) | Útil em retomada; custo fixo zero se diferida. |
| Automações, `/schedule` (`automation.ts`) | C (R06) | Schema extra permanente; cron/systemd resolvem. |
| Geração de imagem, vídeo, voz | C (R19) | Fora de harness de código. |
| Referências a repos externos (`reference.ts`) | C (R20) | Skills/AGENTS.md cobrem. |
| Máquinas remotas, workspaces, worktrees gerenciados | C (R21) | Produto distinto (`apps/p3`). |
| Aquecimento de cache (`plugin/warming.ts`) | C (R26) | nycode já tem, com decisão por custo. |

## Contagem

| Classe | Quantidade | Onde |
|---|---:|---|
| A | 6 | achados 01-05, 19 |
| B | 14 | achados 06-18, 20 |
| C | 36 | `rejeitados.md` R01-R36 |
| Linhas da matriz | 41 | `matriz.md` |
| Superfícies de feature triadas | 113 plugins, 64 tools, 122 rotas, 12 hooks | `censo.md` |
| Arquivos de código inventariados | 8809 (com dono 4924, sem equivalente 3885) | `inventario.md` |

## O que foi lido e o que não foi

Lido (trechos citados ou arquivos inteiros) no OpenCode: `packages/core/src/session/runner/{llm,max-steps,retry}.ts`,
`session/compaction.ts` (constantes, `precompute`, gatilhos), `session/system-prompt.ts`, `session/subagent-depth.ts`,
`session/runner/prompt/system.txt`, `model-retry.ts`, `permission.ts`, `permission/policy.ts`, `util/wildcard.ts`,
`plugin/{goal,verbosity,optimize,tool-input-repair,mcp-codemode-defaults,hooks}.ts`, `plugin/goal/*.txt`,
`plugin/system-prompt/*`, `tool/plugin/{read,edit,write,patch,shell,subagent,session-search}.ts`, `tool/patch.txt`,
`tool-output.ts`, `snapshot.ts` (início), `codemode/{diffs,instructions,catalog}.ts` (trechos), `mcp/{oauth,pool,instructions}.ts`
(trechos), `packages/ai/src/{cache-policy,tool-updates}.ts`, `CHANGELOG.md` (v2.4.2 e trechos citados), docs `compaction`,
`permissions`, `snapshots`, `mcp-servers`, `migrate-v1`, `agents`, e a config de agente `.opencode/`.

Não lido (só inventariado por regra de dono): `packages/cli-rs` (1360 arquivos), `packages/app` (1291),
`packages/gui-plugins` (1264), `packages/desktop`, `packages/session-ui`, `packages/ui`, `packages/data`,
`services/*`, quase todo `packages/tui`, `packages/server` e `packages/protocol` (handlers), internos de
`packages/ai/src/providers` e `protocols`, o interpretador `packages/codemode/src`, `packages/core/src/{machine,automation,
database,persistent-pty,integration,workspace,worktree}`, `session/{projector,inbox,transfer,move}.ts` além das linhas
citadas. Nenhum achado depende desses arquivos. Para eles vale o `censo.md`: o extrator leu todos os 8809 arquivos (76,7 MB,
0 erros) e toda feature que registra plugin, tool, hook ou rota foi triada. O que segue sem leitura é lógica interna
sem registro (helpers, componentes de UI); um mecanismo de economia escondido ali, sem registro, não seria visto.

## Verificação desta entrega

```bash
# inventário cobre 100% (dois números iguais: 8809)
git -C ~/source/opencode-ref ls-files | grep -cE '\.(ts|tsx|js|jsx|mjs|cjs|mts|cts|rs|go|py|sh|swift|kt|java|zig|c|h|cpp|lua|luau|nix|bash|ps1|astro|svelte|vue|scm|sql)$'
cat docs/audits/opencode-vs-nycode/inventario/*.md | grep -c '^| `'
# nada fora desta pasta
git diff --stat origin/main -- . ':!docs/audits/opencode-vs-nycode'
```
